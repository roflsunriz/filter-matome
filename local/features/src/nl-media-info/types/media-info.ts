// メディア情報の基本型定義

export interface MediaTrack {
  "@type": string;
  [key: string]: any;
}

export interface MediaItem {
  media: {
    "@ref": string;
    track: MediaTrack[];
  };
}

export interface VideoTrackInfo {
  Width?: string;
  Height?: string;
  Format?: string;
  "Format profile"?: string;
  "Format settings"?: string;
  "Frame rate mode"?: string;
  "Frame rate"?: string;
  "Color space"?: string;
  "Color range"?: string;
  "Color primaries"?: string;
  "Display aspect ratio"?: string;
}

export interface AudioTrackInfo {
  Format?: string;
  "Format profile"?: string;
  "Channel(s)"?: string;
  "Channel positions"?: string;
  "Channel layout"?: string;
  "Sampling rate"?: string;
  "Frame rate"?: string;
  "Compression mode"?: string;
  "Stream size"?: string;
  Default?: string;
  "Alternate group"?: string;
}

export interface GeneralInfo {
  Format: string;
  "File size": string;
  Duration: string;
  "Complete name": string;
  ID: string;
}

export interface AverageBitrates {
  overall: number;
  video: number;
  audio: number;
}

export interface ParsedMediaInfo {
  general: GeneralInfo;
  video: VideoTrackInfo[];
  audio: AudioTrackInfo[];
  averageBitrates: AverageBitrates;
}

// 統計情報の型定義
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

export interface MediaInfoResult {
  result: ParsedMediaInfo;
  formatStats: AllStats;
}

// NicoCache_nl関連の型定義
export interface NicoCacheVideoData {
  id: string;
  title: string;
}

export interface NicoCacheWatchData {
  apiData: {
    video: NicoCacheVideoData;
  };
}

export interface NicoCacheNl {
  watch: NicoCacheWatchData;
}

// Window.opener.NicoCache_nlへのアクセス用の型定義
export interface WindowWithNicoCache extends Window {
  NicoCache_nl: NicoCacheNl;
} 