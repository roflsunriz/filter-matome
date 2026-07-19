// IndexedDB部 - NGワードルールと設定の永続化（JSON形式対応）
import { CONSTANTS } from "@/comment-filter2/utils/constants";
import {
  NGWordRule,
  Settings,
  FilterDatabase,
  CommandSettings,
} from "@/types/filter-types";
import {
  NgRuleJson,
  NgRuleJsonCollection,
  MigrationResult,
  MigrationEventDetails,
  MigrationHistoryRecord,
  SettingStorageItem,
  SettingsStorage,
} from "@/types/filter-types";
import { IndexedDBRuleItem } from "@/types/database-types";
import {
  parseJsonl,
  convertCsvToJsonl,
  detectFileFormat,
} from "@/comment-filter2/utils/jsonl-parser";
import {
  LegacyConverter,
  LegacyCommentFilterSettings,
} from "@/comment-filter2/utils/legacy-converter";
import { saveIndexedDBEmergencyBackup } from "@/common/indexed-db-emergency-backup";
import {
  createDefaultCommandSettings,
  DEFAULT_CLEAR_EXISTING_COMMANDS,
} from "@/comment-filter2/utils/command-settings";

export class FilterStorage {
  private db: IDBDatabase | null = null;
  private dbName: string = CONSTANTS.DB_CONFIG.NAME;
  private dbVersion: number = 3; // バージョンアップ（JSON形式対応）
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
  private putToStore(
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

  /**
   * レガシー設定のルール数をカウント
   */
  private countLegacyRules(
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
