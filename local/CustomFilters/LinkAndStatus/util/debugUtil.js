"use strict";

// デバッグモードフラグ
window.DEBUG_MODE = false;

// デバッグログ出力ユーティリティ
window.debugLog = (component, method, message, data = null) => {
  if (!window.DEBUG_MODE) return;
  
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${component}::${method} - ${message}`;
  
  console.group(logMessage);
  if (data) console.dir(data);
  console.trace();
  console.groupEnd();
};

// グローバルエラーハンドラー
window.handleError = (component, method, error) => {
  console.error(`[${component}::${error}] エラーが発生しました:`, error);
  window.debugLog(component, method, 'エラー発生', error);
};

// パフォーマンス計測
window.measurePerformance = (component, method, callback) => {
  const start = performance.now();
  try {
    callback();
  } catch (error) {
    window.handleError(component, method, error);
  } finally {
    const end = performance.now();
    window.debugLog(component, method, `実行時間: ${end - start}ms`);
  }
}; 