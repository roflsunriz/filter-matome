import { describe, expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { assertNlFilterContract } from "../scripts/sandbox/analyze-comment-reload-api";

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
});
