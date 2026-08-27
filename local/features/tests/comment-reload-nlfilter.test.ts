import { describe, expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { format } from "prettier";
import {
  applyCommentReloadNlFilter,
  assertNlFilterContract,
} from "../scripts/sandbox/analyze-comment-reload-api";

describe("公式コメント再取得nlFilter", () => {
  test("対象CDNと再取得actionのMatch・API注入を固定する", async () => {
    const [filterSource, matchHistory] = await Promise.all([
      readFile(
        resolve(
          import.meta.dirname,
          "../../../nlFilters/102_comment_reload_api.txt",
        ),
        "utf8",
      ),
      readFile(
        resolve(
          import.meta.dirname,
          "../src/sandbox/comment-reload-match-history.md",
        ),
        "utf8",
      ),
    ]);

    expect(filterSource).toContain(
      "FullURL = https?:\\/\\/resource\\.video\\.nimg\\.jp",
    );
    const contract = assertNlFilterContract(filterSource);
    expect(matchHistory).toContain(contract.match);
    expect(matchHistory).toContain("### 2026-07-23: 初回解析");
    expect(matchHistory).toContain(
      "### 2026-08-20: 更新後の公式原本と動的検証",
    );
    expect(matchHistory).toContain("公式原本captureを3版以上記録する");
  });

  test("minify識別子が変わっても同じstoreとコメント入力の関係へ注入する", async () => {
    const filterSource = await readFile(
      resolve(
        import.meta.dirname,
        "../../../nlFilters/102_comment_reload_api.txt",
      ),
      "utf8",
    );
    const contract = assertNlFilterContract(filterSource);
    const fixtures = [
      "var Ar=function(){var e=Hn(function*(e,t={}){Le(e,[`initialized`,`fetched`]);let n=e.current(),r=yield lr(n.watch.comment.nvComment.server,n.watch.video.id,n.watch.comment.nvComment.params,t).catch(Cr());return r});return function(t){return e.apply(this,arguments)}}()",
      "var Xi=function(){var e=ci(function*(e,t={}){rn(e,[`initialized`,`fetched`]);let n=e.current(),r=yield ki(n.watch.comment.nvComment.server,n.watch.video.id,n.watch.comment.nvComment.params,t).catch(Ui());return r});return function(t){return e.apply(this,arguments)}}()",
    ];

    for (const fixture of fixtures) {
      const transformed = applyCommentReloadNlFilter(fixture, contract);
      const deminified = await format(transformed, { parser: "babel" });
      expect(deminified).toContain("FilterMatomeCommentApi");
      expect(deminified).toContain("filter-matome:api-status-change");
      expect(deminified).toContain("e.current().fetchAdditionals");
    }
  });

  test("意味境界が0件または複数なら置換しない", async () => {
    const contract = assertNlFilterContract(
      await readFile(
        resolve(
          import.meta.dirname,
          "../../../nlFilters/102_comment_reload_api.txt",
        ),
        "utf8",
      ),
    );
    const anchor =
      "var Xi=function(){var e=ci(function*(e,t={}){rn(e,[`initialized`,`fetched`]);let n=e.current(),r=yield ki(n.watch.comment.nvComment.server,n.watch.video.id,n.watch.comment.nvComment.params,t)";
    expect(() => applyCommentReloadNlFilter("const value=1", contract)).toThrow(
      "検出: 0回",
    );
    expect(() =>
      applyCommentReloadNlFilter(`${anchor};${anchor}`, contract),
    ).toThrow("検出: 2回");
  });
});
