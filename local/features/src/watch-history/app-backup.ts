import { GoogleDriveBackupService } from "@/common/google-drive-backup-service";
import { logger } from "@/common/logger";
import type {
  ImportConfig,
  WatchHistoryExportData,
} from "@/types/watch-history-types";
import { WatchHistoryHistoryListApp } from "@/watch-history/app-history-list";
import { watchHistoryDB } from "@/watch-history/database";
import {
  getSeriesAlertExtensionStatus,
  mergeSeriesAlertStates,
  replaceSeriesAlertsInExtension,
} from "@/watch-history/series-alert-extension-client";

/** ローカルファイルとGoogle Driveを使った視聴履歴の入出力を提供する。 */
export abstract class WatchHistoryBackupApp extends WatchHistoryHistoryListApp {
  private readonly googleDriveService = new GoogleDriveBackupService({
    backupFolderName: "Watch History Backups",
    fileNamePrefix: "NicoWatchHistory_",
    accessTokenStorageKey: "mylist2_google_access_token",
    clientIdStorageKey: "mylist2_google_client_id",
    multipartBoundaryPrefix: "watch_history",
  });

  protected abstract refreshData(): Promise<void>;

  private async createExportData(): Promise<WatchHistoryExportData> {
    const result = await watchHistoryDB.exportData();
    if (!result.success || !result.data) {
      throw new Error(result.error ?? "エクスポートデータを取得できません");
    }

    const extensionStatus = await getSeriesAlertExtensionStatus();
    result.data.seriesAlerts = extensionStatus.alerts;
    this.applySeriesAlertExtensionStatus(extensionStatus);
    return result.data;
  }

  private parseExportData(text: string): WatchHistoryExportData {
    const parsed: unknown = JSON.parse(text);
    if (typeof parsed !== "object" || parsed === null) {
      throw new Error("バックアップの形式が正しくありません");
    }

    const data = parsed as Partial<WatchHistoryExportData>;
    if (!Array.isArray(data.entries)) {
      throw new Error("バックアップに視聴履歴が含まれていません");
    }

    return {
      ...data,
      entries: data.entries,
      seriesAlerts: Array.isArray(data.seriesAlerts) ? data.seriesAlerts : [],
    } as WatchHistoryExportData;
  }

  private async importExportData(data: WatchHistoryExportData): Promise<void> {
    const config: ImportConfig = {
      duplicateHandling: "merge",
      maxEntries: 10000,
    };

    const result = await watchHistoryDB.importData(data, config);
    if (!result.success || result.data === undefined) {
      throw new Error(result.error ?? "視聴履歴をインポートできません");
    }

    let importedAlertCount = 0;
    if (data.seriesAlerts.length > 0) {
      const current = await getSeriesAlertExtensionStatus();
      const merged = mergeSeriesAlertStates(current.alerts, data.seriesAlerts);
      const updated = await replaceSeriesAlertsInExtension(merged);
      this.seriesAlerts = updated.alerts;
      this.applySeriesAlertExtensionStatus(updated);
      importedAlertCount = data.seriesAlerts.length;
    }

    this.showToast(
      `${result.data}件の履歴と${importedAlertCount}件のシリーズアラートをインポートしました`,
      "success",
    );
    await this.refreshData();
    await this.refreshSeriesAlertData();
  }

  /** ローカルJSONファイルへエクスポートする。 */
  protected async handleExport(): Promise<void> {
    try {
      const data = await this.createExportData();
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;

      const now = new Date();
      const dateStr = now.toISOString().split("T")[0];
      const timeStr = now.toTimeString().split(" ")[0].replace(/:/g, "");
      anchor.download = `nico-watch-history-${dateStr}-${timeStr}.json`;

      anchor.click();
      URL.revokeObjectURL(url);
      this.showToast("エクスポートが完了しました", "success");
    } catch (error) {
      logger.error("エクスポートエラー:", error);
      this.showToast("エクスポートに失敗しました", "error");
    }
  }

  /** ローカルJSONファイルの選択ダイアログを開く。 */
  protected handleImport(): void {
    const fileInput = this.elements["import-file"] as HTMLInputElement;
    fileInput?.click();
  }

  /** 選択されたローカルJSONファイルをインポートする。 */
  protected async handleImportFile(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      await this.importExportData(this.parseExportData(text));
    } catch (error) {
      logger.error("インポートエラー:", error);
      this.showToast("インポートに失敗しました", "error");
    } finally {
      input.value = "";
    }
  }

  /** Google DriveへZIPバックアップを保存する。 */
  protected async handleGoogleDriveExport(): Promise<void> {
    try {
      this.showLoading(true);
      const data = await this.createExportData();
      const timestamp = new Date()
        .toISOString()
        .replace(/[-:]/g, "")
        .replace(/\.\d{3}Z$/u, "Z");
      const result = await this.googleDriveService.uploadBackupZip(
        `NicoWatchHistory_${timestamp}`,
        JSON.stringify(data, null, 2),
      );
      if (!result.success) {
        throw new Error(result.error ?? "Google Driveへ保存できません");
      }
      this.showToast("Google Driveへバックアップを保存しました", "success");
    } catch (error) {
      logger.error("Google Driveエクスポートエラー:", error);
      this.showToast(
        `Google Driveへのエクスポートに失敗しました: ${error instanceof Error ? error.message : String(error)}`,
        "error",
      );
    } finally {
      this.showLoading(false);
    }
  }

  /** Google Drive上のバックアップ選択モーダルを開く。 */
  protected async openGoogleDriveImport(): Promise<void> {
    try {
      this.showLoading(true);
      const backups = await this.googleDriveService.listBackups();
      if (backups.length === 0) {
        this.showToast(
          "Google Driveにwatch-historyのバックアップがありません",
          "info",
        );
        return;
      }

      const select = this.elements[
        "google-drive-backup-select"
      ] as HTMLSelectElement;
      select.replaceChildren(
        ...backups.map((backup) => {
          const option = document.createElement("option");
          option.value = backup.id;
          const modified = backup.modifiedTime
            ? new Date(backup.modifiedTime).toLocaleString("ja-JP")
            : "更新日時不明";
          option.textContent = `${backup.name} — ${modified}`;
          return option;
        }),
      );
      select.selectedIndex = 0;
      this.elements["google-drive-import-modal"]?.classList.remove("hidden");
    } catch (error) {
      logger.error("Google Driveバックアップ一覧取得エラー:", error);
      this.showToast(
        `Google Driveのバックアップ一覧を取得できません: ${error instanceof Error ? error.message : String(error)}`,
        "error",
      );
    } finally {
      this.showLoading(false);
    }
  }

  protected closeGoogleDriveImport(): void {
    this.elements["google-drive-import-modal"]?.classList.add("hidden");
  }

  /** 選択したGoogle Driveバックアップを現在の履歴へマージする。 */
  protected async confirmGoogleDriveImport(): Promise<void> {
    const select = this.elements[
      "google-drive-backup-select"
    ] as HTMLSelectElement;
    const fileId = select.value;
    if (!fileId) {
      this.showToast("インポートするバックアップを選択してください", "error");
      return;
    }
    if (
      !window.confirm(
        "選択したGoogle Driveバックアップを現在の視聴履歴へマージしますか？",
      )
    ) {
      return;
    }

    try {
      this.closeGoogleDriveImport();
      this.showLoading(true);
      const json = await this.googleDriveService.downloadBackupJson(fileId);
      await this.importExportData(this.parseExportData(json));
    } catch (error) {
      logger.error("Google Driveインポートエラー:", error);
      this.showToast(
        `Google Driveからのインポートに失敗しました: ${error instanceof Error ? error.message : String(error)}`,
        "error",
      );
    } finally {
      this.showLoading(false);
    }
  }
}
