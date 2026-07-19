import { describe, expect, test } from "bun:test";
import {
  CommentPostError,
  CommentPoster,
} from "../src/video-player/core/comment-poster";

const createWatchPageResult = (
  overrides: Record<string, unknown> = {},
): Record<string, unknown> => ({
  serverContext: { sessionUser: { id: 1, type: "premium" } },
  apiData: {
    video: { id: "sm9" },
    comment: {
      nvComment: { server: "https://public.nvcomment.nicovideo.jp" },
      threads: [
        {
          id: 1173108780,
          fork: 0,
          forkLabel: "main",
          isDefaultPostTarget: true,
          isThreadkeyRequired: false,
          postkeyStatus: 0,
        },
      ],
    },
  },
  ...overrides,
});

const jsonResponse = (value: unknown, status = 200): Response =>
  new Response(JSON.stringify(value), {
    status,
    headers: { "Content-Type": "application/json" },
  });

describe("CommentPoster", () => {
  test("公式と同じ2段階APIで通常コメントを投稿し184を補う", async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    const fetchImpl: typeof fetch = async (input, init) => {
      const url = String(input);
      calls.push({ url, init });
      if (url.startsWith("https://nvapi.nicovideo.jp/")) {
        return jsonResponse({
          meta: { status: 200 },
          data: { postKey: "post-key", challenge: { isRequired: false } },
        });
      }
      return jsonResponse({
        meta: { status: 200 },
        data: { id: "c1", no: 42 },
      });
    };
    const poster = new CommentPoster({
      fetchImpl,
      fetchWatchPage: async () => createWatchPageResult(),
    });

    const result = await poster.post({
      videoId: "sm9",
      body: "テストコメント",
      commands: ["red", "big"],
      vposMs: 1234.9,
    });

    expect(result).toEqual({
      id: "c1",
      no: 42,
      body: "テストコメント",
      commands: ["red", "big", "184"],
      vposMs: 1234,
    });
    expect(calls).toHaveLength(2);
    const keyUrl = new URL(calls[0].url);
    expect(keyUrl.pathname).toBe("/v1/comment/keys/post");
    expect(keyUrl.searchParams.get("threadId")).toBe("1173108780");
    expect(keyUrl.searchParams.get("pc")).toBe("1");
    expect(calls[0].init?.credentials).toBe("include");

    const postUrl = new URL(calls[1].url);
    expect(postUrl.pathname).toBe("/v1/threads/1173108780/comments");
    expect(postUrl.searchParams.get("pc")).toBe("1");
    expect(calls[1].init?.credentials).toBe("omit");
    expect(new Headers(calls[1].init?.headers).get("Content-Type")).toBe(
      "application/json;charset=utf-8",
    );
    expect(JSON.parse(String(calls[1].init?.body))).toEqual({
      videoId: "sm9",
      commands: ["red", "big", "184"],
      body: "テストコメント",
      vposMs: 1234,
      postKey: "post-key",
    });
  });

  test("未ログイン状態では外部APIを呼び出さない", async () => {
    let fetchCount = 0;
    const poster = new CommentPoster({
      fetchImpl: async () => {
        fetchCount++;
        return jsonResponse({});
      },
      fetchWatchPage: async () =>
        createWatchPageResult({ serverContext: { sessionUser: null } }),
    });

    await expect(
      poster.post({
        videoId: "sm9",
        body: "テスト",
        commands: [],
        vposMs: 0,
      }),
    ).rejects.toMatchObject<CommentPostError>({ code: "not-logged-in" });
    expect(fetchCount).toBe(0);
  });

  test("threadkey必須動画では184コマンドを拒否する", async () => {
    const result = createWatchPageResult();
    const apiData = result["apiData"] as {
      comment: { threads: Array<Record<string, unknown>> };
    };
    apiData.comment.threads[0]["isThreadkeyRequired"] = true;
    const poster = new CommentPoster({
      fetchImpl: async () => jsonResponse({}),
      fetchWatchPage: async () => result,
    });

    await expect(
      poster.post({
        videoId: "sm9",
        body: "テスト",
        commands: ["184"],
        vposMs: 0,
      }),
    ).rejects.toMatchObject<CommentPostError>({ code: "invalid-184" });
  });
});
