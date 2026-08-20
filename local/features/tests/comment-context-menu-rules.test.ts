import { describe, expect, test } from "bun:test";
import {
  createContextMenuNgUserRule,
  createContextMenuNgWordRule,
  escapeRegExpLiteral,
  upsertContextMenuRule,
} from "@/comment-filter2/integrations/context-menu-rules";
import type { NgRuleJson } from "@/types/filter-types";

describe("公式コメントメニューのNGルール", () => {
  test("コメント本文をリテラル一致する全動画NGワードへ変換する", () => {
    expect(escapeRegExpLiteral("a.b[c](d)+$?")).toBe(
      "a\\.b\\[c\\]\\(d\\)\\+\\$\\?",
    );
    expect(createContextMenuNgWordRule("  a.b[c]  ")).toEqual({
      pattern: "a\\.b\\[c\\]",
      flags: "gi",
      action: { type: "hide" },
      smid: ["ALL"],
      description: "公式プレイヤーのコメントメニューから追加",
      enabled: true,
    });
    expect(createContextMenuNgWordRule("   ")).toBeNull();
  });

  test("ユーザーIDを全動画NGユーザールールへ変換する", () => {
    expect(createContextMenuNgUserRule(" nvc:UserId ")).toEqual({
      userId: "nvc:UserId",
      action: { type: "hide" },
      smid: ["ALL"],
      description: "公式プレイヤーのコメントメニューから追加",
      enabled: true,
    });
    expect(createContextMenuNgUserRule("\t")).toBeNull();
  });

  test("同じ有効ルールを重複追加せず、無効ルールは再有効化する", () => {
    const rule = createContextMenuNgWordRule("荒らし");
    if (!rule) throw new Error("fixture rule was not created");
    const existing: NgRuleJson = { ...rule, id: "existing" };
    const duplicate = upsertContextMenuRule([existing], rule);
    expect(duplicate.status).toBe("already-exists");
    expect(duplicate.rules).toEqual([existing]);

    const reactivated = upsertContextMenuRule(
      [{ ...existing, enabled: false }],
      rule,
    );
    expect(reactivated.status).toBe("reactivated");
    expect(reactivated.rules[0]).toMatchObject({
      id: "existing",
      enabled: true,
    });
  });

  test("同じ本文でも動画限定や置換ルールとは別の全動画NGとして追加する", () => {
    const rule = createContextMenuNgWordRule("ネタバレ");
    if (!rule) throw new Error("fixture rule was not created");
    const current: NgRuleJson[] = [
      { ...rule, smid: ["sm9"] },
      { ...rule, action: { type: "replace", replacement: "伏せ字" } },
    ];
    const result = upsertContextMenuRule(current, rule);
    expect(result.status).toBe("added");
    expect(result.rules).toHaveLength(3);
  });
});
