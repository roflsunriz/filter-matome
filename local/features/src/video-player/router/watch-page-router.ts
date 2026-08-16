import {
  fetchNicoVideoInfo,
  isNicoVideoInfoError,
} from "@/common/video-info-api";
import {
  fetchCacheInfoEntry,
  hasCompletedCache,
} from "@/common/cache-info-api";
import { URLS } from "@/video-player/config/constants";
import { addNavigationListener } from "@/runtime/navigation";

type PlayerPreference = "standalone" | "official" | "ask";

interface PlayerChoiceSettings {
  preference: PlayerPreference;
  rememberChoice: boolean;
}

const WATCH_HOST_PATTERN = /\.nicovideo\.jp$/;
const PLAYER_CHOICE_KEY = "nicocache-player-choice";
const UNAVAILABLE_MESSAGE = "お探しの動画は視聴できません";

/**
 * CustomCacheReturnerからキャッシュ情報を取得してキャッシュ存在を確認
 * @param cacheId キャッシュIDまたは動画ID
 * @returns キャッシュが存在する場合はtrue
 */
const hasCustomCacheForId = async (cacheId: string): Promise<boolean> => {
  try {
    const response = await fetch(`${URLS.BASE}/cache/find_cache?${cacheId}`);

    if (!response.ok) {
      window.logger.warn(
        `Custom cache search failed for ${cacheId}: ${response.status}`,
      );
      return false;
    }

    const data: unknown = await response.json();
    const availablePaths = (
      data &&
      typeof data === "object" &&
      "paths" in (data as Record<string, unknown>)
        ? (data as { paths?: unknown }).paths
        : []
    ) as unknown[];

    // パスが存在すればキャッシュありとみなす
    return Array.isArray(availablePaths) && availablePaths.length > 0;
  } catch (error) {
    window.logger.warn(`Custom cache search error for ${cacheId}:`, error);
    return false;
  }
};

const hasCacheForVideo = async (videoId: string): Promise<boolean> => {
  try {
    const entry = await fetchCacheInfoEntry(videoId);
    if (hasCompletedCache(entry)) {
      return true;
    }

    // v3はCMAF/Domand HLS専用なので、拡張管理のキャッシュは動画IDで別途探す。
    return await hasCustomCacheForId(videoId);
  } catch (error) {
    window.logger.warn(
      "キャッシュ情報取得中にエラーが発生したためローカルプレイヤーへの遷移をスキップします",
      error,
    );
    return false;
  }
};

const getPlayerChoiceSettings = (): PlayerChoiceSettings => {
  try {
    const stored = localStorage.getItem(PLAYER_CHOICE_KEY);
    if (stored) {
      const parsed: unknown = JSON.parse(stored);
      if (parsed && typeof parsed === "object") {
        const settings = parsed as Partial<PlayerChoiceSettings>;
        return {
          preference:
            settings.preference === "standalone" ||
            settings.preference === "official" ||
            settings.preference === "ask"
              ? settings.preference
              : "ask",
          rememberChoice:
            typeof settings.rememberChoice === "boolean"
              ? settings.rememberChoice
              : false,
        };
      }
    }
  } catch (error) {
    window.logger.warn("プレイヤー選択設定の読み込みに失敗しました", error);
  }

  return {
    preference: "ask",
    rememberChoice: false,
  };
};

const savePlayerChoiceSettings = (settings: PlayerChoiceSettings): void => {
  try {
    localStorage.setItem(PLAYER_CHOICE_KEY, JSON.stringify(settings));
  } catch (error) {
    window.logger.warn("プレイヤー選択設定の保存に失敗しました", error);
  }
};

const isWatchPage = (): boolean => {
  return (
    WATCH_HOST_PATTERN.test(window.location.hostname) &&
    window.location.pathname.startsWith("/watch/")
  );
};

const getCurrentWatchVideoId = (): string | null => {
  const match = window.location.pathname.match(/\/watch\/([a-z]{2}\d+)/i);
  return match ? match[1] : null;
};

const getCurrentDocumentTitle = (): string | undefined => {
  const apiTitle = window.NicoCache_nl?.watch?.apiData?.video?.title;
  if (apiTitle && apiTitle.trim()) {
    return apiTitle;
  }

  const ogTitle = document.querySelector<HTMLMetaElement>(
    "meta[property='og:title']",
  )?.content;
  if (ogTitle && ogTitle.trim()) {
    return ogTitle;
  }

  const title = document.title.replace(/\s*-\s*ニコニコ動画$/, "").trim();
  return title || undefined;
};

const detectUnavailableWatchPage = (): boolean => {
  const errorMessage = document.querySelector(".fs_xl.fw_bold");
  if (errorMessage?.textContent?.includes(UNAVAILABLE_MESSAGE)) {
    return true;
  }

  if (!document.body) {
    return false;
  }

  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode(node) {
        return typeof node.nodeValue === "string" &&
          node.nodeValue.includes(UNAVAILABLE_MESSAGE)
          ? NodeFilter.FILTER_ACCEPT
          : NodeFilter.FILTER_SKIP;
      },
    },
  );

  let currentNode = walker.nextNode();
  while (currentNode) {
    if (currentNode.nodeValue?.includes(UNAVAILABLE_MESSAGE)) {
      return true;
    }
    currentNode = walker.nextNode();
  }

  return false;
};

const checkDeletedByVideoInfo = async (videoId: string): Promise<boolean> => {
  try {
    await fetchNicoVideoInfo(videoId);
    return false;
  } catch (error) {
    if (isNicoVideoInfoError(error)) {
      return error.code === "DELETED" || error.code === "NOT_FOUND";
    }
    window.logger.warn("動画情報APIによる削除動画判定に失敗しました", error);
    return false;
  }
};

const routeDeletedVideo = (
  videoId: string,
  detection: { isUnavailable: boolean; isDeleted: boolean },
): boolean => {
  if (
    window.location.pathname ===
    "/local/features/dist/pages/video-player/index.html"
  ) {
    return false;
  }

  if (!detection.isUnavailable && !detection.isDeleted) {
    return false;
  }

  const deletedVideoPlayer = window.NicoCache_nl?.deletedVideoPlayer;
  if (!deletedVideoPlayer) {
    window.logger.warn(
      "削除動画プレーヤーのインターフェースが見つかりません",
      videoId,
    );
    return false;
  }

  window.logger.info("削除動画プレーヤーを起動します", {
    videoId,
    isUnavailable: detection.isUnavailable,
    isDeleted: detection.isDeleted,
  });
  deletedVideoPlayer.play(videoId, getCurrentDocumentTitle());
  return true;
};

let spaNavigationListenerInstalled = false;
let isRoutingInProgress = false;
let rerunRoutingRequested = false;
let currentRoutingPromise: Promise<void> | null = null;
let lastHandledUrl: string | null = null;

const installSpaNavigationListener = (onChange: () => void): void => {
  if (spaNavigationListenerInstalled) {
    return;
  }

  spaNavigationListenerInstalled = true;

  addNavigationListener(() => {
    onChange();
  });
};

const requestWatchPageRouting = (
  executor: () => Promise<void>,
): Promise<void> => {
  if (isRoutingInProgress) {
    rerunRoutingRequested = true;
    return currentRoutingPromise ?? Promise.resolve();
  }

  isRoutingInProgress = true;
  currentRoutingPromise = (async () => {
    try {
      await executor();
    } finally {
      isRoutingInProgress = false;
      if (rerunRoutingRequested) {
        rerunRoutingRequested = false;
        void requestWatchPageRouting(executor);
      } else {
        currentRoutingPromise = null;
      }
    }
  })();

  return currentRoutingPromise;
};

export interface StandaloneUrlOptions {
  mode?: "normal" | "deleted";
  title?: string;
}

export const buildStandaloneUrl = (
  videoId: string,
  options: StandaloneUrlOptions = {},
): string => {
  const params = new URLSearchParams();
  params.set("videoId", videoId);
  if (options.mode) {
    params.set("mode", options.mode);
  }
  if (options.title) {
    params.set("title", options.title);
  }
  return (
    "/local/features/dist/pages/video-player/index.html?" + params.toString()
  );
};

const showPlayerChoice = (
  _videoId: string,
): Promise<"standalone" | "official"> => {
  return new Promise((resolve) => {
    let isResolved = false;
    let rememberChoice = false;

    const resolveChoice = (choice: "standalone" | "official"): void => {
      if (isResolved) return;
      isResolved = true;

      if (rememberChoice) {
        savePlayerChoiceSettings({
          preference: choice,
          rememberChoice: true,
        });
      }

      resolve(choice);
    };

    const messageHtml = `
      <div style="margin-bottom: 12px;">
        <strong>プレイヤーを選択してください</strong>
      </div>
      <div style="margin-bottom: 8px;">
        <button id="btn-standalone-player" style="
          background: #0066cc; 
          color: white; 
          border: none; 
          padding: 8px 16px; 
          margin-right: 8px; 
          border-radius: 4px; 
          cursor: pointer;
          font-size: 13px;
        ">ローカルプレイヤーで再生</button>
        <button id="btn-official-player" style="
          background: #666; 
          color: white; 
          border: none; 
          padding: 8px 16px; 
          border-radius: 4px; 
          cursor: pointer;
          font-size: 13px;
        ">公式プレイヤーで継続</button>
      </div>
      <div>
        <label style="font-size: 12px; color: #ccc; cursor: pointer;">
          <input type="checkbox" id="remember-choice" style="margin-right: 4px;"> 
          今後自動で選択する
        </label>
      </div>
    `;

    const toastElement = window.toastr.info(
      messageHtml,
      "キャッシュが利用可能です",
      {
        timeOut: 0, // 自動で閉じない
        closeButton: false,
        tapToDismiss: false,
        escapeHtml: false,
        positionClass: "toast-top-center",
      },
    );

    if (!toastElement) {
      window.logger.warn(
        "トースト通知の作成に失敗しました。デフォルトで公式プレイヤーを使用します。",
      );
      resolve("official");
      return;
    }

    // ボタンのイベントリスナーを設定
    const standaloneBtn = toastElement.querySelector("#btn-standalone-player");
    const officialBtn = toastElement.querySelector("#btn-official-player");
    const rememberCheckbox = toastElement.querySelector(
      "#remember-choice",
    ) as HTMLInputElement;

    if (standaloneBtn) {
      standaloneBtn.addEventListener("click", () => {
        rememberChoice = rememberCheckbox?.checked ?? false;
        window.toastr.removeToast(toastElement);
        resolveChoice("standalone");
      });
    }

    if (officialBtn) {
      officialBtn.addEventListener("click", () => {
        rememberChoice = rememberCheckbox?.checked ?? false;
        window.toastr.removeToast(toastElement);
        resolveChoice("official");
      });
    }

    // 10秒後にタイムアウトして公式プレイヤーを選択
    setTimeout(() => {
      if (!isResolved) {
        window.toastr.removeToast(toastElement);
        window.logger.info(
          "プレイヤー選択がタイムアウトしました。公式プレイヤーを使用します。",
        );
        resolveChoice("official");
      }
    }, 10000);
  });
};

const routeWatchPageIfNeeded = async (): Promise<void> => {
  try {
    const currentVideoId = getCurrentWatchVideoId();
    if (!currentVideoId) {
      return;
    }

    if (
      routeDeletedVideo(currentVideoId, {
        isUnavailable: detectUnavailableWatchPage(),
        isDeleted: false,
      })
    ) {
      return;
    }

    const result = await window.commonHelper.fetchWatchPage();
    if (!result) {
      if (
        routeDeletedVideo(currentVideoId, {
          isUnavailable: false,
          isDeleted: await checkDeletedByVideoInfo(currentVideoId),
        })
      ) {
        return;
      }
      return;
    }

    const apiData = result.apiData as Record<string, unknown>;
    const video = apiData.video as Record<string, unknown> | undefined;
    if (!video) {
      if (
        routeDeletedVideo(currentVideoId, {
          isUnavailable: false,
          isDeleted: await checkDeletedByVideoInfo(currentVideoId),
        })
      ) {
        return;
      }
      return;
    }

    const videoId = typeof video.id === "string" ? video.id : currentVideoId;
    const watchable =
      typeof video.watchableUserTypeForPayment === "string"
        ? video.watchableUserTypeForPayment
        : (video as { watchableUserType?: string }).watchableUserType;

    if (!videoId || !watchable || watchable === "all") {
      return;
    }

    const cacheExists = await hasCacheForVideo(videoId);
    if (!cacheExists) {
      window.logger.info(
        "有料動画ですがキャッシュが存在しないためローカルプレイヤーへの遷移をスキップします",
        videoId,
      );
      return;
    }

    // 既にスタンドアロンプレイヤーにいる場合は何もしない
    if (
      window.location.pathname ===
      "/local/features/dist/pages/video-player/index.html"
    ) {
      return;
    }

    // ユーザー設定を確認
    const settings = getPlayerChoiceSettings();

    let playerChoice: "standalone" | "official";

    if (settings.rememberChoice && settings.preference !== "ask") {
      // 記憶された設定を使用
      playerChoice = settings.preference;
      window.logger.info(
        `記憶された設定により${
          playerChoice === "standalone" ? "ローカル" : "公式"
        }プレイヤーを使用します`,
        videoId,
      );
    } else {
      // ユーザー選択UIを表示
      window.logger.info(
        "有料動画かつキャッシュが存在するためプレイヤー選択を表示します",
        videoId,
      );
      playerChoice = await showPlayerChoice(videoId);
    }

    if (playerChoice === "standalone") {
      const targetUrl = buildStandaloneUrl(videoId);
      window.logger.info("ローカルプレイヤーへ遷移します", videoId);
      window.location.href = targetUrl;
    } else {
      window.logger.info("公式プレイヤーで継続します", videoId);
      // 公式プレイヤーで継続（何もしない）
    }
  } catch (error) {
    window.logger.warn(
      "プレイヤー選択処理に失敗したため公式プレイヤーで継続します",
      error,
    );
  }
};

const runWatchPageRouting = async (): Promise<void> => {
  const currentUrl = window.location.href;

  if (!isWatchPage()) {
    lastHandledUrl = currentUrl;
    return;
  }

  if (lastHandledUrl === currentUrl) {
    return;
  }

  await routeWatchPageIfNeeded();
  lastHandledUrl = currentUrl;
};

export const initWatchPageRouter = async (): Promise<void> => {
  installSpaNavigationListener(() => {
    void requestWatchPageRouting(runWatchPageRouting);
  });

  await requestWatchPageRouting(runWatchPageRouting);
};
