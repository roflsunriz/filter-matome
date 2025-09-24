const URLS = {
  BASE: "https://www.nicovideo.jp"
};

const WATCH_HOST_PATTERN = /\.nicovideo\.jp$/;
const CACHE_INFO_ENDPOINT = "https://www.nicovideo.jp/cache/info/v2?";
const PLAYER_CHOICE_KEY = "nicocache-player-choice";
const hasCompletedCache = (entry, cacheId, completesSet) => {
  if (!cacheId) {
    return false;
  }
  if (completesSet.has(cacheId)) {
    return true;
  }
  const cachesValue = entry.caches;
  if (cachesValue && typeof cachesValue === "object" && !Array.isArray(cachesValue)) {
    const cacheRecord = cachesValue;
    const cache = cacheRecord[cacheId];
    if (cache && typeof cache === "object") {
      const completeValue = cache.complete;
      if (completeValue === true) {
        return true;
      }
    }
  }
  return false;
};
const existsCompletedCache = (entry) => {
  const completesValue = entry.completes;
  const completes = Array.isArray(completesValue) ? completesValue.filter((value) => typeof value === "string") : [];
  const completesSet = new Set(completes);
  const preferredValue = entry.preferred;
  const preferred = typeof preferredValue === "string" ? preferredValue : "";
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
  if (cachesValue && typeof cachesValue === "object" && !Array.isArray(cachesValue)) {
    const cacheRecord = cachesValue;
    return Object.keys(cacheRecord).some((cacheId) => hasCompletedCache(entry, cacheId, completesSet));
  }
  return false;
};
const hasCustomCacheForId = async (cacheId) => {
  try {
    const response = await fetch(`${URLS.BASE}/cache/find_cache?${cacheId}`);
    if (!response.ok) {
      window.logger.warn(`Custom cache search failed for ${cacheId}: ${response.status}`);
      return false;
    }
    const data = await response.json();
    const availablePaths = data && typeof data === "object" && "paths" in data ? data.paths : [];
    return Array.isArray(availablePaths) && availablePaths.length > 0;
  } catch (error) {
    window.logger.warn(`Custom cache search error for ${cacheId}:`, error);
    return false;
  }
};
const hasCacheForVideo = async (videoId) => {
  try {
    const response = await fetch(`${CACHE_INFO_ENDPOINT}${encodeURIComponent(videoId)}`);
    if (!response || !response.ok) {
      window.logger.info("キャッシュ情報取得に失敗したためローカルプレイヤーへの遷移をスキップします", {
        videoId,
        status: response ? response.status : "no-response"
      });
      return false;
    }
    const jsonUnknown = await response.json();
    const data = jsonUnknown;
    if (!data || !(videoId in data)) {
      return false;
    }
    const entryUnknown = data[videoId];
    if (!entryUnknown || typeof entryUnknown !== "object") {
      return false;
    }
    const entry = entryUnknown;
    if (existsCompletedCache(entry)) {
      return true;
    }
    const preferredValue = entry.preferred;
    const preferred = typeof preferredValue === "string" ? preferredValue : "";
    if (preferred && await hasCustomCacheForId(preferred)) {
      return true;
    }
    const cachesValue = entry.caches;
    if (cachesValue && typeof cachesValue === "object" && !Array.isArray(cachesValue)) {
      const cacheRecord = cachesValue;
      for (const cacheId of Object.keys(cacheRecord)) {
        if (await hasCustomCacheForId(cacheId)) {
          return true;
        }
      }
    }
    return false;
  } catch (error) {
    window.logger.warn("キャッシュ情報取得中にエラーが発生したためローカルプレイヤーへの遷移をスキップします", error);
    return false;
  }
};
const getPlayerChoiceSettings = () => {
  try {
    const stored = localStorage.getItem(PLAYER_CHOICE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed && typeof parsed === "object") {
        const settings = parsed;
        return {
          preference: settings.preference === "standalone" || settings.preference === "official" || settings.preference === "ask" ? settings.preference : "ask",
          rememberChoice: typeof settings.rememberChoice === "boolean" ? settings.rememberChoice : false
        };
      }
    }
  } catch (error) {
    window.logger.warn("プレイヤー選択設定の読み込みに失敗しました", error);
  }
  return {
    preference: "ask",
    rememberChoice: false
  };
};
const savePlayerChoiceSettings = (settings) => {
  try {
    localStorage.setItem(PLAYER_CHOICE_KEY, JSON.stringify(settings));
  } catch (error) {
    window.logger.warn("プレイヤー選択設定の保存に失敗しました", error);
  }
};
const isWatchPage = () => {
  return WATCH_HOST_PATTERN.test(window.location.hostname) && window.location.pathname.startsWith("/watch/");
};
const buildStandaloneUrl = (videoId, options = {}) => {
  const params = new URLSearchParams();
  params.set("videoId", videoId);
  if (options.mode) {
    params.set("mode", options.mode);
  }
  if (options.title) {
    params.set("title", options.title);
  }
  return "/local/features/dist/src/video-player/standalone/index.html?" + params.toString();
};
const showPlayerChoice = (_videoId) => {
  return new Promise((resolve) => {
    let isResolved = false;
    let rememberChoice = false;
    const resolveChoice = (choice) => {
      if (isResolved) return;
      isResolved = true;
      if (rememberChoice) {
        savePlayerChoiceSettings({
          preference: choice,
          rememberChoice: true
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
    const toastElement = window.toastr.info(messageHtml, "キャッシュが利用可能です", {
      timeOut: 0,
      // 自動で閉じない
      closeButton: false,
      tapToDismiss: false,
      escapeHtml: false,
      positionClass: "toast-top-center"
    });
    if (!toastElement) {
      window.logger.warn("トースト通知の作成に失敗しました。デフォルトで公式プレイヤーを使用します。");
      resolve("official");
      return;
    }
    const standaloneBtn = toastElement.querySelector("#btn-standalone-player");
    const officialBtn = toastElement.querySelector("#btn-official-player");
    const rememberCheckbox = toastElement.querySelector("#remember-choice");
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
    setTimeout(() => {
      if (!isResolved) {
        window.toastr.removeToast(toastElement);
        window.logger.info("プレイヤー選択がタイムアウトしました。公式プレイヤーを使用します。");
        resolveChoice("official");
      }
    }, 1e4);
  });
};
const initWatchPageRouter = async () => {
  if (!isWatchPage()) {
    return;
  }
  try {
    const result = await window.commonHelper.fetchWatchPage();
    if (!result) {
      return;
    }
    const apiData = result.apiData;
    const video = apiData.video;
    if (!video) {
      return;
    }
    const videoId = typeof video.id === "string" ? video.id : null;
    const watchable = typeof video.watchableUserTypeForPayment === "string" ? video.watchableUserTypeForPayment : video.watchableUserType;
    if (!videoId || !watchable || watchable === "all") {
      return;
    }
    const cacheExists = await hasCacheForVideo(videoId);
    if (!cacheExists) {
      window.logger.info("有料動画ですがキャッシュが存在しないためローカルプレイヤーへの遷移をスキップします", videoId);
      return;
    }
    if (window.location.pathname === "/local/features/dist/src/video-player/standalone/index.html") {
      return;
    }
    const settings = getPlayerChoiceSettings();
    let playerChoice;
    if (settings.rememberChoice && settings.preference !== "ask") {
      playerChoice = settings.preference;
      window.logger.info(`記憶された設定により${playerChoice === "standalone" ? "ローカル" : "公式"}プレイヤーを使用します`, videoId);
    } else {
      window.logger.info("有料動画かつキャッシュが存在するためプレイヤー選択を表示します", videoId);
      playerChoice = await showPlayerChoice(videoId);
    }
    if (playerChoice === "standalone") {
      const targetUrl = buildStandaloneUrl(videoId);
      window.logger.info("ローカルプレイヤーへ遷移します", videoId);
      window.location.href = targetUrl;
    } else {
      window.logger.info("公式プレイヤーで継続します", videoId);
    }
  } catch (error) {
    window.logger.warn("プレイヤー選択処理に失敗したため公式プレイヤーで継続します", error);
  }
};

const DELETED_PLAYER_WINDOW_FEATURES = "noopener,noreferrer";
const extractVideoId = (value) => {
  const match = value.match(/[ns][mo]\d+/i);
  return match ? match[0] : value;
};
const ensureNicoCacheBase = () => {
  if (!window.NicoCache_nl) {
    window.NicoCache_nl = {
      watch: {
        getVideoID: () => "",
        apiData: {},
        addEventListener: () => {
        }
      },
      cacheUtil: {
        formatCacheInfo: async () => {
          await Promise.resolve();
          return false;
        }
      },
      // ccはwindow.commonHelperに移行し、MainVideoPlayerWidthHeightReturnerも不要になったため削除
      handleError: () => {
      }
    };
  }
};
const setupDeletedVideoPlayerInterface = () => {
  ensureNicoCacheBase();
  let popupWindow = null;
  let lastVideoId = null;
  window.NicoCache_nl.deletedVideoPlayer = {
    play: (videoIdOrUrl, title) => {
      const videoId = extractVideoId(videoIdOrUrl);
      const url = buildStandaloneUrl(videoId, {
        mode: "deleted",
        title
      });
      if (popupWindow && !popupWindow.closed) {
        if (lastVideoId === videoId) {
          popupWindow.focus();
          return;
        }
        popupWindow.location.href = url;
        popupWindow.focus();
        lastVideoId = videoId;
        return;
      }
      popupWindow = window.open(url, "_blank", DELETED_PLAYER_WINDOW_FEATURES) ?? null;
      if (!popupWindow) {
        window.logger.warn("削除動画プレーヤーのウィンドウを開けませんでした。ポップアップブロックを解除してください。");
        return;
      }
      lastVideoId = videoId;
    },
    hide: () => {
      if (popupWindow && !popupWindow.closed) {
        popupWindow.close();
      }
      popupWindow = null;
      lastVideoId = null;
    },
    help: () => {
      window.logger.info('window.NicoCache_nl.deletedVideoPlayer.play("sm9"); でスタンドアロンプレイヤーを開けます');
    }
  };
};
const isStandalonePage = () => {
  return window.location.pathname.startsWith("/local/features/dist/src/video-player/");
};
const bootstrap = () => {
  setupDeletedVideoPlayerInterface();
  if (isStandalonePage()) {
    window.logger.info("スタンドアロンプレイヤーページではrouterは実行しません");
    return;
  }
  void initWatchPageRouter();
};
bootstrap();
//# sourceMappingURL=video-player.es.js.map
