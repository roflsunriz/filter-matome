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
      const serverContext = JSON.parse(doc.querySelector('meta[name="server-context"]')?.getAttribute("content") || "{}");
      const serverResponseContent = doc.querySelector('meta[name="server-response"]')?.getAttribute("content") || "{}";
      const serverResponse = JSON.parse(decodeURIComponent(serverResponseContent));
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
        progressElement.style.transition = `width ${options.timeOut}ms linear`;
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
        if (progressElement) {
          progressElement.style.transition = "none";
        }
      });
      toastElement.addEventListener("mouseleave", () => {
        if (options.timeOut > 0) {
          toastElement.timeoutId = setTimeout(() => {
            this.removeToast(toastElement);
          }, options.extendedTimeOut);
          const progressElement = toastElement.querySelector(`.${options.progressClass}`);
          if (progressElement) {
            progressElement.style.transition = `width ${options.extendedTimeOut}ms linear`;
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
  whatshot: "whatshot"
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
                  <a href="https://www.nicovideo.jp/local/features/dist/src/mylist2/index.html" target="_blank" title="Mylist2">
                    Mylist2
                  </a>
                  <a href="https://www.nicovideo.jp/local/features/dist/src/watch-history/index.html" target="_blank" title="watch-history">
                    ${createMaterialIcon(ICONS.video_library, { style: "outlined", color: "white" })}
                    watch-history
                  </a>
                  <a href="https://www.nicovideo.jp/cache/" target="_blank" title="キャッシュ">
                    キャッシュ
                  </a>
                  <a href="https://www.nicovideo.jp/local/features/dist/src/docs/mylist2/index.html" target="_blank" title="Mylist2 README">
                    README(ML2)
                  </a>
                  <a href="https://www.nicovideo.jp/local/features/dist/src/docs/comment-filter2/index.html" target="_blank" title="CommentFilter2 README">
                    README(CF2)
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

// スタイルを動的に追加
      const styleSheet = document.createElement('style');
      styleSheet.textContent = materialIconsStyles;
      document.head.appendChild(styleSheet);

const MYLIST_MANAGER_STYLES_PART1 = `
.mylist-item {
  padding: 12px;
  cursor: pointer;
  border-bottom: 1px solid #333;
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
  color: #888;
  margin-left: 8px;
  padding: 2px 6px;
}

.mylist-count-mylist-tab {
  background: #2a2b2c;
  border-radius: 4px;
}

.mylist-name {
  display: block;
  font-weight: bold;
  margin-bottom: 4px;
}

.mylist-date {
  font-size: 12px;
  color: #888;
}

.mylist-controls {
  display: flex;
  gap: 8px;
}

.mylist-item:hover {
  background: #2a2b2c;
}

.mylist-item.active {
  background: #2a88bd;
}

/* 既存のスタイルに追加 */

.custom-mylist2-manager {
  display: flex;
  position: fixed;
  top: 52%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 97%;
  height: 87%;
  background: #1a1b1c;
  color: #ffffff;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
  z-index: 8000;
}

.mylist-sidebar {
  width: 250px;
  border-right: 1px solid #333;
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
  border-bottom: 1px solid #333;
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
  color: #888;
  margin-bottom: 2px;
}

.video-upload-date {
  font-size: 12px;
  color: #888;
  margin-bottom: 5px;
}

.video-stats {
  font-size: 12px;
  color: #888;
}

.video-stats span:not(:last-child) {
  margin-right: 15px;
}

/* フォーム要素のスタイル */
input[type="text"],
select {
  background: #2a2b2c;
  border: 1px solid #444;
  color: #ffffff;
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
  background: #2a88bd;
  color: #ffffff;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
}

button:hover {
  background: #3498db;
}

button.danger {
  background: #e74c3c;
}

button.danger:hover {
  background: #c0392b;
}
`;
const MYLIST_MANAGER_STYLES_PART2 = `
/* メインコンテンツ領域のスタイル */
.mylist-main {
  padding: 20px;
  background: #1a1b1c;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

/* マイリスト情報セクション */
.current-mylist-info {
  display: flex;
  gap: 10px;
  align-items: center;
  padding: 15px;
  background: #2a2b2c;
  border-radius: 6px;
  margin-bottom: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

.mylist-name-edit {
  flex: 1;
  padding: 8px 12px;
  background: #1a1b1c;
  border: 1px solid #444;
  border-radius: 4px;
  font-size: 14px;
  color: #ffffff;
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
  background: #4a90e2;
  color: white;
}

.current-mylist-info button.danger {
  background: #dc3545;
  color: white;
}

.current-mylist-info button:hover {
  opacity: 0.9;
}

/* インポート/エクスポートコントロール */
.import-export-controls {
  display: flex;
  gap: 10px;
  margin-left: auto;
}

.import-export-controls button {
  background: #27ae60;
}

/* 動画追加フォーム */
.video-add-form {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
  padding: 15px;
  background: #2a2b2c;
  border-radius: 6px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

.video-add-form input {
  flex: 1;
  padding: 8px 12px;
  background: #1a1b1c;
  border: 1px solid #444;
  border-radius: 4px;
  font-size: 14px;
  color: #ffffff;
}

.video-add-form button {
  padding: 8px 20px;
  background: #4a90e2;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.video-add-form button:hover {
  background: #357abd;
}

/* 動画一覧コントロール */
.video-list-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 15px;
  padding: 15px;
  background: #2a2b2c;
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
  border: 1px solid #444;
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
  background: #4a90e2;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.bulk-action-controls button:hover {
  background: #357abd;
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
  border-color: #3498db;
  box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.2);
}

/* プレースホルダーのスタイル */
input::placeholder {
  color: #666;
}

/* スクロールバーのスタイル */
.video-list::-webkit-scrollbar {
  width: 8px;
}

.video-list::-webkit-scrollbar-track {
  background: #1a1b1c;
}

.video-list::-webkit-scrollbar-thumb {
  background: #444;
  border-radius: 4px;
}

.video-list::-webkit-scrollbar-thumb:hover {
  background: #555;
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
  color: #666;
}

/* ヘッダースタイル */
/* ヘッダー関連のスタイルは共通モジュールに移動しました */

/* メインコンテンツの調整 */
.custom-mylist2-manager {
  margin-top: 10px;
  padding-top: 10px;
}

.cml2-video-link {
  color: #1976d2;
  text-decoration: none;
  display: inline-block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cml2-video-link:hover {
  color: #1565c0;
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
  color: white;
  background: #2a88bd; /* 基本の青色 */
}

.cml2-btn:hover {
  background: #3498db;
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

/* 危険な操作のボタンスタイル - 詳細度を上げる */
.current-mylist-info .cml2-btn.cml2-btn-danger,
.video-actions .delete-video,
.video-actions .delete-keyword {
  background: #e74c3c;
}

.current-mylist-info .cml2-btn.cml2-btn-danger:hover,
.video-actions .delete-video:hover,
.video-actions .delete-keyword:hover {
  background: #c0392b;
}

.cml2-video-link {
  color: #1976d2;
  text-decoration: none;
  display: inline-block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cml2-video-link:hover {
  color: #1565c0;
  text-decoration: underline;
}

/* マイリストサイドバーのスクロール設定 */
.mylist-list {
  flex: 1;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: #666 #2a2b2c;
  margin-top: 15px;
}

/* Webkit系ブラウザ用のスクロールバースタイル */
.mylist-list::-webkit-scrollbar {
  width: 8px;
}

.mylist-list::-webkit-scrollbar-track {
  background: #2a2b2c;
}

.mylist-list::-webkit-scrollbar-thumb {
  background-color: #666;
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
  background: #1a1b1c;
  color: #ffffff;
  padding: 20px;
  border-radius: 8px;
  min-width: 300px;
  max-width: 90%;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.5);
}

.cml2-modal-title {
  margin: 0 0 15px 0;
  padding-bottom: 10px;
  border-bottom: 1px solid #333;
}

.cml2-modal-body {
  margin-bottom: 20px;
}

.cml2-modal-footer {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}

/* セレクトボックスのスタイル */
.cml2-select {
  width: 100%;
  padding: 8px;
  background: #2a2b2c;
  border: 1px solid #444;
  color: #ffffff;
  border-radius: 4px;
  margin-bottom: 15px;
}

.cml2-select option {
  background: #2a2b2c;
  color: #ffffff;
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
  background: #1a1b1c;
  border: 1px solid #444;
  border-radius: 4px;
  color: #ffffff;
  font-size: 14px;
  min-width: 0; /* flexアイテムの最小幅を0に設定 */
}

.search-container input::placeholder {
  color: #888;
}

.search-clear-btn {
  background: #666;
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
  background: #777;
}

.search-clear-btn .material-icon {
  width: 16px;
  height: 16px;
}

/* 検索欄のスタイル（後方互換性のため残す） */
.mylist-search,
.video-search {
  margin: 10px 0;
  padding: 0 10px;
}

.mylist-search input,
.video-search input {
  width: 93%;
  padding: 8px 12px;
  background: #1a1b1c;
  border: 1px solid #444;
  border-radius: 4px;
  color: #ffffff;
  font-size: 14px;
}

.mylist-search input::placeholder,
.video-search input::placeholder {
  color: #888;
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
  background-color: #e0e0e0;
  border-radius: 4px;
}

.keyword-icon svg {
  fill: #666;
}

.keyword-links a {
  margin-right: 1em;
  color: #0066cc;
  text-decoration: none;
}

.keyword-links a:hover {
  text-decoration: underline;
}

.keyword-text,
.keyword-added-date {
  font-weight: bold;
  color: #ddd;
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
  background: #1a1b1c;
  color: #ffffff;
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
  border-bottom: 1px solid #333;
  font-size: 1.2em;
}

#keywordEditModal .close-button {
  position: absolute;
  right: 10px;
  top: 10px;
  font-size: 24px;
  color: #888;
  cursor: pointer;
  transition: color 0.2s;
}

#keywordEditModal .close-button:hover {
  color: #fff;
}

#keywordEditModal #editKeywordInput {
  width: 100%;
  padding: 8px 12px;
  background: #2a2b2c;
  border: 1px solid #444;
  border-radius: 4px;
  color: #ffffff;
  font-size: 14px;
  margin-bottom: 15px;
  box-sizing: border-box;
}

#keywordEditModal #editKeywordInput:focus {
  outline: none;
  border-color: #3498db;
  box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.2);
}

#keywordEditModal #saveKeywordEdit {
  padding: 8px 16px;
  background: #2a88bd;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 14px;
}

#keywordEditModal #saveKeywordEdit:hover {
  background: #3498db;
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
  background: #1a1b1c;
  color: #ffffff;
  padding: 20px;
  border-radius: 8px;
  min-width: 300px;
  max-width: 90%;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.5);
}

.cml2-alert-title {
  margin: 0 0 15px 0;
  padding-bottom: 10px;
  border-bottom: 1px solid #333;
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
  border-left: 4px solid #27ae60;
}

.cml2-alert-content.error {
  border-left: 4px solid #e74c3c;
}

.cml2-alert-content.warning {
  border-left: 4px solid #f39c12;
}

.cml2-alert-content.info {
  border-left: 4px solid #3498db;
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
  color: #ffffff;
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

/* サイドバー内の要素の幅統一 */
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

/* 小さい画面での動画リストの拡張 */
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
  content: "⬇ ホバーでコントロールを表示";
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
  border: 1px solid #444;
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
    content: "👆 タップでコントロール";
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



/* コントロール内のボタンスタイルを確保 */
.collapsible-controls .cml2-btn,
.collapsible-controls button {
  background: #2a88bd;
  color: #ffffff;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.collapsible-controls .cml2-btn:hover,
.collapsible-controls button:hover {
  background: #3498db;
}

.collapsible-controls .cml2-btn.cml2-btn-danger {
  background: #e74c3c;
}

.collapsible-controls .cml2-btn.cml2-btn-danger:hover {
  background: #c0392b;
}

/* インプット要素のスタイル統一 */
.collapsible-controls input[type="text"],
.collapsible-controls select {
  background: #2a2b2c;
  border: 1px solid #444;
  color: #ffffff;
  padding: 8px 12px;
  border-radius: 4px;
}

.collapsible-controls input[type="text"]:focus,
.collapsible-controls select:focus {
  outline: none;
  border-color: #3498db;
  box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.2);
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
  background: #2a2b2c;
  border: 1px solid #555;
  border-radius: 3px;
  cursor: pointer;
  position: relative;
  appearance: none;
  transition: all 0.2s ease;
}

.controls-toggle-checkbox:checked {
  background: #3498db;
  border-color: #3498db;
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
  box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.3);
}

.controls-toggle-text {
  white-space: nowrap;
}

/* 常時表示モードのとき */
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
  constructor() {
    this.dbName = "Mylist2DB";
    this.version = 7;
    this.migrationSteps = this.initializeMigrationSteps();
  }
  // マイグレーションステップを初期化
  initializeMigrationSteps() {
    return [
      {
        version: 1,
        description: "初期データベース構造の作成",
        execute: async (db) => {
          this.createInitialStores(db);
        }
      },
      {
        version: 4,
        description: "マネージャーストアの追加",
        execute: async (db) => {
          if (!db.objectStoreNames.contains("manager")) {
            db.createObjectStore("manager", { keyPath: "id" });
          }
        }
      },
      {
        version: 5,
        description: "キーワードストアの追加",
        execute: async (db) => {
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
              request.onerror = () => reject(request.error);
            });
          });
        }
      },
      {
        version: 7,
        description: "videosストアにtagsインデックスを追加",
        execute: async (db, transaction) => {
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
          mylistsRequest.onerror = () => reject(mylistsRequest.error);
        }),
        new Promise((resolve, reject) => {
          videosRequest.onsuccess = () => resolve(videosRequest.result);
          videosRequest.onerror = () => reject(videosRequest.error);
        }),
        new Promise((resolve, reject) => {
          keywordsRequest.onsuccess = () => resolve(keywordsRequest.result);
          keywordsRequest.onerror = () => reject(keywordsRequest.error);
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
        request.onerror = () => reject(request.error);
      });
      db.close();
    } catch (error) {
      health.issues.push(`Health check failed: ${error}`);
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
          request.onerror = () => reject(request.error);
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
        request.onerror = () => reject(request.error);
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
    const backup = JSON.parse(backupData);
    const db = await this.initDB();
    try {
      const storeNames = Object.keys(backup.data);
      const transaction = db.transaction(storeNames, "readwrite");
      for (const storeName of storeNames) {
        const store = transaction.objectStore(storeName);
        await new Promise((resolve, reject) => {
          const clearRequest = store.clear();
          clearRequest.onsuccess = () => resolve();
          clearRequest.onerror = () => reject(clearRequest.error);
        });
        const data = backup.data[storeName];
        for (const item of data) {
          await new Promise((resolve, reject) => {
            const putRequest = store.put(item);
            putRequest.onsuccess = () => resolve();
            putRequest.onerror = () => reject(putRequest.error);
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
                const history = getRequest.result?.value || [];
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
                putRequest.onerror = () => reject2(putRequest.error);
              };
              getRequest.onerror = () => reject2(getRequest.error);
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
      request.onerror = () => reject(request.error);
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
        this.processQueue();
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
    this.processQueue();
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
      request.onerror = () => reject(request.error);
    });
  }
  async getAllMylists() {
    const database = await this.db.initDB();
    const transaction = database.transaction(["mylists"], "readonly");
    const store = transaction.objectStore("mylists");
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
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
        updateRequest.onerror = () => reject(request.error);
      };
      request.onerror = () => reject(request.error);
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
            return new Promise((res) => {
              const request = videoStore.delete(key);
              request.onsuccess = () => res();
            });
          }),
          new Promise((res) => {
            const request = mylistStore.delete(mylistId);
            request.onsuccess = () => res();
          })
        ]).then(() => resolve()).catch(reject);
      };
      deleteVideos.onerror = () => reject(deleteVideos.error);
    });
  }
}

class VideoService {
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
        if (existingVideos && existingVideos.id === videoInfo.id) {
          reject("このマイリストには既に登録されています");
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
          addedAt: Date.now()
        };
        const addRequest = store.add(video);
        addRequest.onsuccess = () => resolve("追加しました");
        addRequest.onerror = () => reject("追加に失敗しました");
      };
      request.onerror = () => reject(request.error);
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
      request.onerror = () => reject(request.error);
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
        reject("削除に失敗しました");
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
}

class KeywordService {
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
      request.onerror = () => reject(request.error);
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
      request.onerror = () => reject(request.error);
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
      request.onerror = () => reject(request.error);
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
        updateRequest.onerror = () => reject(request.error);
      };
      request.onerror = () => reject(request.error);
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
        updateRequest.onerror = () => reject(request.error);
      };
      request.onerror = () => reject(request.error);
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
      request.onerror = () => reject(request.error);
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
      request.onerror = () => reject(request.error);
    });
    const videosTransaction = database.transaction(["videos"], "readonly");
    const videosStore = videosTransaction.objectStore("videos");
    const allVideos = await new Promise((resolve, reject) => {
      const request = videosStore.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const keywordsTransaction = database.transaction(["keywords"], "readonly");
    const keywordsStore = keywordsTransaction.objectStore("keywords");
    const keywords = await new Promise((resolve, reject) => {
      const request = keywordsStore.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
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
          reject(transaction.error);
        };
      } catch (error) {
        reject(error);
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
  constructor(db) {
    this.db = db;
  }
  async saveManagerSettings(settings) {
    const database = await this.db.initDB();
    const transaction = database.transaction(["manager"], "readwrite");
    const store = transaction.objectStore("manager");
    return new Promise((resolve, reject) => {
      const request = store.put({
        id: "settings",
        mylistSortType: settings.mylistSortType || "name_asc",
        videoSortType: settings.videoSortType || "uploadedAt_desc"
      });
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
  async loadManagerSettings() {
    const database = await this.db.initDB();
    const transaction = database.transaction(["manager"], "readonly");
    const store = transaction.objectStore("manager");
    return new Promise((resolve, reject) => {
      const request = store.get("settings");
      request.onsuccess = () => {
        resolve(
          request.result || {
            mylistSortType: "name_asc",
            videoSortType: "uploadedAt_desc"
          }
        );
      };
      request.onerror = () => reject(request.error);
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
          issues: [`Initialization failed: ${error}`],
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
        issues: [`Health check failed: ${error}`],
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
    const issues = health.issues.join(", ");
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
    const intervalMs = intervalHours * 60 * 60 * 1e3;
    setInterval(async () => {
      try {
        const result = await this.createBackup();
        if (result.success && result.backupData) {
          localStorage.setItem("mylist2_auto_backup", result.backupData);
          localStorage.setItem("mylist2_auto_backup_timestamp", (/* @__PURE__ */ new Date()).toISOString());
          window.logger?.info("Auto backup completed");
        } else {
          window.logger?.error("Auto backup failed:", result.error);
        }
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
}

class ModalService {
  // カスタムアラートの実装
  showCustomAlert(message, type = "info", title = "") {
    return new Promise((resolve) => {
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
      document.body.insertAdjacentHTML("beforeend", modalHTML);
      const modal = document.querySelector(".cml2-alert-modal");
      const okButton = document.getElementById("alertOkButton");
      if (!modal || !okButton) {
        window.logger.error("アラートモーダルの要素が作成できませんでした");
        resolve(false);
        return;
      }
      modal.style.display = "flex";
      okButton.addEventListener("click", () => {
        modal.remove();
        resolve(true);
      });
    });
  }
  // カスタム確認ダイアログの実装
  showCustomConfirm(message, type = "warning", title = "") {
    return new Promise((resolve) => {
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
      document.body.insertAdjacentHTML("beforeend", modalHTML);
      const modal = document.querySelector(".cml2-alert-modal");
      const okButton = document.getElementById("confirmOkButton");
      const cancelButton = document.getElementById("confirmCancelButton");
      if (!modal || !okButton || !cancelButton) {
        window.logger.error("確認モーダルの要素が作成できませんでした");
        resolve(false);
        return;
      }
      modal.style.display = "flex";
      okButton.addEventListener("click", () => {
        modal.remove();
        resolve(true);
      });
      cancelButton.addEventListener("click", () => {
        modal.remove();
        resolve(false);
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
      document.body.insertAdjacentHTML("beforeend", modalHTML);
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
        confirmBtn.addEventListener("click", () => {
          const selectedId = parseInt(select.value);
          modal.remove();
          resolve(selectedId);
        });
        cancelBtn.addEventListener("click", () => {
          modal.remove();
          resolve(null);
        });
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
    return {
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
      addedAt: Date.now(),
      mylistId: currentMylistId
    };
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
    this.initializeSettings();
  }
  // デリゲートメソッド群（各サービスへの橋渡し）
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
      this.renderMylistList(mylists);
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
          this.selectMylist(parseInt(id));
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
    this.initializeSettings();
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
      button.addEventListener("click", async (event) => {
        await this.eventHandlers.handleVideoMove(event);
      });
    });
    videoList.querySelectorAll(".copy-video").forEach((button) => {
      button.addEventListener("click", async (event) => {
        await this.eventHandlers.handleVideoCopy(event);
      });
    });
    videoList.querySelectorAll(".delete-video").forEach((button) => {
      button.addEventListener("click", async (event) => {
        await this.eventHandlers.handleVideoDelete(event);
      });
    });
    videoList.querySelectorAll(".refresh-video").forEach((button) => {
      button.addEventListener("click", async (event) => {
        await this.eventHandlers.handleVideoRefresh(event);
      });
    });
    videoList.querySelectorAll(".open-video-details").forEach((button) => {
      button.addEventListener("click", async (event) => {
        const target = event.currentTarget.closest(".video-item");
        if (!target) return;
        const compositeId = target.dataset.compositeId;
        if (!compositeId) {
          const descFromDom = target.dataset.description;
          const tagsFromDom = target.dataset.tags;
          const fallback = {};
          if (descFromDom) fallback.description = descFromDom;
          if (tagsFromDom) {
            try {
              fallback.tags = JSON.parse(tagsFromDom);
            } catch (err) {
            }
          }
          await this.showVideoDetailsModal(fallback);
          return;
        }
        try {
          const db = await this.manager.getDB();
          const tx = db.transaction(["videos"], "readonly");
          const store = tx.objectStore("videos");
          const video = await new Promise((resolve, reject) => {
            const req = store.get(compositeId);
            req.onsuccess = () => resolve(req.result || null);
            req.onerror = () => reject(req.error);
          });
          db.close();
          const descFromDom = target.dataset.description;
          const tagsFromDom = target.dataset.tags;
          if (video) {
            if (video.description === void 0 && descFromDom) {
              video.description = descFromDom;
            }
            if (video.tags === void 0 && tagsFromDom) {
              try {
                video.tags = JSON.parse(tagsFromDom);
              } catch (err) {
                void err;
              }
            }
            await this.showVideoDetailsModal(video);
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
            await this.showVideoDetailsModal(fallback);
          }
        } catch (e) {
          window.logger.error("詳細表示に失敗:", e);
        }
      });
    });
    videoList.addEventListener("click", async (ev) => {
      const trigger = ev.target.closest(".open-video-details");
      if (!trigger) return;
      const target = trigger.closest(".video-item");
      if (!target) return;
      const compositeId = target.dataset.compositeId;
      const descFromDom = target.dataset.description;
      const tagsFromDom = target.dataset.tags;
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
          await this.showVideoDetailsModal(fallback);
          return;
        }
        const db = await this.manager.getDB();
        const tx = db.transaction(["videos"], "readonly");
        const store = tx.objectStore("videos");
        const video = await new Promise((resolve, reject) => {
          const req = store.get(compositeId);
          req.onsuccess = () => resolve(req.result || null);
          req.onerror = () => reject(req.error);
        });
        db.close();
        if (video) {
          if (video.description === void 0 && descFromDom) {
            video.description = descFromDom;
          }
          if (video.tags === void 0 && tagsFromDom) {
            try {
              video.tags = JSON.parse(tagsFromDom);
            } catch (err) {
              void err;
            }
          }
          await this.showVideoDetailsModal(video);
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
          await this.showVideoDetailsModal(fallback);
        }
      } catch (e) {
        window.logger.error("詳細表示(委譲)に失敗:", e);
      }
    });
  }
  setupKeywordActions(videoList) {
    videoList.querySelectorAll(".move-keyword").forEach((button) => {
      button.addEventListener("click", async (event) => {
        await this.eventHandlers.handleKeywordMove(event);
      });
    });
    videoList.querySelectorAll(".copy-keyword").forEach((button) => {
      button.addEventListener("click", async (event) => {
        await this.eventHandlers.handleKeywordCopy(event);
      });
    });
    videoList.querySelectorAll(".delete-keyword").forEach((button) => {
      button.addEventListener("click", async (event) => {
        await this.eventHandlers.handleKeywordDelete(event);
      });
    });
    videoList.querySelectorAll(".edit-keyword").forEach((button) => {
      button.addEventListener("click", async (event) => {
        await this.eventHandlers.handleKeywordEdit(event);
      });
    });
  }
  // 残りのメソッド実装
  initializeEventListeners() {
    const createNewMylistElement = document.getElementById("createNewMylist");
    if (createNewMylistElement) {
      createNewMylistElement.addEventListener("click", async () => {
        const nameInput = document.getElementById("newMylistName");
        if (!nameInput) {
          await this.showCustomAlert("マイリスト名入力欄が見つかりません");
          return;
        }
        try {
          const name = this.validateInput(nameInput.value, "mylistName");
          await this.manager.createMylist(name);
          nameInput.value = "";
          this.loadMylists();
        } catch (error) {
          window.logger.error("マイリストの作成に失敗しました:", error);
          const errorMessage = error instanceof Error ? error.message : "マイリストの作成に失敗しました";
          await this.showCustomAlert(errorMessage);
        }
      });
    }
    const addVideoElement = document.getElementById("addVideo");
    if (addVideoElement) {
      addVideoElement.addEventListener("click", async () => {
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
      });
    }
    const videoIdInputElement = document.getElementById("videoIdInput");
    if (videoIdInputElement) {
      videoIdInputElement.addEventListener("keypress", async (event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          const addVideoElement2 = document.getElementById("addVideo");
          if (addVideoElement2) {
            addVideoElement2.click();
          }
        }
      });
    }
    const addKeywordElement = document.getElementById("addKeyword");
    if (addKeywordElement) {
      addKeywordElement.addEventListener("click", async () => {
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
      });
    }
    const keywordInputElement = document.getElementById("keywordInput");
    if (keywordInputElement) {
      keywordInputElement.addEventListener("keypress", async (event) => {
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
      executeSelectedActionElement.addEventListener("click", async () => {
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
      });
    }
    const saveMylistNameElement = document.getElementById("saveMylistName");
    if (saveMylistNameElement) {
      saveMylistNameElement.addEventListener("click", async () => {
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
      });
    }
    const deleteMylistElement = document.getElementById("deleteMylist");
    if (deleteMylistElement) {
      deleteMylistElement.addEventListener("click", async () => {
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
      });
    }
    const exportMylistElement = document.getElementById("exportMylist");
    if (exportMylistElement) {
      exportMylistElement.addEventListener("click", async () => {
        try {
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
          await this.showCustomAlert("エクスポートが完了しました");
        } catch (error) {
          window.logger.error("エクスポートに失敗しました:", error);
          const errorMessage = error instanceof Error ? error.message : "エクスポートに失敗しました";
          await this.showCustomAlert("エクスポートに失敗しました: " + errorMessage);
        }
      });
    }
    const importMylistElement = document.getElementById("importMylist");
    if (importMylistElement) {
      importMylistElement.addEventListener("click", async () => {
        const input = document.getElementById("importFile");
        if (!input) {
          await this.showCustomAlert("インポートファイル選択要素が見つかりません");
          return;
        }
        input.accept = ".json,.txt";
        input.click();
      });
    }
    const importFileElement = document.getElementById("importFile");
    if (importFileElement) {
      importFileElement.addEventListener("change", async (event) => {
        const input = event.target;
        const file = input.files?.[0];
        if (!file) return;
        try {
          const text = await file.text();
          let mylistId;
          try {
            const data = JSON.parse(text);
            if (Array.isArray(data) && data[0]?.vid) {
              this.showProgress();
              mylistId = await this.manager.importLegacyData(
                text,
                (current, total) => this.updateProgress(current, total)
              );
              await this.showCustomAlert("カスタムマイリスト1のデータを正常にインポートしました");
            } else {
              this.showProgress();
              await this.manager.importData(data);
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
      });
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
  // 動画詳細モーダルの表示
  async showVideoDetailsModal(video) {
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
            </div>
            <div class="cml2-modal-footer">
              <button type="button" class="cml2-btn close-button">閉じる</button>
            </div>
          </div>
        </div>`;
      document.body.insertAdjacentHTML("beforeend", html);
      modal = document.getElementById(modalId);
    }
    if (!modal) return;
    const descEl = modal.querySelector(".video-description");
    const tagsEl = modal.querySelector(".video-tags");
    if (descEl) descEl.textContent = video.description || "(説明なし)";
    if (tagsEl) {
      const tags = video.tags && video.tags.length > 0 ? video.tags : [];
      tagsEl.innerHTML = tags.length > 0 ? tags.map((t) => `<span class="tag" style="display:inline-block;background:#2a2b2c;border:1px solid #444;border-radius:12px;padding:2px 8px;margin:2px 6px 0 0;">${t}</span>`).join("") : "(タグなし)";
    }
    modal.style.display = "flex";
    const closeBtn = modal.querySelector(".close-button");
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
    document.addEventListener("keydown", onKeydown);
    modal.addEventListener("click", onBackdrop);
  }
  initializeHeaderControls() {
    const searchExecElement = document.getElementById("searchExec");
    if (searchExecElement) {
      searchExecElement.addEventListener("click", () => {
        this.executeSearch();
      });
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
          this.executeSearch();
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
        if (title.includes(searchText) || author.includes(searchText)) {
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
    if (!mylistSort || !videoSort) {
      window.logger.error("ソート選択要素が見つかりません");
      return;
    }
    mylistSort.value = settings.mylistSortType;
    videoSort.value = settings.videoSortType;
    await this.loadMylists();
    if (this.currentMylistId) {
      await this.loadVideos();
    }
    mylistSort.addEventListener("change", async () => {
      await this.manager.saveManagerSettings({
        mylistSortType: mylistSort.value,
        videoSortType: videoSort.value
      });
      this.loadMylists();
    });
    videoSort.addEventListener("change", async () => {
      await this.manager.saveManagerSettings({
        mylistSortType: mylistSort.value,
        videoSortType: videoSort.value
      });
      this.loadVideos();
    });
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
    title: "Mylist2",
    showSearch: true,
    showMoreLinks: true,
    enableFixedMode: false
  });
  new Mylist2ManagerUI();
});
//# sourceMappingURL=mylist2.es.js.map
