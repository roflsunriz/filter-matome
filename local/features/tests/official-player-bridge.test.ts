import { describe, expect, test } from "bun:test";
import {
  OFFICIAL_COMMENT_API_VERSION,
  OfficialPlayerBridge,
  resolveOfficialCommentReloadApi,
} from "@/comment-filter2/integrations/official-player-bridge";

describe("OfficialPlayerBridge", () => {
  test("版とreload関数が一致するAPIだけを受理する", () => {
    expect(resolveOfficialCommentReloadApi({})).toBeNull();
    expect(
      resolveOfficialCommentReloadApi({
        FilterMatomeCommentApi: { version: 2, reload: async () => undefined },
      }),
    ).toBeNull();
    expect(
      resolveOfficialCommentReloadApi({
        FilterMatomeCommentApi: {
          version: OFFICIAL_COMMENT_API_VERSION,
          reload: "invalid",
        },
      }),
    ).toBeNull();
    expect(
      resolveOfficialCommentReloadApi({
        FilterMatomeCommentApi: {
          version: OFFICIAL_COMMENT_API_VERSION,
          reload: async () => undefined,
        },
      }),
    ).not.toBeNull();
  });

  test("待機してもAPIがない場合は利用不能を示すfalseを返す", async () => {
    const bridge = new OfficialPlayerBridge({}, { availabilityTimeoutMs: 0 });
    expect(bridge.isAvailable()).toBe(false);
    expect(await bridge.reloadComments()).toBe(false);
  });

  test("初期化中に遅れて公開されたAPIを待って再取得する", async () => {
    let reloadCount = 0;
    const host: { FilterMatomeCommentApi?: unknown } = {};
    const bridge = new OfficialPlayerBridge(host, {
      availabilityTimeoutMs: 100,
      pollIntervalMs: 5,
    });
    setTimeout(() => {
      host.FilterMatomeCommentApi = {
        version: OFFICIAL_COMMENT_API_VERSION,
        reload: async () => {
          reloadCount += 1;
        },
      };
    }, 15);

    expect(await bridge.reloadComments()).toBe(true);
    expect(reloadCount).toBe(1);
  });

  test("同時の再取得要求を一つの公式actionへまとめる", async () => {
    let reloadCount = 0;
    let release: (() => void) | null = null;
    const pending = new Promise<void>((resolve) => {
      release = resolve;
    });
    const bridge = new OfficialPlayerBridge({
      FilterMatomeCommentApi: {
        version: OFFICIAL_COMMENT_API_VERSION,
        reload: async () => {
          reloadCount += 1;
          await pending;
        },
      },
    });

    const first = bridge.reloadComments();
    const second = bridge.reloadComments();
    expect(first).toBe(second);
    expect(reloadCount).toBe(1);
    release?.();
    expect(await first).toBe(true);
    expect(await second).toBe(true);
  });

  test("失敗後は次の再取得を再試行できる", async () => {
    let reloadCount = 0;
    const host = {
      FilterMatomeCommentApi: {
        version: OFFICIAL_COMMENT_API_VERSION,
        reload: async () => {
          reloadCount += 1;
          if (reloadCount === 1) {
            throw new Error("temporary failure");
          }
        },
      },
    };
    const bridge = new OfficialPlayerBridge(host);

    expect(bridge.reloadComments()).rejects.toThrow("temporary failure");
    await expect(bridge.reloadComments()).resolves.toBe(true);
    expect(reloadCount).toBe(2);
  });
});
