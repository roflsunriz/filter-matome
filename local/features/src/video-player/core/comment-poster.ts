const NVAPI_BASE_URL = "https://nvapi.nicovideo.jp";
const FRONTEND_ID = "6";
const FRONTEND_VERSION = "0";
const CLIENT_OS_TYPE = "others";
const MAX_COMMENT_LENGTH = 75;
const MAX_COMMAND_COUNT = 20;
const MAX_COMMAND_LENGTH = 32;

type RecordLike = Record<string, unknown>;

export type CommentPostErrorCode =
  | "invalid-comment"
  | "invalid-context"
  | "not-logged-in"
  | "not-commentable"
  | "captcha-required"
  | "invalid-184"
  | "rate-limited"
  | "network-error"
  | "api-error";

export class CommentPostError extends Error {
  public readonly cause?: unknown;

  constructor(
    public readonly code: CommentPostErrorCode,
    message: string,
    cause?: unknown,
  ) {
    super(message);
    this.name = "CommentPostError";
    this.cause = cause;
  }
}

export interface CommentPostRequest {
  videoId: string;
  body: string;
  commands: string[];
  vposMs: number;
}

export interface PostedComment {
  id?: string;
  no?: number;
  body: string;
  commands: string[];
  vposMs: number;
}

export interface CommentPosterDependencies {
  fetchImpl?: typeof fetch;
  fetchWatchPage?: (videoId: string) => Promise<unknown>;
}

interface PostingContext {
  videoId: string;
  server: string;
  threadId: string;
  isThreadkeyRequired: boolean;
}

interface PostKey {
  value: string;
  challengeToken?: string;
}

const isRecord = (value: unknown): value is RecordLike =>
  typeof value === "object" && value !== null;

const readRecord = (
  record: RecordLike | undefined,
  key: string,
): RecordLike | undefined => {
  const value = record?.[key];
  return isRecord(value) ? value : undefined;
};

const readString = (
  record: RecordLike | undefined,
  key: string,
): string | undefined => {
  const value = record?.[key];
  return typeof value === "string" && value.length > 0 ? value : undefined;
};

const readId = (
  record: RecordLike | undefined,
  key: string,
): string | undefined => {
  const value = record?.[key];
  if (typeof value === "string" && value.length > 0) {
    return value;
  }
  return typeof value === "number" && Number.isFinite(value)
    ? String(value)
    : undefined;
};

const parseJson = async (response: Response): Promise<unknown> => {
  try {
    return await response.json();
  } catch {
    return null;
  }
};

const readApiErrorCode = (payload: unknown): string | undefined => {
  const meta = readRecord(isRecord(payload) ? payload : undefined, "meta");
  return readString(meta, "errorCode");
};

const mapApiError = (
  payload: unknown,
  fallbackMessage: string,
  status?: number,
): CommentPostError => {
  const errorCode = readApiErrorCode(payload);
  if (status === 401) {
    return new CommentPostError(
      "not-logged-in",
      "ニコニコ動画へログインしてから投稿してください。",
    );
  }
  if (status === 403) {
    return new CommentPostError(
      "not-commentable",
      "この動画には現在コメントを投稿できません。",
    );
  }
  if (status === 429) {
    return new CommentPostError(
      "rate-limited",
      "短時間に投稿が集中しています。しばらく待ってから再試行してください。",
    );
  }
  switch (errorCode) {
    case "UNAUTHORIZED":
      return new CommentPostError(
        "not-logged-in",
        "ニコニコ動画へログインしてから投稿してください。",
      );
    case "FORBIDDEN":
    case "NOT_ALLOWED":
    case "BANNED":
      return new CommentPostError(
        "not-commentable",
        "この動画には現在コメントを投稿できません。",
      );
    case "TOO_MANY_REQUESTS":
      return new CommentPostError(
        "rate-limited",
        "短時間に投稿が集中しています。しばらく待ってから再試行してください。",
      );
    default:
      return new CommentPostError("api-error", fallbackMessage);
  }
};

const normalizeCommands = (
  commands: string[],
  isThreadkeyRequired: boolean,
): string[] => {
  const normalized = commands
    .flatMap((command) => command.split(/\s+/))
    .map((command) => command.trim())
    .filter((command) => command.length > 0);

  if (normalized.length > MAX_COMMAND_COUNT) {
    throw new CommentPostError(
      "invalid-comment",
      `コマンドは${String(MAX_COMMAND_COUNT)}個以内で指定してください。`,
    );
  }
  if (
    normalized.some(
      (command) =>
        command.length > MAX_COMMAND_LENGTH ||
        [...command].some((character) => {
          const code = character.charCodeAt(0);
          return code <= 31 || code === 127;
        }),
    )
  ) {
    throw new CommentPostError(
      "invalid-comment",
      "利用できないコメントコマンドが含まれています。",
    );
  }

  const uniqueCommands = [...new Set(normalized)];
  if (isThreadkeyRequired) {
    if (uniqueCommands.includes("184")) {
      throw new CommentPostError(
        "invalid-184",
        "チャンネル・コミュニティ動画では184コマンドを使用できません。",
      );
    }
    return uniqueCommands;
  }

  return uniqueCommands.includes("184")
    ? uniqueCommands
    : [...uniqueCommands, "184"];
};

const findDefaultPostTarget = (value: unknown): RecordLike | undefined => {
  if (!Array.isArray(value)) {
    return undefined;
  }
  const candidates = value as unknown[];
  return candidates.find(
    (candidate): candidate is RecordLike =>
      isRecord(candidate) && candidate["isDefaultPostTarget"] === true,
  );
};

const validateCommentBody = (body: string): void => {
  if (body.trim().length === 0) {
    throw new CommentPostError(
      "invalid-comment",
      "投稿するコメントを入力してください。",
    );
  }
  if (body.length > MAX_COMMENT_LENGTH) {
    throw new CommentPostError(
      "invalid-comment",
      `コメントは${String(MAX_COMMENT_LENGTH)}文字以内で入力してください。`,
    );
  }
};

const validateCommentServer = (server: string): string => {
  let url: URL;
  try {
    url = new URL(server);
  } catch (error) {
    throw new CommentPostError(
      "invalid-context",
      "コメント投稿先のURLが不正です。",
      error,
    );
  }

  if (
    url.protocol !== "https:" ||
    (url.hostname !== "public.nvcomment.nicovideo.jp" &&
      !url.hostname.endsWith(".nvcomment.nicovideo.jp"))
  ) {
    throw new CommentPostError(
      "invalid-context",
      "信頼できないコメント投稿先が返されました。",
    );
  }
  return url.origin;
};

const parsePostingContext = (
  watchPageResult: unknown,
  requestedVideoId: string,
): PostingContext => {
  if (!isRecord(watchPageResult)) {
    throw new CommentPostError(
      "invalid-context",
      "視聴ページのコメント投稿情報を取得できませんでした。",
    );
  }

  const serverContext = readRecord(watchPageResult, "serverContext");
  if (
    serverContext &&
    Object.prototype.hasOwnProperty.call(serverContext, "sessionUser") &&
    serverContext["sessionUser"] === null
  ) {
    throw new CommentPostError(
      "not-logged-in",
      "ニコニコ動画へログインしてから投稿してください。",
    );
  }

  const apiData = readRecord(watchPageResult, "apiData");
  const video = readRecord(apiData, "video");
  const videoId = readString(video, "id");
  if (!videoId || videoId !== requestedVideoId) {
    throw new CommentPostError(
      "invalid-context",
      "視聴ページと再生中の動画IDが一致しません。",
    );
  }

  const comment = readRecord(apiData, "comment");
  const nvComment = readRecord(comment, "nvComment");
  const server = readString(nvComment, "server");
  const defaultThread = findDefaultPostTarget(comment?.["threads"]);

  if (!server || !isRecord(defaultThread)) {
    throw new CommentPostError(
      "not-commentable",
      "この動画には利用可能なコメント投稿先がありません。",
    );
  }

  const threadId = readId(defaultThread, "id");
  if (!threadId) {
    throw new CommentPostError(
      "invalid-context",
      "コメント投稿先のスレッドIDを取得できませんでした。",
    );
  }

  if (defaultThread["postkeyStatus"] === 4) {
    throw new CommentPostError(
      "not-commentable",
      "利用規約上の制限によりコメントを投稿できません。",
    );
  }

  return {
    videoId,
    server: validateCommentServer(server),
    threadId,
    isThreadkeyRequired: defaultThread["isThreadkeyRequired"] === true,
  };
};

export class CommentPoster {
  private readonly fetchImpl: typeof fetch;
  private readonly fetchWatchPage: (videoId: string) => Promise<unknown>;

  constructor(dependencies: CommentPosterDependencies = {}) {
    this.fetchImpl = dependencies.fetchImpl ?? window.fetch.bind(window);
    this.fetchWatchPage =
      dependencies.fetchWatchPage ??
      ((videoId) => window.commonHelper.fetchWatchPage(videoId));
  }

  async post(request: CommentPostRequest): Promise<PostedComment> {
    validateCommentBody(request.body);
    const vposMs = Math.max(0, Math.floor(request.vposMs));
    if (!Number.isFinite(vposMs)) {
      throw new CommentPostError(
        "invalid-comment",
        "コメントの投稿位置を取得できませんでした。",
      );
    }

    const watchPage = await this.fetchWatchPage(request.videoId).catch(
      (error: unknown) => {
        throw new CommentPostError(
          "network-error",
          "視聴ページのコメント投稿情報を取得できませんでした。",
          error,
        );
      },
    );
    const context = parsePostingContext(watchPage, request.videoId);
    const commands = normalizeCommands(
      request.commands,
      context.isThreadkeyRequired,
    );

    for (let attempt = 0; attempt < 2; attempt++) {
      const postKey = await this.fetchPostKey(context.threadId);
      const response = await this.fetchImpl(
        `${context.server}/v1/threads/${encodeURIComponent(context.threadId)}/comments?pc=1`,
        {
          method: "POST",
          mode: "cors",
          credentials: "omit",
          cache: "no-store",
          headers: {
            "Content-Type": "application/json;charset=utf-8",
            "X-Frontend-Id": FRONTEND_ID,
            "X-Frontend-Version": FRONTEND_VERSION,
            "X-Client-Os-Type": CLIENT_OS_TYPE,
          },
          body: JSON.stringify({
            videoId: context.videoId,
            commands,
            body: request.body,
            vposMs,
            postKey: postKey.value,
            challengeToken: postKey.challengeToken,
          }),
        },
      ).catch((error: unknown) => {
        throw new CommentPostError(
          "network-error",
          "コメント投稿APIへ接続できませんでした。",
          error,
        );
      });

      const payload = await parseJson(response);
      if (response.ok) {
        const data = readRecord(
          isRecord(payload) ? payload : undefined,
          "data",
        );
        return {
          id: readId(data, "id"),
          no:
            typeof data?.["no"] === "number" && Number.isFinite(data["no"])
              ? data["no"]
              : undefined,
          body: request.body,
          commands,
          vposMs,
        };
      }

      if (attempt === 0 && readApiErrorCode(payload) === "EXPIRED_TOKEN") {
        continue;
      }
      throw mapApiError(
        payload,
        "コメントの投稿に失敗しました。",
        response.status,
      );
    }

    throw new CommentPostError("api-error", "コメントの投稿に失敗しました。");
  }

  private async fetchPostKey(threadId: string): Promise<PostKey> {
    const url = new URL("/v1/comment/keys/post", NVAPI_BASE_URL);
    url.searchParams.set("threadId", threadId);
    url.searchParams.set("pc", "1");

    const response = await this.fetchImpl(url, {
      method: "GET",
      mode: "cors",
      credentials: "include",
      cache: "no-store",
      headers: {
        Accept: "application/json;charset=utf-8",
        "X-Frontend-Id": FRONTEND_ID,
        "X-Frontend-Version": FRONTEND_VERSION,
        "X-Niconico-Language": "ja-jp",
        "X-Client-Os-Type": CLIENT_OS_TYPE,
      },
    }).catch((error: unknown) => {
      throw new CommentPostError(
        "network-error",
        "コメント投稿キーを取得できませんでした。",
        error,
      );
    });

    const payload = await parseJson(response);
    if (!response.ok) {
      throw mapApiError(
        payload,
        "コメント投稿キーを取得できませんでした。",
        response.status,
      );
    }

    const data = readRecord(isRecord(payload) ? payload : undefined, "data");
    const postKey = readString(data, "postKey");
    const challenge = readRecord(data, "challenge");
    if (challenge?.["isRequired"] === true) {
      throw new CommentPostError(
        "captcha-required",
        "投稿前の認証が必要です。公式視聴ページで認証してから再試行してください。",
      );
    }
    if (!postKey) {
      throw new CommentPostError(
        "api-error",
        "コメント投稿キーの応答が不正です。",
      );
    }

    return { value: postKey };
  }
}
