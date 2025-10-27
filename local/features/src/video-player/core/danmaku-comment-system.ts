import Danmaku from "danmaku";
import type { Comment, CommentData } from "@/types/comment-types";
import { CommentFetcher } from "@/video-player/core/comment-fetcher";

type BaseDanmakuInstance = InstanceType<typeof Danmaku>;
type DanmakuConstructorOption = ConstructorParameters<typeof Danmaku>[0];
type DanmakuLibraryComment = Parameters<BaseDanmakuInstance["emit"]>[0];

interface DanmakuInstance extends BaseDanmakuInstance {
  play(): BaseDanmakuInstance;
  pause(): BaseDanmakuInstance;
  seek(): BaseDanmakuInstance;
  comments: DanmakuLibraryComment[];
}

type DanmakuComment = Comment &
  DanmakuLibraryComment & {
    text: string;
    style?: Partial<CSSStyleDeclaration>;
  };

export class DanmakuCommentSystem {
  private danmaku: DanmakuInstance | null = null;
  private videoElement: HTMLVideoElement | null = null;
  private container: HTMLElement | null = null;
  private danmakuLayer: HTMLDivElement | null = null;
  private commentFetcher = new CommentFetcher();
  private comments: DanmakuComment[] = [];
  private ngWords: string[] = [];
  private ngRegex: RegExp[] = [];
  private defaultColor = "#ffffff";
  private opacity = 1.0;
  private isVisible = true;
  private resizeObserver: ResizeObserver | null = null;

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
      speed: 144,
    };

    this.danmaku = new Danmaku(danmakuOptions) as DanmakuInstance;

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
      this.danmaku?.resize();
    });
    this.resizeObserver.observe(this.container);
  }

  async loadComments(videoId: string): Promise<void> {
    try {
      const apiResponse = await this.commentFetcher.fetchAllComments(videoId);
      const rawComments: CommentData[] =
        apiResponse.data.threads[0]?.comments ?? [];

      // CommentFilter2との連携
      let processedComments: Comment[];
      if (window.CommentFilter?.filter?.processVideoPlayerComments) {
        // CommentFilter2はComment[]型を期待するため、一度変換する
        const commentsForFilter = rawComments.map((c) => ({
          ...c,
          vposMs: c.vposMs ?? c.vpos * 10, // vposMsを保証
        }));
        processedComments =
          await window.CommentFilter.filter.processVideoPlayerComments(
            commentsForFilter,
            videoId,
          );
      } else {
        processedComments = rawComments.map((c) => ({
          ...c,
          vposMs: c.vposMs ?? c.vpos * 10,
        }));
      }

      this.comments = processedComments.map((c) => {
        const time = (c.vposMs ?? c.vpos * 10) / 1000;
        const color = c.color ?? this.defaultColor;
        const style: Partial<CSSStyleDeclaration> = {
          color,
        };

        return {
          ...c,
          time,
          text: c.body,
          style,
        };
      });

      this.applyFilters();
    } catch (error) {
      window.logger.error("コメントの読み込みまたは処理に失敗しました", error);
      throw error;
    }
  }

  private applyFilters(): void {
    if (!this.danmaku) return;

    const filteredComments = this.comments.filter((comment) => {
      if (!comment.text) {
        return false;
      }
      const text = comment.text;
      if (this.ngWords.some((word) => text.includes(word))) {
        return false;
      }
      if (this.ngRegex.some((regex) => regex.test(text))) {
        return false;
      }
      return true;
    });

    this.danmaku.clear();
    this.danmaku.comments.length = 0;

    for (const comment of filteredComments) {
      this.danmaku.emit(comment);
    }
  }

  loadCommentsFromData(comments: Comment[]): void {
    this.comments = comments.map((c) => {
      const time = (c.vposMs ?? c.vpos * 10) / 1000;
      const color = c.color ?? this.defaultColor;
      const style: Partial<CSSStyleDeclaration> = {
        color,
      };

      return {
        ...c,
        time,
        text: c.body,
        style,
      };
    });

    this.applyFilters();
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
    this.comments = this.comments.map((c) => ({
      ...c,
      style: {
        ...c.style,
        color: c.color ?? this.defaultColor,
      },
    }));
    this.applyFilters();
  }

  setNGWords(words: string[]): void {
    this.ngWords = words;
    this.applyFilters();
  }

  setNGRegex(regexList: string[]): void {
    this.ngRegex = regexList.map((r) => {
      try {
        return new RegExp(r);
      } catch (error) {
        window.logger.warn(`無効なNG正規表現です: ${r}`);
        window.logger.debug("正規表現の解析に失敗しました", { pattern: r, error });
        // 無効な正規表現は無視する
        return new RegExp("a^"); // マッチしない正規表現
      }
    });
    this.applyFilters();
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
}