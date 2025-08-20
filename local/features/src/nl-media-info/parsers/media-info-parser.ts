import { NicoVideoMediaInfo } from './nico-video-media-info.js';
import { constants } from '../utils/constants.js';
// import { formatters } from '../utils/formatters.js';
import { validators } from '../utils/validators.js';
import type {
  MediaItem,
  MediaInfoResult,
  ParsedMediaInfo,
  VideoTrackInfo,
  AudioTrackInfo
} from '@/types/nl-media-info-types';

export class MediaInfoParser {
  static parse(jsonContent: MediaItem[]): MediaInfoResult {
    if (!validators.isValidMediaInfo(jsonContent)) {
      throw new Error('Invalid media info format');
    }
    const parsed = this.#parseBasicInfo(jsonContent);
    const stats = new NicoVideoMediaInfo(jsonContent).getFormatStats();
    return { result: parsed, formatStats: stats } as MediaInfoResult;
  }

  static #parseBasicInfo(jsonContent: MediaItem[]): ParsedMediaInfo {
    const getMediaRef = (item: MediaItem): string => {
      const media = (item as unknown as { media?: unknown }).media;
      if (typeof media === 'object' && media !== null) {
        const ref = (media as Record<string, unknown>)["@ref"];
        return typeof ref === 'string' ? ref : '';
      }
      return '';
    };

    const getTracks = (item: MediaItem): unknown[] | undefined => {
      const media = (item as unknown as { media?: unknown }).media;
      if (typeof media === 'object' && media !== null) {
        const track = (media as Record<string, unknown>)["track"];
        return Array.isArray(track) ? track : undefined;
      }
      return undefined;
    };

    // const getFirstTrack = (item: MediaItem): Record<string, unknown> | undefined => {
    //   const tracks = getTracks(item);
    //   if (Array.isArray(tracks) && tracks.length > 0) {
    //     const first = tracks[0];
    //     if (typeof first === 'object' && first !== null) return first as Record<string, unknown>;
    //   }
    //   return undefined;
    // };
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
  
    const collectedVideo: VideoTrackInfo[] = [];
    const collectedAudio: AudioTrackInfo[] = [];
  
    // init01.cmfvファイルからビデオ情報を取得
    const initVideoFile: MediaItem | undefined = jsonContent.find((item): boolean => 
      getMediaRef(item).includes(constants.VideoInitFile) || 
      getMediaRef(item).includes(constants.VideoInitFile2) ||
      getMediaRef(item).includes(constants.VideoInitFile3)
    );

    // init01.cmfaファイルから音声情報を取得
    const initAudioFile: MediaItem | undefined = jsonContent.find((item): boolean => 
      getMediaRef(item).includes(constants.AudioInitFile) || 
      getMediaRef(item).includes(constants.AudioInitFile2) ||
      getMediaRef(item).includes(constants.AudioInitFile3)
    );
  
    // ビデオ情報の処理
    if (initVideoFile) {
      const tracks = getTracks(initVideoFile);
      tracks?.forEach(track => {
        if (validators.isValidTrack(track) && (track as Record<string, unknown>)["@type"] === "Video") {
          const tr = track as Record<string, unknown>;
          const videoInfo: VideoTrackInfo = {
            "Width": toStr(tr.Width),
            "Height": toStr(tr.Height),
            "Format": toStr(tr.Format),
            "Format profile": toStr(tr.Format_Profile),
            "Format settings": toStr(tr.Format_Settings_CABAC),
            "Frame rate mode": toStr(tr.FrameRate_Mode),
            "Frame rate": toStr(tr.FrameRate),
            "Color space": toStr(tr.ColorSpace),
            "Color range": toStr(tr.colour_range),
            "Color primaries": toStr(tr.colour_primaries),
            "Display aspect ratio": toStr(tr.DisplayAspectRatio)
          };
          collectedVideo.push(videoInfo);
          
          if (constants.DEBUG_NLMEDIAINFO) {
            console.log("Video track raw data:", track);
            console.log("Processed video data:", videoInfo);
          }
        }
      });
    }
  
    // 音声情報の処理
    if (initAudioFile) {
      const tracks = getTracks(initAudioFile);
      tracks?.forEach(track => {
        if (validators.isValidTrack(track) && (track as Record<string, unknown>)["@type"] === "Audio") {
          const tr = track as Record<string, unknown>;
          const audioInfo: AudioTrackInfo = {
            "Format": toStr(tr.Format),
            "Format profile": toStr(tr.Format_AdditionalFeatures),
            "Channel(s)": toStr(tr.Channels),
            "Channel positions": toStr(tr.ChannelPositions),
            "Channel layout": toStr(tr.ChannelLayout),
            "Sampling rate": toStr(tr.SamplingRate),
            "Frame rate": toStr(tr.FrameRate),
            "Compression mode": toStr(tr.Compression_Mode),
            "Stream size": toStr(tr.StreamSize),
            "Default": toStr(tr.Default),
            "Alternate group": toStr(tr.AlternateGroup)
          };
          collectedAudio.push(audioInfo);
        }
      });
    }
  
    // 音声・ビデオファイルの分類と合計サイズ計算
    // const audioFiles = mediaInfoInstance.getAudioFiles();
    // const videoFiles = mediaInfoInstance.getVideoFiles();
    
    // 合計サイズは現状UIで未使用のため計算のみ削除
    
    // 合計サイズは未使用のため走査自体も省略
  
    // master.m3u8からDurationを取得
    const masterFile: MediaItem | undefined = jsonContent.find((item): boolean =>
      getMediaRef(item).includes("master.m3u8")
    );
    
    // 一般情報の設定
    const generalTracks = masterFile ? getTracks(masterFile) : undefined;
    const generalTrack = generalTracks ? generalTracks.find(t => typeof t === 'object' && (t as Record<string, unknown>)["@type"] === "General") as Record<string, unknown> | undefined : undefined;
    const durationValue = (() => {
      const videoTracks = initVideoFile ? getTracks(initVideoFile) : undefined;
      const v = videoTracks ? videoTracks.find(t => typeof t === 'object' && (t as Record<string, unknown>)["@type"] === "Video") as Record<string, unknown> | undefined : undefined;
      return toStr(v ? v["Duration"] : undefined, 'N/A');
    })();
    const safeGeneral = {
      "Format": toStr(generalTrack?.Format, 'N/A'),
      "File size": toStr(generalTrack?.FileSize, 'N/A'),
      "Duration": durationValue,
      "Complete name": masterFile ? getMediaRef(masterFile) : "N/A",
      "ID": constants.nlMediaInfoVideoId
    } as const;
  
    // ビットレート設定（ローカルで計算）
    let avgAudio = 192000;
    let avgVideo = 1500000;
    if (initAudioFile) {
      const tracks = getTracks(initAudioFile);
      const audioTrack = tracks ? tracks.find(t => typeof t === 'object' && (t as Record<string, unknown>)["@type"] === "Audio") as Record<string, unknown> | undefined : undefined;
      const ab = audioTrack ? audioTrack["BitRate_Maximum"] : undefined;
      avgAudio = audioTrack ? parseInt(toStr(ab, "192000")) : 192000;
    }

    if (initVideoFile) {
      const tracks = getTracks(initVideoFile);
      const videoTrack = tracks ? tracks.find(t => typeof t === 'object' && (t as Record<string, unknown>)["@type"] === "Video") as Record<string, unknown> | undefined : undefined;
      const vb = videoTrack ? videoTrack["BitRate_Maximum"] : undefined;
      avgVideo = videoTrack ? parseInt(toStr(vb, "1500000")) : 1500000;
    }

    const safeResult: ParsedMediaInfo = {
      general: safeGeneral,
      video: collectedVideo,
      audio: collectedAudio,
      averageBitrates: { audio: avgAudio, video: avgVideo, overall: avgAudio + avgVideo }
    };
  
    if (constants.DEBUG_NLMEDIAINFO) {
      console.log("init01.cmfv:", initVideoFile);
      console.log("init01.cmfa:", initAudioFile);
      console.log("パース結果:", safeResult);
    }
  
    return safeResult;
  }
} 