/**
 * 背景画像設定管理クラス
 * IndexedDBを使用して背景画像の設定を保存・管理する
 */

import { BackgroundImageItem } from "@/types/background-image-types";
import { BackgroundImageStorageCore } from "./background-image-storage-core";

// データベース設定
const STORE_NAME = "backgroundImages";
const DB_VERSION = 2; // バージョンアップ：マイグレーション機能対応
const METADATA_STORE_NAME = "metadata";

/** バックアップ・修復・設定入出力を公開する背景画像設定。 */
export class BackgroundImageSettings extends BackgroundImageStorageCore {
  private static instance: BackgroundImageSettings;

  public static getInstance(): BackgroundImageSettings {
    if (!BackgroundImageSettings.instance) {
      BackgroundImageSettings.instance = new BackgroundImageSettings();
    }
    return BackgroundImageSettings.instance;
  }
  private constructor() {
    super();
  }

  /**
   * ユニークIDを生成
   */
  protected generateId(): string {
    return `bg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * バックアップリストを取得
   */
  public getAvailableBackups(): Array<{
    key: string;
    timestamp: string;
    size: number;
  }> {
    try {
      const backups: Array<{ key: string; timestamp: string; size: number }> =
        [];

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith("autoBackup_")) {
          const timestamp = key.replace("autoBackup_", "");
          const data = localStorage.getItem(key);
          const size = data ? data.length : 0;

          backups.push({ key, timestamp, size });
        }
      }

      // 日付でソート（新しい順）
      backups.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

      return backups;
    } catch (error) {
      window.logger.error(
        "[BackgroundImageSettings] バックアップリスト取得エラー:",
        error,
      );
      return [];
    }
  }

  /**
   * バックアップからデータを復元
   */
  public async restoreFromBackup(backupKey: string): Promise<void> {
    try {
      const backupData = localStorage.getItem(backupKey);
      if (!backupData) {
        throw new Error(`バックアップが見つかりません: ${backupKey}`);
      }

      window.logger.info(
        `[BackgroundImageSettings] バックアップからの復元を開始: ${backupKey}`,
      );

      // 現在のデータをバックアップしてから復元
      await this.createAutoBackup();

      // バックアップデータをインポート
      await this.importSettings(backupData);

      window.logger.info(
        "[BackgroundImageSettings] バックアップからの復元が完了しました",
      );

      this.dispatchEvent(
        new CustomEvent("restoredFromBackup", {
          detail: { backupKey },
        }),
      );
    } catch (error) {
      window.logger.error(
        "[BackgroundImageSettings] バックアップ復元エラー:",
        error,
      );
      throw error;
    }
  }

  /**
   * データベースの修復を試行
   */
  public async repairDatabase(): Promise<boolean> {
    try {
      window.logger.info("[BackgroundImageSettings] データベース修復を開始");

      // データベースを閉じる
      this.closeDB();

      // データベースを再度開く
      await this.initializeDB();

      // 整合性チェック
      const isValid = await this.validateDatabaseIntegrity();

      if (isValid) {
        window.logger.info(
          "[BackgroundImageSettings] データベース修復が完了しました",
        );

        this.dispatchEvent(
          new CustomEvent("databaseRepaired", {
            detail: { success: true },
          }),
        );

        return true;
      } else {
        // 修復に失敗した場合、最新のバックアップから復元を試行
        window.logger.warn(
          "[BackgroundImageSettings] データベース修復に失敗、バックアップからの復元を試行",
        );

        const backups = this.getAvailableBackups();
        if (backups.length > 0) {
          await this.restoreFromBackup(backups[0].key);
          return true;
        }

        // バックアップもない場合、デフォルトにリセット
        window.logger.warn(
          "[BackgroundImageSettings] バックアップが見つからない、デフォルト設定にリセット",
        );
        await this.resetToDefaults();
        return true;
      }
    } catch (error) {
      window.logger.error(
        "[BackgroundImageSettings] データベース修復エラー:",
        error,
      );

      this.dispatchEvent(
        new CustomEvent("databaseRepaired", {
          detail: {
            success: false,
            error: error instanceof Error ? error.message : String(error),
          },
        }),
      );

      return false;
    }
  }

  /**
   * マイグレーション履歴を取得
   */
  public async getMigrationHistory(): Promise<
    Array<{
      fromVersion: number;
      toVersion: number;
      migratedAt: string;
      success: boolean;
    }>
  > {
    try {
      if (!this.db) {
        await this.initializeDB();
      }

      const transaction = this.db!.transaction(
        [METADATA_STORE_NAME],
        "readonly",
      );
      const store = transaction.objectStore(METADATA_STORE_NAME);

      return new Promise((resolve) => {
        const request = store.get("migrationHistory");

        request.onsuccess = () => {
          const result = request.result as unknown;
          const migrations =
            (
              result as {
                migrations?: {
                  fromVersion: number;
                  toVersion: number;
                  migratedAt: string;
                  success: boolean;
                }[];
              } | null
            )?.migrations ?? [];
          resolve(migrations);
        };

        request.onerror = () => {
          window.logger.warn(
            "[BackgroundImageSettings] マイグレーション履歴の取得に失敗",
          );
          resolve([]);
        };
      });
    } catch (error) {
      window.logger.error(
        "[BackgroundImageSettings] マイグレーション履歴取得エラー:",
        error,
      );
      return [];
    }
  }

  /**
   * システム状態を取得
   */
  public async getSystemStatus(): Promise<{
    databaseVersion: number;
    persistenceEnabled: boolean;
    migrationStatus: string;
    storageUsage: { usage: number; quota: number; persistent: boolean };
    integrityValid: boolean;
    backupCount: number;
  }> {
    try {
      const storageUsage = await this.getStorageUsage();
      const integrityValid = await this.validateDatabaseIntegrity();
      const backups = this.getAvailableBackups();

      return {
        databaseVersion: DB_VERSION,
        persistenceEnabled: this.persistenceEnabled,
        migrationStatus: this.migrationStatus,
        storageUsage,
        integrityValid,
        backupCount: backups.length,
      };
    } catch (error) {
      window.logger.error(
        "[BackgroundImageSettings] システム状態取得エラー:",
        error,
      );
      throw error;
    }
  }

  /**
   * データベースを閉じる
   */
  public closeDB(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
      window.logger.info("[BackgroundImageSettings] データベースを閉じました");
    }
  }

  /**
   * 設定をエクスポート
   */
  public async exportSettings(): Promise<string> {
    try {
      const images = await this.getAllImages();
      const selectedImageId = this.getSelectedImageId();

      const exportData = {
        version: "1.0.0",
        exportDate: new Date().toISOString(),
        images: images,
        selectedImageId: selectedImageId,
      };

      return JSON.stringify(exportData, null, 2);
    } catch (error) {
      window.logger.error(
        "[BackgroundImageSettings] 設定のエクスポートに失敗:",
        error,
      );
      throw error;
    }
  }

  /**
   * ユニークなファイル名を生成（エクスポート用）
   */
  public generateExportFilename(): string {
    const now = new Date();
    const dateStr = now.toISOString().split("T")[0]; // YYYY-MM-DD
    const timeStr = now.toTimeString().split(" ")[0].replace(/:/g, "-"); // HH-MM-SS
    const randomStr = Math.random().toString(36).substr(2, 4); // ランダム4文字

    return `background-image-settings-${dateStr}_${timeStr}_${randomStr}.json`;
  }

  /**
   * 設定をインポート
   */
  public async importSettings(jsonData: string): Promise<void> {
    try {
      const importData: unknown = JSON.parse(jsonData);
      const obj = importData as { images?: unknown; selectedImageId?: unknown };

      // データ形式の検証
      if (!Array.isArray(obj.images)) {
        throw new Error("無効なデータ形式です");
      }

      // 既存のデータを全て削除
      await this.clearAllImages();

      // インポートした画像を追加
      for (const imageData of obj.images as unknown[]) {
        const rec = imageData as Record<string, unknown>;
        if (
          typeof rec.id === "string" &&
          typeof rec.name === "string" &&
          (rec.type === "url" || rec.type === "file") &&
          typeof rec.data === "string"
        ) {
          await this.addImageWithId(
            rec.id,
            rec.name,
            rec.type,
            rec.data,
            typeof rec.createdAt === "string"
              ? rec.createdAt
              : new Date().toISOString(),
            typeof rec.updatedAt === "string"
              ? rec.updatedAt
              : new Date().toISOString(),
          );
        }
      }

      // 選択画像を復元
      if (typeof obj.selectedImageId === "string") {
        await this.setSelectedImage(obj.selectedImageId, false);
      }

      // インポート完了イベントを発火
      this.dispatchEvent(
        new CustomEvent("settingsImported", {
          detail: { imageCount: (obj.images as unknown[]).length },
        }),
      );
    } catch (error) {
      window.logger.error(
        "[BackgroundImageSettings] 設定のインポートに失敗:",
        error,
      );
      throw error;
    }
  }

  /**
   * デフォルト設定に戻す
   */
  public async resetToDefaults(): Promise<void> {
    try {
      // 既存のデータを全て削除
      await this.clearAllImages();

      // デフォルト画像を追加
      for (const defaultImage of this.DEFAULT_IMAGES) {
        await this.addImage(
          defaultImage.name,
          defaultImage.type,
          defaultImage.data,
        );
      }

      // 最初の画像を選択状態にする
      const images = await this.getAllImages();
      if (images.length > 0) {
        await this.setSelectedImage(images[0].id, false);
      }

      // リセット完了イベントを発火
      this.dispatchEvent(
        new CustomEvent("settingsReset", {
          detail: { imageCount: this.DEFAULT_IMAGES.length },
        }),
      );
    } catch (error) {
      window.logger.error(
        "[BackgroundImageSettings] デフォルト設定への復元に失敗:",
        error,
      );
      throw error;
    }
  }

  /**
   * 全ての画像を削除（内部用）
   */
  protected async clearAllImages(): Promise<void> {
    try {
      const db = await this.initializeDB();
      const transaction = db.transaction([STORE_NAME], "readwrite");
      const store = transaction.objectStore(STORE_NAME);

      return new Promise((resolve, reject) => {
        const request = store.clear();

        request.onsuccess = () => {
          resolve();
        };

        request.onerror = () => {
          window.logger.error(
            "[BackgroundImageSettings] 画像の全削除に失敗しました",
          );
          reject(new Error("画像の全削除に失敗しました"));
        };
      });
    } catch (error) {
      window.logger.error(
        "[BackgroundImageSettings] clearAllImages エラー:",
        error,
      );
      throw error;
    }
  }

  /**
   * 指定IDで画像を追加（インポート用）
   */
  protected async addImageWithId(
    id: string,
    name: string,
    type: "url" | "file",
    data: string,
    createdAt: string,
    updatedAt: string,
  ): Promise<void> {
    try {
      const db = await this.initializeDB();
      const transaction = db.transaction([STORE_NAME], "readwrite");
      const store = transaction.objectStore(STORE_NAME);

      const imageItem: BackgroundImageItem = {
        id,
        name,
        type,
        data,
        createdAt,
        updatedAt,
      };

      return new Promise((resolve, reject) => {
        const request = store.add(imageItem);

        request.onsuccess = () => {
          resolve();
        };

        request.onerror = () => {
          window.logger.error(
            `[BackgroundImageSettings] 画像の復元に失敗しました: ${name}`,
          );
          reject(new Error(`画像の復元に失敗しました: ${name}`));
        };
      });
    } catch (error) {
      window.logger.error(
        "[BackgroundImageSettings] addImageWithId エラー:",
        error,
      );
      throw error;
    }
  }
}
