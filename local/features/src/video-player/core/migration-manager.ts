/**
 * データベースマイグレーション管理システム
 * 自動昇格・バージョン管理を司る重要なシステムなのじゃ
 */

import { 
  DB_CONFIG, 
  DB_VERSION_HISTORY, 
  MIGRATION_CONFIGS,
  SystemInfo 
} from '../config/database-config';

export class MigrationManager {
  private db: IDBDatabase | null = null;
  private migrationInProgress = false;
  private backupData: {
    version?: number;
    timestamp?: string;
    stores?: Record<string, unknown[]>;
  } = {};

  constructor() {
    this.setupErrorHandling();
  }

  /**
   * データベースマイグレーションを実行
   * @param db データベースインスタンス
   * @param oldVersion 旧バージョン
   * @param newVersion 新バージョン
   * @returns マイグレーション結果
   */
  async executeMigration(
    db: IDBDatabase,
    oldVersion: number,
    newVersion: number
  ): Promise<{ success: boolean; error?: string }> {
    
    if (this.migrationInProgress) {
      return { success: false, error: '既にマイグレーションが実行中なのじゃ' };
    }

    this.migrationInProgress = true;
    this.db = db;

    try {
      window.logger?.info(`マイグレーション開始: v${oldVersion} → v${newVersion}`);

      // バックアップ作成
      await this.createBackup(db, oldVersion);

      // 段階的マイグレーション実行
      for (let version = oldVersion + 1; version <= newVersion; version++) {
        await this.migrateToVersion(db, version);
      }

      // マイグレーション完了記録
      await this.recordMigrationSuccess(db, newVersion);

      window.logger?.info(`マイグレーション完了: v${newVersion}`);
      return { success: true };

    } catch (error) {
      window.logger?.error('マイグレーション失敗:', error);
      
      // ロールバック実行
      await this.rollback(db, oldVersion);
      
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'マイグレーションに失敗したのじゃ' 
      };
    } finally {
      this.migrationInProgress = false;
      this.cleanupBackup();
    }
  }

  /**
   * 指定バージョンへのマイグレーション
   * @param db データベース
   * @param version 対象バージョン
   */
  private async migrateToVersion(db: IDBDatabase, version: number): Promise<void> {
    const migration = MIGRATION_CONFIGS[version];
    
    if (!migration) {
      throw new Error(`バージョン ${version} のマイグレーション設定が見つからないのじゃ`);
    }

    window.logger?.info(`マイグレーション実行中: v${version} - ${migration.description}`);

    // マイグレーション実行
    const transaction = db.transaction(
      Array.from(db.objectStoreNames), 
      'readwrite'
    );

    try {
      await migration.execute(db, transaction);
      
      // トランザクション完了を待機
      await new Promise<void>((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      });

      window.logger?.info(`マイグレーション完了: v${version}`);
    } catch (error) {
      throw new Error(`バージョン ${version} のマイグレーションに失敗: ${error}`);
    }
  }

  /**
   * バックアップ作成
   * @param db データベース
   * @param version 現在のバージョン
   */
  private async createBackup(db: IDBDatabase, version: number): Promise<void> {
    this.backupData = {
      version,
      timestamp: new Date().toISOString(),
      stores: {}
    };

    const storeNames = Array.from(db.objectStoreNames);
    const transaction = db.transaction(storeNames, 'readonly');

    for (const storeName of storeNames) {
      const store = transaction.objectStore(storeName);
      const request = store.getAll();
      
      await new Promise<void>((resolve, reject) => {
        request.onsuccess = () => {
          if (!this.backupData.stores) {
            this.backupData.stores = {};
          }
          this.backupData.stores[storeName] = request.result;
          resolve();
        };
        request.onerror = () => reject(request.error);
      });
    }

    // バックアップをローカルストレージに保存
    try {
      localStorage.setItem(
        `nicoCacheDB_backup_v${version}`,
        JSON.stringify(this.backupData)
      );
      window.logger?.info(`バックアップ作成完了: v${version}`);
    } catch (error) {
      window.logger?.warn('バックアップ保存失敗:', error);
    }
  }

  /**
   * ロールバック実行
   * @param db データベース
   * @param targetVersion 復旧対象バージョン
   */
  private async rollback(db: IDBDatabase, targetVersion: number): Promise<void> {
    if (!this.backupData.stores) {
      window.logger?.error('バックアップデータが見つからないのじゃ');
      return;
    }

    try {
      window.logger?.info(`ロールバック開始: v${targetVersion}`);

      const storeNames = Object.keys(this.backupData.stores);
      const transaction = db.transaction(storeNames, 'readwrite');

      // 各ストアのデータを復旧
      for (const storeName of storeNames) {
        if (db.objectStoreNames.contains(storeName)) {
          const store = transaction.objectStore(storeName);
          
          // 既存データをクリア
          await new Promise<void>((resolve, reject) => {
            const clearRequest = store.clear();
            clearRequest.onsuccess = () => resolve();
            clearRequest.onerror = () => reject(clearRequest.error);
          });

          // バックアップデータを復旧
          const backupItems = this.backupData.stores[storeName];
          for (const item of backupItems) {
            await new Promise<void>((resolve, reject) => {
              const putRequest = store.put(item);
              putRequest.onsuccess = () => resolve();
              putRequest.onerror = () => reject(putRequest.error);
            });
          }
        }
      }

      window.logger?.info(`ロールバック完了: v${targetVersion}`);
    } catch (error) {
      window.logger?.error('ロールバック失敗:', error);
      throw error;
    }
  }

  /**
   * マイグレーション成功記録
   * @param db データベース
   * @param version 新バージョン
   */
  private async recordMigrationSuccess(db: IDBDatabase, version: number): Promise<void> {
    if (!db.objectStoreNames.contains('systemInfo')) {
      return;
    }

    const transaction = db.transaction(['systemInfo'], 'readwrite');
    const store = transaction.objectStore('systemInfo');

    const migrationRecord: SystemInfo = {
      key: `migration_v${version}`,
      value: true,
      version,
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: {
        description: DB_VERSION_HISTORY[version as keyof typeof DB_VERSION_HISTORY]?.description || 'マイグレーション',
        executedAt: new Date().toISOString(),
        backupCreated: !!this.backupData.timestamp
      }
    };

    await new Promise<void>((resolve, reject) => {
      const request = store.put(migrationRecord);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * バックアップクリーンアップ
   */
  private cleanupBackup(): void {
    this.backupData = {};
    
    // 古いバックアップを削除
    try {
      const keys = Object.keys(localStorage);
      const backupKeys = keys.filter(key => key.startsWith('nicoCacheDB_backup_'));
      
      // 最新5件のバックアップを保持
      backupKeys.sort().reverse().slice(5).forEach(key => {
        localStorage.removeItem(key);
      });
      
      window.logger?.debug('古いバックアップを削除したのじゃ');
    } catch (error) {
      window.logger?.warn('バックアップクリーンアップ失敗:', error);
    }
  }

  /**
   * 現在のデータベースバージョンを取得
   * @param db データベース
   * @returns 現在のバージョン
   */
  async getCurrentVersion(db: IDBDatabase): Promise<number> {
    if (!db.objectStoreNames.contains('systemInfo')) {
      return 1; // 初期バージョン
    }

    try {
      const transaction = db.transaction(['systemInfo'], 'readonly');
      const store = transaction.objectStore('systemInfo');
      const request = store.get('db_version');

      return new Promise<number>((resolve) => {
        request.onsuccess = () => {
          const result = request.result;
          resolve(result ? result.version : 1);
        };
        request.onerror = () => {
          window.logger?.warn('バージョン取得失敗、初期バージョンを返すのじゃ');
          resolve(1);
        };
      });
    } catch (error) {
      window.logger?.warn('バージョン取得エラー:', error);
      return 1;
    }
  }

  /**
   * マイグレーション履歴を取得
   * @param db データベース
   * @returns マイグレーション履歴
   */
  async getMigrationHistory(db: IDBDatabase): Promise<SystemInfo[]> {
    if (!db.objectStoreNames.contains('systemInfo')) {
      return [];
    }

    try {
      const transaction = db.transaction(['systemInfo'], 'readonly');
      const store = transaction.objectStore('systemInfo');
      const request = store.getAll();

      return new Promise<SystemInfo[]>((resolve, reject) => {
        request.onsuccess = () => {
          const results = request.result;
          const migrationRecords = results.filter(item => 
            item.key.startsWith('migration_v')
          );
          resolve(migrationRecords);
        };
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      window.logger?.error('マイグレーション履歴取得エラー:', error);
      return [];
    }
  }

  /**
   * データベース整合性チェック
   * @param db データベース
   * @returns 整合性チェック結果
   */
  async validateDatabase(db: IDBDatabase): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    try {
      // ストア存在チェック
      const expectedStores = DB_VERSION_HISTORY[DB_CONFIG.CURRENT_VERSION].stores;
      for (const storeName of expectedStores) {
        if (!db.objectStoreNames.contains(storeName)) {
          errors.push(`必要なストア "${storeName}" が存在しないのじゃ`);
        }
      }

      // インデックス存在チェック
      // （必要に応じて実装）

      return { valid: errors.length === 0, errors };
    } catch (error) {
      errors.push(`整合性チェックエラー: ${error}`);
      return { valid: false, errors };
    }
  }

  /**
   * エラーハンドリング設定
   */
  private setupErrorHandling(): void {
    // グローバルエラーハンドラー
    window.addEventListener('error', (event) => {
      if (event.error && event.error.message.includes('Migration')) {
        window.logger?.error('マイグレーション関連エラー:', event.error);
      }
    });

    // Promise拒否ハンドラー
    window.addEventListener('unhandledrejection', (event) => {
      if (event.reason && event.reason.message && event.reason.message.includes('Migration')) {
        window.logger?.error('マイグレーション関連Promise拒否:', event.reason);
      }
    });
  }

  /**
   * マイグレーションの必要性チェック
   * @param currentVersion 現在のバージョン
   * @returns マイグレーションが必要かどうか
   */
  needsMigration(currentVersion: number): boolean {
    return currentVersion < DB_CONFIG.CURRENT_VERSION;
  }

  /**
   * 利用可能なマイグレーションパスを取得
   * @param fromVersion 開始バージョン
   * @returns マイグレーションパス
   */
  getMigrationPath(fromVersion: number): number[] {
    const path: number[] = [];
    for (let version = fromVersion + 1; version <= DB_CONFIG.CURRENT_VERSION; version++) {
      if (MIGRATION_CONFIGS[version]) {
        path.push(version);
      }
    }
    return path;
  }

  /**
   * デバッグ情報を取得
   * @returns デバッグ情報
   */
  getDebugInfo(): {
    migrationInProgress: boolean;
    hasBackup: boolean;
    currentDbVersion: number;
    availableMigrations: string[];
    backupTimestamp: string | undefined;
  } {
    return {
      migrationInProgress: this.migrationInProgress,
      hasBackup: Object.keys(this.backupData).length > 0,
      currentDbVersion: DB_CONFIG.CURRENT_VERSION,
      availableMigrations: Object.keys(MIGRATION_CONFIGS),
      backupTimestamp: this.backupData.timestamp
    };
  }
} 