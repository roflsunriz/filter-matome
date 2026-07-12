import { registerCacheDataManager } from "@/cache-data-manager/main";
import type { CachedVideoMetadata } from "@/types";

type CacheDataManagerSeed = {
  cacheList: Record<string, string[]>;
  tempList: Record<string, string[]>;
  metadata: CachedVideoMetadata[];
  version: string;
};

const DB_NAME = "CacheDataManagerMetadata";
const DB_VERSION = 1;
const STORE_NAME = "videoMetadata";

async function seedMetadata(entries: CachedVideoMetadata[]): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DB_NAME);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });

  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME, { keyPath: "id" });
    };
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const database = request.result;
      const transaction = database.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      entries.forEach((entry) => store.put(entry));
      transaction.oncomplete = () => {
        database.close();
        resolve();
      };
      transaction.onerror = () => reject(transaction.error);
    };
  });
}

Object.assign(window, {
  logger: {
    debug: () => undefined,
    info: () => undefined,
    warn: () => undefined,
    error: () => undefined,
  },
  CacheDataManagerTest: {
    seedAndStart: async (seed: CacheDataManagerSeed) => {
      await seedMetadata(seed.metadata);
      Object.assign(window, {
        cacheList: { ...seed.cacheList },
        tempList: { ...seed.tempList },
        ncversion: seed.version,
        __cacheDataManagerOpenCalls: [] as string[],
      });
      window.open = (url?: string | URL) => {
        const calls = (
          window as unknown as { __cacheDataManagerOpenCalls: string[] }
        ).__cacheDataManagerOpenCalls;
        calls.push(String(url ?? ""));
        return null;
      };
      registerCacheDataManager();
      window.makeCacheList();
    },
  },
});
