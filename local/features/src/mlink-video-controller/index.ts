import '@/mlink-video-controller/panels/link-video';
import { NicoVideoPlayer } from '@/mlink-video-controller/services/nico-video-player';

class PanelManager {
  private panel: HTMLElement | null = null;
  private observer: MutationObserver;
  private currentUrl: string = '';

  constructor() {
    // ページの変更を監視
    this.observer = new MutationObserver(this.handleDOMChanges.bind(this));
    this.observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    // URL変更を監視（SPA対応）
    this.currentUrl = location.href;
    this.setupUrlWatching();

    // 初期化
    this.initialize();
  }

  private handleDOMChanges(mutations: MutationRecord[]) {
    // video要素の追加/削除を検知
    const videoElementChanged = mutations.some(mutation => {
      return Array.from(mutation.addedNodes).some(node => 
        node instanceof HTMLElement && (
          node.tagName === 'VIDEO' || 
          node.querySelector('video')
        )
      ) ||
      Array.from(mutation.removedNodes).some(node =>
        node instanceof HTMLElement && (
          node.tagName === 'VIDEO' ||
          node.querySelector('video')
        )
      );
    });

    if (videoElementChanged) {
      // video要素が変更された場合は再初期化
      this.reinitialize();
    }
  }

  private initialize() {
    // パネルがまだ存在しない場合のみ作成
    if (!this.panel) {
      this.panel = document.createElement('mlink-video-controller');
      document.body.appendChild(this.panel);
    }
  }

  private reinitialize() {
    // プレイヤーを再初期化
    NicoVideoPlayer.getInstance().reinitialize();
  }

  private setupUrlWatching() {
    // popstateイベント（戻る/進むボタン）
    window.addEventListener('popstate', () => {
      this.handleUrlChange();
    });

    // SPAのプッシュステート対応（periodicalチェック）
    setInterval(() => {
      if (location.href !== this.currentUrl) {
        this.handleUrlChange();
      }
    }, 1000);
  }

  private handleUrlChange() {
    const previousUrl = this.currentUrl;
    this.currentUrl = location.href;

    // watch動画ページへの遷移を検出
    const isWatchPage = /\/watch\/[a-z]{2}\d+/.test(location.pathname);
    const wasWatchPage = /\/watch\/[a-z]{2}\d+/.test(new URL(previousUrl).pathname);

    window.logger?.info('URL変更を検出:', {
      from: previousUrl,
      to: this.currentUrl,
      isWatchPage,
      wasWatchPage
    });

    if (isWatchPage) {
      // watch動画ページに遷移した場合
      setTimeout(() => {
        this.reinitialize();
      }, 500); // DOM更新を待つ
    }
  }
}

// ページ読み込み完了後にマネージャーを初期化
document.addEventListener('DOMContentLoaded', () => {
  new PanelManager();
}); 