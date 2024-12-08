export const Config = {
  debug: false,  // デバッグモード切替フラグ
};

// デバッグログ用のユーティリティ関数
export const debugLog = (...args) => {
  if (Config.debug) {
    console.log(...args);
  }
};

export const debugError = (...args) => {
  if (Config.debug) {
    console.error(...args);
  }
};

export const debugWarn = (...args) => {
  if (Config.debug) {
    console.warn(...args);
  }
}; 