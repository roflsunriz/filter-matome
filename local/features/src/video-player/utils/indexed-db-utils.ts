/**
 * IndexedDBの操作を簡略化するユーティリティ
 * 永続化昇格機能対応版です
 */

import { ModeValue } from '@/types/index';
import { DatabaseManager } from '@/video-player/core/database-manager';

// レガシー互換性のための定数
const DB_NAME = 'NicoCachePlayerDB';
const STORE_NAME = 'playerSettings';
const DB_VERSION = 1;

// 昇格機能のインスタンス
const dbManager = DatabaseManager.getInstance();

/**
 * IndexedDBを初期化する（昇格機能対応版）
 * @returns 初期化されたデータベースとの接続を表すPromise
 */
export const initializeDB = async (): Promise<IDBDatabase> => {
  try {
    // 昇格機能を使用してデータベースを初期化
    await dbManager.initialize();
    
    // レガシー互換性のため、旧形式のPromiseを返す
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = (event) => {
        window.logger?.error('IndexedDBを開けませんでした:', event);
        reject(new Error('IndexedDBを開けませんでした'));
      };

      request.onsuccess = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        resolve(db);
      };

      request.onupgradeneeded = (event) => {
        // 昇格機能によって処理されるため、最小限の処理のみ
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      };
    });
  } catch (error) {
    window.logger?.error('昇格機能初期化エラー:', error);
    throw error;
  }
};

/**
 * 設定をIndexedDBに保存する（昇格機能対応版）
 * @param key 設定のキー
 * @param value 設定の値
 * @returns 保存操作の結果を表すPromise
 */
export const saveSettings = async (key: string, value: ModeValue): Promise<void> => {
  try {
    // 昇格機能を優先使用
    await dbManager.savePlayerSetting(key, value);
    window.logger?.debug(`設定保存完了: ${key}`);
  } catch (error) {
    window.logger?.error(`昇格機能での設定保存失敗: ${key}`, error);
    
    // フォールバック：従来方式
    return new Promise((resolve, reject) => {
      initializeDB().then(db => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);

        const request = store.put({
          id: key,
          value: value,
          updatedAt: new Date().toISOString()
        });

        request.onsuccess = () => {
          resolve();
        };

        request.onerror = (event) => {
          window.logger?.error(`設定 "${key}" の保存に失敗しました:`, event);
          reject(new Error(`設定 "${key}" の保存に失敗しました`));
        };

        transaction.oncomplete = () => {
          db.close();
        };
      }).catch(reject);
    });
  }
};

/**
 * 設定をIndexedDBから取得する（昇格機能対応版）
 * @param key 設定のキー
 * @param defaultValue 設定が見つからなかった場合のデフォルト値
 * @returns 設定値を表すPromise
 */
export const getSettings = async <T>(key: string, defaultValue: T): Promise<T> => {
  try {
    // 昇格機能を優先使用
    const result = await dbManager.getPlayerSetting(key, defaultValue);
    window.logger?.debug(`設定取得完了: ${key}`);
    return result;
  } catch (error) {
    window.logger?.error(`昇格機能での設定取得失敗: ${key}`, error);
    
    // フォールバック：従来方式
    return new Promise((resolve) => {
      initializeDB().then(db => {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);

        const request = store.get(key);

        request.onsuccess = () => {
          const result = request.result as { value?: unknown } | undefined;
          if (result && 'value' in result) {
            resolve(result.value as T);
          } else {
            resolve(defaultValue);
          }
        };

        request.onerror = (event) => {
          window.logger?.error(`設定 "${key}" の取得に失敗しました:`, event);
          // エラーが発生してもデフォルト値を返す
          resolve(defaultValue);
        };

        transaction.oncomplete = () => {
          db.close();
        };
      }).catch(error => {
        window.logger?.error('DB初期化エラー:', error);
        resolve(defaultValue);
      });
    });
  }
};

/**
 * IndexedDBから全ての設定を取得する（昇格機能対応版）
 * @returns 全ての設定を表すPromise
 */
export const getAllSettings = async (): Promise<Record<string, ModeValue>> => {
  try {
    // 昇格機能を優先使用
    const result = await dbManager.getAllSettings();
    window.logger?.debug('全設定取得完了');
    return result;
  } catch (error) {
    window.logger?.error('昇格機能での全設定取得失敗:', error);
    
    // フォールバック：従来方式
    return new Promise((resolve, reject) => {
      initializeDB().then(db => {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();

        request.onsuccess = () => {
          const allSettings: Record<string, ModeValue> = {};
          (request.result as Array<{ id?: string; value?: ModeValue }>).forEach(item => {
            if (item && typeof item.id === 'string') {
              allSettings[item.id] = item.value as ModeValue;
            }
          });
          resolve(allSettings);
        };

        request.onerror = (event) => {
          window.logger?.error('設定の一括取得に失敗しました:', event);
          reject(new Error('設定の一括取得に失敗しました'));
        };

        transaction.oncomplete = () => {
          db.close();
        };
      }).catch(reject);
    });
  }
};

// 新しい昇格機能へのエクスポート
export { DatabaseManager } from '@/video-player/core/database-manager';
export { MigrationManager } from '@/video-player/core/migration-manager';
export type { 
  VideoCache, 
  ViewHistory, 
  UserStats, 
  CommentHistory, 
  SystemInfo 
} from '@/video-player/config/database-config'; 