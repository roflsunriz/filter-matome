import { StatisticsManager } from "../managers/statistics-manager.js";
import { constants } from "../utils/constants.js";
import type { MediaItem } from '@nlmi/types/media-info.js';

export interface CreationDate {
  file: string;
  created?: string;
}

export interface MediaDetails {
  general: any;
  video: any;
  audio: any;
}

export class NicoVideoMediaInfo {
  private mediaInfo: MediaItem[];

  constructor(jsonData: MediaItem[]) {
    this.mediaInfo = jsonData;
  }

  /**
   * 音声ファイルの情報を取得するのじゃ
   */
  getAudioFiles(): MediaItem[] {
    const audioFiles = this.mediaInfo.filter(
      (info) => info.media["@ref"].includes(constants.AudioInitFile) || 
                info.media["@ref"].includes(constants.AudioInitFile2) || 
                info.media["@ref"].includes(constants.AudioInitFile3)
    );

    if (constants.DEBUG_NLMEDIAINFO) console.log("音声ファイルの情報を取得するのじゃ:", audioFiles);

    return audioFiles;
  }

  /**
   * 映像ファイルの情報を取得するのじゃ
   */
  getVideoFiles(): MediaItem[] {
    const videoFiles = this.mediaInfo.filter(
      (info) => info.media["@ref"].includes(constants.VideoInitFile) || 
                info.media["@ref"].includes(constants.VideoInitFile2) || 
                info.media["@ref"].includes(constants.VideoInitFile3)
    );

    if (constants.DEBUG_NLMEDIAINFO) console.log("映像ファイルの情報を取得するのじゃ:", videoFiles);

    return videoFiles;
  }

  /**
   * 全体のファイルサイズを取得するのじゃ
   */
  getTotalFileSize(): number {
    const totalFileSize = this.mediaInfo.reduce((total, info) => {
      const fileSize = parseInt(info.media.track[0].FileSize || "0", 10);
      return total + fileSize;
    }, 0);

    if (constants.DEBUG_NLMEDIAINFO) console.log("全体のファイルサイズを取得するのじゃ:", totalFileSize);

    return totalFileSize;
  }

  /**
   * ファイルの作成日時情報を取得するのじゃ
   */
  getCreationDates(): CreationDate[] {
    const creationDates = this.mediaInfo.map((info) => ({
      file: info.media["@ref"],
      created: info.media.track[0].File_Created_Date,
    }));

    if (constants.DEBUG_NLMEDIAINFO)
      console.log("ファイルの作成日時情報を取得するのじゃ:", creationDates);

    return creationDates;
  }

  /**
   * メディア情報の詳細を取得するのじゃ
   */
  getMediaDetails(): MediaDetails {
    const generalInfo = this.#extractGeneralInfo();
    const videoInfo = this.#extractVideoInfo();
    const audioInfo = this.#extractAudioInfo();

    if (constants.DEBUG_NLMEDIAINFO)
      console.log("メディア情報の詳細を取得するのじゃ:", {
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
   * 統計情報を取得するのじゃ
   */
  getFormatStats(): any {
    const formatStats = StatisticsManager.generateFormatStats(this.mediaInfo);

    if (constants.DEBUG_NLMEDIAINFO) console.log("統計情報を取得するのじゃ:", formatStats);

    return formatStats;
  }

  /**
   * 一般情報を抽出するのじゃ
   */
  #extractGeneralInfo(): any {
    const generalInfo =
      this.mediaInfo.find((item) => item.media["@ref"].includes(constants.MasterFile))?.media.track.find((track) => track["@type"] === "General") ||
      this.mediaInfo.find((item) => item.media["@ref"].includes(constants.MasterFile));

    if (constants.DEBUG_NLMEDIAINFO) console.log("一般情報を抽出するのじゃ:", generalInfo);

    return generalInfo;
  }

  /**
   * 映像情報を抽出するのじゃ
   */
  #extractVideoInfo(): any {
    const videoInfo =
      this.mediaInfo.find((item) => item.media["@ref"].includes(constants.MasterFile))?.media.track.find((track) => track["@type"] === "Video") ||
      this.mediaInfo.find((item) => item.media["@ref"].includes(constants.VideoInitFile)) ||
      this.mediaInfo.find((item) => item.media["@ref"].includes(constants.VideoInitFile2)) ||
      this.mediaInfo.find((item) => item.media["@ref"].includes(constants.VideoInitFile3));

    if (constants.DEBUG_NLMEDIAINFO) console.log("映像情報を抽出するのじゃ:", videoInfo);

    return videoInfo;
  }

  /**
   * 音声情報を抽出するのじゃ
   */
  #extractAudioInfo(): any {
    const audioInfo =
      this.mediaInfo.find((item) => item.media["@ref"].includes(constants.MasterFile))?.media.track.find((track) => track["@type"] === "Audio") ||
      this.mediaInfo.find((item) => item.media["@ref"].includes(constants.AudioInitFile)) ||
      this.mediaInfo.find((item) => item.media["@ref"].includes(constants.AudioInitFile2)) ||
      this.mediaInfo.find((item) => item.media["@ref"].includes(constants.AudioInitFile3));

    if (constants.DEBUG_NLMEDIAINFO) console.log("音声情報を抽出するのじゃ:", audioInfo);

    return audioInfo;
  }
} 