var w = Object.defineProperty;
var C = (i, e, t) => e in i ? w(i, e, { enumerable: !0, configurable: !0, writable: !0, value: t }) : i[e] = t;
var s = (i, e, t) => C(i, typeof e != "symbol" ? e + "" : e, t);
class S {
  constructor() {
    s(this, "bar");
    s(this, "currentProgress", 0);
    this.bar = document.createElement("div"), this.bar.className = "global-progress", this.bar.style.display = "none", this.bar.innerHTML = `
      <div class="progress-bar">
        <div class="progress-fill"></div>
      </div>
      <span class="progress-text"></span>
    `, document.body.appendChild(this.bar);
  }
  show(e, t) {
    this.bar.style.display = "flex";
    const r = this.bar.querySelector(".progress-text");
    r && (r.textContent = e), t === !0 ? (this.currentProgress = 100, this.updateFillWidth(!0)) : this.updateFillWidth();
  }
  updateProgress(e, t) {
    this.currentProgress = e / t * 100, this.updateFillWidth();
  }
  updateFillWidth(e) {
    const t = this.bar.querySelector(".progress-fill");
    t && (t.style.width = `${this.currentProgress}%`, e && t.classList.add("error"));
  }
  hide() {
    this.bar.style.display = "none", this.currentProgress = 0, this.updateFillWidth();
  }
}
class q {
  constructor() {
    s(this, "listeners", /* @__PURE__ */ new Map());
  }
  addListener(e, t) {
    var r;
    this.listeners.has(e) || this.listeners.set(e, []), (r = this.listeners.get(e)) == null || r.push(t);
  }
  trigger(e, t) {
    (this.listeners.get(e) || []).forEach((n) => n(t));
  }
}
class E {
  constructor(e) {
    this.progressManager = e;
  }
  // メモリから直接データを取得＆統合
  getAllEntries() {
    this.progressManager.updateProgress(1, 3);
    const e = this.mergeLists();
    this.progressManager.updateProgress(2, 3);
    const t = this.sortEntries(e);
    return this.progressManager.updateProgress(3, 3), t;
  }
  // tempListとcacheListをマージ
  mergeLists() {
    const e = [];
    for (const [t, r] of Object.entries(tempList))
      e.push(this.normalizeEntry(t, r));
    for (const [t, r] of Object.entries(cacheList))
      tempList[t] || e.push(this.normalizeEntry(t, r));
    return e;
  }
  // エントリ正規化（簡易版）
  normalizeEntry(e, t) {
    var r;
    return {
      id: e,
      baseId: ((r = e.match(/^[a-z]{2}\d+/)) == null ? void 0 : r[0]) || e,
      title: t[0] || "タイトル不明",
      thumbnailUrl: this.generateThumbnailUrl(e),
      quality: this.parseQuality(e),
      isTemp: !!tempList[e],
      lastUpdated: Date.now()
    };
  }
  // サムネイルURL生成（sm9 → 9/9）
  generateThumbnailUrl(e) {
    const t = e.match(/[a-z]{2}(\d+)/);
    return `https://nicovideo.cdn.nimg.jp/thumbnails/${t == null ? void 0 : t[1]}/${t == null ? void 0 : t[1]}`;
  }
  // 品質情報をIDから直接解析
  parseQuality(e) {
    const t = e.match(/(\d+)p/);
    return t ? `${t[1]}p` : "unknown";
  }
  // 従来のソートロジックを維持
  sortEntries(e) {
    return e.filter((t) => t && t.id).sort((t, r) => {
      const n = { nm: 1, sm: 2, so: 3 }, a = (o) => o.slice(0, 2), d = (o) => {
        var p;
        return parseInt(((p = o.match(/\d+/)) == null ? void 0 : p[0]) || "0", 10);
      }, l = a(t.id), c = a(r.id);
      return n[l] !== n[c] ? n[l] - n[c] : d(t.id) - d(r.id);
    });
  }
  async getEntriesByIds(e) {
    return (await this.getAllEntries()).filter((r) => e.includes(r.id));
  }
}
class L {
  constructor(e, t) {
    s(this, "container");
    s(this, "batchSize", 50);
    s(this, "renderQueue", []);
    s(this, "createVideoCard");
    s(this, "dataLoader");
    this.container = document.querySelector(".cache-container"), this.createVideoCard = e, this.dataLoader = t;
  }
  // バッチ処理用メソッド
  async processBatch(e) {
    for (this.clearContainer(), this.renderQueue = [...e]; this.renderQueue.length > 0; ) {
      const t = this.renderQueue.splice(0, this.batchSize), r = document.createDocumentFragment();
      t.forEach((n) => {
        const a = this.createVideoCard(n);
        r.appendChild(a);
      }), this.container.appendChild(r), await new Promise((n) => requestAnimationFrame(() => n()));
    }
  }
  // 検索結果用最適化レンダリング
  async renderSearchResults(e) {
    this.clearContainer();
    const t = await this.dataLoader.getEntriesByIds(e);
    if (t.length === 0) {
      this.showNoResultsMessage();
      return;
    }
    await this.processBatch(t);
  }
  showNoResultsMessage() {
    const e = document.createElement("div");
    e.className = "no-results", e.textContent = "該当する動画が見つかりませんでした", this.container.appendChild(e);
  }
  clearContainer() {
    for (; this.container.firstChild; )
      this.container.removeChild(this.container.firstChild);
  }
  findEntryById(e) {
    return this.dataLoader.getAllEntries().find((t) => t.id === e);
  }
}
class M {
  constructor(e) {
    s(this, "index");
    s(this, "indexReady");
    this.dataLoader = e, this.indexReady = this.loadFlexSearch();
  }
  async loadFlexSearch() {
    typeof window.FlexSearch > "u" && await new Promise((e, t) => {
      const r = document.createElement("script");
      r.src = "https://cdn.jsdelivr.net/npm/flexsearch@0.7.31/dist/flexsearch.bundle.js", r.onload = () => e(), r.onerror = () => t(new Error("Failed to load FlexSearch")), document.head.appendChild(r);
    }), this.initializeIndex();
  }
  initializeIndex() {
    this.index = new window.FlexSearch.Document({
      preset: "memory",
      tokenize: "full",
      document: {
        id: "id",
        index: [
          {
            field: "title",
            tokenize: "forward",
            optimize: !1,
            context: {
              depth: 1,
              resolution: 9
            }
          }
        ]
      }
    }), this.rebuildIndex();
  }
  async search(e) {
    const t = e.toLowerCase().trim();
    if (await this.indexReady, !t || !this.index) return [];
    const r = this.index.search(t, {
      limit: 1e3,
      suggest: !0,
      enrich: !0,
      bool: "or"
    });
    return [...new Set(r.flatMap((n) => n.result))].filter((n) => typeof n == "string");
  }
  async rebuildIndex() {
    (await this.dataLoader.getAllEntries()).forEach((t) => {
      this.index.add({
        id: t.id,
        title: t.title.toLowerCase()
        // 小文字化
      });
    });
  }
}
function z() {
  return `
    <div class="header-content">
      <span>CacheDataManager</span>
      <span>${window.ncversion}</span>
      <nav class="main-nav">
        <a href="/" target="_blank" class="nav-link">トップ</a>
        <a href="/video_top" target="_blank" class="nav-link">動画</a>
        <a href="/my/history/" target="_blank" class="nav-link">マイページ</a>
        <a href="/ranking" target="_blank" class="nav-link">ランキング</a>
        <a href="/newarrival" target="_blank" class="nav-link">新着動画</a>
        <a href="/recent" target="_blank" class="nav-link">新着コメント動画</a>
        <a href="/local/features/dist/src/mylist2/index.html" target="_blank" class="nav-link">Mylist2</a>
      </nav>
      <div class="search-box">
        <input type="text" id="searchInput" placeholder="動画を検索...">
        <button id="searchBtn">検索</button>
        <button id="clearSearch">クリア</button>
      </div>
    </div>
  `;
}
function Y() {
  return `
    <div class="card-header">
      <span class="video-id"></span>
    </div>
    <div class="thumbnail-container">
      <img loading="lazy" class="thumbnail-image">
      </div>
      <div class="video-info">
      <h3 class="video-title"></h3>
      <div class="metadata">
      <span class="quality-badge"></span>
      <span class="temp-file"></span>
      </div>
    </div>
    <div class="card-actions">
      <button class="play-btn" title="再生">
        <svg width="24" height="24" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
      </button>
      <button class="save-video-btn" title="動画保存">
        <svg width="24" height="24" viewBox="0 0 24 24"><path d="M17 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm-5 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3-10H5V5h10v4z"/></svg>
      </button>
      <button class="save-audio-btn" title="音声保存">
          <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" width="24" height="24" viewBox="0 0 1080 1080" xml:space="preserve">
          <desc>Created with Fabric.js 5.2.4</desc>
          <defs>
          </defs>
          <g transform="matrix(1 0 0 1 540 540)" id="01a56859-4f49-4a04-b879-ef3552d8e9b9"  >
          </g>
          <g transform="matrix(1 0 0 1 540 540)" id="e78c9921-ea26-40ca-8b84-cf7b46dabb7d"  >
          <rect style="stroke: none; stroke-width: 1; stroke-dasharray: none; stroke-linecap: butt; stroke-dashoffset: 0; stroke-linejoin: miter; stroke-miterlimit: 4; fill: rgb(0, 0, 0); fill-rule: nonzero; opacity: 1; visibility: hidden;" vector-effect="non-scaling-stroke"  x="-540" y="-540" rx="0" ry="0" width="1080" height="1080" />
          </g>
          <g transform="matrix(0.84 0 0 9.13 327.64 502.22)" id="f6e13258-c26e-4c5d-b882-8d7f7a421188"  >
          <rect style="stroke: rgb(0,0,0); stroke-width: 0; stroke-dasharray: none; stroke-linecap: butt; stroke-dashoffset: 0; stroke-linejoin: miter; stroke-miterlimit: 4; fill: rgb(0, 0, 0); fill-rule: nonzero; opacity: 1;" vector-effect="non-scaling-stroke"  x="-33.0835" y="-33.0835" rx="0" ry="0" width="66.167" height="66.167" />
          </g>
          <g transform="matrix(3.91 0 0 2.45 231.41 826.58)" id="bf9d8f3e-b657-4179-98e0-07dc2efefaaf"  >
          <circle style="stroke: rgb(0,0,0); stroke-width: 0; stroke-dasharray: none; stroke-linecap: butt; stroke-dashoffset: 0; stroke-linejoin: miter; stroke-miterlimit: 4; fill: rgb(0, 0, 0); fill-rule: nonzero; opacity: 1;" vector-effect="non-scaling-stroke"  cx="0" cy="0" r="35" />
          </g>
          <g transform="matrix(2.2 -0.79 0.34 0.94 381.11 193.53)" id="735e5aa0-7992-4907-8813-d0dc2b2949f2"  >
          <rect style="stroke: rgb(0,0,0); stroke-width: 0; stroke-dasharray: none; stroke-linecap: butt; stroke-dashoffset: 0; stroke-linejoin: miter; stroke-miterlimit: 4; fill: rgb(0, 0, 0); fill-rule: nonzero; opacity: 1;" vector-effect="non-scaling-stroke"  x="-33.0835" y="-33.0835" rx="0" ry="0" width="66.167" height="66.167" />
          </g>
          <g transform="matrix(2.83 2.02 -0.58 0.81 511.19 233.62)" id="cd75f7e9-d59b-49bd-a451-5834ff279872"  >
          <rect style="stroke: rgb(0,0,0); stroke-width: 0; stroke-dasharray: none; stroke-linecap: butt; stroke-dashoffset: 0; stroke-linejoin: miter; stroke-miterlimit: 4; fill: rgb(0, 0, 0); fill-rule: nonzero; opacity: 1;" vector-effect="non-scaling-stroke"  x="-33.0835" y="-33.0835" rx="0" ry="0" width="66.167" height="66.167" />
          </g>
          <g transform="matrix(6.26 0 0 10.68 765.76 540)" id="4a9145a6-a2c0-4879-8424-e719af8a935a"  >
          <path style="stroke: rgb(0,0,0); stroke-width: 0; stroke-dasharray: none; stroke-linecap: butt; stroke-dashoffset: 0; stroke-linejoin: miter; stroke-miterlimit: 4; fill: rgb(0, 0, 0); fill-rule: nonzero; opacity: 1;" vector-effect="non-scaling-stroke"  transform=" translate(-50, -50)" d="M 81.123 47.531 C 83.818 50.271 83.818 54.711999999999996 81.123 57.405 L 54.954 83.574 C 52.214 86.315 47.82 86.315 45.081 83.574 L 18.91 57.405 C 16.169 54.712 16.169 50.271 18.91 47.531 C 22.689 43.988 33.082 51.784 42.436 55.42 L 42.436 18.999 C 42.436 16.448 44.513 14.37 47.064 14.37 L 54.055 14.37 C 56.607 14.37 58.684 16.448 58.684 18.999 L 58.684 54.947 C 67.518 51.216 76.967 44.319 81.123 47.531 z" stroke-linecap="round" />
          </g>
          <g transform="matrix(1.42 -0.54 0.2 0.52 359.81 157.34)" id="a6256484-f5e9-4642-8512-bf04974a66ae"  >
          <rect style="stroke: rgb(0,0,0); stroke-width: 0; stroke-dasharray: none; stroke-linecap: butt; stroke-dashoffset: 0; stroke-linejoin: miter; stroke-miterlimit: 4; fill: rgb(0, 0, 0); fill-rule: nonzero; opacity: 1;" vector-effect="non-scaling-stroke"  x="-33.0835" y="-33.0835" rx="0" ry="0" width="66.167" height="66.167" />
          </g>
          <g transform="matrix(1.12 1.12 -0.39 0.39 627.65 327.45)" id="19de93f7-e505-44f9-ae4e-5994201acc68"  >
          <rect style="stroke: rgb(0,0,0); stroke-width: 0; stroke-dasharray: none; stroke-linecap: butt; stroke-dashoffset: 0; stroke-linejoin: miter; stroke-miterlimit: 4; fill: rgb(0, 0, 0); fill-rule: nonzero; opacity: 1;" vector-effect="non-scaling-stroke"  x="-33.0835" y="-33.0835" rx="0" ry="0" width="66.167" height="66.167" />
          </g>
          </svg>
      </button>
      <button class="delete-btn" title="削除">
        <svg width="24" height="24" viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
      </button>
    </div>
  `;
}
class $ {
  // ヘッダー/サイドバー/検索UIなどの構築
  constructor(e, t, r) {
    s(this, "dataLoader");
    s(this, "eventManager");
    s(this, "progressManager");
    s(this, "renderer");
    s(this, "searchEngine");
    s(this, "templates", /* @__PURE__ */ new Map());
    this.loadFonts(), this.dataLoader = e, this.eventManager = t, this.progressManager = r, this.initializeTemplates(), this.createHeaderAndContainer(), this.renderer = new L(this.createVideoCard.bind(this), e), this.searchEngine = new M(e), this.setupSearchListener();
  }
  // フォント読み込みメソッド追加
  loadFonts() {
    if (!document.fonts.check('16px "Mochiy Pop P One"')) {
      const e = document.createElement("link");
      e.href = "https://fonts.googleapis.com/css2?family=Mochiy+Pop+P+One&display=swap", e.rel = "stylesheet", e.crossOrigin = "anonymous", document.head.appendChild(e);
    }
  }
  initializeTemplates() {
    const e = document.createElement("div");
    e.className = "video-card", e.innerHTML = Y(), this.templates.set("videoCard", e);
  }
  buildHeader() {
    const e = document.querySelector("header");
    e && e.remove();
    const t = document.createElement("header");
    return t.innerHTML = z(), t;
  }
  createVideoCard(e) {
    const t = this.templates.get("videoCard").cloneNode(!0);
    t.dataset.id = e.baseId, t.querySelector(".video-id").textContent = e.baseId, t.querySelector(".video-title").textContent = e.title === "null" ? "タイトルを取得できません" : e.title || "タイトルを取得できません";
    const r = t.querySelector(".thumbnail-image");
    return r.src = e.thumbnailUrl, r.onerror = () => {
      r.src = "/local/fallback-thumbnail.svg", r.classList.add("error-thumbnail");
    }, t.querySelector(".quality-badge").textContent = e.quality === "unknown" ? "不明な画質" : e.quality || "不明な画質", t.querySelector(".quality-badge").className = `quality-badge ${this.getQualityClass(e.quality)}`, t.querySelector(".temp-file").textContent = this.getTempOrCompleteString(e.isTemp), t;
  }
  getQualityClass(e) {
    const t = parseInt(String(e).replace(/[^0-9]/g, "")) || "unknown";
    return {
      1080: "hd-quality",
      720: "hd-quality",
      480: "sd-quality",
      360: "low-quality",
      unknown: "unknown-quality"
    }[t] || "unknown-quality";
  }
  getTempOrCompleteString(e) {
    return e === !0 ? "Temporary" : "Complete";
  }
  createHeaderAndContainer() {
    document.body.prepend(this.buildHeader());
    const e = document.createElement("div");
    e.className = "cache-container", document.body.appendChild(e);
  }
  async renderAllEntries() {
    this.progressManager.show("動画データ読み込み中");
    try {
      const e = await this.dataLoader.getAllEntries();
      await this.renderer.processBatch(e);
    } finally {
      this.progressManager.hide();
    }
  }
  setupSearchListener() {
    this.eventManager.addListener("search", async (e) => {
      if (!e) return;
      const { query: t } = e;
      this.progressManager.show("検索中...");
      try {
        const r = await this.searchEngine.search(t);
        await this.renderer.renderSearchResults(r);
      } finally {
        this.progressManager.hide();
      }
    }), this.eventManager.addListener("searchClear", async () => {
      this.progressManager.show("全データ再表示中");
      try {
        const e = await this.dataLoader.getAllEntries();
        await this.renderer.processBatch(e);
      } finally {
        this.progressManager.hide();
      }
    });
  }
}
class I {
  constructor() {
    s(this, "baseUrl", "https://ext.nicovideo.jp/api/getthumbinfo/");
    s(this, "cache", /* @__PURE__ */ new Map());
  }
  async fetchVideoInfo(e) {
    if (this.cache.has(e))
      return this.cache.get(e);
    const t = await fetch(`${this.baseUrl}${e}`);
    if (!t.ok)
      throw new Error(`API通信エラー: ${t.status}`);
    const r = await t.text(), n = this.parseResponse(r);
    return this.cache.set(e, n), setTimeout(() => this.cache.delete(e), 30 * 60 * 1e3), n;
  }
  parseResponse(e) {
    var d, l, c, o, p, h, g, f, m, u, b, x, y;
    const r = new DOMParser().parseFromString(e, "text/xml"), n = (d = r.querySelector("error code")) == null ? void 0 : d.textContent;
    if (n)
      return {
        status: "error",
        errorCode: n,
        description: ((l = r.querySelector("error description")) == null ? void 0 : l.textContent) || "不明なエラー"
      };
    const a = r.querySelector("thumb");
    return {
      status: "ok",
      title: ((c = a == null ? void 0 : a.querySelector("title")) == null ? void 0 : c.textContent) || "タイトル不明",
      description: ((o = a == null ? void 0 : a.querySelector("description")) == null ? void 0 : o.textContent) || "説明文がありません",
      duration: ((p = a == null ? void 0 : a.querySelector("length")) == null ? void 0 : p.textContent) || "0:00",
      views: parseInt(((h = a == null ? void 0 : a.querySelector("view_counter")) == null ? void 0 : h.textContent) || "0") || 0,
      commentCount: parseInt(((g = a == null ? void 0 : a.querySelector("comment_num")) == null ? void 0 : g.textContent) || "0") || 0,
      mylistCount: parseInt(((f = a == null ? void 0 : a.querySelector("mylist_counter")) == null ? void 0 : f.textContent) || "0") || 0,
      author: ((m = a == null ? void 0 : a.querySelector("user_nickname")) == null ? void 0 : m.textContent) || ((u = r.querySelector("ch_name")) == null ? void 0 : u.textContent) || "投稿者不明",
      uploadDate: ((b = a == null ? void 0 : a.querySelector("first_retrieve")) == null ? void 0 : b.textContent) || "不明",
      thumbnailUrl: ((x = a == null ? void 0 : a.querySelector("thumbnail_url")) == null ? void 0 : x.textContent) || "",
      tags: Array.from((a == null ? void 0 : a.querySelectorAll("tags tag")) || []).map((k) => {
        var v;
        return ((v = k.textContent) == null ? void 0 : v.trim()) || "";
      }),
      fileSize: ((y = a == null ? void 0 : a.querySelector("size_high")) == null ? void 0 : y.textContent) || "0"
    };
  }
}
class P {
  constructor() {
    s(this, "client", null);
  }
  async fetchVideoInfo(e) {
    return this.client || (this.client = new I()), this.client.fetchVideoInfo(e);
  }
}
class j {
  constructor(e, t, r) {
    this._uiBuilder = e, this.eventManager = t, this._progressManager = r, this.setupEventListeners();
  }
  setupEventListeners() {
    this.setupHeaderEvents(), this.setupCardEvents();
  }
  setupHeaderEvents() {
    var t, r, n;
    const e = document.querySelector("header");
    e && ((t = e.querySelector("#searchBtn")) == null || t.addEventListener("click", () => {
      const a = e.querySelector("#searchInput").value;
      this.handleSearch(a);
    }), (r = e.querySelector("#clearSearch")) == null || r.addEventListener("click", () => {
      e.querySelector("#searchInput").value = "", this.eventManager.trigger("searchClear");
    }), (n = e.querySelector("#searchInput")) == null || n.addEventListener("keypress", (a) => {
      a.key === "Enter" && this.handleSearch(a.target.value);
    }));
  }
  setupCardEvents() {
    document.addEventListener("click", async (e) => {
      const t = e.target.closest(".video-card");
      if (!t) return;
      const r = t.dataset.id, n = t.querySelector(".video-title").textContent || "", a = e.target.closest("button");
      if (!a) {
        await this.showDetailInfo(r);
        return;
      }
      a.classList.contains("play-btn") ? this.handlePlay(r) : a.classList.contains("save-video-btn") ? this.handleSaveVideo(r) : a.classList.contains("save-audio-btn") ? this.handleSaveAudio(r) : a.classList.contains("delete-btn") && this.handleDelete(r, n);
    });
  }
  async showDetailInfo(e) {
    const r = await new P().fetchVideoInfo(e);
    this.displayDetailModal(r);
  }
  handlePlay(e) {
    window.open(`/watch/${e}`, "_blank");
  }
  handleSaveVideo(e) {
    window.open(`./ffmpeg?video=${e}`, "_blank");
  }
  handleSaveAudio(e) {
    window.open(`./ffmpeg?audio=${e}`, "_blank");
  }
  handleDelete(e, t) {
    confirm(`本当に削除しますか？
ID : ${e}
タイトル : ${t}`) && window.open(`./rm?${e}`, "_blank");
  }
  handleSearch(e) {
    this.eventManager.trigger("search", { query: e });
  }
  displayDetailModal(e) {
    var d, l, c, o, p;
    const t = (h) => {
      const g = {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: !1
      };
      return new Date(h).toLocaleDateString("ja-JP", g).replace(/\//g, "-");
    }, r = document.querySelector(".detail-modal");
    r && r.remove();
    const n = document.createElement("div");
    n.className = "detail-modal";
    const a = e.status === "error";
    n.innerHTML = `
      <div class="modal-content">
        <span class="close-btn">&times;</span>
        <h2>${a ? "エラーが発生しました" : e.title}</h2>
        <div class="modal-body">
          ${a ? "" : `<img src="${e.thumbnailUrl}" class="modal-thumbnail">`}
          <div class="modal-info">
            ${a ? `
              <div class="error-message">
                <p>⚠️ エラーコード: ${e.errorCode}</p>
                <p>${e.description}</p>
                ${e.errorCode === "DELETED" ? '<p class="error-note">この動画は削除された可能性があります</p>' : '<p class="error-note">情報の取得に失敗しました</p>'}
              </div>
            ` : `
              <p>投稿者: ${e.author}</p>
              <p>再生時間: ${e.duration}</p>
              <p>再生数: ${(d = e.views) == null ? void 0 : d.toLocaleString()} 回</p>
              <p>コメント数: ${(l = e.commentCount) == null ? void 0 : l.toLocaleString()}</p>
              <p>マイリスト数: ${(c = e.mylistCount) == null ? void 0 : c.toLocaleString()}</p>
              <p>投稿日: ${t(e.uploadDate)}</p>
              <div class="modal-tags">${((o = e.tags) == null ? void 0 : o.map((h) => `<span>${h}</span>`).join("")) || ""}</div>
            `}
          </div>
        </div>
      </div>
    `, n.addEventListener("click", (h) => {
      h.target === n && n.remove();
    }), (p = n.querySelector(".close-btn")) == null || p.addEventListener("click", () => n.remove()), document.body.appendChild(n);
  }
}
const _ = `
body {
    margin: 0;
    font-family: Arial, sans-serif;
  }
  
  .header-content {
    background: linear-gradient(135deg, var(--pink) 0%, var(--purple) 100%);
    padding: 1.5rem 2rem;
    border-radius: 0 0 30px 30px;
    box-shadow: 0 8px 32px rgba(255, 159, 243, 0.2);
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: nowrap;
    height: 80px;
    font-family: "Mochiy Pop P One", "Comic Sans MS", cursive;
  }
  
  .header-content > span:first-child {
    font-size: 2rem;
    letter-spacing: 0.1em;
    text-shadow: 3px 3px 0 var(--purple), -1px -1px 0 var(--mint), 0 0 10px rgba(255, 255, 255, 0.4);
    background: linear-gradient(45deg, var(--mint) 20%, var(--pink) 80%);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
    position: relative;
    transform-style: preserve-3d;
    perspective: 1000px;
    animation: title-spin 5.5s cubic-bezier(0.4, 0, 0.2, 1) infinite;
  }
  
  @keyframes title-spin {
    0% {
      transform: rotateY(0deg);
    }
    2.5% {
      transform: rotateY(9deg);
    }
    5% {
      transform: rotateY(18deg);
    }
    7.5% {
      transform: rotateY(27deg);
    }
    10% {
      transform: rotateY(36deg);
    }
    12.5% {
      transform: rotateY(45deg);
    }
    15% {
      transform: rotateY(54deg);
    }
    17.5% {
      transform: rotateY(63deg);
    }
    20% {
      transform: rotateY(72deg);
    }
    22.5% {
      transform: rotateY(81deg);
    }
    25% {
      transform: rotateY(90deg);
    }
    27.5% {
      transform: rotateY(99deg);
    }
    30% {
      transform: rotateY(108deg);
    }
    32.5% {
      transform: rotateY(117deg);
    }
    35% {
      transform: rotateY(126deg);
    }
    37.5% {
      transform: rotateY(135deg);
    }
    40% {
      transform: rotateY(144deg);
    }
    42.5% {
      transform: rotateY(153deg);
    }
    45% {
      transform: rotateY(162deg);
    }
    47.5% {
      transform: rotateY(171deg);
    }
    50% {
      transform: rotateY(180deg);
    }
    52.5% {
      transform: rotateY(189deg);
    }
    55% {
      transform: rotateY(198deg);
    }
    57.5% {
      transform: rotateY(207deg);
    }
    60% {
      transform: rotateY(216deg);
    }
    62.5% {
      transform: rotateY(225deg);
    }
    65% {
      transform: rotateY(234deg);
    }
    67.5% {
      transform: rotateY(243deg);
    }
    70% {
      transform: rotateY(252deg);
    }
    72.5% {
      transform: rotateY(261deg);
    }
    75% {
      transform: rotateY(270deg);
    }
    77.5% {
      transform: rotateY(279deg);
    }
    80% {
      transform: rotateY(288deg);
    }
    82.5% {
      transform: rotateY(297deg);
    }
    85% {
      transform: rotateY(306deg);
    }
    87.5% {
      transform: rotateY(315deg);
    }
    90% {
      transform: rotateY(324deg);
    }
    92.5% {
      transform: rotateY(333deg);
    }
    95% {
      transform: rotateY(342deg);
    }
    97.5% {
      transform: rotateY(351deg);
    }
    100% {
      transform: rotateY(360deg);
    }
  }
  
  .header-content > span:nth-child(2) {
    background: rgba(255, 255, 255, 0.15);
    padding: 0.4rem 1rem;
    border-radius: 20px;
    border: 2px solid var(--mint);
    backdrop-filter: blur(5px);
    font-size: 0.9em;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    transition: all 0.3s ease;
  }
  
  .header-content > span:nth-child(2):hover {
    transform: scale(1.05) rotate(2deg);
    background: rgba(255, 255, 255, 0.25);
  }
  
  .video-card {
    border: 1px solid #ccc;
    margin: 1rem;
    padding: 1rem;
    max-width: 400px;
    display: flex;
    flex-direction: column;
    min-height: 400px;
  }
  
  .video-id {
    color: #f5f6fa;
    font-family: "Mochiy Pop P One", "Comic Sans MS", cursive;
  }
  
  /* カラーパレット */
  :root {
    --pink: #ff9ff3;
    --mint: #7afcff;
    --purple: #b19cd9;
    --dark: #2d3436;
    --dark-surface: #3b4345;
    --text-primary: #f5f6fa;
  }
  
  /* 基本グリッドレイアウト */
  .cache-container {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 2rem;
    padding: 2rem;
    position: relative;
    margin-top: 4px;
    background: linear-gradient(180deg, #fff6e3, #bfecff);
  }
  
  /* 動画カードスタイル */
  .video-card {
    background: var(--dark-surface);
    border-radius: 15px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
    transition: transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
    overflow: hidden;
  }
  
  .video-card:hover {
    transform: translateY(-5px);
  }
  
  /* メタデータスタイル */
  .metadata {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
    align-items: center;
  }
  
  .metadata > span {
    background: rgba(255, 159, 243, 0.1);
    padding: 0.4rem 0.8rem;
    border-radius: 20px;
    border: 1px solid var(--pink);
    color: var(--text-primary);
    font-size: 0.8em;
  }
  
  .hd-quality {
    background: #4caf50 !important;
    color: white !important;
  }
  .sd-quality {
    background: #ffc107 !important;
    color: black !important;
  }
  .low-quality {
    background: #f44336 !important;
    color: white !important;
  }
  .unknown-quality {
    background: #9e9e9e !important;
    color: white !important;
  }
  
  /* アニメーション */
  @keyframes float {
    0%,
    100% {
      transform: translateY(0);
    }
    50% {
      transform: translateY(-10px);
    }
  }
  
  .video-card:hover .thumbnail-image {
    animation: float 3s ease-in-out infinite;
  }
  
  .nav-link {
    color: var(--text-primary);
    padding: 0.8rem 1.2rem;
    border-radius: 15px;
    transition: all 0.3s ease;
    position: relative;
    font-weight: 500;
  }
  
  .nav-link:hover {
    background: rgba(255, 255, 255, 0.1);
    transform: scale(1.05);
    box-shadow: 0 4px 15px rgba(255, 159, 243, 0.3);
  }
  
  .nav-link::after {
    content: "✨";
    position: absolute;
    right: -10px;
    top: -5px;
    opacity: 0;
    transition: opacity 0.3s ease;
  }
  
  .nav-link:hover::after {
    opacity: 1;
  }
  
  /* 動画タイトル */
  .video-title {
    font-family: "Comic Sans MS", cursive;
    color: var(--mint);
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
    font-size: 1.4rem;
    margin: 0;
    background: linear-gradient(45deg, var(--pink), var(--mint));
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
    transition: all 0.3s ease;
    color: var(--text-primary);
  }
  
  .video-title:hover {
    transform: rotate(-2deg);
    text-shadow: 0 4px 8px rgba(255, 159, 243, 0.4);
  }
  
  /* 汎用操作ボタン */
  .button {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 12px 24px;
    font-size: 1.1rem;
  }
  
  .button::before {
    content: "✨";
    font-size: 1.2em;
    position: static;
    transition: transform 0.3s ease;
  }
  
  .button:hover::before {
    transform: rotate(360deg);
  }
  
  /* 再生ボタン */
  #play-button,
  .play-btn {
    background: linear-gradient(145deg, #7afcff, #4cd8da);
    padding: 10px 20px;
  }
  
  /* 保存ボタン */
  #save-button,
  .save-btn {
    background: linear-gradient(145deg, #ff9ff3, #d67cd1);
    padding: 10px 25px;
  }
  
  #save-button::before,
  .save-btn::before {
    content: "💾";
  }
  
  /* 検索ボタン */
  #searchBtn,
  #clearSearch {
    border-radius: 15px;
    background: linear-gradient(145deg, #b19cd9, #8f7bb3);
    padding: 8px 15px;
  }
  
  #searchBtn::before {
    content: "🔍";
  }
  
  /* 動画カード内アクションボタン */
  .video-card .card-actions {
    display: flex;
    gap: 8px;
    padding: 12px;
  }
  
  .video-card button[onclick] {
    flex: 1;
    min-width: 80px;
    font-size: 0.9em;
    padding: 8px 12px;
    border: 1px solid rgba(255, 255, 255, 0.2);
  }
  
  /* 検索関連 */
  #searchInput {
    border: 2px solid var(--mint);
    border-radius: 25px;
    padding: 8px 20px;
    color: var(--dark);
  }
  
  #searchBtn,
  #clearSearch {
    background: linear-gradient(145deg, var(--purple), #8f7bb3);
    margin-left: 8px;
  }
  
  /* 動画カード内ボタン */
  .play-btn {
    background: linear-gradient(145deg, #7afcff, #4cd8da);
  }
  
  .save-video-btn {
    background: linear-gradient(145deg, #ff9ff3, #d67cd1);
  }
  
  .save-audio-btn {
    background: linear-gradient(145deg, #b19cd9, #8f7bb3);
  }
  
  .delete-btn {
    background: linear-gradient(145deg, #ff6b6b, #ff3838);
  }
  
  /* ボタンアイコン */
  button svg {
    fill: currentColor;
    width: 20px;
    height: 20px;
  }
  
  /* ホバーエフェクト統一 */
  button:not([disabled]):hover {
    filter: brightness(1.2);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  }
  
  /* ボタン状態表示 */
  button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  
  /* アイコンボタンのサイズ調整 */
  .card-actions button {
    min-width: 40px;
    padding: 8px;
    display: flex;
    justify-content: center;
    align-items: center;
    border-radius: 10px;
    box-shadow: 0 8px 32px rgba(255, 159, 243, 0.2);
  }
  
  /* アクションボタンコンテナ */
  .card-actions {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }
  
  /* レスポンシブ対応 */
  @media (max-width: 768px) {
    .header-content {
      flex-direction: column;
      align-items: flex-start;
    }
  
    .card-actions {
      width: 100%;
      justify-content: center;
    }
  
    .video-card {
      min-height: 350px;
    }
  
    .thumbnail-container {
      flex-basis: 150px;
    }
  }
  
  .thumbnail-container {
    flex: 0 0 200px;
    position: relative;
    overflow: hidden;
  }
  
  .thumbnail-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  
  .card-content {
    padding: 1rem;
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }
  
  /* プログレスバー */
  .global-progress {
    position: relative;
    top: 0; /* ヘッダーがない場合のフォールバック */
    left: 0;
    right: 0;
    height: 4px;
    z-index: 999;
    background: rgba(0, 0, 0, 0.1);
    display: none;
    align-items: center;
    padding: 0 1rem;
    height: 32px;
  }
  
  .progress-bar {
    flex: 1;
    height: 32px;
    background: rgba(255, 255, 255, 0.2);
    border-radius: 2px;
    overflow: hidden;
  }
  
  .progress-fill {
    width: 0%;
    height: 100%;
    background: linear-gradient(90deg, #86e4a2, #04e604); /* 緑系グラデーション */
    transition: width 0.3s ease, opacity 0.2s;
    border-radius: 2px;
  }
  
  /* エラー時の赤色表示 */
  .progress-fill.error {
    background: linear-gradient(90deg, #ff6b6b, #ff3838);
  }
  
  .progress-text {
    color: var(--text-dark);
    font-size: 0.85em;
    margin-left: 1rem;
    white-space: nowrap;
  }
  
  /* クオリティバッジスタイル */
  .quality-badge {
    font-size: 0.8em;
    font-weight: bold;
  }
  
  .detail-modal {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }
  
  .modal-content {
    background: var(--dark-surface);
    padding: 2rem;
    border-radius: 15px;
    max-width: 600px;
    width: 90%;
    position: relative;
  }
  
  .close-btn {
    position: absolute;
    right: 1rem;
    top: 1rem;
    font-size: 2rem;
    cursor: pointer;
    color: var(--text-primary);
  }
  
  .modal-body {
    display: grid;
    grid-template-columns: 1fr 2fr;
    gap: 1.5rem;
    margin-top: 1rem;
  }
  
  .modal-thumbnail {
    width: 100%;
    border-radius: 10px;
  }
  
  .modal-info p {
    margin: 0.5rem 0;
    color: var(--text-primary);
    font-size: 0.95em;
  }
  
  /* 日付表示専用スタイル */
  .modal-info p:nth-last-child(1) {
    color: var(--mint);
    font-weight: bold;
    margin-top: 1rem;
  }
  
  .modal-tags span {
    display: inline-block;
    background: rgba(255,159,243,0.2);
    padding: 0.3rem 0.8rem;
    border-radius: 15px;
    margin: 0.3rem;
    font-size: 0.9em;
  }
  
  .error-message {
    background: #ffe6e6;
    border-left: 4px solid #ff4444;
    padding: 15px;
    margin: 10px 0;
    border-radius: 4px;
  }
  
  .error-message p {
    color: #cc0000;
    margin: 5px 0;
  }
  
  .error-note {
    font-size: 0.9em;
    margin-top: 10px;
    font-weight: bold;
  }
  
  .error-thumbnail {
    filter: grayscale(100%);
    opacity: 0.7;
    border: 2px dashed #ff4444;
  }
  `;
async function B() {
  const i = new S(), e = new q(), t = new E(i), r = new $(t, e, i);
  new j(r, e, i), await r.renderAllEntries();
}
window.addEventListener("load", () => {
  const i = document.createElement("style");
  i.textContent = _, document.head.appendChild(i), B();
});
//# sourceMappingURL=list.js.map
