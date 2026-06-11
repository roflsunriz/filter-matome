import { ModuleConfig, ModuleCategory, PageType } from "@/types/module-types";
import { createMaterialIcon } from "@/common/material-icons";

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
    // Header モジュール
    this.registerModule({
      id: "header_privacy",
      name: "ヘッダープライバシー",
      description: "ユーザーアイコンとユーザー名を非表示にします",
      version: "1.0.0",
      enabled: false,
      targetPages: [PageType.ALL],
      dependencies: ["window.logger"],
      category: ModuleCategory.PRIVACY,
      icon: createMaterialIcon("lock", { style: "outlined", color: "white" }),
    });

    // Nico Info Page モジュール
    this.registerModule({
      id: "daily_lottery_highlight",
      name: "デイリー福引ハイライト",
      description: "ニコニ広告のお知らせ内でデイリー福引をハイライト表示します",
      version: "1.0.0",
      enabled: false,
      targetPages: [PageType.NICO_INFO],
      dependencies: ["window.toastr"],
      category: ModuleCategory.UI_ENHANCEMENT,
      icon: createMaterialIcon("card_giftcard", {
        style: "outlined",
        color: "white",
      }),
    });

    // Watch Page 統合モジュール
    this.registerModule({
      id: "watch_page",
      name: "Watch Page統合",
      description:
        "Watch Pageの各種機能を統合管理（タグカウンター、ヘッダー一行化）",
      version: "1.2.0",
      enabled: false,
      targetPages: [PageType.WATCH],
      dependencies: [],
      category: ModuleCategory.FUNCTIONALITY,
      icon: createMaterialIcon("movie", { style: "outlined", color: "white" }),
    });

    // その他のWatch Pageモジュール
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
      exclusiveGroup: "watch_background",
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
      exclusiveGroup: "watch_background",
    });

    this.registerModule({
      id: "watch_harajuku",
      name: "原宿風Watch",
      description: "Watchページをニコニコ動画（原宿）風の表示に変更します",
      version: "1.0.0",
      enabled: false,
      targetPages: [PageType.WATCH],
      dependencies: [],
      category: ModuleCategory.VISUAL,
      icon: createMaterialIcon("palette", {
        style: "outlined",
        color: "white",
      }),
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
      icon: createMaterialIcon("edit", { style: "outlined", color: "white" }),
    });

    this.registerModule({
      id: "watch_tab_sessions",
      name: "タブセッション拡張",
      description: "Watchページのタブセッション制限を緩和します",
      version: "1.0.0",
      enabled: false,
      targetPages: [PageType.WATCH],
      dependencies: [],
      category: ModuleCategory.FUNCTIONALITY,
      icon: createMaterialIcon("tab", { style: "outlined", color: "white" }),
    });

    // Thumbnails Filter モジュール
    this.registerModule({
      id: "thumbnails_filter",
      name: "サムネイルフィルター",
      description: "キーワードに基づいて動画サムネイルを非表示にします",
      version: "1.0.0",
      enabled: false,
      targetPages: [PageType.ALL],
      dependencies: ["window.toastr"],
      category: ModuleCategory.FUNCTIONALITY,
      icon: createMaterialIcon("block", { style: "outlined", color: "white" }),
    });

    // Deleted Video Detector モジュール
    this.registerModule({
      id: "deleted_video_detector",
      name: "削除動画検出器",
      description:
        "削除された動画を検出してローカルプレイヤーにリダイレクトします",
      version: "1.0.0",
      enabled: false,
      targetPages: [PageType.WATCH],
      dependencies: [],
      category: ModuleCategory.FUNCTIONALITY,
      icon: createMaterialIcon("link", { style: "outlined", color: "white" }),
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
