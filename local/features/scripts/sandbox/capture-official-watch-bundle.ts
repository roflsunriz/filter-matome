import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { format } from "prettier";

import {
  type CdpEvent,
  getBrowserVersionEndpoint,
  RawCdpClient,
  waitForTargetWebSocket,
} from "./raw-cdp-client";

interface TargetCreationResult {
  targetId: string;
}

interface ResponseReceivedEvent {
  requestId: string;
  type: string;
  response: {
    url: string;
    mimeType: string;
    status: number;
  };
}

interface LoadingFinishedEvent {
  requestId: string;
}

interface ResponseBody {
  body: string;
  base64Encoded: boolean;
}

interface NavigationResult {
  frameId: string;
}

interface NetworkResourceResult {
  resource: {
    success: boolean;
    httpStatusCode?: number;
    stream?: string;
    netErrorName?: string;
  };
}

interface IoReadResult {
  data: string;
  base64Encoded?: boolean;
  eof: boolean;
}

interface CapturedResponse {
  url: string;
  status: number;
  mimeType: string;
  body: Uint8Array;
}

interface CaptureManifestFile {
  url: string;
  fileName: string;
  status: number;
  mimeType: string;
  bytes: number;
  sha256: string;
  deminifiedFileName?: string;
}

const DEFAULT_CDP_ENDPOINT = "http://127.0.0.1:9222";
const DEFAULT_WATCH_URL = "https://www.nicovideo.jp/watch/sm9";
const DEFAULT_SETTLE_MS = 8_000;
const WATCH_ASSET_BASE =
  "https://resource.video.nimg.jp/web/scripts/nvpc_next/assets/";
const SCRIPT_DIRECTORY = dirname(fileURLToPath(import.meta.url));

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isTargetCreationResult = (
  value: unknown,
): value is TargetCreationResult =>
  isRecord(value) && typeof value.targetId === "string";

const isResponseReceivedEvent = (
  value: unknown,
): value is ResponseReceivedEvent =>
  isRecord(value) &&
  typeof value.requestId === "string" &&
  typeof value.type === "string" &&
  isRecord(value.response) &&
  typeof value.response.url === "string" &&
  typeof value.response.mimeType === "string" &&
  typeof value.response.status === "number";

const isLoadingFinishedEvent = (
  value: unknown,
): value is LoadingFinishedEvent =>
  isRecord(value) && typeof value.requestId === "string";

const isResponseBody = (value: unknown): value is ResponseBody =>
  isRecord(value) &&
  typeof value.body === "string" &&
  typeof value.base64Encoded === "boolean";

const isNavigationResult = (value: unknown): value is NavigationResult =>
  isRecord(value) && typeof value.frameId === "string";

const isNetworkResourceResult = (
  value: unknown,
): value is NetworkResourceResult =>
  isRecord(value) &&
  isRecord(value.resource) &&
  typeof value.resource.success === "boolean" &&
  (value.resource.httpStatusCode === undefined ||
    typeof value.resource.httpStatusCode === "number") &&
  (value.resource.stream === undefined ||
    typeof value.resource.stream === "string") &&
  (value.resource.netErrorName === undefined ||
    typeof value.resource.netErrorName === "string");

const isIoReadResult = (value: unknown): value is IoReadResult =>
  isRecord(value) &&
  typeof value.data === "string" &&
  (value.base64Encoded === undefined ||
    typeof value.base64Encoded === "boolean") &&
  typeof value.eof === "boolean";

const isOfficialWatchAssetUrl = (url: string): boolean => {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  return (
    parsed.hostname === "resource.video.nimg.jp" &&
    parsed.protocol === "https:" &&
    parsed.pathname.startsWith("/web/scripts/nvpc_next/assets/") &&
    /\.(?:m?js|css)$/i.test(parsed.pathname)
  );
};

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
    !/^\/watch\/[a-zA-Z0-9]+$/.test(url.pathname)
  ) {
    throw new Error(`対象外のwatch URLです: ${value}`);
  }
  url.search = "";
  url.hash = "";
  return url.href;
};

const timestampForPath = (date: Date): string =>
  date.toISOString().replace(/[:.]/g, "-");

const makeFileName = (url: string): string => {
  const parsed = new URL(url);
  const sourceName = basename(parsed.pathname).replace(/[^a-zA-Z0-9_.-]/g, "_");
  const urlHash = createHash("sha256").update(url).digest("hex").slice(0, 12);
  return `${urlHash}-${sourceName || "bundle.js"}`;
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

const eventParams = (event: CdpEvent): Record<string, unknown> =>
  event.params ?? {};

const extractDependencyNames = (source: string): string[] => {
  const dependencies = new Set<string>();
  const pattern =
    /(?:from\s*|import\s*\()\s*["'`]\.\/(?<name>[a-zA-Z0-9_.-]+\.js)["'`]/g;
  for (const match of source.matchAll(pattern)) {
    const name = match.groups?.name;
    if (name) {
      dependencies.add(name);
    }
  }
  return [...dependencies];
};

const readCdpStream = async (
  client: RawCdpClient,
  handle: string,
): Promise<Uint8Array> => {
  const chunks: Uint8Array[] = [];
  try {
    let eof = false;
    while (!eof) {
      const result = await client.send<unknown>("IO.read", { handle });
      if (!isIoReadResult(result)) {
        throw new Error("IO.readの応答形式が不正です。");
      }
      chunks.push(
        result.base64Encoded
          ? Uint8Array.from(Buffer.from(result.data, "base64"))
          : new TextEncoder().encode(result.data),
      );
      eof = result.eof;
    }
  } finally {
    await client.send("IO.close", { handle }).catch(() => undefined);
  }
  return Uint8Array.from(
    Buffer.concat(chunks.map((chunk) => Buffer.from(chunk))),
  );
};

const crawlScriptDependencies = async (
  client: RawCdpClient,
  frameId: string,
  captured: Map<string, CapturedResponse>,
): Promise<string[]> => {
  const queue: string[] = [];
  const queued = new Set<string>();
  const failures: string[] = [];

  const enqueueFromSource = (source: string): void => {
    for (const dependency of extractDependencyNames(source)) {
      const url = `${WATCH_ASSET_BASE}${dependency}`;
      if (!captured.has(url) && !queued.has(url)) {
        queued.add(url);
        queue.push(url);
      }
    }
  };
  for (const response of captured.values()) {
    enqueueFromSource(new TextDecoder().decode(response.body));
  }

  while (queue.length > 0) {
    const url = queue.shift();
    if (!url || captured.has(url)) {
      continue;
    }
    const loaded = await client
      .send<unknown>("Network.loadNetworkResource", {
        frameId,
        url,
        options: {
          disableCache: true,
          includeCredentials: false,
        },
      })
      .catch((error: unknown) => {
        failures.push(
          `${url}: ${error instanceof Error ? error.message : String(error)}`,
        );
        return null;
      });
    if (loaded === null) {
      continue;
    }
    if (
      !isNetworkResourceResult(loaded) ||
      !loaded.resource.success ||
      !loaded.resource.stream
    ) {
      const detail = isNetworkResourceResult(loaded)
        ? (loaded.resource.netErrorName ?? "streamなし")
        : "応答形式不正";
      failures.push(`${url}: ${detail}`);
      continue;
    }

    const body = await readCdpStream(client, loaded.resource.stream);
    captured.set(url, {
      url,
      status: loaded.resource.httpStatusCode ?? 200,
      mimeType: "text/javascript",
      body,
    });
    enqueueFromSource(new TextDecoder().decode(body));
  }
  return failures;
};

const main = async (): Promise<void> => {
  const cdpEndpoint = parseArgument("cdp") ?? DEFAULT_CDP_ENDPOINT;
  const watchUrl = validateWatchUrl(parseArgument("url") ?? DEFAULT_WATCH_URL);
  const settleMs = Number.parseInt(
    parseArgument("settle-ms") ?? String(DEFAULT_SETTLE_MS),
    10,
  );
  if (!Number.isFinite(settleMs) || settleMs < 0 || settleMs > 60_000) {
    throw new Error("--settle-msは0から60000の整数で指定してください。");
  }

  const capturedAt = new Date();
  const outputRoot = join(
    SCRIPT_DIRECTORY,
    "..",
    "..",
    "src",
    "sandbox",
    "official-watch-bundle",
  );
  const captureName = timestampForPath(capturedAt);
  const captureDirectory = join(outputRoot, "captures", captureName);
  await mkdir(captureDirectory, { recursive: true });

  const version = await getBrowserVersionEndpoint(cdpEndpoint);
  const browserClient = await RawCdpClient.connect(
    version.webSocketDebuggerUrl,
  );
  let targetId: string | undefined;

  try {
    const created = await browserClient.send<unknown>("Target.createTarget", {
      url: "about:blank",
    });
    if (!isTargetCreationResult(created)) {
      throw new Error("Target.createTargetの応答形式が不正です。");
    }
    targetId = created.targetId;
    const pageWebSocket = await waitForTargetWebSocket(cdpEndpoint, targetId);
    const pageClient = await RawCdpClient.connect(pageWebSocket);
    const candidates = new Map<string, Omit<CapturedResponse, "body">>();
    const captured = new Map<string, CapturedResponse>();
    const bodyTasks = new Set<Promise<void>>();
    let crawlFailures: string[] = [];

    const unsubscribe = pageClient.subscribe((event) => {
      if (event.method === "Network.responseReceived") {
        const params = eventParams(event);
        if (
          isResponseReceivedEvent(params) &&
          isOfficialWatchAssetUrl(params.response.url)
        ) {
          candidates.set(params.requestId, {
            url: params.response.url,
            status: params.response.status,
            mimeType: params.response.mimeType,
          });
        }
        return;
      }

      if (event.method !== "Network.loadingFinished") {
        return;
      }
      const params = eventParams(event);
      if (!isLoadingFinishedEvent(params)) {
        return;
      }
      const candidate = candidates.get(params.requestId);
      if (!candidate || captured.has(candidate.url)) {
        return;
      }

      const task = pageClient
        .send<unknown>("Network.getResponseBody", {
          requestId: params.requestId,
        })
        .then((value) => {
          if (!isResponseBody(value)) {
            throw new Error(
              `Network.getResponseBodyの応答形式が不正です: ${candidate.url}`,
            );
          }
          const body = value.base64Encoded
            ? Uint8Array.from(Buffer.from(value.body, "base64"))
            : new TextEncoder().encode(value.body);
          captured.set(candidate.url, { ...candidate, body });
        })
        .finally(() => {
          bodyTasks.delete(task);
        });
      bodyTasks.add(task);
    });

    try {
      await Promise.all([
        pageClient.send("Page.enable"),
        pageClient.send("Runtime.enable"),
        pageClient.send("Network.enable", {
          maxTotalBufferSize: 200_000_000,
          maxResourceBufferSize: 25_000_000,
        }),
      ]);
      await pageClient.send("Network.setCacheDisabled", {
        cacheDisabled: true,
      });
      await pageClient.send("Network.setBypassServiceWorker", {
        bypass: true,
      });

      const loaded = waitForLoad(pageClient, 45_000);
      const navigation = await pageClient.send<unknown>("Page.navigate", {
        url: watchUrl,
      });
      if (!isNavigationResult(navigation)) {
        throw new Error("Page.navigateの応答形式が不正です。");
      }
      await loaded;
      await new Promise((resolve) => setTimeout(resolve, settleMs));

      while (bodyTasks.size > 0) {
        await Promise.allSettled([...bodyTasks]);
      }
      crawlFailures = await crawlScriptDependencies(
        pageClient,
        navigation.frameId,
        captured,
      );
    } finally {
      unsubscribe();
      pageClient.close();
    }

    const files: CaptureManifestFile[] = [];
    for (const response of [...captured.values()].sort((left, right) =>
      left.url.localeCompare(right.url),
    )) {
      const fileName = makeFileName(response.url);
      await writeFile(join(captureDirectory, fileName), response.body);
      let deminifiedFileName: string | undefined;
      if (/\.css$/i.test(new URL(response.url).pathname)) {
        deminifiedFileName = `${fileName}.deminified.css`;
        const deminified = await format(
          new TextDecoder().decode(response.body),
          { parser: "css" },
        );
        await writeFile(
          join(captureDirectory, deminifiedFileName),
          deminified,
          "utf8",
        );
      }
      files.push({
        url: response.url,
        fileName,
        status: response.status,
        mimeType: response.mimeType,
        bytes: response.body.byteLength,
        sha256: createHash("sha256").update(response.body).digest("hex"),
        ...(deminifiedFileName ? { deminifiedFileName } : {}),
      });
    }

    if (files.length === 0) {
      throw new Error("公式Watch資産を1件も取得できませんでした。");
    }

    const manifest = {
      schemaVersion: 1,
      capturedAt: capturedAt.toISOString(),
      watchUrl,
      browser: version.Browser,
      protocolVersion: version["Protocol-Version"],
      authenticationMaterialStored: false,
      htmlStored: false,
      dependencyCrawl: {
        enabled: true,
        includeCredentials: false,
        failures: crawlFailures,
      },
      files,
    };
    await writeFile(
      join(captureDirectory, "manifest.json"),
      `${JSON.stringify(manifest, null, 2)}\n`,
      "utf8",
    );
    await writeFile(
      join(outputRoot, "latest.json"),
      `${JSON.stringify(
        {
          schemaVersion: 1,
          captureDirectory: `captures/${captureName}`,
        },
        null,
        2,
      )}\n`,
      "utf8",
    );

    const totalBytes = files.reduce((sum, file) => sum + file.bytes, 0);
    console.log(
      `取得完了: ${files.length} files / ${totalBytes} bytes -> ${captureDirectory}`,
    );
  } finally {
    if (targetId) {
      await browserClient
        .send("Target.closeTarget", { targetId })
        .catch(() => undefined);
    }
    browserClient.close();
  }
};

await main();
