import {
  ModuleConfig,
  ModuleInstance,
  ModuleStatus,
  PageType,
  ModuleCategory,
} from "@/types/module-types";
import { isWatchLikePage } from "@/mlink-video-controller/utils/page-detect";
import { HarajukuMetadataReader, META_ITEMS } from "./harajuku-metadata";
import { createMaterialIcon } from "@/common/material-icons";
import harajukuBaseStyle from "./watch-harajuku-style-1.css" with { type: "text" };
import harajukuChromeStyle from "./watch-harajuku-style-2.css" with { type: "text" };
import harajukuThemeStyle from "./watch-harajuku-style-3.css" with { type: "text" };
import harajukuCompatibilityStyle from "./watch-harajuku-style-4.css" with { type: "text" };

const harajukuStyle = [
  harajukuBaseStyle,
  harajukuChromeStyle,
  harajukuThemeStyle,
  harajukuCompatibilityStyle,
].join("\n");

export const watchHarajukuModuleConfig: ModuleConfig = {
  id: "watch_harajuku",
  name: "原宿風Watch",
  description: "動画視聴ページをニコニコ動画（原宿）風の表示に変更します",
  enabled: false,
  targetPages: [PageType.WATCH],
  dependencies: [],
  category: ModuleCategory.VISUAL,
  icon: createMaterialIcon("palette", {
    style: "outlined",
    color: "white",
  }),
};

type ThemeName = "light" | "dark";
type BackgroundPriority = "color-scheme" | "background-image";

interface OwnerMetadata {
  name: string;
  profileHref: string;
  videoHref: string;
  iconSrc: string;
  iconAlt: string;
  followAction: HTMLElement | null;
  supportAction: HTMLAnchorElement | null;
  menuAction: HTMLButtonElement | null;
}

type OwnerApiMetadata = Omit<
  OwnerMetadata,
  "followAction" | "supportAction" | "menuAction"
>;

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
  private ownerApiMetadata: OwnerApiMetadata | null = null;
  private readonly metadataReader = new HarajukuMetadataReader(
    SELECTORS.detailList,
    SELECTORS.bottom,
  );

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
    await this.loadOwnerApiMetadata();
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
    document.querySelectorAll(".HarajukuOwner").forEach((node) => {
      node.remove();
    });

    document.documentElement.removeAttribute("data-hy-theme");
    document.documentElement.removeAttribute("data-hy-background-priority");
    document.documentElement.style.removeProperty(
      "--hy-detail-expanded-height",
    );
    document.documentElement.style.removeProperty(
      "--hy-watch-sidebar-panel-height",
    );
    document.documentElement.style.colorScheme = "";

    this.scheduled = false;
    this.ownerApiMetadata = null;
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

  async onSPANavigate(): Promise<void> {
    if (!isWatchLikePage()) {
      this.destroy();
      return;
    }

    document.querySelectorAll(`.${CHROME_CLASS}`).forEach((node) => {
      node.remove();
    });
    document.querySelectorAll(".HarajukuOwner").forEach((node) => {
      node.remove();
    });
    await this.loadOwnerApiMetadata();
    this.scheduleRender();
    this.startRetryTimer();
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
    button.setAttribute(
      "aria-pressed",
      nextTheme === "dark" ? "true" : "false",
    );
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
    button.setAttribute(
      "aria-pressed",
      isBackgroundPriority ? "true" : "false",
    );
    button.dataset.hyBackgroundPriorityButton = nextPriority;
  }

  private toggleBackgroundPriority = (): void => {
    this.setBackgroundPriority(
      this.getBackgroundPriority() === "background-image"
        ? "color-scheme"
        : "background-image",
    );
  };

  private readOwnerMetadata(): OwnerMetadata | undefined {
    if (!this.ownerApiMetadata) {
      return undefined;
    }

    const followAction = document.querySelector<HTMLElement>(
      '[data-element-name="follow_user"]',
    );
    const supportAction = document.querySelector<HTMLAnchorElement>(
      'a[data-element-name="creator_support"]',
    );
    const menuAction = document.querySelector<HTMLButtonElement>(
      `${SELECTORS.detailContent} button[data-scope="menu"][data-part="trigger"]`,
    );

    return {
      ...this.ownerApiMetadata,
      followAction,
      supportAction,
      menuAction,
    };
  }

  private async loadOwnerApiMetadata(): Promise<void> {
    this.ownerApiMetadata = null;
    const requestedVideoId = await window.commonHelper.getVideoIdWithFallback();
    const result = await window.commonHelper.fetchWatchPage(
      requestedVideoId ?? undefined,
    );
    const currentVideoId = window.commonHelper.extractVideoIdFromUrl();
    if (!result || !requestedVideoId || requestedVideoId !== currentVideoId) {
      return undefined;
    }

    const apiData = result.apiData as unknown as {
      owner?: {
        id?: number | string;
        nickname?: string;
        iconUrl?: string;
      } | null;
      channel?: {
        id?: number | string;
        name?: string;
        iconUrl?: string;
        url?: string;
      } | null;
    };
    const owner = apiData.owner;
    if (owner?.id !== undefined && owner.nickname && owner.iconUrl) {
      const profileHref = `/user/${owner.id}`;
      this.ownerApiMetadata = {
        name: owner.nickname,
        profileHref,
        videoHref: `${profileHref}/video`,
        iconSrc: owner.iconUrl,
        iconAlt: owner.nickname,
      };
      return;
    }

    const channel = apiData.channel;
    if (channel?.id !== undefined && channel.name && channel.iconUrl) {
      const profileHref = channel.url || `/channel/${channel.id}`;
      this.ownerApiMetadata = {
        name: channel.name,
        profileHref,
        videoHref: `${profileHref.replace(/\/$/, "")}/video`,
        iconSrc: channel.iconUrl,
        iconAlt: channel.name,
      };
    }
  }

  private cloneActionIcon(source: Element | null, fallback: string): Element {
    const icon = source?.querySelector("svg")?.cloneNode(true);
    if (icon instanceof Element) {
      icon.removeAttribute("class");
      icon.setAttribute("aria-hidden", "true");
      return icon;
    }

    const fallbackNode = document.createElement("span");
    fallbackNode.setAttribute("aria-hidden", "true");
    fallbackNode.textContent = fallback;
    return fallbackNode;
  }

  private createOwnerActionButton(
    className: string,
    label: string,
    source: HTMLElement | null,
    fallbackIcon: string,
  ): HTMLButtonElement {
    const button = document.createElement("button");
    button.type = "button";
    button.className = className;
    button.setAttribute("aria-label", label);
    button.disabled = !source;
    button.append(this.cloneActionIcon(source, fallbackIcon));
    button.addEventListener("click", () => source?.click());
    return button;
  }

  private waitForElement<T extends Element>(
    selector: string,
    timeoutMs = 1500,
  ): Promise<T | null> {
    const existing = document.querySelector<T>(selector);
    if (existing) {
      return Promise.resolve(existing);
    }

    return new Promise((resolve) => {
      const observer = new MutationObserver(() => {
        const element = document.querySelector<T>(selector);
        if (element) {
          observer.disconnect();
          window.clearTimeout(timer);
          resolve(element);
        }
      });
      const timer = window.setTimeout(() => {
        observer.disconnect();
        resolve(null);
      }, timeoutMs);
      observer.observe(document.body, { childList: true, subtree: true });
    });
  }

  private openOfficialOwnerMuteDialog = async (): Promise<void> => {
    const detailContent = document.querySelector<HTMLElement>(
      SELECTORS.detailContent,
    );
    const wasCollapsed = detailContent?.getAttribute("aria-hidden") !== "false";
    const detailToggle = document.querySelector<HTMLElement>(
      `${SELECTORS.bottom} > section:first-of-type > header > :first-child`,
    );
    if (wasCollapsed) {
      detailToggle?.click();
    }

    const menuTrigger = await this.waitForElement<HTMLButtonElement>(
      `${SELECTORS.detailContent} button[data-scope="menu"][data-part="trigger"]`,
    );
    if (!menuTrigger) {
      return;
    }
    menuTrigger.click();

    const muteAction = await this.waitForElement<HTMLButtonElement>(
      '[data-scope="menu"][data-part="item"][data-value="mute"] button',
    );
    muteAction?.click();

    if (wasCollapsed && muteAction) {
      window.setTimeout(() => detailToggle?.click(), 100);
    }
  };

  private createOwnerMenu(source: HTMLButtonElement | null): HTMLDivElement {
    const wrapper = document.createElement("div");
    wrapper.className = "HarajukuOwner-menuWrapper";

    const trigger = document.createElement("button");
    trigger.type = "button";
    trigger.className = "HarajukuOwner-action HarajukuOwner-menu";
    trigger.setAttribute("aria-label", "その他の操作");
    trigger.setAttribute("aria-haspopup", "menu");
    trigger.setAttribute("aria-expanded", "false");
    trigger.append(this.cloneActionIcon(source, "…"));

    const menu = document.createElement("div");
    menu.className = "HarajukuOwner-menuPopup";
    menu.setAttribute("role", "menu");
    menu.hidden = true;
    const mute = document.createElement("button");
    mute.type = "button";
    mute.className = "HarajukuOwner-menuItem";
    mute.setAttribute("role", "menuitem");
    mute.textContent = "このユーザーの動画を非表示";
    mute.addEventListener("click", () => {
      menu.hidden = true;
      trigger.setAttribute("aria-expanded", "false");
      void this.openOfficialOwnerMuteDialog();
    });
    menu.append(mute);

    trigger.addEventListener("click", () => {
      const willOpen = menu.hidden;
      menu.hidden = !willOpen;
      trigger.setAttribute("aria-expanded", String(willOpen));
    });
    wrapper.append(trigger, menu);
    return wrapper;
  }

  private createOwnerPanel(owner: OwnerMetadata): HTMLDivElement {
    const panel = document.createElement("div");
    panel.className = "HarajukuOwner";

    const iconLink = document.createElement("a");
    iconLink.className = "HarajukuOwner-iconLink";
    iconLink.href = owner.profileHref;
    iconLink.setAttribute("aria-label", owner.name);
    const icon = document.createElement("img");
    icon.className = "HarajukuOwner-icon";
    icon.src = owner.iconSrc;
    icon.alt = owner.iconAlt;
    icon.loading = "lazy";
    iconLink.append(icon);

    const body = document.createElement("div");
    body.className = "HarajukuOwner-body";
    const name = document.createElement("a");
    name.className = "HarajukuOwner-name";
    name.href = owner.profileHref;
    name.textContent = owner.name;
    const video = document.createElement("a");
    video.className = "HarajukuOwner-videos";
    video.href = owner.videoHref;
    video.textContent = "投稿動画";
    body.append(name, video);

    const actions = document.createElement("div");
    actions.className = "HarajukuOwner-actions";
    actions.append(
      this.createOwnerActionButton(
        "HarajukuOwner-action HarajukuOwner-follow",
        "フォロー",
        owner.followAction,
        "☆",
      ),
    );

    const support = document.createElement("a");
    support.className = "HarajukuOwner-action HarajukuOwner-support";
    support.href = owner.supportAction?.href ?? "#";
    support.setAttribute("aria-label", "サポーター登録");
    if (!owner.supportAction) {
      support.setAttribute("aria-disabled", "true");
    }
    support.append(this.cloneActionIcon(owner.supportAction, "♡"));
    actions.append(support);

    actions.append(this.createOwnerMenu(owner.menuAction));

    panel.append(iconLink, body, actions);
    return panel;
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
    node.className =
      key === "postedAt" ? "HarajukuStats-date" : "HarajukuStats-row";
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

  private findCommentListSection(
    root: Element | Document | null | undefined = document,
  ): HTMLElement | null {
    if (!root) {
      return null;
    }

    return (
      Array.from(root.querySelectorAll<HTMLElement>("section")).find(
        (section) => {
          const header = section.querySelector<HTMLElement>(":scope > header");
          return header?.textContent?.includes("コメントリスト") ?? false;
        },
      ) ?? null
    );
  }

  private findSidebarPanel(): HTMLElement | null {
    const commentListSection = this.findCommentListSection();
    return (
      commentListSection?.parentElement ??
      document.querySelector<HTMLElement>(SELECTORS.sidebarPanel)
    );
  }

  private ensureChrome(): HTMLDivElement | undefined {
    const sidebar = this.findSidebarPanel();
    if (!sidebar) {
      return undefined;
    }

    let chrome = sidebar.querySelector<HTMLDivElement>(
      `:scope > .${CHROME_CLASS}`,
    );
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

    const values = this.metadataReader.currentMeta();
    const owner = this.readOwnerMetadata();
    const signature = [
      ...META_ITEMS.map((item) => values[item.source] || "-"),
      owner?.name ?? "-",
      owner?.profileHref ?? "-",
      owner?.videoHref ?? "-",
      owner?.iconSrc ?? "-",
      owner?.followAction?.getAttribute("data-element-params") ?? "-",
      owner?.supportAction?.getAttribute("data-element-params") ?? "-",
    ].join("\n");
    if (
      chrome.dataset.hySignature === signature &&
      (!owner || document.querySelector(".HarajukuOwner"))
    ) {
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

    document.querySelectorAll(".HarajukuOwner").forEach((node) => {
      node.remove();
    });
    if (owner) {
      document
        .querySelector<HTMLElement>(SELECTORS.bottom)
        ?.append(this.createOwnerPanel(owner));
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
    const sidebar = this.findSidebarPanel();
    const sidebarColumn = sidebar?.parentElement;
    const commentListSection = this.findCommentListSection(sidebarColumn);
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
      const panelBottom =
        commentListSection?.getBoundingClientRect().bottom ??
        sidebarColumn?.getBoundingClientRect().bottom ??
        sidebar.getBoundingClientRect().bottom;
      root.style.setProperty(
        "--hy-watch-sidebar-panel-height",
        this.px(panelBottom - titleTop),
      );
    }

    const sidebarExtraPanels = Array.from(
      sidebarColumn?.querySelectorAll(
        ':scope > section, :scope > [data-scope="tabs"][data-part="root"]',
      ) ?? [],
    );

    this.observeLayoutTargets([
      grid,
      title,
      sidebar,
      sidebarColumn,
      detailContent,
      commentListSection,
      ...sidebarExtraPanels,
    ]);
  }

  private observeLayoutTargets(
    targets: Array<Element | null | undefined>,
  ): void {
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
      if (!this._isActive) {
        return;
      }
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
      const meta = this.metadataReader.currentMeta();
      if (
        retryCount >= 40 ||
        (meta["再生"] &&
          meta["コメント"] &&
          meta["マイリスト"] &&
          meta["投稿日時"])
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
