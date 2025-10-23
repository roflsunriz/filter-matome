import "@/types/global.d.ts";

type FflateHelpers = Pick<
  typeof import("fflate"),
  "zipSync" | "unzipSync" | "strToU8" | "strFromU8"
>;

/**
 * Dropbox アカウントのみ、バックエンドなし
 * - 想定: 個別対応のアクセストークン（設定/環境による）
 * - 権限: files.content.write / files.content.read を含むトークン
 * - 実装: fflate を動的インポート（npm管理）
 *
 * 注意: 本実装は SDK を使わず fetch で Dropbox API を直接呼び出します。
 */
export class DropboxService {
  private accessToken: string | null = null;
  private readonly backupFolderPath = "/Mylist2 Backups"; // Dropbox はルート階層のパス
  private fflateModulePromise: Promise<FflateHelpers> | null = null;

  constructor(tokenFromConfig?: string | null) {
    this.accessToken =
      tokenFromConfig || localStorage.getItem("mylist2_dropbox_token");
  }

  setAccessToken(token: string): void {
    this.accessToken = token;
    localStorage.setItem("mylist2_dropbox_token", token);
  }

  private ensureAccessToken(): Promise<string> {
    if (this.accessToken) return Promise.resolve(this.accessToken);
    const input = window.prompt(
      "Dropbox のアクセストークンを入力してください (files.content.read/write 必須)",
      "",
    );
    if (!input) throw new Error("Dropbox アクセストークンが設定されていません");
    this.setAccessToken(input);
    return Promise.resolve(input);
  }

  // fflate モジュールを一度だけ動的ロード
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

  private async createZipBlob(
    fileName: string,
    jsonText: string,
  ): Promise<Blob> {
    const { zipSync, strToU8 } = await this.loadFflate();
    const zipped: Uint8Array = zipSync(
      { [fileName]: strToU8(jsonText) },
      { level: 6 },
    );
    const ab = new ArrayBuffer(zipped.byteLength);
    new Uint8Array(ab).set(zipped);
    return new Blob([ab], { type: "application/zip" });
  }

  private async ensureBackupFolder(): Promise<void> {
    const token = await this.ensureAccessToken();
    // 既存確認
    const res = await fetch("https://api.dropboxapi.com/2/files/get_metadata", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        path: this.backupFolderPath,
        include_deleted: false,
      }),
    });
    if (res.ok) return; // 既に存在

    // 無ければ作成
    const create = await fetch(
      "https://api.dropboxapi.com/2/files/create_folder_v2",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          path: this.backupFolderPath,
          autorename: false,
        }),
      },
    );
    if (!create.ok) {
      const text = await create.text().catch(() => "");
      throw new Error(
        `Dropbox フォルダ作成に失敗: ${create.status} ${create.statusText} ${text}`,
      );
    }
  }

  async uploadBackupZip(
    baseFileName: string,
    backupJson: string,
  ): Promise<{ success: boolean; path?: string; error?: string }> {
    try {
      await this.ensureBackupFolder();
      const token = await this.ensureAccessToken();
      const zipName = `${baseFileName}.zip`;
      const zipBlob = await this.createZipBlob(
        `${baseFileName}.json`,
        backupJson,
      );

      // Dropbox の /2/files/upload でバイナリを送信
      const path = `${this.backupFolderPath}/${zipName}`;
      const upload = await fetch(
        "https://content.dropboxapi.com/2/files/upload",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/octet-stream",
            "Dropbox-API-Arg": JSON.stringify({
              path,
              mode: { ".tag": "add" },
              mute: true,
              strict_conflict: false,
            }),
          },
          body: zipBlob,
        },
      );
      if (!upload.ok) {
        const text = await upload.text().catch(() => "");
        throw new Error(
          `Dropbox アップロード失敗: ${upload.status} ${upload.statusText} ${text}`,
        );
      }
      return { success: true, path };
    } catch (e) {
      window.logger?.error("Dropbox upload failed:", e);
      return {
        success: false,
        error: e instanceof Error ? e.message : String(e),
      };
    }
  }

  async listBackups(): Promise<
    Array<{ id: string; name: string; modifiedTime?: string; size?: string }>
  > {
    const token = await this.ensureAccessToken();
    await this.ensureBackupFolder();

    const list = await fetch("https://api.dropboxapi.com/2/files/list_folder", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        path: this.backupFolderPath,
        recursive: false,
        include_deleted: false,
      }),
    });
    if (!list.ok) {
      const text = await list.text().catch(() => "");
      throw new Error(
        `Dropbox 一覧取得失敗: ${list.status} ${list.statusText} ${text}`,
      );
    }
    const json = (await list.json()) as {
      entries?: Array<{
        id: string;
        name: string;
        client_modified?: string;
        server_modified?: string;
        size?: number;
        ".tag"?: string;
      }>;
    };
    const items = (json.entries || []).filter(
      (e) =>
        e[".tag"] === "file" &&
        /\.zip$/.test(e.name) &&
        /^Mylist2_/.test(e.name),
    );
    return items
      .map((f) => ({
        id: `${this.backupFolderPath}/${f.name}`,
        name: f.name,
        modifiedTime: f.server_modified || f.client_modified,
        size: typeof f.size === "number" ? String(f.size) : undefined,
      }))
      .sort((a, b) =>
        (b.modifiedTime || "").localeCompare(a.modifiedTime || ""),
      );
  }

  async downloadBackupJson(filePath: string): Promise<string> {
    const token = await this.ensureAccessToken();
    const resp = await fetch(
      "https://content.dropboxapi.com/2/files/download",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Dropbox-API-Arg": JSON.stringify({ path: filePath }),
        },
      },
    );
    if (!resp.ok) {
      const text = await resp.text().catch(() => "");
      throw new Error(
        `Dropbox ダウンロード失敗: ${resp.status} ${resp.statusText} ${text}`,
      );
    }
    const buf = new Uint8Array(await resp.arrayBuffer());
    const { unzipSync, strFromU8 } = await this.loadFflate();
    const files = unzipSync(buf);
    const jsonEntryName = Object.keys(files).find((n) => /\.json$/.test(n));
    if (!jsonEntryName) throw new Error("ZIP内にJSONファイルが見つかりません");
    return strFromU8(files[jsonEntryName]);
  }
}
