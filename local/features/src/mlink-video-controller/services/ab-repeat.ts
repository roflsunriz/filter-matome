export function parsePlaybackTime(value: string): number | null {
  const text = value.trim();
  if (!/^(?:\d+:){0,2}\d+(?:\.\d{1,3})?$/u.test(text)) return null;
  const parts = text.split(":").map(Number);
  if (parts.slice(1).some((part) => part >= 60)) return null;
  const seconds = parts.reduce((sum, part) => sum * 60 + part, 0);
  return Number.isFinite(seconds) ? seconds : null;
}

export function formatPlaybackTime(seconds: number | null): string {
  if (seconds === null || !Number.isFinite(seconds)) return "";
  const millis = Math.round(seconds * 1000);
  const minutes = Math.floor(millis / 60000);
  return `${minutes}:${((millis % 60000) / 1000).toFixed(3).padStart(6, "0")}`;
}

export class ABRepeatController {
  a: number | null = null;
  b: number | null = null;
  enabled = false;
  private video: HTMLVideoElement | null = null;
  private aborter: AbortController | null = null;
  private frame: number | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(private readonly changed: () => void) {}

  get valid(): boolean {
    const duration = this.video?.duration;
    return (
      this.a !== null &&
      this.b !== null &&
      this.a >= 0 &&
      this.b - this.a >= 0.1 - 1e-9 &&
      duration !== undefined &&
      Number.isFinite(duration) &&
      this.b <= duration
    );
  }

  bind(video: HTMLVideoElement | null): void {
    if (video === this.video) return;
    this.stopMonitoring();
    this.aborter?.abort();
    this.video = video;
    if (video) {
      this.aborter = new AbortController();
      const options = { signal: this.aborter.signal };
      for (const event of ["timeupdate", "seeking", "play", "seeked"]) {
        video.addEventListener(event, this.enforce, options);
      }
      video.addEventListener("pause", () => this.stopMonitoring(), options);
      video.addEventListener(
        "ended",
        (event) => {
          if (this.enabled && this.valid && this.a !== null) {
            // 終端Bでも公式の次動画への自動遷移より先に、この区間を継続する。
            event.stopImmediatePropagation();
            video.currentTime = this.a;
            void video.play().catch(() => {
              this.setEnabled(false);
            });
          }
        },
        { ...options, capture: true },
      );
      video.addEventListener("emptied", () => this.setEnabled(false), options);
      video.addEventListener(
        "durationchange",
        () => {
          if (this.enabled && !this.valid) this.setEnabled(false);
          this.changed();
        },
        options,
      );
    }
    if (!video) this.enabled = false;
    this.enforce();
  }

  setPoint(point: "a" | "b", seconds: number): boolean {
    this.setEnabled(false);
    const duration = this.video?.duration;
    if (
      !Number.isFinite(seconds) ||
      seconds < 0 ||
      duration === undefined ||
      !Number.isFinite(duration) ||
      seconds > duration
    )
      return false;
    this[point] = seconds;
    this.changed();
    return true;
  }

  setEnabled(enabled: boolean): boolean {
    this.enabled = enabled && this.valid;
    if (
      this.enabled &&
      this.video &&
      this.a !== null &&
      this.b !== null &&
      (this.video.currentTime < this.a || this.video.currentTime >= this.b)
    )
      this.video.currentTime = this.a;
    if (!this.enabled) this.stopMonitoring();
    this.enforce();
    this.changed();
    return this.enabled;
  }

  reset(): void {
    this.enabled = false;
    this.a = null;
    this.b = null;
    this.stopMonitoring();
    this.changed();
  }

  destroy(): void {
    this.stopMonitoring();
    this.aborter?.abort();
    this.video = null;
    this.enabled = false;
  }

  private enforce = (): void => {
    const video = this.video;
    if (
      !this.enabled ||
      !this.valid ||
      !video ||
      video.paused ||
      this.a === null ||
      this.b === null
    )
      return;
    if (video.currentTime >= this.b || video.currentTime < this.a)
      video.currentTime = this.a;
    if (this.frame === null)
      this.frame = requestAnimationFrame(() => {
        this.frame = null;
        this.enforce();
      });
    // 非表示タブではrAFが止まるためtimeupdateに加えて監視する。
    if (this.timer === null) this.timer = setInterval(this.enforce, 50);
  };

  private stopMonitoring(): void {
    if (this.frame !== null) cancelAnimationFrame(this.frame);
    if (this.timer !== null) clearInterval(this.timer);
    this.frame = null;
    this.timer = null;
  }
}
