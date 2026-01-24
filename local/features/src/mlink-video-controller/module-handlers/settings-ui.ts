import { ModuleManager } from "@/mlink-video-controller/module-handlers/module-manager";
import { ModuleRegistry } from "@/mlink-video-controller/module-handlers/module-registry";
import { SettingsManager } from "@/mlink-video-controller/module-handlers/settings-manager";
import {
  ModuleConfig,
  ModuleCategory,
  ModuleStatus,
} from "@/types/module-types";
import { WatchPageModule } from "@/mlink-video-controller/modules/watch-page-module";
import { BackgroundImageSettings } from "@/mlink-video-controller/modules/background-image-settings";
// import { ToastrInstance } from '@/types/toastr-types';
import { createMaterialIcon } from "@/common/material-icons";
import { BackgroundImageItem } from "@/types/background-image-types";

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
    if (this.isInitialized) return;

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

    // 🔧 修正: ModuleManager のイベントを監視してUI更新
    this.moduleManager.addEventListener((event) => {
      // モジュールの読み込み/アンロード時にUIを更新
      if (event.type === "loaded" || event.type === "unloaded") {
        this.updateModuleStatus(event.moduleId);

        // WatchPageModuleの場合、サブモジュールも更新
        if (event.moduleId === "watch_page") {
          this.refreshWatchPageSubModules();
        }
      }

      // 🆕 排他グループ対応: enabled/disabled イベント時にトグルスイッチを同期
      if (event.type === "enabled" || event.type === "disabled") {
        this.syncModuleToggle(event.moduleId, event.type === "enabled");
        this.updateModuleStatus(event.moduleId);
      }
    });

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

          // WatchPageModuleの場合、サブモジュールも追加
          if (config.id === "watch_page") {
            this.renderWatchPageSubModules(container);
          }
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
   * WatchPageModuleのサブモジュールをレンダリング
   */
  private renderWatchPageSubModules(container: HTMLElement): void {
    const watchPageModule = this.moduleManager
      .getLoadedModulesMap()
      .get("watch_page") as WatchPageModule;

    if (watchPageModule) {
      const subModules = watchPageModule.getSubModules();

      // サブモジュールコンテナを作成
      const subContainer = document.createElement("div");
      subContainer.className = "sub-modules-container";
      subContainer.innerHTML = `
        <div class="sub-modules-header">
          <h6>${createMaterialIcon("movie", { style: "outlined", color: "white" })} Watch Page サブモジュール</h6>
          <span class="sub-modules-description">個別に有効/無効を切り替えできます</span>
        </div>
        <div class="sub-modules-list"></div>
      `;

      const subList = subContainer.querySelector(
        ".sub-modules-list",
      ) as HTMLElement;

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
    pages.textContent = config.targetPages.join(", ");

    const exclusiveGroup = element.querySelector(
      ".module-exclusive-group",
    ) as HTMLElement;
    if (config.exclusiveGroup) {
      exclusiveGroup.textContent = `排他: ${config.exclusiveGroup}`;
      exclusiveGroup.style.display = "inline";
    } else {
      exclusiveGroup.style.display = "none";
    }

    // ステータス設定
    const status = element.querySelector(".module-status") as HTMLElement;
    const moduleStatus = this.moduleManager.getModuleStatus(config.id);
    status.textContent = this.getStatusText(moduleStatus);
    status.className = `module-status ${moduleStatus.toLowerCase()}`;

    // トグルスイッチ設定
    const toggle = element.querySelector(".module-toggle") as HTMLInputElement;
    toggle.checked = this.settingsManager.isModuleEnabled(config.id);

    return moduleItem;
  }

  /**
   * サブモジュール要素を作成
   */
  private createSubModuleElement(subModule: {
    id: string;
    name: string;
    description: string;
    enabled: boolean;
    isActive: () => boolean;
  }): HTMLElement {
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
  private setupEventListeners(): void {
    if (!this.shadowRoot) {
      window.logger.error("[SettingsUI] Shadow DOMが設定されていません");
      return;
    }

    // モジュールトグルイベント（Shadow DOM内でイベントを監視）
    this.shadowRoot.addEventListener("change", (event) => {
      const target = event.target as HTMLInputElement;

      if (target.classList.contains("module-toggle")) {
        void this.handleModuleToggle(target);
      } else if (target.classList.contains("sub-module-toggle")) {
        void this.handleSubModuleToggle(target);
      }
    });

    // アクションボタンイベント
    this.setupActionButtons();
  }

  /**
   * モジュールトグルを処理
   */
  private async handleModuleToggle(toggle: HTMLInputElement): Promise<void> {
    const moduleItem = toggle.closest(".module-item") as HTMLElement;
    const moduleId = moduleItem.getAttribute("data-module-id");

    if (!moduleId) return;

    try {
      await this.moduleManager.toggleModule(moduleId, toggle.checked);

      // ステータス更新
      this.updateModuleStatus(moduleId);

      // WatchPageModuleの場合、サブモジュール表示を更新
      if (moduleId === "watch_page") {
        this.refreshWatchPageSubModules();
      }
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
   * サブモジュールトグルを処理
   */
  private async handleSubModuleToggle(toggle: HTMLInputElement): Promise<void> {
    const subModuleItem = toggle.closest(".sub-module-item") as HTMLElement;
    const subModuleId = subModuleItem.getAttribute("data-sub-module-id");

    if (!subModuleId) return;

    try {
      const watchPageModule = this.moduleManager
        .getLoadedModulesMap()
        .get("watch_page") as WatchPageModule;

      if (watchPageModule) {
        await watchPageModule.toggleSubModule(subModuleId, toggle.checked);

        // ステータス更新
        this.updateSubModuleStatus(subModuleId);
      }
    } catch (error) {
      window.logger.error(
        `[SettingsUI] サブモジュール ${subModuleId} の切り替えに失敗:`,
        error,
      );

      // エラー時はトグルを元に戻す
      toggle.checked = !toggle.checked;

      // エラー通知
      window.toastr?.error(
        `サブモジュール ${subModuleId} の切り替えに失敗しました`,
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
    if (applyBtn) {
      applyBtn.addEventListener("click", () => {
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
            window.toastr?.error(
              "モジュール再読み込みに失敗しました",
              "エラー",
              { timeOut: 5000 },
            );
          }
        })();
      });
    }

    // 再読み込みして適用ボタン
    const reloadBtn = this.shadowRoot.getElementById("reload-and-apply");
    if (reloadBtn) {
      reloadBtn.addEventListener("click", () => {
        window.location.reload();
      });
    }

    // 設定エクスポートボタン
    const exportBtn = this.shadowRoot.getElementById("export-settings");
    if (exportBtn) {
      exportBtn.addEventListener("click", () => {
        void this.exportSettings();
      });
    }

    // 設定インポートボタン
    const importBtn = this.shadowRoot.getElementById("import-settings");
    if (importBtn) {
      importBtn.addEventListener("click", () => {
        void this.importSettings();
      });
    }

    // 設定リセットボタン
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
  private updateModuleStatus(moduleId: string): void {
    if (!this.shadowRoot) return;

    const moduleItem = this.shadowRoot.querySelector(
      `[data-module-id="${moduleId}"]`,
    );
    if (moduleItem) {
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

  /**
   * サブモジュールステータスを更新
   */
  private updateSubModuleStatus(subModuleId: string): void {
    if (!this.shadowRoot) return;

    const subModuleItem = this.shadowRoot.querySelector(
      `[data-sub-module-id="${subModuleId}"]`,
    );
    if (subModuleItem) {
      const watchPageModule = this.moduleManager
        .getLoadedModulesMap()
        .get("watch_page") as WatchPageModule;
      if (watchPageModule) {
        const subModule = watchPageModule
          .getSubModules()
          .find((sub) => sub.id === subModuleId);
        if (subModule) {
          const status = subModuleItem.querySelector(
            ".sub-module-status",
          ) as HTMLElement;
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
  private refreshWatchPageSubModules(): void {
    if (!this.shadowRoot) return;

    const functionalityContainer = this.shadowRoot.getElementById(
      "functionality-modules",
    );
    if (functionalityContainer) {
      // 既存のサブモジュールコンテナを削除
      const existingSubContainer = functionalityContainer.querySelector(
        ".sub-modules-container",
      );
      if (existingSubContainer) {
        existingSubContainer.remove();
      }

      // WatchPageModuleが有効な場合のみサブモジュールを表示
      if (this.settingsManager.isModuleEnabled("watch_page")) {
        this.renderWatchPageSubModules(functionalityContainer);
      }
    }
  }

  /**
   * ステータステキストを取得
   */
  private getStatusText(status: ModuleStatus): string {
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
  private exportSettings(): void {
    try {
      const settings = this.settingsManager.exportSettings();
      const blob = new Blob([JSON.stringify(settings, null, 2)], {
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

    // イベントリスナーを設定
    this.setupBackgroundModalEventListeners();

    // 画像リストを初期化
    void this.refreshModalImageList();
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
      urlInput.value = "";
      nameInput.value = "";

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
