/**
 * データベース設定・マイグレーション管理
 * 永続化昇格機能の中核設定
 */

import { StoreConfig, ModeValue } from "../../types";

// データベース基本設定
export const DB_CONFIG = {
  NAME: "NicoCachePlayerDB",
  CURRENT_VERSION: 2,
  MIGRATION_BATCH_SIZE: 100,
  BACKUP_RETENTION_DAYS: 30,
  CLEANUP_INTERVAL_HOURS: 24,
} as const;

// データベーススキーマ定義
export const DB_STORES: Record<string, StoreConfig> = {
  // 既存：プレーヤー設定
  playerSettings: {
    name: "playerSettings",
    keyPath: "id",
    autoIncrement: false,
    indexes: [
      { name: "updatedAt", unique: false },
      { name: "category", unique: false },
    ],
  },

  // 新規：動画キャッシュ情報
  videoCache: {
    name: "videoCache",
    keyPath: "videoId",
    autoIncrement: false,
    indexes: [
      { name: "lastAccessed", unique: false },
      { name: "cacheSize", unique: false },
      { name: "quality", unique: false },
    ],
  },

  // 新規：視聴履歴
  viewHistory: {
    name: "viewHistory",
    keyPath: "id",
    autoIncrement: true,
    indexes: [
      { name: "videoId", unique: false },
      { name: "watchedAt", unique: false },
      { name: "duration", unique: false },
    ],
  },

  // 新規：ユーザー統計
  userStats: {
    name: "userStats",
    keyPath: "statId",
    autoIncrement: false,
    indexes: [
      { name: "category", unique: false },
      { name: "date", unique: false },
    ],
  },

  // 新規：コメント履歴
  commentHistory: {
    name: "commentHistory",
    keyPath: "id",
    autoIncrement: true,
    indexes: [
      { name: "videoId", unique: false },
      { name: "timestamp", unique: false },
      { name: "userId", unique: false },
    ],
  },

  // 新規：システム情報
  systemInfo: {
    name: "systemInfo",
    keyPath: "key",
    autoIncrement: false,
    indexes: [
      { name: "version", unique: false },
      { name: "createdAt", unique: false },
    ],
  },
} as const;

// データベースバージョン履歴
export const DB_VERSION_HISTORY = {
  1: {
    version: 1,
    description: "基本設定ストア",
    stores: ["playerSettings"],
    migrationRequired: false,
  },
  2: {
    version: 2,
    description: "永続化昇格：キャッシュ・履歴・統計機能追加",
    stores: [
      "playerSettings",
      "videoCache",
      "viewHistory",
      "userStats",
      "commentHistory",
      "systemInfo",
    ],
    migrationRequired: true,
  },
} as const;

// マイグレーション設定
export interface MigrationConfig {
  version: number;
  description: string;
  execute: (db: IDBDatabase, transaction: IDBTransaction) => Promise<void>;
}

export const MIGRATION_CONFIGS: Record<number, MigrationConfig> = {
  2: {
    version: 2,
    description: "永続化昇格マイグレーション",
    execute: async (db: IDBDatabase, transaction: IDBTransaction) => {
      // 既存データの backup を作成
      const backupData = await backupExistingData(db);

      // 新しいストアを作成
      createNewStores(db);

      // 既存データを新しい形式に変換
      await migratePlayerSettings(db, transaction, backupData);

      // システム情報を記録
      await recordMigrationInfo(db, transaction);
    },
  },
};

// データ型定義
export interface VideoCache {
  videoId: string;
  url: string;
  quality: string;
  cacheSize: number;
  lastAccessed: Date;
  expiresAt: Date;
  metadata: {
    title: string;
    duration: number;
    thumbnail: string;
  };
}

export interface ViewHistory {
  id?: number;
  videoId: string;
  title: string;
  watchedAt: Date;
  duration: number;
  position: number;
  completed: boolean;
  source: "cache" | "stream" | "deleted";
}

export interface UserStats {
  statId: string;
  category: "daily" | "weekly" | "monthly";
  date: string;
  data: {
    videosWatched: number;
    totalDuration: number;
    commentsViewed: number;
    cacheHits: number;
    averageQuality: string;
  };
}

export interface CommentHistory {
  id?: number;
  videoId: string;
  userId: string;
  comment: string;
  timestamp: number;
  vpos: number;
  receivedAt: Date;
  filtered: boolean;
}

export interface SystemInfo {
  key: string;
  value: ModeValue;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, unknown>;
}

// ヘルパー関数
async function backupExistingData(
  db: IDBDatabase,
): Promise<Record<string, unknown>> {
  const backup: Record<string, unknown> = {};

  // playerSettings のバックアップ
  if (db.objectStoreNames.contains("playerSettings")) {
    const transaction = db.transaction(["playerSettings"], "readonly");
    const store = transaction.objectStore("playerSettings");
    const request = store.getAll();

    await new Promise((resolve, reject) => {
      request.onsuccess = () => {
        backup.playerSettings = request.result;
        resolve(undefined);
      };
      request.onerror = () => {
        const e = request.error as unknown;
        const msg =
          e && typeof (e as { message?: string }).message === "string"
            ? (e as { message: string }).message
            : typeof e === "string"
              ? e
              : JSON.stringify(e);
        reject(new Error(msg));
      };
    });
  }

  return backup;
}

function createNewStores(db: IDBDatabase): void {
  // 新しいストアを作成
  Object.values(DB_STORES).forEach((storeConfig) => {
    if (!db.objectStoreNames.contains(storeConfig.name)) {
      const store = db.createObjectStore(storeConfig.name, {
        keyPath: storeConfig.keyPath,
        autoIncrement: storeConfig.autoIncrement,
      });

      // インデックスを作成
      if (storeConfig.indexes) {
        storeConfig.indexes.forEach((index) => {
          store.createIndex(index.name, index.name, { unique: index.unique });
        });
      }
    }
  });
}

async function migratePlayerSettings(
  db: IDBDatabase,
  transaction: IDBTransaction,
  backupData: Record<string, unknown>,
): Promise<void> {
  await Promise.resolve();
  if (!backupData.playerSettings) return;

  const store = transaction.objectStore("playerSettings");

  // 既存データを新しい形式に変換
  const playerSettings = backupData.playerSettings as Array<{
    id: string;
    value: ModeValue;
    updatedAt: string;
  }>;
  for (const item of playerSettings) {
    const migratedItem = {
      ...item,
      category: "player",
      migrated: true,
      migratedAt: new Date().toISOString(),
    };

    store.put(migratedItem);
  }
}

async function recordMigrationInfo(
  db: IDBDatabase,
  transaction: IDBTransaction,
): Promise<void> {
  await Promise.resolve();
  const systemStore = transaction.objectStore("systemInfo");

  const migrationInfo: SystemInfo = {
    key: "migration_v2",
    value: true,
    version: 2,
    createdAt: new Date(),
    updatedAt: new Date(),
    metadata: {
      description: "永続化昇格マイグレーション完了",
      timestamp: Date.now(),
    },
  };

  systemStore.put(migrationInfo);
}

// 設定カテゴリ定義
export const SETTING_CATEGORIES = {
  PLAYER: "player",
  COMMENT: "comment",
  CACHE: "cache",
  UI: "ui",
  SYSTEM: "system",
} as const;

// データクリーンアップ設定
export const CLEANUP_CONFIG = {
  VIEW_HISTORY_DAYS: 90,
  COMMENT_HISTORY_DAYS: 30,
  CACHE_EXPIRE_DAYS: 7,
  STATS_RETENTION_MONTHS: 12,
} as const;
