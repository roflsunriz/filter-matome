import type { WatchHistoryEntry } from "@/types/watch-history-types";

export type DeleteMetadataKey =
  | "watchCount"
  | "progressRate"
  | "lastPosition"
  | "lengthSec"
  | "viewCount"
  | "commentCount"
  | "mylistCount"
  | "likeCount";
export type DeleteOperator = "gte" | "lte" | "lt" | "gt" | "range";
export interface DeleteCondition {
  metadata: DeleteMetadataKey;
  operator: DeleteOperator;
  value: number;
  maxValue?: number;
}

export const DELETE_METADATA_LABELS: Record<DeleteMetadataKey, string> = {
  watchCount: "視聴回数",
  progressRate: "進捗率",
  lastPosition: "最終再生位置",
  lengthSec: "動画時間",
  viewCount: "再生数",
  commentCount: "コメント数",
  mylistCount: "マイリスト数",
  likeCount: "いいね数",
};
export const DELETE_OPERATOR_LABELS: Record<DeleteOperator, string> = {
  gte: "以上",
  lte: "以下",
  lt: "未満",
  gt: "超過",
  range: "レンジ",
};

export function createDeleteCondition(
  metadata: DeleteMetadataKey | undefined,
  operator: DeleteOperator | undefined,
  rawValue: string,
  rawMaxValue?: string,
): DeleteCondition | null {
  if (!metadata || !operator || rawValue.trim() === "") return null;
  const value = Number(rawValue);
  if (!Number.isFinite(value)) return null;
  if (operator !== "range") return { metadata, operator, value };
  if (rawMaxValue === undefined || rawMaxValue.trim() === "") return null;
  const maxValue = Number(rawMaxValue);
  if (!Number.isFinite(maxValue)) return null;
  return {
    metadata,
    operator,
    value: Math.min(value, maxValue),
    maxValue: Math.max(value, maxValue),
  };
}

export function getDeleteMetric(
  entry: WatchHistoryEntry,
  metadata: DeleteMetadataKey,
): number | null {
  switch (metadata) {
    case "watchCount":
      return entry.watchCount;
    case "progressRate":
      return entry.lengthSec > 0
        ? Math.round((entry.lastPosition / entry.lengthSec) * 100)
        : 0;
    case "lastPosition":
      return entry.lastPosition;
    case "lengthSec":
      return entry.lengthSec;
    case "viewCount":
      return entry.stats?.viewCount ?? null;
    case "commentCount":
      return entry.stats?.commentCount ?? null;
    case "mylistCount":
      return entry.stats?.mylistCount ?? null;
    case "likeCount":
      return entry.stats?.likeCount ?? null;
  }
}

export function matchesDeleteCondition(
  entry: WatchHistoryEntry,
  condition: DeleteCondition,
): boolean {
  const value = getDeleteMetric(entry, condition.metadata);
  if (value === null) return false;
  switch (condition.operator) {
    case "gte":
      return value >= condition.value;
    case "lte":
      return value <= condition.value;
    case "lt":
      return value < condition.value;
    case "gt":
      return value > condition.value;
    case "range":
      return (
        condition.maxValue !== undefined &&
        value >= condition.value &&
        value <= condition.maxValue
      );
  }
}

export function findDeleteTargets(
  entries: readonly WatchHistoryEntry[],
  condition: DeleteCondition,
): WatchHistoryEntry[] {
  return entries.filter((entry) => matchesDeleteCondition(entry, condition));
}

export function describeDeleteCondition(condition: DeleteCondition): string {
  const metadata = DELETE_METADATA_LABELS[condition.metadata];
  if (condition.operator === "range") {
    return `${metadata} が ${condition.value} 〜 ${condition.maxValue} の範囲`;
  }
  return `${metadata} が ${condition.value} ${DELETE_OPERATOR_LABELS[condition.operator]}`;
}

export function formatDeleteMetric(
  condition: DeleteCondition,
  value: number,
): string {
  return `${DELETE_METADATA_LABELS[condition.metadata]}=${value}${condition.metadata === "progressRate" ? "%" : ""}`;
}
