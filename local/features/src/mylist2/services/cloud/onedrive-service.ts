import "../../../types/global.d.ts";

type FflateHelpers = Pick<typeof import("fflate"), "zipSync" | "unzipSync" | "strToU8" | "strFromU8">;

/**
 * OneDrive 連携（ブラウザのみ、バックエンド無し）
 * - 認可: 手動入力の Microsoft Graph アクセストークン (scope: Files.ReadWrite)
 * - 圧縮: fflate を動的インポート（npm管理）
 *
 * 備考: アクセストークンは有効期限が短い場合があります。必要に応じて再入力してください。
 */
export class OneDriveService {
  private accessToken: string | null = null;
  private readonly backupFolderName = "Mylist2 Backups";
  private fflateModulePromise: Promise<FflateHelpers> | null = null;

  constructor(tokenFromConfig?: string | null) {
    this.accessToken = tokenFromConfig || localStorage.getItem("mylist2_onedrive_token");
  }

  setAccessToken(token: string): void {
    this.accessToken = token;
    localStorage.setItem("mylist2_onedrive_token", token);
  }

  private ensureAccessToken(): Promise<string> {
    if (this.accessToken) return Promise.resolve(this.accessToken);
    const input = window.prompt(
      "OneDrive (Microsoft Graph) のアクセストークンを入力してください (Files.ReadWrite)",
      ""
    );
    if (!input) throw new Error("OneDrive アクセストークンが設定されていません");
    this.setAccessToken(input);
    return Promise.resolve(input);
  }

  // fflateモジュールを一度だけ動的ロード
  private async loadFflate(): Promise<FflateHelpers> {
    if (!this.fflateModulePromise) {
      this.fflateModulePromise = import("fflate").then(({ zipSync, unzipSync, strToU8, strFromU8 }) => ({
        zipSync,
        unzipSync,
        strToU8,
        strFromU8,
      }));
    }
    return this.fflateModulePromise;
  }

  private async createZipBlob(fileName: string, jsonText: string): Promise<Blob> {
    const { zipSync, strToU8 } = await this.loadFflate();
    const zipped: Uint8Array = zipSync({ [fileName]: strToU8(jsonText) }, { level: 6 });
    const ab = new ArrayBuffer(zipped.byteLength);
    new Uint8Array(ab).set(zipped);
    return new Blob([ab], { type: "application/zip" });
  }

  private async ensureBackupFolder(): Promise<string> {
    const token = await this.ensureAccessToken();
    // フォルダ検索
    const q = new URL("https://graph.microsoft.com/v1.0/me/drive/root/children");
    q.searchParams.set("$select", "id,name,folder");
    const res = await fetch(q.toString(), {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`OneDrive フォルダ一覧取得失敗: ${res.status} ${res.statusText} ${text}`);
    }
    const json = (await res.json()) as { value?: Array<{ id: string; name: string; folder?: unknown }> };
    const existing = (json.value || []).find((e) => e.folder && e.name === this.backupFolderName);
    if (existing) return existing.id;

    // 作成
    const create = await fetch("https://graph.microsoft.com/v1.0/me/drive/root/children", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: this.backupFolderName, folder: {}, "@microsoft.graph.conflictBehavior": "fail" }),
    });
    if (!create.ok) {
      const text = await create.text().catch(() => "");
      throw new Error(`OneDrive フォルダ作成失敗: ${create.status} ${create.statusText} ${text}`);
    }
    const c = (await create.json()) as { id: string };
    return c.id;
  }

  async uploadBackupZip(baseFileName: string, backupJson: string): Promise<{ success: boolean; fileId?: string; error?: string }> {
    try {
      const folderId = await this.ensureBackupFolder();
      const token = await this.ensureAccessToken();
      const zipName = `${baseFileName}.zip`;
      const zipBlob = await this.createZipBlob(`${baseFileName}.json`, backupJson);

      // シンプルアップロード (4MB 未満推奨)。バックアップは軽量想定
      const put = await fetch(`https://graph.microsoft.com/v1.0/me/drive/items/${encodeURIComponent(folderId)}:/${encodeURIComponent(zipName)}:/content`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
        body: zipBlob,
      });
      if (!put.ok) {
        const text = await put.text().catch(() => "");
        throw new Error(`OneDrive アップロード失敗: ${put.status} ${put.statusText} ${text}`);
      }
      const meta = (await put.json()) as { id?: string };
      return { success: true, fileId: meta.id };
    } catch (e) {
      window.logger?.error("OneDrive upload failed:", e);
      return { success: false, error: e instanceof Error ? e.message : String(e) };
    }
  }

  async listBackups(): Promise<Array<{ id: string; name: string; modifiedTime?: string; size?: string }>> {
    const token = await this.ensureAccessToken();
    const folderId = await this.ensureBackupFolder();
    const res = await fetch(`https://graph.microsoft.com/v1.0/me/drive/items/${encodeURIComponent(folderId)}/children?$select=id,name,size,lastModifiedDateTime`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`OneDrive 一覧取得失敗: ${res.status} ${res.statusText} ${text}`);
    }
    const json = (await res.json()) as { value?: Array<{ id: string; name: string; size?: number; lastModifiedDateTime?: string }> };
    const files = (json.value || []).filter((f) => /\.zip$/.test(f.name) && /^Mylist2_/.test(f.name));
    return files
      .map((f) => ({ id: f.id, name: f.name, modifiedTime: f.lastModifiedDateTime, size: typeof f.size === "number" ? String(f.size) : undefined }))
      .sort((a, b) => (b.modifiedTime || "").localeCompare(a.modifiedTime || ""));
  }

  async downloadBackupJson(fileId: string): Promise<string> {
    const token = await this.ensureAccessToken();
    const resp = await fetch(`https://graph.microsoft.com/v1.0/me/drive/items/${encodeURIComponent(fileId)}/content`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
      redirect: "follow",
    });
    if (!resp.ok) {
      const text = await resp.text().catch(() => "");
      throw new Error(`OneDrive ダウンロード失敗: ${resp.status} ${resp.statusText} ${text}`);
    }
    const buf = new Uint8Array(await resp.arrayBuffer());
    const { unzipSync, strFromU8 } = await this.loadFflate();
    const files = unzipSync(buf);
    const jsonEntryName = Object.keys(files).find((n) => /\.json$/.test(n));
    if (!jsonEntryName) throw new Error("ZIP内にJSONファイルが見つかりません");
    return strFromU8(files[jsonEntryName]);
  }
}
