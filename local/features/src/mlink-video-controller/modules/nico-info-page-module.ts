import { ModuleInstance, ModuleConfig, ModuleStatus } from '../../types/module-types';

/**
 * ニコニコインフォページモジュール
 * デイリー福引をハイライト表示する機能
 */
export class NicoInfoPageModule implements ModuleInstance {
  public config: ModuleConfig;
  private active: boolean = false;
  private lastHash: string = '';
  private readonly MAX_ITEMS = 300;
  private readonly debugOutput = false;

  constructor(config: ModuleConfig) {
    this.config = config;
  }

  async initialize(): Promise<void> {
    try {
      
      
      // 依存関係チェック
      if (!this.checkDependencies()) {
        throw new Error('必要な依存関係が見つかりません (window.toastr)');
      }

      // イベントリスナーを設定
      this.setupEventListeners();
      
      // 初期実行
      this.restyler();
      this.showStartupToast();
      
      this.active = true;
      
    } catch (error) {
      window.logger.error('[NicoInfoPageModule] 初期化に失敗しました:', error);
      throw error;
    }
  }

  destroy(): void {
    try {
      
      
      // イベントリスナーを削除
      this.removeEventListeners();
      
      // スタイルをリセット
      this.resetStyles();
      
      this.active = false;
      
    } catch (error) {
      window.logger.error('[NicoInfoPageModule] 停止処理に失敗しました:', error);
    }
  }

  isActive(): boolean {
    return this.active;
  }

  getStatus(): ModuleStatus {
    if (!this.active) {
      return ModuleStatus.INACTIVE;
    }
    return ModuleStatus.ACTIVE;
  }

  /**
   * 依存関係をチェック
   */
  private checkDependencies(): boolean {
    return typeof window !== 'undefined' && 
           window.toastr && 
           typeof window.toastr.info === 'function';
  }

  /**
   * イベントリスナーを設定
   */
  private setupEventListeners(): void {
    // load イベントは既に発生している可能性があるので、即座に実行
    if (document.readyState === 'complete') {
      this.handleLoad();
    } else {
      window.addEventListener('load', this.handleLoad.bind(this));
    }

    // hashchange イベント
    window.addEventListener('hashchange', this.handleHashChange.bind(this));
  }

  /**
   * イベントリスナーを削除
   */
  private removeEventListeners(): void {
    window.removeEventListener('load', this.handleLoad.bind(this));
    window.removeEventListener('hashchange', this.handleHashChange.bind(this));
  }

  /**
   * load イベントハンドラ
   */
  private handleLoad(): void {
    this.restyler();
  }

  /**
   * hashchange イベントハンドラ
   */
  private handleHashChange(): void {
    const currentHashValue = this.currentHash();
    this.lastHash = currentHashValue;
    this.restyler();
  }

  /**
   * スタートアップトーストを表示
   */
  private showStartupToast(): void {
    try {
      window.toastr.info(
        "",
        "NicoInfoPageModuleの動作を開始しました",
        { timeOut: 5000 }
      );
    } catch (error) {
      window.logger.error('[NicoInfoPageModule] トースト表示でエラー:', error);
    }
  }

  /**
   * デイリー福引をハイライト表示
   */
  private restyler(): void {
    try {

      for (let i = 0; i < this.MAX_ITEMS; i++) {
        const dateElement = document.getElementsByClassName("l-main l-main-list2-date")[i] as HTMLElement | undefined;
        const titleElement = document.getElementsByClassName("l-main l-main-list2-title")[i] as HTMLElement | undefined;
        const itemElement = document.getElementsByClassName("l-main l-main-list2-item")[i] as HTMLElement | undefined;

        if (!dateElement) break;
        if (!titleElement || !itemElement) continue;


        if (!titleElement.innerText.match(/.*?デイリー福引.*?/)) {
          // デイリー福引以外の項目は薄い色にする
          dateElement.style.color = "LightSteelBlue";
          titleElement.style.color = "LightSteelBlue";
        } else {
          // デイリー福引の項目は赤い枠でハイライト
          itemElement.style.outline = "solid 3px red";
        }
      }

    } catch (error) {
      window.logger.error('[NicoInfoPageModule] restyler でエラー:', error);
    }
  }

  /**
   * スタイルをリセット
   */
  private resetStyles(): void {
    try {
      for (let i = 0; i < this.MAX_ITEMS; i++) {
        const dateElement = document.getElementsByClassName("l-main l-main-list2-date")[i] as HTMLElement | undefined;
        const titleElement = document.getElementsByClassName("l-main l-main-list2-title")[i] as HTMLElement | undefined;
        const itemElement = document.getElementsByClassName("l-main l-main-list2-item")[i] as HTMLElement | undefined;

        if (!dateElement) break;

        // スタイルをリセット
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
      window.logger.error('[NicoInfoPageModule] スタイルリセットでエラー:', error);
    }
  }

  /**
   * 現在のハッシュ値を取得
   */
  private currentHash(): string {
    return location.hash.replace(/^#/, "");
  }
} 