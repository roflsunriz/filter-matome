export type JsonPrimitive = boolean | number | string | null;
export type JsonValue =
  JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

export interface ServerContextOverrideSetting {
  enabled: boolean;
  value: JsonValue;
}

export type ServerContextOverrideConfig = Record<
  string,
  ServerContextOverrideSetting
>;

interface CommentPostGuardState {
  originalFetch: typeof fetch;
  originalSessionUserType: string | null;
}

type SymbolIndexedObject = {
  [key: symbol]: unknown;
};

const COMMENT_POST_GUARD_KEY = Symbol.for(
  "filter-matome.comment-post-membership-guard",
);
const PREMIUM_COLOR_COMMANDS = new Set([
  "white2",
  "red2",
  "pink2",
  "orange2",
  "yellow2",
  "green2",
  "cyan2",
  "blue2",
  "purple2",
  "black2",
]);
const DANGEROUS_PATH_SEGMENTS = new Set([
  "__proto__",
  "constructor",
  "prototype",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isJsonValue(value: unknown): value is JsonValue {
  if (
    value === null ||
    typeof value === "boolean" ||
    typeof value === "string"
  ) {
    return true;
  }
  if (typeof value === "number") {
    return Number.isFinite(value);
  }
  if (Array.isArray(value)) {
    return value.every(isJsonValue);
  }
  return (
    isRecord(value) && Object.values(value).every((item) => isJsonValue(item))
  );
}

function isSafeOverridePath(path: string): boolean {
  const segments = path.split(".");
  return (
    segments.length > 0 &&
    segments.every(
      (segment) => segment.length > 0 && !DANGEROUS_PATH_SEGMENTS.has(segment),
    )
  );
}

export function parseServerContextOverrideConfig(
  source: string,
): ServerContextOverrideConfig {
  const parsed: unknown = JSON.parse(source);
  if (!isRecord(parsed)) {
    throw new TypeError("serverContext設定はオブジェクトである必要があります");
  }

  const config: ServerContextOverrideConfig = {};
  for (const [path, candidate] of Object.entries(parsed)) {
    if (!isSafeOverridePath(path)) {
      throw new TypeError(`serverContext設定のパスが不正です: ${path}`);
    }
    if (
      !isRecord(candidate) ||
      typeof candidate["enabled"] !== "boolean" ||
      !Object.prototype.hasOwnProperty.call(candidate, "value") ||
      !isJsonValue(candidate["value"])
    ) {
      throw new TypeError(
        `serverContext設定はenabledとJSON互換のvalueが必要です: ${path}`,
      );
    }
    config[path] = {
      enabled: candidate["enabled"],
      value: candidate["value"],
    };
  }
  return config;
}

export function readSessionUserType(serverContext: unknown): string | null {
  if (!isRecord(serverContext)) {
    return null;
  }
  const sessionUser = serverContext["sessionUser"];
  if (!isRecord(sessionUser)) {
    return null;
  }
  const type = sessionUser["type"];
  return typeof type === "string" ? type : null;
}

export function applyServerContextOverrides(
  serverContext: unknown,
  config: ServerContextOverrideConfig,
): string[] {
  if (!isRecord(serverContext)) {
    throw new TypeError("serverContextはオブジェクトである必要があります");
  }

  const appliedPaths: string[] = [];
  for (const [path, setting] of Object.entries(config)) {
    if (!setting.enabled) {
      continue;
    }

    const keys = path.split(".");
    let target: Record<string, unknown> | null = serverContext;
    for (const key of keys.slice(0, -1)) {
      if (
        target === null ||
        !Object.prototype.hasOwnProperty.call(target, key) ||
        !isRecord(target[key])
      ) {
        target = null;
        break;
      }
      target = target[key];
    }

    const leafKey = keys[keys.length - 1];
    if (
      target !== null &&
      leafKey !== undefined &&
      Object.prototype.hasOwnProperty.call(target, leafKey)
    ) {
      target[leafKey] = setting.value;
      appliedPaths.push(path);
    }
  }
  return appliedPaths;
}

function isPremiumColorCommand(command: unknown): boolean {
  if (typeof command !== "string") {
    return false;
  }
  const normalized = command.toLowerCase();
  if (PREMIUM_COLOR_COMMANDS.has(normalized)) {
    return true;
  }
  if (normalized.length !== 7 || !normalized.startsWith("#")) {
    return false;
  }
  const hexDigits = "0123456789abcdef";
  return Array.from(normalized.slice(1)).every((character) =>
    hexDigits.includes(character),
  );
}

function restoreNonPremiumFlag(
  target: Record<string, unknown>,
  key: string,
): boolean {
  if (!Object.prototype.hasOwnProperty.call(target, key)) {
    return false;
  }

  const currentValue = target[key];
  const restoredValue =
    typeof currentValue === "number"
      ? 0
      : typeof currentValue === "string"
        ? "0"
        : false;
  if (currentValue === restoredValue) {
    return false;
  }
  target[key] = restoredValue;
  return true;
}

export function restoreCommentPostMembership(
  body: string,
  originalSessionUserType: string | null,
): string {
  if (originalSessionUserType === "premium") {
    return body;
  }

  try {
    const payload: unknown = JSON.parse(body);
    if (!isRecord(payload)) {
      return body;
    }

    let changed = false;
    changed = restoreNonPremiumFlag(payload, "isPremium") || changed;
    changed = restoreNonPremiumFlag(payload, "premium") || changed;

    const chat = payload["chat"];
    if (isRecord(chat)) {
      changed = restoreNonPremiumFlag(chat, "isPremium") || changed;
      changed = restoreNonPremiumFlag(chat, "premium") || changed;
    }

    const commands = payload["commands"];
    if (Array.isArray(commands)) {
      const restoredCommands = commands.filter(
        (command) => !isPremiumColorCommand(command),
      );
      if (restoredCommands.length !== commands.length) {
        payload["commands"] = restoredCommands;
        changed = true;
      }
    }

    return changed ? JSON.stringify(payload) : body;
  } catch {
    return body;
  }
}

export function isNvCommentPostRequest(url: URL, method: string): boolean {
  const pathParts = url.pathname.split("/");
  return (
    method.toUpperCase() === "POST" &&
    url.protocol === "https:" &&
    (url.hostname === "nvcomment.nicovideo.jp" ||
      url.hostname.endsWith(".nvcomment.nicovideo.jp")) &&
    pathParts.length === 5 &&
    pathParts[1] === "v1" &&
    pathParts[2] === "threads" &&
    pathParts[3].length > 0 &&
    pathParts[4] === "comments"
  );
}

function isCommentPostGuardState(
  value: unknown,
): value is CommentPostGuardState {
  return (
    isRecord(value) &&
    typeof value["originalFetch"] === "function" &&
    (typeof value["originalSessionUserType"] === "string" ||
      value["originalSessionUserType"] === null)
  );
}

function isRequestInput(input: RequestInfo | URL): input is Request {
  return (
    typeof input !== "string" &&
    "url" in input &&
    typeof input.url === "string" &&
    "clone" in input &&
    typeof input.clone === "function"
  );
}

function getFetchInputUrl(input: RequestInfo | URL): string {
  if (typeof input === "string") {
    return input;
  }
  if (isRequestInput(input)) {
    return input.url;
  }
  if ("href" in input && typeof input.href === "string") {
    return input.href;
  }
  throw new TypeError("fetchのURLを取得できませんでした");
}

export function installCommentPostMembershipGuard(
  originalSessionUserType: string | null,
  host: typeof globalThis = globalThis,
): void {
  const symbolHost = host as unknown as SymbolIndexedObject;
  const installedGuard = symbolHost[COMMENT_POST_GUARD_KEY];
  if (isCommentPostGuardState(installedGuard)) {
    installedGuard.originalSessionUserType = originalSessionUserType;
    return;
  }
  if (typeof host.fetch !== "function") {
    throw new TypeError("fetchが利用できないためコメント投稿を保護できません");
  }

  const guardState: CommentPostGuardState = {
    originalFetch: host.fetch,
    originalSessionUserType,
  };
  Object.defineProperty(host, COMMENT_POST_GUARD_KEY, {
    configurable: true,
    value: guardState,
  });

  host.fetch = async (input, init): Promise<Response> => {
    const currentGuard = symbolHost[COMMENT_POST_GUARD_KEY];
    if (!isCommentPostGuardState(currentGuard)) {
      return guardState.originalFetch(input, init);
    }

    const requestInput = isRequestInput(input) ? input : null;
    const inputUrl = getFetchInputUrl(input);
    const requestUrl = new URL(inputUrl, host.location.href);
    const method = String(
      init?.method ?? (requestInput !== null ? requestInput.method : "GET"),
    );

    let nextInput = input;
    let nextInit = init;
    if (isNvCommentPostRequest(requestUrl, method)) {
      const body =
        typeof init?.body === "string"
          ? init.body
          : requestInput !== null && init?.body === undefined
            ? await requestInput.clone().text()
            : null;
      if (body !== null) {
        const restoredBody = restoreCommentPostMembership(
          body,
          currentGuard.originalSessionUserType,
        );
        if (restoredBody !== body) {
          if (requestInput !== null && init?.body === undefined) {
            nextInput = new host.Request(input, { body: restoredBody });
          } else {
            nextInit = { ...init, body: restoredBody };
          }
        }
      }
    }

    return currentGuard.originalFetch(nextInput, nextInit);
  };
}
