import { CONSTANTS } from '@/comment-filter2/utils/constants';
import { CF2CommentApiResponse, CommentFilter2GlobalData, CF2Comment, CF2Thread, NGWordRule, Settings, CF2FilterLogEntry } from '@/types/filter-types';
import { FilterLogger } from '@/comment-filter2/utils/filter-logger';
import {
  PreparedRuleSet,
  RuleMatchLogEvent,
  filterThread,
  prepareRules as enginePrepareRules,
  addOrReplaceCommand as engineAddOrReplaceCommand,
  addOrReplaceCommands as engineAddOrReplaceCommands,
  getCommandsOfType as engineGetCommandsOfType,
  removeCommandsOfType as engineRemoveCommandsOfType,
  isCommandOfType as engineIsCommandOfType,
  normalizeCommands as engineNormalizeCommands,
  chunkThreads
} from './comment-filter-engine';

interface ProcessRequestPayload {
  threads: CF2Thread[];
  rules: NGWordRule[];
  currentSmid: string | null;
  settings: Settings | null;
  debugMode: boolean;
}

interface ProcessResponsePayload {
  threads: CF2Thread[];
  logs: RuleMatchLogEvent[];
}

interface ProcessRequest {
  type: 'process';
  payload: ProcessRequestPayload;
}

interface ProcessResponse {
  type: 'result';
  payload: ProcessResponsePayload;
}

export class CommentFilter {
  private regexCache: Map<string, RegExp> = new Map();
  private debugMode = false;
  private settings: Settings | null = null;
  private filterLogs: CF2FilterLogEntry[] = [];

  constructor(debugMode: boolean = false) {
    this.debugMode = debugMode;
  }

  public updateSettings(settings: Settings): void {
    this.settings = settings;
    this.debugMode = settings.debugMode;
    FilterLogger.setLogSendingEnabled(settings?.logToCommentFilterLogger || false);
  }

  public async applyFilters(rules: NGWordRule[], currentSmid: string | null): Promise<CF2CommentApiResponse | null> {
    await Promise.resolve();
    const globalData = this.getGlobalData();

    if (!globalData?.originalData) {
      if (this.debugMode) {
        window.logger?.debug('[CommentFilter2] No global data available for filtering');
      }
      return null;
    }

    try {
      this.filterLogs = [];

      if (this.debugMode) {
        window.logger?.debug('[CommentFilter2] Starting filtering with rules:', {
          totalRules: rules.length,
          userIdRules: rules.filter(rule => rule.isUserIdRule),
          regexRules: rules.filter(rule => !rule.isUserIdRule),
          currentSmid
        });
      }

      let filteredData: CF2CommentApiResponse;

      if (this.shouldUseWorker(globalData.originalData.data.threads)) {
        try {
          filteredData = await this.processCommentDataWithWorkers(globalData.originalData, rules, currentSmid);
        } catch (workerError) {
          const reason = workerError instanceof Error ? workerError : new Error(String(workerError));
          window.logger?.warn('[CommentFilter2] Worker processing failed, falling back to main thread:', reason);

          const preparedRules = this.prepareRules(rules, currentSmid);
          filteredData = this.processCommentData(globalData.originalData, preparedRules, currentSmid);
        }
      } else {
        const preparedRules = this.prepareRules(rules, currentSmid);
        filteredData = this.processCommentData(globalData.originalData, preparedRules, currentSmid);
      }

      globalData.filteredData = filteredData;

      if (this.debugMode) {
        this.logFilteringResults(globalData.originalData, filteredData, rules);
      }

      if (this.settings?.logToCommentFilterLogger && this.filterLogs.length > 0) {
        FilterLogger.addLogsToBuffer(this.filterLogs);
      }

      return filteredData;
    } catch (error) {
      window.logger?.error('[CommentFilter2] Filtering failed:', error);
      return globalData.originalData;
    }
  }

  private processCommentData(
    data: CF2CommentApiResponse,
    preparedRules: PreparedRuleSet,
    currentSmid: string | null
  ): CF2CommentApiResponse {
    const processedThreads = data.data.threads.map(thread => {
      const { comments, logs } = filterThread({
        thread,
        preparedRules,
        settings: this.settings,
        regexCache: this.regexCache,
        debugMode: this.debugMode
      });

      this.captureLogEvents(logs, currentSmid);

      return {
        ...thread,
        comments
      };
    });

    return {
      ...data,
      data: {
        ...data.data,
        threads: processedThreads
      }
    };
  }

  private async processCommentDataWithWorkers(
    data: CF2CommentApiResponse,
    rules: NGWordRule[],
    currentSmid: string | null
  ): Promise<CF2CommentApiResponse> {
    const threads = data.data.threads;

    if (threads.length === 0) {
      return data;
    }

    const workerCount = this.resolveWorkerCount(threads.length);
    const chunkSize = Math.ceil(threads.length / workerCount);
    const threadChunks = chunkThreads(threads, chunkSize);

    const results = await Promise.all(
      threadChunks.map(chunk =>
        this.runWorker({
          threads: chunk,
          rules,
          currentSmid,
          settings: this.settings,
          debugMode: this.debugMode
        })
      )
    );

    const updatedThreads: CF2Thread[] = [];

    for (const result of results) {
      this.captureLogEvents(result.logs, currentSmid);
      updatedThreads.push(...result.threads);
    }

    return {
      ...data,
      data: {
        ...data.data,
        threads: updatedThreads
      }
    };
  }

  private runWorker(payload: ProcessRequestPayload): Promise<ProcessResponsePayload> {
    return new Promise((resolve, reject) => {
      const worker = new Worker(new URL('./comment-filter-worker.ts', import.meta.url), { type: 'module' });

      worker.onmessage = (event: MessageEvent<ProcessResponse>) => {
        resolve(event.data.payload);
        worker.terminate();
      };

      worker.onerror = event => {
        worker.terminate();
        const reason = event instanceof ErrorEvent
          ? (event.error instanceof Error ? event.error : new Error(event.message))
          : new Error(String(event));
        reject(reason);
      };

      const message: ProcessRequest = {
        type: 'process',
        payload
      };

      worker.postMessage(message);
    });
  }

  private shouldUseWorker(threads: CF2Thread[]): boolean {
    if (typeof Worker === 'undefined') {
      return false;
    }

    if (!threads || threads.length <= 1) {
      return false;
    }

    const hardware = typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 0 : 0;
    return hardware > 1;
  }

  private resolveWorkerCount(threadCount: number): number {
    const hardware = typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 1 : 1;
    const maxWorkers = Math.max(1, hardware - 1);
    return Math.min(maxWorkers, Math.max(1, threadCount));
  }

  private captureLogEvents(events: RuleMatchLogEvent[], currentSmid: string | null): void {
    for (const event of events) {
      this.addFilterLog(event.comment, event.rule, event.ruleType, true, event.hidden, currentSmid);
    }
  }

  private prepareRules(rules: NGWordRule[], currentSmid: string | null): PreparedRuleSet {
    return enginePrepareRules(rules, currentSmid, this.regexCache);
  }

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

  private logFilteringResults(
    original: CF2CommentApiResponse,
    filtered: CF2CommentApiResponse,
    rules: NGWordRule[]
  ): void {
    const originalCount = this.countComments(original);
    const filteredCount = this.countComments(filtered);
    const hiddenCount = originalCount - filteredCount;

    window.logger?.debug('[CommentFilter2] Filtering Results:', {
      originalComments: originalCount,
      filteredComments: filteredCount,
      hiddenComments: hiddenCount,
      appliedRules: rules.length
    });
  }

  private countComments(data: CF2CommentApiResponse): number {
    return data.data.threads.reduce((sum, thread) => sum + thread.comments.length, 0);
  }

  private getGlobalData(): CommentFilter2GlobalData | null {
    const data = (window as unknown as Record<string, unknown>)[CONSTANTS.GLOBAL_DATA_KEY];

    if (
      data &&
      typeof data === 'object' &&
      'originalData' in data &&
      'filteredData' in data &&
      'currentSmid' in data &&
      'lastUpdated' in data
    ) {
      return data as CommentFilter2GlobalData;
    }

    return null;
  }

  public clearRegexCache(): void {
    this.regexCache.clear();
  }

  public setDebugMode(enabled: boolean): void {
    this.debugMode = enabled;
  }

  public addCommandsToComment(comment: CF2Comment, commandsToAdd: string[]): CF2Comment {
    const processedComment: CF2Comment = { ...comment };
    processedComment.commands = Array.isArray(processedComment.commands) ? [...processedComment.commands] : [];
    processedComment.commands = engineAddOrReplaceCommands(processedComment.commands, commandsToAdd);
    return processedComment;
  }

  public addCommandToComment(comment: CF2Comment, commandToAdd: string): CF2Comment {
    const processedComment: CF2Comment = { ...comment };
    processedComment.commands = Array.isArray(processedComment.commands) ? [...processedComment.commands] : [];
    processedComment.commands = engineAddOrReplaceCommand(processedComment.commands, commandToAdd);
    return processedComment;
  }

  private addOrReplaceCommand(commands: string[], newCommand: string): string[] {
    return engineAddOrReplaceCommand(commands, newCommand);
  }

  private addOrReplaceCommands(commands: string[], newCommands: string[]): string[] {
    return engineAddOrReplaceCommands(commands, newCommands);
  }

  private isCommandOfType(command: string, commandType: string): boolean {
    return engineIsCommandOfType(command, commandType);
  }

  private getCommandsOfType(commands: string[], commandType: string): string[] {
    return engineGetCommandsOfType(commands, commandType);
  }

  private removeCommandsOfType(commands: string[], commandType: string): string[] {
    return engineRemoveCommandsOfType(commands, commandType);
  }

  private normalizeCommands(commands: string | string[] | null | undefined): string[] {
    return engineNormalizeCommands(commands);
  }
}
