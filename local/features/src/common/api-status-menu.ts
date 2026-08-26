import { API_STATUS_MENU_STYLES } from "@/common/api-status-menu-styles.js";

const CONTAINER_ID = "filter-matome-api-status-menu";
const POPOVER_ID = "filter-matome-api-status-popover";
const STYLE_ID = "filter-matome-api-status-menu-styles";
const WATCH_PATH_PATTERN = /^\/watch\/[^/]+(?:\/|$)/u;

export type FilterMatomeApiStatusKind =
  "active" | "waiting" | "missing" | "incompatible" | "not-applicable";

export type FilterMatomeApiStatusId =
  "playback-rate" | "comment-reload" | "comment-menu";

export type FilterMatomeApiStatus = {
  id: FilterMatomeApiStatusId;
  kind: FilterMatomeApiStatusKind;
};

type Host = Record<string, unknown>;
type Placement = {
  anchor: Element;
  name: "account" | "service" | "fallback";
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

let observer: MutationObserver | null = null;
let mountScheduled = false;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const getCopy = (): Copy => {
  const language = document.documentElement.lang.toLowerCase().split("-")[0];
  return COPIES[language] ?? ENGLISH_COPY;
};

const versionedApiStatus = (
  candidate: unknown,
  methodNames: string[],
): FilterMatomeApiStatusKind => {
  if (candidate === undefined) {
    return "missing";
  }
  if (
    !isRecord(candidate) ||
    candidate["version"] !== 1 ||
    methodNames.some((name) => typeof candidate[name] !== "function")
  ) {
    return "incompatible";
  }
  return "active";
};

export function resolveFilterMatomeApiStatuses(
  host: Host,
  pathname: string,
): FilterMatomeApiStatus[] {
  if (!WATCH_PATH_PATTERN.test(pathname)) {
    return (["playback-rate", "comment-reload", "comment-menu"] as const).map(
      (id) => ({ id, kind: "not-applicable" }),
    );
  }

  const menuBridge = host["FilterMatomeCommentMenuBridgeApi"];
  const menuProviderStatus = versionedApiStatus(
    host["FilterMatomeCommentMenuApi"],
    ["getItems", "execute"],
  );
  let menuStatus: FilterMatomeApiStatusKind;
  if (menuBridge === undefined) {
    menuStatus =
      menuProviderStatus === "active" ? "waiting" : menuProviderStatus;
  } else if (isRecord(menuBridge) && menuBridge["version"] === 1) {
    menuStatus = menuProviderStatus;
  } else {
    menuStatus = "incompatible";
  }

  return [
    {
      id: "playback-rate",
      kind: versionedApiStatus(host["FilterMatomePlaybackRateApi"], [
        "get",
        "set",
      ]),
    },
    {
      id: "comment-reload",
      kind: versionedApiStatus(host["FilterMatomeCommentApi"], ["reload"]),
    },
    { id: "comment-menu", kind: menuStatus },
  ];
}

const getSummary = (
  statuses: FilterMatomeApiStatus[],
): "active" | "warning" | "error" => {
  if (
    statuses.some(({ kind }) => kind === "missing" || kind === "incompatible")
  ) {
    return "error";
  }
  if (statuses.some(({ kind }) => kind !== "active")) {
    return "warning";
  }
  return "active";
};

const applyStyles = (): void => {
  if (document.getElementById(STYLE_ID)) {
    return;
  }
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = API_STATUS_MENU_STYLES;
  (document.head ?? document.documentElement).append(style);
};

const findAccountItem = (root: Element): Element | null => {
  let best: { item: Element; depth: number } | null = null;
  for (const anchor of root.querySelectorAll<HTMLAnchorElement>("a[href]")) {
    try {
      const url = new URL(anchor.href, location.href);
      if (url.hostname !== "www.nicovideo.jp" || url.pathname !== "/my") {
        continue;
      }
      const item = anchor.parentElement;
      if (!item?.parentElement) {
        continue;
      }
      let depth = 0;
      let ancestor: Element | null = item;
      while (ancestor && ancestor !== root) {
        depth += 1;
        ancestor = ancestor.parentElement;
      }
      if (ancestor === root && (!best || depth < best.depth)) {
        best = { item, depth };
      }
    } catch {
      // Invalid links cannot identify the CommonHeader account item.
    }
  }
  return best?.item ?? null;
};

const findServicePlacement = (root: Element): Placement | null => {
  const serviceLinks = Array.from(
    root.querySelectorAll<HTMLAnchorElement>('a[href*="header_servicelink"]'),
  );
  const serviceLink = serviceLinks[serviceLinks.length - 1];
  if (!serviceLink) {
    return null;
  }
  return {
    anchor: serviceLink,
    name: "service",
  };
};

const findPlacement = (header: Element): Placement => {
  const root = header.querySelector(".nico-CommonHeaderRoot") ?? header;
  const accountItem = findAccountItem(root);
  if (accountItem) {
    return {
      anchor: accountItem,
      name: "account",
    };
  }
  return (
    findServicePlacement(root) ?? {
      anchor: root,
      name: "fallback",
    }
  );
};

const positionContainer = (
  container: HTMLElement,
  placement: Placement,
): void => {
  const nicoCacheMenu = document.getElementById("ncnl_common_header_menu");
  const nicoCacheRect = nicoCacheMenu?.getBoundingClientRect();
  const nicoCachePlacement = nicoCacheMenu?.dataset.ncnlMounted;
  const useNicoCacheAnchor =
    (nicoCachePlacement === "account" || nicoCachePlacement === "service") &&
    nicoCacheRect !== undefined &&
    nicoCacheRect.width > 0;
  const anchorRect = useNicoCacheAnchor
    ? nicoCacheRect
    : placement.anchor.getBoundingClientRect();
  const width = Math.ceil(container.getBoundingClientRect().width);
  const preferredLeft =
    useNicoCacheAnchor && nicoCachePlacement === "service"
      ? anchorRect.right
      : placement.name === "service"
        ? anchorRect.right
        : anchorRect.left - width;
  const left = Math.min(
    Math.max(0, preferredLeft),
    Math.max(0, window.innerWidth - width),
  );
  container.style.setProperty(
    "--filter-matome-api-status-trigger-left",
    `${Math.round(left)}px`,
  );
  container.style.setProperty(
    "--filter-matome-api-status-trigger-top",
    `${Math.round(Math.max(0, anchorRect.top))}px`,
  );
};

const setText = (element: HTMLElement | null, value: string): void => {
  if (element && element.textContent !== value) {
    element.textContent = value;
  }
};

const renderStatuses = (container: HTMLElement): void => {
  const copy = getCopy();
  const statuses = resolveFilterMatomeApiStatuses(window, location.pathname);
  container.dataset.summary = getSummary(statuses);
  const trigger = container.querySelector<HTMLButtonElement>("button");
  if (trigger) {
    trigger.setAttribute("aria-label", `${copy.trigger}: ${copy.title}`);
  }
  const heading = container.querySelector<HTMLElement>(
    ".filter-matome-api-status-heading",
  );
  const note = container.querySelector<HTMLElement>(
    ".filter-matome-api-status-note",
  );
  setText(heading, copy.title);
  setText(note, copy.note);

  for (const status of statuses) {
    const item = container.querySelector<HTMLElement>(
      `[data-api-id="${status.id}"]`,
    );
    if (!item) continue;
    item.dataset.status = status.kind;
    const name = item.querySelector<HTMLElement>(
      ".filter-matome-api-status-name",
    );
    const value = item.querySelector<HTMLElement>(
      ".filter-matome-api-status-value",
    );
    setText(name, copy.names[status.id]);
    setText(value, copy.states[status.kind]);
  }
};

const positionPopover = (container: HTMLElement): void => {
  const trigger = container.querySelector<HTMLButtonElement>("button");
  const popover = container.querySelector<HTMLElement>(
    ".filter-matome-api-status-popover",
  );
  if (!trigger || !popover) return;
  const rect = trigger.getBoundingClientRect();
  const margin = 8;
  const width = Math.min(360, Math.max(0, window.innerWidth - margin * 2));
  const left = Math.min(
    Math.max(margin, rect.right - width),
    Math.max(margin, window.innerWidth - width - margin),
  );
  const below = window.innerHeight - rect.bottom - margin;
  const above = rect.top - margin;
  const placeAbove = below < 160 && above > below;
  const measuredHeight = Math.min(popover.scrollHeight || 240, 420, above);
  const top = placeAbove
    ? Math.max(margin, rect.top - measuredHeight)
    : Math.min(rect.bottom, window.innerHeight - margin);
  container.dataset.popoverPlacement = placeAbove ? "above" : "below";
  container.style.setProperty("--filter-matome-api-status-left", `${left}px`);
  container.style.setProperty("--filter-matome-api-status-top", `${top}px`);
};

const setOpen = (container: HTMLElement, open: boolean): void => {
  container.dataset.open = open ? "true" : "false";
  const trigger = container.querySelector<HTMLButtonElement>("button");
  const popover = container.querySelector<HTMLElement>(
    ".filter-matome-api-status-popover",
  );
  trigger?.setAttribute("aria-expanded", open ? "true" : "false");
  popover?.setAttribute("aria-hidden", open ? "false" : "true");
  if (open) {
    renderStatuses(container);
    positionPopover(container);
  }
};

const createStatusItem = (id: FilterMatomeApiStatusId): HTMLLIElement => {
  const item = document.createElement("li");
  item.className = "filter-matome-api-status-item";
  item.dataset.apiId = id;
  item.dataset.status = "missing";
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

const createMenu = (): HTMLElement => {
  applyStyles();
  const container = document.createElement("div");
  container.id = CONTAINER_ID;
  container.dataset.open = "false";
  container.dataset.summary = "warning";

  const trigger = document.createElement("button");
  trigger.type = "button";
  trigger.className = "filter-matome-api-status-trigger";
  trigger.setAttribute("aria-haspopup", "true");
  trigger.setAttribute("aria-controls", POPOVER_ID);
  trigger.setAttribute("aria-expanded", "false");
  const summary = document.createElement("span");
  summary.className = "filter-matome-api-status-summary";
  summary.setAttribute("aria-hidden", "true");
  const label = document.createElement("span");
  label.textContent = "filter-matome";
  trigger.append(summary, label);

  const popover = document.createElement("section");
  popover.id = POPOVER_ID;
  popover.className = "filter-matome-api-status-popover";
  popover.setAttribute("aria-live", "polite");
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
  container.append(trigger, popover);

  container.addEventListener("mouseenter", () => setOpen(container, true));
  container.addEventListener("mouseleave", () => {
    if (!container.contains(document.activeElement)) setOpen(container, false);
  });
  container.addEventListener("focusin", () => setOpen(container, true));
  container.addEventListener("focusout", () => {
    setTimeout(() => {
      if (!container.contains(document.activeElement))
        setOpen(container, false);
    });
  });
  trigger.addEventListener("click", () => {
    setOpen(container, container.dataset.open !== "true");
  });
  container.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      setOpen(container, false);
      trigger.focus();
    }
  });
  renderStatuses(container);
  return container;
};

const mountMenu = (): void => {
  const header = document.getElementById("CommonHeader");
  if (!header) {
    document.getElementById(CONTAINER_ID)?.removeAttribute("data-mounted");
    return;
  }
  const placement = findPlacement(header);
  const container = document.getElementById(CONTAINER_ID) ?? createMenu();
  if (!(container instanceof HTMLElement)) return;
  if (container.parentElement !== document.body) {
    document.body.append(container);
  }
  container.dataset.mounted = "true";
  container.dataset.placement = placement.name;
  positionContainer(container, placement);
  renderStatuses(container);
};

const scheduleMount = (): void => {
  if (mountScheduled) return;
  mountScheduled = true;
  queueMicrotask(() => {
    mountScheduled = false;
    mountMenu();
  });
};

export function startApiStatusMenu(): void {
  if (observer) return;
  document.addEventListener("pointerdown", (event) => {
    const container = document.getElementById(CONTAINER_ID);
    if (
      container instanceof HTMLElement &&
      !container.contains(event.target as Node)
    ) {
      setOpen(container, false);
    }
  });
  const reposition = (): void => {
    mountMenu();
    const container = document.getElementById(CONTAINER_ID);
    if (container instanceof HTMLElement && container.dataset.open === "true") {
      renderStatuses(container);
      positionPopover(container);
    }
  };
  window.addEventListener("resize", reposition);
  window.addEventListener("scroll", reposition, true);
  window.addEventListener("popstate", scheduleMount);
  window.addEventListener("hashchange", scheduleMount);
  window.addEventListener("filter-matome:navigation", scheduleMount);
  observer = new MutationObserver(scheduleMount);
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
  mountMenu();
  setTimeout(scheduleMount, 1_000);
  setTimeout(scheduleMount, 5_000);
}
