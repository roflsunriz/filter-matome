"use strict";

import "@/types/global.d.ts";
import { VideoOperation, SimpleVideoInfo } from "@/types/video-types";
import { NicoCache_nlInterface } from "@/types/global-types";
import {
  buildCacheRemovalPaths,
  fetchCacheInfo,
  removeCacheByPath,
} from "@/common/cache-removal.js";

export {
  buildCacheRemovalPaths,
  fetchCacheInfo,
  removeCacheByPath,
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
