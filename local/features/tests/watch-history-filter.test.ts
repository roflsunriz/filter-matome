import { describe, expect, test } from "bun:test";
import {
  calculateFavoriteVideos,
  cleanHistoryFilter,
  filterHistoryEntries,
} from "@/watch-history/history-filter";
import { filterSeriesStats } from "@/watch-history/series-filter";
import type {
  SeriesStats,
  WatchHistoryEntry,
} from "@/types/watch-history-types";

function entry(overrides: Partial<WatchHistoryEntry> = {}): WatchHistoryEntry {
  return {
    videoId: "sm1",
    title: "Alpha Movie",
    ownerId: "owner-1",
    ownerName: "Creator",
    lengthSec: 100,
    watchedAt: 200,
    firstWatchedAt: 100,
    lastPosition: 50,
    completed: false,
    watchCount: 1,
    watchLogs: [],
    stats: { uploadedAt: 150 },
    tags: ["Music"],
    thumbnailUrl: "",
    memo: "Memo text",
    series: null,
    ...overrides,
  };
}

describe("watch-history filter responsibilities", () => {
  test("invalid persisted text and empty ranges are removed", () => {
    expect(
      cleanHistoryFilter({
        searchText: " undefined ",
        ownerId: " null ",
        dateRange: { start: 0, end: 0 },
        uploadedDateRange: { start: 0, end: 0 },
        completedOnly: true,
      }),
    ).toEqual({ completedOnly: true });
  });

  test("search covers title, creator, tags and memo case-insensitively", () => {
    const source = [entry()];
    for (const searchText of ["alpha", "CREATOR", "music", "memo text"]) {
      expect(filterHistoryEntries(source, { searchText })).toHaveLength(1);
    }
    expect(filterHistoryEntries(source, { searchText: "missing" })).toEqual([]);
  });

  test("owner, completion, watch range and upload range compose", () => {
    const source = [
      entry({ completed: true }),
      entry({ videoId: "sm2", ownerId: "owner-2", watchedAt: 500 }),
      entry({ videoId: "sm3", stats: null }),
    ];
    expect(
      filterHistoryEntries(source, {
        ownerId: "owner-1",
        completedOnly: true,
        dateRange: { start: 200, end: 200 },
        uploadedDateRange: { start: 150, end: 150 },
      }).map(({ videoId }) => videoId),
    ).toEqual(["sm1"]);
  });

  test("favorite score uses every session and respects the limit", () => {
    const favorites = calculateFavoriteVideos(
      [
        entry({
          videoId: "sm1",
          watchLogs: [{ date: 1, position: 20, completed: false }],
        }),
        entry({
          videoId: "sm2",
          watchLogs: [{ date: 1, position: 1, completed: true }],
        }),
        entry({ videoId: "sm3", lastPosition: 80 }),
      ],
      2,
    );
    expect(favorites.map(({ entry: item }) => item.videoId)).toEqual([
      "sm2",
      "sm3",
    ]);
    expect(favorites.map(({ score }) => score)).toEqual([1, 0.8]);
  });

  test("series search and every progress state are deterministic", () => {
    const series: SeriesStats[] = [
      {
        seriesId: 1,
        seriesTitle: "Alpha",
        watchedCount: 1,
        totalCount: 2,
        progressRate: 0.5,
        lastWatchedAt: 1,
        lastVideoId: "sm1",
        lastVideoTitle: "one",
      },
      {
        seriesId: 2,
        seriesTitle: "Beta",
        watchedCount: 2,
        totalCount: 2,
        progressRate: 1,
        lastWatchedAt: 1,
        lastVideoId: "sm2",
        lastVideoTitle: "two",
      },
      {
        seriesId: 3,
        seriesTitle: "Gamma",
        watchedCount: 0,
        totalCount: 2,
        progressRate: 0,
        lastWatchedAt: 0,
        lastVideoId: "",
        lastVideoTitle: "",
      },
    ];
    expect(filterSeriesStats(series, { searchText: "ALP" })).toHaveLength(1);
    expect(
      filterSeriesStats(series, { progressFilter: "watching" }).map(
        (item) => item.seriesId,
      ),
    ).toEqual([1]);
    expect(
      filterSeriesStats(series, { progressFilter: "completed" }).map(
        (item) => item.seriesId,
      ),
    ).toEqual([2]);
    expect(
      filterSeriesStats(series, { progressFilter: "not_started" }).map(
        (item) => item.seriesId,
      ),
    ).toEqual([3]);
  });
});
