import type { DownloadDescriptor, PanelStatus } from "@/types/movie-info-types";

const STATUS_MESSAGES: Record<PanelStatus, string> = {
  idle: "idle",
  loading: "loading",
  success: "success",
  error: "error",
};

export class PanelController {
  private readonly root: HTMLElement;
  private readonly statusEl: HTMLElement;
  private readonly summaryEl: HTMLElement;
  private readonly rawContainer: HTMLDetailsElement | null;
  private readonly jsonEl: HTMLPreElement | null;
  private readonly copyButton: HTMLButtonElement | null;
  private readonly downloadButton: HTMLButtonElement | null;
  private currentJson: string | null = null;
  private downloadDescriptor: DownloadDescriptor | null = null;

  constructor(root: HTMLElement) {
    this.root = root;
    const statusEl = root.querySelector('[data-role="status"]');
    const summaryEl = root.querySelector('[data-role="summary"]');

    if (!(statusEl instanceof HTMLElement)) {
      throw new Error("ステータス表示要素が見つかりません");
    }
    if (!(summaryEl instanceof HTMLElement)) {
      throw new Error("サマリー表示要素が見つかりません");
    }

    this.statusEl = statusEl;
    this.summaryEl = summaryEl;
    this.rawContainer = root.querySelector('[data-role="raw"]');
    this.jsonEl = root.querySelector('[data-role="json"]');
    this.copyButton = root.querySelector('button[data-role="copy"]');
    this.downloadButton = root.querySelector('button[data-role="download"]');

    if (this.copyButton) {
      this.copyButton.addEventListener("click", () => {
        void this.handleCopy();
      });
    }
    if (this.downloadButton) {
      this.downloadButton.addEventListener("click", () => {
        this.handleDownload();
      });
    }

    this.reset("未取得です");
  }

  public reset(message: string): void {
    this.setStatus("idle", message);
    this.setSummaryContent(null);
    this.setRawVisibility(false);
    this.currentJson = null;
    this.downloadDescriptor = null;
    if (this.copyButton) {
      this.copyButton.disabled = true;
    }
    if (this.downloadButton) {
      this.downloadButton.disabled = true;
    }
    if (this.jsonEl) {
      this.jsonEl.textContent = "";
    }
  }

  public setStatus(status: PanelStatus, message: string): void {
    this.statusEl.dataset.state = STATUS_MESSAGES[status];
    this.statusEl.textContent = message;
  }

  public setSummaryContent(content: HTMLElement | null): void {
    this.summaryEl.innerHTML = "";
    if (content) {
      this.summaryEl.appendChild(content);
    }
  }

  public setJsonData(data: unknown, pretty: boolean = true): void {
    if (!this.jsonEl) {
      return;
    }
    try {
      const jsonText = typeof data === "string" ? data : JSON.stringify(data, null, pretty ? 2 : undefined);
      this.currentJson = jsonText;
      this.jsonEl.textContent = jsonText;
      this.setRawVisibility(true);
      if (this.copyButton) {
        this.copyButton.disabled = false;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.jsonEl.textContent = "JSON変換に失敗しました";
      this.currentJson = null;
      if (this.copyButton) {
        this.copyButton.disabled = true;
      }
      window.logger?.warn?.("[movie-info] JSON stringify failed", message);
    }
  }

  public setDownloadDescriptor(descriptor: DownloadDescriptor | null): void {
    this.downloadDescriptor = descriptor;
    if (this.downloadButton) {
      this.downloadButton.disabled = descriptor == null;
    }
  }

  private setRawVisibility(visible: boolean): void {
    if (!this.rawContainer) {
      return;
    }
    if (visible) {
      this.rawContainer.removeAttribute("hidden");
    } else {
      this.rawContainer.setAttribute("hidden", "hidden");
      this.rawContainer.open = false;
    }
  }

  private async handleCopy(): Promise<void> {
    if (!this.currentJson) {
      return;
    }
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(this.currentJson);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = this.currentJson;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      if (window.toastr?.success) {
        window.toastr.success("JSONをクリップボードにコピーしました");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      window.logger?.warn?.("[movie-info] JSON copy failed", message);
      if (window.toastr?.error) {
        window.toastr.error("JSONコピーに失敗しました", message);
      }
    }
  }

  private handleDownload(): void {
    if (!this.downloadDescriptor) {
      return;
    }
    try {
      const payload = this.downloadDescriptor.payloadSupplier();
      const blob = new Blob([payload], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = this.downloadDescriptor.fileName;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
      if (window.toastr?.success) {
        window.toastr.success("JSONファイルをダウンロードしました");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      window.logger?.error?.("[movie-info] JSON download failed", message);
      if (window.toastr?.error) {
        window.toastr.error("JSONダウンロードに失敗しました", message);
      }
    }
  }
}
