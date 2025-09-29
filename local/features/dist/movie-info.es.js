true              &&(function polyfill() {
	const relList = document.createElement("link").relList;
	if (relList && relList.supports && relList.supports("modulepreload")) return;
	for (const link of document.querySelectorAll("link[rel=\"modulepreload\"]")) processPreload(link);
	new MutationObserver((mutations) => {
		for (const mutation of mutations) {
			if (mutation.type !== "childList") continue;
			for (const node of mutation.addedNodes) if (node.tagName === "LINK" && node.rel === "modulepreload") processPreload(node);
		}
	}).observe(document, {
		childList: true,
		subtree: true
	});
	function getFetchOpts(link) {
		const fetchOpts = {};
		if (link.integrity) fetchOpts.integrity = link.integrity;
		if (link.referrerPolicy) fetchOpts.referrerPolicy = link.referrerPolicy;
		if (link.crossOrigin === "use-credentials") fetchOpts.credentials = "include";
		else if (link.crossOrigin === "anonymous") fetchOpts.credentials = "omit";
		else fetchOpts.credentials = "same-origin";
		return fetchOpts;
	}
	function processPreload(link) {
		if (link.ep) return;
		link.ep = true;
		const fetchOpts = getFetchOpts(link);
		fetch(link.href, fetchOpts);
	}
}());

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
  getVideoIdWithFallback: (input) => {
    try {
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
      return window.commonHelper.extractVideoIdFromUrl(input);
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
    this.currentLevel = LogLevel.ERROR;
    this.enabledFiles = /* @__PURE__ */ new Set();
    this.disabledFiles = /* @__PURE__ */ new Set();
    this.initializeLoggerConfig();
  }
  initializeLoggerConfig() {
    this.setLevel(LogLevel.ERROR);
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

const ICONS = {
  clear: "clear_all",
  play: "play_arrow",
  search: "search",
  home: "home",
  bookmark: "bookmark",
  live_tv: "live_tv",
  image: "image",
  tv: "tv"};
function getIconPath(iconName, style = "outlined") {
  return `/local/images/material-design-icons/${style}/${iconName}.svg`;
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
  --header-mylist2-docs-left: -43px;
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

const CACHE_INFO_ENDPOINT = "https://www.nicovideo.jp/cache/info/v2?";
const THUMB_INFO_ENDPOINT = "https://ext.nicovideo.jp/api/getthumbinfo/";
const MEDIA_INFO_ENDPOINT = "https://www.nicovideo.jp/cache/mediainfo?";
const toErrorMessage = (error) => {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return String(error);
};
const parseBoolean = (value) => value === "1" || value === "true";
const parseNumber = (value) => {
  if (typeof value !== "string") {
    return 0;
  }
  const parsed = Number(value.replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
};
const normalizeText = (value) => (value ?? "").trim();
const parseThumbOwner = (thumbElement, prefix) => {
  const idSelector = prefix === "user" ? "user_id" : "ch_id";
  const nameSelector = prefix === "user" ? "user_nickname" : "ch_name";
  const iconSelector = prefix === "user" ? "user_icon_url" : "ch_icon_url";
  const id = normalizeText(thumbElement.querySelector(idSelector)?.textContent);
  const nickname = normalizeText(thumbElement.querySelector(nameSelector)?.textContent);
  const iconUrl = normalizeText(thumbElement.querySelector(iconSelector)?.textContent);
  if (!id && !nickname && !iconUrl) {
    return void 0;
  }
  return {
    id,
    nickname,
    iconUrl
  };
};
const parseThumbInfoXml = (xmlText) => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, "application/xml");
  const parserError = doc.querySelector("parsererror");
  if (parserError) {
    throw new Error("サムネイルAPIのレスポンス解析に失敗しました");
  }
  const root = doc.querySelector("nicovideo_thumb_response");
  if (!root) {
    throw new Error("サムネイルAPIのレスポンス形式が不正です");
  }
  const status = root.getAttribute("status") === "ok" ? "ok" : "fail";
  if (status === "fail") {
    const description = root.querySelector("error > description")?.textContent ?? "不明なエラー";
    throw new Error("サムネイルAPIエラー: " + description);
  }
  const thumb = root.querySelector("thumb");
  if (!thumb) {
    throw new Error("サムネイル情報が見つかりませんでした");
  }
  const tags = Array.from(thumb.querySelectorAll("tags > tag"), (tagElement) => ({
    name: normalizeText(tagElement.textContent),
    locked: tagElement.getAttribute("lock") === "1"
  })).filter((tag) => Boolean(tag.name));
  const rawEntries = {};
  Array.from(thumb.children).forEach((child) => {
    rawEntries[child.tagName] = normalizeText(child.textContent);
  });
  return {
    status: "ok",
    videoId: normalizeText(thumb.querySelector("video_id")?.textContent),
    title: normalizeText(thumb.querySelector("title")?.textContent),
    description: normalizeText(thumb.querySelector("description")?.textContent),
    thumbnailUrl: normalizeText(thumb.querySelector("thumbnail_url")?.textContent),
    firstRetrieve: normalizeText(thumb.querySelector("first_retrieve")?.textContent),
    length: normalizeText(thumb.querySelector("length")?.textContent),
    movieType: normalizeText(thumb.querySelector("movie_type")?.textContent),
    viewCounter: parseNumber(thumb.querySelector("view_counter")?.textContent),
    commentNum: parseNumber(thumb.querySelector("comment_num")?.textContent),
    mylistCounter: parseNumber(thumb.querySelector("mylist_counter")?.textContent),
    lastResBody: normalizeText(thumb.querySelector("last_res_body")?.textContent),
    watchUrl: normalizeText(thumb.querySelector("watch_url")?.textContent),
    thumbType: normalizeText(thumb.querySelector("thumb_type")?.textContent),
    embeddable: parseBoolean(thumb.querySelector("embeddable")?.textContent),
    noLivePlay: parseBoolean(thumb.querySelector("no_live_play")?.textContent),
    tags,
    genre: normalizeText(thumb.querySelector("genre")?.textContent),
    cache: normalizeText(thumb.querySelector("cache")?.textContent) || null,
    owner: parseThumbOwner(thumb, "user"),
    channel: parseThumbOwner(thumb, "ch"),
    raw: rawEntries
  };
};
const fetchCacheInfo = async (videoId) => {
  const url = CACHE_INFO_ENDPOINT + encodeURIComponent(videoId);
  try {
    const response = await window.commonHelper.fetchRequest(url);
    if (!response.ok) {
      throw new Error("Cache info API error: " + response.status);
    }
    const json = await response.json();
    const entry = json?.[videoId];
    if (!entry) {
      throw new Error("指定された動画IDのキャッシュ情報が見つかりませんでした");
    }
    return entry;
  } catch (error) {
    const message = toErrorMessage(error);
    window.logger?.error?.("[movie-info] cache info fetch failed", message);
    throw new Error(message);
  }
};
const fetchThumbInfo = async (videoId) => {
  const url = THUMB_INFO_ENDPOINT + encodeURIComponent(videoId);
  try {
    const response = await window.commonHelper.fetchRequest(url);
    if (!response.ok) {
      throw new Error("Thumb info API error: " + response.status);
    }
    const xmlText = await response.text();
    return parseThumbInfoXml(xmlText);
  } catch (error) {
    const message = toErrorMessage(error);
    window.logger?.error?.("[movie-info] thumb info fetch failed", message);
    throw new Error(message);
  }
};
const fetchMediaInfo = async (videoId) => {
  const url = MEDIA_INFO_ENDPOINT + encodeURIComponent(videoId);
  try {
    const response = await window.commonHelper.fetchRequest(url);
    if (!response.ok) {
      throw new Error("MediaInfo API error: " + response.status);
    }
    const rawText = await response.text();
    const trimmed = rawText.trim();
    if (!trimmed) {
      throw new Error("MediaInfoのレスポンスが空でした");
    }
    const data = JSON.parse(trimmed);
    if (Array.isArray(data)) {
      return data.map((item) => ({ ...item }));
    }
    return { ...data };
  } catch (error) {
    const message = toErrorMessage(error);
    window.logger?.error?.("[movie-info] MediaInfo fetch failed", message);
    throw new Error(message);
  }
};
const fetchWatchApiData = async (videoId) => {
  try {
    const result = await window.commonHelper.fetchWatchPage(videoId);
    if (!result || !result.apiData) {
      throw new Error("ウォッチページのapiDataが取得できませんでした");
    }
    return result.apiData;
  } catch (error) {
    const message = toErrorMessage(error);
    window.logger?.error?.("[movie-info] watch api fetch failed", message);
    throw new Error(message);
  }
};
const fetchCommentsWithApi = async (videoId) => {
  try {
    const data = await window.commonHelper.fetchNicoDataWithComments(videoId);
    if (!data) {
      throw new Error("コメントデータが取得できませんでした");
    }
    return data;
  } catch (error) {
    const message = toErrorMessage(error);
    window.logger?.error?.("[movie-info] comment fetch failed", message);
    throw new Error(message);
  }
};

const MOVIE_INFO_HEADER_ADJUSTMENT_STYLES = `
/**
 * movie-info環境専用のヘッダー位置調整
 * CSS Custom Propertiesを上書きして各環境に最適化
 */

:root {
  /* movie-info環境での位置調整 */
  --header-offset-top: var(--header-movie-info-top);
  --header-offset-left: var(--header-movie-info-left);
  --header-width: var(--header-movie-info-width);
}
`;
const headerAdjustments = () => {
  const styleElement = document.createElement("style");
  styleElement.textContent = MOVIE_INFO_HEADER_ADJUSTMENT_STYLES;
  document.head.appendChild(styleElement);
  return styleElement;
};

const STYLE_ID = "movie-info-dashboard-styles";
const applyMovieInfoDashboardStyles = () => {
  if (document.getElementById(STYLE_ID)) {
    return;
  }
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = [
    "* { box-sizing: border-box; }",
    "body { font-family: 'Segoe UI', 'Hiragino Kaku Gothic ProN', Meiryo, sans-serif; background: #f3f4f6; color: #1f2933; margin: 0; padding: 0; }",
    "#movie-info-app { max-width: 1240px; margin: 0 auto; padding: 32px 24px 64px; }",
    "#common-header-container { margin-bottom: 16px; }",
    ".app-main { display: flex; flex-direction: column; gap: 24px; }",
    ".video-selector { background: #ffffff; border-radius: 14px; padding: 20px 24px; box-shadow: 0 6px 18px rgba(15, 23, 42, 0.08); position: sticky; top: 16px; z-index: 5; }",
    ".video-selector h1 { margin: 0 0 12px 0; font-size: 1.6rem; font-weight: 600; }",
    ".video-input-row { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; }",
    ".video-input-row label { font-weight: 600; }",
    ".video-input-row input { flex: 1; min-width: 220px; padding: 10px 12px; border-radius: 8px; border: 1px solid #d2d6dc; font-size: 1rem; }",
    ".video-input-row button { background: #2563eb; color: #ffffff; border: none; border-radius: 8px; padding: 10px 18px; font-weight: 600; cursor: pointer; transition: background 0.2s ease; }",
    ".video-input-row button:hover { background: #1d4ed8; }",
    ".video-input-row button:disabled { background: #94a3b8; cursor: not-allowed; }",
    ".video-hint { margin: 8px 0 0 0; font-size: 0.88rem; color: #475569; }",
    ".global-status { font-size: 0.9rem; color: #1f2933; margin-top: 8px; }",
    ".panel-grid { display: grid; gap: 20px; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); }",
    ".info-panel { background: #ffffff; border-radius: 14px; box-shadow: 0 4px 16px rgba(15, 23, 42, 0.08); display: flex; flex-direction: column; min-height: 280px; overflow: hidden; }",
    ".panel-header { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-bottom: 1px solid #e2e8f0; background: #f8fafc; }",
    ".panel-header h2 { margin: 0; font-size: 1.1rem; font-weight: 600; color: #0f172a; }",
    ".panel-actions { display: flex; gap: 8px; align-items: center; }",
    ".panel-actions button { border: none; border-radius: 6px; padding: 8px 14px; background: #1e293b; color: #ffffff; font-size: 0.88rem; font-weight: 600; cursor: pointer; transition: background 0.2s ease; }",
    ".panel-actions button.secondary { background: #475569; }",
    ".panel-actions button:hover { background: #111827; }",
    ".panel-actions button:disabled { background: #94a3b8; cursor: not-allowed; }",
    ".panel-body { padding: 18px 20px 22px 20px; display: flex; flex-direction: column; gap: 14px; }",
    ".panel-status { font-weight: 600; font-size: 0.92rem; border-radius: 6px; padding: 6px 10px; background: #e2e8f0; color: #1f2933; }",
    ".panel-status[data-state='loading'] { background: #dbeafe; color: #1d4ed8; }",
    ".panel-status[data-state='success'] { background: #dcfce7; color: #166534; }",
    ".panel-status[data-state='error'] { background: #fee2e2; color: #b91c1c; }",
    ".panel-status[data-state='idle'] { background: #e2e8f0; color: #1f2933; }",
    ".summary-container { display: flex; flex-direction: column; gap: 16px; }",
    ".summary-grid { display: grid; grid-template-columns: max-content 1fr; gap: 6px 16px; font-size: 0.94rem; }",
    ".summary-grid dt { font-weight: 600; color: #1e293b; }",
    ".summary-grid dd { margin: 0; color: #334155; }",
    ".tag-list { display: flex; flex-wrap: wrap; gap: 6px; }",
    ".tag-chip { background: #eef2ff; color: #312e81; padding: 4px 10px; border-radius: 999px; font-size: 0.82rem; border: 1px solid #c7d2fe; }",
    "details[data-role='raw'] { border-top: 1px solid #e2e8f0; padding-top: 10px; }",
    "details[data-role='raw'] summary { cursor: pointer; font-weight: 600; color: #2563eb; }",
    ".json-viewer { background: #0f172a; color: #f8fafc; font-family: 'SFMono-Regular', Consolas, Monaco, 'Courier New', monospace; font-size: 0.78rem; line-height: 1.6; border-radius: 10px; padding: 14px; margin-top: 12px; max-height: 320px; overflow: auto; white-space: pre-wrap; word-break: break-word; }",
    ".video-meta { display: flex; flex-direction: column; gap: 6px; font-size: 0.92rem; color: #334155; }",
    ".video-meta strong { color: #1e293b; }"
  ].join("\n");
  document.head.appendChild(style);
};

const STATUS_MESSAGES = {
  idle: "idle",
  loading: "loading",
  success: "success",
  error: "error"
};
class PanelController {
  constructor(root) {
    this.currentJson = null;
    this.downloadDescriptor = null;
    this.root = root;
    const statusEl = root.querySelector('[data-role="status"]');
    const summaryEl = root.querySelector('[data-role="summary"]');
    if (!(statusEl instanceof HTMLElement)) {
      throw new Error("ステータス表示要素が見つかりません");
    }
    if (!(summaryEl instanceof HTMLElement)) {
      throw new Error("サマリー表示要素が見つかりません");
    }
    this.statusEl = statusEl;
    this.summaryEl = summaryEl;
    this.rawContainer = root.querySelector('[data-role="raw"]');
    this.jsonEl = root.querySelector('[data-role="json"]');
    this.copyButton = root.querySelector('button[data-role="copy"]');
    this.downloadButton = root.querySelector('button[data-role="download"]');
    if (this.copyButton) {
      this.copyButton.addEventListener("click", () => {
        void this.handleCopy();
      });
    }
    if (this.downloadButton) {
      this.downloadButton.addEventListener("click", () => {
        this.handleDownload();
      });
    }
    this.reset("未取得です");
  }
  reset(message) {
    this.setStatus("idle", message);
    this.setSummaryContent(null);
    this.setRawVisibility(false);
    this.currentJson = null;
    this.downloadDescriptor = null;
    if (this.copyButton) {
      this.copyButton.disabled = true;
    }
    if (this.downloadButton) {
      this.downloadButton.disabled = true;
    }
    if (this.jsonEl) {
      this.jsonEl.textContent = "";
    }
  }
  setStatus(status, message) {
    this.statusEl.dataset.state = STATUS_MESSAGES[status];
    this.statusEl.textContent = message;
  }
  setSummaryContent(content) {
    this.summaryEl.innerHTML = "";
    if (content) {
      this.summaryEl.appendChild(content);
    }
  }
  setJsonData(data, pretty = true) {
    if (!this.jsonEl) {
      return;
    }
    try {
      const jsonText = typeof data === "string" ? data : JSON.stringify(data, null, pretty ? 2 : void 0);
      this.currentJson = jsonText;
      this.jsonEl.textContent = jsonText;
      this.setRawVisibility(true);
      if (this.copyButton) {
        this.copyButton.disabled = false;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.jsonEl.textContent = "JSON変換に失敗しました";
      this.currentJson = null;
      if (this.copyButton) {
        this.copyButton.disabled = true;
      }
      window.logger?.warn?.("[movie-info] JSON stringify failed", message);
    }
  }
  setDownloadDescriptor(descriptor) {
    this.downloadDescriptor = descriptor;
    if (this.downloadButton) {
      this.downloadButton.disabled = descriptor == null;
    }
  }
  setRawVisibility(visible) {
    if (!this.rawContainer) {
      return;
    }
    if (visible) {
      this.rawContainer.removeAttribute("hidden");
    } else {
      this.rawContainer.setAttribute("hidden", "hidden");
      this.rawContainer.open = false;
    }
  }
  async handleCopy() {
    if (!this.currentJson) {
      return;
    }
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(this.currentJson);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = this.currentJson;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      if (window.toastr?.success) {
        window.toastr.success("JSONをクリップボードにコピーしました");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      window.logger?.warn?.("[movie-info] JSON copy failed", message);
      if (window.toastr?.error) {
        window.toastr.error("JSONコピーに失敗しました", message);
      }
    }
  }
  handleDownload() {
    if (!this.downloadDescriptor) {
      return;
    }
    try {
      const payload = this.downloadDescriptor.payloadSupplier();
      const blob = new Blob([payload], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = this.downloadDescriptor.fileName;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
      if (window.toastr?.success) {
        window.toastr.success("JSONファイルをダウンロードしました");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      window.logger?.error?.("[movie-info] JSON download failed", message);
      if (window.toastr?.error) {
        window.toastr.error("JSONダウンロードに失敗しました", message);
      }
    }
  }
}

const COMMENT_PREVIEW_LIMIT = 200;
const formatNumber = (value) => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "-";
  }
  return value.toLocaleString("ja-JP");
};
const formatBytes = (value) => {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return "-";
  }
  const units = ["B", "KB", "MB", "GB", "TB"];
  let size = value;
  let index = 0;
  while (size >= 1024 && index < units.length - 1) {
    size = size / 1024;
    index += 1;
  }
  const rounded = Math.round(size * 10) / 10;
  return String(rounded) + " " + units[index];
};
const trimDescription = (text, limit = 140) => {
  if (typeof text !== "string" || text.length === 0) {
    return "-";
  }
  if (text.length <= limit) {
    return text;
  }
  return text.slice(0, limit) + "…";
};
const extractVideoId = (input) => {
  const pattern = /([a-z]{2}\d+)/i;
  const match = pattern.exec(input);
  return match ? match[1].toLowerCase() : null;
};
const updateUrlWithVideoId = (videoId) => {
  try {
    const current = new URL(window.location.href);
    current.searchParams.set("videoId", videoId);
    window.history.replaceState({}, "", current.toString());
  } catch (error) {
    window.logger?.warn?.("[movie-info] failed to update URL", error);
  }
};
const createSummaryGrid = (rows) => {
  const dl = document.createElement("dl");
  dl.className = "summary-grid";
  rows.forEach((row) => {
    const dt = document.createElement("dt");
    dt.textContent = row.label;
    const dd = document.createElement("dd");
    dd.textContent = row.value;
    dl.appendChild(dt);
    dl.appendChild(dd);
  });
  return dl;
};
const createTagList = (tags) => {
  const wrapper = document.createElement("div");
  wrapper.className = "tag-list";
  tags.forEach((tag) => {
    const chip = document.createElement("span");
    chip.className = "tag-chip";
    chip.textContent = tag.name + (tag.locked ? " (lock)" : "");
    wrapper.appendChild(chip);
  });
  return wrapper;
};
const buildCacheSummary = (entry) => {
  const container = document.createElement("div");
  container.className = "summary-container";
  const caches = Object.values(entry.caches ?? {});
  const completeCount = Array.isArray(entry.completes) ? entry.completes.length : 0;
  const cachingCount = Array.isArray(entry.cachings) ? entry.cachings.length : 0;
  const totalSize = caches.reduce((acc, item) => {
    const size = typeof item.size === "number" ? item.size : 0;
    return acc + size;
  }, 0);
  const primary = createSummaryGrid([
    { label: "preferred", value: entry.preferred || "-" },
    { label: "完了キャッシュ", value: String(completeCount) },
    { label: "取得中", value: String(cachingCount) },
    { label: "登録キャッシュ", value: String(Array.isArray(entry.cacheIds) ? entry.cacheIds.length : 0) },
    { label: "合計サイズ", value: formatBytes(totalSize) }
  ]);
  container.appendChild(primary);
  if (caches.length > 0) {
    const meta = document.createElement("div");
    meta.className = "video-meta";
    meta.appendChild(document.createTextNode("キャッシュ詳細"));
    caches.slice(0, 3).forEach((item) => {
      const line = document.createElement("div");
      const quality = item?.dmcMovieType && typeof item.dmcMovieType === "object" ? String(item.dmcMovieType.videoMode || "") : "";
      const summary = [item.cacheId || "", quality, formatBytes(item.size)].filter((value) => value && value !== "-").join(" / ");
      line.textContent = summary;
      meta.appendChild(line);
    });
    if (caches.length > 3) {
      const more = document.createElement("div");
      more.textContent = "...他" + String(caches.length - 3) + "件";
      meta.appendChild(more);
    }
    container.appendChild(meta);
  }
  return container;
};
const buildThumbSummary = (thumb) => {
  const container = document.createElement("div");
  container.className = "summary-container";
  const primary = createSummaryGrid([
    { label: "タイトル", value: thumb.title || "-" },
    { label: "長さ", value: thumb.length || "-" },
    { label: "視聴数", value: formatNumber(thumb.viewCounter) },
    { label: "コメント", value: formatNumber(thumb.commentNum) },
    { label: "マイリスト", value: formatNumber(thumb.mylistCounter) },
    { label: "ジャンル", value: thumb.genre || "-" }
  ]);
  container.appendChild(primary);
  if (thumb.tags.length > 0) {
    container.appendChild(createTagList(thumb.tags));
  }
  const meta = document.createElement("div");
  meta.className = "video-meta";
  if (thumb.owner) {
    const ownerLine = document.createElement("div");
    ownerLine.textContent = "投稿者: " + (thumb.owner.nickname || thumb.owner.id);
    meta.appendChild(ownerLine);
  }
  if (thumb.channel) {
    const channelLine = document.createElement("div");
    channelLine.textContent = "チャンネル: " + (thumb.channel.nickname || thumb.channel.id);
    meta.appendChild(channelLine);
  }
  if (thumb.watchUrl) {
    const watchLine = document.createElement("div");
    watchLine.textContent = "URL: " + thumb.watchUrl;
    meta.appendChild(watchLine);
  }
  if (meta.childNodes.length > 0) {
    container.appendChild(meta);
  }
  return container;
};
const buildApiSummary = (apiData) => {
  const container = document.createElement("div");
  container.className = "summary-container";
  const video = apiData.video;
  const owner = apiData.owner;
  const channel = apiData.channel;
  const count = video?.count;
  const primary = createSummaryGrid([
    { label: "タイトル", value: typeof video?.title === "string" ? video.title : "-" },
    { label: "再生数", value: formatNumber(typeof count?.view === "number" ? count.view : void 0) },
    { label: "コメント", value: formatNumber(typeof count?.comment === "number" ? count.comment : void 0) },
    { label: "マイリスト", value: formatNumber(typeof count?.mylist === "number" ? count.mylist : void 0) },
    { label: "長さ(秒)", value: formatNumber(typeof video?.duration === "number" ? video.duration : void 0) }
  ]);
  container.appendChild(primary);
  const meta = document.createElement("div");
  meta.className = "video-meta";
  const ownerName = typeof owner?.nickname === "string" ? owner.nickname : null;
  const channelName = typeof channel?.name === "string" ? channel.name : null;
  if (ownerName) {
    meta.appendChild(document.createTextNode("投稿者: " + ownerName));
  }
  if (channelName) {
    meta.appendChild(document.createTextNode("チャンネル: " + channelName));
  }
  const description = trimDescription(video?.description, 160);
  const descLine = document.createElement("div");
  descLine.textContent = "説明: " + description;
  meta.appendChild(descLine);
  container.appendChild(meta);
  return container;
};
const buildMediaSummary = (mediaInfo) => {
  const entries = Array.isArray(mediaInfo) ? mediaInfo : [mediaInfo];
  const container = document.createElement("div");
  container.className = "summary-container";
  const header = document.createElement("div");
  header.className = "video-meta";
  header.textContent = "MediaInfo項目数: " + String(entries.length);
  container.appendChild(header);
  entries.slice(0, 3).forEach((item, index) => {
    const media = item?.media;
    const trackEntries = media?.track;
    const tracks = Array.isArray(trackEntries) ? trackEntries : [];
    const videoTracks = tracks.filter((track) => track && track["@type"] === "Video");
    const audioTracks = tracks.filter((track) => track && track["@type"] === "Audio");
    const refCandidate = media ? media["@ref"] : void 0;
    const refValue = typeof refCandidate === "string" ? refCandidate : "-";
    const formatCandidate = tracks.length > 0 ? tracks[0]?.Format : void 0;
    const formatValue = typeof formatCandidate === "string" ? formatCandidate : "-";
    const grid = createSummaryGrid([
      { label: "参照" + String(index + 1), value: refValue },
      { label: "Video", value: String(videoTracks.length) + "本" },
      { label: "Audio", value: String(audioTracks.length) + "本" },
      { label: "Format", value: formatValue }
    ]);
    container.appendChild(grid);
  });
  if (entries.length > 3) {
    const more = document.createElement("div");
    more.className = "video-meta";
    more.textContent = "...他" + String(entries.length - 3) + "件";
    container.appendChild(more);
  }
  return container;
};
const buildCommentSummary = (preview) => {
  const container = document.createElement("div");
  container.className = "summary-container";
  const primary = createSummaryGrid([
    { label: "コメント総数", value: String(preview.totalCount) },
    { label: "メインスレッド", value: preview.mainThread ? preview.mainThread.id : "-" },
    { label: "表示件数", value: String(preview.sampleComments.length) }
  ]);
  container.appendChild(primary);
  const meta = document.createElement("div");
  meta.className = "video-meta";
  meta.appendChild(document.createTextNode(preview.note));
  if (preview.sampleComments.length > 0) {
    const first = preview.sampleComments[0];
    const sample = document.createElement("div");
    sample.textContent = "最初のコメント: " + first.body;
    meta.appendChild(sample);
  }
  container.appendChild(meta);
  return container;
};
const createCommentPreview = (data) => {
  const sample = data.comments.slice(0, COMMENT_PREVIEW_LIMIT);
  return {
    note: "表示は先頭" + String(sample.length) + "件です。完全なデータはJSONダウンロードを使用してください。",
    totalCount: data.comments.length,
    mainThread: data.mainThread,
    sampleComments: sample
  };
};
const normalizeVideoIdFromInput = (value) => {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  return extractVideoId(trimmed);
};
const setStatusText = (element, text) => {
  if (element) {
    element.textContent = text;
  }
};
document.addEventListener("DOMContentLoaded", () => {
  applyMovieInfoDashboardStyles();
  headerAdjustments();
  const headerContainer = document.getElementById("common-header-container");
  if (headerContainer && window.NicoCommon?.createHeader) {
    window.NicoCommon.createHeader("common-header-container", {
      title: "Movie Info Dashboard",
      showSearch: true,
      showMoreLinks: true
    });
  }
  const videoInput = document.getElementById("video-id-input");
  const loadButton = document.getElementById("load-data-btn");
  const globalStatus = document.getElementById("global-status");
  const commentButton = document.getElementById("fetch-comments-btn");
  const panels = {
    watch: new PanelController(document.getElementById("panel-watch-api")),
    cache: new PanelController(document.getElementById("panel-cache-info")),
    thumb: new PanelController(document.getElementById("panel-thumb-info")),
    media: new PanelController(document.getElementById("panel-media-info")),
    comments: new PanelController(document.getElementById("panel-comments"))
  };
  let currentVideoId = null;
  const setCommentButtonIdle = () => {
    if (commentButton) {
      commentButton.disabled = currentVideoId === null;
      commentButton.textContent = "コメントを取得";
    }
  };
  const handleLoad = async (videoId) => {
    currentVideoId = videoId;
    updateUrlWithVideoId(videoId);
    panels.comments.reset("コメントは未取得です。ボタンから取得できます。");
    setCommentButtonIdle();
    setStatusText(globalStatus, "データ取得中...");
    panels.watch.setStatus("loading", "apiDataを取得中です...");
    panels.watch.setSummaryContent(null);
    panels.cache.setStatus("loading", "キャッシュ情報を取得中です...");
    panels.cache.setSummaryContent(null);
    panels.thumb.setStatus("loading", "サムネイル情報を取得中です...");
    panels.thumb.setSummaryContent(null);
    panels.media.setStatus("loading", "MediaInfoを取得中です...");
    panels.media.setSummaryContent(null);
    try {
      const [apiData, cacheInfo, thumbInfo, mediaInfo] = await Promise.all([
        fetchWatchApiData(videoId),
        fetchCacheInfo(videoId),
        fetchThumbInfo(videoId),
        fetchMediaInfo(videoId)
      ]);
      panels.watch.setStatus("success", "apiDataを取得しました");
      panels.watch.setSummaryContent(buildApiSummary(apiData));
      panels.watch.setJsonData(apiData);
      panels.cache.setStatus("success", "キャッシュ情報を取得しました");
      panels.cache.setSummaryContent(buildCacheSummary(cacheInfo));
      panels.cache.setJsonData(cacheInfo);
      panels.thumb.setStatus("success", "サムネイル情報を取得しました");
      panels.thumb.setSummaryContent(buildThumbSummary(thumbInfo));
      panels.thumb.setJsonData(thumbInfo);
      panels.media.setStatus("success", "MediaInfoを取得しました");
      panels.media.setSummaryContent(buildMediaSummary(mediaInfo));
      panels.media.setJsonData(mediaInfo);
      setStatusText(globalStatus, "データ取得が完了しました");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      window.logger?.error?.("[movie-info] data load failed", message);
      setStatusText(globalStatus, "データ取得に失敗しました: " + message);
      if (!panels.watch) {
        return;
      }
      panels.watch.setStatus("error", message);
      panels.cache.setStatus("error", message);
      panels.thumb.setStatus("error", message);
      panels.media.setStatus("error", message);
    }
  };
  const handleCommentFetch = async () => {
    if (!currentVideoId || !commentButton) {
      return;
    }
    commentButton.disabled = true;
    commentButton.textContent = "取得中...";
    panels.comments.setStatus("loading", "コメントを取得中です...");
    try {
      const data = await fetchCommentsWithApi(currentVideoId);
      const preview = createCommentPreview(data);
      panels.comments.setStatus("success", "コメントを取得しました");
      panels.comments.setSummaryContent(buildCommentSummary(preview));
      panels.comments.setJsonData(preview);
      const descriptor = {
        fileName: currentVideoId + "-comments.json",
        payloadSupplier: () => JSON.stringify(data, null, 2)
      };
      panels.comments.setDownloadDescriptor(descriptor);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      panels.comments.setStatus("error", "コメント取得に失敗しました: " + message);
      panels.comments.setDownloadDescriptor(null);
    }
    setCommentButtonIdle();
  };
  if (loadButton) {
    loadButton.addEventListener("click", () => {
      const inputValue = videoInput ? videoInput.value : "";
      const normalized = normalizeVideoIdFromInput(inputValue);
      if (!normalized) {
        setStatusText(globalStatus, "動画IDを正しく入力してください");
        return;
      }
      if (videoInput) {
        videoInput.value = normalized;
      }
      void handleLoad(normalized);
    });
  }
  if (videoInput) {
    videoInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        if (loadButton) {
          loadButton.click();
        }
      }
    });
  }
  if (commentButton) {
    commentButton.addEventListener("click", () => {
      void handleCommentFetch();
    });
  }
  const initialVideoId = window.commonHelper?.getVideoIdWithFallback?.() || normalizeVideoIdFromInput(window.location.search) || null;
  if (initialVideoId) {
    if (videoInput) {
      videoInput.value = initialVideoId;
    }
    void handleLoad(initialVideoId);
  } else {
    setStatusText(globalStatus, "動画IDを入力してデータを取得してください");
    setCommentButtonIdle();
  }
});
//# sourceMappingURL=movie-info.es.js.map
