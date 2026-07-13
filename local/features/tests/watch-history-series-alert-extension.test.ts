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

describe("series alert extension migration merge", () => {
  test("extensionの正本より移行データが新しければ採用する", () => {
    const local = createAlert("alert-1", 100, "sm1");
    const extension = createAlert("alert-1", 200, "sm2");

    expect(mergeSeriesAlertStates([local], [extension])).toEqual([extension]);
  });

  test("extensionの正本が新しければ古い移行データで戻さない", () => {
    const local = createAlert("alert-1", 300, "sm3");
    const extension = createAlert("alert-1", 200, "sm2");

    expect(mergeSeriesAlertStates([local], [extension])).toEqual([local]);
  });

  test("正本と移行データの片側だけにあるアラートも保持する", () => {
    const local = createAlert("alert-2", 100, "sm2");
    const extension = createAlert("alert-1", 100, "sm1");

    expect(
      mergeSeriesAlertStates([local], [extension]).map((alert) => alert.id),
    ).toEqual(["alert-1", "alert-2"]);
  });
});
