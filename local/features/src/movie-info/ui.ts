import type {
  DownloadDescriptor,
  ErrorModalDetails,
  PanelStatus,
} from "@/types/movie-info-types";

const STATUS_MESSAGES: Record<PanelStatus, string> = {
  idle: "idle",
  loading: "loading",
  success: "success",
  error: "error",
};

// モーダル管理クラス
class JsonModalManager {
  private static instance: JsonModalManager | null = null;
  private overlay: HTMLDivElement | null = null;
  private titleEl: HTMLHeadingElement | null = null;
  private jsonEl: HTMLPreElement | null = null;
  private closeButton: HTMLButtonElement | null = null;
  private previouslyFocused: HTMLElement | null = null;

  private constructor() {
    this.createModal();
  }

  public static getInstance(): JsonModalManager {
    if (!JsonModalManager.instance) {
      JsonModalManager.instance = new JsonModalManager();
    }
    return JsonModalManager.instance;
  }

  private createModal(): void {
    // オーバーレイ
    this.overlay = document.createElement("div");
    this.overlay.className = "json-modal-overlay";
    this.overlay.addEventListener("click", (e) => {
      if (e.target === this.overlay) {
        this.close();
      }
    });

    // モーダル本体
    const modal = document.createElement("div");
    modal.className = "json-modal";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-labelledby", "movie-info-json-modal-title");

    // ヘッダー
    const header = document.createElement("div");
    header.className = "json-modal-header";

    this.titleEl = document.createElement("h3");
    this.titleEl.id = "movie-info-json-modal-title";
    this.titleEl.textContent = "Raw JSON";

    const closeBtn = document.createElement("button");
    closeBtn.className = "json-modal-close";
    closeBtn.textContent = "×";
    closeBtn.setAttribute("aria-label", "閉じる");
    closeBtn.addEventListener("click", () => this.close());
    this.closeButton = closeBtn;

    header.appendChild(this.titleEl);
    header.appendChild(closeBtn);

    // ボディ
    const body = document.createElement("div");
    body.className = "json-modal-body";

    this.jsonEl = document.createElement("pre");
    this.jsonEl.className = "json-viewer";
    body.appendChild(this.jsonEl);

    modal.appendChild(header);
    modal.appendChild(body);
    this.overlay.appendChild(modal);
    this.overlay.setAttribute("aria-hidden", "true");
    document.body.appendChild(this.overlay);

    // Escキーで閉じる
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && this.overlay?.classList.contains("visible")) {
        this.close();
      }
    });
  }

  public open(title: string, jsonText: string): void {
    if (!this.overlay || !this.titleEl || !this.jsonEl) {
      return;
    }
    this.titleEl.textContent = title;
    this.jsonEl.textContent = jsonText;
    this.previouslyFocused =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    this.overlay.classList.add("visible");
    this.overlay.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    this.closeButton?.focus();
  }

  public close(): void {
    if (!this.overlay) {
      return;
    }
    this.overlay.classList.remove("visible");
    this.overlay.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    this.previouslyFocused?.focus();
    this.previouslyFocused = null;
  }
}

class ErrorModalManager {
  private static instance: ErrorModalManager | null = null;
  private overlay: HTMLDivElement | null = null;
  private titleEl: HTMLHeadingElement | null = null;
  private leadEl: HTMLParagraphElement | null = null;
  private videoIdEl: HTMLDivElement | null = null;
  private listEl: HTMLDivElement | null = null;
  private closeButton: HTMLButtonElement | null = null;
  private previouslyFocused: HTMLElement | null = null;

  private constructor() {
    this.createModal();
  }

  public static getInstance(): ErrorModalManager {
    if (!ErrorModalManager.instance) {
      ErrorModalManager.instance = new ErrorModalManager();
    }
    return ErrorModalManager.instance;
  }

  private createModal(): void {
    this.overlay = document.createElement("div");
    this.overlay.className = "error-modal-overlay";
    this.overlay.addEventListener("click", (event) => {
      if (event.target === this.overlay) {
        this.close();
      }
    });

    const modal = document.createElement("div");
    modal.className = "error-modal";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-labelledby", "movie-info-error-modal-title");

    const header = document.createElement("div");
    header.className = "error-modal-header";

    this.titleEl = document.createElement("h3");
    this.titleEl.id = "movie-info-error-modal-title";
    this.titleEl.textContent = "処理を完了できませんでした";

    const closeBtn = document.createElement("button");
    closeBtn.className = "error-modal-close";
    closeBtn.textContent = "×";
    closeBtn.setAttribute("aria-label", "閉じる");
    closeBtn.addEventListener("click", () => this.close());
    this.closeButton = closeBtn;

    header.appendChild(this.titleEl);
    header.appendChild(closeBtn);

    const body = document.createElement("div");
    body.className = "error-modal-body";

    this.leadEl = document.createElement("p");
    this.leadEl.className = "error-modal-lead";
    body.appendChild(this.leadEl);

    this.videoIdEl = document.createElement("div");
    this.videoIdEl.className = "error-modal-video-id";
    body.appendChild(this.videoIdEl);

    this.listEl = document.createElement("div");
    this.listEl.className = "error-modal-list";
    body.appendChild(this.listEl);

    const footer = document.createElement("div");
    footer.className = "error-modal-footer";
    const okButton = document.createElement("button");
    okButton.className = "error-modal-primary";
    okButton.textContent = "閉じる";
    okButton.addEventListener("click", () => this.close());
    footer.appendChild(okButton);

    modal.appendChild(header);
    modal.appendChild(body);
    modal.appendChild(footer);
    this.overlay.appendChild(modal);
    this.overlay.setAttribute("aria-hidden", "true");
    document.body.appendChild(this.overlay);

    document.addEventListener("keydown", (event) => {
      if (
        event.key === "Escape" &&
        this.overlay?.classList.contains("visible")
      ) {
        this.close();
      }
    });
  }

  public open(details: ErrorModalDetails): void {
    if (
      !this.overlay ||
      !this.titleEl ||
      !this.leadEl ||
      !this.videoIdEl ||
      !this.listEl
    ) {
      return;
    }

    this.titleEl.textContent = details.title;
    this.previouslyFocused =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    this.leadEl.textContent = details.lead;
    this.videoIdEl.textContent = details.videoId
      ? "対象動画ID: " + details.videoId
      : "";
    this.videoIdEl.hidden = !details.videoId;
    this.listEl.innerHTML = "";

    details.items.forEach((item) => {
      const entry = document.createElement("section");
      entry.className = "error-modal-item";

      const title = document.createElement("h4");
      title.textContent = item.label;
      entry.appendChild(title);

      const message = document.createElement("p");
      message.className = "error-modal-message";
      message.textContent = item.message;
      entry.appendChild(message);

      if (item.action) {
        const action = document.createElement("p");
        action.className = "error-modal-action";
        action.textContent = "確認ポイント: " + item.action;
        entry.appendChild(action);
      }

      this.listEl?.appendChild(entry);
    });

    this.overlay.classList.add("visible");
    this.overlay.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    this.closeButton?.focus();
  }

  public close(): void {
    if (!this.overlay) {
      return;
    }
    this.overlay.classList.remove("visible");
    this.overlay.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    this.previouslyFocused?.focus();
    this.previouslyFocused = null;
  }
}

export const showMovieInfoErrorModal = (details: ErrorModalDetails): void => {
  ErrorModalManager.getInstance().open(details);
};

export class PanelController {
  private readonly root: HTMLElement;
  private readonly statusEl: HTMLElement;
  private readonly summaryEl: HTMLElement;
  private readonly showJsonButton: HTMLButtonElement | null;
  private readonly copyButton: HTMLButtonElement | null;
  private readonly downloadButton: HTMLButtonElement | null;
  private readonly spinnerOverlay: HTMLElement | null;
  private readonly spinnerText: HTMLElement | null;
  private currentJson: string | null = null;
  private downloadDescriptor: DownloadDescriptor | null = null;
  private panelTitle: string = "Raw JSON";

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
    this.showJsonButton = root.querySelector('button[data-role="show-json"]');
    this.copyButton = root.querySelector('button[data-role="copy"]');
    this.downloadButton = root.querySelector('button[data-role="download"]');

    // スピナーオーバーレイを作成
    this.spinnerOverlay = this.createSpinnerOverlay();
    this.spinnerText = this.spinnerOverlay.querySelector(".panel-spinner-text");
    root.appendChild(this.spinnerOverlay);

    // パネルタイトルを取得
    const headerTitle = root.querySelector(".panel-header h2");
    if (headerTitle) {
      this.panelTitle = headerTitle.textContent ?? "Raw JSON";
    }

    if (this.showJsonButton) {
      this.showJsonButton.addEventListener("click", () => {
        this.openJsonModal();
      });
    }
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

  private createSpinnerOverlay(): HTMLElement {
    const overlay = document.createElement("div");
    overlay.className = "panel-spinner-overlay";

    const spinner = document.createElement("div");
    spinner.className = "panel-spinner";

    const text = document.createElement("div");
    text.className = "panel-spinner-text";
    text.textContent = "取得中...";

    overlay.appendChild(spinner);
    overlay.appendChild(text);
    return overlay;
  }

  public reset(message: string): void {
    this.setStatus("idle", message);
    this.setSummaryContent(null);
    this.setShowJsonButtonVisibility(false);
    this.setSpinnerVisible(false);
    this.currentJson = null;
    this.downloadDescriptor = null;
    if (this.copyButton) {
      this.copyButton.disabled = true;
    }
    if (this.downloadButton) {
      this.downloadButton.disabled = true;
    }
  }

  public setStatus(status: PanelStatus, message: string): void {
    this.statusEl.dataset["state"] = STATUS_MESSAGES[status];
    this.statusEl.textContent = message;

    // ローディング状態のときスピナーを表示
    if (status === "loading") {
      this.setSpinnerVisible(true, message);
    } else {
      this.setSpinnerVisible(false);
    }
  }

  public setSummaryContent(content: HTMLElement | null): void {
    this.summaryEl.innerHTML = "";
    if (content) {
      this.summaryEl.appendChild(content);
    }
  }

  public setJsonData(data: unknown, pretty: boolean = true): void {
    try {
      const jsonText =
        typeof data === "string"
          ? data
          : JSON.stringify(data, null, pretty ? 2 : undefined);
      this.currentJson = jsonText;
      this.setShowJsonButtonVisibility(true);
      if (this.copyButton) {
        this.copyButton.disabled = false;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.currentJson = null;
      this.setShowJsonButtonVisibility(false);
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

  private setShowJsonButtonVisibility(visible: boolean): void {
    if (!this.showJsonButton) {
      return;
    }
    if (visible) {
      this.showJsonButton.removeAttribute("hidden");
      this.showJsonButton.disabled = false;
    } else {
      this.showJsonButton.setAttribute("hidden", "hidden");
      this.showJsonButton.disabled = true;
    }
  }

  private setSpinnerVisible(visible: boolean, text?: string): void {
    if (!this.spinnerOverlay) {
      return;
    }
    if (visible) {
      if (this.spinnerText && text) {
        this.spinnerText.textContent = text;
      }
      this.spinnerOverlay.classList.add("visible");
    } else {
      this.spinnerOverlay.classList.remove("visible");
    }
  }

  private openJsonModal(): void {
    if (!this.currentJson) {
      return;
    }
    const modal = JsonModalManager.getInstance();
    modal.open(this.panelTitle + " - Raw JSON", this.currentJson);
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
