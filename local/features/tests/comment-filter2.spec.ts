import { expect, test, type Page, type Route } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const projectRoot = join(import.meta.dirname, "..");
const fixtureEntry = join(
  import.meta.dirname,
  "fixtures",
  "comment-filter2-entry.ts",
);
const pageUrl = "https://www.nicovideo.jp/watch/sm100";
let appBundle = "";

function buildBundle(): string {
  const directory = mkdtempSync(join(tmpdir(), "comment-filter2-test-"));
  const output = join(directory, "comment-filter2.js");
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

async function fulfillDocument(route: Route): Promise<void> {
  await route.fulfill({
    contentType: "text/html; charset=utf-8",
    body: '<!doctype html><html lang="ja"><head><meta charset="utf-8"><title>comment-filter2 test</title></head><body><main id="watch"></main></body></html>',
  });
}

async function openApp(page: Page): Promise<void> {
  await page.route(pageUrl, fulfillDocument);
  await page.goto(pageUrl);
  await page.addScriptTag({ content: appBundle });
  await page.evaluate(async () => {
    await (
      window as unknown as {
        CommentFilter2Test: { seedAndStart: () => Promise<void> };
      }
    ).CommentFilter2Test.seedAndStart();
  });
  await expect(page.locator("#cf2-shadow-host .cf2-container")).toBeVisible();
}

test.beforeAll(() => {
  appBundle = buildBundle();
});

test.beforeEach(async ({ page }) => {
  await openApp(page);
});

test("モーダル本文が残り高さいっぱいを使い、低い画面では内部スクロールする", async ({
  page,
}) => {
  await page.setViewportSize({ width: 760, height: 420 });
  const ui = page.locator("#cf2-shadow-host");
  const container = ui.locator(".cf2-container");
  const header = ui.locator(".cf2-header");
  const content = ui.locator(".cf2-content");
  const workspace = ui.locator(".cf2-workspace");
  const main = ui.locator(".cf2-workspace-main");

  const [containerHeight, headerHeight, contentHeight, workspaceHeight] =
    await Promise.all([
      container.evaluate((element) => element.getBoundingClientRect().height),
      header.evaluate((element) => element.getBoundingClientRect().height),
      content.evaluate((element) => element.getBoundingClientRect().height),
      workspace.evaluate((element) => element.getBoundingClientRect().height),
    ]);

  expect(
    Math.abs(contentHeight - (containerHeight - headerHeight)),
  ).toBeLessThan(1);
  expect(Math.abs(workspaceHeight - contentHeight)).toBeLessThan(1);
  await expect(main).toHaveCSS("overflow-y", "auto");

  await ui.locator('.cf2-sidebar-item[data-cf2-view="rules"]').click();
  const scrollMetrics = await main.evaluate((element) => ({
    clientHeight: element.clientHeight,
    scrollHeight: element.scrollHeight,
  }));
  expect(scrollMetrics.scrollHeight).toBeGreaterThan(
    scrollMetrics.clientHeight,
  );
  await main.evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });
  expect(await main.evaluate((element) => element.scrollTop)).toBeGreaterThan(
    0,
  );
});

test("Shadow DOM 内のアイコンを白抜き表示する", async ({ page }) => {
  const icons = page.locator("#cf2-shadow-host .material-icon");
  await expect(icons.first()).toHaveCSS(
    "filter",
    "brightness(0) saturate(1) invert(1)",
  );
});

test("ルールスタジオを多重カードにせず区切り線で構成する", async ({ page }) => {
  const ui = page.locator("#cf2-shadow-host");
  await ui.locator('.cf2-sidebar-item[data-cf2-view="rules"]').click();

  await expect(ui.locator(".cf2-container")).toHaveCSS(
    "background-color",
    "rgb(26, 32, 41)",
  );
  await expect(ui.locator(".cf2-dashboard-metric").first()).toHaveCSS(
    "background-color",
    "rgb(36, 44, 55)",
  );

  await expect(ui.locator(".cf2-rule-editor")).toHaveCSS(
    "border-top-width",
    "0px",
  );
  await expect(ui.locator(".cf2-builder-block").first()).toHaveCSS(
    "border-left-width",
    "0px",
  );
  await expect(ui.locator("#cf2-library-section .cf2-rules-list")).toHaveCSS(
    "display",
    "block",
  );
  await expect(
    ui.locator("#cf2-library-section .cf2-rule-item").first(),
  ).toHaveCSS("border-radius", "0px");
});

test("概要ダッシュボードが保存済みルールを集計し、画面を切り替える", async ({
  page,
}) => {
  const ui = page.locator("#cf2-shadow-host");
  await expect(ui.locator("#cf2-cockpit-rule-count")).toHaveText("2");
  await expect(ui.locator("#cf2-cockpit-hide-count")).toHaveText("1");
  await expect(ui.locator("#cf2-cockpit-replace-count")).toHaveText("1");
  await expect(ui.locator(".cf2-dashboard-rule")).toHaveCount(2);

  await ui.locator('.cf2-sidebar-item[data-cf2-view="rules"]').click();
  await expect(ui.locator('[data-cf2-panel="overview"]')).toBeHidden();
  await expect(ui.locator('[data-cf2-panel="rules"]')).toBeVisible();
  await expect(ui.locator("#cf2-view-rule-count")).toHaveText("2");
  await expect(
    ui.locator('.cf2-sidebar-item[data-cf2-view="rules"]'),
  ).toHaveClass(/active/);

  await ui.locator('.cf2-sidebar-item[data-cf2-view="commands"]').click();
  await expect(ui.locator('[data-cf2-panel="commands"]')).toBeVisible();
  await expect(ui.locator("#cf2-main-commands")).toHaveValue("medium,blue");

  await ui.locator('.cf2-sidebar-item[data-cf2-view="data"]').click();
  await expect(ui.locator('[data-cf2-panel="data"]')).toBeVisible();
  await expect(ui.locator("#cf2-export-json-btn")).toBeVisible();

  await ui.locator('.cf2-sidebar-item[data-cf2-view="settings"]').click();
  await expect(ui.locator('[data-cf2-panel="settings"]').first()).toBeVisible();
  await expect(ui.locator("#cf2-reload-btn")).toHaveCount(0);
});

test("概要の今すぐ適用がコメントを再処理して表示側へ同期する", async ({
  page,
}) => {
  const ui = page.locator("#cf2-shadow-host");
  const applied = page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        window.addEventListener("cf2:test-filter-applied", () => resolve(), {
          once: true,
        });
      }),
  );

  await ui.locator("#cf2-cockpit-apply").click();
  await applied;

  const filteredBodies = await page.evaluate(() =>
    window.CommentFilter2Data?.filteredData?.data.threads[0]?.comments.map(
      (comment) => comment.body,
    ),
  );
  expect(filteredBodies).toEqual(["", "通常コメント"]);
});

test("公式プレイヤーでは今すぐ適用時にページ再読み込みを確認する", async ({
  page,
}) => {
  await page.evaluate(() => {
    delete window.videoPlayer;
  });
  const dialog = page.waitForEvent("dialog");
  const click = page.locator("#cf2-shadow-host #cf2-cockpit-apply").click();
  const confirmation = await dialog;

  expect(confirmation.message()).toContain("ページを再読み込みして設定を適用");
  await confirmation.dismiss();
  await click;
  expect(
    await page.evaluate(() => window.CommentFilter2Data?.filteredData),
  ).toBeNull();
});

test("正規表現の一致、未一致、入力エラーをリアルタイム表示する", async ({
  page,
}) => {
  const ui = page.locator("#cf2-shadow-host");
  await ui.locator('.cf2-sidebar-item[data-cf2-view="rules"]').click();
  await ui.locator("#cf2-pattern-input").fill("荒らし|スパム");
  await ui.locator(".cf2-regex-preview-header").click();
  await ui
    .locator("#cf2-regex-test-input")
    .fill("通常コメント、荒らし、そしてスパムです");
  await expect(ui.locator("#cf2-regex-preview-count")).toHaveText("2件一致");
  await expect(ui.locator("#cf2-regex-preview-result mark")).toHaveCount(2);

  await ui.locator("#cf2-regex-test-input").fill("平和なコメントです");
  await expect(ui.locator("#cf2-regex-preview-count")).toHaveText("一致なし");

  await ui.locator("#cf2-pattern-input").fill("[");
  await expect(ui.locator("#cf2-regex-preview-count")).toHaveText("入力エラー");
  await expect(ui.locator("#cf2-regex-preview-result")).toHaveClass(
    /cf2-preview-error/,
  );

  await ui.locator("#cf2-format-json").click();
  await expect(ui.locator("#cf2-json-section")).toBeVisible();
  await expect(ui.locator(".cf2-code-language")).toHaveText("rules.jsonl");
  await expect(ui.locator("#cf2-json-textarea")).toHaveValue(
    /"pattern":"荒らし\|スパム"/,
  );
  await ui.locator("#cf2-format-form").click();
  await expect(ui.locator("#cf2-form-section")).toBeVisible();

  await ui.locator("#cf2-format-library").click();
  await expect(ui.locator("#cf2-library-section")).toBeVisible();
  await expect(ui.locator(".cf2-rule-item")).toHaveCount(2);
});

test("フォームからルールを追加・削除し、概要集計へ反映する", async ({
  page,
}) => {
  const ui = page.locator("#cf2-shadow-host");
  await ui.locator('.cf2-sidebar-item[data-cf2-view="rules"]').click();
  await ui.locator("#cf2-pattern-input").fill("連投コメント");
  await ui.locator("#cf2-add-rule").click();
  await expect(ui.locator("#cf2-rule-count-text")).toHaveText("3件");
  await expect(ui.locator(".cf2-rule-item")).toHaveCount(3);

  await ui.locator("#cf2-format-library").click();
  await ui.locator('.cf2-rule-delete[data-index="2"]').click();
  await expect(ui.locator("#cf2-rule-count-text")).toHaveText("2件");

  await ui.locator('.cf2-sidebar-item[data-cf2-view="overview"]').click();
  await expect(ui.locator("#cf2-cockpit-rule-count")).toHaveText("2");
});

test("動的なルール種別とアクション切替を初期状態まで確実に戻す", async ({
  page,
}) => {
  const ui = page.locator("#cf2-shadow-host");
  await ui.locator('.cf2-sidebar-item[data-cf2-view="rules"]').click();

  await ui.locator('input[name="cf2-rule-type"][value="userId"]').check();
  await expect(ui.locator("#cf2-regex-inputs")).toBeHidden();
  await expect(ui.locator("#cf2-userid-inputs")).toBeVisible();
  await expect(ui.locator("#cf2-replace-action-label")).toBeHidden();
  await expect(
    ui.locator('input[name="cf2-action-type"][value="hide"]'),
  ).toBeChecked();

  await ui.locator('input[name="cf2-rule-type"][value="regex"]').check();
  await ui.locator('input[name="cf2-action-type"][value="replace"]').check();
  await expect(ui.locator("#cf2-replace-input-group")).toBeVisible();
  await ui.locator("#cf2-pattern-input").fill("dynamic.*comment");
  await ui.locator("#cf2-replace-input").fill("変更済み");

  await ui.locator("#cf2-clear-form").click();
  await expect(ui.locator("#cf2-pattern-input")).toHaveValue("");
  await expect(ui.locator("#cf2-replace-input")).toHaveValue("");
  await expect(ui.locator("#cf2-replace-input-group")).toBeHidden();
  await expect(
    ui.locator('input[name="cf2-rule-type"][value="regex"]'),
  ).toBeChecked();
  await expect(
    ui.locator('input[name="cf2-action-type"][value="hide"]'),
  ).toBeChecked();
});

test("追加・適用・削除のたびに変化したコメントをモックcanvasへ追加する", async ({
  page,
}) => {
  const ui = page.locator("#cf2-shadow-host");
  await ui.locator('.cf2-sidebar-item[data-cf2-view="rules"]').click();
  await ui.locator("#cf2-pattern-input").fill("通常.*コメント");
  await ui.locator('input[name="cf2-action-type"][value="replace"]').check();
  await ui.locator("#cf2-replace-input").fill("canvasへ反映済み");
  await ui.locator("#cf2-add-rule").click();
  await expect(ui.locator("#cf2-rule-count-text")).toHaveText("3件");

  const firstApplied = page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        window.addEventListener("cf2:test-filter-applied", () => resolve(), {
          once: true,
        });
      }),
  );
  await ui.locator('.cf2-sidebar-item[data-cf2-view="overview"]').click();
  await ui.locator("#cf2-cockpit-apply").click();
  await firstApplied;
  await expect(page.locator("#cf2-test-comment-canvas")).toBeAttached();
  expect(
    await page.evaluate(() => window.CommentFilter2Test.mockCanvasBodies),
  ).toEqual(["canvasへ反映済み"]);

  await ui.locator('.cf2-sidebar-item[data-cf2-view="rules"]').click();
  await ui.locator("#cf2-format-library").click();
  await ui.locator('.cf2-rule-delete[data-index="2"]').click();
  await expect(ui.locator("#cf2-rule-count-text")).toHaveText("2件");

  const secondApplied = page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        window.addEventListener("cf2:test-filter-applied", () => resolve(), {
          once: true,
        });
      }),
  );
  await ui.locator('.cf2-sidebar-item[data-cf2-view="overview"]').click();
  await ui.locator("#cf2-cockpit-apply").click();
  await secondApplied;
  expect(
    await page.evaluate(() => window.CommentFilter2Test.mockCanvasBodies),
  ).toEqual(["通常コメント"]);
});
