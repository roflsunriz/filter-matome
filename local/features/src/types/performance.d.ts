interface MemoryInfo {
  totalJSHeapSize: number;
  usedJSHeapSize: number;
  jsHeapSizeLimit: number;
}

// Performanceインターフェースを拡張して、memoryプロパティを追加
interface Performance {
  /**
   * Chromeブラウザで利用可能なメモリ情報
   * 標準ではないプロパティだが、ヒープメモリの使用状況を取得するのに便利
   */
  memory?: MemoryInfo;
}
