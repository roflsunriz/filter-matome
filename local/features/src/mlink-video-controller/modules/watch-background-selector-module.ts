import {
  ModuleInstance,
  ModuleConfig,
  ModuleStatus,
} from "@/types/module-types";
import { BackgroundImageSettings } from "@/mlink-video-controller/modules/background-image-settings";
import { BackgroundImageItem } from "@/types/background-image-types";
import { createMaterialIcon } from "@/common/material-icons";
import { isWatchLikePage } from "@/mlink-video-controller/utils/page-detect";

/**
 * 背景セレクターモジュール
 * ラジアル背景選択UIを提供する独立モジュール（Shadow DOM対応）
 */
export class WatchBackgroundSelectorModule implements ModuleInstance {
  public readonly config: ModuleConfig;

  private shadowHost: HTMLElement | null = null;
  private shadowRoot: ShadowRoot | null = null;
  private backgroundHost: HTMLElement | null = null;
  private backgroundRoot: ShadowRoot | null = null;
  private radialContainer: HTMLElement | null = null;
  private settingsContainer: HTMLElement | null = null;
  private backgroundOverlay: HTMLElement | null = null;
  private backgroundSettings: BackgroundImageSettings;
  private _isActive: boolean = false;
  private eventListeners: { type: string; listener: EventListener }[] = [];

  constructor(config: ModuleConfig) {
    this.config = config;
    this.backgroundSettings = BackgroundImageSettings.getInstance();
  }

  /**
   * モジュール初期化（最速化版）
   */
  async initialize(): Promise<void> {
    if (this._isActive) {
      await Promise.resolve();
      return;
    }

    try {
      // Watch Pageかどうかチェック
      if (!this.isWatchPage()) {
        return;
      }

      // 【最優先】グローバル背景スタイルを即座に注入
      this.injectGlobalBackgroundCSS();

      // 背景描画用のShadow DOMホストを確実に用意
      this.ensureShadowInfrastructure();

      // 【最優先】背景画像設定を初期化（軽量化版）
      await this.backgroundSettings.initializeSettings();

      // 【最優先】保存された背景を即座に復元
      const selectedImage = await this.backgroundSettings.getSelectedImage();
      if (selectedImage) {
        // 同期的に背景を即座に適用
        this.applyBackgroundImmediate(selectedImage);
      }

      // 以下の処理を並列実行（視覚的な変更には影響しない）
      const uiInitPromises = [
        this.initializeBackgroundSettingsEvents(),
        this.initializeShadowDOMAndUI(),
      ];

      // UI初期化を並列実行（背景表示には影響しない）
      await Promise.all(uiInitPromises);

      this._isActive = true;
    } catch (error) {
      window.logger.error(
        "[WatchBackgroundSelectorModule] 初期化エラー:",
        error,
      );
      throw error;
    }
  }

  /**
   * モジュール破棄
   */
  destroy(): void {
    if (!this._isActive) return;

    // Shadow Host全体を削除（Shadow Root内の全てが削除される）
    if (this.shadowHost) {
      this.shadowHost.remove();
      this.shadowHost = null;
      this.shadowRoot = null;
      this.radialContainer = null;
      this.settingsContainer = null;
    }

    if (this.backgroundHost) {
      this.backgroundHost.remove();
      this.backgroundHost = null;
      this.backgroundRoot = null;
    }

    this.backgroundOverlay = null;

    // グローバル背景スタイルを削除
    const globalStyleElement = document.getElementById(
      "watch-background-global-styles",
    );
    if (globalStyleElement) {
      globalStyleElement.remove();
    }

    // 背景をリセット
    document.documentElement.style.removeProperty("--bg-img");

    // BackgroundImageSettingsのデータベース接続を閉じる
    this.backgroundSettings.closeDB();

    // イベントリスナーを削除
    this.eventListeners.forEach(({ type, listener }) => {
      this.backgroundSettings.removeEventListener(type, listener);
    });
    this.eventListeners = [];

    this._isActive = false;
  }

  /**
   * モジュール状態確認
   */
  isActive(): boolean {
    return this._isActive && !!this.shadowRoot && !!this.radialContainer;
  }

  /**
   * モジュール状態取得
   */
  getStatus(): ModuleStatus {
    if (!this.isWatchPage()) {
      return ModuleStatus.INACTIVE;
    }

    return this._isActive ? ModuleStatus.ACTIVE : ModuleStatus.INACTIVE;
  }

  /**
   * Watch Pageかどうかの判定
   */
  private isWatchPage(): boolean {
    return isWatchLikePage();
  }

  /**
   * Shadow DOM作成
   */
  private createShadowDOM(): void {
    if (!this.backgroundHost || !this.backgroundRoot) {
      this.backgroundHost = document.createElement("div");
      this.backgroundHost.id =
        "watch-background-selector-background-shadow-host";
      this.backgroundHost.style.cssText =
        "position: fixed; inset: 0; width: 100%; height: 100%; pointer-events: none; z-index: -1;";
      this.backgroundRoot = this.backgroundHost.attachShadow({
        mode: "closed",
      });
      document.body.appendChild(this.backgroundHost);
    }

    if (!this.shadowHost || !this.shadowRoot) {
      this.shadowHost = document.createElement("div");
      this.shadowHost.id = "watch-background-selector-shadow-host";
      this.shadowHost.style.cssText =
        "position: fixed; right: 0; top: 50%; width: 20px; height: 0; transform: translateY(-50%); pointer-events: auto; z-index: 1000; overflow: visible;";
      this.shadowRoot = this.shadowHost.attachShadow({ mode: "closed" });
      document.body.appendChild(this.shadowHost);
    }
  }
  /**
   * CSSを注入（背景ホスト/UIホスト用）
   */
  private injectCSS(): void {
    this.injectBackgroundCSS();
    this.injectUICSS();
  }

  private injectBackgroundCSS(): void {
    if (!this.backgroundRoot) return;

    let style = this.backgroundRoot.getElementById(
      "watch-background-selector-background-style",
    ) as HTMLStyleElement | null;
    if (!style) {
      style = document.createElement("style");
      style.id = "watch-background-selector-background-style";
      this.backgroundRoot.appendChild(style);
    }

    style.textContent = `
      @charset "utf-8";

      :host {
        position: fixed;
        inset: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        display: block;
      }

      #bg-overlay {
        position: fixed;
        inset: 0;
        width: 100vw;
        height: 100vh;
        pointer-events: none;
        background-attachment: var(--bg-att, fixed);
        background-blend-mode: var(--bg-bl-m, normal);
        background-clip: var(--bg-cl, initial);
        background-color: var(--bg-col, black);
        background-image: var(--bg-img, initial);
        background-origin: var(--bg-org, initial);
        background-position: var(--bg-pos, center);
        background-repeat: var(--bg-rep, no-repeat);
        background-size: var(--bg-siz, cover);
        transition: background-image 0.3s ease-in-out;
        z-index: 0;
      }
    `;
  }

  private injectUICSS(): void {
    if (!this.shadowRoot) return;

    let style = this.shadowRoot.getElementById(
      "watch-background-selector-style",
    ) as HTMLStyleElement | null;
    if (!style) {
      style = document.createElement("style");
      style.id = "watch-background-selector-style";
      this.shadowRoot.appendChild(style);
    }

    style.textContent = `
      @charset "utf-8";

      /*-------------------------
       * Shadow DOM内の背景セレクタースタイル
       *-------------------------*/
      
      /* ホスト要素 */
      :host {
        position: fixed;
        right: 0;
        top: 50%;
        pointer-events: auto;
        z-index: 1000;
        overflow: visible;
        display: block;
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
      
      /* メイン内容 */
      #bg-main-content {
        flex: 1;
        height: 100%;
        background: transparent;
        border-radius: 0 16px 16px 0;
        position: relative;
        overflow: hidden;
      }
      
      /* open状態（hoverでもclassでも開く） */
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
  }

  /**
   * 背景描画用レイヤーを作成
   */
  private ensureBackgroundOverlay(): void {
    if (!this.backgroundRoot) return;

    if (
      this.backgroundOverlay &&
      this.backgroundRoot.contains(this.backgroundOverlay)
    ) {
      return;
    }

    let overlay: HTMLElement | null =
      this.backgroundRoot.getElementById("bg-overlay");
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.id = "bg-overlay";
      this.backgroundRoot.prepend(overlay);
    }

    this.backgroundOverlay = overlay;
  }

  /**
   * Shadow DOM関連の初期化をまとめて実行
   */
  private ensureShadowInfrastructure(): void {
    this.createShadowDOM();
    this.injectCSS();
    this.ensureBackgroundOverlay();
  }

  /**
   * ラジアルセレクター作成（Shadow Root内）
   */
  private async createRadialSelector(): Promise<void> {
    this.ensureShadowInfrastructure();
    if (!this.shadowRoot) return;

    // 既存のセレクターを削除
    const existing = this.shadowRoot.getElementById("bg-radial-container");
    if (existing) {
      existing.remove();
    }

    // 設定から背景画像を取得
    const backgroundImages = await this.backgroundSettings.getAllImages();

    if (backgroundImages.length === 0) {
      window.logger.warn(
        "[WatchBackgroundSelectorModule] 背景画像が設定されていません",
      );
      return;
    }

    // ラジアルメニューのサイズを動的計算
    const itemCount = backgroundImages.length;
    const itemSize = 60; // 各アイテムのサイズ
    const handleWidth = 20; // 取っ手の幅

    // 必要な半径を計算（アイテムが重ならないように）
    const minRadius = Math.max(80, (itemSize * itemCount) / (2 * Math.PI) + 40);
    const radius = Math.min(minRadius, 150); // 最大半径を150に制限

    // コンテナのサイズを計算
    const wheelDiameter = (radius + itemSize) * 2;
    const containerWidth = wheelDiameter + handleWidth;
    const containerHeight = wheelDiameter;

    // メインコンテナ作成
    const container = document.createElement("div");
    container.id = "bg-radial-container";
    container.style.width = `${containerWidth}px`;
    container.style.height = `${containerHeight}px`;
    container.style.setProperty("--hide-offset", `${wheelDiameter}px`);

    this.configureInteractiveHost(handleWidth, containerHeight, containerWidth);

    // 取っ手要素作成
    const handle = document.createElement("div");
    handle.id = "bg-handle";
    handle.innerHTML =
      '<div style="width: 2px; height: 20px; background: rgba(255,255,255,0.5); border-radius: 1px;"></div>';

    // メインコンテンツ要素作成
    const mainContent = document.createElement("div");
    mainContent.id = "bg-main-content";
    mainContent.style.width = `${wheelDiameter}px`;
    mainContent.style.height = `${containerHeight}px`;

    // ホイール作成
    const wheel = document.createElement("div");
    wheel.id = "bg-wheel";
    wheel.style.width = `${wheelDiameter}px`;
    wheel.style.height = `${wheelDiameter}px`;

    const angleStep = 360 / itemCount;
    const wheelCenter = wheelDiameter / 2; // ホイールの中心座標

    backgroundImages.forEach((imageItem, index) => {
      const item = document.createElement("div");
      item.className = "bg-preview-item";

      // 画像データの設定
      if (imageItem.type === "url") {
        item.style.backgroundImage = imageItem.data;
      } else if (imageItem.type === "file") {
        item.style.backgroundImage = `url(${imageItem.data})`;
      }

      const angle = angleStep * index;
      const x = radius * Math.cos((angle - 90) * (Math.PI / 180));
      const y = radius * Math.sin((angle - 90) * (Math.PI / 180));

      // ホイールの中心を基準に配置
      item.style.left = `${wheelCenter + x - 30}px`;
      item.style.top = `${wheelCenter + y - 30}px`;
      item.style.transform = "rotate(0deg)";
      item.style.setProperty("--rotation", "0deg");

      // ツールチップ追加
      item.title = imageItem.name;

      item.onclick = (e) => {
        e.stopPropagation();
        void this.changeBackground(imageItem);
      };

      wheel.appendChild(item);
    });

    // 要素を組み立て
    mainContent.appendChild(wheel);
    container.appendChild(handle);
    container.appendChild(mainContent);

    this.shadowRoot.appendChild(container);
    this.radialContainer = container;

    this.setupWheelControls(wheel);

    // ホバーリスナーを設定
    this.attachHoverListeners();

    // 既に背景が適用されていない場合のみ復元（重複を避ける）
    const currentBg =
      document.documentElement.style.getPropertyValue("--bg-img");
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
   * 右端の取っ手だけを通常時のイベント領域にし、展開中だけ全幅を操作可能にする
   */
  private configureInteractiveHost(
    collapsedWidth: number,
    height: number,
    expandedWidth: number,
  ): void {
    if (!this.shadowHost) return;

    this.shadowHost.style.right = "0";
    this.shadowHost.style.top = "50%";
    this.shadowHost.style.width = `${collapsedWidth}px`;
    this.shadowHost.style.height = `${height}px`;
    this.shadowHost.style.transform = "translateY(-50%)";
    this.shadowHost.style.pointerEvents = "auto";
    this.shadowHost.style.overflow = "visible";
    this.shadowHost.dataset.collapsedWidth = `${collapsedWidth}`;
    this.shadowHost.dataset.expandedWidth = `${expandedWidth}`;
  }

  /**
   * ホバーリスナー設定
   */
  private attachHoverListeners(): void {
    if (!this.radialContainer) return;
    const rc = this.radialContainer;

    rc.addEventListener("mouseenter", () => {
      if (this.shadowHost) {
        const expandedWidth = this.shadowHost.dataset.expandedWidth;
        if (expandedWidth) {
          this.shadowHost.style.width = `${expandedWidth}px`;
        }
      }
      rc.classList.add("open");
    });

    rc.addEventListener("mouseleave", () => {
      setTimeout(() => {
        rc.classList.remove("open");
        if (this.shadowHost) {
          const collapsedWidth = this.shadowHost.dataset.collapsedWidth;
          if (collapsedWidth) {
            this.shadowHost.style.width = `${collapsedWidth}px`;
          }
        }
      }, 100);
    });
  }

  /**
   * 背景画像の実際の反映を統一管理
   */
  private updateBackgroundImage(backgroundValue: string): void {
    this.ensureShadowInfrastructure();
    document.documentElement.style.setProperty("--bg-img", backgroundValue);
    if (this.backgroundOverlay) {
      this.backgroundOverlay.style.removeProperty("background-image");
    }
  }

  /**
   * ホイールコントロール設定
   */
  private setupWheelControls(wheel: HTMLDivElement): void {
    let currentRotation = 0;
    let isDragging = false;
    let startAngle = 0;

    // ホイール回転
    wheel.addEventListener("wheel", (e) => {
      e.preventDefault();
      currentRotation += e.deltaY * 0.5;
      this.updateWheelRotation(wheel, currentRotation);
    });

    // ドラッグ機能
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
  private updateWheelRotation(wheel: HTMLDivElement, rotation: number): void {
    wheel.style.transform = `rotate(${rotation}deg)`;

    const items = wheel.getElementsByClassName("bg-preview-item");
    for (const item of Array.from(items)) {
      (item as HTMLElement).style.transform = `rotate(${-rotation}deg)`;
      (item as HTMLElement).style.setProperty("--rotation", `${-rotation}deg`);
    }
  }

  /**
   * 背景変更（最速化版）
   */
  private async changeBackground(
    imageItem: BackgroundImageItem,
  ): Promise<void> {
    await Promise.resolve();
    let backgroundValue: string;

    if (imageItem.type === "url") {
      backgroundValue = imageItem.data;
    } else if (imageItem.type === "file") {
      backgroundValue = `url(${imageItem.data})`;
    } else {
      window.logger.error(
        "[WatchBackgroundSelectorModule] 不明な画像タイプ:",
        imageItem.type,
      );
      return;
    }

    // 【最優先】Shadow DOM背景へ即座に反映
    this.updateBackgroundImage(backgroundValue);

    // データベース更新は非同期で後から実行（視覚的変更を妨げない）
    this.backgroundSettings
      .setSelectedImage(imageItem.id, false)
      .catch((error) => {
        window.logger.error(
          "[WatchBackgroundSelectorModule] 背景選択の保存に失敗:",
          error,
        );
      });
  }

  /**
   * グローバル背景スタイルを注入（bodyへの適用用）
   */
  private injectGlobalBackgroundCSS(): void {
    // 既存のスタイルがあるかチェック
    const existingStyle = document.getElementById(
      "watch-background-global-styles",
    );
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
        --bg-rep: no-repeat;
        /*cover, contain, width, width height, multiple images*/
        --bg-siz: cover;
      }
    `;

    document.head.appendChild(style);
  }

  /**
   * 背景を即座に適用（同期的）
   */
  private applyBackgroundImmediate(imageItem: BackgroundImageItem): void {
    let backgroundValue: string;

    if (imageItem.type === "url") {
      backgroundValue = imageItem.data;
    } else if (imageItem.type === "file") {
      backgroundValue = `url(${imageItem.data})`;
    } else {
      window.logger.error(
        "[WatchBackgroundSelectorModule] 不明な画像タイプ:",
        imageItem.type,
      );
      return;
    }

    // Shadow DOM背景へ即座に反映（非同期処理なし）
    this.updateBackgroundImage(backgroundValue);
  }

  /**
   * 背景設定イベントリスナーの初期化（分離）
   */
  private async initializeBackgroundSettingsEvents(): Promise<void> {
    await Promise.resolve();
    this.setupBackgroundSettingsEventListeners();
  }

  /**
   * Shadow DOMとUI要素の初期化（分離）
   */
  private async initializeShadowDOMAndUI(): Promise<void> {
    // Shadow DOMと背景レイヤーを確実に用意
    this.ensureShadowInfrastructure();

    // ラジアルセレクター作成（Shadow Root内）
    await this.createRadialSelector();
  }

  /**
   * 画像リストを更新
   */
  private async refreshImageList(): Promise<void> {
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

      // イベントリスナーを追加
      this.setupImageListEventListeners();
    } catch (error) {
      window.logger.error(
        "[WatchBackgroundSelectorModule] 画像リストの更新に失敗:",
        error,
      );
    }
  }

  /**
   * 画像リストのイベントリスナーを設定
   */
  private setupImageListEventListeners(): void {
    if (!this.shadowRoot) return;

    // 選択ボタン
    const selectButtons = this.shadowRoot.querySelectorAll(".select-btn");
    selectButtons.forEach((button) => {
      button.addEventListener("click", (e) => {
        void (async () => {
          const target = e.target as HTMLElement;
          const imageId = target.getAttribute("data-id");
          if (imageId) {
            await this.selectImage(imageId);
          }
        })();
      });
    });

    // 削除ボタン
    const deleteButtons = this.shadowRoot.querySelectorAll(".delete-btn");
    deleteButtons.forEach((button) => {
      button.addEventListener("click", (e) => {
        void (async () => {
          const target = e.target as HTMLElement;
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
  private async selectImage(imageId: string): Promise<void> {
    try {
      const image = await this.backgroundSettings.getImage(imageId);
      if (image) {
        await this.changeBackground(image);
        await this.refreshImageList();
      }
    } catch (error) {
      window.logger.error(
        "[WatchBackgroundSelectorModule] 画像の選択に失敗:",
        error,
      );
    }
  }

  /**
   * 画像を削除
   */
  private async deleteImage(imageId: string): Promise<void> {
    try {
      const image = await this.backgroundSettings.getImage(imageId);
      if (!image) return;

      const confirmed = confirm(`画像「${image.name}」を削除しますか？`);
      if (!confirmed) return;

      await this.backgroundSettings.deleteImage(imageId);

      // ラジアルセレクターを更新
      await this.createRadialSelector();

      // 画像リストを更新
      await this.refreshImageList();
    } catch (error) {
      window.logger.error(
        "[WatchBackgroundSelectorModule] 画像の削除に失敗:",
        error,
      );
      alert("画像の削除に失敗しました");
    }
  }

  /**
   * 背景画像設定のイベントリスナーを設定
   */
  private setupBackgroundSettingsEventListeners(): void {
    // 画像追加イベント

    const imageAddedListener = (_: Event) => {
      void this.createRadialSelector();
    };
    this.backgroundSettings.addEventListener("imageAdded", imageAddedListener);
    this.eventListeners.push({
      type: "imageAdded",
      listener: imageAddedListener,
    });

    // 画像削除イベント

    const imageDeletedListener = (_: Event) => {
      void this.createRadialSelector();
    };
    this.backgroundSettings.addEventListener(
      "imageDeleted",
      imageDeletedListener,
    );
    this.eventListeners.push({
      type: "imageDeleted",
      listener: imageDeletedListener,
    });

    // 画像選択イベント
    const imageSelectedListener = (event: Event) => {
      void (async () => {
        const customEvent = event as CustomEvent<{ id: string }>;
        const imageId = customEvent.detail?.id;
        if (!imageId) {
          return;
        }
        const image = await this.backgroundSettings.getImage(imageId);
        if (image) {
          let backgroundValue: string;
          if (image.type === "url") {
            backgroundValue = image.data;
          } else if (image.type === "file") {
            backgroundValue = `url(${image.data})`;
          } else {
            return;
          }
          this.updateBackgroundImage(backgroundValue);
        }
      })();
    };
    this.backgroundSettings.addEventListener(
      "imageSelected",
      imageSelectedListener,
    );
    this.eventListeners.push({
      type: "imageSelected",
      listener: imageSelectedListener,
    });

    // 設定インポートイベント

    const settingsImportedListener = (_: Event) => {
      void this.createRadialSelector();
    };
    this.backgroundSettings.addEventListener(
      "settingsImported",
      settingsImportedListener,
    );
    this.eventListeners.push({
      type: "settingsImported",
      listener: settingsImportedListener,
    });

    // 設定リセットイベント

    const settingsResetListener = (_: Event) => {
      void this.createRadialSelector();
    };
    this.backgroundSettings.addEventListener(
      "settingsReset",
      settingsResetListener,
    );
    this.eventListeners.push({
      type: "settingsReset",
      listener: settingsResetListener,
    });
  }
}
