import {
  createStandaloneLayout,
  type StandaloneLayout,
} from "@/video-player/standalone/layout";
import { StandalonePlayer } from "@/video-player/standalone/player";
import {
  formatNumber,
  formatDateTime,
  formatDuration,
  createStatItem,
  createAutoNextStatItem,
} from "@/video-player/standalone/utils";
import type { ApiData, NicoApiData } from "@/types/index";
import DOMPurify from "dompurify";

type RecordLike = Record<string, unknown>;

type OwnerDisplayData = {
  name: string;
  iconUrl?: string;
  linkUrl?: string;
};

type TagItemShape = {
  name?: string;
  isCategory?: boolean;
  isCategoryCandidate?: boolean;
  isLocked?: boolean;
};

const isRecord = (value: unknown): value is RecordLike => {
  return typeof value === "object" && value !== null;
};

const toOptionalString = (value: unknown): string | undefined => {
  return typeof value === "string" && value.trim().length > 0
    ? value
    : undefined;
};

const toOptionalNumber = (value: unknown): number | undefined => {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
};

const toOptionalBoolean = (value: unknown): boolean | undefined => {
  return typeof value === "boolean" ? value : undefined;
};

const ensureRecord = (value: unknown): RecordLike | undefined => {
  return isRecord(value) ? value : undefined;
};

const pickFirstString = (
  record: RecordLike | undefined,
  keys: string[],
): string | undefined => {
  if (!record) {
    return undefined;
  }
  for (const key of keys) {
    const candidate = toOptionalString(record[key]);
    if (candidate) {
      return candidate;
    }
  }
  return undefined;
};

const toSeriesReferenceForApi = (
  value: unknown,
): { id?: string; title?: string } | undefined => {
  const record = ensureRecord(value);
  if (!record) {
    return undefined;
  }
  const id = toOptionalString(record["id"]);
  const title = toOptionalString(record["title"]);
  if (!id && !title) {
    return undefined;
  }
  const result: { id?: string; title?: string } = {};
  if (id) {
    result.id = id;
  }
  if (title) {
    result.title = title;
  }
  return result;
};

const readString = (
  record: RecordLike | undefined,
  key: string,
): string | undefined => {
  if (!record) {
    return undefined;
  }
  return toOptionalString(record[key]);
};

const readBoolean = (
  record: RecordLike | undefined,
  key: string,
): boolean | undefined => {
  if (!record) {
    return undefined;
  }
  return toOptionalBoolean(record[key]);
};

const readNumber = (
  record: RecordLike | undefined,
  key: string,
): number | undefined => {
  if (!record) {
    return undefined;
  }
  return toOptionalNumber(record[key]);
};

const toOptionalId = (value: unknown): string | number | undefined => {
  if (typeof value === "string" && value.trim().length > 0) {
    return value;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  return undefined;
};

const toApiData = (source: NicoApiData, fallbackVideoId: string): ApiData => {
  const root = source as unknown as RecordLike;

  const videoRecord = ensureRecord(root["video"]) ?? {};
  const countRecord = ensureRecord(videoRecord["count"]);
  const thumbnailRecord = ensureRecord(videoRecord["thumbnail"]);

  const video: ApiData["video"] = {
    id: toOptionalString(videoRecord["id"]) ?? fallbackVideoId,
    title: toOptionalString(videoRecord["title"]) ?? "タイトル未取得",
    count: {
      view: readNumber(countRecord, "view") ?? 0,
      comment: readNumber(countRecord, "comment") ?? 0,
      mylist: readNumber(countRecord, "mylist") ?? 0,
      like: readNumber(countRecord, "like"),
    },
    thumbnail: {
      url:
        pickFirstString(thumbnailRecord, [
          "player",
          "ogp",
          "largeUrl",
          "middleUrl",
          "listingUrl",
          "url",
        ]) ?? "",
    },
    registeredAt: toOptionalString(videoRecord["registeredAt"]) ?? "",
    duration: toOptionalNumber(videoRecord["duration"]) ?? 0,
    description: toOptionalString(videoRecord["description"]),
    shortDescription: toOptionalString(videoRecord["shortDescription"]),
    likeCount: toOptionalNumber(videoRecord["likeCount"]),
    watchableUserTypeForPayment: toOptionalString(
      videoRecord["watchableUserTypeForPayment"],
    ),
  };

  const genreValue = videoRecord["genre"];
  if (typeof genreValue === "string" && genreValue.trim()) {
    video.genre = genreValue;
  } else if (isRecord(genreValue)) {
    const genre: { id?: string; label?: string } = {};
    const genreId = toOptionalString(genreValue["id"]);
    const genreLabel = toOptionalString(genreValue["label"]);
    if (genreId) {
      genre.id = genreId;
    }
    if (genreLabel) {
      genre.label = genreLabel;
    }
    if (Object.keys(genre).length > 0) {
      video.genre = genre;
    }
  } else {
    const topGenre = ensureRecord(root["genre"]);
    if (topGenre) {
      const topId =
        toOptionalString(topGenre["key"]) ?? toOptionalString(topGenre["id"]);
      const topLabel = toOptionalString(topGenre["label"]);
      if (topLabel || topId) {
        if (topLabel) {
          video.genre = { id: topId, label: topLabel };
        } else if (topId) {
          video.genre = topId;
        }
      }
    }
  }

  const ownerRecord = ensureRecord(root["owner"]);
  let owner: ApiData["owner"] | undefined;
  if (ownerRecord) {
    const nickname =
      readString(ownerRecord, "nickname") ??
      readString(ownerRecord, "name") ??
      "投稿者";
    const ownerId = toOptionalId(ownerRecord["id"]);
    const iconUrl =
      readString(ownerRecord, "iconUrl") ??
      readString(ownerRecord, "thumbnailUrl");
    const userPageUrl =
      readString(ownerRecord, "userPageUrl") ?? readString(ownerRecord, "url");
    const description = readString(ownerRecord, "description");
    owner = { nickname, iconUrl, userPageUrl, description };
    if (ownerId !== undefined) {
      owner.id = ownerId;
    }
  }

  const channelRecord = ensureRecord(root["channel"]);
  let channel: ApiData["channel"] | undefined;
  if (channelRecord) {
    const name = readString(channelRecord, "name");
    if (name) {
      const channelId = toOptionalId(channelRecord["id"]);
      const thumbnailFromChannel = ensureRecord(channelRecord["thumbnail"]);
      const iconUrl =
        readString(channelRecord, "iconUrl") ??
        pickFirstString(thumbnailFromChannel, ["url", "smallUrl"]);
      const url = readString(channelRecord, "url");
      channel = { name, iconUrl, url };
      if (channelId !== undefined) {
        channel.id = channelId;
      }
    }
  }

  const tagRecord = ensureRecord(root["tag"]);
  let tag: ApiData["tag"] | undefined;
  if (tagRecord) {
    const tagData: ApiData["tag"] = {};
    const rawItemsSource = tagRecord["items"];
    const itemsRaw: unknown[] = Array.isArray(rawItemsSource)
      ? rawItemsSource
      : [];
    const items: TagItemShape[] = [];
    for (const rawItem of itemsRaw) {
      if (!isRecord(rawItem)) {
        continue;
      }
      const name = readString(rawItem, "name");
      const isCategory = readBoolean(rawItem, "isCategory");
      const isCategoryCandidate = readBoolean(rawItem, "isCategoryCandidate");
      const isLocked = readBoolean(rawItem, "isLocked");
      const hasAnyTagValue =
        name !== undefined ||
        isCategory !== undefined ||
        isCategoryCandidate !== undefined ||
        isLocked !== undefined;
      if (!hasAnyTagValue) {
        continue;
      }
      const tagItem: TagItemShape = {};
      if (name) {
        tagItem.name = name;
      }
      if (isCategory !== undefined) {
        tagItem.isCategory = isCategory;
      }
      if (isCategoryCandidate !== undefined) {
        tagItem.isCategoryCandidate = isCategoryCandidate;
      }
      if (isLocked !== undefined) {
        tagItem.isLocked = isLocked;
      }
      items.push(tagItem);
    }
    if (items.length) {
      tagData.items = items;
    }
    const hasR18Tag = readBoolean(tagRecord, "hasR18Tag");
    if (hasR18Tag !== undefined) {
      tagData.hasR18Tag = hasR18Tag;
    }
    if (tagData.items || tagData.hasR18Tag !== undefined) {
      tag = tagData;
    }
  }

  const seriesRecord = ensureRecord(root["series"]);
  let series: ApiData["series"] | undefined;
  if (seriesRecord) {
    const resultSeries: ApiData["series"] = {};
    const seriesId = toOptionalId(seriesRecord["id"]);
    if (seriesId !== undefined) {
      resultSeries.id = seriesId;
    }
    const seriesTitle = readString(seriesRecord, "title");
    if (seriesTitle) {
      resultSeries.title = seriesTitle;
    }
    const seriesDescription = readString(seriesRecord, "description");
    if (seriesDescription) {
      resultSeries.description = seriesDescription;
    }
    const seriesThumbnail = readString(seriesRecord, "thumbnailUrl");
    if (seriesThumbnail) {
      resultSeries.thumbnailUrl = seriesThumbnail;
    }
    const seriesVideoBlock = ensureRecord(seriesRecord["video"]);
    const current =
      toSeriesReferenceForApi(seriesRecord["current"]) ??
      toSeriesReferenceForApi(seriesVideoBlock?.["first"]);
    const prev =
      toSeriesReferenceForApi(seriesRecord["prev"]) ??
      toSeriesReferenceForApi(seriesVideoBlock?.["prev"]);
    const next =
      toSeriesReferenceForApi(seriesRecord["next"]) ??
      toSeriesReferenceForApi(seriesVideoBlock?.["next"]);
    if (current) {
      resultSeries.current = current;
    }
    if (prev) {
      resultSeries.prev = prev;
    }
    if (next) {
      resultSeries.next = next;
    }
    if (Object.keys(resultSeries).length > 0) {
      series = resultSeries;
    }
  }

  const paymentRecord = ensureRecord(root["payment"]);
  let payment: ApiData["payment"] | undefined;
  if (paymentRecord) {
    const paymentVideo = ensureRecord(paymentRecord["video"]);
    if (paymentVideo) {
      const watchable = readString(paymentVideo, "watchableUserType");
      if (watchable) {
        payment = { video: { watchableUserType: watchable } };
        if (!video.watchableUserTypeForPayment) {
          video.watchableUserTypeForPayment = watchable;
        }
      }
    }
  }

  const commentRecord = ensureRecord(root["comment"]);
  let comment: ApiData["comment"] | undefined;
  if (commentRecord) {
    const commentData: ApiData["comment"] = {};
    const threadsSource = commentRecord["threads"];
    const threadsRaw: unknown[] = Array.isArray(threadsSource)
      ? threadsSource
      : [];
    const threads: NonNullable<ApiData["comment"]>["threads"] = [];
    for (const thread of threadsRaw) {
      if (!isRecord(thread)) {
        continue;
      }
      const id = readString(thread, "id");
      const fork = readString(thread, "fork");
      if (id && fork) {
        threads.push({ id, fork });
      }
    }
    if (threads.length) {
      commentData.threads = threads;
    }

    const nvCommentRaw = ensureRecord(commentRecord["nvComment"]);
    if (nvCommentRaw) {
      const server = readString(nvCommentRaw, "server");
      const params = ensureRecord(nvCommentRaw["params"]);
      const threadKeyRaw = nvCommentRaw["threadKey"];
      let threadKey: string | undefined;
      if (typeof threadKeyRaw === "string") {
        threadKey = threadKeyRaw;
      } else if (isRecord(threadKeyRaw)) {
        threadKey =
          readString(threadKeyRaw, "threadkey") ??
          readString(threadKeyRaw, "value");
      }
      if (server && params && threadKey) {
        commentData.nvComment = {
          server,
          params,
          threadKey,
        };
      }
    }

    if (commentData.threads || commentData.nvComment) {
      comment = commentData;
    }
  }

  if (!video.watchableUserTypeForPayment && payment?.video.watchableUserType) {
    video.watchableUserTypeForPayment = payment.video.watchableUserType;
  }

  const result: ApiData = { video };
  if (owner) {
    result.owner = owner;
  }
  if (channel) {
    result.channel = channel;
  }
  if (tag) {
    result.tag = tag;
  }
  if (series) {
    result.series = series;
  }
  if (payment) {
    result.payment = payment;
  }
  if (comment) {
    result.comment = comment;
  }

  return result;
};

/**
 * HTMLを安全にサニタイズする
 * - 危険なタグ（script, iframe, object, embed等）を除去
 * - 危険な属性（onclick, onerror等のイベントハンドラ）を除去
 * - 安全なHTMLタグ（a, br, p, strong, b, i, u, em, span, div等）は許可
 */
const sanitizeHtml = (html: string): string => {
  // DOMPurifyの設定：安全なタグと属性のみ許可
  const config: DOMPurify.Config = {
    ALLOWED_TAGS: [
      "a",
      "b",
      "br",
      "code",
      "div",
      "em",
      "font",
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      "hr",
      "i",
      "img",
      "li",
      "ol",
      "p",
      "pre",
      "s",
      "small",
      "span",
      "strong",
      "sub",
      "sup",
      "table",
      "tbody",
      "td",
      "tfoot",
      "th",
      "thead",
      "tr",
      "u",
      "ul",
    ],
    ALLOWED_ATTR: [
      "href",
      "src",
      "alt",
      "title",
      "class",
      "id",
      "style",
      "target",
      "rel",
      "width",
      "height",
      "color",
      "size",
      "face",
    ],
    // リンクは新しいタブで開く
    ADD_ATTR: ["target", "rel"],
    // javascript: や data: などの危険なプロトコルをブロック
    ALLOWED_URI_REGEXP:
      /^(?:(?:https?|mailto|tel):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i,
    // data属性も許可しない
    ALLOW_DATA_ATTR: false,
  };

  return DOMPurify.sanitize(html, config);
};

/**
 * サニタイズ済みHTML内のリンクに target="_blank" と rel="noopener noreferrer" を追加
 */
const addTargetBlankToLinks = (container: HTMLElement): void => {
  const links = container.querySelectorAll("a[href]");
  links.forEach((link) => {
    const anchor = link as HTMLAnchorElement;
    // 外部リンクまたは絶対URLの場合のみ target="_blank" を追加
    const href = anchor.getAttribute("href") ?? "";
    if (href.startsWith("http://") || href.startsWith("https://")) {
      anchor.setAttribute("target", "_blank");
      anchor.setAttribute("rel", "noopener noreferrer");
    }
  });
};

const getVideoIdFromQuery = (): string | null => {
  const params = new URLSearchParams(window.location.search);
  return params.get("videoId");
};

const getStandaloneModeFromQuery = (): "normal" | "deleted" => {
  const params = new URLSearchParams(window.location.search);
  const mode = params.get("mode");
  return mode === "deleted" ? "deleted" : "normal";
};

const getDisplayTitleFromQuery = (): string | undefined => {
  const params = new URLSearchParams(window.location.search);
  const raw = params.get("title");
  if (raw && raw.trim().length > 0) {
    return raw.trim();
  }
  return undefined;
};

const setBreadcrumbVideoId = (videoId: string): void => {
  const current = document.getElementById("nc-current-video-id");
  if (current) {
    current.textContent = videoId;
  }
};

const appendMetaItem = (
  container: HTMLElement,
  label: string,
  value: string | null | undefined,
): void => {
  if (!value || value === "-") {
    return;
  }
  const item = document.createElement("span");
  item.textContent = label + ": " + value;
  container.append(item);
};

const resolveGenreLabel = (apiData: ApiData): string | null => {
  const genre = apiData.video.genre;
  if (typeof genre === "string" && genre.trim()) {
    return genre;
  }
  if (isRecord(genre)) {
    const label = genre["label"];
    if (typeof label === "string" && label.trim()) {
      return label;
    }
    const id = genre["id"];
    if (typeof id === "string" && id.trim()) {
      return id;
    }
  }
  return null;
};

const renderMeta = (container: HTMLElement, apiData: ApiData): void => {
  container.innerHTML = "";
  appendMetaItem(container, "動画ID", apiData.video.id);
  appendMetaItem(
    container,
    "投稿日",
    formatDateTime(apiData.video.registeredAt),
  );
  appendMetaItem(container, "再生時間", formatDuration(apiData.video.duration));
  appendMetaItem(container, "ジャンル", resolveGenreLabel(apiData));
};

const AUTO_NEXT_STORAGE_KEY = "video-player-auto-next";

/**
 * 説明文（HTML）から動画IDを抽出し、現在の動画の「次」を推定する
 *
 * 対応パターン:
 *   - watch/sm12345, watch/so12345, watch/nm12345（プレフィックス付き）
 *   - watch/12345（数値のみ）
 *   - https://www.nicovideo.jp/watch/... 形式の完全URL
 *
 * 推定ロジック:
 *   1. 現在の動画IDが説明文中に見つかれば、その直後に出現する別の動画IDを返す
 *   2. 現在の動画IDが見つからない場合は、説明文中の最後の動画IDを返す
 */
const extractNextVideoIdFromDescription = (
  description: string,
  currentVideoId: string,
): string | null => {
  // watch/ に続く動画IDを全て抽出（sm/so/nm + 数字、または数字のみ）
  const pattern = /watch\/([a-z]{0,2}\d+)/gi;
  const ids: string[] = [];
  let match: RegExpExecArray | null = pattern.exec(description);
  while (match !== null) {
    const id = match[1];
    if (id && !ids.includes(id)) {
      ids.push(id);
    }
    match = pattern.exec(description);
  }

  if (ids.length === 0) {
    return null;
  }

  // 現在の動画IDが説明文にある場合、その直後のIDを次の動画とする
  const currentIndex = ids.indexOf(currentVideoId);
  if (currentIndex !== -1 && currentIndex < ids.length - 1) {
    return ids[currentIndex + 1] ?? null;
  }

  // 現在の動画IDが見つからない、または末尾の場合は最後のIDを返す
  // ただし自分自身は除外する
  const candidates = ids.filter((id) => id !== currentVideoId);
  return candidates.length > 0 ? (candidates[candidates.length - 1] ?? null) : null;
};

type ResolvedNextVideo = {
  id: string;
  source: "series" | "description";
};

/**
 * 次の動画IDを解決する（シリーズ優先、説明文フォールバック）
 */
const resolveNextVideoId = (
  apiData: ApiData,
  currentVideoId: string,
): ResolvedNextVideo | null => {
  // 優先: シリーズデータ
  const seriesNextId = apiData.series?.next?.id;
  if (seriesNextId) {
    return { id: seriesNextId, source: "series" };
  }

  // フォールバック: 説明文中の動画リンク
  const descriptionSource =
    apiData.video.description ?? apiData.video.shortDescription;
  if (descriptionSource) {
    const descriptionNextId = extractNextVideoIdFromDescription(
      descriptionSource,
      currentVideoId,
    );
    if (descriptionNextId) {
      return { id: descriptionNextId, source: "description" };
    }
  }

  return null;
};

const renderStats = (
  container: HTMLElement,
  apiData: ApiData,
  currentVideoId: string,
): void => {
  container.innerHTML = "";

  const resolved = resolveNextVideoId(apiData, currentVideoId);
  const hasNextVideo = resolved !== null;
  const savedPref =
    localStorage.getItem(AUTO_NEXT_STORAGE_KEY) === "true";

  container.append(
    createStatItem("再生数", formatNumber(apiData.video.count.view)),
    createStatItem("コメント数", formatNumber(apiData.video.count.comment)),
    createStatItem("マイリスト数", formatNumber(apiData.video.count.mylist)),
    createStatItem(
      "いいね数",
      formatNumber(apiData.video.likeCount ?? apiData.video.count.like ?? null),
    ),
    createAutoNextStatItem(
      savedPref,
      !hasNextVideo,
      (checked: boolean) => {
        localStorage.setItem(AUTO_NEXT_STORAGE_KEY, String(checked));
      },
      resolved?.source === "description" ? "説明文" : undefined,
    ),
  );
};

/**
 * ニコニコ大百科へのリンク用「百」SVGアイコンを生成
 */
const createNicopediaIcon = (): string => {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="currentColor" class="nc-tag__nicopedia-icon">
    <text x="50%" y="50%" dominant-baseline="central" text-anchor="middle" font-size="14" font-weight="bold" font-family="sans-serif">百</text>
  </svg>`;
};

/**
 * タグ名をURLエンコードする（タグ検索・大百科用）
 */
const encodeTagForUrl = (tagName: string): string => {
  return encodeURIComponent(tagName);
};

const renderTags = (container: HTMLElement, apiData: ApiData): void => {
  container.innerHTML = "";
  const tags = apiData.tag?.items ?? [];
  if (!tags.length) {
    const empty = document.createElement("span");
    empty.className = "nc-empty";
    empty.textContent = "タグは登録されていません。";
    container.append(empty);
    return;
  }
  for (const tag of tags) {
    if (!tag || typeof tag !== "object") {
      continue;
    }
    const name = "name" in tag && typeof tag.name === "string" ? tag.name : "";
    if (!name) {
      continue;
    }

    // タグチップのコンテナ
    const chip = document.createElement("span");
    chip.className = "nc-tag";

    // タグ検索へのリンク（タグ名をクリック）
    const tagLink = document.createElement("a");
    tagLink.className = "nc-tag__link";
    tagLink.href = `https://www.nicovideo.jp/tag/${encodeTagForUrl(name)}`;
    tagLink.target = "_blank";
    tagLink.rel = "noopener noreferrer";
    tagLink.textContent = name;
    tagLink.title = `「${name}」のタグ検索`;

    // ニコニコ大百科へのリンク（「百」アイコン）
    const nicopediaLink = document.createElement("a");
    nicopediaLink.className = "nc-tag__nicopedia";
    nicopediaLink.href = `https://dic.nicovideo.jp/a/${encodeTagForUrl(name)}`;
    nicopediaLink.target = "_blank";
    nicopediaLink.rel = "noopener noreferrer";
    nicopediaLink.innerHTML = createNicopediaIcon();
    nicopediaLink.title = `「${name}」のニコニコ大百科`;

    chip.append(tagLink, nicopediaLink);
    container.append(chip);
  }
};

const renderDescription = (element: HTMLElement, apiData: ApiData): void => {
  // 動画の説明文を優先的に使用（owner.descriptionは投稿者の説明なので後回し）
  const candidates = [
    typeof apiData.video.description === "string"
      ? apiData.video.description
      : null,
    typeof apiData.video.shortDescription === "string"
      ? apiData.video.shortDescription
      : null,
  ];
  const source = candidates.find(
    (text) => typeof text === "string" && text.trim().length > 0,
  );
  if (!source) {
    element.textContent = "説明文はありません。";
    return;
  }

  // HTMLをサニタイズしてから設定
  const sanitizedHtml = sanitizeHtml(source);
  element.innerHTML = sanitizedHtml;

  // リンクに target="_blank" を追加
  addTargetBlankToLinks(element);
};

const collectOwnerDisplayData = (apiData: ApiData): OwnerDisplayData | null => {
  if (apiData.channel) {
    const channel = apiData.channel;
    const displayName =
      channel.name && channel.name.trim() ? channel.name : "チャンネル";
    const idValue = channel.id;
    const channelId =
      typeof idValue === "string"
        ? idValue
        : typeof idValue === "number"
          ? String(idValue)
          : undefined;
    let iconUrl =
      channel.iconUrl && channel.iconUrl.trim() ? channel.iconUrl : undefined;
    if (!iconUrl) {
      const thumbnailUrl = (
        channel as { thumbnail?: { url?: string | null } | null }
      ).thumbnail?.url;
      if (typeof thumbnailUrl === "string" && thumbnailUrl.trim()) {
        iconUrl = thumbnailUrl;
      }
    }
    const explicitUrl =
      channel.url && channel.url.trim() ? channel.url : undefined;
    const linkUrl =
      explicitUrl ??
      (channelId ? "https://ch.nicovideo.jp/" + channelId : undefined);
    return { name: displayName, iconUrl, linkUrl };
  }

  if (apiData.owner) {
    const owner = apiData.owner;
    const nickname =
      owner.nickname && owner.nickname.trim() ? owner.nickname : "投稿者";
    const idValue = owner.id;
    const ownerId =
      typeof idValue === "string"
        ? idValue
        : typeof idValue === "number"
          ? String(idValue)
          : undefined;
    const explicitUrl =
      owner.userPageUrl && owner.userPageUrl.trim()
        ? owner.userPageUrl
        : undefined;
    const linkUrl =
      explicitUrl ??
      (ownerId ? "https://www.nicovideo.jp/user/" + ownerId : undefined);
    const iconUrl =
      owner.iconUrl && owner.iconUrl.trim() ? owner.iconUrl : undefined;
    return { name: nickname, iconUrl, linkUrl };
  }

  return null;
};

const renderOwner = (layout: StandaloneLayout, apiData: ApiData): void => {
  const ownerInfo = collectOwnerDisplayData(apiData);
  const { ownerContainer, ownerAvatar, ownerName, ownerLink } = layout;

  if (!ownerInfo) {
    ownerContainer.style.display = "none";
    return;
  }

  ownerContainer.style.display = "flex";
  ownerName.textContent = ownerInfo.name;

  if (ownerInfo.iconUrl) {
    ownerAvatar.src = ownerInfo.iconUrl;
    ownerAvatar.alt = ownerInfo.name + "のアイコン";
    ownerAvatar.style.display = "";
  } else {
    ownerAvatar.style.display = "none";
  }

  if (ownerInfo.linkUrl) {
    ownerLink.href = ownerInfo.linkUrl;
    ownerLink.style.pointerEvents = "";
    ownerLink.removeAttribute("aria-disabled");
  } else {
    ownerLink.href = "#";
    ownerLink.style.pointerEvents = "none";
    ownerLink.setAttribute("aria-disabled", "true");
  }
};

const normalizeSeriesEntry = (
  value: unknown,
): { id?: string; title: string } | null => {
  const reference = toSeriesReferenceForApi(value);
  if (!reference || !reference.title) {
    return null;
  }
  return { id: reference.id, title: reference.title };
};

const renderSeries = (container: HTMLElement, apiData: ApiData): void => {
  container.innerHTML = "";
  const series = apiData.series;

  if (!series) {
    const empty = document.createElement("p");
    empty.className = "nc-empty";
    empty.textContent = "シリーズ情報はありません。";
    container.append(empty);
    return;
  }

  const seriesRecord = series as RecordLike;
  const videoRaw = seriesRecord["video"];
  const videoBlock = isRecord(videoRaw) ? videoRaw : undefined;

  const seriesIdValue = seriesRecord["id"];
  const seriesId =
    typeof seriesIdValue === "number" || typeof seriesIdValue === "string"
      ? String(seriesIdValue)
      : undefined;
  const seriesTitle = seriesRecord["title"];

  if (typeof seriesTitle === "string" && seriesTitle.trim()) {
    const wrapper = document.createElement("div");
    wrapper.className = "nc-series__item";

    const labelEl = document.createElement("span");
    labelEl.textContent = "シリーズ";

    const link = document.createElement("a");
    link.textContent = seriesTitle;
    if (seriesId) {
      link.href = "https://www.nicovideo.jp/series/" + seriesId;
    } else {
      link.href = "#";
      link.style.pointerEvents = "none";
      link.setAttribute("aria-disabled", "true");
    }
    link.target = "_blank";
    link.rel = "noopener noreferrer";

    wrapper.append(labelEl, link);
    container.append(wrapper);
  }

  const entries: Array<[string, unknown]> = [
    ["シリーズ最初", videoBlock?.["first"] ?? seriesRecord["first"]],
    ["前の動画", videoBlock?.["prev"] ?? seriesRecord["prev"]],
    ["次の動画", videoBlock?.["next"] ?? seriesRecord["next"]],
  ];

  for (const [label, raw] of entries) {
    const item = normalizeSeriesEntry(raw);
    if (!item) {
      continue;
    }
    const wrapper = document.createElement("div");
    wrapper.className = "nc-series__item";

    const labelEl = document.createElement("span");
    labelEl.textContent = label;

    const link = document.createElement("a");
    link.textContent = item.title;
    if (item.id) {
      link.href = "https://www.nicovideo.jp/watch/" + item.id;
    } else {
      link.href = "#";
      link.style.pointerEvents = "none";
      link.setAttribute("aria-disabled", "true");
    }
    link.target = "_blank";
    link.rel = "noopener noreferrer";

    wrapper.append(labelEl, link);
    container.append(wrapper);
  }

  if (!container.children.length) {
    const empty = document.createElement("p");
    empty.className = "nc-empty";
    empty.textContent = "シリーズ情報はありません。";
    container.append(empty);
  }
};

const assignWatchContext = (videoId: string, apiData: ApiData): void => {
  if (!window.NicoCache_nl) {
    return;
  }
  if (!window.NicoCache_nl.watch) {
    window.NicoCache_nl.watch = {
      getVideoID: () => videoId,
      apiData,
      addEventListener: () => {},
    };
    return;
  }
  window.NicoCache_nl.watch.getVideoID = () => videoId;
  window.NicoCache_nl.watch.apiData = apiData;
};

const main = async (): Promise<void> => {
  const videoId = getVideoIdFromQuery();
  const mode = getStandaloneModeFromQuery();
  const layout = createStandaloneLayout({ mode });

  if (!videoId) {
    layout.title.textContent = "動画IDが指定されていません";
    layout.description.textContent =
      "URLに videoId パラメーターを指定してください。";
    return;
  }

  setBreadcrumbVideoId(videoId);

  const player = new StandalonePlayer({ mount: layout.playerMount });

  if (mode === "deleted") {
    const displayTitle =
      getDisplayTitleFromQuery() ?? `Deleted Video (${videoId})`;
    layout.title.textContent = displayTitle;
    document.title = "video-player - " + displayTitle;

    layout.metaList.style.display = "none";
    layout.infoCard.style.display = "none";
    layout.description.style.display = "none";

    try {
      await player.initialize(videoId, {
        displayTitle,
        enableComments: false,
      });
    } catch (error) {
      window.logger.error("Standalone deleted video player failed", error);
      layout.description.style.display = "";
      layout.description.textContent =
        "キャッシュ再生に失敗しました: " +
        (error instanceof Error ? error.message : String(error));
    }

    return;
  }

  try {
    const result = await window.commonHelper.fetchWatchPage(videoId);
    if (!result) {
      throw new Error("ウォッチページの取得に失敗しました");
    }

    const apiData = toApiData(result.apiData, videoId);
    layout.title.textContent = apiData.video.title;
    document.title = "video-player - " + apiData.video.title;

    renderMeta(layout.metaList, apiData);
    renderStats(layout.statsList, apiData, videoId);
    renderTags(layout.tags, apiData);
    renderDescription(layout.description, apiData);
    renderOwner(layout, apiData);
    renderSeries(layout.seriesList, apiData);

    assignWatchContext(videoId, apiData);

    await player.initialize(videoId, { apiData });

    // シリーズ連続再生: 再生完了時に次の動画へ自動遷移
    const resolved = resolveNextVideoId(apiData, videoId);
    if (resolved) {
      player.onVideoEnded(() => {
        const autoNext =
          localStorage.getItem(AUTO_NEXT_STORAGE_KEY) === "true";
        if (!autoNext) {
          return;
        }
        const sourceLabel =
          resolved.source === "description" ? "説明文リンク" : "シリーズ";
        window.logger.info(
          `連続再生(${sourceLabel}): 次の動画 ${resolved.id} へ遷移します`,
        );
        const nextUrl = new URL(window.location.href);
        nextUrl.searchParams.set("videoId", resolved.id);
        window.location.href = nextUrl.toString();
      });
    }
  } catch (error) {
    window.logger.error("Standalone player failed", error);
    layout.title.textContent = "動画情報の取得に失敗しました";
    layout.description.textContent =
      "エラー: " + (error instanceof Error ? error.message : String(error));
  }
};

void main();
