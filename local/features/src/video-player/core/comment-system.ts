import { DanmakuCommentSystem } from "@/video-player/core/danmaku-comment-system";
import { CommentFetcher } from "@/video-player/core/comment-fetcher";
import { CommentList } from "@/video-player/ui/comment-list";
import { CONSTANTS } from "@/comment-filter2/utils/constants";
import {
  Comment,
  CommentApiResponse,
  SafeCommentFilter2GlobalData,
} from "@/types/comment-types";

/**
 * コメントシステム - レンダリングとリスト表示を統合管理
 */
export class CommentSystem {
  private readonly danmaku = new DanmakuCommentSystem();
  private fetcher: CommentFetcher;
  private commentList: CommentList;
  private videoElement: HTMLVideoElement | null = null;
  private isVisible = true;
  private ngWords: string[] = [];
  private ngRegex: RegExp[] = [];
  private commentContainer: HTMLElement | null = null;
  private isInitialized: boolean = false;
  private hasReceivedFilteredData: boolean = false;
  private _timeUpdateHandler?: (e: Event) => void; // timeUpdateリスナーの参照を保持
  private abortController: AbortController | null = null;

  constructor() {
    this.fetcher = new CommentFetcher();
    this.commentList = new CommentList();
  }

  /**
   * コメントシステムの初期化
   */
  initialize(
    videoElement: HTMLVideoElement,
    container: HTMLElement,
  ): void {
    try {
      window.logger.info("コメントシステムの初期化を開始します！");

      // ★追加: 前回の状態を完全リセット
      if (this.isInitialized) {
        window.logger.info("既存のコメントシステムをリセットします！");
        this.commentList.clearComments(); // リストを空に
        this.hasReceivedFilteredData = false;
        this.danmaku.destroy();
      }

      this.videoElement = videoElement;

      // ★追加: 旧リスナーが残っていれば解除
      if (this._timeUpdateHandler && this.videoElement) {
        this.videoElement.removeEventListener(
          "timeupdate",
          this._timeUpdateHandler,
        );
      }

      this.danmaku.initialize(videoElement, container);

      // 時間更新イベントの設定
      this.setupTimeUpdateListener();

      // CommentFilter2との連携イベントリスナーを設定
      this.setupCommentFilter2Listener();

      // 初期状態をローカルストレージから復元
      this.restoreVisibilityState();

      // コメントリストをDOMに追加（Web Componentとして）
      this.commentContainer = document.createElement("div");
      this.commentContainer.className = "comment-container";
      this.commentContainer.appendChild(this.commentList);

      // コメントリストコンテナのスタイルを調整 (Flexboxレイアウト用)
      this.commentContainer.style.position = "relative"; // 絶対配置から変更
      this.commentContainer.style.width = "400px"; // コメントリストの幅
      this.commentContainer.style.height = "100%";
      this.commentContainer.style.maxHeight = "80vh";
      this.commentContainer.style.backgroundColor = "rgba(0, 0, 0, 0.8)";
      this.commentContainer.style.zIndex = "5";
      this.commentContainer.style.overflow = "hidden";
      this.commentContainer.style.display = "flex"; // 子要素のCommentListを伸縮させる
      this.commentContainer.style.flexDirection = "column";
      this.commentContainer.style.flexShrink = "0"; // 縮まないように設定

      if (!container.contains(this.commentContainer)) {
        container.appendChild(this.commentContainer);
      }

      this.isInitialized = true;

      window.logger.info("コメントシステムの初期化が完了しました！");
    } catch (error) {
      window.logger.error("コメントシステムの初期化に失敗しました...", error);
      throw error;
    }
  }

  /**
   * 時間更新イベントのリスナー設定
   */
  private setupTimeUpdateListener(): void {
    if (!this.videoElement) return;

    // ★変更: ハンドラを保持して重複登録を防止
    this._timeUpdateHandler = () => {
      const currentTimeMs = this.videoElement!.currentTime * 1000;
      this.commentList.updateTime(currentTimeMs);
    };

    this.videoElement.addEventListener("timeupdate", this._timeUpdateHandler);
  }

  /**
   * CommentFilter2からのフィルタリング済みコメントを受け取るイベントリスナー設定
   */
  private setupCommentFilter2Listener(): void {
    if (!this.videoElement) return;

    // 既存のリスナーが残っている可能性があるので一度削除
    this.videoElement.removeEventListener(
      "commentFilter2Update",
      this._handleCommentFilter2Update,
    );

    // CommentFilter2からのフィルタリング済みデータを受け取る
    this.videoElement.addEventListener(
      "commentFilter2Update",
      this._handleCommentFilter2Update,
    );
  }

  // イベントハンドラーをプロパティとして保持
  private _handleCommentFilter2Update = (event: Event): void => {
    const customEvent = event as CustomEvent;
    const detail: unknown = customEvent.detail;

    if (
      detail &&
      typeof detail === "object" &&
      "filteredData" in (detail as Record<string, unknown>)
    ) {
      window.logger.debug(
        "CommentFilter2からフィルタリング済みデータを受け取りました！",
      );
      this.applyFilteredComments(
        (detail as { filteredData: CommentApiResponse }).filteredData,
      );
    }
  };

  /**
   * コメントの表示状態をローカルストレージから復元
   */
  private restoreVisibilityState(): void {
    const savedVisibility = localStorage.getItem("commentVisible");
    if (savedVisibility !== null) {
      this.isVisible = savedVisibility === "true";
      this.danmaku.setVisibility(this.isVisible);
    }
  }

  /**
   * CommentFilter2からのフィルタリング済みコメントを適用
   */
  private applyFilteredComments(apiResponse: CommentApiResponse): void {
    window.logger.info(
      "CommentFilter2からフィルタ済みコメントを受け取りました！",
      apiResponse,
    );
    this.hasReceivedFilteredData = true;

    // 既存のAPIフェッチがあればキャンセル
    if (this.abortController) {
      this.abortController.abort();
      window.logger.info("既存のAPIフェッチをキャンセルしました！");
    }

    let comments = apiResponse.data.threads.flatMap(
      (thread) => thread.comments,
    );
    comments = comments.map((comment) => {
      comment.vposMs = comment.vpos * 10;
      return comment;
    });

    const filteredComments = this.filterNGComments(
      comments as unknown as Comment[],
    );
    window.logger.info(
      `CommentFilter2適用後のコメント数です: ${filteredComments.length}`,
    );

    this.commentList.clearComments();
    this.commentList.addComments(filteredComments);
    this.danmaku.load(filteredComments);
  }

  /**
   * 動画IDからコメントを読み込む
   */
  async loadComments(videoId: string): Promise<void> {
    if (!this.isInitialized) {
      throw new Error("コメントシステムが初期化されていません");
    }

    // 既存のフェッチがあればキャンセル
    if (this.abortController) {
      this.abortController.abort();
    }

    // 新しいAbortControllerを作成
    this.abortController = new AbortController();

    // 既にCommentFilter2データを適用済みなら最初に抜ける
    if (this.hasReceivedFilteredData) {
      window.logger.info(
        "CommentFilter2のコメントを既に描画しているのでフェッチをスキップします！",
      );
      return;
    }

    try {
      window.logger.info(`コメント読み込み開始します: ${videoId}`);
      const apiResponse = await this.fetcher.fetchAllComments(videoId);
      window.logger.info(
        `コメント読み込み完了しました: ${videoId}`,
        apiResponse,
      );

      // コメントをフィルタ
      let comments = apiResponse.data.threads.flatMap(
        (thread) => thread.comments,
      );
      window.logger.info(`取得したコメント数です: ${comments.length}`);

      // vposをミリ秒に変換
      comments = comments.map((comment) => {
        comment.vposMs = comment.vpos * 10;
        return comment;
      });

      // NGコメントをフィルタ
      const filteredComments = this.filterNGComments(
        comments as unknown as Comment[],
      );
      window.logger.info(
        `フィルタ後のコメント数です: ${filteredComments.length}`,
      );

      // API取得が完了した瞬間に再度チェック
      if (this.hasReceivedFilteredData) {
        window.logger.info(
          "APIフェッチ中にCommentFilter2データが到着したため、API側の描画をキャンセルします！",
        );
        return;
      }

      this.applyFilteredComments(apiResponse);
    } catch (error: unknown) {
      if (error instanceof DOMException && error.name === "AbortError") {
        window.logger.info(
          "CommentFilter2データが先に到着したため、APIフェッチを中断しました！",
        );
        return;
      }
      window.logger.error("コメント読み込みエラーが発生しました！", error);
      throw error;
    } finally {
      // 処理が完了したらabortControllerをリセット
      this.abortController = null;
    }
  }

  /**
   * コメントをNGワード/正規表現でフィルタリング
   */
  private filterNGComments(comments: Comment[]): Comment[] {
    if (this.ngWords.length === 0 && this.ngRegex.length === 0) {
      return comments;
    }

    return comments.filter((comment) => {
      const text = comment.body.toLowerCase();

      // NGワードでのフィルタリング
      const containsNgWord = this.ngWords.some((word) =>
        text.includes(word.toLowerCase()),
      );

      if (containsNgWord) return false;

      // NG正規表現でのフィルタリング
      const matchesNgRegex = this.ngRegex.some((regex) => regex.test(text));

      return !matchesNgRegex;
    });
  }

  /**
   * コメントの表示/非表示を切り替え
   */
  toggleVisibility(): boolean {
    this.isVisible = !this.isVisible;
    this.danmaku.setVisibility(this.isVisible);
    localStorage.setItem("commentVisible", this.isVisible.toString());
    return this.isVisible;
  }

  /**
   * コメントを追加（外部からのコメント追加用）
   */
  addComment(comment: Comment): void {
    // NGフィルタリングをチェック
    if (this.isCommentAllowed(comment)) {
      const enrichedComment: Comment = {
        ...comment,
        vposMs: comment.vposMs ?? comment.vpos * 10,
      };
      // any/unknown型の利用を避けるため型アサーションを明確化
      const currentComments = this.commentList.getComments();
      const nextComments: Comment[] = [...currentComments, enrichedComment];
      this.commentList.addComments(nextComments);
      this.danmaku.load(nextComments);
    }
  }

  /**
   * コメントがNGフィルタに引っかからないかチェック
   */
  private isCommentAllowed(comment: Comment): boolean {
    const text = comment.body.toLowerCase();

    // NGワードでのフィルタリング
    const containsNgWord = this.ngWords.some((word) =>
      text.includes(word.toLowerCase()),
    );

    if (containsNgWord) return false;

    // NG正規表現でのフィルタリング
    const matchesNgRegex = this.ngRegex.some((regex) => regex.test(text));

    return !matchesNgRegex;
  }

  /**
   * コメントの表示/非表示状態を取得
   */
  getVisibility(): boolean {
    return this.isVisible;
  }

  /**
   * リソースのクリーンアップ
   */
  cleanup(): void {
    window.logger.info("コメントシステムのクリーンアップを開始します！");
    // 既存のフェッチがあればキャンセル
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }

    // video_player終了時にフラグをリセット
    if (window.CommentFilterState) {
      window.CommentFilterState.isVideoPlayerActive = false;
      window.CommentFilterState.fetchProxyEnabled = true;
    }

    // コメントコンテナの削除
    if (this.commentContainer) {
      this.commentContainer.remove();
      this.commentContainer = null;
    }

    // イベントリスナーの削除
    if (this.videoElement) {
      if (this._timeUpdateHandler) {
        this.videoElement.removeEventListener(
          "timeupdate",
          this._timeUpdateHandler,
        );
        this._timeUpdateHandler = undefined;
      }

      // CommentFilter2イベントリスナーの削除
      this.videoElement.removeEventListener(
        "commentFilter2Update",
        this._handleCommentFilter2Update,
      );
    }

    // 変数のリセット
    this.videoElement = null;
    this.isInitialized = false;
    this.hasReceivedFilteredData = false;

    // レンダラーと関連リソースの破棄
    this.danmaku.destroy();
    this.commentList.remove();

    window.logger.info("コメントシステムのリソースをクリーンアップしました！");
  }

  /**
   * コメントの透明度を設定
   * @param opacity 透明度（0.0〜1.0）
   */
  setOpacity(opacity: number): void {
    try {
      this.danmaku.setOpacity(opacity);
      window.logger.info(`コメント透明度を ${opacity} に設定しました！`);
    } catch (error) {
      window.logger.error("コメント透明度の設定に失敗しました！:", error);
    }
  }

  /**
   * コメントのデフォルト色を設定
   * @param color 色（HEX形式の文字列、例: "#FFFFFF"）
   */
  setDefaultColor(color: string): void {
    try {
      this.danmaku.setDefaultColor(color);
      window.logger.info(`コメントのデフォルト色を ${color} に設定しました！`);
    } catch (error) {
      window.logger.error(
        "コメントのデフォルト色の設定に失敗しました！:",
        error,
      );
    }
  }

  /**
   * NGワードリストを設定
   * @param words NGワードの配列
   */
  setNGWords(words: string[]): void {
    try {
      this.ngWords = words
        .map((word) => word.trim())
        .filter((word) => word !== "");
      window.logger.info(`${this.ngWords.length}件のNGワードを設定しました！`);
    } catch (error) {
      window.logger.error("NGワードの設定に失敗しました！:", error);
    }
  }

  /**
   * NG正規表現リストを設定
   * @param regexStrings 正規表現の文字列配列
   */
  setNGRegex(regexStrings: string[]): void {
    try {
      this.ngRegex = regexStrings
        .map((str) => {
          try {
            return new RegExp(str, "i");
          } catch (error) {
            void error;
            window.logger.warn(`不正な正規表現なので無視します！: ${str}`);
            return null;
          }
        })
        .filter((regex): regex is RegExp => regex !== null);

      window.logger.info(
        `${this.ngRegex.length}件のNG正規表現を設定しました！`,
      );
    } catch (error) {
      window.logger.error("NG正規表現の設定に失敗しました！:", error);
    }
  }

  /**
   * コメント描画キャンバスのサイズをコンテナに合わせる
   */
  resize(): void {
    this.danmaku.resize();
  }

  /**
   * CommentFilter2のグローバルデータを取得
   */
  private getCommentFilter2Data(): SafeCommentFilter2GlobalData | null {
    try {
      const data = window[CONSTANTS.GLOBAL_DATA_KEY as keyof Window];

      // 型ガードで安全にチェック
      if (
        data &&
        typeof data === "object" &&
        "originalData" in data &&
        "filteredData" in data &&
        "currentSmid" in data &&
        "lastUpdated" in data &&
        data.originalData !== null &&
        data.filteredData !== null &&
        data.currentSmid !== null
      ) {
        return data as SafeCommentFilter2GlobalData;
      }

      return null;
    } catch (error) {
      window.logger.warn(
        "CommentFilter2のグローバルデータ取得に失敗したので無視します！:",
        error,
      );
      return null;
    }
  }
}
