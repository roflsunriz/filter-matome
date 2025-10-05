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
  close: "close",
  settings: "settings",
  filter: "filter_list",
  save: "save",
  clear: "clear_all",
  export: "file_download",
  import: "file_upload",
  debug: "bug_report",
  visibility: "visibility",
  visibility_off: "visibility_off",
  warning: "warning_amber",
  check: "check_circle",
  error: "error",
  info: "info",
  comment: "comment",
  delete: "delete",
  edit: "edit",
  folder: "folder_open",
  refresh: "refresh",
  push_pin: "push_pin",
  play: "play_arrow",
  pause: "pause",
  stop: "stop",
  volume_up: "volume_up",
  volume_down: "volume_down",
  volume_off: "volume_off",
  fullscreen: "fullscreen",
  fullscreen_exit: "fullscreen_exit",
  search: "search",
  menu: "menu",
  home: "home",
  bookmark: "bookmark",
  favorite: "favorite",
  share: "share",
  more_vert: "more_vert",
  more_horiz: "more_horiz",
  // 追加アイコン（絵文字置き換え用）
  assignment: "assignment",
  star: "star",
  menu_book: "menu_book",
  flash_on: "flash_on",
  keyboard: "keyboard",
  build: "build",
  science: "science",
  help: "help",
  videocam: "videocam",
  analytics: "analytics",
  public: "public",
  movie: "movie",
  text_fields: "text_fields",
  gps_fixed: "gps_fixed",
  lightbulb: "lightbulb",
  rocket_launch: "rocket_launch",
  live_tv: "live_tv",
  image: "image",
  tv: "tv",
  trending_up: "trending_up",
  video_library: "video_library",
  whatshot: "whatshot",
  download: "download",
  schedule: "schedule",
  cloud_upload: "cloud_upload",
  cloud_download: "cloud_download",
  upload: "upload"
};
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

// スタイルを動的に追加
      const styleSheet = document.createElement('style');
      styleSheet.textContent = materialIconsStyles;
      document.head.appendChild(styleSheet);

const MYLIST_MANAGER_STYLES_PART1 = `
/* Theme variables (scoped to Mylist2 root) */
.custom-mylist2-manager {
  /* base defaults (dark-blue) */
  --cml2-bg: #1a1b1c;
  --cml2-text: #ffffff;
  --cml2-panel: #2a2b2c;
  --cml2-border: #333333;
  --cml2-muted: #888888;
  --cml2-muted-strong: #666666;
  --cml2-accent: #2a88bd;
  --cml2-accent-hover: #3498db;
  --cml2-danger: #e74c3c;
  --cml2-danger-hover: #c0392b;
  --cml2-focus-ring: rgba(52, 152, 219, 0.3);
  --cml2-link: #1976d2;
  --cml2-link-hover: #1565c0;
  --cml2-scrollbar-thumb: #666666;
  --cml2-scrollbar-track: var(--cml2-panel);
  --cml2-text-soft: #dddddd;
  --cml2-border-success: #27ae60;
  --cml2-border-danger: #e74c3c;
  --cml2-border-warning: #f39c12;
  --cml2-border-info: #3498db;
}

/* Theme presets */
.cml2-theme-dark-blue { /* defaults already match */ }
.cml2-theme-dark-green {
  --cml2-accent: #27ae60;
  --cml2-accent-hover: #2ecc71;
  --cml2-focus-ring: rgba(39, 174, 96, 0.3);
}
.cml2-theme-dark-amber {
  --cml2-accent: #f39c12;
  --cml2-accent-hover: #f1c40f;
  --cml2-focus-ring: rgba(243, 156, 18, 0.3);
}
.cml2-theme-dark-violet {
  --cml2-accent: #8e44ad;
  --cml2-accent-hover: #9b59b6;
  --cml2-focus-ring: rgba(142, 68, 173, 0.3);
}
.cml2-theme-dark-red {
  --cml2-accent: #e74c3c;
  --cml2-accent-hover: #c0392b;
  --cml2-focus-ring: rgba(231, 76, 60, 0.3);
}

.mylist-item {
  padding: 12px;
  cursor: pointer;
  border-bottom: 1px solid var(--cml2-border);
  transition: background-color 0.2s;
}

.mylist-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.mylist-details {
  flex: 1;
}

.mylist-count-mylist-tab,
.mylist-count {
  font-size: 12px;
  color: var(--cml2-muted);
  margin-left: 8px;
  padding: 2px 6px;
}

.mylist-count-mylist-tab {
  background: var(--cml2-panel);
  border-radius: 4px;
}

.mylist-name {
  display: block;
  font-weight: bold;
  margin-bottom: 4px;
}

.mylist-date {
  font-size: 12px;
  color: var(--cml2-muted);
}

.mylist-controls {
  display: flex;
  gap: 8px;
}

.mylist-item:hover {
  background: var(--cml2-panel);
}

.mylist-item.active {
  background: var(--cml2-accent);
}

/* 既存スタイルに追加 */

.custom-mylist2-manager {
  display: flex;
  position: fixed;
  top: 52%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 97%;
  height: 87%;
  background: var(--cml2-bg);
  color: var(--cml2-text);
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
  z-index: 8000;
}

.mylist-sidebar {
  width: 250px;
  border-right: 1px solid var(--cml2-border);
  padding: 15px;
  display: flex;
  flex-direction: column;
  height: 95%;
}

.mylist-main {
  flex: 1;
  padding: 15px;
  display: flex;
  flex-direction: column;
}

.mylist-controls {
  margin-bottom: 15px;
}

.video-list {
  flex: 1;
  overflow-y: auto;
}

.video-item {
  display: flex;
  align-items: center;
  padding: 10px;
  border-bottom: 1px solid var(--cml2-border);
  gap: 10px;
}

.video-thumbnail {
  width: 96px;
  height: 72px;
  object-fit: cover;
}

.video-info {
  flex: 1;
  padding: 5px;
}

.video-title {
  font-weight: bold;
  margin-bottom: 5px;
}

.video-author {
  font-size: 12px;
  color: var(--cml2-muted);
  margin-bottom: 2px;
}

.video-upload-date {
  font-size: 12px;
  color: var(--cml2-muted);
  margin-bottom: 5px;
}

.video-stats {
  font-size: 12px;
  color: var(--cml2-muted);
}

.video-stats span:not(:last-child) {
  margin-right: 15px;
}

/* フォーム要素のスタイル */
input[type="text"],
select {
  background: var(--cml2-panel);
  border: 1px solid var(--cml2-border);
  color: var(--cml2-text);
  padding: 8px;
  border-radius: 4px;
}

#searchOption {
  margin-right: 10px;
}

#mylistSortType {
  margin-top: 10px;
}

button {
  background: var(--cml2-accent);
  color: var(--cml2-text);
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
}

button:hover {
  background: var(--cml2-accent-hover);
}

button.danger {
  background: var(--cml2-danger);
}

button.danger:hover {
  background: var(--cml2-danger-hover);
}
`;
const MYLIST_MANAGER_STYLES_PART2 = `
/* メインコンテンツ領域のスタイル */
.mylist-main {
  padding: 20px;
  background: var(--cml2-bg);
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

/* マイリスト情報セクション */
.current-mylist-info {
  display: flex;
  gap: 10px;
  align-items: center;
  padding: 15px;
  background: var(--cml2-panel);
  border-radius: 6px;
  margin-bottom: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

.mylist-name-edit {
  flex: 1;
  padding: 8px 12px;
  background: var(--cml2-bg);
  border: 1px solid var(--cml2-border);
  border-radius: 4px;
  font-size: 14px;
  color: var(--cml2-text);
}

.current-mylist-info button {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.current-mylist-info button:not(.danger) {
  background: var(--cml2-accent);
  color: var(--cml2-text);
}

.current-mylist-info button.danger {
  background: var(--cml2-danger);
  color: var(--cml2-text);
}

.current-mylist-info button:hover {
  opacity: 0.9;
}

/* インポート・エクスポートコントロール */
.import-export-controls {
  display: flex;
  gap: 10px;
  margin-left: auto;
}

.import-export-controls button {
  background: var(--cml2-accent);
}

/* 動画追加フォーム */
.video-add-form {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
  padding: 15px;
  background: var(--cml2-panel);
  border-radius: 6px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

.video-add-form input {
  flex: 1;
  padding: 8px 12px;
  background: var(--cml2-bg);
  border: 1px solid var(--cml2-border);
  border-radius: 4px;
  font-size: 14px;
  color: var(--cml2-text);
}

.video-add-form button {
  padding: 8px 20px;
  background: var(--cml2-accent);
  color: var(--cml2-text);
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.video-add-form button:hover {
  background: var(--cml2-accent-hover);
}

/* 動画一覧コントロール */
.video-list-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 15px;
  padding: 15px;
  background: var(--cml2-panel);
  border-radius: 6px;
  margin-bottom: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

/* 常時表示の動画一覧コントロール */
.video-list-controls.always-visible {
  position: relative;
  z-index: 8000;
  background: rgba(42, 43, 44, 0.98);
  backdrop-filter: blur(10px);
  border: 1px solid var(--cml2-border);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

/* 常時表示コントロールのレスポンシブ調整 */
@media (max-width: 1024px) {
  .video-list-controls.always-visible {
    flex-wrap: wrap;
    gap: 10px;
  }
}

@media (max-width: 768px) {
  .video-list-controls.always-visible {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
    padding: 12px;
  }
  
  .video-list-controls.always-visible select,
  .video-list-controls.always-visible .search-container,
  .video-list-controls.always-visible .video-selection-controls,
  .video-list-controls.always-visible .bulk-action-controls {
    width: 100%;
  }
}

@media (max-width: 480px) {
  .video-list-controls.always-visible {
    padding: 10px;
    margin-bottom: 10px;
  }
}

.video-selection-controls {
  display: flex;
  gap: 8px;
}

#videoSortType {
  min-width: 200px;
}

/* 一括操作コントロール */
.bulk-action-controls {
  display: flex;
  gap: 10px;
  align-items: center;
}

.bulk-action-controls select {
  min-width: 200px;
}

.bulk-action-controls button {
  padding: 8px 16px;
  background: var(--cml2-accent);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.bulk-action-controls button:hover {
  background: var(--cml2-accent-hover);
}

/* ホバーエフェクト */
button:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

/* フォーカス時のスタイル */
input:focus,
select:focus {
  outline: none;
  border-color: var(--cml2-accent);
  box-shadow: 0 0 0 2px var(--cml2-focus-ring);
}

/* プレースホルダーのスタイル */
input::placeholder {
  color: var(--cml2-muted-strong);
}

/* スクロールバーのスタイル */
.video-list::-WebKit-scrollbar {
  width: 8px;
}

.video-list::-WebKit-scrollbar-track {
  background: var(--cml2-bg);
}

.video-list::-WebKit-scrollbar-thumb {
  background: var(--cml2-border);
  border-radius: 4px;
}

.video-list::-WebKit-scrollbar-thumb:hover {
  background: var(--cml2-border);
}
`;
const MYLIST_MANAGER_STYLES_PART3 = `
/* 進捗モーダルのスタイル */
.progress-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  /* 進捗は背面。お知らせ(.cml2-alert-modal: z-index 99999)が前面 */
  z-index: 9500;
}

.progress-content {
  background: white;
  padding: 2em;
  border-radius: 8px;
  text-align: center;
}

.progress-circle {
  position: relative;
  width: 150px;
  height: 150px;
  margin: 1em auto;
}

.circular-progress {
  transform: rotate(-90deg);
  width: 100%;
  height: 100%;
}

.progress {
  stroke-dasharray: 100;
  stroke-dashoffset: 100;
  transition: stroke-dashoffset 0.3s ease;
}

.progress-text {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 1.5em;
  font-weight: bold;
}

.progress-status {
  margin-top: 1em;
  color: var(--cml2-muted-strong);
}

/* ヘッダースタイル */
/* ヘッダー関連のスタイルは共通モジュールに移動しました */

/* メインコンテンツの調整 */
.custom-mylist2-manager {
  margin-top: 10px;
  padding-top: 10px;
}

.cml2-video-link {
  color: var(--cml2-link);
  text-decoration: none;
  display: inline-block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cml2-video-link:hover {
  color: var(--cml2-link-hover);
  text-decoration: underline;
}

/* ボタンの共通スタイルを独自の名前空間付きに変更 */
.cml2-btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  transition: background-color 0.2s;
  color: var(--cml2-text);
  background: var(--cml2-accent);
}

.cml2-btn:hover {
  background: var(--cml2-accent-hover);
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

/* 危険な操作用ボタンスタイル - 詳細度を上げる */
.current-mylist-info .cml2-btn.cml2-btn-danger,
.video-actions .delete-video,
.video-actions .delete-keyword {
  background: var(--cml2-danger);
}

.current-mylist-info .cml2-btn.cml2-btn-danger:hover,
.video-actions .delete-video:hover,
.video-actions .delete-keyword:hover {
  background: var(--cml2-danger-hover);
}

.cml2-video-link {
  color: var(--cml2-link);
  text-decoration: none;
  display: inline-block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cml2-video-link:hover {
  color: var(--cml2-link-hover);
  text-decoration: underline;
}

/* マイリストサイドバーのスクロール設定 */
.mylist-list {
  flex: 1;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: var(--cml2-scrollbar-thumb) var(--cml2-scrollbar-track);
  margin-top: 15px;
}

/* WebKit系ブラウザ用のスクロールバー スタイル */
.mylist-list::-WebKit-scrollbar {
  width: 8px;
}

.mylist-list::-WebKit-scrollbar-track {
  background: var(--cml2-scrollbar-track);
}

.mylist-list::-WebKit-scrollbar-thumb {
  background-color: var(--cml2-scrollbar-thumb);
  border-radius: 4px;
}
`;
const MYLIST_MANAGER_STYLES_PART4 = `
/* モーダルダイアログのスタイル */
.cml2-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 99999;
}

.cml2-modal-content {
  background: var(--cml2-bg, #1a1b1c);
  color: var(--cml2-text, #ffffff);
  padding: 20px;
  border-radius: 8px;
  min-width: 300px;
  max-width: 90%;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.5);
}

.cml2-modal-title {
  margin: 0 0 15px 0;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--cml2-border, #333333);
}

.cml2-modal-body {
  margin-bottom: 20px;
}

.cml2-modal-footer {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}

.video-details-body {
  max-height: 60vh;
  overflow: auto;
}

.video-details-section {
  margin-top: 8px;
}

.video-description {
  white-space: pre-wrap;
  background: var(--cml2-panel, #2a2b2c);
  color: var(--cml2-text, #ffffff);
  border: 1px solid var(--cml2-border, #333333);
  border-radius: 6px;
  padding: 8px;
}

.video-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.video-tags .cml2-tag {
  display: inline-block;
  background: var(--cml2-panel, #2a2b2c);
  border: 1px solid var(--cml2-border, #333333);
  border-radius: 12px;
  padding: 2px 8px;
  color: var(--cml2-text-soft, #dddddd);
}

/* セレクトボックスのスタイル */
.cml2-select {
  width: 100%;
  padding: 8px;
  background: var(--cml2-panel, #2a2b2c);
  border: 1px solid var(--cml2-border, #333333);
  color: var(--cml2-text, #ffffff);
  border-radius: 4px;
  margin-bottom: 15px;
}

.cml2-select option {
  background: var(--cml2-bg, #1a1b1c);
  color: var(--cml2-text, #ffffff);
}

/* 検索コンテナのスタイル */
.search-container {
  display: flex;
  align-items: center;
  gap: 8px;
}

.search-container input {
  flex: 1;
  padding: 8px 12px;
  background: var(--cml2-bg);
  border: 1px solid var(--cml2-border);
  border-radius: 4px;
  color: var(--cml2-text);
  font-size: 14px;
  min-width: 0; /* flexアイテムの最小幅を0に設定 */
}

.search-container input::placeholder {
  color: var(--cml2-muted);
}

.search-clear-btn {
  background: var(--cml2-muted-strong);
  border: none;
  padding: 8px;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 32px;
  height: 32px;
  transition: background-color 0.2s;
}

.search-clear-btn:hover {
  background: var(--cml2-muted);
}

.search-clear-btn .material-icon {
  width: 16px;
  height: 16px;
}

/* 検索欄のスタイル（後方互換性のため残す）*/
.mylist-search,
.video-search {
  margin: 10px 0;
  padding: 0 10px;
}

.mylist-search input,
.video-search input {
  width: 93%;
  padding: 8px 12px;
  background: var(--cml2-bg);
  border: 1px solid var(--cml2-border);
  border-radius: 4px;
  color: var(--cml2-text);
  font-size: 14px;
}

.mylist-search input::placeholder,
.video-search input::placeholder {
  color: var(--cml2-muted);
}

/* 非表示アイテムのスタイル */
.mylist-item.hidden,
.video-item.hidden {
  display: none;
}

/* プログレスサークルのスタイル */
.circular-progress path.progress {
  stroke-dasharray: 100; /* 円周の長さを100単位で設定 */
  stroke-dashoffset: 100; /* 初期状態では完全に非表示 */
  transition: stroke-dashoffset 0.3s ease; /* アニメーション効果を追加 */
  transform: rotate(-90deg); /* 開始位置を12時の位置に調整 */
  transform-origin: center; /* 回転の中心を設定 */
}

#createNewMylist {
  font-size: 10px;
}

.keyword-icon {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--cml2-scrollbar-thumb);
  border-radius: 4px;
}

.keyword-icon svg {
  fill: var(--cml2-muted-strong);
}

.keyword-links a {
  margin-right: 1em;
  color: var(--cml2-link);
  text-decoration: none;
}

.keyword-links a:hover {
  text-decoration: underline;
}

.keyword-text,
.keyword-added-date {
  font-weight: bold;
  color: var(--cml2-text-soft);
}

/* キーワード編集モーダルのスタイル */
#keywordEditModal.modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 99999;
}

#keywordEditModal .modal-content {
  background: var(--cml2-bg, #1a1b1c);
  color: var(--cml2-text, #ffffff);
  padding: 20px;
  border-radius: 8px;
  min-width: 300px;
  max-width: 90%;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.5);
  position: relative;
}

#keywordEditModal h2 {
  margin: 0 0 15px 0;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--cml2-border);
  font-size: 1.2em;
}

#keywordEditModal .close-button {
  position: absolute;
  right: 10px;
  top: 10px;
  font-size: 24px;
  color: var(--cml2-muted);
  cursor: pointer;
  transition: color 0.2s;
}

#keywordEditModal .close-button:hover {
  color: var(--cml2-text);
}

#keywordEditModal #editKeywordInput {
  width: 100%;
  padding: 8px 12px;
  background: var(--cml2-panel);
  border: 1px solid var(--cml2-border);
  border-radius: 4px;
  color: var(--cml2-text);
  font-size: 14px;
  margin-bottom: 15px;
  box-sizing: border-box;
}

#keywordEditModal #editKeywordInput:focus {
  outline: none;
  border-color: var(--cml2-accent);
  box-shadow: 0 0 0 2px var(--cml2-focus-ring);
}

#keywordEditModal #saveKeywordEdit {
  padding: 8px 16px;
  background: var(--cml2-accent);
  color: var(--cml2-text);
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 14px;
}

#keywordEditModal #saveKeywordEdit:hover {
  background: var(--cml2-accent-hover);
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

/* カスタムアラートモーダルのスタイル */
.cml2-alert-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.7);
  display: none;
  justify-content: center;
  align-items: center;
  z-index: 99999;
}

.cml2-alert-content {
  background: var(--cml2-bg, #1a1b1c);
  color: var(--cml2-text, #ffffff);
  padding: 20px;
  border-radius: 8px;
  min-width: 300px;
  max-width: 90%;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.5);
}

.cml2-alert-title {
  margin: 0 0 15px 0;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--cml2-border, #333333);
  font-size: 1.2em;
}

.cml2-alert-message {
  margin-bottom: 20px;
  line-height: 1.5;
}

.cml2-alert-buttons {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}

/* アラートタイプによる色分け */
.cml2-alert-content.success {
  border-left: 4px solid var(--cml2-border-success, #27ae60);
}

.cml2-alert-content.error {
  border-left: 4px solid var(--cml2-border-danger, #e74c3c);
}

.cml2-alert-content.warning {
  border-left: 4px solid var(--cml2-border-warning, #f39c12);
}

.cml2-alert-content.info {
  border-left: 4px solid var(--cml2-border-info, #3498db);
}
`;
const COLLAPSIBLE_CONTROLS_STYLES = `
/* ホバーエリア */
.control-hover-area {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 20px;
  z-index: 8100;
  background: linear-gradient(180deg, rgba(26, 27, 28, 0.1) 0%, transparent 100%);
  cursor: pointer;
  opacity: 0.3;
  transition: opacity 0.2s ease;
}

.control-hover-area:hover {
  opacity: 0.6;
}

/* 折りたたみ可能なコントロールエリア */
.collapsible-controls {
  position: relative;
  z-index: 8050;
  background: rgba(26, 27, 28, 0.98);
  color: var(--cml2-text);
  backdrop-filter: blur(10px);
  max-height: 0;
  opacity: 0;
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  transform: translateY(-10px);
  border-radius: 8px;
}

/* ホバー時の表示 */
.control-hover-area:hover + .collapsible-controls,
.collapsible-controls:hover {
  max-height: 800px;
  opacity: 1;
  transform: translateY(0);
}

/* モバイル用の調整 */
@media (max-width: 768px) {
  .control-hover-area {
    height: 30px;
    background: linear-gradient(180deg, rgba(26, 27, 28, 0.2) 0%, transparent 100%);
  }
  
  .collapsible-controls {
    background: rgba(26, 27, 28, 0.99);
  }
  
  /* 常時表示設定のモバイル調整 */
  .controls-toggle-setting {
    margin-left: 8px;
  }
  
  .controls-toggle-label {
    font-size: 11px;
  }
  
  /* タッチデバイスでも使いやすくするため、フォーカス時も表示 */
  .collapsible-controls:focus-within {
    max-height: 800px;
    opacity: 1;
    transform: translateY(0);
  }
}

/* サイドバー内要素の統一 */
#newMylistName {
  width: 100%;
  box-sizing: border-box;
}

#createNewMylist {
  width: 64px;
  box-sizing: border-box;
}

#mylistSearchInput {
  width: 100%;
  box-sizing: border-box;
}

#mylistSearchClear {
  width: 58px;
  box-sizing: border-box;
}

#mylistSortType {
  width: 100%;
  box-sizing: border-box;
}

/* 小さい画面での動画リスト拡張 */
@media (max-width: 1024px) {
  .mylist-main {
    position: relative;
  }
  
  #videoList {
    margin-top: 0;
    max-height: calc(100vh - 120px);
    overflow-y: auto;
  }
}

/* ホバーエリアのヒント表示 */
.control-hover-area::after {
  content: "ホバーでコントロールを表示";
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 11px;
  color: rgba(255, 255, 255, 0.6);
  background: rgba(42, 43, 44, 0.9);
  padding: 2px 8px;
  border-radius: 12px;
  opacity: 0;
  transition: opacity 0.2s ease;
  pointer-events: none;
  border: 1px solid var(--cml2-border);
}

.control-hover-area:hover::after {
  opacity: 1;
}

/* アニメーションの最適化 */
.collapsible-controls * {
  will-change: auto;
}

.collapsible-controls.transitioning {
  will-change: transform, opacity, max-height;
}

/* 小さい画面でのデバイス最適化 */
@media (max-width: 480px) {
  .control-hover-area {
    height: 40px;
  }
  
  .control-hover-area::after {
    content: "タッチでコントロールを切り替え";
    font-size: 12px;
    color: rgba(255, 255, 255, 0.7);
    background: rgba(42, 43, 44, 0.95);
  }
  
  .collapsible-controls {
    padding: 10px;
  }
  
  .current-mylist-info,
  .video-add-form,
  .video-list-controls {
    margin-bottom: 10px;
  }
}



/* コントロール用ボタンスタイルを統一 */
.collapsible-controls .cml2-btn,
.collapsible-controls button {
  background: var(--cml2-accent);
  color: var(--cml2-text);
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.collapsible-controls .cml2-btn:hover,
.collapsible-controls button:hover {
  background: var(--cml2-accent-hover);
}

.collapsible-controls .cml2-btn.cml2-btn-danger {
  background: var(--cml2-danger);
}

.collapsible-controls .cml2-btn.cml2-btn-danger:hover {
  background: var(--cml2-danger-hover);
}

/* インプット要素のスタイル統一 */
.collapsible-controls input[type="text"],
.collapsible-controls select {
  background: var(--cml2-panel);
  border: 1px solid var(--cml2-border);
  color: var(--cml2-text);
  padding: 8px 12px;
  border-radius: 4px;
}

.collapsible-controls input[type="text"]:focus,
.collapsible-controls select:focus {
  outline: none;
  border-color: var(--cml2-accent);
  box-shadow: 0 0 0 2px var(--cml2-focus-ring);
}

/* 常時表示設定のスタイル */
.controls-toggle-setting {
  display: flex;
  align-items: center;
  margin-left: 10px;
}

.controls-toggle-label {
  display: flex;
  align-items: center;
  cursor: pointer;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.8);
  user-select: none;
  transition: color 0.2s ease;
}

.controls-toggle-label:hover {
  color: rgba(255, 255, 255, 1);
}

.controls-toggle-checkbox {
  width: 16px;
  height: 16px;
  margin-right: 6px;
  background: var(--cml2-panel);
  border: 1px solid var(--cml2-border);
  border-radius: 3px;
  cursor: pointer;
  position: relative;
  appearance: none;
  transition: all 0.2s ease;
}

.controls-toggle-checkbox:checked {
  background: var(--cml2-accent);
  border-color: var(--cml2-accent);
}

.controls-toggle-checkbox:checked::after {
  content: "✓";
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: white;
  font-size: 12px;
  font-weight: bold;
}

.controls-toggle-checkbox:focus {
  outline: none;
  box-shadow: 0 0 0 2px var(--cml2-focus-ring);
}

.controls-toggle-text {
  white-space: nowrap;
}

/* 常時表示モードのまとめ */
.collapsible-controls.always-visible {
  max-height: none !important;
  opacity: 1 !important;
  transform: translateY(0) !important;
}

/* 常時表示モード時はホバーエリアを非表示 */
.control-hover-area.always-visible-mode {
  display: none;
}
`;
const MYLIST_MANAGER_STYLES = `
${MYLIST_MANAGER_STYLES_PART1}

${MYLIST_MANAGER_STYLES_PART2}

${MYLIST_MANAGER_STYLES_PART3}

${MYLIST_MANAGER_STYLES_PART4}

${COLLAPSIBLE_CONTROLS_STYLES}
`;
const applyMylistManagerStyles = () => {
  const styleElement = document.createElement("style");
  styleElement.textContent = MYLIST_MANAGER_STYLES;
  document.head.appendChild(styleElement);
  return styleElement;
};

const MYLIST2_HEADER_ADJUSTMENT_STYLES = `
/**
 * Mylist2環境専用のヘッダー位置調整
 * CSS Custom Propertiesを上書きして各環境に最適化
 */

:root {
  /* mylist2環境での位置調整 */
  --header-offset-top: var(--header-mylist2-top);
  --header-offset-left: var(--header-mylist2-left);
}
`;
const headerAdjustments = () => {
  const styleElement = document.createElement("style");
  styleElement.textContent = MYLIST2_HEADER_ADJUSTMENT_STYLES;
  document.head.appendChild(styleElement);
  return styleElement;
};

class Mylist2DB {
  toMessage(value) {
    if (value && typeof value.message === "string") {
      return value.message;
    }
    try {
      return String(value);
    } catch {
      return "Unknown error";
    }
  }
  constructor() {
    this.dbName = "Mylist2DB";
    this.version = 8;
    this.migrationSteps = this.initializeMigrationSteps();
  }
  // マイグレーションステップを初期化
  initializeMigrationSteps() {
    return [
      {
        version: 1,
        description: "初期データベース構造の作成",
        execute: async (db) => {
          await Promise.resolve();
          this.createInitialStores(db);
        }
      },
      {
        version: 4,
        description: "マネージャーストアの追加",
        execute: async (db) => {
          await Promise.resolve();
          if (!db.objectStoreNames.contains("manager")) {
            db.createObjectStore("manager", { keyPath: "id" });
          }
        }
      },
      {
        version: 5,
        description: "キーワードストアの追加",
        execute: async (db) => {
          await Promise.resolve();
          if (!db.objectStoreNames.contains("keywords")) {
            const keywordStore = db.createObjectStore("keywords", {
              keyPath: "id",
              autoIncrement: true
            });
            keywordStore.createIndex("mylistId", "mylistId", { unique: false });
            keywordStore.createIndex("keyword", "keyword", { unique: false });
            keywordStore.createIndex("addedAt", "addedAt", { unique: false });
          }
        }
      },
      {
        version: 6,
        description: "データベースメタデータストアの追加",
        execute: async (db, transaction) => {
          if (!db.objectStoreNames.contains("metadata")) {
            db.createObjectStore("metadata", { keyPath: "key" });
          }
          const store = transaction.objectStore("metadata");
          await new Promise((resolve, reject) => {
            const initData = [
              { key: "created_at", value: (/* @__PURE__ */ new Date()).toISOString() },
              { key: "last_backup", value: null },
              { key: "health_check_last", value: null },
              { key: "migration_history", value: [] }
            ];
            let completed = 0;
            initData.forEach((data) => {
              const request = store.put(data);
              request.onsuccess = () => {
                completed++;
                if (completed === initData.length) {
                  resolve();
                }
              };
              request.onerror = () => reject(new Error(this.toMessage(request.error)));
            });
          });
        }
      },
      {
        version: 7,
        description: "videosストアにtagsインデックスを追加",
        execute: async (db, transaction) => {
          await Promise.resolve();
          if (db.objectStoreNames.contains("videos")) {
            const store = transaction.objectStore("videos");
            const hasTagsIndex = Array.from(store.indexNames).includes("tags");
            if (!hasTagsIndex) {
              store.createIndex("tags", "tags", { unique: false, multiEntry: true });
            }
          }
        }
      }
    ];
  }
  // プログレス報告コールバックを設定
  setProgressCallback(callback) {
    this.onProgressCallback = callback;
  }
  // データベース永続化昇格機能
  async requestPersistence() {
    try {
      if ("storage" in navigator && "persist" in navigator.storage) {
        const persistence = await navigator.storage.persist();
        window.logger?.info("Database persistence requested:", persistence);
        return persistence;
      }
      return false;
    } catch (error) {
      window.logger?.error("Error requesting persistence:", error);
      return false;
    }
  }
  // ストレージ容量監視
  async getStorageEstimate() {
    try {
      if ("storage" in navigator && "estimate" in navigator.storage) {
        const estimate = await navigator.storage.estimate();
        window.logger?.info("Storage estimate:", estimate);
        return estimate;
      }
      return null;
    } catch (error) {
      window.logger?.error("Error getting storage estimate:", error);
      return null;
    }
  }
  // データベース健全性チェック
  async performHealthCheck() {
    const health = {
      isHealthy: true,
      issues: [],
      storageEstimate: await this.getStorageEstimate(),
      persistence: await this.checkPersistence()
    };
    try {
      const db = await this.initDB();
      const expectedStores = ["mylists", "videos", "manager", "keywords", "metadata"];
      for (const storeName of expectedStores) {
        if (!db.objectStoreNames.contains(storeName)) {
          health.issues.push(`Missing store: ${storeName}`);
          health.isHealthy = false;
        }
      }
      const transaction = db.transaction(["mylists", "videos", "keywords"], "readonly");
      const mylistStore = transaction.objectStore("mylists");
      const videoStore = transaction.objectStore("videos");
      const keywordStore = transaction.objectStore("keywords");
      const mylistsRequest = mylistStore.getAll();
      const videosRequest = videoStore.getAll();
      const keywordsRequest = keywordStore.getAll();
      const [mylists, videos, keywords] = await Promise.all([
        new Promise((resolve, reject) => {
          mylistsRequest.onsuccess = () => resolve(mylistsRequest.result);
          mylistsRequest.onerror = () => reject(new Error(this.toMessage(mylistsRequest.error)));
        }),
        new Promise((resolve, reject) => {
          videosRequest.onsuccess = () => resolve(videosRequest.result);
          videosRequest.onerror = () => reject(new Error(this.toMessage(videosRequest.error)));
        }),
        new Promise((resolve, reject) => {
          keywordsRequest.onsuccess = () => resolve(keywordsRequest.result);
          keywordsRequest.onerror = () => reject(new Error(this.toMessage(keywordsRequest.error)));
        })
      ]);
      const mylistIds = new Set(mylists.map((m) => m.id));
      const orphanedVideos = videos.filter((v) => !mylistIds.has(v.mylistId));
      if (orphanedVideos.length > 0) {
        health.issues.push(`Found ${orphanedVideos.length} orphaned videos`);
        health.isHealthy = false;
      }
      const orphanedKeywords = keywords.filter((k) => !mylistIds.has(k.mylistId));
      if (orphanedKeywords.length > 0) {
        health.issues.push(`Found ${orphanedKeywords.length} orphaned keywords`);
        health.isHealthy = false;
      }
      const metadataTransaction = db.transaction(["metadata"], "readwrite");
      const metadataStore = metadataTransaction.objectStore("metadata");
      await new Promise((resolve, reject) => {
        const request = metadataStore.put({
          key: "health_check_last",
          value: (/* @__PURE__ */ new Date()).toISOString()
        });
        request.onsuccess = () => resolve();
        request.onerror = () => reject(new Error(this.toMessage(request.error)));
      });
      db.close();
    } catch (error) {
      health.issues.push(`Health check failed: ${this.toMessage(error)}`);
      health.isHealthy = false;
    }
    return health;
  }
  // 永続化状態確認
  async checkPersistence() {
    try {
      if ("storage" in navigator && "persisted" in navigator.storage) {
        return await navigator.storage.persisted();
      }
      return false;
    } catch (error) {
      window.logger?.error("Error checking persistence:", error);
      return false;
    }
  }
  // データベースバックアップ
  async createBackup() {
    const db = await this.initDB();
    const backup = {
      version: this.version,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      data: {}
    };
    try {
      const storeNames = ["mylists", "videos", "keywords", "manager", "metadata"];
      const transaction = db.transaction(storeNames, "readonly");
      for (const storeName of storeNames) {
        const store = transaction.objectStore(storeName);
        const request = store.getAll();
        backup.data[storeName] = await new Promise((resolve, reject) => {
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(new Error(this.toMessage(request.error)));
        });
      }
      const metadataTransaction = db.transaction(["metadata"], "readwrite");
      const metadataStore = metadataTransaction.objectStore("metadata");
      await new Promise((resolve, reject) => {
        const request = metadataStore.put({
          key: "last_backup",
          value: backup.timestamp
        });
        request.onsuccess = () => resolve();
        request.onerror = () => reject(new Error(this.toMessage(request.error)));
      });
      db.close();
      return JSON.stringify(backup);
    } catch (error) {
      db.close();
      throw error;
    }
  }
  // バックアップからの復元
  async restoreFromBackup(backupData) {
    const backupUnknown = JSON.parse(backupData);
    const backup = backupUnknown;
    const db = await this.initDB();
    try {
      const storeNames = Object.keys(backup.data);
      const transaction = db.transaction(storeNames, "readwrite");
      for (const storeName of storeNames) {
        const store = transaction.objectStore(storeName);
        await new Promise((resolve, reject) => {
          const clearRequest = store.clear();
          clearRequest.onsuccess = () => resolve();
          clearRequest.onerror = () => reject(new Error(this.toMessage(clearRequest.error)));
        });
        const data = backup.data[storeName];
        for (const item of data) {
          await new Promise((resolve, reject) => {
            const putRequest = store.put(item);
            putRequest.onsuccess = () => resolve();
            putRequest.onerror = () => reject(new Error(this.toMessage(putRequest.error)));
          });
        }
      }
      db.close();
      window.logger?.info("Database restored from backup successfully");
    } catch (error) {
      db.close();
      throw error;
    }
  }
  async initDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);
      request.onupgradeneeded = async (event) => {
        const db = event.target.result;
        const oldVersion = event.oldVersion;
        try {
          const stepsToExecute = this.migrationSteps.filter(
            (step) => step.version > oldVersion && step.version <= this.version
          );
          if (this.onProgressCallback) {
            this.onProgressCallback({
              currentStep: 0,
              totalSteps: stepsToExecute.length,
              currentVersion: oldVersion,
              targetVersion: this.version,
              description: "マイグレーション開始"
            });
          }
          for (let i = 0; i < stepsToExecute.length; i++) {
            const step = stepsToExecute[i];
            if (this.onProgressCallback) {
              this.onProgressCallback({
                currentStep: i + 1,
                totalSteps: stepsToExecute.length,
                currentVersion: oldVersion,
                targetVersion: this.version,
                description: step.description
              });
            }
            try {
              await step.execute(db, event.target.transaction);
              window.logger?.info(`Migration step ${step.version} completed: ${step.description}`);
            } catch (error) {
              window.logger?.error(`Migration step ${step.version} failed:`, error);
              throw error;
            }
          }
          if (db.objectStoreNames.contains("metadata")) {
            const transaction = db.transaction(["metadata"], "readwrite");
            const metadataStore = transaction.objectStore("metadata");
            await new Promise((resolve2, reject2) => {
              const getRequest = metadataStore.get("migration_history");
              getRequest.onsuccess = () => {
                const historyRaw = getRequest.result;
                const current = historyRaw && "value" in historyRaw ? historyRaw.value : [];
                const history = Array.isArray(current) ? current : [];
                history.push({
                  from: oldVersion,
                  to: this.version,
                  timestamp: (/* @__PURE__ */ new Date()).toISOString(),
                  steps: stepsToExecute.map((s) => s.version)
                });
                const putRequest = metadataStore.put({
                  key: "migration_history",
                  value: history
                });
                putRequest.onsuccess = () => resolve2();
                putRequest.onerror = () => reject2(new Error(this.toMessage(putRequest.error)));
              };
              getRequest.onerror = () => reject2(new Error(this.toMessage(getRequest.error)));
            });
          }
          if (this.onProgressCallback) {
            this.onProgressCallback({
              currentStep: stepsToExecute.length,
              totalSteps: stepsToExecute.length,
              currentVersion: this.version,
              targetVersion: this.version,
              description: "マイグレーション完了"
            });
          }
        } catch (error) {
          if (this.onProgressCallback) {
            this.onProgressCallback({
              currentStep: 0,
              totalSteps: 0,
              currentVersion: oldVersion,
              targetVersion: this.version,
              description: "マイグレーション失敗",
              error: error?.toString()
            });
          }
          throw error;
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(new Error(this.toMessage(request.error)));
    });
  }
  createInitialStores(db) {
    if (!db.objectStoreNames.contains("mylists")) {
      const mylistStore = db.createObjectStore("mylists", {
        keyPath: "id",
        autoIncrement: true
      });
      mylistStore.createIndex("name", "name", { unique: false });
      mylistStore.createIndex("sortOrder", "sortOrder", { unique: false });
      mylistStore.createIndex("createdAt", "createdAt", { unique: false });
    }
    if (!db.objectStoreNames.contains("videos")) {
      const videoStore = db.createObjectStore("videos", {
        keyPath: "id"
      });
      videoStore.createIndex("mylistId", "mylistId", { unique: false });
      videoStore.createIndex("originalId", "originalId", { unique: false });
      videoStore.createIndex("title", "title", { unique: false });
      videoStore.createIndex("viewCount", "viewCount", { unique: false });
      videoStore.createIndex("commentCount", "commentCount", { unique: false });
      videoStore.createIndex("mylistCount", "mylistCount", { unique: false });
      videoStore.createIndex("addedAt", "addedAt", { unique: false });
      videoStore.createIndex("thumbnailUrl", "thumbnailUrl", { unique: false });
      videoStore.createIndex("uploadedAt", "uploadedAt", { unique: false });
      videoStore.createIndex("authorName", "authorName", { unique: false });
      videoStore.createIndex("length", "length", { unique: false });
      try {
        videoStore.createIndex("tags", "tags", { unique: false, multiEntry: true });
      } catch (e) {
        window.logger?.warn?.("createIndex(tags) skipped:", e);
      }
    }
    if (!db.objectStoreNames.contains("manager")) {
      db.createObjectStore("manager", {
        keyPath: "id"
      });
    }
  }
  // 自動初期化とヘルスチェック
  async initializeWithHealthCheck() {
    const persistence = await this.requestPersistence();
    const db = await this.initDB();
    const health = await this.performHealthCheck();
    return { db, health, persistence };
  }
  // すべてのアプリデータをクリア（メタデータは保持）
  async clearAllData(clearManager = false) {
    const db = await this.initDB();
    try {
      const storeNames = clearManager ? ["mylists", "videos", "keywords", "manager"] : ["mylists", "videos", "keywords"];
      const tx = db.transaction(storeNames, "readwrite");
      await Promise.all(storeNames.map((storeName) => new Promise((resolve, reject) => {
        const store = tx.objectStore(storeName);
        const req = store.clear();
        req.onsuccess = () => resolve();
        req.onerror = () => reject(new Error(this.toMessage(req.error)));
      })));
    } finally {
      db.close();
    }
  }
}

class ApiService {
  constructor() {
    this.apiCache = /* @__PURE__ */ new Map();
    this.apiRequestQueue = [];
    this.isProcessingQueue = false;
    this.API_RATE_LIMIT = 200;
    this.API_REQUEST_LIMIT = 50;
    this.apiRequestCount = 0;
  }
  // APIリクエストのキューイング処理
  async queueApiRequest(videoId) {
    return new Promise((resolve, reject) => {
      this.apiRequestQueue.push({
        videoId,
        resolve,
        reject
      });
      if (!this.isProcessingQueue) {
        void this.processQueue();
      }
    });
  }
  // キューの処理
  async processQueue() {
    if (this.apiRequestQueue.length === 0) {
      this.isProcessingQueue = false;
      return;
    }
    this.isProcessingQueue = true;
    const request = this.apiRequestQueue.shift();
    try {
      if (request) {
        const result = await this._fetchVideoInfo(request.videoId);
        request.resolve(result);
      }
    } catch (error) {
      if (request) {
        request.reject(error instanceof Error ? error : new Error(String(error)));
      }
    }
    await new Promise((resolve) => setTimeout(resolve, this.API_RATE_LIMIT));
    void this.processQueue();
  }
  // 実際のAPI呼び出し（内部用）
  async _fetchVideoInfo(videoId) {
    try {
      const cachedData = this.apiCache.get(videoId);
      if (cachedData) {
        return cachedData;
      }
      const response = await fetch(`https://ext.nicovideo.jp/api/getthumbinfo/${videoId}`);
      const text = await response.text();
      const parser = new DOMParser();
      const xml = parser.parseFromString(text, "text/xml");
      const errorElement = xml.querySelector("error");
      if (errorElement) {
        const description = xml.querySelector("description");
        throw new Error(description?.textContent || "動画情報の取得に失敗しました");
      }
      const thumb = xml.querySelector("thumb");
      if (!thumb) {
        throw new Error("動画情報の取得に失敗しました");
      }
      const lengthElement = thumb.querySelector("length");
      if (!lengthElement || !lengthElement.textContent) {
        throw new Error("動画の長さ情報が取得できませんでした");
      }
      const length = lengthElement.textContent;
      const [minutes, seconds] = length.split(":").map(Number);
      const lengthInSeconds = minutes * 60 + seconds;
      const titleElement = thumb.querySelector("title");
      const descriptionElement = thumb.querySelector("description");
      const viewCountElement = thumb.querySelector("view_counter");
      const commentNumElement = thumb.querySelector("comment_num");
      const mylistCounterElement = thumb.querySelector("mylist_counter");
      const thumbnailUrlElement = thumb.querySelector("thumbnail_url");
      const firstRetrieveElement = thumb.querySelector("first_retrieve");
      const userNicknameElement = thumb.querySelector("user_nickname");
      const chNameElement = thumb.querySelector("ch_name");
      if (!titleElement || !viewCountElement || !commentNumElement || !mylistCounterElement || !thumbnailUrlElement || !firstRetrieveElement) {
        throw new Error("必要な動画情報が取得できませんでした");
      }
      const tagElements = Array.from(thumb.querySelectorAll("tags tag"));
      const tags = tagElements.map((t) => (t.textContent || "").trim()).filter(Boolean);
      const videoInfo = {
        id: videoId,
        title: titleElement.textContent || "不明な動画",
        viewCount: parseInt(viewCountElement.textContent || "0"),
        commentCount: parseInt(commentNumElement.textContent || "0"),
        mylistCount: parseInt(mylistCounterElement.textContent || "0"),
        thumbnailUrl: thumbnailUrlElement.textContent || "",
        uploadedAt: new Date(firstRetrieveElement.textContent || "").getTime(),
        authorName: userNicknameElement?.textContent || chNameElement?.textContent || "不明",
        length: lengthInSeconds,
        description: descriptionElement?.textContent || "",
        tags: tags.length > 0 ? tags : void 0
      };
      this.apiCache.set(videoId, videoInfo);
      return videoInfo;
    } catch (error) {
      throw new Error(`動画情報の取得に失敗しました: ${error instanceof Error ? error.message : "不明なエラー"}`);
    }
  }
  // 公開用のfetchVideoInfo（キューイング処理を使用）
  async fetchVideoInfo(videoId) {
    if (!videoId.match(/^(?:so|sm|nm|nx)\d+$/)) {
      throw new Error("無効な動画IDです");
    }
    return this.queueApiRequest(videoId);
  }
  // 動画情報を取得する関数
  async getVideoInfoFromSources(videoId, existingData = null) {
    const shouldUseApi = this.apiRequestCount < this.API_REQUEST_LIMIT;
    if (existingData) {
      const isComplete = existingData.title && existingData.viewCount !== void 0 && existingData.commentCount !== void 0 && existingData.mylistCount !== void 0 && existingData.thumbnailUrl && existingData.uploadedAt !== void 0 && existingData.authorName && existingData.length !== void 0;
      if (isComplete || !shouldUseApi) {
        return {
          id: videoId,
          title: existingData.title || "不明な動画",
          viewCount: parseInt(String(existingData.viewCount)) || 0,
          commentCount: parseInt(String(existingData.commentCount)) || 0,
          mylistCount: parseInt(String(existingData.mylistCount)) || 0,
          thumbnailUrl: existingData.thumbnailUrl || "",
          uploadedAt: existingData.uploadedAt || Date.now(),
          authorName: existingData.authorName || "不明",
          length: parseInt(String(existingData.length)) || 0
        };
      }
    }
    const cachedData = this.apiCache.get(videoId);
    if (cachedData) {
      return cachedData;
    }
    if (!shouldUseApi) {
      return {
        id: videoId,
        title: existingData?.title || "不明な動画",
        viewCount: parseInt(String(existingData?.viewCount)) || 0,
        commentCount: parseInt(String(existingData?.commentCount)) || 0,
        mylistCount: parseInt(String(existingData?.mylistCount)) || 0,
        thumbnailUrl: existingData?.thumbnailUrl || "",
        uploadedAt: existingData?.uploadedAt || Date.now(),
        authorName: existingData?.authorName || "不明",
        length: parseInt(String(existingData?.length)) || 0
      };
    }
    this.apiRequestCount++;
    return this.fetchVideoInfo(videoId);
  }
  // 動画IDまたはURLから動画IDを抽出する関数
  extractVideoId(input) {
    const urlPatterns = [/nicovideo\.jp\/watch\/((?:so|sm|nm|nx)\d+)/, /nico\.ms\/((?:so|sm|nm|nx)\d+)/];
    for (const pattern of urlPatterns) {
      const match = input.match(pattern);
      if (match) {
        return match[1];
      }
    }
    if (input.match(/^(?:so|sm|nm|nx)\d+$/)) {
      return input;
    }
    throw new Error("無効な動画IDまたはURLです");
  }
  // APIリクエストカウンターをリセット
  resetApiRequestCount() {
    this.apiRequestCount = 0;
  }
  // キャッシュをクリア
  clearCache() {
    this.apiCache.clear();
  }
  // キャッシュにデータを追加
  setCacheData(videoId, videoInfo) {
    this.apiCache.set(videoId, videoInfo);
  }
}

class MylistService {
  toMessage(value) {
    return value instanceof Error ? value.message : String(value);
  }
  constructor(db) {
    this.db = db;
  }
  async createMylist(name) {
    const database = await this.db.initDB();
    const transaction = database.transaction(["mylists"], "readwrite");
    const store = transaction.objectStore("mylists");
    return new Promise((resolve, reject) => {
      const request = store.add({
        name,
        createdAt: Date.now(),
        sortOrder: 0
      });
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(new Error(this.toMessage(request.error)));
    });
  }
  async getAllMylists() {
    const database = await this.db.initDB();
    const transaction = database.transaction(["mylists"], "readonly");
    const store = transaction.objectStore("mylists");
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(new Error(this.toMessage(request.error)));
    });
  }
  async sortMylists(sortType, getVideosFunc) {
    const mylists = await this.getAllMylists();
    const mylistsWithCount = await Promise.all(
      mylists.map(async (mylist) => {
        const videos = await getVideosFunc(mylist.id);
        return {
          ...mylist,
          videoCount: videos.length
        };
      })
    );
    const [type, order] = sortType.split("_");
    const isAsc = order === "asc";
    return mylistsWithCount.sort((a, b) => {
      let comparison = 0;
      switch (type) {
        case "name":
          comparison = a.name.localeCompare(b.name, "ja");
          break;
        case "createdAt":
          comparison = a.createdAt - b.createdAt;
          break;
        case "videoCount":
          comparison = (a.videoCount || 0) - (b.videoCount || 0);
          break;
        default:
          comparison = a.name.localeCompare(b.name, "ja");
      }
      return isAsc ? comparison : -comparison;
    });
  }
  async updateMylistName(mylistId, newName) {
    const database = await this.db.initDB();
    const transaction = database.transaction(["mylists"], "readwrite");
    const store = transaction.objectStore("mylists");
    return new Promise((resolve, reject) => {
      const request = store.get(mylistId);
      request.onsuccess = () => {
        const mylist = request.result;
        if (!mylist) {
          reject(new Error("マイリストが見つかりません"));
          return;
        }
        mylist.name = newName;
        const updateRequest = store.put(mylist);
        updateRequest.onsuccess = () => resolve();
        updateRequest.onerror = () => reject(new Error(this.toMessage(request.error)));
      };
      request.onerror = () => reject(new Error(this.toMessage(request.error)));
    });
  }
  async deleteMylist(mylistId) {
    const database = await this.db.initDB();
    const transaction = database.transaction(["mylists", "videos"], "readwrite");
    const mylistStore = transaction.objectStore("mylists");
    const videoStore = transaction.objectStore("videos");
    const videoIndex = videoStore.index("mylistId");
    return new Promise((resolve, reject) => {
      const deleteVideos = videoIndex.getAllKeys(mylistId);
      deleteVideos.onsuccess = () => {
        const keys = deleteVideos.result;
        Promise.all([
          ...keys.map((key) => {
            return new Promise((res, rej) => {
              const request = videoStore.delete(key);
              request.onsuccess = () => res();
              request.onerror = () => rej(new Error(this.toMessage(request.error)));
            });
          }),
          new Promise((res, rej) => {
            const request = mylistStore.delete(mylistId);
            request.onsuccess = () => res();
            request.onerror = () => rej(new Error(this.toMessage(request.error)));
          })
        ]).then(() => resolve()).catch((e) => reject(e instanceof Error ? e : new Error(this.toMessage(e))));
      };
      deleteVideos.onerror = () => reject(new Error(this.toMessage(deleteVideos.error)));
    });
  }
}

class VideoService {
  toMessage(value) {
    return value instanceof Error ? value.message : String(value);
  }
  constructor(db) {
    this.db = db;
  }
  async addVideo(mylistId, videoInfo) {
    const database = await this.db.initDB();
    const transaction = database.transaction(["videos"], "readwrite");
    const store = transaction.objectStore("videos");
    const index = store.index("mylistId");
    return new Promise((resolve, reject) => {
      const request = index.get(IDBKeyRange.only(mylistId));
      request.onsuccess = () => {
        const existingVideos = request.result;
        const existing = existingVideos;
        if (existing && existing.id === videoInfo.id) {
          reject(new Error("このマイリストには既に登録されています"));
          return;
        }
        const video = {
          id: `${mylistId}_${videoInfo.id}`,
          originalId: videoInfo.id,
          mylistId,
          title: videoInfo.title,
          viewCount: parseInt(String(videoInfo.viewCount)) || 0,
          commentCount: parseInt(String(videoInfo.commentCount)) || 0,
          mylistCount: parseInt(String(videoInfo.mylistCount)) || 0,
          thumbnailUrl: videoInfo.thumbnailUrl,
          uploadedAt: videoInfo.uploadedAt || Date.now(),
          authorName: videoInfo.authorName || "不明",
          length: videoInfo.length || 0,
          description: videoInfo.description || "",
          tags: videoInfo.tags && videoInfo.tags.length > 0 ? videoInfo.tags : void 0,
          // 任意: VideoInfoにmemoが渡ってくる場合は保持
          memo: videoInfo.memo ?? void 0,
          addedAt: Date.now()
        };
        const addRequest = store.add(video);
        addRequest.onsuccess = () => resolve("追加しました");
        addRequest.onerror = () => reject(new Error("追加に失敗しました"));
      };
      request.onerror = () => reject(new Error(this.toMessage(request.error)));
    });
  }
  async getVideos(mylistId) {
    const database = await this.db.initDB();
    const transaction = database.transaction(["videos"], "readonly");
    const store = transaction.objectStore("videos");
    const index = store.index("mylistId");
    return new Promise((resolve, reject) => {
      const request = index.getAll(mylistId);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(new Error(this.toMessage(request.error)));
    });
  }
  sortVideos(videos, sortType) {
    const [type, order] = sortType.split("_");
    const isAsc = order === "asc";
    return videos.sort((a, b) => {
      let comparison = 0;
      switch (type) {
        case "uploadedAt":
          comparison = (a.uploadedAt || 0) - (b.uploadedAt || 0);
          break;
        case "title":
          comparison = (a.title || "").localeCompare(b.title || "", "ja");
          break;
        case "viewCount":
          comparison = (a.viewCount || 0) - (b.viewCount || 0);
          break;
        case "commentCount":
          comparison = (a.commentCount || 0) - (b.commentCount || 0);
          break;
        case "mylistCount":
          comparison = (a.mylistCount || 0) - (b.mylistCount || 0);
          break;
        case "length":
          comparison = (a.length || 0) - (b.length || 0);
          break;
        case "addedAt":
          comparison = (a.addedAt || 0) - (b.addedAt || 0);
          break;
        default:
          comparison = (a.uploadedAt || 0) - (b.uploadedAt || 0);
      }
      return isAsc ? comparison : -comparison;
    });
  }
  async deleteVideo(compositeId) {
    const database = await this.db.initDB();
    const transaction = database.transaction(["videos"], "readwrite");
    const store = transaction.objectStore("videos");
    return new Promise((resolve, reject) => {
      const request = store.delete(compositeId);
      request.onsuccess = () => {
        resolve("削除しました");
      };
      request.onerror = () => {
        reject(new Error("削除に失敗しました"));
      };
    });
  }
  async updateVideoInfo(compositeId, newInfo) {
    const database = await this.db.initDB();
    const transaction = database.transaction(["videos"], "readwrite");
    const store = transaction.objectStore("videos");
    return new Promise((resolve, reject) => {
      const request = store.get(compositeId);
      request.onsuccess = () => {
        const existingVideo = request.result;
        if (!existingVideo) {
          reject(new Error("動画が見つかりません"));
          return;
        }
        const updatedVideo = {
          ...existingVideo,
          title: newInfo.title || existingVideo.title,
          viewCount: newInfo.viewCount || existingVideo.viewCount,
          commentCount: newInfo.commentCount || existingVideo.commentCount,
          mylistCount: newInfo.mylistCount || existingVideo.mylistCount,
          thumbnailUrl: newInfo.thumbnailUrl || existingVideo.thumbnailUrl,
          uploadedAt: newInfo.uploadedAt || existingVideo.uploadedAt,
          authorName: newInfo.authorName || existingVideo.authorName,
          length: newInfo.length || existingVideo.length || 0,
          description: newInfo.description !== void 0 ? newInfo.description : existingVideo.description,
          tags: newInfo.tags !== void 0 ? newInfo.tags && newInfo.tags.length > 0 ? newInfo.tags : void 0 : existingVideo.tags
        };
        const updateRequest = store.put(updatedVideo);
        updateRequest.onsuccess = () => resolve();
        updateRequest.onerror = () => reject(new Error("データベースの更新に失敗しました"));
      };
      request.onerror = () => reject(new Error("動画情報の取得に失敗しました"));
    });
  }
  async updateVideoMemo(compositeId, memo) {
    const database = await this.db.initDB();
    const transaction = database.transaction(["videos"], "readwrite");
    const store = transaction.objectStore("videos");
    return new Promise((resolve, reject) => {
      const request = store.get(compositeId);
      request.onsuccess = () => {
        const existingVideo = request.result;
        if (!existingVideo) {
          reject(new Error("動画が見つかりません"));
          return;
        }
        const updated = { ...existingVideo, memo };
        const updateRequest = store.put(updated);
        updateRequest.onsuccess = () => resolve();
        updateRequest.onerror = () => reject(new Error("データベースの更新に失敗しました"));
      };
      request.onerror = () => reject(new Error("動画情報の取得に失敗しました"));
    });
  }
}

class KeywordService {
  toMessage(value) {
    return value instanceof Error ? value.message : String(value);
  }
  constructor(db) {
    this.db = db;
  }
  // キーワードを追加
  async addKeyword(mylistId, keyword) {
    const isDuplicate = await this.checkDuplicateKeyword(mylistId, keyword);
    if (isDuplicate) {
      throw new Error("このキーワードは既に登録されています");
    }
    const database = await this.db.initDB();
    const transaction = database.transaction(["keywords"], "readwrite");
    const store = transaction.objectStore("keywords");
    return new Promise((resolve, reject) => {
      const request = store.add({
        mylistId,
        keyword,
        addedAt: Date.now()
      });
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(new Error(this.toMessage(request.error)));
    });
  }
  // キーワードを取得
  async getKeywords(mylistId) {
    const database = await this.db.initDB();
    const transaction = database.transaction(["keywords"], "readonly");
    const store = transaction.objectStore("keywords");
    const index = store.index("mylistId");
    return new Promise((resolve, reject) => {
      const request = index.getAll(mylistId);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(new Error(this.toMessage(request.error)));
    });
  }
  // キーワードを削除
  async deleteKeyword(keywordId) {
    const database = await this.db.initDB();
    const transaction = database.transaction(["keywords"], "readwrite");
    const store = transaction.objectStore("keywords");
    return new Promise((resolve, reject) => {
      const request = store.delete(keywordId);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error(this.toMessage(request.error)));
    });
  }
  // キーワードを移動
  async moveKeyword(keywordId, newMylistId) {
    const database = await this.db.initDB();
    const transaction = database.transaction(["keywords"], "readwrite");
    const store = transaction.objectStore("keywords");
    return new Promise((resolve, reject) => {
      const request = store.get(keywordId);
      request.onsuccess = () => {
        const keyword = request.result;
        if (!keyword) {
          reject(new Error("キーワードが見つかりません"));
          return;
        }
        keyword.mylistId = newMylistId;
        const updateRequest = store.put(keyword);
        updateRequest.onsuccess = () => resolve();
        updateRequest.onerror = () => reject(new Error(this.toMessage(request.error)));
      };
      request.onerror = () => reject(new Error(this.toMessage(request.error)));
    });
  }
  // キーワードを編集
  async updateKeyword(keywordId, newKeyword) {
    const database = await this.db.initDB();
    const transaction = database.transaction(["keywords"], "readwrite");
    const store = transaction.objectStore("keywords");
    return new Promise((resolve, reject) => {
      const request = store.get(keywordId);
      request.onsuccess = () => {
        const keyword = request.result;
        if (!keyword) {
          reject(new Error("キーワードが見つかりません"));
          return;
        }
        keyword.keyword = newKeyword;
        const updateRequest = store.put(keyword);
        updateRequest.onsuccess = () => resolve();
        updateRequest.onerror = () => reject(new Error(this.toMessage(request.error)));
      };
      request.onerror = () => reject(new Error(this.toMessage(request.error)));
    });
  }
  // キーワードの重複チェック
  async checkDuplicateKeyword(mylistId, keyword) {
    const database = await this.db.initDB();
    const transaction = database.transaction(["keywords"], "readonly");
    const store = transaction.objectStore("keywords");
    const index = store.index("mylistId");
    return new Promise((resolve, reject) => {
      const request = index.getAll(mylistId);
      request.onsuccess = () => {
        const keywords = request.result;
        const isDuplicate = keywords.some((k) => k.keyword === keyword);
        resolve(isDuplicate);
      };
      request.onerror = () => reject(new Error(this.toMessage(request.error)));
    });
  }
  // キーワードのソート
  sortKeywords(keywords, sortType) {
    const [type, order] = sortType.split("_");
    const isAsc = order === "asc";
    return keywords.sort((a, b) => {
      let comparison = 0;
      switch (type) {
        case "title":
          comparison = a.keyword.localeCompare(b.keyword, "ja");
          break;
        case "addedAt":
          comparison = a.addedAt - b.addedAt;
          break;
        default:
          comparison = a.addedAt - b.addedAt;
      }
      return isAsc ? comparison : -comparison;
    });
  }
}

class ImportExportService {
  toMessage(value) {
    return value instanceof Error ? value.message : String(value);
  }
  constructor(db, apiService) {
    this.db = db;
    this.apiService = apiService;
  }
  async exportData() {
    const database = await this.db.initDB();
    const mylistsTransaction = database.transaction(["mylists"], "readonly");
    const mylistsStore = mylistsTransaction.objectStore("mylists");
    const mylists = await new Promise((resolve, reject) => {
      const request = mylistsStore.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(new Error(this.toMessage(request.error)));
    });
    const videosTransaction = database.transaction(["videos"], "readonly");
    const videosStore = videosTransaction.objectStore("videos");
    const allVideos = await new Promise((resolve, reject) => {
      const request = videosStore.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(new Error(this.toMessage(request.error)));
    });
    const keywordsTransaction = database.transaction(["keywords"], "readonly");
    const keywordsStore = keywordsTransaction.objectStore("keywords");
    const keywords = await new Promise((resolve, reject) => {
      const request = keywordsStore.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(new Error(this.toMessage(request.error)));
    });
    return {
      mylists,
      videos: allVideos,
      keywords
    };
  }
  async importData(data) {
    const database = await this.db.initDB();
    const transaction = database.transaction(["mylists", "videos", "keywords"], "readwrite");
    const mylistStore = transaction.objectStore("mylists");
    const videoStore = transaction.objectStore("videos");
    const keywordStore = transaction.objectStore("keywords");
    return new Promise((resolve, reject) => {
      try {
        data.mylists.forEach((mylist) => {
          mylistStore.add(mylist);
        });
        data.videos.forEach((video) => {
          videoStore.add(video);
          this.apiService.setCacheData(video.originalId, {
            id: video.originalId,
            title: video.title,
            viewCount: video.viewCount,
            commentCount: video.commentCount,
            mylistCount: video.mylistCount,
            thumbnailUrl: video.thumbnailUrl,
            uploadedAt: video.uploadedAt,
            authorName: video.authorName,
            length: video.length
          });
        });
        if (data.keywords) {
          data.keywords.forEach((keyword) => {
            keywordStore.add(keyword);
          });
        }
        transaction.oncomplete = () => {
          resolve();
        };
        transaction.onerror = () => {
          reject(new Error(this.toMessage(transaction.error)));
        };
      } catch (error) {
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    });
  }
  // レガシーデータのインポート処理
  async importLegacyData(jsonText, progressCallback, createMylistFunc, addVideoFunc) {
    try {
      const legacyData = JSON.parse(jsonText);
      const videos = legacyData.filter((item) => item.vid !== "meta");
      this.apiService.resetApiRequestCount();
      if (!createMylistFunc || !addVideoFunc) {
        throw new Error("マイリスト作成関数または動画追加関数が提供されていません");
      }
      const mylistId = await createMylistFunc("インポートされたマイリスト");
      let processed = 0;
      const total = videos.length;
      const batchSize = 5;
      for (let i = 0; i < videos.length; i += batchSize) {
        const batch = videos.slice(i, i + batchSize);
        await Promise.all(
          batch.map(async (video) => {
            try {
              const existingData = {
                title: video.title,
                viewCount: typeof video.view_counter === "string" ? parseInt(video.view_counter) : video.view_counter,
                commentCount: typeof video.comment_num === "string" ? parseInt(video.comment_num) : video.comment_num,
                mylistCount: typeof video.mylist_counter === "string" ? parseInt(video.mylist_counter) : video.mylist_counter,
                thumbnailUrl: video.thumbUrl,
                uploadedAt: video.first_retrieve,
                authorName: video.author
              };
              const videoInfo = await this.apiService.getVideoInfoFromSources(video.vid, existingData);
              await addVideoFunc(mylistId, videoInfo);
            } catch (error) {
              window.logger.warn(`動画「${video.title}」の処理に失敗しました:`, error);
              await addVideoFunc(mylistId, {
                id: video.vid,
                title: video.title || "取得失敗",
                viewCount: typeof video.view_counter === "string" ? parseInt(video.view_counter) : video.view_counter || 0,
                commentCount: typeof video.comment_num === "string" ? parseInt(video.comment_num) : video.comment_num || 0,
                mylistCount: typeof video.mylist_counter === "string" ? parseInt(video.mylist_counter) : video.mylist_counter || 0,
                thumbnailUrl: video.thumbUrl || "",
                uploadedAt: video.first_retrieve || Date.now(),
                authorName: video.author || "不明",
                length: 0
              });
            }
            processed++;
            if (progressCallback) {
              progressCallback(processed, total);
            }
          })
        );
      }
      return mylistId;
    } catch (error) {
      window.logger.error("レガシーデータのインポートに失敗しました:", error);
      throw new Error(`レガシーデータのインポートに失敗しました: ${error instanceof Error ? error.message : "不明なエラー"}`);
    }
  }
}

class SettingsService {
  toMessage(value) {
    return value instanceof Error ? value.message : String(value);
  }
  constructor(db) {
    this.db = db;
  }
  async saveManagerSettings(settings) {
    const database = await this.db.initDB();
    const transaction = database.transaction(["manager"], "readwrite");
    const store = transaction.objectStore("manager");
    return new Promise((resolve, reject) => {
      const safe = {
        mylistSortType: settings.mylistSortType || "name_asc",
        videoSortType: settings.videoSortType || "uploadedAt_desc",
        theme: settings.theme || "dark-blue"
      };
      const request = store.put({ id: "settings", ...safe });
      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error(this.toMessage(request.error)));
    });
  }
  async loadManagerSettings() {
    const database = await this.db.initDB();
    const transaction = database.transaction(["manager"], "readonly");
    const store = transaction.objectStore("manager");
    return new Promise((resolve, reject) => {
      const request = store.get("settings");
      request.onsuccess = () => {
        const result = request.result;
        if (result && typeof result.mylistSortType === "string" && typeof result.videoSortType === "string") {
          const theme = result.theme;
          const safeTheme = typeof theme === "string" ? theme : "dark-blue";
          resolve({ ...result, theme: safeTheme });
          return;
        }
        resolve({ mylistSortType: "name_asc", videoSortType: "uploadedAt_desc", theme: "dark-blue" });
      };
      request.onerror = () => reject(new Error(this.toMessage(request.error)));
    });
  }
}

class DatabaseManagementService {
  // 24時間
  constructor(db) {
    this.healthCheckInterval = 24 * 60 * 60 * 1e3;
    this.db = db;
  }
  // データベース初期化と永続化昇格
  async initializeDatabase() {
    try {
      const result = await this.db.initializeWithHealthCheck();
      window.logger?.info("Database initialized successfully", {
        health: result.health,
        persistence: result.persistence
      });
      return {
        success: true,
        health: result.health,
        persistence: result.persistence
      };
    } catch (error) {
      window.logger?.error("Database initialization failed:", error);
      return {
        success: false,
        health: {
          isHealthy: false,
          issues: [`Initialization failed: ${error instanceof Error ? error.message : String(error)}`],
          storageEstimate: null,
          persistence: false
        },
        persistence: false,
        error: error?.toString()
      };
    }
  }
  // 手動ヘルスチェック
  async performHealthCheck() {
    try {
      const health = await this.db.performHealthCheck();
      if (!health.isHealthy) {
        window.logger?.warn("Database health check failed:", health.issues);
      } else {
        window.logger?.info("Database health check passed");
      }
      return health;
    } catch (error) {
      window.logger?.error("Health check failed:", error);
      return {
        isHealthy: false,
        issues: [`Health check failed: ${error instanceof Error ? error.message : String(error)}`],
        storageEstimate: null,
        persistence: false
      };
    }
  }
  // 自動ヘルスチェック開始
  startAutoHealthCheck() {
    if (this.healthCheckIntervalId) {
      clearInterval(this.healthCheckIntervalId);
    }
    this.healthCheckIntervalId = window.setInterval(async () => {
      try {
        const health = await this.performHealthCheck();
        if (!health.isHealthy) {
          this.notifyHealthIssues(health);
        }
      } catch (error) {
        window.logger?.error("Auto health check failed:", error);
      }
    }, this.healthCheckInterval);
    window.logger?.info("Auto health check started");
  }
  // 自動ヘルスチェック停止
  stopAutoHealthCheck() {
    if (this.healthCheckIntervalId) {
      clearInterval(this.healthCheckIntervalId);
      this.healthCheckIntervalId = void 0;
      window.logger?.info("Auto health check stopped");
    }
  }
  // バックアップ作成
  async createBackup() {
    try {
      const backupData = await this.db.createBackup();
      window.logger?.info("Database backup created successfully");
      return {
        success: true,
        backupData
      };
    } catch (error) {
      window.logger?.error("Database backup failed:", error);
      return {
        success: false,
        error: error?.toString()
      };
    }
  }
  // バックアップからの復元
  async restoreFromBackup(backupData) {
    try {
      await this.db.restoreFromBackup(backupData);
      window.logger?.info("Database restored from backup successfully");
      return {
        success: true
      };
    } catch (error) {
      window.logger?.error("Database restore failed:", error);
      return {
        success: false,
        error: error?.toString()
      };
    }
  }
  // 永続化状態の確認
  async getPersistenceStatus() {
    try {
      const storageEstimate = await this.db.getStorageEstimate();
      let isPersistent = false;
      let canRequestPersistence = false;
      if ("storage" in navigator) {
        if ("persisted" in navigator.storage) {
          isPersistent = await navigator.storage.persisted();
        }
        if ("persist" in navigator.storage) {
          canRequestPersistence = true;
        }
      }
      return {
        isPersistent,
        canRequestPersistence,
        storageEstimate
      };
    } catch (error) {
      window.logger?.error("Failed to get persistence status:", error);
      return {
        isPersistent: false,
        canRequestPersistence: false,
        storageEstimate: null
      };
    }
  }
  // 永続化要求
  async requestPersistence() {
    try {
      const isPersistent = await this.db.requestPersistence();
      return {
        success: true,
        isPersistent
      };
    } catch (error) {
      window.logger?.error("Failed to request persistence:", error);
      return {
        success: false,
        isPersistent: false,
        error: error?.toString()
      };
    }
  }
  // マイグレーション進捗監視
  setMigrationProgressCallback(callback) {
    this.db.setProgressCallback(callback);
  }
  // ストレージ使用量の監視
  async monitorStorageUsage() {
    try {
      const estimate = await this.db.getStorageEstimate();
      if (estimate?.usage !== void 0 && estimate?.quota !== void 0) {
        const usage = estimate.usage;
        const quota = estimate.quota;
        const percentage = usage / quota * 100;
        const isNearLimit = percentage > 80;
        return {
          usage,
          quota,
          percentage,
          isNearLimit
        };
      }
      return {
        usage: 0,
        quota: 0,
        percentage: 0,
        isNearLimit: false
      };
    } catch (error) {
      window.logger?.error("Failed to monitor storage usage:", error);
      return {
        usage: 0,
        quota: 0,
        percentage: 0,
        isNearLimit: false
      };
    }
  }
  // 健全性問題の通知
  notifyHealthIssues(health) {
    const issues = health.issues.map((i) => String(i)).join(", ");
    if (typeof window !== "undefined" && window.Mylist2ManagerUI?.showNotification) {
      const windowWithUI = window;
      windowWithUI.Mylist2ManagerUI.showNotification(
        `データベース健全性の問題が検出されました: ${issues}`,
        "warning"
      );
    }
    window.logger?.warn("Database health issues detected:", health.issues);
  }
  // 自動バックアップ機能
  async scheduleAutoBackup(intervalHours = 24) {
    await Promise.resolve();
    const intervalMs = intervalHours * 60 * 60 * 1e3;
    setInterval(() => {
      try {
        void this.createBackup().then((result) => {
          if (result.success && result.backupData) {
            localStorage.setItem("mylist2_auto_backup", result.backupData);
            localStorage.setItem("mylist2_auto_backup_timestamp", (/* @__PURE__ */ new Date()).toISOString());
            window.logger?.info("Auto backup completed");
          } else {
            window.logger?.error("Auto backup failed:", result.error);
          }
        }).catch((error) => {
          window.logger?.error("Auto backup error:", error);
        });
      } catch (error) {
        window.logger?.error("Auto backup error:", error);
      }
    }, intervalMs);
    window.logger?.info(`Auto backup scheduled every ${intervalHours} hours`);
  }
  // 自動バックアップの復元
  async restoreAutoBackup() {
    try {
      const backupData = localStorage.getItem("mylist2_auto_backup");
      const backupTimestamp = localStorage.getItem("mylist2_auto_backup_timestamp");
      if (!backupData) {
        return {
          success: false,
          error: "No auto backup found"
        };
      }
      const result = await this.restoreFromBackup(backupData);
      if (result.success) {
        return {
          success: true,
          backupDate: backupTimestamp ? new Date(backupTimestamp) : void 0
        };
      } else {
        return {
          success: false,
          error: result.error
        };
      }
    } catch (error) {
      window.logger?.error("Failed to restore auto backup:", error);
      return {
        success: false,
        error: error?.toString()
      };
    }
  }
  // サービス終了時のクリーンアップ
  destroy() {
    this.stopAutoHealthCheck();
  }
  // すべてのデータをクリア（UIからの明示操作用）
  async clearAllData(options) {
    try {
      await this.db.clearAllData(options?.includeSettings === true);
      return { success: true };
    } catch (error) {
      window.logger?.error("Failed to clear all data:", error);
      return { success: false, error: error?.toString?.() ?? String(error) };
    }
  }
}

const scriptRel = 'modulepreload';const assetsURL = function(dep) { return "/local/features/dist/"+dep };const seen = {};const __vitePreload = function preload(baseModule, deps, importerUrl) {
	let promise = Promise.resolve();
	if (true               && deps && deps.length > 0) {
		document.getElementsByTagName("link");
		const cspNonceMeta = document.querySelector("meta[property=csp-nonce]");
		const cspNonce = cspNonceMeta?.nonce || cspNonceMeta?.getAttribute("nonce");
		function allSettled(promises$2) {
			return Promise.all(promises$2.map((p$1) => Promise.resolve(p$1).then((value$1) => ({
				status: "fulfilled",
				value: value$1
			}), (reason) => ({
				status: "rejected",
				reason
			}))));
		}
		promise = allSettled(deps.map((dep) => {
			dep = assetsURL(dep);
			if (dep in seen) return;
			seen[dep] = true;
			const isCss = dep.endsWith(".css");
			const cssSelector = isCss ? "[rel=\"stylesheet\"]" : "";
			if (document.querySelector(`link[href="${dep}"]${cssSelector}`)) return;
			const link = document.createElement("link");
			link.rel = isCss ? "stylesheet" : scriptRel;
			if (!isCss) link.as = "script";
			link.crossOrigin = "";
			link.href = dep;
			if (cspNonce) link.setAttribute("nonce", cspNonce);
			document.head.appendChild(link);
			if (isCss) return new Promise((res, rej) => {
				link.addEventListener("load", res);
				link.addEventListener("error", () => rej(/* @__PURE__ */ new Error(`Unable to preload CSS for ${dep}`)));
			});
		}));
	}
	function handlePreloadError(err$2) {
		const e$1 = new Event("vite:preloadError", { cancelable: true });
		e$1.payload = err$2;
		window.dispatchEvent(e$1);
		if (!e$1.defaultPrevented) throw err$2;
	}
	return promise.then((res) => {
		for (const item of res || []) {
			if (item.status !== "rejected") continue;
			handlePreloadError(item.reason);
		}
		return baseModule().catch(handlePreloadError);
	});
};

class GoogleDriveService {
  constructor(clientIdFromConfig) {
    this.accessToken = null;
    this.accessTokenExpireAt = 0;
    this.clientId = null;
    this.scope = "https://www.googleapis.com/auth/drive.file";
    this.backupFolderName = "Mylist2 Backups";
    this.defaultClientId = "757779940916-u31ia8oafa998j6qqavdpqjjn988it8b.apps.googleusercontent.com";
    this.clientId = clientIdFromConfig || localStorage.getItem("mylist2_google_client_id") || this.defaultClientId;
  }
  // fflate ローダ（npm優先 → CDNフォールバック）
  async loadFflate() {
    try {
      const m = await __vitePreload(() => Promise.resolve().then(() => browser),true              ?void 0:void 0);
      return m;
    } catch {
      const cdnUrl = "https://cdn.jsdelivr.net/npm/fflate@0.8.2/esm/index.js";
      const mod = await import(
        /* @vite-ignore */
        cdnUrl
      );
      return mod;
    }
  }
  setClientId(clientId) {
    this.clientId = clientId;
    localStorage.setItem("mylist2_google_client_id", clientId);
  }
  async ensureGisLoaded() {
    await Promise.resolve();
    const win = window;
    if (win.google && win.google.accounts && win.google.accounts.oauth2) return;
    await new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Failed to load Google Identity Services"));
      document.head.appendChild(script);
    });
  }
  isTokenValid() {
    return !!this.accessToken && Date.now() < this.accessTokenExpireAt - 5e3;
  }
  async ensureAccessToken() {
    if (this.isTokenValid()) return this.accessToken;
    if (!this.clientId) {
      const input = window.prompt("Google OAuth クライアントIDを入力してください (例: xxxxx.apps.googleusercontent.com)", "");
      if (!input) throw new Error("Google クライアントIDが設定されていません");
      this.setClientId(input);
    }
    await this.ensureGisLoaded();
    const token = await new Promise((resolve, reject) => {
      try {
        const win = window;
        const tokenClient = win.google.accounts.oauth2.initTokenClient({
          client_id: this.clientId,
          scope: this.scope,
          callback: (resp) => {
            if (resp && resp.access_token) {
              this.accessToken = resp.access_token;
              const expiresInSec = typeof resp.expires_in === "number" ? resp.expires_in : 3600;
              this.accessTokenExpireAt = Date.now() + expiresInSec * 1e3;
              resolve(resp.access_token);
            } else {
              reject(new Error(resp?.error || "Failed to obtain access token"));
            }
          }
        });
        tokenClient.requestAccessToken({ prompt: "consent" });
      } catch (e) {
        reject(e instanceof Error ? e : new Error(String(e)));
      }
    });
    return token;
  }
  async fetchDrive(url, init) {
    const token = await this.ensureAccessToken();
    const resp = await fetch(url, {
      ...init,
      headers: {
        ...init.headers || {},
        Authorization: `Bearer ${token}`
      }
    });
    if (!resp.ok) {
      const text = await resp.text().catch(() => "");
      throw new Error(`Drive API Error: ${resp.status} ${resp.statusText} ${text}`);
    }
    const contentType = resp.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      return await resp.json();
    }
    return await resp.text();
  }
  async ensureBackupFolder() {
    const q = encodeURIComponent(
      `name = '${this.backupFolderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`
    );
    const found = await this.fetchDrive(
      `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name)`,
      { method: "GET" }
    );
    const existing = Array.isArray(found.files) ? found.files : [];
    if (existing.length > 0) return existing[0].id;
    const meta = { name: this.backupFolderName, mimeType: "application/vnd.google-apps.folder" };
    const created = await this.fetchDrive(
      "https://www.googleapis.com/drive/v3/files",
      {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=UTF-8" },
        body: JSON.stringify(meta)
      }
    );
    return created.id;
  }
  async createZipBlob(fileName, jsonText) {
    const { zipSync, strToU8 } = await this.loadFflate();
    const zipped = zipSync({ [fileName]: strToU8(jsonText) }, { level: 6 });
    const ab = new ArrayBuffer(zipped.byteLength);
    new Uint8Array(ab).set(zipped);
    return new Blob([ab], { type: "application/zip" });
  }
  buildMultipartBody(metadata, fileBlob, boundary) {
    const encoder = new TextEncoder();
    const metaStr = JSON.stringify(metadata);
    const part1 = encoder.encode(
      `--${boundary}\r
Content-Type: application/json; charset=UTF-8\r
\r
${metaStr}\r
`
    );
    const part2Header = encoder.encode(
      `--${boundary}\r
Content-Type: application/zip\r
\r
`
    );
    const part3 = encoder.encode(`\r
--${boundary}--`);
    return new Response(new Blob([part1, part2Header, fileBlob, part3])).blob();
  }
  async uploadBackupZip(baseFileName, backupJson) {
    try {
      const folderId = await this.ensureBackupFolder();
      const zipFileName = `${baseFileName}.zip`;
      const zipBlob = await this.createZipBlob(`${baseFileName}.json`, backupJson);
      const metadata = { name: zipFileName, parents: [folderId] };
      const boundary = `mylist2_${Math.random().toString(36).slice(2)}`;
      const bodyBlob = await this.buildMultipartBody(metadata, zipBlob, boundary);
      const result = await this.fetchDrive(
        "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart",
        {
          method: "POST",
          headers: { "Content-Type": `multipart/related; boundary=${boundary}` },
          body: bodyBlob
        }
      );
      return { success: true, fileId: result.id };
    } catch (error) {
      window.logger?.error("Google Drive upload failed:", error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }
  // バックアップ一覧取得（ZIPのみ）
  async listBackups() {
    const folderId = await this.ensureBackupFolder();
    const q = encodeURIComponent(`'${folderId}' in parents and trashed = false`);
    const res = await this.fetchDrive(
      `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,modifiedTime,size)`,
      { method: "GET" }
    );
    const files = Array.isArray(res.files) ? res.files : [];
    return files.filter((f) => /.zip$/.test(f.name) && /^Mylist2_/.test(f.name)).sort((a, b) => (b.modifiedTime || "").localeCompare(a.modifiedTime || ""));
  }
  // ZIPをダウンロードしてJSON文字列を取り出す
  async downloadBackupJson(fileId) {
    const token = await this.ensureAccessToken();
    const resp = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!resp.ok) {
      const text = await resp.text().catch(() => "");
      throw new Error(`Download failed: ${resp.status} ${resp.statusText} ${text}`);
    }
    const buf = new Uint8Array(await resp.arrayBuffer());
    const { unzipSync, strFromU8 } = await this.loadFflate();
    const files = unzipSync(buf);
    const jsonEntryName = Object.keys(files).find((n) => /.json$/.test(n));
    if (!jsonEntryName) throw new Error("ZIP内にJSONファイルが見つかりません");
    return strFromU8(files[jsonEntryName]);
  }
}

class DropboxService {
  // Dropbox はルート起点のパス
  constructor(tokenFromConfig) {
    this.accessToken = null;
    this.backupFolderPath = "/Mylist2 Backups";
    this.accessToken = tokenFromConfig || localStorage.getItem("mylist2_dropbox_token");
  }
  setAccessToken(token) {
    this.accessToken = token;
    localStorage.setItem("mylist2_dropbox_token", token);
  }
  ensureAccessToken() {
    if (this.accessToken) return Promise.resolve(this.accessToken);
    const input = window.prompt(
      "Dropbox のアクセストークンを入力してください (files.content.read/write 権限)",
      ""
    );
    if (!input) throw new Error("Dropbox アクセストークンが設定されていません");
    this.setAccessToken(input);
    return Promise.resolve(input);
  }
  // fflate ローダ（npm優先 → CDNフォールバック）
  async loadFflate() {
    try {
      const m = await __vitePreload(() => Promise.resolve().then(() => browser),true              ?[]:void 0);
      return m;
    } catch {
      const cdnUrl = "https://cdn.jsdelivr.net/npm/fflate@0.8.2/esm/index.js";
      const mod = await import(
        /* @vite-ignore */
        cdnUrl
      );
      return mod;
    }
  }
  async createZipBlob(fileName, jsonText) {
    const { zipSync, strToU8 } = await this.loadFflate();
    const zipped = zipSync({ [fileName]: strToU8(jsonText) }, { level: 6 });
    const ab = new ArrayBuffer(zipped.byteLength);
    new Uint8Array(ab).set(zipped);
    return new Blob([ab], { type: "application/zip" });
  }
  async ensureBackupFolder() {
    const token = await this.ensureAccessToken();
    const res = await fetch("https://api.dropboxapi.com/2/files/get_metadata", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ path: this.backupFolderPath, include_deleted: false })
    });
    if (res.ok) return;
    const create = await fetch("https://api.dropboxapi.com/2/files/create_folder_v2", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ path: this.backupFolderPath, autorename: false })
    });
    if (!create.ok) {
      const text = await create.text().catch(() => "");
      throw new Error(`Dropbox フォルダ作成に失敗: ${create.status} ${create.statusText} ${text}`);
    }
  }
  async uploadBackupZip(baseFileName, backupJson) {
    try {
      await this.ensureBackupFolder();
      const token = await this.ensureAccessToken();
      const zipName = `${baseFileName}.zip`;
      const zipBlob = await this.createZipBlob(`${baseFileName}.json`, backupJson);
      const path = `${this.backupFolderPath}/${zipName}`;
      const upload = await fetch("https://content.dropboxapi.com/2/files/upload", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/octet-stream",
          "Dropbox-API-Arg": JSON.stringify({ path, mode: { ".tag": "add" }, mute: true, strict_conflict: false })
        },
        body: zipBlob
      });
      if (!upload.ok) {
        const text = await upload.text().catch(() => "");
        throw new Error(`Dropbox アップロード失敗: ${upload.status} ${upload.statusText} ${text}`);
      }
      return { success: true, path };
    } catch (e) {
      window.logger?.error("Dropbox upload failed:", e);
      return { success: false, error: e instanceof Error ? e.message : String(e) };
    }
  }
  async listBackups() {
    const token = await this.ensureAccessToken();
    await this.ensureBackupFolder();
    const list = await fetch("https://api.dropboxapi.com/2/files/list_folder", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ path: this.backupFolderPath, recursive: false, include_deleted: false })
    });
    if (!list.ok) {
      const text = await list.text().catch(() => "");
      throw new Error(`Dropbox 一覧取得失敗: ${list.status} ${list.statusText} ${text}`);
    }
    const json = await list.json();
    const items = (json.entries || []).filter((e) => e[".tag"] === "file" && /\.zip$/.test(e.name) && /^Mylist2_/.test(e.name));
    return items.map((f) => ({ id: `${this.backupFolderPath}/${f.name}`, name: f.name, modifiedTime: f.server_modified || f.client_modified, size: typeof f.size === "number" ? String(f.size) : void 0 })).sort((a, b) => (b.modifiedTime || "").localeCompare(a.modifiedTime || ""));
  }
  async downloadBackupJson(filePath) {
    const token = await this.ensureAccessToken();
    const resp = await fetch("https://content.dropboxapi.com/2/files/download", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Dropbox-API-Arg": JSON.stringify({ path: filePath })
      }
    });
    if (!resp.ok) {
      const text = await resp.text().catch(() => "");
      throw new Error(`Dropbox ダウンロード失敗: ${resp.status} ${resp.statusText} ${text}`);
    }
    const buf = new Uint8Array(await resp.arrayBuffer());
    const { unzipSync, strFromU8 } = await this.loadFflate();
    const files = unzipSync(buf);
    const jsonEntryName = Object.keys(files).find((n) => /\.json$/.test(n));
    if (!jsonEntryName) throw new Error("ZIP内にJSONファイルが見つかりません");
    return strFromU8(files[jsonEntryName]);
  }
}

class OneDriveService {
  constructor(tokenFromConfig) {
    this.accessToken = null;
    this.backupFolderName = "Mylist2 Backups";
    this.accessToken = tokenFromConfig || localStorage.getItem("mylist2_onedrive_token");
  }
  setAccessToken(token) {
    this.accessToken = token;
    localStorage.setItem("mylist2_onedrive_token", token);
  }
  ensureAccessToken() {
    if (this.accessToken) return Promise.resolve(this.accessToken);
    const input = window.prompt(
      "OneDrive (Microsoft Graph) のアクセストークンを入力してください (Files.ReadWrite)",
      ""
    );
    if (!input) throw new Error("OneDrive アクセストークンが設定されていません");
    this.setAccessToken(input);
    return Promise.resolve(input);
  }
  // fflate ローダ（npm優先 → CDNフォールバック）
  async loadFflate() {
    try {
      const m = await __vitePreload(() => Promise.resolve().then(() => browser),true              ?[]:void 0);
      return m;
    } catch {
      const cdnUrl = "https://cdn.jsdelivr.net/npm/fflate@0.8.2/esm/index.js";
      const mod = await import(
        /* @vite-ignore */
        cdnUrl
      );
      return mod;
    }
  }
  async createZipBlob(fileName, jsonText) {
    const { zipSync, strToU8 } = await this.loadFflate();
    const zipped = zipSync({ [fileName]: strToU8(jsonText) }, { level: 6 });
    const ab = new ArrayBuffer(zipped.byteLength);
    new Uint8Array(ab).set(zipped);
    return new Blob([ab], { type: "application/zip" });
  }
  async ensureBackupFolder() {
    const token = await this.ensureAccessToken();
    const q = new URL("https://graph.microsoft.com/v1.0/me/drive/root/children");
    q.searchParams.set("$select", "id,name,folder");
    const res = await fetch(q.toString(), {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`OneDrive フォルダ一覧取得失敗: ${res.status} ${res.statusText} ${text}`);
    }
    const json = await res.json();
    const existing = (json.value || []).find((e) => e.folder && e.name === this.backupFolderName);
    if (existing) return existing.id;
    const create = await fetch("https://graph.microsoft.com/v1.0/me/drive/root/children", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ name: this.backupFolderName, folder: {}, "@microsoft.graph.conflictBehavior": "fail" })
    });
    if (!create.ok) {
      const text = await create.text().catch(() => "");
      throw new Error(`OneDrive フォルダ作成失敗: ${create.status} ${create.statusText} ${text}`);
    }
    const c = await create.json();
    return c.id;
  }
  async uploadBackupZip(baseFileName, backupJson) {
    try {
      const folderId = await this.ensureBackupFolder();
      const token = await this.ensureAccessToken();
      const zipName = `${baseFileName}.zip`;
      const zipBlob = await this.createZipBlob(`${baseFileName}.json`, backupJson);
      const put = await fetch(`https://graph.microsoft.com/v1.0/me/drive/items/${encodeURIComponent(folderId)}:/${encodeURIComponent(zipName)}:/content`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
        body: zipBlob
      });
      if (!put.ok) {
        const text = await put.text().catch(() => "");
        throw new Error(`OneDrive アップロード失敗: ${put.status} ${put.statusText} ${text}`);
      }
      const meta = await put.json();
      return { success: true, fileId: meta.id };
    } catch (e) {
      window.logger?.error("OneDrive upload failed:", e);
      return { success: false, error: e instanceof Error ? e.message : String(e) };
    }
  }
  async listBackups() {
    const token = await this.ensureAccessToken();
    const folderId = await this.ensureBackupFolder();
    const res = await fetch(`https://graph.microsoft.com/v1.0/me/drive/items/${encodeURIComponent(folderId)}/children?$select=id,name,size,lastModifiedDateTime`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`OneDrive 一覧取得失敗: ${res.status} ${res.statusText} ${text}`);
    }
    const json = await res.json();
    const files = (json.value || []).filter((f) => /\.zip$/.test(f.name) && /^Mylist2_/.test(f.name));
    return files.map((f) => ({ id: f.id, name: f.name, modifiedTime: f.lastModifiedDateTime, size: typeof f.size === "number" ? String(f.size) : void 0 })).sort((a, b) => (b.modifiedTime || "").localeCompare(a.modifiedTime || ""));
  }
  async downloadBackupJson(fileId) {
    const token = await this.ensureAccessToken();
    const resp = await fetch(`https://graph.microsoft.com/v1.0/me/drive/items/${encodeURIComponent(fileId)}/content`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
      redirect: "follow"
    });
    if (!resp.ok) {
      const text = await resp.text().catch(() => "");
      throw new Error(`OneDrive ダウンロード失敗: ${resp.status} ${resp.statusText} ${text}`);
    }
    const buf = new Uint8Array(await resp.arrayBuffer());
    const { unzipSync, strFromU8 } = await this.loadFflate();
    const files = unzipSync(buf);
    const jsonEntryName = Object.keys(files).find((n) => /\.json$/.test(n));
    if (!jsonEntryName) throw new Error("ZIP内にJSONファイルが見つかりません");
    return strFromU8(files[jsonEntryName]);
  }
}

class MegaService {
  constructor() {
    // 将来的にアクセストークン/セッション情報などを保持
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.session = null;
  }
  // 現段階では未対応（プレースホルダ）。実装時にセッション設定を行う。
  setSession(session) {
    this.session = session;
    localStorage.setItem("mylist2_mega_session", JSON.stringify(session));
  }
  unsupported() {
    throw new Error(
      "MEGA 連携はブラウザのみ・バックエンド無し環境では追加実装が必要です。設定画面で 'Dropbox' または 'OneDrive' をご利用ください。"
    );
  }
  // API 互換: GoogleDrive/Dropbox/OneDrive と同じメソッド群
  uploadBackupZip(_baseFileName, _backupJson) {
    try {
      this.unsupported();
    } catch (e) {
      return Promise.resolve({ success: false, error: e instanceof Error ? e.message : String(e) });
    }
  }
  listBackups() {
    return Promise.reject(this.createUnsupportedError());
  }
  downloadBackupJson(_fileId) {
    return Promise.reject(this.createUnsupportedError());
  }
  createUnsupportedError() {
    return new Error(
      "MEGA 連携は未実装です。Dropbox / OneDrive / Google Drive をご利用ください。"
    );
  }
}

class Mylist2Manager {
  constructor() {
    this.db = new Mylist2DB();
    this.apiService = new ApiService();
    this.mylistService = new MylistService(this.db);
    this.videoService = new VideoService(this.db);
    this.keywordService = new KeywordService(this.db);
    this.importExportService = new ImportExportService(this.db, this.apiService);
    this.settingsService = new SettingsService(this.db);
    this.databaseManagementService = new DatabaseManagementService(this.db);
    this.googleDriveService = new GoogleDriveService();
    this.dropboxService = new DropboxService();
    this.oneDriveService = new OneDriveService();
    this.megaService = new MegaService();
  }
  // データベースへのアクセスを提供するpublicメソッド
  async getDB() {
    return this.db.initDB();
  }
  // マイリスト関連のメソッド
  async createMylist(name) {
    return this.mylistService.createMylist(name);
  }
  async getAllMylists() {
    return this.mylistService.getAllMylists();
  }
  async sortMylists(sortType) {
    return this.mylistService.sortMylists(sortType, (mylistId) => this.getVideos(mylistId));
  }
  async updateMylistName(mylistId, newName) {
    return this.mylistService.updateMylistName(mylistId, newName);
  }
  async deleteMylist(mylistId) {
    return this.mylistService.deleteMylist(mylistId);
  }
  // 動画関連のメソッド
  async addVideo(mylistId, videoInfo) {
    return this.videoService.addVideo(mylistId, videoInfo);
  }
  async getVideos(mylistId) {
    return this.videoService.getVideos(mylistId);
  }
  sortVideos(videos, sortType) {
    return this.videoService.sortVideos(videos, sortType);
  }
  async deleteVideo(compositeId) {
    return this.videoService.deleteVideo(compositeId);
  }
  async updateVideoInfo(compositeId, newInfo) {
    return this.videoService.updateVideoInfo(compositeId, newInfo);
  }
  async updateVideoMemo(compositeId, memo) {
    return this.videoService.updateVideoMemo(compositeId, memo);
  }
  // キーワード関連のメソッド
  async addKeyword(mylistId, keyword) {
    return this.keywordService.addKeyword(mylistId, keyword);
  }
  async getKeywords(mylistId) {
    return this.keywordService.getKeywords(mylistId);
  }
  async deleteKeyword(keywordId) {
    return this.keywordService.deleteKeyword(keywordId);
  }
  async moveKeyword(keywordId, newMylistId) {
    return this.keywordService.moveKeyword(keywordId, newMylistId);
  }
  async updateKeyword(keywordId, newKeyword) {
    return this.keywordService.updateKeyword(keywordId, newKeyword);
  }
  // API関連のメソッド
  async fetchVideoInfo(videoId) {
    return this.apiService.fetchVideoInfo(videoId);
  }
  extractVideoId(input) {
    return this.apiService.extractVideoId(input);
  }
  // インポート・エクスポート関連のメソッド  
  async exportData() {
    return this.importExportService.exportData();
  }
  async importData(data) {
    return this.importExportService.importData(data);
  }
  async importLegacyData(jsonText, progressCallback) {
    return this.importExportService.importLegacyData(
      jsonText,
      progressCallback,
      (name) => this.createMylist(name),
      (mylistId, videoInfo) => this.addVideo(mylistId, videoInfo)
    );
  }
  // 設定関連のメソッド
  async saveManagerSettings(settings) {
    return this.settingsService.saveManagerSettings(settings);
  }
  async loadManagerSettings() {
    return this.settingsService.loadManagerSettings();
  }
  // データベース管理関連のメソッド
  async initializeDatabaseWithHealthCheck() {
    return this.databaseManagementService.initializeDatabase();
  }
  async performDatabaseHealthCheck() {
    return this.databaseManagementService.performHealthCheck();
  }
  async createDatabaseBackup() {
    return this.databaseManagementService.createBackup();
  }
  async restoreDatabaseFromBackup(backupData) {
    return this.databaseManagementService.restoreFromBackup(backupData);
  }
  async getDatabasePersistenceStatus() {
    return this.databaseManagementService.getPersistenceStatus();
  }
  async requestDatabasePersistence() {
    return this.databaseManagementService.requestPersistence();
  }
  async monitorDatabaseStorageUsage() {
    return this.databaseManagementService.monitorStorageUsage();
  }
  setDatabaseMigrationProgressCallback(callback) {
    this.databaseManagementService.setMigrationProgressCallback(callback);
  }
  startAutoDatabaseHealthCheck() {
    this.databaseManagementService.startAutoHealthCheck();
  }
  stopAutoDatabaseHealthCheck() {
    this.databaseManagementService.stopAutoHealthCheck();
  }
  async scheduleAutoDatabaseBackup(intervalHours = 24) {
    return this.databaseManagementService.scheduleAutoBackup(intervalHours);
  }
  async restoreAutoDatabaseBackup() {
    return this.databaseManagementService.restoreAutoBackup();
  }
  // サービス終了時のクリーンアップ
  destroy() {
    this.databaseManagementService.destroy();
  }
  // データの全消去（設定含むかを選択可能）
  async clearAllData(includeSettings = false) {
    return this.databaseManagementService.clearAllData({ includeSettings });
  }
  // Google Drive アップロード (zip圧縮)
  async uploadBackupToGoogleDrive(baseFileName) {
    try {
      const backup = await this.createDatabaseBackup();
      if (!backup.success || !backup.backupData) return { success: false, error: backup.error || "バックアップ作成に失敗しました" };
      return await this.googleDriveService.uploadBackupZip(baseFileName, backup.backupData);
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }
  setGoogleClientId(clientId) {
    this.googleDriveService.setClientId(clientId);
  }
  // Google Drive 上のバックアップ一覧
  async listGoogleDriveBackups() {
    return this.googleDriveService.listBackups();
  }
  // Google Drive からバックアップをダウンロードして復元
  async restoreFromGoogleDriveBackup(fileId) {
    try {
      const jsonText = await this.googleDriveService.downloadBackupJson(fileId);
      const res = await this.restoreDatabaseFromBackup(jsonText);
      return res;
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }
  // 汎用クラウド: プロバイダ選択版
  async uploadBackupToCloud(provider, baseFileName) {
    try {
      const backup = await this.createDatabaseBackup();
      if (!backup.success || !backup.backupData) return { success: false, error: backup.error || "バックアップ作成に失敗しました" };
      if (provider === "gdrive") {
        const r = await this.googleDriveService.uploadBackupZip(baseFileName, backup.backupData);
        return r.success ? { success: true, id: r.fileId } : { success: false, error: r.error };
      }
      if (provider === "dropbox") {
        const r = await this.dropboxService.uploadBackupZip(baseFileName, backup.backupData);
        return r.success ? { success: true, id: r.path } : { success: false, error: r.error };
      }
      if (provider === "onedrive") {
        const r = await this.oneDriveService.uploadBackupZip(baseFileName, backup.backupData);
        return r.success ? { success: true, id: r.fileId } : { success: false, error: r.error };
      }
      if (provider === "mega") {
        const r = await this.megaService.uploadBackupZip(baseFileName, backup.backupData);
        return r.success ? { success: true, id: r.fileId } : { success: false, error: r.error };
      }
      return { success: false, error: "未知のプロバイダ" };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }
  async listCloudBackups(provider) {
    if (provider === "gdrive") return this.googleDriveService.listBackups();
    if (provider === "dropbox") return this.dropboxService.listBackups();
    if (provider === "onedrive") return this.oneDriveService.listBackups();
    if (provider === "mega") return this.megaService.listBackups();
    return [];
  }
  async restoreFromCloudBackup(provider, id) {
    try {
      let jsonText = "";
      if (provider === "gdrive") jsonText = await this.googleDriveService.downloadBackupJson(id);
      else if (provider === "dropbox") jsonText = await this.dropboxService.downloadBackupJson(id);
      else if (provider === "onedrive") jsonText = await this.oneDriveService.downloadBackupJson(id);
      else if (provider === "mega") jsonText = await this.megaService.downloadBackupJson(id);
      const res = await this.restoreDatabaseFromBackup(jsonText);
      return res;
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }
}

class ModalService {
  // カスタムアラートの実装
  showCustomAlert(message, type = "info", title = "") {
    return new Promise((resolve) => {
      const progressModal = document.getElementById("progressModal");
      const wasProgressVisible = progressModal ? getComputedStyle(progressModal).display !== "none" : false;
      if (progressModal && wasProgressVisible) {
        progressModal.style.display = "none";
      }
      const modalHTML = `
        <div class="cml2-alert-modal">
          <div class="cml2-alert-content ${type}">
            ${title ? `<h3 class="cml2-alert-title">${title}</h3>` : ""}
            <div class="cml2-alert-message">${message}</div>
            <div class="cml2-alert-buttons">
              <button class="cml2-btn" id="alertOkButton">${createMaterialIcon(ICONS.check, { color: "white" })}OK</button>
            </div>
          </div>
        </div>
      `;
      const mountRoot = document.getElementById("Mylist2Manager") || document.body;
      mountRoot.insertAdjacentHTML("beforeend", modalHTML);
      const modal = document.querySelector(".cml2-alert-modal");
      const okButton = document.getElementById("alertOkButton");
      if (!modal || !okButton) {
        window.logger.error("アラートモーダルの要素が作成できませんでした");
        resolve(false);
        return;
      }
      modal.style.display = "flex";
      const onKey = (e) => {
        if (e.key === "Escape") {
          modal.remove();
          document.removeEventListener("keydown", onKey);
          modal.removeEventListener("click", onBackdrop);
          if (progressModal && wasProgressVisible) progressModal.style.display = "flex";
          resolve(false);
        }
      };
      const onBackdrop = (e) => {
        if (e.target === modal) {
          modal.remove();
          document.removeEventListener("keydown", onKey);
          modal.removeEventListener("click", onBackdrop);
          if (progressModal && wasProgressVisible) progressModal.style.display = "flex";
          resolve(false);
        }
      };
      document.addEventListener("keydown", onKey);
      modal.addEventListener("click", onBackdrop);
      okButton.addEventListener("click", () => {
        document.removeEventListener("keydown", onKey);
        modal.removeEventListener("click", onBackdrop);
        modal.remove();
        if (progressModal && wasProgressVisible) progressModal.style.display = "flex";
        resolve(true);
      });
    });
  }
  // カスタム確認ダイアログの実装
  showCustomConfirm(message, type = "warning", title = "") {
    return new Promise((resolve) => {
      const progressModal = document.getElementById("progressModal");
      const wasProgressVisible = progressModal ? getComputedStyle(progressModal).display !== "none" : false;
      if (progressModal && wasProgressVisible) {
        progressModal.style.display = "none";
      }
      const modalHTML = `
        <div class="cml2-alert-modal">
          <div class="cml2-alert-content ${type}">
            ${title ? `<h3 class="cml2-alert-title">${title}</h3>` : ""}
            <div class="cml2-alert-message">${message}</div>
            <div class="cml2-alert-buttons">
              <button class="cml2-btn" id="confirmCancelButton">${createMaterialIcon(ICONS.close, { color: "white" })}キャンセル</button>
              <button class="cml2-btn" id="confirmOkButton">${createMaterialIcon(ICONS.check, { color: "white" })}OK</button>
            </div>
          </div>
        </div>
      `;
      const mountRoot = document.getElementById("Mylist2Manager") || document.body;
      mountRoot.insertAdjacentHTML("beforeend", modalHTML);
      const modal = document.querySelector(".cml2-alert-modal");
      const okButton = document.getElementById("confirmOkButton");
      const cancelButton = document.getElementById("confirmCancelButton");
      if (!modal || !okButton || !cancelButton) {
        window.logger.error("確認モーダルの要素が作成できませんでした");
        resolve(false);
        return;
      }
      modal.style.display = "flex";
      const cleanup = (result) => {
        document.removeEventListener("keydown", onKey);
        modal.removeEventListener("click", onBackdrop);
        modal.remove();
        if (progressModal && wasProgressVisible) progressModal.style.display = "flex";
        resolve(result);
      };
      const onKey = (e) => {
        if (e.key === "Escape") cleanup(false);
      };
      const onBackdrop = (e) => {
        if (e.target === modal) cleanup(false);
      };
      document.addEventListener("keydown", onKey);
      modal.addEventListener("click", onBackdrop);
      okButton.addEventListener("click", () => {
        cleanup(true);
      });
      cancelButton.addEventListener("click", () => {
        cleanup(false);
      });
    });
  }
  // マイリスト選択モーダルを表示する共通関数
  async showMylistSelectModal(action, mylists, currentMylistId, title = "") {
    try {
      const availableMylists = mylists.filter((mylist) => mylist.id !== currentMylistId);
      if (availableMylists.length === 0) {
        throw new Error("移動先のマイリストがありません");
      }
      const modalHTML = `
        <div class="cml2-modal">
          <div class="cml2-modal-content">
            <h3 class="cml2-modal-title">
              ${title ? `「${title}」を${action}` : `選択した項目を${action}`}
            </h3>
            <div class="cml2-modal-body">
              <select class="cml2-select" id="targetMylist">
                ${availableMylists.map(
        (mylist) => `<option value="${mylist.id}">${mylist.name}</option>`
      ).join("")}
              </select>
            </div>
            <div class="cml2-modal-footer">
              <button class="cml2-btn" id="cancelAction">${createMaterialIcon(ICONS.close, { color: "white" })}キャンセル</button>
              <button class="cml2-btn" id="confirmAction">${createMaterialIcon(ICONS.check, { color: "white" })}OK</button>
            </div>
          </div>
        </div>
      `;
      const mountRoot = document.getElementById("Mylist2Manager") || document.body;
      mountRoot.insertAdjacentHTML("beforeend", modalHTML);
      return new Promise((resolve) => {
        const modal = document.querySelector(".cml2-modal");
        const confirmBtn = document.getElementById("confirmAction");
        const cancelBtn = document.getElementById("cancelAction");
        const select = document.getElementById("targetMylist");
        if (!modal || !confirmBtn || !cancelBtn || !select) {
          window.logger.error("マイリスト選択モーダルの要素が作成できませんでした");
          resolve(null);
          return;
        }
        const cleanup = (res) => {
          document.removeEventListener("keydown", onKey);
          modal.removeEventListener("click", onBackdrop);
          modal.remove();
          resolve(res);
        };
        const onKey = (e) => {
          if (e.key === "Escape") cleanup(null);
        };
        const onBackdrop = (e) => {
          if (e.target === modal) cleanup(null);
        };
        confirmBtn.addEventListener("click", () => {
          const selectedId = parseInt(select.value);
          cleanup(Number.isNaN(selectedId) ? null : selectedId);
        });
        cancelBtn.addEventListener("click", () => {
          cleanup(null);
        });
        document.addEventListener("keydown", onKey);
        modal.addEventListener("click", onBackdrop);
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "マイリスト選択に失敗しました";
      await this.showCustomAlert(errorMessage);
      return null;
    }
  }
  // キーワード編集モーダルを表示する関数
  async showKeywordEditModal(keywordId, currentKeyword) {
    return new Promise((resolve) => {
      const modal = document.getElementById("keywordEditModal");
      if (!modal) {
        window.logger.error("キーワード編集モーダルが見つかりません");
        resolve(null);
        return;
      }
      const input = modal.querySelector("#editKeywordInput");
      const closeButton = modal.querySelector(".close-button");
      const saveButton = modal.querySelector("#saveKeywordEdit");
      if (!input || !closeButton || !saveButton) {
        window.logger.error("キーワード編集モーダルの要素が見つかりません");
        resolve(null);
        return;
      }
      input.value = currentKeyword;
      modal.style.display = "flex";
      const closeHandler = () => {
        modal.style.display = "none";
        closeButton.removeEventListener("click", closeHandler);
        saveButton.removeEventListener("click", saveHandler);
        resolve(null);
      };
      const saveHandler = () => {
        const newKeyword = input.value;
        modal.style.display = "none";
        closeButton.removeEventListener("click", closeHandler);
        saveButton.removeEventListener("click", saveHandler);
        resolve(newKeyword);
      };
      closeButton.addEventListener("click", closeHandler);
      saveButton.addEventListener("click", saveHandler);
    });
  }
  // エクスポートオプションモーダル
  async showExportOptionsModal() {
    return new Promise((resolve) => {
      const html = `
        <div class="cml2-modal" style="display:flex">
          <div class="cml2-modal-content">
            <h3 class="cml2-modal-title">エクスポート方法を選択</h3>
            <div class="cml2-modal-body">
              <div style="display:flex; flex-direction:column; gap:8px">
                <button class="cml2-btn" id="exportLocal">${createMaterialIcon(ICONS.download, { color: "white" })}ローカルに保存</button>
                <button class="cml2-btn" id="exportCloud">${createMaterialIcon(ICONS.cloud_upload, { color: "white" })}クラウドにバックアップ</button>
              </div>
            </div>
            <div class="cml2-modal-footer">
              <button class="cml2-btn" id="exportCancel">${createMaterialIcon(ICONS.close, { color: "white" })}キャンセル</button>
            </div>
          </div>
        </div>`;
      const mountRoot = document.getElementById("Mylist2Manager") || document.body;
      mountRoot.insertAdjacentHTML("beforeend", html);
      const modal = document.querySelector(".cml2-modal");
      const cleanup = () => {
        document.removeEventListener("keydown", onKey);
        modal?.removeEventListener("click", onBackdrop);
        modal?.remove();
      };
      const onKey = (e) => {
        if (e.key === "Escape") {
          cleanup();
          resolve({ action: "cancel" });
        }
      };
      const onBackdrop = (e) => {
        if (e.target === modal) {
          cleanup();
          resolve({ action: "cancel" });
        }
      };
      const bind = (id, result) => {
        const el = document.getElementById(id);
        if (el) el.addEventListener("click", () => {
          cleanup();
          resolve({ action: result });
        });
      };
      bind("exportLocal", "local");
      bind("exportCloud", "cloud");
      bind("exportCancel", "cancel");
      document.addEventListener("keydown", onKey);
      modal.addEventListener("click", onBackdrop);
    });
  }
  // インポートオプションモーダル
  async showImportOptionsModal() {
    return new Promise((resolve) => {
      const html = `
        <div class="cml2-modal" style="display:flex">
          <div class="cml2-modal-content">
            <h3 class="cml2-modal-title">インポート方法を選択</h3>
            <div class="cml2-modal-body">
              <div style="display:flex; flex-direction:column; gap:8px">
                <button class="cml2-btn" id="importLocal">${createMaterialIcon(ICONS.upload, { color: "white" })}ローカルからインポート</button>
                <button class="cml2-btn" id="importClear">${createMaterialIcon(ICONS.delete, { color: "white" })}データベースのクリア</button>
                <button class="cml2-btn" id="importCloud">${createMaterialIcon(ICONS.cloud_download, { color: "white" })}クラウドからインポート</button>
              </div>
            </div>
            <div class="cml2-modal-footer">
              <button class="cml2-btn" id="importCancel">${createMaterialIcon(ICONS.close, { color: "white" })}キャンセル</button>
            </div>
          </div>
        </div>`;
      const mountRoot = document.getElementById("Mylist2Manager") || document.body;
      mountRoot.insertAdjacentHTML("beforeend", html);
      const modal = document.querySelector(".cml2-modal");
      const cleanup = () => {
        document.removeEventListener("keydown", onKey);
        modal?.removeEventListener("click", onBackdrop);
        modal?.remove();
      };
      const bind = (id, result) => {
        const el = document.getElementById(id);
        if (el) el.addEventListener("click", () => {
          cleanup();
          resolve({ action: result });
        });
      };
      bind("importLocal", "local");
      bind("importClear", "clear");
      bind("importCloud", "cloud");
      bind("importCancel", "cancel");
      const onKey = (e) => {
        if (e.key === "Escape") {
          cleanup();
          resolve({ action: "cancel" });
        }
      };
      const onBackdrop = (e) => {
        if (e.target === modal) {
          cleanup();
          resolve({ action: "cancel" });
        }
      };
      document.addEventListener("keydown", onKey);
      modal.addEventListener("click", onBackdrop);
    });
  }
  // クラウドプロバイダ選択モーダル
  async showCloudProviderSelectModal() {
    return new Promise((resolve) => {
      const html = `
        <div class="cml2-modal" style="display:flex">
          <div class="cml2-modal-content">
            <h3 class="cml2-modal-title">クラウドストレージを選択</h3>
            <div class="cml2-modal-body">
              <div style="display:flex; flex-direction:column; gap:8px">
                <button class="cml2-btn" id="selG">${createMaterialIcon(ICONS.cloud_upload, { color: "white" })}Google Drive</button>
                <button class="cml2-btn" id="selO">${createMaterialIcon(ICONS.cloud_upload, { color: "white" })}OneDrive</button>
                <button class="cml2-btn" id="selD">${createMaterialIcon(ICONS.cloud_upload, { color: "white" })}Dropbox</button>
                <button class="cml2-btn" id="selM">${createMaterialIcon(ICONS.cloud_upload, { color: "white" })}MEGA (β)</button>
              </div>
            </div>
            <div class="cml2-modal-footer">
              <button class="cml2-btn" id="selCancel">${createMaterialIcon(ICONS.close, { color: "white" })}キャンセル</button>
            </div>
          </div>
        </div>`;
      const mountRoot = document.getElementById("Mylist2Manager") || document.body;
      mountRoot.insertAdjacentHTML("beforeend", html);
      const modal = document.querySelector(".cml2-modal");
      const cleanup = () => {
        document.removeEventListener("keydown", onKey);
        modal?.removeEventListener("click", onBackdrop);
        modal?.remove();
      };
      const onKey = (e) => {
        if (e.key === "Escape") {
          cleanup();
          resolve(null);
        }
      };
      const onBackdrop = (e) => {
        if (e.target === modal) {
          cleanup();
          resolve(null);
        }
      };
      const bind = (id, result) => {
        const el = document.getElementById(id);
        if (el) el.addEventListener("click", () => {
          cleanup();
          resolve(result);
        });
      };
      bind("selG", "gdrive");
      bind("selO", "onedrive");
      bind("selD", "dropbox");
      bind("selM", "mega");
      bind("selCancel", null);
      document.addEventListener("keydown", onKey);
      modal.addEventListener("click", onBackdrop);
    });
  }
  // 汎用選択モーダル（セレクトで一つ選ぶ）
  async showSelectionModal(title, items, confirmText = "OK") {
    return new Promise((resolve) => {
      const html = `
        <div class="cml2-modal" style="display:flex">
          <div class="cml2-modal-content">
            <h3 class="cml2-modal-title">${title}</h3>
            <div class="cml2-modal-body">
              <select class="cml2-select" id="cml2Selection">
                ${items.map((it) => `<option value="${it.id}">${it.label}${it.subLabel ? ` - ${it.subLabel}` : ""}</option>`).join("")}
              </select>
            </div>
            <div class="cml2-modal-footer">
              <button class="cml2-btn" id="cml2SelectionCancel">${createMaterialIcon(ICONS.close, { color: "white" })}キャンセル</button>
              <button class="cml2-btn" id="cml2SelectionOk">${createMaterialIcon(ICONS.check, { color: "white" })}${confirmText}</button>
            </div>
          </div>
        </div>`;
      const mountRoot = document.getElementById("Mylist2Manager") || document.body;
      mountRoot.insertAdjacentHTML("beforeend", html);
      const modal = document.querySelector(".cml2-modal");
      const select = document.getElementById("cml2Selection");
      const ok = document.getElementById("cml2SelectionOk");
      const cancel = document.getElementById("cml2SelectionCancel");
      if (!modal || !select || !ok || !cancel) {
        resolve(null);
        return;
      }
      const cleanup = (res) => {
        document.removeEventListener("keydown", onKey);
        modal.removeEventListener("click", onBackdrop);
        modal.remove();
        resolve(res);
      };
      const onKey = (e) => {
        if (e.key === "Escape") cleanup(null);
      };
      const onBackdrop = (e) => {
        if (e.target === modal) cleanup(null);
      };
      ok.addEventListener("click", () => {
        const v = select.value;
        cleanup(v || null);
      });
      cancel.addEventListener("click", () => {
        cleanup(null);
      });
      document.addEventListener("keydown", onKey);
      modal.addEventListener("click", onBackdrop);
    });
  }
}

class ValidationService {
  // 入力値のサニタイズとバリデーション用の関数
  sanitizeInput(input) {
    const sanitized = input.replace(/<[^>]*>/g, "");
    const chars = [];
    for (let i = 0; i < sanitized.length; i++) {
      const code = sanitized.charCodeAt(i);
      if (code > 8 && code < 14 && code !== 11 && code !== 12 || // TAB,LF,CRは許可
      code > 31 && code < 127 || // 通常の表示可能なASCII
      code > 127) {
        chars.push(sanitized[i]);
      }
    }
    return chars.join("").trim();
  }
  validateInput(input, type = "text") {
    const sanitized = this.sanitizeInput(input);
    if (!sanitized) {
      throw new Error("入力値が空です");
    }
    switch (type) {
      case "mylistName":
        if (sanitized.length > 50) {
          throw new Error("マイリスト名は50文字以内にしてください");
        }
        if (/[/\\?*"<>|#:]/.test(sanitized)) {
          throw new Error("マイリスト名に使用できない文字が含まれています");
        }
        break;
      case "videoId":
        if (sanitized.includes("nicovideo.jp") || sanitized.includes("nico.ms")) {
          try {
            new URL(sanitized);
          } catch {
            throw new Error("無効なURLです");
          }
        } else {
          if (!sanitized.match(/^(?:sm|so|nm|nx)\d+$/)) {
            throw new Error("無効な動画IDです");
          }
        }
        break;
    }
    return sanitized;
  }
}

class ProgressService {
  constructor() {
    const progressModalElement = document.getElementById("progressModal");
    if (!progressModalElement) {
      window.logger.error("進捗モーダルが見つかりません！");
      throw new Error("進捗モーダルが見つかりません");
    }
    this.progressModal = progressModalElement;
    const progressPathElement = this.progressModal.querySelector(".progress");
    if (!progressPathElement) {
      window.logger.error("進捗パスが見つかりません！");
      throw new Error("進捗パスが見つかりません");
    }
    this.progressPath = progressPathElement;
    const progressTextElement = this.progressModal.querySelector(".progress-text");
    if (!progressTextElement) {
      window.logger.error("進捗テキストが見つかりません！");
      throw new Error("進捗テキストが見つかりません");
    }
    this.progressText = progressTextElement;
    const progressStatusElement = this.progressModal.querySelector(".progress-status");
    if (!progressStatusElement) {
      window.logger.error("進捗ステータスが見つかりません！");
      throw new Error("進捗ステータスが見つかりません");
    }
    this.progressStatus = progressStatusElement;
  }
  updateProgress(current, total) {
    const percentage = Math.round(current / total * 100);
    const offset = 100 - percentage;
    const progressPath = this.progressModal.querySelector(".progress");
    if (progressPath) {
      progressPath.style.strokeDashoffset = offset.toString();
    }
    if (this.progressText) {
      this.progressText.textContent = `${percentage}%`;
    }
    if (this.progressStatus) {
      this.progressStatus.textContent = `${current} / ${total} 件の動画を処理中...`;
    }
  }
  showProgress() {
    if (!this.progressModal) {
      window.logger.error("進捗モーダルが初期化されていません！");
      return;
    }
    this.progressModal.style.display = "flex";
  }
  hideProgress() {
    if (!this.progressModal) {
      window.logger.error("進捗モーダルが初期化されていません！");
      return;
    }
    this.progressModal.style.display = "none";
    this.updateProgress(0, 0);
  }
  // 更新所要時間の計算（分単位）
  calculateUpdateDuration(videoCount) {
    const baseDelay = 200;
    const batchSize = 50;
    const batchDelay = 2e3;
    const batchCount = Math.ceil(videoCount / batchSize);
    const totalTime = videoCount * baseDelay + batchCount * batchDelay;
    return totalTime / (1e3 * 60);
  }
}

class FileHelperService {
  // ファイル名生成用のヘルパーメソッド
  formatDateTime() {
    const now = /* @__PURE__ */ new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const hour = String(now.getHours()).padStart(2, "0");
    const minute = String(now.getMinutes()).padStart(2, "0");
    const second = String(now.getSeconds()).padStart(2, "0");
    return `${year}${month}${day}_${hour}${minute}${second}`;
  }
  // 動画の長さを秒数に変換するヘルパーメソッド
  parseLength(lengthText) {
    const [minutes, seconds] = lengthText.replace(/分|秒/g, ":").split(":").map((num) => parseInt(num || "0", 10));
    return (minutes || 0) * 60 + (seconds || 0);
  }
  // エクスポート処理
  async downloadFile(data, fileName) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    await new Promise((resolve, reject) => {
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      a.onclick = () => {
        setTimeout(() => {
          URL.revokeObjectURL(url);
          resolve();
        }, 1e3);
      };
      a.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("ダウンロードに失敗しました"));
      };
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    });
  }
  // ファイル読み込み処理
  async readFile(file) {
    return file.text();
  }
}

class EventHandlers {
  constructor(manager, modalService, validationService, progressService, fileHelperService, getCurrentMylistId, setCurrentMylistId, loadMylists, loadVideos) {
    this.manager = manager;
    this.modalService = modalService;
    this.validationService = validationService;
    this.progressService = progressService;
    this.fileHelperService = fileHelperService;
    this.getCurrentMylistId = getCurrentMylistId;
    this.setCurrentMylistId = setCurrentMylistId;
    this.loadMylists = loadMylists;
    this.loadVideos = loadVideos;
  }
  // BatchOperationsから呼び出されるためのパブリックメソッド
  getCurrentMylist() {
    return this.getCurrentMylistId();
  }
  // 動画操作ハンドラー
  async handleVideoMove(event) {
    if (!event.target) return;
    const target = event.target;
    const videoItem = target.closest(".video-item");
    if (!videoItem) return;
    const titleElement = videoItem.querySelector(".video-title");
    if (!titleElement) return;
    const videoTitle = titleElement.textContent || "";
    await this.moveVideo(videoItem, videoTitle);
  }
  async handleVideoCopy(event) {
    if (!event.target) return;
    const target = event.target;
    const videoItem = target.closest(".video-item");
    if (!videoItem) return;
    const titleElement = videoItem.querySelector(".video-title");
    if (!titleElement) return;
    const videoTitle = titleElement.textContent || "";
    await this.copyVideo(videoItem, videoTitle);
  }
  async handleVideoDelete(event) {
    if (!event.target) return;
    const target = event.target;
    const videoItem = target.closest(".video-item");
    if (!videoItem) return;
    const compositeId = videoItem.dataset.compositeId;
    if (!compositeId) return;
    const titleElement = videoItem.querySelector(".video-title");
    if (!titleElement) return;
    const videoTitle = titleElement.textContent || "";
    if (await this.modalService.showCustomConfirm(`「${videoTitle}」をマイリストから削除しますか？`)) {
      try {
        await this.manager.deleteVideo(compositeId);
        await this.loadVideos();
      } catch (error) {
        window.logger.error("動画の削除に失敗しました:", error);
      }
    }
  }
  async handleVideoRefresh(event) {
    if (!event.target) return;
    const target = event.target;
    const videoItem = target.closest(".video-item");
    if (!videoItem) return;
    const videoId = videoItem.dataset.id;
    const compositeId = videoItem.dataset.compositeId;
    if (!videoId || !compositeId) return;
    try {
      target.disabled = true;
      target.textContent = "更新中...";
      this.progressService.showProgress();
      this.progressService.updateProgress(0, 1);
      const videoInfo = await this.manager.fetchVideoInfo(videoId);
      await this.manager.updateVideoInfo(compositeId, videoInfo);
      await this.loadVideos();
      this.progressService.updateProgress(1, 1);
    } catch (error) {
      window.logger.error("動画情報の更新に失敗しました:", error);
      const errorMessage = error instanceof Error ? error.message : "不明なエラー";
      await this.modalService.showCustomAlert("動画情報の更新に失敗しました: " + errorMessage);
      target.disabled = false;
      target.textContent = "情報更新";
    } finally {
      this.progressService.hideProgress();
    }
  }
  // キーワード操作ハンドラー
  async handleKeywordMove(event) {
    if (!event.target) return;
    const target = event.target;
    const item = target.closest(".keyword-item");
    if (!item) return;
    const keywordIdStr = item.dataset.id;
    if (!keywordIdStr) return;
    const keywordId = parseInt(keywordIdStr);
    const keywordTextElement = item.querySelector(".keyword-text");
    if (!keywordTextElement) return;
    const keywordText = keywordTextElement.textContent || "";
    try {
      const mylists = await this.manager.getAllMylists();
      const currentMylistId = this.getCurrentMylistId();
      const targetMylistId = await this.modalService.showMylistSelectModal("移動", mylists, currentMylistId, keywordText);
      if (!targetMylistId) return;
      await this.manager.moveKeyword(keywordId, targetMylistId);
      await this.loadVideos();
      await this.modalService.showCustomAlert("キーワードを移動しました");
    } catch (error) {
      window.logger.error("キーワードの移動に失敗しました:", error);
      const errorMessage = error instanceof Error ? error.message : "キーワードの移動に失敗しました";
      await this.modalService.showCustomAlert(errorMessage);
    }
  }
  async handleKeywordCopy(event) {
    if (!event.target) return;
    const target = event.target;
    const item = target.closest(".keyword-item");
    if (!item) return;
    const keywordTextElement = item.querySelector(".keyword-text");
    if (!keywordTextElement) return;
    const keywordText = keywordTextElement.textContent || "";
    try {
      const mylists = await this.manager.getAllMylists();
      const currentMylistId = this.getCurrentMylistId();
      const targetMylistId = await this.modalService.showMylistSelectModal("コピー", mylists, currentMylistId, keywordText);
      if (!targetMylistId) return;
      await this.manager.addKeyword(targetMylistId, keywordText);
      await this.modalService.showCustomAlert("キーワードをコピーしました");
    } catch (error) {
      window.logger.error("キーワードのコピーに失敗しました:", error);
      const errorMessage = error instanceof Error ? error.message : "キーワードのコピーに失敗しました";
      await this.modalService.showCustomAlert(errorMessage);
    }
  }
  async handleKeywordDelete(event) {
    if (!event.target) return;
    const target = event.target;
    const item = target.closest(".keyword-item");
    if (!item) return;
    const keywordIdStr = item.dataset.id;
    if (!keywordIdStr) return;
    const keywordId = parseInt(keywordIdStr);
    const keywordTextElement = item.querySelector(".keyword-text");
    if (!keywordTextElement) return;
    const keywordText = keywordTextElement.textContent || "";
    if (await this.modalService.showCustomConfirm(`キーワード「${keywordText}」を削除しますか？`)) {
      try {
        await this.manager.deleteKeyword(keywordId);
        await this.loadVideos();
        await this.modalService.showCustomAlert("キーワードを削除しました");
      } catch (error) {
        window.logger.error("キーワードの削除に失敗しました:", error);
        const errorMessage = error instanceof Error ? error.message : "キーワードの削除に失敗しました";
        await this.modalService.showCustomAlert(errorMessage);
      }
    }
  }
  async handleKeywordEdit(event) {
    if (!event.target) return;
    const target = event.target;
    const item = target.closest(".keyword-item");
    if (!item) return;
    const keywordIdStr = item.dataset.id;
    if (!keywordIdStr) return;
    const keywordId = parseInt(keywordIdStr);
    const keywordTextElement = item.querySelector(".keyword-text");
    if (!keywordTextElement) return;
    const currentKeyword = keywordTextElement.textContent || "";
    try {
      const newKeyword = await this.modalService.showKeywordEditModal(keywordId, currentKeyword);
      if (!newKeyword) return;
      await this.manager.updateKeyword(keywordId, newKeyword);
      await this.loadVideos();
      await this.modalService.showCustomAlert("キーワードを編集しました");
    } catch (error) {
      window.logger.error("キーワードの編集に失敗しました:", error);
      const errorMessage = error instanceof Error ? error.message : "キーワードの編集に失敗しました";
      await this.modalService.showCustomAlert(errorMessage);
    }
  }
  // 動画移動メソッド
  async moveVideo(videoItem, videoTitle) {
    try {
      const mylists = await this.manager.getAllMylists();
      const currentMylistId = this.getCurrentMylistId();
      const targetMylistId = await this.modalService.showMylistSelectModal("移動", mylists, currentMylistId, videoTitle);
      if (!targetMylistId) return;
      const compositeId = videoItem.dataset.compositeId;
      if (!compositeId) {
        throw new Error("動画IDが取得できません");
      }
      const videoData = await this.getVideoData(videoItem);
      if (!videoData) {
        throw new Error("動画データが取得できません");
      }
      await this.manager.addVideo(targetMylistId, videoData);
      await this.manager.deleteVideo(compositeId);
      await this.loadVideos();
      await this.modalService.showCustomAlert("動画を移動しました");
    } catch (error) {
      window.logger.error("動画の移動に失敗しました:", error);
      const errorMessage = error instanceof Error ? error.message : "動画の移動に失敗しました";
      await this.modalService.showCustomAlert(errorMessage);
    }
  }
  // 動画コピーメソッド
  async copyVideo(videoItem, videoTitle) {
    try {
      const mylists = await this.manager.getAllMylists();
      const currentMylistId = this.getCurrentMylistId();
      const targetMylistId = await this.modalService.showMylistSelectModal("コピー", mylists, currentMylistId, videoTitle);
      if (!targetMylistId) return;
      const videoData = await this.getVideoData(videoItem);
      if (!videoData) {
        throw new Error("動画データが取得できません");
      }
      await this.manager.addVideo(targetMylistId, videoData);
      await this.modalService.showCustomAlert("動画をコピーしました");
    } catch (error) {
      window.logger.error("動画のコピーに失敗しました:", error);
      const errorMessage = error instanceof Error ? error.message : "動画のコピーに失敗しました";
      await this.modalService.showCustomAlert(errorMessage);
    }
  }
  // getVideoDataメソッド（publicに変更）
  async getVideoData(videoItem) {
    await Promise.resolve();
    const id = videoItem.dataset.id;
    const titleElement = videoItem.querySelector(".video-title-link") || videoItem.querySelector(".video-title");
    const viewCountElement = videoItem.querySelector(".view-count");
    const commentCountElement = videoItem.querySelector(".comment-count");
    const mylistCountElement = videoItem.querySelector(".mylist-count");
    const thumbnailElement = videoItem.querySelector(".video-thumbnail");
    const uploadDateElement = videoItem.querySelector(".video-upload-date");
    const authorElement = videoItem.querySelector(".video-author");
    const lengthElement = videoItem.querySelector(".video-length");
    if (!id) {
      window.logger.error("動画IDが取得できません");
      return null;
    }
    const currentMylistId = this.getCurrentMylistId();
    if (currentMylistId === null) {
      window.logger.error("現在のマイリストIDが設定されていません");
      return null;
    }
    const title = titleElement?.textContent || "無題";
    const viewCount = parseInt(viewCountElement?.textContent?.replace(/[^0-9]/g, "") || "0");
    const commentCount = parseInt(commentCountElement?.textContent?.replace(/[^0-9]/g, "") || "0");
    const mylistCount = parseInt(mylistCountElement?.textContent?.replace(/[^0-9]/g, "") || "0");
    const thumbnailUrl = thumbnailElement?.src || "";
    let uploadedAt = Date.now();
    if (uploadDateElement?.textContent) {
      const dateStr = uploadDateElement.textContent.replace("投稿日: ", "");
      const parsedDate = new Date(dateStr);
      if (!isNaN(parsedDate.getTime())) {
        uploadedAt = parsedDate.getTime();
      }
    }
    const authorName = authorElement?.textContent?.replace("投稿者: ", "") || "不明";
    const length = lengthElement ? this.fileHelperService.parseLength(lengthElement.textContent || "") : 0;
    const descriptionFromDom = videoItem.dataset.description;
    let tagsFromDom;
    const rawTags = videoItem.dataset.tags;
    if (rawTags) {
      try {
        const parsed = JSON.parse(rawTags);
        if (Array.isArray(parsed)) {
          const onlyStrings = parsed.filter((t) => typeof t === "string");
          tagsFromDom = onlyStrings;
        }
      } catch (e) {
      }
    }
    const memoFromDom = videoItem.dataset.memo;
    const result = {
      id,
      originalId: id,
      title,
      viewCount,
      commentCount,
      mylistCount,
      thumbnailUrl,
      uploadedAt,
      authorName,
      length,
      // 可能なら説明/タグ/メモを保持
      ...descriptionFromDom ? { description: descriptionFromDom } : {},
      ...tagsFromDom && tagsFromDom.length > 0 ? { tags: tagsFromDom } : {},
      ...memoFromDom !== void 0 ? { memo: memoFromDom } : {},
      addedAt: Date.now(),
      mylistId: currentMylistId
    };
    return result;
  }
}

class BatchOperations {
  constructor(manager, modalService, progressService, eventHandlers, loadVideos) {
    this.manager = manager;
    this.modalService = modalService;
    this.progressService = progressService;
    this.eventHandlers = eventHandlers;
    this.loadVideos = loadVideos;
  }
  // 一括移動の処理
  async moveSelectedItems(videos, keywords) {
    const targetMylistId = await this.modalService.showMylistSelectModal(
      "移動",
      await this.manager.getAllMylists(),
      this.eventHandlers.getCurrentMylist()
    );
    if (!targetMylistId) return;
    for (const video of videos) {
      const videoData = await this.eventHandlers.getVideoData(video);
      if (videoData) {
        await this.manager.addVideo(targetMylistId, videoData);
        const compositeId = video.dataset.compositeId;
        if (compositeId) {
          await this.manager.deleteVideo(compositeId);
        }
      }
    }
    for (const keyword of keywords) {
      const keywordIdStr = keyword.dataset.id;
      if (keywordIdStr) {
        const keywordId = parseInt(keywordIdStr);
        await this.manager.moveKeyword(keywordId, targetMylistId);
      }
    }
    await this.loadVideos();
    await this.modalService.showCustomAlert("選択した項目を移動しました");
  }
  // 一括コピーの処理
  async copySelectedItems(videos, keywords) {
    const targetMylistId = await this.modalService.showMylistSelectModal(
      "コピー",
      await this.manager.getAllMylists(),
      this.eventHandlers.getCurrentMylist()
    );
    if (!targetMylistId) return;
    for (const video of videos) {
      const videoData = await this.eventHandlers.getVideoData(video);
      if (videoData) {
        await this.manager.addVideo(targetMylistId, videoData);
      }
    }
    for (const keyword of keywords) {
      const keywordTextElement = keyword.querySelector(".keyword-text");
      if (keywordTextElement && keywordTextElement.textContent) {
        await this.manager.addKeyword(targetMylistId, keywordTextElement.textContent);
      }
    }
    await this.modalService.showCustomAlert("選択した項目をコピーしました");
  }
  // 一括削除の処理
  async deleteSelectedItems(videos, keywords) {
    const titles = [];
    for (const video of videos) {
      const titleElement = video.querySelector(".video-title-link") || video.querySelector(".video-title");
      if (titleElement && titleElement.textContent) {
        titles.push(titleElement.textContent);
      }
    }
    for (const keyword of keywords) {
      const keywordTextElement = keyword.querySelector(".keyword-text");
      if (keywordTextElement && keywordTextElement.textContent) {
        titles.push(`キーワード: ${keywordTextElement.textContent}`);
      }
    }
    const confirmMessage = `以下の${titles.length}件の項目を削除しますか？

` + titles.map((title) => `・${title}`).join("\n");
    if (!await this.modalService.showCustomConfirm(confirmMessage)) return;
    for (const video of videos) {
      const compositeId = video.dataset.compositeId;
      if (compositeId) {
        await this.manager.deleteVideo(compositeId);
      }
    }
    for (const keyword of keywords) {
      const keywordIdStr = keyword.dataset.id;
      if (keywordIdStr) {
        const keywordId = parseInt(keywordIdStr);
        await this.manager.deleteKeyword(keywordId);
      }
    }
    await this.loadVideos();
    await this.modalService.showCustomAlert("選択した項目を削除しました");
  }
  // 一括情報更新の処理
  async refreshSelectedVideos(selectedVideos) {
    const total = selectedVideos.length;
    let processed = 0;
    const batchSize = 50;
    this.progressService.showProgress();
    try {
      for (let i = 0; i < selectedVideos.length; i++) {
        const video = selectedVideos[i];
        const videoId = video.dataset.id;
        const compositeId = video.dataset.compositeId;
        if (!videoId || !compositeId) continue;
        try {
          const videoInfo = await this.manager.fetchVideoInfo(videoId);
          await this.manager.updateVideoInfo(compositeId, videoInfo);
          processed++;
          this.progressService.updateProgress(processed, total);
          video.style.opacity = "0.5";
        } catch (error) {
          window.logger.error(`動画ID ${videoId} の更新に失敗:`, error);
        }
        await new Promise((resolve) => setTimeout(resolve, 200));
        if (processed % batchSize === 0 && i < selectedVideos.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 2e3));
        }
      }
      await this.loadVideos();
      await this.modalService.showCustomAlert(`${processed}件の動画情報を更新しました`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "動画情報の更新に失敗しました";
      throw new Error("動画情報の更新に失敗しました: " + errorMessage);
    } finally {
      this.progressService.hideProgress();
    }
  }
}

const escapeHtml = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
const linkify = (text) => {
  const re = /(https?:\/\/[^\s<'"]+)|(\bmylist\/(\d+)\b)|(\b([a-z]{2}\d+)\b)/g;
  let result = "";
  let last = 0;
  let m;
  while ((m = re.exec(text)) !== null) {
    result += escapeHtml(text.slice(last, m.index));
    let href = "";
    let label = "";
    if (m[1]) {
      href = m[1];
      label = m[1];
    } else if (m[2]) {
      href = `https://www.nicovideo.jp/mylist/${m[3]}`;
      label = m[2];
    } else if (m[4]) {
      href = `https://www.nicovideo.jp/watch/${m[5]}`;
      label = m[5];
    }
    result += `<a class="cml2-video-link" href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(label)}</a>`;
    last = re.lastIndex;
  }
  result += escapeHtml(text.slice(last));
  return result;
};

class Mylist2ManagerUI {
  constructor() {
    this.manager = new Mylist2Manager();
    this.currentMylistId = null;
    this.modalService = new ModalService();
    this.validationService = new ValidationService();
    this.progressService = new ProgressService();
    this.fileHelperService = new FileHelperService();
    this.eventHandlers = new EventHandlers(
      this.manager,
      this.modalService,
      this.validationService,
      this.progressService,
      this.fileHelperService,
      () => this.currentMylistId,
      (id) => {
        this.currentMylistId = id;
      },
      () => this.loadMylists(),
      () => this.loadVideos()
    );
    this.batchOperations = new BatchOperations(
      this.manager,
      this.modalService,
      this.progressService,
      this.eventHandlers,
      () => this.loadVideos()
    );
    this.initializeTemplates();
    this.initializeEventListeners();
    this.initializeAdditionalControls();
    this.initializeCollapsibleControls();
    void this.initializeSettings();
  }
  applyTheme(theme) {
    const root = document.getElementById("Mylist2Manager");
    if (!root) return;
    root.classList.forEach((cls) => {
      if (cls.startsWith("cml2-theme-")) root.classList.remove(cls);
    });
    const themeClass = `cml2-theme-${theme}`;
    root.classList.add(themeClass);
  }
  // デリゲートメソッド群（各サービスへの橋渡し）
  guardEvent(handler) {
    return (event) => {
      void handler(event);
    };
  }
  async showCustomAlert(message, type = "info", title = "") {
    return this.modalService.showCustomAlert(message, type, title);
  }
  async showCustomConfirm(message, type = "warning", title = "") {
    return this.modalService.showCustomConfirm(message, type, title);
  }
  sanitizeInput(input) {
    return this.validationService.sanitizeInput(input);
  }
  validateInput(input, type = "text") {
    return this.validationService.validateInput(input, type);
  }
  updateProgress(current, total) {
    this.progressService.updateProgress(current, total);
  }
  showProgress() {
    this.progressService.showProgress();
  }
  hideProgress() {
    this.progressService.hideProgress();
  }
  formatDateTime() {
    return this.fileHelperService.formatDateTime();
  }
  parseLength(lengthText) {
    return this.fileHelperService.parseLength(lengthText);
  }
  async loadMylists() {
    try {
      window.logger.info("マイリスト一覧を読み込み中...");
      const mylistSortTypeElement = document.getElementById("mylistSortType");
      const sortType = mylistSortTypeElement ? mylistSortTypeElement.value : "name_asc";
      const mylists = await this.sortMylists(sortType);
      await this.renderMylistList(mylists);
    } catch (error) {
      window.logger.error("マイリスト一覧の読み込みに失敗しました:", error);
    }
  }
  async renderMylistList(mylists) {
    const mylistList = document.getElementById("mylistList");
    if (!mylistList) {
      window.logger.error("マイリストリスト要素が見つかりません");
      return;
    }
    const mylistsWithCount = await Promise.all(
      mylists.map(async (mylist) => {
        if (mylist.id === void 0) {
          window.logger.error("マイリストIDが未定義です");
          return { ...mylist, videoCount: 0 };
        }
        const videos = await this.manager.getVideos(mylist.id);
        return {
          ...mylist,
          videoCount: videos.length
        };
      })
    );
    mylistList.innerHTML = mylistsWithCount.map(
      (mylist) => {
        if (mylist.id === void 0) {
          return "";
        }
        return `
            <div class="mylist-item ${this.currentMylistId === mylist.id ? "active" : ""}" data-id="${mylist.id}">
                <div class="mylist-info">
                    <div class="mylist-details">
                        <span class="mylist-name">${mylist.name}</span>
                        <span class="mylist-date">${new Date(
          mylist.createdAt
        ).toLocaleDateString()}</span>
                    </div>
                    <span class="mylist-count-mylist-tab">${mylist.videoCount}件</span>
                </div>
            </div>
          `;
      }
    ).join("");
    mylistList.querySelectorAll(".mylist-item").forEach((item) => {
      item.addEventListener("click", () => {
        const id = item.getAttribute("data-id");
        if (id) {
          void this.selectMylist(parseInt(id));
        }
      });
    });
  }
  async selectMylist(mylistId) {
    this.currentMylistId = mylistId;
    const mylists = await this.manager.getAllMylists();
    const currentMylist = mylists.find((m) => m.id === mylistId);
    if (!currentMylist) {
      window.logger.error("選択されたマイリストが見つかりません");
      return;
    }
    const mylistNameElement = document.getElementById("currentMylistName");
    if (mylistNameElement) {
      mylistNameElement.value = currentMylist.name;
    }
    await this.loadVideos();
    const videos = await this.manager.getVideos(mylistId);
    document.querySelectorAll(".mylist-item").forEach((item) => {
      const idAttr = item.getAttribute("data-id");
      if (!idAttr) return;
      const isActive = parseInt(idAttr) === mylistId;
      item.classList.toggle("active", isActive);
      if (isActive) {
        const countElement = item.querySelector(".mylist-count-mylist-tab");
        if (countElement) {
          countElement.textContent = `${videos.length}件`;
        }
      }
    });
  }
  async loadVideos() {
    if (!this.currentMylistId) {
      window.logger.warn("マイリストが選択されていません");
      return;
    }
    try {
      window.logger.info(`マイリスト ${this.currentMylistId} の動画を読み込み中...`);
      const videoSortTypeElement = document.getElementById("videoSortType");
      const sortType = videoSortTypeElement ? videoSortTypeElement.value : "uploadedAt_desc";
      const videos = await this.manager.getVideos(this.currentMylistId);
      const keywords = await this.manager.getKeywords(this.currentMylistId);
      const sortedVideos = this.sortVideos(videos, sortType);
      const sortedKeywords = this.sortKeywords(keywords, sortType);
      this.renderVideoList(sortedVideos, sortedKeywords);
    } catch (error) {
      window.logger.error("動画一覧の読み込みに失敗しました:", error);
    }
  }
  sortKeywords(keywords, sortType) {
    const [type, order] = sortType.split("_");
    const isAsc = order === "asc";
    return keywords.sort((a, b) => {
      let comparison = 0;
      switch (type) {
        case "title":
          comparison = a.keyword.localeCompare(b.keyword, "ja");
          break;
        case "addedAt":
          comparison = a.addedAt - b.addedAt;
          break;
        default:
          comparison = a.addedAt - b.addedAt;
      }
      return isAsc ? comparison : -comparison;
    });
  }
  // マイリストのソート処理で型を明示的に指定
  async sortMylists(sortType) {
    return await this.manager.sortMylists(sortType);
  }
  // sortVideosメソッドを再実装
  sortVideos(videos, sortType) {
    return this.manager.sortVideos(videos, sortType);
  }
  initializeTemplates() {
    const videoTemplateElement = document.getElementById("videoItemTemplate");
    if (!videoTemplateElement) {
      window.logger.error("動画アイテムのテンプレートが見つかりません！");
      throw new Error("動画アイテムのテンプレートが見つかりません");
    }
    this.videoItemTemplate = videoTemplateElement;
    const keywordTemplateElement = document.getElementById("keywordItemTemplate");
    if (!keywordTemplateElement) {
      window.logger.error("キーワードアイテムのテンプレートが見つかりません！");
      throw new Error("キーワードアイテムのテンプレートが見つかりません");
    }
    this.keywordItemTemplate = keywordTemplateElement;
  }
  initializeAdditionalControls() {
    this.initializeHeaderControls();
    this.initializeSearchEventListeners();
    void this.initializeSettings();
  }
  renderVideoList(videos, keywords) {
    const videoList = document.getElementById("videoList");
    if (!videoList) {
      window.logger.error("動画リスト要素が見つかりません");
      return;
    }
    videoList.innerHTML = "";
    keywords.forEach((keyword) => {
      const keywordElement = this.renderKeywordItem(keyword);
      videoList.appendChild(keywordElement);
    });
    videos.forEach((video) => {
      const videoElement = this.renderVideoItem(video);
      videoList.appendChild(videoElement);
    });
    this.setupVideoListEvents(videoList);
  }
  renderVideoItem(video) {
    if (!this.videoItemTemplate) {
      window.logger.error("動画テンプレートが初期化されていません！");
      const fallbackElement = document.createElement("div");
      fallbackElement.className = "video-item";
      fallbackElement.innerHTML = `
        <input type="checkbox" class="video-select" />
        <img class="video-thumbnail" src="${video.thumbnailUrl}" alt="サムネイル" />
        <div class="video-info">
          <div class="video-title">
            <a href="https://www.nicovideo.jp/watch/${video.originalId}" target="_blank">${video.title}</a>
          </div>
          <div class="video-stats">
            <span class="view-count">再生数: ${video.viewCount.toLocaleString()}</span>
            <span class="comment-count">コメント数: ${video.commentCount.toLocaleString()}</span>
            <span class="mylist-count">マイリスト数: ${video.mylistCount.toLocaleString()}</span>
            <span class="video-length">${Math.floor(video.length / 60)}分${video.length % 60}秒</span>
          </div>
          <div class="video-meta">
            <span class="video-author">投稿者: ${video.authorName}</span>
            <span class="video-upload-date">投稿日: ${new Date(video.uploadedAt).toLocaleDateString()}</span>
          </div>
        </div>
        <div class="video-actions">
          <button class="move-video">${createMaterialIcon("drive_file_move", { color: "white" })}移動</button>
          <button class="copy-video">${createMaterialIcon("content_copy", { color: "white" })}コピー</button>
          <button class="delete-video">${createMaterialIcon(ICONS.delete, { color: "white" })}削除</button>
          <button class="refresh-video">${createMaterialIcon(ICONS.refresh, { color: "white" })}情報更新</button>
          <button class="open-video-details">${createMaterialIcon("info", { color: "white" })}詳細</button>
        </div>
      `;
      fallbackElement.dataset.id = video.originalId;
      fallbackElement.dataset.compositeId = video.id;
      return fallbackElement;
    }
    const clone = this.videoItemTemplate.content.cloneNode(true);
    const item = clone.querySelector(".video-item");
    if (!item) {
      window.logger.error("動画アイテム要素が見つかりません");
      return document.createElement("div");
    }
    item.dataset.id = video.originalId;
    item.dataset.compositeId = video.id;
    if (video.description) {
      item.dataset.description = video.description;
    }
    if (video.tags && video.tags.length > 0) {
      try {
        item.dataset.tags = JSON.stringify(video.tags);
      } catch (err) {
      }
    }
    const memoValue = video.memo;
    if (memoValue !== void 0) {
      item.dataset.memo = String(memoValue);
    }
    const thumbnailElement = item.querySelector(".video-thumbnail");
    if (thumbnailElement) {
      thumbnailElement.src = video.thumbnailUrl;
    }
    const titleElement = item.querySelector(".video-title");
    if (titleElement) {
      const titleLink = document.createElement("a");
      const trimmedTitle = video.title.replace(/^[\p{White_Space}\p{Cf}]+|[\p{White_Space}\p{Cf}]+$/gu, "");
      const titleText = trimmedTitle ? trimmedTitle : "無題";
      titleLink.href = `https://www.nicovideo.jp/watch/${video.originalId}`;
      titleLink.textContent = titleText;
      titleLink.className = "video-title-link";
      titleLink.target = "_blank";
      titleElement.appendChild(titleLink);
    }
    this.setVideoStats(item, video);
    return item;
  }
  setVideoStats(item, video) {
    const viewCountElement = item.querySelector(".view-count");
    if (viewCountElement) {
      viewCountElement.textContent = `再生数: ${video.viewCount.toLocaleString()}`;
    }
    const commentCountElement = item.querySelector(".comment-count");
    if (commentCountElement) {
      commentCountElement.textContent = `コメント数: ${video.commentCount.toLocaleString()}`;
    }
    const mylistCountElement = item.querySelector(".mylist-count");
    if (mylistCountElement) {
      mylistCountElement.textContent = `マイリスト数: ${video.mylistCount.toLocaleString()}`;
    }
    const lengthElement = item.querySelector(".video-length");
    if (lengthElement) {
      const minutes = Math.floor(video.length / 60);
      const seconds = video.length % 60;
      lengthElement.textContent = `${minutes}分${seconds}秒`;
    }
    const authorElement = item.querySelector(".video-author");
    if (authorElement) {
      authorElement.textContent = "投稿者: " + video.authorName;
    }
    const uploadDateElement = item.querySelector(".video-upload-date");
    if (uploadDateElement) {
      uploadDateElement.textContent = "投稿日: " + new Date(video.uploadedAt).toLocaleDateString();
    }
  }
  renderKeywordItem(keyword) {
    if (!this.keywordItemTemplate) {
      window.logger.error("キーワードテンプレートが初期化されていません！");
      const fallbackElement = document.createElement("div");
      fallbackElement.className = "video-item keyword-item";
      fallbackElement.innerHTML = `
        <input type="checkbox" class="video-select" />
        <div class="keyword-icon">${createMaterialIcon(ICONS.search, { color: "white" })}</div>
        <div class="video-info">
          <div class="video-title">
            <span class="keyword-text">${keyword.keyword}</span>
          </div>
          <div class="keyword-meta">
            <span class="keyword-added-date">追加日時: ${new Date(keyword.addedAt).toLocaleString()}</span>
          </div>
        </div>
        <div class="video-actions">
          <button class="edit-keyword">${createMaterialIcon(ICONS.edit, { color: "white" })}編集</button>
          <button class="move-keyword">${createMaterialIcon("drive_file_move", { color: "white" })}移動</button>
          <button class="copy-keyword">${createMaterialIcon("content_copy", { color: "white" })}コピー</button>
          <button class="delete-keyword">${createMaterialIcon(ICONS.delete, { color: "white" })}削除</button>
        </div>
      `;
      if (keyword.id !== void 0) {
        fallbackElement.dataset.id = keyword.id.toString();
      }
      fallbackElement.dataset.type = "keyword";
      return fallbackElement;
    }
    const clone = this.keywordItemTemplate.content.cloneNode(true);
    const item = clone.querySelector(".keyword-item");
    if (!item) {
      window.logger.error("キーワードアイテム要素が見つかりません");
      return document.createElement("div");
    }
    if (keyword.id !== void 0) {
      item.dataset.id = keyword.id.toString();
    }
    item.dataset.type = "keyword";
    const keywordText = item.querySelector(".keyword-text");
    if (keywordText) {
      keywordText.textContent = keyword.keyword;
    }
    this.setKeywordSearchLinks(item, keyword.keyword);
    const dateElement = item.querySelector(".keyword-added-date");
    if (dateElement) {
      dateElement.textContent = `追加日時: ${new Date(keyword.addedAt).toLocaleString()}`;
    }
    return item;
  }
  setKeywordSearchLinks(item, keyword) {
    const encodedKeyword = encodeURIComponent(keyword);
    const keywordSearchLink = item.querySelector(".keyword-search");
    if (keywordSearchLink) {
      keywordSearchLink.href = `https://www.nicovideo.jp/search/${encodedKeyword}`;
    }
    const tagSearchLink = item.querySelector(".tag-search");
    if (tagSearchLink) {
      tagSearchLink.href = `https://www.nicovideo.jp/tag/${encodedKeyword}`;
    }
    const mylistSearchLink = item.querySelector(".mylist-search");
    if (mylistSearchLink) {
      mylistSearchLink.href = `https://www.nicovideo.jp/mylist_search/${encodedKeyword}`;
    }
  }
  setupVideoListEvents(videoList) {
    this.setupVideoActions(videoList);
    this.setupKeywordActions(videoList);
  }
  setupVideoActions(videoList) {
    videoList.querySelectorAll(".move-video").forEach((button) => {
      button.addEventListener("click", (event) => {
        void this.eventHandlers.handleVideoMove(event);
      });
    });
    videoList.querySelectorAll(".copy-video").forEach((button) => {
      button.addEventListener("click", (event) => {
        void this.eventHandlers.handleVideoCopy(event);
      });
    });
    videoList.querySelectorAll(".delete-video").forEach((button) => {
      button.addEventListener("click", (event) => {
        void this.eventHandlers.handleVideoDelete(event);
      });
    });
    videoList.querySelectorAll(".refresh-video").forEach((button) => {
      button.addEventListener("click", (event) => {
        void this.eventHandlers.handleVideoRefresh(event);
      });
    });
    videoList.querySelectorAll(".open-video-details").forEach((button) => {
      button.addEventListener("click", (event) => {
        void (async () => {
          const target = event.currentTarget.closest(".video-item");
          if (!target) return;
          const compositeId = target.getAttribute("data-composite-id") || void 0;
          if (!compositeId) {
            const descFromDom = target.getAttribute("data-description") || void 0;
            const tagsFromDom = target.getAttribute("data-tags") || void 0;
            const memoFromDom = target.getAttribute("data-memo") || "";
            const fallback = {};
            if (descFromDom) fallback.description = descFromDom;
            if (tagsFromDom) {
              try {
                fallback.tags = JSON.parse(tagsFromDom);
              } catch (err) {
              }
            }
            await this.showVideoDetailsModal(fallback, void 0, memoFromDom);
            return;
          }
          try {
            const db = await this.manager.getDB();
            const tx = db.transaction(["videos"], "readonly");
            const store = tx.objectStore("videos");
            const video = await new Promise((resolve, reject) => {
              const req = store.get(compositeId);
              req.onsuccess = () => resolve(req.result || null);
              req.onerror = () => {
                const err = req.error;
                reject(new Error(err instanceof Error ? err.message : String(err)));
              };
            });
            db.close();
            const descFromDom = target.getAttribute("data-description") || void 0;
            const tagsFromDom = target.getAttribute("data-tags") || void 0;
            const memoFromDom = target.getAttribute("data-memo") || "";
            if (video) {
              const enriched = {
                ...video,
                description: video.description ?? descFromDom,
                tags: video.tags ?? (tagsFromDom ? (() => {
                  try {
                    return JSON.parse(tagsFromDom);
                  } catch {
                    return void 0;
                  }
                })() : void 0)
              };
              await this.showVideoDetailsModal(enriched, compositeId, memoFromDom);
            } else {
              const fallback = {};
              if (descFromDom) fallback.description = descFromDom;
              if (tagsFromDom) {
                try {
                  fallback.tags = JSON.parse(tagsFromDom);
                } catch (err) {
                  void err;
                }
              }
              await this.showVideoDetailsModal(fallback, compositeId, memoFromDom);
            }
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            window.logger.error("詳細表示に失敗:", msg);
          }
        })();
      });
    });
    videoList.addEventListener("click", (ev) => {
      void (async () => {
        const trigger = ev.target.closest(".open-video-details");
        if (!trigger) return;
        const target = trigger.closest(".video-item");
        if (!target) return;
        const compositeId = target.getAttribute("data-composite-id") || void 0;
        const descFromDom = target.getAttribute("data-description") || void 0;
        const tagsFromDom = target.getAttribute("data-tags") || void 0;
        const memoFromDom = target.getAttribute("data-memo") || "";
        try {
          if (!compositeId) {
            const fallback = {};
            if (descFromDom) fallback.description = descFromDom;
            if (tagsFromDom) {
              try {
                fallback.tags = JSON.parse(tagsFromDom);
              } catch (err) {
                void err;
              }
            }
            await this.showVideoDetailsModal(fallback, compositeId, memoFromDom);
            return;
          }
          const db = await this.manager.getDB();
          const tx = db.transaction(["videos"], "readonly");
          const store = tx.objectStore("videos");
          const video = await new Promise((resolve, reject) => {
            const req = store.get(compositeId);
            req.onsuccess = () => resolve(req.result || null);
            req.onerror = () => {
              const err = req.error;
              reject(new Error(err instanceof Error ? err.message : String(err)));
            };
          });
          db.close();
          if (video) {
            const enriched = {
              ...video,
              description: video.description ?? descFromDom,
              tags: video.tags ?? (tagsFromDom ? (() => {
                try {
                  return JSON.parse(tagsFromDom);
                } catch {
                  return void 0;
                }
              })() : void 0)
            };
            await this.showVideoDetailsModal(enriched, compositeId, memoFromDom);
          } else {
            const fallback = {};
            if (descFromDom) fallback.description = descFromDom;
            if (tagsFromDom) {
              try {
                fallback.tags = JSON.parse(tagsFromDom);
              } catch (err) {
                void err;
              }
            }
            await this.showVideoDetailsModal(fallback, compositeId, memoFromDom);
          }
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          window.logger.error("詳細表示(委譲)に失敗:", msg);
        }
      })();
    });
  }
  setupKeywordActions(videoList) {
    videoList.querySelectorAll(".move-keyword").forEach((button) => {
      button.addEventListener("click", (event) => {
        void this.eventHandlers.handleKeywordMove(event);
      });
    });
    videoList.querySelectorAll(".copy-keyword").forEach((button) => {
      button.addEventListener("click", (event) => {
        void this.eventHandlers.handleKeywordCopy(event);
      });
    });
    videoList.querySelectorAll(".delete-keyword").forEach((button) => {
      button.addEventListener("click", (event) => {
        void this.eventHandlers.handleKeywordDelete(event);
      });
    });
    videoList.querySelectorAll(".edit-keyword").forEach((button) => {
      button.addEventListener("click", (event) => {
        void this.eventHandlers.handleKeywordEdit(event);
      });
    });
  }
  // 残りのメソッド実装
  initializeEventListeners() {
    const createNewMylistElement = document.getElementById("createNewMylist");
    if (createNewMylistElement) {
      createNewMylistElement.addEventListener("click", this.guardEvent(async () => {
        const nameInput = document.getElementById("newMylistName");
        if (!nameInput) {
          await this.showCustomAlert("マイリスト名入力欄が見つかりません");
          return;
        }
        try {
          const name = this.validateInput(nameInput.value, "mylistName");
          await this.manager.createMylist(name);
          nameInput.value = "";
          void this.loadMylists();
        } catch (error) {
          window.logger.error("マイリストの作成に失敗しました:", error);
          const errorMessage = error instanceof Error ? error.message : "マイリストの作成に失敗しました";
          await this.showCustomAlert(errorMessage);
        }
      }));
    }
    const addVideoElement = document.getElementById("addVideo");
    if (addVideoElement) {
      addVideoElement.addEventListener("click", this.guardEvent(async () => {
        if (!this.currentMylistId) {
          await this.showCustomAlert("マイリストを選択してください");
          return;
        }
        const input = document.getElementById("videoIdInput");
        if (!input) {
          await this.showCustomAlert("動画ID入力欄が見つかりません");
          return;
        }
        try {
          const videoUrl = this.validateInput(input.value, "videoId");
          let videoId;
          if (videoUrl.includes("nicovideo.jp") || videoUrl.includes("nico.ms")) {
            const match = videoUrl.match(/(?:sm|so|nm|nx)\d+/);
            if (!match) {
              throw new Error("動画IDを抽出できませんでした");
            }
            videoId = match[0];
          } else {
            videoId = videoUrl;
          }
          const videoInfo = await this.manager.fetchVideoInfo(videoId);
          await this.manager.addVideo(this.currentMylistId, videoInfo);
          input.value = "";
          await this.loadVideos();
          await this.showCustomAlert("動画を追加しました");
        } catch (error) {
          window.logger.error("動画の追加に失敗しました:", error);
          const errorMessage = error instanceof Error ? error.message : "動画の追加に失敗しました";
          await this.showCustomAlert(errorMessage);
        }
      }));
    }
    const videoIdInputElement = document.getElementById("videoIdInput");
    if (videoIdInputElement) {
      videoIdInputElement.addEventListener("keypress", (event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          const addVideoButton = document.getElementById("addVideo");
          if (addVideoButton) {
            addVideoButton.click();
          }
        }
      });
    }
    const addKeywordElement = document.getElementById("addKeyword");
    if (addKeywordElement) {
      addKeywordElement.addEventListener("click", this.guardEvent(async () => {
        if (!this.currentMylistId) {
          await this.showCustomAlert("マイリストを選択してください");
          return;
        }
        const input = document.getElementById("keywordInput");
        if (!input) {
          await this.showCustomAlert("キーワード入力欄が見つかりません");
          return;
        }
        try {
          const keyword = this.validateInput(input.value, "text");
          await this.manager.addKeyword(this.currentMylistId, keyword);
          input.value = "";
          await this.loadVideos();
          await this.showCustomAlert("キーワードを追加しました");
        } catch (error) {
          window.logger.error("キーワードの追加に失敗しました:", error);
          const errorMessage = error instanceof Error ? error.message : "キーワードの追加に失敗しました";
          await this.showCustomAlert(errorMessage);
        }
      }));
    }
    const keywordInputElement = document.getElementById("keywordInput");
    if (keywordInputElement) {
      keywordInputElement.addEventListener("keypress", (event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          const addKeywordElement2 = document.getElementById("addKeyword");
          if (addKeywordElement2) {
            addKeywordElement2.click();
          }
        }
      });
    }
    const executeSelectedActionElement = document.getElementById("executeSelectedAction");
    if (executeSelectedActionElement) {
      executeSelectedActionElement.addEventListener("click", this.guardEvent(async () => {
        const actionSelectElement = document.getElementById("selectedVideosAction");
        if (!actionSelectElement) {
          await this.showCustomAlert("操作選択要素が見つかりません");
          return;
        }
        const action = actionSelectElement.value;
        if (!action) {
          await this.showCustomAlert("操作を選択してください");
          return;
        }
        const selectedItems = Array.from(document.querySelectorAll(".video-select:checked")).map(
          (checkbox) => checkbox.closest(".video-item, .keyword-item")
        ).filter((item) => item !== null);
        if (selectedItems.length === 0) {
          await this.showCustomAlert("項目を選択してください");
          return;
        }
        const selectedVideos = selectedItems.filter((item) => !item.classList.contains("keyword-item"));
        const selectedKeywords = selectedItems.filter((item) => item.classList.contains("keyword-item"));
        try {
          switch (action) {
            case "move":
              await this.batchOperations.moveSelectedItems(selectedVideos, selectedKeywords);
              break;
            case "copy":
              await this.batchOperations.copySelectedItems(selectedVideos, selectedKeywords);
              break;
            case "delete":
              await this.batchOperations.deleteSelectedItems(selectedVideos, selectedKeywords);
              break;
            case "refresh":
              if (selectedKeywords.length > 0) {
                await this.showCustomAlert("キーワードは情報更新できません。動画のみ選択してください。");
                return;
              }
              if (selectedVideos.length > 0) {
                await this.batchOperations.refreshSelectedVideos(selectedVideos);
              }
              break;
          }
        } catch (error) {
          window.logger.error("一括操作に失敗しました:", error);
          const errorMessage = error instanceof Error ? error.message : "操作に失敗しました";
          await this.showCustomAlert(errorMessage);
        }
        actionSelectElement.value = "";
      }));
    }
    const saveMylistNameElement = document.getElementById("saveMylistName");
    if (saveMylistNameElement) {
      saveMylistNameElement.addEventListener("click", this.guardEvent(async () => {
        if (!this.currentMylistId) {
          await this.showCustomAlert("マイリストを選択してください");
          return;
        }
        try {
          const mylistNameElement = document.getElementById("currentMylistName");
          if (!mylistNameElement) {
            await this.showCustomAlert("マイリスト名入力欄が見つかりません");
            return;
          }
          const newName = this.validateInput(mylistNameElement.value, "mylistName");
          await this.manager.updateMylistName(this.currentMylistId, newName);
          await this.loadMylists();
          await this.showCustomAlert("マイリスト名を更新しました");
        } catch (error) {
          window.logger.error("マイリスト名の更新に失敗しました:", error);
          const errorMessage = error instanceof Error ? error.message : "マイリスト名の更新に失敗しました";
          await this.showCustomAlert(errorMessage);
        }
      }));
    }
    const deleteMylistElement = document.getElementById("deleteMylist");
    if (deleteMylistElement) {
      deleteMylistElement.addEventListener("click", this.guardEvent(async () => {
        if (!this.currentMylistId) {
          await this.showCustomAlert("マイリストを選択してください");
          return;
        }
        const mylistNameElement = document.getElementById("currentMylistName");
        if (!mylistNameElement) {
          await this.showCustomAlert("マイリスト名入力欄が見つかりません");
          return;
        }
        const mylistName = mylistNameElement.value;
        if (!await this.showCustomConfirm(`マイリスト「${mylistName}」を削除しますか？
※この操作は取り消せません`)) {
          return;
        }
        try {
          await this.manager.deleteMylist(this.currentMylistId);
          this.currentMylistId = null;
          mylistNameElement.value = "";
          const videoListElement = document.getElementById("videoList");
          if (videoListElement) {
            videoListElement.innerHTML = "";
          }
          await this.loadMylists();
          await this.showCustomAlert("マイリストを削除しました");
        } catch (error) {
          window.logger.error("マイリストの削除に失敗しました:", error);
          const errorMessage = error instanceof Error ? error.message : "マイリストの削除に失敗しました";
          await this.showCustomAlert(errorMessage);
        }
      }));
    }
    const exportMylistElement = document.getElementById("exportMylist");
    if (exportMylistElement) {
      exportMylistElement.addEventListener("click", this.guardEvent(async () => {
        const choice = await this.modalService.showExportOptionsModal();
        if (choice.action === "cancel") return;
        try {
          if (choice.action === "local") {
            const data = await this.manager.exportData();
            const dateTime = this.formatDateTime();
            const fileName = `Mylist2_${dateTime}.json`;
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            await new Promise((resolve, reject) => {
              const a = document.createElement("a");
              a.href = url;
              a.download = fileName;
              a.onclick = () => {
                setTimeout(() => {
                  URL.revokeObjectURL(url);
                  resolve();
                }, 500);
              };
              a.onerror = () => {
                URL.revokeObjectURL(url);
                reject(new Error("ダウンロードに失敗しました"));
              };
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
            });
            await this.showCustomAlert("エクスポートが完了しました");
          } else if (choice.action === "cloud") {
            const provider = await this.modalService.showCloudProviderSelectModal();
            if (!provider) return;
            const dateTime = this.formatDateTime();
            const baseName = `Mylist2_${dateTime}`;
            const result = await this.manager.uploadBackupToCloud(provider, baseName);
            if (result.success) {
              const providerName = provider === "gdrive" ? "Google Drive" : provider === "onedrive" ? "OneDrive" : provider === "dropbox" ? "Dropbox" : "MEGA";
              await this.showCustomAlert(`${providerName} にバックアップを保存しました`);
            } else {
              const providerName = provider === "gdrive" ? "Google Drive" : provider === "onedrive" ? "OneDrive" : provider === "dropbox" ? "Dropbox" : "MEGA";
              await this.showCustomAlert(`${providerName} へのバックアップに失敗しました: ` + (result.error || "不明なエラー"));
            }
          }
        } catch (error) {
          window.logger.error("エクスポート処理でエラー:", error);
          const errorMessage = error instanceof Error ? error.message : "エクスポートに失敗しました";
          await this.showCustomAlert("エクスポートに失敗しました: " + errorMessage);
        }
      }));
    }
    const importMylistElement = document.getElementById("importMylist");
    if (importMylistElement) {
      importMylistElement.addEventListener("click", this.guardEvent(async () => {
        const choice = await this.modalService.showImportOptionsModal();
        if (choice.action === "cancel") return;
        if (choice.action === "local") {
          const input = document.getElementById("importFile");
          if (!input) {
            await this.showCustomAlert("インポートファイル選択要素が見つかりません");
            return;
          }
          input.accept = ".json,.txt";
          input.click();
        } else if (choice.action === "clear") {
          const confirmed = await this.showCustomConfirm("本当に全データをクリアしますか？この操作は取り消せません。", "warning", "データベースのクリア");
          if (!confirmed) return;
          const result = await this.manager.clearAllData(false);
          if (result.success) {
            await this.loadMylists();
            const videoListElement = document.getElementById("videoList");
            if (videoListElement) videoListElement.innerHTML = "";
            await this.showCustomAlert("データベースをクリアしました");
          } else {
            await this.showCustomAlert("データベースのクリアに失敗しました: " + (result.error || "不明なエラー"));
          }
        } else if (choice.action === "cloud") {
          const provider = await this.modalService.showCloudProviderSelectModal();
          if (!provider) return;
          try {
            const backups = await this.manager.listCloudBackups(provider);
            const providerName = provider === "gdrive" ? "Google Drive" : provider === "onedrive" ? "OneDrive" : provider === "dropbox" ? "Dropbox" : "MEGA";
            if (!backups || backups.length === 0) {
              await this.showCustomAlert(`${providerName} にバックアップが見つかりません`);
              return;
            }
            const selectedId = await this.modalService.showSelectionModal(
              "復元するバックアップを選択",
              backups.map((f) => ({ id: f.id, label: f.name, subLabel: f.modifiedTime ? new Date(f.modifiedTime).toLocaleString() : "" })),
              "復元"
            );
            if (!selectedId) return;
            const confirmed = await this.showCustomConfirm("選択したバックアップで復元します。現在のデータは上書きされます。よろしいですか？", "warning", "復元確認");
            if (!confirmed) return;
            this.showProgress();
            const res = await this.manager.restoreFromCloudBackup(provider, selectedId);
            if (res.success) {
              await this.loadMylists();
              await this.showCustomAlert("バックアップから復元しました");
            } else {
              await this.showCustomAlert("復元に失敗しました: " + (res.error || "不明なエラー"));
            }
          } finally {
            this.hideProgress();
          }
        }
      }));
    }
    const importFileElement = document.getElementById("importFile");
    if (importFileElement) {
      importFileElement.addEventListener("change", this.guardEvent(async (event) => {
        const input = event.target;
        const file = input.files?.[0];
        if (!file) return;
        try {
          const text = await file.text();
          let mylistId;
          try {
            const data = JSON.parse(text);
            if (Array.isArray(data) && typeof data[0] === "object" && data[0] !== null && "vid" in data[0]) {
              this.showProgress();
              mylistId = await this.manager.importLegacyData(
                text,
                (current, total) => this.updateProgress(current, total)
              );
              await this.showCustomAlert("カスタムマイリスト1のデータを正常にインポートしました");
            } else {
              this.showProgress();
              const rec = data;
              if (!rec || typeof rec !== "object") {
                throw new Error("無効なデータ形式です");
              }
              const mylistsUnknown = rec.mylists;
              const videosUnknown = rec.videos;
              const keywordsUnknown = rec.keywords;
              if (!Array.isArray(mylistsUnknown) || !Array.isArray(videosUnknown)) {
                throw new Error("Mylist2のエクスポート形式ではありません");
              }
              const isMylistInfo = (v) => {
                if (typeof v !== "object" || v === null) return false;
                const r = v;
                return typeof r.name === "string" && typeof r.createdAt === "number";
              };
              const isDBVideo = (v) => {
                if (typeof v !== "object" || v === null) return false;
                const r = v;
                return typeof r.id === "string" && typeof r.originalId === "string" && typeof r.mylistId === "number";
              };
              const isKeywordInfo = (v) => {
                if (typeof v !== "object" || v === null) return false;
                const r = v;
                return typeof r.keyword === "string" && typeof r.addedAt === "number";
              };
              const exportData = {
                mylists: mylistsUnknown.filter(isMylistInfo),
                videos: videosUnknown.filter(isDBVideo),
                keywords: Array.isArray(keywordsUnknown) ? keywordsUnknown.filter(isKeywordInfo) : []
              };
              await this.manager.importData(exportData);
              await this.showCustomAlert("データを正常にインポートしました");
            }
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "JSONの解析に失敗しました";
            throw new Error("無効なJSONファイルです: " + errorMessage);
          }
          await this.loadMylists();
          if (mylistId) {
            await this.selectMylist(mylistId);
          }
        } catch (error) {
          window.logger.error("インポートに失敗しました:", error);
          const errorMessage = error instanceof Error ? error.message : "インポートに失敗しました";
          await this.showCustomAlert(errorMessage);
        } finally {
          this.hideProgress();
        }
        input.value = "";
      }));
    }
    const selectAllVideosElement = document.getElementById("selectAllVideos");
    if (selectAllVideosElement) {
      selectAllVideosElement.addEventListener("click", () => {
        const checkboxes = document.querySelectorAll(".video-select");
        checkboxes.forEach((checkbox) => {
          const parentItem = checkbox.closest(".video-item, .keyword-item");
          if (parentItem && !parentItem.classList.contains("keyword-item")) {
            checkbox.checked = true;
          }
        });
      });
    }
    const deselectAllVideosElement = document.getElementById("deselectAllVideos");
    if (deselectAllVideosElement) {
      deselectAllVideosElement.addEventListener("click", () => {
        const checkboxes = document.querySelectorAll(".video-select");
        checkboxes.forEach((checkbox) => checkbox.checked = false);
      });
    }
  }
  // 動画詳細モーダルの表示（メモ編集対応）
  async showVideoDetailsModal(video, compositeId, memoText = "") {
    await Promise.resolve();
    const modalId = "videoDetailsModal";
    let modal = document.getElementById(modalId);
    if (!modal) {
      const html = `
        <div id="${modalId}" class="cml2-modal" style="display:none">
          <div class="cml2-modal-content" role="dialog" aria-modal="true">
            <h2 class="cml2-modal-title">動画詳細</h2>
            <div class="cml2-modal-body video-details-body">
              <div class="video-details-section">
                <strong>説明</strong>
                <div class="video-description" style="white-space:pre-wrap"></div>
              </div>
              <div class="video-details-section" style="margin-top:12px">
                <strong>タグ</strong>
                <div class="video-tags"></div>
              </div>
              <div class="video-details-section" style="margin-top:12px">
                <strong>メモ</strong>
                <textarea class="video-memo" rows="4" style="width:100%" placeholder="メモを入力..."></textarea>
              </div>
            </div>
            <div class="cml2-modal-footer">
              <button type="button" class="cml2-btn save-memo-button">メモを保存</button>
              <button type="button" class="cml2-btn close-button">閉じる</button>
            </div>
          </div>
        </div>`;
      document.body.insertAdjacentHTML("beforeend", html);
      const found = document.getElementById(modalId);
      if (found) {
        modal = found;
      }
    }
    if (!modal) return;
    const descEl = modal.querySelector(".video-description");
    const tagsEl = modal.querySelector(".video-tags");
    const memoEl = modal.querySelector(".video-memo");
    if (descEl instanceof HTMLElement) {
      const text = video.description || "(説明なし)";
      descEl.innerHTML = linkify(text);
    }
    if (tagsEl) {
      const tags = video.tags && video.tags.length > 0 ? video.tags : [];
      tagsEl.innerHTML = tags.length > 0 ? tags.map((t) => `<span class="tag" style="display:inline-block;background:#2a2b2c;border:1px solid #444;border-radius:12px;padding:2px 8px;margin:2px 6px 0 0;">${t}</span>`).join("") : "(タグなし)";
    }
    if (memoEl) {
      memoEl.value = memoText || "";
    }
    if (tagsEl instanceof HTMLElement) {
      const tags = video.tags && video.tags.length > 0 ? video.tags : [];
      if (tags.length > 0) {
        const anchors = tags.map((t) => {
          const a = document.createElement("a");
          a.className = "cml2-tag";
          a.href = `https://dic.nicovideo.jp/a/${encodeURIComponent(t)}`;
          a.target = "_blank";
          a.rel = "noopener noreferrer";
          a.textContent = t;
          return a.outerHTML;
        }).join("");
        tagsEl.innerHTML = anchors;
      } else {
        tagsEl.innerHTML = "(タグなし)";
      }
    }
    modal.style.display = "flex";
    const closeBtn = modal.querySelector(".close-button");
    const saveBtn = modal.querySelector(".save-memo-button");
    const content = modal.querySelector(".cml2-modal-content");
    const handleClose = () => {
      modal.style.display = "none";
      document.removeEventListener("keydown", onKeydown);
      modal.removeEventListener("click", onBackdrop);
    };
    const onKeydown = (e) => {
      if (e.key === "Escape") handleClose();
    };
    const onBackdrop = (e) => {
      if (!content) return;
      if (!content.contains(e.target)) handleClose();
    };
    if (closeBtn) closeBtn.addEventListener("click", handleClose, { once: true });
    if (saveBtn && memoEl) {
      saveBtn.addEventListener("click", () => {
        void (async () => {
          const text = memoEl.value || "";
          if (compositeId) {
            try {
              await this.manager.updateVideoMemo(compositeId, text);
              const item = document.querySelector(`.video-item[data-composite-id="${compositeId}"]`);
              if (item) {
                item.setAttribute("data-memo", text);
              }
              await this.showCustomAlert("メモを保存しました");
            } catch {
              await this.showCustomAlert("メモの保存に失敗しました");
            }
          } else {
            await this.showCustomAlert("メモの保存対象が特定できませんでした");
          }
        })();
      }, { once: true });
    }
    document.addEventListener("keydown", onKeydown);
    modal.addEventListener("click", onBackdrop);
  }
  initializeHeaderControls() {
    const searchExecElement = document.getElementById("searchExec");
    if (searchExecElement) {
      searchExecElement.addEventListener("click", this.guardEvent(async () => {
        await this.executeSearch();
      }));
    }
    const searchClearElement = document.getElementById("searchClear");
    if (searchClearElement) {
      searchClearElement.addEventListener("click", () => {
        const searchWordsElement2 = document.getElementById("searchWords");
        if (searchWordsElement2) {
          searchWordsElement2.value = "";
        }
      });
    }
    const searchWordsElement = document.getElementById("searchWords");
    if (searchWordsElement) {
      searchWordsElement.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
          void this.executeSearch();
        }
      });
    }
  }
  async executeSearch() {
    const optionElement = document.getElementById("searchOption");
    const wordsElement = document.getElementById("searchWords");
    if (!optionElement || !wordsElement) {
      await this.showCustomAlert("検索要素が見つかりません");
      return;
    }
    const option = optionElement.value;
    const word = wordsElement.value.trim();
    if (!word) {
      await this.showCustomAlert("検索キーワードが空です。");
      return;
    }
    const [host, type] = option.split("+");
    window.open(`https://${host}.nicovideo.jp/${type}/${encodeURIComponent(word)}`, "_blank");
  }
  initializeSearchEventListeners() {
    const mylistSearchInput = document.getElementById("mylistSearchInput");
    const mylistSearchClear = document.getElementById("mylistSearchClear");
    if (mylistSearchInput) {
      mylistSearchInput.addEventListener("input", () => {
        this.filterMylists(mylistSearchInput.value.toLowerCase());
      });
    }
    if (mylistSearchClear && mylistSearchInput) {
      mylistSearchClear.addEventListener("click", () => {
        mylistSearchInput.value = "";
        this.filterMylists("");
      });
    }
    const videoSearchInput = document.getElementById("videoSearchInput");
    const videoSearchClear = document.getElementById("videoSearchClear");
    if (videoSearchInput) {
      videoSearchInput.addEventListener("input", () => {
        this.filterVideos(videoSearchInput.value.toLowerCase());
      });
    }
    if (videoSearchClear && videoSearchInput) {
      videoSearchClear.addEventListener("click", () => {
        videoSearchInput.value = "";
        this.filterVideos("");
      });
    }
  }
  // マイリストの検索フィルター
  filterMylists(searchText) {
    const mylistItems = document.querySelectorAll(".mylist-item");
    mylistItems.forEach((item) => {
      const nameElement = item.querySelector("span");
      if (!nameElement) return;
      const mylistName = nameElement.textContent?.toLowerCase() || "";
      if (mylistName.includes(searchText)) {
        item.classList.remove("hidden");
      } else {
        item.classList.add("hidden");
      }
    });
  }
  // 動画の検索フィルター
  filterVideos(searchText) {
    const items = document.querySelectorAll(".video-item, .keyword-item");
    items.forEach((item) => {
      if (item.classList.contains("keyword-item")) {
        const keywordElement = item.querySelector(".keyword-text");
        if (!keywordElement) return;
        const keyword = keywordElement.textContent?.toLowerCase() || "";
        if (keyword.includes(searchText)) {
          item.classList.remove("hidden");
        } else {
          item.classList.add("hidden");
        }
      } else {
        const titleElement = item.querySelector(".video-title-link") || item.querySelector(".video-title");
        const authorElement = item.querySelector(".video-author");
        if (!titleElement || !authorElement) return;
        const title = titleElement.textContent?.toLowerCase() || "";
        const author = authorElement.textContent?.toLowerCase() || "";
        const memo = (item.getAttribute("data-memo") || "").toLowerCase();
        if (title.includes(searchText) || author.includes(searchText) || memo.includes(searchText)) {
          item.classList.remove("hidden");
        } else {
          item.classList.add("hidden");
        }
      }
    });
  }
  async initializeSettings() {
    const settings = await this.manager.loadManagerSettings();
    const mylistSort = document.getElementById("mylistSortType");
    const videoSort = document.getElementById("videoSortType");
    const themeSelect = document.getElementById("themeSelect");
    if (!mylistSort || !videoSort) {
      window.logger.error("ソート選択要素が見つかりません");
      return;
    }
    mylistSort.value = settings.mylistSortType;
    videoSort.value = settings.videoSortType;
    const themeValue = settings.theme || "dark-blue";
    if (themeSelect) themeSelect.value = themeValue;
    this.applyTheme(themeValue);
    await this.loadMylists();
    if (this.currentMylistId) {
      await this.loadVideos();
    }
    mylistSort.addEventListener("change", this.guardEvent(async () => {
      await this.manager.saveManagerSettings({
        mylistSortType: mylistSort.value,
        videoSortType: videoSort.value,
        theme: themeSelect ? themeSelect.value : settings.theme || "dark-blue"
      });
      await this.loadMylists();
    }));
    videoSort.addEventListener("change", this.guardEvent(async () => {
      await this.manager.saveManagerSettings({
        mylistSortType: mylistSort.value,
        videoSortType: videoSort.value,
        theme: themeSelect ? themeSelect.value : settings.theme || "dark-blue"
      });
      await this.loadVideos();
    }));
    if (themeSelect) {
      themeSelect.addEventListener("change", this.guardEvent(async () => {
        const newTheme = themeSelect.value;
        await this.manager.saveManagerSettings({
          mylistSortType: mylistSort.value,
          videoSortType: videoSort.value,
          theme: newTheme
        });
        this.applyTheme(newTheme);
      }));
    }
  }
  // キーワード編集モーダルを表示する関数
  async showKeywordEditModal(keywordId, currentKeyword) {
    return new Promise((resolve) => {
      const modal = document.getElementById("keywordEditModal");
      if (!modal) {
        window.logger.error("キーワード編集モーダルが見つかりません");
        resolve(null);
        return;
      }
      const input = modal.querySelector("#editKeywordInput");
      const closeButton = modal.querySelector(".close-button");
      const saveButton = modal.querySelector("#saveKeywordEdit");
      if (!input || !closeButton || !saveButton) {
        window.logger.error("キーワード編集モーダルの要素が見つかりません");
        resolve(null);
        return;
      }
      input.value = currentKeyword;
      modal.style.display = "flex";
      const closeHandler = () => {
        modal.style.display = "none";
        closeButton.removeEventListener("click", closeHandler);
        saveButton.removeEventListener("click", saveHandler);
        resolve(null);
      };
      const saveHandler = () => {
        const newKeyword = input.value;
        modal.style.display = "none";
        closeButton.removeEventListener("click", closeHandler);
        saveButton.removeEventListener("click", saveHandler);
        resolve(newKeyword);
      };
      closeButton.addEventListener("click", closeHandler);
      saveButton.addEventListener("click", saveHandler);
    });
  }
  // 折りたたみ可能なコントロールの初期化
  initializeCollapsibleControls() {
    const hoverArea = document.querySelector(".control-hover-area");
    const collapsibleControls = document.querySelector(".collapsible-controls");
    const alwaysShowCheckbox = document.getElementById("alwaysShowControls");
    if (!hoverArea || !collapsibleControls || !alwaysShowCheckbox) {
      window.logger.warn("折りたたみ可能なコントロール要素が見つかりません");
      return;
    }
    let autoHideTimer = null;
    let isControlsVisible = false;
    let alwaysVisible = false;
    const savedSetting = localStorage.getItem("mylist2-always-show-controls");
    if (savedSetting === "true") {
      alwaysVisible = true;
      alwaysShowCheckbox.checked = true;
    }
    const updateDisplayMode = () => {
      if (alwaysVisible) {
        collapsibleControls.classList.add("always-visible");
        hoverArea.classList.add("always-visible-mode");
        isControlsVisible = true;
        if (autoHideTimer) {
          clearTimeout(autoHideTimer);
          autoHideTimer = null;
        }
      } else {
        collapsibleControls.classList.remove("always-visible");
        hoverArea.classList.remove("always-visible-mode");
        if (isControlsVisible) {
          hideControls();
        }
      }
    };
    const showControls = () => {
      if (alwaysVisible) return;
      if (autoHideTimer) {
        clearTimeout(autoHideTimer);
        autoHideTimer = null;
      }
      isControlsVisible = true;
      collapsibleControls.classList.add("transitioning");
      collapsibleControls.style.transform = "translateY(0)";
    };
    const hideControls = () => {
      if (alwaysVisible) return;
      autoHideTimer = window.setTimeout(() => {
        isControlsVisible = false;
        collapsibleControls.style.transform = "translateY(-100%)";
        setTimeout(() => {
          collapsibleControls.classList.remove("transitioning");
        }, 300);
      }, 2e3);
    };
    alwaysShowCheckbox.addEventListener("change", () => {
      alwaysVisible = alwaysShowCheckbox.checked;
      localStorage.setItem("mylist2-always-show-controls", alwaysVisible.toString());
      updateDisplayMode();
    });
    hoverArea.addEventListener("mouseenter", showControls);
    hoverArea.addEventListener("mouseleave", hideControls);
    collapsibleControls.addEventListener("mouseenter", showControls);
    collapsibleControls.addEventListener("mouseleave", hideControls);
    collapsibleControls.addEventListener("focusin", showControls);
    collapsibleControls.addEventListener("focusout", () => {
      setTimeout(() => {
        if (!collapsibleControls.contains(document.activeElement)) {
          hideControls();
        }
      }, 100);
    });
    if ("ontouchstart" in window) {
      let touchTimer = null;
      hoverArea.addEventListener("touchstart", (e) => {
        if (alwaysVisible) return;
        e.preventDefault();
        if (isControlsVisible) {
          hideControls();
        } else {
          showControls();
        }
      });
      collapsibleControls.addEventListener("touchend", () => {
        if (alwaysVisible) return;
        if (touchTimer) clearTimeout(touchTimer);
        touchTimer = window.setTimeout(() => {
          hideControls();
        }, 5e3);
      });
    }
    document.addEventListener("keydown", (event) => {
      if (event.ctrlKey && event.shiftKey && event.code === "KeyC") {
        event.preventDefault();
        if (isControlsVisible) {
          hideControls();
        } else {
          showControls();
        }
      }
    });
    if (savedSetting === null && window.innerWidth > 1024) {
      alwaysVisible = true;
      alwaysShowCheckbox.checked = true;
      localStorage.setItem("mylist2-always-show-controls", "true");
    }
    updateDisplayMode();
    window.logger.info("折りたたみ可能なコントロールが初期化されました");
  }
}

headerAdjustments();
applyMylistManagerStyles();
window.Mylist2DB = Mylist2DB;
window.Mylist2Manager = Mylist2Manager;
window.Mylist2ManagerUI = Mylist2ManagerUI;
window.addEventListener("load", () => {
  if (typeof window.NicoCommon === "undefined") {
    window.logger.error("NicoCommon is not loaded. Please ensure common module is loaded before mylist2.");
    return;
  }
  window.NicoCommon.createHeader("headerContainer", {
    title: "mylist2",
    showSearch: true,
    showMoreLinks: true,
    enableFixedMode: false
  });
  new Mylist2ManagerUI();
});

// DEFLATE is a complex format; to read this code, you should probably check the RFC first:
// https://tools.ietf.org/html/rfc1951
// You may also wish to take a look at the guide I made about this program:
// https://gist.github.com/101arrowz/253f31eb5abc3d9275ab943003ffecad
// Some of the following code is similar to that of UZIP.js:
// https://github.com/photopea/UZIP.js
// However, the vast majority of the codebase has diverged from UZIP.js to increase performance and reduce bundle size.
// Sometimes 0 will appear where -1 would be more appropriate. This is because using a uint
// is better for memory in most engines (I *think*).
var ch2 = {};
var wk = (function (c, id, msg, transfer, cb) {
    var w = new Worker(ch2[id] || (ch2[id] = URL.createObjectURL(new Blob([
        c + ';addEventListener("error",function(e){e=e.error;postMessage({$e$:[e.message,e.code,e.stack]})})'
    ], { type: 'text/javascript' }))));
    w.onmessage = function (e) {
        var d = e.data, ed = d.$e$;
        if (ed) {
            var err = new Error(ed[0]);
            err['code'] = ed[1];
            err.stack = ed[2];
            cb(err, null);
        }
        else
            cb(null, d);
    };
    w.postMessage(msg, transfer);
    return w;
});

// aliases for shorter compressed code (most minifers don't do this)
var u8 = Uint8Array, u16 = Uint16Array, i32 = Int32Array;
// fixed length extra bits
var fleb = new u8([0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0, /* unused */ 0, 0, /* impossible */ 0]);
// fixed distance extra bits
var fdeb = new u8([0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13, /* unused */ 0, 0]);
// code length index map
var clim = new u8([16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15]);
// get base, reverse index map from extra bits
var freb = function (eb, start) {
    var b = new u16(31);
    for (var i = 0; i < 31; ++i) {
        b[i] = start += 1 << eb[i - 1];
    }
    // numbers here are at max 18 bits
    var r = new i32(b[30]);
    for (var i = 1; i < 30; ++i) {
        for (var j = b[i]; j < b[i + 1]; ++j) {
            r[j] = ((j - b[i]) << 5) | i;
        }
    }
    return { b: b, r: r };
};
var _a = freb(fleb, 2), fl = _a.b, revfl = _a.r;
// we can ignore the fact that the other numbers are wrong; they never happen anyway
fl[28] = 258, revfl[258] = 28;
var _b = freb(fdeb, 0), fd = _b.b, revfd = _b.r;
// map of value to reverse (assuming 16 bits)
var rev = new u16(32768);
for (var i = 0; i < 32768; ++i) {
    // reverse table algorithm from SO
    var x = ((i & 0xAAAA) >> 1) | ((i & 0x5555) << 1);
    x = ((x & 0xCCCC) >> 2) | ((x & 0x3333) << 2);
    x = ((x & 0xF0F0) >> 4) | ((x & 0x0F0F) << 4);
    rev[i] = (((x & 0xFF00) >> 8) | ((x & 0x00FF) << 8)) >> 1;
}
// create huffman tree from u8 "map": index -> code length for code index
// mb (max bits) must be at most 15
// TODO: optimize/split up?
var hMap = (function (cd, mb, r) {
    var s = cd.length;
    // index
    var i = 0;
    // u16 "map": index -> # of codes with bit length = index
    var l = new u16(mb);
    // length of cd must be 288 (total # of codes)
    for (; i < s; ++i) {
        if (cd[i])
            ++l[cd[i] - 1];
    }
    // u16 "map": index -> minimum code for bit length = index
    var le = new u16(mb);
    for (i = 1; i < mb; ++i) {
        le[i] = (le[i - 1] + l[i - 1]) << 1;
    }
    var co;
    if (r) {
        // u16 "map": index -> number of actual bits, symbol for code
        co = new u16(1 << mb);
        // bits to remove for reverser
        var rvb = 15 - mb;
        for (i = 0; i < s; ++i) {
            // ignore 0 lengths
            if (cd[i]) {
                // num encoding both symbol and bits read
                var sv = (i << 4) | cd[i];
                // free bits
                var r_1 = mb - cd[i];
                // start value
                var v = le[cd[i] - 1]++ << r_1;
                // m is end value
                for (var m = v | ((1 << r_1) - 1); v <= m; ++v) {
                    // every 16 bit value starting with the code yields the same result
                    co[rev[v] >> rvb] = sv;
                }
            }
        }
    }
    else {
        co = new u16(s);
        for (i = 0; i < s; ++i) {
            if (cd[i]) {
                co[i] = rev[le[cd[i] - 1]++] >> (15 - cd[i]);
            }
        }
    }
    return co;
});
// fixed length tree
var flt = new u8(288);
for (var i = 0; i < 144; ++i)
    flt[i] = 8;
for (var i = 144; i < 256; ++i)
    flt[i] = 9;
for (var i = 256; i < 280; ++i)
    flt[i] = 7;
for (var i = 280; i < 288; ++i)
    flt[i] = 8;
// fixed distance tree
var fdt = new u8(32);
for (var i = 0; i < 32; ++i)
    fdt[i] = 5;
// fixed length map
var flm = /*#__PURE__*/ hMap(flt, 9, 0), flrm = /*#__PURE__*/ hMap(flt, 9, 1);
// fixed distance map
var fdm = /*#__PURE__*/ hMap(fdt, 5, 0), fdrm = /*#__PURE__*/ hMap(fdt, 5, 1);
// find max of array
var max = function (a) {
    var m = a[0];
    for (var i = 1; i < a.length; ++i) {
        if (a[i] > m)
            m = a[i];
    }
    return m;
};
// read d, starting at bit p and mask with m
var bits = function (d, p, m) {
    var o = (p / 8) | 0;
    return ((d[o] | (d[o + 1] << 8)) >> (p & 7)) & m;
};
// read d, starting at bit p continuing for at least 16 bits
var bits16 = function (d, p) {
    var o = (p / 8) | 0;
    return ((d[o] | (d[o + 1] << 8) | (d[o + 2] << 16)) >> (p & 7));
};
// get end of byte
var shft = function (p) { return ((p + 7) / 8) | 0; };
// typed array slice - allows garbage collector to free original reference,
// while being more compatible than .slice
var slc = function (v, s, e) {
    if (s == null || s < 0)
        s = 0;
    if (e == null || e > v.length)
        e = v.length;
    // can't use .constructor in case user-supplied
    return new u8(v.subarray(s, e));
};
/**
 * Codes for errors generated within this library
 */
var FlateErrorCode = {
    UnexpectedEOF: 0,
    InvalidBlockType: 1,
    InvalidLengthLiteral: 2,
    InvalidDistance: 3,
    StreamFinished: 4,
    NoStreamHandler: 5,
    InvalidHeader: 6,
    NoCallback: 7,
    InvalidUTF8: 8,
    ExtraFieldTooLong: 9,
    InvalidDate: 10,
    FilenameTooLong: 11,
    StreamFinishing: 12,
    InvalidZipData: 13,
    UnknownCompressionMethod: 14
};
// error codes
var ec = [
    'unexpected EOF',
    'invalid block type',
    'invalid length/literal',
    'invalid distance',
    'stream finished',
    'no stream handler',
    ,
    'no callback',
    'invalid UTF-8 data',
    'extra field too long',
    'date not in range 1980-2099',
    'filename too long',
    'stream finishing',
    'invalid zip data'
    // determined by unknown compression method
];
var err = function (ind, msg, nt) {
    var e = new Error(msg || ec[ind]);
    e.code = ind;
    if (Error.captureStackTrace)
        Error.captureStackTrace(e, err);
    if (!nt)
        throw e;
    return e;
};
// expands raw DEFLATE data
var inflt = function (dat, st, buf, dict) {
    // source length       dict length
    var sl = dat.length, dl = dict ? dict.length : 0;
    if (!sl || st.f && !st.l)
        return buf || new u8(0);
    var noBuf = !buf;
    // have to estimate size
    var resize = noBuf || st.i != 2;
    // no state
    var noSt = st.i;
    // Assumes roughly 33% compression ratio average
    if (noBuf)
        buf = new u8(sl * 3);
    // ensure buffer can fit at least l elements
    var cbuf = function (l) {
        var bl = buf.length;
        // need to increase size to fit
        if (l > bl) {
            // Double or set to necessary, whichever is greater
            var nbuf = new u8(Math.max(bl * 2, l));
            nbuf.set(buf);
            buf = nbuf;
        }
    };
    //  last chunk         bitpos           bytes
    var final = st.f || 0, pos = st.p || 0, bt = st.b || 0, lm = st.l, dm = st.d, lbt = st.m, dbt = st.n;
    // total bits
    var tbts = sl * 8;
    do {
        if (!lm) {
            // BFINAL - this is only 1 when last chunk is next
            final = bits(dat, pos, 1);
            // type: 0 = no compression, 1 = fixed huffman, 2 = dynamic huffman
            var type = bits(dat, pos + 1, 3);
            pos += 3;
            if (!type) {
                // go to end of byte boundary
                var s = shft(pos) + 4, l = dat[s - 4] | (dat[s - 3] << 8), t = s + l;
                if (t > sl) {
                    if (noSt)
                        err(0);
                    break;
                }
                // ensure size
                if (resize)
                    cbuf(bt + l);
                // Copy over uncompressed data
                buf.set(dat.subarray(s, t), bt);
                // Get new bitpos, update byte count
                st.b = bt += l, st.p = pos = t * 8, st.f = final;
                continue;
            }
            else if (type == 1)
                lm = flrm, dm = fdrm, lbt = 9, dbt = 5;
            else if (type == 2) {
                //  literal                            lengths
                var hLit = bits(dat, pos, 31) + 257, hcLen = bits(dat, pos + 10, 15) + 4;
                var tl = hLit + bits(dat, pos + 5, 31) + 1;
                pos += 14;
                // length+distance tree
                var ldt = new u8(tl);
                // code length tree
                var clt = new u8(19);
                for (var i = 0; i < hcLen; ++i) {
                    // use index map to get real code
                    clt[clim[i]] = bits(dat, pos + i * 3, 7);
                }
                pos += hcLen * 3;
                // code lengths bits
                var clb = max(clt), clbmsk = (1 << clb) - 1;
                // code lengths map
                var clm = hMap(clt, clb, 1);
                for (var i = 0; i < tl;) {
                    var r = clm[bits(dat, pos, clbmsk)];
                    // bits read
                    pos += r & 15;
                    // symbol
                    var s = r >> 4;
                    // code length to copy
                    if (s < 16) {
                        ldt[i++] = s;
                    }
                    else {
                        //  copy   count
                        var c = 0, n = 0;
                        if (s == 16)
                            n = 3 + bits(dat, pos, 3), pos += 2, c = ldt[i - 1];
                        else if (s == 17)
                            n = 3 + bits(dat, pos, 7), pos += 3;
                        else if (s == 18)
                            n = 11 + bits(dat, pos, 127), pos += 7;
                        while (n--)
                            ldt[i++] = c;
                    }
                }
                //    length tree                 distance tree
                var lt = ldt.subarray(0, hLit), dt = ldt.subarray(hLit);
                // max length bits
                lbt = max(lt);
                // max dist bits
                dbt = max(dt);
                lm = hMap(lt, lbt, 1);
                dm = hMap(dt, dbt, 1);
            }
            else
                err(1);
            if (pos > tbts) {
                if (noSt)
                    err(0);
                break;
            }
        }
        // Make sure the buffer can hold this + the largest possible addition
        // Maximum chunk size (practically, theoretically infinite) is 2^17
        if (resize)
            cbuf(bt + 131072);
        var lms = (1 << lbt) - 1, dms = (1 << dbt) - 1;
        var lpos = pos;
        for (;; lpos = pos) {
            // bits read, code
            var c = lm[bits16(dat, pos) & lms], sym = c >> 4;
            pos += c & 15;
            if (pos > tbts) {
                if (noSt)
                    err(0);
                break;
            }
            if (!c)
                err(2);
            if (sym < 256)
                buf[bt++] = sym;
            else if (sym == 256) {
                lpos = pos, lm = null;
                break;
            }
            else {
                var add = sym - 254;
                // no extra bits needed if less
                if (sym > 264) {
                    // index
                    var i = sym - 257, b = fleb[i];
                    add = bits(dat, pos, (1 << b) - 1) + fl[i];
                    pos += b;
                }
                // dist
                var d = dm[bits16(dat, pos) & dms], dsym = d >> 4;
                if (!d)
                    err(3);
                pos += d & 15;
                var dt = fd[dsym];
                if (dsym > 3) {
                    var b = fdeb[dsym];
                    dt += bits16(dat, pos) & (1 << b) - 1, pos += b;
                }
                if (pos > tbts) {
                    if (noSt)
                        err(0);
                    break;
                }
                if (resize)
                    cbuf(bt + 131072);
                var end = bt + add;
                if (bt < dt) {
                    var shift = dl - dt, dend = Math.min(dt, end);
                    if (shift + bt < 0)
                        err(3);
                    for (; bt < dend; ++bt)
                        buf[bt] = dict[shift + bt];
                }
                for (; bt < end; ++bt)
                    buf[bt] = buf[bt - dt];
            }
        }
        st.l = lm, st.p = lpos, st.b = bt, st.f = final;
        if (lm)
            final = 1, st.m = lbt, st.d = dm, st.n = dbt;
    } while (!final);
    // don't reallocate for streams or user buffers
    return bt != buf.length && noBuf ? slc(buf, 0, bt) : buf.subarray(0, bt);
};
// starting at p, write the minimum number of bits that can hold v to d
var wbits = function (d, p, v) {
    v <<= p & 7;
    var o = (p / 8) | 0;
    d[o] |= v;
    d[o + 1] |= v >> 8;
};
// starting at p, write the minimum number of bits (>8) that can hold v to d
var wbits16 = function (d, p, v) {
    v <<= p & 7;
    var o = (p / 8) | 0;
    d[o] |= v;
    d[o + 1] |= v >> 8;
    d[o + 2] |= v >> 16;
};
// creates code lengths from a frequency table
var hTree = function (d, mb) {
    // Need extra info to make a tree
    var t = [];
    for (var i = 0; i < d.length; ++i) {
        if (d[i])
            t.push({ s: i, f: d[i] });
    }
    var s = t.length;
    var t2 = t.slice();
    if (!s)
        return { t: et, l: 0 };
    if (s == 1) {
        var v = new u8(t[0].s + 1);
        v[t[0].s] = 1;
        return { t: v, l: 1 };
    }
    t.sort(function (a, b) { return a.f - b.f; });
    // after i2 reaches last ind, will be stopped
    // freq must be greater than largest possible number of symbols
    t.push({ s: -1, f: 25001 });
    var l = t[0], r = t[1], i0 = 0, i1 = 1, i2 = 2;
    t[0] = { s: -1, f: l.f + r.f, l: l, r: r };
    // efficient algorithm from UZIP.js
    // i0 is lookbehind, i2 is lookahead - after processing two low-freq
    // symbols that combined have high freq, will start processing i2 (high-freq,
    // non-composite) symbols instead
    // see https://reddit.com/r/photopea/comments/ikekht/uzipjs_questions/
    while (i1 != s - 1) {
        l = t[t[i0].f < t[i2].f ? i0++ : i2++];
        r = t[i0 != i1 && t[i0].f < t[i2].f ? i0++ : i2++];
        t[i1++] = { s: -1, f: l.f + r.f, l: l, r: r };
    }
    var maxSym = t2[0].s;
    for (var i = 1; i < s; ++i) {
        if (t2[i].s > maxSym)
            maxSym = t2[i].s;
    }
    // code lengths
    var tr = new u16(maxSym + 1);
    // max bits in tree
    var mbt = ln(t[i1 - 1], tr, 0);
    if (mbt > mb) {
        // more algorithms from UZIP.js
        // TODO: find out how this code works (debt)
        //  ind    debt
        var i = 0, dt = 0;
        //    left            cost
        var lft = mbt - mb, cst = 1 << lft;
        t2.sort(function (a, b) { return tr[b.s] - tr[a.s] || a.f - b.f; });
        for (; i < s; ++i) {
            var i2_1 = t2[i].s;
            if (tr[i2_1] > mb) {
                dt += cst - (1 << (mbt - tr[i2_1]));
                tr[i2_1] = mb;
            }
            else
                break;
        }
        dt >>= lft;
        while (dt > 0) {
            var i2_2 = t2[i].s;
            if (tr[i2_2] < mb)
                dt -= 1 << (mb - tr[i2_2]++ - 1);
            else
                ++i;
        }
        for (; i >= 0 && dt; --i) {
            var i2_3 = t2[i].s;
            if (tr[i2_3] == mb) {
                --tr[i2_3];
                ++dt;
            }
        }
        mbt = mb;
    }
    return { t: new u8(tr), l: mbt };
};
// get the max length and assign length codes
var ln = function (n, l, d) {
    return n.s == -1
        ? Math.max(ln(n.l, l, d + 1), ln(n.r, l, d + 1))
        : (l[n.s] = d);
};
// length codes generation
var lc = function (c) {
    var s = c.length;
    // Note that the semicolon was intentional
    while (s && !c[--s])
        ;
    var cl = new u16(++s);
    //  ind      num         streak
    var cli = 0, cln = c[0], cls = 1;
    var w = function (v) { cl[cli++] = v; };
    for (var i = 1; i <= s; ++i) {
        if (c[i] == cln && i != s)
            ++cls;
        else {
            if (!cln && cls > 2) {
                for (; cls > 138; cls -= 138)
                    w(32754);
                if (cls > 2) {
                    w(cls > 10 ? ((cls - 11) << 5) | 28690 : ((cls - 3) << 5) | 12305);
                    cls = 0;
                }
            }
            else if (cls > 3) {
                w(cln), --cls;
                for (; cls > 6; cls -= 6)
                    w(8304);
                if (cls > 2)
                    w(((cls - 3) << 5) | 8208), cls = 0;
            }
            while (cls--)
                w(cln);
            cls = 1;
            cln = c[i];
        }
    }
    return { c: cl.subarray(0, cli), n: s };
};
// calculate the length of output from tree, code lengths
var clen = function (cf, cl) {
    var l = 0;
    for (var i = 0; i < cl.length; ++i)
        l += cf[i] * cl[i];
    return l;
};
// writes a fixed block
// returns the new bit pos
var wfblk = function (out, pos, dat) {
    // no need to write 00 as type: TypedArray defaults to 0
    var s = dat.length;
    var o = shft(pos + 2);
    out[o] = s & 255;
    out[o + 1] = s >> 8;
    out[o + 2] = out[o] ^ 255;
    out[o + 3] = out[o + 1] ^ 255;
    for (var i = 0; i < s; ++i)
        out[o + i + 4] = dat[i];
    return (o + 4 + s) * 8;
};
// writes a block
var wblk = function (dat, out, final, syms, lf, df, eb, li, bs, bl, p) {
    wbits(out, p++, final);
    ++lf[256];
    var _a = hTree(lf, 15), dlt = _a.t, mlb = _a.l;
    var _b = hTree(df, 15), ddt = _b.t, mdb = _b.l;
    var _c = lc(dlt), lclt = _c.c, nlc = _c.n;
    var _d = lc(ddt), lcdt = _d.c, ndc = _d.n;
    var lcfreq = new u16(19);
    for (var i = 0; i < lclt.length; ++i)
        ++lcfreq[lclt[i] & 31];
    for (var i = 0; i < lcdt.length; ++i)
        ++lcfreq[lcdt[i] & 31];
    var _e = hTree(lcfreq, 7), lct = _e.t, mlcb = _e.l;
    var nlcc = 19;
    for (; nlcc > 4 && !lct[clim[nlcc - 1]]; --nlcc)
        ;
    var flen = (bl + 5) << 3;
    var ftlen = clen(lf, flt) + clen(df, fdt) + eb;
    var dtlen = clen(lf, dlt) + clen(df, ddt) + eb + 14 + 3 * nlcc + clen(lcfreq, lct) + 2 * lcfreq[16] + 3 * lcfreq[17] + 7 * lcfreq[18];
    if (bs >= 0 && flen <= ftlen && flen <= dtlen)
        return wfblk(out, p, dat.subarray(bs, bs + bl));
    var lm, ll, dm, dl;
    wbits(out, p, 1 + (dtlen < ftlen)), p += 2;
    if (dtlen < ftlen) {
        lm = hMap(dlt, mlb, 0), ll = dlt, dm = hMap(ddt, mdb, 0), dl = ddt;
        var llm = hMap(lct, mlcb, 0);
        wbits(out, p, nlc - 257);
        wbits(out, p + 5, ndc - 1);
        wbits(out, p + 10, nlcc - 4);
        p += 14;
        for (var i = 0; i < nlcc; ++i)
            wbits(out, p + 3 * i, lct[clim[i]]);
        p += 3 * nlcc;
        var lcts = [lclt, lcdt];
        for (var it = 0; it < 2; ++it) {
            var clct = lcts[it];
            for (var i = 0; i < clct.length; ++i) {
                var len = clct[i] & 31;
                wbits(out, p, llm[len]), p += lct[len];
                if (len > 15)
                    wbits(out, p, (clct[i] >> 5) & 127), p += clct[i] >> 12;
            }
        }
    }
    else {
        lm = flm, ll = flt, dm = fdm, dl = fdt;
    }
    for (var i = 0; i < li; ++i) {
        var sym = syms[i];
        if (sym > 255) {
            var len = (sym >> 18) & 31;
            wbits16(out, p, lm[len + 257]), p += ll[len + 257];
            if (len > 7)
                wbits(out, p, (sym >> 23) & 31), p += fleb[len];
            var dst = sym & 31;
            wbits16(out, p, dm[dst]), p += dl[dst];
            if (dst > 3)
                wbits16(out, p, (sym >> 5) & 8191), p += fdeb[dst];
        }
        else {
            wbits16(out, p, lm[sym]), p += ll[sym];
        }
    }
    wbits16(out, p, lm[256]);
    return p + ll[256];
};
// deflate options (nice << 13) | chain
var deo = /*#__PURE__*/ new i32([65540, 131080, 131088, 131104, 262176, 1048704, 1048832, 2114560, 2117632]);
// empty
var et = /*#__PURE__*/ new u8(0);
// compresses data into a raw DEFLATE buffer
var dflt = function (dat, lvl, plvl, pre, post, st) {
    var s = st.z || dat.length;
    var o = new u8(pre + s + 5 * (1 + Math.ceil(s / 7000)) + post);
    // writing to this writes to the output buffer
    var w = o.subarray(pre, o.length - post);
    var lst = st.l;
    var pos = (st.r || 0) & 7;
    if (lvl) {
        if (pos)
            w[0] = st.r >> 3;
        var opt = deo[lvl - 1];
        var n = opt >> 13, c = opt & 8191;
        var msk_1 = (1 << plvl) - 1;
        //    prev 2-byte val map    curr 2-byte val map
        var prev = st.p || new u16(32768), head = st.h || new u16(msk_1 + 1);
        var bs1_1 = Math.ceil(plvl / 3), bs2_1 = 2 * bs1_1;
        var hsh = function (i) { return (dat[i] ^ (dat[i + 1] << bs1_1) ^ (dat[i + 2] << bs2_1)) & msk_1; };
        // 24576 is an arbitrary number of maximum symbols per block
        // 424 buffer for last block
        var syms = new i32(25000);
        // length/literal freq   distance freq
        var lf = new u16(288), df = new u16(32);
        //  l/lcnt  exbits  index          l/lind  waitdx          blkpos
        var lc_1 = 0, eb = 0, i = st.i || 0, li = 0, wi = st.w || 0, bs = 0;
        for (; i + 2 < s; ++i) {
            // hash value
            var hv = hsh(i);
            // index mod 32768    previous index mod
            var imod = i & 32767, pimod = head[hv];
            prev[imod] = pimod;
            head[hv] = imod;
            // We always should modify head and prev, but only add symbols if
            // this data is not yet processed ("wait" for wait index)
            if (wi <= i) {
                // bytes remaining
                var rem = s - i;
                if ((lc_1 > 7000 || li > 24576) && (rem > 423 || !lst)) {
                    pos = wblk(dat, w, 0, syms, lf, df, eb, li, bs, i - bs, pos);
                    li = lc_1 = eb = 0, bs = i;
                    for (var j = 0; j < 286; ++j)
                        lf[j] = 0;
                    for (var j = 0; j < 30; ++j)
                        df[j] = 0;
                }
                //  len    dist   chain
                var l = 2, d = 0, ch_1 = c, dif = imod - pimod & 32767;
                if (rem > 2 && hv == hsh(i - dif)) {
                    var maxn = Math.min(n, rem) - 1;
                    var maxd = Math.min(32767, i);
                    // max possible length
                    // not capped at dif because decompressors implement "rolling" index population
                    var ml = Math.min(258, rem);
                    while (dif <= maxd && --ch_1 && imod != pimod) {
                        if (dat[i + l] == dat[i + l - dif]) {
                            var nl = 0;
                            for (; nl < ml && dat[i + nl] == dat[i + nl - dif]; ++nl)
                                ;
                            if (nl > l) {
                                l = nl, d = dif;
                                // break out early when we reach "nice" (we are satisfied enough)
                                if (nl > maxn)
                                    break;
                                // now, find the rarest 2-byte sequence within this
                                // length of literals and search for that instead.
                                // Much faster than just using the start
                                var mmd = Math.min(dif, nl - 2);
                                var md = 0;
                                for (var j = 0; j < mmd; ++j) {
                                    var ti = i - dif + j & 32767;
                                    var pti = prev[ti];
                                    var cd = ti - pti & 32767;
                                    if (cd > md)
                                        md = cd, pimod = ti;
                                }
                            }
                        }
                        // check the previous match
                        imod = pimod, pimod = prev[imod];
                        dif += imod - pimod & 32767;
                    }
                }
                // d will be nonzero only when a match was found
                if (d) {
                    // store both dist and len data in one int32
                    // Make sure this is recognized as a len/dist with 28th bit (2^28)
                    syms[li++] = 268435456 | (revfl[l] << 18) | revfd[d];
                    var lin = revfl[l] & 31, din = revfd[d] & 31;
                    eb += fleb[lin] + fdeb[din];
                    ++lf[257 + lin];
                    ++df[din];
                    wi = i + l;
                    ++lc_1;
                }
                else {
                    syms[li++] = dat[i];
                    ++lf[dat[i]];
                }
            }
        }
        for (i = Math.max(i, wi); i < s; ++i) {
            syms[li++] = dat[i];
            ++lf[dat[i]];
        }
        pos = wblk(dat, w, lst, syms, lf, df, eb, li, bs, i - bs, pos);
        if (!lst) {
            st.r = (pos & 7) | w[(pos / 8) | 0] << 3;
            // shft(pos) now 1 less if pos & 7 != 0
            pos -= 7;
            st.h = head, st.p = prev, st.i = i, st.w = wi;
        }
    }
    else {
        for (var i = st.w || 0; i < s + lst; i += 65535) {
            // end
            var e = i + 65535;
            if (e >= s) {
                // write final block
                w[(pos / 8) | 0] = lst;
                e = s;
            }
            pos = wfblk(w, pos + 1, dat.subarray(i, e));
        }
        st.i = s;
    }
    return slc(o, 0, pre + shft(pos) + post);
};
// CRC32 table
var crct = /*#__PURE__*/ (function () {
    var t = new Int32Array(256);
    for (var i = 0; i < 256; ++i) {
        var c = i, k = 9;
        while (--k)
            c = ((c & 1) && -306674912) ^ (c >>> 1);
        t[i] = c;
    }
    return t;
})();
// CRC32
var crc = function () {
    var c = -1;
    return {
        p: function (d) {
            // closures have awful performance
            var cr = c;
            for (var i = 0; i < d.length; ++i)
                cr = crct[(cr & 255) ^ d[i]] ^ (cr >>> 8);
            c = cr;
        },
        d: function () { return ~c; }
    };
};
// Adler32
var adler = function () {
    var a = 1, b = 0;
    return {
        p: function (d) {
            // closures have awful performance
            var n = a, m = b;
            var l = d.length | 0;
            for (var i = 0; i != l;) {
                var e = Math.min(i + 2655, l);
                for (; i < e; ++i)
                    m += n += d[i];
                n = (n & 65535) + 15 * (n >> 16), m = (m & 65535) + 15 * (m >> 16);
            }
            a = n, b = m;
        },
        d: function () {
            a %= 65521, b %= 65521;
            return (a & 255) << 24 | (a & 0xFF00) << 8 | (b & 255) << 8 | (b >> 8);
        }
    };
};
// deflate with opts
var dopt = function (dat, opt, pre, post, st) {
    if (!st) {
        st = { l: 1 };
        if (opt.dictionary) {
            var dict = opt.dictionary.subarray(-32768);
            var newDat = new u8(dict.length + dat.length);
            newDat.set(dict);
            newDat.set(dat, dict.length);
            dat = newDat;
            st.w = dict.length;
        }
    }
    return dflt(dat, opt.level == null ? 6 : opt.level, opt.mem == null ? (st.l ? Math.ceil(Math.max(8, Math.min(13, Math.log(dat.length))) * 1.5) : 20) : (12 + opt.mem), pre, post, st);
};
// Walmart object spread
var mrg = function (a, b) {
    var o = {};
    for (var k in a)
        o[k] = a[k];
    for (var k in b)
        o[k] = b[k];
    return o;
};
// worker clone
// This is possibly the craziest part of the entire codebase, despite how simple it may seem.
// The only parameter to this function is a closure that returns an array of variables outside of the function scope.
// We're going to try to figure out the variable names used in the closure as strings because that is crucial for workerization.
// We will return an object mapping of true variable name to value (basically, the current scope as a JS object).
// The reason we can't just use the original variable names is minifiers mangling the toplevel scope.
// This took me three weeks to figure out how to do.
var wcln = function (fn, fnStr, td) {
    var dt = fn();
    var st = fn.toString();
    var ks = st.slice(st.indexOf('[') + 1, st.lastIndexOf(']')).replace(/\s+/g, '').split(',');
    for (var i = 0; i < dt.length; ++i) {
        var v = dt[i], k = ks[i];
        if (typeof v == 'function') {
            fnStr += ';' + k + '=';
            var st_1 = v.toString();
            if (v.prototype) {
                // for global objects
                if (st_1.indexOf('[native code]') != -1) {
                    var spInd = st_1.indexOf(' ', 8) + 1;
                    fnStr += st_1.slice(spInd, st_1.indexOf('(', spInd));
                }
                else {
                    fnStr += st_1;
                    for (var t in v.prototype)
                        fnStr += ';' + k + '.prototype.' + t + '=' + v.prototype[t].toString();
                }
            }
            else
                fnStr += st_1;
        }
        else
            td[k] = v;
    }
    return fnStr;
};
var ch = [];
// clone bufs
var cbfs = function (v) {
    var tl = [];
    for (var k in v) {
        if (v[k].buffer) {
            tl.push((v[k] = new v[k].constructor(v[k])).buffer);
        }
    }
    return tl;
};
// use a worker to execute code
var wrkr = function (fns, init, id, cb) {
    if (!ch[id]) {
        var fnStr = '', td_1 = {}, m = fns.length - 1;
        for (var i = 0; i < m; ++i)
            fnStr = wcln(fns[i], fnStr, td_1);
        ch[id] = { c: wcln(fns[m], fnStr, td_1), e: td_1 };
    }
    var td = mrg({}, ch[id].e);
    return wk(ch[id].c + ';onmessage=function(e){for(var k in e.data)self[k]=e.data[k];onmessage=' + init.toString() + '}', id, td, cbfs(td), cb);
};
// base async inflate fn
var bInflt = function () { return [u8, u16, i32, fleb, fdeb, clim, fl, fd, flrm, fdrm, rev, ec, hMap, max, bits, bits16, shft, slc, err, inflt, inflateSync, pbf, gopt]; };
var bDflt = function () { return [u8, u16, i32, fleb, fdeb, clim, revfl, revfd, flm, flt, fdm, fdt, rev, deo, et, hMap, wbits, wbits16, hTree, ln, lc, clen, wfblk, wblk, shft, slc, dflt, dopt, deflateSync, pbf]; };
// gzip extra
var gze = function () { return [gzh, gzhl, wbytes, crc, crct]; };
// gunzip extra
var guze = function () { return [gzs, gzl]; };
// zlib extra
var zle = function () { return [zlh, wbytes, adler]; };
// unzlib extra
var zule = function () { return [zls]; };
// post buf
var pbf = function (msg) { return postMessage(msg, [msg.buffer]); };
// get opts
var gopt = function (o) { return o && {
    out: o.size && new u8(o.size),
    dictionary: o.dictionary
}; };
// async helper
var cbify = function (dat, opts, fns, init, id, cb) {
    var w = wrkr(fns, init, id, function (err, dat) {
        w.terminate();
        cb(err, dat);
    });
    w.postMessage([dat, opts], opts.consume ? [dat.buffer] : []);
    return function () { w.terminate(); };
};
// auto stream
var astrm = function (strm) {
    strm.ondata = function (dat, final) { return postMessage([dat, final], [dat.buffer]); };
    return function (ev) {
        if (ev.data.length) {
            strm.push(ev.data[0], ev.data[1]);
            postMessage([ev.data[0].length]);
        }
        else
            strm.flush();
    };
};
// async stream attach
var astrmify = function (fns, strm, opts, init, id, flush, ext) {
    var t;
    var w = wrkr(fns, init, id, function (err, dat) {
        if (err)
            w.terminate(), strm.ondata.call(strm, err);
        else if (!Array.isArray(dat))
            ext(dat);
        else if (dat.length == 1) {
            strm.queuedSize -= dat[0];
            if (strm.ondrain)
                strm.ondrain(dat[0]);
        }
        else {
            if (dat[1])
                w.terminate();
            strm.ondata.call(strm, err, dat[0], dat[1]);
        }
    });
    w.postMessage(opts);
    strm.queuedSize = 0;
    strm.push = function (d, f) {
        if (!strm.ondata)
            err(5);
        if (t)
            strm.ondata(err(4, 0, 1), null, !!f);
        strm.queuedSize += d.length;
        w.postMessage([d, t = f], [d.buffer]);
    };
    strm.terminate = function () { w.terminate(); };
    if (flush) {
        strm.flush = function () { w.postMessage([]); };
    }
};
// read 2 bytes
var b2 = function (d, b) { return d[b] | (d[b + 1] << 8); };
// read 4 bytes
var b4 = function (d, b) { return (d[b] | (d[b + 1] << 8) | (d[b + 2] << 16) | (d[b + 3] << 24)) >>> 0; };
var b8 = function (d, b) { return b4(d, b) + (b4(d, b + 4) * 4294967296); };
// write bytes
var wbytes = function (d, b, v) {
    for (; v; ++b)
        d[b] = v, v >>>= 8;
};
// gzip header
var gzh = function (c, o) {
    var fn = o.filename;
    c[0] = 31, c[1] = 139, c[2] = 8, c[8] = o.level < 2 ? 4 : o.level == 9 ? 2 : 0, c[9] = 3; // assume Unix
    if (o.mtime != 0)
        wbytes(c, 4, Math.floor(new Date(o.mtime || Date.now()) / 1000));
    if (fn) {
        c[3] = 8;
        for (var i = 0; i <= fn.length; ++i)
            c[i + 10] = fn.charCodeAt(i);
    }
};
// gzip footer: -8 to -4 = CRC, -4 to -0 is length
// gzip start
var gzs = function (d) {
    if (d[0] != 31 || d[1] != 139 || d[2] != 8)
        err(6, 'invalid gzip data');
    var flg = d[3];
    var st = 10;
    if (flg & 4)
        st += (d[10] | d[11] << 8) + 2;
    for (var zs = (flg >> 3 & 1) + (flg >> 4 & 1); zs > 0; zs -= !d[st++])
        ;
    return st + (flg & 2);
};
// gzip length
var gzl = function (d) {
    var l = d.length;
    return (d[l - 4] | d[l - 3] << 8 | d[l - 2] << 16 | d[l - 1] << 24) >>> 0;
};
// gzip header length
var gzhl = function (o) { return 10 + (o.filename ? o.filename.length + 1 : 0); };
// zlib header
var zlh = function (c, o) {
    var lv = o.level, fl = lv == 0 ? 0 : lv < 6 ? 1 : lv == 9 ? 3 : 2;
    c[0] = 120, c[1] = (fl << 6) | (o.dictionary && 32);
    c[1] |= 31 - ((c[0] << 8) | c[1]) % 31;
    if (o.dictionary) {
        var h = adler();
        h.p(o.dictionary);
        wbytes(c, 2, h.d());
    }
};
// zlib start
var zls = function (d, dict) {
    if ((d[0] & 15) != 8 || (d[0] >> 4) > 7 || ((d[0] << 8 | d[1]) % 31))
        err(6, 'invalid zlib data');
    if ((d[1] >> 5 & 1) == +!dict)
        err(6, 'invalid zlib data: ' + (d[1] & 32 ? 'need' : 'unexpected') + ' dictionary');
    return (d[1] >> 3 & 4) + 2;
};
function StrmOpt(opts, cb) {
    if (typeof opts == 'function')
        cb = opts, opts = {};
    this.ondata = cb;
    return opts;
}
/**
 * Streaming DEFLATE compression
 */
var Deflate = /*#__PURE__*/ (function () {
    function Deflate(opts, cb) {
        if (typeof opts == 'function')
            cb = opts, opts = {};
        this.ondata = cb;
        this.o = opts || {};
        this.s = { l: 0, i: 32768, w: 32768, z: 32768 };
        // Buffer length must always be 0 mod 32768 for index calculations to be correct when modifying head and prev
        // 98304 = 32768 (lookback) + 65536 (common chunk size)
        this.b = new u8(98304);
        if (this.o.dictionary) {
            var dict = this.o.dictionary.subarray(-32768);
            this.b.set(dict, 32768 - dict.length);
            this.s.i = 32768 - dict.length;
        }
    }
    Deflate.prototype.p = function (c, f) {
        this.ondata(dopt(c, this.o, 0, 0, this.s), f);
    };
    /**
     * Pushes a chunk to be deflated
     * @param chunk The chunk to push
     * @param final Whether this is the last chunk
     */
    Deflate.prototype.push = function (chunk, final) {
        if (!this.ondata)
            err(5);
        if (this.s.l)
            err(4);
        var endLen = chunk.length + this.s.z;
        if (endLen > this.b.length) {
            if (endLen > 2 * this.b.length - 32768) {
                var newBuf = new u8(endLen & -32768);
                newBuf.set(this.b.subarray(0, this.s.z));
                this.b = newBuf;
            }
            var split = this.b.length - this.s.z;
            this.b.set(chunk.subarray(0, split), this.s.z);
            this.s.z = this.b.length;
            this.p(this.b, false);
            this.b.set(this.b.subarray(-32768));
            this.b.set(chunk.subarray(split), 32768);
            this.s.z = chunk.length - split + 32768;
            this.s.i = 32766, this.s.w = 32768;
        }
        else {
            this.b.set(chunk, this.s.z);
            this.s.z += chunk.length;
        }
        this.s.l = final & 1;
        if (this.s.z > this.s.w + 8191 || final) {
            this.p(this.b, final || false);
            this.s.w = this.s.i, this.s.i -= 2;
        }
    };
    /**
     * Flushes buffered uncompressed data. Useful to immediately retrieve the
     * deflated output for small inputs.
     */
    Deflate.prototype.flush = function () {
        if (!this.ondata)
            err(5);
        if (this.s.l)
            err(4);
        this.p(this.b, false);
        this.s.w = this.s.i, this.s.i -= 2;
    };
    return Deflate;
}());
/**
 * Asynchronous streaming DEFLATE compression
 */
var AsyncDeflate = /*#__PURE__*/ (function () {
    function AsyncDeflate(opts, cb) {
        astrmify([
            bDflt,
            function () { return [astrm, Deflate]; }
        ], this, StrmOpt.call(this, opts, cb), function (ev) {
            var strm = new Deflate(ev.data);
            onmessage = astrm(strm);
        }, 6, 1);
    }
    return AsyncDeflate;
}());
function deflate(data, opts, cb) {
    if (!cb)
        cb = opts, opts = {};
    if (typeof cb != 'function')
        err(7);
    return cbify(data, opts, [
        bDflt,
    ], function (ev) { return pbf(deflateSync(ev.data[0], ev.data[1])); }, 0, cb);
}
/**
 * Compresses data with DEFLATE without any wrapper
 * @param data The data to compress
 * @param opts The compression options
 * @returns The deflated version of the data
 */
function deflateSync(data, opts) {
    return dopt(data, opts || {}, 0, 0);
}
/**
 * Streaming DEFLATE decompression
 */
var Inflate = /*#__PURE__*/ (function () {
    function Inflate(opts, cb) {
        // no StrmOpt here to avoid adding to workerizer
        if (typeof opts == 'function')
            cb = opts, opts = {};
        this.ondata = cb;
        var dict = opts && opts.dictionary && opts.dictionary.subarray(-32768);
        this.s = { i: 0, b: dict ? dict.length : 0 };
        this.o = new u8(32768);
        this.p = new u8(0);
        if (dict)
            this.o.set(dict);
    }
    Inflate.prototype.e = function (c) {
        if (!this.ondata)
            err(5);
        if (this.d)
            err(4);
        if (!this.p.length)
            this.p = c;
        else if (c.length) {
            var n = new u8(this.p.length + c.length);
            n.set(this.p), n.set(c, this.p.length), this.p = n;
        }
    };
    Inflate.prototype.c = function (final) {
        this.s.i = +(this.d = final || false);
        var bts = this.s.b;
        var dt = inflt(this.p, this.s, this.o);
        this.ondata(slc(dt, bts, this.s.b), this.d);
        this.o = slc(dt, this.s.b - 32768), this.s.b = this.o.length;
        this.p = slc(this.p, (this.s.p / 8) | 0), this.s.p &= 7;
    };
    /**
     * Pushes a chunk to be inflated
     * @param chunk The chunk to push
     * @param final Whether this is the final chunk
     */
    Inflate.prototype.push = function (chunk, final) {
        this.e(chunk), this.c(final);
    };
    return Inflate;
}());
/**
 * Asynchronous streaming DEFLATE decompression
 */
var AsyncInflate = /*#__PURE__*/ (function () {
    function AsyncInflate(opts, cb) {
        astrmify([
            bInflt,
            function () { return [astrm, Inflate]; }
        ], this, StrmOpt.call(this, opts, cb), function (ev) {
            var strm = new Inflate(ev.data);
            onmessage = astrm(strm);
        }, 7, 0);
    }
    return AsyncInflate;
}());
function inflate(data, opts, cb) {
    if (!cb)
        cb = opts, opts = {};
    if (typeof cb != 'function')
        err(7);
    return cbify(data, opts, [
        bInflt
    ], function (ev) { return pbf(inflateSync(ev.data[0], gopt(ev.data[1]))); }, 1, cb);
}
/**
 * Expands DEFLATE data with no wrapper
 * @param data The data to decompress
 * @param opts The decompression options
 * @returns The decompressed version of the data
 */
function inflateSync(data, opts) {
    return inflt(data, { i: 2 }, opts && opts.out, opts && opts.dictionary);
}
// before you yell at me for not just using extends, my reason is that TS inheritance is hard to workerize.
/**
 * Streaming GZIP compression
 */
var Gzip = /*#__PURE__*/ (function () {
    function Gzip(opts, cb) {
        this.c = crc();
        this.l = 0;
        this.v = 1;
        Deflate.call(this, opts, cb);
    }
    /**
     * Pushes a chunk to be GZIPped
     * @param chunk The chunk to push
     * @param final Whether this is the last chunk
     */
    Gzip.prototype.push = function (chunk, final) {
        this.c.p(chunk);
        this.l += chunk.length;
        Deflate.prototype.push.call(this, chunk, final);
    };
    Gzip.prototype.p = function (c, f) {
        var raw = dopt(c, this.o, this.v && gzhl(this.o), f && 8, this.s);
        if (this.v)
            gzh(raw, this.o), this.v = 0;
        if (f)
            wbytes(raw, raw.length - 8, this.c.d()), wbytes(raw, raw.length - 4, this.l);
        this.ondata(raw, f);
    };
    /**
     * Flushes buffered uncompressed data. Useful to immediately retrieve the
     * GZIPped output for small inputs.
     */
    Gzip.prototype.flush = function () {
        Deflate.prototype.flush.call(this);
    };
    return Gzip;
}());
/**
 * Asynchronous streaming GZIP compression
 */
var AsyncGzip = /*#__PURE__*/ (function () {
    function AsyncGzip(opts, cb) {
        astrmify([
            bDflt,
            gze,
            function () { return [astrm, Deflate, Gzip]; }
        ], this, StrmOpt.call(this, opts, cb), function (ev) {
            var strm = new Gzip(ev.data);
            onmessage = astrm(strm);
        }, 8, 1);
    }
    return AsyncGzip;
}());
function gzip(data, opts, cb) {
    if (!cb)
        cb = opts, opts = {};
    if (typeof cb != 'function')
        err(7);
    return cbify(data, opts, [
        bDflt,
        gze,
        function () { return [gzipSync]; }
    ], function (ev) { return pbf(gzipSync(ev.data[0], ev.data[1])); }, 2, cb);
}
/**
 * Compresses data with GZIP
 * @param data The data to compress
 * @param opts The compression options
 * @returns The gzipped version of the data
 */
function gzipSync(data, opts) {
    if (!opts)
        opts = {};
    var c = crc(), l = data.length;
    c.p(data);
    var d = dopt(data, opts, gzhl(opts), 8), s = d.length;
    return gzh(d, opts), wbytes(d, s - 8, c.d()), wbytes(d, s - 4, l), d;
}
/**
 * Streaming single or multi-member GZIP decompression
 */
var Gunzip = /*#__PURE__*/ (function () {
    function Gunzip(opts, cb) {
        this.v = 1;
        this.r = 0;
        Inflate.call(this, opts, cb);
    }
    /**
     * Pushes a chunk to be GUNZIPped
     * @param chunk The chunk to push
     * @param final Whether this is the last chunk
     */
    Gunzip.prototype.push = function (chunk, final) {
        Inflate.prototype.e.call(this, chunk);
        this.r += chunk.length;
        if (this.v) {
            var p = this.p.subarray(this.v - 1);
            var s = p.length > 3 ? gzs(p) : 4;
            if (s > p.length) {
                if (!final)
                    return;
            }
            else if (this.v > 1 && this.onmember) {
                this.onmember(this.r - p.length);
            }
            this.p = p.subarray(s), this.v = 0;
        }
        // necessary to prevent TS from using the closure value
        // This allows for workerization to function correctly
        Inflate.prototype.c.call(this, final);
        // process concatenated GZIP
        if (this.s.f && !this.s.l && !final) {
            this.v = shft(this.s.p) + 9;
            this.s = { i: 0 };
            this.o = new u8(0);
            this.push(new u8(0), final);
        }
    };
    return Gunzip;
}());
/**
 * Asynchronous streaming single or multi-member GZIP decompression
 */
var AsyncGunzip = /*#__PURE__*/ (function () {
    function AsyncGunzip(opts, cb) {
        var _this = this;
        astrmify([
            bInflt,
            guze,
            function () { return [astrm, Inflate, Gunzip]; }
        ], this, StrmOpt.call(this, opts, cb), function (ev) {
            var strm = new Gunzip(ev.data);
            strm.onmember = function (offset) { return postMessage(offset); };
            onmessage = astrm(strm);
        }, 9, 0, function (offset) { return _this.onmember && _this.onmember(offset); });
    }
    return AsyncGunzip;
}());
function gunzip(data, opts, cb) {
    if (!cb)
        cb = opts, opts = {};
    if (typeof cb != 'function')
        err(7);
    return cbify(data, opts, [
        bInflt,
        guze,
        function () { return [gunzipSync]; }
    ], function (ev) { return pbf(gunzipSync(ev.data[0], ev.data[1])); }, 3, cb);
}
/**
 * Expands GZIP data
 * @param data The data to decompress
 * @param opts The decompression options
 * @returns The decompressed version of the data
 */
function gunzipSync(data, opts) {
    var st = gzs(data);
    if (st + 8 > data.length)
        err(6, 'invalid gzip data');
    return inflt(data.subarray(st, -8), { i: 2 }, opts && opts.out || new u8(gzl(data)), opts && opts.dictionary);
}
/**
 * Streaming Zlib compression
 */
var Zlib = /*#__PURE__*/ (function () {
    function Zlib(opts, cb) {
        this.c = adler();
        this.v = 1;
        Deflate.call(this, opts, cb);
    }
    /**
     * Pushes a chunk to be zlibbed
     * @param chunk The chunk to push
     * @param final Whether this is the last chunk
     */
    Zlib.prototype.push = function (chunk, final) {
        this.c.p(chunk);
        Deflate.prototype.push.call(this, chunk, final);
    };
    Zlib.prototype.p = function (c, f) {
        var raw = dopt(c, this.o, this.v && (this.o.dictionary ? 6 : 2), f && 4, this.s);
        if (this.v)
            zlh(raw, this.o), this.v = 0;
        if (f)
            wbytes(raw, raw.length - 4, this.c.d());
        this.ondata(raw, f);
    };
    /**
     * Flushes buffered uncompressed data. Useful to immediately retrieve the
     * zlibbed output for small inputs.
     */
    Zlib.prototype.flush = function () {
        Deflate.prototype.flush.call(this);
    };
    return Zlib;
}());
/**
 * Asynchronous streaming Zlib compression
 */
var AsyncZlib = /*#__PURE__*/ (function () {
    function AsyncZlib(opts, cb) {
        astrmify([
            bDflt,
            zle,
            function () { return [astrm, Deflate, Zlib]; }
        ], this, StrmOpt.call(this, opts, cb), function (ev) {
            var strm = new Zlib(ev.data);
            onmessage = astrm(strm);
        }, 10, 1);
    }
    return AsyncZlib;
}());
function zlib(data, opts, cb) {
    if (!cb)
        cb = opts, opts = {};
    if (typeof cb != 'function')
        err(7);
    return cbify(data, opts, [
        bDflt,
        zle,
        function () { return [zlibSync]; }
    ], function (ev) { return pbf(zlibSync(ev.data[0], ev.data[1])); }, 4, cb);
}
/**
 * Compress data with Zlib
 * @param data The data to compress
 * @param opts The compression options
 * @returns The zlib-compressed version of the data
 */
function zlibSync(data, opts) {
    if (!opts)
        opts = {};
    var a = adler();
    a.p(data);
    var d = dopt(data, opts, opts.dictionary ? 6 : 2, 4);
    return zlh(d, opts), wbytes(d, d.length - 4, a.d()), d;
}
/**
 * Streaming Zlib decompression
 */
var Unzlib = /*#__PURE__*/ (function () {
    function Unzlib(opts, cb) {
        Inflate.call(this, opts, cb);
        this.v = opts && opts.dictionary ? 2 : 1;
    }
    /**
     * Pushes a chunk to be unzlibbed
     * @param chunk The chunk to push
     * @param final Whether this is the last chunk
     */
    Unzlib.prototype.push = function (chunk, final) {
        Inflate.prototype.e.call(this, chunk);
        if (this.v) {
            if (this.p.length < 6 && !final)
                return;
            this.p = this.p.subarray(zls(this.p, this.v - 1)), this.v = 0;
        }
        if (final) {
            if (this.p.length < 4)
                err(6, 'invalid zlib data');
            this.p = this.p.subarray(0, -4);
        }
        // necessary to prevent TS from using the closure value
        // This allows for workerization to function correctly
        Inflate.prototype.c.call(this, final);
    };
    return Unzlib;
}());
/**
 * Asynchronous streaming Zlib decompression
 */
var AsyncUnzlib = /*#__PURE__*/ (function () {
    function AsyncUnzlib(opts, cb) {
        astrmify([
            bInflt,
            zule,
            function () { return [astrm, Inflate, Unzlib]; }
        ], this, StrmOpt.call(this, opts, cb), function (ev) {
            var strm = new Unzlib(ev.data);
            onmessage = astrm(strm);
        }, 11, 0);
    }
    return AsyncUnzlib;
}());
function unzlib(data, opts, cb) {
    if (!cb)
        cb = opts, opts = {};
    if (typeof cb != 'function')
        err(7);
    return cbify(data, opts, [
        bInflt,
        zule,
        function () { return [unzlibSync]; }
    ], function (ev) { return pbf(unzlibSync(ev.data[0], gopt(ev.data[1]))); }, 5, cb);
}
/**
 * Expands Zlib data
 * @param data The data to decompress
 * @param opts The decompression options
 * @returns The decompressed version of the data
 */
function unzlibSync(data, opts) {
    return inflt(data.subarray(zls(data, opts && opts.dictionary), -4), { i: 2 }, opts && opts.out, opts && opts.dictionary);
}
/**
 * Streaming GZIP, Zlib, or raw DEFLATE decompression
 */
var Decompress = /*#__PURE__*/ (function () {
    function Decompress(opts, cb) {
        this.o = StrmOpt.call(this, opts, cb) || {};
        this.G = Gunzip;
        this.I = Inflate;
        this.Z = Unzlib;
    }
    // init substream
    // overriden by AsyncDecompress
    Decompress.prototype.i = function () {
        var _this = this;
        this.s.ondata = function (dat, final) {
            _this.ondata(dat, final);
        };
    };
    /**
     * Pushes a chunk to be decompressed
     * @param chunk The chunk to push
     * @param final Whether this is the last chunk
     */
    Decompress.prototype.push = function (chunk, final) {
        if (!this.ondata)
            err(5);
        if (!this.s) {
            if (this.p && this.p.length) {
                var n = new u8(this.p.length + chunk.length);
                n.set(this.p), n.set(chunk, this.p.length);
            }
            else
                this.p = chunk;
            if (this.p.length > 2) {
                this.s = (this.p[0] == 31 && this.p[1] == 139 && this.p[2] == 8)
                    ? new this.G(this.o)
                    : ((this.p[0] & 15) != 8 || (this.p[0] >> 4) > 7 || ((this.p[0] << 8 | this.p[1]) % 31))
                        ? new this.I(this.o)
                        : new this.Z(this.o);
                this.i();
                this.s.push(this.p, final);
                this.p = null;
            }
        }
        else
            this.s.push(chunk, final);
    };
    return Decompress;
}());
/**
 * Asynchronous streaming GZIP, Zlib, or raw DEFLATE decompression
 */
var AsyncDecompress = /*#__PURE__*/ (function () {
    function AsyncDecompress(opts, cb) {
        Decompress.call(this, opts, cb);
        this.queuedSize = 0;
        this.G = AsyncGunzip;
        this.I = AsyncInflate;
        this.Z = AsyncUnzlib;
    }
    AsyncDecompress.prototype.i = function () {
        var _this = this;
        this.s.ondata = function (err, dat, final) {
            _this.ondata(err, dat, final);
        };
        this.s.ondrain = function (size) {
            _this.queuedSize -= size;
            if (_this.ondrain)
                _this.ondrain(size);
        };
    };
    /**
     * Pushes a chunk to be decompressed
     * @param chunk The chunk to push
     * @param final Whether this is the last chunk
     */
    AsyncDecompress.prototype.push = function (chunk, final) {
        this.queuedSize += chunk.length;
        Decompress.prototype.push.call(this, chunk, final);
    };
    return AsyncDecompress;
}());
function decompress(data, opts, cb) {
    if (!cb)
        cb = opts, opts = {};
    if (typeof cb != 'function')
        err(7);
    return (data[0] == 31 && data[1] == 139 && data[2] == 8)
        ? gunzip(data, opts, cb)
        : ((data[0] & 15) != 8 || (data[0] >> 4) > 7 || ((data[0] << 8 | data[1]) % 31))
            ? inflate(data, opts, cb)
            : unzlib(data, opts, cb);
}
/**
 * Expands compressed GZIP, Zlib, or raw DEFLATE data, automatically detecting the format
 * @param data The data to decompress
 * @param opts The decompression options
 * @returns The decompressed version of the data
 */
function decompressSync(data, opts) {
    return (data[0] == 31 && data[1] == 139 && data[2] == 8)
        ? gunzipSync(data, opts)
        : ((data[0] & 15) != 8 || (data[0] >> 4) > 7 || ((data[0] << 8 | data[1]) % 31))
            ? inflateSync(data, opts)
            : unzlibSync(data, opts);
}
// flatten a directory structure
var fltn = function (d, p, t, o) {
    for (var k in d) {
        var val = d[k], n = p + k, op = o;
        if (Array.isArray(val))
            op = mrg(o, val[1]), val = val[0];
        if (val instanceof u8)
            t[n] = [val, op];
        else {
            t[n += '/'] = [new u8(0), op];
            fltn(val, n, t, o);
        }
    }
};
// text encoder
var te = typeof TextEncoder != 'undefined' && /*#__PURE__*/ new TextEncoder();
// text decoder
var td = typeof TextDecoder != 'undefined' && /*#__PURE__*/ new TextDecoder();
// text decoder stream
var tds = 0;
try {
    td.decode(et, { stream: true });
    tds = 1;
}
catch (e) { }
// decode UTF8
var dutf8 = function (d) {
    for (var r = '', i = 0;;) {
        var c = d[i++];
        var eb = (c > 127) + (c > 223) + (c > 239);
        if (i + eb > d.length)
            return { s: r, r: slc(d, i - 1) };
        if (!eb)
            r += String.fromCharCode(c);
        else if (eb == 3) {
            c = ((c & 15) << 18 | (d[i++] & 63) << 12 | (d[i++] & 63) << 6 | (d[i++] & 63)) - 65536,
                r += String.fromCharCode(55296 | (c >> 10), 56320 | (c & 1023));
        }
        else if (eb & 1)
            r += String.fromCharCode((c & 31) << 6 | (d[i++] & 63));
        else
            r += String.fromCharCode((c & 15) << 12 | (d[i++] & 63) << 6 | (d[i++] & 63));
    }
};
/**
 * Streaming UTF-8 decoding
 */
var DecodeUTF8 = /*#__PURE__*/ (function () {
    /**
     * Creates a UTF-8 decoding stream
     * @param cb The callback to call whenever data is decoded
     */
    function DecodeUTF8(cb) {
        this.ondata = cb;
        if (tds)
            this.t = new TextDecoder();
        else
            this.p = et;
    }
    /**
     * Pushes a chunk to be decoded from UTF-8 binary
     * @param chunk The chunk to push
     * @param final Whether this is the last chunk
     */
    DecodeUTF8.prototype.push = function (chunk, final) {
        if (!this.ondata)
            err(5);
        final = !!final;
        if (this.t) {
            this.ondata(this.t.decode(chunk, { stream: true }), final);
            if (final) {
                if (this.t.decode().length)
                    err(8);
                this.t = null;
            }
            return;
        }
        if (!this.p)
            err(4);
        var dat = new u8(this.p.length + chunk.length);
        dat.set(this.p);
        dat.set(chunk, this.p.length);
        var _a = dutf8(dat), s = _a.s, r = _a.r;
        if (final) {
            if (r.length)
                err(8);
            this.p = null;
        }
        else
            this.p = r;
        this.ondata(s, final);
    };
    return DecodeUTF8;
}());
/**
 * Streaming UTF-8 encoding
 */
var EncodeUTF8 = /*#__PURE__*/ (function () {
    /**
     * Creates a UTF-8 decoding stream
     * @param cb The callback to call whenever data is encoded
     */
    function EncodeUTF8(cb) {
        this.ondata = cb;
    }
    /**
     * Pushes a chunk to be encoded to UTF-8
     * @param chunk The string data to push
     * @param final Whether this is the last chunk
     */
    EncodeUTF8.prototype.push = function (chunk, final) {
        if (!this.ondata)
            err(5);
        if (this.d)
            err(4);
        this.ondata(strToU8(chunk), this.d = final || false);
    };
    return EncodeUTF8;
}());
/**
 * Converts a string into a Uint8Array for use with compression/decompression methods
 * @param str The string to encode
 * @param latin1 Whether or not to interpret the data as Latin-1. This should
 *               not need to be true unless decoding a binary string.
 * @returns The string encoded in UTF-8/Latin-1 binary
 */
function strToU8(str, latin1) {
    if (latin1) {
        var ar_1 = new u8(str.length);
        for (var i = 0; i < str.length; ++i)
            ar_1[i] = str.charCodeAt(i);
        return ar_1;
    }
    if (te)
        return te.encode(str);
    var l = str.length;
    var ar = new u8(str.length + (str.length >> 1));
    var ai = 0;
    var w = function (v) { ar[ai++] = v; };
    for (var i = 0; i < l; ++i) {
        if (ai + 5 > ar.length) {
            var n = new u8(ai + 8 + ((l - i) << 1));
            n.set(ar);
            ar = n;
        }
        var c = str.charCodeAt(i);
        if (c < 128 || latin1)
            w(c);
        else if (c < 2048)
            w(192 | (c >> 6)), w(128 | (c & 63));
        else if (c > 55295 && c < 57344)
            c = 65536 + (c & 1023 << 10) | (str.charCodeAt(++i) & 1023),
                w(240 | (c >> 18)), w(128 | ((c >> 12) & 63)), w(128 | ((c >> 6) & 63)), w(128 | (c & 63));
        else
            w(224 | (c >> 12)), w(128 | ((c >> 6) & 63)), w(128 | (c & 63));
    }
    return slc(ar, 0, ai);
}
/**
 * Converts a Uint8Array to a string
 * @param dat The data to decode to string
 * @param latin1 Whether or not to interpret the data as Latin-1. This should
 *               not need to be true unless encoding to binary string.
 * @returns The original UTF-8/Latin-1 string
 */
function strFromU8(dat, latin1) {
    if (latin1) {
        var r = '';
        for (var i = 0; i < dat.length; i += 16384)
            r += String.fromCharCode.apply(null, dat.subarray(i, i + 16384));
        return r;
    }
    else if (td) {
        return td.decode(dat);
    }
    else {
        var _a = dutf8(dat), s = _a.s, r = _a.r;
        if (r.length)
            err(8);
        return s;
    }
}
// deflate bit flag
var dbf = function (l) { return l == 1 ? 3 : l < 6 ? 2 : l == 9 ? 1 : 0; };
// skip local zip header
var slzh = function (d, b) { return b + 30 + b2(d, b + 26) + b2(d, b + 28); };
// read zip header
var zh = function (d, b, z) {
    var fnl = b2(d, b + 28), fn = strFromU8(d.subarray(b + 46, b + 46 + fnl), !(b2(d, b + 8) & 2048)), es = b + 46 + fnl, bs = b4(d, b + 20);
    var _a = z && bs == 4294967295 ? z64e(d, es) : [bs, b4(d, b + 24), b4(d, b + 42)], sc = _a[0], su = _a[1], off = _a[2];
    return [b2(d, b + 10), sc, su, fn, es + b2(d, b + 30) + b2(d, b + 32), off];
};
// read zip64 extra field
var z64e = function (d, b) {
    for (; b2(d, b) != 1; b += 4 + b2(d, b + 2))
        ;
    return [b8(d, b + 12), b8(d, b + 4), b8(d, b + 20)];
};
// extra field length
var exfl = function (ex) {
    var le = 0;
    if (ex) {
        for (var k in ex) {
            var l = ex[k].length;
            if (l > 65535)
                err(9);
            le += l + 4;
        }
    }
    return le;
};
// write zip header
var wzh = function (d, b, f, fn, u, c, ce, co) {
    var fl = fn.length, ex = f.extra, col = co && co.length;
    var exl = exfl(ex);
    wbytes(d, b, ce != null ? 0x2014B50 : 0x4034B50), b += 4;
    if (ce != null)
        d[b++] = 20, d[b++] = f.os;
    d[b] = 20, b += 2; // spec compliance? what's that?
    d[b++] = (f.flag << 1) | (c < 0 && 8), d[b++] = u && 8;
    d[b++] = f.compression & 255, d[b++] = f.compression >> 8;
    var dt = new Date(f.mtime == null ? Date.now() : f.mtime), y = dt.getFullYear() - 1980;
    if (y < 0 || y > 119)
        err(10);
    wbytes(d, b, (y << 25) | ((dt.getMonth() + 1) << 21) | (dt.getDate() << 16) | (dt.getHours() << 11) | (dt.getMinutes() << 5) | (dt.getSeconds() >> 1)), b += 4;
    if (c != -1) {
        wbytes(d, b, f.crc);
        wbytes(d, b + 4, c < 0 ? -c - 2 : c);
        wbytes(d, b + 8, f.size);
    }
    wbytes(d, b + 12, fl);
    wbytes(d, b + 14, exl), b += 16;
    if (ce != null) {
        wbytes(d, b, col);
        wbytes(d, b + 6, f.attrs);
        wbytes(d, b + 10, ce), b += 14;
    }
    d.set(fn, b);
    b += fl;
    if (exl) {
        for (var k in ex) {
            var exf = ex[k], l = exf.length;
            wbytes(d, b, +k);
            wbytes(d, b + 2, l);
            d.set(exf, b + 4), b += 4 + l;
        }
    }
    if (col)
        d.set(co, b), b += col;
    return b;
};
// write zip footer (end of central directory)
var wzf = function (o, b, c, d, e) {
    wbytes(o, b, 0x6054B50); // skip disk
    wbytes(o, b + 8, c);
    wbytes(o, b + 10, c);
    wbytes(o, b + 12, d);
    wbytes(o, b + 16, e);
};
/**
 * A pass-through stream to keep data uncompressed in a ZIP archive.
 */
var ZipPassThrough = /*#__PURE__*/ (function () {
    /**
     * Creates a pass-through stream that can be added to ZIP archives
     * @param filename The filename to associate with this data stream
     */
    function ZipPassThrough(filename) {
        this.filename = filename;
        this.c = crc();
        this.size = 0;
        this.compression = 0;
    }
    /**
     * Processes a chunk and pushes to the output stream. You can override this
     * method in a subclass for custom behavior, but by default this passes
     * the data through. You must call this.ondata(err, chunk, final) at some
     * point in this method.
     * @param chunk The chunk to process
     * @param final Whether this is the last chunk
     */
    ZipPassThrough.prototype.process = function (chunk, final) {
        this.ondata(null, chunk, final);
    };
    /**
     * Pushes a chunk to be added. If you are subclassing this with a custom
     * compression algorithm, note that you must push data from the source
     * file only, pre-compression.
     * @param chunk The chunk to push
     * @param final Whether this is the last chunk
     */
    ZipPassThrough.prototype.push = function (chunk, final) {
        if (!this.ondata)
            err(5);
        this.c.p(chunk);
        this.size += chunk.length;
        if (final)
            this.crc = this.c.d();
        this.process(chunk, final || false);
    };
    return ZipPassThrough;
}());
// I don't extend because TypeScript extension adds 1kB of runtime bloat
/**
 * Streaming DEFLATE compression for ZIP archives. Prefer using AsyncZipDeflate
 * for better performance
 */
var ZipDeflate = /*#__PURE__*/ (function () {
    /**
     * Creates a DEFLATE stream that can be added to ZIP archives
     * @param filename The filename to associate with this data stream
     * @param opts The compression options
     */
    function ZipDeflate(filename, opts) {
        var _this = this;
        if (!opts)
            opts = {};
        ZipPassThrough.call(this, filename);
        this.d = new Deflate(opts, function (dat, final) {
            _this.ondata(null, dat, final);
        });
        this.compression = 8;
        this.flag = dbf(opts.level);
    }
    ZipDeflate.prototype.process = function (chunk, final) {
        try {
            this.d.push(chunk, final);
        }
        catch (e) {
            this.ondata(e, null, final);
        }
    };
    /**
     * Pushes a chunk to be deflated
     * @param chunk The chunk to push
     * @param final Whether this is the last chunk
     */
    ZipDeflate.prototype.push = function (chunk, final) {
        ZipPassThrough.prototype.push.call(this, chunk, final);
    };
    return ZipDeflate;
}());
/**
 * Asynchronous streaming DEFLATE compression for ZIP archives
 */
var AsyncZipDeflate = /*#__PURE__*/ (function () {
    /**
     * Creates an asynchronous DEFLATE stream that can be added to ZIP archives
     * @param filename The filename to associate with this data stream
     * @param opts The compression options
     */
    function AsyncZipDeflate(filename, opts) {
        var _this = this;
        if (!opts)
            opts = {};
        ZipPassThrough.call(this, filename);
        this.d = new AsyncDeflate(opts, function (err, dat, final) {
            _this.ondata(err, dat, final);
        });
        this.compression = 8;
        this.flag = dbf(opts.level);
        this.terminate = this.d.terminate;
    }
    AsyncZipDeflate.prototype.process = function (chunk, final) {
        this.d.push(chunk, final);
    };
    /**
     * Pushes a chunk to be deflated
     * @param chunk The chunk to push
     * @param final Whether this is the last chunk
     */
    AsyncZipDeflate.prototype.push = function (chunk, final) {
        ZipPassThrough.prototype.push.call(this, chunk, final);
    };
    return AsyncZipDeflate;
}());
// TODO: Better tree shaking
/**
 * A zippable archive to which files can incrementally be added
 */
var Zip = /*#__PURE__*/ (function () {
    /**
     * Creates an empty ZIP archive to which files can be added
     * @param cb The callback to call whenever data for the generated ZIP archive
     *           is available
     */
    function Zip(cb) {
        this.ondata = cb;
        this.u = [];
        this.d = 1;
    }
    /**
     * Adds a file to the ZIP archive
     * @param file The file stream to add
     */
    Zip.prototype.add = function (file) {
        var _this = this;
        if (!this.ondata)
            err(5);
        // finishing or finished
        if (this.d & 2)
            this.ondata(err(4 + (this.d & 1) * 8, 0, 1), null, false);
        else {
            var f = strToU8(file.filename), fl_1 = f.length;
            var com = file.comment, o = com && strToU8(com);
            var u = fl_1 != file.filename.length || (o && (com.length != o.length));
            var hl_1 = fl_1 + exfl(file.extra) + 30;
            if (fl_1 > 65535)
                this.ondata(err(11, 0, 1), null, false);
            var header = new u8(hl_1);
            wzh(header, 0, file, f, u, -1);
            var chks_1 = [header];
            var pAll_1 = function () {
                for (var _i = 0, chks_2 = chks_1; _i < chks_2.length; _i++) {
                    var chk = chks_2[_i];
                    _this.ondata(null, chk, false);
                }
                chks_1 = [];
            };
            var tr_1 = this.d;
            this.d = 0;
            var ind_1 = this.u.length;
            var uf_1 = mrg(file, {
                f: f,
                u: u,
                o: o,
                t: function () {
                    if (file.terminate)
                        file.terminate();
                },
                r: function () {
                    pAll_1();
                    if (tr_1) {
                        var nxt = _this.u[ind_1 + 1];
                        if (nxt)
                            nxt.r();
                        else
                            _this.d = 1;
                    }
                    tr_1 = 1;
                }
            });
            var cl_1 = 0;
            file.ondata = function (err, dat, final) {
                if (err) {
                    _this.ondata(err, dat, final);
                    _this.terminate();
                }
                else {
                    cl_1 += dat.length;
                    chks_1.push(dat);
                    if (final) {
                        var dd = new u8(16);
                        wbytes(dd, 0, 0x8074B50);
                        wbytes(dd, 4, file.crc);
                        wbytes(dd, 8, cl_1);
                        wbytes(dd, 12, file.size);
                        chks_1.push(dd);
                        uf_1.c = cl_1, uf_1.b = hl_1 + cl_1 + 16, uf_1.crc = file.crc, uf_1.size = file.size;
                        if (tr_1)
                            uf_1.r();
                        tr_1 = 1;
                    }
                    else if (tr_1)
                        pAll_1();
                }
            };
            this.u.push(uf_1);
        }
    };
    /**
     * Ends the process of adding files and prepares to emit the final chunks.
     * This *must* be called after adding all desired files for the resulting
     * ZIP file to work properly.
     */
    Zip.prototype.end = function () {
        var _this = this;
        if (this.d & 2) {
            this.ondata(err(4 + (this.d & 1) * 8, 0, 1), null, true);
            return;
        }
        if (this.d)
            this.e();
        else
            this.u.push({
                r: function () {
                    if (!(_this.d & 1))
                        return;
                    _this.u.splice(-1, 1);
                    _this.e();
                },
                t: function () { }
            });
        this.d = 3;
    };
    Zip.prototype.e = function () {
        var bt = 0, l = 0, tl = 0;
        for (var _i = 0, _a = this.u; _i < _a.length; _i++) {
            var f = _a[_i];
            tl += 46 + f.f.length + exfl(f.extra) + (f.o ? f.o.length : 0);
        }
        var out = new u8(tl + 22);
        for (var _b = 0, _c = this.u; _b < _c.length; _b++) {
            var f = _c[_b];
            wzh(out, bt, f, f.f, f.u, -f.c - 2, l, f.o);
            bt += 46 + f.f.length + exfl(f.extra) + (f.o ? f.o.length : 0), l += f.b;
        }
        wzf(out, bt, this.u.length, tl, l);
        this.ondata(null, out, true);
        this.d = 2;
    };
    /**
     * A method to terminate any internal workers used by the stream. Subsequent
     * calls to add() will fail.
     */
    Zip.prototype.terminate = function () {
        for (var _i = 0, _a = this.u; _i < _a.length; _i++) {
            var f = _a[_i];
            f.t();
        }
        this.d = 2;
    };
    return Zip;
}());
function zip(data, opts, cb) {
    if (!cb)
        cb = opts, opts = {};
    if (typeof cb != 'function')
        err(7);
    var r = {};
    fltn(data, '', r, opts);
    var k = Object.keys(r);
    var lft = k.length, o = 0, tot = 0;
    var slft = lft, files = new Array(lft);
    var term = [];
    var tAll = function () {
        for (var i = 0; i < term.length; ++i)
            term[i]();
    };
    var cbd = function (a, b) {
        mt(function () { cb(a, b); });
    };
    mt(function () { cbd = cb; });
    var cbf = function () {
        var out = new u8(tot + 22), oe = o, cdl = tot - o;
        tot = 0;
        for (var i = 0; i < slft; ++i) {
            var f = files[i];
            try {
                var l = f.c.length;
                wzh(out, tot, f, f.f, f.u, l);
                var badd = 30 + f.f.length + exfl(f.extra);
                var loc = tot + badd;
                out.set(f.c, loc);
                wzh(out, o, f, f.f, f.u, l, tot, f.m), o += 16 + badd + (f.m ? f.m.length : 0), tot = loc + l;
            }
            catch (e) {
                return cbd(e, null);
            }
        }
        wzf(out, o, files.length, cdl, oe);
        cbd(null, out);
    };
    if (!lft)
        cbf();
    var _loop_1 = function (i) {
        var fn = k[i];
        var _a = r[fn], file = _a[0], p = _a[1];
        var c = crc(), size = file.length;
        c.p(file);
        var f = strToU8(fn), s = f.length;
        var com = p.comment, m = com && strToU8(com), ms = m && m.length;
        var exl = exfl(p.extra);
        var compression = p.level == 0 ? 0 : 8;
        var cbl = function (e, d) {
            if (e) {
                tAll();
                cbd(e, null);
            }
            else {
                var l = d.length;
                files[i] = mrg(p, {
                    size: size,
                    crc: c.d(),
                    c: d,
                    f: f,
                    m: m,
                    u: s != fn.length || (m && (com.length != ms)),
                    compression: compression
                });
                o += 30 + s + exl + l;
                tot += 76 + 2 * (s + exl) + (ms || 0) + l;
                if (!--lft)
                    cbf();
            }
        };
        if (s > 65535)
            cbl(err(11, 0, 1), null);
        if (!compression)
            cbl(null, file);
        else if (size < 160000) {
            try {
                cbl(null, deflateSync(file, p));
            }
            catch (e) {
                cbl(e, null);
            }
        }
        else
            term.push(deflate(file, p, cbl));
    };
    // Cannot use lft because it can decrease
    for (var i = 0; i < slft; ++i) {
        _loop_1(i);
    }
    return tAll;
}
/**
 * Synchronously creates a ZIP file. Prefer using `zip` for better performance
 * with more than one file.
 * @param data The directory structure for the ZIP archive
 * @param opts The main options, merged with per-file options
 * @returns The generated ZIP archive
 */
function zipSync(data, opts) {
    if (!opts)
        opts = {};
    var r = {};
    var files = [];
    fltn(data, '', r, opts);
    var o = 0;
    var tot = 0;
    for (var fn in r) {
        var _a = r[fn], file = _a[0], p = _a[1];
        var compression = p.level == 0 ? 0 : 8;
        var f = strToU8(fn), s = f.length;
        var com = p.comment, m = com && strToU8(com), ms = m && m.length;
        var exl = exfl(p.extra);
        if (s > 65535)
            err(11);
        var d = compression ? deflateSync(file, p) : file, l = d.length;
        var c = crc();
        c.p(file);
        files.push(mrg(p, {
            size: file.length,
            crc: c.d(),
            c: d,
            f: f,
            m: m,
            u: s != fn.length || (m && (com.length != ms)),
            o: o,
            compression: compression
        }));
        o += 30 + s + exl + l;
        tot += 76 + 2 * (s + exl) + (ms || 0) + l;
    }
    var out = new u8(tot + 22), oe = o, cdl = tot - o;
    for (var i = 0; i < files.length; ++i) {
        var f = files[i];
        wzh(out, f.o, f, f.f, f.u, f.c.length);
        var badd = 30 + f.f.length + exfl(f.extra);
        out.set(f.c, f.o + badd);
        wzh(out, o, f, f.f, f.u, f.c.length, f.o, f.m), o += 16 + badd + (f.m ? f.m.length : 0);
    }
    wzf(out, o, files.length, cdl, oe);
    return out;
}
/**
 * Streaming pass-through decompression for ZIP archives
 */
var UnzipPassThrough = /*#__PURE__*/ (function () {
    function UnzipPassThrough() {
    }
    UnzipPassThrough.prototype.push = function (data, final) {
        this.ondata(null, data, final);
    };
    UnzipPassThrough.compression = 0;
    return UnzipPassThrough;
}());
/**
 * Streaming DEFLATE decompression for ZIP archives. Prefer AsyncZipInflate for
 * better performance.
 */
var UnzipInflate = /*#__PURE__*/ (function () {
    /**
     * Creates a DEFLATE decompression that can be used in ZIP archives
     */
    function UnzipInflate() {
        var _this = this;
        this.i = new Inflate(function (dat, final) {
            _this.ondata(null, dat, final);
        });
    }
    UnzipInflate.prototype.push = function (data, final) {
        try {
            this.i.push(data, final);
        }
        catch (e) {
            this.ondata(e, null, final);
        }
    };
    UnzipInflate.compression = 8;
    return UnzipInflate;
}());
/**
 * Asynchronous streaming DEFLATE decompression for ZIP archives
 */
var AsyncUnzipInflate = /*#__PURE__*/ (function () {
    /**
     * Creates a DEFLATE decompression that can be used in ZIP archives
     */
    function AsyncUnzipInflate(_, sz) {
        var _this = this;
        if (sz < 320000) {
            this.i = new Inflate(function (dat, final) {
                _this.ondata(null, dat, final);
            });
        }
        else {
            this.i = new AsyncInflate(function (err, dat, final) {
                _this.ondata(err, dat, final);
            });
            this.terminate = this.i.terminate;
        }
    }
    AsyncUnzipInflate.prototype.push = function (data, final) {
        if (this.i.terminate)
            data = slc(data, 0);
        this.i.push(data, final);
    };
    AsyncUnzipInflate.compression = 8;
    return AsyncUnzipInflate;
}());
/**
 * A ZIP archive decompression stream that emits files as they are discovered
 */
var Unzip = /*#__PURE__*/ (function () {
    /**
     * Creates a ZIP decompression stream
     * @param cb The callback to call whenever a file in the ZIP archive is found
     */
    function Unzip(cb) {
        this.onfile = cb;
        this.k = [];
        this.o = {
            0: UnzipPassThrough
        };
        this.p = et;
    }
    /**
     * Pushes a chunk to be unzipped
     * @param chunk The chunk to push
     * @param final Whether this is the last chunk
     */
    Unzip.prototype.push = function (chunk, final) {
        var _this = this;
        if (!this.onfile)
            err(5);
        if (!this.p)
            err(4);
        if (this.c > 0) {
            var len = Math.min(this.c, chunk.length);
            var toAdd = chunk.subarray(0, len);
            this.c -= len;
            if (this.d)
                this.d.push(toAdd, !this.c);
            else
                this.k[0].push(toAdd);
            chunk = chunk.subarray(len);
            if (chunk.length)
                return this.push(chunk, final);
        }
        else {
            var f = 0, i = 0, is = void 0, buf = void 0;
            if (!this.p.length)
                buf = chunk;
            else if (!chunk.length)
                buf = this.p;
            else {
                buf = new u8(this.p.length + chunk.length);
                buf.set(this.p), buf.set(chunk, this.p.length);
            }
            var l = buf.length, oc = this.c, add = oc && this.d;
            var _loop_2 = function () {
                var _a;
                var sig = b4(buf, i);
                if (sig == 0x4034B50) {
                    f = 1, is = i;
                    this_1.d = null;
                    this_1.c = 0;
                    var bf = b2(buf, i + 6), cmp_1 = b2(buf, i + 8), u = bf & 2048, dd = bf & 8, fnl = b2(buf, i + 26), es = b2(buf, i + 28);
                    if (l > i + 30 + fnl + es) {
                        var chks_3 = [];
                        this_1.k.unshift(chks_3);
                        f = 2;
                        var sc_1 = b4(buf, i + 18), su_1 = b4(buf, i + 22);
                        var fn_1 = strFromU8(buf.subarray(i + 30, i += 30 + fnl), !u);
                        if (sc_1 == 4294967295) {
                            _a = dd ? [-2] : z64e(buf, i), sc_1 = _a[0], su_1 = _a[1];
                        }
                        else if (dd)
                            sc_1 = -1;
                        i += es;
                        this_1.c = sc_1;
                        var d_1;
                        var file_1 = {
                            name: fn_1,
                            compression: cmp_1,
                            start: function () {
                                if (!file_1.ondata)
                                    err(5);
                                if (!sc_1)
                                    file_1.ondata(null, et, true);
                                else {
                                    var ctr = _this.o[cmp_1];
                                    if (!ctr)
                                        file_1.ondata(err(14, 'unknown compression type ' + cmp_1, 1), null, false);
                                    d_1 = sc_1 < 0 ? new ctr(fn_1) : new ctr(fn_1, sc_1, su_1);
                                    d_1.ondata = function (err, dat, final) { file_1.ondata(err, dat, final); };
                                    for (var _i = 0, chks_4 = chks_3; _i < chks_4.length; _i++) {
                                        var dat = chks_4[_i];
                                        d_1.push(dat, false);
                                    }
                                    if (_this.k[0] == chks_3 && _this.c)
                                        _this.d = d_1;
                                    else
                                        d_1.push(et, true);
                                }
                            },
                            terminate: function () {
                                if (d_1 && d_1.terminate)
                                    d_1.terminate();
                            }
                        };
                        if (sc_1 >= 0)
                            file_1.size = sc_1, file_1.originalSize = su_1;
                        this_1.onfile(file_1);
                    }
                    return "break";
                }
                else if (oc) {
                    if (sig == 0x8074B50) {
                        is = i += 12 + (oc == -2 && 8), f = 3, this_1.c = 0;
                        return "break";
                    }
                    else if (sig == 0x2014B50) {
                        is = i -= 4, f = 3, this_1.c = 0;
                        return "break";
                    }
                }
            };
            var this_1 = this;
            for (; i < l - 4; ++i) {
                var state_1 = _loop_2();
                if (state_1 === "break")
                    break;
            }
            this.p = et;
            if (oc < 0) {
                var dat = f ? buf.subarray(0, is - 12 - (oc == -2 && 8) - (b4(buf, is - 16) == 0x8074B50 && 4)) : buf.subarray(0, i);
                if (add)
                    add.push(dat, !!f);
                else
                    this.k[+(f == 2)].push(dat);
            }
            if (f & 2)
                return this.push(buf.subarray(i), final);
            this.p = buf.subarray(i);
        }
        if (final) {
            if (this.c)
                err(13);
            this.p = null;
        }
    };
    /**
     * Registers a decoder with the stream, allowing for files compressed with
     * the compression type provided to be expanded correctly
     * @param decoder The decoder constructor
     */
    Unzip.prototype.register = function (decoder) {
        this.o[decoder.compression] = decoder;
    };
    return Unzip;
}());
var mt = typeof queueMicrotask == 'function' ? queueMicrotask : typeof setTimeout == 'function' ? setTimeout : function (fn) { fn(); };
function unzip(data, opts, cb) {
    if (!cb)
        cb = opts, opts = {};
    if (typeof cb != 'function')
        err(7);
    var term = [];
    var tAll = function () {
        for (var i = 0; i < term.length; ++i)
            term[i]();
    };
    var files = {};
    var cbd = function (a, b) {
        mt(function () { cb(a, b); });
    };
    mt(function () { cbd = cb; });
    var e = data.length - 22;
    for (; b4(data, e) != 0x6054B50; --e) {
        if (!e || data.length - e > 65558) {
            cbd(err(13, 0, 1), null);
            return tAll;
        }
    }
    var lft = b2(data, e + 8);
    if (lft) {
        var c = lft;
        var o = b4(data, e + 16);
        var z = o == 4294967295 || c == 65535;
        if (z) {
            var ze = b4(data, e - 12);
            z = b4(data, ze) == 0x6064B50;
            if (z) {
                c = lft = b4(data, ze + 32);
                o = b4(data, ze + 48);
            }
        }
        var fltr = opts && opts.filter;
        var _loop_3 = function (i) {
            var _a = zh(data, o, z), c_1 = _a[0], sc = _a[1], su = _a[2], fn = _a[3], no = _a[4], off = _a[5], b = slzh(data, off);
            o = no;
            var cbl = function (e, d) {
                if (e) {
                    tAll();
                    cbd(e, null);
                }
                else {
                    if (d)
                        files[fn] = d;
                    if (!--lft)
                        cbd(null, files);
                }
            };
            if (!fltr || fltr({
                name: fn,
                size: sc,
                originalSize: su,
                compression: c_1
            })) {
                if (!c_1)
                    cbl(null, slc(data, b, b + sc));
                else if (c_1 == 8) {
                    var infl = data.subarray(b, b + sc);
                    // Synchronously decompress under 512KB, or barely-compressed data
                    if (su < 524288 || sc > 0.8 * su) {
                        try {
                            cbl(null, inflateSync(infl, { out: new u8(su) }));
                        }
                        catch (e) {
                            cbl(e, null);
                        }
                    }
                    else
                        term.push(inflate(infl, { size: su }, cbl));
                }
                else
                    cbl(err(14, 'unknown compression type ' + c_1, 1), null);
            }
            else
                cbl(null, null);
        };
        for (var i = 0; i < c; ++i) {
            _loop_3(i);
        }
    }
    else
        cbd(null, {});
    return tAll;
}
/**
 * Synchronously decompresses a ZIP archive. Prefer using `unzip` for better
 * performance with more than one file.
 * @param data The raw compressed ZIP file
 * @param opts The ZIP extraction options
 * @returns The decompressed files
 */
function unzipSync(data, opts) {
    var files = {};
    var e = data.length - 22;
    for (; b4(data, e) != 0x6054B50; --e) {
        if (!e || data.length - e > 65558)
            err(13);
    }
    var c = b2(data, e + 8);
    if (!c)
        return {};
    var o = b4(data, e + 16);
    var z = o == 4294967295 || c == 65535;
    if (z) {
        var ze = b4(data, e - 12);
        z = b4(data, ze) == 0x6064B50;
        if (z) {
            c = b4(data, ze + 32);
            o = b4(data, ze + 48);
        }
    }
    var fltr = opts && opts.filter;
    for (var i = 0; i < c; ++i) {
        var _a = zh(data, o, z), c_2 = _a[0], sc = _a[1], su = _a[2], fn = _a[3], no = _a[4], off = _a[5], b = slzh(data, off);
        o = no;
        if (!fltr || fltr({
            name: fn,
            size: sc,
            originalSize: su,
            compression: c_2
        })) {
            if (!c_2)
                files[fn] = slc(data, b, b + sc);
            else if (c_2 == 8)
                files[fn] = inflateSync(data.subarray(b, b + sc), { out: new u8(su) });
            else
                err(14, 'unknown compression type ' + c_2);
        }
    }
    return files;
}

const browser = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
	__proto__: null,
	AsyncCompress: AsyncGzip,
	AsyncDecompress,
	AsyncDeflate,
	AsyncGunzip,
	AsyncGzip,
	AsyncInflate,
	AsyncUnzipInflate,
	AsyncUnzlib,
	AsyncZipDeflate,
	AsyncZlib,
	Compress: Gzip,
	DecodeUTF8,
	Decompress,
	Deflate,
	EncodeUTF8,
	FlateErrorCode,
	Gunzip,
	Gzip,
	Inflate,
	Unzip,
	UnzipInflate,
	UnzipPassThrough,
	Unzlib,
	Zip,
	ZipDeflate,
	ZipPassThrough,
	Zlib,
	compress: gzip,
	compressSync: gzipSync,
	decompress,
	decompressSync,
	deflate,
	deflateSync,
	gunzip,
	gunzipSync,
	gzip,
	gzipSync,
	inflate,
	inflateSync,
	strFromU8,
	strToU8,
	unzip,
	unzipSync,
	unzlib,
	unzlibSync,
	zip,
	zipSync,
	zlib,
	zlibSync
}, Symbol.toStringTag, { value: 'Module' }));
//# sourceMappingURL=mylist2.es.js.map
