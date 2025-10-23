import FlexSearchDocument from "flexsearch/dist/module/document.js";
import type {
  Document as FlexSearchDocumentType,
  DocumentSearchOptions,
  SimpleDocumentSearchResultSetUnit,
} from "flexsearch";
import type { LoadDataFromMemory } from "@/cache-data-manager/loaders/load-data-from-memory.js";
// avoid importing project path aliases here to keep linting safe

type SearchDocument = { id: string; title: string };

export class SearchEngine {
  private index: FlexSearchDocumentType<SearchDocument> | null = null;
  private indexReady: Promise<void>;

  constructor(private dataLoader: LoadDataFromMemory) {
    this.indexReady = this.initializeFlexSearch();
  }

  private initializeFlexSearch(): Promise<void> {
    this.index = new FlexSearchDocument<SearchDocument>({
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
    return Promise.resolve();
  }

  public async search(query: string): Promise<string[]> {
    const cleanQuery = query.toLowerCase().trim();
    await this.indexReady;
    const index = this.index;
    if (!cleanQuery || !index) return [];

    const results: SimpleDocumentSearchResultSetUnit[] = index.search(
      cleanQuery,
      {
        limit: 1000,
        suggest: true,
        enrich: true,
        bool: "or",
      } satisfies Partial<DocumentSearchOptions<true>>,
    );

    return [...new Set(results.flatMap((r) => r.result))].filter(
      (id): id is string => typeof id === "string",
    );
  }

  private rebuildIndex(): void {
    const index = this.index;
    if (!index) return;

    const entries = this.dataLoader.getAllEntries() as unknown[];

    for (const rawEntry of entries) {
      if (typeof rawEntry !== "object" || rawEntry === null) continue;
      const rec = rawEntry as Record<string, unknown>;
      const id = typeof rec.id === "string" ? rec.id : undefined;
      const titleRaw = typeof rec.title === "string" ? rec.title : undefined;
      if (!id || !titleRaw) continue;

      const safeTitle = titleRaw.toLowerCase();

      index.add({ id, title: safeTitle });
    }
  }
}
