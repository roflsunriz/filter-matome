import { NicoCache_nlInterface } from '@/types/global-types';

/**
 * 削除動画検出・リダイレクト機能
 * ニコニコ動画で削除された動画を検出し、ローカルプレイヤーにリダイレクトします
 */
export class DeletedVideoDetector {
  private static instance: DeletedVideoDetector | null = null;
  private nicoCache!: NicoCache_nlInterface;
  private observer: MutationObserver | null = null;
  private lastUrl: string = '';
  private isEnabled: boolean = false;
  private initialized: boolean = false;

  private constructor() {
    void this.initializeNicoCache();
  }

  public static getInstance(): DeletedVideoDetector {
    if (!DeletedVideoDetector.instance) {
      DeletedVideoDetector.instance = new DeletedVideoDetector();
    }
    return DeletedVideoDetector.instance;
  }

  private async initializeNicoCache(): Promise<void> {
    // NicoCache_nlが利用可能になるまで待機
    while (!window.NicoCache_nl) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    this.nicoCache = window.NicoCache_nl;
    this.initialized = true;
    
  }

  /**
   * モジュールを有効化
   */
  public async enable(): Promise<void> {
    if (!this.initialized) {
      await this.initializeNicoCache();
    }

    if (this.isEnabled) {
      
      return;
    }

    this.isEnabled = true;
    this.setupUrlObserver();
    this.setupEventListeners();
    
    // 初回チェック
    await this.handleUnavailableVideo();
    
    
  }

  /**
   * モジュールを無効化
   */
  public disable(): void {
    if (!this.isEnabled) {
      
      return;
    }

    this.isEnabled = false;
    this.cleanup();
    
    
  }

  /**
   * URL変更を監視するMutationObserverをセットアップ
   */
  private setupUrlObserver(): void {
    this.lastUrl = location.href;

    this.observer = new MutationObserver(() => {
      if (this.isEnabled && location.href !== this.lastUrl) {
        this.lastUrl = location.href;
        void this.handleUnavailableVideo();
      }
    });

    this.observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    
  }

  /**
   * イベントリスナーをセットアップ
   */
  private setupEventListeners(): void {
    // History API の変更を検知
    window.addEventListener('popstate', this.handlePopState);
    
    // DOMContentLoaded時の処理（すでに読み込まれている場合は即座に実行）
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', this.handleDOMContentLoaded);
    } else {
      this.handleDOMContentLoaded();
    }
  }

  private handlePopState = (): void => {
    if (this.isEnabled) { void this.handleUnavailableVideo(); }
  };

  private handleDOMContentLoaded = (): void => {
    if (this.isEnabled) { void this.handleUnavailableVideo(); }
  };

  /**
   * 削除動画を検出（文言ベースでドキュメント全体を検索）
   * パフォーマンスに配慮し、body内のテキストノードのみを走査する
   */
  private detectUnavailableVideo(): boolean {
    const unavailableMessage = "お探しの動画は視聴できません";
    // まず、従来の要素検索でヒットすれば即返す
    const errorMessage: Element | null = document.querySelector(".fs_xl.fw_bold");
    if (errorMessage && errorMessage.textContent === unavailableMessage) {
      return true;
    }
    // パフォーマンス配慮のためbody直下のテキストノードのみを走査
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode(node) {
          if (typeof node.nodeValue === "string" && node.nodeValue.includes(unavailableMessage)) {
            return NodeFilter.FILTER_ACCEPT;
          }
          return NodeFilter.FILTER_SKIP;
        }
      }
    );
    let currentNode = walker.nextNode();
    while (currentNode) {
      if (currentNode.nodeValue?.includes(unavailableMessage)) {
        return true;
      }
      currentNode = walker.nextNode();
    }
    return false;
  }

  /**
   * API経由で動画の可用性をチェック
   */
  private async checkVideoAvailability(videoId: string): Promise<boolean> {
    const apiUrl: string = `https://ext.nicovideo.jp/api/getthumbinfo/${videoId}`;

    try {
      const response: Response = await fetch(apiUrl);
      const text: string = await response.text();
      const parser: DOMParser = new DOMParser();
      const xmlDoc: Document = parser.parseFromString(text, "text/xml");
      const status: string | null = xmlDoc.querySelector("nicovideo_thumb_response")?.getAttribute("status") || null;

      if (status === "fail") {
        const errorCode: string | undefined = xmlDoc.querySelector("code")?.textContent || undefined;
        return errorCode === "DELETED";
      }
      return false;
    } catch (error) {
      window.logger.debug('[DeletedVideoDetector] ext.nicovideo API check failed, fallback to watch page status確認:', error);
    }

    // Fallback: watchページをHEADリクエストしてHTTPステータスを確認
    try {
      const response: Response = await fetch(`https://www.nicovideo.jp/watch/${videoId}`, {
        method: 'HEAD',
        credentials: 'include',
        redirect: 'manual'
      });

      window.logger.debug('[DeletedVideoDetector] HEAD status check', {
        videoId,
        status: response.status
      });

      if ([400, 403, 404, 410].includes(response.status)) {
        return true;
      }

      return false;
    } catch (error) {
      window.logger.error('[DeletedVideoDetector] watchページのステータス確認に失敗しました:', error);
      return false;
    }
  }

  /**
   * 削除動画の処理メイン関数
   */
  private async handleUnavailableVideo(): Promise<void> {
    if (!this.isEnabled) return;

    const videoId: string | undefined = window.location.pathname.match(/watch\/(sm\d+)/)?.[1];
    if (!videoId) return;

    const isUnavailable: boolean = this.detectUnavailableVideo();
    const isApiUnavailable: boolean = await this.checkVideoAvailability(videoId);

    window.logger.debug('[DeletedVideoDetector] 判定結果', {
      videoId,
      domDetected: isUnavailable,
      apiDetected: isApiUnavailable
    });

    if (isUnavailable || isApiUnavailable) {
      const deletedVideoPlayer = window.NicoCache_nl.deletedVideoPlayer;
      if (!deletedVideoPlayer) {
        window.logger.warn("[DeletedVideoDetector] 削除動画プレーヤーが利用できません");
        return;
      }

      const videoTitle = this.getVideoTitle();

      try {
        window.logger.info('[DeletedVideoDetector] 削除動画プレーヤーを起動します', {
          videoId,
          videoTitle
        });
        deletedVideoPlayer.play(videoId, videoTitle);
      } catch (error) {
        window.logger.error("[DeletedVideoDetector] 削除動画プレーヤーの起動に失敗しました", error);
      }
    }
  }

  /**
   * 動画タイトルの取得を試みる（APIデータが無い場合はDOMからフォールバック）
   */
  private getVideoTitle(): string | undefined {
    const titleFromApi = window.NicoCache_nl?.watch?.apiData?.video?.title;
    if (titleFromApi && titleFromApi.length > 0) {
      return titleFromApi;
    }

    const ogTitle = document.querySelector<HTMLMetaElement>("meta[property='og:title']")?.content;
    if (ogTitle && ogTitle.length > 0) {
      return ogTitle;
    }

    const documentTitle = document.title.trim();
    if (documentTitle.length > 0) {
      return documentTitle;
    }

    return undefined;
  }

  /**
   * クリーンアップ処理
   */
  private cleanup(): void {
    // MutationObserverを停止
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }

    // イベントリスナーを削除
    window.removeEventListener('popstate', this.handlePopState);
    document.removeEventListener('DOMContentLoaded', this.handleDOMContentLoaded);
  }

  /**
   * モジュールの状態を取得
   */
  public getStatus(): { enabled: boolean; initialized: boolean } {
    return {
      enabled: this.isEnabled,
      initialized: this.initialized
    };
  }

  /**
   * デストラクタ
   */
  public destroy(): void {
    this.disable();
    DeletedVideoDetector.instance = null;
  }
} 
