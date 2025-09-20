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
  settings: "settings",
  clear: "clear_all",
  comment: "comment",
  play: "play_arrow",
  pause: "pause",
  volume_up: "volume_up",
  volume_off: "volume_off",
  fullscreen: "fullscreen",
  fullscreen_exit: "fullscreen_exit",
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

const STANDALONE_PAGE_STYLES = [
  "body.nc-standalone-body { margin: 0; padding: 0; background: #0b0d14; color: #f4f6ff; font-family: 'Segoe UI', 'Helvetica Neue', 'Hiragino Kaku Gothic ProN', Meiryo, sans-serif; min-height: 100vh; }",
  "a { color: #7aa2ff; text-decoration: none; }",
  "a:hover { text-decoration: underline; }",
  ".nc-standalone-page { max-width: 90vw; margin: 0 auto; padding: 32px 20px 64px; box-sizing: border-box; display: flex; flex-direction: column; gap: 28px; }",
  ".nc-header { display: flex; flex-direction: column; gap: 12px; }",
  ".nc-header__breadcrumbs { font-size: 13px; color: #8a94ad; display: flex; align-items: center; gap: 8px; }",
  ".nc-header__breadcrumbs a { color: inherit; }",
  ".nc-header__title { font-size: 28px; font-weight: 600; line-height: 1.4; }",
  ".nc-header__meta { display: flex; flex-wrap: wrap; gap: 16px; font-size: 12px; color: #9ca6c3; }",
  ".nc-main { display: flex; flex-direction: column; gap: 28px; }",
  ".nc-player-surface { background: rgba(14, 16, 25, 0.9); border-radius: 18px; padding: 20px; box-shadow: 0 28px 60px rgba(0, 0, 0, 0.35); box-sizing: border-box; }",
  ".video-with-comments { display: grid; grid-template-columns: minmax(0, 2fr) minmax(0, 1fr); gap: 16px; }",
  ".video-with-comments .comment-container { background: rgba(23, 26, 38, 0.92); border-radius: 12px; padding: 12px; box-shadow: inset 0 0 0 1px rgba(127, 158, 255, 0.16); }",
  ".nc-info-card { background: rgba(20, 24, 36, 0.88); border-radius: 16px; padding: 20px; box-shadow: inset 0 0 0 1px rgba(112, 138, 210, 0.22); display: flex; flex-direction: column; gap: 22px; }",
  ".nc-stat-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 12px; }",
  ".nc-stat-item { background: rgba(34, 40, 64, 0.82); border-radius: 12px; padding: 14px 16px; display: flex; flex-direction: column; gap: 6px; box-shadow: inset 0 0 0 1px rgba(142, 170, 255, 0.18); }",
  ".nc-stat-item__label { font-size: 12px; color: #8e98b8; letter-spacing: 0.02em; }",
  ".nc-stat-item__value { font-size: 18px; font-weight: 600; }",
  ".nc-tag-cloud { display: flex; flex-wrap: wrap; gap: 8px; }",
  ".nc-tag { border-radius: 999px; background: rgba(102, 136, 220, 0.24); color: #d8e2ff; padding: 6px 14px; font-size: 12px; }",
  ".nc-description { background: rgba(14, 16, 25, 0.9); border-radius: 16px; padding: 22px; white-space: pre-wrap; line-height: 1.6; font-size: 14px; color: #c9d5f3; box-shadow: inset 0 0 0 1px rgba(112, 138, 210, 0.22); }",
  ".nc-owner { display: flex; gap: 12px; align-items: center; }",
  ".nc-owner img { width: 48px; height: 48px; border-radius: 50%; object-fit: cover; box-shadow: 0 0 0 2px rgba(130, 170, 255, 0.3); }",
  ".nc-owner__info { display: flex; flex-direction: column; gap: 2px; }",
  ".nc-owner__link { font-size: 12px; color: #8ab2ff; }",
  ".nc-series { display: flex; flex-direction: column; gap: 8px; }",
  ".nc-series__item { padding: 10px 14px; border-radius: 12px; background: rgba(32, 38, 60, 0.72); display: flex; flex-direction: column; gap: 4px; }",
  ".nc-section-title { font-size: 16px; font-weight: 600; color: #d9e2ff; }",
  ".nc-empty { color: #7d86a8; font-size: 13px; }",
  "@media (max-width: 1024px) { .nc-main { gap: 20px; } .video-with-comments { grid-template-columns: 1fr; } }"
].join("\n");

const URLS = {
  BASE: "https://www.nicovideo.jp"
};
const TOAST_CONFIG = {
  MODES: {
    INFO: "info",
    SUCCESS: "success",
    WARNING: "warning",
    ERROR: "error"
  },
  TIMEOUTS: {
    PLAYABLE_MS: 25e3,
    // 25秒
    WARN_MS: 15e3,
    // 15秒
    START_MS: 5e3,
    // 5秒
    ERROR_MS: 45e3
    // 45秒
  }
};
const PLAYER_SETTINGS = {
  CONTROLS_MODE: {
    ALWAYS: "always",
    HOVER: "hover"
  },
  VOLUME: {
    DEFAULT: 0.3,
    MIN: 0,
    MAX: 1
  },
  COMMENT: {
    OPACITY: {
      DEFAULT: 0.75,
      MIN: 0.1,
      MAX: 1,
      STEP: 0.05
    },
    COLORS: {
      WHITE: "#FFFFFF",
      RED: "#FF0000",
      BLUE: "#0000FF",
      GREEN: "#00FF00",
      YELLOW: "#FFFF00",
      CYAN: "#00FFFF",
      MAGENTA: "#FF00FF",
      ORANGE: "#FFA500",
      PURPLE: "#800080"
    },
    NG: {
      MAX_WORDS: 50,
      MAX_REGEX: 10
    }
  }
};
const CACHE_MANAGEMENT = {
  TIME_THRESHOLD_MS: 9 * 60 * 1e3,
  // 9分（ミリ秒単位）
  CACHE_SIZE_THRESHOLD_BYTES: 18 * 1024 * 1024,
  // 18MB
  CHECK_INTERVAL_MS: 30 * 1e3,
  // 30秒ごとにチェック
  CLEANUP_BUFFER_SECONDS: 5
  // クリーンアップ時に保持する秒数
};
const COMMENT_RENDERER_CONFIG = {
  OPACITY: 0.75,
  // コメントの不透明度
  COMMENT_DURATION_MS: 6e3,
  // コメントの表示時間（ミリ秒）
  DEFAULT_FONT_SIZE: 32,
  // デフォルトフォントサイズ
  MIN_FONT_SIZE: 16,
  // 最小フォントサイズ
  DEFAULT_COLOR: "#FFFFFF",
  // デフォルト色
  MAX_COMMENT_LENGTH: 75,
  // コメント最大文字数（切り捨て用）
  STROKE_WIDTH: 4,
  // 縁取り幅
  STROKE_COLOR: "#000000",
  // 縁取り色
  VPOS_THRESHOLD_MS: 100,
  // 近傍とみなすミリ秒差
  MAX_LANES_LIMIT: 100,
  // レーン数の上限
  RENDER_FPS: 60,
  // レンダリングフレームレート
  CLEANUP_INTERVAL_MS: 5e3,
  // クリーンアップ間隔
  VIRTUAL_EXTEND_RATIO: 0.5
  // 仮想拡張キャンバスの比率（実キャンバス幅の50%）
};

const applyStyles = (styles) => {
  const styleElement = document.createElement("style");
  styleElement.textContent = styles;
  document.head.appendChild(styleElement);
  return styleElement;
};

const createBreadcrumbs = () => {
  const nav = document.createElement("nav");
  nav.className = "nc-header__breadcrumbs";
  const rootLink = document.createElement("a");
  rootLink.href = "/";
  rootLink.textContent = "NicoCache";
  const divider1 = document.createElement("span");
  divider1.textContent = "›";
  const featureLink = document.createElement("a");
  featureLink.href = "/local/features/dist/src/video-player/standalone/index.html";
  featureLink.textContent = "Video Player";
  const divider2 = document.createElement("span");
  divider2.textContent = "›";
  const current = document.createElement("span");
  current.id = "nc-current-video-id";
  current.textContent = "-";
  nav.append(rootLink, divider1, featureLink, divider2, current);
  return nav;
};
const createStandaloneLayout = () => {
  document.body.classList.add("nc-standalone-body");
  applyStyles(STANDALONE_PAGE_STYLES);
  const container = document.getElementById("nc-standalone-player-root") ?? document.body;
  const root = document.createElement("div");
  root.className = "nc-standalone-page";
  const header = document.createElement("header");
  header.className = "nc-header";
  const breadcrumbs = createBreadcrumbs();
  const title = document.createElement("h1");
  title.className = "nc-header__title";
  title.textContent = "読み込み中...";
  const metaList = document.createElement("div");
  metaList.className = "nc-header__meta";
  header.append(breadcrumbs, title, metaList);
  const main = document.createElement("main");
  main.className = "nc-main";
  const playerSurface = document.createElement("section");
  playerSurface.className = "nc-player-surface";
  const playerHost = document.createElement("div");
  playerHost.className = "nc-player-host";
  const playerMount = document.createElement("div");
  playerMount.id = "nc-player-mount";
  playerHost.append(playerMount);
  playerSurface.append(playerHost);
  const infoCard = document.createElement("aside");
  infoCard.className = "nc-info-card";
  const statsList = document.createElement("div");
  statsList.className = "nc-stat-list";
  const tags = document.createElement("div");
  tags.className = "nc-tag-cloud";
  const ownerContainer = document.createElement("div");
  ownerContainer.className = "nc-owner";
  const ownerAvatar = document.createElement("img");
  ownerAvatar.alt = "投稿者のアイコン";
  ownerAvatar.loading = "lazy";
  const ownerInfo = document.createElement("div");
  ownerInfo.className = "nc-owner__info";
  const ownerName = document.createElement("span");
  ownerName.className = "nc-owner__name";
  const ownerLink = document.createElement("a");
  ownerLink.className = "nc-owner__link";
  ownerLink.target = "_blank";
  ownerLink.rel = "noopener noreferrer";
  ownerLink.textContent = "プロフィールを見る";
  ownerInfo.append(ownerName, ownerLink);
  ownerContainer.append(ownerAvatar, ownerInfo);
  const seriesTitle = document.createElement("h2");
  seriesTitle.className = "nc-section-title";
  seriesTitle.textContent = "シリーズ情報";
  const seriesList = document.createElement("div");
  seriesList.className = "nc-series";
  infoCard.append(statsList, tags, ownerContainer, seriesTitle, seriesList);
  main.append(playerSurface, infoCard);
  const description = document.createElement("section");
  description.className = "nc-description";
  root.append(header, main, description);
  container.append(root);
  return {
    root,
    playerMount,
    title,
    metaList,
    statsList,
    tags,
    description,
    ownerContainer,
    ownerAvatar,
    ownerName,
    ownerLink,
    seriesList
  };
};

class UrlManager {
  constructor() {
    this.baseUrl = URLS.BASE;
  }
  /**
   * 指定された動画IDに対する利用可能なURLを取得します
   * @param videoId ニコニコ動画のID
   * @returns 利用可能なURLの情報
   */
  async getUrls(videoId) {
    try {
      const response = await fetch(`${this.baseUrl}/cache/find_cache?${videoId}`);
      if (!response.ok) {
        throw new Error(`Cache search failed: ${response.status}`);
      }
      const data = await response.json();
      const availablePaths = data && typeof data === "object" && "paths" in data ? data.paths : [];
      const urls = {
        auto: `/cache/${videoId}/auto/movie`,
        ref: `/cache/file/nicocachenl_refcache=${videoId}.hls//master.m3u8`
      };
      for (const path of availablePaths) {
        if (typeof path === "string") {
          if (path.endsWith(".hls")) {
            urls.customHls = `/local/CustomCache/${path}/master.m3u8`;
          } else if (path.endsWith(".mp4")) {
            urls.customMp4 = `/local/CustomCache/${path}`;
          }
        }
      }
      if (!urls.customHls) urls.hls = `/local/CustomCache/${videoId}.hls/master.m3u8`;
      if (!urls.customMp4) urls.mp4 = `/local/CustomCache/${videoId}.mp4`;
      return urls;
    } catch (error) {
      window.logger.error("キャッシュ検索エラー:", error);
      return {
        auto: `/cache/${videoId}/auto/movie`,
        ref: `/cache/file/nicocachenl_refcache=${videoId}.hls//master.m3u8`,
        hls: `/local/CustomCache/${videoId}.hls/master.m3u8`,
        mp4: `/local/CustomCache/${videoId}.mp4`
      };
    }
  }
  /**
   * URLが存在するかチェック
   * @param url チェックするURL
   * @returns 存在する場合はtrue
   */
  async checkUrlExists(url) {
    try {
      if (window.commonHelper && typeof window.commonHelper.checkCache404 === "function") {
        const result = await window.commonHelper.checkCache404(url);
        if (typeof result === "boolean") {
          return result;
        }
      }
      const response = await fetch(url, { method: "HEAD" });
      return response.ok;
    } catch (error) {
      window.logger.error(`URL存在チェックエラー (${url}):`, error);
      return false;
    }
  }
  /**
   * 相対URLを絶対URLに変換
   */
  getFullUrl(path) {
    if (path.startsWith("http")) return path;
    return `${this.baseUrl}${path}`;
  }
  /**
   * 複数の候補から有効なURLを検索
   * @param videoId 動画ID
   * @returns 最初に見つかった有効なURL
   */
  async findFirstAvailableUrl(videoId) {
    const urls = await this.getUrls(videoId);
    const urlKeys = [
      "customHls",
      "customMp4",
      "hls",
      "mp4",
      "auto",
      "ref"
    ];
    for (const key of urlKeys) {
      const url = urls[key];
      if (url) {
        const fullUrl = this.getFullUrl(url);
        const exists = await this.checkUrlExists(fullUrl);
        if (exists) {
          return fullUrl;
        }
      }
    }
    return null;
  }
}

class CacheManager {
  /**
   * @param videoElement 管理対象のビデオ要素
   * @param hlsInstance HLS.jsのインスタンス（HLS再生時のみ）
   * @param url 現在の動画URL
   */
  constructor(videoElement, hlsInstance, url) {
    this.playStartTime = 0;
    this.lastCleanupTime = 0;
    this.cacheCheckInterval = null;
    this.hls = null;
    this.currentUrl = "";
    // イベントハンドラー
    this.handleEmptied = () => {
      if (this.cacheCheckInterval !== null) {
        window.clearInterval(this.cacheCheckInterval);
        this.cacheCheckInterval = null;
      }
    };
    this.handleWaiting = () => {
      this.addBufferingDisplay();
    };
    this.handlePlaying = () => {
      this.removeBufferingDisplay();
    };
    this.video = videoElement;
    this.hls = hlsInstance || null;
    this.currentUrl = url || "";
    this.playStartTime = Date.now();
    this.lastCleanupTime = Date.now();
  }
  /**
   * キャッシュ管理を開始します
   */
  startMonitoring() {
    if (this.cacheCheckInterval !== null) return;
    this.cacheCheckInterval = window.setInterval(() => {
      if (!this.video.paused) {
        this.checkCacheState();
      }
    }, CACHE_MANAGEMENT.CHECK_INTERVAL_MS);
    this.video.addEventListener("emptied", this.handleEmptied);
    this.video.addEventListener("waiting", this.handleWaiting);
    this.video.addEventListener("playing", this.handlePlaying);
  }
  /**
   * キャッシュ管理を停止します
   */
  stopMonitoring() {
    if (this.cacheCheckInterval !== null) {
      window.clearInterval(this.cacheCheckInterval);
      this.cacheCheckInterval = null;
    }
    this.video.removeEventListener("emptied", this.handleEmptied);
    this.video.removeEventListener("waiting", this.handleWaiting);
    this.video.removeEventListener("playing", this.handlePlaying);
  }
  /**
   * HLS.jsインスタンスを更新します（HLS再生への切り替え時）
   */
  updateHlsInstance(hlsInstance, url) {
    this.hls = hlsInstance;
    if (url) {
      this.currentUrl = url;
    }
    window.logger.info("CacheManagerのHLS.jsインスタンスを更新しました！", {
      hasHls: !!this.hls,
      url: this.currentUrl
    });
  }
  /**
   * キャッシュの状態をチェックします
   */
  checkCacheState() {
    const currentTime = Date.now();
    const playDuration = (currentTime - this.playStartTime) / 1e3;
    if (window.performance && "memory" in window.performance && window.performance.memory) {
      const memoryInfo = window.performance.memory;
      const usedMemory = memoryInfo.usedJSHeapSize;
      if (usedMemory > CACHE_MANAGEMENT.CACHE_SIZE_THRESHOLD_BYTES || playDuration > CACHE_MANAGEMENT.TIME_THRESHOLD_MS / 1e3) {
        window.logger.info("キャッシュクリーンアップが必要です！", {
          playDuration: `${Math.floor(playDuration / 60)}分${Math.floor(playDuration % 60)}秒`,
          usedMemory: `${(usedMemory / (1024 * 1024)).toFixed(2)}MB`
        });
        void this.forceCleanup();
      }
    } else {
      if (playDuration > CACHE_MANAGEMENT.TIME_THRESHOLD_MS / 1e3) {
        window.logger.info("再生時間に基づくキャッシュクリーンアップが必要です！", {
          playDuration: `${Math.floor(playDuration / 60)}分${Math.floor(playDuration % 60)}秒`
        });
        void this.forceCleanup();
      }
    }
  }
  /**
   * キャッシュの強制クリーンアップを実行します
   */
  async forceCleanup() {
    try {
      window.logger.info("キャッシュクリーンアップを実行します！");
      const wasPlaying = !this.video.paused;
      const currentPosition = this.video.currentTime;
      this.addBufferingDisplay();
      if (this.hls) {
        await this.hlsCleanup(wasPlaying, currentPosition);
      } else {
        await this.regularCleanup(wasPlaying, currentPosition);
      }
      this.playStartTime = Date.now();
      this.lastCleanupTime = Date.now();
      this.removeBufferingDisplay();
      window.logger.info("キャッシュクリーンアップが完了しました！");
    } catch (error) {
      window.logger.error("キャッシュクリーンアップでエラーが発生しました...", error);
      this.removeBufferingDisplay();
    }
  }
  /**
   * HLS.js使用時のキャッシュクリーンアップ
   */
  async hlsCleanup(wasPlaying, currentPosition) {
    if (!this.hls) return;
    window.logger.info("HLS.js使用時のキャッシュクリーンアップを実行します！");
    try {
      if (typeof this.hls.destroy === "function") {
        const currentSource = this.currentUrl;
        this.hls.destroy();
        await new Promise((resolve) => setTimeout(resolve, 200));
        if (typeof Hls !== "undefined" && Hls.isSupported()) {
          this.hls = new Hls();
          this.hls.on(Hls.Events.ERROR, (...args) => {
            const [, data] = args;
            window.logger.error("HLS Error during cleanup:", data);
          });
          this.hls.on(Hls.Events.MANIFEST_PARSED, () => {
            this.restorePlaybackPosition(wasPlaying, currentPosition);
          });
          this.hls.loadSource(currentSource);
          this.hls.attachMedia(this.video);
        } else {
          window.logger.warn("HLS.jsが利用できないため、ネイティブ再生にフォールバックします");
          this.video.src = currentSource;
          await new Promise((resolve) => setTimeout(resolve, 100));
          this.restorePlaybackPosition(wasPlaying, currentPosition);
        }
      } else {
        window.logger.warn("HLS.jsのdestroyメソッドが利用できません");
        await this.regularCleanup(wasPlaying, currentPosition);
      }
    } catch (error) {
      window.logger.error("HLS.jsクリーンアップ中にエラーが発生しました:", error);
      await this.regularCleanup(wasPlaying, currentPosition);
    }
  }
  /**
   * 通常の動画ファイルのキャッシュクリーンアップ
   */
  async regularCleanup(wasPlaying, currentPosition) {
    window.logger.info("通常の動画ファイルのキャッシュクリーンアップを実行します！");
    const currentSrc = this.video.src;
    this.video.pause();
    this.video.src = "";
    this.video.load();
    await new Promise((resolve) => setTimeout(resolve, 100));
    this.video.src = currentSrc;
    this.video.load();
    this.restorePlaybackPosition(wasPlaying, currentPosition);
  }
  /**
   * 再生位置と再生状態を復元
   */
  restorePlaybackPosition(wasPlaying, currentPosition) {
    const safePosition = Math.max(0, currentPosition - CACHE_MANAGEMENT.CLEANUP_BUFFER_SECONDS);
    this.video.currentTime = safePosition;
    if (wasPlaying) {
      setTimeout(() => {
        void this.video.play().catch((error) => {
          window.logger.error("再生の再開に失敗しました:", error);
        });
      }, 100);
    }
  }
  /**
   * バッファリング表示を追加します
   */
  addBufferingDisplay() {
    const playerContainer = document.querySelector(".custom-player");
    if (playerContainer) {
      playerContainer.classList.add("buffering");
    }
  }
  /**
   * バッファリング表示を削除します
   */
  removeBufferingDisplay() {
    const playerContainer = document.querySelector(".custom-player");
    if (playerContainer) {
      playerContainer.classList.remove("buffering");
    }
  }
}

var ToastMode = /* @__PURE__ */ ((ToastMode2) => {
  ToastMode2["INFO"] = "INFO";
  ToastMode2["SUCCESS"] = "SUCCESS";
  ToastMode2["WARNING"] = "WARNING";
  ToastMode2["ERROR"] = "ERROR";
  return ToastMode2;
})(ToastMode || {});

class ToastManager {
  constructor(config = TOAST_CONFIG) {
    this.config = config;
  }
  /**
   * 情報通知を表示
   * @param title メインメッセージ
   * @param middle サブメッセージ（省略可）
   * @param low 追加情報（省略可）
   */
  showInfo(title, middle = "", low = "") {
    this.showToast(ToastMode.INFO, title, middle, low, this.config.TIMEOUTS.START_MS);
  }
  /**
   * 成功通知を表示
   * @param title メインメッセージ
   * @param middle サブメッセージ（省略可）
   * @param low 追加情報（省略可）
   */
  showSuccess(title, middle = "", low = "") {
    this.showToast(ToastMode.SUCCESS, title, middle, low, this.config.TIMEOUTS.PLAYABLE_MS);
  }
  /**
   * 警告通知を表示
   * @param title メインメッセージ
   * @param middle サブメッセージ（省略可）
   * @param low 追加情報（省略可）
   */
  showWarning(title, middle = "", low = "") {
    this.showToast(ToastMode.WARNING, title, middle, low, this.config.TIMEOUTS.WARN_MS);
  }
  /**
   * エラー通知を表示
   * @param title メインメッセージ
   * @param middle サブメッセージ（省略可）
   * @param low 追加情報（省略可）
   */
  showError(title, middle = "", low = "") {
    this.showToast(ToastMode.ERROR, title, middle, low, this.config.TIMEOUTS.ERROR_MS);
  }
  /**
   * カスタム通知を表示
   * @param mode 通知モード
   * @param title メインメッセージ
   * @param middle サブメッセージ（省略可）
   * @param low 追加情報（省略可）
   * @param timeout 表示時間（ミリ秒）
   */
  showToast(mode, title, middle = "", low = "", timeout = 5e3) {
    const message = [middle, low].filter(Boolean).join(" ");
    switch (mode) {
      case ToastMode.INFO:
        window.toastr.info(message, title, { timeOut: timeout });
        break;
      case ToastMode.SUCCESS:
        window.toastr.success(message, title, { timeOut: timeout });
        break;
      case ToastMode.WARNING:
        window.toastr.warning(message, title, { timeOut: timeout });
        break;
      case ToastMode.ERROR:
        window.toastr.error(message, title, { timeOut: timeout });
        break;
      default:
        window.logger.info(`[Toast-${String(mode)}] ${title} ${message}`);
    }
  }
}

const PLAYER_ICONS = {
  play: createMaterialIcon(ICONS.play, { style: "outlined", color: "white" }),
  pause: createMaterialIcon(ICONS.pause, { style: "outlined", color: "white" }),
  volume: createMaterialIcon(ICONS.volume_up, { style: "outlined", color: "white" }),
  muted: createMaterialIcon(ICONS.volume_off, { style: "outlined", color: "white" }),
  rewind10: createMaterialIcon("replay_10", { style: "outlined", color: "white" }),
  forward10: createMaterialIcon("forward_10", { style: "outlined", color: "white" }),
  comment: createMaterialIcon(ICONS.comment, { style: "outlined", color: "white" }),
  commentOff: createMaterialIcon(ICONS.comment, { style: "outlined", color: "white", classes: "comment-off" }),
  fullscreen: createMaterialIcon(ICONS.fullscreen, { style: "outlined", color: "white" }),
  exitFullscreen: createMaterialIcon(ICONS.fullscreen_exit, { style: "outlined", color: "white" }),
  settings: createMaterialIcon(ICONS.settings, { style: "outlined", color: "white" })
};

const DB_CONFIG = {
  NAME: "NicoCachePlayerDB",
  CURRENT_VERSION: 2,
  MIGRATION_BATCH_SIZE: 100,
  BACKUP_RETENTION_DAYS: 30,
  CLEANUP_INTERVAL_HOURS: 24
};
const DB_STORES = {
  // 既存：プレーヤー設定
  playerSettings: {
    name: "playerSettings",
    keyPath: "id",
    autoIncrement: false,
    indexes: [
      { name: "updatedAt", unique: false },
      { name: "category", unique: false }
    ]
  },
  // 新規：動画キャッシュ情報
  videoCache: {
    name: "videoCache",
    keyPath: "videoId",
    autoIncrement: false,
    indexes: [
      { name: "lastAccessed", unique: false },
      { name: "cacheSize", unique: false },
      { name: "quality", unique: false }
    ]
  },
  // 新規：視聴履歴
  viewHistory: {
    name: "viewHistory",
    keyPath: "id",
    autoIncrement: true,
    indexes: [
      { name: "videoId", unique: false },
      { name: "watchedAt", unique: false },
      { name: "duration", unique: false }
    ]
  },
  // 新規：ユーザー統計
  userStats: {
    name: "userStats",
    keyPath: "statId",
    autoIncrement: false,
    indexes: [
      { name: "category", unique: false },
      { name: "date", unique: false }
    ]
  },
  // 新規：コメント履歴
  commentHistory: {
    name: "commentHistory",
    keyPath: "id",
    autoIncrement: true,
    indexes: [
      { name: "videoId", unique: false },
      { name: "timestamp", unique: false },
      { name: "userId", unique: false }
    ]
  },
  // 新規：システム情報
  systemInfo: {
    name: "systemInfo",
    keyPath: "key",
    autoIncrement: false,
    indexes: [
      { name: "version", unique: false },
      { name: "createdAt", unique: false }
    ]
  }
};
const DB_VERSION_HISTORY = {
  1: {
    version: 1,
    description: "基本設定ストア",
    stores: ["playerSettings"],
    migrationRequired: false
  },
  2: {
    version: 2,
    description: "永続化昇格：キャッシュ・履歴・統計機能追加",
    stores: ["playerSettings", "videoCache", "viewHistory", "userStats", "commentHistory", "systemInfo"],
    migrationRequired: true
  }
};
const MIGRATION_CONFIGS = {
  2: {
    version: 2,
    description: "永続化昇格マイグレーション",
    execute: async (db, transaction) => {
      const backupData = await backupExistingData(db);
      createNewStores(db);
      await migratePlayerSettings(db, transaction, backupData);
      await recordMigrationInfo(db, transaction);
    }
  }
};
async function backupExistingData(db) {
  const backup = {};
  if (db.objectStoreNames.contains("playerSettings")) {
    const transaction = db.transaction(["playerSettings"], "readonly");
    const store = transaction.objectStore("playerSettings");
    const request = store.getAll();
    await new Promise((resolve, reject) => {
      request.onsuccess = () => {
        backup.playerSettings = request.result;
        resolve(void 0);
      };
      request.onerror = () => {
        const e = request.error;
        const msg = e && typeof e.message === "string" ? e.message : typeof e === "string" ? e : JSON.stringify(e);
        reject(new Error(msg));
      };
    });
  }
  return backup;
}
function createNewStores(db) {
  Object.values(DB_STORES).forEach((storeConfig) => {
    if (!db.objectStoreNames.contains(storeConfig.name)) {
      const store = db.createObjectStore(storeConfig.name, {
        keyPath: storeConfig.keyPath,
        autoIncrement: storeConfig.autoIncrement
      });
      if (storeConfig.indexes) {
        storeConfig.indexes.forEach((index) => {
          store.createIndex(index.name, index.name, { unique: index.unique });
        });
      }
    }
  });
}
async function migratePlayerSettings(db, transaction, backupData) {
  await Promise.resolve();
  if (!backupData.playerSettings) return;
  const store = transaction.objectStore("playerSettings");
  const playerSettings = backupData.playerSettings;
  for (const item of playerSettings) {
    const migratedItem = {
      ...item,
      category: "player",
      migrated: true,
      migratedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    store.put(migratedItem);
  }
}
async function recordMigrationInfo(db, transaction) {
  await Promise.resolve();
  const systemStore = transaction.objectStore("systemInfo");
  const migrationInfo = {
    key: "migration_v2",
    value: true,
    version: 2,
    createdAt: /* @__PURE__ */ new Date(),
    updatedAt: /* @__PURE__ */ new Date(),
    metadata: {
      description: "永続化昇格マイグレーション完了",
      timestamp: Date.now()
    }
  };
  systemStore.put(migrationInfo);
}
const SETTING_CATEGORIES = {
  PLAYER: "player"};
const CLEANUP_CONFIG = {
  VIEW_HISTORY_DAYS: 90,
  COMMENT_HISTORY_DAYS: 30};

class MigrationManager {
  constructor() {
    this.db = null;
    this.migrationInProgress = false;
    this.backupData = {};
    this.setupErrorHandling();
  }
  /**
   * データベースマイグレーションを実行
   * @param db データベースインスタンス
   * @param oldVersion 旧バージョン
   * @param newVersion 新バージョン
   * @returns マイグレーション結果
   */
  async executeMigration(db, oldVersion, newVersion) {
    if (this.migrationInProgress) {
      return { success: false, error: "既にマイグレーションが実行中です" };
    }
    this.migrationInProgress = true;
    this.db = db;
    try {
      window.logger?.info(`マイグレーション開始: v${oldVersion} → v${newVersion}`);
      await this.createBackup(db, oldVersion);
      for (let version = oldVersion + 1; version <= newVersion; version++) {
        await this.migrateToVersion(db, version);
      }
      await this.recordMigrationSuccess(db, newVersion);
      window.logger?.info(`マイグレーション完了: v${newVersion}`);
      return { success: true };
    } catch (error) {
      window.logger?.error("マイグレーション失敗:", error);
      await this.rollback(db, oldVersion);
      return {
        success: false,
        error: error instanceof Error ? error.message : "マイグレーションに失敗しました"
      };
    } finally {
      this.migrationInProgress = false;
      this.cleanupBackup();
    }
  }
  /**
   * 指定バージョンへのマイグレーション
   * @param db データベース
   * @param version 対象バージョン
   */
  async migrateToVersion(db, version) {
    const migration = MIGRATION_CONFIGS[version];
    if (!migration) {
      throw new Error(`バージョン ${version} のマイグレーション設定が見つかりません`);
    }
    window.logger?.info(`マイグレーション実行中: v${version} - ${migration.description}`);
    const transaction = db.transaction(
      Array.from(db.objectStoreNames),
      "readwrite"
    );
    try {
      await migration.execute(db, transaction);
      await new Promise((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => {
          const err = transaction.error;
          const msg = err && typeof err.message === "string" ? err.message : typeof err === "string" ? err : JSON.stringify(err);
          reject(new Error(msg));
        };
      });
      window.logger?.info(`マイグレーション完了: v${version}`);
    } catch (error) {
      throw new Error(`バージョン ${version} のマイグレーションに失敗: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  /**
   * バックアップ作成
   * @param db データベース
   * @param version 現在のバージョン
   */
  async createBackup(db, version) {
    this.backupData = {
      version,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      stores: {}
    };
    const storeNames = Array.from(db.objectStoreNames);
    const transaction = db.transaction(storeNames, "readonly");
    for (const storeName of storeNames) {
      const store = transaction.objectStore(storeName);
      const request = store.getAll();
      await new Promise((resolve, reject) => {
        request.onsuccess = () => {
          if (!this.backupData.stores) {
            this.backupData.stores = {};
          }
          this.backupData.stores[storeName] = request.result;
          resolve();
        };
        request.onerror = () => {
          const e = request.error;
          const msg = e && typeof e.message === "string" ? e.message : typeof e === "string" ? e : JSON.stringify(e);
          reject(new Error(msg));
        };
      });
    }
    try {
      localStorage.setItem(
        `nicoCacheDB_backup_v${version}`,
        JSON.stringify(this.backupData)
      );
      window.logger?.info(`バックアップ作成完了: v${version}`);
    } catch (error) {
      window.logger?.warn("バックアップ保存失敗:", error);
    }
  }
  /**
   * ロールバック実行
   * @param db データベース
   * @param targetVersion 復旧対象バージョン
   */
  async rollback(db, targetVersion) {
    if (!this.backupData.stores) {
      window.logger?.error("バックアップデータが見つかりません");
      return;
    }
    try {
      window.logger?.info(`ロールバック開始: v${targetVersion}`);
      const storeNames = Object.keys(this.backupData.stores);
      const transaction = db.transaction(storeNames, "readwrite");
      for (const storeName of storeNames) {
        if (db.objectStoreNames.contains(storeName)) {
          const store = transaction.objectStore(storeName);
          await new Promise((resolve, reject) => {
            const clearRequest = store.clear();
            clearRequest.onsuccess = () => resolve();
            clearRequest.onerror = () => {
              const e = clearRequest.error;
              const msg = e && typeof e.message === "string" ? e.message : typeof e === "string" ? e : JSON.stringify(e);
              reject(new Error(msg));
            };
          });
          const backupItems = this.backupData.stores[storeName];
          for (const item of backupItems) {
            await new Promise((resolve, reject) => {
              const putRequest = store.put(item);
              putRequest.onsuccess = () => resolve();
              putRequest.onerror = () => {
                const e = putRequest.error;
                const msg = e && typeof e.message === "string" ? e.message : typeof e === "string" ? e : JSON.stringify(e);
                reject(new Error(msg));
              };
            });
          }
        }
      }
      window.logger?.info(`ロールバック完了: v${targetVersion}`);
    } catch (error) {
      window.logger?.error("ロールバック失敗:", error);
      throw error;
    }
  }
  /**
   * マイグレーション成功記録
   * @param db データベース
   * @param version 新バージョン
   */
  async recordMigrationSuccess(db, version) {
    if (!db.objectStoreNames.contains("systemInfo")) {
      return;
    }
    const transaction = db.transaction(["systemInfo"], "readwrite");
    const store = transaction.objectStore("systemInfo");
    const migrationRecord = {
      key: `migration_v${version}`,
      value: true,
      version,
      createdAt: /* @__PURE__ */ new Date(),
      updatedAt: /* @__PURE__ */ new Date(),
      metadata: {
        description: DB_VERSION_HISTORY[version]?.description || "マイグレーション",
        executedAt: (/* @__PURE__ */ new Date()).toISOString(),
        backupCreated: !!this.backupData.timestamp
      }
    };
    await new Promise((resolve, reject) => {
      const request = store.put(migrationRecord);
      request.onsuccess = () => resolve();
      request.onerror = () => {
        const e = request.error;
        const msg = e && typeof e.message === "string" ? e.message : typeof e === "string" ? e : JSON.stringify(e);
        reject(new Error(msg));
      };
    });
  }
  /**
   * バックアップクリーンアップ
   */
  cleanupBackup() {
    this.backupData = {};
    try {
      const keys = Object.keys(localStorage);
      const backupKeys = keys.filter((key) => key.startsWith("nicoCacheDB_backup_"));
      backupKeys.sort().reverse().slice(5).forEach((key) => {
        localStorage.removeItem(key);
      });
      window.logger?.debug("古いバックアップを削除しました");
    } catch (error) {
      window.logger?.warn("バックアップクリーンアップ失敗:", error);
    }
  }
  /**
   * 現在のデータベースバージョンを取得
   * @param db データベース
   * @returns 現在のバージョン
   */
  async getCurrentVersion(db) {
    if (!db.objectStoreNames.contains("systemInfo")) {
      return 1;
    }
    try {
      const transaction = db.transaction(["systemInfo"], "readonly");
      const store = transaction.objectStore("systemInfo");
      const request = store.get("db_version");
      return new Promise((resolve) => {
        request.onsuccess = () => {
          const result = request.result;
          resolve(result && typeof result.version === "number" ? result.version : 1);
        };
        request.onerror = () => {
          window.logger?.warn("バージョン取得失敗");
          resolve(1);
        };
      });
    } catch (error) {
      window.logger?.warn("バージョン取得エラー:", error);
      return 1;
    }
  }
  /**
   * マイグレーション履歴を取得
   * @param db データベース
   * @returns マイグレーション履歴
   */
  async getMigrationHistory(db) {
    if (!db.objectStoreNames.contains("systemInfo")) {
      return [];
    }
    try {
      const transaction = db.transaction(["systemInfo"], "readonly");
      const store = transaction.objectStore("systemInfo");
      const request = store.getAll();
      return new Promise((resolve, reject) => {
        request.onsuccess = () => {
          const results = request.result;
          const migrationRecords = results.filter(
            (item) => typeof item.key === "string" && item.key.startsWith("migration_v")
          );
          resolve(migrationRecords);
        };
        request.onerror = () => {
          const e = request.error;
          const msg = e && typeof e.message === "string" ? e.message : typeof e === "string" ? e : JSON.stringify(e);
          reject(new Error(msg));
        };
      });
    } catch (error) {
      window.logger?.error("マイグレーション履歴取得エラー:", error);
      return [];
    }
  }
  /**
   * データベース整合性チェック
   * @param db データベース
   * @returns 整合性チェック結果
   */
  async validateDatabase(db) {
    await Promise.resolve();
    const errors = [];
    try {
      const expectedStores = DB_VERSION_HISTORY[DB_CONFIG.CURRENT_VERSION].stores;
      for (const storeName of expectedStores) {
        if (!db.objectStoreNames.contains(storeName)) {
          errors.push(`必要なストア "${storeName}" が存在しません`);
        }
      }
      return { valid: errors.length === 0, errors };
    } catch (error) {
      errors.push(`整合性チェックエラー: ${error instanceof Error ? error.message : String(error)}`);
      return { valid: false, errors };
    }
  }
  /**
   * エラーハンドリング設定
   */
  setupErrorHandling() {
    window.addEventListener("error", (event) => {
      const err = event.error;
      const message = err && typeof err.message === "string" ? err.message : String(err);
      if (message.includes("Migration")) {
        window.logger?.error("マイグレーション関連エラー:", message);
      }
    });
    window.addEventListener("unhandledrejection", (event) => {
      const reasonUnknown = event.reason;
      const message = reasonUnknown && typeof reasonUnknown.message === "string" ? reasonUnknown.message : String(reasonUnknown);
      if (message.includes("Migration")) {
        window.logger?.error("マイグレーション関連Promise拒否:", message);
      }
    });
  }
  /**
   * マイグレーションの必要性チェック
   * @param currentVersion 現在のバージョン
   * @returns マイグレーションが必要かどうか
   */
  needsMigration(currentVersion) {
    return currentVersion < DB_CONFIG.CURRENT_VERSION;
  }
  /**
   * 利用可能なマイグレーションパスを取得
   * @param fromVersion 開始バージョン
   * @returns マイグレーションパス
   */
  getMigrationPath(fromVersion) {
    const path = [];
    for (let version = fromVersion + 1; version <= DB_CONFIG.CURRENT_VERSION; version++) {
      if (MIGRATION_CONFIGS[version]) {
        path.push(version);
      }
    }
    return path;
  }
  /**
   * デバッグ情報を取得
   * @returns デバッグ情報
   */
  getDebugInfo() {
    return {
      migrationInProgress: this.migrationInProgress,
      hasBackup: Object.keys(this.backupData).length > 0,
      currentDbVersion: DB_CONFIG.CURRENT_VERSION,
      availableMigrations: Object.keys(MIGRATION_CONFIGS),
      backupTimestamp: this.backupData.timestamp
    };
  }
}

class DatabaseManager {
  constructor() {
    this.db = null;
    this.initializationPromise = null;
    this.cleanupTimer = null;
    this.migrationManager = new MigrationManager();
    this.setupPeriodicCleanup();
  }
  toMessage(value) {
    if (value && typeof value.message === "string") {
      return value.message;
    }
    return String(value);
  }
  /**
   * シングルトンインスタンスを取得
   */
  static getInstance() {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager();
    }
    return DatabaseManager.instance;
  }
  /**
   * データベースを初期化
   */
  async initialize() {
    if (this.initializationPromise) {
      return this.initializationPromise;
    }
    this.initializationPromise = this.performInitialization();
    return this.initializationPromise;
  }
  /**
   * データベース初期化の実行
   */
  async performInitialization() {
    try {
      this.db = await this.openDatabase();
      window.logger?.info("データベース初期化完了しました！");
    } catch (error) {
      window.logger?.error("データベース初期化失敗しました！:", error);
      throw error;
    }
  }
  /**
   * データベースを開く
   */
  openDatabase() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_CONFIG.NAME, DB_CONFIG.CURRENT_VERSION);
      request.onerror = () => {
        window.logger?.error("データベースのオープンに失敗しました！:", this.toMessage(request.error));
        reject(new Error(this.toMessage(request.error)));
      };
      request.onsuccess = () => {
        const db = request.result;
        this.setupDatabaseErrorHandling(db);
        resolve(db);
      };
      request.onupgradeneeded = async (event) => {
        const db = event.target.result;
        const oldVersion = event.oldVersion;
        const newVersion = event.newVersion || DB_CONFIG.CURRENT_VERSION;
        window.logger?.info(`データベース昇格しました: v${oldVersion} → v${newVersion}`);
        try {
          const result = await this.migrationManager.executeMigration(db, oldVersion, newVersion);
          if (!result.success) {
            throw new Error(result.error || "マイグレーション失敗");
          }
        } catch (error) {
          window.logger?.error("マイグレーション実行エラーが発生しました！:", error);
          throw error;
        }
      };
    });
  }
  /**
   * データベースエラーハンドリング設定
   */
  setupDatabaseErrorHandling(db) {
    db.onerror = (event) => {
      window.logger?.error("データベースエラーが発生しました！:", event);
    };
    db.onversionchange = () => {
      window.logger?.warn("データベースバージョン変更が検出されました！");
      db.close();
      this.db = null;
    };
  }
  /**
   * プレーヤー設定の保存
   */
  async savePlayerSetting(key, value, category = SETTING_CATEGORIES.PLAYER) {
    await this.ensureInitialized();
    const transaction = this.db.transaction(["playerSettings"], "readwrite");
    const store = transaction.objectStore("playerSettings");
    const settingData = {
      id: key,
      value,
      category,
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    return new Promise((resolve, reject) => {
      const request = store.put(settingData);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error(this.toMessage(request.error)));
    });
  }
  /**
   * プレーヤー設定の取得
   */
  async getPlayerSetting(key, defaultValue) {
    await this.ensureInitialized();
    const transaction = this.db.transaction(["playerSettings"], "readonly");
    const store = transaction.objectStore("playerSettings");
    return new Promise((resolve) => {
      const request = store.get(key);
      request.onsuccess = () => {
        const result = request.result;
        resolve(result && typeof result === "object" && "value" in result && result.value !== void 0 ? result.value : defaultValue);
      };
      request.onerror = () => {
        window.logger?.warn(`設定取得失敗しました！: ${key}`);
        resolve(defaultValue);
      };
    });
  }
  /**
   * 動画キャッシュ情報の保存
   */
  async saveVideoCache(videoCache) {
    await this.ensureInitialized();
    const transaction = this.db.transaction(["videoCache"], "readwrite");
    const store = transaction.objectStore("videoCache");
    return new Promise((resolve, reject) => {
      const request = store.put(videoCache);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error(this.toMessage(request.error)));
    });
  }
  /**
   * 動画キャッシュ情報の取得
   */
  async getVideoCache(videoId) {
    await this.ensureInitialized();
    const transaction = this.db.transaction(["videoCache"], "readonly");
    const store = transaction.objectStore("videoCache");
    return new Promise((resolve, reject) => {
      const request = store.get(videoId);
      request.onsuccess = () => {
        const resultUnknown = request.result;
        resolve(resultUnknown ? resultUnknown : null);
      };
      request.onerror = () => reject(new Error(this.toMessage(request.error)));
    });
  }
  /**
   * 視聴履歴の追加
   */
  async addViewHistory(viewHistory) {
    await this.ensureInitialized();
    const transaction = this.db.transaction(["viewHistory"], "readwrite");
    const store = transaction.objectStore("viewHistory");
    return new Promise((resolve, reject) => {
      const request = store.add(viewHistory);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(new Error(this.toMessage(request.error)));
    });
  }
  /**
   * 視聴履歴の取得
   */
  async getViewHistory(limit = 50) {
    await this.ensureInitialized();
    const transaction = this.db.transaction(["viewHistory"], "readonly");
    const store = transaction.objectStore("viewHistory");
    const index = store.index("watchedAt");
    return new Promise((resolve, reject) => {
      const request = index.openCursor(null, "prev");
      const results = [];
      let count = 0;
      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor && count < limit) {
          results.push(cursor.value);
          count++;
          cursor.continue();
        } else {
          resolve(results);
        }
      };
      request.onerror = () => reject(new Error(this.toMessage(request.error)));
    });
  }
  /**
   * ユーザー統計の保存
   */
  async saveUserStats(userStats) {
    await this.ensureInitialized();
    const transaction = this.db.transaction(["userStats"], "readwrite");
    const store = transaction.objectStore("userStats");
    return new Promise((resolve, reject) => {
      const request = store.put(userStats);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error(this.toMessage(request.error)));
    });
  }
  /**
   * ユーザー統計の取得
   */
  async getUserStats(category, date) {
    await this.ensureInitialized();
    const statId = `${category}_${date}`;
    const transaction = this.db.transaction(["userStats"], "readonly");
    const store = transaction.objectStore("userStats");
    return new Promise((resolve, reject) => {
      const request = store.get(statId);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(new Error(this.toMessage(request.error)));
    });
  }
  /**
   * コメント履歴の追加
   */
  async addCommentHistory(commentHistory) {
    await this.ensureInitialized();
    const transaction = this.db.transaction(["commentHistory"], "readwrite");
    const store = transaction.objectStore("commentHistory");
    return new Promise((resolve, reject) => {
      const request = store.add(commentHistory);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(new Error(this.toMessage(request.error)));
    });
  }
  /**
   * システム情報の保存
   */
  async saveSystemInfo(systemInfo) {
    await this.ensureInitialized();
    const transaction = this.db.transaction(["systemInfo"], "readwrite");
    const store = transaction.objectStore("systemInfo");
    return new Promise((resolve, reject) => {
      const request = store.put(systemInfo);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error(this.toMessage(request.error)));
    });
  }
  /**
   * システム情報の取得
   */
  async getSystemInfo(key) {
    await this.ensureInitialized();
    const transaction = this.db.transaction(["systemInfo"], "readonly");
    const store = transaction.objectStore("systemInfo");
    return new Promise((resolve, reject) => {
      const request = store.get(key);
      request.onsuccess = () => {
        const resultUnknown = request.result;
        resolve(resultUnknown ? resultUnknown : null);
      };
      request.onerror = () => reject(new Error(this.toMessage(request.error)));
    });
  }
  /**
   * 全設定の取得（後方互換性）
   */
  async getAllSettings() {
    await this.ensureInitialized();
    const transaction = this.db.transaction(["playerSettings"], "readonly");
    const store = transaction.objectStore("playerSettings");
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => {
        const results = {};
        request.result.forEach((item) => {
          if (item && typeof item.id === "string") {
            results[item.id] = item.value;
          }
        });
        resolve(results);
      };
      request.onerror = () => reject(new Error(this.toMessage(request.error)));
    });
  }
  /**
   * データベースの統計情報を取得
   */
  async getDatabaseStats() {
    await this.ensureInitialized();
    const storeStats = {};
    let totalRecords = 0;
    const storeNames = Array.from(this.db.objectStoreNames);
    const transaction = this.db.transaction(storeNames, "readonly");
    for (const storeName of storeNames) {
      const store = transaction.objectStore(storeName);
      const count = await new Promise((resolve, reject) => {
        const request = store.count();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(new Error(this.toMessage(request.error)));
      });
      storeStats[storeName] = count;
      totalRecords += count;
    }
    const dbSize = totalRecords * 1024;
    return { totalRecords, storeStats, dbSize };
  }
  /**
   * 自動クリーンアップ実行
   */
  async performCleanup() {
    await this.ensureInitialized();
    try {
      window.logger?.info("データベースクリーンアップ開始");
      await this.cleanupViewHistory();
      await this.cleanupCommentHistory();
      await this.cleanupExpiredCache();
      window.logger?.info("データベースクリーンアップ完了");
    } catch (error) {
      window.logger?.error("クリーンアップエラーが発生しました！:", error);
    }
  }
  /**
   * 視聴履歴のクリーンアップ
   */
  async cleanupViewHistory() {
    const cutoffDate = /* @__PURE__ */ new Date();
    cutoffDate.setDate(cutoffDate.getDate() - CLEANUP_CONFIG.VIEW_HISTORY_DAYS);
    const transaction = this.db.transaction(["viewHistory"], "readwrite");
    const store = transaction.objectStore("viewHistory");
    const index = store.index("watchedAt");
    const range = IDBKeyRange.upperBound(cutoffDate);
    const request = index.openCursor(range);
    let deletedCount = 0;
    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          cursor.delete();
          deletedCount++;
          cursor.continue();
        } else {
          window.logger?.debug(`視聴履歴 ${deletedCount} 件を削除しました！`);
          resolve();
        }
      };
      request.onerror = () => reject(new Error(this.toMessage(request.error)));
    });
  }
  /**
   * コメント履歴のクリーンアップ
   */
  async cleanupCommentHistory() {
    const cutoffDate = /* @__PURE__ */ new Date();
    cutoffDate.setDate(cutoffDate.getDate() - CLEANUP_CONFIG.COMMENT_HISTORY_DAYS);
    const transaction = this.db.transaction(["commentHistory"], "readwrite");
    const store = transaction.objectStore("commentHistory");
    const index = store.index("timestamp");
    const range = IDBKeyRange.upperBound(cutoffDate.getTime());
    const request = index.openCursor(range);
    let deletedCount = 0;
    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          cursor.delete();
          deletedCount++;
          cursor.continue();
        } else {
          window.logger?.debug(`コメント履歴 ${deletedCount} 件を削除しました！`);
          resolve();
        }
      };
      request.onerror = () => reject(new Error(this.toMessage(request.error)));
    });
  }
  /**
   * 期限切れキャッシュのクリーンアップ
   */
  async cleanupExpiredCache() {
    const now = /* @__PURE__ */ new Date();
    const transaction = this.db.transaction(["videoCache"], "readwrite");
    const store = transaction.objectStore("videoCache");
    const request = store.getAll();
    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const caches = request.result;
        let deletedCount = 0;
        caches.forEach((cache) => {
          if (cache && cache.expiresAt && new Date(cache.expiresAt) < now && cache.videoId !== void 0) {
            store.delete(cache.videoId);
            deletedCount++;
          }
        });
        window.logger?.debug(`期限切れキャッシュ ${deletedCount} 件を削除しました！`);
        resolve();
      };
      request.onerror = () => reject(new Error(this.toMessage(request.error)));
    });
  }
  /**
   * 定期クリーンアップ設定
   */
  setupPeriodicCleanup() {
    const interval = DB_CONFIG.CLEANUP_INTERVAL_HOURS * 60 * 60 * 1e3;
    this.cleanupTimer = setInterval(() => {
      this.performCleanup().catch((error) => {
        window.logger?.error("定期クリーンアップ失敗しました！:", error);
      });
    }, interval);
  }
  /**
   * 初期化確認
   */
  async ensureInitialized() {
    if (!this.db) {
      await this.initialize();
    }
  }
  /**
   * データベースを閉じる
   */
  close() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    if (this.db) {
      this.db.close();
      this.db = null;
    }
    this.initializationPromise = null;
  }
  /**
   * データベースのリセット
   */
  async reset() {
    this.close();
    return new Promise((resolve, reject) => {
      const deleteRequest = indexedDB.deleteDatabase(DB_CONFIG.NAME);
      deleteRequest.onsuccess = () => {
        window.logger?.info("データベースをリセットしました！");
        resolve();
      };
      deleteRequest.onerror = () => reject(new Error(this.toMessage(deleteRequest.error)));
    });
  }
  /**
   * バックアップの作成
   */
  async createBackup() {
    await this.ensureInitialized();
    const backup = {
      version: DB_CONFIG.CURRENT_VERSION,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      stores: {}
    };
    const storeNames = Array.from(this.db.objectStoreNames);
    const transaction = this.db.transaction(storeNames, "readonly");
    for (const storeName of storeNames) {
      const store = transaction.objectStore(storeName);
      const request = store.getAll();
      backup.stores[storeName] = await new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(new Error(this.toMessage(request.error)));
      });
    }
    return backup;
  }
  /**
   * デバッグ情報の取得
   */
  async getDebugInfo() {
    const stats = await this.getDatabaseStats();
    const migrationDebug = this.migrationManager.getDebugInfo();
    return {
      initialized: !!this.db,
      dbVersion: DB_CONFIG.CURRENT_VERSION,
      stats,
      migration: migrationDebug,
      cleanupTimer: !!this.cleanupTimer
    };
  }
}

const DB_NAME = "NicoCachePlayerDB";
const STORE_NAME = "playerSettings";
const DB_VERSION = 1;
const dbManager = DatabaseManager.getInstance();
const initializeDB = async () => {
  try {
    await dbManager.initialize();
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onerror = (event) => {
        window.logger?.error("IndexedDBを開けませんでした:", event);
        reject(new Error("IndexedDBを開けませんでした"));
      };
      request.onsuccess = (event) => {
        const db = event.target.result;
        resolve(db);
      };
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: "id" });
        }
      };
    });
  } catch (error) {
    window.logger?.error("昇格機能初期化エラー:", error);
    throw error;
  }
};
const saveSettings = async (key, value) => {
  try {
    await dbManager.savePlayerSetting(key, value);
    window.logger?.debug(`設定保存完了: ${key}`);
  } catch (error) {
    window.logger?.error(`昇格機能での設定保存失敗: ${key}`, error);
    return new Promise((resolve, reject) => {
      initializeDB().then((db) => {
        const transaction = db.transaction([STORE_NAME], "readwrite");
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put({
          id: key,
          value,
          updatedAt: (/* @__PURE__ */ new Date()).toISOString()
        });
        request.onsuccess = () => {
          resolve();
        };
        request.onerror = (event) => {
          window.logger?.error(`設定 "${key}" の保存に失敗しました:`, event);
          reject(new Error(`設定 "${key}" の保存に失敗しました`));
        };
        transaction.oncomplete = () => {
          db.close();
        };
      }).catch(reject);
    });
  }
};
const getSettings = async (key, defaultValue) => {
  try {
    const result = await dbManager.getPlayerSetting(key, defaultValue);
    window.logger?.debug(`設定取得完了: ${key}`);
    return result;
  } catch (error) {
    window.logger?.error(`昇格機能での設定取得失敗: ${key}`, error);
    return new Promise((resolve) => {
      initializeDB().then((db) => {
        const transaction = db.transaction([STORE_NAME], "readonly");
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(key);
        request.onsuccess = () => {
          const result = request.result;
          if (result && "value" in result) {
            resolve(result.value);
          } else {
            resolve(defaultValue);
          }
        };
        request.onerror = (event) => {
          window.logger?.error(`設定 "${key}" の取得に失敗しました:`, event);
          resolve(defaultValue);
        };
        transaction.oncomplete = () => {
          db.close();
        };
      }).catch((error2) => {
        window.logger?.error("DB初期化エラー:", error2);
        resolve(defaultValue);
      });
    });
  }
};

const PLAYER_VOLUME_STORAGE_KEY = "playerVolume";
class PlayerControlsShadow extends HTMLElement {
  constructor() {
    super();
    this.video = null;
    this.mouseTimer = null;
    this.commentSystem = null;
    this.userPaused = false;
    this.isSettingsOpen = false;
    // コメント設定関連
    this.commentOpacity = PLAYER_SETTINGS.COMMENT.OPACITY.DEFAULT;
    this.commentColor = PLAYER_SETTINGS.COMMENT.COLORS.WHITE;
    this.ngWords = [];
    this.ngRegex = [];
    // 一時的な設定保存用
    this.tempOpacity = PLAYER_SETTINGS.COMMENT.OPACITY.DEFAULT;
    this.tempColor = PLAYER_SETTINGS.COMMENT.COLORS.WHITE;
    this.tempNgWords = [];
    this.tempNgRegex = [];
    this.initialized = false;
    /**
     * コントロールモード変更処理
     */
    this.handleControlsModeChange = (e) => {
      const select = e.target;
      const mode = select.value;
      localStorage.setItem("controlsMode", mode);
      this.applyControlsMode(mode);
    };
    /**
     * キーボードショートカットの処理
     */
    this.handleKeyboardShortcuts = (e) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (!this.video) return;
      switch (e.key.toLowerCase()) {
        case " ":
        case "k":
          e.preventDefault();
          if (this.video.paused) {
            this.video.play().catch((err) => window.logger.error("再生開始に失敗しました:", err));
          } else {
            this.video.pause();
            this.userPaused = true;
          }
          break;
        case "f":
          e.preventDefault();
          this.toggleFullscreen();
          break;
        case "m":
          e.preventDefault();
          this.video.muted = !this.video.muted;
          this.updateVolumeIcon();
          break;
        case "arrowleft":
          e.preventDefault();
          this.video.currentTime = Math.max(this.video.currentTime - 5, 0);
          break;
        case "arrowright":
          e.preventDefault();
          this.video.currentTime = Math.min(this.video.currentTime + 5, this.video.duration || 0);
          break;
        case "j":
          e.preventDefault();
          this.video.currentTime = Math.max(this.video.currentTime - 10, 0);
          break;
        case "l":
          e.preventDefault();
          this.video.currentTime = Math.min(this.video.currentTime + 10, this.video.duration || 0);
          break;
      }
    };
    this.shadow = this.attachShadow({ mode: "closed" });
    this.shadow.innerHTML = this.getTemplate();
    void this.initializeComponent();
  }
  /**
   * コンポーネントの非同期初期化
   */
  async initializeComponent() {
    await new Promise((resolve) => {
      if (this.shadow && this.shadow.firstElementChild) {
        resolve(void 0);
        return;
      }
      const observer = new MutationObserver(() => {
        if (this.shadow && this.shadow.firstElementChild) {
          observer.disconnect();
          resolve(void 0);
        }
      });
      observer.observe(this.shadow, { childList: true });
      setTimeout(() => {
        observer.disconnect();
        resolve(void 0);
      }, 100);
    });
    this.setupEventListeners();
    this.setupInitialIcons();
    this.initialized = true;
    const savedControlsMode = localStorage.getItem("controlsMode") || PLAYER_SETTINGS.CONTROLS_MODE.HOVER;
    this.applyControlsMode(savedControlsMode);
    window.logger.info("PlayerControlsShadowの初期化が完了しました！");
  }
  /**
   * ビデオ要素を設定
   */
  setVideoElement(video) {
    if (!video) {
      window.logger.error("無効なビデオ要素が渡されました");
      return;
    }
    this.ensureInitialized();
    this.video = video;
    this.initializeVolumeState();
    this.setupVideoEvents();
    void this.initializeSettings();
    window.logger.info("ビデオ要素が設定されました！");
  }
  /**
   * コメントシステムを設定
   */
  setCommentSystem(commentSystem) {
    this.commentSystem = commentSystem;
    const commentToggle = this.shadow.querySelector("#comment-toggle");
    if (commentToggle && this.commentSystem) {
      commentToggle.classList.toggle("active", !this.commentSystem.getVisibility());
    }
    if (this.commentSystem) {
      this.commentSystem.setOpacity(this.commentOpacity);
      this.commentSystem.setDefaultColor(this.commentColor);
      this.commentSystem.setNGWords(this.ngWords);
      this.commentSystem.setNGRegex(this.ngRegex);
    }
  }
  /**
   * HTMLテンプレートを取得
   */
  getTemplate() {
    const initialVolumePercent = Math.round(PLAYER_SETTINGS.VOLUME.DEFAULT * 100);
    return `
      <style>
        ${this.getStyles()}
      </style>
      <div class="player-controls">
        <div class="progress-container-custom">
          <input type="range" id="seek-bar" min="0" max="100" value="0">
          <div class="progress-bar-custom"></div>
        </div>
        <div class="controls-bar">
          <div class="controls-left">
            <button id="play-pause" title="再生/一時停止">${PLAYER_ICONS.play}</button>
            <div class="volume-control">
              <button id="mute" title="ミュート切替">${PLAYER_ICONS.volume}</button>
              <input type="range" id="volume" class="custom-slider" min="0" max="100" value="${initialVolumePercent}" style="--volume: ${initialVolumePercent}%;">
            </div>
          </div>
          <div class="controls-center">
            <button id="rewind-10" title="10秒戻す">${PLAYER_ICONS.rewind10}</button>
            <span id="current-time" class="time-display">00:00</span>
            <span class="time-separator">/</span>
            <span id="duration" class="time-display">00:00</span>
            <button id="forward-10" title="10秒進める">${PLAYER_ICONS.forward10}</button>
          </div>
          <div class="controls-right">
            <button id="comment-toggle" title="コメント表示切替">${PLAYER_ICONS.comment}</button>
            <button id="fullscreen" title="全画面表示">${PLAYER_ICONS.fullscreen}</button>
            <button id="settings" title="設定">${PLAYER_ICONS.settings}</button>
          </div>
        </div>

        <!-- 設定メニュー -->
        <div id="player-settings-menu">
          ${this.getSettingsMenuTemplate()}
        </div>
      </div>
    `;
  }
  /**
   * 設定メニューのテンプレートを取得
   */
  getSettingsMenuTemplate() {
    return `
      <div class="settings-container">
        <!-- プレイヤー設定部分 -->
        <div class="settings-section">
          <h3 class="settings-heading">プレイヤー設定</h3>
          <div class="settings-item">
            <span>コントロール表示</span>
            <select id="controls-mode">
              <option value="hover">ホバー時のみ</option>
              <option value="always">常に表示</option>
            </select>
          </div>
        </div>
        
        <!-- コメント設定部分 -->
        <div class="settings-section">
          <h3 class="settings-heading">コメント設定</h3>
          
          <!-- コメント透明度 -->
          <div class="settings-item">
            <span>透明度</span>
            <input 
              type="range" 
              id="comment-opacity" 
              min="${PLAYER_SETTINGS.COMMENT.OPACITY.MIN}" 
              max="${PLAYER_SETTINGS.COMMENT.OPACITY.MAX}" 
              step="${PLAYER_SETTINGS.COMMENT.OPACITY.STEP}" 
              value="${PLAYER_SETTINGS.COMMENT.OPACITY.DEFAULT}"
            >
            <span id="opacity-value">${PLAYER_SETTINGS.COMMENT.OPACITY.DEFAULT}</span>
          </div>
          
          <!-- コメント色 -->
          <div class="settings-item">
            <span>デフォルト色</span>
            <select id="comment-color">
              <option value="${PLAYER_SETTINGS.COMMENT.COLORS.WHITE}">白</option>
              <option value="${PLAYER_SETTINGS.COMMENT.COLORS.RED}">赤</option>
              <option value="${PLAYER_SETTINGS.COMMENT.COLORS.BLUE}">青</option>
              <option value="${PLAYER_SETTINGS.COMMENT.COLORS.GREEN}">緑</option>
              <option value="${PLAYER_SETTINGS.COMMENT.COLORS.YELLOW}">黄色</option>
              <option value="${PLAYER_SETTINGS.COMMENT.COLORS.CYAN}">水色</option>
              <option value="${PLAYER_SETTINGS.COMMENT.COLORS.MAGENTA}">マゼンタ</option>
              <option value="${PLAYER_SETTINGS.COMMENT.COLORS.ORANGE}">オレンジ</option>
              <option value="${PLAYER_SETTINGS.COMMENT.COLORS.PURPLE}">紫</option>
            </select>
          </div>
          
          <!-- NGワード設定 -->
          <div class="settings-item">
            <span>NGワード設定</span>
            <div class="ng-container">
              <div class="ng-input-container">
                <input type="text" id="ng-word-input" placeholder="NGワードを入力">
                <button id="add-ng-word">追加</button>
              </div>
              <ul id="ng-word-list" class="ng-list"></ul>
            </div>
          </div>
          
          <!-- NG正規表現設定 -->
          <div class="settings-item">
            <span>NG正規表現設定</span>
            <div class="ng-container">
              <div class="ng-input-container">
                <input type="text" id="ng-regex-input" placeholder="NG正規表現を入力">
                <button id="add-ng-regex">追加</button>
              </div>
              <ul id="ng-regex-list" class="ng-list"></ul>
            </div>
          </div>

          <!-- 適用ボタン -->
          <div class="settings-item settings-actions">
            <button id="apply-comment-settings" class="button-primary">適用</button>
          </div>
        </div>
      </div>
    `;
  }
  /**
   * CSSスタイルを取得（シャドウDOM内で完全に分離）
   */
  getStyles() {
    return `
      ${materialIconsStyles}
      
      :host {
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        z-index: 9999;
        /* シャドウDOM内では外部スタイルの影響を受けない */
      }

      /* 全画面時のホスト要素スタイル */
      :host(.fullscreen-active) {
        position: fixed !important;
        bottom: 0 !important;
        left: 0 !important;
        right: 0 !important;
        width: 100vw !important;
        z-index: 2000 !important;
      }

      .player-controls {
        position: relative; /* 設定メニューの基準点として設定 */
        padding: 10px;
        background: linear-gradient(transparent, rgba(0, 0, 0, 0.7));
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.3s ease;
      }

      /* 全画面時のプレーヤーコントロール背景強化 */
      :host(.fullscreen-active) .player-controls {
        background: linear-gradient(transparent, rgba(0, 0, 0, 0.85)) !important;
        padding: 15px 20px !important;
      }

      /* ホバー時またはコントロール表示状態 */
      :host(.controls-visible) .player-controls,
      :host(.always-visible) .player-controls {
        opacity: 1;
        pointer-events: auto;
      }

      /* 常に表示モードの場合は即座に表示 */
      :host(.always-visible) .player-controls {
        transition: none;
      }

      .progress-container-custom {
        width: 100%;
        height: 4px;
        margin-bottom: 10px;
        position: relative;
        cursor: pointer;
      }

      #seek-bar {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(255, 255, 255, 0.3);
        border-radius: 2px;
        cursor: pointer;
        -webkit-appearance: none;
        appearance: none;
        border: none;
        outline: none;
        pointer-events: auto;
        margin: 0;
        padding: 0;
      }

      #seek-bar::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 0;
        height: 0;
      }

      #seek-bar::-moz-range-thumb {
        width: 0;
        height: 0;
        border: none;
      }

      .progress-bar-custom {
        position: absolute;
        top: 0;
        left: 0;
        height: 100%;
        background: #007bff;
        border-radius: 2px;
        pointer-events: none;
        transition: width 0.1s linear;
      }

      .progress-container-custom:hover #seek-bar,
      .progress-container-custom:hover .progress-bar-custom {
        height: 6px;
      }

      .controls-bar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0 10px;
      }

      .controls-left,
      .controls-center,
      .controls-right {
        display: flex;
        align-items: center;
        gap: 10px;
      }

      .controls-right {
        position: relative; /* 設定メニューの追加基準点 */
      }

      .volume-control {
        display: flex;
        align-items: center;
        gap: 5px;
      }

      #volume {
        width: 80px;
        height: 4px;
        -webkit-appearance: none;
        background: rgba(255, 255, 255, 0.3);
        border-radius: 2px;
        cursor: pointer;
        transition: height 0.2s;
      }

      #volume:hover {
        height: 6px;
      }

      #volume::-webkit-slider-thumb {
        -webkit-appearance: none;
        width: 0;
        height: 0;
      }

      #volume::-moz-range-thumb {
        width: 0;
        height: 0;
        border: 0;
      }

      #volume::-webkit-slider-runnable-track {
        height: 100%;
        background: linear-gradient(to right, #007bff var(--volume), rgba(255, 255, 255, 0.3) var(--volume));
        border-radius: 2px;
      }

      #volume::-moz-range-track {
        height: 100%;
        background: linear-gradient(to right, #007bff var(--volume), rgba(255, 255, 255, 0.3) var(--volume));
        border-radius: 2px;
      }

      button {
        background: none;
        border: none;
        color: white;
        cursor: pointer;
        padding: 5px;
        font-size: 16px;
        opacity: 0.8;
        transition: opacity 0.2s;
      }

      button:hover {
        opacity: 1;
      }

      button.active {
        color: #007bff;
      }

      .time-display {
        color: white;
        font-size: 14px;
        font-family: monospace;
      }

      .time-separator {
        color: white;
        margin: 0 5px;
      }

      /* SVGアイコンのスタイル */
      svg {
        width: 24px;
        height: 24px;
        fill: currentColor;
        display: block;
      }

      /* 設定メニューのスタイル */
      #player-settings-menu {
        display: none;
        position: absolute;
        bottom: 100%;
        right: 10px; /* 右端から少し内側に配置 */
        background: rgba(28, 28, 28, 0.95);
        border-radius: 8px;
        padding: 15px;
        margin-bottom: 10px;
        min-width: 320px;
        max-width: min(400px, 90vw);
        color: white;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
        z-index: 1000;
        /* 画面からはみ出る場合の調整 */
        transform: translateX(0);
      }

      /* 全画面時のスタイル（従来通りの縦一覧） */
      #player-settings-menu.fullscreen-mode {
        max-width: min(400px, 90vw);
        max-height: none;
        overflow-y: visible;
      }

      #player-settings-menu.fullscreen-mode .settings-container {
        display: block;
      }

      #player-settings-menu.fullscreen-mode .settings-section {
        margin-bottom: 20px;
        padding-bottom: 15px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        border-right: none;
        padding-right: 0;
        margin-right: 0;
      }

      #player-settings-menu.fullscreen-mode .settings-section:last-child {
        border-bottom: none;
        margin-bottom: 0;
      }

      /* 非全画面時のスタイル（フレックス + 高さ制限 + スクロール） */
      #player-settings-menu.windowed-mode {
        max-width: min(800px, 95vw);
        max-height: min(48vh, 600px);
        overflow-y: auto;
      }

      /* スクロールバーのスタイリング */
      #player-settings-menu.windowed-mode::-webkit-scrollbar {
        width: 8px;
      }

      #player-settings-menu.windowed-mode::-webkit-scrollbar-track {
        background: rgba(255, 255, 255, 0.1);
        border-radius: 4px;
      }

      #player-settings-menu.windowed-mode::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.3);
        border-radius: 4px;
      }

      #player-settings-menu.windowed-mode::-webkit-scrollbar-thumb:hover {
        background: rgba(255, 255, 255, 0.5);
      }

      #player-settings-menu.windowed-mode .settings-container {
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
        gap: 20px;
      }

      #player-settings-menu.windowed-mode .settings-section {
        flex: 1;
        min-width: 280px;
        margin-bottom: 0;
        padding-bottom: 0;
        border-bottom: none;
        border-right: 1px solid rgba(255, 255, 255, 0.1);
        padding-right: 15px;
        margin-right: 15px;
      }

      #player-settings-menu.windowed-mode .settings-section:last-child {
        border-right: none;
        padding-right: 0;
        margin-right: 0;
      }

      /* 画面右端からはみ出る場合の調整 */
      #player-settings-menu.adjust-position {
        right: auto;
        left: 0;
        transform: translateX(0);
      }

      #player-settings-menu.visible {
        display: block;
      }

      /* 設定セクションのフレックスレイアウト */
      .settings-container {
        display: flex;
        flex-direction: column;
        gap: 20px;
      }

      .settings-section {
        margin-bottom: 20px;
        padding-bottom: 15px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      }

      .settings-section:last-child {
        border-bottom: none;
        margin-bottom: 0;
      }

      .settings-heading {
        font-size: 16px;
        margin: 0 0 15px 0;
        font-weight: bold;
        color: #007bff;
      }

      .settings-item {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 12px;
        flex-wrap: wrap;
      }

      .settings-item > span:first-child {
        min-width: 100px;
        font-size: 14px;
      }

      .settings-item select,
      .settings-item input[type="text"],
      .settings-item input[type="range"] {
        flex: 1;
        background: rgba(43, 42, 42, 0.88);
        color: white;
        border: 1px solid rgba(255, 255, 255, 0.2);
        padding: 6px 8px;
        border-radius: 4px;
        min-width: 120px;
      }

      .settings-item select:focus,
      .settings-item input:focus {
        outline: none;
        border-color: #007bff;
      }

      .ng-container {
        width: 100%;
      }

      .ng-input-container {
        display: flex;
        gap: 8px;
        margin-bottom: 8px;
      }

      .ng-input-container input {
        flex: 1;
      }

      .ng-input-container button {
        background: #007bff;
        color: white;
        border: none;
        border-radius: 4px;
        padding: 6px 12px;
        cursor: pointer;
        font-size: 12px;
      }

      .ng-input-container button:hover {
        background: #0056b3;
      }

      .ng-list {
        list-style: none;
        padding: 0;
        margin: 0;
        max-height: 120px;
        overflow-y: auto;
        background: rgba(0, 0, 0, 0.3);
        border-radius: 4px;
        border: 1px solid rgba(255, 255, 255, 0.1);
      }

      .ng-list li {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 6px 10px;
        margin: 2px;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 3px;
        font-size: 12px;
        word-break: break-all;
      }

      .ng-list li button {
        background: transparent;
        color: #ff6b6b;
        padding: 2px 6px;
        font-size: 11px;
        margin-left: 8px;
        opacity: 0.7;
      }

      .ng-list li button:hover {
        opacity: 1;
        background: rgba(255, 107, 107, 0.1);
      }

      .settings-actions {
        justify-content: flex-end;
        margin-top: 15px;
      }

      .button-primary {
        background: #007bff;
        color: white;
        border: none;
        border-radius: 4px;
        padding: 8px 16px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 500;
      }

      .button-primary:hover {
        background: #0056b3;
      }

      .button-primary.applied {
        background: #28a745;
      }

      /* モバイル対応 */
      @media (max-width: 768px) {
        .controls-center {
          display: none;
        }
        
        .volume-control {
          display: none;
        }
        
        .player-controls {
          padding: 5px;
        }
        
        button {
          padding: 8px;
          font-size: 20px;
        }

        #player-settings-menu {
          min-width: 280px;
          max-width: 90vw;
        }
      }
    `;
  }
  /**
   * イベントリスナーを設定
   */
  setupEventListeners() {
    if (this.initialized) return;
    this.setupSettingsEvents();
    this.setupControlEvents();
    this.setupCommentEvents();
    this.setupHoverEvents();
    document.addEventListener("keydown", this.handleKeyboardShortcuts);
    this.initialized = true;
  }
  /**
   * 設定関連のイベント設定
   */
  setupSettingsEvents() {
    const settingsBtn = this.shadow.querySelector("#settings");
    if (settingsBtn) {
      settingsBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        this.toggleSettingsMenu();
      });
    }
    document.addEventListener("click", (e) => {
      if (!this.contains(e.target)) {
        this.closeSettingsMenu();
      }
    });
    const controlsModeSelect = this.shadow.querySelector("#controls-mode");
    if (controlsModeSelect) {
      controlsModeSelect.addEventListener("change", this.handleControlsModeChange);
    }
  }
  /**
   * コントロール関連のイベント設定
   */
  setupControlEvents() {
    const playPauseBtn = this.shadow.querySelector("#play-pause");
    if (playPauseBtn) {
      playPauseBtn.addEventListener("click", () => {
        const video = this.getVideo();
        if (!video) return;
        if (video.paused) {
          video.play().catch((e) => window.logger.error("再生開始に失敗しました:", e));
        } else {
          video.pause();
          this.userPaused = true;
        }
      });
    }
    const rewindBtn = this.shadow.querySelector("#rewind-10");
    const forwardBtn = this.shadow.querySelector("#forward-10");
    if (rewindBtn) {
      rewindBtn.addEventListener("click", () => {
        const video = this.getVideo();
        if (video) {
          video.currentTime = Math.max(video.currentTime - 10, 0);
        }
      });
    }
    if (forwardBtn) {
      forwardBtn.addEventListener("click", () => {
        const video = this.getVideo();
        if (video) {
          video.currentTime = Math.min(video.currentTime + 10, video.duration || 0);
        }
      });
    }
    this.setupProgressControls();
    this.setupVolumeControls();
    this.setupFullscreenControl();
  }
  /**
   * プログレス関連のコントロール設定
   */
  setupProgressControls() {
    const seekBar = this.shadow.querySelector("#seek-bar");
    const progressBar = this.shadow.querySelector(".progress-bar-custom");
    const progressContainer = this.shadow.querySelector(".progress-container-custom");
    if (!seekBar || !progressBar || !progressContainer) return;
    seekBar.addEventListener("change", () => {
      const video = this.getVideo();
      if (video) {
        const progress = Number(seekBar.value);
        video.currentTime = progress / 100 * video.duration;
      }
    });
    seekBar.addEventListener("input", () => {
      const progress = Number(seekBar.value);
      seekBar.style.setProperty("--progress", `${progress}%`);
    });
    progressContainer.addEventListener("click", (e) => {
      const video = this.getVideo();
      if (!video) return;
      const rect = progressContainer.getBoundingClientRect();
      const pos = (e.clientX - rect.left) / rect.width;
      video.currentTime = pos * video.duration;
    });
  }
  /**
   * 音量コントロールの設定
   */
  setupVolumeControls() {
    const volumeBar = this.shadow.querySelector("#volume");
    const muteBtn = this.shadow.querySelector("#mute");
    if (!volumeBar || !muteBtn) return;
    const initialPercent = Math.round(PLAYER_SETTINGS.VOLUME.DEFAULT * 100);
    volumeBar.style.setProperty("--volume", `${initialPercent}%`);
    volumeBar.addEventListener("input", () => {
      const video = this.getVideo();
      if (!video) return;
      const volumeValue = this.clampVolume(Number(volumeBar.value) / 100);
      video.volume = volumeValue;
      if (volumeValue > 0 && video.muted) {
        video.muted = false;
      }
      this.updateVolumeSlider(volumeValue);
      localStorage.setItem(PLAYER_VOLUME_STORAGE_KEY, volumeValue.toString());
      this.updateVolumeIcon();
    });
    muteBtn.addEventListener("click", () => {
      const video = this.getVideo();
      if (!video) return;
      video.muted = !video.muted;
      this.updateVolumeIcon();
    });
  }
  /**
   * 音量値を許容範囲にクランプ
   */
  clampVolume(volume) {
    const { MIN, MAX, DEFAULT } = PLAYER_SETTINGS.VOLUME;
    if (Number.isNaN(volume)) {
      return DEFAULT;
    }
    return Math.min(Math.max(volume, MIN), MAX);
  }
  /**
   * 音量スライダーのUI更新
   */
  updateVolumeSlider(volume) {
    const volumeBar = this.shadow.querySelector("#volume");
    if (!volumeBar) return;
    const clamped = this.clampVolume(volume);
    const percent = Math.round(clamped * 100);
    volumeBar.value = percent.toString();
    volumeBar.style.setProperty("--volume", `${percent}%`);
  }
  /**
   * 動画要素の音量とUIを同期
   */
  syncVolumeFromVideo() {
    const video = this.getVideo();
    if (!video) return;
    this.updateVolumeSlider(video.volume);
    this.updateVolumeIcon();
  }
  /**
   * 初期音量の適用
   */
  initializeVolumeState() {
    const video = this.getVideo();
    if (!video) return;
    const savedVolumeRaw = localStorage.getItem(PLAYER_VOLUME_STORAGE_KEY);
    let volume = PLAYER_SETTINGS.VOLUME.DEFAULT;
    if (savedVolumeRaw !== null) {
      const parsed = Number(savedVolumeRaw);
      if (!Number.isNaN(parsed)) {
        volume = parsed;
      }
    } else {
      const currentVolume = this.clampVolume(video.volume);
      if (currentVolume !== 1) {
        volume = currentVolume;
      }
    }
    volume = this.clampVolume(volume);
    video.volume = volume;
    if (volume > 0 && video.muted) {
      video.muted = false;
    }
    this.updateVolumeSlider(volume);
    this.updateVolumeIcon();
  }
  /**
   * 全画面コントロールの設定
   */
  setupFullscreenControl() {
    const fullscreenBtn = this.shadow.querySelector("#fullscreen");
    if (!fullscreenBtn) return;
    fullscreenBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.toggleFullscreen();
    });
    document.addEventListener("fullscreenchange", () => {
      this.handleFullscreenChange();
    });
  }
  /**
   * コメント関連のイベント設定
   */
  setupCommentEvents() {
    const commentToggle = this.shadow.querySelector("#comment-toggle");
    if (!commentToggle) return;
    commentToggle.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!this.commentSystem) return;
      const isVisible = this.commentSystem.toggleVisibility();
      commentToggle.classList.toggle("active", !isVisible);
      commentToggle.innerHTML = isVisible ? PLAYER_ICONS.comment : PLAYER_ICONS.commentOff;
      localStorage.setItem("commentVisible", isVisible.toString());
    });
    this.setupCommentSettingsEvents();
  }
  /**
   * コメント設定のイベント設定
   */
  setupCommentSettingsEvents() {
    const opacitySlider = this.shadow.querySelector("#comment-opacity");
    const opacityValue = this.shadow.querySelector("#opacity-value");
    if (opacitySlider && opacityValue) {
      opacitySlider.addEventListener("input", () => {
        const opacity = Number(opacitySlider.value);
        opacityValue.textContent = opacitySlider.value;
        this.tempOpacity = opacity;
      });
    }
    const colorSelect = this.shadow.querySelector("#comment-color");
    if (colorSelect) {
      colorSelect.addEventListener("change", () => {
        this.tempColor = colorSelect.value;
      });
    }
    const ngWordInput = this.shadow.querySelector("#ng-word-input");
    const addNgWordBtn = this.shadow.querySelector("#add-ng-word");
    if (ngWordInput && addNgWordBtn) {
      addNgWordBtn.addEventListener("click", () => {
        const word = ngWordInput.value.trim();
        if (word && !this.tempNgWords.includes(word) && this.tempNgWords.length < PLAYER_SETTINGS.COMMENT.NG.MAX_WORDS) {
          this.tempNgWords.push(word);
          ngWordInput.value = "";
          this.updateNGWordList(true);
        }
      });
    }
    const ngRegexInput = this.shadow.querySelector("#ng-regex-input");
    const addNgRegexBtn = this.shadow.querySelector("#add-ng-regex");
    if (ngRegexInput && addNgRegexBtn) {
      addNgRegexBtn.addEventListener("click", () => {
        const regex = ngRegexInput.value.trim();
        try {
          new RegExp(regex);
          if (regex && !this.tempNgRegex.includes(regex) && this.tempNgRegex.length < PLAYER_SETTINGS.COMMENT.NG.MAX_REGEX) {
            this.tempNgRegex.push(regex);
            ngRegexInput.value = "";
            this.updateNGRegexList(true);
          }
        } catch (e) {
          window.logger.error("無効な正規表現です:", e);
          ngRegexInput.classList.add("error");
          setTimeout(() => {
            ngRegexInput.classList.remove("error");
          }, 2e3);
        }
      });
    }
    const applyBtn = this.shadow.querySelector("#apply-comment-settings");
    if (applyBtn) {
      applyBtn.addEventListener("click", () => {
        void this.applyCommentSettings();
      });
    }
  }
  /**
   * 初期アイコンの設定
   */
  setupInitialIcons() {
    const buttons = [
      { id: "#rewind-10", icon: PLAYER_ICONS.rewind10 },
      { id: "#forward-10", icon: PLAYER_ICONS.forward10 },
      { id: "#fullscreen", icon: PLAYER_ICONS.fullscreen },
      { id: "#settings", icon: PLAYER_ICONS.settings }
    ];
    buttons.forEach(({ id, icon }) => {
      const button = this.shadow.querySelector(id);
      if (button) {
        button.innerHTML = icon;
      }
    });
  }
  /**
   * 初期設定の読み込み
   */
  async initializeSettings() {
    if (!this.video) return;
    this.setupVideoEvents();
    await this.loadCommentSettings();
    const controlsMode = localStorage.getItem("controlsMode") || PLAYER_SETTINGS.CONTROLS_MODE.HOVER;
    this.applyControlsMode(controlsMode);
    const controlsModeSelect = this.shadow.querySelector("#controls-mode");
    if (controlsModeSelect) {
      controlsModeSelect.value = controlsMode;
    }
  }
  /**
   * ビデオイベントの設定
   */
  setupVideoEvents() {
    const video = this.getVideo();
    if (!video) return;
    video.addEventListener("play", () => {
      this.userPaused = false;
      this.updatePlayPauseButton();
    });
    video.addEventListener("pause", () => {
      this.updatePlayPauseButton();
    });
    video.addEventListener("loadeddata", () => {
      this.updatePlayPauseButton();
    });
    video.addEventListener("timeupdate", () => {
      this.updateProgress();
      this.updateTimeDisplay();
    });
    video.addEventListener("loadedmetadata", () => {
      this.updateDurationDisplay();
    });
    video.addEventListener("durationchange", () => {
      this.updateDurationDisplay();
    });
    video.addEventListener("volumechange", () => {
      this.syncVolumeFromVideo();
    });
    if (video.duration && !isNaN(video.duration)) {
      this.updateDurationDisplay();
    }
  }
  /**
   * プログレス表示の更新
   */
  updateProgress() {
    const video = this.getVideo();
    if (!video) return;
    const seekBar = this.shadow.querySelector("#seek-bar");
    const progressBar = this.shadow.querySelector(".progress-bar-custom");
    if (!seekBar || !progressBar || isNaN(video.duration)) return;
    const progress = video.currentTime / video.duration * 100;
    progressBar.style.width = `${progress}%`;
    seekBar.value = String(progress);
    seekBar.style.setProperty("--progress", `${progress}%`);
  }
  /**
   * 現在時間表示の更新
   */
  updateTimeDisplay() {
    const video = this.getVideo();
    if (!video) return;
    const currentTimeSpan = this.shadow.querySelector("#current-time");
    if (currentTimeSpan) {
      currentTimeSpan.textContent = this.formatTime(video.currentTime);
    }
  }
  /**
   * 動画長表示の更新
   */
  updateDurationDisplay() {
    const video = this.getVideo();
    if (!video) return;
    const durationSpan = this.shadow.querySelector("#duration");
    if (durationSpan) {
      durationSpan.textContent = this.formatTime(video.duration);
    }
    const seekBar = this.shadow.querySelector("#seek-bar");
    if (seekBar) {
      seekBar.max = "100";
    }
  }
  /**
   * 再生/一時停止ボタンの更新
   */
  updatePlayPauseButton() {
    const button = this.shadow.querySelector("#play-pause");
    const video = this.getVideo();
    if (!button || !video) return;
    if (video.paused) {
      button.classList.remove("playing");
      button.classList.add("paused");
      button.innerHTML = PLAYER_ICONS.play;
    } else {
      button.classList.add("playing");
      button.classList.remove("paused");
      button.innerHTML = PLAYER_ICONS.pause;
    }
  }
  /**
   * 音量アイコンの更新
   */
  updateVolumeIcon() {
    const button = this.shadow.querySelector("#mute");
    const video = this.getVideo();
    if (!button || !video) return;
    if (video.muted || video.volume === 0) {
      button.classList.add("muted");
      button.innerHTML = PLAYER_ICONS.muted;
    } else {
      button.classList.remove("muted");
      button.innerHTML = PLAYER_ICONS.volume;
    }
  }
  /**
   * 時間をMM:SS形式に変換
   */
  formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    seconds = Math.floor(seconds % 60);
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  }
  /**
   * 設定メニューの表示/非表示切り替え
   */
  toggleSettingsMenu() {
    this.isSettingsOpen = !this.isSettingsOpen;
    const settingsMenu = this.shadow.querySelector("#player-settings-menu");
    if (settingsMenu) {
      settingsMenu.classList.toggle("visible", this.isSettingsOpen);
      if (this.isSettingsOpen) {
        const doc = document;
        const isFullScreen = !!doc.fullscreenElement || !!doc.mozFullScreenElement || !!doc.webkitFullscreenElement || !!doc.msFullscreenElement;
        this.updateSettingsMenuMode(isFullScreen);
        requestAnimationFrame(() => {
          this.adjustSettingsMenuPosition(settingsMenu);
        });
      }
    }
  }
  /**
   * 設定メニューの位置を調整（画面からはみ出ないように）
   */
  adjustSettingsMenuPosition(settingsMenu) {
    const settingsBtn = this.shadow.querySelector("#settings");
    if (!settingsBtn) return;
    const btnRect = settingsBtn.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const controlsRect = this.shadow.querySelector(".player-controls")?.getBoundingClientRect();
    if (!controlsRect) return;
    const rightOffset = controlsRect.right - btnRect.right;
    settingsMenu.classList.remove("adjust-position");
    settingsMenu.style.left = "";
    settingsMenu.style.right = `${rightOffset}px`;
    const updatedRect = settingsMenu.getBoundingClientRect();
    if (updatedRect.right > viewportWidth - 10) {
      const overflowAmount = updatedRect.right - (viewportWidth - 10);
      settingsMenu.style.right = `${rightOffset + overflowAmount}px`;
    }
    const finalRect = settingsMenu.getBoundingClientRect();
    if (finalRect.left < 10) {
      settingsMenu.style.left = "10px";
      settingsMenu.style.right = "auto";
    }
    if (updatedRect.top < 10) {
      settingsMenu.style.bottom = "auto";
      settingsMenu.style.top = "100%";
      settingsMenu.style.marginTop = "10px";
      settingsMenu.style.marginBottom = "0";
    }
  }
  /**
   * 設定メニューを閉じる
   */
  closeSettingsMenu() {
    if (this.isSettingsOpen) {
      this.isSettingsOpen = false;
      const settingsMenu = this.shadow.querySelector("#player-settings-menu");
      if (settingsMenu) {
        settingsMenu.classList.remove("visible");
        settingsMenu.classList.remove("adjust-position");
        settingsMenu.style.left = "";
        settingsMenu.style.right = "";
        settingsMenu.style.top = "";
        settingsMenu.style.bottom = "";
        settingsMenu.style.marginTop = "";
        settingsMenu.style.marginBottom = "";
      }
    }
  }
  /**
   * コントロールモードを適用
   */
  applyControlsMode(mode) {
    if (mode === PLAYER_SETTINGS.CONTROLS_MODE.ALWAYS) {
      this.classList.add("always-visible");
      this.classList.add("controls-visible");
    } else {
      this.classList.remove("always-visible");
      this.classList.remove("controls-visible");
    }
  }
  /**
   * コメント設定の読み込み
   */
  async loadCommentSettings() {
    try {
      const [opacity, color, words, regexList] = await Promise.all([
        getSettings("commentOpacity", PLAYER_SETTINGS.COMMENT.OPACITY.DEFAULT),
        getSettings("commentColor", PLAYER_SETTINGS.COMMENT.COLORS.WHITE),
        getSettings("ngWords", []),
        getSettings("ngRegex", [])
      ]);
      this.commentOpacity = opacity;
      this.tempOpacity = opacity;
      this.commentColor = color;
      this.tempColor = color;
      this.ngWords = words;
      this.tempNgWords = [...words];
      this.ngRegex = regexList;
      this.tempNgRegex = [...regexList];
      this.updateSettingsUI();
      if (this.commentSystem) {
        this.commentSystem.setOpacity(this.commentOpacity);
        this.commentSystem.setDefaultColor(this.commentColor);
        this.commentSystem.setNGWords(this.ngWords);
        this.commentSystem.setNGRegex(this.ngRegex);
      }
    } catch (error) {
      window.logger.error("コメント設定の読み込みに失敗しました:", error);
    }
  }
  /**
   * 設定UIの更新
   */
  updateSettingsUI() {
    const opacitySlider = this.shadow.querySelector("#comment-opacity");
    const opacityValue = this.shadow.querySelector("#opacity-value");
    if (opacitySlider && opacityValue) {
      opacitySlider.value = String(this.commentOpacity);
      opacityValue.textContent = String(this.commentOpacity);
    }
    const colorSelect = this.shadow.querySelector("#comment-color");
    if (colorSelect) {
      colorSelect.value = this.commentColor;
    }
    this.updateNGWordList();
    this.updateNGRegexList();
  }
  /**
   * NGワードリストの更新
   */
  updateNGWordList(isTemp = false) {
    const ngList = this.shadow.querySelector("#ng-word-list");
    if (!ngList) return;
    ngList.innerHTML = "";
    const words = isTemp ? this.tempNgWords : this.ngWords;
    words.forEach((word, index) => {
      const li = document.createElement("li");
      li.textContent = word;
      const removeBtn = document.createElement("button");
      removeBtn.textContent = "削除";
      removeBtn.addEventListener("click", () => {
        if (isTemp) {
          this.tempNgWords.splice(index, 1);
          this.updateNGWordList(true);
        } else {
          void this.removeNGWord(index);
        }
      });
      li.appendChild(removeBtn);
      ngList.appendChild(li);
    });
  }
  /**
   * NG正規表現リストの更新
   */
  updateNGRegexList(isTemp = false) {
    const ngList = this.shadow.querySelector("#ng-regex-list");
    if (!ngList) return;
    ngList.innerHTML = "";
    const regexList = isTemp ? this.tempNgRegex : this.ngRegex;
    regexList.forEach((regex, index) => {
      const li = document.createElement("li");
      li.textContent = regex;
      const removeBtn = document.createElement("button");
      removeBtn.textContent = "削除";
      removeBtn.addEventListener("click", () => {
        if (isTemp) {
          this.tempNgRegex.splice(index, 1);
          this.updateNGRegexList(true);
        } else {
          void this.removeNGRegex(index);
        }
      });
      li.appendChild(removeBtn);
      ngList.appendChild(li);
    });
  }
  /**
   * NGワードを削除
   */
  async removeNGWord(index) {
    this.ngWords.splice(index, 1);
    await saveSettings("ngWords", this.ngWords);
    this.updateNGWordList();
    if (this.commentSystem) {
      this.commentSystem.setNGWords(this.ngWords);
    }
  }
  /**
   * NG正規表現を削除
   */
  async removeNGRegex(index) {
    this.ngRegex.splice(index, 1);
    await saveSettings("ngRegex", this.ngRegex);
    this.updateNGRegexList();
    if (this.commentSystem) {
      this.commentSystem.setNGRegex(this.ngRegex);
    }
  }
  /**
   * コメント設定を適用
   */
  async applyCommentSettings() {
    try {
      this.commentOpacity = this.tempOpacity;
      this.commentColor = this.tempColor;
      this.ngWords = [...this.tempNgWords];
      this.ngRegex = [...this.tempNgRegex];
      await Promise.all([
        saveSettings("commentOpacity", this.commentOpacity),
        saveSettings("commentColor", this.commentColor),
        saveSettings("ngWords", this.ngWords),
        saveSettings("ngRegex", this.ngRegex)
      ]);
      if (this.commentSystem) {
        this.commentSystem.setOpacity(this.commentOpacity);
        this.commentSystem.setDefaultColor(this.commentColor);
        this.commentSystem.setNGWords(this.ngWords);
        this.commentSystem.setNGRegex(this.ngRegex);
      }
      this.showApplyFeedback();
      window.logger.info(`コメント設定を適用しました！ 透明度: ${this.commentOpacity}, 色: ${this.commentColor}, NGワード: ${this.ngWords.length}件, NG正規表現: ${this.ngRegex.length}件`);
    } catch (error) {
      window.logger.error("コメント設定の適用に失敗しました:", error);
    }
  }
  /**
   * 設定適用のフィードバック表示
   */
  showApplyFeedback() {
    const applyBtn = this.shadow.querySelector("#apply-comment-settings");
    if (!applyBtn) return;
    const originalText = applyBtn.textContent;
    applyBtn.textContent = "✓ 適用しました";
    applyBtn.classList.add("applied");
    setTimeout(() => {
      applyBtn.textContent = originalText;
      applyBtn.classList.remove("applied");
    }, 2e3);
  }
  /**
   * 全画面表示の切り替え
   */
  toggleFullscreen() {
    try {
      const doc = document;
      if (!doc.fullscreenElement && !doc.mozFullScreenElement && !doc.webkitFullscreenElement && !doc.msFullscreenElement) {
        const playerContainer = this.closest(".custom-player");
        if (playerContainer) {
          window.logger.info("全画面化を試行します:", {
            hasRequestFullscreen: !!playerContainer.requestFullscreen,
            hasMozRequestFullScreen: !!playerContainer.mozRequestFullScreen,
            hasWebkitRequestFullscreen: !!playerContainer.webkitRequestFullscreen,
            hasMsRequestFullscreen: !!playerContainer.msRequestFullscreen
          });
          if (playerContainer.requestFullscreen) {
            playerContainer.requestFullscreen().then(() => {
              window.logger.info("標準全画面API成功しました");
              document.documentElement.classList.add("fullscreen-active");
              document.body.classList.add("nc-fullscreen-active");
              playerContainer.classList.add("nc-fullscreen-player");
            }).catch((err) => {
              window.logger.error("標準全画面APIが失敗しました:", err);
              this.fallbackFullscreen(playerContainer);
            });
          } else if (playerContainer.mozRequestFullScreen) {
            playerContainer.mozRequestFullScreen();
            window.logger.info("Firefox全画面API使用しました");
          } else if (playerContainer.webkitRequestFullscreen) {
            playerContainer.webkitRequestFullscreen();
            window.logger.info("WebKit全画面API使用しました");
          } else if (playerContainer.msRequestFullscreen) {
            playerContainer.msRequestFullscreen();
            window.logger.info("IE全画面API使用しました");
          } else {
            window.logger.warn("全画面APIが利用できないため、フォールバックを使用します");
            this.fallbackFullscreen(playerContainer);
          }
        }
      } else {
        if (doc.exitFullscreen) {
          doc.exitFullscreen().then(() => {
            window.logger.info("全画面解除成功しました");
            document.documentElement.classList.remove("fullscreen-active");
            document.body.classList.remove("nc-fullscreen-active");
            const playerContainer = this.closest(".custom-player");
            if (playerContainer) {
              playerContainer.classList.remove("nc-fullscreen-player");
            }
          }).catch((err) => {
            window.logger.error("全画面解除が失敗しました:", err);
          });
        } else if (doc.mozCancelFullScreen) {
          doc.mozCancelFullScreen();
        } else if (doc.webkitExitFullscreen) {
          doc.webkitExitFullscreen();
        } else if (doc.msExitFullscreen) {
          doc.msExitFullscreen();
        }
      }
    } catch (error) {
      window.logger.error("全画面切り替えでエラーが発生しました:", error);
      const playerContainer = this.closest(".custom-player");
      if (playerContainer) {
        this.fallbackFullscreen(playerContainer);
      }
    }
  }
  /**
   * フォールバック全画面処理
   */
  fallbackFullscreen(playerContainer) {
    window.logger.info("フォールバック全画面モードを使用します");
    document.documentElement.classList.add("fullscreen-active");
    document.body.classList.add("nc-fullscreen-active");
    playerContainer.classList.add("nc-fullscreen-player");
    const handleEscape = (e) => {
      if (e.key === "Escape") {
        document.documentElement.classList.remove("fullscreen-active");
        document.body.classList.remove("nc-fullscreen-active");
        playerContainer.classList.remove("nc-fullscreen-player");
        document.removeEventListener("keydown", handleEscape);
        window.logger.info("フォールバック全画面モードを終了しました");
      }
    };
    document.addEventListener("keydown", handleEscape);
  }
  /**
   * 全画面状態変更時の処理
   */
  handleFullscreenChange() {
    const doc = document;
    const isFullScreen = !!doc.fullscreenElement || !!doc.mozFullScreenElement || !!doc.webkitFullscreenElement || !!doc.msFullscreenElement;
    const fullscreenBtn = this.shadow.querySelector("#fullscreen");
    if (fullscreenBtn) {
      fullscreenBtn.innerHTML = isFullScreen ? PLAYER_ICONS.exitFullscreen : PLAYER_ICONS.fullscreen;
    }
    this.classList.toggle("fullscreen-active", isFullScreen);
    this.updateSettingsMenuMode(isFullScreen);
    if (isFullScreen) {
      setTimeout(() => this.forceVideoCentering(), 100);
    } else {
      this.resetVideoStyles();
    }
  }
  /**
   * 全画面時にビデオ要素を強制的に中央配置
   */
  forceVideoCentering() {
    const video = this.getVideo();
    if (!video) return;
    try {
      window.logger.info("ビデオ要素の強制中央配置を実行します");
      const screenWidth = window.innerWidth;
      const screenHeight = window.innerHeight;
      const screenRatio = screenWidth / screenHeight;
      const videoWidth = video.videoWidth || video.clientWidth;
      const videoHeight = video.videoHeight || video.clientHeight;
      const videoRatio = videoWidth / videoHeight;
      window.logger.info("サイズ情報:", {
        screen: { width: screenWidth, height: screenHeight, ratio: screenRatio },
        video: { width: videoWidth, height: videoHeight, ratio: videoRatio }
      });
      video.style.position = "fixed";
      video.style.top = "50%";
      video.style.left = "50%";
      video.style.transform = "translate(-50%, -50%)";
      video.style.zIndex = "1000";
      video.style.backgroundColor = "#000";
      if (videoRatio > screenRatio) {
        video.style.width = "100vw";
        video.style.height = "auto";
      } else {
        video.style.width = "auto";
        video.style.height = "100vh";
      }
      setTimeout(() => {
        if (this.commentSystem) {
          const renderer = this.commentSystem.renderer;
          if (renderer && renderer.resizeCanvas) {
            renderer.resizeCanvas();
            window.logger.info("コメントキャンバスのリサイズを実行しました");
          }
        }
      }, 50);
      window.logger.info("強制中央配置完了しました");
    } catch (error) {
      window.logger.error("ビデオ強制中央配置でエラーが発生しました:", error);
    }
  }
  /**
   * 設定メニューの表示モードを更新
   */
  updateSettingsMenuMode(isFullScreen) {
    const settingsMenu = this.shadow.querySelector("#player-settings-menu");
    if (settingsMenu) {
      settingsMenu.classList.toggle("fullscreen-mode", isFullScreen);
      settingsMenu.classList.toggle("windowed-mode", !isFullScreen);
    }
  }
  /**
   * 表示状態の制御
   */
  show() {
    this.classList.add("visible");
  }
  hide() {
    this.classList.remove("visible");
  }
  /**
   * プレイヤー再生（外部から呼ばれる）
   */
  playVideo() {
    if (this.userPaused || !this.video) {
      return;
    }
    this.video.play().catch((err) => window.logger.error("自動再生に失敗しました:", err));
  }
  /**
   * コンポーネントの破棄
   */
  disconnectedCallback() {
    document.removeEventListener("keydown", this.handleKeyboardShortcuts);
    this.clearHideTimer();
    this.video = null;
    this.commentSystem = null;
  }
  ensureInitialized() {
    if (this.initialized) return;
    if (!this.shadow || !this.shadow.firstElementChild) {
      window.logger.warn("シャドウDOMがまだ準備されていません");
      return;
    }
    this.setupEventListeners();
    this.setupInitialIcons();
    this.initialized = true;
    window.logger.info("PlayerControlsShadowの初期化が完了しました");
  }
  /**
   * ビデオ要素を取得（未設定ならDOMから自動検出）
   */
  getVideo() {
    if (this.video) return this.video;
    const v = document.getElementById("video-element");
    if (v) {
      this.video = v;
    }
    return this.video;
  }
  /**
   * マウスホバーイベントの設定
   */
  setupHoverEvents() {
    const playerContainer = this.closest(".custom-player") || this.parentElement;
    if (playerContainer) {
      playerContainer.addEventListener("mouseenter", () => {
        this.showControls();
      });
      playerContainer.addEventListener("mouseleave", () => {
        this.hideControlsWithDelay();
      });
      playerContainer.addEventListener("mousemove", () => {
        this.showControls();
        this.hideControlsWithDelay();
      });
    }
    this.addEventListener("mouseenter", () => {
      this.showControls();
      this.clearHideTimer();
    });
    this.addEventListener("mouseleave", () => {
      this.hideControlsWithDelay();
    });
  }
  /**
   * コントロールを表示
   */
  showControls() {
    this.classList.add("controls-visible");
    this.clearHideTimer();
  }
  /**
   * コントロールを遅延して非表示
   */
  hideControlsWithDelay() {
    if (this.classList.contains("always-visible")) {
      return;
    }
    this.clearHideTimer();
    this.mouseTimer = window.setTimeout(() => {
      this.classList.remove("controls-visible");
    }, 3e3);
  }
  /**
   * 非表示タイマーをクリア
   */
  clearHideTimer() {
    if (this.mouseTimer !== null) {
      clearTimeout(this.mouseTimer);
      this.mouseTimer = null;
    }
  }
  /**
   * ビデオスタイルのリセット（全画面解除時）
   */
  resetVideoStyles() {
    const video = this.getVideo();
    if (!video) return;
    try {
      window.logger.info("ビデオ要素のスタイルをリセットします");
      video.style.position = "";
      video.style.top = "";
      video.style.left = "";
      video.style.transform = "";
      video.style.zIndex = "";
      video.style.backgroundColor = "";
      video.style.width = "";
      video.style.height = "";
      window.logger.info("ビデオスタイルリセット完了しました");
    } catch (error) {
      window.logger.error("ビデオスタイルリセットでエラーが発生しました:", error);
    }
  }
}
if (!customElements.get("player-controls-shadow")) {
  customElements.define("player-controls-shadow", PlayerControlsShadow);
  window.logger.info("player-controls-shadowカスタムエレメントを登録しました！");
} else {
  window.logger.info("player-controls-shadowカスタムエレメントは既に登録済みです");
}

class CommentList extends HTMLElement {
  constructor() {
    super();
    this.list = null;
    this.comments = [];
    this.currentTime = 0;
    this.autoScroll = true;
    this.resizeObserver = null;
    this.shadow = this.attachShadow({ mode: "closed" });
    this.shadow.innerHTML = this.getTemplate();
    this.setupEventListeners();
  }
  /**
   * HTMLテンプレートを取得
   */
  getTemplate() {
    return `
      <style>
        ${this.getStyles()}
      </style>
      <div class="comment-list-container">
        <div class="comment-list-header">
          <span>コメントリスト</span>
        </div>
        <div class="comment-list"></div>
      </div>
    `;
  }
  /**
   * CSSスタイルを取得（シャドウDOM内で完全に分離）
   */
  getStyles() {
    return `
      :host {
        display: block;
        width: 400px;
        background: rgba(40, 40, 40, 0.95);
        border-radius: 8px;
        overflow: hidden;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        font-family: Arial, sans-serif;
        color: white;
        box-sizing: border-box;
        /* シャドウDOM内では外部スタイルの影響を受けない */
      }

      .comment-list-container {
        height: 100%;
        display: flex;
        flex-direction: column;
      }

      .comment-list-header {
        background: rgba(0, 123, 255, 0.8);
        padding: 12px 16px;
        font-weight: bold;
        font-size: 14px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        text-align: center;
      }

      .comment-list {
        flex: 1;
        overflow-y: auto;
        scrollbar-width: thin;
        scrollbar-color: rgba(255, 255, 255, 0.3) transparent;
      }

      .comment-list::-webkit-scrollbar {
        width: 6px;
      }

      .comment-list::-webkit-scrollbar-track {
        background: transparent;
      }

      .comment-list::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.3);
        border-radius: 3px;
      }

      .comment-list::-webkit-scrollbar-thumb:hover {
        background: rgba(255, 255, 255, 0.5);
      }

      .comment-item {
        padding: 8px 12px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        cursor: pointer;
        transition: background-color 0.2s;
        font-size: 13px;
        line-height: 1.4;
      }

      .comment-item:hover {
        background: rgba(255, 255, 255, 0.05);
      }

      .comment-item.active {
        background: rgba(0, 123, 255, 0.2);
        border-left: 3px solid #007bff;
        padding-left: 9px;
      }

      .comment-time {
        color: #80cbc4;
        font-size: 11px;
        font-family: monospace;
        margin-right: 8px;
        min-width: 45px;
        display: inline-block;
      }

      .comment-text {
        color: white;
        word-break: break-word;
        line-height: 1.3;
      }

      .comment-item:last-child {
        border-bottom: none;
      }

      /* 空の状態 */
      .comment-list:empty::before {
        content: "コメントがありません";
        display: block;
        text-align: center;
        padding: 40px 20px;
        color: rgba(255, 255, 255, 0.5);
        font-style: italic;
      }

      /* レスポンシブ対応 */
      @media (max-width: 1023px) {
        :host {
          width: 100%;
          max-width: 100vw;
          height: 300px;
          margin-top: 10px;
          border-radius: 0;
        }

        .comment-list-header {
          padding: 10px 12px;
          font-size: 13px;
        }

        .comment-item {
          padding: 6px 10px;
          font-size: 12px;
        }

        .comment-time {
          font-size: 10px;
          margin-right: 6px;
          min-width: 40px;
        }
      }

      /* 画面幅1024px以上での高さ自動調整 */
      @media (min-width: 1024px) {
        :host(.auto-height) {
          height: var(--player-height, 400px);
        }
      }
    `;
  }
  /**
   * コンポーネントがDOMに接続された時
   */
  connectedCallback() {
    this.list = this.shadow.querySelector(".comment-list");
    this.setupResizeObserver();
  }
  /**
   * イベントリスナーの設定
   */
  setupEventListeners() {
    this.setupScrollListener();
  }
  /**
   * リサイズ監視の設定
   */
  setupResizeObserver() {
    if (typeof ResizeObserver === "undefined") {
      window.logger.warn("ResizeObserverが利用できません...");
      window.addEventListener("resize", () => this.syncHeight());
      return;
    }
    this.resizeObserver = new ResizeObserver(() => {
      this.syncHeight();
    });
    const player = document.getElementById("custom-player");
    if (player) {
      this.resizeObserver.observe(player);
    }
  }
  /**
   * スクロールイベントの設定
   */
  setupScrollListener() {
    if (!this.list) return;
    this.list.addEventListener("scroll", () => {
      if (this.autoScroll && this.list) {
        const scrollDiff = this.list.scrollHeight - this.list.clientHeight - this.list.scrollTop;
        if (scrollDiff > 50) {
          this.autoScroll = false;
          setTimeout(() => this.autoScroll = true, 5e3);
        }
      }
    });
  }
  /**
   * プレイヤーの高さに同期
   */
  syncHeight() {
    const player = document.getElementById("custom-player");
    if (!player) return;
    if (window.innerWidth > 1023) {
      const playerHeight = player.offsetHeight;
      this.style.setProperty("--player-height", `${playerHeight}px`);
      this.classList.add("auto-height");
    } else {
      this.classList.remove("auto-height");
    }
  }
  /**
   * コメントの追加
   */
  addComments(comments) {
    this.comments = comments.sort((a, b) => a.vposMs - b.vposMs);
    this.renderComments();
  }
  /**
   * コメントリストのレンダリング
   */
  renderComments() {
    if (!this.list) return;
    this.list.innerHTML = "";
    this.comments.forEach((comment) => {
      const item = document.createElement("div");
      item.className = "comment-item";
      item.dataset.vpos = comment.vposMs.toString();
      const time = this.formatTime(comment.vposMs / 1e3);
      item.innerHTML = `
        <span class="comment-time">${time}</span>
        <span class="comment-text">${this.escapeHtml(comment.body)}</span>
      `;
      item.addEventListener("click", () => {
        const videoElement = document.getElementById("video-element");
        if (videoElement) {
          videoElement.currentTime = comment.vposMs / 1e3;
        }
      });
      if (this.list) {
        this.list.appendChild(item);
      }
    });
  }
  /**
   * HTMLエスケープ
   */
  escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }
  /**
   * 表示時間の更新
   */
  updateTime(currentTimeMs) {
    this.currentTime = currentTimeMs;
    if (!this.list) return;
    const items = this.list.querySelectorAll(".comment-item");
    items.forEach((item) => {
      const vpos = parseInt(item.dataset.vpos || "0");
      item.classList.toggle("active", vpos <= currentTimeMs && vpos > currentTimeMs - 5e3);
    });
    if (this.autoScroll) {
      const activeItems = this.list.querySelectorAll(".comment-item.active");
      if (activeItems.length > 0) {
        const lastActive = activeItems[activeItems.length - 1];
        const list = this.list;
        const itemTop = lastActive.offsetTop;
        const itemBottom = itemTop + lastActive.offsetHeight;
        if (itemBottom > list.scrollTop + list.clientHeight) {
          list.scrollTop = itemBottom - list.clientHeight;
        } else if (itemTop < list.scrollTop) {
          list.scrollTop = itemTop;
        }
      }
    }
  }
  /**
   * 秒数をMM:SS形式に変換
   */
  formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    seconds = Math.floor(seconds % 60);
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  }
  /**
   * コメントリストの表示/非表示を切り替え
   */
  setVisible(visible) {
    this.style.display = visible ? "block" : "none";
  }
  /**
   * コメントをクリア
   */
  clearComments() {
    this.comments = [];
    if (this.list) {
      this.list.innerHTML = "";
    }
  }
  /**
   * コンポーネントがDOMから切断された時
   */
  disconnectedCallback() {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
    window.removeEventListener("resize", () => this.syncHeight());
  }
}
if (!customElements.get("comment-list-shadow")) {
  customElements.define("comment-list-shadow", CommentList);
}

class CommentRenderer {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.comments = [];
    this.videoElement = null;
    this.isPlaying = true;
    this.isVisible = true;
    this.opacity = COMMENT_RENDERER_CONFIG.OPACITY;
    this.lastTime = 0;
    this.commentDuration = COMMENT_RENDERER_CONFIG.COMMENT_DURATION_MS;
    this.fontSize = COMMENT_RENDERER_CONFIG.DEFAULT_FONT_SIZE;
    this.defaultColor = COMMENT_RENDERER_CONFIG.DEFAULT_COLOR;
    this.maxCommentLength = COMMENT_RENDERER_CONFIG.MAX_COMMENT_LENGTH;
    this.pausedComments = /* @__PURE__ */ new Set();
    // 一時停止時のコメントを保持
    this.strokeWidth = COMMENT_RENDERER_CONFIG.STROKE_WIDTH;
    // 縁取りの太さ
    this.strokeColor = COMMENT_RENDERER_CONFIG.STROKE_COLOR;
    // 縁取りの色
    this.laneHeight = 0;
    // レーンの高さ
    this.maxLanes = 0;
    // 最大レーン数
    this.vposThreshold = COMMENT_RENDERER_CONFIG.VPOS_THRESHOLD_MS;
    // 近傍とみなすミリ秒差
    this.commentGroups = [];
    // グループ化されたコメントを保持
    this.pausedTime = 0;
    // 一時停止時の時間を保持
    this.activeComments = /* @__PURE__ */ new Set();
    // アクティブなコメントを保持
    this.laneStates = [];
    // レーンの使用状態を管理
    this.lastRenderTime = 0;
    this.renderInterval = 1e3 / COMMENT_RENDERER_CONFIG.RENDER_FPS;
    // レンダリング間隔
    this.cleanupInterval = COMMENT_RENDERER_CONFIG.CLEANUP_INTERVAL_MS;
    // クリーンアップ間隔
    this.lastCleanup = 0;
    this.animationFrameId = null;
    this.resizeObserver = null;
    // 動的リサイズ監視用
    // 仮想拡張キャンバス関連
    this.virtualExtendedLeftWidth = 0;
    // 左側の仮想拡張領域の幅
    this.virtualExtendedRightWidth = 0;
    // 右側の仮想拡張領域の幅
    this.virtualCanvasWidth = 0;
    // 仮想キャンバスの全体幅
    this.virtualExtendRatio = COMMENT_RENDERER_CONFIG.VIRTUAL_EXTEND_RATIO;
  }
  // 仮想拡張領域の比率
  /**
   * コメントレンダラーを初期化
   */
  initialize(videoElement) {
    window.logger.info("CommentRendererの初期化を開始します！");
    this.videoElement = videoElement;
    this.setupCanvas();
    this.setupVideoEventListeners();
    this.startAnimation();
    window.logger.info("CommentRendererの初期化が完了しました！");
  }
  /**
   * 動画要素のイベントリスナーを設定
   */
  setupVideoEventListeners() {
    if (!this.videoElement) return;
    this.videoElement.addEventListener("play", () => {
      window.logger.debug("動画再生開始しました！");
      this.isPlaying = true;
      this.lastTime = this.videoElement.currentTime * 1e3;
    });
    this.videoElement.addEventListener("pause", () => {
      window.logger.debug("動画一時停止しました！");
      this.isPlaying = false;
      this.pausedTime = this.videoElement.currentTime * 1e3;
    });
    this.videoElement.addEventListener("seeking", () => {
      window.logger.debug("シーク操作を検知しました！");
      this.handleSeek();
    });
    this.videoElement.addEventListener("waiting", () => {
      window.logger.debug("バッファリング中です...");
      this.isPlaying = false;
    });
    this.videoElement.addEventListener("playing", () => {
      window.logger.debug("再生再開しました！");
      this.isPlaying = true;
      this.lastTime = this.videoElement.currentTime * 1e3;
    });
    this.videoElement.addEventListener("error", (e) => {
      window.logger.error("動画再生エラーが発生しました！", e);
    });
  }
  /**
   * キャンバスのセットアップ
   */
  setupCanvas() {
    const existingCanvas = document.getElementById("comment-canvas");
    if (existingCanvas) {
      existingCanvas.remove();
    }
    this.canvas = document.createElement("canvas");
    this.canvas.id = "comment-canvas";
    this.canvas.style.position = "absolute";
    this.canvas.style.top = "0";
    this.canvas.style.left = "0";
    this.canvas.style.width = "100%";
    this.canvas.style.height = "100%";
    this.canvas.style.pointerEvents = "none";
    this.canvas.style.zIndex = "1";
    this.canvas.setAttribute("style", this.canvas.getAttribute("style") + " pointer-events: none !important;");
    this.canvas.addEventListener("click", (e) => {
      e.stopPropagation();
      return true;
    }, false);
    const videoContainer = document.querySelector(".video-container");
    if (!videoContainer) {
      throw new Error("video-containerが見つかりません！");
    }
    const video = document.getElementById("video-element");
    if (!video) {
      throw new Error("video要素が見つかりません！");
    }
    video.insertAdjacentElement("afterend", this.canvas);
    this.ctx = this.canvas.getContext("2d");
    this.resizeCanvas();
    window.addEventListener("resize", () => this.resizeCanvas());
    if (typeof ResizeObserver !== "undefined" && this.videoElement) {
      this.resizeObserver = new ResizeObserver(() => {
        this.resizeCanvas();
      });
      this.resizeObserver.observe(this.videoElement);
    }
    document.addEventListener("fullscreenchange", () => this.resizeCanvas());
  }
  /**
   * キャンバスのリサイズ
   */
  resizeCanvas() {
    if (!this.canvas || !this.videoElement) return;
    try {
      let rect = this.videoElement.getBoundingClientRect();
      const doc = document;
      const isFullscreen = doc.fullscreenElement || doc.webkitFullscreenElement || doc.mozFullScreenElement || doc.msFullscreenElement || document.documentElement.classList.contains("fullscreen-active") || document.body.classList.contains("nc-fullscreen-active");
      if (isFullscreen) {
        const videoStyle = window.getComputedStyle(this.videoElement);
        if (videoStyle.position === "fixed") {
          rect = this.videoElement.getBoundingClientRect();
          this.canvas.style.position = "fixed";
          this.canvas.style.top = `${rect.top}px`;
          this.canvas.style.left = `${rect.left}px`;
          this.canvas.style.width = `${rect.width}px`;
          this.canvas.style.height = `${rect.height}px`;
          this.canvas.style.zIndex = "1001";
          window.logger.info("ビデオ固定位置でキャンバスを配置:", { rect, videoPosition: videoStyle.position });
        } else {
          rect = {
            width: window.innerWidth,
            height: window.innerHeight,
            top: 0,
            left: 0,
            right: window.innerWidth,
            bottom: window.innerHeight,
            x: 0,
            y: 0
          };
          this.canvas.style.position = "absolute";
          this.canvas.style.top = "0";
          this.canvas.style.left = "0";
          this.canvas.style.width = "100%";
          this.canvas.style.height = "100%";
          this.canvas.style.zIndex = "1";
          window.logger.info("通常全画面モードでキャンバスサイズを調整します:", rect);
        }
      } else {
        this.canvas.style.position = "absolute";
        this.canvas.style.top = "0";
        this.canvas.style.left = "0";
        this.canvas.style.width = "100%";
        this.canvas.style.height = "100%";
        this.canvas.style.zIndex = "1";
      }
      if (rect.width <= 0 || rect.height <= 0) {
        window.logger.warn("無効なキャンバスサイズです:", rect);
        const videoContainer = document.querySelector(".video-container");
        if (videoContainer) {
          const containerRect = videoContainer.getBoundingClientRect();
          if (containerRect.width > 0 && containerRect.height > 0) {
            this.canvas.width = containerRect.width;
            this.canvas.height = containerRect.height;
            window.logger.info("コンテナサイズを使用してキャンバスを調整しました:", containerRect);
          } else {
            return;
          }
        } else {
          return;
        }
      } else {
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;
      }
      this.virtualExtendedLeftWidth = Math.ceil(this.canvas.width * this.virtualExtendRatio);
      this.virtualExtendedRightWidth = Math.ceil(this.canvas.width * this.virtualExtendRatio);
      this.virtualCanvasWidth = this.virtualExtendedLeftWidth + this.canvas.width + this.virtualExtendedRightWidth;
      window.logger.info("仮想拡張キャンバスを設定しました！", {
        visible: this.canvas.width,
        virtualLeft: this.virtualExtendedLeftWidth,
        virtualRight: this.virtualExtendedRightWidth,
        total: this.virtualCanvasWidth,
        isFullscreen: !!isFullscreen
      });
      this.videoElement.style.width = "100%";
      this.videoElement.style.height = "auto";
      this.calculateFontSize();
      this.laneHeight = this.fontSize * 1.2;
      const calculatedLanes = Math.floor(this.canvas.height / this.laneHeight);
      this.maxLanes = Math.min(
        calculatedLanes,
        COMMENT_RENDERER_CONFIG.MAX_LANES_LIMIT
      );
      if (this.maxLanes <= 0) {
        window.logger.warn("無効なレーン数です:", this.maxLanes);
        this.maxLanes = 10;
      }
      this.laneStates = Array.from({ length: this.maxLanes }, () => null);
      window.logger.info("キャンバスとレーンの初期化完了しました！", {
        width: this.canvas.width,
        height: this.canvas.height,
        fontSize: this.fontSize,
        laneHeight: this.laneHeight,
        maxLanes: this.maxLanes,
        isFullscreen: !!isFullscreen
      });
      this.recalcCommentMetrics();
    } catch (error) {
      window.logger.error("キャンバスのリサイズに失敗しました:", error);
      this.maxLanes = 10;
      this.laneStates = Array.from({ length: this.maxLanes }, () => null);
    }
  }
  /**
   * アニメーションを開始
   */
  startAnimation() {
    const animate = (timestamp) => {
      this.animate(timestamp);
      this.animationFrameId = requestAnimationFrame(animate);
    };
    this.animationFrameId = requestAnimationFrame(animate);
  }
  /**
   * アニメーションフレームごとの処理
   */
  animate(timestamp) {
    if (!this.ctx || !this.videoElement) return;
    if (timestamp - this.lastRenderTime < this.renderInterval) {
      return;
    }
    const currentTime = this.videoElement.currentTime * 1e3;
    if (timestamp - this.lastCleanup > this.cleanupInterval) {
      this.cleanup(currentTime);
      this.lastCleanup = timestamp;
    }
    this.renderComments(currentTime);
    this.lastRenderTime = timestamp;
  }
  /**
   * 古いコメントのクリーンアップ
   */
  cleanup(currentTime, force = false) {
    this.activeComments.forEach((comment) => {
      if (force) {
        this.activeComments.delete(comment);
        return;
      }
      if (comment.startTime === void 0 || comment.initialX === void 0 || comment.speed === void 0 || comment.width === void 0) {
        return;
      }
      const elapsed = currentTime - comment.startTime;
      const virtualX = comment.initialX - elapsed * comment.speed;
      if (virtualX + comment.width < -this.virtualExtendedLeftWidth) {
        this.activeComments.delete(comment);
      }
    });
    this.commentGroups = this.commentGroups.filter(
      (group) => group.some((comment) => this.activeComments.has(comment))
    );
  }
  /**
   * レンダリング
   */
  renderComments(currentTime) {
    if (!this.ctx || !this.canvas || !this.isVisible) return;
    this.ctx.font = `${this.fontSize}px Arial`;
    this.ctx.textBaseline = "top";
    this.ctx.globalAlpha = this.opacity;
    this.ctx.lineWidth = this.strokeWidth;
    this.ctx.strokeStyle = this.strokeColor;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    const renderTime = this.isPlaying ? currentTime : this.pausedTime;
    this.comments.forEach((comment) => {
      const isInRange = comment.vposMs <= renderTime && renderTime < comment.vposMs + this.commentDuration;
      if (isInRange && !this.activeComments.has(comment)) {
        comment.startTime = renderTime - (renderTime - comment.vposMs);
        if (!comment.width && this.ctx) {
          comment.width = this.ctx.measureText(comment.body.substring(0, this.maxCommentLength)).width;
        }
        this.activeComments.add(comment);
        this.assignToGroup(comment, renderTime);
      }
    });
    const canvasWidth = this.canvas.width;
    this.commentGroups.forEach((group) => {
      const activeGroupComments = group.filter((comment) => this.activeComments.has(comment));
      if (activeGroupComments.length > 0) {
        activeGroupComments.forEach((comment) => {
          if (comment.startTime === void 0 || comment.initialX === void 0 || comment.speed === void 0 || comment.fixedY === void 0) return;
          const elapsed = currentTime - comment.startTime;
          const virtualX = comment.initialX - elapsed * comment.speed;
          const actualX = virtualX - this.virtualExtendedLeftWidth;
          const commentEndX = actualX + (comment.width || 0);
          const isVisible = actualX < canvasWidth && commentEndX > 0 || !!comment.forceVisible;
          if (comment.width && virtualX + comment.width < -this.virtualExtendedLeftWidth) {
            this.activeComments.delete(comment);
            return;
          }
          if (isVisible) {
            this.drawCommentWithStroke(
              comment.body.substring(0, this.maxCommentLength),
              actualX,
              comment.fixedY,
              comment.color || this.defaultColor
            );
          }
        });
      }
    });
  }
  /**
   * コメントをグループに割り当て
   */
  assignToGroup(comment, currentTime) {
    let foundGroup = this.commentGroups.find(
      (group) => group.some((c) => Math.abs(c.vposMs - comment.vposMs) <= this.vposThreshold)
    );
    if (!foundGroup) {
      foundGroup = [comment];
      this.commentGroups.push(foundGroup);
    } else {
      if (!foundGroup.includes(comment)) {
        foundGroup.push(comment);
      }
    }
    foundGroup.sort((a, b) => a.vposMs - b.vposMs);
    const groupIndex = foundGroup.indexOf(comment);
    let lane = null;
    if (groupIndex === 0) {
      lane = this.findAvailableLane(currentTime, comment.width);
    } else {
      const prevComment = foundGroup[groupIndex - 1];
      const preferredLane = prevComment.fixedLane !== void 0 ? prevComment.fixedLane + 1 : 0;
      lane = this.findAvailableLane(currentTime, comment.width, preferredLane);
    }
    comment.fixedLane = lane;
    comment.fixedY = lane * this.laneHeight;
    comment.initialX = this.virtualExtendedLeftWidth + (this.canvas?.width ?? 0) + this.virtualExtendedRightWidth;
    const visibleDistance = (this.canvas?.width ?? 0) + (comment.width ?? 0);
    comment.speed = visibleDistance / this.commentDuration;
  }
  /**
   * シーク時の処理
   */
  handleSeek() {
    const currentTime = this.videoElement?.currentTime ?? 0;
    this.activeComments.clear();
    this.commentGroups = [];
    this.lastTime = currentTime * 1e3;
    this.pausedTime = currentTime * 1e3;
  }
  /**
   * フォントサイズの計算
   */
  calculateFontSize() {
    if (!this.canvas) return;
    const targetLines = 11;
    const calculatedSize = Math.floor(this.canvas.height / targetLines);
    this.fontSize = Math.max(COMMENT_RENDERER_CONFIG.MIN_FONT_SIZE, calculatedSize);
  }
  /**
   * コメントの表示/非表示を切り替え
   */
  setVisible(visible) {
    this.isVisible = visible;
    if (this.canvas) {
      this.canvas.style.display = visible ? "block" : "none";
    }
    if (!visible) {
      this.clearCanvas();
    }
  }
  /**
   * キャンバスをクリア
   */
  clearCanvas() {
    if (this.ctx && this.canvas) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }
  /**
   * 縁取り付きテキスト描画
   */
  drawCommentWithStroke(text, x, y, color) {
    if (!this.ctx) return;
    this.ctx.strokeStyle = this.strokeColor;
    this.ctx.lineWidth = this.strokeWidth;
    this.ctx.strokeText(text, x, y);
    this.ctx.fillStyle = color;
    this.ctx.fillText(text, x, y);
  }
  /**
   * コメントを追加
   */
  addComment(comment) {
    if (this.ctx) {
      this.ctx.font = `${this.fontSize}px Arial`;
      const width = this.ctx.measureText(comment.body.substring(0, this.maxCommentLength)).width;
      comment.width = width;
    }
    this.comments.push(comment);
    this.comments.sort((a, b) => a.vposMs - b.vposMs);
    this.calculateCommentGroups();
  }
  /**
   * コメントのグループ化
   */
  calculateCommentGroups() {
    this.commentGroups = [];
    let currentGroup = [];
    this.comments.forEach((comment) => {
      if (currentGroup.length === 0) {
        currentGroup.push(comment);
      } else {
        const lastComment = currentGroup[currentGroup.length - 1];
        if (Math.abs(comment.vposMs - lastComment.vposMs) <= this.vposThreshold) {
          currentGroup.push(comment);
        } else {
          currentGroup.forEach((c, index) => {
            c.group = this.commentGroups.length;
            c.groupIndex = index;
          });
          this.commentGroups.push([...currentGroup]);
          currentGroup = [comment];
        }
      }
    });
    if (currentGroup.length > 0) {
      currentGroup.forEach((c, index) => {
        c.group = this.commentGroups.length;
        c.groupIndex = index;
      });
      this.commentGroups.push(currentGroup);
    }
  }
  /**
   * レーンが利用可能かチェック
   */
  isLaneAvailable(lane, currentTime, commentWidth) {
    if (lane >= this.maxLanes) return false;
    if (!this.canvas) return false;
    const canvas = this.canvas;
    const canvasWidth = canvas.width;
    if (commentWidth === void 0) {
      return false;
    }
    for (const existingComment of this.activeComments) {
      if (existingComment.fixedLane === lane && existingComment.initialX !== void 0 && existingComment.startTime !== void 0 && existingComment.speed !== void 0) {
        const existingWidth = existingComment.width || 0;
        const virtualX = existingComment.initialX - (currentTime - existingComment.startTime) * existingComment.speed;
        const actualX = virtualX - this.virtualExtendedLeftWidth;
        const existingEndX = actualX + existingWidth;
        const overlapThreshold = Math.max(commentWidth, existingWidth) / 3;
        if (existingEndX > canvasWidth - overlapThreshold) {
          return false;
        }
        if (commentWidth > existingWidth * 1.5 && existingEndX > canvasWidth - commentWidth) {
          return false;
        }
      }
    }
    return true;
  }
  /**
   * 利用可能なレーンを探す
   */
  findAvailableLane(currentTime, commentWidth, preferredLane = null) {
    if (preferredLane !== null && preferredLane < this.maxLanes && this.isLaneAvailable(preferredLane, currentTime, commentWidth)) {
      return preferredLane;
    }
    if (commentWidth && this.canvas) {
      const canvasWidth = this.canvas.width;
      const lengthRatio = commentWidth / canvasWidth;
      if (lengthRatio > 0.5) {
        const startLane = Math.floor(this.maxLanes / 2);
        for (let lane = this.maxLanes - 1; lane >= startLane; lane--) {
          if (this.isLaneAvailable(lane, currentTime, commentWidth)) {
            return lane;
          }
        }
        for (let lane = startLane - 1; lane >= 0; lane--) {
          if (this.isLaneAvailable(lane, currentTime, commentWidth)) {
            return lane;
          }
        }
      } else {
        const endLane = Math.floor(this.maxLanes / 2);
        for (let lane = 0; lane < endLane; lane++) {
          if (this.isLaneAvailable(lane, currentTime, commentWidth)) {
            return lane;
          }
        }
        for (let lane = endLane; lane < this.maxLanes; lane++) {
          if (this.isLaneAvailable(lane, currentTime, commentWidth)) {
            return lane;
          }
        }
      }
    }
    for (let lane = 0; lane < this.maxLanes; lane++) {
      if (this.isLaneAvailable(lane, currentTime, commentWidth)) {
        return lane;
      }
    }
    return Math.floor(Math.random() * this.maxLanes);
  }
  /**
   * 複数のコメントを追加
   */
  addComments(comments) {
    comments.forEach((comment) => this.addComment(comment));
  }
  /**
   * コメントをクリア
   */
  clearComments() {
    this.comments = [];
    this.activeComments.clear();
    this.commentGroups = [];
    this.laneStates = Array.from({ length: this.maxLanes }, () => null);
    this.clearCanvas();
    window.logger.info("コメントをクリアしました！");
  }
  /**
   * 透明度を設定する
   * @param opacity 透明度（0.0～1.0の範囲）
   */
  setOpacity(opacity) {
    if (opacity < 0 || opacity > 1) {
      window.logger.warn(`透明度の範囲外の値が指定されました: ${opacity}、範囲は0.0～1.0です`);
      opacity = Math.max(0, Math.min(1, opacity));
    }
    this.opacity = opacity;
    window.logger.info(`コメントの透明度を ${opacity} に設定しました`);
  }
  /**
   * デフォルトの色を設定する
   * @param color 色コード（例: "#FFFFFF"）
   */
  setDefaultColor(color) {
    if (!/^#([0-9A-F]{3}){1,2}$/i.test(color)) {
      window.logger.warn(`無効な色コードです: ${color}、デフォルト色を使用します`);
      return;
    }
    this.defaultColor = color;
    window.logger.info(`コメントのデフォルト色を ${color} に設定しました`);
  }
  /**
   * レンダラーの破棄
   */
  destroy() {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
    window.removeEventListener("resize", () => this.resizeCanvas());
    if (this.canvas) {
      this.canvas.remove();
    }
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
    this.comments = [];
    this.activeComments.clear();
    this.commentGroups = [];
  }
  /**
   * コメント幅・速度をリサイズ後に補正する関数
   * フルスクリーン切り替え時などにフォントサイズが変わっても
   * 位置連続性を保ったまま正確な幅・速度で削除判定を行います
   */
  recalcCommentMetrics() {
    if (!this.ctx || !this.canvas) return;
    const currentTime = this.videoElement?.currentTime ?? 0;
    const now = currentTime * 1e3;
    this.ctx.font = `${this.fontSize}px Arial`;
    this.activeComments.forEach((c) => {
      if (c.startTime === void 0 || c.initialX === void 0 || c.speed === void 0) return;
      const elapsed = now - c.startTime;
      const virtualX = c.initialX - elapsed * c.speed;
      const newWidth = this.ctx.measureText(
        c.body.substring(0, this.maxCommentLength)
      ).width;
      const visibleDist = this.canvas.width + newWidth;
      const newSpeed = visibleDist / this.commentDuration;
      c.initialX = virtualX + elapsed * newSpeed;
      c.speed = newSpeed;
      c.width = newWidth;
      if (c.fixedLane !== void 0) {
        c.fixedY = c.fixedLane * this.laneHeight;
      }
    });
    this.comments.forEach((c) => {
      if (c.startTime !== void 0) return;
      const newWidth = this.ctx.measureText(
        c.body.substring(0, this.maxCommentLength)
      ).width;
      c.width = newWidth;
      const visibleDist = this.canvas.width + newWidth;
      c.speed = visibleDist / this.commentDuration;
    });
    window.logger.info("コメントの幅・速度を再計算しました！", {
      activeComments: this.activeComments.size,
      queuedComments: this.comments.filter((c) => c.startTime === void 0).length,
      fontSize: this.fontSize,
      canvasWidth: this.canvas.width
    });
  }
}

class CommentFetcher {
  /**
   * 動画IDからAPIデータを取得し、コメントを取得
   */
  async fetchAllComments(videoId) {
    try {
      window.logger.info(`コメント一括取得を開始します！ VideoID: ${videoId}`);
      const res = await window.commonHelper.fetchNicoDataWithComments(videoId);
      if (!res) throw new Error("統合データの取得に失敗しました");
      const normalizedComments = res.mainThread.comments.map((c) => {
        const vpos = Math.round((c.vposMs ?? 0) / 10);
        const out = {
          // 共有フィールド
          id: c.id,
          no: c.no,
          body: c.body,
          commands: c.commands,
          userId: c.userId,
          isPremium: c.isPremium,
          score: c.score,
          nicoruCount: c.nicoruCount,
          nicoruId: c.nicoruId,
          source: c.source,
          isMyPost: c.isMyPost,
          // 差分フィールド
          vpos,
          vposMs: c.vposMs
        };
        return out;
      });
      const thread = {
        commentCount: res.mainThread.commentCount,
        fork: res.mainThread.fork,
        comments: normalizedComments
      };
      return { data: { threads: [thread] } };
    } catch (error) {
      window.logger.error("fetchNicoDataWithCommentsでの取得に失敗しました...", error);
      throw error;
    }
  }
}

const CONSTANTS = {
  // APIエンドポイント
  API_ENDPOINT: "https://public.nvcomment.nicovideo.jp/v1/threads",
  // グローバルオブジェクト名
  GLOBAL_DATA_KEY: "CommentFilter2Data",
  // フォーク種別
  FORK_TYPES: {
    MAIN: "main",
    EASY: "easy",
    OWNER: "owner"
  },
  // NGワードルール形式
  RULE_DEFAULTS: {
    EMPTY_REPLACE: "EMPTY",
    ALL_SMID: "ALL",
    DEFAULT_NICORU: "EMPTY"
  },
  // IndexedDB設定
  DB_CONFIG: {
    NAME: "CommentFilter2DB",
    VERSION: 1,
    STORES: {
      RULES: "rules",
      SETTINGS: "settings"
    }
  },
  // カスタムイベント
  EVENTS: {
    DATA_UPDATED: "cf2:data-updated",
    SMID_CHANGED: "cf2:smid-changed"
  }
};

class CommentSystem {
  constructor() {
    this.videoElement = null;
    this.isVisible = true;
    this.ngWords = [];
    this.ngRegex = [];
    this.commentContainer = null;
    this.comments = [];
    this.isInitialized = false;
    this.hasReceivedFilteredData = false;
    // timeUpdateリスナーの参照を保持
    this.abortController = null;
    // イベントハンドラーをプロパティとして保持
    this._handleCommentFilter2Update = (event) => {
      const customEvent = event;
      const detail = customEvent.detail;
      if (detail && typeof detail === "object" && "filteredData" in detail) {
        window.logger.debug("CommentFilter2からフィルタリング済みデータを受け取りました！");
        this.applyFilteredComments(detail.filteredData);
      }
    };
    this.renderer = new CommentRenderer();
    this.fetcher = new CommentFetcher();
    this.commentList = new CommentList();
  }
  /**
   * コメントシステムの初期化
   */
  async initialize(videoElement) {
    await Promise.resolve();
    try {
      window.logger.info("コメントシステムの初期化を開始します！");
      if (this.isInitialized) {
        window.logger.info("既存のコメントシステムをリセットします！");
        this.renderer.destroy();
        this.commentList.clearComments();
        this.hasReceivedFilteredData = false;
      }
      this.videoElement = videoElement;
      if (this._timeUpdateHandler && this.videoElement) {
        this.videoElement.removeEventListener("timeupdate", this._timeUpdateHandler);
      }
      this.renderer = new CommentRenderer();
      this.renderer.initialize(videoElement);
      this.setupTimeUpdateListener();
      this.setupCommentFilter2Listener();
      this.restoreVisibilityState();
      this.commentContainer = document.createElement("div");
      this.commentContainer.className = "comment-container";
      this.commentContainer.appendChild(this.commentList);
      const customPlayer = document.getElementById("custom-player");
      if (customPlayer) {
        let wrapper = customPlayer.parentElement;
        if (!wrapper || !wrapper.classList.contains("video-with-comments")) {
          wrapper = document.createElement("div");
          wrapper.className = "video-with-comments";
          customPlayer.parentNode?.insertBefore(wrapper, customPlayer);
          wrapper.appendChild(customPlayer);
        }
        wrapper.appendChild(this.commentContainer);
      } else {
        this.videoElement.parentElement?.appendChild(this.commentContainer);
      }
      this.hideOfficialCommentPanel();
      this.hideOfficialCommentOverlay();
      this.isInitialized = true;
      window.logger.info("コメントシステムの初期化が完了しました！");
    } catch (error) {
      window.logger.error("コメントシステムの初期化に失敗しました...", error);
      throw error;
    }
  }
  /**
   * 時間更新イベントのリスナー設定
   */
  setupTimeUpdateListener() {
    if (!this.videoElement) return;
    this._timeUpdateHandler = () => {
      const currentTimeMs = this.videoElement.currentTime * 1e3;
      this.commentList.updateTime(currentTimeMs);
    };
    this.videoElement.addEventListener("timeupdate", this._timeUpdateHandler);
  }
  /**
   * CommentFilter2からのフィルタリング済みコメントを受け取るイベントリスナー設定
   */
  setupCommentFilter2Listener() {
    if (!this.videoElement) return;
    this.videoElement.removeEventListener("commentFilter2Update", this._handleCommentFilter2Update);
    this.videoElement.addEventListener("commentFilter2Update", this._handleCommentFilter2Update);
  }
  /**
   * コメントの表示状態をローカルストレージから復元
   */
  restoreVisibilityState() {
    const savedVisibility = localStorage.getItem("commentVisible");
    if (savedVisibility !== null) {
      this.isVisible = savedVisibility === "true";
      this.renderer.setVisible(this.isVisible);
    }
  }
  /**
   * CommentFilter2からのフィルタリング済みコメントを適用
   */
  applyFilteredComments(apiResponse) {
    window.logger.info("CommentFilter2からフィルタ済みコメントを受け取りました！", apiResponse);
    this.hasReceivedFilteredData = true;
    if (this.abortController) {
      this.abortController.abort();
      window.logger.info("既存のAPIフェッチをキャンセルしました！");
    }
    this.renderer.clearComments();
    this.commentList.clearComments();
    let comments = apiResponse.data.threads.flatMap((thread) => thread.comments);
    comments = comments.map((comment) => {
      comment.vposMs = comment.vpos * 10;
      return comment;
    });
    const filteredComments = this.filterNGComments(comments);
    window.logger.info(`CommentFilter2適用後のコメント数です: ${filteredComments.length}`);
    this.commentList.addComments(filteredComments);
    filteredComments.forEach((c) => this.renderer.addComment(c));
  }
  /**
   * 動画IDからコメントを読み込む
   */
  async loadComments(videoId) {
    if (!this.isInitialized) {
      throw new Error("コメントシステムが初期化されていません");
    }
    if (this.abortController) {
      this.abortController.abort();
    }
    this.abortController = new AbortController();
    if (this.hasReceivedFilteredData) {
      window.logger.info("CommentFilter2のコメントを既に描画しているのでフェッチをスキップします！");
      return;
    }
    try {
      window.logger.info(`コメント読み込み開始します: ${videoId}`);
      const apiResponse = await this.fetcher.fetchAllComments(videoId);
      window.logger.info(`コメント読み込み完了しました: ${videoId}`, apiResponse);
      let comments = apiResponse.data.threads.flatMap((thread) => thread.comments);
      window.logger.info(`取得したコメント数です: ${comments.length}`);
      comments = comments.map((comment) => {
        comment.vposMs = comment.vpos * 10;
        return comment;
      });
      const filteredComments = this.filterNGComments(comments);
      window.logger.info(`フィルタ後のコメント数です: ${filteredComments.length}`);
      if (this.hasReceivedFilteredData) {
        window.logger.info("APIフェッチ中にCommentFilter2データが到着したため、API側の描画をキャンセルします！");
        return;
      }
      this.commentList.addComments(filteredComments);
      filteredComments.forEach((c) => this.renderer.addComment(c));
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        window.logger.info("CommentFilter2データが先に到着したため、APIフェッチを中断しました！");
        return;
      }
      window.logger.error("コメント読み込みエラーが発生しました！", error);
      throw error;
    } finally {
      this.abortController = null;
    }
  }
  /**
   * コメントをNGワード/正規表現でフィルタリング
   */
  filterNGComments(comments) {
    if (this.ngWords.length === 0 && this.ngRegex.length === 0) {
      return comments;
    }
    return comments.filter((comment) => {
      const text = comment.body.toLowerCase();
      const containsNgWord = this.ngWords.some(
        (word) => text.includes(word.toLowerCase())
      );
      if (containsNgWord) return false;
      const matchesNgRegex = this.ngRegex.some(
        (regex) => regex.test(text)
      );
      return !matchesNgRegex;
    });
  }
  /**
   * コメントの表示/非表示を切り替え
   */
  toggleVisibility() {
    this.isVisible = !this.isVisible;
    this.renderer.setVisible(this.isVisible);
    localStorage.setItem("commentVisible", this.isVisible.toString());
    return this.isVisible;
  }
  /**
   * コメントを追加（外部からのコメント追加用）
   */
  addComment(comment) {
    if (this.isCommentAllowed(comment)) {
      this.renderer.addComment(comment);
    }
  }
  /**
   * コメントがNGフィルタに引っかからないかチェック
   */
  isCommentAllowed(comment) {
    const text = comment.body.toLowerCase();
    const containsNgWord = this.ngWords.some(
      (word) => text.includes(word.toLowerCase())
    );
    if (containsNgWord) return false;
    const matchesNgRegex = this.ngRegex.some(
      (regex) => regex.test(text)
    );
    return !matchesNgRegex;
  }
  /**
   * コメントの表示/非表示状態を取得
   */
  getVisibility() {
    return this.isVisible;
  }
  /**
   * リソースのクリーンアップ
   */
  cleanup() {
    window.logger.info("コメントシステムのクリーンアップを開始します！");
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    if (window.CommentFilterState) {
      window.CommentFilterState.isVideoPlayerActive = false;
      window.CommentFilterState.fetchProxyEnabled = true;
    }
    if (this.commentContainer) {
      this.commentContainer.remove();
      this.commentContainer = null;
    }
    if (this.videoElement) {
      if (this._timeUpdateHandler) {
        this.videoElement.removeEventListener("timeupdate", this._timeUpdateHandler);
        this._timeUpdateHandler = void 0;
      }
      this.videoElement.removeEventListener("commentFilter2Update", this._handleCommentFilter2Update);
    }
    this.videoElement = null;
    this.comments = [];
    this.isInitialized = false;
    this.hasReceivedFilteredData = false;
    this.renderer.destroy();
    this.commentList.remove();
    window.logger.info("コメントシステムのリソースをクリーンアップしました！");
  }
  /**
   * コメントの透明度を設定
   * @param opacity 透明度（0.0〜1.0）
   */
  setOpacity(opacity) {
    try {
      this.renderer.setOpacity(opacity);
      window.logger.info(`コメント透明度を ${opacity} に設定しました！`);
    } catch (error) {
      window.logger.error("コメント透明度の設定に失敗しました！:", error);
    }
  }
  /**
   * コメントのデフォルト色を設定
   * @param color 色（HEX形式の文字列、例: "#FFFFFF"）
   */
  setDefaultColor(color) {
    try {
      this.renderer.setDefaultColor(color);
      window.logger.info(`コメントのデフォルト色を ${color} に設定しました！`);
    } catch (error) {
      window.logger.error("コメントのデフォルト色の設定に失敗しました！:", error);
    }
  }
  /**
   * NGワードリストを設定
   * @param words NGワードの配列
   */
  setNGWords(words) {
    try {
      this.ngWords = words.map((word) => word.trim()).filter((word) => word !== "");
      window.logger.info(`${this.ngWords.length}件のNGワードを設定しました！`);
    } catch (error) {
      window.logger.error("NGワードの設定に失敗しました！:", error);
    }
  }
  /**
   * NG正規表現リストを設定
   * @param regexStrings 正規表現の文字列配列
   */
  setNGRegex(regexStrings) {
    try {
      this.ngRegex = regexStrings.map((str) => {
        try {
          return new RegExp(str, "i");
        } catch (error) {
          void error;
          window.logger.warn(`不正な正規表現なので無視します！: ${str}`);
          return null;
        }
      }).filter((regex) => regex !== null);
      window.logger.info(`${this.ngRegex.length}件のNG正規表現を設定しました！`);
    } catch (error) {
      window.logger.error("NG正規表現の設定に失敗しました！:", error);
    }
  }
  /**
   * 公式コメントリストを非表示にする
   */
  hideOfficialCommentPanel() {
    try {
      const selectors = [
        "#js-comment",
        "#comment",
        ".CommentPanel",
        ".comment-panel",
        '[data-testid="comment-area"]',
        ".grid-area_\\[comment\\]",
        ".grid-area_\\[sidebar\\]",
        ".WatchCommentsPanel",
        ".WatchCommentsList",
        ".h_var\\(--watch-player-height\\)"
      ];
      selectors.forEach((sel) => {
        document.querySelectorAll(sel).forEach((el) => {
          el.style.display = "none";
        });
      });
    } catch (error) {
      window.logger.warn("公式コメントリストを非表示にできなかったので無視します！:", error);
    }
  }
  /**
   * ★追加: 公式コメントオーバーレイを非表示にする
   */
  hideOfficialCommentOverlay() {
    try {
      const overlaySelectors = [
        "#playerCommentLayer",
        ".CommentScreen",
        ".CommentLayer",
        ".VideoScreenCanvas",
        ".VideoOverlayPanel",
        ".VideoOverlayPanelContainer"
      ];
      overlaySelectors.forEach((sel) => {
        document.querySelectorAll(sel).forEach((el) => {
          el.style.display = "none";
        });
      });
      window.logger.info("公式コメントオーバーレイを非表示にしました！");
    } catch (e) {
      window.logger.warn("公式コメントオーバーレイを非表示にできなかったので無視します！:", e);
    }
  }
  /**
   * CommentFilter2のグローバルデータを取得
   */
  getCommentFilter2Data() {
    try {
      const data = window[CONSTANTS.GLOBAL_DATA_KEY];
      if (data && typeof data === "object" && "originalData" in data && "filteredData" in data && "currentSmid" in data && "lastUpdated" in data && data.originalData !== null && data.filteredData !== null && data.currentSmid !== null) {
        return data;
      }
      return null;
    } catch (error) {
      window.logger.warn("CommentFilter2のグローバルデータ取得に失敗したので無視します！:", error);
      return null;
    }
  }
}

const CUSTOM_PLAYER_SHADOW_HTML = `
  <div id="custom-player" class="custom-player">
    <div class="video-container">
      <video id="video-element" playsinline preload="auto" crossorigin="anonymous">
        <source src="" type="video/mp4">
        <p>お使いのブラウザはHTML5ビデオをサポートしていません。</p>
      </video>
      <canvas id="comment-canvas"></canvas>
      <!-- シャドウDOM版のプレイヤーコントロール -->
      <player-controls-shadow></player-controls-shadow>
    </div>
  </div>
`;
const CUSTOM_PLAYER_SHADOW_STYLES = `
  .custom-player {
    position: relative;
    width: 100%;
    height: initial !important;
    background: #000;
    color: white;
    font-family: Arial, sans-serif;
    border-radius: 10px;
    display: flex;
    flex-direction: column;
    min-height: 180px;
  }

  .video-container {
    position: relative;
    width: 100%;
    height: initial !important;
    overflow: hidden;
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 180px;
  }
    
  #video-element {
    width: auto;
    height: auto;
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
    object-position: center center; /* 通常表示時も中央配置を保証します */
    display: block;
    margin: auto; /* flexboxコンテナ内での中央配置 */
    flex-shrink: 0; /* 縮小を防ぐ */
  }

  #comment-canvas {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 1;
  }

  /* プレイヤーコントロール（シャドウDOM版）の表示制御 */
  .custom-player:hover player-controls-shadow:not(.always-visible) {
    /* シャドウDOM内でvisibleクラスを制御 */
  }

  /* 常時表示モードの場合 */
  player-controls-shadow.always-visible {
    /* シャドウDOM内でスタイル管理 */
  }

  /* 全画面表示時の基本スタイル - ネイティブAPI + フォールバック */
  .custom-player:fullscreen,
  .custom-player:-webkit-full-screen,
  .custom-player:-moz-full-screen,
  .custom-player:-ms-fullscreen,
  html.fullscreen-active .custom-player.nc-fullscreen-player,
  body.nc-fullscreen-active .custom-player.nc-fullscreen-player {
    position: fixed !important;
    top: 0 !important;
    left: 0 !important;
    width: 100vw !important;
    height: 100vh !important;
    max-width: none !important;
    max-height: none !important;
    background: black !important;
    padding: 0 !important;
    margin: 0 !important;
    border-radius: 0 !important;
    display: block !important;
    z-index: 2147483647 !important;
    overflow: visible !important;
  }

  /* 全画面時のビデオコンテナスタイル - ネイティブAPI + フォールバック */
  .custom-player:fullscreen .video-container,
  .custom-player:-webkit-full-screen .video-container,
  .custom-player:-moz-full-screen .video-container,
  .custom-player:-ms-fullscreen .video-container,
  html.fullscreen-active .custom-player.nc-fullscreen-player .video-container,
  body.nc-fullscreen-active .custom-player.nc-fullscreen-player .video-container {
    position: absolute !important;
    top: 0 !important;
    left: 0 !important;
    width: 100% !important;
    height: 100% !important;
    display: flex !important;
    justify-content: center !important;
    align-items: center !important;
    overflow: hidden !important;
    background: #000 !important; /* 黒背景を確実に表示 */
  }

  /* 全画面時のビデオ要素スタイル - ネイティブAPI + フォールバック */
  .custom-player:fullscreen #video-element,
  .custom-player:-webkit-full-screen #video-element,
  .custom-player:-moz-full-screen #video-element,
  .custom-player:-ms-fullscreen #video-element,
  html.fullscreen-active .custom-player.nc-fullscreen-player #video-element,
  body.nc-fullscreen-active .custom-player.nc-fullscreen-player #video-element {
    /* position + transform による確実な中央配置 */
    position: absolute !important;
    top: 50% !important;
    left: 50% !important;
    transform: translate(-50%, -50%) !important;
    width: 100vw !important;
    height: 100vh !important;
    max-width: 100vw !important;
    max-height: 100vh !important;
    object-fit: contain !important;
    object-position: center center !important;
    display: block !important;
    /* レターボックス/ピラーボックス用の背景色 */
    background-color: #000 !important;
    z-index: 1 !important;
  }

  /* 全画面時のコメントキャンバス - ネイティブAPI + フォールバック */
  .custom-player:fullscreen #comment-canvas,
  .custom-player:-webkit-full-screen #comment-canvas,
  .custom-player:-moz-full-screen #comment-canvas,
  .custom-player:-ms-fullscreen #comment-canvas,
  html.fullscreen-active .custom-player.nc-fullscreen-player #comment-canvas,
  body.nc-fullscreen-active .custom-player.nc-fullscreen-player #comment-canvas {
    position: absolute !important;
    top: 0 !important;
    left: 0 !important;
    width: 100% !important;
    height: 100% !important;
    pointer-events: none !important;
    display: block !important;
    z-index: 10 !important;
  }

  /* 全画面時のプレーヤーコントロール配置 */
  .custom-player:fullscreen player-controls-shadow,
  .custom-player:-webkit-full-screen player-controls-shadow,
  .custom-player:-moz-full-screen player-controls-shadow,
  .custom-player:-ms-fullscreen player-controls-shadow,
  html.fullscreen-active .custom-player.nc-fullscreen-player player-controls-shadow,
  body.nc-fullscreen-active .custom-player.nc-fullscreen-player player-controls-shadow {
    position: fixed !important;
    bottom: 0 !important;
    left: 0 !important;
    right: 0 !important;
    width: 100vw !important;
    z-index: 2000 !important;
    background: linear-gradient(transparent, rgba(0, 0, 0, 0.8)) !important;
  }

  /* マウスホバー用のスタイル（ビデオコンテナ） */
  .video-container:hover {
    cursor: default;
  }

  /* 全画面表示中のカーソル制御 - ネイティブAPI + フォールバック */
  .custom-player:fullscreen .video-container,
  .custom-player:-webkit-full-screen .video-container,
  .custom-player:-moz-full-screen .video-container,
  .custom-player:-ms-fullscreen .video-container,
  html.fullscreen-active .custom-player.nc-fullscreen-player .video-container,
  body.nc-fullscreen-active .custom-player.nc-fullscreen-player .video-container {
    cursor: none;
  }

  .custom-player:fullscreen .video-container:hover,
  .custom-player:-webkit-full-screen .video-container:hover,
  .custom-player:-moz-full-screen .video-container:hover,
  .custom-player:-ms-fullscreen .video-container:hover,
  html.fullscreen-active .custom-player.nc-fullscreen-player .video-container:hover,
  body.nc-fullscreen-active .custom-player.nc-fullscreen-player .video-container:hover {
    cursor: default;
  }

  /* モバイル対応 */
  @media (max-width: 768px) {
    .custom-player {
      border-radius: 5px;
    }
  }

  /* ───────── コメントリスト関連スタイル追加 (2024-05-26) ───────── */
  .video-with-comments {
    display: flex !important;
    align-items: flex-start;
    gap: 10px;
    padding: 10px;
    max-width: 1920px;
    margin: 0 auto;
  }

  .comment-list-container {
    width: 320px;
    background: rgba(0, 0, 0, 0.9);
    color: white;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    border-radius: 4px;
    transition: all 0.3s ease;
  }

  .comment-list-header {
    padding: 10px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.2);
  }

  .comment-list {
    flex: 1;
    overflow-y: auto;
    padding: 10px;
  }

  .comment-item {
    padding: 8px;
    margin-bottom: 4px;
    border-radius: 4px;
    background: rgba(255, 255, 255, 0.1);
    font-size: 14px;
    transition: background-color 0.2s;
    cursor: pointer;
  }
  .comment-item:hover {
    background: rgba(255, 255, 255, 0.2);
  }
  .comment-item.active {
    background: rgba(0, 123, 255, 0.3);
  }
  .comment-time {
    color: #007bff;
    margin-right: 8px;
  }

  /* スクロールバー */
  .comment-list::-webkit-scrollbar {
    width: 6px;
  }
  .comment-list::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.1);
  }
  .comment-list::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.3);
    border-radius: 3px;
  }

  /* レスポンシブ調整 */
  @media (max-width: 1023px) {
    .video-with-comments {
      flex-direction: column;
      padding: 8px;
    }
    .comment-list-container {
      width: 100%;
      height: 300px !important;
      margin-top: 10px;
    }
  }
  @media (max-width: 767px) {
    .comment-item {
      font-size: 12px;
      padding: 6px;
    }
  }
`;
const FLOATING_DELETED_PLAYER_HTML = `
  <div id="floating-deleted-player" class="floating-deleted-player">
    <div class="floating-player-header">
      <div class="floating-player-title">
        <span class="video-icon" data-material-icon="video_library"></span>
        <span class="title-text">削除済み動画プレーヤー</span>
      </div>
      <div class="floating-player-controls">
        <button class="minimize-btn" title="最小化">−</button>
        <button class="close-btn" title="閉じる">×</button>
      </div>
    </div>
    <div class="floating-player-content">
      <div class="video-info">
        <div class="video-id-display"></div>
      </div>
      <div class="video-container">
        <video id="floating-video-element" playsinline preload="auto" crossorigin="anonymous" controls>
          <source src="" type="video/mp4">
          <p>お使いのブラウザはHTML5ビデオをサポートしていません。</p>
        </video>
      </div>
      <div class="player-status">
        <span class="status-text">待機中...</span>
      </div>
    </div>
  </div>
`;
const FLOATING_DELETED_PLAYER_STYLES = `
  ${materialIconsStyles}
  .floating-deleted-player {
    position: fixed;
    top: 100px;
    right: 20px;
    width: 400px;
    min-height: 300px;
    max-width: 80vw;
    max-height: 80vh;
    background: rgba(0, 0, 0, 0.85);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 16px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
    color: white;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    z-index: 10000;
    overflow: hidden;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    user-select: none;
    resize: none;
  }

  .floating-deleted-player:hover {
    box-shadow: 0 12px 48px rgba(0, 0, 0, 0.6);
    transform: translateY(-2px);
  }

  .floating-deleted-player.minimized {
    height: 60px;
    min-height: 60px;
  }

  .floating-deleted-player.minimized .floating-player-content {
    display: none;
  }

  .floating-player-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    background: rgba(255, 255, 255, 0.1);
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    cursor: move;
    user-select: none;
  }

  .floating-player-title {
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 600;
    font-size: 14px;
  }

  .video-icon {
    font-size: 16px;
    filter: drop-shadow(0 0 4px rgba(255, 255, 255, 0.3));
  }

  .floating-player-controls {
    display: flex;
    gap: 8px;
  }

  .minimize-btn,
  .close-btn {
    width: 24px;
    height: 24px;
    border: none;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.2);
    color: white;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    font-weight: bold;
    transition: all 0.2s ease;
  }

  .minimize-btn:hover {
    background: rgba(255, 193, 7, 0.8);
    transform: scale(1.1);
  }

  .close-btn:hover {
    background: rgba(220, 53, 69, 0.8);
    transform: scale(1.1);
  }

  .floating-player-content {
    padding: 16px;
  }

  .video-info {
    margin-bottom: 12px;
  }

  .video-id-display {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.8);
    background: rgba(255, 255, 255, 0.1);
    padding: 6px 10px;
    border-radius: 8px;
    text-align: center;
    word-break: break-all;
  }

  .video-container {
    position: relative;
    width: 100%;
    height: 200px; /* デフォルト高さ、JSで動的に調整 */
    background: rgba(0, 0, 0, 0.5);
    border-radius: 12px;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  #floating-video-element {
    width: auto;
    height: auto;
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
    object-position: center center; /* 中央配置を保証 */
    display: block;
    background: #000;
    margin: auto; /* flexboxコンテナ内での中央配置 */
    flex-shrink: 0; /* 縮小を防ぐ */
  }

  .player-status {
    text-align: center;
    padding: 8px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 8px;
  }

  .status-text {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.7);
  }

  /* ドラッグ中のスタイル */
  .floating-deleted-player.dragging {
    transform: rotate(2deg) scale(1.02);
    box-shadow: 0 16px 64px rgba(0, 0, 0, 0.8);
    z-index: 10001;
  }

  /* レスポンシブ対応 */
  @media (max-width: 768px) {
    .floating-deleted-player {
      width: calc(100vw - 40px);
      max-width: 400px;
      right: 20px;
      left: 20px;
    }
  }

  /* アニメーション */
  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .floating-deleted-player {
    animation: fadeInUp 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  }

  /* HLS.js エラー表示用 */
  .hls-error {
    background: rgba(220, 53, 69, 0.2);
    border: 1px solid rgba(220, 53, 69, 0.5);
    color: #ff6b6b;
    padding: 8px;
    border-radius: 8px;
    margin-top: 8px;
    font-size: 12px;
  }

  /* 成功表示用 */
  .hls-success {
    background: rgba(40, 167, 69, 0.2);
    border: 1px solid rgba(40, 167, 69, 0.5);
    color: #51cf66;
    padding: 8px;
    border-radius: 8px;
    margin-top: 8px;
    font-size: 12px;
  }
`;

class FloatingDeletedPlayer {
  constructor() {
    this.container = null;
    this.videoElement = null;
    this.hls = null;
    this.isDragging = false;
    this.dragOffset = { x: 0, y: 0 };
    this.isMinimized = false;
    this.originalVideoSize = null;
    this.resizeObserver = null;
    this.setupStyles();
    this.loadHLSLibrary();
  }
  /**
   * スタイルの適用
   */
  setupStyles() {
    applyStyles(FLOATING_DELETED_PLAYER_STYLES);
  }
  /**
   * HLS.jsライブラリの動的読み込み
   */
  loadHLSLibrary() {
    if (typeof Hls !== "undefined") {
      return;
    }
    if (document.querySelector('script[src*="hls.js"]')) {
      return;
    }
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/hls.js@latest";
    script.async = true;
    script.onload = () => {
      window.logger.info("HLS.jsライブラリの読み込みが完了しました！");
    };
    script.onerror = () => {
      window.logger.warn("HLS.jsライブラリの読み込みに失敗しました。ネイティブHLS再生を試行します。");
    };
    document.head.appendChild(script);
  }
  /**
   * プレーヤーを表示
   */
  show(videoIdOrUrl, title) {
    this.hide();
    this.createPlayer(videoIdOrUrl, title);
  }
  /**
   * プレーヤーを非表示
   */
  hide() {
    if (this.container) {
      this.container.remove();
      this.container = null;
    }
    if (this.hls) {
      this.hls.destroy();
      this.hls = null;
    }
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
    this.videoElement = null;
    this.originalVideoSize = null;
  }
  /**
   * プレーヤーの作成
   */
  createPlayer(videoIdOrUrl, title) {
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = FLOATING_DELETED_PLAYER_HTML;
    this.container = tempDiv.firstElementChild;
    document.body.appendChild(this.container);
    const videoIdDisplay = this.container.querySelector(".video-id-display");
    if (videoIdDisplay) {
      videoIdDisplay.textContent = title ? `${videoIdOrUrl} (${title})` : videoIdOrUrl;
    }
    this.videoElement = this.container.querySelector("#floating-video-element");
    this.setupEventListeners();
    this.initializeIcons();
    void this.loadVideo(videoIdOrUrl);
  }
  /**
   * アイコンの初期化
   */
  initializeIcons() {
    if (!this.container) return;
    const iconElements = this.container.querySelectorAll("[data-material-icon]");
    iconElements.forEach((element) => {
      const iconName = element.getAttribute("data-material-icon");
      if (iconName) {
        element.innerHTML = createMaterialIcon(iconName, {
          style: "outlined",
          color: "white"
        });
      }
    });
  }
  /**
   * イベントリスナーの設定
   */
  setupEventListeners() {
    if (!this.container) return;
    const header = this.container.querySelector(".floating-player-header");
    if (header) {
      header.addEventListener("mousedown", this.onDragStart.bind(this));
    }
    const minimizeBtn = this.container.querySelector(".minimize-btn");
    if (minimizeBtn) {
      minimizeBtn.addEventListener("click", this.toggleMinimize.bind(this));
    }
    const closeBtn = this.container.querySelector(".close-btn");
    if (closeBtn) {
      closeBtn.addEventListener("click", this.hide.bind(this));
    }
    document.addEventListener("mousemove", this.onDragMove.bind(this));
    document.addEventListener("mouseup", this.onDragEnd.bind(this));
    this.setupResizeObserver();
  }
  /**
   * ドラッグ開始
   */
  onDragStart(e) {
    if (!this.container) return;
    this.isDragging = true;
    this.container.classList.add("dragging");
    const rect = this.container.getBoundingClientRect();
    this.dragOffset.x = e.clientX - rect.left;
    this.dragOffset.y = e.clientY - rect.top;
    e.preventDefault();
  }
  /**
   * ドラッグ中
   */
  onDragMove(e) {
    if (!this.isDragging || !this.container) return;
    const x = e.clientX - this.dragOffset.x;
    const y = e.clientY - this.dragOffset.y;
    const maxX = window.innerWidth - this.container.offsetWidth;
    const maxY = window.innerHeight - this.container.offsetHeight;
    const clampedX = Math.max(0, Math.min(x, maxX));
    const clampedY = Math.max(0, Math.min(y, maxY));
    this.container.style.left = `${clampedX}px`;
    this.container.style.top = `${clampedY}px`;
    this.container.style.right = "auto";
  }
  /**
   * ドラッグ終了
   */
  onDragEnd() {
    if (!this.isDragging || !this.container) return;
    this.isDragging = false;
    this.container.classList.remove("dragging");
  }
  /**
   * リサイズ監視の設定
   */
  setupResizeObserver() {
    if (!window.ResizeObserver) return;
    this.resizeObserver = new ResizeObserver(() => {
      if (this.originalVideoSize && !this.isMinimized) {
        this.resizePlayer();
      }
    });
    this.resizeObserver.observe(document.body);
  }
  /**
   * 最適なプレーヤーサイズを計算
   */
  calculateOptimalSize() {
    if (!this.originalVideoSize) {
      return { width: 400, height: 300 };
    }
    const viewportHeight = window.innerHeight;
    const maxHeight = Math.floor(viewportHeight * 0.65);
    const targetHeight = Math.min(this.originalVideoSize.height, maxHeight);
    const aspectRatio = this.originalVideoSize.width / this.originalVideoSize.height;
    const targetWidth = Math.floor(targetHeight * aspectRatio);
    const minWidth = 300;
    const maxWidth = Math.floor(window.innerWidth * 0.8);
    const finalWidth = Math.max(minWidth, Math.min(targetWidth, maxWidth));
    const finalHeight = Math.floor(finalWidth / aspectRatio);
    return { width: finalWidth, height: finalHeight };
  }
  /**
   * プレーヤーサイズの調整
   */
  resizePlayer() {
    if (!this.container || this.isMinimized) return;
    const { width, height } = this.calculateOptimalSize();
    this.container.style.width = `${width}px`;
    this.container.style.minHeight = `${height + 120}px`;
    const videoContainer = this.container.querySelector(".video-container");
    if (videoContainer) {
      videoContainer.style.height = `${height}px`;
    }
    this.adjustPosition();
  }
  /**
   * 画面外に出ないように位置を調整
   */
  adjustPosition() {
    if (!this.container) return;
    const rect = this.container.getBoundingClientRect();
    const maxX = window.innerWidth - rect.width;
    const maxY = window.innerHeight - rect.height;
    const currentX = parseInt(this.container.style.left) || rect.left;
    const currentY = parseInt(this.container.style.top) || rect.top;
    if (currentX > maxX) {
      this.container.style.left = `${Math.max(0, maxX)}px`;
      this.container.style.right = "auto";
    }
    if (currentY > maxY) {
      this.container.style.top = `${Math.max(0, maxY)}px`;
    }
  }
  /**
   * 最小化切り替え
   */
  toggleMinimize() {
    if (!this.container) return;
    this.isMinimized = !this.isMinimized;
    this.container.classList.toggle("minimized", this.isMinimized);
    const minimizeBtn = this.container.querySelector(".minimize-btn");
    if (minimizeBtn) {
      minimizeBtn.textContent = this.isMinimized ? "□" : "−";
      minimizeBtn.title = this.isMinimized ? "復元" : "最小化";
    }
  }
  /**
   * 動画の読み込み
   */
  async loadVideo(videoIdOrUrl) {
    if (!this.videoElement) return;
    this.updateStatus("動画を読み込み中...");
    try {
      let finalUrl;
      let isHLS;
      if (videoIdOrUrl.startsWith("http://") || videoIdOrUrl.startsWith("https://")) {
        finalUrl = videoIdOrUrl;
        isHLS = videoIdOrUrl.toLowerCase().includes("hls") || videoIdOrUrl.includes(".m3u8");
      } else {
        this.updateStatus("キャッシュ情報を取得中...");
        const cacheResult = await this.getCacheUrl(videoIdOrUrl);
        finalUrl = cacheResult.url;
        isHLS = cacheResult.isHLS;
        if (cacheResult.title && this.container) {
          const videoIdDisplay = this.container.querySelector(".video-id-display");
          if (videoIdDisplay) {
            videoIdDisplay.textContent = `${videoIdOrUrl} (${cacheResult.title})`;
          }
        }
      }
      if (isHLS) {
        await this.loadHLSVideo(finalUrl);
      } else {
        await this.loadRegularVideo(finalUrl);
      }
    } catch (error) {
      window.logger.error("動画読み込みエラー:", error);
      this.showError(`動画の読み込みに失敗しました: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  /**
   * キャッシュURLの取得
   */
  async getCacheUrl(videoId) {
    const infoUrl = `https://www.nicovideo.jp/cache/info/v2?${videoId}`;
    try {
      const response = await fetch(infoUrl);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const jsonUnknown = await response.json();
      const data = jsonUnknown;
      if (!data || !(videoId in data)) {
        throw new Error("動画情報が見つかりません");
      }
      const videoInfo = data[videoId];
      if (!videoInfo.preferred) {
        throw new Error("この動画は現在利用できません");
      }
      const cacheId = videoInfo.preferred;
      const title = videoInfo.caches && videoInfo.caches[cacheId] ? String(videoInfo.caches[cacheId].title ?? "") : "";
      const isHLS = cacheId.endsWith(".hls");
      const url = isHLS ? `https://www.nicovideo.jp/cache/${cacheId}` : `https://www.nicovideo.jp/cache/${videoId}/auto/movie`;
      return { url, isHLS, title };
    } catch (error) {
      window.logger.error("キャッシュ情報取得エラー:", error);
      throw new Error(`キャッシュ情報の取得に失敗しました: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  /**
   * HLS動画の読み込み
   */
  async loadHLSVideo(url) {
    await Promise.resolve();
    if (!this.videoElement) return;
    this.updateStatus("HLS動画を読み込み中...");
    if (typeof Hls !== "undefined" && Hls.isSupported()) {
      this.hls = new Hls();
      this.hls.on(Hls.Events.ERROR, (...args) => {
        const [data] = args;
        window.logger.error("HLS Error:", data);
        this.showError("HLS再生でエラーが発生しました");
      });
      this.hls.on(Hls.Events.MANIFEST_PARSED, () => {
        this.updateStatus("HLS動画読み込み完了！");
        this.showSuccess("HLSマニフェスト読み込み完了しました！");
        this.videoElement?.play().catch((e) => {
          window.logger.error("再生開始エラー:", e);
          this.updateStatus("再生準備完了（クリックで再生）");
        });
      });
      this.hls.on(Hls.Events.MEDIA_ATTACHED, () => {
      });
      this.hls.loadSource(url);
      this.hls.attachMedia(this.videoElement);
    } else {
      this.videoElement.src = url;
      this.updateStatus("ネイティブHLS再生を試行中...");
    }
    this.setupVideoEvents();
  }
  /**
   * 通常動画の読み込み
   */
  async loadRegularVideo(url) {
    await Promise.resolve();
    if (!this.videoElement) return;
    this.updateStatus("動画を読み込み中...");
    this.videoElement.src = url;
    this.setupVideoEvents();
  }
  /**
   * 動画イベントの設定
   */
  setupVideoEvents() {
    if (!this.videoElement) return;
    this.videoElement.addEventListener("loadstart", () => {
      this.updateStatus("読み込み開始...");
    });
    this.videoElement.addEventListener("loadedmetadata", () => {
      this.updateStatus("メタデータ読み込み完了");
      if (this.videoElement) {
        this.originalVideoSize = {
          width: this.videoElement.videoWidth,
          height: this.videoElement.videoHeight
        };
        this.resizePlayer();
        window.logger.info(`動画サイズ: ${this.originalVideoSize.width}x${this.originalVideoSize.height}`);
      }
    });
    this.videoElement.addEventListener("canplay", () => {
      this.updateStatus("再生準備完了");
      this.showSuccess("動画の読み込みが完了しました！");
    });
    this.videoElement.addEventListener("playing", () => {
      this.updateStatus("再生中");
    });
    this.videoElement.addEventListener("pause", () => {
      this.updateStatus("一時停止中");
    });
    this.videoElement.addEventListener("waiting", () => {
      this.updateStatus("バッファリング中...");
    });
    this.videoElement.addEventListener("error", (e) => {
      window.logger.error("動画エラー:", e);
      this.showError("動画の再生でエラーが発生しました");
    });
    this.videoElement.volume = 0.3;
  }
  /**
   * ステータス更新
   */
  updateStatus(message) {
    if (!this.container) return;
    const statusText = this.container.querySelector(".status-text");
    if (statusText) {
      statusText.textContent = message;
    }
  }
  /**
   * エラー表示
   */
  showError(message) {
    this.updateStatus("エラー");
    this.showMessage(message, "hls-error");
  }
  /**
   * 成功表示
   */
  showSuccess(message) {
    this.showMessage(message, "hls-success");
  }
  /**
   * メッセージ表示
   */
  showMessage(message, className) {
    if (!this.container) return;
    const existingMessages = this.container.querySelectorAll(".hls-error, .hls-success");
    existingMessages.forEach((msg) => msg.remove());
    const messageDiv = document.createElement("div");
    messageDiv.className = className;
    messageDiv.textContent = message;
    const playerStatus = this.container.querySelector(".player-status");
    if (playerStatus) {
      playerStatus.appendChild(messageDiv);
      setTimeout(() => {
        if (messageDiv.parentNode) {
          messageDiv.remove();
        }
      }, 5e3);
    }
  }
}

const ensureCustomElements = () => {
  if (!customElements.get("player-controls-shadow")) {
    customElements.define("player-controls-shadow", PlayerControlsShadow);
  }
  if (!customElements.get("comment-list-shadow")) {
    customElements.define("comment-list-shadow", CommentList);
  }
};
let playerStylesInjected = false;
class StandalonePlayer {
  constructor(options) {
    this.urlManager = new UrlManager();
    this.toastManager = new ToastManager();
    this.commentSystem = new CommentSystem();
    this.floatingDeletedPlayer = new FloatingDeletedPlayer();
    this.cacheManager = null;
    this.playerControls = null;
    this.videoElement = null;
    this.videoContainer = null;
    this.customPlayerContainer = null;
    this.hls = null;
    this.lastStallSec = -1;
    this.consecutiveStalls = 0;
    this.handlePlaybackStall = null;
    this.blobFallbackInProgress = false;
    this.mount = options.mount;
    ensureCustomElements();
    this.loadHLSLibrary();
    this.setupGlobalInterface();
  }
  async initialize(videoId, apiData) {
    await this.preparePlayerShell();
    await this.playWithCustomSource(videoId, apiData.video.title);
    await this.loadComments(videoId);
  }
  async preparePlayerShell() {
    this.mount.innerHTML = "";
    if (!playerStylesInjected) {
      applyStyles(CUSTOM_PLAYER_SHADOW_STYLES);
      playerStylesInjected = true;
    }
    const container = document.createElement("div");
    container.innerHTML = CUSTOM_PLAYER_SHADOW_HTML;
    this.customPlayerContainer = container.firstElementChild;
    this.mount.append(this.customPlayerContainer);
    this.videoContainer = this.customPlayerContainer.querySelector(".video-container");
    this.videoElement = this.customPlayerContainer.querySelector("#video-element");
    this.playerControls = this.customPlayerContainer.querySelector("player-controls-shadow");
    if (!this.videoElement) {
      throw new Error("動画要素が生成できませんでした");
    }
    this.videoElement.preload = "auto";
    try {
      await this.commentSystem.initialize(this.videoElement);
    } catch (error) {
      window.logger.error("コメントシステムの初期化に失敗しました", error);
    }
    if (this.playerControls) {
      const initControls = () => {
        if (typeof this.playerControls?.setVideoElement === "function") {
          this.playerControls.setVideoElement(this.videoElement);
        }
        if (typeof this.playerControls?.setCommentSystem === "function") {
          this.playerControls.setCommentSystem(this.commentSystem);
        }
      };
      if (typeof this.playerControls.setVideoElement === "function") {
        initControls();
      } else {
        setTimeout(initControls, 200);
      }
    }
    this.setupHoverControls();
  }
  async playWithCustomSource(videoId, title) {
    this.cleanupPlayback();
    this.toastManager.showInfo("キャッシュから動画ソースを検索中...", title, videoId);
    const url = await this.urlManager.findFirstAvailableUrl(videoId);
    if (!url) {
      this.toastManager.showError("動画ソースが見つかりません", "キャッシュまたはローカルソースを確認してください");
      throw new Error("動画ソースが見つかりません");
    }
    await this.playVideo(url, title);
  }
  async playVideo(url, title) {
    if (!this.videoElement) {
      throw new Error("動画要素が初期化されていません");
    }
    this.lastStallSec = -1;
    this.consecutiveStalls = 0;
    this.blobFallbackInProgress = false;
    if (this.handlePlaybackStall) {
      const stallListener = this.handlePlaybackStall;
      this.videoElement.removeEventListener("stalled", stallListener);
      this.videoElement.removeEventListener("waiting", stallListener);
      this.handlePlaybackStall = null;
    }
    const isHls = this.isHLSUrl(url);
    if (isHls) {
      this.loadHLSVideo(url);
    } else {
      this.videoElement.src = url;
      this.videoElement.load();
    }
    try {
      await new Promise((resolve, reject) => {
        const onCanPlay = (_event) => {
          cleanup();
          resolve();
        };
        const onError = (_event) => {
          cleanup();
          reject(new Error("動画読み込みエラー"));
        };
        const cleanup = () => {
          this.videoElement?.removeEventListener("canplay", onCanPlay);
          this.videoElement?.removeEventListener("error", onError);
        };
        this.videoElement?.addEventListener("canplay", onCanPlay);
        this.videoElement?.addEventListener("error", onError);
      });
    } catch (error) {
      window.logger.warn("動画メタデータ取得に失敗しました", error);
    }
    this.cacheManager = new CacheManager(this.videoElement, this.hls || void 0, url);
    this.cacheManager.startMonitoring();
    const wasMuted = this.videoElement.muted;
    try {
      if (!wasMuted) {
        this.videoElement.muted = true;
      }
      const playPromise = this.videoElement.play();
      if (playPromise !== void 0) {
        await playPromise;
      }
      if (!wasMuted) {
        this.videoElement.muted = false;
      }
    } catch (error) {
      window.logger.warn("自動再生がブロックされた可能性があります", error);
      this.playerControls?.show();
    }
    const onStall = (_event) => {
      if (!this.videoElement) {
        return;
      }
      const stalledAt = Math.floor(this.videoElement.currentTime);
      this.consecutiveStalls = stalledAt === this.lastStallSec ? this.consecutiveStalls + 1 : 1;
      this.lastStallSec = stalledAt;
      try {
        const position = this.videoElement.currentTime;
        this.videoElement.pause();
        this.videoElement.currentTime = Math.max(0, position - 0.05);
        void this.videoElement.play().catch(() => {
        });
      } catch {
      }
      if (!isHls && this.consecutiveStalls >= 2) {
        void this.fallbackToBlob(url);
      }
    };
    this.handlePlaybackStall = onStall;
    this.videoElement.addEventListener("stalled", onStall);
    this.videoElement.addEventListener("waiting", onStall);
    this.playerControls?.show();
    this.videoElement.addEventListener("error", (evt) => {
      window.logger.error("[VIDEO-ERROR]", evt);
    });
    this.toastManager.showSuccess(url + " で再生できました", title);
  }
  async fallbackToBlob(url) {
    if (!this.videoElement || this.blobFallbackInProgress) {
      return;
    }
    this.blobFallbackInProgress = true;
    try {
      const resumePosition = this.videoElement.currentTime || 0;
      const response = await fetch(url, { mode: "cors", credentials: "omit" });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const video = this.videoElement;
      const revokeObjectUrl = () => {
        URL.revokeObjectURL(objectUrl);
        video.removeEventListener("ended", revokeObjectUrl);
        video.removeEventListener("error", revokeObjectUrl);
      };
      video.addEventListener("ended", revokeObjectUrl, { once: true });
      video.addEventListener("error", revokeObjectUrl, { once: true });
      video.src = objectUrl;
      video.load();
      if (video.readyState >= HTMLMediaElement.HAVE_METADATA) {
        video.currentTime = resumePosition;
      } else {
        const onLoadedMetadata = () => {
          video.removeEventListener("loadedmetadata", onLoadedMetadata);
          video.currentTime = resumePosition;
        };
        video.addEventListener("loadedmetadata", onLoadedMetadata, { once: true });
      }
      await video.play();
      this.consecutiveStalls = 0;
      window.logger.info("Blobフォールバックで再生継続");
    } catch (error) {
      const details = error instanceof Error ? error : new Error(String(error));
      window.logger.error("Blobフォールバック失敗", details);
    } finally {
      this.blobFallbackInProgress = false;
    }
  }
  setupHoverControls() {
    if (!this.videoContainer || !this.playerControls) {
      return;
    }
    let hoverTimer = null;
    this.videoContainer.addEventListener("mouseenter", () => {
      this.playerControls?.show();
    });
    this.videoContainer.addEventListener("mousemove", () => {
      this.playerControls?.show();
      if (hoverTimer !== null) {
        clearTimeout(hoverTimer);
      }
      hoverTimer = window.setTimeout(() => {
        if (this.playerControls && !this.playerControls.classList.contains("always-visible")) {
          this.playerControls.hide();
        }
      }, 2e3);
    });
    this.videoContainer.addEventListener("mouseleave", () => {
      if (hoverTimer !== null) {
        clearTimeout(hoverTimer);
        hoverTimer = null;
      }
      if (this.playerControls && !this.playerControls.classList.contains("always-visible")) {
        this.playerControls.hide();
      }
    });
    this.videoContainer.addEventListener("click", (event) => {
      const target = event.target;
      if (target.closest("player-controls-shadow")) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      if (!this.videoElement) {
        return;
      }
      if (this.videoElement.paused) {
        void this.videoElement.play().catch((err) => window.logger.error("再生開始に失敗しました", err));
      } else {
        this.videoElement.pause();
      }
    });
  }
  isHLSUrl(url) {
    const lower = url.toLowerCase();
    return lower.includes("hls") || lower.includes(".m3u8") || url.includes("master.m3u8") || url.includes("playlist.m3u8");
  }
  loadHLSVideo(url) {
    if (!this.videoElement) {
      return;
    }
    this.videoElement.preload = "auto";
    if (typeof Hls !== "undefined" && Hls.isSupported()) {
      this.hls = new Hls();
      this.hls.on(Hls.Events.ERROR, (_event, data) => {
        window.logger.error("HLS Error", data);
        this.toastManager.showError("HLS再生でエラーが発生しました");
      });
      this.hls.loadSource(url);
      this.hls.attachMedia(this.videoElement);
    } else {
      this.videoElement.src = url;
      this.videoElement.load();
      this.toastManager.showInfo("ネイティブHLS再生を試行します");
    }
  }
  async loadComments(videoId) {
    try {
      await this.commentSystem.loadComments(videoId);
    } catch (error) {
      window.logger.error("コメント読み込みに失敗しました", error);
      this.toastManager.showWarning("コメント読み込みに失敗しました", "動画の再生は継続します");
    }
  }
  loadHLSLibrary() {
    if (typeof Hls !== "undefined") {
      return;
    }
    if (document.querySelector('script[src*="hls.js"]')) {
      return;
    }
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/hls.js@latest";
    script.async = true;
    script.onload = () => {
      window.logger.info("HLS.jsライブラリの読み込みが完了しました");
    };
    script.onerror = () => {
      window.logger.warn("HLS.jsライブラリの読み込みに失敗しました");
    };
    document.head.appendChild(script);
  }
  cleanupPlayback() {
    if (this.hls) {
      this.hls.destroy();
      this.hls = null;
    }
    if (this.cacheManager) {
      this.cacheManager.stopMonitoring();
      this.cacheManager = null;
    }
    if (this.videoElement && this.handlePlaybackStall) {
      const stallListener = this.handlePlaybackStall;
      this.videoElement.removeEventListener("stalled", stallListener);
      this.videoElement.removeEventListener("waiting", stallListener);
      this.handlePlaybackStall = null;
    }
    this.lastStallSec = -1;
    this.consecutiveStalls = 0;
    this.blobFallbackInProgress = false;
    if (this.videoElement) {
      this.videoElement.pause();
      this.videoElement.src = "";
      this.videoElement.load();
    }
  }
  setupGlobalInterface() {
    if (!window.NicoCache_nl) {
      window.NicoCache_nl = {
        watch: {
          getVideoID: () => "",
          apiData: {},
          addEventListener: () => {
          }
        },
        cacheUtil: {
          formatCacheInfo: async () => {
            await Promise.resolve();
            return false;
          }
        },
        cc: {
          MainVideoPlayerWidthHeightReturner: async () => {
            await Promise.resolve();
            return 0;
          }
        },
        handleError: () => {
        }
      };
    }
    window.NicoCache_nl.deletedVideoPlayer = {
      play: (videoIdOrUrl, title) => {
        this.floatingDeletedPlayer.show(videoIdOrUrl, title);
      },
      hide: () => {
        this.floatingDeletedPlayer.hide();
      },
      help: () => {
        window.logger.info('window.NicoCache_nl.deletedVideoPlayer.play("sm9"); で再生できます');
      }
    };
  }
}

const formatNumber = (value) => {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "-";
  }
  return value.toLocaleString("ja-JP");
};
const formatDateTime = (isoString) => {
  if (!isoString) {
    return "-";
  }
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) {
    return isoString;
  }
  const datePart = date.toLocaleDateString("ja-JP");
  const timePart = date.toLocaleTimeString("ja-JP", { hour12: false });
  return datePart + " " + timePart;
};
const formatDuration = (seconds) => {
  if (typeof seconds !== "number" || !Number.isFinite(seconds)) {
    return "-";
  }
  const total = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor(total % 3600 / 60);
  const sec = total % 60;
  const parts = [minutes.toString().padStart(2, "0"), sec.toString().padStart(2, "0")];
  if (hours > 0) {
    parts.unshift(hours.toString());
  }
  return parts.join(":");
};
const createStatItem = (label, value) => {
  const item = document.createElement("div");
  item.className = "nc-stat-item";
  const labelEl = document.createElement("span");
  labelEl.className = "nc-stat-item__label";
  labelEl.textContent = label;
  const valueEl = document.createElement("span");
  valueEl.className = "nc-stat-item__value";
  valueEl.textContent = value;
  item.append(labelEl, valueEl);
  return item;
};

const isRecord = (value) => {
  return typeof value === "object" && value !== null;
};
const toOptionalString = (value) => {
  return typeof value === "string" && value.trim().length > 0 ? value : void 0;
};
const toOptionalNumber = (value) => {
  return typeof value === "number" && Number.isFinite(value) ? value : void 0;
};
const toOptionalBoolean = (value) => {
  return typeof value === "boolean" ? value : void 0;
};
const ensureRecord = (value) => {
  return isRecord(value) ? value : void 0;
};
const pickFirstString = (record, keys) => {
  if (!record) {
    return void 0;
  }
  for (const key of keys) {
    const candidate = toOptionalString(record[key]);
    if (candidate) {
      return candidate;
    }
  }
  return void 0;
};
const toSeriesReferenceForApi = (value) => {
  const record = ensureRecord(value);
  if (!record) {
    return void 0;
  }
  const id = toOptionalString(record["id"]);
  const title = toOptionalString(record["title"]);
  if (!id && !title) {
    return void 0;
  }
  const result = {};
  if (id) {
    result.id = id;
  }
  if (title) {
    result.title = title;
  }
  return result;
};
const readString = (record, key) => {
  if (!record) {
    return void 0;
  }
  return toOptionalString(record[key]);
};
const readBoolean = (record, key) => {
  if (!record) {
    return void 0;
  }
  return toOptionalBoolean(record[key]);
};
const readNumber = (record, key) => {
  if (!record) {
    return void 0;
  }
  return toOptionalNumber(record[key]);
};
const toOptionalId = (value) => {
  if (typeof value === "string" && value.trim().length > 0) {
    return value;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  return void 0;
};
const toApiData = (source, fallbackVideoId) => {
  const root = source;
  const videoRecord = ensureRecord(root["video"]) ?? {};
  const countRecord = ensureRecord(videoRecord["count"]);
  const thumbnailRecord = ensureRecord(videoRecord["thumbnail"]);
  const video = {
    id: toOptionalString(videoRecord["id"]) ?? fallbackVideoId,
    title: toOptionalString(videoRecord["title"]) ?? "タイトル未取得",
    count: {
      view: readNumber(countRecord, "view") ?? 0,
      comment: readNumber(countRecord, "comment") ?? 0,
      mylist: readNumber(countRecord, "mylist") ?? 0,
      like: readNumber(countRecord, "like")
    },
    thumbnail: {
      url: pickFirstString(thumbnailRecord, ["player", "ogp", "largeUrl", "middleUrl", "listingUrl", "url"]) ?? ""
    },
    registeredAt: toOptionalString(videoRecord["registeredAt"]) ?? "",
    duration: toOptionalNumber(videoRecord["duration"]) ?? 0,
    description: toOptionalString(videoRecord["description"]),
    shortDescription: toOptionalString(videoRecord["shortDescription"]),
    likeCount: toOptionalNumber(videoRecord["likeCount"]),
    advertisePoint: toOptionalNumber(videoRecord["advertisePoint"]),
    giftPoint: toOptionalNumber(videoRecord["giftPoint"]),
    watchableUserTypeForPayment: toOptionalString(videoRecord["watchableUserTypeForPayment"])
  };
  const genreValue = videoRecord["genre"];
  if (typeof genreValue === "string" && genreValue.trim()) {
    video.genre = genreValue;
  } else if (isRecord(genreValue)) {
    const genre = {};
    const genreId = toOptionalString(genreValue["id"]);
    const genreLabel = toOptionalString(genreValue["label"]);
    if (genreId) {
      genre.id = genreId;
    }
    if (genreLabel) {
      genre.label = genreLabel;
    }
    if (Object.keys(genre).length > 0) {
      video.genre = genre;
    }
  } else {
    const topGenre = ensureRecord(root["genre"]);
    if (topGenre) {
      const topId = toOptionalString(topGenre["key"]) ?? toOptionalString(topGenre["id"]);
      const topLabel = toOptionalString(topGenre["label"]);
      if (topLabel || topId) {
        if (topLabel) {
          video.genre = { id: topId, label: topLabel };
        } else if (topId) {
          video.genre = topId;
        }
      }
    }
  }
  const ownerRecord = ensureRecord(root["owner"]);
  let owner;
  if (ownerRecord) {
    const nickname = readString(ownerRecord, "nickname") ?? readString(ownerRecord, "name") ?? "投稿者";
    const ownerId = toOptionalId(ownerRecord["id"]);
    const iconUrl = readString(ownerRecord, "iconUrl") ?? readString(ownerRecord, "thumbnailUrl");
    const userPageUrl = readString(ownerRecord, "userPageUrl") ?? readString(ownerRecord, "url");
    const description = readString(ownerRecord, "description");
    owner = { nickname, iconUrl, userPageUrl, description };
    if (ownerId !== void 0) {
      owner.id = ownerId;
    }
  }
  const channelRecord = ensureRecord(root["channel"]);
  let channel;
  if (channelRecord) {
    const name = readString(channelRecord, "name");
    if (name) {
      const channelId = toOptionalId(channelRecord["id"]);
      const thumbnailFromChannel = ensureRecord(channelRecord["thumbnail"]);
      const iconUrl = readString(channelRecord, "iconUrl") ?? pickFirstString(thumbnailFromChannel, ["url", "smallUrl"]);
      const url = readString(channelRecord, "url");
      channel = { name, iconUrl, url };
      if (channelId !== void 0) {
        channel.id = channelId;
      }
    }
  }
  const tagRecord = ensureRecord(root["tag"]);
  let tag;
  if (tagRecord) {
    const tagData = {};
    const rawItemsSource = tagRecord["items"];
    const itemsRaw = Array.isArray(rawItemsSource) ? rawItemsSource : [];
    const items = [];
    for (const rawItem of itemsRaw) {
      if (!isRecord(rawItem)) {
        continue;
      }
      const name = readString(rawItem, "name");
      const isCategory = readBoolean(rawItem, "isCategory");
      const isCategoryCandidate = readBoolean(rawItem, "isCategoryCandidate");
      const isLocked = readBoolean(rawItem, "isLocked");
      const hasAnyTagValue = name !== void 0 || isCategory !== void 0 || isCategoryCandidate !== void 0 || isLocked !== void 0;
      if (!hasAnyTagValue) {
        continue;
      }
      const tagItem = {};
      if (name) {
        tagItem.name = name;
      }
      if (isCategory !== void 0) {
        tagItem.isCategory = isCategory;
      }
      if (isCategoryCandidate !== void 0) {
        tagItem.isCategoryCandidate = isCategoryCandidate;
      }
      if (isLocked !== void 0) {
        tagItem.isLocked = isLocked;
      }
      items.push(tagItem);
    }
    if (items.length) {
      tagData.items = items;
    }
    const hasR18Tag = readBoolean(tagRecord, "hasR18Tag");
    if (hasR18Tag !== void 0) {
      tagData.hasR18Tag = hasR18Tag;
    }
    if (tagData.items || tagData.hasR18Tag !== void 0) {
      tag = tagData;
    }
  }
  const seriesRecord = ensureRecord(root["series"]);
  let series;
  if (seriesRecord) {
    const resultSeries = {};
    const seriesId = toOptionalId(seriesRecord["id"]);
    if (seriesId !== void 0) {
      resultSeries.id = seriesId;
    }
    const seriesTitle = readString(seriesRecord, "title");
    if (seriesTitle) {
      resultSeries.title = seriesTitle;
    }
    const seriesDescription = readString(seriesRecord, "description");
    if (seriesDescription) {
      resultSeries.description = seriesDescription;
    }
    const seriesThumbnail = readString(seriesRecord, "thumbnailUrl");
    if (seriesThumbnail) {
      resultSeries.thumbnailUrl = seriesThumbnail;
    }
    const seriesVideoBlock = ensureRecord(seriesRecord["video"]);
    const current = toSeriesReferenceForApi(seriesRecord["current"]) ?? toSeriesReferenceForApi(seriesVideoBlock?.["first"]);
    const prev = toSeriesReferenceForApi(seriesRecord["prev"]) ?? toSeriesReferenceForApi(seriesVideoBlock?.["prev"]);
    const next = toSeriesReferenceForApi(seriesRecord["next"]) ?? toSeriesReferenceForApi(seriesVideoBlock?.["next"]);
    if (current) {
      resultSeries.current = current;
    }
    if (prev) {
      resultSeries.prev = prev;
    }
    if (next) {
      resultSeries.next = next;
    }
    if (Object.keys(resultSeries).length > 0) {
      series = resultSeries;
    }
  }
  const paymentRecord = ensureRecord(root["payment"]);
  let payment;
  if (paymentRecord) {
    const paymentVideo = ensureRecord(paymentRecord["video"]);
    if (paymentVideo) {
      const watchable = readString(paymentVideo, "watchableUserType");
      if (watchable) {
        payment = { video: { watchableUserType: watchable } };
        if (!video.watchableUserTypeForPayment) {
          video.watchableUserTypeForPayment = watchable;
        }
      }
    }
  }
  const commentRecord = ensureRecord(root["comment"]);
  let comment;
  if (commentRecord) {
    const commentData = {};
    const threadsSource = commentRecord["threads"];
    const threadsRaw = Array.isArray(threadsSource) ? threadsSource : [];
    const threads = [];
    for (const thread of threadsRaw) {
      if (!isRecord(thread)) {
        continue;
      }
      const id = readString(thread, "id");
      const fork = readString(thread, "fork");
      if (id && fork) {
        threads.push({ id, fork });
      }
    }
    if (threads.length) {
      commentData.threads = threads;
    }
    const nvCommentRaw = ensureRecord(commentRecord["nvComment"]);
    if (nvCommentRaw) {
      const server = readString(nvCommentRaw, "server");
      const params = ensureRecord(nvCommentRaw["params"]);
      const threadKeyRaw = nvCommentRaw["threadKey"];
      let threadKey;
      if (typeof threadKeyRaw === "string") {
        threadKey = threadKeyRaw;
      } else if (isRecord(threadKeyRaw)) {
        threadKey = readString(threadKeyRaw, "threadkey") ?? readString(threadKeyRaw, "value");
      }
      if (server && params && threadKey) {
        commentData.nvComment = {
          server,
          params,
          threadKey
        };
      }
    }
    if (commentData.threads || commentData.nvComment) {
      comment = commentData;
    }
  }
  const giftRecord = ensureRecord(root["gift"]);
  const totalPoint = readNumber(giftRecord, "totalPoint");
  const gift = totalPoint !== void 0 ? { totalPoint } : void 0;
  if (!video.watchableUserTypeForPayment && payment?.video.watchableUserType) {
    video.watchableUserTypeForPayment = payment.video.watchableUserType;
  }
  if (!video.giftPoint && totalPoint !== void 0) {
    video.giftPoint = totalPoint;
  }
  const result = { video };
  if (owner) {
    result.owner = owner;
  }
  if (channel) {
    result.channel = channel;
  }
  if (tag) {
    result.tag = tag;
  }
  if (series) {
    result.series = series;
  }
  if (payment) {
    result.payment = payment;
  }
  if (comment) {
    result.comment = comment;
  }
  if (gift) {
    result.gift = gift;
  }
  return result;
};
const htmlToPlainText = (value) => {
  const withNewLine = value.replace(/<br\s*\/?>(?![\n])/gi, "\n");
  const container = document.createElement("div");
  container.innerHTML = withNewLine;
  return (container.textContent ?? value).trim();
};
const getVideoIdFromQuery = () => {
  const params = new URLSearchParams(window.location.search);
  return params.get("videoId");
};
const setBreadcrumbVideoId = (videoId) => {
  const current = document.getElementById("nc-current-video-id");
  if (current) {
    current.textContent = videoId;
  }
};
const appendMetaItem = (container, label, value) => {
  if (!value || value === "-") {
    return;
  }
  const item = document.createElement("span");
  item.textContent = label + ": " + value;
  container.append(item);
};
const resolveGenreLabel = (apiData) => {
  const genre = apiData.video.genre;
  if (typeof genre === "string" && genre.trim()) {
    return genre;
  }
  if (isRecord(genre)) {
    const label = genre["label"];
    if (typeof label === "string" && label.trim()) {
      return label;
    }
    const id = genre["id"];
    if (typeof id === "string" && id.trim()) {
      return id;
    }
  }
  return null;
};
const renderMeta = (container, apiData) => {
  container.innerHTML = "";
  appendMetaItem(container, "動画ID", apiData.video.id);
  appendMetaItem(container, "投稿日", formatDateTime(apiData.video.registeredAt));
  appendMetaItem(container, "再生時間", formatDuration(apiData.video.duration));
  appendMetaItem(container, "ジャンル", resolveGenreLabel(apiData));
};
const renderStats = (container, apiData) => {
  container.innerHTML = "";
  container.append(
    createStatItem("再生数", formatNumber(apiData.video.count.view)),
    createStatItem("コメント数", formatNumber(apiData.video.count.comment)),
    createStatItem("マイリスト数", formatNumber(apiData.video.count.mylist)),
    createStatItem("いいね数", formatNumber(apiData.video.likeCount ?? apiData.video.count.like ?? null)),
    createStatItem("広告ポイント", formatNumber(apiData.video.advertisePoint ?? apiData.gift?.totalPoint ?? null)),
    createStatItem("ギフトポイント", formatNumber(apiData.gift?.totalPoint ?? null))
  );
};
const renderTags = (container, apiData) => {
  container.innerHTML = "";
  const tags = apiData.tag?.items ?? [];
  if (!tags.length) {
    const empty = document.createElement("span");
    empty.className = "nc-empty";
    empty.textContent = "タグは登録されていません。";
    container.append(empty);
    return;
  }
  for (const tag of tags) {
    if (!tag || typeof tag !== "object") {
      continue;
    }
    const name = "name" in tag && typeof tag.name === "string" ? tag.name : "";
    if (!name) {
      continue;
    }
    const chip = document.createElement("span");
    chip.className = "nc-tag";
    chip.textContent = name;
    container.append(chip);
  }
};
const renderDescription = (element, apiData) => {
  const candidates = [
    typeof apiData.owner?.description === "string" ? apiData.owner.description : null,
    typeof apiData.video.description === "string" ? apiData.video.description : null,
    typeof apiData.video.shortDescription === "string" ? apiData.video.shortDescription : null
  ];
  const source = candidates.find((text) => typeof text === "string" && text.trim().length > 0);
  if (!source) {
    element.textContent = "説明文はありません。";
    return;
  }
  element.textContent = htmlToPlainText(source);
};
const collectOwnerDisplayData = (apiData) => {
  if (apiData.channel) {
    const channel = apiData.channel;
    const displayName = channel.name && channel.name.trim() ? channel.name : "チャンネル";
    const idValue = channel.id;
    const channelId = typeof idValue === "string" ? idValue : typeof idValue === "number" ? String(idValue) : void 0;
    let iconUrl = channel.iconUrl && channel.iconUrl.trim() ? channel.iconUrl : void 0;
    if (!iconUrl) {
      const thumbnailUrl = channel.thumbnail?.url;
      if (typeof thumbnailUrl === "string" && thumbnailUrl.trim()) {
        iconUrl = thumbnailUrl;
      }
    }
    const explicitUrl = channel.url && channel.url.trim() ? channel.url : void 0;
    const linkUrl = explicitUrl ?? (channelId ? "https://ch.nicovideo.jp/" + channelId : void 0);
    return { name: displayName, iconUrl, linkUrl };
  }
  if (apiData.owner) {
    const owner = apiData.owner;
    const nickname = owner.nickname && owner.nickname.trim() ? owner.nickname : "投稿者";
    const idValue = owner.id;
    const ownerId = typeof idValue === "string" ? idValue : typeof idValue === "number" ? String(idValue) : void 0;
    const explicitUrl = owner.userPageUrl && owner.userPageUrl.trim() ? owner.userPageUrl : void 0;
    const linkUrl = explicitUrl ?? (ownerId ? "https://www.nicovideo.jp/user/" + ownerId : void 0);
    const iconUrl = owner.iconUrl && owner.iconUrl.trim() ? owner.iconUrl : void 0;
    return { name: nickname, iconUrl, linkUrl };
  }
  return null;
};
const renderOwner = (layout, apiData) => {
  const ownerInfo = collectOwnerDisplayData(apiData);
  const { ownerContainer, ownerAvatar, ownerName, ownerLink } = layout;
  if (!ownerInfo) {
    ownerContainer.style.display = "none";
    return;
  }
  ownerContainer.style.display = "flex";
  ownerName.textContent = ownerInfo.name;
  if (ownerInfo.iconUrl) {
    ownerAvatar.src = ownerInfo.iconUrl;
    ownerAvatar.alt = ownerInfo.name + "のアイコン";
    ownerAvatar.style.display = "";
  } else {
    ownerAvatar.style.display = "none";
  }
  if (ownerInfo.linkUrl) {
    ownerLink.href = ownerInfo.linkUrl;
    ownerLink.style.pointerEvents = "";
    ownerLink.removeAttribute("aria-disabled");
  } else {
    ownerLink.href = "#";
    ownerLink.style.pointerEvents = "none";
    ownerLink.setAttribute("aria-disabled", "true");
  }
};
const normalizeSeriesEntry = (value) => {
  const reference = toSeriesReferenceForApi(value);
  if (!reference || !reference.title) {
    return null;
  }
  return { id: reference.id, title: reference.title };
};
const renderSeries = (container, apiData) => {
  container.innerHTML = "";
  const series = apiData.series;
  if (!series) {
    const empty = document.createElement("p");
    empty.className = "nc-empty";
    empty.textContent = "シリーズ情報はありません。";
    container.append(empty);
    return;
  }
  const seriesRecord = series;
  const videoRaw = seriesRecord["video"];
  const videoBlock = isRecord(videoRaw) ? videoRaw : void 0;
  const seriesIdValue = seriesRecord["id"];
  const seriesId = typeof seriesIdValue === "number" || typeof seriesIdValue === "string" ? String(seriesIdValue) : void 0;
  const seriesTitle = seriesRecord["title"];
  if (typeof seriesTitle === "string" && seriesTitle.trim()) {
    const wrapper = document.createElement("div");
    wrapper.className = "nc-series__item";
    const labelEl = document.createElement("span");
    labelEl.textContent = "シリーズ";
    const link = document.createElement("a");
    link.textContent = seriesTitle;
    if (seriesId) {
      link.href = "https://www.nicovideo.jp/series/" + seriesId;
    } else {
      link.href = "#";
      link.style.pointerEvents = "none";
      link.setAttribute("aria-disabled", "true");
    }
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    wrapper.append(labelEl, link);
    container.append(wrapper);
  }
  const entries = [
    ["シリーズ最初", videoBlock?.["first"] ?? seriesRecord["first"]],
    ["前の動画", videoBlock?.["prev"] ?? seriesRecord["prev"]],
    ["次の動画", videoBlock?.["next"] ?? seriesRecord["next"]]
  ];
  for (const [label, raw] of entries) {
    const item = normalizeSeriesEntry(raw);
    if (!item) {
      continue;
    }
    const wrapper = document.createElement("div");
    wrapper.className = "nc-series__item";
    const labelEl = document.createElement("span");
    labelEl.textContent = label;
    const link = document.createElement("a");
    link.textContent = item.title;
    if (item.id) {
      link.href = "https://www.nicovideo.jp/watch/" + item.id;
    } else {
      link.href = "#";
      link.style.pointerEvents = "none";
      link.setAttribute("aria-disabled", "true");
    }
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    wrapper.append(labelEl, link);
    container.append(wrapper);
  }
  if (!container.children.length) {
    const empty = document.createElement("p");
    empty.className = "nc-empty";
    empty.textContent = "シリーズ情報はありません。";
    container.append(empty);
  }
};
const assignWatchContext = (videoId, apiData) => {
  if (!window.NicoCache_nl) {
    return;
  }
  if (!window.NicoCache_nl.watch) {
    window.NicoCache_nl.watch = {
      getVideoID: () => videoId,
      apiData,
      addEventListener: () => {
      }
    };
    return;
  }
  window.NicoCache_nl.watch.getVideoID = () => videoId;
  window.NicoCache_nl.watch.apiData = apiData;
};
const main = async () => {
  const videoId = getVideoIdFromQuery();
  const layout = createStandaloneLayout();
  if (!videoId) {
    layout.title.textContent = "動画IDが指定されていません";
    layout.description.textContent = "URLに videoId パラメーターを指定してください。";
    return;
  }
  setBreadcrumbVideoId(videoId);
  try {
    const result = await window.commonHelper.fetchWatchPage(videoId);
    if (!result) {
      throw new Error("ウォッチページの取得に失敗しました");
    }
    const apiData = toApiData(result.apiData, videoId);
    layout.title.textContent = apiData.video.title;
    document.title = "NicoCache Player - " + apiData.video.title;
    renderMeta(layout.metaList, apiData);
    renderStats(layout.statsList, apiData);
    renderTags(layout.tags, apiData);
    renderDescription(layout.description, apiData);
    renderOwner(layout, apiData);
    renderSeries(layout.seriesList, apiData);
    assignWatchContext(videoId, apiData);
    const player = new StandalonePlayer({ mount: layout.playerMount });
    await player.initialize(videoId, apiData);
  } catch (error) {
    window.logger.error("Standalone player failed", error);
    layout.title.textContent = "動画情報の取得に失敗しました";
    layout.description.textContent = "エラー: " + (error instanceof Error ? error.message : String(error));
  }
};
void main();
//# sourceMappingURL=video-player-standalone.es.js.map
