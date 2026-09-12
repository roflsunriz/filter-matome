import { describe, expect, test } from "bun:test";
import {
  FullPreloadController,
  validatePreloadResource,
} from "../src/mlink-video-controller/services/full-preload";
import type { OfficialPreloadPlan } from "../src/mlink-video-controller/services/official-buffering-bridge";

const plan: OfficialPreloadPlan = {
  videoId: "sm9",
  videoQualityId: "video-h264-360p-lowest",
  audioQualityId: "audio-aac-192kbps",
  videoMode: "360p",
  audioBitrate: 192,
  ready: true,
  resources: [0, 1, 2].map((id) => ({
    url: `https://asset.domand.nicovideo.jp/segment${id}`,
  })),
};

describe("容量制限に依存しない全編取得", () => {
  test("両方のplaylistを取得してから断片を取得する", async () => {
    const manifests = new Set<string>();
    let done = 0;
    const controller = new FullPreloadController(() => {}, {
      completedCache: async () => done === 4,
      fetcher: (async (input: RequestInfo | URL) => {
        const pathname = new URL(String(input)).pathname;
        if (pathname.endsWith(".m3u8")) {
          await new Promise((resolve) => setTimeout(resolve, 5));
          manifests.add(pathname);
        } else expect(manifests.size).toBe(2);
        done++;
        return new Response("data");
      }) as typeof fetch,
    });
    await controller.start({
      ...plan,
      resources: ["video.cmfv", "video.m3u8", "audio.cmfa", "audio.m3u8"].map(
        (file) => ({ url: `https://delivery.domand.nicovideo.jp/${file}` }),
      ),
    });
    expect(controller.status).toBe("completed");
  });
  test("192MiBを小さなストリームとして消費し、全件取得と完成キャッシュを確認して100%にする", async () => {
    let finished = 0,
      bytes = 0,
      active = 0,
      maximum = 0;
    const chunk = new Uint8Array(64 * 1024);
    const controller = new FullPreloadController(() => {}, {
      completedCache: async (selection) => {
        expect(selection.videoMode).toBe("360p");
        expect(selection.audioBitrate).toBe(192);
        return finished === 3;
      },
      fetcher: (async (_url: RequestInfo | URL, init?: RequestInit) => {
        expect(init?.credentials).toBe("include");
        expect(init?.cache).toBe("reload");
        active++;
        maximum = Math.max(maximum, active);
        let count = 1024;
        const response = new Response(
          new ReadableStream({
            pull(stream) {
              if (count-- > 0) {
                bytes += chunk.length;
                stream.enqueue(chunk);
              } else {
                active--;
                finished++;
                stream.close();
              }
            },
          }),
        );
        response.arrayBuffer = () => {
          throw new Error("Whole resources must not be buffered in memory");
        };
        return response;
      }) as typeof fetch,
    });
    await controller.start(plan);
    expect(bytes).toBe(192 * 1024 * 1024);
    expect(maximum).toBeLessThanOrEqual(2);
    expect(controller.status).toBe("completed");
    expect(controller.percent).toBe(100);
  });
  test("対象品質が完成している場合は再転送しない", async () => {
    const controller = new FullPreloadController(() => {}, {
      completedCache: async () => true,
      fetcher: (() => {
        throw new Error("unexpected transfer");
      }) as typeof fetch,
    });
    await controller.start(plan);
    expect(controller.status).toBe("completed");
  });
  test("キャンセル後の古い完了を新しい状態へ反映しない", async () => {
    let finish: (() => void) | undefined;
    const controller = new FullPreloadController(() => {}, {
      completedCache: () =>
        new Promise((resolve) => {
          finish = () => resolve(true);
        }),
      fetcher: fetch,
    });
    const pending = controller.start(plan);
    controller.reset();
    finish!();
    await pending;
    expect(controller.status).toBe("idle");
    expect(controller.percent).toBe(0);
  });
  test("失敗した取得を100%と表示せず、後続要求を中止する", async () => {
    const controller = new FullPreloadController(() => {}, {
      completedCache: async () => false,
      fetcher: (async () =>
        new Response(null, { status: 403 })) as typeof fetch,
    });
    await controller.start(plan);
    expect(controller.status).toBe("failed");
    expect(controller.percent).toBeLessThan(100);
  });
  test("公式配信先とローカル再生セッション以外へ認証付き取得を送らない", () => {
    for (const url of [
      "http://asset.domand.nicovideo.jp/x",
      "https://evil.test/x",
      "https://user:pass@asset.domand.nicovideo.jp/x",
      "https://nicocachenl.test/api/v1/control",
      "https://asset.domand.nicovideo.jp:444/x",
    ])
      expect(() => validatePreloadResource({ url })).toThrow();
    expect(
      validatePreloadResource({
        url: "https://nicocachenl.test/media/v1/playback-sessions/abc/files/video/1.cmfv",
      }).hostname,
    ).toBe("nicocachenl.test");
  });
});
