import { ModuleInstance, ModuleConfig, ModuleStatus } from '@/types/module-types';
import { isWatchLikePage } from '@/mlink-video-controller/utils/page-detect';

/**
 * マトリックス背景モジュール
 * Matrix風のアニメーション背景を表示する
 */
export class WatchMatrixBackgroundModule implements ModuleInstance {
  public readonly config: ModuleConfig;
  
  private canvasContainer: HTMLElement | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private animationId: number | null = null;
  private _isActive: boolean = false;

  constructor(config: ModuleConfig) {
    this.config = config;
  }

  /**
   * モジュール初期化
   */
  async initialize(): Promise<void> {
    if (this._isActive) {
      
      return;
    }

    try {
      
      
      // Watch Pageかどうかチェック
      if (!this.isWatchPage()) {
        
        return;
      }

      // CSSを読み込み（失敗してもモジュールは動作する）
      try {
        await this.loadCSS();
      } catch (error) {
        window.logger.warn('[WatchMatrixBackgroundModule] CSS読み込みに失敗しましたが、モジュールは動作します:', error);
      }
      
      // キャンバスコンテナを作成
      this.createCanvasContainer();
      
      // マトリックスアニメーションを開始
      this.startMatrixAnimation();
      
      this._isActive = true;
      

    } catch (error) {
      window.logger.error('[WatchMatrixBackgroundModule] 初期化エラー:', error);
      throw error;
    }
  }

  /**
   * モジュール破棄
   */
  destroy(): void {
    if (!this._isActive) return;

    

    // アニメーションを停止
    if (this.animationId) {
      clearInterval(this.animationId);
      this.animationId = null;
    }

    // キャンバスコンテナを削除
    if (this.canvasContainer) {
      this.canvasContainer.remove();
      this.canvasContainer = null;
    }

    // 背景スタイルをリセット
    this.resetBackgroundStyle();

    this.canvas = null;
    this._isActive = false;
    
  }

  /**
   * モジュール状態確認
   */
  isActive(): boolean {
    return this._isActive && !!this.canvasContainer && !!this.canvas;
  }

  /**
   * モジュール状態取得
   */
  getStatus(): ModuleStatus {
    if (!this.isWatchPage()) {
      return ModuleStatus.INACTIVE;
    }
    
    return this._isActive ? ModuleStatus.ACTIVE : ModuleStatus.INACTIVE;
  }

  /**
   * Watch Pageかどうかの判定
   */
  private isWatchPage(): boolean {
    return isWatchLikePage();
  }

  /**
   * CSSを読み込み
   */
  private async loadCSS(): Promise<void> {
    const cssHref = '/local/features/dist/src/watch_page/background_matrix/matrix_rain.css';
    
    // 既に読み込まれているかチェック
    const existingLink = document.querySelector(`link[href="${cssHref}"]`);
    if (existingLink) {
      
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = cssHref;
      
      link.onload = () => {
        
        resolve();
      };
      link.onerror = () => {
        window.logger.error('[WatchMatrixBackgroundModule] CSS読み込み失敗:', cssHref);
        reject(new Error('CSS読み込み失敗'));
      };
      
      document.head.appendChild(link);
    });
  }

  /**
   * キャンバスコンテナを作成
   */
  private createCanvasContainer(): void {
    // 既存のコンテナがあれば削除
    const existing = document.getElementById('canvasContainer');
    if (existing) {
      existing.remove();
    }

    // コンテナを作成
    const container = document.createElement('div');
    container.id = 'canvasContainer';
    container.style.cssText = `
      position: fixed;
      left: 0;
      right: 0;
      top: 0;
      bottom: 0;
      z-index: -1;
      background-color: black;
    `;

    document.body.insertBefore(container, document.body.firstChild);
    this.canvasContainer = container;

    // キャンバスを作成
    this.createCanvas();
  }

  /**
   * キャンバスを作成
   */
  private createCanvas(): void {
    if (!this.canvasContainer) return;

    const canvas = document.createElement('canvas');
    canvas.id = 'c';
    canvas.style.cssText = `
      position: absolute;
      width: 100%;
      height: 100%;
      left: 0;
      top: 0;
      z-index: -1;
    `;

    this.canvasContainer.appendChild(canvas);
    this.canvas = canvas;
  }

  /**
   * マトリックスアニメーションを開始
   */
  private startMatrixAnimation(): void {
    if (!this.canvas) {
      window.logger.error('[WatchMatrixBackgroundModule] キャンバスが見つかりません');
      return;
    }

    const ctx = this.canvas.getContext('2d');
    if (!ctx) {
      window.logger.error('[WatchMatrixBackgroundModule] 2Dコンテキストを取得できません');
      return;
    }

    // キャンバスサイズを設定
    this.canvas.height = window.outerHeight;
    this.canvas.width = window.parent.screen.width;

    if (this.canvas.width <= 0) {
      window.logger.error('[WatchMatrixBackgroundModule] キャンバス幅が無効です');
      return;
    }

    // 背景スタイルを設定
    this.setBackgroundStyle();

    // 日本語文字
    const japaneseChars = "ｧｨｩｪｫｬｭｮｯｰｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜｦﾝ-ﾟ";
    const japanese: string[] = japaneseChars.split("");

    const fontSize: number = 23;
    const columns: number = Math.floor(this.canvas.width / fontSize);
    const drops: number[] = Array.from({ length: columns }, () => 1);

    // アニメーション開始
    this.animationId = setInterval(() => {
      this.drawMatrix(ctx, drops, japanese, fontSize, this.canvas!.height);
    }, 33) as unknown as number;
  }

  /**
   * マトリックス描画
   */
  private drawMatrix(
    ctx: CanvasRenderingContext2D,
    drops: number[],
    japanese: string[],
    fontSize: number,
    canvasHeight: number
  ): void {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    ctx.fillStyle = '#0F0'; // 緑色のテキスト
    ctx.font = `${fontSize}px arial`;

    for (let i = 0; i < drops.length; i++) {
      const text = japanese[Math.floor(Math.random() * japanese.length)];
      ctx.fillText(text, i * fontSize, drops[i] * fontSize);

      if (drops[i] * fontSize > canvasHeight && Math.random() > 0.975) {
        drops[i] = 0; // ドロップ位置をリセット
      }

      drops[i]++;
    }
  }

  /**
   * 背景スタイルを設定
   */
  private setBackgroundStyle(): void {
    const bg = document.body;
    bg.style.backgroundColor = 'black';
    bg.style.margin = '0';
    bg.style.padding = '0';
  }

  /**
   * 背景スタイルをリセット
   */
  private resetBackgroundStyle(): void {
    const bg = document.body;
    bg.style.backgroundColor = '';
    bg.style.margin = '';
    bg.style.padding = '';
  }
} 
