true              &&(function polyfill() {
	const relList = document.createElement("link").relList;
	if (relList && relList.supports && relList.supports("modulepreload")) return;
	for (const link of document.querySelectorAll("link[rel=\"modulepreload\"]")) processPreload(link);
	new MutationObserver((mutations) => {
		for (const mutation of mutations) {
			if (mutation.type !== "childList") continue;
			for (const node of mutation.addedNodes) if (node.tagName === "LINK" && node.rel === "modulepreload") processPreload(node);
		}
	}).observe(document, {
		childList: true,
		subtree: true
	});
	function getFetchOpts(link) {
		const fetchOpts = {};
		if (link.integrity) fetchOpts.integrity = link.integrity;
		if (link.referrerPolicy) fetchOpts.referrerPolicy = link.referrerPolicy;
		if (link.crossOrigin === "use-credentials") fetchOpts.credentials = "include";
		else if (link.crossOrigin === "anonymous") fetchOpts.credentials = "omit";
		else fetchOpts.credentials = "same-origin";
		return fetchOpts;
	}
	function processPreload(link) {
		if (link.ep) return;
		link.ep = true;
		const fetchOpts = getFetchOpts(link);
		fetch(link.href, fetchOpts);
	}
}());

const formatters = {
  /**
   * ファイルサイズを解析して数値に変換するのじゃ
   * @param sizeStr - 解析するファイルサイズの文字列
   * @returns KiBに変換されたサイズ
   */
  parseFileSize(sizeStr) {
    if (!sizeStr) return 0;
    const bytes = parseInt(sizeStr, 10);
    if (isNaN(bytes)) return 0;
    const result = bytes / 1024;
    return result;
  },
  /**
   * ファイルサイズを読みやすい形式に整形するのじゃ
   * @param bytes - バイト数
   * @returns 整形されたファイルサイズ
   */
  formatFileSize(bytes) {
    if (bytes >= 1024 * 1024) {
      return `${(bytes / 1024 / 1024).toFixed(2)} MiB`;
    } else if (bytes >= 1024) {
      return `${(bytes / 1024).toFixed(2)} KiB`;
    } else {
      return `${bytes.toFixed(2)} Bytes`;
    }
  }
};

const MEDIA_TYPES = {
  AUDIO: "audio",
  VIDEO: "video",
  OTHER: "other"
};
class StatisticsManager {
  /**
   * メディアファイルの統計情報を生成するのじゃ
   * @param mediaFiles - メディアファイルの情報
   * @returns フォーマット別の統計情報
   */
  static generateFormatStats(mediaFiles) {
    return Object.values(MEDIA_TYPES).reduce((acc, type) => {
      acc[type] = this.#calculateFormatStats(this.#filterFilesByType(mediaFiles, type));
      return acc;
    }, {});
  }
  /**
   * ファイルをフィルタリングするのじゃ
   */
  static #getMediaRef(file) {
    const media = file.media;
    if (typeof media === "object" && media !== null) {
      const ref = media["@ref"];
      return typeof ref === "string" ? ref : "";
    }
    return "";
  }
  static #filterFilesByType(files, type) {
    return files.filter((file) => {
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
  static #calculateFormatStats(files) {
    const stats = {};
    files.forEach((file) => {
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
    Object.values(stats).forEach((stat) => {
      stat.averageSize = stat.totalSize / stat.count;
    });
    return stats;
  }
  /**
   * ファイルのフォーマットを取得するのじゃ
   */
  static #getFirstTrack(file) {
    const media = file.media;
    if (typeof media === "object" && media !== null) {
      const mediaObj = media;
      if (Array.isArray(mediaObj.track) && mediaObj.track.length > 0) {
        const trackArr = mediaObj.track;
        const first = trackArr[0];
        if (typeof first === "object" && first !== null) return first;
      }
    }
    return void 0;
  }
  static #getFileFormat(file) {
    const first = this.#getFirstTrack(file);
    const fmt = first ? first["Format"] : void 0;
    return typeof fmt === "string" && fmt.length > 0 ? fmt : "Unknown";
  }
  /**
   * ファイルサイズを取得するのじゃ
   */
  static #getFileSize(file) {
    const first = this.#getFirstTrack(file);
    const size = first ? first["FileSize"] : void 0;
    const s = typeof size === "string" && size.length > 0 ? size : "0";
    const parsed = parseInt(s, 10);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  /**
   * 統計情報をHTML形式で出力するのじゃ
   */
  static generateStatsHTML(stats) {
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
  static calculateTotalStats(stats) {
    const totals = {
      totalFiles: 0,
      totalSize: 0,
      audioFiles: 0,
      audioSize: 0,
      videoFiles: 0,
      videoSize: 0
    };
    if (stats.audio) {
      Object.values(stats.audio).forEach((format) => {
        totals.audioFiles += format.count;
        totals.audioSize += format.totalSize;
      });
    }
    if (stats.video) {
      Object.values(stats.video).forEach((format) => {
        totals.videoFiles += format.count;
        totals.videoSize += format.totalSize;
      });
    }
    totals.totalFiles = totals.audioFiles + totals.videoFiles;
    totals.totalSize = totals.audioSize + totals.videoSize;
    return totals;
  }
}

const _openerUnknown = window.opener;
let _nlMediaInfoVideoId = "";
let _nlMediaInfoVideoTitle = "";
if (typeof _openerUnknown === "object" && _openerUnknown !== null) {
  const openerRecord = _openerUnknown;
  const nicoUnknown = openerRecord["NicoCache_nl"];
  if (typeof nicoUnknown === "object" && nicoUnknown !== null) {
    const nicoRecord = nicoUnknown;
    const watchUnknown = nicoRecord["watch"];
    if (typeof watchUnknown === "object" && watchUnknown !== null) {
      const watchRecord = watchUnknown;
      const apiDataUnknown = watchRecord["apiData"];
      if (typeof apiDataUnknown === "object" && apiDataUnknown !== null) {
        const apiDataRecord = apiDataUnknown;
        const videoUnknown = apiDataRecord["video"];
        if (typeof videoUnknown === "object" && videoUnknown !== null) {
          const videoRecord = videoUnknown;
          const idUnknown = videoRecord["id"];
          const titleUnknown = videoRecord["title"];
          if (typeof idUnknown === "string") _nlMediaInfoVideoId = idUnknown;
          if (typeof titleUnknown === "string") _nlMediaInfoVideoTitle = titleUnknown;
        }
      }
    }
  }
}
const constants = {
  nlMediaInfobaseurl: "https://www.nicovideo.jp/cache/mediainfo?",
  nlMediaInfoVideoId: _nlMediaInfoVideoId,
  nlMediaInfoVideoTitle: _nlMediaInfoVideoTitle,
  MasterFile: "master.m3u8",
  VideoInitFile: "init01.cmfv",
  AudioInitFile: "init01.cmfa",
  VideoInitFile2: "init1.cmfv",
  AudioInitFile2: "init1.cmfa",
  VideoInitFile3: "001.cmfv",
  AudioInitFile3: "001.cmfa"
};

class NicoVideoMediaInfo {
  constructor(jsonData) {
    this.mediaInfo = jsonData;
  }
  // 安全アクセサ群
  #isRecord(value) {
    return typeof value === "object" && value !== null;
  }
  #safeGetMediaRef(item) {
    const media = item.media;
    if (this.#isRecord(media)) {
      const ref = media["@ref"];
      return typeof ref === "string" ? ref : "";
    }
    return "";
  }
  #safeGetTracks(item) {
    const media = item.media;
    if (this.#isRecord(media)) {
      const track = media["track"];
      return Array.isArray(track) ? track : void 0;
    }
    return void 0;
  }
  #safeFindTrackByType(item, type) {
    const tracks = this.#safeGetTracks(item);
    const found = tracks?.find((t) => {
      if (!this.#isRecord(t)) return false;
      const atType = t["@type"];
      return typeof atType === "string" && atType === type;
    });
    return this.#isRecord(found) ? found : void 0;
  }
  #safeGetFirstTrack(item) {
    const tracks = this.#safeGetTracks(item);
    const first = tracks && tracks.length > 0 ? tracks[0] : void 0;
    return this.#isRecord(first) ? first : void 0;
  }
  /**
   * 音声ファイルの情報を取得するのじゃ
   */
  getAudioFiles() {
    const audioFiles = this.mediaInfo.filter((info) => {
      const ref = this.#safeGetMediaRef(info);
      return ref.includes(constants.AudioInitFile) || ref.includes(constants.AudioInitFile2) || ref.includes(constants.AudioInitFile3);
    });
    console.log("音声ファイルの情報を取得するのじゃ:", audioFiles);
    return audioFiles;
  }
  /**
   * 映像ファイルの情報を取得するのじゃ
   */
  getVideoFiles() {
    const videoFiles = this.mediaInfo.filter((info) => {
      const ref = this.#safeGetMediaRef(info);
      return ref.includes(constants.VideoInitFile) || ref.includes(constants.VideoInitFile2) || ref.includes(constants.VideoInitFile3);
    });
    console.log("映像ファイルの情報を取得するのじゃ:", videoFiles);
    return videoFiles;
  }
  /**
   * 全体のファイルサイズを取得するのじゃ
   */
  getTotalFileSize() {
    const totalFileSize = this.mediaInfo.reduce((total, info) => {
      const first = this.#safeGetFirstTrack(info);
      const raw = first ? first["FileSize"] : void 0;
      const s = typeof raw === "string" && raw.length > 0 ? raw : "0";
      const fileSize = parseInt(s, 10);
      return total + (Number.isNaN(fileSize) ? 0 : fileSize);
    }, 0);
    console.log("全体のファイルサイズを取得するのじゃ:", totalFileSize);
    return totalFileSize;
  }
  /**
   * ファイルの作成日時情報を取得するのじゃ
   */
  getCreationDates() {
    const creationDates = this.mediaInfo.map((info) => {
      const ref = this.#safeGetMediaRef(info);
      const first = this.#safeGetFirstTrack(info);
      const createdRaw = first ? first["File_Created_Date"] : void 0;
      return {
        file: ref,
        created: typeof createdRaw === "string" ? createdRaw : void 0
      };
    });
    console.log("ファイルの作成日時情報を取得するのじゃ:", creationDates);
    return creationDates;
  }
  /**
   * メディア情報の詳細を取得するのじゃ
   */
  getMediaDetails() {
    const generalInfo = this.#extractGeneralInfo();
    const videoInfo = this.#extractVideoInfo();
    const audioInfo = this.#extractAudioInfo();
    console.log("メディア情報の詳細を取得するのじゃ:", {
        general: generalInfo,
        video: videoInfo,
        audio: audioInfo
      });
    return {
      general: generalInfo,
      video: videoInfo,
      audio: audioInfo
    };
  }
  /**
   * 統計情報を取得するのじゃ
   */
  getFormatStats() {
    const formatStats = StatisticsManager.generateFormatStats(this.mediaInfo);
    console.log("統計情報を取得するのじゃ:", formatStats);
    return formatStats;
  }
  /**
   * 一般情報を抽出するのじゃ
   */
  #extractGeneralInfo() {
    const master = this.mediaInfo.find((item) => this.#safeGetMediaRef(item).includes(constants.MasterFile));
    const generalTrack = master ? this.#safeFindTrackByType(master, "General") : void 0;
    const generalInfo = generalTrack ?? (master ? this.#safeGetFirstTrack(master) : void 0);
    console.log("一般情報を抽出するのじゃ:", generalInfo);
    return generalInfo;
  }
  /**
   * 映像情報を抽出するのじゃ
   */
  #extractVideoInfo() {
    const master = this.mediaInfo.find((item) => this.#safeGetMediaRef(item).includes(constants.MasterFile));
    const videoTrack = master ? this.#safeFindTrackByType(master, "Video") : void 0;
    const initVideo = this.mediaInfo.find((item) => {
      const ref = this.#safeGetMediaRef(item);
      return ref.includes(constants.VideoInitFile) || ref.includes(constants.VideoInitFile2) || ref.includes(constants.VideoInitFile3);
    });
    const initVideoTrack = initVideo ? this.#safeFindTrackByType(initVideo, "Video") ?? this.#safeGetFirstTrack(initVideo) : void 0;
    const videoInfo = videoTrack ?? initVideoTrack;
    console.log("映像情報を抽出するのじゃ:", videoInfo);
    return videoInfo;
  }
  /**
   * 音声情報を抽出するのじゃ
   */
  #extractAudioInfo() {
    const master = this.mediaInfo.find((item) => this.#safeGetMediaRef(item).includes(constants.MasterFile));
    const audioTrack = master ? this.#safeFindTrackByType(master, "Audio") : void 0;
    const initAudio = this.mediaInfo.find((item) => {
      const ref = this.#safeGetMediaRef(item);
      return ref.includes(constants.AudioInitFile) || ref.includes(constants.AudioInitFile2) || ref.includes(constants.AudioInitFile3);
    });
    const initAudioTrack = initAudio ? this.#safeFindTrackByType(initAudio, "Audio") ?? this.#safeGetFirstTrack(initAudio) : void 0;
    const audioInfo = audioTrack ?? initAudioTrack;
    console.log("音声情報を抽出するのじゃ:", audioInfo);
    return audioInfo;
  }
}

const validators = {
  /**
   * メディアファイルの基本情報をバリデーションするのじゃ
   * @param mediaInfo - メディア情報オブジェクト
   * @returns バリデーション結果
   */
  isValidMediaInfo(mediaInfo) {
    if (!Array.isArray(mediaInfo)) {
      console.error("メディア情報が配列ではないのじゃ");
      return false;
    }
    if (mediaInfo.length === 0) {
      console.error("メディア情報が空なのじゃ");
      return false;
    }
    return true;
  },
  /**
   * ファイルサイズの値をバリデーションするのじゃ
   * @param size - ファイルサイズ
   * @returns バリデーション結果
   */
  isValidFileSize(size) {
    if (size === void 0 || size === null) {
      return false;
    }
    const parsedSize = parseInt(String(size), 10);
    return !isNaN(parsedSize) && parsedSize >= 0;
  },
  /**
   * トラック情報をバリデーションするのじゃ
   * @param track - トラック情報
   * @returns バリデーション結果
   */
  isValidTrack(track) {
    return !!track && typeof track === "object" && "@type" in track;
  },
  /**
   * ビットレートの値をバリデーションするのじゃ
   * @param bitrate - ビットレート
   * @returns バリデーション結果
   */
  isValidBitrate(bitrate) {
    if (bitrate === void 0 || bitrate === null) {
      return false;
    }
    const parsedBitrate = parseInt(String(bitrate), 10);
    return !isNaN(parsedBitrate) && parsedBitrate > 0;
  },
  /**
   * 解像度の値をバリデーションするのじゃ
   * @param width - 幅
   * @param height - 高さ
   * @returns バリデーション結果
   */
  isValidResolution(width, height) {
    const parsedWidth = parseInt(String(width), 10);
    const parsedHeight = parseInt(String(height), 10);
    return !isNaN(parsedWidth) && !isNaN(parsedHeight) && parsedWidth > 0 && parsedHeight > 0;
  },
  /**
   * メディアファイルの参照パスをバリデーションするのじゃ
   * @param ref - ファイルの参照パス
   * @returns バリデーション結果
   */
  isValidMediaRef(ref) {
    if (!ref || typeof ref !== "string") {
      return false;
    }
    const validExtensions = [".cmfa", ".cmfv", ".m3u8", ".mp4", ".m4s"];
    return validExtensions.some((ext) => ref.includes(ext));
  },
  /**
   * エラーメッセージを生成するのじゃ
   * @param message - エラーメッセージ
   * @param value - 問題のある値
   * @returns フォーマットされたエラーメッセージ
   */
  createErrorMessage(message, value) {
    return `バリデーションエラー: ${message} (値: ${JSON.stringify(value)})`;
  }
};

class MediaInfoParser {
  static parse(jsonContent) {
    if (!validators.isValidMediaInfo(jsonContent)) {
      throw new Error("Invalid media info format");
    }
    const parsed = this.#parseBasicInfo(jsonContent);
    const stats = new NicoVideoMediaInfo(jsonContent).getFormatStats();
    return { result: parsed, formatStats: stats };
  }
  static #parseBasicInfo(jsonContent) {
    const getMediaRef = (item) => {
      const media = item.media;
      if (typeof media === "object" && media !== null) {
        const ref = media["@ref"];
        return typeof ref === "string" ? ref : "";
      }
      return "";
    };
    const getTracks = (item) => {
      const media = item.media;
      if (typeof media === "object" && media !== null) {
        const track = media["track"];
        return Array.isArray(track) ? track : void 0;
      }
      return void 0;
    };
    const toStr = (value, fallback = "") => {
      if (typeof value === "string") return value;
      if (value === null || value === void 0) return fallback;
      if (typeof value === "number" || typeof value === "boolean" || typeof value === "bigint") {
        return String(value);
      }
      if (typeof value === "object") {
        try {
          return JSON.stringify(value);
        } catch {
          return fallback;
        }
      }
      return fallback;
    };
    const collectedVideo = [];
    const collectedAudio = [];
    const initVideoFile = jsonContent.find(
      (item) => getMediaRef(item).includes(constants.VideoInitFile) || getMediaRef(item).includes(constants.VideoInitFile2) || getMediaRef(item).includes(constants.VideoInitFile3)
    );
    const initAudioFile = jsonContent.find(
      (item) => getMediaRef(item).includes(constants.AudioInitFile) || getMediaRef(item).includes(constants.AudioInitFile2) || getMediaRef(item).includes(constants.AudioInitFile3)
    );
    if (initVideoFile) {
      const tracks = getTracks(initVideoFile);
      tracks?.forEach((track) => {
        if (validators.isValidTrack(track) && track["@type"] === "Video") {
          const tr = track;
          const videoInfo = {
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
          {
            console.log("Video track raw data:", track);
            console.log("Processed video data:", videoInfo);
          }
        }
      });
    }
    if (initAudioFile) {
      const tracks = getTracks(initAudioFile);
      tracks?.forEach((track) => {
        if (validators.isValidTrack(track) && track["@type"] === "Audio") {
          const tr = track;
          const audioInfo = {
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
    const masterFile = jsonContent.find(
      (item) => getMediaRef(item).includes("master.m3u8")
    );
    const generalTracks = masterFile ? getTracks(masterFile) : void 0;
    const generalTrack = generalTracks ? generalTracks.find((t) => typeof t === "object" && t["@type"] === "General") : void 0;
    const durationValue = (() => {
      const videoTracks = initVideoFile ? getTracks(initVideoFile) : void 0;
      const v = videoTracks ? videoTracks.find((t) => typeof t === "object" && t["@type"] === "Video") : void 0;
      return toStr(v ? v["Duration"] : void 0, "N/A");
    })();
    const safeGeneral = {
      "Format": toStr(generalTrack?.Format, "N/A"),
      "File size": toStr(generalTrack?.FileSize, "N/A"),
      "Duration": durationValue,
      "Complete name": masterFile ? getMediaRef(masterFile) : "N/A",
      "ID": constants.nlMediaInfoVideoId
    };
    let avgAudio = 192e3;
    let avgVideo = 15e5;
    if (initAudioFile) {
      const tracks = getTracks(initAudioFile);
      const audioTrack = tracks ? tracks.find((t) => typeof t === "object" && t["@type"] === "Audio") : void 0;
      const ab = audioTrack ? audioTrack["BitRate_Maximum"] : void 0;
      avgAudio = audioTrack ? parseInt(toStr(ab, "192000")) : 192e3;
    }
    if (initVideoFile) {
      const tracks = getTracks(initVideoFile);
      const videoTrack = tracks ? tracks.find((t) => typeof t === "object" && t["@type"] === "Video") : void 0;
      const vb = videoTrack ? videoTrack["BitRate_Maximum"] : void 0;
      avgVideo = videoTrack ? parseInt(toStr(vb, "1500000")) : 15e5;
    }
    const safeResult = {
      general: safeGeneral,
      video: collectedVideo,
      audio: collectedAudio,
      averageBitrates: { audio: avgAudio, video: avgVideo, overall: avgAudio + avgVideo }
    };
    {
      console.log("init01.cmfv:", initVideoFile);
      console.log("init01.cmfa:", initAudioFile);
      console.log("パース結果:", safeResult);
    }
    return safeResult;
  }
}

class UIUpdater {
  // 型ガード: ParsedMediaInfo の形を持つかをチェック
  static isParsedMediaInfo(value) {
    if (!value || typeof value !== "object") return false;
    const v = value;
    return Array.isArray(v.video) && Array.isArray(v.audio) && typeof v.general === "object" && v.general !== null && typeof v.averageBitrates === "object" && v.averageBitrates !== null && typeof v.averageBitrates.overall === "number";
  }
  // 型ガード: AllStats の形をチェック
  static isAllStats(value) {
    if (!value || typeof value !== "object") return false;
    try {
      const v = value;
      for (const cat of Object.keys(v)) {
        const catVal = v[cat];
        if (!catVal || typeof catVal !== "object") return false;
        for (const fmt of Object.keys(catVal)) {
          const stats = catVal[fmt];
          if (!stats || typeof stats !== "object") return false;
          if (typeof stats.count !== "number" || typeof stats.totalSize !== "number") return false;
        }
      }
      return true;
    } catch {
      return false;
    }
  }
  // 安全に任意の値を文字列化するユーティリティ
  static toDisplayString(value, fallback = "N/A") {
    if (value === null || value === void 0) return fallback;
    if (typeof value === "string") return value;
    if (typeof value === "number" || typeof value === "boolean" || typeof value === "bigint") return String(value);
    try {
      return JSON.stringify(value);
    } catch {
      return fallback;
    }
  }
  static updateAll(mediaInfo) {
    if (!mediaInfo || typeof mediaInfo !== "object" || mediaInfo === null) {
      console.warn("UIUpdater.updateAll: invalid mediaInfo");
      return;
    }
    const asObj = mediaInfo;
    if (!("result" in asObj)) {
      console.warn("UIUpdater.updateAll: missing result");
      return;
    }
    const resultCandidate = asObj.result;
    if (!this.isParsedMediaInfo(resultCandidate)) {
      console.warn("UIUpdater.updateAll: mediaInfo.result is invalid");
      return;
    }
    const parsed = resultCandidate;
    const statsCandidate = asObj.formatStats;
    const stats = this.isAllStats(statsCandidate) ? statsCandidate : {};
    this.updateBasicInfo(parsed);
    this.updateDetailedInfo(parsed);
    this.updateStatistics(stats);
  }
  static updateBasicInfo(mediaInfo) {
    const resultDiv = document.getElementById("results");
    if (resultDiv) {
      resultDiv.style.display = "block";
    }
    const loadingDiv = document.getElementById("loading");
    if (loadingDiv) {
      loadingDiv.style.display = "none";
    }
    const videoInfo = Array.isArray(mediaInfo.video) && mediaInfo.video.length > 0 ? mediaInfo.video[0] : {};
    const audioInfo = Array.isArray(mediaInfo.audio) && mediaInfo.audio.length > 0 ? mediaInfo.audio[0] : {};
    const generalInfo = mediaInfo.general ?? {};
    const averageBitrates = mediaInfo.averageBitrates ?? { overall: 0, video: 0, audio: 0 };
    const resolutionElement = document.querySelector("#resolution .resolution-value");
    if (resolutionElement) {
      resolutionElement.textContent = `${this.toDisplayString(videoInfo["Width"])} x ${this.toDisplayString(videoInfo["Height"])} pixels`;
    }
    const overallBitrateElement = document.querySelector("#bitrate .overall-bitrate");
    if (overallBitrateElement) {
      overallBitrateElement.textContent = `全体平均: ${Number.isFinite(averageBitrates.overall) ? (averageBitrates.overall / 1024 / 1024).toFixed(2) : "0.00"} Mbps`;
    }
    const videoBitrateElement = document.querySelector("#bitrate .video-bitrate");
    if (videoBitrateElement) {
      videoBitrateElement.textContent = `映像平均: ${Number.isFinite(averageBitrates.video) ? (averageBitrates.video / 1024 / 1024).toFixed(2) : "0.00"} Mbps`;
    }
    const audioBitrateElement = document.querySelector("#bitrate .audio-bitrate");
    if (audioBitrateElement) {
      audioBitrateElement.textContent = `音声平均: ${Number.isFinite(averageBitrates.audio) ? (averageBitrates.audio / 1024).toFixed(2) : "0.00"} Kbps`;
    }
    const videoFormatElement = document.querySelector("#video-codec .format");
    if (videoFormatElement) {
      videoFormatElement.textContent = `${this.toDisplayString(videoInfo["Format"])} (${this.toDisplayString(videoInfo["Format profile"])})`;
    }
    const cabacElement = document.querySelector("#video-codec .cabac");
    if (cabacElement) {
      cabacElement.textContent = `CABAC設定: ${this.toDisplayString(videoInfo["Format settings"])}`;
    }
    const audioFormatElement = document.querySelector("#audio-codec .format");
    if (audioFormatElement) {
      audioFormatElement.textContent = `形式: ${this.toDisplayString(audioInfo["Format"])}`;
    }
    const channelsElement = document.querySelector("#audio-codec .channels");
    if (channelsElement) {
      channelsElement.textContent = `チャンネル: ${this.toDisplayString(audioInfo["Channel(s)"])}`;
    }
    const samplingRateElement = document.querySelector("#audio-codec .sampling-rate");
    if (samplingRateElement) {
      samplingRateElement.textContent = `サンプリングレート: ${this.toDisplayString(audioInfo["Sampling rate"])}`;
    }
    const frameModeElement = document.querySelector("#framerate .mode");
    if (frameModeElement) {
      frameModeElement.textContent = `モード: ${this.toDisplayString(videoInfo["Frame rate mode"])}`;
    }
    const frameRateElement = document.querySelector("#framerate .rate");
    if (frameRateElement) {
      frameRateElement.textContent = `レート: ${this.toDisplayString(videoInfo["Frame rate"])}`;
    }
    const containerFormatElement = document.querySelector("#container .format");
    if (containerFormatElement) {
      containerFormatElement.textContent = `${this.toDisplayString(generalInfo["Format"])}`;
    }
    const colorSpaceElement = document.querySelector("#color .space");
    if (colorSpaceElement) {
      colorSpaceElement.textContent = `色空間: ${this.toDisplayString(videoInfo["Color space"])}`;
    }
    const colorRangeElement = document.querySelector("#color .range");
    if (colorRangeElement) {
      colorRangeElement.textContent = `色域: ${this.toDisplayString(videoInfo["Color range"])}`;
    }
    const colorPrimariesElement = document.querySelector("#color .primaries");
    if (colorPrimariesElement) {
      colorPrimariesElement.textContent = `色基準: ${this.toDisplayString(videoInfo["Color primaries"])}`;
    }
    const aspectRatioElement = document.querySelector("#aspect .ratio");
    if (aspectRatioElement) {
      aspectRatioElement.textContent = `${this.toDisplayString(videoInfo["Display aspect ratio"])}`;
    }
    const fileSizeElement = document.querySelector("#filesize .size");
    if (fileSizeElement) {
      const rawFileSize = generalInfo["File size"];
      const parsedSize = parseInt(this.toDisplayString(rawFileSize, "0"), 10) || 0;
      fileSizeElement.textContent = `${formatters.formatFileSize(parsedSize)}`;
    }
    const durationElement = document.querySelector("#filesize .duration");
    if (durationElement) {
      durationElement.textContent = `再生時間: ${this.toDisplayString(generalInfo["Duration"])}`;
    }
    const pathElement = document.querySelector("#metadata .path");
    if (pathElement) {
      pathElement.textContent = `完全パス: ${this.toDisplayString(generalInfo["Complete name"])}`;
    }
    const idElement = document.querySelector("#metadata .id");
    if (idElement) {
      idElement.textContent = `ID: ${this.toDisplayString(generalInfo["ID"])}`;
    }
    this.updateDetailedInfo(mediaInfo);
  }
  static updateDetailedInfo(mediaInfo) {
    const videoDetails = document.getElementById("video-stream-details");
    const audioDetails = document.getElementById("audio-stream-details");
    if (videoDetails && Array.isArray(mediaInfo.video) && mediaInfo.video.length > 0) {
      const entries = Object.entries(mediaInfo.video[0]);
      videoDetails.innerHTML = entries.map(([key, value]) => `<div class="info-row"><span class="label">${key}:</span><span class="value">${this.toDisplayString(value)}</span></div>`).join("");
    }
    if (audioDetails && Array.isArray(mediaInfo.audio) && mediaInfo.audio.length > 0) {
      const entries = Object.entries(mediaInfo.audio[0]);
      audioDetails.innerHTML = entries.map(([key, value]) => `<div class="info-row"><span class="label">${key}:</span><span class="value">${this.toDisplayString(value)}</span></div>`).join("");
    }
  }
  static updateStatistics(formatStats) {
    const statsDiv = document.getElementById("format-statistics");
    if (!statsDiv) return;
    let html = "";
    Object.keys(formatStats || {}).forEach((category) => {
      html += `<div class="category"><h4>${category.toUpperCase()}</h4>`;
      const categoryObj = formatStats[category] ?? {};
      Object.keys(categoryObj).forEach((format) => {
        const stats = categoryObj[format];
        const avg = stats && stats.count > 0 ? Math.floor(stats.totalSize / stats.count) : 0;
        html += `<div class="format">
          <h5>${this.toDisplayString(format)}</h5>
          <p>ファイル数: ${stats ? stats.count : 0}</p>
          <p>総サイズ: ${formatters.formatFileSize(stats ? stats.totalSize : 0)}</p>
          <p>平均サイズ: ${formatters.formatFileSize(avg)}</p>
        </div>`;
      });
      html += "</div>";
    });
    statsDiv.innerHTML = html;
  }
  /**
   * タイトルを更新するのじゃ
   * @param videoTitle - 動画のタイトル
   * @param videoId - 動画のID
   */
  static updateTitle(videoTitle, videoId) {
    const titleElement = document.getElementsByTagName("title")[0];
    if (titleElement) {
      titleElement.innerHTML = `nlMediaInfo: ${videoTitle} (${videoId})`;
    } else {
      console.warn("titleタグが見つからないのじゃ");
    }
  }
}

const uiStyles = `
    #nlMediaInfo {
        display: block;
        padding: 20px;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      }
      
      .media-info-results {
        max-width: 1200px;
        margin: 0 auto;
      }
      
      .category {
        margin-bottom: 30px;
        border: 1px solid #ddd;
        border-radius: 5px;
        padding: 15px;
      }
      
      .category h4 {
        margin-top: 0;
        color: #333;
        border-bottom: 2px solid #007bff;
        padding-bottom: 5px;
      }
      
      .format, .codec, .bitrate {
        background: #f8f9fa;
        padding: 10px;
        margin: 10px 0;
        border-radius: 4px;
      }
      
      .format h5, .codec h5, .bitrate h5 {
        margin: 0 0 10px 0;
        color: #495057;
      }
      
      .format p, .codec p, .bitrate p {
        margin: 5px 0;
        color: #666;
      }
      
      #loading {
        text-align: center;
        padding: 20px;
        color: #666;
      }
      
      #error {
        color: crimson;
        padding: 10px;
        margin: 10px 0;
        border: 1px solid crimson;
        border-radius: 4px;
        background-color: #fff5f5;
      }
      
      .media-summary {
        background: #f8f9fa;
        padding: 20px;
        border-radius: 8px;
        margin-bottom: 30px;
      }
      
      .summary-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        gap: 20px;
        margin-top: 20px;
      }
      
      .summary-item {
        background: white;
        padding: 20px;
        border-radius: 8px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        min-height: 120px;
      }
      
      .summary-item h3 {
        margin: 0 0 15px 0;
        color: #333;
        font-size: 1.1em;
        border-bottom: 2px solid #007bff;
        padding-bottom: 5px;
      }
      
      .summary-item p {
        margin: 8px 0;
        color: #666;
        line-height: 1.4;
      }
      
      .detailed-info {
        margin-top: 30px;
      }
      
      .video-details, .audio-details {
        background: #fff;
        padding: 20px;
        border-radius: 8px;
        margin-bottom: 20px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.05);
      }
      
      .info-row {
        display: grid;
        grid-template-columns: 200px 1fr;
        padding: 8px 0;
        border-bottom: 1px solid #eee;
      }
      
      .info-row .label {
        font-weight: bold;
        color: #555;
      }
      
      .info-row .value {
        color: #666;
      }
      
      /* ダークモード対応 */
      @media (prefers-color-scheme: dark) {
        body {
          background-color: #1a1a1a;
          color: #fff;
        }
      
        .category {
          border-color: #333;
        }
      
        .format, .codec, .bitrate {
          background: inherit;
        }
      
        .format h5, .codec h5, .bitrate h5 {
          color: #e1e1e1;
        }
      
        .format p, .codec p, .bitrate p {
          color: #bbb;
        }
      
        .media-summary {
          background: #2d2d2d;
        }
        
        .summary-item {
          background: #333;
        }
        
        .summary-item h3 {
          color: #e1e1e1;
        }
        
        .summary-item p {
          color: #bbb;
        }
        
        .video-details, .audio-details {
          background: #2d2d2d;
        }
        
        .info-row {
          border-bottom-color: #444;
        }
        
        .info-row .label {
          color: #e1e1e1;
        }
        
        .info-row .value {
          color: #bbb;
        }
      }  
`;

const Favicon = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M4 6.47 5.76 10H20v8H4V6.47M22 4h-4l2 4h-3l-2-4h-2l2 4h-3l-2-4H8l2 4H7L5 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4z"/></svg>`;

const style = document.createElement("style");
style.textContent = uiStyles;
document.head.appendChild(style);
const favicon = document.createElement("link");
favicon.rel = "Shortcut Icon";
favicon.href = "data:image/svg+xml," + encodeURIComponent(Favicon);
document.head.appendChild(favicon);
window.addEventListener("load", () => {
  initializeApp();
});
function initializeApp() {
  UIUpdater.updateTitle(constants.nlMediaInfoVideoTitle, constants.nlMediaInfoVideoId);
  getMediaInfo(`${constants.nlMediaInfobaseurl}${constants.nlMediaInfoVideoId}`).then((data) => {
    if (!validators.isValidMediaInfo(data)) {
      throw new Error("メディア情報の形式が不正なのじゃ");
    }
    const parsedData = MediaInfoParser.parse(data);
    console.log("パース後のデータ:", parsedData);
    return parsedData;
  }).then((parsedData) => {
    if (!parsedData || !parsedData.result) {
      throw new Error("パースされたデータが不正なのじゃ");
    }
    UIUpdater.updateAll(parsedData);
  }).catch((error) => {
    console.error("メディア情報の取得に失敗したのじゃ:", error);
    const loadingElement = document.getElementById("loading");
    const errorElement = document.getElementById("error");
    if (loadingElement) loadingElement.style.display = "none";
    if (errorElement) {
      errorElement.style.display = "block";
      const message = error && typeof error.message === "string" ? error.message : String(error);
      errorElement.textContent = `エラー: ${message}`;
    }
  });
}
async function getMediaInfo(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTPエラー: ${response.status} ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error("メディア情報の取得中にエラーが発生したのじゃ:", error);
    throw error;
  }
}
//# sourceMappingURL=nl-media-info.es.js.map
