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

interface ComputedFrame {
  time: number;
  imageIndex: number | null;
  positionX: number | null;
  positionY: number | null;
}

interface SeekPreviewRuntimeResult {
  externalFetch: "blocked";
  computedFrames: ComputedFrame[];
  renderedFrame: {
    childCount: number;
    width: string;
    height: string;
    backgroundPosition: string;
    backgroundImageSet: boolean;
  };
}

const DEFAULT_CDP_ENDPOINT = "http://127.0.0.1:9222";
const PLAYER_ASSET_PREFIX = "PlayerSeekBar-";
const STORYBOARD_MODEL_EXPORT = "__FilterMatomeStoryboardModel";
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

const isComputedFrame = (value: unknown): value is ComputedFrame =>
  isRecord(value) &&
  typeof value.time === "number" &&
  (typeof value.imageIndex === "number" || value.imageIndex === null) &&
  (typeof value.positionX === "number" || value.positionX === null) &&
  (typeof value.positionY === "number" || value.positionY === null);

const isSeekPreviewRuntimeResult = (
  value: unknown,
): value is SeekPreviewRuntimeResult =>
  isRecord(value) &&
  value.externalFetch === "blocked" &&
  Array.isArray(value.computedFrames) &&
  value.computedFrames.every(isComputedFrame) &&
  isRecord(value.renderedFrame) &&
  typeof value.renderedFrame.childCount === "number" &&
  typeof value.renderedFrame.width === "string" &&
  typeof value.renderedFrame.height === "string" &&
  typeof value.renderedFrame.backgroundPosition === "string" &&
  typeof value.renderedFrame.backgroundImageSet === "boolean";

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

const findExportName = (source: string, localName: string): string => {
  const escaped = localName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = source.match(
    new RegExp(
      `export\\{[^}]*\\b${escaped}\\s+as\\s+(?<exportName>[a-zA-Z_$][a-zA-Z0-9_$]*)\\b[^}]*\\};?\\s*$`,
    ),
  );
  const exportName = match?.groups?.exportName;
  if (!exportName) {
    throw new Error(`${localName}のexport名を特定できませんでした。`);
  }
  return exportName;
};

const findStoryboardModelName = (source: string): string => {
  const match = source.match(
    /var\s+(?<className>[a-zA-Z_$][a-zA-Z0-9_$]*)=class e\{constructor\(t\)\{[^}]{0,400}this\.imageObjectURLs=new Map/,
  );
  const className = match?.groups?.className;
  if (!className) {
    throw new Error("公式Storyboard modelのクラス名を特定できませんでした。");
  }
  return className;
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
  const storyboardModelName = findStoryboardModelName(playerSource);
  const storyboardRendererExport = findExportName(playerSource, "Gj");
  console.log(
    `公式module準備完了: model=${storyboardModelName}, renderer=${storyboardRendererExport}`,
  );

  const server = createServer((request, response) => {
    const requestUrl = new URL(request.url ?? "/", "http://127.0.0.1");
    if (requestUrl.pathname === "/sandbox.html") {
      response.writeHead(200, {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Security-Policy":
          "default-src 'none'; script-src 'self'; connect-src 'none'; worker-src 'none'; img-src data: blob:; media-src 'none'; frame-src 'none'; style-src 'none'",
        "Cache-Control": "no-store",
      });
      response.end("<!doctype html><title>seek preview sandbox</title>");
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
            ? `${source}\nexport { ${storyboardModelName} as ${STORYBOARD_MODEL_EXPORT} };\n`
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
      console.log("隔離ページ準備完了: 公式moduleを実行します。");

      const expression = `
        (async () => {
          const module = await import("/assets/${playerAsset}");
          const StoryboardModel = module[
            ${JSON.stringify(STORYBOARD_MODEL_EXPORT)}
          ];
          const StoryboardRenderer = module[
            ${JSON.stringify(storyboardRendererExport)}
          ];
          if (
            typeof StoryboardModel !== "function" ||
            typeof StoryboardRenderer !== "function"
          ) {
            throw new Error("storyboard exports are not constructors");
          }

          const sheetUrls = ["urn:sheet:0", "urn:sheet:1"];
          const rendererEvents = {
            on: () => () => {},
          };
          const model = new StoryboardModel({
            thumbnailWidth: 120,
            thumbnailHeight: 90,
            rows: 10,
            columns: 10,
            intervalMs: 2000,
            images: sheetUrls.map((url) => ({ url })),
            renderer: {
              events: rendererEvents,
              isFlip: () => false,
            },
          });
          const imageData =
            "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";
          sheetUrls.forEach((url, index) => {
            model.imageObjectURLs.set(url, imageData + "#" + String(index));
          });

          const times = [
            0,
            1.999,
            2,
            198,
            199.999,
            200,
            398,
            399.999,
            400,
          ];
          const computedFrames = times.map((time) => {
            const computed = model.compute(time);
            const imageIndex = computed
              ? sheetUrls.findIndex(
                  (url) =>
                    model.imageObjectURLs.get(url) ===
                    computed.imageObjectURL,
                )
              : null;
            return {
              time,
              imageIndex,
              positionX: computed?.positionX ?? null,
              positionY: computed?.positionY ?? null,
            };
          });

          const stage = document.createElement("div");
          Object.assign(stage.style, {
            position: "relative",
            width: "144px",
            height: "108px",
          });
          document.body.appendChild(stage);
          const view = new StoryboardRenderer(stage, model);
          view.update(200);
          await Promise.resolve();
          const image = stage.firstElementChild;
          const renderedFrame = {
            childCount: stage.childElementCount,
            width: image instanceof HTMLElement ? image.style.width : "",
            height: image instanceof HTMLElement ? image.style.height : "",
            backgroundPosition:
              image instanceof HTMLElement
                ? image.style.backgroundPosition
                : "",
            backgroundImageSet:
              image instanceof HTMLElement &&
              image.style.backgroundImage !== "",
          };
          view.dispose();
          model.dispose();
          stage.remove();

          const externalFetch = await fetch(
            "https://example.com/filter-matome-seek-preview-probe",
          ).then(
            () => "unexpected-success",
            () => "blocked",
          );
          return { externalFetch, computedFrames, renderedFrame };
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
        !isSeekPreviewRuntimeResult(evaluation.result.value)
      ) {
        throw new Error(
          evaluation && isEvaluationResult(evaluation)
            ? `公式storyboard実行に失敗しました: ${evaluation.result.description ?? "unknown"}`
            : "Runtime.evaluateの応答形式が不正です。",
        );
      }
      const result = evaluation.result.value;
      const frameAt200Seconds = result.computedFrames.find(
        (frame) => frame.time === 200,
      );
      const capacityBoundary = result.computedFrames.find(
        (frame) => frame.time === 400,
      );
      if (
        frameAt200Seconds?.imageIndex !== 1 ||
        frameAt200Seconds.positionX !== 0 ||
        frameAt200Seconds.positionY !== 0 ||
        capacityBoundary?.imageIndex !== null ||
        result.renderedFrame.childCount !== 1 ||
        result.renderedFrame.width !== "120px" ||
        result.renderedFrame.height !== "90px" ||
        result.renderedFrame.backgroundPosition !== "0px 0px" ||
        !result.renderedFrame.backgroundImageSet
      ) {
        throw new Error(
          `公式storyboardの期待値と一致しません: ${JSON.stringify(result)}`,
        );
      }

      const outputPath = join(captureDirectory, "seek-preview-runtime.json");
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
              "既存の非export Storyboard modelへ調査専用exportだけを追加",
            externalNetworkBlocked: true,
            isolatedBrowserContext: true,
            sourceAsset: playerAsset,
            modelLocalName: storyboardModelName,
            rendererExport: storyboardRendererExport,
            syntheticMetadata: {
              thumbnailWidth: 120,
              thumbnailHeight: 90,
              rows: 10,
              columns: 10,
              intervalMs: 2000,
              imageCount: 2,
            },
            computedFrames: result.computedFrames,
            renderedFrame: result.renderedFrame,
          },
          null,
          2,
        )}\n`,
        "utf8",
      );
      console.log(
        `シークプレビュー隔離実行完了: ${playerAsset} / 外部通信遮断 -> ${outputPath}`,
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
