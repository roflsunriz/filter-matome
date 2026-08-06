import { logger } from "@/common/logger";
import { createMaterialIcon, ICONS } from "@/common/material-icons";
import {
  normalizeThumbnailUrl,
  THUMBNAIL_ERROR_HANDLER,
} from "@/common/thumbnail-fallback";
import type { WatchHistoryEntry } from "@/types/watch-history-types";
import { WatchHistoryAppBase } from "@/watch-history/app-base";

/** 履歴一覧の描画と視聴ログのアコーディオン操作を提供する。 */
export abstract class WatchHistoryHistoryListApp extends WatchHistoryAppBase {
  protected updateHistoryList(): void {
    const historyList = this.elements["history-list"];
    if (!historyList) return;

    const pageEntries = this.getHistoryPageEntries();

    // 空の場合の処理
    if (this.filteredEntries.length === 0) {
      historyList.innerHTML = "";
      this.showEmptyState(true);
      this.updateHistoryPagination();
      return;
    }

    this.showEmptyState(false);

    // アイテムを生成
    try {
      const items = pageEntries.map((e) => this.createHistoryItem(e));
      historyList.innerHTML = items.join("");
    } catch (err) {
      logger.error("履歴アイテム生成で例外:", err);
      this.showToast("履歴描画でエラー発生しました", "error");
    }

    // イベントリスナーを設定
    historyList.querySelectorAll(".history-item").forEach((item, index) => {
      item.addEventListener(
        "click",
        this.guardEvent((e) => {
          if (
            e.target instanceof HTMLElement &&
            e.target.closest(".history-thumbnail")
          ) {
            e.preventDefault();
          }
          // アコーディオンのクリックイベントを除外
          if (
            e.target &&
            (e.target as HTMLElement).closest(".watch-count-item")
          ) {
            return;
          }
          // 削除ボタンのクリックイベントを除外
          if (
            e.target &&
            (e.target as HTMLElement).closest(".history-delete-btn")
          ) {
            return;
          }
          if (
            e.target &&
            (e.target as HTMLElement).closest(".history-resume-btn")
          ) {
            return;
          }
          this.showVideoDetail(pageEntries[index]);
        }),
      );

      // 削除ボタンのイベントリスナーを設定
      const deleteBtn = item.querySelector(".history-delete-btn");
      deleteBtn?.addEventListener(
        "click",
        this.guardEvent((e) => {
          e.stopPropagation();
          void this.deleteHistoryEntry(pageEntries[index]);
        }),
      );
      const resumeBtn = item.querySelector(".history-resume-btn");
      resumeBtn?.addEventListener(
        "click",
        this.guardEvent((e) => {
          e.stopPropagation();
          this.openHistoryVideo(pageEntries[index]);
        }),
      );
    });

    // アコーディオンのイベントリスナーを設定
    historyList.querySelectorAll(".watch-count-item").forEach((item) => {
      item.addEventListener(
        "click",
        this.guardEvent((e) => {
          e.stopPropagation(); // 履歴アイテムクリックを防ぐ
          this.toggleWatchLogsAccordion(item as HTMLElement);
        }),
      );
    });

    this.updateHistoryPagination();
  }

  /** 現在ページに含まれる履歴だけを返す。 */
  protected getHistoryPageEntries(): WatchHistoryEntry[] {
    const totalPages = Math.max(
      1,
      Math.ceil(this.filteredEntries.length / this.config.pageSize),
    );
    this.config.currentPage = Math.min(
      Math.max(1, this.config.currentPage),
      totalPages,
    );
    const offset = (this.config.currentPage - 1) * this.config.pageSize;
    return this.filteredEntries.slice(offset, offset + this.config.pageSize);
  }

  /** 件数表示に使う現在ページの範囲を返す。 */
  protected getHistoryPageRange(): {
    start: number;
    end: number;
    total: number;
  } {
    const total = this.filteredEntries.length;
    if (total === 0) return { start: 0, end: 0, total };
    const pageEntries = this.getHistoryPageEntries();
    const start = (this.config.currentPage - 1) * this.config.pageSize + 1;
    return { start, end: start + pageEntries.length - 1, total };
  }

  /** 前後のページへ移動する。 */
  protected changeHistoryPage(delta: number): void {
    const totalPages = Math.max(
      1,
      Math.ceil(this.filteredEntries.length / this.config.pageSize),
    );
    const nextPage = Math.min(
      totalPages,
      Math.max(1, this.config.currentPage + delta),
    );
    if (nextPage === this.config.currentPage) return;
    this.config.currentPage = nextPage;
    this.updateHistoryList();
    this.updateContentCount();
    this.saveConfig();
    this.elements["history-content"]?.scrollIntoView({ block: "start" });
  }

  /** 1ページの表示件数を変更する。 */
  protected changeHistoryPageSize(event: Event): void {
    const select = event.currentTarget as HTMLSelectElement;
    const pageSize = Number(select.value);
    if (![25, 50, 100].includes(pageSize)) return;
    this.config.pageSize = pageSize;
    this.config.currentPage = 1;
    this.updateHistoryList();
    this.updateContentCount();
    this.saveConfig();
  }

  /** ページ送りUIを現在の件数へ同期する。 */
  private updateHistoryPagination(): void {
    const pagination = this.elements["history-pagination"];
    const previous = this.elements[
      "history-page-previous"
    ] as HTMLButtonElement;
    const next = this.elements["history-page-next"] as HTMLButtonElement;
    const status = this.elements["history-page-status"];
    const pageSize = this.elements["history-page-size"] as HTMLSelectElement;
    if (!pagination || !previous || !next || !status || !pageSize) return;

    const totalPages = Math.max(
      1,
      Math.ceil(this.filteredEntries.length / this.config.pageSize),
    );
    this.config.currentPage = Math.min(this.config.currentPage, totalPages);
    pagination.classList.toggle("hidden", this.filteredEntries.length === 0);
    previous.disabled = this.config.currentPage <= 1;
    next.disabled = this.config.currentPage >= totalPages;
    status.textContent = `${this.config.currentPage} / ${totalPages} ページ`;
    pageSize.value = String(this.config.pageSize);
  }

  /**
   * 履歴アイテムのHTMLを生成する
   */
  protected createHistoryItem(entry: WatchHistoryEntry): string {
    const watchedAtDate = new Date(entry.watchedAt);
    let progressPercent = 0;
    if (entry.lengthSec > 0) {
      const rawPercent = (entry.lastPosition / entry.lengthSec) * 100;
      progressPercent =
        rawPercent >= 95 ? 100 : Math.min(Math.round(rawPercent), 100);
    }

    const completionIcon = entry.completed
      ? createMaterialIcon("check_circle", {
          color: "green",
          classes: "completion-icon completed",
        })
      : createMaterialIcon("radio_button_unchecked", {
          color: "default",
          classes: "completion-icon",
        });

    return `
      <div class="history-item" data-video-id="${entry.videoId}" data-content-id="${this.escapeHtml(entry.videoId)}">
        <a class="history-thumbnail" href="https://www.nicovideo.jp/watch/${encodeURIComponent(entry.videoId)}" target="_blank" rel="noopener noreferrer" aria-label="${this.escapeHtml(entry.title)}を開く">
          <img src="${normalizeThumbnailUrl(entry.thumbnailUrl)}"
               alt="${this.escapeHtml(entry.title)}"
               class="thumbnail-image"
               onerror="${THUMBNAIL_ERROR_HANDLER}">
          <div class="video-duration">${this.formatDuration(entry.lengthSec)}</div>
        </a>
        <div class="history-content">
          <div class="history-header">
            <h3 class="history-title">${this.escapeHtml(entry.title)}</h3>
            <div class="history-actions">
              ${completionIcon}
              <button class="history-delete-btn btn btn-sm btn-danger" title="この履歴を削除">
                ${createMaterialIcon("delete", { color: "white", size: "small" })}
              </button>
            </div>
          </div>
          <div class="history-meta">
            <div class="history-owner">
              ${createMaterialIcon("person", { color: "dark", size: "small" })}
              ${this.escapeHtml(entry.ownerName)}
            </div>
            <div class="history-date">
              ${createMaterialIcon("schedule", { color: "dark", size: "small" })}
              ${watchedAtDate.toLocaleDateString("ja-JP")} ${watchedAtDate.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}
            </div>
            ${
              entry.stats?.uploadedAt
                ? `
              <div class="history-upload-date">
                ${createMaterialIcon("publish", { color: "dark", size: "small" })}
                投稿: ${new Date(entry.stats.uploadedAt).toLocaleDateString("ja-JP")}
              </div>
            `
                : ""
            }
          </div>
          <div class="history-progress">
            <div class="progress-bar">
              <div class="progress-fill" style="width: ${progressPercent}%"></div>
            </div>
            <span class="progress-text">${progressPercent}%</span>
          </div>
          <div class="history-primary-action">
            <span class="history-progress-label">${entry.completed ? "完走済み" : `${progressPercent}%まで視聴`}</span>
            <button type="button" class="history-resume-btn btn ${entry.completed ? "btn-secondary" : "btn-primary"}" aria-label="${this.escapeHtml(entry.title)}を${entry.completed ? "もう一度見る" : "続きから見る"}">
              ${createMaterialIcon(entry.completed ? ICONS.replay : ICONS.play, { color: "white", size: "small" })}
              ${entry.completed ? "もう一度" : "続きから"}
            </button>
          </div>
          <div class="history-stats">
            <div class="stat-item watch-count-item" data-video-id="${entry.videoId}">
              ${createMaterialIcon("repeat", { color: "dark", size: "small" })}
              <span class="watch-count-label">${entry.watchCount}回視聴</span>
              ${createMaterialIcon("expand_more", { color: "dark", size: "small", classes: "accordion-icon" })}
            </div>
            <div class="stat-item">
              ${createMaterialIcon("timer", { color: "dark", size: "small" })}
              <span>${this.formatDuration(entry.lengthSec)}</span>
            </div>
            ${
              entry.stats?.viewCount
                ? `
              <div class="stat-item">
                ${createMaterialIcon("visibility", { color: "dark", size: "small" })}
                <span>${this.formatNumber(entry.stats.viewCount)}</span>
              </div>
            `
                : ""
            }
            ${
              entry.stats?.commentCount
                ? `
              <div class="stat-item">
                ${createMaterialIcon("comment", { color: "dark", size: "small" })}
                <span>${this.formatNumber(entry.stats.commentCount)}</span>
              </div>
            `
                : ""
            }
            ${
              entry.stats?.mylistCount
                ? `
              <div class="stat-item">
                ${createMaterialIcon("bookmark", { color: "dark", size: "small" })}
                <span>${this.formatNumber(entry.stats.mylistCount)}</span>
              </div>
            `
                : ""
            }
            ${
              entry.stats?.likeCount
                ? `
              <div class="stat-item">
                ${createMaterialIcon("thumb_up", { color: "dark", size: "small" })}
                <span>${this.formatNumber(entry.stats.likeCount)}</span>
              </div>
            `
                : ""
            }
          </div>
          <div class="watch-logs-accordion" data-video-id="${entry.videoId}">
            <div class="watch-logs-content">
              ${this.createWatchLogsHTML(entry)}
            </div>
          </div>
          ${
            entry.memo
              ? `
            <div class="history-memo">
              ${createMaterialIcon("note", { color: "dark", size: "small" })}
              <span class="memo-text">${this.escapeHtml(entry.memo)}</span>
            </div>
          `
              : ""
          }
        </div>
      </div>
    `;
  }

  protected openHistoryVideo(entry: WatchHistoryEntry): void {
    window.open(`https://www.nicovideo.jp/watch/${entry.videoId}`, "_blank");
  }

  protected setLibraryFilter(mode: "all" | "in-progress" | "completed"): void {
    const completedFilter = this.elements[
      "filter-completed"
    ] as HTMLInputElement;
    completedFilter.checked = mode === "completed";
    document.querySelectorAll(".library-link").forEach((link) => {
      link.classList.toggle("active", link.id === `library-${mode}`);
    });

    if (mode === "in-progress") {
      this.config.currentPage = 1;
      this.filteredEntries = this.entries.filter((entry) => !entry.completed);
      this.updateHistoryList();
      this.updateContentCount();
      this.updateActiveFilterChips(["途中から"]);
      return;
    }
    this.handleFilter();
  }

  protected updateActiveFilterChips(additional: string[] = []): void {
    const container = document.getElementById("active-filter-chips");
    if (!container) return;

    const chips = [...additional];
    const searchInput = this.elements["search-input"] as HTMLInputElement;
    const completedFilter = this.elements[
      "filter-completed"
    ] as HTMLInputElement;
    const ownerFilter = this.elements["filter-owner"] as HTMLSelectElement;
    const dateStart = this.elements["filter-date-start"] as HTMLInputElement;
    const dateEnd = this.elements["filter-date-end"] as HTMLInputElement;
    const uploadedStart = this.elements[
      "filter-uploaded-date-start"
    ] as HTMLInputElement;
    const uploadedEnd = this.elements[
      "filter-uploaded-date-end"
    ] as HTMLInputElement;

    if (searchInput.value.trim())
      chips.push(`検索: ${searchInput.value.trim()}`);
    if (completedFilter.checked) chips.push("完走済み");
    if (ownerFilter.value) {
      chips.push(
        `投稿者: ${ownerFilter.selectedOptions[0]?.textContent ?? ""}`,
      );
    }
    if (dateStart.value || dateEnd.value) chips.push("視聴期間");
    if (uploadedStart.value || uploadedEnd.value) chips.push("投稿期間");

    container.replaceChildren(
      ...chips.map((label) => {
        const chip = document.createElement("span");
        chip.className = "active-filter-chip";
        chip.textContent = label;
        return chip;
      }),
    );
  }

  /**
   * 視聴ログの詳細HTMLを作成する
   */
  protected createWatchLogsHTML(entry: WatchHistoryEntry): string {
    const watchLogs = entry.watchLogs || [];

    // 現在の視聴状況も含めた全ての視聴セッションを作成
    const allSessions = [...watchLogs];

    // 視聴ログが空の場合、または最新の視聴セッションが記録されていない場合は現在の状況を追加
    const shouldAddCurrentSession =
      watchLogs.length === 0 ||
      (watchLogs.length > 0 &&
        Math.abs(entry.watchedAt - watchLogs[0].date) > 60000); // 1分以上の差がある場合

    if (shouldAddCurrentSession) {
      // 現在の視聴状況を追加
      allSessions.unshift({
        date: entry.watchedAt,
        position: entry.lastPosition,
        completed: entry.completed,
      });
    }

    if (allSessions.length === 0) {
      return `
        <div class="watch-logs-empty">
          ${createMaterialIcon("info", { color: "dark", size: "small" })}
          <span>視聴記録がありません</span>
        </div>
      `;
    }

    // 視聴ログを日時順（新しい順）でソート
    const sortedLogs = [...allSessions].sort((a, b) => b.date - a.date);

    return `
      <div class="watch-logs-list">
        ${sortedLogs
          .map((log, index) => {
            const logDate = new Date(log.date);
            let progressPercent = 0;
            if (entry.lengthSec > 0) {
              const rawPercent = (log.position / entry.lengthSec) * 100;
              progressPercent =
                rawPercent >= 95 ? 100 : Math.min(Math.round(rawPercent), 100);
            }

            // 現在の視聴セッションかどうかを判定
            const isCurrentSession = shouldAddCurrentSession && index === 0;

            return `
            <div class="watch-log-item ${index === 0 ? "latest" : ""} ${isCurrentSession ? "current-session" : ""}">
              <div class="watch-log-header">
                <div class="watch-log-date">
                  ${createMaterialIcon("schedule", { color: "dark", size: "small" })}
                  <span>${logDate.toLocaleDateString("ja-JP")} ${logDate.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}</span>
                  ${index === 0 ? '<span class="latest-badge">最新</span>' : ""}
                  ${isCurrentSession ? '<span class="current-badge">現在</span>' : ""}
                </div>
                <div class="watch-log-completion">
                  ${
                    log.completed
                      ? createMaterialIcon("check_circle", {
                          color: "green",
                          size: "small",
                        })
                      : createMaterialIcon("play_circle", {
                          color: "dark",
                          size: "small",
                        })
                  }
                  <span class="completion-text">${log.completed ? "完走" : "途中"}</span>
                </div>
              </div>
              <div class="watch-log-progress">
                <div class="progress-bar small">
                  <div class="progress-fill" style="width: ${progressPercent}%"></div>
                </div>
                <span class="progress-text">${progressPercent}% (${this.formatDuration(log.position)})</span>
              </div>
              ${
                isCurrentSession
                  ? `
                <div class="current-session-note">
                  <span>※ 現在の視聴進捗</span>
                </div>
              `
                  : ""
              }
            </div>
          `;
          })
          .join("")}
      </div>
    `;
  }

  /**
   * 視聴ログアコーディオンを切り替える
   */
  protected toggleWatchLogsAccordion(item: HTMLElement): void {
    const videoId = item.getAttribute("data-video-id");
    if (!videoId) return;

    const accordion = document.querySelector(
      `.watch-logs-accordion[data-video-id="${videoId}"]`,
    ) as HTMLElement;
    if (!accordion) return;

    const icon = item.querySelector(".accordion-icon") as HTMLElement;
    if (!icon) return;

    // アコーディオンの状態を切り替え
    const isExpanded = accordion.classList.contains("expanded");

    if (isExpanded) {
      // 閉じる
      accordion.classList.remove("expanded");
      icon.innerHTML = createMaterialIcon("expand_more", {
        color: "dark",
        size: "small",
      });
    } else {
      // 開く
      accordion.classList.add("expanded");
      icon.innerHTML = createMaterialIcon("expand_less", {
        color: "dark",
        size: "small",
      });
    }
  }
}
