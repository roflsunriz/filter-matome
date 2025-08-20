import type { WindowWithNicoCache } from '@/types';

export interface Constants {
  nlMediaInfobaseurl: string;
  nlMediaInfoVideoId: string;
  nlMediaInfoVideoTitle: string;
  DEBUG_NLMEDIAINFO: boolean;
  MasterFile: string;
  VideoInitFile: string;
  AudioInitFile: string;
  VideoInitFile2: string;
  AudioInitFile2: string;
  VideoInitFile3: string;
  AudioInitFile3: string;
}

export const constants: Constants = {
  nlMediaInfobaseurl: "https://www.nicovideo.jp/cache/mediainfo?",
  nlMediaInfoVideoId: (window.opener as WindowWithNicoCache).NicoCache_nl.watch.apiData.video.id,
  nlMediaInfoVideoTitle: (window.opener as WindowWithNicoCache).NicoCache_nl.watch.apiData.video.title,
  DEBUG_NLMEDIAINFO: true,
  MasterFile: "master.m3u8",
  VideoInitFile: "init01.cmfv",
  AudioInitFile: "init01.cmfa",
  VideoInitFile2: "init1.cmfv",
  AudioInitFile2: "init1.cmfa",
  VideoInitFile3: "001.cmfv",
  AudioInitFile3: "001.cmfa",
}; 