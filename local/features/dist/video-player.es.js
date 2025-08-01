const URLS = {
  BASE: "https://www.nicovideo.jp"
};
const TOAST_CONFIG = {
  MODES: {
    INFO: "info",
    SUCCESS: "success",
    WARNING: "warning",
    ERROR: "error"
  },
  TIMEOUTS: {
    PLAYABLE_MS: 25e3,
    // 25秒
    WARN_MS: 15e3,
    // 15秒
    START_MS: 5e3,
    // 5秒
    ERROR_MS: 45e3
    // 45秒
  }
};
const WATCH_CONFIG = {
  SELECTORS: {
    VIDEO: "video",
    PARENT_PLAYER: ".grid-area_\\[player\\]"},
  URL_PATTERN: /^https?:\/\/www\.nicovideo\.jp\/watch\//,
  CHECK_INTERVAL_MS: 1e3
  // ページ読み込み後の待機時間
};
const PLAYER_SETTINGS = {
  CONTROLS_MODE: {
    ALWAYS: "always",
    HOVER: "hover"
  },
  COMMENT: {
    OPACITY: {
      DEFAULT: 0.75,
      MIN: 0.1,
      MAX: 1,
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
const CACHE_MANAGEMENT = {
  TIME_THRESHOLD_MS: 9 * 60 * 1e3,
  // 9分（ミリ秒単位）
  CACHE_SIZE_THRESHOLD_BYTES: 18 * 1024 * 1024,
  // 18MB
  CHECK_INTERVAL_MS: 30 * 1e3,
  // 30秒ごとにチェック
  CLEANUP_BUFFER_SECONDS: 5
  // クリーンアップ時に保持する秒数
};
const COMMENT_RENDERER_CONFIG = {
  OPACITY: 0.75,
  // コメントの不透明度
  COMMENT_DURATION_MS: 6e3,
  // コメントの表示時間（ミリ秒）
  DEFAULT_FONT_SIZE: 32,
  // デフォルトフォントサイズ
  MIN_FONT_SIZE: 16,
  // 最小フォントサイズ
  DEFAULT_COLOR: "#FFFFFF",
  // デフォルト色
  MAX_COMMENT_LENGTH: 75,
  // コメント最大文字数（切り捨て用）
  STROKE_WIDTH: 4,
  // 縁取り幅
  STROKE_COLOR: "#000000",
  // 縁取り色
  VPOS_THRESHOLD_MS: 100,
  // 近傍とみなすミリ秒差
  MAX_LANES_LIMIT: 100,
  // レーン数の上限
  RENDER_FPS: 60,
  // レンダリングフレームレート
  CLEANUP_INTERVAL_MS: 5e3,
  // クリーンアップ間隔
  VIRTUAL_EXTEND_RATIO: 0.5
  // 仮想拡張キャンバスの比率（実キャンバス幅の50%）
};

class UrlManager {
  constructor() {
    this.baseUrl = URLS.BASE;
  }
  /**
   * 指定された動画IDに対する利用可能なURLを取得します
   * @param videoId ニコニコ動画のID
   * @returns 利用可能なURLの情報
   */
  async getUrls(videoId) {
    try {
      const response = await fetch(`${this.baseUrl}/cache/find_cache?${videoId}`);
      if (!response.ok) {
        throw new Error(`Cache search failed: ${response.status}`);
      }
      const data = await response.json();
      const availablePaths = data.paths || [];
      const urls = {
        auto: `/cache/${videoId}/auto/movie`,
        ref: `/cache/file/nicocachenl_refcache=${videoId}.hls//master.m3u8`
      };
      for (const path of availablePaths) {
        if (typeof path === "string") {
          if (path.endsWith(".hls")) {
            urls.customHls = `/local/CustomCache/${path}/master.m3u8`;
          } else if (path.endsWith(".mp4")) {
            urls.customMp4 = `/local/CustomCache/${path}`;
          }
        }
      }
      if (!urls.customHls) urls.hls = `/local/CustomCache/${videoId}.hls/master.m3u8`;
      if (!urls.customMp4) urls.mp4 = `/local/CustomCache/${videoId}.mp4`;
      return urls;
    } catch (error) {
      window.logger.error("キャッシュ検索エラー:", error);
      return {
        auto: `/cache/${videoId}/auto/movie`,
        ref: `/cache/file/nicocachenl_refcache=${videoId}.hls//master.m3u8`,
        hls: `/local/CustomCache/${videoId}.hls/master.m3u8`,
        mp4: `/local/CustomCache/${videoId}.mp4`
      };
    }
  }
  /**
   * URLが存在するかチェック
   * @param url チェックするURL
   * @returns 存在する場合はtrue
   */
  async checkUrlExists(url) {
    try {
      if (window.commonHelper && typeof window.commonHelper.checkCache404 === "function") {
        const result = await window.commonHelper.checkCache404(url);
        if (typeof result === "boolean") {
          return result;
        }
      }
      const response = await fetch(url, { method: "HEAD" });
      return response.ok;
    } catch (error) {
      window.logger.error(`URL存在チェックエラー (${url}):`, error);
      return false;
    }
  }
  /**
   * 相対URLを絶対URLに変換
   */
  getFullUrl(path) {
    if (path.startsWith("http")) return path;
    return `${this.baseUrl}${path}`;
  }
  /**
   * 複数の候補から有効なURLを検索
   * @param videoId 動画ID
   * @returns 最初に見つかった有効なURL
   */
  async findFirstAvailableUrl(videoId) {
    const urls = await this.getUrls(videoId);
    const urlKeys = [
      "customHls",
      "customMp4",
      "hls",
      "mp4",
      "auto",
      "ref"
    ];
    for (const key of urlKeys) {
      const url = urls[key];
      if (url) {
        const fullUrl = this.getFullUrl(url);
        const exists = await this.checkUrlExists(fullUrl);
        if (exists) {
          return fullUrl;
        }
      }
    }
    return null;
  }
}

class CacheManager {
  /**
   * @param videoElement 管理対象のビデオ要素
   * @param hlsInstance HLS.jsのインスタンス（HLS再生時のみ）
   * @param url 現在の動画URL
   */
  constructor(videoElement, hlsInstance, url) {
    this.playStartTime = 0;
    this.lastCleanupTime = 0;
    this.cacheCheckInterval = null;
    this.hls = null;
    this.currentUrl = "";
    // イベントハンドラー
    this.handleEmptied = () => {
      if (this.cacheCheckInterval !== null) {
        window.clearInterval(this.cacheCheckInterval);
        this.cacheCheckInterval = null;
      }
    };
    this.handleWaiting = () => {
      this.addBufferingDisplay();
    };
    this.handlePlaying = () => {
      this.removeBufferingDisplay();
    };
    this.video = videoElement;
    this.hls = hlsInstance || null;
    this.currentUrl = url || "";
    this.playStartTime = Date.now();
    this.lastCleanupTime = Date.now();
  }
  /**
   * キャッシュ管理を開始します
   */
  startMonitoring() {
    if (this.cacheCheckInterval !== null) return;
    this.cacheCheckInterval = window.setInterval(() => {
      if (!this.video.paused) {
        this.checkCacheState();
      }
    }, CACHE_MANAGEMENT.CHECK_INTERVAL_MS);
    this.video.addEventListener("emptied", this.handleEmptied);
    this.video.addEventListener("waiting", this.handleWaiting);
    this.video.addEventListener("playing", this.handlePlaying);
  }
  /**
   * キャッシュ管理を停止します
   */
  stopMonitoring() {
    if (this.cacheCheckInterval !== null) {
      window.clearInterval(this.cacheCheckInterval);
      this.cacheCheckInterval = null;
    }
    this.video.removeEventListener("emptied", this.handleEmptied);
    this.video.removeEventListener("waiting", this.handleWaiting);
    this.video.removeEventListener("playing", this.handlePlaying);
  }
  /**
   * HLS.jsインスタンスを更新します（HLS再生への切り替え時）
   */
  updateHlsInstance(hlsInstance, url) {
    this.hls = hlsInstance;
    if (url) {
      this.currentUrl = url;
    }
    window.logger.info("CacheManagerのHLS.jsインスタンスを更新したのじゃ！", {
      hasHls: !!this.hls,
      url: this.currentUrl
    });
  }
  /**
   * キャッシュの状態をチェックします
   */
  checkCacheState() {
    const currentTime = Date.now();
    const playDuration = (currentTime - this.playStartTime) / 1e3;
    if (window.performance && "memory" in window.performance && window.performance.memory) {
      const memoryInfo = window.performance.memory;
      const usedMemory = memoryInfo.usedJSHeapSize;
      if (usedMemory > CACHE_MANAGEMENT.CACHE_SIZE_THRESHOLD_BYTES || playDuration > CACHE_MANAGEMENT.TIME_THRESHOLD_MS / 1e3) {
        window.logger.info("キャッシュクリーンアップが必要なのじゃ！", {
          playDuration: `${Math.floor(playDuration / 60)}分${Math.floor(playDuration % 60)}秒`,
          usedMemory: `${(usedMemory / (1024 * 1024)).toFixed(2)}MB`
        });
        this.forceCleanup();
      }
    } else {
      if (playDuration > CACHE_MANAGEMENT.TIME_THRESHOLD_MS / 1e3) {
        window.logger.info("再生時間に基づくキャッシュクリーンアップが必要なのじゃ！", {
          playDuration: `${Math.floor(playDuration / 60)}分${Math.floor(playDuration % 60)}秒`
        });
        this.forceCleanup();
      }
    }
  }
  /**
   * キャッシュの強制クリーンアップを実行します
   */
  async forceCleanup() {
    try {
      window.logger.info("キャッシュクリーンアップを実行するのじゃ！");
      const wasPlaying = !this.video.paused;
      const currentPosition = this.video.currentTime;
      this.addBufferingDisplay();
      if (this.hls) {
        await this.hlsCleanup(wasPlaying, currentPosition);
      } else {
        await this.regularCleanup(wasPlaying, currentPosition);
      }
      this.playStartTime = Date.now();
      this.lastCleanupTime = Date.now();
      this.removeBufferingDisplay();
      window.logger.info("キャッシュクリーンアップが完了したのじゃ！");
    } catch (error) {
      window.logger.error("キャッシュクリーンアップでエラーが発生したのじゃ...", error);
      this.removeBufferingDisplay();
    }
  }
  /**
   * HLS.js使用時のキャッシュクリーンアップ
   */
  async hlsCleanup(wasPlaying, currentPosition) {
    if (!this.hls) return;
    window.logger.info("HLS.js使用時のキャッシュクリーンアップを実行するのじゃ！");
    try {
      if (typeof this.hls.destroy === "function") {
        const currentSource = this.currentUrl;
        this.hls.destroy();
        await new Promise((resolve) => setTimeout(resolve, 200));
        if (typeof Hls !== "undefined" && Hls.isSupported()) {
          this.hls = new Hls();
          this.hls.on(Hls.Events.ERROR, (...args) => {
            const [, data] = args;
            window.logger.error("HLS Error during cleanup:", data);
          });
          this.hls.on(Hls.Events.MANIFEST_PARSED, () => {
            this.restorePlaybackPosition(wasPlaying, currentPosition);
          });
          this.hls.loadSource(currentSource);
          this.hls.attachMedia(this.video);
        } else {
          window.logger.warn("HLS.jsが利用できないため、ネイティブ再生にフォールバックするのじゃ");
          this.video.src = currentSource;
          await new Promise((resolve) => setTimeout(resolve, 100));
          this.restorePlaybackPosition(wasPlaying, currentPosition);
        }
      } else {
        window.logger.warn("HLS.jsのdestroyメソッドが利用できないのじゃ");
        await this.regularCleanup(wasPlaying, currentPosition);
      }
    } catch (error) {
      window.logger.error("HLS.jsクリーンアップ中にエラーが発生したのじゃ:", error);
      await this.regularCleanup(wasPlaying, currentPosition);
    }
  }
  /**
   * 通常の動画ファイルのキャッシュクリーンアップ
   */
  async regularCleanup(wasPlaying, currentPosition) {
    window.logger.info("通常の動画ファイルのキャッシュクリーンアップを実行するのじゃ！");
    const currentSrc = this.video.src;
    this.video.pause();
    this.video.src = "";
    this.video.load();
    await new Promise((resolve) => setTimeout(resolve, 100));
    this.video.src = currentSrc;
    await this.video.load();
    this.restorePlaybackPosition(wasPlaying, currentPosition);
  }
  /**
   * 再生位置と再生状態を復元
   */
  restorePlaybackPosition(wasPlaying, currentPosition) {
    const safePosition = Math.max(0, currentPosition - CACHE_MANAGEMENT.CLEANUP_BUFFER_SECONDS);
    this.video.currentTime = safePosition;
    if (wasPlaying) {
      setTimeout(async () => {
        try {
          await this.video.play();
        } catch (error) {
          window.logger.error("再生の再開に失敗したのじゃ:", error);
        }
      }, 100);
    }
  }
  /**
   * バッファリング表示を追加します
   */
  addBufferingDisplay() {
    const playerContainer = document.querySelector(".custom-player");
    if (playerContainer) {
      playerContainer.classList.add("buffering");
    }
  }
  /**
   * バッファリング表示を削除します
   */
  removeBufferingDisplay() {
    const playerContainer = document.querySelector(".custom-player");
    if (playerContainer) {
      playerContainer.classList.remove("buffering");
    }
  }
}

var ToastMode = /* @__PURE__ */ ((ToastMode2) => {
  ToastMode2["INFO"] = "INFO";
  ToastMode2["SUCCESS"] = "SUCCESS";
  ToastMode2["WARNING"] = "WARNING";
  ToastMode2["ERROR"] = "ERROR";
  return ToastMode2;
})(ToastMode || {});

class ToastManager {
  constructor(config = TOAST_CONFIG) {
    this.config = config;
  }
  /**
   * 情報通知を表示
   * @param title メインメッセージ
   * @param middle サブメッセージ（省略可）
   * @param low 追加情報（省略可）
   */
  showInfo(title, middle = "", low = "") {
    this.showToast(ToastMode.INFO, title, middle, low, this.config.TIMEOUTS.START_MS);
  }
  /**
   * 成功通知を表示
   * @param title メインメッセージ
   * @param middle サブメッセージ（省略可）
   * @param low 追加情報（省略可）
   */
  showSuccess(title, middle = "", low = "") {
    this.showToast(ToastMode.SUCCESS, title, middle, low, this.config.TIMEOUTS.PLAYABLE_MS);
  }
  /**
   * 警告通知を表示
   * @param title メインメッセージ
   * @param middle サブメッセージ（省略可）
   * @param low 追加情報（省略可）
   */
  showWarning(title, middle = "", low = "") {
    this.showToast(ToastMode.WARNING, title, middle, low, this.config.TIMEOUTS.WARN_MS);
  }
  /**
   * エラー通知を表示
   * @param title メインメッセージ
   * @param middle サブメッセージ（省略可）
   * @param low 追加情報（省略可）
   */
  showError(title, middle = "", low = "") {
    this.showToast(ToastMode.ERROR, title, middle, low, this.config.TIMEOUTS.ERROR_MS);
  }
  /**
   * カスタム通知を表示
   * @param mode 通知モード
   * @param title メインメッセージ
   * @param middle サブメッセージ（省略可）
   * @param low 追加情報（省略可）
   * @param timeout 表示時間（ミリ秒）
   */
  showToast(mode, title, middle = "", low = "", timeout = 5e3) {
    const message = [middle, low].filter(Boolean).join(" ");
    switch (mode) {
      case ToastMode.INFO:
        window.toastr.info(message, title, { timeOut: timeout });
        break;
      case ToastMode.SUCCESS:
        window.toastr.success(message, title, { timeOut: timeout });
        break;
      case ToastMode.WARNING:
        window.toastr.warning(message, title, { timeOut: timeout });
        break;
      case ToastMode.ERROR:
        window.toastr.error(message, title, { timeOut: timeout });
        break;
      default:
        window.logger.info(`[Toast-${mode}] ${title} ${message}`);
    }
  }
}

const waitForPlayer = (timeout = 5e3) => {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const maxAttempts = timeout / 100;
    const checkPlayer = () => {
      attempts++;
      const player = document.querySelector(WATCH_CONFIG.SELECTORS.PARENT_PLAYER);
      if (player) {
        const isInitialized = player.querySelector(WATCH_CONFIG.SELECTORS.VIDEO);
        if (isInitialized) {
          resolve(player);
          return;
        }
      }
      if (attempts >= maxAttempts) {
        reject(new Error("プレイヤーの待機がタイムアウトしました"));
        return;
      }
      setTimeout(checkPlayer, 100);
    };
    checkPlayer();
  });
};
const applyStyles = (styles) => {
  const styleElement = document.createElement("style");
  styleElement.textContent = styles;
  document.head.appendChild(styleElement);
  return styleElement;
};

const ICONS = {
  settings: "settings",
  comment: "comment",
  play: "play_arrow",
  pause: "pause",
  volume_up: "volume_up",
  volume_off: "volume_off",
  fullscreen: "fullscreen",
  fullscreen_exit: "fullscreen_exit"};
function getIconPath(iconName, style = "outlined") {
  return `/local/images/material-design-icons/${style}/${iconName}.svg`;
}
function getColorClass(color) {
  const colorMap = {
    white: "icon-white",
    green: "icon-green",
    red: "icon-red",
    dark: "icon-dark",
    default: "icon-outlined"
  };
  return colorMap[color] || colorMap.default;
}
function getSizeClass(size) {
  if (typeof size === "number") {
    return "";
  }
  const sizeClassMap = {
    small: "material-icon-small",
    medium: "",
    large: "material-icon-large"
  };
  return sizeClassMap[size] || "";
}
function createMaterialIcon(iconName, options = {}) {
  const {
    style = "outlined",
    size = "medium",
    color = "default",
    classes = "",
    alt = iconName,
    loading = "lazy"
  } = options;
  const iconPath = getIconPath(iconName, style);
  const colorClass = getColorClass(color);
  const sizeClass = getSizeClass(size);
  const allClasses = ["material-icon", colorClass, sizeClass, classes].filter(Boolean).join(" ");
  const styleAttr = typeof size === "number" ? ` style="width: ${size}px; height: ${size}px;"` : "";
  return `<img class="${allClasses}" src="${iconPath}" alt="${alt}" loading="${loading}"${styleAttr} />`;
}
const materialIconsStyles = `
  /* マテリアルアイコン基本設定 */
  .material-icon {
    display: inline-block;
    width: var(--icon-size-medium, 20px);
    height: var(--icon-size-medium, 20px);
    background-size: contain;
    background-repeat: no-repeat;
    background-position: center;
    vertical-align: middle;
    pointer-events: none; /* ボタン内でのクリックイベント伌のため */
  }

  .material-icon-small {
    width: var(--icon-size-small, 16px);
    height: var(--icon-size-small, 16px);
  }

  .material-icon-large {
    width: var(--icon-size-large, 24px);
    height: var(--icon-size-large, 24px);
  }

  /* 色設定用CSSフィルタ（黒塗りアイコンの色変換用） */
  .icon-white {
    filter: brightness(0) saturate(100%) invert(100%);
  }

  .icon-green {
    filter: brightness(0) saturate(100%) invert(64%) sepia(88%) saturate(3583%) hue-rotate(87deg) brightness(118%) contrast(119%);
  }

  .icon-red {
    filter: brightness(0) saturate(100%) invert(27%) sepia(51%) saturate(2878%) hue-rotate(346deg) brightness(104%) contrast(97%);
  }

  .icon-dark {
    filter: brightness(0) saturate(100%) invert(20%) sepia(8%) saturate(7%) hue-rotate(314deg) brightness(96%) contrast(93%);
  }

  /* 基本カラー（outlined版での白色設定） */
  .icon-outlined {
    filter: brightness(0) saturate(100%) invert(100%);
  }

  /* CSS変数定義 */
  :root {
    --icon-size-small: 16px;
    --icon-size-medium: 20px;
    --icon-size-large: 24px;
    --icon-color-default: #ffffff;
    --icon-color-success: #4caf50;
    --icon-color-danger: #f44336;
    --icon-color-dark: #333333;
  }

  /* ボタン内のアイコン調整 */
  .control-btn .material-icon,
  .action-card .material-icon {
    margin: 0;
    vertical-align: middle;
  }

  /* FABアイコン */
  .fab-icon {
    width: 24px;
    height: 24px;
  }

  /* タブアイコン */
  .tab-icon {
    width: 20px;
    height: 20px;
    margin-right: 8px;
  }

  /* comment-filter2互換クラス */
  .cf2-icon {
    display: inline-block;
    vertical-align: middle;
  }

  .cf2-icon-white {
    filter: brightness(0) saturate(100%) invert(100%);
  }
`;

const PLAYER_ICONS = {
  play: createMaterialIcon(ICONS.play, { style: "outlined", color: "white" }),
  pause: createMaterialIcon(ICONS.pause, { style: "outlined", color: "white" }),
  volume: createMaterialIcon(ICONS.volume_up, { style: "outlined", color: "white" }),
  muted: createMaterialIcon(ICONS.volume_off, { style: "outlined", color: "white" }),
  rewind10: createMaterialIcon("replay_10", { style: "outlined", color: "white" }),
  forward10: createMaterialIcon("forward_10", { style: "outlined", color: "white" }),
  comment: createMaterialIcon(ICONS.comment, { style: "outlined", color: "white" }),
  commentOff: createMaterialIcon(ICONS.comment, { style: "outlined", color: "white", classes: "comment-off" }),
  fullscreen: createMaterialIcon(ICONS.fullscreen, { style: "outlined", color: "white" }),
  exitFullscreen: createMaterialIcon(ICONS.fullscreen_exit, { style: "outlined", color: "white" }),
  settings: createMaterialIcon(ICONS.settings, { style: "outlined", color: "white" })
};

const DB_CONFIG = {
  NAME: "NicoCachePlayerDB",
  CURRENT_VERSION: 2,
  MIGRATION_BATCH_SIZE: 100,
  BACKUP_RETENTION_DAYS: 30,
  CLEANUP_INTERVAL_HOURS: 24
};
const DB_STORES = {
  // 既存：プレーヤー設定
  playerSettings: {
    name: "playerSettings",
    keyPath: "id",
    autoIncrement: false,
    indexes: [
      { name: "updatedAt", unique: false },
      { name: "category", unique: false }
    ]
  },
  // 新規：動画キャッシュ情報
  videoCache: {
    name: "videoCache",
    keyPath: "videoId",
    autoIncrement: false,
    indexes: [
      { name: "lastAccessed", unique: false },
      { name: "cacheSize", unique: false },
      { name: "quality", unique: false }
    ]
  },
  // 新規：視聴履歴
  viewHistory: {
    name: "viewHistory",
    keyPath: "id",
    autoIncrement: true,
    indexes: [
      { name: "videoId", unique: false },
      { name: "watchedAt", unique: false },
      { name: "duration", unique: false }
    ]
  },
  // 新規：ユーザー統計
  userStats: {
    name: "userStats",
    keyPath: "statId",
    autoIncrement: false,
    indexes: [
      { name: "category", unique: false },
      { name: "date", unique: false }
    ]
  },
  // 新規：コメント履歴
  commentHistory: {
    name: "commentHistory",
    keyPath: "id",
    autoIncrement: true,
    indexes: [
      { name: "videoId", unique: false },
      { name: "timestamp", unique: false },
      { name: "userId", unique: false }
    ]
  },
  // 新規：システム情報
  systemInfo: {
    name: "systemInfo",
    keyPath: "key",
    autoIncrement: false,
    indexes: [
      { name: "version", unique: false },
      { name: "createdAt", unique: false }
    ]
  }
};
const DB_VERSION_HISTORY = {
  1: {
    version: 1,
    description: "基本設定ストア",
    stores: ["playerSettings"],
    migrationRequired: false
  },
  2: {
    version: 2,
    description: "永続化昇格：キャッシュ・履歴・統計機能追加",
    stores: ["playerSettings", "videoCache", "viewHistory", "userStats", "commentHistory", "systemInfo"],
    migrationRequired: true
  }
};
const MIGRATION_CONFIGS = {
  2: {
    version: 2,
    description: "永続化昇格マイグレーション",
    execute: async (db, transaction) => {
      const backupData = await backupExistingData(db);
      createNewStores(db);
      await migratePlayerSettings(db, transaction, backupData);
      await recordMigrationInfo(db, transaction);
    }
  }
};
async function backupExistingData(db) {
  const backup = {};
  if (db.objectStoreNames.contains("playerSettings")) {
    const transaction = db.transaction(["playerSettings"], "readonly");
    const store = transaction.objectStore("playerSettings");
    const request = store.getAll();
    await new Promise((resolve, reject) => {
      request.onsuccess = () => {
        backup.playerSettings = request.result;
        resolve(void 0);
      };
      request.onerror = reject;
    });
  }
  return backup;
}
function createNewStores(db) {
  Object.values(DB_STORES).forEach((storeConfig) => {
    if (!db.objectStoreNames.contains(storeConfig.name)) {
      const store = db.createObjectStore(storeConfig.name, {
        keyPath: storeConfig.keyPath,
        autoIncrement: storeConfig.autoIncrement
      });
      if (storeConfig.indexes) {
        storeConfig.indexes.forEach((index) => {
          store.createIndex(index.name, index.name, { unique: index.unique });
        });
      }
    }
  });
}
async function migratePlayerSettings(db, transaction, backupData) {
  if (!backupData.playerSettings) return;
  const store = transaction.objectStore("playerSettings");
  const playerSettings = backupData.playerSettings;
  for (const item of playerSettings) {
    const migratedItem = {
      ...item,
      category: "player",
      migrated: true,
      migratedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    store.put(migratedItem);
  }
}
async function recordMigrationInfo(db, transaction) {
  const systemStore = transaction.objectStore("systemInfo");
  const migrationInfo = {
    key: "migration_v2",
    value: true,
    version: 2,
    createdAt: /* @__PURE__ */ new Date(),
    updatedAt: /* @__PURE__ */ new Date(),
    metadata: {
      description: "永続化昇格マイグレーション完了",
      timestamp: Date.now()
    }
  };
  systemStore.put(migrationInfo);
}
const SETTING_CATEGORIES = {
  PLAYER: "player"};
const CLEANUP_CONFIG = {
  VIEW_HISTORY_DAYS: 90,
  COMMENT_HISTORY_DAYS: 30};

class MigrationManager {
  constructor() {
    this.db = null;
    this.migrationInProgress = false;
    this.backupData = {};
    this.setupErrorHandling();
  }
  /**
   * データベースマイグレーションを実行
   * @param db データベースインスタンス
   * @param oldVersion 旧バージョン
   * @param newVersion 新バージョン
   * @returns マイグレーション結果
   */
  async executeMigration(db, oldVersion, newVersion) {
    if (this.migrationInProgress) {
      return { success: false, error: "既にマイグレーションが実行中なのじゃ" };
    }
    this.migrationInProgress = true;
    this.db = db;
    try {
      window.logger?.info(`マイグレーション開始: v${oldVersion} → v${newVersion}`);
      await this.createBackup(db, oldVersion);
      for (let version = oldVersion + 1; version <= newVersion; version++) {
        await this.migrateToVersion(db, version);
      }
      await this.recordMigrationSuccess(db, newVersion);
      window.logger?.info(`マイグレーション完了: v${newVersion}`);
      return { success: true };
    } catch (error) {
      window.logger?.error("マイグレーション失敗:", error);
      await this.rollback(db, oldVersion);
      return {
        success: false,
        error: error instanceof Error ? error.message : "マイグレーションに失敗したのじゃ"
      };
    } finally {
      this.migrationInProgress = false;
      this.cleanupBackup();
    }
  }
  /**
   * 指定バージョンへのマイグレーション
   * @param db データベース
   * @param version 対象バージョン
   */
  async migrateToVersion(db, version) {
    const migration = MIGRATION_CONFIGS[version];
    if (!migration) {
      throw new Error(`バージョン ${version} のマイグレーション設定が見つからないのじゃ`);
    }
    window.logger?.info(`マイグレーション実行中: v${version} - ${migration.description}`);
    const transaction = db.transaction(
      Array.from(db.objectStoreNames),
      "readwrite"
    );
    try {
      await migration.execute(db, transaction);
      await new Promise((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      });
      window.logger?.info(`マイグレーション完了: v${version}`);
    } catch (error) {
      throw new Error(`バージョン ${version} のマイグレーションに失敗: ${error}`);
    }
  }
  /**
   * バックアップ作成
   * @param db データベース
   * @param version 現在のバージョン
   */
  async createBackup(db, version) {
    this.backupData = {
      version,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      stores: {}
    };
    const storeNames = Array.from(db.objectStoreNames);
    const transaction = db.transaction(storeNames, "readonly");
    for (const storeName of storeNames) {
      const store = transaction.objectStore(storeName);
      const request = store.getAll();
      await new Promise((resolve, reject) => {
        request.onsuccess = () => {
          if (!this.backupData.stores) {
            this.backupData.stores = {};
          }
          this.backupData.stores[storeName] = request.result;
          resolve();
        };
        request.onerror = () => reject(request.error);
      });
    }
    try {
      localStorage.setItem(
        `nicoCacheDB_backup_v${version}`,
        JSON.stringify(this.backupData)
      );
      window.logger?.info(`バックアップ作成完了: v${version}`);
    } catch (error) {
      window.logger?.warn("バックアップ保存失敗:", error);
    }
  }
  /**
   * ロールバック実行
   * @param db データベース
   * @param targetVersion 復旧対象バージョン
   */
  async rollback(db, targetVersion) {
    if (!this.backupData.stores) {
      window.logger?.error("バックアップデータが見つからないのじゃ");
      return;
    }
    try {
      window.logger?.info(`ロールバック開始: v${targetVersion}`);
      const storeNames = Object.keys(this.backupData.stores);
      const transaction = db.transaction(storeNames, "readwrite");
      for (const storeName of storeNames) {
        if (db.objectStoreNames.contains(storeName)) {
          const store = transaction.objectStore(storeName);
          await new Promise((resolve, reject) => {
            const clearRequest = store.clear();
            clearRequest.onsuccess = () => resolve();
            clearRequest.onerror = () => reject(clearRequest.error);
          });
          const backupItems = this.backupData.stores[storeName];
          for (const item of backupItems) {
            await new Promise((resolve, reject) => {
              const putRequest = store.put(item);
              putRequest.onsuccess = () => resolve();
              putRequest.onerror = () => reject(putRequest.error);
            });
          }
        }
      }
      window.logger?.info(`ロールバック完了: v${targetVersion}`);
    } catch (error) {
      window.logger?.error("ロールバック失敗:", error);
      throw error;
    }
  }
  /**
   * マイグレーション成功記録
   * @param db データベース
   * @param version 新バージョン
   */
  async recordMigrationSuccess(db, version) {
    if (!db.objectStoreNames.contains("systemInfo")) {
      return;
    }
    const transaction = db.transaction(["systemInfo"], "readwrite");
    const store = transaction.objectStore("systemInfo");
    const migrationRecord = {
      key: `migration_v${version}`,
      value: true,
      version,
      createdAt: /* @__PURE__ */ new Date(),
      updatedAt: /* @__PURE__ */ new Date(),
      metadata: {
        description: DB_VERSION_HISTORY[version]?.description || "マイグレーション",
        executedAt: (/* @__PURE__ */ new Date()).toISOString(),
        backupCreated: !!this.backupData.timestamp
      }
    };
    await new Promise((resolve, reject) => {
      const request = store.put(migrationRecord);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
  /**
   * バックアップクリーンアップ
   */
  cleanupBackup() {
    this.backupData = {};
    try {
      const keys = Object.keys(localStorage);
      const backupKeys = keys.filter((key) => key.startsWith("nicoCacheDB_backup_"));
      backupKeys.sort().reverse().slice(5).forEach((key) => {
        localStorage.removeItem(key);
      });
      window.logger?.debug("古いバックアップを削除したのじゃ");
    } catch (error) {
      window.logger?.warn("バックアップクリーンアップ失敗:", error);
    }
  }
  /**
   * 現在のデータベースバージョンを取得
   * @param db データベース
   * @returns 現在のバージョン
   */
  async getCurrentVersion(db) {
    if (!db.objectStoreNames.contains("systemInfo")) {
      return 1;
    }
    try {
      const transaction = db.transaction(["systemInfo"], "readonly");
      const store = transaction.objectStore("systemInfo");
      const request = store.get("db_version");
      return new Promise((resolve) => {
        request.onsuccess = () => {
          const result = request.result;
          resolve(result ? result.version : 1);
        };
        request.onerror = () => {
          window.logger?.warn("バージョン取得失敗、初期バージョンを返すのじゃ");
          resolve(1);
        };
      });
    } catch (error) {
      window.logger?.warn("バージョン取得エラー:", error);
      return 1;
    }
  }
  /**
   * マイグレーション履歴を取得
   * @param db データベース
   * @returns マイグレーション履歴
   */
  async getMigrationHistory(db) {
    if (!db.objectStoreNames.contains("systemInfo")) {
      return [];
    }
    try {
      const transaction = db.transaction(["systemInfo"], "readonly");
      const store = transaction.objectStore("systemInfo");
      const request = store.getAll();
      return new Promise((resolve, reject) => {
        request.onsuccess = () => {
          const results = request.result;
          const migrationRecords = results.filter(
            (item) => item.key.startsWith("migration_v")
          );
          resolve(migrationRecords);
        };
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      window.logger?.error("マイグレーション履歴取得エラー:", error);
      return [];
    }
  }
  /**
   * データベース整合性チェック
   * @param db データベース
   * @returns 整合性チェック結果
   */
  async validateDatabase(db) {
    const errors = [];
    try {
      const expectedStores = DB_VERSION_HISTORY[DB_CONFIG.CURRENT_VERSION].stores;
      for (const storeName of expectedStores) {
        if (!db.objectStoreNames.contains(storeName)) {
          errors.push(`必要なストア "${storeName}" が存在しないのじゃ`);
        }
      }
      return { valid: errors.length === 0, errors };
    } catch (error) {
      errors.push(`整合性チェックエラー: ${error}`);
      return { valid: false, errors };
    }
  }
  /**
   * エラーハンドリング設定
   */
  setupErrorHandling() {
    window.addEventListener("error", (event) => {
      if (event.error && event.error.message.includes("Migration")) {
        window.logger?.error("マイグレーション関連エラー:", event.error);
      }
    });
    window.addEventListener("unhandledrejection", (event) => {
      if (event.reason && event.reason.message && event.reason.message.includes("Migration")) {
        window.logger?.error("マイグレーション関連Promise拒否:", event.reason);
      }
    });
  }
  /**
   * マイグレーションの必要性チェック
   * @param currentVersion 現在のバージョン
   * @returns マイグレーションが必要かどうか
   */
  needsMigration(currentVersion) {
    return currentVersion < DB_CONFIG.CURRENT_VERSION;
  }
  /**
   * 利用可能なマイグレーションパスを取得
   * @param fromVersion 開始バージョン
   * @returns マイグレーションパス
   */
  getMigrationPath(fromVersion) {
    const path = [];
    for (let version = fromVersion + 1; version <= DB_CONFIG.CURRENT_VERSION; version++) {
      if (MIGRATION_CONFIGS[version]) {
        path.push(version);
      }
    }
    return path;
  }
  /**
   * デバッグ情報を取得
   * @returns デバッグ情報
   */
  getDebugInfo() {
    return {
      migrationInProgress: this.migrationInProgress,
      hasBackup: Object.keys(this.backupData).length > 0,
      currentDbVersion: DB_CONFIG.CURRENT_VERSION,
      availableMigrations: Object.keys(MIGRATION_CONFIGS),
      backupTimestamp: this.backupData.timestamp
    };
  }
}

class DatabaseManager {
  constructor() {
    this.db = null;
    this.initializationPromise = null;
    this.cleanupTimer = null;
    this.migrationManager = new MigrationManager();
    this.setupPeriodicCleanup();
  }
  /**
   * シングルトンインスタンスを取得
   */
  static getInstance() {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager();
    }
    return DatabaseManager.instance;
  }
  /**
   * データベースを初期化
   */
  async initialize() {
    if (this.initializationPromise) {
      return this.initializationPromise;
    }
    this.initializationPromise = this.performInitialization();
    return this.initializationPromise;
  }
  /**
   * データベース初期化の実行
   */
  async performInitialization() {
    try {
      this.db = await this.openDatabase();
      window.logger?.info("データベース初期化完了なのじゃ");
    } catch (error) {
      window.logger?.error("データベース初期化失敗:", error);
      throw error;
    }
  }
  /**
   * データベースを開く
   */
  openDatabase() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_CONFIG.NAME, DB_CONFIG.CURRENT_VERSION);
      request.onerror = () => {
        window.logger?.error("データベースのオープンに失敗:", request.error);
        reject(new Error("データベースのオープンに失敗したのじゃ"));
      };
      request.onsuccess = () => {
        const db = request.result;
        this.setupDatabaseErrorHandling(db);
        resolve(db);
      };
      request.onupgradeneeded = async (event) => {
        const db = event.target.result;
        const oldVersion = event.oldVersion;
        const newVersion = event.newVersion || DB_CONFIG.CURRENT_VERSION;
        window.logger?.info(`データベース昇格: v${oldVersion} → v${newVersion}`);
        try {
          const result = await this.migrationManager.executeMigration(db, oldVersion, newVersion);
          if (!result.success) {
            throw new Error(result.error || "マイグレーション失敗");
          }
        } catch (error) {
          window.logger?.error("マイグレーション実行エラー:", error);
          throw error;
        }
      };
    });
  }
  /**
   * データベースエラーハンドリング設定
   */
  setupDatabaseErrorHandling(db) {
    db.onerror = (event) => {
      window.logger?.error("データベースエラー:", event);
    };
    db.onversionchange = () => {
      window.logger?.warn("データベースバージョン変更が検出されたのじゃ");
      db.close();
      this.db = null;
    };
  }
  /**
   * プレーヤー設定の保存
   */
  async savePlayerSetting(key, value, category = SETTING_CATEGORIES.PLAYER) {
    await this.ensureInitialized();
    const transaction = this.db.transaction(["playerSettings"], "readwrite");
    const store = transaction.objectStore("playerSettings");
    const settingData = {
      id: key,
      value,
      category,
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    return new Promise((resolve, reject) => {
      const request = store.put(settingData);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
  /**
   * プレーヤー設定の取得
   */
  async getPlayerSetting(key, defaultValue) {
    await this.ensureInitialized();
    const transaction = this.db.transaction(["playerSettings"], "readonly");
    const store = transaction.objectStore("playerSettings");
    return new Promise((resolve) => {
      const request = store.get(key);
      request.onsuccess = () => {
        const result = request.result;
        resolve(result ? result.value : defaultValue);
      };
      request.onerror = () => {
        window.logger?.warn(`設定取得失敗: ${key}`);
        resolve(defaultValue);
      };
    });
  }
  /**
   * 動画キャッシュ情報の保存
   */
  async saveVideoCache(videoCache) {
    await this.ensureInitialized();
    const transaction = this.db.transaction(["videoCache"], "readwrite");
    const store = transaction.objectStore("videoCache");
    return new Promise((resolve, reject) => {
      const request = store.put(videoCache);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
  /**
   * 動画キャッシュ情報の取得
   */
  async getVideoCache(videoId) {
    await this.ensureInitialized();
    const transaction = this.db.transaction(["videoCache"], "readonly");
    const store = transaction.objectStore("videoCache");
    return new Promise((resolve, reject) => {
      const request = store.get(videoId);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }
  /**
   * 視聴履歴の追加
   */
  async addViewHistory(viewHistory) {
    await this.ensureInitialized();
    const transaction = this.db.transaction(["viewHistory"], "readwrite");
    const store = transaction.objectStore("viewHistory");
    return new Promise((resolve, reject) => {
      const request = store.add(viewHistory);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
  /**
   * 視聴履歴の取得
   */
  async getViewHistory(limit = 50) {
    await this.ensureInitialized();
    const transaction = this.db.transaction(["viewHistory"], "readonly");
    const store = transaction.objectStore("viewHistory");
    const index = store.index("watchedAt");
    return new Promise((resolve, reject) => {
      const request = index.openCursor(null, "prev");
      const results = [];
      let count = 0;
      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor && count < limit) {
          results.push(cursor.value);
          count++;
          cursor.continue();
        } else {
          resolve(results);
        }
      };
      request.onerror = () => reject(request.error);
    });
  }
  /**
   * ユーザー統計の保存
   */
  async saveUserStats(userStats) {
    await this.ensureInitialized();
    const transaction = this.db.transaction(["userStats"], "readwrite");
    const store = transaction.objectStore("userStats");
    return new Promise((resolve, reject) => {
      const request = store.put(userStats);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
  /**
   * ユーザー統計の取得
   */
  async getUserStats(category, date) {
    await this.ensureInitialized();
    const statId = `${category}_${date}`;
    const transaction = this.db.transaction(["userStats"], "readonly");
    const store = transaction.objectStore("userStats");
    return new Promise((resolve, reject) => {
      const request = store.get(statId);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }
  /**
   * コメント履歴の追加
   */
  async addCommentHistory(commentHistory) {
    await this.ensureInitialized();
    const transaction = this.db.transaction(["commentHistory"], "readwrite");
    const store = transaction.objectStore("commentHistory");
    return new Promise((resolve, reject) => {
      const request = store.add(commentHistory);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
  /**
   * システム情報の保存
   */
  async saveSystemInfo(systemInfo) {
    await this.ensureInitialized();
    const transaction = this.db.transaction(["systemInfo"], "readwrite");
    const store = transaction.objectStore("systemInfo");
    return new Promise((resolve, reject) => {
      const request = store.put(systemInfo);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
  /**
   * システム情報の取得
   */
  async getSystemInfo(key) {
    await this.ensureInitialized();
    const transaction = this.db.transaction(["systemInfo"], "readonly");
    const store = transaction.objectStore("systemInfo");
    return new Promise((resolve, reject) => {
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }
  /**
   * 全設定の取得（後方互換性）
   */
  async getAllSettings() {
    await this.ensureInitialized();
    const transaction = this.db.transaction(["playerSettings"], "readonly");
    const store = transaction.objectStore("playerSettings");
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => {
        const results = {};
        request.result.forEach((item) => {
          results[item.id] = item.value;
        });
        resolve(results);
      };
      request.onerror = () => reject(request.error);
    });
  }
  /**
   * データベースの統計情報を取得
   */
  async getDatabaseStats() {
    await this.ensureInitialized();
    const storeStats = {};
    let totalRecords = 0;
    const storeNames = Array.from(this.db.objectStoreNames);
    const transaction = this.db.transaction(storeNames, "readonly");
    for (const storeName of storeNames) {
      const store = transaction.objectStore(storeName);
      const count = await new Promise((resolve, reject) => {
        const request = store.count();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      storeStats[storeName] = count;
      totalRecords += count;
    }
    const dbSize = totalRecords * 1024;
    return { totalRecords, storeStats, dbSize };
  }
  /**
   * 自動クリーンアップ実行
   */
  async performCleanup() {
    await this.ensureInitialized();
    try {
      window.logger?.info("データベースクリーンアップ開始");
      await this.cleanupViewHistory();
      await this.cleanupCommentHistory();
      await this.cleanupExpiredCache();
      window.logger?.info("データベースクリーンアップ完了");
    } catch (error) {
      window.logger?.error("クリーンアップエラー:", error);
    }
  }
  /**
   * 視聴履歴のクリーンアップ
   */
  async cleanupViewHistory() {
    const cutoffDate = /* @__PURE__ */ new Date();
    cutoffDate.setDate(cutoffDate.getDate() - CLEANUP_CONFIG.VIEW_HISTORY_DAYS);
    const transaction = this.db.transaction(["viewHistory"], "readwrite");
    const store = transaction.objectStore("viewHistory");
    const index = store.index("watchedAt");
    const range = IDBKeyRange.upperBound(cutoffDate);
    const request = index.openCursor(range);
    let deletedCount = 0;
    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          cursor.delete();
          deletedCount++;
          cursor.continue();
        } else {
          window.logger?.debug(`視聴履歴 ${deletedCount} 件を削除`);
          resolve();
        }
      };
      request.onerror = () => reject(request.error);
    });
  }
  /**
   * コメント履歴のクリーンアップ
   */
  async cleanupCommentHistory() {
    const cutoffDate = /* @__PURE__ */ new Date();
    cutoffDate.setDate(cutoffDate.getDate() - CLEANUP_CONFIG.COMMENT_HISTORY_DAYS);
    const transaction = this.db.transaction(["commentHistory"], "readwrite");
    const store = transaction.objectStore("commentHistory");
    const index = store.index("timestamp");
    const range = IDBKeyRange.upperBound(cutoffDate.getTime());
    const request = index.openCursor(range);
    let deletedCount = 0;
    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          cursor.delete();
          deletedCount++;
          cursor.continue();
        } else {
          window.logger?.debug(`コメント履歴 ${deletedCount} 件を削除`);
          resolve();
        }
      };
      request.onerror = () => reject(request.error);
    });
  }
  /**
   * 期限切れキャッシュのクリーンアップ
   */
  async cleanupExpiredCache() {
    const now = /* @__PURE__ */ new Date();
    const transaction = this.db.transaction(["videoCache"], "readwrite");
    const store = transaction.objectStore("videoCache");
    const request = store.getAll();
    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const caches = request.result;
        let deletedCount = 0;
        caches.forEach((cache) => {
          if (cache.expiresAt && new Date(cache.expiresAt) < now) {
            store.delete(cache.videoId);
            deletedCount++;
          }
        });
        window.logger?.debug(`期限切れキャッシュ ${deletedCount} 件を削除`);
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }
  /**
   * 定期クリーンアップ設定
   */
  setupPeriodicCleanup() {
    const interval = DB_CONFIG.CLEANUP_INTERVAL_HOURS * 60 * 60 * 1e3;
    this.cleanupTimer = setInterval(() => {
      this.performCleanup().catch((error) => {
        window.logger?.error("定期クリーンアップ失敗:", error);
      });
    }, interval);
  }
  /**
   * 初期化確認
   */
  async ensureInitialized() {
    if (!this.db) {
      await this.initialize();
    }
  }
  /**
   * データベースを閉じる
   */
  close() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    if (this.db) {
      this.db.close();
      this.db = null;
    }
    this.initializationPromise = null;
  }
  /**
   * データベースのリセット
   */
  async reset() {
    this.close();
    return new Promise((resolve, reject) => {
      const deleteRequest = indexedDB.deleteDatabase(DB_CONFIG.NAME);
      deleteRequest.onsuccess = () => {
        window.logger?.info("データベースをリセットしたのじゃ");
        resolve();
      };
      deleteRequest.onerror = () => reject(deleteRequest.error);
    });
  }
  /**
   * バックアップの作成
   */
  async createBackup() {
    await this.ensureInitialized();
    const backup = {
      version: DB_CONFIG.CURRENT_VERSION,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      stores: {}
    };
    const storeNames = Array.from(this.db.objectStoreNames);
    const transaction = this.db.transaction(storeNames, "readonly");
    for (const storeName of storeNames) {
      const store = transaction.objectStore(storeName);
      const request = store.getAll();
      backup.stores[storeName] = await new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    }
    return backup;
  }
  /**
   * デバッグ情報の取得
   */
  async getDebugInfo() {
    const stats = await this.getDatabaseStats();
    const migrationDebug = this.migrationManager.getDebugInfo();
    return {
      initialized: !!this.db,
      dbVersion: DB_CONFIG.CURRENT_VERSION,
      stats,
      migration: migrationDebug,
      cleanupTimer: !!this.cleanupTimer
    };
  }
}

const DB_NAME = "NicoCachePlayerDB";
const STORE_NAME = "playerSettings";
const DB_VERSION = 1;
const dbManager = DatabaseManager.getInstance();
const initializeDB = async () => {
  try {
    await dbManager.initialize();
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onerror = (event) => {
        window.logger?.error("IndexedDBを開けませんでした:", event);
        reject(new Error("IndexedDBを開けませんでした"));
      };
      request.onsuccess = (event) => {
        const db = event.target.result;
        resolve(db);
      };
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: "id" });
        }
      };
    });
  } catch (error) {
    window.logger?.error("昇格機能初期化エラー:", error);
    throw error;
  }
};
const saveSettings = async (key, value) => {
  try {
    await dbManager.savePlayerSetting(key, value);
    window.logger?.debug(`設定保存完了: ${key}`);
  } catch (error) {
    window.logger?.error(`昇格機能での設定保存失敗: ${key}`, error);
    return new Promise((resolve, reject) => {
      initializeDB().then((db) => {
        const transaction = db.transaction([STORE_NAME], "readwrite");
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put({
          id: key,
          value,
          updatedAt: (/* @__PURE__ */ new Date()).toISOString()
        });
        request.onsuccess = () => {
          resolve();
        };
        request.onerror = (event) => {
          window.logger?.error(`設定 "${key}" の保存に失敗したのじゃ:`, event);
          reject(new Error(`設定 "${key}" の保存に失敗したのじゃ`));
        };
        transaction.oncomplete = () => {
          db.close();
        };
      }).catch(reject);
    });
  }
};
const getSettings = async (key, defaultValue) => {
  try {
    const result = await dbManager.getPlayerSetting(key, defaultValue);
    window.logger?.debug(`設定取得完了: ${key}`);
    return result;
  } catch (error) {
    window.logger?.error(`昇格機能での設定取得失敗: ${key}`, error);
    return new Promise((resolve) => {
      initializeDB().then((db) => {
        const transaction = db.transaction([STORE_NAME], "readonly");
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(key);
        request.onsuccess = () => {
          const result = request.result;
          if (result) {
            resolve(result.value);
          } else {
            resolve(defaultValue);
          }
        };
        request.onerror = (event) => {
          window.logger?.error(`設定 "${key}" の取得に失敗したのじゃ:`, event);
          resolve(defaultValue);
        };
        transaction.oncomplete = () => {
          db.close();
        };
      }).catch((error2) => {
        window.logger?.error("DB初期化エラー:", error2);
        resolve(defaultValue);
      });
    });
  }
};

class PlayerControlsShadow extends HTMLElement {
  constructor() {
    super();
    this.video = null;
    this.mouseTimer = null;
    this.commentSystem = null;
    this.userPaused = false;
    this.isSettingsOpen = false;
    // コメント設定関連
    this.commentOpacity = PLAYER_SETTINGS.COMMENT.OPACITY.DEFAULT;
    this.commentColor = PLAYER_SETTINGS.COMMENT.COLORS.WHITE;
    this.ngWords = [];
    this.ngRegex = [];
    // 一時的な設定保存用
    this.tempOpacity = PLAYER_SETTINGS.COMMENT.OPACITY.DEFAULT;
    this.tempColor = PLAYER_SETTINGS.COMMENT.COLORS.WHITE;
    this.tempNgWords = [];
    this.tempNgRegex = [];
    this.initialized = false;
    /**
     * コントロールモード変更処理
     */
    this.handleControlsModeChange = (e) => {
      const select = e.target;
      const mode = select.value;
      localStorage.setItem("controlsMode", mode);
      this.applyControlsMode(mode);
    };
    /**
     * キーボードショートカットの処理
     */
    this.handleKeyboardShortcuts = (e) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (!this.video) return;
      switch (e.key.toLowerCase()) {
        case " ":
        case "k":
          e.preventDefault();
          if (this.video.paused) {
            this.video.play().catch((err) => window.logger.error("再生開始に失敗したのじゃ:", err));
          } else {
            this.video.pause();
            this.userPaused = true;
          }
          break;
        case "f":
          e.preventDefault();
          this.toggleFullscreen();
          break;
        case "m":
          e.preventDefault();
          this.video.muted = !this.video.muted;
          this.updateVolumeIcon();
          break;
        case "arrowleft":
          e.preventDefault();
          this.video.currentTime = Math.max(this.video.currentTime - 5, 0);
          break;
        case "arrowright":
          e.preventDefault();
          this.video.currentTime = Math.min(this.video.currentTime + 5, this.video.duration || 0);
          break;
        case "j":
          e.preventDefault();
          this.video.currentTime = Math.max(this.video.currentTime - 10, 0);
          break;
        case "l":
          e.preventDefault();
          this.video.currentTime = Math.min(this.video.currentTime + 10, this.video.duration || 0);
          break;
      }
    };
    this.shadow = this.attachShadow({ mode: "closed" });
    this.shadow.innerHTML = this.getTemplate();
    this.initializeComponent();
  }
  /**
   * コンポーネントの非同期初期化
   */
  async initializeComponent() {
    await new Promise((resolve) => {
      if (this.shadow && this.shadow.firstElementChild) {
        resolve(void 0);
        return;
      }
      const observer = new MutationObserver(() => {
        if (this.shadow && this.shadow.firstElementChild) {
          observer.disconnect();
          resolve(void 0);
        }
      });
      observer.observe(this.shadow, { childList: true });
      setTimeout(() => {
        observer.disconnect();
        resolve(void 0);
      }, 100);
    });
    this.setupEventListeners();
    this.setupInitialIcons();
    this.initialized = true;
    const savedControlsMode = localStorage.getItem("controlsMode") || PLAYER_SETTINGS.CONTROLS_MODE.HOVER;
    this.applyControlsMode(savedControlsMode);
    window.logger.info("PlayerControlsShadowの初期化が完了したのじゃ！");
  }
  /**
   * ビデオ要素を設定
   */
  setVideoElement(video) {
    if (!video) {
      window.logger.error("無効なビデオ要素が渡されたのじゃ");
      return;
    }
    this.ensureInitialized();
    this.video = video;
    this.setupVideoEvents();
    this.initializeSettings();
    window.logger.info("ビデオ要素が設定されたのじゃ！");
  }
  /**
   * コメントシステムを設定
   */
  setCommentSystem(commentSystem) {
    this.commentSystem = commentSystem;
    const commentToggle = this.shadow.querySelector("#comment-toggle");
    if (commentToggle && this.commentSystem) {
      commentToggle.classList.toggle("active", !this.commentSystem.getVisibility());
    }
    if (this.commentSystem) {
      this.commentSystem.setOpacity(this.commentOpacity);
      this.commentSystem.setDefaultColor(this.commentColor);
      this.commentSystem.setNGWords(this.ngWords);
      this.commentSystem.setNGRegex(this.ngRegex);
    }
  }
  /**
   * HTMLテンプレートを取得
   */
  getTemplate() {
    return `
      <style>
        ${this.getStyles()}
      </style>
      <div class="player-controls">
        <div class="progress-container-custom">
          <input type="range" id="seek-bar" min="0" max="100" value="0">
          <div class="progress-bar-custom"></div>
        </div>
        <div class="controls-bar">
          <div class="controls-left">
            <button id="play-pause" title="再生/一時停止">${PLAYER_ICONS.play}</button>
            <div class="volume-control">
              <button id="mute" title="ミュート切替">${PLAYER_ICONS.volume}</button>
              <input type="range" id="volume" class="custom-slider" min="0" max="100" value="100">
            </div>
          </div>
          <div class="controls-center">
            <button id="rewind-10" title="10秒戻す">${PLAYER_ICONS.rewind10}</button>
            <span id="current-time" class="time-display">00:00</span>
            <span class="time-separator">/</span>
            <span id="duration" class="time-display">00:00</span>
            <button id="forward-10" title="10秒進める">${PLAYER_ICONS.forward10}</button>
          </div>
          <div class="controls-right">
            <button id="comment-toggle" title="コメント表示切替">${PLAYER_ICONS.comment}</button>
            <button id="fullscreen" title="全画面表示">${PLAYER_ICONS.fullscreen}</button>
            <button id="settings" title="設定">${PLAYER_ICONS.settings}</button>
          </div>
        </div>

        <!-- 設定メニュー -->
        <div id="player-settings-menu">
          ${this.getSettingsMenuTemplate()}
        </div>
      </div>
    `;
  }
  /**
   * 設定メニューのテンプレートを取得
   */
  getSettingsMenuTemplate() {
    return `
      <div class="settings-container">
        <!-- プレイヤー設定部分 -->
        <div class="settings-section">
          <h3 class="settings-heading">プレイヤー設定</h3>
          <div class="settings-item">
            <span>コントロール表示</span>
            <select id="controls-mode">
              <option value="hover">ホバー時のみ</option>
              <option value="always">常に表示</option>
            </select>
          </div>
        </div>
        
        <!-- コメント設定部分 -->
        <div class="settings-section">
          <h3 class="settings-heading">コメント設定</h3>
          
          <!-- コメント透明度 -->
          <div class="settings-item">
            <span>透明度</span>
            <input 
              type="range" 
              id="comment-opacity" 
              min="${PLAYER_SETTINGS.COMMENT.OPACITY.MIN}" 
              max="${PLAYER_SETTINGS.COMMENT.OPACITY.MAX}" 
              step="${PLAYER_SETTINGS.COMMENT.OPACITY.STEP}" 
              value="${PLAYER_SETTINGS.COMMENT.OPACITY.DEFAULT}"
            >
            <span id="opacity-value">${PLAYER_SETTINGS.COMMENT.OPACITY.DEFAULT}</span>
          </div>
          
          <!-- コメント色 -->
          <div class="settings-item">
            <span>デフォルト色</span>
            <select id="comment-color">
              <option value="${PLAYER_SETTINGS.COMMENT.COLORS.WHITE}">白</option>
              <option value="${PLAYER_SETTINGS.COMMENT.COLORS.RED}">赤</option>
              <option value="${PLAYER_SETTINGS.COMMENT.COLORS.BLUE}">青</option>
              <option value="${PLAYER_SETTINGS.COMMENT.COLORS.GREEN}">緑</option>
              <option value="${PLAYER_SETTINGS.COMMENT.COLORS.YELLOW}">黄色</option>
              <option value="${PLAYER_SETTINGS.COMMENT.COLORS.CYAN}">水色</option>
              <option value="${PLAYER_SETTINGS.COMMENT.COLORS.MAGENTA}">マゼンタ</option>
              <option value="${PLAYER_SETTINGS.COMMENT.COLORS.ORANGE}">オレンジ</option>
              <option value="${PLAYER_SETTINGS.COMMENT.COLORS.PURPLE}">紫</option>
            </select>
          </div>
          
          <!-- NGワード設定 -->
          <div class="settings-item">
            <span>NGワード設定</span>
            <div class="ng-container">
              <div class="ng-input-container">
                <input type="text" id="ng-word-input" placeholder="NGワードを入力">
                <button id="add-ng-word">追加</button>
              </div>
              <ul id="ng-word-list" class="ng-list"></ul>
            </div>
          </div>
          
          <!-- NG正規表現設定 -->
          <div class="settings-item">
            <span>NG正規表現設定</span>
            <div class="ng-container">
              <div class="ng-input-container">
                <input type="text" id="ng-regex-input" placeholder="NG正規表現を入力">
                <button id="add-ng-regex">追加</button>
              </div>
              <ul id="ng-regex-list" class="ng-list"></ul>
            </div>
          </div>

          <!-- 適用ボタン -->
          <div class="settings-item settings-actions">
            <button id="apply-comment-settings" class="button-primary">適用</button>
          </div>
        </div>
      </div>
    `;
  }
  /**
   * CSSスタイルを取得（シャドウDOM内で完全に分離）
   */
  getStyles() {
    return `
      ${materialIconsStyles}
      
      :host {
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        z-index: 9999;
        /* シャドウDOM内では外部スタイルの影響を受けない */
      }

      /* 全画面時のホスト要素スタイル */
      :host(.fullscreen-active) {
        position: fixed !important;
        bottom: 0 !important;
        left: 0 !important;
        right: 0 !important;
        width: 100vw !important;
        z-index: 2000 !important;
      }

      .player-controls {
        position: relative; /* 設定メニューの基準点として設定 */
        padding: 10px;
        background: linear-gradient(transparent, rgba(0, 0, 0, 0.7));
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.3s ease;
      }

      /* 全画面時のプレーヤーコントロール背景強化 */
      :host(.fullscreen-active) .player-controls {
        background: linear-gradient(transparent, rgba(0, 0, 0, 0.85)) !important;
        padding: 15px 20px !important;
      }

      /* ホバー時またはコントロール表示状態 */
      :host(.controls-visible) .player-controls,
      :host(.always-visible) .player-controls {
        opacity: 1;
        pointer-events: auto;
      }

      /* 常に表示モードの場合は即座に表示 */
      :host(.always-visible) .player-controls {
        transition: none;
      }

      .progress-container-custom {
        width: 100%;
        height: 4px;
        margin-bottom: 10px;
        position: relative;
        cursor: pointer;
      }

      #seek-bar {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(255, 255, 255, 0.3);
        border-radius: 2px;
        cursor: pointer;
        -webkit-appearance: none;
        appearance: none;
        border: none;
        outline: none;
        pointer-events: auto;
        margin: 0;
        padding: 0;
      }

      #seek-bar::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 0;
        height: 0;
      }

      #seek-bar::-moz-range-thumb {
        width: 0;
        height: 0;
        border: none;
      }

      .progress-bar-custom {
        position: absolute;
        top: 0;
        left: 0;
        height: 100%;
        background: #007bff;
        border-radius: 2px;
        pointer-events: none;
        transition: width 0.1s linear;
      }

      .progress-container-custom:hover #seek-bar,
      .progress-container-custom:hover .progress-bar-custom {
        height: 6px;
      }

      .controls-bar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0 10px;
      }

      .controls-left,
      .controls-center,
      .controls-right {
        display: flex;
        align-items: center;
        gap: 10px;
      }

      .controls-right {
        position: relative; /* 設定メニューの追加基準点 */
      }

      .volume-control {
        display: flex;
        align-items: center;
        gap: 5px;
      }

      #volume {
        width: 80px;
        height: 4px;
        -webkit-appearance: none;
        background: rgba(255, 255, 255, 0.3);
        border-radius: 2px;
        cursor: pointer;
        transition: height 0.2s;
      }

      #volume:hover {
        height: 6px;
      }

      #volume::-webkit-slider-thumb {
        -webkit-appearance: none;
        width: 0;
        height: 0;
      }

      #volume::-moz-range-thumb {
        width: 0;
        height: 0;
        border: 0;
      }

      #volume::-webkit-slider-runnable-track {
        height: 100%;
        background: linear-gradient(to right, #007bff var(--volume), rgba(255, 255, 255, 0.3) var(--volume));
        border-radius: 2px;
      }

      #volume::-moz-range-track {
        height: 100%;
        background: linear-gradient(to right, #007bff var(--volume), rgba(255, 255, 255, 0.3) var(--volume));
        border-radius: 2px;
      }

      button {
        background: none;
        border: none;
        color: white;
        cursor: pointer;
        padding: 5px;
        font-size: 16px;
        opacity: 0.8;
        transition: opacity 0.2s;
      }

      button:hover {
        opacity: 1;
      }

      button.active {
        color: #007bff;
      }

      .time-display {
        color: white;
        font-size: 14px;
        font-family: monospace;
      }

      .time-separator {
        color: white;
        margin: 0 5px;
      }

      /* SVGアイコンのスタイル */
      svg {
        width: 24px;
        height: 24px;
        fill: currentColor;
        display: block;
      }

      /* 設定メニューのスタイル */
      #player-settings-menu {
        display: none;
        position: absolute;
        bottom: 100%;
        right: 10px; /* 右端から少し内側に配置 */
        background: rgba(28, 28, 28, 0.95);
        border-radius: 8px;
        padding: 15px;
        margin-bottom: 10px;
        min-width: 320px;
        max-width: min(400px, 90vw);
        color: white;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
        z-index: 1000;
        /* 画面からはみ出る場合の調整 */
        transform: translateX(0);
      }

      /* 全画面時のスタイル（従来通りの縦一覧） */
      #player-settings-menu.fullscreen-mode {
        max-width: min(400px, 90vw);
        max-height: none;
        overflow-y: visible;
      }

      #player-settings-menu.fullscreen-mode .settings-container {
        display: block;
      }

      #player-settings-menu.fullscreen-mode .settings-section {
        margin-bottom: 20px;
        padding-bottom: 15px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        border-right: none;
        padding-right: 0;
        margin-right: 0;
      }

      #player-settings-menu.fullscreen-mode .settings-section:last-child {
        border-bottom: none;
        margin-bottom: 0;
      }

      /* 非全画面時のスタイル（フレックス + 高さ制限 + スクロール） */
      #player-settings-menu.windowed-mode {
        max-width: min(800px, 95vw);
        max-height: min(48vh, 600px);
        overflow-y: auto;
      }

      /* スクロールバーのスタイリング */
      #player-settings-menu.windowed-mode::-webkit-scrollbar {
        width: 8px;
      }

      #player-settings-menu.windowed-mode::-webkit-scrollbar-track {
        background: rgba(255, 255, 255, 0.1);
        border-radius: 4px;
      }

      #player-settings-menu.windowed-mode::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.3);
        border-radius: 4px;
      }

      #player-settings-menu.windowed-mode::-webkit-scrollbar-thumb:hover {
        background: rgba(255, 255, 255, 0.5);
      }

      #player-settings-menu.windowed-mode .settings-container {
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
        gap: 20px;
      }

      #player-settings-menu.windowed-mode .settings-section {
        flex: 1;
        min-width: 280px;
        margin-bottom: 0;
        padding-bottom: 0;
        border-bottom: none;
        border-right: 1px solid rgba(255, 255, 255, 0.1);
        padding-right: 15px;
        margin-right: 15px;
      }

      #player-settings-menu.windowed-mode .settings-section:last-child {
        border-right: none;
        padding-right: 0;
        margin-right: 0;
      }

      /* 画面右端からはみ出る場合の調整 */
      #player-settings-menu.adjust-position {
        right: auto;
        left: 0;
        transform: translateX(0);
      }

      #player-settings-menu.visible {
        display: block;
      }

      /* 設定セクションのフレックスレイアウト */
      .settings-container {
        display: flex;
        flex-direction: column;
        gap: 20px;
      }

      .settings-section {
        margin-bottom: 20px;
        padding-bottom: 15px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      }

      .settings-section:last-child {
        border-bottom: none;
        margin-bottom: 0;
      }

      .settings-heading {
        font-size: 16px;
        margin: 0 0 15px 0;
        font-weight: bold;
        color: #007bff;
      }

      .settings-item {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 12px;
        flex-wrap: wrap;
      }

      .settings-item > span:first-child {
        min-width: 100px;
        font-size: 14px;
      }

      .settings-item select,
      .settings-item input[type="text"],
      .settings-item input[type="range"] {
        flex: 1;
        background: rgba(43, 42, 42, 0.88);
        color: white;
        border: 1px solid rgba(255, 255, 255, 0.2);
        padding: 6px 8px;
        border-radius: 4px;
        min-width: 120px;
      }

      .settings-item select:focus,
      .settings-item input:focus {
        outline: none;
        border-color: #007bff;
      }

      .ng-container {
        width: 100%;
      }

      .ng-input-container {
        display: flex;
        gap: 8px;
        margin-bottom: 8px;
      }

      .ng-input-container input {
        flex: 1;
      }

      .ng-input-container button {
        background: #007bff;
        color: white;
        border: none;
        border-radius: 4px;
        padding: 6px 12px;
        cursor: pointer;
        font-size: 12px;
      }

      .ng-input-container button:hover {
        background: #0056b3;
      }

      .ng-list {
        list-style: none;
        padding: 0;
        margin: 0;
        max-height: 120px;
        overflow-y: auto;
        background: rgba(0, 0, 0, 0.3);
        border-radius: 4px;
        border: 1px solid rgba(255, 255, 255, 0.1);
      }

      .ng-list li {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 6px 10px;
        margin: 2px;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 3px;
        font-size: 12px;
        word-break: break-all;
      }

      .ng-list li button {
        background: transparent;
        color: #ff6b6b;
        padding: 2px 6px;
        font-size: 11px;
        margin-left: 8px;
        opacity: 0.7;
      }

      .ng-list li button:hover {
        opacity: 1;
        background: rgba(255, 107, 107, 0.1);
      }

      .settings-actions {
        justify-content: flex-end;
        margin-top: 15px;
      }

      .button-primary {
        background: #007bff;
        color: white;
        border: none;
        border-radius: 4px;
        padding: 8px 16px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 500;
      }

      .button-primary:hover {
        background: #0056b3;
      }

      .button-primary.applied {
        background: #28a745;
      }

      /* モバイル対応 */
      @media (max-width: 768px) {
        .controls-center {
          display: none;
        }
        
        .volume-control {
          display: none;
        }
        
        .player-controls {
          padding: 5px;
        }
        
        button {
          padding: 8px;
          font-size: 20px;
        }

        #player-settings-menu {
          min-width: 280px;
          max-width: 90vw;
        }
      }
    `;
  }
  /**
   * イベントリスナーを設定
   */
  setupEventListeners() {
    if (this.initialized) return;
    this.setupSettingsEvents();
    this.setupControlEvents();
    this.setupCommentEvents();
    this.setupHoverEvents();
    document.addEventListener("keydown", this.handleKeyboardShortcuts);
    this.initialized = true;
  }
  /**
   * 設定関連のイベント設定
   */
  setupSettingsEvents() {
    const settingsBtn = this.shadow.querySelector("#settings");
    if (settingsBtn) {
      settingsBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        this.toggleSettingsMenu();
      });
    }
    document.addEventListener("click", (e) => {
      if (!this.contains(e.target)) {
        this.closeSettingsMenu();
      }
    });
    const controlsModeSelect = this.shadow.querySelector("#controls-mode");
    if (controlsModeSelect) {
      controlsModeSelect.addEventListener("change", this.handleControlsModeChange);
    }
  }
  /**
   * コントロール関連のイベント設定
   */
  setupControlEvents() {
    const playPauseBtn = this.shadow.querySelector("#play-pause");
    if (playPauseBtn) {
      playPauseBtn.addEventListener("click", () => {
        const video = this.getVideo();
        if (!video) return;
        if (video.paused) {
          video.play().catch((e) => window.logger.error("再生開始に失敗したのじゃ:", e));
        } else {
          video.pause();
          this.userPaused = true;
        }
      });
    }
    const rewindBtn = this.shadow.querySelector("#rewind-10");
    const forwardBtn = this.shadow.querySelector("#forward-10");
    if (rewindBtn) {
      rewindBtn.addEventListener("click", () => {
        const video = this.getVideo();
        if (video) {
          video.currentTime = Math.max(video.currentTime - 10, 0);
        }
      });
    }
    if (forwardBtn) {
      forwardBtn.addEventListener("click", () => {
        const video = this.getVideo();
        if (video) {
          video.currentTime = Math.min(video.currentTime + 10, video.duration || 0);
        }
      });
    }
    this.setupProgressControls();
    this.setupVolumeControls();
    this.setupFullscreenControl();
  }
  /**
   * プログレス関連のコントロール設定
   */
  setupProgressControls() {
    const seekBar = this.shadow.querySelector("#seek-bar");
    const progressBar = this.shadow.querySelector(".progress-bar-custom");
    const progressContainer = this.shadow.querySelector(".progress-container-custom");
    if (!seekBar || !progressBar || !progressContainer) return;
    seekBar.addEventListener("change", () => {
      const video = this.getVideo();
      if (video) {
        const progress = Number(seekBar.value);
        video.currentTime = progress / 100 * video.duration;
      }
    });
    seekBar.addEventListener("input", () => {
      const progress = Number(seekBar.value);
      seekBar.style.setProperty("--progress", `${progress}%`);
    });
    progressContainer.addEventListener("click", (e) => {
      const video = this.getVideo();
      if (!video) return;
      const rect = progressContainer.getBoundingClientRect();
      const pos = (e.clientX - rect.left) / rect.width;
      video.currentTime = pos * video.duration;
    });
  }
  /**
   * 音量コントロールの設定
   */
  setupVolumeControls() {
    const volumeBar = this.shadow.querySelector("#volume");
    const muteBtn = this.shadow.querySelector("#mute");
    if (!volumeBar || !muteBtn) return;
    volumeBar.addEventListener("input", () => {
      const video = this.getVideo();
      if (!video) return;
      const volumeValue = Number(volumeBar.value) / 100;
      video.volume = volumeValue;
      volumeBar.style.setProperty("--volume", `${volumeBar.value}%`);
      this.updateVolumeIcon();
    });
    muteBtn.addEventListener("click", () => {
      const video = this.getVideo();
      if (!video) return;
      video.muted = !video.muted;
      this.updateVolumeIcon();
    });
  }
  /**
   * 全画面コントロールの設定
   */
  setupFullscreenControl() {
    const fullscreenBtn = this.shadow.querySelector("#fullscreen");
    if (!fullscreenBtn) return;
    fullscreenBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.toggleFullscreen();
    });
    document.addEventListener("fullscreenchange", () => {
      this.handleFullscreenChange();
    });
  }
  /**
   * コメント関連のイベント設定
   */
  setupCommentEvents() {
    const commentToggle = this.shadow.querySelector("#comment-toggle");
    if (!commentToggle) return;
    commentToggle.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!this.commentSystem) return;
      const isVisible = this.commentSystem.toggleVisibility();
      commentToggle.classList.toggle("active", !isVisible);
      commentToggle.innerHTML = isVisible ? PLAYER_ICONS.comment : PLAYER_ICONS.commentOff;
      localStorage.setItem("commentVisible", isVisible.toString());
    });
    this.setupCommentSettingsEvents();
  }
  /**
   * コメント設定のイベント設定
   */
  setupCommentSettingsEvents() {
    const opacitySlider = this.shadow.querySelector("#comment-opacity");
    const opacityValue = this.shadow.querySelector("#opacity-value");
    if (opacitySlider && opacityValue) {
      opacitySlider.addEventListener("input", () => {
        const opacity = Number(opacitySlider.value);
        opacityValue.textContent = opacitySlider.value;
        this.tempOpacity = opacity;
      });
    }
    const colorSelect = this.shadow.querySelector("#comment-color");
    if (colorSelect) {
      colorSelect.addEventListener("change", () => {
        this.tempColor = colorSelect.value;
      });
    }
    const ngWordInput = this.shadow.querySelector("#ng-word-input");
    const addNgWordBtn = this.shadow.querySelector("#add-ng-word");
    if (ngWordInput && addNgWordBtn) {
      addNgWordBtn.addEventListener("click", () => {
        const word = ngWordInput.value.trim();
        if (word && !this.tempNgWords.includes(word) && this.tempNgWords.length < PLAYER_SETTINGS.COMMENT.NG.MAX_WORDS) {
          this.tempNgWords.push(word);
          ngWordInput.value = "";
          this.updateNGWordList(true);
        }
      });
    }
    const ngRegexInput = this.shadow.querySelector("#ng-regex-input");
    const addNgRegexBtn = this.shadow.querySelector("#add-ng-regex");
    if (ngRegexInput && addNgRegexBtn) {
      addNgRegexBtn.addEventListener("click", () => {
        const regex = ngRegexInput.value.trim();
        try {
          new RegExp(regex);
          if (regex && !this.tempNgRegex.includes(regex) && this.tempNgRegex.length < PLAYER_SETTINGS.COMMENT.NG.MAX_REGEX) {
            this.tempNgRegex.push(regex);
            ngRegexInput.value = "";
            this.updateNGRegexList(true);
          }
        } catch (e) {
          window.logger.error("無効な正規表現なのじゃ:", e);
          ngRegexInput.classList.add("error");
          setTimeout(() => {
            ngRegexInput.classList.remove("error");
          }, 2e3);
        }
      });
    }
    const applyBtn = this.shadow.querySelector("#apply-comment-settings");
    if (applyBtn) {
      applyBtn.addEventListener("click", () => {
        this.applyCommentSettings();
      });
    }
  }
  /**
   * 初期アイコンの設定
   */
  setupInitialIcons() {
    const buttons = [
      { id: "#rewind-10", icon: PLAYER_ICONS.rewind10 },
      { id: "#forward-10", icon: PLAYER_ICONS.forward10 },
      { id: "#fullscreen", icon: PLAYER_ICONS.fullscreen },
      { id: "#settings", icon: PLAYER_ICONS.settings }
    ];
    buttons.forEach(({ id, icon }) => {
      const button = this.shadow.querySelector(id);
      if (button) {
        button.innerHTML = icon;
      }
    });
  }
  /**
   * 初期設定の読み込み
   */
  async initializeSettings() {
    if (!this.video) return;
    this.setupVideoEvents();
    await this.loadCommentSettings();
    const controlsMode = localStorage.getItem("controlsMode") || PLAYER_SETTINGS.CONTROLS_MODE.HOVER;
    this.applyControlsMode(controlsMode);
    const controlsModeSelect = this.shadow.querySelector("#controls-mode");
    if (controlsModeSelect) {
      controlsModeSelect.value = controlsMode;
    }
  }
  /**
   * ビデオイベントの設定
   */
  setupVideoEvents() {
    const video = this.getVideo();
    if (!video) return;
    video.addEventListener("play", () => {
      this.userPaused = false;
      this.updatePlayPauseButton();
    });
    video.addEventListener("pause", () => {
      this.updatePlayPauseButton();
    });
    video.addEventListener("loadeddata", () => {
      this.updatePlayPauseButton();
    });
    video.addEventListener("timeupdate", () => {
      this.updateProgress();
      this.updateTimeDisplay();
    });
    video.addEventListener("loadedmetadata", () => {
      this.updateDurationDisplay();
    });
    video.addEventListener("durationchange", () => {
      this.updateDurationDisplay();
    });
    if (video.duration && !isNaN(video.duration)) {
      this.updateDurationDisplay();
    }
  }
  /**
   * プログレス表示の更新
   */
  updateProgress() {
    const video = this.getVideo();
    if (!video) return;
    const seekBar = this.shadow.querySelector("#seek-bar");
    const progressBar = this.shadow.querySelector(".progress-bar-custom");
    if (!seekBar || !progressBar || isNaN(video.duration)) return;
    const progress = video.currentTime / video.duration * 100;
    progressBar.style.width = `${progress}%`;
    seekBar.value = String(progress);
    seekBar.style.setProperty("--progress", `${progress}%`);
  }
  /**
   * 現在時間表示の更新
   */
  updateTimeDisplay() {
    const video = this.getVideo();
    if (!video) return;
    const currentTimeSpan = this.shadow.querySelector("#current-time");
    if (currentTimeSpan) {
      currentTimeSpan.textContent = this.formatTime(video.currentTime);
    }
  }
  /**
   * 動画長表示の更新
   */
  updateDurationDisplay() {
    const video = this.getVideo();
    if (!video) return;
    const durationSpan = this.shadow.querySelector("#duration");
    if (durationSpan) {
      durationSpan.textContent = this.formatTime(video.duration);
    }
    const seekBar = this.shadow.querySelector("#seek-bar");
    if (seekBar) {
      seekBar.max = "100";
    }
  }
  /**
   * 再生/一時停止ボタンの更新
   */
  updatePlayPauseButton() {
    const button = this.shadow.querySelector("#play-pause");
    const video = this.getVideo();
    if (!button || !video) return;
    if (video.paused) {
      button.classList.remove("playing");
      button.classList.add("paused");
      button.innerHTML = PLAYER_ICONS.play;
    } else {
      button.classList.add("playing");
      button.classList.remove("paused");
      button.innerHTML = PLAYER_ICONS.pause;
    }
  }
  /**
   * 音量アイコンの更新
   */
  updateVolumeIcon() {
    const button = this.shadow.querySelector("#mute");
    const video = this.getVideo();
    if (!button || !video) return;
    if (video.muted || video.volume === 0) {
      button.classList.add("muted");
      button.innerHTML = PLAYER_ICONS.muted;
    } else {
      button.classList.remove("muted");
      button.innerHTML = PLAYER_ICONS.volume;
    }
  }
  /**
   * 時間をMM:SS形式に変換
   */
  formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    seconds = Math.floor(seconds % 60);
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  }
  /**
   * 設定メニューの表示/非表示切り替え
   */
  toggleSettingsMenu() {
    this.isSettingsOpen = !this.isSettingsOpen;
    const settingsMenu = this.shadow.querySelector("#player-settings-menu");
    if (settingsMenu) {
      settingsMenu.classList.toggle("visible", this.isSettingsOpen);
      if (this.isSettingsOpen) {
        const doc = document;
        const isFullScreen = !!doc.fullscreenElement || !!doc.mozFullScreenElement || !!doc.webkitFullscreenElement || !!doc.msFullscreenElement;
        this.updateSettingsMenuMode(isFullScreen);
        requestAnimationFrame(() => {
          this.adjustSettingsMenuPosition(settingsMenu);
        });
      }
    }
  }
  /**
   * 設定メニューの位置を調整（画面からはみ出ないように）
   */
  adjustSettingsMenuPosition(settingsMenu) {
    const settingsBtn = this.shadow.querySelector("#settings");
    if (!settingsBtn) return;
    const btnRect = settingsBtn.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const controlsRect = this.shadow.querySelector(".player-controls")?.getBoundingClientRect();
    if (!controlsRect) return;
    const rightOffset = controlsRect.right - btnRect.right;
    settingsMenu.classList.remove("adjust-position");
    settingsMenu.style.left = "";
    settingsMenu.style.right = `${rightOffset}px`;
    const updatedRect = settingsMenu.getBoundingClientRect();
    if (updatedRect.right > viewportWidth - 10) {
      const overflowAmount = updatedRect.right - (viewportWidth - 10);
      settingsMenu.style.right = `${rightOffset + overflowAmount}px`;
    }
    const finalRect = settingsMenu.getBoundingClientRect();
    if (finalRect.left < 10) {
      settingsMenu.style.left = "10px";
      settingsMenu.style.right = "auto";
    }
    if (updatedRect.top < 10) {
      settingsMenu.style.bottom = "auto";
      settingsMenu.style.top = "100%";
      settingsMenu.style.marginTop = "10px";
      settingsMenu.style.marginBottom = "0";
    }
  }
  /**
   * 設定メニューを閉じる
   */
  closeSettingsMenu() {
    if (this.isSettingsOpen) {
      this.isSettingsOpen = false;
      const settingsMenu = this.shadow.querySelector("#player-settings-menu");
      if (settingsMenu) {
        settingsMenu.classList.remove("visible");
        settingsMenu.classList.remove("adjust-position");
        settingsMenu.style.left = "";
        settingsMenu.style.right = "";
        settingsMenu.style.top = "";
        settingsMenu.style.bottom = "";
        settingsMenu.style.marginTop = "";
        settingsMenu.style.marginBottom = "";
      }
    }
  }
  /**
   * コントロールモードを適用
   */
  applyControlsMode(mode) {
    if (mode === PLAYER_SETTINGS.CONTROLS_MODE.ALWAYS) {
      this.classList.add("always-visible");
      this.classList.add("controls-visible");
    } else {
      this.classList.remove("always-visible");
      this.classList.remove("controls-visible");
    }
  }
  /**
   * コメント設定の読み込み
   */
  async loadCommentSettings() {
    try {
      const [opacity, color, words, regexList] = await Promise.all([
        getSettings("commentOpacity", PLAYER_SETTINGS.COMMENT.OPACITY.DEFAULT),
        getSettings("commentColor", PLAYER_SETTINGS.COMMENT.COLORS.WHITE),
        getSettings("ngWords", []),
        getSettings("ngRegex", [])
      ]);
      this.commentOpacity = opacity;
      this.tempOpacity = opacity;
      this.commentColor = color;
      this.tempColor = color;
      this.ngWords = words;
      this.tempNgWords = [...words];
      this.ngRegex = regexList;
      this.tempNgRegex = [...regexList];
      this.updateSettingsUI();
      if (this.commentSystem) {
        this.commentSystem.setOpacity(this.commentOpacity);
        this.commentSystem.setDefaultColor(this.commentColor);
        this.commentSystem.setNGWords(this.ngWords);
        this.commentSystem.setNGRegex(this.ngRegex);
      }
    } catch (error) {
      window.logger.error("コメント設定の読み込みに失敗したのじゃ:", error);
    }
  }
  /**
   * 設定UIの更新
   */
  updateSettingsUI() {
    const opacitySlider = this.shadow.querySelector("#comment-opacity");
    const opacityValue = this.shadow.querySelector("#opacity-value");
    if (opacitySlider && opacityValue) {
      opacitySlider.value = String(this.commentOpacity);
      opacityValue.textContent = String(this.commentOpacity);
    }
    const colorSelect = this.shadow.querySelector("#comment-color");
    if (colorSelect) {
      colorSelect.value = this.commentColor;
    }
    this.updateNGWordList();
    this.updateNGRegexList();
  }
  /**
   * NGワードリストの更新
   */
  updateNGWordList(isTemp = false) {
    const ngList = this.shadow.querySelector("#ng-word-list");
    if (!ngList) return;
    ngList.innerHTML = "";
    const words = isTemp ? this.tempNgWords : this.ngWords;
    words.forEach((word, index) => {
      const li = document.createElement("li");
      li.textContent = word;
      const removeBtn = document.createElement("button");
      removeBtn.textContent = "削除";
      removeBtn.addEventListener("click", () => {
        if (isTemp) {
          this.tempNgWords.splice(index, 1);
          this.updateNGWordList(true);
        } else {
          this.removeNGWord(index);
        }
      });
      li.appendChild(removeBtn);
      ngList.appendChild(li);
    });
  }
  /**
   * NG正規表現リストの更新
   */
  updateNGRegexList(isTemp = false) {
    const ngList = this.shadow.querySelector("#ng-regex-list");
    if (!ngList) return;
    ngList.innerHTML = "";
    const regexList = isTemp ? this.tempNgRegex : this.ngRegex;
    regexList.forEach((regex, index) => {
      const li = document.createElement("li");
      li.textContent = regex;
      const removeBtn = document.createElement("button");
      removeBtn.textContent = "削除";
      removeBtn.addEventListener("click", () => {
        if (isTemp) {
          this.tempNgRegex.splice(index, 1);
          this.updateNGRegexList(true);
        } else {
          this.removeNGRegex(index);
        }
      });
      li.appendChild(removeBtn);
      ngList.appendChild(li);
    });
  }
  /**
   * NGワードを削除
   */
  async removeNGWord(index) {
    this.ngWords.splice(index, 1);
    await saveSettings("ngWords", this.ngWords);
    this.updateNGWordList();
    if (this.commentSystem) {
      this.commentSystem.setNGWords(this.ngWords);
    }
  }
  /**
   * NG正規表現を削除
   */
  async removeNGRegex(index) {
    this.ngRegex.splice(index, 1);
    await saveSettings("ngRegex", this.ngRegex);
    this.updateNGRegexList();
    if (this.commentSystem) {
      this.commentSystem.setNGRegex(this.ngRegex);
    }
  }
  /**
   * コメント設定を適用
   */
  async applyCommentSettings() {
    try {
      this.commentOpacity = this.tempOpacity;
      this.commentColor = this.tempColor;
      this.ngWords = [...this.tempNgWords];
      this.ngRegex = [...this.tempNgRegex];
      await Promise.all([
        saveSettings("commentOpacity", this.commentOpacity),
        saveSettings("commentColor", this.commentColor),
        saveSettings("ngWords", this.ngWords),
        saveSettings("ngRegex", this.ngRegex)
      ]);
      if (this.commentSystem) {
        this.commentSystem.setOpacity(this.commentOpacity);
        this.commentSystem.setDefaultColor(this.commentColor);
        this.commentSystem.setNGWords(this.ngWords);
        this.commentSystem.setNGRegex(this.ngRegex);
      }
      this.showApplyFeedback();
      window.logger.info(`コメント設定を適用したのじゃ！ 透明度: ${this.commentOpacity}, 色: ${this.commentColor}, NGワード: ${this.ngWords.length}件, NG正規表現: ${this.ngRegex.length}件`);
    } catch (error) {
      window.logger.error("コメント設定の適用に失敗したのじゃ:", error);
    }
  }
  /**
   * 設定適用のフィードバック表示
   */
  showApplyFeedback() {
    const applyBtn = this.shadow.querySelector("#apply-comment-settings");
    if (!applyBtn) return;
    const originalText = applyBtn.textContent;
    applyBtn.textContent = "✓ 適用しました";
    applyBtn.classList.add("applied");
    setTimeout(() => {
      applyBtn.textContent = originalText;
      applyBtn.classList.remove("applied");
    }, 2e3);
  }
  /**
   * 全画面表示の切り替え
   */
  toggleFullscreen() {
    try {
      const doc = document;
      if (!doc.fullscreenElement && !doc.mozFullScreenElement && !doc.webkitFullscreenElement && !doc.msFullscreenElement) {
        const playerContainer = this.closest(".custom-player");
        if (playerContainer) {
          window.logger.info("全画面化を試行するのじゃ:", {
            hasRequestFullscreen: !!playerContainer.requestFullscreen,
            hasMozRequestFullScreen: !!playerContainer.mozRequestFullScreen,
            hasWebkitRequestFullscreen: !!playerContainer.webkitRequestFullscreen,
            hasMsRequestFullscreen: !!playerContainer.msRequestFullscreen
          });
          if (playerContainer.requestFullscreen) {
            playerContainer.requestFullscreen().then(() => {
              window.logger.info("標準全画面API成功したのじゃ");
              document.documentElement.classList.add("fullscreen-active");
              document.body.classList.add("nc-fullscreen-active");
              playerContainer.classList.add("nc-fullscreen-player");
            }).catch((err) => {
              window.logger.error("標準全画面APIが失敗したのじゃ:", err);
              this.fallbackFullscreen(playerContainer);
            });
          } else if (playerContainer.mozRequestFullScreen) {
            playerContainer.mozRequestFullScreen();
            window.logger.info("Firefox全画面API使用したのじゃ");
          } else if (playerContainer.webkitRequestFullscreen) {
            playerContainer.webkitRequestFullscreen();
            window.logger.info("WebKit全画面API使用したのじゃ");
          } else if (playerContainer.msRequestFullscreen) {
            playerContainer.msRequestFullscreen();
            window.logger.info("IE全画面API使用したのじゃ");
          } else {
            window.logger.warn("全画面APIが利用できないため、フォールバックを使用するのじゃ");
            this.fallbackFullscreen(playerContainer);
          }
        }
      } else {
        if (doc.exitFullscreen) {
          doc.exitFullscreen().then(() => {
            window.logger.info("全画面解除成功したのじゃ");
            document.documentElement.classList.remove("fullscreen-active");
            document.body.classList.remove("nc-fullscreen-active");
            const playerContainer = this.closest(".custom-player");
            if (playerContainer) {
              playerContainer.classList.remove("nc-fullscreen-player");
            }
          }).catch((err) => {
            window.logger.error("全画面解除が失敗したのじゃ:", err);
          });
        } else if (doc.mozCancelFullScreen) {
          doc.mozCancelFullScreen();
        } else if (doc.webkitExitFullscreen) {
          doc.webkitExitFullscreen();
        } else if (doc.msExitFullscreen) {
          doc.msExitFullscreen();
        }
      }
    } catch (error) {
      window.logger.error("全画面切り替えでエラーが発生したのじゃ:", error);
      const playerContainer = this.closest(".custom-player");
      if (playerContainer) {
        this.fallbackFullscreen(playerContainer);
      }
    }
  }
  /**
   * フォールバック全画面処理
   */
  fallbackFullscreen(playerContainer) {
    window.logger.info("フォールバック全画面モードを使用するのじゃ");
    document.documentElement.classList.add("fullscreen-active");
    document.body.classList.add("nc-fullscreen-active");
    playerContainer.classList.add("nc-fullscreen-player");
    const handleEscape = (e) => {
      if (e.key === "Escape") {
        document.documentElement.classList.remove("fullscreen-active");
        document.body.classList.remove("nc-fullscreen-active");
        playerContainer.classList.remove("nc-fullscreen-player");
        document.removeEventListener("keydown", handleEscape);
        window.logger.info("フォールバック全画面モードを終了したのじゃ");
      }
    };
    document.addEventListener("keydown", handleEscape);
  }
  /**
   * 全画面状態変更時の処理
   */
  handleFullscreenChange() {
    const doc = document;
    const isFullScreen = !!doc.fullscreenElement || !!doc.mozFullScreenElement || !!doc.webkitFullscreenElement || !!doc.msFullscreenElement;
    const fullscreenBtn = this.shadow.querySelector("#fullscreen");
    if (fullscreenBtn) {
      fullscreenBtn.innerHTML = isFullScreen ? PLAYER_ICONS.exitFullscreen : PLAYER_ICONS.fullscreen;
    }
    this.classList.toggle("fullscreen-active", isFullScreen);
    this.updateSettingsMenuMode(isFullScreen);
    if (isFullScreen) {
      setTimeout(() => this.forceVideoCentering(), 100);
    } else {
      this.resetVideoStyles();
    }
  }
  /**
   * 全画面時にビデオ要素を強制的に中央配置
   */
  forceVideoCentering() {
    const video = this.getVideo();
    if (!video) return;
    try {
      window.logger.info("ビデオ要素の強制中央配置を実行するのじゃ");
      const screenWidth = window.innerWidth;
      const screenHeight = window.innerHeight;
      const screenRatio = screenWidth / screenHeight;
      const videoWidth = video.videoWidth || video.clientWidth;
      const videoHeight = video.videoHeight || video.clientHeight;
      const videoRatio = videoWidth / videoHeight;
      window.logger.info("サイズ情報:", {
        screen: { width: screenWidth, height: screenHeight, ratio: screenRatio },
        video: { width: videoWidth, height: videoHeight, ratio: videoRatio }
      });
      video.style.position = "fixed";
      video.style.top = "50%";
      video.style.left = "50%";
      video.style.transform = "translate(-50%, -50%)";
      video.style.zIndex = "1000";
      video.style.backgroundColor = "#000";
      if (videoRatio > screenRatio) {
        video.style.width = "100vw";
        video.style.height = "auto";
      } else {
        video.style.width = "auto";
        video.style.height = "100vh";
      }
      setTimeout(() => {
        if (this.commentSystem) {
          const renderer = this.commentSystem.renderer;
          if (renderer && renderer.resizeCanvas) {
            renderer.resizeCanvas();
            window.logger.info("コメントキャンバスのリサイズを実行したのじゃ");
          }
        }
      }, 50);
      window.logger.info("強制中央配置完了したのじゃ");
    } catch (error) {
      window.logger.error("ビデオ強制中央配置でエラーが発生したのじゃ:", error);
    }
  }
  /**
   * 設定メニューの表示モードを更新
   */
  updateSettingsMenuMode(isFullScreen) {
    const settingsMenu = this.shadow.querySelector("#player-settings-menu");
    if (settingsMenu) {
      settingsMenu.classList.toggle("fullscreen-mode", isFullScreen);
      settingsMenu.classList.toggle("windowed-mode", !isFullScreen);
    }
  }
  /**
   * 表示状態の制御
   */
  show() {
    this.classList.add("visible");
  }
  hide() {
    this.classList.remove("visible");
  }
  /**
   * プレイヤー再生（外部から呼ばれる）
   */
  playVideo() {
    if (this.userPaused || !this.video) {
      return;
    }
    this.video.play().catch((err) => window.logger.error("自動再生に失敗したのじゃ:", err));
  }
  /**
   * コンポーネントの破棄
   */
  disconnectedCallback() {
    document.removeEventListener("keydown", this.handleKeyboardShortcuts);
    this.clearHideTimer();
    this.video = null;
    this.commentSystem = null;
  }
  ensureInitialized() {
    if (this.initialized) return;
    if (!this.shadow || !this.shadow.firstElementChild) {
      window.logger.warn("シャドウDOMがまだ準備されていないのじゃ");
      return;
    }
    this.setupEventListeners();
    this.setupInitialIcons();
    this.initialized = true;
    window.logger.info("PlayerControlsShadowの初期化が完了したのじゃ");
  }
  /**
   * ビデオ要素を取得（未設定ならDOMから自動検出）
   */
  getVideo() {
    if (this.video) return this.video;
    const v = document.getElementById("video-element");
    if (v) {
      this.video = v;
    }
    return this.video;
  }
  /**
   * マウスホバーイベントの設定
   */
  setupHoverEvents() {
    const playerContainer = this.closest(".custom-player") || this.parentElement;
    if (playerContainer) {
      playerContainer.addEventListener("mouseenter", () => {
        this.showControls();
      });
      playerContainer.addEventListener("mouseleave", () => {
        this.hideControlsWithDelay();
      });
      playerContainer.addEventListener("mousemove", () => {
        this.showControls();
        this.hideControlsWithDelay();
      });
    }
    this.addEventListener("mouseenter", () => {
      this.showControls();
      this.clearHideTimer();
    });
    this.addEventListener("mouseleave", () => {
      this.hideControlsWithDelay();
    });
  }
  /**
   * コントロールを表示
   */
  showControls() {
    this.classList.add("controls-visible");
    this.clearHideTimer();
  }
  /**
   * コントロールを遅延して非表示
   */
  hideControlsWithDelay() {
    if (this.classList.contains("always-visible")) {
      return;
    }
    this.clearHideTimer();
    this.mouseTimer = window.setTimeout(() => {
      this.classList.remove("controls-visible");
    }, 3e3);
  }
  /**
   * 非表示タイマーをクリア
   */
  clearHideTimer() {
    if (this.mouseTimer !== null) {
      clearTimeout(this.mouseTimer);
      this.mouseTimer = null;
    }
  }
  /**
   * ビデオスタイルのリセット（全画面解除時）
   */
  resetVideoStyles() {
    const video = this.getVideo();
    if (!video) return;
    try {
      window.logger.info("ビデオ要素のスタイルをリセットするのじゃ");
      video.style.position = "";
      video.style.top = "";
      video.style.left = "";
      video.style.transform = "";
      video.style.zIndex = "";
      video.style.backgroundColor = "";
      video.style.width = "";
      video.style.height = "";
      window.logger.info("ビデオスタイルリセット完了したのじゃ");
    } catch (error) {
      window.logger.error("ビデオスタイルリセットでエラーが発生したのじゃ:", error);
    }
  }
}
if (!customElements.get("player-controls-shadow")) {
  customElements.define("player-controls-shadow", PlayerControlsShadow);
  window.logger.info("player-controls-shadowカスタムエレメントを登録したのじゃ！");
} else {
  window.logger.info("player-controls-shadowカスタムエレメントは既に登録済みじゃ");
}

class CommentList extends HTMLElement {
  constructor() {
    super();
    this.list = null;
    this.comments = [];
    this.currentTime = 0;
    this.autoScroll = true;
    this.resizeObserver = null;
    this.shadow = this.attachShadow({ mode: "closed" });
    this.shadow.innerHTML = this.getTemplate();
    this.setupEventListeners();
  }
  /**
   * HTMLテンプレートを取得
   */
  getTemplate() {
    return `
      <style>
        ${this.getStyles()}
      </style>
      <div class="comment-list-container">
        <div class="comment-list-header">
          <span>コメントリスト</span>
        </div>
        <div class="comment-list"></div>
      </div>
    `;
  }
  /**
   * CSSスタイルを取得（シャドウDOM内で完全に分離）
   */
  getStyles() {
    return `
      :host {
        display: block;
        width: 400px;
        background: rgba(40, 40, 40, 0.95);
        border-radius: 8px;
        overflow: hidden;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        font-family: Arial, sans-serif;
        color: white;
        box-sizing: border-box;
        /* シャドウDOM内では外部スタイルの影響を受けない */
      }

      .comment-list-container {
        height: 100%;
        display: flex;
        flex-direction: column;
      }

      .comment-list-header {
        background: rgba(0, 123, 255, 0.8);
        padding: 12px 16px;
        font-weight: bold;
        font-size: 14px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        text-align: center;
      }

      .comment-list {
        flex: 1;
        overflow-y: auto;
        scrollbar-width: thin;
        scrollbar-color: rgba(255, 255, 255, 0.3) transparent;
      }

      .comment-list::-webkit-scrollbar {
        width: 6px;
      }

      .comment-list::-webkit-scrollbar-track {
        background: transparent;
      }

      .comment-list::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.3);
        border-radius: 3px;
      }

      .comment-list::-webkit-scrollbar-thumb:hover {
        background: rgba(255, 255, 255, 0.5);
      }

      .comment-item {
        padding: 8px 12px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        cursor: pointer;
        transition: background-color 0.2s;
        font-size: 13px;
        line-height: 1.4;
      }

      .comment-item:hover {
        background: rgba(255, 255, 255, 0.05);
      }

      .comment-item.active {
        background: rgba(0, 123, 255, 0.2);
        border-left: 3px solid #007bff;
        padding-left: 9px;
      }

      .comment-time {
        color: #80cbc4;
        font-size: 11px;
        font-family: monospace;
        margin-right: 8px;
        min-width: 45px;
        display: inline-block;
      }

      .comment-text {
        color: white;
        word-break: break-word;
        line-height: 1.3;
      }

      .comment-item:last-child {
        border-bottom: none;
      }

      /* 空の状態 */
      .comment-list:empty::before {
        content: "コメントがありません";
        display: block;
        text-align: center;
        padding: 40px 20px;
        color: rgba(255, 255, 255, 0.5);
        font-style: italic;
      }

      /* レスポンシブ対応 */
      @media (max-width: 1023px) {
        :host {
          width: 100%;
          max-width: 100vw;
          height: 300px;
          margin-top: 10px;
          border-radius: 0;
        }

        .comment-list-header {
          padding: 10px 12px;
          font-size: 13px;
        }

        .comment-item {
          padding: 6px 10px;
          font-size: 12px;
        }

        .comment-time {
          font-size: 10px;
          margin-right: 6px;
          min-width: 40px;
        }
      }

      /* 画面幅1024px以上での高さ自動調整 */
      @media (min-width: 1024px) {
        :host(.auto-height) {
          height: var(--player-height, 400px);
        }
      }
    `;
  }
  /**
   * コンポーネントがDOMに接続された時
   */
  connectedCallback() {
    this.list = this.shadow.querySelector(".comment-list");
    this.setupResizeObserver();
  }
  /**
   * イベントリスナーの設定
   */
  setupEventListeners() {
    this.setupScrollListener();
  }
  /**
   * リサイズ監視の設定
   */
  setupResizeObserver() {
    if (typeof ResizeObserver === "undefined") {
      window.logger.warn("ResizeObserverが利用できないのじゃ...");
      window.addEventListener("resize", () => this.syncHeight());
      return;
    }
    this.resizeObserver = new ResizeObserver(() => {
      this.syncHeight();
    });
    const player = document.getElementById("custom-player");
    if (player) {
      this.resizeObserver.observe(player);
    }
  }
  /**
   * スクロールイベントの設定
   */
  setupScrollListener() {
    if (!this.list) return;
    this.list.addEventListener("scroll", () => {
      if (this.autoScroll && this.list) {
        const scrollDiff = this.list.scrollHeight - this.list.clientHeight - this.list.scrollTop;
        if (scrollDiff > 50) {
          this.autoScroll = false;
          setTimeout(() => this.autoScroll = true, 5e3);
        }
      }
    });
  }
  /**
   * プレイヤーの高さに同期
   */
  syncHeight() {
    const player = document.getElementById("custom-player");
    if (!player) return;
    if (window.innerWidth > 1023) {
      const playerHeight = player.offsetHeight;
      this.style.setProperty("--player-height", `${playerHeight}px`);
      this.classList.add("auto-height");
    } else {
      this.classList.remove("auto-height");
    }
  }
  /**
   * コメントの追加
   */
  addComments(comments) {
    this.comments = comments.sort((a, b) => a.vposMs - b.vposMs);
    this.renderComments();
  }
  /**
   * コメントリストのレンダリング
   */
  renderComments() {
    if (!this.list) return;
    this.list.innerHTML = "";
    this.comments.forEach((comment) => {
      const item = document.createElement("div");
      item.className = "comment-item";
      item.dataset.vpos = comment.vposMs.toString();
      const time = this.formatTime(comment.vposMs / 1e3);
      item.innerHTML = `
        <span class="comment-time">${time}</span>
        <span class="comment-text">${this.escapeHtml(comment.body)}</span>
      `;
      item.addEventListener("click", () => {
        const videoElement = document.getElementById("video-element");
        if (videoElement) {
          videoElement.currentTime = comment.vposMs / 1e3;
        }
      });
      if (this.list) {
        this.list.appendChild(item);
      }
    });
  }
  /**
   * HTMLエスケープ
   */
  escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }
  /**
   * 表示時間の更新
   */
  updateTime(currentTimeMs) {
    this.currentTime = currentTimeMs;
    if (!this.list) return;
    const items = this.list.querySelectorAll(".comment-item");
    items.forEach((item) => {
      const vpos = parseInt(item.dataset.vpos || "0");
      item.classList.toggle("active", vpos <= currentTimeMs && vpos > currentTimeMs - 5e3);
    });
    if (this.autoScroll) {
      const activeItems = this.list.querySelectorAll(".comment-item.active");
      if (activeItems.length > 0) {
        const lastActive = activeItems[activeItems.length - 1];
        const list = this.list;
        const itemTop = lastActive.offsetTop;
        const itemBottom = itemTop + lastActive.offsetHeight;
        if (itemBottom > list.scrollTop + list.clientHeight) {
          list.scrollTop = itemBottom - list.clientHeight;
        } else if (itemTop < list.scrollTop) {
          list.scrollTop = itemTop;
        }
      }
    }
  }
  /**
   * 秒数をMM:SS形式に変換
   */
  formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    seconds = Math.floor(seconds % 60);
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  }
  /**
   * コメントリストの表示/非表示を切り替え
   */
  setVisible(visible) {
    this.style.display = visible ? "block" : "none";
  }
  /**
   * コメントをクリア
   */
  clearComments() {
    this.comments = [];
    if (this.list) {
      this.list.innerHTML = "";
    }
  }
  /**
   * コンポーネントがDOMから切断された時
   */
  disconnectedCallback() {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
    window.removeEventListener("resize", () => this.syncHeight());
  }
}
if (!customElements.get("comment-list-shadow")) {
  customElements.define("comment-list-shadow", CommentList);
}

const CUSTOM_PLAYER_SHADOW_HTML = `
  <div id="custom-player" class="custom-player">
    <div class="video-container">
      <video id="video-element" playsinline>
        <source src="" type="video/mp4">
        <p>お使いのブラウザはHTML5ビデオをサポートしていません。</p>
      </video>
      <canvas id="comment-canvas"></canvas>
      <!-- シャドウDOM版のプレイヤーコントロール -->
      <player-controls-shadow></player-controls-shadow>
    </div>
  </div>
`;
const CUSTOM_PLAYER_SHADOW_STYLES = `
  .custom-player {
    position: relative;
    width: 100%;
    height: initial !important;
    background: #000;
    color: white;
    font-family: Arial, sans-serif;
    border-radius: 10px;
    display: flex;
    flex-direction: column;
    min-height: 180px;
  }

  .video-container {
    position: relative;
    width: 100%;
    height: initial !important;
    overflow: hidden;
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 180px;
  }
    
  #video-element {
    width: auto;
    height: auto;
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
    object-position: center center; /* 通常表示時も中央配置を保証 */
    display: block;
    margin: auto; /* flexboxコンテナ内での中央配置 */
    flex-shrink: 0; /* 縮小を防ぐ */
  }

  #comment-canvas {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 1;
  }

  /* プレイヤーコントロール（シャドウDOM版）の表示制御 */
  .custom-player:hover player-controls-shadow:not(.always-visible) {
    /* シャドウDOM内でvisibleクラスを制御 */
  }

  /* 常時表示モードの場合 */
  player-controls-shadow.always-visible {
    /* シャドウDOM内でスタイル管理 */
  }

  /* 全画面表示時の基本スタイル - ネイティブAPI + フォールバック */
  .custom-player:fullscreen,
  .custom-player:-webkit-full-screen,
  .custom-player:-moz-full-screen,
  .custom-player:-ms-fullscreen,
  html.fullscreen-active .custom-player.nc-fullscreen-player,
  body.nc-fullscreen-active .custom-player.nc-fullscreen-player {
    position: fixed !important;
    top: 0 !important;
    left: 0 !important;
    width: 100vw !important;
    height: 100vh !important;
    max-width: none !important;
    max-height: none !important;
    background: black !important;
    padding: 0 !important;
    margin: 0 !important;
    border-radius: 0 !important;
    display: block !important;
    z-index: 2147483647 !important;
    overflow: visible !important;
  }

  /* 全画面時のビデオコンテナスタイル - ネイティブAPI + フォールバック */
  .custom-player:fullscreen .video-container,
  .custom-player:-webkit-full-screen .video-container,
  .custom-player:-moz-full-screen .video-container,
  .custom-player:-ms-fullscreen .video-container,
  html.fullscreen-active .custom-player.nc-fullscreen-player .video-container,
  body.nc-fullscreen-active .custom-player.nc-fullscreen-player .video-container {
    position: absolute !important;
    top: 0 !important;
    left: 0 !important;
    width: 100% !important;
    height: 100% !important;
    display: flex !important;
    justify-content: center !important;
    align-items: center !important;
    overflow: hidden !important;
    background: #000 !important; /* 黒背景を確実に表示 */
  }

  /* 全画面時のビデオ要素スタイル - ネイティブAPI + フォールバック */
  .custom-player:fullscreen #video-element,
  .custom-player:-webkit-full-screen #video-element,
  .custom-player:-moz-full-screen #video-element,
  .custom-player:-ms-fullscreen #video-element,
  html.fullscreen-active .custom-player.nc-fullscreen-player #video-element,
  body.nc-fullscreen-active .custom-player.nc-fullscreen-player #video-element {
    /* position + transform による確実な中央配置 */
    position: absolute !important;
    top: 50% !important;
    left: 50% !important;
    transform: translate(-50%, -50%) !important;
    width: 100vw !important;
    height: 100vh !important;
    max-width: 100vw !important;
    max-height: 100vh !important;
    object-fit: contain !important;
    object-position: center center !important;
    display: block !important;
    /* レターボックス/ピラーボックス用の背景色 */
    background-color: #000 !important;
    z-index: 1 !important;
  }

  /* 全画面時のコメントキャンバス - ネイティブAPI + フォールバック */
  .custom-player:fullscreen #comment-canvas,
  .custom-player:-webkit-full-screen #comment-canvas,
  .custom-player:-moz-full-screen #comment-canvas,
  .custom-player:-ms-fullscreen #comment-canvas,
  html.fullscreen-active .custom-player.nc-fullscreen-player #comment-canvas,
  body.nc-fullscreen-active .custom-player.nc-fullscreen-player #comment-canvas {
    position: absolute !important;
    top: 0 !important;
    left: 0 !important;
    width: 100% !important;
    height: 100% !important;
    pointer-events: none !important;
    display: block !important;
    z-index: 10 !important;
  }

  /* 全画面時のプレーヤーコントロール配置 */
  .custom-player:fullscreen player-controls-shadow,
  .custom-player:-webkit-full-screen player-controls-shadow,
  .custom-player:-moz-full-screen player-controls-shadow,
  .custom-player:-ms-fullscreen player-controls-shadow,
  html.fullscreen-active .custom-player.nc-fullscreen-player player-controls-shadow,
  body.nc-fullscreen-active .custom-player.nc-fullscreen-player player-controls-shadow {
    position: fixed !important;
    bottom: 0 !important;
    left: 0 !important;
    right: 0 !important;
    width: 100vw !important;
    z-index: 2000 !important;
    background: linear-gradient(transparent, rgba(0, 0, 0, 0.8)) !important;
  }

  /* マウスホバー用のスタイル（ビデオコンテナ） */
  .video-container:hover {
    cursor: default;
  }

  /* 全画面表示中のカーソル制御 - ネイティブAPI + フォールバック */
  .custom-player:fullscreen .video-container,
  .custom-player:-webkit-full-screen .video-container,
  .custom-player:-moz-full-screen .video-container,
  .custom-player:-ms-fullscreen .video-container,
  html.fullscreen-active .custom-player.nc-fullscreen-player .video-container,
  body.nc-fullscreen-active .custom-player.nc-fullscreen-player .video-container {
    cursor: none;
  }

  .custom-player:fullscreen .video-container:hover,
  .custom-player:-webkit-full-screen .video-container:hover,
  .custom-player:-moz-full-screen .video-container:hover,
  .custom-player:-ms-fullscreen .video-container:hover,
  html.fullscreen-active .custom-player.nc-fullscreen-player .video-container:hover,
  body.nc-fullscreen-active .custom-player.nc-fullscreen-player .video-container:hover {
    cursor: default;
  }

  /* モバイル対応 */
  @media (max-width: 768px) {
    .custom-player {
      border-radius: 5px;
    }
  }

  /* ───────── コメントリスト関連スタイル追加 (2024-05-26) ───────── */
  .video-with-comments {
    display: flex !important;
    align-items: flex-start;
    gap: 10px;
    width: 136%;
    padding: 10px;
    max-width: 1920px;
    margin: 0 auto;
  }

  .comment-list-container {
    width: 320px;
    background: rgba(0, 0, 0, 0.9);
    color: white;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    border-radius: 4px;
    transition: all 0.3s ease;
  }

  .comment-list-header {
    padding: 10px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.2);
  }

  .comment-list {
    flex: 1;
    overflow-y: auto;
    padding: 10px;
  }

  .comment-item {
    padding: 8px;
    margin-bottom: 4px;
    border-radius: 4px;
    background: rgba(255, 255, 255, 0.1);
    font-size: 14px;
    transition: background-color 0.2s;
    cursor: pointer;
  }
  .comment-item:hover {
    background: rgba(255, 255, 255, 0.2);
  }
  .comment-item.active {
    background: rgba(0, 123, 255, 0.3);
  }
  .comment-time {
    color: #007bff;
    margin-right: 8px;
  }

  /* スクロールバー */
  .comment-list::-webkit-scrollbar {
    width: 6px;
  }
  .comment-list::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.1);
  }
  .comment-list::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.3);
    border-radius: 3px;
  }

  /* レスポンシブ調整 */
  @media (max-width: 1023px) {
    .video-with-comments {
      flex-direction: column;
      padding: 8px;
    }
    .comment-list-container {
      width: 100%;
      height: 300px !important;
      margin-top: 10px;
    }
  }
  @media (max-width: 767px) {
    .comment-item {
      font-size: 12px;
      padding: 6px;
    }
  }
`;
const FLOATING_DELETED_PLAYER_HTML = `
  <div id="floating-deleted-player" class="floating-deleted-player">
    <div class="floating-player-header">
      <div class="floating-player-title">
        <span class="video-icon" data-material-icon="video_library"></span>
        <span class="title-text">削除済み動画プレーヤー</span>
      </div>
      <div class="floating-player-controls">
        <button class="minimize-btn" title="最小化">−</button>
        <button class="close-btn" title="閉じる">×</button>
      </div>
    </div>
    <div class="floating-player-content">
      <div class="video-info">
        <div class="video-id-display"></div>
      </div>
      <div class="video-container">
        <video id="floating-video-element" playsinline controls>
          <source src="" type="video/mp4">
          <p>お使いのブラウザはHTML5ビデオをサポートしていません。</p>
        </video>
      </div>
      <div class="player-status">
        <span class="status-text">待機中...</span>
      </div>
    </div>
  </div>
`;
const FLOATING_DELETED_PLAYER_STYLES = `
  ${materialIconsStyles}
  .floating-deleted-player {
    position: fixed;
    top: 100px;
    right: 20px;
    width: 400px;
    min-height: 300px;
    max-width: 80vw;
    max-height: 80vh;
    background: rgba(0, 0, 0, 0.85);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 16px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
    color: white;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    z-index: 10000;
    overflow: hidden;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    user-select: none;
    resize: none;
  }

  .floating-deleted-player:hover {
    box-shadow: 0 12px 48px rgba(0, 0, 0, 0.6);
    transform: translateY(-2px);
  }

  .floating-deleted-player.minimized {
    height: 60px;
    min-height: 60px;
  }

  .floating-deleted-player.minimized .floating-player-content {
    display: none;
  }

  .floating-player-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    background: rgba(255, 255, 255, 0.1);
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    cursor: move;
    user-select: none;
  }

  .floating-player-title {
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 600;
    font-size: 14px;
  }

  .video-icon {
    font-size: 16px;
    filter: drop-shadow(0 0 4px rgba(255, 255, 255, 0.3));
  }

  .floating-player-controls {
    display: flex;
    gap: 8px;
  }

  .minimize-btn,
  .close-btn {
    width: 24px;
    height: 24px;
    border: none;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.2);
    color: white;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    font-weight: bold;
    transition: all 0.2s ease;
  }

  .minimize-btn:hover {
    background: rgba(255, 193, 7, 0.8);
    transform: scale(1.1);
  }

  .close-btn:hover {
    background: rgba(220, 53, 69, 0.8);
    transform: scale(1.1);
  }

  .floating-player-content {
    padding: 16px;
  }

  .video-info {
    margin-bottom: 12px;
  }

  .video-id-display {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.8);
    background: rgba(255, 255, 255, 0.1);
    padding: 6px 10px;
    border-radius: 8px;
    text-align: center;
    word-break: break-all;
  }

  .video-container {
    position: relative;
    width: 100%;
    height: 200px; /* デフォルト高さ、JSで動的に調整 */
    background: rgba(0, 0, 0, 0.5);
    border-radius: 12px;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  #floating-video-element {
    width: auto;
    height: auto;
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
    object-position: center center; /* 中央配置を保証 */
    display: block;
    background: #000;
    margin: auto; /* flexboxコンテナ内での中央配置 */
    flex-shrink: 0; /* 縮小を防ぐ */
  }

  .player-status {
    text-align: center;
    padding: 8px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 8px;
  }

  .status-text {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.7);
  }

  /* ドラッグ中のスタイル */
  .floating-deleted-player.dragging {
    transform: rotate(2deg) scale(1.02);
    box-shadow: 0 16px 64px rgba(0, 0, 0, 0.8);
    z-index: 10001;
  }

  /* レスポンシブ対応 */
  @media (max-width: 768px) {
    .floating-deleted-player {
      width: calc(100vw - 40px);
      max-width: 400px;
      right: 20px;
      left: 20px;
    }
  }

  /* アニメーション */
  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .floating-deleted-player {
    animation: fadeInUp 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  }

  /* HLS.js エラー表示用 */
  .hls-error {
    background: rgba(220, 53, 69, 0.2);
    border: 1px solid rgba(220, 53, 69, 0.5);
    color: #ff6b6b;
    padding: 8px;
    border-radius: 8px;
    margin-top: 8px;
    font-size: 12px;
  }

  /* 成功表示用 */
  .hls-success {
    background: rgba(40, 167, 69, 0.2);
    border: 1px solid rgba(40, 167, 69, 0.5);
    color: #51cf66;
    padding: 8px;
    border-radius: 8px;
    margin-top: 8px;
    font-size: 12px;
  }
`;

class CommentRenderer {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.comments = [];
    this.videoElement = null;
    this.isPlaying = true;
    this.isVisible = true;
    this.opacity = COMMENT_RENDERER_CONFIG.OPACITY;
    this.lastTime = 0;
    this.commentDuration = COMMENT_RENDERER_CONFIG.COMMENT_DURATION_MS;
    this.fontSize = COMMENT_RENDERER_CONFIG.DEFAULT_FONT_SIZE;
    this.defaultColor = COMMENT_RENDERER_CONFIG.DEFAULT_COLOR;
    this.maxCommentLength = COMMENT_RENDERER_CONFIG.MAX_COMMENT_LENGTH;
    this.pausedComments = /* @__PURE__ */ new Set();
    // 一時停止時のコメントを保持
    this.strokeWidth = COMMENT_RENDERER_CONFIG.STROKE_WIDTH;
    // 縁取りの太さ
    this.strokeColor = COMMENT_RENDERER_CONFIG.STROKE_COLOR;
    // 縁取りの色
    this.laneHeight = 0;
    // レーンの高さ
    this.maxLanes = 0;
    // 最大レーン数
    this.vposThreshold = COMMENT_RENDERER_CONFIG.VPOS_THRESHOLD_MS;
    // 近傍とみなすミリ秒差
    this.commentGroups = [];
    // グループ化されたコメントを保持
    this.pausedTime = 0;
    // 一時停止時の時間を保持
    this.activeComments = /* @__PURE__ */ new Set();
    // アクティブなコメントを保持
    this.laneStates = [];
    // レーンの使用状態を管理
    this.lastRenderTime = 0;
    this.renderInterval = 1e3 / COMMENT_RENDERER_CONFIG.RENDER_FPS;
    // レンダリング間隔
    this.cleanupInterval = COMMENT_RENDERER_CONFIG.CLEANUP_INTERVAL_MS;
    // クリーンアップ間隔
    this.lastCleanup = 0;
    this.animationFrameId = null;
    this.resizeObserver = null;
    // 動的リサイズ監視用
    // 仮想拡張キャンバス関連
    this.virtualExtendedLeftWidth = 0;
    // 左側の仮想拡張領域の幅
    this.virtualExtendedRightWidth = 0;
    // 右側の仮想拡張領域の幅
    this.virtualCanvasWidth = 0;
    // 仮想キャンバスの全体幅
    this.virtualExtendRatio = COMMENT_RENDERER_CONFIG.VIRTUAL_EXTEND_RATIO;
  }
  // 仮想拡張領域の比率
  /**
   * コメントレンダラーを初期化
   */
  initialize(videoElement) {
    window.logger.info("CommentRendererの初期化を開始するのじゃ！");
    this.videoElement = videoElement;
    this.setupCanvas();
    this.setupVideoEventListeners();
    this.startAnimation();
    window.logger.info("CommentRendererの初期化が完了したのじゃ！");
  }
  /**
   * 動画要素のイベントリスナーを設定
   */
  setupVideoEventListeners() {
    if (!this.videoElement) return;
    this.videoElement.addEventListener("play", () => {
      window.logger.debug("動画再生開始のじゃ！");
      this.isPlaying = true;
      this.lastTime = this.videoElement.currentTime * 1e3;
    });
    this.videoElement.addEventListener("pause", () => {
      window.logger.debug("動画一時停止のじゃ！");
      this.isPlaying = false;
      this.pausedTime = this.videoElement.currentTime * 1e3;
    });
    this.videoElement.addEventListener("seeking", () => {
      window.logger.debug("シーク操作を検知したのじゃ！");
      this.handleSeek();
    });
    this.videoElement.addEventListener("waiting", () => {
      window.logger.debug("バッファリング中なのじゃ...");
      this.isPlaying = false;
    });
    this.videoElement.addEventListener("playing", () => {
      window.logger.debug("再生再開したのじゃ！");
      this.isPlaying = true;
      this.lastTime = this.videoElement.currentTime * 1e3;
    });
    this.videoElement.addEventListener("error", (e) => {
      window.logger.error("動画再生エラーが発生したのじゃ！", e);
    });
  }
  /**
   * キャンバスのセットアップ
   */
  setupCanvas() {
    const existingCanvas = document.getElementById("comment-canvas");
    if (existingCanvas) {
      existingCanvas.remove();
    }
    this.canvas = document.createElement("canvas");
    this.canvas.id = "comment-canvas";
    this.canvas.style.position = "absolute";
    this.canvas.style.top = "0";
    this.canvas.style.left = "0";
    this.canvas.style.width = "100%";
    this.canvas.style.height = "100%";
    this.canvas.style.pointerEvents = "none";
    this.canvas.style.zIndex = "1";
    this.canvas.setAttribute("style", this.canvas.getAttribute("style") + " pointer-events: none !important;");
    this.canvas.addEventListener("click", (e) => {
      e.stopPropagation();
      return true;
    }, false);
    const videoContainer = document.querySelector(".video-container");
    if (!videoContainer) {
      throw new Error("video-containerが見つからないのじゃ！");
    }
    const video = document.getElementById("video-element");
    if (!video) {
      throw new Error("video要素が見つからないのじゃ！");
    }
    video.insertAdjacentElement("afterend", this.canvas);
    this.ctx = this.canvas.getContext("2d");
    this.resizeCanvas();
    window.addEventListener("resize", () => this.resizeCanvas());
    if (typeof ResizeObserver !== "undefined" && this.videoElement) {
      this.resizeObserver = new ResizeObserver(() => {
        this.resizeCanvas();
      });
      this.resizeObserver.observe(this.videoElement);
    }
    document.addEventListener("fullscreenchange", () => this.resizeCanvas());
  }
  /**
   * キャンバスのリサイズ
   */
  resizeCanvas() {
    if (!this.canvas || !this.videoElement) return;
    try {
      let rect = this.videoElement.getBoundingClientRect();
      const doc = document;
      const isFullscreen = doc.fullscreenElement || doc.webkitFullscreenElement || doc.mozFullScreenElement || doc.msFullscreenElement || document.documentElement.classList.contains("fullscreen-active") || document.body.classList.contains("nc-fullscreen-active");
      if (isFullscreen) {
        const videoStyle = window.getComputedStyle(this.videoElement);
        if (videoStyle.position === "fixed") {
          rect = this.videoElement.getBoundingClientRect();
          this.canvas.style.position = "fixed";
          this.canvas.style.top = `${rect.top}px`;
          this.canvas.style.left = `${rect.left}px`;
          this.canvas.style.width = `${rect.width}px`;
          this.canvas.style.height = `${rect.height}px`;
          this.canvas.style.zIndex = "1001";
          window.logger.info("ビデオ固定位置でキャンバスを配置:", { rect, videoPosition: videoStyle.position });
        } else {
          rect = {
            width: window.innerWidth,
            height: window.innerHeight,
            top: 0,
            left: 0,
            right: window.innerWidth,
            bottom: window.innerHeight,
            x: 0,
            y: 0
          };
          this.canvas.style.position = "absolute";
          this.canvas.style.top = "0";
          this.canvas.style.left = "0";
          this.canvas.style.width = "100%";
          this.canvas.style.height = "100%";
          this.canvas.style.zIndex = "1";
          window.logger.info("通常全画面モードでキャンバスサイズを調整するのじゃ:", rect);
        }
      } else {
        this.canvas.style.position = "absolute";
        this.canvas.style.top = "0";
        this.canvas.style.left = "0";
        this.canvas.style.width = "100%";
        this.canvas.style.height = "100%";
        this.canvas.style.zIndex = "1";
      }
      if (rect.width <= 0 || rect.height <= 0) {
        window.logger.warn("無効なキャンバスサイズなのじゃ:", rect);
        const videoContainer = document.querySelector(".video-container");
        if (videoContainer) {
          const containerRect = videoContainer.getBoundingClientRect();
          if (containerRect.width > 0 && containerRect.height > 0) {
            this.canvas.width = containerRect.width;
            this.canvas.height = containerRect.height;
            window.logger.info("コンテナサイズを使用してキャンバスを調整したのじゃ:", containerRect);
          } else {
            return;
          }
        } else {
          return;
        }
      } else {
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;
      }
      this.virtualExtendedLeftWidth = Math.ceil(this.canvas.width * this.virtualExtendRatio);
      this.virtualExtendedRightWidth = Math.ceil(this.canvas.width * this.virtualExtendRatio);
      this.virtualCanvasWidth = this.virtualExtendedLeftWidth + this.canvas.width + this.virtualExtendedRightWidth;
      window.logger.info("仮想拡張キャンバスを設定したのじゃ！", {
        visible: this.canvas.width,
        virtualLeft: this.virtualExtendedLeftWidth,
        virtualRight: this.virtualExtendedRightWidth,
        total: this.virtualCanvasWidth,
        isFullscreen: !!isFullscreen
      });
      this.videoElement.style.width = "100%";
      this.videoElement.style.height = "auto";
      this.calculateFontSize();
      this.laneHeight = this.fontSize * 1.2;
      const calculatedLanes = Math.floor(this.canvas.height / this.laneHeight);
      this.maxLanes = Math.min(
        calculatedLanes,
        COMMENT_RENDERER_CONFIG.MAX_LANES_LIMIT
      );
      if (this.maxLanes <= 0) {
        window.logger.warn("無効なレーン数なのじゃ:", this.maxLanes);
        this.maxLanes = 10;
      }
      this.laneStates = new Array(this.maxLanes).fill(null);
      window.logger.info("キャンバスとレーンの初期化完了なのじゃ！", {
        width: this.canvas.width,
        height: this.canvas.height,
        fontSize: this.fontSize,
        laneHeight: this.laneHeight,
        maxLanes: this.maxLanes,
        isFullscreen: !!isFullscreen
      });
      this.recalcCommentMetrics();
    } catch (error) {
      window.logger.error("キャンバスのリサイズに失敗したのじゃ:", error);
      this.maxLanes = 10;
      this.laneStates = new Array(this.maxLanes).fill(null);
    }
  }
  /**
   * アニメーションを開始
   */
  startAnimation() {
    const animate = (timestamp) => {
      this.animate(timestamp);
      this.animationFrameId = requestAnimationFrame(animate);
    };
    this.animationFrameId = requestAnimationFrame(animate);
  }
  /**
   * アニメーションフレームごとの処理
   */
  animate(timestamp) {
    if (!this.ctx || !this.videoElement) return;
    if (timestamp - this.lastRenderTime < this.renderInterval) {
      return;
    }
    const currentTime = this.videoElement.currentTime * 1e3;
    if (timestamp - this.lastCleanup > this.cleanupInterval) {
      this.cleanup(currentTime);
      this.lastCleanup = timestamp;
    }
    this.renderComments(currentTime);
    this.lastRenderTime = timestamp;
  }
  /**
   * 古いコメントのクリーンアップ
   */
  cleanup(currentTime, force = false) {
    this.activeComments.forEach((comment) => {
      if (force) {
        this.activeComments.delete(comment);
        return;
      }
      if (comment.startTime === void 0 || comment.initialX === void 0 || comment.speed === void 0 || comment.width === void 0) {
        return;
      }
      const elapsed = currentTime - comment.startTime;
      const virtualX = comment.initialX - elapsed * comment.speed;
      if (virtualX + comment.width < -this.virtualExtendedLeftWidth) {
        this.activeComments.delete(comment);
      }
    });
    this.commentGroups = this.commentGroups.filter(
      (group) => group.some((comment) => this.activeComments.has(comment))
    );
  }
  /**
   * レンダリング
   */
  renderComments(currentTime) {
    if (!this.ctx || !this.canvas || !this.isVisible) return;
    this.ctx.font = `${this.fontSize}px Arial`;
    this.ctx.textBaseline = "top";
    this.ctx.globalAlpha = this.opacity;
    this.ctx.lineWidth = this.strokeWidth;
    this.ctx.strokeStyle = this.strokeColor;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    const renderTime = this.isPlaying ? currentTime : this.pausedTime;
    this.comments.forEach((comment) => {
      const isInRange = comment.vposMs <= renderTime && renderTime < comment.vposMs + this.commentDuration;
      if (isInRange && !this.activeComments.has(comment)) {
        comment.startTime = renderTime - (renderTime - comment.vposMs);
        if (!comment.width && this.ctx) {
          comment.width = this.ctx.measureText(comment.body.substring(0, this.maxCommentLength)).width;
        }
        this.activeComments.add(comment);
        this.assignToGroup(comment, renderTime);
      }
    });
    const canvasWidth = this.canvas.width;
    this.commentGroups.forEach((group) => {
      const activeGroupComments = group.filter((comment) => this.activeComments.has(comment));
      if (activeGroupComments.length > 0) {
        activeGroupComments.forEach((comment) => {
          if (comment.startTime === void 0 || comment.initialX === void 0 || comment.speed === void 0 || comment.fixedY === void 0) return;
          const elapsed = currentTime - comment.startTime;
          const virtualX = comment.initialX - elapsed * comment.speed;
          const actualX = virtualX - this.virtualExtendedLeftWidth;
          const commentEndX = actualX + (comment.width || 0);
          const isVisible = actualX < canvasWidth && commentEndX > 0 || !!comment.forceVisible;
          if (comment.width && virtualX + comment.width < -this.virtualExtendedLeftWidth) {
            this.activeComments.delete(comment);
            return;
          }
          if (isVisible) {
            this.drawCommentWithStroke(
              comment.body.substring(0, this.maxCommentLength),
              actualX,
              comment.fixedY,
              comment.color || this.defaultColor
            );
          }
        });
      }
    });
  }
  /**
   * コメントをグループに割り当て
   */
  assignToGroup(comment, currentTime) {
    let foundGroup = this.commentGroups.find(
      (group) => group.some((c) => Math.abs(c.vposMs - comment.vposMs) <= this.vposThreshold)
    );
    if (!foundGroup) {
      foundGroup = [comment];
      this.commentGroups.push(foundGroup);
    } else {
      if (!foundGroup.includes(comment)) {
        foundGroup.push(comment);
      }
    }
    foundGroup.sort((a, b) => a.vposMs - b.vposMs);
    const groupIndex = foundGroup.indexOf(comment);
    let lane = null;
    if (groupIndex === 0) {
      lane = this.findAvailableLane(currentTime, comment.width);
    } else {
      const prevComment = foundGroup[groupIndex - 1];
      const preferredLane = prevComment.fixedLane !== void 0 ? prevComment.fixedLane + 1 : 0;
      lane = this.findAvailableLane(currentTime, comment.width, preferredLane);
    }
    comment.fixedLane = lane;
    comment.fixedY = lane * this.laneHeight;
    comment.initialX = this.virtualExtendedLeftWidth + (this.canvas?.width ?? 0) + this.virtualExtendedRightWidth;
    const visibleDistance = (this.canvas?.width ?? 0) + (comment.width ?? 0);
    comment.speed = visibleDistance / this.commentDuration;
  }
  /**
   * シーク時の処理
   */
  handleSeek() {
    const currentTime = this.videoElement?.currentTime ?? 0;
    this.activeComments.clear();
    this.commentGroups = [];
    this.lastTime = currentTime * 1e3;
    this.pausedTime = currentTime * 1e3;
  }
  /**
   * フォントサイズの計算
   */
  calculateFontSize() {
    if (!this.canvas) return;
    const targetLines = 11;
    const calculatedSize = Math.floor(this.canvas.height / targetLines);
    this.fontSize = Math.max(COMMENT_RENDERER_CONFIG.MIN_FONT_SIZE, calculatedSize);
  }
  /**
   * コメントの表示/非表示を切り替え
   */
  setVisible(visible) {
    this.isVisible = visible;
    if (this.canvas) {
      this.canvas.style.display = visible ? "block" : "none";
    }
    if (!visible) {
      this.clearCanvas();
    }
  }
  /**
   * キャンバスをクリア
   */
  clearCanvas() {
    if (this.ctx && this.canvas) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }
  /**
   * 縁取り付きテキスト描画
   */
  drawCommentWithStroke(text, x, y, color) {
    if (!this.ctx) return;
    this.ctx.strokeStyle = this.strokeColor;
    this.ctx.lineWidth = this.strokeWidth;
    this.ctx.strokeText(text, x, y);
    this.ctx.fillStyle = color;
    this.ctx.fillText(text, x, y);
  }
  /**
   * コメントを追加
   */
  addComment(comment) {
    if (this.ctx) {
      this.ctx.font = `${this.fontSize}px Arial`;
      const width = this.ctx.measureText(comment.body.substring(0, this.maxCommentLength)).width;
      comment.width = width;
    }
    this.comments.push(comment);
    this.comments.sort((a, b) => a.vposMs - b.vposMs);
    this.calculateCommentGroups();
  }
  /**
   * コメントのグループ化
   */
  calculateCommentGroups() {
    this.commentGroups = [];
    let currentGroup = [];
    this.comments.forEach((comment) => {
      if (currentGroup.length === 0) {
        currentGroup.push(comment);
      } else {
        const lastComment = currentGroup[currentGroup.length - 1];
        if (Math.abs(comment.vposMs - lastComment.vposMs) <= this.vposThreshold) {
          currentGroup.push(comment);
        } else {
          currentGroup.forEach((c, index) => {
            c.group = this.commentGroups.length;
            c.groupIndex = index;
          });
          this.commentGroups.push([...currentGroup]);
          currentGroup = [comment];
        }
      }
    });
    if (currentGroup.length > 0) {
      currentGroup.forEach((c, index) => {
        c.group = this.commentGroups.length;
        c.groupIndex = index;
      });
      this.commentGroups.push(currentGroup);
    }
  }
  /**
   * レーンが利用可能かチェック
   */
  isLaneAvailable(lane, currentTime, commentWidth) {
    if (lane >= this.maxLanes) return false;
    if (!this.canvas) return false;
    const canvas = this.canvas;
    const canvasWidth = canvas.width;
    if (commentWidth === void 0) {
      return false;
    }
    for (const existingComment of this.activeComments) {
      if (existingComment.fixedLane === lane && existingComment.initialX !== void 0 && existingComment.startTime !== void 0 && existingComment.speed !== void 0) {
        const existingWidth = existingComment.width || 0;
        const virtualX = existingComment.initialX - (currentTime - existingComment.startTime) * existingComment.speed;
        const actualX = virtualX - this.virtualExtendedLeftWidth;
        const existingEndX = actualX + existingWidth;
        const overlapThreshold = Math.max(commentWidth, existingWidth) / 3;
        if (existingEndX > canvasWidth - overlapThreshold) {
          return false;
        }
        if (commentWidth > existingWidth * 1.5 && existingEndX > canvasWidth - commentWidth) {
          return false;
        }
      }
    }
    return true;
  }
  /**
   * 利用可能なレーンを探す
   */
  findAvailableLane(currentTime, commentWidth, preferredLane = null) {
    if (preferredLane !== null && preferredLane < this.maxLanes && this.isLaneAvailable(preferredLane, currentTime, commentWidth)) {
      return preferredLane;
    }
    if (commentWidth && this.canvas) {
      const canvasWidth = this.canvas.width;
      const lengthRatio = commentWidth / canvasWidth;
      if (lengthRatio > 0.5) {
        const startLane = Math.floor(this.maxLanes / 2);
        for (let lane = this.maxLanes - 1; lane >= startLane; lane--) {
          if (this.isLaneAvailable(lane, currentTime, commentWidth)) {
            return lane;
          }
        }
        for (let lane = startLane - 1; lane >= 0; lane--) {
          if (this.isLaneAvailable(lane, currentTime, commentWidth)) {
            return lane;
          }
        }
      } else {
        const endLane = Math.floor(this.maxLanes / 2);
        for (let lane = 0; lane < endLane; lane++) {
          if (this.isLaneAvailable(lane, currentTime, commentWidth)) {
            return lane;
          }
        }
        for (let lane = endLane; lane < this.maxLanes; lane++) {
          if (this.isLaneAvailable(lane, currentTime, commentWidth)) {
            return lane;
          }
        }
      }
    }
    for (let lane = 0; lane < this.maxLanes; lane++) {
      if (this.isLaneAvailable(lane, currentTime, commentWidth)) {
        return lane;
      }
    }
    return Math.floor(Math.random() * this.maxLanes);
  }
  /**
   * 複数のコメントを追加
   */
  addComments(comments) {
    comments.forEach((comment) => this.addComment(comment));
  }
  /**
   * コメントをクリア
   */
  clearComments() {
    this.comments = [];
    this.activeComments.clear();
    this.commentGroups = [];
    this.laneStates = new Array(this.maxLanes).fill(null);
    this.clearCanvas();
    window.logger.info("コメントをクリアしたのじゃ！");
  }
  /**
   * 透明度を設定する
   * @param opacity 透明度（0.0～1.0の範囲）
   */
  setOpacity(opacity) {
    if (opacity < 0 || opacity > 1) {
      window.logger.warn(`透明度の範囲外の値が指定されたのじゃ: ${opacity}、範囲は0.0～1.0なのじゃ`);
      opacity = Math.max(0, Math.min(1, opacity));
    }
    this.opacity = opacity;
    window.logger.info(`コメントの透明度を ${opacity} に設定したのじゃ`);
  }
  /**
   * デフォルトの色を設定する
   * @param color 色コード（例: "#FFFFFF"）
   */
  setDefaultColor(color) {
    if (!/^#([0-9A-F]{3}){1,2}$/i.test(color)) {
      window.logger.warn(`無効な色コードなのじゃ: ${color}、デフォルト色を使用するのじゃ`);
      return;
    }
    this.defaultColor = color;
    window.logger.info(`コメントのデフォルト色を ${color} に設定したのじゃ`);
  }
  /**
   * レンダラーの破棄
   */
  destroy() {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
    window.removeEventListener("resize", () => this.resizeCanvas());
    if (this.canvas) {
      this.canvas.remove();
    }
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
    this.comments = [];
    this.activeComments.clear();
    this.commentGroups = [];
  }
  /**
   * コメント幅・速度をリサイズ後に補正する関数
   * フルスクリーン切り替え時などにフォントサイズが変わっても
   * 位置連続性を保ったまま正確な幅・速度で削除判定を行うのじゃ
   */
  recalcCommentMetrics() {
    if (!this.ctx || !this.canvas) return;
    const currentTime = this.videoElement?.currentTime ?? 0;
    const now = currentTime * 1e3;
    this.ctx.font = `${this.fontSize}px Arial`;
    this.activeComments.forEach((c) => {
      if (c.startTime === void 0 || c.initialX === void 0 || c.speed === void 0) return;
      const elapsed = now - c.startTime;
      const virtualX = c.initialX - elapsed * c.speed;
      const newWidth = this.ctx.measureText(
        c.body.substring(0, this.maxCommentLength)
      ).width;
      const visibleDist = this.canvas.width + newWidth;
      const newSpeed = visibleDist / this.commentDuration;
      c.initialX = virtualX + elapsed * newSpeed;
      c.speed = newSpeed;
      c.width = newWidth;
      if (c.fixedLane !== void 0) {
        c.fixedY = c.fixedLane * this.laneHeight;
      }
    });
    this.comments.forEach((c) => {
      if (c.startTime !== void 0) return;
      const newWidth = this.ctx.measureText(
        c.body.substring(0, this.maxCommentLength)
      ).width;
      c.width = newWidth;
      const visibleDist = this.canvas.width + newWidth;
      c.speed = visibleDist / this.commentDuration;
    });
    window.logger.info("コメントの幅・速度を再計算したのじゃ！", {
      activeComments: this.activeComments.size,
      queuedComments: this.comments.filter((c) => c.startTime === void 0).length,
      fontSize: this.fontSize,
      canvasWidth: this.canvas.width
    });
  }
}

class CommentFetcher {
  /**
   * 動画IDからAPIデータを取得
   */
  async getApiData(videoId, signal) {
    try {
      window.logger.info(`APIデータの取得を開始するのじゃ！ VideoID: ${videoId}`);
      const response = await this.makeRequest({
        method: "GET",
        url: `https://www.nicovideo.jp/watch/${videoId}`
      }, signal);
      const parser = new DOMParser();
      const doc = parser.parseFromString(response.responseText, "text/html");
      const metaElement = doc.querySelector('meta[name="server-response"]');
      if (!metaElement) {
        throw new Error("server-responseが見つからないのじゃ...");
      }
      const apiData = JSON.parse(decodeURIComponent(metaElement.getAttribute("content") || "")).data.response;
      window.logger.info("APIデータを取得したのじゃ！");
      return {
        threadKey: apiData.comment.nvComment.threadKey,
        params: apiData.comment.nvComment.params,
        server: apiData.comment.nvComment.server
      };
    } catch (error) {
      window.logger.error("APIデータの取得に失敗したのじゃ...", {
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : "",
        videoId
      });
      throw error;
    }
  }
  /**
   * XHRリクエストを実行
   */
  makeRequest(options, signal) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open(options.method, options.url);
      if (options.headers) {
        Object.entries(options.headers).forEach(([key, value]) => {
          xhr.setRequestHeader(key, value);
        });
      }
      xhr.onload = () => resolve({
        status: xhr.status,
        responseText: xhr.responseText,
        headers: xhr.getAllResponseHeaders()
      });
      xhr.onerror = () => reject(new Error("ネットワークリクエストが失敗したのじゃ..."));
      if (signal) {
        signal.addEventListener("abort", () => {
          xhr.abort();
          reject(new DOMException("Aborted", "AbortError"));
        });
      }
      xhr.send(options.data);
    });
  }
  /**
   * APIデータからコメントを取得
   */
  async getComments(apiData, signal) {
    try {
      const url = `${apiData.server}/v1/threads`;
      window.logger.info("コメントサーバーへのリクエスト内容なのじゃ：", {
        url,
        params: apiData.params,
        threadKey: apiData.threadKey
      });
      const response = await this.makeRequest({
        method: "POST",
        url,
        headers: {
          "x-client-os-type": "others",
          "X-Frontend-Id": "6",
          "X-Frontend-Version": "0",
          "Content-Type": "application/json"
        },
        data: JSON.stringify({
          params: apiData.params,
          threadKey: apiData.threadKey,
          additionals: {}
        })
      }, signal);
      if (!response.responseText) {
        throw new Error("サーバーからの応答が空なのじゃ...");
      }
      return JSON.parse(response.responseText);
    } catch (error) {
      window.logger.error("コメント取得エラーなのじゃ！", error);
      throw error;
    }
  }
  /**
   * 動画IDからAPIデータを取得し、コメントを取得
   */
  async fetchAllComments(videoId, signal) {
    const apiData = await this.getApiData(videoId, signal);
    return await this.getComments(apiData, signal);
  }
}

const CONSTANTS = {
  // APIエンドポイント
  API_ENDPOINT: "https://public.nvcomment.nicovideo.jp/v1/threads",
  // グローバルオブジェクト名
  GLOBAL_DATA_KEY: "CommentFilter2Data",
  // フォーク種別
  FORK_TYPES: {
    MAIN: "main",
    EASY: "easy",
    OWNER: "owner"
  },
  // NGワードルール形式
  RULE_DEFAULTS: {
    EMPTY_REPLACE: "EMPTY",
    ALL_SMID: "ALL",
    DEFAULT_NICORU: "EMPTY"
  },
  // IndexedDB設定
  DB_CONFIG: {
    NAME: "CommentFilter2DB",
    VERSION: 1,
    STORES: {
      RULES: "rules",
      SETTINGS: "settings"
    }
  },
  // カスタムイベント
  EVENTS: {
    DATA_UPDATED: "cf2:data-updated",
    SMID_CHANGED: "cf2:smid-changed"
  }
};

class CommentSystem {
  constructor() {
    this.videoElement = null;
    this.isVisible = true;
    this.ngWords = [];
    this.ngRegex = [];
    this.commentContainer = null;
    this.comments = [];
    this.isInitialized = false;
    this.hasReceivedFilteredData = false;
    // timeUpdateリスナーの参照を保持
    this.abortController = null;
    // イベントハンドラーをプロパティとして保持
    this._handleCommentFilter2Update = (event) => {
      const customEvent = event;
      const detail = customEvent.detail;
      if (detail && detail.filteredData) {
        window.logger.debug("CommentFilter2からフィルタリング済みデータを受け取ったのじゃ！");
        this.applyFilteredComments(detail.filteredData);
      }
    };
    this.renderer = new CommentRenderer();
    this.fetcher = new CommentFetcher();
    this.commentList = new CommentList();
  }
  /**
   * コメントシステムの初期化
   */
  async initialize(videoElement) {
    try {
      window.logger.info("コメントシステムの初期化を開始するのじゃ！");
      if (this.isInitialized) {
        window.logger.info("既存のコメントシステムをリセットするのじゃ！");
        this.renderer.destroy();
        this.commentList.clearComments();
        this.hasReceivedFilteredData = false;
      }
      this.videoElement = videoElement;
      if (this._timeUpdateHandler && this.videoElement) {
        this.videoElement.removeEventListener("timeupdate", this._timeUpdateHandler);
      }
      this.renderer = new CommentRenderer();
      this.renderer.initialize(videoElement);
      this.setupTimeUpdateListener();
      this.setupCommentFilter2Listener();
      this.restoreVisibilityState();
      this.commentContainer = document.createElement("div");
      this.commentContainer.className = "comment-container";
      this.commentContainer.appendChild(this.commentList);
      const customPlayer = document.getElementById("custom-player");
      if (customPlayer) {
        let wrapper = customPlayer.parentElement;
        if (!wrapper || !wrapper.classList.contains("video-with-comments")) {
          wrapper = document.createElement("div");
          wrapper.className = "video-with-comments";
          customPlayer.parentNode?.insertBefore(wrapper, customPlayer);
          wrapper.appendChild(customPlayer);
        }
        wrapper.appendChild(this.commentContainer);
      } else {
        this.videoElement.parentElement?.appendChild(this.commentContainer);
      }
      this.hideOfficialCommentPanel();
      this.hideOfficialCommentOverlay();
      this.isInitialized = true;
      window.logger.info("コメントシステムの初期化が完了したのじゃ！");
    } catch (error) {
      window.logger.error("コメントシステムの初期化に失敗したのじゃ...", error);
      throw error;
    }
  }
  /**
   * 時間更新イベントのリスナー設定
   */
  setupTimeUpdateListener() {
    if (!this.videoElement) return;
    this._timeUpdateHandler = () => {
      const currentTimeMs = this.videoElement.currentTime * 1e3;
      this.commentList.updateTime(currentTimeMs);
    };
    this.videoElement.addEventListener("timeupdate", this._timeUpdateHandler);
  }
  /**
   * CommentFilter2からのフィルタリング済みコメントを受け取るイベントリスナー設定
   */
  setupCommentFilter2Listener() {
    if (!this.videoElement) return;
    this.videoElement.removeEventListener("commentFilter2Update", this._handleCommentFilter2Update);
    this.videoElement.addEventListener("commentFilter2Update", this._handleCommentFilter2Update);
  }
  /**
   * コメントの表示状態をローカルストレージから復元
   */
  restoreVisibilityState() {
    const savedVisibility = localStorage.getItem("commentVisible");
    if (savedVisibility !== null) {
      this.isVisible = savedVisibility === "true";
      this.renderer.setVisible(this.isVisible);
    }
  }
  /**
   * CommentFilter2からのフィルタリング済みコメントを適用
   */
  applyFilteredComments(apiResponse) {
    window.logger.info("CommentFilter2からフィルタ済みコメントを受け取ったのじゃ", apiResponse);
    this.hasReceivedFilteredData = true;
    if (this.abortController) {
      this.abortController.abort();
      window.logger.info("既存のAPIフェッチをキャンセルしたのじゃ");
    }
    this.renderer.clearComments();
    this.commentList.clearComments();
    let comments = apiResponse.data.threads.flatMap((thread) => thread.comments);
    comments = comments.map((comment) => {
      comment.vposMs = comment.vpos * 10;
      return comment;
    });
    const filteredComments = this.filterNGComments(comments);
    window.logger.info(`CommentFilter2適用後のコメント数なのじゃ: ${filteredComments.length}`);
    this.commentList.addComments(filteredComments);
    filteredComments.forEach((c) => this.renderer.addComment(c));
  }
  /**
   * 動画IDからコメントを読み込む
   */
  async loadComments(videoId) {
    if (!this.isInitialized) {
      throw new Error("コメントシステムが初期化されていません");
    }
    if (this.abortController) {
      this.abortController.abort();
    }
    this.abortController = new AbortController();
    const signal = this.abortController.signal;
    if (this.hasReceivedFilteredData) {
      window.logger.info("CommentFilter2のコメントを既に描画しているのでフェッチをスキップするのじゃ");
      return;
    }
    try {
      window.logger.info(`コメント読み込み開始なのじゃ: ${videoId}`);
      const apiResponse = await this.fetcher.fetchAllComments(videoId, signal);
      window.logger.info(`コメント読み込み完了なのじゃ: ${videoId}`, apiResponse);
      let comments = apiResponse.data.threads.flatMap((thread) => thread.comments);
      window.logger.info(`取得したコメント数なのじゃ: ${comments.length}`);
      comments = comments.map((comment) => {
        comment.vposMs = comment.vpos * 10;
        return comment;
      });
      const filteredComments = this.filterNGComments(comments);
      window.logger.info(`フィルタ後のコメント数なのじゃ: ${filteredComments.length}`);
      if (this.hasReceivedFilteredData) {
        window.logger.info("APIフェッチ中にCommentFilter2データが到着したため、API側の描画をキャンセルするのじゃ");
        return;
      }
      this.commentList.addComments(filteredComments);
      filteredComments.forEach((c) => this.renderer.addComment(c));
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        window.logger.info("CommentFilter2データが先に到着したため、APIフェッチを中断したのじゃ");
        return;
      }
      window.logger.error("コメント読み込みエラーなのじゃ！", error);
      throw error;
    } finally {
      this.abortController = null;
    }
  }
  /**
   * コメントをNGワード/正規表現でフィルタリング
   */
  filterNGComments(comments) {
    if (this.ngWords.length === 0 && this.ngRegex.length === 0) {
      return comments;
    }
    return comments.filter((comment) => {
      const text = comment.body.toLowerCase();
      const containsNgWord = this.ngWords.some(
        (word) => text.includes(word.toLowerCase())
      );
      if (containsNgWord) return false;
      const matchesNgRegex = this.ngRegex.some(
        (regex) => regex.test(text)
      );
      return !matchesNgRegex;
    });
  }
  /**
   * コメントの表示/非表示を切り替え
   */
  toggleVisibility() {
    this.isVisible = !this.isVisible;
    this.renderer.setVisible(this.isVisible);
    localStorage.setItem("commentVisible", this.isVisible.toString());
    return this.isVisible;
  }
  /**
   * コメントを追加（外部からのコメント追加用）
   */
  addComment(comment) {
    if (this.isCommentAllowed(comment)) {
      this.renderer.addComment(comment);
    }
  }
  /**
   * コメントがNGフィルタに引っかからないかチェック
   */
  isCommentAllowed(comment) {
    const text = comment.body.toLowerCase();
    const containsNgWord = this.ngWords.some(
      (word) => text.includes(word.toLowerCase())
    );
    if (containsNgWord) return false;
    const matchesNgRegex = this.ngRegex.some(
      (regex) => regex.test(text)
    );
    return !matchesNgRegex;
  }
  /**
   * コメントの表示/非表示状態を取得
   */
  getVisibility() {
    return this.isVisible;
  }
  /**
   * リソースのクリーンアップ
   */
  cleanup() {
    window.logger.info("コメントシステムのクリーンアップを開始するのじゃ");
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    if (window.CommentFilterState) {
      window.CommentFilterState.isVideoPlayerActive = false;
      window.CommentFilterState.fetchProxyEnabled = true;
    }
    if (this.commentContainer) {
      this.commentContainer.remove();
      this.commentContainer = null;
    }
    if (this.videoElement) {
      if (this._timeUpdateHandler) {
        this.videoElement.removeEventListener("timeupdate", this._timeUpdateHandler);
        this._timeUpdateHandler = void 0;
      }
      this.videoElement.removeEventListener("commentFilter2Update", this._handleCommentFilter2Update);
    }
    this.videoElement = null;
    this.comments = [];
    this.isInitialized = false;
    this.hasReceivedFilteredData = false;
    this.renderer.destroy();
    this.commentList.remove();
    window.logger.info("コメントシステムのリソースをクリーンアップしたのじゃ");
  }
  /**
   * コメントの透明度を設定
   * @param opacity 透明度（0.0〜1.0）
   */
  setOpacity(opacity) {
    try {
      this.renderer.setOpacity(opacity);
      window.logger.info(`コメント透明度を ${opacity} に設定したのじゃ`);
    } catch (error) {
      window.logger.error("コメント透明度の設定に失敗したのじゃ:", error);
    }
  }
  /**
   * コメントのデフォルト色を設定
   * @param color 色（HEX形式の文字列、例: "#FFFFFF"）
   */
  setDefaultColor(color) {
    try {
      this.renderer.setDefaultColor(color);
      window.logger.info(`コメントのデフォルト色を ${color} に設定したのじゃ`);
    } catch (error) {
      window.logger.error("コメントのデフォルト色の設定に失敗したのじゃ:", error);
    }
  }
  /**
   * NGワードリストを設定
   * @param words NGワードの配列
   */
  setNGWords(words) {
    try {
      this.ngWords = words.map((word) => word.trim()).filter((word) => word !== "");
      window.logger.info(`${this.ngWords.length}件のNGワードを設定したのじゃ`);
    } catch (error) {
      window.logger.error("NGワードの設定に失敗したのじゃ:", error);
    }
  }
  /**
   * NG正規表現リストを設定
   * @param regexStrings 正規表現の文字列配列
   */
  setNGRegex(regexStrings) {
    try {
      this.ngRegex = regexStrings.map((str) => {
        try {
          return new RegExp(str, "i");
        } catch (e) {
          window.logger.warn(`不正な正規表現なので無視するのじゃ: ${str}`);
          return null;
        }
      }).filter((regex) => regex !== null);
      window.logger.info(`${this.ngRegex.length}件のNG正規表現を設定したのじゃ`);
    } catch (error) {
      window.logger.error("NG正規表現の設定に失敗したのじゃ:", error);
    }
  }
  /**
   * 公式コメントリストを非表示にする
   */
  hideOfficialCommentPanel() {
    try {
      const selectors = [
        "#js-comment",
        "#comment",
        ".CommentPanel",
        ".comment-panel",
        '[data-testid="comment-area"]',
        ".grid-area_\\[comment\\]",
        ".grid-area_\\[sidebar\\]",
        ".WatchCommentsPanel",
        ".WatchCommentsList",
        ".h_var\\(--watch-player-height\\)"
      ];
      selectors.forEach((sel) => {
        document.querySelectorAll(sel).forEach((el) => {
          el.style.display = "none";
        });
      });
    } catch (e) {
      window.logger.warn("公式コメントリストを非表示にできなかったのじゃ:", e);
    }
  }
  /**
   * ★追加: 公式コメントオーバーレイを非表示にする
   */
  hideOfficialCommentOverlay() {
    try {
      const overlaySelectors = [
        "#playerCommentLayer",
        ".CommentScreen",
        ".CommentLayer",
        ".VideoScreenCanvas",
        ".VideoOverlayPanel",
        ".VideoOverlayPanelContainer"
      ];
      overlaySelectors.forEach((sel) => {
        document.querySelectorAll(sel).forEach((el) => {
          el.style.display = "none";
        });
      });
      window.logger.info("公式コメントオーバーレイを非表示にしたのじゃ");
    } catch (e) {
      window.logger.warn("公式コメントオーバーレイを非表示にできなかったのじゃ:", e);
    }
  }
  /**
   * CommentFilter2のグローバルデータを取得
   */
  getCommentFilter2Data() {
    try {
      const data = window[CONSTANTS.GLOBAL_DATA_KEY];
      if (data && typeof data === "object" && "originalData" in data && "filteredData" in data && "currentSmid" in data && "lastUpdated" in data && data.originalData !== null && data.filteredData !== null && data.currentSmid !== null) {
        return data;
      }
      return null;
    } catch (error) {
      window.logger.warn("CommentFilter2のグローバルデータ取得に失敗したのじゃ:", error);
      return null;
    }
  }
}

class FloatingDeletedPlayer {
  constructor() {
    this.container = null;
    this.videoElement = null;
    this.hls = null;
    this.isDragging = false;
    this.dragOffset = { x: 0, y: 0 };
    this.isMinimized = false;
    this.originalVideoSize = null;
    this.resizeObserver = null;
    this.setupStyles();
    this.loadHLSLibrary();
  }
  /**
   * スタイルの適用
   */
  setupStyles() {
    applyStyles(FLOATING_DELETED_PLAYER_STYLES);
  }
  /**
   * HLS.jsライブラリの動的読み込み
   */
  loadHLSLibrary() {
    if (typeof Hls !== "undefined") {
      return;
    }
    if (document.querySelector('script[src*="hls.js"]')) {
      return;
    }
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/hls.js@latest";
    script.async = true;
    script.onload = () => {
      window.logger.info("HLS.jsライブラリの読み込みが完了したのじゃ！");
    };
    script.onerror = () => {
      window.logger.warn("HLS.jsライブラリの読み込みに失敗したのじゃ。ネイティブHLS再生を試行するのじゃ。");
    };
    document.head.appendChild(script);
  }
  /**
   * プレーヤーを表示
   */
  show(videoIdOrUrl, title) {
    this.hide();
    this.createPlayer(videoIdOrUrl, title);
  }
  /**
   * プレーヤーを非表示
   */
  hide() {
    if (this.container) {
      this.container.remove();
      this.container = null;
    }
    if (this.hls) {
      this.hls.destroy();
      this.hls = null;
    }
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
    this.videoElement = null;
    this.originalVideoSize = null;
  }
  /**
   * プレーヤーの作成
   */
  createPlayer(videoIdOrUrl, title) {
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = FLOATING_DELETED_PLAYER_HTML;
    this.container = tempDiv.firstElementChild;
    document.body.appendChild(this.container);
    const videoIdDisplay = this.container.querySelector(".video-id-display");
    if (videoIdDisplay) {
      videoIdDisplay.textContent = title ? `${videoIdOrUrl} (${title})` : videoIdOrUrl;
    }
    this.videoElement = this.container.querySelector("#floating-video-element");
    this.setupEventListeners();
    this.initializeIcons();
    this.loadVideo(videoIdOrUrl);
  }
  /**
   * アイコンの初期化
   */
  initializeIcons() {
    if (!this.container) return;
    const iconElements = this.container.querySelectorAll("[data-material-icon]");
    iconElements.forEach((element) => {
      const iconName = element.getAttribute("data-material-icon");
      if (iconName) {
        element.innerHTML = createMaterialIcon(iconName, {
          style: "outlined",
          color: "white"
        });
      }
    });
  }
  /**
   * イベントリスナーの設定
   */
  setupEventListeners() {
    if (!this.container) return;
    const header = this.container.querySelector(".floating-player-header");
    if (header) {
      header.addEventListener("mousedown", this.onDragStart.bind(this));
    }
    const minimizeBtn = this.container.querySelector(".minimize-btn");
    if (minimizeBtn) {
      minimizeBtn.addEventListener("click", this.toggleMinimize.bind(this));
    }
    const closeBtn = this.container.querySelector(".close-btn");
    if (closeBtn) {
      closeBtn.addEventListener("click", this.hide.bind(this));
    }
    document.addEventListener("mousemove", this.onDragMove.bind(this));
    document.addEventListener("mouseup", this.onDragEnd.bind(this));
    this.setupResizeObserver();
  }
  /**
   * ドラッグ開始
   */
  onDragStart(e) {
    if (!this.container) return;
    this.isDragging = true;
    this.container.classList.add("dragging");
    const rect = this.container.getBoundingClientRect();
    this.dragOffset.x = e.clientX - rect.left;
    this.dragOffset.y = e.clientY - rect.top;
    e.preventDefault();
  }
  /**
   * ドラッグ中
   */
  onDragMove(e) {
    if (!this.isDragging || !this.container) return;
    const x = e.clientX - this.dragOffset.x;
    const y = e.clientY - this.dragOffset.y;
    const maxX = window.innerWidth - this.container.offsetWidth;
    const maxY = window.innerHeight - this.container.offsetHeight;
    const clampedX = Math.max(0, Math.min(x, maxX));
    const clampedY = Math.max(0, Math.min(y, maxY));
    this.container.style.left = `${clampedX}px`;
    this.container.style.top = `${clampedY}px`;
    this.container.style.right = "auto";
  }
  /**
   * ドラッグ終了
   */
  onDragEnd() {
    if (!this.isDragging || !this.container) return;
    this.isDragging = false;
    this.container.classList.remove("dragging");
  }
  /**
   * リサイズ監視の設定
   */
  setupResizeObserver() {
    if (!window.ResizeObserver) return;
    this.resizeObserver = new ResizeObserver(() => {
      if (this.originalVideoSize && !this.isMinimized) {
        this.resizePlayer();
      }
    });
    this.resizeObserver.observe(document.body);
  }
  /**
   * 最適なプレーヤーサイズを計算
   */
  calculateOptimalSize() {
    if (!this.originalVideoSize) {
      return { width: 400, height: 300 };
    }
    const viewportHeight = window.innerHeight;
    const maxHeight = Math.floor(viewportHeight * 0.65);
    const targetHeight = Math.min(this.originalVideoSize.height, maxHeight);
    const aspectRatio = this.originalVideoSize.width / this.originalVideoSize.height;
    const targetWidth = Math.floor(targetHeight * aspectRatio);
    const minWidth = 300;
    const maxWidth = Math.floor(window.innerWidth * 0.8);
    const finalWidth = Math.max(minWidth, Math.min(targetWidth, maxWidth));
    const finalHeight = Math.floor(finalWidth / aspectRatio);
    return { width: finalWidth, height: finalHeight };
  }
  /**
   * プレーヤーサイズの調整
   */
  resizePlayer() {
    if (!this.container || this.isMinimized) return;
    const { width, height } = this.calculateOptimalSize();
    this.container.style.width = `${width}px`;
    this.container.style.minHeight = `${height + 120}px`;
    const videoContainer = this.container.querySelector(".video-container");
    if (videoContainer) {
      videoContainer.style.height = `${height}px`;
    }
    this.adjustPosition();
  }
  /**
   * 画面外に出ないように位置を調整
   */
  adjustPosition() {
    if (!this.container) return;
    const rect = this.container.getBoundingClientRect();
    const maxX = window.innerWidth - rect.width;
    const maxY = window.innerHeight - rect.height;
    const currentX = parseInt(this.container.style.left) || rect.left;
    const currentY = parseInt(this.container.style.top) || rect.top;
    if (currentX > maxX) {
      this.container.style.left = `${Math.max(0, maxX)}px`;
      this.container.style.right = "auto";
    }
    if (currentY > maxY) {
      this.container.style.top = `${Math.max(0, maxY)}px`;
    }
  }
  /**
   * 最小化切り替え
   */
  toggleMinimize() {
    if (!this.container) return;
    this.isMinimized = !this.isMinimized;
    this.container.classList.toggle("minimized", this.isMinimized);
    const minimizeBtn = this.container.querySelector(".minimize-btn");
    if (minimizeBtn) {
      minimizeBtn.textContent = this.isMinimized ? "□" : "−";
      minimizeBtn.title = this.isMinimized ? "復元" : "最小化";
    }
  }
  /**
   * 動画の読み込み
   */
  async loadVideo(videoIdOrUrl) {
    if (!this.videoElement) return;
    this.updateStatus("動画を読み込み中...");
    try {
      let finalUrl;
      let isHLS;
      if (videoIdOrUrl.startsWith("http://") || videoIdOrUrl.startsWith("https://")) {
        finalUrl = videoIdOrUrl;
        isHLS = videoIdOrUrl.toLowerCase().includes("hls") || videoIdOrUrl.includes(".m3u8");
      } else {
        this.updateStatus("キャッシュ情報を取得中...");
        const cacheResult = await this.getCacheUrl(videoIdOrUrl);
        finalUrl = cacheResult.url;
        isHLS = cacheResult.isHLS;
        if (cacheResult.title && this.container) {
          const videoIdDisplay = this.container.querySelector(".video-id-display");
          if (videoIdDisplay) {
            videoIdDisplay.textContent = `${videoIdOrUrl} (${cacheResult.title})`;
          }
        }
      }
      if (isHLS) {
        await this.loadHLSVideo(finalUrl);
      } else {
        await this.loadRegularVideo(finalUrl);
      }
    } catch (error) {
      window.logger.error("動画読み込みエラー:", error);
      this.showError(`動画の読み込みに失敗したのじゃ: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  /**
   * キャッシュURLの取得
   */
  async getCacheUrl(videoId) {
    const infoUrl = `https://www.nicovideo.jp/cache/info/v2?${videoId}`;
    try {
      const response = await fetch(infoUrl);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      if (!data || !data[videoId]) {
        throw new Error("動画情報が見つかりません");
      }
      const videoInfo = data[videoId];
      if (!videoInfo.preferred) {
        throw new Error("この動画は現在利用できません");
      }
      const cacheId = videoInfo.preferred;
      const title = videoInfo.caches && videoInfo.caches[cacheId] ? videoInfo.caches[cacheId].title : "";
      const isHLS = cacheId.endsWith(".hls");
      const url = isHLS ? `https://www.nicovideo.jp/cache/${cacheId}` : `https://www.nicovideo.jp/cache/${videoId}/auto/movie`;
      return { url, isHLS, title };
    } catch (error) {
      window.logger.error("キャッシュ情報取得エラー:", error);
      throw new Error(`キャッシュ情報の取得に失敗しました: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  /**
   * HLS動画の読み込み
   */
  async loadHLSVideo(url) {
    if (!this.videoElement) return;
    this.updateStatus("HLS動画を読み込み中...");
    if (typeof Hls !== "undefined" && Hls.isSupported()) {
      this.hls = new Hls();
      this.hls.on(Hls.Events.ERROR, (...args) => {
        const [data] = args;
        window.logger.error("HLS Error:", data);
        this.showError("HLS再生でエラーが発生したのじゃ");
      });
      this.hls.on(Hls.Events.MANIFEST_PARSED, () => {
        this.updateStatus("HLS動画読み込み完了！");
        this.showSuccess("HLSマニフェスト読み込み完了なのじゃ！");
        this.videoElement?.play().catch((e) => {
          window.logger.error("再生開始エラー:", e);
          this.updateStatus("再生準備完了（クリックで再生）");
        });
      });
      this.hls.on(Hls.Events.MEDIA_ATTACHED, () => {
      });
      this.hls.loadSource(url);
      this.hls.attachMedia(this.videoElement);
    } else {
      this.videoElement.src = url;
      this.updateStatus("ネイティブHLS再生を試行中...");
    }
    this.setupVideoEvents();
  }
  /**
   * 通常動画の読み込み
   */
  async loadRegularVideo(url) {
    if (!this.videoElement) return;
    this.updateStatus("動画を読み込み中...");
    this.videoElement.src = url;
    this.setupVideoEvents();
  }
  /**
   * 動画イベントの設定
   */
  setupVideoEvents() {
    if (!this.videoElement) return;
    this.videoElement.addEventListener("loadstart", () => {
      this.updateStatus("読み込み開始...");
    });
    this.videoElement.addEventListener("loadedmetadata", () => {
      this.updateStatus("メタデータ読み込み完了");
      if (this.videoElement) {
        this.originalVideoSize = {
          width: this.videoElement.videoWidth,
          height: this.videoElement.videoHeight
        };
        this.resizePlayer();
        window.logger.info(`動画サイズ: ${this.originalVideoSize.width}x${this.originalVideoSize.height}`);
      }
    });
    this.videoElement.addEventListener("canplay", () => {
      this.updateStatus("再生準備完了");
      this.showSuccess("動画の読み込みが完了したのじゃ！");
    });
    this.videoElement.addEventListener("playing", () => {
      this.updateStatus("再生中");
    });
    this.videoElement.addEventListener("pause", () => {
      this.updateStatus("一時停止中");
    });
    this.videoElement.addEventListener("waiting", () => {
      this.updateStatus("バッファリング中...");
    });
    this.videoElement.addEventListener("error", (e) => {
      window.logger.error("動画エラー:", e);
      this.showError("動画の再生でエラーが発生したのじゃ");
    });
    this.videoElement.volume = 0.3;
  }
  /**
   * ステータス更新
   */
  updateStatus(message) {
    if (!this.container) return;
    const statusText = this.container.querySelector(".status-text");
    if (statusText) {
      statusText.textContent = message;
    }
  }
  /**
   * エラー表示
   */
  showError(message) {
    this.updateStatus("エラー");
    this.showMessage(message, "hls-error");
  }
  /**
   * 成功表示
   */
  showSuccess(message) {
    this.showMessage(message, "hls-success");
  }
  /**
   * メッセージ表示
   */
  showMessage(message, className) {
    if (!this.container) return;
    const existingMessages = this.container.querySelectorAll(".hls-error, .hls-success");
    existingMessages.forEach((msg) => msg.remove());
    const messageDiv = document.createElement("div");
    messageDiv.className = className;
    messageDiv.textContent = message;
    const playerStatus = this.container.querySelector(".player-status");
    if (playerStatus) {
      playerStatus.appendChild(messageDiv);
      setTimeout(() => {
        if (messageDiv.parentNode) {
          messageDiv.remove();
        }
      }, 5e3);
    }
  }
}

if (!customElements.get("player-controls-shadow")) {
  customElements.define("player-controls-shadow", PlayerControlsShadow);
}
if (!customElements.get("comment-list-shadow")) {
  customElements.define("comment-list-shadow", CommentList);
}
class NicoCachePlayer {
  constructor() {
    this.cacheManager = null;
    this.playerControls = null;
    this.videoElement = null;
    this.commentSystem = null;
    this.observer = null;
    this.customPlayerContainer = null;
    this.videoContainer = null;
    this.floatingDeletedPlayer = null;
    this.hls = null;
    this.urlManager = new UrlManager();
    this.toastManager = new ToastManager();
    this.commentSystem = new CommentSystem();
    this.floatingDeletedPlayer = new FloatingDeletedPlayer();
    this.loadHLSLibrary();
    this.setupEventListeners();
    this.setupGlobalInterface();
  }
  /**
   * HLS.jsライブラリの動的読み込み
   */
  loadHLSLibrary() {
    if (typeof Hls !== "undefined") {
      return;
    }
    if (document.querySelector('script[src*="hls.js"]')) {
      return;
    }
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/hls.js@latest";
    script.async = true;
    script.onload = () => {
      window.logger.info("HLS.jsライブラリの読み込みが完了したのじゃ！");
    };
    script.onerror = () => {
      window.logger.warn("HLS.jsライブラリの読み込みに失敗したのじゃ。ネイティブHLS再生を試行するのじゃ。");
    };
    document.head.appendChild(script);
  }
  /**
   * グローバルオブジェクトのセットアップ
   * 削除済み動画プレーヤーのインターフェースを提供するのじゃ
   */
  setupGlobalInterface() {
    if (!window.NicoCache_nl) {
      window.NicoCache_nl = {
        watch: {
          getVideoID: () => "",
          apiData: {},
          addEventListener: () => {
          }
        },
        cacheUtil: {
          formatCacheInfo: async () => false
        },
        cc: {
          MainVideoPlayerWidthHeightReturner: async () => 0
        },
        handleError: () => {
        }
      };
    }
    window.NicoCache_nl.deletedVideoPlayer = {
      /**
       * 削除済み動画を再生
       * @param videoIdOrUrl 動画IDまたはURL
       * @param title 動画タイトル（オプション）
       */
      play: (videoIdOrUrl, title) => {
        if (this.floatingDeletedPlayer) {
          this.floatingDeletedPlayer.show(videoIdOrUrl, title);
          window.logger.info(`削除済み動画プレーヤーで再生開始: ${videoIdOrUrl}`);
        }
      },
      /**
       * 削除済み動画プレーヤーを非表示
       */
      hide: () => {
        if (this.floatingDeletedPlayer) {
          this.floatingDeletedPlayer.hide();
          window.logger.info("削除済み動画プレーヤーを非表示にしたのじゃ");
        }
      },
      /**
       * 使用方法の説明
       */
      help: () => {
        window.logger.info(`
削除済み動画プレーヤーの使用方法なのじゃ：

1. 基本的な使用方法:
   window.NicoCache_nl.deletedVideoPlayer.play("動画IDまたはURL", "タイトル（オプション）");

2. 例:
   // 動画IDで再生
   window.NicoCache_nl.deletedVideoPlayer.play("sm12345678", "削除された動画");
   
   // URLで再生（HLS）
   window.NicoCache_nl.deletedVideoPlayer.play("https://example.com/video.m3u8", "HLS動画");
   
   // URLで再生（MP4）
   window.NicoCache_nl.deletedVideoPlayer.play("https://example.com/video.mp4", "MP4動画");

3. プレーヤーを非表示:
   window.NicoCache_nl.deletedVideoPlayer.hide();

4. ヘルプ表示:
   window.NicoCache_nl.deletedVideoPlayer.help();

特徴：
- 文字列に"hls"または".m3u8"が含まれる場合はHLS.jsを使用
- それ以外は通常のHTML5ビデオで再生
- ドラッガブル半透明ガラス効果のおしゃれプレーヤー
- 削除済み動画用なのでコメント機能は無効
        `);
      }
    };
    window.logger.info("削除済み動画プレーヤーのグローバルインターフェースを設定したのじゃ！");
    window.logger.info("使用方法: window.NicoCache_nl.deletedVideoPlayer.help()");
  }
  /**
   * イベントリスナーのセットアップ
   */
  setupEventListeners() {
    window.addEventListener("load", () => {
      if (window.NicoCache_nl && window.NicoCache_nl.watch) {
        window.NicoCache_nl.watch.addEventListener("initialized", () => {
          this.handleVideoChange();
          this.setupUrlChangeListener();
        });
      }
      this.overrideHistoryMethods();
    });
  }
  /**
   * History APIをオーバーライドして動画変更を検知
   */
  overrideHistoryMethods() {
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;
    history.pushState = (...args) => {
      originalPushState.apply(history, args);
      this.handleVideoChange();
    };
    history.replaceState = (...args) => {
      originalReplaceState.apply(history, args);
      this.handleVideoChange();
    };
  }
  /**
   * URL変更の監視
   */
  setupUrlChangeListener() {
    let lastUrl = location.href;
    if (this.observer) {
      this.observer.disconnect();
    }
    this.observer = new MutationObserver(() => {
      const currentUrl = location.href;
      if (currentUrl !== lastUrl && WATCH_CONFIG.URL_PATTERN.test(currentUrl)) {
        lastUrl = currentUrl;
        setTimeout(() => this.handleVideoChange(), WATCH_CONFIG.CHECK_INTERVAL_MS);
      }
    });
    this.observer.observe(document.querySelector("body"), {
      childList: true,
      subtree: true
    });
  }
  /**
   * リソースのクリーンアップ
   */
  cleanup() {
    if (this.hls) {
      this.hls.destroy();
      this.hls = null;
    }
    if (this.cacheManager) {
      this.cacheManager.stopMonitoring();
      this.cacheManager = null;
    }
    if (this.playerControls && this.playerControls.parentElement) {
      this.playerControls.remove();
      this.playerControls = null;
    }
    if (this.commentSystem) {
      this.commentSystem.cleanup();
    }
    if (this.videoElement) {
      this.videoElement.pause();
      this.videoElement.src = "";
      this.videoElement.load();
      this.videoElement = null;
    }
    if (this.customPlayerContainer) {
      this.customPlayerContainer.remove();
      this.customPlayerContainer = null;
    }
    this.videoContainer = null;
    const originalPlayer = document.getElementsByTagName("video")[0];
    if (originalPlayer) {
      originalPlayer.style.display = "";
    }
  }
  /**
   * 動画変更時の処理
   */
  async handleVideoChange() {
    try {
      this.cleanup();
      const videoId = this.getVideoId();
      if (!videoId) return;
      const isPaymentRequired = this.isPaymentRequired();
      const hasOriginalSource = this.hasOriginalSource();
      if (!isPaymentRequired || hasOriginalSource) {
        window.logger.info(
          isPaymentRequired ? "元のプレイヤーが正常なので処理をスキップするのじゃ" : "無料動画なので処理をスキップするのじゃ"
        );
        return;
      }
      await this.playWithCustomSource(videoId);
    } catch (error) {
      window.logger.error("動画変更処理でエラーが発生したのじゃ:", error);
      this.toastManager.showError("動画の読み込みに失敗しました");
    }
  }
  /**
   * 現在の動画IDを取得
   */
  getVideoId() {
    if (window.NicoCache_nl && window.NicoCache_nl.watch && typeof window.NicoCache_nl.watch.getVideoID === "function") {
      return window.NicoCache_nl.watch.getVideoID();
    }
    return null;
  }
  /**
   * 有料動画かどうかを確認
   */
  isPaymentRequired() {
    if (window.NicoCache_nl && window.NicoCache_nl.watch && window.NicoCache_nl.watch.apiData && window.NicoCache_nl.watch.apiData.payment && window.NicoCache_nl.watch.apiData.payment.video) {
      return window.NicoCache_nl.watch.apiData.payment.video.watchableUserType !== "all";
    }
    return false;
  }
  /**
   * 元のプレイヤーにソースがあるかを確認
   */
  hasOriginalSource() {
    const originalPlayer = document.getElementsByTagName("video")[0];
    return originalPlayer ? !!originalPlayer.src : false;
  }
  /**
   * カスタムソースでの再生
   */
  async playWithCustomSource(videoId) {
    try {
      const videoTitle = window.NicoCache_nl.watch.apiData.video.title;
      this.toastManager.showInfo(
        "シャドウDOM版カスタムキャッシュプレイヤーを起動中...",
        videoTitle,
        videoId
      );
      const url = await this.urlManager.findFirstAvailableUrl(videoId);
      if (!url) {
        this.toastManager.showError(
          "動画ソースが見つかりません",
          "HLSとMP4の動画ソースが見つかりませんでした"
        );
        throw new Error("動画ソースが見つかりません");
      }
      await this.playVideo(url, videoTitle);
      await this.loadComments(videoId);
    } catch (error) {
      window.logger.error("カスタムソースでの再生に失敗したのじゃ:", error);
      throw error;
    }
  }
  /**
   * 動画の再生
   */
  async playVideo(url, title) {
    try {
      await this.replaceWithCustomPlayer();
      this.videoElement = document.getElementById("video-element");
      if (!this.videoElement) {
        throw new Error("動画要素が見つかりません");
      }
      const isHLS = this.isHLSUrl(url);
      if (isHLS) {
        await this.loadHLSVideo(url);
      } else {
        this.videoElement.src = url;
      }
      try {
        if (isHLS && this.hls) {
          await new Promise((resolve, reject) => {
            if (!this.hls) {
              reject(new Error("HLS instance not found"));
              return;
            }
            const onManifestParsed = () => {
              cleanup();
              resolve();
            };
            const onError = () => {
              cleanup();
              reject(new Error("HLS manifest loading failed"));
            };
            const cleanup = () => {
            };
            this.hls.on(Hls.Events.MANIFEST_PARSED, onManifestParsed);
            this.hls.on(Hls.Events.ERROR, onError);
          });
        } else {
          await new Promise((resolve, reject) => {
            const onCanPlay = () => {
              cleanup();
              resolve();
            };
            const onError = (e) => {
              cleanup();
              reject(e);
            };
            const cleanup = () => {
              this.videoElement?.removeEventListener("canplay", onCanPlay);
              this.videoElement?.removeEventListener("error", onError);
            };
            this.videoElement.addEventListener("canplay", onCanPlay);
            this.videoElement.addEventListener("error", onError);
          });
        }
      } catch (e) {
        window.logger.error("動画の読み込み待機に失敗したのじゃ:", e);
      }
      this.cacheManager = new CacheManager(this.videoElement, this.hls || void 0, url);
      this.cacheManager.startMonitoring();
      this.setupHoverControls();
      const originalMuted = this.videoElement.muted;
      try {
        if (!originalMuted) {
          this.videoElement.muted = true;
        }
        const playPromise = this.videoElement.play();
        if (playPromise !== void 0) {
          await playPromise;
        }
        if (!originalMuted) {
          this.videoElement.muted = false;
        }
      } catch (playErr) {
        window.logger.warn("自動再生がブロックされた可能性があるのじゃ:", playErr);
        this.playerControls?.show();
      }
      this.toastManager.showSuccess(
        `${url} で再生します（シャドウDOM版）`,
        title
      );
      this.videoElement.addEventListener("error", (e) => window.logger.error("[VIDEO-ERROR]", e));
    } catch (error) {
      window.logger.error("動画再生でエラーが発生したのじゃ:", error);
      this.toastManager.showError("動画の再生に失敗しました");
      throw error;
    }
  }
  /**
   * カスタムプレイヤーへの置き換え（シャドウDOM版）
   */
  async replaceWithCustomPlayer() {
    try {
      const originalPlayer = await waitForPlayer();
      originalPlayer.style.display = "none";
      if (!customElements.get("player-controls-shadow")) {
        throw new Error("player-controls-shadowカスタムエレメントが登録されていません");
      }
      const container = document.createElement("div");
      container.innerHTML = CUSTOM_PLAYER_SHADOW_HTML;
      this.customPlayerContainer = container.firstElementChild;
      originalPlayer.parentNode?.insertBefore(this.customPlayerContainer, originalPlayer);
      applyStyles(CUSTOM_PLAYER_SHADOW_STYLES);
      this.videoContainer = this.customPlayerContainer.querySelector(".video-container");
      const videoElement = document.getElementById("video-element");
      this.playerControls = this.customPlayerContainer.querySelector("player-controls-shadow");
      if (this.playerControls) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        if (typeof this.playerControls.setVideoElement === "function") {
          this.playerControls.setVideoElement(videoElement);
        } else {
          window.logger.warn("setVideoElementメソッドが利用できないのじゃ、直接初期化を試みるのじゃ");
          await new Promise((resolve) => setTimeout(resolve, 200));
          if (typeof this.playerControls.setVideoElement === "function") {
            this.playerControls.setVideoElement(videoElement);
          }
        }
      } else {
        window.logger.warn("player-controls-shadow要素が見つからないのじゃ");
      }
      if (this.commentSystem) {
        await this.commentSystem.initialize(videoElement);
        if (this.playerControls && typeof this.playerControls.setCommentSystem === "function") {
          this.playerControls.setCommentSystem(this.commentSystem);
        }
      }
      window.logger.info("シャドウDOM版カスタムプレイヤーの設置が完了したのじゃ！");
    } catch (error) {
      window.logger.error("プレイヤーの置き換えに失敗したのじゃ:", error);
      throw error;
    }
  }
  /**
   * マウスホバー時のコントロール表示処理を設定
   */
  setupHoverControls() {
    if (!this.videoContainer || !this.playerControls) return;
    let hoverTimer = null;
    this.videoContainer.addEventListener("mouseenter", () => {
      if (this.playerControls) {
        this.playerControls.show();
      }
    });
    this.videoContainer.addEventListener("mousemove", () => {
      if (this.playerControls) {
        this.playerControls.show();
      }
      if (hoverTimer !== null) {
        clearTimeout(hoverTimer);
      }
      hoverTimer = window.setTimeout(() => {
        if (this.playerControls && !this.playerControls.classList.contains("always-visible")) {
          this.playerControls.hide();
        }
      }, 2e3);
    });
    this.videoContainer.addEventListener("mouseleave", () => {
      if (hoverTimer !== null) {
        clearTimeout(hoverTimer);
        hoverTimer = null;
      }
      if (this.playerControls && !this.playerControls.classList.contains("always-visible")) {
        this.playerControls.hide();
      }
    });
    this.videoContainer.addEventListener("click", (e) => {
      const target = e.target;
      if (target.closest("player-controls-shadow")) {
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      if (this.videoElement) {
        if (this.videoElement.paused) {
          this.videoElement.play().catch((err) => window.logger.error("再生開始に失敗したのじゃ:", err));
        } else {
          this.videoElement.pause();
        }
      }
    });
  }
  /**
   * HLS URLかどうかを判定
   */
  isHLSUrl(url) {
    return url.toLowerCase().includes("hls") || url.includes(".m3u8") || url.includes("master.m3u8") || url.includes("playlist.m3u8");
  }
  /**
   * HLS動画の読み込み
   */
  async loadHLSVideo(url) {
    if (!this.videoElement) return;
    window.logger.info("HLS動画の読み込みを開始するのじゃ:", url);
    if (typeof Hls !== "undefined" && Hls.isSupported()) {
      this.hls = new Hls();
      this.hls.on(Hls.Events.ERROR, (...args) => {
        const [, data] = args;
        window.logger.error("HLS Error:", data);
        this.toastManager.showError("HLS再生でエラーが発生しました");
      });
      this.hls.on(Hls.Events.MANIFEST_PARSED, () => {
        window.logger.info("HLSマニフェスト読み込み完了！");
        this.toastManager.showSuccess("HLS動画読み込み完了", "HLS.jsを使用して再生します");
      });
      this.hls.loadSource(url);
      this.hls.attachMedia(this.videoElement);
      if (this.cacheManager) {
        this.cacheManager.updateHlsInstance(this.hls, url);
      }
    } else {
      window.logger.info("HLS.jsが利用できないため、ネイティブHLS再生を試行するのじゃ");
      this.videoElement.src = url;
      this.toastManager.showInfo("ネイティブHLS再生を試行中", "ブラウザの対応に依存します");
    }
  }
  /**
   * コメントの読み込み
   */
  async loadComments(videoId) {
    try {
      if (!this.commentSystem) return;
      await this.commentSystem.loadComments(videoId);
      window.logger.info("コメントの読み込みが完了したのじゃ！");
    } catch (error) {
      window.logger.error("コメント読み込みに失敗したのじゃ:", error);
      this.toastManager.showWarning("コメント読み込みに失敗しました", "動画の再生は継続します");
    }
  }
}
new NicoCachePlayer();

export { NicoCachePlayer };
//# sourceMappingURL=video-player.es.js.map
