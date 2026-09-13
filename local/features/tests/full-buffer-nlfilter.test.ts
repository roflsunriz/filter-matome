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
  readOfficialPreloadPlan,
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
const fixture = `class Session {
  constructor(hls,preview){this.hlsjs=hls;this.video=hls.media;this.watch={video:{id:"sm9"}};this.context={isPreview:preview};this.hlsjs.attachMedia(this.video),this.hlsjs.on(Hls.Events.MANIFEST_PARSED,()=>{});}
  getQualityByLevelIndex(index){return index===0?this.hlsjs.quality:null}
}`;

function setup(preview = false) {
  const host: Record<string, unknown> = { dispatchEvent: () => true };
  const init = { url: "https://asset.domand.nicovideo.jp/init.cmfv" };
  const key = { uri: "https://delivery.domand.nicovideo.jp/key" };
  const details = (audio: boolean) => ({
    live: false,
    fragments: [
      {
        initSegment: init,
        decryptdata: key,
        url: `https://asset.domand.nicovideo.jp/${audio ? "audio" : "video"}1`,
      },
      {
        initSegment: init,
        decryptdata: key,
        url: `https://asset.domand.nicovideo.jp/${audio ? "audio" : "video"}2`,
        byteRangeStartOffset: 10,
        byteRangeEndOffset: 20,
      },
    ],
  });
  const listeners = new Map<string, () => void>();
  const video = { currentTime: 720, duration: 1800, paused: true };
  const hls = {
    quality: {
      video: { id: "video-h264-360p", height: 354 },
      audio: { id: "audio-aac-192kbps" },
    },
    config: {
      maxBufferLength: 180,
      maxMaxBufferLength: 600,
      backBufferLength: 60,
    },
    media: video,
    loadLevel: 0,
    currentLevel: 0,
    audioTrack: 0,
    levels: [{ details: details(false) }],
    audioTracks: [{ details: details(true) }],
    streamController: { getLoadPosition: () => video.currentTime },
    on: (name: string, listener: () => void) => listeners.set(name, listener),
    attachMedia: () => {},
    startLoad: () => {
      throw new Error("Preload must not restart HLS");
    },
  };
  const create = new Function(
    "globalThis",
    "Hls",
    "hls",
    "preview",
    `${applyBufferContract(fixture, contract)}; return new Session(hls,preview)`,
  );
  create(
    host,
    { Events: { MANIFEST_PARSED: "parsed", DESTROYING: "destroy" } },
    hls,
    preview,
  );
  return {
    host,
    hls,
    video,
    api: getOfficialBufferingApi(host),
    destroy: () => listeners.get("destroy")?.(),
  };
}

describe("全編先読みAPI v2", () => {
  test("世代を跨ぐsession境界へ一度接続し、構文を維持する", async () => {
    expect(
      await format(applyBufferContract(fixture, contract), { parser: "babel" }),
    ).toContain("version: 2");
    expect(() => applyBufferContract("const unrelated=1", contract)).toThrow(
      "0",
    );
    expect(() => applyBufferContract(fixture + fixture, contract)).toThrow("2");
  });
  test("映像・音声・初期化・鍵・Rangeの計画を作り、再生バッファーと時計を変更しない", () => {
    const { api, hls, video } = setup();
    const loadPosition = hls.streamController.getLoadPosition;
    const plan = readOfficialPreloadPlan(api!);
    expect(plan.videoMode).toBe("360p");
    expect(plan.audioBitrate).toBe(192);
    expect(plan.resources).toHaveLength(6);
    expect(
      plan.resources.filter((item) => item.url.endsWith("/key")),
    ).toHaveLength(1);
    expect(
      plan.resources.find((item) => item.url.endsWith("video2")),
    ).toMatchObject({ rangeStart: 10, rangeEnd: 20 });
    expect(hls.config).toEqual({
      maxBufferLength: 180,
      maxMaxBufferLength: 600,
      backBufferLength: 60,
    });
    expect(hls.streamController.getLoadPosition).toBe(loadPosition);
    expect(video).toEqual({ currentTime: 720, duration: 1800, paused: true });
    expect("setEnabled" in api!).toBe(false);
  });
  test("未読込・ライブ・プレビュー・破棄済みを取得可能な計画としない", () => {
    const { api, hls, destroy, host } = setup();
    hls.audioTracks[0].details.live = true;
    expect(readOfficialBufferingState(api!)?.ready).toBe(false);
    expect(() => readOfficialPreloadPlan(api!)).toThrow();
    destroy();
    expect(api!.getState()).toBeNull();
    expect(host.FilterMatomeBufferingApi).toBeUndefined();
    expect(setup(true).api).toBeNull();
  });
  test("キャッシュ品質は映像の実寸法ではなくIDを使い、画質・音質の接尾辞を扱う", () => {
    const { api, hls } = setup();
    for (const [id, mode] of [
      ["video-h264-360p", "360p"],
      ["video-h264-360p-lowest", "360p-lowest"],
      ["video-h264-360p-low", "360p-low"],
      ["video-h264-360p-mid", "360p-mid"],
      ["video-h264-1080p", "1080p"],
    ]) {
      hls.quality.video.id = id;
      expect(readOfficialPreloadPlan(api!).videoMode).toBe(mode);
    }
    hls.quality.audio.id = "audio-aac-576kbps-hr";
    expect(readOfficialPreloadPlan(api!).audioBitrate).toBe(576);
  });
  test("旧sessionの破棄で新APIを消さない", () => {
    const { host, destroy } = setup();
    const next = {};
    host.FilterMatomeBufferingApi = next;
    destroy();
    expect(host.FilterMatomeBufferingApi).toBe(next);
  });
});
