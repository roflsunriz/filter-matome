import { ModuleSettings, ModuleConfigData } from "@/types/module-types";
import { ModuleRegistry } from "@/mlink-video-controller/module-handlers/module-registry";
import { normalizeModuleSettingsForRegistry } from "@/mlink-video-controller/module-handlers/settings-normalizer";

/**
 * モジュール設定の保存・読み込みを管理するクラス
 */
export class SettingsManager {
  private static instance: SettingsManager;
  private readonly STORAGE_KEY = "nicoVideoController_moduleSettings";
  private settings: ModuleSettings = {};
  private eventListeners: Set<(settings: ModuleSettings) => void> = new Set();

  private constructor() {
    this.loadSettings();
  }

  public static getInstance(): SettingsManager {
    if (!SettingsManager.instance) {
      SettingsManager.instance = new SettingsManager();
    }
    return SettingsManager.instance;
  }

  /**
   * ローカルストレージから設定を読み込み
   */
  private loadSettings(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const parsed: unknown = JSON.parse(stored);
        if (parsed && typeof parsed === "object") {
          this.settings = this.normalizeSettings(parsed);
          if (JSON.stringify(parsed) !== JSON.stringify(this.settings)) {
            this.saveSettings();
          }
        }
      }
    } catch (error) {
      window.logger.error(
        "[SettingsManager] 設定の読み込みに失敗しました:",
        error,
      );
      this.settings = {};
    }
  }

  private normalizeSettings(settings: unknown): ModuleSettings {
    const validModuleIds = ModuleRegistry.getInstance()
      .getAllConfigs()
      .map((config) => config.id);
    return normalizeModuleSettingsForRegistry(settings, validModuleIds);
  }

  /**
   * 設定をローカルストレージに保存
   */
  private saveSettings(): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.settings));

      // 設定変更を通知
      this.notifyListeners();
    } catch (error) {
      window.logger.error("[SettingsManager] 設定の保存に失敗しました:", error);
    }
  }

  /**
   * 特定モジュールの有効/無効状態を更新
   */
  public updateModuleEnabled(moduleId: string, enabled: boolean): void {
    if (!this.settings[moduleId]) {
      this.settings[moduleId] = { enabled: false };
    }

    this.settings[moduleId].enabled = enabled;
    this.saveSettings();
  }

  /**
   * 特定モジュールの有効状態を取得
   */
  public isModuleEnabled(moduleId: string): boolean {
    return this.settings[moduleId]?.enabled ?? false;
  }

  /**
   * 特定モジュールの設定を更新
   */
  public updateModuleConfig(moduleId: string, config: ModuleConfigData): void {
    if (!this.settings[moduleId]) {
      this.settings[moduleId] = { enabled: false };
    }

    this.settings[moduleId].config = {
      ...this.settings[moduleId].config,
      ...config,
    };
    this.saveSettings();
  }

  /**
   * 特定モジュールの設定を取得
   */
  public getModuleConfig(moduleId: string): ModuleConfigData {
    return this.settings[moduleId]?.config ?? {};
  }

  /**
   * 全設定を取得
   */
  public getAllSettings(): ModuleSettings {
    return { ...this.normalizeSettings(this.settings) };
  }

  /**
   * 設定をリセット
   */
  public resetSettings(): void {
    this.settings = {};
    this.saveSettings();
  }

  /**
   * 特定モジュールの設定をリセット
   */
  public resetModuleSettings(moduleId: string): void {
    delete this.settings[moduleId];
    this.saveSettings();
  }

  /**
   * 設定変更の監視を追加
   */
  public addSettingsListener(
    listener: (settings: ModuleSettings) => void,
  ): void {
    this.eventListeners.add(listener);
  }

  /**
   * 設定変更の監視を削除
   */
  public removeSettingsListener(
    listener: (settings: ModuleSettings) => void,
  ): void {
    this.eventListeners.delete(listener);
  }

  /**
   * 設定変更をリスナーに通知
   */
  private notifyListeners(): void {
    this.eventListeners.forEach((listener) => {
      try {
        listener(this.getAllSettings());
      } catch (error) {
        window.logger.error(
          "[SettingsManager] リスナーの実行中にエラーが発生しました:",
          error,
        );
      }
    });
  }

  /**
   * 設定のエクスポート（デバッグ用）
   */
  public exportSettings(): string {
    this.settings = this.normalizeSettings(this.settings);
    return JSON.stringify(this.settings, null, 2);
  }

  /**
   * 設定のインポート（デバッグ用）
   */
  public importSettings(settingsJson: string): boolean {
    try {
      const imported: unknown = JSON.parse(settingsJson);
      this.settings = this.normalizeSettings(imported);
      this.saveSettings();

      return true;
    } catch (error) {
      window.logger.error(
        "[SettingsManager] 設定のインポートに失敗しました:",
        error,
      );
      return false;
    }
  }
}
