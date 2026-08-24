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
  descriptionCount: number;
  gridCount: number;
  harajukuImportantDeclarations: number;
  harajukuLinkBeforeOfficial: boolean;
  harajukuSheetLoaded: boolean;
  horizontalOverflow: boolean;
  officialStylesheetFound: boolean;
  pageHeading: string;
  rootExists: boolean;
  sectionCount: number;
  sectionClasses: string[];
  sidebarAreaCount: number;
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
    typeof value["descriptionCount"] === "number" &&
    typeof value["gridCount"] === "number" &&
    typeof value["harajukuImportantDeclarations"] === "number" &&
    typeof value["harajukuLinkBeforeOfficial"] === "boolean" &&
    typeof value["harajukuSheetLoaded"] === "boolean" &&
    typeof value["horizontalOverflow"] === "boolean" &&
    typeof value["officialStylesheetFound"] === "boolean" &&
    typeof value["pageHeading"] === "string" &&
    typeof value["rootExists"] === "boolean" &&
    typeof value["sectionCount"] === "number" &&
    Array.isArray(value["sectionClasses"]) &&
    value["sectionClasses"].every((item) => typeof item === "string") &&
    typeof value["sidebarAreaCount"] === "number"
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
    sectionCount: document.querySelectorAll('section').length,
    sectionClasses: Array.from(document.querySelectorAll('section')).slice(0, 12).map(
      (section) => section.className
    ),
    sidebarAreaCount: document.querySelectorAll('[class*="grid-area_"][class*="sidebar"]').length,
  };
})()`;

async function waitForHarajuku(
  client: RawCdpClient,
): Promise<HarajukuObservation> {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    const value = await evaluate(client, OBSERVATION_EXPRESSION);
    if (
      isHarajukuObservation(value) &&
      value.active === "active" &&
      value.chromeCount === 1 &&
      value.descriptionCount === 1 &&
      value.harajukuSheetLoaded &&
      value.officialStylesheetFound
    ) {
      return value;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  const lastValue = await evaluate(client, OBSERVATION_EXPRESSION);
  throw new Error(
    `Harajukuの初期化を確認できませんでした: ${JSON.stringify(lastValue)}`,
  );
}

async function main(): Promise<void> {
  const cdpEndpoint = parseArgument("cdp") ?? DEFAULT_CDP_ENDPOINT;
  const watchUrl = validateWatchUrl(parseArgument("url") ?? DEFAULT_WATCH_URL);
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
    try {
      await Promise.all([
        pageClient.send("Page.enable"),
        pageClient.send("Runtime.enable"),
        pageClient.send("Network.enable"),
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
        `localStorage.setItem(${JSON.stringify(SETTINGS_KEY)}, ${JSON.stringify(JSON.stringify({ watch_harajuku: { enabled: true } }))})`,
      );
      loaded = waitForLoad(pageClient, 45_000);
      await pageClient.send("Page.reload", { ignoreCache: true });
      await loaded;

      const observations: Array<{
        viewport: string;
        observation: HarajukuObservation;
      }> = [];
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
        const observation = await waitForHarajuku(pageClient);
        observations.push({
          viewport: `${String(viewport.width)}x${String(viewport.height)}`,
          observation,
        });
      }

      for (const { viewport, observation } of observations) {
        if (
          observation.harajukuImportantDeclarations !== 0 ||
          !observation.harajukuLinkBeforeOfficial ||
          observation.horizontalOverflow
        ) {
          throw new Error(
            `${viewport}のHarajuku CSS契約に違反しました: ${JSON.stringify(observation)}`,
          );
        }
        console.log(
          `[harajuku-css] ${viewport}: ${JSON.stringify(observation)}`,
        );
      }
    } finally {
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
