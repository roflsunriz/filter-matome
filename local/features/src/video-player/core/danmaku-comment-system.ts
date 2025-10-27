import Danmaku from "danmaku";
import type { Comment } from "@/types/comment-types";

const TARGET_LANE_COUNT = 16;
const MIN_LANE_HEIGHT_PX = 24;
const MAX_LANE_HEIGHT_PX = 96;
const FALLBACK_CONTAINER_HEIGHT_PX = MIN_LANE_HEIGHT_PX * TARGET_LANE_COUNT;
const FONT_SCALE = 0.75;
const MIN_FONT_SIZE_PX = 16;
const MAX_FONT_SIZE_PX = 56;
const DEFAULT_CANVAS_FONT_FAMILY =
  '"Noto Sans JP", "Hiragino Kaku Gothic ProN", "Yu Gothic UI", sans-serif';

type BaseDanmakuInstance = InstanceType<typeof Danmaku>;
type DanmakuConstructorOption = ConstructorParameters<typeof Danmaku>[0];
type DanmakuLibraryComment = Parameters<BaseDanmakuInstance["emit"]>[0];

type CanvasStringKey =
  | "font"
  | "fillStyle"
  | "strokeStyle"
  | "shadowColor"
  | "color"
  | "fontFamily"
  | "fontSize"
  | "fontStyle"
  | "fontVariant"
  | "fontWeight"
  | "lineHeight"
  | "textShadow"
  | "whiteSpace";

type CanvasNumberKey = "shadowBlur" | "lineWidth";

type CanvasStyle = Partial<Record<CanvasStringKey, string>> &
  Partial<Record<CanvasNumberKey, number>> & {
    textBaseline?: CanvasTextBaseline;
  };

const CANVAS_STYLE_STRING_KEYS: readonly CanvasStringKey[] = [
  "font",
  "fillStyle",
  "strokeStyle",
  "shadowColor",
  "color",
  "fontFamily",
  "fontSize",
  "fontStyle",
  "fontVariant",
  "fontWeight",
  "lineHeight",
  "textShadow",
  "whiteSpace",
];

const CANVAS_STYLE_NUMBER_KEYS: readonly CanvasNumberKey[] = [
  "shadowBlur",
  "lineWidth",
];

const VALID_TEXT_BASELINES = new Set<CanvasTextBaseline>([
  "top",
  "hanging",
  "middle",
  "alphabetic",
  "ideographic",
  "bottom",
]);

interface DanmakuInstance extends BaseDanmakuInstance {
  play(): BaseDanmakuInstance;
  pause(): BaseDanmakuInstance;
  seek(): BaseDanmakuInstance;
  comments: DanmakuLibraryComment[];
}

type DanmakuComment = Comment &
  DanmakuLibraryComment & {
    text: string;
    style?: CanvasStyle;
  };

export class DanmakuCommentSystem {
  private danmaku: DanmakuInstance | null = null;
  private videoElement: HTMLVideoElement | null = null;
  private container: HTMLElement | null = null;
  private danmakuLayer: HTMLDivElement | null = null;
  private comments: DanmakuComment[] = [];
  private defaultColor = "#ffffff";
  private opacity = 1.0;
  private isVisible = true;
  private resizeObserver: ResizeObserver | null = null;
  private laneHeightPx = 0;
  private readonly canvasContextCtor =
    typeof CanvasRenderingContext2D !== "undefined"
      ? CanvasRenderingContext2D
      : undefined;

  initialize(
    videoElement: HTMLVideoElement,
    container: HTMLElement,
  ): void {
    this.videoElement = videoElement;
    this.container = container;

    if (!this.videoElement || !this.container) {
      throw new Error("Video element or container not provided for Danmaku");
    }

    const danmakuLayer = document.createElement("div");
    danmakuLayer.className = "danmaku-layer";
    danmakuLayer.style.position = "absolute";
    danmakuLayer.style.top = "0";
    danmakuLayer.style.left = "0";
    danmakuLayer.style.width = "100%";
    danmakuLayer.style.height = "100%";
    danmakuLayer.style.pointerEvents = "none";
    danmakuLayer.style.overflow = "hidden";
    danmakuLayer.style.opacity = this.opacity.toString();
    danmakuLayer.style.zIndex = "2";

    if (window.getComputedStyle(this.container).position === "static") {
      this.container.style.position = "relative";
    }

    this.container.appendChild(danmakuLayer);
    this.danmakuLayer = danmakuLayer;

    const danmakuOptions: DanmakuConstructorOption = {
      container: danmakuLayer,
      media: this.videoElement,
      comments: [],
      engine: "canvas",
      // Danmakuライブラリはレーン数を直接指定できないため、
      // コメント高さと速度を調整して全体に均等に流れるようにする。
      speed: 180,
    };

    this.danmaku = new Danmaku(danmakuOptions) as DanmakuInstance;

    this.updateLaneMetrics();

    this.setupResizeObserver();

    // 初期表示状態をlocalStorageから読み込む
    const savedVisibility = localStorage.getItem("commentVisible");
    if (savedVisibility !== null) {
      this.setVisibility(savedVisibility === "true");
    }
  }

  private setupResizeObserver(): void {
    if (!this.container) return;

    this.resizeObserver = new ResizeObserver(() => {
      this.updateLaneMetrics();
      this.danmaku?.resize();
    });
    this.resizeObserver.observe(this.container);
  }

  private renderComments(): void {
    if (!this.danmaku) return;

    this.danmaku.clear();
    this.danmaku.comments.length = 0;

    for (const comment of this.comments) {
      this.danmaku.emit(comment);
    }
  }

  load(comments: Comment[]): void {
    const laneHeight = this.getLaneHeight();
    const fontSize = this.calculateFontSize(laneHeight);

    this.comments = comments.map((c) => {
      const time = (c.vposMs ?? c.vpos * 10) / 1000;
      const color = c.color ?? this.defaultColor;
      const rawStyle = (c as { style?: unknown }).style;
      const inheritedStyle = this.extractCanvasStyle(rawStyle);
      const nextComment: DanmakuComment = {
        ...c,
        time,
        text: c.body,
        style: this.buildCommentStyle(
          color,
          laneHeight,
          fontSize,
          inheritedStyle,
        ),
      };
      return this.stripRuntimeArtifacts(nextComment);
    });

    this.renderComments();
  }

  setOpacity(opacity: number): void {
    const clampedOpacity = Math.max(0, Math.min(1, opacity));
    this.opacity = clampedOpacity;
    if (this.danmakuLayer) {
      this.danmakuLayer.style.opacity = clampedOpacity.toString();
    }
  }

  setDefaultColor(color: string): void {
    this.defaultColor = color;
    const laneHeight = this.getLaneHeight();
    const fontSize = this.calculateFontSize(laneHeight);
    this.comments = this.comments.map((c) => {
      const effectiveColor = c.color ?? this.defaultColor;
      const rawStyle = (c as { style?: unknown }).style;
      const inheritedStyle = this.extractCanvasStyle(rawStyle);
      const updatedComment: DanmakuComment = {
        ...c,
        style: this.buildCommentStyle(
          effectiveColor,
          laneHeight,
          fontSize,
          inheritedStyle,
        ),
      };
      return this.stripRuntimeArtifacts(updatedComment);
    });
    this.renderComments();
  }

  setVisibility(isVisible: boolean): void {
    this.isVisible = isVisible;
    if (this.danmaku) {
      if (this.isVisible) {
        this.danmaku.show();
      } else {
        this.danmaku.hide();
      }
    }
  }

  toggleVisibility(): boolean {
    this.setVisibility(!this.isVisible);
    return this.isVisible;
  }

  getVisibility(): boolean {
    return this.isVisible;
  }

  resize(): void {
    this.danmaku?.resize();
  }

  play(): void {
    this.danmaku?.play();
  }

  pause(): void {
    this.danmaku?.pause();
  }

  seek(): void {
    this.danmaku?.seek();
  }

  destroy(): void {
    this.resizeObserver?.disconnect();
    this.danmaku?.destroy();
    this.danmaku = null;
    this.danmakuLayer?.remove();
    this.danmakuLayer = null;
    this.videoElement = null;
    this.container = null;
    this.comments = [];
  }

  private updateLaneMetrics(): void {
    if (!this.danmakuLayer && !this.container) {
      return;
    }

    const containerHeight =
      this.danmakuLayer?.clientHeight ??
      this.container?.clientHeight ??
      FALLBACK_CONTAINER_HEIGHT_PX;
    const nextLaneHeight = this.calculateLaneHeight(containerHeight);
    if (nextLaneHeight === this.laneHeightPx) {
      return;
    }

    this.laneHeightPx = nextLaneHeight;

    const fontSize = this.calculateFontSize(this.laneHeightPx);
    if (this.danmakuLayer) {
      this.danmakuLayer.style.setProperty(
        "--danmaku-lane-height",
        `${this.laneHeightPx}px`,
      );
      this.danmakuLayer.style.setProperty(
        "--danmaku-font-size",
        `${fontSize}px`,
      );
      this.danmakuLayer.style.fontSize = `${fontSize}px`;
      this.danmakuLayer.style.lineHeight = `${this.laneHeightPx}px`;
    }

    this.rebuildCommentStyles();
  }

  private calculateLaneHeight(containerHeight: number): number {
    if (!Number.isFinite(containerHeight) || containerHeight <= 0) {
      return MIN_LANE_HEIGHT_PX;
    }

    const rawLaneHeight = containerHeight / TARGET_LANE_COUNT;
    return Math.round(
      Math.min(
        MAX_LANE_HEIGHT_PX,
        Math.max(MIN_LANE_HEIGHT_PX, rawLaneHeight),
      ),
    );
  }

  private calculateFontSize(laneHeight: number): number {
    const scaled = laneHeight * FONT_SCALE;
    const candidate = Math.min(MAX_FONT_SIZE_PX, Math.max(MIN_FONT_SIZE_PX, scaled));
    return Math.round(candidate);
  }

  private getLaneHeight(): number {
    if (this.laneHeightPx <= 0) {
      this.updateLaneMetrics();
    }
    return this.laneHeightPx > 0 ? this.laneHeightPx : MIN_LANE_HEIGHT_PX;
  }

  private rebuildCommentStyles(): void {
    if (this.comments.length === 0) {
      return;
    }
    const laneHeight = this.getLaneHeight();
    const fontSize = this.calculateFontSize(laneHeight);
    this.comments = this.comments.map((comment) => {
      const color = comment.color ?? this.defaultColor;
      const rawStyle = (comment as { style?: unknown }).style;
      const inheritedStyle = this.extractCanvasStyle(rawStyle);
      const updatedComment: DanmakuComment = {
        ...comment,
        style: this.buildCommentStyle(
          color,
          laneHeight,
          fontSize,
          inheritedStyle,
        ),
      };
      return this.stripRuntimeArtifacts(updatedComment);
    });
    this.renderComments();
  }

  private buildCommentStyle(
    color: string,
    laneHeight: number,
    fontSize: number,
    existingStyle?: CanvasStyle,
  ): CanvasStyle {
    const font = this.composeFont(existingStyle?.font, fontSize);
    const textBaseline = this.pickTextBaseline(existingStyle?.textBaseline);

    const baseStyle: CanvasStyle = {
      font,
      fillStyle: color,
      shadowColor: "rgba(0, 0, 0, 0.7)",
      shadowBlur: Math.max(1, Math.round(laneHeight * 0.1)),
      lineWidth: existingStyle?.lineWidth ?? 2,
      textBaseline,
    };

    const mergedStyle: CanvasStyle = {
      ...baseStyle,
      ...existingStyle,
    };

    if (!mergedStyle.fillStyle) {
      mergedStyle.fillStyle = color;
    }

    mergedStyle.font = this.composeFont(mergedStyle.font, fontSize);
    mergedStyle.textBaseline = this.pickTextBaseline(mergedStyle.textBaseline);

    return mergedStyle;
  }

  private stripRuntimeArtifacts(comment: DanmakuComment): DanmakuComment {
    const cleaned = { ...comment } as DanmakuComment & Record<string, unknown>;
    Reflect.deleteProperty(cleaned, "node");
    Reflect.deleteProperty(cleaned, "canvas");
    return cleaned;
  }

  private extractCanvasStyle(style: unknown): CanvasStyle | undefined {
    if (!style || typeof style !== "object") {
      return undefined;
    }

    if (this.canvasContextCtor && style instanceof this.canvasContextCtor) {
      return this.cloneFromCanvasContext(style);
    }

    const canvasStyle: CanvasStyle = {};

    const recordStyle = style as Record<string, unknown>;

    for (const key of CANVAS_STYLE_STRING_KEYS) {
      const value = recordStyle[key];
      if (typeof value !== "string") continue;
      canvasStyle[key] = value;
    }

    for (const key of CANVAS_STYLE_NUMBER_KEYS) {
      const value = recordStyle[key];
      if (typeof value !== "number" || !Number.isFinite(value)) continue;
      canvasStyle[key] = value;
    }

    const textBaselineCandidate = this.pickTextBaseline(recordStyle.textBaseline);
    if (textBaselineCandidate) {
      canvasStyle.textBaseline = textBaselineCandidate;
    }

    if (
      typeof recordStyle.color === "string" &&
      typeof canvasStyle.fillStyle !== "string"
    ) {
      canvasStyle.fillStyle = recordStyle.color;
    }

    if (
      typeof recordStyle.fontSize === "string" ||
      typeof recordStyle.fontFamily === "string"
    ) {
      const fontSize = this.tryParsePixelValue(recordStyle.fontSize);
      const fontFamily =
        typeof recordStyle.fontFamily === "string"
          ? recordStyle.fontFamily
          : DEFAULT_CANVAS_FONT_FAMILY;
      if (fontSize !== null) {
        canvasStyle.font = `${fontSize}px ${fontFamily}`;
      }
    }

    return Object.keys(canvasStyle).length > 0 ? canvasStyle : undefined;
  }

  private composeFont(font: string | undefined, fontSize: number): string {
    if (!font || font.trim().length === 0) {
      return `${fontSize}px ${DEFAULT_CANVAS_FONT_FAMILY}`;
    }

    const trimmed = font.trim();
    const replaced = trimmed.replace(
      /\b\d+(?:\.\d+)?px\b/,
      `${fontSize}px`,
    );

    if (replaced !== trimmed) {
      return replaced;
    }

    return `${fontSize}px ${trimmed}`;
  }

  private pickTextBaseline(
    textBaseline: unknown,
  ): CanvasTextBaseline | undefined {
    if (typeof textBaseline !== "string") {
      return undefined;
    }
    const candidate = textBaseline as CanvasTextBaseline;
    if (VALID_TEXT_BASELINES.has(candidate)) {
      return candidate;
    }
    return undefined;
  }

  private tryParsePixelValue(value: unknown): number | null {
    if (typeof value !== "string") {
      return null;
    }
    const match = value.trim().match(/^(\d+(?:\.\d+)?)px$/);
    if (!match) {
      return null;
    }
    const parsed = Number(match[1]);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private cloneFromCanvasContext(ctx: CanvasRenderingContext2D): CanvasStyle {
    const cloned: CanvasStyle = {};

    if (typeof ctx.font === "string") {
      cloned.font = ctx.font;
    }

    if (typeof ctx.fillStyle === "string") {
      cloned.fillStyle = ctx.fillStyle;
    }

    if (typeof ctx.strokeStyle === "string") {
      cloned.strokeStyle = ctx.strokeStyle;
    }

    if (typeof ctx.shadowColor === "string") {
      cloned.shadowColor = ctx.shadowColor;
    }

    if (Number.isFinite(ctx.shadowBlur)) {
      cloned.shadowBlur = ctx.shadowBlur;
    }

    if (Number.isFinite(ctx.lineWidth)) {
      cloned.lineWidth = ctx.lineWidth;
    }

    if (typeof ctx.textBaseline === "string") {
      cloned.textBaseline = this.pickTextBaseline(ctx.textBaseline);
    }

    return cloned;
  }
}