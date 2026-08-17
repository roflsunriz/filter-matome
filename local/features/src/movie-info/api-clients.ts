import "@/types/global-types";
import type { IntegratedNicoData, NicoApiData } from "@/types/common-types";
import type { GpacResponse, ThumbInfo } from "@/types/movie-info-types";
import type { CacheInfoEntry } from "@/types/cache-info-types";
import { fetchCacheInfoEntry } from "@/common/cache-info-api";
import {
  fetchNicoVideoInfo,
  type VideoInfoFetcher,
} from "@/common/video-info-api";

const GPAC_ENDPOINT =
  "https://nicocachenl.test/api/v1/extensions/filter-matome/gpac/";

const toErrorMessage = (error: unknown): string => {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return String(error);
};

export const fetchCacheInfo = async (
  videoId: string,
): Promise<CacheInfoEntry> => {
  try {
    return await fetchCacheInfoEntry(videoId, (url) =>
      window.commonHelper.fetchRequest(url),
    );
  } catch (error: unknown) {
    const message = toErrorMessage(error);
    window.logger?.error?.("[movie-info] cache info fetch failed", message);
    throw new Error(message);
  }
};

export const fetchThumbInfo = async (videoId: string): Promise<ThumbInfo> => {
  try {
    const fetcher: VideoInfoFetcher = (url, options) =>
      window.commonHelper.fetchRequest(url, options);
    return await fetchNicoVideoInfo(videoId, fetcher);
  } catch (error: unknown) {
    const message = toErrorMessage(error);
    window.logger?.error?.("[movie-info] thumb info fetch failed", message);
    throw new Error(message);
  }
};

export const fetchGpacInfo = async (videoId: string): Promise<GpacResponse> => {
  const url = GPAC_ENDPOINT + encodeURIComponent(videoId);
  try {
    const response = await window.commonHelper.fetchRequest(url);
    if (!response.ok) {
      throw new Error("GPAC API error: " + response.status);
    }
    const rawText = await response.text();
    const trimmed = rawText.trim();
    if (!trimmed) {
      throw new Error("GPACのレスポンスが空でした");
    }
    const data = JSON.parse(trimmed) as GpacResponse;
    return { ...data };
  } catch (error: unknown) {
    const message = toErrorMessage(error);
    window.logger?.error?.("[movie-info] GPAC fetch failed", message);
    throw new Error(message);
  }
};

export const fetchWatchApiData = async (
  videoId: string,
): Promise<NicoApiData> => {
  try {
    const result = await window.commonHelper.fetchWatchPage(videoId);
    if (!result || !result.apiData) {
      throw new Error("ウォッチページのapiDataが取得できませんでした");
    }
    return result.apiData;
  } catch (error: unknown) {
    const message = toErrorMessage(error);
    window.logger?.error?.("[movie-info] watch api fetch failed", message);
    throw new Error(message);
  }
};

export const fetchCommentsWithApi = async (
  videoId: string,
): Promise<IntegratedNicoData> => {
  try {
    const data = await window.commonHelper.fetchNicoDataWithComments(videoId, {
      bypassCommentFilter: true,
    });
    if (!data) {
      throw new Error("コメントデータが取得できませんでした");
    }
    return data;
  } catch (error: unknown) {
    const message = toErrorMessage(error);
    window.logger?.error?.("[movie-info] comment fetch failed", message);
    throw new Error(message);
  }
};
