import { UIManager } from "@/comment-filter2/components/ui-manager";
import { OfficialPlayerBridge } from "@/comment-filter2/integrations/official-player-bridge";
import { FilterStorage } from "@/comment-filter2/storage/indexed-db";
import type { NgRuleJson } from "@/types/filter-types";

declare global {
  interface Window {
    CommentFilter2Test: {
      seedAndStart: () => Promise<void>;
      mockCanvasBodies: string[];
      mockCanvasCommands: string[][];
      officialReloadCount: number;
      readStoredClearExistingCommands: () => Promise<boolean | undefined>;
    };
  }
}

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

async function saveLegacySettingsWithoutCommandMode(): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const openRequest = indexedDB.open("CommentFilter2DB");
    openRequest.onerror = () => reject(openRequest.error);
    openRequest.onsuccess = () => {
      const db = openRequest.result;
      const transaction = db.transaction("settings", "readwrite");
      transaction.onerror = () => {
        db.close();
        reject(transaction.error);
      };
      transaction.oncomplete = () => {
        db.close();
        resolve();
      };
      transaction.objectStore("settings").put({
        key: "main",
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
    };
  });
}

async function seedAndStart(): Promise<void> {
  await deleteDatabase();
  const storage = new FilterStorage();
  await storage.initialize();
  await storage.saveJsonRules(initialRules);
  await saveLegacySettingsWithoutCommandMode();

  const mockCanvas = document.createElement("canvas");
  mockCanvas.id = "cf2-test-comment-canvas";
  mockCanvas.width = 640;
  mockCanvas.height = 360;
  document.body.append(mockCanvas);
  window.CommentFilter2Test.mockCanvasBodies = [];
  window.CommentFilter2Test.mockCanvasCommands = [];
  const mockContext = mockCanvas.getContext("2d");
  if (!mockContext) {
    throw new Error("2D mock canvas context is unavailable");
  }
  const nativeFillText = mockContext.fillText.bind(mockContext);
  mockContext.fillText = (
    text: string,
    x: number,
    y: number,
    maxWidth?: number,
  ): void => {
    window.CommentFilter2Test.mockCanvasBodies.push(text);
    if (maxWidth === undefined) {
      nativeFillText(text, x, y);
    } else {
      nativeFillText(text, x, y, maxWidth);
    }
  };

  const renderFilteredCommentsToMockCanvas = (): void => {
    mockContext.clearRect(0, 0, mockCanvas.width, mockCanvas.height);
    window.CommentFilter2Test.mockCanvasBodies = [];
    window.CommentFilter2Test.mockCanvasCommands = [];
    const comments =
      window.CommentFilter2Data?.filteredData?.data.threads.flatMap(
        (thread) => thread.comments,
      ) ?? [];
    for (const [index, comment] of comments.entries()) {
      if (
        comment.body.length === 0 ||
        comment.commands?.includes("invisible")
      ) {
        continue;
      }
      window.CommentFilter2Test.mockCanvasCommands.push([
        ...(comment.commands ?? []),
      ]);
      mockContext.fillText(comment.body, 8, 24 + index * 24);
    }
  };

  const officialPlayerBridge = new OfficialPlayerBridge();
  const manager = new UIManager(
    () => {
      renderFilteredCommentsToMockCanvas();
      window.dispatchEvent(new CustomEvent("cf2:test-filter-applied"));
    },
    () => Boolean(window.videoPlayer),
    () => officialPlayerBridge.reloadComments(),
  );
  // UIManagerのコンストラクター内初期化（IndexedDB接続・設定読込）の完了を待つ。
  await new Promise((resolve) => setTimeout(resolve, 50));
  await manager.show();
}

async function readStoredClearExistingCommands(): Promise<boolean | undefined> {
  return new Promise((resolve, reject) => {
    const openRequest = indexedDB.open("CommentFilter2DB");
    openRequest.onerror = () => reject(openRequest.error);
    openRequest.onsuccess = () => {
      const db = openRequest.result;
      const transaction = db.transaction("settings", "readonly");
      const request = transaction.objectStore("settings").get("main");
      request.onerror = () => {
        db.close();
        reject(request.error);
      };
      request.onsuccess = () => {
        const value = request.result as
          { clearExistingCommands?: unknown } | undefined;
        db.close();
        resolve(
          typeof value?.clearExistingCommands === "boolean"
            ? value.clearExistingCommands
            : undefined,
        );
      };
    };
  });
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
                commands: ["small", "red", "ue", "184"],
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
  CommentFilter2Test: {
    seedAndStart,
    mockCanvasBodies: [],
    mockCanvasCommands: [],
    officialReloadCount: 0,
    readStoredClearExistingCommands,
  },
});
