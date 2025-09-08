const basePanelStyles = `
  :host {
    --panel-bg: linear-gradient(135deg, rgba(20, 20, 30, 0.95), rgba(30, 30, 45, 0.95));
    --panel-fg: #ffffff;
    --panel-accent: rgba(100, 150, 255, 0.3);
    --panel-accent-hover: rgba(100, 150, 255, 0.5);
    --panel-border: rgba(255, 255, 255, 0.1);
    --panel-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    --panel-radius: 16px;
    --fab-bg: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    --fab-shadow: 0 4px 20px rgba(102, 126, 234, 0.4);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans JP", sans-serif;
    font-weight: 400;
    letter-spacing: 0.02em;
  }

  #fab {
    position: fixed;
    bottom: 24px;
    right: 24px;
    width: 64px;
    height: 64px;
    border-radius: 50%;
    background: var(--fab-bg);
    color: #ffffff;
    border: none;
    cursor: pointer;
    font-size: 28px;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    z-index: 10000;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: var(--fab-shadow);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
  }

  #fab:hover {
    transform: scale(1.1) translateY(-2px);
    box-shadow: 0 8px 32px rgba(102, 126, 234, 0.6);
  }

  #fab:active {
    transform: scale(1.05) translateY(-1px);
  }

  .panel {
    position: fixed;
    bottom: 100px;
    right: 24px;
    width: 400px;
    max-height: 80vh;
    background: var(--panel-bg);
    color: var(--panel-fg);
    border-radius: var(--panel-radius);
    padding: 24px;
    box-shadow: var(--panel-shadow);
    z-index: 10000;
    display: none;
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px solid var(--panel-border);
    overflow: hidden;
  }

  .panel.visible {
    display: block;
    animation: panelSlideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  @keyframes panelSlideIn {
    from {
      opacity: 0;
      transform: translateY(20px) scale(0.95);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  /* スクロールバーのスタイリング */
  ::-webkit-scrollbar {
    width: 8px;
  }

  ::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 4px;
  }

  ::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.2);
    border-radius: 4px;
    transition: background 0.2s ease;
  }

  ::-webkit-scrollbar-thumb:hover {
    background: rgba(255, 255, 255, 0.3);
  }
`;
class BasePanel extends HTMLElement {
  // 外クリック監視用
  constructor() {
    super();
    this.isPanelOpen = false;
    this.shadow = this.attachShadow({ mode: "closed" });
    this.outsideClickListener = this.handleOutsideClick.bind(this);
  }
  setupFab(icon, title) {
    const fab = this.shadow.getElementById("fab");
    if (fab) {
      fab.innerHTML = icon;
      fab.title = title;
      fab.addEventListener("click", () => {
        this.togglePanel();
      });
    } else {
      window.logger.error("[BasePanel] FAB element not found in setupFab");
    }
  }
  /**
   * 外クリック処理（パネル外をクリックした場合にパネルを閉じる）
   */
  handleOutsideClick(event) {
    if (!this.isPanelOpen) return;
    const mouseEvent = event;
    const panel = this.shadow.querySelector(".panel");
    const fab = this.shadow.getElementById("fab");
    if (!panel || !fab) return;
    const clickX = mouseEvent.clientX;
    const clickY = mouseEvent.clientY;
    const panelRect = panel.getBoundingClientRect();
    const fabRect = fab.getBoundingClientRect();
    const isInsidePanel = clickX >= panelRect.left && clickX <= panelRect.right && clickY >= panelRect.top && clickY <= panelRect.bottom;
    const isInsideFab = clickX >= fabRect.left && clickX <= fabRect.right && clickY >= fabRect.top && clickY <= fabRect.bottom;
    const activeSelect = this.shadow.querySelector("select:focus");
    if (activeSelect) {
      return;
    }
    const selectElements = this.shadow.querySelectorAll("select");
    for (const select of Array.from(selectElements)) {
      if (document.activeElement === select || select.matches(":focus")) {
        return;
      }
    }
    if (!isInsidePanel && !isInsideFab) {
      this.closePanel();
    }
  }
  togglePanel(forceState) {
    const panel = this.shadow.querySelector(".panel");
    if (panel) {
      this.isPanelOpen = forceState !== void 0 ? forceState : !this.isPanelOpen;
      panel.classList.toggle("visible", this.isPanelOpen);
      if (this.isPanelOpen) {
        setTimeout(() => {
          document.addEventListener("click", this.outsideClickListener, true);
        }, 100);
      } else {
        document.removeEventListener("click", this.outsideClickListener, true);
      }
    } else {
      window.logger.error("[BasePanel] Panel element not found in togglePanel");
    }
  }
  // パネルを開く
  openPanel() {
    this.togglePanel(true);
  }
  // パネルを閉じる
  closePanel() {
    this.togglePanel(false);
  }
  // パネルの状態を取得
  isPanelVisible() {
    return this.isPanelOpen;
  }
  // 外クリック監視を一時的に無効化
  temporarilyDisableOutsideClick() {
    document.removeEventListener("click", this.outsideClickListener, true);
  }
  // 外クリック監視を再開
  enableOutsideClick() {
    if (this.isPanelOpen) {
      document.addEventListener("click", this.outsideClickListener, true);
    }
  }
  // コンポーネントが削除される時にイベントリスナーをクリーンアップ
  disconnectedCallback() {
    document.removeEventListener("click", this.outsideClickListener, true);
  }
}

class NicoVideoPlayer {
  constructor() {
    this.isPlayingState = false;
    this.currentVolume = 50;
    this.currentPlaybackRate = 1;
    this.currentTime = 0;
    this.duration = 0;
    this.videoElement = null;
    this.eventListeners = {};
    this.checkInterval = null;
    this.initialized = false;
    this.isInitializing = false;
    // ローカルストレージのキー
    this.STORAGE_KEYS = {
      VOLUME: "nicoVideoPlayerVolume",
      PLAYBACK_RATE: "nicoVideoPlayerPlaybackRate"
    };
    // 安全な範囲の制限（初期化時のみ使用）
    this.SAFE_LIMITS = {
      VOLUME: {
        MIN: 0,
        MAX: 100
      },
      PLAYBACK_RATE: {
        MIN: 0.1,
        MAX: 5
      }
    };
    void this.initializeNicoCache();
  }
  async initializeNicoCache() {
    while (!window.NicoCache_nl) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    this.nicoCache = window.NicoCache_nl;
    this.setupEventListeners();
    this.initialized = true;
    this.isInitializing = false;
  }
  static getInstance() {
    if (!NicoVideoPlayer.instance) {
      NicoVideoPlayer.instance = new NicoVideoPlayer();
    }
    return NicoVideoPlayer.instance;
  }
  getVideoElement() {
    try {
      if (!this.videoElement || !document.body.contains(this.videoElement)) {
        const videos = Array.from(document.querySelectorAll("video"));
        this.videoElement = videos.find((video) => {
          return (
            // 新しい条件: data-name="video-content" を持つ要素
            video.dataset.name === "video-content" || // idにvideo-elementを持つ要素
            video.id === "video-element"
          );
        }) || null;
        if (this.videoElement) {
          this.setupVideoElementListeners();
        }
      }
      return this.videoElement;
    } catch (error) {
      window.logger.error("[NicoVideoPlayer] Error getting video element:", error);
      return null;
    }
  }
  setupVideoElementListeners() {
    if (!this.videoElement) return;
    try {
      this.removeAllEventListeners();
      this.eventListeners.play = () => {
        this.isPlayingState = true;
      };
      this.eventListeners.pause = () => {
        this.isPlayingState = false;
      };
      this.eventListeners.timeupdate = () => {
        if (this.videoElement) {
          this.currentTime = this.videoElement.currentTime;
        }
      };
      this.eventListeners.durationchange = () => {
        if (this.videoElement) {
          this.duration = this.videoElement.duration;
        }
      };
      this.eventListeners.ratechange = () => {
        if (this.videoElement) {
          this.currentPlaybackRate = this.videoElement.playbackRate;
          this.saveSettings();
        }
      };
      this.eventListeners.volumechange = () => {
        if (this.videoElement) {
          this.currentVolume = this.videoElement.volume * 100;
          this.saveSettings();
        }
      };
      this.eventListeners.error = (event) => {
        window.logger.error("[NicoVideoPlayer] Video error:", event);
      };
      this.eventListeners.loadedmetadata = () => {
        setTimeout(() => {
          this.restoreSettings();
        }, 100);
      };
      Object.entries(this.eventListeners).forEach(([event, listener]) => {
        this.videoElement?.addEventListener(event, listener);
      });
      this.startExternalChangeMonitoring();
      if (this.videoElement.readyState >= 1) {
        setTimeout(() => {
          this.restoreSettings();
        }, 100);
      }
    } catch (error) {
      window.logger.error("[NicoVideoPlayer] Error setting up event listeners:", error);
    }
  }
  removeAllEventListeners() {
    try {
      if (!this.videoElement) return;
      Object.entries(this.eventListeners).forEach(([event, listener]) => {
        this.videoElement?.removeEventListener(event, listener);
      });
      this.eventListeners = {};
    } catch (error) {
      window.logger.error("[NicoVideoPlayer] Error removing event listeners:", error);
    }
  }
  setupEventListeners() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }
    this.checkInterval = window.setInterval(() => {
      this.getVideoElement();
    }, 1e3);
  }
  async play() {
    try {
      const video = this.getVideoElement();
      if (video) {
        await video.play();
      }
    } catch (error) {
      window.logger.error("[NicoVideoPlayer] Error playing video:", error);
      this.isPlayingState = false;
    }
  }
  pause() {
    try {
      const video = this.getVideoElement();
      if (video) {
        video.pause();
      }
    } catch (error) {
      window.logger.error("[NicoVideoPlayer] Error pausing video:", error);
    }
  }
  seek(time) {
    try {
      const video = this.getVideoElement();
      if (video) {
        video.currentTime = Math.max(0, Math.min(time, video.duration));
        this.currentTime = video.currentTime;
      }
    } catch (error) {
      window.logger.error("[NicoVideoPlayer] Error seeking video:", error);
    }
  }
  setVolume(volume) {
    try {
      const video = this.getVideoElement();
      if (video) {
        let finalVolume = volume;
        if (this.isInitializing) {
          finalVolume = this.clampToSafeRange(volume, "VOLUME");
          if (finalVolume !== volume) {
            window.logger.warn(`[NicoVideoPlayer] Volume value ${volume} was clamped to safe range: ${finalVolume}`);
          }
        }
        const normalizedVolume = Math.max(0, Math.min(100, finalVolume)) / 100;
        video.volume = normalizedVolume;
        this.currentVolume = finalVolume;
        this.saveSettings();
      }
    } catch (error) {
      window.logger.error("[NicoVideoPlayer] Error setting volume:", error);
    }
  }
  setPlaybackRate(rate) {
    try {
      const video = this.getVideoElement();
      if (video) {
        let finalRate = rate;
        if (this.isInitializing) {
          finalRate = this.clampToSafeRange(rate, "PLAYBACK_RATE");
          if (finalRate !== rate) {
            window.logger.warn(`[NicoVideoPlayer] Playback rate value ${rate} was clamped to safe range: ${finalRate}`);
          }
        }
        video.playbackRate = finalRate;
        this.currentPlaybackRate = finalRate;
        this.saveSettings();
      }
    } catch (error) {
      window.logger.error("[NicoVideoPlayer] Error setting playback rate:", error);
    }
  }
  isPlaying() {
    const video = this.getVideoElement();
    return video ? !video.paused : this.isPlayingState;
  }
  getVolume() {
    const video = this.getVideoElement();
    return video ? video.volume * 100 : this.currentVolume;
  }
  getPlaybackRate() {
    const video = this.getVideoElement();
    return video ? video.playbackRate : this.currentPlaybackRate;
  }
  getCurrentTime() {
    const video = this.getVideoElement();
    return video ? video.currentTime : this.currentTime;
  }
  getDuration() {
    const video = this.getVideoElement();
    return video ? video.duration : this.duration;
  }
  isInitialized() {
    return this.initialized;
  }
  reinitialize() {
    try {
      this.removeAllEventListeners();
      if (this.checkInterval) {
        clearInterval(this.checkInterval);
        this.checkInterval = null;
      }
      this.videoElement = null;
      this.isPlayingState = false;
      this.currentVolume = 50;
      this.currentPlaybackRate = 1;
      this.currentTime = 0;
      this.duration = 0;
      this.initialized = false;
      this.isInitializing = true;
      void this.initializeNicoCache();
    } catch (error) {
      window.logger.error("[NicoVideoPlayer] Error reinitializing:", error);
    }
  }
  destroy() {
    try {
      this.removeAllEventListeners();
      if (this.checkInterval) {
        clearInterval(this.checkInterval);
        this.checkInterval = null;
      }
      this.videoElement = null;
      this.initialized = false;
      NicoVideoPlayer.instance = void 0;
    } catch (error) {
      window.logger.error("[NicoVideoPlayer] Error destroying instance:", error);
    }
  }
  // 安全な範囲への丸め機能
  clampToSafeRange(value, type) {
    const limits = this.SAFE_LIMITS[type];
    return Math.max(limits.MIN, Math.min(limits.MAX, value));
  }
  // 設定をローカルストレージに保存
  saveSettings() {
    try {
      const safeVolume = this.clampToSafeRange(this.currentVolume, "VOLUME");
      const safePlaybackRate = this.clampToSafeRange(this.currentPlaybackRate, "PLAYBACK_RATE");
      localStorage.setItem(this.STORAGE_KEYS.VOLUME, safeVolume.toString());
      localStorage.setItem(this.STORAGE_KEYS.PLAYBACK_RATE, safePlaybackRate.toString());
    } catch (error) {
      window.logger.error("[NicoVideoPlayer] Error saving settings:", error);
    }
  }
  // 設定をローカルストレージから復元
  restoreSettings() {
    try {
      const wasInitializing = this.isInitializing;
      this.isInitializing = true;
      const savedVolume = localStorage.getItem(this.STORAGE_KEYS.VOLUME);
      const savedPlaybackRate = localStorage.getItem(this.STORAGE_KEYS.PLAYBACK_RATE);
      if (savedVolume !== null) {
        const volume = parseFloat(savedVolume);
        this.setVolume(volume);
      }
      if (savedPlaybackRate !== null) {
        const rate = parseFloat(savedPlaybackRate);
        this.setPlaybackRate(rate);
      }
      this.isInitializing = wasInitializing;
    } catch (error) {
      window.logger.error("[NicoVideoPlayer] Error restoring settings:", error);
      this.isInitializing = false;
    }
  }
  // 外部変更を検知するための監視機能
  startExternalChangeMonitoring() {
    if (!this.videoElement) return;
    const monitorInterval = setInterval(() => {
      if (!this.videoElement || !document.body.contains(this.videoElement)) {
        clearInterval(monitorInterval);
        return;
      }
      const actualVolume = this.videoElement.volume * 100;
      if (Math.abs(actualVolume - this.currentVolume) > 1) {
        this.currentVolume = actualVolume;
        this.saveSettings();
      }
      const actualRate = this.videoElement.playbackRate;
      if (Math.abs(actualRate - this.currentPlaybackRate) > 0.01) {
        this.currentPlaybackRate = actualRate;
        this.saveSettings();
      }
    }, 500);
  }
}

class Mylist2DB {
  toMessage(value) {
    if (value && typeof value.message === "string") {
      return value.message;
    }
    try {
      return String(value);
    } catch {
      return "Unknown error";
    }
  }
  constructor() {
    this.dbName = "Mylist2DB";
    this.version = 8;
    this.migrationSteps = this.initializeMigrationSteps();
  }
  // マイグレーションステップを初期化
  initializeMigrationSteps() {
    return [
      {
        version: 1,
        description: "初期データベース構造の作成",
        execute: async (db) => {
          await Promise.resolve();
          this.createInitialStores(db);
        }
      },
      {
        version: 4,
        description: "マネージャーストアの追加",
        execute: async (db) => {
          await Promise.resolve();
          if (!db.objectStoreNames.contains("manager")) {
            db.createObjectStore("manager", { keyPath: "id" });
          }
        }
      },
      {
        version: 5,
        description: "キーワードストアの追加",
        execute: async (db) => {
          await Promise.resolve();
          if (!db.objectStoreNames.contains("keywords")) {
            const keywordStore = db.createObjectStore("keywords", {
              keyPath: "id",
              autoIncrement: true
            });
            keywordStore.createIndex("mylistId", "mylistId", { unique: false });
            keywordStore.createIndex("keyword", "keyword", { unique: false });
            keywordStore.createIndex("addedAt", "addedAt", { unique: false });
          }
        }
      },
      {
        version: 6,
        description: "データベースメタデータストアの追加",
        execute: async (db, transaction) => {
          if (!db.objectStoreNames.contains("metadata")) {
            db.createObjectStore("metadata", { keyPath: "key" });
          }
          const store = transaction.objectStore("metadata");
          await new Promise((resolve, reject) => {
            const initData = [
              { key: "created_at", value: (/* @__PURE__ */ new Date()).toISOString() },
              { key: "last_backup", value: null },
              { key: "health_check_last", value: null },
              { key: "migration_history", value: [] }
            ];
            let completed = 0;
            initData.forEach((data) => {
              const request = store.put(data);
              request.onsuccess = () => {
                completed++;
                if (completed === initData.length) {
                  resolve();
                }
              };
              request.onerror = () => reject(new Error(this.toMessage(request.error)));
            });
          });
        }
      },
      {
        version: 7,
        description: "videosストアにtagsインデックスを追加",
        execute: async (db, transaction) => {
          await Promise.resolve();
          if (db.objectStoreNames.contains("videos")) {
            const store = transaction.objectStore("videos");
            const hasTagsIndex = Array.from(store.indexNames).includes("tags");
            if (!hasTagsIndex) {
              store.createIndex("tags", "tags", { unique: false, multiEntry: true });
            }
          }
        }
      }
    ];
  }
  // プログレス報告コールバックを設定
  setProgressCallback(callback) {
    this.onProgressCallback = callback;
  }
  // データベース永続化昇格機能
  async requestPersistence() {
    try {
      if ("storage" in navigator && "persist" in navigator.storage) {
        const persistence = await navigator.storage.persist();
        window.logger?.info("Database persistence requested:", persistence);
        return persistence;
      }
      return false;
    } catch (error) {
      window.logger?.error("Error requesting persistence:", error);
      return false;
    }
  }
  // ストレージ容量監視
  async getStorageEstimate() {
    try {
      if ("storage" in navigator && "estimate" in navigator.storage) {
        const estimate = await navigator.storage.estimate();
        window.logger?.info("Storage estimate:", estimate);
        return estimate;
      }
      return null;
    } catch (error) {
      window.logger?.error("Error getting storage estimate:", error);
      return null;
    }
  }
  // データベース健全性チェック
  async performHealthCheck() {
    const health = {
      isHealthy: true,
      issues: [],
      storageEstimate: await this.getStorageEstimate(),
      persistence: await this.checkPersistence()
    };
    try {
      const db = await this.initDB();
      const expectedStores = ["mylists", "videos", "manager", "keywords", "metadata"];
      for (const storeName of expectedStores) {
        if (!db.objectStoreNames.contains(storeName)) {
          health.issues.push(`Missing store: ${storeName}`);
          health.isHealthy = false;
        }
      }
      const transaction = db.transaction(["mylists", "videos", "keywords"], "readonly");
      const mylistStore = transaction.objectStore("mylists");
      const videoStore = transaction.objectStore("videos");
      const keywordStore = transaction.objectStore("keywords");
      const mylistsRequest = mylistStore.getAll();
      const videosRequest = videoStore.getAll();
      const keywordsRequest = keywordStore.getAll();
      const [mylists, videos, keywords] = await Promise.all([
        new Promise((resolve, reject) => {
          mylistsRequest.onsuccess = () => resolve(mylistsRequest.result);
          mylistsRequest.onerror = () => reject(new Error(this.toMessage(mylistsRequest.error)));
        }),
        new Promise((resolve, reject) => {
          videosRequest.onsuccess = () => resolve(videosRequest.result);
          videosRequest.onerror = () => reject(new Error(this.toMessage(videosRequest.error)));
        }),
        new Promise((resolve, reject) => {
          keywordsRequest.onsuccess = () => resolve(keywordsRequest.result);
          keywordsRequest.onerror = () => reject(new Error(this.toMessage(keywordsRequest.error)));
        })
      ]);
      const mylistIds = new Set(mylists.map((m) => m.id));
      const orphanedVideos = videos.filter((v) => !mylistIds.has(v.mylistId));
      if (orphanedVideos.length > 0) {
        health.issues.push(`Found ${orphanedVideos.length} orphaned videos`);
        health.isHealthy = false;
      }
      const orphanedKeywords = keywords.filter((k) => !mylistIds.has(k.mylistId));
      if (orphanedKeywords.length > 0) {
        health.issues.push(`Found ${orphanedKeywords.length} orphaned keywords`);
        health.isHealthy = false;
      }
      const metadataTransaction = db.transaction(["metadata"], "readwrite");
      const metadataStore = metadataTransaction.objectStore("metadata");
      await new Promise((resolve, reject) => {
        const request = metadataStore.put({
          key: "health_check_last",
          value: (/* @__PURE__ */ new Date()).toISOString()
        });
        request.onsuccess = () => resolve();
        request.onerror = () => reject(new Error(this.toMessage(request.error)));
      });
      db.close();
    } catch (error) {
      health.issues.push(`Health check failed: ${this.toMessage(error)}`);
      health.isHealthy = false;
    }
    return health;
  }
  // 永続化状態確認
  async checkPersistence() {
    try {
      if ("storage" in navigator && "persisted" in navigator.storage) {
        return await navigator.storage.persisted();
      }
      return false;
    } catch (error) {
      window.logger?.error("Error checking persistence:", error);
      return false;
    }
  }
  // データベースバックアップ
  async createBackup() {
    const db = await this.initDB();
    const backup = {
      version: this.version,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      data: {}
    };
    try {
      const storeNames = ["mylists", "videos", "keywords", "manager", "metadata"];
      const transaction = db.transaction(storeNames, "readonly");
      for (const storeName of storeNames) {
        const store = transaction.objectStore(storeName);
        const request = store.getAll();
        backup.data[storeName] = await new Promise((resolve, reject) => {
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(new Error(this.toMessage(request.error)));
        });
      }
      const metadataTransaction = db.transaction(["metadata"], "readwrite");
      const metadataStore = metadataTransaction.objectStore("metadata");
      await new Promise((resolve, reject) => {
        const request = metadataStore.put({
          key: "last_backup",
          value: backup.timestamp
        });
        request.onsuccess = () => resolve();
        request.onerror = () => reject(new Error(this.toMessage(request.error)));
      });
      db.close();
      return JSON.stringify(backup);
    } catch (error) {
      db.close();
      throw error;
    }
  }
  // バックアップからの復元
  async restoreFromBackup(backupData) {
    const backupUnknown = JSON.parse(backupData);
    const backup = backupUnknown;
    const db = await this.initDB();
    try {
      const storeNames = Object.keys(backup.data);
      const transaction = db.transaction(storeNames, "readwrite");
      for (const storeName of storeNames) {
        const store = transaction.objectStore(storeName);
        await new Promise((resolve, reject) => {
          const clearRequest = store.clear();
          clearRequest.onsuccess = () => resolve();
          clearRequest.onerror = () => reject(new Error(this.toMessage(clearRequest.error)));
        });
        const data = backup.data[storeName];
        for (const item of data) {
          await new Promise((resolve, reject) => {
            const putRequest = store.put(item);
            putRequest.onsuccess = () => resolve();
            putRequest.onerror = () => reject(new Error(this.toMessage(putRequest.error)));
          });
        }
      }
      db.close();
      window.logger?.info("Database restored from backup successfully");
    } catch (error) {
      db.close();
      throw error;
    }
  }
  async initDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);
      request.onupgradeneeded = async (event) => {
        const db = event.target.result;
        const oldVersion = event.oldVersion;
        try {
          const stepsToExecute = this.migrationSteps.filter(
            (step) => step.version > oldVersion && step.version <= this.version
          );
          if (this.onProgressCallback) {
            this.onProgressCallback({
              currentStep: 0,
              totalSteps: stepsToExecute.length,
              currentVersion: oldVersion,
              targetVersion: this.version,
              description: "マイグレーション開始"
            });
          }
          for (let i = 0; i < stepsToExecute.length; i++) {
            const step = stepsToExecute[i];
            if (this.onProgressCallback) {
              this.onProgressCallback({
                currentStep: i + 1,
                totalSteps: stepsToExecute.length,
                currentVersion: oldVersion,
                targetVersion: this.version,
                description: step.description
              });
            }
            try {
              await step.execute(db, event.target.transaction);
              window.logger?.info(`Migration step ${step.version} completed: ${step.description}`);
            } catch (error) {
              window.logger?.error(`Migration step ${step.version} failed:`, error);
              throw error;
            }
          }
          if (db.objectStoreNames.contains("metadata")) {
            const transaction = db.transaction(["metadata"], "readwrite");
            const metadataStore = transaction.objectStore("metadata");
            await new Promise((resolve2, reject2) => {
              const getRequest = metadataStore.get("migration_history");
              getRequest.onsuccess = () => {
                const historyRaw = getRequest.result;
                const current = historyRaw && "value" in historyRaw ? historyRaw.value : [];
                const history = Array.isArray(current) ? current : [];
                history.push({
                  from: oldVersion,
                  to: this.version,
                  timestamp: (/* @__PURE__ */ new Date()).toISOString(),
                  steps: stepsToExecute.map((s) => s.version)
                });
                const putRequest = metadataStore.put({
                  key: "migration_history",
                  value: history
                });
                putRequest.onsuccess = () => resolve2();
                putRequest.onerror = () => reject2(new Error(this.toMessage(putRequest.error)));
              };
              getRequest.onerror = () => reject2(new Error(this.toMessage(getRequest.error)));
            });
          }
          if (this.onProgressCallback) {
            this.onProgressCallback({
              currentStep: stepsToExecute.length,
              totalSteps: stepsToExecute.length,
              currentVersion: this.version,
              targetVersion: this.version,
              description: "マイグレーション完了"
            });
          }
        } catch (error) {
          if (this.onProgressCallback) {
            this.onProgressCallback({
              currentStep: 0,
              totalSteps: 0,
              currentVersion: oldVersion,
              targetVersion: this.version,
              description: "マイグレーション失敗",
              error: error?.toString()
            });
          }
          throw error;
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(new Error(this.toMessage(request.error)));
    });
  }
  createInitialStores(db) {
    if (!db.objectStoreNames.contains("mylists")) {
      const mylistStore = db.createObjectStore("mylists", {
        keyPath: "id",
        autoIncrement: true
      });
      mylistStore.createIndex("name", "name", { unique: false });
      mylistStore.createIndex("sortOrder", "sortOrder", { unique: false });
      mylistStore.createIndex("createdAt", "createdAt", { unique: false });
    }
    if (!db.objectStoreNames.contains("videos")) {
      const videoStore = db.createObjectStore("videos", {
        keyPath: "id"
      });
      videoStore.createIndex("mylistId", "mylistId", { unique: false });
      videoStore.createIndex("originalId", "originalId", { unique: false });
      videoStore.createIndex("title", "title", { unique: false });
      videoStore.createIndex("viewCount", "viewCount", { unique: false });
      videoStore.createIndex("commentCount", "commentCount", { unique: false });
      videoStore.createIndex("mylistCount", "mylistCount", { unique: false });
      videoStore.createIndex("addedAt", "addedAt", { unique: false });
      videoStore.createIndex("thumbnailUrl", "thumbnailUrl", { unique: false });
      videoStore.createIndex("uploadedAt", "uploadedAt", { unique: false });
      videoStore.createIndex("authorName", "authorName", { unique: false });
      videoStore.createIndex("length", "length", { unique: false });
      try {
        videoStore.createIndex("tags", "tags", { unique: false, multiEntry: true });
      } catch (e) {
        window.logger?.warn?.("createIndex(tags) skipped:", e);
      }
    }
    if (!db.objectStoreNames.contains("manager")) {
      db.createObjectStore("manager", {
        keyPath: "id"
      });
    }
  }
  // 自動初期化とヘルスチェック
  async initializeWithHealthCheck() {
    const persistence = await this.requestPersistence();
    const db = await this.initDB();
    const health = await this.performHealthCheck();
    return { db, health, persistence };
  }
  // すべてのアプリデータをクリア（メタデータは保持）
  async clearAllData(clearManager = false) {
    const db = await this.initDB();
    try {
      const storeNames = clearManager ? ["mylists", "videos", "keywords", "manager"] : ["mylists", "videos", "keywords"];
      const tx = db.transaction(storeNames, "readwrite");
      await Promise.all(storeNames.map((storeName) => new Promise((resolve, reject) => {
        const store = tx.objectStore(storeName);
        const req = store.clear();
        req.onsuccess = () => resolve();
        req.onerror = () => reject(new Error(this.toMessage(req.error)));
      })));
    } finally {
      db.close();
    }
  }
}

class ApiService {
  constructor() {
    this.apiCache = /* @__PURE__ */ new Map();
    this.apiRequestQueue = [];
    this.isProcessingQueue = false;
    this.API_RATE_LIMIT = 200;
    this.API_REQUEST_LIMIT = 50;
    this.apiRequestCount = 0;
  }
  // APIリクエストのキューイング処理
  async queueApiRequest(videoId) {
    return new Promise((resolve, reject) => {
      this.apiRequestQueue.push({
        videoId,
        resolve,
        reject
      });
      if (!this.isProcessingQueue) {
        void this.processQueue();
      }
    });
  }
  // キューの処理
  async processQueue() {
    if (this.apiRequestQueue.length === 0) {
      this.isProcessingQueue = false;
      return;
    }
    this.isProcessingQueue = true;
    const request = this.apiRequestQueue.shift();
    try {
      if (request) {
        const result = await this._fetchVideoInfo(request.videoId);
        request.resolve(result);
      }
    } catch (error) {
      if (request) {
        request.reject(error instanceof Error ? error : new Error(String(error)));
      }
    }
    await new Promise((resolve) => setTimeout(resolve, this.API_RATE_LIMIT));
    void this.processQueue();
  }
  // 実際のAPI呼び出し（内部用）
  async _fetchVideoInfo(videoId) {
    try {
      const cachedData = this.apiCache.get(videoId);
      if (cachedData) {
        return cachedData;
      }
      const response = await fetch(`https://ext.nicovideo.jp/api/getthumbinfo/${videoId}`);
      const text = await response.text();
      const parser = new DOMParser();
      const xml = parser.parseFromString(text, "text/xml");
      const errorElement = xml.querySelector("error");
      if (errorElement) {
        const description = xml.querySelector("description");
        throw new Error(description?.textContent || "動画情報の取得に失敗しました");
      }
      const thumb = xml.querySelector("thumb");
      if (!thumb) {
        throw new Error("動画情報の取得に失敗しました");
      }
      const lengthElement = thumb.querySelector("length");
      if (!lengthElement || !lengthElement.textContent) {
        throw new Error("動画の長さ情報が取得できませんでした");
      }
      const length = lengthElement.textContent;
      const [minutes, seconds] = length.split(":").map(Number);
      const lengthInSeconds = minutes * 60 + seconds;
      const titleElement = thumb.querySelector("title");
      const descriptionElement = thumb.querySelector("description");
      const viewCountElement = thumb.querySelector("view_counter");
      const commentNumElement = thumb.querySelector("comment_num");
      const mylistCounterElement = thumb.querySelector("mylist_counter");
      const thumbnailUrlElement = thumb.querySelector("thumbnail_url");
      const firstRetrieveElement = thumb.querySelector("first_retrieve");
      const userNicknameElement = thumb.querySelector("user_nickname");
      const chNameElement = thumb.querySelector("ch_name");
      if (!titleElement || !viewCountElement || !commentNumElement || !mylistCounterElement || !thumbnailUrlElement || !firstRetrieveElement) {
        throw new Error("必要な動画情報が取得できませんでした");
      }
      const tagElements = Array.from(thumb.querySelectorAll("tags tag"));
      const tags = tagElements.map((t) => (t.textContent || "").trim()).filter(Boolean);
      const videoInfo = {
        id: videoId,
        title: titleElement.textContent || "不明な動画",
        viewCount: parseInt(viewCountElement.textContent || "0"),
        commentCount: parseInt(commentNumElement.textContent || "0"),
        mylistCount: parseInt(mylistCounterElement.textContent || "0"),
        thumbnailUrl: thumbnailUrlElement.textContent || "",
        uploadedAt: new Date(firstRetrieveElement.textContent || "").getTime(),
        authorName: userNicknameElement?.textContent || chNameElement?.textContent || "不明",
        length: lengthInSeconds,
        description: descriptionElement?.textContent || "",
        tags: tags.length > 0 ? tags : void 0
      };
      this.apiCache.set(videoId, videoInfo);
      return videoInfo;
    } catch (error) {
      throw new Error(`動画情報の取得に失敗しました: ${error instanceof Error ? error.message : "不明なエラー"}`);
    }
  }
  // 公開用のfetchVideoInfo（キューイング処理を使用）
  async fetchVideoInfo(videoId) {
    if (!videoId.match(/^(?:so|sm|nm|nx)\d+$/)) {
      throw new Error("無効な動画IDです");
    }
    return this.queueApiRequest(videoId);
  }
  // 動画情報を取得する関数
  async getVideoInfoFromSources(videoId, existingData = null) {
    const shouldUseApi = this.apiRequestCount < this.API_REQUEST_LIMIT;
    if (existingData) {
      const isComplete = existingData.title && existingData.viewCount !== void 0 && existingData.commentCount !== void 0 && existingData.mylistCount !== void 0 && existingData.thumbnailUrl && existingData.uploadedAt !== void 0 && existingData.authorName && existingData.length !== void 0;
      if (isComplete || !shouldUseApi) {
        return {
          id: videoId,
          title: existingData.title || "不明な動画",
          viewCount: parseInt(String(existingData.viewCount)) || 0,
          commentCount: parseInt(String(existingData.commentCount)) || 0,
          mylistCount: parseInt(String(existingData.mylistCount)) || 0,
          thumbnailUrl: existingData.thumbnailUrl || "",
          uploadedAt: existingData.uploadedAt || Date.now(),
          authorName: existingData.authorName || "不明",
          length: parseInt(String(existingData.length)) || 0
        };
      }
    }
    const cachedData = this.apiCache.get(videoId);
    if (cachedData) {
      return cachedData;
    }
    if (!shouldUseApi) {
      return {
        id: videoId,
        title: existingData?.title || "不明な動画",
        viewCount: parseInt(String(existingData?.viewCount)) || 0,
        commentCount: parseInt(String(existingData?.commentCount)) || 0,
        mylistCount: parseInt(String(existingData?.mylistCount)) || 0,
        thumbnailUrl: existingData?.thumbnailUrl || "",
        uploadedAt: existingData?.uploadedAt || Date.now(),
        authorName: existingData?.authorName || "不明",
        length: parseInt(String(existingData?.length)) || 0
      };
    }
    this.apiRequestCount++;
    return this.fetchVideoInfo(videoId);
  }
  // 動画IDまたはURLから動画IDを抽出する関数
  extractVideoId(input) {
    const urlPatterns = [/nicovideo\.jp\/watch\/((?:so|sm|nm|nx)\d+)/, /nico\.ms\/((?:so|sm|nm|nx)\d+)/];
    for (const pattern of urlPatterns) {
      const match = input.match(pattern);
      if (match) {
        return match[1];
      }
    }
    if (input.match(/^(?:so|sm|nm|nx)\d+$/)) {
      return input;
    }
    throw new Error("無効な動画IDまたはURLです");
  }
  // APIリクエストカウンターをリセット
  resetApiRequestCount() {
    this.apiRequestCount = 0;
  }
  // キャッシュをクリア
  clearCache() {
    this.apiCache.clear();
  }
  // キャッシュにデータを追加
  setCacheData(videoId, videoInfo) {
    this.apiCache.set(videoId, videoInfo);
  }
}

class MylistService {
  toMessage(value) {
    return value instanceof Error ? value.message : String(value);
  }
  constructor(db) {
    this.db = db;
  }
  async createMylist(name) {
    const database = await this.db.initDB();
    const transaction = database.transaction(["mylists"], "readwrite");
    const store = transaction.objectStore("mylists");
    return new Promise((resolve, reject) => {
      const request = store.add({
        name,
        createdAt: Date.now(),
        sortOrder: 0
      });
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(new Error(this.toMessage(request.error)));
    });
  }
  async getAllMylists() {
    const database = await this.db.initDB();
    const transaction = database.transaction(["mylists"], "readonly");
    const store = transaction.objectStore("mylists");
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(new Error(this.toMessage(request.error)));
    });
  }
  async sortMylists(sortType, getVideosFunc) {
    const mylists = await this.getAllMylists();
    const mylistsWithCount = await Promise.all(
      mylists.map(async (mylist) => {
        const videos = await getVideosFunc(mylist.id);
        return {
          ...mylist,
          videoCount: videos.length
        };
      })
    );
    const [type, order] = sortType.split("_");
    const isAsc = order === "asc";
    return mylistsWithCount.sort((a, b) => {
      let comparison = 0;
      switch (type) {
        case "name":
          comparison = a.name.localeCompare(b.name, "ja");
          break;
        case "createdAt":
          comparison = a.createdAt - b.createdAt;
          break;
        case "videoCount":
          comparison = (a.videoCount || 0) - (b.videoCount || 0);
          break;
        default:
          comparison = a.name.localeCompare(b.name, "ja");
      }
      return isAsc ? comparison : -comparison;
    });
  }
  async updateMylistName(mylistId, newName) {
    const database = await this.db.initDB();
    const transaction = database.transaction(["mylists"], "readwrite");
    const store = transaction.objectStore("mylists");
    return new Promise((resolve, reject) => {
      const request = store.get(mylistId);
      request.onsuccess = () => {
        const mylist = request.result;
        if (!mylist) {
          reject(new Error("マイリストが見つかりません"));
          return;
        }
        mylist.name = newName;
        const updateRequest = store.put(mylist);
        updateRequest.onsuccess = () => resolve();
        updateRequest.onerror = () => reject(new Error(this.toMessage(request.error)));
      };
      request.onerror = () => reject(new Error(this.toMessage(request.error)));
    });
  }
  async deleteMylist(mylistId) {
    const database = await this.db.initDB();
    const transaction = database.transaction(["mylists", "videos"], "readwrite");
    const mylistStore = transaction.objectStore("mylists");
    const videoStore = transaction.objectStore("videos");
    const videoIndex = videoStore.index("mylistId");
    return new Promise((resolve, reject) => {
      const deleteVideos = videoIndex.getAllKeys(mylistId);
      deleteVideos.onsuccess = () => {
        const keys = deleteVideos.result;
        Promise.all([
          ...keys.map((key) => {
            return new Promise((res, rej) => {
              const request = videoStore.delete(key);
              request.onsuccess = () => res();
              request.onerror = () => rej(new Error(this.toMessage(request.error)));
            });
          }),
          new Promise((res, rej) => {
            const request = mylistStore.delete(mylistId);
            request.onsuccess = () => res();
            request.onerror = () => rej(new Error(this.toMessage(request.error)));
          })
        ]).then(() => resolve()).catch((e) => reject(e instanceof Error ? e : new Error(this.toMessage(e))));
      };
      deleteVideos.onerror = () => reject(new Error(this.toMessage(deleteVideos.error)));
    });
  }
}

class VideoService {
  toMessage(value) {
    return value instanceof Error ? value.message : String(value);
  }
  constructor(db) {
    this.db = db;
  }
  async addVideo(mylistId, videoInfo) {
    const database = await this.db.initDB();
    const transaction = database.transaction(["videos"], "readwrite");
    const store = transaction.objectStore("videos");
    const index = store.index("mylistId");
    return new Promise((resolve, reject) => {
      const request = index.get(IDBKeyRange.only(mylistId));
      request.onsuccess = () => {
        const existingVideos = request.result;
        const existing = existingVideos;
        if (existing && existing.id === videoInfo.id) {
          reject(new Error("このマイリストには既に登録されています"));
          return;
        }
        const video = {
          id: `${mylistId}_${videoInfo.id}`,
          originalId: videoInfo.id,
          mylistId,
          title: videoInfo.title,
          viewCount: parseInt(String(videoInfo.viewCount)) || 0,
          commentCount: parseInt(String(videoInfo.commentCount)) || 0,
          mylistCount: parseInt(String(videoInfo.mylistCount)) || 0,
          thumbnailUrl: videoInfo.thumbnailUrl,
          uploadedAt: videoInfo.uploadedAt || Date.now(),
          authorName: videoInfo.authorName || "不明",
          length: videoInfo.length || 0,
          description: videoInfo.description || "",
          tags: videoInfo.tags && videoInfo.tags.length > 0 ? videoInfo.tags : void 0,
          // 任意: VideoInfoにmemoが渡ってくる場合は保持
          memo: videoInfo.memo ?? void 0,
          addedAt: Date.now()
        };
        const addRequest = store.add(video);
        addRequest.onsuccess = () => resolve("追加しました");
        addRequest.onerror = () => reject(new Error("追加に失敗しました"));
      };
      request.onerror = () => reject(new Error(this.toMessage(request.error)));
    });
  }
  async getVideos(mylistId) {
    const database = await this.db.initDB();
    const transaction = database.transaction(["videos"], "readonly");
    const store = transaction.objectStore("videos");
    const index = store.index("mylistId");
    return new Promise((resolve, reject) => {
      const request = index.getAll(mylistId);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(new Error(this.toMessage(request.error)));
    });
  }
  sortVideos(videos, sortType) {
    const [type, order] = sortType.split("_");
    const isAsc = order === "asc";
    return videos.sort((a, b) => {
      let comparison = 0;
      switch (type) {
        case "uploadedAt":
          comparison = (a.uploadedAt || 0) - (b.uploadedAt || 0);
          break;
        case "title":
          comparison = (a.title || "").localeCompare(b.title || "", "ja");
          break;
        case "viewCount":
          comparison = (a.viewCount || 0) - (b.viewCount || 0);
          break;
        case "commentCount":
          comparison = (a.commentCount || 0) - (b.commentCount || 0);
          break;
        case "mylistCount":
          comparison = (a.mylistCount || 0) - (b.mylistCount || 0);
          break;
        case "length":
          comparison = (a.length || 0) - (b.length || 0);
          break;
        case "addedAt":
          comparison = (a.addedAt || 0) - (b.addedAt || 0);
          break;
        default:
          comparison = (a.uploadedAt || 0) - (b.uploadedAt || 0);
      }
      return isAsc ? comparison : -comparison;
    });
  }
  async deleteVideo(compositeId) {
    const database = await this.db.initDB();
    const transaction = database.transaction(["videos"], "readwrite");
    const store = transaction.objectStore("videos");
    return new Promise((resolve, reject) => {
      const request = store.delete(compositeId);
      request.onsuccess = () => {
        resolve("削除しました");
      };
      request.onerror = () => {
        reject(new Error("削除に失敗しました"));
      };
    });
  }
  async updateVideoInfo(compositeId, newInfo) {
    const database = await this.db.initDB();
    const transaction = database.transaction(["videos"], "readwrite");
    const store = transaction.objectStore("videos");
    return new Promise((resolve, reject) => {
      const request = store.get(compositeId);
      request.onsuccess = () => {
        const existingVideo = request.result;
        if (!existingVideo) {
          reject(new Error("動画が見つかりません"));
          return;
        }
        const updatedVideo = {
          ...existingVideo,
          title: newInfo.title || existingVideo.title,
          viewCount: newInfo.viewCount || existingVideo.viewCount,
          commentCount: newInfo.commentCount || existingVideo.commentCount,
          mylistCount: newInfo.mylistCount || existingVideo.mylistCount,
          thumbnailUrl: newInfo.thumbnailUrl || existingVideo.thumbnailUrl,
          uploadedAt: newInfo.uploadedAt || existingVideo.uploadedAt,
          authorName: newInfo.authorName || existingVideo.authorName,
          length: newInfo.length || existingVideo.length || 0,
          description: newInfo.description !== void 0 ? newInfo.description : existingVideo.description,
          tags: newInfo.tags !== void 0 ? newInfo.tags && newInfo.tags.length > 0 ? newInfo.tags : void 0 : existingVideo.tags
        };
        const updateRequest = store.put(updatedVideo);
        updateRequest.onsuccess = () => resolve();
        updateRequest.onerror = () => reject(new Error("データベースの更新に失敗しました"));
      };
      request.onerror = () => reject(new Error("動画情報の取得に失敗しました"));
    });
  }
  async updateVideoMemo(compositeId, memo) {
    const database = await this.db.initDB();
    const transaction = database.transaction(["videos"], "readwrite");
    const store = transaction.objectStore("videos");
    return new Promise((resolve, reject) => {
      const request = store.get(compositeId);
      request.onsuccess = () => {
        const existingVideo = request.result;
        if (!existingVideo) {
          reject(new Error("動画が見つかりません"));
          return;
        }
        const updated = { ...existingVideo, memo };
        const updateRequest = store.put(updated);
        updateRequest.onsuccess = () => resolve();
        updateRequest.onerror = () => reject(new Error("データベースの更新に失敗しました"));
      };
      request.onerror = () => reject(new Error("動画情報の取得に失敗しました"));
    });
  }
}

class KeywordService {
  toMessage(value) {
    return value instanceof Error ? value.message : String(value);
  }
  constructor(db) {
    this.db = db;
  }
  // キーワードを追加
  async addKeyword(mylistId, keyword) {
    const isDuplicate = await this.checkDuplicateKeyword(mylistId, keyword);
    if (isDuplicate) {
      throw new Error("このキーワードは既に登録されています");
    }
    const database = await this.db.initDB();
    const transaction = database.transaction(["keywords"], "readwrite");
    const store = transaction.objectStore("keywords");
    return new Promise((resolve, reject) => {
      const request = store.add({
        mylistId,
        keyword,
        addedAt: Date.now()
      });
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(new Error(this.toMessage(request.error)));
    });
  }
  // キーワードを取得
  async getKeywords(mylistId) {
    const database = await this.db.initDB();
    const transaction = database.transaction(["keywords"], "readonly");
    const store = transaction.objectStore("keywords");
    const index = store.index("mylistId");
    return new Promise((resolve, reject) => {
      const request = index.getAll(mylistId);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(new Error(this.toMessage(request.error)));
    });
  }
  // キーワードを削除
  async deleteKeyword(keywordId) {
    const database = await this.db.initDB();
    const transaction = database.transaction(["keywords"], "readwrite");
    const store = transaction.objectStore("keywords");
    return new Promise((resolve, reject) => {
      const request = store.delete(keywordId);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error(this.toMessage(request.error)));
    });
  }
  // キーワードを移動
  async moveKeyword(keywordId, newMylistId) {
    const database = await this.db.initDB();
    const transaction = database.transaction(["keywords"], "readwrite");
    const store = transaction.objectStore("keywords");
    return new Promise((resolve, reject) => {
      const request = store.get(keywordId);
      request.onsuccess = () => {
        const keyword = request.result;
        if (!keyword) {
          reject(new Error("キーワードが見つかりません"));
          return;
        }
        keyword.mylistId = newMylistId;
        const updateRequest = store.put(keyword);
        updateRequest.onsuccess = () => resolve();
        updateRequest.onerror = () => reject(new Error(this.toMessage(request.error)));
      };
      request.onerror = () => reject(new Error(this.toMessage(request.error)));
    });
  }
  // キーワードを編集
  async updateKeyword(keywordId, newKeyword) {
    const database = await this.db.initDB();
    const transaction = database.transaction(["keywords"], "readwrite");
    const store = transaction.objectStore("keywords");
    return new Promise((resolve, reject) => {
      const request = store.get(keywordId);
      request.onsuccess = () => {
        const keyword = request.result;
        if (!keyword) {
          reject(new Error("キーワードが見つかりません"));
          return;
        }
        keyword.keyword = newKeyword;
        const updateRequest = store.put(keyword);
        updateRequest.onsuccess = () => resolve();
        updateRequest.onerror = () => reject(new Error(this.toMessage(request.error)));
      };
      request.onerror = () => reject(new Error(this.toMessage(request.error)));
    });
  }
  // キーワードの重複チェック
  async checkDuplicateKeyword(mylistId, keyword) {
    const database = await this.db.initDB();
    const transaction = database.transaction(["keywords"], "readonly");
    const store = transaction.objectStore("keywords");
    const index = store.index("mylistId");
    return new Promise((resolve, reject) => {
      const request = index.getAll(mylistId);
      request.onsuccess = () => {
        const keywords = request.result;
        const isDuplicate = keywords.some((k) => k.keyword === keyword);
        resolve(isDuplicate);
      };
      request.onerror = () => reject(new Error(this.toMessage(request.error)));
    });
  }
  // キーワードのソート
  sortKeywords(keywords, sortType) {
    const [type, order] = sortType.split("_");
    const isAsc = order === "asc";
    return keywords.sort((a, b) => {
      let comparison = 0;
      switch (type) {
        case "title":
          comparison = a.keyword.localeCompare(b.keyword, "ja");
          break;
        case "addedAt":
          comparison = a.addedAt - b.addedAt;
          break;
        default:
          comparison = a.addedAt - b.addedAt;
      }
      return isAsc ? comparison : -comparison;
    });
  }
}

class ImportExportService {
  toMessage(value) {
    return value instanceof Error ? value.message : String(value);
  }
  constructor(db, apiService) {
    this.db = db;
    this.apiService = apiService;
  }
  async exportData() {
    const database = await this.db.initDB();
    const mylistsTransaction = database.transaction(["mylists"], "readonly");
    const mylistsStore = mylistsTransaction.objectStore("mylists");
    const mylists = await new Promise((resolve, reject) => {
      const request = mylistsStore.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(new Error(this.toMessage(request.error)));
    });
    const videosTransaction = database.transaction(["videos"], "readonly");
    const videosStore = videosTransaction.objectStore("videos");
    const allVideos = await new Promise((resolve, reject) => {
      const request = videosStore.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(new Error(this.toMessage(request.error)));
    });
    const keywordsTransaction = database.transaction(["keywords"], "readonly");
    const keywordsStore = keywordsTransaction.objectStore("keywords");
    const keywords = await new Promise((resolve, reject) => {
      const request = keywordsStore.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(new Error(this.toMessage(request.error)));
    });
    return {
      mylists,
      videos: allVideos,
      keywords
    };
  }
  async importData(data) {
    const database = await this.db.initDB();
    const transaction = database.transaction(["mylists", "videos", "keywords"], "readwrite");
    const mylistStore = transaction.objectStore("mylists");
    const videoStore = transaction.objectStore("videos");
    const keywordStore = transaction.objectStore("keywords");
    return new Promise((resolve, reject) => {
      try {
        data.mylists.forEach((mylist) => {
          mylistStore.add(mylist);
        });
        data.videos.forEach((video) => {
          videoStore.add(video);
          this.apiService.setCacheData(video.originalId, {
            id: video.originalId,
            title: video.title,
            viewCount: video.viewCount,
            commentCount: video.commentCount,
            mylistCount: video.mylistCount,
            thumbnailUrl: video.thumbnailUrl,
            uploadedAt: video.uploadedAt,
            authorName: video.authorName,
            length: video.length
          });
        });
        if (data.keywords) {
          data.keywords.forEach((keyword) => {
            keywordStore.add(keyword);
          });
        }
        transaction.oncomplete = () => {
          resolve();
        };
        transaction.onerror = () => {
          reject(new Error(this.toMessage(transaction.error)));
        };
      } catch (error) {
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    });
  }
  // レガシーデータのインポート処理
  async importLegacyData(jsonText, progressCallback, createMylistFunc, addVideoFunc) {
    try {
      const legacyData = JSON.parse(jsonText);
      const videos = legacyData.filter((item) => item.vid !== "meta");
      this.apiService.resetApiRequestCount();
      if (!createMylistFunc || !addVideoFunc) {
        throw new Error("マイリスト作成関数または動画追加関数が提供されていません");
      }
      const mylistId = await createMylistFunc("インポートされたマイリスト");
      let processed = 0;
      const total = videos.length;
      const batchSize = 5;
      for (let i = 0; i < videos.length; i += batchSize) {
        const batch = videos.slice(i, i + batchSize);
        await Promise.all(
          batch.map(async (video) => {
            try {
              const existingData = {
                title: video.title,
                viewCount: typeof video.view_counter === "string" ? parseInt(video.view_counter) : video.view_counter,
                commentCount: typeof video.comment_num === "string" ? parseInt(video.comment_num) : video.comment_num,
                mylistCount: typeof video.mylist_counter === "string" ? parseInt(video.mylist_counter) : video.mylist_counter,
                thumbnailUrl: video.thumbUrl,
                uploadedAt: video.first_retrieve,
                authorName: video.author
              };
              const videoInfo = await this.apiService.getVideoInfoFromSources(video.vid, existingData);
              await addVideoFunc(mylistId, videoInfo);
            } catch (error) {
              window.logger.warn(`動画「${video.title}」の処理に失敗しました:`, error);
              await addVideoFunc(mylistId, {
                id: video.vid,
                title: video.title || "取得失敗",
                viewCount: typeof video.view_counter === "string" ? parseInt(video.view_counter) : video.view_counter || 0,
                commentCount: typeof video.comment_num === "string" ? parseInt(video.comment_num) : video.comment_num || 0,
                mylistCount: typeof video.mylist_counter === "string" ? parseInt(video.mylist_counter) : video.mylist_counter || 0,
                thumbnailUrl: video.thumbUrl || "",
                uploadedAt: video.first_retrieve || Date.now(),
                authorName: video.author || "不明",
                length: 0
              });
            }
            processed++;
            if (progressCallback) {
              progressCallback(processed, total);
            }
          })
        );
      }
      return mylistId;
    } catch (error) {
      window.logger.error("レガシーデータのインポートに失敗しました:", error);
      throw new Error(`レガシーデータのインポートに失敗しました: ${error instanceof Error ? error.message : "不明なエラー"}`);
    }
  }
}

class SettingsService {
  toMessage(value) {
    return value instanceof Error ? value.message : String(value);
  }
  constructor(db) {
    this.db = db;
  }
  async saveManagerSettings(settings) {
    const database = await this.db.initDB();
    const transaction = database.transaction(["manager"], "readwrite");
    const store = transaction.objectStore("manager");
    return new Promise((resolve, reject) => {
      const safe = {
        mylistSortType: settings.mylistSortType || "name_asc",
        videoSortType: settings.videoSortType || "uploadedAt_desc",
        theme: settings.theme || "dark-blue"
      };
      const request = store.put({ id: "settings", ...safe });
      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error(this.toMessage(request.error)));
    });
  }
  async loadManagerSettings() {
    const database = await this.db.initDB();
    const transaction = database.transaction(["manager"], "readonly");
    const store = transaction.objectStore("manager");
    return new Promise((resolve, reject) => {
      const request = store.get("settings");
      request.onsuccess = () => {
        const result = request.result;
        if (result && typeof result.mylistSortType === "string" && typeof result.videoSortType === "string") {
          const theme = result.theme;
          const safeTheme = typeof theme === "string" ? theme : "dark-blue";
          resolve({ ...result, theme: safeTheme });
          return;
        }
        resolve({ mylistSortType: "name_asc", videoSortType: "uploadedAt_desc", theme: "dark-blue" });
      };
      request.onerror = () => reject(new Error(this.toMessage(request.error)));
    });
  }
}

class DatabaseManagementService {
  // 24時間
  constructor(db) {
    this.healthCheckInterval = 24 * 60 * 60 * 1e3;
    this.db = db;
  }
  // データベース初期化と永続化昇格
  async initializeDatabase() {
    try {
      const result = await this.db.initializeWithHealthCheck();
      window.logger?.info("Database initialized successfully", {
        health: result.health,
        persistence: result.persistence
      });
      return {
        success: true,
        health: result.health,
        persistence: result.persistence
      };
    } catch (error) {
      window.logger?.error("Database initialization failed:", error);
      return {
        success: false,
        health: {
          isHealthy: false,
          issues: [`Initialization failed: ${error instanceof Error ? error.message : String(error)}`],
          storageEstimate: null,
          persistence: false
        },
        persistence: false,
        error: error?.toString()
      };
    }
  }
  // 手動ヘルスチェック
  async performHealthCheck() {
    try {
      const health = await this.db.performHealthCheck();
      if (!health.isHealthy) {
        window.logger?.warn("Database health check failed:", health.issues);
      } else {
        window.logger?.info("Database health check passed");
      }
      return health;
    } catch (error) {
      window.logger?.error("Health check failed:", error);
      return {
        isHealthy: false,
        issues: [`Health check failed: ${error instanceof Error ? error.message : String(error)}`],
        storageEstimate: null,
        persistence: false
      };
    }
  }
  // 自動ヘルスチェック開始
  startAutoHealthCheck() {
    if (this.healthCheckIntervalId) {
      clearInterval(this.healthCheckIntervalId);
    }
    this.healthCheckIntervalId = window.setInterval(async () => {
      try {
        const health = await this.performHealthCheck();
        if (!health.isHealthy) {
          this.notifyHealthIssues(health);
        }
      } catch (error) {
        window.logger?.error("Auto health check failed:", error);
      }
    }, this.healthCheckInterval);
    window.logger?.info("Auto health check started");
  }
  // 自動ヘルスチェック停止
  stopAutoHealthCheck() {
    if (this.healthCheckIntervalId) {
      clearInterval(this.healthCheckIntervalId);
      this.healthCheckIntervalId = void 0;
      window.logger?.info("Auto health check stopped");
    }
  }
  // バックアップ作成
  async createBackup() {
    try {
      const backupData = await this.db.createBackup();
      window.logger?.info("Database backup created successfully");
      return {
        success: true,
        backupData
      };
    } catch (error) {
      window.logger?.error("Database backup failed:", error);
      return {
        success: false,
        error: error?.toString()
      };
    }
  }
  // バックアップからの復元
  async restoreFromBackup(backupData) {
    try {
      await this.db.restoreFromBackup(backupData);
      window.logger?.info("Database restored from backup successfully");
      return {
        success: true
      };
    } catch (error) {
      window.logger?.error("Database restore failed:", error);
      return {
        success: false,
        error: error?.toString()
      };
    }
  }
  // 永続化状態の確認
  async getPersistenceStatus() {
    try {
      const storageEstimate = await this.db.getStorageEstimate();
      let isPersistent = false;
      let canRequestPersistence = false;
      if ("storage" in navigator) {
        if ("persisted" in navigator.storage) {
          isPersistent = await navigator.storage.persisted();
        }
        if ("persist" in navigator.storage) {
          canRequestPersistence = true;
        }
      }
      return {
        isPersistent,
        canRequestPersistence,
        storageEstimate
      };
    } catch (error) {
      window.logger?.error("Failed to get persistence status:", error);
      return {
        isPersistent: false,
        canRequestPersistence: false,
        storageEstimate: null
      };
    }
  }
  // 永続化要求
  async requestPersistence() {
    try {
      const isPersistent = await this.db.requestPersistence();
      return {
        success: true,
        isPersistent
      };
    } catch (error) {
      window.logger?.error("Failed to request persistence:", error);
      return {
        success: false,
        isPersistent: false,
        error: error?.toString()
      };
    }
  }
  // マイグレーション進捗監視
  setMigrationProgressCallback(callback) {
    this.db.setProgressCallback(callback);
  }
  // ストレージ使用量の監視
  async monitorStorageUsage() {
    try {
      const estimate = await this.db.getStorageEstimate();
      if (estimate?.usage !== void 0 && estimate?.quota !== void 0) {
        const usage = estimate.usage;
        const quota = estimate.quota;
        const percentage = usage / quota * 100;
        const isNearLimit = percentage > 80;
        return {
          usage,
          quota,
          percentage,
          isNearLimit
        };
      }
      return {
        usage: 0,
        quota: 0,
        percentage: 0,
        isNearLimit: false
      };
    } catch (error) {
      window.logger?.error("Failed to monitor storage usage:", error);
      return {
        usage: 0,
        quota: 0,
        percentage: 0,
        isNearLimit: false
      };
    }
  }
  // 健全性問題の通知
  notifyHealthIssues(health) {
    const issues = health.issues.map((i) => String(i)).join(", ");
    if (typeof window !== "undefined" && window.Mylist2ManagerUI?.showNotification) {
      const windowWithUI = window;
      windowWithUI.Mylist2ManagerUI.showNotification(
        `データベース健全性の問題が検出されました: ${issues}`,
        "warning"
      );
    }
    window.logger?.warn("Database health issues detected:", health.issues);
  }
  // 自動バックアップ機能
  async scheduleAutoBackup(intervalHours = 24) {
    await Promise.resolve();
    const intervalMs = intervalHours * 60 * 60 * 1e3;
    setInterval(() => {
      try {
        void this.createBackup().then((result) => {
          if (result.success && result.backupData) {
            localStorage.setItem("mylist2_auto_backup", result.backupData);
            localStorage.setItem("mylist2_auto_backup_timestamp", (/* @__PURE__ */ new Date()).toISOString());
            window.logger?.info("Auto backup completed");
          } else {
            window.logger?.error("Auto backup failed:", result.error);
          }
        }).catch((error) => {
          window.logger?.error("Auto backup error:", error);
        });
      } catch (error) {
        window.logger?.error("Auto backup error:", error);
      }
    }, intervalMs);
    window.logger?.info(`Auto backup scheduled every ${intervalHours} hours`);
  }
  // 自動バックアップの復元
  async restoreAutoBackup() {
    try {
      const backupData = localStorage.getItem("mylist2_auto_backup");
      const backupTimestamp = localStorage.getItem("mylist2_auto_backup_timestamp");
      if (!backupData) {
        return {
          success: false,
          error: "No auto backup found"
        };
      }
      const result = await this.restoreFromBackup(backupData);
      if (result.success) {
        return {
          success: true,
          backupDate: backupTimestamp ? new Date(backupTimestamp) : void 0
        };
      } else {
        return {
          success: false,
          error: result.error
        };
      }
    } catch (error) {
      window.logger?.error("Failed to restore auto backup:", error);
      return {
        success: false,
        error: error?.toString()
      };
    }
  }
  // サービス終了時のクリーンアップ
  destroy() {
    this.stopAutoHealthCheck();
  }
  // すべてのデータをクリア（UIからの明示操作用）
  async clearAllData(options) {
    try {
      await this.db.clearAllData(options?.includeSettings === true);
      return { success: true };
    } catch (error) {
      window.logger?.error("Failed to clear all data:", error);
      return { success: false, error: error?.toString?.() ?? String(error) };
    }
  }
}

class GoogleDriveService {
  constructor(clientIdFromConfig) {
    this.accessToken = null;
    this.accessTokenExpireAt = 0;
    this.clientId = null;
    this.scope = "https://www.googleapis.com/auth/drive.file";
    this.backupFolderName = "Mylist2 Backups";
    this.defaultClientId = "757779940916-u31ia8oafa998j6qqavdpqjjn988it8b.apps.googleusercontent.com";
    this.clientId = clientIdFromConfig || localStorage.getItem("mylist2_google_client_id") || this.defaultClientId;
  }
  // fflate ローダ（npm優先 → CDNフォールバック）
  async loadFflate() {
    try {
      const m = await Promise.resolve().then(() => browser);
      return m;
    } catch {
      const cdnUrl = "https://cdn.jsdelivr.net/npm/fflate@0.8.2/esm/index.js";
      const mod = await import(
        /* @vite-ignore */
        cdnUrl
      );
      return mod;
    }
  }
  setClientId(clientId) {
    this.clientId = clientId;
    localStorage.setItem("mylist2_google_client_id", clientId);
  }
  async ensureGisLoaded() {
    await Promise.resolve();
    const win = window;
    if (win.google && win.google.accounts && win.google.accounts.oauth2) return;
    await new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Failed to load Google Identity Services"));
      document.head.appendChild(script);
    });
  }
  isTokenValid() {
    return !!this.accessToken && Date.now() < this.accessTokenExpireAt - 5e3;
  }
  async ensureAccessToken() {
    if (this.isTokenValid()) return this.accessToken;
    if (!this.clientId) {
      const input = window.prompt("Google OAuth クライアントIDを入力してください (例: xxxxx.apps.googleusercontent.com)", "");
      if (!input) throw new Error("Google クライアントIDが設定されていません");
      this.setClientId(input);
    }
    await this.ensureGisLoaded();
    const token = await new Promise((resolve, reject) => {
      try {
        const win = window;
        const tokenClient = win.google.accounts.oauth2.initTokenClient({
          client_id: this.clientId,
          scope: this.scope,
          callback: (resp) => {
            if (resp && resp.access_token) {
              this.accessToken = resp.access_token;
              const expiresInSec = typeof resp.expires_in === "number" ? resp.expires_in : 3600;
              this.accessTokenExpireAt = Date.now() + expiresInSec * 1e3;
              resolve(resp.access_token);
            } else {
              reject(new Error(resp?.error || "Failed to obtain access token"));
            }
          }
        });
        tokenClient.requestAccessToken({ prompt: "consent" });
      } catch (e) {
        reject(e instanceof Error ? e : new Error(String(e)));
      }
    });
    return token;
  }
  async fetchDrive(url, init) {
    const token = await this.ensureAccessToken();
    const resp = await fetch(url, {
      ...init,
      headers: {
        ...init.headers || {},
        Authorization: `Bearer ${token}`
      }
    });
    if (!resp.ok) {
      const text = await resp.text().catch(() => "");
      throw new Error(`Drive API Error: ${resp.status} ${resp.statusText} ${text}`);
    }
    const contentType = resp.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      return await resp.json();
    }
    return await resp.text();
  }
  async ensureBackupFolder() {
    const q = encodeURIComponent(
      `name = '${this.backupFolderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`
    );
    const found = await this.fetchDrive(
      `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name)`,
      { method: "GET" }
    );
    const existing = Array.isArray(found.files) ? found.files : [];
    if (existing.length > 0) return existing[0].id;
    const meta = { name: this.backupFolderName, mimeType: "application/vnd.google-apps.folder" };
    const created = await this.fetchDrive(
      "https://www.googleapis.com/drive/v3/files",
      {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=UTF-8" },
        body: JSON.stringify(meta)
      }
    );
    return created.id;
  }
  async createZipBlob(fileName, jsonText) {
    const { zipSync, strToU8 } = await this.loadFflate();
    const zipped = zipSync({ [fileName]: strToU8(jsonText) }, { level: 6 });
    const ab = new ArrayBuffer(zipped.byteLength);
    new Uint8Array(ab).set(zipped);
    return new Blob([ab], { type: "application/zip" });
  }
  buildMultipartBody(metadata, fileBlob, boundary) {
    const encoder = new TextEncoder();
    const metaStr = JSON.stringify(metadata);
    const part1 = encoder.encode(
      `--${boundary}\r
Content-Type: application/json; charset=UTF-8\r
\r
${metaStr}\r
`
    );
    const part2Header = encoder.encode(
      `--${boundary}\r
Content-Type: application/zip\r
\r
`
    );
    const part3 = encoder.encode(`\r
--${boundary}--`);
    return new Response(new Blob([part1, part2Header, fileBlob, part3])).blob();
  }
  async uploadBackupZip(baseFileName, backupJson) {
    try {
      const folderId = await this.ensureBackupFolder();
      const zipFileName = `${baseFileName}.zip`;
      const zipBlob = await this.createZipBlob(`${baseFileName}.json`, backupJson);
      const metadata = { name: zipFileName, parents: [folderId] };
      const boundary = `mylist2_${Math.random().toString(36).slice(2)}`;
      const bodyBlob = await this.buildMultipartBody(metadata, zipBlob, boundary);
      const result = await this.fetchDrive(
        "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart",
        {
          method: "POST",
          headers: { "Content-Type": `multipart/related; boundary=${boundary}` },
          body: bodyBlob
        }
      );
      return { success: true, fileId: result.id };
    } catch (error) {
      window.logger?.error("Google Drive upload failed:", error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }
  // バックアップ一覧取得（ZIPのみ）
  async listBackups() {
    const folderId = await this.ensureBackupFolder();
    const q = encodeURIComponent(`'${folderId}' in parents and trashed = false`);
    const res = await this.fetchDrive(
      `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,modifiedTime,size)`,
      { method: "GET" }
    );
    const files = Array.isArray(res.files) ? res.files : [];
    return files.filter((f) => /.zip$/.test(f.name) && /^Mylist2_/.test(f.name)).sort((a, b) => (b.modifiedTime || "").localeCompare(a.modifiedTime || ""));
  }
  // ZIPをダウンロードしてJSON文字列を取り出す
  async downloadBackupJson(fileId) {
    const token = await this.ensureAccessToken();
    const resp = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!resp.ok) {
      const text = await resp.text().catch(() => "");
      throw new Error(`Download failed: ${resp.status} ${resp.statusText} ${text}`);
    }
    const buf = new Uint8Array(await resp.arrayBuffer());
    const { unzipSync, strFromU8 } = await this.loadFflate();
    const files = unzipSync(buf);
    const jsonEntryName = Object.keys(files).find((n) => /.json$/.test(n));
    if (!jsonEntryName) throw new Error("ZIP内にJSONファイルが見つかりません");
    return strFromU8(files[jsonEntryName]);
  }
}

class DropboxService {
  // Dropbox はルート起点のパス
  constructor(tokenFromConfig) {
    this.accessToken = null;
    this.backupFolderPath = "/Mylist2 Backups";
    this.accessToken = tokenFromConfig || localStorage.getItem("mylist2_dropbox_token");
  }
  setAccessToken(token) {
    this.accessToken = token;
    localStorage.setItem("mylist2_dropbox_token", token);
  }
  ensureAccessToken() {
    if (this.accessToken) return Promise.resolve(this.accessToken);
    const input = window.prompt(
      "Dropbox のアクセストークンを入力してください (files.content.read/write 権限)",
      ""
    );
    if (!input) throw new Error("Dropbox アクセストークンが設定されていません");
    this.setAccessToken(input);
    return Promise.resolve(input);
  }
  // fflate ローダ（npm優先 → CDNフォールバック）
  async loadFflate() {
    try {
      const m = await Promise.resolve().then(() => browser);
      return m;
    } catch {
      const cdnUrl = "https://cdn.jsdelivr.net/npm/fflate@0.8.2/esm/index.js";
      const mod = await import(
        /* @vite-ignore */
        cdnUrl
      );
      return mod;
    }
  }
  async createZipBlob(fileName, jsonText) {
    const { zipSync, strToU8 } = await this.loadFflate();
    const zipped = zipSync({ [fileName]: strToU8(jsonText) }, { level: 6 });
    const ab = new ArrayBuffer(zipped.byteLength);
    new Uint8Array(ab).set(zipped);
    return new Blob([ab], { type: "application/zip" });
  }
  async ensureBackupFolder() {
    const token = await this.ensureAccessToken();
    const res = await fetch("https://api.dropboxapi.com/2/files/get_metadata", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ path: this.backupFolderPath, include_deleted: false })
    });
    if (res.ok) return;
    const create = await fetch("https://api.dropboxapi.com/2/files/create_folder_v2", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ path: this.backupFolderPath, autorename: false })
    });
    if (!create.ok) {
      const text = await create.text().catch(() => "");
      throw new Error(`Dropbox フォルダ作成に失敗: ${create.status} ${create.statusText} ${text}`);
    }
  }
  async uploadBackupZip(baseFileName, backupJson) {
    try {
      await this.ensureBackupFolder();
      const token = await this.ensureAccessToken();
      const zipName = `${baseFileName}.zip`;
      const zipBlob = await this.createZipBlob(`${baseFileName}.json`, backupJson);
      const path = `${this.backupFolderPath}/${zipName}`;
      const upload = await fetch("https://content.dropboxapi.com/2/files/upload", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/octet-stream",
          "Dropbox-API-Arg": JSON.stringify({ path, mode: { ".tag": "add" }, mute: true, strict_conflict: false })
        },
        body: zipBlob
      });
      if (!upload.ok) {
        const text = await upload.text().catch(() => "");
        throw new Error(`Dropbox アップロード失敗: ${upload.status} ${upload.statusText} ${text}`);
      }
      return { success: true, path };
    } catch (e) {
      window.logger?.error("Dropbox upload failed:", e);
      return { success: false, error: e instanceof Error ? e.message : String(e) };
    }
  }
  async listBackups() {
    const token = await this.ensureAccessToken();
    await this.ensureBackupFolder();
    const list = await fetch("https://api.dropboxapi.com/2/files/list_folder", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ path: this.backupFolderPath, recursive: false, include_deleted: false })
    });
    if (!list.ok) {
      const text = await list.text().catch(() => "");
      throw new Error(`Dropbox 一覧取得失敗: ${list.status} ${list.statusText} ${text}`);
    }
    const json = await list.json();
    const items = (json.entries || []).filter((e) => e[".tag"] === "file" && /\.zip$/.test(e.name) && /^Mylist2_/.test(e.name));
    return items.map((f) => ({ id: `${this.backupFolderPath}/${f.name}`, name: f.name, modifiedTime: f.server_modified || f.client_modified, size: typeof f.size === "number" ? String(f.size) : void 0 })).sort((a, b) => (b.modifiedTime || "").localeCompare(a.modifiedTime || ""));
  }
  async downloadBackupJson(filePath) {
    const token = await this.ensureAccessToken();
    const resp = await fetch("https://content.dropboxapi.com/2/files/download", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Dropbox-API-Arg": JSON.stringify({ path: filePath })
      }
    });
    if (!resp.ok) {
      const text = await resp.text().catch(() => "");
      throw new Error(`Dropbox ダウンロード失敗: ${resp.status} ${resp.statusText} ${text}`);
    }
    const buf = new Uint8Array(await resp.arrayBuffer());
    const { unzipSync, strFromU8 } = await this.loadFflate();
    const files = unzipSync(buf);
    const jsonEntryName = Object.keys(files).find((n) => /\.json$/.test(n));
    if (!jsonEntryName) throw new Error("ZIP内にJSONファイルが見つかりません");
    return strFromU8(files[jsonEntryName]);
  }
}

class OneDriveService {
  constructor(tokenFromConfig) {
    this.accessToken = null;
    this.backupFolderName = "Mylist2 Backups";
    this.accessToken = tokenFromConfig || localStorage.getItem("mylist2_onedrive_token");
  }
  setAccessToken(token) {
    this.accessToken = token;
    localStorage.setItem("mylist2_onedrive_token", token);
  }
  ensureAccessToken() {
    if (this.accessToken) return Promise.resolve(this.accessToken);
    const input = window.prompt(
      "OneDrive (Microsoft Graph) のアクセストークンを入力してください (Files.ReadWrite)",
      ""
    );
    if (!input) throw new Error("OneDrive アクセストークンが設定されていません");
    this.setAccessToken(input);
    return Promise.resolve(input);
  }
  // fflate ローダ（npm優先 → CDNフォールバック）
  async loadFflate() {
    try {
      const m = await Promise.resolve().then(() => browser);
      return m;
    } catch {
      const cdnUrl = "https://cdn.jsdelivr.net/npm/fflate@0.8.2/esm/index.js";
      const mod = await import(
        /* @vite-ignore */
        cdnUrl
      );
      return mod;
    }
  }
  async createZipBlob(fileName, jsonText) {
    const { zipSync, strToU8 } = await this.loadFflate();
    const zipped = zipSync({ [fileName]: strToU8(jsonText) }, { level: 6 });
    const ab = new ArrayBuffer(zipped.byteLength);
    new Uint8Array(ab).set(zipped);
    return new Blob([ab], { type: "application/zip" });
  }
  async ensureBackupFolder() {
    const token = await this.ensureAccessToken();
    const q = new URL("https://graph.microsoft.com/v1.0/me/drive/root/children");
    q.searchParams.set("$select", "id,name,folder");
    const res = await fetch(q.toString(), {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`OneDrive フォルダ一覧取得失敗: ${res.status} ${res.statusText} ${text}`);
    }
    const json = await res.json();
    const existing = (json.value || []).find((e) => e.folder && e.name === this.backupFolderName);
    if (existing) return existing.id;
    const create = await fetch("https://graph.microsoft.com/v1.0/me/drive/root/children", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ name: this.backupFolderName, folder: {}, "@microsoft.graph.conflictBehavior": "fail" })
    });
    if (!create.ok) {
      const text = await create.text().catch(() => "");
      throw new Error(`OneDrive フォルダ作成失敗: ${create.status} ${create.statusText} ${text}`);
    }
    const c = await create.json();
    return c.id;
  }
  async uploadBackupZip(baseFileName, backupJson) {
    try {
      const folderId = await this.ensureBackupFolder();
      const token = await this.ensureAccessToken();
      const zipName = `${baseFileName}.zip`;
      const zipBlob = await this.createZipBlob(`${baseFileName}.json`, backupJson);
      const put = await fetch(`https://graph.microsoft.com/v1.0/me/drive/items/${encodeURIComponent(folderId)}:/${encodeURIComponent(zipName)}:/content`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
        body: zipBlob
      });
      if (!put.ok) {
        const text = await put.text().catch(() => "");
        throw new Error(`OneDrive アップロード失敗: ${put.status} ${put.statusText} ${text}`);
      }
      const meta = await put.json();
      return { success: true, fileId: meta.id };
    } catch (e) {
      window.logger?.error("OneDrive upload failed:", e);
      return { success: false, error: e instanceof Error ? e.message : String(e) };
    }
  }
  async listBackups() {
    const token = await this.ensureAccessToken();
    const folderId = await this.ensureBackupFolder();
    const res = await fetch(`https://graph.microsoft.com/v1.0/me/drive/items/${encodeURIComponent(folderId)}/children?$select=id,name,size,lastModifiedDateTime`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`OneDrive 一覧取得失敗: ${res.status} ${res.statusText} ${text}`);
    }
    const json = await res.json();
    const files = (json.value || []).filter((f) => /\.zip$/.test(f.name) && /^Mylist2_/.test(f.name));
    return files.map((f) => ({ id: f.id, name: f.name, modifiedTime: f.lastModifiedDateTime, size: typeof f.size === "number" ? String(f.size) : void 0 })).sort((a, b) => (b.modifiedTime || "").localeCompare(a.modifiedTime || ""));
  }
  async downloadBackupJson(fileId) {
    const token = await this.ensureAccessToken();
    const resp = await fetch(`https://graph.microsoft.com/v1.0/me/drive/items/${encodeURIComponent(fileId)}/content`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
      redirect: "follow"
    });
    if (!resp.ok) {
      const text = await resp.text().catch(() => "");
      throw new Error(`OneDrive ダウンロード失敗: ${resp.status} ${resp.statusText} ${text}`);
    }
    const buf = new Uint8Array(await resp.arrayBuffer());
    const { unzipSync, strFromU8 } = await this.loadFflate();
    const files = unzipSync(buf);
    const jsonEntryName = Object.keys(files).find((n) => /\.json$/.test(n));
    if (!jsonEntryName) throw new Error("ZIP内にJSONファイルが見つかりません");
    return strFromU8(files[jsonEntryName]);
  }
}

class MegaService {
  constructor() {
    // 将来的にアクセストークン/セッション情報などを保持
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.session = null;
  }
  // 現段階では未対応（プレースホルダ）。実装時にセッション設定を行う。
  setSession(session) {
    this.session = session;
    localStorage.setItem("mylist2_mega_session", JSON.stringify(session));
  }
  unsupported() {
    throw new Error(
      "MEGA 連携はブラウザのみ・バックエンド無し環境では追加実装が必要です。設定画面で 'Dropbox' または 'OneDrive' をご利用ください。"
    );
  }
  // API 互換: GoogleDrive/Dropbox/OneDrive と同じメソッド群
  uploadBackupZip(_baseFileName, _backupJson) {
    try {
      this.unsupported();
    } catch (e) {
      return Promise.resolve({ success: false, error: e instanceof Error ? e.message : String(e) });
    }
  }
  listBackups() {
    return Promise.reject(this.createUnsupportedError());
  }
  downloadBackupJson(_fileId) {
    return Promise.reject(this.createUnsupportedError());
  }
  createUnsupportedError() {
    return new Error(
      "MEGA 連携は未実装です。Dropbox / OneDrive / Google Drive をご利用ください。"
    );
  }
}

class Mylist2Manager {
  constructor() {
    this.db = new Mylist2DB();
    this.apiService = new ApiService();
    this.mylistService = new MylistService(this.db);
    this.videoService = new VideoService(this.db);
    this.keywordService = new KeywordService(this.db);
    this.importExportService = new ImportExportService(this.db, this.apiService);
    this.settingsService = new SettingsService(this.db);
    this.databaseManagementService = new DatabaseManagementService(this.db);
    this.googleDriveService = new GoogleDriveService();
    this.dropboxService = new DropboxService();
    this.oneDriveService = new OneDriveService();
    this.megaService = new MegaService();
  }
  // データベースへのアクセスを提供するpublicメソッド
  async getDB() {
    return this.db.initDB();
  }
  // マイリスト関連のメソッド
  async createMylist(name) {
    return this.mylistService.createMylist(name);
  }
  async getAllMylists() {
    return this.mylistService.getAllMylists();
  }
  async sortMylists(sortType) {
    return this.mylistService.sortMylists(sortType, (mylistId) => this.getVideos(mylistId));
  }
  async updateMylistName(mylistId, newName) {
    return this.mylistService.updateMylistName(mylistId, newName);
  }
  async deleteMylist(mylistId) {
    return this.mylistService.deleteMylist(mylistId);
  }
  // 動画関連のメソッド
  async addVideo(mylistId, videoInfo) {
    return this.videoService.addVideo(mylistId, videoInfo);
  }
  async getVideos(mylistId) {
    return this.videoService.getVideos(mylistId);
  }
  sortVideos(videos, sortType) {
    return this.videoService.sortVideos(videos, sortType);
  }
  async deleteVideo(compositeId) {
    return this.videoService.deleteVideo(compositeId);
  }
  async updateVideoInfo(compositeId, newInfo) {
    return this.videoService.updateVideoInfo(compositeId, newInfo);
  }
  async updateVideoMemo(compositeId, memo) {
    return this.videoService.updateVideoMemo(compositeId, memo);
  }
  // キーワード関連のメソッド
  async addKeyword(mylistId, keyword) {
    return this.keywordService.addKeyword(mylistId, keyword);
  }
  async getKeywords(mylistId) {
    return this.keywordService.getKeywords(mylistId);
  }
  async deleteKeyword(keywordId) {
    return this.keywordService.deleteKeyword(keywordId);
  }
  async moveKeyword(keywordId, newMylistId) {
    return this.keywordService.moveKeyword(keywordId, newMylistId);
  }
  async updateKeyword(keywordId, newKeyword) {
    return this.keywordService.updateKeyword(keywordId, newKeyword);
  }
  // API関連のメソッド
  async fetchVideoInfo(videoId) {
    return this.apiService.fetchVideoInfo(videoId);
  }
  extractVideoId(input) {
    return this.apiService.extractVideoId(input);
  }
  // インポート・エクスポート関連のメソッド  
  async exportData() {
    return this.importExportService.exportData();
  }
  async importData(data) {
    return this.importExportService.importData(data);
  }
  async importLegacyData(jsonText, progressCallback) {
    return this.importExportService.importLegacyData(
      jsonText,
      progressCallback,
      (name) => this.createMylist(name),
      (mylistId, videoInfo) => this.addVideo(mylistId, videoInfo)
    );
  }
  // 設定関連のメソッド
  async saveManagerSettings(settings) {
    return this.settingsService.saveManagerSettings(settings);
  }
  async loadManagerSettings() {
    return this.settingsService.loadManagerSettings();
  }
  // データベース管理関連のメソッド
  async initializeDatabaseWithHealthCheck() {
    return this.databaseManagementService.initializeDatabase();
  }
  async performDatabaseHealthCheck() {
    return this.databaseManagementService.performHealthCheck();
  }
  async createDatabaseBackup() {
    return this.databaseManagementService.createBackup();
  }
  async restoreDatabaseFromBackup(backupData) {
    return this.databaseManagementService.restoreFromBackup(backupData);
  }
  async getDatabasePersistenceStatus() {
    return this.databaseManagementService.getPersistenceStatus();
  }
  async requestDatabasePersistence() {
    return this.databaseManagementService.requestPersistence();
  }
  async monitorDatabaseStorageUsage() {
    return this.databaseManagementService.monitorStorageUsage();
  }
  setDatabaseMigrationProgressCallback(callback) {
    this.databaseManagementService.setMigrationProgressCallback(callback);
  }
  startAutoDatabaseHealthCheck() {
    this.databaseManagementService.startAutoHealthCheck();
  }
  stopAutoDatabaseHealthCheck() {
    this.databaseManagementService.stopAutoHealthCheck();
  }
  async scheduleAutoDatabaseBackup(intervalHours = 24) {
    return this.databaseManagementService.scheduleAutoBackup(intervalHours);
  }
  async restoreAutoDatabaseBackup() {
    return this.databaseManagementService.restoreAutoBackup();
  }
  // サービス終了時のクリーンアップ
  destroy() {
    this.databaseManagementService.destroy();
  }
  // データの全消去（設定含むかを選択可能）
  async clearAllData(includeSettings = false) {
    return this.databaseManagementService.clearAllData({ includeSettings });
  }
  // Google Drive アップロード (zip圧縮)
  async uploadBackupToGoogleDrive(baseFileName) {
    try {
      const backup = await this.createDatabaseBackup();
      if (!backup.success || !backup.backupData) return { success: false, error: backup.error || "バックアップ作成に失敗しました" };
      return await this.googleDriveService.uploadBackupZip(baseFileName, backup.backupData);
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }
  setGoogleClientId(clientId) {
    this.googleDriveService.setClientId(clientId);
  }
  // Google Drive 上のバックアップ一覧
  async listGoogleDriveBackups() {
    return this.googleDriveService.listBackups();
  }
  // Google Drive からバックアップをダウンロードして復元
  async restoreFromGoogleDriveBackup(fileId) {
    try {
      const jsonText = await this.googleDriveService.downloadBackupJson(fileId);
      const res = await this.restoreDatabaseFromBackup(jsonText);
      return res;
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }
  // 汎用クラウド: プロバイダ選択版
  async uploadBackupToCloud(provider, baseFileName) {
    try {
      const backup = await this.createDatabaseBackup();
      if (!backup.success || !backup.backupData) return { success: false, error: backup.error || "バックアップ作成に失敗しました" };
      if (provider === "gdrive") {
        const r = await this.googleDriveService.uploadBackupZip(baseFileName, backup.backupData);
        return r.success ? { success: true, id: r.fileId } : { success: false, error: r.error };
      }
      if (provider === "dropbox") {
        const r = await this.dropboxService.uploadBackupZip(baseFileName, backup.backupData);
        return r.success ? { success: true, id: r.path } : { success: false, error: r.error };
      }
      if (provider === "onedrive") {
        const r = await this.oneDriveService.uploadBackupZip(baseFileName, backup.backupData);
        return r.success ? { success: true, id: r.fileId } : { success: false, error: r.error };
      }
      if (provider === "mega") {
        const r = await this.megaService.uploadBackupZip(baseFileName, backup.backupData);
        return r.success ? { success: true, id: r.fileId } : { success: false, error: r.error };
      }
      return { success: false, error: "未知のプロバイダ" };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }
  async listCloudBackups(provider) {
    if (provider === "gdrive") return this.googleDriveService.listBackups();
    if (provider === "dropbox") return this.dropboxService.listBackups();
    if (provider === "onedrive") return this.oneDriveService.listBackups();
    if (provider === "mega") return this.megaService.listBackups();
    return [];
  }
  async restoreFromCloudBackup(provider, id) {
    try {
      let jsonText = "";
      if (provider === "gdrive") jsonText = await this.googleDriveService.downloadBackupJson(id);
      else if (provider === "dropbox") jsonText = await this.dropboxService.downloadBackupJson(id);
      else if (provider === "onedrive") jsonText = await this.oneDriveService.downloadBackupJson(id);
      else if (provider === "mega") jsonText = await this.megaService.downloadBackupJson(id);
      const res = await this.restoreDatabaseFromBackup(jsonText);
      return res;
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }
}

async function showMylistSelector() {
  const manager = new Mylist2Manager();
  const existingModal = document.getElementById("mylistSelectorModal");
  if (existingModal) {
    existingModal.remove();
  }
  const selectorHTML = `
    <div id="mylistSelectorModal" class="mylist-selector-modal">
        <div class="mylist-selector-content">
            <h3 style="margin-top: 0;">マイリストを選択</h3>
            <input type="text" id="selectorSearchInput" class="mylist-search-input" placeholder="マイリストを検索...">
            <div id="mylistList"></div>
            <div class="mylist-controls">
                <input type="text" id="newMylistName" placeholder="新規マイリスト名">
                <button id="createNewMylist">新規作成</button>
            </div>
            <button id="closeMylistSelector">閉じる</button>
        </div>
    </div>
  `;
  const selectorStyles = `
    .mylist-selector-modal {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      backdrop-filter: blur(5px);
    }

    .mylist-selector-content {
      background: linear-gradient(135deg, rgba(20, 20, 30, 0.98), rgba(30, 30, 45, 0.98));
      border-radius: 16px;
      padding: 24px;
      min-width: 400px;
      max-width: 500px;
      max-height: 80vh;
      overflow-y: auto;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: #ffffff;
    }

    .mylist-search-input {
      width: 100%;
      padding: 12px;
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 8px;
      background: rgba(255, 255, 255, 0.1);
      color: #ffffff;
      margin-bottom: 16px;
      box-sizing: border-box;
    }

    .mylist-search-input::placeholder {
      color: rgba(255, 255, 255, 0.6);
    }

    #mylistList {
      max-height: 300px;
      overflow-y: auto;
      margin-bottom: 16px;
    }

    .mylist-item {
      padding: 12px;
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      margin-bottom: 8px;
      cursor: pointer;
      transition: all 0.2s ease;
      background: rgba(255, 255, 255, 0.05);
    }

    .mylist-item:hover {
      background: rgba(255, 255, 255, 0.15);
      border-color: rgba(100, 150, 255, 0.5);
      transform: translateY(-1px);
    }

    .mylist-item.suggested {
      border-color: rgba(255, 193, 7, 0.6);
      background: rgba(255, 193, 7, 0.1);
    }

    .mylist-item.hidden {
      display: none;
    }

    .suggested-mylists h4 {
      color: #ffc107;
      margin: 0 0 12px 0;
      font-size: 14px;
    }

    .match-info {
      font-size: 12px;
      color: rgba(255, 255, 255, 0.7);
      margin-top: 4px;
    }

    .mylist-controls {
      display: flex;
      gap: 8px;
      margin-bottom: 16px;
    }

    .mylist-controls input {
      flex: 1;
      padding: 10px;
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 8px;
      background: rgba(255, 255, 255, 0.1);
      color: #ffffff;
    }

    .mylist-controls button, #closeMylistSelector {
      padding: 10px 16px;
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 8px;
      background: rgba(100, 150, 255, 0.2);
      color: #ffffff;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .mylist-controls button:hover, #closeMylistSelector:hover {
      background: rgba(100, 150, 255, 0.4);
      border-color: rgba(100, 150, 255, 0.6);
    }
  `;
  const styleElement = document.createElement("style");
  styleElement.textContent = selectorStyles;
  document.head.appendChild(styleElement);
  document.body.insertAdjacentHTML("beforeend", selectorHTML);
  const modal = document.getElementById("mylistSelectorModal");
  const mylistList = document.getElementById("mylistList");
  const newMylistName = document.getElementById("newMylistName");
  const createNewMylist = document.getElementById("createNewMylist");
  const closeButton = document.getElementById("closeMylistSelector");
  const searchInput = document.getElementById("selectorSearchInput");
  return new Promise((resolve, reject) => {
    async function displayMylists() {
      const db = await manager.getDB();
      const transaction = db.transaction(["mylists"], "readonly");
      const store = transaction.objectStore("mylists");
      const request = store.getAll();
      request.onsuccess = () => {
        const mylists = request.result;
        const isWatchPage = location.pathname.startsWith("/watch/");
        let suggestedMylists = [];
        const matchDetails = /* @__PURE__ */ new Map();
        if (isWatchPage) {
          const tags = Array.from(document.querySelectorAll('a[data-anchor-page="watch"][data-anchor-area="tags"][href*="/tag/"]')).map((tag) => normalizeText(tag.textContent?.trim() || ""));
          suggestedMylists = mylists.filter((mylist) => {
            const mylistNameNormalized = normalizeText(mylist.name);
            const matchedTags = tags.filter((tag) => {
              const shorter = tag.length < mylistNameNormalized.length ? tag : mylistNameNormalized;
              const longer = tag.length < mylistNameNormalized.length ? mylistNameNormalized : tag;
              const words = shorter.split(/[\s ]/);
              return words.some(
                (word) => word.length >= 2 && longer.includes(word)
              );
            });
            if (matchedTags.length > 0) {
              matchDetails.set(mylist.id, matchedTags);
              return true;
            }
            return false;
          });
        }
        const suggestedHTML = suggestedMylists.length > 0 ? `
                <div class="suggested-mylists">
                    <h4>おすすめマイリスト</h4>
                    ${suggestedMylists.map(
          (mylist) => `
                        <div class="mylist-item suggested" data-id="${mylist.id}">
                            <span class="mylist-name">${mylist.name}</span>
                            <div class="match-info">
                                マッチしたタグ: ${matchDetails.get(mylist.id)?.join(", ") || ""}
                            </div>
                        </div>
                    `
        ).join("")}
                </div>
            ` : "";
        const regularHTML = mylists.map(
          (mylist) => `
                <div class="mylist-item" data-id="${mylist.id}">
                    <span>${mylist.name}</span>
                </div>
            `
        ).join("");
        if (mylistList) {
          mylistList.innerHTML = suggestedHTML + regularHTML;
        }
        document.querySelectorAll(".mylist-item").forEach((item) => {
          item.addEventListener("click", () => {
            const mylistId = parseInt(item.dataset.id || "0");
            if (modal) {
              modal.remove();
            }
            styleElement.remove();
            resolve(mylistId);
          });
        });
      };
    }
    if (createNewMylist) {
      createNewMylist.addEventListener("click", () => {
        const name = newMylistName?.value.trim() || "";
        if (name) {
          void manager.createMylist(name).then(() => displayMylists());
          if (newMylistName) {
            newMylistName.value = "";
          }
        }
      });
    }
    if (closeButton) {
      closeButton.addEventListener("click", () => {
        if (modal) {
          modal.remove();
        }
        styleElement.remove();
        reject(new Error("キャンセルされました"));
      });
    }
    void displayMylists();
    if (searchInput) {
      searchInput.addEventListener("input", () => {
        const searchText = searchInput.value.toLowerCase();
        document.querySelectorAll(".mylist-item").forEach((item) => {
          const spanElement = item.querySelector("span");
          const mylistName = spanElement?.textContent?.toLowerCase() || "";
          if (mylistName.includes(searchText)) {
            item.classList.remove("hidden");
          } else {
            item.classList.add("hidden");
          }
        });
      });
    }
  });
}
function normalizeText(text) {
  return text.toLowerCase().replace(/[！-～]/g, function(s) {
    return String.fromCharCode(s.charCodeAt(0) - 65248);
  }).replace(/[""]/g, '"').replace(/['']/g, "'").replace(/[（）]/g, function(s) {
    return s === "（" ? "(" : ")";
  });
}

class Mylist2Handler {
  constructor() {
    this.manager = new Mylist2Manager();
  }
  async handleAddVideo() {
    try {
      const apiData = window.NicoCache_nl.watch.apiData;
      if (!apiData || !apiData.video) {
        throw new Error("動画情報の取得に失敗しました");
      }
      const videoInfo = {
        id: apiData.video.id,
        title: apiData.video.title,
        viewCount: apiData.video.count.view || 0,
        commentCount: apiData.video.count.comment || 0,
        mylistCount: apiData.video.count.mylist || 0,
        thumbnailUrl: apiData.video.thumbnail.url,
        uploadedAt: new Date(apiData.video.registeredAt).getTime(),
        authorName: apiData.owner?.nickname || apiData.channel?.name || "不明",
        length: apiData.video.duration,
        description: apiData.video.description || "",
        tags: (() => {
          try {
            const items = apiData.tag?.items || [];
            const tagNames = items.map((t) => (t?.name || "").trim()).filter(Boolean);
            return tagNames.length > 0 ? tagNames : void 0;
          } catch {
            return void 0;
          }
        })()
      };
      const mylistId = await showMylistSelector();
      if (!mylistId) {
        throw new Error("マイリストが選択されていません");
      }
      const result = await this.manager.addVideo(mylistId, videoInfo);
      window.toastr.success(
        `${videoInfo.title}
Mylist2`,
        result,
        { timeOut: 5e3 }
      );
    } catch (error) {
      window.logger.error("エラーの詳細:", error);
      window.toastr.error(
        `${error instanceof Error ? error.message : "エラーが発生しました"}
Mylist2`,
        "エラー",
        { timeOut: 5e3 }
      );
    }
  }
  async handleAddKeyword() {
    try {
      const keyword = this.extractSearchKeyword(window.location.href);
      if (!keyword) {
        throw new Error("キーワードを取得できませんでした");
      }
      const mylistId = await showMylistSelector();
      if (!mylistId) {
        throw new Error("マイリストが選択されていません");
      }
      await this.manager.addKeyword(mylistId, keyword);
      window.toastr.success(
        `${keyword}
Mylist2`,
        "キーワードを追加しました",
        { timeOut: 5e3 }
      );
    } catch (error) {
      window.logger.error("エラーの詳細:", error);
      window.toastr.error(
        `${error instanceof Error ? error.message : "エラーが発生しました"}
Mylist2`,
        "エラー",
        { timeOut: 5e3 }
      );
    }
  }
  extractSearchKeyword(url) {
    try {
      const urlObj = new URL(url);
      if (urlObj.pathname.startsWith("/search/")) {
        return decodeURIComponent(urlObj.pathname.replace("/search/", ""));
      }
      if (urlObj.pathname.startsWith("/tag/")) {
        return decodeURIComponent(urlObj.pathname.replace("/tag/", ""));
      }
      if (urlObj.pathname.startsWith("/mylist_search/")) {
        return decodeURIComponent(urlObj.pathname.replace("/mylist_search/", ""));
      }
      return null;
    } catch (error) {
      window.logger.error("キーワード抽出エラー:", error);
      return null;
    }
  }
}

const handleVideoOperation = (operation, videoId) => {
  switch (operation) {
    case "cache_remove":
      return handleCacheRemove(videoId);
    default:
      throw new Error("Unknown operation: " + String(operation));
  }
};
const handleCacheRemove = (videoId) => {
  if (!videoId) return;
  const nicoCache = window.NicoCache_nl;
  const videoTitle = nicoCache?.watch?.apiData?.video?.title || "";
  if (confirm("本当に削除しますか？: " + videoId + " " + videoTitle)) {
    const unknownCache = nicoCache;
    if (unknownCache && typeof unknownCache === "object" && "get" in unknownCache && typeof unknownCache.get === "function") {
      const getFn = unknownCache.get;
      const path = "/cache/ajax_rmall?" + encodeURIComponent(videoId);
      getFn(path);
    } else {
      window.logger.warn("[video-util] NicoCache_nl.get が利用できません");
    }
  }
};

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

class LinkManager {
  constructor() {
    this.commentFilterReady = false;
    this.LINK_GROUPS = {
      favorites: [],
      custom: [
        {
          id: "customMylist",
          title: "mylist2",
          icon: getIconPath("playlist_add", "outlined"),
          action: "customMylist"
        },
        {
          id: "AddVideoToCustomMylist",
          title: "mylist2に追加",
          icon: getIconPath("playlist_add_circle", "outlined"),
          action: "AddVideoToCustomMylist"
        },
        {
          id: "commentFilter2",
          title: "comment-filter2",
          icon: getIconPath("filter_list", "outlined"),
          action: "commentFilter2"
        },
        {
          id: "watchVideoFilter",
          title: "動画非表示設定",
          icon: getIconPath("filter_list", "outlined"),
          action: "watchVideoFilter"
        },
        {
          id: "watch-history",
          title: "視聴履歴",
          icon: getIconPath("history", "outlined"),
          action: "watch-history"
        }
      ],
      services: [
        {
          id: "nicochart",
          title: "ニコチャート",
          icon: getIconPath("trending_up", "outlined"),
          action: "nicochart"
        },
        {
          id: "nicolog",
          title: "ニコログ",
          icon: getIconPath("search", "outlined"),
          action: "nicolog"
        },
        {
          id: "nicoran",
          title: "ニコラン",
          icon: getIconPath("trending_up", "outlined"),
          action: "nicoran"
        },
        {
          id: "nicozon",
          title: "nicozon",
          icon: getIconPath("storage", "outlined"),
          action: "nicozon"
        },
        {
          id: "search",
          title: "超検索",
          icon: getIconPath("search", "outlined"),
          action: "search"
        },
        {
          id: "commentviewer",
          title: "コメントビューア",
          icon: getIconPath("comment", "outlined"),
          action: "commentviewer"
        },
        {
          id: "nicodb",
          title: "ニコ生クリ奨ランキング",
          icon: getIconPath("live_tv", "outlined"),
          action: "nicodb"
        },
        {
          id: "ikioi",
          title: "ニコ生勢いランキング",
          icon: getIconPath("live_tv", "outlined"),
          action: "ikioi"
        },
        {
          id: "cytube",
          title: "CTV☆",
          icon: getIconPath("star", "outlined"),
          action: "cytube"
        },
        {
          id: "yajuyaju",
          title: "ヤジュヤジュ動画",
          icon: getIconPath("movie", "outlined"),
          action: "yajuyaju"
        }
      ],
      dataManagement: [
        {
          id: "cachelist",
          title: "キャッシュリスト",
          icon: getIconPath("storage", "outlined"),
          action: "cachelist"
        },
        {
          id: "cacheinfo",
          title: "キャッシュ情報",
          icon: getIconPath("info", "outlined"),
          action: "cacheinfo"
        },
        {
          id: "mediainfo",
          title: "nlMediaInfo",
          icon: getIconPath("info", "outlined"),
          action: "mediainfo"
        },
        {
          id: "videoinfo",
          title: "概要、コメ情報",
          icon: getIconPath("description", "outlined"),
          action: "videoinfo"
        },
        {
          id: "savemovie",
          title: "保存:動画",
          icon: getIconPath("download", "outlined"),
          action: "savemovie"
        },
        {
          id: "saveaudio",
          title: "保存:音声",
          icon: getIconPath("audiotrack", "outlined"),
          action: "saveaudio"
        },
        {
          id: "savecomment",
          title: "保存:コメント",
          icon: getIconPath("comment", "outlined"),
          action: "savecomment"
        },
        {
          id: "cache_remove",
          title: "削除:キャッシュ",
          icon: getIconPath("clear", "outlined"),
          action: "cache_remove"
        }
      ]
    };
    this.nicoCache = window.NicoCache_nl;
    window.addEventListener("CommentFilter2Ready", () => {
      this.commentFilterReady = true;
    });
    if (window.CommentFilter2Instance) {
      this.commentFilterReady = true;
    }
  }
  static getInstance() {
    if (!LinkManager.instance) {
      LinkManager.instance = new LinkManager();
    }
    return LinkManager.instance;
  }
  /**
   * 視聴ページのコンテキスト（videoIdなど）が存在するかどうか
   */
  hasWatchContext() {
    try {
      const pathname = window.location?.pathname ?? "";
      return pathname.includes("/watch/");
    } catch {
      return false;
    }
  }
  /**
   * 視聴コンテキストが無い状態でもUIに表示してよいアクションかどうか
   * - トップページ等へのフォールバックが可能、または文脈非依存のもののみ true
   */
  canShowWithoutWatch(action) {
    const allowed = /* @__PURE__ */ new Set([
      // custom
      "customMylist",
      "AddVideoToCustomMylist",
      "watchVideoFilter",
      "watch-history",
      // services（トップページ等へフォールバック可能 or もとよりルート）
      "nicochart",
      "nicolog",
      "nicoran",
      "nicozon",
      "search",
      "commentviewer",
      "nicodb",
      "ikioi",
      "cytube",
      "yajuyaju",
      // dataManagement
      "cachelist",
      "videoinfo"
    ]);
    return allowed.has(action);
  }
  /**
   * 表示用リンク一覧を返す。非視聴ページでは無効なアクションを除外する。
   */
  getLinks(group) {
    const links = this.LINK_GROUPS[group];
    if (!this.hasWatchContext()) {
      return links.filter((link) => this.canShowWithoutWatch(link.action));
    }
    return links;
  }
  getThreadId() {
    if (this.nicoCache.watch && this.nicoCache.watch.apiData) {
      const defaultThread = this.nicoCache.watch.apiData.comment?.threads?.find(
        (v) => v.isDefaultPostTarget === true
      );
      return defaultThread?.id || "";
    }
    return "";
  }
  async handleAction(action) {
    const videoId = this.nicoCache.watch?.getVideoID() || "";
    const threadId = this.getThreadId();
    const actionMap = {
      customMylist: "https://www.nicovideo.jp/local/features/dist/src/mylist2/index.html",
      AddVideoToCustomMylist: async () => {
        const mylist2Handler = new Mylist2Handler();
        if (this.nicoCache.watch) {
          await mylist2Handler.handleAddVideo();
        } else {
          await mylist2Handler.handleAddKeyword();
        }
      },
      commentFilter2: async () => {
        try {
          const commentFilter2Instance = window.CommentFilter2Instance;
          if (commentFilter2Instance && typeof commentFilter2Instance.showUI === "function") {
            await commentFilter2Instance.showUI();
          } else {
            if (!this.commentFilterReady) {
              window.logger.warn(
                "CommentFilter2はまだ初期化中です。しばらく待ってから再試行してください。"
              );
            } else {
              window.logger.warn(
                "CommentFilter2が利用できません。先にCommentFilter2を読み込んでください。"
              );
            }
          }
        } catch (error) {
          window.logger.error("CommentFilter2の呼び出しに失敗しました:", error);
        }
      },
      cachelist: "https://www.nicovideo.jp/cache/",
      cacheinfo: () => {
        if (!videoId) {
          window.logger?.warn("動画情報がありません。視聴ページで実行してください。");
          return;
        }
        window.open(`https://www.nicovideo.jp/cache/info/v2?${videoId}`);
      },
      mediainfo: () => {
        if (!videoId) {
          window.logger?.warn("動画情報がありません。視聴ページで実行してください。");
          return;
        }
        window.open(
          `https://www.nicovideo.jp/local/features/dist/src/nl-media-info/index.html?videoId=${videoId}`
        );
      },
      videoinfo: "https://www.nicovideo.jp/local/features/dist/src/thumb-info/index.html",
      savemovie: () => {
        if (!videoId) {
          window.logger?.warn("動画情報がありません。視聴ページで実行してください。");
          return;
        }
        window.open(`https://www.nicovideo.jp/cache/ffmpeg?video=${videoId}`);
      },
      saveaudio: () => {
        if (!videoId) {
          window.logger?.warn("動画情報がありません。視聴ページで実行してください。");
          return;
        }
        window.open(`https://www.nicovideo.jp/cache/ffmpeg?audio=${videoId}`);
      },
      savecomment: () => {
        if (!threadId) {
          window.logger?.warn("コメントスレッド情報がありません。視聴ページで実行してください。");
          return;
        }
        window.open(`https://www.nicovideo.jp/cache/${threadId}.xml`);
      },
      cache_remove: () => {
        if (!videoId) {
          window.logger?.warn("動画情報がありません。視聴ページで実行してください。");
          return;
        }
        handleVideoOperation("cache_remove", videoId);
      },
      nicochart: () => {
        if (!videoId) {
          window.open("http://www.nicochart.jp/");
          return;
        }
        window.open(`http://www.nicochart.jp/watch/${videoId}`);
      },
      nicolog: () => {
        if (!videoId) {
          window.open("https://www.nicolog.jp/");
          return;
        }
        window.open(`https://www.nicolog.jp/watch/${videoId}`);
      },
      nicoran: () => {
        if (!videoId) {
          window.open("http://nicoranweb.com/");
          return;
        }
        window.open(`http://nicoranweb.com/watch/${videoId}`);
      },
      nicozon: () => {
        if (!videoId) {
          window.open("https://www.nicozon.net/");
          return;
        }
        window.open(`https://www.nicozon.net/watch/${videoId}`);
      },
      search: "https://gokulin.info/search/",
      commentviewer: "https://yyya-nico.co/nv_comment_viewer/",
      nicodb: "https://nicodb.net/",
      ikioi: "https://ikioi-ranking.com/v/nico",
      cytube: "https://cytube.mm428.net/r/cookie_tv",
      yajuyaju: "https://yajuvideo.in/",
      watchVideoFilter: () => {
        try {
          const globalThumbnailsFilter = window.ThumbnailsFilter;
          if (globalThumbnailsFilter && globalThumbnailsFilter.openSettingsPanel) {
            globalThumbnailsFilter.openSettingsPanel();
          } else {
            window.logger.warn(
              "ThumbnailsFilterが利用できません。先にThumbnailsFilterを読み込んでください。"
            );
          }
        } catch (error) {
          window.logger.error("ThumbnailsFilterの呼び出しに失敗しました:", error);
        }
      },
      "watch-history": () => {
        window.open(`https://www.nicovideo.jp/local/features/dist/src/watch-history/index.html`);
      }
    };
    const actionValue = actionMap[action];
    if (typeof actionValue === "function") {
      await actionValue();
    } else if (actionValue) {
      window.open(actionValue);
    }
  }
}

class NicoApiFetcher {
  constructor() {
    this.comments = [];
    this.player = NicoVideoPlayer.getInstance();
  }
  static getInstance() {
    if (!NicoApiFetcher.instance) {
      NicoApiFetcher.instance = new NicoApiFetcher();
    }
    return NicoApiFetcher.instance;
  }
  async fetchAll(videoId) {
    try {
      const res = await window.commonHelper.fetchNicoDataWithComments(videoId);
      if (!res) throw new Error("統合データの取得に失敗しました");
      this.comments = res.comments.map((c) => ({
        ...c,
        vposMs: c.vposMs ?? 0,
        postedAt: c.postedAt ? String(c.postedAt) : void 0
      }));
    } catch (error) {
      window.logger.error("統合データの取得に失敗しました:", error);
      throw error;
    }
  }
  getComments() {
    return this.comments;
  }
  getCommentsCountAtTime(timeMs) {
    const range = 500;
    return this.comments.filter((comment) => {
      return Math.abs(comment.vposMs - timeMs) <= range;
    }).length;
  }
  searchComments(query, options = { enableRegexp: false }) {
    if (!query) return [];
    try {
      if (options.enableRegexp) {
        const regex = new RegExp(query, "i");
        return this.comments.filter((comment) => regex.test(comment.body));
      } else {
        const lowerQuery = query.toLowerCase();
        return this.comments.filter(
          (comment) => comment.body.toLowerCase().includes(lowerQuery)
        );
      }
    } catch (error) {
      window.logger.error("コメント検索に失敗しました:", error);
      return [];
    }
  }
  getCommentDensityData(segments = 100) {
    if (this.comments.length === 0) return [];
    const duration = Math.max(...this.comments.map((c) => c.vposMs));
    const segmentDuration = duration / segments;
    const density = Array.from({ length: segments }, () => 0);
    this.comments.forEach((comment) => {
      const segmentIndex = Math.floor(comment.vposMs / segmentDuration);
      if (segmentIndex < segments) {
        density[segmentIndex]++;
      }
    });
    return density.map((count, i) => ({
      time: i * segmentDuration,
      count
    }));
  }
}

class CommentManager {
  constructor() {
    this.searchOptions = {
      enableRegexp: false,
      enableExtended: false
    };
    this.currentVideoId = null;
    this.eventListeners = [];
    // URL 監視のクリーンアップ用ハンドラを保持
    this.cleanupHandlers = [];
    // URL監視が重複しないようにするフラグ
    this.isWatchingUrl = false;
    this.apiFetcher = NicoApiFetcher.getInstance();
  }
  static getInstance() {
    if (!CommentManager.instance) {
      CommentManager.instance = new CommentManager();
    }
    return CommentManager.instance;
  }
  extractVideoIdFromUrl() {
    const match = location.pathname.match(/[a-z]{2}\d+/);
    return match ? match[0] : null;
  }
  async fetchComments(videoId) {
    const effectiveVideoId = videoId || this.extractVideoIdFromUrl();
    if (!effectiveVideoId) {
      throw new Error("動画IDが指定されていません");
    }
    if (this.currentVideoId === effectiveVideoId) {
      window.logger?.debug("同じ動画IDのため、コメント取得をスキップしました:", effectiveVideoId);
      return;
    }
    try {
      window.logger?.info("コメントを取得中:", effectiveVideoId);
      await this.apiFetcher.fetchAll(effectiveVideoId);
      this.currentVideoId = effectiveVideoId;
      this.notifyDataChanged();
    } catch (error) {
      window.logger.error("コメントの取得に失敗しました:", error);
      throw error;
    }
  }
  getComments() {
    return this.apiFetcher.getComments();
  }
  getCommentsCountAtTime(timeMs) {
    return this.apiFetcher.getCommentsCountAtTime(timeMs);
  }
  searchComments(query) {
    try {
      const results = this.apiFetcher.searchComments(query, {
        enableRegexp: this.searchOptions.enableRegexp
      });
      return {
        success: true,
        results
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "検索に失敗しました"
      };
    }
  }
  setSearchOptions(options) {
    this.searchOptions = {
      ...this.searchOptions,
      ...options
    };
  }
  getSearchOptions() {
    return { ...this.searchOptions };
  }
  getCommentDensityData(segments = 100) {
    return this.apiFetcher.getCommentDensityData(segments);
  }
  getCurrentVideoId() {
    return this.currentVideoId;
  }
  onDataChanged(callback) {
    this.eventListeners.push(callback);
    return () => {
      const index = this.eventListeners.indexOf(callback);
      if (index > -1) {
        this.eventListeners.splice(index, 1);
      }
    };
  }
  notifyDataChanged() {
    this.eventListeners.forEach((callback) => {
      try {
        callback();
      } catch (error) {
        window.logger?.error("データ変更通知でエラーが発生しました:", error);
      }
    });
  }
  startUrlWatching() {
    if (this.isWatchingUrl) {
      return;
    }
    this.isWatchingUrl = true;
    const checkUrl = () => {
      const currentVideoId = this.extractVideoIdFromUrl();
      if (currentVideoId && currentVideoId !== this.currentVideoId) {
        window.logger?.info("URL変更を検出、コメントを再取得:", currentVideoId);
        this.fetchComments(currentVideoId).catch((error) => {
          window.logger?.error("URL変更時のコメント取得に失敗:", error);
        });
      }
    };
    const popstateListener = () => {
      setTimeout(checkUrl, 100);
    };
    window.addEventListener("popstate", popstateListener);
    const patchHistoryMethod = (type) => {
      const historyObj = history;
      const original = historyObj[type];
      if (!original) return;
      historyObj[type] = (...args) => {
        const result = original.apply(historyObj, args);
        window.dispatchEvent(new Event("ml-location-change"));
        return result;
      };
    };
    const win = window;
    if (!win.__mlink_comment_history_patched) {
      patchHistoryMethod("pushState");
      patchHistoryMethod("replaceState");
      window.addEventListener("popstate", () => {
        window.dispatchEvent(new Event("ml-location-change"));
      });
      win.__mlink_comment_history_patched = true;
    }
    const locationChangeListener = () => {
      setTimeout(checkUrl, 100);
    };
    window.addEventListener("ml-location-change", locationChangeListener);
    const observer = new MutationObserver(() => {
      setTimeout(checkUrl, 100);
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
    this.cleanupHandlers.push(() => {
      window.removeEventListener("popstate", popstateListener);
      window.removeEventListener("ml-location-change", locationChangeListener);
      observer.disconnect();
    });
  }
}

class TimeFormatter {
  static formatTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor(seconds % 3600 / 60);
    const secs = Math.floor(seconds % 60);
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    } else {
      return `${minutes}:${secs.toString().padStart(2, "0")}`;
    }
  }
  static formatVpos(vposMs) {
    return this.formatTime(vposMs / 1e3);
  }
}

class HeatmapManager {
  constructor() {
    // FAB内表示用
    this.fabCanvas = null;
    this.fabTooltip = null;
    this.fabContext = null;
    // オーバーレイ表示用
    this.overlayCanvas = null;
    this.overlayTooltip = null;
    this.overlayContext = null;
    this.overlayContainer = null;
    this.colorScheme = "default";
    this.smoothing = false;
    this.commentData = [];
    this.displayMode = "off";
    this.updateInterval = null;
    // SPA遷移検知用
    this.videoPlayerObserver = null;
    this.currentVideoElement = null;
    // ResizeObserver管理用を追加
    this.resizeObserver = null;
    // ローカルストレージのキー
    this.STORAGE_KEYS = {
      DISPLAY_MODE: "heatmapDisplayMode",
      COLOR_SCHEME: "heatmapColorScheme",
      SMOOTHING: "heatmapSmoothing"
    };
    this.player = NicoVideoPlayer.getInstance();
    this.apiFetcher = NicoApiFetcher.getInstance();
    this.restoreSettings();
    this.startVideoPlayerObserver();
  }
  static getInstance() {
    if (!HeatmapManager.instance) {
      HeatmapManager.instance = new HeatmapManager();
    }
    return HeatmapManager.instance;
  }
  initialize(canvas, tooltip) {
    this.fabCanvas = canvas;
    this.fabTooltip = tooltip;
    this.fabContext = canvas.getContext("2d");
    if (this.fabContext) {
      this.fabContext.imageSmoothingEnabled = this.smoothing;
    }
    this.resizeFabCanvas();
    this.setupFabEventListeners();
    this.updateCommentData();
  }
  setDisplayMode(mode) {
    this.displayMode = mode;
    this.clearAllDisplays();
    this.stopPeriodicUpdate();
    switch (mode) {
      case "fab":
        this.showFabHeatmap();
        this.startPeriodicUpdate();
        break;
      case "overlay":
        this.showOverlayHeatmap();
        this.startPeriodicUpdate();
        break;
    }
    this.saveSettings();
  }
  getDisplayMode() {
    return this.displayMode;
  }
  clearAllDisplays() {
    if (this.fabCanvas && this.fabContext) {
      this.fabContext.clearRect(0, 0, this.fabCanvas.width, this.fabCanvas.height);
    }
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
    if (this.overlayContainer) {
      this.overlayContainer.remove();
      this.overlayContainer = null;
      this.overlayCanvas = null;
      this.overlayTooltip = null;
      this.overlayContext = null;
    }
    const existingOverlays = document.querySelectorAll(".heatmap-overlay-container");
    existingOverlays.forEach((overlay) => {
      window.logger.info("[HeatmapManager] 古いヒートマップオーバーレイを削除:", overlay);
      overlay.remove();
    });
    this.stopPeriodicUpdate();
  }
  showFabHeatmap() {
    if (this.fabCanvas) {
      this.render();
    }
  }
  showOverlayHeatmap() {
    this.createOverlayHeatmap();
  }
  createOverlayHeatmap() {
    this.waitForVideoPlayerReady().then(() => {
      this.createOverlayHeatmapInternal();
    }).catch((error) => {
      window.logger.warn("[HeatmapManager] 動画プレイヤーの準備完了を待機中にエラー:", error);
      setTimeout(() => {
        this.createOverlayHeatmapInternal();
      }, 2e3);
    });
  }
  async waitForVideoPlayerReady() {
    return new Promise((resolve, reject) => {
      let attempts = 0;
      const maxAttempts = 50;
      const checkVideoReady = () => {
        attempts++;
        const videoElement = document.querySelector('video[data-name="video-content"]');
        if (videoElement && videoElement.readyState >= 2 && // HAVE_CURRENT_DATA以上
        videoElement.duration > 0 && !videoElement.paused) {
          resolve();
          return;
        }
        if (attempts >= maxAttempts) {
          window.logger.warn("[HeatmapManager] 動画プレイヤーの準備完了待機がタイムアウト");
          reject(new Error("Video player ready timeout"));
          return;
        }
        setTimeout(checkVideoReady, 100);
      };
      checkVideoReady();
    });
  }
  createOverlayHeatmapInternal() {
    this.clearAllDisplays();
    const videoElement = document.querySelector('video[data-name="video-content"]');
    if (!videoElement) {
      window.logger.warn("[HeatmapManager] 動画要素が見つかりません");
      return;
    }
    const videoContainer = videoElement.parentElement;
    if (!videoContainer) {
      window.logger.warn("[HeatmapManager] 動画コンテナが見つかりません");
      return;
    }
    const existingInContainer = videoContainer.querySelectorAll(".heatmap-overlay-container");
    existingInContainer.forEach((overlay) => {
      window.logger.info("[HeatmapManager] コンテナ内の古いヒートマップを削除:", overlay);
      overlay.remove();
    });
    this.overlayContainer = document.createElement("div");
    this.overlayContainer.className = "heatmap-overlay-container";
    this.overlayContainer.style.cssText = `
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 40px;
      pointer-events: none;
      z-index: 1000;
    `;
    this.overlayCanvas = document.createElement("canvas");
    this.overlayCanvas.className = "heatmap-overlay-canvas";
    this.overlayCanvas.style.cssText = `
      width: 100%;
      height: 100%;
      pointer-events: auto;
      cursor: pointer;
    `;
    this.overlayTooltip = document.createElement("div");
    this.overlayTooltip.className = "heatmap-overlay-tooltip";
    this.overlayTooltip.style.cssText = `
      position: absolute;
      display: none;
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      pointer-events: none;
      z-index: 1001;
      transform: translateX(-50%);
      bottom: 45px;
    `;
    this.overlayContainer.appendChild(this.overlayCanvas);
    this.overlayContainer.appendChild(this.overlayTooltip);
    if (getComputedStyle(videoContainer).position === "static") {
      videoContainer.style.position = "relative";
    }
    videoContainer.appendChild(this.overlayContainer);
    this.overlayContext = this.overlayCanvas.getContext("2d");
    if (this.overlayContext) {
      this.overlayContext.imageSmoothingEnabled = this.smoothing;
    }
    this.setupOverlayEventListeners();
    this.resizeOverlayCanvas();
    this.renderOverlay();
    this.resizeObserver = new ResizeObserver(() => {
      this.resizeOverlayCanvas();
      this.renderOverlay();
    });
    this.resizeObserver.observe(videoContainer);
    window.logger.info("[HeatmapManager] オーバーレイヒートマップを作成しました");
    this.startPeriodicUpdate();
  }
  resizeOverlayCanvas() {
    if (!this.overlayCanvas || !this.overlayContainer) return;
    const rect = this.overlayContainer.getBoundingClientRect();
    this.overlayCanvas.width = rect.width;
    this.overlayCanvas.height = rect.height;
  }
  setupFabEventListeners() {
    if (!this.fabCanvas || !this.fabTooltip) return;
    const resizeObserver = new ResizeObserver(() => {
      this.resizeFabCanvas();
      if (this.displayMode === "fab") {
        this.render();
      }
    });
    const container = this.fabCanvas.parentElement;
    if (container) {
      resizeObserver.observe(container);
    }
    this.fabCanvas.addEventListener("mousemove", (e) => {
      if (this.displayMode === "fab") {
        const rect = this.fabCanvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const position = x / rect.width;
        this.showTooltip(position, this.fabTooltip);
      }
    });
    this.fabCanvas.addEventListener("mouseleave", () => {
      if (this.displayMode === "fab") {
        this.hideTooltip(this.fabTooltip);
      }
    });
    this.fabCanvas.addEventListener("click", (e) => {
      if (this.displayMode === "fab") {
        const rect = this.fabCanvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const position = x / rect.width;
        this.seekToPosition(position);
      }
    });
  }
  setupOverlayEventListeners() {
    if (!this.overlayCanvas || !this.overlayTooltip) return;
    this.overlayCanvas.addEventListener("mousemove", (e) => {
      const rect = this.overlayCanvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const position = x / rect.width;
      this.showTooltip(position, this.overlayTooltip);
      this.overlayTooltip.style.left = `${position * 100}%`;
    });
    this.overlayCanvas.addEventListener("mouseleave", () => {
      this.hideTooltip(this.overlayTooltip);
    });
    this.overlayCanvas.addEventListener("click", (e) => {
      const rect = this.overlayCanvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const position = x / rect.width;
      this.seekToPosition(position);
    });
  }
  seekToPosition(position) {
    const duration = this.player.getDuration();
    const time = position * duration;
    this.player.seek(time);
  }
  updateCommentData() {
    this.commentData = this.apiFetcher.getCommentDensityData();
  }
  setColorScheme(scheme) {
    this.colorScheme = scheme;
    this.render();
    this.renderOverlay();
    this.saveSettings();
  }
  setSmoothing(enabled) {
    this.smoothing = enabled;
    if (this.fabContext) {
      this.fabContext.imageSmoothingEnabled = enabled;
    }
    if (this.overlayContext) {
      this.overlayContext.imageSmoothingEnabled = enabled;
    }
    this.render();
    this.renderOverlay();
    this.saveSettings();
  }
  showTooltip(position, tooltip) {
    const duration = this.player.getDuration();
    const time = position * duration;
    const commentCount = this.getCommentCountAtTime(time);
    tooltip.textContent = `${TimeFormatter.formatTime(time)} (${commentCount}コメント)`;
    tooltip.style.display = "block";
  }
  hideTooltip(tooltip) {
    tooltip.style.display = "none";
  }
  getCommentCountAtTime(time) {
    const timeMs = time * 1e3;
    return this.apiFetcher.getCommentsCountAtTime(timeMs);
  }
  getColorForValue(value, max) {
    const normalizedValue = Math.max(0, Math.min(1, value / max));
    let hue;
    let r;
    let g;
    let b;
    switch (this.colorScheme) {
      case "rainbow":
        hue = (1 - normalizedValue) * 240;
        return `hsl(${hue}, 100%, 50%)`;
      case "fire":
        r = Math.min(255, normalizedValue * 510);
        g = Math.min(255, normalizedValue * 255);
        return `rgb(${Math.floor(r)}, ${Math.floor(g)}, 0)`;
      case "cool":
        b = Math.min(255, normalizedValue * 255);
        return `rgb(0, ${Math.floor(normalizedValue * 255)}, ${Math.floor(b)})`;
      default:
        if (normalizedValue === 0) return "transparent";
        if (normalizedValue <= 0.25) {
          const ratio = normalizedValue / 0.25;
          r = Math.floor(ratio * 100);
          g = Math.floor(150 + ratio * 105);
          b = 255;
        } else if (normalizedValue <= 0.5) {
          const ratio = (normalizedValue - 0.25) / 0.25;
          r = Math.floor(100 - ratio * 100);
          g = 255;
          b = Math.floor(255 - ratio * 255);
        } else if (normalizedValue <= 0.75) {
          const ratio = (normalizedValue - 0.5) / 0.25;
          r = Math.floor(ratio * 255);
          g = 255;
          b = 0;
        } else {
          const ratio = (normalizedValue - 0.75) / 0.25;
          r = 255;
          g = Math.floor(255 - ratio * 255);
          b = 0;
        }
        return `rgb(${r}, ${g}, ${b})`;
    }
  }
  render() {
    if (this.displayMode !== "fab" || !this.fabCanvas || !this.fabContext) return;
    this.resizeFabCanvas();
    this.renderToCanvas(this.fabCanvas, this.fabContext);
  }
  renderOverlay() {
    if (this.displayMode !== "overlay" || !this.overlayCanvas || !this.overlayContext) return;
    this.renderToCanvas(this.overlayCanvas, this.overlayContext);
  }
  renderToCanvas(canvas, context) {
    const width = canvas.width;
    const height = canvas.height;
    const maxCount = Math.max(...this.commentData.map((data) => data.count));
    context.clearRect(0, 0, width, height);
    if (this.commentData.length === 0) return;
    const duration = this.player.getDuration();
    if (duration <= 0) return;
    const segments = Math.max(100, this.commentData.length);
    const barWidth = width / segments;
    const minBarHeight = Math.max(4, height * 0.15);
    const maxBarHeight = height * 0.95;
    for (let i = 0; i < segments; i++) {
      const segmentTime = i / segments * duration * 1e3;
      const segmentEndTime = (i + 1) / segments * duration * 1e3;
      let commentCount = 0;
      for (const comment of this.apiFetcher.getComments()) {
        if (comment.vposMs >= segmentTime && comment.vposMs < segmentEndTime) {
          commentCount++;
        }
      }
      if (commentCount > 0) {
        const normalizedCount = commentCount / maxCount;
        const sqrtScale = Math.sqrt(normalizedCount);
        let barHeight = minBarHeight + sqrtScale * (maxBarHeight - minBarHeight);
        barHeight = Math.max(minBarHeight, barHeight);
        const x = i * barWidth;
        const y = height - barHeight;
        context.fillStyle = this.getColorForValue(commentCount, maxCount);
        context.fillRect(x, y, barWidth, barHeight);
      }
    }
    const currentTime = this.player.getCurrentTime();
    if (duration > 0) {
      const position = currentTime / duration * width;
      context.strokeStyle = "#ff0000";
      context.lineWidth = 2;
      context.beginPath();
      context.moveTo(position, 0);
      context.lineTo(position, height);
      context.stroke();
    }
  }
  // コメントデータが更新された時に呼び出される
  updateComments() {
    this.updateCommentData();
    this.updateDisplay();
  }
  // 表示を更新（現在の表示モードに応じて適切な描画を実行）
  updateDisplay() {
    switch (this.displayMode) {
      case "fab":
        this.render();
        break;
      case "overlay":
        this.renderOverlay();
        break;
    }
  }
  // 定期的な更新を開始（再生位置の更新のため）
  startPeriodicUpdate() {
    this.stopPeriodicUpdate();
    this.updateInterval = setInterval(() => {
      this.updateDisplay();
    }, 500);
  }
  // 定期的な更新を停止
  stopPeriodicUpdate() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }
  resizeFabCanvas() {
    if (!this.fabCanvas) return;
    const container = this.fabCanvas.parentElement;
    if (container) {
      const rect = container.getBoundingClientRect();
      this.fabCanvas.width = rect.width;
      this.fabCanvas.height = 30;
      this.fabCanvas.style.width = "100%";
      this.fabCanvas.style.height = "30px";
    }
  }
  restoreSettings() {
    try {
      const storedDisplayMode = localStorage.getItem(this.STORAGE_KEYS.DISPLAY_MODE);
      const storedColorScheme = localStorage.getItem(this.STORAGE_KEYS.COLOR_SCHEME);
      const storedSmoothing = localStorage.getItem(this.STORAGE_KEYS.SMOOTHING);
      if (storedDisplayMode && ["fab", "overlay", "off"].includes(storedDisplayMode)) {
        this.displayMode = storedDisplayMode;
      }
      if (storedColorScheme && ["default", "rainbow", "fire", "cool"].includes(storedColorScheme)) {
        this.colorScheme = storedColorScheme;
      }
      if (storedSmoothing !== null) {
        this.smoothing = storedSmoothing === "true";
      }
    } catch (error) {
      window.logger.error("[HeatmapManager] Error restoring settings:", error);
    }
  }
  saveSettings() {
    try {
      localStorage.setItem(this.STORAGE_KEYS.DISPLAY_MODE, this.displayMode);
      localStorage.setItem(this.STORAGE_KEYS.COLOR_SCHEME, this.colorScheme);
      localStorage.setItem(this.STORAGE_KEYS.SMOOTHING, this.smoothing.toString());
    } catch (error) {
      window.logger.error("[HeatmapManager] Error saving settings:", error);
    }
  }
  // SPA遷移検知用のMutationObserverを開始
  startVideoPlayerObserver() {
    this.videoPlayerObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === "childList") {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node;
              const videoElement = element.querySelector?.('video[data-name="video-content"]');
              if (videoElement && videoElement !== this.currentVideoElement) {
                window.logger.info("[HeatmapManager] 新しい動画プレイヤーを検知");
                this.currentVideoElement = videoElement;
                if (this.displayMode === "overlay") {
                  setTimeout(() => {
                    this.clearAllDisplays();
                    this.showOverlayHeatmap();
                  }, 1e3);
                }
              }
            }
          });
          mutation.removedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node;
              if (element.querySelector?.(".heatmap-overlay-container") || element.classList?.contains("heatmap-overlay-container")) {
                window.logger.info("[HeatmapManager] 古いヒートマップ要素の削除を検知");
                if (this.overlayContainer && !document.contains(this.overlayContainer)) {
                  this.overlayContainer = null;
                  this.overlayCanvas = null;
                  this.overlayTooltip = null;
                  this.overlayContext = null;
                }
              }
            }
          });
        }
      });
    });
    this.videoPlayerObserver.observe(document.body, {
      childList: true,
      subtree: true
    });
  }
  // MutationObserverを停止
  stopVideoPlayerObserver() {
    if (this.videoPlayerObserver) {
      this.videoPlayerObserver.disconnect();
      this.videoPlayerObserver = null;
    }
  }
  // インスタンス破棄時の処理
  destroy() {
    this.stopPeriodicUpdate();
    this.stopVideoPlayerObserver();
    this.clearAllDisplays();
    const allOverlays = document.querySelectorAll(".heatmap-overlay-container");
    allOverlays.forEach((overlay) => {
      window.logger.info("[HeatmapManager] destroy時に古いヒートマップを削除:", overlay);
      overlay.remove();
    });
    this.fabCanvas = null;
    this.fabTooltip = null;
    this.fabContext = null;
    this.overlayCanvas = null;
    this.overlayTooltip = null;
    this.overlayContext = null;
    this.overlayContainer = null;
    this.currentVideoElement = null;
  }
  // 現在の設定を取得するメソッドを追加
  getColorScheme() {
    return this.colorScheme;
  }
  getSmoothing() {
    return this.smoothing;
  }
}

class PlaybackHandler {
  constructor() {
    this.updateInterval = null;
    this.player = NicoVideoPlayer.getInstance();
  }
  togglePlayPause() {
    if (this.player.isPlaying()) {
      void this.player.pause();
    } else {
      void this.player.play();
    }
  }
  seek(options) {
    const currentTime = this.player.getCurrentTime();
    const delta = options.direction === "forward" ? options.seconds : -options.seconds;
    const newTime = Math.max(0, Math.min(this.player.getDuration(), currentTime + delta));
    void this.player.seek(newTime);
  }
  seekToPosition(position) {
    const duration = this.player.getDuration();
    const time = position * duration;
    void this.player.seek(time);
  }
  getPlaybackState() {
    return {
      isPlaying: this.player.isPlaying(),
      currentTime: this.player.getCurrentTime(),
      duration: this.player.getDuration()
    };
  }
  formatTime(seconds) {
    return TimeFormatter.formatTime(seconds);
  }
  startUpdateInterval(callback) {
    if (this.updateInterval !== null) {
      this.stopUpdateInterval();
    }
    this.updateInterval = window.setInterval(callback, 1e3);
  }
  stopUpdateInterval() {
    if (this.updateInterval !== null) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }
}

class VolumeHandler {
  // 0dB (最大音量)
  constructor() {
    this.minDb = -60;
    // -60dB (最小音量)
    this.maxDb = 0;
    this.player = NicoVideoPlayer.getInstance();
  }
  setVolume(options) {
    let volume = options.value;
    if (options.isLogarithmic) {
      volume = this.logSliderToLinearValue(volume);
    }
    volume = Math.max(0, Math.min(1, volume));
    this.player.setVolume(volume * 100);
  }
  getVolume() {
    return this.player.getVolume() / 100;
  }
  mute() {
    this.setVolume({ value: 0 });
  }
  adjustVolume(delta) {
    const currentVolume = this.getVolume();
    this.setVolume({ value: currentVolume + delta });
  }
  // 対数スケールのスライダー値（0-1）を線形値（0-1）に変換
  logSliderToLinearValue(value) {
    if (value <= 0) return 0;
    if (value >= 1) return 1;
    const db = this.minDb + value * (this.maxDb - this.minDb);
    return Math.pow(10, db / 20);
  }
  // 線形値（0-1）を対数スケールのスライダー値（0-1）に変換
  linearToLogSliderValue(value) {
    if (value <= 0) return 0;
    if (value >= 1) return 1;
    const db = 20 * Math.log10(value);
    return (db - this.minDb) / (this.maxDb - this.minDb);
  }
}

class SpeedHandler {
  constructor() {
    this.defaultMin = 0.1;
    this.defaultMax = 5;
    this.defaultStep = 0.1;
    this.player = NicoVideoPlayer.getInstance();
  }
  setPlaybackRate(options) {
    const min = options.min ?? this.defaultMin;
    const max = options.max ?? this.defaultMax;
    const rate = Math.max(min, Math.min(max, options.value));
    const roundedRate = Math.round(rate * 100) / 100;
    this.player.setPlaybackRate(roundedRate);
  }
  getPlaybackRate() {
    return this.player.getPlaybackRate();
  }
  adjustPlaybackRate(delta) {
    const currentRate = this.getPlaybackRate();
    this.setPlaybackRate({
      value: currentRate + delta,
      min: this.defaultMin,
      max: this.defaultMax
    });
  }
  resetPlaybackRate() {
    this.setPlaybackRate({ value: 1 });
  }
  getPresets() {
    return [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2];
  }
  getStep() {
    return this.defaultStep;
  }
  getRange() {
    return {
      min: this.defaultMin,
      max: this.defaultMax
    };
  }
}

var PageType = /* @__PURE__ */ ((PageType2) => {
  PageType2["ALL"] = "all";
  PageType2["WATCH"] = "watch";
  PageType2["SEARCH"] = "search";
  PageType2["RANKING"] = "ranking";
  PageType2["NICO_INFO"] = "nico_info";
  return PageType2;
})(PageType || {});
var ModuleCategory = /* @__PURE__ */ ((ModuleCategory2) => {
  ModuleCategory2["PRIVACY"] = "privacy";
  ModuleCategory2["UI_ENHANCEMENT"] = "ui_enhancement";
  ModuleCategory2["FUNCTIONALITY"] = "functionality";
  ModuleCategory2["VISUAL"] = "visual";
  return ModuleCategory2;
})(ModuleCategory || {});
var ModuleStatus = /* @__PURE__ */ ((ModuleStatus2) => {
  ModuleStatus2["INACTIVE"] = "inactive";
  ModuleStatus2["LOADING"] = "loading";
  ModuleStatus2["ACTIVE"] = "active";
  ModuleStatus2["ERROR"] = "error";
  return ModuleStatus2;
})(ModuleStatus || {});

class SettingsManager {
  constructor() {
    this.STORAGE_KEY = "nicoVideoController_moduleSettings";
    this.settings = {};
    this.eventListeners = /* @__PURE__ */ new Set();
    this.loadSettings();
  }
  static getInstance() {
    if (!SettingsManager.instance) {
      SettingsManager.instance = new SettingsManager();
    }
    return SettingsManager.instance;
  }
  /**
   * ローカルストレージから設定を読み込み
   */
  loadSettings() {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed === "object") {
          this.settings = parsed;
        }
      }
    } catch (error) {
      window.logger.error("[SettingsManager] 設定の読み込みに失敗しました:", error);
      this.settings = {};
    }
  }
  /**
   * 設定をローカルストレージに保存
   */
  saveSettings() {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.settings));
      this.notifyListeners();
    } catch (error) {
      window.logger.error("[SettingsManager] 設定の保存に失敗しました:", error);
    }
  }
  /**
   * 特定モジュールの有効/無効状態を更新
   */
  updateModuleEnabled(moduleId, enabled) {
    if (!this.settings[moduleId]) {
      this.settings[moduleId] = { enabled: false };
    }
    this.settings[moduleId].enabled = enabled;
    this.saveSettings();
  }
  /**
   * 特定モジュールの有効状態を取得
   */
  isModuleEnabled(moduleId) {
    return this.settings[moduleId]?.enabled ?? false;
  }
  /**
   * 特定モジュールの設定を更新
   */
  updateModuleConfig(moduleId, config) {
    if (!this.settings[moduleId]) {
      this.settings[moduleId] = { enabled: false };
    }
    this.settings[moduleId].config = { ...this.settings[moduleId].config, ...config };
    this.saveSettings();
  }
  /**
   * 特定モジュールの設定を取得
   */
  getModuleConfig(moduleId) {
    return this.settings[moduleId]?.config ?? {};
  }
  /**
   * 全設定を取得
   */
  getAllSettings() {
    return { ...this.settings };
  }
  /**
   * 設定をリセット
   */
  resetSettings() {
    this.settings = {};
    this.saveSettings();
  }
  /**
   * 特定モジュールの設定をリセット
   */
  resetModuleSettings(moduleId) {
    delete this.settings[moduleId];
    this.saveSettings();
  }
  /**
   * 設定変更の監視を追加
   */
  addSettingsListener(listener) {
    this.eventListeners.add(listener);
  }
  /**
   * 設定変更の監視を削除
   */
  removeSettingsListener(listener) {
    this.eventListeners.delete(listener);
  }
  /**
   * 設定変更をリスナーに通知
   */
  notifyListeners() {
    this.eventListeners.forEach((listener) => {
      try {
        listener(this.getAllSettings());
      } catch (error) {
        window.logger.error("[SettingsManager] リスナーの実行中にエラーが発生しました:", error);
      }
    });
  }
  /**
   * 設定のエクスポート（デバッグ用）
   */
  exportSettings() {
    return JSON.stringify(this.settings, null, 2);
  }
  /**
   * 設定のインポート（デバッグ用）
   */
  importSettings(settingsJson) {
    try {
      const imported = JSON.parse(settingsJson);
      if (imported && typeof imported === "object") {
        this.settings = imported;
      }
      this.saveSettings();
      return true;
    } catch (error) {
      window.logger.error("[SettingsManager] 設定のインポートに失敗しました:", error);
      return false;
    }
  }
}

class ModuleRegistry {
  constructor() {
    this.modules = /* @__PURE__ */ new Map();
    this.registerDefaultModules();
  }
  static getInstance() {
    if (!ModuleRegistry.instance) {
      ModuleRegistry.instance = new ModuleRegistry();
    }
    return ModuleRegistry.instance;
  }
  /**
   * デフォルトモジュールを登録
   */
  registerDefaultModules() {
    this.registerModule({
      id: "header_privacy",
      name: "ヘッダープライバシー",
      description: "ユーザーアイコンとユーザー名を非表示にします",
      version: "1.0.0",
      enabled: false,
      targetPages: [PageType.ALL],
      dependencies: ["window.logger"],
      category: ModuleCategory.PRIVACY,
      icon: createMaterialIcon("lock", { style: "outlined", color: "white" })
    });
    this.registerModule({
      id: "search_eight_column",
      name: "検索結果8列表示",
      description: "動画検索結果を8列で表示します",
      version: "1.0.0",
      enabled: false,
      targetPages: [PageType.SEARCH],
      dependencies: [],
      category: ModuleCategory.UI_ENHANCEMENT,
      icon: createMaterialIcon("search", { style: "outlined", color: "white" })
    });
    this.registerModule({
      id: "daily_lottery_highlight",
      name: "デイリー福引ハイライト",
      description: "デイリー福引をハイライト表示します",
      version: "1.0.0",
      enabled: false,
      targetPages: [PageType.NICO_INFO],
      dependencies: ["window.toastr"],
      category: ModuleCategory.UI_ENHANCEMENT,
      icon: createMaterialIcon("card_giftcard", { style: "outlined", color: "white" })
    });
    this.registerModule({
      id: "watch_page",
      name: "Watch Page統合",
      description: "Watch Pageの各種機能を統合管理（タグカウンター、ヘッダー一行化）",
      version: "1.2.0",
      enabled: false,
      targetPages: [PageType.WATCH],
      dependencies: [],
      category: ModuleCategory.FUNCTIONALITY,
      icon: createMaterialIcon("movie", { style: "outlined", color: "white" })
    });
    this.registerModule({
      id: "watch_background_selector",
      name: "背景セレクター",
      description: "ラジアル背景選択UIを提供します",
      version: "1.0.0",
      enabled: false,
      targetPages: [PageType.WATCH],
      dependencies: [],
      category: ModuleCategory.VISUAL,
      icon: createMaterialIcon("image", { style: "outlined", color: "white" }),
      exclusiveGroup: "watch_background"
    });
    this.registerModule({
      id: "watch_matrix_background",
      name: "マトリックス背景",
      description: "マトリックス風のアニメーション背景を表示します",
      version: "1.0.0",
      enabled: false,
      targetPages: [PageType.WATCH],
      dependencies: [],
      category: ModuleCategory.VISUAL,
      icon: createMaterialIcon("cloud", { style: "outlined", color: "white" }),
      exclusiveGroup: "watch_background"
    });
    this.registerModule({
      id: "watch_mylist_selector",
      name: "マイリストセレクタ",
      description: "カスタムマイリストへの動画追加UIを提供します",
      version: "1.0.0",
      enabled: false,
      targetPages: [PageType.WATCH, PageType.SEARCH],
      dependencies: [],
      category: ModuleCategory.FUNCTIONALITY,
      icon: createMaterialIcon("edit", { style: "outlined", color: "white" })
    });
    this.registerModule({
      id: "thumbnails_filter",
      name: "サムネイルフィルター",
      description: "キーワードに基づいて動画サムネイルを非表示にします",
      version: "1.0.0",
      enabled: false,
      targetPages: [PageType.ALL],
      dependencies: ["window.toastr"],
      category: ModuleCategory.FUNCTIONALITY,
      icon: createMaterialIcon("block", { style: "outlined", color: "white" })
    });
    this.registerModule({
      id: "deleted_video_detector",
      name: "削除動画検出器",
      description: "削除された動画を検出してローカルプレイヤーにリダイレクトします",
      version: "1.0.0",
      enabled: false,
      targetPages: [PageType.WATCH],
      dependencies: [],
      category: ModuleCategory.FUNCTIONALITY,
      icon: createMaterialIcon("link", { style: "outlined", color: "white" })
    });
  }
  /**
   * モジュールを登録
   */
  registerModule(config) {
    if (this.modules.has(config.id)) {
      window.logger.warn(`[ModuleRegistry] モジュール ${config.id} は既に登録されています`);
      return;
    }
    this.modules.set(config.id, config);
  }
  /**
   * モジュール設定を取得
   */
  getConfig(moduleId) {
    return this.modules.get(moduleId) || null;
  }
  /**
   * 全モジュール設定を取得
   */
  getAllConfigs() {
    return Array.from(this.modules.values());
  }
  /**
   * カテゴリ別にモジュールを取得
   */
  getModulesByCategory(category) {
    return this.getAllConfigs().filter((config) => config.category === category);
  }
  /**
   * ページタイプ別にモジュールを取得
   */
  getModulesByPage(pageType) {
    return this.getAllConfigs().filter(
      (config) => config.targetPages.includes(pageType) || config.targetPages.includes(PageType.ALL)
    );
  }
  /**
   * モジュールが存在するかチェック
   */
  hasModule(moduleId) {
    return this.modules.has(moduleId);
  }
  /**
   * モジュールを削除
   */
  unregisterModule(moduleId) {
    if (this.modules.has(moduleId)) {
      this.modules.delete(moduleId);
      return true;
    }
    return false;
  }
  /**
   * 依存関係を持つモジュールを取得
   */
  getModulesWithDependencies() {
    return this.getAllConfigs().filter((config) => config.dependencies.length > 0);
  }
  /**
   * 特定の依存関係を持つモジュールを取得
   */
  getModulesByDependency(dependency) {
    return this.getAllConfigs().filter(
      (config) => config.dependencies.includes(dependency)
    );
  }
  /**
   * モジュール統計情報を取得
   */
  getStatistics() {
    const configs = this.getAllConfigs();
    const byCategory = {};
    const byPage = {};
    Object.values(ModuleCategory).forEach((category) => {
      byCategory[category] = configs.filter((c) => c.category === category).length;
    });
    Object.values(PageType).forEach((pageType) => {
      byPage[pageType] = configs.filter(
        (c) => c.targetPages.includes(pageType) || c.targetPages.includes(PageType.ALL)
      ).length;
    });
    return {
      total: configs.length,
      byCategory,
      byPage,
      withDependencies: this.getModulesWithDependencies().length
    };
  }
}

class PageDetectorImpl {
  getCurrentPageType() {
    const url = window.location.href;
    const pathname = window.location.pathname;
    if (pathname.includes("/watch/")) {
      return PageType.WATCH;
    } else if (pathname.includes("/search/")) {
      return PageType.SEARCH;
    } else if (pathname.includes("/tag/")) {
      return PageType.SEARCH;
    } else if (pathname.includes("/ranking/")) {
      return PageType.RANKING;
    } else if (url.includes("blog.nicovideo.jp")) {
      return PageType.NICO_INFO;
    }
    return PageType.ALL;
  }
  isTargetPage(targetPages) {
    const currentPage = this.getCurrentPageType();
    return targetPages.includes(currentPage) || targetPages.includes(PageType.ALL);
  }
}
class DependencyCheckerImpl {
  async checkDependencies(dependencies) {
    await Promise.resolve();
    for (const dependency of dependencies) {
      if (!this.getDependencyStatus(dependency)) {
        window.logger.warn(`[DependencyChecker] 依存関係 ${dependency} が見つかりません`);
        return false;
      }
    }
    return true;
  }
  getDependencyStatus(dependency) {
    try {
      if (dependency.startsWith("window.")) {
        const propPath = dependency.substring(7);
        const props = propPath.split(".");
        let obj = window;
        for (const prop of props) {
          if (obj && typeof obj === "object" && obj !== null && prop in obj) {
            obj = obj[prop];
          } else {
            return false;
          }
        }
        return obj !== void 0;
      }
      if (typeof window[dependency] === "function") {
        return true;
      }
      return false;
    } catch (error) {
      window.logger.error(`[DependencyChecker] 依存関係チェック中にエラー: ${dependency}`, error);
      return false;
    }
  }
}
class ModuleManager {
  constructor() {
    this.modules = /* @__PURE__ */ new Map();
    this.eventListeners = /* @__PURE__ */ new Set();
    this.isInitialized = false;
    this.settings = SettingsManager.getInstance();
    this.registry = ModuleRegistry.getInstance();
    this.pageDetector = new PageDetectorImpl();
    this.dependencyChecker = new DependencyCheckerImpl();
  }
  static getInstance() {
    if (!ModuleManager.instance) {
      ModuleManager.instance = new ModuleManager();
    }
    return ModuleManager.instance;
  }
  /**
   * モジュールマネージャーを初期化（最速化版）
   */
  async initialize() {
    if (this.isInitialized) {
      await Promise.resolve();
      return;
    }
    try {
      const currentPageType = this.pageDetector.getCurrentPageType();
      const targetModules = this.registry.getModulesByPage(currentPageType);
      const enabledModules = targetModules.filter(
        (config) => this.settings.isModuleEnabled(config.id)
      );
      const visualModules = enabledModules.filter(
        (config) => config.category === ModuleCategory.VISUAL
      );
      const otherModules = enabledModules.filter(
        (config) => config.category !== ModuleCategory.VISUAL
      );
      if (visualModules.length > 0) {
        const visualPromises = visualModules.map(
          (config) => this.loadModuleWithPriority(config.id, "VISUAL")
        );
        await Promise.all(visualPromises);
      }
      if (otherModules.length > 0) {
        const otherPromises = otherModules.map(
          (config) => this.loadModuleWithPriority(config.id, "NORMAL")
        );
        await Promise.allSettled(otherPromises);
      }
      this.isInitialized = true;
    } catch (error) {
      window.logger.error("[ModuleManager] 初期化中にエラーが発生しました:", error);
      throw error;
    }
  }
  /**
   * 優先度付きモジュール読み込み（新規追加）
   */
  async loadModuleWithPriority(moduleId, priority) {
    const startTime = performance.now();
    try {
      await this.loadModule(moduleId);
    } catch (error) {
      const endTime = performance.now();
      const loadTime = Math.round(endTime - startTime);
      window.logger.error(`[ModuleManager] ${priority}優先度モジュール ${moduleId} の読み込み失敗 (${loadTime}ms):`, error);
      if (priority === "VISUAL") {
        throw error;
      }
      window.logger.warn(`[ModuleManager] モジュール ${moduleId} の読み込みを続行します`);
    }
  }
  /**
   * モジュールを読み込み
   */
  async loadModule(moduleId) {
    try {
      if (this.modules.has(moduleId)) {
        return;
      }
      const config = this.registry.getConfig(moduleId);
      if (!config) {
        throw new Error(`モジュール ${moduleId} が見つかりません`);
      }
      if (!this.settings.isModuleEnabled(moduleId)) {
        return;
      }
      if (!this.pageDetector.isTargetPage(config.targetPages)) {
        return;
      }
      const dependenciesOk = await this.dependencyChecker.checkDependencies(config.dependencies);
      if (!dependenciesOk) {
        throw new Error(`モジュール ${moduleId} の依存関係が満たされていません`);
      }
      const moduleInstance = await this.createModuleInstance(config);
      await moduleInstance.initialize();
      this.modules.set(moduleId, moduleInstance);
      this.emitEvent({
        type: "loaded",
        moduleId,
        data: { config }
      });
    } catch (error) {
      window.logger.error(`[ModuleManager] モジュール ${moduleId} の読み込みに失敗しました:`, error);
      this.emitEvent({
        type: "error",
        moduleId,
        data: { error: error instanceof Error ? error.message : String(error) }
      });
      throw error;
    }
  }
  /**
   * モジュールを削除
   */
  async unloadModule(moduleId) {
    try {
      const moduleInstance = this.modules.get(moduleId);
      if (!moduleInstance) {
        await Promise.resolve();
        return;
      }
      moduleInstance.destroy();
      this.modules.delete(moduleId);
      this.emitEvent({
        type: "unloaded",
        moduleId
      });
    } catch (error) {
      window.logger.error(`[ModuleManager] モジュール ${moduleId} の削除に失敗しました:`, error);
      throw error;
    }
  }
  /**
   * モジュールの有効/無効を切り替え
   */
  async toggleModule(moduleId, enabled) {
    try {
      if (enabled) {
        await this.handleExclusiveGroup(moduleId);
        await this.loadModule(moduleId);
        this.emitEvent({ type: "enabled", moduleId });
      } else {
        await this.unloadModule(moduleId);
        this.emitEvent({ type: "disabled", moduleId });
      }
      this.settings.updateModuleEnabled(moduleId, enabled);
    } catch (error) {
      window.logger.error(`[ModuleManager] モジュール ${moduleId} の切り替えに失敗しました:`, error);
      throw error;
    }
  }
  /**
   * 🆕 新規追加: 排他グループの処理
   */
  async handleExclusiveGroup(moduleId) {
    const config = this.registry.getConfig(moduleId);
    if (!config || !config.exclusiveGroup) {
      return;
    }
    const allConfigs = this.registry.getAllConfigs();
    const sameGroupModules = allConfigs.filter(
      (c) => c.exclusiveGroup === config.exclusiveGroup && c.id !== moduleId
    );
    for (const otherModule of sameGroupModules) {
      if (this.settings.isModuleEnabled(otherModule.id)) {
        await this.unloadModule(otherModule.id);
        this.settings.updateModuleEnabled(otherModule.id, false);
        this.emitEvent({ type: "disabled", moduleId: otherModule.id });
      }
    }
  }
  /**
   * モジュールインスタンスを作成（最速化版）
   */
  async createModuleInstance(config) {
    try {
      await Promise.resolve();
      if (config.category === ModuleCategory.VISUAL) {
        let instance2;
        switch (config.id) {
          case "watch_background_selector": {
            const { WatchBackgroundSelectorModule } = await Promise.resolve().then(() => watchBackgroundSelectorModule);
            instance2 = new WatchBackgroundSelectorModule(config);
            break;
          }
          case "watch_matrix_background": {
            const { WatchMatrixBackgroundModule } = await Promise.resolve().then(() => watchMatrixBackgroundModule);
            instance2 = new WatchMatrixBackgroundModule(config);
            break;
          }
          default:
            throw new Error(`未知のビジュアル系モジュールID: ${config.id}`);
        }
        return instance2;
      }
      let instance;
      switch (config.id) {
        case "header_privacy": {
          const { HeaderModule } = await Promise.resolve().then(() => headerModule);
          instance = new HeaderModule(config);
          break;
        }
        case "search_eight_column": {
          const { SearchPageModule } = await Promise.resolve().then(() => searchPageModule);
          instance = new SearchPageModule(config);
          break;
        }
        case "nico_info_highlight": {
          const { NicoInfoPageModule } = await Promise.resolve().then(() => nicoInfoPageModule);
          instance = new NicoInfoPageModule(config);
          break;
        }
        case "watch_page": {
          const { WatchPageModule } = await Promise.resolve().then(() => watchPageModule);
          instance = new WatchPageModule();
          break;
        }
        case "watch_mylist_selector": {
          const { WatchMylistSelectorModule } = await Promise.resolve().then(() => watchMylistSelectorModule);
          instance = new WatchMylistSelectorModule(config);
          break;
        }
        case "thumbnails_filter": {
          const { ThumbnailsFilterModule } = await Promise.resolve().then(() => thumbnailsFilterModule);
          instance = new ThumbnailsFilterModule(config);
          break;
        }
        case "deleted_video_detector": {
          const { DeletedVideoDetectorModule } = await Promise.resolve().then(() => deletedVideoDetectorModule);
          instance = new DeletedVideoDetectorModule(config);
          break;
        }
        default:
          throw new Error(`未知のモジュールID: ${config.id}`);
      }
      return instance;
    } catch (error) {
      window.logger.error(`[ModuleManager] モジュール ${config.id} の作成に失敗しました:`, error);
      throw error;
    }
  }
  /**
   * プレースホルダーモジュールを作成
   */
  createPlaceholderModule(config) {
    return {
      config,
      async initialize() {
      },
      destroy() {
      },
      isActive() {
        return true;
      },
      getStatus() {
        return ModuleStatus.ACTIVE;
      }
    };
  }
  /**
   * 読み込み済みモジュール一覧を取得
   */
  getLoadedModules() {
    return Array.from(this.modules.keys());
  }
  /**
   * モジュールの状態を取得
   */
  getModuleStatus(moduleId) {
    const moduleInstance = this.modules.get(moduleId);
    if (moduleInstance) {
      return moduleInstance.getStatus();
    }
    const isEnabled = this.settings.isModuleEnabled(moduleId);
    return isEnabled ? ModuleStatus.LOADING : ModuleStatus.INACTIVE;
  }
  /**
   * イベントリスナーを追加
   */
  addEventListener(listener) {
    this.eventListeners.add(listener);
  }
  /**
   * イベントリスナーを削除
   */
  removeEventListener(listener) {
    this.eventListeners.delete(listener);
  }
  /**
   * イベントを発行
   */
  emitEvent(event) {
    this.eventListeners.forEach((listener) => {
      try {
        listener(event);
      } catch (error) {
        window.logger.error("[ModuleManager] イベントリスナーの実行中にエラーが発生しました:", error);
      }
    });
  }
  /**
   * 全モジュールを再読み込み
   */
  async reloadAllModules() {
    const loadedModules = this.getLoadedModules();
    for (const moduleId of loadedModules) {
      await this.unloadModule(moduleId);
    }
    this.isInitialized = false;
    await this.initialize();
  }
  /**
   * 現在のページタイプを取得
   */
  getCurrentPageType() {
    return this.pageDetector.getCurrentPageType();
  }
  /**
   * 読み込み済みモジュールのMapを取得（内部アクセス用）
   */
  getLoadedModulesMap() {
    return this.modules;
  }
}

const DB_NAME = "BackgroundImageSettingsDB";
const STORE_NAME = "backgroundImages";
const DB_VERSION = 2;
const METADATA_STORE_NAME = "metadata";
class BackgroundImageSettings {
  constructor() {
    this.db = null;
    this.persistenceEnabled = false;
    this.migrationStatus = "none";
    // デフォルト背景画像（既存のbgImages配列）
    this.DEFAULT_IMAGES = [
      {
        name: "Atelier Ryza 3",
        type: "url",
        data: 'url("/local/background-images/favorites/atelier-ryza-3.avif")'
      },
      {
        name: "Blue Archive - Sunaookami Shiroko",
        type: "url",
        data: 'url("/local/background-images/favorites/blue-archive-sunaookami-shiroko.avif")'
      },
      {
        name: "Final Fantasy VII - Tifa Lockhart",
        type: "url",
        data: 'url("/local/background-images/favorites/final-fantasy-vii-tifa-lockhart.avif")'
      },
      {
        name: "Genshin Impact",
        type: "url",
        data: 'url("/local/background-images/favorites/genshin-impact.avif")'
      },
      {
        name: "Huge Tits",
        type: "url",
        data: 'url("/local/background-images/favorites/huge-tits.avif")'
      },
      {
        name: "Nier Automata - 2B Cosplay",
        type: "url",
        data: 'url("/local/background-images/favorites/nier-automata-2b-cosplay.avif")'
      },
      {
        name: "Nude Big Tits",
        type: "url",
        data: 'url("/local/background-images/favorites/nude-big-tits.avif")'
      },
      {
        name: "Suzueda Komachi",
        type: "url",
        data: 'url("/local/background-images/favorites/suzueda-komachi.avif")'
      },
      {
        name: "Zenless Zone Zero - Ellen Joe",
        type: "url",
        data: 'url("/local/background-images/favorites/zenless-zone-zero-ellen-joe.avif")'
      }
    ];
    this.eventTarget = new EventTarget();
  }
  static getInstance() {
    if (!BackgroundImageSettings.instance) {
      BackgroundImageSettings.instance = new BackgroundImageSettings();
    }
    return BackgroundImageSettings.instance;
  }
  /**
   * イベントリスナーを追加
   */
  addEventListener(type, listener) {
    this.eventTarget.addEventListener(type, listener);
  }
  /**
   * イベントリスナーを削除
   */
  removeEventListener(type, listener) {
    this.eventTarget.removeEventListener(type, listener);
  }
  /**
   * イベントを発火
   */
  dispatchEvent(event) {
    this.eventTarget.dispatchEvent(event);
  }
  /**
   * 永続化ストレージの要求
   */
  async requestPersistentStorage() {
    try {
      if (navigator.storage && navigator.storage.persist) {
        const isPersistent = await navigator.storage.persist();
        this.persistenceEnabled = isPersistent;
        if (isPersistent) {
          window.logger.info("[BackgroundImageSettings] 永続化ストレージが有効になりました");
          this.dispatchEvent(new CustomEvent("persistenceEnabled", {
            detail: { enabled: true }
          }));
        } else {
          window.logger.warn("[BackgroundImageSettings] 永続化ストレージの要求が拒否されました");
        }
        return isPersistent;
      } else {
        window.logger.warn("[BackgroundImageSettings] 永続化ストレージAPIがサポートされていません");
        return false;
      }
    } catch (error) {
      window.logger.error("[BackgroundImageSettings] 永続化ストレージ要求でエラー:", error);
      return false;
    }
  }
  /**
   * ストレージ使用状況を取得
   */
  async getStorageUsage() {
    try {
      if (navigator.storage && navigator.storage.estimate) {
        const estimate = await navigator.storage.estimate();
        const persistent = await navigator.storage.persisted();
        return {
          usage: estimate.usage || 0,
          quota: estimate.quota || 0,
          persistent: persistent || false
        };
      }
      return { usage: 0, quota: 0, persistent: false };
    } catch (error) {
      window.logger.error("[BackgroundImageSettings] ストレージ使用状況取得エラー:", error);
      return { usage: 0, quota: 0, persistent: false };
    }
  }
  /**
   * データベースマイグレーション実行
   */
  async performMigration(db, oldVersion, newVersion) {
    try {
      this.migrationStatus = "inProgress";
      window.logger.info(`[BackgroundImageSettings] データベースマイグレーション開始: ${oldVersion} -> ${newVersion}`);
      if (oldVersion < 2) {
        if (!db.objectStoreNames.contains(METADATA_STORE_NAME)) {
          const _metadataStore = db.createObjectStore(METADATA_STORE_NAME, { keyPath: "key" });
          window.logger.info("[BackgroundImageSettings] メタデータストアを作成しました");
        }
        await this.saveMigrationMetadata(db, oldVersion, newVersion);
      }
      this.migrationStatus = "completed";
      window.logger.info("[BackgroundImageSettings] データベースマイグレーション完了");
      this.dispatchEvent(new CustomEvent("migrationCompleted", {
        detail: { oldVersion, newVersion }
      }));
    } catch (error) {
      this.migrationStatus = "failed";
      window.logger.error("[BackgroundImageSettings] マイグレーション失敗:", error);
      this.dispatchEvent(new CustomEvent("migrationFailed", {
        detail: { oldVersion, newVersion, error: error instanceof Error ? error.message : String(error) }
      }));
      throw error;
    }
  }
  /**
   * マイグレーション メタデータを保存
   */
  async saveMigrationMetadata(db, oldVersion, newVersion) {
    try {
      const transaction = db.transaction([METADATA_STORE_NAME], "readwrite");
      const store = transaction.objectStore(METADATA_STORE_NAME);
      const metadata = {
        key: "migrationHistory",
        migrations: [{
          fromVersion: oldVersion,
          toVersion: newVersion,
          migratedAt: (/* @__PURE__ */ new Date()).toISOString(),
          success: true
        }]
      };
      await new Promise((resolve, reject) => {
        const request = store.put(metadata);
        request.onsuccess = () => resolve();
        request.onerror = () => {
          const err = request.error;
          reject(new Error(err instanceof Error ? err.message : String(err)));
        };
      });
      window.logger.info("[BackgroundImageSettings] マイグレーションメタデータを保存しました");
    } catch (error) {
      window.logger.error("[BackgroundImageSettings] マイグレーションメタデータ保存エラー:", error);
    }
  }
  /**
   * データベースの整合性チェック
   */
  async validateDatabaseIntegrity() {
    try {
      const images = await this.getAllImages();
      for (const image of images) {
        if (!image.id || !image.name || !image.type || !image.data) {
          window.logger.warn(`[BackgroundImageSettings] 不正なデータを検出: ${image.id}`);
          return false;
        }
      }
      return true;
    } catch (error) {
      window.logger.error("[BackgroundImageSettings] データベース整合性チェック失敗:", error);
      return false;
    }
  }
  /**
   * 自動バックアップ作成
   */
  async createAutoBackup() {
    try {
      const backupData = await this.exportSettings();
      const timestamp = (/* @__PURE__ */ new Date()).toISOString();
      const backupKey = `autoBackup_${timestamp}`;
      try {
        localStorage.setItem(backupKey, backupData);
        await this.cleanupOldBackups();
        window.logger.info("[BackgroundImageSettings] 自動バックアップを作成しました");
      } catch (storageError) {
        window.logger.warn("[BackgroundImageSettings] ローカルストレージへのバックアップ保存に失敗:", storageError);
      }
    } catch (error) {
      window.logger.error("[BackgroundImageSettings] 自動バックアップ作成エラー:", error);
    }
  }
  /**
   * 古いバックアップをクリーンアップ
   */
  async cleanupOldBackups() {
    try {
      await Promise.resolve();
      const backupKeys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith("autoBackup_")) {
          backupKeys.push(key);
        }
      }
      backupKeys.sort((a, b) => {
        const dateA = a.replace("autoBackup_", "");
        const dateB = b.replace("autoBackup_", "");
        return dateB.localeCompare(dateA);
      });
      if (backupKeys.length > 5) {
        for (let i = 5; i < backupKeys.length; i++) {
          localStorage.removeItem(backupKeys[i]);
        }
        window.logger.info(`[BackgroundImageSettings] ${backupKeys.length - 5}個の古いバックアップを削除しました`);
      }
    } catch (error) {
      window.logger.error("[BackgroundImageSettings] バックアップクリーンアップエラー:", error);
    }
  }
  /**
   * IndexedDBを初期化
   */
  async initializeDB() {
    if (this.db) {
      return this.db;
    }
    await this.requestPersistentStorage();
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onerror = () => {
        window.logger.error("[BackgroundImageSettings] IndexedDBを開けませんでした");
        reject(new Error("IndexedDBを開けませんでした"));
      };
      request.onsuccess = async () => {
        this.db = request.result;
        const isValid = await this.validateDatabaseIntegrity();
        if (!isValid) {
          window.logger.warn("[BackgroundImageSettings] データベース整合性に問題があります");
        }
        await this.createAutoBackup();
        resolve(this.db);
      };
      request.onupgradeneeded = async (event) => {
        const db = request.result;
        const oldVersion = event.oldVersion;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
          store.createIndex("name", "name", { unique: false });
          store.createIndex("type", "type", { unique: false });
          store.createIndex("createdAt", "createdAt", { unique: false });
          store.createIndex("updatedAt", "updatedAt", { unique: false });
          window.logger.info("[BackgroundImageSettings] メインストアを作成しました");
        }
        if (!db.objectStoreNames.contains(METADATA_STORE_NAME)) {
          db.createObjectStore(METADATA_STORE_NAME, { keyPath: "key" });
          window.logger.info("[BackgroundImageSettings] メタデータストアを作成しました");
        }
        if (oldVersion > 0) {
          await this.performMigration(db, oldVersion, DB_VERSION);
        }
      };
    });
  }
  /**
   * 設定を初期化（デフォルト画像を追加）
   */
  async initializeSettings() {
    try {
      await this.initializeDB();
      const existingImages = await this.getAllImages();
      if (existingImages.length === 0) {
        for (const defaultImage of this.DEFAULT_IMAGES) {
          await this.addImage(defaultImage.name, defaultImage.type, defaultImage.data);
        }
        const images = await this.getAllImages();
        if (images.length > 0) {
          await this.setSelectedImage(images[0].id);
        }
      }
    } catch (error) {
      window.logger.error("[BackgroundImageSettings] 設定の初期化に失敗しました:", error);
      throw error;
    }
  }
  /**
   * 背景画像を追加
   */
  async addImage(name, type, data) {
    try {
      const db = await this.initializeDB();
      const transaction = db.transaction([STORE_NAME], "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const id = this.generateId();
      const now = (/* @__PURE__ */ new Date()).toISOString();
      const imageItem = {
        id,
        name,
        type,
        data,
        createdAt: now,
        updatedAt: now
      };
      return new Promise((resolve, reject) => {
        const request = store.add(imageItem);
        request.onsuccess = () => {
          this.dispatchEvent(new CustomEvent("imageAdded", {
            detail: { id, imageItem }
          }));
          resolve(id);
        };
        request.onerror = () => {
          window.logger.error(`[BackgroundImageSettings] 画像の追加に失敗しました: ${name}`);
          reject(new Error(`画像の追加に失敗しました: ${name}`));
        };
      });
    } catch (error) {
      window.logger.error("[BackgroundImageSettings] addImage エラー:", error);
      throw error;
    }
  }
  /**
   * 背景画像を更新
   */
  async updateImage(id, name, type, data) {
    try {
      const db = await this.initializeDB();
      const transaction = db.transaction([STORE_NAME], "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const getRequest = store.get(id);
      return new Promise((resolve, reject) => {
        getRequest.onsuccess = () => {
          const existingImage = getRequest.result;
          if (!existingImage) {
            reject(new Error(`画像が見つかりません: ${id}`));
            return;
          }
          const updatedImage = {
            ...existingImage,
            name,
            type,
            data,
            updatedAt: (/* @__PURE__ */ new Date()).toISOString()
          };
          const putRequest = store.put(updatedImage);
          putRequest.onsuccess = () => {
            resolve();
          };
          putRequest.onerror = () => {
            window.logger.error(`[BackgroundImageSettings] 画像の更新に失敗しました: ${name}`);
            reject(new Error(`画像の更新に失敗しました: ${name}`));
          };
        };
        getRequest.onerror = () => {
          reject(new Error(`画像の取得に失敗しました: ${id}`));
        };
      });
    } catch (error) {
      window.logger.error("[BackgroundImageSettings] updateImage エラー:", error);
      throw error;
    }
  }
  /**
   * 背景画像を削除
   */
  async deleteImage(id) {
    try {
      const db = await this.initializeDB();
      const transaction = db.transaction([STORE_NAME], "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      return new Promise((resolve, reject) => {
        const request = store.delete(id);
        request.onsuccess = () => {
          this.dispatchEvent(new CustomEvent("imageDeleted", {
            detail: { id }
          }));
          resolve();
        };
        request.onerror = () => {
          window.logger.error(`[BackgroundImageSettings] 画像の削除に失敗しました: ${id}`);
          reject(new Error(`画像の削除に失敗しました: ${id}`));
        };
      });
    } catch (error) {
      window.logger.error("[BackgroundImageSettings] deleteImage エラー:", error);
      throw error;
    }
  }
  /**
   * 全ての背景画像を取得
   */
  async getAllImages() {
    try {
      const db = await this.initializeDB();
      const transaction = db.transaction([STORE_NAME], "readonly");
      const store = transaction.objectStore(STORE_NAME);
      return new Promise((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => {
          resolve(request.result);
        };
        request.onerror = () => {
          window.logger.error("[BackgroundImageSettings] 画像の取得に失敗しました");
          reject(new Error("画像の取得に失敗しました"));
        };
      });
    } catch (error) {
      window.logger.error("[BackgroundImageSettings] getAllImages エラー:", error);
      throw error;
    }
  }
  /**
   * 特定の背景画像を取得
   */
  async getImage(id) {
    try {
      const db = await this.initializeDB();
      const transaction = db.transaction([STORE_NAME], "readonly");
      const store = transaction.objectStore(STORE_NAME);
      return new Promise((resolve, reject) => {
        const request = store.get(id);
        request.onsuccess = () => {
          const result = request.result;
          resolve(result || null);
        };
        request.onerror = () => {
          window.logger.error(`[BackgroundImageSettings] 画像の取得に失敗しました: ${id}`);
          reject(new Error(`画像の取得に失敗しました: ${id}`));
        };
      });
    } catch (error) {
      window.logger.error("[BackgroundImageSettings] getImage エラー:", error);
      throw error;
    }
  }
  /**
   * 選択中の背景画像IDを設定
   */
  async setSelectedImage(id, fireEvent = true) {
    try {
      await Promise.resolve();
      localStorage.setItem("selectedBackgroundImageId", id);
      if (fireEvent) {
        this.dispatchEvent(new CustomEvent("imageSelected", {
          detail: { id }
        }));
      }
    } catch (error) {
      window.logger.error("[BackgroundImageSettings] 選択画像の設定に失敗しました:", error);
      throw error;
    }
  }
  /**
   * 選択中の背景画像IDを取得
   */
  getSelectedImageId() {
    try {
      return localStorage.getItem("selectedBackgroundImageId");
    } catch (error) {
      window.logger.error("[BackgroundImageSettings] 選択画像の取得に失敗しました:", error);
      return null;
    }
  }
  /**
   * 選択中の背景画像を取得
   */
  async getSelectedImage() {
    try {
      const selectedId = this.getSelectedImageId();
      if (!selectedId) {
        return null;
      }
      return await this.getImage(selectedId);
    } catch (error) {
      window.logger.error("[BackgroundImageSettings] 選択画像の取得に失敗しました:", error);
      return null;
    }
  }
  /**
   * ファイルをbase64に変換
   */
  async fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result;
        resolve(result);
      };
      reader.onerror = () => {
        reject(new Error("ファイルの読み込みに失敗しました"));
      };
      reader.readAsDataURL(file);
    });
  }
  /**
   * URLの有効性をチェック
   */
  async validateImageUrl(url) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      setTimeout(() => resolve(false), 5e3);
      img.src = url;
    });
  }
  /**
   * ユニークIDを生成
   */
  generateId() {
    return `bg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  /**
   * バックアップリストを取得
   */
  getAvailableBackups() {
    try {
      const backups = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith("autoBackup_")) {
          const timestamp = key.replace("autoBackup_", "");
          const data = localStorage.getItem(key);
          const size = data ? data.length : 0;
          backups.push({ key, timestamp, size });
        }
      }
      backups.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
      return backups;
    } catch (error) {
      window.logger.error("[BackgroundImageSettings] バックアップリスト取得エラー:", error);
      return [];
    }
  }
  /**
   * バックアップからデータを復元
   */
  async restoreFromBackup(backupKey) {
    try {
      const backupData = localStorage.getItem(backupKey);
      if (!backupData) {
        throw new Error(`バックアップが見つかりません: ${backupKey}`);
      }
      window.logger.info(`[BackgroundImageSettings] バックアップからの復元を開始: ${backupKey}`);
      await this.createAutoBackup();
      await this.importSettings(backupData);
      window.logger.info("[BackgroundImageSettings] バックアップからの復元が完了しました");
      this.dispatchEvent(new CustomEvent("restoredFromBackup", {
        detail: { backupKey }
      }));
    } catch (error) {
      window.logger.error("[BackgroundImageSettings] バックアップ復元エラー:", error);
      throw error;
    }
  }
  /**
   * データベースの修復を試行
   */
  async repairDatabase() {
    try {
      window.logger.info("[BackgroundImageSettings] データベース修復を開始");
      this.closeDB();
      await this.initializeDB();
      const isValid = await this.validateDatabaseIntegrity();
      if (isValid) {
        window.logger.info("[BackgroundImageSettings] データベース修復が完了しました");
        this.dispatchEvent(new CustomEvent("databaseRepaired", {
          detail: { success: true }
        }));
        return true;
      } else {
        window.logger.warn("[BackgroundImageSettings] データベース修復に失敗、バックアップからの復元を試行");
        const backups = this.getAvailableBackups();
        if (backups.length > 0) {
          await this.restoreFromBackup(backups[0].key);
          return true;
        }
        window.logger.warn("[BackgroundImageSettings] バックアップが見つからない、デフォルト設定にリセット");
        await this.resetToDefaults();
        return true;
      }
    } catch (error) {
      window.logger.error("[BackgroundImageSettings] データベース修復エラー:", error);
      this.dispatchEvent(new CustomEvent("databaseRepaired", {
        detail: { success: false, error: error instanceof Error ? error.message : String(error) }
      }));
      return false;
    }
  }
  /**
   * マイグレーション履歴を取得
   */
  async getMigrationHistory() {
    try {
      if (!this.db) {
        await this.initializeDB();
      }
      const transaction = this.db.transaction([METADATA_STORE_NAME], "readonly");
      const store = transaction.objectStore(METADATA_STORE_NAME);
      return new Promise((resolve) => {
        const request = store.get("migrationHistory");
        request.onsuccess = () => {
          const result = request.result;
          const migrations = result?.migrations ?? [];
          resolve(migrations);
        };
        request.onerror = () => {
          window.logger.warn("[BackgroundImageSettings] マイグレーション履歴の取得に失敗");
          resolve([]);
        };
      });
    } catch (error) {
      window.logger.error("[BackgroundImageSettings] マイグレーション履歴取得エラー:", error);
      return [];
    }
  }
  /**
   * システム状態を取得
   */
  async getSystemStatus() {
    try {
      const storageUsage = await this.getStorageUsage();
      const integrityValid = await this.validateDatabaseIntegrity();
      const backups = this.getAvailableBackups();
      return {
        databaseVersion: DB_VERSION,
        persistenceEnabled: this.persistenceEnabled,
        migrationStatus: this.migrationStatus,
        storageUsage,
        integrityValid,
        backupCount: backups.length
      };
    } catch (error) {
      window.logger.error("[BackgroundImageSettings] システム状態取得エラー:", error);
      throw error;
    }
  }
  /**
   * データベースを閉じる
   */
  closeDB() {
    if (this.db) {
      this.db.close();
      this.db = null;
      window.logger.info("[BackgroundImageSettings] データベースを閉じました");
    }
  }
  /**
   * 設定をエクスポート
   */
  async exportSettings() {
    try {
      const images = await this.getAllImages();
      const selectedImageId = this.getSelectedImageId();
      const exportData = {
        version: "1.0.0",
        exportDate: (/* @__PURE__ */ new Date()).toISOString(),
        images,
        selectedImageId
      };
      return JSON.stringify(exportData, null, 2);
    } catch (error) {
      window.logger.error("[BackgroundImageSettings] 設定のエクスポートに失敗:", error);
      throw error;
    }
  }
  /**
   * ユニークなファイル名を生成（エクスポート用）
   */
  generateExportFilename() {
    const now = /* @__PURE__ */ new Date();
    const dateStr = now.toISOString().split("T")[0];
    const timeStr = now.toTimeString().split(" ")[0].replace(/:/g, "-");
    const randomStr = Math.random().toString(36).substr(2, 4);
    return `background-image-settings-${dateStr}_${timeStr}_${randomStr}.json`;
  }
  /**
   * 設定をインポート
   */
  async importSettings(jsonData) {
    try {
      const importData = JSON.parse(jsonData);
      const obj = importData;
      if (!Array.isArray(obj.images)) {
        throw new Error("無効なデータ形式です");
      }
      await this.clearAllImages();
      for (const imageData of obj.images) {
        const rec = imageData;
        if (typeof rec.id === "string" && typeof rec.name === "string" && (rec.type === "url" || rec.type === "file") && typeof rec.data === "string") {
          await this.addImageWithId(
            rec.id,
            rec.name,
            rec.type,
            rec.data,
            typeof rec.createdAt === "string" ? rec.createdAt : (/* @__PURE__ */ new Date()).toISOString(),
            typeof rec.updatedAt === "string" ? rec.updatedAt : (/* @__PURE__ */ new Date()).toISOString()
          );
        }
      }
      if (typeof obj.selectedImageId === "string") {
        await this.setSelectedImage(obj.selectedImageId, false);
      }
      this.dispatchEvent(new CustomEvent("settingsImported", {
        detail: { imageCount: obj.images.length }
      }));
    } catch (error) {
      window.logger.error("[BackgroundImageSettings] 設定のインポートに失敗:", error);
      throw error;
    }
  }
  /**
   * デフォルト設定に戻す
   */
  async resetToDefaults() {
    try {
      await this.clearAllImages();
      for (const defaultImage of this.DEFAULT_IMAGES) {
        await this.addImage(defaultImage.name, defaultImage.type, defaultImage.data);
      }
      const images = await this.getAllImages();
      if (images.length > 0) {
        await this.setSelectedImage(images[0].id, false);
      }
      this.dispatchEvent(new CustomEvent("settingsReset", {
        detail: { imageCount: this.DEFAULT_IMAGES.length }
      }));
    } catch (error) {
      window.logger.error("[BackgroundImageSettings] デフォルト設定への復元に失敗:", error);
      throw error;
    }
  }
  /**
   * 全ての画像を削除（内部用）
   */
  async clearAllImages() {
    try {
      const db = await this.initializeDB();
      const transaction = db.transaction([STORE_NAME], "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      return new Promise((resolve, reject) => {
        const request = store.clear();
        request.onsuccess = () => {
          resolve();
        };
        request.onerror = () => {
          window.logger.error("[BackgroundImageSettings] 画像の全削除に失敗しました");
          reject(new Error("画像の全削除に失敗しました"));
        };
      });
    } catch (error) {
      window.logger.error("[BackgroundImageSettings] clearAllImages エラー:", error);
      throw error;
    }
  }
  /**
   * 指定IDで画像を追加（インポート用）
   */
  async addImageWithId(id, name, type, data, createdAt, updatedAt) {
    try {
      const db = await this.initializeDB();
      const transaction = db.transaction([STORE_NAME], "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const imageItem = {
        id,
        name,
        type,
        data,
        createdAt,
        updatedAt
      };
      return new Promise((resolve, reject) => {
        const request = store.add(imageItem);
        request.onsuccess = () => {
          resolve();
        };
        request.onerror = () => {
          window.logger.error(`[BackgroundImageSettings] 画像の復元に失敗しました: ${name}`);
          reject(new Error(`画像の復元に失敗しました: ${name}`));
        };
      });
    } catch (error) {
      window.logger.error("[BackgroundImageSettings] addImageWithId エラー:", error);
      throw error;
    }
  }
}

class SettingsUI {
  constructor() {
    this.isInitialized = false;
    this.shadowRoot = null;
    this.moduleManager = ModuleManager.getInstance();
    this.moduleRegistry = ModuleRegistry.getInstance();
    this.settingsManager = SettingsManager.getInstance();
    this.backgroundSettings = BackgroundImageSettings.getInstance();
  }
  static getInstance() {
    if (!SettingsUI.instance) {
      SettingsUI.instance = new SettingsUI();
    }
    return SettingsUI.instance;
  }
  /**
   * 🆕 Shadow DOMルートを設定
   */
  setShadowRoot(shadowRoot) {
    this.shadowRoot = shadowRoot;
  }
  /**
   * 初期化ステータスを取得
   */
  getInitializationStatus() {
    return this.isInitialized;
  }
  /**
   * 設定UIを初期化
   */
  initialize() {
    if (this.isInitialized) return;
    if (!this.shadowRoot) {
      window.logger.warn("[SettingsUI] Shadow DOMが設定されていません。setShadowRoot()を先に呼び出してください。");
      return;
    }
    this.renderModuleList();
    this.setupEventListeners();
    this.moduleManager.addEventListener((event) => {
      if (event.type === "loaded" || event.type === "unloaded") {
        this.updateModuleStatus(event.moduleId);
        if (event.moduleId === "watch_page") {
          this.refreshWatchPageSubModules();
        }
      }
    });
    this.isInitialized = true;
  }
  /**
   * モジュール一覧をレンダリング
   */
  renderModuleList() {
    if (!this.shadowRoot) {
      window.logger.error("[SettingsUI] Shadow DOMが設定されていません");
      return;
    }
    const categories = Object.values(ModuleCategory);
    categories.forEach((category) => {
      const modules = this.moduleRegistry.getModulesByCategory(category);
      const container = this.shadowRoot.getElementById(`${category}-modules`);
      if (container) {
        container.innerHTML = "";
        modules.forEach((config) => {
          const moduleElement = this.createModuleElement(config);
          container.appendChild(moduleElement);
          if (config.id === "watch_page") {
            this.renderWatchPageSubModules(container);
          }
        });
        if (category === ModuleCategory.VISUAL) {
          this.addBackgroundImageSettingsButton(container);
        }
      } else {
        window.logger.warn(`[SettingsUI] カテゴリ ${category} のコンテナが見つかりません`);
      }
    });
  }
  /**
   * WatchPageModuleのサブモジュールをレンダリング
   */
  renderWatchPageSubModules(container) {
    const watchPageModule = this.moduleManager.getLoadedModulesMap().get("watch_page");
    if (watchPageModule) {
      const subModules = watchPageModule.getSubModules();
      const subContainer = document.createElement("div");
      subContainer.className = "sub-modules-container";
      subContainer.innerHTML = `
        <div class="sub-modules-header">
          <h6>${createMaterialIcon("movie", { style: "outlined", color: "white" })} Watch Page サブモジュール</h6>
          <span class="sub-modules-description">個別に有効/無効を切り替えできます</span>
        </div>
        <div class="sub-modules-list"></div>
      `;
      const subList = subContainer.querySelector(".sub-modules-list");
      subModules.forEach((subModule) => {
        const subElement = this.createSubModuleElement(subModule);
        subList.appendChild(subElement);
      });
      container.appendChild(subContainer);
    }
  }
  /**
   * モジュール要素を作成
   */
  createModuleElement(config) {
    if (!this.shadowRoot) {
      throw new Error("[SettingsUI] Shadow DOMが設定されていません");
    }
    const template = this.shadowRoot.getElementById("module-item-template");
    if (!template) {
      throw new Error("[SettingsUI] module-item-templateが見つかりません");
    }
    const element = template.content.cloneNode(true);
    const moduleItem = element.querySelector(".module-item");
    moduleItem.setAttribute("data-module-id", config.id);
    const icon = element.querySelector(".module-icon");
    icon.innerHTML = config.icon;
    const name = element.querySelector(".module-name");
    name.textContent = config.name;
    const description = element.querySelector(".module-description");
    description.textContent = config.description;
    const version = element.querySelector(".module-version");
    version.textContent = `v${config.version}`;
    const pages = element.querySelector(".module-pages");
    pages.textContent = config.targetPages.join(", ");
    const exclusiveGroup = element.querySelector(".module-exclusive-group");
    if (config.exclusiveGroup) {
      exclusiveGroup.textContent = `排他: ${config.exclusiveGroup}`;
      exclusiveGroup.style.display = "inline";
    } else {
      exclusiveGroup.style.display = "none";
    }
    const status = element.querySelector(".module-status");
    const moduleStatus = this.moduleManager.getModuleStatus(config.id);
    status.textContent = this.getStatusText(moduleStatus);
    status.className = `module-status ${moduleStatus.toLowerCase()}`;
    const toggle = element.querySelector(".module-toggle");
    toggle.checked = this.settingsManager.isModuleEnabled(config.id);
    return moduleItem;
  }
  /**
   * サブモジュール要素を作成
   */
  createSubModuleElement(subModule) {
    const element = document.createElement("div");
    element.className = "sub-module-item";
    element.setAttribute("data-sub-module-id", subModule.id);
    element.innerHTML = `
      <div class="sub-module-info">
        <div class="sub-module-details">
          <h6 class="sub-module-name">${subModule.name}</h6>
          <p class="sub-module-description">${subModule.description}</p>
          <div class="sub-module-status ${subModule.isActive() ? "active" : "inactive"}">
            ${subModule.isActive() ? "🟢 アクティブ" : "🔴 非アクティブ"}
          </div>
        </div>
      </div>
      <label class="toggle-switch sub-toggle">
        <input type="checkbox" class="sub-module-toggle" ${subModule.enabled ? "checked" : ""}>
        <span class="slider"></span>
      </label>
    `;
    return element;
  }
  /**
   * イベントリスナーを設定
   */
  setupEventListeners() {
    if (!this.shadowRoot) {
      window.logger.error("[SettingsUI] Shadow DOMが設定されていません");
      return;
    }
    this.shadowRoot.addEventListener("change", (event) => {
      const target = event.target;
      if (target.classList.contains("module-toggle")) {
        void this.handleModuleToggle(target);
      } else if (target.classList.contains("sub-module-toggle")) {
        void this.handleSubModuleToggle(target);
      }
    });
    this.setupActionButtons();
  }
  /**
   * モジュールトグルを処理
   */
  async handleModuleToggle(toggle) {
    const moduleItem = toggle.closest(".module-item");
    const moduleId = moduleItem.getAttribute("data-module-id");
    if (!moduleId) return;
    try {
      await this.moduleManager.toggleModule(moduleId, toggle.checked);
      this.updateModuleStatus(moduleId);
      if (moduleId === "watch_page") {
        this.refreshWatchPageSubModules();
      }
    } catch (error) {
      window.logger.error(`[SettingsUI] モジュール ${moduleId} の切り替えに失敗:`, error);
      toggle.checked = !toggle.checked;
      window.toastr?.error(
        `モジュール ${moduleId} の切り替えに失敗しました`,
        "エラー",
        { timeOut: 5e3 }
      );
    }
  }
  /**
   * サブモジュールトグルを処理
   */
  async handleSubModuleToggle(toggle) {
    const subModuleItem = toggle.closest(".sub-module-item");
    const subModuleId = subModuleItem.getAttribute("data-sub-module-id");
    if (!subModuleId) return;
    try {
      const watchPageModule = this.moduleManager.getLoadedModulesMap().get("watch_page");
      if (watchPageModule) {
        await watchPageModule.toggleSubModule(subModuleId, toggle.checked);
        this.updateSubModuleStatus(subModuleId);
      }
    } catch (error) {
      window.logger.error(`[SettingsUI] サブモジュール ${subModuleId} の切り替えに失敗:`, error);
      toggle.checked = !toggle.checked;
      window.toastr?.error(
        `サブモジュール ${subModuleId} の切り替えに失敗しました`,
        "エラー",
        { timeOut: 5e3 }
      );
    }
  }
  /**
   * アクションボタンを設定
   */
  setupActionButtons() {
    if (!this.shadowRoot) {
      window.logger.error("[SettingsUI] Shadow DOMが設定されていません");
      return;
    }
    const applyBtn = this.shadowRoot.getElementById("apply-immediately");
    if (applyBtn) {
      applyBtn.addEventListener("click", () => {
        void (async () => {
          try {
            await this.moduleManager.reloadAllModules();
            this.renderModuleList();
            window.toastr?.success(
              "モジュールを再読み込みしました",
              "成功",
              { timeOut: 3e3 }
            );
          } catch (error) {
            window.logger.error("[SettingsUI] モジュール再読み込みに失敗:", error);
            window.toastr?.error(
              "モジュール再読み込みに失敗しました",
              "エラー",
              { timeOut: 5e3 }
            );
          }
        })();
      });
    }
    const reloadBtn = this.shadowRoot.getElementById("reload-and-apply");
    if (reloadBtn) {
      reloadBtn.addEventListener("click", () => {
        window.location.reload();
      });
    }
    const exportBtn = this.shadowRoot.getElementById("export-settings");
    if (exportBtn) {
      exportBtn.addEventListener("click", () => {
        void this.exportSettings();
      });
    }
    const importBtn = this.shadowRoot.getElementById("import-settings");
    if (importBtn) {
      importBtn.addEventListener("click", () => {
        void this.importSettings();
      });
    }
    const resetBtn = this.shadowRoot.getElementById("reset-settings");
    if (resetBtn) {
      resetBtn.addEventListener("click", () => {
        void this.resetSettings();
      });
    }
  }
  /**
   * モジュールステータスを更新
   */
  updateModuleStatus(moduleId) {
    if (!this.shadowRoot) return;
    const moduleItem = this.shadowRoot.querySelector(`[data-module-id="${moduleId}"]`);
    if (moduleItem) {
      const status = moduleItem.querySelector(".module-status");
      const moduleStatus = this.moduleManager.getModuleStatus(moduleId);
      status.textContent = this.getStatusText(moduleStatus);
      status.className = `module-status ${moduleStatus.toLowerCase()}`;
    }
  }
  /**
   * サブモジュールステータスを更新
   */
  updateSubModuleStatus(subModuleId) {
    if (!this.shadowRoot) return;
    const subModuleItem = this.shadowRoot.querySelector(`[data-sub-module-id="${subModuleId}"]`);
    if (subModuleItem) {
      const watchPageModule = this.moduleManager.getLoadedModulesMap().get("watch_page");
      if (watchPageModule) {
        const subModule = watchPageModule.getSubModules().find((sub) => sub.id === subModuleId);
        if (subModule) {
          const status = subModuleItem.querySelector(".sub-module-status");
          const isActive = subModule.isActive();
          status.textContent = isActive ? "🟢 アクティブ" : "🔴 非アクティブ";
          status.className = `sub-module-status ${isActive ? "active" : "inactive"}`;
        }
      }
    }
  }
  /**
   * WatchPageサブモジュール表示を更新
   */
  refreshWatchPageSubModules() {
    if (!this.shadowRoot) return;
    const functionalityContainer = this.shadowRoot.getElementById("functionality-modules");
    if (functionalityContainer) {
      const existingSubContainer = functionalityContainer.querySelector(".sub-modules-container");
      if (existingSubContainer) {
        existingSubContainer.remove();
      }
      if (this.settingsManager.isModuleEnabled("watch_page")) {
        this.renderWatchPageSubModules(functionalityContainer);
      }
    }
  }
  /**
   * ステータステキストを取得
   */
  getStatusText(status) {
    switch (status) {
      case ModuleStatus.ACTIVE:
        return "🟢 アクティブ";
      case ModuleStatus.INACTIVE:
        return "🔴 非アクティブ";
      case ModuleStatus.LOADING:
        return "🟡 読み込み中";
      case ModuleStatus.ERROR:
        return "🔴 エラー";
      default:
        return "❓ 不明";
    }
  }
  /**
   * 設定をエクスポート
   */
  exportSettings() {
    try {
      const settings = this.settingsManager.exportSettings();
      const blob = new Blob([JSON.stringify(settings, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = this.generateExportFilename("module-settings");
      a.click();
      URL.revokeObjectURL(url);
      window.toastr?.success(
        "設定をエクスポートしました",
        "成功",
        { timeOut: 3e3 }
      );
    } catch (error) {
      window.logger.error("[SettingsUI] 設定エクスポートに失敗:", error);
      window.toastr?.error(
        "設定エクスポートに失敗しました",
        "エラー",
        { timeOut: 5e3 }
      );
    }
  }
  /**
   * 設定をインポート
   */
  importSettings() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = (event) => {
      const file = event.target.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const text = e.target?.result;
            const parsed = JSON.parse(text);
            if (typeof parsed === "string") {
              this.settingsManager.importSettings(parsed);
            } else {
              this.settingsManager.importSettings(JSON.stringify(parsed));
            }
            this.renderModuleList();
            window.toastr?.success(
              "設定をインポートしました",
              "成功",
              { timeOut: 3e3 }
            );
          } catch (error) {
            window.logger.error("[SettingsUI] 設定インポートに失敗:", error);
            window.toastr?.error(
              "設定インポートに失敗しました",
              "エラー",
              { timeOut: 5e3 }
            );
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  }
  /**
   * 設定をリセット
   */
  resetSettings() {
    if (confirm("すべての設定をリセットしますか？この操作は元に戻せません。")) {
      try {
        this.settingsManager.resetSettings();
        this.renderModuleList();
        window.toastr?.success(
          "設定をリセットしました",
          "成功",
          { timeOut: 3e3 }
        );
      } catch (error) {
        window.logger.error("[SettingsUI] 設定リセットに失敗:", error);
        window.toastr?.error(
          "設定リセットに失敗しました",
          "エラー",
          { timeOut: 5e3 }
        );
      }
    }
  }
  /**
   * ユニークなファイル名を生成（エクスポート用）
   */
  generateExportFilename(prefix) {
    const now = /* @__PURE__ */ new Date();
    const dateStr = now.toISOString().split("T")[0];
    const timeStr = now.toTimeString().split(" ")[0].replace(/:/g, "-");
    const randomStr = Math.random().toString(36).substr(2, 4);
    return `${prefix}-${dateStr}_${timeStr}_${randomStr}.json`;
  }
  /**
   * 背景画像設定ボタンを追加
   */
  addBackgroundImageSettingsButton(container) {
    const settingsButton = document.createElement("div");
    settingsButton.className = "module-item";
    settingsButton.innerHTML = `
      <div class="module-header">
        <div class="module-info">
          <div class="module-icon">${createMaterialIcon("image", { style: "outlined", color: "white" })}</div>
          <div class="module-details">
            <h3 class="module-name">背景画像設定</h3>
            <p class="module-description">動画の背景画像を設定します</p>
          </div>
        </div>
        <div class="module-meta">
          <div class="module-metadata">
            <span class="module-version">v1.0.0</span>
            <span class="module-pages">Watch Page</span>
            <span class="module-status">${createMaterialIcon("build", { style: "outlined", color: "white" })} 設定</span>
          </div>
        </div>
      </div>
      <button class="settings-btn" id="open-background-settings">${createMaterialIcon("settings", { style: "outlined", color: "white" })} 設定</button>
    `;
    container.appendChild(settingsButton);
    const openButton = settingsButton.querySelector("#open-background-settings");
    openButton?.addEventListener("click", () => {
      void this.openBackgroundImageSettings();
    });
  }
  /**
   * 背景画像設定画面を開く
   */
  async openBackgroundImageSettings() {
    try {
      await this.backgroundSettings.initializeSettings();
      this.createBackgroundSettingsModal();
    } catch (error) {
      window.logger.error("[SettingsUI] 背景画像設定の初期化に失敗:", error);
      window.toastr?.error(
        "背景画像設定の初期化に失敗しました",
        "エラー",
        { timeOut: 5e3 }
      );
    }
  }
  /**
   * 背景画像設定モーダルを作成
   */
  createBackgroundSettingsModal() {
    if (!this.shadowRoot) return;
    const existingModal = this.shadowRoot.getElementById("background-settings-modal");
    if (existingModal) {
      existingModal.remove();
    }
    const modal = document.createElement("div");
    modal.id = "background-settings-modal";
    modal.className = "modal-overlay";
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h3>${createMaterialIcon("image", { style: "outlined", color: "white" })} 背景画像設定</h3>
          <button class="close-modal-btn">×</button>
        </div>
        
        <div class="modal-body">
          <div class="settings-section">
            <h4>${createMaterialIcon("edit", { style: "outlined", color: "white" })} 方法1: URL入力</h4>
            <div class="url-input-section">
              <input type="text" id="modal-image-url-input" placeholder="画像URLを入力してください" />
              <input type="text" id="modal-image-name-input" placeholder="画像名を入力してください" />
              <button id="modal-add-url-image" class="add-btn">URL画像を追加</button>
            </div>
          </div>
          
          <div class="settings-section">
            <h4>${createMaterialIcon("folder", { style: "outlined", color: "white" })} 方法2: ファイル選択</h4>
            <div class="file-input-section">
              <input type="file" id="modal-image-file-input" accept="image/*" />
              <input type="text" id="modal-file-name-input" placeholder="画像名を入力してください" />
              <button id="modal-add-file-image" class="add-btn">ファイル画像を追加</button>
            </div>
          </div>
          
          <div class="settings-section">
            <h4>${createMaterialIcon("list", { style: "outlined", color: "white" })} 登録済み画像一覧</h4>
            <div id="modal-image-list" class="image-list"></div>
          </div>

          <div class="settings-section">
            <h4>${createMaterialIcon("build", { style: "outlined", color: "white" })} 設定管理</h4>
            <div class="settings-management">
              <button id="modal-export-settings" class="management-btn export">${createMaterialIcon("upload", { style: "outlined", color: "white" })} 設定をエクスポート</button>
              <button id="modal-import-settings" class="management-btn import">${createMaterialIcon("download", { style: "outlined", color: "white" })} 設定をインポート</button>
              <button id="modal-reset-settings" class="management-btn reset">${createMaterialIcon("refresh", { style: "filled", color: "white" })} デフォルトに戻す</button>
              <input type="file" id="modal-import-file-input" accept=".json" style="display: none;" />
            </div>
          </div>
        </div>
        
        <div class="modal-footer">
          <button class="modal-btn secondary" id="close-background-modal">閉じる</button>
        </div>
      </div>
    `;
    this.shadowRoot.appendChild(modal);
    this.setupBackgroundModalEventListeners();
    void this.refreshModalImageList();
  }
  /**
   * 背景画像設定モーダルのイベントリスナーを設定
   */
  setupBackgroundModalEventListeners() {
    if (!this.shadowRoot) return;
    const modal = this.shadowRoot.getElementById("background-settings-modal");
    if (!modal) return;
    const closeButtons = modal.querySelectorAll(".close-modal-btn, #close-background-modal");
    closeButtons.forEach((button) => {
      button.addEventListener("click", () => {
        modal.remove();
      });
    });
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });
    modal.addEventListener("keydown", (e) => {
      e.stopPropagation();
    });
    modal.addEventListener("keyup", (e) => {
      e.stopPropagation();
    });
    modal.addEventListener("keypress", (e) => {
      e.stopPropagation();
    });
    const addUrlButton = modal.querySelector("#modal-add-url-image");
    addUrlButton?.addEventListener("click", () => {
      void this.addModalImageFromUrl();
    });
    const addFileButton = modal.querySelector("#modal-add-file-image");
    addFileButton?.addEventListener("click", () => {
      void this.addModalImageFromFile();
    });
    const urlInput = modal.querySelector("#modal-image-url-input");
    const nameInput = modal.querySelector("#modal-image-name-input");
    [urlInput, nameInput].forEach((input) => {
      input?.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
          void this.addModalImageFromUrl();
        }
      });
    });
    const fileNameInput = modal.querySelector("#modal-file-name-input");
    fileNameInput?.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        void this.addModalImageFromFile();
      }
    });
    const exportButton = modal.querySelector("#modal-export-settings");
    exportButton?.addEventListener("click", () => {
      void this.exportModalSettings();
    });
    const importButton = modal.querySelector("#modal-import-settings");
    importButton?.addEventListener("click", () => {
      const fileInput = modal.querySelector("#modal-import-file-input");
      fileInput.click();
    });
    const importFileInput = modal.querySelector("#modal-import-file-input");
    importFileInput?.addEventListener("change", (e) => {
      const target = e.target;
      const file = target.files?.[0];
      if (file) {
        void this.importModalSettings(file);
      }
    });
    const resetButton = modal.querySelector("#modal-reset-settings");
    resetButton?.addEventListener("click", () => {
      void this.resetModalSettings();
    });
  }
  /**
   * モーダルでURL画像を追加
   */
  async addModalImageFromUrl() {
    if (!this.shadowRoot) return;
    const modal = this.shadowRoot.getElementById("background-settings-modal");
    if (!modal) return;
    const urlInput = modal.querySelector("#modal-image-url-input");
    const nameInput = modal.querySelector("#modal-image-name-input");
    const url = urlInput.value.trim();
    const name = nameInput.value.trim();
    if (!url) {
      window.toastr?.warning("URLを入力してください", "入力エラー");
      return;
    }
    if (!name) {
      window.toastr?.warning("画像名を入力してください", "入力エラー");
      return;
    }
    try {
      let imageUrl = url;
      if (!url.startsWith("url(")) {
        imageUrl = `url("${url}")`;
      }
      const isValid = await this.backgroundSettings.validateImageUrl(url);
      if (!isValid) {
        const proceed = confirm("画像URLの検証に失敗しました。それでも追加しますか？");
        if (!proceed) return;
      }
      await this.backgroundSettings.addImage(name, "url", imageUrl);
      urlInput.value = "";
      nameInput.value = "";
      await this.refreshModalImageList();
      window.toastr?.success(`画像「${name}」を追加しました`, "成功");
    } catch (error) {
      window.logger.error("[SettingsUI] URL画像の追加に失敗:", error);
      window.toastr?.error("画像の追加に失敗しました", "エラー");
    }
  }
  /**
   * モーダルでファイル画像を追加
   */
  async addModalImageFromFile() {
    if (!this.shadowRoot) return;
    const modal = this.shadowRoot.getElementById("background-settings-modal");
    if (!modal) return;
    const fileInput = modal.querySelector("#modal-image-file-input");
    const nameInput = modal.querySelector("#modal-file-name-input");
    const file = fileInput.files?.[0];
    const name = nameInput.value.trim();
    if (!file) {
      window.toastr?.warning("ファイルを選択してください", "入力エラー");
      return;
    }
    if (!name) {
      window.toastr?.warning("画像名を入力してください", "入力エラー");
      return;
    }
    try {
      const base64Data = await this.backgroundSettings.fileToBase64(file);
      await this.backgroundSettings.addImage(name, "file", base64Data);
      fileInput.value = "";
      nameInput.value = "";
      await this.refreshModalImageList();
      window.toastr?.success(`画像「${name}」を追加しました`, "成功");
    } catch (error) {
      window.logger.error("[SettingsUI] ファイル画像の追加に失敗:", error);
      window.toastr?.error("画像の追加に失敗しました", "エラー");
    }
  }
  /**
   * モーダルの画像リストを更新
   */
  async refreshModalImageList() {
    if (!this.shadowRoot) return;
    const imageListContainer = this.shadowRoot.getElementById("modal-image-list");
    if (!imageListContainer) return;
    try {
      const savedImages = await this.backgroundSettings.getAllImages();
      const currentImageId = this.backgroundSettings.getSelectedImageId();
      if (savedImages.length === 0) {
        imageListContainer.innerHTML = '<p class="no-images-message">登録されている画像がありません</p>';
        return;
      }
      imageListContainer.innerHTML = "";
      savedImages.forEach((image) => {
        const imageItem = document.createElement("div");
        imageItem.className = `image-item ${image.id === currentImageId ? "selected" : ""}`;
        let imageSrc;
        if (image.type === "url") {
          imageSrc = image.data.replace(/^url\(["']?|["']?\)$/g, "");
        } else {
          imageSrc = image.data;
        }
        imageItem.innerHTML = `
          <div class="image-preview">
            <img src="${imageSrc}" alt="${image.name}" loading="lazy" />
          </div>
          <div class="image-info">
            <h5 class="image-name">${image.name}</h5>
            <p class="image-type">${image.type}</p>
            <p class="image-date">${new Date(image.createdAt).toLocaleDateString("ja-JP")}</p>
          </div>
          <div class="image-actions">
            <button class="image-select-btn" data-image-id="${image.id}" title="この画像を使用">
              ${image.id === currentImageId ? createMaterialIcon("check_circle", { style: "filled", color: "green" }) : createMaterialIcon("radio_button_unchecked", { style: "outlined", color: "white" })}
            </button>
            <button class="image-delete-btn" data-image-id="${image.id}" title="画像を削除">
              ${createMaterialIcon("delete_outline", { style: "outlined", color: "white" })}
            </button>
          </div>
        `;
        imageListContainer.appendChild(imageItem);
      });
      this.setupModalImageListEventListeners();
    } catch (error) {
      window.logger.error("[SettingsUI] 画像リストの更新に失敗:", error);
      imageListContainer.innerHTML = '<p class="error-message">画像リストの読み込みに失敗しました</p>';
    }
  }
  /**
   * モーダルの画像リストのイベントリスナーを設定
   */
  setupModalImageListEventListeners() {
    if (!this.shadowRoot) return;
    const modal = this.shadowRoot.getElementById("background-settings-modal");
    if (!modal) return;
    const selectButtons = modal.querySelectorAll(".image-select-btn");
    selectButtons.forEach((button) => {
      button.addEventListener("click", (e) => {
        void (async () => {
          const target = e.target;
          const selectButton = target.closest(".image-select-btn");
          const imageId = selectButton?.getAttribute("data-image-id");
          if (imageId) {
            await this.selectModalImage(imageId);
          }
        })();
      });
    });
    const deleteButtons = modal.querySelectorAll(".image-delete-btn");
    deleteButtons.forEach((button) => {
      button.addEventListener("click", (e) => {
        void (async () => {
          const target = e.target;
          const deleteButton = target.closest(".image-delete-btn");
          const imageId = deleteButton?.getAttribute("data-image-id");
          if (imageId) {
            await this.deleteModalImage(imageId);
          }
        })();
      });
    });
  }
  /**
   * モーダルで画像を選択
   */
  async selectModalImage(imageId) {
    try {
      const image = await this.backgroundSettings.getImage(imageId);
      if (image) {
        await this.backgroundSettings.setSelectedImage(imageId);
        let backgroundValue;
        if (image.type === "url") {
          backgroundValue = image.data;
        } else if (image.type === "file") {
          backgroundValue = `url(${image.data})`;
        } else {
          return;
        }
        document.documentElement.style.setProperty("--bg-img", backgroundValue);
        await this.refreshModalImageList();
        window.toastr?.success(`背景画像を「${image.name}」に変更しました`, "成功");
      }
    } catch (error) {
      window.logger.error("[SettingsUI] 画像の選択に失敗:", error);
      window.toastr?.error("画像の選択に失敗しました", "エラー");
    }
  }
  /**
   * モーダルで画像を削除
   */
  async deleteModalImage(imageId) {
    try {
      const image = await this.backgroundSettings.getImage(imageId);
      if (!image) return;
      const confirmed = confirm(`画像「${image.name}」を削除しますか？`);
      if (!confirmed) return;
      await this.backgroundSettings.deleteImage(imageId);
      await this.refreshModalImageList();
      window.toastr?.success(`画像「${image.name}」を削除しました`, "成功");
    } catch (error) {
      window.logger.error("[SettingsUI] 画像の削除に失敗:", error);
      window.toastr?.error("画像の削除に失敗しました", "エラー");
    }
  }
  /**
   * モーダルで設定をエクスポート
   */
  async exportModalSettings() {
    try {
      const settingsData = await this.backgroundSettings.exportSettings();
      const blob = new Blob([settingsData], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = this.backgroundSettings.generateExportFilename();
      a.click();
      URL.revokeObjectURL(url);
      window.toastr?.success(
        "背景画像設定をエクスポートしました",
        "成功",
        { timeOut: 3e3 }
      );
    } catch (error) {
      window.logger.error("[SettingsUI] 背景画像設定エクスポートに失敗:", error);
      window.toastr?.error(
        "背景画像設定エクスポートに失敗しました",
        "エラー",
        { timeOut: 5e3 }
      );
    }
  }
  /**
   * モーダルで設定をインポート
   */
  async importModalSettings(file) {
    try {
      await Promise.resolve();
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const settingsData = e.target?.result;
          await this.backgroundSettings.importSettings(settingsData);
          await this.refreshModalImageList();
          window.toastr?.success(
            "背景画像設定をインポートしました",
            "成功",
            { timeOut: 3e3 }
          );
        } catch (importError) {
          window.logger.error("[SettingsUI] インポートデータの処理に失敗:", importError);
          window.toastr?.error(
            "インポートデータの処理に失敗しました",
            "エラー",
            { timeOut: 5e3 }
          );
        }
      };
      reader.readAsText(file);
    } catch (error) {
      window.logger.error("[SettingsUI] 背景画像設定インポートに失敗:", error);
      window.toastr?.error(
        "背景画像設定インポートに失敗しました",
        "エラー",
        { timeOut: 5e3 }
      );
    }
  }
  /**
   * モーダルで設定をリセット
   */
  async resetModalSettings() {
    if (confirm("背景画像設定をデフォルトに戻しますか？現在の設定は全て削除されます。")) {
      try {
        await this.backgroundSettings.resetToDefaults();
        await this.refreshModalImageList();
        window.toastr?.success(
          "背景画像設定をデフォルトに戻しました",
          "成功",
          { timeOut: 3e3 }
        );
      } catch (error) {
        window.logger.error("[SettingsUI] 背景画像設定リセットに失敗:", error);
        window.toastr?.error(
          "背景画像設定リセットに失敗しました",
          "エラー",
          { timeOut: 5e3 }
        );
      }
    }
  }
}

function panelTemplate() {
  return `
<button id="fab"></button>
<div class="panel">
  <nav>
    <button data-tab="playback" data-active>${createMaterialIcon("play_arrow", { style: "outlined", classes: "tab-icon", color: "white" })}</button>
    <button data-tab="volume">${createMaterialIcon("volume_up", { style: "outlined", classes: "tab-icon", color: "white" })}</button>
    <button data-tab="speed">${createMaterialIcon("speed", { style: "outlined", classes: "tab-icon", color: "white" })}</button>
    <button data-tab="comments">${createMaterialIcon("comment", { style: "outlined", classes: "tab-icon", color: "white" })}</button>
    <button data-tab="links">${createMaterialIcon("link", { style: "outlined", classes: "tab-icon", color: "white" })}</button>
    <button data-tab="settings">${createMaterialIcon("settings", { style: "outlined", classes: "tab-icon", color: "white" })}</button>
  </nav>

  <div id="playback" class="tab active">
    <!-- playback.htmlの内容がここに挿入されます -->
  </div>

  <div id="volume" class="tab">
    <!-- volume.htmlの内容がここに挿入されます -->
  </div>

  <div id="speed" class="tab">
    <!-- speed.htmlの内容がここに挿入されます -->
  </div>

  <div id="comments" class="tab">
    <!-- comments.htmlの内容がここに挿入されます -->
  </div>

  <div id="links" class="tab">
    <!-- links.htmlの内容がここに挿入されます -->
  </div>

  <div id="settings" class="tab">
    <!-- settings.htmlの内容がここに挿入されます -->
  </div>
</div>
`;
}

const linksTemplate = `
<div id="custom" class="subtab active">
  <div class="card-container">
    <!-- カスタムリンクがここに挿入されます -->
  </div>
</div>

<div id="services" class="subtab">
  <div class="card-container">
    <!-- 関連サービスのリンクがここに挿入されます -->
  </div>
</div>

<div id="dataManagement" class="subtab">
  <div class="card-container">
    <!-- データ管理のリンクがここに挿入されます -->
  </div>
</div>
<nav>
      <button data-subtab="custom" data-active>${createMaterialIcon("edit", { style: "outlined", classes: "subtab-icon", color: "white" })}</button>
    <button data-subtab="services">${createMaterialIcon("language", { style: "outlined", classes: "subtab-icon", color: "white" })}</button>
    <button data-subtab="dataManagement">${createMaterialIcon("storage", { style: "outlined", classes: "subtab-icon", color: "white" })}</button>
</nav>

`;

const commentsTemplate = `
<div class="comment-search-control">
  <input type="text" class="comment-search-input" placeholder="コメントを検索...">
  <div class="comment-search-options">
    <div class="option-group">
      <input type="checkbox" id="regex-toggle" class="regex-toggle">
      <label for="regex-toggle">正規表現</label>
    </div>
    <div class="option-group">
      <input type="checkbox" id="extended-toggle" class="extended-toggle">
      <label for="extended-toggle">詳細表示</label>
    </div>
  </div>
  <div class="comment-search-buttons">
    <button class="search-btn">検索</button>
    <button class="clear-btn">クリア</button>
  </div>
</div>

<div class="search-results">
  <!-- 検索結果がここに表示されます -->
  <div class="no-results">コメントを検索してください</div>
</div>
`;

const playbackTemplate = `
<div class="playback-content">
  <div class="tracker-control">
    <span class="time-label">00:00 / 00:00</span>
    <div class="tracker-container">
      <input type="range" min="0" max="100" value="0" class="tracker-range">
      <div class="time-tip">00:00</div>
    </div>
  </div>

  <!-- コメントヒートマップ -->
  <div class="heatmap-container">
    <canvas class="heatmap-canvas"></canvas>
    <div class="heatmap-tooltip">00:00 - 0 コメント</div>
  </div>

  <!-- ヒートマップ表示モード切り替え -->
  <div class="heatmap-mode-control">
    <label>ヒートマップ表示:</label>
    <div class="heatmap-mode-buttons">
      <button class="heatmap-mode-btn" data-mode="off" data-active>OFF</button>
      <button class="heatmap-mode-btn" data-mode="fab">FAB内</button>
      <button class="heatmap-mode-btn" data-mode="overlay">動画上</button>
    </div>
  </div>

  <!-- ヒートマップ詳細設定 -->
  <div class="heatmap-settings">
    <div class="heatmap-setting-group">
      <label for="heatmap-color-scheme">カラースキーム:</label>
      <select class="heatmap-color-scheme" id="heatmap-color-scheme">
        <option value="default">デフォルト</option>
        <option value="rainbow">レインボー</option>
        <option value="fire">ファイア</option>
        <option value="cool">クール</option>
      </select>
    </div>
    <div class="heatmap-setting-group">
      <input type="checkbox" class="heatmap-smooth-toggle" id="heatmap-smooth-toggle">
      <label for="heatmap-smooth-toggle">スムージング</label>
    </div>
  </div>

<div class="control-grid">
      <button class="control-btn">${createMaterialIcon("skip_previous", { style: "outlined", color: "white" })}</button>
    <button class="control-btn play-pause-btn" data-playing="false">${createMaterialIcon("play_arrow", { style: "outlined", color: "white" })}</button>
    <button class="control-btn">${createMaterialIcon("skip_next", { style: "outlined", color: "white" })}</button>
    <button class="control-btn">${createMaterialIcon("repeat", { style: "outlined", color: "white" })}</button>
</div>

<div class="seek-controls">
  <div class="seek-input">
    <input type="number" min="1" max="60" value="10" class="seek-value">
    <span>秒</span>
  </div>
      <button class="seek-btn" data-seek="-1">${createMaterialIcon("fast_rewind", { style: "outlined", color: "white" })}</button>
    <button class="seek-btn" data-seek="+1">${createMaterialIcon("fast_forward", { style: "outlined", color: "white" })}</button>
</div>

  <div class="x-sec-jump-wrapper">
    <div class="x-sec-jump-container minus-row">
      <button class="x-sec-jump-btn" data-jump-seconds="-60">-60秒</button>
      <button class="x-sec-jump-btn" data-jump-seconds="-30">-30秒</button>
      <button class="x-sec-jump-btn" data-jump-seconds="-10">-10秒</button>
      <button class="x-sec-jump-btn" data-jump-seconds="-5">-5秒</button>
    </div>
    <div class="x-sec-jump-container plus-row">
      <button class="x-sec-jump-btn" data-jump-seconds="5">+5秒</button>
      <button class="x-sec-jump-btn" data-jump-seconds="10">+10秒</button>
      <button class="x-sec-jump-btn" data-jump-seconds="30">+30秒</button>
      <button class="x-sec-jump-btn" data-jump-seconds="60">+60秒</button>
    </div>
  </div>
</div>
`;

const speedTemplate = `
<div class="range-control">
  <label>再生速度: <span class="speed-label">1.00</span></label>
  <input type="range" min="0.1" max="5.0" step="0.01" value="1.0" class="speed-range">
</div>

<div class="control-grid">
  <button class="speed-preset" data-speed="0.1">x0.1</button>
  <button class="speed-preset" data-speed="0.5">x0.5</button>
  <button class="speed-preset" data-speed="1.0">x1.0</button>
  <button class="speed-preset" data-speed="1.5">x1.5</button>
</div>

<div class="control-grid">
  <button class="speed-preset" data-speed="2.0">x2.0</button>
  <button class="speed-preset" data-speed="3.0">x3.0</button>
  <button class="speed-preset" data-speed="4.0">x4.0</button>
  <button class="speed-preset" data-speed="5.0">x5.0</button>
</div>

<div class="control-grid speed-fine-control">
  <button class="speed-adjust" data-adjust="-0.1">-0.1</button>
  <button class="speed-adjust" data-adjust="-0.01">-0.01</button>
  <button class="speed-adjust" data-adjust="+0.01">+0.01</button>
  <button class="speed-adjust" data-adjust="+0.1">+0.1</button>
</div>
`;

const volumeTemplate = `
<div class="range-control">
  <label>音量: <span class="volume-label">0.50</span></label>
  <input type="range" min="0" max="1" step="0.01" value="0.5" class="volume-range">
</div>

<div class="control-grid">
  <button class="control-btn">${createMaterialIcon("volume_off", { style: "outlined", color: "white" })}</button>
  <button class="control-btn">${createMaterialIcon("volume_down", { style: "outlined", color: "white" })}</button>
  <button class="control-btn">${createMaterialIcon("volume_up", { style: "outlined", color: "white" })}</button>
</div>

<div class="control-grid volume-presets">
  <button class="volume-preset" data-volume="0.1">10%</button>
  <button class="volume-preset" data-volume="0.25">25%</button>
  <button class="volume-preset" data-volume="0.5">50%</button>
  <button class="volume-preset" data-volume="0.75">75%</button>
  <button class="volume-preset" data-volume="1">100%</button>
</div>
`;

const settingsTemplate = `
<div class="settings-container">
  <div class="settings-header">
    <h3>${createMaterialIcon("build", { style: "outlined", color: "white" })} モジュール設定</h3>
    <p>各機能のON/OFFを切り替えできます</p>
  </div>
  
  <div class="module-categories">
    <div class="category" data-category="privacy">
      <div class="category-header">
        <h4>${createMaterialIcon("lock", { style: "outlined", color: "white" })} プライバシー</h4>
        <span class="category-description">個人情報の表示制御</span>
      </div>
      <div class="module-list" id="privacy-modules">
        <!-- プライバシー関連モジュールがここに挿入されます -->
      </div>
    </div>
    
    <div class="category" data-category="ui_enhancement">
      <div class="category-header">
        <h4>${createMaterialIcon("palette", { style: "outlined", color: "white" })} UI強化</h4>
        <span class="category-description">ユーザーインターフェースの改善</span>
      </div>
      <div class="module-list" id="ui_enhancement-modules">
        <!-- UI強化モジュールがここに挿入されます -->
      </div>
    </div>
    
    <div class="category" data-category="functionality">
      <div class="category-header">
        <h4>${createMaterialIcon("settings", { style: "outlined", color: "white" })} 機能追加</h4>
        <span class="category-description">新しい機能の追加</span>
      </div>
      <div class="module-list" id="functionality-modules">
        <!-- 機能追加モジュールがここに挿入されます -->
      </div>
    </div>
    
    <div class="category" data-category="visual">
      <div class="category-header">
        <h4>${createMaterialIcon("color_lens", { style: "outlined", color: "white" })} ビジュアル</h4>
        <span class="category-description">見た目のカスタマイズ</span>
      </div>
      <div class="module-list" id="visual-modules">
        <!-- ビジュアルモジュールがここに挿入されます -->
      </div>
    </div>
  </div>
  
  <div class="settings-footer">
    <div class="settings-actions">
      <button class="action-btn primary" id="apply-immediately">${createMaterialIcon("flash_on", { style: "outlined", color: "green" })} 即時適用</button>
      <button class="action-btn" id="reload-and-apply">${createMaterialIcon("refresh", { style: "outlined", color: "white" })} 再読み込みして適用</button>
      <button class="action-btn" id="export-settings">${createMaterialIcon("upload", { style: "outlined", color: "white" })} 設定エクスポート</button>
      <button class="action-btn" id="import-settings">${createMaterialIcon("download", { style: "outlined", color: "white" })} 設定インポート</button>
      <button class="action-btn danger" id="reset-settings">${createMaterialIcon("refresh", { style: "filled", color: "red" })} 設定リセット</button>
    </div>
    <div class="settings-info">
      <small>設定は自動的に保存されます</small>
    </div>
  </div>
</div>

<!-- モジュール項目のテンプレート -->
<template id="module-item-template">
  <div class="module-item" data-module-id="">
    <div class="module-info">
      <span class="module-icon"></span>
      <div class="module-details">
        <h5 class="module-name"></h5>
        <p class="module-description"></p>
        <div class="module-meta">
          <span class="module-version"></span>
          <span class="module-pages"></span>
          <span class="module-exclusive-group"></span>
          <span class="module-status"></span>
        </div>
      </div>
    </div>
    <label class="toggle-switch">
      <input type="checkbox" class="module-toggle">
      <span class="slider"></span>
    </label>
  </div>
</template>
`;

const panelStyles = `
.panel {
  max-height: 80vh;
  overflow: hidden;
  flex-direction: column;
}

.panel.visible {
  display: flex;
}

nav {
  display: flex;
  gap: 4px;
  border-top: 1px solid var(--panel-border);
  padding: 8px 0;
  margin-top: 20px;
  flex-shrink: 0;
  order: 1;
}

nav button {
  flex: 1;
  padding: 8px 6px;
  background: rgba(255, 255, 255, 0.05);
  border: none;
  color: var(--panel-fg);
  cursor: pointer;
  border-radius: 10px;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  font-size: 13px;
  font-weight: 500;
  position: relative;
  overflow: hidden;
  margin-bottom: 2px;
}

nav button::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, rgba(100, 150, 255, 0.1), rgba(150, 100, 255, 0.1));
  opacity: 0;
  transition: opacity 0.2s ease;
}

nav button:hover::before {
  opacity: 1;
}

nav button[data-active] {
  background: var(--panel-accent);
  color: #ffffff;
  box-shadow: 0 1px 4px rgba(100, 150, 255, 0.2);
  margin-bottom: 2px;
}

nav button[data-active]::before {
  opacity: 0;
}

/* タブボタン内のアイコンのpointer-eventsを無効化 */
nav button svg,
nav button .tab-icon,
nav button .subtab-icon {
  pointer-events: none;
}

.tab {
  display: none;
  flex: 1;
  order: 0;
  overflow-y: auto;
  max-height: calc(80vh - 80px); /* パネル高さからナビゲーション分を引く */
  padding-right: 8px;
  margin-right: -8px;
}

.tab.active {
  display: block;
  animation: tabFadeIn 0.2s ease-out;
}

/* タブコンテンツのスクロールバーのスタイリング */
.tab::-webkit-scrollbar {
  width: 8px;
}

.tab::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
}

.tab::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 4px;
  transition: background 0.2s ease;
}

.tab::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.3);
}

@keyframes tabFadeIn {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.subtab {
  display: none;
  height: 100%;
}

.subtab.active {
  display: flex;
  flex-direction: column;
  animation: tabFadeIn 0.2s ease-out;
}

.card-container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 8px;
  overflow-y: auto;
  max-height: calc(80vh - 140px);
  padding-right: 6px;
  margin-right: -6px;
  flex: 1;
}

.card-container::-webkit-scrollbar {
  width: 8px;
}

.card-container::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
}

.card-container::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 4px;
}

.card-container::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.3);
}

.action-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  height: auto;
  min-height: 48px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  position: relative;
  overflow: hidden;
}

.action-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, rgba(100, 150, 255, 0.1), rgba(150, 100, 255, 0.1));
  opacity: 0;
  transition: opacity 0.2s ease;
}

.action-card:hover {
  background: rgba(255, 255, 255, 0.1);
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
  border-color: var(--panel-accent);
}

.action-card:hover::before {
  opacity: 1;
}

.action-card:active {
  transform: translateY(-1px);
}

.action-card img {
  width: 24px;
  height: 24px;
  border-radius: 5px;
  flex-shrink: 0;
  filter: brightness(0) invert(1);
}

.action-card span {
  color: var(--panel-fg);
  font-size: 13px;
  font-weight: 500;
  line-height: 1.3;
  position: relative;
  z-index: 1;
}
`;

const controlsStyles = `
/* 再生タブのコンテンツ容器 */
.playback-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 6px 0;
}

.playback-content > div {
  flex-shrink: 0; /* スクロール時にコンテンツが縮まないようにする */
}

.control-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(85px, 1fr));
  gap: 6px;
  margin: 4px 0;
}

#volume .control-grid {
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
}

.control-btn {
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 12px;
  padding: 12px 8px;
  color: var(--panel-fg);
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  font-size: 16px;
  font-weight: 500;
  position: relative;
  overflow: hidden;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}

.control-btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, rgba(100, 150, 255, 0.2), rgba(150, 100, 255, 0.2));
  opacity: 0;
  transition: opacity 0.2s ease;
}

.control-btn:hover {
  background: rgba(255, 255, 255, 0.15);
  border-color: var(--panel-accent);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.control-btn:hover::before {
  opacity: 1;
}

.control-btn:active {
  transform: translateY(0);
}

/* 繰り返し再生ボタンのアクティブ状態 */
.control-btn.active {
  background: var(--panel-accent);
  color: #ffffff;
  box-shadow: 0 2px 8px rgba(100, 150, 255, 0.3);
}

.control-btn.active::before {
  opacity: 0;
}

.range-control {
  width: 100%;
  margin: 4px 0;
}

.range-control label {
  display: block;
  margin-bottom: 12px;
  color: var(--panel-fg);
  font-size: 14px;
  font-weight: 500;
}

.range-control input[type="range"] {
  width: 100%;
}

.tracker-control {
  width: 100%;
  margin: 4px 0;
}

.tracker-control .time-label {
  color: var(--panel-fg);
  font-size: 14px;
  font-weight: 500;
  display: block;
  text-align: center;
  margin-bottom: 8px;
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
}

.tracker-container {
  position: relative;
  width: 100%;
}

.tracker-container input[type="range"] {
  width: 100%;
  margin: 4px 0;
}

.time-tip {
  position: absolute;
  display: none;
  background: rgba(0, 0, 0, 0.9);
  color: white;
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 500;
  transform: translateX(-50%);
  pointer-events: none;
  z-index: 1000;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

/* 美しいスライダーのスタイル */
input[type="range"] {
  -webkit-appearance: none;
  appearance: none;
  height: 6px;
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.15);
  outline: none;
  cursor: pointer;
  position: relative;
  transition: all 0.2s ease;
}

input[type="range"]:hover {
  background: rgba(255, 255, 255, 0.2);
}

input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 20px;
  height: 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.4);
}

input[type="range"]::-webkit-slider-thumb:hover {
  transform: scale(1.2);
  box-shadow: 0 4px 16px rgba(102, 126, 234, 0.6);
}

input[type="range"]::-moz-range-thumb {
  width: 20px;
  height: 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.4);
}

.seek-controls {
  display: flex;
  justify-content: space-between;
  margin-top: 4px;
  gap: 6px;
}

.seek-input {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 8px 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.seek-input input {
  width: 50px;
  padding: 6px 8px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  color: var(--panel-fg);
  text-align: center;
  font-size: 14px;
  font-weight: 500;
}

.seek-input span {
  color: var(--panel-fg);
  font-size: 14px;
  font-weight: 500;
}

.seek-btn {
  padding: 8px 16px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 12px;
  color: var(--panel-fg);
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.seek-btn:hover {
  background: rgba(255, 255, 255, 0.15);
  border-color: var(--panel-accent);
  transform: translateY(-1px);
}

/* X秒ジャンプボタン */
.x-sec-jump-wrapper {
  margin-top: 4px;
}

.x-sec-jump-container {
  display: flex;
  gap: 4px;
  margin-bottom: 3px;
}

.x-sec-jump-container:last-child {
  margin-bottom: 0;
}

.x-sec-jump-btn {
  flex: 1;
  min-width: 70px;
  padding: 8px 4px;
  font-size: 12px;
  font-weight: 500;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  color: var(--panel-fg);
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.x-sec-jump-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: var(--panel-accent);
  transform: translateY(-1px);
}

/* ヒートマップモード切り替え */
.heatmap-mode-control {
  margin: 4px 0;
}

.heatmap-mode-control label {
  display: block;
  margin-bottom: 12px;
  color: var(--panel-fg);
  font-size: 14px;
  font-weight: 500;
}

.heatmap-mode-buttons {
  display: flex;
  gap: 6px;
}

.heatmap-mode-btn {
  flex: 1;
  padding: 10px 12px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  color: var(--panel-fg);
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.heatmap-mode-btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, rgba(100, 150, 255, 0.2), rgba(150, 100, 255, 0.2));
  opacity: 0;
  transition: opacity 0.2s ease;
}

.heatmap-mode-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: var(--panel-accent);
  transform: translateY(-1px);
}

.heatmap-mode-btn:hover::before {
  opacity: 1;
}

.heatmap-mode-btn[data-active] {
  background: var(--panel-accent);
  border-color: var(--panel-accent-hover);
  color: #ffffff;
  box-shadow: 0 2px 8px rgba(100, 150, 255, 0.3);
}

.heatmap-mode-btn[data-active]::before {
  opacity: 0;
}

/* 音量と再生速度のプリセットボタン */
.volume-presets, .speed-presets {
  display: flex;
  gap: 4px;
  margin: 2px 0;
}

.volume-preset, .speed-preset {
  flex: 1;
  padding: 10px 8px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  color: var(--panel-fg);
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
  text-align: center;
}

.volume-preset::before, .speed-preset::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, rgba(100, 150, 255, 0.2), rgba(150, 100, 255, 0.2));
  opacity: 0;
  transition: opacity 0.2s ease;
}

.volume-preset:hover, .speed-preset:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: var(--panel-accent);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.volume-preset:hover::before, .speed-preset:hover::before {
  opacity: 1;
}

.volume-preset:active, .speed-preset:active {
  transform: translateY(0);
}

/* 再生速度の微調整ボタン */
.speed-fine-control {
  margin-top: 2px;
}

.speed-adjust {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  padding: 8px 12px;
  color: var(--panel-fg);
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.speed-adjust::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, rgba(100, 150, 255, 0.2), rgba(150, 100, 255, 0.2));
  opacity: 0;
  transition: opacity 0.2s ease;
}

.speed-adjust:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: var(--panel-accent);
  transform: translateY(-1px);
}

.speed-adjust:hover::before {
  opacity: 1;
}
`;

const commentsStyles = `
.comment-search-control {
  margin-bottom: 20px;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
}

.comment-search-input {
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 12px;
  color: var(--panel-fg);
  margin-bottom: 12px;
  font-size: 14px;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}

.comment-search-input:focus {
  outline: none;
  border-color: var(--panel-accent);
  background: rgba(255, 255, 255, 0.12);
  box-shadow: 0 0 0 3px rgba(100, 150, 255, 0.2);
  position: relative;
}

.comment-search-input:focus::after {
  content: '🔒 キーボードショートカット無効';
  position: absolute;
  top: -25px;
  left: 0;
  font-size: 11px;
  color: rgba(100, 150, 255, 0.8);
  background: rgba(0, 0, 0, 0.8);
  padding: 2px 6px;
  border-radius: 4px;
  pointer-events: none;
  z-index: 1000;
  white-space: nowrap;
}

.comment-search-input::placeholder {
  color: rgba(255, 255, 255, 0.5);
}

.comment-search-options {
  display: flex;
  gap: 20px;
  margin-bottom: 12px;
}

.option-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.option-group input[type="checkbox"] {
  width: 18px;
  height: 18px;
  accent-color: #667eea;
  cursor: pointer;
}

.option-group label {
  font-size: 14px;
  font-weight: 500;
  color: var(--panel-fg);
  cursor: pointer;
  user-select: none;
}

.comment-search-buttons {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  box-sizing: border-box;
}

.search-btn, .clear-btn {
  flex: 1;
  max-width: calc(50% - 6px);
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 12px;
  color: var(--panel-fg);
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
  box-sizing: border-box;
}

.search-btn::before, .clear-btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, rgba(100, 150, 255, 0.2), rgba(150, 100, 255, 0.2));
  opacity: 0;
  transition: opacity 0.2s ease;
}

.search-btn:hover, .clear-btn:hover {
  background: rgba(255, 255, 255, 0.15);
  border-color: var(--panel-accent);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.search-btn:hover::before, .clear-btn:hover::before {
  opacity: 1;
}

.search-results {
  max-height: 50vh;
  overflow-y: auto;
  padding: 8px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.05);
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
}

.comment-result {
  padding: 16px;
  margin-bottom: 12px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1px solid rgba(255, 255, 255, 0.08);
  position: relative;
  overflow: hidden;
}

.comment-result::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, rgba(100, 150, 255, 0.1), rgba(150, 100, 255, 0.1));
  opacity: 0;
  transition: opacity 0.2s ease;
}

.comment-result:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: var(--panel-accent);
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
}

.comment-result:hover::before {
  opacity: 1;
}

.comment-result:last-child {
  margin-bottom: 0;
}

.comment-time {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: 8px;
  font-weight: 500;
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
  position: relative;
  z-index: 1;
}

.comment-body {
  word-break: break-all;
  line-height: 1.5;
  font-size: 14px;
  margin-bottom: 8px;
  position: relative;
  z-index: 1;
}

.comment-user {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
  margin-top: 8px;
  font-weight: 500;
  position: relative;
  z-index: 1;
}

.comment-details {
  margin-top: 12px;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.6);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  padding-top: 8px;
  line-height: 1.4;
  position: relative;
  z-index: 1;
}

.no-results {
  padding: 24px;
  text-align: center;
  color: rgba(255, 255, 255, 0.6);
  font-size: 14px;
  font-style: italic;
}

.error-message {
  padding: 16px;
  text-align: center;
  color: #ff6b6b;
  background: rgba(255, 107, 107, 0.1);
  border: 1px solid rgba(255, 107, 107, 0.2);
  border-radius: 12px;
  font-size: 14px;
  font-weight: 500;
}

.copy-button {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: var(--panel-fg);
  cursor: pointer;
  padding: 6px 8px;
  border-radius: 8px;
  opacity: 0.7;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  font-size: 12px;
  position: relative;
  z-index: 2;
  margin-left: 8px;
  float: right;
}

.copy-button:hover {
  opacity: 1;
  background: rgba(255, 255, 255, 0.2);
  border-color: var(--panel-accent);
  transform: translateY(-1px);
}

.copy-tooltip {
  position: absolute;
  background: rgba(0, 0, 0, 0.9);
  color: white;
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 500;
  pointer-events: none;
  z-index: 1000;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}
`;

const heatmapStyles = `
.heatmap-container {
  width: 100%;
  height: 36px;
  position: relative;
  margin-top: 8px;
  margin-bottom: 16px;
  border-radius: 12px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.heatmap-canvas {
  width: 100% !important;
  height: 36px !important;
  border-radius: 12px;
  background: transparent;
  display: block;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.heatmap-canvas:hover {
  transform: scale(1.02);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
}

.heatmap-tooltip {
  position: absolute;
  display: none;
  background: rgba(0, 0, 0, 0.9);
  color: white;
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 500;
  transform: translateX(-50%);
  pointer-events: none;
  z-index: 1000;
  bottom: 42px;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
  white-space: nowrap;
}

.heatmap-tooltip::after {
  content: '';
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  border: 6px solid transparent;
  border-top-color: rgba(0, 0, 0, 0.9);
}

/* ヒートマップ詳細設定 */
.heatmap-settings {
  display: flex;
  gap: 16px;
  align-items: center;
  margin-top: 8px;
  margin-bottom: 12px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.heatmap-setting-group {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}

.heatmap-setting-group label {
  color: var(--panel-fg);
  font-weight: 500;
  white-space: nowrap;
}

.heatmap-color-scheme {
  padding: 6px 10px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: var(--panel-fg);
  border-radius: 6px;
  font-size: 13px;
  min-width: 100px;
  transition: all 0.2s ease;
}

.heatmap-color-scheme:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.25);
}

.heatmap-color-scheme:focus {
  outline: none;
  border-color: var(--panel-accent);
  box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.2);
}

.heatmap-color-scheme option {
  background: rgb(39, 39, 39);
  color: var(--panel-fg);
}

.heatmap-smooth-toggle {
  width: 16px;
  height: 16px;
  accent-color: var(--panel-accent);
  cursor: pointer;
}

.heatmap-smooth-toggle:focus {
  outline: 2px solid var(--panel-accent);
  outline-offset: 2px;
}

/* 動画プレイヤー上のオーバーレイヒートマップ */
.heatmap-overlay-container {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 48px;
  pointer-events: none;
  z-index: 1000;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.3), transparent);
  border-radius: 0 0 12px 12px;
}

.heatmap-overlay-canvas {
  width: 100% !important;
  height: 100% !important;
  pointer-events: auto;
  cursor: pointer;
  border-radius: 0 0 12px 12px;
  display: block;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.heatmap-overlay-canvas:hover {
  filter: brightness(1.2);
}

.heatmap-overlay-tooltip {
  position: absolute;
  display: none;
  background: rgba(0, 0, 0, 0.95);
  color: white;
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  pointer-events: none;
  z-index: 1001;
  transform: translateX(-50%);
  bottom: 56px;
  white-space: nowrap;
  backdrop-filter: blur(15px);
  -webkit-backdrop-filter: blur(15px);
  border: 1px solid rgba(255, 255, 255, 0.15);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
}

.heatmap-overlay-tooltip::after {
  content: '';
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  border: 8px solid transparent;
  border-top-color: rgba(0, 0, 0, 0.95);
}
`;

const settingsStyles = `
/* 設定コンテナ */
.settings-container {
  padding: 16px;
  max-height: 400px;
  overflow-y: auto;
}

.settings-header {
  margin-bottom: 20px;
  text-align: center;
  border-bottom: 1px solid var(--panel-border);
  padding-bottom: 12px;
}

.settings-header h3 {
  margin: 0 0 8px 0;
  color: var(--panel-text);
  font-size: 18px;
  font-weight: 600;
}

.settings-header p {
  margin: 0;
  color: var(--panel-text-secondary);
  font-size: 14px;
}

/* カテゴリセクション */
.module-categories {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.category {
  background: var(--panel-bg-secondary);
  border: 1px solid var(--panel-border);
  border-radius: 8px;
  overflow: hidden;
}

.category-header {
  padding: 12px 16px;
  background: var(--panel-bg-tertiary);
  border-bottom: 1px solid var(--panel-border);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.category-header h4 {
  margin: 0;
  color: var(--panel-text);
  font-size: 16px;
  font-weight: 600;
}

.category-description {
  color: var(--panel-text-secondary);
  font-size: 12px;
}

.module-list {
  padding: 8px;
}

.module-list:empty::after {
  content: "このカテゴリにはモジュールがありません";
  display: block;
  text-align: center;
  color: var(--panel-text-secondary);
  font-style: italic;
  padding: 16px;
}

/* モジュール項目 */
.module-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  margin-bottom: 8px;
  background: var(--panel-bg);
  border: 1px solid var(--panel-border);
  border-radius: 6px;
  transition: all 0.2s ease;
}

.module-item:hover {
  background: var(--panel-bg-hover);
  border-color: var(--panel-accent);
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.module-item:last-child {
  margin-bottom: 0;
}

.module-info {
  display: flex;
  align-items: center;
  flex: 1;
  gap: 12px;
}

.module-icon {
  font-size: 20px;
  width: 24px;
  text-align: center;
}

.module-details {
  flex: 1;
}

.module-name {
  margin: 0 0 4px 0;
  color: var(--panel-text);
  font-size: 14px;
  font-weight: 600;
}

.module-description {
  margin: 0 0 6px 0;
  color: var(--panel-text-secondary);
  font-size: 12px;
  line-height: 1.4;
}

.module-meta {
  display: flex;
  gap: 8px;
  font-size: 10px;
}

.module-meta span {
  padding: 2px 6px;
  border-radius: 3px;
  background: var(--panel-bg-tertiary);
  color: var(--panel-text-secondary);
}

.module-version {
  background: var(--panel-accent) !important;
  color: white !important;
}

.module-exclusive-group {
  background: #FF9800 !important;
  color: white !important;
}

.module-status.active {
  background: #4CAF50 !important;
  color: white !important;
}

.module-status.inactive {
  background: #9E9E9E !important;
  color: white !important;
}

.module-status.error {
  background: #F44336 !important;
  color: white !important;
}

/* 背景画像設定項目 */
.background-settings-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  margin-bottom: 8px;
  background: var(--panel-bg);
  border: 1px solid var(--panel-border);
  border-radius: 6px;
  transition: all 0.2s ease;
  border-left: 4px solid #2196F3;
}

.background-settings-item:hover {
  background: var(--panel-bg-hover);
  border-color: #2196F3;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(33, 150, 243, 0.2);
}

.settings-btn {
  padding: 8px 16px;
  background: linear-gradient(45deg, #2196F3, #1976D2);
  border: none;
  border-radius: 4px;
  color: white;
  font-size: 12px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s ease;
}

.settings-btn:hover {
  background: linear-gradient(45deg, #1976D2, #2196F3);
  transform: translateY(-1px);
  box-shadow: 0 2px 10px rgba(33, 150, 243, 0.3);
}

/* モーダルオーバーレイ */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 10000;
  backdrop-filter: blur(5px);
}

.modal-content {
  background: var(--panel-bg);
  border: 2px solid var(--panel-border);
  border-radius: 12px;
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  animation: modalSlideIn 0.3s ease-out;
}

@keyframes modalSlideIn {
  from {
    opacity: 0;
    transform: scale(0.9) translateY(-20px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid var(--panel-border);
  background: var(--panel-bg-secondary);
}

.modal-header h3 {
  margin: 0;
  color: var(--panel-text);
  font-size: 18px;
  font-weight: bold;
}

.close-modal-btn {
  background: none;
  border: none;
  color: var(--panel-text-secondary);
  font-size: 24px;
  cursor: pointer;
  padding: 5px;
  border-radius: 50%;
  width: 35px;
  height: 35px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
}

.close-modal-btn:hover {
  background: var(--panel-bg-hover);
  color: var(--panel-text);
  transform: scale(1.1);
}

.modal-body {
  padding: 20px;
  max-height: calc(90vh - 240px);
  overflow-y: auto;
}

.modal-footer {
  padding: 15px 20px;
  border-top: 1px solid var(--panel-border);
  background: var(--panel-bg-secondary);
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.modal-btn {
  padding: 10px 20px;
  border: 1px solid var(--panel-border);
  border-radius: 5px;
  background: var(--panel-bg);
  color: var(--panel-text);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.modal-btn:hover {
  background: var(--panel-bg-hover);
  border-color: var(--panel-accent);
}

.modal-btn.secondary {
  background: var(--panel-bg-tertiary);
}

/* 設定セクション */
.settings-section {
  margin-bottom: 25px;
  padding: 20px;
  background: var(--panel-bg-secondary);
  border-radius: 8px;
  border: 1px solid var(--panel-border);
}

.settings-section h4 {
  margin: 0 0 15px 0;
  color: var(--panel-text);
  font-size: 16px;
  font-weight: bold;
}

.url-input-section,
.file-input-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.url-input-section input,
.file-input-section input[type="text"] {
  padding: 10px;
  border: 1px solid var(--panel-border);
  border-radius: 5px;
  background: var(--panel-bg);
  color: var(--panel-text);
  font-size: 14px;
  transition: border-color 0.3s ease;
}

.url-input-section input:focus,
.file-input-section input[type="text"]:focus {
  outline: none;
  border-color: var(--panel-accent);
  box-shadow: 0 0 0 2px rgba(var(--panel-accent-rgb), 0.2);
}

.url-input-section input::placeholder,
.file-input-section input[type="text"]::placeholder {
  color: var(--panel-text-secondary);
}

.file-input-section input[type="file"] {
  padding: 10px;
  border: 1px solid var(--panel-border);
  border-radius: 5px;
  background: var(--panel-bg);
  color: var(--panel-text);
  font-size: 14px;
}

.add-btn {
  padding: 12px 20px;
  background: linear-gradient(45deg, #4CAF50, #45a049);
  border: none;
  border-radius: 5px;
  color: white;
  font-size: 14px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s ease;
}

.add-btn:hover {
  background: linear-gradient(45deg, #45a049, #4CAF50);
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(76, 175, 80, 0.3);
}

/* 画像リスト */
.image-list {
  max-height: 300px;
  overflow-y: auto;
  border: 1px solid var(--panel-border);
  border-radius: 5px;
  background: var(--panel-bg-tertiary);
  padding: 10px;
  gap: 10px;
  display: flex;
  flex-direction: column;
}

.image-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px;
  border: 1px solid var(--panel-border);
  border-radius: 8px;
  background: var(--panel-bg);
  transition: all 0.3s ease;
}

.image-item:hover {
  background: var(--panel-bg-hover);
  border-color: var(--panel-accent);
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.image-item.selected {
  border-color: var(--panel-accent);
  background: rgba(var(--panel-accent-rgb), 0.1);
}

.image-list-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px;
  border-bottom: 1px solid var(--panel-border);
  transition: background 0.3s ease;
}

.image-list-item:hover {
  background: var(--panel-bg-hover);
}

.image-list-item:last-child {
  border-bottom: none;
}

.image-info {
  display: flex;
  align-items: center;
  gap: 15px;
  flex: 1;
}

.image-preview {
  width: 50px;
  height: 50px;
  border-radius: 5px;
  background-size: cover;
  background-position: center;
  border: 1px solid var(--panel-border);
  flex-shrink: 0;
}

.image-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 4px;
}

.image-details {
  flex: 1;
}

.image-name {
  color: var(--panel-text);
  font-weight: bold;
  font-size: 14px;
  margin-bottom: 5px;
}

.image-type {
  color: var(--panel-text-secondary);
  font-size: 12px;
  margin-bottom: 3px;
  display: flex;
  align-items: center;
  gap: 5px;
}

.image-date {
  color: var(--panel-text-secondary);
  font-size: 11px;
}

.image-actions {
  display: flex;
  gap: 10px;
  flex-shrink: 0;
}

.image-select-btn,
.image-delete-btn {
  padding: 8px 12px;
  border: none;
  border-radius: 5px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 32px;
  height: 32px;
}

.image-select-btn {
  background: linear-gradient(45deg, #2196F3, #1976D2);
  color: white;
}

.image-select-btn:hover {
  background: linear-gradient(45deg, #1976D2, #2196F3);
  transform: translateY(-1px);
  box-shadow: 0 2px 10px rgba(33, 150, 243, 0.3);
}

.image-delete-btn {
  background: linear-gradient(45deg, #f44336, #d32f2f);
  color: white;
}

.image-delete-btn:hover {
  background: linear-gradient(45deg, #d32f2f, #f44336);
  transform: translateY(-1px);
  box-shadow: 0 2px 10px rgba(244, 67, 54, 0.3);
}

/* 削除ボタン内のアイコンを白色にする */
.image-delete-btn .material-icon {
  filter: brightness(0) invert(1) !important;
}

.select-btn {
  padding: 8px 15px;
  background: linear-gradient(45deg, #2196F3, #1976D2);
  border: none;
  border-radius: 5px;
  color: white;
  font-size: 12px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s ease;
}

.select-btn:hover {
  background: linear-gradient(45deg, #1976D2, #2196F3);
  transform: translateY(-1px);
  box-shadow: 0 2px 10px rgba(33, 150, 243, 0.3);
}

.select-btn.selected {
  background: linear-gradient(45deg, #4CAF50, #45a049);
  cursor: default;
}

.select-btn.selected:hover {
  background: linear-gradient(45deg, #4CAF50, #45a049);
  transform: none;
  box-shadow: none;
}

.delete-btn {
  padding: 8px 12px;
  background: linear-gradient(45deg, #f44336, #d32f2f);
  border: none;
  border-radius: 5px;
  color: white;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.delete-btn:hover {
  background: linear-gradient(45deg, #d32f2f, #f44336);
  transform: translateY(-1px);
  box-shadow: 0 2px 10px rgba(244, 67, 54, 0.3);
}

/* スライダースイッチ */
.toggle-switch {
  position: relative;
  display: inline-block;
  width: 50px;
  height: 28px;
  margin-left: 12px;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #ccc;
  transition: .3s;
  border-radius: 28px;
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.1);
}

.slider:before {
  position: absolute;
  content: "";
  height: 22px;
  width: 22px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: .3s;
  border-radius: 50%;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

input:checked + .slider {
  background-color: var(--panel-accent);
}

input:checked + .slider:before {
  transform: translateX(22px);
}

input:disabled + .slider {
  opacity: 0.5;
  cursor: not-allowed;
}

/* ホバー効果 */
.slider:hover {
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.15), 0 0 0 2px rgba(var(--panel-accent-rgb), 0.2);
}

/* 設定フッター */
.settings-footer {
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid var(--panel-border);
}

.settings-actions {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.action-btn {
  padding: 8px 12px;
  border: 1px solid var(--panel-border);
  border-radius: 4px;
  background: var(--panel-bg-secondary);
  color: var(--panel-text);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  flex: 1;
  min-width: 120px;
}

.action-btn:hover {
  background: var(--panel-bg-hover);
  border-color: var(--panel-accent);
  transform: translateY(-1px);
}

.action-btn.danger {
  border-color: #F44336;
  color: #F44336;
}

.action-btn.danger:hover {
  background: #F44336;
  color: white;
}

.action-btn.primary {
  border-color: #4CAF50;
  color: #4CAF50;
  font-weight: 600;
}

.action-btn.primary:hover {
  background: #4CAF50;
  color: white;
}

.settings-info {
  text-align: center;
}

.settings-info small {
  color: var(--panel-text-secondary);
  font-size: 11px;
}

/* スクロールバーのスタイリング */
.settings-container::-webkit-scrollbar,
.modal-body::-webkit-scrollbar,
.image-list::-webkit-scrollbar {
  width: 6px;
}

.settings-container::-webkit-scrollbar-track,
.modal-body::-webkit-scrollbar-track,
.image-list::-webkit-scrollbar-track {
  background: var(--panel-bg-secondary);
  border-radius: 3px;
}

.settings-container::-webkit-scrollbar-thumb,
.modal-body::-webkit-scrollbar-thumb,
.image-list::-webkit-scrollbar-thumb {
  background: var(--panel-border);
  border-radius: 3px;
}

.settings-container::-webkit-scrollbar-thumb:hover,
.modal-body::-webkit-scrollbar-thumb:hover,
.image-list::-webkit-scrollbar-thumb:hover {
  background: var(--panel-accent);
}

/* レスポンシブ対応 */
@media (max-width: 400px) {
  .settings-actions {
    flex-direction: column;
  }
  
  .action-btn {
    min-width: auto;
  }
  
  .module-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
  
  .toggle-switch {
    margin-left: 0;
    align-self: flex-end;
  }

  .modal-content {
    width: 95%;
    max-height: 90vh;
  }

  .image-list-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }

  .image-actions {
    align-self: stretch;
    justify-content: space-between;
  }
}

/* アニメーション */
@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.module-item {
  animation: slideIn 0.3s ease-out;
}

.category {
  animation: slideIn 0.3s ease-out;
}

/* サブモジュール関連スタイル */
.sub-modules-container {
  margin-top: 12px;
  padding: 12px;
  background: var(--panel-bg-tertiary);
  border: 1px solid var(--panel-border);
  border-radius: 6px;
  border-left: 4px solid var(--panel-accent);
}

.sub-modules-header {
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--panel-border);
}

.sub-modules-header h6 {
  margin: 0 0 4px 0;
  color: var(--panel-text);
  font-size: 14px;
  font-weight: 600;
}

.sub-modules-description {
  color: var(--panel-text-secondary);
  font-size: 11px;
}

.sub-modules-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.sub-module-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: var(--panel-bg);
  border: 1px solid var(--panel-border);
  border-radius: 4px;
  transition: all 0.2s ease;
}

.sub-module-item:hover {
  background: var(--panel-bg-hover);
  border-color: var(--panel-accent);
  transform: translateX(2px);
}

.sub-module-info {
  flex: 1;
}

.sub-module-details {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.sub-module-name {
  margin: 0;
  color: var(--panel-text);
  font-size: 13px;
  font-weight: 600;
}

.sub-module-description {
  margin: 0;
  color: var(--panel-text-secondary);
  font-size: 11px;
  line-height: 1.3;
}

.sub-module-status {
  font-size: 10px;
  font-weight: 600;
  margin-top: 2px;
}

.sub-module-status.active {
  color: #4CAF50;
}

.sub-module-status.inactive {
  color: #9E9E9E;
}

.sub-toggle {
  width: 40px;
  height: 22px;
}

.sub-toggle .slider {
  border-radius: 22px;
}

.sub-toggle .slider:before {
  height: 18px;
  width: 18px;
  left: 2px;
  bottom: 2px;
}

.sub-toggle input:checked + .slider:before {
  transform: translateX(18px);
}

/* 設定管理ボタン */
.settings-management {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.management-btn {
  padding: 12px 16px;
  border: none;
  border-radius: 6px;
  color: white;
  font-size: 13px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s ease;
  flex: 1;
  min-width: 140px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.management-btn.export {
  background: linear-gradient(45deg, #FF9800, #F57C00);
}

.management-btn.export:hover {
  background: linear-gradient(45deg, #F57C00, #FF9800);
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(255, 152, 0, 0.3);
}

.management-btn.import {
  background: linear-gradient(45deg, #9C27B0, #7B1FA2);
}

.management-btn.import:hover {
  background: linear-gradient(45deg, #7B1FA2, #9C27B0);
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(156, 39, 176, 0.3);
}

.management-btn.reset {
  background: linear-gradient(45deg, #607D8B, #455A64);
}

.management-btn.reset:hover {
  background: linear-gradient(45deg, #455A64, #607D8B);
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(96, 125, 139, 0.3);
}

@media (max-width: 600px) {
  .settings-management {
    flex-direction: column;
  }
  
  .management-btn {
    min-width: auto;
  }
}
`;

class MlinkVideoController extends BasePanel {
  constructor() {
    super();
    this.player = null;
    this.linkManager = null;
    this.commentManager = null;
    this.heatmapManager = null;
    this.playbackHandler = null;
    this.volumeHandler = null;
    this.speedHandler = null;
    this.timeUpdateInterval = null;
    this.isLoopEnabled = false;
    // 繰り返し再生フラグ
    // SPAコメントデータ更新の購読解除用
    this.commentDataChangedUnsubscribe = null;
    this.isWatchPage = false;
    this.isWatchPage = this.detectWatchPage();
    this.moduleManager = ModuleManager.getInstance();
    this.moduleRegistry = ModuleRegistry.getInstance();
    this.settingsManager = SettingsManager.getInstance();
    this.settingsUI = SettingsUI.getInstance();
    this.linkManager = LinkManager.getInstance();
    if (this.isWatchPage) {
      this.player = NicoVideoPlayer.getInstance();
      this.commentManager = CommentManager.getInstance();
      this.heatmapManager = HeatmapManager.getInstance();
      this.playbackHandler = new PlaybackHandler();
      this.volumeHandler = new VolumeHandler();
      this.speedHandler = new SpeedHandler();
    }
    void this.render();
    if (this.isWatchPage) {
      this.setupVideoEndedListener();
    }
    void this.initializeModuleSystem();
  }
  /**
   * 現在のページが視聴ページかどうかを判定
   */
  detectWatchPage() {
    const pathname = window.location.pathname;
    return pathname.includes("/watch/");
  }
  async loadStyles() {
    await Promise.resolve();
    return `
      ${basePanelStyles}
      ${panelStyles}
      ${controlsStyles}
      ${commentsStyles}
      ${heatmapStyles}
      ${settingsStyles}
      ${materialIconsStyles}
    `;
  }
  loadTemplates() {
    return {
      panel: this.generatePanelTemplate(),
      links: linksTemplate,
      comments: commentsTemplate,
      playback: playbackTemplate,
      speed: speedTemplate,
      volume: volumeTemplate,
      settings: settingsTemplate
    };
  }
  /**
   * ページタイプに応じたパネルテンプレートを生成
   */
  generatePanelTemplate() {
    if (this.isWatchPage) {
      return panelTemplate();
    } else {
      return `
<button id="fab"></button>
<div class="panel">
  <div id="links" class="tab active">
    <!-- links.htmlの内容がここに挿入されます -->
  </div>

  <div id="settings" class="tab">
    <!-- settings.htmlの内容がここに挿入されます -->
  </div>

  <nav>
            <button data-tab="links" data-active>${createMaterialIcon("link", { style: "outlined", classes: "tab-icon", color: "white" })}</button>
        <button data-tab="settings">${createMaterialIcon("settings", { style: "outlined", classes: "tab-icon", color: "white" })}</button>
  </nav>
</div>
`;
    }
  }
  async render() {
    try {
      const style = document.createElement("style");
      style.textContent = await this.loadStyles();
      const templates = this.loadTemplates();
      if (!templates.panel) {
        throw new Error("パネルテンプレートが見つからないのじゃ");
      }
      const template = document.createElement("template");
      let panelHtml = templates.panel;
      let linksHtml = templates.links;
      linksHtml = linksHtml.replace("<!-- カスタムリンクがここに挿入されます -->", this.renderLinkGroup("custom")).replace("<!-- 関連サービスのリンクがここに挿入されます -->", this.renderLinkGroup("services")).replace("<!-- データ管理のリンクがここに挿入されます -->", this.renderLinkGroup("dataManagement"));
      panelHtml = panelHtml.replace("<!-- links.htmlの内容がここに挿入されます -->", linksHtml).replace("<!-- comments.htmlの内容がここに挿入されます -->", templates.comments).replace("<!-- playback.htmlの内容がここに挿入されます -->", templates.playback).replace("<!-- speed.htmlの内容がここに挿入されます -->", templates.speed).replace("<!-- volume.htmlの内容がここに挿入されます -->", templates.volume).replace("<!-- settings.htmlの内容がここに挿入されます -->", templates.settings);
      template.innerHTML = panelHtml;
      this.shadow.appendChild(style);
      this.shadow.appendChild(template.content.cloneNode(true));
      this.initializeComponents();
      this.setupEventListeners();
      if (this.isWatchPage) {
        this.setupFab(createMaterialIcon("sports_esports", { style: "outlined", classes: "fab-icon", color: "white" }), "mlink-video-controller");
      } else {
        this.setupFab(createMaterialIcon("link", { style: "outlined", classes: "fab-icon", color: "white" }), "mlink-video-controller");
      }
      if (this.isWatchPage) {
        this.initializeHeatmap();
      }
      this.initializeSettingsTab();
      this.setupKeyPropagationPrevention();
    } catch (error) {
      window.logger.error("パネルのレンダリングエラー:", error);
      throw error;
    }
  }
  initializeComponents() {
  }
  setupEventListeners() {
    const tabs = this.shadow.querySelectorAll("[data-tab]");
    tabs.forEach((tab) => {
      tab.addEventListener("click", (e) => {
        const target = e.target;
        const tabId = target.dataset.tab;
        if (!tabId) return;
        tabs.forEach((t) => t.removeAttribute("data-active"));
        target.setAttribute("data-active", "");
        const contents = this.shadow.querySelectorAll(".tab");
        contents.forEach((content) => {
          if (content.id === tabId) {
            content.classList.add("active");
          } else {
            content.classList.remove("active");
          }
        });
      });
    });
    const subtabs = this.shadow.querySelectorAll("[data-subtab]");
    subtabs.forEach((subtab) => {
      subtab.addEventListener("click", (e) => {
        const target = e.target;
        const subtabId = target.dataset.subtab;
        if (!subtabId) return;
        subtabs.forEach((t) => t.removeAttribute("data-active"));
        target.setAttribute("data-active", "");
        const subtabContents = this.shadow.querySelectorAll(".subtab");
        subtabContents.forEach((content) => {
          if (content.id === subtabId) {
            content.classList.add("active");
          } else {
            content.classList.remove("active");
          }
        });
      });
    });
    if (this.isWatchPage) {
      this.setupPlaybackTemplateEvents();
      this.setupSpeedTemplateEvents();
      this.setupVolumeTemplateEvents();
      this.setupCommentTemplateEvents();
    }
    const actionCards = this.shadow.querySelectorAll(".action-card");
    actionCards.forEach((card) => {
      card.addEventListener("click", (e) => {
        void (async () => {
          const target = e.target;
          const actionCard = target.closest(".action-card");
          if (actionCard instanceof HTMLElement && actionCard.dataset.action && this.linkManager) {
            await this.linkManager.handleAction(actionCard.dataset.action);
          }
        })();
      });
    });
  }
  setupPlaybackTemplateEvents() {
    const trackerRange = this.shadow.querySelector("#playback .tracker-range");
    if (trackerRange) {
      trackerRange.addEventListener("input", (e) => {
        const position = parseFloat(e.target.value) / 100;
        this.playbackHandler?.seekToPosition(position);
      });
    }
    this.startTimeUpdateInterval();
    const seekButtons = this.shadow.querySelectorAll("[data-seek]");
    seekButtons.forEach((button) => {
      button.addEventListener("click", (e) => {
        const target = e.target;
        const seekDirection = target.dataset.seek;
        const seekInput = this.shadow.querySelector(".seek-value");
        const seekValue = seekInput ? parseInt(seekInput.value) : 10;
        if (seekDirection === "+1" && this.playbackHandler) {
          this.playbackHandler.seek({ seconds: seekValue, direction: "forward" });
        } else if (seekDirection === "-1" && this.playbackHandler) {
          this.playbackHandler.seek({ seconds: seekValue, direction: "backward" });
        }
      });
    });
    const jumpButtons = this.shadow.querySelectorAll("[data-jump-seconds]");
    jumpButtons.forEach((button) => {
      button.addEventListener("click", (e) => {
        const target = e.target;
        const jumpSeconds = parseInt(target.dataset.jumpSeconds || "0");
        if (jumpSeconds > 0 && this.playbackHandler) {
          this.playbackHandler.seek({ seconds: jumpSeconds, direction: "forward" });
        } else if (this.playbackHandler) {
          this.playbackHandler.seek({ seconds: Math.abs(jumpSeconds), direction: "backward" });
        }
      });
    });
    const heatmapModeButtons = this.shadow.querySelectorAll(".heatmap-mode-btn");
    heatmapModeButtons.forEach((button) => {
      button.addEventListener("click", (e) => {
        const target = e.target;
        const mode = target.dataset.mode;
        if (mode && this.heatmapManager) {
          heatmapModeButtons.forEach((btn) => btn.removeAttribute("data-active"));
          target.setAttribute("data-active", "");
          this.heatmapManager.setDisplayMode(mode);
        }
      });
    });
    this.setupHeatmapSettingsEvents();
    const heatmapCanvas = this.shadow.querySelector("#playback .heatmap-canvas");
    const heatmapTooltip = this.shadow.querySelector("#playback .heatmap-tooltip");
    if (heatmapCanvas && heatmapTooltip) {
      heatmapCanvas.addEventListener("mousemove", (e) => {
        const rect = heatmapCanvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const position = x / rect.width;
        this.heatmapManager?.showTooltip(position, heatmapTooltip);
      });
      heatmapCanvas.addEventListener("mouseleave", () => {
        this.heatmapManager?.hideTooltip(heatmapTooltip);
      });
      heatmapCanvas.addEventListener("click", (e) => {
        const rect = heatmapCanvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const position = x / rect.width;
        const duration = this.player?.getDuration();
        if (this.player && duration) {
          this.player.seek(position * duration);
        }
      });
    }
    const controlButtons = this.shadow.querySelectorAll("#playback .control-btn");
    controlButtons.forEach((button, index) => {
      button.addEventListener("click", () => {
        switch (index) {
          case 0:
            this.playbackHandler?.seek({ seconds: 10, direction: "backward" });
            break;
          case 1:
            this.playbackHandler?.togglePlayPause();
            setTimeout(() => this.updatePlayPauseButton(), 100);
            break;
          case 2:
            this.playbackHandler?.seek({ seconds: 10, direction: "forward" });
            break;
          case 3:
            this.toggleLoop();
            this.updateLoopButtonAppearance(button);
            break;
        }
      });
      if (index === 3) {
        this.updateLoopButtonAppearance(button);
      }
    });
    this.setupPlayStateListener();
  }
  // ヒートマップ詳細設定のイベントリスナーを設定
  setupHeatmapSettingsEvents() {
    if (!this.heatmapManager) return;
    const colorSchemeSelect = this.shadow.querySelector(".heatmap-color-scheme");
    if (colorSchemeSelect) {
      colorSchemeSelect.value = this.heatmapManager.getColorScheme();
      const preventPanelClose = (e) => {
        e.stopPropagation();
      };
      colorSchemeSelect.addEventListener("click", preventPanelClose);
      colorSchemeSelect.addEventListener("mousedown", preventPanelClose);
      colorSchemeSelect.addEventListener("mouseup", preventPanelClose);
      colorSchemeSelect.addEventListener("change", (e) => {
        e.stopPropagation();
        if (this.heatmapManager) {
          this.heatmapManager.setColorScheme(colorSchemeSelect.value);
        }
      });
    }
    const smoothToggle = this.shadow.querySelector(".heatmap-smooth-toggle");
    if (smoothToggle) {
      smoothToggle.checked = this.heatmapManager.getSmoothing();
      smoothToggle.addEventListener("change", (e) => {
        e.stopPropagation();
        if (this.heatmapManager) {
          this.heatmapManager.setSmoothing(smoothToggle.checked);
        }
      });
    }
  }
  setupSpeedTemplateEvents() {
    const speedPresets = this.shadow.querySelectorAll("#speed .speed-preset");
    speedPresets.forEach((button) => {
      button.addEventListener("click", (e) => {
        const target = e.target;
        const speed = parseFloat(target.dataset.speed || "1.0");
        this.speedHandler?.setPlaybackRate({ value: speed });
        this.updateSpeedDisplay();
      });
    });
    const speedAdjustButtons = this.shadow.querySelectorAll("#speed .speed-adjust");
    speedAdjustButtons.forEach((button) => {
      button.addEventListener("click", (e) => {
        const target = e.target;
        const adjust = parseFloat(target.dataset.adjust || "0");
        this.speedHandler?.adjustPlaybackRate(adjust);
        this.updateSpeedDisplay();
      });
    });
    const speedRange = this.shadow.querySelector("#speed .speed-range");
    if (speedRange) {
      speedRange.addEventListener("input", (e) => {
        const speed = parseFloat(e.target.value);
        this.speedHandler?.setPlaybackRate({ value: speed });
        this.updateSpeedDisplay();
      });
    }
    setInterval(() => {
      this.updateSpeedDisplay();
    }, 1e3);
  }
  setupVolumeTemplateEvents() {
    const volumePresets = this.shadow.querySelectorAll("#volume .volume-preset");
    volumePresets.forEach((button) => {
      button.addEventListener("click", (e) => {
        const target = e.target;
        const volume = parseFloat(target.dataset.volume || "0.5");
        this.volumeHandler?.setVolume({ value: volume });
        this.updateVolumeDisplay();
      });
    });
    const volumeControlButtons = this.shadow.querySelectorAll("#volume .control-btn");
    volumeControlButtons.forEach((button, index) => {
      button.addEventListener("click", () => {
        switch (index) {
          case 0:
            this.volumeHandler?.setVolume({ value: 0 });
            break;
          case 1:
            this.volumeHandler?.setVolume({ value: 0.01 });
            break;
          case 2:
            this.volumeHandler?.setVolume({ value: 0.5 });
            break;
        }
        this.updateVolumeDisplay();
      });
    });
    const volumeRange = this.shadow.querySelector("#volume .volume-range");
    if (volumeRange) {
      volumeRange.addEventListener("input", (e) => {
        const value = parseFloat(e.target.value);
        this.volumeHandler?.setVolume({ value, isLogarithmic: true });
        this.updateVolumeDisplay();
      });
    }
    setInterval(() => {
      this.updateVolumeDisplay();
    }, 1e3);
  }
  setupCommentTemplateEvents() {
    const searchInput = this.shadow.querySelector("#comments .comment-search-input");
    const regexToggle = this.shadow.querySelector("#comments .regex-toggle");
    const extendedToggle = this.shadow.querySelector("#comments .extended-toggle");
    const searchBtn = this.shadow.querySelector("#comments .search-btn");
    const clearBtn = this.shadow.querySelector("#comments .clear-btn");
    const searchResults = this.shadow.querySelector("#comments .search-results");
    if (searchInput && regexToggle && extendedToggle && searchBtn && clearBtn && searchResults) {
      searchInput.addEventListener("keydown", (e) => {
        e.stopPropagation();
        const preventDefaultKeys = [
          " ",
          // スペースキー（再生/一時停止）
          "ArrowLeft",
          // 左矢印（巻き戻し）
          "ArrowRight",
          // 右矢印（早送り）
          "ArrowUp",
          // 上矢印（音量アップ）
          "ArrowDown",
          // 下矢印（音量ダウン）
          "f",
          // フルスクリーン
          "F",
          // フルスクリーン
          "m",
          // ミュート
          "M",
          // ミュート
          "k",
          // 再生/一時停止
          "K",
          // 再生/一時停止
          "j",
          // 動画を10秒戻す
          "J",
          // 動画を10秒戻す
          "l",
          // 動画を10秒進める
          "L"
          // 動画を10秒進める
        ];
        if (preventDefaultKeys.includes(e.key)) {
          e.preventDefault();
        }
        if (e.key === "Enter" && !e.isComposing) {
          e.preventDefault();
          const searchText = searchInput.value.trim();
          if (searchText) {
            this.performCommentSearch(searchText, searchResults);
          }
        }
      });
      searchInput.addEventListener("keyup", (e) => {
        e.stopPropagation();
      });
      searchInput.addEventListener("keypress", (e) => {
        e.stopPropagation();
        if (e.key === "Enter") {
          e.preventDefault();
        }
      });
      searchInput.addEventListener("focus", () => {
      });
      searchInput.addEventListener("blur", () => {
      });
      if (regexToggle) {
        regexToggle.addEventListener("change", () => {
          this.commentManager?.setSearchOptions({
            enableRegexp: regexToggle.checked,
            enableExtended: extendedToggle.checked
          });
        });
      }
      if (extendedToggle) {
        extendedToggle.addEventListener("change", () => {
          this.commentManager?.setSearchOptions({
            enableRegexp: regexToggle.checked,
            enableExtended: extendedToggle.checked
          });
          if (searchInput.value) {
            this.performCommentSearch(searchInput.value, searchResults);
          }
        });
      }
      if (searchBtn) {
        searchBtn.addEventListener("click", () => {
          this.performCommentSearch(searchInput.value, searchResults);
        });
      }
      if (clearBtn) {
        clearBtn.addEventListener("click", () => {
          searchInput.value = "";
          searchResults.innerHTML = '<div class="no-results">コメントを検索してください</div>';
        });
      }
    }
    this.commentManager?.fetchComments().then(() => {
      this.heatmapManager?.updateComments();
    }).catch((error) => {
      window.logger.error("コメントの取得に失敗しました:", error);
    });
    this.commentManager?.startUrlWatching();
    this.commentDataChangedUnsubscribe = this.commentManager?.onDataChanged(() => {
      if (searchInput) {
        searchInput.value = "";
      }
      if (searchResults) {
        searchResults.innerHTML = '<div class="no-results">コメントを検索してください</div>';
      }
      this.heatmapManager?.updateComments();
    }) || null;
  }
  performCommentSearch(searchText, searchResults) {
    const result = this.commentManager?.searchComments(searchText);
    if (!result?.success) {
      searchResults.innerHTML = `<div class="error-message">${result?.error}</div>`;
      return;
    }
    if (!result.results || result.results.length === 0) {
      searchResults.innerHTML = '<div class="no-results">一致するコメントが見つかりませんでした</div>';
      return;
    }
    searchResults.innerHTML = "";
    const fragment = document.createDocumentFragment();
    result.results.forEach((comment) => {
      const resultElement = this.createCommentElement(comment);
      fragment.appendChild(resultElement);
    });
    searchResults.appendChild(fragment);
    this.heatmapManager?.updateComments();
  }
  createCommentElement(comment) {
    const container = document.createElement("div");
    container.className = "comment-result";
    const timeElement = document.createElement("div");
    timeElement.className = "comment-time";
    timeElement.textContent = `⏰ ${this.formatVpos(comment.vposMs || 0)}`;
    const bodyElement = document.createElement("div");
    bodyElement.className = "comment-body";
    bodyElement.textContent = comment.body;
    const copyButton = document.createElement("button");
    copyButton.className = "copy-button";
    copyButton.innerHTML = createMaterialIcon("content_copy", { style: "outlined", color: "white" });
    copyButton.title = "コメントをコピー";
    copyButton.onclick = (e) => {
      e.stopPropagation();
      navigator.clipboard.writeText(comment.body).then(() => this.showCopySuccess(copyButton)).catch(() => this.showCopyError(copyButton));
    };
    const userElement = document.createElement("div");
    userElement.className = "comment-user";
    userElement.textContent = `👤 ${comment.userId || "不明"}`;
    container.appendChild(timeElement);
    container.appendChild(bodyElement);
    container.appendChild(copyButton);
    container.appendChild(userElement);
    const searchOptions = this.commentManager?.getSearchOptions();
    if (searchOptions?.enableExtended && comment) {
      const detailsElement = document.createElement("div");
      detailsElement.className = "comment-details";
      const postedDate = comment.postedAt ? new Date(comment.postedAt).toLocaleString("ja-JP") : "不明";
      const details = [
        `ID: ${comment.id || "-"}`,
        `No: ${comment.no || "-"}`,
        `投稿日時: ${postedDate}`,
        `コマンド: ${comment.commands ? comment.commands.join(" ") : "-"}`,
        `プレミアム: ${comment.isPremium ? createMaterialIcon("star", { style: "outlined", color: "white" }) : "-"}`,
        `スコア: ${comment.score || "-"}`
      ];
      detailsElement.innerHTML = details.join(" | ");
      container.appendChild(detailsElement);
    }
    container.addEventListener("click", () => {
      if (comment.vposMs && this.player) {
        this.player.seek(comment.vposMs / 1e3);
      }
    });
    return container;
  }
  formatVpos(vposMs) {
    const seconds = vposMs / 1e3;
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  }
  showCopySuccess(button) {
    const tooltip = document.createElement("div");
    tooltip.className = "copy-tooltip";
    tooltip.textContent = "コピーしました";
    tooltip.style.position = "absolute";
    tooltip.style.top = "-20px";
    tooltip.style.left = "0";
    button.style.position = "relative";
    button.appendChild(tooltip);
    setTimeout(() => {
      tooltip.remove();
    }, 2e3);
  }
  showCopyError(button) {
    const tooltip = document.createElement("div");
    tooltip.className = "copy-tooltip";
    tooltip.textContent = "コピーに失敗しました";
    tooltip.style.position = "absolute";
    tooltip.style.top = "-20px";
    tooltip.style.left = "0";
    tooltip.style.color = "#ff6b6b";
    button.style.position = "relative";
    button.appendChild(tooltip);
    setTimeout(() => {
      tooltip.remove();
    }, 2e3);
  }
  renderLinkGroup(group) {
    const links = this.linkManager?.getLinks(group) || [];
    return links.map((link) => `
      <div class="action-card" data-action="${link.action}">
        <img src="${link.icon}" alt="${link.title}" />
        <span>${link.title}</span>
      </div>
    `).join("");
  }
  // パネルが閉じられたときにインターバルをクリアする
  closePanel() {
    super.closePanel();
    if (this.isWatchPage) {
      this.stopTimeUpdateInterval();
      if (this.heatmapManager) {
        this.heatmapManager.stopPeriodicUpdate();
      }
    }
  }
  // パネルが開かれたときにインターバルを再開する
  openPanel() {
    super.openPanel();
    if (this.isWatchPage) {
      this.startTimeUpdateInterval();
      if (this.heatmapManager && this.heatmapManager.getDisplayMode() !== "off") {
        this.heatmapManager.startPeriodicUpdate();
      }
    }
  }
  initializeHeatmap() {
    if (!this.heatmapManager || !this.commentManager) {
      window.logger.warn("[MlinkVideoController] ヒートマップまたはコメントマネージャーが初期化されていません");
      return;
    }
    const heatmapCanvas = this.shadow.querySelector(".heatmap-canvas");
    const heatmapTooltip = this.shadow.querySelector(".heatmap-tooltip");
    if (heatmapCanvas && heatmapTooltip) {
      this.heatmapManager.initialize(heatmapCanvas, heatmapTooltip);
      this.applySavedHeatmapSettings();
      this.initializeHeatmapDetailSettings();
      this.commentManager.fetchComments().then(() => {
        if (this.heatmapManager) {
          this.heatmapManager.updateComments();
        }
      }).catch((error) => {
        window.logger.error("[MlinkVideoController] コメントデータの取得に失敗:", error);
      });
    } else {
      window.logger.warn("[MlinkVideoController] ヒートマップ要素が見つかりません");
    }
  }
  applySavedHeatmapSettings() {
    const currentMode = this.heatmapManager?.getDisplayMode();
    const heatmapModeButtons = this.shadow.querySelectorAll(".heatmap-mode-btn");
    heatmapModeButtons.forEach((button) => {
      const buttonMode = button.dataset.mode;
      if (buttonMode === currentMode) {
        button.setAttribute("data-active", "");
      } else {
        button.removeAttribute("data-active");
      }
    });
    if (this.heatmapManager && currentMode) {
      this.heatmapManager.setDisplayMode(currentMode);
    }
  }
  // ヒートマップ詳細設定の初期化
  initializeHeatmapDetailSettings() {
    if (!this.heatmapManager) return;
    const colorSchemeSelect = this.shadow.querySelector(".heatmap-color-scheme");
    if (colorSchemeSelect) {
      colorSchemeSelect.value = this.heatmapManager.getColorScheme();
    }
    const smoothToggle = this.shadow.querySelector(".heatmap-smooth-toggle");
    if (smoothToggle) {
      smoothToggle.checked = this.heatmapManager.getSmoothing();
    }
  }
  // 音量表示を更新するヘルパーメソッド
  updateVolumeDisplay() {
    const currentVolume = this.volumeHandler?.getVolume();
    const volumeLabel = this.shadow.querySelector("#volume .volume-label");
    const volumeRange = this.shadow.querySelector("#volume .volume-range");
    if (volumeLabel && currentVolume) volumeLabel.textContent = currentVolume.toFixed(2);
    if (volumeRange && currentVolume && this.volumeHandler) volumeRange.value = this.volumeHandler.linearToLogSliderValue(currentVolume).toString();
  }
  // 速度表示を更新するヘルパーメソッド
  updateSpeedDisplay() {
    const currentRate = this.speedHandler?.getPlaybackRate();
    const speedLabel = this.shadow.querySelector("#speed .speed-label");
    const speedRange = this.shadow.querySelector("#speed .speed-range");
    if (speedLabel && currentRate) speedLabel.textContent = currentRate.toFixed(2);
    if (speedRange && currentRate) speedRange.value = currentRate.toString();
  }
  startTimeUpdateInterval() {
    if (this.timeUpdateInterval) {
      clearInterval(this.timeUpdateInterval);
    }
    this.timeUpdateInterval = setInterval(() => {
      this.updateTimeDisplay();
      this.heatmapManager?.render();
    }, 1e3);
  }
  stopTimeUpdateInterval() {
    if (this.timeUpdateInterval) {
      clearInterval(this.timeUpdateInterval);
      this.timeUpdateInterval = null;
    }
  }
  updateTimeDisplay() {
    const timeLabel = this.shadow.querySelector("#playback .time-label");
    const trackerRange = this.shadow.querySelector("#playback .tracker-range");
    if (timeLabel && trackerRange && this.playbackHandler) {
      const state = this.playbackHandler.getPlaybackState();
      const currentTimeStr = this.playbackHandler.formatTime(state.currentTime);
      const durationStr = this.playbackHandler.formatTime(state.duration);
      timeLabel.textContent = `${currentTimeStr} / ${durationStr}`;
      if (state.duration > 0) {
        const progress = state.currentTime / state.duration * 100;
        trackerRange.value = progress.toString();
      }
    }
  }
  toggleLoop() {
    this.isLoopEnabled = !this.isLoopEnabled;
  }
  updateLoopButtonAppearance(button) {
    button.classList.toggle("active", this.isLoopEnabled);
  }
  /**
   * 再生・一時停止ボタンのアイコンを更新
   */
  updatePlayPauseButton() {
    const playPauseBtn = this.shadow.querySelector(".play-pause-btn");
    if (!playPauseBtn || !this.player) return;
    const isPlaying = this.player.isPlaying();
    const iconName = isPlaying ? "pause" : "play_arrow";
    playPauseBtn.innerHTML = createMaterialIcon(iconName, { style: "outlined", color: "white" });
    playPauseBtn.setAttribute("data-playing", isPlaying.toString());
  }
  /**
   * 動画の再生状態変更を監視してアイコンを更新
   */
  setupPlayStateListener() {
    if (!this.player) return;
    this.updatePlayPauseButton();
    setInterval(() => {
      this.updatePlayPauseButton();
    }, 250);
  }
  /**
   * 🆕 新規追加: モジュールシステムの初期化
   */
  async initializeModuleSystem() {
    try {
      await this.moduleManager.initialize();
      if (this.settingsUI && this.settingsUI.getInitializationStatus()) {
        this.settingsUI.renderModuleList();
      }
    } catch (error) {
      window.logger.error("[MlinkVideoController] モジュールシステムの初期化に失敗しました:", error);
    }
  }
  /**
   * 🆕 新規追加: 設定タブの初期化
   */
  initializeSettingsTab() {
    try {
      this.settingsUI.setShadowRoot(this.shadow);
      this.settingsUI.initialize();
    } catch (error) {
      window.logger.error("[MlinkVideoController] 設定タブの初期化に失敗しました:", error);
    }
  }
  /**
   * 🆕 新規追加: 排他グループのUI更新
   */
  updateExclusiveGroupUI(exclusiveGroup, enabledModuleId) {
    const allModules = this.moduleRegistry.getAllConfigs();
    const sameGroupModules = allModules.filter(
      (config) => config.exclusiveGroup === exclusiveGroup && config.id !== enabledModuleId
    );
    sameGroupModules.forEach((moduleConfig) => {
      const moduleItem = this.shadow.querySelector(`[data-module-id="${moduleConfig.id}"]`);
      if (moduleItem) {
        const toggle = moduleItem.querySelector(".module-toggle");
        const status = moduleItem.querySelector(".module-status");
        if (toggle) {
          toggle.checked = false;
        }
        if (status) {
          status.textContent = "inactive";
          status.className = "module-status inactive";
        }
      }
    });
  }
  /**
   * 🆕 新規追加: 設定を即時適用
   */
  async applySettingsImmediately() {
    try {
      const currentPageType = this.moduleManager.getCurrentPageType();
      const targetModules = this.moduleRegistry.getModulesByPage(currentPageType);
      let appliedCount = 0;
      let errorCount = 0;
      for (const moduleConfig of targetModules) {
        const isEnabled = this.settingsManager.isModuleEnabled(moduleConfig.id);
        const isLoaded = this.moduleManager.getLoadedModulesMap().has(moduleConfig.id);
        try {
          if (isEnabled && !isLoaded) {
            await this.moduleManager.loadModule(moduleConfig.id);
            appliedCount++;
          } else if (!isEnabled && isLoaded) {
            await this.moduleManager.unloadModule(moduleConfig.id);
            appliedCount++;
          }
        } catch (error) {
          window.logger.error(`[MlinkVideoController] モジュール ${moduleConfig.id} の即時適用に失敗:`, error);
          errorCount++;
        }
      }
      const message = `即時適用完了: ${appliedCount}個のモジュールを適用${errorCount > 0 ? `, ${errorCount}個でエラー` : ""}`;
      if (typeof window !== "undefined" && "toastr" in window) {
        window.toastr?.success(message);
      } else {
        alert(message);
      }
    } catch (error) {
      window.logger.error("[MlinkVideoController] 即時適用処理でエラー:", error);
      alert("即時適用中にエラーが発生しました。詳細はコンソールを確認してください。");
    }
  }
  setupVideoEndedListener() {
    setInterval(() => {
      if (this.isLoopEnabled && this.player) {
        const currentTime = this.player.getCurrentTime();
        const duration = this.player.getDuration();
        if (duration > 0 && currentTime > 0 && duration - currentTime <= 0.5) {
          this.player.seek(0);
          setTimeout(() => {
            void this.player?.play();
          }, 100);
        }
      }
    }, 500);
  }
  /**
   * キー伝搬停止処理を設定（ビデオプレイヤーのショートカットを防ぐ）
   */
  setupKeyPropagationPrevention() {
    const nicoShortcutKeys = {
      // 特殊キー（常に無効化）
      " ": "スペースキー（再生/一時停止）",
      "ArrowLeft": "左矢印（10秒戻る）",
      "ArrowRight": "右矢印（10秒進める）",
      "ArrowUp": "上矢印（音量5%アップ）",
      "ArrowDown": "下矢印（音量5%ダウン）",
      "Home": "動画の先頭に移動",
      "End": "動画の最後に移動",
      // 文字キー（入力フィールド以外で無効化）
      "f": "フルスクリーンモード切替",
      "F": "フルスクリーンモード切替",
      "p": "プレーヤー位置に移動",
      "P": "プレーヤー位置に移動",
      "c": "コメント入力欄にフォーカス",
      "C": "コメント入力欄にフォーカス",
      "s": "画面サイズの変更",
      "S": "画面サイズの変更",
      "k": "動画の再生/停止",
      "K": "動画の再生/停止",
      "j": "動画を10秒戻す",
      "J": "動画を10秒戻す",
      "r": "リピート再生の有効/無効",
      "R": "リピート再生の有効/無効",
      "n": "次の動画へ移動",
      "N": "次の動画へ移動",
      "m": "ミュート/ミュート解除",
      "M": "ミュート/ミュート解除",
      "o": "コメント透過度の変更",
      "O": "コメント透過度の変更",
      ",": "再生速度を下げる",
      ".": "再生速度を上げる",
      "<": "再生速度を下げる",
      ">": "再生速度を上げる"
    };
    const specialKeys = [" ", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End", "Escape"];
    const isInputElement = (element) => {
      if (!element) return false;
      const tagName = element.tagName.toLowerCase();
      const inputType = element.type?.toLowerCase();
      return tagName === "input" && (inputType === "text" || inputType === "search" || inputType === "password" || inputType === "email" || inputType === "url") || tagName === "textarea" || element.contentEditable === "true";
    };
    const setupInputFieldProtection = (input) => {
      ["keydown", "keypress", "keyup"].forEach((eventType) => {
        input.addEventListener(eventType, (e) => {
          const keyEvent = e;
          window.logger?.debug(`[MlinkVideoController] Input field key event: ${keyEvent.key} in ${input.tagName}`);
          keyEvent.stopPropagation();
          if (specialKeys.includes(keyEvent.key)) {
            keyEvent.preventDefault();
            window.logger?.debug(`[MlinkVideoController] Special key prevented in input: ${keyEvent.key}`);
          }
        }, true);
      });
    };
    const globalKeyHandler = (e) => {
      const keyEvent = e;
      const target = keyEvent.target;
      if (isInputElement(target)) {
        return;
      }
      const isInOurShadowDOM = this.shadow?.contains(target);
      if (!isInOurShadowDOM) return;
      if (nicoShortcutKeys[keyEvent.key]) {
        if (!keyEvent.ctrlKey) {
          keyEvent.preventDefault();
          keyEvent.stopPropagation();
          window.logger?.debug(`[MlinkVideoController] Nico shortcut prevented: ${keyEvent.key} (${nicoShortcutKeys[keyEvent.key]})`);
        }
      }
    };
    const inputSelectors = [
      'input[type="text"]',
      'input[type="search"]',
      'input[type="password"]',
      'input[type="email"]',
      'input[type="url"]',
      'input[type="number"]',
      "textarea",
      ".comment-search-input",
      ".seek-value"
    ];
    inputSelectors.forEach((selector) => {
      const elements = this.shadow?.querySelectorAll(selector) || [];
      elements.forEach((element) => {
        if (element instanceof HTMLElement) {
          setupInputFieldProtection(element);
          window.logger?.debug(`[MlinkVideoController] Protected input field: ${selector}`);
        }
      });
    });
    if (this.shadow) {
      this.shadow.addEventListener("keydown", globalKeyHandler, true);
      this.shadow.addEventListener("keypress", globalKeyHandler, true);
      window.logger?.debug("[MlinkVideoController] Global key prevention set up in Shadow DOM");
    }
    window.logger?.debug("[MlinkVideoController] Universal key propagation prevention setup completed");
  }
  // BasePanelのdisconnectedCallbackを上書きして購読解除を行う
  disconnectedCallback() {
    super.disconnectedCallback();
    if (this.commentDataChangedUnsubscribe) {
      this.commentDataChangedUnsubscribe();
      this.commentDataChangedUnsubscribe = null;
    }
  }
}
customElements.define("mlink-video-controller", MlinkVideoController);

class PanelManager {
  constructor() {
    this.panel = null;
    this.currentUrl = "";
    this.observer = new MutationObserver(this.handleDOMChanges.bind(this));
    this.observer.observe(document.body, {
      childList: true,
      subtree: true
    });
    this.currentUrl = location.href;
    this.setupUrlWatching();
    this.initialize();
  }
  handleDOMChanges(mutations) {
    const videoElementChanged = mutations.some((mutation) => {
      return Array.from(mutation.addedNodes).some(
        (node) => node instanceof HTMLElement && (node.tagName === "VIDEO" || node.querySelector("video"))
      ) || Array.from(mutation.removedNodes).some(
        (node) => node instanceof HTMLElement && (node.tagName === "VIDEO" || node.querySelector("video"))
      );
    });
    if (videoElementChanged) {
      this.reinitialize();
    }
  }
  initialize() {
    if (!this.panel) {
      this.panel = document.createElement("mlink-video-controller");
      document.body.appendChild(this.panel);
    }
  }
  reinitialize() {
    NicoVideoPlayer.getInstance().reinitialize();
  }
  setupUrlWatching() {
    window.addEventListener("popstate", () => {
      this.handleUrlChange();
    });
    setInterval(() => {
      if (location.href !== this.currentUrl) {
        this.handleUrlChange();
      }
    }, 1e3);
  }
  handleUrlChange() {
    const previousUrl = this.currentUrl;
    this.currentUrl = location.href;
    const isWatchPage = /\/watch\/[a-z]{2}\d+/.test(location.pathname);
    const wasWatchPage = /\/watch\/[a-z]{2}\d+/.test(new URL(previousUrl).pathname);
    window.logger?.info("URL変更を検出:", {
      from: previousUrl,
      to: this.currentUrl,
      isWatchPage,
      wasWatchPage
    });
    if (isWatchPage) {
      setTimeout(() => {
        this.reinitialize();
      }, 500);
    }
  }
}
document.addEventListener("DOMContentLoaded", () => {
  new PanelManager();
});

// DEFLATE is a complex format; to read this code, you should probably check the RFC first:
// https://tools.ietf.org/html/rfc1951
// You may also wish to take a look at the guide I made about this program:
// https://gist.github.com/101arrowz/253f31eb5abc3d9275ab943003ffecad
// Some of the following code is similar to that of UZIP.js:
// https://github.com/photopea/UZIP.js
// However, the vast majority of the codebase has diverged from UZIP.js to increase performance and reduce bundle size.
// Sometimes 0 will appear where -1 would be more appropriate. This is because using a uint
// is better for memory in most engines (I *think*).
var ch2 = {};
var wk = (function (c, id, msg, transfer, cb) {
    var w = new Worker(ch2[id] || (ch2[id] = URL.createObjectURL(new Blob([
        c + ';addEventListener("error",function(e){e=e.error;postMessage({$e$:[e.message,e.code,e.stack]})})'
    ], { type: 'text/javascript' }))));
    w.onmessage = function (e) {
        var d = e.data, ed = d.$e$;
        if (ed) {
            var err = new Error(ed[0]);
            err['code'] = ed[1];
            err.stack = ed[2];
            cb(err, null);
        }
        else
            cb(null, d);
    };
    w.postMessage(msg, transfer);
    return w;
});

// aliases for shorter compressed code (most minifers don't do this)
var u8 = Uint8Array, u16 = Uint16Array, i32 = Int32Array;
// fixed length extra bits
var fleb = new u8([0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0, /* unused */ 0, 0, /* impossible */ 0]);
// fixed distance extra bits
var fdeb = new u8([0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13, /* unused */ 0, 0]);
// code length index map
var clim = new u8([16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15]);
// get base, reverse index map from extra bits
var freb = function (eb, start) {
    var b = new u16(31);
    for (var i = 0; i < 31; ++i) {
        b[i] = start += 1 << eb[i - 1];
    }
    // numbers here are at max 18 bits
    var r = new i32(b[30]);
    for (var i = 1; i < 30; ++i) {
        for (var j = b[i]; j < b[i + 1]; ++j) {
            r[j] = ((j - b[i]) << 5) | i;
        }
    }
    return { b: b, r: r };
};
var _a = freb(fleb, 2), fl = _a.b, revfl = _a.r;
// we can ignore the fact that the other numbers are wrong; they never happen anyway
fl[28] = 258, revfl[258] = 28;
var _b = freb(fdeb, 0), fd = _b.b, revfd = _b.r;
// map of value to reverse (assuming 16 bits)
var rev = new u16(32768);
for (var i = 0; i < 32768; ++i) {
    // reverse table algorithm from SO
    var x = ((i & 0xAAAA) >> 1) | ((i & 0x5555) << 1);
    x = ((x & 0xCCCC) >> 2) | ((x & 0x3333) << 2);
    x = ((x & 0xF0F0) >> 4) | ((x & 0x0F0F) << 4);
    rev[i] = (((x & 0xFF00) >> 8) | ((x & 0x00FF) << 8)) >> 1;
}
// create huffman tree from u8 "map": index -> code length for code index
// mb (max bits) must be at most 15
// TODO: optimize/split up?
var hMap = (function (cd, mb, r) {
    var s = cd.length;
    // index
    var i = 0;
    // u16 "map": index -> # of codes with bit length = index
    var l = new u16(mb);
    // length of cd must be 288 (total # of codes)
    for (; i < s; ++i) {
        if (cd[i])
            ++l[cd[i] - 1];
    }
    // u16 "map": index -> minimum code for bit length = index
    var le = new u16(mb);
    for (i = 1; i < mb; ++i) {
        le[i] = (le[i - 1] + l[i - 1]) << 1;
    }
    var co;
    if (r) {
        // u16 "map": index -> number of actual bits, symbol for code
        co = new u16(1 << mb);
        // bits to remove for reverser
        var rvb = 15 - mb;
        for (i = 0; i < s; ++i) {
            // ignore 0 lengths
            if (cd[i]) {
                // num encoding both symbol and bits read
                var sv = (i << 4) | cd[i];
                // free bits
                var r_1 = mb - cd[i];
                // start value
                var v = le[cd[i] - 1]++ << r_1;
                // m is end value
                for (var m = v | ((1 << r_1) - 1); v <= m; ++v) {
                    // every 16 bit value starting with the code yields the same result
                    co[rev[v] >> rvb] = sv;
                }
            }
        }
    }
    else {
        co = new u16(s);
        for (i = 0; i < s; ++i) {
            if (cd[i]) {
                co[i] = rev[le[cd[i] - 1]++] >> (15 - cd[i]);
            }
        }
    }
    return co;
});
// fixed length tree
var flt = new u8(288);
for (var i = 0; i < 144; ++i)
    flt[i] = 8;
for (var i = 144; i < 256; ++i)
    flt[i] = 9;
for (var i = 256; i < 280; ++i)
    flt[i] = 7;
for (var i = 280; i < 288; ++i)
    flt[i] = 8;
// fixed distance tree
var fdt = new u8(32);
for (var i = 0; i < 32; ++i)
    fdt[i] = 5;
// fixed length map
var flm = /*#__PURE__*/ hMap(flt, 9, 0), flrm = /*#__PURE__*/ hMap(flt, 9, 1);
// fixed distance map
var fdm = /*#__PURE__*/ hMap(fdt, 5, 0), fdrm = /*#__PURE__*/ hMap(fdt, 5, 1);
// find max of array
var max = function (a) {
    var m = a[0];
    for (var i = 1; i < a.length; ++i) {
        if (a[i] > m)
            m = a[i];
    }
    return m;
};
// read d, starting at bit p and mask with m
var bits = function (d, p, m) {
    var o = (p / 8) | 0;
    return ((d[o] | (d[o + 1] << 8)) >> (p & 7)) & m;
};
// read d, starting at bit p continuing for at least 16 bits
var bits16 = function (d, p) {
    var o = (p / 8) | 0;
    return ((d[o] | (d[o + 1] << 8) | (d[o + 2] << 16)) >> (p & 7));
};
// get end of byte
var shft = function (p) { return ((p + 7) / 8) | 0; };
// typed array slice - allows garbage collector to free original reference,
// while being more compatible than .slice
var slc = function (v, s, e) {
    if (s == null || s < 0)
        s = 0;
    if (e == null || e > v.length)
        e = v.length;
    // can't use .constructor in case user-supplied
    return new u8(v.subarray(s, e));
};
/**
 * Codes for errors generated within this library
 */
var FlateErrorCode = {
    UnexpectedEOF: 0,
    InvalidBlockType: 1,
    InvalidLengthLiteral: 2,
    InvalidDistance: 3,
    StreamFinished: 4,
    NoStreamHandler: 5,
    InvalidHeader: 6,
    NoCallback: 7,
    InvalidUTF8: 8,
    ExtraFieldTooLong: 9,
    InvalidDate: 10,
    FilenameTooLong: 11,
    StreamFinishing: 12,
    InvalidZipData: 13,
    UnknownCompressionMethod: 14
};
// error codes
var ec = [
    'unexpected EOF',
    'invalid block type',
    'invalid length/literal',
    'invalid distance',
    'stream finished',
    'no stream handler',
    ,
    'no callback',
    'invalid UTF-8 data',
    'extra field too long',
    'date not in range 1980-2099',
    'filename too long',
    'stream finishing',
    'invalid zip data'
    // determined by unknown compression method
];
var err = function (ind, msg, nt) {
    var e = new Error(msg || ec[ind]);
    e.code = ind;
    if (Error.captureStackTrace)
        Error.captureStackTrace(e, err);
    if (!nt)
        throw e;
    return e;
};
// expands raw DEFLATE data
var inflt = function (dat, st, buf, dict) {
    // source length       dict length
    var sl = dat.length, dl = dict ? dict.length : 0;
    if (!sl || st.f && !st.l)
        return buf || new u8(0);
    var noBuf = !buf;
    // have to estimate size
    var resize = noBuf || st.i != 2;
    // no state
    var noSt = st.i;
    // Assumes roughly 33% compression ratio average
    if (noBuf)
        buf = new u8(sl * 3);
    // ensure buffer can fit at least l elements
    var cbuf = function (l) {
        var bl = buf.length;
        // need to increase size to fit
        if (l > bl) {
            // Double or set to necessary, whichever is greater
            var nbuf = new u8(Math.max(bl * 2, l));
            nbuf.set(buf);
            buf = nbuf;
        }
    };
    //  last chunk         bitpos           bytes
    var final = st.f || 0, pos = st.p || 0, bt = st.b || 0, lm = st.l, dm = st.d, lbt = st.m, dbt = st.n;
    // total bits
    var tbts = sl * 8;
    do {
        if (!lm) {
            // BFINAL - this is only 1 when last chunk is next
            final = bits(dat, pos, 1);
            // type: 0 = no compression, 1 = fixed huffman, 2 = dynamic huffman
            var type = bits(dat, pos + 1, 3);
            pos += 3;
            if (!type) {
                // go to end of byte boundary
                var s = shft(pos) + 4, l = dat[s - 4] | (dat[s - 3] << 8), t = s + l;
                if (t > sl) {
                    if (noSt)
                        err(0);
                    break;
                }
                // ensure size
                if (resize)
                    cbuf(bt + l);
                // Copy over uncompressed data
                buf.set(dat.subarray(s, t), bt);
                // Get new bitpos, update byte count
                st.b = bt += l, st.p = pos = t * 8, st.f = final;
                continue;
            }
            else if (type == 1)
                lm = flrm, dm = fdrm, lbt = 9, dbt = 5;
            else if (type == 2) {
                //  literal                            lengths
                var hLit = bits(dat, pos, 31) + 257, hcLen = bits(dat, pos + 10, 15) + 4;
                var tl = hLit + bits(dat, pos + 5, 31) + 1;
                pos += 14;
                // length+distance tree
                var ldt = new u8(tl);
                // code length tree
                var clt = new u8(19);
                for (var i = 0; i < hcLen; ++i) {
                    // use index map to get real code
                    clt[clim[i]] = bits(dat, pos + i * 3, 7);
                }
                pos += hcLen * 3;
                // code lengths bits
                var clb = max(clt), clbmsk = (1 << clb) - 1;
                // code lengths map
                var clm = hMap(clt, clb, 1);
                for (var i = 0; i < tl;) {
                    var r = clm[bits(dat, pos, clbmsk)];
                    // bits read
                    pos += r & 15;
                    // symbol
                    var s = r >> 4;
                    // code length to copy
                    if (s < 16) {
                        ldt[i++] = s;
                    }
                    else {
                        //  copy   count
                        var c = 0, n = 0;
                        if (s == 16)
                            n = 3 + bits(dat, pos, 3), pos += 2, c = ldt[i - 1];
                        else if (s == 17)
                            n = 3 + bits(dat, pos, 7), pos += 3;
                        else if (s == 18)
                            n = 11 + bits(dat, pos, 127), pos += 7;
                        while (n--)
                            ldt[i++] = c;
                    }
                }
                //    length tree                 distance tree
                var lt = ldt.subarray(0, hLit), dt = ldt.subarray(hLit);
                // max length bits
                lbt = max(lt);
                // max dist bits
                dbt = max(dt);
                lm = hMap(lt, lbt, 1);
                dm = hMap(dt, dbt, 1);
            }
            else
                err(1);
            if (pos > tbts) {
                if (noSt)
                    err(0);
                break;
            }
        }
        // Make sure the buffer can hold this + the largest possible addition
        // Maximum chunk size (practically, theoretically infinite) is 2^17
        if (resize)
            cbuf(bt + 131072);
        var lms = (1 << lbt) - 1, dms = (1 << dbt) - 1;
        var lpos = pos;
        for (;; lpos = pos) {
            // bits read, code
            var c = lm[bits16(dat, pos) & lms], sym = c >> 4;
            pos += c & 15;
            if (pos > tbts) {
                if (noSt)
                    err(0);
                break;
            }
            if (!c)
                err(2);
            if (sym < 256)
                buf[bt++] = sym;
            else if (sym == 256) {
                lpos = pos, lm = null;
                break;
            }
            else {
                var add = sym - 254;
                // no extra bits needed if less
                if (sym > 264) {
                    // index
                    var i = sym - 257, b = fleb[i];
                    add = bits(dat, pos, (1 << b) - 1) + fl[i];
                    pos += b;
                }
                // dist
                var d = dm[bits16(dat, pos) & dms], dsym = d >> 4;
                if (!d)
                    err(3);
                pos += d & 15;
                var dt = fd[dsym];
                if (dsym > 3) {
                    var b = fdeb[dsym];
                    dt += bits16(dat, pos) & (1 << b) - 1, pos += b;
                }
                if (pos > tbts) {
                    if (noSt)
                        err(0);
                    break;
                }
                if (resize)
                    cbuf(bt + 131072);
                var end = bt + add;
                if (bt < dt) {
                    var shift = dl - dt, dend = Math.min(dt, end);
                    if (shift + bt < 0)
                        err(3);
                    for (; bt < dend; ++bt)
                        buf[bt] = dict[shift + bt];
                }
                for (; bt < end; ++bt)
                    buf[bt] = buf[bt - dt];
            }
        }
        st.l = lm, st.p = lpos, st.b = bt, st.f = final;
        if (lm)
            final = 1, st.m = lbt, st.d = dm, st.n = dbt;
    } while (!final);
    // don't reallocate for streams or user buffers
    return bt != buf.length && noBuf ? slc(buf, 0, bt) : buf.subarray(0, bt);
};
// starting at p, write the minimum number of bits that can hold v to d
var wbits = function (d, p, v) {
    v <<= p & 7;
    var o = (p / 8) | 0;
    d[o] |= v;
    d[o + 1] |= v >> 8;
};
// starting at p, write the minimum number of bits (>8) that can hold v to d
var wbits16 = function (d, p, v) {
    v <<= p & 7;
    var o = (p / 8) | 0;
    d[o] |= v;
    d[o + 1] |= v >> 8;
    d[o + 2] |= v >> 16;
};
// creates code lengths from a frequency table
var hTree = function (d, mb) {
    // Need extra info to make a tree
    var t = [];
    for (var i = 0; i < d.length; ++i) {
        if (d[i])
            t.push({ s: i, f: d[i] });
    }
    var s = t.length;
    var t2 = t.slice();
    if (!s)
        return { t: et, l: 0 };
    if (s == 1) {
        var v = new u8(t[0].s + 1);
        v[t[0].s] = 1;
        return { t: v, l: 1 };
    }
    t.sort(function (a, b) { return a.f - b.f; });
    // after i2 reaches last ind, will be stopped
    // freq must be greater than largest possible number of symbols
    t.push({ s: -1, f: 25001 });
    var l = t[0], r = t[1], i0 = 0, i1 = 1, i2 = 2;
    t[0] = { s: -1, f: l.f + r.f, l: l, r: r };
    // efficient algorithm from UZIP.js
    // i0 is lookbehind, i2 is lookahead - after processing two low-freq
    // symbols that combined have high freq, will start processing i2 (high-freq,
    // non-composite) symbols instead
    // see https://reddit.com/r/photopea/comments/ikekht/uzipjs_questions/
    while (i1 != s - 1) {
        l = t[t[i0].f < t[i2].f ? i0++ : i2++];
        r = t[i0 != i1 && t[i0].f < t[i2].f ? i0++ : i2++];
        t[i1++] = { s: -1, f: l.f + r.f, l: l, r: r };
    }
    var maxSym = t2[0].s;
    for (var i = 1; i < s; ++i) {
        if (t2[i].s > maxSym)
            maxSym = t2[i].s;
    }
    // code lengths
    var tr = new u16(maxSym + 1);
    // max bits in tree
    var mbt = ln(t[i1 - 1], tr, 0);
    if (mbt > mb) {
        // more algorithms from UZIP.js
        // TODO: find out how this code works (debt)
        //  ind    debt
        var i = 0, dt = 0;
        //    left            cost
        var lft = mbt - mb, cst = 1 << lft;
        t2.sort(function (a, b) { return tr[b.s] - tr[a.s] || a.f - b.f; });
        for (; i < s; ++i) {
            var i2_1 = t2[i].s;
            if (tr[i2_1] > mb) {
                dt += cst - (1 << (mbt - tr[i2_1]));
                tr[i2_1] = mb;
            }
            else
                break;
        }
        dt >>= lft;
        while (dt > 0) {
            var i2_2 = t2[i].s;
            if (tr[i2_2] < mb)
                dt -= 1 << (mb - tr[i2_2]++ - 1);
            else
                ++i;
        }
        for (; i >= 0 && dt; --i) {
            var i2_3 = t2[i].s;
            if (tr[i2_3] == mb) {
                --tr[i2_3];
                ++dt;
            }
        }
        mbt = mb;
    }
    return { t: new u8(tr), l: mbt };
};
// get the max length and assign length codes
var ln = function (n, l, d) {
    return n.s == -1
        ? Math.max(ln(n.l, l, d + 1), ln(n.r, l, d + 1))
        : (l[n.s] = d);
};
// length codes generation
var lc = function (c) {
    var s = c.length;
    // Note that the semicolon was intentional
    while (s && !c[--s])
        ;
    var cl = new u16(++s);
    //  ind      num         streak
    var cli = 0, cln = c[0], cls = 1;
    var w = function (v) { cl[cli++] = v; };
    for (var i = 1; i <= s; ++i) {
        if (c[i] == cln && i != s)
            ++cls;
        else {
            if (!cln && cls > 2) {
                for (; cls > 138; cls -= 138)
                    w(32754);
                if (cls > 2) {
                    w(cls > 10 ? ((cls - 11) << 5) | 28690 : ((cls - 3) << 5) | 12305);
                    cls = 0;
                }
            }
            else if (cls > 3) {
                w(cln), --cls;
                for (; cls > 6; cls -= 6)
                    w(8304);
                if (cls > 2)
                    w(((cls - 3) << 5) | 8208), cls = 0;
            }
            while (cls--)
                w(cln);
            cls = 1;
            cln = c[i];
        }
    }
    return { c: cl.subarray(0, cli), n: s };
};
// calculate the length of output from tree, code lengths
var clen = function (cf, cl) {
    var l = 0;
    for (var i = 0; i < cl.length; ++i)
        l += cf[i] * cl[i];
    return l;
};
// writes a fixed block
// returns the new bit pos
var wfblk = function (out, pos, dat) {
    // no need to write 00 as type: TypedArray defaults to 0
    var s = dat.length;
    var o = shft(pos + 2);
    out[o] = s & 255;
    out[o + 1] = s >> 8;
    out[o + 2] = out[o] ^ 255;
    out[o + 3] = out[o + 1] ^ 255;
    for (var i = 0; i < s; ++i)
        out[o + i + 4] = dat[i];
    return (o + 4 + s) * 8;
};
// writes a block
var wblk = function (dat, out, final, syms, lf, df, eb, li, bs, bl, p) {
    wbits(out, p++, final);
    ++lf[256];
    var _a = hTree(lf, 15), dlt = _a.t, mlb = _a.l;
    var _b = hTree(df, 15), ddt = _b.t, mdb = _b.l;
    var _c = lc(dlt), lclt = _c.c, nlc = _c.n;
    var _d = lc(ddt), lcdt = _d.c, ndc = _d.n;
    var lcfreq = new u16(19);
    for (var i = 0; i < lclt.length; ++i)
        ++lcfreq[lclt[i] & 31];
    for (var i = 0; i < lcdt.length; ++i)
        ++lcfreq[lcdt[i] & 31];
    var _e = hTree(lcfreq, 7), lct = _e.t, mlcb = _e.l;
    var nlcc = 19;
    for (; nlcc > 4 && !lct[clim[nlcc - 1]]; --nlcc)
        ;
    var flen = (bl + 5) << 3;
    var ftlen = clen(lf, flt) + clen(df, fdt) + eb;
    var dtlen = clen(lf, dlt) + clen(df, ddt) + eb + 14 + 3 * nlcc + clen(lcfreq, lct) + 2 * lcfreq[16] + 3 * lcfreq[17] + 7 * lcfreq[18];
    if (bs >= 0 && flen <= ftlen && flen <= dtlen)
        return wfblk(out, p, dat.subarray(bs, bs + bl));
    var lm, ll, dm, dl;
    wbits(out, p, 1 + (dtlen < ftlen)), p += 2;
    if (dtlen < ftlen) {
        lm = hMap(dlt, mlb, 0), ll = dlt, dm = hMap(ddt, mdb, 0), dl = ddt;
        var llm = hMap(lct, mlcb, 0);
        wbits(out, p, nlc - 257);
        wbits(out, p + 5, ndc - 1);
        wbits(out, p + 10, nlcc - 4);
        p += 14;
        for (var i = 0; i < nlcc; ++i)
            wbits(out, p + 3 * i, lct[clim[i]]);
        p += 3 * nlcc;
        var lcts = [lclt, lcdt];
        for (var it = 0; it < 2; ++it) {
            var clct = lcts[it];
            for (var i = 0; i < clct.length; ++i) {
                var len = clct[i] & 31;
                wbits(out, p, llm[len]), p += lct[len];
                if (len > 15)
                    wbits(out, p, (clct[i] >> 5) & 127), p += clct[i] >> 12;
            }
        }
    }
    else {
        lm = flm, ll = flt, dm = fdm, dl = fdt;
    }
    for (var i = 0; i < li; ++i) {
        var sym = syms[i];
        if (sym > 255) {
            var len = (sym >> 18) & 31;
            wbits16(out, p, lm[len + 257]), p += ll[len + 257];
            if (len > 7)
                wbits(out, p, (sym >> 23) & 31), p += fleb[len];
            var dst = sym & 31;
            wbits16(out, p, dm[dst]), p += dl[dst];
            if (dst > 3)
                wbits16(out, p, (sym >> 5) & 8191), p += fdeb[dst];
        }
        else {
            wbits16(out, p, lm[sym]), p += ll[sym];
        }
    }
    wbits16(out, p, lm[256]);
    return p + ll[256];
};
// deflate options (nice << 13) | chain
var deo = /*#__PURE__*/ new i32([65540, 131080, 131088, 131104, 262176, 1048704, 1048832, 2114560, 2117632]);
// empty
var et = /*#__PURE__*/ new u8(0);
// compresses data into a raw DEFLATE buffer
var dflt = function (dat, lvl, plvl, pre, post, st) {
    var s = st.z || dat.length;
    var o = new u8(pre + s + 5 * (1 + Math.ceil(s / 7000)) + post);
    // writing to this writes to the output buffer
    var w = o.subarray(pre, o.length - post);
    var lst = st.l;
    var pos = (st.r || 0) & 7;
    if (lvl) {
        if (pos)
            w[0] = st.r >> 3;
        var opt = deo[lvl - 1];
        var n = opt >> 13, c = opt & 8191;
        var msk_1 = (1 << plvl) - 1;
        //    prev 2-byte val map    curr 2-byte val map
        var prev = st.p || new u16(32768), head = st.h || new u16(msk_1 + 1);
        var bs1_1 = Math.ceil(plvl / 3), bs2_1 = 2 * bs1_1;
        var hsh = function (i) { return (dat[i] ^ (dat[i + 1] << bs1_1) ^ (dat[i + 2] << bs2_1)) & msk_1; };
        // 24576 is an arbitrary number of maximum symbols per block
        // 424 buffer for last block
        var syms = new i32(25000);
        // length/literal freq   distance freq
        var lf = new u16(288), df = new u16(32);
        //  l/lcnt  exbits  index          l/lind  waitdx          blkpos
        var lc_1 = 0, eb = 0, i = st.i || 0, li = 0, wi = st.w || 0, bs = 0;
        for (; i + 2 < s; ++i) {
            // hash value
            var hv = hsh(i);
            // index mod 32768    previous index mod
            var imod = i & 32767, pimod = head[hv];
            prev[imod] = pimod;
            head[hv] = imod;
            // We always should modify head and prev, but only add symbols if
            // this data is not yet processed ("wait" for wait index)
            if (wi <= i) {
                // bytes remaining
                var rem = s - i;
                if ((lc_1 > 7000 || li > 24576) && (rem > 423 || !lst)) {
                    pos = wblk(dat, w, 0, syms, lf, df, eb, li, bs, i - bs, pos);
                    li = lc_1 = eb = 0, bs = i;
                    for (var j = 0; j < 286; ++j)
                        lf[j] = 0;
                    for (var j = 0; j < 30; ++j)
                        df[j] = 0;
                }
                //  len    dist   chain
                var l = 2, d = 0, ch_1 = c, dif = imod - pimod & 32767;
                if (rem > 2 && hv == hsh(i - dif)) {
                    var maxn = Math.min(n, rem) - 1;
                    var maxd = Math.min(32767, i);
                    // max possible length
                    // not capped at dif because decompressors implement "rolling" index population
                    var ml = Math.min(258, rem);
                    while (dif <= maxd && --ch_1 && imod != pimod) {
                        if (dat[i + l] == dat[i + l - dif]) {
                            var nl = 0;
                            for (; nl < ml && dat[i + nl] == dat[i + nl - dif]; ++nl)
                                ;
                            if (nl > l) {
                                l = nl, d = dif;
                                // break out early when we reach "nice" (we are satisfied enough)
                                if (nl > maxn)
                                    break;
                                // now, find the rarest 2-byte sequence within this
                                // length of literals and search for that instead.
                                // Much faster than just using the start
                                var mmd = Math.min(dif, nl - 2);
                                var md = 0;
                                for (var j = 0; j < mmd; ++j) {
                                    var ti = i - dif + j & 32767;
                                    var pti = prev[ti];
                                    var cd = ti - pti & 32767;
                                    if (cd > md)
                                        md = cd, pimod = ti;
                                }
                            }
                        }
                        // check the previous match
                        imod = pimod, pimod = prev[imod];
                        dif += imod - pimod & 32767;
                    }
                }
                // d will be nonzero only when a match was found
                if (d) {
                    // store both dist and len data in one int32
                    // Make sure this is recognized as a len/dist with 28th bit (2^28)
                    syms[li++] = 268435456 | (revfl[l] << 18) | revfd[d];
                    var lin = revfl[l] & 31, din = revfd[d] & 31;
                    eb += fleb[lin] + fdeb[din];
                    ++lf[257 + lin];
                    ++df[din];
                    wi = i + l;
                    ++lc_1;
                }
                else {
                    syms[li++] = dat[i];
                    ++lf[dat[i]];
                }
            }
        }
        for (i = Math.max(i, wi); i < s; ++i) {
            syms[li++] = dat[i];
            ++lf[dat[i]];
        }
        pos = wblk(dat, w, lst, syms, lf, df, eb, li, bs, i - bs, pos);
        if (!lst) {
            st.r = (pos & 7) | w[(pos / 8) | 0] << 3;
            // shft(pos) now 1 less if pos & 7 != 0
            pos -= 7;
            st.h = head, st.p = prev, st.i = i, st.w = wi;
        }
    }
    else {
        for (var i = st.w || 0; i < s + lst; i += 65535) {
            // end
            var e = i + 65535;
            if (e >= s) {
                // write final block
                w[(pos / 8) | 0] = lst;
                e = s;
            }
            pos = wfblk(w, pos + 1, dat.subarray(i, e));
        }
        st.i = s;
    }
    return slc(o, 0, pre + shft(pos) + post);
};
// CRC32 table
var crct = /*#__PURE__*/ (function () {
    var t = new Int32Array(256);
    for (var i = 0; i < 256; ++i) {
        var c = i, k = 9;
        while (--k)
            c = ((c & 1) && -306674912) ^ (c >>> 1);
        t[i] = c;
    }
    return t;
})();
// CRC32
var crc = function () {
    var c = -1;
    return {
        p: function (d) {
            // closures have awful performance
            var cr = c;
            for (var i = 0; i < d.length; ++i)
                cr = crct[(cr & 255) ^ d[i]] ^ (cr >>> 8);
            c = cr;
        },
        d: function () { return ~c; }
    };
};
// Adler32
var adler = function () {
    var a = 1, b = 0;
    return {
        p: function (d) {
            // closures have awful performance
            var n = a, m = b;
            var l = d.length | 0;
            for (var i = 0; i != l;) {
                var e = Math.min(i + 2655, l);
                for (; i < e; ++i)
                    m += n += d[i];
                n = (n & 65535) + 15 * (n >> 16), m = (m & 65535) + 15 * (m >> 16);
            }
            a = n, b = m;
        },
        d: function () {
            a %= 65521, b %= 65521;
            return (a & 255) << 24 | (a & 0xFF00) << 8 | (b & 255) << 8 | (b >> 8);
        }
    };
};
// deflate with opts
var dopt = function (dat, opt, pre, post, st) {
    if (!st) {
        st = { l: 1 };
        if (opt.dictionary) {
            var dict = opt.dictionary.subarray(-32768);
            var newDat = new u8(dict.length + dat.length);
            newDat.set(dict);
            newDat.set(dat, dict.length);
            dat = newDat;
            st.w = dict.length;
        }
    }
    return dflt(dat, opt.level == null ? 6 : opt.level, opt.mem == null ? (st.l ? Math.ceil(Math.max(8, Math.min(13, Math.log(dat.length))) * 1.5) : 20) : (12 + opt.mem), pre, post, st);
};
// Walmart object spread
var mrg = function (a, b) {
    var o = {};
    for (var k in a)
        o[k] = a[k];
    for (var k in b)
        o[k] = b[k];
    return o;
};
// worker clone
// This is possibly the craziest part of the entire codebase, despite how simple it may seem.
// The only parameter to this function is a closure that returns an array of variables outside of the function scope.
// We're going to try to figure out the variable names used in the closure as strings because that is crucial for workerization.
// We will return an object mapping of true variable name to value (basically, the current scope as a JS object).
// The reason we can't just use the original variable names is minifiers mangling the toplevel scope.
// This took me three weeks to figure out how to do.
var wcln = function (fn, fnStr, td) {
    var dt = fn();
    var st = fn.toString();
    var ks = st.slice(st.indexOf('[') + 1, st.lastIndexOf(']')).replace(/\s+/g, '').split(',');
    for (var i = 0; i < dt.length; ++i) {
        var v = dt[i], k = ks[i];
        if (typeof v == 'function') {
            fnStr += ';' + k + '=';
            var st_1 = v.toString();
            if (v.prototype) {
                // for global objects
                if (st_1.indexOf('[native code]') != -1) {
                    var spInd = st_1.indexOf(' ', 8) + 1;
                    fnStr += st_1.slice(spInd, st_1.indexOf('(', spInd));
                }
                else {
                    fnStr += st_1;
                    for (var t in v.prototype)
                        fnStr += ';' + k + '.prototype.' + t + '=' + v.prototype[t].toString();
                }
            }
            else
                fnStr += st_1;
        }
        else
            td[k] = v;
    }
    return fnStr;
};
var ch = [];
// clone bufs
var cbfs = function (v) {
    var tl = [];
    for (var k in v) {
        if (v[k].buffer) {
            tl.push((v[k] = new v[k].constructor(v[k])).buffer);
        }
    }
    return tl;
};
// use a worker to execute code
var wrkr = function (fns, init, id, cb) {
    if (!ch[id]) {
        var fnStr = '', td_1 = {}, m = fns.length - 1;
        for (var i = 0; i < m; ++i)
            fnStr = wcln(fns[i], fnStr, td_1);
        ch[id] = { c: wcln(fns[m], fnStr, td_1), e: td_1 };
    }
    var td = mrg({}, ch[id].e);
    return wk(ch[id].c + ';onmessage=function(e){for(var k in e.data)self[k]=e.data[k];onmessage=' + init.toString() + '}', id, td, cbfs(td), cb);
};
// base async inflate fn
var bInflt = function () { return [u8, u16, i32, fleb, fdeb, clim, fl, fd, flrm, fdrm, rev, ec, hMap, max, bits, bits16, shft, slc, err, inflt, inflateSync, pbf, gopt]; };
var bDflt = function () { return [u8, u16, i32, fleb, fdeb, clim, revfl, revfd, flm, flt, fdm, fdt, rev, deo, et, hMap, wbits, wbits16, hTree, ln, lc, clen, wfblk, wblk, shft, slc, dflt, dopt, deflateSync, pbf]; };
// gzip extra
var gze = function () { return [gzh, gzhl, wbytes, crc, crct]; };
// gunzip extra
var guze = function () { return [gzs, gzl]; };
// zlib extra
var zle = function () { return [zlh, wbytes, adler]; };
// unzlib extra
var zule = function () { return [zls]; };
// post buf
var pbf = function (msg) { return postMessage(msg, [msg.buffer]); };
// get opts
var gopt = function (o) { return o && {
    out: o.size && new u8(o.size),
    dictionary: o.dictionary
}; };
// async helper
var cbify = function (dat, opts, fns, init, id, cb) {
    var w = wrkr(fns, init, id, function (err, dat) {
        w.terminate();
        cb(err, dat);
    });
    w.postMessage([dat, opts], opts.consume ? [dat.buffer] : []);
    return function () { w.terminate(); };
};
// auto stream
var astrm = function (strm) {
    strm.ondata = function (dat, final) { return postMessage([dat, final], [dat.buffer]); };
    return function (ev) {
        if (ev.data.length) {
            strm.push(ev.data[0], ev.data[1]);
            postMessage([ev.data[0].length]);
        }
        else
            strm.flush();
    };
};
// async stream attach
var astrmify = function (fns, strm, opts, init, id, flush, ext) {
    var t;
    var w = wrkr(fns, init, id, function (err, dat) {
        if (err)
            w.terminate(), strm.ondata.call(strm, err);
        else if (!Array.isArray(dat))
            ext(dat);
        else if (dat.length == 1) {
            strm.queuedSize -= dat[0];
            if (strm.ondrain)
                strm.ondrain(dat[0]);
        }
        else {
            if (dat[1])
                w.terminate();
            strm.ondata.call(strm, err, dat[0], dat[1]);
        }
    });
    w.postMessage(opts);
    strm.queuedSize = 0;
    strm.push = function (d, f) {
        if (!strm.ondata)
            err(5);
        if (t)
            strm.ondata(err(4, 0, 1), null, !!f);
        strm.queuedSize += d.length;
        w.postMessage([d, t = f], [d.buffer]);
    };
    strm.terminate = function () { w.terminate(); };
    if (flush) {
        strm.flush = function () { w.postMessage([]); };
    }
};
// read 2 bytes
var b2 = function (d, b) { return d[b] | (d[b + 1] << 8); };
// read 4 bytes
var b4 = function (d, b) { return (d[b] | (d[b + 1] << 8) | (d[b + 2] << 16) | (d[b + 3] << 24)) >>> 0; };
var b8 = function (d, b) { return b4(d, b) + (b4(d, b + 4) * 4294967296); };
// write bytes
var wbytes = function (d, b, v) {
    for (; v; ++b)
        d[b] = v, v >>>= 8;
};
// gzip header
var gzh = function (c, o) {
    var fn = o.filename;
    c[0] = 31, c[1] = 139, c[2] = 8, c[8] = o.level < 2 ? 4 : o.level == 9 ? 2 : 0, c[9] = 3; // assume Unix
    if (o.mtime != 0)
        wbytes(c, 4, Math.floor(new Date(o.mtime || Date.now()) / 1000));
    if (fn) {
        c[3] = 8;
        for (var i = 0; i <= fn.length; ++i)
            c[i + 10] = fn.charCodeAt(i);
    }
};
// gzip footer: -8 to -4 = CRC, -4 to -0 is length
// gzip start
var gzs = function (d) {
    if (d[0] != 31 || d[1] != 139 || d[2] != 8)
        err(6, 'invalid gzip data');
    var flg = d[3];
    var st = 10;
    if (flg & 4)
        st += (d[10] | d[11] << 8) + 2;
    for (var zs = (flg >> 3 & 1) + (flg >> 4 & 1); zs > 0; zs -= !d[st++])
        ;
    return st + (flg & 2);
};
// gzip length
var gzl = function (d) {
    var l = d.length;
    return (d[l - 4] | d[l - 3] << 8 | d[l - 2] << 16 | d[l - 1] << 24) >>> 0;
};
// gzip header length
var gzhl = function (o) { return 10 + (o.filename ? o.filename.length + 1 : 0); };
// zlib header
var zlh = function (c, o) {
    var lv = o.level, fl = lv == 0 ? 0 : lv < 6 ? 1 : lv == 9 ? 3 : 2;
    c[0] = 120, c[1] = (fl << 6) | (o.dictionary && 32);
    c[1] |= 31 - ((c[0] << 8) | c[1]) % 31;
    if (o.dictionary) {
        var h = adler();
        h.p(o.dictionary);
        wbytes(c, 2, h.d());
    }
};
// zlib start
var zls = function (d, dict) {
    if ((d[0] & 15) != 8 || (d[0] >> 4) > 7 || ((d[0] << 8 | d[1]) % 31))
        err(6, 'invalid zlib data');
    if ((d[1] >> 5 & 1) == +!dict)
        err(6, 'invalid zlib data: ' + (d[1] & 32 ? 'need' : 'unexpected') + ' dictionary');
    return (d[1] >> 3 & 4) + 2;
};
function StrmOpt(opts, cb) {
    if (typeof opts == 'function')
        cb = opts, opts = {};
    this.ondata = cb;
    return opts;
}
/**
 * Streaming DEFLATE compression
 */
var Deflate = /*#__PURE__*/ (function () {
    function Deflate(opts, cb) {
        if (typeof opts == 'function')
            cb = opts, opts = {};
        this.ondata = cb;
        this.o = opts || {};
        this.s = { l: 0, i: 32768, w: 32768, z: 32768 };
        // Buffer length must always be 0 mod 32768 for index calculations to be correct when modifying head and prev
        // 98304 = 32768 (lookback) + 65536 (common chunk size)
        this.b = new u8(98304);
        if (this.o.dictionary) {
            var dict = this.o.dictionary.subarray(-32768);
            this.b.set(dict, 32768 - dict.length);
            this.s.i = 32768 - dict.length;
        }
    }
    Deflate.prototype.p = function (c, f) {
        this.ondata(dopt(c, this.o, 0, 0, this.s), f);
    };
    /**
     * Pushes a chunk to be deflated
     * @param chunk The chunk to push
     * @param final Whether this is the last chunk
     */
    Deflate.prototype.push = function (chunk, final) {
        if (!this.ondata)
            err(5);
        if (this.s.l)
            err(4);
        var endLen = chunk.length + this.s.z;
        if (endLen > this.b.length) {
            if (endLen > 2 * this.b.length - 32768) {
                var newBuf = new u8(endLen & -32768);
                newBuf.set(this.b.subarray(0, this.s.z));
                this.b = newBuf;
            }
            var split = this.b.length - this.s.z;
            this.b.set(chunk.subarray(0, split), this.s.z);
            this.s.z = this.b.length;
            this.p(this.b, false);
            this.b.set(this.b.subarray(-32768));
            this.b.set(chunk.subarray(split), 32768);
            this.s.z = chunk.length - split + 32768;
            this.s.i = 32766, this.s.w = 32768;
        }
        else {
            this.b.set(chunk, this.s.z);
            this.s.z += chunk.length;
        }
        this.s.l = final & 1;
        if (this.s.z > this.s.w + 8191 || final) {
            this.p(this.b, final || false);
            this.s.w = this.s.i, this.s.i -= 2;
        }
    };
    /**
     * Flushes buffered uncompressed data. Useful to immediately retrieve the
     * deflated output for small inputs.
     */
    Deflate.prototype.flush = function () {
        if (!this.ondata)
            err(5);
        if (this.s.l)
            err(4);
        this.p(this.b, false);
        this.s.w = this.s.i, this.s.i -= 2;
    };
    return Deflate;
}());
/**
 * Asynchronous streaming DEFLATE compression
 */
var AsyncDeflate = /*#__PURE__*/ (function () {
    function AsyncDeflate(opts, cb) {
        astrmify([
            bDflt,
            function () { return [astrm, Deflate]; }
        ], this, StrmOpt.call(this, opts, cb), function (ev) {
            var strm = new Deflate(ev.data);
            onmessage = astrm(strm);
        }, 6, 1);
    }
    return AsyncDeflate;
}());
function deflate(data, opts, cb) {
    if (!cb)
        cb = opts, opts = {};
    if (typeof cb != 'function')
        err(7);
    return cbify(data, opts, [
        bDflt,
    ], function (ev) { return pbf(deflateSync(ev.data[0], ev.data[1])); }, 0, cb);
}
/**
 * Compresses data with DEFLATE without any wrapper
 * @param data The data to compress
 * @param opts The compression options
 * @returns The deflated version of the data
 */
function deflateSync(data, opts) {
    return dopt(data, opts || {}, 0, 0);
}
/**
 * Streaming DEFLATE decompression
 */
var Inflate = /*#__PURE__*/ (function () {
    function Inflate(opts, cb) {
        // no StrmOpt here to avoid adding to workerizer
        if (typeof opts == 'function')
            cb = opts, opts = {};
        this.ondata = cb;
        var dict = opts && opts.dictionary && opts.dictionary.subarray(-32768);
        this.s = { i: 0, b: dict ? dict.length : 0 };
        this.o = new u8(32768);
        this.p = new u8(0);
        if (dict)
            this.o.set(dict);
    }
    Inflate.prototype.e = function (c) {
        if (!this.ondata)
            err(5);
        if (this.d)
            err(4);
        if (!this.p.length)
            this.p = c;
        else if (c.length) {
            var n = new u8(this.p.length + c.length);
            n.set(this.p), n.set(c, this.p.length), this.p = n;
        }
    };
    Inflate.prototype.c = function (final) {
        this.s.i = +(this.d = final || false);
        var bts = this.s.b;
        var dt = inflt(this.p, this.s, this.o);
        this.ondata(slc(dt, bts, this.s.b), this.d);
        this.o = slc(dt, this.s.b - 32768), this.s.b = this.o.length;
        this.p = slc(this.p, (this.s.p / 8) | 0), this.s.p &= 7;
    };
    /**
     * Pushes a chunk to be inflated
     * @param chunk The chunk to push
     * @param final Whether this is the final chunk
     */
    Inflate.prototype.push = function (chunk, final) {
        this.e(chunk), this.c(final);
    };
    return Inflate;
}());
/**
 * Asynchronous streaming DEFLATE decompression
 */
var AsyncInflate = /*#__PURE__*/ (function () {
    function AsyncInflate(opts, cb) {
        astrmify([
            bInflt,
            function () { return [astrm, Inflate]; }
        ], this, StrmOpt.call(this, opts, cb), function (ev) {
            var strm = new Inflate(ev.data);
            onmessage = astrm(strm);
        }, 7, 0);
    }
    return AsyncInflate;
}());
function inflate(data, opts, cb) {
    if (!cb)
        cb = opts, opts = {};
    if (typeof cb != 'function')
        err(7);
    return cbify(data, opts, [
        bInflt
    ], function (ev) { return pbf(inflateSync(ev.data[0], gopt(ev.data[1]))); }, 1, cb);
}
/**
 * Expands DEFLATE data with no wrapper
 * @param data The data to decompress
 * @param opts The decompression options
 * @returns The decompressed version of the data
 */
function inflateSync(data, opts) {
    return inflt(data, { i: 2 }, opts && opts.out, opts && opts.dictionary);
}
// before you yell at me for not just using extends, my reason is that TS inheritance is hard to workerize.
/**
 * Streaming GZIP compression
 */
var Gzip = /*#__PURE__*/ (function () {
    function Gzip(opts, cb) {
        this.c = crc();
        this.l = 0;
        this.v = 1;
        Deflate.call(this, opts, cb);
    }
    /**
     * Pushes a chunk to be GZIPped
     * @param chunk The chunk to push
     * @param final Whether this is the last chunk
     */
    Gzip.prototype.push = function (chunk, final) {
        this.c.p(chunk);
        this.l += chunk.length;
        Deflate.prototype.push.call(this, chunk, final);
    };
    Gzip.prototype.p = function (c, f) {
        var raw = dopt(c, this.o, this.v && gzhl(this.o), f && 8, this.s);
        if (this.v)
            gzh(raw, this.o), this.v = 0;
        if (f)
            wbytes(raw, raw.length - 8, this.c.d()), wbytes(raw, raw.length - 4, this.l);
        this.ondata(raw, f);
    };
    /**
     * Flushes buffered uncompressed data. Useful to immediately retrieve the
     * GZIPped output for small inputs.
     */
    Gzip.prototype.flush = function () {
        Deflate.prototype.flush.call(this);
    };
    return Gzip;
}());
/**
 * Asynchronous streaming GZIP compression
 */
var AsyncGzip = /*#__PURE__*/ (function () {
    function AsyncGzip(opts, cb) {
        astrmify([
            bDflt,
            gze,
            function () { return [astrm, Deflate, Gzip]; }
        ], this, StrmOpt.call(this, opts, cb), function (ev) {
            var strm = new Gzip(ev.data);
            onmessage = astrm(strm);
        }, 8, 1);
    }
    return AsyncGzip;
}());
function gzip(data, opts, cb) {
    if (!cb)
        cb = opts, opts = {};
    if (typeof cb != 'function')
        err(7);
    return cbify(data, opts, [
        bDflt,
        gze,
        function () { return [gzipSync]; }
    ], function (ev) { return pbf(gzipSync(ev.data[0], ev.data[1])); }, 2, cb);
}
/**
 * Compresses data with GZIP
 * @param data The data to compress
 * @param opts The compression options
 * @returns The gzipped version of the data
 */
function gzipSync(data, opts) {
    if (!opts)
        opts = {};
    var c = crc(), l = data.length;
    c.p(data);
    var d = dopt(data, opts, gzhl(opts), 8), s = d.length;
    return gzh(d, opts), wbytes(d, s - 8, c.d()), wbytes(d, s - 4, l), d;
}
/**
 * Streaming single or multi-member GZIP decompression
 */
var Gunzip = /*#__PURE__*/ (function () {
    function Gunzip(opts, cb) {
        this.v = 1;
        this.r = 0;
        Inflate.call(this, opts, cb);
    }
    /**
     * Pushes a chunk to be GUNZIPped
     * @param chunk The chunk to push
     * @param final Whether this is the last chunk
     */
    Gunzip.prototype.push = function (chunk, final) {
        Inflate.prototype.e.call(this, chunk);
        this.r += chunk.length;
        if (this.v) {
            var p = this.p.subarray(this.v - 1);
            var s = p.length > 3 ? gzs(p) : 4;
            if (s > p.length) {
                if (!final)
                    return;
            }
            else if (this.v > 1 && this.onmember) {
                this.onmember(this.r - p.length);
            }
            this.p = p.subarray(s), this.v = 0;
        }
        // necessary to prevent TS from using the closure value
        // This allows for workerization to function correctly
        Inflate.prototype.c.call(this, final);
        // process concatenated GZIP
        if (this.s.f && !this.s.l && !final) {
            this.v = shft(this.s.p) + 9;
            this.s = { i: 0 };
            this.o = new u8(0);
            this.push(new u8(0), final);
        }
    };
    return Gunzip;
}());
/**
 * Asynchronous streaming single or multi-member GZIP decompression
 */
var AsyncGunzip = /*#__PURE__*/ (function () {
    function AsyncGunzip(opts, cb) {
        var _this = this;
        astrmify([
            bInflt,
            guze,
            function () { return [astrm, Inflate, Gunzip]; }
        ], this, StrmOpt.call(this, opts, cb), function (ev) {
            var strm = new Gunzip(ev.data);
            strm.onmember = function (offset) { return postMessage(offset); };
            onmessage = astrm(strm);
        }, 9, 0, function (offset) { return _this.onmember && _this.onmember(offset); });
    }
    return AsyncGunzip;
}());
function gunzip(data, opts, cb) {
    if (!cb)
        cb = opts, opts = {};
    if (typeof cb != 'function')
        err(7);
    return cbify(data, opts, [
        bInflt,
        guze,
        function () { return [gunzipSync]; }
    ], function (ev) { return pbf(gunzipSync(ev.data[0], ev.data[1])); }, 3, cb);
}
/**
 * Expands GZIP data
 * @param data The data to decompress
 * @param opts The decompression options
 * @returns The decompressed version of the data
 */
function gunzipSync(data, opts) {
    var st = gzs(data);
    if (st + 8 > data.length)
        err(6, 'invalid gzip data');
    return inflt(data.subarray(st, -8), { i: 2 }, opts && opts.out || new u8(gzl(data)), opts && opts.dictionary);
}
/**
 * Streaming Zlib compression
 */
var Zlib = /*#__PURE__*/ (function () {
    function Zlib(opts, cb) {
        this.c = adler();
        this.v = 1;
        Deflate.call(this, opts, cb);
    }
    /**
     * Pushes a chunk to be zlibbed
     * @param chunk The chunk to push
     * @param final Whether this is the last chunk
     */
    Zlib.prototype.push = function (chunk, final) {
        this.c.p(chunk);
        Deflate.prototype.push.call(this, chunk, final);
    };
    Zlib.prototype.p = function (c, f) {
        var raw = dopt(c, this.o, this.v && (this.o.dictionary ? 6 : 2), f && 4, this.s);
        if (this.v)
            zlh(raw, this.o), this.v = 0;
        if (f)
            wbytes(raw, raw.length - 4, this.c.d());
        this.ondata(raw, f);
    };
    /**
     * Flushes buffered uncompressed data. Useful to immediately retrieve the
     * zlibbed output for small inputs.
     */
    Zlib.prototype.flush = function () {
        Deflate.prototype.flush.call(this);
    };
    return Zlib;
}());
/**
 * Asynchronous streaming Zlib compression
 */
var AsyncZlib = /*#__PURE__*/ (function () {
    function AsyncZlib(opts, cb) {
        astrmify([
            bDflt,
            zle,
            function () { return [astrm, Deflate, Zlib]; }
        ], this, StrmOpt.call(this, opts, cb), function (ev) {
            var strm = new Zlib(ev.data);
            onmessage = astrm(strm);
        }, 10, 1);
    }
    return AsyncZlib;
}());
function zlib(data, opts, cb) {
    if (!cb)
        cb = opts, opts = {};
    if (typeof cb != 'function')
        err(7);
    return cbify(data, opts, [
        bDflt,
        zle,
        function () { return [zlibSync]; }
    ], function (ev) { return pbf(zlibSync(ev.data[0], ev.data[1])); }, 4, cb);
}
/**
 * Compress data with Zlib
 * @param data The data to compress
 * @param opts The compression options
 * @returns The zlib-compressed version of the data
 */
function zlibSync(data, opts) {
    if (!opts)
        opts = {};
    var a = adler();
    a.p(data);
    var d = dopt(data, opts, opts.dictionary ? 6 : 2, 4);
    return zlh(d, opts), wbytes(d, d.length - 4, a.d()), d;
}
/**
 * Streaming Zlib decompression
 */
var Unzlib = /*#__PURE__*/ (function () {
    function Unzlib(opts, cb) {
        Inflate.call(this, opts, cb);
        this.v = opts && opts.dictionary ? 2 : 1;
    }
    /**
     * Pushes a chunk to be unzlibbed
     * @param chunk The chunk to push
     * @param final Whether this is the last chunk
     */
    Unzlib.prototype.push = function (chunk, final) {
        Inflate.prototype.e.call(this, chunk);
        if (this.v) {
            if (this.p.length < 6 && !final)
                return;
            this.p = this.p.subarray(zls(this.p, this.v - 1)), this.v = 0;
        }
        if (final) {
            if (this.p.length < 4)
                err(6, 'invalid zlib data');
            this.p = this.p.subarray(0, -4);
        }
        // necessary to prevent TS from using the closure value
        // This allows for workerization to function correctly
        Inflate.prototype.c.call(this, final);
    };
    return Unzlib;
}());
/**
 * Asynchronous streaming Zlib decompression
 */
var AsyncUnzlib = /*#__PURE__*/ (function () {
    function AsyncUnzlib(opts, cb) {
        astrmify([
            bInflt,
            zule,
            function () { return [astrm, Inflate, Unzlib]; }
        ], this, StrmOpt.call(this, opts, cb), function (ev) {
            var strm = new Unzlib(ev.data);
            onmessage = astrm(strm);
        }, 11, 0);
    }
    return AsyncUnzlib;
}());
function unzlib(data, opts, cb) {
    if (!cb)
        cb = opts, opts = {};
    if (typeof cb != 'function')
        err(7);
    return cbify(data, opts, [
        bInflt,
        zule,
        function () { return [unzlibSync]; }
    ], function (ev) { return pbf(unzlibSync(ev.data[0], gopt(ev.data[1]))); }, 5, cb);
}
/**
 * Expands Zlib data
 * @param data The data to decompress
 * @param opts The decompression options
 * @returns The decompressed version of the data
 */
function unzlibSync(data, opts) {
    return inflt(data.subarray(zls(data, opts && opts.dictionary), -4), { i: 2 }, opts && opts.out, opts && opts.dictionary);
}
/**
 * Streaming GZIP, Zlib, or raw DEFLATE decompression
 */
var Decompress = /*#__PURE__*/ (function () {
    function Decompress(opts, cb) {
        this.o = StrmOpt.call(this, opts, cb) || {};
        this.G = Gunzip;
        this.I = Inflate;
        this.Z = Unzlib;
    }
    // init substream
    // overriden by AsyncDecompress
    Decompress.prototype.i = function () {
        var _this = this;
        this.s.ondata = function (dat, final) {
            _this.ondata(dat, final);
        };
    };
    /**
     * Pushes a chunk to be decompressed
     * @param chunk The chunk to push
     * @param final Whether this is the last chunk
     */
    Decompress.prototype.push = function (chunk, final) {
        if (!this.ondata)
            err(5);
        if (!this.s) {
            if (this.p && this.p.length) {
                var n = new u8(this.p.length + chunk.length);
                n.set(this.p), n.set(chunk, this.p.length);
            }
            else
                this.p = chunk;
            if (this.p.length > 2) {
                this.s = (this.p[0] == 31 && this.p[1] == 139 && this.p[2] == 8)
                    ? new this.G(this.o)
                    : ((this.p[0] & 15) != 8 || (this.p[0] >> 4) > 7 || ((this.p[0] << 8 | this.p[1]) % 31))
                        ? new this.I(this.o)
                        : new this.Z(this.o);
                this.i();
                this.s.push(this.p, final);
                this.p = null;
            }
        }
        else
            this.s.push(chunk, final);
    };
    return Decompress;
}());
/**
 * Asynchronous streaming GZIP, Zlib, or raw DEFLATE decompression
 */
var AsyncDecompress = /*#__PURE__*/ (function () {
    function AsyncDecompress(opts, cb) {
        Decompress.call(this, opts, cb);
        this.queuedSize = 0;
        this.G = AsyncGunzip;
        this.I = AsyncInflate;
        this.Z = AsyncUnzlib;
    }
    AsyncDecompress.prototype.i = function () {
        var _this = this;
        this.s.ondata = function (err, dat, final) {
            _this.ondata(err, dat, final);
        };
        this.s.ondrain = function (size) {
            _this.queuedSize -= size;
            if (_this.ondrain)
                _this.ondrain(size);
        };
    };
    /**
     * Pushes a chunk to be decompressed
     * @param chunk The chunk to push
     * @param final Whether this is the last chunk
     */
    AsyncDecompress.prototype.push = function (chunk, final) {
        this.queuedSize += chunk.length;
        Decompress.prototype.push.call(this, chunk, final);
    };
    return AsyncDecompress;
}());
function decompress(data, opts, cb) {
    if (!cb)
        cb = opts, opts = {};
    if (typeof cb != 'function')
        err(7);
    return (data[0] == 31 && data[1] == 139 && data[2] == 8)
        ? gunzip(data, opts, cb)
        : ((data[0] & 15) != 8 || (data[0] >> 4) > 7 || ((data[0] << 8 | data[1]) % 31))
            ? inflate(data, opts, cb)
            : unzlib(data, opts, cb);
}
/**
 * Expands compressed GZIP, Zlib, or raw DEFLATE data, automatically detecting the format
 * @param data The data to decompress
 * @param opts The decompression options
 * @returns The decompressed version of the data
 */
function decompressSync(data, opts) {
    return (data[0] == 31 && data[1] == 139 && data[2] == 8)
        ? gunzipSync(data, opts)
        : ((data[0] & 15) != 8 || (data[0] >> 4) > 7 || ((data[0] << 8 | data[1]) % 31))
            ? inflateSync(data, opts)
            : unzlibSync(data, opts);
}
// flatten a directory structure
var fltn = function (d, p, t, o) {
    for (var k in d) {
        var val = d[k], n = p + k, op = o;
        if (Array.isArray(val))
            op = mrg(o, val[1]), val = val[0];
        if (val instanceof u8)
            t[n] = [val, op];
        else {
            t[n += '/'] = [new u8(0), op];
            fltn(val, n, t, o);
        }
    }
};
// text encoder
var te = typeof TextEncoder != 'undefined' && /*#__PURE__*/ new TextEncoder();
// text decoder
var td = typeof TextDecoder != 'undefined' && /*#__PURE__*/ new TextDecoder();
// text decoder stream
var tds = 0;
try {
    td.decode(et, { stream: true });
    tds = 1;
}
catch (e) { }
// decode UTF8
var dutf8 = function (d) {
    for (var r = '', i = 0;;) {
        var c = d[i++];
        var eb = (c > 127) + (c > 223) + (c > 239);
        if (i + eb > d.length)
            return { s: r, r: slc(d, i - 1) };
        if (!eb)
            r += String.fromCharCode(c);
        else if (eb == 3) {
            c = ((c & 15) << 18 | (d[i++] & 63) << 12 | (d[i++] & 63) << 6 | (d[i++] & 63)) - 65536,
                r += String.fromCharCode(55296 | (c >> 10), 56320 | (c & 1023));
        }
        else if (eb & 1)
            r += String.fromCharCode((c & 31) << 6 | (d[i++] & 63));
        else
            r += String.fromCharCode((c & 15) << 12 | (d[i++] & 63) << 6 | (d[i++] & 63));
    }
};
/**
 * Streaming UTF-8 decoding
 */
var DecodeUTF8 = /*#__PURE__*/ (function () {
    /**
     * Creates a UTF-8 decoding stream
     * @param cb The callback to call whenever data is decoded
     */
    function DecodeUTF8(cb) {
        this.ondata = cb;
        if (tds)
            this.t = new TextDecoder();
        else
            this.p = et;
    }
    /**
     * Pushes a chunk to be decoded from UTF-8 binary
     * @param chunk The chunk to push
     * @param final Whether this is the last chunk
     */
    DecodeUTF8.prototype.push = function (chunk, final) {
        if (!this.ondata)
            err(5);
        final = !!final;
        if (this.t) {
            this.ondata(this.t.decode(chunk, { stream: true }), final);
            if (final) {
                if (this.t.decode().length)
                    err(8);
                this.t = null;
            }
            return;
        }
        if (!this.p)
            err(4);
        var dat = new u8(this.p.length + chunk.length);
        dat.set(this.p);
        dat.set(chunk, this.p.length);
        var _a = dutf8(dat), s = _a.s, r = _a.r;
        if (final) {
            if (r.length)
                err(8);
            this.p = null;
        }
        else
            this.p = r;
        this.ondata(s, final);
    };
    return DecodeUTF8;
}());
/**
 * Streaming UTF-8 encoding
 */
var EncodeUTF8 = /*#__PURE__*/ (function () {
    /**
     * Creates a UTF-8 decoding stream
     * @param cb The callback to call whenever data is encoded
     */
    function EncodeUTF8(cb) {
        this.ondata = cb;
    }
    /**
     * Pushes a chunk to be encoded to UTF-8
     * @param chunk The string data to push
     * @param final Whether this is the last chunk
     */
    EncodeUTF8.prototype.push = function (chunk, final) {
        if (!this.ondata)
            err(5);
        if (this.d)
            err(4);
        this.ondata(strToU8(chunk), this.d = final || false);
    };
    return EncodeUTF8;
}());
/**
 * Converts a string into a Uint8Array for use with compression/decompression methods
 * @param str The string to encode
 * @param latin1 Whether or not to interpret the data as Latin-1. This should
 *               not need to be true unless decoding a binary string.
 * @returns The string encoded in UTF-8/Latin-1 binary
 */
function strToU8(str, latin1) {
    if (latin1) {
        var ar_1 = new u8(str.length);
        for (var i = 0; i < str.length; ++i)
            ar_1[i] = str.charCodeAt(i);
        return ar_1;
    }
    if (te)
        return te.encode(str);
    var l = str.length;
    var ar = new u8(str.length + (str.length >> 1));
    var ai = 0;
    var w = function (v) { ar[ai++] = v; };
    for (var i = 0; i < l; ++i) {
        if (ai + 5 > ar.length) {
            var n = new u8(ai + 8 + ((l - i) << 1));
            n.set(ar);
            ar = n;
        }
        var c = str.charCodeAt(i);
        if (c < 128 || latin1)
            w(c);
        else if (c < 2048)
            w(192 | (c >> 6)), w(128 | (c & 63));
        else if (c > 55295 && c < 57344)
            c = 65536 + (c & 1023 << 10) | (str.charCodeAt(++i) & 1023),
                w(240 | (c >> 18)), w(128 | ((c >> 12) & 63)), w(128 | ((c >> 6) & 63)), w(128 | (c & 63));
        else
            w(224 | (c >> 12)), w(128 | ((c >> 6) & 63)), w(128 | (c & 63));
    }
    return slc(ar, 0, ai);
}
/**
 * Converts a Uint8Array to a string
 * @param dat The data to decode to string
 * @param latin1 Whether or not to interpret the data as Latin-1. This should
 *               not need to be true unless encoding to binary string.
 * @returns The original UTF-8/Latin-1 string
 */
function strFromU8(dat, latin1) {
    if (latin1) {
        var r = '';
        for (var i = 0; i < dat.length; i += 16384)
            r += String.fromCharCode.apply(null, dat.subarray(i, i + 16384));
        return r;
    }
    else if (td) {
        return td.decode(dat);
    }
    else {
        var _a = dutf8(dat), s = _a.s, r = _a.r;
        if (r.length)
            err(8);
        return s;
    }
}
// deflate bit flag
var dbf = function (l) { return l == 1 ? 3 : l < 6 ? 2 : l == 9 ? 1 : 0; };
// skip local zip header
var slzh = function (d, b) { return b + 30 + b2(d, b + 26) + b2(d, b + 28); };
// read zip header
var zh = function (d, b, z) {
    var fnl = b2(d, b + 28), fn = strFromU8(d.subarray(b + 46, b + 46 + fnl), !(b2(d, b + 8) & 2048)), es = b + 46 + fnl, bs = b4(d, b + 20);
    var _a = z && bs == 4294967295 ? z64e(d, es) : [bs, b4(d, b + 24), b4(d, b + 42)], sc = _a[0], su = _a[1], off = _a[2];
    return [b2(d, b + 10), sc, su, fn, es + b2(d, b + 30) + b2(d, b + 32), off];
};
// read zip64 extra field
var z64e = function (d, b) {
    for (; b2(d, b) != 1; b += 4 + b2(d, b + 2))
        ;
    return [b8(d, b + 12), b8(d, b + 4), b8(d, b + 20)];
};
// extra field length
var exfl = function (ex) {
    var le = 0;
    if (ex) {
        for (var k in ex) {
            var l = ex[k].length;
            if (l > 65535)
                err(9);
            le += l + 4;
        }
    }
    return le;
};
// write zip header
var wzh = function (d, b, f, fn, u, c, ce, co) {
    var fl = fn.length, ex = f.extra, col = co && co.length;
    var exl = exfl(ex);
    wbytes(d, b, ce != null ? 0x2014B50 : 0x4034B50), b += 4;
    if (ce != null)
        d[b++] = 20, d[b++] = f.os;
    d[b] = 20, b += 2; // spec compliance? what's that?
    d[b++] = (f.flag << 1) | (c < 0 && 8), d[b++] = u && 8;
    d[b++] = f.compression & 255, d[b++] = f.compression >> 8;
    var dt = new Date(f.mtime == null ? Date.now() : f.mtime), y = dt.getFullYear() - 1980;
    if (y < 0 || y > 119)
        err(10);
    wbytes(d, b, (y << 25) | ((dt.getMonth() + 1) << 21) | (dt.getDate() << 16) | (dt.getHours() << 11) | (dt.getMinutes() << 5) | (dt.getSeconds() >> 1)), b += 4;
    if (c != -1) {
        wbytes(d, b, f.crc);
        wbytes(d, b + 4, c < 0 ? -c - 2 : c);
        wbytes(d, b + 8, f.size);
    }
    wbytes(d, b + 12, fl);
    wbytes(d, b + 14, exl), b += 16;
    if (ce != null) {
        wbytes(d, b, col);
        wbytes(d, b + 6, f.attrs);
        wbytes(d, b + 10, ce), b += 14;
    }
    d.set(fn, b);
    b += fl;
    if (exl) {
        for (var k in ex) {
            var exf = ex[k], l = exf.length;
            wbytes(d, b, +k);
            wbytes(d, b + 2, l);
            d.set(exf, b + 4), b += 4 + l;
        }
    }
    if (col)
        d.set(co, b), b += col;
    return b;
};
// write zip footer (end of central directory)
var wzf = function (o, b, c, d, e) {
    wbytes(o, b, 0x6054B50); // skip disk
    wbytes(o, b + 8, c);
    wbytes(o, b + 10, c);
    wbytes(o, b + 12, d);
    wbytes(o, b + 16, e);
};
/**
 * A pass-through stream to keep data uncompressed in a ZIP archive.
 */
var ZipPassThrough = /*#__PURE__*/ (function () {
    /**
     * Creates a pass-through stream that can be added to ZIP archives
     * @param filename The filename to associate with this data stream
     */
    function ZipPassThrough(filename) {
        this.filename = filename;
        this.c = crc();
        this.size = 0;
        this.compression = 0;
    }
    /**
     * Processes a chunk and pushes to the output stream. You can override this
     * method in a subclass for custom behavior, but by default this passes
     * the data through. You must call this.ondata(err, chunk, final) at some
     * point in this method.
     * @param chunk The chunk to process
     * @param final Whether this is the last chunk
     */
    ZipPassThrough.prototype.process = function (chunk, final) {
        this.ondata(null, chunk, final);
    };
    /**
     * Pushes a chunk to be added. If you are subclassing this with a custom
     * compression algorithm, note that you must push data from the source
     * file only, pre-compression.
     * @param chunk The chunk to push
     * @param final Whether this is the last chunk
     */
    ZipPassThrough.prototype.push = function (chunk, final) {
        if (!this.ondata)
            err(5);
        this.c.p(chunk);
        this.size += chunk.length;
        if (final)
            this.crc = this.c.d();
        this.process(chunk, final || false);
    };
    return ZipPassThrough;
}());
// I don't extend because TypeScript extension adds 1kB of runtime bloat
/**
 * Streaming DEFLATE compression for ZIP archives. Prefer using AsyncZipDeflate
 * for better performance
 */
var ZipDeflate = /*#__PURE__*/ (function () {
    /**
     * Creates a DEFLATE stream that can be added to ZIP archives
     * @param filename The filename to associate with this data stream
     * @param opts The compression options
     */
    function ZipDeflate(filename, opts) {
        var _this = this;
        if (!opts)
            opts = {};
        ZipPassThrough.call(this, filename);
        this.d = new Deflate(opts, function (dat, final) {
            _this.ondata(null, dat, final);
        });
        this.compression = 8;
        this.flag = dbf(opts.level);
    }
    ZipDeflate.prototype.process = function (chunk, final) {
        try {
            this.d.push(chunk, final);
        }
        catch (e) {
            this.ondata(e, null, final);
        }
    };
    /**
     * Pushes a chunk to be deflated
     * @param chunk The chunk to push
     * @param final Whether this is the last chunk
     */
    ZipDeflate.prototype.push = function (chunk, final) {
        ZipPassThrough.prototype.push.call(this, chunk, final);
    };
    return ZipDeflate;
}());
/**
 * Asynchronous streaming DEFLATE compression for ZIP archives
 */
var AsyncZipDeflate = /*#__PURE__*/ (function () {
    /**
     * Creates an asynchronous DEFLATE stream that can be added to ZIP archives
     * @param filename The filename to associate with this data stream
     * @param opts The compression options
     */
    function AsyncZipDeflate(filename, opts) {
        var _this = this;
        if (!opts)
            opts = {};
        ZipPassThrough.call(this, filename);
        this.d = new AsyncDeflate(opts, function (err, dat, final) {
            _this.ondata(err, dat, final);
        });
        this.compression = 8;
        this.flag = dbf(opts.level);
        this.terminate = this.d.terminate;
    }
    AsyncZipDeflate.prototype.process = function (chunk, final) {
        this.d.push(chunk, final);
    };
    /**
     * Pushes a chunk to be deflated
     * @param chunk The chunk to push
     * @param final Whether this is the last chunk
     */
    AsyncZipDeflate.prototype.push = function (chunk, final) {
        ZipPassThrough.prototype.push.call(this, chunk, final);
    };
    return AsyncZipDeflate;
}());
// TODO: Better tree shaking
/**
 * A zippable archive to which files can incrementally be added
 */
var Zip = /*#__PURE__*/ (function () {
    /**
     * Creates an empty ZIP archive to which files can be added
     * @param cb The callback to call whenever data for the generated ZIP archive
     *           is available
     */
    function Zip(cb) {
        this.ondata = cb;
        this.u = [];
        this.d = 1;
    }
    /**
     * Adds a file to the ZIP archive
     * @param file The file stream to add
     */
    Zip.prototype.add = function (file) {
        var _this = this;
        if (!this.ondata)
            err(5);
        // finishing or finished
        if (this.d & 2)
            this.ondata(err(4 + (this.d & 1) * 8, 0, 1), null, false);
        else {
            var f = strToU8(file.filename), fl_1 = f.length;
            var com = file.comment, o = com && strToU8(com);
            var u = fl_1 != file.filename.length || (o && (com.length != o.length));
            var hl_1 = fl_1 + exfl(file.extra) + 30;
            if (fl_1 > 65535)
                this.ondata(err(11, 0, 1), null, false);
            var header = new u8(hl_1);
            wzh(header, 0, file, f, u, -1);
            var chks_1 = [header];
            var pAll_1 = function () {
                for (var _i = 0, chks_2 = chks_1; _i < chks_2.length; _i++) {
                    var chk = chks_2[_i];
                    _this.ondata(null, chk, false);
                }
                chks_1 = [];
            };
            var tr_1 = this.d;
            this.d = 0;
            var ind_1 = this.u.length;
            var uf_1 = mrg(file, {
                f: f,
                u: u,
                o: o,
                t: function () {
                    if (file.terminate)
                        file.terminate();
                },
                r: function () {
                    pAll_1();
                    if (tr_1) {
                        var nxt = _this.u[ind_1 + 1];
                        if (nxt)
                            nxt.r();
                        else
                            _this.d = 1;
                    }
                    tr_1 = 1;
                }
            });
            var cl_1 = 0;
            file.ondata = function (err, dat, final) {
                if (err) {
                    _this.ondata(err, dat, final);
                    _this.terminate();
                }
                else {
                    cl_1 += dat.length;
                    chks_1.push(dat);
                    if (final) {
                        var dd = new u8(16);
                        wbytes(dd, 0, 0x8074B50);
                        wbytes(dd, 4, file.crc);
                        wbytes(dd, 8, cl_1);
                        wbytes(dd, 12, file.size);
                        chks_1.push(dd);
                        uf_1.c = cl_1, uf_1.b = hl_1 + cl_1 + 16, uf_1.crc = file.crc, uf_1.size = file.size;
                        if (tr_1)
                            uf_1.r();
                        tr_1 = 1;
                    }
                    else if (tr_1)
                        pAll_1();
                }
            };
            this.u.push(uf_1);
        }
    };
    /**
     * Ends the process of adding files and prepares to emit the final chunks.
     * This *must* be called after adding all desired files for the resulting
     * ZIP file to work properly.
     */
    Zip.prototype.end = function () {
        var _this = this;
        if (this.d & 2) {
            this.ondata(err(4 + (this.d & 1) * 8, 0, 1), null, true);
            return;
        }
        if (this.d)
            this.e();
        else
            this.u.push({
                r: function () {
                    if (!(_this.d & 1))
                        return;
                    _this.u.splice(-1, 1);
                    _this.e();
                },
                t: function () { }
            });
        this.d = 3;
    };
    Zip.prototype.e = function () {
        var bt = 0, l = 0, tl = 0;
        for (var _i = 0, _a = this.u; _i < _a.length; _i++) {
            var f = _a[_i];
            tl += 46 + f.f.length + exfl(f.extra) + (f.o ? f.o.length : 0);
        }
        var out = new u8(tl + 22);
        for (var _b = 0, _c = this.u; _b < _c.length; _b++) {
            var f = _c[_b];
            wzh(out, bt, f, f.f, f.u, -f.c - 2, l, f.o);
            bt += 46 + f.f.length + exfl(f.extra) + (f.o ? f.o.length : 0), l += f.b;
        }
        wzf(out, bt, this.u.length, tl, l);
        this.ondata(null, out, true);
        this.d = 2;
    };
    /**
     * A method to terminate any internal workers used by the stream. Subsequent
     * calls to add() will fail.
     */
    Zip.prototype.terminate = function () {
        for (var _i = 0, _a = this.u; _i < _a.length; _i++) {
            var f = _a[_i];
            f.t();
        }
        this.d = 2;
    };
    return Zip;
}());
function zip(data, opts, cb) {
    if (!cb)
        cb = opts, opts = {};
    if (typeof cb != 'function')
        err(7);
    var r = {};
    fltn(data, '', r, opts);
    var k = Object.keys(r);
    var lft = k.length, o = 0, tot = 0;
    var slft = lft, files = new Array(lft);
    var term = [];
    var tAll = function () {
        for (var i = 0; i < term.length; ++i)
            term[i]();
    };
    var cbd = function (a, b) {
        mt(function () { cb(a, b); });
    };
    mt(function () { cbd = cb; });
    var cbf = function () {
        var out = new u8(tot + 22), oe = o, cdl = tot - o;
        tot = 0;
        for (var i = 0; i < slft; ++i) {
            var f = files[i];
            try {
                var l = f.c.length;
                wzh(out, tot, f, f.f, f.u, l);
                var badd = 30 + f.f.length + exfl(f.extra);
                var loc = tot + badd;
                out.set(f.c, loc);
                wzh(out, o, f, f.f, f.u, l, tot, f.m), o += 16 + badd + (f.m ? f.m.length : 0), tot = loc + l;
            }
            catch (e) {
                return cbd(e, null);
            }
        }
        wzf(out, o, files.length, cdl, oe);
        cbd(null, out);
    };
    if (!lft)
        cbf();
    var _loop_1 = function (i) {
        var fn = k[i];
        var _a = r[fn], file = _a[0], p = _a[1];
        var c = crc(), size = file.length;
        c.p(file);
        var f = strToU8(fn), s = f.length;
        var com = p.comment, m = com && strToU8(com), ms = m && m.length;
        var exl = exfl(p.extra);
        var compression = p.level == 0 ? 0 : 8;
        var cbl = function (e, d) {
            if (e) {
                tAll();
                cbd(e, null);
            }
            else {
                var l = d.length;
                files[i] = mrg(p, {
                    size: size,
                    crc: c.d(),
                    c: d,
                    f: f,
                    m: m,
                    u: s != fn.length || (m && (com.length != ms)),
                    compression: compression
                });
                o += 30 + s + exl + l;
                tot += 76 + 2 * (s + exl) + (ms || 0) + l;
                if (!--lft)
                    cbf();
            }
        };
        if (s > 65535)
            cbl(err(11, 0, 1), null);
        if (!compression)
            cbl(null, file);
        else if (size < 160000) {
            try {
                cbl(null, deflateSync(file, p));
            }
            catch (e) {
                cbl(e, null);
            }
        }
        else
            term.push(deflate(file, p, cbl));
    };
    // Cannot use lft because it can decrease
    for (var i = 0; i < slft; ++i) {
        _loop_1(i);
    }
    return tAll;
}
/**
 * Synchronously creates a ZIP file. Prefer using `zip` for better performance
 * with more than one file.
 * @param data The directory structure for the ZIP archive
 * @param opts The main options, merged with per-file options
 * @returns The generated ZIP archive
 */
function zipSync(data, opts) {
    if (!opts)
        opts = {};
    var r = {};
    var files = [];
    fltn(data, '', r, opts);
    var o = 0;
    var tot = 0;
    for (var fn in r) {
        var _a = r[fn], file = _a[0], p = _a[1];
        var compression = p.level == 0 ? 0 : 8;
        var f = strToU8(fn), s = f.length;
        var com = p.comment, m = com && strToU8(com), ms = m && m.length;
        var exl = exfl(p.extra);
        if (s > 65535)
            err(11);
        var d = compression ? deflateSync(file, p) : file, l = d.length;
        var c = crc();
        c.p(file);
        files.push(mrg(p, {
            size: file.length,
            crc: c.d(),
            c: d,
            f: f,
            m: m,
            u: s != fn.length || (m && (com.length != ms)),
            o: o,
            compression: compression
        }));
        o += 30 + s + exl + l;
        tot += 76 + 2 * (s + exl) + (ms || 0) + l;
    }
    var out = new u8(tot + 22), oe = o, cdl = tot - o;
    for (var i = 0; i < files.length; ++i) {
        var f = files[i];
        wzh(out, f.o, f, f.f, f.u, f.c.length);
        var badd = 30 + f.f.length + exfl(f.extra);
        out.set(f.c, f.o + badd);
        wzh(out, o, f, f.f, f.u, f.c.length, f.o, f.m), o += 16 + badd + (f.m ? f.m.length : 0);
    }
    wzf(out, o, files.length, cdl, oe);
    return out;
}
/**
 * Streaming pass-through decompression for ZIP archives
 */
var UnzipPassThrough = /*#__PURE__*/ (function () {
    function UnzipPassThrough() {
    }
    UnzipPassThrough.prototype.push = function (data, final) {
        this.ondata(null, data, final);
    };
    UnzipPassThrough.compression = 0;
    return UnzipPassThrough;
}());
/**
 * Streaming DEFLATE decompression for ZIP archives. Prefer AsyncZipInflate for
 * better performance.
 */
var UnzipInflate = /*#__PURE__*/ (function () {
    /**
     * Creates a DEFLATE decompression that can be used in ZIP archives
     */
    function UnzipInflate() {
        var _this = this;
        this.i = new Inflate(function (dat, final) {
            _this.ondata(null, dat, final);
        });
    }
    UnzipInflate.prototype.push = function (data, final) {
        try {
            this.i.push(data, final);
        }
        catch (e) {
            this.ondata(e, null, final);
        }
    };
    UnzipInflate.compression = 8;
    return UnzipInflate;
}());
/**
 * Asynchronous streaming DEFLATE decompression for ZIP archives
 */
var AsyncUnzipInflate = /*#__PURE__*/ (function () {
    /**
     * Creates a DEFLATE decompression that can be used in ZIP archives
     */
    function AsyncUnzipInflate(_, sz) {
        var _this = this;
        if (sz < 320000) {
            this.i = new Inflate(function (dat, final) {
                _this.ondata(null, dat, final);
            });
        }
        else {
            this.i = new AsyncInflate(function (err, dat, final) {
                _this.ondata(err, dat, final);
            });
            this.terminate = this.i.terminate;
        }
    }
    AsyncUnzipInflate.prototype.push = function (data, final) {
        if (this.i.terminate)
            data = slc(data, 0);
        this.i.push(data, final);
    };
    AsyncUnzipInflate.compression = 8;
    return AsyncUnzipInflate;
}());
/**
 * A ZIP archive decompression stream that emits files as they are discovered
 */
var Unzip = /*#__PURE__*/ (function () {
    /**
     * Creates a ZIP decompression stream
     * @param cb The callback to call whenever a file in the ZIP archive is found
     */
    function Unzip(cb) {
        this.onfile = cb;
        this.k = [];
        this.o = {
            0: UnzipPassThrough
        };
        this.p = et;
    }
    /**
     * Pushes a chunk to be unzipped
     * @param chunk The chunk to push
     * @param final Whether this is the last chunk
     */
    Unzip.prototype.push = function (chunk, final) {
        var _this = this;
        if (!this.onfile)
            err(5);
        if (!this.p)
            err(4);
        if (this.c > 0) {
            var len = Math.min(this.c, chunk.length);
            var toAdd = chunk.subarray(0, len);
            this.c -= len;
            if (this.d)
                this.d.push(toAdd, !this.c);
            else
                this.k[0].push(toAdd);
            chunk = chunk.subarray(len);
            if (chunk.length)
                return this.push(chunk, final);
        }
        else {
            var f = 0, i = 0, is = void 0, buf = void 0;
            if (!this.p.length)
                buf = chunk;
            else if (!chunk.length)
                buf = this.p;
            else {
                buf = new u8(this.p.length + chunk.length);
                buf.set(this.p), buf.set(chunk, this.p.length);
            }
            var l = buf.length, oc = this.c, add = oc && this.d;
            var _loop_2 = function () {
                var _a;
                var sig = b4(buf, i);
                if (sig == 0x4034B50) {
                    f = 1, is = i;
                    this_1.d = null;
                    this_1.c = 0;
                    var bf = b2(buf, i + 6), cmp_1 = b2(buf, i + 8), u = bf & 2048, dd = bf & 8, fnl = b2(buf, i + 26), es = b2(buf, i + 28);
                    if (l > i + 30 + fnl + es) {
                        var chks_3 = [];
                        this_1.k.unshift(chks_3);
                        f = 2;
                        var sc_1 = b4(buf, i + 18), su_1 = b4(buf, i + 22);
                        var fn_1 = strFromU8(buf.subarray(i + 30, i += 30 + fnl), !u);
                        if (sc_1 == 4294967295) {
                            _a = dd ? [-2] : z64e(buf, i), sc_1 = _a[0], su_1 = _a[1];
                        }
                        else if (dd)
                            sc_1 = -1;
                        i += es;
                        this_1.c = sc_1;
                        var d_1;
                        var file_1 = {
                            name: fn_1,
                            compression: cmp_1,
                            start: function () {
                                if (!file_1.ondata)
                                    err(5);
                                if (!sc_1)
                                    file_1.ondata(null, et, true);
                                else {
                                    var ctr = _this.o[cmp_1];
                                    if (!ctr)
                                        file_1.ondata(err(14, 'unknown compression type ' + cmp_1, 1), null, false);
                                    d_1 = sc_1 < 0 ? new ctr(fn_1) : new ctr(fn_1, sc_1, su_1);
                                    d_1.ondata = function (err, dat, final) { file_1.ondata(err, dat, final); };
                                    for (var _i = 0, chks_4 = chks_3; _i < chks_4.length; _i++) {
                                        var dat = chks_4[_i];
                                        d_1.push(dat, false);
                                    }
                                    if (_this.k[0] == chks_3 && _this.c)
                                        _this.d = d_1;
                                    else
                                        d_1.push(et, true);
                                }
                            },
                            terminate: function () {
                                if (d_1 && d_1.terminate)
                                    d_1.terminate();
                            }
                        };
                        if (sc_1 >= 0)
                            file_1.size = sc_1, file_1.originalSize = su_1;
                        this_1.onfile(file_1);
                    }
                    return "break";
                }
                else if (oc) {
                    if (sig == 0x8074B50) {
                        is = i += 12 + (oc == -2 && 8), f = 3, this_1.c = 0;
                        return "break";
                    }
                    else if (sig == 0x2014B50) {
                        is = i -= 4, f = 3, this_1.c = 0;
                        return "break";
                    }
                }
            };
            var this_1 = this;
            for (; i < l - 4; ++i) {
                var state_1 = _loop_2();
                if (state_1 === "break")
                    break;
            }
            this.p = et;
            if (oc < 0) {
                var dat = f ? buf.subarray(0, is - 12 - (oc == -2 && 8) - (b4(buf, is - 16) == 0x8074B50 && 4)) : buf.subarray(0, i);
                if (add)
                    add.push(dat, !!f);
                else
                    this.k[+(f == 2)].push(dat);
            }
            if (f & 2)
                return this.push(buf.subarray(i), final);
            this.p = buf.subarray(i);
        }
        if (final) {
            if (this.c)
                err(13);
            this.p = null;
        }
    };
    /**
     * Registers a decoder with the stream, allowing for files compressed with
     * the compression type provided to be expanded correctly
     * @param decoder The decoder constructor
     */
    Unzip.prototype.register = function (decoder) {
        this.o[decoder.compression] = decoder;
    };
    return Unzip;
}());
var mt = typeof queueMicrotask == 'function' ? queueMicrotask : typeof setTimeout == 'function' ? setTimeout : function (fn) { fn(); };
function unzip(data, opts, cb) {
    if (!cb)
        cb = opts, opts = {};
    if (typeof cb != 'function')
        err(7);
    var term = [];
    var tAll = function () {
        for (var i = 0; i < term.length; ++i)
            term[i]();
    };
    var files = {};
    var cbd = function (a, b) {
        mt(function () { cb(a, b); });
    };
    mt(function () { cbd = cb; });
    var e = data.length - 22;
    for (; b4(data, e) != 0x6054B50; --e) {
        if (!e || data.length - e > 65558) {
            cbd(err(13, 0, 1), null);
            return tAll;
        }
    }
    var lft = b2(data, e + 8);
    if (lft) {
        var c = lft;
        var o = b4(data, e + 16);
        var z = o == 4294967295 || c == 65535;
        if (z) {
            var ze = b4(data, e - 12);
            z = b4(data, ze) == 0x6064B50;
            if (z) {
                c = lft = b4(data, ze + 32);
                o = b4(data, ze + 48);
            }
        }
        var fltr = opts && opts.filter;
        var _loop_3 = function (i) {
            var _a = zh(data, o, z), c_1 = _a[0], sc = _a[1], su = _a[2], fn = _a[3], no = _a[4], off = _a[5], b = slzh(data, off);
            o = no;
            var cbl = function (e, d) {
                if (e) {
                    tAll();
                    cbd(e, null);
                }
                else {
                    if (d)
                        files[fn] = d;
                    if (!--lft)
                        cbd(null, files);
                }
            };
            if (!fltr || fltr({
                name: fn,
                size: sc,
                originalSize: su,
                compression: c_1
            })) {
                if (!c_1)
                    cbl(null, slc(data, b, b + sc));
                else if (c_1 == 8) {
                    var infl = data.subarray(b, b + sc);
                    // Synchronously decompress under 512KB, or barely-compressed data
                    if (su < 524288 || sc > 0.8 * su) {
                        try {
                            cbl(null, inflateSync(infl, { out: new u8(su) }));
                        }
                        catch (e) {
                            cbl(e, null);
                        }
                    }
                    else
                        term.push(inflate(infl, { size: su }, cbl));
                }
                else
                    cbl(err(14, 'unknown compression type ' + c_1, 1), null);
            }
            else
                cbl(null, null);
        };
        for (var i = 0; i < c; ++i) {
            _loop_3(i);
        }
    }
    else
        cbd(null, {});
    return tAll;
}
/**
 * Synchronously decompresses a ZIP archive. Prefer using `unzip` for better
 * performance with more than one file.
 * @param data The raw compressed ZIP file
 * @param opts The ZIP extraction options
 * @returns The decompressed files
 */
function unzipSync(data, opts) {
    var files = {};
    var e = data.length - 22;
    for (; b4(data, e) != 0x6054B50; --e) {
        if (!e || data.length - e > 65558)
            err(13);
    }
    var c = b2(data, e + 8);
    if (!c)
        return {};
    var o = b4(data, e + 16);
    var z = o == 4294967295 || c == 65535;
    if (z) {
        var ze = b4(data, e - 12);
        z = b4(data, ze) == 0x6064B50;
        if (z) {
            c = b4(data, ze + 32);
            o = b4(data, ze + 48);
        }
    }
    var fltr = opts && opts.filter;
    for (var i = 0; i < c; ++i) {
        var _a = zh(data, o, z), c_2 = _a[0], sc = _a[1], su = _a[2], fn = _a[3], no = _a[4], off = _a[5], b = slzh(data, off);
        o = no;
        if (!fltr || fltr({
            name: fn,
            size: sc,
            originalSize: su,
            compression: c_2
        })) {
            if (!c_2)
                files[fn] = slc(data, b, b + sc);
            else if (c_2 == 8)
                files[fn] = inflateSync(data.subarray(b, b + sc), { out: new u8(su) });
            else
                err(14, 'unknown compression type ' + c_2);
        }
    }
    return files;
}

const browser = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  AsyncCompress: AsyncGzip,
  AsyncDecompress,
  AsyncDeflate,
  AsyncGunzip,
  AsyncGzip,
  AsyncInflate,
  AsyncUnzipInflate,
  AsyncUnzlib,
  AsyncZipDeflate,
  AsyncZlib,
  Compress: Gzip,
  DecodeUTF8,
  Decompress,
  Deflate,
  EncodeUTF8,
  FlateErrorCode,
  Gunzip,
  Gzip,
  Inflate,
  Unzip,
  UnzipInflate,
  UnzipPassThrough,
  Unzlib,
  Zip,
  ZipDeflate,
  ZipPassThrough,
  Zlib,
  compress: gzip,
  compressSync: gzipSync,
  decompress,
  decompressSync,
  deflate,
  deflateSync,
  gunzip,
  gunzipSync,
  gzip,
  gzipSync,
  inflate,
  inflateSync,
  strFromU8,
  strToU8,
  unzip,
  unzipSync,
  unzlib,
  unzlibSync,
  zip,
  zipSync,
  zlib,
  zlibSync
}, Symbol.toStringTag, { value: 'Module' }));

class WatchBackgroundSelectorModule {
  constructor(config) {
    this.shadowHost = null;
    this.shadowRoot = null;
    this.radialContainer = null;
    this.settingsContainer = null;
    this._isActive = false;
    this.eventListeners = [];
    this.config = config;
    this.backgroundSettings = BackgroundImageSettings.getInstance();
  }
  /**
   * モジュール初期化（最速化版）
   */
  async initialize() {
    if (this._isActive) {
      await Promise.resolve();
      return;
    }
    try {
      if (!this.isWatchPage()) {
        return;
      }
      this.injectGlobalBackgroundCSS();
      await this.backgroundSettings.initializeSettings();
      const selectedImage = await this.backgroundSettings.getSelectedImage();
      if (selectedImage) {
        this.applyBackgroundImmediate(selectedImage);
      }
      const uiInitPromises = [
        this.initializeBackgroundSettingsEvents(),
        this.initializeShadowDOMAndUI()
      ];
      await Promise.all(uiInitPromises);
      this._isActive = true;
    } catch (error) {
      window.logger.error("[WatchBackgroundSelectorModule] 初期化エラー:", error);
      throw error;
    }
  }
  /**
   * モジュール破棄
   */
  destroy() {
    if (!this._isActive) return;
    if (this.shadowHost) {
      this.shadowHost.remove();
      this.shadowHost = null;
      this.shadowRoot = null;
      this.radialContainer = null;
      this.settingsContainer = null;
    }
    const globalStyleElement = document.getElementById("watch-background-global-styles");
    if (globalStyleElement) {
      globalStyleElement.remove();
    }
    document.documentElement.style.removeProperty("--bg-img");
    this.backgroundSettings.closeDB();
    this.eventListeners.forEach(({ type, listener }) => {
      this.backgroundSettings.removeEventListener(type, listener);
    });
    this.eventListeners = [];
    this._isActive = false;
  }
  /**
   * モジュール状態確認
   */
  isActive() {
    return this._isActive && !!this.shadowRoot && !!this.radialContainer;
  }
  /**
   * モジュール状態取得
   */
  getStatus() {
    if (!this.isWatchPage()) {
      return ModuleStatus.INACTIVE;
    }
    return this._isActive ? ModuleStatus.ACTIVE : ModuleStatus.INACTIVE;
  }
  /**
   * Watch Pageかどうかの判定
   */
  isWatchPage() {
    return /\/watch\//.test(window.location.pathname);
  }
  /**
   * Shadow DOM作成
   */
  createShadowDOM() {
    this.shadowHost = document.createElement("div");
    this.shadowHost.id = "watch-background-selector-shadow-host";
    this.shadowHost.style.cssText = "position: fixed; pointer-events: none; z-index: 1000;";
    this.shadowRoot = this.shadowHost.attachShadow({ mode: "closed" });
    document.body.appendChild(this.shadowHost);
  }
  /**
   * CSS統合注入（Shadow Root内）
   */
  injectCSS() {
    if (!this.shadowRoot) return;
    const style = document.createElement("style");
    style.textContent = `
      @charset "utf-8";

      /*-------------------------
       * Shadow DOM内の背景セレクタースタイル
       *-------------------------*/
      
      /* ホスト要素（外部から見えるCSS変数を設定） */
      :host {
        /*scroll, fixed, local*/
        /*background-attachment*/
        --bg-att: fixed;
        /*normal, multiply, screen, overlay, darken, lighten, color-dodge, color-burn, hard-light,*/
        /*soft-light, difference, exclusion, hue, saturation, color, luminosity*/
        /*background-blend-mode*/
        --bg-bl-m: normal;
        /*border-box, padding-box, content-box, text*/
        /*background-clip*/
        --bg-cl: initial;
        /*color keywords, rgb, hex, hsl, currentcolor, transparent*/
        /*background-color*/
        --bg-col: black;
        /*url, gradient, element, image, cross-fade, image-set*/
        /*background-image*/
        --bg-img: initial;
        /*border-box, padding-box, content-box*/
        /*background-origin*/
        --bg-org: initial;
        /*top, bottom, left, right, center, percentage, length, multiple images, offsets*/
        /*background-position*/
        --bg-pos: center;
        /*repeat-x, repeat-y, repeat, space, round, no-repeat*/
        /*background-repeat*/
        --bg-rep: no-repeat;
        /*cover, contain, width, width height, multiple images*/
        /*background-size*/
        --bg-siz: cover;
      }

      /*-------------------------
       * ラジアルセレクター
       *-------------------------*/
      #bg-radial-container {
        position: fixed;
        right: 0;
        top: 50%;
        /* width and height will be set dynamically */
        --hide-offset: 300px; /* will be set dynamically */
        transform: translateX(var(--hide-offset)) translateY(-50%);
        transition: all 0.3s ease;
        z-index: 1000;
        pointer-events: auto;
        background: rgba(0, 0, 0, 0.1);
        border-radius: 16px;
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        display: flex;
        flex-direction: row;
      }
      
      /* 取っ手部分（実際のHTML要素） */
      #bg-handle {
        width: 20px;
        height: 100%;
        cursor: pointer;
        background: transparent;
        border-radius: 16px 0 0 16px;
        transition: all 0.3s ease;
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      /* メイン部分 */
      #bg-main-content {
        flex: 1;
        height: 100%;
        background: transparent;
        border-radius: 0 16px 16px 0;
        position: relative;
        overflow: hidden;
      }
      
      /* open 時（hover でも class でも可） */
      #bg-radial-container.open,
      #bg-radial-container:hover {
        transform: translateX(0) translateY(-50%);
        background: rgba(0, 0, 0, 0.2);
        backdrop-filter: blur(15px);
        -webkit-backdrop-filter: blur(15px);
      }
      
      #bg-wheel {
        position: relative;
        /* width and height will be set dynamically */
        transition: transform 0.3s ease;
        cursor: grab;
      }
      
      #bg-wheel:active {
        cursor: grabbing;
      }
      
      .bg-preview-item {
        position: absolute;
        width: 60px;
        height: 60px;
        border-radius: 50%;
        background-size: cover;
        background-position: center;
        border: 2px solid rgba(255, 255, 255, 0.3);
        transition: all 0.3s ease;
        cursor: pointer;
        left: calc(50% - 30px);
        top: calc(50% - 30px);
        transform-origin: center;
        filter: brightness(0.8);
        will-change: transform;
      }
      
      .bg-preview-item:hover {
        border-color: white;
        box-shadow: 
          0 0 10px rgba(255, 255, 255, 0.5),
          0 0 20px rgba(255, 255, 255, 0.3),
          0 0 30px rgba(255, 255, 255, 0.1);
        z-index: 10;
        filter: brightness(1.2);
        transform: rotate(var(--rotation)) scale(1.3) !important;
      }

      /*-------------------------
       * スクロールバーのスタイル
       *-------------------------*/
      .settings-content::-webkit-scrollbar,
      .image-list::-webkit-scrollbar {
        width: 8px;
      }

      .settings-content::-webkit-scrollbar-track,
      .image-list::-webkit-scrollbar-track {
        background: rgba(255, 255, 255, 0.1);
        border-radius: 4px;
      }

      .settings-content::-webkit-scrollbar-thumb,
      .image-list::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.3);
        border-radius: 4px;
      }

      .settings-content::-webkit-scrollbar-thumb:hover,
      .image-list::-webkit-scrollbar-thumb:hover {
        background: rgba(255, 255, 255, 0.5);
      }
    `;
    this.shadowRoot.appendChild(style);
  }
  /**
   * ラジアルセレクター作成（Shadow Root内）
   */
  async createRadialSelector() {
    if (!this.shadowRoot) return;
    const existing = this.shadowRoot.getElementById("bg-radial-container");
    if (existing) {
      existing.remove();
    }
    const backgroundImages = await this.backgroundSettings.getAllImages();
    if (backgroundImages.length === 0) {
      window.logger.warn("[WatchBackgroundSelectorModule] 背景画像が設定されていません");
      return;
    }
    const itemCount = backgroundImages.length;
    const itemSize = 60;
    const handleWidth = 20;
    const minRadius = Math.max(80, itemSize * itemCount / (2 * Math.PI) + 40);
    const radius = Math.min(minRadius, 150);
    const wheelDiameter = (radius + itemSize) * 2;
    const containerWidth = wheelDiameter + handleWidth;
    const containerHeight = wheelDiameter;
    const container = document.createElement("div");
    container.id = "bg-radial-container";
    container.style.width = `${containerWidth}px`;
    container.style.height = `${containerHeight}px`;
    container.style.setProperty("--hide-offset", `${wheelDiameter}px`);
    const handle = document.createElement("div");
    handle.id = "bg-handle";
    handle.innerHTML = '<div style="width: 2px; height: 20px; background: rgba(255,255,255,0.5); border-radius: 1px;"></div>';
    const mainContent = document.createElement("div");
    mainContent.id = "bg-main-content";
    mainContent.style.width = `${wheelDiameter}px`;
    mainContent.style.height = `${containerHeight}px`;
    const wheel = document.createElement("div");
    wheel.id = "bg-wheel";
    wheel.style.width = `${wheelDiameter}px`;
    wheel.style.height = `${wheelDiameter}px`;
    const angleStep = 360 / itemCount;
    const wheelCenter = wheelDiameter / 2;
    backgroundImages.forEach((imageItem, index) => {
      const item = document.createElement("div");
      item.className = "bg-preview-item";
      if (imageItem.type === "url") {
        item.style.backgroundImage = imageItem.data;
      } else if (imageItem.type === "file") {
        item.style.backgroundImage = `url(${imageItem.data})`;
      }
      const angle = angleStep * index;
      const x = radius * Math.cos((angle - 90) * (Math.PI / 180));
      const y = radius * Math.sin((angle - 90) * (Math.PI / 180));
      item.style.left = `${wheelCenter + x - 30}px`;
      item.style.top = `${wheelCenter + y - 30}px`;
      item.style.transform = "rotate(0deg)";
      item.style.setProperty("--rotation", "0deg");
      item.title = imageItem.name;
      item.onclick = (e) => {
        e.stopPropagation();
        void this.changeBackground(imageItem);
      };
      wheel.appendChild(item);
    });
    mainContent.appendChild(wheel);
    container.appendChild(handle);
    container.appendChild(mainContent);
    this.shadowRoot.appendChild(container);
    this.radialContainer = container;
    this.setupWheelControls(wheel);
    this.attachHoverListeners();
    const currentBg = document.documentElement.style.getPropertyValue("--bg-img");
    if (!currentBg || currentBg === "initial") {
      const selectedImage = await this.backgroundSettings.getSelectedImage();
      if (selectedImage) {
        this.applyBackgroundImmediate(selectedImage);
      } else if (backgroundImages.length > 0) {
        this.applyBackgroundImmediate(backgroundImages[0]);
      }
    }
  }
  /**
   * ホバーリスナー設定
   */
  attachHoverListeners() {
    if (!this.radialContainer) return;
    const rc = this.radialContainer;
    rc.addEventListener("mouseenter", () => {
      rc.classList.add("open");
    });
    rc.addEventListener("mouseleave", () => {
      setTimeout(() => rc.classList.remove("open"), 100);
    });
  }
  /**
   * ホイールコントロール設定
   */
  setupWheelControls(wheel) {
    let currentRotation = 0;
    let isDragging = false;
    let startAngle = 0;
    wheel.addEventListener("wheel", (e) => {
      e.preventDefault();
      currentRotation += e.deltaY * 0.5;
      this.updateWheelRotation(wheel, currentRotation);
    });
    wheel.addEventListener("mousedown", (e) => {
      isDragging = true;
      const rect = wheel.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      startAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX);
    });
    document.addEventListener("mousemove", (e) => {
      if (!isDragging) return;
      const rect = wheel.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const currentAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX);
      const angleDiff = (currentAngle - startAngle) * (180 / Math.PI);
      currentRotation += angleDiff;
      startAngle = currentAngle;
      this.updateWheelRotation(wheel, currentRotation);
    });
    document.addEventListener("mouseup", () => {
      isDragging = false;
    });
  }
  /**
   * ホイール回転更新
   */
  updateWheelRotation(wheel, rotation) {
    wheel.style.transform = `rotate(${rotation}deg)`;
    const items = wheel.getElementsByClassName("bg-preview-item");
    for (const item of Array.from(items)) {
      item.style.transform = `rotate(${-rotation}deg)`;
      item.style.setProperty("--rotation", `${-rotation}deg`);
    }
  }
  /**
   * 背景変更（最速化版）
   */
  async changeBackground(imageItem) {
    await Promise.resolve();
    let backgroundValue;
    if (imageItem.type === "url") {
      backgroundValue = imageItem.data;
    } else if (imageItem.type === "file") {
      backgroundValue = `url(${imageItem.data})`;
    } else {
      window.logger.error("[WatchBackgroundSelectorModule] 不明な画像タイプ:", imageItem.type);
      return;
    }
    document.documentElement.style.setProperty("--bg-img", backgroundValue);
    this.backgroundSettings.setSelectedImage(imageItem.id, false).catch((error) => {
      window.logger.error("[WatchBackgroundSelectorModule] 背景選択の保存に失敗:", error);
    });
  }
  /**
   * グローバル背景スタイルを注入（bodyへの適用用）
   */
  injectGlobalBackgroundCSS() {
    const existingStyle = document.getElementById("watch-background-global-styles");
    if (existingStyle) {
      return;
    }
    const style = document.createElement("style");
    style.id = "watch-background-global-styles";
    style.textContent = `
      @charset "utf-8";

      /*-------------------------
       * グローバル背景スタイル（CSS変数定義）
       *-------------------------*/
      :root {
        /*scroll, fixed, local*/
        /*background-attachment*/
        --bg-att: fixed;
        /*normal, multiply, screen, overlay, darken, lighten, color-dodge, color-burn, hard-light,*/
        /*soft-light, difference, exclusion, hue, saturation, color, luminosity*/
        /*background-blend-mode*/
        --bg-bl-m: normal;
        /*border-box, padding-box, content-box, text*/
        /*background-clip*/
        --bg-cl: initial;
        /*color keywords, rgb, hex, hsl, currentcolor, transparent*/
        /*background-color*/
        --bg-col: black;
        /*url, gradient, element, image, cross-fade, image-set*/
        /*background-image*/
        --bg-img: initial;
        /*border-box, padding-box, content-box*/
        /*background-origin*/
        --bg-org: initial;
        /*top, bottom, left, right, center, percentage, length, multiple images, offsets*/
        /*background-position*/
        --bg-pos: center;
        /*repeat-x, repeat-y, repeat, space, round, no-repeat*/
        /*background-repeat*/
        --bg-rep: no-repeat;
        /*cover, contain, width, width height, multiple images*/
        /*background-size*/
        --bg-siz: cover;
      }

      /*-------------------------
       * 背景画像適用（bodyに対して）
       *-------------------------*/
      body {
        background-attachment: var(--bg-att);
        background-blend-mode: var(--bg-bl-m);
        background-clip: var(--bg-cl);
        background-color: var(--bg-col);
        background-image: var(--bg-img);
        background-origin: var(--bg-org);
        background-position: var(--bg-pos);
        background-repeat: var(--bg-rep);
        background-size: var(--bg-siz);
      }
    `;
    document.head.appendChild(style);
  }
  /**
   * 背景を即座に適用（同期的）
   */
  applyBackgroundImmediate(imageItem) {
    let backgroundValue;
    if (imageItem.type === "url") {
      backgroundValue = imageItem.data;
    } else if (imageItem.type === "file") {
      backgroundValue = `url(${imageItem.data})`;
    } else {
      window.logger.error("[WatchBackgroundSelectorModule] 不明な画像タイプ:", imageItem.type);
      return;
    }
    document.documentElement.style.setProperty("--bg-img", backgroundValue);
  }
  /**
   * 背景設定イベントリスナーの初期化（分離）
   */
  async initializeBackgroundSettingsEvents() {
    await Promise.resolve();
    this.setupBackgroundSettingsEventListeners();
  }
  /**
   * Shadow DOMとUI要素の初期化（分離）
   */
  async initializeShadowDOMAndUI() {
    this.createShadowDOM();
    this.injectCSS();
    await this.createRadialSelector();
  }
  /**
   * 画像リストを更新
   */
  async refreshImageList() {
    if (!this.shadowRoot) return;
    const imageListContainer = this.shadowRoot.getElementById("image-list");
    if (!imageListContainer) return;
    try {
      const images = await this.backgroundSettings.getAllImages();
      const selectedImageId = this.backgroundSettings.getSelectedImageId();
      imageListContainer.innerHTML = "";
      images.forEach((image) => {
        const imageItem = document.createElement("div");
        imageItem.className = "image-list-item";
        imageItem.innerHTML = `
          <div class="image-info">
            <div class="image-preview" style="background-image: ${image.type === "url" ? image.data : `url(${image.data})`}"></div>
            <div class="image-details">
              <div class="image-name">${image.name}</div>
              <div class="image-type">${image.type === "url" ? createMaterialIcon("link", { style: "outlined", color: "white" }) + " URL" : createMaterialIcon("folder", { style: "outlined", color: "white" }) + " ファイル"}</div>
              <div class="image-date">追加: ${new Date(image.createdAt).toLocaleDateString()}</div>
            </div>
          </div>
          <div class="image-actions">
            <button class="select-btn ${selectedImageId === image.id ? "selected" : ""}" data-id="${image.id}">
              ${selectedImageId === image.id ? "✅ 選択中" : "選択"}
            </button>
                            <button class="delete-btn" data-id="${image.id}">${createMaterialIcon("delete_outline", { style: "outlined", color: "white" })}</button>
          </div>
        `;
        imageListContainer.appendChild(imageItem);
      });
      this.setupImageListEventListeners();
    } catch (error) {
      window.logger.error("[WatchBackgroundSelectorModule] 画像リストの更新に失敗:", error);
    }
  }
  /**
   * 画像リストのイベントリスナーを設定
   */
  setupImageListEventListeners() {
    if (!this.shadowRoot) return;
    const selectButtons = this.shadowRoot.querySelectorAll(".select-btn");
    selectButtons.forEach((button) => {
      button.addEventListener("click", (e) => {
        void (async () => {
          const target = e.target;
          const imageId = target.getAttribute("data-id");
          if (imageId) {
            await this.selectImage(imageId);
          }
        })();
      });
    });
    const deleteButtons = this.shadowRoot.querySelectorAll(".delete-btn");
    deleteButtons.forEach((button) => {
      button.addEventListener("click", (e) => {
        void (async () => {
          const target = e.target;
          const imageId = target.getAttribute("data-id");
          if (imageId) {
            await this.deleteImage(imageId);
          }
        })();
      });
    });
  }
  /**
   * 画像を選択
   */
  async selectImage(imageId) {
    try {
      const image = await this.backgroundSettings.getImage(imageId);
      if (image) {
        await this.changeBackground(image);
        await this.refreshImageList();
      }
    } catch (error) {
      window.logger.error("[WatchBackgroundSelectorModule] 画像の選択に失敗:", error);
    }
  }
  /**
   * 画像を削除
   */
  async deleteImage(imageId) {
    try {
      const image = await this.backgroundSettings.getImage(imageId);
      if (!image) return;
      const confirmed = confirm(`画像「${image.name}」を削除しますか？`);
      if (!confirmed) return;
      await this.backgroundSettings.deleteImage(imageId);
      await this.createRadialSelector();
      await this.refreshImageList();
    } catch (error) {
      window.logger.error("[WatchBackgroundSelectorModule] 画像の削除に失敗:", error);
      alert("画像の削除に失敗しました");
    }
  }
  /**
   * 背景画像設定のイベントリスナーを設定
   */
  setupBackgroundSettingsEventListeners() {
    const imageAddedListener = (_) => {
      void this.createRadialSelector();
    };
    this.backgroundSettings.addEventListener("imageAdded", imageAddedListener);
    this.eventListeners.push({ type: "imageAdded", listener: imageAddedListener });
    const imageDeletedListener = (_) => {
      void this.createRadialSelector();
    };
    this.backgroundSettings.addEventListener("imageDeleted", imageDeletedListener);
    this.eventListeners.push({ type: "imageDeleted", listener: imageDeletedListener });
    const imageSelectedListener = (event) => {
      void (async () => {
        const customEvent = event;
        const imageId = customEvent.detail?.id;
        if (!imageId) {
          return;
        }
        const image = await this.backgroundSettings.getImage(imageId);
        if (image) {
          let backgroundValue;
          if (image.type === "url") {
            backgroundValue = image.data;
          } else if (image.type === "file") {
            backgroundValue = `url(${image.data})`;
          } else {
            return;
          }
          document.documentElement.style.setProperty("--bg-img", backgroundValue);
        }
      })();
    };
    this.backgroundSettings.addEventListener("imageSelected", imageSelectedListener);
    this.eventListeners.push({ type: "imageSelected", listener: imageSelectedListener });
    const settingsImportedListener = (_) => {
      void this.createRadialSelector();
    };
    this.backgroundSettings.addEventListener("settingsImported", settingsImportedListener);
    this.eventListeners.push({ type: "settingsImported", listener: settingsImportedListener });
    const settingsResetListener = (_) => {
      void this.createRadialSelector();
    };
    this.backgroundSettings.addEventListener("settingsReset", settingsResetListener);
    this.eventListeners.push({ type: "settingsReset", listener: settingsResetListener });
  }
}

const watchBackgroundSelectorModule = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  WatchBackgroundSelectorModule
}, Symbol.toStringTag, { value: 'Module' }));

class WatchMatrixBackgroundModule {
  constructor(config) {
    this.canvasContainer = null;
    this.canvas = null;
    this.animationId = null;
    this._isActive = false;
    this.config = config;
  }
  /**
   * モジュール初期化
   */
  async initialize() {
    if (this._isActive) {
      return;
    }
    try {
      if (!this.isWatchPage()) {
        return;
      }
      try {
        await this.loadCSS();
      } catch (error) {
        window.logger.warn("[WatchMatrixBackgroundModule] CSS読み込みに失敗しましたが、モジュールは動作します:", error);
      }
      this.createCanvasContainer();
      this.startMatrixAnimation();
      this._isActive = true;
    } catch (error) {
      window.logger.error("[WatchMatrixBackgroundModule] 初期化エラー:", error);
      throw error;
    }
  }
  /**
   * モジュール破棄
   */
  destroy() {
    if (!this._isActive) return;
    if (this.animationId) {
      clearInterval(this.animationId);
      this.animationId = null;
    }
    if (this.canvasContainer) {
      this.canvasContainer.remove();
      this.canvasContainer = null;
    }
    this.resetBackgroundStyle();
    this.canvas = null;
    this._isActive = false;
  }
  /**
   * モジュール状態確認
   */
  isActive() {
    return this._isActive && !!this.canvasContainer && !!this.canvas;
  }
  /**
   * モジュール状態取得
   */
  getStatus() {
    if (!this.isWatchPage()) {
      return ModuleStatus.INACTIVE;
    }
    return this._isActive ? ModuleStatus.ACTIVE : ModuleStatus.INACTIVE;
  }
  /**
   * Watch Pageかどうかの判定
   */
  isWatchPage() {
    return /\/watch\//.test(window.location.pathname);
  }
  /**
   * CSSを読み込み
   */
  async loadCSS() {
    const cssHref = "/local/features/dist/src/watch_page/background_matrix/matrix_rain.css";
    const existingLink = document.querySelector(`link[href="${cssHref}"]`);
    if (existingLink) {
      return Promise.resolve();
    }
    return new Promise((resolve, reject) => {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = cssHref;
      link.onload = () => {
        resolve();
      };
      link.onerror = () => {
        window.logger.error("[WatchMatrixBackgroundModule] CSS読み込み失敗:", cssHref);
        reject(new Error("CSS読み込み失敗"));
      };
      document.head.appendChild(link);
    });
  }
  /**
   * キャンバスコンテナを作成
   */
  createCanvasContainer() {
    const existing = document.getElementById("canvasContainer");
    if (existing) {
      existing.remove();
    }
    const container = document.createElement("div");
    container.id = "canvasContainer";
    container.style.cssText = `
      position: fixed;
      left: 0;
      right: 0;
      top: 0;
      bottom: 0;
      z-index: -1;
      background-color: black;
    `;
    document.body.insertBefore(container, document.body.firstChild);
    this.canvasContainer = container;
    this.createCanvas();
  }
  /**
   * キャンバスを作成
   */
  createCanvas() {
    if (!this.canvasContainer) return;
    const canvas = document.createElement("canvas");
    canvas.id = "c";
    canvas.style.cssText = `
      position: absolute;
      width: 100%;
      height: 100%;
      left: 0;
      top: 0;
      z-index: -1;
    `;
    this.canvasContainer.appendChild(canvas);
    this.canvas = canvas;
  }
  /**
   * マトリックスアニメーションを開始
   */
  startMatrixAnimation() {
    if (!this.canvas) {
      window.logger.error("[WatchMatrixBackgroundModule] キャンバスが見つかりません");
      return;
    }
    const ctx = this.canvas.getContext("2d");
    if (!ctx) {
      window.logger.error("[WatchMatrixBackgroundModule] 2Dコンテキストを取得できません");
      return;
    }
    this.canvas.height = window.outerHeight;
    this.canvas.width = window.parent.screen.width;
    if (this.canvas.width <= 0) {
      window.logger.error("[WatchMatrixBackgroundModule] キャンバス幅が無効です");
      return;
    }
    this.setBackgroundStyle();
    const japaneseChars = "ｧｨｩｪｫｬｭｮｯｰｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜｦﾝ-ﾟ";
    const japanese = japaneseChars.split("");
    const fontSize = 23;
    const columns = Math.floor(this.canvas.width / fontSize);
    const drops = Array.from({ length: columns }, () => 1);
    this.animationId = setInterval(() => {
      this.drawMatrix(ctx, drops, japanese, fontSize, this.canvas.height);
    }, 33);
  }
  /**
   * マトリックス描画
   */
  drawMatrix(ctx, drops, japanese, fontSize, canvasHeight) {
    ctx.fillStyle = "rgba(0, 0, 0, 0.05)";
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.fillStyle = "#0F0";
    ctx.font = `${fontSize}px arial`;
    for (let i = 0; i < drops.length; i++) {
      const text = japanese[Math.floor(Math.random() * japanese.length)];
      ctx.fillText(text, i * fontSize, drops[i] * fontSize);
      if (drops[i] * fontSize > canvasHeight && Math.random() > 0.975) {
        drops[i] = 0;
      }
      drops[i]++;
    }
  }
  /**
   * 背景スタイルを設定
   */
  setBackgroundStyle() {
    const bg = document.body;
    bg.style.backgroundColor = "black";
    bg.style.margin = "0";
    bg.style.padding = "0";
  }
  /**
   * 背景スタイルをリセット
   */
  resetBackgroundStyle() {
    const bg = document.body;
    bg.style.backgroundColor = "";
    bg.style.margin = "";
    bg.style.padding = "";
  }
}

const watchMatrixBackgroundModule = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  WatchMatrixBackgroundModule
}, Symbol.toStringTag, { value: 'Module' }));

class HeaderModule {
  constructor(config) {
    this.intervalId = null;
    this.active = false;
    this.config = config;
  }
  async initialize() {
    try {
      await Promise.resolve();
      this.hideUserElements();
      this.intervalId = window.setInterval(() => {
        this.hideUserElements();
      }, 5e3);
      this.active = true;
    } catch (error) {
      window.logger.error("[HeaderModule] 初期化に失敗しました:", error);
      throw error;
    }
  }
  destroy() {
    try {
      if (this.intervalId) {
        clearInterval(this.intervalId);
        this.intervalId = null;
      }
      this.restoreUserElements();
      this.active = false;
    } catch (error) {
      window.logger.error("[HeaderModule] 停止処理に失敗しました:", error);
    }
  }
  isActive() {
    return this.active;
  }
  getStatus() {
    if (!this.active) {
      return ModuleStatus.INACTIVE;
    }
    return ModuleStatus.ACTIVE;
  }
  /**
   * ユーザー関連要素を非表示にする
   */
  hideUserElements() {
    try {
      const images = document.querySelectorAll("img");
      images.forEach((img) => {
        const regexSrc = /^https:\/\/secure-dcdn\.cdn\.nimg\.jp\/nicoaccount\/usericon\/.*/;
        const regexClass = /^common-header/;
        if (regexSrc.test(img.src) && regexClass.test(img.className)) {
          if (img.style.display !== "none") {
            img.style.display = "none";
            img.setAttribute("data-header-module-hidden", "true");
          }
        }
      });
      const textNode = document.querySelector(".common-header-w2sn95");
      if (textNode && textNode.style.display !== "none") {
        textNode.style.display = "none";
        textNode.setAttribute("data-header-module-hidden", "true");
      }
      const additionalUserElements = document.querySelectorAll(
        'img[alt*="ユーザーアイコン"], .UserIcon, .user-icon, [class*="userIcon"], [class*="UserIcon"], .UserName, .user-name, [class*="userName"], [class*="UserName"], [data-testid*="user"], .UserDetailsContainer, .UserDetailsContainer_name, header a[href*="/user/"], .SiteHeaderContainer a[href*="/user/"], .LoginUserContainer, .login-user, [class*="loginUser"]'
      );
      additionalUserElements.forEach((element) => {
        if (element instanceof HTMLElement && element.style.display !== "none" && !element.hasAttribute("data-header-module-hidden")) {
          if (this.isUserRelatedElement(element)) {
            element.style.display = "none";
            element.setAttribute("data-header-module-hidden", "true");
          }
        }
      });
    } catch (error) {
      window.logger.error("[HeaderModule] ユーザー要素の非表示処理でエラー:", error);
    }
  }
  /**
   * 非表示にした要素を復元する
   */
  restoreUserElements() {
    try {
      const hiddenElements = document.querySelectorAll('[data-header-module-hidden="true"]');
      hiddenElements.forEach((element) => {
        if (element instanceof HTMLElement) {
          element.style.display = "";
          element.removeAttribute("data-header-module-hidden");
        }
      });
    } catch (error) {
      window.logger.error("[HeaderModule] 要素の復元処理でエラー:", error);
    }
  }
  /**
   * 要素がユーザー関連かどうかを判定
   */
  isUserRelatedElement(element) {
    const text = element.textContent?.toLowerCase() || "";
    const className = element.className.toLowerCase();
    const userKeywords = ["user", "ユーザー", "プロフィール", "profile", "アカウント", "account"];
    return userKeywords.some(
      (keyword) => text.includes(keyword) || className.includes(keyword)
    );
  }
}

const headerModule = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  HeaderModule
}, Symbol.toStringTag, { value: 'Module' }));

class SearchPageModule {
  constructor(config) {
    this.active = false;
    this.styleElement = null;
    this.config = config;
  }
  async initialize() {
    try {
      await Promise.resolve();
      this.injectEightColumnCSS();
      this.active = true;
    } catch (error) {
      window.logger.error("[SearchPageModule] 初期化に失敗しました:", error);
      throw error;
    }
  }
  destroy() {
    try {
      this.removeEightColumnCSS();
      this.active = false;
    } catch (error) {
      window.logger.error("[SearchPageModule] 停止処理に失敗しました:", error);
    }
  }
  isActive() {
    return this.active;
  }
  getStatus() {
    if (!this.active) {
      return ModuleStatus.INACTIVE;
    }
    return ModuleStatus.ACTIVE;
  }
  /**
   * 8列表示用のCSSを注入
   */
  injectEightColumnCSS() {
    try {
      this.removeEightColumnCSS();
      this.styleElement = document.createElement("style");
      this.styleElement.setAttribute("data-search-module", "eight-column");
      this.styleElement.textContent = `
        /* 元のeight_column.cssの内容を基にした8列表示 */
        
        /* 不要な要素を非表示 */
        .tagCaption .share,
        .tagCaption .inner > .contentBody .itemDescription,
        .billboard_ad,
        .nicoadVideoItemWrapper,
        .content.videoBox.teibanVideos,
        .TagkeyArticleBox,
        .columnChange .open,
        .columnChange .close,
        .column700-300 .sub,
        .NewVideosPage-sub,
        .uad.nicodicNicoadVideoList {
          display: none !important;
        }

        /* ヘッダー部分の調整 */
        .tagCaption .inner > .contentHeader {
          float: left !important;
        }

        .tagCaption .contentHeader h1 {
          width: auto !important;
        }

        .tagCaption .contentHeader {
          margin-right: 10px !important;
        }

        .tagCaption .contentBody {
          padding-top: 1px !important;
        }

        /* メインコンテナの幅調整 */
        .inner,
        .column700-300 .main,
        .video {
          width: 100% !important;
          max-width: 1470px !important;
          min-width: auto !important;
        }

        /* カラム変更ボタンの調整 */
        .columnChange li.two {
          display: block !important;
        }

        .columnChange {
          padding-right: 8px !important;
        }

        .columnChange.open,
        .columnChange.close {
          background-image: none !important;
        }

        .column700-300 .main {
          padding-right: 4px !important;
        }

        /* 動画アイテムのレイアウト調整 */
        .video .item:nth-child(4n + 1) {
          clear: none !important;
        }

        .video .item {
          margin-right: 5px !important;
        }

        .video.videoList02 .item:nth-child(2n + 1) {
          clear: none !important;
        }

        .video.videoList02 .item {
          margin-right: -1px !important;
        }

        /* 新しい動画ページの調整 */
        .NewVideosPage-body {
          width: 100% !important;
          max-width: 1470px !important;
          min-width: auto !important;
        }

        .NewVideosPage-main {
          flex: 0 0 100% !important;
        }

        .NewVideosPage-videoList {
          width: 100% !important;
        }

        .NewVideosPage-videoList_col4 > :nth-child(4n-3) {
          margin-left: 8px !important;
        }

        .NewVideosPage-videoList_col4 > :nth-child(6n-5) {
          margin-left: 0 !important;
        }
      `;
      document.head.appendChild(this.styleElement);
    } catch (error) {
      window.logger.error("[SearchPageModule] CSS注入でエラー:", error);
    }
  }
  /**
   * 注入したCSSを削除
   */
  removeEightColumnCSS() {
    try {
      if (this.styleElement && this.styleElement.parentNode) {
        this.styleElement.parentNode.removeChild(this.styleElement);
        this.styleElement = null;
      }
      const existingStyles = document.querySelectorAll('style[data-search-module="eight-column"]');
      existingStyles.forEach((style) => {
        if (style.parentNode) {
          style.parentNode.removeChild(style);
        }
      });
    } catch (error) {
      window.logger.error("[SearchPageModule] CSS削除でエラー:", error);
    }
  }
}

const searchPageModule = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  SearchPageModule
}, Symbol.toStringTag, { value: 'Module' }));

class NicoInfoPageModule {
  constructor(config) {
    this.active = false;
    this.lastHash = "";
    this.MAX_ITEMS = 300;
    this.debugOutput = false;
    this.config = config;
  }
  async initialize() {
    try {
      await Promise.resolve();
      if (!this.checkDependencies()) {
        throw new Error("必要な依存関係が見つかりません (window.toastr)");
      }
      this.setupEventListeners();
      this.restyler();
      this.showStartupToast();
      this.active = true;
    } catch (error) {
      window.logger.error("[NicoInfoPageModule] 初期化に失敗しました:", error);
      throw error;
    }
  }
  destroy() {
    try {
      this.removeEventListeners();
      this.resetStyles();
      this.active = false;
    } catch (error) {
      window.logger.error("[NicoInfoPageModule] 停止処理に失敗しました:", error);
    }
  }
  isActive() {
    return this.active;
  }
  getStatus() {
    if (!this.active) {
      return ModuleStatus.INACTIVE;
    }
    return ModuleStatus.ACTIVE;
  }
  /**
   * 依存関係をチェック
   */
  checkDependencies() {
    return typeof window !== "undefined" && window.toastr && typeof window.toastr.info === "function";
  }
  /**
   * イベントリスナーを設定
   */
  setupEventListeners() {
    if (document.readyState === "complete") {
      this.handleLoad();
    } else {
      window.addEventListener("load", this.handleLoad.bind(this));
    }
    window.addEventListener("hashchange", this.handleHashChange.bind(this));
  }
  /**
   * イベントリスナーを削除
   */
  removeEventListeners() {
    window.removeEventListener("load", this.handleLoad.bind(this));
    window.removeEventListener("hashchange", this.handleHashChange.bind(this));
  }
  /**
   * load イベントハンドラ
   */
  handleLoad() {
    this.restyler();
  }
  /**
   * hashchange イベントハンドラ
   */
  handleHashChange() {
    const currentHashValue = this.currentHash();
    this.lastHash = currentHashValue;
    this.restyler();
  }
  /**
   * スタートアップトーストを表示
   */
  showStartupToast() {
    try {
      window.toastr.info(
        "",
        "NicoInfoPageModuleの動作を開始しました",
        { timeOut: 5e3 }
      );
    } catch (error) {
      window.logger.error("[NicoInfoPageModule] トースト表示でエラー:", error);
    }
  }
  /**
   * デイリー福引をハイライト表示
   */
  restyler() {
    try {
      for (let i = 0; i < this.MAX_ITEMS; i++) {
        const dateElement = document.getElementsByClassName("l-main l-main-list2-date")[i];
        const titleElement = document.getElementsByClassName("l-main l-main-list2-title")[i];
        const itemElement = document.getElementsByClassName("l-main l-main-list2-item")[i];
        if (!dateElement) break;
        if (!titleElement || !itemElement) continue;
        if (!titleElement.innerText.match(/.*?デイリー福引.*?/)) {
          dateElement.style.color = "LightSteelBlue";
          titleElement.style.color = "LightSteelBlue";
        } else {
          itemElement.style.outline = "solid 3px red";
        }
      }
    } catch (error) {
      window.logger.error("[NicoInfoPageModule] restyler でエラー:", error);
    }
  }
  /**
   * スタイルをリセット
   */
  resetStyles() {
    try {
      for (let i = 0; i < this.MAX_ITEMS; i++) {
        const dateElement = document.getElementsByClassName("l-main l-main-list2-date")[i];
        const titleElement = document.getElementsByClassName("l-main l-main-list2-title")[i];
        const itemElement = document.getElementsByClassName("l-main l-main-list2-item")[i];
        if (!dateElement) break;
        if (dateElement) {
          dateElement.style.color = "";
        }
        if (titleElement) {
          titleElement.style.color = "";
        }
        if (itemElement) {
          itemElement.style.outline = "";
        }
      }
    } catch (error) {
      window.logger.error("[NicoInfoPageModule] スタイルリセットでエラー:", error);
    }
  }
  /**
   * 現在のハッシュ値を取得
   */
  currentHash() {
    return location.hash.replace(/^#/, "");
  }
}

const nicoInfoPageModule = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  NicoInfoPageModule
}, Symbol.toStringTag, { value: 'Module' }));

class WatchPageModule {
  constructor() {
    this.config = {
      id: "watch_page",
      name: "Watch Page統合",
      description: "Watch Pageの各種機能を統合管理（タグカウンター、ヘッダー一行化）",
      version: "1.0.0",
      enabled: true,
      targetPages: [PageType.WATCH],
      dependencies: [],
      category: ModuleCategory.FUNCTIONALITY,
      icon: createMaterialIcon("movie", { style: "outlined", color: "white" })
    };
    this.subModules = /* @__PURE__ */ new Map();
    this.isInitialized = false;
    this.SETTINGS_KEY = "watch_page_module_settings";
    // タグカウンター用のMutationObserver
    this.tagObserver = null;
    this.updateTagCounterDebounced = null;
    // ページ遷移監視用
    this.pageObserver = null;
    this.currentVideoId = null;
    // デフォルト設定
    this.defaultSettings = {
      tag_counter: true,
      header_one_row: true
    };
    // ラジアルセレクター機能は独立モジュール（WatchBackgroundSelectorModule）に移行済み
    /**
     * フルスクリーン変更ハンドラー
     */
    this.handleFullscreenChange = () => {
      const header = document.querySelector("header");
      if (header) {
        header.style.display = document.fullscreenElement ? "none" : "flex";
      }
    };
    this.initializeSubModules();
    window.watchPageModule = this;
    window.watchPageControls = this.getHelperFunctions();
  }
  /**
   * サブモジュールの初期化
   */
  initializeSubModules() {
    const savedSettings = this.loadSettings();
    this.subModules.set("tag_counter", {
      id: "tag_counter",
      name: "タグカウンター",
      description: "タグ個数表示と共有機能",
      enabled: savedSettings.tag_counter,
      initialize: this.initializeTagCounter.bind(this),
      destroy: this.destroyTagCounter.bind(this),
      isActive: () => !!document.getElementById("TagItemsCounter")
    });
    this.subModules.set("header_one_row", {
      id: "header_one_row",
      name: "ヘッダー一行化",
      description: "ヘッダー要素を一行に統合",
      enabled: savedSettings.header_one_row,
      initialize: this.initializeHeaderOneRow.bind(this),
      destroy: this.destroyHeaderOneRow.bind(this),
      isActive: () => {
        const header = document.querySelector("header");
        return header ? header.style.position === "sticky" : false;
      }
    });
  }
  /**
   * モジュール初期化
   */
  async initialize() {
    if (this.isInitialized) return;
    try {
      if (!this.isWatchPage()) {
        return;
      }
      this.setupPageObserver();
      for (const [, subModule] of this.subModules) {
        if (subModule.enabled) {
          try {
            await subModule.initialize();
          } catch (error) {
            window.logger.error(`[WatchPageModule] ${subModule.name} 初期化失敗:`, error);
          }
        }
      }
      this.isInitialized = true;
    } catch (error) {
      window.logger.error("[WatchPageModule] 初期化エラー:", error);
      throw error;
    }
  }
  /**
   * モジュール破棄
   */
  destroy() {
    if (!this.isInitialized) return;
    if (this.pageObserver) {
      this.pageObserver.disconnect();
      this.pageObserver = null;
    }
    for (const [, subModule] of this.subModules) {
      try {
        if (subModule.isActive()) {
          subModule.destroy();
        }
      } catch (error) {
        window.logger.error(`[WatchPageModule] ${subModule.name} 破棄失敗:`, error);
      }
    }
    this.isInitialized = false;
  }
  /**
   * モジュール状態確認
   */
  isActive() {
    return this.isInitialized && this.isWatchPage();
  }
  /**
   * モジュール状態取得
   */
  getStatus() {
    if (!this.isInitialized) {
      return ModuleStatus.INACTIVE;
    }
    if (!this.isWatchPage()) {
      return ModuleStatus.INACTIVE;
    }
    const hasActiveSubModules = Array.from(this.subModules.values()).some((sub) => sub.enabled && sub.isActive());
    return hasActiveSubModules ? ModuleStatus.ACTIVE : ModuleStatus.INACTIVE;
  }
  /**
   * サブモジュールの有効/無効切り替え
   */
  async toggleSubModule(subModuleId, enabled) {
    const subModule = this.subModules.get(subModuleId);
    if (!subModule) {
      throw new Error(`サブモジュール '${subModuleId}' が見つかりません`);
    }
    subModule.enabled = enabled;
    this.saveSettings();
    if (this.isInitialized && this.isWatchPage()) {
      if (enabled && !subModule.isActive()) {
        await subModule.initialize();
      } else if (!enabled && subModule.isActive()) {
        subModule.destroy();
      }
    }
  }
  /**
   * サブモジュール一覧取得
   */
  getSubModules() {
    return Array.from(this.subModules.values());
  }
  /**
   * Watch Pageかどうかの判定
   */
  isWatchPage() {
    return /\/watch\//.test(window.location.pathname);
  }
  // ===== 設定管理 =====
  /**
   * 設定を読み込む
   */
  loadSettings() {
    try {
      const savedSettings = localStorage.getItem(this.SETTINGS_KEY);
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        return { ...this.defaultSettings, ...parsed };
      }
    } catch (error) {
      window.logger.error("[WatchPageModule] 設定読み込みエラー:", error);
    }
    return { ...this.defaultSettings };
  }
  /**
   * 設定を保存する
   */
  saveSettings() {
    try {
      const settings = {};
      for (const [id, subModule] of this.subModules) {
        settings[id] = subModule.enabled;
      }
      localStorage.setItem(this.SETTINGS_KEY, JSON.stringify(settings));
    } catch (error) {
      window.logger.error("[WatchPageModule] 設定保存エラー:", error);
    }
  }
  /**
   * 設定をリセットする
   */
  resetSettings() {
    localStorage.removeItem(this.SETTINGS_KEY);
    for (const [id, subModule] of this.subModules) {
      const defaultEnabled = this.defaultSettings[id] ?? true;
      subModule.enabled = defaultEnabled;
    }
  }
  /**
   * コンソールから使用するヘルパー関数群
   */
  getHelperFunctions() {
    return {
      // サブモジュールを無効化
      disable: async (subModuleId) => {
        await this.toggleSubModule(subModuleId, false);
      },
      // サブモジュールを有効化
      enable: async (subModuleId) => {
        await this.toggleSubModule(subModuleId, true);
      },
      // 設定をリセット
      reset: () => this.resetSettings(),
      // 利用可能なサブモジュール一覧
      list: () => {
        this.getSubModules().forEach((sub) => {
          window.logger.debug(`${sub.id}: ${sub.enabled ? "有効" : "無効"}`);
        });
      }
    };
  }
  // ===== サブモジュール実装 =====
  /**
   * タグカウンター初期化
   */
  async initializeTagCounter() {
    const existing = document.getElementById("TagItemsCounter");
    if (existing) existing.remove();
    const videoIDMatch = /s[mo]\d+/.exec(window.location.pathname);
    if (!videoIDMatch) {
      throw new Error("動画IDが取得できません");
    }
    const videoID = videoIDMatch[0];
    await this.retryTagCounter({ videoID });
    this.setupTagObserver();
  }
  /**
   * タグカウンター破棄
   */
  destroyTagCounter() {
    const tagCounter = document.getElementById("TagItemsCounter");
    if (tagCounter) {
      tagCounter.remove();
    }
    const shareButton = document.getElementById("TagItemsShareButton");
    if (shareButton) {
      shareButton.remove();
    }
    if (this.tagObserver) {
      this.tagObserver.disconnect();
      this.tagObserver = null;
    }
    this.updateTagCounterDebounced = null;
  }
  // 背景セレクター機能は独立モジュールに移行済み
  /**
   * ヘッダー一行化初期化
   */
  async initializeHeaderOneRow() {
    document.addEventListener("fullscreenchange", this.handleFullscreenChange);
    await this.setupHeaderObserver();
  }
  /**
   * ヘッダー一行化破棄
   */
  destroyHeaderOneRow() {
    document.removeEventListener("fullscreenchange", this.handleFullscreenChange);
    const header = document.querySelector("header");
    if (header) {
      header.style.position = "";
      header.style.top = "";
      header.style.display = "";
      header.style.alignItems = "";
      header.style.gap = "";
      header.style.padding = "";
    }
  }
  /**
   * タグカウンター再試行機能
   */
  retryTagCounter(option) {
    return new Promise((resolve, reject) => {
      let retryCount = 0;
      const maxRetryCount = 40;
      const retryInterval = 700;
      const attempt = () => {
        const element = document.getElementsByClassName("pos_relative d_flex flex-wrap_wrap gap_base")[0];
        const tagLength = this.getTagCount();
        if (this.insertTagCounter({ element, videoID: option.videoID, tagLength })) {
          resolve();
          return;
        }
        retryCount++;
        if (retryCount < maxRetryCount) {
          setTimeout(attempt, retryInterval);
        } else {
          reject(new Error("タグカウンター設置の最大再試行回数に達しました"));
        }
      };
      attempt();
    });
  }
  /**
   * タグ数を取得する
   */
  getTagCount() {
    const tagContainer = document.querySelector(".pos_relative.d_flex.flex-wrap_wrap.gap_base");
    if (!tagContainer) {
      return 0;
    }
    const tagElements = tagContainer.querySelectorAll("div.d_inline-flex");
    const filteredTags = Array.from(tagElements).filter((element) => {
      if (element.id === "TagItemsCounter" || element.id === "TagItemsShareButton") {
        return false;
      }
      const title = element.getAttribute("title");
      if (title === "タグ個数" || title === "共有ボタン") {
        return false;
      }
      if (element.classList.contains("TagItem")) {
        return false;
      }
      return true;
    });
    return filteredTags.length;
  }
  /**
   * タグカウンター挿入
   */
  insertTagCounter(option) {
    const existingTagCounter = document.getElementById("TagItemsCounter");
    if (existingTagCounter) {
      existingTagCounter.remove();
    }
    const existingShareButton = document.getElementById("TagItemsShareButton");
    if (existingShareButton) {
      existingShareButton.remove();
    }
    if (!option.element) {
      return false;
    }
    try {
      const currentVideoInfo = this.getCurrentVideoInfo();
      const href = `href="https://commons.nicovideo.jp/works/${currentVideoInfo.videoId}" target="_blank"`;
      const tagCounterHTML = `
        <div title="タグ個数" id="TagItemsCounter" class="TagItem d_inline-flex pr_x0_5 h_x4 ai_center bdr_full bg-c_action.base flex-wrap_wrap fw_bold ov_hidden [&amp;:has(>_a:nth-child(1):hover)]:bg-c_action.baseHover">
          <a title="コンテンツツリー" data-anchor-page="watch" data-anchor-area="tags" class="pl_x2 pr_base h_100% d_flex ai_center" ${href}>
            タグ個数${option.tagLength}個/最大11個
          </a>
          <a data-anchor-page="watch" data-anchor-area="tags" target="_blank" class="fill_monotone.L100 fs_2xl bdr_full ov_hidden" ${href}>
            <svg id="TagItemsCounter_icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" class="w_font h_font" style="fill: currentColor;">
              <path d="M21.41 11.58l-9-9C12.05 2.22 11.55 2 11 2H4c-1.1 0-2 .9-2 2v7c0 .55.22 1.05.59 1.42l9 9c.36.36.86.58 1.41.58.55 0 1.05-.22 1.41-.59l7-7c.37-.36.59-.86.59-1.41 0-.55-.23-1.06-.59-1.42zM5.5 7C4.67 7 4 6.33 4 5.5S4.67 4 5.5 4 7 4.67 7 5.5 6.33 7 5.5 7z"/>
            </svg>
          </a>
        </div>
        <div title="共有ボタン" id="TagItemsShareButton" class="TagItem d_inline-flex pr_x0_5 h_x4 ai_center bdr_full bg-c_action.base flex-wrap_wrap fw_bold ov_hidden [&amp;:has(>_a:nth-child(1):hover)]:bg-c_action.baseHover">
          <button title="${currentVideoInfo.title}を共有" class="pl_x2 pr_base h_100% d_flex ai_center cursor_pointer gap_x0_5">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" style="fill: currentColor;">
              <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92-1.31-2.92-2.92-2.92z"/>
            </svg>
            共有
          </button>
        </div>
      `;
      option.element.insertAdjacentHTML("beforeend", tagCounterHTML);
      this.setupShareButton();
      return !!document.getElementById("TagItemsCounter") && !!document.getElementById("TagItemsShareButton");
    } catch (error) {
      window.logger.error("[WatchPageModule] タグカウンター挿入エラー:", error);
      return false;
    }
  }
  /**
   * 共有ボタンのイベントハンドラー設定
   */
  setupShareButton() {
    const shareButton = document.querySelector("#TagItemsShareButton button");
    if (shareButton) {
      shareButton.addEventListener("click", () => {
        const currentVideoInfo = this.getCurrentVideoInfo();
        const textToCopy = `${currentVideoInfo.title}
https://nico.ms/${currentVideoInfo.videoId}`;
        navigator.clipboard.writeText(textToCopy).then(() => {
          window.toastr?.success(
            textToCopy + "\nクリップボードにコピーしました！",
            "成功",
            { timeOut: 5e3 }
          );
        }).catch((error) => {
          window.logger.error("コピーに失敗しました:", error);
          window.toastr?.warning(
            "コピーに失敗しました",
            "エラー",
            { timeOut: 5e3 }
          );
        });
      });
    }
  }
  /**
   * 現在の動画情報を取得
   */
  getCurrentVideoInfo() {
    const videoId = this.getCurrentVideoId() || "unknown";
    let title = "無題";
    if (window.NicoCache_nl?.watch?.apiData?.video?.title) {
      title = window.NicoCache_nl.watch.apiData.video.title;
    } else if (document.title && document.title !== "ニコニコ動画") {
      title = document.title.replace(/\s*-\s*ニコニコ動画$/, "").trim();
    } else {
      const h1Element = document.querySelector("h1");
      if (h1Element?.textContent?.trim()) {
        title = h1Element.textContent.trim();
      }
    }
    return { title, videoId };
  }
  /**
   * ヘッダー監視設定
   */
  setupHeaderObserver() {
    return new Promise((resolve) => {
      const observer = new MutationObserver((mutations, obs) => {
        const commonHeader = document.getElementById("CommonHeader");
        const header = document.querySelector("header");
        if (commonHeader && header && commonHeader.children.length > 0 && header.children.length > 0) {
          this.reorganizeHeader(header, commonHeader);
          obs.disconnect();
          resolve();
        }
      });
      observer.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true,
        attributes: true
      });
    });
  }
  /**
   * ヘッダー再構成
   */
  reorganizeHeader(header, commonHeader) {
    const elements = {
      menuButton: header.querySelector('button[aria-label="サイドメニューを開く"]'),
      nicovideoLogo: header.querySelector('a[title="ニコニコ動画"]'),
      accountMenuServiceLinks: commonHeader.querySelector('div:has(img[src*="/nicoaccount/usericon"])')?.parentElement || null,
      searchBar: header.querySelector('form[role="search"]'),
      feedbackNewsSection: header.querySelector("div.d_flex.gap_base.ai_center"),
      premiumLink: commonHeader.querySelector('a[href*="/premium/register"]')?.parentElement || null
    };
    const elementsToMove = Object.values(elements).filter(Boolean);
    while (header.firstChild) {
      header.removeChild(header.firstChild);
    }
    elementsToMove.forEach((element) => header.appendChild(element));
    const headerElement = header;
    headerElement.style.top = "0";
    headerElement.style.position = "sticky";
    headerElement.style.display = "flex";
    headerElement.style.alignItems = "center";
    headerElement.style.gap = "1rem";
    headerElement.style.padding = "0.5rem 1rem";
  }
  /**
   * タグ監視Observer設定
   */
  setupTagObserver() {
    if (this.tagObserver) {
      this.tagObserver.disconnect();
    }
    this.updateTagCounterDebounced = this.debounce(() => {
      this.updateTagCounterDisplay();
    }, 300);
    this.tagObserver = new MutationObserver((mutations) => {
      let shouldUpdate = false;
      mutations.forEach((mutation) => {
        if (mutation.type === "childList") {
          const addedNodes = Array.from(mutation.addedNodes);
          const removedNodes = Array.from(mutation.removedNodes);
          const hasTagChanges = [...addedNodes, ...removedNodes].some((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node;
              return element.classList?.contains("d_inline-flex") || element.querySelector?.(".d_inline-flex");
            }
            return false;
          });
          if (hasTagChanges) {
            shouldUpdate = true;
          }
        }
      });
      if (shouldUpdate && this.updateTagCounterDebounced) {
        this.updateTagCounterDebounced();
      }
    });
    const tagContainer = document.querySelector(".pos_relative.d_flex.flex-wrap_wrap.gap_base");
    if (tagContainer) {
      this.tagObserver.observe(tagContainer, {
        childList: true,
        subtree: true
      });
    }
    this.tagObserver.observe(document.body, {
      childList: true,
      subtree: true
    });
  }
  /**
   * タグカウンター表示を更新
   */
  updateTagCounterDisplay() {
    const tagCounter = document.getElementById("TagItemsCounter");
    if (!tagCounter) return;
    const currentTagCount = this.getTagCount();
    const tagCounterLink = tagCounter.querySelector('a[title="コンテンツツリー"]');
    if (tagCounterLink) {
      tagCounterLink.textContent = `タグ個数${currentTagCount}個/最大11個`;
    }
    this.updateShareButtonInfo();
  }
  /**
   * 共有ボタンの情報を更新
   */
  updateShareButtonInfo() {
    const shareButton = document.getElementById("TagItemsShareButton");
    if (!shareButton) return;
    const currentVideoInfo = this.getCurrentVideoInfo();
    const shareLinks = Array.from(shareButton.querySelectorAll("a"));
    shareLinks.forEach((link) => {
      if (!(link instanceof HTMLAnchorElement)) {
        return;
      }
      const href = `https://commons.nicovideo.jp/works/${currentVideoInfo.videoId}`;
      link.setAttribute("href", href);
    });
    const button = shareButton.querySelector("button");
    if (button) {
      button.setAttribute("title", `${currentVideoInfo.title}を共有`);
    }
  }
  /**
   * デバウンス関数
   */
  debounce(func, wait) {
    let timeout = null;
    return () => {
      if (timeout) {
        clearTimeout(timeout);
      }
      timeout = setTimeout(() => {
        func();
        timeout = null;
      }, wait);
    };
  }
  /**
   * ページ遷移監視Observer設定
   */
  setupPageObserver() {
    this.currentVideoId = this.getCurrentVideoId();
    this.pageObserver = new MutationObserver(() => {
      const newVideoId = this.getCurrentVideoId();
      if (newVideoId && newVideoId !== this.currentVideoId) {
        this.currentVideoId = newVideoId;
        const tagCounterModule = this.subModules.get("tag_counter");
        if (tagCounterModule?.enabled) {
          this.destroyTagCounter();
          setTimeout(async () => {
            try {
              this.destroyTagCounter();
              await this.initializeTagCounter();
            } catch (error) {
              window.logger.error("[WatchPageModule] ページ遷移時のタグカウンター再初期化失敗:", error);
            }
          }, 500);
        }
      }
    });
    this.pageObserver.observe(document.body, {
      childList: true,
      subtree: true
    });
  }
  /**
   * 現在の動画IDを取得
   */
  getCurrentVideoId() {
    const videoIDMatch = /s[mo]\d+/.exec(window.location.pathname);
    return videoIDMatch ? videoIDMatch[0] : null;
  }
}

const watchPageModule = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  WatchPageModule
}, Symbol.toStringTag, { value: 'Module' }));

class WatchMylistSelectorModule {
  constructor(config) {
    this._isActive = false;
    this.addToMylistButton = null;
    this.styleElement = null;
    // 統合されたCSS
    this.styles = `
    /* Mylist2ボタンのスタイル */
    #Mylist2Button {
      display: inline-flex;
      align-items: center;
      border: none;
      cursor: pointer;
      color: #fff;
      font-size: 12px;
      transition: all 0.2s ease;
      border-radius: 4px;
    }

    #Mylist2Button:hover {
      background: rgba(255, 255, 255, 0.1);
      transform: translateY(-1px);
    }

    #Mylist2Button svg {
      width: 20px;
      height: 20px;
      fill: currentColor;
    }

    .cml2-btn-text {
      display: inline-block;
    }

    .mylist-selector-modal {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.7);
      z-index: 8500;
      display: flex;
      justify-content: center;
      align-items: center;
    }

    .mylist-selector-content {
      background: #1a1b1c;
      color: #ffffff;
      padding: 20px;
      border-radius: 5px;
      min-width: 300px;
      max-width: 90%;
      max-height: 90vh;
      overflow-y: auto;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.5);
    }

    .mylist-selector-content h3 {
      color: #ffffff;
      margin: 0 0 15px 0;
      padding-bottom: 10px;
      border-bottom: 1px solid #333;
    }

    .mylist-item {
      padding-top: 4px;
      padding-bottom: 4px;
      cursor: pointer;
      transition: background-color 0.2s;
    }

    .mylist-item:last-child {
      padding-bottom: 25px;
    }

    .mylist-item:hover {
      background: #2a2b2c;
    }

    .mylist-item.active {
      background: #2a88bd;
    }

    #newMylistName {
      flex: 1;
      padding: 8px;
      margin-right: 10px;
      background: #2a2b2c;
      border: 1px solid #444;
      color: #ffffff;
      border-radius: 4px;
    }

    #newMylistName::placeholder {
      color: #888;
    }

    #createNewMylist {
      padding: 8px 16px;
      background: #2a88bd;
      border: none;
      color: #ffffff;
      border-radius: 4px;
      cursor: pointer;
    }

    #createNewMylist:hover {
      background: #3498db;
    }

    #closeMylistSelector {
      width: 100%;
      padding: 8px;
      margin-top: 15px;
      background: #333;
      border: none;
      color: #ffffff;
      border-radius: 4px;
      cursor: pointer;
    }

    #closeMylistSelector:hover {
      background: #444;
    }

    .mylist-search-input {
      width: 100%;
      padding: 8px;
      margin-bottom: 10px;
      border: 1px solid #ccc;
      border-radius: 4px;
    }

    .mylist-item.hidden {
      display: none;
    }

    .suggested-mylists {
      margin-bottom: 15px;
      padding: 10px;
      background: #010f1b;
      border-radius: 5px;
    }

    .suggested-mylists h4 {
      margin: 0 0 10px 0;
      color: #ffffff;
    }

    .mylist-item.suggested {
      background: #010f1b;
      border-left: 3px solid #2196f3;
      padding: 8px 12px;
      margin-bottom: 4px;
    }

    .mylist-item.suggested:hover {
      background: #041a2e;
      transform: translateX(2px);
      transition: all 0.2s ease;
    }

    .mylist-item.suggested .mylist-name {
      font-weight: bold;
    }

    .match-info {
      font-size: 0.85em;
      color: #666;
      margin-top: 4px;
    }
  `;
    this.config = config;
  }
  /**
   * モジュール初期化
   */
  async initialize() {
    if (this._isActive) {
      await Promise.resolve();
      return;
    }
    try {
      await Promise.resolve();
      if (!this.isTargetPage()) {
        return;
      }
      this.injectStyles();
      this._isActive = true;
    } catch (error) {
      window.logger.error("[WatchMylistSelectorModule] 初期化エラー:", error);
      throw error;
    }
  }
  /**
   * モジュール破棄
   */
  destroy() {
    if (!this._isActive) return;
    if (this.addToMylistButton) {
      this.addToMylistButton.remove();
      this.addToMylistButton = null;
    }
    this.removeStyles();
    this._isActive = false;
  }
  /**
   * スタイルを注入
   */
  injectStyles() {
    this.removeStyles();
    this.styleElement = document.createElement("style");
    this.styleElement.type = "text/css";
    this.styleElement.textContent = this.styles;
    this.styleElement.setAttribute("data-module", "WatchMylistSelectorModule");
    document.head.appendChild(this.styleElement);
  }
  /**
   * スタイルを削除
   */
  removeStyles() {
    if (this.styleElement) {
      this.styleElement.remove();
      this.styleElement = null;
    }
  }
  /**
   * モジュール状態確認
   */
  isActive() {
    return this._isActive && !!this.styleElement;
  }
  /**
   * モジュール状態取得
   */
  getStatus() {
    if (!this.isTargetPage()) {
      return ModuleStatus.INACTIVE;
    }
    return this._isActive ? ModuleStatus.ACTIVE : ModuleStatus.INACTIVE;
  }
  /**
   * 対象ページかどうかの判定
   */
  isTargetPage() {
    const pathname = window.location.pathname;
    return /\/watch\//.test(pathname) || /\/search\//.test(pathname);
  }
}

const watchMylistSelectorModule = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  WatchMylistSelectorModule
}, Symbol.toStringTag, { value: 'Module' }));

class HideVideoSettings {
  constructor() {
    this.storageKey = "hideVideoKeywords";
    this.tempDisabled = false;
    this.keywords = this.loadKeywords();
  }
  loadKeywords() {
    try {
      const saved = localStorage.getItem(this.storageKey);
      if (!saved) {
        return [];
      }
      const parsed = JSON.parse(saved);
      if (!Array.isArray(parsed)) {
        return [];
      }
      return parsed.filter((v) => typeof v === "string");
    } catch (error) {
      window.logger.error("キーワードの読み込みエラー:", error);
      return [];
    }
  }
  saveKeywords(keywords) {
    this.keywords = [...keywords];
    localStorage.setItem(this.storageKey, JSON.stringify(this.keywords));
  }
  addKeyword(keyword) {
    const currentKeywords = this.loadKeywords();
    if (!currentKeywords.includes(keyword)) {
      const newKeywords = [...currentKeywords, keyword];
      this.saveKeywords(newKeywords);
    }
  }
  removeKeyword(keyword) {
    const currentKeywords = this.loadKeywords();
    const newKeywords = currentKeywords.filter((k) => k !== keyword);
    this.saveKeywords(newKeywords);
  }
  isRegExp(keyword) {
    return keyword.startsWith("/") && keyword.endsWith("/");
  }
  matchKeyword(title, keyword) {
    if (this.isRegExp(keyword)) {
      try {
        const pattern = keyword.slice(1, -1);
        return new RegExp(pattern, "i").test(title);
      } catch (e) {
        window.logger.error("Invalid RegExp:", e);
        return false;
      }
    }
    return title.toLowerCase().includes(keyword.toLowerCase());
  }
}
const NICOVIDEO_SELECTORS = {
  VIDEO_ELEMENTS: {
    watch: [
      'a[data-anchor-page="watch"][data-anchor-area="playlist"]',
      'a[data-anchor-page="watch"][data-anchor-area="nicoad_videos"]',
      'a[data-anchor-page="watch"]'
    ].join(","),
    top: ".NC-VideoCard",
    ranking: ".NC-Card",
    tag: ".item[data-video-item]",
    search: ".item[data-video-item]",
    other: ""
  },
  TITLE_ELEMENTS: {
    watch: {
      playlist: "h2",
      nicoad: "p",
      default: "h2"
    },
    top: ".NC-CardTitle",
    ranking: ".NC-CardTitle",
    tag: ".itemTitle a",
    search: ".itemTitle a",
    other: ""
  },
  PARENT_ELEMENTS: {
    watch: "",
    top: ".NC-Card",
    ranking: ".NC-Card",
    tag: ".item",
    search: ".item",
    other: ""
  }
};
const URL_PATTERNS = {
  WATCH: "/watch/",
  TAG: "/tag/",
  SEARCH: "/search/",
  RANKING: "/ranking",
  VIDEO_TOP: "/video_top"
};
class HideVideoUI {
  constructor(settings) {
    this.modalElement = null;
    this.styleElement = null;
    this.settings = settings;
    this.hiddenCount = 0;
    this.observer = null;
    this.pageType = this.detectPageType();
  }
  initialize() {
    this.setupModal();
    this.updateKeywordList();
    this.setupObserver();
    this.setupToggleButton();
    setTimeout(() => {
      this.setupSettingsButton();
    }, 100);
    document.addEventListener("updateKeywordList", () => {
      this.updateKeywordList();
    });
    this.checkVideos(true);
  }
  destroy() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    if (this.modalElement) {
      this.modalElement.remove();
      this.modalElement = null;
    }
    if (this.styleElement) {
      this.styleElement.remove();
      this.styleElement = null;
    }
    this.restoreAllVideos();
    document.removeEventListener("updateKeywordList", () => {
      this.updateKeywordList();
    });
  }
  restoreAllVideos() {
    const hiddenElements = document.querySelectorAll('[data-nvf-hidden="true"]');
    hiddenElements.forEach((element) => {
      this.showElement(element);
    });
  }
  setupModal() {
    const modal = document.createElement("div");
    modal.innerHTML = `
      <div id="nvfHideVideoModal" class="nvf-modal" style="display:none;">
        <div class="nvf-modal-content">
          <h2>非表示キーワード設定のじゃ！</h2>
          <div class="nvf-status-info">
            <span id="nvfHiddenCount">非表示動画数: 0</span>
            <label class="nvf-toggle-switch">
              <input type="checkbox" id="nvfToggleFilter">
              <span class="nvf-slider">フィルター一時停止</span>
            </label>
          </div>
          <div class="nvf-search-box">
            <input type="text" id="nvfKeywordSearch" placeholder="キーワードを検索">
          </div>
          <div id="nvfKeywordList" class="nvf-keyword-list"></div>
          <div class="nvf-add-keyword-box">
            <input type="text" id="nvfNewKeyword" placeholder="新しいキーワード（正規表現は /pattern/ 形式）">
            <button id="nvfAddKeyword">追加</button>
          </div>
          <button id="nvfCloseModal">閉じる</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    this.modalElement = modal;
    this.styleElement = document.createElement("style");
    this.styleElement.textContent = `
      .nvf-modal {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.7);
        z-index: 10001;
        backdrop-filter: blur(3px);
      }
      .nvf-modal-content {
        position: relative;
        background: rgba(32, 34, 37, 0.95);
        color: #ffffff;
        margin: 15% auto;
        padding: 20px;
        width: 70%;
        max-width: 500px;
        border-radius: 8px;
        box-shadow: 0 0 20px rgba(0,0,0,0.5);
        border: 1px solid rgba(255,255,255,0.1);
      }
      .nvf-modal h2 {
        margin-top: 0;
        text-align: center;
        color: #4CAF50;
      }
      .nvf-status-info {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 15px;
        padding: 10px;
        background: rgba(255,255,255,0.05);
        border-radius: 5px;
      }
      .nvf-toggle-switch {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .nvf-search-box {
        margin-bottom: 15px;
      }
      .nvf-search-box input {
        width: 100%;
        padding: 8px;
        border: 1px solid rgba(255,255,255,0.3);
        border-radius: 4px;
        background: rgba(255,255,255,0.1);
        color: white;
        box-sizing: border-box;
      }
      .nvf-keyword-list {
        max-height: 200px;
        overflow-y: auto;
        margin-bottom: 15px;
        border: 1px solid rgba(255,255,255,0.2);
        border-radius: 5px;
        padding: 5px;
        background: rgba(0,0,0,0.2);
      }
      .nvf-keyword-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px;
        margin-bottom: 5px;
        background: rgba(255,255,255,0.05);
        border-radius: 3px;
        border-left: 3px solid #4CAF50;
      }
      .nvf-keyword-text.regex-keyword {
        color: #ff9800;
        font-family: monospace;
      }
      .delete-keyword {
        background: #f44336;
        color: white;
        border: none;
        padding: 4px 8px;
        border-radius: 3px;
        cursor: pointer;
        font-size: 12px;
      }
      .delete-keyword:hover {
        background: #d32f2f;
      }
      .nvf-add-keyword-box {
        display: flex;
        gap: 10px;
        margin-bottom: 15px;
      }
      .nvf-add-keyword-box input {
        flex: 1;
        padding: 8px;
        border: 1px solid rgba(255,255,255,0.3);
        border-radius: 4px;
        background: rgba(255,255,255,0.1);
        color: white;
      }
      .nvf-add-keyword-box button {
        padding: 8px 16px;
        background: #4CAF50;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
      }
      .nvf-add-keyword-box button:hover {
        background: #45a049;
      }
      #nvfCloseModal {
        width: 100%;
        padding: 10px;
        background: #2196F3;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 16px;
      }
      #nvfCloseModal:hover {
        background: #1976D2;
      }
      [data-nvf-hidden="true"] {
        display: none !important;
      }
    `;
    document.head.appendChild(this.styleElement);
    this.setupEventListeners();
  }
  detectPageType() {
    const url = window.location.pathname;
    if (url.includes(URL_PATTERNS.WATCH)) return "watch";
    if (url.includes(URL_PATTERNS.TAG)) return "tag";
    if (url.includes(URL_PATTERNS.SEARCH)) return "search";
    if (url.includes(URL_PATTERNS.RANKING)) return "ranking";
    if (url.includes(URL_PATTERNS.VIDEO_TOP)) return "top";
    return "other";
  }
  getVideoElements() {
    const selector = NICOVIDEO_SELECTORS.VIDEO_ELEMENTS[this.pageType];
    return document.querySelectorAll(selector);
  }
  getTitleFromElement(element) {
    const titleSelectors = NICOVIDEO_SELECTORS.TITLE_ELEMENTS[this.pageType];
    if (this.pageType === "watch" && typeof titleSelectors === "object") {
      const href = element.getAttribute("href") || "";
      if (href.includes("playlist")) {
        const titleElement = element.querySelector(titleSelectors.playlist);
        return titleElement?.textContent?.trim() || "";
      } else if (href.includes("nicoad")) {
        const titleElement = element.querySelector(titleSelectors.nicoad);
        return titleElement?.textContent?.trim() || "";
      } else {
        const titleElement = element.querySelector(titleSelectors.default);
        return titleElement?.textContent?.trim() || "";
      }
    } else if (typeof titleSelectors === "string") {
      const titleElement = element.querySelector(titleSelectors);
      return titleElement?.textContent?.trim() || "";
    }
    return "";
  }
  hideElement(element) {
    const parentSelector = NICOVIDEO_SELECTORS.PARENT_ELEMENTS[this.pageType];
    const targetElement = parentSelector ? element.closest(parentSelector) || element : element;
    targetElement.setAttribute("data-nvf-hidden", "true");
    if (targetElement instanceof HTMLElement) {
      targetElement.style.transition = "opacity 0.3s ease-out, transform 0.3s ease-out";
      targetElement.style.opacity = "0";
      targetElement.style.transform = "scale(0.8)";
      setTimeout(() => {
        targetElement.style.display = "none";
      }, 300);
    }
  }
  showElement(element) {
    const parentSelector = NICOVIDEO_SELECTORS.PARENT_ELEMENTS[this.pageType];
    const targetElement = parentSelector ? element.closest(parentSelector) || element : element;
    targetElement.removeAttribute("data-nvf-hidden");
    if (targetElement instanceof HTMLElement) {
      targetElement.style.display = "";
      targetElement.style.opacity = "0";
      targetElement.style.transform = "scale(0.8)";
      setTimeout(() => {
        targetElement.style.opacity = "1";
        targetElement.style.transform = "scale(1)";
      }, 10);
    }
  }
  setupObserver() {
    if (this.observer) {
      this.observer.disconnect();
    }
    this.observer = new MutationObserver((mutations) => {
      let shouldCheck = false;
      mutations.forEach((mutation) => {
        if (mutation.type === "childList") {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node;
              const selector = NICOVIDEO_SELECTORS.VIDEO_ELEMENTS[this.pageType];
              if (selector && (element.matches(selector) || element.querySelector(selector))) {
                shouldCheck = true;
              }
            }
          });
        }
      });
      if (shouldCheck) {
        setTimeout(() => this.checkVideos(), 100);
      }
    });
    this.observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }
  setupToggleButton() {
    const toggleContainer = document.querySelector("#siteHeaderUserContainer, .SiteHeaderContainer");
    if (toggleContainer && !document.getElementById("nvfToggleButton")) {
      const button = document.createElement("button");
      button.id = "nvfToggleButton";
      button.innerHTML = createMaterialIcon("block", { style: "outlined", color: "white" });
      button.title = "動画フィルター切り替え";
      button.style.cssText = `
        background: rgba(0,0,0,0.7);
        color: white;
        border: 1px solid rgba(255,255,255,0.3);
        border-radius: 4px;
        padding: 5px 8px;
        margin-left: 8px;
        cursor: pointer;
        font-size: 14px;
      `;
      button.addEventListener("click", () => {
        this.settings.tempDisabled = !this.settings.tempDisabled;
        button.style.opacity = this.settings.tempDisabled ? "0.5" : "1";
        this.checkVideos();
      });
      toggleContainer.appendChild(button);
    }
  }
  updateHiddenCount() {
    const countElement = document.getElementById("nvfHiddenCount");
    if (countElement) {
      countElement.textContent = `非表示動画数: ${this.hiddenCount}`;
    }
  }
  checkVideos(isInitial = false) {
    if (this.settings.tempDisabled) {
      document.querySelectorAll('[data-nvf-hidden="true"]').forEach((element) => {
        this.showElement(element);
      });
      this.hiddenCount = 0;
      this.updateHiddenCount();
      return;
    }
    const videos = this.getVideoElements();
    const keywords = this.settings.keywords;
    const previousCount = this.hiddenCount;
    if (keywords.length === 0) {
      this.hiddenCount = 0;
      this.updateHiddenCount();
      return;
    }
    setTimeout(() => {
      const updates = [];
      let newHiddenCount = 0;
      videos.forEach((video) => {
        const title = this.getTitleFromElement(video);
        const shouldHide = this.shouldHideVideo(title);
        const isCurrentlyHidden = video.hasAttribute("data-nvf-hidden");
        updates.push({ video, hide: shouldHide });
        if (shouldHide && !isCurrentlyHidden) {
          newHiddenCount++;
        } else if (shouldHide && isCurrentlyHidden) {
          newHiddenCount++;
        }
      });
      this.hiddenCount = newHiddenCount;
      updates.forEach(({ video, hide }) => {
        if (hide) {
          this.hideElement(video);
        } else {
          this.showElement(video);
        }
      });
      this.updateHiddenCount();
      if (!isInitial && this.hiddenCount !== previousCount) {
        const matchedKeywords = keywords.filter(
          (keyword) => Array.from(videos).some(
            (video) => this.settings.matchKeyword(this.getTitleFromElement(video), keyword)
          )
        );
        const message = `${this.hiddenCount}件の動画を非表示にしたのじゃ！`;
        const subtitle = matchedKeywords.length > 0 ? `マッチしたキーワード: ${matchedKeywords.slice(0, 3).join(", ")}${matchedKeywords.length > 3 ? " など" : ""}` : "";
        if (typeof window !== "undefined" && "toastr" in window) {
          const toastr = window.toastr;
          toastr.info(
            message,
            "動画フィルター",
            {
              timeOut: 3e3,
              extendedTimeOut: subtitle ? 1e3 : 0
            }
          );
        }
      }
    });
  }
  shouldHideVideo(title) {
    return this.settings.keywords.some((keyword) => this.settings.matchKeyword(title, keyword));
  }
  setupEventListeners() {
    const closeModalButton = document.getElementById("nvfCloseModal");
    if (closeModalButton) {
      closeModalButton.addEventListener("click", () => {
        const modal2 = document.getElementById("nvfHideVideoModal");
        if (modal2) {
          modal2.style.display = "none";
          this.checkVideos();
        }
      });
    }
    const modal = document.getElementById("nvfHideVideoModal");
    if (modal) {
      modal.addEventListener("click", (e) => {
        if (e.target instanceof HTMLElement && e.target.id === "nvfHideVideoModal") {
          e.target.style.display = "none";
          this.checkVideos();
        }
      });
    }
    const addKeywordButton = document.getElementById("nvfAddKeyword");
    if (addKeywordButton) {
      addKeywordButton.addEventListener("click", () => {
        const input = document.getElementById("nvfNewKeyword");
        if (input) {
          const keyword = input.value.trim();
          if (keyword) {
            this.settings.addKeyword(keyword);
            input.value = "";
            this.updateKeywordList();
            this.checkVideos();
          }
        }
      });
    }
    const toggleFilterInput = document.getElementById("nvfToggleFilter");
    if (toggleFilterInput) {
      toggleFilterInput.addEventListener("change", (e) => {
        if (e.target instanceof HTMLInputElement) {
          this.settings.tempDisabled = e.target.checked;
          this.checkVideos();
        }
      });
    }
    const keywordSearch = document.getElementById("nvfKeywordSearch");
    if (keywordSearch) {
      keywordSearch.addEventListener("input", (e) => {
        if (e.target instanceof HTMLInputElement) {
          const searchText = e.target.value.toLowerCase();
          const items = document.querySelectorAll(".nvf-keyword-item");
          items.forEach((item) => {
            const keywordElement = item.querySelector(".nvf-keyword-text");
            if (keywordElement && keywordElement.textContent) {
              const keyword = keywordElement.textContent.toLowerCase();
              item.style.display = keyword.includes(searchText) ? "flex" : "none";
            }
          });
        }
      });
    }
  }
  setupSettingsButton() {
    const settingsButton = document.getElementById("HideVideoSettingsButton");
    if (settingsButton) {
      settingsButton.addEventListener("click", () => {
        const modal = document.getElementById("nvfHideVideoModal");
        this.settings.keywords = this.settings.loadKeywords();
        if (modal) {
          modal.style.display = "block";
          this.updateKeywordList();
        }
      });
    }
  }
  updateKeywordList() {
    const listElement = document.getElementById("nvfKeywordList");
    if (!listElement) {
      window.logger.error("nvfKeywordList要素が見つかりません");
      return;
    }
    const newListElement = document.createElement("div");
    newListElement.id = "nvfKeywordList";
    newListElement.className = "nvf-keyword-list";
    this.settings.keywords.forEach((keyword) => {
      const item = document.createElement("div");
      item.className = "nvf-keyword-item";
      const keywordClass = this.settings.isRegExp(keyword) ? "regex-keyword" : "";
      item.innerHTML = `
        <span class="nvf-keyword-text ${keywordClass}">${keyword}</span>
        <button class="delete-keyword" data-keyword="${keyword}">削除</button>
      `;
      const deleteButton = item.querySelector(".delete-keyword");
      if (deleteButton) {
        deleteButton.addEventListener("click", () => {
          this.settings.removeKeyword(keyword);
          this.updateKeywordList();
          this.checkVideos();
        });
      }
      newListElement.appendChild(item);
    });
    if (listElement.parentNode) {
      listElement.parentNode.replaceChild(newListElement, listElement);
    }
  }
  openSettingsPanel() {
    const modal = document.getElementById("nvfHideVideoModal");
    if (modal) {
      this.settings.keywords = this.settings.loadKeywords();
      modal.style.display = "block";
      this.updateKeywordList();
    }
  }
}
class ThumbnailsFilterModule {
  constructor(config) {
    this.settings = null;
    this.ui = null;
    this._isActive = false;
    this.config = config;
  }
  async initialize() {
    try {
      await Promise.resolve();
      this.settings = new HideVideoSettings();
      this.ui = new HideVideoUI(this.settings);
      this.ui.initialize();
      const thumbnailsFilter = {
        openSettingsPanel: () => this.ui?.openSettingsPanel()
      };
      window.ThumbnailsFilter = thumbnailsFilter;
      this._isActive = true;
    } catch (error) {
      window.logger.error("[ThumbnailsFilterModule] 初期化に失敗しました:", error);
      this._isActive = false;
      throw error;
    }
  }
  destroy() {
    if (this.ui) {
      this.ui.destroy();
      this.ui = null;
    }
    this.settings = null;
    if (typeof window !== "undefined") {
      const windowWithThumbnailsFilter = window;
      delete windowWithThumbnailsFilter.ThumbnailsFilter;
    }
    this._isActive = false;
  }
  isActive() {
    return this._isActive;
  }
  getStatus() {
    if (!this._isActive) {
      return ModuleStatus.INACTIVE;
    }
    return ModuleStatus.ACTIVE;
  }
}

const thumbnailsFilterModule = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  ThumbnailsFilterModule
}, Symbol.toStringTag, { value: 'Module' }));

class DeletedVideoDetector {
  constructor() {
    this.observer = null;
    this.lastUrl = "";
    this.isEnabled = false;
    this.initialized = false;
    this.handlePopState = () => {
      if (this.isEnabled) {
        void this.handleUnavailableVideo();
      }
    };
    this.handleDOMContentLoaded = () => {
      if (this.isEnabled) {
        void this.handleUnavailableVideo();
      }
    };
    void this.initializeNicoCache();
  }
  static {
    this.instance = null;
  }
  static getInstance() {
    if (!DeletedVideoDetector.instance) {
      DeletedVideoDetector.instance = new DeletedVideoDetector();
    }
    return DeletedVideoDetector.instance;
  }
  async initializeNicoCache() {
    while (!window.NicoCache_nl) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    this.nicoCache = window.NicoCache_nl;
    this.initialized = true;
  }
  /**
   * モジュールを有効化
   */
  async enable() {
    if (!this.initialized) {
      await this.initializeNicoCache();
    }
    if (this.isEnabled) {
      return;
    }
    this.isEnabled = true;
    this.setupUrlObserver();
    this.setupEventListeners();
    await this.handleUnavailableVideo();
  }
  /**
   * モジュールを無効化
   */
  disable() {
    if (!this.isEnabled) {
      return;
    }
    this.isEnabled = false;
    this.cleanup();
  }
  /**
   * URL変更を監視するMutationObserverをセットアップ
   */
  setupUrlObserver() {
    this.lastUrl = location.href;
    this.observer = new MutationObserver(() => {
      if (this.isEnabled && location.href !== this.lastUrl) {
        this.lastUrl = location.href;
        void this.handleUnavailableVideo();
      }
    });
    this.observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }
  /**
   * イベントリスナーをセットアップ
   */
  setupEventListeners() {
    window.addEventListener("popstate", this.handlePopState);
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", this.handleDOMContentLoaded);
    } else {
      this.handleDOMContentLoaded();
    }
  }
  /**
   * 削除動画を検出（DOM要素ベース）
   */
  detectUnavailableVideo() {
    const errorMessage = document.querySelector(".fs_xl.fw_bold");
    if (errorMessage && errorMessage.textContent === "お探しの動画は視聴できません") {
      return true;
    }
    return false;
  }
  /**
   * API経由で動画の可用性をチェック
   */
  async checkVideoAvailability(videoId) {
    const apiUrl = `https://ext.nicovideo.jp/api/getthumbinfo/${videoId}`;
    try {
      const response = await fetch(apiUrl);
      const text = await response.text();
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(text, "text/xml");
      const status = xmlDoc.querySelector("nicovideo_thumb_response")?.getAttribute("status") || null;
      if (status === "fail") {
        const errorCode = xmlDoc.querySelector("code")?.textContent || void 0;
        return errorCode === "DELETED";
      }
      return false;
    } catch (error) {
      window.logger.error("[DeletedVideoDetector] API check failed:", error);
      return false;
    }
  }
  /**
   * 削除動画の処理メイン関数
   */
  async handleUnavailableVideo() {
    if (!this.isEnabled) return;
    const videoId = window.location.pathname.match(/watch\/(sm\d+)/)?.[1];
    if (!videoId) return;
    const isUnavailable = this.detectUnavailableVideo();
    const isApiUnavailable = await this.checkVideoAvailability(videoId);
    if (isUnavailable || isApiUnavailable) {
      window.NicoCache_nl.deletedVideoPlayer?.play(videoId, window.NicoCache_nl.watch.apiData.video.title);
    }
  }
  /**
   * クリーンアップ処理
   */
  cleanup() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    window.removeEventListener("popstate", this.handlePopState);
    document.removeEventListener("DOMContentLoaded", this.handleDOMContentLoaded);
  }
  /**
   * モジュールの状態を取得
   */
  getStatus() {
    return {
      enabled: this.isEnabled,
      initialized: this.initialized
    };
  }
  /**
   * デストラクタ
   */
  destroy() {
    this.disable();
    DeletedVideoDetector.instance = null;
  }
}

class DeletedVideoDetectorModule {
  constructor(config) {
    this.isInitialized = false;
    this.config = config;
    this.detector = DeletedVideoDetector.getInstance();
  }
  /**
   * モジュールを初期化
   */
  async initialize() {
    try {
      await this.detector.enable();
      this.isInitialized = true;
    } catch (error) {
      window.logger.error(`[${this.config.id}] 初期化中にエラーが発生しました:`, error);
      throw error;
    }
  }
  /**
   * モジュールを破棄
   */
  destroy() {
    try {
      this.detector.disable();
      this.isInitialized = false;
    } catch (error) {
      window.logger.error(`[${this.config.id}] 破棄中にエラーが発生しました:`, error);
    }
  }
  /**
   * モジュールがアクティブかチェック
   */
  isActive() {
    if (!this.isInitialized) {
      return false;
    }
    try {
      const status = this.detector.getStatus();
      return status.enabled && status.initialized;
    } catch (error) {
      window.logger.error(`[${this.config.id}] アクティブ状態の確認中にエラーが発生しました:`, error);
      return false;
    }
  }
  /**
   * モジュールの状態を取得
   */
  getStatus() {
    if (!this.isInitialized) {
      return ModuleStatus.INACTIVE;
    }
    try {
      const detectorStatus = this.detector.getStatus();
      if (detectorStatus.enabled && detectorStatus.initialized) {
        return ModuleStatus.ACTIVE;
      } else if (detectorStatus.initialized) {
        return ModuleStatus.INACTIVE;
      } else {
        return ModuleStatus.LOADING;
      }
    } catch (error) {
      window.logger.error(`[${this.config.id}] 状態取得中にエラーが発生しました:`, error);
      return ModuleStatus.ERROR;
    }
  }
  /**
   * モジュール固有の情報を取得
   */
  getModuleInfo() {
    try {
      return {
        detectorStatus: this.detector.getStatus()
      };
    } catch (error) {
      window.logger.error(`[${this.config.id}] モジュール情報の取得中にエラーが発生しました:`, error);
      return {
        detectorStatus: { enabled: false, initialized: false }
      };
    }
  }
}

const deletedVideoDetectorModule = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  DeletedVideoDetectorModule
}, Symbol.toStringTag, { value: 'Module' }));
//# sourceMappingURL=mlink-video-controller.es.js.map
