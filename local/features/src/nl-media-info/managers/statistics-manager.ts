import { formatters } from '../utils/formatters';
import type { MediaItem } from '@/types';

const MEDIA_TYPES = {
  AUDIO: 'audio',
  VIDEO: 'video',
  OTHER: 'other'
} as const;

type MediaType = typeof MEDIA_TYPES[keyof typeof MEDIA_TYPES];

export interface FormatStats {
  count: number;
  totalSize: number;
  averageSize: number;
  minSize: number;
  maxSize: number;
}

export interface CategoryStats {
  [format: string]: FormatStats;
}

export interface AllStats {
  [category: string]: CategoryStats;
}

export interface TotalStats {
  totalFiles: number;
  totalSize: number;
  audioFiles: number;
  audioSize: number;
  videoFiles: number;
  videoSize: number;
}

export class StatisticsManager {
  /**
   * メディアファイルの統計情報を生成するのじゃ
   * @param mediaFiles - メディアファイルの情報
   * @returns フォーマット別の統計情報
   */
  static generateFormatStats(mediaFiles: MediaItem[]): AllStats {
    return Object.values(MEDIA_TYPES).reduce((acc, type) => {
      acc[type] = this.#calculateFormatStats(this.#filterFilesByType(mediaFiles, type));
      return acc;
    }, {} as AllStats);
  }

  /**
   * ファイルをフィルタリングするのじゃ
   */
  static #getMediaRef(file: MediaItem): string {
    const media = (file as unknown as { media?: unknown }).media;
    if (typeof media === 'object' && media !== null) {
      const ref = (media as Record<string, unknown>)["@ref"];
      return typeof ref === 'string' ? ref : '';
    }
    return '';
  }

  static #filterFilesByType(files: MediaItem[], type: MediaType): MediaItem[] {
    return files.filter(file => {
      const mediaRef = this.#getMediaRef(file);
      switch (type) {
        case MEDIA_TYPES.AUDIO:
          return mediaRef.includes("audio") && !mediaRef.includes("init");
        case MEDIA_TYPES.VIDEO:
          return mediaRef.includes("video") && !mediaRef.includes("init");
        case MEDIA_TYPES.OTHER:
          return !mediaRef.includes("audio") && !mediaRef.includes("video");
        default:
          return false;
      }
    });
  }

  /**
   * フォーマット別の統計を計算するのじゃ
   */
  static #calculateFormatStats(files: MediaItem[]): CategoryStats {
    const stats: CategoryStats = {};

    files.forEach(file => {
      const format = this.#getFileFormat(file);
      const fileSize = this.#getFileSize(file);

      if (!stats[format]) {
        stats[format] = {
          count: 0,
          totalSize: 0,
          averageSize: 0,
          minSize: Infinity,
          maxSize: 0
        };
      }

      stats[format].count++;
      stats[format].totalSize += fileSize;
      stats[format].minSize = Math.min(stats[format].minSize, fileSize);
      stats[format].maxSize = Math.max(stats[format].maxSize, fileSize);
    });

    // 平均サイズを計算するのじゃ
    Object.values(stats).forEach(stat => {
      stat.averageSize = stat.totalSize / stat.count;
    });

    return stats;
  }

  /**
   * ファイルのフォーマットを取得するのじゃ
   */
  static #getFirstTrack(file: MediaItem): Record<string, unknown> | undefined {
    const media = (file as unknown as { media?: unknown }).media;
    if (typeof media === 'object' && media !== null) {
      const mediaObj = media as { track?: unknown };
      if (Array.isArray(mediaObj.track) && mediaObj.track.length > 0) {
        const trackArr = mediaObj.track as unknown[];
        const first = trackArr[0];
        if (typeof first === 'object' && first !== null) return first as Record<string, unknown>;
      }
    }
    return undefined;
  }

  static #getFileFormat(file: MediaItem): string {
    const first = this.#getFirstTrack(file);
    const fmt = first ? first["Format"] : undefined;
    return (typeof fmt === 'string' && fmt.length > 0) ? fmt : "Unknown";
  }

  /**
   * ファイルサイズを取得するのじゃ
   */
  static #getFileSize(file: MediaItem): number {
    const first = this.#getFirstTrack(file);
    const size = first ? first["FileSize"] : undefined;
    const s = (typeof size === 'string' && size.length > 0) ? size : '0';
    const parsed = parseInt(s, 10);
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  /**
   * 統計情報をHTML形式で出力するのじゃ
   */
  static generateStatsHTML(stats: AllStats): string {
    let html = "";
    
    Object.entries(stats).forEach(([category, formats]) => {
      html += `<div class="category">
        <h4>${category.toUpperCase()}</h4>`;
      
      Object.entries(formats).forEach(([format, formatStats]) => {
        html += `
          <div class="format">
            <h5>${format}</h5>
            <p>ファイル数: ${formatStats.count}</p>
            <p>総サイズ: ${formatters.formatFileSize(formatStats.totalSize)}</p>
            <p>平均サイズ: ${formatters.formatFileSize(formatStats.averageSize)}</p>
            <p>最小サイズ: ${formatters.formatFileSize(formatStats.minSize)}</p>
            <p>最大サイズ: ${formatters.formatFileSize(formatStats.maxSize)}</p>
          </div>`;
      });
      
      html += "</div>";
    });
    
    return html;
  }

  /**
   * 合計統計を計算するのじゃ
   */
  static calculateTotalStats(stats: AllStats): TotalStats {
    const totals: TotalStats = {
      totalFiles: 0,
      totalSize: 0,
      audioFiles: 0,
      audioSize: 0,
      videoFiles: 0,
      videoSize: 0
    };

    if (stats.audio) {
      Object.values(stats.audio).forEach(format => {
        totals.audioFiles += format.count;
        totals.audioSize += format.totalSize;
      });
    }

    if (stats.video) {
      Object.values(stats.video).forEach(format => {
        totals.videoFiles += format.count;
        totals.videoSize += format.totalSize;
      });
    }

    totals.totalFiles = totals.audioFiles + totals.videoFiles;
    totals.totalSize = totals.audioSize + totals.videoSize;

    return totals;
  }
} 