import {
  filterJsonThread,
  prepareJsonRules,
} from "../src/comment-filter2/filter/json-comment-filter-engine";
import type {
  CF2Comment,
  CF2Thread,
  NgRuleJson,
} from "../src/types/filter-types";

const COMMENT_COUNT = 2_000;
const RULE_COUNT = 1_000;
const WARMUP_ROUNDS = 1;
const MEASURED_ROUNDS = 5;

function createComment(index: number): CF2Comment {
  return {
    id: String(index),
    no: index,
    vposMs: index * 10,
    body: `通常コメント ${index} テスト本文です`,
    commands: ["184", "medium", "white"],
    userId: `comment-user-${index % 100}`,
    isPremium: false,
    score: 0,
    postedAt: "2026-01-01T00:00:00.000Z",
    nicoruCount: index % 10,
    nicoruId: null,
    source: "main",
    isMyPost: false,
  };
}

function createRules(): NgRuleJson[] {
  const rules: NgRuleJson[] = [];

  for (let index = 0; index < 20; index += 1) {
    rules.push({
      pattern: `保護語${index}.*末尾`,
      flags: "gi",
      action: { type: "unspecified" },
      smid: ["ALL"],
      nicoru_cond: { op: ">=", value: 100, mode: "exclude" },
      description: `一致しないニコる免除 ${index}`,
    });
  }

  for (let index = 0; index < 700; index += 1) {
    rules.push({
      pattern: `未出現語${index}.*末尾`,
      flags: "gi",
      action: { type: "hide" },
      smid: ["ALL"],
      description: `一致しない正規表現 ${index}`,
    });
  }

  for (let index = 0; index < 250; index += 1) {
    rules.push({
      pattern: `literal-never-${index}`,
      flags: "gi",
      action: { type: "hide" },
      smid: ["ALL"],
      description: `一致しないリテラル ${index}`,
    });
  }

  for (let index = 0; index < 30; index += 1) {
    rules.push({
      userId: `blocked-user-${index}`,
      action: { type: "hide" },
      smid: ["ALL"],
      description: `一致しないユーザーID ${index}`,
    });
  }

  if (rules.length !== RULE_COUNT) {
    throw new Error(`Unexpected rule count: ${rules.length}`);
  }

  return rules;
}

const thread: CF2Thread = {
  id: "benchmark-thread",
  fork: "main",
  commentCount: COMMENT_COUNT,
  comments: Array.from({ length: COMMENT_COUNT }, (_, index) =>
    createComment(index),
  ),
};
const regexCache = new Map<string, RegExp>();
const preparedRules = prepareJsonRules(createRules(), "sm9", regexCache);

function runRound(): number {
  const startedAt = performance.now();
  const result = filterJsonThread({
    thread,
    preparedRules,
    settings: null,
    regexCache,
  });

  if (result.comments.length !== COMMENT_COUNT) {
    throw new Error(`Unexpected comment count: ${result.comments.length}`);
  }

  return performance.now() - startedAt;
}

for (let round = 0; round < WARMUP_ROUNDS; round += 1) {
  runRound();
}

const durations = Array.from({ length: MEASURED_ROUNDS }, runRound);
const average =
  durations.reduce((total, duration) => total + duration, 0) / durations.length;
const sortedDurations = durations.toSorted((left, right) => left - right);
const median = sortedDurations[Math.floor(sortedDurations.length / 2)];

console.log(
  JSON.stringify(
    {
      comments: COMMENT_COUNT,
      rules: RULE_COUNT,
      measuredRounds: MEASURED_ROUNDS,
      averageMs: Number(average.toFixed(2)),
      medianMs: Number(median.toFixed(2)),
      roundsMs: durations.map((duration) => Number(duration.toFixed(2))),
    },
    null,
    2,
  ),
);
