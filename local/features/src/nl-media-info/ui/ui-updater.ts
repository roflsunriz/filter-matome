import { formatters } from '../utils/formatters.js';
// 内部で使用する安全なローカル型
type SafeParsedMediaInfo = {
  general: Record<string, unknown>;
  video: Record<string, unknown>[];
  audio: Record<string, unknown>[];
  averageBitrates: { overall: number; video: number; audio: number };
};

type SafeAllStats = Record<string, Record<string, { count: number; totalSize: number }>>;

export class UIUpdater {
  // 型ガード: ParsedMediaInfo の形を持つかをチェック
  private static isParsedMediaInfo(value: unknown): value is SafeParsedMediaInfo {
    if (!value || typeof value !== 'object') return false;
    const v = value as Record<string, unknown>;
    return (
      Array.isArray(v.video) &&
      Array.isArray(v.audio) &&
      typeof v.general === 'object' && v.general !== null &&
      typeof v.averageBitrates === 'object' && v.averageBitrates !== null &&
      typeof (v.averageBitrates as Record<string, unknown>).overall === 'number'
    );
  }

  // 型ガード: AllStats の形をチェック
  private static isAllStats(value: unknown): value is SafeAllStats {
    if (!value || typeof value !== 'object') return false;
    try {
      const v = value as Record<string, unknown>;
      for (const cat of Object.keys(v)) {
        const catVal = v[cat] as Record<string, unknown> | undefined;
        if (!catVal || typeof catVal !== 'object') return false;
        for (const fmt of Object.keys(catVal)) {
          const stats = catVal[fmt] as Record<string, unknown> | undefined;
          if (!stats || typeof stats !== 'object') return false;
          if (typeof stats.count !== 'number' || typeof stats.totalSize !== 'number') return false;
        }
      }
      return true;
    } catch {
      return false;
    }
  }

  // 安全に任意の値を文字列化するユーティリティ
  private static toDisplayString(value: unknown, fallback = 'N/A'): string {
    if (value === null || value === undefined) return fallback;
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') return String(value);
    try {
      return JSON.stringify(value);
    } catch {
      return fallback;
    }
  }

  static updateAll(mediaInfo: unknown): void {
    if (!mediaInfo || typeof mediaInfo !== 'object' || mediaInfo === null) {
      console.warn('UIUpdater.updateAll: invalid mediaInfo');
      return;
    }

    const asObj = mediaInfo as Record<string, unknown>;
    if (!('result' in asObj)) {
      console.warn('UIUpdater.updateAll: missing result');
      return;
    }

    const resultCandidate = asObj.result;
    if (!this.isParsedMediaInfo(resultCandidate)) {
      console.warn('UIUpdater.updateAll: mediaInfo.result is invalid');
      return;
    }

    const parsed = resultCandidate;
    const statsCandidate = asObj.formatStats;
    const stats = this.isAllStats(statsCandidate) ? statsCandidate : ({} as SafeAllStats);

    this.updateBasicInfo(parsed);
    this.updateDetailedInfo(parsed);
    this.updateStatistics(stats);
  }

  static updateBasicInfo(mediaInfo: SafeParsedMediaInfo): void {
    const resultDiv = document.getElementById("results");
    if (resultDiv) {
      resultDiv.style.display = "block";
    }
    
    const loadingDiv = document.getElementById("loading");
    if (loadingDiv) {
      loadingDiv.style.display = "none";
    }
  
    const videoInfo: Record<string, unknown> = (Array.isArray(mediaInfo.video) && mediaInfo.video.length > 0) ? mediaInfo.video[0] : {};
    const audioInfo: Record<string, unknown> = (Array.isArray(mediaInfo.audio) && mediaInfo.audio.length > 0) ? mediaInfo.audio[0] : {};
    const generalInfo = mediaInfo.general ?? ({} as Record<string, unknown>);
    const averageBitrates = mediaInfo.averageBitrates ?? { overall: 0, video: 0, audio: 0 };
  
    // 解像度
    const resolutionElement = document.querySelector("#resolution .resolution-value");
    if (resolutionElement) {
      resolutionElement.textContent =
        `${this.toDisplayString(videoInfo["Width"])} x ${this.toDisplayString(videoInfo["Height"])} pixels`;
    }
  
    // ビットレート
    const overallBitrateElement = document.querySelector("#bitrate .overall-bitrate");
    if (overallBitrateElement) {
      overallBitrateElement.textContent =
        `全体平均: ${Number.isFinite((averageBitrates as { overall:number }).overall) ? ((averageBitrates as { overall:number }).overall / 1024 / 1024).toFixed(2) : '0.00'} Mbps`;
    }
    
    const videoBitrateElement = document.querySelector("#bitrate .video-bitrate");
    if (videoBitrateElement) {
      videoBitrateElement.textContent =
        `映像平均: ${Number.isFinite((averageBitrates as { video:number }).video) ? ((averageBitrates as { video:number }).video / 1024 / 1024).toFixed(2) : '0.00'} Mbps`;
    }
    
    const audioBitrateElement = document.querySelector("#bitrate .audio-bitrate");
    if (audioBitrateElement) {
      audioBitrateElement.textContent =
        `音声平均: ${Number.isFinite((averageBitrates as { audio:number }).audio) ? ((averageBitrates as { audio:number }).audio / 1024).toFixed(2) : '0.00'} Kbps`;
    }
  
    // 映像コーデック
    const videoFormatElement = document.querySelector("#video-codec .format");
    if (videoFormatElement) {
      videoFormatElement.textContent =
        `${this.toDisplayString(videoInfo["Format"]) } (${ this.toDisplayString(videoInfo["Format profile"]) })`;
    }
    
    const cabacElement = document.querySelector("#video-codec .cabac");
    if (cabacElement) {
      cabacElement.textContent =
        `CABAC設定: ${this.toDisplayString(videoInfo["Format settings"])}`;
    }
  
    // 音声コーデック
    const audioFormatElement = document.querySelector("#audio-codec .format");
    if (audioFormatElement) {
      audioFormatElement.textContent =
        `形式: ${this.toDisplayString(audioInfo["Format"])}`;
    }
    
    const channelsElement = document.querySelector("#audio-codec .channels");
    if (channelsElement) {
      channelsElement.textContent =
        `チャンネル: ${this.toDisplayString(audioInfo["Channel(s)"])}`;
    }
    
    const samplingRateElement = document.querySelector("#audio-codec .sampling-rate");
    if (samplingRateElement) {
      samplingRateElement.textContent =
        `サンプリングレート: ${this.toDisplayString(audioInfo["Sampling rate"])}`;
    }
  
    // フレームレート
    const frameModeElement = document.querySelector("#framerate .mode");
    if (frameModeElement) {
      frameModeElement.textContent =
        `モード: ${this.toDisplayString(videoInfo["Frame rate mode"])}`;
    }
    
    const frameRateElement = document.querySelector("#framerate .rate");
    if (frameRateElement) {
      frameRateElement.textContent =
        `レート: ${this.toDisplayString(videoInfo["Frame rate"])}`;
    }
  
    // コンテナフォーマット
    const containerFormatElement = document.querySelector("#container .format");
    if (containerFormatElement) {
      containerFormatElement.textContent =
        `${this.toDisplayString(generalInfo["Format"])}`;
    }
  
    // カラースペース
    const colorSpaceElement = document.querySelector("#color .space");
    if (colorSpaceElement) {
      colorSpaceElement.textContent =
        `色空間: ${this.toDisplayString(videoInfo["Color space"])}`;
    }
    
    const colorRangeElement = document.querySelector("#color .range");
    if (colorRangeElement) {
      colorRangeElement.textContent =
        `色域: ${this.toDisplayString(videoInfo["Color range"])}`;
    }
    
    const colorPrimariesElement = document.querySelector("#color .primaries");
    if (colorPrimariesElement) {
      colorPrimariesElement.textContent =
        `色基準: ${this.toDisplayString(videoInfo["Color primaries"])}`;
    }
  
    // アスペクト比
    const aspectRatioElement = document.querySelector("#aspect .ratio");
    if (aspectRatioElement) {
      aspectRatioElement.textContent =
        `${this.toDisplayString(videoInfo["Display aspect ratio"])}`;
    }
  
    // ファイルサイズ
    const fileSizeElement = document.querySelector("#filesize .size");
    if (fileSizeElement) {
      // generalInfo の File size は文字列で来る想定なので安全にパースする
      const rawFileSize = generalInfo["File size"];
      const parsedSize = parseInt(this.toDisplayString(rawFileSize, '0'), 10) || 0;
      fileSizeElement.textContent = `${formatters.formatFileSize(parsedSize)}`;
    }
    
    const durationElement = document.querySelector("#filesize .duration");
    if (durationElement) {
      durationElement.textContent =
        `再生時間: ${this.toDisplayString(generalInfo["Duration"])}`;
    }
  
    // メタデータ
    const pathElement = document.querySelector("#metadata .path");
    if (pathElement) {
      pathElement.textContent =
        `完全パス: ${this.toDisplayString(generalInfo["Complete name"])}`;
    }
    
    const idElement = document.querySelector("#metadata .id");
    if (idElement) {
      idElement.textContent =
        `ID: ${this.toDisplayString(generalInfo["ID"])}`;
    }
  
    // 詳細情報の更新
    this.updateDetailedInfo(mediaInfo);
    // 統計情報の更新は呼び出し元で安全性を担保する想定
  }

  static updateDetailedInfo(mediaInfo: SafeParsedMediaInfo): void {
    const videoDetails = document.getElementById("video-stream-details");
    const audioDetails = document.getElementById("audio-stream-details");

    // ビデオストリーム情報の更新
    if (videoDetails && Array.isArray(mediaInfo.video) && mediaInfo.video.length > 0) {
      const entries = Object.entries(mediaInfo.video[0]);
      videoDetails.innerHTML = entries
        .map(([key, value]) => `<div class="info-row"><span class="label">${key}:</span><span class="value">${this.toDisplayString(value)}</span></div>`)
        .join("");
    }

    // オーディオストリーム情報の更新
    if (audioDetails && Array.isArray(mediaInfo.audio) && mediaInfo.audio.length > 0) {
      const entries = Object.entries(mediaInfo.audio[0]);
      audioDetails.innerHTML = entries
        .map(([key, value]) => `<div class="info-row"><span class="label">${key}:</span><span class="value">${this.toDisplayString(value)}</span></div>`)
        .join("");
    }
  }

  static updateStatistics(formatStats: SafeAllStats): void {
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
  static updateTitle(videoTitle: string, videoId: string): void {
    // titleタグを取得して更新
    const titleElement = document.getElementsByTagName("title")[0];
    if (titleElement) {
      titleElement.innerHTML = `nlMediaInfo: ${videoTitle} (${videoId})`;
    } else {
      console.warn('titleタグが見つからないのじゃ');
    }
  }
} 