/**
 * マイリスト関連の型定義
 */

import { VideoInfo, DBVideo } from "@/types/video-types";

/**
 * マイリスト情報の型定義
 */
export interface MylistInfo {
  id?: number;
  name: string;
  createdAt: number;
  sortOrder: number;
  videoCount?: number;
}

/**
 * キーワード情報の型定義
 */
export interface KeywordInfo {
  id?: number;
  mylistId: number;
  keyword: string;
  addedAt: number;
}

/**
 * マネージャー設定の型定義
 */
export interface ManagerSettings {
  mylistSortType: string;
  videoSortType: string;
  theme?: string;
}

/**
 * マイリストマネージャーのインターフェース
 */
export interface MylistManager {
  deleteVideo(compositeId: string): Promise<string>;
  fetchVideoInfo(videoId: string): Promise<VideoInfo>;
  updateVideoInfo(compositeId: string, videoInfo: Partial<VideoInfo>): Promise<void>;
  updateVideoMemo(compositeId: string, memo: string): Promise<void>;
  getAllMylists(): Promise<MylistInfo[]>;
  moveKeyword(keywordId: number, targetMylistId: number): Promise<void>;
  addKeyword(targetMylistId: number, keywordText: string): Promise<number>;
  deleteKeyword(keywordId: number): Promise<void>;
  updateKeyword(keywordId: number, newKeyword: string): Promise<void>;
  addVideo(targetMylistId: number, videoData: VideoInfo): Promise<string>;
}

/**
 * APIリクエストキューのアイテム型定義
 */
export interface QueueItem {
  videoId: string;
  resolve: (value: VideoInfo | PromiseLike<VideoInfo>) => void;
  reject: (reason?: Error) => void;
}

/**
 * エクスポートデータの型定義
 */
export interface ExportData {
  mylists: MylistInfo[];
  videos: DBVideo[];
  keywords: KeywordInfo[];
} 
