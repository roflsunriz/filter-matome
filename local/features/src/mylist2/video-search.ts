import type { KeywordInfo } from "@/types/mylist-types";
import type { DBVideo } from "@/types/video-types";

function splitSearchTerms(searchText: string): string[] {
  return searchText.trim().toLowerCase().split(/\s+/u).filter(Boolean);
}

export function matchesVideoSearch(
  video: DBVideo,
  searchText: string,
): boolean {
  const searchTerms = splitSearchTerms(searchText);
  if (searchTerms.length === 0) return true;

  const target = [
    video.originalId,
    video.title,
    video.authorName,
    video.description,
    ...(video.tags ?? []),
    video.memo,
    video.availabilityStatus,
    video.availabilityReason,
  ]
    .filter((value): value is string => typeof value === "string")
    .join(" ")
    .toLowerCase();

  return searchTerms.every((term) => target.includes(term));
}

export function matchesKeywordSearch(
  keyword: KeywordInfo,
  searchText: string,
): boolean {
  const searchTerms = splitSearchTerms(searchText);
  const target = keyword.keyword.toLowerCase();
  return searchTerms.every((term) => target.includes(term));
}
