import {
  getBrowserVersionEndpoint,
  RawCdpClient,
  waitForTargetWebSocket,
} from "./raw-cdp-client";

interface TargetCreationResult {
  targetId: string;
}

interface EvaluationResult {
  result: {
    value?: unknown;
  };
}

interface HarajukuObservation {
  active: string | null;
  bodyChildCount: number;
  bottomAreaCount: number;
  chromeCount: number;
  clientWidth: number;
  descriptionCount: number;
  gridCount: number;
  harajukuImportantDeclarations: number;
  harajukuLinkBeforeOfficial: boolean;
  harajukuSheetLoaded: boolean;
  horizontalOverflow: boolean;
  officialStylesheetFound: boolean;
  pageHeading: string;
  rootExists: boolean;
  scrollWidth: number;
  sectionCount: number;
  sectionClasses: string[];
  sidebarAreaCount: number;
}

interface VideoState {
  currentTime: number;
  errorCode: number | null;
  errorMessage: string | null;
  exists: true;
  paused: boolean;
  readyState: number;
}

interface HarajukuIconObservation {
  documentTopDelta: number | null;
  exists: boolean;
  pageAnchored: boolean;
  position: string | null;
  scrollDelta: number | null;
}

const DEFAULT_CDP_ENDPOINT = "http://127.0.0.1:9222";
const DEFAULT_WATCH_URL = "https://www.nicovideo.jp/watch/sm9";
const SETTINGS_KEY = "nicoVideoController_moduleSettings";

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object";
}

function isTargetCreationResult(value: unknown): value is TargetCreationResult {
  return isRecord(value) && typeof value["targetId"] === "string";
}

function isEvaluationResult(value: unknown): value is EvaluationResult {
  return isRecord(value) && isRecord(value["result"]);
}

function isHarajukuObservation(value: unknown): value is HarajukuObservation {
  return (
    isRecord(value) &&
    (value["active"] === null || typeof value["active"] === "string") &&
    typeof value["bodyChildCount"] === "number" &&
    typeof value["bottomAreaCount"] === "number" &&
    typeof value["chromeCount"] === "number" &&
    typeof value["clientWidth"] === "number" &&
    typeof value["descriptionCount"] === "number" &&
    typeof value["gridCount"] === "number" &&
    typeof value["harajukuImportantDeclarations"] === "number" &&
    typeof value["harajukuLinkBeforeOfficial"] === "boolean" &&
    typeof value["harajukuSheetLoaded"] === "boolean" &&
    typeof value["horizontalOverflow"] === "boolean" &&
    typeof value["officialStylesheetFound"] === "boolean" &&
    typeof value["pageHeading"] === "string" &&
    typeof value["rootExists"] === "boolean" &&
    typeof value["scrollWidth"] === "number" &&
    typeof value["sectionCount"] === "number" &&
    Array.isArray(value["sectionClasses"]) &&
    value["sectionClasses"].every((item) => typeof item === "string") &&
    typeof value["sidebarAreaCount"] === "number"
  );
}

function sanitizedUrl(value: string): string {
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
}

function sanitizeDiagnosticText(value: string): string {
  return value.replaceAll(/https?:\/\/[^\s)\]}]+/gu, (candidate) =>
    sanitizedUrl(candidate),
  );
}

function parseArgument(name: string): string | undefined {
  const prefix = `--${name}=`;
  return process.argv
    .slice(2)
    .find((argument) => argument.startsWith(prefix))
    ?.slice(prefix.length);
}

function validateWatchUrl(value: string): string {
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
}

function waitForLoad(client: RawCdpClient, timeoutMs: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      unsubscribe();
      reject(new Error("watchページのloadイベントがタイムアウトしました"));
    }, timeoutMs);
    const unsubscribe = client.subscribe((event) => {
      if (event.method === "Page.loadEventFired") {
        clearTimeout(timeout);
        unsubscribe();
        resolve();
      }
    });
  });
}

async function evaluate(
  client: RawCdpClient,
  expression: string,
): Promise<unknown> {
  const result = await client.send<unknown>("Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  if (!isEvaluationResult(result)) {
    throw new Error("Runtime.evaluateの応答形式が不正です");
  }
  return result.result.value;
}

const OBSERVATION_EXPRESSION = `(() => {
  const harajukuLink = document.getElementById("filter-matome-watch-harajuku-stylesheet");
  const officialLink = Array.from(document.querySelectorAll('link[rel="stylesheet"]')).find(
    (link) => link.href.includes('/assets/root-') && link.href.includes('.css')
  );
  const headNodes = Array.from(document.head.children);
  let importantDeclarations = 0;
  const visitRules = (rules) => {
    for (const rule of rules) {
      if (rule.style) {
        for (const property of rule.style) {
          if (rule.style.getPropertyPriority(property) === 'important') {
            importantDeclarations += 1;
          }
        }
      }
      if (rule.cssRules) visitRules(rule.cssRules);
    }
  };
  try {
    if (harajukuLink?.sheet) visitRules(harajukuLink.sheet.cssRules);
  } catch {}
  return {
    active: document.documentElement.getAttribute('data-filter-matome-harajuku'),
    bodyChildCount: document.body?.childElementCount ?? 0,
    bottomAreaCount: document.querySelectorAll('[class*="grid-area_"][class*="bottom"]').length,
    chromeCount: document.querySelectorAll('.HarajukuWatchChrome').length,
    clientWidth: document.documentElement.clientWidth,
    descriptionCount: document.querySelectorAll('.HarajukuDescription').length,
    gridCount: document.querySelectorAll('section[class*="grid-template-areas"]').length,
    harajukuImportantDeclarations: importantDeclarations,
    harajukuLinkBeforeOfficial: Boolean(
      harajukuLink && officialLink &&
      headNodes.indexOf(harajukuLink) < headNodes.indexOf(officialLink)
    ),
    harajukuSheetLoaded: Boolean(harajukuLink?.sheet),
    horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    officialStylesheetFound: Boolean(officialLink),
    pageHeading: document.querySelector('h1')?.textContent?.trim() ?? '',
    rootExists: Boolean(document.getElementById('root')),
    scrollWidth: document.documentElement.scrollWidth,
    sectionCount: document.querySelectorAll('section').length,
    sectionClasses: Array.from(document.querySelectorAll('section')).slice(0, 12).map(
      (section) => section.className
    ),
    sidebarAreaCount: document.querySelectorAll('[class*="grid-area_"][class*="sidebar"]').length,
  };
})()`;

const VIDEO_STATE_EXPRESSION = `(() => {
  const video = document.querySelector('video');
  if (!video) return { exists: false };
  return {
    exists: true,
    paused: video.paused,
    currentTime: video.currentTime,
    duration: Number.isFinite(video.duration) ? video.duration : null,
    readyState: video.readyState,
    networkState: video.networkState,
    errorCode: video.error?.code ?? null,
    errorMessage: video.error?.message ?? null,
  };
})()`;

async function observePlayback(client: RawCdpClient): Promise<void> {
  const before = await evaluate(client, VIDEO_STATE_EXPRESSION);
  await new Promise((resolve) => setTimeout(resolve, 5_000));
  const after = await evaluate(client, VIDEO_STATE_EXPRESSION);
  console.log(`[watch-playback] ${JSON.stringify({ before, after })}`);
  if (!isVideoState(before) || !isVideoState(after)) {
    throw new Error("動画要素または再生状態を取得できませんでした");
  }
  if (after.errorCode !== null) {
    throw new Error(
      `動画でMediaErrorが発生しました: ${after.errorCode} ${after.errorMessage ?? ""}`,
    );
  }
  if (after.paused || after.currentTime - before.currentTime < 1) {
    throw new Error(
      `動画の再生が進行しませんでした: ${JSON.stringify({ before, after })}`,
    );
  }
}

function isVideoState(value: unknown): value is VideoState {
  return (
    isRecord(value) &&
    value["exists"] === true &&
    typeof value["paused"] === "boolean" &&
    typeof value["currentTime"] === "number" &&
    typeof value["readyState"] === "number" &&
    (value["errorCode"] === null || typeof value["errorCode"] === "number") &&
    (value["errorMessage"] === null ||
      typeof value["errorMessage"] === "string")
  );
}

function isHarajukuIconObservation(
  value: unknown,
): value is HarajukuIconObservation {
  return (
    isRecord(value) &&
    (value["documentTopDelta"] === null ||
      typeof value["documentTopDelta"] === "number") &&
    typeof value["exists"] === "boolean" &&
    typeof value["pageAnchored"] === "boolean" &&
    (value["position"] === null || typeof value["position"] === "string") &&
    (value["scrollDelta"] === null || typeof value["scrollDelta"] === "number")
  );
}

async function verifyPageAnchoredHarajukuIcon(
  client: RawCdpClient,
): Promise<void> {
  const value = await evaluate(
    client,
    `(async () => {
      const icon = document.querySelector('#CommonHeader a[href^="https://www.nicovideo.jp?"]');
      if (!(icon instanceof HTMLElement)) {
        return {
          exists: false,
          position: null,
          pageAnchored: false,
          scrollDelta: null,
          documentTopDelta: null,
        };
      }
      const startScroll = window.scrollY;
      const before = icon.getBoundingClientRect();
      const beforeDocumentTop = before.top + startScroll;
      window.scrollTo(0, startScroll + 240);
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const afterScroll = window.scrollY;
      const after = icon.getBoundingClientRect();
      const afterDocumentTop = after.top + afterScroll;
      window.scrollTo(0, startScroll);
      return {
        exists: true,
        position: getComputedStyle(icon).position,
        pageAnchored: Math.abs(beforeDocumentTop - afterDocumentTop) < 1,
        scrollDelta: Math.round(afterScroll - startScroll),
        documentTopDelta: Math.round(afterDocumentTop - beforeDocumentTop),
      };
    })()`,
  );
  if (
    !isHarajukuIconObservation(value) ||
    !value.exists ||
    value.position !== "absolute" ||
    !value.pageAnchored ||
    value.scrollDelta === null ||
    value.scrollDelta <= 0
  ) {
    throw new Error(
      `原宿風ニコニコアイコンがページ座標へ固定されていません: ${JSON.stringify(value)}`,
    );
  }
}

async function waitForHarajuku(
  client: RawCdpClient,
): Promise<HarajukuObservation> {
  const startedAt = performance.now();
  let gridSeenAt: number | null = null;
  for (let attempt = 0; attempt < 60; attempt += 1) {
    const value = await evaluate(client, OBSERVATION_EXPRESSION);
    if (isHarajukuObservation(value)) {
      if (value.pageHeading === "エラーが発生しました") {
        throw new Error(
          `公式Watchが${Math.round(performance.now() - startedAt)}ms後にエラー画面へ遷移しました: ${JSON.stringify(value)}`,
        );
      }
      if (value.gridCount > 0 && gridSeenAt === null) {
        gridSeenAt = performance.now();
      }
      if (
        value.active === "active" &&
        value.chromeCount === 1 &&
        value.descriptionCount === 1 &&
        value.harajukuSheetLoaded &&
        value.officialStylesheetFound
      ) {
        return value;
      }
      if (gridSeenAt !== null && performance.now() - gridSeenAt > 10_000) {
        throw new Error(
          `公式grid出現後10秒以内にHarajuku DOMを生成できませんでした: ${JSON.stringify(value)}`,
        );
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  const lastValue = await evaluate(client, OBSERVATION_EXPRESSION);
  throw new Error(
    `Harajukuの初期化を確認できませんでした: ${JSON.stringify(lastValue)}`,
  );
}

async function waitForOfficialWatch(
  client: RawCdpClient,
): Promise<HarajukuObservation> {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    const value = await evaluate(client, OBSERVATION_EXPRESSION);
    if (
      isHarajukuObservation(value) &&
      (value.gridCount > 0 || value.pageHeading === "エラーが発生しました")
    ) {
      return value;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  const lastValue = await evaluate(client, OBSERVATION_EXPRESSION);
  throw new Error(
    `公式Watchの初期化を確認できませんでした: ${JSON.stringify(lastValue)}`,
  );
}

async function main(): Promise<void> {
  const cdpEndpoint = parseArgument("cdp") ?? DEFAULT_CDP_ENDPOINT;
  const watchUrl = validateWatchUrl(parseArgument("url") ?? DEFAULT_WATCH_URL);
  const enableHarajuku = parseArgument("enable-harajuku") !== "false";
  const moduleId = parseArgument("module") ?? "watch_harajuku";
  if (!/^[a-z][a-z0-9_]+$/u.test(moduleId)) {
    throw new Error(`不正なモジュールIDです: ${moduleId}`);
  }
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
      throw new Error("Target.createTargetの応答形式が不正です");
    }
    targetId = created.targetId;
    const pageWebSocket = await waitForTargetWebSocket(cdpEndpoint, targetId);
    const pageClient = await RawCdpClient.connect(pageWebSocket);
    const diagnostics: string[] = [];
    const requestUrls = new Map<string, string>();
    const recordDiagnostic = (message: string): void => {
      if (diagnostics.length < 40) {
        diagnostics.push(sanitizeDiagnosticText(message));
      }
    };
    const unsubscribe = pageClient.subscribe((event) => {
      const params = event.params;
      if (!isRecord(params)) {
        return;
      }
      if (event.method === "Network.requestWillBeSent") {
        const requestId = params["requestId"];
        const request = params["request"];
        if (
          typeof requestId === "string" &&
          isRecord(request) &&
          typeof request["url"] === "string"
        ) {
          requestUrls.set(requestId, sanitizedUrl(request["url"]));
        }
        return;
      }
      if (event.method === "Runtime.exceptionThrown") {
        const details = params["exceptionDetails"];
        if (!isRecord(details)) {
          return;
        }
        const exception = details["exception"];
        const description = isRecord(exception)
          ? exception["description"]
          : undefined;
        const text = details["text"];
        recordDiagnostic(
          `[runtime] ${typeof description === "string" ? description : typeof text === "string" ? text : "unknown exception"}`,
        );
        return;
      }
      if (event.method === "Log.entryAdded") {
        const entry = params["entry"];
        if (
          isRecord(entry) &&
          (entry["level"] === "error" || entry["level"] === "warning") &&
          typeof entry["text"] === "string"
        ) {
          recordDiagnostic(
            `[console:${String(entry["level"])}] ${entry["text"]}`,
          );
        }
        return;
      }
      if (event.method === "Network.loadingFailed") {
        const requestId = params["requestId"];
        const errorText = params["errorText"];
        const type = params["type"];
        if (typeof errorText === "string") {
          recordDiagnostic(
            `[network:${typeof type === "string" ? type : "unknown"}] ${errorText}${typeof requestId === "string" && requestUrls.has(requestId) ? ` ${requestUrls.get(requestId)}` : ""}`,
          );
        }
        return;
      }
      if (event.method === "Network.responseReceived") {
        const response = params["response"];
        if (
          isRecord(response) &&
          typeof response["status"] === "number" &&
          response["status"] >= 400 &&
          typeof response["url"] === "string"
        ) {
          recordDiagnostic(
            `[http:${String(response["status"])}] ${sanitizedUrl(response["url"])}`,
          );
        } else if (
          isRecord(response) &&
          typeof response["status"] === "number" &&
          typeof response["url"] === "string" &&
          /(?:nvapi\.nicovideo\.jp\/v1\/watch\/|delivery\.domand\.nicovideo\.jp|\.m3u8(?:$|\?))/u.test(
            response["url"],
          )
        ) {
          recordDiagnostic(
            `[video-http:${String(response["status"])}] ${sanitizedUrl(response["url"])}`,
          );
        }
      }
    });
    try {
      await Promise.all([
        pageClient.send("Page.enable"),
        pageClient.send("Runtime.enable"),
        pageClient.send("Network.enable"),
        pageClient.send("Log.enable"),
      ]);
      await pageClient.send("Network.setCacheDisabled", {
        cacheDisabled: true,
      });
      await pageClient.send("Network.setBypassServiceWorker", {
        bypass: true,
      });

      let loaded = waitForLoad(pageClient, 45_000);
      await pageClient.send("Page.navigate", { url: watchUrl });
      await loaded;
      await evaluate(
        pageClient,
        `localStorage.setItem(${JSON.stringify(SETTINGS_KEY)}, ${JSON.stringify(JSON.stringify({ [moduleId]: { enabled: enableHarajuku } }))})`,
      );
      loaded = waitForLoad(pageClient, 45_000);
      await pageClient.send("Page.reload", { ignoreCache: true });
      await loaded;

      if (!enableHarajuku) {
        await waitForOfficialWatch(pageClient);
        await new Promise((resolve) => setTimeout(resolve, 5_000));
        const observationValue = await evaluate(
          pageClient,
          OBSERVATION_EXPRESSION,
        );
        if (!isHarajukuObservation(observationValue)) {
          throw new Error("5秒後の公式Watch状態を取得できませんでした");
        }
        const observation = observationValue;
        if (
          observation.pageHeading === "エラーが発生しました" ||
          observation.gridCount === 0
        ) {
          throw new Error(
            `公式Watchがエラー画面です: ${JSON.stringify(observation)}\nDiagnostics:\n${diagnostics.join("\n") || "none"}`,
          );
        }
        console.log(`[watch] ${JSON.stringify(observation)}`);
        if (diagnostics.length > 0) {
          console.log(`[watch-diagnostics]\n${diagnostics.join("\n")}`);
        }
        await observePlayback(pageClient);
        return;
      }

      for (const viewport of [
        { width: 1024, height: 600 },
        { width: 1920, height: 1080 },
      ]) {
        await pageClient.send("Emulation.setDeviceMetricsOverride", {
          width: viewport.width,
          height: viewport.height,
          deviceScaleFactor: 1,
          mobile: false,
        });
        let observation: HarajukuObservation;
        try {
          observation = await waitForHarajuku(pageClient);
        } catch (error) {
          throw new Error(
            `${error instanceof Error ? error.message : String(error)}\nDiagnostics:\n${diagnostics.join("\n") || "none"}`,
          );
        }
        const viewportName = `${String(viewport.width)}x${String(viewport.height)}`;
        await verifyPageAnchoredHarajukuIcon(pageClient);
        if (
          observation.harajukuImportantDeclarations !== 0 ||
          !observation.harajukuLinkBeforeOfficial ||
          observation.horizontalOverflow
        ) {
          const overflowElements = observation.horizontalOverflow
            ? await evaluate(
                pageClient,
                `(() => {
                  const viewportWidth = document.documentElement.clientWidth;
                  const elements = Array.from(document.querySelectorAll('*'))
                    .map((element) => {
                      const rect = element.getBoundingClientRect();
                      return {
                        tag: element.tagName,
                        id: element.id,
                        className: typeof element.className === 'string' ? element.className : '',
                        left: Math.round(rect.left),
                        right: Math.round(rect.right),
                        width: Math.round(rect.width),
                        ancestors: Array.from((() => {
                          const values = [];
                          let current = element.parentElement;
                          for (let index = 0; current && index < 5; index += 1) {
                            values.push(current);
                            current = current.parentElement;
                          }
                          return values;
                        })()).map((ancestor) => ({
                          tag: ancestor.tagName,
                          id: ancestor.id,
                          role: ancestor.getAttribute('role'),
                          dataElementArea: ancestor.getAttribute('data-element-area'),
                          dataNvpcScope: ancestor.getAttribute('data-nvpc-scope'),
                          dataNvpcPart: ancestor.getAttribute('data-nvpc-part'),
                        })),
                      };
                    })
                    .filter((item) => item.width > 0 && (item.left < -1 || item.right > viewportWidth + 1))
                    .sort((left, right) => right.width - left.width)
                    .slice(0, 20);
                  return {
                    documentClientWidth: document.documentElement.clientWidth,
                    documentScrollWidth: document.documentElement.scrollWidth,
                    bodyClientWidth: document.body.clientWidth,
                    bodyScrollWidth: document.body.scrollWidth,
                    elements,
                  };
                })()`,
              )
            : [];
          throw new Error(
            `${viewportName}のHarajuku CSS契約に違反しました: ${JSON.stringify(observation)}\nOverflow: ${JSON.stringify(overflowElements)}`,
          );
        }
        console.log(
          `[harajuku-css] ${viewportName}: ${JSON.stringify(observation)}`,
        );
      }
      await observePlayback(pageClient);
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
    browserClient.close();
  }
}

if (import.meta.main) {
  await main();
}
