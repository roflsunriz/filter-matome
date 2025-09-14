import { StatisticsManager } from "../managers/statistics-manager.js";
import { constants } from "../utils/constants.js";
import type { MediaItem, AllStats } from '@/types/nl-media-info-types';

export interface CreationDate {
  file: string;
  created?: string;
}

export interface MediaDetails {
  general: Record<string, unknown> | undefined;
  video: Record<string, unknown> | undefined;
  audio: Record<string, unknown> | undefined;
}

export class NicoVideoMediaInfo {
  private mediaInfo: MediaItem[];

  constructor(jsonData: MediaItem[]) {
    this.mediaInfo = jsonData;
  }

  // 安全アクセサ群
  #isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
  }

  #safeGetMediaRef(item: MediaItem): string {
    const media = (item as unknown as { media?: unknown }).media;
    if (this.#isRecord(media)) {
      const ref = media["@ref"];
      return typeof ref === 'string' ? ref : '';
    }
    return '';
  }

  #safeGetTracks(item: MediaItem): unknown[] | undefined {
    const media = (item as unknown as { media?: unknown }).media;
    if (this.#isRecord(media)) {
      const track = media["track"];
      return Array.isArray(track) ? track : undefined;
    }
    return undefined;
  }

  #safeFindTrackByType(item: MediaItem, type: string): Record<string, unknown> | undefined {
    const tracks = this.#safeGetTracks(item);
    const found = tracks?.find((t) => {
      if (!this.#isRecord(t)) return false;
      const atType = t["@type"];
      return typeof atType === 'string' && atType === type;
    });
    return this.#isRecord(found) ? found : undefined;
  }

  #safeGetFirstTrack(item: MediaItem): Record<string, unknown> | undefined {
    const tracks = this.#safeGetTracks(item);
    const first = tracks && tracks.length > 0 ? tracks[0] : undefined;
    return this.#isRecord(first) ? first : undefined;
  }

  /**
   * 音声ファイルの情報を取得する
   */
  getAudioFiles(): MediaItem[] {
    const audioFiles = this.mediaInfo.filter((info) => {
      const ref = this.#safeGetMediaRef(info);
      return ref.includes(constants.AudioInitFile) ||
             ref.includes(constants.AudioInitFile2) ||
             ref.includes(constants.AudioInitFile3);
    });

    if (constants.DEBUG_NLMEDIAINFO) console.log("音声ファイルの情報を取得する:", audioFiles);

    return audioFiles;
  }

  /**
   * 映像ファイルの情報を取得する
   */
  getVideoFiles(): MediaItem[] {
    const videoFiles = this.mediaInfo.filter((info) => {
      const ref = this.#safeGetMediaRef(info);
      return ref.includes(constants.VideoInitFile) ||
             ref.includes(constants.VideoInitFile2) ||
             ref.includes(constants.VideoInitFile3);
    });

    if (constants.DEBUG_NLMEDIAINFO) console.log("映像ファイルの情報を取得する:", videoFiles);

    return videoFiles;
  }

  /**
   * 全体のファイルサイズを取得する
   */
  getTotalFileSize(): number {
    const totalFileSize = this.mediaInfo.reduce((total, info) => {
      const first = this.#safeGetFirstTrack(info);
      const raw: unknown = first ? first["FileSize"] : undefined;
      const s = (typeof raw === 'string' && raw.length > 0) ? raw : '0';
      const fileSize = parseInt(s, 10);
      return total + (Number.isNaN(fileSize) ? 0 : fileSize);
    }, 0);

    if (constants.DEBUG_NLMEDIAINFO) console.log("全体のファイルサイズを取得する:", totalFileSize);

    return totalFileSize;
  }

  /**
   * ファイルの作成日時情報を取得する
   */
  getCreationDates(): CreationDate[] {
    const creationDates = this.mediaInfo.map((info) => {
      const ref = this.#safeGetMediaRef(info);
      const first = this.#safeGetFirstTrack(info);
      const createdRaw: unknown = first ? first["File_Created_Date"] : undefined;
      return {
        file: ref,
        created: typeof createdRaw === 'string' ? createdRaw : undefined,
      };
    });

    if (constants.DEBUG_NLMEDIAINFO)
      console.log("ファイルの作成日時情報を取得する:", creationDates);

    return creationDates;
  }

  /**
   * メディア情報の詳細を取得する
   */
  getMediaDetails(): MediaDetails {
    const generalInfo = this.#extractGeneralInfo();
    const videoInfo = this.#extractVideoInfo();
    const audioInfo = this.#extractAudioInfo();

    if (constants.DEBUG_NLMEDIAINFO)
      console.log("メディア情報の詳細を取得する:", {
        general: generalInfo,
        video: videoInfo,
        audio: audioInfo,
      });

    return {
      general: generalInfo,
      video: videoInfo,
      audio: audioInfo,
    };
  }

  /**
   * 統計情報を取得する
   */
  getFormatStats(): AllStats {
    const formatStats = StatisticsManager.generateFormatStats(this.mediaInfo);

    if (constants.DEBUG_NLMEDIAINFO) console.log("統計情報を取得する:", formatStats);

    return formatStats;
  }

  /**
   * 一般情報を抽出する
   */
  #extractGeneralInfo(): Record<string, unknown> | undefined {
    const master = this.mediaInfo.find((item) => this.#safeGetMediaRef(item).includes(constants.MasterFile));
    const generalTrack = master ? this.#safeFindTrackByType(master, "General") : undefined;
    const generalInfo = generalTrack ?? (master ? this.#safeGetFirstTrack(master) : undefined);

    if (constants.DEBUG_NLMEDIAINFO) console.log("一般情報を抽出する:", generalInfo);

    return generalInfo;
  }

  /**
   * 映像情報を抽出する
   */
  #extractVideoInfo(): Record<string, unknown> | undefined {
    const master = this.mediaInfo.find((item) => this.#safeGetMediaRef(item).includes(constants.MasterFile));
    const videoTrack = master ? this.#safeFindTrackByType(master, "Video") : undefined;
    const initVideo = this.mediaInfo.find((item) => {
      const ref = this.#safeGetMediaRef(item);
      return ref.includes(constants.VideoInitFile) || ref.includes(constants.VideoInitFile2) || ref.includes(constants.VideoInitFile3);
    });
    const initVideoTrack = initVideo ? this.#safeFindTrackByType(initVideo, "Video") ?? this.#safeGetFirstTrack(initVideo) : undefined;
    const videoInfo = videoTrack ?? initVideoTrack;

    if (constants.DEBUG_NLMEDIAINFO) console.log("映像情報を抽出する:", videoInfo);

    return videoInfo;
  }

  /**
   * 音声情報を抽出する
   */
  #extractAudioInfo(): Record<string, unknown> | undefined {
    const master = this.mediaInfo.find((item) => this.#safeGetMediaRef(item).includes(constants.MasterFile));
    const audioTrack = master ? this.#safeFindTrackByType(master, "Audio") : undefined;
    const initAudio = this.mediaInfo.find((item) => {
      const ref = this.#safeGetMediaRef(item);
      return ref.includes(constants.AudioInitFile) || ref.includes(constants.AudioInitFile2) || ref.includes(constants.AudioInitFile3);
    });
    const initAudioTrack = initAudio ? this.#safeFindTrackByType(initAudio, "Audio") ?? this.#safeGetFirstTrack(initAudio) : undefined;
    const audioInfo = audioTrack ?? initAudioTrack;

    if (constants.DEBUG_NLMEDIAINFO) console.log("音声情報を抽出する:", audioInfo);

    return audioInfo;
  }
} 