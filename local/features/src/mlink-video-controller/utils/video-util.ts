"use strict";

import "@/types/global.d.ts";
import { VideoOperation, SimpleVideoInfo } from "@/types/video-types";
import { NicoCache_nlInterface } from "@/types/global-types";
import {
  getCacheRemovalNotice,
  removeCacheForVideo,
} from "@/common/cache-removal.js";

export {
  getCacheRemovalNotice,
  removeCacheForVideo,
} from "@/common/cache-removal.js";

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

export const handleCacheRemove = async (videoId: string): Promise<void> => {
  if (!videoId) return;
  const nicoCache = (window as Window & { NicoCache_nl: NicoCache_nlInterface })
    .NicoCache_nl;
  const videoTitle = nicoCache?.watch?.apiData?.video?.title || "";
  if (confirm("本当に削除しますか？: " + videoId + " " + videoTitle)) {
    try {
      const result = await removeCacheForVideo(videoId);
      const notice = getCacheRemovalNotice(result);
      window.logger.info("[video-util] NicoCache_nl削除API応答", result);
      window.toastr?.[notice.kind]?.(notice.message);
    } catch (error) {
      window.logger.error("[video-util] キャッシュ削除に失敗しました", error);
      window.toastr?.error?.(
        error instanceof Error
          ? error.message
          : "キャッシュの削除に失敗しました。",
      );
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
