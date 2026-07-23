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

interface QualityPair {
  videoId: string;
  audioId: string;
  videoLevel: number;
  audioLevel: number;
  available: boolean;
}

interface SelectedQuality {
  videoId: string;
  audioId: string;
}

interface QualityRuntimeResult {
  externalFetch: "blocked";
  pairs: QualityPair[];
  automaticSelection: SelectedQuality;
  constrainedSelection: SelectedQuality;
}

const DEFAULT_CDP_ENDPOINT = "http://127.0.0.1:9222";
const PLAYER_ASSET_PREFIX = "PlayerSeekBar-";
const QUALITY_MATRIX_EXPORT = "__FilterMatomeQualityMatrix";
const QUALITY_SELECTOR_EXPORT = "__FilterMatomeQualitySelector";
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

const isQualityPair = (value: unknown): value is QualityPair =>
  isRecord(value) &&
  typeof value.videoId === "string" &&
  typeof value.audioId === "string" &&
  typeof value.videoLevel === "number" &&
  typeof value.audioLevel === "number" &&
  typeof value.available === "boolean";

const isSelectedQuality = (value: unknown): value is SelectedQuality =>
  isRecord(value) &&
  typeof value.videoId === "string" &&
  typeof value.audioId === "string";

const isQualityRuntimeResult = (
  value: unknown,
): value is QualityRuntimeResult =>
  isRecord(value) &&
  value.externalFetch === "blocked" &&
  Array.isArray(value.pairs) &&
  value.pairs.every(isQualityPair) &&
  isSelectedQuality(value.automaticSelection) &&
  isSelectedQuality(value.constrainedSelection);

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

const findQualityFunctionNames = (
  source: string,
): { matrix: string; selector: string } => {
  const matrix = source.match(
    /function\s+(?<name>[a-zA-Z_$][a-zA-Z0-9_$]*)\(e\)\{if\(!e\.domand\)return\[\];let t=e\.domand\.audios\.slice\(0\)\.sort/,
  )?.groups?.name;
  const selector = source.match(
    /function\s+(?<name>[a-zA-Z_$][a-zA-Z0-9_$]*)\(e,t,n\)\{t=t===-1\?2\*\*53-1:t;let r=e\.filter\(e=>e\.video\.isAvailable&&e\.audio\.isAvailable\)/,
  )?.groups?.name;
  if (!matrix || !selector) {
    throw new Error("公式の品質候補生成・選択関数を特定できませんでした。");
  }
  return { matrix, selector };
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
  const qualityFunctions = findQualityFunctionNames(playerSource);
  console.log(
    `公式module準備完了: matrix=${qualityFunctions.matrix}, selector=${qualityFunctions.selector}`,
  );

  const server = createServer((request, response) => {
    const requestUrl = new URL(request.url ?? "/", "http://127.0.0.1");
    if (requestUrl.pathname === "/sandbox.html") {
      response.writeHead(200, {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Security-Policy":
          "default-src 'none'; script-src 'self'; connect-src 'none'; worker-src 'none'; img-src 'none'; media-src 'none'; frame-src 'none'; style-src 'none'",
        "Cache-Control": "no-store",
      });
      response.end("<!doctype html><title>quality sandbox</title>");
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
    void readFile(join(captureDirectory, fileName), "utf8")
      .then((source) => {
        const body =
          name === playerAsset
            ? `${source}\nexport { ${qualityFunctions.matrix} as ${QUALITY_MATRIX_EXPORT}, ${qualityFunctions.selector} as ${QUALITY_SELECTOR_EXPORT} };\n`
            : source;
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
  console.log(`loopback sandbox起動: port=${String(port)}`);

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
      })().finally(() => interceptionTasks.delete(task));
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
      console.log("隔離ページ準備完了: 公式moduleを実行します。");

      const expression = `
        (async () => {
          const module = await import("/assets/${playerAsset}");
          const createMatrix = module[
            ${JSON.stringify(QUALITY_MATRIX_EXPORT)}
          ];
          const selectQuality = module[
            ${JSON.stringify(QUALITY_SELECTOR_EXPORT)}
          ];
          if (
            typeof createMatrix !== "function" ||
            typeof selectQuality !== "function"
          ) {
            throw new Error("quality exports are not functions");
          }
          const watch = {
            domand: {
              videos: [
                {
                  id: "video-1080",
                  label: "1080p",
                  height: 1080,
                  bitRate: 4000000,
                  qualityLevel: 4,
                  isAvailable: false,
                },
                {
                  id: "video-720",
                  label: "720p",
                  height: 720,
                  bitRate: 2000000,
                  qualityLevel: 3,
                  isAvailable: true,
                },
                {
                  id: "video-360",
                  label: "360p",
                  height: 360,
                  bitRate: 600000,
                  qualityLevel: 1,
                  isAvailable: true,
                },
              ],
              audios: [
                {
                  id: "audio-320",
                  label: { quality: "high", bitrate: "320kbps" },
                  integratedLoudness: -14,
                  loudnessCollection: [],
                  qualityLevel: 2,
                  isAvailable: false,
                },
                {
                  id: "audio-192",
                  label: { quality: "standard", bitrate: "192kbps" },
                  integratedLoudness: -14,
                  loudnessCollection: [],
                  qualityLevel: 1,
                  isAvailable: true,
                },
                {
                  id: "audio-64",
                  label: { quality: "low", bitrate: "64kbps" },
                  integratedLoudness: -14,
                  loudnessCollection: [],
                  qualityLevel: 0,
                  isAvailable: true,
                },
              ],
            },
          };
          const matrix = createMatrix(watch);
          const automatic = selectQuality([...matrix], -1, 1);
          const constrained = selectQuality([...matrix], 1, 0);
          const pairs = matrix.map((pair) => ({
            videoId: pair.video.id,
            audioId: pair.audio.id,
            videoLevel: pair.video.qualityLevel,
            audioLevel: pair.audio.qualityLevel,
            available:
              pair.video.isAvailable && pair.audio.isAvailable,
          }));
          const externalFetch = await fetch(
            "https://example.com/filter-matome-quality-probe",
          ).then(
            () => "unexpected-success",
            () => "blocked",
          );
          return {
            externalFetch,
            pairs,
            automaticSelection: {
              videoId: automatic.video.id,
              audioId: automatic.audio.id,
            },
            constrainedSelection: {
              videoId: constrained.video.id,
              audioId: constrained.audio.id,
            },
          };
        })()
      `;
      const evaluation = await pageClient.send<unknown>("Runtime.evaluate", {
        expression,
        awaitPromise: true,
        returnByValue: true,
      });
      console.log("公式moduleの実行応答を受信しました。");
      if (
        !isEvaluationResult(evaluation) ||
        evaluation.exceptionDetails !== undefined ||
        !isQualityRuntimeResult(evaluation.result.value)
      ) {
        throw new Error(
          evaluation && isEvaluationResult(evaluation)
            ? `公式品質選択ロジックの実行に失敗しました: ${evaluation.result.description ?? "unknown"}`
            : "Runtime.evaluateの応答形式が不正です。",
        );
      }
      const result = evaluation.result.value;
      const availableCount = result.pairs.filter(
        (pair) => pair.available,
      ).length;
      if (
        result.pairs.length !== 9 ||
        availableCount !== 4 ||
        result.pairs[0]?.videoId !== "video-1080" ||
        result.pairs[0]?.audioId !== "audio-320" ||
        result.automaticSelection.videoId !== "video-720" ||
        result.automaticSelection.audioId !== "audio-192" ||
        result.constrainedSelection.videoId !== "video-360" ||
        result.constrainedSelection.audioId !== "audio-64"
      ) {
        throw new Error(
          `公式品質選択ロジックの期待値と一致しません: ${JSON.stringify(result)}`,
        );
      }

      const outputPath = join(captureDirectory, "quality-switch-runtime.json");
      await writeFile(
        outputPath,
        `${JSON.stringify(
          {
            schemaVersion: 1,
            executedAt: new Date().toISOString(),
            browser: version.Browser,
            officialModuleExecuted: true,
            officialModuleInstrumented: true,
            instrumentation:
              "既存の非export品質候補生成・選択関数へ調査専用exportだけを追加",
            externalNetworkBlocked: true,
            isolatedBrowserContext: true,
            sourceAsset: playerAsset,
            matrixLocalName: qualityFunctions.matrix,
            selectorLocalName: qualityFunctions.selector,
            syntheticCandidateCount: result.pairs.length,
            availableCombinationCount: availableCount,
            orderedPairs: result.pairs,
            automaticSelection: result.automaticSelection,
            constrainedSelection: result.constrainedSelection,
          },
          null,
          2,
        )}\n`,
        "utf8",
      );
      console.log(
        `画質・音質選択の隔離実行完了: ${playerAsset} / 外部通信遮断 -> ${outputPath}`,
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
