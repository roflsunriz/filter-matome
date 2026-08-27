import {
  getBrowserVersionEndpoint,
  RawCdpClient,
  waitForTargetWebSocket,
} from "./raw-cdp-client";

interface BrowserContextResult {
  browserContextId: string;
}

interface TargetCreationResult {
  targetId: string;
}

interface EvaluationResult {
  result: {
    type: string;
    value?: unknown;
    description?: string;
  };
  exceptionDetails?: unknown;
}

interface CookieResult {
  cookies: unknown[];
}

interface MenuEvaluation {
  menuCount: number;
  nicoCacheMenuCount: number;
  summary: string;
  placement: string;
  menuPosition: string;
  popoverPosition: string;
  headerPosition: string;
  nicoCachePosition: string | null;
  statuses: Record<string, string>;
  container: { left: number; right: number; top: number; bottom: number };
  trigger: { left: number; right: number; top: number; bottom: number };
  popover: { left: number; right: number; top: number; bottom: number };
  nicoCacheMenu: {
    left: number;
    right: number;
    top: number;
    bottom: number;
  } | null;
  accountMenu: {
    left: number;
    right: number;
    top: number;
    bottom: number;
  } | null;
  viewport: { width: number; height: number };
}

const DEFAULT_CDP_ENDPOINT = "http://127.0.0.1:9222";
const DEFAULT_WATCH_URL = "https://www.nicovideo.jp/watch/sm9";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object";

const isBrowserContextResult = (
  value: unknown,
): value is BrowserContextResult =>
  isRecord(value) && typeof value.browserContextId === "string";

const isTargetCreationResult = (
  value: unknown,
): value is TargetCreationResult =>
  isRecord(value) && typeof value.targetId === "string";

const isEvaluationResult = (value: unknown): value is EvaluationResult =>
  isRecord(value) &&
  isRecord(value.result) &&
  typeof value.result.type === "string";

const isCookieResult = (value: unknown): value is CookieResult =>
  isRecord(value) && Array.isArray(value.cookies);

const isRect = (value: unknown): boolean =>
  isRecord(value) &&
  ["left", "right", "top", "bottom"].every(
    (key) => typeof value[key] === "number",
  );

const isMenuEvaluation = (value: unknown): value is MenuEvaluation =>
  isRecord(value) &&
  typeof value.menuCount === "number" &&
  typeof value.nicoCacheMenuCount === "number" &&
  typeof value.summary === "string" &&
  typeof value.placement === "string" &&
  typeof value.menuPosition === "string" &&
  typeof value.popoverPosition === "string" &&
  typeof value.headerPosition === "string" &&
  (value.nicoCachePosition === null ||
    typeof value.nicoCachePosition === "string") &&
  isRecord(value.statuses) &&
  Object.values(value.statuses).every((status) => typeof status === "string") &&
  isRect(value.container) &&
  isRect(value.trigger) &&
  isRect(value.popover) &&
  (value.nicoCacheMenu === null || isRect(value.nicoCacheMenu)) &&
  (value.accountMenu === null || isRect(value.accountMenu)) &&
  isRecord(value.viewport) &&
  typeof value.viewport.width === "number" &&
  typeof value.viewport.height === "number";

const parseArgument = (name: string): string | undefined => {
  const prefix = `--${name}=`;
  return process.argv
    .slice(2)
    .find((argument) => argument.startsWith(prefix))
    ?.slice(prefix.length);
};

const validateWatchUrl = (source: string): string => {
  const url = new URL(source);
  if (
    url.protocol !== "https:" ||
    url.hostname !== "www.nicovideo.jp" ||
    !/^\/watch\/[a-zA-Z0-9]+$/u.test(url.pathname)
  ) {
    throw new Error(`対象外のwatch URLです: ${source}`);
  }
  url.search = "";
  url.hash = "";
  return url.href;
};

const waitForLoad = (client: RawCdpClient, timeoutMs: number): Promise<void> =>
  new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      unsubscribe();
      reject(new Error("watchページのloadイベントがタイムアウトしました。"));
    }, timeoutMs);
    const unsubscribe = client.subscribe((event) => {
      if (event.method === "Page.loadEventFired") {
        clearTimeout(timeout);
        unsubscribe();
        resolve();
      }
    });
  });

const evaluate = async (
  client: RawCdpClient,
  expression: string,
): Promise<unknown> => {
  const evaluation = await client.send<unknown>("Runtime.evaluate", {
    expression,
    returnByValue: true,
  });
  if (
    !isEvaluationResult(evaluation) ||
    evaluation.exceptionDetails !== undefined
  ) {
    throw new Error(
      isEvaluationResult(evaluation)
        ? `Runtime.evaluateに失敗しました: ${evaluation.result.description ?? "unknown"}`
        : "Runtime.evaluateの応答形式が不正です。",
    );
  }
  return evaluation.result.value;
};

const waitForMenuReady = async (
  client: RawCdpClient,
  timeoutMs: number,
): Promise<void> => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const ready = await evaluate(
      client,
      `Boolean(
        document.getElementById("filter-matome-api-status-menu") &&
        globalThis.FilterMatomePlaybackRateApi?.version === 1 &&
        globalThis.FilterMatomeCommentApi?.version === 1 &&
        globalThis.FilterMatomeCommentMenuApi?.version === 1 &&
        document.querySelector('[data-api-id="playback-rate"]')?.getAttribute("data-status") === "active" &&
        document.querySelector('[data-api-id="comment-reload"]')?.getAttribute("data-status") === "active" &&
        document.querySelector('[data-api-id="comment-menu"]')?.getAttribute("data-status") === "active"
      )`,
    );
    if (ready === true) return;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  const diagnostic = await evaluate(
    client,
    `({
      menu: Boolean(document.getElementById("filter-matome-api-status-menu")),
      header: Boolean(document.getElementById("CommonHeader")),
      playback: globalThis.FilterMatomePlaybackRateApi?.version ?? null,
      reload: globalThis.FilterMatomeCommentApi?.version ?? null,
      commentMenu: globalThis.FilterMatomeCommentMenuApi?.version ?? null,
      statuses: Object.fromEntries(
        Array.from(document.querySelectorAll("[data-api-id]"), (item) => [
          item.getAttribute("data-api-id"),
          item.getAttribute("data-status"),
        ]),
      ),
    })`,
  );
  throw new Error(
    `CommonHeader API状態メニューの初期化がタイムアウトしました: ${JSON.stringify(diagnostic)}`,
  );
};

const assertInsideViewport = (
  rect: MenuEvaluation["popover"],
  viewport: MenuEvaluation["viewport"],
): void => {
  if (
    rect.left < 0 ||
    rect.top < 0 ||
    rect.right > viewport.width ||
    rect.bottom > viewport.height
  ) {
    throw new Error(
      `API状態ポップオーバーが画面外です: ${JSON.stringify({ rect, viewport })}`,
    );
  }
};

const main = async (): Promise<void> => {
  const cdpEndpoint = parseArgument("cdp") ?? DEFAULT_CDP_ENDPOINT;
  const watchUrl = validateWatchUrl(parseArgument("url") ?? DEFAULT_WATCH_URL);
  const version = await getBrowserVersionEndpoint(cdpEndpoint);
  const browserClient = await RawCdpClient.connect(
    version.webSocketDebuggerUrl,
  );
  let browserContextId: string | undefined;
  let targetId: string | undefined;

  try {
    const context = await browserClient.send<unknown>(
      "Target.createBrowserContext",
      { disposeOnDetach: true },
    );
    if (!isBrowserContextResult(context)) {
      throw new Error("Target.createBrowserContextの応答形式が不正です。");
    }
    browserContextId = context.browserContextId;
    const target = await browserClient.send<unknown>("Target.createTarget", {
      url: "about:blank",
      browserContextId,
    });
    if (!isTargetCreationResult(target)) {
      throw new Error("Target.createTargetの応答形式が不正です。");
    }
    targetId = target.targetId;
    const pageClient = await RawCdpClient.connect(
      await waitForTargetWebSocket(cdpEndpoint, targetId),
    );
    try {
      await Promise.all([
        pageClient.send("Page.enable"),
        pageClient.send("Runtime.enable"),
        pageClient.send("Network.enable"),
      ]);
      await pageClient.send("Network.setCacheDisabled", {
        cacheDisabled: true,
      });
      await pageClient.send("Network.setBypassServiceWorker", {
        bypass: true,
      });
      await pageClient.send("Emulation.setDeviceMetricsOverride", {
        width: 1280,
        height: 720,
        deviceScaleFactor: 1,
        mobile: false,
      });
      const cookies = await pageClient.send<unknown>("Network.getAllCookies");
      if (!isCookieResult(cookies) || cookies.cookies.length !== 0) {
        throw new Error(
          "隔離BrowserContextの開始時点でCookieが空ではありません。",
        );
      }

      const loaded = waitForLoad(pageClient, 45_000);
      await pageClient.send("Page.navigate", { url: watchUrl });
      await loaded;
      await waitForMenuReady(pageClient, 45_000);

      const result = await evaluate(
        pageClient,
        `(() => {
          const menu = document.getElementById("filter-matome-api-status-menu");
          const header = document.getElementById("CommonHeader");
          if (!(menu instanceof HTMLElement)) throw new Error("menu missing");
          menu.dispatchEvent(new MouseEvent("mouseenter"));
          const trigger = menu.querySelector("button");
          const popover = document.getElementById("filter-matome-api-status-popover");
          const nicoCacheMenu = document.getElementById("ncnl_common_header_menu");
          const accountMenu = Array.from(
            document.querySelectorAll("#CommonHeader a[href]"),
          ).find((anchor) => {
            try {
              const url = new URL(anchor.href, location.href);
              return url.hostname === "www.nicovideo.jp" && url.pathname === "/my";
            } catch {
              return false;
            }
          })?.parentElement;
          if (!(trigger instanceof HTMLElement) || !(popover instanceof HTMLElement)) {
            throw new Error("menu parts missing");
          }
          const toRect = (rect) => ({
            left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom,
          });
          return {
            menuCount: document.querySelectorAll("#filter-matome-api-status-menu").length,
            nicoCacheMenuCount: document.querySelectorAll("#ncnl_common_header_menu").length,
            summary: menu.dataset.summary ?? "",
            placement: menu.dataset.filterMatomeMounted ?? "",
            menuPosition: getComputedStyle(menu).position,
            popoverPosition: getComputedStyle(popover).position,
            headerPosition: header instanceof HTMLElement
              ? getComputedStyle(header).position
              : "missing",
            nicoCachePosition: nicoCacheMenu instanceof HTMLElement
              ? getComputedStyle(nicoCacheMenu).position
              : null,
            statuses: Object.fromEntries(
              Array.from(menu.querySelectorAll("[data-api-id]"), (item) => [
                item.getAttribute("data-api-id"), item.getAttribute("data-status"),
              ]),
            ),
            container: toRect(menu.getBoundingClientRect()),
            trigger: toRect(trigger.getBoundingClientRect()),
            popover: toRect(popover.getBoundingClientRect()),
            nicoCacheMenu: nicoCacheMenu instanceof HTMLElement
              ? toRect(nicoCacheMenu.getBoundingClientRect())
              : null,
            accountMenu: accountMenu instanceof HTMLElement
              ? toRect(accountMenu.getBoundingClientRect())
              : null,
            viewport: { width: innerWidth, height: innerHeight },
          };
        })()`,
      );
      if (!isMenuEvaluation(result)) {
        throw new Error("API状態メニューの評価結果が不正です。");
      }
      if (
        result.menuCount !== 1 ||
        !["account", "service"].includes(result.placement) ||
        result.menuPosition !==
          (result.placement === "account" ? "fixed" : "relative") ||
        result.popoverPosition !== "absolute" ||
        result.statuses["playback-rate"] !== "active" ||
        result.statuses["comment-reload"] !== "active" ||
        result.statuses["comment-menu"] !== "active"
      ) {
        throw new Error(`API状態が不正です: ${JSON.stringify(result)}`);
      }
      if (
        result.nicoCacheMenu &&
        result.nicoCacheMenu.right > result.nicoCacheMenu.left &&
        Math.abs(result.nicoCacheMenu.right - result.container.left) > 2
      ) {
        throw new Error(
          `filter-matomeメニューがNicoCacheメニューの直後にありません: ${JSON.stringify(result)}`,
        );
      }
      if (
        result.placement === "account" &&
        (result.nicoCachePosition !== "fixed" ||
          !result.accountMenu ||
          Math.abs(result.container.right - result.accountMenu.left) > 2)
      ) {
        throw new Error(
          "filter-matomeメニューがNicoCacheとアカウントの間にありません。",
        );
      }
      assertInsideViewport(result.popover, result.viewport);
      console.log(`[api-status-menu-live] verified: ${watchUrl}`);
      console.log(
        `[api-status-menu-live] playback=${result.statuses["playback-rate"]} / reload=${result.statuses["comment-reload"]} / menu=${result.statuses["comment-menu"]} / placement=${result.placement} / NicoCache menu=${String(result.nicoCacheMenuCount)}`,
      );
    } finally {
      pageClient.close();
    }
  } finally {
    if (targetId) {
      await browserClient
        .send("Target.closeTarget", { targetId })
        .catch(() => undefined);
    }
    if (browserContextId) {
      await browserClient
        .send("Target.disposeBrowserContext", { browserContextId })
        .catch(() => undefined);
    }
    browserClient.close();
  }
};

await main();
