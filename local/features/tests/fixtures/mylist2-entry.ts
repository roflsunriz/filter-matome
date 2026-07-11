import { startMylist2 } from "@/mylist2";
import type { DBVideo } from "@/types/video-types";
import type { KeywordInfo, MylistInfo } from "@/types/mylist-types";

type SeedData = {
  mylists: Array<MylistInfo & { id: number }>;
  videos: DBVideo[];
  keywords: Array<KeywordInfo & { id: number }>;
};

function createStores(database: IDBDatabase): void {
  const mylists = database.createObjectStore("mylists", {
    keyPath: "id",
    autoIncrement: true,
  });
  mylists.createIndex("name", "name");
  mylists.createIndex("sortOrder", "sortOrder");
  mylists.createIndex("createdAt", "createdAt");

  const videos = database.createObjectStore("videos", { keyPath: "id" });
  [
    "mylistId",
    "originalId",
    "title",
    "viewCount",
    "commentCount",
    "mylistCount",
    "addedAt",
    "thumbnailUrl",
    "uploadedAt",
    "authorName",
    "length",
  ].forEach((name) => videos.createIndex(name, name));
  videos.createIndex("tags", "tags", { multiEntry: true });

  const keywords = database.createObjectStore("keywords", {
    keyPath: "id",
    autoIncrement: true,
  });
  keywords.createIndex("mylistId", "mylistId");
  keywords.createIndex("keyword", "keyword");
  keywords.createIndex("addedAt", "addedAt");

  database.createObjectStore("manager", { keyPath: "id" });
  database.createObjectStore("metadata", { keyPath: "key" });
}

async function seedDatabase(seed: SeedData): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const deletion = indexedDB.deleteDatabase("Mylist2DB");
    deletion.onsuccess = () => resolve();
    deletion.onerror = () => reject(deletion.error);
  });

  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.open("Mylist2DB", 8);
    request.onupgradeneeded = () => createStores(request.result);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const database = request.result;
      const transaction = database.transaction(
        ["mylists", "videos", "keywords", "manager"],
        "readwrite",
      );
      seed.mylists.forEach((item) =>
        transaction.objectStore("mylists").put(item),
      );
      seed.videos.forEach((item) =>
        transaction.objectStore("videos").put(item),
      );
      seed.keywords.forEach((item) =>
        transaction.objectStore("keywords").put(item),
      );
      transaction.objectStore("manager").put({
        id: "settings",
        mylistSortType: "name_asc",
        videoSortType: "uploadedAt_desc",
        theme: "dark-blue",
        videoLinkTarget: "official",
      });
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
  NicoCommon: {
    createHeader: (containerId: string, options: { title?: string }) => {
      const container = document.getElementById(containerId);
      if (container) container.textContent = options.title ?? "";
    },
  },
  Mylist2Test: {
    seedAndStart: async (seed: SeedData) => {
      await seedDatabase(seed);
      startMylist2();
    },
  },
});
