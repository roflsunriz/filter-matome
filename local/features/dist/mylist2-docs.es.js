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

const MYLIST2_DOCS_HEADER_ADJUSTMENT_STYLES = `
/**
 * Mylist2 Docs専用のヘッダー位置調整
 * CSS Custom Propertiesを上書きして環境に最適化
 */

:root {
  /* mylist2 docs環境での位置調整 */
  --header-offset-top: var(--header-mylist2-docs-top, -8px);
  --header-offset-left: var(--header-mylist2-docs-left, -8px);
}
`;
const MYLIST2_DOCS_STYLES = `
        body {
            font-family: "Helvetica Neue", Arial, "Hiragino Kaku Gothic ProN", "Hiragino Sans", Meiryo, sans-serif;
            line-height: 1.6;
            color: #ffffff;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 50%, #3498db 100%);
        }
        
        .container {
            background: #2d2d2d;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.5);
            border: 1px solid rgba(77, 208, 225, 0.3);
            padding: 40px;
            margin-bottom: 20px;
        }
        
        h1 {
            color: #4dd0e1;
            border-bottom: 3px solid #3498db;
            padding-bottom: 10px;
            margin-bottom: 30px;
        }
        
        h2 {
            color: #3498db;
            border-bottom: 2px solid #4dd0e1;
            padding-bottom: 5px;
            margin-top: 40px;
            margin-bottom: 20px;
        }
        
        h3 {
            color: #4dd0e1;
            margin-top: 30px;
            margin-bottom: 15px;
        }
        
        .feature-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            margin: 20px 0;
        }
        
        .feature-card {
            background: #424242;
            border: 1px solid rgba(77, 208, 225, 0.3);
            border-radius: 8px;
            padding: 20px;
            transition: transform 0.2s;
            color: #b0bec5;
        }
        
        .feature-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0, 188, 212, 0.3);
            border-color: #3498db;
        }
        
        .feature-title {
            color: #4dd0e1;
            font-weight: bold;
            font-size: 1.1em;
            margin-bottom: 10px;
        }
        
        .step {
            background: rgba(0, 188, 212, 0.15);
            border-left: 4px solid #3498db;
            padding: 15px;
            margin: 15px 0;
            border-radius: 0 4px 4px 0;
            color: #b0bec5;
        }
        
        .step-number {
            background: #3498db;
            color: white;
            width: 24px;
            height: 24px;
            border-radius: 50%;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            margin-right: 10px;
        }
        
        .warning {
            background: rgba(255, 193, 7, 0.15);
            border: 1px solid rgba(255, 193, 7, 0.4);
            border-radius: 4px;
            padding: 15px;
            margin: 15px 0;
            color: #ffecb3;
        }
        
        .info {
            background: rgba(0, 188, 212, 0.15);
            border: 1px solid rgba(0, 188, 212, 0.4);
            border-radius: 4px;
            padding: 15px;
            margin: 15px 0;
            color: #b0f7ff;
        }
        
        .code {
            background: #424242;
            border: 1px solid rgba(77, 208, 225, 0.3);
            border-radius: 4px;
            padding: 10px;
            font-family: "Consolas", "Monaco", "Courier New", monospace;
            overflow-x: auto;
            color: #4dd0e1;
        }
        
        .toc {
            background: #2d2d2d;
            border: 1px solid rgba(77, 208, 225, 0.3);
            border-radius: 8px;
            padding: 20px;
            margin: 30px 0;
        }
        
        .toc ul {
            list-style-type: none;
            padding-left: 0;
        }
        
        .toc li {
            margin: 8px 0;
        }
        
        .toc a {
            color: #4dd0e1;
            text-decoration: none;
            padding: 5px 10px;
            display: block;
            border-radius: 4px;
            transition: background-color 0.2s;
        }
        
        .toc a:hover {
            background-color: rgba(0, 188, 212, 0.2);
            color: #3498db;
        }
        
        .screenshot {
            max-width: 100%;
            height: auto;
            border: 1px solid rgba(77, 208, 225, 0.3);
            border-radius: 8px;
            margin: 20px 0;
            box-shadow: 0 2px 8px rgba(0, 188, 212, 0.2);
        }
        
        .button-demo {
            display: inline-block;
            background: #3498db;
            color: white;
            padding: 8px 16px;
            border-radius: 4px;
            text-decoration: none;
            margin: 5px;
            font-size: 0.9em;
            transition: background-color 0.2s;
        }

        .button-demo.warning {
            background: #c0392b;
        }
        
        .button-demo:hover {
            background: #0097a7;
        }
        
        .keyboard-key {
            background: #424242;
            border: 1px solid rgba(77, 208, 225, 0.3);
            border-radius: 3px;
            padding: 2px 6px;
            font-family: monospace;
            font-size: 0.9em;
            color: #4dd0e1;
        }
        
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
        }
        
        th, td {
            border: 1px solid rgba(77, 208, 225, 0.3);
            padding: 12px;
            text-align: left;
        }
        
        th {
            background-color: #2d2d2d;
            font-weight: bold;
            color: #4dd0e1;
        }
        
        td {
            color: #b0bec5;
        }
        
        tr:nth-child(even) {
            background-color: rgba(66, 66, 66, 0.3);
        }
        
        .footer {
            text-align: center;
            color: #b0bec5;
            font-size: 0.9em;
            padding: 20px;
            border-top: 1px solid rgba(77, 208, 225, 0.3);
            margin-top: 40px;
        }
      `;
const MYLIST2_DOCS_STYLES_UNIFIED = materialIconsStyles + MYLIST2_DOCS_HEADER_ADJUSTMENT_STYLES + MYLIST2_DOCS_STYLES;
const applyMylist2DocsStyles = () => {
  const styleElement = document.createElement("style");
  styleElement.textContent = MYLIST2_DOCS_STYLES_UNIFIED;
  document.head.appendChild(styleElement);
  return styleElement;
};

applyMylist2DocsStyles();
window.addEventListener("load", () => {
  if (typeof window.NicoCommon === "undefined") {
    window.logger.error("NicoCommon is not loaded. Please ensure common module is loaded before mylist2.");
    return;
  }
  window.NicoCommon.createHeader("headerContainer", {
    title: "Mylist2 README",
    showSearch: true,
    showMoreLinks: true,
    enableFixedMode: false
  });
});
//# sourceMappingURL=mylist2-docs.es.js.map
