import { expect, test, type Page } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

let bundle = "";
test.beforeAll(() => {
  const dir = mkdtempSync(join(tmpdir(), "mlink-tools-"));
  try {
    const output = join(dir, "fixture.js");
    execFileSync(
      "bun",
      [
        "scripts/build-playwright-fixture.ts",
        output,
        "tests/fixtures/playback-tools-entry.ts",
      ],
      { cwd: join(import.meta.dirname, ".."), stdio: "pipe" },
    );
    bundle = readFileSync(output, "utf8");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// 無音PCMを本物のHTMLMediaElementへ読み込み、seek/play/pause/endedをブラウザーで処理する。
function wave(): string {
  const data = Buffer.alloc(44 + 8000 * 2 * 20);
  data.write("RIFF");
  data.writeUInt32LE(data.length - 8, 4);
  data.write("WAVEfmt ", 8);
  data.writeUInt32LE(16, 16);
  data.writeUInt16LE(1, 20);
  data.writeUInt16LE(1, 22);
  data.writeUInt32LE(8000, 24);
  data.writeUInt32LE(16000, 28);
  data.writeUInt16LE(2, 32);
  data.writeUInt16LE(16, 34);
  data.write("data", 36);
  data.writeUInt32LE(data.length - 44, 40);
  return `data:audio/wav;base64,${data.toString("base64")}`;
}

async function setup(page: Page, language = "ja"): Promise<void> {
  await page.route("https://www.nicovideo.jp/**", (route) =>
    route.fulfill({
      contentType: "text/html; charset=utf-8",
      body: `<!doctype html><html lang="${language}"><head><meta charset="utf-8"></head><body><video data-name="video-content" muted src="${wave()}" style="display:none"></video><playback-tools-fixture></playback-tools-fixture></body></html>`,
    }),
  );
  await page.goto("https://www.nicovideo.jp/watch/sm9");
  await page.waitForFunction(
    () => document.querySelector("video")!.duration > 0,
  );
  await page.addScriptTag({ content: bundle });
}

const time = (page: Page) =>
  page.evaluate(() => document.querySelector("video")!.currentTime);
const setTime = (page: Page, value: number) =>
  page.evaluate(async (seconds) => {
    const api = (
      window as unknown as {
        FilterMatomePlaybackControlApi: { seek(time: number): Promise<void> };
      }
    ).FilterMatomePlaybackControlApi;
    await api.seek(seconds);
  }, value);
const action = (page: Page, name: string) =>
  page.locator(`[data-action="${name}"]`);
async function point(
  page: Page,
  name: "a" | "b",
  value: string,
): Promise<void> {
  await page.locator(`[data-point="${name}"]`).fill(value);
  await page.locator(`[data-point="${name}"]`).press("Tab");
}

test("A-Bの指定・時刻編集・一時停止維持・繰り返し・解除・クリア", async ({
  page,
}) => {
  await setup(page);
  await expect(action(page, "ab-toggle")).toBeDisabled();
  await setTime(page, 3);
  await action(page, "set-a").click();
  await setTime(page, 4);
  await action(page, "set-b").click();
  await expect(page.locator('[data-point="a"]')).toHaveValue("0:03.000");
  await expect(page.locator('[data-point="b"]')).toHaveValue("0:04.000");
  await action(page, "ab-toggle").focus();
  await page.keyboard.press("Space");
  await expect(page.locator(".panel")).toBeVisible();
  await expect(action(page, "ab-toggle")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  expect(
    await page.evaluate(() => document.querySelector("video")!.paused),
  ).toBe(true);
  expect(await time(page)).toBeCloseTo(3, 1);
  expect(
    await page.evaluate(
      () =>
        (
          window as unknown as {
            FilterMatomePlaybackControlApi: {
              getState(): { currentTime: number };
            };
          }
        ).FilterMatomePlaybackControlApi.getState().currentTime,
    ),
  ).toBeCloseTo(3, 1);
  await page.evaluate(async () => {
    const video = document.querySelector("video")!;
    video.currentTime = 3.95;
    await video.play();
  });
  await expect.poll(() => time(page)).toBeLessThan(3.8);
  expect(
    await page.evaluate(() => {
      const api = (
        window as unknown as {
          FilterMatomePlaybackControlApi: {
            getState(): { currentTime: number };
          };
        }
      ).FilterMatomePlaybackControlApi;
      return Math.abs(
        api.getState().currentTime -
          document.querySelector("video")!.currentTime,
      );
    }),
  ).toBeLessThan(0.02);
  await page.evaluate(() => document.querySelector("video")!.pause());
  const paused = await time(page);
  await page.waitForTimeout(250);
  expect(await time(page)).toBeCloseTo(paused, 2);
  await action(page, "ab-toggle").click();
  await page.evaluate(async () => {
    const video = document.querySelector("video")!;
    video.currentTime = 3.95;
    await video.play();
  });
  await expect.poll(() => time(page)).toBeGreaterThan(4.05);
  await page.evaluate(() => document.querySelector("video")!.pause());
  await point(page, "a", "-1");
  await expect(page.locator('[data-point="a"]')).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  await expect(action(page, "ab-toggle")).toBeDisabled();
  await point(page, "a", "5");
  await expect(page.locator("[data-ab-status]")).toHaveAttribute(
    "data-error",
    "true",
  );
  await point(page, "b", "0:06.100");
  await expect(action(page, "ab-toggle")).toBeEnabled();
  await action(page, "ab-clear").click();
  await expect(page.locator('[data-point="a"]')).toHaveValue("");
  await expect(page.locator('[data-point="b"]')).toHaveValue("");
  await expect(action(page, "ab-toggle")).toBeDisabled();
});

test("先読み計画の遅延公開・転送失敗・完成確認・品質とSPAのリセット", async ({
  page,
}) => {
  await setup(page);
  await expect(action(page, "full-buffer")).toBeDisabled();
  let failed = true;
  let completed = 0;
  let release: (() => void) | undefined;
  let gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const cors = {
    "access-control-allow-origin": "https://www.nicovideo.jp",
    "access-control-allow-credentials": "true",
  };
  await page.route(
    "https://asset.domand.nicovideo.jp/preload/**",
    async (route) => {
      await gate;
      if (!failed) completed++;
      await route
        .fulfill({ status: failed ? 403 : 200, headers: cors, body: "segment" })
        .catch(() => {});
    },
  );
  await page.route(
    "https://nicocachenl.test/api/v1/videos/**/cache-entries",
    async (route) => {
      const item = (
        cacheId: string,
        audioBitrate: number,
        complete: boolean,
      ) => ({
        videoId: "sm9",
        cacheId,
        complete,
        caching: false,
        videoMode: "360p",
        audioBitrate,
        legacyLow: false,
        size: 100,
        title: null,
        subFolder: null,
        filename: null,
        ts: null,
      });
      const caches = {
        other: item("other", 64, true),
        selected: item("selected", 192, completed >= 2),
      };
      await route.fulfill({
        headers: cors,
        contentType: "application/json",
        body: JSON.stringify({
          videoId: "sm9",
          preferred: "other",
          cacheIds: ["other", "selected"],
          cachings: [],
          completes: completed >= 2 ? ["other", "selected"] : ["other"],
          caches,
        }),
      });
    },
  );
  await page.evaluate(() => {
    const host = window as unknown as Record<string, unknown>;
    const state = {
      videoId: "sm9",
      videoQualityId: "video-h264-360p-lowest",
      audioQualityId: "audio-aac-192kbps",
      videoMode: "360p",
      audioBitrate: 192,
      ready: true,
    };
    host.testBufferState = state;
    host.FilterMatomeBufferingApi = {
      version: 2,
      getState: () => ({ ...state }),
      getPlan: () => ({
        ...state,
        resources: [0, 1].map((id) => ({
          url: `https://asset.domand.nicovideo.jp/preload/${id}`,
        })),
      }),
    };
    window.dispatchEvent(new Event("filter-matome:api-status-change"));
  });
  await expect(action(page, "full-buffer")).toBeEnabled();
  await expect(page.locator("[data-buffer-progress]")).toHaveJSProperty(
    "value",
    0,
  );
  await action(page, "full-buffer").click();
  await expect(action(page, "full-buffer")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  release!();
  await expect(page.locator("[data-buffer-status]")).toHaveAttribute(
    "data-error",
    "true",
  );
  await expect(action(page, "full-buffer")).toHaveAttribute(
    "aria-pressed",
    "false",
  );
  failed = false;
  await action(page, "full-buffer").click();
  await expect(page.locator("[data-buffer-progress]")).toHaveJSProperty(
    "value",
    100,
  );
  expect(completed).toBe(2);
  // 別品質の完成キャッシュを現在品質の完了と誤認せず、変更時は状態を消す。
  await page.evaluate(() => {
    const state = (
      window as unknown as {
        testBufferState: { audioQualityId: string; audioBitrate: number };
      }
    ).testBufferState;
    state.audioQualityId = "audio-aac-320kbps";
    state.audioBitrate = 320;
    window.dispatchEvent(new Event("filter-matome:api-status-change"));
  });
  await expect(page.locator("[data-buffer-progress]")).toHaveJSProperty(
    "value",
    0,
  );
  gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await action(page, "full-buffer").click();
  await expect(action(page, "full-buffer")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await point(page, "a", "1");
  await point(page, "b", "2");
  await action(page, "ab-toggle").click();
  await page.evaluate(() => history.pushState(null, "", "/watch/sm10"));
  await expect(action(page, "full-buffer")).toBeDisabled();
  await expect(action(page, "ab-toggle")).toHaveAttribute(
    "aria-pressed",
    "false",
  );
  await expect(page.locator('[data-point="a"]')).toHaveValue("");
  await expect(page.locator("[data-buffer-progress]")).toHaveJSProperty(
    "value",
    0,
  );
  release!();
});

test("全体リピートへの切替と再接続・破棄でA-B監視を残さない", async ({
  page,
}) => {
  await setup(page);
  await point(page, "a", "1");
  await point(page, "b", "2");
  await action(page, "ab-toggle").click();
  await page.locator(".control-grid .control-btn").last().click();
  await expect(action(page, "ab-toggle")).toHaveAttribute(
    "aria-pressed",
    "false",
  );
  await action(page, "ab-toggle").click();
  await page.evaluate(() => {
    const panel = document.querySelector("playback-tools-fixture")!;
    panel.remove();
    document.body.append(panel);
  });
  await expect(action(page, "ab-toggle")).toHaveAttribute(
    "aria-pressed",
    "false",
  );
  await point(page, "a", "1");
  await point(page, "b", "2");
  await action(page, "ab-toggle").click();
  await page.evaluate(async () => {
    document.querySelector("playback-tools-fixture")!.remove();
    const video = document.querySelector("video")!;
    video.currentTime = 1.95;
    await video.play();
  });
  await expect.poll(() => time(page)).toBeGreaterThan(2.1);
});

test("Bが動画終端でも次動画の終了処理へ渡さず区間を継続する", async ({
  page,
}) => {
  await setup(page);
  await page.evaluate(() => {
    const host = window as unknown as { normalEnded: number };
    host.normalEnded = 0;
    document.querySelector("video")!.addEventListener("ended", () => {
      host.normalEnded++;
    });
  });
  await point(page, "a", "19");
  await point(page, "b", "20");
  await action(page, "ab-toggle").click();
  await page.evaluate(async () => {
    const video = document.querySelector("video")!;
    video.currentTime = 19.95;
    await video.play();
  });
  await expect.poll(() => time(page)).toBeLessThan(19.9);
  expect(
    await page.evaluate(
      () => (window as unknown as { normalEnded: number }).normalEnded,
    ),
  ).toBe(0);
  await page.evaluate(() => document.querySelector("video")!.pause());
  await action(page, "ab-toggle").click();
  await page.evaluate(async () => {
    const video = document.querySelector("video")!;
    video.currentTime = 19.95;
    await video.play();
  });
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as unknown as { normalEnded: number }).normalEnded,
      ),
    )
    .toBe(1);
  await point(page, "a", "1.1");
  await point(page, "b", "1.2");
  await expect(action(page, "ab-toggle")).toBeEnabled();
});

test("動画要素の置換では同じ動画の点を保ち、旧要素を監視しない", async ({
  page,
}) => {
  await setup(page);
  await point(page, "a", "1");
  await point(page, "b", "2");
  await action(page, "ab-toggle").click();
  await page.evaluate(() => {
    const video = document.querySelector("video")!;
    const replacement = video.cloneNode(true) as HTMLVideoElement;
    video.replaceWith(replacement);
    (window as unknown as { oldVideo: HTMLVideoElement }).oldVideo = video;
  });
  await page.waitForFunction(
    () => document.querySelector("video")!.duration === 20,
  );
  await expect(page.locator('[data-point="a"]')).toHaveValue("0:01.000");
  await expect(action(page, "ab-toggle")).toBeEnabled();
  await page.waitForTimeout(300);
  await page.evaluate(async () => {
    const video = document.querySelector("video")!;
    video.currentTime = 1.95;
    await video.play();
  });
  await expect.poll(() => time(page)).toBeLessThan(1.9);
  await page.evaluate(async () => {
    const video = (window as unknown as { oldVideo: HTMLVideoElement })
      .oldVideo;
    video.currentTime = 1.95;
    await video.play();
  });
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as unknown as { oldVideo: HTMLVideoElement }).oldVideo
            .currentTime,
      ),
    )
    .toBeGreaterThan(2.1);
});

test("ローカルプレイヤーの動画要素へ公式時計を適用しない", async ({ page }) => {
  await setup(page);
  await setTime(page, 10);
  await page.evaluate(() => {
    const video = document.querySelector("video")!;
    video.id = "video-element";
    video.currentTime = 1;
  });
  await expect(page.locator("[data-full-buffer]")).toBeHidden();
  await action(page, "set-a").click();
  await expect(page.locator('[data-point="a"]')).toHaveValue("0:01.000");
  await point(page, "b", "2");
  await action(page, "ab-toggle").click();
  await page.evaluate(async () => {
    const video = document.querySelector("video")!;
    video.currentTime = 1.95;
    await video.play();
  });
  await expect.poll(() => time(page)).toBeLessThan(1.8);
});

for (const language of ["ja", "en", "ar"]) {
  test(`${language}: 狭幅と縦長で入力・操作が領域内に収まる`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await setup(page, language);
    await expect(page.locator("[data-playback-tools]")).toHaveAttribute(
      "dir",
      language === "ar" ? "rtl" : "ltr",
    );
    for (const size of [
      { width: 360, height: 800 },
      { width: 800, height: 600 },
      { width: 1920, height: 1080 },
    ]) {
      await page.setViewportSize(size);
      const overflow = await page
        .locator("[data-playback-tools]")
        .evaluate((element) => {
          const bounds = element.getBoundingClientRect();
          return [...element.querySelectorAll("input,button,progress")].some(
            (control) => {
              const rect = control.getBoundingClientRect();
              return (
                rect.left < bounds.left - 1 || rect.right > bounds.right + 1
              );
            },
          );
        });
      expect(overflow).toBe(false);
      const panel = await page.locator(".panel").boundingBox();
      expect(panel?.x).toBeGreaterThanOrEqual(0);
      expect((panel?.x ?? 0) + (panel?.width ?? 0)).toBeLessThanOrEqual(
        size.width,
      );
      expect(panel?.y).toBeGreaterThanOrEqual(0);
    }
    await page.setViewportSize({ width: 360, height: 800 });
    await page.locator("[data-playback-tools]").screenshot({
      path: testInfo.outputPath(`playback-tools-${language}.png`),
    });
  });
}
