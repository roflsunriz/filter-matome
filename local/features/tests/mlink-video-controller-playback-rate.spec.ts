import { expect, test } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const projectRoot = join(import.meta.dirname, "..");

const buildControllerBundle = (): string => {
  const tempDirectory = mkdtempSync(join(tmpdir(), "filter-matome-speed-"));
  const outputPath = join(tempDirectory, "controller.js");
  try {
    execFileSync("bun", ["scripts/build-playwright-fixture.ts", outputPath], {
      cwd: projectRoot,
      stdio: "pipe",
    });
    return readFileSync(outputPath, "utf8");
  } finally {
    rmSync(tempDirectory, { recursive: true, force: true });
  }
};

test("speed controls synchronize official state and retain the local fallback", async ({
  page,
}) => {
  await page.setContent(
    '<!doctype html><html lang="ja"><body><video data-name="video-content"></video></body></html>',
  );
  await page.addScriptTag({ content: buildControllerBundle() });

  const result = await page.evaluate(() => {
    const video = document.querySelector<HTMLVideoElement>("video");
    if (!video) throw new Error("video was not found");
    window.logger = {
      warn: () => {},
      error: () => {},
      info: () => {},
      log: () => {},
      debug: () => {},
      handleError: () => {},
      measurePerformance: (_component, _method, callback) => callback(),
    };
    (
      window as unknown as { NicoCache_nl: Record<string, unknown> }
    ).NicoCache_nl = {};

    let officialRate = 1;
    window.FilterMatomePlaybackRateApi = {
      version: 1,
      get: () => officialRate,
      set: (rate: number) => {
        officialRate = rate;
        video.playbackRate = rate;
        return officialRate;
      },
    };

    const { NicoVideoPlayer, SpeedHandler } = (
      window as unknown as {
        MlinkTabControllers: {
          NicoVideoPlayer: {
            getInstance: () => { getPlaybackRate: () => number };
          };
          SpeedHandler: new () => {
            setPlaybackRate: (options: { value: number }) => void;
            getPlaybackRate: () => number;
          };
        };
      }
    ).MlinkTabControllers;
    const speedHandler = new SpeedHandler();
    speedHandler.setPlaybackRate({ value: 3.5 });
    const mlinkResult = {
      officialRate,
      videoRate: video.playbackRate,
      displayedRate: speedHandler.getPlaybackRate(),
      playerRate: NicoVideoPlayer.getInstance().getPlaybackRate(),
    };

    window.FilterMatomePlaybackRateApi.set(1.25);
    const officialResult = {
      videoRate: video.playbackRate,
      displayedRate: speedHandler.getPlaybackRate(),
    };

    delete window.FilterMatomePlaybackRateApi;
    speedHandler.setPlaybackRate({ value: 2.25 });
    const fallbackResult = {
      videoRate: video.playbackRate,
      displayedRate: speedHandler.getPlaybackRate(),
    };
    return { mlinkResult, officialResult, fallbackResult };
  });

  expect(result.mlinkResult).toEqual({
    officialRate: 3.5,
    videoRate: 3.5,
    displayedRate: 3.5,
    playerRate: 3.5,
  });
  expect(result.officialResult).toEqual({
    videoRate: 1.25,
    displayedRate: 1.25,
  });
  expect(result.fallbackResult).toEqual({
    videoRate: 2.25,
    displayedRate: 2.25,
  });
});
