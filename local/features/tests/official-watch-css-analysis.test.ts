import { describe, expect, test } from "bun:test";

import {
  analyzeOfficialWatchCss,
  applyNlFilterCssWrap,
  assertOfficialWatchCssContract,
  assertWrappedOfficialWatchCssContract,
  parseNlFilterCssWrap,
} from "../scripts/sandbox/analyze-official-watch-css";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

describe("公式Watch CSS契約", () => {
  const layeredCss = [
    "@layer reset{html{box-sizing:border-box}}",
    "@layer base{body{margin:0}}",
    "@layer tokens{:root{--color:#fff}}",
    "@layer recipes{button{color:var(--color)}}",
    "@layer utilities{.d_block\\!{display:block!important}}",
  ].join("");

  test("既定の5layerだけで構成されたroot CSSを受け入れる", () => {
    const analysis = analyzeOfficialWatchCss(layeredCss);
    expect(analysis.layerNames).toEqual([
      "reset",
      "base",
      "tokens",
      "recipes",
      "utilities",
    ]);
    expect(analysis.unlayeredTopLevelBlocks).toEqual([]);
    expect(analysis.importantCount).toBe(1);
    expect(() => assertOfficialWatchCssContract(analysis)).not.toThrow();
  });

  test("既知のSimpleBar末尾ルールだけを許可する", () => {
    const analysis = analyzeOfficialWatchCss(
      `${layeredCss}.simplebar-mask{overflow:hidden}@font-face{font-family:test;src:local(test)}`,
    );
    expect(() => assertOfficialWatchCssContract(analysis)).not.toThrow();
  });

  test("未知のlayer外公式ルールを黙って受け入れない", () => {
    const analysis = analyzeOfficialWatchCss(`${layeredCss}body{color:red}`);
    expect(analysis.unlayeredTopLevelBlocks).toEqual(["body"]);
    expect(() => assertOfficialWatchCssContract(analysis)).toThrow(
      "公式root CSSに未知のlayer外ルールがあります",
    );
  });

  test("nlFilterが公式CSS全体を単一の外側layerへ隔離する", async () => {
    const filter = await readFile(
      resolve(
        import.meta.dirname,
        "../../../nlFilters/104_watch_harajuku_style.txt",
      ),
      "utf8",
    );
    const wrapped = applyNlFilterCssWrap(
      `${layeredCss}.simplebar-mask{overflow:hidden}`,
      parseNlFilterCssWrap(filter),
    );
    const analysis = analyzeOfficialWatchCss(wrapped);
    expect(analysis.layerNames).toEqual(["filter-matome-official"]);
    expect(() => assertWrappedOfficialWatchCssContract(analysis)).not.toThrow();
  });
});
