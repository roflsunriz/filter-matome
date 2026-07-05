import { describe, expect, test } from "bun:test";

import { VideoService } from "../src/mylist2/services/video-service";
import type { DBVideo, VideoInfo } from "../src/types/video-types";

type FakeRequest<T> = {
  result: T;
  error: Error | null;
  onsuccess?: () => void;
  onerror?: () => void;
};

function createSuccessRequest<T>(result: T): FakeRequest<T> {
  const request: FakeRequest<T> = {
    result,
    error: null,
  };
  queueMicrotask(() => request.onsuccess?.());
  return request;
}

class FakeMylistDb {
  readonly videos = new Map<string, DBVideo>();

  async initDB(): Promise<{
    transaction: () => {
      objectStore: () => {
        get: (id: string) => FakeRequest<DBVideo | undefined>;
        add: (video: DBVideo) => FakeRequest<undefined>;
      };
    };
  }> {
    return {
      transaction: () => ({
        objectStore: () => ({
          get: (id: string) => createSuccessRequest(this.videos.get(id)),
          add: (video: DBVideo) => {
            this.videos.set(video.id, video);
            return createSuccessRequest(undefined);
          },
        }),
      }),
    };
  }
}

function createVideoInfo(id: string): VideoInfo {
  return {
    id,
    title: "動画タイトル",
    viewCount: 1,
    commentCount: 2,
    mylistCount: 3,
    thumbnailUrl: "https://example.com/thumb.jpg",
    uploadedAt: 1000,
    authorName: "投稿者",
    length: 60,
  };
}

describe("mylist2 VideoService", () => {
  test("uses originalId when copying an existing DBVideo", async () => {
    const fakeDb = new FakeMylistDb();
    const service = new VideoService(fakeDb as never);
    const sourceVideo: DBVideo = {
      ...createVideoInfo("1_sm9"),
      originalId: "sm9",
      mylistId: 1,
      addedAt: 1000,
    };

    await service.addVideo(2, sourceVideo);

    const saved = fakeDb.videos.get("2_sm9");
    expect(saved?.id).toBe("2_sm9");
    expect(saved?.originalId).toBe("sm9");
  });

  test("recovers the video id from a composite id fallback", async () => {
    const fakeDb = new FakeMylistDb();
    const service = new VideoService(fakeDb as never);

    await service.addVideo(3, createVideoInfo("2_1_nm123"));

    const saved = fakeDb.videos.get("3_nm123");
    expect(saved?.id).toBe("3_nm123");
    expect(saved?.originalId).toBe("nm123");
  });
});
