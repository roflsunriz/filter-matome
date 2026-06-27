import type { CachedVideoMetadata } from "@/types";

const DB_NAME = "CacheDataManagerMetadata";
const DB_VERSION = 1;
const STORE_NAME = "videoMetadata";

export class CacheMetadataDB {
  private dbPromise: Promise<IDBDatabase> | null = null;

  public async getMetadataMap(
    ids: string[],
  ): Promise<Map<string, CachedVideoMetadata>> {
    const uniqueIds = Array.from(new Set(ids.filter((id) => id.length > 0)));
    if (uniqueIds.length === 0) return new Map();

    const db = await this.openDatabase();
    const transaction = db.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const entries = await Promise.all(
      uniqueIds.map(async (id) => {
        const metadata = await this.getFromStore(store, id);
        return metadata ? ([id, metadata] as const) : null;
      }),
    );

    return new Map(
      entries.filter(
        (entry): entry is readonly [string, CachedVideoMetadata] =>
          entry !== null,
      ),
    );
  }

  public async saveMetadata(metadata: CachedVideoMetadata): Promise<void> {
    await this.saveMetadataList([metadata]);
  }

  public async saveMetadataList(
    metadataList: CachedVideoMetadata[],
  ): Promise<void> {
    if (metadataList.length === 0) return;

    const db = await this.openDatabase();
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);

      transaction.oncomplete = () => resolve();
      transaction.onerror = () =>
        reject(transaction.error ?? new Error("Cache metadata save failed"));

      for (const metadata of metadataList) {
        store.put(metadata);
      }
    });
  }

  private async openDatabase(): Promise<IDBDatabase> {
    if (this.dbPromise) {
      return this.dbPromise;
    }

    this.dbPromise = this.openDatabaseOnce().catch(async (error: unknown) => {
      console.warn(
        "[CacheDataManager] IndexedDBの初期化に失敗したため再作成します:",
        error,
      );
      await this.deleteDatabase();
      this.dbPromise = this.openDatabaseOnce();
      return this.dbPromise;
    });

    return this.dbPromise;
  }

  private openDatabaseOnce(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        reject(request.error ?? new Error("IndexedDB open failed"));
      };

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: "id" });
        }
      };

      request.onsuccess = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.close();
          reject(new Error("IndexedDB object store is missing"));
          return;
        }
        resolve(db);
      };
    });
  }

  private deleteDatabase(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.deleteDatabase(DB_NAME);
      request.onsuccess = () => resolve();
      request.onerror = () =>
        reject(request.error ?? new Error("IndexedDB delete failed"));
      request.onblocked = () =>
        reject(new Error("IndexedDB deletion was blocked"));
    });
  }

  private getFromStore(
    store: IDBObjectStore,
    id: string,
  ): Promise<CachedVideoMetadata | null> {
    return new Promise((resolve, reject) => {
      const request = store.get(id);
      request.onerror = () =>
        reject(request.error ?? new Error("IndexedDB get failed"));
      request.onsuccess = () => {
        const result: unknown = request.result;
        resolve(this.isCachedVideoMetadata(result) ? result : null);
      };
    });
  }

  private isCachedVideoMetadata(value: unknown): value is CachedVideoMetadata {
    if (typeof value !== "object" || value === null) return false;
    const record = value as Record<string, unknown>;
    return (
      record.schemaVersion === 1 &&
      typeof record.id === "string" &&
      typeof record.title === "string" &&
      typeof record.thumbnailUrl === "string" &&
      (record.availabilityStatus === "unknown" ||
        record.availabilityStatus === "available" ||
        record.availabilityStatus === "unavailable") &&
      typeof record.availabilityCheckedAt === "number" &&
      typeof record.updatedAt === "number"
    );
  }
}
