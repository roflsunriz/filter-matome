import { describe, expect, test } from "bun:test";
import {
  extractRequiredLiteralTokens,
  selectRequiredTokens,
} from "../src/comment-filter2/filter/required-token-extractor";
import {
  filterJsonThread,
  prepareJsonRules,
  type PreparedJsonRuleSet,
} from "../src/comment-filter2/filter/json-comment-filter-engine";
import type {
  CF2Comment,
  CF2Thread,
  NgRuleJson,
} from "../src/types/filter-types";

const comment = (body: string, index: number): CF2Comment => ({
  id: `comment-${String(index)}`,
  no: index,
  vposMs: index * 100,
  body,
  commands: [],
  userId: `user-${String(index)}`,
  isPremium: false,
  score: 0,
  postedAt: "2026-07-19T00:00:00Z",
  nicoruCount: 0,
  nicoruId: null,
  source: "nicovideo",
  isMyPost: false,
});

const thread = (bodies: string[]): CF2Thread => ({
  id: "thread-1",
  fork: "main",
  commentCount: bodies.length,
  comments: bodies.map(comment),
});

const hideRule = (pattern: string, flags = "g"): NgRuleJson => ({
  pattern,
  flags,
  action: { type: "hide" },
  smid: ["ALL"],
  enabled: true,
});

function filterBodies(
  rules: NgRuleJson[],
  bodies: string[],
  disableCandidateIndex = false,
): Array<{ body: string; commands: string[] }> {
  const regexCache = new Map<string, RegExp>();
  const prepared = prepareJsonRules(rules, "sm1", regexCache);
  if (disableCandidateIndex) {
    disableCandidates(prepared);
  }
  return filterJsonThread({
    thread: thread(bodies),
    preparedRules: prepared,
    settings: null,
    regexCache,
    collectLogs: false,
  }).comments.map(({ body, commands }) => ({ body, commands }));
}

function disableCandidates(prepared: PreparedJsonRuleSet): void {
  prepared.substringMatcher = null;
  prepared.needsLowercase = false;
  for (const rule of prepared.rules) {
    rule.hasCandidatePrefilter = false;
    rule.literalMatchIsFinal = false;
  }
}

describe("安全な必須トークン抽出", () => {
  test.each([
    ["荒らし.*", "g", ["荒らし"]],
    ["NGワード\\s*[0-9]+", "g", ["NGワード"]],
    ["foo.*bar", "g", ["bar", "foo"]],
    ["(?:foo|bar)baz", "g", ["baz"]],
    ["(?:foo)?bar", "g", ["bar"]],
    ["foo(?:bar|baz)", "g", ["foo"]],
    ["foo\\.bar", "g", ["foo.bar"]],
    ["(?:foo){1,2}", "g", ["foo"]],
    ["(?=look)look", "g", ["look"]],
    ["(?:foo|bar)", "g", []],
    ["(?:foo|bar)?", "g", []],
    ["[Ff]oo", "g", ["oo"]],
  ])("%s /%s から安全な候補だけを返す", (pattern, flags, expected) => {
    expect(extractRequiredLiteralTokens(pattern, flags)).toEqual(expected);
  });

  test("Unicode ignoreCase では case-folding が不変な部分だけを使う", () => {
    expect(extractRequiredLiteralTokens("s.*終端", "iu")).toEqual(["終端"]);
    expect(extractRequiredLiteralTokens("Ärger.*ENDE", "i")).toEqual([
      "ende",
      "rger",
    ]);
    expect(extractRequiredLiteralTokens("ASCII", "iu")).toEqual([]);
  });

  test("ルール集合で最もレアな候補を優先する", () => {
    expect(
      selectRequiredTokens([
        {
          ruleIndex: 0,
          tokens: ["common", "rare-a"],
          caseSensitive: true,
        },
        {
          ruleIndex: 1,
          tokens: ["common", "rare-b"],
          caseSensitive: true,
        },
      ]),
    ).toEqual(
      new Map([
        [0, "rare-a"],
        [1, "rare-b"],
      ]),
    );
  });
});

describe("必須トークン候補索引", () => {
  test("候補がないコメントでは複雑な RegExp.test を呼ばない", () => {
    class CountingRegExp extends RegExp {
      calls = 0;

      override test(value: string): boolean {
        this.calls++;
        return super.test(value);
      }
    }

    const rules = [hideRule("needle.*suffix")];
    const regexCache = new Map<string, RegExp>();
    const prepared = prepareJsonRules(rules, "sm1", regexCache);
    const countingRegex = new CountingRegExp("needle.*suffix", "g");
    prepared.rules[0].compiledRegex = countingRegex;

    filterJsonThread({
      thread: thread(["無関係なコメント", "needle---suffix"]),
      preparedRules: prepared,
      settings: null,
      regexCache,
      collectLogs: false,
    });

    expect(prepared.rules[0].requiredToken).toBe("needle");
    expect(countingRegex.calls).toBe(1);
  });

  test("最適化ありと候補索引無効の結果が動的な置換順序を含めて一致する", () => {
    const rules: NgRuleJson[] = [
      {
        pattern: "start.*middle",
        flags: "g",
        action: { type: "replace", replacement: "changed-end" },
        smid: ["ALL"],
        enabled: true,
      },
      hideRule("changed(?:-end)+"),
      hideRule("(?:foo|bar)baz"),
      hideRule("(?:one|two)"),
      hideRule("s.*終端", "iu"),
      hideRule("SPAM.*END", "gi"),
    ];
    const bodies = [
      "start---middle",
      "foobaz",
      "barbaz",
      "one",
      "ſ---終端",
      "spam---end",
      "どのルールにも一致しない",
    ];

    expect(filterBodies(rules, bodies)).toEqual(
      filterBodies(rules, bodies, true),
    );
  });

  test("分岐・参照・先読み後読み・量指定子の境界でも総当たり結果と一致する", () => {
    const cases: Array<{
      pattern: string;
      flags: string;
      bodies: string[];
    }> = [
      {
        pattern: "(?:foo(?:bar|baz)|qux)end",
        flags: "g",
        bodies: ["foobarend", "foobazend", "quxend", "fooend"],
      },
      {
        pattern: "^prefix.*suffix$",
        flags: "gm",
        bodies: ["prefix---suffix", "前置\nprefix suffix\n後置", "prefix"],
      },
      {
        pattern: "(?<=head)body.*tail",
        flags: "g",
        bodies: ["headbody---tail", "body---tail", "headbody"],
      },
      {
        pattern: "(word)-\\1.*done",
        flags: "g",
        bodies: ["word-word---done", "word-other---done", "done"],
      },
      {
        pattern: "(?:start)?middle(?:end)?",
        flags: "gi",
        bodies: ["middle", "STARTmiddleEND", "start-end"],
      },
      {
        pattern: "(?:ab){2,4}.*終",
        flags: "g",
        bodies: ["abab---終", "ab---終", "abababab---終"],
      },
      {
        pattern: "[A-Z]+literal\\d+",
        flags: "g",
        bodies: ["ABCliteral12", "literal12", "ABC-literal12"],
      },
      {
        pattern: "foo(?!bar).*baz",
        flags: "g",
        bodies: ["foo---baz", "foobar---baz", "foo"],
      },
      {
        pattern: "(?:日本|英語).*共通",
        flags: "g",
        bodies: ["日本語は共通", "英語も共通", "仏語も共通"],
      },
      {
        pattern: "\\p{Script=Hiragana}+終端",
        flags: "gu",
        bodies: ["ひらがな終端", "カタカナ終端", "終端"],
      },
      {
        pattern: "\\u{1F600}.*末尾",
        flags: "gu",
        bodies: ["😀---末尾", "😃---末尾", "末尾"],
      },
      {
        pattern: "foo.*bar",
        flags: "y",
        bodies: ["foo---bar", "前置foo---bar", "foo"],
      },
    ];

    for (const { pattern, flags, bodies } of cases) {
      const rules = [hideRule(pattern, flags)];
      expect(filterBodies(rules, bodies)).toEqual(
        filterBodies(rules, bodies, true),
      );
    }
  });

  test("Unicode ignoreCase の純粋リテラルを誤って候補除外しない", () => {
    expect(new RegExp("s", "iu").test("ſ")).toBeTrue();
    expect(filterBodies([hideRule("s", "iu")], ["ſ"])).toEqual([
      { body: "", commands: ["invisible"] },
    ]);
  });
});
