"use strict";

import "@/types/global.d.ts";
import {
  VideoOperation,
  SimpleVideoInfo,
  CacheInfoResponse,
} from "@/types/video-types";
import { NicoCache_nlInterface } from "@/types/global-types";

// 統一された動画ID抽出処理 (common.tsのgetVideoIdWithFallbackを使用)
export const getActiveVideoId = async (): Promise<string> => {
  const videoId = (await window.commonHelper?.getVideoIdWithFallback()) ?? null;
  return videoId ?? "";
};

export const handleVideoOperation = (
  operation: VideoOperation,
  videoId: string,
): void => {
  switch (operation) {
    case "cache_remove":
      void handleCacheRemove(videoId);
      return;
    default:
      throw new Error("Unknown operation: " + String(operation));
  }
};

export const getVideoInfo = async (): Promise<SimpleVideoInfo> => {
  const nicoCache = (window as Window & { NicoCache_nl: NicoCache_nlInterface })
    .NicoCache_nl;
  const videoTitle = nicoCache?.watch?.apiData?.video
    ? nicoCache.watch.apiData.video.title || ""
    : "";
  const videoId = await getActiveVideoId();

  return {
    videoId,
    threadId: nicoCache?.watch
      ? nicoCache?.watch?.apiData?.comment?.threads?.find(
          (thread) => thread.isDefaultPostTarget === true,
        )?.id || ""
      : "",
    title: videoTitle,
  };
};

export const fetchCacheInfo = (videoId: string): Promise<CacheInfoResponse> => {
  const url =
    "https://www.nicovideo.jp/cache/info/v2?" + encodeURIComponent(videoId);
  return fetch(url).then((response) => {
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  });
};

const toCacheInfoEntry = (
  videoId: string,
  cacheInfo: CacheInfoResponse,
): CacheInfoResponse[string] | undefined =>
  cacheInfo[videoId] ?? cacheInfo[videoId.toLowerCase()];

const extractHlsCacheId = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }
  const decoded = (() => {
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  })();
  const match = /([a-z]{2}\d+(?:low)?\[[^\]]+\]\.hls)/i.exec(decoded);
  return match ? match[1] : null;
};

const toStringSet = (value: unknown): Set<string> => {
  const result = new Set<string>();
  const add = (item: unknown): void => {
    if (Array.isArray(item)) {
      item.forEach(add);
      return;
    }
    const cacheId = extractHlsCacheId(item);
    if (cacheId) {
      result.add(cacheId);
    }
  };
  add(value);
  return result;
};

export const buildCacheRemovalPaths = (
  videoId: string,
  cacheInfo: CacheInfoResponse,
): string[] => {
  const entry = toCacheInfoEntry(videoId, cacheInfo);
  if (!entry) {
    return [];
  }

  const candidates = new Set<unknown>();
  const addCandidate = (value: unknown): void => {
    if (Array.isArray(value)) {
      value.forEach(addCandidate);
      return;
    }
    candidates.add(value);
  };

  addCandidate(entry.preferred);
  addCandidate(entry.cacheIds);
  addCandidate(entry.completes);
  addCandidate(entry.cachings);
  addCandidate(entry.preferredDmcHls);
  addCandidate(entry.preferredDmc);

  const caches = entry.caches;
  if (caches && typeof caches === "object") {
    Object.entries(caches).forEach(([cacheId, cache]) => {
      addCandidate(cacheId);
      if (cache && typeof cache === "object") {
        addCandidate((cache as { cacheId?: unknown }).cacheId);
        addCandidate((cache as { filename?: unknown }).filename);
      }
    });
  }

  const normalizedVideoId = videoId.toLowerCase();
  const completeCacheIds = toStringSet(entry.completes);
  const cachingCacheIds = toStringSet(entry.cachings);
  const paths = new Set<string>();
  candidates.forEach((candidate) => {
    const cacheId = extractHlsCacheId(candidate);
    if (!cacheId || !cacheId.toLowerCase().startsWith(normalizedVideoId)) {
      return;
    }

    const cache = entry.caches?.[cacheId];
    const hasStatusInfo =
      completeCacheIds.size > 0 ||
      cachingCacheIds.size > 0 ||
      typeof cache?.complete === "boolean" ||
      typeof cache?.caching === "boolean";
    const isComplete =
      completeCacheIds.has(cacheId) ||
      cache?.complete === true ||
      (hasStatusInfo &&
        cache?.caching === false &&
        !cachingCacheIds.has(cacheId));
    const isCaching =
      cachingCacheIds.has(cacheId) || cache?.caching === true || !hasStatusInfo;

    if (isComplete) {
      paths.add(`/cache/ajax_rm?${cacheId}`);
      return;
    }
    if (isCaching) {
      paths.add(`/cache/ajax_rmtmp?${cacheId}`);
    }
  });

  return [...paths];
};

export const removeCacheByPath = async (path: string): Promise<void> => {
  const response = await fetch(path, {
    cache: "no-store",
    credentials: "same-origin",
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const result = (await response.text()).trim();
  if (result !== "OK") {
    throw new Error(result || "empty response");
  }
};

export const handleCacheRemove = async (videoId: string): Promise<void> => {
  if (!videoId) return;
  const nicoCache = (window as Window & { NicoCache_nl: NicoCache_nlInterface })
    .NicoCache_nl;
  const videoTitle = nicoCache?.watch?.apiData?.video?.title || "";
  if (confirm("本当に削除しますか？: " + videoId + " " + videoTitle)) {
    try {
      const cacheInfo = await fetchCacheInfo(videoId);
      const paths = buildCacheRemovalPaths(videoId, cacheInfo);
      if (paths.length === 0) {
        window.logger.warn(
          "[video-util] 削除可能なHLSキャッシュが見つかりません",
          { videoId },
        );
        window.toastr?.warning?.("削除可能なHLSキャッシュが見つかりません");
        return;
      }

      const failedPaths: string[] = [];
      for (const path of paths) {
        try {
          await removeCacheByPath(path);
        } catch (error) {
          failedPaths.push(path);
          window.logger.warn("[video-util] キャッシュ削除リクエスト失敗", {
            path,
            error,
          });
        }
      }

      if (failedPaths.length > 0) {
        window.toastr?.error?.(
          `キャッシュ削除が一部失敗しました (${paths.length - failedPaths.length}/${paths.length})`,
        );
        return;
      }

      window.toastr?.success?.("キャッシュ削除を実行しました");
    } catch (error) {
      window.logger.error("[video-util] キャッシュ削除に失敗しました", error);
      window.toastr?.error?.("キャッシュ削除に失敗しました");
    }
  }
};

export function nicoruAll(): void {
  const videoElements = document.querySelectorAll("[data-video-id]");
  videoElements.forEach((element) => {
    const videoId = element.getAttribute("data-video-id");
    if (videoId) {
      // ニコる機能の実装（必要に応じて）
    }
  });
}
