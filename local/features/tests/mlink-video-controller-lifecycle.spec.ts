import { expect, test, type Route } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const projectRoot = join(import.meta.dirname, "..");
const fixturesRoot = join(import.meta.dirname, "fixtures");

function readFixture(path: string): string {
  return readFileSync(join(fixturesRoot, path), "utf8");
}

function buildTestDocument(body: string): string {
  return `<!doctype html><html lang="ja"><head><meta charset="utf-8"><title>module lifecycle fixture</title></head><body>${body}</body></html>`;
}

async function fulfillTestDocument(route: Route, body: string): Promise<void> {
  await route.fulfill({
    contentType: "text/html; charset=utf-8",
    body: buildTestDocument(body),
  });
}

function buildControllerBundle(): string {
  const directory = mkdtempSync(
    join(tmpdir(), "filter-matome-lifecycle-test-"),
  );
  const output = join(directory, "controller.js");
  try {
    execFileSync("bun", ["scripts/build-playwright-fixture.ts", output], {
      cwd: projectRoot,
      stdio: "pipe",
    });
    return readFileSync(output, "utf8");
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}
test("background image settings persist dynamic CRUD, selection, and import events", async ({
  page,
}) => {
  await page.route(
    "https://www.nicovideo.jp/background-settings-test",
    (route) => fulfillTestDocument(route, "<main></main>"),
  );
  await page.goto("https://www.nicovideo.jp/background-settings-test");
  await page.addScriptTag({ content: await buildControllerBundle() });

  const result = await page.evaluate(async () => {
    window.logger = {
      warn: () => {},
      error: () => {},
      info: () => {},
      debug: () => {},
    };
    const { BackgroundImageSettings } = (
      window as unknown as {
        MlinkTabControllers: {
          BackgroundImageSettings: {
            getInstance(): {
              addEventListener(type: string, listener: EventListener): void;
              importSettings(json: string): Promise<void>;
              addImage(
                name: string,
                type: "url",
                data: string,
              ): Promise<string>;
              updateImage(
                id: string,
                name: string,
                type: "url",
                data: string,
              ): Promise<void>;
              setSelectedImage(id: string): Promise<void>;
              getSelectedImage(): Promise<{ id: string; name: string } | null>;
              getAllImages(): Promise<Array<{ id: string; name: string }>>;
              exportSettings(): Promise<string>;
              deleteImage(id: string): Promise<void>;
              closeDB(): void;
            };
          };
        };
      }
    ).MlinkTabControllers;
    const settings = BackgroundImageSettings.getInstance();
    const events: string[] = [];
    for (const name of ["imageAdded", "imageDeleted", "settingsImported"]) {
      settings.addEventListener(name, (() =>
        events.push(name)) as EventListener);
    }

    await settings.importSettings(
      JSON.stringify({ images: [], selectedImageId: null }),
    );
    const id = await settings.addImage(
      "追加前",
      "url",
      "https://example.com/a.jpg",
    );
    await settings.updateImage(
      id,
      "更新後",
      "url",
      "https://example.com/b.jpg",
    );
    await settings.setSelectedImage(id);
    const selected = await settings.getSelectedImage();
    const exported = JSON.parse(await settings.exportSettings()) as {
      images: Array<{ id: string; name: string }>;
      selectedImageId: string | null;
    };
    await settings.deleteImage(id);
    await settings.importSettings(JSON.stringify(exported));
    const restored = await settings.getAllImages();
    settings.closeDB();
    return { id, selected, exported, restored, events };
  });

  expect(result.selected).toMatchObject({ id: result.id, name: "更新後" });
  expect(result.exported.selectedImageId).toBe(result.id);
  expect(result.exported.images).toHaveLength(1);
  expect(result.restored).toEqual([{ ...result.exported.images[0] }]);
  expect(result.events).toEqual([
    "settingsImported",
    "imageAdded",
    "imageDeleted",
    "settingsImported",
  ]);
});

test("Harajuku module creates interactive chrome and removes it on destroy", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.route("https://www.nicovideo.jp/watch/sm9", (route) =>
    fulfillTestDocument(
      route,
      `<style>
        #ncnl_common_header_menu .ncnl-common-header-trigger { background: transparent; color: #fff; }
        #ncnl_common_header_menu .ncnl-common-header-popover { visibility: hidden; background: #f4f4f4; }
        #ncnl_common_header_menu:hover .ncnl-common-header-popover { visibility: visible; }
        #ncnl_common_header_menu .ncnl-common-header-actions,
        #ncnl_common_header_menu .ncnl-common-header-item { background: #fff; color: #333; }
        #ncnl_common_header_menu .ncnl-common-header-footer { background: #f4f4f4; }
        #ncnl_common_header_menu .ncnl-common-header-footer a { color: #333; }
      </style>
      <div id="CommonHeader">
        <div id="ncnl_common_header_menu">
          <button type="button" class="ncnl-common-header-trigger">NicoCache</button>
          <div class="ncnl-common-header-popover">
            <div class="ncnl-common-header-actions">
              <a class="ncnl-common-header-item" href="https://nicocachenl.test/api/v1/videos/sm9/exports/video">動画保存</a>
              <button type="button" class="ncnl-common-header-item">キャッシュ削除</button>
            </div>
            <div class="ncnl-common-header-footer"><a href="https://nicocachenl.test/cache">キャッシュへ</a></div>
          </div>
        </div>
      </div>
      <main>
        <section class="grid-template-areas">
          <div class="grid-area_bottom">
            <div><div><h1>テスト動画</h1></div></div>
            <div id="watch-tags">テストタグ</div>
            <section id="watch-details">
              <header><button type="button" aria-label="動画の詳細情報を開閉する">詳細</button></header>
              <div class="official-details" aria-hidden="true"><dl></dl></div>
            </section>
          </div>
          <div class="grid-area_sidebar"><div><div id="watch-sidebar"><section><header>コメントリスト</header></section></div></div></div>
        </section>
      </main>`,
    ),
  );
  await page.goto("https://www.nicovideo.jp/watch/sm9");
  await page.addScriptTag({ content: await buildControllerBundle() });

  await page.evaluate(async () => {
    window.localStorage.clear();
    window.logger = {
      warn: () => {},
      error: () => {},
      info: () => {},
      debug: () => {},
    };
    window.commonHelper = {
      getVideoIdWithFallback: async () => "sm9",
      fetchWatchPage: async () =>
        ({
          apiData: {
            video: {
              description:
                '<p>短い説明 <a href="https://example.com/details">詳細リンク</a> <a href="javascript:window.__unsafe = true">危険リンク</a></p><script>window.__unsafe = true</script>',
            },
          },
        }) as Awaited<ReturnType<typeof window.commonHelper.fetchWatchPage>>,
      extractVideoIdFromUrl: () => "sm9",
    } as typeof window.commonHelper;
    const api = window as unknown as {
      MlinkTabControllers: {
        WatchHarajukuModule: new (config: unknown) => {
          initialize(): Promise<void>;
          destroy(): void;
        };
        watchHarajukuModuleConfig: unknown;
      };
      harajukuModule?: { destroy(): void };
    };
    const module = new api.MlinkTabControllers.WatchHarajukuModule(
      api.MlinkTabControllers.watchHarajukuModuleConfig,
    );
    api.harajukuModule = module;
    await module.initialize();
  });

  await expect(page.locator(".HarajukuWatchChrome")).toHaveCount(1);
  const nicoCacheTrigger = page.locator(".ncnl-common-header-trigger");
  await expect(nicoCacheTrigger).toHaveCSS("background-image", "none");
  await nicoCacheTrigger.hover();
  await expect(page.locator(".ncnl-common-header-popover")).toBeVisible();
  await expect(page.locator(".ncnl-common-header-popover")).toHaveCSS(
    "background-color",
    "rgb(255, 255, 255)",
  );
  for (const item of await page.locator(".ncnl-common-header-item").all()) {
    await expect(item).toHaveCSS("background-color", "rgb(255, 255, 255)");
    await expect(item).toHaveCSS("background-image", "none");
    await expect(item).toHaveCSS("color", "rgb(17, 17, 17)");
  }
  await expect(page.locator(".ncnl-common-header-footer a")).toHaveCSS(
    "color",
    "rgb(17, 17, 17)",
  );
  const description = page.locator(".HarajukuDescription");
  await expect(description).toHaveAttribute("data-hy-state", "ready");
  await expect(description).toContainText("短い説明");
  await expect(description.locator("script")).toHaveCount(0);
  const safeDescriptionLink = description.getByRole("link", {
    name: "詳細リンク",
  });
  await expect(safeDescriptionLink).toHaveAttribute("target", "_blank");
  await expect(safeDescriptionLink).toHaveAttribute(
    "rel",
    "noopener noreferrer",
  );
  await expect(description.getByText("危険リンク")).not.toHaveAttribute("href");
  expect(
    await page.evaluate(
      () => (window as unknown as { __unsafe?: boolean }).__unsafe,
    ),
  ).toBeUndefined();
  await expect(page.locator("#watch-details > header")).toHaveCSS(
    "display",
    "none",
  );
  await expect(page.locator(".official-details")).toHaveCSS("display", "none");

  const descriptionMetrics = await description.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      height: element.clientHeight,
      maxHeight: Number.parseFloat(style.maxHeight),
      scrollHeight: element.scrollHeight,
    };
  });
  expect(descriptionMetrics.height).toBeLessThan(descriptionMetrics.maxHeight);
  expect(descriptionMetrics.scrollHeight).toBeLessThanOrEqual(
    descriptionMetrics.height,
  );
  await expect(page.locator("#mlink-watch-harajuku-style")).toHaveCount(1);
  await page.locator(".HarajukuThemeButton").evaluate((button) => {
    (button as HTMLButtonElement).click();
  });
  await expect(page.locator("html")).toHaveAttribute("data-hy-theme", "dark");
  await page.locator(".HarajukuBackgroundPriorityButton").evaluate((button) => {
    (button as HTMLButtonElement).click();
  });
  await expect(page.locator("html")).toHaveAttribute(
    "data-hy-background-priority",
    "background-image",
  );

  await page.evaluate(async () => {
    window.commonHelper.fetchWatchPage = async () =>
      ({ apiData: { video: { description: "" } } }) as Awaited<
        ReturnType<typeof window.commonHelper.fetchWatchPage>
      >;
    await (
      window as unknown as {
        harajukuModule?: { onSPANavigate(): Promise<void> };
      }
    ).harajukuModule?.onSPANavigate();
  });
  await expect(description).toHaveAttribute("data-hy-state", "empty");
  await expect(description).toHaveText("説明文はありません");
  expect(
    await description.evaluate((element) => element.clientHeight),
  ).toBeLessThanOrEqual(28);

  await page.evaluate(async () => {
    const longDescription = Array.from(
      { length: 80 },
      (_, index) => `<p>長い説明 ${index + 1}</p>`,
    ).join("");
    window.commonHelper.fetchWatchPage = async () =>
      ({ apiData: { video: { description: longDescription } } }) as Awaited<
        ReturnType<typeof window.commonHelper.fetchWatchPage>
      >;
    await (
      window as unknown as {
        harajukuModule?: { onSPANavigate(): Promise<void> };
      }
    ).harajukuModule?.onSPANavigate();
  });
  await expect(description).toHaveAttribute("data-hy-state", "ready");
  const longDescriptionMetrics = await description.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      height: element.clientHeight,
      maxHeight: Number.parseFloat(style.maxHeight),
      overflowY: style.overflowY,
      scrollHeight: element.scrollHeight,
    };
  });
  expect(longDescriptionMetrics.overflowY).toBe("auto");
  expect(longDescriptionMetrics.height).toBeLessThanOrEqual(
    Math.ceil(longDescriptionMetrics.maxHeight),
  );
  expect(longDescriptionMetrics.scrollHeight).toBeGreaterThan(
    longDescriptionMetrics.height,
  );

  for (const viewport of [
    { width: 1024, height: 600 },
    { width: 1920, height: 1080 },
  ]) {
    await page.setViewportSize(viewport);
    const responsiveMetrics = await description.evaluate((element) => ({
      clientWidth: element.clientWidth,
      maxHeight: Number.parseFloat(getComputedStyle(element).maxHeight),
      scrollHeight: element.scrollHeight,
      height: element.clientHeight,
    }));
    expect(responsiveMetrics.clientWidth).toBeLessThanOrEqual(viewport.width);
    expect(responsiveMetrics.height).toBeLessThanOrEqual(
      Math.ceil(responsiveMetrics.maxHeight),
    );
    expect(responsiveMetrics.scrollHeight).toBeGreaterThan(
      responsiveMetrics.height,
    );
  }

  await page.evaluate(() => {
    (
      window as unknown as { harajukuModule?: { destroy(): void } }
    ).harajukuModule?.destroy();
  });
  await expect(page.locator(".HarajukuWatchChrome")).toHaveCount(0);
  await expect(page.locator(".HarajukuDescription")).toHaveCount(0);
  await expect(page.locator("#mlink-watch-harajuku-style")).toHaveCount(0);
});

test("header privacy hides premium override avatar and name by account structure", async ({
  page,
}) => {
  await page.route(
    "https://www.nicovideo.jp/header-privacy-premium-test",
    (route) =>
      fulfillTestDocument(
        route,
        readFixture("nicovideo-common-header-premium-override.html"),
      ),
  );
  await page.goto("https://www.nicovideo.jp/header-privacy-premium-test");
  await page.addScriptTag({ content: buildControllerBundle() });

  await page.evaluate(async () => {
    window.logger = {
      warn: () => {},
      error: () => {},
      info: () => {},
      debug: () => {},
    };
    localStorage.removeItem("headerPrivacySettings");
    const exports = (
      window as unknown as {
        MlinkTabControllers: {
          HeaderModule: new (config: unknown) => {
            initialize(): Promise<void>;
          };
          headerModuleConfig: unknown;
        };
      }
    ).MlinkTabControllers;
    await new exports.HeaderModule(exports.headerModuleConfig).initialize();
  });

  await expect(page.locator(".common-header-1s8ioyy")).toHaveCSS(
    "display",
    "none",
  );
  await expect(page.locator(".common-header-q3ohau")).toHaveCSS(
    "display",
    "none",
  );
  await expect(page.locator(".common-header-ws8uen")).toHaveCSS(
    "background-image",
    /linear-gradient/,
  );
});

test("module settings import/export normalization drops legacy and unknown module ids", async ({
  page,
}) => {
  await page.setContent(buildTestDocument("<main></main>"));
  await page.addScriptTag({ content: await buildControllerBundle() });

  const normalized = await page.evaluate(() => {
    const { normalizeModuleSettingsForRegistry } = (
      window as unknown as {
        MlinkTabControllers: {
          normalizeModuleSettingsForRegistry: (
            settings: unknown,
            validModuleIds: string[],
          ) => Record<string, unknown>;
        };
      }
    ).MlinkTabControllers;

    return normalizeModuleSettingsForRegistry(
      {
        nico_info_highlight: { enabled: true, config: { migrated: true } },
        daily_lottery_highlight: { enabled: false },
        removed_legacy_module: { enabled: true },
        heatmap: { enabled: true, config: { displayMode: "overlay" } },
        malformed_module: { enabled: "yes" },
      },
      ["daily_lottery_highlight", "heatmap"],
    );
  });

  expect(normalized).toEqual({
    daily_lottery_highlight: {
      enabled: true,
      config: { migrated: true },
    },
    heatmap: {
      enabled: true,
      config: { displayMode: "overlay" },
    },
  });
});
