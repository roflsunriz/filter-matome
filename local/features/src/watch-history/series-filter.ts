import type {
  SeriesFilterCondition,
  SeriesStats,
} from "@/types/watch-history-types";

export function filterSeriesStats(
  statsList: readonly SeriesStats[],
  filter: SeriesFilterCondition,
): SeriesStats[] {
  return statsList.filter((stats) => {
    if (
      filter.searchText &&
      !stats.seriesTitle.toLowerCase().includes(filter.searchText.toLowerCase())
    ) {
      return false;
    }
    switch (filter.progressFilter) {
      case "watching":
        return stats.watchedCount > 0 && stats.progressRate < 1;
      case "completed":
        return stats.progressRate >= 1;
      case "not_started":
        return stats.watchedCount === 0;
      default:
        return true;
    }
  });
}
