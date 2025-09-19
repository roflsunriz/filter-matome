
import type { CacheInfoResponse } from '@/types/video-types.js';

type CacheInfoEntry = {
  preferred?: unknown;
  caches?: unknown;
  completes?: unknown;
  [key: string]: unknown;
};

const WATCH_HOST_PATTERN = /\.nicovideo\.jp$/;
const CACHE_INFO_ENDPOINT = 'https://www.nicovideo.jp/cache/info/v2?';

const hasCompletedCache = (entry: CacheInfoEntry, cacheId: string, completesSet: Set<string>): boolean => {
  if (!cacheId) {
    return false;
  }

  if (completesSet.has(cacheId)) {
    return true;
  }

  const cachesValue = entry.caches;
  if (cachesValue && typeof cachesValue === 'object' && !Array.isArray(cachesValue)) {
    const cacheRecord = cachesValue as Record<string, unknown>;
    const cache = cacheRecord[cacheId];
    if (cache && typeof cache === 'object') {
      const completeValue = (cache as { complete?: unknown }).complete;
      if (completeValue === true) {
        return true;
      }
    }
  }

  return false;
};

const existsCompletedCache = (entry: CacheInfoEntry): boolean => {
  const completesValue = entry.completes;
  const completes = Array.isArray(completesValue)
    ? completesValue.filter((value): value is string => typeof value === 'string')
    : [];
  const completesSet = new Set(completes);

  const preferredValue = entry.preferred;
  const preferred = typeof preferredValue === 'string' ? preferredValue : '';
  if (preferred && hasCompletedCache(entry, preferred, completesSet)) {
    return true;
  }

  if (completes.length > 0) {
    for (const cacheId of completes) {
      if (hasCompletedCache(entry, cacheId, completesSet)) {
        return true;
      }
    }
  }

  const cachesValue = entry.caches;
  if (cachesValue && typeof cachesValue === 'object' && !Array.isArray(cachesValue)) {
    const cacheRecord = cachesValue as Record<string, unknown>;
    return Object.keys(cacheRecord).some(cacheId => hasCompletedCache(entry, cacheId, completesSet));
  }

  return false;
};

const hasCacheForVideo = async (videoId: string): Promise<boolean> => {
  try {
    const response = await fetch(`${CACHE_INFO_ENDPOINT}${encodeURIComponent(videoId)}`);
    if (!response || !response.ok) {
      window.logger.info('キャッシュ情報取得に失敗したためローカルプレイヤーへの遷移をスキップします', {
        videoId,
        status: response ? response.status : 'no-response'
      });
      return false;
    }

    const jsonUnknown: unknown = await response.json();
    const data = jsonUnknown as CacheInfoResponse | null;
    if (!data || !(videoId in data)) {
      return false;
    }

    const entryUnknown = data[videoId] as unknown;
    if (!entryUnknown || typeof entryUnknown !== 'object') {
      return false;
    }

    const entry = entryUnknown as CacheInfoEntry;
    return existsCompletedCache(entry);
  } catch (error) {
    window.logger.warn('キャッシュ情報取得中にエラーが発生したためローカルプレイヤーへの遷移をスキップします', error);
    return false;
  }
};

const isWatchPage = (): boolean => {
  return WATCH_HOST_PATTERN.test(window.location.hostname) && window.location.pathname.startsWith('/watch/');
};

const buildStandaloneUrl = (videoId: string): string => {
  const params = new URLSearchParams();
  params.set('videoId', videoId);
  return '/local/features/dist/src/video-player/standalone/index.html?' + params.toString();
};

export const initWatchPageRouter = async (): Promise<void> => {
  if (!isWatchPage()) {
    return;
  }

  try {
    const result = await window.commonHelper.fetchWatchPage();
    if (!result) {
      return;
    }

    const apiData = result.apiData as Record<string, unknown>;
    const video = apiData.video as Record<string, unknown> | undefined;
    if (!video) {
      return;
    }

    const videoId = typeof video.id === 'string' ? video.id : null;
    const watchable = typeof video.watchableUserTypeForPayment === 'string'
      ? video.watchableUserTypeForPayment
      : (video as { watchableUserType?: string }).watchableUserType;

    if (!videoId || !watchable || watchable === 'all') {
      return;
    }

    const cacheExists = await hasCacheForVideo(videoId);
    if (!cacheExists) {
      window.logger.info('有料動画ですがキャッシュが存在しないためローカルプレイヤーへの遷移をスキップします', videoId);
      return;
    }

    const targetUrl = buildStandaloneUrl(videoId);
    if (window.location.pathname === '/local/features/dist/src/video-player/standalone/index.html') {
      return;
    }

    window.logger.info('有料動画かつキャッシュが存在するためローカルプレイヤーへ遷移します', videoId);
    window.location.href = targetUrl;
  } catch (error) {
    window.logger.warn('有料動画判定に失敗したため遷移をスキップします', error);
  }
};
