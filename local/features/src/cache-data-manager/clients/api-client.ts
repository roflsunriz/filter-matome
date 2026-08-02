import {
  fetchNicoVideoInfo,
  isNicoVideoInfoError,
} from "@/common/video-info-api";
import type { ThumbInfo } from "@/types/movie-info-types";
import type { APIResponse } from "@/types/cache-data-manager-types";
import type { VideoAvailabilityStatus } from "@/types/video-types";

const getRawString = (info: ThumbInfo, key: string): string | undefined => {
  const value = info.raw[key];
  return typeof value === "string" ? value : undefined;
};

const classifyUnavailableStatus = (
  code: string,
  message: string,
): VideoAvailabilityStatus => {
  if (code === "PRIVATE" || /非公開|private/i.test(message)) {
    return "private";
  }
  if (
    code === "DELETED" ||
    code === "NOT_FOUND" ||
    /削除|deleted|not\s*found|存在しません/i.test(message)
  ) {
    return "deleted";
  }
  return "unavailable";
};

const errorResponse = (error: unknown): APIResponse => {
  if (!isNicoVideoInfoError(error)) {
    throw error;
  }

  return {
    status: "error",
    errorCode: error.code,
    availabilityStatus: classifyUnavailableStatus(error.code, error.message),
    description: error.message,
  };
};

const successResponse = (info: ThumbInfo): APIResponse => ({
  status: "ok",
  availabilityStatus: "available",
  title: info.title || "タイトル不明",
  description: info.description || "説明文がありません",
  duration: info.length || "0:00",
  views: info.viewCounter,
  commentCount: info.commentNum,
  mylistCount: info.mylistCounter,
  author: info.owner?.nickname || info.channel?.nickname || "投稿者不明",
  uploadDate: info.firstRetrieve || "不明",
  thumbnailUrl: info.thumbnailUrl,
  tags: info.tags.map((tag) => tag.name),
  fileSize: getRawString(info, "size_high") || "0",
});

export class APIClient {
  private cache: Map<string, APIResponse> = new Map();

  public async fetchVideoInfo(
    videoId: string,
    options: { forceRefresh?: boolean } = {},
  ): Promise<APIResponse> {
    if (!options.forceRefresh && this.cache.has(videoId)) {
      return this.cache.get(videoId)!;
    }

    let result: APIResponse;
    try {
      const info = await fetchNicoVideoInfo(videoId);
      result = successResponse(info);
    } catch (error) {
      result = errorResponse(error);
    }

    this.cache.set(videoId, result);
    setTimeout(() => this.cache.delete(videoId), 30 * 60 * 1000);
    return result;
  }
}
