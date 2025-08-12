import type { UIBuilder } from '../builders/ui-builder.js';
import type { EventManager } from '../managers/event-manager.js';
import type { ProgressManager } from '../managers/progress-manager.js';
import type { APIResponse } from '../types/index.js';
import { LazyAPIClient } from '../clients/lazy-api-client.js';

export class EventCoordinator {
  constructor(
    private _uiBuilder: UIBuilder,
    private eventManager: EventManager,
    private _progressManager: ProgressManager
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
        const query = (header.querySelector("#searchInput") as HTMLInputElement).value;
        this.handleSearch(query);
      });

      header.querySelector("#clearSearch")?.addEventListener("click", () => {
        (header.querySelector("#searchInput") as HTMLInputElement).value = "";
        this.eventManager.trigger("searchClear");
      });

      // Enterキー検索対応追加
      header.querySelector("#searchInput")?.addEventListener("keypress", (e) => {
        if ((e as KeyboardEvent).key === "Enter") {
          this.handleSearch((e.target as HTMLInputElement).value);
        }
      });
    }
  }

  private setupCardEvents(): void {
    document.addEventListener("click", (event) => {
      const card = (event.target as HTMLElement).closest(".video-card") as HTMLElement;
      if (!card) return;

      const baseId = card.dataset.id!;
      const title = (card.querySelector(".video-title") as HTMLElement).textContent || "";
      const button = (event.target as HTMLElement).closest("button") as HTMLButtonElement;

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
    const detail = await apiClient.fetchVideoInfo(baseId);

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

  private displayDetailModal(detail: APIResponse): void {
    const formatDate = (dateString: string) => {
      const options: Intl.DateTimeFormatOptions = {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      };
      return new Date(dateString).toLocaleDateString('ja-JP', options).replace(/\//g, '-');
    };

    // 既存のモーダルを削除
    const existingModal = document.querySelector('.detail-modal');
    if (existingModal) existingModal.remove();

    // モーダル要素を作成
    const modal = document.createElement('div');
    modal.className = 'detail-modal';

    // エラー情報があるかチェック
    const isError = detail.status === "error";

    modal.innerHTML = `
      <div class="modal-content">
        <span class="close-btn">&times;</span>
        <h2>${isError ? 'エラーが発生しました' : detail.title}</h2>
        <div class="modal-body">
          ${isError ? '' : `<img src="${detail.thumbnailUrl}" class="modal-thumbnail">`}
          <div class="modal-info">
            ${isError ? `
              <div class="error-message">
                <p>⚠️ エラーコード: ${detail.errorCode}</p>
                <p>${detail.description}</p>
                ${detail.errorCode === 'DELETED' ?
                  '<p class="error-note">この動画は削除された可能性があります</p>' :
                  '<p class="error-note">情報の取得に失敗しました</p>'}
              </div>
            ` : `
              <p>投稿者: ${detail.author}</p>
              <p>再生時間: ${detail.duration}</p>
              <p>再生数: ${detail.views?.toLocaleString()} 回</p>
              <p>コメント数: ${detail.commentCount?.toLocaleString()}</p>
              <p>マイリスト数: ${detail.mylistCount?.toLocaleString()}</p>
              <p>投稿日: ${formatDate(detail.uploadDate!)}</p>
              <div class="modal-tags">${detail.tags?.map(t => `<span>${t}</span>`).join('') || ''}</div>
            `}
          </div>
        </div>
      </div>
    `;

    // モーダル外側クリックで閉じる処理追加
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });

    // 閉じるボタンのイベント設定
    modal.querySelector('.close-btn')?.addEventListener('click', () => modal.remove());
    document.body.appendChild(modal);
  }
} 