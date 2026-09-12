import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  applyPlaybackControlContract,
  readPlaybackControlContract,
} from "../scripts/sandbox/analyze-playback-control";

const contract = readPlaybackControlContract(
  readFileSync(
    resolve(
      import.meta.dirname,
      "../../../nlFilters/101_disable_official_function.txt",
    ),
    "utf8",
  ),
);
const source = `class Watch {
constructor(media,video){this.media=media;this.watch={video:{id:'sm9'}};this.disposes=[];this.getVideoElement=()=>video;this.getDuration=()=>video.duration;this.getCurrentTime=(e=!0)=>this.media.getCurrentTime(e)}
}`;

test("再生位置の境界がない場合と複数の場合を拒否する", () => {
  expect(() => applyPlaybackControlContract("const x=0", contract)).toThrow(
    "0",
  );
  expect(() => applyPlaybackControlContract(source + source, contract)).toThrow(
    "2",
  );
});

describe("公式時計と要素時刻の同期", () => {
  test("プレビューのcontrollerでWatchのAPIを上書きしない", () => {
    const existing = {};
    const host: Record<string, unknown> = {
      FilterMatomePlaybackControlApi: existing,
      dispatchEvent: () => true,
    };
    const preview = source.replace(
      "this.disposes=[];",
      "this.disposes=[];this.context={isPreview:true};",
    );
    new Function(
      "globalThis",
      "media",
      "video",
      `${applyPlaybackControlContract(preview, contract)};return new Watch(media,video)`,
    )(host, {}, { duration: 600 });
    expect(host.FilterMatomePlaybackControlApi).toBe(existing);
  });
  test("後方シークでも最後のシーク位置とsmoothTimeを更新し、両時計がAへ戻る", async () => {
    const video = {
      currentTime: 200,
      duration: 600,
      isConnected: true,
      seeking: false,
    };
    let lastSeek = 200,
      animationTime = 200,
      paused = true;
    let seeking: number | null = null;
    const host: Record<string, unknown> = { dispatchEvent: () => true };
    const media = {
      getCurrentTime: (preview = true) =>
        preview && seeking !== null
          ? seeking
          : Math.max(lastSeek, animationTime, video.currentTime),
      seek: (time: number) => {
        seeking = time;
      },
      setCurrentTime: async (time: number) => {
        lastSeek = time;
        animationTime = time;
        await Promise.resolve();
        // 公式のシーク中フラグがなければ、待機中のtickは旧要素時刻へ戻してしまう。
        if (seeking === null) animationTime = Math.max(time, video.currentTime);
        video.currentTime = time;
        seeking = null;
      },
      isPlaying: () => !paused,
      isTimeSyncing: () => false,
      isSeeking: () => seeking !== null,
      play: () => {
        paused = false;
      },
      pause: () => {
        paused = true;
      },
    };
    new Function(
      "globalThis",
      "media",
      "video",
      `${applyPlaybackControlContract(source, contract)};return new Watch(media,video)`,
    )(host, media, video);
    const api = host.FilterMatomePlaybackControlApi as {
      seek(time: number): Promise<unknown>;
      getState(): { currentTime: number; paused: boolean };
      play(): void;
      pause(): void;
    };
    video.currentTime = 100;
    expect(api.getState().currentTime).toBe(200);
    await api.seek(100);
    expect(api.getState().currentTime).toBe(100);
    expect(video.currentTime).toBe(100);
    expect(paused).toBe(true);
    await api.seek(250);
    const backSeek = api.seek(50);
    expect(api.getState().currentTime).toBe(50);
    await backSeek;
    expect(api.getState().currentTime).toBe(50);
    expect(video.currentTime).toBe(50);
    api.play();
    expect(api.getState().paused).toBe(false);
    api.pause();
    expect(api.getState().paused).toBe(true);
    await expect(api.seek(NaN)).rejects.toThrow();
    await expect(api.seek(700)).rejects.toThrow();
  });
});
