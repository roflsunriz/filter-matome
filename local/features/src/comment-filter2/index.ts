// CommentFilter2 メインエントリーポイント
import { DataInterceptor } from "@/comment-filter2/proxy/data-interceptor";
import { UIManager } from "@/comment-filter2/components/ui-manager";
import { VideoPlayerBridge } from "@/comment-filter2/integrations/video-player-bridge";
import { OfficialPlayerBridge } from "@/comment-filter2/integrations/official-player-bridge";
import {
  OfficialCommentMenu,
  type ContextMenuNgApplyResult,
  type OfficialCommentMenuApi,
} from "@/comment-filter2/integrations/official-comment-menu";
import { CONSTANTS } from "@/comment-filter2/utils/constants";
import { VideoPlayerBridgeStatus } from "@/types/video-player-bridge-types";

export class CommentFilter2 {
  private dataInterceptor: DataInterceptor;
  private uiManager: UIManager;
  private videoPlayerBridge: VideoPlayerBridge;
  private officialPlayerBridge: OfficialPlayerBridge;
  private officialCommentMenu: OfficialCommentMenu;
  private isInitialized: boolean = false;
  private keyboardShortcutEnabled: boolean = true;

  constructor() {
    this.dataInterceptor = new DataInterceptor();
    this.videoPlayerBridge = new VideoPlayerBridge();
    this.officialPlayerBridge = new OfficialPlayerBridge();
    this.uiManager = new UIManager(
      () => this.videoPlayerBridge.forceSync(),
      () => this.videoPlayerBridge.getStatus().isVideoPlayerDetected,
      () => this.officialPlayerBridge.reloadComments(),
    );
    this.officialCommentMenu = new OfficialCommentMenu({
      writeClipboard: async (text) => {
        if (typeof navigator.clipboard?.writeText !== "function") {
          throw new Error("クリップボードAPIを利用できません");
        }
        await navigator.clipboard.writeText(text);
      },
      openWindow: (url) => {
        window.open(url, "_blank", "noopener,noreferrer");
      },
      addNgWord: (word) =>
        this.addContextMenuRule(() =>
          this.uiManager.addContextMenuNgWord(word),
        ),
      addNgUser: (userId) =>
        this.addContextMenuRule(() =>
          this.uiManager.addContextMenuNgUser(userId),
        ),
      notify: (level, message) => {
        window.toastr?.[level]?.(message);
      },
    });

    void this.initialize();
  }

  /**
   * CommentFilter2の初期化
   */
  private async initialize(): Promise<void> {
    await Promise.resolve();
    try {
      // キーボードショートカットを設定
      this.setupKeyboardShortcuts();

      // データの変更を監視
      this.startDataMonitoring();

      this.isInitialized = true;
      window.logger?.info(
        "[CommentFilter2] Initialization completed successfully",
      );
    } catch (error) {
      window.logger?.error("[CommentFilter2] Initialization failed:", error);
    }
  }

  /**
   * キーボードショートカットを設定
   */
  private setupKeyboardShortcuts(): void {
    if (!this.keyboardShortcutEnabled) return;

    document.addEventListener("keydown", (event) => {
      // Ctrl+Shift+F でUIを表示/非表示
      if (event.ctrlKey && event.shiftKey && event.key === "F") {
        event.preventDefault();
        void this.toggleUI();
        window.logger?.debug(
          "[CommentFilter2] UI toggled via keyboard shortcut",
        );
      }
    });
  }

  /**
   * データの変更を監視してフィルターを適用（完全なSPA対応）
   */
  private startDataMonitoring(): void {
    // 初回ページロード時に1回実行
    void this.processCommentData();

    // コメントデータ更新時のイベントリスナー
    window.addEventListener(CONSTANTS.EVENTS.DATA_UPDATED, () => {
      window.logger?.debug(
        "[CommentFilter2] Processing comment data due to DATA_UPDATED event",
      );
      void this.processCommentData();
    });

    // SMID変更（動画切替・SPA遷移）時のイベントリスナー
    window.addEventListener(CONSTANTS.EVENTS.SMID_CHANGED, (event: Event) => {
      const customEvent = event as CustomEvent;
      const detail = (customEvent.detail ?? {}) as {
        smid?: unknown;
        previousSmid?: unknown;
      };
      const smid = typeof detail.smid === "string" ? detail.smid : "";
      const previousSmid =
        typeof detail.previousSmid === "string" ? detail.previousSmid : "";

      window.logger?.info(
        `[CommentFilter2] SPA navigation detected: ${previousSmid} -> ${smid}`,
      );

      // SPA遷移時はvideo-player-bridgeをリセット
      this.videoPlayerBridge.resetForSPANavigation();

      // コメントデータを処理
      void this.processCommentData();
    });

    window.logger?.info(
      "[CommentFilter2] Event-driven data monitoring initialized (Full SPA support)",
    );
  }

  /**
   * コメントデータの処理
   */

  /**
   * 共通ヘルパー経由でSMID（動画ID）を抽出
   */
  private async extractSmidFromLocation(): Promise<string | null> {
    try {
      if (typeof window.commonHelper?.getVideoIdWithFallback === "function") {
        return await window.commonHelper.getVideoIdWithFallback(
          window.location.href,
        );
      }
      window.logger?.warn(
        "[CommentFilter2] commonHelper.getVideoIdWithFallbackが未定義です",
      );
      return null;
    } catch (error) {
      window.logger?.warn(
        "[CommentFilter2] Failed to extract SMID via commonHelper:",
        error,
      );
      return null;
    }
  }

  private async processCommentData(): Promise<void> {
    await Promise.resolve();
    try {
      const globalData = DataInterceptor.getGlobalData();
      const fallbackSmid = await this.extractSmidFromLocation();
      const smid = globalData?.currentSmid ?? fallbackSmid;

      if (globalData?.originalData && smid) {
        // フィルターを適用
        await this.uiManager.applyFilter(smid);
      }
    } catch (error) {
      window.logger?.error(
        "[CommentFilter2] Comment data processing failed:",
        error,
      );
    }
  }

  /**
   * UIを表示
   */
  public async showUI(): Promise<void> {
    await this.uiManager.show();
  }

  /**
   * UIを非表示
   */
  public hideUI(): void {
    this.uiManager.hide();
  }

  /**
   * UIの表示状態を切り替え
   */
  public async toggleUI(): Promise<void> {
    await this.uiManager.toggle();
  }

  /**
   * video_playerとの連携状態を取得
   */
  public getVideoPlayerStatus(): VideoPlayerBridgeStatus {
    return this.videoPlayerBridge.getStatus();
  }

  /**
   * キーボードショートカットの有効/無効を切り替え
   */
  public setKeyboardShortcutEnabled(enabled: boolean): void {
    this.keyboardShortcutEnabled = enabled;
  }

  /**
   * 初期化状態を取得
   */
  public isReady(): boolean {
    return this.isInitialized;
  }

  public getOfficialCommentMenuApi(): OfficialCommentMenuApi {
    return this.officialCommentMenu;
  }

  private async addContextMenuRule(
    addRule: () => Promise<ContextMenuNgApplyResult["status"]>,
  ): Promise<ContextMenuNgApplyResult> {
    const status = await addRule();
    if (status === "already-exists") {
      return { status, reapplied: true };
    }
    try {
      return {
        status,
        reapplied: await this.officialPlayerBridge.reloadComments(),
      };
    } catch (error) {
      window.logger?.error(
        "[CommentFilter2] Failed to reapply a context-menu NG rule:",
        error,
      );
      return { status, reapplied: false };
    }
  }

  /**
   * CommentFilter2を完全に無効化
   */
  public destroy(): void {
    try {
      this.dataInterceptor.disable();
      this.uiManager.destroy();
      this.videoPlayerBridge.destroy();

      if (window.FilterMatomeCommentMenuApi === this.officialCommentMenu) {
        delete window.FilterMatomeCommentMenuApi;
      }

      this.isInitialized = false;
      window.logger?.info("[CommentFilter2] Destroyed successfully");
    } catch (error) {
      window.logger?.error("[CommentFilter2] Destruction failed:", error);
    }
  }

  /**
   * デバッグ情報を取得
   */
  public getDebugInfo(): {
    isInitialized: boolean;
    keyboardShortcutEnabled: boolean;
    globalData: {
      hasOriginalData: boolean;
      hasFilteredData: boolean;
      currentSmid: string | null;
      lastUpdated: number | null;
    };
    videoPlayer: VideoPlayerBridgeStatus;
    constants: typeof CONSTANTS;
  } {
    const globalData = DataInterceptor.getGlobalData();
    const videoPlayerStatus = this.videoPlayerBridge.getStatus();

    return {
      isInitialized: this.isInitialized,
      keyboardShortcutEnabled: this.keyboardShortcutEnabled,
      globalData: {
        hasOriginalData: !!globalData?.originalData,
        hasFilteredData: !!globalData?.filteredData,
        currentSmid: globalData?.currentSmid ?? null,
        lastUpdated: globalData?.lastUpdated ?? null,
      },
      videoPlayer: videoPlayerStatus,
      constants: CONSTANTS,
    };
  }
}

// グローバルに公開（デバッグやコンソールからのアクセス用）
declare global {
  interface Window {
    CommentFilter2Instance?: CommentFilter2;
  }
}

let commentFilter2Instance: CommentFilter2 | null = null;

export function startCommentFilter2(): CommentFilter2 {
  if (commentFilter2Instance) {
    return commentFilter2Instance;
  }

  try {
    commentFilter2Instance = new CommentFilter2();
    window.CommentFilter2Instance = commentFilter2Instance;
    window.FilterMatomeCommentMenuApi =
      commentFilter2Instance.getOfficialCommentMenuApi();

    // 初期化完了イベントを送信
    window.dispatchEvent(new CustomEvent("CommentFilter2Ready"));

    window.logger?.info("[CommentFilter2] Auto-initialization completed");
    window.logger?.info(
      "[CommentFilter2] Use Ctrl+Shift+F to toggle UI or call via mlink-video-controller",
    );
    window.logger?.info(
      "[CommentFilter2] Access via window.CommentFilter2Instance for debugging",
    );
    return commentFilter2Instance;
  } catch (error) {
    window.logger?.error("[CommentFilter2] Initialization failed:", error);
    throw error;
  }
}

// エクスポート
export default CommentFilter2;
