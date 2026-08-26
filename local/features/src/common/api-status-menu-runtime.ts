import { API_STATUS_MENU_STYLES } from "@/common/api-status-menu-styles.js";
import type {
  FilterMatomeApiStatus,
  FilterMatomeApiStatusId,
  FilterMatomeApiStatusKind,
} from "@/common/api-status-menu.js";

const CONTAINER_ID = "filter-matome-api-status-menu";
const POPOVER_ID = "filter-matome-api-status-popover";
const STYLE_ID = "filter-matome-api-status-menu-styles";

type ResolveStatuses = (
  host: Record<string, unknown>,
  pathname: string,
) => FilterMatomeApiStatus[];

type Placement = {
  parent: Element;
  reference: Element | null;
  mounted: "account" | "service";
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
  note: "The comment-menu bridge is confirmed after the official comment menu is opened once.",
  names: {
    "playback-rate": "Playback-rate bridge",
    "comment-reload": "Comment reload",
    "comment-menu": "Comment menu",
  },
  states: {
    active: "Active",
    waiting: "Waiting for use",
    missing: "Not detected",
    incompatible: "Version mismatch",
    "not-applicable": "Watch only",
  },
};

const COPIES: Record<string, Copy> = {
  en: ENGLISH_COPY,
  ja: {
    trigger: "filter-matome",
    title: "nlFilter API 挿入状態",
    note: "コメントメニューは、公式コメントメニューを一度開いた後に挿入済みと確認できます。",
    names: {
      "playback-rate": "再生速度同期",
      "comment-reload": "コメント再取得",
      "comment-menu": "コメントメニュー",
    },
    states: {
      active: "有効",
      waiting: "利用待ち",
      missing: "未検出",
      incompatible: "版不一致",
      "not-applicable": "Watchのみ",
    },
  },
  zh: {
    ...ENGLISH_COPY,
    title: "nlFilter API 状态",
    note: "打开一次官方评论菜单后，即可确认评论菜单桥接是否已插入。",
    names: {
      "playback-rate": "播放速度同步",
      "comment-reload": "重新加载评论",
      "comment-menu": "评论菜单",
    },
    states: {
      active: "有效",
      waiting: "等待使用",
      missing: "未检测到",
      incompatible: "版本不匹配",
      "not-applicable": "仅限观看页",
    },
  },
  hi: {
    ...ENGLISH_COPY,
    title: "nlFilter API स्थिति",
    states: {
      active: "सक्रिय",
      waiting: "उपयोग की प्रतीक्षा",
      missing: "नहीं मिला",
      incompatible: "संस्करण अलग",
      "not-applicable": "केवल Watch",
    },
  },
  es: {
    ...ENGLISH_COPY,
    title: "Estado de API nlFilter",
    states: {
      active: "Activa",
      waiting: "En espera",
      missing: "No detectada",
      incompatible: "Versión incompatible",
      "not-applicable": "Solo en Watch",
    },
  },
  fr: {
    ...ENGLISH_COPY,
    title: "État des API nlFilter",
    states: {
      active: "Active",
      waiting: "En attente",
      missing: "Non détectée",
      incompatible: "Version incompatible",
      "not-applicable": "Watch uniquement",
    },
  },
  ar: {
    ...ENGLISH_COPY,
    title: "حالة واجهات nlFilter",
    states: {
      active: "نشطة",
      waiting: "بانتظار الاستخدام",
      missing: "غير مكتشفة",
      incompatible: "إصدار غير متوافق",
      "not-applicable": "صفحة المشاهدة فقط",
    },
  },
  pt: {
    ...ENGLISH_COPY,
    title: "Estado das APIs nlFilter",
    states: {
      active: "Ativa",
      waiting: "Aguardando uso",
      missing: "Não detectada",
      incompatible: "Versão incompatível",
      "not-applicable": "Somente no Watch",
    },
  },
  bn: {
    ...ENGLISH_COPY,
    title: "nlFilter API অবস্থা",
    states: {
      active: "সক্রিয়",
      waiting: "ব্যবহারের অপেক্ষায়",
      missing: "শনাক্ত হয়নি",
      incompatible: "সংস্করণ মেলেনি",
      "not-applicable": "শুধু Watch",
    },
  },
  ru: {
    ...ENGLISH_COPY,
    title: "Состояние API nlFilter",
    states: {
      active: "Активен",
      waiting: "Ожидает использования",
      missing: "Не обнаружен",
      incompatible: "Версия несовместима",
      "not-applicable": "Только Watch",
    },
  },
  ur: {
    ...ENGLISH_COPY,
    title: "nlFilter API کی حالت",
    states: {
      active: "فعال",
      waiting: "استعمال کا منتظر",
      missing: "نہیں ملا",
      incompatible: "ورژن مختلف ہے",
      "not-applicable": "صرف Watch",
    },
  },
};

let started = false;
let mountedAccountItem: HTMLElement | null = null;
let accountOriginalMarginLeft = "";
let accountBaseMarginLeft = "0px";
let accountReservedWidth = 0;
let positionFrame = 0;

const getCopy = (): Copy => {
  const language = document.documentElement.lang.toLowerCase().split("-")[0];
  return COPIES[language] ?? ENGLISH_COPY;
};

const getSummary = (
  statuses: FilterMatomeApiStatus[],
): "active" | "warning" | "error" => {
  if (
    statuses.some(({ kind }) => kind === "missing" || kind === "incompatible")
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

const findServiceNavigation = (commonHeader: Element): Element | null => {
  const root = commonHeader.querySelector(".nico-CommonHeaderRoot");
  if (!root) return null;
  for (const anchor of root.querySelectorAll<HTMLAnchorElement>("a[href]")) {
    if ((anchor.getAttribute("href") ?? "").includes("header_servicelink")) {
      return anchor.parentElement;
    }
  }
  return null;
};

const findAccountMenuItem = (commonHeader: Element): HTMLElement | null => {
  const root = commonHeader.querySelector(".nico-CommonHeaderRoot");
  if (!root) return null;
  let bestItem: HTMLElement | null = null;
  let bestDepth = Number.POSITIVE_INFINITY;
  for (const anchor of root.querySelectorAll<HTMLAnchorElement>("a[href]")) {
    try {
      const url = new URL(anchor.href, location.href);
      if (url.hostname !== "www.nicovideo.jp" || url.pathname !== "/my") {
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
  return bestItem;
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

const findPlacement = (commonHeader: Element): Placement | null => {
  const accountItem = findAccountMenuItem(commonHeader);
  if (accountItem?.parentElement) {
    return {
      parent: accountItem.parentElement,
      reference: accountItem,
      mounted: "account",
    };
  }
  const navigation = findServiceNavigation(commonHeader);
  return navigation
    ? {
        parent: navigation,
        reference: findInsertionReference(navigation),
        mounted: "service",
      }
    : null;
};

const releaseAccountSpace = (): void => {
  if (!mountedAccountItem) return;
  if (accountOriginalMarginLeft) {
    mountedAccountItem.style.marginLeft = accountOriginalMarginLeft;
  } else {
    mountedAccountItem.style.removeProperty("margin-left");
  }
  mountedAccountItem.removeAttribute("data-filter-matome-account-space");
  mountedAccountItem.removeAttribute(
    "data-filter-matome-account-original-margin",
  );
  mountedAccountItem.removeAttribute("data-filter-matome-account-base-margin");
  mountedAccountItem.removeAttribute("data-filter-matome-account-width");
  mountedAccountItem = null;
  accountOriginalMarginLeft = "";
  accountBaseMarginLeft = "0px";
  accountReservedWidth = 0;
};

const getAccountBaseMargin = (accountItem: HTMLElement): string => {
  if (accountItem.hasAttribute("data-ncnl-account-space")) {
    const nicoBase =
      accountItem.getAttribute("data-ncnl-account-base-margin") || "0px";
    const nicoWidth =
      Number(accountItem.getAttribute("data-ncnl-account-width")) || 0;
    return `calc(${nicoBase} + ${String(nicoWidth)}px)`;
  }
  return getComputedStyle(accountItem).marginLeft || "0px";
};

const reserveAccountSpace = (accountItem: HTMLElement, width: number): void => {
  if (mountedAccountItem !== accountItem) {
    releaseAccountSpace();
    mountedAccountItem = accountItem;
    if (accountItem.hasAttribute("data-filter-matome-account-space")) {
      accountOriginalMarginLeft =
        accountItem.getAttribute(
          "data-filter-matome-account-original-margin",
        ) || "";
      accountBaseMarginLeft =
        accountItem.getAttribute("data-filter-matome-account-base-margin") ||
        "0px";
      accountReservedWidth =
        Number(accountItem.getAttribute("data-filter-matome-account-width")) ||
        0;
    } else {
      accountOriginalMarginLeft = accountItem.style.marginLeft;
      accountBaseMarginLeft = getAccountBaseMargin(accountItem);
    }
    accountItem.setAttribute("data-filter-matome-account-space", "true");
    accountItem.setAttribute(
      "data-filter-matome-account-original-margin",
      accountOriginalMarginLeft,
    );
    accountItem.setAttribute(
      "data-filter-matome-account-base-margin",
      accountBaseMarginLeft,
    );
  }
  const expectedMargin = `calc(${accountBaseMarginLeft} + ${String(width)}px)`;
  if (
    accountReservedWidth !== width ||
    accountItem.style.marginLeft !== expectedMargin
  ) {
    accountReservedWidth = width;
    accountItem.style.marginLeft = expectedMargin;
    accountItem.setAttribute("data-filter-matome-account-width", String(width));
  }
};

const positionNicoCacheBefore = (filterLeft: number, top: number): void => {
  const nicoCacheMenu = document.getElementById("ncnl_common_header_menu");
  if (
    !(nicoCacheMenu instanceof HTMLElement) ||
    nicoCacheMenu.dataset.ncnlMounted !== "account"
  ) {
    return;
  }
  const nicoWidth = Math.ceil(nicoCacheMenu.getBoundingClientRect().width);
  if (nicoWidth <= 0) return;
  nicoCacheMenu.style.left = `${Math.round(
    Math.max(0, filterLeft - nicoWidth),
  )}px`;
  nicoCacheMenu.style.top = `${Math.round(top)}px`;
};

const positionAccountMenu = (container: HTMLElement): void => {
  if (
    !mountedAccountItem?.isConnected ||
    container.dataset.filterMatomeMounted !== "account"
  ) {
    return;
  }
  const width = Math.ceil(container.getBoundingClientRect().width);
  if (width <= 0) return;
  reserveAccountSpace(mountedAccountItem, width);
  const accountRect = mountedAccountItem.getBoundingClientRect();
  const left = Math.max(0, accountRect.left - width);
  const popover = container.querySelector<HTMLElement>(
    ".filter-matome-api-status-popover",
  );
  const popoverWidth = popover
    ? Math.ceil(popover.getBoundingClientRect().width)
    : 0;
  container.dataset.filterMatomePopoverAlign =
    popoverWidth > 0 && left + width - popoverWidth < 0 ? "left" : "right";
  container.style.left = `${Math.round(left)}px`;
  container.style.top = `${Math.round(accountRect.top)}px`;
  positionNicoCacheBefore(left, accountRect.top);
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
  container.dataset.filterMatomeMounted = "account";
  if (container.parentElement !== document.body)
    document.body.append(container);
  const width = Math.ceil(container.getBoundingClientRect().width);
  if (width > 0) reserveAccountSpace(accountItem, width);
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
      container.parentElement === document.body &&
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
  const commonHeader = document.getElementById("CommonHeader");
  if (!commonHeader) return false;
  const placement = findPlacement(commonHeader);
  const existing = document.getElementById(CONTAINER_ID);
  const container =
    existing instanceof HTMLElement ? existing : createMenu(resolveStatuses);
  if (placement?.mounted === "account") {
    mountAccountMenu(container, placement.reference as HTMLElement);
  } else if (placement) {
    clearAccountMenuPosition(container);
    placement.parent.insertBefore(container, placement.reference);
    container.dataset.filterMatomeMounted = placement.mounted;
  } else {
    clearAccountMenuPosition(container);
    container.removeAttribute("data-filter-matome-mounted");
    if (container.parentElement !== commonHeader)
      commonHeader.append(container);
  }
  renderStatuses(container, resolveStatuses);
  return true;
};

export function startApiStatusMenuRuntime(
  resolveStatuses: ResolveStatuses,
): void {
  if (started) return;
  started = true;

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
    const commonHeader = document.getElementById("CommonHeader");
    const container = document.getElementById(CONTAINER_ID);
    const placement = commonHeader && findPlacement(commonHeader);
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
    setTimeout(() => initialize(resolveStatuses), 0);
  });
  window.addEventListener("resize", scheduleAccountMenuPosition);
  window.addEventListener("scroll", scheduleAccountMenuPosition, true);
  initialize(resolveStatuses);
}
