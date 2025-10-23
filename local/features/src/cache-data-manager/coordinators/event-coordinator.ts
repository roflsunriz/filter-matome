import type { UIBuilder } from "@/cache-data-manager/builders/ui-builder.js";
import type { EventManager } from "@/cache-data-manager/managers/event-manager.js";
import type { ProgressManager } from "@/cache-data-manager/managers/progress-manager.js";
// APIResponse 型は normalize して扱うためここでは直接使わない
// APIResponse 型は normalize して扱うためここでは直接使わない
import type { APIResponse as _APIResponse } from "@/types";
import { LazyAPIClient } from "@/cache-data-manager/clients/lazy-api-client.js";

export class EventCoordinator {
  constructor(
    private _uiBuilder: UIBuilder,
    private eventManager: EventManager,
    private _progressManager: ProgressManager,
  ) {
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    this.setupHeaderEvents();
    this.setupCardEvents();
  }

  private setupHeaderEvents(): void {
    const header = document.querySelector("header");

    if (header) {
      // 検索関連イベント
      header.querySelector("#searchBtn")?.addEventListener("click", () => {
        const query = (header.querySelector("#searchInput") as HTMLInputElement)
          .value;
        this.handleSearch(query);
      });

      header.querySelector("#clearSearch")?.addEventListener("click", () => {
        (header.querySelector("#searchInput") as HTMLInputElement).value = "";
        this.eventManager.trigger("searchClear");
      });

      // Enterキー検索対応追加
      header
        .querySelector("#searchInput")
        ?.addEventListener("keypress", (e) => {
          if ((e as KeyboardEvent).key === "Enter") {
            this.handleSearch((e.target as HTMLInputElement).value);
          }
        });
    }
  }

  private setupCardEvents(): void {
    document.addEventListener("click", (event) => {
      const card = (event.target as HTMLElement).closest(
        ".video-card",
      ) as HTMLElement;
      if (!card) return;

      const baseId = card.dataset.id!;
      const title =
        (card.querySelector(".video-title") as HTMLElement).textContent || "";
      const button = (event.target as HTMLElement).closest(
        "button",
      ) as HTMLButtonElement;

      // 詳細情報遅延読み込み
      if (!button) {
        void this.showDetailInfo(baseId);
        return;
      }

      if (button.classList.contains("play-btn")) {
        this.handlePlay(baseId);
      } else if (button.classList.contains("save-video-btn")) {
        this.handleSaveVideo(baseId);
      } else if (button.classList.contains("save-audio-btn")) {
        this.handleSaveAudio(baseId);
      } else if (button.classList.contains("delete-btn")) {
        this.handleDelete(baseId, title);
      }
    });
  }

  private async showDetailInfo(baseId: string): Promise<void> {
    const apiClient = new LazyAPIClient();
    const detail = this.normalizeApiResponse(
      await apiClient.fetchVideoInfo(baseId),
    );

    // 詳細情報をモーダル表示
    this.displayDetailModal(detail);
  }

  private handlePlay(baseId: string): void {
    window.open(`/watch/${baseId}`, "_blank");
  }

  private handleSaveVideo(baseId: string): void {
    window.open(`./ffmpeg?video=${baseId}`, "_blank");
  }

  private handleSaveAudio(baseId: string): void {
    window.open(`./ffmpeg?audio=${baseId}`, "_blank");
  }

  private handleDelete(baseId: string, title: string): void {
    if (confirm(`本当に削除しますか？\nID : ${baseId}\nタイトル : ${title}`)) {
      window.open(`./rm?${baseId}`, "_blank");
    }
  }

  private handleSearch(query: string): void {
    this.eventManager.trigger("search", { query });
  }

  private displayDetailModal(
    detail:
      | {
          status: "ok";
          title?: string;
          thumbnailUrl?: string;
          author?: string;
          duration?: string;
          views?: number;
          commentCount?: number;
          mylistCount?: number;
          uploadDate?: string;
          tags?: string[];
        }
      | { status: "error"; errorCode?: string; description?: string },
  ): void {
    const formatDate = (dateString: string) => {
      const options: Intl.DateTimeFormatOptions = {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      };
      return new Date(dateString)
        .toLocaleDateString("ja-JP", options)
        .replace(/\//g, "-");
    };

    // 既存のモーダルを削除
    const existingModal = document.querySelector(".detail-modal");
    if (existingModal) existingModal.remove();

    // モーダル要素を作成
    const modal = document.createElement("div");
    modal.className = "detail-modal";

    // 型ガードによる安全なアクセス（unknown を受ける）
    const isErrorResponse = (
      r: unknown,
    ): r is { status: "error"; errorCode?: string; description?: string } => {
      return (
        typeof r === "object" &&
        r !== null &&
        (r as Record<string, unknown>).status === "error"
      );
    };

    const isOkResponse = (
      r: unknown,
    ): r is {
      status: "ok";
      title?: string;
      thumbnailUrl?: string;
      author?: string;
      duration?: string;
      views?: number;
      commentCount?: number;
      mylistCount?: number;
      uploadDate?: string;
      tags?: string[];
    } => {
      return (
        typeof r === "object" &&
        r !== null &&
        (r as Record<string, unknown>).status === "ok"
      );
    };

    let inner = "";
    if (isErrorResponse(detail)) {
      const code = detail.errorCode || "";
      const desc = detail.description || "";
      const note =
        code === "DELETED"
          ? '<p class="error-note">この動画は削除された可能性があります</p>'
          : '<p class="error-note">情報の取得に失敗しました</p>';
      inner = `
        <div class="modal-content">
          <span class="close-btn">&times;</span>
          <h2>エラーが発生しました</h2>
          <div class="modal-body">
            <div class="error-message">
              <p>⚠️ エラーコード: ${code}</p>
              <p>${desc}</p>
              ${note}
            </div>
          </div>
        </div>
      `;
    } else if (isOkResponse(detail)) {
      const titleSafe = detail.title || "";
      const thumb = detail.thumbnailUrl || "";
      const author = detail.author || "";
      const duration = detail.duration || "";
      const views =
        typeof detail.views === "number" ? detail.views.toLocaleString() : "0";
      const commentCount =
        typeof detail.commentCount === "number"
          ? detail.commentCount.toLocaleString()
          : "0";
      const mylistCount =
        typeof detail.mylistCount === "number"
          ? detail.mylistCount.toLocaleString()
          : "0";
      const upload = detail.uploadDate ? formatDate(detail.uploadDate) : "";
      const tagsHtml = Array.isArray(detail.tags)
        ? detail.tags.map((t) => `<span>${t}</span>`).join("")
        : "";
      inner = `
        <div class="modal-content">
          <span class="close-btn">&times;</span>
          <h2>${titleSafe}</h2>
          <div class="modal-body">
            <img src="${thumb}" class="modal-thumbnail">
            <div class="modal-info">
              <p>投稿者: ${author}</p>
              <p>再生時間: ${duration}</p>
              <p>再生数: ${views} 回</p>
              <p>コメント数: ${commentCount}</p>
              <p>マイリスト数: ${mylistCount}</p>
              <p>投稿日: ${upload}</p>
              <div class="modal-tags">${tagsHtml}</div>
            </div>
          </div>
        </div>
      `;
    } else {
      inner = `
        <div class="modal-content">
          <span class="close-btn">&times;</span>
          <h2>情報がありません</h2>
        </div>
      `;
    }

    modal.innerHTML = inner;

    // モーダル外側クリックで閉じる処理追加
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });

    // 閉じるボタンのイベント設定
    modal
      .querySelector(".close-btn")
      ?.addEventListener("click", () => modal.remove());
    document.body.appendChild(modal);
  }

  private normalizeApiResponse(
    input: unknown,
  ):
    | {
        status: "ok";
        title?: string;
        thumbnailUrl?: string;
        author?: string;
        duration?: string;
        views?: number;
        commentCount?: number;
        mylistCount?: number;
        uploadDate?: string;
        tags?: string[];
      }
    | { status: "error"; errorCode?: string; description?: string } {
    if (typeof input === "object" && input !== null) {
      const obj = input as Record<string, unknown>;
      if (obj.status === "error") {
        return {
          status: "error",
          errorCode:
            typeof obj.errorCode === "string" ? obj.errorCode : undefined,
          description:
            typeof obj.description === "string" ? obj.description : undefined,
        };
      }
      return {
        status: "ok",
        title: typeof obj.title === "string" ? obj.title : undefined,
        thumbnailUrl:
          typeof obj.thumbnailUrl === "string" ? obj.thumbnailUrl : undefined,
        author: typeof obj.author === "string" ? obj.author : undefined,
        duration: typeof obj.duration === "string" ? obj.duration : undefined,
        views: typeof obj.views === "number" ? obj.views : undefined,
        commentCount:
          typeof obj.commentCount === "number" ? obj.commentCount : undefined,
        mylistCount:
          typeof obj.mylistCount === "number" ? obj.mylistCount : undefined,
        uploadDate:
          typeof obj.uploadDate === "string" ? obj.uploadDate : undefined,
        tags: Array.isArray(obj.tags)
          ? obj.tags.filter((t): t is string => typeof t === "string")
          : undefined,
      };
    }
    return { status: "error", description: "不明なエラー" };
  }
}
