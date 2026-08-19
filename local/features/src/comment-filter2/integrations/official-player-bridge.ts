export const OFFICIAL_COMMENT_API_VERSION = 1;

export interface OfficialCommentReloadApi {
  version: typeof OFFICIAL_COMMENT_API_VERSION;
  reload: () => Promise<unknown>;
}

type OfficialCommentApiHost = {
  FilterMatomeCommentApi?: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object";
}

export function resolveOfficialCommentReloadApi(
  host: OfficialCommentApiHost,
): OfficialCommentReloadApi | null {
  const candidate = host.FilterMatomeCommentApi;
  if (
    !isRecord(candidate) ||
    candidate["version"] !== OFFICIAL_COMMENT_API_VERSION ||
    typeof candidate["reload"] !== "function"
  ) {
    return null;
  }

  return candidate as unknown as OfficialCommentReloadApi;
}

/** nlFilterが公式コメントストアへ追加した、再取得だけの公開境界。 */
export class OfficialPlayerBridge {
  private reloadInFlight: Promise<boolean> | null = null;

  constructor(private readonly host: OfficialCommentApiHost = window) {}

  public isAvailable(): boolean {
    return resolveOfficialCommentReloadApi(this.host) !== null;
  }

  /**
   * 公式ストアにコメントを再取得させる。
   * APIが未注入の公式資産ではfalseを返し、UI側がページ再読み込みへフォールバックする。
   */
  public reloadComments(): Promise<boolean> {
    if (this.reloadInFlight) {
      return this.reloadInFlight;
    }

    const api = resolveOfficialCommentReloadApi(this.host);
    if (!api) {
      return Promise.resolve(false);
    }

    this.reloadInFlight = Promise.resolve()
      .then(() => api.reload())
      .then(() => true)
      .finally(() => {
        this.reloadInFlight = null;
      });
    return this.reloadInFlight;
  }
}
