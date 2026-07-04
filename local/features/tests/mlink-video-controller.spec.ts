import { expect, test } from "@playwright/test";
import * as esbuild from "esbuild";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const projectRoot = join(import.meta.dirname, "..");
const controllerRoot = join(projectRoot, "src", "mlink-video-controller");

function readControllerFile(path: string): string {
  return readFileSync(join(controllerRoot, path), "utf8");
}

function extractTemplateBody(source: string, exportName: string): string {
  const match = source.match(
    new RegExp(`export const ${exportName} = \`([\\s\\S]*)\`;`),
  );

  if (!match?.[1]) {
    throw new Error(`${exportName} template was not found`);
  }

  return match[1]
    .replaceAll(/\$\{createMaterialIcon\([^}]+\)\}/g, "")
    .replaceAll(/\$\{[^}]+\}/g, "");
}

async function buildControllerBundle(): Promise<string> {
  const result = await esbuild.build({
    bundle: true,
    write: false,
    format: "iife",
    globalName: "MlinkTabControllers",
    platform: "browser",
    target: "es2020",
    loader: {
      ".svg": "text",
    },
    alias: {
      "@": join(projectRoot, "src"),
    },
    stdin: {
      resolveDir: projectRoot,
      loader: "ts",
      contents: `
        export { PanelNavigationController } from "./src/mlink-video-controller/tab-controllers/navigation";
        export { PlaybackTabController } from "./src/mlink-video-controller/tab-controllers/playback-tab";
        export { SpeedTabController } from "./src/mlink-video-controller/tab-controllers/speed-tab";
        export { VolumeTabController } from "./src/mlink-video-controller/tab-controllers/volume-tab";
        export { LinksTabController } from "./src/mlink-video-controller/tab-controllers/links-tab";
        export { CommentsTabController } from "./src/mlink-video-controller/tab-controllers/comments-tab";
        export { normalizeModuleSettingsForRegistry } from "./src/mlink-video-controller/module-handlers/settings-normalizer";
      `,
    },
  });

  return result.outputFiles[0].text;
}

function buildPanelHtml(): string {
  const panelSource = readControllerFile("templates/panel.ts");
  const panelMatch = panelSource.match(/return `([\s\S]*)`;/);

  if (!panelMatch?.[1]) {
    throw new Error("panel template was not found");
  }

  let html = panelMatch[1]
    .replaceAll(/\$\{createMaterialIcon\([^}]+\)\}/g, "")
    .replace(
      "<!-- playback.htmlの内容がここに挿入されます -->",
      extractTemplateBody(
        readControllerFile("templates/playback.ts"),
        "playbackTemplate",
      ),
    )
    .replace(
      "<!-- volume.htmlの内容がここに挿入されます -->",
      extractTemplateBody(
        readControllerFile("templates/volume.ts"),
        "volumeTemplate",
      ),
    )
    .replace(
      "<!-- speed.htmlの内容がここに挿入されます -->",
      extractTemplateBody(
        readControllerFile("templates/speed.ts"),
        "speedTemplate",
      ),
    )
    .replace(
      "<!-- comments.htmlの内容がここに挿入されます -->",
      extractTemplateBody(
        readControllerFile("templates/comments.ts"),
        "commentsTemplate",
      ),
    )
    .replace(
      "<!-- links.htmlの内容がここに挿入されます -->",
      extractTemplateBody(
        readControllerFile("templates/links.ts"),
        "linksTemplate",
      ),
    )
    .replace(
      "<!-- settings.htmlの内容がここに挿入されます -->",
      extractTemplateBody(
        readControllerFile("templates/settings.ts"),
        "settingsTemplate",
      ),
    );

  return html;
}

test("mlink-video-controller panel exposes expected tabs and controls", async ({
  page,
}) => {
  const html = buildPanelHtml();

  await page.setContent(html);

  await expect(page.locator("[data-tab]")).toHaveCount(6);
  await expect(page.locator("#playback .tracker-range")).toHaveCount(1);
  await expect(page.locator("#volume")).toBeAttached();
  await expect(page.locator("#speed")).toBeAttached();
  await expect(page.locator("#comments .comment-search-input")).toHaveCount(1);
  await expect(page.locator("#links [data-subtab]")).toHaveCount(3);
  await expect(page.locator("#settings #module-item-template")).toHaveCount(1);
});

test("mlink-video-controller tab controllers handle every tab operation", async ({
  page,
}) => {
  await page.setContent('<div id="host"></div>');
  await page.addScriptTag({ content: await buildControllerBundle() });

  const html = buildPanelHtml();
  await page.evaluate((panelHtml) => {
    window.logger = {
      warn: () => {},
      error: () => {},
      info: () => {},
      debug: () => {},
    };

    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async (text: string) => {
          (window as unknown as { copiedText: string }).copiedText = text;
        },
      },
    });

    const host = document.getElementById("host");
    if (!host) throw new Error("host was not found");

    const shadow = host.attachShadow({ mode: "open" });
    shadow.innerHTML = panelHtml;
    shadow
      .querySelectorAll(
        "[data-tab], [data-subtab], [data-seek], [data-jump-seconds], #playback .control-btn, #speed .speed-preset, #speed .speed-adjust, #volume .volume-preset, #volume .control-btn",
      )
      .forEach((button) => {
        const iconClickTarget = document.createElement("span");
        iconClickTarget.className = "test-inner-click-target";
        iconClickTarget.textContent = "inner";
        button.appendChild(iconClickTarget);
      });

    const customContainer = shadow.querySelector("#custom .card-container");
    const servicesContainer = shadow.querySelector("#services .card-container");
    if (!customContainer || !servicesContainer) {
      throw new Error("link containers were not found");
    }
    customContainer.innerHTML =
      '<div class="action-card" data-action="customAction"><span>Custom</span></div>';
    servicesContainer.innerHTML =
      '<div class="action-card action-card-disabled" data-action="disabledAction" data-disabled="true"><span>Disabled</span></div>';

    const calls: Record<string, unknown[]> = {
      seekToPosition: [],
      seek: [],
      togglePlayPause: [],
      startTimeUpdateInterval: [],
      setupPlayStateListener: [],
      updatePlayPauseButton: [],
      toggleLoop: [],
      updateLoopButtonAppearance: [],
      setPlaybackRate: [],
      adjustPlaybackRate: [],
      updateSpeedDisplay: [],
      setVolume: [],
      updateVolumeDisplay: [],
      handleAction: [],
      setSearchOptions: [],
      searchComments: [],
      fetchComments: [],
      startUrlWatching: [],
      onDataChanged: [],
      updateHeatmap: [],
      playerSeek: [],
    };
    (
      window as unknown as { mlinkCalls: Record<string, unknown[]> }
    ).mlinkCalls = calls;

    const {
      PanelNavigationController,
      PlaybackTabController,
      SpeedTabController,
      VolumeTabController,
      LinksTabController,
      CommentsTabController,
    } = (
      window as unknown as {
        MlinkTabControllers: Record<
          string,
          new (...args: unknown[]) => unknown
        >;
      }
    ).MlinkTabControllers;

    new PanelNavigationController(shadow).bind();
    new PlaybackTabController(
      shadow,
      {
        seekToPosition: (position: number) =>
          calls.seekToPosition.push(position),
        seek: (params: unknown) => calls.seek.push(params),
        togglePlayPause: () => calls.togglePlayPause.push(true),
      },
      {
        startTimeUpdateInterval: () => calls.startTimeUpdateInterval.push(true),
        setupPlayStateListener: () => calls.setupPlayStateListener.push(true),
        updatePlayPauseButton: () => calls.updatePlayPauseButton.push(true),
        toggleLoop: () => calls.toggleLoop.push(true),
        updateLoopButtonAppearance: (button: HTMLElement) =>
          calls.updateLoopButtonAppearance.push(button.className),
      },
    ).bind();

    new SpeedTabController(
      shadow,
      {
        setPlaybackRate: (params: unknown) =>
          calls.setPlaybackRate.push(params),
        adjustPlaybackRate: (adjust: number) =>
          calls.adjustPlaybackRate.push(adjust),
      },
      () => calls.updateSpeedDisplay.push(true),
      () => {},
    ).bind();

    new VolumeTabController(
      shadow,
      {
        setVolume: (params: unknown) => calls.setVolume.push(params),
      },
      () => calls.updateVolumeDisplay.push(true),
      () => {},
    ).bind();

    new LinksTabController(shadow, {
      getLinks: async () => [],
      handleAction: async (action: string) => calls.handleAction.push(action),
    }).bind();

    new CommentsTabController(
      shadow,
      {
        setSearchOptions: (options: unknown) =>
          calls.setSearchOptions.push(options),
        getSearchOptions: () => ({ enableExtended: true }),
        searchComments: (text: string) => {
          calls.searchComments.push(text);
          return {
            success: true,
            results: [
              {
                id: "comment-1",
                no: 1,
                body: "needle comment",
                vposMs: 123000,
                userId: "user-1",
                postedAt: 1,
                commands: ["red"],
                isPremium: true,
                score: 0,
              },
            ],
          };
        },
        fetchComments: async () => {
          calls.fetchComments.push(true);
          return true;
        },
        startUrlWatching: () => calls.startUrlWatching.push(true),
        onDataChanged: (listener: () => void) => {
          calls.onDataChanged.push(listener);
          return () => calls.onDataChanged.push("unsubscribe");
        },
      },
      {
        seek: (time: number) => calls.playerSeek.push(time),
      },
      {
        updateHeatmap: () => calls.updateHeatmap.push(true),
        onFetchError: (error: unknown) => calls.updateHeatmap.push(error),
      },
    ).bind();
  }, html);

  await page.locator("#host").evaluate((host) => {
    const root = host.shadowRoot;
    root?.querySelector<HTMLElement>('[data-tab="links"]')?.click();
  });
  await expect
    .poll(() =>
      page
        .locator("#host")
        .evaluate((host) =>
          host.shadowRoot
            ?.querySelector('[data-tab="links"]')
            ?.hasAttribute("data-active"),
        ),
    )
    .toBe(true);
  await expect
    .poll(() =>
      page
        .locator("#host")
        .evaluate((host) =>
          host.shadowRoot
            ?.querySelector("#links")
            ?.classList.contains("active"),
        ),
    )
    .toBe(true);

  await page.locator("#host").evaluate((host) => {
    const root = host.shadowRoot;
    root?.querySelector<HTMLElement>('[data-subtab="services"]')?.click();
  });
  await expect
    .poll(() =>
      page
        .locator("#host")
        .evaluate((host) =>
          host.shadowRoot
            ?.querySelector("#services")
            ?.classList.contains("active"),
        ),
    )
    .toBe(true);

  await page.locator("#host").evaluate((host) => {
    const root = host.shadowRoot;
    const tracker = root?.querySelector<HTMLInputElement>(".tracker-range");
    if (tracker) {
      tracker.value = "25";
      tracker.dispatchEvent(new Event("input", { bubbles: true }));
    }
    root?.querySelector<HTMLElement>('[data-seek="+1"]')?.click();
    root?.querySelector<HTMLElement>('[data-seek="-1"]')?.click();
    root?.querySelector<HTMLElement>('[data-jump-seconds="60"]')?.click();
    root?.querySelector<HTMLElement>('[data-jump-seconds="-30"]')?.click();
    root
      ?.querySelector<HTMLElement>('[data-seek="+1"] .test-inner-click-target')
      ?.click();
    root
      ?.querySelector<HTMLElement>('[data-seek="-1"] .test-inner-click-target')
      ?.click();
    root
      ?.querySelector<HTMLElement>(
        '[data-jump-seconds="60"] .test-inner-click-target',
      )
      ?.click();
    root
      ?.querySelector<HTMLElement>(
        '[data-jump-seconds="-30"] .test-inner-click-target',
      )
      ?.click();
    root
      ?.querySelectorAll<HTMLElement>("#playback .control-btn")
      .forEach((button) => button.click());
    root
      ?.querySelectorAll<HTMLElement>(
        "#playback .control-btn .test-inner-click-target",
      )
      .forEach((button) => button.click());
  });

  await page.locator("#host").evaluate((host) => {
    const root = host.shadowRoot;
    root?.querySelector<HTMLElement>('#speed [data-speed="1.5"]')?.click();
    root?.querySelector<HTMLElement>('#speed [data-adjust="-0.1"]')?.click();
    const speedRange = root?.querySelector<HTMLInputElement>(
      "#speed .speed-range",
    );
    if (speedRange) {
      speedRange.value = "2";
      speedRange.dispatchEvent(new Event("input", { bubbles: true }));
    }
  });

  await page.locator("#host").evaluate((host) => {
    const root = host.shadowRoot;
    root?.querySelector<HTMLElement>("#volume .volume-preset")?.click();
    root
      ?.querySelectorAll<HTMLElement>("#volume .control-btn")
      .forEach((button) => button.click());
    const volumeRange = root?.querySelector<HTMLInputElement>(
      "#volume .volume-range",
    );
    if (volumeRange) {
      volumeRange.value = "0.7";
      volumeRange.dispatchEvent(new Event("input", { bubbles: true }));
    }
  });

  await page.locator("#host").evaluate((host) => {
    const root = host.shadowRoot;
    root?.querySelector<HTMLElement>("#custom .action-card")?.click();
    root?.querySelector<HTMLElement>("#services .action-card")?.click();
  });

  await page.locator("#host").evaluate((host) => {
    const root = host.shadowRoot;
    const input = root?.querySelector<HTMLInputElement>(
      ".comment-search-input",
    );
    const regex = root?.querySelector<HTMLInputElement>(".regex-toggle");
    const extended = root?.querySelector<HTMLInputElement>(".extended-toggle");
    if (input) {
      input.value = "needle";
      input.dispatchEvent(
        new KeyboardEvent("keydown", { key: " ", bubbles: true }),
      );
      input.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
      );
    }
    if (regex) {
      regex.checked = true;
      regex.dispatchEvent(new Event("change", { bubbles: true }));
    }
    if (extended) {
      extended.checked = true;
      extended.dispatchEvent(new Event("change", { bubbles: true }));
    }
    root?.querySelector<HTMLElement>(".search-btn")?.click();
    root?.querySelector<HTMLElement>(".comment-result")?.click();
    root?.querySelector<HTMLElement>(".copy-button")?.click();
    root?.querySelector<HTMLElement>(".clear-btn")?.click();
  });

  const calls = await page.evaluate(
    () =>
      (window as unknown as { mlinkCalls: Record<string, unknown[]> })
        .mlinkCalls,
  );

  expect(calls.startTimeUpdateInterval).toHaveLength(1);
  expect(calls.setupPlayStateListener).toHaveLength(1);
  expect(calls.seekToPosition).toEqual([0.25]);
  expect(calls.seek).toEqual([
    { seconds: 10, direction: "forward" },
    { seconds: 10, direction: "backward" },
    { seconds: 60, direction: "forward" },
    { seconds: 30, direction: "backward" },
    { seconds: 10, direction: "forward" },
    { seconds: 10, direction: "backward" },
    { seconds: 60, direction: "forward" },
    { seconds: 30, direction: "backward" },
    { seconds: 10, direction: "backward" },
    { seconds: 10, direction: "forward" },
    { seconds: 10, direction: "backward" },
    { seconds: 10, direction: "forward" },
  ]);
  expect(calls.togglePlayPause).toHaveLength(2);
  expect(calls.toggleLoop).toHaveLength(2);
  expect(calls.setPlaybackRate).toEqual([{ value: 1.5 }, { value: 2 }]);
  expect(calls.adjustPlaybackRate).toEqual([-0.1]);
  expect(calls.setVolume).toEqual([
    { value: 0.1 },
    { value: 0 },
    { value: 0.01 },
    { value: 0.5 },
    { value: 0.7, isLogarithmic: true },
  ]);
  expect(calls.handleAction).toEqual(["customAction"]);
  expect(calls.setSearchOptions).toEqual([
    { enableRegexp: true, enableExtended: false },
    { enableRegexp: true, enableExtended: true },
  ]);
  expect(calls.searchComments).toEqual(["needle", "needle", "needle"]);
  expect(calls.fetchComments).toHaveLength(1);
  expect(calls.startUrlWatching).toHaveLength(1);
  expect(calls.onDataChanged).toHaveLength(1);
  expect(calls.playerSeek).toEqual([123]);
  expect(calls.updateHeatmap.length).toBeGreaterThanOrEqual(4);
  expect(
    await page.evaluate(
      () => (window as unknown as { copiedText: string }).copiedText,
    ),
  ).toBe("needle comment");
  await expect
    .poll(() =>
      page
        .locator("#host")
        .evaluate(
          (host) =>
            host.shadowRoot?.querySelector(".search-results")?.textContent,
        ),
    )
    .toContain("コメントを検索してください");
});

test("module settings import/export normalization drops legacy and unknown module ids", async ({
  page,
}) => {
  await page.setContent("<main></main>");
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
