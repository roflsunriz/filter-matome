/**
 * アクションメニューマネージャー
 * ポップオーバー形式のアクションメニューを管理する（シングルトン）
 */

import "@/types/global.d.ts";
import {
  createMaterialIcon,
  hydrateMaterialIconImages,
} from "@/common/material-icons";
import type { DBVideo } from "@/types/video-types";
import type { KeywordInfo } from "@/types/mylist-types";

/** メニューアイテムの定義 */
export interface ActionMenuItem {
  id: string;
  label: string;
  icon: string;
  danger?: boolean;
}

/** メニューのコンテキストデータ */
export type ActionMenuContext =
  | { type: "video"; data: DBVideo; element: HTMLElement }
  | { type: "keyword"; data: KeywordInfo; element: HTMLElement };

/** アクションハンドラーの型 */
export type ActionHandler = (context: ActionMenuContext) => Promise<void>;

/** 動画用メニューアイテム */
export const VIDEO_MENU_ITEMS: ActionMenuItem[] = [
  { id: "move", label: "移動", icon: "drive_file_move" },
  { id: "copy", label: "コピー", icon: "content_copy" },
  { id: "refresh", label: "情報更新", icon: "refresh" },
  { id: "details", label: "詳細", icon: "info" },
  { id: "delete", label: "削除", icon: "delete", danger: true },
];

/** キーワード用メニューアイテム */
export const KEYWORD_MENU_ITEMS: ActionMenuItem[] = [
  { id: "edit", label: "編集", icon: "edit" },
  { id: "move", label: "移動", icon: "drive_file_move" },
  { id: "copy", label: "コピー", icon: "content_copy" },
  { id: "delete", label: "削除", icon: "delete", danger: true },
];

/**
 * アクションメニューマネージャークラス
 */
export class ActionMenuManager {
  private popover: HTMLElement | null = null;
  private currentContext: ActionMenuContext | null = null;
  private handlers: Map<string, ActionHandler> = new Map();
  private isVisible = false;
  private boundHandleOutsideClick: (e: MouseEvent) => void;
  private boundHandleKeydown: (e: KeyboardEvent) => void;

  constructor() {
    this.boundHandleOutsideClick = this.handleOutsideClick.bind(this);
    this.boundHandleKeydown = this.handleKeydown.bind(this);
  }

  /**
   * 初期化（ポップオーバー要素を作成）
   */
  initialize(): void {
    if (this.popover) return;

    this.popover = document.createElement("div");
    this.popover.className = "cml2-action-popover";
    this.popover.style.display = "none";
    this.popover.setAttribute("role", "menu");
    this.popover.setAttribute("aria-hidden", "true");

    document.body.appendChild(this.popover);

    window.logger?.info("アクションメニューマネージャーを初期化しました");
  }

  /**
   * アクションハンドラーを登録
   */
  registerHandler(actionId: string, handler: ActionHandler): void {
    this.handlers.set(actionId, handler);
  }

  /**
   * 複数のハンドラーを一括登録
   */
  registerHandlers(handlers: Record<string, ActionHandler>): void {
    Object.entries(handlers).forEach(([id, handler]) => {
      this.handlers.set(id, handler);
    });
  }

  /**
   * メニューを表示
   */
  show(anchorElement: HTMLElement, context: ActionMenuContext): void {
    if (!this.popover) {
      this.initialize();
    }

    this.currentContext = context;

    // メニューアイテムを構築
    const menuItems =
      context.type === "video" ? VIDEO_MENU_ITEMS : KEYWORD_MENU_ITEMS;
    this.buildMenu(menuItems);

    // 位置を計算
    this.positionPopover(anchorElement);

    // 表示
    if (this.popover) {
      this.popover.style.display = "block";
      this.popover.setAttribute("aria-hidden", "false");
    }
    this.isVisible = true;

    // 外部クリックとキーボードイベントを監視
    setTimeout(() => {
      document.addEventListener("click", this.boundHandleOutsideClick);
      document.addEventListener("keydown", this.boundHandleKeydown);
    }, 0);
  }

  /**
   * メニューを非表示
   */
  hide(): void {
    if (!this.popover || !this.isVisible) return;

    this.popover.style.display = "none";
    this.popover.setAttribute("aria-hidden", "true");
    this.isVisible = false;
    this.currentContext = null;

    document.removeEventListener("click", this.boundHandleOutsideClick);
    document.removeEventListener("keydown", this.boundHandleKeydown);
  }

  /**
   * メニューが表示中か
   */
  isMenuVisible(): boolean {
    return this.isVisible;
  }

  /**
   * メニューを構築
   */
  private buildMenu(items: ActionMenuItem[]): void {
    if (!this.popover) return;

    this.popover.innerHTML = "";

    items.forEach((item) => {
      const button = document.createElement("button");
      button.className = `cml2-action-popover-item${item.danger ? " danger" : ""}`;
      button.setAttribute("role", "menuitem");
      button.dataset.actionId = item.id;

      const iconHtml = createMaterialIcon(item.icon, {
        color: item.danger ? "red" : "white",
      });
      button.innerHTML = `${iconHtml}<span class="cml2-action-popover-label">${item.label}</span>`;

      button.addEventListener("click", (e) => {
        e.stopPropagation();
        void this.handleAction(item.id);
      });

      this.popover?.appendChild(button);
    });

    // マテリアルアイコンをハイドレート
    hydrateMaterialIconImages(this.popover);
  }

  /**
   * ポップオーバーの位置を設定
   */
  private positionPopover(anchor: HTMLElement): void {
    if (!this.popover) return;

    const anchorRect = anchor.getBoundingClientRect();
    const popoverWidth = 150;
    const popoverHeight = this.popover.offsetHeight || 200;

    let left = anchorRect.right + 8;
    let top = anchorRect.top;

    // 右端からはみ出す場合は左側に表示
    if (left + popoverWidth > window.innerWidth - 16) {
      left = anchorRect.left - popoverWidth - 8;
    }

    // 下端からはみ出す場合は上にずらす
    if (top + popoverHeight > window.innerHeight - 16) {
      top = window.innerHeight - popoverHeight - 16;
    }

    // 上端からはみ出す場合
    if (top < 16) {
      top = 16;
    }

    this.popover.style.left = `${left}px`;
    this.popover.style.top = `${top}px`;
  }

  /**
   * アクションを実行
   */
  private async handleAction(actionId: string): Promise<void> {
    const handler = this.handlers.get(actionId);
    const context = this.currentContext;

    this.hide();

    if (handler && context) {
      try {
        await handler(context);
      } catch (error) {
        window.logger?.error(`アクション "${actionId}" の実行に失敗:`, error);
      }
    } else {
      window.logger?.warn(`アクション "${actionId}" のハンドラーが未登録です`);
    }
  }

  /**
   * 外部クリック時のハンドラー
   */
  private handleOutsideClick(e: MouseEvent): void {
    if (!this.popover) return;
    if (!this.popover.contains(e.target as Node)) {
      this.hide();
    }
  }

  /**
   * キーボードイベントハンドラー
   */
  private handleKeydown(e: KeyboardEvent): void {
    if (e.key === "Escape") {
      this.hide();
    }
  }

  /**
   * クリーンアップ
   */
  destroy(): void {
    this.hide();
    this.popover?.remove();
    this.popover = null;
    this.handlers.clear();
  }
}

/**
 * シングルトンインスタンスを取得
 */
let instance: ActionMenuManager | null = null;

export function getActionMenuManager(): ActionMenuManager {
  if (!instance) {
    instance = new ActionMenuManager();
    instance.initialize();
  }
  return instance;
}
