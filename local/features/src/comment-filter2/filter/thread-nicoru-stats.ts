import { CF2Comment } from '@/types/filter-types';

export interface ThreadNicoruStats {
  totalComments: number;
  minNicoru: number;
  maxNicoru: number;
  countsByValue: Map<number, number>;
  sortedValues: number[];
}

/**
 * コメントスレッド内の nicoru 分布を単回集計する。
 * スレッド内には0件もあり得るため、その際は min/max=0 で返す。
 */
export function computeThreadNicoruStats(comments: CF2Comment[]): ThreadNicoruStats {
  const countsByValue = new Map<number, number>();

  let minNicoru = Number.POSITIVE_INFINITY;
  let maxNicoru = Number.NEGATIVE_INFINITY;

  for (const comment of comments) {
    const rawValue = comment.nicoruCount;
    const numericValue =
      typeof rawValue === 'number'
        ? rawValue
        : Number.isFinite(Number(rawValue))
          ? Number(rawValue)
          : 0;

    countsByValue.set(numericValue, (countsByValue.get(numericValue) ?? 0) + 1);

    if (numericValue < minNicoru) {
      minNicoru = numericValue;
    }
    if (numericValue > maxNicoru) {
      maxNicoru = numericValue;
    }
  }

  if (countsByValue.size === 0) {
    minNicoru = 0;
    maxNicoru = 0;
  }

  const sortedValues = Array.from(countsByValue.keys()).sort((a, b) => a - b);

  return {
    totalComments: comments.length,
    minNicoru,
    maxNicoru,
    countsByValue,
    sortedValues
  };
}
