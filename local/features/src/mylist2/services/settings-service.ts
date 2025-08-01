import "../../types/global.d.ts";

import { Mylist2DB } from "../components/database.js";
import { ManagerSettings } from "../../types/mylist-types.js";

export class SettingsService {
  private db: Mylist2DB;

  constructor(db: Mylist2DB) {
    this.db = db;
  }

  async saveManagerSettings(settings: ManagerSettings): Promise<void> {
    const database = await this.db.initDB();
    const transaction = database.transaction(["manager"], "readwrite");
    const store = transaction.objectStore("manager");

    return new Promise<void>((resolve, reject) => {
      const request = store.put({
        id: "settings",
        mylistSortType: settings.mylistSortType || "name_asc",
        videoSortType: settings.videoSortType || "uploadedAt_desc",
      });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async loadManagerSettings(): Promise<ManagerSettings> {
    const database = await this.db.initDB();
    const transaction = database.transaction(["manager"], "readonly");
    const store = transaction.objectStore("manager");

    return new Promise<ManagerSettings>((resolve, reject) => {
      const request = store.get("settings");

      request.onsuccess = () => {
        resolve(
          request.result || {
            mylistSortType: "name_asc",
            videoSortType: "uploadedAt_desc",
          }
        );
      };
      request.onerror = () => reject(request.error);
    });
  }
} 