class ProgressManager {
  constructor() {
    this.currentProgress = 0;
    this.bar = document.createElement("div");
    this.bar.className = "global-progress";
    this.bar.style.display = "none";
    this.bar.innerHTML = `
      <div class="progress-bar">
        <div class="progress-fill"></div>
      </div>
      <span class="progress-text"></span>
    `;
    document.body.appendChild(this.bar);
  }
  show(message, error) {
    this.bar.style.display = "flex";
    const textElement = this.bar.querySelector(".progress-text");
    if (textElement) {
      textElement.textContent = message;
    }
    if (error === true) {
      this.currentProgress = 100;
      this.updateFillWidth(true);
    } else {
      this.updateFillWidth();
    }
  }
  updateProgress(current, total) {
    this.currentProgress = current / total * 100;
    this.updateFillWidth();
  }
  updateFillWidth(error) {
    const fill = this.bar.querySelector(".progress-fill");
    if (fill) {
      fill.style.width = `${this.currentProgress}%`;
      if (error) {
        fill.classList.add("error");
      }
    }
  }
  hide() {
    this.bar.style.display = "none";
    this.currentProgress = 0;
    this.updateFillWidth();
  }
}

class EventManager {
  constructor() {
    this.listeners = /* @__PURE__ */ new Map();
  }
  // 呼び出し側が具体的なイベント型を渡せるようにジェネリクスを受け取る
  // 内部では unknown ベースの配列に格納するためキャストして扱う
  addListener(eventType, callback) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, []);
    }
    this.listeners.get(eventType)?.push(callback);
  }
  trigger(eventType, data) {
    const callbacks = this.listeners.get(eventType) || [];
    callbacks.forEach((cb) => {
      if (typeof cb === "function") {
        try {
          void cb(data);
        } catch (e) {
          console.error("Event listener error", e);
        }
      }
    });
  }
}

class LoadDataFromMemory {
  constructor(progressManager) {
    this.progressManager = progressManager;
  }
  // メモリから直接データを取得＆統合
  getAllEntries() {
    this.progressManager.updateProgress(1, 3);
    const merged = this.mergeLists();
    this.progressManager.updateProgress(2, 3);
    const sorted = this.sortEntries(merged);
    this.progressManager.updateProgress(3, 3);
    return sorted;
  }
  // tempListとcacheListをマージ
  mergeLists() {
    const entries = [];
    for (const [id, data] of Object.entries(tempList)) {
      if (!Array.isArray(data)) continue;
      entries.push(this.normalizeEntry(id, data));
    }
    for (const [id, data] of Object.entries(cacheList)) {
      if (!Array.isArray(data)) continue;
      if (!tempList[id]) {
        entries.push(this.normalizeEntry(id, data));
      }
    }
    return entries;
  }
  // エントリ正規化（簡易版）
  normalizeEntry(id, data) {
    return {
      id,
      baseId: id.match(/^[a-z]{2}\d+/)?.[0] || id,
      title: data[0] || "タイトル不明",
      thumbnailUrl: this.generateThumbnailUrl(id),
      quality: this.parseQuality(id),
      isTemp: !!tempList[id],
      lastUpdated: Date.now()
    };
  }
  // サムネイルURL生成（sm9 → 9/9）
  generateThumbnailUrl(id) {
    const match = id.match(/[a-z]{2}(\d+)/);
    return `https://nicovideo.cdn.nimg.jp/thumbnails/${match?.[1]}/${match?.[1]}`;
  }
  // 品質情報をIDから直接解析
  parseQuality(id) {
    const match = id.match(/(\d+)p/);
    return match ? `${match[1]}p` : "unknown";
  }
  // 従来のソートロジックを維持
  isVideoData(value) {
    return typeof value === "object" && value !== null && typeof value.id === "string" && value.id.length > 0;
  }
  sortEntries(entries) {
    const filtered = entries.filter((e) => this.isVideoData(e));
    const getIdSafe = (entry) => {
      if (typeof entry === "object" && entry !== null) {
        const rec = entry;
        if (typeof rec.id === "string") return rec.id;
      }
      return "";
    };
    const getTypeFromId = (id) => id.slice(0, 2);
    const getNumberFromId = (id) => parseInt(id.match(/\d+/)?.[0] || "0", 10);
    return filtered.sort((a, b) => {
      const aId = getIdSafe(a);
      const bId = getIdSafe(b);
      const typePriority = { nm: 1, sm: 2, so: 3 };
      const aType = getTypeFromId(aId);
      const bType = getTypeFromId(bId);
      if (typePriority[aType] !== typePriority[bType]) {
        return typePriority[aType] - typePriority[bType];
      }
      return getNumberFromId(aId) - getNumberFromId(bId);
    });
  }
  getEntriesByIds(ids) {
    const allEntries = this.getAllEntries();
    const getId = (e) => {
      if (typeof e === "object" && e !== null) {
        const rec = e;
        if (typeof rec.id === "string") return rec.id;
      }
      return void 0;
    };
    const allUnknown = allEntries;
    const filtered = allUnknown.filter((entry) => {
      const id = getId(entry);
      return typeof id === "string" && ids.includes(id);
    });
    return filtered;
  }
}

class BatchRenderer {
  constructor(createVideoCard, dataLoader) {
    this.batchSize = 50;
    this.renderQueue = [];
    this.container = document.querySelector(".cache-container");
    this.createVideoCard = createVideoCard;
    this.dataLoader = dataLoader;
  }
  // バッチ処理用メソッド
  async processBatch(entries) {
    this.clearContainer();
    const queue = entries.slice();
    while (queue.length > 0) {
      const batch = queue.splice(0, this.batchSize);
      const fragment = document.createDocumentFragment();
      batch.forEach((entry) => {
        const card = this.createVideoCard(entry);
        fragment.appendChild(card);
      });
      this.container.appendChild(fragment);
      await new Promise((resolve) => requestAnimationFrame(() => resolve()));
    }
  }
  // 検索結果用最適化レンダリング
  async renderSearchResults(resultIds) {
    this.clearContainer();
    const entries = this.dataLoader.getEntriesByIds(resultIds);
    if (entries.length === 0) {
      this.showNoResultsMessage();
      return;
    }
    await this.processBatch(entries);
  }
  showNoResultsMessage() {
    const message = document.createElement("div");
    message.className = "no-results";
    message.textContent = "該当する動画が見つかりませんでした";
    this.container.appendChild(message);
  }
  clearContainer() {
    while (this.container.firstChild) {
      this.container.removeChild(this.container.firstChild);
    }
  }
  findEntryById(id) {
    const all = this.dataLoader.getAllEntries();
    const hasId = (v) => typeof v === "object" && v !== null && typeof v.id === "string";
    for (const e of all) {
      if (hasId(e) && e.id === id) return e;
    }
    return void 0;
  }
}

class SearchEngine {
  constructor(dataLoader) {
    this.dataLoader = dataLoader;
    this.indexReady = this.loadFlexSearch();
  }
  async loadFlexSearch() {
    if (typeof window.FlexSearch === "undefined") {
      await new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = "https://cdn.jsdelivr.net/npm/flexsearch@0.7.31/dist/flexsearch.bundle.js";
        script.onload = () => resolve();
        script.onerror = () => reject(new Error("Failed to load FlexSearch"));
        document.head.appendChild(script);
      });
    }
    this.initializeIndex();
  }
  initializeIndex() {
    const Flex = window.FlexSearch;
    this.index = new Flex.Document({
      preset: "memory",
      tokenize: "full",
      document: {
        id: "id",
        index: [
          {
            field: "title",
            tokenize: "forward",
            optimize: false,
            context: {
              depth: 1,
              resolution: 9
            }
          }
        ]
      }
    });
    this.rebuildIndex();
  }
  async search(query) {
    const cleanQuery = query.toLowerCase().trim();
    await this.indexReady;
    if (!cleanQuery || !this.index) return [];
    const results = this.index.search(cleanQuery, {
      limit: 1e3,
      suggest: true,
      enrich: true,
      bool: "or"
    });
    return [...new Set(results.flatMap((r) => r.result))].filter((id) => typeof id === "string");
  }
  rebuildIndex() {
    const entries = this.dataLoader.getAllEntries();
    for (const rawEntry of entries) {
      if (typeof rawEntry !== "object" || rawEntry === null) continue;
      const rec = rawEntry;
      const id = typeof rec.id === "string" ? rec.id : void 0;
      const titleRaw = typeof rec.title === "string" ? rec.title : void 0;
      if (!id || !titleRaw) continue;
      const safeTitle = titleRaw.toLowerCase();
      const indexWithAdd = this.index;
      if (indexWithAdd && typeof indexWithAdd.add === "function") {
        indexWithAdd.add({ id, title: safeTitle });
      }
    }
  }
}

function createHeaderTemplate() {
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

function createCardTemplate() {
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

class UIBuilder {
  // ヘッダー/サイドバー/検索UIなどの構築
  constructor(dataLoader, eventManager, progressManager) {
    this.templates = /* @__PURE__ */ new Map();
    this.loadFonts();
    this.dataLoader = dataLoader;
    this.eventManager = eventManager;
    this.progressManager = progressManager;
    this.initializeTemplates();
    this.createHeaderAndContainer();
    this.renderer = new BatchRenderer(this.createVideoCard.bind(this), dataLoader);
    this.searchEngine = new SearchEngine(dataLoader);
    this.setupSearchListener();
  }
  // フォント読み込みメソッド追加
  loadFonts() {
    if (!document.fonts.check('16px "Mochiy Pop P One"')) {
      const fontLink = document.createElement("link");
      fontLink.href = "https://fonts.googleapis.com/css2?family=Mochiy+Pop+P+One&display=swap";
      fontLink.rel = "stylesheet";
      fontLink.crossOrigin = "anonymous";
      document.head.appendChild(fontLink);
    }
  }
  initializeTemplates() {
    const cardTemplate = document.createElement("div");
    cardTemplate.className = "video-card";
    cardTemplate.innerHTML = createCardTemplate();
    this.templates.set("videoCard", cardTemplate);
  }
  buildHeader() {
    const existingHeader = document.querySelector("header");
    if (existingHeader) {
      existingHeader.remove();
    }
    const header = document.createElement("header");
    header.innerHTML = createHeaderTemplate();
    return header;
  }
  createVideoCard(videoData) {
    const card = this.templates.get("videoCard").cloneNode(true);
    const safe = this.normalizeVideoData(videoData);
    card.dataset.id = safe.baseId;
    card.querySelector(".video-id").textContent = safe.baseId;
    card.querySelector(".video-title").textContent = safe.title === "null" ? "タイトルを取得できません" : safe.title || "タイトルを取得できません";
    const thumbnailImg = card.querySelector(".thumbnail-image");
    thumbnailImg.src = safe.thumbnailUrl;
    thumbnailImg.onerror = () => {
      thumbnailImg.src = "/local/images/fallback-thumbnail.svg";
      thumbnailImg.classList.add("error-thumbnail");
    };
    card.querySelector(".quality-badge").textContent = safe.quality === "unknown" ? "不明な画質" : safe.quality || "不明な画質";
    card.querySelector(".quality-badge").className = `quality-badge ${this.getQualityClass(safe.quality)}`;
    card.querySelector(".temp-file").textContent = this.getTempOrCompleteString(safe.isTemp);
    return card;
  }
  getQualityClass(quality) {
    const qualityStr = typeof quality === "string" || typeof quality === "number" ? String(quality) : "";
    const numericValue = parseInt(qualityStr.replace(/[^0-9]/g, "")) || "unknown";
    const qualityMap = {
      1080: "hd-quality",
      720: "hd-quality",
      480: "sd-quality",
      360: "low-quality",
      unknown: "unknown-quality"
    };
    return qualityMap[numericValue] || "unknown-quality";
  }
  getTempOrCompleteString(isTemp) {
    if (isTemp === true) {
      return "Temporary";
    } else {
      return "Complete";
    }
  }
  isRecord(value) {
    return typeof value === "object" && value !== null;
  }
  normalizeVideoData(input) {
    if (this.isRecord(input)) {
      const baseId = typeof input.baseId === "string" ? input.baseId : "";
      const title = typeof input.title === "string" ? input.title : "";
      const thumbnailUrl = typeof input.thumbnailUrl === "string" ? input.thumbnailUrl : "";
      const quality = typeof input.quality === "string" ? input.quality : "unknown";
      const isTemp = typeof input.isTemp === "boolean" ? input.isTemp : false;
      return { baseId, title, thumbnailUrl, quality, isTemp };
    }
    return { baseId: "", title: "", thumbnailUrl: "", quality: "unknown", isTemp: false };
  }
  createHeaderAndContainer() {
    document.body.prepend(this.buildHeader());
    const container = document.createElement("div");
    container.className = "cache-container";
    document.body.appendChild(container);
  }
  async renderAllEntries() {
    this.progressManager.show("動画データ読み込み中");
    try {
      const entries = this.dataLoader.getAllEntries();
      await this.renderer.processBatch(entries);
    } finally {
      this.progressManager.hide();
    }
  }
  setupSearchListener() {
    this.eventManager.addListener("search", async (data) => {
      if (!data) return;
      const { query } = data;
      this.progressManager.show("検索中...");
      try {
        const results = await this.searchEngine.search(query);
        await this.renderer.renderSearchResults(results);
      } finally {
        this.progressManager.hide();
      }
    });
    this.eventManager.addListener("searchClear", async () => {
      this.progressManager.show("全データ再表示中");
      try {
        const entries = this.dataLoader.getAllEntries();
        await this.renderer.processBatch(entries);
      } finally {
        this.progressManager.hide();
      }
    });
  }
}

class APIClient {
  constructor() {
    this.baseUrl = "https://ext.nicovideo.jp/api/getthumbinfo/";
    this.cache = /* @__PURE__ */ new Map();
  }
  async fetchVideoInfo(videoId) {
    if (this.cache.has(videoId)) {
      return this.cache.get(videoId);
    }
    const response = await fetch(`${this.baseUrl}${videoId}`);
    if (!response.ok) {
      throw new Error(`API通信エラー: ${response.status}`);
    }
    const text = await response.text();
    this.cache.set(videoId, this.parseResponse(text));
    setTimeout(() => this.cache.delete(videoId), 30 * 60 * 1e3);
    return this.cache.get(videoId);
  }
  parseResponse(xmlText) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlText, "text/xml");
    const errorCode = doc.querySelector("error code")?.textContent;
    if (errorCode) {
      return {
        status: "error",
        errorCode,
        description: doc.querySelector("error description")?.textContent || "不明なエラー"
      };
    }
    const thumb = doc.querySelector("thumb");
    return {
      status: "ok",
      title: thumb?.querySelector("title")?.textContent || "タイトル不明",
      description: thumb?.querySelector("description")?.textContent || "説明文がありません",
      duration: thumb?.querySelector("length")?.textContent || "0:00",
      views: parseInt(thumb?.querySelector("view_counter")?.textContent || "0") || 0,
      commentCount: parseInt(thumb?.querySelector("comment_num")?.textContent || "0") || 0,
      mylistCount: parseInt(thumb?.querySelector("mylist_counter")?.textContent || "0") || 0,
      author: thumb?.querySelector("user_nickname")?.textContent || doc.querySelector("ch_name")?.textContent || "投稿者不明",
      uploadDate: thumb?.querySelector("first_retrieve")?.textContent || "不明",
      thumbnailUrl: thumb?.querySelector("thumbnail_url")?.textContent || "",
      tags: Array.from(thumb?.querySelectorAll("tags tag") || []).map((tag) => tag.textContent?.trim() || ""),
      fileSize: thumb?.querySelector("size_high")?.textContent || "0"
    };
  }
}

class LazyAPIClient {
  constructor() {
    this.client = null;
  }
  async fetchVideoInfo(id) {
    if (!this.client) {
      this.client = new APIClient();
    }
    return this.client.fetchVideoInfo(id);
  }
}

class EventCoordinator {
  constructor(_uiBuilder, eventManager, _progressManager) {
    this._uiBuilder = _uiBuilder;
    this.eventManager = eventManager;
    this._progressManager = _progressManager;
    this.setupEventListeners();
  }
  setupEventListeners() {
    this.setupHeaderEvents();
    this.setupCardEvents();
  }
  setupHeaderEvents() {
    const header = document.querySelector("header");
    if (header) {
      header.querySelector("#searchBtn")?.addEventListener("click", () => {
        const query = header.querySelector("#searchInput").value;
        this.handleSearch(query);
      });
      header.querySelector("#clearSearch")?.addEventListener("click", () => {
        header.querySelector("#searchInput").value = "";
        this.eventManager.trigger("searchClear");
      });
      header.querySelector("#searchInput")?.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
          this.handleSearch(e.target.value);
        }
      });
    }
  }
  setupCardEvents() {
    document.addEventListener("click", (event) => {
      const card = event.target.closest(".video-card");
      if (!card) return;
      const baseId = card.dataset.id;
      const title = card.querySelector(".video-title").textContent || "";
      const button = event.target.closest("button");
      if (!button) {
        void this.showDetailInfo(baseId);
        return;
      }
      if (button.classList.contains("play-btn")) {
        this.handlePlay(baseId);
      } else if (button.classList.contains("save-video-btn")) {
        this.handleSaveVideo(baseId);
      } else if (button.classList.contains("save-audio-btn")) {
        this.handleSaveAudio(baseId);
      } else if (button.classList.contains("delete-btn")) {
        this.handleDelete(baseId, title);
      }
    });
  }
  async showDetailInfo(baseId) {
    const apiClient = new LazyAPIClient();
    const detail = this.normalizeApiResponse(await apiClient.fetchVideoInfo(baseId));
    this.displayDetailModal(detail);
  }
  handlePlay(baseId) {
    window.open(`/watch/${baseId}`, "_blank");
  }
  handleSaveVideo(baseId) {
    window.open(`./ffmpeg?video=${baseId}`, "_blank");
  }
  handleSaveAudio(baseId) {
    window.open(`./ffmpeg?audio=${baseId}`, "_blank");
  }
  handleDelete(baseId, title) {
    if (confirm(`本当に削除しますか？
ID : ${baseId}
タイトル : ${title}`)) {
      window.open(`./rm?${baseId}`, "_blank");
    }
  }
  handleSearch(query) {
    this.eventManager.trigger("search", { query });
  }
  displayDetailModal(detail) {
    const formatDate = (dateString) => {
      const options = {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false
      };
      return new Date(dateString).toLocaleDateString("ja-JP", options).replace(/\//g, "-");
    };
    const existingModal = document.querySelector(".detail-modal");
    if (existingModal) existingModal.remove();
    const modal = document.createElement("div");
    modal.className = "detail-modal";
    const isErrorResponse = (r) => {
      return typeof r === "object" && r !== null && r.status === "error";
    };
    const isOkResponse = (r) => {
      return typeof r === "object" && r !== null && r.status === "ok";
    };
    let inner = "";
    if (isErrorResponse(detail)) {
      const code = detail.errorCode || "";
      const desc = detail.description || "";
      const note = code === "DELETED" ? '<p class="error-note">この動画は削除された可能性があります</p>' : '<p class="error-note">情報の取得に失敗しました</p>';
      inner = `
        <div class="modal-content">
          <span class="close-btn">&times;</span>
          <h2>エラーが発生しました</h2>
          <div class="modal-body">
            <div class="error-message">
              <p>⚠️ エラーコード: ${code}</p>
              <p>${desc}</p>
              ${note}
            </div>
          </div>
        </div>
      `;
    } else if (isOkResponse(detail)) {
      const titleSafe = detail.title || "";
      const thumb = detail.thumbnailUrl || "";
      const author = detail.author || "";
      const duration = detail.duration || "";
      const views = typeof detail.views === "number" ? detail.views.toLocaleString() : "0";
      const commentCount = typeof detail.commentCount === "number" ? detail.commentCount.toLocaleString() : "0";
      const mylistCount = typeof detail.mylistCount === "number" ? detail.mylistCount.toLocaleString() : "0";
      const upload = detail.uploadDate ? formatDate(detail.uploadDate) : "";
      const tagsHtml = Array.isArray(detail.tags) ? detail.tags.map((t) => `<span>${t}</span>`).join("") : "";
      inner = `
        <div class="modal-content">
          <span class="close-btn">&times;</span>
          <h2>${titleSafe}</h2>
          <div class="modal-body">
            <img src="${thumb}" class="modal-thumbnail">
            <div class="modal-info">
              <p>投稿者: ${author}</p>
              <p>再生時間: ${duration}</p>
              <p>再生数: ${views} 回</p>
              <p>コメント数: ${commentCount}</p>
              <p>マイリスト数: ${mylistCount}</p>
              <p>投稿日: ${upload}</p>
              <div class="modal-tags">${tagsHtml}</div>
            </div>
          </div>
        </div>
      `;
    } else {
      inner = `
        <div class="modal-content">
          <span class="close-btn">&times;</span>
          <h2>情報がありません</h2>
        </div>
      `;
    }
    modal.innerHTML = inner;
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });
    modal.querySelector(".close-btn")?.addEventListener("click", () => modal.remove());
    document.body.appendChild(modal);
  }
  normalizeApiResponse(input) {
    if (typeof input === "object" && input !== null) {
      const obj = input;
      if (obj.status === "error") {
        return {
          status: "error",
          errorCode: typeof obj.errorCode === "string" ? obj.errorCode : void 0,
          description: typeof obj.description === "string" ? obj.description : void 0
        };
      }
      return {
        status: "ok",
        title: typeof obj.title === "string" ? obj.title : void 0,
        thumbnailUrl: typeof obj.thumbnailUrl === "string" ? obj.thumbnailUrl : void 0,
        author: typeof obj.author === "string" ? obj.author : void 0,
        duration: typeof obj.duration === "string" ? obj.duration : void 0,
        views: typeof obj.views === "number" ? obj.views : void 0,
        commentCount: typeof obj.commentCount === "number" ? obj.commentCount : void 0,
        mylistCount: typeof obj.mylistCount === "number" ? obj.mylistCount : void 0,
        uploadDate: typeof obj.uploadDate === "string" ? obj.uploadDate : void 0,
        tags: Array.isArray(obj.tags) ? obj.tags.filter((t) => typeof t === "string") : void 0
      };
    }
    return { status: "error", description: "不明なエラー" };
  }
}

const cacheListStyles = `
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

async function initializeList() {
  const progressManager = new ProgressManager();
  const eventManager = new EventManager();
  const dataLoader = new LoadDataFromMemory(progressManager);
  const uiBuilder = new UIBuilder(dataLoader, eventManager, progressManager);
  new EventCoordinator(uiBuilder, eventManager, progressManager);
  await uiBuilder.renderAllEntries();
}
window.addEventListener("load", () => {
  const style = document.createElement("style");
  style.textContent = cacheListStyles;
  document.head.appendChild(style);
  void initializeList();
});
//# sourceMappingURL=cache-data-manager.es.js.map
