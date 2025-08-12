import { NicoVideoPlayer } from '../services/nico-video-player';
import { PlaybackState, SeekOptions, VolumeOptions, PlaybackRateOptions } from '../../types/mlink-video-controller-types';

export class ControlManager {
  private static instance: ControlManager;
  private player: NicoVideoPlayer;
  private updateInterval: number | null = null;

  private constructor() {
    this.player = NicoVideoPlayer.getInstance();
  }

  public static getInstance(): ControlManager {
    if (!ControlManager.instance) {
      ControlManager.instance = new ControlManager();
    }
    return ControlManager.instance;
  }

  public getPlaybackState(): PlaybackState {
    return {
      isPlaying: this.player.isPlaying(),
      currentTime: this.player.getCurrentTime(),
      duration: this.player.getDuration(),
      volume: this.player.getVolume() / 100,
      playbackRate: this.player.getPlaybackRate()
    };
  }

  public togglePlayPause(): void {
    if (this.player.isPlaying()) {
      void this.player.pause();
    } else {
      void this.player.play();
    }
  }

  public seek(options: SeekOptions): void {
    const currentTime = this.player.getCurrentTime();
    const duration = this.player.getDuration();
    let newTime: number;

    if (options.direction === 'forward') {
      newTime = Math.min(duration, currentTime + options.seconds);
    } else {
      newTime = Math.max(0, currentTime - options.seconds);
    }

    void this.player.seek(newTime);
  }

  public seekToPosition(position: number): void {
    const duration = this.player.getDuration();
    const newTime = (position / 100) * duration;
    void this.player.seek(newTime);
  }

  public setVolume(options: VolumeOptions): void {
    let volume = options.value;

    if (options.isLogarithmic) {
      volume = this.linearToLogVolume(volume);
    }

    void this.player.setVolume(volume * 100);
  }

  public setPlaybackRate(options: PlaybackRateOptions): void {
    let rate = options.value;

    if (options.min !== undefined) {
      rate = Math.max(options.min, rate);
    }

    if (options.max !== undefined) {
      rate = Math.min(options.max, rate);
    }

    void this.player.setPlaybackRate(rate);
  }

  public adjustPlaybackRate(delta: number): void {
    const currentRate = this.player.getPlaybackRate();
    const newRate = Math.max(0.1, Math.min(5.0, currentRate + delta));
    void this.player.setPlaybackRate(newRate);
  }

  public formatTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  private linearToLogVolume(value: number): number {
    // 線形値（0-1）から対数スケール（0-1）への変換
    // value=0のときは音量0、value=1のときは音量1になるように調整
    return value === 0 ? 0 : Math.exp(Math.log(1000) * value) / 1000;
  }

  public logSliderToLinearValue(volume: number): number {
    // 対数スケール（0-1）から線形値（0-1）への逆変換
    return volume === 0 ? 0 : Math.log(volume * 1000) / Math.log(1000);
  }

  public startUpdateInterval(callback: () => void): void {
    if (this.updateInterval) {
      window.clearInterval(this.updateInterval);
    }
    this.updateInterval = window.setInterval(callback, 1000);
  }

  public stopUpdateInterval(): void {
    if (this.updateInterval) {
      window.clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }
} 