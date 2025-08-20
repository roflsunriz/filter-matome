import type { LoadDataFromMemory } from '../loaders/load-data-from-memory.js';
// avoid importing project path aliases here to keep linting safe

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

  private rebuildIndex(): void {
    const entries = this.dataLoader.getAllEntries() as unknown[];

    for (const rawEntry of entries) {
      if (typeof rawEntry !== 'object' || rawEntry === null) continue;
      const rec = rawEntry as Record<string, unknown>;
      const id = typeof rec.id === 'string' ? rec.id : undefined;
      const titleRaw = typeof rec.title === 'string' ? rec.title : undefined;
      if (!id || !titleRaw) continue;

      const safeTitle = titleRaw.toLowerCase();

      const indexWithAdd = this.index as { add?: (doc: { id: string; title: string }) => void } | undefined;
      if (indexWithAdd && typeof indexWithAdd.add === 'function') {
        indexWithAdd.add({ id, title: safeTitle });
      }
    }
  }
} 