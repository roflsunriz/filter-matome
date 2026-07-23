import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  type CdpEvent,
  getBrowserVersionEndpoint,
  RawCdpClient,
  waitForTargetWebSocket,
} from "./raw-cdp-client";

interface TargetCreationResult {
  targetId: string;
}

interface TargetInfo {
  targetId: string;
  type: string;
  url: string;
  browserContextId?: string;
}

interface TargetListResult {
  targetInfos: TargetInfo[];
}

interface EvaluationResult {
  result: {
    type: string;
    value?: unknown;
    description?: string;
  };
  exceptionDetails?: unknown;
}

interface ResponseReceivedEvent {
  requestId: string;
  response: {
    url: string;
    status: number;
    mimeType: string;
  };
}

interface RequestWillBeSentEvent {
  requestId: string;
  request: {
    method: string;
  };
}

interface LoadingFinishedEvent {
  requestId: string;
}

interface ResponseBody {
  body: string;
  base64Encoded: boolean;
}

interface SeekBarGeometry {
  left: number;
  top: number;
  width: number;
  height: number;
  sessionUserType: "guest" | "regular" | "premium" | "other";
}

interface VisibleBackground {
  width: number;
  height: number;
  left: number;
  top: number;
  backgroundPosition: string;
  sourceKind: "blob" | "data" | "remote";
}

interface HoverSnapshot {
  fraction: number;
  expectedTime: number;
  timeLabels: string[];
  peakLabelVisible: boolean;
  backgroundsAboveSeekBar: VisibleBackground[];
}

interface StoryboardMetadata {
  thumbnailWidth: number;
  thumbnailHeight: number;
  rows: number;
  columns: number;
  intervalMs: number;
  imageCount: number;
  frameCapacity: number;
  nominalCoverageMs: number;
  imageExtensions: string[];
}

interface NetworkResponseRecord {
  requestId: string;
  url: string;
  method: string;
  status: number;
  mimeType: string;
  phase: "loading" | "hover";
}

interface StoryboardDiscovery {
  metadata: StoryboardMetadata | null;
  metadataUrl: string | null;
  contentUrls: Set<string>;
  imageUrls: Set<string>;
}

const DEFAULT_CDP_ENDPOINT = "http://127.0.0.1:9222";
const DEFAULT_WATCH_URL = "https://www.nicovideo.jp/watch/sm9";
const SCRIPT_DIRECTORY = dirname(fileURLToPath(import.meta.url));

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isTargetCreationResult = (
  value: unknown,
): value is TargetCreationResult =>
  isRecord(value) && typeof value.targetId === "string";

const isTargetInfo = (value: unknown): value is TargetInfo =>
  isRecord(value) &&
  typeof value.targetId === "string" &&
  typeof value.type === "string" &&
  typeof value.url === "string" &&
  (value.browserContextId === undefined ||
    typeof value.browserContextId === "string");

const isTargetListResult = (value: unknown): value is TargetListResult =>
  isRecord(value) &&
  Array.isArray(value.targetInfos) &&
  value.targetInfos.every(isTargetInfo);

const isEvaluationResult = (value: unknown): value is EvaluationResult =>
  isRecord(value) &&
  isRecord(value.result) &&
  typeof value.result.type === "string";

const isResponseReceivedEvent = (
  value: unknown,
): value is ResponseReceivedEvent =>
  isRecord(value) &&
  typeof value.requestId === "string" &&
  isRecord(value.response) &&
  typeof value.response.url === "string" &&
  typeof value.response.status === "number" &&
  typeof value.response.mimeType === "string";

const isRequestWillBeSentEvent = (
  value: unknown,
): value is RequestWillBeSentEvent =>
  isRecord(value) &&
  typeof value.requestId === "string" &&
  isRecord(value.request) &&
  typeof value.request.method === "string";

const isLoadingFinishedEvent = (
  value: unknown,
): value is LoadingFinishedEvent =>
  isRecord(value) && typeof value.requestId === "string";

const isResponseBody = (value: unknown): value is ResponseBody =>
  isRecord(value) &&
  typeof value.body === "string" &&
  typeof value.base64Encoded === "boolean";

const isSeekBarGeometry = (value: unknown): value is SeekBarGeometry =>
  isRecord(value) &&
  typeof value.left === "number" &&
  typeof value.top === "number" &&
  typeof value.width === "number" &&
  typeof value.height === "number" &&
  ["guest", "regular", "premium", "other"].includes(
    String(value.sessionUserType),
  );

const isVisibleBackground = (value: unknown): value is VisibleBackground =>
  isRecord(value) &&
  typeof value.width === "number" &&
  typeof value.height === "number" &&
  typeof value.left === "number" &&
  typeof value.top === "number" &&
  typeof value.backgroundPosition === "string" &&
  ["blob", "data", "remote"].includes(String(value.sourceKind));

const isHoverSnapshot = (value: unknown): value is HoverSnapshot =>
  isRecord(value) &&
  typeof value.fraction === "number" &&
  typeof value.expectedTime === "number" &&
  Array.isArray(value.timeLabels) &&
  value.timeLabels.every((label) => typeof label === "string") &&
  typeof value.peakLabelVisible === "boolean" &&
  Array.isArray(value.backgroundsAboveSeekBar) &&
  value.backgroundsAboveSeekBar.every(isVisibleBackground);

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

const waitForLoad = (client: RawCdpClient, timeoutMs: number): Promise<void> =>
  new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      unsubscribe();
      reject(new Error("watchページのloadイベントがタイムアウトしました。"));
    }, timeoutMs);
    const unsubscribe = client.subscribe((event: CdpEvent) => {
      if (event.method === "Page.loadEventFired") {
        clearTimeout(timeout);
        unsubscribe();
        resolve();
      }
    });
  });

const findNiconicoBrowserContextId = async (
  browserClient: RawCdpClient,
): Promise<string | undefined> => {
  const targets = await browserClient.send<unknown>("Target.getTargets");
  if (!isTargetListResult(targets)) {
    throw new Error("Target.getTargetsの応答形式が不正です。");
  }
  return targets.targetInfos.find((target) => {
    if (target.type !== "page") {
      return false;
    }
    try {
      return new URL(target.url).hostname === "www.nicovideo.jp";
    } catch {
      return false;
    }
  })?.browserContextId;
};

const decodeResponseBody = (body: ResponseBody): string =>
  body.base64Encoded
    ? Buffer.from(body.body, "base64").toString("utf8")
    : body.body;

const asFiniteNumber = (value: unknown): number | null => {
  const number =
    typeof value === "string" && value.trim() !== ""
      ? Number.parseFloat(value)
      : value;
  return typeof number === "number" && Number.isFinite(number) ? number : null;
};

const findStoryboardMetadata = (
  value: unknown,
  depth = 0,
): Record<string, unknown> | null => {
  if (depth > 5 || !isRecord(value)) {
    return null;
  }
  if (
    asFiniteNumber(value.thumbnailWidth) !== null &&
    asFiniteNumber(value.thumbnailHeight) !== null &&
    asFiniteNumber(value.rows) !== null &&
    asFiniteNumber(value.columns) !== null &&
    asFiniteNumber(value.interval) !== null &&
    Array.isArray(value.images)
  ) {
    return value;
  }
  for (const child of Object.values(value)) {
    const found = findStoryboardMetadata(child, depth + 1);
    if (found) {
      return found;
    }
  }
  return null;
};

const findContentUrls = (
  value: unknown,
  urls: Set<string>,
  depth = 0,
): void => {
  if (depth > 5 || !isRecord(value)) {
    return;
  }
  for (const [key, child] of Object.entries(value)) {
    if (key === "contentUrl" && typeof child === "string") {
      try {
        const url = new URL(child);
        if (url.protocol === "https:" || url.protocol === "http:") {
          urls.add(url.href);
        }
      } catch {
        // 不正なURLは保存しない。
      }
      continue;
    }
    findContentUrls(child, urls, depth + 1);
  }
};

const imageExtension = (value: string): string => {
  try {
    const match = new URL(value).pathname.match(/(\.[a-zA-Z0-9]+)$/);
    return match?.[1]?.toLowerCase() ?? "unknown";
  } catch {
    const match = value.match(/(\.[a-zA-Z0-9]+)$/);
    return match?.[1]?.toLowerCase() ?? "unknown";
  }
};

const recordStoryboardJson = (
  value: unknown,
  responseUrl: string,
  discovery: StoryboardDiscovery,
): void => {
  const discoveredContentUrls = new Set<string>();
  findContentUrls(value, discoveredContentUrls);
  const metadata = findStoryboardMetadata(value);
  const isStoryboardResponse =
    responseUrl.toLowerCase().includes("storyboard") ||
    [...discoveredContentUrls].some((url) =>
      url.toLowerCase().includes("storyboard"),
    );
  if (!metadata && !isStoryboardResponse) {
    return;
  }
  for (const url of discoveredContentUrls) {
    discovery.contentUrls.add(url);
  }
  if (!metadata) {
    return;
  }
  const thumbnailWidth = asFiniteNumber(metadata.thumbnailWidth);
  const thumbnailHeight = asFiniteNumber(metadata.thumbnailHeight);
  const rows = asFiniteNumber(metadata.rows);
  const columns = asFiniteNumber(metadata.columns);
  const intervalMs = asFiniteNumber(metadata.interval);
  if (
    thumbnailWidth === null ||
    thumbnailHeight === null ||
    rows === null ||
    columns === null ||
    intervalMs === null ||
    !Array.isArray(metadata.images)
  ) {
    return;
  }
  const imageNames = metadata.images.flatMap((image) =>
    isRecord(image) && typeof image.url === "string" ? [image.url] : [],
  );
  const contentUrl = [...discovery.contentUrls].at(-1) ?? responseUrl;
  for (const imageName of imageNames) {
    try {
      const url = new URL(contentUrl);
      url.pathname = url.pathname.replace(/[^/]+$/, imageName);
      discovery.imageUrls.add(url.href);
    } catch {
      // 相対画像URLだけでは外部URLを作らない。
    }
  }
  discovery.metadata = {
    thumbnailWidth,
    thumbnailHeight,
    rows,
    columns,
    intervalMs,
    imageCount: imageNames.length,
    frameCapacity: rows * columns * imageNames.length,
    nominalCoverageMs: rows * columns * imageNames.length * intervalMs,
    imageExtensions: [...new Set(imageNames.map(imageExtension))].sort(),
  };
  discovery.metadataUrl = responseUrl;
};

const sanitizePath = (value: string): string => {
  const url = new URL(value);
  return url.pathname
    .split("/")
    .map((segment) => {
      if (/^(?:sm|so|nm|ca|nl)\d+$/i.test(segment)) {
        return ":watchId";
      }
      if (/^\d{6,}$/.test(segment)) {
        return ":id";
      }
      if (/^[a-zA-Z0-9_-]{24,}$/.test(segment)) {
        const extension = segment.match(/(\.[a-zA-Z0-9]+)$/)?.[1] ?? "";
        return `:opaque${extension}`;
      }
      return segment;
    })
    .join("/");
};

const safeLocation = (
  value: string,
): { origin: string; pathPattern: string } => {
  const url = new URL(value);
  return {
    origin: url.origin,
    pathPattern: sanitizePath(url.href),
  };
};

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
      isEvaluationResult(result)
        ? `ページ評価に失敗しました: ${result.result.description ?? "unknown"}`
        : "Runtime.evaluateの応答形式が不正です。",
    );
  }
  return result.result.value;
};

const SEEK_GEOMETRY_EXPRESSION = String.raw`
  (async () => {
    const parseMeta = (name) => {
      const content =
        document.querySelector('meta[name="' + name + '"]')?.getAttribute('content') ?? '{}';
      try {
        return JSON.parse(content);
      } catch {}
      try {
        return JSON.parse(decodeURIComponent(content));
      } catch {
        return {};
      }
    };
    let context = parseMeta('server-context');
    if (
      context?.sessionUser == null &&
      typeof window.commonHelper?.fetchWatchPage === 'function'
    ) {
      try {
        context =
          (await window.commonHelper.fetchWatchPage())?.serverContext ??
          context;
      } catch {}
    }
    const rawType = context?.sessionUser?.type;
    const sessionUserType =
      context?.sessionUser == null
        ? 'guest'
        : rawType === 'regular' || rawType === 'premium'
          ? rawType
          : 'other';
    const slider = document.querySelector('[aria-label="video - currentTime"]');
    if (!(slider instanceof HTMLElement)) {
      return null;
    }
    const candidates = [];
    let current = slider;
    for (let index = 0; index < 8 && current; index += 1) {
      candidates.push(current);
      current = current.parentElement;
    }
    const seekArea =
      candidates.find((element) => {
        const rect = element.getBoundingClientRect();
        return rect.width >= 100 && rect.height >= 3 && rect.height <= 80;
      }) ?? slider;
    const rect = seekArea.getBoundingClientRect();
    return {
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height,
      sessionUserType,
    };
  })()
`;

const waitForSeekBar = async (
  client: RawCdpClient,
  timeoutMs: number,
): Promise<SeekBarGeometry> => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const value = await evaluate(client, SEEK_GEOMETRY_EXPRESSION);
    if (isSeekBarGeometry(value) && value.width > 0) {
      return value;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error("公式シークバーを特定できませんでした。");
};

const hoverSnapshotExpression = (fraction: number): string => `
  (() => {
    const slider = document.querySelector('[aria-label="video - currentTime"]');
    const video = document.querySelector('video');
    if (!(slider instanceof HTMLElement)) {
      throw new Error('seek bar not found');
    }
    const candidates = [];
    let current = slider;
    for (let index = 0; index < 8 && current; index += 1) {
      candidates.push(current);
      current = current.parentElement;
    }
    const seekArea =
      candidates.find((element) => {
        const rect = element.getBoundingClientRect();
        return rect.width >= 100 && rect.height >= 3 && rect.height <= 80;
      }) ?? slider;
    const seekRect = seekArea.getBoundingClientRect();
    const isEffectivelyVisible = (element) => {
      if (!(element instanceof HTMLElement)) {
        return false;
      }
      let current = element;
      while (current) {
        const style = getComputedStyle(current);
        if (
          style.display === 'none' ||
          style.visibility === 'hidden' ||
          Number.parseFloat(style.opacity) === 0
        ) {
          return false;
        }
        current = current.parentElement;
      }
      const rect = element.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    };
    const visible = [...document.querySelectorAll('*')].filter(
      isEffectivelyVisible,
    );
    const timeLabels = visible.flatMap((element) => {
      if (!(element instanceof HTMLElement) || element.children.length > 0) {
        return [];
      }
      const text = element.textContent?.trim() ?? '';
      const rect = element.getBoundingClientRect();
      return /^\\d+:\\d{2}(?::\\d{2})?$/.test(text) &&
        rect.bottom <= seekRect.top + 4 &&
        rect.left <= seekRect.right &&
        rect.right >= seekRect.left
        ? [text]
        : [];
    });
    const backgroundsAboveSeekBar = visible.flatMap((element) => {
      if (!(element instanceof HTMLElement)) {
        return [];
      }
      const style = getComputedStyle(element);
      if (!style.backgroundImage || style.backgroundImage === 'none') {
        return [];
      }
      const rect = element.getBoundingClientRect();
      if (
        rect.bottom > seekRect.top + 4 ||
        rect.left > seekRect.right ||
        rect.right < seekRect.left
      ) {
        return [];
      }
      const sourceKind = style.backgroundImage.includes('blob:')
        ? 'blob'
        : style.backgroundImage.includes('data:')
          ? 'data'
          : 'remote';
      return [{
        width: rect.width,
        height: rect.height,
        left: rect.left,
        top: rect.top,
        backgroundPosition: style.backgroundPosition,
        sourceKind,
      }];
    });
    return {
      fraction: ${String(fraction)},
      expectedTime: (video?.duration ?? 0) * ${String(fraction)},
      timeLabels: [...new Set(timeLabels)],
      peakLabelVisible: visible.some(
        (element) => element.textContent?.trim() === '盛り上がりシーン',
      ),
      backgroundsAboveSeekBar,
    };
  })()
`;

const main = async (): Promise<void> => {
  const cdpEndpoint = parseArgument("cdp") ?? DEFAULT_CDP_ENDPOINT;
  const watchUrl = validateWatchUrl(parseArgument("url") ?? DEFAULT_WATCH_URL);
  const version = await getBrowserVersionEndpoint(cdpEndpoint);
  const browserClient = await RawCdpClient.connect(
    version.webSocketDebuggerUrl,
  );
  let targetId: string | undefined;

  try {
    const browserContextId = await findNiconicoBrowserContextId(browserClient);
    const created = await browserClient.send<unknown>("Target.createTarget", {
      url: "about:blank",
      ...(browserContextId ? { browserContextId } : {}),
    });
    if (!isTargetCreationResult(created)) {
      throw new Error("Target.createTargetの応答形式が不正です。");
    }
    targetId = created.targetId;

    const pageWebSocket = await waitForTargetWebSocket(
      cdpEndpoint,
      created.targetId,
    );
    const pageClient = await RawCdpClient.connect(pageWebSocket);
    const responses = new Map<string, NetworkResponseRecord>();
    const requestMethods = new Map<string, string>();
    const bodyTasks = new Set<Promise<void>>();
    const discovery: StoryboardDiscovery = {
      metadata: null,
      metadataUrl: null,
      contentUrls: new Set(),
      imageUrls: new Set(),
    };
    let phase: "loading" | "hover" = "loading";

    const unsubscribe = pageClient.subscribe((event) => {
      const params = event.params ?? {};
      if (
        event.method === "Network.requestWillBeSent" &&
        isRequestWillBeSentEvent(params)
      ) {
        requestMethods.set(params.requestId, params.request.method);
        return;
      }
      if (
        event.method === "Network.responseReceived" &&
        isResponseReceivedEvent(params)
      ) {
        responses.set(params.requestId, {
          requestId: params.requestId,
          url: params.response.url,
          method: requestMethods.get(params.requestId) ?? "unknown",
          status: params.response.status,
          mimeType: params.response.mimeType,
          phase,
        });
        return;
      }
      if (
        event.method !== "Network.loadingFinished" ||
        !isLoadingFinishedEvent(params)
      ) {
        return;
      }
      const response = responses.get(params.requestId);
      if (!response || !response.mimeType.toLowerCase().includes("json")) {
        return;
      }
      const task = pageClient
        .send<unknown>("Network.getResponseBody", {
          requestId: params.requestId,
        })
        .then((body) => {
          if (!isResponseBody(body)) {
            return;
          }
          let value: unknown;
          try {
            value = JSON.parse(decodeResponseBody(body)) as unknown;
          } catch {
            return;
          }
          recordStoryboardJson(value, response.url, discovery);
        })
        .catch(() => undefined)
        .finally(() => {
          bodyTasks.delete(task);
        });
      bodyTasks.add(task);
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
      const loaded = waitForLoad(pageClient, 45_000);
      await pageClient.send("Page.navigate", { url: watchUrl });
      await loaded;

      const geometry = await waitForSeekBar(pageClient, 45_000);
      await new Promise((resolve) => setTimeout(resolve, 4_000));
      phase = "hover";

      const snapshots: HoverSnapshot[] = [];
      for (const fraction of [0.1, 0.5, 0.75]) {
        await pageClient.send("Input.dispatchMouseEvent", {
          type: "mouseMoved",
          x: geometry.left + geometry.width / 2,
          y: Math.max(geometry.top - 100, 1),
        });
        await new Promise((resolve) => setTimeout(resolve, 50));
        await pageClient.send("Input.dispatchMouseEvent", {
          type: "mouseMoved",
          x: geometry.left + geometry.width * fraction,
          y: geometry.top + Math.max(geometry.height / 2, 1),
        });
        await new Promise((resolve) => setTimeout(resolve, 150));
        const snapshot = await evaluate(
          pageClient,
          hoverSnapshotExpression(fraction),
        );
        if (!isHoverSnapshot(snapshot)) {
          throw new Error("ホバー観測結果の形式が不正です。");
        }
        snapshots.push(snapshot);
      }
      await pageClient.send("Input.dispatchMouseEvent", {
        type: "mouseMoved",
        x: 0,
        y: 0,
      });
      await new Promise((resolve) => setTimeout(resolve, 500));
      await Promise.allSettled([...bodyTasks]);

      const contentUrlRecords = [...discovery.contentUrls].map((url) =>
        safeLocation(url),
      );
      const metadataLocation = discovery.metadataUrl
        ? safeLocation(discovery.metadataUrl)
        : null;
      const imageResponses = [...responses.values()].filter((response) =>
        discovery.imageUrls.has(response.url),
      );
      const storyboardApiResponses = [...responses.values()]
        .filter((response) => response.url.toLowerCase().includes("storyboard"))
        .map((response) => ({
          ...safeLocation(response.url),
          method: response.method,
          status: response.status,
          mimeType: response.mimeType,
          phase: response.phase,
        }));

      const outputRoot = join(
        SCRIPT_DIRECTORY,
        "..",
        "..",
        "src",
        "sandbox",
        "official-watch-bundle",
      );
      const latest = JSON.parse(
        await readFile(join(outputRoot, "latest.json"), "utf8"),
      ) as unknown;
      if (!isRecord(latest) || typeof latest.captureDirectory !== "string") {
        throw new Error("latest.jsonの形式が不正です。");
      }
      const outputPath = join(
        outputRoot,
        latest.captureDirectory,
        "seek-preview-observation.json",
      );
      await writeFile(
        outputPath,
        `${JSON.stringify(
          {
            schemaVersion: 1,
            observedAt: new Date().toISOString(),
            watchUrl,
            browser: version.Browser,
            authenticationMaterialStored: false,
            personalIdentifiersStored: false,
            queryStringsStored: false,
            sessionUserType: geometry.sessionUserType,
            seekBar: {
              width: geometry.width,
              height: geometry.height,
              hoverFractions: snapshots.map((snapshot) => snapshot.fraction),
            },
            storyboard: {
              available: discovery.metadata !== null,
              metadata: discovery.metadata,
              metadataLocation,
              contentLocations: contentUrlRecords,
              apiResponses: storyboardApiResponses,
              imageResponses: {
                count: imageResponses.length,
                phases: {
                  loading: imageResponses.filter(
                    (response) => response.phase === "loading",
                  ).length,
                  hover: imageResponses.filter(
                    (response) => response.phase === "hover",
                  ).length,
                },
                statuses: [
                  ...new Set(imageResponses.map((response) => response.status)),
                ].sort(),
                mimeTypes: [
                  ...new Set(
                    imageResponses.map((response) => response.mimeType),
                  ),
                ].sort(),
              },
            },
            hover: snapshots,
          },
          null,
          2,
        )}\n`,
        "utf8",
      );
      console.log(
        `シークプレビュー観測完了: ${geometry.sessionUserType}, storyboard=${String(discovery.metadata !== null)}, images=${String(imageResponses.length)} -> ${outputPath}`,
      );
    } finally {
      unsubscribe();
      await Promise.allSettled([...bodyTasks]);
      pageClient.close();
    }
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
