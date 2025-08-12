import type { VideoData } from '../types/index.js';
import { ProgressManager } from '../managers/progress-manager.js';

export class LoadDataFromMemory {
  constructor(private progressManager: ProgressManager) {}

  // メモリから直接データを取得＆統合
  public getAllEntries(): VideoData[] {
    this.progressManager.updateProgress(1, 3);
    const merged = this.mergeLists();
    this.progressManager.updateProgress(2, 3);
    const sorted = this.sortEntries(merged);
    this.progressManager.updateProgress(3, 3);
    return sorted;
  }

  // tempListとcacheListをマージ
  private mergeLists(): VideoData[] {
    const entries: VideoData[] = [];

    // tempList優先で統合
    for (const [id, data] of Object.entries(tempList)) {
      entries.push(this.normalizeEntry(id, data));
    }

    // cacheListからtempListにないもののみ追加
    for (const [id, data] of Object.entries(cacheList)) {
      if (!tempList[id]) {
        entries.push(this.normalizeEntry(id, data));
      }
    }

    return entries;
  }

  // エントリ正規化（簡易版）
  private normalizeEntry(id: string, data: string[]): VideoData {
    return {
      id,
      baseId: id.match(/^[a-z]{2}\d+/)?.[0] || id,
      title: data[0] || "タイトル不明",
      thumbnailUrl: this.generateThumbnailUrl(id),
      quality: this.parseQuality(id),
      isTemp: !!tempList[id],
      lastUpdated: Date.now(),
    };
  }

  // サムネイルURL生成（sm9 → 9/9）
  private generateThumbnailUrl(id: string): string {
    const match = id.match(/[a-z]{2}(\d+)/);
    return `https://nicovideo.cdn.nimg.jp/thumbnails/${match?.[1]}/${match?.[1]}`;
  }

  // 品質情報をIDから直接解析
  private parseQuality(id: string): string {
    const match = id.match(/(\d+)p/);
    return match ? `${match[1]}p` : "unknown";
  }

  // 従来のソートロジックを維持
  private sortEntries(entries: VideoData[]): VideoData[] {
    return entries
      .filter((entry) => entry && entry.id) // 無効なエントリを除外
      .sort((a, b) => {
        const typePriority: Record<string, number> = { nm: 1, sm: 2, so: 3 };
        const getType = (id: string) => id.slice(0, 2);
        const getNumber = (id: string) => parseInt(id.match(/\d+/)?.[0] || "0", 10);

        const aType = getType(a.id);
        const bType = getType(b.id);

        // タイプ順で比較
        if (typePriority[aType] !== typePriority[bType]) {
          return typePriority[aType] - typePriority[bType];
        }

        // 同じタイプなら数値で比較
        return getNumber(a.id) - getNumber(b.id);
      });
  }

  public getEntriesByIds(ids: string[]): VideoData[] {
    const allEntries = this.getAllEntries();
    return allEntries.filter((entry) => ids.includes(entry.id));
  }
} 