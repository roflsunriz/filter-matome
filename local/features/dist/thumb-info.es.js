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
  clear: "clear_all",
  play: "play_arrow",
  search: "search",
  home: "home",
  bookmark: "bookmark",
  live_tv: "live_tv",
  image: "image",
  tv: "tv",
  video_library: "video_library"};
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

const fetchData = async (url, options = {}) => {
  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response;
  } catch (error) {
    window.logger.error(error);
    let message = "";
    if (error instanceof Error) {
      message = error.message;
    } else {
      message = String(error);
    }
    window.toastr.error(
      `APIからの応答が失敗 (${message})`,
      "データの取得に失敗しました",
      { timeOut: 5e3 }
    );
    throw error;
  }
};
const copyToClipboard = async (content, label) => {
  try {
    if (!navigator.clipboard) {
      const tempInput = document.createElement("input");
      tempInput.value = content;
      document.body.appendChild(tempInput);
      tempInput.select();
      document.execCommand("copy");
      document.body.removeChild(tempInput);
    } else {
      await navigator.clipboard.writeText(content);
    }
    window.toastr.success(
      `${label}をクリップボードにコピーしました！`,
      `コピーした内容: ${content}`,
      { timeOut: 3e3 }
    );
  } catch (error) {
    let message = "";
    if (error instanceof Error) {
      message = error.message;
    } else {
      message = String(error);
    }
    window.toastr.error("コピーに失敗しました", message, { timeOut: 3e3 });
  }
};
const getApiData = {
  // サムネイル情報取得
  async thumb(url) {
    const response = await fetchData(url);
    const text = await response.text();
    return new DOMParser().parseFromString(text, "text/html");
  },
  // コメント情報取得
  async comment(url, params, threadKey) {
    const options = {
      method: "POST",
      headers: {
        "x-client-os-type": "others",
        "X-Frontend-Id": "6",
        "X-Frontend-Version": "0",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ params, threadKey, additionals: {} })
    };
    const response = await fetchData(url, options);
    return response.json();
  }
};
window.apiUtils = {
  fetchData,
  copyToClipboard,
  getApiData
};

const THUMB_INFO_STYLES = `
${materialIconsStyles}
:root {
  --primary-color: #24292f;
  --secondary-color: #0969da;
  --background-color: #ffffff;
  --border-color: #d0d7de;
  --hover-color: #f6f8fa;
  --text-color: #24292f;
  --success-color: #2da44e;
  --container-width: 800px;
  --border-radius: 6px;
  --shadow: 0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24);
}

body {
  background-color: #f6f8fa;
  color: var(--text-color);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
  line-height: 1.5;
}

/* コンテナのスタイル */
#externalDecodedResults,
#nicovideoDecodedResults {
  position: relative;
  width: var(--container-width);
  margin: 20px auto;
  padding: 24px;
  background: var(--background-color);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius);
  box-shadow: var(--shadow);
}

/* ボタンの共通スタイル */
button,
input[type="button"] {
  padding: 8px 16px;
  color: var(--background-color);
  background-color: var(--secondary-color);
  border: 1px solid rgba(27, 31, 36, 0.15);
  border-radius: var(--border-radius);
  cursor: pointer;
  transition: all 0.2s ease;
}

button:hover,
input[type="button"]:hover {
  background-color: #0858c5;
}

/* アクションボタン */
#estimateProcessingTime,
#nicovideoCommentExec {
  display: block;
  width: fit-content;
  margin: 16px auto;
  font-size: 14px;
}

/* コピーボタン */
.copy {
  padding: 4px 12px;
  margin-right: 12px;
  color: var(--text-color);
  background-color: var(--background-color);
  border: 1px solid var(--border-color);
  font-size: 12px;
}

.copy:hover {
  background-color: var(--hover-color);
}

/* アイコンスタイル */
.copy-icon,
.action-icon,
.link-icon {
  display: inline-block;
  margin-right: 8px;
  vertical-align: middle;
}

/* ボタン内のアイコン調整 */
button {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

/* リンク内のアイコン調整 */
a {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

/* 情報表示エリア */
#videoInfoTemplate > p,
#channel-info > p,
#user-info > p {
  padding: 12px;
  margin: 8px 0;
  background-color: var(--hover-color);
  border-radius: var(--border-radius);
  display: flex;
  align-items: center;
}

/* タグコンテナ */
#tags-container {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 16px;
  background-color: var(--hover-color);
  border-radius: var(--border-radius);
}

#tags-container p {
  margin: 0;
  padding: 4px 12px;
  background-color: var(--background-color);
  border: 1px solid var(--border-color);
  border-radius: 20px;
  font-size: 14px;
}

/* 画像スタイル */
#thumbnail-img,
#ch-icon-img,
#user-icon-img {
  max-width: 100%;
  height: auto;
  border-radius: var(--border-radius);
  margin: 16px 0;
}

/* コメントアイテム */
.comment-item {
  margin: 16px 0;
  padding: 16px;
  background-color: var(--background-color);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius);
}

/* コメントサマリー（常時表示） */
.comment-summary {
  margin-bottom: 12px;
}

.comment-body-preview {
  font-size: 14px;
  line-height: 1.4;
  margin-bottom: 8px;
  color: var(--text-color);
  word-wrap: break-word;
}

.comment-basic-info {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  font-size: 12px;
  color: #666;
}

.comment-basic-info > span {
  padding: 2px 8px;
  background-color: var(--hover-color);
  border-radius: 12px;
}

/* 展開/折りたたみボタン */
.comment-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 8px 12px;
  margin: 8px 0;
  background-color: var(--hover-color);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius);
  cursor: pointer;
  transition: background-color 0.2s ease;
  color: var(--text-color);
  font-size: 14px;
}

.comment-toggle:hover {
  background-color: var(--border-color);
}

/* コメント詳細（折りたたみ可能） */
.comment-details {
  margin-top: 12px;
  padding: 12px;
  background-color: var(--hover-color);
  border-radius: var(--border-radius);
  border: 1px solid var(--border-color);
}

/* コメントフィールド */
.comment-field {
  display: flex;
  align-items: center;
  margin: 8px 0;
  padding: 8px;
  background-color: var(--background-color);
  border-radius: var(--border-radius);
}

.comment-field > div {
  flex: 1;
  margin-left: 12px;
}

/* 統計情報 */
.json_length,
.userId_length {
  margin: 16px 0;
  padding: 16px;
  background-color: var(--hover-color);
  border-radius: var(--border-radius);
}

/* リンクスタイル */
a {
  color: var(--secondary-color);
  text-decoration: none;
}

a:hover {
  text-decoration: underline;
}

/* iframeスタイル */
.thumb iframe {
  border-radius: var(--border-radius);
  border: 1px solid var(--border-color);
  margin: 16px 0;
}

/* レスポンシブ対応 */
@media (max-width: 1200px) {
  :root {
    --container-width: 80%;
  }
}

@media (max-width: 768px) {
  :root {
    --container-width: 95%;
  }
  
  #videoInfoTemplate > p,
  .comment-field {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .comment-field > div {
    margin-left: 0;
    margin-top: 8px;
  }
  
  .copy {
    margin: 8px 0;
  }
  
  .comment-basic-info {
    flex-direction: column;
    gap: 8px;
  }
  
  .comment-toggle {
    justify-content: flex-start;
  }
}

/* ダークモード対応 */
@media (prefers-color-scheme: dark) {
  :root {
    --primary-color: #c9d1d9;
    --secondary-color: #58a6ff;
    --background-color: #0d1117;
    --border-color: #30363d;
    --hover-color: #161b22;
    --text-color: #c9d1d9;
  }
  
  body {
    background-color: #010409;
  }
}
`;
const applyThumbInfoStyles = () => {
  const styleElement = document.createElement("style");
  styleElement.textContent = THUMB_INFO_STYLES;
  document.head.appendChild(styleElement);
  return styleElement;
};

const videoIdUtils = {
  // window.openerからvideoIdを取得
  getFromOpener() {
    try {
      return window.opener?.NicoCache_nl?.watch?.apiData?.video?.id || null;
    } catch (error) {
      window.logger.warn("Cannot access window.opener:", error);
      return null;
    }
  },
  // URLからvideoIdを取得
  getFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get("videoId");
  },
  // URLまたはSMIDからSMIDを抽出
  extractSmidFromInput(input) {
    const smidPattern = /([a-z]{2}\d+)/i;
    const match = input.match(smidPattern);
    return match ? match[1].toLowerCase() : null;
  },
  // 優先順位に基づいてvideoIdを取得
  getBestVideoId() {
    return this.getFromOpener() || this.getFromUrl();
  }
};
const domUtils = {
  setElementContent(id, content) {
    const element = document.getElementById(id);
    if (element) element.textContent = content;
  },
  setElementHref(id, href) {
    const element = document.getElementById(id);
    if (element) element.href = href;
  },
  setElementSrc(id, src) {
    const element = document.getElementById(id);
    if (element) element.src = src;
  },
  updateUrlWithVideoId(videoId) {
    const url = new URL(window.location.href);
    url.searchParams.set("videoId", videoId);
    window.history.replaceState({}, "", url.toString());
  }
};
const timeUtils = {
  // 時間形式（MM:SS）を秒に変換
  parseTimeToSeconds(timeString) {
    const parts = timeString.split(":");
    if (parts.length === 2) {
      return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
    } else if (parts.length === 3) {
      return parseInt(parts[0], 10) * 3600 + parseInt(parts[1], 10) * 60 + parseInt(parts[2], 10);
    }
    return 0;
  },
  // 動画長の計算
  calculateVideoLength(VideoLengthString) {
    const timeParts = VideoLengthString.split(":").map(Number);
    return timeParts.length === 3 ? timeParts[0] * 3600 + timeParts[1] * 60 + timeParts[2] : timeParts[0] * 60 + timeParts[1];
  }
};
const estimationUtils = {
  calculateProcessingTime(commentNum, videoLength) {
    const numComments = parseInt(commentNum, 10);
    const lengthInSeconds = timeUtils.parseTimeToSeconds(videoLength);
    const estimatedTime = numComments * 0.01 + lengthInSeconds * 0.05;
    return `推定処理時間: 約${Math.round(estimatedTime)}秒`;
  },
  showProcessingTimeToast(commentNum, videoLength) {
    const timeEstimate = this.calculateProcessingTime(commentNum, videoLength);
    window.toastr.info(timeEstimate);
  }
};
const uiUtils = {
  // videoId入力UIを作成
  createVideoIdInputUI(onSubmit, onCancel) {
    const container = document.createElement("div");
    container.id = "video-id-input-container";
    container.style.cssText = `
      position: fixed;
      top: 20px;
      left: 20px;
      background: #fff;
      border: 2px solid #333;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 4px 8px rgba(0,0,0,0.3);
      z-index: 9999;
      max-width: 400px;
    `;
    container.innerHTML = `
      <h3>動画ID取得</h3>
      <p>動画IDが自動取得できませんでした。</p>
      <p>以下にSMID（例: sm12345678）またはニコニコ動画のURLを入力してください：</p>
      <input type="text" id="video-id-input" placeholder="sm12345678 または https://www.nicovideo.jp/watch/sm12345678" style="width: 100%; padding: 8px; margin: 8px 0;">
      <div style="text-align: right; margin-top: 10px;">
        <button id="video-id-submit" style="padding: 8px 16px; margin-right: 8px;">取得</button>
        <button id="video-id-cancel" style="padding: 8px 16px;">キャンセル</button>
      </div>
    `;
    document.body.appendChild(container);
    const submitBtn = document.getElementById("video-id-submit");
    const cancelBtn = document.getElementById("video-id-cancel");
    const inputField = document.getElementById("video-id-input");
    const handleSubmit = () => {
      const input = inputField.value.trim();
      if (!input) return;
      const smid = videoIdUtils.extractSmidFromInput(input);
      if (smid) {
        container.remove();
        onSubmit(smid);
      } else {
        alert("有効なSMIDまたはURLを入力してください（例: sm12345678）");
      }
    };
    const handleCancel = () => {
      container.remove();
      onCancel();
    };
    if (submitBtn) submitBtn.addEventListener("click", handleSubmit);
    if (cancelBtn) cancelBtn.addEventListener("click", handleCancel);
    if (inputField) {
      inputField.addEventListener("keypress", (e) => {
        if (e.key === "Enter") handleSubmit();
      });
      inputField.focus();
    }
  }
};

class VideoInfoHandler {
  constructor() {
    this.currentVideoId = null;
    // 外部から利用するためのスタティックメソッドに修正
    this.updateVideoInfoDisplay = this.updateVideoInfo;
  }
  // videoIdを設定
  setVideoId(videoId) {
    this.currentVideoId = videoId;
  }
  // ビデオ情報を表示
  async displayVideoInfo(videoId) {
    if (!videoId) {
      const apiStatus = document.getElementById("api-status");
      if (apiStatus) apiStatus.textContent = "Error: No video ID provided";
      return;
    }
    this.currentVideoId = videoId;
    try {
      const apiStatus = document.getElementById("api-status");
      if (apiStatus) apiStatus.textContent = "Loading...";
      domUtils.updateUrlWithVideoId(videoId);
      window.logger.debug(`[DEBUG] URL updated with videoId: ${videoId}`);
      const response = await window.apiUtils.getApiData.thumb(`https://ext.nicovideo.jp/api/getthumbinfo/${videoId}`);
      if (!response) return;
      this.updateVideoInfoDisplay(response, videoId);
      if (apiStatus) apiStatus.textContent = "Success";
      window.logger.debug(`[DEBUG] Video info display completed for: ${videoId}`);
    } catch (error) {
      window.logger.error("Error fetching video info:", error);
      const apiStatus = document.getElementById("api-status");
      if (apiStatus && error instanceof Error) {
        apiStatus.textContent = `Error: ${error.message || "Unknown error"}`;
      }
    }
  }
  // ビデオ情報の表示を更新
  updateVideoInfo(doc, videoId) {
    domUtils.setElementContent("api-status", doc.getElementsByTagName("nicovideo_thumb_response")[0]?.getAttribute("status") ?? "");
    const docTitle = doc.getElementsByTagName("title")[0]?.innerHTML || "Unknown Title";
    domUtils.setElementContent("video-title", docTitle);
    const titleElem = document.getElementById("video-info-title");
    if (titleElem) {
      titleElem.textContent = `概要情報とコメント:${docTitle}(${videoId})`;
      window.logger.debug(`[DEBUG] Title updated to: ${docTitle}`);
    }
    domUtils.setElementContent("video-id", videoId);
    domUtils.setElementContent("video-description", doc.getElementsByTagName("description")[0]?.innerHTML ?? "");
    const thumbnailUrl = doc.getElementsByTagName("thumbnail_url")[0]?.innerHTML ?? "";
    domUtils.setElementContent("thumbnail-url", thumbnailUrl);
    domUtils.setElementSrc("thumbnail-img", thumbnailUrl);
    domUtils.setElementHref("thumbnail-link", thumbnailUrl);
    domUtils.setElementContent("first-retrieve", doc.getElementsByTagName("first_retrieve")[0]?.innerHTML ?? "");
    domUtils.setElementContent("video-length", doc.getElementsByTagName("length")[0]?.innerHTML ?? "");
    domUtils.setElementContent("movie-type", doc.getElementsByTagName("movie_type")[0]?.innerHTML ?? "");
    domUtils.setElementContent("size-high", doc.getElementsByTagName("size_high")[0]?.innerHTML ?? "");
    domUtils.setElementContent("size-low", doc.getElementsByTagName("size_low")[0]?.innerHTML ?? "");
    domUtils.setElementContent("view-counter", doc.getElementsByTagName("view_counter")[0]?.innerHTML ?? "");
    domUtils.setElementContent("comment-num", doc.getElementsByTagName("comment_num")[0]?.innerHTML ?? "");
    domUtils.setElementContent("mylist-counter", doc.getElementsByTagName("mylist_counter")[0]?.innerHTML ?? "");
    domUtils.setElementContent("last-res-body", doc.getElementsByTagName("last_res_body")[0]?.innerHTML ?? "");
    const watchUrl = doc.getElementsByTagName("watch_url")[0]?.innerHTML ?? "";
    domUtils.setElementContent("watch-url", watchUrl);
    domUtils.setElementHref("watch-link", watchUrl);
    const shortUrl = `https://nico.ms/${videoId}`;
    domUtils.setElementHref("watch-link-short", shortUrl);
    domUtils.setElementContent("thumb-type", doc.getElementsByTagName("thumb_type")[0]?.innerHTML ?? "");
    domUtils.setElementContent("embeddable", doc.getElementsByTagName("embeddable")[0]?.innerHTML ?? "");
    domUtils.setElementContent("no-live-play", doc.getElementsByTagName("no_live_play")[0]?.innerHTML ?? "");
    const thumbElem = document.getElementById("video-thumb");
    if (thumbElem) thumbElem.src = `https://ext.nicovideo.jp/thumb/${videoId}`;
    domUtils.setElementContent("tags-domain", doc.getElementsByTagName("tags")[0]?.getAttribute("domain") ?? "");
    this.updateTags(doc);
    domUtils.setElementContent("genre", doc.getElementsByTagName("genre")[0]?.innerHTML ?? "");
    this.updateCreatorInfo(doc);
    this.updateCopyButtons(doc, videoId);
  }
  // タグの更新
  updateTags(doc) {
    const tagsContainer = document.getElementById("tags-container");
    if (!tagsContainer) return;
    tagsContainer.innerHTML = "";
    const tags = Array.from(doc.getElementsByTagName("tag") || []);
    if (tags.length > 0) {
      tags.forEach((tag) => {
        const tagElement = document.createElement("span");
        tagElement.className = "tag";
        tagElement.textContent = tag.innerHTML;
        tagsContainer.appendChild(tagElement);
      });
    } else {
      const noTagsElement = document.createElement("span");
      noTagsElement.textContent = "タグはありません";
      tagsContainer.appendChild(noTagsElement);
    }
  }
  // チャンネル/ユーザー情報の更新
  updateCreatorInfo(doc) {
    const channelInfo = document.getElementById("channel-info");
    const userInfo = document.getElementById("user-info");
    if (!channelInfo || !userInfo) return;
    try {
      const chIconUrl = doc.getElementsByTagName("ch_icon_url")[0]?.innerHTML;
      if (!chIconUrl) throw new Error("No channel info");
      channelInfo.style.display = "block";
      userInfo.style.display = "none";
      domUtils.setElementContent("ch-id", doc.getElementsByTagName("ch_id")[0]?.innerHTML ?? "");
      domUtils.setElementContent("ch-name", doc.getElementsByTagName("ch_name")[0]?.innerHTML ?? "");
      domUtils.setElementContent("ch-icon-url", chIconUrl);
      domUtils.setElementHref("ch-icon-link", chIconUrl);
      domUtils.setElementSrc("ch-icon-img", chIconUrl);
    } catch {
      const userIdElement = doc.getElementsByTagName("user_id")[0];
      if (userIdElement) {
        const userId = userIdElement.innerHTML;
        channelInfo.style.display = "none";
        userInfo.style.display = "block";
        domUtils.setElementContent("user-id", userId);
        const userNicknameElement = doc.getElementsByTagName("user_nickname")[0];
        const userIconUrlElement = doc.getElementsByTagName("user_icon_url")[0];
        if (userNicknameElement && userIconUrlElement) {
          const userNickname = userNicknameElement.innerHTML;
          const userIconUrl = userIconUrlElement.innerHTML;
          domUtils.setElementContent("user-nickname", userNickname);
          domUtils.setElementContent("user-icon-url", userIconUrl);
          domUtils.setElementHref("user-icon-link", userIconUrl);
          domUtils.setElementSrc("user-icon-img", userIconUrl);
        } else {
          domUtils.setElementContent("user-nickname", "(退会済みユーザー)");
          domUtils.setElementContent("user-icon-url", "");
          domUtils.setElementHref("user-icon-link", "#");
          domUtils.setElementSrc("user-icon-img", "");
          const userIconImg = document.getElementById("user-icon-img");
          if (userIconImg) userIconImg.alt = "退会済みユーザー";
        }
      } else {
        window.logger.error("user_id element not found");
        channelInfo.style.display = "none";
        userInfo.style.display = "none";
      }
    }
  }
  // コピーボタンのデータ属性を更新
  updateCopyButtons(doc, videoId) {
    const copyData = {
      "title": doc.getElementsByTagName("title")[0]?.innerHTML ?? "",
      "videoId": videoId,
      "thumbnailUrl": doc.getElementsByTagName("thumbnail_url")[0]?.innerHTML ?? "",
      "watchUrl": doc.getElementsByTagName("watch_url")[0]?.innerHTML ?? "",
      "watchUrlShort": `https://nico.ms/${videoId}`,
      "channelIcon": doc.getElementsByTagName("ch_icon_url")?.[0]?.innerHTML ?? "",
      "userIcon": doc.getElementsByTagName("user_icon_url")?.[0]?.innerHTML ?? ""
    };
    document.querySelectorAll(".copy").forEach((button) => {
      const el = button;
      const type = el.dataset.type;
      if (type && copyData[type]) {
        el.dataset.mydata = copyData[type];
      }
    });
  }
  // コピー機能
  handleCopy(event) {
    const button = event.target;
    const type = button.getAttribute("data-type");
    window.logger.debug(`[DEBUG] handleCopy called with type: ${type}`);
    let textToCopy = "";
    let label = "";
    switch (type) {
      case "title":
        textToCopy = document.getElementById("video-title")?.textContent || "";
        label = "タイトル";
        break;
      case "videoId":
        textToCopy = document.getElementById("video-id")?.textContent || "";
        label = "動画ID";
        break;
      case "thumbnailUrl":
        textToCopy = document.getElementById("thumbnail-url")?.textContent || "";
        label = "サムネイルURL";
        break;
      case "watchUrl":
        textToCopy = document.getElementById("watch-url")?.textContent || "";
        label = "視聴URL";
        break;
      case "watchUrlShort":
        textToCopy = `https://nico.ms/${document.getElementById("video-id")?.textContent || ""}`;
        label = "短縮視聴URL";
        break;
      case "channelIcon":
        textToCopy = document.getElementById("ch-icon-url")?.textContent || "";
        label = "チャンネルアイコンURL";
        break;
      case "userIcon":
        textToCopy = document.getElementById("user-icon-url")?.textContent || "";
        label = "ユーザーアイコンURL";
        break;
      default:
        window.logger.warn(`[DEBUG] Unknown copy type: ${type}`);
        break;
    }
    window.logger.debug(`[DEBUG] textToCopy: "${textToCopy}", label: "${label}"`);
    if (textToCopy && textToCopy.trim() !== "") {
      window.apiUtils.copyToClipboard(textToCopy, label);
    } else {
      window.toastr.error(
        `${label}をコピーできませんでした`,
        `対象の要素が見つからないか、内容が空です。type: ${type}`,
        { timeOut: 5e3 }
      );
      window.logger.error(`[DEBUG] Copy failed - empty text for type: ${type}`);
    }
  }
}

class CommentHandler {
  constructor() {
    this.currentVideoId = null;
  }
  // videoIdを設定
  setVideoId(videoId) {
    this.currentVideoId = videoId;
  }
  // コメント処理を開始
  async startCommentProcessing(videoId) {
    const commentNum = document.getElementById("comment-num")?.textContent ?? "0";
    const videoLength = document.getElementById("video-length")?.textContent ?? "0:00";
    window.toastr.info(
      "コメント処理開始。",
      `推定処理時間: ${estimationUtils.calculateProcessingTime(commentNum, videoLength)}`,
      { timeOut: 5e3 }
    );
    const startTime = performance.now();
    try {
      const nicoData = await window.commonHelper.fetchNicoDataWithComments(videoId);
      if (!nicoData) {
        window.toastr.error(
          "コメント取得に失敗しました。",
          "APIからのレスポンスが取得できませんでした。",
          { timeOut: 5e3 }
        );
        return;
      }
      window.toastr.info(
        "コメント処理中です。",
        "通信完了。少々お待ちください。",
        { timeOut: 5e3 }
      );
      this.processComments(nicoData);
      const performanceTime = performance.now() - startTime;
      window.toastr.success(
        "処理完了&レンダリング完了しました!",
        `処理時間: ${performanceTime}ミリ秒`,
        { timeOut: 8e3 }
      );
      const decodedResults = document.querySelector("#nicovideoDecodedResults");
      if (decodedResults) decodedResults.scrollIntoView({ behavior: "smooth" });
    } catch (error) {
      window.logger.error(error);
      window.toastr.error(
        "コメント処理中にエラーが発生しました。",
        error instanceof Error ? error.message : String(error),
        { timeOut: 5e3 }
      );
    }
  }
  // コメントを処理
  processComments(nicoData) {
    try {
      const comments = nicoData.comments;
      if (!comments || comments.length === 0) {
        throw new Error("コメントデータが見つかりません");
      }
      const template = document.getElementById("commentTemplate");
      if (template) template.style.display = "block";
      const threadUrlElem = document.getElementById("comment-thread-url");
      if (threadUrlElem) {
        threadUrlElem.textContent = nicoData.apiData?.comment?.nvComment?.server + "/v1/threads" || "Unknown URL";
      }
      const threadIdElem = document.getElementById("thread-id");
      if (threadIdElem) {
        threadIdElem.textContent = nicoData.mainThread?.id || "Unknown Thread ID";
      }
      this.renderComments(comments);
      this.updateStatistics(comments);
    } catch (error) {
      window.logger.error(error);
      let message = "";
      if (error instanceof Error) {
        message = error.message;
      } else {
        message = String(error);
      }
      window.toastr.error(
        "コメント処理中にエラーが発生しました。",
        message,
        { timeOut: 5e3 }
      );
    }
  }
  // コメントをレンダリング
  renderComments(comments) {
    const container = document.getElementById("comments-container");
    if (!container) return;
    container.innerHTML = "";
    comments.forEach((comment) => {
      const commentElement = this.createCommentElement(comment);
      container.appendChild(commentElement);
    });
  }
  // コメント要素を作成
  createCommentElement(comment) {
    const div = document.createElement("div");
    div.className = "comment-item";
    const summaryDiv = this.createCommentSummary(comment);
    const detailsDiv = this.createCommentDetails(comment);
    detailsDiv.style.display = "none";
    const toggleButton = this.createToggleButton(detailsDiv);
    div.appendChild(summaryDiv);
    div.appendChild(toggleButton);
    div.appendChild(detailsDiv);
    return div;
  }
  // コメントサマリーを作成
  createCommentSummary(comment) {
    const summaryDiv = document.createElement("div");
    summaryDiv.className = "comment-summary";
    summaryDiv.innerHTML = `
      <div class="comment-body-preview">${String(comment.body || "").substring(0, 100)}${String(comment.body || "").length > 100 ? "..." : ""}</div>
      <div class="comment-basic-info">
        <span class="comment-time">${this.formatDate(comment.postedAt || "", "postedAt")}</span>
        <span class="comment-user">User: ${comment.userId || "Anonymous"}</span>
        <span class="comment-no">No: ${comment.no || "N/A"}</span>
      </div>
    `;
    return summaryDiv;
  }
  // コメント詳細を作成
  createCommentDetails(comment) {
    const detailsDiv = document.createElement("div");
    detailsDiv.className = "comment-details";
    const commentFields = [
      { key: "id", label: "ID", className: "comment_id" },
      { key: "no", label: "No", className: "comment_no" },
      { key: "vposMs", label: "vposMs", className: "vposMs" },
      { key: "vposMs", label: "vposMs(整形済み)", className: "formatted-vposMs", format: (val) => this.formatDate(val, "vpos") },
      { key: "body", label: "コメント内容", className: "comment_body" },
      { key: "commands", label: "コマンド", className: "comment_commands" },
      { key: "userId", label: "ユーザーID", className: "userId" },
      { key: "isPremium", label: "プレミアム", className: "isPremium" },
      { key: "score", label: "スコア", className: "score" },
      { key: "postedAt", label: "投稿日時", className: "postedAt" },
      { key: "postedAt", label: "投稿日時(整形済み)", className: "formatted-postedAt", format: (val) => this.formatDate(val, "postedAt") },
      { key: "nicoruCount", label: "ニコる数", className: "nicoruCount" },
      { key: "nicoruId", label: "ニコるID", className: "nicoruId" },
      { key: "source", label: "ソース", className: "source" },
      { key: "isMyPost", label: "自分の投稿", className: "isMyPost" }
    ];
    commentFields.forEach((field) => {
      const fieldDiv = this.createCommentField(comment, field);
      detailsDiv.appendChild(fieldDiv);
    });
    return detailsDiv;
  }
  // コメントフィールドを作成
  createCommentField(comment, field) {
    const fieldDiv = document.createElement("div");
    fieldDiv.className = "comment-field";
    const rawValue = comment[field.key];
    const value = field.format ? field.format(rawValue) : String(rawValue || "");
    if (["id", "body", "userId", "no"].includes(field.key)) {
      window.logger.debug(`[DEBUG] Comment field "${field.key}": rawValue="${rawValue}", value="${value}"`);
    }
    const copyButton = document.createElement("button");
    copyButton.className = "copy";
    copyButton.title = value;
    copyButton.onclick = this.handleCommentCopy.bind(this);
    copyButton.dataset.mydata = value;
    const iconSpan = document.createElement("span");
    iconSpan.className = "copy-icon";
    iconSpan.innerHTML = createMaterialIcon("content_copy", {
      style: "outlined",
      color: "white",
      size: "small"
    });
    const textSpan = document.createElement("span");
    textSpan.textContent = "コピー";
    copyButton.appendChild(iconSpan);
    copyButton.appendChild(textSpan);
    const contentDiv = document.createElement("div");
    contentDiv.className = field.className;
    contentDiv.dataset.mydata = value;
    contentDiv.textContent = `${field.label}: ${value}`;
    fieldDiv.appendChild(copyButton);
    fieldDiv.appendChild(contentDiv);
    return fieldDiv;
  }
  // 展開/折りたたみボタンを作成
  createToggleButton(detailsDiv) {
    const toggleButton = document.createElement("button");
    toggleButton.className = "comment-toggle";
    toggleButton.innerHTML = `
      <span class="toggle-icon">${createMaterialIcon("expand_more", { style: "outlined", color: "dark", size: "small" })}</span>
      <span class="toggle-text">詳細を表示</span>
    `;
    toggleButton.onclick = () => {
      const isExpanded = detailsDiv.style.display !== "none";
      detailsDiv.style.display = isExpanded ? "none" : "block";
      const icon = toggleButton.querySelector(".toggle-icon");
      const text = toggleButton.querySelector(".toggle-text");
      if (icon && text) {
        if (isExpanded) {
          icon.innerHTML = createMaterialIcon("expand_more", { style: "outlined", color: "dark", size: "small" });
          text.textContent = "詳細を表示";
        } else {
          icon.innerHTML = createMaterialIcon("expand_less", { style: "outlined", color: "dark", size: "small" });
          text.textContent = "詳細を非表示";
        }
      }
    };
    return toggleButton;
  }
  // コメントコピー処理
  handleCommentCopy(event) {
    const target = event.target;
    const copyButton = target.closest(".copy");
    if (!copyButton) {
      window.logger.error("[DEBUG] Copy button not found");
      return;
    }
    const content = copyButton.dataset.mydata ?? "";
    const contentDiv = copyButton.nextElementSibling;
    let label = "";
    if (contentDiv && contentDiv.textContent) {
      const labelMatch = contentDiv.textContent.split(":")[0];
      label = labelMatch ? labelMatch.trim() : "";
    }
    window.logger.debug(`[DEBUG] Comment copy - content: "${content}", label: "${label}"`);
    if (content && content.trim() !== "") {
      window.apiUtils.copyToClipboard(content, label);
    } else {
      window.toastr.error(
        `${label}をコピーできませんでした`,
        `データが空です。`,
        { timeOut: 5e3 }
      );
      window.logger.error("[DEBUG] Comment copy failed - empty content");
    }
  }
  // 統計情報を更新
  updateStatistics(comments) {
    const jsonLengthElem = document.getElementById("json-length");
    if (jsonLengthElem) jsonLengthElem.textContent = String(comments.length);
    const userIdLengthElem = document.getElementById("userid-length");
    if (userIdLengthElem) {
      userIdLengthElem.textContent = String(document.getElementsByClassName("userId").length);
    }
  }
  // 日付フォーマット関数
  formatDate(data, format) {
    if (typeof data === "boolean") {
      return String(data);
    }
    if (Array.isArray(data)) {
      return data.join(", ");
    }
    if (typeof data === "number") {
      const date2 = new Date(data);
      const year2 = date2.getFullYear();
      const month2 = String(date2.getMonth() + 1).padStart(2, "0");
      const day2 = String(date2.getDate()).padStart(2, "0");
      const hour2 = String(date2.getHours()).padStart(2, "0");
      const minute2 = String(date2.getMinutes()).padStart(2, "0");
      const second2 = String(date2.getSeconds()).padStart(2, "0");
      return format === "postedAt" ? `${year2}年${month2}月${day2}日${hour2}時${minute2}分${second2}秒` : `${Math.floor(data / 36e5 % 24).toString().padStart(2, "0")}時間${Math.floor(data / 6e4 % 60)}分${Number((data % 6e4 / 1e3).toFixed(0)) < 10 ? "0" : ""}${(data % 6e4 / 1e3).toFixed(0)}秒`;
    }
    const [date, time] = data.split("T");
    const [year, month, day] = date.split("-");
    const [hour, minute, second] = time.split(":");
    return format === "postedAt" ? `${year}年${month}月${day}日${hour}時${minute}分${second.split("+")[0]}秒` : `${Math.floor(Number(data) / 36e5 % 24) < 10 ? "0" + Math.floor(Number(data) / 36e5 % 24) : Math.floor(Number(data) / 36e5 % 24)}時間${Math.floor(Number(data) / 6e4 % 60)}分${Number((Number(data) % 6e4 / 1e3).toFixed(0)) < 10 ? "0" : ""}${(Number(data) % 6e4 / 1e3).toFixed(0)}秒`;
  }
}

class MainController {
  constructor() {
    this.currentVideoId = null;
    this.videoInfoHandler = new VideoInfoHandler();
    this.commentHandler = new CommentHandler();
  }
  // アプリケーションの初期化
  async initialize() {
    window.logger.debug("[DEBUG] MainController: Initializing...");
    applyThumbInfoStyles();
    this.initializeIcons();
    this.setupEventListeners();
    const videoId = videoIdUtils.getBestVideoId();
    if (videoId) {
      await this.initializeWithVideoId(videoId);
    } else {
      this.showVideoIdInputUI();
    }
    window.logger.debug("[DEBUG] MainController: Initialization completed");
  }
  // videoIdで初期化
  async initializeWithVideoId(videoId) {
    window.logger.debug(`[DEBUG] MainController: Initializing with videoId: ${videoId}`);
    this.currentVideoId = videoId;
    this.videoInfoHandler.setVideoId(videoId);
    this.commentHandler.setVideoId(videoId);
    const videoInfoTitle = document.getElementById("video-info-title");
    if (videoInfoTitle) videoInfoTitle.textContent = `Loading... (${videoId})`;
    this.setupGlobalFunctions();
    try {
      window.logger.debug(`[DEBUG] MainController: Starting video info display...`);
      await this.videoInfoHandler.displayVideoInfo(videoId);
      window.logger.debug(`[DEBUG] MainController: Fetching API data...`);
      const fetchResult = await window.commonHelper.fetchWatchPage(videoId);
      if (fetchResult) {
        window.logger.debug(`[DEBUG] MainController: API data fetched successfully`);
      }
      window.logger.debug(`[DEBUG] MainController: Initialization with videoId completed`);
    } catch (error) {
      window.logger.error("MainController: Failed to initialize with videoId:", error);
      this.showError("初期化中にエラーが発生しました", error);
    }
  }
  // グローバル関数を設定（互換性のため）
  setupGlobalFunctions() {
    window.setCurrentVideoId = (videoId) => {
      this.currentVideoId = videoId;
      this.videoInfoHandler.setVideoId(videoId);
      this.commentHandler.setVideoId(videoId);
      window.logger.debug(`[DEBUG] MainController: currentVideoId set to ${videoId}`);
    };
    window.startCommentProcessingWithVideoId = async (videoId) => {
      await this.commentHandler.startCommentProcessing(videoId);
    };
    window.copy_ext = (event) => {
      this.videoInfoHandler.handleCopy(event);
    };
    window.EstimatedProcessingTime = (commentNum, videoLength) => {
      return estimationUtils.calculateProcessingTime(commentNum, videoLength);
    };
    window.EPTWrapper = (message) => {
      window.toastr.info(message);
    };
  }
  // イベントリスナーを設定
  setupEventListeners() {
    const commentExecBtn = document.getElementById("nicovideoCommentExec");
    if (commentExecBtn) {
      commentExecBtn.addEventListener("click", () => {
        if (this.currentVideoId) {
          this.commentHandler.startCommentProcessing(this.currentVideoId);
        } else {
          window.toastr.error(
            "動画IDが設定されていません",
            "先に動画情報を取得してください",
            { timeOut: 5e3 }
          );
        }
      });
    }
    const estimateBtn = document.getElementById("estimateProcessingTime");
    if (estimateBtn) {
      estimateBtn.addEventListener("click", () => {
        const commentNum = document.getElementById("comment-num")?.textContent || "0";
        const videoLength = document.getElementById("video-length")?.textContent || "0:00";
        estimationUtils.showProcessingTimeToast(commentNum, videoLength);
      });
    }
  }
  // アイコンを初期化
  initializeIcons() {
    const copyIcons = document.querySelectorAll(".copy-icon[data-icon]");
    copyIcons.forEach((iconElement) => {
      const iconName = iconElement.getAttribute("data-icon");
      if (iconName) {
        const icon = createMaterialIcon(iconName, {
          style: "outlined",
          color: "white",
          size: "small"
        });
        iconElement.innerHTML = icon;
      }
    });
    const actionIcons = document.querySelectorAll(".action-icon[data-icon]");
    actionIcons.forEach((iconElement) => {
      const iconName = iconElement.getAttribute("data-icon");
      if (iconName) {
        const icon = createMaterialIcon(iconName, {
          style: "outlined",
          color: "white",
          size: "medium"
        });
        iconElement.innerHTML = icon;
      }
    });
    const linkIcons = document.querySelectorAll(".link-icon[data-icon]");
    linkIcons.forEach((iconElement) => {
      const iconName = iconElement.getAttribute("data-icon");
      if (iconName) {
        const icon = createMaterialIcon(iconName, {
          style: "outlined",
          color: "white",
          size: "small"
        });
        iconElement.innerHTML = icon;
      }
    });
  }
  // videoId入力UIを表示
  showVideoIdInputUI() {
    const onSubmit = (videoId) => {
      this.initializeWithVideoId(videoId);
    };
    const onCancel = () => {
      const apiStatus = document.getElementById("api-status");
      const videoInfoTitle = document.getElementById("video-info-title");
      if (apiStatus) apiStatus.textContent = "Error: No video ID provided";
      if (videoInfoTitle) videoInfoTitle.textContent = "No video selected";
    };
    uiUtils.createVideoIdInputUI(onSubmit, onCancel);
  }
  // エラー表示
  showError(title, error) {
    let message = "";
    if (error instanceof Error) {
      message = error.message;
    } else {
      message = String(error);
    }
    window.toastr.error(title, message, { timeOut: 5e3 });
    window.logger.error(`${title}:`, error);
  }
}
const mainController = new MainController();
document.addEventListener("DOMContentLoaded", () => {
  mainController.initialize();
});
//# sourceMappingURL=thumb-info.es.js.map
