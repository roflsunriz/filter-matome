import { PLAYER_CONSTANTS, ELEMENT_IDS, STORAGE_KEYS } from '../../constants.js';
import { eventHandlers } from '../utils/eventHandler.js';
import { formatTime } from '../utils/timeFormatter.js';
import { debugLog, debugError, debugWarn } from '../config.js';

export class VolumeController {
  constructor({ video }) {
    this.video = video;
    this.elements = {
      range: document.getElementById(ELEMENT_IDS.VOLUME.RANGE),
      label: document.getElementById(ELEMENT_IDS.VOLUME.LABEL),
      select: document.getElementById(ELEMENT_IDS.VOLUME.SELECT)
    };

    this.initialize();
  }

  initialize() {
    // レンジスライダーの初期設定
    this.initializeRange();
    
    // 保存された設定の読み込み
    this.loadSavedSettings();
    
    // イベントリスナーの設定
    this.setupEventListeners();

  }

  initializeRange() {
    const { range } = this.elements;
    range.min = PLAYER_CONSTANTS.VOLUME.MIN;
    range.max = PLAYER_CONSTANTS.VOLUME.MAX;
    range.step = PLAYER_CONSTANTS.VOLUME.STEP;
    range.value = PLAYER_CONSTANTS.VOLUME.DEFAULT;
  }

  setupEventListeners() {
    // 音量スライダーの変更イベント
    this.elements.range.addEventListener('input', (e) => this.handleVolumeChange(e));
    
    // 音量プリセット選択イベント
    this.elements.select.addEventListener('change', (e) => this.handleVolumeSelect(e));
        
    // ビデオの音量変更イベント
    this.video.addEventListener('volumechange', () => this.updateVolumeDisplay());
    
    // ホイール操作による音量調整
    this.elements.range.addEventListener('wheel', (e) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.01 : 0.01;
      const newVolume = Math.max(0, Math.min(1, this.video.volume + delta));
      this.setVolume(newVolume);
    }, { passive: false });
  }

  handleVolumeChange(event) {
    const volume = parseFloat(event.target.value);
    this.setVolume(volume);
  }

  handleVolumeSelect(event) {
    const volume = parseFloat(event.target.value);
    this.setVolume(volume);
  }

  setVolume(volume) {
    // 範囲内に収める
    volume = Math.max(PLAYER_CONSTANTS.VOLUME.MIN, 
             Math.min(PLAYER_CONSTANTS.VOLUME.MAX, volume));
    
    // 音量を設定
    this.video.volume = volume;
    
    // 設定を保存
    localStorage.setItem(STORAGE_KEYS.VOLUME, volume.toString());
    
    // 表示を更新
    this.updateVolumeDisplay();
  }

  updateVolumeDisplay() {
    const volume = this.video.volume;
    this.elements.range.value = volume;
    this.elements.label.textContent = volume.toFixed(2);
  }

  loadSavedSettings() {
    const savedVolume = localStorage.getItem(STORAGE_KEYS.VOLUME);
    if (savedVolume !== null) {
      this.setVolume(parseFloat(savedVolume));
    } else {
      this.setVolume(PLAYER_CONSTANTS.VOLUME.DEFAULT);
    }
  }

  // クリーンアップメソッド
  destroy() {
    // イベントリスナーの削除
    this.elements.range.removeEventListener('input', this.handleVolumeChange);
    this.elements.select.removeEventListener('change', this.handleVolumeSelect);
    this.video.removeEventListener('volumechange', this.updateVolumeDisplay);
    
    // 要素の参照を解除
    this.elements = null;
  }
}