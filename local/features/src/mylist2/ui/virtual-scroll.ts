/**
 * 仮想スクロールマネージャー
 * 大量のアイテムを効率的に表示するため、表示領域内のアイテムのみをDOMにレンダリングする
 */

import "@/types/global.d.ts";
import type { DBVideo } from "@/types/video-types";
import type { KeywordInfo } from "@/types/mylist-types";
import {
  matchesKeywordSearch,
  matchesVideoSearch,
} from "@/mylist2/video-search";

/** 仮想スクロールで扱うアイテムの共通型 */
export type VirtualScrollItem =
  { type: "video"; data: DBVideo } | { type: "keyword"; data: KeywordInfo };

/** 仮想スクロールの設定 */
export interface VirtualScrollConfig {
  /** アイテムの高さ（px） */
  itemHeight: number;
  /** 上下に追加表示するバッファアイテム数 */
  bufferSize: number;
  /** スクロールコンテナのセレクター */
  containerSelector: string;
}

/** アイテムのレンダリング関数の型 */
export type ItemRenderer = (
  item: VirtualScrollItem,
  index: number,
) => HTMLElement;

/** 選択状態の変更コールバック */
export type SelectionChangeCallback = (selectedIds: Set<string>) => void;

/** デフォルト設定 */
const DEFAULT_CONFIG: VirtualScrollConfig = {
  itemHeight: 92,
  bufferSize: 5,
  containerSelector: "#videoList",
};

/**
 * 仮想スクロールマネージャークラス
 */
export class VirtualScrollManager {
  private config: VirtualScrollConfig;
  private container: HTMLElement | null = null;
  private spacer: HTMLElement | null = null;
  private items: VirtualScrollItem[] = [];
  private filteredItems: VirtualScrollItem[] = [];
  private selectedIds: Set<string> = new Set();
  private visibleStartIndex = 0;
  private visibleEndIndex = 0;
  private itemRenderer: ItemRenderer | null = null;
  private selectionChangeCallback: SelectionChangeCallback | null = null;
  private scrollRAF: number | null = null;
  private isInitialized = false;
  private filterText = "";

  constructor(config: Partial<VirtualScrollConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * 初期化
   */
  initialize(renderer: ItemRenderer): boolean {
    this.itemRenderer = renderer;
    this.container = document.querySelector(this.config.containerSelector);

    if (!this.container) {
      window.logger?.error(
        `仮想スクロール: コンテナが見つかりません: ${this.config.containerSelector}`,
      );
      return false;
    }

    // コンテナのスタイル設定
    this.container.style.position = "relative";
    this.container.style.overflow = "auto";

    // スペーサー要素を作成
    this.spacer = document.createElement("div");
    this.spacer.className = "video-list-spacer";
    this.spacer.style.position = "absolute";
    this.spacer.style.top = "0";
    this.spacer.style.left = "0";
    this.spacer.style.width = "100%";
    this.spacer.style.pointerEvents = "none";
    this.container.appendChild(this.spacer);

    // スクロールイベントを登録
    this.container.addEventListener("scroll", this.handleScroll.bind(this), {
      passive: true,
    });

    // イベント委譲でチェックボックスの変更を監視
    this.container.addEventListener(
      "change",
      this.handleCheckboxChange.bind(this),
    );

    this.isInitialized = true;
    window.logger?.info("仮想スクロールマネージャーを初期化しました");
    return true;
  }

  /**
   * データを設定
   */
  setData(items: VirtualScrollItem[]): void {
    this.items = items;
    this.applyFilter();
    this.invalidateRenderedRange();
    this.render();
    this.selectionChangeCallback?.(this.selectedIds);
  }

  /**
   * フィルターテキストを設定
   */
  setFilter(filterText: string): void {
    this.filterText = filterText.toLowerCase();
    this.applyFilter();
    this.invalidateRenderedRange();
    this.render();
    this.selectionChangeCallback?.(this.selectedIds);
  }

  /**
   * フィルターを適用
   */
  private applyFilter(): void {
    if (!this.filterText) {
      this.filteredItems = [...this.items];
      return;
    }

    this.filteredItems = this.items.filter((item) => {
      if (item.type === "video") {
        return matchesVideoSearch(item.data, this.filterText);
      } else {
        return matchesKeywordSearch(item.data, this.filterText);
      }
    });
  }

  /**
   * 選択変更コールバックを設定
   */
  onSelectionChange(callback: SelectionChangeCallback): void {
    this.selectionChangeCallback = callback;
  }

  /**
   * スクロールイベントハンドラー
   */
  private handleScroll(): void {
    if (this.scrollRAF !== null) {
      cancelAnimationFrame(this.scrollRAF);
    }
    this.scrollRAF = requestAnimationFrame(() => {
      this.render();
      this.scrollRAF = null;
    });
  }

  /**
   * チェックボックス変更イベントハンドラー
   */
  private handleCheckboxChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    if (!target.classList.contains("video-select")) return;

    const itemElement = target.closest(
      ".video-item, .keyword-item",
    ) as HTMLElement;
    if (!itemElement) return;

    const itemId = this.getItemId(itemElement);
    if (!itemId) return;

    if (target.checked) {
      this.selectedIds.add(itemId);
    } else {
      this.selectedIds.delete(itemId);
    }

    itemElement.classList.toggle("is-selected", target.checked);

    this.selectionChangeCallback?.(this.selectedIds);
  }

  /**
   * アイテム要素からIDを取得
   */
  private getItemId(element: HTMLElement): string | null {
    if (element.classList.contains("keyword-item")) {
      return `keyword:${element.dataset.id ?? ""}`;
    } else {
      return `video:${element.dataset.compositeId ?? ""}`;
    }
  }

  /**
   * レンダリング済み範囲のキャッシュを無効化する
   * データや選択状態が変わった際に呼び出し、次回 render() で必ず再描画させる
   */
  private invalidateRenderedRange(): void {
    this.visibleStartIndex = -1;
    this.visibleEndIndex = -1;
  }

  /**
   * 表示範囲を計算
   */
  private calculateVisibleRange(): { start: number; end: number } {
    if (!this.container) {
      return { start: 0, end: 0 };
    }

    const scrollTop = this.container.scrollTop;
    const containerHeight = this.container.clientHeight;

    const startIndex = Math.max(
      0,
      Math.floor(scrollTop / this.config.itemHeight) - this.config.bufferSize,
    );
    const endIndex = Math.min(
      this.filteredItems.length,
      Math.ceil((scrollTop + containerHeight) / this.config.itemHeight) +
        this.config.bufferSize,
    );

    return { start: startIndex, end: endIndex };
  }

  /**
   * 表示をレンダリング
   */
  render(): void {
    if (!this.isInitialized || !this.container || !this.itemRenderer) {
      return;
    }

    // スペーサーの高さを更新
    const totalHeight = this.filteredItems.length * this.config.itemHeight;
    if (this.spacer) {
      this.spacer.style.height = `${totalHeight}px`;
    }

    // 表示範囲を計算
    const { start, end } = this.calculateVisibleRange();

    // 範囲が変わっていなければ何もしない
    if (start === this.visibleStartIndex && end === this.visibleEndIndex) {
      return;
    }

    this.visibleStartIndex = start;
    this.visibleEndIndex = end;

    // 既存のアイテム要素を削除（スペーサー以外）
    const existingItems = this.container.querySelectorAll(
      ".video-item, .keyword-item",
    );
    existingItems.forEach((item) => item.remove());

    // 表示範囲内のアイテムをレンダリング
    const fragment = document.createDocumentFragment();
    for (let i = start; i < end; i++) {
      const item = this.filteredItems[i];
      if (!item) continue;

      const element = this.itemRenderer(item, i);
      element.style.position = "absolute";
      element.style.top = `${i * this.config.itemHeight}px`;
      element.style.left = "0";
      element.style.right = "0";
      element.style.height = `${this.config.itemHeight}px`;
      element.style.boxSizing = "border-box";
      element.dataset.index = String(i);

      // 選択状態を復元
      const itemId = this.getItemId(element);
      if (itemId && this.selectedIds.has(itemId)) {
        element.classList.add("is-selected");
        const checkbox = element.querySelector(
          ".video-select",
        ) as HTMLInputElement;
        if (checkbox) {
          checkbox.checked = true;
        }
      }

      fragment.appendChild(element);
    }

    this.container.appendChild(fragment);
  }

  /**
   * 全てのアイテムを選択（動画のみ）
   */
  selectAllVideos(): void {
    this.filteredItems.forEach((item) => {
      if (item.type === "video") {
        this.selectedIds.add(`video:${item.data.id}`);
      }
    });
    this.invalidateRenderedRange();
    this.render();
    this.selectionChangeCallback?.(this.selectedIds);
  }

  /**
   * 全ての選択を解除
   */
  deselectAll(): void {
    this.selectedIds.clear();
    this.invalidateRenderedRange();
    this.render();
    this.selectionChangeCallback?.(this.selectedIds);
  }

  /**
   * 選択されたアイテムのIDを取得
   */
  getSelectedIds(): Set<string> {
    return new Set(this.selectedIds);
  }

  /**
   * 選択された動画のデータを取得
   */
  getSelectedVideos(): DBVideo[] {
    const videos: DBVideo[] = [];
    this.selectedIds.forEach((id) => {
      if (id.startsWith("video:")) {
        const compositeId = id.substring(6);
        const item = this.items.find(
          (i) => i.type === "video" && i.data.id === compositeId,
        );
        if (item?.type === "video") {
          videos.push(item.data);
        }
      }
    });
    return videos;
  }

  /**
   * 選択されたキーワードのデータを取得
   */
  getSelectedKeywords(): KeywordInfo[] {
    const keywords: KeywordInfo[] = [];
    this.selectedIds.forEach((id) => {
      if (id.startsWith("keyword:")) {
        const keywordId = parseInt(id.substring(8), 10);
        const item = this.items.find(
          (i) => i.type === "keyword" && i.data.id === keywordId,
        );
        if (item?.type === "keyword") {
          keywords.push(item.data);
        }
      }
    });
    return keywords;
  }

  /**
   * 全アイテム数を取得
   */
  getTotalCount(): number {
    return this.filteredItems.length;
  }

  /**
   * 元データを取得
   */
  getItems(): VirtualScrollItem[] {
    return this.items;
  }

  /**
   * フィルター済みデータを取得
   */
  getFilteredItems(): VirtualScrollItem[] {
    return this.filteredItems;
  }

  /**
   * 特定のインデックスまでスクロール
   */
  scrollToIndex(index: number): void {
    if (!this.container) return;
    const targetTop = index * this.config.itemHeight;
    this.container.scrollTop = targetTop;
  }

  /**
   * クリーンアップ
   */
  destroy(): void {
    if (this.scrollRAF !== null) {
      cancelAnimationFrame(this.scrollRAF);
    }
    this.container?.removeEventListener("scroll", this.handleScroll.bind(this));
    this.container?.removeEventListener(
      "change",
      this.handleCheckboxChange.bind(this),
    );
    this.items = [];
    this.filteredItems = [];
    this.selectedIds.clear();
    this.isInitialized = false;
  }
}
