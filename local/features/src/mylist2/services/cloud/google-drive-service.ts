import "@/types/global.d.ts";

type FflateHelpers = Pick<
  typeof import("fflate"),
  "zipSync" | "unzipSync" | "strToU8" | "strFromU8"
>;

type StoredAccessToken = {
  accessToken: string;
  accessTokenExpireAt: number;
};

class GisAuthError extends Error {
  readonly code: string;
  constructor(code: string) {
    super(code);
    this.name = "GisAuthError";
    this.code = code;
  }
}

type TokenClientResponse = {
  access_token?: string;
  error?: string;
  expires_in?: number;
};

type TokenClient = {
  requestAccessToken: (opts: { prompt?: string }) => void;
};

/**
 * Google Drive 連携（ブラウザのみ、バックエンド無し）
 * - 認可: Google Identity Services (Token Client)
 * - 権限: drive.file（本アプリが作成したファイル/フォルダに限定）
 * - 圧縮: fflate を動的インポート（bun管理）
 */
export class GoogleDriveService {
  private accessToken: string | null = null;
  private accessTokenExpireAt = 0;
  private clientId: string | null = null;
  private readonly scope = "https://www.googleapis.com/auth/drive.file";
  private readonly backupFolderName = "Mylist2 Backups";
  private readonly defaultClientId =
    "757779940916-u31ia8oafa998j6qqavdpqjjn988it8b.apps.googleusercontent.com";
  private fflateModulePromise: Promise<FflateHelpers> | null = null;
  private readonly accessTokenStorageKey = "mylist2_google_access_token";

  constructor(clientIdFromConfig?: string | null) {
    this.clientId =
      clientIdFromConfig ||
      localStorage.getItem("mylist2_google_client_id") ||
      this.defaultClientId;
    this.loadStoredAccessToken();
  }

  // fflateモジュールを一度だけ動的ロード
  private async loadFflate(): Promise<FflateHelpers> {
    if (!this.fflateModulePromise) {
      this.fflateModulePromise = import("fflate").then(
        ({ zipSync, unzipSync, strToU8, strFromU8 }) => ({
          zipSync,
          unzipSync,
          strToU8,
          strFromU8,
        }),
      );
    }
    return this.fflateModulePromise;
  }

  setClientId(clientId: string): void {
    this.clientId = clientId;
    localStorage.setItem("mylist2_google_client_id", clientId);
  }

  private loadStoredAccessToken(): void {
    try {
      const raw = localStorage.getItem(this.accessTokenStorageKey);
      if (!raw) return;
      const parsed: unknown = JSON.parse(raw);
      if (typeof parsed !== "object" || parsed === null) return;
      const rec = parsed as Record<string, unknown>;
      const accessToken = rec.accessToken;
      const accessTokenExpireAt = rec.accessTokenExpireAt;
      if (
        typeof accessToken !== "string" ||
        typeof accessTokenExpireAt !== "number"
      ) {
        return;
      }
      this.accessToken = accessToken;
      this.accessTokenExpireAt = accessTokenExpireAt;
    } catch {
      // ignore
    }
  }

  private persistAccessToken(token: string, expireAt: number): void {
    try {
      const data: StoredAccessToken = {
        accessToken: token,
        accessTokenExpireAt: expireAt,
      };
      localStorage.setItem(this.accessTokenStorageKey, JSON.stringify(data));
    } catch {
      // ignore
    }
  }

  private async ensureGisLoaded(): Promise<void> {
    await Promise.resolve();
    const win = window as unknown as {
      google?: {
        accounts?: {
          oauth2?: {
            initTokenClient: (cfg: unknown) => TokenClient;
          };
        };
      };
    };
    if (win.google && win.google.accounts && win.google.accounts.oauth2) return;
    await new Promise<void>((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () =>
        reject(new Error("Failed to load Google Identity Services"));
      document.head.appendChild(script);
    });
  }

  private isTokenValid(): boolean {
    return !!this.accessToken && Date.now() < this.accessTokenExpireAt - 5000;
  }

  private async requestAccessToken(prompt?: string): Promise<string> {
    await this.ensureGisLoaded();
    return await new Promise<string>((resolve, reject) => {
      try {
        const win = window as unknown as {
          google: {
            accounts: {
              oauth2: {
                initTokenClient: (cfg: {
                  client_id: string | null;
                  scope: string;
                  callback: (resp: TokenClientResponse) => void;
                }) => TokenClient;
              };
            };
          };
        };
        const tokenClient = win.google.accounts.oauth2.initTokenClient({
          client_id: this.clientId,
          scope: this.scope,
          callback: (resp: TokenClientResponse) => {
            if (resp.access_token) {
              this.accessToken = resp.access_token;
              const expiresInSec =
                typeof resp.expires_in === "number" ? resp.expires_in : 3600;
              this.accessTokenExpireAt = Date.now() + expiresInSec * 1000;
              this.persistAccessToken(this.accessToken, this.accessTokenExpireAt);
              resolve(resp.access_token);
              return;
            }
            const code = resp.error || "Failed to obtain access token";
            reject(new GisAuthError(code));
          },
        });
        tokenClient.requestAccessToken({ prompt });
      } catch (e) {
        reject(e instanceof Error ? e : new Error(String(e)));
      }
    });
  }

  private shouldFallbackToConsent(error: unknown): boolean {
    const code =
      error instanceof GisAuthError
        ? error.code
        : error instanceof Error
          ? error.message
          : String(error);
    return (
      code.includes("consent_required") ||
      code.includes("interaction_required") ||
      code.includes("login_required") ||
      code.includes("popup_closed_by_user") ||
      code.includes("access_denied")
    );
  }

  private async ensureAccessToken(): Promise<string> {
    if (this.isTokenValid()) return this.accessToken as string;
    if (!this.clientId) {
      const input = window.prompt(
        "Google OAuth クライアントIDを入力してください (例: xxxxx.apps.googleusercontent.com)",
        "",
      );
      if (!input) throw new Error("Google クライアントIDが設定されていません");
      this.setClientId(input);
    }

    // まずはサイレント（ログイン状態があればダイアログ無し）
    try {
      return await this.requestAccessToken("");
    } catch (e) {
      if (!this.shouldFallbackToConsent(e)) throw e;
    }

    // 必要な場合のみ、同意/ログインを促す
    return await this.requestAccessToken("consent");
  }

  private async fetchDrive<T = unknown>(
    url: string,
    init: RequestInit,
  ): Promise<T> {
    const token = await this.ensureAccessToken();
    const resp = await fetch(url, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(init.headers || {}),
      },
    });
    if (!resp.ok) {
      const text = await resp.text().catch(() => "");
      throw new Error(
        `Drive API failed: ${resp.status} ${resp.statusText} ${text}`,
      );
    }
    if (resp.headers.get("Content-Type")?.includes("application/json")) {
      return (await resp.json()) as T;
    }
    return (await resp.text()) as unknown as T;
  }

  private async ensureBackupFolder(): Promise<string> {
    // 既存フォルダ検索（同名が複数ある可能性は低い前提で先頭を使用）
    const q = encodeURIComponent(
      `name = '${this.backupFolderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
    );
    const found = await this.fetchDrive<{
      files?: Array<{ id: string; name: string }>;
    }>(
      `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name)`,
      { method: "GET" },
    );
    const existing = Array.isArray(found.files) ? found.files : [];
    if (existing.length > 0) return existing[0].id;

    // 作成
    const meta = {
      name: this.backupFolderName,
      mimeType: "application/vnd.google-apps.folder",
    };
    const created = await this.fetchDrive<{ id: string }>(
      "https://www.googleapis.com/drive/v3/files",
      {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=UTF-8" },
        body: JSON.stringify(meta),
      },
    );
    return created.id;
  }

  private async createZipBlob(
    fileName: string,
    jsonText: string,
  ): Promise<Blob> {
    const { zipSync, strToU8 } = await this.loadFflate();
    const zipped: Uint8Array = zipSync(
      { [fileName]: strToU8(jsonText) },
      { level: 6 },
    );
    // BlobPart の型互換（確実に ArrayBuffer を生成）
    const ab = new ArrayBuffer(zipped.byteLength);
    new Uint8Array(ab).set(zipped);
    return new Blob([ab], { type: "application/zip" });
  }

  private buildMultipartBody(
    metadata: Record<string, unknown>,
    fileBlob: Blob,
    boundary: string,
  ): Promise<Blob> {
    const encoder = new TextEncoder();
    const metaStr = JSON.stringify(metadata);
    const part1 = encoder.encode(
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metaStr}\r\n`,
    );
    const part2Header = encoder.encode(
      `--${boundary}\r\nContent-Type: application/zip\r\n\r\n`,
    );
    const part3 = encoder.encode(`\r\n--${boundary}--`);
    return new Response(new Blob([part1, part2Header, fileBlob, part3])).blob();
  }

  async uploadBackupZip(
    baseFileName: string,
    backupJson: string,
  ): Promise<{ success: boolean; fileId?: string; error?: string }> {
    try {
      const folderId = await this.ensureBackupFolder();
      const zipFileName = `${baseFileName}.zip`;
      const zipBlob = await this.createZipBlob(
        `${baseFileName}.json`,
        backupJson,
      );

      // multipart/related でアップロード
      const metadata = { name: zipFileName, parents: [folderId] };
      const boundary = `mylist2_${Math.random().toString(36).slice(2)}`;
      const bodyBlob = await this.buildMultipartBody(
        metadata,
        zipBlob,
        boundary,
      );

      const result = await this.fetchDrive<{ id: string }>(
        "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart",
        {
          method: "POST",
          headers: {
            "Content-Type": `multipart/related; boundary=${boundary}`,
          },
          body: bodyBlob,
        },
      );
      return { success: true, fileId: result.id };
    } catch (error) {
      window.logger?.error("Google Drive upload failed:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  // バックアップ一覧取得（ZIPのみ）
  async listBackups(): Promise<
    Array<{ id: string; name: string; modifiedTime?: string; size?: string }>
  > {
    const folderId = await this.ensureBackupFolder();
    const q = encodeURIComponent(
      `'${folderId}' in parents and trashed = false`,
    );
    const res = await this.fetchDrive<{
      files?: Array<{
        id: string;
        name: string;
        modifiedTime?: string;
        size?: string;
      }>;
    }>(
      `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,modifiedTime,size)`,
      { method: "GET" },
    );
    const files = Array.isArray(res.files) ? res.files : [];
    return files
      .filter((f) => /.zip$/.test(f.name) && /^Mylist2_/.test(f.name))
      .sort((a, b) =>
        (b.modifiedTime || "").localeCompare(a.modifiedTime || ""),
      );
  }

  // ZIPをダウンロードしてJSON文字列を取り出す
  async downloadBackupJson(fileId: string): Promise<string> {
    const token = await this.ensureAccessToken();
    const resp = await fetch(
      `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      },
    );
    if (!resp.ok) {
      const text = await resp.text().catch(() => "");
      throw new Error(
        `Download failed: ${resp.status} ${resp.statusText} ${text}`,
      );
    }
    const buf = new Uint8Array(await resp.arrayBuffer());
    const { unzipSync, strFromU8 } = await this.loadFflate();
    const files = unzipSync(buf);
    const jsonEntryName = Object.keys(files).find((n) => /.json$/.test(n));
    if (!jsonEntryName) throw new Error("ZIP内にJSONファイルが見つかりません");
    return strFromU8(files[jsonEntryName]);
  }
}
