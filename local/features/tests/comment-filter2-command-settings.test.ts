import { describe, expect, test } from "bun:test";

import {
  filterThread,
  prepareRules,
} from "../src/comment-filter2/filter/comment-filter-engine";
import {
  filterJsonThread,
  prepareJsonRules,
} from "../src/comment-filter2/filter/json-comment-filter-engine";
import type {
  CF2Comment,
  CF2Thread,
  Settings,
} from "../src/types/filter-types";

const originalCommands = ["small", "red", "ue", "184", "full"];

function createThread(): CF2Thread {
  const comment: CF2Comment = {
    id: "command-comment",
    no: 1,
    vposMs: 0,
    body: "コマンド適用テスト",
    commands: [...originalCommands],
    userId: "command-user",
    isPremium: false,
    score: 0,
    postedAt: "2026-07-19T00:00:00Z",
    nicoruCount: 0,
    nicoruId: null,
    source: "nicovideo",
    isMyPost: false,
  };
  return {
    id: "command-thread",
    fork: "main",
    commentCount: 1,
    comments: [comment],
  };
}

function createSettings(
  clearExistingCommands: boolean,
  mainCommands: string[] = ["big", "blue"],
): Settings {
  return {
    debugMode: false,
    isEnabled: true,
    clearExistingCommands,
    commandSettings: {
      owner: [],
      main: mainCommands,
      easy: [],
      normal: [],
    },
  };
}

function filterWithJsonEngine(
  clearExistingCommands: boolean,
  mainCommands?: string[],
): string[] {
  const regexCache = new Map<string, RegExp>();
  return filterJsonThread({
    thread: createThread(),
    preparedRules: prepareJsonRules([], "sm1", regexCache),
    settings: createSettings(clearExistingCommands, mainCommands),
    regexCache,
    collectLogs: false,
  }).comments[0].commands;
}

function filterWithCompatibilityEngine(
  clearExistingCommands: boolean,
  mainCommands?: string[],
): string[] {
  const regexCache = new Map<string, RegExp>();
  return filterThread({
    thread: createThread(),
    preparedRules: prepareRules([], "sm1", regexCache),
    settings: createSettings(clearExistingCommands, mainCommands),
    regexCache,
  }).comments[0].commands;
}

describe("comment-filter2 command replacement mode", () => {
  test.each([
    ["JSON", filterWithJsonEngine],
    ["互換", filterWithCompatibilityEngine],
  ] as const)(
    "%sエンジンはオフ時に同カテゴリーだけを上書きする",
    (_name, filter) => {
      expect(filter(false)).toEqual(["ue", "184", "full", "big", "blue"]);
    },
  );

  test.each([
    ["JSON", filterWithJsonEngine],
    ["互換", filterWithCompatibilityEngine],
  ] as const)(
    "%sエンジンはオン時に既存コマンドを全除去してから上書きする",
    (_name, filter) => {
      expect(filter(true)).toEqual(["big", "blue"]);
    },
  );

  test.each([
    ["JSON", filterWithJsonEngine],
    ["互換", filterWithCompatibilityEngine],
  ] as const)(
    "%sエンジンは設定コマンドが空でも選択した方式を維持する",
    (_name, filter) => {
      expect(filter(false, [])).toEqual(originalCommands);
      expect(filter(true, [])).toEqual([]);
    },
  );
});
