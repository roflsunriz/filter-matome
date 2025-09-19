const WATCH_HOST_PATTERN = /\.nicovideo\.jp$/;
const isWatchPage = () => {
  return WATCH_HOST_PATTERN.test(window.location.hostname) && window.location.pathname.startsWith("/watch/");
};
const buildStandaloneUrl = (videoId) => {
  const params = new URLSearchParams();
  params.set("videoId", videoId);
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
    const targetUrl = buildStandaloneUrl(videoId);
    if (window.location.pathname === "/local/features/dist/src/video-player/standalone/index.html") {
      return;
    }
    window.logger.info("有料動画を検知したためローカルプレイヤーへ遷移します", videoId);
    window.location.href = targetUrl;
  } catch (error) {
    window.logger.warn("有料動画判定に失敗したため遷移をスキップします", error);
  }
};

const isStandalonePage = () => {
  return window.location.pathname.startsWith("/local/features/dist/src/video-player/");
};
const bootstrap = () => {
  if (isStandalonePage()) {
    window.logger.info("スタンドアロンプレイヤーページではrouterは実行しません");
    return;
  }
  void initWatchPageRouter();
};
bootstrap();
//# sourceMappingURL=video-player.es.js.map
