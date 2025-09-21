const WATCH_HOST_PATTERN = /\.nicovideo\.jp$/;
const CACHE_INFO_ENDPOINT = "https://www.nicovideo.jp/cache/info/v2?";
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
    return existsCompletedCache(entry);
  } catch (error) {
    window.logger.warn("キャッシュ情報取得中にエラーが発生したためローカルプレイヤーへの遷移をスキップします", error);
    return false;
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
    const targetUrl = buildStandaloneUrl(videoId);
    if (window.location.pathname === "/local/features/dist/src/video-player/standalone/index.html") {
      return;
    }
    window.logger.info("有料動画かつキャッシュが存在するためローカルプレイヤーへ遷移します", videoId);
    window.location.href = targetUrl;
  } catch (error) {
    window.logger.warn("有料動画判定に失敗したため遷移をスキップします", error);
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
      cc: {
        MainVideoPlayerWidthHeightReturner: async () => {
          await Promise.resolve();
          return 0;
        }
      },
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
