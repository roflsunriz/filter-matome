"use strict";

// グローバル型定義はglobal.d.tsで管理されています
import "@/types/global.d.ts";
import {
  NicoApiData,
  CommentData,
  IntegratedNicoData,
  ExtendedFetchWatchPageResult,
  FetchOptions,
  FetchNicoCommentsOptions,
  CommentApiResponse,
  NicoApiServerResponse,
  CommentThread,
} from "@/types/common-types";

type VideoIdSource =
  | string
  | URL
  | Location
  | {
      href?: string | null;
      pathname?: string | null;
      search?: string | null;
      hash?: string | null;
    };

const WATCH_VIDEO_ID_PATTERN = /\/watch\/([a-z]{2}\d+)/i;
const VIDEO_ID_QUERY_PATTERN = /[?&]videoId=([a-z]{2}\d+)/i;
const GENERIC_VIDEO_ID_PATTERN = /([a-z]{2}\d+)/i;
const WATCH_PAGE_CACHE_TTL_MS = 5 * 60 * 1000;
const COMMENT_CACHE_TTL_MS = 30 * 1000;
const MAX_COMMON_CACHE_ENTRIES = 16;
const COMMENT_FILTER_BYPASS_FLAG = "__commentFilter2Bypass";

type TimedCacheEntry<T> = {
  value: T;
  expiresAt: number;
};

type NicoCommentResult = {
  threads: CommentThread[];
  comments: CommentData[];
  mainThread: CommentThread;
};

const watchPageCache = new Map<
  string,
  TimedCacheEntry<ExtendedFetchWatchPageResult>
>();
const watchPageInflight = new Map<
  string,
  Promise<ExtendedFetchWatchPageResult | void>
>();
const commentCache = new Map<string, TimedCacheEntry<NicoCommentResult>>();
const commentInflight = new Map<string, Promise<NicoCommentResult | void>>();

const normalizeVideoId = (value?: string | null): string | null => {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed.toLowerCase() : null;
};

const resolveUrlString = (input?: VideoIdSource | null): string | null => {
  if (!input) {
    return null;
  }
  if (typeof input === "string") {
    return input;
  }
  try {
    if (input instanceof URL) {
      return input.href;
    }
  } catch {
    // ignore environments without URL constructor support
  }
  const hrefCandidate = (input as { href?: unknown }).href;
  if (typeof hrefCandidate === "string") {
    return hrefCandidate;
  }
  const pathname = (input as { pathname?: unknown }).pathname;
  if (typeof pathname === "string") {
    const search =
      typeof (input as { search?: unknown }).search === "string"
        ? (input as { search: string }).search
        : "";
    const hash =
      typeof (input as { hash?: unknown }).hash === "string"
        ? (input as { hash: string }).hash
        : "";
    return `${pathname}${search}${hash}`;
  }
  return null;
};

const extractVideoIdFromString = (value: string): string | null => {
  const watchMatch = WATCH_VIDEO_ID_PATTERN.exec(value);
  if (watchMatch) {
    return normalizeVideoId(watchMatch[1]);
  }
  const queryMatch = VIDEO_ID_QUERY_PATTERN.exec(value);
  if (queryMatch) {
    return normalizeVideoId(queryMatch[1]);
  }
  const genericMatch = GENERIC_VIDEO_ID_PATTERN.exec(value);
  if (genericMatch) {
    return normalizeVideoId(genericMatch[1]);
  }
  return null;
};

const getTimedCache = <T>(
  cache: Map<string, TimedCacheEntry<T>>,
  key: string,
): T | null => {
  const entry = cache.get(key);
  if (!entry) {
    return null;
  }
  if (entry.expiresAt <= Date.now()) {
    cache.delete(key);
    return null;
  }
  return entry.value;
};

const setTimedCache = <T>(
  cache: Map<string, TimedCacheEntry<T>>,
  key: string,
  value: T,
  ttlMs: number,
): void => {
  cache.set(key, {
    value,
    expiresAt: Date.now() + ttlMs,
  });

  if (cache.size <= MAX_COMMON_CACHE_ENTRIES) {
    return;
  }

  const oldest = [...cache.entries()].sort(
    (a, b) => a[1].expiresAt - b[1].expiresAt,
  )[0];
  if (oldest) {
    cache.delete(oldest[0]);
  }
};

const createCommentCacheKey = (apiData: NicoApiData): string => {
  const nvComment = apiData.comment.nvComment;
  return JSON.stringify({
    server: nvComment.server,
    params: nvComment.params,
    threadKey: nvComment.threadKey,
  });
};

const selectRepresentativeMainThread = (
  threads: CommentThread[],
): CommentThread => {
  const mainThreads = threads.filter((thread) => thread.fork === "main");
  const candidates = mainThreads.length > 0 ? mainThreads : threads;
  const selected = candidates.reduce((max, current) =>
    current.commentCount > max.commentCount ? current : max,
  );
  return selected;
};

const mergeThreadComments = (threads: CommentThread[]): CommentData[] =>
  threads
    .flatMap((thread) =>
      thread.comments.map((comment) => ({
        ...comment,
        fork: comment.fork ?? thread.fork,
        threadId: comment.threadId ?? thread.id,
      })),
    )
    .sort((a, b) => {
      const vposDiff = (a.vposMs ?? 0) - (b.vposMs ?? 0);
      if (vposDiff !== 0) {
        return vposDiff;
      }
      return (a.no ?? 0) - (b.no ?? 0);
    });

window.commonHelper = {
  // 共通のfetch関数
  fetchRequest: (
    url: string,
    options: FetchOptions = {},
  ): Promise<Response> => {
    const { bypassCommentFilter, headers, ...requestOptions } = options;
    const defaultOptions: FetchOptions = {
      method: "GET",
      headers: headers ?? {},
      ...requestOptions,
      ...(bypassCommentFilter ? { [COMMENT_FILTER_BYPASS_FLAG]: true } : {}),
    };

    return fetch(url, defaultOptions);
  },

  extractVideoIdFromUrl: (input?: VideoIdSource | null): string | null => {
    try {
      const primarySource = resolveUrlString(input);
      if (primarySource) {
        const candidate = extractVideoIdFromString(primarySource);
        if (candidate) {
          return candidate;
        }
      }
      if (!input) {
        const fallback = resolveUrlString(window.location);
        if (fallback) {
          const fallbackCandidate = extractVideoIdFromString(fallback);
          if (fallbackCandidate) {
            return fallbackCandidate;
          }
        }
      }
    } catch (error) {
      console.error("[commonHelper] extractVideoIdFromUrl failed", error);
    }
    return null;
  },

  checkCache404: (url: string): Promise<boolean | void> => {
    return window.commonHelper
      .fetchRequest(url)
      .then((response) => {
        if (response.ok === true) {
          return true;
        } else {
          return false;
        }
      })
      .catch((err) => {
        console.error(err);
      });
  },

  fetchWatchPage: async (
    SMID?: string,
  ): Promise<ExtendedFetchWatchPageResult | void> => {
    const resolvedVideoId =
      normalizeVideoId(SMID) ?? window.commonHelper.extractVideoIdFromUrl();
    if (!resolvedVideoId) {
      console.error("SMIDが取得できませんでした");
      return;
    }

    const cacheKey = resolvedVideoId;
    const cachedResult = getTimedCache(watchPageCache, cacheKey);
    if (cachedResult) {
      return cachedResult;
    }

    const inflight = watchPageInflight.get(cacheKey);
    if (inflight) {
      return await inflight;
    }

    const request = (async (): Promise<ExtendedFetchWatchPageResult | void> => {
      try {
        const response = await window.commonHelper.fetchRequest(
          "https://www.nicovideo.jp/watch/" + resolvedVideoId,
        );

        if (!response.ok) {
          console.error("HTTP status code : " + response.status);
          console.error("HTTP status Text : " + response.statusText);
          throw new Error(String(response.status));
        }

        const text = await response.text();
        const doc = new DOMParser().parseFromString(text, "text/html");

        const serverContextRaw: unknown = JSON.parse(
          doc
            .querySelector('meta[name="server-context"]')
            ?.getAttribute("content") || "{}",
        );
        const serverContext =
          serverContextRaw && typeof serverContextRaw === "object"
            ? (serverContextRaw as Record<string, unknown>)
            : {};
        const serverResponseContent =
          doc
            .querySelector('meta[name="server-response"]')
            ?.getAttribute("content") || "{}";
        const serverResponseUnknown: unknown = JSON.parse(
          decodeURIComponent(serverResponseContent),
        );
        if (
          !serverResponseUnknown ||
          typeof serverResponseUnknown !== "object"
        ) {
          throw new Error("Invalid server response");
        }
        const serverResponse = serverResponseUnknown as NicoApiServerResponse;

        return {
          serverContext: serverContext,
          serverResponse: serverResponse,
          apiData: serverResponse.data.response,
        };
      } catch (error) {
        console.error(error);
      } finally {
        watchPageInflight.delete(cacheKey);
      }
    })();

    watchPageInflight.set(cacheKey, request);
    const result = await request;
    if (result) {
      const resolvedVideoId =
        typeof result.apiData.video?.id === "string"
          ? result.apiData.video.id
          : null;
      const resolvedCacheKey = normalizeVideoId(resolvedVideoId) ?? cacheKey;
      setTimedCache(watchPageCache, cacheKey, result, WATCH_PAGE_CACHE_TTL_MS);
      setTimedCache(
        watchPageCache,
        resolvedCacheKey,
        result,
        WATCH_PAGE_CACHE_TTL_MS,
      );
    }
    return result;
  },

  // ニコニコ動画のコメントデータを取得する関数
  fetchNicoComments: async (
    apiData: NicoApiData,
    options: FetchNicoCommentsOptions = {},
  ): Promise<NicoCommentResult | void> => {
    try {
      const commentServer = apiData.comment.nvComment.server + "/v1/threads";
      const cacheKey =
        createCommentCacheKey(apiData) +
        (options.bypassCommentFilter ? "|raw" : "|filtered");
      const cachedResult = getTimedCache(commentCache, cacheKey);
      if (cachedResult) {
        return cachedResult;
      }

      const inflight = commentInflight.get(cacheKey);
      if (inflight) {
        return await inflight;
      }

      const requestBody = {
        params: apiData.comment.nvComment.params,
        threadKey: apiData.comment.nvComment.threadKey,
      };

      const request = (async (): Promise<NicoCommentResult | void> => {
        const response = await window.commonHelper.fetchRequest(commentServer, {
          method: "POST",
          bypassCommentFilter: options.bypassCommentFilter,
          headers: {
            "x-client-os-type": "others",
            "X-Frontend-Id": "6",
            "X-Frontend-Version": "0",
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          console.error("コメントデータ取得エラー: " + response.status);
          throw new Error(`コメントAPI Error: ${response.status}`);
        }

        const commentData = (await response.json()) as CommentApiResponse;

        const threads = commentData.data.threads;
        if (threads.length === 0) {
          console.error("取得可能なコメントスレッドが見つかりません");
          return {
            threads: [],
            comments: [],
            mainThread: { id: "", fork: "main", commentCount: 0, comments: [] },
          };
        }

        const mainThread = selectRepresentativeMainThread(threads);
        return {
          threads,
          comments: mergeThreadComments(threads),
          mainThread,
        };
      })();

      commentInflight.set(cacheKey, request);
      const result = await request;
      if (result) {
        setTimedCache(commentCache, cacheKey, result, COMMENT_CACHE_TTL_MS);
      }
      return result;
    } catch (error) {
      console.error("コメントデータ取得エラー:", error);
    } finally {
      const cacheKey =
        createCommentCacheKey(apiData) +
        (options.bypassCommentFilter ? "|raw" : "|filtered");
      commentInflight.delete(cacheKey);
    }
  },

  // NicoCache_nl.watch.getVideoIDをチェックして、取得できない場合にURLから動画IDを抽出するフォールバック機能
  getVideoIdWithFallback: async (
    input?: VideoIdSource | null,
  ): Promise<string | null> => {
    try {
      // SPA直後はNicoCache_nl.watch側が一つ前の動画IDを保持していることがある。
      // 現在URLや明示された入力に動画IDがある場合は、それを最優先にする。
      const urlVideoId = window.commonHelper.extractVideoIdFromUrl(
        input ?? window.location,
      );
      if (urlVideoId) {
        return urlVideoId;
      }

      // SPAのレンダリング完了を待つ（NicoCache_nlが利用可能になるまで、最大5秒）
      await new Promise<void>((resolve) => {
        let attempts = 0;
        const maxAttempts = 50; // 100ms * 50 = 5秒
        const checkReady = () => {
          attempts++;
          const windowWithNico = window as Window & {
            NicoCache_nl?: {
              watch?: {
                getVideoID?: () => string;
                apiData?: { video?: { id?: string } };
              };
            };
          };
          const nicoCache = windowWithNico.NicoCache_nl;
          // SPAレンダリング完了をチェック（NicoCache_nlが利用可能か、タイムアウト）
          const isReady =
            nicoCache?.watch?.getVideoID ||
            nicoCache?.watch?.apiData?.video?.id;
          // @ts-expect-error - タイムアウト条件として使用
          if (isReady || attempts >= maxAttempts) {
            resolve();
          } else {
            setTimeout(checkReady, 100); // 100msごとにチェック
          }
        };
        checkReady();
      });

      // 1. URLに動画IDが無い場合のみ: NicoCache_nl.watch.getVideoIDから取得を試行
      const windowWithNico = window as Window & {
        NicoCache_nl?: {
          watch?: {
            getVideoID?: () => string;
            apiData?: { video?: { id?: string } };
          };
        };
      };
      const nicoCache = windowWithNico.NicoCache_nl;
      if (
        nicoCache?.watch?.getVideoID &&
        typeof nicoCache.watch.getVideoID === "function"
      ) {
        try {
          const fromApi = nicoCache.watch.getVideoID();
          if (fromApi && typeof fromApi === "string") {
            const normalized = normalizeVideoId(fromApi);
            if (normalized) {
              return normalized;
            }
          }
        } catch (error) {
          console.warn(
            "[commonHelper] NicoCache_nl.watch.getVideoID failed:",
            error,
          );
        }
      }

      // 2. フォールバック: APIデータから取得を試行
      const videoId = nicoCache?.watch?.apiData?.video?.id;
      if (videoId && typeof videoId === "string") {
        const fromApiData = normalizeVideoId(videoId);
        if (fromApiData) {
          return fromApiData;
        }
      }

      // 3. フォールバック: fetchWatchPageで取得
      try {
        const watchPageResult = await window.commonHelper.fetchWatchPage();
        if (
          watchPageResult?.apiData?.video?.id &&
          typeof watchPageResult.apiData.video.id === "string"
        ) {
          const fromFetch = normalizeVideoId(watchPageResult.apiData.video.id);
          if (fromFetch) {
            return fromFetch;
          }
        }
      } catch (error) {
        console.warn("[commonHelper] fetchWatchPage fallback failed:", error);
      }

      return null;
    } catch (error) {
      console.error("[commonHelper] getVideoIdWithFallback failed:", error);
      return null;
    }
  },

  // ニコニコ動画のAPIデータとコメントデータを一度に取得するヘルパー関数
  fetchNicoDataWithComments: async (
    SMID?: string,
    options: FetchNicoCommentsOptions = {},
  ): Promise<IntegratedNicoData | void> => {
    try {
      // 1. まずAPIデータを取得
      const watchPageResult = await window.commonHelper.fetchWatchPage(SMID);
      if (!watchPageResult) {
        console.error("ウォッチページデータが取得できませんでした");
        return;
      }

      // 2. コメントデータを取得（全フォークのスレッドと統合コメントを含む）
      const commentResult = await window.commonHelper.fetchNicoComments(
        watchPageResult.apiData,
        options,
      );
      if (!commentResult) {
        console.error("コメントデータが取得できませんでした");
        return;
      }

      return {
        apiData: watchPageResult.apiData,
        threads: commentResult.threads,
        comments: commentResult.comments,
        mainThread: commentResult.mainThread,
      };
    } catch (error) {
      console.error("統合データ取得エラー:", error);
    }
  },
};

// NicoCommon名前空間はheader.tsで初期化される

export {};
