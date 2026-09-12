import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { format } from "prettier";
import {
  applyBufferContract,
  readBufferContract,
} from "../scripts/sandbox/analyze-full-buffer";
import {
  getOfficialBufferingApi,
  readOfficialBufferingState,
} from "../src/mlink-video-controller/services/official-buffering-bridge";

const contract = readBufferContract(
  readFileSync(
    resolve(
      import.meta.dirname,
      "../../../nlFilters/101_disable_official_function.txt",
    ),
    "utf8",
  ),
);

// 2026-07～09のsandbox公式sessionと同じ生成順、setBufferingLimit、HLS track構造。
const fixture = `class Session {
  constructor(hls,preview){
    this.hlsjs=hls;this.video=hls.media;this.watch={video:{id:"sm9"}};this.context={isPreview:preview};
    this.hlsjs.attachMedia(this.video),this.hlsjs.on(Hls.Events.MANIFEST_PARSED,()=>{});
  }
  setBufferingLimit(e){typeof e=="number"?this.hlsjs.config.maxBufferLength=Math.max(1,Math.min(e,normal)):this.hlsjs.config.maxBufferLength=normal}
}`;

function setup(preview = false) {
  const host: Record<string, unknown> = { dispatchEvent: () => true };
  const ranges = (parts: [number, number][]) => ({
    length: parts.length,
    start: (index: number) => parts[index][0],
    end: (index: number) => parts[index][1],
  });
  const video = {
    currentTime: 720,
    duration: 1200,
    paused: true,
    playbackRate: 1.5,
    buffered: ranges([
      [0, 80],
      [700, 850],
    ]),
  };
  const listeners = new Map<
    string,
    ((event: string, data: Record<string, unknown>) => void)[]
  >();
  const calls: unknown[][] = [];
  const hls = {
    config: {
      maxBufferLength: 180,
      maxMaxBufferLength: 600,
      backBufferLength: 60,
    },
    media: video,
    streamController: {
      mediaBuffer: {
        buffered: ranges([
          [0, 100],
          [700, 900],
        ]),
      },
      getLoadPosition: () => video.currentTime,
    },
    audioStreamController: {
      mediaBuffer: {
        buffered: ranges([
          [0, 80],
          [700, 850],
        ]),
      },
      getLoadPosition: () => video.currentTime,
    },
    on: (
      event: string,
      listener: (event: string, data: Record<string, unknown>) => void,
    ) => listeners.set(event, [...(listeners.get(event) ?? []), listener]),
    attachMedia: () => {},
    resumeBuffering: () => {
      calls.push(["resume"]);
    },
    startLoad: (start: number, skipSeek: boolean) => {
      calls.push(["load", start, skipSeek]);
    },
  };
  const Events = {
    MANIFEST_PARSED: "parsed",
    ERROR: "error",
    DESTROYING: "destroy",
  };
  const create = new Function(
    "globalThis",
    "Hls",
    "hls",
    "preview",
    `const normal=180;${applyBufferContract(fixture, contract)};return new Session(hls,preview)`,
  );
  const session = create(host, { Events }, hls, preview) as {
    setBufferingLimit(value: number | null): void;
  };
  const api = getOfficialBufferingApi(host);
  return {
    host,
    hls,
    video,
    api,
    calls,
    session,
    emit: (event: string, data: Record<string, unknown> = {}) =>
      listeners.get(event)?.forEach((listener) => listener(event, data)),
  };
}

describe("公式HLS全編先読みAPI", () => {
  test("公式session境界で1回だけ接続し、置換後の構文を維持する", async () => {
    expect(
      await format(applyBufferContract(fixture, contract), { parser: "babel" }),
    ).toContain("FilterMatomeBufferingApi");
    expect(() => applyBufferContract("const unrelated = 1", contract)).toThrow(
      "0",
    );
    expect(() => applyBufferContract(fixture + fixture, contract)).toThrow("2");
  });

  test("映像・音声の先頭側の穴を読むが、再生位置・一時停止・速度を動かさない", () => {
    const { api, video, hls, calls } = setup();
    expect(api).not.toBeNull();
    api!.setEnabled(true);
    expect(hls.config).toEqual({
      maxBufferLength: 1201,
      maxMaxBufferLength: 1201,
      backBufferLength: Infinity,
    });
    expect(hls.streamController.getLoadPosition()).toBe(100);
    expect(hls.audioStreamController.getLoadPosition()).toBe(80);
    expect(video.currentTime).toBe(720);
    expect(video.paused).toBe(true);
    expect(video.playbackRate).toBe(1.5);
    expect(calls).toEqual([["resume"], ["load", -1, true]]);
    expect(readOfficialBufferingState(api!).enabled).toBe(true);
  });

  test("公式上限制御の更新を保持し、解除で最新の通常設定へ戻す", () => {
    const { api, hls, session } = setup();
    api!.setEnabled(true);
    session.setBufferingLimit(30);
    expect(hls.config.maxBufferLength).toBe(1201);
    api!.setEnabled(false);
    expect(hls.config).toEqual({
      maxBufferLength: 30,
      maxMaxBufferLength: 600,
      backBufferLength: 60,
    });
    expect(hls.streamController.getLoadPosition()).toBe(720);
    session.setBufferingLimit(null);
    expect(hls.config.maxBufferLength).toBe(180);
    api!.setEnabled(true);
    api!.setEnabled(false);
    expect(hls.config.maxBufferLength).toBe(180);
  });

  test("容量超過・致命的エラーは停止し、100%や有効のままにしない", () => {
    const { api, hls, emit } = setup();
    api!.setEnabled(true);
    emit("error", { details: "fragLoadError", fatal: false });
    expect(api!.getState().enabled).toBe(true);
    emit("error", { details: "bufferFullError", fatal: false });
    expect(api!.getState()).toEqual({
      enabled: false,
      error: "buffer-limit",
      videoId: "sm9",
    });
    expect(hls.config.maxMaxBufferLength).toBe(600);
    api!.setEnabled(true);
    expect(api!.getState().error).toBeNull();
    emit("error", { details: "fragLoadError", fatal: true });
    expect(api!.getState().error).toBe("load-error");
    expect(api!.getState().enabled).toBe(false);
  });

  test("準備前の開始を拒否し、destroy時は復元して新sessionのAPIを消さない", () => {
    const { api, host, video, hls, emit } = setup();
    video.duration = Infinity;
    expect(() => api!.setEnabled(true)).toThrow("not ready");
    video.duration = 1200;
    api!.setEnabled(true);
    const replacement = {};
    host.FilterMatomeBufferingApi = replacement;
    emit("destroy");
    expect(host.FilterMatomeBufferingApi).toBe(replacement);
    expect(hls.config.maxBufferLength).toBe(180);
    expect(() => api!.setEnabled(true)).toThrow("disposed");
    const current = setup();
    current.emit("destroy");
    expect(current.host.FilterMatomeBufferingApi).toBeUndefined();
  });

  test("プレビューsessionへAPIを公開しない", () => {
    expect(setup(true).api).toBeNull();
  });
});
