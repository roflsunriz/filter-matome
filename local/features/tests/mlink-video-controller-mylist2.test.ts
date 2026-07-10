import { afterEach, beforeEach, describe, expect, test } from "bun:test";

import {
  extractMylist2SearchKeyword,
  Mylist2Handler,
} from "../src/mlink-video-controller/handlers/mylist2";
import type { VideoInfo } from "../src/types/video-types";

type FakeLocation = {
  href: string;
  pathname: string;
  search: string;
};

type RecordedVideo = {
  mylistId: number;
  video: VideoInfo;
};

const originalWindow = globalThis.window;

const setLocation = (location: FakeLocation, href: string): void => {
  const parsed = new URL(href);
  location.href = parsed.href;
  location.pathname = parsed.pathname;
  location.search = parsed.search;
};

const createWriter = () => {
  const videos: RecordedVideo[] = [];
  const keywords: Array<{ mylistId: number; keyword: string }> = [];
  return {
    videos,
    keywords,
    writer: {
      addVideo: async (mylistId: number, video: VideoInfo) => {
        videos.push({ mylistId, video });
        return "追加しました";
      },
      addKeyword: async (mylistId: number, keyword: string) => {
        keywords.push({ mylistId, keyword });
        return 1;
      },
    },
  };
};

const installFakeWindow = (initialUrl: string) => {
  const location: FakeLocation = { href: "", pathname: "", search: "" };
  setLocation(location, initialUrl);
  const errors: string[] = [];
  const fetchedVideoIds: string[] = [];
  const resolveVideoId = (): string | null => {
    const watchMatch = /\/watch\/([a-z]{2}\d+)/i.exec(location.pathname);
    if (watchMatch) {
      return watchMatch[1].toLowerCase();
    }
    return (
      new URLSearchParams(location.search).get("videoId")?.toLowerCase() ?? null
    );
  };

  const fakeWindow = {
    location,
    logger: {
      debug: () => undefined,
      error: () => undefined,
    },
    toastr: {
      success: () => undefined,
      error: (message: string) => errors.push(message),
    },
    commonHelper: {
      extractVideoIdFromUrl: resolveVideoId,
      getVideoIdWithFallback: async () => resolveVideoId(),
      fetchWatchPage: async (videoId: string) => {
        fetchedVideoIds.push(videoId);
        return {
          apiData: {
            video: {
              id: videoId,
              title: `動画 ${videoId}`,
              registeredAt: "2026-07-10T00:00:00.000Z",
              duration: 60,
              count: { view: 1, comment: 2, mylist: 3 },
              thumbnail: { url: "https://example.com/thumbnail.jpg" },
            },
            owner: { nickname: "投稿者" },
            tag: { items: [{ name: "テスト" }] },
          },
        };
      },
    },
  };

  Object.defineProperty(globalThis, "window", {
    configurable: true,
    writable: true,
    value: fakeWindow,
  });

  return { errors, fetchedVideoIds, location };
};

beforeEach(() => {
  installFakeWindow("https://www.nicovideo.jp/");
});

afterEach(() => {
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    writable: true,
    value: originalWindow,
  });
});

describe("Mylist2Handler SPA navigation", () => {
  test("extracts the current keyword from supported SPA routes", () => {
    expect(
      extractMylist2SearchKeyword(
        "https://www.nicovideo.jp/search/SPA%20%E5%AF%BE%E5%BF%9C?sort=f",
      ),
    ).toBe("SPA 対応");
    expect(
      extractMylist2SearchKeyword("https://www.nicovideo.jp/tag/音楽"),
    ).toBe("音楽");
    expect(
      extractMylist2SearchKeyword(
        "https://www.nicovideo.jp/mylist_search/作業用BGM",
      ),
    ).toBe("作業用BGM");
    expect(
      extractMylist2SearchKeyword("https://www.nicovideo.jp/ranking"),
    ).toBeNull();
  });

  test("uses the video id from the latest SPA URL", async () => {
    const { fetchedVideoIds } = installFakeWindow(
      "https://www.nicovideo.jp/watch/sm10",
    );
    const { videos, writer } = createWriter();
    const handler = new Mylist2Handler(writer, async () => 7);

    await handler.handleAddFromCurrentPage();

    expect(fetchedVideoIds).toEqual(["sm10"]);
    expect(videos).toHaveLength(1);
    expect(videos[0]).toMatchObject({
      mylistId: 7,
      video: { id: "sm10", title: "動画 sm10", tags: ["テスト"] },
    });
  });

  test("adds the current video from the standalone player route", async () => {
    const { fetchedVideoIds } = installFakeWindow(
      "https://www.nicovideo.jp/local/features/dist/pages/video-player/index.html?videoId=sm11",
    );
    const { videos, writer } = createWriter();
    const handler = new Mylist2Handler(writer, async () => 8);

    await handler.handleAddFromCurrentPage();

    expect(fetchedVideoIds).toEqual(["sm11"]);
    expect(videos[0]).toMatchObject({ mylistId: 8, video: { id: "sm11" } });
  });

  test("does not add the previous video after navigating during selection", async () => {
    const { errors, location } = installFakeWindow(
      "https://www.nicovideo.jp/watch/sm9",
    );
    const { videos, writer } = createWriter();
    let resolveSelection: ((mylistId: number) => void) | undefined;
    const selection = new Promise<number>((resolve) => {
      resolveSelection = resolve;
    });
    const handler = new Mylist2Handler(writer, () => selection);

    const adding = handler.handleAddVideo();
    await Promise.resolve();
    setLocation(location, "https://www.nicovideo.jp/watch/sm10");
    resolveSelection?.(3);
    await adding;

    expect(videos).toEqual([]);
    expect(errors.at(-1)).toContain("ページが遷移したため追加を中止しました");
  });

  test("does not add the previous keyword after navigating during selection", async () => {
    const { errors, location } = installFakeWindow(
      "https://www.nicovideo.jp/search/最初の検索",
    );
    const { keywords, writer } = createWriter();
    let resolveSelection: ((mylistId: number) => void) | undefined;
    const selection = new Promise<number>((resolve) => {
      resolveSelection = resolve;
    });
    const handler = new Mylist2Handler(writer, () => selection);

    const adding = handler.handleAddKeyword();
    await Promise.resolve();
    setLocation(location, "https://www.nicovideo.jp/tag/次の検索");
    resolveSelection?.(4);
    await adding;

    expect(keywords).toEqual([]);
    expect(errors.at(-1)).toContain("ページが遷移したため追加を中止しました");
  });
});
