export const basePanelStyles = `
  :host {
    --panel-bg: linear-gradient(135deg, rgba(20, 20, 30, 0.95), rgba(30, 30, 45, 0.95));
    --panel-fg: #ffffff;
    --panel-accent: rgba(100, 150, 255, 0.3);
    --panel-accent-hover: rgba(100, 150, 255, 0.5);
    --panel-border: rgba(255, 255, 255, 0.1);
    --panel-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    --panel-radius: 16px;
    --fab-bg: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    --fab-shadow: 0 4px 20px rgba(102, 126, 234, 0.4);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans JP", sans-serif;
    font-weight: 400;
    letter-spacing: 0.02em;
  }

  #fab {
    position: fixed;
    bottom: 24px;
    right: 24px;
    width: 64px;
    height: 64px;
    border-radius: 50%;
    background: var(--fab-bg);
    color: #ffffff;
    border: none;
    cursor: pointer;
    font-size: 28px;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    z-index: 10000;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: var(--fab-shadow);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
  }

  #fab:hover {
    transform: scale(1.1) translateY(-2px);
    box-shadow: 0 8px 32px rgba(102, 126, 234, 0.6);
  }

  #fab:active {
    transform: scale(1.05) translateY(-1px);
  }

  .panel {
    position: fixed;
    bottom: 100px;
    right: 24px;
    width: 400px;
    max-height: 80vh;
    background: var(--panel-bg);
    color: var(--panel-fg);
    border-radius: var(--panel-radius);
    padding: 24px;
    box-shadow: var(--panel-shadow);
    z-index: 10000;
    display: none;
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px solid var(--panel-border);
    overflow: hidden;
  }

  .panel.visible {
    display: block;
    animation: panelSlideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  @keyframes panelSlideIn {
    from {
      opacity: 0;
      transform: translateY(20px) scale(0.95);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  /* スクロールバーのスタイリング */
  ::-webkit-scrollbar {
    width: 8px;
  }

  ::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 4px;
  }

  ::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.2);
    border-radius: 4px;
    transition: background 0.2s ease;
  }

  ::-webkit-scrollbar-thumb:hover {
    background: rgba(255, 255, 255, 0.3);
  }
`;

export class BasePanel extends HTMLElement {
  protected shadow: ShadowRoot;
  private isPanelOpen: boolean = false;
  private outsideClickListener: (event: Event) => void; // 外クリック監視用

  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: 'closed' });
    
    // 外クリック監視リスナーをバインド
    this.outsideClickListener = this.handleOutsideClick.bind(this);
  }

  protected setupFab(icon: string, title: string) {
    const fab = this.shadow.getElementById('fab');
    if (fab) {
      fab.innerHTML = icon;
      fab.title = title;
      fab.addEventListener('click', () => {
        
        this.togglePanel();
      });
      
    } else {
      window.logger.error('[BasePanel] FAB element not found in setupFab');
    }
  }

  /**
   * 外クリック処理（パネル外をクリックした場合にパネルを閉じる）
   */
  private handleOutsideClick(event: Event): void {
    if (!this.isPanelOpen) return;
    
    const mouseEvent = event as MouseEvent;
    const panel = this.shadow.querySelector('.panel');
    const fab = this.shadow.getElementById('fab');
    
    if (!panel || !fab) return;

    // クリック座標を取得
    const clickX = mouseEvent.clientX;
    const clickY = mouseEvent.clientY;
    
    // パネルとFABの領域を取得
    const panelRect = panel.getBoundingClientRect();
    const fabRect = fab.getBoundingClientRect();
    
    // クリック座標がパネル内またはFAB内にあるかチェック
    const isInsidePanel = (
      clickX >= panelRect.left && clickX <= panelRect.right &&
      clickY >= panelRect.top && clickY <= panelRect.bottom
    );
    
    const isInsideFab = (
      clickX >= fabRect.left && clickX <= fabRect.right &&
      clickY >= fabRect.top && clickY <= fabRect.bottom
    );
    
    // select要素がアクティブな場合は外クリック処理をスキップ
    const activeSelect = this.shadow.querySelector('select:focus') as HTMLSelectElement;
    if (activeSelect) {
      return;
    }
    
    // ドロップダウンメニューが開いているselect要素があるかチェック
    const selectElements = this.shadow.querySelectorAll('select') as NodeListOf<HTMLSelectElement>;
    for (const select of Array.from(selectElements)) {
      if (document.activeElement === select || select.matches(':focus')) {
        return;
      }
    }
    
    // パネル外かつFAB外の場合のみパネルを閉じる
    if (!isInsidePanel && !isInsideFab) {
      this.closePanel();
    }
  }

  private togglePanel(forceState?: boolean) {
    const panel = this.shadow.querySelector('.panel');
    if (panel) {
      // forceStateが指定されている場合はその値を使用、そうでなければ現在の状態を反転
      this.isPanelOpen = forceState !== undefined ? forceState : !this.isPanelOpen;
      
      // パネルの表示状態を更新
      panel.classList.toggle('visible', this.isPanelOpen);
      
      // 外クリック監視の開始/停止
      if (this.isPanelOpen) {
        // パネルが開いたら外クリック監視を開始
        setTimeout(() => {
          document.addEventListener('click', this.outsideClickListener, true);
        }, 100); // わずかな遅延でFABクリックイベントとの競合を避ける
      } else {
        // パネルが閉じたら外クリック監視を停止
        document.removeEventListener('click', this.outsideClickListener, true);
      }
      
    } else {
      window.logger.error('[BasePanel] Panel element not found in togglePanel');
    }
  }

  // パネルを開く
  protected openPanel() {
    this.togglePanel(true);
  }

  // パネルを閉じる
  protected closePanel() {
    this.togglePanel(false);
  }

  // パネルの状態を取得
  protected isPanelVisible(): boolean {
    return this.isPanelOpen;
  }

  // 外クリック監視を一時的に無効化
  protected temporarilyDisableOutsideClick(): void {
    document.removeEventListener('click', this.outsideClickListener, true);
  }

  // 外クリック監視を再開
  protected enableOutsideClick(): void {
    if (this.isPanelOpen) {
      document.addEventListener('click', this.outsideClickListener, true);
    }
  }

  // コンポーネントが削除される時にイベントリスナーをクリーンアップ
  disconnectedCallback() {
    document.removeEventListener('click', this.outsideClickListener, true);
  }
} 