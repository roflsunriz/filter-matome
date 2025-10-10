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
  comment: "comment",
  delete: "delete",
  play: "play_arrow",
  search: "search",
  home: "home",
  download: "download"};
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

const NAV_LINKS = [
  { href: "/", label: "トップ", icon: ICONS.home },
  { href: "/video_top", label: "動画", icon: ICONS.play },
  { href: "/my/history/", label: "マイページ", icon: "person" },
  { href: "/ranking", label: "ランキング", icon: "trending_up" },
  { href: "/newarrival", label: "新着動画", icon: "new_releases" },
  { href: "/recent", label: "新着コメント動画", icon: ICONS.comment },
  { href: "/local/features/dist/src/mylist2/index.html", label: "Mylist2", icon: "playlist_add" }
];
function createHeaderTemplate() {
  const navItems = NAV_LINKS.map(({ href, label, icon }) => {
    const hoverIcon = createMaterialIcon(icon, { color: "white", size: "small", classes: "nav-link-icon-img" });
    return `<a href="${href}" target="_blank" class="nav-link">${label}<span class="nav-link-icon">${hoverIcon}</span></a>`;
  }).join("");
  const searchIcon = createMaterialIcon(ICONS.search, { color: "white", size: "small", classes: "search-btn-icon" });
  const clearIcon = createMaterialIcon("clear", { color: "white", size: "small", classes: "search-btn-icon" });
  return `
    <div class="header-content">
      <span>CacheDataManager</span>
      <span>${window.ncversion}</span>
      <nav class="main-nav">
        ${navItems}
      </nav>
      <div class="search-box">
        <input type="text" id="searchInput" placeholder="動画を検索...">
        <span class="search-section">
        <button id="searchBtn">${searchIcon}<span class="search-label">検索</span></button>
        <button id="clearSearch">${clearIcon}<span class="search-label">クリア</span></button>
        </span>
      </div>
    </div>
  `;
}

function createCardTemplate() {
  const playIcon = createMaterialIcon(ICONS.play, { color: "white", classes: "card-action-icon" });
  const saveVideoIcon = createMaterialIcon(ICONS.download, { color: "white", classes: "card-action-icon" });
  const saveAudioIcon = createMaterialIcon("audiotrack", { color: "white", classes: "card-action-icon" });
  const deleteIcon = createMaterialIcon(ICONS.delete, { color: "white", classes: "card-action-icon" });
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
      <button class="play-btn" title="再生" aria-label="再生">
        ${playIcon}
      </button>
      <button class="save-video-btn" title="動画保存" aria-label="動画保存">
        ${saveVideoIcon}
      </button>
      <button class="save-audio-btn" title="音声保存" aria-label="音声保存">
        ${saveAudioIcon}
      </button>
      <button class="delete-btn" title="削除" aria-label="削除">
        ${deleteIcon}
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

const cacheListStyles = materialIconsStyles + `
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
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
  }
  
  .nav-link:hover {
    background: rgba(255, 255, 255, 0.1);
    transform: scale(1.05);
    box-shadow: 0 4px 15px rgba(255, 159, 243, 0.3);
  }
  
  .nav-link-icon {
    display: inline-flex;
    opacity: 0;
    transition: opacity 0.3s ease;
    pointer-events: none;
  }
  
  .search-btn-icon {
    width: 18px;
    height: 18px;
  }
  
  .nav-link:hover .nav-link-icon {
    opacity: 1;
  }
  
  .nav-link-icon-img {
    width: 18px;
    height: 18px;
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
  
  /* 検索ボタン */
  #searchBtn,
  #clearSearch {
    border-radius: 15px;
    background: linear-gradient(145deg, #b19cd9, #8f7bb3);
    padding: 8px 15px;
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
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
    display: block;
    width: 100%;
    box-sizing: border-box;
    margin-bottom: 0.5rem;
  }

  .search-section {
    display: flex;
    gap: 8px;
    margin-top: 0;
    margin-bottom: 0.5rem;
  }

  #searchBtn,
  #clearSearch {
    background: linear-gradient(145deg, var(--purple), #8f7bb3);
    margin-left: 0;
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
  .card-action-icon {
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
