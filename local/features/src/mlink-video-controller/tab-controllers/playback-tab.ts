interface PlaybackHandlerLike {
  seekToPosition(position: number): void;
  seek(params: { seconds: number; direction: "forward" | "backward" }): void;
  togglePlayPause(): void;
}

export interface PlaybackTabCallbacks {
  startTimeUpdateInterval(): void;
  setupPlayStateListener(): void;
  updatePlayPauseButton(): void;
  toggleLoop(): void;
  updateLoopButtonAppearance(button: HTMLElement): void;
}

export class PlaybackTabController {
  constructor(
    private readonly root: ShadowRoot,
    private readonly playbackHandler: PlaybackHandlerLike | null,
    private readonly callbacks: PlaybackTabCallbacks,
  ) {}

  bind(): void {
    this.bindTracker();
    this.callbacks.startTimeUpdateInterval();
    this.bindSeekButtons();
    this.bindJumpButtons();
    this.bindControlButtons();
    this.callbacks.setupPlayStateListener();
  }

  private bindTracker(): void {
    const trackerRange = this.root.querySelector<HTMLInputElement>(
      "#playback .tracker-range",
    );
    trackerRange?.addEventListener("input", (e) => {
      const position = parseFloat((e.target as HTMLInputElement).value) / 100;
      this.playbackHandler?.seekToPosition(position);
    });
  }

  private bindSeekButtons(): void {
    this.root.querySelectorAll("[data-seek]").forEach((button) => {
      button.addEventListener("click", (e) => {
        const target = e.currentTarget as HTMLElement;
        const seekDirection = target.dataset.seek;
        const seekInput =
          this.root.querySelector<HTMLInputElement>(".seek-value");
        const seekValue = seekInput ? parseInt(seekInput.value) : 10;

        if (seekDirection === "+1") {
          this.playbackHandler?.seek({
            seconds: seekValue,
            direction: "forward",
          });
        } else if (seekDirection === "-1") {
          this.playbackHandler?.seek({
            seconds: seekValue,
            direction: "backward",
          });
        }
      });
    });
  }

  private bindJumpButtons(): void {
    this.root.querySelectorAll("[data-jump-seconds]").forEach((button) => {
      button.addEventListener("click", (e) => {
        const target = e.currentTarget as HTMLElement;
        const jumpSeconds = parseInt(target.dataset.jumpSeconds || "0");

        if (jumpSeconds > 0) {
          this.playbackHandler?.seek({
            seconds: jumpSeconds,
            direction: "forward",
          });
        } else {
          this.playbackHandler?.seek({
            seconds: Math.abs(jumpSeconds),
            direction: "backward",
          });
        }
      });
    });
  }

  private bindControlButtons(): void {
    this.root
      .querySelectorAll("#playback .control-btn")
      .forEach((button, index) => {
        button.addEventListener("click", () => {
          switch (index) {
            case 0:
              this.playbackHandler?.seek({
                seconds: 10,
                direction: "backward",
              });
              break;
            case 1:
              this.playbackHandler?.togglePlayPause();
              setTimeout(() => this.callbacks.updatePlayPauseButton(), 100);
              break;
            case 2:
              this.playbackHandler?.seek({ seconds: 10, direction: "forward" });
              break;
            case 3:
              this.callbacks.toggleLoop();
              this.callbacks.updateLoopButtonAppearance(button as HTMLElement);
              break;
          }
        });

        if (index === 3) {
          this.callbacks.updateLoopButtonAppearance(button as HTMLElement);
        }
      });
  }
}
