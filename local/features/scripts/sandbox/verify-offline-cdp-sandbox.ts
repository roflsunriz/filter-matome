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

const DEFAULT_CDP_ENDPOINT = "http://127.0.0.1:9222";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

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

const parseCdpEndpoint = (): string => {
  const argument = process.argv
    .slice(2)
    .find((value) => value.startsWith("--cdp="));
  return argument?.slice("--cdp=".length) ?? DEFAULT_CDP_ENDPOINT;
};

const main = async (): Promise<void> => {
  const cdpEndpoint = parseCdpEndpoint();
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
    try {
      await Promise.all([
        pageClient.send("Network.enable"),
        pageClient.send("Runtime.enable"),
      ]);
      await pageClient.send("Network.setBlockedURLs", {
        urls: ["http://*", "https://*", "ws://*", "wss://*", "ftp://*"],
      });

      const evaluation = await pageClient.send<unknown>("Runtime.evaluate", {
        expression: `
            (async () => {
              const readStorageLength = (getStorage) => {
                try {
                  const storage = getStorage();
                  return { available: true, length: storage.length };
                } catch {
                  return { available: false, length: null };
                }
              };
              const fetchResult = await fetch(
                'https://example.com/filter-matome-network-probe',
              ).then(
                () => 'unexpected-success',
                () => 'blocked',
              );
              return {
                fetchResult,
                localStorage: readStorageLength(() => localStorage),
                sessionStorage: readStorageLength(() => sessionStorage),
              };
            })()
          `,
        awaitPromise: true,
        returnByValue: true,
      });
      if (
        !isEvaluationResult(evaluation) ||
        evaluation.exceptionDetails !== undefined ||
        !isRecord(evaluation.result.value)
      ) {
        throw new Error(
          evaluation && isEvaluationResult(evaluation)
            ? `sandbox評価に失敗しました: ${evaluation.result.description ?? "unknown"}`
            : "Runtime.evaluateの応答形式が不正です。",
        );
      }

      const result = evaluation.result.value;
      const cookies = await pageClient.send<unknown>("Network.getAllCookies");
      if (!isCookieResult(cookies)) {
        throw new Error("Network.getAllCookiesの応答形式が不正です。");
      }
      const localStorageEmpty =
        isRecord(result.localStorage) &&
        (result.localStorage.available === false ||
          result.localStorage.length === 0);
      const sessionStorageEmpty =
        isRecord(result.sessionStorage) &&
        (result.sessionStorage.available === false ||
          result.sessionStorage.length === 0);
      if (
        result.fetchResult !== "blocked" ||
        cookies.cookies.length !== 0 ||
        !localStorageEmpty ||
        !sessionStorageEmpty
      ) {
        throw new Error(
          `sandbox隔離検証に失敗しました: ${JSON.stringify(result)}`,
        );
      }
      console.log(
        "隔離確認完了: 外部fetch遮断、Cookieなし、local/session storage空または利用不能",
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
