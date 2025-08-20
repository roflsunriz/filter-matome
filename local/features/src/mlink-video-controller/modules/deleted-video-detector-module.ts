import { ModuleInstance, ModuleConfig, ModuleStatus } from '@/types/module-types';
import { DeletedVideoDetectorStatus } from '@/types/video-types';
import { DeletedVideoDetector } from '../services/deleted-video-detector';

/**
 * 削除動画検出モジュールのラッパークラス
 * ModuleInstanceインターフェースに対応
 */
export class DeletedVideoDetectorModule implements ModuleInstance {
  public readonly config: ModuleConfig;
  private detector: DeletedVideoDetector;
  private isInitialized: boolean = false;

  constructor(config: ModuleConfig) {
    this.config = config;
    this.detector = DeletedVideoDetector.getInstance();
  }

  /**
   * モジュールを初期化
   */
  public async initialize(): Promise<void> {
    try {
      
      
      await this.detector.enable();
      this.isInitialized = true;
      
      
    } catch (error) {
      window.logger.error(`[${this.config.id}] 初期化中にエラーが発生しました:`, error);
      throw error;
    }
  }

  /**
   * モジュールを破棄
   */
  public destroy(): void {
    try {
      
      
      this.detector.disable();
      this.isInitialized = false;
      
      
    } catch (error) {
      window.logger.error(`[${this.config.id}] 破棄中にエラーが発生しました:`, error);
    }
  }

  /**
   * モジュールがアクティブかチェック
   */
  public isActive(): boolean {
    if (!this.isInitialized) {
      return false;
    }

    try {
      const status = this.detector.getStatus();
      return status.enabled && status.initialized;
    } catch (error) {
      window.logger.error(`[${this.config.id}] アクティブ状態の確認中にエラーが発生しました:`, error);
      return false;
    }
  }

  /**
   * モジュールの状態を取得
   */
  public getStatus(): ModuleStatus {
    if (!this.isInitialized) {
      return ModuleStatus.INACTIVE;
    }

    try {
      const detectorStatus = this.detector.getStatus();
      
      if (detectorStatus.enabled && detectorStatus.initialized) {
        return ModuleStatus.ACTIVE;
      } else if (detectorStatus.initialized) {
        return ModuleStatus.INACTIVE;
      } else {
        return ModuleStatus.LOADING;
      }
    } catch (error) {
      window.logger.error(`[${this.config.id}] 状態取得中にエラーが発生しました:`, error);
      return ModuleStatus.ERROR;
    }
  }

  /**
   * モジュール固有の情報を取得
   */
  public getModuleInfo(): { detectorStatus: DeletedVideoDetectorStatus } {
    try {
      return {
        detectorStatus: this.detector.getStatus()
      };
    } catch (error) {
      window.logger.error(`[${this.config.id}] モジュール情報の取得中にエラーが発生しました:`, error);
      return {
        detectorStatus: { enabled: false, initialized: false }
      };
    }
  }
} 