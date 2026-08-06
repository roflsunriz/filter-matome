import type {
  ThumbInfo,
  ThumbOwnerInfo,
  ThumbTagInfo,
} from "@/types/movie-info-types";

export const EXT_THUMB_INFO_ENDPOINT =
  "https://ext.nicovideo.jp/api/getthumbinfo/";
export const WATCH_VIDEO_INFO_ENDPOINT =
  "https://www.nicovideo.jp/api/watch/v3/";
export const WATCH_VIDEO_INFO_GUEST_ENDPOINT =
  "https://www.nicovideo.jp/api/watch/v3_guest/";

export type VideoInfoSource = "ext-thumb" | "watch-api";

export interface VideoInfoRequestOptions {
  method?: string;
  headers?: Record<string, string>;
}

export type VideoInfoFetcher = (
  url: string,
  options?: VideoInfoRequestOptions,
) => Promise<Response>;

export class NicoVideoInfoError extends Error {
  public readonly code: string;
  public readonly source?: VideoInfoSource;

  constructor(message: string, code = "UNKNOWN", source?: VideoInfoSource) {
    super(message);
    this.name = "NicoVideoInfoError";
    this.code = code;
    this.source = source;
  }
}

export const isNicoVideoInfoError = (
  error: unknown,
): error is NicoVideoInfoError => error instanceof NicoVideoInfoError;

const ACTION_TRACK_CHARACTERS =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

const defaultFetcher: VideoInfoFetcher = (url, options) => fetch(url, options);

const normalizeText = (value: string | null | undefined): string =>
  (value ?? "").trim();

const asRecord = (value: unknown): Record<string, unknown> | undefined =>
  value !== null && typeof value === "object"
    ? (value as Record<string, unknown>)
    : undefined;

const SENSITIVE_RAW_KEY_PATTERN =
  /(?:access[\s_-]?right|authorization|(?:^|[_-])(token|secret|cookie|password)(?:$|[_-])|edit[\s_-]?key)/i;
const RAW_QUERY_SECRET_PATTERN = /([?&](?:key|token|access_token)=)[^&]+/gi;

const sanitizeRaw = (value: unknown): unknown => {
  if (typeof value === "string") {
    return value.replace(RAW_QUERY_SECRET_PATTERN, "$1[redacted]");
  }
  if (Array.isArray(value)) return value.map(sanitizeRaw);
  const record = asRecord(value);
  if (!record) return value;

  return Object.entries(record).reduce<Record<string, unknown>>(
    (result, [key, child]) => {
      if (!SENSITIVE_RAW_KEY_PATTERN.test(key)) {
        result[key] = sanitizeRaw(child);
      }
      return result;
    },
    {},
  );
};

const getString = (
  record: Record<string, unknown> | undefined,
  key: string,
): string | undefined => {
  const value = record?.[key];
  if (typeof value === "string") return normalizeText(value);
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  return undefined;
};

const getFirstString = (
  record: Record<string, unknown> | undefined,
  keys: string[],
): string | undefined => {
  for (const key of keys) {
    const value = getString(record, key);
    if (value) return value;
  }
  return undefined;
};

const getNumber = (
  record: Record<string, unknown> | undefined,
  key: string,
): number | undefined => {
  const value = record?.[key];
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/,/g, ""));
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
};

const getBoolean = (
  record: Record<string, unknown> | undefined,
  key: string,
): boolean | undefined => {
  const value = record?.[key];
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    if (value === "1" || value.toLowerCase() === "true") return true;
    if (value === "0" || value.toLowerCase() === "false") return false;
  }
  return undefined;
};

const parseBooleanText = (value: string | undefined): boolean => {
  const normalized = value?.toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes";
};

const formatDuration = (seconds: number | undefined): string => {
  if (seconds === undefined || seconds < 0) return "";
  const wholeSeconds = Math.floor(seconds);
  const hours = Math.floor(wholeSeconds / 3600);
  const minutes = Math.floor((wholeSeconds % 3600) / 60);
  const remainder = wholeSeconds % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
  }
  return `${minutes}:${String(remainder).padStart(2, "0")}`;
};

const createActionTrackId = (): string => {
  let randomPart = "";
  for (let index = 0; index < 10; index++) {
    const randomIndex = Math.floor(
      Math.random() * ACTION_TRACK_CHARACTERS.length,
    );
    randomPart += ACTION_TRACK_CHARACTERS[randomIndex] ?? "0";
  }
  return `${randomPart}_${Date.now()}`;
};

const getXmlElement = (
  parent: ParentNode,
  names: string[],
): Element | undefined => {
  const normalizedNames = new Set(names.map((name) => name.toLowerCase()));
  return Array.from(parent.querySelectorAll("*")).find((element) => {
    const localName = (element.localName || element.tagName).toLowerCase();
    return normalizedNames.has(localName);
  });
};

const getXmlText = (parent: ParentNode, names: string[]): string | undefined =>
  normalizeText(getXmlElement(parent, names)?.textContent);

const getXmlAttribute = (
  element: Element | undefined,
  name: string,
): string | undefined => normalizeText(element?.getAttribute(name));

const parseNumberText = (value: string | undefined): number | undefined => {
  if (!value) return undefined;
  const parsed = Number(value.replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : undefined;
};

const normalizeDuration = (value: unknown): string => {
  if (typeof value === "number") return formatDuration(value);
  if (typeof value !== "string") return "";
  const trimmed = normalizeText(value);
  if (!trimmed) return "";
  if (trimmed.includes(":")) return trimmed;
  const seconds = parseNumberText(trimmed);
  return seconds === undefined ? trimmed : formatDuration(seconds);
};

const parseXmlOwner = (
  thumb: Element,
  prefix: "user" | "ch",
): ThumbOwnerInfo | undefined => {
  const id = getXmlText(thumb, [prefix === "user" ? "user_id" : "ch_id"]);
  const nickname = getXmlText(thumb, [
    prefix === "user" ? "user_nickname" : "ch_name",
  ]);
  const iconUrl = getXmlText(thumb, [
    prefix === "user" ? "user_icon_url" : "ch_icon_url",
  ]);
  if (!id && !nickname && !iconUrl) return undefined;
  return { id: id ?? "", nickname: nickname ?? "", iconUrl: iconUrl ?? "" };
};

const parseXmlTags = (thumb: Element): ThumbTagInfo[] =>
  Array.from(thumb.querySelectorAll("*")).reduce<ThumbTagInfo[]>(
    (tags, element) => {
      const localName = (element.localName || element.tagName).toLowerCase();
      if (localName !== "tag") return tags;
      const name = normalizeText(element.textContent);
      if (!name) return tags;
      const lock = element.getAttribute("lock")?.toLowerCase();
      tags.push({ name, locked: lock === "1" || lock === "true" });
      return tags;
    },
    [],
  );

const parseXmlRaw = (thumb: Element): Record<string, unknown> => {
  const raw: Record<string, unknown> = {};
  Array.from(thumb.children).forEach((child) => {
    const key = (child.localName || child.tagName).toString();
    raw[key] = normalizeText(child.textContent);
  });
  return raw;
};

const parseExtThumbXml = (
  payload: string,
  videoId: string,
  source: VideoInfoSource,
): ThumbInfo => {
  const document = new DOMParser().parseFromString(payload, "application/xml");
  if (document.querySelector("parsererror")) {
    throw new NicoVideoInfoError(
      "動画情報APIのXMLレスポンスを解析できませんでした",
      "INVALID_RESPONSE",
      source,
    );
  }

  const root = document.documentElement;
  if (!root) {
    throw new NicoVideoInfoError(
      "動画情報APIのXMLレスポンスが空でした",
      "INVALID_RESPONSE",
      source,
    );
  }

  const status = getXmlAttribute(root, "status")?.toLowerCase();
  if (status !== "ok") {
    const code = getXmlText(root, ["code"]) ?? "UNKNOWN";
    const description =
      getXmlText(root, ["description"]) ?? "動画情報を取得できませんでした";
    throw new NicoVideoInfoError(description, code, source);
  }

  const thumb = getXmlElement(root, ["thumb"]);
  if (!thumb) {
    throw new NicoVideoInfoError(
      "動画情報APIのthumb要素が見つかりませんでした",
      "INVALID_RESPONSE",
      source,
    );
  }

  const tags = parseXmlTags(thumb);
  return {
    status: "ok",
    videoId: getXmlText(thumb, ["video_id"]) ?? videoId,
    title: getXmlText(thumb, ["title"]) ?? "",
    description: getXmlText(thumb, ["description"]) ?? "",
    thumbnailUrl: getXmlText(thumb, ["thumbnail_url"]) ?? "",
    firstRetrieve: getXmlText(thumb, ["first_retrieve"]) ?? "",
    length: normalizeDuration(getXmlText(thumb, ["length"])),
    movieType: getXmlText(thumb, ["movie_type"]) ?? "",
    viewCounter: parseNumberText(getXmlText(thumb, ["view_counter"])) ?? 0,
    commentNum: parseNumberText(getXmlText(thumb, ["comment_num"])) ?? 0,
    mylistCounter: parseNumberText(getXmlText(thumb, ["mylist_counter"])) ?? 0,
    lastResBody: getXmlText(thumb, ["last_res_body"]) ?? "",
    watchUrl: getXmlText(thumb, ["watch_url"]) ?? "",
    thumbType: getXmlText(thumb, ["thumb_type"]) ?? "",
    embeddable: parseBooleanText(getXmlText(thumb, ["embeddable"])),
    noLivePlay: parseBooleanText(getXmlText(thumb, ["no_live_play"])),
    tags,
    isR18: tags.some((tag) => /r[-_ ]?18/i.test(tag.name)),
    genre: getXmlText(thumb, ["genre"]) ?? "",
    cache: getXmlText(thumb, ["cache"]) || null,
    owner: parseXmlOwner(thumb, "user"),
    channel: parseXmlOwner(thumb, "ch"),
    raw: sanitizeRaw(parseXmlRaw(thumb)) as Record<string, unknown>,
    source,
  };
};

const parseJsonTags = (tagRecord: Record<string, unknown> | undefined) => {
  const items = tagRecord?.items;
  if (!Array.isArray(items)) return [];
  return items.reduce<ThumbTagInfo[]>((tags, item) => {
    if (typeof item === "string") {
      const name = normalizeText(item);
      if (name) tags.push({ name, locked: false });
      return tags;
    }
    const record = asRecord(item);
    const name = getString(record, "name");
    if (name) {
      tags.push({ name, locked: getBoolean(record, "isLocked") === true });
    }
    return tags;
  }, []);
};

const parseJsonOwner = (
  record: Record<string, unknown> | undefined,
): ThumbOwnerInfo | undefined => {
  const id = getString(record, "id");
  const nickname = getFirstString(record, ["nickname", "name"]);
  const iconUrl = getString(record, "iconUrl");
  if (!id && !nickname && !iconUrl) return undefined;
  return { id: id ?? "", nickname: nickname ?? "", iconUrl: iconUrl ?? "" };
};

const parseJsonChannel = (
  record: Record<string, unknown> | undefined,
): ThumbOwnerInfo | undefined => {
  const owner = parseJsonOwner(record);
  const thumbnail = asRecord(record?.thumbnail);
  if (!owner && !thumbnail) return undefined;
  return {
    id: owner?.id ?? "",
    nickname: owner?.nickname ?? "",
    iconUrl:
      owner?.iconUrl || getFirstString(thumbnail, ["url", "smallUrl"]) || "",
  };
};

const parseWatchApiData = (
  data: Record<string, unknown>,
  videoId: string,
  source: VideoInfoSource,
): ThumbInfo => {
  const video = asRecord(data.video);
  if (!video) {
    throw new NicoVideoInfoError(
      "動画情報APIのvideo要素が見つかりませんでした",
      "INVALID_RESPONSE",
      source,
    );
  }

  if (getBoolean(video, "isDeleted") === true) {
    throw new NicoVideoInfoError("削除された動画です", "DELETED", source);
  }
  if (getBoolean(video, "isPrivate") === true) {
    throw new NicoVideoInfoError("非公開動画です", "PRIVATE", source);
  }

  const count = asRecord(video.count);
  const thumbnail = asRecord(video.thumbnail);
  const channel = parseJsonChannel(asRecord(data.channel));
  const tags = parseJsonTags(asRecord(data.tag));
  const durationValue = video.duration;
  const duration = normalizeDuration(durationValue);

  return {
    status: "ok",
    videoId: getFirstString(video, ["id", "videoId"]) ?? videoId,
    title: getString(video, "title") ?? "",
    description: getString(video, "description") ?? "",
    thumbnailUrl: getFirstString(thumbnail, ["url", "player", "ogp"]) ?? "",
    firstRetrieve: getString(video, "registeredAt") ?? "",
    length: duration,
    movieType: getFirstString(video, ["contentType", "type"]) ?? "",
    viewCounter: getNumber(count, "view") ?? 0,
    commentNum: getNumber(count, "comment") ?? 0,
    mylistCounter: getNumber(count, "mylist") ?? 0,
    lastResBody: "",
    watchUrl: `https://www.nicovideo.jp/watch/${getFirstString(video, ["id", "videoId"]) ?? videoId}`,
    thumbType: getString(video, "contentType") ?? "",
    embeddable: getBoolean(video, "isEmbedPlayerAllowed") !== false,
    noLivePlay: false,
    tags,
    isR18:
      getBoolean(asRecord(data.tag), "hasR18Tag") === true ||
      tags.some((tag) => /r[-_ ]?18/i.test(tag.name)),
    genre: getString(asRecord(data.genre), "label") ?? "",
    cache: null,
    owner: parseJsonOwner(asRecord(data.owner)),
    channel,
    raw: sanitizeRaw(data) as Record<string, unknown>,
    source,
  };
};

const parseLegacyJsonThumb = (
  thumb: Record<string, unknown>,
  videoId: string,
  source: VideoInfoSource,
): ThumbInfo => {
  const tagsValue = thumb.tags;
  const tags = Array.isArray(tagsValue)
    ? tagsValue.reduce<ThumbTagInfo[]>((result, item) => {
        const record = asRecord(item);
        const name =
          typeof item === "string"
            ? normalizeText(item)
            : getString(record, "name");
        if (name) {
          result.push({
            name,
            locked:
              getBoolean(record, "locked") === true ||
              getBoolean(record, "isLocked") === true,
          });
        }
        return result;
      }, [])
    : [];
  const owner = parseJsonOwner({
    id: thumb.user_id,
    nickname: thumb.user_nickname,
    iconUrl: thumb.user_icon_url,
  });
  const channel = parseJsonChannel({
    id: thumb.ch_id,
    name: thumb.ch_name,
    iconUrl: thumb.ch_icon_url,
  });
  return {
    status: "ok",
    videoId: getFirstString(thumb, ["video_id", "id"]) ?? videoId,
    title: getString(thumb, "title") ?? "",
    description: getString(thumb, "description") ?? "",
    thumbnailUrl: getString(thumb, "thumbnail_url") ?? "",
    firstRetrieve: getString(thumb, "first_retrieve") ?? "",
    length: normalizeDuration(thumb.length),
    movieType: getString(thumb, "movie_type") ?? "",
    viewCounter: getNumber(thumb, "view_counter") ?? 0,
    commentNum: getNumber(thumb, "comment_num") ?? 0,
    mylistCounter: getNumber(thumb, "mylist_counter") ?? 0,
    lastResBody: getString(thumb, "last_res_body") ?? "",
    watchUrl: getString(thumb, "watch_url") ?? "",
    thumbType: getString(thumb, "thumb_type") ?? "",
    embeddable: getBoolean(thumb, "embeddable") === true,
    noLivePlay: getBoolean(thumb, "no_live_play") === true,
    tags,
    isR18: tags.some((tag) => /r[-_ ]?18/i.test(tag.name)),
    genre: getString(thumb, "genre") ?? "",
    cache: getString(thumb, "cache") || null,
    owner,
    channel,
    raw: thumb,
    source,
  };
};

const parseJsonPayload = (
  payload: string,
  videoId: string,
  source: VideoInfoSource,
): ThumbInfo => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(payload) as unknown;
  } catch {
    throw new NicoVideoInfoError(
      "動画情報APIのJSONレスポンスを解析できませんでした",
      "INVALID_RESPONSE",
      source,
    );
  }

  const root = asRecord(parsed);
  if (!root) {
    throw new NicoVideoInfoError(
      "動画情報APIのJSONレスポンスが不正です",
      "INVALID_RESPONSE",
      source,
    );
  }

  const meta = asRecord(root.meta);
  const data = asRecord(root.data) ?? root;
  const responseStatus = getNumber(meta, "status") ?? getNumber(root, "status");
  if (responseStatus !== undefined && responseStatus >= 400) {
    const errorCode =
      getString(meta, "errorCode") ??
      getFirstString(data, ["errorCode", "reasonCode"]) ??
      `HTTP_${responseStatus}`;
    throw new NicoVideoInfoError(
      getFirstString(meta, ["errorMessage", "errorCode"]) ??
        getFirstString(data, ["message", "reasonCode", "errorCode"]) ??
        "動画情報を取得できませんでした",
      errorCode,
      source,
    );
  }

  if (getString(root, "status")?.toLowerCase() === "fail") {
    const error = asRecord(root.error);
    const code =
      getFirstString(error, ["code", "errorCode"]) ??
      getFirstString(root, ["code", "errorCode"]) ??
      "UNKNOWN";
    const message =
      getFirstString(error, ["description", "message"]) ??
      getFirstString(root, ["description", "message"]) ??
      "動画情報を取得できませんでした";
    throw new NicoVideoInfoError(message, code, source);
  }

  if (asRecord(data.video)) {
    return parseWatchApiData(data, videoId, source);
  }

  const thumb =
    asRecord(data.thumb) ??
    asRecord(root.thumb) ??
    (getString(root, "title") || getString(root, "video_id")
      ? root
      : undefined);
  if (thumb) return parseLegacyJsonThumb(thumb, videoId, source);

  throw new NicoVideoInfoError(
    "動画情報APIのJSONレスポンスに対応する動画情報がありません",
    "INVALID_RESPONSE",
    source,
  );
};

export const parseVideoInfoPayload = (
  payload: string,
  videoId: string,
  source: VideoInfoSource = "ext-thumb",
): ThumbInfo => {
  const trimmed = payload.trim();
  if (!trimmed) {
    throw new NicoVideoInfoError(
      "動画情報APIのレスポンスが空でした",
      "INVALID_RESPONSE",
      source,
    );
  }
  return trimmed.startsWith("<")
    ? parseExtThumbXml(trimmed, videoId, source)
    : parseJsonPayload(trimmed, videoId, source);
};

const requestAndParse = async (
  url: string,
  videoId: string,
  source: VideoInfoSource,
  fetcher: VideoInfoFetcher,
  options?: VideoInfoRequestOptions,
): Promise<ThumbInfo> => {
  let response: Response;
  try {
    response = await fetcher(url, options);
  } catch (error) {
    throw new NicoVideoInfoError(
      error instanceof Error
        ? error.message
        : "動画情報APIへの接続に失敗しました",
      "NETWORK_ERROR",
      source,
    );
  }

  let payload: string;
  try {
    payload = await response.text();
  } catch (error) {
    throw new NicoVideoInfoError(
      error instanceof Error
        ? error.message
        : "動画情報APIのレスポンス読み込みに失敗しました",
      "NETWORK_ERROR",
      source,
    );
  }
  if (!response.ok) {
    try {
      parseVideoInfoPayload(payload, videoId, source);
    } catch (error) {
      if (isNicoVideoInfoError(error)) throw error;
    }
    throw new NicoVideoInfoError(
      `動画情報APIエラー: ${response.status}`,
      `HTTP_${response.status}`,
      source,
    );
  }
  return parseVideoInfoPayload(payload, videoId, source);
};

const chooseFinalError = (
  errors: unknown[],
  videoId: string,
): NicoVideoInfoError => {
  const structuredErrors = errors.filter(isNicoVideoInfoError);
  const usefulError = structuredErrors.find(
    (error) =>
      error.code !== "INVALID_RESPONSE" &&
      error.code !== "NETWORK_ERROR" &&
      !error.code.startsWith("HTTP_"),
  );
  if (usefulError) return usefulError;
  const firstStructuredError = structuredErrors[0];
  if (firstStructuredError) return firstStructuredError;
  const messages = errors
    .map((error) => (error instanceof Error ? error.message : String(error)))
    .filter(Boolean);
  return new NicoVideoInfoError(
    messages.length > 0
      ? `動画情報の取得に失敗しました (${videoId}): ${messages.join(" / ")}`
      : "動画情報の取得に失敗しました",
    "UNKNOWN",
  );
};

const fetchWatchVideoInfo = async (
  videoId: string,
  encodedVideoId: string,
  fetcher: VideoInfoFetcher,
): Promise<ThumbInfo> => {
  const actionTrackId = createActionTrackId();
  const query = `?actionTrackId=${encodeURIComponent(actionTrackId)}`;
  const options = {
    headers: {
      "X-Frontend-Id": "6",
      "X-Frontend-Version": "0",
    },
  };

  try {
    return await requestAndParse(
      WATCH_VIDEO_INFO_ENDPOINT + encodedVideoId + query,
      videoId,
      "watch-api",
      fetcher,
      options,
    );
  } catch (error) {
    const shouldUseGuest =
      isNicoVideoInfoError(error) &&
      (error.code === "UNAUTHORIZED" || error.code === "HTTP_401");
    if (!shouldUseGuest) throw error;
    return requestAndParse(
      WATCH_VIDEO_INFO_GUEST_ENDPOINT + encodedVideoId + query,
      videoId,
      "watch-api",
      fetcher,
      options,
    );
  }
};

export const fetchNicoVideoInfo = async (
  videoId: string,
  fetcher: VideoInfoFetcher = defaultFetcher,
): Promise<ThumbInfo> => {
  const encodedVideoId = encodeURIComponent(videoId);
  const errors: unknown[] = [];

  try {
    return await requestAndParse(
      EXT_THUMB_INFO_ENDPOINT + encodedVideoId,
      videoId,
      "ext-thumb",
      fetcher,
    );
  } catch (error) {
    errors.push(error);
  }

  try {
    return await fetchWatchVideoInfo(videoId, encodedVideoId, fetcher);
  } catch (error) {
    errors.push(error);
  }

  throw chooseFinalError(errors, videoId);
};
