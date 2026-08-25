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

interface PlaybackSnapshot {
  apiRate: number;
  videoRate: number;
}

const DEFAULT_CDP_ENDPOINT = "http://127.0.0.1:9222";
const DEFAULT_WATCH_URL = "https://www.nicovideo.jp/watch/sm9";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isBrowserContextResult = (
  value: unknown,
): value is BrowserContextResult =>
  isRecord(value) && typeof value["browserContextId"] === "string";

const isTargetCreationResult = (
  value: unknown,
): value is TargetCreationResult =>
  isRecord(value) && typeof value["targetId"] === "string";

const isEvaluationResult = (value: unknown): value is EvaluationResult =>
  isRecord(value) &&
  isRecord(value["result"]) &&
  typeof value["result"]["type"] === "string";

const isPlaybackSnapshot = (value: unknown): value is PlaybackSnapshot =>
  isRecord(value) &&
  typeof value["apiRate"] === "number" &&
  Number.isFinite(value["apiRate"]) &&
  typeof value["videoRate"] === "number" &&
  Number.isFinite(value["videoRate"]);

const parseArgument = (name: string): string | undefined => {
  const prefix = `--${name}=`;
  return process.argv
    .slice(2)
    .find((argument) => argument.startsWith(prefix))
    ?.slice(prefix.length);
};

const validateWatchUrl = (value: string): string => {
  const url = new URL(value);
  if (
    url.protocol !== "https:" ||
    url.hostname !== "www.nicovideo.jp" ||
    !/^\/watch\/[a-zA-Z0-9]+$/u.test(url.pathname)
  ) {
    throw new Error(`対象外のwatch URLです: ${value}`);
  }
  url.search = "";
  url.hash = "";
  return url.href;
};

const waitForLoad = (client: RawCdpClient, timeoutMs: number): Promise<void> =>
  new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      unsubscribe();
      reject(new Error("watchページのloadイベントがタイムアウトしました"));
    }, timeoutMs);
    const unsubscribe = client.subscribe((event: CdpEvent) => {
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
  const result = await client.send<unknown>("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (!isEvaluationResult(result) || result.exceptionDetails !== undefined) {
    throw new Error(
      result && isEvaluationResult(result)
        ? `ページ評価に失敗しました: ${result.result.description ?? "unknown"}`
        : "Runtime.evaluateの応答形式が不正です",
    );
  }
  return result.result.value;
};

const SNAPSHOT_EXPRESSION = `(() => {
  const api = globalThis.FilterMatomePlaybackRateApi;
  const video = document.querySelector('video[data-name="video-content"]');
  if (
    !api || api.version !== 1 || typeof api.get !== 'function' ||
    typeof api.set !== 'function' || !(video instanceof HTMLVideoElement)
  ) return null;
  return { apiRate: api.get(), videoRate: video.playbackRate };
})()`;

const tryReadSnapshot = async (
  client: RawCdpClient,
): Promise<PlaybackSnapshot | null> => {
  const value = await evaluate(client, SNAPSHOT_EXPRESSION);
  return isPlaybackSnapshot(value) ? value : null;
};

const readSnapshot = async (
  client: RawCdpClient,
): Promise<PlaybackSnapshot> => {
  const value = await tryReadSnapshot(client);
  if (!isPlaybackSnapshot(value)) {
    const diagnostics = await evaluate(
      client,
      `(() => {
        const api = globalThis.FilterMatomePlaybackRateApi;
        return {
          path: location.pathname,
          apiPresent: !!api,
          apiVersion: api?.version ?? null,
          apiGet: typeof api?.get === 'function',
          apiSet: typeof api?.set === 'function',
          videoCount: document.querySelectorAll('video').length,
          namedVideoCount: document.querySelectorAll('video[data-name="video-content"]').length,
          mlinkPresent: !!document.querySelector('mlink-video-controller'),
          serverContextPresent: !!document.querySelector('meta[name="server-context"]'),
          serverResponsePresent: !!document.querySelector('meta[name="server-response"]'),
        };
      })()`,
    );
    throw new Error(
      `版付き再生速度APIまたは公式動画要素を確認できませんでした: ${JSON.stringify(diagnostics)}`,
    );
  }
  return value;
};

const waitForSnapshot = async (
  client: RawCdpClient,
  timeoutMs: number,
): Promise<PlaybackSnapshot> => {
  const deadline = Date.now() + timeoutMs;
  do {
    const snapshot = await tryReadSnapshot(client);
    if (snapshot) {
      return snapshot;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  } while (Date.now() < deadline);
  return readSnapshot(client);
};

const assertRate = (
  label: string,
  snapshot: PlaybackSnapshot,
  expected: number,
): void => {
  if (
    Math.abs(snapshot.apiRate - expected) >= 0.001 ||
    Math.abs(snapshot.videoRate - expected) >= 0.001
  ) {
    throw new Error(
      `${label}が同期しません: api=${String(snapshot.apiRate)}, video=${String(snapshot.videoRate)}, expected=${String(expected)}`,
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
      throw new Error("Target.createBrowserContextの応答形式が不正です");
    }
    browserContextId = context.browserContextId;
    const target = await browserClient.send<unknown>("Target.createTarget", {
      url: "about:blank",
      browserContextId,
    });
    if (!isTargetCreationResult(target)) {
      throw new Error("Target.createTargetの応答形式が不正です");
    }
    targetId = target.targetId;
    const pageWebSocket = await waitForTargetWebSocket(cdpEndpoint, targetId);
    const pageClient = await RawCdpClient.connect(pageWebSocket);
    try {
      await Promise.all([
        pageClient.send("Page.enable"),
        pageClient.send("Network.enable"),
        pageClient.send("Runtime.enable"),
      ]);
      await pageClient.send("Network.setCacheDisabled", {
        cacheDisabled: true,
      });
      const loaded = waitForLoad(pageClient, 45_000);
      await pageClient.send("Page.navigate", { url: watchUrl });
      await loaded;
      await waitForSnapshot(pageClient, 20_000);

      await evaluate(
        pageClient,
        `(() => globalThis.FilterMatomePlaybackRateApi?.set(1))()`,
      );
      await new Promise((resolve) => setTimeout(resolve, 250));
      assertRate("初期化", await readSnapshot(pageClient), 1);

      await pageClient.send("Input.dispatchKeyEvent", {
        type: "keyDown",
        key: ">",
        code: "Period",
        modifiers: 8,
        windowsVirtualKeyCode: 190,
        nativeVirtualKeyCode: 190,
      });
      await pageClient.send("Input.dispatchKeyEvent", {
        type: "keyUp",
        key: ">",
        code: "Period",
        modifiers: 8,
        windowsVirtualKeyCode: 190,
        nativeVirtualKeyCode: 190,
      });
      await new Promise((resolve) => setTimeout(resolve, 300));
      assertRate("公式ショートカット", await readSnapshot(pageClient), 1.25);

      const mlinkValue = await evaluate(
        pageClient,
        `(async () => {
          const input = document.querySelector('mlink-video-controller')
            ?.shadowRoot?.querySelector('#speed .speed-range');
          if (!(input instanceof HTMLInputElement)) return false;
          input.value = '3.5';
          input.dispatchEvent(new Event('input', { bubbles: true }));
          await new Promise((resolve) => setTimeout(resolve, 300));
          return true;
        })()`,
      );
      if (mlinkValue !== true) {
        throw new Error(
          "mlink-video-controllerの再生速度入力を確認できませんでした",
        );
      }
      assertRate("mlink-video-controller", await readSnapshot(pageClient), 3.5);

      console.log(
        `[playback-rate-live] verified: official=1.25, mlink=3.5, video synchronized / ${version.Browser}`,
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
