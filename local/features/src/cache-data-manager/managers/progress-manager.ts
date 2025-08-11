export class ProgressManager {
  private bar: HTMLElement;
  private currentProgress: number = 0;

  constructor() {
    this.bar = document.createElement("div");
    this.bar.className = "global-progress";
    this.bar.style.display = "none";
    this.bar.innerHTML = `
      <div class="progress-bar">
        <div class="progress-fill"></div>
      </div>
      <span class="progress-text"></span>
    `;
    document.body.appendChild(this.bar);
  }

  public show(message: string, error?: boolean): void {
    this.bar.style.display = "flex";
    const textElement = this.bar.querySelector(".progress-text") as HTMLElement;
    if (textElement) {
      textElement.textContent = message;
    }
    
    if (error === true) {
      this.currentProgress = 100;
      this.updateFillWidth(true);
    } else {
      this.updateFillWidth();
    }
  }

  public updateProgress(current: number, total: number): void {
    this.currentProgress = (current / total) * 100;
    this.updateFillWidth();
  }

  private updateFillWidth(error?: boolean): void {
    const fill = this.bar.querySelector(".progress-fill") as HTMLElement;
    if (fill) {
      fill.style.width = `${this.currentProgress}%`;
      if (error) {
        fill.classList.add("error");
      }
    }
  }

  public hide(): void {
    this.bar.style.display = "none";
    this.currentProgress = 0;
    this.updateFillWidth();
  }
} 