import { ModuleManager } from "@/mlink-video-controller/module-handlers/module-manager";
import { ModuleRegistry } from "@/mlink-video-controller/module-handlers/module-registry";
import { SettingsManager } from "@/mlink-video-controller/module-handlers/settings-manager";
import {
  ModuleConfig,
  ModuleCategory,
  ModuleStatus,
  PageType,
} from "@/types/module-types";
import { BackgroundImageSettings } from "@/mlink-video-controller/modules/background-image-settings";
// import { ToastrInstance } from '@/types/toastr-types';
import { createMaterialIcon } from "@/common/material-icons";
import { BackgroundImageItem } from "@/types/background-image-types";
import type { HeatmapModule } from "@/mlink-video-controller/modules/heatmap-module";
import type {
  HeaderModule,
  HeaderPrivacySettings,
} from "@/mlink-video-controller/modules/header-module";
import type {
  HeatmapColorScheme,
  HeatmapDisplayMode,
} from "@/mlink-video-controller/managers/heatmap";

const DEFAULT_BACKGROUND_IMAGE_URL_PREFIX =
  "https://www.nicovideo.jp/local/background-images/";

const HEATMAP_STORAGE_KEYS = {
  DISPLAY_MODE: "heatmapDisplayMode",
  COLOR_SCHEME: "heatmapColorScheme",
  SMOOTHING: "heatmapSmoothing",
} as const;

const HEATMAP_DISPLAY_MODES: HeatmapDisplayMode[] = ["off", "fab", "overlay"];
const HEATMAP_COLOR_SCHEMES: HeatmapColorScheme[] = [
  "default",
  "rainbow",
  "fire",
  "cool",
];
const HEADER_PRIVACY_STORAGE_KEY = "headerPrivacySettings";

/**
 * 設定UIを管理するクラス
 */
export class SettingsUI {
  private static instance: SettingsUI;
  private moduleManager: ModuleManager;
  private moduleRegistry: ModuleRegistry;
  private settingsManager: SettingsManager;
  private backgroundSettings: BackgroundImageSettings;
  private isInitialized: boolean = false;
  private shadowRoot: ShadowRoot | null = null;
  private moduleEventListenerAttached: boolean = false;
  private eventListenerRoots: WeakSet<ShadowRoot> = new WeakSet();

  private constructor() {
    this.moduleManager = ModuleManager.getInstance();
    this.moduleRegistry = ModuleRegistry.getInstance();
    this.settingsManager = SettingsManager.getInstance();
    this.backgroundSettings = BackgroundImageSettings.getInstance();
  }

  public static getInstance(): SettingsUI {
    if (!SettingsUI.instance) {
      SettingsUI.instance = new SettingsUI();
    }
    return SettingsUI.instance;
  }

  /**
   * 🆕 Shadow DOMルートを設定
   */
  public setShadowRoot(shadowRoot: ShadowRoot): void {
    this.shadowRoot = shadowRoot;
  }

  /**
   * 初期化ステータスを取得
   */
  public getInitializationStatus(): boolean {
    return this.isInitialized;
  }

  /**
   * 設定UIを初期化
   */
  public initialize(): void {
    // Shadow DOMが設定されていない場合は警告
    if (!this.shadowRoot) {
      window.logger.warn(
        "[SettingsUI] Shadow DOMが設定されていません。setShadowRoot()を先に呼び出してください。",
      );
      return;
    }

    // モジュール一覧を生成
    this.renderModuleList();

    // イベントリスナーを設定
    this.setupEventListeners();
    this.setupActionButtons();

    // 🔧 修正: ModuleManager のイベントを監視してUI更新
    if (!this.moduleEventListenerAttached) {
      this.moduleManager.addEventListener((event) => {
        // モジュールの読み込み/アンロード時にUIを更新
        if (event.type === "loaded" || event.type === "unloaded") {
          this.updateModuleStatus(event.moduleId);
        }

        // 🆕 排他グループ対応: enabled/disabled イベント時にトグルスイッチを同期
        if (event.type === "enabled" || event.type === "disabled") {
          this.syncModuleToggle(event.moduleId, event.type === "enabled");
          this.updateModuleStatus(event.moduleId);
        }
      });
      this.moduleEventListenerAttached = true;
    }

    this.isInitialized = true;
  }

  /**
   * モジュール一覧をレンダリング
   */
  public renderModuleList(): void {
    if (!this.shadowRoot) {
      window.logger.error("[SettingsUI] Shadow DOMが設定されていません");
      return;
    }

    const categories = Object.values(ModuleCategory);

    categories.forEach((category) => {
      const modules = this.moduleRegistry.getModulesByCategory(category);
      const container = this.shadowRoot!.getElementById(`${category}-modules`);

      if (container) {
        container.innerHTML = "";
        modules.forEach((config) => {
          const moduleElement = this.createModuleElement(config);
          container.appendChild(moduleElement);
        });

        // ビジュアルカテゴリに背景画像設定ボタンを追加
        if (category === ModuleCategory.VISUAL) {
          this.addBackgroundImageSettingsButton(container);
        }
      } else {
        window.logger.warn(
          `[SettingsUI] カテゴリ ${category} のコンテナが見つかりません`,
        );
      }
    });
  }

  /**
   * モジュール要素を作成
   */
  private createModuleElement(config: ModuleConfig): HTMLElement {
    if (!this.shadowRoot) {
      throw new Error("[SettingsUI] Shadow DOMが設定されていません");
    }

    const template = this.shadowRoot.getElementById(
      "module-item-template",
    ) as HTMLTemplateElement;
    if (!template) {
      throw new Error("[SettingsUI] module-item-templateが見つかりません");
    }

    const element = template.content.cloneNode(true) as DocumentFragment;
    const moduleItem = element.querySelector(".module-item") as HTMLElement;

    // データ設定
    moduleItem.setAttribute("data-module-id", config.id);
    const isAvailable = this.isModuleAvailableOnCurrentPage(config);
    moduleItem.classList.toggle("module-item-unavailable", !isAvailable);
    moduleItem.classList.toggle(
      "module-item-exclusive",
      Boolean(config.exclusiveGroup),
    );
    moduleItem.title = this.getModuleItemTitle(config, isAvailable);

    // アイコン設定
    const icon = element.querySelector(".module-icon") as HTMLElement;
    icon.innerHTML = config.icon;

    // 名前設定
    const name = element.querySelector(".module-name") as HTMLElement;
    name.textContent = config.name;

    // 説明設定
    const description = element.querySelector(
      ".module-description",
    ) as HTMLElement;
    description.textContent = config.description;

    // メタ情報設定
    const version = element.querySelector(".module-version") as HTMLElement;
    version.textContent = `v${config.version}`;

    const pages = element.querySelector(".module-pages") as HTMLElement;
    pages.textContent = this.formatTargetPages(config.targetPages);

    // ステータス設定
    const status = element.querySelector(".module-status") as HTMLElement;
    const moduleStatus = this.moduleManager.getModuleStatus(config.id);
    status.textContent = this.getStatusText(moduleStatus);
    status.className = `module-status ${moduleStatus.toLowerCase()}`;

    // トグルスイッチ設定
    const toggle = element.querySelector(".module-toggle") as HTMLInputElement;
    toggle.checked = this.settingsManager.isModuleEnabled(config.id);
    toggle.disabled = !isAvailable;

    if (config.id === "heatmap") {
      this.addHeatmapSettingsButton(moduleItem);
    }

    if (config.id === "header_privacy") {
      this.addHeaderPrivacySettingsButton(moduleItem);
    }

    if (config.id === "thumbnails_filter") {
      this.addThumbnailsFilterSettingsButton(moduleItem);
    }

    return moduleItem;
  }

  private isModuleAvailableOnCurrentPage(config: ModuleConfig): boolean {
    const currentPageType = this.moduleManager.getCurrentPageType();
    return (
      config.targetPages.includes(currentPageType) ||
      config.targetPages.includes(PageType.ALL)
    );
  }

  private getModuleItemTitle(
    config: ModuleConfig,
    isAvailable: boolean,
  ): string {
    const titleParts: string[] = [];

    if (!isAvailable) {
      titleParts.push("現在のページでは利用できません");
    }

    if (config.exclusiveGroup) {
      titleParts.push(`排他グループ: ${config.exclusiveGroup}`);
    }

    return titleParts.join("\n");
  }

  /**
   * イベントリスナーを設定
   */
  private setupEventListeners(): void {
    if (!this.shadowRoot) {
      window.logger.error("[SettingsUI] Shadow DOMが設定されていません");
      return;
    }
    if (this.eventListenerRoots.has(this.shadowRoot)) {
      return;
    }
    this.eventListenerRoots.add(this.shadowRoot);

    // モジュールトグルイベント（Shadow DOM内でイベントを監視）
    this.shadowRoot.addEventListener("change", (event) => {
      const target = event.target as HTMLInputElement;

      if (target.classList.contains("module-toggle")) {
        void this.handleModuleToggle(target);
      }
    });
  }

  private bindButtonClick(
    button: HTMLElement | null,
    handler: () => void,
  ): void {
    if (!button || button.dataset.settingsClickBound === "true") {
      return;
    }
    button.dataset.settingsClickBound = "true";
    button.addEventListener("click", handler);
  }

  /**
   * モジュールトグルを処理
   */
  private async handleModuleToggle(toggle: HTMLInputElement): Promise<void> {
    const moduleItem = toggle.closest(".module-item") as HTMLElement;
    const moduleId = moduleItem.getAttribute("data-module-id");

    if (!moduleId) return;

    const config = this.moduleRegistry.getConfig(moduleId);
    if (config && !this.isModuleAvailableOnCurrentPage(config)) {
      toggle.checked = this.settingsManager.isModuleEnabled(moduleId);
      window.toastr?.info(
        "このモジュールは現在のページでは利用できません",
        "利用不可",
        { timeOut: 3000 },
      );
      return;
    }

    try {
      await this.moduleManager.toggleModule(moduleId, toggle.checked);

      // ステータス更新
      this.updateModuleStatus(moduleId);
    } catch (error) {
      window.logger.error(
        `[SettingsUI] モジュール ${moduleId} の切り替えに失敗:`,
        error,
      );

      // エラー時はトグルを元に戻す
      toggle.checked = !toggle.checked;

      // エラー通知
      window.toastr?.error(
        `モジュール ${moduleId} の切り替えに失敗しました`,
        "エラー",
        { timeOut: 5000 },
      );
    }
  }

  /**
   * アクションボタンを設定
   */
  private setupActionButtons(): void {
    if (!this.shadowRoot) {
      window.logger.error("[SettingsUI] Shadow DOMが設定されていません");
      return;
    }

    // 即時適用ボタン
    const applyBtn = this.shadowRoot.getElementById("apply-immediately");
    this.bindButtonClick(applyBtn, () => {
      void (async () => {
        try {
          await this.moduleManager.reloadAllModules();
          this.renderModuleList();

          window.toastr?.success("モジュールを再読み込みしました", "成功", {
            timeOut: 3000,
          });
        } catch (error) {
          window.logger.error(
            "[SettingsUI] モジュール再読み込みに失敗:",
            error,
          );
          window.toastr?.error("モジュール再読み込みに失敗しました", "エラー", {
            timeOut: 5000,
          });
        }
      })();
    });

    // 再読み込みして適用ボタン
    const reloadBtn = this.shadowRoot.getElementById("reload-and-apply");
    this.bindButtonClick(reloadBtn, () => {
      window.location.reload();
    });

    // 設定エクスポートボタン
    const exportBtn = this.shadowRoot.getElementById("export-settings");
    this.bindButtonClick(exportBtn, () => {
      void this.exportSettings();
    });

    // 設定インポートボタン
    const importBtn = this.shadowRoot.getElementById("import-settings");
    this.bindButtonClick(importBtn, () => {
      void this.importSettings();
    });

    // 設定リセットボタン
    const resetBtn = this.shadowRoot.getElementById("reset-settings");
    this.bindButtonClick(resetBtn, () => {
      void this.resetSettings();
    });
  }

  /**
   * モジュールステータスを更新
   */
  private updateModuleStatus(moduleId: string): void {
    if (!this.shadowRoot) return;

    const moduleItem = this.shadowRoot.querySelector(
      `[data-module-id="${moduleId}"]`,
    );
    if (moduleItem) {
      const config = this.moduleRegistry.getConfig(moduleId);
      const isAvailable = config
        ? this.isModuleAvailableOnCurrentPage(config)
        : true;
      moduleItem.classList.toggle("module-item-unavailable", !isAvailable);

      const toggle = moduleItem.querySelector(
        ".module-toggle",
      ) as HTMLInputElement;
      if (toggle) {
        toggle.disabled = !isAvailable;
      }

      const status = moduleItem.querySelector(".module-status") as HTMLElement;
      const moduleStatus = this.moduleManager.getModuleStatus(moduleId);
      status.textContent = this.getStatusText(moduleStatus);
      status.className = `module-status ${moduleStatus.toLowerCase()}`;
    }
  }

  /**
   * 🆕 排他グループ対応: モジュールのトグルスイッチ状態を同期
   * 排他グループの他モジュールが無効化された際にUI上のトグルも連動させる
   */
  private syncModuleToggle(moduleId: string, enabled: boolean): void {
    if (!this.shadowRoot) return;

    const moduleItem = this.shadowRoot.querySelector(
      `[data-module-id="${moduleId}"]`,
    );
    if (moduleItem) {
      const toggle = moduleItem.querySelector(
        ".module-toggle",
      ) as HTMLInputElement;
      if (toggle && toggle.checked !== enabled) {
        toggle.checked = enabled;
      }
    }
  }

  private addHeatmapSettingsButton(moduleItem: HTMLElement): void {
    const settingsSlot = moduleItem.querySelector(".module-settings-slot");
    const button = document.createElement("button");
    button.type = "button";
    button.className = "settings-btn module-settings-btn";
    button.id = "open-heatmap-settings";
    button.innerHTML = `${createMaterialIcon("settings", { style: "outlined", color: "white" })} 設定`;
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      this.createHeatmapSettingsModal();
    });

    settingsSlot?.appendChild(button);
  }

  private addHeaderPrivacySettingsButton(moduleItem: HTMLElement): void {
    const settingsSlot = moduleItem.querySelector(".module-settings-slot");
    const button = document.createElement("button");
    button.type = "button";
    button.className = "settings-btn module-settings-btn";
    button.id = "open-header-privacy-settings";
    button.innerHTML = `${createMaterialIcon("settings", { style: "outlined", color: "white" })} 設定`;
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      void this.openHeaderPrivacySettingsPanel();
    });

    settingsSlot?.appendChild(button);
  }

  private async openHeaderPrivacySettingsPanel(): Promise<void> {
    try {
      if (!this.settingsManager.isModuleEnabled("header_privacy")) {
        await this.moduleManager.toggleModule("header_privacy", true);
      } else if (!this.moduleManager.getLoadedModule("header_privacy")) {
        await this.moduleManager.loadModule("header_privacy");
      }

      this.createHeaderPrivacySettingsModal();
    } catch (error) {
      window.logger.error(
        "[SettingsUI] ヘッダープライバシー設定を開けませんでした:",
        error,
      );
      window.toastr?.error(
        "ヘッダープライバシー設定を開けませんでした",
        "エラー",
        { timeOut: 5000 },
      );
    }
  }

  private getLoadedHeaderModule(): HeaderModule | null {
    return this.moduleManager.getLoadedModule<HeaderModule>("header_privacy");
  }

  private getStoredHeaderPrivacySettings(): HeaderPrivacySettings {
    try {
      const saved = localStorage.getItem(HEADER_PRIVACY_STORAGE_KEY);
      if (!saved) {
        return { hideIcon: true, hideName: true };
      }

      const parsed = JSON.parse(saved) as Partial<HeaderPrivacySettings>;
      return {
        hideIcon: typeof parsed.hideIcon === "boolean" ? parsed.hideIcon : true,
        hideName: typeof parsed.hideName === "boolean" ? parsed.hideName : true,
      };
    } catch (error) {
      window.logger.error(
        "[SettingsUI] ヘッダープライバシー設定の読み込みに失敗:",
        error,
      );
      return { hideIcon: true, hideName: true };
    }
  }

  private saveHeaderPrivacySettings(settings: HeaderPrivacySettings): void {
    localStorage.setItem(HEADER_PRIVACY_STORAGE_KEY, JSON.stringify(settings));
  }

  private createHeaderPrivacySettingsModal(): void {
    if (!this.shadowRoot) return;

    const existingModal = this.shadowRoot.getElementById(
      "header-privacy-settings-modal",
    );
    if (existingModal) {
      existingModal.remove();
    }

    const headerModule = this.getLoadedHeaderModule();
    const settings =
      headerModule?.getSettings() ?? this.getStoredHeaderPrivacySettings();

    const modal = document.createElement("div");
    modal.id = "header-privacy-settings-modal";
    modal.className = "modal-overlay";
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h3>${createMaterialIcon("lock", { style: "outlined", color: "white" })} ヘッダープライバシー設定</h3>
          <button class="close-modal-btn">×</button>
        </div>

        <div class="modal-body">
          <div class="settings-section">
            <h4>非表示にする項目</h4>
            <div class="heatmap-setting-group">
              <input type="checkbox" class="header-privacy-toggle" id="header-privacy-hide-icon" data-setting="hideIcon">
              <label for="header-privacy-hide-icon">ユーザーアイコン</label>
            </div>
            <div class="heatmap-setting-group">
              <input type="checkbox" class="header-privacy-toggle" id="header-privacy-hide-name" data-setting="hideName">
              <label for="header-privacy-hide-name">ユーザー名</label>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button class="modal-btn secondary" id="close-header-privacy-modal">閉じる</button>
        </div>
      </div>
    `;

    this.shadowRoot.appendChild(modal);
    this.setupHeaderPrivacyModalEventListeners(modal, settings);
  }

  private setupHeaderPrivacyModalEventListeners(
    modal: HTMLElement,
    initialSettings: HeaderPrivacySettings,
  ): void {
    const closeModal = () => {
      modal.remove();
    };

    modal
      .querySelectorAll(".close-modal-btn, #close-header-privacy-modal")
      .forEach((button) => {
        button.addEventListener("click", closeModal);
      });

    modal.addEventListener("click", (event) => {
      if (event.target === modal) {
        closeModal();
      }
    });

    modal.addEventListener("keydown", (event) => {
      event.stopPropagation();
    });

    const iconToggle = modal.querySelector<HTMLInputElement>(
      "#header-privacy-hide-icon",
    );
    const nameToggle = modal.querySelector<HTMLInputElement>(
      "#header-privacy-hide-name",
    );

    if (!iconToggle || !nameToggle) {
      return;
    }

    iconToggle.checked = initialSettings.hideIcon;
    nameToggle.checked = initialSettings.hideName;

    const applySettings = () => {
      const settings: HeaderPrivacySettings = {
        hideIcon: iconToggle.checked,
        hideName: nameToggle.checked,
      };
      this.saveHeaderPrivacySettings(settings);
      this.getLoadedHeaderModule()?.updateSettings(settings);
    };

    iconToggle.addEventListener("change", applySettings);
    nameToggle.addEventListener("change", applySettings);
  }

  private addThumbnailsFilterSettingsButton(moduleItem: HTMLElement): void {
    const settingsSlot = moduleItem.querySelector(".module-settings-slot");
    const button = document.createElement("button");
    button.type = "button";
    button.className = "settings-btn module-settings-btn";
    button.id = "open-thumbnails-filter-settings";
    button.innerHTML = `${createMaterialIcon("settings", { style: "outlined", color: "white" })} 設定`;
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      void this.openThumbnailsFilterSettingsPanel();
    });

    settingsSlot?.appendChild(button);
  }

  private async openThumbnailsFilterSettingsPanel(): Promise<void> {
    try {
      if (!this.settingsManager.isModuleEnabled("thumbnails_filter")) {
        await this.moduleManager.toggleModule("thumbnails_filter", true);
      } else if (!this.moduleManager.getLoadedModule("thumbnails_filter")) {
        await this.moduleManager.loadModule("thumbnails_filter");
      }

      window.ThumbnailsFilter?.openSettingsPanel();
    } catch (error) {
      window.logger.error(
        "[SettingsUI] サムネイルフィルター設定を開けませんでした:",
        error,
      );
      window.toastr?.error(
        "サムネイルフィルター設定を開けませんでした",
        "エラー",
        { timeOut: 5000 },
      );
    }
  }

  private getLoadedHeatmapModule(): HeatmapModule | null {
    return this.moduleManager.getLoadedModule<HeatmapModule>("heatmap");
  }

  private getStoredHeatmapDisplayMode(): HeatmapDisplayMode {
    const value = localStorage.getItem(HEATMAP_STORAGE_KEYS.DISPLAY_MODE);
    return value && HEATMAP_DISPLAY_MODES.includes(value as HeatmapDisplayMode)
      ? (value as HeatmapDisplayMode)
      : "off";
  }

  private getStoredHeatmapColorScheme(): HeatmapColorScheme {
    const value = localStorage.getItem(HEATMAP_STORAGE_KEYS.COLOR_SCHEME);
    return value && HEATMAP_COLOR_SCHEMES.includes(value as HeatmapColorScheme)
      ? (value as HeatmapColorScheme)
      : "default";
  }

  private getStoredHeatmapSmoothing(): boolean {
    return localStorage.getItem(HEATMAP_STORAGE_KEYS.SMOOTHING) === "true";
  }

  private saveHeatmapSettings(
    displayMode: HeatmapDisplayMode,
    colorScheme: HeatmapColorScheme,
    smoothing: boolean,
  ): void {
    localStorage.setItem(HEATMAP_STORAGE_KEYS.DISPLAY_MODE, displayMode);
    localStorage.setItem(HEATMAP_STORAGE_KEYS.COLOR_SCHEME, colorScheme);
    localStorage.setItem(HEATMAP_STORAGE_KEYS.SMOOTHING, smoothing.toString());
  }

  private createHeatmapSettingsModal(): void {
    if (!this.shadowRoot) return;

    const existingModal = this.shadowRoot.getElementById(
      "heatmap-settings-modal",
    );
    if (existingModal) {
      existingModal.remove();
    }

    const heatmapModule = this.getLoadedHeatmapModule();
    const displayMode =
      heatmapModule?.getDisplayMode() ?? this.getStoredHeatmapDisplayMode();
    const colorScheme =
      heatmapModule?.getColorScheme() ?? this.getStoredHeatmapColorScheme();
    const smoothing =
      heatmapModule?.getSmoothing() ?? this.getStoredHeatmapSmoothing();

    const modal = document.createElement("div");
    modal.id = "heatmap-settings-modal";
    modal.className = "modal-overlay";
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h3>${createMaterialIcon("analytics", { style: "outlined", color: "white" })} ヒートマップ設定</h3>
          <button class="close-modal-btn">×</button>
        </div>

        <div class="modal-body">
          <div class="settings-section">
            <h4>表示モード</h4>
            <div class="heatmap-mode-buttons">
              <button class="heatmap-mode-btn" data-mode="off">OFF</button>
              <button class="heatmap-mode-btn" data-mode="fab">FAB内</button>
              <button class="heatmap-mode-btn" data-mode="overlay">動画上</button>
            </div>
          </div>

          <div class="settings-section">
            <h4>詳細設定</h4>
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
        </div>

        <div class="modal-footer">
          <button class="modal-btn secondary" id="close-heatmap-modal">閉じる</button>
        </div>
      </div>
    `;

    this.shadowRoot.appendChild(modal);
    this.setupHeatmapModalEventListeners(modal, {
      displayMode,
      colorScheme,
      smoothing,
    });
  }

  private setupHeatmapModalEventListeners(
    modal: HTMLElement,
    initialSettings: {
      displayMode: HeatmapDisplayMode;
      colorScheme: HeatmapColorScheme;
      smoothing: boolean;
    },
  ): void {
    const closeModal = () => {
      modal.remove();
    };

    modal
      .querySelectorAll(".close-modal-btn, #close-heatmap-modal")
      .forEach((button) => {
        button.addEventListener("click", closeModal);
      });

    modal.addEventListener("click", (event) => {
      if (event.target === modal) {
        closeModal();
      }
    });

    modal.addEventListener("keydown", (event) => {
      event.stopPropagation();
    });

    modal.addEventListener("keyup", (event) => {
      event.stopPropagation();
    });

    const modeButtons =
      modal.querySelectorAll<HTMLElement>(".heatmap-mode-btn");
    const colorSchemeSelect = modal.querySelector<HTMLSelectElement>(
      ".heatmap-color-scheme",
    );
    const smoothToggle = modal.querySelector<HTMLInputElement>(
      ".heatmap-smooth-toggle",
    );

    const updateActiveMode = (mode: HeatmapDisplayMode) => {
      modeButtons.forEach((button) => {
        button.toggleAttribute("data-active", button.dataset.mode === mode);
      });
    };

    const applySettings = () => {
      const activeMode =
        modal.querySelector<HTMLElement>(".heatmap-mode-btn[data-active]")
          ?.dataset.mode ?? initialSettings.displayMode;
      const displayMode = activeMode as HeatmapDisplayMode;
      const colorScheme =
        (colorSchemeSelect?.value as HeatmapColorScheme | undefined) ??
        initialSettings.colorScheme;
      const smoothing = smoothToggle?.checked ?? initialSettings.smoothing;
      const heatmapModule = this.getLoadedHeatmapModule();

      if (heatmapModule) {
        heatmapModule.setColorScheme(colorScheme);
        heatmapModule.setSmoothing(smoothing);
        heatmapModule.setDisplayMode(displayMode);
        return;
      }

      this.saveHeatmapSettings(displayMode, colorScheme, smoothing);
    };

    updateActiveMode(initialSettings.displayMode);
    if (colorSchemeSelect) {
      colorSchemeSelect.value = initialSettings.colorScheme;
      colorSchemeSelect.addEventListener("change", applySettings);
    }

    if (smoothToggle) {
      smoothToggle.checked = initialSettings.smoothing;
      smoothToggle.addEventListener("change", applySettings);
    }

    modeButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const mode = button.dataset.mode as HeatmapDisplayMode | undefined;
        if (!mode) return;
        updateActiveMode(mode);
        applySettings();
      });
    });
  }

  /**
   * ステータステキストを取得
   */
  private getStatusText(status: ModuleStatus): string {
    switch (status) {
      case ModuleStatus.ACTIVE:
        return "アクティブ";
      case ModuleStatus.INACTIVE:
        return "非アクティブ";
      case ModuleStatus.LOADING:
        return "読み込み中";
      case ModuleStatus.ERROR:
        return "エラー";
      case ModuleStatus.UNAVAILABLE:
        return "利用不可";
      default:
        return "不明";
    }
  }

  private formatTargetPages(pages: PageType[]): string {
    const labels: Record<PageType, string> = {
      [PageType.ALL]: "All",
      [PageType.WATCH]: "Watch",
      [PageType.SEARCH]: "Search",
      [PageType.RANKING]: "Ranking",
      [PageType.NICO_INFO]: "Nico Info",
    };

    return pages.map((page) => labels[page] ?? page).join(", ");
  }

  /**
   * 設定をエクスポート
   */
  private exportSettings(): void {
    try {
      const settings = this.settingsManager.exportSettings();
      const blob = new Blob([settings], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = this.generateExportFilename("module-settings");
      a.click();

      URL.revokeObjectURL(url);

      window.toastr?.success("設定をエクスポートしました", "成功", {
        timeOut: 3000,
      });
    } catch (error) {
      window.logger.error("[SettingsUI] 設定エクスポートに失敗:", error);
      window.toastr?.error("設定エクスポートに失敗しました", "エラー", {
        timeOut: 5000,
      });
    }
  }

  /**
   * 設定をインポート
   */
  private importSettings(): void {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";

    input.onchange = (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const text = e.target?.result as string;
            const parsed: unknown = JSON.parse(text);
            if (typeof parsed === "string") {
              this.settingsManager.importSettings(parsed);
            } else {
              // 文字列以外は文字列化して取り込む（フォールバック）
              this.settingsManager.importSettings(JSON.stringify(parsed));
            }
            this.renderModuleList();

            window.toastr?.success("設定をインポートしました", "成功", {
              timeOut: 3000,
            });
          } catch (error) {
            window.logger.error("[SettingsUI] 設定インポートに失敗:", error);
            window.toastr?.error("設定インポートに失敗しました", "エラー", {
              timeOut: 5000,
            });
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
  private resetSettings(): void {
    if (confirm("すべての設定をリセットしますか？この操作は元に戻せません。")) {
      try {
        this.settingsManager.resetSettings();
        this.renderModuleList();

        window.toastr?.success("設定をリセットしました", "成功", {
          timeOut: 3000,
        });
      } catch (error) {
        window.logger.error("[SettingsUI] 設定リセットに失敗:", error);
        window.toastr?.error("設定リセットに失敗しました", "エラー", {
          timeOut: 5000,
        });
      }
    }
  }

  /**
   * ユニークなファイル名を生成（エクスポート用）
   */
  private generateExportFilename(prefix: string): string {
    const now = new Date();
    const dateStr = now.toISOString().split("T")[0]; // YYYY-MM-DD
    const timeStr = now.toTimeString().split(" ")[0].replace(/:/g, "-"); // HH-MM-SS
    const randomStr = Math.random().toString(36).substr(2, 4); // ランダム4文字

    return `${prefix}-${dateStr}_${timeStr}_${randomStr}.json`;
  }

  /**
   * 背景画像設定ボタンを追加
   */
  private addBackgroundImageSettingsButton(container: HTMLElement): void {
    const settingsButton = document.createElement("div");
    settingsButton.className = "module-item module-item-config";
    settingsButton.innerHTML = `
      <div class="module-icon">${createMaterialIcon("image", { style: "outlined", color: "white" })}</div>
      <h3 class="module-name">背景画像設定</h3>
      <p class="module-description">動画の背景画像を設定します</p>
      <div class="module-meta">
        <span class="module-version">v1.0.0</span>
        <span class="module-pages">${this.formatTargetPages([PageType.WATCH])}</span>
        <span class="module-status settings">設定</span>
      </div>
      <div class="module-actions">
        <div class="module-settings-slot">
          <button class="settings-btn module-settings-btn" id="open-background-settings">${createMaterialIcon("settings", { style: "outlined", color: "white" })} 設定</button>
        </div>
        <div class="module-toggle-slot"></div>
      </div>
    `;

    container.appendChild(settingsButton);

    // イベントリスナーを追加
    const openButton = settingsButton.querySelector(
      "#open-background-settings",
    );
    openButton?.addEventListener("click", () => {
      void this.openBackgroundImageSettings();
    });
  }

  /**
   * 背景画像設定画面を開く
   */
  private async openBackgroundImageSettings(): Promise<void> {
    try {
      // 背景画像設定を初期化
      await this.backgroundSettings.initializeSettings();

      // 設定画面を作成
      this.createBackgroundSettingsModal();
    } catch (error) {
      window.logger.error("[SettingsUI] 背景画像設定の初期化に失敗:", error);
      window.toastr?.error("背景画像設定の初期化に失敗しました", "エラー", {
        timeOut: 5000,
      });
    }
  }

  /**
   * 背景画像設定モーダルを作成
   */
  private createBackgroundSettingsModal(): void {
    if (!this.shadowRoot) return;

    // 既存のモーダルを削除
    const existingModal = this.shadowRoot.getElementById(
      "background-settings-modal",
    );
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
          <div class="background-settings-grid">
            <div class="background-settings-main">
              <div class="settings-section">
                <h4>${createMaterialIcon("edit", { style: "outlined", color: "white" })} 方法1: URL入力</h4>
                <div class="url-input-section">
                  <input type="text" id="modal-image-url-input" value="${DEFAULT_BACKGROUND_IMAGE_URL_PREFIX}" placeholder="画像URLを入力してください" />
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

            <aside class="background-settings-help" aria-label="背景画像設定の使い方">
              <h4>${createMaterialIcon("help", { style: "outlined", color: "white" })} 使い方の目安</h4>
              <ol class="background-settings-help-steps">
                <li>画像を Squoosh などでブラウザが扱える形式に変換します。変換は必須ではありません。</li>
                <li>NicoCache_nl の <code>local/background-images/favorites</code> など、<code>local</code> 配下へ画像を置きます。</li>
                <li>URL入力では <code>https://www.nicovideo.jp/local/background-images/favorites/background1.avif</code> のように指定します。</li>
              </ol>
              <div class="background-settings-help-note">
                <strong>ファイル選択の場合</strong>
                <p>選択した画像は IndexedDB に base64 形式で保存されます。ブラウザのサイトデータ削除で消えるため、必要に応じて設定をエクスポートしてください。</p>
              </div>
              <div class="background-settings-help-note warning">
                <strong>外部 URL は非推奨</strong>
                <p><code>https://www.nicovideo.jp/local/</code> 以外の URL も指定できますが、外部サーバーへ負荷をかける可能性があります。</p>
              </div>
              <div class="background-settings-help-note">
                <strong>nico_wallpaperG 併用時</strong>
                <p>表示が衝突する場合は、背景セレクターとマトリックス背景のどちらを優先するかに合わせて無効化してください。</p>
              </div>
            </aside>
          </div>
        </div>
        
        <div class="modal-footer">
          <button class="modal-btn secondary" id="close-background-modal">閉じる</button>
        </div>
      </div>
    `;

    this.shadowRoot.appendChild(modal);

    // イベントリスナーを設定
    this.setupBackgroundModalEventListeners();
    this.focusModalUrlInput();

    // 画像リストを初期化
    void this.refreshModalImageList();
  }

  /**
   * URL欄へフォーカスし、プリ入力されたベースURLの末尾にカーソルを置く
   */
  private focusModalUrlInput(): void {
    if (!this.shadowRoot) return;

    const urlInput = this.shadowRoot.querySelector<HTMLInputElement>(
      "#modal-image-url-input",
    );
    if (!urlInput) return;

    setTimeout(() => {
      urlInput.focus();
      const cursorPosition = urlInput.value.length;
      urlInput.setSelectionRange(cursorPosition, cursorPosition);
    }, 0);
  }

  /**
   * 背景画像設定モーダルのイベントリスナーを設定
   */
  private setupBackgroundModalEventListeners(): void {
    if (!this.shadowRoot) return;

    const modal = this.shadowRoot.getElementById("background-settings-modal");
    if (!modal) return;

    // モーダルを閉じる
    const closeButtons = modal.querySelectorAll(
      ".close-modal-btn, #close-background-modal",
    );
    closeButtons.forEach((button) => {
      button.addEventListener("click", () => {
        modal.remove();
      });
    });

    // モーダル外クリックで閉じる
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });

    // キーボードイベントの伝搬を停止（誤爆防止）
    modal.addEventListener("keydown", (e) => {
      e.stopPropagation();
    });

    modal.addEventListener("keyup", (e) => {
      e.stopPropagation();
    });

    modal.addEventListener("keypress", (e) => {
      e.stopPropagation();
    });

    // URL画像追加
    const addUrlButton = modal.querySelector("#modal-add-url-image");
    addUrlButton?.addEventListener("click", () => {
      void this.addModalImageFromUrl();
    });

    // ファイル画像追加
    const addFileButton = modal.querySelector("#modal-add-file-image");
    addFileButton?.addEventListener("click", () => {
      void this.addModalImageFromFile();
    });

    // Enterキーでの追加
    const urlInput = modal.querySelector(
      "#modal-image-url-input",
    ) as HTMLInputElement;
    const nameInput = modal.querySelector(
      "#modal-image-name-input",
    ) as HTMLInputElement;

    [urlInput, nameInput].forEach((input) => {
      input?.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
          void this.addModalImageFromUrl();
        }
      });
    });

    const fileNameInput = modal.querySelector(
      "#modal-file-name-input",
    ) as HTMLInputElement;
    fileNameInput?.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        void this.addModalImageFromFile();
      }
    });

    // エクスポートボタン
    const exportButton = modal.querySelector("#modal-export-settings");
    exportButton?.addEventListener("click", () => {
      void this.exportModalSettings();
    });

    // インポートボタン
    const importButton = modal.querySelector("#modal-import-settings");
    importButton?.addEventListener("click", () => {
      const fileInput = modal.querySelector(
        "#modal-import-file-input",
      ) as HTMLInputElement;
      fileInput.click();
    });

    // インポートファイル選択
    const importFileInput = modal.querySelector(
      "#modal-import-file-input",
    ) as HTMLInputElement;
    importFileInput?.addEventListener("change", (e) => {
      const target = e.target as HTMLInputElement;
      const file = target.files?.[0];
      if (file) {
        void this.importModalSettings(file);
      }
    });

    // リセットボタン
    const resetButton = modal.querySelector("#modal-reset-settings");
    resetButton?.addEventListener("click", () => {
      void this.resetModalSettings();
    });
  }

  /**
   * モーダルでURL画像を追加
   */
  private async addModalImageFromUrl(): Promise<void> {
    if (!this.shadowRoot) return;

    const modal = this.shadowRoot.getElementById("background-settings-modal");
    if (!modal) return;

    const urlInput = modal.querySelector(
      "#modal-image-url-input",
    ) as HTMLInputElement;
    const nameInput = modal.querySelector(
      "#modal-image-name-input",
    ) as HTMLInputElement;

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
      // URL形式の検証
      let imageUrl = url;
      if (!url.startsWith("url(")) {
        imageUrl = `url("${url}")`;
      }

      // URLの有効性をチェック（オプション）
      const isValid = await this.backgroundSettings.validateImageUrl(url);
      if (!isValid) {
        const proceed = confirm(
          "画像URLの検証に失敗しました。それでも追加しますか？",
        );
        if (!proceed) return;
      }

      // 画像を追加
      await this.backgroundSettings.addImage(name, "url", imageUrl);

      // 入力フィールドをクリア
      urlInput.value = DEFAULT_BACKGROUND_IMAGE_URL_PREFIX;
      nameInput.value = "";
      this.focusModalUrlInput();

      // 画像リストを更新
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
  private async addModalImageFromFile(): Promise<void> {
    if (!this.shadowRoot) return;

    const modal = this.shadowRoot.getElementById("background-settings-modal");
    if (!modal) return;

    const fileInput = modal.querySelector(
      "#modal-image-file-input",
    ) as HTMLInputElement;
    const nameInput = modal.querySelector(
      "#modal-file-name-input",
    ) as HTMLInputElement;

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
      // image-validatorでファイルの正当性を確認
      const isValidFile = await this.backgroundSettings.validateImageFile(file);
      if (!isValidFile) {
        window.toastr?.error("画像ファイルの検証に失敗しました", "検証エラー");
        return;
      }

      // ファイルをbase64に変換
      const base64Data = await this.backgroundSettings.fileToBase64(file);

      // 画像を追加
      await this.backgroundSettings.addImage(name, "file", base64Data);

      // 入力フィールドをクリア
      fileInput.value = "";
      nameInput.value = "";

      // 画像リストを更新
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
  private async refreshModalImageList(): Promise<void> {
    if (!this.shadowRoot) return;

    const imageListContainer =
      this.shadowRoot.getElementById("modal-image-list");
    if (!imageListContainer) return;

    try {
      const savedImages = await this.backgroundSettings.getAllImages();
      const currentImageId = this.backgroundSettings.getSelectedImageId();

      if (savedImages.length === 0) {
        imageListContainer.innerHTML =
          '<p class="no-images-message">登録されている画像がありません</p>';
        return;
      }

      imageListContainer.innerHTML = "";

      savedImages.forEach((image: BackgroundImageItem) => {
        const imageItem = document.createElement("div");
        imageItem.className = `image-item ${image.id === currentImageId ? "selected" : ""}`;

        // 画像のプレビュー用URL/データを決定
        let imageSrc: string;
        if (image.type === "url") {
          // URLタイプの場合、url()を除去して直接URLを取得
          imageSrc = image.data.replace(/^url\(["']?|["']?\)$/g, "");
        } else {
          // fileタイプの場合、base64データをそのまま使用
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
      imageListContainer.innerHTML =
        '<p class="error-message">画像リストの読み込みに失敗しました</p>';
    }
  }

  /**
   * モーダルの画像リストのイベントリスナーを設定
   */
  private setupModalImageListEventListeners(): void {
    if (!this.shadowRoot) return;

    const modal = this.shadowRoot.getElementById("background-settings-modal");
    if (!modal) return;

    // 選択ボタン
    const selectButtons = modal.querySelectorAll(".image-select-btn");
    selectButtons.forEach((button) => {
      button.addEventListener("click", (e) => {
        void (async () => {
          const target = e.target as HTMLElement;
          // closestを使って.image-select-btnを確実に取得
          const selectButton = target.closest(
            ".image-select-btn",
          ) as HTMLElement;
          const imageId = selectButton?.getAttribute("data-image-id");
          if (imageId) {
            await this.selectModalImage(imageId);
          }
        })();
      });
    });

    // 削除ボタン
    const deleteButtons = modal.querySelectorAll(".image-delete-btn");
    deleteButtons.forEach((button) => {
      button.addEventListener("click", (e) => {
        void (async () => {
          const target = e.target as HTMLElement;
          // closestを使って.image-delete-btnを確実に取得
          const deleteButton = target.closest(
            ".image-delete-btn",
          ) as HTMLElement;
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
  private async selectModalImage(imageId: string): Promise<void> {
    try {
      const image = await this.backgroundSettings.getImage(imageId);
      if (image) {
        await this.backgroundSettings.setSelectedImage(imageId);

        // 背景を即座に適用
        let backgroundValue: string;
        if (image.type === "url") {
          backgroundValue = image.data;
        } else if (image.type === "file") {
          backgroundValue = `url(${image.data})`;
        } else {
          return;
        }

        document.documentElement.style.setProperty("--bg-img", backgroundValue);

        await this.refreshModalImageList();
        window.toastr?.success(
          `背景画像を「${image.name}」に変更しました`,
          "成功",
        );
      }
    } catch (error) {
      window.logger.error("[SettingsUI] 画像の選択に失敗:", error);
      window.toastr?.error("画像の選択に失敗しました", "エラー");
    }
  }

  /**
   * モーダルで画像を削除
   */
  private async deleteModalImage(imageId: string): Promise<void> {
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
  private async exportModalSettings(): Promise<void> {
    try {
      const settingsData = await this.backgroundSettings.exportSettings();
      const blob = new Blob([settingsData], { type: "application/json" });
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = this.backgroundSettings.generateExportFilename();
      a.click();

      URL.revokeObjectURL(url);

      window.toastr?.success("背景画像設定をエクスポートしました", "成功", {
        timeOut: 3000,
      });
    } catch (error) {
      window.logger.error(
        "[SettingsUI] 背景画像設定エクスポートに失敗:",
        error,
      );
      window.toastr?.error("背景画像設定エクスポートに失敗しました", "エラー", {
        timeOut: 5000,
      });
    }
  }

  /**
   * モーダルで設定をインポート
   */
  private async importModalSettings(file: File): Promise<void> {
    try {
      await Promise.resolve();
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const settingsData = e.target?.result as string;
          await this.backgroundSettings.importSettings(settingsData);
          await this.refreshModalImageList();

          window.toastr?.success("背景画像設定をインポートしました", "成功", {
            timeOut: 3000,
          });
        } catch (importError) {
          window.logger.error(
            "[SettingsUI] インポートデータの処理に失敗:",
            importError,
          );
          window.toastr?.error(
            "インポートデータの処理に失敗しました",
            "エラー",
            { timeOut: 5000 },
          );
        }
      };
      reader.readAsText(file);
    } catch (error) {
      window.logger.error("[SettingsUI] 背景画像設定インポートに失敗:", error);
      window.toastr?.error("背景画像設定インポートに失敗しました", "エラー", {
        timeOut: 5000,
      });
    }
  }

  /**
   * モーダルで設定をリセット
   */
  private async resetModalSettings(): Promise<void> {
    if (
      confirm(
        "背景画像設定をデフォルトに戻しますか？現在の設定は全て削除されます。",
      )
    ) {
      try {
        await this.backgroundSettings.resetToDefaults();
        await this.refreshModalImageList();

        window.toastr?.success("背景画像設定をデフォルトに戻しました", "成功", {
          timeOut: 3000,
        });
      } catch (error) {
        window.logger.error("[SettingsUI] 背景画像設定リセットに失敗:", error);
        window.toastr?.error("背景画像設定リセットに失敗しました", "エラー", {
          timeOut: 5000,
        });
      }
    }
  }
}
