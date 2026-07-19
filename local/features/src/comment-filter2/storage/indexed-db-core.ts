// IndexedDBの基本CRUDと入出力
// IndexedDB部 - NGワードルールと設定の永続化（JSON形式対応）
import {
  createDefaultCommandSettings,
  DEFAULT_CLEAR_EXISTING_COMMANDS,
} from "@/comment-filter2/utils/command-settings";
import { CONSTANTS } from "@/comment-filter2/utils/constants";
import {
  convertCsvToJsonl,
  detectFileFormat,
  parseJsonl,
} from "@/comment-filter2/utils/jsonl-parser";
import {
  LegacyCommentFilterSettings,
  LegacyConverter,
} from "@/comment-filter2/utils/legacy-converter";
import { saveIndexedDBEmergencyBackup } from "@/common/indexed-db-emergency-backup";
import { IndexedDBRuleItem } from "@/types/database-types";
import {
  CommandSettings,
  FilterDatabase,
  MigrationResult,
  NgRuleJson,
  NgRuleJsonCollection,
  NGWordRule,
  Settings,
} from "@/types/filter-types";

export abstract class FilterStorageCore {
  protected abstract countLegacyRules(
    legacySettings: LegacyCommentFilterSettings,
  ): number;
  protected db: IDBDatabase | null = null;
  private dbName: string = CONSTANTS.DB_CONFIG.NAME;
  protected dbVersion: number = 3; // バージョンアップ（JSON形式対応）
  private useJsonFormat: boolean = true; // 新形式を使用するかどうか

  /**
   * データベースを初期化（マイグレーション対応）
   */
  public async initialize(repairAttempted: boolean = false): Promise<void> {
    try {
      await new Promise<void>((resolve, reject) => {
        const request = indexedDB.open(this.dbName, this.dbVersion);

        request.onerror = () => {
          reject(new Error("IndexedDB initialization failed"));
        };

        request.onsuccess = () => {
          this.db = request.result;
          try {
            this.validateSchema(this.db);
            resolve();
          } catch (error) {
            this.db.close();
            this.db = null;
            reject(error instanceof Error ? error : new Error(String(error)));
          }
        };

        request.onupgradeneeded = async (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          const oldVersion = event.oldVersion;

          window.logger?.info(
            `[CommentFilter2] Upgrading database from version ${oldVersion} to ${this.dbVersion}`,
          );

          // Rulesストアの作成/更新
          if (!db.objectStoreNames.contains(CONSTANTS.DB_CONFIG.STORES.RULES)) {
            const rulesStore = db.createObjectStore(
              CONSTANTS.DB_CONFIG.STORES.RULES,
              {
                keyPath: "id",
                autoIncrement: true,
              },
            );
            rulesStore.createIndex("smid", "smid", { unique: false });
            rulesStore.createIndex("enabled", "enabled", { unique: false });
          }

          // Settingsストアの作成
          if (
            !db.objectStoreNames.contains(CONSTANTS.DB_CONFIG.STORES.SETTINGS)
          ) {
            db.createObjectStore(CONSTANTS.DB_CONFIG.STORES.SETTINGS, {
              keyPath: "key",
            });
          }

          // JSON Rulesストアの作成（新形式用）
          if (!db.objectStoreNames.contains("json_rules")) {
            const jsonRulesStore = db.createObjectStore("json_rules", {
              keyPath: "id",
              autoIncrement: true,
            });
            jsonRulesStore.createIndex("enabled", "enabled", { unique: false });
            jsonRulesStore.createIndex("smid", "smid", {
              unique: false,
              multiEntry: true,
            });
          }

          // バージョン2→3のマイグレーション
          if (oldVersion < 3) {
            await this.migrateToVersion3(
              db,
              (event.target as IDBOpenDBRequest).transaction!,
            );
          }
        };
      });
    } catch (error) {
      if (repairAttempted) {
        throw error;
      }

      window.logger?.warn(
        "[CommentFilter2] IndexedDBの破損を検出したため再作成します:",
        error,
      );
      await this.createEmergencyBackup("recreate-before-delete");
      await this.deleteDatabase();
      await this.initialize(true);
    }
  }

  private validateSchema(db: IDBDatabase): void {
    const expectedSchema: Record<string, string[]> = {
      [CONSTANTS.DB_CONFIG.STORES.RULES]: ["smid", "enabled"],
      [CONSTANTS.DB_CONFIG.STORES.SETTINGS]: [],
      json_rules: ["enabled", "smid"],
    };

    Object.entries(expectedSchema).forEach(([storeName, indexNames]) => {
      if (!db.objectStoreNames.contains(storeName)) {
        throw new Error(`Missing object store: ${storeName}`);
      }

      if (indexNames.length === 0) {
        return;
      }

      const transaction = db.transaction([storeName], "readonly");
      const store = transaction.objectStore(storeName);
      indexNames.forEach((indexName) => {
        if (!store.indexNames.contains(indexName)) {
          throw new Error(`Missing index: ${storeName}.${indexName}`);
        }
      });
    });
  }

  private deleteDatabase(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.deleteDatabase(this.dbName);
      request.onsuccess = () => resolve();
      request.onerror = () => {
        const error = request.error;
        reject(error instanceof Error ? error : new Error(String(error)));
      };
      request.onblocked = () =>
        reject(new Error("IndexedDB deletion was blocked"));
    });
  }

  private async createEmergencyBackup(reason: string): Promise<void> {
    let db: IDBDatabase | null = null;
    try {
      db = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open(this.dbName);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () =>
          reject(
            request.error instanceof Error
              ? request.error
              : new Error(String(request.error)),
          );
      });

      await saveIndexedDBEmergencyBackup(db, {
        storageKeyPrefix: "comment-filter2-emergency-backup",
        reason,
        logLabel: "CommentFilter2",
      });
    } catch (backupError) {
      window.logger?.error(
        "[CommentFilter2] IndexedDB再作成前の緊急バックアップに失敗しました:",
        backupError,
      );
    } finally {
      db?.close();
    }
  }

  /**
   * バージョン3へのマイグレーション（旧形式→JSON形式）
   */
  private async migrateToVersion3(
    db: IDBDatabase,
    transaction: IDBTransaction,
  ): Promise<void> {
    try {
      window.logger?.info(
        "[CommentFilter2] Starting migration to version 3 (JSON format)",
      );

      // 旧形式のルールを取得
      const oldRulesStore = transaction.objectStore(
        CONSTANTS.DB_CONFIG.STORES.RULES,
      );
      const oldRules = await this.getAllFromStore(oldRulesStore);

      if (oldRules.length > 0) {
        window.logger?.info(
          `[CommentFilter2] Found ${oldRules.length} legacy rules to migrate`,
        );

        // 旧形式→JSON形式に変換
        const jsonRules: NgRuleJson[] = [];

        for (const oldRule of oldRules) {
          try {
            const jsonRule = this.convertLegacyRuleToJson(oldRule);
            if (jsonRule) {
              jsonRules.push(jsonRule);
            }
          } catch (error) {
            window.logger?.warn(
              "[CommentFilter2] Failed to convert legacy rule:",
              oldRule,
              error,
            );
          }
        }

        // JSON形式で保存
        const jsonRulesStore = transaction.objectStore("json_rules");
        for (const jsonRule of jsonRules) {
          await this.addToStore(jsonRulesStore, jsonRule);
        }

        window.logger?.info(
          `[CommentFilter2] Successfully migrated ${jsonRules.length} rules to JSON format`,
        );

        // 設定にマイグレーション完了フラグを追加
        const settingsStore = transaction.objectStore(
          CONSTANTS.DB_CONFIG.STORES.SETTINGS,
        );
        await this.putToStore(settingsStore, {
          key: "migration_v3_completed",
          completed: true,
          migratedAt: new Date().toISOString(),
          migratedRulesCount: jsonRules.length,
        });
      }
    } catch (error) {
      window.logger?.error(
        "[CommentFilter2] Migration to version 3 failed:",
        error,
      );
      throw error;
    }
  }

  /**
   * 旧形式ルールをJSON形式に変換
   */
  private convertLegacyRuleToJson(
    legacyRule: IndexedDBRuleItem,
  ): NgRuleJson | null {
    try {
      // ユーザーIDルールの場合
      if (legacyRule.isUserIdRule && legacyRule.userId) {
        return {
          userId: legacyRule.userId,
          action: { type: "hide" },
          smid: legacyRule.smid === "ALL" ? ["ALL"] : [legacyRule.smid],
          nicoru_cond:
            legacyRule.nicoru === "EMPTY"
              ? undefined
              : {
                  op: ">=",
                  value:
                    typeof legacyRule.nicoru === "number"
                      ? legacyRule.nicoru
                      : 0,
                  mode: "exclude",
                },
          enabled: true,
        };
      }

      // 正規表現ルールの場合
      if (legacyRule.regex) {
        const action =
          legacyRule.replace === "EMPTY" || !legacyRule.replace
            ? { type: "hide" as const }
            : { type: "replace" as const, replacement: legacyRule.replace };

        return {
          pattern: legacyRule.regex,
          flags: legacyRule.regexFlags || "gi",
          action,
          smid: legacyRule.smid === "ALL" ? ["ALL"] : [legacyRule.smid],
          nicoru_cond:
            legacyRule.nicoru === "EMPTY"
              ? undefined
              : {
                  op: ">=",
                  value:
                    typeof legacyRule.nicoru === "number"
                      ? legacyRule.nicoru
                      : 0,
                  mode: "exclude",
                },
          enabled: true,
        };
      }

      return null;
    } catch (error) {
      window.logger?.warn(
        "[CommentFilter2] Failed to convert legacy rule:",
        legacyRule,
        error,
      );
      return null;
    }
  }

  /**
   * JSON形式のNGワードルールを保存
   */
  public async saveJsonRules(rules: NgRuleJson[]): Promise<void> {
    if (!this.db) {
      throw new Error("Database not initialized");
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(["json_rules"], "readwrite");
      const store = transaction.objectStore("json_rules");

      // 既存のルールを全削除
      const clearRequest = store.clear();

      clearRequest.onsuccess = () => {
        // 新しいルールを追加
        let completedCount = 0;
        const totalCount = rules.length;

        if (totalCount === 0) {
          resolve();
          return;
        }

        rules.forEach((rule, index) => {
          const ruleWithId = { ...rule, id: index };
          const addRequest = store.add(ruleWithId);

          addRequest.onsuccess = () => {
            completedCount++;
            if (completedCount === totalCount) {
              resolve();
            }
          };

          addRequest.onerror = () => {
            reject(new Error(`Failed to save JSON rule at index ${index}`));
          };
        });
      };

      clearRequest.onerror = () => {
        reject(new Error("Failed to clear existing JSON rules"));
      };
    });
  }

  /**
   * JSON形式のNGワードルールを取得
   */
  public async getJsonRules(): Promise<NgRuleJson[]> {
    if (!this.db) {
      throw new Error("Database not initialized");
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(["json_rules"], "readonly");
      const store = transaction.objectStore("json_rules");
      const request = store.getAll();

      request.onsuccess = () => {
        const rules = request.result.map(
          (item: NgRuleJson & { id?: number }) => {
            // idフィールドを除去してクリーンなルールオブジェクトを返す
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { id, ...rule } = item;
            return rule;
          },
        );
        resolve(rules);
      };

      request.onerror = () => {
        reject(new Error("Failed to retrieve JSON rules"));
      };
    });
  }

  /**
   * 旧形式のNGワードルールを保存（後方互換性）
   */
  public async saveRules(rules: NGWordRule[]): Promise<void> {
    if (!this.db) {
      throw new Error("Database not initialized");
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(
        [CONSTANTS.DB_CONFIG.STORES.RULES],
        "readwrite",
      );
      const store = transaction.objectStore(CONSTANTS.DB_CONFIG.STORES.RULES);

      // 既存のルールを全削除
      const clearRequest = store.clear();

      clearRequest.onsuccess = () => {
        // 新しいルールを追加
        let completedCount = 0;
        const totalCount = rules.length;

        if (totalCount === 0) {
          resolve();
          return;
        }

        rules.forEach((rule, index) => {
          const addRequest = store.add({ ...rule, id: index });

          addRequest.onsuccess = () => {
            completedCount++;
            if (completedCount === totalCount) {
              resolve();
            }
          };

          addRequest.onerror = () => {
            reject(new Error(`Failed to save rule at index ${index}`));
          };
        });
      };

      clearRequest.onerror = () => {
        reject(new Error("Failed to clear existing rules"));
      };
    });
  }

  /**
   * 旧形式のNGワードルールを取得（後方互換性）
   */
  public async getRules(): Promise<NGWordRule[]> {
    if (!this.db) {
      throw new Error("Database not initialized");
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(
        [CONSTANTS.DB_CONFIG.STORES.RULES],
        "readonly",
      );
      const store = transaction.objectStore(CONSTANTS.DB_CONFIG.STORES.RULES);
      const request = store.getAll();

      request.onsuccess = () => {
        const rules = request.result.map((item: IndexedDBRuleItem) => ({
          regex: item.regex,
          regexFlags: item.regexFlags,
          replace: item.replace,
          smid: item.smid,
          nicoru: item.nicoru,
          userId: item.userId,
          isUserIdRule: item.isUserIdRule,
        }));
        resolve(rules);
      };

      request.onerror = () => {
        reject(new Error("Failed to retrieve rules"));
      };
    });
  }

  /**
   * 設定を保存（JSON形式フラグ追加）
   */
  public async saveSettings(
    settings: Settings & { useJsonFormat?: boolean },
  ): Promise<void> {
    if (!this.db) {
      throw new Error("Database not initialized");
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(
        [CONSTANTS.DB_CONFIG.STORES.SETTINGS],
        "readwrite",
      );
      const store = transaction.objectStore(
        CONSTANTS.DB_CONFIG.STORES.SETTINGS,
      );

      const request = store.put({
        key: "main",
        ...settings,
        clearExistingCommands: settings.clearExistingCommands === true,
        useJsonFormat:
          settings.useJsonFormat !== undefined
            ? settings.useJsonFormat
            : this.useJsonFormat,
      });

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(new Error("Failed to save settings"));
      };
    });
  }

  /**
   * 設定を取得（JSON形式フラグ対応）
   */
  public async getSettings(): Promise<Settings & { useJsonFormat?: boolean }> {
    if (!this.db) {
      throw new Error("Database not initialized");
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(
        [CONSTANTS.DB_CONFIG.STORES.SETTINGS],
        "readwrite",
      );
      const store = transaction.objectStore(
        CONSTANTS.DB_CONFIG.STORES.SETTINGS,
      );
      const request = store.get("main");

      request.onsuccess = () => {
        if (request.result) {
          const raw = request.result as unknown;
          const obj =
            raw && typeof raw === "object"
              ? (raw as Record<string, unknown>)
              : {};
          const settings = {
            debugMode: Boolean(obj.debugMode),
            isEnabled: Boolean(obj.isEnabled),
            commandSettings:
              (obj.commandSettings as CommandSettings) ||
              createDefaultCommandSettings(),
            clearExistingCommands:
              obj.clearExistingCommands !== undefined
                ? obj.clearExistingCommands === true
                : DEFAULT_CLEAR_EXISTING_COMMANDS,
            logToCommentFilterLogger:
              obj.logToCommentFilterLogger !== undefined
                ? Boolean(obj.logToCommentFilterLogger)
                : true,
            useJsonFormat:
              obj.useJsonFormat !== undefined
                ? Boolean(obj.useJsonFormat)
                : true, // デフォルトで新形式を使用
          };
          if (obj.clearExistingCommands === undefined) {
            const migrationRequest = store.put({
              ...obj,
              key: "main",
              clearExistingCommands: DEFAULT_CLEAR_EXISTING_COMMANDS,
            });
            transaction.oncomplete = () => resolve(settings);
            migrationRequest.onerror = () =>
              reject(
                new Error("Failed to migrate command replacement mode setting"),
              );
          } else {
            resolve(settings);
          }
        } else {
          // デフォルト設定を返す
          resolve({
            debugMode: false,
            isEnabled: true,
            commandSettings: createDefaultCommandSettings(),
            clearExistingCommands: DEFAULT_CLEAR_EXISTING_COMMANDS,
            logToCommentFilterLogger: true,
            useJsonFormat: true, // デフォルトで新形式を使用
          });
        }
      };

      request.onerror = () => {
        reject(new Error("Failed to retrieve settings"));
      };
    });
  }

  /**
   * JSON形式でデータをエクスポート
   */
  public async exportJsonData(): Promise<string> {
    try {
      const [rules, settings] = await Promise.all([
        this.getJsonRules(),
        this.getSettings(),
      ]);

      const exportData: NgRuleJsonCollection = {
        version: "3.0",
        rules,
        settings, // 設定を追加（コメントコマンド設定を含む）
        metadata: {
          exportedAt: new Date().toISOString(),
          exportedBy: "CommentFilter2",
          totalRules: rules.length,
        },
      };

      return JSON.stringify(exportData, null, 2);
    } catch (error) {
      throw new Error(`JSON export failed: ${String(error)}`);
    }
  }

  /**
   * 旧形式でデータをエクスポート（後方互換性）
   */
  public async exportData(): Promise<string> {
    try {
      const [rules, settings] = await Promise.all([
        this.getRules(),
        this.getSettings(),
      ]);

      const exportData: FilterDatabase = {
        rules,
        settings,
      };

      return JSON.stringify(exportData, null, 2);
    } catch (error) {
      throw new Error(`Export failed: ${String(error)}`);
    }
  }

  /**
   * データをインポート（形式自動判定・マイグレーション対応）
   */
  public async importData(data: string): Promise<MigrationResult> {
    try {
      const format = detectFileFormat(data);

      window.logger?.info(
        `[CommentFilter2] Detected import format: ${String(format)}`,
      );

      switch (format) {
        case "jsonl":
          return await this.importJsonlData(data);
        case "json":
          return await this.importJsonData(data);
        case "csv":
          return await this.importCsvData(data);
        default:
          throw new Error("Unknown file format");
      }
    } catch (error) {
      throw new Error(`Import failed: ${String(error)}`);
    }
  }

  /**
   * JSON Lines形式のデータをインポート
   */
  private async importJsonlData(data: string): Promise<MigrationResult> {
    try {
      const rules = parseJsonl(data);
      await this.saveJsonRules(rules);

      return {
        success: true,
        migratedRules: rules,
        errors: [],
        warnings: [],
        originalCount: data.split("\n").filter((line) => line.trim()).length,
        migratedCount: rules.length,
      };
    } catch (error) {
      throw new Error(`JSONL import failed: ${String(error)}`);
    }
  }

  /**
   * JSON形式のデータをインポート
   */
  private async importJsonData(data: string): Promise<MigrationResult> {
    try {
      const parsedData: unknown = JSON.parse(data);

      // 新形式のJSONコレクション
      if (
        typeof parsedData === "object" &&
        parsedData !== null &&
        "version" in parsedData &&
        "rules" in parsedData
      ) {
        const collection = parsedData as NgRuleJsonCollection;

        // ルールを保存
        await this.saveJsonRules(collection.rules);

        // 設定があれば保存（コメントコマンド設定を含む）
        if (collection.settings) {
          await this.saveSettings(collection.settings);
        }

        return {
          success: true,
          migratedRules: collection.rules,
          errors: [],
          warnings: [],
          originalCount: collection.rules.length,
          migratedCount: collection.rules.length,
        };
      }

      // 旧形式のFilterDatabase
      if (
        typeof parsedData === "object" &&
        parsedData !== null &&
        "rules" in parsedData &&
        "settings" in parsedData
      ) {
        const legacyData = parsedData as FilterDatabase;

        // 旧形式→JSON形式に変換
        const convertedRules: NgRuleJson[] = [];

        for (const rule of legacyData.rules) {
          const jsonRule = this.convertLegacyRuleToJson(rule);
          if (jsonRule) {
            convertedRules.push(jsonRule);
          }
        }

        await Promise.all([
          this.saveJsonRules(convertedRules),
          this.saveSettings(legacyData.settings),
        ]);

        return {
          success: true,
          migratedRules: convertedRules,
          errors: [],
          warnings: [
            `Converted ${legacyData.rules.length} legacy rules to JSON format`,
          ],
          originalCount: legacyData.rules.length,
          migratedCount: convertedRules.length,
        };
      }

      // CommentFilter（旧機能）のレガシー設定形式
      if (
        typeof parsedData === "object" &&
        parsedData !== null &&
        LegacyConverter.isLegacyData(parsedData as Record<string, unknown>)
      ) {
        const legacySettings = parsedData as LegacyCommentFilterSettings;

        window.logger?.info(
          "[CommentFilter2] Detected legacy CommentFilter settings format",
        );

        // レガシー設定をJSON Lines形式に変換
        const conversionResult = LegacyConverter.convert(legacySettings);

        await Promise.all([
          this.saveJsonRules(conversionResult.rules),
          this.saveSettings(conversionResult.settings),
        ]);

        window.logger?.info(
          `[CommentFilter2] Legacy conversion completed: ${conversionResult.rules.length} rules converted`,
        );

        return {
          success: true,
          migratedRules: conversionResult.rules,
          errors: [],
          warnings: conversionResult.conversionLog,
          originalCount: this.countLegacyRules(legacySettings),
          migratedCount: conversionResult.rules.length,
        };
      }

      throw new Error("Invalid JSON format");
    } catch (error) {
      throw new Error(`JSON import failed: ${String(error)}`);
    }
  }

  /**
   * CSV形式のデータをインポート
   */
  private async importCsvData(data: string): Promise<MigrationResult> {
    try {
      const migrationResult = convertCsvToJsonl(data);

      if (migrationResult.success) {
        await this.saveJsonRules(migrationResult.migratedRules);
      }

      return migrationResult;
    } catch (error) {
      throw new Error(`CSV import failed: ${String(error)}`);
    }
  }

  /**
   * 全データを削除
   */
  public async clearAllData(): Promise<void> {
    if (!this.db) {
      throw new Error("Database not initialized");
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(
        [
          CONSTANTS.DB_CONFIG.STORES.RULES,
          CONSTANTS.DB_CONFIG.STORES.SETTINGS,
          "json_rules",
        ],
        "readwrite",
      );

      const rulesStore = transaction.objectStore(
        CONSTANTS.DB_CONFIG.STORES.RULES,
      );
      const settingsStore = transaction.objectStore(
        CONSTANTS.DB_CONFIG.STORES.SETTINGS,
      );
      const jsonRulesStore = transaction.objectStore("json_rules");

      const clearRules = rulesStore.clear();
      const clearSettings = settingsStore.clear();
      const clearJsonRules = jsonRulesStore.clear();

      let completedCount = 0;

      const checkCompletion = () => {
        completedCount++;
        if (completedCount === 3) {
          resolve();
        }
      };

      clearRules.onsuccess = checkCompletion;
      clearSettings.onsuccess = checkCompletion;
      clearJsonRules.onsuccess = checkCompletion;

      clearRules.onerror = () => reject(new Error("Failed to clear rules"));
      clearSettings.onerror = () =>
        reject(new Error("Failed to clear settings"));
      clearJsonRules.onerror = () =>
        reject(new Error("Failed to clear JSON rules"));
    });
  }

  /**
   * ヘルパーメソッド: ストアから全データを取得
   */
  private getAllFromStore(store: IDBObjectStore): Promise<IndexedDBRuleItem[]> {
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result as IndexedDBRuleItem[]);
      request.onerror = () => {
        const err = request.error;
        if (err instanceof Error) {
          reject(err);
        } else if (
          err &&
          typeof (err as { message?: unknown }).message === "string"
        ) {
          reject(new Error((err as { message: string }).message));
        } else {
          reject(new Error("IndexedDB getAll error"));
        }
      };
    });
  }

  /**
   * ヘルパーメソッド: ストアにデータを追加
   */
  private addToStore(
    store: IDBObjectStore,
    data: NgRuleJson | IndexedDBRuleItem | Record<string, unknown>,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = store.add(data);
      request.onsuccess = () => resolve();
      request.onerror = () => {
        const err = request.error;
        if (err instanceof Error) {
          reject(err);
        } else if (
          err &&
          typeof (err as { message?: unknown }).message === "string"
        ) {
          reject(new Error((err as { message: string }).message));
        } else {
          reject(new Error("IndexedDB add error"));
        }
      };
    });
  }

  /**
   * ヘルパーメソッド: ストアにデータを保存
   */
  protected putToStore(
    store: IDBObjectStore,
    data: Record<string, unknown>,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = store.put(data);
      request.onsuccess = () => resolve();
      request.onerror = () => {
        const err = request.error;
        if (err instanceof Error) {
          reject(err);
        } else if (
          err &&
          typeof (err as { message?: unknown }).message === "string"
        ) {
          reject(new Error((err as { message: string }).message));
        } else {
          reject(new Error("IndexedDB put error"));
        }
      };
    });
  }
}
