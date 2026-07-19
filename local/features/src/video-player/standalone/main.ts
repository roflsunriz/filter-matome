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
  createRepeatPlaybackStatItem,
} from "@/video-player/standalone/utils";
import {
  AUTO_NEXT_STORAGE_KEY,
  REPEAT_PLAYBACK_STORAGE_KEY,
  resolveEndedPlaybackAction,
} from "@/video-player/standalone/playback-preferences";
import { fetchNicochartVideoInfo } from "@/video-player/core/nicochart-client";
import type { ApiData } from "@/types/index";
import DOMPurify from "dompurify";
import type { Config as DOMPurifyConfig } from "dompurify";

import {
  isRecord,
  toApiData,
  toSeriesReferenceForApi,
  type OwnerDisplayData,
  type RecordLike,
} from "@/video-player/standalone/api-data-normalizer";

/**
 * HTMLを安全にサニタイズする
 * - 危険なタグ（script, iframe, object, embed等）を除去
 * - 危険な属性（onclick, onerror等のイベントハンドラ）を除去
 * - 安全なHTMLタグ（a, br, p, strong, b, i, u, em, span, div等）は許可
 */
const sanitizeHtml = (html: string): string => {
  // DOMPurifyの設定：安全なタグと属性のみ許可
  const config: DOMPurifyConfig = {
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
  const videoId = params.get("videoId");
  return videoId?.trim() || null;
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
  return candidates.length > 0
    ? (candidates[candidates.length - 1] ?? null)
    : null;
};

type ResolvedNextVideo = {
  id: string;
  source: "series" | "description";
};

/**
 * 数値のみの動画IDかどうかを判定する
 * 例: "12345" → true, "sm12345" → false
 */
const isNumericOnlyVideoId = (id: string): boolean => /^\d+$/.test(id);

/**
 * 数値のみ動画IDをプレフィックス付きID（sm/so）に正規化する
 * fetchWatchPage でウォッチページを取得し、apiData.video.id から正規IDを得る
 */
const resolveNumericVideoId = async (numericId: string): Promise<string> => {
  try {
    const result = await window.commonHelper.fetchWatchPage(numericId);
    if (!result) {
      window.logger.warn(
        `数値ID ${numericId} のウォッチページ取得に失敗しました`,
      );
      return numericId;
    }
    const resolved = toApiData(result.apiData, numericId);
    const canonicalId = resolved.video.id;
    if (canonicalId && canonicalId !== numericId) {
      window.logger.info(`数値ID解決: ${numericId} → ${canonicalId}`);
      return canonicalId;
    }
    return canonicalId || numericId;
  } catch (error) {
    window.logger.warn(`数値ID ${numericId} の解決に失敗しました`, error);
    return numericId;
  }
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
  const savedPref = localStorage.getItem(AUTO_NEXT_STORAGE_KEY) === "true";
  const repeatPref =
    localStorage.getItem(REPEAT_PLAYBACK_STORAGE_KEY) === "true";

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
    createRepeatPlaybackStatItem(repeatPref, (checked: boolean) => {
      localStorage.setItem(REPEAT_PLAYBACK_STORAGE_KEY, String(checked));
    }),
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

type VideoInfoResult = {
  apiData: ApiData;
  source: "watch-page" | "nicochart";
  isPremium: boolean;
};

const hasPremiumSession = (serverContext: unknown): boolean => {
  if (!serverContext || typeof serverContext !== "object") {
    return false;
  }
  const sessionUser = (serverContext as Record<string, unknown>)["sessionUser"];
  return (
    typeof sessionUser === "object" &&
    sessionUser !== null &&
    (sessionUser as Record<string, unknown>)["type"] === "premium"
  );
};

const fetchVideoInfoWithFallback = async (
  videoId: string,
): Promise<VideoInfoResult | null> => {
  try {
    const result = await window.commonHelper.fetchWatchPage(videoId);
    if (result) {
      return {
        apiData: toApiData(result.apiData, videoId),
        source: "watch-page",
        isPremium: hasPremiumSession(result.serverContext),
      };
    }
    window.logger.warn(
      "ウォッチページから動画情報を取得できませんでした。nicochart.jpを試します",
    );
  } catch (error) {
    window.logger.warn(
      "ウォッチページの動画情報取得に失敗しました。nicochart.jpを試します",
      error,
    );
  }

  try {
    const apiData = await fetchNicochartVideoInfo(videoId);
    return apiData ? { apiData, source: "nicochart", isPremium: false } : null;
  } catch (error) {
    window.logger.warn("nicochart.jpの動画情報取得に失敗しました", error);
    return null;
  }
};

let started = false;

export const startStandalonePlayer = async (): Promise<void> => {
  if (started) {
    return;
  }
  started = true;

  const videoId = getVideoIdFromQuery();
  const mode = getStandaloneModeFromQuery();
  const layout = createStandaloneLayout({ mode });
  if (videoId) {
    layout.videoNavigation.input.value = videoId;
  }

  if (!videoId) {
    layout.title.textContent = "動画IDが指定されていません";
    layout.description.textContent =
      "パンくずリスト下の入力欄に動画URLまたはvideoIdを指定してください。";
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
    const videoInfo = await fetchVideoInfoWithFallback(videoId);
    if (!videoInfo) {
      throw new Error("ウォッチページの取得に失敗しました");
    }

    const { apiData, source, isPremium } = videoInfo;
    layout.title.textContent = apiData.video.title;
    document.title = "video-player - " + apiData.video.title;

    renderMeta(layout.metaList, apiData);
    if (source === "nicochart") {
      appendMetaItem(
        layout.metaList,
        "情報取得元",
        "nicochart.jp（情報が最新でない場合があります）",
      );
    }
    renderStats(layout.statsList, apiData, videoId);
    renderTags(layout.tags, apiData);
    renderDescription(layout.description, apiData);
    renderOwner(layout, apiData);
    renderSeries(layout.seriesList, apiData);

    assignWatchContext(videoId, apiData);

    await player.initialize(videoId, {
      apiData,
      enableComments: source === "watch-page",
      isPremium,
    });

    // 繰り返し再生を優先し、無効な場合だけ次の動画へ自動遷移する。
    const resolved = resolveNextVideoId(apiData, videoId);
    const canonicalIdPromise: Promise<string> | null = resolved
      ? isNumericOnlyVideoId(resolved.id)
        ? resolveNumericVideoId(resolved.id)
        : Promise.resolve(resolved.id)
      : null;

    player.onVideoEnded(() => {
      const action = resolveEndedPlaybackAction(
        localStorage.getItem(REPEAT_PLAYBACK_STORAGE_KEY) === "true",
        localStorage.getItem(AUTO_NEXT_STORAGE_KEY) === "true",
        resolved !== null,
      );
      if (action === "repeat") {
        void player.replay().catch((error: unknown) => {
          window.logger.error("繰り返し再生の開始に失敗しました", error);
        });
        return;
      }
      if (action === "next" && resolved && canonicalIdPromise) {
        const sourceLabel =
          resolved.source === "description" ? "説明文リンク" : "シリーズ";
        void canonicalIdPromise.then((nextId) => {
          window.logger.info(
            `連続再生(${sourceLabel}): 次の動画 ${nextId} へ遷移します`,
          );
          const nextUrl = new URL(window.location.href);
          nextUrl.searchParams.set("videoId", nextId);
          window.location.href = nextUrl.toString();
        });
      }
    });
  } catch (error) {
    window.logger.error("Standalone player failed", error);
    const message = error instanceof Error ? error.message : String(error);

    if (message === "ウォッチページの取得に失敗しました") {
      const displayTitle = `Video (${videoId})`;
      layout.title.textContent = displayTitle;
      document.title = "video-player - " + displayTitle;
      layout.metaList.style.display = "none";
      layout.infoCard.style.display = "none";
      layout.description.textContent =
        "動画情報を取得できなかったため、ローカルキャッシュのみで再生を試みます。";

      try {
        await player.initialize(videoId, {
          displayTitle,
          enableComments: false,
        });
      } catch (playbackError) {
        window.logger.error(
          "Standalone fallback cache playback failed",
          playbackError,
        );
        layout.description.textContent =
          "動画情報の取得とキャッシュ再生に失敗しました: " +
          (playbackError instanceof Error
            ? playbackError.message
            : String(playbackError));
      }
      return;
    }

    if (message === "動画ソースが見つかりません") {
      layout.description.textContent =
        "キャッシュ再生に失敗しました: " + message;
      return;
    }

    layout.title.textContent = "動画情報の取得に失敗しました";
    layout.description.textContent = "エラー: " + message;
  }
};
