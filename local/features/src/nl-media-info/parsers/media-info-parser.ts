import { NicoVideoMediaInfo } from './nico-video-media-info.js';
import { constants } from '../utils/constants.js';
import { formatters } from '../utils/formatters.js';
import type { 
  MediaItem, 
  MediaInfoResult, 
  ParsedMediaInfo, 
  VideoTrackInfo, 
  AudioTrackInfo,
  GeneralInfo,
  AllStats
} from '@nlmi/types/media-info.js';

export class MediaInfoParser {
  static parse(jsonContent: MediaItem[]): MediaInfoResult {
    const mediaInfoInstance = new NicoVideoMediaInfo(jsonContent);
    const parsedInfo = this.#parseBasicInfo(jsonContent);
    
    return {
      result: {
        video: parsedInfo.video,
        audio: parsedInfo.audio,
        general: parsedInfo.general,
        averageBitrates: parsedInfo.averageBitrates
      },
      formatStats: mediaInfoInstance.getFormatStats() as AllStats
    };
  }

  static #parseBasicInfo(jsonContent: MediaItem[]): ParsedMediaInfo {
    const mediaInfoInstance = new NicoVideoMediaInfo(jsonContent);
    const toStr = (value: unknown, fallback = ''): string => {
      if (typeof value === 'string') return value;
      if (value === null || value === undefined) return fallback;
      if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
        return String(value);
      }
      if (typeof value === 'object') {
        try {
          return JSON.stringify(value);
        } catch {
          return fallback;
        }
      }
      return fallback;
    };
  
    const result: ParsedMediaInfo = {
      general: {} as GeneralInfo,
      video: [],
      audio: [],
      averageBitrates: {
        overall: 0,
        video: 0,
        audio: 0,
      }
    };
  
    // init01.cmfvファイルからビデオ情報を取得
    const initVideoFile = jsonContent.find(item => 
      item.media["@ref"].includes(constants.VideoInitFile) || 
      item.media["@ref"].includes(constants.VideoInitFile2) ||
      item.media["@ref"].includes(constants.VideoInitFile3)
    );
  
    // init01.cmfaファイルから音声情報を取得
    const initAudioFile = jsonContent.find(item => 
      item.media["@ref"].includes(constants.AudioInitFile) || 
      item.media["@ref"].includes(constants.AudioInitFile2) ||
      item.media["@ref"].includes(constants.AudioInitFile3)
    );
  
    // ビデオ情報の処理
    if (initVideoFile && initVideoFile.media.track) {
      initVideoFile.media.track.forEach(track => {
        if (track["@type"] === "Video") {
          const videoInfo: VideoTrackInfo = {
            "Width": toStr(track.Width),
            "Height": toStr(track.Height),
            "Format": toStr(track.Format),
            "Format profile": toStr(track.Format_Profile),
            "Format settings": toStr(track.Format_Settings_CABAC),
            "Frame rate mode": toStr(track.FrameRate_Mode),
            "Frame rate": toStr(track.FrameRate),
            "Color space": toStr(track.ColorSpace),
            "Color range": toStr(track.colour_range),
            "Color primaries": toStr(track.colour_primaries),
            "Display aspect ratio": toStr(track.DisplayAspectRatio)
          };
          result.video.push(videoInfo);
          
          if (constants.DEBUG_NLMEDIAINFO) {
            console.log("Video track raw data:", track);
            console.log("Processed video data:", videoInfo);
          }
        }
      });
    }
  
    // 音声情報の処理
    if (initAudioFile && initAudioFile.media.track) {
      initAudioFile.media.track.forEach(track => {
        if (track["@type"] === "Audio") {
          const audioInfo: AudioTrackInfo = {
            "Format": toStr(track.Format),
            "Format profile": toStr(track.Format_AdditionalFeatures),
            "Channel(s)": toStr(track.Channels),
            "Channel positions": toStr(track.ChannelPositions),
            "Channel layout": toStr(track.ChannelLayout),
            "Sampling rate": toStr(track.SamplingRate),
            "Frame rate": toStr(track.FrameRate),
            "Compression mode": toStr(track.Compression_Mode),
            "Stream size": toStr(track.StreamSize),
            "Default": toStr(track.Default),
            "Alternate group": toStr(track.AlternateGroup)
          };
          result.audio.push(audioInfo);
        }
      });
    }
  
    // 音声・ビデオファイルの分類と合計サイズ計算
    const audioFiles = mediaInfoInstance.getAudioFiles();
    const videoFiles = mediaInfoInstance.getVideoFiles();
    
    let totalAudioSize = 0; // eslint-disable-line @typescript-eslint/no-unused-vars
    let totalVideoSize = 0; // eslint-disable-line @typescript-eslint/no-unused-vars
    
    audioFiles.forEach(file => {
      const fs = file.media.track[0].FileSize;
      const fileSize = formatters.parseFileSize(toStr(fs, '0'));
      totalAudioSize += fileSize;
    });
    
    videoFiles.forEach(file => {
      const fsv = file.media.track[0].FileSize;
      const fileSize = formatters.parseFileSize(toStr(fsv, '0'));
      totalVideoSize += fileSize;
    });
  
    // master.m3u8からDurationを取得
    const masterFile = jsonContent.find(item =>
      item.media["@ref"].includes("master.m3u8")
    );
    
    // 一般情報の設定
    const generalTrack = masterFile?.media.track.find(track => track["@type"] === "General");
    result.general = {
      "Format": (typeof generalTrack?.Format === 'string' && generalTrack.Format.length > 0) ? generalTrack.Format : "N/A",
      "File size": (typeof generalTrack?.FileSize === 'string' && generalTrack.FileSize.length > 0) ? generalTrack.FileSize : "N/A",
      "Duration": ((): string => {
        const v = initVideoFile?.media.track.find(track => track["@type"] === "Video")?.Duration;
        return (typeof v === 'string' && v.length > 0) ? v : 'N/A';
      })(),
      "Complete name": masterFile?.media["@ref"] || "N/A",
      "ID": constants.nlMediaInfoVideoId
    };
  
    // ビットレート設定
    if (initAudioFile && initAudioFile.media.track) {
      const audioTrack = initAudioFile.media.track.find(track => track["@type"] === "Audio");
      const ab = audioTrack?.BitRate_Maximum;
      result.averageBitrates.audio = audioTrack ? parseInt(toStr(ab, "192000")) : 192000;
    }
  
    if (initVideoFile && initVideoFile.media.track) {
      const videoTrack = initVideoFile.media.track.find(track => track["@type"] === "Video");
      const vb = videoTrack?.BitRate_Maximum;
      result.averageBitrates.video = videoTrack ? parseInt(toStr(vb, "1500000")) : 1500000;
    }
  
    result.averageBitrates.overall = result.averageBitrates.audio + result.averageBitrates.video;
  
    if (constants.DEBUG_NLMEDIAINFO) {
      console.log("init01.cmfv:", initVideoFile);
      console.log("init01.cmfa:", initAudioFile);
      console.log("パース結果:", result);
    }
  
    return result;
  }
} 