const WATCH_VIDEO_ID_PATTERN = /\/watch\/([a-z]{2}\d+)/i;
const VIDEO_ID_QUERY_PATTERN = /[?&]videoId=([a-z]{2}\d+)/i;
const GENERIC_VIDEO_ID_PATTERN = /([a-z]{2}\d+)/i;
const normalizeVideoId = (value) => {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed.toLowerCase() : null;
};
const resolveUrlString = (input) => {
  if (!input) {
    return null;
  }
  if (typeof input === "string") {
    return input;
  }
  try {
    if (input instanceof URL) {
      return input.href;
    }
  } catch {
  }
  const hrefCandidate = input.href;
  if (typeof hrefCandidate === "string") {
    return hrefCandidate;
  }
  const pathname = input.pathname;
  if (typeof pathname === "string") {
    const search = typeof input.search === "string" ? input.search : "";
    const hash = typeof input.hash === "string" ? input.hash : "";
    return `${pathname}${search}${hash}`;
  }
  return null;
};
const extractVideoIdFromString = (value) => {
  const watchMatch = WATCH_VIDEO_ID_PATTERN.exec(value);
  if (watchMatch) {
    return normalizeVideoId(watchMatch[1]);
  }
  const queryMatch = VIDEO_ID_QUERY_PATTERN.exec(value);
  if (queryMatch) {
    return normalizeVideoId(queryMatch[1]);
  }
  const genericMatch = GENERIC_VIDEO_ID_PATTERN.exec(value);
  if (genericMatch) {
    return normalizeVideoId(genericMatch[1]);
  }
  return null;
};
window.commonHelper = {
  // 共通のfetch関数
  fetchRequest: (url, options = {}) => {
    const defaultOptions = {
      method: "GET",
      headers: {},
      ...options
    };
    return fetch(url, defaultOptions);
  },
  extractVideoIdFromUrl: (input) => {
    try {
      const primarySource = resolveUrlString(input);
      if (primarySource) {
        const candidate = extractVideoIdFromString(primarySource);
        if (candidate) {
          return candidate;
        }
      }
      if (!input) {
        const fallback = resolveUrlString(window.location);
        if (fallback) {
          const fallbackCandidate = extractVideoIdFromString(fallback);
          if (fallbackCandidate) {
            return fallbackCandidate;
          }
        }
      }
    } catch (error) {
      console.error("[commonHelper] extractVideoIdFromUrl failed", error);
    }
    return null;
  },
  checkCache404: (url) => {
    return window.commonHelper.fetchRequest(url).then((response) => {
      if (response.ok === true) {
        return true;
      } else {
        return false;
      }
    }).catch((err) => {
      console.error(err);
    });
  },
  fetchWatchPage: async (SMID) => {
    SMID = SMID ? SMID : /[ns][mo][0-9]+/.exec(location.pathname)?.[0];
    if (!SMID) {
      console.error("SMIDが取得できませんでした");
      return;
    }
    try {
      const response = await window.commonHelper.fetchRequest("https://www.nicovideo.jp/watch/" + SMID);
      if (!response.ok) {
        console.error("HTTP status code : " + response.status);
        console.error("HTTP status Text : " + response.statusText);
        throw new Error(String(response.status));
      }
      const text = await response.text();
      const doc = new DOMParser().parseFromString(text, "text/html");
      const serverContextRaw = JSON.parse(doc.querySelector('meta[name="server-context"]')?.getAttribute("content") || "{}");
      const serverContext = serverContextRaw && typeof serverContextRaw === "object" ? serverContextRaw : {};
      const serverResponseContent = doc.querySelector('meta[name="server-response"]')?.getAttribute("content") || "{}";
      const serverResponseUnknown = JSON.parse(decodeURIComponent(serverResponseContent));
      if (!serverResponseUnknown || typeof serverResponseUnknown !== "object") {
        throw new Error("Invalid server response");
      }
      const serverResponse = serverResponseUnknown;
      return {
        serverContext,
        serverResponse,
        apiData: serverResponse.data.response
      };
    } catch (error) {
      console.error(error);
    }
  },
  // ニコニコ動画のコメントデータを取得する関数
  fetchNicoComments: async (apiData) => {
    try {
      const commentServer = apiData.comment.nvComment.server + "/v1/threads";
      const requestBody = {
        params: apiData.comment.nvComment.params,
        threadKey: apiData.comment.nvComment.threadKey
      };
      const response = await window.commonHelper.fetchRequest(commentServer, {
        method: "POST",
        headers: {
          "x-client-os-type": "others",
          "X-Frontend-Id": "6",
          "X-Frontend-Version": "0",
          "Content-Type": "application/json"
        },
        body: JSON.stringify(requestBody)
      });
      if (!response.ok) {
        console.error("コメントデータ取得エラー: " + response.status);
        throw new Error(`コメントAPI Error: ${response.status}`);
      }
      const commentData = await response.json();
      const mainThread = commentData.data.threads.filter((thread) => thread.fork === "main").reduce((prev, current) => {
        return prev.commentCount > current.commentCount ? prev : current;
      });
      if (!mainThread) {
        console.error("メインスレッドが見つかりません");
        return { comments: [], mainThread: { id: "", fork: "main", commentCount: 0, comments: [] } };
      }
      return {
        comments: mainThread.comments,
        mainThread
      };
    } catch (error) {
      console.error("コメントデータ取得エラー:", error);
    }
  },
  // NicoCache_nl.watch.getVideoIDをチェックして、取得できない場合にURLから動画IDを抽出するフォールバック機能
  getVideoIdWithFallback: async (input) => {
    try {
      await new Promise((resolve) => {
        let attempts = 0;
        const maxAttempts = 50;
        const checkReady = () => {
          attempts++;
          const windowWithNico2 = window;
          const nicoCache2 = windowWithNico2.NicoCache_nl;
          const isReady = nicoCache2?.watch?.getVideoID || nicoCache2?.watch?.apiData?.video?.id;
          if (isReady || attempts >= maxAttempts) {
            resolve();
          } else {
            setTimeout(checkReady, 100);
          }
        };
        checkReady();
      });
      const windowWithNico = window;
      const nicoCache = windowWithNico.NicoCache_nl;
      if (nicoCache?.watch?.getVideoID && typeof nicoCache.watch.getVideoID === "function") {
        try {
          const fromApi = nicoCache.watch.getVideoID();
          if (fromApi && typeof fromApi === "string") {
            const normalized = normalizeVideoId(fromApi);
            if (normalized) {
              return normalized;
            }
          }
        } catch (error) {
          console.warn("[commonHelper] NicoCache_nl.watch.getVideoID failed:", error);
        }
      }
      const videoId = nicoCache?.watch?.apiData?.video?.id;
      if (videoId && typeof videoId === "string") {
        const fromApiData = normalizeVideoId(videoId);
        if (fromApiData) {
          return fromApiData;
        }
      }
      const urlVideoId = window.commonHelper.extractVideoIdFromUrl(input);
      if (urlVideoId) {
        return urlVideoId;
      }
      try {
        const watchPageResult = await window.commonHelper.fetchWatchPage();
        if (watchPageResult?.apiData?.video?.id && typeof watchPageResult.apiData.video.id === "string") {
          const fromFetch = normalizeVideoId(watchPageResult.apiData.video.id);
          if (fromFetch) {
            return fromFetch;
          }
        }
      } catch (error) {
        console.warn("[commonHelper] fetchWatchPage fallback failed:", error);
      }
      return null;
    } catch (error) {
      console.error("[commonHelper] getVideoIdWithFallback failed:", error);
      return null;
    }
  },
  // ニコニコ動画のAPIデータとコメントデータを一度に取得するヘルパー関数
  fetchNicoDataWithComments: async (SMID) => {
    try {
      const watchPageResult = await window.commonHelper.fetchWatchPage(SMID);
      if (!watchPageResult) {
        console.error("ウォッチページデータが取得できませんでした");
        return;
      }
      const commentResult = await window.commonHelper.fetchNicoComments(watchPageResult.apiData);
      if (!commentResult) {
        console.error("コメントデータが取得できませんでした");
        return;
      }
      return {
        apiData: watchPageResult.apiData,
        comments: commentResult.comments,
        mainThread: commentResult.mainThread
      };
    } catch (error) {
      console.error("統合データ取得エラー:", error);
    }
  }
};

var LogLevel = /* @__PURE__ */ ((LogLevel2) => {
  LogLevel2[LogLevel2["NONE"] = 0] = "NONE";
  LogLevel2[LogLevel2["INFO"] = 1] = "INFO";
  LogLevel2[LogLevel2["LOG"] = 2] = "LOG";
  LogLevel2[LogLevel2["WARN"] = 3] = "WARN";
  LogLevel2[LogLevel2["ERROR"] = 4] = "ERROR";
  LogLevel2[LogLevel2["DEBUG"] = 5] = "DEBUG";
  return LogLevel2;
})(LogLevel || {});

class Logger {
  constructor() {
    this.currentLevel = LogLevel.DEBUG;
    this.enabledFiles = /* @__PURE__ */ new Set();
    this.disabledFiles = /* @__PURE__ */ new Set();
    this.initializeLoggerConfig();
  }
  initializeLoggerConfig() {
    this.setLevel(LogLevel.DEBUG);
  }
  static getInstance() {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }
  setLevel(level) {
    this.currentLevel = level;
  }
  getCallerInfo() {
    const error = new Error();
    const stack = error.stack?.split("\n")[3] || "";
    const urlMatch = stack.match(/(?:@|at\s+)https:\/\/www\.nicovideo\.jp\/local\/(.*?\.js:\d+:\d+)/);
    if (urlMatch) {
      return urlMatch[1];
    }
    const localMatch = stack.match(/\((.+?)\)/);
    if (localMatch) {
      const fullPath = localMatch[1].split("/");
      return fullPath[fullPath.length - 1].replace(/:\d+:\d+$/, "");
    }
    return "unknown";
  }
  enableLogging(filePattern) {
    this.enabledFiles.add(filePattern);
  }
  disableLogging(filePattern) {
    this.disabledFiles.add(filePattern);
  }
  shouldLog(filename) {
    const isDisabled = [...this.disabledFiles].some((pattern) => {
      if (pattern === "All") return true;
      return filename.includes(pattern);
    });
    if (isDisabled) {
      return [...this.enabledFiles].some((pattern) => filename.includes(pattern));
    }
    return true;
  }
  _log(level, args) {
    if (this.currentLevel < level) return;
    const filename = this.getCallerInfo();
    if (!this.shouldLog(filename)) return;
    const prefix = `[${filename}]`;
    switch (level) {
      case LogLevel.INFO:
        console.info(prefix, ...args);
        break;
      case LogLevel.LOG:
        console.log(prefix, ...args);
        break;
      case LogLevel.WARN:
        console.warn(prefix, ...args);
        break;
      case LogLevel.ERROR:
        console.error(prefix, ...args);
        break;
      case LogLevel.DEBUG:
        console.debug(prefix, ...args);
        break;
    }
  }
  info(...args) {
    this._log(LogLevel.INFO, args);
  }
  log(...args) {
    this._log(LogLevel.LOG, args);
  }
  warn(...args) {
    this._log(LogLevel.WARN, args);
  }
  error(...args) {
    this._log(LogLevel.ERROR, args);
  }
  debug(...args) {
    this._log(LogLevel.DEBUG, args);
  }
  handleError(component, method, error) {
    this.error(`[${component}::${method}] エラーが発生しました:`, error);
    this.debug(component, method, "エラー発生", error);
  }
  measurePerformance(component, method, callback) {
    const start = performance.now();
    try {
      callback();
    } catch (error) {
      this.handleError(component, method, error);
    } finally {
      const end = performance.now();
      this.debug(component, method, `実行時間: ${end - start}ms`);
    }
  }
}
const logger = Logger.getInstance();
window.logger = logger;

const TOASTR_STYLES = `
.toast-title {
  font-weight: 700;
}
.toast-message {
  -ms-word-wrap: break-word;
  word-wrap: break-word;
}
.toast-message a,
.toast-message label {
  color: #fff;
}
.toast-message a:hover {
  color: #ccc;
  text-decoration: none;
}
.toast-close-button {
  position: relative;
  right: -0.3em;
  top: -0.3em;
  float: right;
  font-size: 20px;
  font-weight: 700;
  color: #fff;
  -webkit-text-shadow: 0 1px 0 #fff;
  text-shadow: 0 1px 0 #fff;
  opacity: 0.8;
  -ms-filter: progid:DXImageTransform.Microsoft.Alpha(Opacity=80);
  filter: alpha(opacity=80);
  line-height: 1;
}
.toast-close-button:focus,
.toast-close-button:hover {
  color: #000;
  text-decoration: none;
  cursor: pointer;
  opacity: 0.4;
  -ms-filter: progid:DXImageTransform.Microsoft.Alpha(Opacity=40);
  filter: alpha(opacity=40);
}
.rtl .toast-close-button {
  left: -0.3em;
  float: left;
  right: 0.3em;
}
button.toast-close-button {
  padding: 0;
  cursor: pointer;
  background: 0 0;
  border: 0;
  appearance: none;
  -webkit-appearance: none;
}
.toast-top-center {
  top: 0;
  right: 0;
  width: 100%;
}
.toast-bottom-center {
  bottom: 0;
  right: 0;
  width: 100%;
}
.toast-top-full-width {
  top: 0;
  right: 0;
  width: 100%;
}
.toast-bottom-full-width {
  bottom: 0;
  right: 0;
  width: 100%;
}
.toast-top-left {
  top: 12px;
  left: 12px;
}
.toast-top-right {
  top: 12px;
  right: 12px;
}
.toast-bottom-right {
  right: 12px;
  bottom: 12px;
}
.toast-bottom-left {
  bottom: 12px;
  left: 12px;
}
#toast-container {
  position: fixed;
  z-index: 999999;
  pointer-events: none;
}
#toast-container * {
  -moz-box-sizing: border-box;
  -webkit-box-sizing: border-box;
  box-sizing: border-box;
}
#toast-container > div {
  position: relative;
  pointer-events: auto;
  overflow: hidden;
  margin: 0 0 6px;
  padding: 15px 15px 15px 50px;
  width: 300px;
  -moz-border-radius: 3px;
  -webkit-border-radius: 3px;
  border-radius: 3px;
  background-position: 15px center;
  background-repeat: no-repeat;
  -moz-box-shadow: 0 0 12px #999;
  -webkit-box-shadow: 0 0 12px #999;
  box-shadow: 0 0 12px #999;
  color: #fff;
  opacity: 0.8;
  -ms-filter: progid:DXImageTransform.Microsoft.Alpha(Opacity=80);
  filter: alpha(opacity=80);
}
#toast-container > div.rtl {
  direction: rtl;
  padding: 15px 50px 15px 15px;
  background-position: right 15px center;
}
#toast-container > div:hover {
  -moz-box-shadow: 0 0 12px #000;
  -webkit-box-shadow: 0 0 12px #000;
  box-shadow: 0 0 12px #000;
  opacity: 1;
  -ms-filter: progid:DXImageTransform.Microsoft.Alpha(Opacity=100);
  filter: alpha(opacity=100);
  cursor: pointer;
}
#toast-container > .toast-info {
  background-image: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAGwSURBVEhLtZa9SgNBEMc9sUxxRcoUKSzSWIhXpFMhhYWFhaBg4yPYiWCXZxBLERsLRS3EQkEfwCKdjWJAwSKCgoKCcudv4O5YLrt7EzgXhiU3/4+b2ckmwVjJSpKkQ6wAi4gwhT+z3wRBcEz0yjSseUTrcRyfsHsXmD0AmbHOC9Ii8VImnuXBPglHpQ5wwSVM7sNnTG7Za4JwDdCjxyAiH3nyA2mtaTJufiDZ5dCaqlItILh1NHatfN5skvjx9Z38m69CgzuXmZgVrPIGE763Jx9qKsRozWYw6xOHdER+nn2KkO+Bb+UV5CBN6WC6QtBgbRVozrahAbmm6HtUsgtPC19tFdxXZYBOfkbmFJ1VaHA1VAHjd0pp70oTZzvR+EVrx2Ygfdsq6eu55BHYR8hlcki+n+kERUFG8BrA0BwjeAv2M8WLQBtcy+SD6fNsmnB3AlBLrgTtVW1c2QN4bVWLATaIS60J2Du5y1TiJgjSBvFVZgTmwCU+dAZFoPxGEEs8nyHC9Bwe2GvEJv2WXZb0vjdyFT4Cxk3e/kIqlOGoVLwwPevpYHT+00T+hWwXDf4AJAOUqWcDhbwAAAAASUVORK5CYII=) !important;
}
#toast-container > .toast-error {
  background-image: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAHOSURBVEhLrZa/SgNBEMZzh0WKCClSCKaIYOED+AAKeQQLG8HWztLCImBrYadgIdY+gIKNYkBFSwu7CAoqCgkkoGBI/E28PdbLZmeDLgzZzcx83/zZ2SSXC1j9fr+I1Hq93g2yxH4iwM1vkoBWAdxCmpzTxfkN2RcyZNaHFIkSo10+8kgxkXIURV5HGxTmFuc75B2RfQkpxHG8aAgaAFa0tAHqYFfQ7Iwe2yhODk8+J4C7yAoRTWI3w/4klGRgR4lO7Rpn9+gvMyWp+uxFh8+H+ARlgN1nJuJuQAYvNkEnwGFck18Er4q3egEc/oO+mhLdKgRyhdNFiacC0rlOCbhNVz4H9FnAYgDBvU3QIioZlJFLJtsoHYRDfiZoUyIxqCtRpVlANq0EU4dApjrtgezPFad5S19Wgjkc0hNVnuF4HjVA6C7QrSIbylB+oZe3aHgBsqlNqKYH48jXyJKMuAbiyVJ8KzaB3eRc0pg9VwQ4niFryI68qiOi3AbjwdsfnAtk0bCjTLJKr6mrD9g8iq/S/B81hguOMlQTnVyG40wAcjnmgsCNESDrjme7wfftP4P7SP4N3CJZdvzoNyGq2c/HWOXJGsvVg+RA/k2MC/wN6I2YA2Pt8GkAAAAASUVORK5CYII=) !important;
}
#toast-container > .toast-success {
  background-image: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAADsSURBVEhLY2AYBfQMgf///3P8+/evAIgvA/FsIF+BavYDDWMBGroaSMMBiE8VC7AZDrIFaMFnii3AZTjUgsUUWUDA8OdAH6iQbQEhw4HyGsPEcKBXBIC4ARhex4G4BsjmweU1soIFaGg/WtoFZRIZdEvIMhxkCCjXIVsATV6gFGACs4Rsw0EGgIIH3QJYJgHSARQZDrWAB+jawzgs+Q2UO49D7jnRSRGoEFRILcdmEMWGI0cm0JJ2QpYA1RDvcmzJEWhABhD/pqrL0S0CWuABKgnRki9lLseS7g2AlqwHWQSKH4oKLrILpRGhEQCw2LiRUIa4lwAAAABJRU5ErkJggg==) !important;
}
#toast-container > .toast-warning {
  background-image: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAGYSURBVEhL5ZSvTsNQFMbXZGICMYGYmJhAQIJAICYQPAACiSDB8AiICQQJT4CqQEwgJvYASAQCiZiYmJhAIBATCARJy+9rTsldd8sKu1M0+dLb057v6/lbq/2rK0mS/TRNj9cWNAKPYIJII7gIxCcQ51cvqID+GIEX8ASG4B1bK5gIZFeQfoJdEXOfgX4QAQg7kH2A65yQ87lyxb27sggkAzAuFhbbg1K2kgCkB1bVwyIR9m2L7PRPIhDUIXgGtyKw575yz3lTNs6X4JXnjV+LKM/m3MydnTbtOKIjtz6VhCBq4vSm3ncdrD2lk0VgUXSVKjVDJXJzijW1RQdsU7F77He8u68koNZTz8Oz5yGa6J3H3lZ0xYgXBK2QymlWWA+RWnYhskLBv2vmE+hBMCtbA7KX5drWyRT/2JsqZ2IvfB9Y4bWDNMFbJRFmC9E74SoS0CqulwjkC0+5bpcV1CZ8NMej4pjy0U+doDQsGyo1hzVJttIjhQ7GnBtRFN1UarUlH8F3xict+HY07rEzoUGPlWcjRFRr4/gChZgc3ZL2d8oAAAAASUVORK5CYII=) !important;
}
#toast-container.toast-bottom-center > div,
#toast-container.toast-top-center > div {
  width: 300px;
  margin-left: auto;
  margin-right: auto;
}
#toast-container.toast-bottom-full-width > div,
#toast-container.toast-top-full-width > div {
  width: 96%;
  margin-left: auto;
  margin-right: auto;
}
.toast {
  background-color: #030303;
}
.toast-success {
  background-color: #51a351;
}
.toast-error {
  background-color: #bd362f;
}
.toast-info {
  background-color: #2f96b4;
}
.toast-warning {
  background-color: #f89406;
}
.toast-progress {
  position: absolute;
  left: 0;
  bottom: 0;
  height: 4px;
  background-color: #000;
  opacity: 0.4;
  -ms-filter: progid:DXImageTransform.Microsoft.Alpha(Opacity=40);
  filter: alpha(opacity=40);
}
@media all and (max-width: 240px) {
  #toast-container > div {
    padding: 8px 8px 8px 50px;
    width: 11em;
  }
  #toast-container > div.rtl {
    padding: 8px 50px 8px 8px;
  }
  #toast-container .toast-close-button {
    right: -0.2em;
    top: -0.2em;
  }
  #toast-container .rtl .toast-close-button {
    left: -0.2em;
    right: 0.2em;
  }
}
@media all and (min-width: 241px) and (max-width: 480px) {
  #toast-container > div {
    padding: 8px 8px 8px 50px;
    width: 18em;
  }
  #toast-container > div.rtl {
    padding: 8px 50px 8px 8px;
  }
  #toast-container .toast-close-button {
    right: -0.2em;
    top: -0.2em;
  }
  #toast-container .rtl .toast-close-button {
    left: -0.2em;
    right: 0.2em;
  }
}
@media all and (min-width: 481px) and (max-width: 768px) {
  #toast-container > div {
    padding: 15px 15px 15px 50px;
    width: 25em;
  }
  #toast-container > div.rtl {
    padding: 15px 50px 15px 15px;
  }
}
`;
const applyToastrStyles = () => {
  const styleElement = document.createElement("style");
  styleElement.textContent = TOASTR_STYLES;
  document.head.appendChild(styleElement);
  return styleElement;
};
class Toastr {
  constructor() {
    this.version = "1.0.0";
    this.previousToast = null;
    this.container = null;
    this.listener = null;
    this.defaults = {
      tapToDismiss: true,
      toastClass: "toast",
      containerId: "toast-container",
      debug: false,
      showMethod: "fadeIn",
      showDuration: 300,
      showEasing: "swing",
      onShown: () => {
      },
      hideMethod: "fadeOut",
      hideDuration: 1e3,
      hideEasing: "swing",
      onHidden: () => {
      },
      closeMethod: false,
      closeDuration: false,
      closeEasing: false,
      closeOnHover: true,
      extendedTimeOut: 1e3,
      iconClasses: {
        error: "toast-error",
        info: "toast-info",
        success: "toast-success",
        warning: "toast-warning"
      },
      iconClass: "toast-info",
      positionClass: "toast-bottom-right",
      timeOut: 5e3,
      titleClass: "toast-title",
      messageClass: "toast-message",
      escapeHtml: false,
      target: "body",
      closeHtml: '<button type="button">&times;</button>',
      closeClass: "toast-close-button",
      newestOnTop: true,
      preventDuplicates: false,
      progressBar: true,
      progressClass: "toast-progress",
      rtl: false,
      closeButton: true,
      onCloseClick: () => {
      },
      onclick: () => {
      }
    };
  }
  subscribe(callback) {
    this.listener = callback;
  }
  getContainer(options = {}, create = false) {
    if (!this.container && create) {
      const targetElement = document.querySelector(options.target || "body") || document.body;
      this.container = document.createElement("div");
      this.container.id = options.containerId || this.defaults.containerId || "";
      this.container.className = options.positionClass || this.defaults.positionClass || "";
      this.container.style.cssText = `
                position: fixed;
                z-index: 999999;
                pointer-events: none;
            `;
      switch (options.positionClass) {
        case "toast-bottom-right":
          this.container.style.right = "12px";
          this.container.style.bottom = "12px";
          break;
        case "toast-bottom-left":
          this.container.style.left = "12px";
          this.container.style.bottom = "12px";
          break;
        case "toast-top-right":
          this.container.style.right = "12px";
          this.container.style.top = "12px";
          break;
        case "toast-top-left":
          this.container.style.left = "12px";
          this.container.style.top = "12px";
          break;
      }
      targetElement.appendChild(this.container);
    }
    return this.container;
  }
  error(message, title, options) {
    return this.notify({
      type: "error",
      iconClass: this.defaults.iconClasses.error || "",
      message,
      title,
      options
    });
  }
  info(message, title, options) {
    return this.notify({
      type: "info",
      iconClass: this.defaults.iconClasses.info || "",
      message,
      title,
      options
    });
  }
  success(message, title, options) {
    return this.notify({
      type: "success",
      iconClass: this.defaults.iconClasses.success || "",
      message,
      title,
      options
    });
  }
  warning(message, title, options) {
    return this.notify({
      type: "warning",
      iconClass: this.defaults.iconClasses.warning || "",
      message,
      title,
      options
    });
  }
  notify(params) {
    const options = { ...this.defaults, ...params.options };
    if (options.preventDuplicates) {
      if (this.previousToast && this.previousToast.message === params.message) {
        return;
      }
    }
    const toastElement = document.createElement("div");
    toastElement.className = options.toastClass ?? "";
    toastElement.classList.add(params.iconClass ?? "");
    if (options.closeButton) {
      const closeButton = document.createElement("button");
      closeButton.type = "button";
      closeButton.className = options.closeClass;
      closeButton.innerHTML = "&times;";
      closeButton.style.cssText = `
                position: relative;
                right: -.3em;
                top: -.3em;
                float: right;
                font-size: 20px;
                font-weight: bold;
                color: #FFFFFF;
                text-shadow: 0 1px 0 #ffffff;
                opacity: 0.8;
            `;
      closeButton.addEventListener("click", (e) => {
        if (options.onCloseClick) {
          options.onCloseClick(e);
        }
        this.removeToast(toastElement);
      });
      toastElement.appendChild(closeButton);
    }
    if (params.title) {
      const titleElement = document.createElement("div");
      titleElement.className = options.titleClass ?? "";
      titleElement.innerHTML = options.escapeHtml ? this.escapeHtml(params.title) : params.title;
      toastElement.appendChild(titleElement);
    }
    if (params.message) {
      const messageElement = document.createElement("div");
      messageElement.className = options.messageClass ?? "";
      messageElement.innerHTML = options.escapeHtml ? this.escapeHtml(params.message) : params.message;
      toastElement.appendChild(messageElement);
    }
    if (options.progressBar) {
      const progressElement = document.createElement("div");
      progressElement.className = options.progressClass ?? "";
      progressElement.style.cssText = `
                position: absolute;
                left: 0;
                bottom: 0;
                height: 4px;
                background-color: #000000;
                opacity: 0.4;
                width: 100%;
            `;
      toastElement.appendChild(progressElement);
      setTimeout(() => {
        const timeout = typeof options.timeOut === "number" ? options.timeOut : 0;
        progressElement.style.transition = `width ${timeout}ms linear`;
        progressElement.style.width = "0%";
      }, 10);
    }
    if (options.rtl) {
      toastElement.classList.add("rtl");
    }
    if (options.onclick) {
      toastElement.addEventListener("click", (e) => {
        options.onclick(e);
        if (options.tapToDismiss) this.removeToast(toastElement);
      });
    }
    if (options.closeOnHover) {
      toastElement.addEventListener("mouseenter", () => {
        clearTimeout(toastElement.timeoutId);
        const progressElement = toastElement.querySelector(`.${options.progressClass}`);
        if (progressElement instanceof HTMLElement) {
          progressElement.style.transition = "none";
        }
      });
      toastElement.addEventListener("mouseleave", () => {
        if (options.timeOut > 0) {
          toastElement.timeoutId = setTimeout(() => {
            this.removeToast(toastElement);
          }, options.extendedTimeOut);
          const progressElement = toastElement.querySelector(`.${options.progressClass}`);
          if (progressElement instanceof HTMLElement) {
            const ext = typeof options.extendedTimeOut === "number" ? options.extendedTimeOut : 0;
            progressElement.style.transition = `width ${ext}ms linear`;
            progressElement.style.width = "0%";
          }
        }
      });
    }
    this.animate(toastElement, {
      method: options.showMethod,
      duration: options.showDuration,
      easing: options.showEasing
    }, () => {
      if (options.onShown) options.onShown();
    });
    const container = this.getContainer(options, true);
    if (options.newestOnTop) {
      container.insertBefore(toastElement, container.firstChild);
    } else {
      container.appendChild(toastElement);
    }
    if (options.timeOut && options.timeOut > 0) {
      setTimeout(() => {
        this.removeToast(toastElement);
      }, options.timeOut);
    }
    if (options.tapToDismiss) {
      toastElement.addEventListener("click", () => this.removeToast(toastElement));
    }
    this.previousToast = params;
    if (this.listener) {
      const toastData = {
        toastId: Date.now(),
        state: "visible",
        startTime: /* @__PURE__ */ new Date(),
        options,
        map: params
      };
      this.listener(toastData);
    }
    return toastElement;
  }
  removeToast(toastElement) {
    if (!toastElement) return;
    toastElement.style.opacity = "0";
    toastElement.style.transition = "opacity 0.5s ease-in-out";
    setTimeout(() => {
      if (toastElement.parentNode) {
        toastElement.parentNode.removeChild(toastElement);
      }
      if (this.container && !this.container.hasChildNodes()) {
        this.container.remove();
        this.container = null;
      }
    }, 500);
  }
  clear() {
    if (this.container) {
      const toasts = this.container.querySelectorAll(".toast");
      toasts.forEach((toast) => this.removeToast(toast));
    }
  }
  escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }
  animate(element, animationOptions, callback) {
    const { method, duration, easing } = animationOptions;
    element.style.animation = `${method} ${duration}ms ${easing}`;
    element.addEventListener("animationend", () => {
      element.style.animation = "";
      if (callback) callback();
    }, { once: true });
  }
}
const toastr = new Toastr();
if (typeof window !== "undefined") {
  window.toastr = toastr;
}

const addOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M19%2013h-6v6h-2v-6H5v-2h6V5h2v6h6v2z'/%3e%3c/svg%3e";

const analyticsOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M19%203H5c-1.1%200-2%20.9-2%202v14c0%201.1.9%202%202%202h14c1.1%200%202-.9%202-2V5c0-1.1-.9-2-2-2zm0%2016H5V5h14v14z'/%3e%3cpath%20d='M7%2012h2v5H7zm8-5h2v10h-2zm-4%207h2v3h-2zm0-4h2v2h-2z'/%3e%3c/svg%3e";

const arrowDownwardOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='m20%2012-1.41-1.41L13%2016.17V4h-2v12.17l-5.58-5.59L4%2012l8%208%208-8z'/%3e%3c/svg%3e";

const arrowUpwardOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='m4%2012%201.41%201.41L11%207.83V20h2V7.83l5.58%205.59L20%2012l-8-8-8%208z'/%3e%3c/svg%3e";

const assignmentOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M7%2015h7v2H7zm0-4h10v2H7zm0-4h10v2H7zm12-4h-4.18C14.4%201.84%2013.3%201%2012%201c-1.3%200-2.4.84-2.82%202H5c-.14%200-.27.01-.4.04a2.008%202.008%200%200%200-1.44%201.19c-.1.23-.16.49-.16.77v14c0%20.27.06.54.16.78s.25.45.43.64c.27.27.62.47%201.01.55.13.02.26.03.4.03h14c1.1%200%202-.9%202-2V5c0-1.1-.9-2-2-2zm-7-.25c.41%200%20.75.34.75.75s-.34.75-.75.75-.75-.34-.75-.75.34-.75.75-.75zM19%2019H5V5h14v14z'/%3e%3c/svg%3e";

const audiotrackOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M12%203v10.55c-.59-.34-1.27-.55-2-.55-2.21%200-4%201.79-4%204s1.79%204%204%204%204-1.79%204-4V7h4V3h-6zm-2%2016c-1.1%200-2-.9-2-2s.9-2%202-2%202%20.9%202%202-.9%202-2%202z'/%3e%3c/svg%3e";

const backupOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M19.35%2010.04A7.49%207.49%200%200%200%2012%204C9.11%204%206.6%205.64%205.35%208.04A5.994%205.994%200%200%200%200%2014c0%203.31%202.69%206%206%206h13c2.76%200%205-2.24%205-5%200-2.64-2.05-4.78-4.65-4.96zM19%2018H6c-2.21%200-4-1.79-4-4%200-2.05%201.53-3.76%203.56-3.97l1.07-.11.5-.95A5.469%205.469%200%200%201%2012%206c2.62%200%204.88%201.86%205.39%204.43l.3%201.5%201.53.11A2.98%202.98%200%200%201%2022%2015c0%201.65-1.35%203-3%203zM8%2013h2.55v3h2.9v-3H16l-4-4z'/%3e%3c/svg%3e";

const barChartOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M4%209h4v11H4zm12%204h4v7h-4zm-6-9h4v16h-4z'/%3e%3c/svg%3e";

const blockOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M12%202C6.48%202%202%206.48%202%2012s4.48%2010%2010%2010%2010-4.48%2010-10S17.52%202%2012%202zM4%2012c0-4.42%203.58-8%208-8%201.85%200%203.55.63%204.9%201.69L5.69%2016.9A7.902%207.902%200%200%201%204%2012zm8%208c-1.85%200-3.55-.63-4.9-1.69L18.31%207.1A7.902%207.902%200%200%201%2020%2012c0%204.42-3.58%208-8%208z'/%3e%3c/svg%3e";

const bookmarkOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M17%203H7c-1.1%200-2%20.9-2%202v16l7-3%207%203V5c0-1.1-.9-2-2-2z'/%3e%3c/svg%3e";

const bugReportOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M20%208h-2.81a5.985%205.985%200%200%200-1.82-1.96L17%204.41%2015.59%203l-2.17%202.17C12.96%205.06%2012.49%205%2012%205s-.96.06-1.41.17L8.41%203%207%204.41l1.62%201.63C7.88%206.55%207.26%207.22%206.81%208H4v2h2.09c-.05.33-.09.66-.09%201v1H4v2h2v1c0%20.34.04.67.09%201H4v2h2.81c1.04%201.79%202.97%203%205.19%203s4.15-1.21%205.19-3H20v-2h-2.09c.05-.33.09-.66.09-1v-1h2v-2h-2v-1c0-.34-.04-.67-.09-1H20V8zm-4%204v3c0%20.22-.03.47-.07.7l-.1.65-.37.65c-.72%201.24-2.04%202-3.46%202s-2.74-.77-3.46-2l-.37-.64-.1-.65A4.27%204.27%200%200%201%208%2015v-4c0-.23.03-.48.07-.7l.1-.65.37-.65c.3-.52.72-.97%201.21-1.31l.57-.39.74-.18a3.787%203.787%200%200%201%201.89%200l.68.16.61.42c.5.34.91.78%201.21%201.31l.38.65.1.65c.04.22.07.47.07.69v1zm-6%202h4v2h-4zm0-4h4v2h-4z'/%3e%3c/svg%3e";

const buildOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='m22.61%2018.99-9.08-9.08c.93-2.34.45-5.1-1.44-7C9.79.61%206.21.4%203.66%202.26L7.5%206.11%206.08%207.52%202.25%203.69C.39%206.23.6%209.82%202.9%2012.11c1.86%201.86%204.57%202.35%206.89%201.48l9.11%209.11c.39.39%201.02.39%201.41%200l2.3-2.3c.4-.38.4-1.01%200-1.41zm-3%201.6-9.46-9.46c-.61.45-1.29.72-2%20.82-1.36.2-2.79-.21-3.83-1.25C3.37%209.76%202.93%208.5%203%207.26l3.09%203.09%204.24-4.24-3.09-3.09c1.24-.07%202.49.37%203.44%201.31a4.469%204.469%200%200%201%201.24%203.96%204.35%204.35%200%200%201-.88%201.96l9.45%209.45-.88.89z'/%3e%3c/svg%3e";

const cardGiftcardOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M20%206h-2.18c.11-.31.18-.65.18-1a2.996%202.996%200%200%200-5.5-1.65l-.5.67-.5-.68C10.96%202.54%2010.05%202%209%202%207.34%202%206%203.34%206%205c0%20.35.07.69.18%201H4c-1.11%200-1.99.89-1.99%202L2%2019c0%201.11.89%202%202%202h16c1.11%200%202-.89%202-2V8c0-1.11-.89-2-2-2zm-5-2c.55%200%201%20.45%201%201s-.45%201-1%201-1-.45-1-1%20.45-1%201-1zM9%204c.55%200%201%20.45%201%201s-.45%201-1%201-1-.45-1-1%20.45-1%201-1zm11%2015H4v-2h16v2zm0-5H4V8h5.08L7%2010.83%208.62%2012%2012%207.4l3.38%204.6L17%2010.83%2014.92%208H20v6z'/%3e%3c/svg%3e";

const checkOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M9%2016.17%204.83%2012l-1.42%201.41L9%2019%2021%207l-1.41-1.41L9%2016.17z'/%3e%3c/svg%3e";

const checkBoxOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M19%203H5c-1.1%200-2%20.9-2%202v14c0%201.1.9%202%202%202h14c1.1%200%202-.9%202-2V5c0-1.1-.9-2-2-2zm0%2016H5V5h14v14zM17.99%209l-1.41-1.42-6.59%206.59-2.58-2.57-1.42%201.41%204%203.99z'/%3e%3c/svg%3e";

const checkBoxOutlineBlankOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M19%205v14H5V5h14m0-2H5c-1.1%200-2%20.9-2%202v14c0%201.1.9%202%202%202h14c1.1%200%202-.9%202-2V5c0-1.1-.9-2-2-2z'/%3e%3c/svg%3e";

const checkCircleOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M12%202C6.48%202%202%206.48%202%2012s4.48%2010%2010%2010%2010-4.48%2010-10S17.52%202%2012%202zm0%2018c-4.41%200-8-3.59-8-8s3.59-8%208-8%208%203.59%208%208-3.59%208-8%208zm4.59-12.42L10%2014.17l-2.59-2.58L6%2013l4%204%208-8z'/%3e%3c/svg%3e";

const clearOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M19%206.41%2017.59%205%2012%2010.59%206.41%205%205%206.41%2010.59%2012%205%2017.59%206.41%2019%2012%2013.41%2017.59%2019%2019%2017.59%2013.41%2012%2019%206.41z'/%3e%3c/svg%3e";

const clearAllOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M5%2013h14v-2H5v2zm-2%204h14v-2H3v2zM7%207v2h14V7H7z'/%3e%3c/svg%3e";

const closeOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M19%206.41%2017.59%205%2012%2010.59%206.41%205%205%206.41%2010.59%2012%205%2017.59%206.41%2019%2012%2013.41%2017.59%2019%2019%2017.59%2013.41%2012%2019%206.41z'/%3e%3c/svg%3e";

const cloudOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M12%206c2.62%200%204.88%201.86%205.39%204.43l.3%201.5%201.53.11A2.98%202.98%200%200%201%2022%2015c0%201.65-1.35%203-3%203H6c-2.21%200-4-1.79-4-4%200-2.05%201.53-3.76%203.56-3.97l1.07-.11.5-.95A5.469%205.469%200%200%201%2012%206m0-2C9.11%204%206.6%205.64%205.35%208.04A5.994%205.994%200%200%200%200%2014c0%203.31%202.69%206%206%206h13c2.76%200%205-2.24%205-5%200-2.64-2.05-4.78-4.65-4.96A7.49%207.49%200%200%200%2012%204z'/%3e%3c/svg%3e";

const cloudDownloadOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M19.35%2010.04A7.49%207.49%200%200%200%2012%204C9.11%204%206.6%205.64%205.35%208.04A5.994%205.994%200%200%200%200%2014c0%203.31%202.69%206%206%206h13c2.76%200%205-2.24%205-5%200-2.64-2.05-4.78-4.65-4.96zM19%2018H6c-2.21%200-4-1.79-4-4%200-2.05%201.53-3.76%203.56-3.97l1.07-.11.5-.95A5.469%205.469%200%200%201%2012%206c2.62%200%204.88%201.86%205.39%204.43l.3%201.5%201.53.11A2.98%202.98%200%200%201%2022%2015c0%201.65-1.35%203-3%203zm-5.55-8h-2.9v3H8l4%204%204-4h-2.55z'/%3e%3c/svg%3e";

const cloudUploadOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M19.35%2010.04A7.49%207.49%200%200%200%2012%204C9.11%204%206.6%205.64%205.35%208.04A5.994%205.994%200%200%200%200%2014c0%203.31%202.69%206%206%206h13c2.76%200%205-2.24%205-5%200-2.64-2.05-4.78-4.65-4.96zM19%2018H6c-2.21%200-4-1.79-4-4%200-2.05%201.53-3.76%203.56-3.97l1.07-.11.5-.95A5.469%205.469%200%200%201%2012%206c2.62%200%204.88%201.86%205.39%204.43l.3%201.5%201.53.11A2.98%202.98%200%200%201%2022%2015c0%201.65-1.35%203-3%203zM8%2013h2.55v3h2.9v-3H16l-4-4z'/%3e%3c/svg%3e";

const colorLensOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M12%2022C6.49%2022%202%2017.51%202%2012S6.49%202%2012%202s10%204.04%2010%209c0%203.31-2.69%206-6%206h-1.77c-.28%200-.5.22-.5.5%200%20.12.05.23.13.33.41.47.64%201.06.64%201.67A2.5%202.5%200%200%201%2012%2022zm0-18c-4.41%200-8%203.59-8%208s3.59%208%208%208c.28%200%20.5-.22.5-.5a.54.54%200%200%200-.14-.35c-.41-.46-.63-1.05-.63-1.65a2.5%202.5%200%200%201%202.5-2.5H16c2.21%200%204-1.79%204-4%200-3.86-3.59-7-8-7z'/%3e%3ccircle%20cx='6.5'%20cy='11.5'%20r='1.5'/%3e%3ccircle%20cx='9.5'%20cy='7.5'%20r='1.5'/%3e%3ccircle%20cx='14.5'%20cy='7.5'%20r='1.5'/%3e%3ccircle%20cx='17.5'%20cy='11.5'%20r='1.5'/%3e%3c/svg%3e";

const commentOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M21.99%204c0-1.1-.89-2-1.99-2H4c-1.1%200-2%20.9-2%202v12c0%201.1.9%202%202%202h14l4%204-.01-18zM20%204v13.17L18.83%2016H4V4h16zM6%2012h12v2H6zm0-3h12v2H6zm0-3h12v2H6z'/%3e%3c/svg%3e";

const contentCopyOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M16%201H4c-1.1%200-2%20.9-2%202v14h2V3h12V1zm3%204H8c-1.1%200-2%20.9-2%202v14c0%201.1.9%202%202%202h11c1.1%200%202-.9%202-2V7c0-1.1-.9-2-2-2zm0%2016H8V7h11v14z'/%3e%3c/svg%3e";

const dashboardOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M19%205v2h-4V5h4M9%205v6H5V5h4m10%208v6h-4v-6h4M9%2017v2H5v-2h4M21%203h-8v6h8V3zM11%203H3v10h8V3zm10%208h-8v10h8V11zm-10%204H3v6h8v-6z'/%3e%3c/svg%3e";

const deleteOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M16%209v10H8V9h8m-1.5-6h-5l-1%201H5v2h14V4h-3.5l-1-1zM18%207H6v12c0%201.1.9%202%202%202h8c1.1%200%202-.9%202-2V7z'/%3e%3c/svg%3e";

const deleteForeverOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M14.12%2010.47%2012%2012.59l-2.13-2.12-1.41%201.41L10.59%2014l-2.12%202.12%201.41%201.41L12%2015.41l2.12%202.12%201.41-1.41L13.41%2014l2.12-2.12zM15.5%204l-1-1h-5l-1%201H5v2h14V4zM6%2019c0%201.1.9%202%202%202h8c1.1%200%202-.9%202-2V7H6v12zM8%209h8v10H8V9z'/%3e%3c/svg%3e";

const deleteOutlineOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M6%2019c0%201.1.9%202%202%202h8c1.1%200%202-.9%202-2V7H6v12zM8%209h8v10H8V9zm7.5-5-1-1h-5l-1%201H5v2h14V4h-3.5z'/%3e%3c/svg%3e";

const deleteSweepOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M15%2016h4v2h-4zm0-8h7v2h-7zm0%204h6v2h-6zM3%2018c0%201.1.9%202%202%202h6c1.1%200%202-.9%202-2V8H3v10zm2-8h6v8H5v-8zm5-6H6L5%205H2v2h12V5h-3z'/%3e%3c/svg%3e";

const downloadOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M19%209h-4V3H9v6H5l7%207%207-7zm-8%202V5h2v6h1.17L12%2013.17%209.83%2011H11zm-6%207h14v2H5z'/%3e%3c/svg%3e";

const driveFileMoveOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M20%206h-8l-2-2H4c-1.1%200-2%20.9-2%202v12c0%201.1.9%202%202%202h16c1.1%200%202-.9%202-2V8c0-1.1-.9-2-2-2zm0%2012H4V6h5.17l1.41%201.41.59.59H20v10zm-7.84-6H8v2h4.16l-1.59%201.59L11.99%2017%2016%2013.01%2011.99%209l-1.41%201.41L12.16%2012z'/%3e%3c/svg%3e";

const editOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='m14.06%209.02.92.92L5.92%2019H5v-.92l9.06-9.06M17.66%203c-.25%200-.51.1-.7.29l-1.83%201.83%203.75%203.75%201.83-1.83a.996.996%200%200%200%200-1.41l-2.34-2.34c-.2-.2-.45-.29-.71-.29zm-3.6%203.19L3%2017.25V21h3.75L17.81%209.94l-3.75-3.75z'/%3e%3c/svg%3e";

const errorOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M12%202C6.48%202%202%206.48%202%2012s4.48%2010%2010%2010%2010-4.48%2010-10S17.52%202%2012%202zm1%2015h-2v-2h2v2zm0-4h-2V7h2v6z'/%3e%3c/svg%3e";

const expandLessOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='m12%208-6%206%201.41%201.41L12%2010.83l4.59%204.58L18%2014l-6-6z'/%3e%3c/svg%3e";

const expandMoreOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M16.59%208.59%2012%2013.17%207.41%208.59%206%2010l6%206%206-6-1.41-1.41z'/%3e%3c/svg%3e";

const fastForwardOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M15%209.86%2018.03%2012%2015%2014.14V9.86m-9%200L9.03%2012%206%2014.14V9.86M13%206v12l8.5-6L13%206zM4%206v12l8.5-6L4%206z'/%3e%3c/svg%3e";

const fastRewindOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M18%209.86v4.28L14.97%2012%2018%209.86m-9%200v4.28L5.97%2012%209%209.86M20%206l-8.5%206%208.5%206V6zm-9%200-8.5%206%208.5%206V6z'/%3e%3c/svg%3e";

const favoriteOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='m12%2021.35-1.45-1.32C5.4%2015.36%202%2012.28%202%208.5%202%205.42%204.42%203%207.5%203c1.74%200%203.41.81%204.5%202.09C13.09%203.81%2014.76%203%2016.5%203%2019.58%203%2022%205.42%2022%208.5c0%203.78-3.4%206.86-8.55%2011.54L12%2021.35z'/%3e%3c/svg%3e";

const fileDownloadOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M18%2015v3H6v-3H4v3c0%201.1.9%202%202%202h12c1.1%200%202-.9%202-2v-3h-2zm-1-4-1.41-1.41L13%2012.17V4h-2v8.17L8.41%209.59%207%2011l5%205%205-5z'/%3e%3c/svg%3e";

const fileUploadOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M18%2015v3H6v-3H4v3c0%201.1.9%202%202%202h12c1.1%200%202-.9%202-2v-3h-2zM7%209l1.41%201.41L11%207.83V16h2V7.83l2.59%202.58L17%209l-5-5-5%205z'/%3e%3c/svg%3e";

const filterListOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M10%2018h4v-2h-4v2zM3%206v2h18V6H3zm3%207h12v-2H6v2z'/%3e%3c/svg%3e";

const firstPageOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M18.41%2016.59%2013.82%2012l4.59-4.59L17%206l-6%206%206%206%201.41-1.41zM6%206h2v12H6V6z'/%3e%3c/svg%3e";

const flashOnOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M7%202v11h3v9l7-12h-4l3-8z'/%3e%3c/svg%3e";

const folderOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='m9.17%206%202%202H20v10H4V6h5.17M10%204H4c-1.1%200-1.99.9-1.99%202L2%2018c0%201.1.9%202%202%202h16c1.1%200%202-.9%202-2V8c0-1.1-.9-2-2-2h-8l-2-2z'/%3e%3c/svg%3e";

const folderOpenOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M20%206h-8l-2-2H4c-1.1%200-1.99.9-1.99%202L2%2018c0%201.1.9%202%202%202h16c1.1%200%202-.9%202-2V8c0-1.1-.9-2-2-2zm0%2012H4V8h16v10z'/%3e%3c/svg%3e";

const forward10OutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M18%2013c0%203.31-2.69%206-6%206s-6-2.69-6-6%202.69-6%206-6v4l5-5-5-5v4c-4.42%200-8%203.58-8%208s3.58%208%208%208%208-3.58%208-8h-2z'/%3e%3cpath%20d='M10.9%2016v-4.27h-.09l-1.77.63v.69l1.01-.31V16zm3.42-4.22c-.18-.07-.37-.1-.59-.1s-.41.03-.59.1-.33.18-.45.33-.23.34-.29.57-.1.5-.1.82v.74c0%20.32.04.6.11.82s.17.42.3.57.28.26.46.33.37.1.59.1.41-.03.59-.1.33-.18.45-.33.22-.34.29-.57.1-.5.1-.82v-.74c0-.32-.04-.6-.11-.82s-.17-.42-.3-.57-.29-.26-.46-.33zm.01%202.57c0%20.19-.01.35-.04.48s-.06.24-.11.32-.11.14-.19.17-.16.05-.25.05-.18-.02-.25-.05-.14-.09-.19-.17-.09-.19-.12-.32-.04-.29-.04-.48v-.97c0-.19.01-.35.04-.48s.06-.23.12-.31.11-.14.19-.17.16-.05.25-.05.18.02.25.05.14.09.19.17.09.18.12.31.04.29.04.48v.97z'/%3e%3c/svg%3e";

const fullscreenOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M7%2014H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12%207h-3v2h5v-5h-2v3zM14%205v2h3v3h2V5h-5z'/%3e%3c/svg%3e";

const fullscreenExitOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M5%2016h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6%2011h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z'/%3e%3c/svg%3e";

const gpsFixedOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M12%208c-2.21%200-4%201.79-4%204s1.79%204%204%204%204-1.79%204-4-1.79-4-4-4zm8.94%203A8.994%208.994%200%200%200%2013%203.06V1h-2v2.06A8.994%208.994%200%200%200%203.06%2011H1v2h2.06A8.994%208.994%200%200%200%2011%2020.94V23h2v-2.06A8.994%208.994%200%200%200%2020.94%2013H23v-2h-2.06zM12%2019c-3.87%200-7-3.13-7-7s3.13-7%207-7%207%203.13%207%207-3.13%207-7%207z'/%3e%3c/svg%3e";

const helpOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M12%202C6.48%202%202%206.48%202%2012s4.48%2010%2010%2010%2010-4.48%2010-10S17.52%202%2012%202zm1%2017h-2v-2h2v2zm2.07-7.75-.9.92C13.45%2012.9%2013%2013.5%2013%2015h-2v-.5c0-1.1.45-2.1%201.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41%200-1.1-.9-2-2-2s-2%20.9-2%202H8c0-2.21%201.79-4%204-4s4%201.79%204%204c0%20.88-.36%201.68-.93%202.25z'/%3e%3c/svg%3e";

const historyOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M13%203a9%209%200%200%200-9%209H1l3.89%203.89.07.14L9%2012H6c0-3.87%203.13-7%207-7s7%203.13%207%207-3.13%207-7%207c-1.93%200-3.68-.79-4.94-2.06l-1.42%201.42A8.954%208.954%200%200%200%2013%2021a9%209%200%200%200%200-18zm-1%205v5l4.25%202.52.77-1.28-3.52-2.09V8z'/%3e%3c/svg%3e";

const homeOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='m12%205.69%205%204.5V18h-2v-6H9v6H7v-7.81l5-4.5M12%203%202%2012h3v8h6v-6h2v6h6v-8h3L12%203z'/%3e%3c/svg%3e";

const imageOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M19%205v14H5V5h14m0-2H5c-1.1%200-2%20.9-2%202v14c0%201.1.9%202%202%202h14c1.1%200%202-.9%202-2V5c0-1.1-.9-2-2-2zm-4.86%208.86-3%203.87L9%2013.14%206%2017h12l-3.86-5.14z'/%3e%3c/svg%3e";

const infoOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M11%207h2v2h-2zm0%204h2v6h-2zm1-9C6.48%202%202%206.48%202%2012s4.48%2010%2010%2010%2010-4.48%2010-10S17.52%202%2012%202zm0%2018c-4.41%200-8-3.59-8-8s3.59-8%208-8%208%203.59%208%208-3.59%208-8%208z'/%3e%3c/svg%3e";

const keyboardOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M20%207v10H4V7h16m0-2H4c-1.1%200-1.99.9-1.99%202L2%2017c0%201.1.9%202%202%202h16c1.1%200%202-.9%202-2V7c0-1.1-.9-2-2-2zm-9%203h2v2h-2zm0%203h2v2h-2zM8%208h2v2H8zm0%203h2v2H8zm-3%200h2v2H5zm0-3h2v2H5zm3%206h8v2H8zm6-3h2v2h-2zm0-3h2v2h-2zm3%203h2v2h-2zm0-3h2v2h-2z'/%3e%3c/svg%3e";

const labelOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M17.63%205.84C17.27%205.33%2016.67%205%2016%205L5%205.01C3.9%205.01%203%205.9%203%207v10c0%201.1.9%201.99%202%201.99L16%2019c.67%200%201.27-.33%201.63-.84L22%2012l-4.37-6.16zM16%2017H5V7h11l3.55%205L16%2017z'/%3e%3c/svg%3e";

const languageOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M11.99%202C6.47%202%202%206.48%202%2012s4.47%2010%209.99%2010C17.52%2022%2022%2017.52%2022%2012S17.52%202%2011.99%202zm6.93%206h-2.95a15.65%2015.65%200%200%200-1.38-3.56A8.03%208.03%200%200%201%2018.92%208zM12%204.04c.83%201.2%201.48%202.53%201.91%203.96h-3.82c.43-1.43%201.08-2.76%201.91-3.96zM4.26%2014C4.1%2013.36%204%2012.69%204%2012s.1-1.36.26-2h3.38c-.08.66-.14%201.32-.14%202s.06%201.34.14%202H4.26zm.82%202h2.95c.32%201.25.78%202.45%201.38%203.56A7.987%207.987%200%200%201%205.08%2016zm2.95-8H5.08a7.987%207.987%200%200%201%204.33-3.56A15.65%2015.65%200%200%200%208.03%208zM12%2019.96c-.83-1.2-1.48-2.53-1.91-3.96h3.82c-.43%201.43-1.08%202.76-1.91%203.96zM14.34%2014H9.66c-.09-.66-.16-1.32-.16-2s.07-1.35.16-2h4.68c.09.65.16%201.32.16%202s-.07%201.34-.16%202zm.25%205.56c.6-1.11%201.06-2.31%201.38-3.56h2.95a8.03%208.03%200%200%201-4.33%203.56zM16.36%2014c.08-.66.14-1.32.14-2s-.06-1.34-.14-2h3.38c.16.64.26%201.31.26%202s-.1%201.36-.26%202h-3.38z'/%3e%3c/svg%3e";

const lightbulbOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M9%2021c0%20.55.45%201%201%201h4c.55%200%201-.45%201-1v-1H9v1zm3-19C8.14%202%205%205.14%205%209c0%202.38%201.19%204.47%203%205.74V17c0%20.55.45%201%201%201h6c.55%200%201-.45%201-1v-2.26c1.81-1.27%203-3.36%203-5.74%200-3.86-3.14-7-7-7zm2.85%2011.1-.85.6V16h-4v-2.3l-.85-.6A4.997%204.997%200%200%201%207%209c0-2.76%202.24-5%205-5s5%202.24%205%205c0%201.63-.8%203.16-2.15%204.1z'/%3e%3c/svg%3e";

const linkOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M17%207h-4v2h4c1.65%200%203%201.35%203%203s-1.35%203-3%203h-4v2h4c2.76%200%205-2.24%205-5s-2.24-5-5-5zm-6%208H7c-1.65%200-3-1.35-3-3s1.35-3%203-3h4V7H7c-2.76%200-5%202.24-5%205s2.24%205%205%205h4v-2zm-3-4h8v2H8z'/%3e%3c/svg%3e";

const listOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M3%2013h2v-2H3v2zm0%204h2v-2H3v2zm0-8h2V7H3v2zm4%204h14v-2H7v2zm0%204h14v-2H7v2zM7%207v2h14V7H7zm-4%206h2v-2H3v2zm0%204h2v-2H3v2zm0-8h2V7H3v2zm4%204h14v-2H7v2zm0%204h14v-2H7v2zM7%207v2h14V7H7z'/%3e%3c/svg%3e";

const liveTvOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M9%2010v8l7-4zm12-4h-7.58l3.29-3.29L16%202l-4%204h-.03l-4-4-.69.71L10.56%206H3c-1.1%200-2%20.9-2%202v12c0%201.1.9%202%202%202h18c1.1%200%202-.9%202-2V8c0-1.1-.9-2-2-2zm0%2014H3V8h18v12z'/%3e%3c/svg%3e";

const lockOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M18%208h-1V6c0-2.76-2.24-5-5-5S7%203.24%207%206v2H6c-1.1%200-2%20.9-2%202v10c0%201.1.9%202%202%202h12c1.1%200%202-.9%202-2V10c0-1.1-.9-2-2-2zM9%206c0-1.66%201.34-3%203-3s3%201.34%203%203v2H9V6zm9%2014H6V10h12v10zm-6-3c1.1%200%202-.9%202-2s-.9-2-2-2-2%20.9-2%202%20.9%202%202%202z'/%3e%3c/svg%3e";

const menuOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M3%2018h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z'/%3e%3c/svg%3e";

const menuBookOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M21%205c-1.11-.35-2.33-.5-3.5-.5-1.95%200-4.05.4-5.5%201.5-1.45-1.1-3.55-1.5-5.5-1.5S2.45%204.9%201%206v14.65c0%20.25.25.5.5.5.1%200%20.15-.05.25-.05C3.1%2020.45%205.05%2020%206.5%2020c1.95%200%204.05.4%205.5%201.5%201.35-.85%203.8-1.5%205.5-1.5%201.65%200%203.35.3%204.75%201.05.1.05.15.05.25.05.25%200%20.5-.25.5-.5V6c-.6-.45-1.25-.75-2-1zm0%2013.5c-1.1-.35-2.3-.5-3.5-.5-1.7%200-4.15.65-5.5%201.5V8c1.35-.85%203.8-1.5%205.5-1.5%201.2%200%202.4.15%203.5.5v11.5z'/%3e%3cpath%20d='M17.5%2010.5c.88%200%201.73.09%202.5.26V9.24c-.79-.15-1.64-.24-2.5-.24-1.7%200-3.24.29-4.5.83v1.66c1.13-.64%202.7-.99%204.5-.99zM13%2012.49v1.66c1.13-.64%202.7-.99%204.5-.99.88%200%201.73.09%202.5.26V11.9c-.79-.15-1.64-.24-2.5-.24-1.7%200-3.24.3-4.5.83zm4.5%201.84c-1.7%200-3.24.29-4.5.83v1.66c1.13-.64%202.7-.99%204.5-.99.88%200%201.73.09%202.5.26v-1.52c-.79-.16-1.64-.24-2.5-.24z'/%3e%3c/svg%3e";

const moreHorizOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M6%2010c-1.1%200-2%20.9-2%202s.9%202%202%202%202-.9%202-2-.9-2-2-2zm12%200c-1.1%200-2%20.9-2%202s.9%202%202%202%202-.9%202-2-.9-2-2-2zm-6%200c-1.1%200-2%20.9-2%202s.9%202%202%202%202-.9%202-2-.9-2-2-2z'/%3e%3c/svg%3e";

const moreVertOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M12%208c1.1%200%202-.9%202-2s-.9-2-2-2-2%20.9-2%202%20.9%202%202%202zm0%202c-1.1%200-2%20.9-2%202s.9%202%202%202%202-.9%202-2-.9-2-2-2zm0%206c-1.1%200-2%20.9-2%202s.9%202%202%202%202-.9%202-2-.9-2-2-2z'/%3e%3c/svg%3e";

const movieOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M4%206.47%205.76%2010H20v8H4V6.47M22%204h-4l2%204h-3l-2-4h-2l2%204h-3l-2-4H8l2%204H7L5%204H4c-1.1%200-1.99.9-1.99%202L2%2018c0%201.1.9%202%202%202h16c1.1%200%202-.9%202-2V4z'/%3e%3c/svg%3e";

const movieCreationOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M5.76%2010H20v8H4V6.47M22%204h-4l2%204h-3l-2-4h-2l2%204h-3l-2-4H8l2%204H7L5%204H4c-1.1%200-2%20.9-2%202v12c0%201.1.9%202%202%202h16c1.1%200%202-.9%202-2V4z'/%3e%3c/svg%3e";

const navigateBeforeOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M15.61%207.41%2014.2%206l-6%206%206%206%201.41-1.41L11.03%2012l4.58-4.59z'/%3e%3c/svg%3e";

const navigateNextOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M10.02%206%208.61%207.41%2013.19%2012l-4.58%204.59L10.02%2018l6-6-6-6z'/%3e%3c/svg%3e";

const newReleasesOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='m23%2012-2.44-2.78.34-3.68-3.61-.82-1.89-3.18L12%203%208.6%201.54%206.71%204.72l-3.61.81.34%203.68L1%2012l2.44%202.78-.34%203.69%203.61.82%201.89%203.18L12%2021l3.4%201.46%201.89-3.18%203.61-.82-.34-3.68L23%2012zm-4.51%202.11.26%202.79-2.74.62-1.43%202.41L12%2018.82l-2.58%201.11-1.43-2.41-2.74-.62.26-2.8L3.66%2012l1.85-2.12-.26-2.78%202.74-.61%201.43-2.41L12%205.18l2.58-1.11%201.43%202.41%202.74.62-.26%202.79L20.34%2012l-1.85%202.11zM11%2015h2v2h-2zm0-8h2v6h-2z'/%3e%3c/svg%3e";

const noteOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M16%204H4c-1.1%200-2%20.9-2%202v12.01c0%201.1.9%201.99%202%201.99h16c1.1%200%202-.9%202-2v-8l-6-6zM4%2018.01V6h11v5h5v7.01H4z'/%3e%3c/svg%3e";

const notificationImportantOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M10.01%2021.01c0%201.1.89%201.99%201.99%201.99s1.99-.89%201.99-1.99h-3.98zM12%206c2.76%200%205%202.24%205%205v7H7v-7c0-2.76%202.24-5%205-5zm0-4.5c-.83%200-1.5.67-1.5%201.5v1.17C7.36%204.85%205%207.65%205%2011v6l-2%202v1h18v-1l-2-2v-6c0-3.35-2.36-6.15-5.5-6.83V3c0-.83-.67-1.5-1.5-1.5zM11%208h2v4h-2zm0%206h2v2h-2z'/%3e%3c/svg%3e";

const notificationsOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M12%2022c1.1%200%202-.9%202-2h-4c0%201.1.9%202%202%202zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5%201.5v.68C7.64%205.36%206%207.92%206%2011v5l-2%202v1h16v-1l-2-2zm-2%201H8v-6c0-2.48%201.51-4.5%204-4.5s4%202.02%204%204.5v6z'/%3e%3c/svg%3e";

const paletteOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M12%2022C6.49%2022%202%2017.51%202%2012S6.49%202%2012%202s10%204.04%2010%209c0%203.31-2.69%206-6%206h-1.77c-.28%200-.5.22-.5.5%200%20.12.05.23.13.33.41.47.64%201.06.64%201.67A2.5%202.5%200%200%201%2012%2022zm0-18c-4.41%200-8%203.59-8%208s3.59%208%208%208c.28%200%20.5-.22.5-.5a.54.54%200%200%200-.14-.35c-.41-.46-.63-1.05-.63-1.65a2.5%202.5%200%200%201%202.5-2.5H16c2.21%200%204-1.79%204-4%200-3.86-3.59-7-8-7z'/%3e%3ccircle%20cx='6.5'%20cy='11.5'%20r='1.5'/%3e%3ccircle%20cx='9.5'%20cy='7.5'%20r='1.5'/%3e%3ccircle%20cx='14.5'%20cy='7.5'%20r='1.5'/%3e%3ccircle%20cx='17.5'%20cy='11.5'%20r='1.5'/%3e%3c/svg%3e";

const pauseOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M6%2019h4V5H6v14zm8-14v14h4V5h-4z'/%3e%3c/svg%3e";

const personOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M12%206c1.1%200%202%20.9%202%202s-.9%202-2%202-2-.9-2-2%20.9-2%202-2m0%2010c2.7%200%205.8%201.29%206%202H6c.23-.72%203.31-2%206-2m0-12C9.79%204%208%205.79%208%208s1.79%204%204%204%204-1.79%204-4-1.79-4-4-4zm0%2010c-2.67%200-8%201.34-8%204v2h16v-2c0-2.66-5.33-4-8-4z'/%3e%3c/svg%3e";

const playArrowOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M10%208.64%2015.27%2012%2010%2015.36V8.64M8%205v14l11-7L8%205z'/%3e%3c/svg%3e";

const playCircleOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M12%202C6.48%202%202%206.48%202%2012s4.48%2010%2010%2010%2010-4.48%2010-10S17.52%202%2012%202zm0%2018c-4.41%200-8-3.59-8-8s3.59-8%208-8%208%203.59%208%208-3.59%208-8%208zm-2.5-3.5%207-4.5-7-4.5v9z'/%3e%3c/svg%3e";

const playlistAddOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M14%2010H3v2h11v-2zm0-4H3v2h11V6zm4%208v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zM3%2016h7v-2H3v2z'/%3e%3c/svg%3e";

const playlistAddCircleOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M12%202C6.48%202%202%206.48%202%2012s4.48%2010%2010%2010%2010-4.48%2010-10S17.52%202%2012%202zm0%2018c-4.41%200-8-3.59-8-8s3.59-8%208-8%208%203.59%208%208-3.59%208-8%208zm2-10H7v2h7v-2zm0-3H7v2h7V7zm-7%208h3v-2H7v2zm12-2v2h-2v2h-2v-2h-2v-2h2v-2h2v2h2z'/%3e%3c/svg%3e";

const publicOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M12%202C6.48%202%202%206.48%202%2012s4.48%2010%2010%2010%2010-4.48%2010-10S17.52%202%2012%202zM4%2012c0-.61.08-1.21.21-1.78L8.99%2015v1c0%201.1.9%202%202%202v1.93C7.06%2019.43%204%2016.07%204%2012zm13.89%205.4c-.26-.81-1-1.4-1.9-1.4h-1v-3c0-.55-.45-1-1-1h-6v-2h2c.55%200%201-.45%201-1V7h2c1.1%200%202-.9%202-2v-.41C17.92%205.77%2020%208.65%2020%2012c0%202.08-.81%203.98-2.11%205.4z'/%3e%3c/svg%3e";

const publishOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M5%204h14v2H5zm0%2010h4v6h6v-6h4l-7-7-7%207zm8-2v6h-2v-6H9.83L12%209.83%2014.17%2012H13z'/%3e%3c/svg%3e";

const pushPinOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M14%204v5c0%201.12.37%202.16%201%203H9c.65-.86%201-1.9%201-3V4h4m3-2H7c-.55%200-1%20.45-1%201s.45%201%201%201h1v5c0%201.66-1.34%203-3%203v2h5.97v7l1%201%201-1v-7H19v-2c-1.66%200-3-1.34-3-3V4h1c.55%200%201-.45%201-1s-.45-1-1-1z'/%3e%3c/svg%3e";

const radioButtonUncheckedOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M12%202C6.48%202%202%206.48%202%2012s4.48%2010%2010%2010%2010-4.48%2010-10S17.52%202%2012%202zm0%2018c-4.42%200-8-3.58-8-8s3.58-8%208-8%208%203.58%208%208-3.58%208-8%208z'/%3e%3c/svg%3e";

const refreshOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M17.65%206.35A7.958%207.958%200%200%200%2012%204c-4.42%200-7.99%203.58-7.99%208s3.57%208%207.99%208c3.73%200%206.84-2.55%207.73-6h-2.08A5.99%205.99%200%200%201%2012%2018c-3.31%200-6-2.69-6-6s2.69-6%206-6c1.66%200%203.14.69%204.22%201.78L13%2011h7V4l-2.35%202.35z'/%3e%3c/svg%3e";

const repeatOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M7%207h10v3l4-4-4-4v3H5v6h2V7zm10%2010H7v-3l-4%204%204%204v-3h12v-6h-2v4z'/%3e%3c/svg%3e";

const replay10OutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M11.99%205V1l-5%205%205%205V7c3.31%200%206%202.69%206%206s-2.69%206-6%206-6-2.69-6-6h-2c0%204.42%203.58%208%208%208s8-3.58%208-8-3.58-8-8-8zm-1.1%2011h-.85v-3.26l-1.01.31v-.69l1.77-.63h.09V16zm4.28-1.76c0%20.32-.03.6-.1.82s-.17.42-.29.57-.28.26-.45.33-.37.1-.59.1-.41-.03-.59-.1-.33-.18-.46-.33-.23-.34-.3-.57-.11-.5-.11-.82v-.74c0-.32.03-.6.1-.82s.17-.42.29-.57.28-.26.45-.33.37-.1.59-.1.41.03.59.1.33.18.46.33.23.34.3.57.11.5.11.82v.74zm-.85-.86c0-.19-.01-.35-.04-.48s-.07-.23-.12-.31-.11-.14-.19-.17-.16-.05-.25-.05-.18.02-.25.05-.14.09-.19.17-.09.18-.12.31-.04.29-.04.48v.97c0%20.19.01.35.04.48s.07.24.12.32.11.14.19.17.16.05.25.05.18-.02.25-.05.14-.09.19-.17.09-.19.11-.32.04-.29.04-.48v-.97z'/%3e%3c/svg%3e";

const rocketLaunchOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M6%2015c-.83%200-1.58.34-2.12.88C2.7%2017.06%202%2022%202%2022s4.94-.7%206.12-1.88A2.996%202.996%200%200%200%206%2015zm.71%203.71c-.28.28-2.17.76-2.17.76s.47-1.88.76-2.17c.17-.19.42-.3.7-.3a1.003%201.003%200%200%201%20.71%201.71zm10.71-5.06c6.36-6.36%204.24-11.31%204.24-11.31S16.71.22%2010.35%206.58l-2.49-.5a2.03%202.03%200%200%200-1.81.55L2%2010.69l5%202.14L11.17%2017l2.14%205%204.05-4.05c.47-.47.68-1.15.55-1.81l-.49-2.49zM7.41%2010.83l-1.91-.82%201.97-1.97%201.44.29c-.57.83-1.08%201.7-1.5%202.5zm6.58%207.67-.82-1.91c.8-.42%201.67-.93%202.49-1.5l.29%201.44-1.96%201.97zM16%2012.24c-1.32%201.32-3.38%202.4-4.04%202.73l-2.93-2.93c.32-.65%201.4-2.71%202.73-4.04%204.68-4.68%208.23-3.99%208.23-3.99s.69%203.55-3.99%208.23zM15%2011c1.1%200%202-.9%202-2s-.9-2-2-2-2%20.9-2%202%20.9%202%202%202z'/%3e%3c/svg%3e";

const saveOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M17%203H5a2%202%200%200%200-2%202v14a2%202%200%200%200%202%202h14c1.1%200%202-.9%202-2V7l-4-4zm2%2016H5V5h11.17L19%207.83V19zm-7-7c-1.66%200-3%201.34-3%203s1.34%203%203%203%203-1.34%203-3-1.34-3-3-3zM6%206h9v4H6z'/%3e%3c/svg%3e";

const scheduleOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M11.99%202C6.47%202%202%206.48%202%2012s4.47%2010%209.99%2010C17.52%2022%2022%2017.52%2022%2012S17.52%202%2011.99%202zM12%2020c-4.42%200-8-3.58-8-8s3.58-8%208-8%208%203.58%208%208-3.58%208-8%208zm.5-13H11v6l5.25%203.15.75-1.23-4.5-2.67z'/%3e%3c/svg%3e";

const scienceOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M13%2011.33%2018%2018H6l5-6.67V6h2m2.96-2H8.04c-.42%200-.65.48-.39.81L9%206.5v4.17L3.2%2018.4c-.49.66-.02%201.6.8%201.6h16c.82%200%201.29-.94.8-1.6L15%2010.67V6.5l1.35-1.69c.26-.33.03-.81-.39-.81z'/%3e%3c/svg%3e";

const searchOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M15.5%2014h-.79l-.28-.27A6.471%206.471%200%200%200%2016%209.5%206.5%206.5%200%201%200%209.5%2016c1.61%200%203.09-.59%204.23-1.57l.27.28v.79l5%204.99L20.49%2019l-4.99-5zm-6%200C7.01%2014%205%2011.99%205%209.5S7.01%205%209.5%205%2014%207.01%2014%209.5%2011.99%2014%209.5%2014z'/%3e%3c/svg%3e";

const settingsOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M19.43%2012.98c.04-.32.07-.64.07-.98%200-.34-.03-.66-.07-.98l2.11-1.65c.19-.15.24-.42.12-.64l-2-3.46a.5.5%200%200%200-.61-.22l-2.49%201c-.52-.4-1.08-.73-1.69-.98l-.38-2.65A.488.488%200%200%200%2014%202h-4c-.25%200-.46.18-.49.42l-.38%202.65c-.61.25-1.17.59-1.69.98l-2.49-1a.566.566%200%200%200-.18-.03c-.17%200-.34.09-.43.25l-2%203.46c-.13.22-.07.49.12.64l2.11%201.65c-.04.32-.07.65-.07.98%200%20.33.03.66.07.98l-2.11%201.65c-.19.15-.24.42-.12.64l2%203.46a.5.5%200%200%200%20.61.22l2.49-1c.52.4%201.08.73%201.69.98l.38%202.65c.03.24.24.42.49.42h4c.25%200%20.46-.18.49-.42l.38-2.65c.61-.25%201.17-.59%201.69-.98l2.49%201c.06.02.12.03.18.03.17%200%20.34-.09.43-.25l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.65zm-1.98-1.71c.04.31.05.52.05.73%200%20.21-.02.43-.05.73l-.14%201.13.89.7%201.08.84-.7%201.21-1.27-.51-1.04-.42-.9.68c-.43.32-.84.56-1.25.73l-1.06.43-.16%201.13-.2%201.35h-1.4l-.19-1.35-.16-1.13-1.06-.43c-.43-.18-.83-.41-1.23-.71l-.91-.7-1.06.43-1.27.51-.7-1.21%201.08-.84.89-.7-.14-1.13c-.03-.31-.05-.54-.05-.74s.02-.43.05-.73l.14-1.13-.89-.7-1.08-.84.7-1.21%201.27.51%201.04.42.9-.68c.43-.32.84-.56%201.25-.73l1.06-.43.16-1.13.2-1.35h1.39l.19%201.35.16%201.13%201.06.43c.43.18.83.41%201.23.71l.91.7%201.06-.43%201.27-.51.7%201.21-1.07.85-.89.7.14%201.13zM12%208c-2.21%200-4%201.79-4%204s1.79%204%204%204%204-1.79%204-4-1.79-4-4-4zm0%206c-1.1%200-2-.9-2-2s.9-2%202-2%202%20.9%202%202-.9%202-2%202z'/%3e%3c/svg%3e";

const shareOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M18%2016.08c-.76%200-1.44.3-1.96.77L8.91%2012.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5%201.25.81%202.04.81%201.66%200%203-1.34%203-3s-1.34-3-3-3-3%201.34-3%203c0%20.24.04.47.09.7L8.04%209.81C7.5%209.31%206.79%209%206%209c-1.66%200-3%201.34-3%203s1.34%203%203%203c.79%200%201.5-.31%202.04-.81l7.12%204.16c-.05.21-.08.43-.08.65%200%201.61%201.31%202.92%202.92%202.92s2.92-1.31%202.92-2.92c0-1.61-1.31-2.92-2.92-2.92zM18%204c.55%200%201%20.45%201%201s-.45%201-1%201-1-.45-1-1%20.45-1%201-1zM6%2013c-.55%200-1-.45-1-1s.45-1%201-1%201%20.45%201%201-.45%201-1%201zm12%207.02c-.55%200-1-.45-1-1s.45-1%201-1%201%20.45%201%201-.45%201-1%201z'/%3e%3c/svg%3e";

const skipNextOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='m6%2018%208.5-6L6%206v12zm2-8.14L11.03%2012%208%2014.14V9.86zM16%206h2v12h-2z'/%3e%3c/svg%3e";

const skipPreviousOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M6%206h2v12H6zm3.5%206%208.5%206V6l-8.5%206zm6.5%202.14L12.97%2012%2016%209.86v4.28z'/%3e%3c/svg%3e";

const speedOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='m20.38%208.57-1.23%201.85a8%208%200%200%201-.22%207.58H5.07A8%208%200%200%201%2015.58%206.85l1.85-1.23A10%2010%200%200%200%203.35%2019a2%202%200%200%200%201.72%201h13.85a2%202%200%200%200%201.74-1%2010%2010%200%200%200-.27-10.44z'/%3e%3cpath%20d='M10.59%2015.41a2%202%200%200%200%202.83%200l5.66-8.49-8.49%205.66a2%202%200%200%200%200%202.83z'/%3e%3c/svg%3e";

const sportsEsportsOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='m21.58%2016.09-1.09-7.66A3.996%203.996%200%200%200%2016.53%205H7.47C5.48%205%203.79%206.46%203.51%208.43l-1.09%207.66a2.545%202.545%200%200%200%204.32%202.16L9%2016h6l2.25%202.25c.48.48%201.13.75%201.8.75%201.56%200%202.75-1.37%202.53-2.91zm-2.1.72a.54.54%200%200%201-.42.19c-.15%200-.29-.06-.39-.16L15.83%2014H8.17l-2.84%202.84c-.1.1-.24.16-.39.16a.54.54%200%200%201-.42-.19.52.52%200%200%201-.13-.44l1.09-7.66C5.63%207.74%206.48%207%207.47%207h9.06c.99%200%201.84.74%201.98%201.72l1.09%207.66c.03.2-.05.34-.12.43z'/%3e%3cpath%20d='M9%208H8v2H6v1h2v2h1v-2h2v-1H9z'/%3e%3ccircle%20cx='17'%20cy='12'%20r='1'/%3e%3ccircle%20cx='15'%20cy='9'%20r='1'/%3e%3c/svg%3e";

const starOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M12%2017.27%2018.18%2021l-1.64-7.03L22%209.24l-7.19-.61L12%202%209.19%208.63%202%209.24l5.46%204.73L5.82%2021%2012%2017.27z'/%3e%3c/svg%3e";

const stopOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M16%208v8H8V8h8m2-2H6v12h12V6z'/%3e%3c/svg%3e";

const storageOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M2%2020h20v-4H2v4zm2-3h2v2H4v-2zM2%204v4h20V4H2zm4%203H4V5h2v2zm-4%207h20v-4H2v4zm2-3h2v2H4v-2z'/%3e%3c/svg%3e";

const tabOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M21%203H3c-1.1%200-2%20.9-2%202v14c0%201.1.9%202%202%202h18c1.1%200%202-.9%202-2V5c0-1.1-.9-2-2-2zm0%2016H3V5h10v4h8v10z'/%3e%3c/svg%3e";

const textFieldsOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M2.5%204v3h5v12h3V7h5V4h-13zm19%205h-9v3h3v7h3v-7h3V9z'/%3e%3c/svg%3e";

const thumbUpOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M9%2021h9c.83%200%201.54-.5%201.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17%201%207.58%207.59C7.22%207.95%207%208.45%207%209v10c0%201.1.9%202%202%202zM9%209l4.34-4.34L12%2010h9v2l-3%207H9V9zM1%209h4v12H1z'/%3e%3c/svg%3e";

const timerOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M15%201H9v2h6V1zm-4%2013h2V8h-2v6zm8.03-6.61%201.42-1.42c-.43-.51-.9-.99-1.41-1.41l-1.42%201.42A8.962%208.962%200%200%200%2012%204c-4.97%200-9%204.03-9%209s4.02%209%209%209a8.994%208.994%200%200%200%207.03-14.61zM12%2020c-3.87%200-7-3.13-7-7s3.13-7%207-7%207%203.13%207%207-3.13%207-7%207z'/%3e%3c/svg%3e";

const titleOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M5%204v3h5.5v12h3V7H19V4H5z'/%3e%3c/svg%3e";

const trendingUpOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='m16%206%202.29%202.29-4.88%204.88-4-4L2%2016.59%203.41%2018l6-6%204%204%206.3-6.29L22%2012V6h-6z'/%3e%3c/svg%3e";

const tvOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M21%203H3c-1.1%200-2%20.9-2%202v12c0%201.1.9%202%202%202h5v2h8v-2h5c1.1%200%201.99-.9%201.99-2L23%205c0-1.1-.9-2-2-2zm0%2014H3V5h18v12z'/%3e%3c/svg%3e";

const updateOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M11%208v5l4.25%202.52.77-1.28-3.52-2.09V8H11zm10%202V3l-2.64%202.64A8.937%208.937%200%200%200%2012%203a9%209%200%201%200%209%209h-2c0%203.86-3.14%207-7%207s-7-3.14-7-7%203.14-7%207-7c1.93%200%203.68.79%204.95%202.05L14%2010h7z'/%3e%3c/svg%3e";

const upgradeOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M16%2018v2H8v-2h8zM11%207.99V16h2V7.99h3L12%204%208%207.99h3z'/%3e%3c/svg%3e";

const uploadOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M9%2016h6v-6h4l-7-7-7%207h4v6zm3-10.17L14.17%208H13v6h-2V8H9.83L12%205.83zM5%2018h14v2H5z'/%3e%3c/svg%3e";

const videoLibraryOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M4%206H2v14c0%201.1.9%202%202%202h14v-2H4V6zm16-4H8c-1.1%200-2%20.9-2%202v12c0%201.1.9%202%202%202h12c1.1%200%202-.9%202-2V4c0-1.1-.9-2-2-2zm0%2014H8V4h12v12zM12%205.5v9l6-4.5z'/%3e%3c/svg%3e";

const videocamOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M15%208v8H5V8h10m1-2H4c-.55%200-1%20.45-1%201v10c0%20.55.45%201%201%201h12c.55%200%201-.45%201-1v-3.5l4%204v-11l-4%204V7c0-.55-.45-1-1-1z'/%3e%3c/svg%3e";

const visibilityOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M12%206a9.77%209.77%200%200%201%208.82%205.5C19.17%2014.87%2015.79%2017%2012%2017s-7.17-2.13-8.82-5.5A9.77%209.77%200%200%201%2012%206m0-2C7%204%202.73%207.11%201%2011.5%202.73%2015.89%207%2019%2012%2019s9.27-3.11%2011-7.5C21.27%207.11%2017%204%2012%204zm0%205a2.5%202.5%200%200%201%200%205%202.5%202.5%200%200%201%200-5m0-2c-2.48%200-4.5%202.02-4.5%204.5S9.52%2016%2012%2016s4.5-2.02%204.5-4.5S14.48%207%2012%207z'/%3e%3c/svg%3e";

const visibilityOffOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M12%206a9.77%209.77%200%200%201%208.82%205.5%209.647%209.647%200%200%201-2.41%203.12l1.41%201.41c1.39-1.23%202.49-2.77%203.18-4.53C21.27%207.11%2017%204%2012%204c-1.27%200-2.49.2-3.64.57l1.65%201.65C10.66%206.09%2011.32%206%2012%206zm-1.07%201.14L13%209.21c.57.25%201.03.71%201.28%201.28l2.07%202.07c.08-.34.14-.7.14-1.07C16.5%209.01%2014.48%207%2012%207c-.37%200-.72.05-1.07.14zM2.01%203.87l2.68%202.68A11.738%2011.738%200%200%200%201%2011.5C2.73%2015.89%207%2019%2012%2019c1.52%200%202.98-.29%204.32-.82l3.42%203.42%201.41-1.41L3.42%202.45%202.01%203.87zm7.5%207.5%202.61%202.61c-.04.01-.08.02-.12.02a2.5%202.5%200%200%201-2.5-2.5c0-.05.01-.08.01-.13zm-3.4-3.4%201.75%201.75a4.6%204.6%200%200%200-.36%201.78%204.507%204.507%200%200%200%206.27%204.14l.98.98c-.88.24-1.8.38-2.75.38a9.77%209.77%200%200%201-8.82-5.5c.7-1.43%201.72-2.61%202.93-3.53z'/%3e%3c/svg%3e";

const volumeDownOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M16%207.97v8.05c1.48-.73%202.5-2.25%202.5-4.02A4.5%204.5%200%200%200%2016%207.97zM5%209v6h4l5%205V4L9%209H5zm7-.17v6.34L9.83%2013H7v-2h2.83L12%208.83z'/%3e%3c/svg%3e";

const volumeOffOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M4.34%202.93%202.93%204.34%207.29%208.7%207%209H3v6h4l5%205v-6.59l4.18%204.18c-.65.49-1.38.88-2.18%201.11v2.06a8.94%208.94%200%200%200%203.61-1.75l2.05%202.05%201.41-1.41L4.34%202.93zM10%2015.17%207.83%2013H5v-2h2.83l.88-.88L10%2011.41v3.76zM19%2012c0%20.82-.15%201.61-.41%202.34l1.53%201.53c.56-1.17.88-2.48.88-3.87%200-4.28-2.99-7.86-7-8.77v2.06c2.89.86%205%203.54%205%206.71zm-7-8-1.88%201.88L12%207.76zm4.5%208A4.5%204.5%200%200%200%2014%207.97v1.79l2.48%202.48c.01-.08.02-.16.02-.24z'/%3e%3c/svg%3e";

const volumeUpOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M3%209v6h4l5%205V4L7%209H3zm7-.17v6.34L7.83%2013H5v-2h2.83L10%208.83zM16.5%2012A4.5%204.5%200%200%200%2014%207.97v8.05c1.48-.73%202.5-2.25%202.5-4.02zM14%203.23v2.06c2.89.86%205%203.54%205%206.71s-2.11%205.85-5%206.71v2.06c4.01-.91%207-4.49%207-8.77%200-4.28-2.99-7.86-7-8.77z'/%3e%3c/svg%3e";

const warningAmberOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M12%205.99%2019.53%2019H4.47L12%205.99M12%202%201%2021h22L12%202zm1%2014h-2v2h2v-2zm0-6h-2v4h2v-4z'/%3e%3c/svg%3e";

const whatshotOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M11.57%2013.16c-1.36.28-2.17%201.16-2.17%202.41%200%201.34%201.11%202.42%202.49%202.42%202.05%200%203.71-1.66%203.71-3.71%200-1.07-.15-2.12-.46-3.12-.79%201.07-2.2%201.72-3.57%202zM13.5.67s.74%202.65.74%204.8c0%202.06-1.35%203.73-3.41%203.73-2.07%200-3.63-1.67-3.63-3.73l.03-.36C5.21%207.51%204%2010.62%204%2014c0%204.42%203.58%208%208%208s8-3.58%208-8C20%208.61%2017.41%203.8%2013.5.67zM12%2020c-3.31%200-6-2.69-6-6%200-1.53.3-3.04.86-4.43a5.582%205.582%200%200%200%203.97%201.63c2.66%200%204.75-1.83%205.28-4.43A14.77%2014.77%200%200%201%2018%2014c0%203.31-2.69%206-6%206z'/%3e%3c/svg%3e";

const checkCircleFilledIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M12%202C6.48%202%202%206.48%202%2012s4.48%2010%2010%2010%2010-4.48%2010-10S17.52%202%2012%202zm-2%2015-5-5%201.41-1.41L10%2014.17l7.59-7.59L19%208l-9%209z'/%3e%3c/svg%3e";

const refreshFilledIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M17.65%206.35A7.958%207.958%200%200%200%2012%204c-4.42%200-7.99%203.58-7.99%208s3.57%208%207.99%208c3.73%200%206.84-2.55%207.73-6h-2.08A5.99%205.99%200%200%201%2012%2018c-3.31%200-6-2.69-6-6s2.69-6%206-6c1.66%200%203.14.69%204.22%201.78L13%2011h7V4l-2.35%202.35z'/%3e%3c/svg%3e";

const outlinedIconMap = {
  "add": addOutlinedIcon,
  "analytics": analyticsOutlinedIcon,
  "arrow_downward": arrowDownwardOutlinedIcon,
  "arrow_upward": arrowUpwardOutlinedIcon,
  "assignment": assignmentOutlinedIcon,
  "audiotrack": audiotrackOutlinedIcon,
  "backup": backupOutlinedIcon,
  "bar_chart": barChartOutlinedIcon,
  "block": blockOutlinedIcon,
  "bookmark": bookmarkOutlinedIcon,
  "bug_report": bugReportOutlinedIcon,
  "build": buildOutlinedIcon,
  "card_giftcard": cardGiftcardOutlinedIcon,
  "check": checkOutlinedIcon,
  "check_box": checkBoxOutlinedIcon,
  "check_box_outline_blank": checkBoxOutlineBlankOutlinedIcon,
  "check_circle": checkCircleOutlinedIcon,
  "clear": clearOutlinedIcon,
  "clear_all": clearAllOutlinedIcon,
  "close": closeOutlinedIcon,
  "cloud": cloudOutlinedIcon,
  "cloud_download": cloudDownloadOutlinedIcon,
  "cloud_upload": cloudUploadOutlinedIcon,
  "color_lens": colorLensOutlinedIcon,
  "comment": commentOutlinedIcon,
  "content_copy": contentCopyOutlinedIcon,
  "dashboard": dashboardOutlinedIcon,
  "delete": deleteOutlinedIcon,
  "delete_forever": deleteForeverOutlinedIcon,
  "delete_outline": deleteOutlineOutlinedIcon,
  "delete_sweep": deleteSweepOutlinedIcon,
  "download": downloadOutlinedIcon,
  "drive_file_move": driveFileMoveOutlinedIcon,
  "edit": editOutlinedIcon,
  "error": errorOutlinedIcon,
  "expand_less": expandLessOutlinedIcon,
  "expand_more": expandMoreOutlinedIcon,
  "fast_forward": fastForwardOutlinedIcon,
  "fast_rewind": fastRewindOutlinedIcon,
  "favorite": favoriteOutlinedIcon,
  "file_download": fileDownloadOutlinedIcon,
  "file_upload": fileUploadOutlinedIcon,
  "filter_list": filterListOutlinedIcon,
  "first_page": firstPageOutlinedIcon,
  "flash_on": flashOnOutlinedIcon,
  "folder": folderOutlinedIcon,
  "folder_open": folderOpenOutlinedIcon,
  "forward_10": forward10OutlinedIcon,
  "fullscreen": fullscreenOutlinedIcon,
  "fullscreen_exit": fullscreenExitOutlinedIcon,
  "gps_fixed": gpsFixedOutlinedIcon,
  "help": helpOutlinedIcon,
  "history": historyOutlinedIcon,
  "home": homeOutlinedIcon,
  "image": imageOutlinedIcon,
  "info": infoOutlinedIcon,
  "keyboard": keyboardOutlinedIcon,
  "label": labelOutlinedIcon,
  "language": languageOutlinedIcon,
  "lightbulb": lightbulbOutlinedIcon,
  "link": linkOutlinedIcon,
  "list": listOutlinedIcon,
  "live_tv": liveTvOutlinedIcon,
  "lock": lockOutlinedIcon,
  "menu": menuOutlinedIcon,
  "menu_book": menuBookOutlinedIcon,
  "more_horiz": moreHorizOutlinedIcon,
  "more_vert": moreVertOutlinedIcon,
  "movie": movieOutlinedIcon,
  "movie_creation": movieCreationOutlinedIcon,
  "navigate_before": navigateBeforeOutlinedIcon,
  "navigate_next": navigateNextOutlinedIcon,
  "new_releases": newReleasesOutlinedIcon,
  "note": noteOutlinedIcon,
  "notification_important": notificationImportantOutlinedIcon,
  "notifications": notificationsOutlinedIcon,
  "palette": paletteOutlinedIcon,
  "pause": pauseOutlinedIcon,
  "person": personOutlinedIcon,
  "play_arrow": playArrowOutlinedIcon,
  "play_circle": playCircleOutlinedIcon,
  "playlist_add": playlistAddOutlinedIcon,
  "playlist_add_circle": playlistAddCircleOutlinedIcon,
  "public": publicOutlinedIcon,
  "publish": publishOutlinedIcon,
  "push_pin": pushPinOutlinedIcon,
  "radio_button_unchecked": radioButtonUncheckedOutlinedIcon,
  "refresh": refreshOutlinedIcon,
  "repeat": repeatOutlinedIcon,
  "replay_10": replay10OutlinedIcon,
  "rocket_launch": rocketLaunchOutlinedIcon,
  "save": saveOutlinedIcon,
  "schedule": scheduleOutlinedIcon,
  "science": scienceOutlinedIcon,
  "search": searchOutlinedIcon,
  "settings": settingsOutlinedIcon,
  "share": shareOutlinedIcon,
  "skip_next": skipNextOutlinedIcon,
  "skip_previous": skipPreviousOutlinedIcon,
  "speed": speedOutlinedIcon,
  "sports_esports": sportsEsportsOutlinedIcon,
  "star": starOutlinedIcon,
  "stop": stopOutlinedIcon,
  "storage": storageOutlinedIcon,
  "tab": tabOutlinedIcon,
  "text_fields": textFieldsOutlinedIcon,
  "thumb_up": thumbUpOutlinedIcon,
  "timer": timerOutlinedIcon,
  "title": titleOutlinedIcon,
  "trending_up": trendingUpOutlinedIcon,
  "tv": tvOutlinedIcon,
  "update": updateOutlinedIcon,
  "upgrade": upgradeOutlinedIcon,
  "upload": uploadOutlinedIcon,
  "video_library": videoLibraryOutlinedIcon,
  "videocam": videocamOutlinedIcon,
  "visibility": visibilityOutlinedIcon,
  "visibility_off": visibilityOffOutlinedIcon,
  "volume_down": volumeDownOutlinedIcon,
  "volume_off": volumeOffOutlinedIcon,
  "volume_up": volumeUpOutlinedIcon,
  "warning_amber": warningAmberOutlinedIcon,
  "whatshot": whatshotOutlinedIcon
};
const filledIconMap = {
  "check_circle": checkCircleFilledIcon,
  "refresh": refreshFilledIcon
};

const ICONS = {
  clear: "clear_all",
  play: "play_arrow",
  search: "search",
  home: "home",
  bookmark: "bookmark",
  live_tv: "live_tv",
  image: "image",
  tv: "tv"};
const iconSourceMap = {
  filled: filledIconMap,
  outlined: outlinedIconMap,
  round: {},
  sharp: {},
  "two-tone": {}
};
function getIconPath(iconName, style = "outlined") {
  const normalizedStyle = iconSourceMap[style] ? style : "outlined";
  const primaryMap = iconSourceMap[normalizedStyle] ?? iconSourceMap.outlined;
  const iconUrl = primaryMap[iconName] ?? iconSourceMap.outlined[iconName];
  if (!iconUrl) {
    if (typeof console !== "undefined") {
      console.warn(`[material-icons] アイコンが見つかりません: ${style}/${iconName}`);
    }
    return "";
  }
  return iconUrl;
}
function getColorClass(color) {
  const colorMap = {
    white: "icon-white",
    green: "icon-green",
    red: "icon-red",
    dark: "icon-dark",
    default: "icon-outlined"
  };
  return colorMap[color] || colorMap.default;
}
function getSizeClass(size) {
  if (typeof size === "number") {
    return "";
  }
  const sizeClassMap = {
    small: "material-icon-small",
    medium: "",
    large: "material-icon-large"
  };
  return sizeClassMap[size] || "";
}
function createMaterialIcon(iconName, options = {}) {
  const {
    style = "outlined",
    size = "medium",
    color = "default",
    classes = "",
    alt = iconName,
    loading = "lazy"
  } = options;
  const iconPath = getIconPath(iconName, style);
  const colorClass = getColorClass(color);
  const sizeClass = getSizeClass(size);
  const allClasses = ["material-icon", colorClass, sizeClass, classes].filter(Boolean).join(" ");
  const styleAttr = typeof size === "number" ? ` style="width: ${size}px; height: ${size}px;"` : "";
  if (!iconPath) {
    return `<span class="${allClasses} material-icon-missing" role="presentation"${styleAttr}></span>`;
  }
  return `<img class="${allClasses}" src="${iconPath}" alt="${alt}" loading="${loading}"${styleAttr} />`;
}
const materialIconsStyles = `
  /* マテリアルアイコン基本設定 */
  .material-icon {
    display: inline-block;
    width: var(--icon-size-medium, 20px);
    height: var(--icon-size-medium, 20px);
    background-size: contain;
    background-repeat: no-repeat;
    background-position: center;
    vertical-align: middle;
    pointer-events: none; /* ボタン内でのクリックイベント伌のため */
  }

  .material-icon-small {
    width: var(--icon-size-small, 16px);
    height: var(--icon-size-small, 16px);
  }

  .material-icon-large {
    width: var(--icon-size-large, 24px);
    height: var(--icon-size-large, 24px);
  }

  /* 色設定用CSSフィルタ（黒塗りアイコンの色変換用） */
  .icon-white {
    filter: brightness(0) saturate(100%) invert(100%);
  }

  .icon-green {
    filter: brightness(0) saturate(100%) invert(64%) sepia(88%) saturate(3583%) hue-rotate(87deg) brightness(118%) contrast(119%);
  }

  .icon-red {
    filter: brightness(0) saturate(100%) invert(27%) sepia(51%) saturate(2878%) hue-rotate(346deg) brightness(104%) contrast(97%);
  }

  .icon-dark {
    filter: brightness(0) saturate(100%) invert(20%) sepia(8%) saturate(7%) hue-rotate(314deg) brightness(96%) contrast(93%);
  }

  /* 基本カラー（outlined版での白色設定） */
  .icon-outlined {
    filter: brightness(0) saturate(100%) invert(100%);
  }

  /* CSS変数定義 */
  :root {
    --icon-size-small: 16px;
    --icon-size-medium: 20px;
    --icon-size-large: 24px;
    --icon-color-default: #ffffff;
    --icon-color-success: #4caf50;
    --icon-color-danger: #f44336;
    --icon-color-dark: #333333;
  }

  /* ボタン内のアイコン調整 */
  .control-btn .material-icon,
  .action-card .material-icon {
    margin: 0;
    vertical-align: middle;
  }

  /* FABアイコン */
  .fab-icon {
    width: 24px;
    height: 24px;
  }

  /* タブアイコン */
  .tab-icon {
    width: 20px;
    height: 20px;
    margin-right: 8px;
  }

  /* comment-filter2互換クラス */
  .cf2-icon {
    display: inline-block;
    vertical-align: middle;
  }

  .cf2-icon-white {
    filter: brightness(0) saturate(100%) invert(100%);
  }

  .material-icon-missing {
    opacity: 0;
  }
`;

class CommonHeader {
  constructor(container, config = {}) {
    this.isFixed = false;
    this.container = typeof container === "string" ? document.getElementById(container) || document.createElement("div") : container;
    this.config = {
      title: "CustomMylist2 Manager",
      showSearch: true,
      showMoreLinks: true,
      enableFixedMode: false,
      ...config
    };
    this.shadowRoot = this.container.attachShadow({ mode: "open" });
    this.init();
  }
  /**
   * ヘッダーを初期化
   */
  init() {
    this.loadTemplate();
    this.setupEventListeners();
    this.applyConfig();
  }
  /**
   * HTMLテンプレートを読み込み
   */
  loadTemplate() {
    this.shadowRoot.innerHTML = `
      <style>
        ${this.getHeaderStyles()}
      </style>
      ${this.getHeaderTemplate()}
    `;
  }
  /**
   * ヘッダーのスタイルを取得
   */
  getHeaderStyles() {
    return `
      /* 共通ヘッダーコンポーネントのスタイル */
      :host {
        display: block;
        position: relative;
        top: var(--header-offset-top, -8px);
        left: var(--header-offset-left, -8px);
        width: 100%;
        margin: 0;
        padding: 0;
      }

      .custom-header {
        background: var(--header-bg-color, #252525);
        color: var(--header-text-color, #fff);
        padding: var(--header-padding, 8px 20px);
        transition: all 0.3s ease;
        height: var(--header-height, 49px);
        font-size: var(--header-font-size, 15px);
        position: relative;
        width: var(--header-width, 100vw);
        box-sizing: border-box;
        margin: 0;
      }

      .custom-header.fixed {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        z-index: var(--header-z-index, 9000);
        box-shadow: var(--header-fixed-shadow, 0 2px 5px rgba(0, 0, 0, 0.2));
        height: var(--header-height, 49px);
        font-size: var(--header-font-size, 15px);
      }

      .header-content {
        display: flex;
        justify-content: space-between;
        align-items: center;
        max-width: 1200px;
        margin: 0 auto;
      }

      /* ヘッダー左部分 */
      .header-left {
        display: flex;
        align-items: center;
        gap: 20px;
      }

      .header-left h1 {
        margin: 0;
        font-size: 1.2em;
      }

      /* 検索部分 */
      .search-container {
        position: relative;
        display: flex;
        align-items: center;
      }

      .search-clear-btn {
        position: relative;
        right: -5px;
        background-color: #3498db;
        border: solid 1px #444;
        cursor: pointer;
        padding: 5px;
        color: #666;
      }

      .search-clear-btn:hover {
        color: #333;
      }

      .search-container select,
      .search-container input {
        padding: 5px 10px;
        border: 1px solid #444;
        border-radius: 3px;
        background: #333;
        color: #fff;
      }

      .search-container select {
        margin-right: 10px;
      }

      .search-container button {
        margin-left: 10px;
        background: var(--header-search-btn-bg, #2a88bd);
        color: #ffffff;
        border: none;
        padding: 8px 16px;
        border-radius: 4px;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 4px;
      }

      .search-container button:hover {
        background: var(--header-search-btn-hover, #3498db);
      }

      /* アイコンボタン専用スタイル */
      .icon-btn {
        background: var(--header-search-btn-bg, #2a88bd);
        color: #ffffff;
        border: none;
        padding: 8px;
        border-radius: 4px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        min-width: 36px;
        height: 36px;
      }

      .icon-btn:hover {
        background: var(--header-search-btn-hover, #3498db);
      }

      .clear-btn {
        background: var(--header-clear-btn-bg, #f44336);
        margin-left: 5px;
      }

      .clear-btn:hover {
        background: var(--header-clear-btn-hover, #d32f2f);
      }

      /* リンク部分 */
      .header-links {
        display: flex;
        gap: 15px;
        align-items: center;
      }

      .header-links a {
        color: var(--header-link-color, #fff);
        text-decoration: none;
        font-size: 0.9em;
        display: flex;
        align-items: center;
        gap: 4px;
      }

      .header-links a:hover {
        color: var(--header-link-hover, #2196f3);
      }

      .header-links button {
        background: transparent;
        border: none;
        color: var(--header-link-color, #fff);
        font-size: 0.9em;
        cursor: pointer;
        padding: 0;
      }

      .header-links button:hover {
        color: var(--header-link-hover, #2196f3);
      }

      /* ドロップダウンメニュー */
      .more-links {
        position: relative;
      }

      .dropdown-content {
        display: none;
        position: absolute;
        right: 0;
        background-color: #333;
        min-width: 160px;
        box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
        z-index: 9001;
      }

      .dropdown-content a {
        padding: 12px 16px;
        display: block;
        white-space: nowrap;
      }

      .more-links:hover .dropdown-content {
        display: block;
      }

      /* マテリアルアイコンの統合 */
      ${materialIconsStyles}
    `;
  }
  /**
   * ヘッダーテンプレート
   */
  getHeaderTemplate() {
    return `
      <!-- 共通ヘッダーテンプレート -->
      <header id="customHeader" class="custom-header">
        <div class="header-content">
          <div class="header-left">
            <h1 data-header-title="${this.config.title}">${this.config.title}</h1>
          </div>
          <div class="header-center">
            <div class="search-container">
              <select id="searchOption" data-header-search-select>
                <option value="www+search">キーワード</option>
                <option value="www+tag">タグ</option>
                <option value="www+mylist_search">マイリスト</option>
                <option value="seiga+search">静画</option>
                <option value="live+search">生放送</option>
                <option value="ch+search">チャンネル</option>
                <option value="dic+s/al/t">大百科</option>
              </select>
              <input type="text" id="searchWords" data-header-search-input placeholder="入力して検索…" />
              <button id="searchExec" data-header-search-btn class="icon-btn" title="検索">
                ${createMaterialIcon(ICONS.search, { style: "outlined", color: "white" })}
              </button>
              <button id="searchClear" data-header-clear-btn class="icon-btn clear-btn" title="クリア">
                ${createMaterialIcon(ICONS.clear, { style: "outlined", color: "white" })}
              </button>
            </div>
          </div>
          <div class="header-right">
            <nav class="header-links">
              <a href="https://www.nicovideo.jp/" target="_blank" title="トップ">
                ${createMaterialIcon(ICONS.home, { style: "outlined", color: "white" })}
                トップ
              </a>
              <a href="https://www.nicovideo.jp/video_top" target="_blank" title="動画">
                ${createMaterialIcon(ICONS.play, { style: "outlined", color: "white" })}
                動画
              </a>
              <a href="https://seiga.nicovideo.jp/" target="_blank" title="静画">
                ${createMaterialIcon(ICONS.image, { style: "outlined", color: "white" })}
                静画
              </a>
              <a href="https://live.nicovideo.jp/" target="_blank" title="生放送">
                ${createMaterialIcon(ICONS.live_tv, { style: "outlined", color: "white" })}
                生放送
              </a>
              <a href="https://ch.nicovideo.jp/" target="_blank" title="チャンネル">
                ${createMaterialIcon(ICONS.tv, { style: "outlined", color: "white" })}
                チャンネル
              </a>
              <span class="more-links">
                <button id="moreLinksBtn" data-header-more-btn>その他▼</button>
                <div class="dropdown-content">
                  <a href="https://dic.nicovideo.jp/" target="_blank" title="大百科">
                    大百科
                  </a>
                  <a href="https://jk.nicovideo.jp/" target="_blank" title="実況">
                    実況
                  </a>
                  <a href="https://anime.nicovideo.jp/" target="_blank" title="Nアニメ">
                    Nアニメ
                  </a>
                  <a href="https://www.nicovideo.jp/ranking" target="_blank" title="ランキング">ランキング</a>
                  <a href="https://www.nicovideo.jp/my/history/video" target="_blank" title="マイページ">
                    ${createMaterialIcon(ICONS.bookmark, { style: "outlined", color: "white" })}
                    マイページ
                  </a>
                  <a href="https://www.nicovideo.jp/newarrival" target="_blank" title="新着動画">
                    新着動画
                  </a>
                  <a href="https://www.nicovideo.jp/recent" target="_blank" title="新着コメント">
                    新着コメント
                  </a>
                  <a href="https://www.nicovideo.jp/local/features/dist/src/mylist2/index.html" target="_blank" title="mylist2">
                    mylist2
                  </a>
                  <a href="https://www.nicovideo.jp/local/features/dist/src/watch-history/index.html" target="_blank" title="watch-history">
                    watch-history
                  </a>
                  <a href="https://www.nicovideo.jp/cache/" target="_blank" title="キャッシュ">
                    キャッシュ
                  </a>
                  <a href="https://www.nicovideo.jp/local/features/dist/src/docs/mylist2/index.html" target="_blank" title="mylist2 README">
                    README(ML2)
                  </a>
                  <a href="https://www.nicovideo.jp/local/features/dist/src/docs/comment-filter2/index.html" target="_blank" title="CommentFilter2 README">
                    README(CF2)
                  </a>
                  <a href="https://github.com/roflsunriz/filter-matome" target="_blank" title="filter-matome">
                    filter-matome (GitHub)
                  </a>
                </div>
              </span>
            </nav>
          </div>
        </div>
      </header>
    `;
  }
  /**
   * イベントリスナーを設定
   */
  setupEventListeners() {
    const searchBtn = this.shadowRoot.querySelector("#searchExec");
    const clearBtn = this.shadowRoot.querySelector("#searchClear");
    if (searchBtn) {
      searchBtn.addEventListener("click", () => this.handleSearch());
    }
    if (clearBtn) {
      clearBtn.addEventListener("click", () => this.handleClear());
    }
    const searchInput = this.shadowRoot.querySelector("#searchWords");
    if (searchInput) {
      searchInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
          this.handleSearch();
        }
      });
    }
    if (this.config.enableFixedMode) {
      window.addEventListener("scroll", () => this.handleScroll());
    }
  }
  /**
   * 設定を適用
   */
  applyConfig() {
    const titleElement = this.shadowRoot.querySelector("[data-header-title]");
    if (titleElement && this.config.title) {
      titleElement.textContent = this.config.title;
    }
    const searchContainer = this.shadowRoot.querySelector(".search-container");
    if (searchContainer && !this.config.showSearch) {
      searchContainer.style.display = "none";
    }
    const moreLinks = this.shadowRoot.querySelector(".more-links");
    if (moreLinks && !this.config.showMoreLinks) {
      moreLinks.style.display = "none";
    }
    if (this.config.customLinks && this.config.customLinks.length > 0) {
      this.addCustomLinks();
    }
  }
  /**
   * カスタムリンクを追加
   */
  addCustomLinks() {
    const headerLinks = this.shadowRoot.querySelector(".header-links");
    if (!headerLinks || !this.config.customLinks) return;
    this.config.customLinks.forEach((link) => {
      const linkElement = document.createElement("a");
      linkElement.href = link.url;
      linkElement.textContent = link.text;
      linkElement.target = link.target || "_blank";
      headerLinks.appendChild(linkElement);
    });
  }
  /**
   * 検索処理
   */
  handleSearch() {
    const searchSelect = this.shadowRoot.querySelector("#searchOption");
    const searchInput = this.shadowRoot.querySelector("#searchWords");
    if (!searchSelect || !searchInput || !searchInput.value.trim()) return;
    const searchType = searchSelect.value;
    const searchWords = encodeURIComponent(searchInput.value.trim());
    const baseUrl = "https://www.nicovideo.jp/search";
    let searchUrl;
    switch (searchType) {
      case "www+tag":
        searchUrl = `${baseUrl}/${searchWords}?f_range=0&type=tag`;
        break;
      case "www+mylist_search":
        searchUrl = `https://www.nicovideo.jp/mylist_search/${searchWords}`;
        break;
      case "seiga+search":
        searchUrl = `https://seiga.nicovideo.jp/search/${searchWords}`;
        break;
      case "live+search":
        searchUrl = `https://live.nicovideo.jp/search?keyword=${searchWords}`;
        break;
      case "ch+search":
        searchUrl = `https://ch.nicovideo.jp/search?q=${searchWords}`;
        break;
      case "dic+s/al/t":
        searchUrl = `https://dic.nicovideo.jp/s/al/t/${searchWords}`;
        break;
      default:
        searchUrl = `${baseUrl}/${searchWords}`;
    }
    window.open(searchUrl, "_blank");
  }
  /**
   * 検索クリア処理
   */
  handleClear() {
    const searchInput = this.shadowRoot.querySelector("#searchWords");
    if (searchInput) {
      searchInput.value = "";
      searchInput.focus();
    }
  }
  /**
   * スクロール処理（固定モード用）
   */
  handleScroll() {
    const header = this.shadowRoot.querySelector(".custom-header");
    if (!header) return;
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    if (scrollTop > 100 && !this.isFixed) {
      header.classList.add("fixed");
      this.isFixed = true;
    } else if (scrollTop <= 100 && this.isFixed) {
      header.classList.remove("fixed");
      this.isFixed = false;
    }
  }
  /**
   * ヘッダーのタイトルを更新
   */
  setTitle(title) {
    this.config.title = title;
    const titleElement = this.shadowRoot.querySelector("[data-header-title]");
    if (titleElement) {
      titleElement.textContent = title;
    }
  }
  /**
   * 固定モードの切り替え
   */
  toggleFixedMode(enabled) {
    this.config.enableFixedMode = enabled;
    if (enabled) {
      window.addEventListener("scroll", () => this.handleScroll());
    } else {
      window.removeEventListener("scroll", () => this.handleScroll());
      const header = this.shadowRoot.querySelector(".custom-header");
      if (header) {
        header.classList.remove("fixed");
        this.isFixed = false;
      }
    }
  }
  /**
   * Shadow DOM のルートを取得（外部からアクセス可能）
   */
  getShadowRoot() {
    return this.shadowRoot;
  }
  /**
   * Shadow DOM内の要素を取得するヘルパーメソッド
   */
  querySelector(selector) {
    return this.shadowRoot.querySelector(selector);
  }
  /**
   * ヘッダーを破棄
   */
  destroy() {
    window.removeEventListener("scroll", () => this.handleScroll());
    this.shadowRoot.innerHTML = "";
  }
}
function createHeader(containerId, config) {
  return new CommonHeader(containerId, config);
}
window.NicoCommon = {
  CommonHeader,
  createHeader
};

const CSS_CONSTANTS = `
:root {
  /* ヘッダー位置調整定数 */
  --header-offset-top: -8px;
  --header-offset-left: -8px;
  --header-width: 100vw;
  --header-height: 49px;
  --header-z-index: 9000;
  
  /* 各環境での微調整 */
  --header-mylist2-top: -8px;
  --header-mylist2-left: -8px;
  --header-mylist2-docs-top: -21px;
  --header-mylist2-docs-left: -335px;
  --header-comment-filter2-docs-top: -22px;
  --header-comment-filter2-docs-left: -22px;
  --header-video-player-width: 102vw;
  --header-video-player-top: -32px;
  --header-video-player-left: -134px;
  --header-movie-info-width: 101vw;
  --header-movie-info-top: -32px;
  --header-movie-info-left: -340px;

  /* ヘッダー背景・色関連 */
  --header-bg-color: #252525;
  --header-text-color: #fff;
  --header-padding: 8px 20px;
  --header-font-size: 15px;
  
  /* 固定モード時の追加スタイル */
  --header-fixed-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
  
  /* 検索ボタン色 */
  --header-search-btn-bg: #2a88bd;
  --header-search-btn-hover: #3498db;
  
  /* リンク色 */
  --header-link-color: #fff;
  --header-link-hover: #2196f3;
}
`;
const applyCssConstants = () => {
  const styleElement = document.createElement("style");
  styleElement.textContent = CSS_CONSTANTS;
  document.head.appendChild(styleElement);
  return styleElement;
};

applyCssConstants();
applyToastrStyles();
//# sourceMappingURL=common.es.js.map
