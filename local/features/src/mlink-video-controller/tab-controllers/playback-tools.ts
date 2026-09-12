import {
  ABRepeatController,
  formatPlaybackTime,
  parsePlaybackTime,
} from "../services/ab-repeat";
import {
  getBufferedProgress,
  getOfficialBufferingApi,
  readOfficialBufferingState,
  type OfficialBufferingApi,
} from "../services/official-buffering-bridge";
import { getPlaybackToolsCopy } from "../playback-tools-copy";

export class PlaybackToolsController {
  readonly repeat = new ABRepeatController(() => this.renderRepeat());
  private readonly aborter = new AbortController();
  private readonly copy = getPlaybackToolsCopy(
    document.documentElement.lang || navigator.language,
  );
  private interval: ReturnType<typeof setInterval> | null = null;
  private video: HTMLVideoElement | null = null;
  private videoId = "";
  private ownedApi: OfficialBufferingApi | null = null;
  private readonly invalidPoints = new Set<string>();
  private bufferError = false;

  constructor(
    private readonly root: ShadowRoot,
    private readonly onRepeatEnabled: () => void,
  ) {}

  bind(): void {
    const tools = this.root.querySelector<HTMLElement>("[data-playback-tools]");
    if (!tools) return;
    tools.dir = /^(ar|ur)(-|$)/u.test(
      document.documentElement.lang || navigator.language,
    )
      ? "rtl"
      : "ltr";
    tools.querySelectorAll<HTMLElement>("[data-copy]").forEach((node) => {
      const key = node.dataset.copy as keyof typeof this.copy;
      node.textContent = this.copy[key] ?? "";
    });
    this.button("full-buffer")?.setAttribute(
      "aria-label",
      this.copy.bufferTitle,
    );
    this.root
      .querySelector("[data-buffer-progress]")
      ?.setAttribute("aria-label", this.copy.bufferIdle);
    const options = { signal: this.aborter.signal };
    this.button("full-buffer")?.addEventListener(
      "click",
      () => this.toggleBuffer(),
      options,
    );
    for (const point of ["a", "b"] as const) {
      this.button(`set-${point}`)?.addEventListener(
        "click",
        () => {
          this.sync();
          this.setPoint(point, this.video?.currentTime ?? null);
        },
        options,
      );
      this.input(point)?.addEventListener(
        "change",
        () => {
          this.setPoint(
            point,
            parsePlaybackTime(this.input(point)?.value ?? ""),
          );
        },
        options,
      );
    }
    this.button("ab-toggle")?.addEventListener(
      "click",
      () => {
        this.sync();
        if (this.repeat.setEnabled(!this.repeat.enabled))
          this.onRepeatEnabled();
      },
      options,
    );
    this.button("ab-clear")?.addEventListener(
      "click",
      () => {
        this.invalidPoints.clear();
        this.repeat.reset();
        this.renderPoints();
      },
      options,
    );
    window.addEventListener(
      "filter-matome:api-status-change",
      () => this.sync(),
      options,
    );
    this.sync();
    this.interval = setInterval(() => this.sync(), 250);
  }

  sync(): void {
    const watchId = location.pathname.match(/^\/watch\/([^/]+)/u)?.[1] ?? "";
    const id =
      watchId ||
      new URLSearchParams(location.search).get("videoId") ||
      location.pathname;
    if (id !== this.videoId) {
      this.stopBuffering();
      this.videoId = id;
      this.invalidPoints.clear();
      this.repeat.reset();
      this.renderPoints();
      this.bufferError = false;
    }
    const video = document.querySelector<HTMLVideoElement>(
      'video[data-name="video-content"], video#video-element',
    );
    if (this.video !== video) {
      this.video = video;
      this.repeat.bind(video);
    }
    const bufferPanel =
      this.root.querySelector<HTMLElement>("[data-full-buffer]");
    if (bufferPanel) bufferPanel.hidden = !watchId;
    if (watchId) this.renderBuffer();
    this.renderRepeat();
  }

  destroy(): void {
    this.aborter.abort();
    if (this.interval !== null) clearInterval(this.interval);
    this.interval = null;
    this.repeat.destroy();
    this.stopBuffering();
  }

  private button(action: string): HTMLButtonElement | null {
    return this.root.querySelector<HTMLButtonElement>(
      `[data-action="${action}"]`,
    );
  }

  private input(point: string): HTMLInputElement | null {
    return this.root.querySelector<HTMLInputElement>(`[data-point="${point}"]`);
  }

  private setPoint(point: "a" | "b", seconds: number | null): void {
    this.repeat.setEnabled(false);
    if (seconds === null || !this.repeat.setPoint(point, seconds)) {
      this.invalidPoints.add(point);
      this.input(point)?.setAttribute("aria-invalid", "true");
    } else {
      this.invalidPoints.delete(point);
      const input = this.input(point);
      if (input) {
        input.value = formatPlaybackTime(seconds);
        input.removeAttribute("aria-invalid");
      }
    }
    this.renderRepeat();
  }

  private renderPoints(): void {
    for (const point of ["a", "b"] as const) {
      const input = this.input(point);
      if (input) {
        input.value = formatPlaybackTime(this.repeat[point]);
        input.removeAttribute("aria-invalid");
      }
    }
  }

  private renderRepeat(): void {
    const toggle = this.button("ab-toggle");
    const invalid = this.invalidPoints.size > 0;
    if (toggle) {
      toggle.disabled = !this.repeat.valid || invalid;
      toggle.textContent = this.repeat.enabled
        ? this.copy.repeatStop
        : this.copy.repeatStart;
      toggle.setAttribute("aria-pressed", String(this.repeat.enabled));
    }
    const ready =
      this.video !== null &&
      Number.isFinite(this.video.duration) &&
      this.video.duration > 0;
    for (const action of ["set-a", "set-b"]) {
      const button = this.button(action);
      if (button) button.disabled = !ready;
    }
    const clear = this.button("ab-clear");
    if (clear)
      clear.disabled =
        this.repeat.a === null && this.repeat.b === null && !invalid;
    const status = this.root.querySelector<HTMLElement>("[data-ab-status]");
    if (!status) return;
    const badRange =
      this.repeat.a !== null && this.repeat.b !== null && !this.repeat.valid;
    status.dataset.error = String(invalid || badRange);
    this.text(
      status,
      invalid
        ? this.copy.invalidTime
        : badRange
          ? this.copy.invalidRange
          : this.repeat.enabled
            ? this.copy.repeating
            : this.repeat.valid
              ? this.copy.repeatReady
              : this.copy.repeatHint,
    );
  }

  private toggleBuffer(): void {
    const api = getOfficialBufferingApi(window);
    try {
      if (!api) throw new Error("Buffering API unavailable");
      const state = readOfficialBufferingState(api);
      if (state.videoId !== this.videoId)
        throw new Error("Video session changed");
      this.ownedApi = api;
      this.bufferError = false;
      api.setEnabled(!state.enabled);
    } catch (error) {
      this.bufferError = true;
      window.logger?.warn("[PlaybackTools] Full preload failed", error);
    }
    this.renderBuffer();
  }

  private stopBuffering(): void {
    const api = this.ownedApi;
    this.ownedApi = null;
    if (api) {
      try {
        if (readOfficialBufferingState(api).enabled) api.setEnabled(false);
      } catch (error) {
        window.logger?.warn("[PlaybackTools] Preload cleanup failed", error);
      }
    }
  }

  private renderBuffer(): void {
    const toggle = this.button("full-buffer");
    const status = this.root.querySelector<HTMLElement>("[data-buffer-status]");
    const progress = this.root.querySelector<HTMLProgressElement>(
      "[data-buffer-progress]",
    );
    if (!toggle || !status || !progress) return;
    const api = getOfficialBufferingApi(window);
    try {
      const state = api ? readOfficialBufferingState(api) : null;
      const matching = state?.videoId === this.videoId;
      const enabled = matching && state?.enabled === true;
      const video = this.video;
      const ready =
        video !== null && Number.isFinite(video.duration) && video.duration > 0;
      const buffered = video
        ? getBufferedProgress(video.buffered, video.duration)
        : { percent: 0, complete: false };
      progress.value = buffered.percent;
      toggle.disabled = !matching || !ready;
      toggle.textContent = enabled ? this.copy.stop : this.copy.start;
      toggle.setAttribute("aria-pressed", String(enabled));
      const error = matching ? state?.error : null;
      status.dataset.error = String(Boolean(error) || this.bufferError);
      const message =
        error === "buffer-limit"
          ? this.copy.bufferLimit
          : error || this.bufferError
            ? this.copy.loadError
            : !api
              ? this.copy.unavailable
              : !matching || !ready
                ? this.copy.waiting
                : `${buffered.complete ? this.copy.complete : enabled ? this.copy.buffering : this.copy.bufferIdle}: ${buffered.percent.toFixed(buffered.complete ? 0 : 1)}%`;
      this.text(status, message);
    } catch {
      toggle.disabled = true;
      toggle.setAttribute("aria-pressed", "false");
      this.text(status, this.copy.unavailable);
      status.dataset.error = "true";
    }
  }

  private text(element: HTMLElement, text: string): void {
    if (element.textContent !== text) element.textContent = text;
  }
}
