import { debugLog, debugError, debugWarn } from './src/config.js';

// プレイヤー関連の定数
export const PLAYER_CONSTANTS = {
    // 再生速度の設定
    PLAYBACK_RATES: {
      MIN: 0.01,
      MAX: 200.0,
      DEFAULT: 1.0,
      STEP: 0.01
    },
    
    // 音量の設定
    VOLUME: {
      MIN: 0,
      MAX: 1,
      DEFAULT: 0.5,
      STEP: 0.01
    },
  
    // シーク関連の設定
    SEEK: {
      AUTO_PAUSE_VALUES: [0.01, 0.05, 0.07, 0.10, 0.20, 0.30, 0.50, 0.70, 1.00],
      NORMAL_VALUES: [3, 5, 10, 15, 30, 45, 60, 75, 90],
      DEFAULT_VALUE: 5
    }
  };
  
  // 再生速度のプリセット値
  export const PLAYBACK_RATE_PRESETS = {
    SLOW: [
      { value: 0.01, label: 'x0.01' },
      { value: 0.05, label: 'x0.05' },
      { value: 0.10, label: 'x0.10' },
      { value: 0.15, label: 'x0.15' },
      { value: 0.20, label: 'x0.20' },
      { value: 0.25, label: 'x0.25' },
      { value: 0.50, label: 'x0.50' },
      { value: 0.75, label: 'x0.75' }
    ],
    NORMAL: [
      { value: 1.00, label: 'x1.00' },
      { value: 1.11, label: 'x1.11' },
      { value: 1.17, label: 'x1.17' },
      { value: 1.25, label: 'x1.25' },
      { value: 1.50, label: 'x1.50' },
      { value: 1.75, label: 'x1.75' },
      { value: 2.00, label: 'x2.00' }
    ],
    HIGH: [
      { value: 2.25, label: 'x2.25' },
      { value: 2.50, label: 'x2.50' },
      { value: 2.75, label: 'x2.75' },
      { value: 3.00, label: 'x3.00' }
    ],
    ULTRA: [
      { value: 20.00, label: 'x20' },
      { value: 30.00, label: 'x30' },
      { value: 40.00, label: 'x40' },
      { value: 50.00, label: 'x50' },
      { value: 100.00, label: 'x100' },
      { value: 200.00, label: 'x200' }
    ]
  };
  
  // ローカルストレージのキー
  export const STORAGE_KEYS = {
    MINI_MODE: 'pc_minimode',
    PLAYBACK_RATE: 'pc_playbackrate',
    CUSTOM_SEEK: 'customSeek',
    CUSTOM_VOLUME: 'customVolume',
    CUSTOM_PLAYBACK_RATE: 'customPlaybackrate'
  };
  
  // DOM要素のID
  export const ELEMENT_IDS = {
    CONTAINER: 'PlaybackrateChangerContainer',
    MINI_MODE: 'MiniModeContainer',
    PLAYER_CONTROL: 'PlayerControllContainer',
    COMMENT_SEARCH: 'CommentSearchContainer',
    MISC: 'MiscContainer',
    TRACKER: {
      RANGE: 'TrackerRange',
      LABEL: 'TrackerLabel'
    },
    VOLUME: {
      RANGE: 'VolumeRange',
      LABEL: 'VolumeLabel',
      SELECT: 'VolumeSelect'
    },
    PLAYBACK_RATE: {
      RANGE: 'PlaybackrateRange',
      LABEL: 'PlaybackrateLabel',
      SELECT: 'PlaybackrateSelect'
    }
  };
  
  // デフォルトの設定値
  export const DEFAULT_SETTINGS = {
    CUSTOM_SEEK: ['5', '10', '15', '30'],
    CUSTOM_VOLUME: ['0.1', '0.3', '0.6', '0.9', '1.0'],
    CUSTOM_PLAYBACK_RATE: ['0.1', '0.3', '0.6', '0.9', '1.0', '1.2', '1.5']
  };
  
  // イベント名
  export const EVENTS = {
    VIDEO: {
      INITIALIZED: 'initialized',
      CHANGED: 'videoChanged',
      TIME_UPDATE: 'timeupdate',
      VOLUME_CHANGE: 'volumechange',
      RATE_CHANGE: 'ratechange'
    }
  };
  
  // アセットパス
  export const ASSETS = {
    IMAGES: {
      MINIMIZE: '/local/CustomFilters/PlaybackrateChanger2/img/minimize.png',
      MAXIMIZE: '/local/CustomFilters/PlaybackrateChanger2/img/maximize.png',
      PLAY: '/local/CustomFilters/PlaybackrateChanger2/img/play.png',
      PAUSE: '/local/CustomFilters/PlaybackrateChanger2/img/pause.png',
      FLASH: '/local/CustomFilters/PlaybackrateChanger2/img/flash.png'
    }
  };