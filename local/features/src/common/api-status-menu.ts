import {
  refreshApiStatusMenuRuntime,
  startApiStatusMenuRuntime,
} from "@/common/api-status-menu-runtime.js";

const WATCH_PATH_PATTERN = /^\/watch\/[^/]+(?:\/|$)/u;
const COMMENT_MENU_BUNDLE_PATH_PATTERN =
  /^\/web\/scripts\/nvpc_next\/assets\/ExpandedComment-[^/?]+\.js$/u;
const COMMENT_MENU_PROBE_INTERVAL_MS = 180_000;
const COMMENT_MENU_PROBE_RETRY_MS = COMMENT_MENU_PROBE_INTERVAL_MS;
const COMMENT_MENU_PROBE_TIMEOUT_MS = 10_000;
const COMMENT_MENU_SOURCE_MAX_LENGTH = 1_000_000;
const COMMENT_MENU_SOURCE_MARKERS = [
  "FilterMatomeCommentMenuApi",
  "FilterMatomeCommentMenuBridgeApi={version:1}",
  ".getItems(",
  ".execute(",
] as const;

export type FilterMatomeApiStatusKind =
  | "active"
  | "probing"
  | "missing"
  | "incompatible"
  | "probe-error"
  | "not-applicable";

export type FilterMatomeApiStatusId =
  "playback-rate" | "comment-reload" | "comment-menu";

export type FilterMatomeApiStatus = {
  id: FilterMatomeApiStatusId;
  kind: FilterMatomeApiStatusKind;
};

type Host = Record<string, unknown>;
type CommentMenuProbeStatus = "probing" | "active" | "missing" | "probe-error";
type ResourceEntry = { name: string };
type ProbeFetch = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

let commentMenuProbeStatus: CommentMenuProbeStatus = "probing";
let commentMenuProbeUrl = "";
let commentMenuProbeInFlight = false;
let commentMenuProbeRetryAt = 0;
let automaticProbeStarted = false;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const versionedApiStatus = (
  candidate: unknown,
  methodNames: string[],
): FilterMatomeApiStatusKind => {
  if (candidate === undefined) return "missing";
  if (
    !isRecord(candidate) ||
    candidate["version"] !== 1 ||
    methodNames.some((name) => typeof candidate[name] !== "function")
  ) {
    return "incompatible";
  }
  return "active";
};

export function resolveFilterMatomeApiStatuses(
  host: Host,
  pathname: string,
  probedCommentMenuStatus: CommentMenuProbeStatus = "probing",
): FilterMatomeApiStatus[] {
  if (!WATCH_PATH_PATTERN.test(pathname)) {
    return (["playback-rate", "comment-reload", "comment-menu"] as const).map(
      (id) => ({ id, kind: "not-applicable" }),
    );
  }

  const menuBridge = host["FilterMatomeCommentMenuBridgeApi"];
  const menuProviderStatus = versionedApiStatus(
    host["FilterMatomeCommentMenuApi"],
    ["getItems", "execute"],
  );
  let menuStatus: FilterMatomeApiStatusKind;
  if (menuBridge === undefined) {
    menuStatus =
      menuProviderStatus === "active"
        ? probedCommentMenuStatus
        : menuProviderStatus;
  } else if (isRecord(menuBridge) && menuBridge["version"] === 1) {
    menuStatus = menuProviderStatus;
  } else {
    menuStatus = "incompatible";
  }

  return [
    {
      id: "playback-rate",
      kind: versionedApiStatus(host["FilterMatomePlaybackRateApi"], [
        "get",
        "set",
      ]),
    },
    {
      id: "comment-reload",
      kind: versionedApiStatus(host["FilterMatomeCommentApi"], ["reload"]),
    },
    { id: "comment-menu", kind: menuStatus },
  ];
}

export function findLoadedCommentMenuBundleUrl(
  entries: readonly ResourceEntry[],
): string | null {
  for (let index = entries.length - 1; index >= 0; index -= 1) {
    const candidate = entries[index]?.name;
    if (!candidate) continue;
    try {
      const url = new URL(candidate);
      if (
        url.protocol === "https:" &&
        url.hostname === "resource.video.nimg.jp" &&
        COMMENT_MENU_BUNDLE_PATH_PATTERN.test(url.pathname)
      ) {
        url.search = "";
        url.hash = "";
        return url.href;
      }
    } catch {
      // Performance entries can contain non-URL names from other initiators.
    }
  }
  return null;
}

export async function probeCommentMenuBundle(
  url: string,
  fetcher: ProbeFetch = fetch,
): Promise<Exclude<CommentMenuProbeStatus, "probing">> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return "probe-error";
  }
  if (
    parsed.protocol !== "https:" ||
    parsed.hostname !== "resource.video.nimg.jp" ||
    !COMMENT_MENU_BUNDLE_PATH_PATTERN.test(parsed.pathname)
  ) {
    return "probe-error";
  }

  const controller = new AbortController();
  const timeoutId = globalThis.setTimeout(
    () => controller.abort(),
    COMMENT_MENU_PROBE_TIMEOUT_MS,
  );
  try {
    const response = await fetcher(parsed.href, {
      cache: "no-store",
      credentials: "omit",
      signal: controller.signal,
    });
    if (!response.ok) return "probe-error";
    const source = await response.text();
    if (source.length > COMMENT_MENU_SOURCE_MAX_LENGTH) return "probe-error";
    return COMMENT_MENU_SOURCE_MARKERS.every((marker) =>
      source.includes(marker),
    )
      ? "active"
      : "missing";
  } catch {
    return "probe-error";
  } finally {
    globalThis.clearTimeout(timeoutId);
  }
}

const updateAutomaticCommentMenuProbe = async (): Promise<void> => {
  if (!WATCH_PATH_PATTERN.test(location.pathname)) {
    commentMenuProbeStatus = "probing";
    commentMenuProbeUrl = "";
    commentMenuProbeRetryAt = 0;
    return;
  }
  if (
    isRecord(window.FilterMatomeCommentMenuBridgeApi) &&
    window.FilterMatomeCommentMenuBridgeApi["version"] === 1
  ) {
    commentMenuProbeStatus = "active";
    return;
  }

  const url = findLoadedCommentMenuBundleUrl(
    performance.getEntriesByType("resource"),
  );
  if (!url || commentMenuProbeInFlight) return;
  if (url !== commentMenuProbeUrl) {
    commentMenuProbeUrl = url;
    commentMenuProbeStatus = "probing";
    commentMenuProbeRetryAt = 0;
  } else if (
    commentMenuProbeStatus === "active" ||
    commentMenuProbeStatus === "missing" ||
    Date.now() < commentMenuProbeRetryAt
  ) {
    return;
  }

  commentMenuProbeInFlight = true;
  const probedUrl = url;
  const result = await probeCommentMenuBundle(url);
  commentMenuProbeInFlight = false;
  if (commentMenuProbeUrl !== probedUrl) return;
  commentMenuProbeStatus = result;
  commentMenuProbeRetryAt =
    result === "probe-error" ? Date.now() + COMMENT_MENU_PROBE_RETRY_MS : 0;
};

export function startApiStatusMenu(): void {
  startApiStatusMenuRuntime((host, pathname) =>
    resolveFilterMatomeApiStatuses(host, pathname, commentMenuProbeStatus),
  );
  if (automaticProbeStarted) return;
  automaticProbeStarted = true;
  const probe = (): void => {
    if (document.visibilityState !== "hidden") {
      void updateAutomaticCommentMenuProbe().finally(
        refreshApiStatusMenuRuntime,
      );
    }
  };
  probe();
  window.setInterval(probe, COMMENT_MENU_PROBE_INTERVAL_MS);
  if (document.readyState !== "complete") {
    window.addEventListener("load", probe, { once: true });
  }
  if (
    typeof PerformanceObserver !== "undefined" &&
    PerformanceObserver.supportedEntryTypes.includes("resource")
  ) {
    const resourceObserver = new PerformanceObserver((entryList) => {
      if (findLoadedCommentMenuBundleUrl(entryList.getEntries())) probe();
    });
    resourceObserver.observe({ type: "resource", buffered: true });
  }
  document.addEventListener("visibilitychange", probe);
  window.addEventListener("pageshow", probe);
  window.addEventListener("online", probe);
}
