import "@/types/global-types";
import type { IntegratedNicoData, NicoApiData } from "@/types/common-types";
import type {
  CacheEntry,
  CacheInfoResponse,
  MediaInfoResponse,
  ThumbInfo,
  ThumbOwnerInfo,
  ThumbTagInfo,
} from "@/types/movie-info-types";

const CACHE_INFO_ENDPOINT = "https://www.nicovideo.jp/cache/info/v2?";
const THUMB_INFO_ENDPOINT = "https://ext.nicovideo.jp/api/getthumbinfo/";
const MEDIA_INFO_ENDPOINT = "https://www.nicovideo.jp/cache/mediainfo?";

const toErrorMessage = (error: unknown): string => {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return String(error);
};

const parseBoolean = (value: string | null | undefined): boolean =>
  value === "1" || value === "true";

const parseNumber = (value: string | null | undefined): number => {
  if (typeof value !== "string") {
    return 0;
  }
  const parsed = Number(value.replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeText = (value: string | null | undefined): string =>
  (value ?? "").trim();

const parseThumbOwner = (
  thumbElement: Element,
  prefix: "user" | "ch",
): ThumbOwnerInfo | undefined => {
  const idSelector = prefix === "user" ? "user_id" : "ch_id";
  const nameSelector = prefix === "user" ? "user_nickname" : "ch_name";
  const iconSelector = prefix === "user" ? "user_icon_url" : "ch_icon_url";

  const id = normalizeText(thumbElement.querySelector(idSelector)?.textContent);
  const nickname = normalizeText(
    thumbElement.querySelector(nameSelector)?.textContent,
  );
  const iconUrl = normalizeText(
    thumbElement.querySelector(iconSelector)?.textContent,
  );

  if (!id && !nickname && !iconUrl) {
    return undefined;
  }

  return {
    id,
    nickname,
    iconUrl,
  };
};

const parseThumbInfoXml = (xmlText: string): ThumbInfo => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, "application/xml");

  const parserError = doc.querySelector("parsererror");
  if (parserError) {
    throw new Error("サムネイルAPIのレスポンス解析に失敗しました");
  }

  const root = doc.querySelector("nicovideo_thumb_response");
  if (!root) {
    throw new Error("サムネイルAPIのレスポンス形式が不正です");
  }

  const status = root.getAttribute("status") === "ok" ? "ok" : "fail";
  if (status === "fail") {
    const description =
      root.querySelector("error > description")?.textContent ?? "不明なエラー";
    throw new Error("サムネイルAPIエラー: " + description);
  }

  const thumb = root.querySelector("thumb");
  if (!thumb) {
    throw new Error("サムネイル情報が見つかりませんでした");
  }

  const tags: ThumbTagInfo[] = Array.from(
    thumb.querySelectorAll("tags > tag"),
    (tagElement) => ({
      name: normalizeText(tagElement.textContent),
      locked: tagElement.getAttribute("lock") === "1",
    }),
  ).filter((tag) => Boolean(tag.name));

  const rawEntries: Record<string, string> = {};
  Array.from(thumb.children).forEach((child) => {
    rawEntries[child.tagName] = normalizeText(child.textContent);
  });

  return {
    status: "ok",
    videoId: normalizeText(thumb.querySelector("video_id")?.textContent),
    title: normalizeText(thumb.querySelector("title")?.textContent),
    description: normalizeText(thumb.querySelector("description")?.textContent),
    thumbnailUrl: normalizeText(
      thumb.querySelector("thumbnail_url")?.textContent,
    ),
    firstRetrieve: normalizeText(
      thumb.querySelector("first_retrieve")?.textContent,
    ),
    length: normalizeText(thumb.querySelector("length")?.textContent),
    movieType: normalizeText(thumb.querySelector("movie_type")?.textContent),
    viewCounter: parseNumber(thumb.querySelector("view_counter")?.textContent),
    commentNum: parseNumber(thumb.querySelector("comment_num")?.textContent),
    mylistCounter: parseNumber(
      thumb.querySelector("mylist_counter")?.textContent,
    ),
    lastResBody: normalizeText(
      thumb.querySelector("last_res_body")?.textContent,
    ),
    watchUrl: normalizeText(thumb.querySelector("watch_url")?.textContent),
    thumbType: normalizeText(thumb.querySelector("thumb_type")?.textContent),
    embeddable: parseBoolean(thumb.querySelector("embeddable")?.textContent),
    noLivePlay: parseBoolean(thumb.querySelector("no_live_play")?.textContent),
    tags,
    genre: normalizeText(thumb.querySelector("genre")?.textContent),
    cache: normalizeText(thumb.querySelector("cache")?.textContent) || null,
    owner: parseThumbOwner(thumb, "user"),
    channel: parseThumbOwner(thumb, "ch"),
    raw: rawEntries,
  };
};

export const fetchCacheInfo = async (videoId: string): Promise<CacheEntry> => {
  const url = CACHE_INFO_ENDPOINT + encodeURIComponent(videoId);
  try {
    const response = await window.commonHelper.fetchRequest(url);
    if (!response.ok) {
      throw new Error("Cache info API error: " + response.status);
    }
    const json = (await response.json()) as CacheInfoResponse;
    const entry = json?.[videoId];
    if (!entry) {
      throw new Error("指定された動画IDのキャッシュ情報が見つかりませんでした");
    }
    return entry;
  } catch (error: unknown) {
    const message = toErrorMessage(error);
    window.logger?.error?.("[movie-info] cache info fetch failed", message);
    throw new Error(message);
  }
};

export const fetchThumbInfo = async (videoId: string): Promise<ThumbInfo> => {
  const url = THUMB_INFO_ENDPOINT + encodeURIComponent(videoId);
  try {
    const response = await window.commonHelper.fetchRequest(url);
    if (!response.ok) {
      throw new Error("Thumb info API error: " + response.status);
    }
    const xmlText = await response.text();
    return parseThumbInfoXml(xmlText);
  } catch (error: unknown) {
    const message = toErrorMessage(error);
    window.logger?.error?.("[movie-info] thumb info fetch failed", message);
    throw new Error(message);
  }
};

export const fetchMediaInfo = async (
  videoId: string,
): Promise<MediaInfoResponse> => {
  const url = MEDIA_INFO_ENDPOINT + encodeURIComponent(videoId);
  try {
    const response = await window.commonHelper.fetchRequest(url);
    if (!response.ok) {
      throw new Error("MediaInfo API error: " + response.status);
    }
    const rawText = await response.text();
    const trimmed = rawText.trim();
    if (!trimmed) {
      throw new Error("MediaInfoのレスポンスが空でした");
    }
    const data = JSON.parse(trimmed) as MediaInfoResponse;
    if (Array.isArray(data)) {
      return data.map((item) => ({ ...item }));
    }
    return { ...data };
  } catch (error: unknown) {
    const message = toErrorMessage(error);
    window.logger?.error?.("[movie-info] MediaInfo fetch failed", message);
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
    const data = await window.commonHelper.fetchNicoDataWithComments(videoId);
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
