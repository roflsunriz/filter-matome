import { expect, test, type Page, type Route } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const projectRoot = join(import.meta.dirname, "..");
const watchHistoryRoot = join(projectRoot, "src", "watch-history");
const fixtureEntry = join(
  import.meta.dirname,
  "fixtures",
  "watch-history-entry.ts",
);
let appBundle = "";

type SeedEntry = {
  videoId: string;
  title: string;
  ownerId: string;
  ownerName: string;
  lengthSec: number;
  watchedAt: number;
  firstWatchedAt: number;
  lastPosition: number;
  completed: boolean;
  watchCount: number;
  watchLogs: Array<{ date: number; position: number; completed: boolean }>;
  stats: {
    viewCount: number;
    commentCount: number;
    mylistCount: number;
    likeCount: number;
    uploadedAt: number;
  };
  tags: string[];
  thumbnailUrl: string;
  memo: string;
  series: {
    id: number;
    title: string;
    description: string;
    thumbnailUrl: string;
    video: { prev: null; next: null; first: null };
  } | null;
};

const now = new Date("2026-07-10T12:00:00+09:00").getTime();
const entries: SeedEntry[] = [
  {
    videoId: "sm100",
    title: "アルファ 完走動画",
    ownerId: "owner-a",
    ownerName: "投稿者A",
    lengthSec: 100,
    watchedAt: now,
    firstWatchedAt: now - 86_400_000,
    lastPosition: 96,
    completed: true,
    watchCount: 2,
    watchLogs: [
      { date: now, position: 96, completed: true },
      { date: now - 3_600_000, position: 40, completed: false },
    ],
    stats: {
      viewCount: 1000,
      commentCount: 100,
      mylistCount: 50,
      likeCount: 20,
      uploadedAt: now - 10 * 86_400_000,
    },
    tags: ["音楽", "テスト"],
    thumbnailUrl: "data:image/gif;base64,R0lGODlhAQABAAAAACw=",
    memo: "既存メモ",
    series: {
      id: 10,
      title: "テストシリーズ",
      description: "",
      thumbnailUrl: "",
      video: { prev: null, next: null, first: null },
    },
  },
  {
    videoId: "sm200",
    title: "ベータ 未完走動画",
    ownerId: "owner-b",
    ownerName: "投稿者B",
    lengthSec: 200,
    watchedAt: now - 2 * 86_400_000,
    firstWatchedAt: now - 2 * 86_400_000,
    lastPosition: 50,
    completed: false,
    watchCount: 1,
    watchLogs: [],
    stats: {
      viewCount: 200,
      commentCount: 20,
      mylistCount: 5,
      likeCount: 2,
      uploadedAt: now - 100 * 86_400_000,
    },
    tags: ["ゲーム"],
    thumbnailUrl: "data:image/gif;base64,R0lGODlhAQABAAAAACw=",
    memo: "",
    series: {
      id: 10,
      title: "テストシリーズ",
      description: "",
      thumbnailUrl: "",
      video: { prev: null, next: null, first: null },
    },
  },
  {
    videoId: "sm300",
    title: "ガンマ 単発動画",
    ownerId: "owner-a",
    ownerName: "投稿者A",
    lengthSec: 60,
    watchedAt: now - 40 * 86_400_000,
    firstWatchedAt: now - 40 * 86_400_000,
    lastPosition: 10,
    completed: false,
    watchCount: 3,
    watchLogs: [],
    stats: {
      viewCount: 3000,
      commentCount: 300,
      mylistCount: 100,
      likeCount: 80,
      uploadedAt: now - 400 * 86_400_000,
    },
    tags: ["音楽"],
    thumbnailUrl: "data:image/gif;base64,R0lGODlhAQABAAAAACw=",
    memo: "検索可能メモ",
    series: null,
  },
];

function buildAppBundle(): string {
  const temporaryDirectory = mkdtempSync(join(tmpdir(), "watch-history-test-"));
  const outputPath = join(temporaryDirectory, "watch-history.js");
  try {
    execFileSync(
      "bun",
      ["scripts/build-playwright-fixture.ts", outputPath, fixtureEntry],
      { cwd: projectRoot, stdio: "pipe" },
    );
    return readFileSync(outputPath, "utf8");
  } finally {
    rmSync(temporaryDirectory, { recursive: true, force: true });
  }
}

function buildDocument(): string {
  return readFileSync(join(watchHistoryRoot, "index.html"), "utf8").replace(
    /<script src="\/local\/features\/dist\/features\.js"><\/script>/,
    "",
  );
}

async function fulfillDocument(route: Route): Promise<void> {
  await route.fulfill({
    contentType: "text/html; charset=utf-8",
    body: buildDocument(),
  });
}

async function seedDatabase(page: Page): Promise<void> {
  await page.evaluate(async (seedEntries) => {
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open("NicoWatchHistory", 2);
      request.onupgradeneeded = () => {
        const database = request.result;
        const history = database.createObjectStore("watchHistory", {
          keyPath: "videoId",
        });
        history.createIndex("watchedAt", "watchedAt");
        history.createIndex("ownerId", "ownerId");
        history.createIndex("completed", "completed");
        history.createIndex("firstWatchedAt", "firstWatchedAt");
        history.createIndex("title", "title");
        history.createIndex("seriesId", "series.id");
        const alerts = database.createObjectStore("seriesAlerts", {
          keyPath: "id",
        });
        alerts.createIndex("seriesId", "seriesId");
        alerts.createIndex("enabled", "enabled");
        alerts.createIndex("nextCheckAt", "nextCheckAt");
      };
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const database = request.result;
        const transaction = database.transaction(
          ["watchHistory", "seriesAlerts"],
          "readwrite",
        );
        for (const entry of seedEntries) {
          transaction.objectStore("watchHistory").put(entry);
        }
        transaction.objectStore("seriesAlerts").put({
          id: "alert-10",
          seriesId: 10,
          seriesTitle: "テストシリーズ",
          lastVideoId: "sm100",
          lastVideoTitle: "アルファ 完走動画",
          lastCheckedAt: Date.now(),
          nextCheckAt: Date.now() + 3_600_000,
          checkInterval: 3_600_000,
          enabled: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        transaction.oncomplete = () => {
          database.close();
          resolve();
        };
        transaction.onerror = () => reject(transaction.error);
      };
    });
  }, entries);
}

async function openApp(page: Page): Promise<void> {
  await page.route(
    "https://www.nicovideo.jp/local/features/dist/pages/watch-history/index.html",
    fulfillDocument,
  );
  await page.goto(
    "https://www.nicovideo.jp/local/features/dist/pages/watch-history/index.html",
  );
  await page.evaluate(() => {
    sessionStorage.clear();
    localStorage.clear();
    Object.defineProperty(window, "open", {
      configurable: true,
      value: (url: string) => {
        (window as unknown as { openedUrl?: string }).openedUrl = url;
        return null;
      },
    });
    class FakeNotification {
      static permission: NotificationPermission = "granted";
      static async requestPermission(): Promise<NotificationPermission> {
        return FakeNotification.permission;
      }
      constructor(title: string) {
        (
          window as unknown as { notificationTitles?: string[] }
        ).notificationTitles ??= [];
        (
          window as unknown as { notificationTitles: string[] }
        ).notificationTitles.push(title);
      }
    }
    Object.defineProperty(window, "Notification", {
      configurable: true,
      value: FakeNotification,
    });
  });
  await seedDatabase(page);
  await page.addScriptTag({ content: appBundle });
  await page.evaluate(() => {
    (
      window as unknown as {
        WatchHistoryTest: { startWatchHistoryApp(): void };
      }
    ).WatchHistoryTest.startWatchHistoryApp();
  });
  await expect(page.locator(".history-item")).toHaveCount(entries.length);
}

test.beforeAll(() => {
  appBundle = buildAppBundle();
});

test("履歴の検索・全ソート・全フィルタ・動的詳細操作が機能する", async ({
  page,
}) => {
  await openApp(page);

  await expect(page.locator("#content-count")).toContainText("3 件");
  await page.locator("#search-input").fill("検索可能メモ");
  await expect(page.locator(".history-item")).toHaveCount(1);
  await page.locator("#search-clear").click();
  await expect(page.locator(".history-item")).toHaveCount(3);

  for (const sortButton of await page.locator(".sort-btn").all()) {
    await sortButton.click();
    await expect(sortButton).toHaveClass(/active/);
    await sortButton.click();
    await expect(sortButton.locator(".sort-order-icon")).toHaveAttribute(
      "alt",
      /arrow_/,
    );
  }

  await page.locator("#filter-owner").selectOption("owner-b");
  await expect(page.locator(".history-item")).toHaveCount(1);
  await page.locator("#filter-owner").selectOption("");
  await page.locator("#filter-completed").check();
  await expect(page.locator(".history-item")).toHaveCount(1);
  await page.locator("#filter-completed").uncheck();

  await page.locator("#filter-date-start").fill("2026-07-09");
  await page.locator("#filter-date-end").fill("2026-07-10");
  await expect(page.locator(".history-item")).toHaveCount(1);
  await page.locator("#clear-date-range").click();
  await expect(page.locator(".history-item")).toHaveCount(3);
  await page.locator("#filter-uploaded-date-start").fill("2026-06-30");
  await page.locator("#filter-uploaded-date-end").fill("2026-07-10");
  await expect(page.locator(".history-item")).toHaveCount(1);
  await page.locator("#clear-uploaded-date-range").click();
  await expect(page.locator(".history-item")).toHaveCount(3);

  const firstItem = page.locator('.history-item[data-video-id="sm100"]');
  await firstItem.locator(".watch-count-item").click();
  await expect(firstItem.locator(".watch-logs-accordion")).toHaveClass(
    /expanded/,
  );
  await firstItem.locator(".watch-count-item").click();
  await expect(firstItem.locator(".watch-logs-accordion")).not.toHaveClass(
    /expanded/,
  );

  await firstItem.click();
  await expect(page.locator("#video-detail-modal")).not.toHaveClass(/hidden/);
  await expect(page.locator("#modal-title")).toHaveText("アルファ 完走動画");
  await page.locator("#modal-open-video").click();
  expect(
    await page.evaluate(
      () => (window as unknown as { openedUrl?: string }).openedUrl,
    ),
  ).toBe("https://www.nicovideo.jp/watch/sm100");

  await page.locator("#modal-edit-memo").click();
  await expect(page.locator("#memo-edit-modal")).not.toHaveClass(/hidden/);
  await expect(page.locator("#memo-textarea")).toHaveValue("既存メモ");
  await page.locator("#memo-textarea").fill("更新メモ");
  await page.locator("#memo-save").click();
  await expect(firstItem.locator(".memo-text")).toHaveText("更新メモ");
  await page.locator("#modal-edit-memo").click();
  await page.locator("#memo-cancel").click();
  await expect(page.locator("#memo-edit-modal")).toHaveClass(/hidden/);
  await page.locator("#modal-edit-memo").click();
  await page.locator("#memo-modal-close").click();
  await page.locator("#video-detail-modal").dispatchEvent("click");
  await expect(page.locator("#video-detail-modal")).toHaveClass(/hidden/);
  await firstItem.click();
  await page.locator("#modal-close").click();
  await page.locator("#refresh-btn").click();
  await expect(page.locator("#toast-container")).toContainText(
    "データを更新しました",
  );
});

test("各タブ・シリーズ・アラートの静的および動的ボタンが機能する", async ({
  page,
}) => {
  await openApp(page);

  await page.locator("#stats-tab").click();
  await expect(page.locator("#stats-content")).toHaveClass(/active/);
  await expect(page.locator("#stats-detail-total-videos")).toHaveText("3");
  await expect(page.locator("#creator-stats")).toContainText("投稿者A");
  await page.locator("#tag-cloud .tag-cloud-item").first().click();
  await expect(page.locator("#history-content")).toHaveClass(/active/);
  await expect(page.locator("#search-input")).not.toHaveValue("");

  await page.locator("#series-tab").click();
  await expect(page.locator("#series-content")).toHaveClass(/active/);
  await expect(page.locator(".series-item")).toHaveCount(1);
  await page.locator("#series-search-input").fill("存在しない");
  await expect(page.locator(".series-item")).toHaveCount(0);
  await page.locator("#series-search-clear").click();
  await expect(page.locator(".series-item")).toHaveCount(1);
  await page.locator("#series-progress-filter").selectOption("not_started");
  await expect(page.locator(".series-item")).toHaveCount(0);
  await page.locator("#series-progress-filter").selectOption("all");
  await page.locator("#series-refresh-btn").click();
  await expect(page.locator(".series-item")).toHaveCount(1);

  await page.locator(".series-last-play-btn").click();
  expect(
    await page.evaluate(
      () => (window as unknown as { openedUrl?: string }).openedUrl,
    ),
  ).toBe("https://www.nicovideo.jp/watch/sm100");
  await page.locator(".series-item").click();
  await expect(page.locator("#series-detail-modal")).not.toHaveClass(/hidden/);
  await expect(
    page.locator("#series-detail-videos .series-video-item"),
  ).toHaveCount(2);
  await page.locator("#series-detail-add-alert").click();
  await expect(page.locator("#series-alert-modal")).not.toHaveClass(/hidden/);
  await expect(page.locator("#series-alert-series-select")).toHaveValue("10");
  await page.locator("#series-alert-modal-close").click();

  await page.locator("#series-alert-tab").click();
  await expect(page.locator("#series-alert-content")).toHaveClass(/active/);
  await expect(page.locator(".series-alert-item")).toHaveCount(1);
  await page.locator(".alert-toggle").click();
  await expect(page.locator(".alert-status")).toHaveText("無効");
  await page.locator("#series-alert-refresh-btn").click();
  await page.locator("#add-series-alert-btn").click();
  await expect(page.locator("#series-alert-modal")).not.toHaveClass(/hidden/);
  await page.locator("#series-alert-cancel").click();
  await page.locator("#add-series-alert-btn").click();
  await page.locator("#series-alert-modal-close").click();
  await page.locator("#notification-permission-btn").click();
  await expect(page.locator("#toast-container")).toContainText(
    "ブラウザ通知は既に許可されています",
  );
  await page.locator("#manual-alert-check-btn").click();
  await expect(page.locator("#toast-container")).toContainText(
    /チェック|アラート/,
  );
  page.once("dialog", (dialog) => dialog.dismiss());
  await page.locator(".alert-delete").click();
  await expect(page.locator(".series-alert-item")).toHaveCount(1);
  page.once("dialog", (dialog) => dialog.accept());
  await page.locator(".alert-delete").click();
  await expect(page.locator(".series-alert-item")).toHaveCount(0);
  await page.locator("#add-series-alert-btn-empty").click();
  await expect(page.locator("#series-alert-modal")).not.toHaveClass(/hidden/);
  await page.locator("#series-alert-series-select").selectOption("10");
  await page.locator("#series-alert-interval-select").selectOption("300000");
  await page.locator("#series-alert-enabled").uncheck();
  await page.locator("#series-alert-save").click();
  await expect(page.locator(".series-alert-item")).toHaveCount(1);
  await expect(page.locator(".alert-status")).toHaveText("無効");
});

test("削除モーダルの全条件演算子・キャンセル・確定・個別削除を検証する", async ({
  page,
}) => {
  await openApp(page);
  await page.locator("#open-history-delete-modal-btn").click();
  await expect(page.locator("#history-delete-modal")).not.toHaveClass(/hidden/);

  for (const operator of ["gte", "lte", "lt", "gt", "range"]) {
    await page.locator("#delete-operator-select").selectOption(operator);
    await page.locator("#delete-value-input").fill("2");
    if (operator === "range") {
      await expect(page.locator("#delete-range-max-field")).not.toHaveClass(
        /hidden/,
      );
      await page.locator("#delete-range-max-input").fill("3");
    }
    await expect(page.locator("#delete-dry-run-console")).toContainText(
      "条件:",
    );
  }
  await page.locator("#delete-metadata-select").selectOption("watchCount");
  await page.locator("#delete-operator-select").selectOption("gte");
  await page.locator("#delete-value-input").fill("3");
  await page.locator("#delete-by-condition-btn").click();
  await expect(page.locator("#history-delete-confirm-modal")).toBeVisible();
  await expect(page.locator(".history-delete-confirm-row")).toHaveCount(1);
  await page.locator("#history-delete-confirm-modal .btn-secondary").click();
  await expect(page.locator(".history-item")).toHaveCount(3);
  await page.locator("#delete-by-condition-btn").click();
  await page.locator("#history-delete-confirm-modal .btn-danger").click();
  await expect(page.locator(".history-item")).toHaveCount(2);

  await page.locator("#history-delete-modal .modal-overlay").click({
    position: { x: 2, y: 2 },
  });
  await expect(page.locator("#history-delete-modal")).toHaveClass(/hidden/);
  await page
    .locator('.history-item[data-video-id="sm200"] .history-delete-btn')
    .click();
  await expect(page.locator("#history-delete-confirm-modal")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator(".history-item")).toHaveCount(2);

  await page.locator("#open-history-delete-modal-btn").click();
  await page.locator("#delete-all-btn").click();
  await expect(page.locator(".history-delete-confirm-row")).toHaveCount(2);
  await page.locator("#history-delete-confirm-modal .modal-overlay").click({
    position: { x: 2, y: 2 },
  });
  await expect(page.locator(".history-item")).toHaveCount(2);
});

test("インポート・エクスポート・DB管理・通知モーダルの全操作が機能する", async ({
  page,
}) => {
  await openApp(page);
  await page.evaluate(() => {
    (window as unknown as { exportClicks: string[] }).exportClicks = [];
    URL.createObjectURL = () => "blob:test-export";
    URL.revokeObjectURL = () => undefined;
    HTMLAnchorElement.prototype.click = function click() {
      (window as unknown as { exportClicks: string[] }).exportClicks.push(
        this.download,
      );
    };
  });
  await page.locator("#export-btn").click();
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as unknown as { exportClicks: string[] }).exportClicks,
      ),
    )
    .toHaveLength(1);

  const importData = {
    version: "2.0.0",
    exportDate: new Date(now).toISOString(),
    entries: [
      {
        ...entries[0],
        videoId: "sm999",
        title: "インポート動画",
      },
    ],
    seriesAlerts: [],
  };
  await page.locator("#import-file").setInputFiles({
    name: "history.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(importData)),
  });
  await expect(
    page.locator('.history-item[data-video-id="sm999"]'),
  ).toHaveCount(1);
  await page.locator("#import-btn").click();

  await page.locator("#database-management-btn").click();
  await expect(page.locator("#database-management-modal")).not.toHaveClass(
    /hidden/,
  );
  await page.locator("#refresh-persistence-btn").click();
  await page.locator("#request-persistence-btn").click();
  await page.locator("#run-migration-btn").click();
  await page.locator("#check-migration-btn").click();
  await page.locator("#refresh-backups-btn").click();
  for (const id of [
    "auto-migration-checkbox",
    "auto-persist-checkbox",
    "auto-backup-checkbox",
    "backup-before-migration-checkbox",
  ]) {
    await page.locator(`#${id}`).click();
  }
  await page.locator("#create-backup-btn").click();
  await expect(page.locator("#toast-container")).toContainText(/バックアップ/);
  await expect(page.locator(".backup-item")).toHaveCount(2);
  page.once("dialog", (dialog) => dialog.dismiss());
  await page.locator(".backup-restore-btn").first().click();
  page.once("dialog", (dialog) => dialog.dismiss());
  await page.locator(".backup-delete-btn").first().click();
  await expect(page.locator(".backup-item")).toHaveCount(2);
  page.once("dialog", (dialog) => dialog.accept());
  await page.locator(".backup-delete-btn").first().click();
  await expect(page.locator(".backup-item")).toHaveCount(1);
  await page.locator("#db-management-modal-close").click();
  await expect(page.locator("#database-management-modal")).toHaveClass(
    /hidden/,
  );

  await page.evaluate(() => {
    Object.defineProperty(Notification, "permission", {
      configurable: true,
      value: "denied",
    });
  });
  await page.locator("#series-alert-tab").click();
  await page.locator("#notification-permission-btn").click();
  await expect(page.locator("#notification-permission-modal")).not.toHaveClass(
    /hidden/,
  );
  await page.locator("#test-notification-after-setup").click();
  await page.locator("#notification-permission-modal-close").click();
  await expect(page.locator("#notification-permission-modal")).toHaveClass(
    /hidden/,
  );
});
