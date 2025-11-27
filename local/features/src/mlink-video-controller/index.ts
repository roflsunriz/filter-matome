import "@/mlink-video-controller/panels/link-video";
import { NicoVideoPlayer } from "@/mlink-video-controller/services/nico-video-player";

class PanelManager {
  private panel: HTMLElement | null = null;
  private observer: MutationObserver;
  private currentUrl: string = "";

  constructor() {
    // ページの変更を監視
    this.observer = new MutationObserver(this.handleDOMChanges.bind(this));
    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    // URL変更を監視（SPA対応）
    this.currentUrl = location.href;
    this.setupUrlWatching();

    // 初期化
    this.initialize();
  }

  private handleDOMChanges(mutations: MutationRecord[]) {
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
    try {
      window.logger?.info(
        "[MlinkVideoController] Reinitializing for SPA navigation",
      );

      // プレイヤーを再初期化
      NicoVideoPlayer.getInstance().reinitialize();

      // モジュールマネージャーも再初期化（動的インポートでモジュール取得）
      const { ModuleManager } = await import(
        "@/mlink-video-controller/module-handlers/module-manager"
      );
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
    const previousUrl = this.currentUrl;
    this.currentUrl = location.href;

    // watch動画ページへの遷移を検出
    const isWatchPage = /\/watch\/[a-z]{2}\d+/.test(location.pathname);
    const wasWatchPage = /\/watch\/[a-z]{2}\d+/.test(
      new URL(previousUrl).pathname,
    );

    // 動画IDが変更されたかチェック
    const currentVideoId = this.extractVideoId(this.currentUrl);
    const previousVideoId = this.extractVideoId(previousUrl);
    const videoIdChanged = currentVideoId !== previousVideoId;

    window.logger?.info("[MlinkVideoController] SPA navigation detected:", {
      from: previousUrl.substring(0, 50) + "...",
      to: this.currentUrl.substring(0, 50) + "...",
      isWatchPage,
      wasWatchPage,
      videoIdChanged,
      currentVideoId,
      previousVideoId,
    });

    // watch動画ページに遷移した場合、または動画IDが変更された場合
    if (isWatchPage && (videoIdChanged || !wasWatchPage)) {
      window.logger?.info(
        "[MlinkVideoController] Reinitializing for new video or page type change",
      );
      // DOM更新を待ってから再初期化（非同期処理を明示的にvoidマーク）
      setTimeout(() => {
        void this.reinitialize();
      }, 300); // タイミング調整（短縮してレスポンスを改善）
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

// ページ読み込み完了後にマネージャーを初期化
document.addEventListener("DOMContentLoaded", () => {
  new PanelManager();
});
