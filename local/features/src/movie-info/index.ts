import "@/types/global-types";
import type { IntegratedNicoData, NicoApiData } from "@/types/common-types";
import {
  fetchCacheInfo,
  fetchCommentsWithApi,
  fetchMediaInfo,
  fetchThumbInfo,
  fetchWatchApiData,
} from "@/movie-info/api-clients";
import { headerAdjustments } from "@/movie-info/header-adjustments";
import { applyMovieInfoDashboardStyles } from "@/movie-info/styles";
import { PanelController, showMovieInfoErrorModal } from "@/movie-info/ui";
import type {
  CacheEntry,
  CommentPreview,
  ErrorModalItem,
  MediaInfoResponse,
  ThumbInfo,
  ThumbTagInfo,
  DownloadDescriptor,
} from "@/types/movie-info-types";

const COMMENT_PREVIEW_LIMIT = 200;

const formatNumber = (value: unknown): string => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "-";
  }
  return value.toLocaleString("ja-JP");
};

const formatBytes = (value: unknown): string => {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return "-";
  }
  const units = ["B", "KB", "MB", "GB", "TB"];
  let size = value;
  let index = 0;
  while (size >= 1024 && index < units.length - 1) {
    size = size / 1024;
    index += 1;
  }
  const rounded = Math.round(size * 10) / 10;
  return String(rounded) + " " + units[index];
};

const trimDescription = (text: unknown, limit: number = 140): string => {
  if (typeof text !== "string" || text.length === 0) {
    return "-";
  }
  if (text.length <= limit) {
    return text;
  }
  return text.slice(0, limit) + "…";
};

const extractVideoId = (input: string): string | null => {
  const pattern = /([a-z]{2}\d+)/i;
  const match = pattern.exec(input);
  return match ? match[1].toLowerCase() : null;
};

const updateUrlWithVideoId = (videoId: string): void => {
  try {
    const current = new URL(window.location.href);
    current.searchParams.set("videoId", videoId);
    window.history.replaceState({}, "", current.toString());
  } catch (error) {
    window.logger?.warn?.("[movie-info] failed to update URL", error);
  }
};

const sanitizeFileSegment = (
  value: string | null | undefined,
  fallback: string,
): string => {
  if (typeof value !== "string") {
    return fallback;
  }
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-]+|[-]+$/g, "");
  return normalized.length > 0 ? normalized : fallback;
};

const createJsonDownloadDescriptor = (
  videoId: string | null,
  suffix: string,
  supplier: () => unknown,
): DownloadDescriptor => {
  const safeId = sanitizeFileSegment(videoId, "unknown-video");
  const safeSuffix = sanitizeFileSegment(suffix, "data");
  return {
    fileName: safeId + "-" + safeSuffix + ".json",
    payloadSupplier: () => JSON.stringify(supplier(), null, 2),
  };
};

const createSummaryGrid = (
  rows: Array<{ label: string; value: string }>,
): HTMLElement => {
  const dl = document.createElement("dl");
  dl.className = "summary-grid";
  rows.forEach((row) => {
    const dt = document.createElement("dt");
    dt.textContent = row.label;
    const dd = document.createElement("dd");
    dd.textContent = row.value;
    dl.appendChild(dt);
    dl.appendChild(dd);
  });
  return dl;
};

const createTagList = (tags: ThumbTagInfo[]): HTMLElement => {
  const wrapper = document.createElement("div");
  wrapper.className = "tag-list";
  tags.forEach((tag) => {
    const chip = document.createElement("span");
    chip.className = "tag-chip";
    chip.textContent = tag.name + (tag.locked ? " (lock)" : "");
    wrapper.appendChild(chip);
  });
  return wrapper;
};

const buildCacheSummary = (entry: CacheEntry): HTMLElement => {
  const container = document.createElement("div");
  container.className = "summary-container";
  const caches = Object.values(entry.caches ?? {});
  const completeCount = Array.isArray(entry.completes)
    ? entry.completes.length
    : 0;
  const cachingCount = Array.isArray(entry.cachings)
    ? entry.cachings.length
    : 0;
  const totalSize = caches.reduce((acc, item) => {
    const size = typeof item.size === "number" ? item.size : 0;
    return acc + size;
  }, 0);
  const primary = createSummaryGrid([
    { label: "preferred", value: entry.preferred || "-" },
    { label: "完了キャッシュ", value: String(completeCount) },
    { label: "取得中", value: String(cachingCount) },
    {
      label: "登録キャッシュ",
      value: String(Array.isArray(entry.cacheIds) ? entry.cacheIds.length : 0),
    },
    { label: "合計サイズ", value: formatBytes(totalSize) },
  ]);
  container.appendChild(primary);

  if (caches.length > 0) {
    const meta = document.createElement("div");
    meta.className = "video-meta";
    meta.appendChild(document.createTextNode("キャッシュ詳細"));
    caches.slice(0, 3).forEach((item) => {
      const line = document.createElement("div");
      const quality =
        item?.dmcMovieType && typeof item.dmcMovieType === "object"
          ? String(item.dmcMovieType.videoMode || "")
          : "";
      const summary = [item.cacheId || "", quality, formatBytes(item.size)]
        .filter((value) => value && value !== "-")
        .join(" / ");
      line.textContent = summary;
      meta.appendChild(line);
    });
    if (caches.length > 3) {
      const more = document.createElement("div");
      more.textContent = "...他" + String(caches.length - 3) + "件";
      meta.appendChild(more);
    }
    container.appendChild(meta);
  }

  return container;
};

const buildThumbSummary = (thumb: ThumbInfo): HTMLElement => {
  const container = document.createElement("div");
  container.className = "summary-container";
  const primary = createSummaryGrid([
    { label: "タイトル", value: thumb.title || "-" },
    { label: "長さ", value: thumb.length || "-" },
    { label: "視聴数", value: formatNumber(thumb.viewCounter) },
    { label: "コメント", value: formatNumber(thumb.commentNum) },
    { label: "マイリスト", value: formatNumber(thumb.mylistCounter) },
    { label: "ジャンル", value: thumb.genre || "-" },
  ]);
  container.appendChild(primary);

  if (thumb.tags.length > 0) {
    container.appendChild(createTagList(thumb.tags));
  }

  const meta = document.createElement("div");
  meta.className = "video-meta";
  if (thumb.owner) {
    const ownerLine = document.createElement("div");
    ownerLine.textContent =
      "投稿者: " + (thumb.owner.nickname || thumb.owner.id);
    meta.appendChild(ownerLine);
  }
  if (thumb.channel) {
    const channelLine = document.createElement("div");
    channelLine.textContent =
      "チャンネル: " + (thumb.channel.nickname || thumb.channel.id);
    meta.appendChild(channelLine);
  }
  if (thumb.watchUrl) {
    const watchLine = document.createElement("div");
    watchLine.textContent = "URL: " + thumb.watchUrl;
    meta.appendChild(watchLine);
  }
  if (meta.childNodes.length > 0) {
    container.appendChild(meta);
  }
  return container;
};

const buildApiSummary = (apiData: NicoApiData): HTMLElement => {
  const container = document.createElement("div");
  container.className = "summary-container";
  const video = (apiData as Record<string, unknown>).video as
    Record<string, unknown> | undefined;
  const owner = (apiData as Record<string, unknown>).owner as
    Record<string, unknown> | undefined;
  const channel = (apiData as Record<string, unknown>).channel as
    Record<string, unknown> | undefined;
  const count = video?.count as Record<string, unknown> | undefined;

  const primary = createSummaryGrid([
    {
      label: "タイトル",
      value: typeof video?.title === "string" ? video.title : "-",
    },
    {
      label: "再生数",
      value: formatNumber(
        typeof count?.view === "number" ? count.view : undefined,
      ),
    },
    {
      label: "コメント",
      value: formatNumber(
        typeof count?.comment === "number" ? count.comment : undefined,
      ),
    },
    {
      label: "マイリスト",
      value: formatNumber(
        typeof count?.mylist === "number" ? count.mylist : undefined,
      ),
    },
    {
      label: "長さ(秒)",
      value: formatNumber(
        typeof video?.duration === "number" ? video.duration : undefined,
      ),
    },
  ]);
  container.appendChild(primary);

  const meta = document.createElement("div");
  meta.className = "video-meta";
  const ownerName = typeof owner?.nickname === "string" ? owner.nickname : null;
  const channelName = typeof channel?.name === "string" ? channel.name : null;
  if (ownerName) {
    meta.appendChild(document.createTextNode("投稿者: " + ownerName));
  }
  if (channelName) {
    meta.appendChild(document.createTextNode("チャンネル: " + channelName));
  }
  const description = trimDescription(video?.description, 160);
  const descLine = document.createElement("div");
  descLine.textContent = "説明: " + description;
  meta.appendChild(descLine);
  container.appendChild(meta);
  return container;
};

const buildMediaSummary = (mediaInfo: MediaInfoResponse): HTMLElement => {
  const entries = Array.isArray(mediaInfo) ? mediaInfo : [mediaInfo];
  const container = document.createElement("div");
  container.className = "summary-container";
  const header = document.createElement("div");
  header.className = "video-meta";
  header.textContent = "MediaInfo項目数: " + String(entries.length);
  container.appendChild(header);

  entries.slice(0, 3).forEach((item, index) => {
    const media = item?.media;
    const trackEntries = media?.track;
    const tracks = Array.isArray(trackEntries) ? trackEntries : [];
    const videoTracks = tracks.filter(
      (track) => track && track["@type"] === "Video",
    );
    const audioTracks = tracks.filter(
      (track) => track && track["@type"] === "Audio",
    );
    const refCandidate = media ? media["@ref"] : undefined;
    const refValue = typeof refCandidate === "string" ? refCandidate : "-";
    const formatCandidate = tracks.length > 0 ? tracks[0]?.Format : undefined;
    const formatValue =
      typeof formatCandidate === "string" ? formatCandidate : "-";
    const grid = createSummaryGrid([
      { label: "参照" + String(index + 1), value: refValue },
      { label: "Video", value: String(videoTracks.length) + "本" },
      { label: "Audio", value: String(audioTracks.length) + "本" },
      { label: "Format", value: formatValue },
    ]);
    container.appendChild(grid);
  });

  if (entries.length > 3) {
    const more = document.createElement("div");
    more.className = "video-meta";
    more.textContent = "...他" + String(entries.length - 3) + "件";
    container.appendChild(more);
  }
  return container;
};

const buildCommentSummary = (preview: CommentPreview): HTMLElement => {
  const container = document.createElement("div");
  container.className = "summary-container";
  const primary = createSummaryGrid([
    { label: "コメント総数", value: String(preview.totalCount) },
    { label: "取得フォーク", value: String(preview.threadCount) },
    { label: "表示件数", value: String(preview.sampleComments.length) },
  ]);
  container.appendChild(primary);

  const meta = document.createElement("div");
  meta.className = "video-meta";
  meta.appendChild(document.createTextNode(preview.note));
  if (preview.forks.length > 0) {
    const forks = document.createElement("div");
    forks.textContent = "fork: " + preview.forks.join(", ");
    meta.appendChild(forks);
  }
  if (preview.sampleComments.length > 0) {
    const first = preview.sampleComments[0];
    const sample = document.createElement("div");
    sample.textContent = "最初のコメント: " + first.body;
    meta.appendChild(sample);
  }
  container.appendChild(meta);
  return container;
};

const createCommentPreview = (data: IntegratedNicoData): CommentPreview => {
  const sample = data.comments.slice(0, COMMENT_PREVIEW_LIMIT);
  return {
    note:
      "表示は先頭" +
      String(sample.length) +
      "件です。完全なデータはJSONダウンロードを使用してください。",
    totalCount: data.comments.length,
    threadCount: data.threads.length,
    forks: Array.from(new Set(data.threads.map((thread) => thread.fork))),
    sampleComments: sample,
  };
};

const normalizeVideoIdFromInput = (value: string): string | null => {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  return extractVideoId(trimmed);
};

const setStatusText = (element: HTMLElement | null, text: string): void => {
  if (element) {
    element.textContent = text;
  }
};

const toFailureMessage = (error: unknown): string => {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return String(error);
};

const showDataLoadErrorModal = (
  videoId: string,
  failures: ErrorModalItem[],
): void => {
  showMovieInfoErrorModal({
    title: "データ取得を完了できませんでした",
    lead: "一部の取得元でエラーが発生したため、movie-info の処理は完遂されませんでした。失敗した取得元と原因を確認してください。",
    videoId,
    items: failures,
  });
};

type PanelMap = {
  watch: PanelController;
  cache: PanelController;
  thumb: PanelController;
  media: PanelController;
  comments: PanelController;
};

let started = false;

export function startMovieInfo(): void {
  if (started) {
    return;
  }
  started = true;

  void (async () => {
    applyMovieInfoDashboardStyles();
    headerAdjustments();

    const headerContainer = document.getElementById("common-header-container");
    if (
      headerContainer &&
      (
        window as unknown as {
          NicoCommon?: {
            createHeader?: (
              id: string,
              config: Record<string, unknown>,
            ) => void;
          };
        }
      ).NicoCommon?.createHeader
    ) {
      (
        window as unknown as {
          NicoCommon: {
            createHeader: (id: string, config: Record<string, unknown>) => void;
          };
        }
      ).NicoCommon.createHeader("common-header-container", {
        title: "Movie Info Dashboard",
        showSearch: true,
        showMoreLinks: true,
      });
    }

    const videoInput = document.getElementById(
      "video-id-input",
    ) as HTMLInputElement | null;
    const loadButton = document.getElementById(
      "load-data-btn",
    ) as HTMLButtonElement | null;
    const globalStatus = document.getElementById("global-status");
    const commentButton = document.getElementById(
      "fetch-comments-btn",
    ) as HTMLButtonElement | null;

    const panels: PanelMap = {
      watch: new PanelController(
        document.getElementById("panel-watch-api") as HTMLElement,
      ),
      cache: new PanelController(
        document.getElementById("panel-cache-info") as HTMLElement,
      ),
      thumb: new PanelController(
        document.getElementById("panel-thumb-info") as HTMLElement,
      ),
      media: new PanelController(
        document.getElementById("panel-media-info") as HTMLElement,
      ),
      comments: new PanelController(
        document.getElementById("panel-comments") as HTMLElement,
      ),
    };

    let currentVideoId: string | null = null;

    const setCommentButtonIdle = (): void => {
      if (commentButton) {
        commentButton.disabled = currentVideoId === null;
        commentButton.textContent = "コメントを取得";
      }
    };

    const handleLoad = async (videoId: string): Promise<void> => {
      currentVideoId = videoId;
      updateUrlWithVideoId(videoId);
      panels.comments.reset(
        "コメントは未取得です" + "。ボタンから取得できます。",
      );
      setCommentButtonIdle();
      setStatusText(globalStatus, "データ取得中...");

      panels.watch.setStatus("loading", "apiDataを取得中です...");
      panels.watch.setSummaryContent(null);
      panels.cache.setStatus("loading", "キャッシュ情報を取得中です...");
      panels.cache.setSummaryContent(null);
      panels.thumb.setStatus("loading", "サムネイル情報を取得中です...");
      panels.thumb.setSummaryContent(null);
      panels.media.setStatus("loading", "MediaInfoを取得中です...");
      panels.media.setSummaryContent(null);
      panels.watch.setDownloadDescriptor(null);
      panels.cache.setDownloadDescriptor(null);
      panels.thumb.setDownloadDescriptor(null);
      panels.media.setDownloadDescriptor(null);

      const failures: ErrorModalItem[] = [];
      const [apiDataResult, cacheInfoResult, thumbInfoResult, mediaInfoResult] =
        await Promise.allSettled([
          fetchWatchApiData(videoId),
          fetchCacheInfo(videoId),
          fetchThumbInfo(videoId),
          fetchMediaInfo(videoId),
        ]);

      if (apiDataResult.status === "fulfilled") {
        const apiData = apiDataResult.value;
        panels.watch.setStatus("success", "apiDataを取得しました");
        panels.watch.setSummaryContent(buildApiSummary(apiData));
        panels.watch.setJsonData(apiData);
        panels.watch.setDownloadDescriptor(
          createJsonDownloadDescriptor(
            currentVideoId,
            "api-data",
            () => apiData,
          ),
        );
      } else {
        const message = toFailureMessage(apiDataResult.reason);
        panels.watch.setStatus("error", "apiData取得失敗: " + message);
        failures.push({
          label: "ウォッチページ apiData",
          message,
          action:
            "動画IDが正しいか、ウォッチページへアクセスできるか、NicoCache_nl の取得処理が応答しているかを確認してください。",
        });
      }

      if (cacheInfoResult.status === "fulfilled") {
        const cacheInfo = cacheInfoResult.value;
        panels.cache.setStatus("success", "キャッシュ情報を取得しました");
        panels.cache.setSummaryContent(buildCacheSummary(cacheInfo));
        panels.cache.setJsonData(cacheInfo);
        panels.cache.setDownloadDescriptor(
          createJsonDownloadDescriptor(
            currentVideoId,
            "cache-info",
            () => cacheInfo,
          ),
        );
      } else {
        const message = toFailureMessage(cacheInfoResult.reason);
        panels.cache.setStatus("error", "キャッシュ情報取得失敗: " + message);
        failures.push({
          label: "cache/info/v2",
          message,
          action:
            "NicoCache_nl が起動しているか、対象動画のキャッシュ情報が存在するかを確認してください。",
        });
      }

      if (thumbInfoResult.status === "fulfilled") {
        const thumbInfo = thumbInfoResult.value;
        panels.thumb.setStatus("success", "サムネイル情報を取得しました");
        panels.thumb.setSummaryContent(buildThumbSummary(thumbInfo));
        panels.thumb.setJsonData(thumbInfo);
        panels.thumb.setDownloadDescriptor(
          createJsonDownloadDescriptor(
            currentVideoId,
            "thumb-info",
            () => thumbInfo,
          ),
        );
      } else {
        const message = toFailureMessage(thumbInfoResult.reason);
        panels.thumb.setStatus("error", "サムネイル情報取得失敗: " + message);
        failures.push({
          label: "getthumbinfo",
          message,
          action:
            "動画が削除済み・非公開でないか、外部サムネイルAPIへ接続できるかを確認してください。",
        });
      }

      if (mediaInfoResult.status === "fulfilled") {
        const mediaInfo = mediaInfoResult.value;
        panels.media.setStatus("success", "MediaInfoを取得しました");
        panels.media.setSummaryContent(buildMediaSummary(mediaInfo));
        panels.media.setJsonData(mediaInfo);
        panels.media.setDownloadDescriptor(
          createJsonDownloadDescriptor(
            currentVideoId,
            "media-info",
            () => mediaInfo,
          ),
        );
      } else {
        const message = toFailureMessage(mediaInfoResult.reason);
        panels.media.setStatus("error", "MediaInfo取得失敗: " + message);
        failures.push({
          label: "cache/mediainfo",
          message,
          action:
            "対象動画のメディア情報が生成済みか、NicoCache_nl の mediainfo エンドポイントが応答しているかを確認してください。",
        });
      }

      if (failures.length > 0) {
        window.logger?.error?.("[movie-info] data load incomplete", failures);
        setStatusText(
          globalStatus,
          "データ取得が一部失敗しました: " + String(failures.length) + "件",
        );
        showDataLoadErrorModal(videoId, failures);
      } else {
        setStatusText(globalStatus, "データ取得が完了しました");
      }
    };

    const handleCommentFetch = async (): Promise<void> => {
      if (!currentVideoId || !commentButton) {
        return;
      }
      commentButton.disabled = true;
      commentButton.textContent = "取得中...";
      panels.comments.setStatus("loading", "コメントを取得中です...");
      panels.comments.setDownloadDescriptor(null);

      try {
        const data = await fetchCommentsWithApi(currentVideoId);
        const preview = createCommentPreview(data);
        panels.comments.setStatus("success", "コメントを取得しました");
        panels.comments.setSummaryContent(buildCommentSummary(preview));
        panels.comments.setJsonData(preview);
        panels.comments.setDownloadDescriptor(
          createJsonDownloadDescriptor(currentVideoId, "comments", () => data),
        );
      } catch (error) {
        const message = toFailureMessage(error);
        panels.comments.setStatus(
          "error",
          "コメント取得に失敗しました: " + message,
        );
        panels.comments.setDownloadDescriptor(null);
        showMovieInfoErrorModal({
          title: "コメント取得を完了できませんでした",
          lead: "コメント統合データの取得中にエラーが発生したため、コメント処理は完遂されませんでした。",
          videoId: currentVideoId,
          items: [
            {
              label: "fetchNicoDataWithComments",
              message,
              action:
                "動画ID、ログイン状態、コメントAPIへの接続、NicoCache_nl の共通ヘルパー処理を確認してください。",
            },
          ],
        });
      }
      setCommentButtonIdle();
    };

    if (loadButton) {
      loadButton.addEventListener("click", () => {
        const inputValue = videoInput ? videoInput.value : "";
        const normalized = normalizeVideoIdFromInput(inputValue);
        if (!normalized) {
          setStatusText(globalStatus, "動画IDを正しく入力してください");
          return;
        }
        if (videoInput) {
          videoInput.value = normalized;
        }
        void handleLoad(normalized);
      });
    }

    if (videoInput) {
      videoInput.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          if (loadButton) {
            loadButton.click();
          }
        }
      });
    }

    if (commentButton) {
      commentButton.addEventListener("click", () => {
        void handleCommentFetch();
      });
    }

    const initialVideoId =
      (await window.commonHelper?.getVideoIdWithFallback?.()) ||
      normalizeVideoIdFromInput(window.location.search) ||
      null;
    if (initialVideoId) {
      if (videoInput) {
        videoInput.value = initialVideoId;
      }
      void handleLoad(initialVideoId);
    } else {
      setStatusText(globalStatus, "動画IDを入力してデータを取得してください");
      setCommentButtonIdle();
    }
  })();
}
