import { CommentRenderer } from './comment-renderer.js';
import { CommentFetcher } from './comment-fetcher.js';
import { CommentList } from '../ui/comment-list.js';
import { CONSTANTS } from '../../comment-filter2/utils/constants.js';
import { 
  Comment, 
  CommentApiResponse, 
  SafeCommentFilter2GlobalData 
} from '../../types/comment-types.js';

/**
 * コメントシステム - レンダリングとリスト表示を統合管理
 */
export class CommentSystem {
  private renderer: CommentRenderer;
  private fetcher: CommentFetcher;
  private commentList: CommentList;
  private videoElement: HTMLVideoElement | null = null;
  private isVisible = true;
  private ngWords: string[] = [];
  private ngRegex: RegExp[] = [];
  private commentContainer: HTMLElement | null = null;
  private comments: Comment[] = [];
  private isInitialized: boolean = false;
  private hasReceivedFilteredData: boolean = false;
  private _timeUpdateHandler?: (e: Event) => void; // timeUpdateリスナーの参照を保持
  private abortController: AbortController | null = null;

  constructor() {
    this.renderer = new CommentRenderer();
    this.fetcher = new CommentFetcher();
    this.commentList = new CommentList();
  }

  /**
   * コメントシステムの初期化
   */
  async initialize(videoElement: HTMLVideoElement): Promise<void> {
    try {
      window.logger.info("コメントシステムの初期化を開始するのじゃ！");
      
      // ★追加: 前回の状態を完全リセット
      if (this.isInitialized) {
        window.logger.info("既存のコメントシステムをリセットするのじゃ！");
        this.renderer.destroy();               // アニメーション停止 & canvas削除
        this.commentList.clearComments();      // リストを空に
        this.hasReceivedFilteredData = false;  // 重複フラグを戻す
      }
      
      this.videoElement = videoElement;

      // ★追加: 旧リスナーが残っていれば解除
      if (this._timeUpdateHandler && this.videoElement) {
        this.videoElement.removeEventListener("timeupdate", this._timeUpdateHandler);
      }

      // レンダラーの初期化（★変更: 再作成するように）
      this.renderer = new CommentRenderer();
      this.renderer.initialize(videoElement);

      // 時間更新イベントの設定
      this.setupTimeUpdateListener();

      // CommentFilter2との連携イベントリスナーを設定
      this.setupCommentFilter2Listener();

      // 初期状態をローカルストレージから復元
      this.restoreVisibilityState();

      // コメントリストをDOMに追加（Web Componentとして）
      this.commentContainer = document.createElement('div');
      this.commentContainer.className = 'comment-container';
      this.commentContainer.appendChild(this.commentList);

      // ───────── レイアウト調整 ─────────
      const customPlayer = document.getElementById('custom-player');
      if (customPlayer) {
        let wrapper: HTMLElement | null = customPlayer.parentElement as HTMLElement;

        // すでにラッパーが存在するか確認
        if (!wrapper || !wrapper.classList.contains('video-with-comments')) {
          wrapper = document.createElement('div');
          wrapper.className = 'video-with-comments';

          // customPlayer の直前に wrapper を挿入し、その中に customPlayer を移動
          customPlayer.parentNode?.insertBefore(wrapper, customPlayer);
          wrapper.appendChild(customPlayer);
        }

        // コメントコンテナを wrapper に追加
        wrapper.appendChild(this.commentContainer);
      } else {
        // フォールバック：従来通りビデオ要素の親に追加
        this.videoElement.parentElement?.appendChild(this.commentContainer);
      }

      // 公式コメントリストを非表示
      this.hideOfficialCommentPanel();
      
      // ★追加: 公式コメントオーバーレイも非表示
      this.hideOfficialCommentOverlay();

      this.isInitialized = true;

      window.logger.info("コメントシステムの初期化が完了したのじゃ！");
    } catch (error) {
      window.logger.error("コメントシステムの初期化に失敗したのじゃ...", error);
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
    this.videoElement.removeEventListener('commentFilter2Update', this._handleCommentFilter2Update);

    // CommentFilter2からのフィルタリング済みデータを受け取る
    this.videoElement.addEventListener('commentFilter2Update', this._handleCommentFilter2Update);
  }

  // イベントハンドラーをプロパティとして保持
  private _handleCommentFilter2Update = (event: Event): void => {
    const customEvent = event as CustomEvent;
    const detail = customEvent.detail;
    
    if (detail && detail.filteredData) {
      window.logger.debug('CommentFilter2からフィルタリング済みデータを受け取ったのじゃ！');
      this.applyFilteredComments(detail.filteredData);
    }
  };

  /**
   * コメントの表示状態をローカルストレージから復元
   */
  private restoreVisibilityState(): void {
    const savedVisibility = localStorage.getItem("commentVisible");
    if (savedVisibility !== null) {
      this.isVisible = savedVisibility === "true";
      this.renderer.setVisible(this.isVisible);
    }
  }

  /**
   * CommentFilter2からのフィルタリング済みコメントを適用
   */
  private applyFilteredComments(apiResponse: CommentApiResponse): void {
    window.logger.info('CommentFilter2からフィルタ済みコメントを受け取ったのじゃ', apiResponse);
    this.hasReceivedFilteredData = true;

    // 既存のAPIフェッチがあればキャンセル
    if (this.abortController) {
      this.abortController.abort();
      window.logger.info('既存のAPIフェッチをキャンセルしたのじゃ');
    }

    // 既存のコメントをクリア
    this.renderer.clearComments();
    this.commentList.clearComments();

    // フィルタ済みコメントを適用
    let comments = apiResponse.data.threads.flatMap(thread => thread.comments);
    comments = comments.map(comment => {
      comment.vposMs = comment.vpos * 10;
      return comment;
    });

    // 追加のNGフィルタを適用
    const filteredComments = this.filterNGComments(comments as unknown as Comment[]);
    window.logger.info(`CommentFilter2適用後のコメント数なのじゃ: ${filteredComments.length}`);

    // コメントを追加
    this.commentList.addComments(filteredComments);
    filteredComments.forEach(c => this.renderer.addComment(c));
  }

  /**
   * 動画IDからコメントを読み込む
   */
  async loadComments(videoId: string): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('コメントシステムが初期化されていません');
    }

    // 既存のフェッチがあればキャンセル
    if (this.abortController) {
      this.abortController.abort();
    }

    // 新しいAbortControllerを作成
    this.abortController = new AbortController();
    const signal = this.abortController.signal;

    // 既にCommentFilter2データを適用済みなら最初に抜ける
    if (this.hasReceivedFilteredData) {
      window.logger.info('CommentFilter2のコメントを既に描画しているのでフェッチをスキップするのじゃ');
      return;
    }

    try {
      window.logger.info(`コメント読み込み開始なのじゃ: ${videoId}`);
      const apiResponse = await this.fetcher.fetchAllComments(videoId, signal);
      window.logger.info(`コメント読み込み完了なのじゃ: ${videoId}`, apiResponse);

      // コメントをフィルタ
      let comments = apiResponse.data.threads.flatMap(thread => thread.comments);
      window.logger.info(`取得したコメント数なのじゃ: ${comments.length}`);

      // vposをミリ秒に変換
      comments = comments.map(comment => {
        comment.vposMs = comment.vpos * 10;
        return comment;
      });

      // NGコメントをフィルタ
      const filteredComments = this.filterNGComments(comments as unknown as Comment[]);
      window.logger.info(`フィルタ後のコメント数なのじゃ: ${filteredComments.length}`);

      // API取得が完了した瞬間に再度チェック
      if (this.hasReceivedFilteredData) {
        window.logger.info('APIフェッチ中にCommentFilter2データが到着したため、API側の描画をキャンセルするのじゃ');
        return;
      }

      this.commentList.addComments(filteredComments);
      filteredComments.forEach(c => this.renderer.addComment(c));
    } catch (error: unknown) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        window.logger.info('CommentFilter2データが先に到着したため、APIフェッチを中断したのじゃ');
        return;
      }
      window.logger.error('コメント読み込みエラーなのじゃ！', error);
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

    return comments.filter(comment => {
      const text = comment.body.toLowerCase();
      
      // NGワードでのフィルタリング
      const containsNgWord = this.ngWords.some(word => 
        text.includes(word.toLowerCase())
      );
      
      if (containsNgWord) return false;
      
      // NG正規表現でのフィルタリング
      const matchesNgRegex = this.ngRegex.some(regex => 
        regex.test(text)
      );
      
      return !matchesNgRegex;
    });
  }

  /**
   * コメントの表示/非表示を切り替え
   */
  toggleVisibility(): boolean {
    this.isVisible = !this.isVisible;
    this.renderer.setVisible(this.isVisible);
    localStorage.setItem("commentVisible", this.isVisible.toString());
    return this.isVisible;
  }

  /**
   * コメントを追加（外部からのコメント追加用）
   */
  addComment(comment: Comment): void {
    // NGフィルタリングをチェック
    if (this.isCommentAllowed(comment)) {
      this.renderer.addComment(comment);
    }
  }

  /**
   * コメントがNGフィルタに引っかからないかチェック
   */
  private isCommentAllowed(comment: Comment): boolean {
    const text = comment.body.toLowerCase();
    
    // NGワードでのフィルタリング
    const containsNgWord = this.ngWords.some(word => 
      text.includes(word.toLowerCase())
    );
    
    if (containsNgWord) return false;
    
    // NG正規表現でのフィルタリング
    const matchesNgRegex = this.ngRegex.some(regex => 
      regex.test(text)
    );
    
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
    window.logger.info('コメントシステムのクリーンアップを開始するのじゃ');
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
        this.videoElement.removeEventListener("timeupdate", this._timeUpdateHandler);
        this._timeUpdateHandler = undefined;
      }
      
      // CommentFilter2イベントリスナーの削除
      this.videoElement.removeEventListener('commentFilter2Update', this._handleCommentFilter2Update);
    }

    // 変数のリセット
    this.videoElement = null;
    this.comments = [];
    this.isInitialized = false;
    this.hasReceivedFilteredData = false;

    // レンダラーと関連リソースの破棄
    this.renderer.destroy();
    this.commentList.remove();
    
    window.logger.info("コメントシステムのリソースをクリーンアップしたのじゃ");
  }

  /**
   * コメントの透明度を設定
   * @param opacity 透明度（0.0〜1.0）
   */
  setOpacity(opacity: number): void {
    try {
      this.renderer.setOpacity(opacity);
      window.logger.info(`コメント透明度を ${opacity} に設定したのじゃ`);
    } catch (error) {
      window.logger.error("コメント透明度の設定に失敗したのじゃ:", error);
    }
  }

  /**
   * コメントのデフォルト色を設定
   * @param color 色（HEX形式の文字列、例: "#FFFFFF"）
   */
  setDefaultColor(color: string): void {
    try {
      this.renderer.setDefaultColor(color);
      window.logger.info(`コメントのデフォルト色を ${color} に設定したのじゃ`);
    } catch (error) {
      window.logger.error("コメントのデフォルト色の設定に失敗したのじゃ:", error);
    }
  }

  /**
   * NGワードリストを設定
   * @param words NGワードの配列
   */
  setNGWords(words: string[]): void {
    try {
      this.ngWords = words.map(word => word.trim()).filter(word => word !== "");
      window.logger.info(`${this.ngWords.length}件のNGワードを設定したのじゃ`);
    } catch (error) {
      window.logger.error("NGワードの設定に失敗したのじゃ:", error);
    }
  }

  /**
   * NG正規表現リストを設定
   * @param regexStrings 正規表現の文字列配列
   */
  setNGRegex(regexStrings: string[]): void {
    try {
      this.ngRegex = regexStrings
        .map(str => {
          try {
            return new RegExp(str, "i");
          } catch (error) {
            void error;
            window.logger.warn(`不正な正規表現なので無視するのじゃ: ${str}`);
            return null;
          }
        })
        .filter((regex): regex is RegExp => regex !== null);
      
      window.logger.info(`${this.ngRegex.length}件のNG正規表現を設定したのじゃ`);
    } catch (error) {
      window.logger.error("NG正規表現の設定に失敗したのじゃ:", error);
    }
  }

  /**
   * 公式コメントリストを非表示にする
   */
  private hideOfficialCommentPanel(): void {
    try {
      const selectors = [
        '#js-comment',
        '#comment',
        '.CommentPanel',
        '.comment-panel',
        '[data-testid="comment-area"]',
        '.grid-area_\\[comment\\]',
        '.grid-area_\\[sidebar\\]',
        '.WatchCommentsPanel',
        '.WatchCommentsList',
        '.h_var\\(--watch-player-height\\)'
      ];

      selectors.forEach(sel => {
        document.querySelectorAll<HTMLElement>(sel).forEach(el => {
          el.style.display = 'none';
        });
      });
    } catch (error) {
      window.logger.warn('公式コメントリストを非表示にできなかったのじゃ:', error);
    }
  }
  
  /**
   * ★追加: 公式コメントオーバーレイを非表示にする
   */
  private hideOfficialCommentOverlay(): void {
    try {
      const overlaySelectors = [
        '#playerCommentLayer',
        '.CommentScreen',
        '.CommentLayer',
        '.VideoScreenCanvas',
        '.VideoOverlayPanel',
        '.VideoOverlayPanelContainer'
      ];
      
      overlaySelectors.forEach(sel => {
        document.querySelectorAll<HTMLElement>(sel).forEach(el => {
          el.style.display = 'none';
        });
      });
      
      window.logger.info('公式コメントオーバーレイを非表示にしたのじゃ');
    } catch (e) {
      window.logger.warn('公式コメントオーバーレイを非表示にできなかったのじゃ:', e);
    }
  }

  /**
   * CommentFilter2のグローバルデータを取得
   */
  private getCommentFilter2Data(): SafeCommentFilter2GlobalData | null {
    try {
      const data = window[CONSTANTS.GLOBAL_DATA_KEY as keyof Window];
      
      // 型ガードで安全にチェック
      if (data && typeof data === 'object' && 
          'originalData' in data && 
          'filteredData' in data && 
          'currentSmid' in data && 
          'lastUpdated' in data &&
          data.originalData !== null &&
          data.filteredData !== null &&
          data.currentSmid !== null) {
        return data as SafeCommentFilter2GlobalData;
      }
      
      return null;
    } catch (error) {
      window.logger.warn('CommentFilter2のグローバルデータ取得に失敗したのじゃ:', error);
      return null;
    }
  }
} 