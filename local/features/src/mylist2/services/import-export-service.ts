import "@/types/global.d.ts";

import { Mylist2DB } from "@/mylist2/components/database";
import { MylistInfo, KeywordInfo, ExportData } from "@/types/mylist-types";
import { VideoInfo, DBVideo, LegacyVideo } from "@/types/video-types";
import { ApiService } from "@/mylist2/services/api-service";

export class ImportExportService {
  private db: Mylist2DB;
  private apiService: ApiService;
  private toMessage(value: unknown): string {
    return value instanceof Error ? value.message : String(value);
  }

  constructor(db: Mylist2DB, apiService: ApiService) {
    this.db = db;
    this.apiService = apiService;
  }

  async exportData(): Promise<ExportData> {
    const database = await this.db.initDB();

    // マイリスト一覧を取得
    const mylistsTransaction = database.transaction(["mylists"], "readonly");
    const mylistsStore = mylistsTransaction.objectStore("mylists");
    const mylists = await new Promise<MylistInfo[]>((resolve, reject) => {
      const request = mylistsStore.getAll();
      request.onsuccess = () => resolve(request.result as MylistInfo[]);
      request.onerror = () => reject(new Error(this.toMessage(request.error)));
    });

    // 全動画を取得
    const videosTransaction = database.transaction(["videos"], "readonly");
    const videosStore = videosTransaction.objectStore("videos");
    const allVideos = await new Promise<DBVideo[]>((resolve, reject) => {
      const request = videosStore.getAll();
      request.onsuccess = () => resolve(request.result as DBVideo[]);
      request.onerror = () => reject(new Error(this.toMessage(request.error)));
    });

    // 全キーワードを取得
    const keywordsTransaction = database.transaction(["keywords"], "readonly");
    const keywordsStore = keywordsTransaction.objectStore("keywords");
    const keywords = await new Promise<KeywordInfo[]>((resolve, reject) => {
      const request = keywordsStore.getAll();
      request.onsuccess = () => resolve(request.result as KeywordInfo[]);
      request.onerror = () => reject(new Error(this.toMessage(request.error)));
    });

    return {
      mylists,
      videos: allVideos,
      keywords,
    };
  }

  async importData(data: ExportData): Promise<void> {
    const database = await this.db.initDB();
    const transaction = database.transaction(
      ["mylists", "videos", "keywords"],
      "readwrite",
    );
    const mylistStore = transaction.objectStore("mylists");
    const videoStore = transaction.objectStore("videos");
    const keywordStore = transaction.objectStore("keywords");

    return new Promise<void>((resolve, reject) => {
      try {
        // マイリストの追加
        data.mylists.forEach((mylist: MylistInfo) => {
          mylistStore.add(mylist);
        });

        // 動画情報の追加
        data.videos.forEach((video: DBVideo) => {
          videoStore.add(video);
          // キャッシュにも追加
          this.apiService.setCacheData(video.originalId, {
            id: video.originalId,
            title: video.title,
            viewCount: video.viewCount,
            commentCount: video.commentCount,
            mylistCount: video.mylistCount,
            thumbnailUrl: video.thumbnailUrl,
            uploadedAt: video.uploadedAt,
            authorName: video.authorName,
            length: video.length,
          });
        });

        // キーワードの追加（新規）
        if (data.keywords) {
          data.keywords.forEach((keyword: KeywordInfo) => {
            keywordStore.add(keyword);
          });
        }

        transaction.oncomplete = () => {
          resolve();
        };
        transaction.onerror = () => {
          reject(new Error(this.toMessage(transaction.error)));
        };
      } catch (error) {
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    });
  }

  // レガシーデータのインポート処理
  async importLegacyData(
    jsonText: string,
    progressCallback?: (processed: number, total: number) => void,
    createMylistFunc?: (name: string) => Promise<number>,
    addVideoFunc?: (mylistId: number, videoInfo: VideoInfo) => Promise<string>,
  ): Promise<number> {
    try {
      const legacyData = JSON.parse(jsonText) as LegacyVideo[];
      const videos = legacyData.filter((item) => item.vid !== "meta");

      // APIリクエストカウンターをリセット
      this.apiService.resetApiRequestCount();

      // mylist作成関数がない場合はエラー
      if (!createMylistFunc || !addVideoFunc) {
        throw new Error(
          "マイリスト作成関数または動画追加関数が提供されていません",
        );
      }

      const mylistId = await createMylistFunc("インポートされたマイリスト");
      let processed = 0;
      const total = videos.length;

      // 並列処理を制限して実行
      const batchSize = 5;
      for (let i = 0; i < videos.length; i += batchSize) {
        const batch = videos.slice(i, i + batchSize);
        await Promise.all(
          batch.map(async (video) => {
            try {
              const existingData: Partial<VideoInfo> = {
                title: video.title,
                viewCount:
                  typeof video.view_counter === "string"
                    ? parseInt(video.view_counter)
                    : video.view_counter,
                commentCount:
                  typeof video.comment_num === "string"
                    ? parseInt(video.comment_num)
                    : video.comment_num,
                mylistCount:
                  typeof video.mylist_counter === "string"
                    ? parseInt(video.mylist_counter)
                    : video.mylist_counter,
                thumbnailUrl: video.thumbUrl,
                uploadedAt: video.first_retrieve,
                authorName: video.author,
              };

              const videoInfo = await this.apiService.getVideoInfoFromSources(
                video.vid,
                existingData,
              );
              await addVideoFunc(mylistId, videoInfo);
            } catch (error) {
              window.logger.warn(
                `動画「${video.title}」の処理に失敗しました:`,
                error,
              );
              // 最低限のデータで登録
              await addVideoFunc(mylistId, {
                id: video.vid,
                title: video.title || "取得失敗",
                viewCount:
                  typeof video.view_counter === "string"
                    ? parseInt(video.view_counter)
                    : video.view_counter || 0,
                commentCount:
                  typeof video.comment_num === "string"
                    ? parseInt(video.comment_num)
                    : video.comment_num || 0,
                mylistCount:
                  typeof video.mylist_counter === "string"
                    ? parseInt(video.mylist_counter)
                    : video.mylist_counter || 0,
                thumbnailUrl: video.thumbUrl || "",
                uploadedAt: video.first_retrieve || Date.now(),
                authorName: video.author || "不明",
                length: 0,
              });
            }
            processed++;
            if (progressCallback) {
              progressCallback(processed, total);
            }
          }),
        );
      }

      return mylistId;
    } catch (error) {
      window.logger.error("レガシーデータのインポートに失敗しました:", error);
      throw new Error(
        `レガシーデータのインポートに失敗しました: ${error instanceof Error ? error.message : "不明なエラー"}`,
      );
    }
  }
}
