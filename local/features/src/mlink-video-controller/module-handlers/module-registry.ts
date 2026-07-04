import { ModuleConfig, ModuleCategory, PageType } from "@/types/module-types";
import { headerModuleConfig } from "@/mlink-video-controller/modules/header-module";
import { nicoInfoPageModuleConfig } from "@/mlink-video-controller/modules/nico-info-page-module";
import { watchPageModuleConfig } from "@/mlink-video-controller/modules/watch-page-module";
import { watchBackgroundSelectorModuleConfig } from "@/mlink-video-controller/modules/watch-background-selector-module";
import { watchMatrixBackgroundModuleConfig } from "@/mlink-video-controller/modules/watch-matrix-background-module";
import { watchHarajukuModuleConfig } from "@/mlink-video-controller/modules/watch-harajuku-module";
import { watchMylistSelectorModuleConfig } from "@/mlink-video-controller/modules/watch-mylist-selector-module";
import { watchTabSessionsModuleConfig } from "@/mlink-video-controller/modules/watch-tab-sessions-module";
import { thumbnailsFilterModuleConfig } from "@/mlink-video-controller/modules/thumbnails-filter-module";
import { deletedVideoDetectorModuleConfig } from "@/mlink-video-controller/modules/deleted-video-detector-module";

/**
 * 利用可能なモジュールの登録・管理を行うクラス
 */
export class ModuleRegistry {
  private static instance: ModuleRegistry;
  private modules: Map<string, ModuleConfig> = new Map();

  private constructor() {
    this.registerDefaultModules();
  }

  public static getInstance(): ModuleRegistry {
    if (!ModuleRegistry.instance) {
      ModuleRegistry.instance = new ModuleRegistry();
    }
    return ModuleRegistry.instance;
  }

  /**
   * デフォルトモジュールを登録
   */
  private registerDefaultModules(): void {
    [
      headerModuleConfig,
      nicoInfoPageModuleConfig,
      watchPageModuleConfig,
      watchBackgroundSelectorModuleConfig,
      watchMatrixBackgroundModuleConfig,
      watchHarajukuModuleConfig,
      watchMylistSelectorModuleConfig,
      watchTabSessionsModuleConfig,
      thumbnailsFilterModuleConfig,
      deletedVideoDetectorModuleConfig,
    ].forEach((config) => {
      this.registerModule(config);
    });
  }

  /**
   * モジュールを登録
   */
  public registerModule(config: ModuleConfig): void {
    if (this.modules.has(config.id)) {
      window.logger.warn(
        `[ModuleRegistry] モジュール ${config.id} は既に登録されています`,
      );
      return;
    }

    this.modules.set(config.id, config);
  }

  /**
   * モジュール設定を取得
   */
  public getConfig(moduleId: string): ModuleConfig | null {
    return this.modules.get(moduleId) || null;
  }

  /**
   * 全モジュール設定を取得
   */
  public getAllConfigs(): ModuleConfig[] {
    return Array.from(this.modules.values());
  }

  /**
   * カテゴリ別にモジュールを取得
   */
  public getModulesByCategory(category: ModuleCategory): ModuleConfig[] {
    return this.getAllConfigs().filter(
      (config) => config.category === category,
    );
  }

  /**
   * ページタイプ別にモジュールを取得
   */
  public getModulesByPage(pageType: PageType): ModuleConfig[] {
    return this.getAllConfigs().filter(
      (config) =>
        config.targetPages.includes(pageType) ||
        config.targetPages.includes(PageType.ALL),
    );
  }

  /**
   * モジュールが存在するかチェック
   */
  public hasModule(moduleId: string): boolean {
    return this.modules.has(moduleId);
  }

  /**
   * モジュールを削除
   */
  public unregisterModule(moduleId: string): boolean {
    if (this.modules.has(moduleId)) {
      this.modules.delete(moduleId);

      return true;
    }
    return false;
  }

  /**
   * 依存関係を持つモジュールを取得
   */
  public getModulesWithDependencies(): ModuleConfig[] {
    return this.getAllConfigs().filter(
      (config) => config.dependencies.length > 0,
    );
  }

  /**
   * 特定の依存関係を持つモジュールを取得
   */
  public getModulesByDependency(dependency: string): ModuleConfig[] {
    return this.getAllConfigs().filter((config) =>
      config.dependencies.includes(dependency),
    );
  }

  /**
   * モジュール統計情報を取得
   */
  public getStatistics(): {
    total: number;
    byCategory: Record<ModuleCategory, number>;
    byPage: Record<PageType, number>;
    withDependencies: number;
  } {
    const configs = this.getAllConfigs();

    const byCategory = {} as Record<ModuleCategory, number>;
    const byPage = {} as Record<PageType, number>;

    // カテゴリ別集計
    Object.values(ModuleCategory).forEach((category) => {
      byCategory[category] = configs.filter(
        (c) => c.category === category,
      ).length;
    });

    // ページ別集計
    Object.values(PageType).forEach((pageType) => {
      byPage[pageType] = configs.filter(
        (c) =>
          c.targetPages.includes(pageType) ||
          c.targetPages.includes(PageType.ALL),
      ).length;
    });

    return {
      total: configs.length,
      byCategory,
      byPage,
      withDependencies: this.getModulesWithDependencies().length,
    };
  }
}
