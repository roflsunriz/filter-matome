import { NicoVideoPlayer } from '@/mlink-video-controller/services/nico-video-player';
import { TimeFormatter } from '@/mlink-video-controller/utils/time-formatter';
import { SeekOptions } from '@/types/mlink-video-controller-types';

export class PlaybackHandler {
  private player: NicoVideoPlayer;
  private updateInterval: number | null = null;

  constructor() {
    this.player = NicoVideoPlayer.getInstance();
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
    const delta = options.direction === 'forward' ? options.seconds : -options.seconds;
    const newTime = Math.max(0, Math.min(this.player.getDuration(), currentTime + delta));
    void this.player.seek(newTime);
  }

  public seekToPosition(position: number): void {
    const duration = this.player.getDuration();
    const time = position * duration;
    void this.player.seek(time);
  }

  public getPlaybackState() {
    return {
      isPlaying: this.player.isPlaying(),
      currentTime: this.player.getCurrentTime(),
      duration: this.player.getDuration()
    };
  }

  public formatTime(seconds: number): string {
    return TimeFormatter.formatTime(seconds);
  }

  public startUpdateInterval(callback: () => void): void {
    if (this.updateInterval !== null) {
      this.stopUpdateInterval();
    }
    this.updateInterval = window.setInterval(callback, 1000);
  }

  public stopUpdateInterval(): void {
    if (this.updateInterval !== null) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }
} 