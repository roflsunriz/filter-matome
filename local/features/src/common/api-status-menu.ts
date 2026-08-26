import { startApiStatusMenuRuntime } from "@/common/api-status-menu-runtime.js";

const WATCH_PATH_PATTERN = /^\/watch\/[^/]+(?:\/|$)/u;

export type FilterMatomeApiStatusKind =
  "active" | "waiting" | "missing" | "incompatible" | "not-applicable";

export type FilterMatomeApiStatusId =
  "playback-rate" | "comment-reload" | "comment-menu";

export type FilterMatomeApiStatus = {
  id: FilterMatomeApiStatusId;
  kind: FilterMatomeApiStatusKind;
};

type Host = Record<string, unknown>;

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
      menuProviderStatus === "active" ? "waiting" : menuProviderStatus;
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

export function startApiStatusMenu(): void {
  startApiStatusMenuRuntime(resolveFilterMatomeApiStatuses);
}
