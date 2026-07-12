import { UIManager } from "@/comment-filter2/components/ui-manager";
import { FilterStorage } from "@/comment-filter2/storage/indexed-db";
import type { NgRuleJson } from "@/types/filter-types";

const initialRules: NgRuleJson[] = [
  {
    pattern: "荒らし|スパム",
    flags: "gi",
    action: { type: "hide" },
    smid: ["ALL"],
    enabled: true,
  },
  {
    pattern: "ネタバレ",
    flags: "gi",
    action: { type: "replace", replacement: "伏せ字" },
    smid: ["sm100"],
    enabled: true,
  },
];

async function deleteDatabase(): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase("CommentFilter2DB");
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

async function seedAndStart(): Promise<void> {
  await deleteDatabase();
  const storage = new FilterStorage();
  await storage.initialize();
  await storage.saveJsonRules(initialRules);
  await storage.saveSettings({
    debugMode: false,
    isEnabled: true,
    logToCommentFilterLogger: false,
    commandSettings: {
      owner: ["medium", "red"],
      main: ["medium", "blue"],
      easy: ["small"],
      normal: ["medium"],
    },
  });

  const manager = new UIManager(
    () => {
      window.dispatchEvent(new CustomEvent("cf2:test-filter-applied"));
    },
    () => Boolean(window.videoPlayer),
  );
  // UIManagerのコンストラクター内初期化（IndexedDB接続・設定読込）の完了を待つ。
  await new Promise((resolve) => setTimeout(resolve, 50));
  await manager.show();
}

Object.assign(window, {
  videoPlayer: {
    getComments: () => ({ meta: { status: 200 }, data: { threads: [] } }),
  },
  CommentFilter2Data: {
    currentSmid: "sm100",
    originalData: {
      meta: { status: 200 },
      data: {
        threads: [
          {
            id: "thread-1",
            fork: "main",
            commentCount: 2,
            comments: [
              {
                id: "comment-1",
                no: 1,
                vposMs: 0,
                body: "荒らしコメント",
                commands: [],
                userId: "user-1",
                isPremium: false,
                score: 0,
                postedAt: "2026-07-12T00:00:00Z",
                nicoruCount: 0,
                nicoruId: null,
                source: "nicovideo",
                isMyPost: false,
              },
              {
                id: "comment-2",
                no: 2,
                vposMs: 1000,
                body: "通常コメント",
                commands: [],
                userId: "user-2",
                isPremium: false,
                score: 0,
                postedAt: "2026-07-12T00:00:01Z",
                nicoruCount: 0,
                nicoruId: null,
                source: "nicovideo",
                isMyPost: false,
              },
            ],
          },
        ],
      },
    },
    filteredData: null,
    lastUpdated: Date.now(),
  },
  logger: {
    debug: () => undefined,
    info: () => undefined,
    warn: () => undefined,
    error: () => undefined,
    log: () => undefined,
    handleError: () => undefined,
    measurePerformance: (
      _component: string,
      _method: string,
      callback: () => void,
    ) => callback(),
  },
  toastr: {
    success: () => undefined,
    error: () => undefined,
    info: () => undefined,
    warning: () => undefined,
  },
  CommentFilter2Test: { seedAndStart },
});
