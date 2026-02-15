import "@/types/global.d.ts";

import { Mylist2DB } from "@/mylist2/components/database";
import { VideoInfo, DBVideo } from "@/types/video-types";

export class VideoService {
  private db: Mylist2DB;
  private toMessage(value: unknown): string {
    return value instanceof Error ? value.message : String(value);
  }

  constructor(db: Mylist2DB) {
    this.db = db;
  }

  async addVideo(mylistId: number, videoInfo: VideoInfo): Promise<string> {
    const database = await this.db.initDB();
    const transaction = database.transaction(["videos"], "readwrite");
    const store = transaction.objectStore("videos");
    const index = store.index("mylistId");

    return new Promise<string>((resolve, reject) => {
      const request = index.get(IDBKeyRange.only(mylistId));

      request.onsuccess = () => {
        const existingVideos = request.result as unknown;
        const existing = existingVideos as { id?: string } | null;
        if (existing && existing.id === videoInfo.id) {
          reject(new Error("このマイリストには既に登録されています"));
          return;
        }

        const video: DBVideo = {
          id: `${mylistId}_${videoInfo.id}`,
          originalId: videoInfo.id,
          mylistId: mylistId,
          title: videoInfo.title,
          viewCount: parseInt(String(videoInfo.viewCount)) || 0,
          commentCount: parseInt(String(videoInfo.commentCount)) || 0,
          mylistCount: parseInt(String(videoInfo.mylistCount)) || 0,
          thumbnailUrl: videoInfo.thumbnailUrl,
          uploadedAt: videoInfo.uploadedAt || Date.now(),
          authorName: videoInfo.authorName || "不明",
          length: videoInfo.length || 0,
          description: videoInfo.description || "",
          descriptionSource: "thumb" as const,
          tags:
            videoInfo.tags && videoInfo.tags.length > 0
              ? videoInfo.tags
              : undefined,
          // 任意: VideoInfoにmemoが渡ってくる場合は保持
          memo: (videoInfo as unknown as { memo?: string }).memo ?? undefined,
          addedAt: Date.now(),
        };

        const addRequest = store.add(video);
        addRequest.onsuccess = () => resolve("追加しました");
        addRequest.onerror = () => reject(new Error("追加に失敗しました"));
      };

      request.onerror = () => reject(new Error(this.toMessage(request.error)));
    });
  }

  async getVideos(mylistId: number): Promise<DBVideo[]> {
    const database = await this.db.initDB();
    const transaction = database.transaction(["videos"], "readonly");
    const store = transaction.objectStore("videos");
    const index = store.index("mylistId");

    return new Promise<DBVideo[]>((resolve, reject) => {
      const request = index.getAll(mylistId);
      request.onsuccess = () => resolve(request.result as DBVideo[]);
      request.onerror = () => reject(new Error(this.toMessage(request.error)));
    });
  }

  sortVideos(videos: DBVideo[], sortType: string): DBVideo[] {
    const [type, order] = sortType.split("_");
    const isAsc = order === "asc";

    return videos.sort((a: DBVideo, b: DBVideo) => {
      let comparison = 0;

      switch (type) {
        case "uploadedAt":
          comparison = (a.uploadedAt || 0) - (b.uploadedAt || 0);
          break;

        case "title":
          comparison = (a.title || "").localeCompare(b.title || "", "ja");
          break;

        case "viewCount":
          comparison = (a.viewCount || 0) - (b.viewCount || 0);
          break;

        case "commentCount":
          comparison = (a.commentCount || 0) - (b.commentCount || 0);
          break;

        case "mylistCount":
          comparison = (a.mylistCount || 0) - (b.mylistCount || 0);
          break;

        case "length":
          comparison = (a.length || 0) - (b.length || 0);
          break;

        case "addedAt":
          comparison = (a.addedAt || 0) - (b.addedAt || 0);
          break;

        default:
          comparison = (a.uploadedAt || 0) - (b.uploadedAt || 0);
      }

      return isAsc ? comparison : -comparison;
    });
  }

  async deleteVideo(compositeId: string): Promise<string> {
    const database = await this.db.initDB();
    const transaction = database.transaction(["videos"], "readwrite");
    const store = transaction.objectStore("videos");

    return new Promise<string>((resolve, reject) => {
      const request = store.delete(compositeId);

      request.onsuccess = () => {
        resolve("削除しました");
      };

      request.onerror = () => {
        reject(new Error("削除に失敗しました"));
      };
    });
  }

  async updateVideoInfo(
    compositeId: string,
    newInfo: Partial<VideoInfo>,
  ): Promise<void> {
    const database = await this.db.initDB();
    const transaction = database.transaction(["videos"], "readwrite");
    const store = transaction.objectStore("videos");

    return new Promise<void>((resolve, reject) => {
      const request = store.get(compositeId);

      request.onsuccess = () => {
        const existingVideo = request.result as DBVideo | null;
        if (!existingVideo) {
          reject(new Error("動画が見つかりません"));
          return;
        }

        // エンリッチ済み(watch)の説明文はgetthumbinfoデータで上書きしない
        const keepExistingDescription =
          existingVideo.descriptionSource === "watch" &&
          newInfo.description !== undefined;

        const updatedVideo: DBVideo = {
          ...existingVideo,
          title: newInfo.title || existingVideo.title,
          viewCount: newInfo.viewCount || existingVideo.viewCount,
          commentCount: newInfo.commentCount || existingVideo.commentCount,
          mylistCount: newInfo.mylistCount || existingVideo.mylistCount,
          thumbnailUrl: newInfo.thumbnailUrl || existingVideo.thumbnailUrl,
          uploadedAt: newInfo.uploadedAt || existingVideo.uploadedAt,
          authorName: newInfo.authorName || existingVideo.authorName,
          length: newInfo.length || existingVideo.length || 0,
          description: keepExistingDescription
            ? existingVideo.description
            : newInfo.description !== undefined
              ? newInfo.description
              : existingVideo.description,
          tags:
            newInfo.tags !== undefined
              ? newInfo.tags && newInfo.tags.length > 0
                ? newInfo.tags
                : undefined
              : existingVideo.tags,
        };

        const updateRequest = store.put(updatedVideo);
        updateRequest.onsuccess = () => resolve();
        updateRequest.onerror = () =>
          reject(new Error("データベースの更新に失敗しました"));
      };

      request.onerror = () => reject(new Error("動画情報の取得に失敗しました"));
    });
  }

  /** 説明文とその取得元を更新する（視聴ページからのエンリッチメント用） */
  async updateVideoDescription(
    compositeId: string,
    description: string,
    descriptionSource: "thumb" | "watch",
  ): Promise<void> {
    const database = await this.db.initDB();
    const transaction = database.transaction(["videos"], "readwrite");
    const store = transaction.objectStore("videos");

    return new Promise<void>((resolve, reject) => {
      const request = store.get(compositeId);
      request.onsuccess = () => {
        const existingVideo = request.result as DBVideo | null;
        if (!existingVideo) {
          reject(new Error("動画が見つかりません"));
          return;
        }
        const updated: DBVideo = {
          ...existingVideo,
          description,
          descriptionSource,
        };
        const updateRequest = store.put(updated);
        updateRequest.onsuccess = () => resolve();
        updateRequest.onerror = () =>
          reject(new Error("データベースの更新に失敗しました"));
      };
      request.onerror = () => reject(new Error("動画情報の取得に失敗しました"));
    });
  }

  async updateVideoMemo(compositeId: string, memo: string): Promise<void> {
    const database = await this.db.initDB();
    const transaction = database.transaction(["videos"], "readwrite");
    const store = transaction.objectStore("videos");

    return new Promise<void>((resolve, reject) => {
      const request = store.get(compositeId);
      request.onsuccess = () => {
        const existingVideo = request.result as DBVideo | null;
        if (!existingVideo) {
          reject(new Error("動画が見つかりません"));
          return;
        }
        const updated: DBVideo = { ...existingVideo, memo };
        const updateRequest = store.put(updated);
        updateRequest.onsuccess = () => resolve();
        updateRequest.onerror = () =>
          reject(new Error("データベースの更新に失敗しました"));
      };
      request.onerror = () => reject(new Error("動画情報の取得に失敗しました"));
    });
  }
}
