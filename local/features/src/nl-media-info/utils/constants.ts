
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

// Safely extract video id/title from window.opener without assuming types from the opener
const _openerUnknown: unknown = window.opener;
let _nlMediaInfoVideoId = '';
let _nlMediaInfoVideoTitle = '';

if (typeof _openerUnknown === 'object' && _openerUnknown !== null) {
  const openerRecord = _openerUnknown as Record<string, unknown>;
  const nicoUnknown = openerRecord['NicoCache_nl'];
  if (typeof nicoUnknown === 'object' && nicoUnknown !== null) {
    const nicoRecord = nicoUnknown as Record<string, unknown>;
    const watchUnknown = nicoRecord['watch'];
    if (typeof watchUnknown === 'object' && watchUnknown !== null) {
      const watchRecord = watchUnknown as Record<string, unknown>;
      const apiDataUnknown = watchRecord['apiData'];
      if (typeof apiDataUnknown === 'object' && apiDataUnknown !== null) {
        const apiDataRecord = apiDataUnknown as Record<string, unknown>;
        const videoUnknown = apiDataRecord['video'];
        if (typeof videoUnknown === 'object' && videoUnknown !== null) {
          const videoRecord = videoUnknown as Record<string, unknown>;
          const idUnknown = videoRecord['id'];
          const titleUnknown = videoRecord['title'];
          if (typeof idUnknown === 'string') _nlMediaInfoVideoId = idUnknown;
          if (typeof titleUnknown === 'string') _nlMediaInfoVideoTitle = titleUnknown;
        }
      }
    }
  }
}

export const constants: Constants = {
  nlMediaInfobaseurl: "https://www.nicovideo.jp/cache/mediainfo?",
  nlMediaInfoVideoId: _nlMediaInfoVideoId,
  nlMediaInfoVideoTitle: _nlMediaInfoVideoTitle,
  DEBUG_NLMEDIAINFO: true,
  MasterFile: "master.m3u8",
  VideoInitFile: "init01.cmfv",
  AudioInitFile: "init01.cmfa",
  VideoInitFile2: "init1.cmfv",
  AudioInitFile2: "init1.cmfa",
  VideoInitFile3: "001.cmfv",
  AudioInitFile3: "001.cmfa",
};