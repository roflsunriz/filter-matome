import { formatters } from '../utils/formatters.js';
import type { MediaInfoResult } from '@/types/media-info.js';

export class UIUpdater {
  static updateAll(mediaInfo: MediaInfoResult): void {
    this.updateBasicInfo(mediaInfo);
    this.updateDetailedInfo(mediaInfo);
    this.updateStatistics(mediaInfo.formatStats);
  }

  static updateBasicInfo(mediaInfo: MediaInfoResult): void {
    const resultDiv = document.getElementById("results");
    if (resultDiv) {
      resultDiv.style.display = "block";
    }
    
    const loadingDiv = document.getElementById("loading");
    if (loadingDiv) {
      loadingDiv.style.display = "none";
    }
  
    const videoInfo = mediaInfo.result.video[0] || {};
    const audioInfo = mediaInfo.result.audio[0] || {};
    const generalInfo = mediaInfo.result.general || {};
    const averageBitrates = mediaInfo.result.averageBitrates || {};
  
    // 解像度
    const resolutionElement = document.querySelector("#resolution .resolution-value");
    if (resolutionElement) {
      resolutionElement.textContent = 
        `${videoInfo["Width"] || "N/A"} x ${videoInfo["Height"] || "N/A"} pixels`;
    }
  
    // ビットレート
    const overallBitrateElement = document.querySelector("#bitrate .overall-bitrate");
    if (overallBitrateElement) {
      overallBitrateElement.textContent = 
        `全体平均: ${(averageBitrates.overall/1024/1024).toFixed(2)} Mbps`;
    }
    
    const videoBitrateElement = document.querySelector("#bitrate .video-bitrate");
    if (videoBitrateElement) {
      videoBitrateElement.textContent = 
        `映像平均: ${(averageBitrates.video/1024/1024).toFixed(2)} Mbps`;
    }
    
    const audioBitrateElement = document.querySelector("#bitrate .audio-bitrate");
    if (audioBitrateElement) {
      audioBitrateElement.textContent = 
        `音声平均: ${(averageBitrates.audio/1024).toFixed(2)} Kbps`;
    }
  
    // 映像コーデック
    const videoFormatElement = document.querySelector("#video-codec .format");
    if (videoFormatElement) {
      videoFormatElement.textContent = 
        `${videoInfo["Format"] || "N/A"} (${videoInfo["Format profile"] || "N/A"})`;
    }
    
    const cabacElement = document.querySelector("#video-codec .cabac");
    if (cabacElement) {
      cabacElement.textContent = 
        `CABAC設定: ${videoInfo["Format settings"] || "N/A"}`;
    }
  
    // 音声コーデック
    const audioFormatElement = document.querySelector("#audio-codec .format");
    if (audioFormatElement) {
      audioFormatElement.textContent = 
        `形式: ${audioInfo["Format"] || "N/A"}`;
    }
    
    const channelsElement = document.querySelector("#audio-codec .channels");
    if (channelsElement) {
      channelsElement.textContent = 
        `チャンネル: ${audioInfo["Channel(s)"] || "N/A"}`;
    }
    
    const samplingRateElement = document.querySelector("#audio-codec .sampling-rate");
    if (samplingRateElement) {
      samplingRateElement.textContent = 
        `サンプリングレート: ${audioInfo["Sampling rate"] || "N/A"}`;
    }
  
    // フレームレート
    const frameModeElement = document.querySelector("#framerate .mode");
    if (frameModeElement) {
      frameModeElement.textContent = 
        `モード: ${videoInfo["Frame rate mode"] || "N/A"}`;
    }
    
    const frameRateElement = document.querySelector("#framerate .rate");
    if (frameRateElement) {
      frameRateElement.textContent = 
        `レート: ${videoInfo["Frame rate"] || "N/A"}`;
    }
  
    // コンテナフォーマット
    const containerFormatElement = document.querySelector("#container .format");
    if (containerFormatElement) {
      containerFormatElement.textContent = 
        `${generalInfo["Format"] || "N/A"}`;
    }
  
    // カラースペース
    const colorSpaceElement = document.querySelector("#color .space");
    if (colorSpaceElement) {
      colorSpaceElement.textContent = 
        `色空間: ${videoInfo["Color space"] || "N/A"}`;
    }
    
    const colorRangeElement = document.querySelector("#color .range");
    if (colorRangeElement) {
      colorRangeElement.textContent = 
        `色域: ${videoInfo["Color range"] || "N/A"}`;
    }
    
    const colorPrimariesElement = document.querySelector("#color .primaries");
    if (colorPrimariesElement) {
      colorPrimariesElement.textContent = 
        `色基準: ${videoInfo["Color primaries"] || "N/A"}`;
    }
  
    // アスペクト比
    const aspectRatioElement = document.querySelector("#aspect .ratio");
    if (aspectRatioElement) {
      aspectRatioElement.textContent = 
        `${videoInfo["Display aspect ratio"] || "N/A"}`;
    }
  
    // ファイルサイズ
    const fileSizeElement = document.querySelector("#filesize .size");
    if (fileSizeElement) {
      fileSizeElement.textContent = 
        `${formatters.formatFileSize(parseInt(generalInfo["File size"] || "0"))}`;
    }
    
    const durationElement = document.querySelector("#filesize .duration");
    if (durationElement) {
      durationElement.textContent = 
        `再生時間: ${generalInfo["Duration"] || "N/A"}`;
    }
  
    // メタデータ
    const pathElement = document.querySelector("#metadata .path");
    if (pathElement) {
      pathElement.textContent = 
        `完全パス: ${generalInfo["Complete name"] || "N/A"}`;
    }
    
    const idElement = document.querySelector("#metadata .id");
    if (idElement) {
      idElement.textContent = 
        `ID: ${generalInfo["ID"] || "N/A"}`;
    }
  
    // 詳細情報の更新
    this.updateDetailedInfo(mediaInfo);
    
    // 統計情報の更新
    this.updateStatistics(mediaInfo.formatStats);
  }

  static updateDetailedInfo(mediaInfo: MediaInfoResult): void {
    const videoDetails = document.getElementById("video-stream-details");
    const audioDetails = document.getElementById("audio-stream-details");
  
    // ビデオストリーム情報の更新
    if (videoDetails && mediaInfo.result.video.length > 0) {
      videoDetails.innerHTML = Object.entries(mediaInfo.result.video[0])
        .map(([key, value]) => `<div class="info-row"><span class="label">${key}:</span><span class="value">${value || 'N/A'}</span></div>`)
        .join("");
    }
  
    // オーディオストリーム情報の更新
    if (audioDetails && mediaInfo.result.audio.length > 0) {
      audioDetails.innerHTML = Object.entries(mediaInfo.result.audio[0])
        .map(([key, value]) => `<div class="info-row"><span class="label">${key}:</span><span class="value">${value || 'N/A'}</span></div>`)
        .join("");
    }
  }

  static updateStatistics(formatStats: any): void {
    const statsDiv = document.getElementById("format-statistics");
    if (!statsDiv) return;
    
    let html = "";
    
    Object.keys(formatStats).forEach((category) => {
      html += `<div class="category"><h4>${category.toUpperCase()}</h4>`;
      Object.keys(formatStats[category]).forEach((format) => {
        const stats = formatStats[category][format];
        html += `<div class="format">
          <h5>${format}</h5>
          <p>ファイル数: ${stats.count}</p>
          <p>総サイズ: ${formatters.formatFileSize(stats.totalSize)}</p>
          <p>平均サイズ: ${formatters.formatFileSize(stats.totalSize / stats.count)}</p>
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