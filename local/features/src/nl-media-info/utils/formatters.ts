export interface Formatters {
  parseFileSize(sizeStr: string): number;
  formatFileSize(bytes: number): string;
}

export const formatters: Formatters = {
  /**
   * ファイルサイズを解析して数値に変換するのじゃ
   * @param sizeStr - 解析するファイルサイズの文字列
   * @returns KiBに変換されたサイズ
   */
  parseFileSize(sizeStr: string): number {
    if (!sizeStr) return 0;
    // 文字列を数値に変換
    const bytes = parseInt(sizeStr, 10);
    if (isNaN(bytes)) return 0;

    // バイトからKiBに変換（1 KiB = 1024 bytes）
    const result = bytes / 1024;

    return result;
  },

  /**
   * ファイルサイズを読みやすい形式に整形するのじゃ
   * @param bytes - バイト数
   * @returns 整形されたファイルサイズ
   */
  formatFileSize(bytes: number): string {
    if (bytes >= 1024 * 1024) {
      return `${(bytes / 1024 / 1024).toFixed(2)} MiB`;
    } else if (bytes >= 1024) {
      return `${(bytes / 1024).toFixed(2)} KiB`;
    } else {
      return `${bytes.toFixed(2)} Bytes`;
    }
  }
}; 