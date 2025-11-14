import {
  CommentRenderer,
  cloneDefaultSettings,
  type RendererSettings,
} from "comment-overlay";
import type { Comment } from "@/types/comment-types";

const OVERLAY_CLASS_NAME = "comment-overlay-layer";
const DEFAULT_COLOR = "#ffffff";
const MAX_OPACITY_PERCENT = 100;
const COLOR_COMMANDS = new Set([
  "white",
  "red",
  "pink",
  "orange",
  "yellow",
  "green",
  "cyan",
  "blue",
  "purple",
  "black",
  "white2",
  "red2",
  "pink2",
  "orange2",
  "yellow2",
  "green2",
  "cyan2",
  "blue2",
  "purple2",
  "black2",
]);

interface CommentOverlayRenderer {
  initialize(options: { video: HTMLVideoElement; container: HTMLElement }): void;
  destroy(): void;
  resize(): void;
  hardReset(): void;
  clearComments(): void;
  addComment(body: string, vposMs: number, commands?: string[]): unknown;
  updateSettings(settings: RendererSettings): void;
}

export class CommentOverlayCommentSystem {
  private renderer: CommentOverlayRenderer | null = null;
  private settings: RendererSettings = cloneDefaultSettings();
  private videoElement: HTMLVideoElement | null = null;
  private container: HTMLElement | null = null;
  private overlayLayer: HTMLDivElement | null = null;
  private comments: Comment[] = [];
  private userOpacity = 1;
  private userColor = DEFAULT_COLOR;
  private isVisible = true;

  initialize(
    videoElement: HTMLVideoElement,
    container: HTMLElement,
  ): void {
    this.destroy();

    this.videoElement = videoElement;
    this.container = container;

    const customPlayer = container.querySelector(".custom-player");
    const playerRoot =
      customPlayer instanceof HTMLElement ? customPlayer : container;

    if (window.getComputedStyle(playerRoot).position === "static") {
      playerRoot.style.position = "relative";
    }

    const overlayLayer = document.createElement("div");
    overlayLayer.className = OVERLAY_CLASS_NAME;
    overlayLayer.style.position = "absolute";
    overlayLayer.style.inset = "0";
    overlayLayer.style.pointerEvents = "none";
    overlayLayer.style.zIndex = "2";
    overlayLayer.style.overflow = "hidden";
    playerRoot.appendChild(overlayLayer);

    this.overlayLayer = overlayLayer;

    this.settings = {
      ...cloneDefaultSettings(),
      commentColor: this.userColor,
      commentOpacity: this.userOpacity,
      isCommentVisible: this.isVisible,
      useContainerResizeObserver: true,
    };

    const rendererInstance = new CommentRenderer(this.settings, {
      loggerNamespace: "StandaloneCommentOverlay",
    });
    this.renderer = rendererInstance as unknown as CommentOverlayRenderer;
    this.renderer.initialize({
      video: videoElement,
      container: overlayLayer,
    });

    if (this.comments.length > 0) {
      this.renderAllComments();
    }
  }

  load(comments: Comment[]): void {
    this.comments = Array.isArray(comments) ? [...comments] : [];
    this.renderAllComments();
  }

  setOpacity(opacity: number): void {
    const normalized =
      Number.isFinite(opacity) && opacity > 1
        ? Math.max(0, Math.min(MAX_OPACITY_PERCENT, opacity)) / 100
        : Math.max(0, Math.min(1, opacity));

    if (!Number.isFinite(normalized)) {
      return;
    }

    if (this.userOpacity === normalized) {
      return;
    }

    this.userOpacity = normalized;
    this.updateSettings({
      commentOpacity: this.userOpacity,
    });
  }

  setDefaultColor(color: string): void {
    const normalized = this.normalizeHexColor(color) ?? DEFAULT_COLOR;
    if (this.userColor === normalized) {
      return;
    }
    this.userColor = normalized;
    this.updateSettings({
      commentColor: this.userColor,
    });
  }

  setVisibility(isVisible: boolean): void {
    const nextVisible = Boolean(isVisible);
    if (this.isVisible === nextVisible) {
      return;
    }
    this.isVisible = nextVisible;
    this.updateSettings({
      isCommentVisible: this.isVisible,
    });
  }

  toggleVisibility(): boolean {
    this.setVisibility(!this.isVisible);
    return this.isVisible;
  }

  getVisibility(): boolean {
    return this.isVisible;
  }

  resize(): void {
    this.renderer?.resize();
  }

  /**
   * レンダラーをハードリセット（完全な再初期化）
   * リサイズ時などにアーティファクトが残る場合に使用
   */
  hardReset(): void {
    this.renderer?.hardReset();
  }

  destroy(): void {
    this.renderer?.destroy();
    this.renderer = null;
    this.overlayLayer?.remove();
    this.overlayLayer = null;
    this.videoElement = null;
    this.container = null;
  }

  private updateSettings(partial: Partial<RendererSettings>): void {
    this.settings = {
      ...this.settings,
      ...partial,
      ngWords: [...this.settings.ngWords],
      ngRegexps: [...this.settings.ngRegexps],
    };
    this.renderer?.updateSettings(this.settings);
  }

  private renderAllComments(): void {
    if (!this.renderer) {
      return;
    }
    this.renderer.clearComments();

    for (const comment of this.comments) {
      const vposMs = this.toVposMs(comment);
      const commands = this.collectCommands(comment);
      this.renderer.addComment(comment.body, vposMs, commands);
    }
  }

  private toVposMs(comment: Comment): number {
    const rawVposMs =
      typeof comment.vposMs === "number" && Number.isFinite(comment.vposMs)
        ? comment.vposMs
        : typeof comment.vpos === "number" && Number.isFinite(comment.vpos)
          ? comment.vpos * 10
          : Number.isFinite(Number(comment.vpos))
            ? Number(comment.vpos) * 10
            : null;

    if (rawVposMs === null || !Number.isFinite(rawVposMs)) {
      return 0;
    }

    const normalizedVposMs = Math.max(0, Math.round(rawVposMs));
    comment.vposMs = normalizedVposMs;
    return normalizedVposMs;
  }

  private collectCommands(comment: Comment): string[] {
    const rawCommands = Array.isArray(comment.commands)
      ? comment.commands.filter(
          (cmd): cmd is string => typeof cmd === "string" && cmd.length > 0,
        )
      : [];

    const commands = [...rawCommands];
    const hasColorCommand = commands.some((cmd) => this.isColorCommand(cmd));

    const normalizedColor = this.normalizeHexColor(comment.color);
    if (!hasColorCommand && normalizedColor) {
      commands.push(normalizedColor);
    }

    return commands;
  }

  private isColorCommand(command: string): boolean {
    const trimmed = command.trim();
    if (COLOR_COMMANDS.has(trimmed.toLowerCase())) {
      return true;
    }
    return /^#[0-9a-fA-F]{6}(?:[0-9a-fA-F]{2})?$/.test(trimmed);
  }

  private normalizeHexColor(color?: string | null): string | null {
    if (!color) {
      return null;
    }
    const trimmed = color.trim();
    if (/^#[0-9a-fA-F]{6}(?:[0-9a-fA-F]{2})?$/.test(trimmed)) {
      return trimmed.toUpperCase();
    }
    if (/^[0-9a-fA-F]{6}(?:[0-9a-fA-F]{2})?$/.test(trimmed)) {
      return `#${trimmed.toUpperCase()}`;
    }
    return null;
  }
}
