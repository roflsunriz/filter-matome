import { ToastConfig, PlayerSettings, CacheManagementConfig, CommentRendererConfig } from '../../types/index.js';

// URLの設定
export const URLS = {
  BASE: "https://www.nicovideo.jp"
};

// トースト通知の設定
export const TOAST_CONFIG: ToastConfig = {
  MODES: {
    INFO: "info",
    SUCCESS: "success",
    WARNING: "warning",
    ERROR: "error"
  },
  TIMEOUTS: {
    PLAYABLE_MS: 25000,  // 25秒
    WARN_MS: 15000,      // 15秒
    START_MS: 5000,      // 5秒
    ERROR_MS: 45000      // 45秒
  }
};

// 動画監視の設定
export const WATCH_CONFIG = {
  SELECTORS: {
    VIDEO: "video",
    PLAYER: "cursor_inherit ring_none [&_[data-name=storyboard-content]]:filter_[blur(8px)_brightness(0.9)]",
    PARENT_PLAYER: ".grid-area_\\[player\\]",
    PLAY_BUTTON: "cursor_pointer"
  },
  URL_PATTERN: /^https?:\/\/www\.nicovideo\.jp\/watch\//,
  CHECK_INTERVAL_MS: 1000 // ページ読み込み後の待機時間
};

// プレイヤー設定
export const PLAYER_SETTINGS: PlayerSettings = {
  CONTROLS_MODE: {
    ALWAYS: "always",
    HOVER: "hover"
  },
  COMMENT: {
    OPACITY: {
      DEFAULT: 0.75,
      MIN: 0.1,
      MAX: 1.0,
      STEP: 0.05
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
      PURPLE: "#800080"
    },
    NG: {
      MAX_WORDS: 50,
      MAX_REGEX: 10
    }
  }
};

// キャッシュ管理の設定
export const CACHE_MANAGEMENT: CacheManagementConfig = {
  TIME_THRESHOLD_MS: 9 * 60 * 1000,         // 9分（ミリ秒単位）
  CACHE_SIZE_THRESHOLD_BYTES: 18 * 1024 * 1024, // 18MB
  CHECK_INTERVAL_MS: 30 * 1000,             // 30秒ごとにチェック
  CLEANUP_BUFFER_SECONDS: 5                  // クリーンアップ時に保持する秒数
};

// コメントレンダラーの設定
export const COMMENT_RENDERER_CONFIG: CommentRendererConfig = {
  OPACITY: 0.75,                   // コメントの不透明度
  COMMENT_DURATION_MS: 6000,       // コメントの表示時間（ミリ秒）
  DEFAULT_FONT_SIZE: 32,           // デフォルトフォントサイズ
  MIN_FONT_SIZE: 16,               // 最小フォントサイズ
  DEFAULT_COLOR: "#FFFFFF",        // デフォルト色
  MAX_COMMENT_LENGTH: 75,          // コメント最大文字数（切り捨て用）
  STROKE_WIDTH: 4,                 // 縁取り幅
  STROKE_COLOR: "#000000",         // 縁取り色
  VPOS_THRESHOLD_MS: 100,          // 近傍とみなすミリ秒差
  MAX_LANES_LIMIT: 100,            // レーン数の上限
  RENDER_FPS: 60,                  // レンダリングフレームレート
  CLEANUP_INTERVAL_MS: 5000,       // クリーンアップ間隔
  VIRTUAL_EXTEND_RATIO: 0.5        // 仮想拡張キャンバスの比率（実キャンバス幅の50%）
};

// プレイヤーのUI関連設定
export const PLAYER_UI_CONFIG = {
  CONTROLS_HIDE_DELAY_MS: 2000,    // コントロールが自動的に隠れるまでの時間
  SLIDER_HEIGHT_DEFAULT: 4,        // スライダーのデフォルト高さ
  SLIDER_HEIGHT_HOVER: 6,          // ホバー時のスライダー高さ
  BUFFERING_DISPLAY_DELAY_MS: 500  // バッファリング表示までの遅延
}; 