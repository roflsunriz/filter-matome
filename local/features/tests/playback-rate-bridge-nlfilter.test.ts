import { describe, expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { format } from "prettier";
import {
  applyPlaybackRateNlFilter,
  assertPlaybackRateNlFilterContract,
} from "../scripts/sandbox/analyze-playback-rate-bridge";

describe("公式再生速度同期nlFilter", () => {
  test("全面置換を使わず公式media controller境界へ版付きAPIを1回だけ注入する", async () => {
    const [filterSource, investigation] = await Promise.all([
      readFile(
        resolve(
          import.meta.dirname,
          "../../../nlFilters/101_disable_official_function.txt",
        ),
        "utf8",
      ),
      readFile(
        resolve(import.meta.dirname, "../src/sandbox/playback-rate-bridge.md"),
        "utf8",
      ),
    ]);
    const contract = assertPlaybackRateNlFilterContract(filterSource);
    const fixture =
      "class C{constructor(){this.media={getPlaybackRate:()=>1,setPlaybackRate:e=>e},this.getPlaybackRate=()=>this.media.getPlaybackRate(),this.ready=!0}}";
    const transformed = applyPlaybackRateNlFilter(fixture, contract);
    const deminified = await format(transformed, { parser: "babel" });

    expect(filterSource).not.toMatch(/Match<\r?\nplaybackRate\r?\n>/u);
    expect(filterSource).not.toContain("_x_");
    expect(deminified).toContain("FilterMatomePlaybackRateApi");
    expect(deminified).toContain("this.media.setPlaybackRate(e)");
    expect(investigation).toContain(contract.match);
    expect(investigation).toContain(
      "031e174456308e80863ad1f9fd8dd61d45706c1a2f6aa75562e0185c9651f646",
    );
    expect(investigation).toContain(
      "f4b828e1c7379eee61f08bd98011d1be1ff512b6f3dbb6e3600521396a742b30",
    );
    expect(investigation).toContain(
      "2c232bec978e5bdb9a0bbea6fde081317dbb3176319be43ed89a2b8acb4d6a62",
    );
  });

  test("対象境界が0件または複数なら置換しない", () => {
    const contract = {
      match:
        "this\\.getPlaybackRate=\\(\\)=>this\\.media\\.getPlaybackRate\\(\\)",
      replace: "bridge",
    };
    expect(() => applyPlaybackRateNlFilter("const value=1", contract)).toThrow(
      "検出: 0回",
    );
    const anchor = "this.getPlaybackRate=()=>this.media.getPlaybackRate()";
    expect(() =>
      applyPlaybackRateNlFilter(`${anchor};${anchor}`, contract),
    ).toThrow("検出: 2回");
  });
});
