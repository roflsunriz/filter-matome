/**
 * 型定義のエクスポート
 */

// コメント関連の型
export * from './comment-types';

// フィルター関連の型
export * from './filter-types';

// サムネイルフィルター関連の型
export * from './thumbnails-filter-types';

// 動画関連の型
export * from './video-types';

// UI関連の型
export * from './ui-types';

// 視聴履歴関連の型
export * from './watch-history-types';

// アイコン関連の型
export * from './icon-types';

// マイリスト関連の型
export * from './mylist-types';

// グローバル関連の型
export * from './global-types';

// ユーティリティ関連の型
export * from './util-types';

// Links Video Controller関連の型
export * from './mlink-video-controller-types';

// Cache Data Manager 関連の型
export * from './cache-data-manager-types';

// Movie Info 関連の型
export type {
  PanelStatus as MovieInfoPanelStatus,
  CacheItem as MovieInfoCacheItem,
  CacheEntry as MovieInfoCacheEntry,
  CacheInfoResponse as MovieInfoCacheInfoResponse,
  ThumbTagInfo as MovieInfoThumbTagInfo,
  ThumbOwnerInfo as MovieInfoThumbOwnerInfo,
  ThumbInfo as MovieInfoThumbInfo,
  MediaInfoTrack as MovieInfoMediaInfoTrack,
  MediaInfoItem as MovieInfoMediaInfoItem,
  MediaInfoResponse as MovieInfoMediaInfoResponse,
  CommentPreview as MovieInfoCommentPreview,
  DashboardState as MovieInfoDashboardState,
  DownloadDescriptor as MovieInfoDownloadDescriptor,
  PanelSummaryBuilder as MovieInfoPanelSummaryBuilder,
} from './movie-info-types';


// データベース関連の型（重複エクスポートを避けるため必要なもののみ明示的に再エクスポート）
export type {
  ModeValue,
  CommandsValue,
  StoreConfig,
  StoresConfig,
  ARRAY_FIELD_KEYS,
  IndexedDBRuleItem,
  IndexedDBSettingsItem,
  MigrationResult as DatabaseMigrationResult,
  DatabaseStats,
  MigrationRecord,
  DatabaseConfig,
  CleanupConfig,
  BackupData,
} from './database-types';

// Toastr関連の型（ExtendedHTMLElementの重複を避けるため明示的にエクスポート）
export type { 
  ToastrOptions, 
  ToastrInstance, 
  ToastrNotifyParams, 
  ToastData,
  ExtendedHTMLElement as ToastrExtendedHTMLElement 
} from './toastr-types';

// 背景画像関連の型
export * from './background-image-types';

// Video Player Bridge関連の型
export * from './video-player-bridge-types';

// 共通モジュール関連の型（CommentApiResponseの重複を避けるため明示的にエクスポート）
export type {
  HeaderConfig,
  CommonHeaderInstance,
  NvCommentParams,
  NvCommentThreadKey,
  NicoApiServerResponse,
  NicoApiData,
  CommentThread,
  CommentData,
  CommentApiResponse as CommonCommentApiResponse,
  IntegratedNicoData,
  FetchOptions,
  ExtendedFetchWatchPageResult
} from './common-types';

// Vite環境の型定義
import './vite-env.d.ts';
