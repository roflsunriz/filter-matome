export class ProgressService {
  private progressModal: HTMLElement;
  private progressPath: Element;
  private progressText!: Element;
  private progressStatus!: Element;

  constructor() {
    // 進捗モーダルの初期化
    const progressModalElement = document.getElementById("progressModal");
    if (!progressModalElement) {
      window.logger.error("進捗モーダルが見つかりません！");
      throw new Error("進捗モーダルが見つかりません");
    }
    this.progressModal = progressModalElement;

    const progressPathElement = this.progressModal.querySelector(".progress");
    if (!progressPathElement) {
      window.logger.error("進捗パスが見つかりません！");
      throw new Error("進捗パスが見つかりません");
    }
    this.progressPath = progressPathElement;

    const progressTextElement =
      this.progressModal.querySelector(".progress-text");
    if (!progressTextElement) {
      window.logger.error("進捗テキストが見つかりません！");
      throw new Error("進捗テキストが見つかりません");
    }
    this.progressText = progressTextElement;

    const progressStatusElement =
      this.progressModal.querySelector(".progress-status");
    if (!progressStatusElement) {
      window.logger.error("進捗ステータスが見つかりません！");
      throw new Error("進捗ステータスが見つかりません");
    }
    this.progressStatus = progressStatusElement;
  }

  updateProgress(current: number, total: number): void {
    const percentage = Math.round((current / total) * 100);
    const offset = 100 - percentage;

    const progressPath = this.progressModal.querySelector(
      ".progress",
    ) as SVGElement;
    if (progressPath) {
      progressPath.style.strokeDashoffset = offset.toString();
    }

    if (this.progressText) {
      this.progressText.textContent = `${percentage}%`;
    }

    if (this.progressStatus) {
      this.progressStatus.textContent = `${current} / ${total} 件の動画を処理中...`;
    }
  }

  showProgress(): void {
    if (!this.progressModal) {
      window.logger.error("進捗モーダルが初期化されていません！");
      return;
    }
    this.progressModal.style.display = "flex";
  }

  hideProgress(): void {
    if (!this.progressModal) {
      window.logger.error("進捗モーダルが初期化されていません！");
      return;
    }
    this.progressModal.style.display = "none";
    // 進捗表示をリセット
    this.updateProgress(0, 0);
  }

  // 更新所要時間の計算（分単位）
  calculateUpdateDuration(videoCount: number): number {
    const baseDelay = 200; // 1件あたりの待機時間（ミリ秒）
    const batchSize = 50; // バッチサイズ
    const batchDelay = 2000; // バッチ間の待機時間（ミリ秒）

    const batchCount = Math.ceil(videoCount / batchSize);
    const totalTime = videoCount * baseDelay + batchCount * batchDelay;

    return totalTime / (1000 * 60); // ミリ秒から分に変換
  }
}
