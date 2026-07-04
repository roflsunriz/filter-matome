interface VolumeHandlerLike {
  setVolume(params: { value: number; isLogarithmic?: boolean }): void;
}

export class VolumeTabController {
  constructor(
    private readonly root: ShadowRoot,
    private readonly volumeHandler: VolumeHandlerLike | null,
    private readonly updateVolumeDisplay: () => void,
    private readonly setUpdateInterval: (
      interval: ReturnType<typeof setInterval>,
    ) => void,
  ) {}

  bind(): void {
    this.root.querySelectorAll("#volume .volume-preset").forEach((button) => {
      button.addEventListener("click", (e) => {
        const target = e.target as HTMLElement;
        const volume = parseFloat(target.dataset.volume || "0.5");
        this.volumeHandler?.setVolume({ value: volume });
        this.updateVolumeDisplay();
      });
    });

    this.root
      .querySelectorAll("#volume .control-btn")
      .forEach((button, index) => {
        button.addEventListener("click", () => {
          switch (index) {
            case 0:
              this.volumeHandler?.setVolume({ value: 0 });
              break;
            case 1:
              this.volumeHandler?.setVolume({ value: 0.01 });
              break;
            case 2:
              this.volumeHandler?.setVolume({ value: 0.5 });
              break;
          }

          this.updateVolumeDisplay();
        });
      });

    const volumeRange = this.root.querySelector<HTMLInputElement>(
      "#volume .volume-range",
    );
    volumeRange?.addEventListener("input", (e) => {
      const value = parseFloat((e.target as HTMLInputElement).value);
      this.volumeHandler?.setVolume({ value, isLogarithmic: true });
      this.updateVolumeDisplay();
    });

    this.setUpdateInterval(setInterval(this.updateVolumeDisplay, 1000));
  }
}
