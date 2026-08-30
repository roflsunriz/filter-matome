import { API_STATUS_MENU_STYLES } from "@/common/api-status-menu-styles.js";
import { isWatchFullscreenActive } from "@/common/watch-fullscreen.js";
import type {
  FilterMatomeApiStatus,
  FilterMatomeApiStatusId,
  FilterMatomeApiStatusKind,
} from "@/common/api-status-menu.js";

const CONTAINER_ID = "filter-matome-api-status-menu";
const POPOVER_ID = "filter-matome-api-status-popover";
const STYLE_ID = "filter-matome-api-status-menu-styles";
const LEGACY_HOST_ID = "ncnl_common_header_extension_host";
const ACCOUNT_HOST_ID = "ncnl_common_header_account_host";

type ResolveStatuses = (
  host: Record<string, unknown>,
  pathname: string,
) => FilterMatomeApiStatus[];

type Placement = {
  parent: Element;
  reference: Element | null;
  mounted: "account" | "service" | "legacy";
};

type Copy = {
  trigger: string;
  title: string;
  note: string;
  names: Record<FilterMatomeApiStatusId, string>;
  states: Record<FilterMatomeApiStatusKind, string>;
};

const ENGLISH_COPY: Copy = {
  trigger: "filter-matome",
  title: "nlFilter API status",
  note: "APIs are checked automatically. Reload the Watch page if a red status persists.",
  names: {
    "playback-rate": "Playback-rate bridge",
    "comment-reload": "Comment reload",
    "comment-menu": "Comment menu",
  },
  states: {
    active: "Active",
    probing: "Checking",
    missing: "Not detected",
    incompatible: "Version mismatch",
    "probe-error": "Check failed",
    "not-applicable": "Watch only",
  },
};

const COPIES: Record<string, Copy> = {
  en: ENGLISH_COPY,
  ja: {
    trigger: "filter-matome",
    title: "nlFilter API 挿入状態",
    note: "各APIは自動検査されます。赤い状態が続く場合はWatchページを再読み込みしてください。",
    names: {
      "playback-rate": "再生速度同期",
      "comment-reload": "コメント再取得",
      "comment-menu": "コメントメニュー",
    },
    states: {
      active: "有効",
      probing: "自動検査中",
      missing: "未検出",
      incompatible: "版不一致",
      "probe-error": "検査失敗",
      "not-applicable": "Watchのみ",
    },
  },
  zh: {
    ...ENGLISH_COPY,
    title: "nlFilter API 状态",
    note: "系统会自动检查各项 API。若红色状态持续出现，请重新加载观看页面。",
    names: {
      "playback-rate": "播放速度同步",
      "comment-reload": "重新加载评论",
      "comment-menu": "评论菜单",
    },
    states: {
      active: "有效",
      probing: "正在检查",
      missing: "未检测到",
      incompatible: "版本不匹配",
      "probe-error": "检查失败",
      "not-applicable": "仅限观看页",
    },
  },
  hi: {
    ...ENGLISH_COPY,
    title: "nlFilter API स्थिति",
    states: {
      active: "सक्रिय",
      probing: "जाँच जारी",
      missing: "नहीं मिला",
      incompatible: "संस्करण अलग",
      "probe-error": "जाँच विफल",
      "not-applicable": "केवल Watch",
    },
  },
  es: {
    ...ENGLISH_COPY,
    title: "Estado de API nlFilter",
    states: {
      active: "Activa",
      probing: "Comprobando",
      missing: "No detectada",
      incompatible: "Versión incompatible",
      "probe-error": "Error de comprobación",
      "not-applicable": "Solo en Watch",
    },
  },
  fr: {
    ...ENGLISH_COPY,
    title: "État des API nlFilter",
    states: {
      active: "Active",
      probing: "Vérification",
      missing: "Non détectée",
      incompatible: "Version incompatible",
      "probe-error": "Échec de vérification",
      "not-applicable": "Watch uniquement",
    },
  },
  ar: {
    ...ENGLISH_COPY,
    title: "حالة واجهات nlFilter",
    states: {
      active: "نشطة",
      probing: "جارٍ الفحص",
      missing: "غير مكتشفة",
      incompatible: "إصدار غير متوافق",
      "probe-error": "فشل الفحص",
      "not-applicable": "صفحة المشاهدة فقط",
    },
  },
  pt: {
    ...ENGLISH_COPY,
    title: "Estado das APIs nlFilter",
    states: {
      active: "Ativa",
      probing: "Verificando",
      missing: "Não detectada",
      incompatible: "Versão incompatível",
      "probe-error": "Falha na verificação",
      "not-applicable": "Somente no Watch",
    },
  },
  bn: {
    ...ENGLISH_COPY,
    title: "nlFilter API অবস্থা",
    states: {
      active: "সক্রিয়",
      probing: "পরীক্ষা চলছে",
      missing: "শনাক্ত হয়নি",
      incompatible: "সংস্করণ মেলেনি",
      "probe-error": "পরীক্ষা ব্যর্থ",
      "not-applicable": "শুধু Watch",
    },
  },
  ru: {
    ...ENGLISH_COPY,
    title: "Состояние API nlFilter",
    states: {
      active: "Активен",
      probing: "Проверка",
      missing: "Не обнаружен",
      incompatible: "Версия несовместима",
      "probe-error": "Ошибка проверки",
      "not-applicable": "Только Watch",
    },
  },
  ur: {
    ...ENGLISH_COPY,
    title: "nlFilter API کی حالت",
    states: {
      active: "فعال",
      probing: "جانچ جاری ہے",
      missing: "نہیں ملا",
      incompatible: "ورژن مختلف ہے",
      "probe-error": "جانچ ناکام",
      "not-applicable": "صرف Watch",
    },
  },
};

let started = false;
let mountedAccountItem: HTMLElement | null = null;
let positionFrame = 0;
let activeResolveStatuses: ResolveStatuses | null = null;

const getCopy = (): Copy => {
  const language = document.documentElement.lang.toLowerCase().split("-")[0];
  return COPIES[language] ?? ENGLISH_COPY;
};

const getSummary = (
  statuses: FilterMatomeApiStatus[],
): "active" | "warning" | "error" => {
  if (
    statuses.some(
      ({ kind }) =>
        kind === "missing" || kind === "incompatible" || kind === "probe-error",
    )
  ) {
    return "error";
  }
  return statuses.some(({ kind }) => kind !== "active") ? "warning" : "active";
};

const applyStyles = (): void => {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = API_STATUS_MENU_STYLES;
  (document.head ?? document.documentElement).append(style);
};

const findOfficialRoot = (commonHeader: Element): Element | null => {
  if (commonHeader.matches(".nico-CommonHeaderRoot")) return commonHeader;
  return commonHeader.querySelector(".nico-CommonHeaderRoot");
};

const findCommonHeader = (): Element | null =>
  document.getElementById("CommonHeader") ??
  document.querySelector(".nico-CommonHeaderRoot") ??
  (/(?:^|\.)nicoft\.io$/u.test(location.hostname) ||
  location.hostname === "www.beta.hiroba.nicovideo.jp"
    ? document.body
    : null);

const findServiceNavigation = (commonHeader: Element): Element | null => {
  const root = findOfficialRoot(commonHeader);
  if (!root) return null;
  for (const anchor of root.querySelectorAll<HTMLAnchorElement>("a[href]")) {
    if ((anchor.getAttribute("href") ?? "").includes("header_servicelink")) {
      return anchor.parentElement;
    }
  }
  return null;
};

const findAccountMenuItem = (commonHeader: Element): HTMLElement | null => {
  const root = findOfficialRoot(commonHeader);
  if (!root) return null;
  let bestItem: HTMLElement | null = null;
  let bestDepth = Number.POSITIVE_INFINITY;
  for (const anchor of root.querySelectorAll<HTMLAnchorElement>("a[href]")) {
    try {
      const url = new URL(anchor.href, location.href);
      const commonHeaderReference = url.searchParams.get("cmnhd_ref") ?? "";
      const isAccountUrl =
        url.hostname === "www.nicovideo.jp" && url.pathname === "/my";
      if (
        !isAccountUrl &&
        !/(?:^|&)pos=header(?:&|$)/u.test(commonHeaderReference)
      ) {
        continue;
      }
      const item = anchor.parentElement;
      if (!item?.parentElement || !item.previousElementSibling) continue;
      let depth = 0;
      let ancestor: Element | null = item;
      while (ancestor && ancestor !== root) {
        depth += 1;
        ancestor = ancestor.parentElement;
      }
      if (ancestor === root && depth < bestDepth) {
        bestItem = item;
        bestDepth = depth;
      }
    } catch {
      // Invalid links are not CommonHeader account items.
    }
  }
  if (bestItem) return bestItem;

  for (const anchor of root.querySelectorAll<HTMLAnchorElement>("a[href]")) {
    try {
      const url = new URL(anchor.href, location.href);
      if (
        url.hostname !== "account.nicovideo.jp" ||
        !/^\/register(?:\/|$)/u.test(url.pathname)
      ) {
        continue;
      }
      const registerItem = anchor.parentElement;
      const placeholderItem = registerItem?.nextElementSibling;
      if (placeholderItem instanceof HTMLElement) return placeholderItem;
    } catch {
      // Invalid links are not CommonHeader registration items.
    }
  }
  return null;
};

const findInsertionReference = (navigation: Element): Element | null => {
  let lastServiceLink: Element | null = null;
  for (const child of navigation.children) {
    const href = child.getAttribute("href");
    if (href?.includes("header_servicelink")) lastServiceLink = child;
  }
  let reference = lastServiceLink?.nextElementSibling ?? null;
  while (
    reference &&
    (reference.id === "ncnl_common_header_menu" ||
      reference.id === CONTAINER_ID)
  ) {
    reference = reference.nextElementSibling;
  }
  return reference;
};

const findNicoFtAccountMenuItem = (): HTMLElement | null => {
  if (!/(?:^|\.)nicoft\.io$/u.test(location.hostname)) return null;
  for (const anchor of document.querySelectorAll<HTMLAnchorElement>(
    "a[href]",
  )) {
    try {
      const url = new URL(anchor.href, location.href);
      if (
        (url.hostname === "nicoft.io" || url.hostname === "www.nicoft.io") &&
        url.pathname === "/login"
      ) {
        return anchor;
      }
    } catch {
      // Invalid links are not NicoFT account items.
    }
  }
  return null;
};

const findHirobaPlacement = (): Placement | null => {
  if (
    location.hostname !== "www.beta.hiroba.nicovideo.jp" ||
    document.readyState === "loading"
  ) {
    return null;
  }
  for (const anchor of document.querySelectorAll<HTMLAnchorElement>(
    "a[href]",
  )) {
    try {
      const url = new URL(anchor.href, location.href);
      if (
        url.hostname === location.hostname &&
        url.pathname === "/settings" &&
        anchor.parentElement
      ) {
        return {
          parent: anchor.parentElement,
          reference: anchor,
          mounted: "service",
        };
      }
    } catch {
      // Invalid links are not Hiroba settings items.
    }
  }
  return null;
};

const findLegacyHeaderHost = (commonHeader: Element): HTMLElement | null => {
  const inner = document.getElementById("siteHeaderInner");
  if (!inner || !commonHeader.contains(inner)) return null;
  let serviceLinks = 0;
  for (const anchor of inner.querySelectorAll<HTMLAnchorElement>("a[href]")) {
    try {
      const url = new URL(anchor.href, location.href);
      if (
        url.hostname === "www.nicovideo.jp" ||
        /^(?:seiga|live|news|dic)\.nicovideo\.jp$/u.test(url.hostname)
      ) {
        serviceLinks += 1;
      }
    } catch {
      // Invalid links are not legacy CommonHeader service items.
    }
  }
  if (serviceLinks < 3) return null;
  const existing = document.getElementById(LEGACY_HOST_ID);
  if (existing instanceof HTMLElement) return existing;
  const host = document.createElement("div");
  host.id = LEGACY_HOST_ID;
  host.style.cssText =
    "position:fixed;top:0;right:0;z-index:101000;display:flex;height:36px;";
  inner.append(host);
  return host;
};

const findPlacement = (commonHeader: Element): Placement | null => {
  const accountItem = findAccountMenuItem(commonHeader);
  if (accountItem?.parentElement) {
    return {
      parent: accountItem.parentElement,
      reference: accountItem,
      mounted: "account",
    };
  }
  const nicoFtAccountItem = findNicoFtAccountMenuItem();
  if (nicoFtAccountItem?.parentElement) {
    return {
      parent: nicoFtAccountItem.parentElement,
      reference: nicoFtAccountItem,
      mounted: "account",
    };
  }
  const hirobaPlacement = findHirobaPlacement();
  if (hirobaPlacement) return hirobaPlacement;
  const navigation = findServiceNavigation(commonHeader);
  if (navigation) {
    return {
      parent: navigation,
      reference: findInsertionReference(navigation),
      mounted: "service",
    };
  }
  const legacyHost = findLegacyHeaderHost(commonHeader);
  return legacyHost
    ? { parent: legacyHost, reference: null, mounted: "legacy" }
    : null;
};

const LEGACY_ACCOUNT_ATTRIBUTES = [
  "data-ncnl-account-space",
  "data-ncnl-account-original-margin",
  "data-ncnl-account-base-margin",
  "data-ncnl-account-width",
  "data-filter-matome-account-space",
  "data-filter-matome-account-original-margin",
  "data-filter-matome-account-base-margin",
  "data-filter-matome-account-width",
] as const;

const clearLegacyAccountSpace = (accountItem: HTMLElement | null): void => {
  if (!accountItem) return;
  const reserved = LEGACY_ACCOUNT_ATTRIBUTES.some((name) =>
    accountItem.hasAttribute(name),
  );
  if (reserved) accountItem.style.removeProperty("margin-left");
  for (const name of LEGACY_ACCOUNT_ATTRIBUTES)
    accountItem.removeAttribute(name);
};

const releaseAccountSpace = (): void => {
  clearLegacyAccountSpace(mountedAccountItem);
  mountedAccountItem = null;
};

const ensureAccountHost = (): HTMLElement => {
  const existing = document.getElementById(ACCOUNT_HOST_ID);
  if (existing instanceof HTMLElement) return existing;
  const host = document.createElement("div");
  host.id = ACCOUNT_HOST_ID;
  host.style.cssText =
    "position:fixed;top:0;right:0;z-index:101001;display:flex;height:36px;";
  document.body.append(host);
  return host;
};

const positionAccountMenu = (container: HTMLElement): void => {
  if (
    !mountedAccountItem?.isConnected ||
    container.dataset.filterMatomeMounted !== "account"
  ) {
    return;
  }
  const host = document.getElementById(ACCOUNT_HOST_ID);
  if (!(host instanceof HTMLElement)) return;
  const accountRect = mountedAccountItem.getBoundingClientRect();
  const viewportWidth =
    document.documentElement.clientWidth || window.innerWidth;
  const accountLeft =
    viewportWidth > 0
      ? Math.min(Math.max(0, accountRect.left), viewportWidth)
      : Math.max(0, accountRect.left);
  host.style.right = `${Math.round(Math.max(0, viewportWidth - accountLeft))}px`;
  host.style.top = `${Math.round(accountRect.top)}px`;
  const containerRect = container.getBoundingClientRect();
  const popover = container.querySelector<HTMLElement>(
    ".filter-matome-api-status-popover",
  );
  const popoverWidth = popover
    ? Math.ceil(popover.getBoundingClientRect().width)
    : 0;
  container.dataset.filterMatomePopoverAlign =
    popoverWidth > 0 && containerRect.right - popoverWidth < 0
      ? "left"
      : "right";
};

const scheduleAccountMenuPosition = (): void => {
  if (positionFrame) return;
  positionFrame = requestAnimationFrame(() => {
    positionFrame = 0;
    const container = document.getElementById(CONTAINER_ID);
    if (container instanceof HTMLElement) positionAccountMenu(container);
  });
};

const mountAccountMenu = (
  container: HTMLElement,
  accountItem: HTMLElement,
): void => {
  if (mountedAccountItem !== accountItem) releaseAccountSpace();
  mountedAccountItem = accountItem;
  clearLegacyAccountSpace(accountItem);
  const host = ensureAccountHost();
  const nicoCacheMenu = document.getElementById("ncnl_common_header_menu");
  if (
    nicoCacheMenu instanceof HTMLElement &&
    nicoCacheMenu.parentElement !== host
  ) {
    host.prepend(nicoCacheMenu);
  }
  if (container.parentElement !== host) host.append(container);
  container.dataset.filterMatomeMounted = "account";
  container.style.removeProperty("left");
  container.style.removeProperty("top");
  positionAccountMenu(container);
};

const clearAccountMenuPosition = (container: HTMLElement): void => {
  releaseAccountSpace();
  container.removeAttribute("data-filter-matome-popover-align");
  container.style.removeProperty("left");
  container.style.removeProperty("top");
};

const isPlacementCurrent = (
  container: HTMLElement | null,
  placement: Placement | null,
): boolean => {
  if (
    !container ||
    !placement ||
    container.dataset.filterMatomeMounted !== placement.mounted
  ) {
    return false;
  }
  if (placement.mounted === "account") {
    return (
      container.parentElement?.id === ACCOUNT_HOST_ID &&
      mountedAccountItem === placement.reference
    );
  }
  return (
    container.parentElement === placement.parent &&
    container.nextElementSibling === placement.reference
  );
};

const setText = (element: HTMLElement | null, value: string): void => {
  if (element && element.textContent !== value) element.textContent = value;
};

const renderStatuses = (
  container: HTMLElement,
  resolveStatuses: ResolveStatuses,
): void => {
  const copy = getCopy();
  const statuses = resolveStatuses(window, location.pathname);
  container.dataset.summary = getSummary(statuses);
  const trigger = container.querySelector<HTMLButtonElement>(
    ".filter-matome-api-status-trigger",
  );
  trigger?.setAttribute("aria-label", `${copy.trigger}: ${copy.title}`);
  setText(
    container.querySelector<HTMLElement>(".filter-matome-api-status-heading"),
    copy.title,
  );
  setText(
    container.querySelector<HTMLElement>(".filter-matome-api-status-note"),
    copy.note,
  );
  for (const status of statuses) {
    const item = container.querySelector<HTMLElement>(
      `[data-api-id="${status.id}"]`,
    );
    if (!item) continue;
    item.dataset.status = status.kind;
    setText(
      item.querySelector<HTMLElement>(".filter-matome-api-status-name"),
      copy.names[status.id],
    );
    setText(
      item.querySelector<HTMLElement>(".filter-matome-api-status-value"),
      copy.states[status.kind],
    );
  }
};

const setMenuOpen = (
  container: HTMLElement,
  open: boolean,
  resolveStatuses: ResolveStatuses,
): void => {
  const trigger = container.querySelector<HTMLButtonElement>(
    ".filter-matome-api-status-trigger",
  );
  const popover = container.querySelector<HTMLElement>(
    ".filter-matome-api-status-popover",
  );
  container.dataset.filterMatomeOpen = open ? "true" : "false";
  trigger?.setAttribute("aria-expanded", open ? "true" : "false");
  popover?.setAttribute("aria-hidden", open ? "false" : "true");
  if (open) renderStatuses(container, resolveStatuses);
};

const syncFullscreenVisibility = (
  container: HTMLElement,
  resolveStatuses: ResolveStatuses,
): void => {
  const fullscreen = isWatchFullscreenActive();
  if (container.hidden === fullscreen) return;
  container.hidden = fullscreen;
  if (fullscreen) {
    setMenuOpen(container, false, resolveStatuses);
  } else if (container.dataset.filterMatomeMounted === "account") {
    scheduleAccountMenuPosition();
  }
};

const createStatusItem = (id: FilterMatomeApiStatusId): HTMLLIElement => {
  const item = document.createElement("li");
  item.className = "filter-matome-api-status-item";
  item.dataset.apiId = id;
  item.dataset.status = "missing";
  item.setAttribute("role", "menuitem");
  item.tabIndex = -1;
  const dot = document.createElement("span");
  dot.className = "filter-matome-api-status-dot";
  dot.setAttribute("aria-hidden", "true");
  const name = document.createElement("span");
  name.className = "filter-matome-api-status-name";
  const value = document.createElement("span");
  value.className = "filter-matome-api-status-value";
  item.append(dot, name, value);
  return item;
};

const createMenu = (resolveStatuses: ResolveStatuses): HTMLElement => {
  applyStyles();
  const container = document.createElement("div");
  container.id = CONTAINER_ID;
  container.dataset.filterMatomeOpen = "false";
  container.dataset.summary = "warning";

  const trigger = document.createElement("button");
  trigger.type = "button";
  trigger.className = "filter-matome-api-status-trigger";
  trigger.setAttribute("aria-haspopup", "menu");
  trigger.setAttribute("aria-controls", POPOVER_ID);
  trigger.setAttribute("aria-expanded", "false");
  const summary = document.createElement("span");
  summary.className = "filter-matome-api-status-summary";
  summary.setAttribute("aria-hidden", "true");
  const label = document.createElement("span");
  label.textContent = "filter-matome";
  trigger.append(summary, label);
  container.append(trigger);

  const popover = document.createElement("div");
  popover.id = POPOVER_ID;
  popover.className = "filter-matome-api-status-popover";
  popover.setAttribute("role", "menu");
  popover.setAttribute("aria-hidden", "true");
  const heading = document.createElement("h2");
  heading.className = "filter-matome-api-status-heading";
  const list = document.createElement("ul");
  list.className = "filter-matome-api-status-list";
  list.append(
    createStatusItem("playback-rate"),
    createStatusItem("comment-reload"),
    createStatusItem("comment-menu"),
  );
  const note = document.createElement("p");
  note.className = "filter-matome-api-status-note";
  popover.append(heading, list, note);
  container.append(popover);

  container.addEventListener("mouseenter", () =>
    setMenuOpen(container, true, resolveStatuses),
  );
  container.addEventListener("mouseleave", () => {
    if (!container.contains(document.activeElement)) {
      setMenuOpen(container, false, resolveStatuses);
    }
  });
  container.addEventListener("focusin", () =>
    setMenuOpen(container, true, resolveStatuses),
  );
  container.addEventListener("focusout", () => {
    setTimeout(() => {
      if (!container.contains(document.activeElement)) {
        setMenuOpen(container, false, resolveStatuses);
      }
    }, 0);
  });
  let openBeforePointer = false;
  trigger.addEventListener("pointerdown", () => {
    openBeforePointer = container.dataset.filterMatomeOpen === "true";
  });
  trigger.addEventListener("click", (event) => {
    const wasOpen =
      event.detail > 0
        ? openBeforePointer
        : container.dataset.filterMatomeOpen === "true";
    setMenuOpen(container, !wasOpen, resolveStatuses);
  });
  container.addEventListener("keydown", (event) => {
    const items = Array.from(
      popover.querySelectorAll<HTMLElement>('[role="menuitem"]'),
    );
    const itemIndex = items.indexOf(event.target as HTMLElement);
    if (event.key === "Escape") {
      trigger.focus();
      setMenuOpen(container, false, resolveStatuses);
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      setMenuOpen(container, true, resolveStatuses);
      items[itemIndex < 0 ? 0 : (itemIndex + 1) % items.length]?.focus();
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setMenuOpen(container, true, resolveStatuses);
      items[
        itemIndex < 0
          ? items.length - 1
          : (itemIndex + items.length - 1) % items.length
      ]?.focus();
    } else if (event.key === "Home") {
      event.preventDefault();
      items[0]?.focus();
    } else if (event.key === "End") {
      event.preventDefault();
      items[items.length - 1]?.focus();
    }
  });
  renderStatuses(container, resolveStatuses);
  return container;
};

const initialize = (resolveStatuses: ResolveStatuses): boolean => {
  const commonHeader = findCommonHeader();
  if (!commonHeader) return false;
  const placement = findPlacement(commonHeader);
  const existing = document.getElementById(CONTAINER_ID);
  if (!placement) {
    if (existing instanceof HTMLElement) {
      clearAccountMenuPosition(existing);
      existing.removeAttribute("data-filter-matome-mounted");
    }
    return false;
  }
  const container =
    existing instanceof HTMLElement ? existing : createMenu(resolveStatuses);
  if (placement.mounted === "account") {
    mountAccountMenu(container, placement.reference as HTMLElement);
  } else {
    clearAccountMenuPosition(container);
    placement.parent.insertBefore(container, placement.reference);
    container.dataset.filterMatomeMounted = placement.mounted;
  }
  syncFullscreenVisibility(container, resolveStatuses);
  renderStatuses(container, resolveStatuses);
  return true;
};

export function startApiStatusMenuRuntime(
  resolveStatuses: ResolveStatuses,
): void {
  if (started) return;
  started = true;
  activeResolveStatuses = resolveStatuses;

  document.addEventListener("pointerdown", (event) => {
    const container = document.getElementById(CONTAINER_ID);
    if (
      container instanceof HTMLElement &&
      !container.contains(event.target as Node)
    ) {
      setMenuOpen(container, false, resolveStatuses);
    }
  });

  const observer = new MutationObserver(() => {
    const commonHeader = findCommonHeader();
    const container = document.getElementById(CONTAINER_ID);
    const placement = commonHeader && findPlacement(commonHeader);
    if (container instanceof HTMLElement) {
      syncFullscreenVisibility(container, resolveStatuses);
    }
    if (
      !isPlacementCurrent(
        container instanceof HTMLElement ? container : null,
        placement,
      )
    ) {
      initialize(resolveStatuses);
    } else if (placement?.mounted === "account") {
      scheduleAccountMenuPosition();
    }
  });
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });

  window.addEventListener("popstate", () => {
    setTimeout(() => {
      initialize(resolveStatuses);
      refreshApiStatusMenuRuntime();
    }, 0);
  });
  document.addEventListener("fullscreenchange", () => {
    const container = document.getElementById(CONTAINER_ID);
    if (container instanceof HTMLElement) {
      syncFullscreenVisibility(container, resolveStatuses);
    }
  });
  window.addEventListener("resize", () => {
    const container = document.getElementById(CONTAINER_ID);
    if (container instanceof HTMLElement) {
      syncFullscreenVisibility(container, resolveStatuses);
    }
    scheduleAccountMenuPosition();
  });
  window.addEventListener("scroll", scheduleAccountMenuPosition, true);
  window.addEventListener(
    "filter-matome:api-status-change",
    refreshApiStatusMenuRuntime,
  );
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState !== "hidden") {
      refreshApiStatusMenuRuntime();
    }
  });
  initialize(resolveStatuses);
}

export function refreshApiStatusMenuRuntime(): void {
  const container = document.getElementById(CONTAINER_ID);
  if (container instanceof HTMLElement && activeResolveStatuses) {
    renderStatuses(container, activeResolveStatuses);
  }
}
