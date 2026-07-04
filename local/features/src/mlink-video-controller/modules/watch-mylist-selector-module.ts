import {
  ModuleInstance,
  ModuleConfig,
  ModuleStatus,
  PageType,
  ModuleCategory,
} from "@/types/module-types";
import { createMaterialIcon } from "@/common/material-icons";

export const watchMylistSelectorModuleConfig: ModuleConfig = {
  id: "watch_mylist_selector",
  name: "マイリストセレクタ",
  description: "カスタムマイリストへの動画追加UIを提供します",
  version: "1.0.0",
  enabled: false,
  targetPages: [PageType.WATCH, PageType.SEARCH],
  dependencies: [],
  category: ModuleCategory.FUNCTIONALITY,
  icon: createMaterialIcon("edit", { style: "outlined", color: "white" }),
};

/**
 * マイリストセレクターモジュール
 * カスタムマイリストへの動画追加UIを提供する
 */
export class WatchMylistSelectorModule implements ModuleInstance {
  public readonly config: ModuleConfig;

  private _isActive: boolean = false;
  private addToMylistButton: HTMLElement | null = null;
  private styleElement: HTMLStyleElement | null = null;

  // 統合されたCSS
  private readonly styles = `
    /* Mylist2ボタンのスタイル */
    #Mylist2Button {
      display: inline-flex;
      align-items: center;
      border: none;
      cursor: pointer;
      color: #fff;
      font-size: 12px;
      transition: all 0.2s ease;
      border-radius: 4px;
    }

    #Mylist2Button:hover {
      background: rgba(255, 255, 255, 0.1);
      transform: translateY(-1px);
    }

    #Mylist2Button svg {
      width: 20px;
      height: 20px;
      fill: currentColor;
    }

    .cml2-btn-text {
      display: inline-block;
    }

    .mylist-selector-modal {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.7);
      z-index: 8500;
      display: flex;
      justify-content: center;
      align-items: center;
    }

    .mylist-selector-content {
      background: #1a1b1c;
      color: #ffffff;
      padding: 20px;
      border-radius: 5px;
      min-width: 300px;
      max-width: 90%;
      max-height: 90vh;
      overflow-y: auto;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.5);
    }

    .mylist-selector-content h3 {
      color: #ffffff;
      margin: 0 0 15px 0;
      padding-bottom: 10px;
      border-bottom: 1px solid #333;
    }

    .mylist-item {
      padding-top: 4px;
      padding-bottom: 4px;
      cursor: pointer;
      transition: background-color 0.2s;
    }

    .mylist-item:last-child {
      padding-bottom: 25px;
    }

    .mylist-item:hover {
      background: #2a2b2c;
    }

    .mylist-item.active {
      background: #2a88bd;
    }

    #newMylistName {
      flex: 1;
      padding: 8px;
      margin-right: 10px;
      background: #2a2b2c;
      border: 1px solid #444;
      color: #ffffff;
      border-radius: 4px;
    }

    #newMylistName::placeholder {
      color: #888;
    }

    #createNewMylist {
      padding: 8px 16px;
      background: #2a88bd;
      border: none;
      color: #ffffff;
      border-radius: 4px;
      cursor: pointer;
    }

    #createNewMylist:hover {
      background: #3498db;
    }

    #closeMylistSelector {
      width: 100%;
      padding: 8px;
      margin-top: 15px;
      background: #333;
      border: none;
      color: #ffffff;
      border-radius: 4px;
      cursor: pointer;
    }

    #closeMylistSelector:hover {
      background: #444;
    }

    .mylist-search-input {
      width: 100%;
      padding: 8px;
      margin-bottom: 10px;
      border: 1px solid #ccc;
      border-radius: 4px;
    }

    .mylist-item.hidden {
      display: none;
    }

    .suggested-mylists {
      margin-bottom: 15px;
      padding: 10px;
      background: #010f1b;
      border-radius: 5px;
    }

    .suggested-mylists h4 {
      margin: 0 0 10px 0;
      color: #ffffff;
    }

    .mylist-item.suggested {
      background: #010f1b;
      border-left: 3px solid #2196f3;
      padding: 8px 12px;
      margin-bottom: 4px;
    }

    .mylist-item.suggested:hover {
      background: #041a2e;
      transform: translateX(2px);
      transition: all 0.2s ease;
    }

    .mylist-item.suggested .mylist-name {
      font-weight: bold;
    }

    .match-info {
      font-size: 0.85em;
      color: #666;
      margin-top: 4px;
    }
  `;

  constructor(config: ModuleConfig) {
    this.config = config;
  }

  /**
   * モジュール初期化
   */
  async initialize(): Promise<void> {
    if (this._isActive) {
      await Promise.resolve();
      return;
    }

    try {
      await Promise.resolve();

      // Watch PageまたはSearch Pageかどうかチェック
      if (!this.isTargetPage()) {
        return;
      }

      // スタイルを注入
      this.injectStyles();

      this._isActive = true;
    } catch (error) {
      window.logger.error("[WatchMylistSelectorModule] 初期化エラー:", error);
      throw error;
    }
  }

  /**
   * モジュール破棄
   */
  destroy(): void {
    if (!this._isActive) return;

    // ボタンを削除
    if (this.addToMylistButton) {
      this.addToMylistButton.remove();
      this.addToMylistButton = null;
    }

    // スタイルを削除
    this.removeStyles();

    this._isActive = false;
  }

  /**
   * スタイルを注入
   */
  private injectStyles(): void {
    // 既存のスタイルエレメントがある場合は削除
    this.removeStyles();

    // 新しいスタイルエレメントを作成
    this.styleElement = document.createElement("style");
    this.styleElement.type = "text/css";
    this.styleElement.textContent = this.styles;
    this.styleElement.setAttribute("data-module", "WatchMylistSelectorModule");

    // headに追加
    document.head.appendChild(this.styleElement);
  }

  /**
   * スタイルを削除
   */
  private removeStyles(): void {
    if (this.styleElement) {
      this.styleElement.remove();
      this.styleElement = null;
    }
  }

  /**
   * モジュール状態確認
   */
  isActive(): boolean {
    return this._isActive && !!this.styleElement;
  }

  /**
   * モジュール状態取得
   */
  getStatus(): ModuleStatus {
    if (!this.isTargetPage()) {
      return ModuleStatus.INACTIVE;
    }

    return this._isActive ? ModuleStatus.ACTIVE : ModuleStatus.INACTIVE;
  }

  /**
   * 対象ページかどうかの判定
   */
  private isTargetPage(): boolean {
    const pathname = window.location.pathname;
    return /\/watch\//.test(pathname) || /\/search\//.test(pathname);
  }
}
