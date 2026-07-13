import { describe, expect, test } from "bun:test";

import type { SeriesAlert } from "../src/types/watch-history-types";
import { mergeSeriesAlertStates } from "../src/watch-history/series-alert-extension-client";

const createAlert = (
  id: string,
  updatedAt: number,
  lastVideoId: string,
): SeriesAlert => ({
  id,
  seriesId: Number(id.replace(/\D/g, "")) || 1,
  seriesTitle: `シリーズ${id}`,
  lastVideoId,
  lastVideoTitle: `動画${lastVideoId}`,
  lastCheckedAt: updatedAt,
  nextCheckAt: updatedAt + 60_000,
  checkInterval: 60_000,
  enabled: true,
  createdAt: 1,
  updatedAt,
});

describe("series alert extension state merge", () => {
  test("extensionの定期確認結果が新しければIndexedDB側を更新する", () => {
    const local = createAlert("alert-1", 100, "sm1");
    const extension = createAlert("alert-1", 200, "sm2");

    expect(mergeSeriesAlertStates([local], [extension])).toEqual([extension]);
  });

  test("IndexedDB側の編集が新しければextensionの古い状態で戻さない", () => {
    const local = createAlert("alert-1", 300, "sm3");
    const extension = createAlert("alert-1", 200, "sm2");

    expect(mergeSeriesAlertStates([local], [extension])).toEqual([local]);
  });

  test("片側だけにあるアラートも失わずに統合する", () => {
    const local = createAlert("alert-2", 100, "sm2");
    const extension = createAlert("alert-1", 100, "sm1");

    expect(
      mergeSeriesAlertStates([local], [extension]).map((alert) => alert.id),
    ).toEqual(["alert-1", "alert-2"]);
  });
});
