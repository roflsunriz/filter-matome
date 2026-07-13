import { logger } from "@/common/logger";
import type {
  MigrationProgress,
  SeriesAlert,
} from "@/types/watch-history-types";
import { watchHistoryDB } from "@/watch-history/database";
import {
  getSeriesAlertExtensionStatus,
  replaceSeriesAlertsInExtension,
} from "@/watch-history/series-alert-extension-client";
import { WatchHistoryDeleteApp } from "@/watch-history/app-delete";

/** IndexedDBの永続化、移行、バックアップ、診断UIを提供する。 */
export abstract class WatchHistoryDatabaseAdminApp extends WatchHistoryDeleteApp {
  // ===== データベース管理関連メソッド =====

  /**
   * データベース管理モーダルを開く
   */
  protected async openDatabaseManagementModal(): Promise<void> {
    // 現在の状態を取得
    await this.refreshPersistenceStatus();
    await this.refreshDatabaseConfig();
    await this.refreshBackupList();

    this.elements["database-management-modal"]?.classList.remove("hidden");
  }

  /**
   * データベース管理モーダルを閉じる
   */
  protected closeDatabaseManagementModal(): void {
    this.elements["database-management-modal"]?.classList.add("hidden");
  }

  /**
   * 永続化を要求する
   */
  protected async requestPersistence(): Promise<void> {
    try {
      const result = await watchHistoryDB.requestPersistence();
      if (result.success) {
        if (result.data) {
          this.showToast("データベースの永続化に成功しました", "success");
        } else {
          this.showToast("データベースの永続化に失敗しました", "error");
        }
      } else {
        this.showToast(result.error || "永続化要求に失敗しました", "error");
      }

      // 状態を更新
      await this.refreshPersistenceStatus();
    } catch (error) {
      logger.error("永続化要求エラー:", error);
      this.showToast("永続化要求に失敗しました", "error");
    }
  }

  /**
   * 永続化状態を更新する
   */
  protected async refreshPersistenceStatus(): Promise<void> {
    try {
      const result = await watchHistoryDB.getPersistenceStatus();
      if (result.success && result.data) {
        this.persistenceStatus = result.data;
        this.updatePersistenceUI();
      } else {
        logger.error("永続化状態取得エラー:", result.error);
      }
    } catch (error) {
      logger.error("永続化状態取得エラー:", error);
    }
  }

  /**
   * マイグレーションを実行する
   */
  protected async runMigration(): Promise<void> {
    try {
      const result = await watchHistoryDB.runMigration();
      if (result.success) {
        this.showToast("マイグレーションが完了しました", "success");
      } else {
        this.showToast(
          result.error || "マイグレーションに失敗しました",
          "error",
        );
      }
    } catch (error) {
      logger.error("マイグレーション実行エラー:", error);
      this.showToast("マイグレーションに失敗しました", "error");
    }
  }

  /**
   * マイグレーション状態を確認する
   */
  protected checkMigrationStatus(): void {
    this.migrationProgress = watchHistoryDB.getMigrationProgress();
    this.updateMigrationUI();
  }

  /**
   * バックアップを作成する
   */
  protected async createBackup(): Promise<void> {
    try {
      // 現在のデータをエクスポート（バックアップとして使用）
      const result = await watchHistoryDB.exportData();
      if (result.success && result.data) {
        const extensionStatus = await getSeriesAlertExtensionStatus();
        const backup = {
          version: 3,
          timestamp: Date.now(),
          watchHistory: result.data.entries,
          seriesAlerts: extensionStatus.alerts,
        };

        const backupKey = `watch-history-backup-${Date.now()}`;
        localStorage.setItem(backupKey, JSON.stringify(backup));

        this.showToast("バックアップを作成しました", "success");
        await this.refreshBackupList();
      } else {
        this.showToast("バックアップの作成に失敗しました", "error");
      }
    } catch (error) {
      logger.error("バックアップ作成エラー:", error);
      this.showToast("バックアップの作成に失敗しました", "error");
    }
  }

  /**
   * バックアップリストを更新します
   */
  protected async refreshBackupList(): Promise<void> {
    await Promise.resolve();
    try {
      const backups = watchHistoryDB.getAvailableBackups();
      this.updateBackupListUI(backups);
    } catch (error) {
      logger.error("バックアップリスト取得エラー:", error);
    }
  }

  /**
   * データベース設定を更新する
   */
  protected updateDatabaseConfig(): void {
    const autoMigration =
      (this.elements["auto-migration-checkbox"] as HTMLInputElement)?.checked ||
      false;
    const autoPersist =
      (this.elements["auto-persist-checkbox"] as HTMLInputElement)?.checked ||
      false;
    const autoBackup =
      (this.elements["auto-backup-checkbox"] as HTMLInputElement)?.checked ||
      false;
    const backupBeforeMigration =
      (this.elements["backup-before-migration-checkbox"] as HTMLInputElement)
        ?.checked || false;

    const config = {
      autoMigration,
      autoPersist,
      autoBackup,
      backupBeforeMigration,
    };

    watchHistoryDB.updateMigrationConfig(config);
    this.showToast("設定を更新しました", "success");
  }

  /**
   * データベース設定を更新
   */
  protected async refreshDatabaseConfig(): Promise<void> {
    await Promise.resolve();
    try {
      this.databaseConfig = watchHistoryDB.getMigrationConfig();
      this.updateDatabaseConfigUI();
    } catch (error) {
      logger.error("データベース設定取得エラー:", error);
    }
  }

  /**
   * マイグレーション進捗を処理する
   */
  protected handleMigrationProgress(event: CustomEvent): void {
    const progress = event.detail as MigrationProgress;
    this.migrationProgress = progress;
    this.updateMigrationUI();
  }

  /**
   * 永続化UIを更新する
   */
  protected updatePersistenceUI(): void {
    if (!this.persistenceStatus) return;

    const badge = this.elements["persistence-badge"];
    const statusText = this.elements["persistence-status-text"];
    const usageFill = this.elements["storage-usage-fill"];
    const usageText = this.elements["storage-usage-text"];

    if (statusText) {
      statusText.textContent = this.persistenceStatus.isPersistent
        ? "永続化済み"
        : "一時的";
    }

    if (badge) {
      badge.className = `persistence-badge ${this.persistenceStatus.isPersistent ? "persistent" : "temporary"}`;
    }

    if (usageFill) {
      const usagePercent = Math.round(this.persistenceStatus.usageRate * 100);
      usageFill.style.width = `${usagePercent}%`;
    }

    if (usageText) {
      const usageFormatted = this.formatBytes(this.persistenceStatus.usage);
      const quotaFormatted = this.formatBytes(this.persistenceStatus.quota);
      const usagePercent = Math.round(this.persistenceStatus.usageRate * 100);
      usageText.textContent = `${usageFormatted} / ${quotaFormatted} (${usagePercent}%)`;
    }
  }

  /**
   * マイグレーションUIを更新する
   */
  protected updateMigrationUI(): void {
    if (!this.migrationProgress) return;

    const container = this.elements["migration-progress-container"];
    const currentTask = this.elements["migration-current-task"];
    const progressFill = this.elements["migration-progress-fill"];
    const progressText = this.elements["migration-progress-text"];

    if (container) {
      container.classList.toggle("hidden", !this.migrationProgress.isRunning);
    }

    if (currentTask) {
      currentTask.textContent =
        this.migrationProgress.currentMigration || "マイグレーション待機中";
    }

    if (progressFill) {
      const progressPercent = Math.round(this.migrationProgress.progress * 100);
      progressFill.style.width = `${progressPercent}%`;
    }

    if (progressText) {
      progressText.textContent = `${this.migrationProgress.completedCount} / ${this.migrationProgress.totalCount} (${Math.round(this.migrationProgress.progress * 100)}%)`;
    }
  }

  /**
   * データベース設定UIを更新する
   */
  protected updateDatabaseConfigUI(): void {
    if (!this.databaseConfig) return;

    const autoMigrationCheckbox = this.elements[
      "auto-migration-checkbox"
    ] as HTMLInputElement;
    const autoPersistCheckbox = this.elements[
      "auto-persist-checkbox"
    ] as HTMLInputElement;
    const autoBackupCheckbox = this.elements[
      "auto-backup-checkbox"
    ] as HTMLInputElement;
    const backupBeforeMigrationCheckbox = this.elements[
      "backup-before-migration-checkbox"
    ] as HTMLInputElement;

    if (autoMigrationCheckbox) {
      autoMigrationCheckbox.checked = this.databaseConfig.autoMigration;
    }
    if (autoPersistCheckbox) {
      autoPersistCheckbox.checked = this.databaseConfig.autoPersist;
    }
    if (autoBackupCheckbox) {
      autoBackupCheckbox.checked = this.databaseConfig.autoBackup;
    }
    if (backupBeforeMigrationCheckbox) {
      backupBeforeMigrationCheckbox.checked =
        this.databaseConfig.backupBeforeMigration;
    }
  }

  /**
   * バックアップリストUIを更新する
   */
  protected updateBackupListUI(
    backups: Array<{ key: string; timestamp: number; version: number }>,
  ): void {
    const container = this.elements["backup-list-container"];
    if (!container) return;

    if (backups.length === 0) {
      container.innerHTML =
        '<div class="backup-list-empty"><span>バックアップがありません</span></div>';
      return;
    }

    const backupItems = backups
      .map((backup) => {
        const date = new Date(backup.timestamp);
        return `
        <div class="backup-item" data-backup-key="${backup.key}">
          <div class="backup-info">
            <div class="backup-date">${date.toLocaleString("ja-JP")}</div>
            <div class="backup-version">バージョン ${backup.version}</div>
          </div>
          <div class="backup-actions">
            <button class="backup-restore-btn btn btn-sm btn-primary" data-backup-key="${backup.key}">
              復元
            </button>
            <button class="backup-delete-btn btn btn-sm btn-danger" data-backup-key="${backup.key}">
              削除
            </button>
          </div>
        </div>
      `;
      })
      .join("");

    container.innerHTML = backupItems;

    // イベントリスナーを設定
    container.querySelectorAll(".backup-restore-btn").forEach((btn) => {
      btn.addEventListener(
        "click",
        this.guardEvent(async (e) => {
          const backupKey = (e.target as HTMLElement).getAttribute(
            "data-backup-key",
          );
          if (backupKey) {
            await this.restoreBackup(backupKey);
          }
        }),
      );
    });

    container.querySelectorAll(".backup-delete-btn").forEach((btn) => {
      btn.addEventListener(
        "click",
        this.guardEvent((e) => {
          const backupKey = (e.target as HTMLElement).getAttribute(
            "data-backup-key",
          );
          if (backupKey) {
            void this.deleteBackup(backupKey);
          }
        }),
      );
    });
  }

  /**
   * バックアップを復元する
   */
  protected async restoreBackup(backupKey: string): Promise<void> {
    if (!confirm("バックアップを復元しますか？現在のデータは失われます。")) {
      return;
    }

    try {
      const backupData = localStorage.getItem(backupKey);
      const backup = backupData
        ? (JSON.parse(backupData) as { seriesAlerts?: SeriesAlert[] })
        : null;
      const result = await watchHistoryDB.restoreFromBackup(backupKey);
      if (result.success) {
        if (Array.isArray(backup?.seriesAlerts)) {
          const status = await replaceSeriesAlertsInExtension(
            backup.seriesAlerts,
          );
          this.seriesAlerts = status.alerts;
          this.applySeriesAlertExtensionStatus(status);
          this.updateSeriesAlertUI();
        }
        this.showToast("バックアップを復元しました", "success");
        // データを再読み込み
        await this.refreshData();
      } else {
        this.showToast(
          result.error || "バックアップの復元に失敗しました",
          "error",
        );
      }
    } catch (error) {
      logger.error("バックアップ復元エラー:", error);
      this.showToast("バックアップの復元に失敗しました", "error");
    }
  }

  /**
   * バックアップを削除する
   */
  protected deleteBackup(backupKey: string): void {
    if (!confirm("バックアップを削除しますか？")) {
      return;
    }

    try {
      localStorage.removeItem(backupKey);
      this.showToast("バックアップを削除しました", "success");
      void this.refreshBackupList();
    } catch (error) {
      logger.error("バックアップ削除エラー:", error);
      this.showToast("バックアップの削除に失敗しました", "error");
    }
  }

  /**
   * バイト数をフォーマットする
   */
  protected formatBytes(bytes: number): string {
    if (bytes === 0) return "0 B";

    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }
}
