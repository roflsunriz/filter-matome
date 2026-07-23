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

interface RequestEvent {
  requestId: string;
  request: {
    url: string;
    method: string;
    postData?: string;
  };
}

interface ResponseEvent {
  requestId: string;
  response: {
    url: string;
    status: number;
    mimeType: string;
  };
}

interface LoadingFinishedEvent {
  requestId: string;
}

interface ResponseBody {
  body: string;
  base64Encoded: boolean;
}

interface EvaluationResult {
  result: {
    type: string;
    value?: unknown;
    description?: string;
  };
  exceptionDetails?: unknown;
}

interface MediaCandidate {
  id: string;
  isAvailable: boolean;
  qualityLevel: number;
  bitRate: number;
  label: unknown;
  width?: number;
  height?: number;
  samplingRate?: number;
}

interface DomandSnapshot {
  videos: MediaCandidate[];
  audios: MediaCandidate[];
  viewerIsPremium: boolean | null;
}

interface NetworkRecord {
  requestId: string;
  url: string;
  method: string;
  status: number;
  mimeType: string;
}

const DEFAULT_CDP_ENDPOINT = "http://127.0.0.1:9222";
const DEFAULT_WATCH_URL = "https://www.nicovideo.jp/watch/sm9";
const SCRIPT_DIRECTORY = dirname(fileURLToPath(import.meta.url));

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

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

const isRequestEvent = (value: unknown): value is RequestEvent =>
  isRecord(value) &&
  typeof value.requestId === "string" &&
  isRecord(value.request) &&
  typeof value.request.url === "string" &&
  typeof value.request.method === "string" &&
  (value.request.postData === undefined ||
    typeof value.request.postData === "string");

const isResponseEvent = (value: unknown): value is ResponseEvent =>
  isRecord(value) &&
  typeof value.requestId === "string" &&
  isRecord(value.response) &&
  typeof value.response.url === "string" &&
  typeof value.response.status === "number" &&
  typeof value.response.mimeType === "string";

const isLoadingFinishedEvent = (
  value: unknown,
): value is LoadingFinishedEvent =>
  isRecord(value) && typeof value.requestId === "string";

const isResponseBody = (value: unknown): value is ResponseBody =>
  isRecord(value) &&
  typeof value.body === "string" &&
  typeof value.base64Encoded === "boolean";

const isEvaluationResult = (value: unknown): value is EvaluationResult =>
  isRecord(value) &&
  isRecord(value.result) &&
  typeof value.result.type === "string";

const decodeBody = (value: ResponseBody): string =>
  value.base64Encoded
    ? Buffer.from(value.body, "base64").toString("utf8")
    : value.body;

const findBrowserContextId = async (
  browserClient: RawCdpClient,
): Promise<string | undefined> => {
  const result = await browserClient.send<unknown>("Target.getTargets");
  if (
    !isRecord(result) ||
    !Array.isArray(result.targetInfos) ||
    !result.targetInfos.every(isTargetInfo)
  ) {
    throw new Error("Target.getTargetsの応答形式が不正です。");
  }
  return result.targetInfos.find((target) => {
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

const isMediaCandidate = (value: unknown): value is MediaCandidate =>
  isRecord(value) &&
  typeof value.id === "string" &&
  typeof value.isAvailable === "boolean" &&
  typeof value.qualityLevel === "number" &&
  typeof value.bitRate === "number";

const findDomandSnapshot = (
  value: unknown,
  depth = 0,
): DomandSnapshot | null => {
  if (depth > 7 || !isRecord(value)) {
    return null;
  }
  const media = value.media;
  const domand = isRecord(media) ? media.domand : null;
  if (
    isRecord(domand) &&
    Array.isArray(domand.videos) &&
    domand.videos.every(isMediaCandidate) &&
    Array.isArray(domand.audios) &&
    domand.audios.every(isMediaCandidate)
  ) {
    const viewer = value.viewer;
    return {
      videos: domand.videos,
      audios: domand.audios,
      viewerIsPremium:
        isRecord(viewer) && typeof viewer.isPremium === "boolean"
          ? viewer.isPremium
          : null,
    };
  }
  for (const child of Object.values(value)) {
    const found = findDomandSnapshot(child, depth + 1);
    if (found) {
      return found;
    }
  }
  return null;
};

const sanitizeCandidate = (
  candidate: MediaCandidate,
): Record<string, unknown> => ({
  id: candidate.id,
  label: candidate.label,
  isAvailable: candidate.isAvailable,
  qualityLevel: candidate.qualityLevel,
  bitRate: candidate.bitRate,
  ...(typeof candidate.width === "number" ? { width: candidate.width } : {}),
  ...(typeof candidate.height === "number" ? { height: candidate.height } : {}),
  ...(typeof candidate.samplingRate === "number"
    ? { samplingRate: candidate.samplingRate }
    : {}),
});

const safePath = (value: string): string => {
  const url = new URL(value);
  return url.pathname
    .split("/")
    .map((segment) => {
      if (/^(?:sm|so|nm|ca)\d+$/i.test(segment)) {
        return ":watchId";
      }
      if (/^\d{5,}$/.test(segment)) {
        return ":id";
      }
      if (/^[a-zA-Z0-9_=.-]{24,}$/.test(segment)) {
        const extension = segment.match(/(\.[a-zA-Z0-9]+)$/)?.[1] ?? "";
        return `:opaque${extension}`;
      }
      return segment;
    })
    .join("/");
};

const safeLocation = (value: string): Record<string, string> => {
  const url = new URL(value);
  return { origin: url.origin, pathPattern: safePath(value) };
};

const extractTrackId = (value: string): string | null => {
  const decoded = decodeURIComponent(new URL(value).pathname);
  return (
    decoded.match(/(?:sm|so|nm|ca)\d+((?:video|audio)-[a-zA-Z0-9-]+)/)?.[1] ??
    null
  );
};

const QUALITY_EVALUATION = String.raw`
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
    const record = (value) =>
      value && typeof value === 'object' && !Array.isArray(value) ? value : {};
    const serverResponse = record(parseMeta('server-response'));
    let response = record(record(serverResponse.data).response);
    if (
      Object.keys(response).length === 0 &&
      typeof window.commonHelper?.fetchWatchPage === 'function'
    ) {
      try {
        response = record((await window.commonHelper.fetchWatchPage())?.apiData);
      } catch {}
    }
    return {
      media: record(response.media),
      viewer: record(response.viewer),
    };
  })()
`;

const parseAccessOutputs = (postData: string | undefined): string[][] => {
  if (!postData) {
    return [];
  }
  try {
    const parsed: unknown = JSON.parse(postData);
    if (!isRecord(parsed) || !Array.isArray(parsed.outputs)) {
      return [];
    }
    return parsed.outputs.flatMap((output) =>
      Array.isArray(output) && output.every((item) => typeof item === "string")
        ? [output]
        : [],
    );
  } catch {
    return [];
  }
};

const parseAttributeList = (value: string): Record<string, string> => {
  const attributes: Record<string, string> = {};
  for (const match of value.matchAll(/([A-Z0-9-]+)=("[^"]*"|[^,]*)/g)) {
    attributes[match[1]] = match[2].replace(/^"|"$/g, "");
  }
  return attributes;
};

const parseManifest = (
  body: string,
  responseUrl: string,
): Record<string, unknown> => {
  const lines = body
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const streamVariants: Record<string, unknown>[] = [];
  const audioRenditions: Record<string, unknown>[] = [];
  let pendingStream: Record<string, string> | null = null;
  for (const line of lines) {
    if (line.startsWith("#EXT-X-STREAM-INF:")) {
      pendingStream = parseAttributeList(
        line.slice("#EXT-X-STREAM-INF:".length),
      );
      continue;
    }
    if (line.startsWith("#EXT-X-MEDIA:")) {
      const attributes = parseAttributeList(line.slice("#EXT-X-MEDIA:".length));
      if (attributes.TYPE === "AUDIO") {
        audioRenditions.push({
          groupId: attributes["GROUP-ID"] ?? null,
          name: attributes.NAME ?? null,
          default: attributes.DEFAULT ?? null,
          autoselect: attributes.AUTOSELECT ?? null,
          channels: attributes.CHANNELS ?? null,
          uri: attributes.URI
            ? safeLocation(new URL(attributes.URI, responseUrl).href)
            : null,
        });
      }
      continue;
    }
    if (pendingStream && !line.startsWith("#")) {
      streamVariants.push({
        bandwidth: Number.parseInt(pendingStream.BANDWIDTH ?? "0", 10),
        averageBandwidth: Number.parseInt(
          pendingStream["AVERAGE-BANDWIDTH"] ?? "0",
          10,
        ),
        resolution: pendingStream.RESOLUTION ?? null,
        frameRate: pendingStream["FRAME-RATE"] ?? null,
        codecs: pendingStream.CODECS ?? null,
        audioGroup: pendingStream.AUDIO ?? null,
        uri: safeLocation(new URL(line, responseUrl).href),
      });
      pendingStream = null;
    }
  }
  return {
    ...safeLocation(responseUrl),
    kind: streamVariants.length > 0 ? "master" : "media",
    streamVariants,
    audioRenditions,
    targetDuration:
      lines
        .find((line) => line.startsWith("#EXT-X-TARGETDURATION:"))
        ?.split(":")[1] ?? null,
    segmentCount: lines.filter((line) => !line.startsWith("#")).length,
    separateAudioDeclared: audioRenditions.length > 0,
  };
};

const waitForLoad = (client: RawCdpClient): Promise<void> =>
  new Promise((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error("watchページの読み込みがタイムアウトしました。")),
      45_000,
    );
    const unsubscribe = client.subscribe((event) => {
      if (event.method === "Page.loadEventFired") {
        clearTimeout(timeout);
        unsubscribe();
        resolve();
      }
    });
  });

const waitForVideo = async (client: RawCdpClient): Promise<boolean> => {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    const result = await client.send<unknown>("Runtime.evaluate", {
      expression:
        '(() => { const video = document.querySelector("video"); return !!video && video.readyState >= 2; })()',
      returnByValue: true,
    });
    if (
      isEvaluationResult(result) &&
      result.exceptionDetails === undefined &&
      result.result.value === true
    ) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  return false;
};

const main = async (): Promise<void> => {
  const cdpEndpoint = parseArgument("cdp") ?? DEFAULT_CDP_ENDPOINT;
  const watchUrl = validateWatchUrl(parseArgument("url") ?? DEFAULT_WATCH_URL);
  const version = await getBrowserVersionEndpoint(cdpEndpoint);
  const browserClient = await RawCdpClient.connect(
    version.webSocketDebuggerUrl,
  );
  let targetId: string | undefined;

  try {
    const browserContextId = await findBrowserContextId(browserClient);
    const created = await browserClient.send<unknown>("Target.createTarget", {
      url: "about:blank",
      ...(browserContextId ? { browserContextId } : {}),
    });
    if (!isTargetCreationResult(created)) {
      throw new Error("Target.createTargetの応答形式が不正です。");
    }
    targetId = created.targetId;
    const pageWebSocket = await waitForTargetWebSocket(cdpEndpoint, targetId);
    const pageClient = await RawCdpClient.connect(pageWebSocket);
    const requests = new Map<string, RequestEvent["request"]>();
    const responses = new Map<string, NetworkRecord>();
    const bodyTasks = new Set<Promise<void>>();
    const manifests: Record<string, unknown>[] = [];
    const observationState: {
      domandSnapshot: DomandSnapshot | null;
    } = {
      domandSnapshot: null,
    };

    const unsubscribe = pageClient.subscribe((event: CdpEvent) => {
      const params = event.params ?? {};
      if (
        event.method === "Network.requestWillBeSent" &&
        isRequestEvent(params)
      ) {
        requests.set(params.requestId, params.request);
        return;
      }
      if (
        event.method === "Network.responseReceived" &&
        isResponseEvent(params)
      ) {
        responses.set(params.requestId, {
          requestId: params.requestId,
          url: params.response.url,
          method: requests.get(params.requestId)?.method ?? "unknown",
          status: params.response.status,
          mimeType: params.response.mimeType,
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
      if (!response) {
        return;
      }
      const isJson = response.mimeType.toLowerCase().includes("json");
      const isManifest =
        response.mimeType.toLowerCase().includes("mpegurl") ||
        new URL(response.url).pathname.endsWith(".m3u8");
      if (!isJson && !isManifest) {
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
          const decoded = decodeBody(body);
          if (isManifest && decoded.includes("#EXTM3U")) {
            manifests.push(parseManifest(decoded, response.url));
          }
          if (isJson) {
            try {
              observationState.domandSnapshot ??= findDomandSnapshot(
                JSON.parse(decoded) as unknown,
              );
            } catch {
              // JSON以外の応答は無視する。
            }
          }
        })
        .catch(() => undefined)
        .finally(() => bodyTasks.delete(task));
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
      const loaded = waitForLoad(pageClient);
      await pageClient.send("Page.navigate", { url: watchUrl });
      await loaded;
      const videoBecameReady = await waitForVideo(pageClient);
      const qualityEvaluation = await pageClient.send<unknown>(
        "Runtime.evaluate",
        {
          expression: QUALITY_EVALUATION,
          awaitPromise: true,
          returnByValue: true,
        },
      );
      if (
        isEvaluationResult(qualityEvaluation) &&
        qualityEvaluation.exceptionDetails === undefined
      ) {
        observationState.domandSnapshot ??= findDomandSnapshot(
          qualityEvaluation.result.value,
        );
      }
      await new Promise((resolve) => setTimeout(resolve, 5_000));
      await Promise.allSettled([...bodyTasks]);

      const accessRightsRequests = [...requests.values()]
        .filter((request) =>
          new URL(request.url).pathname.includes("/access-rights/hls"),
        )
        .map((request) => ({
          method: request.method,
          ...safeLocation(request.url),
          outputs: parseAccessOutputs(request.postData),
        }));
      const mediaResponses = [...responses.values()].filter((response) => {
        const path = new URL(response.url).pathname;
        return path.endsWith(".cmfv") || path.endsWith(".cmfa");
      });
      const videoSegments = mediaResponses.filter((response) =>
        new URL(response.url).pathname.endsWith(".cmfv"),
      );
      const audioSegments = mediaResponses.filter((response) =>
        new URL(response.url).pathname.endsWith(".cmfa"),
      );
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
        "quality-delivery-observation.json",
      );
      const videos = observationState.domandSnapshot?.videos ?? [];
      const audios = observationState.domandSnapshot?.audios ?? [];
      await writeFile(
        outputPath,
        `${JSON.stringify(
          {
            schemaVersion: 1,
            observedAt: new Date().toISOString(),
            watchUrl,
            browser: version.Browser,
            videoBecameReady,
            authenticationMaterialStored: false,
            personalIdentifiersStored: false,
            queryStringsStored: false,
            viewerIsPremium:
              observationState.domandSnapshot?.viewerIsPremium ?? null,
            candidates: {
              videos: videos.map(sanitizeCandidate),
              audios: audios.map(sanitizeCandidate),
              crossProductCount: videos.length * audios.length,
              availableCombinationCount:
                videos.filter((video) => video.isAvailable).length *
                audios.filter((audio) => audio.isAvailable).length,
            },
            accessRightsRequests,
            hls: {
              manifests,
              videoSegments: {
                count: videoSegments.length,
                trackIds: [
                  ...new Set(
                    videoSegments
                      .map((response) => extractTrackId(response.url))
                      .filter((value): value is string => value !== null),
                  ),
                ],
              },
              audioSegments: {
                count: audioSegments.length,
                trackIds: [
                  ...new Set(
                    audioSegments
                      .map((response) => extractTrackId(response.url))
                      .filter((value): value is string => value !== null),
                  ),
                ],
              },
              separateVideoAndAudioRequests:
                videoSegments.length > 0 && audioSegments.length > 0,
            },
          },
          null,
          2,
        )}\n`,
        "utf8",
      );
      console.log(
        `画質・音質配信観測完了: video=${String(videos.length)}, audio=${String(audios.length)}, segments=${String(mediaResponses.length)} -> ${outputPath}`,
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
