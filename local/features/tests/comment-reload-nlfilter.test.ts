import { describe, expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { assertNlFilterContract } from "../scripts/sandbox/analyze-comment-reload-api";

describe("公式コメント再取得nlFilter", () => {
  test("対象CDNと再取得actionのMatch・API注入を固定する", async () => {
    const filterSource = await readFile(
      resolve(
        import.meta.dirname,
        "../../../nlFilters/102_comment_reload_api.txt",
      ),
      "utf8",
    );

    expect(filterSource).toContain(
      "FullURL = https?:\\/\\/resource\\.video\\.nimg\\.jp",
    );
    expect(() => assertNlFilterContract(filterSource)).not.toThrow();
  });
});
