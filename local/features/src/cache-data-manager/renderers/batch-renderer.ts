import type { VideoData } from '../types/index.js';
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
    this.renderQueue = [...entries];

    while (this.renderQueue.length > 0) {
      const batch = this.renderQueue.splice(0, this.batchSize);
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

  public findEntryById(id: string): VideoData | undefined {
    return this.dataLoader.getAllEntries().find((e) => e.id === id);
  }
} 