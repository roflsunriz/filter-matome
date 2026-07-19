import type { PostedComment } from "@/video-player/core/comment-poster";

type CommandCategory = "size" | "position" | "color";

interface ColorCommand {
  command: string;
  color: string;
  premium?: boolean;
}

const SIZE_COMMANDS = [
  { command: "big", label: "大" },
  { command: "medium", label: "中" },
  { command: "small", label: "小" },
] as const;

const POSITION_COMMANDS = [
  { command: "ue", label: "上" },
  { command: "naka", label: "中" },
  { command: "shita", label: "下" },
] as const;

const COLOR_COMMANDS: ColorCommand[] = [
  { command: "white", color: "#ffffff" },
  { command: "red", color: "#ff0000" },
  { command: "pink", color: "#ff8080" },
  { command: "orange", color: "#ffc000" },
  { command: "yellow", color: "#ffff00" },
  { command: "green", color: "#00ff00" },
  { command: "cyan", color: "#00ffff" },
  { command: "blue", color: "#0000ff" },
  { command: "purple", color: "#c000ff" },
  { command: "black", color: "#000000" },
  { command: "white2", color: "#cccc99", premium: true },
  { command: "red2", color: "#cc0033", premium: true },
  { command: "pink2", color: "#ff33cc", premium: true },
  { command: "orange2", color: "#ff6600", premium: true },
  { command: "yellow2", color: "#999900", premium: true },
  { command: "green2", color: "#00cc66", premium: true },
  { command: "cyan2", color: "#00cccc", premium: true },
  { command: "blue2", color: "#3399ff", premium: true },
  { command: "purple2", color: "#6633cc", premium: true },
  { command: "black2", color: "#666666", premium: true },
];

export interface CommentPostFormValue {
  body: string;
  commands: string[];
}

export type CommentPostHandler = (
  value: CommentPostFormValue,
) => Promise<PostedComment>;

export class CommentPostForm extends HTMLElement {
  private readonly shadow: ShadowRoot;
  private submitHandler: CommentPostHandler | null = null;
  private eventController: AbortController | null = null;
  private isPosting = false;
  private premiumColorsEnabled = false;
  private selectedCommands: Partial<Record<CommandCategory, string>> = {};

  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: "open" });
    this.shadow.innerHTML = `
      <style>${this.getStyles()}</style>
      <form class="post-form">
        <div class="post-row post-row--comment">
          <div class="command-control">
            <button class="palette-toggle" type="button" aria-label="コメントコマンドパレット" aria-expanded="false" aria-controls="comment-command-palette">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3a9 9 0 0 0 0 18h1.2a1.8 1.8 0 0 0 1.45-2.86 1.8 1.8 0 0 1 1.45-2.86H18A3 3 0 0 0 21 12a9 9 0 0 0-9-9Zm-4.5 9.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Zm2-4.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Zm2 4.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Z"/></svg>
            </button>
            <input class="commands" type="text" aria-label="コメントコマンド" placeholder="コマンド未指定" autocomplete="off" readonly>
            <section id="comment-command-palette" class="command-palette" aria-label="コメントコマンドの選択" hidden>
              ${this.getCommandPaletteTemplate()}
            </section>
          </div>
          <div class="comment-control">
            <textarea class="comment" aria-label="投稿するコメント" placeholder="コメントを入力" maxlength="75" rows="1"></textarea>
            <span class="count" aria-hidden="true">0/75</span>
          </div>
          <button class="submit" type="submit">投稿</button>
        </div>
        <p class="status" role="status" aria-live="polite"></p>
      </form>
    `;
  }

  connectedCallback(): void {
    this.eventController?.abort();
    this.eventController = new AbortController();
    const signal = this.eventController.signal;
    const form = this.shadow.querySelector<HTMLFormElement>(".post-form");
    const comment = this.shadow.querySelector<HTMLTextAreaElement>(".comment");
    const paletteToggle =
      this.shadow.querySelector<HTMLButtonElement>(".palette-toggle");
    const commands = this.shadow.querySelector<HTMLInputElement>(".commands");

    form?.addEventListener(
      "submit",
      (event) => {
        event.preventDefault();
        void this.submit();
      },
      { signal },
    );
    comment?.addEventListener("input", () => this.updateCount(), { signal });
    comment?.addEventListener("focus", () => this.closePalette(), { signal });
    comment?.addEventListener(
      "keydown",
      (event) => {
        if (event.key === "Enter" && !event.shiftKey && !event.isComposing) {
          event.preventDefault();
          void this.submit();
        }
      },
      { signal },
    );
    paletteToggle?.addEventListener("click", () => this.togglePalette(), {
      signal,
    });
    commands?.addEventListener("focus", () => this.openPalette(), { signal });
    this.shadow
      .querySelectorAll<HTMLButtonElement>("[data-command-category]")
      .forEach((button) => {
        button.addEventListener(
          "click",
          () => {
            const category = button.dataset.commandCategory;
            const command = button.dataset.command;
            if (this.isCommandCategory(category) && command) {
              this.selectCommand(category, command);
            }
          },
          { signal },
        );
      });
    this.shadow
      .querySelector<HTMLButtonElement>(".command-reset")
      ?.addEventListener("click", () => this.resetCommands(), { signal });
    document.addEventListener(
      "pointerdown",
      (event) => {
        if (!event.composedPath().includes(this)) {
          this.closePalette();
        }
      },
      { signal },
    );
    this.addEventListener(
      "keydown",
      (event) => {
        if (event.key === "Escape") {
          this.closePalette();
          paletteToggle?.focus();
        }
      },
      { signal },
    );
    this.updatePremiumColors();
    this.updateCommandSelection();
    this.updateCount();
  }

  disconnectedCallback(): void {
    this.eventController?.abort();
    this.eventController = null;
  }

  setSubmitHandler(handler: CommentPostHandler): void {
    this.submitHandler = handler;
  }

  setPremiumColorsEnabled(enabled: boolean): void {
    this.premiumColorsEnabled = enabled;
    this.updatePremiumColors();
  }

  private async submit(): Promise<void> {
    if (this.isPosting || !this.submitHandler) {
      return;
    }

    const comment = this.shadow.querySelector<HTMLTextAreaElement>(".comment");
    const body = comment?.value ?? "";
    if (!body.trim()) {
      this.setStatus("投稿するコメントを入力してください。", true);
      comment?.focus();
      return;
    }

    this.setPosting(true);
    this.setStatus("投稿中...", false);
    try {
      await this.submitHandler({
        body,
        commands: this.getSelectedCommands(),
      });
      if (comment) {
        comment.value = "";
      }
      this.updateCount();
      this.setStatus("コメントを投稿しました。", false);
      comment?.focus();
    } catch (error) {
      this.setStatus(
        error instanceof Error
          ? error.message
          : "コメントの投稿に失敗しました。",
        true,
      );
    } finally {
      this.setPosting(false);
    }
  }

  private setPosting(isPosting: boolean): void {
    this.isPosting = isPosting;
    this.shadow
      .querySelectorAll<
        HTMLInputElement | HTMLTextAreaElement | HTMLButtonElement
      >("input, textarea, button")
      .forEach((element) => {
        element.disabled = isPosting;
      });
  }

  private updateCount(): void {
    const comment = this.shadow.querySelector<HTMLTextAreaElement>(".comment");
    const count = this.shadow.querySelector<HTMLElement>(".count");
    if (count) {
      count.textContent = `${String(comment?.value.length ?? 0)}/75`;
    }
  }

  private setStatus(message: string, isError: boolean): void {
    const status = this.shadow.querySelector<HTMLElement>(".status");
    if (!status) {
      return;
    }
    status.textContent = message;
    status.dataset.state = isError ? "error" : "info";
  }

  private getCommandPaletteTemplate(): string {
    const commandButtons = (
      category: CommandCategory,
      commands: ReadonlyArray<{ command: string; label: string }>,
    ): string =>
      commands
        .map(
          ({ command, label }) => `
            <button class="command-option command-option--text" type="button" data-command-category="${category}" data-command="${command}" aria-label="${command}" aria-pressed="false">
              ${label}
            </button>`,
        )
        .join("");

    const colors = COLOR_COMMANDS.map(
      ({ command, color, premium }) => `
        <button class="color-option" type="button" data-command-category="color" data-command="${command}" data-premium="${String(premium === true)}" aria-label="${command}" aria-pressed="false" title="${command}">
          <span class="color-swatch" style="--command-color: ${color}"></span>
        </button>`,
    ).join("");

    return `
      <div class="palette-section">
        <span class="palette-label">サイズ</span>
        <div class="command-options">${commandButtons("size", SIZE_COMMANDS)}</div>
      </div>
      <div class="palette-section">
        <span class="palette-label">位置</span>
        <div class="command-options">${commandButtons("position", POSITION_COMMANDS)}</div>
      </div>
      <div class="palette-section palette-section--colors">
        <span class="palette-label">カラー</span>
        <div class="color-options">${colors}</div>
      </div>
      <button class="command-reset" type="button">リセット</button>
    `;
  }

  private isCommandCategory(
    value: string | undefined,
  ): value is CommandCategory {
    return value === "size" || value === "position" || value === "color";
  }

  private selectCommand(category: CommandCategory, command: string): void {
    this.selectedCommands[category] = command;
    this.updateCommandSelection();
  }

  private resetCommands(): void {
    this.selectedCommands = {};
    this.updateCommandSelection();
  }

  private getSelectedCommands(): string[] {
    return [
      this.selectedCommands.size,
      this.selectedCommands.position,
      this.selectedCommands.color,
    ].filter((command): command is string => typeof command === "string");
  }

  private updateCommandSelection(): void {
    const commands = this.getSelectedCommands();
    const input = this.shadow.querySelector<HTMLInputElement>(".commands");
    if (input) {
      input.value = commands.join(" ");
    }
    this.shadow
      .querySelector<HTMLElement>(".command-control")
      ?.classList.toggle("has-commands", commands.length > 0);
    this.shadow
      .querySelectorAll<HTMLButtonElement>("[data-command-category]")
      .forEach((button) => {
        const category = button.dataset.commandCategory;
        button.setAttribute(
          "aria-pressed",
          String(
            this.isCommandCategory(category) &&
              this.selectedCommands[category] === button.dataset.command,
          ),
        );
      });
  }

  private updatePremiumColors(): void {
    this.shadow
      .querySelectorAll<HTMLButtonElement>('[data-premium="true"]')
      .forEach((button) => {
        button.hidden = !this.premiumColorsEnabled;
      });
    if (
      !this.premiumColorsEnabled &&
      COLOR_COMMANDS.some(
        ({ command, premium }) =>
          premium === true && command === this.selectedCommands.color,
      )
    ) {
      delete this.selectedCommands.color;
      this.updateCommandSelection();
    }
  }

  private togglePalette(): void {
    const palette = this.shadow.querySelector<HTMLElement>(".command-palette");
    const toggle =
      this.shadow.querySelector<HTMLButtonElement>(".palette-toggle");
    if (!palette || !toggle) {
      return;
    }
    if (palette.hidden) {
      this.openPalette();
      return;
    }
    this.closePalette();
  }

  private openPalette(): void {
    const palette = this.shadow.querySelector<HTMLElement>(".command-palette");
    const toggle =
      this.shadow.querySelector<HTMLButtonElement>(".palette-toggle");
    if (palette) {
      palette.hidden = false;
    }
    toggle?.setAttribute("aria-expanded", "true");
  }

  private closePalette(): void {
    const palette = this.shadow.querySelector<HTMLElement>(".command-palette");
    const toggle =
      this.shadow.querySelector<HTMLButtonElement>(".palette-toggle");
    if (palette) {
      palette.hidden = true;
    }
    toggle?.setAttribute("aria-expanded", "false");
  }

  private getStyles(): string {
    return `
      :host {
        display: block;
        flex: 0 0 auto;
        width: 100%;
        margin-top: 10px;
        color: #f5f7fa;
        font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }
      * { box-sizing: border-box; }
      .post-form { display: grid; gap: 6px; }
      .post-row { display: flex; align-items: center; gap: 8px; min-width: 0; }
      .post-row--comment { align-items: stretch; }
      .command-control { position: relative; display: flex; flex: 0 1 200px; min-width: 84px; height: 38px; }
      .command-control:not(.has-commands) { flex: 0 0 38px; min-width: 38px; }
      .comment-control { position: relative; display: flex; flex: 1 1 auto; min-width: 80px; }
      .palette-toggle {
        display: grid;
        flex: 0 0 34px;
        place-items: center;
        border: 0;
        border-radius: 6px 0 0 6px;
        background: #27303b;
        color: #72b0ff;
        cursor: pointer;
      }
      .palette-toggle:hover,
      .palette-toggle[aria-expanded="true"] { background: #354354; }
      .palette-toggle svg { width: 20px; height: 20px; fill: currentColor; }
      .command-control.has-commands .palette-toggle { display: none; }
      .commands,
      .comment {
        min-width: 0;
        border: 1px solid rgba(255, 255, 255, 0.18);
        border-radius: 6px;
        background: #11151b;
        color: #f5f7fa;
        font: inherit;
      }
      .commands { flex: 1 1 auto; height: 38px; padding: 4px 8px; border-left: 0; border-radius: 0 6px 6px 0; font-size: 12px; }
      .command-control:not(.has-commands) .commands { width: 0; padding: 0; border: 0; opacity: 0; pointer-events: none; }
      .command-control.has-commands .commands { border-left: 1px solid rgba(255, 255, 255, 0.18); border-radius: 6px; cursor: pointer; }
      .comment { flex: 1 1 auto; width: 100%; min-height: 38px; max-height: 84px; padding: 8px 46px 8px 10px; resize: vertical; }
      .commands:focus-visible,
      .comment:focus-visible,
      .submit:focus-visible { outline: 2px solid #72b0ff; outline-offset: 2px; }
      .count { position: absolute; right: 8px; bottom: 5px; color: #aeb8c5; font-size: 10px; font-variant-numeric: tabular-nums; pointer-events: none; }
      .submit {
        flex: 0 0 auto;
        min-width: 58px;
        border: 0;
        border-radius: 6px;
        background: #4f9cff;
        color: #fff;
        font: inherit;
        font-weight: 700;
        cursor: pointer;
      }
      .submit:hover { background: #72b0ff; }
      .submit:disabled,
      .commands:disabled,
      .comment:disabled { cursor: wait; opacity: 0.62; }
      .status { min-height: 1.3em; margin: 0; color: #aeb8c5; font-size: 11px; line-height: 1.3; }
      .status[data-state="error"] { color: #ff9a9a; }
      .command-palette {
        position: absolute;
        bottom: calc(100% + 8px);
        left: 0;
        z-index: 10;
        box-sizing: border-box;
        width: min(316px, calc(100vw - 48px));
        padding: 14px;
        border: 1px solid rgba(255, 255, 255, 0.16);
        border-radius: 8px;
        background: rgba(28, 33, 40, 0.98);
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.48);
      }
      .command-palette[hidden] { display: none; }
      .palette-section { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
      .palette-section + .palette-section { margin-top: 12px; }
      .palette-label { flex: 0 0 52px; font-size: 12px; font-weight: 700; }
      .command-options { display: flex; flex-wrap: wrap; gap: 6px; }
      .command-option {
        width: 52px;
        height: 32px;
        border: 1px solid rgba(255, 255, 255, 0.16);
        border-radius: 6px;
        background: #232a34;
        color: #dbe4ee;
        font: inherit;
        font-weight: 700;
        cursor: pointer;
      }
      .command-option[aria-pressed="true"] { border-color: #72b0ff; background: #17365b; color: #72b0ff; }
      .color-options { display: grid; grid-template-columns: repeat(10, 18px); gap: 4px; }
      .color-option {
        display: grid;
        width: 18px;
        height: 18px;
        padding: 0;
        place-items: center;
        border: 0;
        border-radius: 50%;
        background: transparent;
        cursor: pointer;
      }
      .color-option[hidden] { display: none; }
      .color-swatch {
        position: relative;
        box-sizing: border-box;
        width: 16px;
        height: 16px;
        border: 1px solid rgba(255, 255, 255, 0.45);
        border-radius: 50%;
        background: var(--command-color);
      }
      .color-option[aria-pressed="true"] .color-swatch::after {
        content: "";
        position: absolute;
        inset: 2px;
        border: 2px solid #fff;
        border-radius: 50%;
      }
      .color-option[data-command="white"][aria-pressed="true"] .color-swatch::after,
      .color-option[data-command="yellow"][aria-pressed="true"] .color-swatch::after { border-color: #111; }
      .command-reset {
        display: block;
        margin: 12px 0 0 auto;
        border: 0;
        background: transparent;
        color: #aeb8c5;
        font: inherit;
        font-size: 11px;
        cursor: pointer;
      }
      .command-reset:hover { color: #fff; text-decoration: underline; }
      @media (max-width: 480px) {
        .post-row--comment { gap: 5px; }
        .command-control.has-commands { flex-basis: 116px; min-width: 70px; }
        .palette-toggle { flex-basis: 32px; }
        .commands { padding-inline: 5px; font-size: 10px; }
        .submit { min-width: 50px; }
        .command-palette { width: min(316px, calc(100vw - 32px)); }
        .palette-section { align-items: flex-start; }
        .color-options { grid-template-columns: repeat(5, 18px); }
      }
    `;
  }
}

if (!customElements.get("comment-post-form")) {
  customElements.define("comment-post-form", CommentPostForm);
}
