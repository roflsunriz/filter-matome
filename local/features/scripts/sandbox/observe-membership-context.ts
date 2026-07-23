import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  type CdpEvent,
  getBrowserVersionEndpoint,
  RawCdpClient,
  waitForTargetWebSocket,
} from "./raw-cdp-client";

interface BrowserContextResult {
  browserContextId: string;
}

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

interface MembershipObservation {
  loggedIn: boolean;
  sessionUserType: "guest" | "regular" | "premium" | "other";
  viewerIsPremium: boolean | null;
  payment: {
    isPpv: boolean | null;
    isAdmission: boolean | null;
    isContinuationBenefit: boolean | null;
    isPremium: boolean | null;
    watchableUserType: string | null;
    commentableUserType: string | null;
    billingType: string | null;
    preview: {
      ppv: boolean | null;
      admission: boolean | null;
      continuationBenefit: boolean | null;
      premium: boolean | null;
    };
  };
  videoAds: {
    itemCount: number | null;
    reasonPresent: boolean;
  };
}

const DEFAULT_CDP_ENDPOINT = "http://127.0.0.1:9222";
const DEFAULT_WATCH_URL = "https://www.nicovideo.jp/watch/sm9";
const SCRIPT_DIRECTORY = dirname(fileURLToPath(import.meta.url));

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isBrowserContextResult = (
  value: unknown,
): value is BrowserContextResult =>
  isRecord(value) && typeof value.browserContextId === "string";

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

const isNullableBoolean = (value: unknown): value is boolean | null =>
  typeof value === "boolean" || value === null;

const isNullableString = (value: unknown): value is string | null =>
  typeof value === "string" || value === null;

const isMembershipObservation = (
  value: unknown,
): value is MembershipObservation =>
  isRecord(value) &&
  typeof value.loggedIn === "boolean" &&
  ["guest", "regular", "premium", "other"].includes(
    String(value.sessionUserType),
  ) &&
  isNullableBoolean(value.viewerIsPremium) &&
  isRecord(value.payment) &&
  isNullableBoolean(value.payment.isPpv) &&
  isNullableBoolean(value.payment.isAdmission) &&
  isNullableBoolean(value.payment.isContinuationBenefit) &&
  isNullableBoolean(value.payment.isPremium) &&
  isNullableString(value.payment.watchableUserType) &&
  isNullableString(value.payment.commentableUserType) &&
  isNullableString(value.payment.billingType) &&
  isRecord(value.payment.preview) &&
  isNullableBoolean(value.payment.preview.ppv) &&
  isNullableBoolean(value.payment.preview.admission) &&
  isNullableBoolean(value.payment.preview.continuationBenefit) &&
  isNullableBoolean(value.payment.preview.premium) &&
  isRecord(value.videoAds) &&
  (typeof value.videoAds.itemCount === "number" ||
    value.videoAds.itemCount === null) &&
  typeof value.videoAds.reasonPresent === "boolean";

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

const MEMBERSHIP_EVALUATION = String.raw`
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
    const bool = (value) => typeof value === 'boolean' ? value : null;
    const safeEnum = (value, allowed) =>
      typeof value === 'string'
        ? allowed.includes(value) ? value : 'other'
        : null;
    const enabled = (value) => bool(record(value).isEnabled);

    let serverContext = record(parseMeta('server-context'));
    let serverResponse = record(parseMeta('server-response'));
    let response = record(record(serverResponse.data).response);
    if (
      Object.keys(response).length === 0 &&
      typeof window.commonHelper?.fetchWatchPage === 'function'
    ) {
      const fetched = await window.commonHelper.fetchWatchPage();
      serverContext = record(fetched?.serverContext);
      response = record(fetched?.apiData);
    }
    const sessionUser = record(serverContext.sessionUser);
    const rawType = sessionUser.type;
    const sessionUserType =
      serverContext.sessionUser == null
        ? 'guest'
        : rawType === 'regular' || rawType === 'premium'
          ? rawType
          : 'other';
    const viewer = record(response.viewer);
    const payment = record(response.payment);
    const paymentVideo = record(payment.video);
    const preview = record(payment.preview);
    const videoAds = record(response.videoAds);

    return {
      loggedIn: serverContext.sessionUser != null,
      sessionUserType,
      viewerIsPremium: bool(viewer.isPremium),
      payment: {
        isPpv: bool(paymentVideo.isPpv),
        isAdmission: bool(paymentVideo.isAdmission),
        isContinuationBenefit: bool(paymentVideo.isContinuationBenefit),
        isPremium: bool(paymentVideo.isPremium),
        watchableUserType: safeEnum(
          paymentVideo.watchableUserType,
          ['purchaser', 'member', 'all'],
        ),
        commentableUserType: safeEnum(
          paymentVideo.commentableUserType,
          ['purchaser', 'member', 'all'],
        ),
        billingType: safeEnum(
          paymentVideo.billingType,
          ['custom', 'channel', 'none', 'free'],
        ),
        preview: {
          ppv: enabled(preview.ppv),
          admission: enabled(preview.admission),
          continuationBenefit: enabled(preview.continuationBenefit),
          premium: enabled(preview.premium),
        },
      },
      videoAds: {
        itemCount: Array.isArray(videoAds.items) ? videoAds.items.length : null,
        reasonPresent: typeof videoAds.reason === 'string',
      },
    };
  })()
`;

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

const observeTarget = async (
  browserClient: RawCdpClient,
  cdpEndpoint: string,
  watchUrl: string,
  browserContextId?: string,
): Promise<MembershipObservation> => {
  const created = await browserClient.send<unknown>("Target.createTarget", {
    url: "about:blank",
    ...(browserContextId ? { browserContextId } : {}),
  });
  if (!isTargetCreationResult(created)) {
    throw new Error("Target.createTargetの応答形式が不正です。");
  }
  const targetId = created.targetId;
  try {
    const pageWebSocket = await waitForTargetWebSocket(cdpEndpoint, targetId);
    const pageClient = await RawCdpClient.connect(pageWebSocket);
    try {
      await Promise.all([
        pageClient.send("Page.enable"),
        pageClient.send("Network.enable"),
        pageClient.send("Runtime.enable"),
      ]);
      await pageClient.send("Network.setCacheDisabled", {
        cacheDisabled: true,
      });
      const loaded = waitForLoad(pageClient, 45_000);
      await pageClient.send("Page.navigate", { url: watchUrl });
      await loaded;
      await new Promise((resolve) => setTimeout(resolve, 2_000));

      const evaluation = await pageClient.send<unknown>("Runtime.evaluate", {
        expression: MEMBERSHIP_EVALUATION,
        awaitPromise: true,
        returnByValue: true,
      });
      if (
        !isEvaluationResult(evaluation) ||
        evaluation.exceptionDetails !== undefined ||
        !isMembershipObservation(evaluation.result.value)
      ) {
        throw new Error(
          evaluation && isEvaluationResult(evaluation)
            ? `会員状態の評価に失敗しました: ${evaluation.result.description ?? "unknown"}`
            : "Runtime.evaluateの応答形式が不正です。",
        );
      }
      return evaluation.result.value;
    } finally {
      pageClient.close();
    }
  } finally {
    await browserClient
      .send("Target.closeTarget", { targetId })
      .catch(() => undefined);
  }
};

const main = async (): Promise<void> => {
  const cdpEndpoint = parseArgument("cdp") ?? DEFAULT_CDP_ENDPOINT;
  const watchUrl = validateWatchUrl(parseArgument("url") ?? DEFAULT_WATCH_URL);
  const version = await getBrowserVersionEndpoint(cdpEndpoint);
  const browserClient = await RawCdpClient.connect(
    version.webSocketDebuggerUrl,
  );
  let guestContextId: string | undefined;

  try {
    const authenticatedContextId =
      await findNiconicoBrowserContextId(browserClient);
    const authenticated = await observeTarget(
      browserClient,
      cdpEndpoint,
      watchUrl,
      authenticatedContextId,
    );
    const guestContext = await browserClient.send<unknown>(
      "Target.createBrowserContext",
      { disposeOnDetach: true },
    );
    if (!isBrowserContextResult(guestContext)) {
      throw new Error("Target.createBrowserContextの応答形式が不正です。");
    }
    guestContextId = guestContext.browserContextId;
    const guest = await observeTarget(
      browserClient,
      cdpEndpoint,
      watchUrl,
      guestContextId,
    );
    if (guest.loggedIn || guest.sessionUserType !== "guest") {
      throw new Error("一時BrowserContextがログイン状態を継承しています。");
    }

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
      "membership-context.json",
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
          authenticated,
          guest,
        },
        null,
        2,
      )}\n`,
      "utf8",
    );
    console.log(
      `会員状態観測完了: authenticated=${authenticated.sessionUserType}, guest=guest -> ${outputPath}`,
    );
  } finally {
    if (guestContextId) {
      await browserClient
        .send("Target.disposeBrowserContext", {
          browserContextId: guestContextId,
        })
        .catch(() => undefined);
    }
    browserClient.close();
  }
};

await main();
