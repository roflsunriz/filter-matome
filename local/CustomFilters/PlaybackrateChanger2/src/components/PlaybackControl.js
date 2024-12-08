import { PLAYER_CONSTANTS, ELEMENT_IDS, STORAGE_KEYS, EVENTS, ASSETS } from '../../constants.js';
import { debugLog, debugError, debugWarn } from '../config.js';
import { parseTimeString } from '../utils/timeFormatter.js';
import { SyncPlayback } from './SyncPlayback.js';

export class PlaybackController {
  constructor({ video }) {
    try {
      this.video = video;
      this.elements = {};
      this.syncPlayback = new SyncPlayback(this.video, () => this.isOfficialVideo());
      
      // 動画の自動再生を監視
      this.video.addEventListener('play', () => this.handleInitialPlay());
      
      this.initializeElements();
      this.setupEventListeners();
      this.loadSavedSettings();
      
      debugLog('PlaybackController: 初期化完了');
    } catch (error) {
      debugError('PlaybackController初期化エラー:', error);
      throw error;
    }
  }

  updateVideo(videoId, apiData) {
    try {
      debugLog('動画情報更新開始:', { videoId, duration: this.video.duration });
      this.initializeDisplays();
      debugLog('動画情報更新完了');
    } catch (error) {
      debugError('動画情報更新エラー:', error);
    }
  }

  initializeDisplays() {
    if (!this.video) {
      debugWarn('動画要素が見つかりません');
      return;
    }
    
    try {
      debugLog('表示更新開始');
      // 保存された設定の適用
      this.applyStoredSettings();
      
      // 表示の更新
      this.updateTracker();
      this.updateVolume();
      this.updatePlaybackRate();
      
      debugLog('表示更新完了:', {
        currentTime: this.video.currentTime,
        duration: this.video.duration,
        volume: this.video.volume,
        playbackRate: this.video.playbackRate
      });
    } catch (error) {
      debugError('表示更新エラー:', error);
    }
  }

  applyStoredSettings() {
    try {
      debugLog('保存された設定を適用開始');
      const savedVolume = localStorage.getItem(STORAGE_KEYS.VOLUME);
      if (savedVolume !== null) {
        this.video.volume = parseFloat(savedVolume);
        debugLog('保存された音量を適用:', savedVolume);
      }

      const savedRate = localStorage.getItem(STORAGE_KEYS.PLAYBACK_RATE);
      if (savedRate !== null) {
        this.video.playbackRate = parseFloat(savedRate);
        debugLog('保存された再生速度を適用:', savedRate);
      }
      debugLog('保存された設定の適用完了');
    } catch (error) {
      debugError('設定適用エラー:', error);
    }
  }

  // 要素の初期化
  initializeElements() {
    // トラッカー関連
    this.elements.tracker = {
      range: document.getElementById(ELEMENT_IDS.TRACKER.RANGE),
      label: document.getElementById(ELEMENT_IDS.TRACKER.LABEL),
      timeTip: document.querySelector('.SeekBarTimeTip2 .PlayTimeFormatter')
    };

    // 音量関連
    this.elements.volume = {
      range: document.getElementById(ELEMENT_IDS.VOLUME.RANGE),
      label: document.getElementById(ELEMENT_IDS.VOLUME.LABEL),
      select: document.getElementById(ELEMENT_IDS.VOLUME.SELECT)
    };

    // 再生速度関連
    this.elements.playbackRate = {
      range: document.getElementById(ELEMENT_IDS.PLAYBACK_RATE.RANGE),
      label: document.getElementById(ELEMENT_IDS.PLAYBACK_RATE.LABEL),
      select: document.getElementById(ELEMENT_IDS.PLAYBACK_RATE.SELECT),
      presetButtons: document.querySelectorAll('.PlaybackratePresetButton')
    };

    // 再生コントロール関連
    this.elements.playPauseButton = document.getElementById('PlayPauseToggleButton');
    this.elements.seekButtons = document.querySelectorAll('.SeekButton');
    this.elements.seekSelect = document.getElementById('SeekSelect');
    this.elements.syncButton = document.getElementById('Sync');

    // シーク関連の初期化
    const initialSeekValue = this.elements.seekSelect.value;
    this.elements.seekButtons.forEach(button => {
      const isForward = button.value.startsWith('+');
      button.value = isForward ? `+${initialSeekValue}` : `-${initialSeekValue}`;
    });
  }

  // イベントリスナーの設定
  setupEventListeners() {
    this.video.addEventListener('timeupdate', () => this.updateTracker());
    this.video.addEventListener('volumechange', () => this.updateVolume());
    this.video.addEventListener('ratechange', () => this.updatePlaybackRate());

    // トラッカー関連のイベント
    this.elements.tracker.range.addEventListener('input', (e) => this.handleTrackerChange(e));
    this.elements.tracker.range.addEventListener('mousemove', (e) => this.updateTimeTip(e));
    this.elements.tracker.range.addEventListener('mouseenter', () => {
      this.elements.tracker.timeTip.style.visibility = 'visible';
    });
    this.elements.tracker.range.addEventListener('mouseleave', () => {
      this.elements.tracker.timeTip.style.visibility = 'hidden';
    });

    // 音量関連のイベント
    this.elements.volume.range.addEventListener('input', (e) => this.handleVolumeChange(e));
    this.elements.volume.select.addEventListener('change', (e) => this.handleVolumeSelect(e));

    // 再生速度関連のイベント
    this.elements.playbackRate.range.addEventListener('input', (e) => this.handlePlaybackRateChange(e));
    this.elements.playbackRate.select.addEventListener('change', (e) => this.handlePlaybackRateSelect(e));
    this.elements.playbackRate.presetButtons.forEach(button => {
      button.addEventListener('click', (e) => this.handlePlaybackRatePreset(e));
    });

    // 再生コントロール関連のイベント
    this.elements.playPauseButton.addEventListener('click', () => this.togglePlayPause());
    this.elements.seekButtons.forEach(button => {
      button.addEventListener('click', (e) => this.handleSeek(e));
    });
    this.elements.syncButton.addEventListener('click', () => this.handleSync());

    // シーク関連のイベント
    this.elements.seekSelect.addEventListener('change', (e) => this.handleSeekSelectChange(e));
    this.elements.seekButtons.forEach(button => {
      button.addEventListener('click', (e) => this.handleSeek(e));
    });

    // 有料公式動画の場合のみ、動画クリックでの再生/一時停止切り替えを有効にする
    if (this.isOfficialPaidVideo()) {
      this.video.addEventListener('click', () => {
        this.togglePlayPause();
        // 有料公式動画の場合のみ同期を実行
        this.syncPlayback.syncWithOfficialPlayer({playToggle:true,seeker:false,tracker:false});
      });
      debugLog('動画クリックイベントを設定しました');
    }
  }

  // 保存された設定の読み込み
  loadSavedSettings() {
    const savedRate = localStorage.getItem(STORAGE_KEYS.PLAYBACK_RATE);
    if (savedRate) {
      this.setPlaybackRate(parseFloat(savedRate));
    }
  }

  // トラッカー更新メソッドの改善
  updateTracker() {
    try {
      const currentTime = this.video.currentTime || 0;
      const duration = this.video.duration || 0;
      
      this.elements.tracker.range.value = duration ? (currentTime / duration) * 100 : 0;
      this.elements.tracker.label.textContent = `${this.formatTime(currentTime)}/${this.formatTime(duration)}`;
    } catch (error) {
      debugError('トラッカー更新エラー:', error);
    }
  }

  handleTrackerChange(event) {
    const newTime = (event.target.value / 100) * this.video.duration;
    this.video.currentTime = newTime;

    // 公式動の場合のみ同期を実行
    if (this.isOfficialVideo()) {
      this.syncPlayback.syncWithOfficialPlayer({playToggle:false,seeker:false,tracker:true});
    }
  }

  updateTimeTip(event) {
    try {
        const rect = this.elements.tracker.range.getBoundingClientRect();
        const position = (event.clientX - rect.left) / rect.width;
        const time = position * this.video.duration;

        const tipElement = this.elements.tracker.timeTip;
        tipElement.textContent = this.formatTime(time);
        
        // マウスの相対位置を計算（トラッカー要素基準）
        const relativeX = event.clientX - rect.left;
        
        // ツールチップのサイズを取得
        const tipRect = tipElement.getBoundingClientRect();
        
        // マウス位置からの適切なオフセットを計算
        const offsetX = -(tipRect.width / 2); // ツールチップを水平方向で中央揃え
        const offsetY = -30; // マウスの上に表示（適度な距離を保つ）
        
        // 位置設定を修正（transformを使用）
        tipElement.style.position = 'absolute';
        tipElement.style.transform = `translate(${relativeX + offsetX}px, ${offsetY}px)`;
        tipElement.style.backgroundColor = '#000000';
        tipElement.style.zIndex = '10001';

    } catch (error) {
        debugError('時間ヒント更新エラー:', error);
    }
  }

  // 音量表示更メソッドの改善
  updateVolume() {
    try {
      const volume = this.video.volume;
      this.elements.volume.range.value = volume;
      this.elements.volume.label.textContent = volume.toFixed(2);
    } catch (error) {
      debugError('音量表示更新エラー:', error);
    }
  }

  handleVolumeChange(event) {
    const volume = parseFloat(event.target.value);
    this.video.volume = volume;
    localStorage.setItem(STORAGE_KEYS.VOLUME, volume);
  }

  handleVolumeSelect(event) {
    this.video.volume = parseFloat(event.target.value);
  }

  // 再生速度表示更新メソッドの改善
  updatePlaybackRate() {
    try {
      const rate = this.video.playbackRate;
      this.elements.playbackRate.range.value = rate;
      this.elements.playbackRate.label.textContent = rate.toFixed(2);
    } catch (error) {
      debugError('再生速度表示更新エラー:', error);
    }
  }

  handlePlaybackRateChange(event) {
    const rate = parseFloat(event.target.value);
    this.setPlaybackRate(rate);
  }

  handlePlaybackRateSelect(event) {
    this.setPlaybackRate(parseFloat(event.target.value));
  }

  handlePlaybackRatePreset(event) {
    const rate = parseFloat(event.target.value);
    this.setPlaybackRate(rate);
  }

  setPlaybackRate(rate) {
    this.video.playbackRate = rate;
    localStorage.setItem(STORAGE_KEYS.PLAYBACK_RATE, rate);
  }

  // 再生コントロール関連のメソッド
  async togglePlayPause() {
    try {
      // 現在の再生状態を保存
      const wasPlaying = !this.video.paused;
      
      // 通常の再生/一時停止トグル
      if (wasPlaying) {
        this.video.pause();
        this.elements.playPauseButton.src = ASSETS.IMAGES.PLAY;
      } else {
        this.video.play();
        this.elements.playPauseButton.src = ASSETS.IMAGES.PAUSE;
      }

    } catch (error) {
      debugError('再生/一時停止トグルエラー:', error);
    }
  }

  handleSeek(event) {
    try {
        const seekValue = parseInt(event.target.value);
        const seekSelect = this.elements.seekSelect;
        const selectedValue = parseFloat(seekSelect.value);
        
        debugLog('シーク操作:', { 
            buttonValue: seekValue,
            selectedValue: selectedValue,
            currentTime: this.video.currentTime 
        });

        // シーク値の計算（ボタンの値とセレクトボックスの値を掛け合わせる）
        const seekTime = seekValue >= 0 ? selectedValue : -selectedValue;
        this.video.currentTime += seekTime;

        debugLog('シーク後の時間:', { 
            seekTime: seekTime,
            newTime: this.video.currentTime 
        });

        // 公式動画の場合のみ同期を実行
        if (this.isOfficialVideo()) {
            this.syncPlayback.syncWithOfficialPlayer({playToggle:false,seeker:true,tracker:false});
        }
    } catch (error) {
        debugError('シーク操作エラー:', error);
    }
  }

  // ユーティリティメソッド
  formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    seconds = Math.floor(seconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  // クリーンアップメソッド
  destroy() {
    try {
      debugLog('PlaybackControllerのクリーンアップ開始');
      // SyncPlaybackのクリーンアップ
      this.syncPlayback.stopSync();
      // イベントリスナーの削除
      // 要素の参照解除
      this.elements = null;
      debugLog('PlaybackControllerのクリーンアップ完了');
    } catch (error) {
      debugError('PlaybackControllerのクリーンアップエラー:', error);
    }
  }

  // 公式動画かどうかを判定するメソッドを追加
  isOfficialVideo() {
    try {
      const currentUrl = window.location.href;
      return /^https?:\/\/www\.nicovideo\.jp\/watch\/so\d+/.test(currentUrl);
    } catch (error) {
      debugError('URL判定エラー:', error);
      return false;
    }
  }

  // シーク選択の変更ハンドラを追加
  handleSeekSelectChange(event) {
    try {
        const selectedValue = parseFloat(event.target.value);
        debugLog('シーク値変更:', { selectedValue });

        // シークボタンの値を更新
        this.elements.seekButtons.forEach(button => {
            const isForward = button.value.startsWith('+');
            button.value = isForward ? `+${selectedValue}` : `-${selectedValue}`;
        });

        debugLog('シークボタン更新完了');
    } catch (error) {
        debugError('シーク値変更エラー:', error);
    }
  }

  handleInitialPlay() {
    try {
        if (this.isOfficialVideo() && 
            NicoCache_nl.watch.apiData?.payment?.video?.watchableUserType !== "all") {
            debugLog('有料公式動画の自動再生を検出、同期を開始します');
            this.syncPlayback.startAutoSync();
        }
    } catch (error) {
        debugError('初期再生処理エラー:', error);
    }
  }

  async handleSync() {
    try {
        if (this.isOfficialVideo()) {
            debugLog('手動同期を開始します');
            const timeElement = document.querySelector("div.jc_center:nth-child(2)");
            if (!timeElement?.textContent) {
                debugWarn('時間要素が見つかりません');
                return;
            }
            const currentTime_official = parseTimeString(timeElement.textContent.split("/")[0]);
            const currentTime_pc = this.video.currentTime;
            
            await this.syncPlayback.syncWithAdjustment(currentTime_official, currentTime_pc);
        }
    } catch (error) {
        debugError('同期処理エラー:', error);
    }
  }

  // ミュート切り替メソッドを追加
  toggleMute() {
    try {
      this.video.muted = !this.video.muted;
      debugLog('ミュート状態を切り替えました:', { muted: this.video.muted });
      
      // 公式動画の場合のみ同期を実行
      if (this.isOfficialVideo()) {
        this.syncPlayback.syncWithOfficialPlayer({playToggle:false,seeker:false,tracker:false});
      }
    } catch (error) {
      debugError('ミュート切り替えエラー:', error);
    }
  }

  // フルスクリーン切り替えメソッドを追加
  toggleFullscreen() {
    try {
      if (!document.fullscreenElement) {
        // フルスクリーンにする
        const videoContainer = document.querySelector('#MainVideoPlayer');
        if (videoContainer) {
          videoContainer.requestFullscreen();
          debugLog('フルスクリーンに切り替えました');
        } else {
          debugWarn('動画コ���テナが見つかりません');
        }
      } else {
        // フルスクリーンを解除
        document.exitFullscreen();
        debugLog('フルスクリーンを解除しました');
      }
    } catch (error) {
      debugError('フルスクリーン切り替えエラー:', error);
    }
  }

  // 有料公式動画かどうかを判定するメソッドを追加
  isOfficialPaidVideo() {
    try {
      return this.isOfficialVideo() && 
             NicoCache_nl.watch.apiData?.payment?.video?.watchableUserType !== "all";
    } catch (error) {
      debugError('有料動画判定エラー:', error);
      return false;
    }
  }

  // 他のクラスから静的に呼び出せるようにする
  static isOfficialPaidVideoStatic() {
    try {
      const currentUrl = window.location.href;
      const isOfficial = /^https?:\/\/www\.nicovideo\.jp\/watch\/so\d+/.test(currentUrl);
      return isOfficial && 
             NicoCache_nl.watch.apiData?.payment?.video?.watchableUserType !== "all";
    } catch (error) {
      debugError('有料動画静的判定エラー:', error);
      return false;
    }
  }

  // キーボードショートカット用のシーク処理
  handleKeyboardSeek(seconds) {
    try {
      const newTime = this.video.currentTime + seconds;
      this.video.currentTime = Math.max(0, Math.min(newTime, this.video.duration));
      
      // 公式動画の場合のみ同期を実行
      if (this.isOfficialVideo()) {
        this.syncPlayback.syncWithOfficialPlayer({playToggle:false,seeker:true,tracker:false});
      }
    } catch (error) {
      debugError('キーボードシークエラー:', error);
    }
  }

  // 動画の最初にシーク
  seekToStart() {
    try {
      this.video.currentTime = 0;
      if (this.isOfficialVideo()) {
        this.syncPlayback.syncWithOfficialPlayer({playToggle:false,seeker:true,tracker:false});
      }
    } catch (error) {
      debugError('動画開始位置へのシークエラー:', error);
    }
  }

  // 動画の最後にシーク
  seekToEnd() {
    try {
      this.video.currentTime = this.video.duration;
      if (this.isOfficialVideo()) {
        this.syncPlayback.syncWithOfficialPlayer({playToggle:false,seeker:true,tracker:false});
      }
    } catch (error) {
      debugError('動画終了位置へのシークエラー:', error);
    }
  }
}