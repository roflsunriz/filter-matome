import { NicoVideoPlayer } from '../services/nico-video-player';
import { PlaybackRateOptions } from '@/types/mlink-video-controller-types';

export class SpeedHandler {
  private player: NicoVideoPlayer;
  private readonly defaultMin = 0.1;
  private readonly defaultMax = 5.0;
  private readonly defaultStep = 0.1;

  constructor() {
    this.player = NicoVideoPlayer.getInstance();
  }

  public setPlaybackRate(options: PlaybackRateOptions): void {
    const min = options.min ?? this.defaultMin;
    const max = options.max ?? this.defaultMax;
    
    // 範囲内に制限
    const rate = Math.max(min, Math.min(max, options.value));
    
    // 小数点第2位で四捨五入
    const roundedRate = Math.round(rate * 100) / 100;
    
    this.player.setPlaybackRate(roundedRate);
  }

  public getPlaybackRate(): number {
    return this.player.getPlaybackRate();
  }

  public adjustPlaybackRate(delta: number): void {
    const currentRate = this.getPlaybackRate();
    this.setPlaybackRate({
      value: currentRate + delta,
      min: this.defaultMin,
      max: this.defaultMax
    });
  }

  public resetPlaybackRate(): void {
    this.setPlaybackRate({ value: 1.0 });
  }

  public getPresets(): number[] {
    return [0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 2.0];
  }

  public getStep(): number {
    return this.defaultStep;
  }

  public getRange(): { min: number; max: number } {
    return {
      min: this.defaultMin,
      max: this.defaultMax
    };
  }
} 