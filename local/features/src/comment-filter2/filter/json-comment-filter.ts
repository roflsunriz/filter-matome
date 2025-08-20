// JSON形式ルール対応フィルター部 - 新世代コメントフィルタリング処理
import { CONSTANTS } from '../utils/constants';
import { CF2CommentApiResponse, CommentFilter2GlobalData, CF2Comment, Settings, CF2FilterLogEntry } from '@/types/filter-types';
import { NgRuleJson, NicoruCond, Action } from '@/types/filter-types';
import { sanitizeCommentBody, sanitizeCommentCommands } from '../utils/sanitizer';
import { FilterLogger } from '../utils/filter-logger';

// フォークタイプの定義
type ForkType = 'main' | 'easy' | 'owner';

export class JsonCommentFilter {
  private regexCache: Map<string, RegExp> = new Map();
  private debugMode: boolean = false;
  private settings: Settings | null = null;
  private filterLogs: CF2FilterLogEntry[] = []; // フィルターログの蓄積用

  constructor(debugMode: boolean = false) {
    this.debugMode = debugMode;
  }

  /**
   * 設定を更新
   */
  public updateSettings(settings: Settings): void {
    this.settings = settings;
    this.debugMode = settings.debugMode;
  }

  /**
   * メインのフィルタリング処理（JSON形式ルール対応）
   */
  public async applyFilters(rules: NgRuleJson[], currentSmid: string | null): Promise<CF2CommentApiResponse | null> {
    // minimal await to satisfy require-await while keeping logic unchanged
    await Promise.resolve();
    const globalData = this.getGlobalData();
    
    if (!globalData?.originalData) {
      if (this.debugMode) {
        window.logger?.debug('[CommentFilter2] No global data available for filtering');
      }
      return null;
    }

    try {
      // フィルターログを初期化
      this.filterLogs = [];

      if (this.debugMode) {
        window.logger?.debug('[CommentFilter2] Starting JSON filtering with rules:', {
          totalRules: rules.length,
          userIdRules: rules.filter(r => r.userId),
          regexRules: rules.filter(r => r.pattern),
          currentSmid
        });
      }

      const filteredData = this.processCommentData(globalData.originalData, rules, currentSmid);
      
      // フィルタリング済みデータをグローバルオブジェクトに保存
      globalData.filteredData = filteredData;
      
      if (this.debugMode) {
        this.logFilteringResults(globalData.originalData, filteredData, rules);
      }

      // フィルターログを送信（非同期・ノンブロッキング）
      void this.sendFilterLogsAsync();

      return filteredData;
    } catch (error) {
      window.logger?.error('[CommentFilter2] JSON filtering failed:', error);
      return globalData.originalData;
    }
  }

  /**
   * コメントデータ全体を処理
   */
  private processCommentData(
    data: CF2CommentApiResponse, 
    rules: NgRuleJson[], 
    currentSmid: string | null
  ): CF2CommentApiResponse {
    const processedThreads = data.data.threads.map(thread => ({
      ...thread,
      comments: this.filterCommentsInThread(thread.comments, rules, currentSmid, thread.fork)
    }));

    return {
      ...data,
      data: {
        ...data.data,
        threads: processedThreads
      }
    };
  }

  /**
   * スレッド内のコメントをフィルタリング（JSON形式ルール対応）
   */
  private filterCommentsInThread(
    comments: CF2Comment[], 
    rules: NgRuleJson[], 
    currentSmid: string | null,
    threadFork: ForkType
  ): CF2Comment[] {
    if (this.debugMode) {
      window.logger?.debug(`[CommentFilter2] Processing ${threadFork} thread with ${comments.length} comments using ${rules.length} JSON rules`);
    }

    return comments
      .map(comment => this.applyRulesToComment(comment, rules, currentSmid, threadFork))
      .filter(comment => comment !== null);
  }

  /**
   * 単一コメントにJSON形式ルールを適用
   */
  private applyRulesToComment(
    comment: CF2Comment, 
    rules: NgRuleJson[], 
    currentSmid: string | null,
    threadFork: ForkType
  ): CF2Comment | null {
    const processedComment = { ...comment };
    
    // コマンド形式の正規化処理
    processedComment.commands = this.normalizeCommands(processedComment.commands);
    
    // 計画書の要件：コメント種別対応
    if ([CONSTANTS.FORK_TYPES.EASY, CONSTANTS.FORK_TYPES.MAIN, CONSTANTS.FORK_TYPES.OWNER].includes(threadFork)) {
      processedComment.isPremium = true;
    }

    let ruleApplied = false;
    let shouldHideComment = false;
    let shouldApplyCommands = true; // コマンド設定を適用するかどうか
    let appliedRule: NgRuleJson | null = null; // 適用されたルール
    let excludedByNicoru = false; // nicoru除外条件に一致してルール適用がスキップされたか

    // 有効なルールのみを処理
    const activeRules = rules.filter(rule => rule.enabled !== false);

    // ルールが存在しない場合は常にコマンド設定を適用
    if (activeRules.length === 0) {
      if ([CONSTANTS.FORK_TYPES.EASY, CONSTANTS.FORK_TYPES.MAIN, CONSTANTS.FORK_TYPES.OWNER].includes(threadFork)) {
        processedComment.commands = this.applyForkCommandSettings(processedComment.commands, threadFork);
      }
      return processedComment;
    }

    for (const rule of activeRules) {
      // ---- ルール適用条件チェック ----
      const smidOk = this.checkSmidCondition(rule.smid, currentSmid);
      if (!smidOk) {
        continue;
      }

      const patternOk = rule.pattern
        ? this.getRegex(rule.pattern, rule.flags || 'gi').test(comment.body)
        : rule.userId
          ? rule.userId === comment.userId
          : false;
      if (!patternOk) {
        continue;
      }

      let nicoruOk = true;
      if (rule.nicoru_cond) {
        nicoruOk = this.checkNicoruCondition(rule.nicoru_cond, comment.nicoruCount);
        // nicoruモードがexcludeで、条件に合致したためにnicoruOk=false となった場合、
        // これは「ルール自体を無視するがコマンドも除外したい」ケース
        const modeValue = (rule.nicoru_cond.mode ?? 'exclude').toString().trim().toLowerCase();
        if (!nicoruOk && modeValue === 'exclude') {
          excludedByNicoru = true;
        }
      }

      // nicoru条件等でNGの場合は次へ
      if (!nicoruOk) {
        continue;
      }

      // ---- ここまででルール適用確定 ----

      // ルールが適用された
      ruleApplied = true;
      appliedRule = rule;

      // アクションを実行
      const actionResult = this.executeAction(rule.action, processedComment.body, rule);
      
      if (actionResult.type === 'hide') {
        shouldHideComment = true;
        processedComment.body = '';
        processedComment.commands.push('invisible');
        
        // フィルターログを追加
        this.addFilterLog(comment, rule, true, currentSmid);
        break; // 非表示の場合は他のルールを適用しない
      } else if (actionResult.type === 'replace') {
        processedComment.body = actionResult.newText || processedComment.body;
        
        // フィルターログを追加
        this.addFilterLog(comment, rule, false, currentSmid);
      } else if (actionResult.type === 'none') {
        // 本文やコマンドは変更せず、フィルターログのみ追加
        this.addFilterLog(comment, rule, false, currentSmid);
      }
    }

    // 非表示処理
    if (shouldHideComment) {
      processedComment.body = '';
      if (!processedComment.commands.includes('invisible')) {
        processedComment.commands.push('invisible');
      }
    }

    // コマンド適用判定（お主の要求に基づく新ロジック）
    if (ruleApplied && appliedRule) {
      // ルールが適用された場合でも、nicoru_cond.exclude が「条件に合致したか」で挙動を分岐
      if (
        appliedRule.nicoru_cond &&
        appliedRule.nicoru_cond.mode === 'exclude' &&
        excludedByNicoru // ← 条件に合致して除外扱いになった場合のみ
      ) {
        shouldApplyCommands = false; // コマンド除外
      } else {
        shouldApplyCommands = true; // それ以外は適用
      }
    } else {
      // ルールが適用されていない
      if (excludedByNicoru) {
        // nicoru除外条件に一致してスキップされた場合はコマンド非適用
        shouldApplyCommands = false;
      } else {
        // それ以外は適用
        shouldApplyCommands = true;
      }
    }

    // UIコマンド設定の適用
    if ([CONSTANTS.FORK_TYPES.EASY, CONSTANTS.FORK_TYPES.MAIN, CONSTANTS.FORK_TYPES.OWNER].includes(threadFork)) {
      if (shouldApplyCommands) {
        processedComment.commands = this.applyForkCommandSettings(processedComment.commands, threadFork);
      } else {
        // nicoru除外モードなどでコマンド適用を抑制する場合でも
        // 不正コマンドの混入を防ぐためにサニタイズ処理だけは行う
        processedComment.commands = sanitizeCommentCommands(processedComment.commands);
      }
    }

    // NGルールが適用されたコメントのみサニタイズ
    if (ruleApplied) {
      processedComment.body = sanitizeCommentBody(processedComment.body);
    }

    if (this.debugMode) {
      window.logger?.debug('[CF2] fork=%s  nicoru=%d  ruleApplied=%o  excludedByNicoru=%o  shouldApplyCmd=%o  finalCmd=%o',
        threadFork, comment.nicoruCount, ruleApplied, excludedByNicoru, shouldApplyCommands, processedComment.commands);
    }

    return processedComment;
  }

  /**
   * ルール適用条件をチェック（JSON形式対応）
   */
  private shouldApplyRule(rule: NgRuleJson, comment: CF2Comment, currentSmid: string | null): boolean {
    // SMID条件チェック
    if (!this.checkSmidCondition(rule.smid, currentSmid)) {
      return false;
    }

    // パターンマッチング（正規表現またはユーザーID）
    if (rule.pattern) {
      const regex = this.getRegex(rule.pattern, rule.flags || 'gi');
      if (!regex.test(comment.body)) {
        return false;
      }
    } else if (rule.userId) {
      if (rule.userId !== comment.userId) {
        return false;
      }
    } else {
      return false; // パターンもユーザーIDも指定されていない
    }

    // ニコる数条件チェック
    if (rule.nicoru_cond && !this.checkNicoruCondition(rule.nicoru_cond, comment.nicoruCount)) {
      return false;
    }

    return true;
  }

  /**
   * SMID条件をチェック
   */
  private checkSmidCondition(smids: string[], currentSmid: string | null): boolean {
    if (smids.includes('ALL')) {
      return true;
    }
    
    return currentSmid ? smids.includes(currentSmid) : false;
  }

  /**
   * 文字列・数値を安全に number へ変換
   * 数値でなければ null を返す
   */
  private toNumber(val: unknown): number | null {
    if (typeof val === 'number') return val;
    if (typeof val === 'string' && val.trim() !== '') {
      const n = Number(val);
      return Number.isNaN(n) ? null : n;
    }
    return null;
  }

  /**
   * ニコる数条件をチェック（新形式対応・型安全版）
   */
  private checkNicoruCondition(cond: NicoruCond, rawCount: number | string): boolean {
    const { op, value, mode = 'exclude' } = cond;
    
    // ▼ ここで必ず数値化
    const commentNicoruCount = this.toNumber(rawCount) ?? 0;

    let conditionMet = false;
    
    switch (op) {
      case '=': {
        const numericValue = this.toNumber(value);
        conditionMet = numericValue !== null && commentNicoruCount === numericValue;
        break;
      }
      case '>': {
        const numericValue = this.toNumber(value);
        conditionMet = numericValue !== null && commentNicoruCount > numericValue;
        break;
      }
      case '<': {
        const numericValue = this.toNumber(value);
        conditionMet = numericValue !== null && commentNicoruCount < numericValue;
        break;
      }
      case '>=': {
        const numericValue = this.toNumber(value);
        conditionMet = numericValue !== null && commentNicoruCount >= numericValue;
        break;
      }
      case '<=': {
        const numericValue = this.toNumber(value);
        conditionMet = numericValue !== null && commentNicoruCount <= numericValue;
        break;
      }
      case 'range': {
        if (Array.isArray(value) && value.length === 2) {
          const numStart = this.toNumber(value[0]);
          const numEnd = this.toNumber(value[1]);
          if (numStart !== null && numEnd !== null) {
            conditionMet = commentNicoruCount >= numStart && commentNicoruCount <= numEnd;
          }
        }
        break;
      }
    }

    // include/excludeモードに応じて結果を返す
    return mode === 'include' ? conditionMet : !conditionMet;
  }

  /**
   * アクションを実行
   */
  private executeAction(action: Action, text: string, rule: NgRuleJson): { type: 'hide' | 'replace' | 'none'; newText?: string } {
    if (action.type === 'hide') {
      return { type: 'hide' };
    }

    if (action.type === 'replace' && rule.pattern) {
      const regex = this.getRegex(rule.pattern, rule.flags || 'gi');
      const newText = text.replace(regex, action.replacement);
      return { type: 'replace', newText };
    }

    // "unspecified" またはその他想定外のtypeの場合は何もしない（排他判定などは別途行う）
    return { type: 'none' };
  }

  /**
   * 正規表現オブジェクトを取得（キャッシュ付き・フラグ対応・lastIndex対応）
   */
  private getRegex(pattern: string, flags: string = 'gi'): RegExp {
    const cacheKey = `${pattern}:::${flags}`;
    
    if (this.regexCache.has(cacheKey)) {
      const cachedRegex = this.regexCache.get(cacheKey)!;
      // グローバルフラグがある場合はlastIndexをリセット
      if (cachedRegex.global) {
        cachedRegex.lastIndex = 0;
      }
      return cachedRegex;
    }

    const regex = new RegExp(pattern, flags);
    this.regexCache.set(cacheKey, regex);
    return regex;
  }

  /**
   * フォーク別のコマンド設定を適用（従来通り）
   */
  private applyForkCommandSettings(commands: string[], threadFork: ForkType): string[] {
    // 設定が存在しない場合はサニタイズのみ
    if (!this.settings?.commandSettings) {
      return sanitizeCommentCommands(commands);
    }

    // フォーク別の許可コマンドを取得
    const allowedCommands = this.getAllowedCommandsForFork(threadFork);

    // 1. フォーク設定コマンドを **先頭に** 結合（設定側 > 既存コマンド の優先順位）
    const combinedCommands = [...allowedCommands, ...commands];

    // 2. 基本サニタイズを適用（重複・排他処理など）
    const sanitizedCommands = sanitizeCommentCommands(combinedCommands);

    // 3. 最終的にフォーク設定でフィルタリング（16進数カラーコードは常に許可）
    const filteredCommands = sanitizedCommands.filter(command => {
      if (/^#[0-9A-Fa-f]{6}$/.test(command)) {
        return true;
      }
      return allowedCommands.includes(command.toLowerCase());
    });

    return filteredCommands;
  }

  /**
   * フォークタイプに対して許可されたコマンドを取得
   */
  private getAllowedCommandsForFork(threadFork: ForkType): string[] {
    if (!this.settings?.commandSettings) {
      return [];
    }

    switch (threadFork) {
      case CONSTANTS.FORK_TYPES.OWNER:
        return this.settings.commandSettings.owner;
      case CONSTANTS.FORK_TYPES.MAIN:
        return this.settings.commandSettings.main;
      case CONSTANTS.FORK_TYPES.EASY:
        return this.settings.commandSettings.easy;
      default:
        return [];
    }
  }

  /**
   * フィルタリング結果をログ出力（デバッグ用）
   */
  private logFilteringResults(
    original: CF2CommentApiResponse, 
    filtered: CF2CommentApiResponse, 
    rules: NgRuleJson[]
  ): void {
    const originalCount = this.countComments(original);
    const filteredCount = this.countComments(filtered);
    const hiddenCount = originalCount - filteredCount;

    window.logger.debug('[CommentFilter2] JSON Filtering Results:', {
      originalComments: originalCount,
      filteredComments: filteredCount,
      hiddenComments: hiddenCount,
      appliedRules: rules.length,
      ruleTypes: {
        regex: rules.filter(r => r.pattern).length,
        userId: rules.filter(r => r.userId).length,
        withNicoruCond: rules.filter(r => r.nicoru_cond).length
      }
    });
  }

  /**
   * コメント総数をカウント
   */
  private countComments(data: CF2CommentApiResponse): number {
    return data.data.threads.reduce((sum, thread) => sum + thread.comments.length, 0);
  }

  /**
   * グローバルデータを取得
   */
  private getGlobalData(): CommentFilter2GlobalData | null {
    const data = window[CONSTANTS.GLOBAL_DATA_KEY];
    
    if (data && typeof data === 'object' && 
        'originalData' in data && 
        'filteredData' in data && 
        'currentSmid' in data && 
        'lastUpdated' in data) {
      return data;
    }
    
    return null;
  }

  /**
   * 正規表現キャッシュをクリア
   */
  public clearRegexCache(): void {
    this.regexCache.clear();
  }

  /**
   * デバッグモードを設定
   */
  public setDebugMode(enabled: boolean): void {
    this.debugMode = enabled;
  }

  /**
   * フィルターログを非同期で送信
   */
  private async sendFilterLogsAsync(): Promise<void> {
    await Promise.resolve();
    if (!this.settings?.logToCommentFilterLogger) {
      if (this.debugMode) {
        window.logger?.debug('[CommentFilter2] Filter log sending is disabled in settings');
      }
      return;
    }

    if (this.filterLogs.length === 0) {
      if (this.debugMode) {
        window.logger?.debug('[CommentFilter2] No filter logs to send');
      }
      return;
    }

    try {
      if (this.debugMode) {
        window.logger?.info(`[CommentFilter2] Scheduling send of ${this.filterLogs.length} filter logs`);
      }

      setTimeout(async () => {
        try {
          const success = await FilterLogger.sendFilterLogs(this.filterLogs);
          if (this.debugMode) {
            window.logger?.info(`[CommentFilter2] Filter logs send result: ${success ? 'success' : 'failed'}`);
          }
        } catch (error) {
          window.logger?.warn('[CommentFilter2] Failed to send filter logs:', error);
        }
      }, 100);
    } catch (error) {
      window.logger?.error('[CommentFilter2] Error in sendFilterLogsAsync:', error);
    }
  }

  /**
   * フィルターログエントリーを追加
   */
  private addFilterLog(
    comment: CF2Comment,
    rule: NgRuleJson,
    hidden: boolean,
    currentSmid: string | null
  ): void {
    try {
      const videoTitle = FilterLogger.getVideoTitle();
      const ruleType = rule.pattern ? 'regex' : 'userId';
      const reasons = FilterLogger.generateFilterReasons(ruleType, true, hidden);
      const filterDetails = FilterLogger.generateFilterDetails(
        ruleType,
        rule.pattern,
        rule.userId,
        rule.action.type === 'replace' ? rule.action.replacement : undefined
      );

      const logEntry: CF2FilterLogEntry = {
        title: videoTitle,
        userId: comment.userId,
        comment: comment.body,
        videoId: currentSmid || '不明',
        reasons,
        filterDetails
      };

      this.filterLogs.push(logEntry);
    } catch (error) {
      window.logger?.warn('[CommentFilter2] Failed to add filter log:', error);
    }
  }

  /**
   * コマンドの形式を正規化（文字列→配列変換、クリーンアップ）
   */
  private normalizeCommands(commands: string | string[] | null | undefined): string[] {
    if (!commands) {
      return [];
    }

    if (Array.isArray(commands)) {
      return commands
        .filter(cmd => cmd !== null && cmd !== undefined && cmd !== '')
        .map(cmd => String(cmd).trim())
        .filter(cmd => cmd.length > 0);
    }

    if (typeof commands === 'string') {
      return commands
        .trim()
        .split(/\s+/)
        .filter(cmd => cmd.length > 0);
    }

    if (this.debugMode) {
      window.logger.warn('[CommentFilter2] Unexpected commands type:', typeof commands, commands);
    }
    
    return [];
  }
} 