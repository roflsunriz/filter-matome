import { NicoCache_nlInterface } from "@/types/global-types";

export class NicoVideoPlayer {
  private static instance: NicoVideoPlayer;
  private nicoCache!: NicoCache_nlInterface;
  private isPlayingState: boolean = false;
  private currentVolume: number = 50;
  private currentPlaybackRate: number = 1.0;
  private currentTime: number = 0;
  private duration: number = 0;
  private videoElement: HTMLVideoElement | null = null;
  private eventListeners: { [key: string]: EventListener } = {};
  private checkInterval: number | null = null;
  private initialized: boolean = false;
  private isInitializing: boolean = false;

  // ローカルストレージのキー
  private readonly STORAGE_KEYS = {
    VOLUME: "nicoVideoPlayerVolume",
    PLAYBACK_RATE: "nicoVideoPlayerPlaybackRate",
  };

  // 安全な範囲の制限（初期化時のみ使用）
  private readonly SAFE_LIMITS = {
    VOLUME: {
      MIN: 0,
      MAX: 100,
    },
    PLAYBACK_RATE: {
      MIN: 0.1,
      MAX: 5.0,
    },
  };

  private constructor() {
    void this.initializeNicoCache();
  }

  private async initializeNicoCache(): Promise<void> {
    // NicoCache_nlが利用可能になるまで待機
    while (!window.NicoCache_nl) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    this.nicoCache = window.NicoCache_nl;
    this.setupEventListeners();
    this.initialized = true;
    this.isInitializing = false; // 初期化完了
  }

  public static getInstance(): NicoVideoPlayer {
    if (!NicoVideoPlayer.instance) {
      NicoVideoPlayer.instance = new NicoVideoPlayer();
    }
    return NicoVideoPlayer.instance;
  }

  private getVideoElement(): HTMLVideoElement | null {
    try {
      if (!this.videoElement || !document.body.contains(this.videoElement)) {
        const videos = Array.from(document.querySelectorAll("video"));
        this.videoElement =
          videos.find((video) => {
            return (
              // 新しい条件: data-name="video-content" を持つ要素
              video.dataset.name === "video-content" ||
              // idにvideo-elementを持つ要素
              video.id === "video-element"
            );
          }) || null;

        if (this.videoElement) {
          this.setupVideoElementListeners();
        }
      }
      return this.videoElement;
    } catch (error) {
      window.logger.error(
        "[NicoVideoPlayer] Error getting video element:",
        error,
      );
      return null;
    }
  }

  private setupVideoElementListeners(): void {
    if (!this.videoElement) return;

    try {
      // イベントリスナーを一旦クリア
      this.removeAllEventListeners();

      // 再生状態の監視
      this.eventListeners.play = () => {
        this.isPlayingState = true;
      };
      this.eventListeners.pause = () => {
        this.isPlayingState = false;
      };

      // 時間の監視
      this.eventListeners.timeupdate = () => {
        if (this.videoElement) {
          this.currentTime = this.videoElement.currentTime;
        }
      };
      this.eventListeners.durationchange = () => {
        if (this.videoElement) {
          this.duration = this.videoElement.duration;
        }
      };

      // 再生速度の監視
      this.eventListeners.ratechange = () => {
        if (this.videoElement) {
          this.currentPlaybackRate = this.videoElement.playbackRate;
          this.saveSettings(); // 変更時に自動保存
        }
      };

      // 音量の監視
      this.eventListeners.volumechange = () => {
        if (this.videoElement) {
          this.currentVolume = this.videoElement.volume * 100;
          this.saveSettings(); // 変更時に自動保存
        }
      };

      // エラー監視
      this.eventListeners.error = (event) => {
        window.logger.error("[NicoVideoPlayer] Video error:", event);
      };

      // 動画が読み込まれたときの処理
      this.eventListeners.loadedmetadata = () => {
        // 少し遅延させて設定を復元（動画の初期化完了を待つ）
        setTimeout(() => {
          this.restoreSettings();
        }, 100);
      };

      // イベントリスナーを登録
      Object.entries(this.eventListeners).forEach(([event, listener]) => {
        this.videoElement?.addEventListener(event, listener);
      });

      // 外部変更の監視を開始
      this.startExternalChangeMonitoring();

      // 既に動画が読み込まれている場合は即座に設定を復元
      if (this.videoElement.readyState >= 1) {
        setTimeout(() => {
          this.restoreSettings();
        }, 100);
      }
    } catch (error) {
      window.logger.error(
        "[NicoVideoPlayer] Error setting up event listeners:",
        error,
      );
    }
  }

  private removeAllEventListeners(): void {
    try {
      if (!this.videoElement) return;

      Object.entries(this.eventListeners).forEach(([event, listener]) => {
        this.videoElement?.removeEventListener(event, listener);
      });
      this.eventListeners = {};
    } catch (error) {
      window.logger.error(
        "[NicoVideoPlayer] Error removing event listeners:",
        error,
      );
    }
  }

  private setupEventListeners(): void {
    // 既存のインターバルをクリア
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }

    // SPAのページ遷移に対応するため、定期的にvideo要素の存在をチェック
    this.checkInterval = window.setInterval(() => {
      this.getVideoElement();
    }, 1000);
  }

  public async play(): Promise<void> {
    try {
      const video = this.getVideoElement();
      if (video) {
        await video.play();
      }
    } catch (error) {
      window.logger.error("[NicoVideoPlayer] Error playing video:", error);
      this.isPlayingState = false;
    }
  }

  public pause(): void {
    try {
      const video = this.getVideoElement();
      if (video) {
        video.pause();
      }
    } catch (error) {
      window.logger.error("[NicoVideoPlayer] Error pausing video:", error);
    }
  }

  public seek(time: number): void {
    try {
      const video = this.getVideoElement();
      if (video) {
        video.currentTime = Math.max(0, Math.min(time, video.duration));
        this.currentTime = video.currentTime;
      }
    } catch (error) {
      window.logger.error("[NicoVideoPlayer] Error seeking video:", error);
    }
  }

  public setVolume(volume: number): void {
    try {
      const video = this.getVideoElement();

      // 常に0-100の範囲に丸める
      const finalVolume = Math.max(0, Math.min(100, volume));

      if (video) {
        const normalizedVolume = finalVolume / 100;
        video.volume = normalizedVolume;
        this.currentVolume = finalVolume;

        // 設定を保存
        this.saveSettings();
      }
    } catch (error) {
      window.logger.error("[NicoVideoPlayer] Error setting volume:", error);
    }
  }

  public setPlaybackRate(rate: number): void {
    try {
      const video = this.getVideoElement();
      if (video) {
        let finalRate = rate;

        // 初期化時のみ安全な範囲に丸める
        if (this.isInitializing) {
          finalRate = this.clampToSafeRange(rate, "PLAYBACK_RATE");
          if (finalRate !== rate) {
            window.logger.warn(
              `[NicoVideoPlayer] Playback rate value ${rate} was clamped to safe range: ${finalRate}`,
            );
          }
        }

        video.playbackRate = finalRate;
        this.currentPlaybackRate = finalRate;

        // 設定を保存
        this.saveSettings();
      }
    } catch (error) {
      window.logger.error(
        "[NicoVideoPlayer] Error setting playback rate:",
        error,
      );
    }
  }

  public isPlaying(): boolean {
    const video = this.getVideoElement();
    return video ? !video.paused : this.isPlayingState;
  }

  public getVolume(): number {
    const video = this.getVideoElement();
    return video ? video.volume * 100 : this.currentVolume;
  }

  public getPlaybackRate(): number {
    const video = this.getVideoElement();
    return video ? video.playbackRate : this.currentPlaybackRate;
  }

  public getCurrentTime(): number {
    const video = this.getVideoElement();
    return video ? video.currentTime : this.currentTime;
  }

  public getDuration(): number {
    const video = this.getVideoElement();
    return video ? video.duration : this.duration;
  }

  public isInitialized(): boolean {
    return this.initialized;
  }

  public reinitialize(): void {
    try {
      this.removeAllEventListeners();
      if (this.checkInterval) {
        clearInterval(this.checkInterval);
        this.checkInterval = null;
      }
      this.videoElement = null;
      this.isPlayingState = false;
      this.currentVolume = 50;
      this.currentPlaybackRate = 1.0;
      this.currentTime = 0;
      this.duration = 0;
      this.initialized = false;
      this.isInitializing = true;
      void this.initializeNicoCache();
    } catch (error) {
      window.logger.error("[NicoVideoPlayer] Error reinitializing:", error);
    }
  }

  public destroy(): void {
    try {
      this.removeAllEventListeners();
      if (this.checkInterval) {
        clearInterval(this.checkInterval);
        this.checkInterval = null;
      }
      this.videoElement = null;
      this.initialized = false;
      NicoVideoPlayer.instance = undefined!;
    } catch (error) {
      window.logger.error(
        "[NicoVideoPlayer] Error destroying instance:",
        error,
      );
    }
  }

  // 安全な範囲への丸め機能
  private clampToSafeRange(
    value: number,
    type: "VOLUME" | "PLAYBACK_RATE",
  ): number {
    const limits = this.SAFE_LIMITS[type];
    return Math.max(limits.MIN, Math.min(limits.MAX, value));
  }

  // 設定をローカルストレージに保存
  private saveSettings(): void {
    try {
      const safeVolume = this.clampToSafeRange(this.currentVolume, "VOLUME");
      const safePlaybackRate = this.clampToSafeRange(
        this.currentPlaybackRate,
        "PLAYBACK_RATE",
      );

      localStorage.setItem(this.STORAGE_KEYS.VOLUME, safeVolume.toString());
      localStorage.setItem(
        this.STORAGE_KEYS.PLAYBACK_RATE,
        safePlaybackRate.toString(),
      );
    } catch (error) {
      window.logger.error("[NicoVideoPlayer] Error saving settings:", error);
    }
  }

  // 設定をローカルストレージから復元
  private restoreSettings(): void {
    try {
      // 設定復元時は一時的に初期化フラグを有効にして安全チェックを行う
      const wasInitializing = this.isInitializing;
      this.isInitializing = true;

      const savedVolume = localStorage.getItem(this.STORAGE_KEYS.VOLUME);
      const savedPlaybackRate = localStorage.getItem(
        this.STORAGE_KEYS.PLAYBACK_RATE,
      );

      if (savedVolume !== null) {
        const volume = parseFloat(savedVolume);
        this.setVolume(volume);
      }

      if (savedPlaybackRate !== null) {
        const rate = parseFloat(savedPlaybackRate);
        this.setPlaybackRate(rate);
      }

      // 初期化フラグを元に戻す
      this.isInitializing = wasInitializing;
    } catch (error) {
      window.logger.error("[NicoVideoPlayer] Error restoring settings:", error);
      this.isInitializing = false; // エラー時も確実にフラグをリセット
    }
  }

  // 外部変更を検知するための監視機能
  private startExternalChangeMonitoring(): void {
    if (!this.videoElement) return;

    // 定期的に外部変更をチェック
    const monitorInterval = setInterval(() => {
      if (!this.videoElement || !document.body.contains(this.videoElement)) {
        clearInterval(monitorInterval);
        return;
      }

      // 音量の外部変更を検知
      const actualVolume = this.videoElement.volume * 100;
      if (Math.abs(actualVolume - this.currentVolume) > 1) {
        this.currentVolume = actualVolume;
        this.saveSettings();
      }

      // 再生速度の外部変更を検知
      const actualRate = this.videoElement.playbackRate;
      if (Math.abs(actualRate - this.currentPlaybackRate) > 0.01) {
        this.currentPlaybackRate = actualRate;
        this.saveSettings();
      }
    }, 500); // 500msごとにチェック
  }
}
