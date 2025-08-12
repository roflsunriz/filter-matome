"use strict";

import "../types/global-types";

/**
 * 共通ユーティリティ関数集
 */

// videoId取得関数群
export const videoIdUtils = {
  // window.openerからvideoIdを取得
  getFromOpener(): string | null {
    try {
      const openerAny = window.opener as unknown;
      const id = (openerAny as { NicoCache_nl?: { watch?: { apiData?: { video?: { id?: unknown } } } } })
        ?.NicoCache_nl?.watch?.apiData?.video?.id;
      return typeof id === 'string' ? id : null;
    } catch (error) {
      window.logger.warn('Cannot access window.opener:', error);
      return null;
    }
  },

  // URLからvideoIdを取得
  getFromUrl(): string | null {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('videoId');
  },

  // URLまたはSMIDからSMIDを抽出
  extractSmidFromInput(input: string): string | null {
    const smidPattern = /([a-z]{2}\d+)/i;
    const match = input.match(smidPattern);
    return match ? match[1].toLowerCase() : null;
  },

  // 優先順位に基づいてvideoIdを取得
  getBestVideoId(): string | null {
    return this.getFromOpener() || this.getFromUrl();
  }
};

// DOM操作ユーティリティ
export const domUtils = {
  setElementContent(id: string, content: string): void {
    const element = document.getElementById(id);
    if (element) element.textContent = content;
  },

  setElementHref(id: string, href: string): void {
    const element = document.getElementById(id) as HTMLAnchorElement;
    if (element) element.href = href;
  },

  setElementSrc(id: string, src: string): void {
    const element = document.getElementById(id) as HTMLImageElement | HTMLIFrameElement;
    if (element) element.src = src;
  },

  updateUrlWithVideoId(videoId: string): void {
    const url = new URL(window.location.href);
    url.searchParams.set('videoId', videoId);
    window.history.replaceState({}, '', url.toString());
  }
};

// 時間関連ユーティリティ
export const timeUtils = {
  // 時間形式（MM:SS）を秒に変換
  parseTimeToSeconds(timeString: string): number {
    const parts = timeString.split(':');
    if (parts.length === 2) {
      return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
    } else if (parts.length === 3) {
      return parseInt(parts[0], 10) * 3600 + parseInt(parts[1], 10) * 60 + parseInt(parts[2], 10);
    }
    return 0;
  },

  // 動画長の計算
  calculateVideoLength(VideoLengthString: string): number {
    const timeParts = VideoLengthString.split(":").map(Number);
    return timeParts.length === 3
      ? timeParts[0] * 3600 + timeParts[1] * 60 + timeParts[2]
      : timeParts[0] * 60 + timeParts[1];
  }
};

// 推定処理時間計算
export const estimationUtils = {
  calculateProcessingTime(commentNum: string, videoLength: string): string {
    const numComments = parseInt(commentNum, 10);
    const lengthInSeconds = timeUtils.parseTimeToSeconds(videoLength);
    
    const estimatedTime = (numComments * 0.01) + (lengthInSeconds * 0.05);
    return `推定処理時間: 約${Math.round(estimatedTime)}秒`;
  },

  showProcessingTimeToast(commentNum: string, videoLength: string): void {
    const timeEstimate = this.calculateProcessingTime(commentNum, videoLength);
    window.toastr.info(timeEstimate);
  }
};

// UI作成ユーティリティ
export const uiUtils = {
  // videoId入力UIを作成
  createVideoIdInputUI(onSubmit: (videoId: string) => void, onCancel: () => void): void {
    const container = document.createElement('div');
    container.id = 'video-id-input-container';
    container.style.cssText = `
      position: fixed;
      top: 20px;
      left: 20px;
      background: #fff;
      border: 2px solid #333;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 4px 8px rgba(0,0,0,0.3);
      z-index: 9999;
      max-width: 400px;
    `;
    
    container.innerHTML = `
      <h3>動画ID取得</h3>
      <p>動画IDが自動取得できませんでした。</p>
      <p>以下にSMID（例: sm12345678）またはニコニコ動画のURLを入力してください：</p>
      <input type="text" id="video-id-input" placeholder="sm12345678 または https://www.nicovideo.jp/watch/sm12345678" style="width: 100%; padding: 8px; margin: 8px 0;">
      <div style="text-align: right; margin-top: 10px;">
        <button id="video-id-submit" style="padding: 8px 16px; margin-right: 8px;">取得</button>
        <button id="video-id-cancel" style="padding: 8px 16px;">キャンセル</button>
      </div>
    `;
    
    document.body.appendChild(container);
    
    // イベントリスナーを追加
    const submitBtn = document.getElementById('video-id-submit');
    const cancelBtn = document.getElementById('video-id-cancel');
    const inputField = document.getElementById('video-id-input') as HTMLInputElement;
    
    const handleSubmit = () => {
      const input = inputField.value.trim();
      if (!input) return;
      
      const smid = videoIdUtils.extractSmidFromInput(input);
      if (smid) {
        container.remove();
        onSubmit(smid);
      } else {
        alert('有効なSMIDまたはURLを入力してください（例: sm12345678）');
      }
    };
    
    const handleCancel = () => {
      container.remove();
      onCancel();
    };
    
    if (submitBtn) submitBtn.addEventListener('click', handleSubmit);
    if (cancelBtn) cancelBtn.addEventListener('click', handleCancel);
    if (inputField) {
      inputField.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSubmit();
      });
      inputField.focus();
    }
  }
}; 