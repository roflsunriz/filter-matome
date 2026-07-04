import { createMaterialIcon } from "@/common/material-icons";
import { MlinkVideoComment } from "@/types/mlink-video-controller-types";

interface CommentManagerLike {
  setSearchOptions(options: {
    enableRegexp: boolean;
    enableExtended: boolean;
  }): void;
  getSearchOptions(): { enableExtended: boolean };
  searchComments(searchText: string): {
    success: boolean;
    error?: string;
    results?: MlinkVideoComment[];
  };
  fetchComments(): Promise<boolean>;
  startUrlWatching(): void;
  onDataChanged(listener: () => void): () => void;
}

interface PlayerLike {
  seek(time: number): void;
}

export interface CommentsTabCallbacks {
  updateHeatmap(): void;
  onFetchError(error: unknown): void;
}

export class CommentsTabController {
  constructor(
    private readonly root: ShadowRoot,
    private readonly commentManager: CommentManagerLike | null,
    private readonly player: PlayerLike | null,
    private readonly callbacks: CommentsTabCallbacks,
  ) {}

  bind(): (() => void) | null {
    const searchInput = this.root.querySelector<HTMLInputElement>(
      "#comments .comment-search-input",
    );
    const regexToggle = this.root.querySelector<HTMLInputElement>(
      "#comments .regex-toggle",
    );
    const extendedToggle = this.root.querySelector<HTMLInputElement>(
      "#comments .extended-toggle",
    );
    const searchBtn = this.root.querySelector<HTMLButtonElement>(
      "#comments .search-btn",
    );
    const clearBtn = this.root.querySelector<HTMLButtonElement>(
      "#comments .clear-btn",
    );
    const searchResults = this.root.querySelector<HTMLElement>(
      "#comments .search-results",
    );

    if (
      !searchInput ||
      !regexToggle ||
      !extendedToggle ||
      !searchBtn ||
      !clearBtn ||
      !searchResults
    ) {
      return null;
    }

    this.bindSearchInput(searchInput, searchResults);
    this.bindSearchOptions(
      searchInput,
      regexToggle,
      extendedToggle,
      searchResults,
    );
    this.bindSearchButtons(searchInput, searchBtn, clearBtn, searchResults);
    this.fetchInitialComments();
    this.commentManager?.startUrlWatching();

    return (
      this.commentManager?.onDataChanged(() => {
        searchInput.value = "";
        this.showInitialMessage(searchResults);
        this.callbacks.updateHeatmap();
      }) || null
    );
  }

  performSearch(searchText: string, searchResults: HTMLElement): void {
    const result = this.commentManager?.searchComments(searchText);

    if (!result?.success) {
      searchResults.innerHTML = `<div class="error-message">${result?.error}</div>`;
      return;
    }

    if (!result.results || result.results.length === 0) {
      searchResults.innerHTML =
        '<div class="no-results">一致するコメントが見つかりませんでした</div>';
      return;
    }

    searchResults.innerHTML = "";
    const fragment = document.createDocumentFragment();

    result.results.forEach((comment) => {
      fragment.appendChild(this.createCommentElement(comment));
    });

    searchResults.appendChild(fragment);
    this.callbacks.updateHeatmap();
  }

  private bindSearchInput(
    searchInput: HTMLInputElement,
    searchResults: HTMLElement,
  ): void {
    searchInput.addEventListener("keydown", (e) => {
      e.stopPropagation();

      const preventDefaultKeys = [
        "ArrowLeft",
        "ArrowRight",
        "ArrowUp",
        "ArrowDown",
        "f",
        "F",
        "m",
        "M",
        "k",
        "K",
        "j",
        "J",
        "l",
        "L",
      ];

      if (preventDefaultKeys.includes(e.key)) {
        e.preventDefault();
      }

      if (e.key === "Enter" && !e.isComposing) {
        e.preventDefault();
        const searchText = searchInput.value.trim();
        if (searchText) {
          this.performSearch(searchText, searchResults);
        }
      }
    });

    searchInput.addEventListener("keyup", (e) => {
      e.stopPropagation();
    });
    searchInput.addEventListener("keypress", (e) => {
      e.stopPropagation();
      if (e.key === "Enter") {
        e.preventDefault();
      }
    });
  }

  private bindSearchOptions(
    searchInput: HTMLInputElement,
    regexToggle: HTMLInputElement,
    extendedToggle: HTMLInputElement,
    searchResults: HTMLElement,
  ): void {
    regexToggle.addEventListener("change", () => {
      this.commentManager?.setSearchOptions({
        enableRegexp: regexToggle.checked,
        enableExtended: extendedToggle.checked,
      });
    });

    extendedToggle.addEventListener("change", () => {
      this.commentManager?.setSearchOptions({
        enableRegexp: regexToggle.checked,
        enableExtended: extendedToggle.checked,
      });
      if (searchInput.value) {
        this.performSearch(searchInput.value, searchResults);
      }
    });
  }

  private bindSearchButtons(
    searchInput: HTMLInputElement,
    searchBtn: HTMLButtonElement,
    clearBtn: HTMLButtonElement,
    searchResults: HTMLElement,
  ): void {
    searchBtn.addEventListener("click", () => {
      this.performSearch(searchInput.value, searchResults);
    });

    clearBtn.addEventListener("click", () => {
      searchInput.value = "";
      this.showInitialMessage(searchResults);
    });
  }

  private fetchInitialComments(): void {
    this.commentManager
      ?.fetchComments()
      .then((success) => {
        if (success) {
          this.callbacks.updateHeatmap();
        } else {
          window.logger.warn("コメントの取得に失敗しました (初期化時)");
        }
      })
      .catch((error) => {
        this.callbacks.onFetchError(error);
      });
  }

  private createCommentElement(comment: MlinkVideoComment): HTMLElement {
    const container = document.createElement("div");
    container.className = "comment-result";

    const timeElement = document.createElement("div");
    timeElement.className = "comment-time";
    timeElement.textContent = `⏰ ${this.formatVpos(comment.vposMs || 0)}`;

    const bodyElement = document.createElement("div");
    bodyElement.className = "comment-body";
    bodyElement.textContent = comment.body;

    const copyButton = document.createElement("button");
    copyButton.className = "copy-button";
    copyButton.innerHTML = createMaterialIcon("content_copy", {
      style: "outlined",
      color: "white",
    });
    copyButton.title = "コメントをコピー";
    copyButton.onclick = (e) => {
      e.stopPropagation();
      navigator.clipboard
        .writeText(comment.body)
        .then(() => this.showCopyResult(copyButton, "コピーしました"))
        .catch(() =>
          this.showCopyResult(copyButton, "コピーに失敗しました", "#ff6b6b"),
        );
    };

    const userElement = document.createElement("div");
    userElement.className = "comment-user";
    userElement.textContent = `👤 ${comment.userId || "不明"}`;

    container.appendChild(timeElement);
    container.appendChild(bodyElement);
    container.appendChild(copyButton);
    container.appendChild(userElement);

    const searchOptions = this.commentManager?.getSearchOptions();
    if (searchOptions?.enableExtended) {
      const detailsElement = document.createElement("div");
      detailsElement.className = "comment-details";

      const postedDate = comment.postedAt
        ? new Date(comment.postedAt).toLocaleString("ja-JP")
        : "不明";

      const details = [
        `ID: ${comment.id || "-"}`,
        `No: ${comment.no || "-"}`,
        `投稿日時: ${postedDate}`,
        `コマンド: ${comment.commands ? comment.commands.join(" ") : "-"}`,
        `プレミアム: ${comment.isPremium ? createMaterialIcon("star", { style: "outlined", color: "white" }) : "-"}`,
        `スコア: ${comment.score || "-"}`,
      ];

      detailsElement.innerHTML = details.join(" | ");
      container.appendChild(detailsElement);
    }

    container.addEventListener("click", () => {
      if (comment.vposMs && this.player) {
        this.player.seek(comment.vposMs / 1000);
      }
    });

    return container;
  }

  private formatVpos(vposMs: number): string {
    const seconds = vposMs / 1000;
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  }

  private showCopyResult(
    button: HTMLElement,
    message: string,
    color?: string,
  ): void {
    const tooltip = document.createElement("div");
    tooltip.className = "copy-tooltip";
    tooltip.textContent = message;
    tooltip.style.position = "absolute";
    tooltip.style.top = "-20px";
    tooltip.style.left = "0";
    if (color) {
      tooltip.style.color = color;
    }

    button.style.position = "relative";
    button.appendChild(tooltip);

    setTimeout(() => {
      tooltip.remove();
    }, 2000);
  }

  private showInitialMessage(searchResults: HTMLElement): void {
    searchResults.innerHTML =
      '<div class="no-results">コメントを検索してください</div>';
  }
}
