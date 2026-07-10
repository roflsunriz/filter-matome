import { CONSTANTS } from "@/comment-filter2/utils/constants";
import {
  CF2CommentApiResponse,
  CommentFilter2GlobalData,
  CF2Comment,
  CF2Thread,
  Settings,
  CF2FilterLogEntry,
} from "@/types/filter-types";
import { NgRuleJson } from "@/types/filter-types";
import { FilterLogger } from "@/comment-filter2/utils/filter-logger";
import {
  PreparedJsonRuleSet,
  JsonRuleMatchEvent,
  filterJsonThread,
  prepareJsonRules,
  chunkThreads,
} from "@/comment-filter2/filter/json-comment-filter-engine";
const JSON_COMMENT_WORKER_URL =
  "/local/features/dist/workers/json-comment-filter-worker.js";

interface ProcessRequestPayload {
  threads: CF2Thread[];
  rules: NgRuleJson[];
  currentSmid: string | null;
  settings: Settings | null;
}

interface ProcessResponsePayload {
  threads: CF2Thread[];
  logs: JsonRuleMatchEvent[];
}

interface ProcessRequest {
  type: "process";
  payload: ProcessRequestPayload;
}

interface ProcessResponse {
  type: "result";
  payload: ProcessResponsePayload;
}

export class JsonCommentFilter {
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
    FilterLogger.setLogSendingEnabled(
      settings?.logToCommentFilterLogger || false,
    );
  }

  public async applyFilters(
    rules: NgRuleJson[],
    currentSmid: string | null,
  ): Promise<CF2CommentApiResponse | null> {
    await Promise.resolve();
    const globalData = this.getGlobalData();

    if (!globalData?.originalData) {
      if (this.debugMode) {
        window.logger?.debug(
          "[CommentFilter2] No global data available for filtering",
        );
      }
      return null;
    }

    try {
      this.filterLogs = [];

      if (this.debugMode) {
        window.logger?.debug(
          "[CommentFilter2] Starting JSON filtering with rules:",
          {
            totalRules: rules.length,
            userIdRules: rules.filter((rule) => Boolean(rule.userId)),
            regexRules: rules.filter((rule) => Boolean(rule.pattern)),
            currentSmid,
          },
        );
      }

      let filteredData: CF2CommentApiResponse;

      if (this.shouldUseWorker(globalData.originalData.data.threads)) {
        try {
          filteredData = await this.processCommentDataWithWorkers(
            globalData.originalData,
            rules,
            currentSmid,
          );
        } catch (workerError) {
          const reason =
            workerError instanceof Error
              ? workerError
              : new Error(String(workerError));
          if (reason instanceof Error) {
            window.logger?.warn(
              "[CommentFilter2] JSON worker failed, falling back to main thread:",
              reason,
              reason.stack,
            );
          } else if (typeof reason === "object" && reason !== null) {
            window.logger?.warn(
              "[CommentFilter2] JSON worker failed, falling back to main thread:",
              JSON.stringify(reason, Object.getOwnPropertyNames(reason)),
            );
          } else {
            window.logger?.warn(
              "[CommentFilter2] JSON worker failed, falling back to main thread:",
              String(reason),
            );
          }

          const preparedRules = this.prepareRules(rules, currentSmid);
          filteredData = this.processCommentData(
            globalData.originalData,
            preparedRules,
            currentSmid,
          );
        }
      } else {
        const preparedRules = this.prepareRules(rules, currentSmid);
        filteredData = this.processCommentData(
          globalData.originalData,
          preparedRules,
          currentSmid,
        );
      }

      globalData.filteredData = filteredData;

      if (this.debugMode) {
        this.logFilteringResults(globalData.originalData, filteredData, rules);
      }

      if (
        this.settings?.logToCommentFilterLogger &&
        this.filterLogs.length > 0
      ) {
        FilterLogger.addLogsToBuffer(this.filterLogs);
      }

      return filteredData;
    } catch (error) {
      window.logger?.error("[CommentFilter2] JSON filtering failed:", error);
      return globalData.originalData;
    }
  }

  private processCommentData(
    data: CF2CommentApiResponse,
    preparedRules: PreparedJsonRuleSet,
    currentSmid: string | null,
  ): CF2CommentApiResponse {
    const processedThreads = data.data.threads.map((thread) => {
      const { comments, logs } = filterJsonThread({
        thread,
        preparedRules,
        settings: this.settings,
        regexCache: this.regexCache,
      });

      this.captureLogEvents(logs, currentSmid);

      return {
        ...thread,
        comments,
      };
    });

    return {
      ...data,
      data: {
        ...data.data,
        threads: processedThreads,
      },
    };
  }

  private async processCommentDataWithWorkers(
    data: CF2CommentApiResponse,
    rules: NgRuleJson[],
    currentSmid: string | null,
  ): Promise<CF2CommentApiResponse> {
    const threads = data.data.threads;

    if (threads.length === 0) {
      return data;
    }

    const workerCount = this.resolveWorkerCount(threads.length);
    const chunkSize = Math.ceil(threads.length / workerCount);
    const threadChunks = chunkThreads(threads, chunkSize);

    const results = await Promise.all(
      threadChunks.map((chunk) =>
        this.runWorker({
          threads: chunk,
          rules,
          currentSmid,
          settings: this.settings,
        }),
      ),
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
        threads: updatedThreads,
      },
    };
  }

  private runWorker(
    payload: ProcessRequestPayload,
  ): Promise<ProcessResponsePayload> {
    return new Promise((resolve, reject) => {
      window?.logger.info(
        "[CommentFilter2] JSON worker URL:",
        JSON_COMMENT_WORKER_URL,
      );
      const worker = new Worker(JSON_COMMENT_WORKER_URL, { type: "module" });

      worker.onmessage = (event: MessageEvent<ProcessResponse>) => {
        resolve(event.data.payload);
        worker.terminate();
      };

      worker.onerror = (event: ErrorEvent | Event) => {
        worker.terminate();

        let reason: Error = new Error("Worker error (unknown)");

        if (event instanceof ErrorEvent) {
          const errorValue: unknown = event.error;

          console.error("[CommentFilter2] JSON worker error", {
            message: event.message,
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno,
            error: errorValue,
          });

          if (errorValue instanceof Error) {
            reason = errorValue;
          } else if (event.message) {
            reason = new Error(event.message);
          } else {
            reason = new Error(
              `Worker error at ${event.filename ?? "unknown source"}:${event.lineno ?? 0}`,
            );
          }
        } else {
          window?.logger.error(
            "[CommentFilter2] JSON worker error (non ErrorEvent)",
            event,
          );
          reason = new Error("Worker error (non ErrorEvent)");
        }

        reject(reason);
      };

      const message: ProcessRequest = {
        type: "process",
        payload,
      };

      worker.postMessage(message);
    });
  }

  private shouldUseWorker(threads: CF2Thread[]): boolean {
    if (typeof Worker === "undefined") {
      return false;
    }

    if (!threads || threads.length <= 1) {
      return false;
    }

    const hardware =
      typeof navigator !== "undefined" ? navigator.hardwareConcurrency || 0 : 0;
    return hardware > 1;
  }

  private resolveWorkerCount(threadCount: number): number {
    const hardware =
      typeof navigator !== "undefined" ? navigator.hardwareConcurrency || 1 : 1;
    const maxWorkers = Math.max(1, hardware - 1);
    return Math.min(maxWorkers, Math.max(1, threadCount));
  }

  private captureLogEvents(
    events: JsonRuleMatchEvent[],
    currentSmid: string | null,
  ): void {
    for (const event of events) {
      this.addFilterLog(event.comment, event.rule, event.hidden, currentSmid);
    }
  }

  private prepareRules(
    rules: NgRuleJson[],
    currentSmid: string | null,
  ): PreparedJsonRuleSet {
    return prepareJsonRules(rules, currentSmid, this.regexCache);
  }

  private addFilterLog(
    comment: CF2Comment,
    rule: NgRuleJson,
    hidden: boolean,
    currentSmid: string | null,
  ): void {
    try {
      const videoTitle = FilterLogger.getVideoTitle();
      const ruleType = rule.pattern ? "regex" : "userId";
      const reasons = FilterLogger.generateFilterReasons(
        ruleType,
        true,
        hidden,
      );
      const filterDetails = FilterLogger.generateFilterDetails(
        ruleType,
        rule.pattern,
        rule.userId,
        rule.action.type === "replace" ? rule.action.replacement : undefined,
      );

      const logEntry: CF2FilterLogEntry = {
        title: videoTitle,
        userId: comment.userId,
        comment: comment.body,
        videoId: currentSmid || "不明",
        reasons,
        filterDetails,
      };

      this.filterLogs.push(logEntry);
    } catch (error) {
      window.logger?.warn("[CommentFilter2] Failed to add filter log:", error);
    }
  }

  private logFilteringResults(
    original: CF2CommentApiResponse,
    filtered: CF2CommentApiResponse,
    rules: NgRuleJson[],
  ): void {
    const originalCount = this.countComments(original);
    const filteredCount = this.countComments(filtered);
    const hiddenCount = originalCount - filteredCount;

    window.logger?.debug("[CommentFilter2] JSON Filtering Results:", {
      originalComments: originalCount,
      filteredComments: filteredCount,
      hiddenComments: hiddenCount,
      appliedRules: rules.length,
      ruleTypes: {
        regex: rules.filter((r) => r.pattern).length,
        userId: rules.filter((r) => r.userId).length,
        withNicoruCond: rules.filter((r) => r.nicoru_cond).length,
      },
    });
  }

  private countComments(data: CF2CommentApiResponse): number {
    return data.data.threads.reduce(
      (sum, thread) => sum + thread.comments.length,
      0,
    );
  }

  private getGlobalData(): CommentFilter2GlobalData | null {
    const data = (window as unknown as Record<string, unknown>)[
      CONSTANTS.GLOBAL_DATA_KEY
    ];

    if (
      data &&
      typeof data === "object" &&
      "originalData" in data &&
      "filteredData" in data &&
      "currentSmid" in data &&
      "lastUpdated" in data
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
}
