import { ExportData } from "@/types/mylist-types";

export class FileHelperService {
  // ファイル名生成用のヘルパーメソッド
  formatDateTime(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const hour = String(now.getHours()).padStart(2, "0");
    const minute = String(now.getMinutes()).padStart(2, "0");
    const second = String(now.getSeconds()).padStart(2, "0");

    return `${year}${month}${day}_${hour}${minute}${second}`;
  }

  // 動画の長さを秒数に変換するヘルパーメソッド
  parseLength(lengthText: string): number {
    // 「分」と「秒」で区切って数値に変換する
    const [minutes, seconds] = lengthText
      .replace(/分|秒/g, ":") // 「分」と「秒」を:に置換
      .split(":")
      .map((num) => parseInt(num || "0", 10)); // 文字列を数値に変換、undefinedの場合は0に

    return (minutes || 0) * 60 + (seconds || 0);
  }

  // エクスポート処理
  async downloadFile(data: ExportData, fileName: string): Promise<void> {
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);

    // ダウンロードの完了を待つための Promise を作成
    await new Promise<void>((resolve, reject) => {
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;

      // ダウンロード完了時のイベント
      a.onclick = () => {
        setTimeout(() => {
          URL.revokeObjectURL(url);
          resolve();
        }, 1000); // ダウンロード完了まで少し待機
      };

      // エラー時
      a.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("ダウンロードに失敗しました"));
      };

      // クリックイベントを発火
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    });
  }

  // ファイル読み込み処理
  async readFile(file: File): Promise<string> {
    return file.text();
  }
}
