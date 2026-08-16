import { expect, test, type Page, type Route } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

type AvailabilityStatus = "available" | "unavailable";

type Seed = {
  cacheList: Record<string, string[]>;
  tempList: Record<string, string[]>;
  metadata: Array<{
    id: string;
    title: string;
    thumbnailUrl: string;
    availabilityStatus: AvailabilityStatus;
    availabilityCheckedAt: number;
    updatedAt: number;
    schemaVersion: 1;
    availabilityErrorCode?: string;
  }>;
  version: string;
};

const projectRoot = join(import.meta.dirname, "..");
const fixtureEntry = join(
  import.meta.dirname,
  "fixtures",
  "cache-data-manager-entry.ts",
);
const pageUrl = "https://www.nicovideo.jp/cache/";
const transparentPixel =
  "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=";
let appBundle = "";

function buildBundle(): string {
  const directory = mkdtempSync(join(tmpdir(), "cache-data-manager-test-"));
  const output = join(directory, "cache-data-manager.js");
  try {
    execFileSync(
      "bun",
      ["scripts/build-playwright-fixture.ts", output, fixtureEntry],
      { cwd: projectRoot, stdio: "pipe" },
    );
    return readFileSync(output, "utf8");
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

function createSeed(count = 52): Seed {
  const cacheList: Record<string, string[]> = {};
  const tempList: Record<string, string[]> = {};
  const metadata: Seed["metadata"] = [];
  const now = Date.now();

  for (let index = 1; index <= count; index++) {
    const baseId = `sm${1000 + index}`;
    const quality =
      index % 3 === 0 ? "360p" : index % 2 === 0 ? "480p" : "720p";
    const cacheId = `${baseId}_${quality}`;
    const title =
      index <= 51
        ? `共通検索 動画 ${String(index).padStart(2, "0")}`
        : "別タイトル";
    const isTemporary = index % 5 === 0;
    (isTemporary ? tempList : cacheList)[cacheId] = [title];
    metadata.push({
      id: baseId,
      title,
      thumbnailUrl: transparentPixel,
      availabilityStatus: index % 7 === 0 ? "unavailable" : "available",
      availabilityErrorCode: index % 7 === 0 ? "DELETED" : undefined,
      availabilityCheckedAt: now,
      updatedAt: now,
      schemaVersion: 1,
    });
  }

  return {
    cacheList,
    tempList,
    metadata,
    version: "NicoCache_nl version 2026-07-02",
  };
}

async function fulfillDocument(route: Route): Promise<void> {
  await route.fulfill({
    contentType: "text/html; charset=utf-8",
    body: '<!doctype html><html lang="ja"><head><meta charset="utf-8"><title>cache-data-manager test</title></head><body></body></html>',
  });
}

async function openApp(page: Page, seed = createSeed()): Promise<void> {
  await page.route(pageUrl, fulfillDocument);
  await page.goto(pageUrl);
  await page.addScriptTag({ content: appBundle });
  await page.evaluate(async (data) => {
    await (
      window as unknown as {
        CacheDataManagerTest: {
          seedAndStart: (seed: Seed) => Promise<void>;
        };
      }
    ).CacheDataManagerTest.seedAndStart(data);
  }, seed);
  await expect(page.locator(".video-card").first()).toBeVisible();
  await expect(page.locator(".global-progress")).toBeHidden();
}

test.beforeAll(() => {
  appBundle = buildBundle();
});

test.beforeEach(async ({ page }) => {
  await page.route("https://ext.nicovideo.jp/api/getthumbinfo/**", (route) => {
    const id = route.request().url().split("/").at(-1) ?? "sm0";
    void route.fulfill({
      contentType: "text/xml; charset=utf-8",
      body: `<nicovideo_thumb_response status="ok"><thumb><title>詳細 ${id}</title><thumbnail_url>${transparentPixel}</thumbnail_url><user_nickname>テスト投稿者</user_nickname><length>1:23</length><view_counter>1200</view_counter><comment_num>34</comment_num><mylist_counter>56</mylist_counter><first_retrieve>2026-01-02T03:04:05+09:00</first_retrieve><tags><tag>テスト</tag></tags></thumb></nicovideo_thumb_response>`,
    });
  });
  await page.route("https://www.nicovideo.jp/cache/info/v3?**", (route) => {
    const id = decodeURIComponent(route.request().url().split("?")[1] ?? "sm0");
    const cacheId = `${id}[720p].hls`;
    void route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        [id]: {
          preferred: cacheId,
          completes: [cacheId],
          caches: { [cacheId]: { complete: true, caching: false } },
        },
      }),
    });
  });
  await page.route(
    "https://www.nicovideo.jp/cache/filter-matome/v1/remove",
    (route) => {
      const request = route.request();
      const body = request.postDataJSON() as { videoId?: string };
      const videoId = body.videoId ?? "sm0";
      void route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          requestId: `request-${videoId}`,
          videoId,
          status: "completed",
          target: "hls",
          preservesNonHls: true,
          results: [{ cacheId: `${videoId}[720p].hls`, outcome: "deleted" }],
        }),
      });
    },
  );
});

test("注入した本番UIがダークテーマと固定行高で初期化される", async ({
  page,
}) => {
  await openApp(page);

  await expect(page.locator(".header-title")).toHaveText("Cache Data Manager");
  await expect(page.locator(".header-version")).toHaveText(
    "NicoCache_nl version 2026-07-02",
  );
  await expect(
    page.locator('.nav-link:has-text("watch-history")'),
  ).toHaveAttribute(
    "href",
    "https://www.nicovideo.jp/local/features/dist/pages/watch-history/index.html",
  );
  await expect(page.locator(".result-count")).toHaveText("52 件");
  await expect(page.locator(".video-card").first()).toHaveCSS(
    "height",
    "300px",
  );
  await expect(page.locator("body")).toHaveCSS(
    "background-color",
    "rgb(17, 21, 27)",
  );
});

test("状態・画質フィルター、ソート方向、リセットが一覧へ反映される", async ({
  page,
}) => {
  await openApp(page);

  await page.locator("#statusFilter").selectOption("temporary");
  await expect(page.locator(".result-count")).toHaveText("10 / 52 件");
  await expect(page.locator(".video-card .temp-file").first()).toHaveText(
    "一時",
  );

  await page.locator("#qualityFilter").selectOption("hd");
  await expect(page.locator(".result-count")).toHaveText("3 / 52 件");

  await page.locator("#resetFiltersBtn").click();
  await expect(page.locator(".result-count")).toHaveText("52 件");
  await expect(page.locator("#statusFilter")).toHaveValue("all");

  const firstId = await page.locator(".video-id").first().textContent();
  await page.locator("#sortDirectionBtn").click();
  await expect(page.locator("#sortDirectionBtn")).toHaveAttribute(
    "aria-label",
    "降順",
  );
  await expect(page.locator(".video-id").first()).not.toHaveText(firstId ?? "");
});

test("検索結果モーダル、ページ送り、カード操作、詳細モーダルが動作する", async ({
  page,
}) => {
  await openApp(page);

  await page.locator("#searchInput").fill("共通検索");
  await page.locator("#searchBtn").click();
  const searchModal = page.locator(".search-results-modal");
  await expect(searchModal).toBeVisible();
  await expect(searchModal.locator(".search-count")).toHaveText("51 件の結果");
  await expect(searchModal.locator(".search-result-card")).toHaveCount(50);
  await searchModal.locator(".pagination-next").click();
  await expect(searchModal.locator(".pagination-info")).toHaveText(
    "2 / 2 ページ",
  );
  await expect(searchModal.locator(".search-result-card")).toHaveCount(1);
  await searchModal.locator(".search-results-modal-close").click();
  await expect(searchModal).toBeHidden();

  await page.locator(".video-card .play-btn").first().click();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as unknown as { __cacheDataManagerOpenCalls: string[] })
            .__cacheDataManagerOpenCalls,
      ),
    )
    .toContain("/watch/sm1001");

  await page.locator(".video-card").first().click();
  await expect(page.locator(".detail-modal")).toBeVisible();
  await expect(page.locator(".detail-modal h2")).toContainText("詳細 sm1001");
  await page.locator(".detail-modal .close-btn").click();
  await expect(page.locator(".detail-modal")).toBeHidden();
});

test("個別削除と一括操作が確認後に更新される", async ({ page }) => {
  await openApp(page, createSeed(8));

  const dialogMessages: string[] = [];
  page.on("dialog", async (dialog) => {
    dialogMessages.push(dialog.message());
    if (dialog.message().includes("公開状態を一括確認しますか？")) {
      await dialog.dismiss();
      return;
    }
    await dialog.accept();
  });
  await page.locator(".video-card .card-more").first().click();
  await page.locator(".video-card .delete-btn").first().click();
  await expect
    .poll(() => dialogMessages)
    .toEqual(
      expect.arrayContaining([
        expect.stringContaining("本当に削除しますか？"),
        expect.stringContaining("HLSキャッシュを削除しました"),
      ]),
    );
  await expect(page.locator(".result-count")).toHaveText("8 件");

  await page.locator(".bulk-actions").click();
  await page.locator("#deleteTemporaryBtn").click();
  await expect
    .poll(() => dialogMessages)
    .toEqual(
      expect.arrayContaining([
        expect.stringContaining("テンポラリ動画を一括削除しますか？"),
        expect.stringContaining("テンポラリ動画を 1 件削除しました"),
      ]),
    );
  await expect(page.locator(".result-count")).toHaveText("7 件");

  await page.locator("#checkAvailabilityBtn").click();
  await expect
    .poll(() => dialogMessages)
    .toEqual(
      expect.arrayContaining([
        expect.stringContaining("公開状態を一括確認しますか？"),
      ]),
    );
  await expect(page.locator(".global-progress")).toBeHidden();
});

test("HLSがないMP4テンポラリ項目は一括削除後も一覧に残る", async ({ page }) => {
  const removalUrl = "https://www.nicovideo.jp/cache/filter-matome/v1/remove";
  await page.unroute(removalUrl);
  await page.route(removalUrl, (route) => {
    const body = route.request().postDataJSON() as { videoId?: string };
    const videoId = body.videoId ?? "sm0";
    void route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        requestId: `request-${videoId}`,
        videoId,
        status: "not_found",
        target: "hls",
        preservesNonHls: true,
        results: [],
      }),
    });
  });

  const seed = createSeed(5);
  seed.tempList = { "sm1005.mp4": ["ユーザー用意MP4"] };
  await openApp(page, seed);

  await page.locator(".bulk-actions").click();
  page.once("dialog", async (dialog) => {
    expect(dialog.message()).toContain("テンポラリ動画を一括削除しますか？");
    await dialog.accept();
  });
  await page.locator("#deleteTemporaryBtn").click();
  page.once("dialog", async (dialog) => {
    expect(dialog.message()).toContain("対象HLSなし: 1 件");
    await dialog.accept();
  });

  await expect(page.locator(".result-count")).toHaveText("5 件");
});
