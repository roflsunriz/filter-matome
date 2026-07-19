import { materialIconsStyles } from "@/common/material-icons";
import { PLAYER_SETTINGS } from "@/video-player/config/constants";
import { PLAYER_ICONS } from "@/video-player/config/icons";
import { CommentSystem } from "@/video-player/core/comment-system";
import { getSavedControlsMode } from "@/video-player/ui/player-control-storage";

export abstract class PlayerControlsView extends HTMLElement {
  /**
   * イベントリスナーを設定
   */
  protected abstract setupEventListeners(): void;
  /**
   * 初期アイコンの設定
   */
  protected abstract setupInitialIcons(): void;
  /**
   * コントロールモードを適用
   */
  protected abstract applyControlsMode(mode: string): void;
  protected abstract ensureInitialized(): void;
  /**
   * 初期音量の適用
   */
  protected abstract initializeVolumeState(): void;
  /**
   * ビデオイベントの設定
   */
  protected abstract setupVideoEvents(): void;
  /**
   * 初期設定の読み込み
   */
  protected abstract initializeSettings(): Promise<void>;
  protected shadow: ShadowRoot;
  protected video: HTMLVideoElement | null = null;
  protected mouseTimer: number | null = null;
  protected cursorTimer: number | null = null;
  protected commentSystem: CommentSystem | null = null;
  protected userPaused = false;
  protected isSettingsOpen = false;
  protected isVolumeDragging = false;
  protected volumeSaveTimer: number | null = null;
  protected lastMutedIconState: boolean | null = null;
  protected companionPanelActive = false;

  // コメント設定関連
  protected commentOpacity: number = PLAYER_SETTINGS.COMMENT.OPACITY.DEFAULT;
  protected commentColor: string = PLAYER_SETTINGS.COMMENT.COLORS.WHITE;
  protected ngWords: string[] = [];
  protected ngRegex: string[] = [];

  // 一時的な設定保存用
  protected tempOpacity: number = PLAYER_SETTINGS.COMMENT.OPACITY.DEFAULT;
  protected tempColor: string = PLAYER_SETTINGS.COMMENT.COLORS.WHITE;
  protected tempNgWords: string[] = [];
  protected tempNgRegex: string[] = [];

  protected initialized = false;

  constructor() {
    super();

    // シャドウDOMを作成
    this.shadow = this.attachShadow({ mode: "open" });
    this.shadow.innerHTML = this.getTemplate();

    // 非同期で初期化（DOMReadyを待つ）
    void this.initializeComponent();
  }

  /**
   * コンポーネントの非同期初期化
   */
  protected async initializeComponent(): Promise<void> {
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
    const savedControlsMode = getSavedControlsMode(
      PLAYER_SETTINGS.CONTROLS_MODE.HOVER,
    );
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
  protected getTemplate(): string {
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
  protected getSettingsMenuTemplate(): string {
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
  protected getStyles(): string {
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
        bottom: var(--fullscreen-comment-form-height, 82px) !important;
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
        height: 16px;
        -webkit-appearance: none;
        background: transparent;
        cursor: pointer;
        border-radius: 2px;
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
        height: 4px;
        background: linear-gradient(to right, #007bff var(--volume), rgba(255, 255, 255, 0.3) var(--volume));
        border-radius: 2px;
      }

      #volume::-moz-range-track {
        height: 4px;
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
}
