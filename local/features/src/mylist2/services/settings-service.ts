import "../../types/global.d.ts";

import { Mylist2DB } from "../components/database.js";
import { ManagerSettings } from "../../types/mylist-types.js";

export class SettingsService {
  private db: Mylist2DB;
  private toMessage(value: unknown): string {
    return value instanceof Error ? value.message : String(value);
  }

  constructor(db: Mylist2DB) {
    this.db = db;
  }

  async saveManagerSettings(settings: ManagerSettings): Promise<void> {
    const database = await this.db.initDB();
    const transaction = database.transaction(["manager"], "readwrite");
    const store = transaction.objectStore("manager");

    return new Promise<void>((resolve, reject) => {
      const safe: ManagerSettings = {
        mylistSortType: settings.mylistSortType || "name_asc",
        videoSortType: settings.videoSortType || "uploadedAt_desc",
      };
      const request = store.put({ id: "settings", ...safe });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error(this.toMessage(request.error)));
    });
  }

  async loadManagerSettings(): Promise<ManagerSettings> {
    const database = await this.db.initDB();
    const transaction = database.transaction(["manager"], "readonly");
    const store = transaction.objectStore("manager");

    return new Promise<ManagerSettings>((resolve, reject) => {
      const request = store.get("settings");

      request.onsuccess = () => {
        const result = request.result as ManagerSettings | null;
        if (result && typeof result.mylistSortType === 'string' && typeof result.videoSortType === 'string') {
          resolve(result);
          return;
        }
        resolve({ mylistSortType: "name_asc", videoSortType: "uploadedAt_desc" });
      };
      request.onerror = () => reject(new Error(this.toMessage(request.error)));
    });
  }
} 