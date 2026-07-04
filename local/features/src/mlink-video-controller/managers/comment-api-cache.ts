import {
  CommentApiResponse,
  CommentData,
  CommentThread,
} from "@/types/common-types";

interface CachedCommentApiData {
  videoId: string;
  response: CommentApiResponse;
  capturedAt: number;
  sourceUrl: string;
}

type CacheListener = (data: CachedCommentApiData) => void;

const COMMENT_API_ENDPOINT = "https://public.nvcomment.nicovideo.jp/v1/threads";
const VIDEO_ID_PATTERN = /(?:\/watch\/|[?&]videoId=)([a-z]{2}\d+)/i;
const MAX_CACHE_ENTRIES = 8;
const DEFAULT_WAIT_TIMEOUT_MS = 1200;

const isCommentApiResponse = (value: unknown): value is CommentApiResponse => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const data = (value as { data?: unknown }).data;
  if (!data || typeof data !== "object") {
    return false;
  }

  return Array.isArray((data as { threads?: unknown }).threads);
};

export class CommentApiCache {
  private static instance: CommentApiCache;
  private readonly cache = new Map<string, CachedCommentApiData>();
  private readonly listeners = new Set<CacheListener>();
  private originalFetch: typeof window.fetch | null = null;
  private installed = false;

  public static getInstance(): CommentApiCache {
    if (!CommentApiCache.instance) {
      CommentApiCache.instance = new CommentApiCache();
    }
    return CommentApiCache.instance;
  }

  public install(): void {
    if (this.installed) {
      return;
    }

    this.originalFetch = window.fetch.bind(window);
    window.fetch = this.createFetchProxy();
    this.installed = true;
    window.logger?.debug("[CommentApiCache] fetch proxy installed");
  }

  public get(videoId: string): CachedCommentApiData | null {
    return this.cache.get(videoId.toLowerCase()) ?? null;
  }

  public getMainThread(videoId: string): CommentThread | null {
    const cached = this.get(videoId);
    if (!cached) {
      return null;
    }

    return this.selectMainThread(cached.response);
  }

  public async waitForMainThread(
    videoId: string,
    timeoutMs: number = DEFAULT_WAIT_TIMEOUT_MS,
  ): Promise<CommentThread | null> {
    const cached = this.getMainThread(videoId);
    if (cached) {
      return cached;
    }

    return await new Promise((resolve) => {
      const timeoutId = window.setTimeout(() => {
        unsubscribe();
        resolve(null);
      }, timeoutMs);

      const unsubscribe = this.onCaptured((data) => {
        if (data.videoId !== videoId.toLowerCase()) {
          return;
        }

        const mainThread = this.selectMainThread(data.response);
        if (!mainThread) {
          return;
        }

        window.clearTimeout(timeoutId);
        unsubscribe();
        resolve(mainThread);
      });
    });
  }

  public onCaptured(listener: CacheListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private createFetchProxy(): typeof window.fetch {
    return async (
      input: RequestInfo | URL,
      init?: RequestInit,
    ): Promise<Response> => {
      const fetchImpl = this.originalFetch ?? window.fetch.bind(window);
      const requestUrl = this.resolveRequestUrl(input);
      const videoIdAtRequest = this.getCurrentVideoId();
      const response = await fetchImpl(input, init);

      if (requestUrl.includes(COMMENT_API_ENDPOINT)) {
        const videoId = videoIdAtRequest ?? this.getCurrentVideoId();
        if (videoId) {
          void this.captureResponse(videoId, requestUrl, response);
        } else {
          window.logger?.debug(
            "[CommentApiCache] コメントAPIレスポンスを捕捉しましたが動画IDを特定できませんでした",
          );
        }
      }

      return response;
    };
  }

  private async captureResponse(
    videoId: string,
    sourceUrl: string,
    response: Response,
  ): Promise<void> {
    try {
      const dataRaw: unknown = await response.clone().json();
      if (!isCommentApiResponse(dataRaw)) {
        return;
      }

      const normalizedVideoId = videoId.toLowerCase();
      const cachedData: CachedCommentApiData = {
        videoId: normalizedVideoId,
        response: dataRaw,
        capturedAt: Date.now(),
        sourceUrl,
      };

      this.cache.set(normalizedVideoId, cachedData);
      this.pruneCache();
      this.notifyCaptured(cachedData);

      window.logger?.debug(
        "[CommentApiCache] コメントAPIをキャッシュしました",
        {
          videoId: normalizedVideoId,
          threads: dataRaw.data.threads.length,
          sourceUrl,
        },
      );
    } catch (error) {
      window.logger?.debug(
        "[CommentApiCache] コメントAPIレスポンスのclone解析に失敗しました",
        error,
      );
    }
  }

  private notifyCaptured(data: CachedCommentApiData): void {
    for (const listener of this.listeners) {
      try {
        listener(data);
      } catch (error) {
        window.logger?.error(
          "[CommentApiCache] キャッシュ通知でエラーが発生しました",
          error,
        );
      }
    }
  }

  private pruneCache(): void {
    if (this.cache.size <= MAX_CACHE_ENTRIES) {
      return;
    }

    const oldest = [...this.cache.entries()].sort(
      (a, b) => a[1].capturedAt - b[1].capturedAt,
    )[0];
    if (oldest) {
      this.cache.delete(oldest[0]);
    }
  }

  private selectMainThread(response: CommentApiResponse): CommentThread | null {
    const mainThreads = response.data.threads.filter(
      (thread) => thread.fork === "main",
    );
    if (mainThreads.length === 0) {
      return null;
    }

    return mainThreads.reduce((max, current) =>
      current.commentCount > max.commentCount ? current : max,
    );
  }

  private resolveRequestUrl(input: RequestInfo | URL): string {
    if (input instanceof Request) {
      return input.url;
    }
    if (input instanceof URL) {
      return input.toString();
    }
    if (typeof input === "string") {
      return input;
    }
    return "";
  }

  private getCurrentVideoId(): string | null {
    try {
      const helperVideoId = window.commonHelper?.extractVideoIdFromUrl?.(
        window.location,
      );
      if (helperVideoId) {
        return helperVideoId.toLowerCase();
      }
    } catch {
      // URLからの直接抽出へフォールバック
    }

    const match = VIDEO_ID_PATTERN.exec(window.location.href);
    return match ? match[1].toLowerCase() : null;
  }
}

export const normalizeCachedComments = (
  comments: CommentData[],
): CommentData[] =>
  comments.map((comment) => ({
    ...comment,
    vposMs: comment.vposMs ?? 0,
    postedAt: comment.postedAt ? String(comment.postedAt) : "",
  }));
