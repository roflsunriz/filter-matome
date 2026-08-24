import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { format } from "prettier";

import { shouldBlockAdRequest } from "../../src/destroy-ads/ad-request-policy";
import { OFFICIAL_PAGE_TARGETS } from "../../src/destroy-ads/official-page-catalog";
import {
  type CdpEvent,
  getBrowserVersionEndpoint,
  RawCdpClient,
  waitForTargetWebSocket,
} from "./raw-cdp-client";

interface TargetCreationResult {
  targetId: string;
}

interface RequestEvent {
  requestId: string;
  type: string;
  request: { url: string };
}

interface ResponseEvent {
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
  encodedDataLength: number;
}

interface LoadingFailedEvent {
  requestId: string;
  errorText: string;
}

interface ResponseBody {
  body: string;
  base64Encoded: boolean;
}

interface CapturedAsset {
  body: string;
  mimeType: string;
  status: number;
  url: string;
}

interface CapturedRequest {
  type: string;
  url: string;
  outcome: "pending" | "response" | "failed";
  status?: number;
  errorText?: string;
}

interface PageResult {
  id: string;
  requestedUrl: string;
  finalUrl: string;
  requests: CapturedRequest[];
  adCandidateRequests: CapturedRequest[];
  candidateAssets: Array<{
    url: string;
    fileName: string;
    sha256: string;
    bytes: number;
    tokens: string[];
  }>;
}

const SCRIPT_DIRECTORY = dirname(fileURLToPath(import.meta.url));
const DEFAULT_CDP_ENDPOINT = "http://127.0.0.1:9222";
const DEFAULT_SETTLE_MS = 6_000;
const MAX_ASSET_BYTES = 8_000_000;
const AD_TOKENS = [
  "advertisement",
  "videoAds",
  "adsResource",
  "isDisplayAdBanner",
  "bannerIn",
  "doubleclick",
  "googlesyndication",
  "googletag",
  "adservice",
  "adserver",
  "nicoad",
] as const;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isTargetCreationResult = (
  value: unknown,
): value is TargetCreationResult =>
  isRecord(value) && typeof value.targetId === "string";

const isRequestEvent = (value: unknown): value is RequestEvent =>
  isRecord(value) &&
  typeof value.requestId === "string" &&
  typeof value.type === "string" &&
  isRecord(value.request) &&
  typeof value.request.url === "string";

const isResponseEvent = (value: unknown): value is ResponseEvent =>
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
  isRecord(value) &&
  typeof value.requestId === "string" &&
  typeof value.encodedDataLength === "number";

const isLoadingFailedEvent = (value: unknown): value is LoadingFailedEvent =>
  isRecord(value) &&
  typeof value.requestId === "string" &&
  typeof value.errorText === "string";

const isResponseBody = (value: unknown): value is ResponseBody =>
  isRecord(value) &&
  typeof value.body === "string" &&
  typeof value.base64Encoded === "boolean";

const eventParams = (event: CdpEvent): Record<string, unknown> =>
  event.params ?? {};

const parseArgument = (name: string): string | undefined => {
  const prefix = `--${name}=`;
  return process.argv
    .slice(2)
    .find((argument) => argument.startsWith(prefix))
    ?.slice(prefix.length);
};

const sanitizedUrl = (value: string): string => {
  try {
    const url = new URL(value);
    url.username = "";
    url.password = "";
    url.search = "";
    url.hash = "";
    return url.href;
  } catch {
    return "invalid:";
  }
};

const isOfficialAsset = (value: string, type: string): boolean => {
  if (type !== "Script" && type !== "Stylesheet") {
    return false;
  }
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      (url.hostname === "nicovideo.jp" ||
        url.hostname.endsWith(".nicovideo.jp") ||
        url.hostname === "nimg.jp" ||
        url.hostname.endsWith(".nimg.jp"))
    );
  } catch {
    return false;
  }
};

const matchingTokens = (value: string): string[] => {
  const lower = value.toLowerCase();
  return AD_TOKENS.filter((token) => lower.includes(token.toLowerCase()));
};

const timestampForPath = (date: Date): string =>
  date.toISOString().replace(/[:.]/g, "-");

const makeFileName = (url: string): string => {
  const parsed = new URL(url);
  const sourceName = basename(parsed.pathname).replace(/[^a-zA-Z0-9_.-]/g, "_");
  const hash = createHash("sha256").update(url).digest("hex").slice(0, 12);
  return `${hash}-${sourceName || "asset"}`;
};

const waitForLoad = (client: RawCdpClient): Promise<void> =>
  new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      unsubscribe();
      reject(new Error("ページloadイベントが45秒以内に発火しませんでした。"));
    }, 45_000);
    const unsubscribe = client.subscribe((event) => {
      if (event.method === "Page.loadEventFired") {
        clearTimeout(timeout);
        unsubscribe();
        resolve();
      }
    });
  });

const capturePage = async (
  browserClient: RawCdpClient,
  cdpEndpoint: string,
  outputDirectory: string,
  target: (typeof OFFICIAL_PAGE_TARGETS)[number],
  settleMs: number,
): Promise<PageResult> => {
  const created = await browserClient.send<unknown>("Target.createTarget", {
    url: "about:blank",
  });
  if (!isTargetCreationResult(created)) {
    throw new Error("Target.createTargetの応答形式が不正です。");
  }

  const requests = new Map<string, CapturedRequest>();
  const responses = new Map<
    string,
    Omit<CapturedAsset, "body"> & { type: string }
  >();
  const capturedAssets = new Map<string, CapturedAsset>();
  const bodyTasks = new Set<Promise<void>>();
  const pageWebSocket = await waitForTargetWebSocket(
    cdpEndpoint,
    created.targetId,
  );
  const pageClient = await RawCdpClient.connect(pageWebSocket);
  const unsubscribe = pageClient.subscribe((event) => {
    const params = eventParams(event);
    if (
      event.method === "Network.requestWillBeSent" &&
      isRequestEvent(params)
    ) {
      requests.set(params.requestId, {
        type: params.type,
        url: sanitizedUrl(params.request.url),
        outcome: "pending",
      });
      return;
    }
    if (
      event.method === "Network.responseReceived" &&
      isResponseEvent(params)
    ) {
      const request = requests.get(params.requestId);
      if (request) {
        request.outcome = "response";
        request.status = params.response.status;
      }
      if (isOfficialAsset(params.response.url, params.type)) {
        responses.set(params.requestId, {
          type: params.type,
          url: params.response.url,
          status: params.response.status,
          mimeType: params.response.mimeType,
        });
      }
      return;
    }
    if (
      event.method === "Network.loadingFailed" &&
      isLoadingFailedEvent(params)
    ) {
      const request = requests.get(params.requestId);
      if (request) {
        request.outcome = "failed";
        request.errorText = params.errorText;
      }
      return;
    }
    if (
      event.method !== "Network.loadingFinished" ||
      !isLoadingFinishedEvent(params)
    ) {
      return;
    }
    const response = responses.get(params.requestId);
    if (
      !response ||
      params.encodedDataLength > MAX_ASSET_BYTES ||
      capturedAssets.has(response.url)
    ) {
      return;
    }
    const task = pageClient
      .send<unknown>("Network.getResponseBody", { requestId: params.requestId })
      .then((value) => {
        if (!isResponseBody(value)) {
          return;
        }
        const body = value.base64Encoded
          ? Buffer.from(value.body, "base64").toString("utf8")
          : value.body;
        capturedAssets.set(response.url, {
          url: response.url,
          status: response.status,
          mimeType: response.mimeType,
          body,
        });
      })
      .finally(() => bodyTasks.delete(task));
    bodyTasks.add(task);
  });

  try {
    await Promise.all([
      pageClient.send("Page.enable"),
      pageClient.send("Runtime.enable"),
      pageClient.send("Network.enable", {
        maxTotalBufferSize: 250_000_000,
        maxResourceBufferSize: MAX_ASSET_BYTES,
      }),
    ]);
    await pageClient.send("Network.setCacheDisabled", { cacheDisabled: true });
    await pageClient.send("Network.setBypassServiceWorker", { bypass: true });
    const loaded = waitForLoad(pageClient);
    await pageClient.send("Page.navigate", { url: target.url });
    await loaded;
    await new Promise((resolve) => setTimeout(resolve, settleMs));
    while (bodyTasks.size > 0) {
      await Promise.allSettled([...bodyTasks]);
    }

    const evaluated = await pageClient.send<unknown>("Runtime.evaluate", {
      expression: "location.href",
      returnByValue: true,
    });
    let finalUrl = target.url;
    if (
      isRecord(evaluated) &&
      isRecord(evaluated.result) &&
      typeof evaluated.result.value === "string"
    ) {
      finalUrl = sanitizedUrl(evaluated.result.value);
    }

    const candidateAssets: PageResult["candidateAssets"] = [];
    const assetDirectory = join(outputDirectory, "assets");
    await mkdir(assetDirectory, { recursive: true });
    for (const asset of capturedAssets.values()) {
      const tokens = matchingTokens(asset.body);
      if (tokens.length === 0) {
        continue;
      }
      const fileName = makeFileName(asset.url);
      const extension = asset.url.toLowerCase().includes(".css")
        ? "css"
        : "babel";
      const deminified = await format(asset.body, { parser: extension });
      await writeFile(join(assetDirectory, fileName), asset.body, "utf8");
      await writeFile(
        join(assetDirectory, `${fileName}.deminified`),
        deminified,
        "utf8",
      );
      candidateAssets.push({
        url: sanitizedUrl(asset.url),
        fileName,
        sha256: createHash("sha256").update(asset.body).digest("hex"),
        bytes: Buffer.byteLength(asset.body),
        tokens,
      });
    }

    const requestList = [...requests.values()];
    return {
      id: target.id,
      requestedUrl: target.url,
      finalUrl,
      requests: requestList,
      adCandidateRequests: requestList.filter((request) =>
        shouldBlockAdRequest(request.url),
      ),
      candidateAssets,
    };
  } finally {
    unsubscribe();
    pageClient.close();
    await browserClient
      .send("Target.closeTarget", { targetId: created.targetId })
      .catch(() => undefined);
  }
};

const main = async (): Promise<void> => {
  const cdpEndpoint = parseArgument("cdp") ?? DEFAULT_CDP_ENDPOINT;
  const settleMs = Number.parseInt(
    parseArgument("settle-ms") ?? String(DEFAULT_SETTLE_MS),
    10,
  );
  if (!Number.isInteger(settleMs) || settleMs < 0 || settleMs > 60_000) {
    throw new Error("--settle-msは0から60000の整数で指定してください。");
  }

  const capturedAt = new Date();
  const captureDirectory = join(
    SCRIPT_DIRECTORY,
    "..",
    "..",
    "src",
    "sandbox",
    "destroy-ads-captures",
    timestampForPath(capturedAt),
  );
  await mkdir(captureDirectory, { recursive: true });
  const version = await getBrowserVersionEndpoint(cdpEndpoint);
  const browserClient = await RawCdpClient.connect(
    version.webSocketDebuggerUrl,
  );

  try {
    const pages: PageResult[] = [];
    for (const target of OFFICIAL_PAGE_TARGETS) {
      console.log(`[destroy-ads] ${target.id}: ${target.url}`);
      pages.push(
        await capturePage(
          browserClient,
          cdpEndpoint,
          captureDirectory,
          target,
          settleMs,
        ),
      );
    }
    await writeFile(
      join(captureDirectory, "manifest.json"),
      `${JSON.stringify(
        {
          schemaVersion: 1,
          capturedAt: capturedAt.toISOString(),
          browser: version.Browser,
          protocolVersion: version["Protocol-Version"],
          authenticationMaterialStored: false,
          queryStringsStored: false,
          pages,
        },
        null,
        2,
      )}\n`,
      "utf8",
    );
    console.log(`取得完了: ${captureDirectory}`);
  } finally {
    browserClient.close();
  }
};

await main();
