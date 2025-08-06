import "../../types/global.d.ts";

import { VideoInfo } from "../../types/video-types.js";
import { QueueItem } from "../../types/mylist-types.js";

export class ApiService {
  private apiCache: Map<string, VideoInfo>;
  private apiRequestQueue: QueueItem[];
  private isProcessingQueue: boolean;
  private readonly API_RATE_LIMIT: number;
  private readonly API_REQUEST_LIMIT: number;
  private apiRequestCount: number;

  constructor() {
    this.apiCache = new Map();
    this.apiRequestQueue = [];
    this.isProcessingQueue = false;
    this.API_RATE_LIMIT = 200; // 1リクエスト/200ミリ秒
    this.API_REQUEST_LIMIT = 50; // API制限の追加
    this.apiRequestCount = 0; // APIリクエスト回数のカウンター
  }

  // APIリクエストのキューイング処理
  async queueApiRequest(videoId: string): Promise<VideoInfo> {
    return new Promise<VideoInfo>((resolve, reject) => {
      this.apiRequestQueue.push({
        videoId,
        resolve,
        reject,
      });

      if (!this.isProcessingQueue) {
        this.processQueue();
      }
    });
  }

  // キューの処理
  private async processQueue(): Promise<void> {
    if (this.apiRequestQueue.length === 0) {
      this.isProcessingQueue = false;
      return;
    }

    this.isProcessingQueue = true;
    const request = this.apiRequestQueue.shift();

    try {
      if (request) {
        const result = await this._fetchVideoInfo(request.videoId);
        request.resolve(result);
      }
    } catch (error) {
      if (request) {
        request.reject(error instanceof Error ? error : new Error(String(error)));
      }
    }

    // 次のリクエストまで待機
    await new Promise((resolve) => setTimeout(resolve, this.API_RATE_LIMIT));
    this.processQueue();
  }

  // 実際のAPI呼び出し（内部用）
  private async _fetchVideoInfo(videoId: string): Promise<VideoInfo> {
    try {
      const cachedData = this.apiCache.get(videoId);
      if (cachedData) {
        return cachedData;
      }

      const response = await fetch(`https://ext.nicovideo.jp/api/getthumbinfo/${videoId}`);
      const text = await response.text();

      const parser = new DOMParser();
      const xml = parser.parseFromString(text, "text/xml");

      const errorElement = xml.querySelector("error");
      if (errorElement) {
        const description = xml.querySelector("description");
        throw new Error(description?.textContent || "動画情報の取得に失敗しました");
      }

      const thumb = xml.querySelector("thumb");
      if (!thumb) {
        throw new Error("動画情報の取得に失敗しました");
      }

      const lengthElement = thumb.querySelector("length");
      if (!lengthElement || !lengthElement.textContent) {
        throw new Error("動画の長さ情報が取得できませんでした");
      }

      const length = lengthElement.textContent;
      const [minutes, seconds] = length.split(":").map(Number);
      const lengthInSeconds = minutes * 60 + seconds;

      const titleElement = thumb.querySelector("title");
      const viewCountElement = thumb.querySelector("view_counter");
      const commentNumElement = thumb.querySelector("comment_num");
      const mylistCounterElement = thumb.querySelector("mylist_counter");
      const thumbnailUrlElement = thumb.querySelector("thumbnail_url");
      const firstRetrieveElement = thumb.querySelector("first_retrieve");
      const userNicknameElement = thumb.querySelector("user_nickname");
      const chNameElement = thumb.querySelector("ch_name");

      if (!titleElement || !viewCountElement || !commentNumElement || 
          !mylistCounterElement || !thumbnailUrlElement || !firstRetrieveElement) {
        throw new Error("必要な動画情報が取得できませんでした");
      }

      const videoInfo: VideoInfo = {
        id: videoId,
        title: titleElement.textContent || "不明な動画",
        viewCount: parseInt(viewCountElement.textContent || "0"),
        commentCount: parseInt(commentNumElement.textContent || "0"),
        mylistCount: parseInt(mylistCounterElement.textContent || "0"),
        thumbnailUrl: thumbnailUrlElement.textContent || "",
        uploadedAt: new Date(firstRetrieveElement.textContent || "").getTime(),
        authorName:
          userNicknameElement?.textContent ||
          chNameElement?.textContent ||
          "不明",
        length: lengthInSeconds,
      };

      this.apiCache.set(videoId, videoInfo);
      return videoInfo;
    } catch (error) {
      throw new Error(`動画情報の取得に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`);
    }
  }

  // 公開用のfetchVideoInfo（キューイング処理を使用）
  async fetchVideoInfo(videoId: string): Promise<VideoInfo> {
    if (!videoId.match(/^(?:so|sm|nm|nx)\d+$/)) {
      throw new Error("無効な動画IDです");
    }
    return this.queueApiRequest(videoId);
  }

  // 動画情報を取得する関数
  async getVideoInfoFromSources(
    videoId: string, 
    existingData: Partial<VideoInfo> | null = null
  ): Promise<VideoInfo> {
    // APIリクエスト制限のチェック
    const shouldUseApi = this.apiRequestCount < this.API_REQUEST_LIMIT;

    // 1. 既存のデータをチェック
    if (existingData) {
      // データの完全性チェック
      const isComplete =
        existingData.title &&
        existingData.viewCount !== undefined &&
        existingData.commentCount !== undefined &&
        existingData.mylistCount !== undefined &&
        existingData.thumbnailUrl &&
        existingData.uploadedAt !== undefined &&
        existingData.authorName &&
        existingData.length !== undefined;

      if (isComplete || !shouldUseApi) {
        return {
          id: videoId,
          title: existingData.title || "不明な動画",
          viewCount: parseInt(String(existingData.viewCount)) || 0,
          commentCount: parseInt(String(existingData.commentCount)) || 0,
          mylistCount: parseInt(String(existingData.mylistCount)) || 0,
          thumbnailUrl: existingData.thumbnailUrl || "",
          uploadedAt: existingData.uploadedAt || Date.now(),
          authorName: existingData.authorName || "不明",
          length: parseInt(String(existingData.length)) || 0,
        };
      }
    }

    // 2. キャッシュをチェック
    const cachedData = this.apiCache.get(videoId);
    if (cachedData) {
      return cachedData;
    }

    // 3. API制限に達している場合は既存データを使用
    if (!shouldUseApi) {
      return {
        id: videoId,
        title: existingData?.title || "不明な動画",
        viewCount: parseInt(String(existingData?.viewCount)) || 0,
        commentCount: parseInt(String(existingData?.commentCount)) || 0,
        mylistCount: parseInt(String(existingData?.mylistCount)) || 0,
        thumbnailUrl: existingData?.thumbnailUrl || "",
        uploadedAt: existingData?.uploadedAt || Date.now(),
        authorName: existingData?.authorName || "不明",
        length: parseInt(String(existingData?.length)) || 0,
      };
    }

    // 4. APIを使用
    this.apiRequestCount++;
    return this.fetchVideoInfo(videoId);
  }

  // 動画IDまたはURLから動画IDを抽出する関数
  extractVideoId(input: string): string {
    // URLからの抽出パターン
    const urlPatterns = [/nicovideo\.jp\/watch\/((?:so|sm|nm|nx)\d+)/, /nico\.ms\/((?:so|sm|nm|nx)\d+)/];

    // URLからの抽出を試行
    for (const pattern of urlPatterns) {
      const match = input.match(pattern);
      if (match) {
        return match[1];
      }
    }

    // 直接的な動画ID（so/sm/nm/nx + 数字）の場合
    if (input.match(/^(?:so|sm|nm|nx)\d+$/)) {
      return input;
    }

    throw new Error("無効な動画IDまたはURLです");
  }

  // APIリクエストカウンターをリセット
  resetApiRequestCount(): void {
    this.apiRequestCount = 0;
  }

  // キャッシュをクリア
  clearCache(): void {
    this.apiCache.clear();
  }

  // キャッシュにデータを追加
  setCacheData(videoId: string, videoInfo: VideoInfo): void {
    this.apiCache.set(videoId, videoInfo);
  }
} 