import {
  cancelFetch,
  extractVideoId,
  getFetchStatus,
  startFetch,
  type MovieFetcherStatus,
} from "./core";

type MovieFetcherWindow = Window & {
  __filterMatomeMovieFetcherStarted?: boolean;
};

const runtimeWindow = window as MovieFetcherWindow;
const BUTTON_CLASS = "filter-matome-movie-fetcher";
const CARD_SELECTOR =
  '[data-decoration-video-id], [data-anchor-href*="/watch/"], a[href*="/watch/"]';
const TERMINAL = new Set(["idle", "canceled", "completed", "failed"]);

const messages = {
  ja: {
    start: "動画をキャッシュ",
    cancel: "取得を中止",
    done: "取得完了",
    failed: "取得失敗",
  },
  en: {
    start: "Cache video",
    cancel: "Cancel download",
    done: "Cached",
    failed: "Download failed",
  },
  zh: {
    start: "缓存视频",
    cancel: "取消下载",
    done: "缓存完成",
    failed: "下载失败",
  },
  hi: {
    start: "वीडियो कैश करें",
    cancel: "डाउनलोड रद्द करें",
    done: "कैश पूर्ण",
    failed: "डाउनलोड विफल",
  },
  es: {
    start: "Guardar vídeo",
    cancel: "Cancelar descarga",
    done: "Guardado",
    failed: "Error de descarga",
  },
  fr: {
    start: "Mettre en cache",
    cancel: "Annuler",
    done: "Terminé",
    failed: "Échec",
  },
  ar: {
    start: "تخزين الفيديو",
    cancel: "إلغاء التنزيل",
    done: "اكتمل التخزين",
    failed: "فشل التنزيل",
  },
  pt: {
    start: "Armazenar vídeo",
    cancel: "Cancelar download",
    done: "Concluído",
    failed: "Falha",
  },
  bn: {
    start: "ভিডিও ক্যাশ করুন",
    cancel: "ডাউনলোড বাতিল",
    done: "ক্যাশ সম্পূর্ণ",
    failed: "ডাউনলোড ব্যর্থ",
  },
  ru: {
    start: "Сохранить видео",
    cancel: "Отменить",
    done: "Сохранено",
    failed: "Ошибка",
  },
} as const;

type MessageKey = keyof (typeof messages)["ja"];

function text(key: MessageKey): string {
  const language = document.documentElement.lang.toLowerCase().split("-")[0];
  return messages[language as keyof typeof messages]?.[key] ?? messages.en[key];
}

function setButtonState(
  button: HTMLButtonElement,
  status: MovieFetcherStatus,
): void {
  button.dataset.status = status.status;
  const active = !TERMINAL.has(status.status);
  const label =
    status.status === "completed"
      ? text("done")
      : status.status === "failed"
        ? text("failed")
        : active
          ? text("cancel")
          : text("start");
  const progress =
    status.total > 0 ? ` ${status.completed}/${status.total}` : "";
  const error =
    status.status === "failed" && status.error ? `: ${status.error}` : "";
  button.title = `${label}${progress}${error}`;
  button.setAttribute("aria-label", button.title);
  button.textContent = status.status === "completed" ? "✓" : active ? "■" : "↓";
}

async function monitor(
  button: HTMLButtonElement,
  videoId: string,
): Promise<void> {
  while (button.isConnected) {
    const status = await getFetchStatus(videoId);
    setButtonState(button, status);
    if (TERMINAL.has(status.status)) return;
    await new Promise((resolve) => window.setTimeout(resolve, 1_000));
  }
}

async function handleClick(
  button: HTMLButtonElement,
  videoId: string,
): Promise<void> {
  button.disabled = true;
  try {
    const current = await getFetchStatus(videoId);
    if (!TERMINAL.has(current.status)) {
      setButtonState(button, await cancelFetch(videoId));
      return;
    }
    setButtonState(button, {
      videoId,
      status: "queued",
      completed: 0,
      total: 0,
    });
    setButtonState(button, await startFetch(videoId));
    button.disabled = false;
    await monitor(button, videoId);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[movie-fetcher] ${videoId}: ${message}`);
    setButtonState(button, {
      videoId,
      status: "failed",
      completed: 0,
      total: 0,
      error: message,
    });
  } finally {
    button.disabled = false;
  }
}

function candidateVideoId(element: Element): string | null {
  const direct = element.getAttribute("data-decoration-video-id");
  if (direct && /^[a-z]{2}\d+$/i.test(direct)) return direct.toLowerCase();
  const href =
    element.getAttribute("data-anchor-href") ??
    (element instanceof HTMLAnchorElement ? element.href : null) ??
    element.querySelector<HTMLAnchorElement>('a[href*="/watch/"]')?.href;
  return href ? extractVideoId(href) : null;
}

function findCard(element: Element): HTMLElement | null {
  return element.closest<HTMLElement>("[data-group], article, li");
}

function decorate(root: ParentNode): void {
  const candidates = root.querySelectorAll<Element>(CARD_SELECTOR);
  for (const candidate of candidates) {
    const videoId = candidateVideoId(candidate);
    const card = findCard(candidate);
    if (!videoId || !card || card.querySelector(`:scope > .${BUTTON_CLASS}`)) {
      continue;
    }
    const button = document.createElement("button");
    button.type = "button";
    button.className = BUTTON_CLASS;
    button.dataset.videoId = videoId;
    setButtonState(button, {
      videoId,
      status: "idle",
      completed: 0,
      total: 0,
    });
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      void handleClick(button, videoId);
    });
    card.classList.add("filter-matome-movie-fetcher-host");
    card.append(button);
  }
}

function installStyle(): void {
  if (document.getElementById("filter-matome-movie-fetcher-style")) return;
  const style = document.createElement("style");
  style.id = "filter-matome-movie-fetcher-style";
  style.textContent = `
    .filter-matome-movie-fetcher-host { position: relative; }
    .${BUTTON_CLASS} {
      position: absolute; inset-block-start: 6px; inset-inline-end: 6px;
      z-index: 3; width: 30px; height: 30px; border: 1px solid #8888;
      border-radius: 50%; color: #fff; background: #18181ccc;
      font: 700 18px/1 sans-serif; cursor: pointer;
    }
    .${BUTTON_CLASS}[data-status="fetching"],
    .${BUTTON_CLASS}[data-status="queued"] { background: #0068b7e6; }
    .${BUTTON_CLASS}[data-status="completed"] { background: #16853be6; }
    .${BUTTON_CLASS}[data-status="failed"] { background: #b3261ee6; }
    .${BUTTON_CLASS}:disabled { opacity: .65; cursor: wait; }
  `;
  document.head.append(style);
}

export function startMovieFetcher(): void {
  if (runtimeWindow.__filterMatomeMovieFetcherStarted) return;
  runtimeWindow.__filterMatomeMovieFetcherStarted = true;
  installStyle();
  decorate(document);
  new MutationObserver((records) => {
    for (const record of records) {
      for (const node of record.addedNodes) {
        if (node instanceof Element) {
          if (node.matches(CARD_SELECTOR))
            decorate(node.parentNode ?? document);
          else decorate(node);
        }
      }
    }
  }).observe(document.body, { childList: true, subtree: true });
}
