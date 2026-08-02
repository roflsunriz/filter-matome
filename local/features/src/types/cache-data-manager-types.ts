import type { VideoAvailabilityStatus } from "@/types/video-types";

// 動画データの型定義
export interface VideoData {
  id: string;
  baseId: string;
  title: string;
  thumbnailUrl: string;
  quality: string;
  isTemp: boolean;
  lastUpdated: number;
  metadataSource?: "memory" | "video-api";
  availabilityStatus?: VideoAvailabilityStatus;
  availabilityCheckedAt?: number;
  availabilityErrorCode?: string;
}

export interface CachedVideoMetadata {
  id: string;
  title: string;
  thumbnailUrl: string;
  availabilityStatus: VideoAvailabilityStatus;
  availabilityCheckedAt: number;
  availabilityErrorCode?: string;
  updatedAt: number;
  schemaVersion: 1;
}

// APIレスポンスの型定義
export interface APIResponse {
  status: "ok" | "error";
  title?: string;
  description?: string;
  duration?: string;
  views?: number;
  commentCount?: number;
  mylistCount?: number;
  author?: string;
  uploadDate?: string;
  thumbnailUrl?: string;
  tags?: string[];
  fileSize?: string;
  errorCode?: string;
  availabilityStatus?: VideoAvailabilityStatus;
}

// 検索結果の型定義
export interface SearchResult {
  id: string;
  result: string[];
}

// プログレスマネージャーのオプション
export interface ProgressOptions {
  message?: string;
  error?: boolean;
}

// 外部ライブラリの型定義（グローバル変数）
declare global {
  interface Window {
    tempList: Record<string, string[]>;
    cacheList: Record<string, string[]>;
    ncversion: string;
    FlexSearch: unknown;
  }

  // グローバル変数
  const tempList: Record<string, string[]>;
  const cacheList: Record<string, string[]>;
  const ncversion: string;
}

// イベントデータの型定義
export interface SearchEventData {
  query: string;
}

export interface EventCallback<T = unknown> {
  (data?: T): void | Promise<void>;
}

// HTMLElementのカスタム拡張
export interface VideoCardElement extends HTMLElement {
  dataset: {
    id: string;
  };
}
