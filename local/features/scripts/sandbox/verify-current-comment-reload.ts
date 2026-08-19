import {
  type CdpEvent,
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

interface RequestWillBeSentEvent {
  requestId: string;
  request: {
    method: string;
    url: string;
  };
}

interface ResponseReceivedEvent {
  requestId: string;
  response: {
    status: number;
    url: string;
  };
}

interface NavigationState {
  href: string;
  timeOrigin: number;
}

interface ReloadEvaluation {
  apiVersion: number;
  before: NavigationState & { lastUpdated: number };
  after: NavigationState & { lastUpdated: number };
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

const isRequestWillBeSentEvent = (
  value: unknown,
): value is RequestWillBeSentEvent =>
  isRecord(value) &&
  typeof value.requestId === "string" &&
  isRecord(value.request) &&
  typeof value.request.method === "string" &&
  typeof value.request.url === "string";

const isResponseReceivedEvent = (
  value: unknown,
): value is ResponseReceivedEvent =>
  isRecord(value) &&
  typeof value.requestId === "string" &&
  isRecord(value.response) &&
  typeof value.response.status === "number" &&
  typeof value.response.url === "string";

const isNavigationState = (value: unknown): value is NavigationState =>
  isRecord(value) &&
  typeof value.href === "string" &&
  typeof value.timeOrigin === "number";

const isReloadEvaluation = (value: unknown): value is ReloadEvaluation =>
  isRecord(value) &&
  value.apiVersion === 1 &&
  isRecord(value.before) &&
  isNavigationState(value.before) &&
  typeof value.before.lastUpdated === "number" &&
  isRecord(value.after) &&
  isNavigationState(value.after) &&
  typeof value.after.lastUpdated === "number";

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

const eventParams = (event: CdpEvent): Record<string, unknown> =>
  event.params ?? {};

const isCommentReloadRequest = (url: string, method: string): boolean => {
  try {
    const parsed = new URL(url);
    return (
      method.toUpperCase() === "POST" &&
      parsed.protocol === "https:" &&
      (parsed.hostname === "public.nvcomment.nicovideo.jp" ||
        parsed.hostname.endsWith(".nvcomment.nicovideo.jp")) &&
      parsed.pathname === "/v1/threads"
    );
  } catch {
    return false;
  }
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
  awaitPromise = false,
): Promise<unknown> => {
  const evaluation = await client.send<unknown>("Runtime.evaluate", {
    expression,
    awaitPromise,
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

const waitForCommentFilterReady = async (
  client: RawCdpClient,
  timeoutMs: number,
): Promise<void> => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const ready = await evaluate(
      client,
      `Boolean(
        globalThis.FilterMatomeCommentApi?.version === 1 &&
        typeof globalThis.FilterMatomeCommentApi?.reload === "function" &&
        globalThis.CommentFilter2Instance?.isReady?.() === true &&
        globalThis.CommentFilter2Data?.originalData &&
        typeof globalThis.CommentFilter2Data?.lastUpdated === "number"
      )`,
    );
    if (ready === true) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(
    "公式コメント再取得APIとcomment-filter2の初期化がタイムアウトしました。",
  );
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

    const pageWebSocket = await waitForTargetWebSocket(cdpEndpoint, targetId);
    const pageClient = await RawCdpClient.connect(pageWebSocket);
    const reloadRequestIds = new Set<string>();
    const reloadStatuses = new Map<string, number>();
    const unsubscribe = pageClient.subscribe((event) => {
      const params = eventParams(event);
      if (
        event.method === "Network.requestWillBeSent" &&
        isRequestWillBeSentEvent(params) &&
        isCommentReloadRequest(params.request.url, params.request.method)
      ) {
        reloadRequestIds.add(params.requestId);
      }
      if (
        event.method === "Network.responseReceived" &&
        isResponseReceivedEvent(params) &&
        reloadRequestIds.has(params.requestId)
      ) {
        reloadStatuses.set(params.requestId, params.response.status);
      }
    });

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

      const cookiesBefore = await pageClient.send<unknown>(
        "Network.getAllCookies",
      );
      if (
        !isCookieResult(cookiesBefore) ||
        cookiesBefore.cookies.length !== 0
      ) {
        throw new Error(
          "隔離BrowserContextの開始時点でCookieが空ではありません。",
        );
      }

      const loaded = waitForLoad(pageClient, 45_000);
      await pageClient.send("Page.navigate", { url: watchUrl });
      await loaded;
      await waitForCommentFilterReady(pageClient, 45_000);

      const initialRequestIds = new Set(reloadRequestIds);
      const evaluation = await evaluate(
        pageClient,
        `(async () => {
          const api = globalThis.FilterMatomeCommentApi;
          const data = globalThis.CommentFilter2Data;
          if (
            api?.version !== 1 ||
            typeof api.reload !== "function" ||
            typeof data?.lastUpdated !== "number"
          ) {
            throw new Error("comment reload API is unavailable");
          }
          const before = {
            href: location.href,
            timeOrigin: performance.timeOrigin,
            lastUpdated: data.lastUpdated,
          };
          await api.reload();
          const after = {
            href: location.href,
            timeOrigin: performance.timeOrigin,
            lastUpdated: globalThis.CommentFilter2Data?.lastUpdated ?? 0,
          };
          return { apiVersion: api.version, before, after };
        })()`,
        true,
      );
      if (!isReloadEvaluation(evaluation)) {
        throw new Error("コメント再取得後の評価結果が不正です。");
      }

      const currentRequestIds = [...reloadRequestIds].filter(
        (requestId) => !initialRequestIds.has(requestId),
      );
      const reloadRequestCount = currentRequestIds.length;
      const currentStatuses = currentRequestIds
        .map((requestId) => reloadStatuses.get(requestId))
        .filter((status): status is number => status !== undefined);
      if (reloadRequestCount !== 1 || currentStatuses[0] !== 200) {
        throw new Error(
          `コメント再取得リクエストが不正です: count=${String(reloadRequestCount)}, status=${currentStatuses.join(",") || "none"}`,
        );
      }
      if (
        evaluation.before.href !== evaluation.after.href ||
        evaluation.before.timeOrigin !== evaluation.after.timeOrigin
      ) {
        throw new Error("コメント再取得中にページ全体が再読み込みされました。");
      }
      if (evaluation.after.lastUpdated <= evaluation.before.lastUpdated) {
        throw new Error(
          "再取得レスポンスがcomment-filter2へ再入力されませんでした。",
        );
      }

      console.log(`隔離動作確認完了: ${watchUrl}`);
      console.log(
        "API version=1 / POST /v1/threads=1回(200) / ページ再読み込みなし / comment-filter2更新あり",
      );
    } finally {
      unsubscribe();
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
