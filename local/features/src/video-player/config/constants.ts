import { ToastConfig, PlayerSettings } from "@/types/index.js";

// URLの設定
export const URLS = {
  BASE: "https://www.nicovideo.jp",
};

// トースト通知の設定
export const TOAST_CONFIG: ToastConfig = {
  MODES: {
    INFO: "info",
    SUCCESS: "success",
    WARNING: "warning",
    ERROR: "error",
  },
  TIMEOUTS: {
    PLAYABLE_MS: 1500, // 1.5秒
    WARN_MS: 1500, // 1.5秒
    START_MS: 1500, // 1.5秒
    ERROR_MS: 1500, // 1.5秒
  },
};

// 動画監視の設定
export const WATCH_CONFIG = {
  SELECTORS: {
    VIDEO: "video",
    PLAYER:
      "cursor_inherit ring_none [&_[data-name=storyboard-content]]:filter_[blur(8px)_brightness(0.9)]",
    PARENT_PLAYER: ".grid-area_\\[player\\]",
    PLAY_BUTTON: "cursor_pointer",
  },
  URL_PATTERN: /^https?:\/\/www\.nicovideo\.jp\/watch\//,
  CHECK_INTERVAL_MS: 1000, // ページ読み込み後の待機時間
};

// プレイヤー設定
export const PLAYER_SETTINGS: PlayerSettings = {
  CONTROLS_MODE: {
    ALWAYS: "always",
    HOVER: "hover",
  },
  VOLUME: {
    DEFAULT: 0.3,
    MIN: 0,
    MAX: 1,
  },
  COMMENT: {
    OPACITY: {
      DEFAULT: 0.75,
      MIN: 0.1,
      MAX: 1.0,
      STEP: 0.05,
    },
    COLORS: {
      WHITE: "#FFFFFF",
      RED: "#FF0000",
      BLUE: "#0000FF",
      GREEN: "#00FF00",
      YELLOW: "#FFFF00",
      CYAN: "#00FFFF",
      MAGENTA: "#FF00FF",
      ORANGE: "#FFA500",
      PURPLE: "#800080",
    },
    NG: {
      MAX_WORDS: 50,
      MAX_REGEX: 10,
    },
  },
};
