import "@/types/global.d.ts";

import { Mylist2DB } from "@/mylist2/components/database";
import { MylistInfo } from "@/types/mylist-types";
import { DBVideo } from "@/types/video-types";

export class MylistService {
  private db: Mylist2DB;
  private toMessage(value: unknown): string {
    return value instanceof Error ? value.message : String(value);
  }

  constructor(db: Mylist2DB) {
    this.db = db;
  }

  async createMylist(name: string): Promise<number> {
    const database = await this.db.initDB();
    const transaction = database.transaction(["mylists"], "readwrite");
    const store = transaction.objectStore("mylists");

    return new Promise<number>((resolve, reject) => {
      const request = store.add({
        name: name,
        createdAt: Date.now(),
        sortOrder: 0,
      });

      request.onsuccess = () => resolve(request.result as number);
      request.onerror = () => reject(new Error(this.toMessage(request.error)));
    });
  }

  async getAllMylists(): Promise<MylistInfo[]> {
    const database = await this.db.initDB();
    const transaction = database.transaction(["mylists"], "readonly");
    const store = transaction.objectStore("mylists");

    return new Promise<MylistInfo[]>((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result as MylistInfo[]);
      request.onerror = () => reject(new Error(this.toMessage(request.error)));
    });
  }

  async sortMylists(sortType: string, getVideosFunc: (mylistId: number) => Promise<DBVideo[]>): Promise<MylistInfo[]> {
    const mylists = await this.getAllMylists();
    const mylistsWithCount = await Promise.all(
      mylists.map(async (mylist: MylistInfo) => {
        const videos = await getVideosFunc(mylist.id as number);
        return {
          ...mylist,
          videoCount: videos.length,
        };
      })
    );

    const [type, order] = sortType.split("_");
    const isAsc = order === "asc";

    return mylistsWithCount.sort((a: MylistInfo, b: MylistInfo) => {
      let comparison = 0;

      switch (type) {
        case "name":
          comparison = a.name.localeCompare(b.name, "ja");
          break;

        case "createdAt":
          comparison = a.createdAt - b.createdAt;
          break;

        case "videoCount":
          comparison = (a.videoCount || 0) - (b.videoCount || 0);
          break;

        default:
          comparison = a.name.localeCompare(b.name, "ja");
      }

      return isAsc ? comparison : -comparison;
    });
  }

  async updateMylistName(mylistId: number, newName: string): Promise<void> {
    const database = await this.db.initDB();
    const transaction = database.transaction(["mylists"], "readwrite");
    const store = transaction.objectStore("mylists");

    return new Promise<void>((resolve, reject) => {
      const request = store.get(mylistId);
      request.onsuccess = () => {
        const mylist = request.result as MylistInfo | null;
        if (!mylist) {
          reject(new Error("マイリストが見つかりません"));
          return;
        }
        mylist.name = newName;
        const updateRequest = store.put(mylist);
        updateRequest.onsuccess = () => resolve();
        updateRequest.onerror = () => reject(new Error(this.toMessage(request.error)));
      };
      request.onerror = () => reject(new Error(this.toMessage(request.error)));
    });
  }

  async deleteMylist(mylistId: number): Promise<void> {
    const database = await this.db.initDB();
    const transaction = database.transaction(["mylists", "videos"], "readwrite");
    const mylistStore = transaction.objectStore("mylists");
    const videoStore = transaction.objectStore("videos");
    const videoIndex = videoStore.index("mylistId");

    return new Promise<void>((resolve, reject) => {
      const deleteVideos = videoIndex.getAllKeys(mylistId);
      deleteVideos.onsuccess = () => {
        const keys = deleteVideos.result;
        Promise.all([
          ...keys.map((key: IDBValidKey) => {
            return new Promise<void>((res, rej) => {
              const request = videoStore.delete(key);
              request.onsuccess = () => res();
              request.onerror = () => rej(new Error(this.toMessage(request.error)));
            });
          }),
          new Promise<void>((res, rej) => {
            const request = mylistStore.delete(mylistId);
            request.onsuccess = () => res();
            request.onerror = () => rej(new Error(this.toMessage(request.error)));
          }),
        ])
          .then(() => resolve())
          .catch((e) => reject(e instanceof Error ? e : new Error(this.toMessage(e))));
      };
      deleteVideos.onerror = () => reject(new Error(this.toMessage(deleteVideos.error)));
    });
  }
} 