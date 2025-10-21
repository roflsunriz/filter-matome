// JSON形式ルール対応フィルター部 - 新世代コメントフィルタリング処理
import { CONSTANTS } from '@/comment-filter2/utils/constants';
import { CF2CommentApiResponse, CommentFilter2GlobalData, CF2Comment, Settings, CF2FilterLogEntry } from '@/types/filter-types';
import { NgRuleJson, NicoruCond, Action } from '@/types/filter-types';
import { sanitizeCommentBody, sanitizeCommentCommands } from '@/comment-filter2/utils/sanitizer';
import { FilterLogger } from '@/comment-filter2/utils/filter-logger';
import { SubstringMatcher, isPlainLiteralPattern } from './rule-indexer';

// フォークタイプの定義
type ForkType = 'main' | 'easy' | 'owner';


interface PreparedJsonRule {
  rule: NgRuleJson;
  index: number;
  compiledRegex?: RegExp;
  isUserRule: boolean;
  hasLiteralPrefilter: boolean;
}

interface PreparedJsonRuleSet {
  rules: PreparedJsonRule[];
  userIdRuleIndexes: Map<string, number[]>;
  substringMatcher: SubstringMatcher | null;
  needsLowercase: boolean;
}

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
    // FilterLoggerの設定も更新
    FilterLogger.setLogSendingEnabled(settings?.logToCommentFilterLogger || false);
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

      const preparedRules = this.prepareRules(rules, currentSmid);
      const filteredData = this.processCommentData(globalData.originalData, preparedRules, currentSmid);
      
      // フィルタリング済みデータをグローバルオブジェクトに保存
      globalData.filteredData = filteredData;
      
      if (this.debugMode) {
        this.logFilteringResults(globalData.originalData, filteredData, rules);
      }

      // フィルターログをバッファに追加（FilterLoggerが自動的にdebounce送信する）
      if (this.settings?.logToCommentFilterLogger && this.filterLogs.length > 0) {
        FilterLogger.addLogsToBuffer(this.filterLogs);
      }

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
    preparedRules: PreparedJsonRuleSet, 
    currentSmid: string | null
  ): CF2CommentApiResponse {
    const processedThreads = data.data.threads.map(thread => ({
      ...thread,
      comments: this.filterCommentsInThread(thread.comments, preparedRules, currentSmid, thread.fork)
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
   * JSONルールの事前準備
   */
  private prepareRules(rules: NgRuleJson[], currentSmid: string | null): PreparedJsonRuleSet {
    const preparedRules: PreparedJsonRule[] = [];
    const userIdRuleIndexes = new Map<string, number[]>();
    const substringMatcher = new SubstringMatcher();
    let hasLiteralPatterns = false;

    for (const rule of rules) {
      if (rule.enabled === false) {
        continue;
      }

      if (!this.checkSmidCondition(rule.smid, currentSmid)) {
        continue;
      }

      const index = preparedRules.length;
      const isUserRule = !rule.pattern && Boolean(rule.userId);
      const preparedRule: PreparedJsonRule = {
        rule,
        index,
        compiledRegex: undefined,
        isUserRule,
        hasLiteralPrefilter: false
      };

      if (isUserRule && rule.userId) {
        const bucket = userIdRuleIndexes.get(rule.userId) ?? [];
        bucket.push(index);
        userIdRuleIndexes.set(rule.userId, bucket);
      }

      if (rule.pattern) {
        const flags = rule.flags || 'gi';
        preparedRule.compiledRegex = this.getRegex(rule.pattern, flags);

        if (isPlainLiteralPattern(rule.pattern)) {
          const isCaseSensitive = !flags.includes('i');
          substringMatcher.add(rule.pattern, index, isCaseSensitive);
          preparedRule.hasLiteralPrefilter = true;
          hasLiteralPatterns = true;
        }
      }

      preparedRules.push(preparedRule);
    }

    if (hasLiteralPatterns) {
      substringMatcher.build();
    }

    return {
      rules: preparedRules,
      userIdRuleIndexes,
      substringMatcher: hasLiteralPatterns ? substringMatcher : null,
      needsLowercase: hasLiteralPatterns ? substringMatcher.needsLowercaseText() : false
    };
  }



  /**
   * スレッド内のコメントをフィルタリング（JSON形式ルール対応）
   */
  private filterCommentsInThread(
    comments: CF2Comment[], 
    preparedRules: PreparedJsonRuleSet, 
    currentSmid: string | null,
    threadFork: ForkType
  ): CF2Comment[] {
    if (this.debugMode) {
      window.logger?.debug(`[CommentFilter2] Processing ${threadFork} thread with ${comments.length} comments using ${preparedRules.rules.length} JSON rules`);
    }

    return comments
      .map(comment => this.applyRulesToComment(comment, preparedRules, currentSmid, threadFork))
      .filter(comment => comment !== null);
  }

  /**
   * 単一コメントにJSON形式ルールを適用
   */
  private applyRulesToComment(
    comment: CF2Comment, 
    preparedRules: PreparedJsonRuleSet, 
    currentSmid: string | null,
    threadFork: ForkType
  ): CF2Comment | null {
    const processedComment = { ...comment };
    
    // コマンド文字列の整形
    processedComment.commands = this.normalizeCommands(processedComment.commands);
    
    // プレミアム属性の補正
    if ([CONSTANTS.FORK_TYPES.EASY, CONSTANTS.FORK_TYPES.MAIN, CONSTANTS.FORK_TYPES.OWNER].includes(threadFork)) {
      processedComment.isPremium = true;
    }

    let ruleApplied = false;
    let shouldHideComment = false;
    let shouldApplyCommands = true;
    let appliedRule: NgRuleJson | null = null;
    let excludedByNicoru = false;

    if (preparedRules.rules.length === 0) {
      if ([CONSTANTS.FORK_TYPES.EASY, CONSTANTS.FORK_TYPES.MAIN, CONSTANTS.FORK_TYPES.OWNER].includes(threadFork)) {
        processedComment.commands = this.applyForkCommandSettings(processedComment.commands, threadFork);
      }
      return processedComment;
    }

    const userRuleIndexes = preparedRules.userIdRuleIndexes.get(comment.userId) ?? [];
    const activeUserRuleIndexes = new Set<number>(userRuleIndexes);

    const matcher = preparedRules.substringMatcher;
    const originalBody = comment.body ?? '';
    const lowercaseBody = preparedRules.needsLowercase ? originalBody.toLocaleLowerCase() : undefined;
    const literalCandidateIndexes = matcher
      ? new Set<number>(matcher.match(originalBody, lowercaseBody))
      : new Set<number>();

    for (const preparedRule of preparedRules.rules) {
      const rule = preparedRule.rule;

      let patternMatched = false;
      let reusableRegex: RegExp | undefined;

      if (preparedRule.isUserRule) {
        if (!activeUserRuleIndexes.has(preparedRule.index)) {
          continue;
        }
        patternMatched = true;
      } else if (rule.pattern) {
        if (preparedRule.hasLiteralPrefilter && !literalCandidateIndexes.has(preparedRule.index)) {
          continue;
        }

        reusableRegex = preparedRule.compiledRegex ?? this.getRegex(rule.pattern, rule.flags || 'gi');
        if (reusableRegex.global) {
          reusableRegex.lastIndex = 0;
        }
        patternMatched = reusableRegex.test(originalBody);
        if (!patternMatched) {
          continue;
        }
        if (reusableRegex.global) {
          reusableRegex.lastIndex = 0;
        }
      } else {
        continue;
      }

      let nicoruOk = true;
      if (rule.nicoru_cond) {
        nicoruOk = this.checkNicoruCondition(rule.nicoru_cond, comment.nicoruCount);
        const modeValue = (rule.nicoru_cond.mode ?? 'exclude').toString().trim().toLowerCase();
        if (!nicoruOk && modeValue === 'exclude') {
          excludedByNicoru = true;
        }
      }

      if (!nicoruOk) {
        continue;
      }

      ruleApplied = true;
      appliedRule = rule;

      const actionResult = this.executeAction(rule.action, processedComment.body, rule, reusableRegex);
      
      if (actionResult.type === 'hide') {
        shouldHideComment = true;
        processedComment.body = '';
        processedComment.commands.push('invisible');
        
        this.addFilterLog(comment, rule, true, currentSmid);
        break;
      } else if (actionResult.type === 'replace') {
        processedComment.body = actionResult.newText || processedComment.body;
        this.addFilterLog(comment, rule, false, currentSmid);
      } else if (actionResult.type === 'none') {
        this.addFilterLog(comment, rule, false, currentSmid);
      }
    }

    if (shouldHideComment) {
      processedComment.body = '';
      if (!processedComment.commands.includes('invisible')) {
        processedComment.commands.push('invisible');
      }
    }

    if (ruleApplied && appliedRule) {
      if (
        appliedRule.nicoru_cond &&
        appliedRule.nicoru_cond.mode === 'exclude' &&
        excludedByNicoru
      ) {
        shouldApplyCommands = false;
      } else {
        shouldApplyCommands = true;
      }
    } else {
      shouldApplyCommands = !excludedByNicoru;
    }

    if ([CONSTANTS.FORK_TYPES.EASY, CONSTANTS.FORK_TYPES.MAIN, CONSTANTS.FORK_TYPES.OWNER].includes(threadFork)) {
      if (shouldApplyCommands) {
        processedComment.commands = this.applyForkCommandSettings(processedComment.commands, threadFork);
      } else {
        processedComment.commands = sanitizeCommentCommands(processedComment.commands);
      }
    }

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
   * アクション実行
   */
  private executeAction(action: Action, text: string, rule: NgRuleJson, compiledRegex?: RegExp): { type: 'hide' | 'replace' | 'none'; newText?: string } {
    if (action.type === 'hide') {
      return { type: 'hide' };
    }

    if (action.type === 'replace' && rule.pattern) {
      const regex = compiledRegex ?? this.getRegex(rule.pattern, rule.flags || 'gi');
      if (regex.global) {
        regex.lastIndex = 0;
      }
      const newText = text.replace(regex, action.replacement);
      if (regex.global) {
        regex.lastIndex = 0;
      }
      return { type: 'replace', newText };
    }

    // "unspecified" もしくはそれ以外の未定義typeの場合は実質無し（裏定義などは考慮外）
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