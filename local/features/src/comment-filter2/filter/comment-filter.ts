// フィルター部 - コメントフィルタリングのメイン処理
import { CONSTANTS } from '../utils/constants';
import { CF2CommentApiResponse, CommentFilter2GlobalData, CF2Comment, NGWordRule, Settings, CF2FilterLogEntry } from '../../types/filter-types';
import { sanitizeCommentBody, sanitizeCommentCommands } from '../utils/sanitizer';
import { FilterLogger } from '../utils/filter-logger';

// コマンドの種類定義
const COMMAND_TYPES = {
  COLOR: 'color',
  POSITION: 'position',
  FONT: 'font',
  SIZE: 'size',
  SPECIAL: 'special'
} as const;

// 各種類のコマンド定義
const COMMAND_CATEGORIES = {
  [COMMAND_TYPES.COLOR]: [
    'white', 'red', 'pink', 'orange', 'yellow', 'green', 'cyan', 'blue', 'purple', 'black',
    'white2', 'red2', 'pink2', 'orange2', 'yellow2', 'green2', 'cyan2', 'blue2', 'purple2', 'black2'
  ],
  [COMMAND_TYPES.POSITION]: [
    'ue', 'naka', 'shita'
  ],
  [COMMAND_TYPES.FONT]: [
    'gothic', 'mincho','defont'
  ],
  [COMMAND_TYPES.SIZE]: [
    'big', 'medium', 'small'
  ],
  [COMMAND_TYPES.SPECIAL]: [
    'invisible', 'full','patissier', '_live', 'ender', 'ca', '184'
  ]
} as const;

// フォークタイプの定義
type ForkType = 'main' | 'easy' | 'owner';

export class CommentFilter {
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
   * メインのフィルタリング処理
   */
  public async applyFilters(rules: NGWordRule[], currentSmid: string | null): Promise<CF2CommentApiResponse | null> {
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
        window.logger?.debug('[CommentFilter2] Starting filtering with rules:', {
          totalRules: rules.length,
          userIdRules: rules.filter(r => r.isUserIdRule),
          regexRules: rules.filter(r => !r.isUserIdRule),
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
      this.sendFilterLogsAsync();

      return filteredData;
    } catch (error) {
      window.logger?.error('[CommentFilter2] Filtering failed:', error);
      return globalData.originalData;
    }
  }

  /**
   * コメントデータ全体を処理
   */
  private processCommentData(
    data: CF2CommentApiResponse, 
    rules: NGWordRule[], 
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
   * スレッド内のコメントをフィルタリング（コメント種別対応）
   */
  private filterCommentsInThread(
    comments: CF2Comment[], 
    rules: NGWordRule[], 
    currentSmid: string | null,
    threadFork: ForkType
  ): CF2Comment[] {
    // 大量ログ回避：スレッド単位の情報のみ記録（コメント1件ごとではない）  
    if (this.debugMode) {
      window.logger?.debug(`[CommentFilter2] Processing ${threadFork} thread with ${comments.length} comments`);
    }

    return comments
      .map(comment => this.applyRulesToComment(comment, rules, currentSmid, threadFork))
      .filter(comment => comment !== null);
  }

  /**
   * 単一コメントにルールを適用（コメント種別対応）
   */
  private applyRulesToComment(
    comment: CF2Comment, 
    rules: NGWordRule[], 
    currentSmid: string | null,
    threadFork: ForkType
  ): CF2Comment | null {
    const processedComment = { ...comment };
    
    // コマンド形式の正規化処理
    processedComment.commands = this.normalizeCommands(processedComment.commands);
    
    // 計画書の要件：コメント種別対応
    if ([CONSTANTS.FORK_TYPES.EASY, CONSTANTS.FORK_TYPES.MAIN, CONSTANTS.FORK_TYPES.OWNER].includes(threadFork)) {
      // コメントにisPremium: trueを確実に設定（計画書の要件）
      processedComment.isPremium = true;
    }

    // 複数ルール適用時のコマンド蓄積用
    const commandsToAdd: string[] = [];
    let shouldHideComment = false;
    let ruleApplied = false; // NGルールが適用されたかどうかの追跡
    let hasEmptyNicoruRule = false; // nicoru が EMPTY のルールがマッチしたかどうか

    for (const rule of rules) {
      // SMIDルールをチェック
      if (!this.shouldApplyRule(rule, currentSmid)) {
        continue;
      }

      // ニコる数ルールをチェック
      if (!this.checkNicoruRule(rule, comment.nicoruCount)) {
        continue;
      }

      // ユーザーIDルールのチェック
      if (rule.isUserIdRule && rule.userId) {
        if (this.checkUserIdRule(rule, comment.userId)) {
          // ユーザーIDが一致した場合
          ruleApplied = true; // ルールが適用された
          
          // フィルターログを追加
          const isHidden = rule.nicoru === 'EMPTY';
          this.addFilterLog(comment, rule, 'userId', true, isHidden, currentSmid);
          
          // nicoru が EMPTY の場合のみコマンド処理を行う
          if (rule.nicoru === 'EMPTY') {
            hasEmptyNicoruRule = true; // EMPTY ルールがマッチした
            shouldHideComment = true;
            commandsToAdd.push('invisible');
          } else {
            // nicoru が数値の場合は本文・コマンドをそのまま残す（何もしない）
            // ruleApplied は true のままなので UI 側コマンドも注入されない
          }
          
          // 大量ログ回避：ユーザーIDマッチは重要だが頻度が高いのでINFOレベルに
          if (this.debugMode) {
            window.logger?.info(`[CommentFilter2] UserID rule matched: ${rule.userId} -> ${rule.nicoru === 'EMPTY' ? 'hiding comment with invisible' : 'clearing body only'}`, {
              commentUserId: comment.userId,
              ruleUserId: rule.userId,
              ruleNicoru: rule.nicoru,
              commentBody: comment.body?.substring(0, 50) + (comment.body?.length > 50 ? '...' : '') // 本文は省略
            });
          }
        }
        continue; // ユーザーIDルールの場合は正規表現処理をスキップ
      }

      // 正規表現ルールの場合のみ実行
      if (rule.regex) {
        const result = this.applyRegexRule(processedComment.body, rule);
        
        if (result.matched) {
          ruleApplied = true; // ルールが適用された
          
          // フィルターログを追加
          this.addFilterLog(comment, rule, 'regex', true, result.shouldHide, currentSmid);
          
          if (result.shouldHide) {
            // EMPTYの場合
            if (rule.nicoru === 'EMPTY') {
              // nicoru が EMPTY の場合のみコマンド処理を行う
              hasEmptyNicoruRule = true; // EMPTY ルールがマッチした
              shouldHideComment = true;
              commandsToAdd.push('invisible');
            } else {
              // nicoru が数値の場合は本文・コマンドをそのまま残す（何もしない）
              // ruleApplied は true のままなので UI 側コマンドも注入されない
            }
          } else {
            // 置換処理（nicoru の値に関係なく実行）
            processedComment.body = result.replacedText;
            // 置換の場合も nicoru が EMPTY なら UI コマンド適用対象
            if (rule.nicoru === 'EMPTY') {
              hasEmptyNicoruRule = true;
            }
          }
        }
      }
    }

    // 非表示処理
    if (shouldHideComment) {
      processedComment.body = '';
      // 確実に非表示にするため、invisibleコマンドが含まれていることを確認
      if (!processedComment.commands.includes('invisible')) {
        processedComment.commands.push('invisible');
      }
      
      // 大量ログ回避：コメント非表示情報は頻度が高いので条件付きログにする
      if (this.debugMode && Math.random() < 0.1) { // 10%の確率でのみログ出力
        window.logger?.debug('[CommentFilter2] Comment hidden (sampled):', {
          originalBody: comment.body?.substring(0, 30) + '...',
          processedBody: processedComment.body,
          commands: processedComment.commands
        });
      }
    }

    // UIコマンド設定の適用（条件付き）
    if ([CONSTANTS.FORK_TYPES.EASY, CONSTANTS.FORK_TYPES.MAIN, CONSTANTS.FORK_TYPES.OWNER].includes(threadFork)) {
      // NGルールが適用されていない、または nicoru が EMPTY のルールがマッチした場合のみ UI コマンド設定を適用
      if (!ruleApplied || hasEmptyNicoruRule) {
        processedComment.commands = this.applyForkCommandSettings(processedComment.commands, threadFork);
      }
    }

    // 蓄積されたコマンドを一括で追加/置換
    if (commandsToAdd.length > 0) {
      processedComment.commands = this.addOrReplaceCommands(processedComment.commands, commandsToAdd);
    }

    // NGルールが適用されたコメントのみサニタイズ
    if (ruleApplied) {
      processedComment.body = sanitizeCommentBody(processedComment.body);
    }

    return processedComment;
  }

  /**
   * フォーク別のコマンド設定を適用
   */
  private applyForkCommandSettings(commands: string[], threadFork: ForkType): string[] {
    if (!this.settings?.commandSettings) {
      // 設定がない場合は基本的なサニタイズのみ
      return sanitizeCommentCommands(commands);
    }

    const allowedCommands = this.getAllowedCommandsForFork(threadFork);
    
    // まず基本的なサニタイズを適用
    const sanitizedCommands = sanitizeCommentCommands(commands);
    
    // 次にフォーク設定でフィルタリング
    const filteredCommands = sanitizedCommands.filter(command => {
      // 16進数カラーコードは常に許可
      if (/^#[0-9A-Fa-f]{6}$/.test(command)) {
        return true;
      }
      
      return allowedCommands.includes(command.toLowerCase());
    });

    // 大量ログ回避：フォークコマンド詳細は極めて高頻度なので無効化
    // if (this.debugMode) {
    //   window.logger?.debug(`[CommentFilter2] Fork ${threadFork} commands:`, {
    //     original: commands,
    //     sanitized: sanitizedCommands,
    //     filtered: filteredCommands,
    //     allowedForFork: allowedCommands
    //   });
    // }

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
   * ルールを適用すべきかチェック（SMID条件）
   */
  private shouldApplyRule(rule: NGWordRule, currentSmid: string | null): boolean {
    if (rule.smid === CONSTANTS.RULE_DEFAULTS.ALL_SMID) {
      return true;
    }
    
    return rule.smid === currentSmid;
  }

  /**
   * ニコる数ルールをチェック
   */
  private checkNicoruRule(rule: NGWordRule, commentNicoruCount: number): boolean {
    // nicoru が EMPTY のときは無条件で適用
    if (rule.nicoru === 'EMPTY') {
      return true;
    }
    
    // ここから数値判定 (0 も含む)
    if (typeof rule.nicoru === 'number') {
      // ★修正ポイント★ : 「以上」判定に修正（閾値以上でコマンド除外が発動）
      return commentNicoruCount >= rule.nicoru;
    }
    
    // 想定外の型は安全側で適用しない
    return false;
  }

  /**
   * ユーザーIDルールをチェック
   */
  private checkUserIdRule(rule: NGWordRule, commentUserId: string): boolean {
    if (!rule.userId) {
      if (this.debugMode) {
        window.logger?.warn('[CommentFilter2] UserID rule has no userId field', rule);
      }
      return false;
    }
    
    // 完全一致でチェック
    const isMatch = rule.userId === commentUserId;
    
    // 大量ログ回避：ユーザーIDチェック詳細は極めて高頻度なので無効化
    // if (this.debugMode) {
    //   window.logger?.debug('[CommentFilter2] UserID rule check:', {
    //     ruleUserId: rule.userId,
    //     commentUserId: commentUserId,
    //     isMatch: isMatch
    //   });
    // }
    
    return isMatch;
  }

  /**
   * 正規表現ルールを適用（フラグ対応）
   */
  private applyRegexRule(text: string, rule: NGWordRule): {
    matched: boolean;
    shouldHide: boolean;
    replacedText: string;
  } {
    try {
      // regex が undefined の場合は早期リターン
      if (!rule.regex) {
        return {
          matched: false,
          shouldHide: false,
          replacedText: text
        };
      }

      const regex = this.getRegex(rule.regex, rule.regexFlags || 'gi');
      const matched = regex.test(text);
      
      if (!matched) {
        return {
          matched: false,
          shouldHide: false,
          replacedText: text
        };
      }

      const shouldHide = rule.replace === CONSTANTS.RULE_DEFAULTS.EMPTY_REPLACE;
      const replacedText = shouldHide ? text : text.replace(regex, rule.replace || '');

      return {
        matched: true,
        shouldHide,
        replacedText
      };
    } catch (error) {
      window.logger?.warn('[CommentFilter2] Regex application failed:', rule.regex, error);
      return {
        matched: false,
        shouldHide: false,
        replacedText: text
      };
    }
  }

  /**
   * 正規表現オブジェクトを取得（キャッシュ付き・フラグ対応）
   */
  private getRegex(pattern: string, flags: string = 'gi'): RegExp {
    const cacheKey = `${pattern}:::${flags}`;
    
    if (this.regexCache.has(cacheKey)) {
      return this.regexCache.get(cacheKey)!;
    }

    const regex = new RegExp(pattern, flags);
    this.regexCache.set(cacheKey, regex);
    return regex;
  }

  /**
   * フィルタリング結果をログ出力（デバッグ用）
   */
  private logFilteringResults(
    original: CF2CommentApiResponse, 
    filtered: CF2CommentApiResponse, 
    rules: NGWordRule[]
  ): void {
    const originalCount = this.countComments(original);
    const filteredCount = this.countComments(filtered);
    const hiddenCount = originalCount - filteredCount;

    window.logger.debug('[CommentFilter2] Filtering Results:', {
      originalComments: originalCount,
      filteredComments: filteredCount,
      hiddenComments: hiddenCount,
      appliedRules: rules.length
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
    
    // 型ガードで安全にチェック
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
   * コマンドを追加または置き換え
   */
  private addOrReplaceCommand(commands: string[], newCommand: string): string[] {
    // commandsが配列であることを確実にする
    if (!Array.isArray(commands)) {
      commands = [];
    }

    // 16進数カラーコードの処理
    if (/^#[0-9A-Fa-f]{6}$/.test(newCommand)) {
      // 既存の色コマンドと16進数カラーコードを削除してから追加
      const filteredCommands = commands.filter(cmd => 
        !this.isCommandOfType(cmd, COMMAND_TYPES.COLOR) && !/^#[0-9A-Fa-f]{6}$/.test(cmd)
      );
      return [...filteredCommands, newCommand];
    }

    // 新しいコマンドの種類を特定
    const commandType = this.getCommandType(newCommand);
    
    if (commandType) {
      // 同じ種類のコマンドを削除
      const filteredCommands = commands.filter(cmd => !this.isCommandOfType(cmd, commandType));
      return [...filteredCommands, newCommand];
    } else {
      // 種類が不明な場合は、重複チェックして追加
      if (!commands.includes(newCommand)) {
        return [...commands, newCommand];
      }
      return commands;
    }
  }

  /**
   * 複数のコマンドを一括で追加または置き換え
   */
  private addOrReplaceCommands(commands: string[], newCommands: string[]): string[] {
    let result = commands;
    
    for (const newCommand of newCommands) {
      result = this.addOrReplaceCommand(result, newCommand);
    }
    
    return result;
  }

  /**
   * コマンドの種類を取得
   */
  private getCommandType(command: string): string | null {
    // 16進数カラーコードの場合
    if (/^#[0-9A-Fa-f]{6}$/.test(command)) {
      return COMMAND_TYPES.COLOR;
    }

    const lowerCommand = command.toLowerCase();
    
    // 各カテゴリーをチェック
    for (const [type, commands] of Object.entries(COMMAND_CATEGORIES)) {
      if ((commands as readonly string[]).includes(lowerCommand)) {
        return type;
      }
    }
    
    return null;
  }

  /**
   * 指定されたコマンドが特定の種類かチェック
   */
  private isCommandOfType(command: string, commandType: string): boolean {
    // 16進数カラーコードの場合
    if (commandType === COMMAND_TYPES.COLOR && /^#[0-9A-Fa-f]{6}$/.test(command)) {
      return true;
    }

    const categoryCommands = COMMAND_CATEGORIES[commandType as keyof typeof COMMAND_CATEGORIES];
    if (!categoryCommands) {
      return false;
    }
    
    const lowerCommand = command.toLowerCase();
    return (categoryCommands as readonly string[]).includes(lowerCommand);
  }

  /**
   * 特定の種類のコマンドを取得
   */
  private getCommandsOfType(commands: string[], commandType: string): string[] {
    return commands.filter(cmd => this.isCommandOfType(cmd, commandType));
  }

  /**
   * 特定の種類のコマンドを削除
   */
  private removeCommandsOfType(commands: string[], commandType: string): string[] {
    return commands.filter(cmd => !this.isCommandOfType(cmd, commandType));
  }

  /**
   * 外部からコマンドを追加するためのパブリックメソッド
   */
  public addCommandsToComment(comment: CF2Comment, commandsToAdd: string[]): CF2Comment {
    const processedComment = { ...comment };
    
    if (!Array.isArray(processedComment.commands)) {
      processedComment.commands = [];
    }
    
    processedComment.commands = this.addOrReplaceCommands(processedComment.commands, commandsToAdd);
    
    return processedComment;
  }

  /**
   * 外部から単一コマンドを追加するためのパブリックメソッド
   */
  public addCommandToComment(comment: CF2Comment, commandToAdd: string): CF2Comment {
    const processedComment = { ...comment };
    
    if (!Array.isArray(processedComment.commands)) {
      processedComment.commands = [];
    }
    
    processedComment.commands = this.addOrReplaceCommand(processedComment.commands, commandToAdd);
    
    return processedComment;
  }

  /**
   * フィルターログを非同期で送信
   */
  private async sendFilterLogsAsync(): Promise<void> {
    // 設定でログ送信が無効の場合はスキップ
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

      // CommentFilterLogger.javaに送信（ノンブロッキング）
      setTimeout(async () => {
        try {
          const success = await FilterLogger.sendFilterLogs(this.filterLogs);
          if (this.debugMode) {
            window.logger?.info(`[CommentFilter2] Filter logs send result: ${success ? 'success' : 'failed'}`);
          }
        } catch (error) {
          window.logger?.warn('[CommentFilter2] Failed to send filter logs:', error);
        }
      }, 100); // 100ms遅延でフィルタリング処理への影響を回避
    } catch (error) {
      window.logger?.error('[CommentFilter2] Error in sendFilterLogsAsync:', error);
    }
  }

  /**
   * フィルターログエントリーを追加
   */
  private addFilterLog(
    comment: CF2Comment,
    rule: NGWordRule,
    ruleType: 'regex' | 'userId',
    matched: boolean,
    hidden: boolean,
    currentSmid: string | null
  ): void {
    try {
      const videoTitle = FilterLogger.getVideoTitle();
      const reasons = FilterLogger.generateFilterReasons(ruleType, matched, hidden);
      const filterDetails = FilterLogger.generateFilterDetails(
        ruleType,
        rule.regex,
        rule.userId,
        rule.replace
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
    // null や undefined の場合
    if (!commands) {
      return [];
    }

    // 既に配列の場合
    if (Array.isArray(commands)) {
      // 配列内の各要素をクリーンアップ
      return commands
        .filter(cmd => cmd !== null && cmd !== undefined && cmd !== '')
        .map(cmd => String(cmd).trim())
        .filter(cmd => cmd.length > 0);
    }

    // 文字列の場合はスペースで分割
    if (typeof commands === 'string') {
      return commands
        .trim()
        .split(/\s+/)
        .filter(cmd => cmd.length > 0);
    }

    // その他の型の場合は空配列
    if (this.debugMode) {
      window.logger.warn('[CommentFilter2] Unexpected commands type:', typeof commands, commands);
    }
    
    return [];
  }
} 