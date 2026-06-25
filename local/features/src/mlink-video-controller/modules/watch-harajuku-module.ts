import {
  ModuleConfig,
  ModuleInstance,
  ModuleStatus,
} from "@/types/module-types";
import { isWatchLikePage } from "@/mlink-video-controller/utils/page-detect";
import harajukuStyle from "./watch-harajuku-style.css?inline";

type ThemeName = "light" | "dark";
type BackgroundPriority = "color-scheme" | "background-image";
type MetaSourceLabel = "再生" | "コメント" | "マイリスト" | "投稿日時";

interface MetaItem {
  key: string;
  label: string;
  source: MetaSourceLabel;
}

interface StructuredVideoData {
  "@type"?: string;
  uploadDate?: string;
  commentCount?: number;
  interactionStatistic?: Array<{
    interactionType?: string;
    userInteractionCount?: number;
  }>;
}

const THEME_KEY = "harajuku-theme";
const BACKGROUND_PRIORITY_KEY = "harajuku-background-priority";
const STYLE_ID = "mlink-watch-harajuku-style";
const CHROME_CLASS = "HarajukuWatchChrome";

const SELECTORS = {
  sidebarPanel:
    'div[class*="grid-area_"][class*="sidebar"] > div > div:first-child',
  grid: 'section[class*="grid-template-areas"]',
  bottom:
    'section[class*="grid-template-areas"] > div[class*="grid-area_"][class*="bottom"]',
  detailList:
    'section[class*="grid-template-areas"] > div[class*="grid-area_"][class*="bottom"] > section:first-of-type dl',
  detailContent:
    'section[class*="grid-template-areas"] > div[class*="grid-area_"][class*="bottom"] > section:first-of-type > :not(header)',
  title:
    'section[class*="grid-template-areas"] > div[class*="grid-area_"][class*="bottom"] > div:first-child h1',
} as const;

const META_ITEMS: MetaItem[] = [
  { key: "views", label: "再生", source: "再生" },
  { key: "comments", label: "コメント", source: "コメント" },
  { key: "mylists", label: "マイリスト", source: "マイリスト" },
  { key: "postedAt", label: "投稿日時", source: "投稿日時" },
];

/**
 * ニコニコ動画 watch ページを原宿風レイアウトに寄せるビジュアルモジュール。
 */
export class WatchHarajukuModule implements ModuleInstance {
  public readonly config: ModuleConfig;

  private observer: MutationObserver | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private retryTimer: number | null = null;
  private scheduled = false;
  private _isActive = false;

  constructor(config: ModuleConfig) {
    this.config = config;
  }

  async initialize(): Promise<void> {
    if (this._isActive || !isWatchLikePage()) {
      return;
    }

    if (!document.body) {
      await new Promise<void>((resolve) => {
        document.addEventListener("DOMContentLoaded", () => resolve(), {
          once: true,
        });
      });
    }

    this.injectStyle();
    this.setTheme(this.getTheme());
    this.setBackgroundPriority(this.getBackgroundPriority());
    this.scheduleRender();
    this.startRetryTimer();
    this.startObserver();

    this._isActive = true;
  }

  destroy(): void {
    this.observer?.disconnect();
    this.observer = null;
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    window.removeEventListener("resize", this.scheduleRender);

    if (this.retryTimer !== null) {
      window.clearInterval(this.retryTimer);
      this.retryTimer = null;
    }

    document.getElementById(STYLE_ID)?.remove();
    document.querySelectorAll(`.${CHROME_CLASS}`).forEach((node) => {
      node.remove();
    });

    document.documentElement.removeAttribute("data-hy-theme");
    document.documentElement.removeAttribute("data-hy-background-priority");
    document.documentElement.style.removeProperty("--hy-detail-expanded-height");
    document.documentElement.style.removeProperty("--hy-watch-sidebar-panel-height");
    document.documentElement.style.colorScheme = "";

    this.scheduled = false;
    this._isActive = false;
  }

  isActive(): boolean {
    return this._isActive && isWatchLikePage();
  }

  getStatus(): ModuleStatus {
    if (!isWatchLikePage()) {
      return ModuleStatus.INACTIVE;
    }

    return this._isActive ? ModuleStatus.ACTIVE : ModuleStatus.INACTIVE;
  }

  onSPANavigate(): Promise<void> {
    if (!isWatchLikePage()) {
      this.destroy();
      return Promise.resolve();
    }

    document.querySelectorAll(`.${CHROME_CLASS}`).forEach((node) => {
      node.remove();
    });
    this.scheduleRender();
    this.startRetryTimer();
    return Promise.resolve();
  }

  private injectStyle(): void {
    if (document.getElementById(STYLE_ID)) {
      return;
    }

    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = harajukuStyle;
    document.head.appendChild(style);
  }

  private getTheme(): ThemeName {
    return localStorage.getItem(THEME_KEY) === "dark" ? "dark" : "light";
  }

  private getBackgroundPriority(): BackgroundPriority {
    return localStorage.getItem(BACKGROUND_PRIORITY_KEY) === "background-image"
      ? "background-image"
      : "color-scheme";
  }

  private setTheme(theme: ThemeName): void {
    const nextTheme: ThemeName = theme === "dark" ? "dark" : "light";
    localStorage.setItem(THEME_KEY, nextTheme);
    document.documentElement.dataset.hyTheme = nextTheme;
    document.documentElement.style.colorScheme = nextTheme;

    const button = document.querySelector<HTMLButtonElement>(
      ".HarajukuThemeButton",
    );
    if (!button) {
      return;
    }

    button.setAttribute(
      "aria-label",
      `${nextTheme === "dark" ? "Light" : "Dark"} theme`,
    );
    button.setAttribute("aria-pressed", nextTheme === "dark" ? "true" : "false");
    button.dataset.hyThemeButton = nextTheme;
  }

  private toggleTheme = (): void => {
    this.setTheme(this.getTheme() === "dark" ? "light" : "dark");
  };

  private setBackgroundPriority(priority: BackgroundPriority): void {
    const nextPriority: BackgroundPriority =
      priority === "background-image" ? "background-image" : "color-scheme";
    localStorage.setItem(BACKGROUND_PRIORITY_KEY, nextPriority);
    document.documentElement.dataset.hyBackgroundPriority = nextPriority;

    const button = document.querySelector<HTMLButtonElement>(
      ".HarajukuBackgroundPriorityButton",
    );
    if (!button) {
      return;
    }

    const isBackgroundPriority = nextPriority === "background-image";
    button.setAttribute(
      "aria-label",
      isBackgroundPriority ? "カラースキーム優先に切替" : "背景画像優先に切替",
    );
    button.setAttribute("aria-pressed", isBackgroundPriority ? "true" : "false");
    button.dataset.hyBackgroundPriorityButton = nextPriority;
  }

  private toggleBackgroundPriority = (): void => {
    this.setBackgroundPriority(
      this.getBackgroundPriority() === "background-image"
        ? "color-scheme"
        : "background-image",
    );
  };

  private textOf(element: Element | null | undefined): string {
    return (element?.textContent || "").replace(/\s+/g, " ").trim();
  }

  private readDetailMeta(): Partial<Record<MetaSourceLabel, string>> {
    const result: Partial<Record<MetaSourceLabel, string>> = {};
    const dl = document.querySelector(SELECTORS.detailList);
    if (!dl) {
      return result;
    }

    for (const item of Array.from(dl.children)) {
      const label = this.textOf(item.querySelector("dt"));
      const value = this.textOf(item.querySelector("dd"));
      if (this.isMetaSourceLabel(label) && value) {
        result[label] = value;
      }
    }

    return result;
  }

  private readStructuredMeta(): Partial<Record<MetaSourceLabel, string>> {
    const video = Array.from(
      document.querySelectorAll<HTMLScriptElement>(
        'script[type="application/ld+json"]',
      ),
    )
      .map((script) => this.parseStructuredVideoData(script.textContent))
      .find((data): data is StructuredVideoData => data?.["@type"] === "VideoObject");

    if (!video) {
      return {};
    }

    const stats = Array.isArray(video.interactionStatistic)
      ? video.interactionStatistic
      : [];
    const interactionCount = (type: string): number | undefined => {
      const item = stats.find((stat) =>
        String(stat.interactionType || "").includes(type),
      );
      return typeof item?.userInteractionCount === "number"
        ? item.userInteractionCount
        : undefined;
    };

    return {
      投稿日時: this.formatDateTime(video.uploadDate),
      再生: this.formatNumber(interactionCount("WatchAction")),
      コメント: this.formatNumber(video.commentCount),
      マイリスト: this.formatNumber(interactionCount("WantAction")),
    };
  }

  private readFallbackMeta(): Partial<Record<MetaSourceLabel, string>> {
    const result: Partial<Record<MetaSourceLabel, string>> = {};
    const infoRoot = document.querySelector(
      `${SELECTORS.bottom} > div:first-child > :first-child`,
    );
    const metaLine = infoRoot?.querySelector("div:has(> time[datetime])");
    const children = metaLine ? Array.from(metaLine.children) : [];
    const time = children.find((child) => child.matches("time[datetime]"));
    const counters = children.filter((child) => child.matches("div"));

    if (time) {
      result["投稿日時"] = this.textOf(time);
    }
    if (counters[0]) {
      result["再生"] = this.textOf(counters[0]);
    }
    if (counters[1]) {
      result["コメント"] = this.textOf(counters[1]);
    }

    return result;
  }

  private currentMeta(): Partial<Record<MetaSourceLabel, string>> {
    const result: Partial<Record<MetaSourceLabel, string>> = {};
    for (const source of [
      this.readFallbackMeta(),
      this.readDetailMeta(),
      this.readStructuredMeta(),
    ]) {
      for (const [key, value] of Object.entries(source)) {
        if (this.isMetaSourceLabel(key) && value) {
          result[key] = value;
        }
      }
    }
    return result;
  }

  private parseStructuredVideoData(
    value: string | null,
  ): StructuredVideoData | undefined {
    if (!value) {
      return undefined;
    }

    try {
      const parsed: unknown = JSON.parse(value);
      return this.isStructuredVideoData(parsed) ? parsed : undefined;
    } catch {
      return undefined;
    }
  }

  private isStructuredVideoData(value: unknown): value is StructuredVideoData {
    return typeof value === "object" && value !== null;
  }

  private isMetaSourceLabel(value: string): value is MetaSourceLabel {
    return value === "再生" || value === "コメント" || value === "マイリスト" || value === "投稿日時";
  }

  private formatNumber(value: number | undefined): string | undefined {
    if (typeof value !== "number" || !Number.isFinite(value)) {
      return undefined;
    }
    return value.toLocaleString("ja-JP");
  }

  private formatDateTime(value: string | undefined): string | undefined {
    if (!value) {
      return undefined;
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return undefined;
    }

    return new Intl.DateTimeFormat("ja-JP", {
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(date);
  }

  private createThemeButton(): HTMLButtonElement {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "HarajukuThemeButton";
    button.addEventListener("click", this.toggleTheme);

    const sun = document.createElement("span");
    sun.className = "HarajukuThemeButton-sun";
    sun.setAttribute("aria-hidden", "true");
    sun.textContent = "☀";

    const knob = document.createElement("span");
    knob.className = "HarajukuThemeButton-knob";
    knob.setAttribute("aria-hidden", "true");

    const moon = document.createElement("span");
    moon.className = "HarajukuThemeButton-moon";
    moon.setAttribute("aria-hidden", "true");
    moon.textContent = "☾";

    button.append(sun, knob, moon);
    return button;
  }

  private createBackgroundPriorityButton(): HTMLButtonElement {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "HarajukuBackgroundPriorityButton";
    button.addEventListener("click", this.toggleBackgroundPriority);

    const colorSchemeIcon = document.createElement("span");
    colorSchemeIcon.className =
      "HarajukuBackgroundPriorityButton-colorSchemeIcon";
    colorSchemeIcon.setAttribute("aria-hidden", "true");

    const knob = document.createElement("span");
    knob.className = "HarajukuBackgroundPriorityButton-knob";
    knob.setAttribute("aria-hidden", "true");

    const backgroundIcon = document.createElement("span");
    backgroundIcon.className =
      "HarajukuBackgroundPriorityButton-backgroundIcon";
    backgroundIcon.setAttribute("aria-hidden", "true");

    button.append(colorSchemeIcon, knob, backgroundIcon);
    return button;
  }

  private makeStatItem(label: string, key: string): HTMLDivElement {
    const node = document.createElement("div");
    node.className = key === "postedAt" ? "HarajukuStats-date" : "HarajukuStats-row";
    node.dataset.hyKey = key;

    const labelNode = document.createElement("span");
    labelNode.className = "HarajukuStats-label";
    labelNode.textContent = label;

    const valueNode = document.createElement("span");
    valueNode.className = "HarajukuStats-value";
    valueNode.textContent = "-";

    node.append(labelNode, valueNode);
    return node;
  }

  private createChrome(): HTMLDivElement {
    const chrome = document.createElement("div");
    chrome.className = CHROME_CLASS;

    const stats = document.createElement("div");
    stats.className = "HarajukuStats";
    for (const item of META_ITEMS) {
      stats.append(this.makeStatItem(item.label, item.key));
    }

    chrome.append(
      stats,
      this.createBackgroundPriorityButton(),
      this.createThemeButton(),
    );
    return chrome;
  }

  private ensureChrome(): HTMLDivElement | undefined {
    const sidebar = document.querySelector(SELECTORS.sidebarPanel);
    if (!sidebar) {
      return undefined;
    }

    let chrome = sidebar.querySelector<HTMLDivElement>(`:scope > .${CHROME_CLASS}`);
    if (!chrome) {
      chrome = this.createChrome();
      sidebar.prepend(chrome);
    } else if (!chrome.querySelector(".HarajukuBackgroundPriorityButton")) {
      chrome.append(this.createBackgroundPriorityButton());
    }

    this.setTheme(this.getTheme());
    this.setBackgroundPriority(this.getBackgroundPriority());
    return chrome;
  }

  private renderChrome(): boolean {
    this.updateLayoutMetrics();

    const chrome = this.ensureChrome();
    if (!chrome) {
      return false;
    }

    const values = this.currentMeta();
    const signature = META_ITEMS.map((item) => values[item.source] || "-").join(
      "\n",
    );
    if (chrome.dataset.hySignature === signature) {
      return true;
    }
    chrome.dataset.hySignature = signature;

    for (const item of META_ITEMS) {
      const value = chrome.querySelector(
        `.HarajukuStats [data-hy-key="${item.key}"] .HarajukuStats-value`,
      );
      if (value) {
        value.textContent = values[item.source] || "-";
      }
    }

    return true;
  }

  private px(value: number): string {
    return `${Math.max(0, Math.round(value))}px`;
  }

  private updateLayoutMetrics(): void {
    const root = document.documentElement;
    const grid = document.querySelector<HTMLElement>(SELECTORS.grid);
    const title = document.querySelector<HTMLElement>(SELECTORS.title);
    const sidebar = document.querySelector<HTMLElement>(SELECTORS.sidebarPanel);
    const detailContent = document.querySelector<HTMLElement>(
      SELECTORS.detailContent,
    );

    if (detailContent?.getAttribute("aria-hidden") === "false") {
      const previousHeight = detailContent.style.height;
      const previousMinHeight = detailContent.style.minHeight;
      const previousMaxHeight = detailContent.style.maxHeight;
      const previousHeightPriority =
        detailContent.style.getPropertyPriority("height");
      const previousMinHeightPriority =
        detailContent.style.getPropertyPriority("min-height");
      const previousMaxHeightPriority =
        detailContent.style.getPropertyPriority("max-height");
      detailContent.style.setProperty("height", "auto", "important");
      detailContent.style.setProperty("min-height", "0", "important");
      detailContent.style.setProperty("max-height", "none", "important");

      const detailRect = detailContent.getBoundingClientRect();
      const borderHeight = detailRect.height - detailContent.clientHeight;
      const nextDetailHeight = Math.max(
        detailContent.scrollHeight + Math.max(0, borderHeight),
        detailRect.height,
      );

      detailContent.style.setProperty(
        "height",
        previousHeight,
        previousHeightPriority,
      );
      detailContent.style.setProperty(
        "min-height",
        previousMinHeight,
        previousMinHeightPriority,
      );
      detailContent.style.setProperty(
        "max-height",
        previousMaxHeight,
        previousMaxHeightPriority,
      );

      root.style.setProperty(
        "--hy-detail-expanded-height",
        this.px(nextDetailHeight),
      );
    }

    if (title && sidebar) {
      const titleTop = title.getBoundingClientRect().top;
      const sidebarBottom = sidebar.getBoundingClientRect().bottom;
      root.style.setProperty(
        "--hy-watch-sidebar-panel-height",
        this.px(sidebarBottom - titleTop),
      );
    }

    this.observeLayoutTargets([grid, title, sidebar, detailContent]);
  }

  private observeLayoutTargets(targets: Array<Element | null | undefined>): void {
    if (!("ResizeObserver" in window)) {
      return;
    }

    if (!this.resizeObserver) {
      this.resizeObserver = new ResizeObserver(this.scheduleRender);
    }

    for (const target of targets) {
      if (target) {
        this.resizeObserver.observe(target);
      }
    }
  }

  private scheduleRender = (): void => {
    if (this.scheduled) {
      return;
    }

    this.scheduled = true;
    requestAnimationFrame(() => {
      this.scheduled = false;
      this.renderChrome();
    });
  };

  private startRetryTimer(): void {
    if (this.retryTimer !== null) {
      window.clearInterval(this.retryTimer);
    }

    let retryCount = 0;
    this.retryTimer = window.setInterval(() => {
      retryCount += 1;
      this.scheduleRender();
      const meta = this.currentMeta();
      if (
        retryCount >= 40 ||
        (meta["再生"] && meta["コメント"] && meta["マイリスト"] && meta["投稿日時"])
      ) {
        if (this.retryTimer !== null) {
          window.clearInterval(this.retryTimer);
          this.retryTimer = null;
        }
      }
    }, 500);
  }

  private startObserver(): void {
    this.observer?.disconnect();

    this.observer = new MutationObserver(this.scheduleRender);
    this.observer.observe(document.body, {
      attributes: true,
      childList: true,
      subtree: true,
      characterData: true,
    });

    window.addEventListener("resize", this.scheduleRender);
  }
}
