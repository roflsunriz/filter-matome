import Danmaku from "danmaku";
import type { Comment } from "@/types/comment-types";

const TARGET_LANE_COUNT = 16;
const MIN_LANE_HEIGHT_PX = 10;
const MAX_LANE_HEIGHT_PX = 96;
const FALLBACK_CONTAINER_HEIGHT_PX = MIN_LANE_HEIGHT_PX * TARGET_LANE_COUNT;
const FONT_SCALE = 0.85;
const MIN_FONT_SIZE_PX = 8;
const MAX_FONT_SIZE_PX = 64;
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
    // 旧系danmaku互換: 一部実装は canvasStyle を参照
    canvasStyle?: CanvasStyle;
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
  // 初期描画時のフォント極小対策:レイアウト安定後の再計算キックを複数回
  private primeTimerIds: number[] = [];
  // ★ 追加: UI設定の保持(ページ存続中は維持)
  private userOpacity: number = 1;
  private userVisible: boolean = true;
  // ★ 追加: 再生成用に覚えておく
  private lastInitOptions: DanmakuConstructorOption | null = null; // Danmakuのコンストラクタオプション
  private sourceComments: Comment[] = []; // load/renderに使う生コメント
  private playerRoot: HTMLElement | null = null;
  private originalParent: HTMLElement | null = null; // danmakuLayerの元の親を保持
  private readonly canvasContextCtor =
    typeof CanvasRenderingContext2D !== "undefined"
      ? CanvasRenderingContext2D
      : undefined;
  private _onFsChange: (() => void) | undefined = undefined;

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
    
    // 全画面化のルートである .custom-player 直下にレイヤーを置く
    const playerRoot = this.container.querySelector(".custom-player");
    if (!playerRoot) {
      throw new Error(".custom-player要素が見つかりません。");
    }
    this.playerRoot = playerRoot as HTMLElement;
    if (window.getComputedStyle(this.playerRoot).position === "static") {
      this.playerRoot.style.position = "relative";
    }
    playerRoot.appendChild(danmakuLayer);
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

    // ★ 初期表示フォント極小対策：
    // レイアウト確定(rAF×2)後と、少し遅らせたタイミングでもう一度フォント/レーンを再計算
    this.primeInitialSizing();
    // videoのメタデータが入った直後にも再計算（naturalWidth/Height確定後）
    this.attachVideoSizingHooks();


    // 全画面切替の後はレイアウト確定を待ってから resize（rAF 2回）
    const onFsChange = (): void => {
      // レイアウト反映 → 次フレームで計測
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          this.recreateDanmaku(true);
        });
      });
    };
    document.addEventListener("fullscreenchange", onFsChange);
    // 破棄時に外すために WeakRef なしの簡易ハンドラを保存
    this._onFsChange = onFsChange;

    // 初期表示状態をlocalStorageから読み込む
    const savedVisibility = localStorage.getItem("commentVisible");
    if (savedVisibility !== null) {
      this.setVisibility(savedVisibility === "true");
    }

    // ★ 追加: 初期化時に渡されるDanmakuオプションを保持
    this.lastInitOptions = danmakuOptions;
  }

  // ★ 追加: 初期レイアウト安定後の再計算を段階的に実行
  private primeInitialSizing(): void {
    const kick = (): void => {
      this.updateLaneMetrics();
      this.danmaku?.resize();
      // ★ ユーザ設定を尊重して適用
      this.applyUserStyle();
    };
    // rAF×2 で直後の確定を1回
    requestAnimationFrame(() => requestAnimationFrame(kick));
    // さらに遅延で2回（CSS/フォント/動画レイアウトが遅れて反映されるケースに対応）
    this.primeTimerIds.push(window.setTimeout(kick, 100));
    this.primeTimerIds.push(window.setTimeout(kick, 300));
  }

  // ★ 追加: 動画メタデータ・サイズ変化時にも再計算
  private attachVideoSizingHooks(): void {
    const v = this.videoElement;
    if (!v) return;
    const onMeta = (): void => {
      // rAF×2 後に実寸で再計算
      requestAnimationFrame(() => requestAnimationFrame(() => {
        this.updateLaneMetrics();
        this.danmaku?.resize();
        // ★ ユーザ設定を再適用
        this.applyUserStyle();
      }));
    };
    v.addEventListener('loadedmetadata', onMeta, { once: true });
    // 一部ブラウザは動画のレイアウト確定がplaying直後になることがある
    v.addEventListener('playing', onMeta, { once: true });
    // ソース切替などに備えてリスナを保持（destroyで自動解除は不要：once指定）
  }

  // ★ 追加: ユーザ設定適用(再生成/初期確定のたびに呼ぶ)
  private applyUserStyle(): void {
    // 可視/不透明度
    try {
      this.setVisibility(this.userVisible);
    } catch (e) {
      window.logger.warn("setVisibilityの適用に失敗", e);
    }
    try {
      this.setOpacity(this.userOpacity);
    } catch (e) {
      window.logger.warn("setOpacityの適用に失敗", e);
    }
    // レイヤー側にも反映(保険)
    if (this.danmakuLayer) {
      this.danmakuLayer.style.opacity = String(this.userOpacity);
    }
  }

  // ★ 追加: 再生成ルーチン（最小・堅牢）
  private recreateDanmaku(preserveTime: boolean = true): void {
    const root = this.playerRoot ?? this.container ?? document.body;
    if (!root) return;

    // 現在のvideoを取り直す（フルスク中に差し替えられる対策）
    const currentVideo = document.querySelector("video");
    if (currentVideo) this.videoElement = currentVideo;

    const _time = preserveTime && this.videoElement ? this.videoElement.currentTime : 0;
    const playing = this.videoElement ? !this.videoElement.paused : false;

    // 旧インスタンス破棄
    try {
      this.danmaku?.destroy();
    } catch (e) {
      window.logger.warn("danmaku.destroy()でエラー", e);
    }
    this.danmaku = null;

    // レイヤー確保（なければ作る／あれば中身を空に）
    if (!this.danmakuLayer) {
      this.danmakuLayer = document.createElement("div");
      this.danmakuLayer.className = "danmaku-layer";
      this.danmakuLayer.style.position = "absolute";
      this.danmakuLayer.style.inset = "0";
      this.danmakuLayer.style.pointerEvents = "none";
      this.danmakuLayer.style.zIndex = "2";
      this.danmakuLayer.style.overflow = "hidden";
      root.appendChild(this.danmakuLayer);
    } else {
      this.danmakuLayer.innerHTML = ""; // ランタイムキャンバスを掃除
      if (this.danmakuLayer.parentElement !== root) {
        root.appendChild(this.danmakuLayer); // 最終子にして最前面へ
      }
    }

    // Danmakuインスタンスを再生成
    const opts = this.lastInitOptions ?? {};
    try {
      this.danmaku = new Danmaku({
        ...opts,
        container: this.danmakuLayer,
        media: this.videoElement ?? undefined, // nullの場合はundefinedに変換
        comments: [], // コメントは後から投入
      }) as DanmakuInstance;
    } catch (e) {
      window.logger.error("[recreateDanmaku] Danmakuの生成に失敗しました", e);
      return;
    }

    // レイアウト・DPR合わせ
    this.updateLaneMetrics();
    this.danmaku?.resize?.();
    // ★ 直後にユーザ設定を再適用
    this.applyUserStyle();

    // コメント再投入
    if (this.sourceComments.length > 0) {
      this.load(this.sourceComments);
    }

    // シーク＆（動画が再生中なら）再開
    try {
      this.danmaku?.seek?.();
    } catch (e) {
      window.logger.warn("danmaku.seek()でエラー", e);
    }
    if (playing) {
      try {
        this.danmaku?.play?.();
      } catch (e) {
        window.logger.warn("danmaku.play()でエラー", e);
      }
    }
  }

  private setupResizeObserver(): void {
    // フルスクリーンで実サイズが変わるのは playerRoot（.custom-player）
    const target =
      this.playerRoot ??
      (this.container?.querySelector(".custom-player") as HTMLElement | null) ??
      this.container;
    if (!target) return;

    this.resizeObserver?.disconnect();
    this.resizeObserver = new ResizeObserver(() => {
      this.updateLaneMetrics();
      this.danmaku?.resize();
    });
    this.resizeObserver.observe(target);
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
    this.sourceComments = Array.isArray(comments) ? comments : [];
    const laneHeight = this.getLaneHeight();
    const fontSize = this.calculateFontSize(laneHeight);

    this.comments = comments.map((c) => {
      const time = (c.vposMs ?? c.vpos * 10) / 1000;
      const color = c.color ?? this.defaultColor;
      const rawStyle = (c as { style?: unknown }).style;
      const inheritedStyle = this.extractCanvasStyle(rawStyle);
      const style = this.buildCommentStyle(
        color,
        laneHeight,
        fontSize,
        inheritedStyle,
      );
      const nextComment: DanmakuComment = {
        ...c,
        time,
        text: c.body,
        style,
        canvasStyle: style, // ← 旧API互換のため重複設定
      };
      return this.stripRuntimeArtifacts(nextComment);
    });

    this.renderComments();
  }

  setOpacity(opacity: number): void {
    const v = Math.max(0, Math.min(1, Number(opacity)));
    const clampedOpacity = Number.isFinite(v) ? v : 1;
    this.userOpacity = clampedOpacity;
    this.opacity = this.userOpacity; // 内部状態も同期
    if (this.danmakuLayer) {
      this.danmakuLayer.style.opacity = clampedOpacity.toString();
    }
  }

  setDefaultColor(color: string): void {
    this.defaultColor = color || "#ffffff";

    // スタイル再構築
    const laneHeight = this.getLaneHeight();
    const fontSize = this.calculateFontSize(laneHeight);
    this.comments = this.comments.map((c) => {
      const effectiveColor = c.color ?? this.defaultColor;
      const rawStyle = (c as { style?: unknown }).style;
      const inheritedStyle = this.extractCanvasStyle(rawStyle);
      const style = this.buildCommentStyle(
        effectiveColor,
        laneHeight,
        fontSize,
        inheritedStyle,
      );
      const updatedComment: DanmakuComment = {
        ...c,
        style,
        canvasStyle: style, // ← 旧API互換のため重複設定
      };
      return this.stripRuntimeArtifacts(updatedComment);
    });
    this.renderComments();
  }

  setVisibility(isVisible: boolean): void {
    this.userVisible = !!isVisible;
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
    this.resizeObserver = null;
    // 初期タイマを掃除
    for (const id of this.primeTimerIds) clearTimeout(id);
    this.primeTimerIds = [];
    this.danmaku?.destroy();

    // fullscreenchange 解除
    const h = this._onFsChange;
    if (h) {
      document.removeEventListener("fullscreenchange", h);
      this._onFsChange = undefined;
    }
    this.danmaku = null;
    this.danmakuLayer?.remove();
    this.danmakuLayer = null;
    this.videoElement = null;
    this.container = null;
    this.originalParent = null;
    this.playerRoot = null;
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

    // 既存fontがCSS変数等でパース不能→10pxに落ちる事故を避ける
    mergedStyle.font = `${fontSize}px ${DEFAULT_CANVAS_FONT_FAMILY}`;
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