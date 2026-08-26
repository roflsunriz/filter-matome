import { describe, expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { format } from "prettier";
import {
  applyCommentMenuNlFilter,
  assertCommentMenuNlFilterContract,
} from "../scripts/sandbox/analyze-comment-context-menu";

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
    expect(contract.replace).toContain("FilterMatomeCommentMenuBridgeApi");
    expect(contract.replace.match(/\$\d+/gu)?.sort()).toEqual([
      "$1",
      "$2",
      "$3",
      "$6",
      "$6",
    ]);
    expect(contract.replace).not.toContain("querySelector");
    expect(contract.replace).not.toContain("MutationObserver");
  });

  test("React識別子をcaptureして公式項目と追加項目を共存させる", async () => {
    const contract = assertCommentMenuNlFilterContract(
      await readFile(
        resolve(
          import.meta.dirname,
          "../../../nlFilters/103_official_comment_menu.txt",
        ),
        "utf8",
      ),
    );
    const fixture =
      "const value=(0,q.jsxs)(`div`,{children:[(0,q.jsxs)(f,{css:$.raw(),onPress:s,children:[`再生時間（`,(0,q.jsx)(I,{css:{fontFamily:`metaNumber`},type:`vposMs`,children:t.comment.vposMs}),`）に移動`]}),true]})";
    const transformed = applyCommentMenuNlFilter(fixture, contract);
    const deminified = await format(transformed, { parser: "babel" });

    expect(deminified).toContain("FilterMatomeCommentMenuBridgeApi");
    expect(deminified).toContain("e.getItems(t.comment)");
    expect(deminified).toContain("e.execute(n.id, t.comment)");
    expect(deminified).toContain("再生時間（");
  });
});
