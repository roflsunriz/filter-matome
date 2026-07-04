interface SpeedHandlerLike {
  setPlaybackRate(params: { value: number }): void;
  adjustPlaybackRate(adjust: number): void;
}

export class SpeedTabController {
  constructor(
    private readonly root: ShadowRoot,
    private readonly speedHandler: SpeedHandlerLike | null,
    private readonly updateSpeedDisplay: () => void,
    private readonly setUpdateInterval: (
      interval: ReturnType<typeof setInterval>,
    ) => void,
  ) {}

  bind(): void {
    this.root.querySelectorAll("#speed .speed-preset").forEach((button) => {
      button.addEventListener("click", (e) => {
        const target = e.currentTarget as HTMLElement;
        const speed = parseFloat(target.dataset.speed || "1.0");
        this.speedHandler?.setPlaybackRate({ value: speed });
        this.updateSpeedDisplay();
      });
    });

    this.root.querySelectorAll("#speed .speed-adjust").forEach((button) => {
      button.addEventListener("click", (e) => {
        const target = e.currentTarget as HTMLElement;
        const adjust = parseFloat(target.dataset.adjust || "0");
        this.speedHandler?.adjustPlaybackRate(adjust);
        this.updateSpeedDisplay();
      });
    });

    const speedRange = this.root.querySelector<HTMLInputElement>(
      "#speed .speed-range",
    );
    speedRange?.addEventListener("input", (e) => {
      const speed = parseFloat((e.target as HTMLInputElement).value);
      this.speedHandler?.setPlaybackRate({ value: speed });
      this.updateSpeedDisplay();
    });

    this.setUpdateInterval(setInterval(this.updateSpeedDisplay, 1000));
  }
}
