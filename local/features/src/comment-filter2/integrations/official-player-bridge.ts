export const OFFICIAL_COMMENT_API_VERSION = 1;

export interface OfficialCommentReloadApi {
  version: typeof OFFICIAL_COMMENT_API_VERSION;
  reload: () => Promise<unknown>;
}

type OfficialCommentApiHost = {
  FilterMatomeCommentApi?: unknown;
};

export interface OfficialPlayerBridgeOptions {
  availabilityTimeoutMs?: number;
  pollIntervalMs?: number;
}

const DEFAULT_AVAILABILITY_TIMEOUT_MS = 2_000;
const DEFAULT_POLL_INTERVAL_MS = 50;

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
  private readonly availabilityTimeoutMs: number;
  private readonly pollIntervalMs: number;

  constructor(
    private readonly host: OfficialCommentApiHost = window,
    options: OfficialPlayerBridgeOptions = {},
  ) {
    this.availabilityTimeoutMs = Math.max(
      0,
      options.availabilityTimeoutMs ?? DEFAULT_AVAILABILITY_TIMEOUT_MS,
    );
    this.pollIntervalMs = Math.max(
      1,
      options.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS,
    );
  }

  public isAvailable(): boolean {
    return resolveOfficialCommentReloadApi(this.host) !== null;
  }

  /**
   * 公式ストアにコメントを再取得させる。
   * API初期化を短時間待ち、未注入の公式資産ではfalseを返す。
   */
  public reloadComments(): Promise<boolean> {
    if (this.reloadInFlight) {
      return this.reloadInFlight;
    }

    this.reloadInFlight = this.reloadWhenAvailable().finally(() => {
      this.reloadInFlight = null;
    });
    return this.reloadInFlight;
  }

  private async reloadWhenAvailable(): Promise<boolean> {
    const immediateApi = resolveOfficialCommentReloadApi(this.host);
    if (immediateApi) {
      await immediateApi.reload();
      return true;
    }

    const attempts = Math.ceil(
      this.availabilityTimeoutMs / this.pollIntervalMs,
    );
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      await new Promise<void>((resolve) => {
        setTimeout(resolve, this.pollIntervalMs);
      });
      const api = resolveOfficialCommentReloadApi(this.host);
      if (api) {
        await api.reload();
        return true;
      }
    }
    return false;
  }
}
