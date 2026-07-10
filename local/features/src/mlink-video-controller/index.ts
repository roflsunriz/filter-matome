import "@/mlink-video-controller/panels/link-video";
import { CommentApiCache } from "@/mlink-video-controller/managers/comment-api-cache";
import { NicoVideoPlayer } from "@/mlink-video-controller/services/nico-video-player";
import { isWatchLikePage } from "@/mlink-video-controller/utils/page-detect";

class PanelManager {
  private panel: HTMLElement | null = null;
  private observer: MutationObserver;
  private currentUrl: string = "";
  private isReinitializing: boolean = false; // 再初期化中フラグ
  private lastPageType: "watch" | "other" = "other"; // 前回のページタイプ

  constructor() {
    // ページの変更を監視
    this.observer = new MutationObserver(this.handleDOMChanges.bind(this));
    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    // URL変更を監視（SPA対応）
    this.currentUrl = location.href;
    this.lastPageType = this.detectPageType(location.href);
    this.setupUrlWatching();

    // 初期化
    this.initialize();
  }

  /**
   * URLからページタイプを判定
   */
  private detectPageType(url: string): "watch" | "other" {
    try {
      const parsedUrl = new URL(url, window.location.href);
      return isWatchLikePage(parsedUrl as unknown as Location)
        ? "watch"
        : "other";
    } catch {
      return /\/watch\/[a-z]{2}\d+/i.test(url) ? "watch" : "other";
    }
  }

  private handleDOMChanges(mutations: MutationRecord[]) {
    // 再初期化中は処理しない
    if (this.isReinitializing) {
      return;
    }

    // パネル自身の変更は無視（無限ループ防止）
    const isPanelChange = mutations.some((mutation) => {
      return (
        Array.from(mutation.addedNodes).some(
          (node) =>
            node instanceof HTMLElement &&
            node.tagName === "MLINK-VIDEO-CONTROLLER",
        ) ||
        Array.from(mutation.removedNodes).some(
          (node) =>
            node instanceof HTMLElement &&
            node.tagName === "MLINK-VIDEO-CONTROLLER",
        )
      );
    });

    if (isPanelChange) {
      return;
    }

    // video要素の追加/削除を検知
    const videoElementChanged = mutations.some((mutation) => {
      return (
        Array.from(mutation.addedNodes).some(
          (node) =>
            node instanceof HTMLElement &&
            (node.tagName === "VIDEO" || node.querySelector("video")),
        ) ||
        Array.from(mutation.removedNodes).some(
          (node) =>
            node instanceof HTMLElement &&
            (node.tagName === "VIDEO" || node.querySelector("video")),
        )
      );
    });

    if (videoElementChanged) {
      // video要素が変更された場合は再初期化（非同期処理を明示的にvoidマーク）
      void this.reinitialize();
    }
  }

  private initialize() {
    // パネルがまだ存在しない場合のみ作成
    if (!this.panel) {
      this.panel = document.createElement("mlink-video-controller");
      document.body.appendChild(this.panel);
    }
  }

  private async reinitialize(): Promise<void> {
    // 再初期化中フラグチェック（多重実行防止）
    if (this.isReinitializing) {
      window.logger?.debug(
        "[MlinkVideoController] Reinitialize already in progress, skipping",
      );
      return;
    }

    try {
      this.isReinitializing = true;
      window.logger?.info(
        "[MlinkVideoController] Reinitializing for SPA navigation",
      );

      // プレイヤーを再初期化
      NicoVideoPlayer.getInstance().reinitialize();

      // パネル（UI）のSPA遷移処理を呼び出し
      if (this.panel) {
        const mlinkPanel = this.panel as unknown as {
          handleSPANavigation?: () => Promise<void>;
        };
        if (typeof mlinkPanel.handleSPANavigation === "function") {
          await mlinkPanel.handleSPANavigation();
        }
      }

      // モジュールマネージャーも再初期化（動的インポートでモジュール取得）
      const { ModuleManager } =
        await import("@/mlink-video-controller/module-handlers/module-manager");
      const moduleManager = ModuleManager.getInstance();
      await moduleManager.reinitializeForSPA();

      window.logger?.info(
        "[MlinkVideoController] Reinitialization completed successfully",
      );
    } catch (error) {
      window.logger?.error(
        "[MlinkVideoController] Reinitialization failed:",
        error,
      );
    } finally {
      // 再初期化完了後、少し遅延してからフラグをリセット
      setTimeout(() => {
        this.isReinitializing = false;
      }, 500);
    }
  }

  private setupUrlWatching() {
    // 既存のフックを保存してチェーン呼び出し可能にする
    const existingPushState = history.pushState.bind(history);
    const existingReplaceState = history.replaceState.bind(history);

    // History API をフック（SPA対応）
    history.pushState = (...args: Parameters<typeof history.pushState>) => {
      // 既存のフック（他モジュールが設定したもの）を呼び出し
      existingPushState(...args);
      // URL変更を処理
      setTimeout(() => this.handleUrlChange(), 100);
    };

    history.replaceState = (
      ...args: Parameters<typeof history.replaceState>
    ) => {
      // 既存のフック（他モジュールが設定したもの）を呼び出し
      existingReplaceState(...args);
      // URL変更を処理
      setTimeout(() => this.handleUrlChange(), 100);
    };

    // popstateイベント（戻る/進むボタン）
    window.addEventListener("popstate", () => {
      setTimeout(() => this.handleUrlChange(), 100);
    });

    window.logger?.info(
      "[MlinkVideoController] SPA navigation hooks initialized (chaining compatible)",
    );
  }

  private handleUrlChange() {
    // 再初期化中は処理しない
    if (this.isReinitializing) {
      window.logger?.debug(
        "[MlinkVideoController] Reinitialize in progress, skipping URL change handler",
      );
      return;
    }

    const previousUrl = this.currentUrl;
    this.currentUrl = location.href;

    // 現在と前回のページタイプを判定
    const currentPageType = this.detectPageType(this.currentUrl);
    const previousPageType = this.lastPageType;
    const pageTypeChanged = currentPageType !== previousPageType;

    // 動画IDが変更されたかチェック
    const currentVideoId = this.extractVideoId(this.currentUrl);
    const previousVideoId = this.extractVideoId(previousUrl);
    const videoIdChanged = currentVideoId !== previousVideoId;

    window.logger?.info("[MlinkVideoController] SPA navigation detected:", {
      from: previousUrl.substring(0, 50) + "...",
      to: this.currentUrl.substring(0, 50) + "...",
      currentPageType,
      previousPageType,
      pageTypeChanged,
      videoIdChanged,
      currentVideoId,
      previousVideoId,
    });

    // ページタイプが変更された場合もパネルは維持し、利用可能状態だけ更新
    if (pageTypeChanged) {
      window.logger?.info(
        "[MlinkVideoController] Page type changed, reinitializing without panel recreation",
      );
      this.lastPageType = currentPageType;

      setTimeout(() => {
        void this.reinitialize();
      }, 300);
      return;
    }

    // 同じページタイプ内での動画ID変更 - 通常の再初期化
    if (currentPageType === "watch" && videoIdChanged) {
      window.logger?.info(
        "[MlinkVideoController] Video ID changed within watch page, reinitializing",
      );
      // DOM更新を待ってから再初期化
      setTimeout(() => {
        void this.reinitialize();
      }, 300);
    }
  }

  /**
   * URLから動画IDを抽出
   */
  private extractVideoId(url: string): string | null {
    const match = url.match(/\/watch\/([a-z]{2}\d+)/i);
    return match ? match[1].toLowerCase() : null;
  }
}

let started = false;

export function startMlinkVideoController(): void {
  if (started) {
    return;
  }
  started = true;

  CommentApiCache.getInstance().install();
  new PanelManager();
}
