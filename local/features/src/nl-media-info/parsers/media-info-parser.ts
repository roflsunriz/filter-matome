import { NicoVideoMediaInfo } from './nico-video-media-info.js';
import { constants } from '../utils/constants.js';
import { formatters } from '../utils/formatters.js';
import type { 
  MediaItem, 
  MediaInfoResult, 
  ParsedMediaInfo, 
  VideoTrackInfo, 
  AudioTrackInfo,
  GeneralInfo
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
      formatStats: mediaInfoInstance.getFormatStats()
    };
  }

  static #parseBasicInfo(jsonContent: MediaItem[]): ParsedMediaInfo {
    const mediaInfoInstance = new NicoVideoMediaInfo(jsonContent);
  
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
            "Width": track.Width,
            "Height": track.Height,
            "Format": track.Format,
            "Format profile": track.Format_Profile,
            "Format settings": track.Format_Settings_CABAC,
            "Frame rate mode": track.FrameRate_Mode,
            "Frame rate": track.FrameRate,
            "Color space": track.ColorSpace,
            "Color range": track.colour_range,
            "Color primaries": track.colour_primaries,
            "Display aspect ratio": track.DisplayAspectRatio
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
            "Format": track.Format,
            "Format profile": track.Format_AdditionalFeatures,
            "Channel(s)": track.Channels,
            "Channel positions": track.ChannelPositions,
            "Channel layout": track.ChannelLayout,
            "Sampling rate": track.SamplingRate,
            "Frame rate": track.FrameRate,
            "Compression mode": track.Compression_Mode,
            "Stream size": track.StreamSize,
            "Default": track.Default,
            "Alternate group": track.AlternateGroup
          };
          result.audio.push(audioInfo);
        }
      });
    }
  
    // 音声・ビデオファイルの分類と合計サイズ計算
    const audioFiles = mediaInfoInstance.getAudioFiles();
    const videoFiles = mediaInfoInstance.getVideoFiles();
    
    let totalAudioSize = 0;
    let totalVideoSize = 0;
    
    audioFiles.forEach(file => {
      const fileSize = formatters.parseFileSize(file.media.track[0].FileSize);
      totalAudioSize += fileSize;
    });
    
    videoFiles.forEach(file => {
      const fileSize = formatters.parseFileSize(file.media.track[0].FileSize);
      totalVideoSize += fileSize;
    });
  
    // master.m3u8からDurationを取得
    const masterFile = jsonContent.find(item =>
      item.media["@ref"].includes("master.m3u8")
    );
    
    // 一般情報の設定
    const generalTrack = masterFile?.media.track.find(track => track["@type"] === "General");
    result.general = {
      "Format": generalTrack?.Format || "N/A",
      "File size": generalTrack?.FileSize || "N/A",
      "Duration": initVideoFile?.media.track.find(track => track["@type"] === "Video")?.Duration || "N/A",
      "Complete name": masterFile?.media["@ref"] || "N/A",
      "ID": constants.nlMediaInfoVideoId
    };
  
    // ビットレート設定
    if (initAudioFile && initAudioFile.media.track) {
      const audioTrack = initAudioFile.media.track.find(track => track["@type"] === "Audio");
      result.averageBitrates.audio = audioTrack ? parseInt(audioTrack.BitRate_Maximum || "192000") : 192000;
    }
  
    if (initVideoFile && initVideoFile.media.track) {
      const videoTrack = initVideoFile.media.track.find(track => track["@type"] === "Video");
      result.averageBitrates.video = videoTrack ? parseInt(videoTrack.BitRate_Maximum || "1500000") : 1500000;
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