import type {
  FilterCondition,
  WatchHistoryEntry,
} from "@/types/watch-history-types";

export interface FavoriteVideo {
  entry: WatchHistoryEntry;
  score: number;
}

function normalizeOptionalText(value?: string): string | undefined {
  const normalized = (value ?? "").trim();
  if (
    !normalized ||
    normalized.toLowerCase() === "null" ||
    normalized.toLowerCase() === "undefined"
  ) {
    return undefined;
  }
  return normalized;
}

function splitSearchTerms(value?: string): string[] {
  return (normalizeOptionalText(value) ?? "")
    .toLowerCase()
    .split(/\s+/u)
    .filter(Boolean);
}

export function matchesHistorySearch(
  entry: WatchHistoryEntry,
  searchText?: string,
): boolean {
  const searchTerms = splitSearchTerms(searchText);
  if (searchTerms.length === 0) return true;

  const target = [
    entry.title,
    entry.ownerName,
    (entry.tags ?? []).join(" "),
    entry.memo,
  ]
    .join(" ")
    .toLowerCase();

  return searchTerms.every((term) => target.includes(term));
}

export function cleanHistoryFilter(filter: FilterCondition): FilterCondition {
  const cleaned: FilterCondition = { ...filter };
  cleaned.searchText = normalizeOptionalText(filter.searchText);
  cleaned.ownerId = normalizeOptionalText(filter.ownerId);

  if (cleaned.searchText === undefined) delete cleaned.searchText;
  if (cleaned.ownerId === undefined) delete cleaned.ownerId;
  if (cleaned.dateRange && !cleaned.dateRange.start && !cleaned.dateRange.end) {
    delete cleaned.dateRange;
  }
  if (
    cleaned.uploadedDateRange &&
    !cleaned.uploadedDateRange.start &&
    !cleaned.uploadedDateRange.end
  ) {
    delete cleaned.uploadedDateRange;
  }
  return cleaned;
}

export function filterHistoryEntries(
  entries: readonly WatchHistoryEntry[],
  filter: FilterCondition,
): WatchHistoryEntry[] {
  return entries.filter((entry) => {
    if (!matchesHistorySearch(entry, filter.searchText)) return false;
    if (filter.ownerId && String(entry.ownerId) !== String(filter.ownerId)) {
      return false;
    }
    if (filter.completedOnly && !entry.completed) return false;
    if (
      filter.dateRange &&
      (entry.watchedAt < filter.dateRange.start ||
        entry.watchedAt > filter.dateRange.end)
    ) {
      return false;
    }
    if (filter.uploadedDateRange) {
      const uploadedAt = entry.stats?.uploadedAt;
      if (
        uploadedAt === undefined ||
        uploadedAt < filter.uploadedDateRange.start ||
        uploadedAt > filter.uploadedDateRange.end
      ) {
        return false;
      }
    }
    return true;
  });
}

export function calculateFavoriteVideos(
  entries: readonly WatchHistoryEntry[],
  limit = 15,
): FavoriteVideo[] {
  return entries
    .map((entry) => {
      const logs = Array.isArray(entry.watchLogs) ? entry.watchLogs : [];
      const score =
        logs.length > 0
          ? logs.reduce((sum, log) => {
              const ratio =
                entry.lengthSec > 0
                  ? log.completed
                    ? 1
                    : log.position / entry.lengthSec
                  : 0;
              return sum + ratio;
            }, 0)
          : entry.lengthSec > 0
            ? entry.lastPosition / entry.lengthSec
            : 0;
      return { entry, score };
    })
    .sort((left, right) => right.score - left.score)
    .slice(0, limit);
}
