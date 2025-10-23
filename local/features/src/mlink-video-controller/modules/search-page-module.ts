import {
  ModuleInstance,
  ModuleConfig,
  ModuleStatus,
} from "@/types/module-types";

/**
 * 検索ページ8列表示モジュール
 * 動画検索結果を8列で表示する機能
 */
export class SearchPageModule implements ModuleInstance {
  public config: ModuleConfig;
  private active: boolean = false;
  private styleElement: HTMLStyleElement | null = null;

  constructor(config: ModuleConfig) {
    this.config = config;
  }

  async initialize(): Promise<void> {
    try {
      await Promise.resolve();

      // 8列表示用のCSSを注入
      this.injectEightColumnCSS();

      this.active = true;
    } catch (error) {
      window.logger.error("[SearchPageModule] 初期化に失敗しました:", error);
      throw error;
    }
  }

  destroy(): void {
    try {
      // 注入したCSSを削除
      this.removeEightColumnCSS();

      this.active = false;
    } catch (error) {
      window.logger.error("[SearchPageModule] 停止処理に失敗しました:", error);
    }
  }

  isActive(): boolean {
    return this.active;
  }

  getStatus(): ModuleStatus {
    if (!this.active) {
      return ModuleStatus.INACTIVE;
    }
    return ModuleStatus.ACTIVE;
  }

  /**
   * 8列表示用のCSSを注入
   */
  private injectEightColumnCSS(): void {
    try {
      // 既存のスタイル要素があれば削除
      this.removeEightColumnCSS();

      // 新しいスタイル要素を作成
      this.styleElement = document.createElement("style");
      this.styleElement.setAttribute("data-search-module", "eight-column");

      // 元のeight_column.cssに基づく8列表示用のCSS
      this.styleElement.textContent = `
        /* 元のeight_column.cssの内容を基にした8列表示 */
        
        /* 不要な要素を非表示 */
        .tagCaption .share,
        .tagCaption .inner > .contentBody .itemDescription,
        .billboard_ad,
        .nicoadVideoItemWrapper,
        .content.videoBox.teibanVideos,
        .TagkeyArticleBox,
        .columnChange .open,
        .columnChange .close,
        .column700-300 .sub,
        .NewVideosPage-sub,
        .uad.nicodicNicoadVideoList {
          display: none !important;
        }

        /* ヘッダー部分の調整 */
        .tagCaption .inner > .contentHeader {
          float: left !important;
        }

        .tagCaption .contentHeader h1 {
          width: auto !important;
        }

        .tagCaption .contentHeader {
          margin-right: 10px !important;
        }

        .tagCaption .contentBody {
          padding-top: 1px !important;
        }

        /* メインコンテナの幅調整 */
        .inner,
        .column700-300 .main,
        .video {
          width: 100% !important;
          max-width: 1470px !important;
          min-width: auto !important;
        }

        /* カラム変更ボタンの調整 */
        .columnChange li.two {
          display: block !important;
        }

        .columnChange {
          padding-right: 8px !important;
        }

        .columnChange.open,
        .columnChange.close {
          background-image: none !important;
        }

        .column700-300 .main {
          padding-right: 4px !important;
        }

        /* 動画アイテムのレイアウト調整 */
        .video .item:nth-child(4n + 1) {
          clear: none !important;
        }

        .video .item {
          margin-right: 5px !important;
        }

        .video.videoList02 .item:nth-child(2n + 1) {
          clear: none !important;
        }

        .video.videoList02 .item {
          margin-right: -1px !important;
        }

        /* 新しい動画ページの調整 */
        .NewVideosPage-body {
          width: 100% !important;
          max-width: 1470px !important;
          min-width: auto !important;
        }

        .NewVideosPage-main {
          flex: 0 0 100% !important;
        }

        .NewVideosPage-videoList {
          width: 100% !important;
        }

        .NewVideosPage-videoList_col4 > :nth-child(4n-3) {
          margin-left: 8px !important;
        }

        .NewVideosPage-videoList_col4 > :nth-child(6n-5) {
          margin-left: 0 !important;
        }
      `;

      // headに追加
      document.head.appendChild(this.styleElement);
    } catch (error) {
      window.logger.error("[SearchPageModule] CSS注入でエラー:", error);
    }
  }

  /**
   * 注入したCSSを削除
   */
  private removeEightColumnCSS(): void {
    try {
      if (this.styleElement && this.styleElement.parentNode) {
        this.styleElement.parentNode.removeChild(this.styleElement);
        this.styleElement = null;
      }

      // 念のため、data属性で検索して削除
      const existingStyles = document.querySelectorAll(
        'style[data-search-module="eight-column"]',
      );
      existingStyles.forEach((style) => {
        if (style.parentNode) {
          style.parentNode.removeChild(style);
        }
      });
    } catch (error) {
      window.logger.error("[SearchPageModule] CSS削除でエラー:", error);
    }
  }
}
