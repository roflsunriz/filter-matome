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
 * 動画リンクの遷移先
 * - "official": 公式プレーヤー (https://www.nicovideo.jp/watch/...)
 * - "local": ローカルプレーヤー (video-player standalone)
 */
export type VideoLinkTarget = "official" | "local";

/**
 * buildVideoUrl でローカルプレーヤーへのルーティング判定に使うコンテキスト。
 * videoId だけでは判定できない条件（投稿者名・タイトル）を補完する。
 */
export interface VideoLinkContext {
  authorName?: string;
  title?: string;
}

/**
 * マネージャー設定の型定義
 */
export interface ManagerSettings {
  mylistSortType: string;
  videoSortType: string;
  theme?: string;
  /** 動画リンクの遷移先: "official" = 公式プレーヤー, "local" = video-player standalone */
  videoLinkTarget?: VideoLinkTarget;
}

/**
 * マイリストマネージャーのインターフェース
 */
export interface MylistManager {
  deleteVideo(compositeId: string): Promise<string>;
  fetchVideoInfo(videoId: string): Promise<VideoInfo>;
  updateVideoInfo(
    compositeId: string,
    videoInfo: Partial<VideoInfo>,
  ): Promise<void>;
  updateVideoMemo(compositeId: string, memo: string): Promise<void>;
  getAllMylists(): Promise<MylistInfo[]>;
  moveKeyword(keywordId: number, targetMylistId: number): Promise<void>;
  addKeyword(targetMylistId: number, keywordText: string): Promise<number>;
  deleteKeyword(keywordId: number): Promise<void>;
  updateKeyword(keywordId: number, newKeyword: string): Promise<void>;
  addVideo(targetMylistId: number, videoData: VideoInfo): Promise<string>;
  /** 特定の動画のAPIキャッシュを無効化（情報更新前に呼び出す） */
  invalidateVideoCache(videoId: string): void;
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
