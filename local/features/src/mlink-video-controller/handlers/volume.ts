import { NicoVideoPlayer } from '@/mlink-video-controller/services/nico-video-player';
import { VolumeOptions } from '@/types/mlink-video-controller-types';

export class VolumeHandler {
  private player: NicoVideoPlayer;
  private readonly minDb = -60; // -60dB (最小音量)
  private readonly maxDb = 0;   // 0dB (最大音量)

  constructor() {
    this.player = NicoVideoPlayer.getInstance();
  }

  public setVolume(options: VolumeOptions): void {
    let volume = options.value;
    
    // 対数スケールの場合は線形に変換
    if (options.isLogarithmic) {
      volume = this.logSliderToLinearValue(volume);
    }

    // 0-1の範囲に制限
    volume = Math.max(0, Math.min(1, volume));
    
    // 0-100の範囲に変換してプレイヤーに設定
    this.player.setVolume(volume * 100);
  }

  public getVolume(): number {
    return this.player.getVolume() / 100;
  }

  public mute(): void {
    this.setVolume({ value: 0 });
  }

  public adjustVolume(delta: number): void {
    const currentVolume = this.getVolume();
    this.setVolume({ value: currentVolume + delta });
  }

  // 対数スケールのスライダー値（0-1）を線形値（0-1）に変換
  public logSliderToLinearValue(value: number): number {
    if (value <= 0) return 0;
    if (value >= 1) return 1;

    // スライダー値をデシベルに変換
    const db = this.minDb + (value * (this.maxDb - this.minDb));
    
    // デシベルを線形値に変換
    return Math.pow(10, db / 20);
  }

  // 線形値（0-1）を対数スケールのスライダー値（0-1）に変換
  public linearToLogSliderValue(value: number): number {
    if (value <= 0) return 0;
    if (value >= 1) return 1;

    // 線形値をデシベルに変換
    const db = 20 * Math.log10(value);
    
    // デシベルをスライダー値に変換
    return (db - this.minDb) / (this.maxDb - this.minDb);
  }
} 