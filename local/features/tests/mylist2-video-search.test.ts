import { describe, expect, test } from "bun:test";
import {
  matchesKeywordSearch,
  matchesVideoSearch,
} from "@/mylist2/video-search";
import type { DBVideo } from "@/types/video-types";

const video: DBVideo = {
  id: "1_sm100",
  originalId: "sm100",
  mylistId: 1,
  title: "アルファ料理",
  viewCount: 100,
  commentCount: 10,
  mylistCount: 5,
  thumbnailUrl: "",
  uploadedAt: 1000,
  addedAt: 2000,
  authorName: "投稿者A",
  length: 120,
  description: "初心者向けの詳しい説明",
  tags: ["料理", "解説"],
  memo: "週末に見る",
  availabilityStatus: "private",
  availabilityReason: "非公開動画です",
};

describe("mylist2 video search", () => {
  test("searches every stored textual video metadata field", () => {
    for (const searchText of [
      "sm100",
      "アルファ",
      "投稿者a",
      "初心者向け",
      "料理",
      "週末",
      "private",
      "非公開動画",
    ]) {
      expect(matchesVideoSearch(video, searchText)).toBe(true);
    }
  });

  test("combines space-separated terms with AND across metadata fields", () => {
    expect(matchesVideoSearch(video, "アルファ 解説 投稿者A")).toBe(true);
    expect(matchesVideoSearch(video, "アルファ 音楽")).toBe(false);
  });

  test("keeps keyword items searchable", () => {
    const keyword = {
      id: 1,
      mylistId: 1,
      keyword: "料理 初心者",
      addedAt: 1000,
    };
    expect(matchesKeywordSearch(keyword, "料理 初心者")).toBe(true);
    expect(matchesKeywordSearch(keyword, "料理 上級者")).toBe(false);
  });
});
