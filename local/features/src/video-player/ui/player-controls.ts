import { PLAYER_SETTINGS } from "@/video-player/config/constants";
import { PLAYER_ICONS } from "@/video-player/config/icons";
import { materialIconsStyles } from "@/common/material-icons";
import { CommentSystem } from "@/video-player/core/comment-system";
import * as IndexedDBUtils from "@/video-player/utils/indexed-db-utils";
import { ExtendedDocument, ExtendedHTMLElement } from "@/types/index";

const PLAYER_VOLUME_STORAGE_KEY = "playerVolume";

/**
 * シャドウDOM版のプレイヤーコントロール
 * Web Componentsとして実装してスタイル分離を実現
 */
export class PlayerControlsShadow extends HTMLElement {
  private shadow: ShadowRoot;
  private video: HTMLVideoElement | null = null;
  private mouseTimer: number | null = null;
  private cursorTimer: number | null = null;
  private commentSystem: CommentSystem | null = null;
  private userPaused: boolean = false;
  private isSettingsOpen: boolean = false;

  // コメント設定関連
  private commentOpacity: number = PLAYER_SETTINGS.COMMENT.OPACITY.DEFAULT;
  private commentColor: string = PLAYER_SETTINGS.COMMENT.COLORS.WHITE;
  private ngWords: string[] = [];
  private ngRegex: string[] = [];

  // 一時的な設定保存用
  private tempOpacity: number = PLAYER_SETTINGS.COMMENT.OPACITY.DEFAULT;
  private tempColor: string = PLAYER_SETTINGS.COMMENT.COLORS.WHITE;
  private tempNgWords: string[] = [];
  private tempNgRegex: string[] = [];

  private initialized = false;

  constructor() {
    super();

    // シャドウDOMを作成
    this.shadow = this.attachShadow({ mode: "closed" });
    this.shadow.innerHTML = this.getTemplate();

    // 非同期で初期化（DOMReadyを待つ）
    void this.initializeComponent();
  }

  /**
   * コンポーネントの非同期初期化
   */
  private async initializeComponent(): Promise<void> {
    // DOMの構築完了を確実に待つ
    await new Promise((resolve) => {
      // MutationObserverでDOMの準備完了を監視
      if (this.shadow && this.shadow.firstElementChild) {
        resolve(undefined);
        return;
      }

      const observer = new MutationObserver(() => {
        if (this.shadow && this.shadow.firstElementChild) {
          observer.disconnect();
          resolve(undefined);
        }
      });

      observer.observe(this.shadow, { childList: true });

      // タイムアウト保険（最大100ms）
      setTimeout(() => {
        observer.disconnect();
        resolve(undefined);
      }, 100);
    });

    this.setupEventListeners();
    this.setupInitialIcons();
    this.initialized = true;

    // 初期のコントロール表示状態を設定
    const savedControlsMode =
      localStorage.getItem("controlsMode") ||
      PLAYER_SETTINGS.CONTROLS_MODE.HOVER;
    this.applyControlsMode(savedControlsMode);

    window.logger.info("PlayerControlsShadowの初期化が完了しました！");
  }

  /**
   * ビデオ要素を設定
   */
  setVideoElement(video: HTMLVideoElement): void {
    if (!video) {
      window.logger.error("無効なビデオ要素が渡されました");
      return;
    }

    // 確実に内部初期化
    this.ensureInitialized();

    this.video = video;
    this.initializeVolumeState();

    // ビデオイベントのセットアップ
    this.setupVideoEvents();

    // 設定の初期化
    void this.initializeSettings();

    window.logger.info("ビデオ要素が設定されました！");
  }

  /**
   * コメントシステムを設定
   */
  setCommentSystem(commentSystem: CommentSystem): void {
    this.commentSystem = commentSystem;

    // コメントボタンの状態を更新
    const commentToggle = this.shadow.querySelector("#comment-toggle");
    if (commentToggle && this.commentSystem) {
      commentToggle.classList.toggle(
        "active",
        !this.commentSystem.getVisibility(),
      );
    }

    // 現在の設定をコメントシステムに適用
    if (this.commentSystem) {
      this.commentSystem.setOpacity(this.commentOpacity);
      this.commentSystem.setDefaultColor(this.commentColor);
      this.commentSystem.setNGWords(this.ngWords);
      this.commentSystem.setNGRegex(this.ngRegex);
    }
  }

  disableComments(): void {
    this.ensureInitialized();

    const commentToggle = this.shadow.querySelector("#comment-toggle");
    if (commentToggle instanceof HTMLElement) {
      commentToggle.style.display = "none";
    }

    const commentSettingsSection = this.shadow.querySelector(
      '[data-settings-section="comment"]',
    );
    if (commentSettingsSection instanceof HTMLElement) {
      commentSettingsSection.style.display = "none";
    }
  }

  /**
   * HTMLテンプレートを取得
   */
  private getTemplate(): string {
    const initialVolumePercent = Math.round(
      PLAYER_SETTINGS.VOLUME.DEFAULT * 100,
    );
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
              <input type="range" id="volume" class="custom-slider" min="0" max="100" value="${initialVolumePercent}" style="--volume: ${initialVolumePercent}%;">
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
  private getSettingsMenuTemplate(): string {
    return `
      <div class="settings-container">
        <!-- プレイヤー設定部分 -->
        <div class="settings-section" data-settings-section="player">
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
        <div class="settings-section" data-settings-section="comment">
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
  private getStyles(): string {
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
  private setupEventListeners(): void {
    if (this.initialized) return; // 二重登録防止
    // 設定関連
    this.setupSettingsEvents();

    // コントロール関連
    this.setupControlEvents();

    // コメント関連
    this.setupCommentEvents();

    // マウスホバー関連
    this.setupHoverEvents();

    // キーボードショートカット
    document.addEventListener("keydown", this.handleKeyboardShortcuts);
    this.initialized = true;
  }

  /**
   * 設定関連のイベント設定
   */
  private setupSettingsEvents(): void {
    const settingsBtn = this.shadow.querySelector("#settings");
    const settingsMenu = this.shadow.querySelector("#player-settings-menu");

    if (settingsBtn) {
      settingsBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        this.toggleSettingsMenu();
      });
    }

    if (settingsMenu) {
      settingsMenu.addEventListener("click", (e) => {
        e.stopPropagation();
      });
    }

    // 設定メニュー外クリックで閉じる
    document.addEventListener("click", (e) => {
      const path = e.composedPath();
      if (!path.includes(this)) {
        this.closeSettingsMenu();
      }
    });

    // コントロールモード変更
    const controlsModeSelect = this.shadow.querySelector(
      "#controls-mode",
    ) as HTMLSelectElement;
    if (controlsModeSelect) {
      controlsModeSelect.addEventListener(
        "change",
        this.handleControlsModeChange,
      );
    }
  }

  /**
   * コントロール関連のイベント設定
   */
  private setupControlEvents(): void {
    // 再生/一時停止ボタン
    const playPauseBtn = this.shadow.querySelector("#play-pause");
    if (playPauseBtn) {
      playPauseBtn.addEventListener("click", () => {
        const video = this.getVideo();
        if (!video) return;

        if (video.paused) {
          video
            .play()
            .catch((e) => window.logger.error("再生開始に失敗しました:", e));
        } else {
          video.pause();
          this.userPaused = true;
        }
      });
    }

    // 10秒戻し/進むボタン
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
          video.currentTime = Math.min(
            video.currentTime + 10,
            video.duration || 0,
          );
        }
      });
    }

    // シークバーとプログレスバー
    this.setupProgressControls();

    // 音量コントロール
    this.setupVolumeControls();

    // 全画面ボタン
    this.setupFullscreenControl();
  }

  /**
   * プログレス関連のコントロール設定
   */
  private setupProgressControls(): void {
    const seekBar = this.shadow.querySelector("#seek-bar") as HTMLInputElement;
    const progressBar = this.shadow.querySelector(
      ".progress-bar-custom",
    ) as HTMLElement;
    const progressContainer = this.shadow.querySelector(
      ".progress-container-custom",
    ) as HTMLElement;

    if (!seekBar || !progressBar || !progressContainer) return;

    // シークバーの値変更時
    seekBar.addEventListener("change", () => {
      const video = this.getVideo();
      if (video) {
        const progress = Number(seekBar.value);
        video.currentTime = (progress / 100) * video.duration;
      }
    });

    // シークバーのドラッグ処理
    seekBar.addEventListener("input", () => {
      const progress = Number(seekBar.value);
      seekBar.style.setProperty("--progress", `${progress}%`);
    });

    // プログレスバーのクリック処理
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
  private setupVolumeControls(): void {
    const volumeBar = this.shadow.querySelector<HTMLInputElement>("#volume");
    const muteBtn = this.shadow.querySelector<HTMLButtonElement>("#mute");

    if (!volumeBar || !muteBtn) return;

    const initialPercent = Math.round(PLAYER_SETTINGS.VOLUME.DEFAULT * 100);
    volumeBar.style.setProperty("--volume", `${initialPercent}%`);

    // 音量スライダーの更新
    volumeBar.addEventListener("input", () => {
      const video = this.getVideo();
      if (!video) return;

      const volumeValue = this.clampVolume(Number(volumeBar.value) / 100);
      video.volume = volumeValue;

      if (volumeValue > 0 && video.muted) {
        video.muted = false;
      }

      this.updateVolumeSlider(volumeValue);
      localStorage.setItem(PLAYER_VOLUME_STORAGE_KEY, volumeValue.toString());
      this.updateVolumeIcon();
    });

    // ミュートボタンのクリック
    muteBtn.addEventListener("click", () => {
      const video = this.getVideo();
      if (!video) return;

      video.muted = !video.muted;
      this.updateVolumeIcon();
    });
  }

  /**
   * 音量値を許容範囲にクランプ
   */
  private clampVolume(volume: number): number {
    const { MIN, MAX, DEFAULT } = PLAYER_SETTINGS.VOLUME;
    if (Number.isNaN(volume)) {
      return DEFAULT;
    }
    return Math.min(Math.max(volume, MIN), MAX);
  }

  /**
   * 音量スライダーのUI更新
   */
  private updateVolumeSlider(volume: number): void {
    const volumeBar = this.shadow.querySelector<HTMLInputElement>("#volume");
    if (!volumeBar) return;

    const clamped = this.clampVolume(volume);
    const percent = Math.round(clamped * 100);
    volumeBar.value = percent.toString();
    volumeBar.style.setProperty("--volume", `${percent}%`);
  }

  /**
   * 動画要素の音量とUIを同期
   */
  private syncVolumeFromVideo(): void {
    const video = this.getVideo();
    if (!video) return;

    this.updateVolumeSlider(video.volume);
    this.updateVolumeIcon();
  }

  /**
   * 初期音量の適用
   */
  private initializeVolumeState(): void {
    const video = this.getVideo();
    if (!video) return;

    const savedVolumeRaw = localStorage.getItem(PLAYER_VOLUME_STORAGE_KEY);
    let volume = PLAYER_SETTINGS.VOLUME.DEFAULT;

    if (savedVolumeRaw !== null) {
      const parsed = Number(savedVolumeRaw);
      if (!Number.isNaN(parsed)) {
        volume = parsed;
      }
    } else {
      const currentVolume = this.clampVolume(video.volume);
      if (currentVolume !== 1) {
        volume = currentVolume;
      }
    }

    volume = this.clampVolume(volume);
    video.volume = volume;

    if (volume > 0 && video.muted) {
      video.muted = false;
    }

    this.updateVolumeSlider(volume);
    this.updateVolumeIcon();
  }

  /**
   * 全画面コントロールの設定
   */
  private setupFullscreenControl(): void {
    const fullscreenBtn = this.shadow.querySelector("#fullscreen");
    if (!fullscreenBtn) return;

    fullscreenBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.toggleFullscreen();
    });

    // 全画面状態の変更を監視
    document.addEventListener("fullscreenchange", () => {
      this.handleFullscreenChange();
    });
  }

  /**
   * コメント関連のイベント設定
   */
  private setupCommentEvents(): void {
    const commentToggle = this.shadow.querySelector("#comment-toggle");
    if (!commentToggle) return;

    commentToggle.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();

      if (!this.commentSystem) return;

      const isVisible = this.commentSystem.toggleVisibility();
      commentToggle.classList.toggle("active", !isVisible);

      // アイコンを切り替え
      commentToggle.innerHTML = isVisible
        ? PLAYER_ICONS.comment
        : PLAYER_ICONS.commentOff;

      // ローカルストレージに設定を保存
      localStorage.setItem("commentVisible", isVisible.toString());
    });

    // コメント設定の各種イベント
    this.setupCommentSettingsEvents();
  }

  /**
   * コメント設定のイベント設定
   */
  private setupCommentSettingsEvents(): void {
    // 透明度スライダー
    const opacitySlider = this.shadow.querySelector(
      "#comment-opacity",
    ) as HTMLInputElement;
    const opacityValue = this.shadow.querySelector(
      "#opacity-value",
    ) as HTMLElement;

    if (opacitySlider && opacityValue) {
      opacitySlider.addEventListener("input", () => {
        const opacity = Number(opacitySlider.value);
        opacityValue.textContent = opacitySlider.value;
        this.tempOpacity = opacity;
      });
    }

    // コメント色選択
    const colorSelect = this.shadow.querySelector(
      "#comment-color",
    ) as HTMLSelectElement;
    if (colorSelect) {
      colorSelect.addEventListener("change", () => {
        this.tempColor = colorSelect.value;
      });
    }

    // NGワード追加
    const ngWordInput = this.shadow.querySelector(
      "#ng-word-input",
    ) as HTMLInputElement;
    const addNgWordBtn = this.shadow.querySelector(
      "#add-ng-word",
    ) as HTMLButtonElement;

    if (ngWordInput && addNgWordBtn) {
      addNgWordBtn.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        const word = ngWordInput.value.trim();
        if (
          word &&
          !this.tempNgWords.includes(word) &&
          this.tempNgWords.length < PLAYER_SETTINGS.COMMENT.NG.MAX_WORDS
        ) {
          this.tempNgWords.push(word);
          ngWordInput.value = "";
          this.updateNGWordList(true);
        }
      });
    }

    // NG正規表現追加
    const ngRegexInput = this.shadow.querySelector(
      "#ng-regex-input",
    ) as HTMLInputElement;
    const addNgRegexBtn = this.shadow.querySelector(
      "#add-ng-regex",
    ) as HTMLButtonElement;

    if (ngRegexInput && addNgRegexBtn) {
      addNgRegexBtn.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        const regex = ngRegexInput.value.trim();

        try {
          new RegExp(regex);

          if (
            regex &&
            !this.tempNgRegex.includes(regex) &&
            this.tempNgRegex.length < PLAYER_SETTINGS.COMMENT.NG.MAX_REGEX
          ) {
            this.tempNgRegex.push(regex);
            ngRegexInput.value = "";
            this.updateNGRegexList(true);
          }
        } catch (e) {
          window.logger.error("無効な正規表現です:", e);
          ngRegexInput.classList.add("error");
          setTimeout(() => {
            ngRegexInput.classList.remove("error");
          }, 2000);
        }
      });
    }

    // 適用ボタン
    const applyBtn = this.shadow.querySelector(
      "#apply-comment-settings",
    ) as HTMLButtonElement;
    if (applyBtn) {
      applyBtn.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        void this.applyCommentSettings();
      });
    }
  }

  /**
   * 初期アイコンの設定
   */
  private setupInitialIcons(): void {
    // 各ボタンにアイコンを設定
    const buttons = [
      { id: "#rewind-10", icon: PLAYER_ICONS.rewind10 },
      { id: "#forward-10", icon: PLAYER_ICONS.forward10 },
      { id: "#fullscreen", icon: PLAYER_ICONS.fullscreen },
      { id: "#settings", icon: PLAYER_ICONS.settings },
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
  private async initializeSettings(): Promise<void> {
    if (!this.video) return;

    // ビデオイベントの設定
    this.setupVideoEvents();

    // 保存済み設定の読み込み
    await this.loadCommentSettings();

    // コントロールモード設定
    const controlsMode =
      localStorage.getItem("controlsMode") ||
      PLAYER_SETTINGS.CONTROLS_MODE.HOVER;
    this.applyControlsMode(controlsMode);

    const controlsModeSelect = this.shadow.querySelector(
      "#controls-mode",
    ) as HTMLSelectElement;
    if (controlsModeSelect) {
      controlsModeSelect.value = controlsMode;
    }
  }

  /**
   * ビデオイベントの設定
   */
  private setupVideoEvents(): void {
    const video = this.getVideo();
    if (!video) return;

    // 再生状態変更時のボタン更新
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

    // 時間更新
    video.addEventListener("timeupdate", () => {
      this.updateProgress();
      this.updateTimeDisplay();
    });

    // メタデータ読み込み完了
    video.addEventListener("loadedmetadata", () => {
      this.updateDurationDisplay();
    });

    // 動画長取得失敗への対処（duration変更時にも再試行）
    video.addEventListener("durationchange", () => {
      this.updateDurationDisplay();
    });

    video.addEventListener("seeked", () => {
      this.resetCommentOverlayAfterSeek();
    });

    // 外部から音量が変更された場合にもUIを同期
    video.addEventListener("volumechange", () => {
      this.syncVolumeFromVideo();
    });

    // 即座に長さを確認（すでに読み込み済みの場合）
    if (video.duration && !isNaN(video.duration)) {
      this.updateDurationDisplay();
    }
  }

  /**
   * プログレス表示の更新
   */
  private updateProgress(): void {
    const video = this.getVideo();
    if (!video) return;

    const seekBar = this.shadow.querySelector("#seek-bar") as HTMLInputElement;
    const progressBar = this.shadow.querySelector(
      ".progress-bar-custom",
    ) as HTMLElement;

    if (!seekBar || !progressBar || isNaN(video.duration)) return;

    const progress = (video.currentTime / video.duration) * 100;
    progressBar.style.width = `${progress}%`;
    seekBar.value = String(progress);
    seekBar.style.setProperty("--progress", `${progress}%`);
  }

  /**
   * 現在時間表示の更新
   */
  private updateTimeDisplay(): void {
    const video = this.getVideo();
    if (!video) return;

    const currentTimeSpan = this.shadow.querySelector("#current-time");
    if (currentTimeSpan) {
      currentTimeSpan.textContent = this.formatTime(video.currentTime);
    }
  }

  private resetCommentOverlayAfterSeek(): void {
    if (!this.commentSystem) {
      return;
    }

    // comment-overlay 2.9.0+/3.0.0+ では自動リセット機能が組み込まれているため、
    // 手動でのhardReset呼び出しは不要
  }


  /**
   * 動画長表示の更新
   */
  private updateDurationDisplay(): void {
    const video = this.getVideo();
    if (!video) return;

    const durationSpan = this.shadow.querySelector("#duration");
    if (durationSpan) {
      durationSpan.textContent = this.formatTime(video.duration);
    }

    // シークバーの最大値を設定
    const seekBar = this.shadow.querySelector("#seek-bar") as HTMLInputElement;
    if (seekBar) {
      seekBar.max = "100";
    }
  }

  /**
   * 再生/一時停止ボタンの更新
   */
  private updatePlayPauseButton(): void {
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
  private updateVolumeIcon(): void {
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
  private formatTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    seconds = Math.floor(seconds % 60);
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  }

  /**
   * 設定メニューの表示/非表示切り替え
   */
  private toggleSettingsMenu(): void {
    this.isSettingsOpen = !this.isSettingsOpen;
    const settingsMenu = this.shadow.querySelector(
      "#player-settings-menu",
    ) as HTMLElement;

    if (settingsMenu) {
      if (this.isSettingsOpen) {
        this.resetTempSettingsFromCurrent();
        this.updateSettingsUI();
      }

      settingsMenu.classList.toggle("visible", this.isSettingsOpen);

      if (this.isSettingsOpen) {
        // 現在の全画面状態を確認して表示モードを設定
        const doc = document as ExtendedDocument;
        const isFullScreen =
          !!doc.fullscreenElement ||
          !!doc.mozFullScreenElement ||
          !!doc.webkitFullscreenElement ||
          !!doc.msFullscreenElement;
        this.updateSettingsMenuMode(isFullScreen);

        // 位置調整を次のフレームで実行（表示後にサイズが確定してから）
        requestAnimationFrame(() => {
          this.adjustSettingsMenuPosition(settingsMenu);
        });
      }
    }
  }

  private resetTempSettingsFromCurrent(): void {
    this.tempOpacity = this.commentOpacity;
    this.tempColor = this.commentColor;
    this.tempNgWords = [...this.ngWords];
    this.tempNgRegex = [...this.ngRegex];
  }

  /**
   * 設定メニューの位置を調整（画面からはみ出ないように）
   */
  private adjustSettingsMenuPosition(settingsMenu: HTMLElement): void {
    // 設定ボタンの位置を取得
    const settingsBtn = this.shadow.querySelector("#settings") as HTMLElement;
    if (!settingsBtn) return;

    const btnRect = settingsBtn.getBoundingClientRect();
    const viewportWidth = window.innerWidth;

    // プレイヤーコントロール内での相対位置を計算
    const controlsRect = this.shadow
      .querySelector(".player-controls")
      ?.getBoundingClientRect();
    if (!controlsRect) return;

    // 設定ボタンの右端を基準に配置
    const rightOffset = controlsRect.right - btnRect.right;

    // 初期位置をリセット
    settingsMenu.classList.remove("adjust-position");
    settingsMenu.style.left = "";
    settingsMenu.style.right = `${rightOffset}px`;

    // 再度位置を取得して調整
    const updatedRect = settingsMenu.getBoundingClientRect();

    // 右端からはみ出る場合
    if (updatedRect.right > viewportWidth - 10) {
      const overflowAmount = updatedRect.right - (viewportWidth - 10);
      settingsMenu.style.right = `${rightOffset + overflowAmount}px`;
    }

    // 左端からはみ出る場合
    const finalRect = settingsMenu.getBoundingClientRect();
    if (finalRect.left < 10) {
      settingsMenu.style.left = "10px";
      settingsMenu.style.right = "auto";
    }

    // 上端からはみ出る場合（設定メニューが画面上部を超える場合）
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
  private closeSettingsMenu(): void {
    if (this.isSettingsOpen) {
      this.isSettingsOpen = false;
      const settingsMenu = this.shadow.querySelector(
        "#player-settings-menu",
      ) as HTMLElement;

      if (settingsMenu) {
        settingsMenu.classList.remove("visible");
        // 位置調整をリセット
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
   * コントロールモード変更処理
   */
  private handleControlsModeChange = (e: Event): void => {
    const select = e.target as HTMLSelectElement;
    const mode = select.value;
    localStorage.setItem("controlsMode", mode);
    this.applyControlsMode(mode);
  };

  /**
   * コントロールモードを適用
   */
  private applyControlsMode(mode: string): void {
    if (mode === PLAYER_SETTINGS.CONTROLS_MODE.ALWAYS) {
      this.classList.add("always-visible");
      this.classList.add("controls-visible"); // 常に表示の場合は即座に表示
    } else {
      this.classList.remove("always-visible");
      // ホバーモードの場合は初期状態では非表示
      this.classList.remove("controls-visible");
    }
  }

  /**
   * コメント設定の読み込み
   */
  private async loadCommentSettings(): Promise<void> {
    try {
      // 設定を並行して読み込み
      const [opacity, color, words, regexList] = await Promise.all([
        IndexedDBUtils.getSettings(
          "commentOpacity",
          PLAYER_SETTINGS.COMMENT.OPACITY.DEFAULT,
        ),
        IndexedDBUtils.getSettings(
          "commentColor",
          PLAYER_SETTINGS.COMMENT.COLORS.WHITE,
        ),
        IndexedDBUtils.getSettings("ngWords", []),
        IndexedDBUtils.getSettings("ngRegex", []),
      ]);

      // 設定を適用
      this.commentOpacity = opacity;
      this.tempOpacity = opacity;
      this.commentColor = color;
      this.tempColor = color;
      this.ngWords = words;
      this.tempNgWords = [...words];
      this.ngRegex = regexList;
      this.tempNgRegex = [...regexList];

      // UI要素に反映
      this.updateSettingsUI();

      // コメントシステムに適用
      if (this.commentSystem) {
        this.commentSystem.setOpacity(this.commentOpacity);
        this.commentSystem.setDefaultColor(this.commentColor);
        this.commentSystem.setNGWords(this.ngWords);
        this.commentSystem.setNGRegex(this.ngRegex);
      }
    } catch (error) {
      window.logger.error("コメント設定の読み込みに失敗しました:", error);
    }
  }

  /**
   * 設定UIの更新
   */
  private updateSettingsUI(): void {
    // 透明度スライダー
    const opacitySlider = this.shadow.querySelector(
      "#comment-opacity",
    ) as HTMLInputElement;
    const opacityValue = this.shadow.querySelector(
      "#opacity-value",
    ) as HTMLElement;

    if (opacitySlider && opacityValue) {
      opacitySlider.value = String(this.tempOpacity);
      opacityValue.textContent = String(this.tempOpacity);
    }

    // 色選択
    const colorSelect = this.shadow.querySelector(
      "#comment-color",
    ) as HTMLSelectElement;
    if (colorSelect) {
      colorSelect.value = this.tempColor;
    }

    // NGリストの更新
    this.updateNGWordList(true);
    this.updateNGRegexList(true);
  }

  /**
   * NGワードリストの更新
   */
  private updateNGWordList(isTemp: boolean = false): void {
    const ngList = this.shadow.querySelector(
      "#ng-word-list",
    ) as HTMLUListElement;
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
          void this.removeNGWord(index);
        }
      });

      li.appendChild(removeBtn);
      ngList.appendChild(li);
    });
  }

  /**
   * NG正規表現リストの更新
   */
  private updateNGRegexList(isTemp: boolean = false): void {
    const ngList = this.shadow.querySelector(
      "#ng-regex-list",
    ) as HTMLUListElement;
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
          void this.removeNGRegex(index);
        }
      });

      li.appendChild(removeBtn);
      ngList.appendChild(li);
    });
  }

  /**
   * NGワードを削除
   */
  private async removeNGWord(index: number): Promise<void> {
    this.ngWords.splice(index, 1);

    await IndexedDBUtils.saveSettings("ngWords", this.ngWords);
    this.updateNGWordList();

    if (this.commentSystem) {
      this.commentSystem.setNGWords(this.ngWords);
    }
  }

  /**
   * NG正規表現を削除
   */
  private async removeNGRegex(index: number): Promise<void> {
    this.ngRegex.splice(index, 1);

    await IndexedDBUtils.saveSettings("ngRegex", this.ngRegex);
    this.updateNGRegexList();

    if (this.commentSystem) {
      this.commentSystem.setNGRegex(this.ngRegex);
    }
  }

  /**
   * コメント設定を適用
   */
  private async applyCommentSettings(): Promise<void> {
    try {
      // 設定を正式に適用
      this.commentOpacity = this.tempOpacity;
      this.commentColor = this.tempColor;
      this.ngWords = [...this.tempNgWords];
      this.ngRegex = [...this.tempNgRegex];

      // IndexedDBに保存
      await Promise.all([
        IndexedDBUtils.saveSettings("commentOpacity", this.commentOpacity),
        IndexedDBUtils.saveSettings("commentColor", this.commentColor),
        IndexedDBUtils.saveSettings("ngWords", this.ngWords),
        IndexedDBUtils.saveSettings("ngRegex", this.ngRegex),
      ]);

      // コメントシステムに適用
      if (this.commentSystem) {
        this.commentSystem.setOpacity(this.commentOpacity);
        this.commentSystem.setDefaultColor(this.commentColor);
        this.commentSystem.setNGWords(this.ngWords);
        this.commentSystem.setNGRegex(this.ngRegex);
      }

      // 適用成功のフィードバック
      this.showApplyFeedback();

      window.logger.info(
        `コメント設定を適用しました！ 透明度: ${this.commentOpacity}, 色: ${this.commentColor}, NGワード: ${this.ngWords.length}件, NG正規表現: ${this.ngRegex.length}件`,
      );
    } catch (error) {
      window.logger.error("コメント設定の適用に失敗しました:", error);
    }
  }

  /**
   * 設定適用のフィードバック表示
   */
  private showApplyFeedback(): void {
    const applyBtn = this.shadow.querySelector(
      "#apply-comment-settings",
    ) as HTMLButtonElement;
    if (!applyBtn) return;

    const originalText = applyBtn.textContent;
    applyBtn.textContent = "✓ 適用しました";
    applyBtn.classList.add("applied");

    setTimeout(() => {
      applyBtn.textContent = originalText;
      applyBtn.classList.remove("applied");
    }, 2000);
  }

  /**
   * 全画面表示の切り替え
   */
  private toggleFullscreen(): void {
    try {
      const doc = document as ExtendedDocument;

      if (
        !doc.fullscreenElement &&
        !doc.mozFullScreenElement &&
        !doc.webkitFullscreenElement &&
        !doc.msFullscreenElement
      ) {
        // プレイヤーコンテナを全画面表示
        const playerContainer = this.closest(
          ".custom-player",
        ) as ExtendedHTMLElement;

        if (playerContainer) {
          // デバッグ情報
          window.logger.info("全画面化を試行します:", {
            hasRequestFullscreen: !!playerContainer.requestFullscreen,
            hasMozRequestFullScreen: !!playerContainer.mozRequestFullScreen,
            hasWebkitRequestFullscreen:
              !!playerContainer.webkitRequestFullscreen,
            hasMsRequestFullscreen: !!playerContainer.msRequestFullscreen,
          });

          if (playerContainer.requestFullscreen) {
            playerContainer
              .requestFullscreen()
              .then(() => {
                window.logger.info("標準全画面API成功しました");
                // 成功時にクラスも追加（念のため）
                document.documentElement.classList.add("fullscreen-active");
                document.body.classList.add("nc-fullscreen-active");
                playerContainer.classList.add("nc-fullscreen-player");
              })
              .catch((err: Error) => {
                window.logger.error("標準全画面APIが失敗しました:", err);
                // フォールバック処理
                this.fallbackFullscreen(playerContainer);
              });
          } else if (playerContainer.mozRequestFullScreen) {
            playerContainer.mozRequestFullScreen();
            window.logger.info("Firefox全画面API使用しました");
          } else if (playerContainer.webkitRequestFullscreen) {
            playerContainer.webkitRequestFullscreen();
            window.logger.info("WebKit全画面API使用しました");
          } else if (playerContainer.msRequestFullscreen) {
            playerContainer.msRequestFullscreen();
            window.logger.info("IE全画面API使用しました");
          } else {
            // 全APIが使用不可の場合のフォールバック
            window.logger.warn(
              "全画面APIが利用できないため、フォールバックを使用します",
            );
            this.fallbackFullscreen(playerContainer);
          }
        }
      } else {
        // 全画面解除
        if (doc.exitFullscreen) {
          doc
            .exitFullscreen()
            .then(() => {
              window.logger.info("全画面解除成功しました");
              // クラスも削除
              document.documentElement.classList.remove("fullscreen-active");
              document.body.classList.remove("nc-fullscreen-active");
              const playerContainer = this.closest(".custom-player");
              if (playerContainer) {
                playerContainer.classList.remove("nc-fullscreen-player");
              }
            })
            .catch((err: Error) => {
              window.logger.error("全画面解除が失敗しました:", err);
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
      window.logger.error("全画面切り替えでエラーが発生しました:", error);
      // エラー時もフォールバックを試行
      const playerContainer = this.closest(
        ".custom-player",
      ) as ExtendedHTMLElement;
      if (playerContainer) {
        this.fallbackFullscreen(playerContainer);
      }
    }
  }

  /**
   * フォールバック全画面処理
   */
  private fallbackFullscreen(playerContainer: HTMLElement): void {
    window.logger.info("フォールバック全画面モードを使用します");

    // クラスベースの全画面モード
    document.documentElement.classList.add("fullscreen-active");
    document.body.classList.add("nc-fullscreen-active");
    playerContainer.classList.add("nc-fullscreen-player");

    // ESCキーでの終了をサポート
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        document.documentElement.classList.remove("fullscreen-active");
        document.body.classList.remove("nc-fullscreen-active");
        playerContainer.classList.remove("nc-fullscreen-player");
        document.removeEventListener("keydown", handleEscape);
        window.logger.info("フォールバック全画面モードを終了しました");
      }
    };

    document.addEventListener("keydown", handleEscape);
  }

  /**
   * 全画面状態変更時の処理
   */
  private handleFullscreenChange(): void {
    const doc = document as ExtendedDocument;
    const isFullScreen =
      !!doc.fullscreenElement ||
      !!doc.mozFullScreenElement ||
      !!doc.webkitFullscreenElement ||
      !!doc.msFullscreenElement;

    // フルスクリーンボタンのアイコンを更新
    const fullscreenBtn = this.shadow.querySelector("#fullscreen");
    if (fullscreenBtn) {
      fullscreenBtn.innerHTML = isFullScreen
        ? PLAYER_ICONS.exitFullscreen
        : PLAYER_ICONS.fullscreen;
    }

    // 全画面状態をホスト要素に反映
    this.classList.toggle("fullscreen-active", isFullScreen);

    // 設定メニューの表示モードを更新
    this.updateSettingsMenuMode(isFullScreen);
    
    // 全画面時のビデオ要素強制調整
    if (isFullScreen) {
      // 全画面時のスタイルはCSSで管理
    } else {
      // 全画面解除時はスタイルをリセット
      this.resetVideoStyles();
    }

    // 全画面切り替え時にコメントシステムのリサイズをトリガー
    if (this.commentSystem) {
      this.commentSystem.resize();
    }
  }

  /**
   * 設定メニューの表示モードを更新
   */
  private updateSettingsMenuMode(isFullScreen: boolean): void {
    const settingsMenu = this.shadow.querySelector(
      "#player-settings-menu",
    ) as HTMLElement;
    if (settingsMenu) {
      settingsMenu.classList.toggle("fullscreen-mode", isFullScreen);
      settingsMenu.classList.toggle("windowed-mode", !isFullScreen);
    }
  }

  /**
   * キーボードショートカットの処理
   */
  private handleKeyboardShortcuts = (e: KeyboardEvent): void => {
    // 入力欄での操作は無視
    if (
      e.target instanceof HTMLInputElement ||
      e.target instanceof HTMLTextAreaElement
    ) {
      return;
    }

    if (!this.video) return;

    switch (e.key.toLowerCase()) {
      case " ":
      case "k":
        e.preventDefault();
        if (this.video.paused) {
          this.video
            .play()
            .catch((err) =>
              window.logger.error("再生開始に失敗しました:", err),
            );
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
        this.video.currentTime = Math.min(
          this.video.currentTime + 5,
          this.video.duration || 0,
        );
        break;
      case "j":
        e.preventDefault();
        this.video.currentTime = Math.max(this.video.currentTime - 10, 0);
        break;
      case "l":
        e.preventDefault();
        this.video.currentTime = Math.min(
          this.video.currentTime + 10,
          this.video.duration || 0,
        );
        break;
    }
  };

  /**
   * 表示状態の制御
   */
  show(): void {
    this.classList.add("controls-visible");
  }

  hide(): void {
    this.classList.remove("controls-visible");
  }

  /**
   * プレイヤー再生（外部から呼ばれる）
   */
  playVideo(): void {
    if (this.userPaused || !this.video) {
      return;
    }

    this.video
      .play()
      .catch((err) => window.logger.error("自動再生に失敗しました:", err));
  }

  /**
   * コンポーネントの破棄
   */
  disconnectedCallback(): void {
    // キーボードイベントの削除
    document.removeEventListener("keydown", this.handleKeyboardShortcuts);

    // タイマーのクリア
    this.clearHideTimer();
    this.clearCursorTimer();

    // カーソルを必ず元に戻す
    this.showCursor();

    // 参照のクリア
    this.video = null;
    this.commentSystem = null;
  }

  private ensureInitialized(): void {
    if (this.initialized) return;

    // DOMの準備を確実に待つ
    if (!this.shadow || !this.shadow.firstElementChild) {
      window.logger.warn("シャドウDOMがまだ準備されていません");
      return;
    }

    this.setupEventListeners();
    this.setupInitialIcons();
    this.initialized = true;

    window.logger.info("PlayerControlsShadowの初期化が完了しました");
  }

  /**
   * ビデオ要素を取得（未設定ならDOMから自動検出）
   */
  private getVideo(): HTMLVideoElement | null {
    if (this.video) return this.video;
    const v = document.getElementById(
      "video-element",
    ) as HTMLVideoElement | null;
    if (v) {
      this.video = v;
    }
    return this.video;
  }

  /**
   * マウスホバーイベントの設定
   */
  private setupHoverEvents(): void {
    // プレイヤーコンテナ全体でのマウスイベント
    const playerContainer =
      this.closest(".custom-player") ?? this.parentElement;

    if (playerContainer) {
      // マウスが入った時
      playerContainer.addEventListener("mouseenter", () => {
        this.showControls();
        this.showCursor();
        this.hideCursorWithDelay();
      });

      // マウスが出た時（プレイヤー外へ）
      playerContainer.addEventListener("mouseleave", () => {
        this.hideControlsWithDelay();
        this.showCursor();
        this.clearCursorTimer();
      });

      // マウスが動いた時（コントロール上でも）
      playerContainer.addEventListener("mousemove", () => {
        this.showControls();
        this.hideControlsWithDelay();
        this.showCursor();
        this.hideCursorWithDelay();
      });
    }

    // コントロール自体でのマウスイベント
    this.addEventListener("mouseenter", () => {
      this.showControls();
      this.clearHideTimer();
      this.showCursor();
      this.clearCursorTimer();
    });

    this.addEventListener("mouseleave", () => {
      this.hideControlsWithDelay();
      this.hideCursorWithDelay();
    });
  }

  /**
   * コントロールを表示
   */
  private showControls(): void {
    this.classList.add("controls-visible");
    this.clearHideTimer();
  }

  /**
   * コントロールを遅延して非表示
   */
  private hideControlsWithDelay(): void {
    // 常に表示モードの場合は非表示にしない
    if (this.classList.contains("always-visible")) {
      return;
    }

    this.clearHideTimer();
    this.mouseTimer = window.setTimeout(() => {
      this.classList.remove("controls-visible");
    }, 3000); // 3秒後に非表示
  }

  /**
   * 非表示タイマーをクリア
   */
  private clearHideTimer(): void {
    if (this.mouseTimer !== null) {
      clearTimeout(this.mouseTimer);
      this.mouseTimer = null;
    }
  }

  /**
   * マウスカーソルを表示する
   */
  private showCursor(): void {
    const container = this.closest(".custom-player") ?? this.parentElement;
    if (container instanceof HTMLElement) {
      container.classList.remove("cursor-hidden");
    }
  }

  /**
   * マウスカーソルを遅延して非表示にする（3秒後）
   */
  private hideCursorWithDelay(): void {
    this.clearCursorTimer();
    this.cursorTimer = window.setTimeout(() => {
      const container = this.closest(".custom-player") ?? this.parentElement;
      if (container instanceof HTMLElement) {
        container.classList.add("cursor-hidden");
      }
    }, 3000);
  }

  /**
   * カーソル非表示タイマーをクリア
   */
  private clearCursorTimer(): void {
    if (this.cursorTimer !== null) {
      clearTimeout(this.cursorTimer);
      this.cursorTimer = null;
    }
  }

  /**
   * ビデオスタイルのリセット（全画面解除時）
   */
  private resetVideoStyles(): void {
    const video = this.getVideo();
    if (!video) return;

    try {
      window.logger.info("ビデオ要素のスタイルをリセットします");

      // 強制スタイルをクリア
      video.style.position = "";
      video.style.top = "";
      video.style.left = "";
      video.style.transform = "";
      video.style.zIndex = "";
      video.style.backgroundColor = "";
      video.style.width = "";
      video.style.height = "";

      window.logger.info("ビデオスタイルリセット完了しました");
    } catch (error) {
      window.logger.error(
        "ビデオスタイルリセットでエラーが発生しました:",
        error,
      );
    }
  }
}

// カスタムエレメントとして登録
if (!customElements.get("player-controls-shadow")) {
  customElements.define("player-controls-shadow", PlayerControlsShadow);
  window.logger.info(
    "player-controls-shadowカスタムエレメントを登録しました！",
  );
} else {
  window.logger.info(
    "player-controls-shadowカスタムエレメントは既に登録済みです",
  );
}
