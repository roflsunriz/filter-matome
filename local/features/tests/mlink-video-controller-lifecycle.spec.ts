import { expect, test, type Route } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const projectRoot = join(import.meta.dirname, "..");

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
  await page.route("https://www.nicovideo.jp/watch/sm9", (route) =>
    fulfillTestDocument(
      route,
      `<main><aside id="watch-sidebar"><section><header>コメントリスト</header></section></aside></main>`,
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
      fetchWatchPage: async () => null,
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

  await page.evaluate(() => {
    (
      window as unknown as { harajukuModule?: { destroy(): void } }
    ).harajukuModule?.destroy();
  });
  await expect(page.locator(".HarajukuWatchChrome")).toHaveCount(0);
  await expect(page.locator("#mlink-watch-harajuku-style")).toHaveCount(0);
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
