"use strict";

import "../../types/global.d.ts"
import { VideoOperation, SimpleVideoInfo, ExtendedApiData, CacheInfoResponse } from '../../types/video-types';
import { NicoCache_nlInterface } from '../../types/global-types';

export const handleVideoOperation = (operation: VideoOperation, videoId: string): void => {
  switch (operation) {
    case 'cache_remove':
      return handleCacheRemove(videoId);
    default:
      throw new Error(`Unknown operation: ${operation}`);
  }
};

export const getVideoInfo = (): SimpleVideoInfo => {
  const nicoCache = (window as Window & { NicoCache_nl: NicoCache_nlInterface }).NicoCache_nl;
  const videoTitle = nicoCache?.watch?.apiData?.video ? 
    nicoCache.watch.apiData.video.title || "" : "";
    
  return {
    videoId: nicoCache?.watch?.apiData?.video?.id || "",
    threadId: nicoCache?.watch ? (nicoCache?.watch?.apiData as ExtendedApiData)?.comment?.threads?.find(
      (v: { isDefaultPostTarget?: boolean }) => v.isDefaultPostTarget === true
    )?.id || "" : "",
    title: videoTitle
  };
};

export const fetchCacheInfo = (videoId: string): Promise<CacheInfoResponse> => {
  return fetch(`https://www.nicovideo.jp/cache/info/v2?${videoId}`)
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    });
};

export const handleCacheRemove = (videoId: string): void => {
  
  if (!videoId) return;
  const nicoCache = (window as Window & { NicoCache_nl: NicoCache_nlInterface }).NicoCache_nl;
  const videoTitle = nicoCache?.watch?.apiData?.video?.title || '';
  if (confirm("本当に削除しますか？: " + videoId + " " + videoTitle)) {
    // NicoCache_nlのgetメソッドの型定義が存在しないため、anyを使用
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (nicoCache as any).get("/cache/ajax_rmall?" + videoId);
  }
};

export function nicoruAll(): void {
  const videoElements = document.querySelectorAll('[data-video-id]');
  videoElements.forEach((element) => {
    const videoId = element.getAttribute('data-video-id');
    if (videoId) {
      // ニコる機能の実装（必要に応じて）
      
    }
  });
} 