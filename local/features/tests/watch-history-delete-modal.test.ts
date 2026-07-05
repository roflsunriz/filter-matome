import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const projectRoot = join(import.meta.dir, "..");
const appSource = readFileSync(
  join(projectRoot, "src", "watch-history", "app.ts"),
  "utf8",
);
const indexSource = readFileSync(
  join(projectRoot, "src", "watch-history", "index.html"),
  "utf8",
);

describe("watch-history delete modal", () => {
  test("moves history deletion controls into a dedicated modal", () => {
    expect(indexSource).toContain('id="open-history-delete-modal-btn"');
    expect(indexSource).toContain('id="history-delete-modal"');
    expect(indexSource).toContain("ドライランコンソール");
    expect(indexSource).toContain('id="delete-metadata-select"');
    expect(indexSource).toContain('id="delete-operator-select"');
    expect(indexSource).toContain('value="gte"');
    expect(indexSource).toContain('value="lte"');
    expect(indexSource).toContain('value="lt"');
    expect(indexSource).toContain('value="gt"');
    expect(indexSource).toContain('value="range"');
    expect(indexSource).not.toContain('id="delete-use-watch-count"');
    expect(indexSource).not.toContain('id="delete-use-progress-rate"');
  });

  test("dry run uses the same condition path as deletion", () => {
    expect(appSource).toContain("readDeleteCondition");
    expect(appSource).toContain("getDeleteDryRunEntries");
    expect(appSource).toContain("matchesDeleteCondition");
    expect(appSource).toContain("updateDeleteDryRun");
    expect(appSource).toContain("deleteHistoryEntriesByCondition(condition)");
  });

  test("history deletion uses a detailed custom final confirmation", () => {
    expect(appSource).toContain("showHistoryDeleteConfirmDialog");
    expect(appSource).toContain("createHistoryDeleteConfirmRow");
    expect(appSource).toContain("history-delete-confirm-list");
    expect(appSource).toContain("動画ID:");
    expect(appSource).toContain("投稿者:");
    expect(appSource).toContain("視聴日時:");
    expect(appSource).toContain("投稿日時:");
    expect(appSource).toContain("視聴回数:");
    expect(appSource).toContain("進捗率:");
    expect(appSource).not.toContain(
      "「${entry.title}」の視聴履歴を削除しますか？",
    );
    expect(appSource).not.toContain(
      "全ての視聴履歴（${totalCount}件）を削除しますか？",
    );
  });
});
