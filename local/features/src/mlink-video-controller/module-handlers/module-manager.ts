import {
  ModuleInstance,
  ModuleConfig,
  ModuleStatus,
  PageType,
  ModuleEvent,
  ModuleEventListener,
  PageDetector,
  DependencyChecker,
  ModuleCategory,
} from "@/types/module-types";
import { isWatchLikePage } from "@/mlink-video-controller/utils/page-detect";
import { SettingsManager } from "@/mlink-video-controller/module-handlers/settings-manager";
import { ModuleRegistry } from "@/mlink-video-controller/module-handlers/module-registry";

/**
 * ページタイプ検出クラス
 */
class PageDetectorImpl implements PageDetector {
  getCurrentPageType(): PageType {
    const url = window.location.href;
    const pathname = window.location.pathname;

    if (isWatchLikePage()) {
      return PageType.WATCH;
    } else if (pathname.includes("/search/")) {
      return PageType.SEARCH;
    } else if (pathname.includes("/tag/")) {
      return PageType.SEARCH;
    } else if (pathname.includes("/ranking/")) {
      return PageType.RANKING;
    } else if (
      url.startsWith("https://blog.nicovideo.jp/niconews/category/nicoad/")
    ) {
      return PageType.NICO_INFO;
    }

    return PageType.ALL;
  }

  isTargetPage(targetPages: PageType[]): boolean {
    const currentPage = this.getCurrentPageType();
    return (
      targetPages.includes(currentPage) || targetPages.includes(PageType.ALL)
    );
  }
}

/**
 * 依存関係チェッククラス
 */
class DependencyCheckerImpl implements DependencyChecker {
  async checkDependencies(dependencies: string[]): Promise<boolean> {
    await Promise.resolve();
    for (const dependency of dependencies) {
      if (!this.getDependencyStatus(dependency)) {
        window.logger.warn(
          `[DependencyChecker] 依存関係 ${dependency} が見つかりません`,
        );
        return false;
      }
    }
    return true;
  }

  getDependencyStatus(dependency: string): boolean {
    try {
      // window オブジェクトのプロパティをチェック
      if (dependency.startsWith("window.")) {
        const propPath = dependency.substring(7); // 'window.' を除去
        const props = propPath.split(".");
        let obj: unknown = window;

        for (const prop of props) {
          if (obj && typeof obj === "object" && obj !== null && prop in obj) {
            obj = (obj as Record<string, unknown>)[prop];
          } else {
            return false;
          }
        }
        return obj !== undefined;
      }

      // グローバル関数をチェック
      if (
        typeof (window as unknown as Record<string, unknown>)[dependency] ===
        "function"
      ) {
        return true;
      }

      return false;
    } catch (error) {
      window.logger.error(
        `[DependencyChecker] 依存関係チェック中にエラー: ${dependency}`,
        error,
      );
      return false;
    }
  }
}

/**
 * モジュールの読み込み・管理を行うメインクラス
 */
export class ModuleManager {
  private static instance: ModuleManager;
  private modules: Map<string, ModuleInstance> = new Map();
  private settings: SettingsManager;
  private registry: ModuleRegistry;
  private pageDetector: PageDetector;
  private dependencyChecker: DependencyChecker;
  private eventListeners: Set<ModuleEventListener> = new Set();
  private isInitialized: boolean = false;

  private constructor() {
    this.settings = SettingsManager.getInstance();
    this.registry = ModuleRegistry.getInstance();
    this.pageDetector = new PageDetectorImpl();
    this.dependencyChecker = new DependencyCheckerImpl();
  }

  public static getInstance(): ModuleManager {
    if (!ModuleManager.instance) {
      ModuleManager.instance = new ModuleManager();
    }
    return ModuleManager.instance;
  }

  /**
   * モジュールマネージャーを初期化（最速化版）
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      await Promise.resolve();
      return;
    }

    try {
      // 現在のページタイプを取得
      const currentPageType = this.pageDetector.getCurrentPageType();

      // 現在のページに対応するモジュールを取得
      const targetModules = this.registry.getModulesByPage(currentPageType);

      // 有効なモジュールのみを抽出
      const enabledModules = targetModules.filter((config) =>
        this.settings.isModuleEnabled(config.id),
      );

      // 【最優先】ビジュアル系モジュールを特定
      const visualModules = enabledModules.filter(
        (config) => config.category === ModuleCategory.VISUAL,
      );

      // その他のモジュールを特定
      const otherModules = enabledModules.filter(
        (config) => config.category !== ModuleCategory.VISUAL,
      );

      // 【最優先】ビジュアル系モジュールを並列で最速初期化
      if (visualModules.length > 0) {
        const visualPromises = visualModules.map((config) =>
          this.loadModuleWithPriority(config.id, "VISUAL"),
        );

        // ビジュアル系モジュールの初期化を並列実行（最速）
        await Promise.all(visualPromises);
      }

      // その他のモジュールを並列で初期化（ビジュアル系に影響しない）
      if (otherModules.length > 0) {
        const otherPromises = otherModules.map((config) =>
          this.loadModuleWithPriority(config.id, "NORMAL"),
        );

        // その他のモジュールを並列実行（エラーがあっても他に影響しない）
        await Promise.allSettled(otherPromises);
      }

      this.isInitialized = true;
    } catch (error) {
      window.logger.error(
        "[ModuleManager] 初期化中にエラーが発生しました:",
        error,
      );
      throw error;
    }
  }

  /**
   * SPA遷移時にモジュールを再初期化（完全なSPA対応）
   */
  public async reinitializeForSPA(): Promise<void> {
    try {
      window.logger?.info(
        "[ModuleManager] Reinitializing modules for SPA navigation",
      );

      // 現在のページタイプを取得
      const currentPageType = this.pageDetector.getCurrentPageType();

      // 全モジュールをチェックして、ページ対応していないものは破棄
      for (const [moduleId, instance] of this.modules.entries()) {
        const config = this.registry.getConfig(moduleId);
        if (!config) continue;

        // ページ判定: 現在のページに対応していないモジュールを破棄
        if (!this.pageDetector.isTargetPage(config.targetPages)) {
          window.logger?.debug(
            `[ModuleManager] Unloading module ${moduleId} (not for current page)`,
          );
          await this.unloadModule(moduleId);
        } else if (instance.onSPANavigate) {
          // モジュールがSPA遷移ハンドラーを持っている場合は呼び出し
          window.logger?.debug(
            `[ModuleManager] Calling onSPANavigate for module ${moduleId}`,
          );
          await instance.onSPANavigate();
        }
      }

      // 現在のページに必要なモジュールで未読み込みのものを読み込み
      const targetModules = this.registry.getModulesByPage(currentPageType);
      const enabledModules = targetModules.filter(
        (config) =>
          this.settings.isModuleEnabled(config.id) &&
          !this.modules.has(config.id),
      );

      if (enabledModules.length > 0) {
        window.logger?.info(
          `[ModuleManager] Loading ${enabledModules.length} new modules for current page`,
        );

        const loadPromises = enabledModules.map((config) =>
          this.loadModule(config.id),
        );
        await Promise.allSettled(loadPromises);
      }

      window.logger?.info(
        "[ModuleManager] SPA navigation reinitialization completed",
      );
    } catch (error) {
      window.logger.error(
        "[ModuleManager] SPA reinitialization failed:",
        error,
      );
    }
  }

  /**
   * 優先度付きモジュール読み込み（新規追加）
   */
  private async loadModuleWithPriority(
    moduleId: string,
    priority: "VISUAL" | "NORMAL",
  ): Promise<void> {
    const startTime = performance.now();

    try {
      await this.loadModule(moduleId);
    } catch (error) {
      const endTime = performance.now();
      const loadTime = Math.round(endTime - startTime);
      window.logger.error(
        `[ModuleManager] ${priority}優先度モジュール ${moduleId} の読み込み失敗 (${loadTime}ms):`,
        error,
      );

      // ビジュアル系モジュールのエラーは重要なので再スロー
      if (priority === "VISUAL") {
        throw error;
      }

      // その他のモジュールのエラーは警告のみ（他のモジュールに影響させない）
      window.logger.warn(
        `[ModuleManager] モジュール ${moduleId} の読み込みを続行します`,
      );
    }
  }

  /**
   * モジュールを読み込み
   */
  public async loadModule(moduleId: string): Promise<void> {
    try {
      // 既に読み込み済みかチェック
      if (this.modules.has(moduleId)) {
        return;
      }

      // モジュール設定を取得
      const config = this.registry.getConfig(moduleId);
      if (!config) {
        throw new Error(`モジュール ${moduleId} が見つかりません`);
      }

      // 有効状態をチェック
      if (!this.settings.isModuleEnabled(moduleId)) {
        return;
      }

      // ページ判定
      if (!this.pageDetector.isTargetPage(config.targetPages)) {
        return;
      }

      // 依存関係チェック
      const dependenciesOk = await this.dependencyChecker.checkDependencies(
        config.dependencies,
      );
      if (!dependenciesOk) {
        throw new Error(
          `モジュール ${moduleId} の依存関係が満たされていません`,
        );
      }

      // モジュールインスタンスを作成
      const moduleInstance = await this.createModuleInstance(config);

      // モジュールを初期化
      await moduleInstance.initialize();

      // 管理対象に追加
      this.modules.set(moduleId, moduleInstance);

      // イベント通知
      this.emitEvent({
        type: "loaded",
        moduleId,
        data: { config },
      });
    } catch (error) {
      window.logger.error(
        `[ModuleManager] モジュール ${moduleId} の読み込みに失敗しました:`,
        error,
      );

      // エラーイベント通知
      this.emitEvent({
        type: "error",
        moduleId,
        data: { error: error instanceof Error ? error.message : String(error) },
      });

      throw error;
    }
  }

  /**
   * モジュールを削除
   */
  public async unloadModule(moduleId: string): Promise<void> {
    try {
      const moduleInstance = this.modules.get(moduleId);
      if (!moduleInstance) {
        await Promise.resolve();
        return;
      }

      // モジュールを破棄
      moduleInstance.destroy();

      // 管理対象から削除
      this.modules.delete(moduleId);

      // イベント通知
      this.emitEvent({
        type: "unloaded",
        moduleId,
      });
    } catch (error) {
      window.logger.error(
        `[ModuleManager] モジュール ${moduleId} の削除に失敗しました:`,
        error,
      );
      throw error;
    }
  }

  /**
   * モジュールの有効/無効を切り替え
   */
  public async toggleModule(moduleId: string, enabled: boolean): Promise<void> {
    const previousEnabled = this.settings.isModuleEnabled(moduleId);

    try {
      if (enabled) {
        // 排他グループのチェック
        await this.handleExclusiveGroup(moduleId);

        this.settings.updateModuleEnabled(moduleId, true);
        await this.loadModule(moduleId);
        this.emitEvent({ type: "enabled", moduleId });
      } else {
        await this.unloadModule(moduleId);
        this.settings.updateModuleEnabled(moduleId, false);
        this.emitEvent({ type: "disabled", moduleId });
      }
    } catch (error) {
      this.settings.updateModuleEnabled(moduleId, previousEnabled);

      window.logger.error(
        `[ModuleManager] モジュール ${moduleId} の切り替えに失敗しました:`,
        error,
      );
      throw error;
    }
  }

  /**
   * 🆕 新規追加: 排他グループの処理
   */
  private async handleExclusiveGroup(moduleId: string): Promise<void> {
    const config = this.registry.getConfig(moduleId);
    if (!config || !config.exclusiveGroup) {
      return; // 排他グループに属さない場合は何もしない
    }

    // 同じ排他グループの他のモジュールを無効化
    const allConfigs = this.registry.getAllConfigs();
    const sameGroupModules = allConfigs.filter(
      (c) => c.exclusiveGroup === config.exclusiveGroup && c.id !== moduleId,
    );

    for (const otherModule of sameGroupModules) {
      if (this.settings.isModuleEnabled(otherModule.id)) {
        // 他のモジュールを無効化
        await this.unloadModule(otherModule.id);
        this.settings.updateModuleEnabled(otherModule.id, false);
        this.emitEvent({ type: "disabled", moduleId: otherModule.id });
      }
    }
  }

  /**
   * モジュールインスタンスを作成（最速化版）
   */
  private async createModuleInstance(
    config: ModuleConfig,
  ): Promise<ModuleInstance> {
    try {
      await Promise.resolve();
      // 【最優先】ビジュアル系モジュールを先に処理
      if (config.category === ModuleCategory.VISUAL) {
        // ビジュアル系モジュールを最速で処理
        let instance: ModuleInstance;

        switch (config.id) {
          case "watch_background_selector": {
            const { WatchBackgroundSelectorModule } =
              await import("../modules/watch-background-selector-module");
            instance = new WatchBackgroundSelectorModule(config);
            break;
          }

          case "watch_matrix_background": {
            const { WatchMatrixBackgroundModule } =
              await import("../modules/watch-matrix-background-module");
            instance = new WatchMatrixBackgroundModule(config);
            break;
          }

          case "watch_harajuku": {
            const { WatchHarajukuModule } =
              await import("../modules/watch-harajuku-module");
            instance = new WatchHarajukuModule(config);
            break;
          }

          default:
            throw new Error(`未知のビジュアル系モジュールID: ${config.id}`);
        }

        return instance;
      }

      // その他のモジュールは通常通り処理
      let instance: ModuleInstance;

      switch (config.id) {
        case "header_privacy": {
          const { HeaderModule } = await import("../modules/header-module");
          instance = new HeaderModule(config);
          break;
        }

        case "daily_lottery_highlight": {
          const { NicoInfoPageModule } =
            await import("../modules/nico-info-page-module");
          instance = new NicoInfoPageModule(config);
          break;
        }

        case "watch_page": {
          const { WatchPageModule } =
            await import("../modules/watch-page-module");
          instance = new WatchPageModule();
          break;
        }

        case "watch_mylist_selector": {
          const { WatchMylistSelectorModule } =
            await import("../modules/watch-mylist-selector-module");
          instance = new WatchMylistSelectorModule(config);
          break;
        }

        case "watch_tab_sessions": {
          const { WatchTabSessionsModule } =
            await import("../modules/watch-tab-sessions-module");
          instance = new WatchTabSessionsModule(config);
          break;
        }

        case "thumbnails_filter": {
          const { ThumbnailsFilterModule } =
            await import("../modules/thumbnails-filter-module");
          instance = new ThumbnailsFilterModule(config);
          break;
        }

        default:
          throw new Error(`未知のモジュールID: ${config.id}`);
      }

      return instance;
    } catch (error) {
      window.logger.error(
        `[ModuleManager] モジュール ${config.id} の作成に失敗しました:`,
        error,
      );
      throw error;
    }
  }

  /**
   * プレースホルダーモジュールを作成
   */
  private createPlaceholderModule(config: ModuleConfig): ModuleInstance {
    return {
      config,
      async initialize(): Promise<void> {},
      destroy(): void {},
      isActive(): boolean {
        return true;
      },
      getStatus(): ModuleStatus {
        return ModuleStatus.ACTIVE;
      },
    };
  }

  /**
   * 読み込み済みモジュール一覧を取得
   */
  public getLoadedModules(): string[] {
    return Array.from(this.modules.keys());
  }

  /**
   * モジュールの状態を取得
   */
  public getModuleStatus(moduleId: string): ModuleStatus {
    const config = this.registry.getConfig(moduleId);
    if (config && !this.pageDetector.isTargetPage(config.targetPages)) {
      return ModuleStatus.UNAVAILABLE;
    }

    const moduleInstance = this.modules.get(moduleId);
    if (moduleInstance) {
      return moduleInstance.getStatus();
    }

    // モジュールが読み込まれていない場合、設定で有効になっているかチェック
    const isEnabled = this.settings.isModuleEnabled(moduleId);
    return isEnabled ? ModuleStatus.LOADING : ModuleStatus.INACTIVE;
  }

  /**
   * イベントリスナーを追加
   */
  public addEventListener(listener: ModuleEventListener): void {
    this.eventListeners.add(listener);
  }

  /**
   * イベントリスナーを削除
   */
  public removeEventListener(listener: ModuleEventListener): void {
    this.eventListeners.delete(listener);
  }

  /**
   * イベントを発行
   */
  private emitEvent(event: ModuleEvent): void {
    this.eventListeners.forEach((listener) => {
      try {
        listener(event);
      } catch (error) {
        window.logger.error(
          "[ModuleManager] イベントリスナーの実行中にエラーが発生しました:",
          error,
        );
      }
    });
  }

  /**
   * 全モジュールを再読み込み
   */
  public async reloadAllModules(): Promise<void> {
    // 現在読み込まれているモジュールを一旦削除
    const loadedModules = this.getLoadedModules();
    for (const moduleId of loadedModules) {
      await this.unloadModule(moduleId);
    }

    // 再初期化
    this.isInitialized = false;
    await this.initialize();
  }

  /**
   * 現在のページタイプを取得
   */
  public getCurrentPageType(): PageType {
    return this.pageDetector.getCurrentPageType();
  }

  /**
   * 読み込み済みモジュールのMapを取得（内部アクセス用）
   */
  public getLoadedModulesMap(): Map<string, ModuleInstance> {
    return this.modules;
  }
}
