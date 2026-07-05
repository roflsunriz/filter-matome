import { describe, expect, test } from "bun:test";

import {
  filterJsonThread,
  prepareJsonRules,
} from "../src/comment-filter2/filter/json-comment-filter-engine";
import type {
  CF2Comment,
  CF2Thread,
  NgRuleJson,
} from "../src/types/filter-types";

function createComment(
  id: string,
  body: string,
  nicoruCount: number,
): CF2Comment {
  return {
    id,
    no: Number(id),
    vposMs: 0,
    body,
    commands: [],
    userId: `user-${id}`,
    isPremium: false,
    score: 0,
    postedAt: "2026-01-01T00:00:00.000Z",
    nicoruCount,
    nicoruId: null,
    source: "main",
    isMyPost: false,
  };
}

describe("comment-filter2 nicoru exclusion", () => {
  test("exclusion rule exempts matching comments from later hide rules", () => {
    const rules: NgRuleJson[] = [
      {
        pattern: ".*?",
        flags: "gi",
        action: { type: "unspecified" },
        smid: ["ALL"],
        nicoru_cond: { op: ">=", value: 3, mode: "exclude" },
        description: "ニコる3以上はフィルタ免除",
      },
      {
        pattern: ".*?",
        flags: "gi",
        action: { type: "hide" },
        smid: ["ALL"],
        description: "全コメント非表示",
      },
    ];
    const thread: CF2Thread = {
      id: "thread-1",
      fork: "main",
      commentCount: 2,
      comments: [
        createComment("1", "protected", 3),
        createComment("2", "hidden", 0),
      ],
    };

    const result = filterJsonThread({
      thread,
      preparedRules: prepareJsonRules(rules, "sm9", new Map()),
      settings: null,
      regexCache: new Map(),
    });

    expect(result.comments).toHaveLength(2);
    expect(result.comments[0].body).toBe("protected");
    expect(result.comments[0].commands).not.toContain("invisible");
    expect(result.comments[1].body).toBe("");
    expect(result.comments[1].commands).toContain("invisible");
  });
});
