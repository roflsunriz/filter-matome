import { ModuleManager } from "@/mlink-video-controller/module-handlers/module-manager";
import { ModuleRegistry } from "@/mlink-video-controller/module-handlers/module-registry";
import { SettingsManager } from "@/mlink-video-controller/module-handlers/settings-manager";
import { BackgroundImageSettings } from "@/mlink-video-controller/modules/background-image-settings";
import {
  ModuleCategory,
  ModuleConfig,
  ModuleStatus,
  PageType,
} from "@/types/module-types";
// import { ToastrInstance } from '@/types/toastr-types';
import { createMaterialIcon } from "@/common/material-icons";
import type {
  HeatmapColorScheme,
  HeatmapDisplayMode,
} from "@/mlink-video-controller/managers/heatmap";
import type {
  HeaderModule,
  HeaderPrivacySettings,
} from "@/mlink-video-controller/modules/header-module";
import type { HeatmapModule } from "@/mlink-video-controller/modules/heatmap-module";

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
/** モジュール一覧・トグル・各機能設定への入口。 */
export abstract class SettingsUICore {
  /**
   * 背景画像設定ボタンを追加
   */
  protected abstract addBackgroundImageSettingsButton(
    container: HTMLElement,
  ): void;
  /**
   * 設定をエクスポート
   */
  protected abstract exportSettings(): void;
  /**
   * 設定をインポート
   */
  protected abstract importSettings(): void;
  /**
   * 設定をリセット
   */
  protected abstract resetSettings(): void;
  protected moduleManager: ModuleManager;
  protected moduleRegistry: ModuleRegistry;
  protected settingsManager: SettingsManager;
  protected backgroundSettings: BackgroundImageSettings;
  protected isInitialized: boolean = false;
  protected shadowRoot: ShadowRoot | null = null;
  protected moduleEventListenerAttached: boolean = false;
  protected eventListenerRoots: WeakSet<ShadowRoot> = new WeakSet();

  protected constructor() {
    this.moduleManager = ModuleManager.getInstance();
    this.moduleRegistry = ModuleRegistry.getInstance();
    this.settingsManager = SettingsManager.getInstance();
    this.backgroundSettings = BackgroundImageSettings.getInstance();
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
  protected createModuleElement(config: ModuleConfig): HTMLElement {
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

    if (config.id === "daily_lottery_highlight") {
      this.addNicoInfoPageLink(moduleItem, config.pageUrl);
    }

    return moduleItem;
  }

  protected isModuleAvailableOnCurrentPage(config: ModuleConfig): boolean {
    const currentPageType = this.moduleManager.getCurrentPageType();
    return (
      config.targetPages.includes(currentPageType) ||
      config.targetPages.includes(PageType.ALL)
    );
  }

  protected getModuleItemTitle(
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
  protected setupEventListeners(): void {
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

  protected bindButtonClick(
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
  protected async handleModuleToggle(toggle: HTMLInputElement): Promise<void> {
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
  protected setupActionButtons(): void {
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
  protected updateModuleStatus(moduleId: string): void {
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
  protected syncModuleToggle(moduleId: string, enabled: boolean): void {
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

  protected addHeatmapSettingsButton(moduleItem: HTMLElement): void {
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

  protected addNicoInfoPageLink(
    moduleItem: HTMLElement,
    pageUrl: string | undefined,
  ): void {
    if (!pageUrl) return;

    const settingsSlot = moduleItem.querySelector(".module-settings-slot");
    const link = document.createElement("a");
    link.className = "settings-btn module-page-link";
    link.href = pageUrl;
    link.target = "_self";
    link.textContent = "開く";
    link.addEventListener("click", (event) => {
      event.stopPropagation();
    });

    settingsSlot?.appendChild(link);
  }

  protected addHeaderPrivacySettingsButton(moduleItem: HTMLElement): void {
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

  protected async openHeaderPrivacySettingsPanel(): Promise<void> {
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

  protected getLoadedHeaderModule(): HeaderModule | null {
    return this.moduleManager.getLoadedModule<HeaderModule>("header_privacy");
  }

  protected getStoredHeaderPrivacySettings(): HeaderPrivacySettings {
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

  protected saveHeaderPrivacySettings(settings: HeaderPrivacySettings): void {
    localStorage.setItem(HEADER_PRIVACY_STORAGE_KEY, JSON.stringify(settings));
  }

  protected createHeaderPrivacySettingsModal(): void {
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

  protected setupHeaderPrivacyModalEventListeners(
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

  protected addThumbnailsFilterSettingsButton(moduleItem: HTMLElement): void {
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

  protected async openThumbnailsFilterSettingsPanel(): Promise<void> {
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

  protected getLoadedHeatmapModule(): HeatmapModule | null {
    return this.moduleManager.getLoadedModule<HeatmapModule>("heatmap");
  }

  protected getStoredHeatmapDisplayMode(): HeatmapDisplayMode {
    const value = localStorage.getItem(HEATMAP_STORAGE_KEYS.DISPLAY_MODE);
    return value && HEATMAP_DISPLAY_MODES.includes(value as HeatmapDisplayMode)
      ? (value as HeatmapDisplayMode)
      : "off";
  }

  protected getStoredHeatmapColorScheme(): HeatmapColorScheme {
    const value = localStorage.getItem(HEATMAP_STORAGE_KEYS.COLOR_SCHEME);
    return value && HEATMAP_COLOR_SCHEMES.includes(value as HeatmapColorScheme)
      ? (value as HeatmapColorScheme)
      : "default";
  }

  protected getStoredHeatmapSmoothing(): boolean {
    return localStorage.getItem(HEATMAP_STORAGE_KEYS.SMOOTHING) === "true";
  }

  protected saveHeatmapSettings(
    displayMode: HeatmapDisplayMode,
    colorScheme: HeatmapColorScheme,
    smoothing: boolean,
  ): void {
    localStorage.setItem(HEATMAP_STORAGE_KEYS.DISPLAY_MODE, displayMode);
    localStorage.setItem(HEATMAP_STORAGE_KEYS.COLOR_SCHEME, colorScheme);
    localStorage.setItem(HEATMAP_STORAGE_KEYS.SMOOTHING, smoothing.toString());
  }

  protected createHeatmapSettingsModal(): void {
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

  protected setupHeatmapModalEventListeners(
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
  protected getStatusText(status: ModuleStatus): string {
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

  protected formatTargetPages(pages: PageType[]): string {
    const labels: Record<PageType, string> = {
      [PageType.ALL]: "All",
      [PageType.WATCH]: "Watch",
      [PageType.SEARCH]: "Search",
      [PageType.RANKING]: "Ranking",
      [PageType.NICO_INFO]: "Nico Info",
    };

    return pages.map((page) => labels[page] ?? page).join(", ");
  }
}
