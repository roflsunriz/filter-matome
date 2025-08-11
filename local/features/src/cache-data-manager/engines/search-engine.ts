import type { LoadDataFromMemory } from '../loaders/load-data-from-memory.js';

export class SearchEngine {
  private index: any;
  private indexReady: Promise<void>;

  constructor(private dataLoader: LoadDataFromMemory) {
    this.indexReady = this.loadFlexSearch(); // 初期化完了フラグ追加
  }

  private async loadFlexSearch(): Promise<void> {
    if (typeof (window as any).FlexSearch === "undefined") {
      await new Promise<void>((resolve, reject) => {
        const script = document.createElement("script");
        script.src = "https://cdn.jsdelivr.net/npm/flexsearch@0.7.31/dist/flexsearch.bundle.js";
        script.onload = () => resolve();
        script.onerror = () => reject(new Error("Failed to load FlexSearch"));
        document.head.appendChild(script);
      });
    }
    this.initializeIndex();
  }

  private initializeIndex(): void {
    this.index = new (window as any).FlexSearch.Document({
      preset: "memory",
      tokenize: "full",
      document: {
        id: "id",
        index: [
          {
            field: "title",
            tokenize: "forward",
            optimize: false,
            context: {
              depth: 1,
              resolution: 9,
            },
          },
        ],
      },
    });
    this.rebuildIndex();
  }

  public async search(query: string): Promise<string[]> {
    const cleanQuery = query.toLowerCase().trim();
    await this.indexReady;
    if (!cleanQuery || !this.index) return [];

    const results = this.index.search(cleanQuery, {
      limit: 1000,
      suggest: true,
      enrich: true,
      bool: "or",
    });

    return [...new Set(results.flatMap((r: any) => r.result))].filter((id): id is string => typeof id === 'string');
  }

  private async rebuildIndex(): Promise<void> {
    const entries = await this.dataLoader.getAllEntries();
    entries.forEach((entry) => {
      this.index.add({
        id: entry.id,
        title: entry.title.toLowerCase(), // 小文字化
      });
    });
  }
} 