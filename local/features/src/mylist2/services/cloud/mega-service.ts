import "@/types/global.d.ts";

/**
 * MEGA 連携（ブラウザ）
 *
 * 注意: MEGA は公式の OAuth ではなく、通常は SDK（例: megajs）や
 * ログインセッション管理が必要です。本プロジェクトの無バックエンド方針に合わせ、
 * ここではプレースホルダ実装を用意します。
 *
 * 今後: CDN から安全にブラウザ SDK を読み込み、ユーザのメール/パスワードを使わずに
 * 既存セッション／セッション復元方式か、ユーザ提供のセッション情報を用いたアップロードに対応予定。
 */
export class MegaService {
  // 将来的にアクセストークン/セッション情報などを保持
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private session: any = null;

  // 現段階では未対応（プレースホルダ）。実装時にセッション設定を行う。
  setSession(session: unknown): void {
    this.session = session;
    localStorage.setItem("mylist2_mega_session", JSON.stringify(session));
  }

  private unsupported(): never {
    throw new Error(
      "MEGA 連携はブラウザのみ・バックエンド無し環境では追加実装が必要です。設定画面で 'Dropbox' または 'OneDrive' をご利用ください。",
    );
  }

  // API 互換: GoogleDrive/Dropbox/OneDrive と同じメソッド群
  uploadBackupZip(
    _baseFileName: string,
    _backupJson: string,
  ): Promise<{ success: boolean; fileId?: string; error?: string }> {
    try {
      this.unsupported();
    } catch (e) {
      return Promise.resolve({
        success: false,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  listBackups(): Promise<
    Array<{ id: string; name: string; modifiedTime?: string; size?: string }>
  > {
    return Promise.reject(this.createUnsupportedError());
  }

  downloadBackupJson(_fileId: string): Promise<string> {
    return Promise.reject(this.createUnsupportedError());
  }

  private createUnsupportedError(): Error {
    return new Error(
      "MEGA 連携は未実装です。Dropbox / OneDrive / Google Drive をご利用ください。",
    );
  }
}
