import { describe, expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { assertCommentMenuNlFilterContract } from "../scripts/sandbox/analyze-comment-context-menu";

describe("公式コメントメニューnlFilter", () => {
  test("対象CDNとReactメニュー生成点・版付きAPI接続を固定する", async () => {
    const filterSource = await readFile(
      resolve(
        import.meta.dirname,
        "../../../nlFilters/103_official_comment_menu.txt",
      ),
      "utf8",
    );
    expect(filterSource).toContain(
      "FullURL = https?:\\/\\/resource\\.video\\.nimg\\.jp",
    );
    const contract = assertCommentMenuNlFilterContract(filterSource);
    expect(contract.replace).toContain("FilterMatomeCommentMenuApi");
    expect(contract.replace.replace("$1", "")).not.toContain("$");
    expect(contract.replace).not.toContain("querySelector");
    expect(contract.replace).not.toContain("MutationObserver");
  });
});
