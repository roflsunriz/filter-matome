import { toastr } from "@/common/toastr.js";

const OSHIRASEBOX_ORIGIN = "https://api.oshirasebox.nicovideo.jp";
const OSHIRASEBOX_BOX_PATH = "/v1/box";
const OSHIRASEBOX_FRONTEND_ID = "135";
const MAX_NOTIFICATION_PAGES = 100;
const MAX_NOTIFICATION_COUNT = 5_000;
const DEFAULT_PUT_CONCURRENCY = 4;
const SETTINGS_LINK_SELECTOR = '#CommonHeader a[href*="/oshirase/settings"]';
const BUTTON_ATTRIBUTE = "data-filter-matome-notification-read-all";
const BUTTON_SELECTOR = `[${BUTTON_ATTRIBUTE}="true"]`;
const STYLE_ID = "filter-matome-notification-read-all-styles";

type FetchLike = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

type NotificationRecord = {
  id: string;
  read: boolean;
};

type NotificationPage = {
  notifications: NotificationRecord[];
  nextUrl: string | null;
};

export type NotificationReadAllOptions = {
  fetcher?: FetchLike;
  frontendId?: string;
  requestUrl?: string;
  concurrency?: number;
};

export type NotificationReadAllResult = {
  unreadCount: number;
  succeededCount: number;
  failedIds: string[];
};

export class NotificationReadAllError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "NotificationReadAllError";
  }
}

type Copy = {
  title: string;
  button: string;
  busy: string;
  success: (count: number) => string;
  noUnread: string;
  partial: (success: number, failure: number) => string;
  failure: string;
};

const COPIES: Record<string, Copy> = {
  ja: {
    title: "お知らせ",
    button: "すべて既読",
    busy: "既読処理中…",
    success: (count) => `${String(count)}件の通知を既読にしました。`,
    noUnread: "未読の通知はありません。",
    partial: (success, failure) =>
      `${String(success)}件を既読にしました。${String(failure)}件は失敗したため、もう一度お試しください。`,
    failure: "通知を既読にできませんでした。時間をおいて再度お試しください。",
  },
  en: {
    title: "Notifications",
    button: "Mark all read",
    busy: "Marking as read…",
    success: (count) => `Marked ${String(count)} notifications as read.`,
    noUnread: "There are no unread notifications.",
    partial: (success, failure) =>
      `Marked ${String(success)} as read. ${String(failure)} failed; please try again.`,
    failure: "Could not mark notifications as read. Please try again later.",
  },
  zh: {
    title: "通知",
    button: "全部标为已读",
    busy: "正在标为已读…",
    success: (count) => `已将${String(count)}条通知标为已读。`,
    noUnread: "没有未读通知。",
    partial: (success, failure) =>
      `已将${String(success)}条标为已读，${String(failure)}条失败，请重试。`,
    failure: "无法将通知标为已读，请稍后重试。",
  },
  hi: {
    title: "सूचनाएँ",
    button: "सभी को पढ़ा मानें",
    busy: "पढ़ा हुआ किया जा रहा है…",
    success: (count) => `${String(count)} सूचनाएँ पढ़ी हुई कर दी गईं।`,
    noUnread: "कोई अपठित सूचना नहीं है।",
    partial: (success, failure) =>
      `${String(success)} सफल, ${String(failure)} विफल। कृपया फिर प्रयास करें।`,
    failure: "सूचनाएँ पढ़ी हुई नहीं की जा सकीं। बाद में फिर प्रयास करें।",
  },
  es: {
    title: "Notificaciones",
    button: "Marcar todo leído",
    busy: "Marcando como leído…",
    success: (count) =>
      `Se marcaron ${String(count)} notificaciones como leídas.`,
    noUnread: "No hay notificaciones sin leer.",
    partial: (success, failure) =>
      `${String(success)} correctas y ${String(failure)} fallidas. Inténtalo de nuevo.`,
    failure: "No se pudieron marcar las notificaciones. Inténtalo más tarde.",
  },
  fr: {
    title: "Notifications",
    button: "Tout marquer comme lu",
    busy: "Marquage en cours…",
    success: (count) => `${String(count)} notifications marquées comme lues.`,
    noUnread: "Aucune notification non lue.",
    partial: (success, failure) =>
      `${String(success)} réussies, ${String(failure)} échouées. Réessayez.`,
    failure: "Impossible de marquer les notifications. Réessayez plus tard.",
  },
  ar: {
    title: "الإشعارات",
    button: "تحديد الكل كمقروء",
    busy: "جارٍ التحديد كمقروء…",
    success: (count) => `تم تحديد ${String(count)} من الإشعارات كمقروءة.`,
    noUnread: "لا توجد إشعارات غير مقروءة.",
    partial: (success, failure) =>
      `نجح ${String(success)} وفشل ${String(failure)}. يرجى المحاولة مجددًا.`,
    failure: "تعذر تحديد الإشعارات كمقروءة. حاول لاحقًا.",
  },
  pt: {
    title: "Notificações",
    button: "Marcar tudo como lido",
    busy: "Marcando como lido…",
    success: (count) => `${String(count)} notificações marcadas como lidas.`,
    noUnread: "Não há notificações não lidas.",
    partial: (success, failure) =>
      `${String(success)} concluídas e ${String(failure)} falharam. Tente novamente.`,
    failure: "Não foi possível marcar as notificações. Tente mais tarde.",
  },
  bn: {
    title: "বিজ্ঞপ্তি",
    button: "সব পড়া হিসেবে চিহ্নিত করুন",
    busy: "পড়া হিসেবে চিহ্নিত হচ্ছে…",
    success: (count) =>
      `${String(count)}টি বিজ্ঞপ্তি পড়া হিসেবে চিহ্নিত হয়েছে।`,
    noUnread: "কোনো অপঠিত বিজ্ঞপ্তি নেই।",
    partial: (success, failure) =>
      `${String(success)}টি সফল, ${String(failure)}টি ব্যর্থ। আবার চেষ্টা করুন।`,
    failure: "বিজ্ঞপ্তি পড়া হিসেবে চিহ্নিত করা যায়নি। পরে চেষ্টা করুন।",
  },
  ru: {
    title: "Уведомления",
    button: "Отметить всё прочитанным",
    busy: "Отмечаем прочитанным…",
    success: (count) => `Прочитанными отмечено: ${String(count)}.`,
    noUnread: "Нет непрочитанных уведомлений.",
    partial: (success, failure) =>
      `Успешно: ${String(success)}, с ошибкой: ${String(failure)}. Повторите попытку.`,
    failure: "Не удалось отметить уведомления. Повторите попытку позже.",
  },
  ur: {
    title: "اطلاعات",
    button: "سب کو پڑھا ہوا کریں",
    busy: "پڑھا ہوا کیا جا رہا ہے…",
    success: (count) => `${String(count)} اطلاعات کو پڑھا ہوا کر دیا گیا۔`,
    noUnread: "کوئی غیر پڑھی اطلاع نہیں ہے۔",
    partial: (success, failure) =>
      `${String(success)} کامیاب، ${String(failure)} ناکام۔ دوبارہ کوشش کریں۔`,
    failure: "اطلاعات کو پڑھا ہوا نہیں کیا جا سکا۔ بعد میں کوشش کریں۔",
  },
};

let observer: MutationObserver | null = null;
let insertionScheduled = false;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const normalizeNotificationId = (value: unknown): string | null => {
  if (typeof value === "string" && value.trim().length > 0) {
    return value;
  }
  if (typeof value === "number" && Number.isSafeInteger(value) && value >= 0) {
    return String(value);
  }
  return null;
};

const parseNotificationPage = (value: unknown): NotificationPage => {
  if (!isRecord(value) || !isRecord(value.data)) {
    throw new NotificationReadAllError("Invalid notification response");
  }

  const notifications = value.data.notifications;
  if (!Array.isArray(notifications)) {
    throw new NotificationReadAllError("Invalid notification list");
  }

  const parsed = notifications.map((notification) => {
    if (!isRecord(notification)) {
      throw new NotificationReadAllError("Invalid notification item");
    }
    const id = normalizeNotificationId(notification.id);
    if (id === null || typeof notification.read !== "boolean") {
      throw new NotificationReadAllError("Invalid notification item fields");
    }
    return { id, read: notification.read };
  });

  const nextUrl = value.data.nextUrl;
  if (
    nextUrl !== undefined &&
    nextUrl !== null &&
    typeof nextUrl !== "string"
  ) {
    throw new NotificationReadAllError("Invalid notification next URL");
  }

  return {
    notifications: parsed,
    nextUrl: typeof nextUrl === "string" && nextUrl.length > 0 ? nextUrl : null,
  };
};

const getDefaultRequestUrl = (): string =>
  typeof location === "undefined" ? "https://www.nicovideo.jp/" : location.href;

const createHeaders = (
  frontendId: string,
  requestUrl: string,
): Record<string, string> => ({
  "X-Frontend-Id": frontendId,
  "X-Request-With": requestUrl,
});

const ensureSuccessfulResponse = async (
  response: Response,
): Promise<unknown> => {
  if (!response.ok) {
    throw new NotificationReadAllError(
      `Notification API returned HTTP ${String(response.status)}`,
      response.status,
    );
  }
  try {
    return await response.json();
  } catch {
    throw new NotificationReadAllError(
      "Notification API returned invalid JSON",
    );
  }
};

const resolvePageUrl = (value: string): URL => {
  let url: URL;
  try {
    url = new URL(value, OSHIRASEBOX_ORIGIN);
  } catch {
    throw new NotificationReadAllError("Invalid notification page URL");
  }

  if (
    url.origin !== OSHIRASEBOX_ORIGIN ||
    url.pathname !== OSHIRASEBOX_BOX_PATH ||
    url.username !== "" ||
    url.password !== "" ||
    url.hash !== ""
  ) {
    throw new NotificationReadAllError("Untrusted notification page URL");
  }
  return url;
};

export const collectUnreadNotificationIds = async (
  options: NotificationReadAllOptions = {},
): Promise<string[]> => {
  const fetcher = options.fetcher ?? fetch;
  const frontendId = options.frontendId ?? OSHIRASEBOX_FRONTEND_ID;
  const requestUrl = options.requestUrl ?? getDefaultRequestUrl();
  const firstPage = new URL(OSHIRASEBOX_BOX_PATH, OSHIRASEBOX_ORIGIN);
  firstPage.searchParams.set("offset", "0");
  firstPage.searchParams.set("importantOnly", "false");

  const visited = new Set<string>();
  const unreadIds = new Set<string>();
  let notificationCount = 0;
  let currentUrl: URL | null = firstPage;

  while (currentUrl !== null) {
    if (visited.size >= MAX_NOTIFICATION_PAGES) {
      throw new NotificationReadAllError("Notification page limit exceeded");
    }
    if (visited.has(currentUrl.href)) {
      throw new NotificationReadAllError("Notification page loop detected");
    }
    visited.add(currentUrl.href);

    const response = await fetcher(currentUrl, {
      method: "GET",
      mode: "cors",
      credentials: "include",
      headers: createHeaders(frontendId, requestUrl),
    });
    const page = parseNotificationPage(
      await ensureSuccessfulResponse(response),
    );
    notificationCount += page.notifications.length;
    if (notificationCount > MAX_NOTIFICATION_COUNT) {
      throw new NotificationReadAllError("Notification count limit exceeded");
    }

    for (const notification of page.notifications) {
      if (!notification.read) {
        unreadIds.add(notification.id);
      }
    }
    currentUrl = page.nextUrl === null ? null : resolvePageUrl(page.nextUrl);
  }

  return [...unreadIds];
};

const markNotificationRead = async (
  id: string,
  options: Required<
    Pick<NotificationReadAllOptions, "fetcher" | "frontendId" | "requestUrl">
  >,
): Promise<void> => {
  const { fetcher } = options;
  const url = new URL(
    `/v1/notifications/${encodeURIComponent(id)}/read`,
    OSHIRASEBOX_ORIGIN,
  );
  const response = await fetcher(url, {
    method: "PUT",
    mode: "cors",
    credentials: "include",
    headers: {
      ...createHeaders(options.frontendId, options.requestUrl),
      "Content-Type": "application/json",
    },
  });
  if (!response.ok) {
    throw new NotificationReadAllError(
      `Notification read API returned HTTP ${String(response.status)}`,
      response.status,
    );
  }
};

const isFatalWriteError = (error: unknown): boolean =>
  error instanceof NotificationReadAllError &&
  (error.status === 401 || error.status === 403 || error.status === 429);

export const markAllNotificationsRead = async (
  options: NotificationReadAllOptions = {},
): Promise<NotificationReadAllResult> => {
  const fetcher = options.fetcher ?? fetch;
  const frontendId = options.frontendId ?? OSHIRASEBOX_FRONTEND_ID;
  const requestUrl = options.requestUrl ?? getDefaultRequestUrl();
  const concurrency = Math.max(
    1,
    Math.min(8, Math.floor(options.concurrency ?? DEFAULT_PUT_CONCURRENCY)),
  );
  const unreadIds = await collectUnreadNotificationIds({
    fetcher,
    frontendId,
    requestUrl,
  });

  const succeeded = new Set<string>();
  const failed = new Set<string>();
  let cursor = 0;
  let stopRemainingWrites = false;

  const worker = async (): Promise<void> => {
    while (!stopRemainingWrites) {
      const index = cursor;
      cursor += 1;
      const id = unreadIds[index];
      if (id === undefined) {
        return;
      }
      try {
        await markNotificationRead(id, { fetcher, frontendId, requestUrl });
        succeeded.add(id);
      } catch (error) {
        failed.add(id);
        if (isFatalWriteError(error)) {
          stopRemainingWrites = true;
        }
      }
    }
  };

  await Promise.all(
    Array.from({ length: Math.min(concurrency, unreadIds.length) }, worker),
  );

  for (const id of unreadIds) {
    if (!succeeded.has(id) && !failed.has(id)) {
      failed.add(id);
    }
  }

  return {
    unreadCount: unreadIds.length,
    succeededCount: succeeded.size,
    failedIds: [...failed],
  };
};

const getCopy = (): Copy => {
  const language = document.documentElement.lang.toLowerCase().split("-")[0];
  return COPIES[language] ?? COPIES.en;
};

const applyStyles = (): void => {
  if (document.getElementById(STYLE_ID)) {
    return;
  }
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
#CommonHeader ${BUTTON_SELECTOR} {
  appearance: none;
  background: #fff;
  border: 1px solid #d5d5d5;
  border-radius: 4px;
  color: #333;
  cursor: pointer;
  flex: 0 0 auto;
  font: 600 12px/1.4 system-ui, sans-serif;
  margin-inline-start: auto;
  margin-inline-end: 6px;
  max-width: min(12rem, 48vw);
  overflow: hidden;
  padding: 5px 8px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

#CommonHeader ${BUTTON_SELECTOR}:hover {
  background: #f4f4f4;
}

#CommonHeader ${BUTTON_SELECTOR}:focus-visible {
  outline: 2px solid #0180ff;
  outline-offset: 2px;
}

#CommonHeader ${BUTTON_SELECTOR}:disabled {
  cursor: progress;
  opacity: 0.65;
}
`;
  document.head.append(style);
};

const findBellTrigger = (
  settingsLink: HTMLAnchorElement,
): HTMLElement | null => {
  const commonHeader = settingsLink.closest("#CommonHeader");
  if (!(commonHeader instanceof HTMLElement)) {
    return null;
  }

  let branch: HTMLElement = settingsLink;
  while (branch.parentElement && branch.parentElement !== commonHeader) {
    const parent = branch.parentElement;
    const candidates = Array.from(parent.children).filter(
      (child): child is HTMLElement =>
        child instanceof HTMLElement &&
        child !== branch &&
        child.querySelector("svg") !== null &&
        child.querySelector("a, button, input, select, textarea") === null,
    );
    if (candidates.length === 1) {
      return candidates[0];
    }
    branch = parent;
  }
  return null;
};

const handleButtonClick = async (
  button: HTMLButtonElement,
  settingsLink: HTMLAnchorElement,
): Promise<void> => {
  if (button.disabled) {
    return;
  }
  const copy = getCopy();
  button.disabled = true;
  button.setAttribute("aria-busy", "true");
  button.textContent = copy.busy;

  try {
    const result = await markAllNotificationsRead();
    if (result.failedIds.length > 0) {
      toastr.warning(
        copy.partial(result.succeededCount, result.failedIds.length),
        copy.title,
      );
      return;
    }

    if (result.unreadCount === 0) {
      toastr.info(copy.noUnread, copy.title);
    } else {
      toastr.success(copy.success(result.succeededCount), copy.title);
    }
    findBellTrigger(settingsLink)?.click();
  } catch (error) {
    window.logger?.error("[NotificationReadAll] 処理に失敗しました", error);
    toastr.error(copy.failure, copy.title);
  } finally {
    if (button.isConnected) {
      button.disabled = false;
      button.removeAttribute("aria-busy");
      button.textContent = copy.button;
    }
  }
};

const insertButtonForSettingsLink = (settingsLink: HTMLAnchorElement): void => {
  const container = settingsLink.parentElement;
  if (!container || container.querySelector(BUTTON_SELECTOR)) {
    return;
  }

  const copy = getCopy();
  const button = document.createElement("button");
  button.type = "button";
  button.setAttribute(BUTTON_ATTRIBUTE, "true");
  button.setAttribute("aria-label", copy.button);
  button.textContent = copy.button;
  button.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    void handleButtonClick(button, settingsLink);
  });
  container.insertBefore(button, settingsLink);
};

const installButtons = (): void => {
  document
    .querySelectorAll<HTMLAnchorElement>(SETTINGS_LINK_SELECTOR)
    .forEach(insertButtonForSettingsLink);
};

const scheduleButtonInstallation = (): void => {
  if (insertionScheduled) {
    return;
  }
  insertionScheduled = true;
  queueMicrotask(() => {
    insertionScheduled = false;
    installButtons();
  });
};

export const startNotificationReadAll = (): void => {
  applyStyles();
  installButtons();

  if (observer) {
    return;
  }
  observer = new MutationObserver((mutations) => {
    const hasRelevantAddition = mutations.some((mutation) =>
      Array.from(mutation.addedNodes).some(
        (node) =>
          node instanceof Element &&
          (node.matches("#CommonHeader") ||
            node.matches(SETTINGS_LINK_SELECTOR) ||
            node.querySelector(SETTINGS_LINK_SELECTOR) !== null),
      ),
    );
    if (hasRelevantAddition) {
      scheduleButtonInstallation();
    }
  });
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
};
