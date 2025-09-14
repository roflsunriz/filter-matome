/**
 * ニコニコ動画視聴履歴拡張 - 型定義
 * 
 * @description ニコニコ動画の50件制限を打破する無制限履歴機能の型定義
 * @author roflsunriz
 */

// ===== 基本データ型 =====



/**
 * 視聴ログエントリ - 各視聴セッションの記録
 */
export interface WatchLogEntry {
  /** 視聴日時 (Epoch ms) */
  date: number;
  /** 視聴終了時点での再生位置（秒） */
  position: number;
  /** 完走フラグ（95%以上で真） */
  completed: boolean;
}

/**
 * 動画統計情報 - ニコニコ動画APIから取得する値
 */
export interface VideoStats {
  /** 再生数 */
  viewCount?: number;
  /** コメント数 */
  commentCount?: number;
  /** マイリスト数 */
  mylistCount?: number;
  /** いいね数 */
  likeCount?: number;
  /** 投稿日時 (Epoch ms) */
  uploadedAt?: number;
}

/**
 * シリーズ内の動画情報
 */
export interface SeriesVideoInfo {
  /** 動画タイプ */
  type: string;
  /** 動画ID */
  id: string;
  /** 動画タイトル */
  title: string;
  /** 投稿日時 */
  registeredAt: string;
  /** 再生時間（秒） */
  duration: number;
  /** 短い説明 */
  shortDescription: string;
  /** 再生位置 */
  playbackPosition: number | null;
  /** 統計情報 */
  count: {
    view: number;
    comment: number;
    mylist: number;
    like: number;
  };
  /** サムネイル情報 */
  thumbnail: {
    url: string;
    middleUrl: string | null;
    largeUrl: string | null;
    listingUrl: string;
    nHdUrl: string;
  };
  /** 投稿者情報 */
  owner: {
    ownerType: string;
    type: string;
    visibility: string;
    id: string;
    name: string;
    iconUrl: string;
  };
  /** チャンネル動画フラグ */
  isChannelVideo: boolean;
  /** 有料動画フラグ */
  isPaymentRequired: boolean;
  /** センシティブマスク必要フラグ */
  requireSensitiveMasking: boolean;
  /** ライブ動画情報 */
  videoLive: { prev: SeriesVideoInfo | null; next: SeriesVideoInfo | null; first: SeriesVideoInfo | null; } | null;
  /** ミュート状態 */
  isMuted: boolean;
}

/**
 * シリーズ情報
 */
export interface SeriesInfo {
  /** シリーズID */
  id: number;
  /** シリーズタイトル */
  title: string;
  /** 説明 */
  description: string;
  /** サムネイルURL */
  thumbnailUrl: string;
  /** 動画情報 */
  video: {
    /** 前の動画 */
    prev: SeriesVideoInfo | null;
    /** 次の動画 */
    next: SeriesVideoInfo | null;
    /** 最初の動画 */
    first: SeriesVideoInfo | null;
  };
}

/**
 * シリーズアラート情報
 */
export interface SeriesAlert {
  /** アラートID */
  id: string;
  /** シリーズID */
  seriesId: number;
  /** シリーズタイトル */
  seriesTitle: string;
  /** 最後に確認した動画ID */
  lastVideoId: string;
  /** 最後に確認した動画タイトル */
  lastVideoTitle: string;
  /** 最後に確認した日時 */
  lastCheckedAt: number;
  /** 次回チェック日時 */
  nextCheckAt: number;
  /** チェック間隔（ミリ秒） */
  checkInterval: number;
  /** アラート有効フラグ */
  enabled: boolean;
  /** 作成日時 */
  createdAt: number;
  /** 更新日時 */
  updatedAt: number;
}

/**
 * 視聴履歴エントリ - IndexedDBに保存する中核データ
 */
export interface WatchHistoryEntry {
  /** 動画ID (KeyPath) - sm12345 等 */
  videoId: string;
  /** 動画タイトル */
  title: string;
  /** 投稿者ID */
  ownerId: string;
  /** 投稿者名 */
  ownerName: string;
  /** 再生時間（秒） */
  lengthSec: number;
  /** 最終視聴日時 (Epoch ms) */
  watchedAt: number;
  /** 初回視聴日時 (Epoch ms) */
  firstWatchedAt: number;
  /** 最終視聴位置（秒） */
  lastPosition: number;
  /** 完走フラグ（95%以上で真） */
  completed: boolean;
  /** 累積視聴回数 */
  watchCount: number;
  /** 視聴ログ配列 - 各視聴セッションの詳細 */
  watchLogs: WatchLogEntry[];
  /** 動画統計情報 */
  stats: VideoStats | null;
  /** 動画タグ配列 */
  tags: string[];
  /** サムネイル画像URL */
  thumbnailUrl: string;
  /** ユーザーメモ */
  memo: string;
  /** シリーズ情報 */
  series: SeriesInfo | null;
}

// ===== UI関連型 =====

/**
 * ソート基準
 */
export type SortBy = 
  | 'watchedAt'     // 視聴日時
  | 'firstWatchedAt' // 初回視聴日時
  | 'title'         // タイトル
  | 'ownerName'     // 投稿者名
  | 'lengthSec'     // 再生時間
  | 'watchCount'    // 視聴回数
  | 'viewCount'     // 再生数
  | 'commentCount'  // コメント数
  | 'mylistCount'   // マイリスト数
  | 'likeCount'     // いいね数
  | 'uploadedAt';   // 投稿日時

/**
 * ソート順序
 */
export type SortOrder = 'asc' | 'desc';

/**
 * フィルタ条件
 */
export interface FilterCondition {
  /** 検索キーワード */
  searchText?: string;
  /** 投稿者IDでフィルタ */
  ownerId?: string;
  /** 完走済みのみ表示 */
  completedOnly?: boolean;
  /** 日付範囲フィルタ */
  dateRange?: {
    start: number;
    end: number;
  };
}

/**
 * 履歴ビュー設定
 */
export interface HistoryViewConfig {
  /** ソート基準 */
  sortBy: SortBy;
  /** ソート順序 */
  sortOrder: SortOrder;
  /** フィルタ条件 */
  filter: FilterCondition;
  /** ページサイズ */
  pageSize: number;
  /** 現在のページ */
  currentPage: number;
}

// ===== 統計関連型 =====

/**
 * 日別統計データ
 */
export interface DailyStats {
  /** 日付 (YYYY-MM-DD) */
  date: string;
  /** 視聴回数 */
  watchCount: number;
  /** 総視聴時間（秒） */
  totalWatchTime: number;
  /** 完走動画数 */
  completedCount: number;
}

/**
 * 時間帯別統計データ
 */
export interface HourlyStats {
  /** 時間帯 (0-23) */
  hour: number;
  /** 視聴回数 */
  watchCount: number;
}

/**
 * 投稿者別統計データ
 */
export interface CreatorStats {
  /** 投稿者ID */
  ownerId: string;
  /** 投稿者名 */
  ownerName: string;
  /** 視聴動画数 */
  videoCount: number;
  /** 総視聴時間（秒） */
  totalWatchTime: number;
}

/**
 * 全体統計データ
 */
export interface OverallStats {
  /** 総視聴動画数 */
  totalVideos: number;
  /** 総視聴時間（秒） */
  totalWatchTime: number;
  /** 完走率（0-1） */
  completionRate: number;
  /** 日別統計 */
  dailyStats: DailyStats[];
  /** 時間帯別統計 */
  hourlyStats: HourlyStats[];
  /** 投稿者別統計 */
  creatorStats: CreatorStats[];
}

// ===== データベース操作型 =====

/**
 * IndexedDB操作結果
 */
export interface DBResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * データベース設定
 */
export interface DatabaseConfig {
  /** データベース名 */
  dbName: string;
  /** バージョン */
  version: number;
  /** ストア名 */
  storeName: string;
}

// ===== イベント型 =====

/**
 * 視聴イベント型
 */
export type WatchEventType = 
  | 'start'      // 視聴開始
  | 'progress'   // 進捗更新
  | 'complete'   // 完走
  | 'pause'      // 一時停止
  | 'resume';    // 再開

/**
 * 視聴イベント
 */
export interface WatchEvent {
  /** イベント種別 */
  type: WatchEventType;
  /** 動画ID */
  videoId: string;
  /** 現在の再生位置（秒） */
  currentTime: number;
  /** 動画長（秒） */
  duration: number;
  /** イベント発生時刻 (Epoch ms) */
  timestamp: number;
}

// ===== エクスポート・インポート型 =====

/**
 * エクスポートデータ形式
 */
export interface WatchHistoryExportData {
  /** エクスポート日時 */
  exportedAt: number;
  /** データバージョン */
  version: string;
  /** 履歴エントリ配列 */
  entries: WatchHistoryEntry[];
  /** シリーズアラート配列 */
  seriesAlerts: SeriesAlert[];
}

/**
 * インポート設定
 */
export interface ImportConfig {
  /** 重複時の処理 */
  duplicateHandling: 'skip' | 'overwrite' | 'merge';
  /** 最大インポート件数 */
  maxEntries?: number;
}

// ===== シリーズ関連型 =====

/**
 * シリーズ統計情報
 */
export interface SeriesStats {
  /** シリーズID */
  seriesId: number;
  /** シリーズタイトル */
  seriesTitle: string;
  /** 視聴動画数 */
  watchedCount: number;
  /** シリーズの全動画数 */
  totalCount: number;
  /** 進捗率 */
  progressRate: number;
  /** 最終視聴日時 */
  lastWatchedAt: number;
  /** 最後に視聴した動画ID */
  lastVideoId: string;
  /** 最後に視聴した動画タイトル */
  lastVideoTitle: string;
}

/**
 * シリーズフィルタ条件
 */
export interface SeriesFilterCondition {
  /** テキスト検索 */
  searchText?: string;
  /** 進捗状況フィルタ */
  progressFilter?: 'all' | 'watching' | 'completed' | 'not_started';
  /** 最終視聴日範囲 */
  dateRange?: {
    start: number;
    end: number;
  };
}

/**
 * シリーズアラート通知結果
 */
export interface SeriesAlertNotification {
  /** アラートID */
  alertId: string;
  /** シリーズID */
  seriesId: number;
  /** シリーズタイトル */
  seriesTitle: string;
  /** 新しい動画ID */
  newVideoId: string;
  /** 新しい動画タイトル */
  newVideoTitle: string;
  /** 通知日時 */
  notifiedAt: number;
  /** 通知されたかどうか */
  notified: boolean;
}

/**
 * シリーズアラート設定
 */
export interface SeriesAlertConfig {
  /** デフォルトのチェック間隔（ミリ秒） */
  defaultCheckInterval: number;
  /** 最大アラート数 */
  maxAlerts: number;
  /** 通知を有効にするかどうか */
  enableNotifications: boolean;
  /** アラート音を鳴らすかどうか */
  enableSound: boolean;
}

// ===== マイグレーション・永続化関連型 =====

/**
 * データベースマイグレーション情報
 */
export interface MigrationInfo {
  /** マイグレーションID */
  id: string;
  /** 開始バージョン */
  fromVersion: number;
  /** 終了バージョン */
  toVersion: number;
  /** 説明 */
  description: string;
  /** 実行関数 */
  migrate: (db: IDBDatabase, transaction: IDBTransaction) => Promise<void>;
}

/**
 * データベース永続化状態
 */
export interface PersistenceStatus {
  /** 永続化されているかどうか */
  isPersistent: boolean;
  /** 使用可能な容量（バイト） */
  quota: number;
  /** 使用中の容量（バイト） */
  usage: number;
  /** 使用率（0-1） */
  usageRate: number;
  /** 永続化可能かどうか */
  canPersist: boolean;
}

/**
 * マイグレーション進捗状態
 */
export interface MigrationProgress {
  /** 実行中かどうか */
  isRunning: boolean;
  /** 現在のマイグレーション */
  currentMigration: string | null;
  /** 進捗率（0-1） */
  progress: number;
  /** 完了したマイグレーション数 */
  completedCount: number;
  /** 総マイグレーション数 */
  totalCount: number;
  /** エラーメッセージ */
  error: string | null;
}

/**
 * データベース管理設定
 */
export interface DatabaseManagementConfig {
  /** 自動マイグレーションを有効にするかどうか */
  autoMigration: boolean;
  /** 永続化を自動で要求するかどうか */
  autoPersist: boolean;
  /** バックアップを自動で作成するかどうか */
  autoBackup: boolean;
  /** マイグレーション実行前にバックアップを作成するかどうか */
  backupBeforeMigration: boolean;
} 