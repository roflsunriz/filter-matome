import { readFile, writeFile } from "node:fs/promises";
import { createServer, type Server } from "node:http";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  type CdpEvent,
  getBrowserVersionEndpoint,
  RawCdpClient,
  waitForTargetWebSocket,
} from "./raw-cdp-client";

interface LatestCapture {
  captureDirectory: string;
}

interface CaptureFile {
  url: string;
  fileName: string;
}

interface CaptureManifest {
  files: CaptureFile[];
}

interface BrowserContextResult {
  browserContextId: string;
}

interface TargetCreationResult {
  targetId: string;
}

interface FetchRequestPausedEvent {
  requestId: string;
  request: {
    url: string;
  };
}

interface EvaluationResult {
  result: {
    type: string;
    value?: unknown;
    description?: string;
  };
  exceptionDetails?: unknown;
}

interface PlaybackRateEntry {
  available: boolean;
  rate: number;
  label: string;
}

interface MembershipRuntimeMatrix {
  externalFetch: "blocked";
  guest: PlaybackRateEntry[];
  regular: PlaybackRateEntry[];
  premium: PlaybackRateEntry[];
}

const DEFAULT_CDP_ENDPOINT = "http://127.0.0.1:9222";
const PLAYER_ASSET_PREFIX = "PlayerSeekBar-";
const SCRIPT_DIRECTORY = dirname(fileURLToPath(import.meta.url));

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isLatestCapture = (value: unknown): value is LatestCapture =>
  isRecord(value) && typeof value.captureDirectory === "string";

const isCaptureFile = (value: unknown): value is CaptureFile =>
  isRecord(value) &&
  typeof value.url === "string" &&
  typeof value.fileName === "string";

const isCaptureManifest = (value: unknown): value is CaptureManifest =>
  isRecord(value) &&
  Array.isArray(value.files) &&
  value.files.every(isCaptureFile);

const isBrowserContextResult = (
  value: unknown,
): value is BrowserContextResult =>
  isRecord(value) && typeof value.browserContextId === "string";

const isTargetCreationResult = (
  value: unknown,
): value is TargetCreationResult =>
  isRecord(value) && typeof value.targetId === "string";

const isFetchRequestPausedEvent = (
  value: unknown,
): value is FetchRequestPausedEvent =>
  isRecord(value) &&
  typeof value.requestId === "string" &&
  isRecord(value.request) &&
  typeof value.request.url === "string";

const isEvaluationResult = (value: unknown): value is EvaluationResult =>
  isRecord(value) &&
  isRecord(value.result) &&
  typeof value.result.type === "string";

const isPlaybackRateEntry = (value: unknown): value is PlaybackRateEntry =>
  isRecord(value) &&
  typeof value.available === "boolean" &&
  typeof value.rate === "number" &&
  typeof value.label === "string";

const isMembershipRuntimeMatrix = (
  value: unknown,
): value is MembershipRuntimeMatrix =>
  isRecord(value) &&
  value.externalFetch === "blocked" &&
  Array.isArray(value.guest) &&
  value.guest.every(isPlaybackRateEntry) &&
  Array.isArray(value.regular) &&
  value.regular.every(isPlaybackRateEntry) &&
  Array.isArray(value.premium) &&
  value.premium.every(isPlaybackRateEntry);

const parseCdpEndpoint = (): string => {
  const argument = process.argv
    .slice(2)
    .find((value) => value.startsWith("--cdp="));
  return argument?.slice("--cdp=".length) ?? DEFAULT_CDP_ENDPOINT;
};

const readJson = async (path: string): Promise<unknown> =>
  JSON.parse(await readFile(path, "utf8")) as unknown;

const assetName = (url: string): string => {
  const segments = new URL(url).pathname.split("/");
  return segments.at(-1) ?? "";
};

const findPlaybackRateExport = (source: string): string => {
  const match = source.match(
    /export\{[^}]*\bRA\s+as\s+(?<exportName>[a-zA-Z_$][a-zA-Z0-9_$]*)\b[^}]*\};?\s*$/,
  );
  const exportName = match?.groups?.exportName;
  if (!exportName) {
    throw new Error("公式再生速度関数のexport名を特定できませんでした。");
  }
  return exportName;
};

const listen = async (server: Server): Promise<number> =>
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      server.off("error", reject);
      const address = server.address();
      if (!address || typeof address === "string") {
        reject(new Error("ローカルsandbox serverのportを取得できません。"));
        return;
      }
      resolve(address.port);
    });
  });

const closeServer = async (server: Server): Promise<void> =>
  await new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });

const main = async (): Promise<void> => {
  const cdpEndpoint = parseCdpEndpoint();
  const outputRoot = join(
    SCRIPT_DIRECTORY,
    "..",
    "..",
    "src",
    "sandbox",
    "official-watch-bundle",
  );
  const latestValue = await readJson(join(outputRoot, "latest.json"));
  if (!isLatestCapture(latestValue)) {
    throw new Error("latest.jsonの形式が不正です。");
  }
  const captureDirectory = join(outputRoot, latestValue.captureDirectory);
  const manifestValue = await readJson(join(captureDirectory, "manifest.json"));
  if (!isCaptureManifest(manifestValue)) {
    throw new Error("manifest.jsonの形式が不正です。");
  }

  const assets = new Map<string, string>();
  for (const file of manifestValue.files) {
    const name = assetName(file.url);
    if (assets.has(name)) {
      throw new Error(`重複する公式アセット名です: ${name}`);
    }
    assets.set(name, file.fileName);
  }
  const playerAsset = [...assets.keys()].find((name) =>
    name.startsWith(PLAYER_ASSET_PREFIX),
  );
  if (!playerAsset) {
    throw new Error("PlayerSeekBarアセットがcaptureにありません。");
  }
  const playerSource = await readFile(
    join(captureDirectory, assets.get(playerAsset) ?? ""),
    "utf8",
  );
  const playbackRateExport = findPlaybackRateExport(playerSource);

  const server = createServer((request, response) => {
    const requestUrl = new URL(request.url ?? "/", "http://127.0.0.1");
    if (requestUrl.pathname === "/sandbox.html") {
      response.writeHead(200, {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Security-Policy":
          "default-src 'none'; script-src 'self'; connect-src 'none'; worker-src 'self' blob:; img-src 'none'; media-src 'none'; frame-src 'none'; style-src 'none'",
        "Cache-Control": "no-store",
      });
      response.end("<!doctype html><title>membership sandbox</title>");
      return;
    }
    const match = requestUrl.pathname.match(
      /^\/assets\/(?<name>[a-zA-Z0-9_.-]+\.js)$/,
    );
    const name = match?.groups?.name;
    const fileName = name ? assets.get(name) : undefined;
    if (!fileName) {
      response.writeHead(404, { "Content-Type": "text/plain" });
      response.end("not found");
      return;
    }
    void readFile(join(captureDirectory, fileName))
      .then((body) => {
        response.writeHead(200, {
          "Content-Type": "text/javascript; charset=utf-8",
          "Cache-Control": "no-store",
        });
        response.end(body);
      })
      .catch(() => {
        response.writeHead(500, { "Content-Type": "text/plain" });
        response.end("read error");
      });
  });
  const port = await listen(server);

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
    const interceptionTasks = new Set<Promise<void>>();
    const unsubscribe = pageClient.subscribe((event: CdpEvent) => {
      if (event.method !== "Fetch.requestPaused") {
        return;
      }
      const params = event.params ?? {};
      if (!isFetchRequestPausedEvent(params)) {
        return;
      }
      const task = (async () => {
        let allowed = false;
        try {
          const url = new URL(params.request.url);
          allowed =
            url.protocol === "http:" &&
            url.hostname === "127.0.0.1" &&
            url.port === String(port);
        } catch {
          allowed = false;
        }
        await pageClient.send(
          allowed ? "Fetch.continueRequest" : "Fetch.failRequest",
          allowed
            ? { requestId: params.requestId }
            : {
                requestId: params.requestId,
                errorReason: "BlockedByClient",
              },
        );
      })().finally(() => {
        interceptionTasks.delete(task);
      });
      interceptionTasks.add(task);
    });

    try {
      await Promise.all([
        pageClient.send("Page.enable"),
        pageClient.send("Runtime.enable"),
        pageClient.send("Network.enable"),
        pageClient.send("Fetch.enable", {
          patterns: [{ urlPattern: "*" }],
        }),
      ]);
      await pageClient.send("Page.navigate", {
        url: `http://127.0.0.1:${String(port)}/sandbox.html`,
      });
      await new Promise((resolve) => setTimeout(resolve, 500));

      const expression = `
        (async () => {
          const module = await import(
            "/assets/${playerAsset}"
          );
          const playbackRates = module[
            ${JSON.stringify(playbackRateExport)}
          ];
          if (typeof playbackRates !== "function") {
            throw new Error("playback rate export is not a function");
          }
          const normalize = (isPremium) =>
            playbackRates(isPremium).map((entry) => ({
              available: entry.available === true,
              rate: entry._x_,
              label: entry.label,
            }));
          const externalFetch = await fetch(
            "https://example.com/filter-matome-membership-probe",
          ).then(
            () => "unexpected-success",
            () => "blocked",
          );
          return {
            externalFetch,
            guest: normalize(false),
            regular: normalize(false),
            premium: normalize(true),
          };
        })()
      `;
      const evaluation = await pageClient.send<unknown>("Runtime.evaluate", {
        expression,
        awaitPromise: true,
        returnByValue: true,
      });
      if (
        !isEvaluationResult(evaluation) ||
        evaluation.exceptionDetails !== undefined ||
        !isMembershipRuntimeMatrix(evaluation.result.value)
      ) {
        throw new Error(
          evaluation && isEvaluationResult(evaluation)
            ? `公式module実行に失敗しました: ${evaluation.result.description ?? "unknown"}`
            : "Runtime.evaluateの応答形式が不正です。",
        );
      }
      const result = evaluation.result.value;
      await writeFile(
        join(captureDirectory, "membership-runtime-matrix.json"),
        `${JSON.stringify(
          {
            schemaVersion: 1,
            executedAt: new Date().toISOString(),
            browser: version.Browser,
            officialModuleExecuted: true,
            externalNetworkBlocked: true,
            isolatedBrowserContext: true,
            sourceAsset: playerAsset,
            sourceExport: playbackRateExport,
            playbackRates: {
              guest: result.guest,
              regular: result.regular,
              premium: result.premium,
            },
          },
          null,
          2,
        )}\n`,
        "utf8",
      );
      console.log(
        `隔離実行完了: ${playerAsset} / export ${playbackRateExport} / 外部通信遮断`,
      );
    } finally {
      unsubscribe();
      await Promise.allSettled([...interceptionTasks]);
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
    await closeServer(server);
  }
};

await main();
