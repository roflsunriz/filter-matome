import { describe, expect, test } from "bun:test";

import {
  filterThread,
  prepareRules,
} from "../src/comment-filter2/filter/comment-filter-engine";
import { buildFilteredCommentResponse } from "../src/comment-filter2/filter/comment-response";
import {
  filterJsonThread,
  prepareJsonRules,
} from "../src/comment-filter2/filter/json-comment-filter-engine";
import type {
  CF2Comment,
  CF2CommentApiResponse,
  CF2Thread,
  NgRuleJson,
  NGWordRule,
} from "../src/types/filter-types";

function createComment(id: string, body: string): CF2Comment {
  return {
    id,
    no: Number(id),
    vposMs: Number(id) * 100,
    body,
    commands: [],
    userId: `user-${id}`,
    isPremium: false,
    score: 0,
    postedAt: "2026-08-23T00:00:00Z",
    nicoruCount: 0,
    nicoruId: null,
    source: "main",
    isMyPost: false,
  };
}

function createThread(
  id: string,
  fork: CF2Thread["fork"],
  commentCount: number,
  comments: CF2Comment[],
): CF2Thread {
  return { id, fork, commentCount, comments };
}

describe("comment-filter2 hidden entry removal", () => {
  test("JSON hide action removes the matched comment entry", () => {
    const thread = createThread("thread-json", "main", 100, [
      createComment("1", "blocked"),
      createComment("2", "visible"),
    ]);
    const rules: NgRuleJson[] = [
      {
        pattern: "blocked",
        flags: "g",
        action: { type: "hide" },
        smid: ["ALL"],
        enabled: true,
      },
    ];

    const result = filterJsonThread({
      thread,
      preparedRules: prepareJsonRules(rules, "sm9", new Map()),
      settings: null,
      regexCache: new Map(),
    });

    expect(result.comments.map((comment) => comment.id)).toEqual(["2"]);
    expect(result.logs).toHaveLength(1);
    expect(result.logs[0].hidden).toBe(true);
  });

  test("legacy empty replacement removes the matched comment entry", () => {
    const thread = createThread("thread-legacy", "main", 100, [
      createComment("1", "blocked"),
      createComment("2", "visible"),
    ]);
    const rules: NGWordRule[] = [
      {
        regex: "blocked",
        regexFlags: "g",
        replace: "EMPTY",
        smid: "ALL",
        nicoru: "EMPTY",
      },
    ];

    const result = filterThread({
      thread,
      preparedRules: prepareRules(rules, "sm9", new Map()),
      settings: null,
      regexCache: new Map(),
    });

    expect(result.comments.map((comment) => comment.id)).toEqual(["2"]);
    expect(result.logs).toHaveLength(1);
    expect(result.logs[0].hidden).toBe(true);
  });

  test("thread and global totals decrease only by removed response entries", () => {
    const mainComments = [
      createComment("1", "blocked"),
      createComment("2", "visible"),
      createComment("3", "blocked"),
    ];
    const easyComments = [
      createComment("4", "blocked"),
      createComment("5", "visible"),
    ];
    const ownerComments = [createComment("6", "owner")];
    const originalResponse: CF2CommentApiResponse = {
      meta: { status: 200 },
      data: {
        globalComments: [
          { id: "shared-thread", count: 150 },
          { id: "owner-thread", count: 7 },
        ],
        threads: [
          createThread("shared-thread", "main", 100, mainComments),
          createThread("shared-thread", "easy", 50, easyComments),
          createThread("owner-thread", "owner", 7, ownerComments),
        ],
      },
    };
    const filteredThreads: CF2Thread[] = [
      createThread("shared-thread", "main", 100, [mainComments[1]]),
      createThread("shared-thread", "easy", 50, [easyComments[1]]),
      createThread("owner-thread", "owner", 7, ownerComments),
    ];

    const result = buildFilteredCommentResponse(
      originalResponse,
      filteredThreads,
    );

    expect(result.data.threads.map((thread) => thread.commentCount)).toEqual([
      98, 49, 7,
    ]);
    expect(result.data.globalComments).toEqual([
      { id: "shared-thread", count: 147 },
      { id: "owner-thread", count: 7 },
    ]);
    expect(originalResponse.data.threads[0].commentCount).toBe(100);
    expect(originalResponse.data.globalComments?.[0].count).toBe(150);
  });
});
