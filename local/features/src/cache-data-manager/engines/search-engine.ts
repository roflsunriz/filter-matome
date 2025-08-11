import type { LoadDataFromMemory } from '../loaders/load-data-from-memory.js';

export class SearchEngine {
  private index: unknown;
  private indexReady: Promise<void>;

  constructor(private dataLoader: LoadDataFromMemory) {
    this.indexReady = this.loadFlexSearch(); // 初期化完了フラグ追加
  }

  private async loadFlexSearch(): Promise<void> {
    if (typeof (window as unknown as { FlexSearch?: unknown }).FlexSearch === "undefined") {
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
    const Flex = (window as unknown as { FlexSearch: { Document: new (...args: unknown[]) => unknown } }).FlexSearch;
    this.index = new Flex.Document({
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

    const results = (this.index as unknown as { search: (q: string, opts: Record<string, unknown>) => Array<{ result: unknown[] }> }).search(cleanQuery, {
      limit: 1000,
      suggest: true,
      enrich: true,
      bool: "or",
    });

    return [...new Set(results.flatMap((r) => r.result))].filter((id): id is string => typeof id === 'string');
  }

  private async rebuildIndex(): Promise<void> {
    const entries = await this.dataLoader.getAllEntries();
    entries.forEach((entry) => {
      (this.index as unknown as { add: (doc: { id: string; title: string }) => void }).add({
        id: entry.id,
        title: entry.title.toLowerCase(), // 小文字化
      });
    });
  }
} 