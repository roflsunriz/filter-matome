"use strict";

import "@/types/global.d.ts";
import {
  VideoOperation,
  SimpleVideoInfo,
  ExtendedApiData,
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
      return handleCacheRemove(videoId);
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
      ? (nicoCache?.watch?.apiData as ExtendedApiData)?.comment?.threads?.find(
          (v: { isDefaultPostTarget?: boolean }) =>
            v.isDefaultPostTarget === true,
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

export const handleCacheRemove = (videoId: string): void => {
  if (!videoId) return;
  const nicoCache = (window as Window & { NicoCache_nl: NicoCache_nlInterface })
    .NicoCache_nl;
  const videoTitle = nicoCache?.watch?.apiData?.video?.title || "";
  if (confirm("本当に削除しますか？: " + videoId + " " + videoTitle)) {
    const unknownCache: unknown = nicoCache;
    if (
      unknownCache &&
      typeof unknownCache === "object" &&
      "get" in unknownCache &&
      typeof (unknownCache as { get: unknown }).get === "function"
    ) {
      const getFn = (unknownCache as { get: (path: string) => void }).get;
      const path = "/cache/ajax_rmall?" + encodeURIComponent(videoId);
      getFn(path);
    } else {
      window.logger.warn("[video-util] NicoCache_nl.get が利用できません");
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
