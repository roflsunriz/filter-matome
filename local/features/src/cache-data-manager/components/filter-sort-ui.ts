import { ICONS, createMaterialIcon } from "@/common/material-icons.js";
import {
  type FilterManager,
  type QualityFilter,
  type StatusFilter,
  QUALITY_FILTER_LABELS,
  STATUS_FILTER_LABELS,
} from "@/cache-data-manager/managers/filter-manager.js";
import {
  type SortManager,
  type SortOption,
  SORT_OPTION_LABELS,
} from "@/cache-data-manager/managers/sort-manager.js";

/**
 * フィルター・ソートUIコンポーネント
 */
export class FilterSortUI {
  private container: HTMLElement | null = null;
  private filterManager: FilterManager;
  private sortManager: SortManager;
  private onUpdate: () => void;
  private onDeleteTemporary: (() => void) | null;
  private onCheckAvailability: (() => void) | null;

  constructor(
    filterManager: FilterManager,
    sortManager: SortManager,
    onUpdate: () => void,
    onDeleteTemporary: (() => void) | null = null,
    onCheckAvailability: (() => void) | null = null,
  ) {
    this.filterManager = filterManager;
    this.sortManager = sortManager;
    this.onUpdate = onUpdate;
    this.onDeleteTemporary = onDeleteTemporary;
    this.onCheckAvailability = onCheckAvailability;
  }

  /**
   * UIを生成して返す
   */
  public createUI(): HTMLElement {
    this.container = document.createElement("div");
    this.container.className = "filter-sort-container";
    this.container.innerHTML = this.buildHTML();
    this.setupEventListeners();
    return this.container;
  }

  private buildHTML(): string {
    const filterConfig = this.filterManager.getConfig();
    const sortConfig = this.sortManager.getConfig();

    const filterIcon = createMaterialIcon("filter_list", {
      color: "white",
      size: "small",
      classes: "filter-sort-icon",
    });

    const sortIcon = createMaterialIcon(ICONS.sort, {
      color: "white",
      size: "small",
      classes: "filter-sort-icon",
    });

    const directionIcon = createMaterialIcon(
      sortConfig.direction === "asc" ? "arrow_upward" : "arrow_downward",
      {
        color: "white",
        size: "small",
        classes: "sort-direction-icon",
      },
    );

    return `
      <div class="filter-group" aria-label="絞り込み">
        <label class="filter-label" for="statusFilter">${filterIcon}<span>状態</span></label>
        <select id="statusFilter" class="filter-select">
          ${this.buildStatusOptions(filterConfig.status)}
        </select>
        <label class="filter-label" for="qualityFilter"><span>画質</span></label>
        <select id="qualityFilter" class="filter-select">
          ${this.buildQualityOptions(filterConfig.quality)}
        </select>
      </div>
      <div class="sort-group">
        <label class="sort-label" for="sortOption">
          ${sortIcon}
          <span>ソート</span>
        </label>
        <select id="sortOption" class="sort-select">
          ${this.buildSortOptions(sortConfig.option)}
        </select>
        <button id="sortDirectionBtn" class="sort-direction-btn" aria-label="${sortConfig.direction === "asc" ? "昇順" : "降順"}">
          ${directionIcon}
        </button>
      </div>
      <div class="filter-actions">
        <button id="resetFiltersBtn" class="reset-filters-btn">
          ${createMaterialIcon("refresh", { color: "white", size: "small" })}
          <span>リセット</span>
        </button>
        <button id="checkAvailabilityBtn" class="check-availability-btn" title="動画情報APIで公開状態を一括確認">
          ${createMaterialIcon(ICONS.check, { color: "white", size: "small" })}
          <span>公開状態チェック</span>
        </button>
        <details class="bulk-actions">
          <summary>その他の操作</summary>
          <div class="bulk-actions-menu">
            <button id="deleteTemporaryBtn" class="delete-temporary-btn">
              ${createMaterialIcon("delete_sweep", { color: "white", size: "small" })}
              <span>テンポラリを一括削除</span>
            </button>
          </div>
        </details>
      </div>
    `;
  }

  private buildQualityOptions(selected: QualityFilter): string {
    const options: QualityFilter[] = ["all", "hd", "sd", "low", "unknown"];
    return options
      .map(
        (opt) =>
          `<option value="${opt}" ${opt === selected ? "selected" : ""}>
            ${QUALITY_FILTER_LABELS[opt]}
          </option>`,
      )
      .join("");
  }

  private buildStatusOptions(selected: StatusFilter): string {
    const options: StatusFilter[] = [
      "all",
      "complete",
      "temporary",
      "unavailable",
    ];
    return options
      .map(
        (opt) =>
          `<option value="${opt}" ${opt === selected ? "selected" : ""}>
            ${STATUS_FILTER_LABELS[opt]}
          </option>`,
      )
      .join("");
  }

  private buildSortOptions(selected: SortOption): string {
    const options: SortOption[] = ["id", "title", "quality", "availability"];
    return options
      .map(
        (opt) =>
          `<option value="${opt}" ${opt === selected ? "selected" : ""}>
            ${SORT_OPTION_LABELS[opt]}
          </option>`,
      )
      .join("");
  }

  private setupEventListeners(): void {
    if (!this.container) return;

    // 画質フィルター
    const qualitySelect = this.container.querySelector("#qualityFilter");
    if (qualitySelect instanceof HTMLSelectElement) {
      qualitySelect.addEventListener("change", (e) => {
        const target = e.target;
        if (target instanceof HTMLSelectElement) {
          const value = target.value as QualityFilter;
          this.filterManager.setQualityFilter(value);
          this.onUpdate();
        }
      });
    }

    // ステータスフィルター
    const statusSelect = this.container.querySelector("#statusFilter");
    if (statusSelect instanceof HTMLSelectElement) {
      statusSelect.addEventListener("change", (e) => {
        const target = e.target;
        if (target instanceof HTMLSelectElement) {
          const value = target.value as StatusFilter;
          this.filterManager.setStatusFilter(value);
          this.onUpdate();
        }
      });
    }

    // ソートオプション
    const sortSelect = this.container.querySelector("#sortOption");
    if (sortSelect instanceof HTMLSelectElement) {
      sortSelect.addEventListener("change", (e) => {
        const target = e.target;
        if (target instanceof HTMLSelectElement) {
          const value = target.value as SortOption;
          this.sortManager.setSortOption(value);
          this.onUpdate();
        }
      });
    }

    // ソート方向
    const directionBtn = this.container.querySelector("#sortDirectionBtn");
    if (directionBtn instanceof HTMLButtonElement) {
      directionBtn.addEventListener("click", () => {
        this.sortManager.toggleDirection();
        this.updateDirectionButton();
        this.onUpdate();
      });
    }

    // リセットボタン
    const resetBtn = this.container.querySelector("#resetFiltersBtn");
    if (resetBtn instanceof HTMLButtonElement) {
      resetBtn.addEventListener("click", () => {
        this.filterManager.resetFilters();
        this.sortManager.resetSort();
        this.updateUI();
        this.onUpdate();
      });
    }

    const deleteTemporaryBtn = this.container.querySelector(
      "#deleteTemporaryBtn",
    );
    if (deleteTemporaryBtn instanceof HTMLButtonElement) {
      deleteTemporaryBtn.addEventListener("click", () => {
        this.onDeleteTemporary?.();
      });
    }

    const checkAvailabilityBtn = this.container.querySelector(
      "#checkAvailabilityBtn",
    );
    if (checkAvailabilityBtn instanceof HTMLButtonElement) {
      checkAvailabilityBtn.addEventListener("click", () => {
        this.onCheckAvailability?.();
      });
    }
  }

  private updateDirectionButton(): void {
    if (!this.container) return;

    const sortConfig = this.sortManager.getConfig();
    const btn = this.container.querySelector("#sortDirectionBtn");

    if (btn instanceof HTMLButtonElement) {
      btn.innerHTML = createMaterialIcon(
        sortConfig.direction === "asc" ? "arrow_upward" : "arrow_downward",
        {
          color: "white",
          size: "small",
          classes: "sort-direction-icon",
        },
      );
      btn.title = sortConfig.direction === "asc" ? "昇順" : "降順";
      btn.setAttribute(
        "aria-label",
        sortConfig.direction === "asc" ? "昇順" : "降順",
      );
    }
  }

  /**
   * UI全体を更新
   */
  public updateUI(): void {
    if (!this.container) return;

    const filterConfig = this.filterManager.getConfig();
    const sortConfig = this.sortManager.getConfig();

    // 各選択要素を更新
    const qualitySelect = this.container.querySelector("#qualityFilter");
    if (qualitySelect instanceof HTMLSelectElement) {
      qualitySelect.value = filterConfig.quality;
    }

    const statusSelect = this.container.querySelector("#statusFilter");
    if (statusSelect instanceof HTMLSelectElement) {
      statusSelect.value = filterConfig.status;
    }

    const sortSelect = this.container.querySelector("#sortOption");
    if (sortSelect instanceof HTMLSelectElement) {
      sortSelect.value = sortConfig.option;
    }

    this.updateDirectionButton();
  }

  /**
   * 結果件数を表示
   */
  public updateResultCount(total: number, filtered: number): void {
    if (!this.container) return;

    let countDisplay = this.container.querySelector(".result-count");

    if (!(countDisplay instanceof HTMLElement)) {
      countDisplay = document.createElement("span");
      countDisplay.className = "result-count";
      this.container.appendChild(countDisplay);
    }

    if (total === filtered) {
      countDisplay.textContent = `${total.toLocaleString()} 件`;
    } else {
      countDisplay.textContent = `${filtered.toLocaleString()} / ${total.toLocaleString()} 件`;
    }
  }

  /**
   * コンテナ要素を取得
   */
  public getContainer(): HTMLElement | null {
    return this.container;
  }

  /**
   * 破棄
   */
  public destroy(): void {
    if (this.container) {
      this.container.remove();
      this.container = null;
    }
  }
}
