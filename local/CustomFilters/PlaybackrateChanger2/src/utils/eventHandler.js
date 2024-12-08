import { EVENTS } from '../../constants.js';
import { debugLog, debugError, debugWarn } from '../config.js';
import { PlaybackController } from '../components/PlaybackControl.js';

/**
 * イベントハンドラーのユーティリティクラス
 */
export class EventHandlers {
  constructor() {
    this.playbackController = null;
  }

  /**
   * イベントリスナーを追加
   * @param {string} eventName - イベント名
   * @param {Function} handler - ハンドラー関数
   * @param {Object} [options] - イベントリスナーのオプション
   */
  addListener(eventName, handler, options = {}) {
    if (!this.handlers.has(eventName)) {
      this.handlers.set(eventName, new Set());
    }
    this.handlers.get(eventName).add({ handler, options });
  }

  /**
   * イベントリスナーを削除
   * @param {string} eventName - イベント名
   * @param {Function} handler - ハンドラー関数
   */
  removeListener(eventName, handler) {
    if (!this.handlers.has(eventName)) return;
    
    const handlers = this.handlers.get(eventName);
    handlers.forEach((entry) => {
      if (entry.handler === handler) {
        handlers.delete(entry);
      }
    });
  }

  /**
   * 動画要素のイベントリスナーを設定
   * @param {HTMLVideoElement} video - 動画要素
   */
  setupVideoListeners(video) {
    if (!video) return;

    // 時間更新イベント
    this.addVideoListener(video, EVENTS.VIDEO.TIME_UPDATE, () => {
      this.emit(EVENTS.VIDEO.TIME_UPDATE, {
        currentTime: video.currentTime,
        duration: video.duration
      });
    });

    // 音量変更イベント
    this.addVideoListener(video, EVENTS.VIDEO.VOLUME_CHANGE, () => {
      this.emit(EVENTS.VIDEO.VOLUME_CHANGE, {
        volume: video.volume,
        muted: video.muted
      });
    });

    // 再生速度変更イベント
    this.addVideoListener(video, EVENTS.VIDEO.RATE_CHANGE, () => {
      this.emit(EVENTS.VIDEO.RATE_CHANGE, {
        playbackRate: video.playbackRate
      });
    });
  }

  /**
   * 動画要素のイベントリスナーを追加
   * @param {HTMLVideoElement} video - 動画要素
   * @param {string} eventName - イベント名
   * @param {Function} handler - ハンドラー関数
   */
  addVideoListener(video, eventName, handler) {
    if (!this.videoHandlers.has(eventName)) {
      this.videoHandlers.set(eventName, new Set());
    }
    this.videoHandlers.get(eventName).add(handler);
    video.addEventListener(eventName, handler);
  }

  /**
   * 動画要素のイベントリスナーを削除
   * @param {HTMLVideoElement} video - 動画要素
   */
  removeVideoListeners(video) {
    if (!video) return;

    this.videoHandlers.forEach((handlers, eventName) => {
      handlers.forEach(handler => {
        video.removeEventListener(eventName, handler);
      });
    });
    this.videoHandlers.clear();
  }

  /**
   * イベントを発火
   * @param {string} eventName - イベント名
   * @param {Object} [data] - イベントデータ
   */
  emit(eventName, data = {}) {
    if (!this.handlers.has(eventName)) return;

    const event = new CustomEvent(eventName, { detail: data });
    this.handlers.get(eventName).forEach(({ handler, options }) => {
      try {
        handler(event);
      } catch (error) {
        debugError(`Error in event handler for ${eventName}:`, error);
      }
    });
  }

  /**
   * キーボードショートカットの設定
   */
  setupKeyboardShortcuts() {
    // 有料公式動画の場合のみキーボードショートカットを有効にする
    if (!PlaybackController.isOfficialPaidVideoStatic()) {
      debugLog('無料動画または非公式動画のため、キーボードショートカットは無効です');
      return;
    }

    document.addEventListener('keydown', (event) => {
      if (!this.playbackController) return;
      
      // 入力欄でのショートカット無効化
      if (event.target.matches('input, textarea')) return;

      // キーボードショートカットの処理
      switch (event.code) {
        case 'Space':
        case 'KeyK':
          event.preventDefault();
          this.playbackController.togglePlayPause();
          break;
        case 'KeyM':
          event.preventDefault();
          this.playbackController.toggleMute();
          break;
        case 'KeyJ':
          event.preventDefault();
          this.playbackController.handleKeyboardSeek(-10);
          break;
        case 'KeyL':
          event.preventDefault();
          this.playbackController.handleKeyboardSeek(10);
          break;
        case 'ArrowLeft':
          event.preventDefault();
          this.playbackController.handleKeyboardSeek(-5);
          break;
        case 'ArrowRight':
          event.preventDefault();
          this.playbackController.handleKeyboardSeek(5);
          break;
        case 'Home':
          event.preventDefault();
          this.playbackController.seekToStart();
          break;
        case 'End':
          event.preventDefault();
          this.playbackController.seekToEnd();
          break;
        case 'KeyF':
          event.preventDefault();
          this.playbackController.toggleFullscreen();
          break;
      }
    });
  }

  /**
   * マウスホイールイベントの設定
   * @param {HTMLElement} element - 対象要素
   * @param {Function} handler - ハンドラー関数
   */
  setupWheelHandler(element, handler) {
    if (!element) return;

    element.addEventListener('wheel', (event) => {
      event.preventDefault();
      handler(event.deltaY > 0 ? 'down' : 'up');
    }, { passive: false });
  }

  /**
   * ドラッグ＆ドロップイベントの設定
   * @param {HTMLElement} element - 対象要素
   * @param {Object} handlers - イベントハンドラーオブジェクト
   */
  setupDragAndDrop(element, handlers) {
    if (!element) return;

    element.addEventListener('dragover', (event) => {
      event.preventDefault();
      event.dataTransfer.dropEffect = 'copy';
    });

    element.addEventListener('drop', (event) => {
      event.preventDefault();
      if (handlers.onDrop) {
        handlers.onDrop(event.dataTransfer.files);
      }
    });
  }

  /**
   * 全てのイベントリスナーをクリーンアップ
   */
  cleanup() {
    this.handlers.clear();
    this.videoHandlers.clear();
  }
}

// シングルトンインスタンスをエクスポート
export const eventHandlers = new EventHandlers();