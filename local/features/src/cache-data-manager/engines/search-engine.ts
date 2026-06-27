import type { LoadDataFromMemory } from "@/cache-data-manager/loaders/load-data-from-memory.js";
import type { VideoData } from "@/types";
// avoid importing project path aliases here to keep linting safe

/**
 * シンプルな部分一致検索エンジン
 * FlexSearchは日本語のトークナイズに問題があるため、
 * シンプルな部分一致検索を使用
 */
export class SearchEngine {
  private entries: VideoData[] = [];
  private indexReady: Promise<void>;

  constructor(private dataLoader: LoadDataFromMemory) {
    this.indexReady = this.rebuildIndex();
  }

  private rebuildIndex(): Promise<void> {
    this.entries = this.dataLoader.getAllEntries();
    return Promise.resolve();
  }

  public setEntries(entries: VideoData[]): void {
    this.entries = entries;
    this.indexReady = Promise.resolve();
  }

  public async search(query: string): Promise<string[]> {
    const cleanQuery = query.toLowerCase().trim();
    await this.indexReady;

    if (!cleanQuery) {
      return [];
    }

    // 複数キーワード対応（スペース区切り）
    const keywords = cleanQuery.split(/\s+/).filter((k) => k.length > 0);

    const matchedIds: string[] = [];

    for (const entry of this.entries) {
      const title = entry.title.toLowerCase();
      // 全てのキーワードがタイトルに含まれているかチェック
      const matches = keywords.every((keyword) => title.includes(keyword));
      if (matches) {
        matchedIds.push(entry.baseId);
      }
    }

    return matchedIds;
  }
}
