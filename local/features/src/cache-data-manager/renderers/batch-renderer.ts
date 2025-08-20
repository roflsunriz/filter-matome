import type { VideoData } from '@/types';
import type { LoadDataFromMemory } from '../loaders/load-data-from-memory.js';

export class BatchRenderer {
  private container: HTMLElement;
  private batchSize: number = 50;
  private renderQueue: VideoData[] = [];
  private createVideoCard: (data: VideoData) => HTMLElement;
  private dataLoader: LoadDataFromMemory;

  constructor(createVideoCard: (data: VideoData) => HTMLElement, dataLoader: LoadDataFromMemory) {
    this.container = document.querySelector(".cache-container") as HTMLElement;
    this.createVideoCard = createVideoCard;
    this.dataLoader = dataLoader;
  }

  // バッチ処理用メソッド
  public async processBatch(entries: VideoData[]): Promise<void> {
    this.clearContainer();
    // ローカルキューを使ってバッチ処理（this.renderQueue を変更しない）
    const queue = entries.slice();

    while (queue.length > 0) {
      const batch = queue.splice(0, this.batchSize);
      const fragment = document.createDocumentFragment();

      batch.forEach((entry) => {
        const card = this.createVideoCard(entry);
        fragment.appendChild(card);
      });

      this.container.appendChild(fragment);
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    }
  }

  // 検索結果用最適化レンダリング
  public async renderSearchResults(resultIds: string[]): Promise<void> {
    this.clearContainer();
    const entries = this.dataLoader.getEntriesByIds(resultIds);
    if (entries.length === 0) {
      this.showNoResultsMessage();
      return;
    }
    await this.processBatch(entries);
  }

  private showNoResultsMessage(): void {
    const message = document.createElement("div");
    message.className = "no-results";
    message.textContent = "該当する動画が見つかりませんでした";
    this.container.appendChild(message);
  }

  private clearContainer(): void {
    while (this.container.firstChild) {
      this.container.removeChild(this.container.firstChild);
    }
  }

  public findEntryById(id: string): unknown {
    const all = this.dataLoader.getAllEntries() as unknown[];
    const hasId = (v: unknown): v is { id: string } => typeof v === 'object' && v !== null && typeof (v as Record<string, unknown>).id === 'string';
    for (const e of all) {
      if (hasId(e) && e.id === id) return e;
    }
    return undefined;
  }
} 