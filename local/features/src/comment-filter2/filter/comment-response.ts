import type { CF2CommentApiResponse, CF2Thread } from "@/types/filter-types";

function createThreadKey(thread: CF2Thread): string {
  return `${thread.id}\u0000${thread.fork}`;
}

/**
 * フィルター後のコメント配列をレスポンスへ戻し、累計件数から実際の除去数だけを差し引く。
 * commentCount/globalComments は取得配列長ではなくサーバー上の累計なので、
 * comments.length そのものでは置き換えない。
 */
export function buildFilteredCommentResponse(
  originalResponse: CF2CommentApiResponse,
  filteredThreads: CF2Thread[],
): CF2CommentApiResponse {
  const originalThreadsByKey = new Map<string, CF2Thread[]>();

  for (const thread of originalResponse.data.threads) {
    const key = createThreadKey(thread);
    const matchingThreads = originalThreadsByKey.get(key) ?? [];
    matchingThreads.push(thread);
    originalThreadsByKey.set(key, matchingThreads);
  }

  const removedCountsByThreadId = new Map<string, number>();
  const threads = filteredThreads.map((filteredThread) => {
    const matchingThreads = originalThreadsByKey.get(
      createThreadKey(filteredThread),
    );
    const originalThread = matchingThreads?.shift();

    if (!originalThread) {
      return filteredThread;
    }

    const removedCount = Math.max(
      0,
      originalThread.comments.length - filteredThread.comments.length,
    );

    if (removedCount > 0) {
      removedCountsByThreadId.set(
        originalThread.id,
        (removedCountsByThreadId.get(originalThread.id) ?? 0) + removedCount,
      );
    }

    return {
      ...filteredThread,
      commentCount: Math.max(0, originalThread.commentCount - removedCount),
    };
  });

  const globalComments = originalResponse.data.globalComments?.map(
    (globalComment) => ({
      ...globalComment,
      count: Math.max(
        0,
        globalComment.count -
          (removedCountsByThreadId.get(globalComment.id) ?? 0),
      ),
    }),
  );

  return {
    ...originalResponse,
    data: {
      ...originalResponse.data,
      ...(globalComments ? { globalComments } : {}),
      threads,
    },
  };
}
