import { describe, expect, test } from "bun:test";
import {
  createDeleteCondition,
  describeDeleteCondition,
  findDeleteTargets,
  formatDeleteMetric,
  getDeleteMetric,
  matchesDeleteCondition,
  type DeleteMetadataKey,
  type DeleteOperator,
} from "@/watch-history/history-delete-rules";
import type { WatchHistoryEntry } from "@/types/watch-history-types";

const base: WatchHistoryEntry = {
  videoId: "sm1",
  title: "video",
  ownerId: "o",
  ownerName: "owner",
  lengthSec: 100,
  watchedAt: 1,
  firstWatchedAt: 1,
  lastPosition: 25,
  completed: false,
  watchCount: 2,
  watchLogs: [],
  stats: { viewCount: 10, commentCount: 20, mylistCount: 30, likeCount: 40 },
  tags: [],
  thumbnailUrl: "",
  memo: "",
  series: null,
};

describe("watch-history delete rules", () => {
  test("all metadata keys expose the intended numeric value", () => {
    const expected: Record<DeleteMetadataKey, number> = {
      watchCount: 2,
      progressRate: 25,
      lastPosition: 25,
      lengthSec: 100,
      viewCount: 10,
      commentCount: 20,
      mylistCount: 30,
      likeCount: 40,
    };
    for (const [key, value] of Object.entries(expected)) {
      expect(getDeleteMetric(base, key as DeleteMetadataKey)).toBe(value);
    }
    expect(getDeleteMetric({ ...base, stats: null }, "viewCount")).toBeNull();
    expect(getDeleteMetric({ ...base, lengthSec: 0 }, "progressRate")).toBe(0);
  });

  test("all comparison operators include and exclude boundaries correctly", () => {
    const cases: Array<[DeleteOperator, number, number | undefined, boolean]> =
      [
        ["gte", 2, undefined, true],
        ["lte", 2, undefined, true],
        ["lt", 2, undefined, false],
        ["gt", 2, undefined, false],
        ["range", 1, 2, true],
      ];
    for (const [operator, value, maxValue, result] of cases) {
      expect(
        matchesDeleteCondition(base, {
          metadata: "watchCount",
          operator,
          value,
          maxValue,
        }),
      ).toBe(result);
    }
  });

  test("range input is normalized and invalid input is rejected", () => {
    expect(createDeleteCondition("watchCount", "range", "5", "2")).toEqual({
      metadata: "watchCount",
      operator: "range",
      value: 2,
      maxValue: 5,
    });
    expect(createDeleteCondition("watchCount", "gte", "")).toBeNull();
    expect(createDeleteCondition("watchCount", "range", "1", "")).toBeNull();
    expect(createDeleteCondition(undefined, "gte", "1")).toBeNull();
  });

  test("target selection and user-facing descriptions share the same condition", () => {
    const condition = createDeleteCondition(
      "progressRate",
      "range",
      "20",
      "30",
    );
    expect(condition).not.toBeNull();
    if (!condition) return;
    expect(
      findDeleteTargets(
        [base, { ...base, videoId: "sm2", lastPosition: 90 }],
        condition,
      ).map((item) => item.videoId),
    ).toEqual(["sm1"]);
    expect(describeDeleteCondition(condition)).toBe(
      "進捗率 が 20 〜 30 の範囲",
    );
    expect(formatDeleteMetric(condition, 25)).toBe("進捗率=25%");
  });
});
