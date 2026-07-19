// IndexedDBの診断・修復・マイグレーション
// IndexedDB部 - NGワードルールと設定の永続化（JSON形式対応）
import { createDefaultCommandSettings } from "@/comment-filter2/utils/command-settings";
import { CONSTANTS } from "@/comment-filter2/utils/constants";
import { LegacyCommentFilterSettings } from "@/comment-filter2/utils/legacy-converter";
import {
  MigrationEventDetails,
  MigrationHistoryRecord,
  NgRuleJson,
  Settings,
  SettingsStorage,
  SettingStorageItem,
} from "@/types/filter-types";
import { FilterStorageCore } from "./indexed-db-core";

export class FilterStorage extends FilterStorageCore {
  /**
   * レガシー設定のルール数をカウント
   */
  protected countLegacyRules(
    legacySettings: LegacyCommentFilterSettings,
  ): number {
    let count = 0;

    if (legacySettings.NGWord) {
      count += legacySettings.NGWord.split("\n").filter(
        (word) => word.trim() !== "",
      ).length;
    }

    if (legacySettings.NGRegex) {
      count += legacySettings.NGRegex.split("\n").filter(
        (regex) => regex.trim() !== "",
      ).length;
    }

    if (legacySettings.superNgWords) {
      count += legacySettings.superNgWords
        .split("\n")
        .filter((word) => word.trim() !== "").length;
    }

    if (legacySettings.superNgRegex) {
      count += legacySettings.superNgRegex
        .split("\n")
        .filter((regex) => regex.trim() !== "").length;
    }

    if (legacySettings.replaceRules) {
      count += legacySettings.replaceRules
        .split("\n")
        .filter((rule) => rule.trim() !== "").length;
    }

    if (legacySettings.superNgReplaceRules) {
      count += legacySettings.superNgReplaceRules
        .split("\n")
        .filter((rule) => rule.trim() !== "").length;
    }

    if (legacySettings.userIdFilters) {
      count += legacySettings.userIdFilters
        .split("\n")
        .filter((userId) => userId.trim() !== "").length;
    }

    if (legacySettings.superUserIdFilters) {
      count += legacySettings.superUserIdFilters
        .split("\n")
        .filter((userId) => userId.trim() !== "").length;
    }

    return count;
  }

  /**
   * データベースを閉じる
   */
  public close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  // === データベース永続化昇格機能 ===

  /**
   * データベースの完全性チェック
   */
  public async checkDatabaseIntegrity(): Promise<{
    isValid: boolean;
    issues: string[];
  }> {
    if (!this.db) {
      throw new Error("Database not initialized");
    }

    const issues: string[] = [];

    try {
      // 必要なオブジェクトストアが存在するかチェック
      const requiredStores = [
        CONSTANTS.DB_CONFIG.STORES.RULES,
        CONSTANTS.DB_CONFIG.STORES.SETTINGS,
        "json_rules",
      ];

      for (const storeName of requiredStores) {
        if (!this.db.objectStoreNames.contains(storeName)) {
          issues.push(`Missing required object store: ${storeName}`);
        }
      }

      // データの整合性チェック
      const jsonRules = await this.getJsonRules();
      const invalidRules = jsonRules.filter(
        (rule) => !this.validateRuleStructure(rule),
      );

      if (invalidRules.length > 0) {
        issues.push(`Found ${invalidRules.length} invalid rule structures`);
      }

      // 設定の整合性チェック
      const settings = await this.getSettings();
      if (!settings.commandSettings) {
        issues.push("Missing essential settings structure");
      }

      window.logger?.info(
        `[CommentFilter2] Database integrity check completed. Issues found: ${issues.length}`,
      );

      return {
        isValid: issues.length === 0,
        issues,
      };
    } catch (error) {
      window.logger?.error(
        "[CommentFilter2] Database integrity check failed:",
        error,
      );
      issues.push(
        `Integrity check failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      return {
        isValid: false,
        issues,
      };
    }
  }

  /**
   * データベースの自動修復
   */
  public async repairDatabase(): Promise<{
    success: boolean;
    repairs: string[];
  }> {
    if (!this.db) {
      throw new Error("Database not initialized");
    }

    const repairs: string[] = [];

    try {
      window.logger?.info("[CommentFilter2] Starting database repair...");

      // 破損したルールの修復
      const jsonRules = await this.getJsonRules();
      const repairedRules: NgRuleJson[] = [];

      for (const rule of jsonRules) {
        const repairedRule = this.repairRuleStructure(rule);
        if (repairedRule) {
          repairedRules.push(repairedRule);
        } else {
          repairs.push(`Removed invalid rule: ${JSON.stringify(rule)}`);
        }
      }

      if (repairedRules.length !== jsonRules.length) {
        await this.saveJsonRules(repairedRules);
        repairs.push(
          `Repaired ${jsonRules.length - repairedRules.length} broken rules`,
        );
      }

      // 設定の修復
      const settings = await this.getSettings();
      let settingsRepaired = false;

      if (!settings.commandSettings) {
        settings.commandSettings = createDefaultCommandSettings();
        settingsRepaired = true;
      }

      if (settingsRepaired) {
        await this.saveSettings(settings);
        repairs.push("Repaired missing settings structure");
      }

      window.logger?.info(
        `[CommentFilter2] Database repair completed. Repairs made: ${repairs.length}`,
      );

      return {
        success: true,
        repairs,
      };
    } catch (error) {
      window.logger?.error("[CommentFilter2] Database repair failed:", error);
      return {
        success: false,
        repairs: [
          ...repairs,
          `Repair failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        ],
      };
    }
  }

  /**
   * データベースの完全バックアップ
   */
  public async createFullBackup(): Promise<{
    success: boolean;
    backup?: string;
    error?: string;
  }> {
    if (!this.db) {
      throw new Error("Database not initialized");
    }

    try {
      window.logger?.info("[CommentFilter2] Creating full database backup...");

      const backup = {
        version: this.dbVersion,
        timestamp: new Date().toISOString(),
        data: {
          jsonRules: await this.getJsonRules(),
          settings: await this.getSettings(),
          legacyRules: await this.getRules(),
          migrationHistory: await this.getMigrationHistory(),
        },
      };

      const backupJson = JSON.stringify(backup, null, 2);
      window.logger?.info(
        `[CommentFilter2] Backup created successfully (${String(backupJson.length)} characters)`,
      );

      return {
        success: true,
        backup: backupJson,
      };
    } catch (error) {
      window.logger?.error("[CommentFilter2] Database backup failed:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * バックアップからデータベースを復元
   */
  public async restoreFromBackup(
    backupJson: string,
  ): Promise<{ success: boolean; error?: string }> {
    if (!this.db) {
      throw new Error("Database not initialized");
    }

    try {
      window.logger?.info("[CommentFilter2] Restoring database from backup...");

      const backupRaw: unknown = JSON.parse(backupJson);
      if (!backupRaw || typeof backupRaw !== "object") {
        throw new Error("Invalid backup format");
      }
      const backup = backupRaw as {
        version?: unknown;
        data?: { jsonRules?: NgRuleJson[]; settings?: Settings };
        timestamp?: unknown;
      };

      // バックアップの妥当性チェック
      if (
        typeof backup.version !== "number" &&
        typeof backup.version !== "string"
      ) {
        throw new Error("Invalid backup version");
      }
      if (!backup.data || typeof backup.data !== "object") {
        throw new Error("Invalid backup format");
      }

      // データの復元
      if (backup.data.jsonRules) {
        await this.saveJsonRules(backup.data.jsonRules);
      }

      if (backup.data.settings) {
        await this.saveSettings(backup.data.settings);
      }

      // 復元記録を保存
      await this.recordMigrationEvent("restore", {
        fromBackup: true,
        backupTimestamp:
          typeof backup.timestamp === "string"
            ? backup.timestamp
            : new Date().toISOString(),
        backupVersion:
          typeof backup.version === "number"
            ? backup.version
            : Number(backup.version),
      });

      window.logger?.info("[CommentFilter2] Database restored successfully");

      return { success: true };
    } catch (error) {
      window.logger?.error("[CommentFilter2] Database restore failed:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * データベースのパフォーマンス最適化
   */
  public async optimizeDatabase(): Promise<{
    success: boolean;
    optimizations: string[];
  }> {
    if (!this.db) {
      throw new Error("Database not initialized");
    }

    const optimizations: string[] = [];

    try {
      window.logger?.info("[CommentFilter2] Starting database optimization...");

      // 重複ルールの削除
      const jsonRules = await this.getJsonRules();
      const uniqueRules = this.removeDuplicateRules(jsonRules);

      if (uniqueRules.length < jsonRules.length) {
        await this.saveJsonRules(uniqueRules);
        optimizations.push(
          `Removed ${jsonRules.length - uniqueRules.length} duplicate rules`,
        );
      }

      // 無効なルールの削除
      const validRules = uniqueRules.filter((rule) =>
        this.validateRuleStructure(rule),
      );
      if (validRules.length < uniqueRules.length) {
        await this.saveJsonRules(validRules);
        optimizations.push(
          `Removed ${uniqueRules.length - validRules.length} invalid rules`,
        );
      }

      // 最適化記録を保存
      await this.recordMigrationEvent("optimize", {
        rulesOptimized: optimizations.length > 0,
        originalCount: jsonRules.length,
        optimizedCount: validRules.length,
      });

      window.logger?.info(
        `[CommentFilter2] Database optimization completed. Optimizations: ${optimizations.length}`,
      );

      return {
        success: true,
        optimizations,
      };
    } catch (error) {
      window.logger?.error(
        "[CommentFilter2] Database optimization failed:",
        error,
      );
      return {
        success: false,
        optimizations: [
          ...optimizations,
          `Optimization failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        ],
      };
    }
  }

  // === 自動マイグレーション機能の強化 ===

  /**
   * マイグレーション履歴の記録
   */
  public async recordMigrationEvent(
    eventType: string,
    details: MigrationEventDetails,
  ): Promise<void> {
    if (!this.db) {
      throw new Error("Database not initialized");
    }

    try {
      const migrationRecord = {
        key: `migration_${eventType}_${Date.now()}`,
        eventType,
        timestamp: new Date().toISOString(),
        details,
        version: this.dbVersion,
      };

      const transaction = this.db.transaction(
        [CONSTANTS.DB_CONFIG.STORES.SETTINGS],
        "readwrite",
      );
      const store = transaction.objectStore(
        CONSTANTS.DB_CONFIG.STORES.SETTINGS,
      );
      await this.putToStore(store, migrationRecord);
      window.logger?.info(
        `[CommentFilter2] Migration event recorded: ${eventType}`,
      );
    } catch (error) {
      window.logger?.error(
        "[CommentFilter2] Failed to record migration event:",
        error,
      );
    }
  }

  /**
   * マイグレーション履歴の取得
   */
  public async getMigrationHistory(): Promise<MigrationHistoryRecord[]> {
    if (!this.db) {
      throw new Error("Database not initialized");
    }

    try {
      const allSettings = await this.getAllSettings();
      const migrationEvents = Object.entries(allSettings)
        .filter(([key]) => key.startsWith("migration_"))
        .map(([, value]) => value as unknown as MigrationHistoryRecord)
        .filter(
          (record): record is MigrationHistoryRecord =>
            typeof record === "object" &&
            record !== null &&
            "eventType" in record &&
            "timestamp" in record &&
            "details" in record &&
            "version" in record,
        )
        .sort(
          (a, b) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
        );

      return migrationEvents;
    } catch (error) {
      window.logger?.error(
        "[CommentFilter2] Failed to get migration history:",
        error,
      );
      return [];
    }
  }

  /**
   * 段階的マイグレーション機能
   */
  public async performIncrementalMigration(
    targetVersion: number,
  ): Promise<{ success: boolean; steps: string[] }> {
    if (!this.db) {
      throw new Error("Database not initialized");
    }

    const steps: string[] = [];

    try {
      window.logger?.info(
        `[CommentFilter2] Starting incremental migration to version ${targetVersion}`,
      );

      const currentVersion = this.dbVersion;

      for (let version = currentVersion; version <= targetVersion; version++) {
        const migrationResult = await this.performVersionMigration(version);
        steps.push(migrationResult.description);

        if (!migrationResult.success) {
          throw new Error(
            `Migration to version ${version} failed: ${migrationResult.error}`,
          );
        }
      }

      await this.recordMigrationEvent("incremental", {
        fromVersion: currentVersion,
        toVersion: targetVersion,
        steps,
      });

      window.logger?.info(
        `[CommentFilter2] Incremental migration completed successfully`,
      );

      return {
        success: true,
        steps,
      };
    } catch (error) {
      window.logger?.error(
        "[CommentFilter2] Incremental migration failed:",
        error,
      );
      return {
        success: false,
        steps: [
          ...steps,
          `Migration failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        ],
      };
    }
  }

  /**
   * 特定バージョンへのマイグレーション実行
   */
  private async performVersionMigration(
    version: number,
  ): Promise<{ success: boolean; description: string; error?: string }> {
    await Promise.resolve();
    try {
      switch (version) {
        case 4:
          // 将来のバージョン4用のマイグレーション
          return {
            success: true,
            description: `Version ${version} migration: Enhanced indexing and performance improvements`,
          };
        case 5:
          // 将来のバージョン5用のマイグレーション
          return {
            success: true,
            description: `Version ${version} migration: Advanced filtering features`,
          };
        default:
          return {
            success: true,
            description: `Version ${version} migration: No changes required`,
          };
      }
    } catch (error) {
      return {
        success: false,
        description: `Version ${version} migration failed`,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // === ヘルパーメソッド ===

  /**
   * ルール構造の検証
   */
  private validateRuleStructure(rule: NgRuleJson): boolean {
    try {
      // 必須フィールドのチェック
      if (!rule.action || !rule.smid || rule.enabled === undefined) {
        return false;
      }

      // アクションの検証
      if (
        !rule.action.type ||
        !["hide", "replace", "unspecified"].includes(rule.action.type)
      ) {
        return false;
      }

      // SMIDの検証
      if (!Array.isArray(rule.smid)) {
        return false;
      }

      // 正規表現がある場合の検証
      if (rule.pattern) {
        try {
          new RegExp(rule.pattern, rule.flags || "gi");
        } catch {
          return false;
        }
      }

      return true;
    } catch {
      return false;
    }
  }

  /**
   * ルール構造の修復
   */
  private repairRuleStructure(rule: NgRuleJson): NgRuleJson | null {
    try {
      // 基本的な修復
      const repaired: NgRuleJson = {
        ...rule,
        action: rule.action || { type: "hide" },
        smid: Array.isArray(rule.smid) ? rule.smid : ["ALL"],
        enabled: rule.enabled !== undefined ? rule.enabled : true,
      };

      // 修復後の検証
      if (this.validateRuleStructure(repaired)) {
        return repaired;
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * 重複ルールの削除
   */
  private removeDuplicateRules(rules: NgRuleJson[]): NgRuleJson[] {
    const seen = new Set<string>();
    const unique: NgRuleJson[] = [];

    for (const rule of rules) {
      const key = JSON.stringify({
        pattern: rule.pattern,
        userId: rule.userId,
        action: rule.action,
        smid: rule.smid?.sort(),
      });

      if (!seen.has(key)) {
        seen.add(key);
        unique.push(rule);
      }
    }

    return unique;
  }

  /**
   * 全設定の取得
   */
  private async getAllSettings(): Promise<SettingsStorage> {
    if (!this.db) {
      throw new Error("Database not initialized");
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(
        [CONSTANTS.DB_CONFIG.STORES.SETTINGS],
        "readonly",
      );
      const store = transaction.objectStore(
        CONSTANTS.DB_CONFIG.STORES.SETTINGS,
      );
      const request = store.getAll();

      request.onsuccess = () => {
        const result: SettingsStorage = {};
        request.result.forEach((item: SettingStorageItem) => {
          result[item.key] = item;
        });
        resolve(result);
      };

      request.onerror = () => {
        reject(new Error("Failed to get all settings"));
      };
    });
  }
}
