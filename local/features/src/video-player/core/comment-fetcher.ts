import {
  CommentApiResponse,
  CommentData as VPCommentData,
  CommentThread as VPCommentThread,
} from "@/types/comment-types.js";

/**
 * ニコニコ動画のコメントを取得するクラス
 */
export class CommentFetcher {
  /**
   * 動画IDからAPIデータを取得し、コメントを取得
   */
  async fetchAllComments(videoId: string): Promise<CommentApiResponse> {
    try {
      window.logger.info(`コメント一括取得を開始します！ VideoID: ${videoId}`);
      const res = await window.commonHelper.fetchNicoDataWithComments(videoId);
      if (!res) throw new Error("統合データの取得に失敗しました");
      // 型整合のため、video-player用CommentDataへ正規化
      const normalizedComments: VPCommentData[] = res.comments.map((c) => {
        // common-types の CommentData は vposMs 必須・vpos なし
        // video-player の CommentData は vpos 必須・vposMs 任意
        const vpos = Math.round((c.vposMs ?? 0) / 10);
        const out: VPCommentData = {
          // 共有フィールド
          id: c.id,
          no: c.no,
          body: c.body,
          commands: c.commands,
          userId: c.userId,
          isPremium: c.isPremium,
          score: c.score,
          nicoruCount: c.nicoruCount,
          nicoruId: c.nicoruId,
          source: c.source,
          fork: c.fork,
          threadId: c.threadId,
          isMyPost: c.isMyPost,
          // 差分フィールド
          vpos,
          vposMs: c.vposMs,
        };
        return out;
      });

      const thread: VPCommentThread = {
        commentCount: normalizedComments.length,
        fork: "all",
        comments: normalizedComments,
      };
      return { data: { threads: [thread] } };
    } catch (error) {
      window.logger.error(
        "fetchNicoDataWithCommentsでの取得に失敗しました...",
        error,
      );
      throw error;
    }
  }
}
