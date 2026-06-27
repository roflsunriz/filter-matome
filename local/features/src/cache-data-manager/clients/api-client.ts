import type { APIResponse } from "@/types";

export class APIClient {
  private baseUrl: string = "https://ext.nicovideo.jp/api/getthumbinfo/";
  private cache: Map<string, APIResponse> = new Map();

  public async fetchVideoInfo(
    videoId: string,
    options: { forceRefresh?: boolean } = {},
  ): Promise<APIResponse> {
    // キャッシュチェック（30分間有効）
    if (!options.forceRefresh && this.cache.has(videoId)) {
      return this.cache.get(videoId)!;
    }

    const response = await fetch(`${this.baseUrl}${videoId}`);
    if (!response.ok) {
      throw new Error(`API通信エラー: ${response.status}`);
    }

    const text = await response.text();
    // キャッシュ保存と返却を直接行う（中間変数を避ける）
    this.cache.set(videoId, this.parseResponse(text));
    setTimeout(() => this.cache.delete(videoId), 30 * 60 * 1000);
    return this.cache.get(videoId)!;
  }

  private parseResponse(xmlText: string): APIResponse {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlText, "text/xml");

    // エラータイプを判別
    const errorCode = doc.querySelector("error code")?.textContent;
    if (errorCode) {
      return {
        status: "error",
        errorCode: errorCode,
        availabilityStatus: "unavailable",
        description:
          doc.querySelector("error description")?.textContent || "不明なエラー",
      };
    }

    const thumb = doc.querySelector("thumb");
    return {
      status: "ok",
      availabilityStatus: "available",
      title: thumb?.querySelector("title")?.textContent || "タイトル不明",
      description:
        thumb?.querySelector("description")?.textContent ||
        "説明文がありません",
      duration: thumb?.querySelector("length")?.textContent || "0:00",
      views:
        parseInt(thumb?.querySelector("view_counter")?.textContent || "0") || 0,
      commentCount:
        parseInt(thumb?.querySelector("comment_num")?.textContent || "0") || 0,
      mylistCount:
        parseInt(thumb?.querySelector("mylist_counter")?.textContent || "0") ||
        0,
      author:
        thumb?.querySelector("user_nickname")?.textContent ||
        doc.querySelector("ch_name")?.textContent ||
        "投稿者不明",
      uploadDate: thumb?.querySelector("first_retrieve")?.textContent || "不明",
      thumbnailUrl: thumb?.querySelector("thumbnail_url")?.textContent || "",
      tags: Array.from(thumb?.querySelectorAll("tags tag") || []).map(
        (tag) => tag.textContent?.trim() || "",
      ),
      fileSize: thumb?.querySelector("size_high")?.textContent || "0",
    };
  }
}
