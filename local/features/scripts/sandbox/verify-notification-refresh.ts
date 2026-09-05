import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";

import { format } from "prettier";

import {
  getBrowserVersionEndpoint,
  RawCdpClient,
  waitForTargetWebSocket,
} from "./raw-cdp-client";

type Device = "pc" | "responsive";
type Notification = {
  id: string | number;
  read: boolean;
  [key: string]: unknown;
};
type FixturePage = {
  data: { notifications: Notification[]; [key: string]: unknown };
  [key: string]: unknown;
};
type Fixture = { pages: FixturePage[] };
type State = { partial: boolean; getCount: number; puts: number };
type Point = { x: number; y: number };
type RowStyle = { weight: string; background: string };
type FullObservation = {
  before: RowStyle;
  after: RowStyle;
  samePanel: boolean;
  button: boolean;
};
type PartialObservation = {
  first: RowStyle;
  second: RowStyle;
  samePanel: boolean;
};
type Asset = { version: string; device: Device };

interface BrowserContextResult {
  browserContextId: string;
}

interface TargetResult {
  targetId: string;
}

interface RuntimeEvaluationResult {
  result: { value?: unknown; description?: string };
  exceptionDetails?: unknown;
}

interface PausedRequest {
  requestId: string;
  request: { method: string; url: string };
}

const DEFAULT_CDP_ENDPOINT = "http://127.0.0.1:9222";
const PAGE_ORIGIN = "https://www.nicovideo.jp";
const PAGE_URL = `${PAGE_ORIGIN}/qa`;
const API_ORIGIN = "https://api.oshirasebox.nicovideo.jp";
const ASSET_ORIGIN = "https://common-header.nimg.jp";
const WATCH_HREF = `${PAGE_ORIGIN}/watch/sm9`;
const FAVORITE_HREF = `${PAGE_ORIGIN}/my/fav/user`;
const ROOT_HREF = `${PAGE_ORIGIN}/`;
const SCRIPT_DIRECTORY = import.meta.dirname;
const PROJECT_ROOT = resolve(SCRIPT_DIRECTORY, "../../../..");
const BUILD_FIXTURE_SCRIPT = resolve(
  SCRIPT_DIRECTORY,
  "..",
  "build-playwright-fixture.ts",
);
const FIXTURE_ENTRY = resolve(
  SCRIPT_DIRECTORY,
  "../../tests/fixtures/common-notification-read-all-entry.ts",
);
const FIXTURE_PATH = resolve(
  SCRIPT_DIRECTORY,
  "../../tests/fixtures/common-header-notifications.json",
);
const FILTER_PATH = resolve(
  SCRIPT_DIRECTORY,
  "../../../..",
  "nlFilters",
  "100_features.txt",
);
const ASSETS: readonly Asset[] = [
  { version: "3.11.0", device: "pc" },
  { version: "3.11.0", device: "responsive" },
  { version: "3.12.0", device: "pc" },
  { version: "3.12.0", device: "responsive" },
  { version: "3.13.0", device: "pc" },
  { version: "3.13.0", device: "responsive" },
];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const isNotification = (value: unknown): value is Notification =>
  isRecord(value) &&
  (typeof value.id === "string" || typeof value.id === "number") &&
  typeof value.read === "boolean";
const isFixture = (value: unknown): value is Fixture => {
  if (
    !isRecord(value) ||
    !Array.isArray(value.pages) ||
    value.pages.length === 0
  ) {
    return false;
  }
  const first: unknown = value.pages[0];
  return (
    isRecord(first) &&
    isRecord(first.data) &&
    Array.isArray(first.data.notifications) &&
    first.data.notifications.every(isNotification)
  );
};
const isPoint = (value: unknown): value is Point =>
  isRecord(value) &&
  typeof value.x === "number" &&
  Number.isFinite(value.x) &&
  typeof value.y === "number" &&
  Number.isFinite(value.y);
const isRowStyle = (value: unknown): value is RowStyle =>
  isRecord(value) &&
  typeof value.weight === "string" &&
  typeof value.background === "string";
const isFullObservation = (value: unknown): value is FullObservation =>
  isRecord(value) &&
  isRowStyle(value.before) &&
  isRowStyle(value.after) &&
  typeof value.samePanel === "boolean" &&
  typeof value.button === "boolean";
const isPartialObservation = (value: unknown): value is PartialObservation =>
  isRecord(value) &&
  isRowStyle(value.first) &&
  isRowStyle(value.second) &&
  typeof value.samePanel === "boolean";
const isPausedRequest = (value: unknown): value is PausedRequest =>
  isRecord(value) &&
  typeof value.requestId === "string" &&
  isRecord(value.request) &&
  typeof value.request.method === "string" &&
  typeof value.request.url === "string";
const isBoolean = (value: unknown): value is boolean =>
  typeof value === "boolean";
const isUndefined = (value: unknown): value is undefined => value === undefined;
const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);
const argument = (name: string): string | undefined => {
  const prefix = `--${name}=`;
  return process.argv
    .slice(2)
    .find((value) => value.startsWith(prefix))
    ?.slice(prefix.length);
};

const loadFixture = (): Fixture => {
  const value: unknown = JSON.parse(readFileSync(FIXTURE_PATH, "utf8"));
  if (!isFixture(value)) throw new Error("匿名通知fixtureの形式が不正です。");
  return value;
};

const readFilter = (): { pattern: RegExp; replacement: string } => {
  const source = readFileSync(FILTER_PATH, "utf8");
  const start = source.indexOf("Name = 公式通知パネルの表示更新API");
  const filter = start < 0 ? "" : source.slice(start);
  const match = filter.match(/Match<\r?\n([\s\S]*?)\r?\n>/u);
  const replace = filter.match(/Replace<\r?\n([\s\S]*?)\r?\n>/u);
  if (match?.[1] === undefined || replace?.[1] === undefined) {
    throw new Error(
      "100_features.txtの通知表示更新APIのMatch/Replaceが不正です。",
    );
  }
  return { pattern: new RegExp(match[1], "g"), replacement: replace[1] };
};

const buildFixtureBundle = (): string => {
  const temporaryRoot = resolve(tmpdir());
  const directory = mkdtempSync(
    join(temporaryRoot, "filter-matome-notification-qa-"),
  );
  if (dirname(directory) !== temporaryRoot) {
    throw new Error("検証用一時ディレクトリが想定範囲外です。");
  }
  const output = join(directory, "feature.js");
  try {
    execFileSync(
      process.execPath,
      [BUILD_FIXTURE_SCRIPT, output, FIXTURE_ENTRY],
      { cwd: PROJECT_ROOT, stdio: "pipe" },
    );
    return readFileSync(output, "utf8");
  } catch (error) {
    throw new Error(
      `匿名fixtureバンドルのビルドに失敗しました: ${errorMessage(error)}`,
    );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
};

const getOfficialBundle = async (
  asset: Asset,
  filter: { pattern: RegExp; replacement: string },
): Promise<string> => {
  const url = `${ASSET_ORIGIN}/${asset.version}/${asset.device}/CommonHeader.min.js`;
  const response = await fetch(url, { redirect: "error" });
  if (!response.ok)
    throw new Error(
      `公式CommonHeaderの取得に失敗しました: ${url} HTTP ${String(response.status)}`,
    );
  const source = await response.text();
  filter.pattern.lastIndex = 0;
  if ((source.match(filter.pattern)?.length ?? 0) !== 1) {
    throw new Error(
      `100_features.txtのMatch数が1ではありません: ${asset.version}/${asset.device}`,
    );
  }
  const transformed = source.replace(filter.pattern, filter.replacement);
  if ((await format(transformed, { parser: "babel" })).length === 0) {
    throw new Error(
      `置換後CommonHeaderが空です: ${asset.version}/${asset.device}`,
    );
  }
  return transformed;
};

const documentHtml = (): string => `<!doctype html>
<html lang="ja"><head><meta charset="utf-8"></head><body>
<header id="CommonHeader"></header>
<script src="/official.js"></script>
<script>window.header=new CommonHeader.default();header.mount("#CommonHeader",{frontendId:135,site:"nicovideo",user:{isLogin:true,id:1,nickname:"QA",iconUrl:"",isPremium:false}});</script>
<script src="/feature.js"></script><script>startNotificationReadAllTest();</script>
</body></html>`;

const evaluate = async <T>(
  client: RawCdpClient,
  expression: string,
  guard: (value: unknown) => value is T,
  awaitPromise = false,
): Promise<T> => {
  const response = await client.send<RuntimeEvaluationResult>(
    "Runtime.evaluate",
    {
      expression,
      awaitPromise,
      returnByValue: true,
    },
  );
  if (
    response.exceptionDetails !== undefined &&
    response.exceptionDetails !== null
  ) {
    throw new Error(
      `ページ評価に失敗しました: ${response.result.description ?? "unknown"}`,
    );
  }
  if (!guard(response.result.value))
    throw new Error("Runtime.evaluateの値が不正です。");
  return response.result.value;
};

const expressionFor = (expression: string, device: Device): string =>
  device === "responsive"
    ? expression.replaceAll(`${PAGE_ORIGIN}/`, "https://sp.nicovideo.jp/")
    : expression;
const waitUntil = async (
  client: RawCdpClient,
  device: Device,
  expression: string,
  label: string,
): Promise<void> => {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    if (await evaluate(client, expressionFor(expression, device), isBoolean))
      return;
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 50));
  }
  throw new Error(`${label}がタイムアウトしました。`);
};

const fulfillRequest = async (
  client: RawCdpClient,
  request: PausedRequest,
  officialBundle: string,
  featureBundle: string,
  firstPage: FixturePage,
  notices: Notification[],
  state: State,
): Promise<void> => {
  const method = request.request.method.toUpperCase();
  const url = new URL(request.request.url);
  const api = url.origin === API_ORIGIN;
  let status = 204;
  let contentType = "text/plain";
  let body = "";
  if (
    url.origin === PAGE_ORIGIN &&
    url.pathname === "/qa" &&
    method === "GET"
  ) {
    status = 200;
    contentType = "text/html";
    body = documentHtml();
  } else if (
    url.origin === PAGE_ORIGIN &&
    url.pathname === "/official.js" &&
    method === "GET"
  ) {
    status = 200;
    contentType = "application/javascript";
    body = officialBundle;
  } else if (
    url.origin === PAGE_ORIGIN &&
    url.pathname === "/feature.js" &&
    method === "GET"
  ) {
    status = 200;
    contentType = "application/javascript";
    body = featureBundle;
  } else if (api && url.pathname === "/v1/box" && method === "GET") {
    state.getCount += 1;
    status = 200;
    contentType = "application/json";
    body = JSON.stringify({
      ...firstPage,
      data: {
        ...firstPage.data,
        notifications: notices,
        nextUrl: null,
        importantUnreadCount: notices.some((item) => !item.read) ? 1 : 0,
      },
    });
  } else if (api && url.pathname === "/v1/bell" && method === "GET") {
    status = 200;
    contentType = "application/json";
    body = JSON.stringify({
      meta: { status: 200 },
      data: { badge: notices.some((item) => !item.read) },
    });
  } else if (
    api &&
    /^\/v1\/notifications\/[^/]+\/read$/u.test(url.pathname) &&
    method === "PUT"
  ) {
    state.puts += 1;
    const encodedId = url.pathname.split("/")[3];
    if (encodedId === undefined)
      throw new Error(`通知IDがありません: ${url.pathname}`);
    const id = decodeURIComponent(encodedId);
    const failed = state.partial && id === "notice-unread-2";
    if (!failed) {
      const notification = notices.find((item) => String(item.id) === id);
      if (notification) notification.read = true;
    }
    status = failed ? 500 : 200;
    contentType = "application/json";
    body = JSON.stringify({ meta: { status }, data: {} });
  }
  const headers = [
    { name: "Content-Type", value: `${contentType}; charset=utf-8` },
  ];
  if (api) {
    headers.push(
      { name: "Access-Control-Allow-Origin", value: PAGE_ORIGIN },
      { name: "Access-Control-Allow-Credentials", value: "true" },
      { name: "Access-Control-Allow-Methods", value: "GET, PUT, OPTIONS" },
      {
        name: "Access-Control-Allow-Headers",
        value: "Content-Type, X-Frontend-Id, X-Request-With",
      },
    );
  }
  const params: Record<string, unknown> = {
    requestId: request.requestId,
    responseCode: status,
    responseHeaders: headers,
  };
  if (body.length > 0 && method !== "HEAD")
    params.body = Buffer.from(body).toString("base64");
  await client.send("Fetch.fulfillRequest", params);
};

const waitForLoad = (client: RawCdpClient): Promise<void> =>
  new Promise((resolvePromise, rejectPromise) => {
    const timeout = setTimeout(() => {
      unsubscribe();
      rejectPromise(
        new Error("匿名fixtureページのloadイベントがタイムアウトしました。"),
      );
    }, 45_000);
    const unsubscribe = client.subscribe((event) => {
      if (event.method === "Page.loadEventFired") {
        clearTimeout(timeout);
        unsubscribe();
        resolvePromise();
      }
    });
  });

const runAsset = async (
  browserClient: RawCdpClient,
  cdpEndpoint: string,
  asset: Asset,
  officialBundle: string,
  featureBundle: string,
  fixture: Fixture,
): Promise<{
  version: string;
  device: Device;
  getCount: number;
  puts: number;
  full: FullObservation;
  partial: PartialObservation;
  closedStayedClosed: true;
}> => {
  const { browserContextId } = await browserClient.send<BrowserContextResult>(
    "Target.createBrowserContext",
    { disposeOnDetach: true },
  );
  let targetId: string | undefined;
  let pageClient: RawCdpClient | undefined;
  let unsubscribe = (): void => undefined;
  let closing = false;
  const errors: string[] = [];
  const pending = new Set<Promise<void>>();
  const firstPage = fixture.pages[0];
  if (!firstPage) throw new Error("匿名通知fixtureの先頭ページがありません。");
  const notices = firstPage.data.notifications.map((item) => ({ ...item }));
  const state: State = { partial: false, getCount: 0, puts: 0 };
  try {
    ({ targetId } = await browserClient.send<TargetResult>(
      "Target.createTarget",
      {
        url: "about:blank",
        browserContextId,
      },
    ));
    const webSocket = await waitForTargetWebSocket(cdpEndpoint, targetId);
    pageClient = await RawCdpClient.connect(webSocket);
    const handler = (value: PausedRequest): Promise<void> =>
      fulfillRequest(
        pageClient as RawCdpClient,
        value,
        officialBundle,
        featureBundle,
        firstPage,
        notices,
        state,
      );
    unsubscribe = pageClient.subscribe((event) => {
      if (event.method === "Runtime.exceptionThrown") {
        errors.push(`匿名ページの実行時例外: ${JSON.stringify(event.params)}`);
      }
      if (event.method !== "Fetch.requestPaused") return;
      if (!isPausedRequest(event.params)) {
        errors.push("Fetch.requestPausedの応答形式が不正です。");
        return;
      }
      const task = handler(event.params).catch((error: unknown) => {
        if (!closing) errors.push(errorMessage(error));
      });
      pending.add(task);
      void task.then(
        () => pending.delete(task),
        () => pending.delete(task),
      );
    });
    await Promise.all([
      pageClient.send("Page.enable"),
      pageClient.send("Runtime.enable"),
      pageClient.send("Network.enable"),
      pageClient.send("Fetch.enable", { patterns: [{ urlPattern: "*" }] }),
    ]);
    await Promise.all([
      pageClient.send("Network.setCacheDisabled", { cacheDisabled: true }),
      pageClient.send("Network.setBypassServiceWorker", { bypass: true }),
      pageClient.send("Emulation.setDeviceMetricsOverride", {
        width: asset.device === "pc" ? 1280 : 390,
        height: 800,
        deviceScaleFactor: 1,
        mobile: false,
      }),
    ]);
    const cookies = await pageClient.send<{ cookies: unknown[] }>(
      "Network.getAllCookies",
    );
    if (cookies.cookies.length !== 0)
      throw new Error("匿名BrowserContextのCookieが空ではありません。");
    const loaded = waitForLoad(pageClient);
    await pageClient.send("Page.navigate", { url: PAGE_URL });
    await loaded;
    await waitUntil(
      pageClient,
      asset.device,
      `(() => { const api=globalThis.FilterMatomeNotificationReadApi; return api!==null && typeof api==="object" && api.version===1 && typeof api.refresh==="function" && !("getState" in api); })()`,
      "通知表示更新API version=1/refresh",
    );
    const point = await evaluate(
      pageClient,
      `(() => { const path=document.querySelector('#CommonHeader path[d^="M19 12.05"]'); const svg=path?.closest('svg'); if (!(svg instanceof SVGSVGElement)) return null; const r=svg.getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2}; })()`,
      (value): value is Point | null => value === null || isPoint(value),
    );
    if (point === null)
      throw new Error("CommonHeaderのベルSVGを確認できませんでした。");
    await pageClient.send("Input.dispatchMouseEvent", {
      type: "mouseMoved",
      ...point,
    });
    await pageClient.send("Input.dispatchMouseEvent", {
      type: "mousePressed",
      button: "left",
      clickCount: 1,
      ...point,
    });
    await pageClient.send("Input.dispatchMouseEvent", {
      type: "mouseReleased",
      button: "left",
      clickCount: 1,
      ...point,
    });
    await waitUntil(
      pageClient,
      asset.device,
      `Boolean(document.querySelector('[data-filter-matome-notification-read-all]')) && Boolean(document.querySelector('a[href="${WATCH_HREF}"]'))`,
      "通知パネルと一括既読ボタン",
    );
    await evaluate(
      pageClient,
      expressionFor(
        `(() => { const button=document.querySelector('[data-filter-matome-notification-read-all]'); if (!(button instanceof HTMLButtonElement) || !button.parentElement?.parentElement) throw new Error('notification read-all button is unavailable'); window.qaButton=button; window.qaPanel=button.parentElement.parentElement; window.rowStyle=(href)=>{const link=document.querySelector('a[href="'+href+'"]'); if (!(link instanceof HTMLElement) || !link.parentElement) return null; const s=getComputedStyle(link.parentElement); return {weight:s.fontWeight,background:s.backgroundColor};}; window.readStyle=window.rowStyle(${JSON.stringify(ROOT_HREF)}); window.beforeStyle=window.rowStyle(${JSON.stringify(WATCH_HREF)}); button.click(); })()`,
        asset.device,
      ),
      isUndefined,
    );
    await waitUntil(
      pageClient,
      asset.device,
      `window.rowStyle(${JSON.stringify(WATCH_HREF)})?.weight===window.readStyle?.weight`,
      "全成功後の通知行更新",
    );
    const full = await evaluate(
      pageClient,
      expressionFor(
        `({before:window.beforeStyle,after:window.rowStyle(${JSON.stringify(WATCH_HREF)}),samePanel:window.qaPanel.isConnected,button:window.qaButton.isConnected})`,
        asset.device,
      ),
      isFullObservation,
    );
    if (
      !full.samePanel ||
      !full.button ||
      full.before.weight === full.after.weight ||
      full.before.background === full.after.background ||
      state.getCount !== 3 ||
      state.puts !== 2
    ) {
      throw new Error(
        `全成功の表示更新に失敗しました: ${JSON.stringify({ full, getCount: state.getCount, puts: state.puts })}`,
      );
    }
    for (const item of notices)
      if (item.id !== "notice-read") item.read = false;
    state.partial = true;
    await evaluate(
      pageClient,
      expressionFor("FilterMatomeNotificationReadApi.refresh()", asset.device),
      isUndefined,
      true,
    );
    await waitUntil(
      pageClient,
      asset.device,
      `window.rowStyle(${JSON.stringify(WATCH_HREF)})?.weight===window.beforeStyle?.weight`,
      "部分失敗前の未読表示",
    );
    await evaluate(
      pageClient,
      expressionFor("window.qaButton.click()", asset.device),
      isUndefined,
    );
    await waitUntil(
      pageClient,
      asset.device,
      `window.rowStyle(${JSON.stringify(WATCH_HREF)})?.weight===window.readStyle?.weight`,
      "部分成功した通知行の更新",
    );
    const partial = await evaluate(
      pageClient,
      expressionFor(
        `({first:window.rowStyle(${JSON.stringify(WATCH_HREF)}),second:window.rowStyle(${JSON.stringify(FAVORITE_HREF)}),samePanel:window.qaPanel.isConnected})`,
        asset.device,
      ),
      isPartialObservation,
    );
    if (
      !partial.samePanel ||
      partial.first.weight !== full.after.weight ||
      partial.first.background !== full.after.background ||
      partial.second.weight !== full.before.weight ||
      partial.second.background !== full.before.background
    ) {
      throw new Error(
        `部分成功の表示更新に失敗しました: ${JSON.stringify(partial)}`,
      );
    }
    state.partial = false;
    await waitUntil(
      pageClient,
      asset.device,
      "!window.qaButton.disabled",
      "既読ボタンの再有効化",
    );
    await evaluate(
      pageClient,
      expressionFor(
        "window.qaButton.click(); window.header.closePanel()",
        asset.device,
      ),
      isUndefined,
    );
    await waitUntil(
      pageClient,
      asset.device,
      "document.querySelector('.toast-message')?.textContent.includes('1件の通知を既読')===true",
      "閉じた後の成功通知",
    );
    if (
      !(await evaluate(
        pageClient,
        expressionFor(
          "document.querySelector('[data-filter-matome-notification-read-all]')===null",
          asset.device,
        ),
        isBoolean,
      ))
    ) {
      throw new Error("処理中に閉じた通知パネルが再表示されました。");
    }
    while (pending.size > 0) await Promise.all([...pending]);
    if (errors.length > 0)
      throw new Error(`ブラウザー要求のfulfillに失敗しました: ${errors[0]}`);
    return {
      version: asset.version,
      device: asset.device,
      getCount: state.getCount,
      puts: state.puts,
      full,
      partial,
      closedStayedClosed: true,
    };
  } finally {
    closing = true;
    unsubscribe();
    pageClient?.close();
    if (targetId !== undefined)
      await browserClient
        .send("Target.closeTarget", { targetId })
        .catch(() => undefined);
    await browserClient
      .send("Target.disposeBrowserContext", { browserContextId })
      .catch(() => undefined);
  }
};

const main = async (): Promise<void> => {
  const cdpEndpoint = argument("cdp") ?? DEFAULT_CDP_ENDPOINT;
  const filter = readFilter();
  const fixture = loadFixture();
  const featureBundle = buildFixtureBundle();
  const browserVersion = await getBrowserVersionEndpoint(cdpEndpoint);
  const browserClient = await RawCdpClient.connect(
    browserVersion.webSocketDebuggerUrl,
  );
  const results: Array<Awaited<ReturnType<typeof runAsset>>> = [];
  try {
    for (const asset of ASSETS) {
      const officialBundle = await getOfficialBundle(asset, filter);
      results.push(
        await runAsset(
          browserClient,
          cdpEndpoint,
          asset,
          officialBundle,
          featureBundle,
          fixture,
        ),
      );
    }
  } finally {
    browserClient.close();
  }
  console.log(JSON.stringify({ schemaVersion: 1, assets: results }));
};

await main();
