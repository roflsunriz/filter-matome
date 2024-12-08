"use strict";

// URL関連の定数をオブジェクトにまとめる
const URLS = {
  BASE: 'https://www.nicovideo.jp',
  getUrls(videoId) {
    return {
      auto: `/cache/${videoId}/auto/movie`,
      ref: `/cache/file/nicocachenl_refcache=${videoId}.hls//master.m3u8`,
      hls: `/local/CustomCache/${videoId}.hls/master.m3u8`,
      mp4: `/local/CustomCache/${videoId}.mp4`
    };
  }
};

// トースト通知の設定をまとめる
const TOAST_CONFIG = {
  MODES: {
    INFO: 'info',
    SUCCESS: 'success',
    WARNING: 'warning',
    ERROR: 'error'
  },
  TIMEOUTS: {
    PLAYABLE: 25000,
    WARN: 15000,
    START: 5000,
    ERROR: 45000
  }
};

// 動画遷移の監視用の設定を追加
const WATCH_CONFIG = {
  SELECTORS: {
    VIDEO: "video",
    PLAYER: "cursor_inherit ring_none [&_[data-name=storyboard-content]]:filter_[blur(8px)_brightness(0.9)]",
    PLAY_BUTTON: "cursor_pointer"
  },
  URL_PATTERN: /^https?:\/\/www\.nicovideo\.jp\/watch\//
};

const expired_sourceChanger_sourceNothing2 = async () => {
  const videoId = NicoCache_nl.watch.getVideoID();
  const videoTitle = NicoCache_nl.watch.apiData.video.title;
  const payment = NicoCache_nl.watch.apiData.payment.video.watchableUserType;
  
  if (payment === "all") return;

  // 必要なDOM要素の取得
  const video = cc.t("video")[0];
  const player = cc.c("cursor_inherit ring_none [&_[data-name=storyboard-content]]:filter_[blur(8px)_brightness(0.9)]")[0];
  const playButton = cc.c("cursor_pointer")[5];

  // URLの生成
  const urls = URLS.getUrls(videoId);
  const fullUrls = Object.entries(urls).map(([key, path]) => ({
    type: key,
    url: URLS.BASE + path
  }));

  // トースト通知の表示
  const showToast = (mode, title, middle = "", low = "", timeout) => {
    window.cc.Toast({ mode, title, middle, low, timeout });
  };

  // 再生処理
  const playVideo = (url) => {
    cc.c("top_\[50\%\]")[0].remove();
    video.src = url;
    video.play();
    player.dispatchEvent(new MouseEvent('mouseover', {
      view: window,
      bubbles: true,
      cancelable: true
    }));
    playButton.click();
  };

  // 開始通知
  showToast(TOAST_CONFIG.MODES.INFO, "needPaymentsVideo.jsの動作を開始しました", videoTitle, videoId, TOAST_CONFIG.TIMEOUTS.START);

  // 順番にURLをチェックして再生
  for (const {type, url} of fullUrls) {
    try {
      const exists = await window.cc.checkCache404(url);
      if (exists) {
        playVideo(url);
        showToast(TOAST_CONFIG.MODES.SUCCESS, `${url}で再生します。`, "", "", TOAST_CONFIG.TIMEOUTS.PLAYABLE);
        return;
      }
      showToast(TOAST_CONFIG.MODES.WARNING, `${url}はありませんでした。`, "", "", TOAST_CONFIG.TIMEOUTS.WARN);
    } catch (error) {
      console.error(`Error checking ${type} cache:`, error);
    }
  }

  // すべてのソースが見つからなかった場合
  showToast(TOAST_CONFIG.MODES.ERROR, "失敗しました。HLSとMP4の動画ソースが見つかりませんでした。", "", "", TOAST_CONFIG.TIMEOUTS.ERROR);
  throw new Error("Any of Cache Source Not Found! Aborted!");
};

// メイン処理を関数としてリファクタリング
const handleVideoChange = async () => {
  const videoId = NicoCache_nl.watch.getVideoID();
  if (!videoId) return;
  
  await expired_sourceChanger_sourceNothing2();
};

// URL変更の監視処理を追加
const setupUrlChangeListener = () => {
  let lastUrl = location.href;
  
  // URL変更を検知する
  new MutationObserver(() => {
    const currentUrl = location.href;
    if (currentUrl !== lastUrl && WATCH_CONFIG.URL_PATTERN.test(currentUrl)) {
      lastUrl = currentUrl;
      setTimeout(handleVideoChange, 1000); // 動画情報の読み込みを待つ
    }
  }).observe(document.querySelector('body'), {
    childList: true,
    subtree: true
  });
};

// イベントリスナーの修正
window.addEventListener("load", () => {
  NicoCache_nl.watch.addEventListener("initialized", () => {
    expired_sourceChanger_sourceNothing2();
    setupUrlChangeListener();
  });
  
  // pushState/replaceStateのオーバーライド
  const originalPushState = history.pushState;
  const originalReplaceState = history.replaceState;
  
  history.pushState = function() {
    originalPushState.apply(this, arguments);
    handleVideoChange();
  };
  
  history.replaceState = function() {
    originalReplaceState.apply(this, arguments);
    handleVideoChange();
  };
});