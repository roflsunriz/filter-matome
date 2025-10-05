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

function toCompatibleGlobalData(data) {
  return {
    originalData: data.originalData,
    filteredData: data.filteredData,
    currentSmid: data.currentSmid,
    lastUpdated: data.lastUpdated
  };
}

class DataInterceptor {
  constructor() {
    this.currentSmid = null;
    this.originalFetch = window.fetch.bind(window);
    this.originalPushState = history.pushState.bind(history);
    this.originalReplaceState = history.replaceState.bind(history);
    this.setupInterception();
    this.setupSPANavigation();
    this.initializeGlobalData();
  }
  /**
   * グローバルデータオブジェクトを初期化
   */
  initializeGlobalData() {
    const globalData = {
      originalData: null,
      filteredData: null,
      currentSmid: null,
      lastUpdated: 0
    };
    window[CONSTANTS.GLOBAL_DATA_KEY] = globalData;
    if (!window.commentFilter2GlobalData) {
      window.commentFilter2GlobalData = toCompatibleGlobalData(globalData);
    }
    this.updateCurrentSmid();
  }
  /**
   * SPA ナビゲーション対応セットアップ
   */
  setupSPANavigation() {
    history.pushState = (...args) => {
      this.originalPushState(...args);
      setTimeout(() => this.updateCurrentSmid(), 0);
    };
    history.replaceState = (...args) => {
      this.originalReplaceState(...args);
      setTimeout(() => this.updateCurrentSmid(), 0);
    };
    window.addEventListener("popstate", () => {
      setTimeout(() => this.updateCurrentSmid(), 0);
    });
    window.logger?.debug("[CommentFilter2] SPA navigation hooks initialized");
  }
  /**
   * 現在のSMIDを更新
   */
  updateCurrentSmid() {
    const newSmid = this.extractSmidFromCurrentUrl();
    if (newSmid !== this.currentSmid) {
      this.currentSmid = newSmid;
      const global = window[CONSTANTS.GLOBAL_DATA_KEY];
      if (global) {
        global.currentSmid = newSmid;
      }
      window.dispatchEvent(new CustomEvent(CONSTANTS.EVENTS.SMID_CHANGED, {
        detail: { smid: newSmid, previousSmid: this.currentSmid }
      }));
      window.logger?.debug(`[CommentFilter2] SMID updated due to SPA navigation: ${this.currentSmid}`);
    }
  }
  /**
   * 現在のURLからSMIDを抽出（SPA対応版）
   * 共通ヘルパーのgetVideoIdWithFallbackを利用
   */
  extractSmidFromCurrentUrl() {
    try {
      const smid = window.commonHelper?.getVideoIdWithFallback?.(window.location);
      if (smid && typeof smid === "string") {
        return smid;
      }
      return null;
    } catch (error) {
      window.logger?.error("[CommentFilter2] SMID extraction from current URL failed:", error);
      return null;
    }
  }
  /**
   * fetchをインターセプトしてAPIデータを取得
   */
  setupInterception() {
    window.fetch = async (input, init) => {
      let url;
      if (input instanceof Request) {
        url = input.url;
      } else if (input instanceof URL) {
        url = input.toString();
      } else if (typeof input === "string") {
        url = input;
      } else {
        url = "";
      }
      if (url.includes(CONSTANTS.API_ENDPOINT)) {
        try {
          const response = await this.originalFetch(input, init);
          const clonedResponse = response.clone();
          const dataRaw = await clonedResponse.json();
          if (!dataRaw || typeof dataRaw !== "object") {
            return response;
          }
          const processedData = await this.processCommentData(dataRaw, url);
          const filteredResponse = await this.createFilteredResponse(processedData, response);
          return filteredResponse;
        } catch (error) {
          window.logger?.error("[CommentFilter2] API interception failed:", error);
          return this.originalFetch(input, init);
        }
      }
      return this.originalFetch(input, init);
    };
  }
  /**
   * コメントデータを処理してグローバルオブジェクトに保存
   */
  async processCommentData(data, url) {
    try {
      const smid = this.extractSmidFromUrl(url);
      const processedData = this.selectMainThread(data);
      const global = window[CONSTANTS.GLOBAL_DATA_KEY];
      global.originalData = processedData;
      global.currentSmid = smid;
      global.lastUpdated = Date.now();
      window.logger?.info("[CommentFilter2] Comment data intercepted:", {
        smid,
        threadsCount: processedData.data.threads.length,
        totalComments: processedData.data.threads.reduce((sum, thread) => sum + thread.commentCount, 0),
        currentUrl: window.location.href?.substring(0, 50) + "..."
        // URL短縮
      });
      const filteredData = await this.applyFiltersToData(processedData, smid);
      global.filteredData = filteredData;
      window.dispatchEvent(new CustomEvent(CONSTANTS.EVENTS.DATA_UPDATED, {
        detail: { smid, threadsCount: processedData.data.threads.length }
      }));
      return filteredData;
    } catch (error) {
      window.logger?.error("[CommentFilter2] Comment data processing failed:", error);
      return data;
    }
  }
  /**
   * URLやwindowからSMID（動画ID）を抽出（共通ヘルパー利用・SPA対応）
   */
  extractSmidFromUrl(url) {
    try {
      if (this.currentSmid) {
        window.logger?.debug(`[CommentFilter2] Using cached SMID: ${this.currentSmid}`);
        return this.currentSmid;
      }
      if (typeof window.commonHelper?.getVideoIdWithFallback === "function") {
        const smid = window.commonHelper.getVideoIdWithFallback(url);
        if (smid) {
          this.currentSmid = smid;
          window.logger?.debug(`[CommentFilter2] SMID extracted by commonHelper: ${smid}`);
          return smid;
        }
      }
      window.logger?.warn("[CommentFilter2] Could not extract SMID:", {
        currentUrl: window.location.href?.substring(0, 50) + "...",
        apiUrl: url?.substring(0, 80) + "..."
      });
      return null;
    } catch (error) {
      window.logger?.error("[CommentFilter2] SMID extraction failed:", error);
      return null;
    }
  }
  /**
   * 公式動画でcommentCountが最多のmainスレッドを選択
   */
  selectMainThread(data) {
    const threads = data.data.threads;
    const mainThreads = threads.filter((thread) => thread.fork === CONSTANTS.FORK_TYPES.MAIN);
    if (mainThreads.length > 1) {
      const selectedThread = mainThreads.reduce(
        (max, current) => current.commentCount > max.commentCount ? current : max
      );
      const filteredThreads = threads.filter(
        (thread) => thread.fork !== CONSTANTS.FORK_TYPES.MAIN || thread.id === selectedThread.id
      );
      return {
        ...data,
        data: {
          ...data.data,
          threads: filteredThreads
        }
      };
    }
    return data;
  }
  /**
   * インターセプションを無効化（デバッグ用）
   */
  disable() {
    window.fetch = this.originalFetch;
    history.pushState = this.originalPushState;
    history.replaceState = this.originalReplaceState;
    window.logger?.info("[CommentFilter2] All hooks disabled");
  }
  /**
   * データにフィルターを適用
   */
  async applyFiltersToData(data, smid) {
    const { applyFiltersToData } = await Promise.resolve().then(() => filterHelper);
    return await applyFiltersToData(data, smid);
  }
  /**
   * フィルタリング済みデータで新しいレスポンスを作成
   */
  async createFilteredResponse(filteredData, originalResponse) {
    await Promise.resolve();
    try {
      const filteredJson = JSON.stringify(filteredData);
      const newResponse = new Response(filteredJson, {
        status: originalResponse.status,
        statusText: originalResponse.statusText,
        headers: originalResponse.headers
      });
      return newResponse;
    } catch (error) {
      window.logger?.error("[CommentFilter2] Failed to create filtered response:", error);
      return originalResponse;
    }
  }
  /**
   * 現在のグローバルデータを取得
   */
  static getGlobalData() {
    const data = window[CONSTANTS.GLOBAL_DATA_KEY];
    if (data && typeof data === "object" && "originalData" in data) {
      return data;
    }
    return null;
  }
}

function parseJsonl(text) {
  const lines = text.split("\n").filter((line) => line.trim() !== "");
  const rules = [];
  const errors = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith("//") || line.startsWith("#")) {
      continue;
    }
    try {
      const rule = JSON.parse(line);
      if (validateRule(rule)) {
        rules.push(normalizeRule(rule));
      } else {
        errors.push(`Line ${i + 1}: Invalid rule format`);
      }
    } catch (error) {
      errors.push(`Line ${i + 1}: JSON parse error - ${String(error)}`);
    }
  }
  if (errors.length > 0) {
    window.logger?.warn("[CommentFilter2] JSONL parse errors:", errors);
  }
  return rules;
}
function stringifyJsonl(rules) {
  return rules.map((rule) => JSON.stringify(rule)).join("\n");
}
function validateRule(rule) {
  if (!rule || typeof rule !== "object" || rule === null) {
    return false;
  }
  const ruleObj = rule;
  if (!ruleObj.pattern && !ruleObj.userId) {
    return false;
  }
  if (ruleObj.pattern && ruleObj.userId) {
    return false;
  }
  if (!ruleObj.action || typeof ruleObj.action !== "object" || ruleObj.action === null) {
    return false;
  }
  const action = ruleObj.action;
  if (!action.type) {
    return false;
  }
  if (action.type === "replace" && !action.replacement) {
    return false;
  }
  if (!ruleObj.smid || !Array.isArray(ruleObj.smid) || ruleObj.smid.length === 0) {
    return false;
  }
  if (ruleObj.nicoru_cond) {
    if (typeof ruleObj.nicoru_cond !== "object" || ruleObj.nicoru_cond === null) {
      return false;
    }
    const cond = ruleObj.nicoru_cond;
    if (!cond.op || typeof cond.value === "undefined") {
      return false;
    }
    if (cond.op === "range" && (!Array.isArray(cond.value) || cond.value.length !== 2)) {
      return false;
    }
  }
  return true;
}
function normalizeRule(rule) {
  const normalized = {
    ...rule,
    enabled: rule.enabled !== false,
    // デフォルトtrue
    flags: rule.flags || "gi"
    // デフォルトフラグ
  };
  if (normalized.nicoru_cond && !normalized.nicoru_cond.mode) {
    normalized.nicoru_cond.mode = "exclude";
  }
  return normalized;
}
function detectFileFormat(content) {
  const trimmed = content.trim();
  if (!trimmed) {
    return "unknown";
  }
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      JSON.parse(trimmed);
      return "json";
    } catch {
    }
  }
  const lines = trimmed.split("\n").filter((line) => line.trim() !== "");
  let jsonlCount = 0;
  for (const line of lines.slice(0, 5)) {
    const trimmedLine = line.trim();
    if (trimmedLine.startsWith("//") || trimmedLine.startsWith("#")) {
      continue;
    }
    try {
      JSON.parse(trimmedLine);
      jsonlCount++;
    } catch {
      break;
    }
  }
  if (jsonlCount > 0) {
    return "jsonl";
  }
  if (lines.some((line) => line.includes("/") && line.includes(","))) {
    return "csv";
  }
  return "unknown";
}
function convertCsvToJsonl(csvText) {
  const lines = csvText.split("\n").filter((line) => line.trim() !== "");
  const migratedRules = [];
  const errors = [];
  const warnings = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith("#") || line.startsWith("//")) {
      continue;
    }
    try {
      const rule = convertCsvLineToJsonRule(line);
      if (rule) {
        migratedRules.push(rule);
      } else {
        warnings.push(`Line ${i + 1}: Could not convert rule`);
      }
    } catch (error) {
      errors.push(`Line ${i + 1}: ${String(error)}`);
    }
  }
  return {
    success: errors.length === 0,
    migratedRules,
    errors,
    warnings,
    originalCount: lines.length,
    migratedCount: migratedRules.length
  };
}
function convertCsvLineToJsonRule(line) {
  const fields = parseCsvLineSimple(line);
  if (fields.length < 4) {
    throw new Error("Insufficient fields in CSV line");
  }
  if (fields[0].startsWith("@")) {
    const userId = fields[0].substring(1);
    const smid2 = fields[1] === "ALL" ? ["ALL"] : [fields[1]];
    const nicoru2 = fields[2];
    return {
      userId,
      action: { type: "hide" },
      smid: smid2,
      nicoru_cond: nicoru2 === "EMPTY" ? void 0 : {
        op: ">=",
        value: parseInt(nicoru2, 10),
        mode: "exclude"
      }
    };
  }
  const regexMatch = fields[0].match(/^\/(.+)\/([gimuy]*)$/);
  if (!regexMatch) {
    throw new Error("Invalid regex format");
  }
  const pattern = regexMatch[1];
  const flags = regexMatch[2] || "gi";
  const replaceMatch = fields[1].match(/^\/(.*)\/$/);
  const replacement = replaceMatch ? replaceMatch[1] : fields[1];
  const smid = fields[2] === "ALL" ? ["ALL"] : [fields[2]];
  const nicoru = fields[3];
  const action = replacement === "EMPTY" || replacement === "" ? { type: "hide" } : { type: "replace", replacement };
  return {
    pattern,
    flags,
    action,
    smid,
    nicoru_cond: nicoru === "EMPTY" ? void 0 : {
      op: ">=",
      value: parseInt(nicoru, 10),
      mode: "exclude"
    }
  };
}
function parseCsvLineSimple(line) {
  const fields = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      fields.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  fields.push(current.trim());
  return fields;
}

class LegacyConverter {
  /**
   * レガシー設定データをJSON Lines形式に変換
   */
  static convert(legacyData) {
    const conversionLog = [];
    const rules = [];
    const settings = {
      debugMode: legacyData.DEBUG || false,
      isEnabled: true,
      // レガシーデータでは常に有効とみなす
      commandSettings: this.convertCommandSettings(legacyData, conversionLog)
    };
    conversionLog.push(`基本設定を変換しました: DEBUG=${settings.debugMode}`);
    if (legacyData.NGWord) {
      const ngWordRules = this.convertNGWords(legacyData.NGWord, conversionLog);
      rules.push(...ngWordRules);
    }
    if (legacyData.NGRegex) {
      const ngRegexRules = this.convertNGRegex(legacyData.NGRegex, conversionLog);
      rules.push(...ngRegexRules);
    }
    if (legacyData.superNgWords) {
      const superNgRules = this.convertSuperNGWords(legacyData.superNgWords, conversionLog);
      rules.push(...superNgRules);
    }
    if (legacyData.superNgRegex) {
      const superNgRegexRules = this.convertSuperNGRegex(legacyData.superNgRegex, conversionLog);
      rules.push(...superNgRegexRules);
    }
    if (legacyData.replaceRules) {
      const replaceRules = this.convertReplaceRules(legacyData.replaceRules, conversionLog);
      rules.push(...replaceRules);
    }
    if (legacyData.superNgReplaceRules) {
      const superReplaceRules = this.convertReplaceRules(legacyData.superNgReplaceRules, conversionLog);
      rules.push(...superReplaceRules);
    }
    if (legacyData.userIdFilters) {
      const userIdRules = this.convertUserIdFilters(legacyData.userIdFilters, conversionLog);
      rules.push(...userIdRules);
    }
    if (legacyData.superUserIdFilters) {
      const superUserIdRules = this.convertUserIdFilters(legacyData.superUserIdFilters, conversionLog);
      rules.push(...superUserIdRules);
    }
    conversionLog.push(`変換完了: ルール数=${rules.length}, 設定項目数=${Object.keys(settings).length}`);
    return {
      rules,
      settings,
      conversionLog
    };
  }
  /**
   * コマンド設定を変換
   */
  static convertCommandSettings(legacyData, log) {
    const defaultCommands = [
      "big",
      "medium",
      "small",
      "defont",
      "gothic",
      "mincho",
      "ue",
      "naka",
      "shita",
      "white",
      "red",
      "pink",
      "orange",
      "yellow",
      "green",
      "cyan",
      "blue",
      "purple",
      "black",
      "white2",
      "red2",
      "pink2",
      "orange2",
      "yellow2",
      "green2",
      "cyan2",
      "blue2",
      "purple2",
      "black2",
      "_live",
      "invisible",
      "full",
      "ender",
      "patissier",
      "ca"
    ];
    const ownerCommands = legacyData.ownerCommands ? this.parseCommands(legacyData.ownerCommands) : defaultCommands;
    const mainCommands = legacyData.normalCommands ? this.parseCommands(legacyData.normalCommands) : defaultCommands;
    const easyCommands = legacyData.easyCommands ? this.parseCommands(legacyData.easyCommands) : defaultCommands;
    log.push(`コマンド設定を変換: owner=${ownerCommands.length}, main=${mainCommands.length}, easy=${easyCommands.length}`);
    return {
      owner: ownerCommands,
      main: mainCommands,
      easy: easyCommands,
      normal: mainCommands
      // normalはmainと同じ設定を使用
    };
  }
  /**
   * コマンド文字列をパース
   * 注意：レガシーのコマンドにはカンマは含まれないため、単純分割で問題なし
   */
  static parseCommands(commandStr) {
    return commandStr.split(",").map((cmd) => cmd.trim()).filter((cmd) => cmd.length > 0);
  }
  /**
   * NGワードを変換（JSON Lines形式）
   */
  static convertNGWords(ngWords, log) {
    const words = ngWords.split("\n").filter((word) => word.trim() !== "");
    const rules = [];
    for (const word of words) {
      const trimmedWord = word.trim();
      if (trimmedWord) {
        const escapedWord = this.escapeRegExp(trimmedWord);
        rules.push({
          pattern: escapedWord,
          // 部分一致（文中に含まれればマッチ）
          flags: "gi",
          action: { type: "hide" },
          smid: ["ALL"],
          enabled: true,
          description: `NGワード: ${trimmedWord}`
        });
      }
    }
    log.push(`NGワードを変換: ${rules.length}個のルール（部分一致）`);
    return rules;
  }
  /**
   * NG正規表現を変換（JSON Lines形式）
   */
  static convertNGRegex(ngRegex, log) {
    const regexes = ngRegex.split("\n").filter((regex) => regex.trim() !== "");
    const rules = [];
    for (const regex of regexes) {
      const trimmedRegex = regex.trim();
      if (trimmedRegex) {
        try {
          new RegExp(trimmedRegex);
          rules.push({
            pattern: trimmedRegex,
            flags: "gi",
            action: { type: "hide" },
            smid: ["ALL"],
            enabled: true,
            description: `NG正規表現: ${trimmedRegex}`
          });
        } catch (error) {
          log.push(`無効な正規表現をスキップ: ${trimmedRegex}`);
        }
      }
    }
    log.push(`NG正規表現を変換: ${rules.length}個のルール`);
    return rules;
  }
  /**
   * SuperNGワードを変換（JSON Lines形式）
   */
  static convertSuperNGWords(superNgWords, log) {
    const words = superNgWords.split("\n").filter((word) => word.trim() !== "");
    const rules = [];
    for (const word of words) {
      const trimmedWord = word.trim();
      if (trimmedWord) {
        const escapedWord = this.escapeRegExp(trimmedWord);
        rules.push({
          pattern: escapedWord,
          // 部分一致（文中に含まれればマッチ）
          flags: "gi",
          action: { type: "hide" },
          smid: ["ALL"],
          nicoru_cond: { op: ">=", value: 0, mode: "exclude" },
          // SuperNGはニコる数に関係なく適用
          enabled: true,
          description: `SuperNGワード: ${trimmedWord}`
        });
      }
    }
    log.push(`SuperNGワードを変換: ${rules.length}個のルール（部分一致）`);
    return rules;
  }
  /**
   * SuperNG正規表現を変換（JSON Lines形式）
   */
  static convertSuperNGRegex(superNgRegex, log) {
    const regexes = superNgRegex.split("\n").filter((regex) => regex.trim() !== "");
    const rules = [];
    for (const regex of regexes) {
      const trimmedRegex = regex.trim();
      if (trimmedRegex) {
        try {
          new RegExp(trimmedRegex);
          rules.push({
            pattern: trimmedRegex,
            flags: "gi",
            action: { type: "hide" },
            smid: ["ALL"],
            nicoru_cond: { op: ">=", value: 0, mode: "exclude" },
            enabled: true,
            description: `SuperNG正規表現: ${trimmedRegex}`
          });
        } catch (error) {
          log.push(`無効なSuperNG正規表現をスキップ: ${trimmedRegex}`);
        }
      }
    }
    log.push(`SuperNG正規表現を変換: ${rules.length}個のルール`);
    return rules;
  }
  /**
   * 置換ルールを変換（JSON Lines形式）
   */
  static convertReplaceRules(replaceRules, log) {
    const rules = [];
    const lines = replaceRules.split("\n").filter((line) => line.trim() !== "");
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine.includes(" => ")) {
        const [regex, replace] = trimmedLine.split(" => ");
        if (regex && replace !== void 0) {
          try {
            new RegExp(regex.trim());
            rules.push({
              pattern: regex.trim(),
              flags: "gi",
              action: { type: "replace", replacement: replace.trim() },
              smid: ["ALL"],
              enabled: true,
              description: `置換ルール: ${regex.trim()} => ${replace.trim()}`
            });
          } catch (error) {
            log.push(`無効な置換ルールをスキップ: ${trimmedLine}`);
          }
        }
      }
    }
    log.push(`置換ルールを変換: ${rules.length}個のルール`);
    return rules;
  }
  /**
   * ユーザーID除外を変換（JSON Lines形式）
   */
  static convertUserIdFilters(userIdFilters, log) {
    const userIds = userIdFilters.split("\n").filter((userId) => userId.trim() !== "");
    const rules = [];
    for (const userId of userIds) {
      const trimmedUserId = userId.trim();
      if (trimmedUserId) {
        rules.push({
          userId: trimmedUserId,
          action: { type: "hide" },
          smid: ["ALL"],
          enabled: true,
          description: `ユーザーID除外: ${trimmedUserId}`
        });
      }
    }
    log.push(`ユーザーID除外を変換: ${rules.length}個のルール`);
    return rules;
  }
  /**
   * 正規表現の特殊文字をエスケープ
   */
  static escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
  /**
   * レガシーデータかどうかを判定
   */
  static isLegacyData(data) {
    if (typeof data !== "object" || data === null) {
      return false;
    }
    if (Array.isArray(data)) {
      return false;
    }
    if ("rules" in data && "settings" in data) {
      return false;
    }
    const legacyProps = ["NGWord", "NGRegex", "filterMode", "lotOfNicorare", "replaceRules"];
    return legacyProps.some((prop) => prop in data);
  }
}

class FilterStorage {
  constructor() {
    this.db = null;
    this.dbName = CONSTANTS.DB_CONFIG.NAME;
    this.dbVersion = 3;
    // バージョンアップ（JSON形式対応）
    this.useJsonFormat = true;
  }
  // 新形式を使用するかどうか
  /**
   * デフォルトのコマンド設定（プレミアム色を含む基本設定）
   */
  getDefaultCommandSettings() {
    return {
      owner: ["medium", "defont", "naka"],
      main: ["medium", "defont", "naka"],
      easy: ["medium", "defont", "naka"],
      normal: ["medium", "defont", "naka"]
    };
  }
  /**
   * データベースを初期化（マイグレーション対応）
   */
  async initialize() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);
      request.onerror = () => {
        reject(new Error("IndexedDB initialization failed"));
      };
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };
      request.onupgradeneeded = async (event) => {
        const db = event.target.result;
        const oldVersion = event.oldVersion;
        window.logger?.info(`[CommentFilter2] Upgrading database from version ${oldVersion} to ${this.dbVersion}`);
        if (!db.objectStoreNames.contains(CONSTANTS.DB_CONFIG.STORES.RULES)) {
          const rulesStore = db.createObjectStore(CONSTANTS.DB_CONFIG.STORES.RULES, {
            keyPath: "id",
            autoIncrement: true
          });
          rulesStore.createIndex("smid", "smid", { unique: false });
          rulesStore.createIndex("enabled", "enabled", { unique: false });
        }
        if (!db.objectStoreNames.contains(CONSTANTS.DB_CONFIG.STORES.SETTINGS)) {
          db.createObjectStore(CONSTANTS.DB_CONFIG.STORES.SETTINGS, {
            keyPath: "key"
          });
        }
        if (!db.objectStoreNames.contains("json_rules")) {
          const jsonRulesStore = db.createObjectStore("json_rules", {
            keyPath: "id",
            autoIncrement: true
          });
          jsonRulesStore.createIndex("enabled", "enabled", { unique: false });
          jsonRulesStore.createIndex("smid", "smid", { unique: false, multiEntry: true });
        }
        if (oldVersion < 3) {
          await this.migrateToVersion3(db, event.target.transaction);
        }
      };
    });
  }
  /**
   * バージョン3へのマイグレーション（旧形式→JSON形式）
   */
  async migrateToVersion3(db, transaction) {
    try {
      window.logger?.info("[CommentFilter2] Starting migration to version 3 (JSON format)");
      const oldRulesStore = transaction.objectStore(CONSTANTS.DB_CONFIG.STORES.RULES);
      const oldRules = await this.getAllFromStore(oldRulesStore);
      if (oldRules.length > 0) {
        window.logger?.info(`[CommentFilter2] Found ${oldRules.length} legacy rules to migrate`);
        const jsonRules = [];
        for (const oldRule of oldRules) {
          try {
            const jsonRule = this.convertLegacyRuleToJson(oldRule);
            if (jsonRule) {
              jsonRules.push(jsonRule);
            }
          } catch (error) {
            window.logger?.warn("[CommentFilter2] Failed to convert legacy rule:", oldRule, error);
          }
        }
        const jsonRulesStore = transaction.objectStore("json_rules");
        for (const jsonRule of jsonRules) {
          await this.addToStore(jsonRulesStore, jsonRule);
        }
        window.logger?.info(`[CommentFilter2] Successfully migrated ${jsonRules.length} rules to JSON format`);
        const settingsStore = transaction.objectStore(CONSTANTS.DB_CONFIG.STORES.SETTINGS);
        await this.putToStore(settingsStore, {
          key: "migration_v3_completed",
          completed: true,
          migratedAt: (/* @__PURE__ */ new Date()).toISOString(),
          migratedRulesCount: jsonRules.length
        });
      }
    } catch (error) {
      window.logger?.error("[CommentFilter2] Migration to version 3 failed:", error);
      throw error;
    }
  }
  /**
   * 旧形式ルールをJSON形式に変換
   */
  convertLegacyRuleToJson(legacyRule) {
    try {
      if (legacyRule.isUserIdRule && legacyRule.userId) {
        return {
          userId: legacyRule.userId,
          action: { type: "hide" },
          smid: legacyRule.smid === "ALL" ? ["ALL"] : [legacyRule.smid],
          nicoru_cond: legacyRule.nicoru === "EMPTY" ? void 0 : {
            op: ">=",
            value: typeof legacyRule.nicoru === "number" ? legacyRule.nicoru : 0,
            mode: "exclude"
          },
          enabled: true
        };
      }
      if (legacyRule.regex) {
        const action = legacyRule.replace === "EMPTY" || !legacyRule.replace ? { type: "hide" } : { type: "replace", replacement: legacyRule.replace };
        return {
          pattern: legacyRule.regex,
          flags: legacyRule.regexFlags || "gi",
          action,
          smid: legacyRule.smid === "ALL" ? ["ALL"] : [legacyRule.smid],
          nicoru_cond: legacyRule.nicoru === "EMPTY" ? void 0 : {
            op: ">=",
            value: typeof legacyRule.nicoru === "number" ? legacyRule.nicoru : 0,
            mode: "exclude"
          },
          enabled: true
        };
      }
      return null;
    } catch (error) {
      window.logger?.warn("[CommentFilter2] Failed to convert legacy rule:", legacyRule, error);
      return null;
    }
  }
  /**
   * JSON形式のNGワードルールを保存
   */
  async saveJsonRules(rules) {
    if (!this.db) {
      throw new Error("Database not initialized");
    }
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(["json_rules"], "readwrite");
      const store = transaction.objectStore("json_rules");
      const clearRequest = store.clear();
      clearRequest.onsuccess = () => {
        let completedCount = 0;
        const totalCount = rules.length;
        if (totalCount === 0) {
          resolve();
          return;
        }
        rules.forEach((rule, index) => {
          const ruleWithId = { ...rule, id: index };
          const addRequest = store.add(ruleWithId);
          addRequest.onsuccess = () => {
            completedCount++;
            if (completedCount === totalCount) {
              resolve();
            }
          };
          addRequest.onerror = () => {
            reject(new Error(`Failed to save JSON rule at index ${index}`));
          };
        });
      };
      clearRequest.onerror = () => {
        reject(new Error("Failed to clear existing JSON rules"));
      };
    });
  }
  /**
   * JSON形式のNGワードルールを取得
   */
  async getJsonRules() {
    if (!this.db) {
      throw new Error("Database not initialized");
    }
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(["json_rules"], "readonly");
      const store = transaction.objectStore("json_rules");
      const request = store.getAll();
      request.onsuccess = () => {
        const rules = request.result.map((item) => {
          const { id, ...rule } = item;
          return rule;
        });
        resolve(rules);
      };
      request.onerror = () => {
        reject(new Error("Failed to retrieve JSON rules"));
      };
    });
  }
  /**
   * 旧形式のNGワードルールを保存（後方互換性）
   */
  async saveRules(rules) {
    if (!this.db) {
      throw new Error("Database not initialized");
    }
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([CONSTANTS.DB_CONFIG.STORES.RULES], "readwrite");
      const store = transaction.objectStore(CONSTANTS.DB_CONFIG.STORES.RULES);
      const clearRequest = store.clear();
      clearRequest.onsuccess = () => {
        let completedCount = 0;
        const totalCount = rules.length;
        if (totalCount === 0) {
          resolve();
          return;
        }
        rules.forEach((rule, index) => {
          const addRequest = store.add({ ...rule, id: index });
          addRequest.onsuccess = () => {
            completedCount++;
            if (completedCount === totalCount) {
              resolve();
            }
          };
          addRequest.onerror = () => {
            reject(new Error(`Failed to save rule at index ${index}`));
          };
        });
      };
      clearRequest.onerror = () => {
        reject(new Error("Failed to clear existing rules"));
      };
    });
  }
  /**
   * 旧形式のNGワードルールを取得（後方互換性）
   */
  async getRules() {
    if (!this.db) {
      throw new Error("Database not initialized");
    }
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([CONSTANTS.DB_CONFIG.STORES.RULES], "readonly");
      const store = transaction.objectStore(CONSTANTS.DB_CONFIG.STORES.RULES);
      const request = store.getAll();
      request.onsuccess = () => {
        const rules = request.result.map((item) => ({
          regex: item.regex,
          regexFlags: item.regexFlags,
          replace: item.replace,
          smid: item.smid,
          nicoru: item.nicoru,
          userId: item.userId,
          isUserIdRule: item.isUserIdRule
        }));
        resolve(rules);
      };
      request.onerror = () => {
        reject(new Error("Failed to retrieve rules"));
      };
    });
  }
  /**
   * 設定を保存（JSON形式フラグ追加）
   */
  async saveSettings(settings) {
    if (!this.db) {
      throw new Error("Database not initialized");
    }
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([CONSTANTS.DB_CONFIG.STORES.SETTINGS], "readwrite");
      const store = transaction.objectStore(CONSTANTS.DB_CONFIG.STORES.SETTINGS);
      const request = store.put({
        key: "main",
        ...settings,
        useJsonFormat: settings.useJsonFormat !== void 0 ? settings.useJsonFormat : this.useJsonFormat
      });
      request.onsuccess = () => {
        resolve();
      };
      request.onerror = () => {
        reject(new Error("Failed to save settings"));
      };
    });
  }
  /**
   * 設定を取得（JSON形式フラグ対応）
   */
  async getSettings() {
    if (!this.db) {
      throw new Error("Database not initialized");
    }
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([CONSTANTS.DB_CONFIG.STORES.SETTINGS], "readonly");
      const store = transaction.objectStore(CONSTANTS.DB_CONFIG.STORES.SETTINGS);
      const request = store.get("main");
      request.onsuccess = () => {
        if (request.result) {
          const raw = request.result;
          const obj = raw && typeof raw === "object" ? raw : {};
          const settings = {
            debugMode: Boolean(obj.debugMode),
            isEnabled: Boolean(obj.isEnabled),
            commandSettings: obj.commandSettings || this.getDefaultCommandSettings(),
            logToCommentFilterLogger: obj.logToCommentFilterLogger !== void 0 ? Boolean(obj.logToCommentFilterLogger) : true,
            useJsonFormat: obj.useJsonFormat !== void 0 ? Boolean(obj.useJsonFormat) : true
            // デフォルトで新形式を使用
          };
          resolve(settings);
        } else {
          resolve({
            debugMode: false,
            isEnabled: true,
            commandSettings: this.getDefaultCommandSettings(),
            logToCommentFilterLogger: true,
            useJsonFormat: true
            // デフォルトで新形式を使用
          });
        }
      };
      request.onerror = () => {
        reject(new Error("Failed to retrieve settings"));
      };
    });
  }
  /**
   * JSON形式でデータをエクスポート
   */
  async exportJsonData() {
    try {
      const [rules, settings] = await Promise.all([
        this.getJsonRules(),
        this.getSettings()
      ]);
      const exportData = {
        version: "3.0",
        rules,
        settings,
        // 設定を追加（コメントコマンド設定を含む）
        metadata: {
          exportedAt: (/* @__PURE__ */ new Date()).toISOString(),
          exportedBy: "CommentFilter2",
          totalRules: rules.length
        }
      };
      return JSON.stringify(exportData, null, 2);
    } catch (error) {
      throw new Error(`JSON export failed: ${String(error)}`);
    }
  }
  /**
   * 旧形式でデータをエクスポート（後方互換性）
   */
  async exportData() {
    try {
      const [rules, settings] = await Promise.all([
        this.getRules(),
        this.getSettings()
      ]);
      const exportData = {
        rules,
        settings
      };
      return JSON.stringify(exportData, null, 2);
    } catch (error) {
      throw new Error(`Export failed: ${String(error)}`);
    }
  }
  /**
   * データをインポート（形式自動判定・マイグレーション対応）
   */
  async importData(data) {
    try {
      const format = detectFileFormat(data);
      window.logger?.info(`[CommentFilter2] Detected import format: ${String(format)}`);
      switch (format) {
        case "jsonl":
          return await this.importJsonlData(data);
        case "json":
          return await this.importJsonData(data);
        case "csv":
          return await this.importCsvData(data);
        default:
          throw new Error("Unknown file format");
      }
    } catch (error) {
      throw new Error(`Import failed: ${String(error)}`);
    }
  }
  /**
   * JSON Lines形式のデータをインポート
   */
  async importJsonlData(data) {
    try {
      const rules = parseJsonl(data);
      await this.saveJsonRules(rules);
      return {
        success: true,
        migratedRules: rules,
        errors: [],
        warnings: [],
        originalCount: data.split("\n").filter((line) => line.trim()).length,
        migratedCount: rules.length
      };
    } catch (error) {
      throw new Error(`JSONL import failed: ${String(error)}`);
    }
  }
  /**
   * JSON形式のデータをインポート
   */
  async importJsonData(data) {
    try {
      const parsedData = JSON.parse(data);
      if (typeof parsedData === "object" && parsedData !== null && "version" in parsedData && "rules" in parsedData) {
        const collection = parsedData;
        await this.saveJsonRules(collection.rules);
        if (collection.settings) {
          await this.saveSettings(collection.settings);
        }
        return {
          success: true,
          migratedRules: collection.rules,
          errors: [],
          warnings: [],
          originalCount: collection.rules.length,
          migratedCount: collection.rules.length
        };
      }
      if (typeof parsedData === "object" && parsedData !== null && "rules" in parsedData && "settings" in parsedData) {
        const legacyData = parsedData;
        const convertedRules = [];
        for (const rule of legacyData.rules) {
          const jsonRule = this.convertLegacyRuleToJson(rule);
          if (jsonRule) {
            convertedRules.push(jsonRule);
          }
        }
        await Promise.all([
          this.saveJsonRules(convertedRules),
          this.saveSettings(legacyData.settings)
        ]);
        return {
          success: true,
          migratedRules: convertedRules,
          errors: [],
          warnings: [`Converted ${legacyData.rules.length} legacy rules to JSON format`],
          originalCount: legacyData.rules.length,
          migratedCount: convertedRules.length
        };
      }
      if (typeof parsedData === "object" && parsedData !== null && LegacyConverter.isLegacyData(parsedData)) {
        const legacySettings = parsedData;
        window.logger?.info("[CommentFilter2] Detected legacy CommentFilter settings format");
        const conversionResult = LegacyConverter.convert(legacySettings);
        await Promise.all([
          this.saveJsonRules(conversionResult.rules),
          this.saveSettings(conversionResult.settings)
        ]);
        window.logger?.info(`[CommentFilter2] Legacy conversion completed: ${conversionResult.rules.length} rules converted`);
        return {
          success: true,
          migratedRules: conversionResult.rules,
          errors: [],
          warnings: conversionResult.conversionLog,
          originalCount: this.countLegacyRules(legacySettings),
          migratedCount: conversionResult.rules.length
        };
      }
      throw new Error("Invalid JSON format");
    } catch (error) {
      throw new Error(`JSON import failed: ${String(error)}`);
    }
  }
  /**
   * CSV形式のデータをインポート
   */
  async importCsvData(data) {
    try {
      const migrationResult = convertCsvToJsonl(data);
      if (migrationResult.success) {
        await this.saveJsonRules(migrationResult.migratedRules);
      }
      return migrationResult;
    } catch (error) {
      throw new Error(`CSV import failed: ${String(error)}`);
    }
  }
  /**
   * 全データを削除
   */
  async clearAllData() {
    if (!this.db) {
      throw new Error("Database not initialized");
    }
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([
        CONSTANTS.DB_CONFIG.STORES.RULES,
        CONSTANTS.DB_CONFIG.STORES.SETTINGS,
        "json_rules"
      ], "readwrite");
      const rulesStore = transaction.objectStore(CONSTANTS.DB_CONFIG.STORES.RULES);
      const settingsStore = transaction.objectStore(CONSTANTS.DB_CONFIG.STORES.SETTINGS);
      const jsonRulesStore = transaction.objectStore("json_rules");
      const clearRules = rulesStore.clear();
      const clearSettings = settingsStore.clear();
      const clearJsonRules = jsonRulesStore.clear();
      let completedCount = 0;
      const checkCompletion = () => {
        completedCount++;
        if (completedCount === 3) {
          resolve();
        }
      };
      clearRules.onsuccess = checkCompletion;
      clearSettings.onsuccess = checkCompletion;
      clearJsonRules.onsuccess = checkCompletion;
      clearRules.onerror = () => reject(new Error("Failed to clear rules"));
      clearSettings.onerror = () => reject(new Error("Failed to clear settings"));
      clearJsonRules.onerror = () => reject(new Error("Failed to clear JSON rules"));
    });
  }
  /**
   * ヘルパーメソッド: ストアから全データを取得
   */
  getAllFromStore(store) {
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => {
        const err = request.error;
        if (err instanceof Error) {
          reject(err);
        } else if (err && typeof err.message === "string") {
          reject(new Error(err.message));
        } else {
          reject(new Error("IndexedDB getAll error"));
        }
      };
    });
  }
  /**
   * ヘルパーメソッド: ストアにデータを追加
   */
  addToStore(store, data) {
    return new Promise((resolve, reject) => {
      const request = store.add(data);
      request.onsuccess = () => resolve();
      request.onerror = () => {
        const err = request.error;
        if (err instanceof Error) {
          reject(err);
        } else if (err && typeof err.message === "string") {
          reject(new Error(err.message));
        } else {
          reject(new Error("IndexedDB add error"));
        }
      };
    });
  }
  /**
   * ヘルパーメソッド: ストアにデータを保存
   */
  putToStore(store, data) {
    return new Promise((resolve, reject) => {
      const request = store.put(data);
      request.onsuccess = () => resolve();
      request.onerror = () => {
        const err = request.error;
        if (err instanceof Error) {
          reject(err);
        } else if (err && typeof err.message === "string") {
          reject(new Error(err.message));
        } else {
          reject(new Error("IndexedDB put error"));
        }
      };
    });
  }
  /**
   * レガシー設定のルール数をカウント
   */
  countLegacyRules(legacySettings) {
    let count = 0;
    if (legacySettings.NGWord) {
      count += legacySettings.NGWord.split("\n").filter((word) => word.trim() !== "").length;
    }
    if (legacySettings.NGRegex) {
      count += legacySettings.NGRegex.split("\n").filter((regex) => regex.trim() !== "").length;
    }
    if (legacySettings.superNgWords) {
      count += legacySettings.superNgWords.split("\n").filter((word) => word.trim() !== "").length;
    }
    if (legacySettings.superNgRegex) {
      count += legacySettings.superNgRegex.split("\n").filter((regex) => regex.trim() !== "").length;
    }
    if (legacySettings.replaceRules) {
      count += legacySettings.replaceRules.split("\n").filter((rule) => rule.trim() !== "").length;
    }
    if (legacySettings.superNgReplaceRules) {
      count += legacySettings.superNgReplaceRules.split("\n").filter((rule) => rule.trim() !== "").length;
    }
    if (legacySettings.userIdFilters) {
      count += legacySettings.userIdFilters.split("\n").filter((userId) => userId.trim() !== "").length;
    }
    if (legacySettings.superUserIdFilters) {
      count += legacySettings.superUserIdFilters.split("\n").filter((userId) => userId.trim() !== "").length;
    }
    return count;
  }
  /**
   * データベースを閉じる
   */
  close() {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
  // === データベース永続化昇格機能 ===
  /**
   * データベースの完全性チェック
   */
  async checkDatabaseIntegrity() {
    if (!this.db) {
      throw new Error("Database not initialized");
    }
    const issues = [];
    try {
      const requiredStores = [
        CONSTANTS.DB_CONFIG.STORES.RULES,
        CONSTANTS.DB_CONFIG.STORES.SETTINGS,
        "json_rules"
      ];
      for (const storeName of requiredStores) {
        if (!this.db.objectStoreNames.contains(storeName)) {
          issues.push(`Missing required object store: ${storeName}`);
        }
      }
      const jsonRules = await this.getJsonRules();
      const invalidRules = jsonRules.filter((rule) => !this.validateRuleStructure(rule));
      if (invalidRules.length > 0) {
        issues.push(`Found ${invalidRules.length} invalid rule structures`);
      }
      const settings = await this.getSettings();
      if (!settings.commandSettings) {
        issues.push("Missing essential settings structure");
      }
      window.logger?.info(`[CommentFilter2] Database integrity check completed. Issues found: ${issues.length}`);
      return {
        isValid: issues.length === 0,
        issues
      };
    } catch (error) {
      window.logger?.error("[CommentFilter2] Database integrity check failed:", error);
      issues.push(`Integrity check failed: ${error instanceof Error ? error.message : "Unknown error"}`);
      return {
        isValid: false,
        issues
      };
    }
  }
  /**
   * データベースの自動修復
   */
  async repairDatabase() {
    if (!this.db) {
      throw new Error("Database not initialized");
    }
    const repairs = [];
    try {
      window.logger?.info("[CommentFilter2] Starting database repair...");
      const jsonRules = await this.getJsonRules();
      const repairedRules = [];
      for (const rule of jsonRules) {
        const repairedRule = this.repairRuleStructure(rule);
        if (repairedRule) {
          repairedRules.push(repairedRule);
        } else {
          repairs.push(`Removed invalid rule: ${JSON.stringify(rule)}`);
        }
      }
      if (repairedRules.length !== jsonRules.length) {
        await this.saveJsonRules(repairedRules);
        repairs.push(`Repaired ${jsonRules.length - repairedRules.length} broken rules`);
      }
      const settings = await this.getSettings();
      let settingsRepaired = false;
      if (!settings.commandSettings) {
        settings.commandSettings = this.getDefaultCommandSettings();
        settingsRepaired = true;
      }
      if (settingsRepaired) {
        await this.saveSettings(settings);
        repairs.push("Repaired missing settings structure");
      }
      window.logger?.info(`[CommentFilter2] Database repair completed. Repairs made: ${repairs.length}`);
      return {
        success: true,
        repairs
      };
    } catch (error) {
      window.logger?.error("[CommentFilter2] Database repair failed:", error);
      return {
        success: false,
        repairs: [...repairs, `Repair failed: ${error instanceof Error ? error.message : "Unknown error"}`]
      };
    }
  }
  /**
   * データベースの完全バックアップ
   */
  async createFullBackup() {
    if (!this.db) {
      throw new Error("Database not initialized");
    }
    try {
      window.logger?.info("[CommentFilter2] Creating full database backup...");
      const backup = {
        version: this.dbVersion,
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        data: {
          jsonRules: await this.getJsonRules(),
          settings: await this.getSettings(),
          legacyRules: await this.getRules(),
          migrationHistory: await this.getMigrationHistory()
        }
      };
      const backupJson = JSON.stringify(backup, null, 2);
      window.logger?.info(`[CommentFilter2] Backup created successfully (${String(backupJson.length)} characters)`);
      return {
        success: true,
        backup: backupJson
      };
    } catch (error) {
      window.logger?.error("[CommentFilter2] Database backup failed:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }
  /**
   * バックアップからデータベースを復元
   */
  async restoreFromBackup(backupJson) {
    if (!this.db) {
      throw new Error("Database not initialized");
    }
    try {
      window.logger?.info("[CommentFilter2] Restoring database from backup...");
      const backupRaw = JSON.parse(backupJson);
      if (!backupRaw || typeof backupRaw !== "object") {
        throw new Error("Invalid backup format");
      }
      const backup = backupRaw;
      if (typeof backup.version !== "number" && typeof backup.version !== "string") {
        throw new Error("Invalid backup version");
      }
      if (!backup.data || typeof backup.data !== "object") {
        throw new Error("Invalid backup format");
      }
      if (backup.data.jsonRules) {
        await this.saveJsonRules(backup.data.jsonRules);
      }
      if (backup.data.settings) {
        await this.saveSettings(backup.data.settings);
      }
      await this.recordMigrationEvent("restore", {
        fromBackup: true,
        backupTimestamp: typeof backup.timestamp === "string" ? backup.timestamp : (/* @__PURE__ */ new Date()).toISOString(),
        backupVersion: typeof backup.version === "number" ? backup.version : Number(backup.version)
      });
      window.logger?.info("[CommentFilter2] Database restored successfully");
      return { success: true };
    } catch (error) {
      window.logger?.error("[CommentFilter2] Database restore failed:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }
  /**
   * データベースのパフォーマンス最適化
   */
  async optimizeDatabase() {
    if (!this.db) {
      throw new Error("Database not initialized");
    }
    const optimizations = [];
    try {
      window.logger?.info("[CommentFilter2] Starting database optimization...");
      const jsonRules = await this.getJsonRules();
      const uniqueRules = this.removeDuplicateRules(jsonRules);
      if (uniqueRules.length < jsonRules.length) {
        await this.saveJsonRules(uniqueRules);
        optimizations.push(`Removed ${jsonRules.length - uniqueRules.length} duplicate rules`);
      }
      const validRules = uniqueRules.filter((rule) => this.validateRuleStructure(rule));
      if (validRules.length < uniqueRules.length) {
        await this.saveJsonRules(validRules);
        optimizations.push(`Removed ${uniqueRules.length - validRules.length} invalid rules`);
      }
      await this.recordMigrationEvent("optimize", {
        rulesOptimized: optimizations.length > 0,
        originalCount: jsonRules.length,
        optimizedCount: validRules.length
      });
      window.logger?.info(`[CommentFilter2] Database optimization completed. Optimizations: ${optimizations.length}`);
      return {
        success: true,
        optimizations
      };
    } catch (error) {
      window.logger?.error("[CommentFilter2] Database optimization failed:", error);
      return {
        success: false,
        optimizations: [...optimizations, `Optimization failed: ${error instanceof Error ? error.message : "Unknown error"}`]
      };
    }
  }
  // === 自動マイグレーション機能の強化 ===
  /**
   * マイグレーション履歴の記録
   */
  async recordMigrationEvent(eventType, details) {
    if (!this.db) {
      throw new Error("Database not initialized");
    }
    try {
      const migrationRecord = {
        key: `migration_${eventType}_${Date.now()}`,
        eventType,
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        details,
        version: this.dbVersion
      };
      const transaction = this.db.transaction([CONSTANTS.DB_CONFIG.STORES.SETTINGS], "readwrite");
      const store = transaction.objectStore(CONSTANTS.DB_CONFIG.STORES.SETTINGS);
      await this.putToStore(store, migrationRecord);
      window.logger?.info(`[CommentFilter2] Migration event recorded: ${eventType}`);
    } catch (error) {
      window.logger?.error("[CommentFilter2] Failed to record migration event:", error);
    }
  }
  /**
   * マイグレーション履歴の取得
   */
  async getMigrationHistory() {
    if (!this.db) {
      throw new Error("Database not initialized");
    }
    try {
      const allSettings = await this.getAllSettings();
      const migrationEvents = Object.entries(allSettings).filter(([key]) => key.startsWith("migration_")).map(([, value]) => value).filter(
        (record) => typeof record === "object" && record !== null && "eventType" in record && "timestamp" in record && "details" in record && "version" in record
      ).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      return migrationEvents;
    } catch (error) {
      window.logger?.error("[CommentFilter2] Failed to get migration history:", error);
      return [];
    }
  }
  /**
   * 段階的マイグレーション機能
   */
  async performIncrementalMigration(targetVersion) {
    if (!this.db) {
      throw new Error("Database not initialized");
    }
    const steps = [];
    try {
      window.logger?.info(`[CommentFilter2] Starting incremental migration to version ${targetVersion}`);
      const currentVersion = this.dbVersion;
      for (let version = currentVersion; version <= targetVersion; version++) {
        const migrationResult = await this.performVersionMigration(version);
        steps.push(migrationResult.description);
        if (!migrationResult.success) {
          throw new Error(`Migration to version ${version} failed: ${migrationResult.error}`);
        }
      }
      await this.recordMigrationEvent("incremental", {
        fromVersion: currentVersion,
        toVersion: targetVersion,
        steps
      });
      window.logger?.info(`[CommentFilter2] Incremental migration completed successfully`);
      return {
        success: true,
        steps
      };
    } catch (error) {
      window.logger?.error("[CommentFilter2] Incremental migration failed:", error);
      return {
        success: false,
        steps: [...steps, `Migration failed: ${error instanceof Error ? error.message : "Unknown error"}`]
      };
    }
  }
  /**
   * 特定バージョンへのマイグレーション実行
   */
  async performVersionMigration(version) {
    await Promise.resolve();
    try {
      switch (version) {
        case 4:
          return {
            success: true,
            description: `Version ${version} migration: Enhanced indexing and performance improvements`
          };
        case 5:
          return {
            success: true,
            description: `Version ${version} migration: Advanced filtering features`
          };
        default:
          return {
            success: true,
            description: `Version ${version} migration: No changes required`
          };
      }
    } catch (error) {
      return {
        success: false,
        description: `Version ${version} migration failed`,
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }
  // === ヘルパーメソッド ===
  /**
   * ルール構造の検証
   */
  validateRuleStructure(rule) {
    try {
      if (!rule.action || !rule.smid || rule.enabled === void 0) {
        return false;
      }
      if (!rule.action.type || !["hide", "replace"].includes(rule.action.type)) {
        return false;
      }
      if (!Array.isArray(rule.smid)) {
        return false;
      }
      if (rule.pattern) {
        try {
          new RegExp(rule.pattern, rule.flags || "gi");
        } catch {
          return false;
        }
      }
      return true;
    } catch {
      return false;
    }
  }
  /**
   * ルール構造の修復
   */
  repairRuleStructure(rule) {
    try {
      const repaired = {
        ...rule,
        action: rule.action || { type: "hide" },
        smid: Array.isArray(rule.smid) ? rule.smid : ["ALL"],
        enabled: rule.enabled !== void 0 ? rule.enabled : true
      };
      if (this.validateRuleStructure(repaired)) {
        return repaired;
      }
      return null;
    } catch {
      return null;
    }
  }
  /**
   * 重複ルールの削除
   */
  removeDuplicateRules(rules) {
    const seen = /* @__PURE__ */ new Set();
    const unique = [];
    for (const rule of rules) {
      const key = JSON.stringify({
        pattern: rule.pattern,
        userId: rule.userId,
        action: rule.action,
        smid: rule.smid?.sort()
      });
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(rule);
      }
    }
    return unique;
  }
  /**
   * 全設定の取得
   */
  async getAllSettings() {
    if (!this.db) {
      throw new Error("Database not initialized");
    }
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([CONSTANTS.DB_CONFIG.STORES.SETTINGS], "readonly");
      const store = transaction.objectStore(CONSTANTS.DB_CONFIG.STORES.SETTINGS);
      const request = store.getAll();
      request.onsuccess = () => {
        const result = {};
        request.result.forEach((item) => {
          result[item.key] = item;
        });
        resolve(result);
      };
      request.onerror = () => {
        reject(new Error("Failed to get all settings"));
      };
    });
  }
}

const indexedDb = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  FilterStorage
}, Symbol.toStringTag, { value: 'Module' }));

const ALLOWED_COMMENT_COMMANDS = /* @__PURE__ */ new Set([
  // サイズ
  "big",
  "medium",
  "small",
  // フォント
  "defont",
  "gothic",
  "mincho",
  // 位置
  "ue",
  "naka",
  "shita",
  // 特殊効果
  "_live",
  "invisible",
  "full",
  "ender",
  "patissier",
  "ca",
  // 一般+プレミアム色
  "white",
  "red",
  "pink",
  "orange",
  "yellow",
  "green",
  "cyan",
  "blue",
  "purple",
  "black",
  // プレミアム専用色
  "white2",
  "red2",
  "pink2",
  "orange2",
  "yellow2",
  "green2",
  "cyan2",
  "blue2",
  "purple2",
  "black2",
  // 内部表現の数字コマンド（ニコニコ動画が自動変換）
  "184"
  // red の内部表現
]);
const EXCLUSIVE_COMMAND_CATEGORIES = {
  size: /* @__PURE__ */ new Set(["big", "medium", "small"]),
  font: /* @__PURE__ */ new Set(["defont", "gothic", "mincho"]),
  position: /* @__PURE__ */ new Set(["ue", "naka", "shita"]),
  color: /* @__PURE__ */ new Set([
    "white",
    "red",
    "pink",
    "orange",
    "yellow",
    "green",
    "cyan",
    "blue",
    "purple",
    "black",
    "white2",
    "red2",
    "pink2",
    "orange2",
    "yellow2",
    "green2",
    "cyan2",
    "blue2",
    "purple2",
    "black2"
  ])
};
function sanitizeCommentCommands(commands) {
  const validCommands = commands.filter((command) => {
    if (/^#[0-9A-Fa-f]{6}$/.test(command)) {
      return true;
    }
    return ALLOWED_COMMENT_COMMANDS.has(command.toLowerCase());
  });
  const result = [];
  const usedCategories = /* @__PURE__ */ new Set();
  for (const command of validCommands) {
    const lowerCommand = command.toLowerCase();
    let categoryFound = false;
    if (/^#[0-9A-Fa-f]{6}$/.test(command)) {
      if (!usedCategories.has("color")) {
        result.push(command);
        usedCategories.add("color");
      }
      categoryFound = true;
    } else {
      for (const [categoryName, categoryCommands] of Object.entries(EXCLUSIVE_COMMAND_CATEGORIES)) {
        if (categoryCommands.has(lowerCommand)) {
          if (!usedCategories.has(categoryName)) {
            result.push(command);
            usedCategories.add(categoryName);
          }
          categoryFound = true;
          break;
        }
      }
    }
    if (!categoryFound) {
      result.push(command);
    }
  }
  return result;
}
function sanitizeCommentBody(body) {
  return body.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/'/g, "&#x27;");
}

class FilterLogger {
  static {
    // ローカル環境でCommentFilterLogger.javaが動作していることを想定
    this.FILTER_LOG_ENDPOINT = window.location.origin + "/cache/filter_logs";
  }
  static {
    this.MAX_BATCH_SIZE = 100;
  }
  static {
    // 一度に送信するログの最大数
    this.RETRY_ATTEMPTS = 3;
  }
  static {
    // リトライ回数
    this.RETRY_DELAY = 1e3;
  }
  static {
    // リトライ間隔（ミリ秒）
    this.DEBOUNCE_DELAY = 5e3;
  }
  static {
    // 最後のログ追加から送信までの待機時間（ミリ秒）
    // ログバッファリング用の静的プロパティ
    this.logBuffer = [];
  }
  static {
    this.sendTimerId = null;
  }
  static {
    this.isLogSendingEnabled = true;
  }
  // ログ送信機能の有効/無効フラグ
  /**
   * ログ送信機能の有効/無効を設定
   */
  static setLogSendingEnabled(enabled) {
    this.isLogSendingEnabled = enabled;
    if (!enabled && this.sendTimerId !== null) {
      clearTimeout(this.sendTimerId);
      this.sendTimerId = null;
    }
  }
  /**
   * ログをバッファに追加（重複チェック付き）
   */
  static addLogsToBuffer(logs) {
    if (!this.isLogSendingEnabled || logs.length === 0) {
      return;
    }
    const createLogKey = (log) => {
      return `${log.videoId}:${log.userId}:${log.comment}:${JSON.stringify(log.filterDetails)}`;
    };
    const existingKeys = new Set(this.logBuffer.map(createLogKey));
    const newLogs = logs.filter((log) => !existingKeys.has(createLogKey(log)));
    if (newLogs.length > 0) {
      this.logBuffer.push(...newLogs);
      window.logger?.debug(`[FilterLogger] Added ${newLogs.length} new logs to buffer (total: ${this.logBuffer.length})`);
      this.scheduleDebouncedSend();
    }
  }
  /**
   * debounceされた送信をスケジュール
   */
  static scheduleDebouncedSend() {
    if (this.sendTimerId !== null) {
      clearTimeout(this.sendTimerId);
    }
    this.sendTimerId = window.setTimeout(() => {
      void this.flushLogBuffer();
    }, this.DEBOUNCE_DELAY);
  }
  /**
   * バッファ内のログをすぐに送信
   */
  static async flushLogBuffer() {
    if (this.logBuffer.length === 0) {
      window.logger?.debug("[FilterLogger] No logs in buffer to flush");
      return;
    }
    if (this.sendTimerId !== null) {
      clearTimeout(this.sendTimerId);
      this.sendTimerId = null;
    }
    const logsToSend = [...this.logBuffer];
    this.logBuffer = [];
    window.logger?.info(`[FilterLogger] Flushing ${logsToSend.length} logs from buffer`);
    try {
      const success = await this.sendFilterLogs(logsToSend);
      if (!success) {
        window.logger?.warn("[FilterLogger] Failed to send some or all logs");
      }
    } catch (error) {
      window.logger?.error("[FilterLogger] Error while flushing log buffer:", error);
    }
  }
  /**
   * フィルターログを一括でCommentFilterLogger.javaに送信
   */
  static async sendFilterLogs(logs) {
    if (logs.length === 0) {
      window.logger?.debug("[FilterLogger] No logs to send");
      return true;
    }
    const batches = this.splitIntoBatches(logs, this.MAX_BATCH_SIZE);
    let successCount = 0;
    for (const batch of batches) {
      const success2 = await this.sendBatchWithRetry(batch);
      if (success2) {
        successCount++;
      }
    }
    const totalBatches = batches.length;
    const success = successCount === totalBatches;
    if (success) {
      window.logger?.info(`[FilterLogger] Successfully sent ${logs.length} filter logs in ${totalBatches} batches`);
    } else {
      window.logger?.warn(`[FilterLogger] Partial success: ${successCount}/${totalBatches} batches sent successfully`);
    }
    return success;
  }
  /**
   * ログ配列を指定サイズのバッチに分割
   */
  static splitIntoBatches(array, batchSize) {
    const batches = [];
    for (let i = 0; i < array.length; i += batchSize) {
      batches.push(array.slice(i, i + batchSize));
    }
    return batches;
  }
  /**
   * バッチをリトライ付きで送信
   */
  static async sendBatchWithRetry(batch) {
    for (let attempt = 1; attempt <= this.RETRY_ATTEMPTS; attempt++) {
      try {
        const success = await this.sendBatch(batch);
        if (success) {
          return true;
        }
      } catch (error) {
        window.logger?.warn(`[FilterLogger] Batch send attempt ${attempt} failed:`, error);
      }
      if (attempt < this.RETRY_ATTEMPTS) {
        await this.delay(this.RETRY_DELAY * attempt);
      }
    }
    window.logger?.error(`[FilterLogger] Failed to send batch after ${this.RETRY_ATTEMPTS} attempts`);
    return false;
  }
  /**
   * 単一バッチを送信
   */
  static async sendBatch(batch) {
    try {
      const jsonData = JSON.stringify(batch);
      const response = await fetch(this.FILTER_LOG_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": jsonData.length.toString()
        },
        body: jsonData
      });
      if (response.ok) {
        window.logger?.debug(`[FilterLogger] Batch of ${batch.length} logs sent successfully`);
        return true;
      } else {
        window.logger?.warn(`[FilterLogger] Batch send failed with status: ${response.status} ${response.statusText}`);
        return false;
      }
    } catch (error) {
      window.logger?.error("[FilterLogger] Batch send error:", error);
      return false;
    }
  }
  /**
   * 指定時間待機
   */
  static delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
  /**
   * 動画タイトルを取得（DOM解析）
   */
  static getVideoTitle() {
    try {
      const titleSelectors = [
        'h1[data-testid="video-title"]',
        // 新UI
        ".VideoTitle",
        // 旧UI
        "h1.video-title",
        // 別の形式
        "title"
        // フォールバック（ページタイトル）
      ];
      for (const selector of titleSelectors) {
        const element = document.querySelector(selector);
        if (element && element.textContent) {
          let title = element.textContent.trim();
          if (selector === "title") {
            title = title.replace(/\s*-\s*ニコニコ動画$/, "");
          }
          if (title.length > 0) {
            return title;
          }
        }
      }
      return "不明なタイトル";
    } catch (error) {
      window.logger?.warn("[FilterLogger] Failed to get video title:", error);
      return "不明なタイトル";
    }
  }
  /**
   * フィルター理由を生成
   */
  static generateFilterReasons(ruleType, matched, hidden) {
    const reasons = [];
    if (matched) {
      if (ruleType === "regex") {
        reasons.push("正規表現マッチ");
      } else if (ruleType === "userId") {
        reasons.push("ユーザーID一致");
      }
      if (hidden) {
        reasons.push("コメント非表示");
      } else {
        reasons.push("コメント置換");
      }
    }
    return reasons;
  }
  /**
   * フィルター詳細を生成
   */
  static generateFilterDetails(ruleType, pattern, userId, replace) {
    const details = [];
    if (ruleType === "regex" && pattern) {
      details.push({
        type: "正規表現",
        value: pattern
      });
      if (replace && replace !== "EMPTY") {
        details.push({
          type: "置換文字列",
          value: replace
        });
      }
    } else if (ruleType === "userId" && userId) {
      details.push({
        type: "ユーザーID",
        value: userId
      });
    }
    return details;
  }
}

const COMMAND_TYPES = {
  COLOR: "color",
  POSITION: "position",
  FONT: "font",
  SIZE: "size",
  SPECIAL: "special"
};
const COMMAND_CATEGORIES = {
  [COMMAND_TYPES.COLOR]: [
    "white",
    "red",
    "pink",
    "orange",
    "yellow",
    "green",
    "cyan",
    "blue",
    "purple",
    "black",
    "white2",
    "red2",
    "pink2",
    "orange2",
    "yellow2",
    "green2",
    "cyan2",
    "blue2",
    "purple2",
    "black2"
  ],
  [COMMAND_TYPES.POSITION]: [
    "ue",
    "naka",
    "shita"
  ],
  [COMMAND_TYPES.FONT]: [
    "gothic",
    "mincho",
    "defont"
  ],
  [COMMAND_TYPES.SIZE]: [
    "big",
    "medium",
    "small"
  ],
  [COMMAND_TYPES.SPECIAL]: [
    "invisible",
    "full",
    "patissier",
    "_live",
    "ender",
    "ca",
    "184"
  ]
};
class CommentFilter {
  // フィルターログの蓄積用
  constructor(debugMode = false) {
    this.regexCache = /* @__PURE__ */ new Map();
    this.debugMode = false;
    this.settings = null;
    this.filterLogs = [];
    this.debugMode = debugMode;
  }
  /**
   * 設定を更新
   */
  updateSettings(settings) {
    this.settings = settings;
    this.debugMode = settings.debugMode;
    FilterLogger.setLogSendingEnabled(settings?.logToCommentFilterLogger || false);
  }
  /**
   * メインのフィルタリング処理
   */
  async applyFilters(rules, currentSmid) {
    await Promise.resolve();
    const globalData = this.getGlobalData();
    if (!globalData?.originalData) {
      if (this.debugMode) {
        window.logger?.debug("[CommentFilter2] No global data available for filtering");
      }
      return null;
    }
    try {
      this.filterLogs = [];
      if (this.debugMode) {
        window.logger?.debug("[CommentFilter2] Starting filtering with rules:", {
          totalRules: rules.length,
          userIdRules: rules.filter((r) => r.isUserIdRule),
          regexRules: rules.filter((r) => !r.isUserIdRule),
          currentSmid
        });
      }
      const filteredData = this.processCommentData(globalData.originalData, rules, currentSmid);
      globalData.filteredData = filteredData;
      if (this.debugMode) {
        this.logFilteringResults(globalData.originalData, filteredData, rules);
      }
      if (this.settings?.logToCommentFilterLogger && this.filterLogs.length > 0) {
        FilterLogger.addLogsToBuffer(this.filterLogs);
      }
      return filteredData;
    } catch (error) {
      window.logger?.error("[CommentFilter2] Filtering failed:", error);
      return globalData.originalData;
    }
  }
  /**
   * コメントデータ全体を処理
   */
  processCommentData(data, rules, currentSmid) {
    const processedThreads = data.data.threads.map((thread) => ({
      ...thread,
      comments: this.filterCommentsInThread(thread.comments, rules, currentSmid, thread.fork)
    }));
    return {
      ...data,
      data: {
        ...data.data,
        threads: processedThreads
      }
    };
  }
  /**
   * スレッド内のコメントをフィルタリング（コメント種別対応）
   */
  filterCommentsInThread(comments, rules, currentSmid, threadFork) {
    if (this.debugMode) {
      window.logger?.debug(`[CommentFilter2] Processing ${threadFork} thread with ${comments.length} comments`);
    }
    return comments.map((comment) => this.applyRulesToComment(comment, rules, currentSmid, threadFork)).filter((comment) => comment !== null);
  }
  /**
   * 単一コメントにルールを適用（コメント種別対応）
   */
  applyRulesToComment(comment, rules, currentSmid, threadFork) {
    const processedComment = { ...comment };
    processedComment.commands = this.normalizeCommands(processedComment.commands);
    if ([CONSTANTS.FORK_TYPES.EASY, CONSTANTS.FORK_TYPES.MAIN, CONSTANTS.FORK_TYPES.OWNER].includes(threadFork)) {
      processedComment.isPremium = true;
    }
    const commandsToAdd = [];
    let shouldHideComment = false;
    let ruleApplied = false;
    let hasEmptyNicoruRule = false;
    for (const rule of rules) {
      if (!this.shouldApplyRule(rule, currentSmid)) {
        continue;
      }
      if (!this.checkNicoruRule(rule, comment.nicoruCount)) {
        continue;
      }
      if (rule.isUserIdRule && rule.userId) {
        if (this.checkUserIdRule(rule, comment.userId)) {
          ruleApplied = true;
          const isHidden = rule.nicoru === "EMPTY";
          this.addFilterLog(comment, rule, "userId", true, isHidden, currentSmid);
          if (rule.nicoru === "EMPTY") {
            hasEmptyNicoruRule = true;
            shouldHideComment = true;
            commandsToAdd.push("invisible");
          }
          if (this.debugMode) {
            window.logger?.info(`[CommentFilter2] UserID rule matched: ${rule.userId} -> ${rule.nicoru === "EMPTY" ? "hiding comment with invisible" : "clearing body only"}`, {
              commentUserId: comment.userId,
              ruleUserId: rule.userId,
              ruleNicoru: rule.nicoru,
              commentBody: comment.body?.substring(0, 50) + (comment.body?.length > 50 ? "..." : "")
              // 本文は省略
            });
          }
        }
        continue;
      }
      if (rule.regex) {
        const result = this.applyRegexRule(processedComment.body, rule);
        if (result.matched) {
          ruleApplied = true;
          this.addFilterLog(comment, rule, "regex", true, result.shouldHide, currentSmid);
          if (result.shouldHide) {
            if (rule.nicoru === "EMPTY") {
              hasEmptyNicoruRule = true;
              shouldHideComment = true;
              commandsToAdd.push("invisible");
            }
          } else {
            processedComment.body = result.replacedText;
            if (rule.nicoru === "EMPTY") {
              hasEmptyNicoruRule = true;
            }
          }
        }
      }
    }
    if (shouldHideComment) {
      processedComment.body = "";
      if (!processedComment.commands.includes("invisible")) {
        processedComment.commands.push("invisible");
      }
      if (this.debugMode && Math.random() < 0.1) {
        window.logger?.debug("[CommentFilter2] Comment hidden (sampled):", {
          originalBody: comment.body?.substring(0, 30) + "...",
          processedBody: processedComment.body,
          commands: processedComment.commands
        });
      }
    }
    if ([CONSTANTS.FORK_TYPES.EASY, CONSTANTS.FORK_TYPES.MAIN, CONSTANTS.FORK_TYPES.OWNER].includes(threadFork)) {
      if (!ruleApplied || hasEmptyNicoruRule) {
        processedComment.commands = this.applyForkCommandSettings(processedComment.commands, threadFork);
      }
    }
    if (commandsToAdd.length > 0) {
      processedComment.commands = this.addOrReplaceCommands(processedComment.commands, commandsToAdd);
    }
    if (ruleApplied) {
      processedComment.body = sanitizeCommentBody(processedComment.body);
    }
    return processedComment;
  }
  /**
   * フォーク別のコマンド設定を適用
   */
  applyForkCommandSettings(commands, threadFork) {
    if (!this.settings?.commandSettings) {
      return sanitizeCommentCommands(commands);
    }
    const allowedCommands = this.getAllowedCommandsForFork(threadFork);
    const sanitizedCommands = sanitizeCommentCommands(commands);
    const filteredCommands = sanitizedCommands.filter((command) => {
      if (/^#[0-9A-Fa-f]{6}$/.test(command)) {
        return true;
      }
      return allowedCommands.includes(command.toLowerCase());
    });
    return filteredCommands;
  }
  /**
   * フォークタイプに対して許可されたコマンドを取得
   */
  getAllowedCommandsForFork(threadFork) {
    if (!this.settings?.commandSettings) {
      return [];
    }
    switch (threadFork) {
      case CONSTANTS.FORK_TYPES.OWNER:
        return this.settings.commandSettings.owner;
      case CONSTANTS.FORK_TYPES.MAIN:
        return this.settings.commandSettings.main;
      case CONSTANTS.FORK_TYPES.EASY:
        return this.settings.commandSettings.easy;
      default:
        return [];
    }
  }
  /**
   * ルールを適用すべきかチェック（SMID条件）
   */
  shouldApplyRule(rule, currentSmid) {
    if (rule.smid === CONSTANTS.RULE_DEFAULTS.ALL_SMID) {
      return true;
    }
    return rule.smid === currentSmid;
  }
  /**
   * ニコる数ルールをチェック
   */
  checkNicoruRule(rule, commentNicoruCount) {
    if (rule.nicoru === "EMPTY") {
      return true;
    }
    if (typeof rule.nicoru === "number") {
      return commentNicoruCount >= rule.nicoru;
    }
    return false;
  }
  /**
   * ユーザーIDルールをチェック
   */
  checkUserIdRule(rule, commentUserId) {
    if (!rule.userId) {
      if (this.debugMode) {
        window.logger?.warn("[CommentFilter2] UserID rule has no userId field", rule);
      }
      return false;
    }
    const isMatch = rule.userId === commentUserId;
    return isMatch;
  }
  /**
   * 正規表現ルールを適用（フラグ対応）
   */
  applyRegexRule(text, rule) {
    try {
      if (!rule.regex) {
        return {
          matched: false,
          shouldHide: false,
          replacedText: text
        };
      }
      const regex = this.getRegex(rule.regex, rule.regexFlags || "gi");
      const matched = regex.test(text);
      if (!matched) {
        return {
          matched: false,
          shouldHide: false,
          replacedText: text
        };
      }
      const shouldHide = rule.replace === CONSTANTS.RULE_DEFAULTS.EMPTY_REPLACE;
      const replacedText = shouldHide ? text : text.replace(regex, rule.replace || "");
      return {
        matched: true,
        shouldHide,
        replacedText
      };
    } catch (error) {
      window.logger?.warn("[CommentFilter2] Regex application failed:", rule.regex, error);
      return {
        matched: false,
        shouldHide: false,
        replacedText: text
      };
    }
  }
  /**
   * 正規表現オブジェクトを取得（キャッシュ付き・フラグ対応）
   */
  getRegex(pattern, flags = "gi") {
    const cacheKey = `${pattern}:::${flags}`;
    if (this.regexCache.has(cacheKey)) {
      return this.regexCache.get(cacheKey);
    }
    const regex = new RegExp(pattern, flags);
    this.regexCache.set(cacheKey, regex);
    return regex;
  }
  /**
   * フィルタリング結果をログ出力（デバッグ用）
   */
  logFilteringResults(original, filtered, rules) {
    const originalCount = this.countComments(original);
    const filteredCount = this.countComments(filtered);
    const hiddenCount = originalCount - filteredCount;
    window.logger.debug("[CommentFilter2] Filtering Results:", {
      originalComments: originalCount,
      filteredComments: filteredCount,
      hiddenComments: hiddenCount,
      appliedRules: rules.length
    });
  }
  /**
   * コメント総数をカウント
   */
  countComments(data) {
    return data.data.threads.reduce((sum, thread) => sum + thread.comments.length, 0);
  }
  /**
   * グローバルデータを取得
   */
  getGlobalData() {
    const data = window[CONSTANTS.GLOBAL_DATA_KEY];
    if (data && typeof data === "object" && "originalData" in data && "filteredData" in data && "currentSmid" in data && "lastUpdated" in data) {
      return data;
    }
    return null;
  }
  /**
   * 正規表現キャッシュをクリア
   */
  clearRegexCache() {
    this.regexCache.clear();
  }
  /**
   * デバッグモードを設定
   */
  setDebugMode(enabled) {
    this.debugMode = enabled;
  }
  /**
   * コマンドを追加または置き換え
   */
  addOrReplaceCommand(commands, newCommand) {
    if (!Array.isArray(commands)) {
      commands = [];
    }
    if (/^#[0-9A-Fa-f]{6}$/.test(newCommand)) {
      const filteredCommands = commands.filter(
        (cmd) => !this.isCommandOfType(cmd, COMMAND_TYPES.COLOR) && !/^#[0-9A-Fa-f]{6}$/.test(cmd)
      );
      return [...filteredCommands, newCommand];
    }
    const commandType = this.getCommandType(newCommand);
    if (commandType) {
      const filteredCommands = commands.filter((cmd) => !this.isCommandOfType(cmd, commandType));
      return [...filteredCommands, newCommand];
    } else {
      if (!commands.includes(newCommand)) {
        return [...commands, newCommand];
      }
      return commands;
    }
  }
  /**
   * 複数のコマンドを一括で追加または置き換え
   */
  addOrReplaceCommands(commands, newCommands) {
    let result = commands;
    for (const newCommand of newCommands) {
      result = this.addOrReplaceCommand(result, newCommand);
    }
    return result;
  }
  /**
   * コマンドの種類を取得
   */
  getCommandType(command) {
    if (/^#[0-9A-Fa-f]{6}$/.test(command)) {
      return COMMAND_TYPES.COLOR;
    }
    const lowerCommand = command.toLowerCase();
    for (const [type, commands] of Object.entries(COMMAND_CATEGORIES)) {
      if (commands.includes(lowerCommand)) {
        return type;
      }
    }
    return null;
  }
  /**
   * 指定されたコマンドが特定の種類かチェック
   */
  isCommandOfType(command, commandType) {
    if (commandType === COMMAND_TYPES.COLOR && /^#[0-9A-Fa-f]{6}$/.test(command)) {
      return true;
    }
    const categoryCommands = COMMAND_CATEGORIES[commandType];
    if (!categoryCommands) {
      return false;
    }
    const lowerCommand = command.toLowerCase();
    return categoryCommands.includes(lowerCommand);
  }
  /**
   * 特定の種類のコマンドを取得
   */
  getCommandsOfType(commands, commandType) {
    return commands.filter((cmd) => this.isCommandOfType(cmd, commandType));
  }
  /**
   * 特定の種類のコマンドを削除
   */
  removeCommandsOfType(commands, commandType) {
    return commands.filter((cmd) => !this.isCommandOfType(cmd, commandType));
  }
  /**
   * 外部からコマンドを追加するためのパブリックメソッド
   */
  addCommandsToComment(comment, commandsToAdd) {
    const processedComment = { ...comment };
    if (!Array.isArray(processedComment.commands)) {
      processedComment.commands = [];
    }
    processedComment.commands = this.addOrReplaceCommands(processedComment.commands, commandsToAdd);
    return processedComment;
  }
  /**
   * 外部から単一コマンドを追加するためのパブリックメソッド
   */
  addCommandToComment(comment, commandToAdd) {
    const processedComment = { ...comment };
    if (!Array.isArray(processedComment.commands)) {
      processedComment.commands = [];
    }
    processedComment.commands = this.addOrReplaceCommand(processedComment.commands, commandToAdd);
    return processedComment;
  }
  /**
   * フィルターログエントリーを追加
   */
  addFilterLog(comment, rule, ruleType, matched, hidden, currentSmid) {
    try {
      const videoTitle = FilterLogger.getVideoTitle();
      const reasons = FilterLogger.generateFilterReasons(ruleType, matched, hidden);
      const filterDetails = FilterLogger.generateFilterDetails(
        ruleType,
        rule.regex,
        rule.userId,
        rule.replace
      );
      const logEntry = {
        title: videoTitle,
        userId: comment.userId,
        comment: comment.body,
        videoId: currentSmid || "不明",
        reasons,
        filterDetails
      };
      this.filterLogs.push(logEntry);
    } catch (error) {
      window.logger?.warn("[CommentFilter2] Failed to add filter log:", error);
    }
  }
  /**
   * コマンドの形式を正規化（文字列→配列変換、クリーンアップ）
   */
  normalizeCommands(commands) {
    if (!commands) {
      return [];
    }
    if (Array.isArray(commands)) {
      return commands.filter((cmd) => cmd !== null && cmd !== void 0 && cmd !== "").map((cmd) => String(cmd).trim()).filter((cmd) => cmd.length > 0);
    }
    if (typeof commands === "string") {
      return commands.trim().split(/\s+/).filter((cmd) => cmd.length > 0);
    }
    if (this.debugMode) {
      window.logger.warn("[CommentFilter2] Unexpected commands type:", typeof commands, commands);
    }
    return [];
  }
}

class JsonCommentFilter {
  // フィルターログの蓄積用
  constructor(debugMode = false) {
    this.regexCache = /* @__PURE__ */ new Map();
    this.debugMode = false;
    this.settings = null;
    this.filterLogs = [];
    this.debugMode = debugMode;
  }
  /**
   * 設定を更新
   */
  updateSettings(settings) {
    this.settings = settings;
    this.debugMode = settings.debugMode;
    FilterLogger.setLogSendingEnabled(settings?.logToCommentFilterLogger || false);
  }
  /**
   * メインのフィルタリング処理（JSON形式ルール対応）
   */
  async applyFilters(rules, currentSmid) {
    await Promise.resolve();
    const globalData = this.getGlobalData();
    if (!globalData?.originalData) {
      if (this.debugMode) {
        window.logger?.debug("[CommentFilter2] No global data available for filtering");
      }
      return null;
    }
    try {
      this.filterLogs = [];
      if (this.debugMode) {
        window.logger?.debug("[CommentFilter2] Starting JSON filtering with rules:", {
          totalRules: rules.length,
          userIdRules: rules.filter((r) => r.userId),
          regexRules: rules.filter((r) => r.pattern),
          currentSmid
        });
      }
      const filteredData = this.processCommentData(globalData.originalData, rules, currentSmid);
      globalData.filteredData = filteredData;
      if (this.debugMode) {
        this.logFilteringResults(globalData.originalData, filteredData, rules);
      }
      if (this.settings?.logToCommentFilterLogger && this.filterLogs.length > 0) {
        FilterLogger.addLogsToBuffer(this.filterLogs);
      }
      return filteredData;
    } catch (error) {
      window.logger?.error("[CommentFilter2] JSON filtering failed:", error);
      return globalData.originalData;
    }
  }
  /**
   * コメントデータ全体を処理
   */
  processCommentData(data, rules, currentSmid) {
    const processedThreads = data.data.threads.map((thread) => ({
      ...thread,
      comments: this.filterCommentsInThread(thread.comments, rules, currentSmid, thread.fork)
    }));
    return {
      ...data,
      data: {
        ...data.data,
        threads: processedThreads
      }
    };
  }
  /**
   * スレッド内のコメントをフィルタリング（JSON形式ルール対応）
   */
  filterCommentsInThread(comments, rules, currentSmid, threadFork) {
    if (this.debugMode) {
      window.logger?.debug(`[CommentFilter2] Processing ${threadFork} thread with ${comments.length} comments using ${rules.length} JSON rules`);
    }
    return comments.map((comment) => this.applyRulesToComment(comment, rules, currentSmid, threadFork)).filter((comment) => comment !== null);
  }
  /**
   * 単一コメントにJSON形式ルールを適用
   */
  applyRulesToComment(comment, rules, currentSmid, threadFork) {
    const processedComment = { ...comment };
    processedComment.commands = this.normalizeCommands(processedComment.commands);
    if ([CONSTANTS.FORK_TYPES.EASY, CONSTANTS.FORK_TYPES.MAIN, CONSTANTS.FORK_TYPES.OWNER].includes(threadFork)) {
      processedComment.isPremium = true;
    }
    let ruleApplied = false;
    let shouldHideComment = false;
    let shouldApplyCommands = true;
    let appliedRule = null;
    let excludedByNicoru = false;
    const activeRules = rules.filter((rule) => rule.enabled !== false);
    if (activeRules.length === 0) {
      if ([CONSTANTS.FORK_TYPES.EASY, CONSTANTS.FORK_TYPES.MAIN, CONSTANTS.FORK_TYPES.OWNER].includes(threadFork)) {
        processedComment.commands = this.applyForkCommandSettings(processedComment.commands, threadFork);
      }
      return processedComment;
    }
    for (const rule of activeRules) {
      const smidOk = this.checkSmidCondition(rule.smid, currentSmid);
      if (!smidOk) {
        continue;
      }
      const patternOk = rule.pattern ? this.getRegex(rule.pattern, rule.flags || "gi").test(comment.body) : rule.userId ? rule.userId === comment.userId : false;
      if (!patternOk) {
        continue;
      }
      let nicoruOk = true;
      if (rule.nicoru_cond) {
        nicoruOk = this.checkNicoruCondition(rule.nicoru_cond, comment.nicoruCount);
        const modeValue = (rule.nicoru_cond.mode ?? "exclude").toString().trim().toLowerCase();
        if (!nicoruOk && modeValue === "exclude") {
          excludedByNicoru = true;
        }
      }
      if (!nicoruOk) {
        continue;
      }
      ruleApplied = true;
      appliedRule = rule;
      const actionResult = this.executeAction(rule.action, processedComment.body, rule);
      if (actionResult.type === "hide") {
        shouldHideComment = true;
        processedComment.body = "";
        processedComment.commands.push("invisible");
        this.addFilterLog(comment, rule, true, currentSmid);
        break;
      } else if (actionResult.type === "replace") {
        processedComment.body = actionResult.newText || processedComment.body;
        this.addFilterLog(comment, rule, false, currentSmid);
      } else if (actionResult.type === "none") {
        this.addFilterLog(comment, rule, false, currentSmid);
      }
    }
    if (shouldHideComment) {
      processedComment.body = "";
      if (!processedComment.commands.includes("invisible")) {
        processedComment.commands.push("invisible");
      }
    }
    if (ruleApplied && appliedRule) {
      if (appliedRule.nicoru_cond && appliedRule.nicoru_cond.mode === "exclude" && excludedByNicoru) {
        shouldApplyCommands = false;
      } else {
        shouldApplyCommands = true;
      }
    } else {
      if (excludedByNicoru) {
        shouldApplyCommands = false;
      } else {
        shouldApplyCommands = true;
      }
    }
    if ([CONSTANTS.FORK_TYPES.EASY, CONSTANTS.FORK_TYPES.MAIN, CONSTANTS.FORK_TYPES.OWNER].includes(threadFork)) {
      if (shouldApplyCommands) {
        processedComment.commands = this.applyForkCommandSettings(processedComment.commands, threadFork);
      } else {
        processedComment.commands = sanitizeCommentCommands(processedComment.commands);
      }
    }
    if (ruleApplied) {
      processedComment.body = sanitizeCommentBody(processedComment.body);
    }
    if (this.debugMode) {
      window.logger?.debug(
        "[CF2] fork=%s  nicoru=%d  ruleApplied=%o  excludedByNicoru=%o  shouldApplyCmd=%o  finalCmd=%o",
        threadFork,
        comment.nicoruCount,
        ruleApplied,
        excludedByNicoru,
        shouldApplyCommands,
        processedComment.commands
      );
    }
    return processedComment;
  }
  /**
   * ルール適用条件をチェック（JSON形式対応）
   */
  shouldApplyRule(rule, comment, currentSmid) {
    if (!this.checkSmidCondition(rule.smid, currentSmid)) {
      return false;
    }
    if (rule.pattern) {
      const regex = this.getRegex(rule.pattern, rule.flags || "gi");
      if (!regex.test(comment.body)) {
        return false;
      }
    } else if (rule.userId) {
      if (rule.userId !== comment.userId) {
        return false;
      }
    } else {
      return false;
    }
    if (rule.nicoru_cond && !this.checkNicoruCondition(rule.nicoru_cond, comment.nicoruCount)) {
      return false;
    }
    return true;
  }
  /**
   * SMID条件をチェック
   */
  checkSmidCondition(smids, currentSmid) {
    if (smids.includes("ALL")) {
      return true;
    }
    return currentSmid ? smids.includes(currentSmid) : false;
  }
  /**
   * 文字列・数値を安全に number へ変換
   * 数値でなければ null を返す
   */
  toNumber(val) {
    if (typeof val === "number") return val;
    if (typeof val === "string" && val.trim() !== "") {
      const n = Number(val);
      return Number.isNaN(n) ? null : n;
    }
    return null;
  }
  /**
   * ニコる数条件をチェック（新形式対応・型安全版）
   */
  checkNicoruCondition(cond, rawCount) {
    const { op, value, mode = "exclude" } = cond;
    const commentNicoruCount = this.toNumber(rawCount) ?? 0;
    let conditionMet = false;
    switch (op) {
      case "=": {
        const numericValue = this.toNumber(value);
        conditionMet = numericValue !== null && commentNicoruCount === numericValue;
        break;
      }
      case ">": {
        const numericValue = this.toNumber(value);
        conditionMet = numericValue !== null && commentNicoruCount > numericValue;
        break;
      }
      case "<": {
        const numericValue = this.toNumber(value);
        conditionMet = numericValue !== null && commentNicoruCount < numericValue;
        break;
      }
      case ">=": {
        const numericValue = this.toNumber(value);
        conditionMet = numericValue !== null && commentNicoruCount >= numericValue;
        break;
      }
      case "<=": {
        const numericValue = this.toNumber(value);
        conditionMet = numericValue !== null && commentNicoruCount <= numericValue;
        break;
      }
      case "range": {
        if (Array.isArray(value) && value.length === 2) {
          const numStart = this.toNumber(value[0]);
          const numEnd = this.toNumber(value[1]);
          if (numStart !== null && numEnd !== null) {
            conditionMet = commentNicoruCount >= numStart && commentNicoruCount <= numEnd;
          }
        }
        break;
      }
    }
    return mode === "include" ? conditionMet : !conditionMet;
  }
  /**
   * アクションを実行
   */
  executeAction(action, text, rule) {
    if (action.type === "hide") {
      return { type: "hide" };
    }
    if (action.type === "replace" && rule.pattern) {
      const regex = this.getRegex(rule.pattern, rule.flags || "gi");
      const newText = text.replace(regex, action.replacement);
      return { type: "replace", newText };
    }
    return { type: "none" };
  }
  /**
   * 正規表現オブジェクトを取得（キャッシュ付き・フラグ対応・lastIndex対応）
   */
  getRegex(pattern, flags = "gi") {
    const cacheKey = `${pattern}:::${flags}`;
    if (this.regexCache.has(cacheKey)) {
      const cachedRegex = this.regexCache.get(cacheKey);
      if (cachedRegex.global) {
        cachedRegex.lastIndex = 0;
      }
      return cachedRegex;
    }
    const regex = new RegExp(pattern, flags);
    this.regexCache.set(cacheKey, regex);
    return regex;
  }
  /**
   * フォーク別のコマンド設定を適用（従来通り）
   */
  applyForkCommandSettings(commands, threadFork) {
    if (!this.settings?.commandSettings) {
      return sanitizeCommentCommands(commands);
    }
    const allowedCommands = this.getAllowedCommandsForFork(threadFork);
    const combinedCommands = [...allowedCommands, ...commands];
    const sanitizedCommands = sanitizeCommentCommands(combinedCommands);
    const filteredCommands = sanitizedCommands.filter((command) => {
      if (/^#[0-9A-Fa-f]{6}$/.test(command)) {
        return true;
      }
      return allowedCommands.includes(command.toLowerCase());
    });
    return filteredCommands;
  }
  /**
   * フォークタイプに対して許可されたコマンドを取得
   */
  getAllowedCommandsForFork(threadFork) {
    if (!this.settings?.commandSettings) {
      return [];
    }
    switch (threadFork) {
      case CONSTANTS.FORK_TYPES.OWNER:
        return this.settings.commandSettings.owner;
      case CONSTANTS.FORK_TYPES.MAIN:
        return this.settings.commandSettings.main;
      case CONSTANTS.FORK_TYPES.EASY:
        return this.settings.commandSettings.easy;
      default:
        return [];
    }
  }
  /**
   * フィルタリング結果をログ出力（デバッグ用）
   */
  logFilteringResults(original, filtered, rules) {
    const originalCount = this.countComments(original);
    const filteredCount = this.countComments(filtered);
    const hiddenCount = originalCount - filteredCount;
    window.logger.debug("[CommentFilter2] JSON Filtering Results:", {
      originalComments: originalCount,
      filteredComments: filteredCount,
      hiddenComments: hiddenCount,
      appliedRules: rules.length,
      ruleTypes: {
        regex: rules.filter((r) => r.pattern).length,
        userId: rules.filter((r) => r.userId).length,
        withNicoruCond: rules.filter((r) => r.nicoru_cond).length
      }
    });
  }
  /**
   * コメント総数をカウント
   */
  countComments(data) {
    return data.data.threads.reduce((sum, thread) => sum + thread.comments.length, 0);
  }
  /**
   * グローバルデータを取得
   */
  getGlobalData() {
    const data = window[CONSTANTS.GLOBAL_DATA_KEY];
    if (data && typeof data === "object" && "originalData" in data && "filteredData" in data && "currentSmid" in data && "lastUpdated" in data) {
      return data;
    }
    return null;
  }
  /**
   * 正規表現キャッシュをクリア
   */
  clearRegexCache() {
    this.regexCache.clear();
  }
  /**
   * デバッグモードを設定
   */
  setDebugMode(enabled) {
    this.debugMode = enabled;
  }
  /**
   * フィルターログエントリーを追加
   */
  addFilterLog(comment, rule, hidden, currentSmid) {
    try {
      const videoTitle = FilterLogger.getVideoTitle();
      const ruleType = rule.pattern ? "regex" : "userId";
      const reasons = FilterLogger.generateFilterReasons(ruleType, true, hidden);
      const filterDetails = FilterLogger.generateFilterDetails(
        ruleType,
        rule.pattern,
        rule.userId,
        rule.action.type === "replace" ? rule.action.replacement : void 0
      );
      const logEntry = {
        title: videoTitle,
        userId: comment.userId,
        comment: comment.body,
        videoId: currentSmid || "不明",
        reasons,
        filterDetails
      };
      this.filterLogs.push(logEntry);
    } catch (error) {
      window.logger?.warn("[CommentFilter2] Failed to add filter log:", error);
    }
  }
  /**
   * コマンドの形式を正規化（文字列→配列変換、クリーンアップ）
   */
  normalizeCommands(commands) {
    if (!commands) {
      return [];
    }
    if (Array.isArray(commands)) {
      return commands.filter((cmd) => cmd !== null && cmd !== void 0 && cmd !== "").map((cmd) => String(cmd).trim()).filter((cmd) => cmd.length > 0);
    }
    if (typeof commands === "string") {
      return commands.trim().split(/\s+/).filter((cmd) => cmd.length > 0);
    }
    if (this.debugMode) {
      window.logger.warn("[CommentFilter2] Unexpected commands type:", typeof commands, commands);
    }
    return [];
  }
}

const jsonCommentFilter = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  JsonCommentFilter
}, Symbol.toStringTag, { value: 'Module' }));

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
  warning: "warning_amber",
  check: "check_circle",
  info: "info",
  comment: "comment",
  delete: "delete",
  edit: "edit",
  folder: "folder_open",
  refresh: "refresh",
  push_pin: "push_pin"};
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
function getIconSVG(iconName) {
  return createMaterialIcon(iconName, {
    style: "outlined",
    color: "white",
    classes: "cf2-icon cf2-icon-white",
    loading: "lazy"
  });
}

const mainUITemplate = `
<div id="cf2-container" class="cf2-container">
  <!-- ヘッダー -->
  <div class="cf2-header">
    <div class="cf2-title">
      ${getIconSVG(ICONS.filter)}
      <span class="cf2-title-text">comment-filter2</span>
              <a href="https://www.nicovideo.jp/local/features/dist/src/docs/comment-filter2/index.html" target="_blank">${getIconSVG(ICONS.info)}</a>
    </div>
    <button id="cf2-close-btn" class="cf2-close-btn" title="閉じる">
      ${getIconSVG(ICONS.close)}
    </button>
  </div>

  <!-- メインコンテンツ -->
  <div id="cf2-content" class="cf2-content">
    <!-- 全体コントロール（全幅） -->
    <div class="cf2-top-controls">
      <!-- 全体ON/OFFトグル -->
      <div class="cf2-card cf2-control-card">
        <div class="cf2-toggle-container">
          <div class="cf2-toggle-label">
            ${getIconSVG(ICONS.visibility)}
            <span>フィルター有効</span>
          </div>
          <div id="cf2-main-toggle" class="cf2-toggle active">
            <div class="cf2-toggle-slider"></div>
          </div>
        </div>
      </div>

      <!-- ステータス表示 -->
      <div class="cf2-status-card cf2-control-card">
        <div class="cf2-status">
          <div id="cf2-status-indicator" class="cf2-status-indicator active"></div>
          <span id="cf2-status-text" class="cf2-status-text">準備完了</span>
        </div>
      </div>
    </div>

    <!-- コマンド設定セクション（全幅） -->
    <div class="cf2-card cf2-command-settings-card">
      <div class="cf2-section-header">
        ${getIconSVG(ICONS.comment)}
        <div class="cf2-section-title">コメントコマンド設定</div>
      </div>
      <p class="cf2-help-text">カンマ区切りでコマンドを入力</p>
      
      <div class="cf2-command-grid">
        <!-- 投稿者コメント -->
        <div class="cf2-input-group">
          <label for="cf2-owner-commands" class="cf2-input-label" title="利用可能コマンド: big,medium,small,defont,gothic,mincho,ue,naka,shita,white,red,pink,orange,yellow,green,cyan,blue,purple,black,white2,red2,pink2,orange2,yellow2,green2,cyan2,blue2,purple2,black2,_live,invisible,full,ender,patissier,ca,#RRGGBB(16進数カラー)">
            ${getIconSVG(ICONS.info)}
            投稿者コメント (owner)
          </label>
          <input 
            type="text" 
            id="cf2-owner-commands" 
            class="cf2-command-input"
            placeholder="例: small,_live,red"
          />
        </div>

        <!-- メインコメント -->
        <div class="cf2-input-group">
          <label for="cf2-main-commands" class="cf2-input-label" title="利用可能コマンド: big,medium,small,defont,gothic,mincho,ue,naka,shita,white,red,pink,orange,yellow,green,cyan,blue,purple,black,white2,red2,pink2,orange2,yellow2,green2,cyan2,blue2,purple2,black2,_live,invisible,full,ender,patissier,ca,#RRGGBB(16進数カラー)">
            ${getIconSVG(ICONS.info)}
            メインコメント (main)
          </label>
          <input 
            type="text" 
            id="cf2-main-commands" 
            class="cf2-command-input"
            placeholder="例: big,blue2"
          />
        </div>

        <!-- 簡単コメント -->
        <div class="cf2-input-group">
          <label for="cf2-easy-commands" class="cf2-input-label" title="利用可能コマンド: big,medium,small,defont,gothic,mincho,ue,naka,shita,white,red,pink,orange,yellow,green,cyan,blue,purple,black,white2,red2,pink2,orange2,yellow2,green2,cyan2,blue2,purple2,black2,_live,invisible,full,ender,patissier,ca,#RRGGBB(16進数カラー)">
            ${getIconSVG(ICONS.info)}
            簡単コメント (easy)
          </label>
          <input 
            type="text" 
            id="cf2-easy-commands" 
            class="cf2-command-input"
            placeholder="例: mincho,pink,big"
          />
        </div>
      </div>

      <div class="cf2-button-group">
        <button id="cf2-save-commands" class="cf2-button cf2-button-primary">
          ${getIconSVG(ICONS.save)}
          <span>コマンド設定保存</span>
        </button>
        <button id="cf2-reset-commands" class="cf2-button cf2-button-secondary">
          ${getIconSVG(ICONS.warning)}
          <span>デフォルトに戻す</span>
        </button>
      </div>
    </div>

    <!-- ルール形式切替 -->
    <div class="cf2-format-selector">
      <div class="cf2-card">
        <div class="cf2-section-header">
          ${getIconSVG(ICONS.settings)}
          <div class="cf2-section-title">ルール入力方式</div>
        </div>
        <div class="cf2-format-tabs">
          <button id="cf2-format-form" class="cf2-format-tab active">
            ${getIconSVG(ICONS.edit)}
            <span>フォーム入力</span>
          </button>
          <button id="cf2-format-json" class="cf2-format-tab">
            ${getIconSVG(ICONS.comment)}
            <span>JSON直接編集</span>
          </button>
        </div>
      </div>
    </div>

    <!-- 2カラムレイアウト -->
    <div class="cf2-layout-grid">
      <!-- 左カラム：ルール追加 -->
      <div class="cf2-left-column">
        <!-- ルール追加フォーム -->
        <div id="cf2-form-section" class="cf2-card cf2-main-card">
          <div class="cf2-section-header">
            ${getIconSVG(ICONS.edit)}
            <div class="cf2-section-title">ルール追加</div>
          </div>
          
          <!-- ルールタイプ選択 -->
          <div class="cf2-rule-type-selector">
            <div class="cf2-input-group">
              <label class="cf2-input-label">ルールタイプ</label>
              <div class="cf2-radio-group">
                <label class="cf2-radio-label">
                  <input type="radio" name="cf2-rule-type" value="regex" checked>
                  <span>正規表現</span>
                </label>
                <label class="cf2-radio-label">
                  <input type="radio" name="cf2-rule-type" value="userId">
                  <span>ユーザーID</span>
                </label>
              </div>
            </div>
          </div>

          <!-- 正規表現ルール入力 -->
          <div id="cf2-regex-inputs" class="cf2-rule-inputs">
            <div class="cf2-input-group">
              <label for="cf2-pattern-input" class="cf2-input-label">パターン（正規表現）</label>
              <input type="text" id="cf2-pattern-input" class="cf2-text-input" placeholder="例: 荒らし|スパム">
            </div>
            <div class="cf2-input-group">
              <label for="cf2-flags-input" class="cf2-input-label">フラグ</label>
              <input type="text" id="cf2-flags-input" class="cf2-text-input" value="gi" placeholder="gi">
            </div>
          </div>

          <!-- ユーザーIDルール入力 -->
          <div id="cf2-userid-inputs" class="cf2-rule-inputs cf2-hidden">
            <div class="cf2-input-group">
              <label for="cf2-userid-input" class="cf2-input-label">ユーザーID</label>
              <input type="text" id="cf2-userid-input" class="cf2-text-input" placeholder="例: nvc:AbCdEfgHiJkLMn">
            </div>
          </div>

          <!-- アクション設定 -->
          <div class="cf2-input-group">
            <label class="cf2-input-label">アクション</label>
            <div class="cf2-radio-group">
              <label class="cf2-radio-label">
                <input type="radio" name="cf2-action-type" value="hide" checked>
                <span>非表示</span>
              </label>
              <label class="cf2-radio-label" id="cf2-replace-action-label">
                <input type="radio" name="cf2-action-type" value="replace">
                <span>置換</span>
              </label>
              <label class="cf2-radio-label">
                <input type="radio" name="cf2-action-type" value="unspecified">
                <span>除外のみ</span>
              </label>
            </div>
            <div class="cf2-help-text" id="cf2-userid-action-note" style="display: none;">
              <strong>注意:</strong> ユーザーIDルールでは「非表示」と「除外のみ」のみ利用可能です。「除外のみ」はニコる数条件と組み合わせて使用します。
            </div>
          </div>

          <!-- 置換テキスト -->
          <div id="cf2-replace-input-group" class="cf2-input-group cf2-hidden">
            <label for="cf2-replace-input" class="cf2-input-label">置換テキスト</label>
            <input type="text" id="cf2-replace-input" class="cf2-text-input" placeholder="例: ****">
          </div>

          <!-- SMID設定 -->
          <div class="cf2-input-group">
            <label for="cf2-smid-input" class="cf2-input-label">対象動画（SMID）</label>
            <input type="text" id="cf2-smid-input" class="cf2-text-input" value="ALL" placeholder="ALL または sm12345678">
            <div class="cf2-help-text">ALLで全動画、特定のSMIDで個別動画を指定</div>
          </div>

          <!-- ニコる数条件 -->
          <div class="cf2-input-group">
            <label class="cf2-input-label">ニコる数条件</label>
            <div class="cf2-toggle-container">
              <div class="cf2-toggle-label">
                <span>条件を設定する</span>
              </div>
              <div id="cf2-nicoru-toggle" class="cf2-toggle">
                <div class="cf2-toggle-slider"></div>
              </div>
            </div>
          </div>

          <!-- ニコる数詳細設定 -->
          <div id="cf2-nicoru-details" class="cf2-nicoru-settings cf2-hidden">
            <div class="cf2-input-row">
              <select id="cf2-nicoru-op" class="cf2-select">
                <option value=">=">&gt;= 以上</option>
                <option value="<=">&lt;= 以下</option>
                <option value=">">&gt; より大きい</option>
                <option value="<">&lt; より小さい</option>
                <option value="=">=  等しい</option>
              </select>
              <input type="number" id="cf2-nicoru-value" class="cf2-number-input" value="10" min="0">
              <select id="cf2-nicoru-mode" class="cf2-select">
                <option value="exclude">条件に合致したら除外</option>
                <option value="include">条件に合致したら対象</option>
              </select>
            </div>
          </div>

          <!-- 追加ボタン -->
          <div class="cf2-button-group">
            <button id="cf2-add-rule" class="cf2-button cf2-button-primary">
              ${getIconSVG(ICONS.check)}
              <span>ルール追加</span>
            </button>
            <button id="cf2-clear-form" class="cf2-button cf2-button-secondary">
              ${getIconSVG(ICONS.clear)}
              <span>フォームクリア</span>
            </button>
          </div>
        </div>

        <!-- JSON直接編集セクション -->
        <div id="cf2-json-section" class="cf2-card cf2-main-card cf2-hidden">
          <div class="cf2-section-header">
            ${getIconSVG(ICONS.comment)}
            <div class="cf2-section-title">JSON Lines編集</div>
          </div>
          <div class="cf2-help-text">
            ${getIconSVG(ICONS.push_pin)} JSON Lines形式: 1行に1つのルールをJSONで記述
          </div>
          <div class="cf2-textarea-container">
            <textarea 
              id="cf2-json-textarea" 
              class="cf2-textarea"
              placeholder='{"pattern": "荒らし", "action": {"type": "hide"}, "smid": ["ALL"]}&#10;{"userId": "nvc:AbCdEfgHiJkLMn", "action": {"type": "hide"}, "smid": ["ALL"]}'
            ></textarea>
          </div>
          
          <div class="cf2-button-group">
            <button id="cf2-save-json-rules" class="cf2-button cf2-button-primary">
              ${getIconSVG(ICONS.save)}
              <span>JSON保存</span>
            </button>
            <button id="cf2-validate-json" class="cf2-button cf2-button-secondary">
              ${getIconSVG(ICONS.check)}
              <span>JSON検証</span>
            </button>
          </div>
        </div>

      </div>

      <!-- 右カラム：ルール一覧 -->
      <div class="cf2-right-column">
        <!-- ルール一覧表示 -->
        <div class="cf2-card cf2-rules-list-card">
          <div class="cf2-section-header">
            ${getIconSVG(ICONS.visibility)}
            <div class="cf2-section-title">現在のルール一覧</div>
            <div class="cf2-rule-count">
              <span id="cf2-rule-count-text">0件</span>
            </div>
          </div>
          
          <div class="cf2-rules-controls">
            <button id="cf2-refresh-rules" class="cf2-button cf2-button-secondary">
              ${getIconSVG(ICONS.refresh)}
              <span>更新</span>
            </button>
            <button id="cf2-clear-all-rules" class="cf2-button cf2-button-danger">
              ${getIconSVG(ICONS.delete)}
              <span>全削除</span>
            </button>
          </div>

          <div id="cf2-rules-list" class="cf2-rules-list">
            <!-- ルール一覧がここに動的に挿入される -->
          </div>
        </div>
        <!-- データ管理 -->
        <div class="cf2-card cf2-data-card">
          <div class="cf2-section-header">
            ${getIconSVG(ICONS.folder)}
            <div class="cf2-section-title">データ管理</div>
          </div>
          <div class="cf2-button-group">
            <button id="cf2-export-json-btn" class="cf2-button cf2-button-secondary">
              ${getIconSVG(ICONS.export)}
              <span>エクスポート</span>
            </button>
            <button id="cf2-import-btn" class="cf2-button cf2-button-secondary">
              ${getIconSVG(ICONS.import)}
              <span>インポート</span>
            </button>
            <button id="cf2-legacy-import-btn" class="cf2-button cf2-button-warning" title="CommentFilter（旧バージョン）の設定ファイルをインポートします">
              ${getIconSVG(ICONS.warning)}
              <span>レガシーインポート</span>
            </button>
          </div>
          <input type="file" id="cf2-file-input" class="cf2-file-input" accept=".json,.jsonl,.csv">
          <input type="file" id="cf2-legacy-file-input" class="cf2-file-input" accept=".json">
        </div>
      </div>
    </div>

    <!-- 設定セクション（全幅） -->
    <div class="cf2-settings-section">
      <!-- デバッグモード -->
      <div class="cf2-card cf2-debug-card">
        <div class="cf2-toggle-container">
          <div class="cf2-toggle-label">
            ${getIconSVG(ICONS.debug)}
            <span>デバッグモード</span>
          </div>
          <div id="cf2-debug-toggle" class="cf2-toggle">
            <div class="cf2-toggle-slider"></div>
          </div>
        </div>
      </div>

      <!-- ログ送信設定 -->
      <div class="cf2-card cf2-log-card">
        <div class="cf2-toggle-container">
          <div class="cf2-toggle-label" title="CommentFilterLogger.javaにフィルターログを送信する機能を有効/無効にします">
            ${getIconSVG(ICONS.info)}
            <span>ログ送信</span>
          </div>
          <div id="cf2-log-toggle" class="cf2-toggle active">
            <div class="cf2-toggle-slider"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- デバッグ情報（全幅） -->
    <div id="cf2-debug-section" class="cf2-debug-section cf2-collapsed">
      <div class="cf2-card">
        <div class="cf2-section-header">
          ${getIconSVG(ICONS.info)}
          <div class="cf2-section-title">デバッグ情報</div>
        </div>
        <div id="cf2-debug-info" class="cf2-debug-info">
          デバッグモードが無効です
        </div>
      </div>
    </div>

    <!-- 再読み込みボタン（全幅） -->
    <div class="cf2-reload-section">
      <button id="cf2-reload-btn" class="cf2-button cf2-button-primary cf2-reload-button">
        ${getIconSVG(ICONS.refresh)}
        <span>再読み込みして適用</span>
      </button>
    </div>
  </div>
</div>
`.trim();
const UI_ELEMENTS = {
  CONTAINER: "cf2-container",
  CLOSE_BTN: "cf2-close-btn",
  CONTENT: "cf2-content",
  MAIN_TOGGLE: "cf2-main-toggle",
  STATUS_INDICATOR: "cf2-status-indicator",
  STATUS_TEXT: "cf2-status-text",
  // 形式切替
  FORMAT_FORM: "cf2-format-form",
  FORMAT_JSON: "cf2-format-json",
  // フォーム入力
  FORM_SECTION: "cf2-form-section",
  PATTERN_INPUT: "cf2-pattern-input",
  FLAGS_INPUT: "cf2-flags-input",
  USERID_INPUT: "cf2-userid-input",
  REPLACE_INPUT: "cf2-replace-input",
  SMID_INPUT: "cf2-smid-input",
  NICORU_TOGGLE: "cf2-nicoru-toggle",
  NICORU_OP: "cf2-nicoru-op",
  NICORU_VALUE: "cf2-nicoru-value",
  NICORU_MODE: "cf2-nicoru-mode",
  ADD_RULE: "cf2-add-rule",
  CLEAR_FORM: "cf2-clear-form",
  // JSON編集
  JSON_SECTION: "cf2-json-section",
  JSON_TEXTAREA: "cf2-json-textarea",
  SAVE_JSON_RULES: "cf2-save-json-rules",
  VALIDATE_JSON: "cf2-validate-json",
  // ルール一覧
  RULES_LIST: "cf2-rules-list",
  RULE_COUNT_TEXT: "cf2-rule-count-text",
  REFRESH_RULES: "cf2-refresh-rules",
  CLEAR_ALL_RULES: "cf2-clear-all-rules",
  // データ管理
  EXPORT_JSON_BTN: "cf2-export-json-btn",
  IMPORT_BTN: "cf2-import-btn",
  LEGACY_IMPORT_BTN: "cf2-legacy-import-btn",
  FILE_INPUT: "cf2-file-input",
  LEGACY_FILE_INPUT: "cf2-legacy-file-input",
  // その他
  DEBUG_TOGGLE: "cf2-debug-toggle",
  LOG_TOGGLE: "cf2-log-toggle",
  DEBUG_SECTION: "cf2-debug-section",
  DEBUG_INFO: "cf2-debug-info",
  COMMAND_SETTINGS_SECTION: "cf2-command-settings-section",
  OWNER_COMMANDS: "cf2-owner-commands",
  MAIN_COMMANDS: "cf2-main-commands",
  EASY_COMMANDS: "cf2-easy-commands",
  SAVE_COMMANDS_BTN: "cf2-save-commands",
  RESET_COMMANDS_BTN: "cf2-reset-commands",
  RELOAD_BTN: "cf2-reload-btn"
};
const CSS_CLASSES = {
  TOGGLE_ACTIVE: "active",
  COLLAPSED: "cf2-collapsed",
  HIDDEN: "cf2-hidden",
  STATUS_ACTIVE: "cf2-status-indicator active",
  STATUS_ERROR: "cf2-status-indicator error"};

const CommentFilter2MainStyles = `
* {
  box-sizing: border-box;
}

/* Background Overlay with Blur Effect */
.cf2-background-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 9999;
  
  /* Beautiful blur effect */
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  
  /* Smooth fade animation */
  opacity: 0;
  animation: cf2-overlay-fade-in 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards;
  
  /* Cursor indicates clickable */
  cursor: pointer;
}

@keyframes cf2-overlay-fade-in {
  from {
    opacity: 0;
    backdrop-filter: blur(0px);
    -webkit-backdrop-filter: blur(0px);
  }
  to {
    opacity: 1;
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
  }
}

/* Container */
.cf2-container {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 10001;
  
  /* Glassmorphism inspired dark theme */
  background: rgba(17, 24, 39, 0.95);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  
  border: 1px solid rgba(55, 65, 81, 0.7);
  border-radius: 1rem;
  
  /* Shadow system */
  box-shadow: 
    0 25px 50px -12px rgba(0, 0, 0, 0.5),
    0 0 0 1px rgba(255, 255, 255, 0.02),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
  
  /* Modern typography */
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  font-size: 0.875rem;
  line-height: 1.5;
  color: #f9fafb;
  
  /* Dimensions - ビューポート全体を活用 */
  width: min(90vw, 100vw);
  max-height: 90vh;
  overflow-y: auto;
  
  /* Smooth transitions */
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

/* Scrollbar styling */
.cf2-container::-webkit-scrollbar {
  width: 6px;
}

.cf2-container::-webkit-scrollbar-track {
  background: rgba(55, 65, 81, 0.3);
  border-radius: 3px;
}

.cf2-container::-webkit-scrollbar-thumb {
  background: rgba(156, 163, 175, 0.5);
  border-radius: 3px;
}

.cf2-container::-webkit-scrollbar-thumb:hover {
  background: rgba(156, 163, 175, 0.7);
}

/* Header */
.cf2-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 2rem 2rem 0 2rem;
  margin-bottom: 2rem;
}

.cf2-title {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 1.25rem;
  font-weight: 700;
  color: #f9fafb;
}

.cf2-title-text {
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.cf2-close-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  
  background: rgba(55, 65, 81, 0.5);
  border: 1px solid rgba(75, 85, 99, 0.5);
  border-radius: 0.5rem;
  
  color: #9ca3af;
  cursor: pointer;
  
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.cf2-close-btn:hover {
  background: rgba(239, 68, 68, 0.1);
  border-color: rgba(239, 68, 68, 0.3);
  color: #ef4444;
  transform: scale(1.05);
}

/* Content */
.cf2-content {
  padding: 0 2rem 2rem 2rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

/* Top controls (full width) */
.cf2-top-controls {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
}

.cf2-control-card {
  flex: 1;
  min-width: 0;
}

/* Layout grid for 2-column design */
.cf2-layout-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
  align-items: stretch;
  min-height: 0;
}

.cf2-left-column {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  height: 100%;
}

.cf2-right-column {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  height: 100%;
}

/* Card variants for different purposes */
.cf2-main-card {
  /* NGワードルール用の大きなカード */
  min-height: 400px;
  display: flex;
  flex-direction: column;
  flex: 1;
}

.cf2-settings-card {
  /* コマンド設定用 */
  flex: 1;
}

/* Card component */
.cf2-card {
  background: rgba(31, 41, 55, 0.6);
  border: 1px solid rgba(55, 65, 81, 0.5);
  border-radius: 0.75rem;
  padding: 1.25rem;
  
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.cf2-card:hover {
  background: rgba(31, 41, 55, 0.8);
  border-color: rgba(55, 65, 81, 0.7);
}

/* Section headers */
.cf2-section-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.cf2-section-title {
  font-size: 1rem;
  font-weight: 600;
  color: #f9fafb;
}

/* Status card */
.cf2-status-card {
  background: linear-gradient(135deg, rgba(34, 197, 94, 0.1), rgba(16, 185, 129, 0.1));
  border: 1px solid rgba(34, 197, 94, 0.2);
  border-radius: 0.75rem;
  padding: 1rem;
}

.cf2-status {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.cf2-status-indicator {
  width: 0.75rem;
  height: 0.75rem;
  border-radius: 50%;
  background: #6b7280;
  
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.cf2-status-indicator.active {
  background: #22c55e;
  box-shadow: 0 0 0 2px rgba(34, 197, 94, 0.2);
}

.cf2-status-indicator.error {
  background: #ef4444;
  box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.2);
}

.cf2-status-text {
  font-size: 0.875rem;
  font-weight: 500;
  color: #e5e7eb;
}

/* Toggle components */
.cf2-toggle-container {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.cf2-toggle-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 500;
  color: #e5e7eb;
}

.cf2-toggle {
  position: relative;
  width: 3rem;
  height: 1.5rem;
  
  background: rgba(55, 65, 81, 0.8);
  border: 1px solid rgba(75, 85, 99, 0.5);
  border-radius: 0.75rem;
  
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.cf2-toggle.active {
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
  border-color: transparent;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
}

.cf2-toggle-slider {
  position: absolute;
  top: 0.125rem;
  left: 0.125rem;
  width: 1.25rem;
  height: 1.25rem;
  
  background: white;
  border-radius: 50%;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.cf2-toggle.active .cf2-toggle-slider {
  transform: translateX(1.5rem);
}

/* Input groups */
.cf2-input-group {
  margin-bottom: 1rem;
}

.cf2-input-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  
  font-size: 0.875rem;
  font-weight: 500;
  color: #d1d5db;
  margin-bottom: 0.5rem;
  
  cursor: help;
}

.cf2-command-input {
  width: 100%;
  padding: 0.75rem 1rem;
  
  background: rgba(17, 24, 39, 0.8);
  border: 1px solid rgba(55, 65, 81, 0.5);
  border-radius: 0.5rem;
  
  color: #f9fafb;
  font-size: 0.875rem;
  
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.cf2-command-input:focus {
  outline: none;
  border-color: rgba(59, 130, 246, 0.5);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.cf2-command-input::placeholder {
  color: #6b7280;
}

/* Textarea */
.cf2-textarea-container {
  margin-bottom: 1rem;
  flex: 1;
  display: flex;
  flex-direction: column;
}

.cf2-textarea {
  width: 100%;
  min-height: 12rem;
  flex: 1;
  padding: 1rem;
  
  background: rgba(17, 24, 39, 0.8);
  border: 1px solid rgba(55, 65, 81, 0.5);
  border-radius: 0.5rem;
  
  color: #f9fafb;
  font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, 'Liberation Mono', Consolas, monospace;
  font-size: 0.8125rem;
  line-height: 1.5;
  
  resize: vertical;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.cf2-textarea:focus {
  outline: none;
  border-color: rgba(59, 130, 246, 0.5);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.cf2-textarea::placeholder {
  color: #6b7280;
}

/* Button groups */
.cf2-button-group {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

/* Buttons */
.cf2-button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  
  padding: 0.75rem 1.25rem;
  border: 1px solid transparent;
  border-radius: 0.5rem;
  
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  
  /* Flex grow for equal width buttons */
  flex: 1;
  min-width: 0;
}

.cf2-button:hover {
  transform: translateY(-1px);
}

.cf2-button:active {
  transform: translateY(0);
}

.cf2-button-primary {
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
  color: white;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.cf2-button-primary:hover {
  box-shadow: 0 8px 20px rgba(59, 130, 246, 0.4);
}

.cf2-button-secondary {
  background: rgba(55, 65, 81, 0.8);
  border-color: rgba(75, 85, 99, 0.5);
  color: #e5e7eb;
}

.cf2-button-secondary:hover {
  background: rgba(55, 65, 81, 1);
  border-color: rgba(75, 85, 99, 0.7);
}

.cf2-button-danger {
  background: linear-gradient(135deg, #ef4444, #dc2626);
  color: white;
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
}

.cf2-button-danger:hover {
  box-shadow: 0 8px 20px rgba(239, 68, 68, 0.4);
}

.cf2-button-warning {
  background: linear-gradient(135deg, #f59e0b, #d97706);
  color: white;
  box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3);
}

.cf2-button-warning:hover {
  background: linear-gradient(135deg, #d97706, #b45309);
  box-shadow: 0 8px 20px rgba(245, 158, 11, 0.4);
}

/* Help text */
.cf2-help-text {
  font-size: 0.8125rem;
  color: #9ca3af;
  margin-bottom: 1rem;
  padding: 0.75rem 1rem;
  background: rgba(17, 24, 39, 0.5);
  border: 1px solid rgba(55, 65, 81, 0.3);
  border-radius: 0.5rem;
  border-left: 4px solid #3b82f6;
}

/* Regex help text styling */
.cf2-regex-help {
  background: rgba(59, 130, 246, 0.08);
  border: 1px solid rgba(59, 130, 246, 0.2);
  border-radius: 0.5rem;
  border-left: 4px solid #3b82f6;
  font-size: 0.8125rem;
  line-height: 1.5;
  color: #d1d5db;
}

.cf2-regex-help code {
  background: rgba(59, 130, 246, 0.15);
  color: #93c5fd;
  padding: 0.125rem 0.375rem;
  border-radius: 0.25rem;
  font-size: 0.75rem;
  font-weight: 600;
  margin: 0 0.125rem;
}

/* File input */
.cf2-file-input {
  display: none;
}

/* Debug section */
.cf2-debug-section {
  margin-top: 1rem;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.cf2-debug-section.cf2-collapsed {
  display: none;
}

.cf2-debug-info {
  background: rgba(17, 24, 39, 0.9);
  border: 1px solid rgba(55, 65, 81, 0.5);
  border-radius: 0.5rem;
  padding: 1rem;
  
  font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, 'Liberation Mono', Consolas, monospace;
  font-size: 0.75rem;
  line-height: 1.5;
  color: #d1d5db;
  
  max-height: 12rem;
  overflow-y: auto;
  white-space: pre-wrap;
}

/* Icons */
.cf2-icon {
  width: 1.25rem;
  height: 1.25rem;
  transition: filter 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

/* 白色アイコン専用クラス */
.cf2-icon-white {
  filter: invert(1) brightness(1) contrast(1.2);
}

.cf2-button:hover .cf2-icon-white,
.cf2-close-btn:hover .cf2-icon-white {
  filter: invert(1) brightness(1.1) contrast(1.3);
}

.cf2-button-primary .cf2-icon-white,
.cf2-button-danger .cf2-icon-white {
  filter: invert(1) brightness(1.2) contrast(1.2);
}

/* Responsive design */
@media (max-width: 1024px) {
  .cf2-layout-grid {
    grid-template-columns: 1fr;
    gap: 1.25rem;
  }
  
  .cf2-right-column {
    gap: 1.25rem;
  }
}

@media (max-width: 768px) {
  .cf2-container {
    width: min(95vw, 90vw);
    max-height: 95vh;
  }
  
  .cf2-header {
    padding: 1.5rem 1.5rem 0 1.5rem;
  }
  
  .cf2-content {
    padding: 0 1.5rem 1.5rem 1.5rem;
    gap: 1.25rem;
  }
  
  .cf2-top-controls {
    flex-direction: column;
    gap: 1rem;
  }
  
  .cf2-layout-grid {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
  
  .cf2-button-group {
    flex-direction: column;
  }
  
  .cf2-button {
    flex: none;
  }
  
  .cf2-title {
    font-size: 1.125rem;
  }
  
  .cf2-main-card {
    min-height: 300px;
  }
  
  .cf2-reload-button {
    padding: 0.875rem 1.5rem;
    font-size: 0.9375rem;
  }
}

/* Smooth entrance animation */
@keyframes cf2-fade-in {
  from {
    opacity: 0;
    transform: translate(-50%, -50%) translateY(-20px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translate(-50%, -50%) translateY(0) scale(1);
  }
}

.cf2-container {
  animation: cf2-fade-in 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

/* Reload button section */
.cf2-reload-section {
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid rgba(55, 65, 81, 0.5);
}

.cf2-reload-button {
  width: 100%;
  font-size: 1rem;
  font-weight: 600;
  padding: 1rem 2rem;
  
  background: linear-gradient(135deg, #10b981, #059669);
  border: none;
  border-radius: 0.75rem;
  color: white;
  cursor: pointer;
  
  box-shadow: 
    0 4px 12px rgba(16, 185, 129, 0.3),
    0 1px 0 rgba(255, 255, 255, 0.1) inset;
  
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.cf2-reload-button:hover {
  background: linear-gradient(135deg, #059669, #047857);
  box-shadow: 
    0 8px 20px rgba(16, 185, 129, 0.4),
    0 1px 0 rgba(255, 255, 255, 0.15) inset;
  transform: translateY(-2px);
}

.cf2-reload-button:active {
  transform: translateY(0);
  box-shadow: 
    0 4px 12px rgba(16, 185, 129, 0.3),
    0 1px 0 rgba(255, 255, 255, 0.1) inset;
}

/* Focus management */
.cf2-container:focus-within {
  box-shadow: 
    0 25px 50px -12px rgba(0, 0, 0, 0.6),
    0 0 0 1px rgba(59, 130, 246, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
}

/* 新しいUI要素のスタイル */

/* 形式切替タブ */
.cf2-format-selector {
  margin-bottom: 20px;
}

.cf2-format-tabs {
  display: flex;
  gap: 4px;
  margin-top: 12px;
}

.cf2-format-tab {
  flex: 1;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  color: #ffffff;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 14px;
}

.cf2-format-tab:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(74, 144, 226, 0.3);
}

.cf2-format-tab.active {
  background: rgba(74, 144, 226, 0.2);
  border-color: #4a90e2;
  color: #4a90e2;
}

/* 表示/非表示制御 */
.cf2-hidden {
  display: none !important;
}

/* ユーザーIDルール用の注意書きスタイル */
#cf2-userid-action-note {
  background: rgba(245, 158, 11, 0.1);
  border: 1px solid rgba(245, 158, 11, 0.3);
  border-radius: 0.5rem;
  border-left: 4px solid #f59e0b;
  font-size: 0.8125rem;
  line-height: 1.5;
  color: #fbbf24;
}

/* テキスト入力 */
.cf2-text-input {
  width: 100%;
  padding: 10px 12px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 6px;
  color: #ffffff;
  font-size: 14px;
  transition: all 0.2s ease;
}

.cf2-text-input:focus {
  outline: none;
  border-color: #4a90e2;
  background: rgba(255, 255, 255, 0.12);
  box-shadow: 0 0 0 2px rgba(74, 144, 226, 0.2);
}

.cf2-text-input::placeholder {
  color: rgba(255, 255, 255, 0.5);
}

/* ラジオボタン */
.cf2-radio-group {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}

.cf2-radio-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 14px;
  color: #ffffff;
}

.cf2-radio-label input[type="radio"] {
  width: 16px;
  height: 16px;
  accent-color: #4a90e2;
}

/* セレクトボックス */
.cf2-select {
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 6px;
  color: #ffffff;
  font-size: 14px;
  cursor: pointer;
}

.cf2-select:focus {
  outline: none;
  border-color: #4a90e2;
  box-shadow: 0 0 0 2px rgba(74, 144, 226, 0.2);
}

/* セレクトボックスのオプション */
.cf2-select option {
  background: #1f2937;
  color: #ffffff;
  padding: 8px 12px;
}

.cf2-select option:hover {
  background: #374151;
}

.cf2-select option:checked {
  background: #4a90e2;
  color: #ffffff;
}

/* 数値入力 */
.cf2-number-input {
  width: 80px;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 6px;
  color: #ffffff;
  font-size: 14px;
  text-align: center;
}

.cf2-number-input:focus {
  outline: none;
  border-color: #4a90e2;
  box-shadow: 0 0 0 2px rgba(74, 144, 226, 0.2);
}

/* 入力行（横並び） */
.cf2-input-row {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
}

/* ニコる数設定 */
.cf2-nicoru-settings {
  padding: 12px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  margin-bottom: 12px;
}

/* ルール一覧 */
.cf2-rules-list-card .cf2-section-header {
  justify-content: space-between;
}

.cf2-rule-count {
  background: rgba(74, 144, 226, 0.2);
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
  color: #4a90e2;
}

.cf2-rules-controls {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.cf2-rules-list {
  max-height: 300px;
  overflow-y: auto;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.03);
}

.cf2-rule-item {
  padding: 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  transition: background-color 0.2s ease;
}

.cf2-rule-item:hover {
  background: rgba(255, 255, 255, 0.05);
}

.cf2-rule-item:last-child {
  border-bottom: none;
}

.cf2-rule-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.cf2-rule-type {
  background: rgba(74, 144, 226, 0.2);
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  color: #4a90e2;
}

.cf2-rule-actions {
  display: flex;
  gap: 4px;
}

.cf2-rule-content {
  font-size: 13px;
  color: #b8c5d1;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  word-break: break-all;
}

.cf2-rule-details {
  margin-top: 8px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
}

/* 小さなボタン */
.cf2-button-small {
  padding: 6px 10px;
  font-size: 12px;
}

/* コマンド設定カード */
.cf2-command-settings-card {
  margin-bottom: 1.5rem;
}

.cf2-command-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1rem;
  margin-bottom: 1rem;
}

/* 設定セクション */
.cf2-settings-section {
  display: flex;
  gap: 1rem;
  margin-top: 1.5rem;
}

.cf2-settings-section .cf2-card {
  flex: 1;
}

/* レスポンシブ対応 */
@media (max-width: 768px) {
  .cf2-command-grid {
    grid-template-columns: 1fr;
  }
  
  .cf2-settings-section {
    flex-direction: column;
  }
}
`;

class UIManager {
  constructor() {
    this.container = null;
    this.shadowRoot = null;
    this.backgroundOverlay = null;
    this.isVisible = false;
    this.isUICreated = false;
    this.currentFormat = "form";
    this.currentSettings = {
      debugMode: false,
      isEnabled: true,
      commandSettings: {
        owner: [],
        main: [],
        easy: [],
        normal: []
      }
    };
    this.storage = new FilterStorage();
    this.filter = new CommentFilter();
    this.jsonFilter = new JsonCommentFilter();
    void this.initialize();
  }
  /**
   * UIマネジメントの初期化
   */
  async initialize() {
    try {
      await this.storage.initialize();
      await this.loadSettings();
      window.logger?.info("[CommentFilter2] UI Manager initialized (UI not created yet)");
    } catch (error) {
      window.logger?.error("[CommentFilter2] UI Manager initialization failed:", error);
    }
  }
  /**
   * UIを作成してシャドウDOMに挿入
   */
  async createUI() {
    await Promise.resolve();
    if (this.isUICreated) return;
    this.removeUI();
    this.injectStyles();
    this.backgroundOverlay = document.createElement("div");
    this.backgroundOverlay.id = "cf2-background-overlay";
    this.backgroundOverlay.className = "cf2-background-overlay";
    this.backgroundOverlay.style.display = "none";
    document.body.appendChild(this.backgroundOverlay);
    this.backgroundOverlay.addEventListener("click", () => {
      this.hide();
    });
    const shadowHost = document.createElement("div");
    shadowHost.id = "cf2-shadow-host";
    document.body.appendChild(shadowHost);
    this.shadowRoot = shadowHost.attachShadow({ mode: "closed" });
    this.injectShadowStyles();
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = mainUITemplate;
    this.container = tempDiv.firstElementChild;
    this.shadowRoot.appendChild(this.container);
    this.bindEvents();
    this.updateUI();
    this.updateFormatDisplay();
    void this.refreshRulesList();
    this.isUICreated = true;
    window.logger?.info("[CommentFilter2] UI created in Shadow DOM and ready");
  }
  /**
   * スタイルシートをページに挿入（背景オーバーレイ用）
   */
  injectStyles() {
    const styleId = "cf2-styles";
    const existingStyle = document.getElementById(styleId);
    if (existingStyle) {
      existingStyle.remove();
    }
    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = CommentFilter2MainStyles;
    document.head.appendChild(style);
  }
  /**
   * スタイルをシャドウDOMに注入
   */
  injectShadowStyles() {
    if (!this.shadowRoot) return;
    const style = document.createElement("style");
    style.textContent = CommentFilter2MainStyles;
    this.shadowRoot.appendChild(style);
    window.logger?.debug("[CommentFilter2] Styles injected into Shadow DOM");
  }
  /**
   * イベントハンドラーをバインド（シャドウDOM対応）
   */
  bindEvents() {
    if (!this.container) {
      window.logger?.error("[CommentFilter2] Container not found for event binding");
      return;
    }
    this.safeAddEventListener(UI_ELEMENTS.CLOSE_BTN, "click", () => this.hide());
    this.safeAddEventListener(UI_ELEMENTS.MAIN_TOGGLE, "click", () => this.toggleMainFilter());
    this.safeAddEventListener(UI_ELEMENTS.DEBUG_TOGGLE, "click", () => this.toggleDebugMode());
    this.safeAddEventListener(UI_ELEMENTS.LOG_TOGGLE, "click", () => this.toggleLogSending());
    this.safeAddEventListener(UI_ELEMENTS.FORMAT_FORM, "click", () => this.switchFormat("form"));
    this.safeAddEventListener(UI_ELEMENTS.FORMAT_JSON, "click", () => this.switchFormat("json"));
    this.safeAddEventListener(UI_ELEMENTS.ADD_RULE, "click", () => this.addRuleFromForm());
    this.safeAddEventListener(UI_ELEMENTS.CLEAR_FORM, "click", () => this.clearForm());
    this.safeAddEventListener(UI_ELEMENTS.NICORU_TOGGLE, "click", () => this.toggleNicoruSettings());
    this.safeAddEventListener(UI_ELEMENTS.SAVE_JSON_RULES, "click", () => this.saveJsonRules());
    this.safeAddEventListener(UI_ELEMENTS.VALIDATE_JSON, "click", () => this.validateJsonRules());
    this.safeAddEventListener(UI_ELEMENTS.REFRESH_RULES, "click", () => this.refreshRulesList());
    this.safeAddEventListener(UI_ELEMENTS.CLEAR_ALL_RULES, "click", () => this.clearAllRules());
    this.safeAddEventListener(UI_ELEMENTS.EXPORT_JSON_BTN, "click", () => this.exportJsonData());
    this.safeAddEventListener(UI_ELEMENTS.IMPORT_BTN, "click", () => this.triggerImport());
    this.safeAddEventListener(UI_ELEMENTS.LEGACY_IMPORT_BTN, "click", () => this.triggerLegacyImport());
    this.safeAddEventListener(UI_ELEMENTS.SAVE_COMMANDS_BTN, "click", () => this.saveCommandSettings());
    this.safeAddEventListener(UI_ELEMENTS.RESET_COMMANDS_BTN, "click", () => this.resetCommandSettings());
    this.safeAddEventListener(UI_ELEMENTS.RELOAD_BTN, "click", () => this.reloadPage());
    const fileInput = this.container.querySelector(`#${UI_ELEMENTS.FILE_INPUT}`);
    if (fileInput) {
      fileInput.addEventListener("change", (e) => {
        void this.handleFileImport(e);
      });
      window.logger?.debug("[CommentFilter2] File input event listener bound");
    } else {
      window.logger?.error("[CommentFilter2] File input element not found in shadow DOM");
    }
    const legacyFileInput = this.container.querySelector(`#${UI_ELEMENTS.LEGACY_FILE_INPUT}`);
    if (legacyFileInput) {
      legacyFileInput.addEventListener("change", (e) => {
        void this.handleLegacyFileImport(e);
      });
      window.logger?.debug("[CommentFilter2] Legacy file input event listener bound");
    } else {
      window.logger?.error("[CommentFilter2] Legacy file input element not found in shadow DOM");
    }
    this.setupDynamicEventHandlers();
    this.setupKeyPropagationPrevention();
    window.logger?.debug("[CommentFilter2] All event listeners bound successfully in shadow DOM");
  }
  /**
   * 安全なイベントリスナー追加（エラーハンドリング付き）
   */
  safeAddEventListener(elementId, eventType, handler) {
    if (!this.container) return;
    const element = this.container.querySelector(`#${elementId}`);
    if (element) {
      element.addEventListener(eventType, () => {
        try {
          const maybe = handler();
          if (maybe instanceof Promise) {
            void maybe.catch((error) => {
              window.logger?.error(`[CommentFilter2] Event handler error for ${elementId}:`, error);
            });
          }
        } catch (error) {
          window.logger?.error(`[CommentFilter2] Event handler error for ${elementId}:`, error);
        }
      });
      window.logger?.debug(`[CommentFilter2] Event listener bound for ${elementId}`);
    } else {
      window.logger?.error(`[CommentFilter2] Element not found: ${elementId}`);
    }
  }
  /**
   * キー伝搬停止処理を設定（ビデオプレイヤーのショートカットを防ぐ）
   */
  setupKeyPropagationPrevention() {
    if (!this.container) return;
    const nicoShortcutKeys = {
      // 特殊キー（常に無効化）
      " ": "スペースキー（再生/一時停止）",
      "ArrowLeft": "左矢印（10秒戻る）",
      "ArrowRight": "右矢印（10秒進める）",
      "ArrowUp": "上矢印（音量5%アップ）",
      "ArrowDown": "下矢印（音量5%ダウン）",
      "Home": "動画の先頭に移動",
      "End": "動画の最後に移動",
      // 文字キー（入力フィールド以外で無効化）
      "f": "フルスクリーンモード切替",
      "F": "フルスクリーンモード切替",
      "p": "プレーヤー位置に移動",
      "P": "プレーヤー位置に移動",
      "c": "コメント入力欄にフォーカス",
      "C": "コメント入力欄にフォーカス",
      "s": "画面サイズの変更",
      "S": "画面サイズの変更",
      "k": "動画の再生/停止",
      "K": "動画の再生/停止",
      "l": "動画を10秒進める",
      "L": "動画を10秒進める",
      "j": "動画を10秒戻す",
      "J": "動画を10秒戻す",
      "r": "リピート再生の有効/無効",
      "R": "リピート再生の有効/無効",
      "n": "次の動画へ移動",
      "N": "次の動画へ移動",
      "m": "ミュート/ミュート解除",
      "M": "ミュート/ミュート解除",
      "o": "コメント透過度の変更",
      "O": "コメント透過度の変更",
      ",": "再生速度を下げる",
      ".": "再生速度を上げる",
      "<": "再生速度を下げる",
      ">": "再生速度を上げる"
    };
    const specialKeys = [" ", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End", "Escape"];
    const isInputElement = (element) => {
      if (!element) return false;
      const tagName = element.tagName.toLowerCase();
      const inputType = element.type?.toLowerCase();
      return tagName === "input" && (inputType === "text" || inputType === "search" || inputType === "password" || inputType === "email" || inputType === "url") || tagName === "textarea" || element.contentEditable === "true";
    };
    const setupInputFieldProtection = (input) => {
      ["keydown", "keypress", "keyup"].forEach((eventType) => {
        input.addEventListener(eventType, (e) => {
          const keyEvent = e;
          window.logger?.debug(`[CommentFilter2] Input field key event: ${keyEvent.key} in ${input.tagName}`);
          keyEvent.stopPropagation();
          if (specialKeys.includes(keyEvent.key)) {
            keyEvent.preventDefault();
            window.logger?.debug(`[CommentFilter2] Special key prevented in input: ${keyEvent.key}`);
          }
        }, true);
      });
    };
    const globalKeyHandler = (e) => {
      const keyEvent = e;
      const target = keyEvent.target;
      if (isInputElement(target)) {
        return;
      }
      const isInOurShadowDOM = this.shadowRoot?.contains(target) || this.container?.contains(target);
      if (!isInOurShadowDOM) return;
      if (nicoShortcutKeys[keyEvent.key]) {
        if (!keyEvent.ctrlKey) {
          keyEvent.preventDefault();
          keyEvent.stopPropagation();
          window.logger?.debug(`[CommentFilter2] Nico shortcut prevented: ${keyEvent.key} (${nicoShortcutKeys[keyEvent.key]})`);
        }
      }
    };
    const inputSelectors = [
      'input[type="text"]',
      'input[type="search"]',
      'input[type="password"]',
      'input[type="email"]',
      'input[type="url"]',
      "textarea"
    ];
    inputSelectors.forEach((selector) => {
      const elements = this.container?.querySelectorAll(selector) || [];
      elements.forEach((element) => {
        if (element instanceof HTMLElement) {
          setupInputFieldProtection(element);
          window.logger?.debug(`[CommentFilter2] Protected input field: ${selector}`);
        }
      });
    });
    const specificInputs = [
      this.container?.querySelector(`#${UI_ELEMENTS.JSON_TEXTAREA}`),
      this.container?.querySelector(`#${UI_ELEMENTS.OWNER_COMMANDS}`),
      this.container?.querySelector(`#${UI_ELEMENTS.MAIN_COMMANDS}`),
      this.container?.querySelector(`#${UI_ELEMENTS.EASY_COMMANDS}`)
    ];
    specificInputs.forEach((input, index) => {
      if (input instanceof HTMLElement) {
        setupInputFieldProtection(input);
        window.logger?.debug(`[CommentFilter2] Protected specific input field ${index}`);
      }
    });
    if (this.shadowRoot) {
      this.shadowRoot.addEventListener("keydown", globalKeyHandler, true);
      this.shadowRoot.addEventListener("keypress", globalKeyHandler, true);
      window.logger?.debug("[CommentFilter2] Global key prevention set up in Shadow DOM");
    }
    if (this.container) {
      this.container.addEventListener("keydown", globalKeyHandler, true);
      this.container.addEventListener("keypress", globalKeyHandler, true);
      window.logger?.debug("[CommentFilter2] Global key prevention set up in container");
    }
    window.logger?.debug("[CommentFilter2] Universal key propagation prevention setup completed");
  }
  /**
   * 設定をロード
   */
  async loadSettings() {
    try {
      this.currentSettings = await this.storage.getSettings();
      this.filter.setDebugMode(this.currentSettings.debugMode);
      FilterLogger.setLogSendingEnabled(this.currentSettings.logToCommentFilterLogger ?? false);
    } catch (error) {
      window.logger?.error("[CommentFilter2] Failed to load settings:", error);
    }
  }
  /**
   * UIを現在の設定で更新
   */
  updateUI() {
    if (!this.container) return;
    const mainToggle = this.container.querySelector(`#${UI_ELEMENTS.MAIN_TOGGLE}`);
    if (mainToggle) {
      if (this.currentSettings.isEnabled) {
        mainToggle.classList.add(CSS_CLASSES.TOGGLE_ACTIVE);
      } else {
        mainToggle.classList.remove(CSS_CLASSES.TOGGLE_ACTIVE);
      }
    }
    const debugToggle = this.container.querySelector(`#${UI_ELEMENTS.DEBUG_TOGGLE}`);
    if (debugToggle) {
      if (this.currentSettings.debugMode) {
        debugToggle.classList.add(CSS_CLASSES.TOGGLE_ACTIVE);
      } else {
        debugToggle.classList.remove(CSS_CLASSES.TOGGLE_ACTIVE);
      }
    }
    const logToggle = this.container.querySelector(`#${UI_ELEMENTS.LOG_TOGGLE}`);
    if (logToggle) {
      if (this.currentSettings.logToCommentFilterLogger) {
        logToggle.classList.add(CSS_CLASSES.TOGGLE_ACTIVE);
      } else {
        logToggle.classList.remove(CSS_CLASSES.TOGGLE_ACTIVE);
      }
    }
    const debugSection = this.container.querySelector(`#${UI_ELEMENTS.DEBUG_SECTION}`);
    if (debugSection) {
      if (this.currentSettings.debugMode) {
        debugSection.classList.remove(CSS_CLASSES.COLLAPSED);
      } else {
        debugSection.classList.add(CSS_CLASSES.COLLAPSED);
      }
    }
    this.updateDebugInfo();
    this.updateCommandFields();
    this.updateStatus();
  }
  /**
   * コマンド設定のテキストフィールドを更新
   */
  updateCommandFields() {
    const forkTypes = ["owner", "main", "easy", "normal"];
    forkTypes.forEach((forkType) => {
      const input = this.container?.querySelector(`#${UI_ELEMENTS[`${forkType.toUpperCase()}_COMMANDS`]}`);
      if (input) {
        const commands = this.currentSettings.commandSettings[forkType];
        input.value = commands.length > 0 ? commands.join(",") : "";
      }
    });
  }
  /**
   * デバッグ情報を更新
   */
  updateDebugInfo() {
    if (!this.container) return;
    const debugInfo = this.container.querySelector(`#${UI_ELEMENTS.DEBUG_INFO}`);
    if (!debugInfo) return;
    if (this.currentSettings.debugMode) {
      const debugContent = `
        <div class="cf2-debug-item">
          <strong>フィルター状態:</strong> ${this.currentSettings.isEnabled ? "有効" : "無効"}
        </div>
        <div class="cf2-debug-item">
          <strong>デバッグモード:</strong> 有効
        </div>
        <div class="cf2-debug-item">
          <strong>ログ送信:</strong> ${this.currentSettings.logToCommentFilterLogger ? "有効" : "無効"}
        </div>
        <div class="cf2-debug-item">
          <strong>コマンド設定:</strong>
          <ul>
            <li>投稿者: ${this.currentSettings.commandSettings.owner.length}個のコマンド</li>
            <li>メイン: ${this.currentSettings.commandSettings.main.length}個のコマンド</li>
            <li>簡単: ${this.currentSettings.commandSettings.easy.length}個のコマンド</li>
          </ul>
        </div>
        <div class="cf2-debug-item">
          <strong>フィルター実行:</strong> コンソールログを確認してください
        </div>
      `;
      debugInfo.innerHTML = debugContent;
    } else {
      debugInfo.innerHTML = "デバッグモードが無効です";
    }
  }
  /**
   * コマンド設定を保存
   */
  async saveCommandSettings() {
    if (!this.container) return;
    try {
      const forkTypes = ["owner", "main", "easy", "normal"];
      const newCommandSettings = {
        owner: [],
        main: [],
        easy: [],
        normal: []
      };
      forkTypes.forEach((forkType) => {
        const input = this.container?.querySelector(`#${UI_ELEMENTS[`${forkType.toUpperCase()}_COMMANDS`]}`);
        if (input) {
          newCommandSettings[forkType] = this.parseCommandString(input.value);
        }
      });
      this.currentSettings.commandSettings = newCommandSettings;
      await this.storage.saveSettings(this.currentSettings);
      window.toastr?.success("コマンド設定を保存しました");
    } catch (error) {
      window.logger?.error("[CommentFilter2] Failed to save command settings:", error);
      window.toastr?.error("コマンド設定の保存に失敗しました");
    }
  }
  /**
   * カンマ区切りの文字列をコマンド配列にパース
   * 注意：コマンドはカンマを含まないため、単純分割で問題なし
   */
  parseCommandString(commandString) {
    if (!commandString.trim()) {
      return [];
    }
    const commands = commandString.split(",").map((cmd) => cmd.trim()).filter((cmd) => cmd.length > 0);
    return sanitizeCommentCommands(commands);
  }
  /**
   * コマンド設定をデフォルトに戻す
   */
  async resetCommandSettings() {
    if (!confirm("コマンド設定をデフォルトに戻しますか？")) {
      return;
    }
    try {
      this.currentSettings.commandSettings = {
        owner: ["big", "medium", "small", "defont", "gothic", "mincho", "ue", "naka", "shita", "white", "red", "pink", "orange", "yellow", "green", "cyan", "blue", "purple", "black", "white2", "red2", "pink2", "orange2", "yellow2", "green2", "cyan2", "blue2", "purple2", "black2", "_live", "invisible", "full", "ender", "patissier", "ca"],
        main: ["big", "medium", "small", "defont", "gothic", "mincho", "ue", "naka", "shita", "white", "red", "pink", "orange", "yellow", "green", "cyan", "blue", "purple", "black", "white2", "red2", "pink2", "orange2", "yellow2", "green2", "cyan2", "blue2", "purple2", "black2", "_live", "invisible", "full", "ender", "patissier", "ca"],
        easy: ["big", "medium", "small", "defont", "gothic", "mincho", "ue", "naka", "shita", "white", "red", "pink", "orange", "yellow", "green", "cyan", "blue", "purple", "black", "white2", "red2", "pink2", "orange2", "yellow2", "green2", "cyan2", "blue2", "purple2", "black2", "_live", "invisible", "full", "ender", "patissier", "ca"],
        normal: ["big", "medium", "small", "defont", "gothic", "mincho", "ue", "naka", "shita", "white", "red", "pink", "orange", "yellow", "green", "cyan", "blue", "purple", "black", "white2", "red2", "pink2", "orange2", "yellow2", "green2", "cyan2", "blue2", "purple2", "black2", "_live", "invisible", "full", "ender", "patissier", "ca"]
      };
      await this.storage.saveSettings(this.currentSettings);
      this.updateCommandFields();
      window.toastr?.success("コマンド設定をデフォルトに戻しました");
    } catch (error) {
      window.logger?.error("[CommentFilter2] Failed to reset command settings:", error);
      window.toastr?.error("コマンド設定のリセットに失敗しました");
    }
  }
  /**
   * ステータス表示を更新
   */
  updateStatus() {
    if (!this.container) return;
    const statusIndicator = this.container.querySelector(`#${UI_ELEMENTS.STATUS_INDICATOR}`);
    const statusText = this.container.querySelector(`#${UI_ELEMENTS.STATUS_TEXT}`);
    if (statusIndicator && statusText) {
      if (this.currentSettings.isEnabled) {
        statusIndicator.className = CSS_CLASSES.STATUS_ACTIVE;
        statusText.textContent = "フィルター有効";
      } else {
        statusIndicator.className = CSS_CLASSES.STATUS_ERROR;
        statusText.textContent = "フィルター無効";
      }
    }
  }
  /**
   * メインフィルターのON/OFF切り替え
   */
  async toggleMainFilter() {
    this.currentSettings.isEnabled = !this.currentSettings.isEnabled;
    await this.storage.saveSettings(this.currentSettings);
    const mainToggle = this.container?.querySelector(`#${UI_ELEMENTS.MAIN_TOGGLE}`);
    if (mainToggle) {
      if (this.currentSettings.isEnabled) {
        mainToggle.classList.add(CSS_CLASSES.TOGGLE_ACTIVE);
      } else {
        mainToggle.classList.remove(CSS_CLASSES.TOGGLE_ACTIVE);
      }
    }
    this.updateStatus();
    this.updateDebugInfo();
  }
  /**
   * デバッグモードの切り替え
   */
  async toggleDebugMode() {
    this.currentSettings.debugMode = !this.currentSettings.debugMode;
    this.filter.setDebugMode(this.currentSettings.debugMode);
    await this.storage.saveSettings(this.currentSettings);
    const debugToggle = this.container?.querySelector(`#${UI_ELEMENTS.DEBUG_TOGGLE}`);
    if (debugToggle) {
      if (this.currentSettings.debugMode) {
        debugToggle.classList.add(CSS_CLASSES.TOGGLE_ACTIVE);
      } else {
        debugToggle.classList.remove(CSS_CLASSES.TOGGLE_ACTIVE);
      }
    }
    const debugSection = this.container?.querySelector(`#${UI_ELEMENTS.DEBUG_SECTION}`);
    if (debugSection) {
      if (this.currentSettings.debugMode) {
        debugSection.classList.remove(CSS_CLASSES.COLLAPSED);
      } else {
        debugSection.classList.add(CSS_CLASSES.COLLAPSED);
      }
    }
    this.updateDebugInfo();
  }
  /**
   * ログ送信の切り替え
   */
  async toggleLogSending() {
    this.currentSettings.logToCommentFilterLogger = !this.currentSettings.logToCommentFilterLogger;
    await this.storage.saveSettings(this.currentSettings);
    const logToggle = this.container?.querySelector(`#${UI_ELEMENTS.LOG_TOGGLE}`);
    if (logToggle) {
      if (this.currentSettings.logToCommentFilterLogger) {
        logToggle.classList.add(CSS_CLASSES.TOGGLE_ACTIVE);
      } else {
        logToggle.classList.remove(CSS_CLASSES.TOGGLE_ACTIVE);
      }
    }
    if (this.currentSettings.logToCommentFilterLogger) {
      window.toastr?.success("フィルターログ送信を有効にしました");
    } else {
      window.toastr?.info("フィルターログ送信を無効にしました");
    }
  }
  /**
   * インポートをトリガー
   */
  triggerImport() {
    if (!this.container) return;
    const fileInput = this.container.querySelector(`#${UI_ELEMENTS.FILE_INPUT}`);
    if (fileInput) {
      fileInput.click();
    } else {
      window.logger?.error("[CommentFilter2] File input element not found in shadow DOM");
    }
  }
  /**
   * レガシーインポートをトリガー
   */
  triggerLegacyImport() {
    if (!this.container) return;
    const legacyFileInput = this.container.querySelector(`#${UI_ELEMENTS.LEGACY_FILE_INPUT}`);
    if (legacyFileInput) {
      legacyFileInput.click();
    } else {
      window.logger?.error("[CommentFilter2] Legacy file input element not found in shadow DOM");
    }
  }
  /**
   * ファイルインポートを処理
   */
  async handleFileImport(event) {
    const input = event.target;
    const file = input.files?.[0];
    if (!file) return;
    try {
      const text = await this.readFileAsText(file);
      await this.storage.importData(text);
      await this.loadSettings();
      this.updateUI();
      this.updateCommandFields();
      void this.refreshRulesList();
      if (this.currentFormat === "json") {
        await this.loadJsonRules();
      }
      const rules = await this.storage.getJsonRules();
      window.toastr?.success(`データをインポートしました（${String(rules.length)}個のルール）`);
    } catch (error) {
      window.logger?.error("[CommentFilter2] Import failed:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      if (errorMessage.includes("JSON")) {
        window.toastr?.error("ファイル形式が正しくありません。\nJSON形式のエクスポートファイルを選択してください。");
      } else {
        window.toastr?.error(`インポートに失敗しました：${errorMessage}`);
      }
    }
    input.value = "";
  }
  /**
   * レガシーファイルインポートを処理
   */
  async handleLegacyFileImport(event) {
    const input = event.target;
    const file = input.files?.[0];
    if (!file) return;
    try {
      const text = await this.readFileAsText(file);
      const confirmed = confirm(
        "CommentFilter（旧バージョン）の設定ファイルをインポートします。\n現在の設定は上書きされますが、よろしいですか？\n\n※変換処理により一部の設定が変更される場合があります。"
      );
      if (!confirmed) {
        input.value = "";
        return;
      }
      await this.storage.importData(text);
      await this.loadSettings();
      this.updateUI();
      this.updateCommandFields();
      void this.refreshRulesList();
      if (this.currentFormat === "json") {
        await this.loadJsonRules();
      }
      window.toastr?.success("レガシー設定を変換してインポートしました");
    } catch (error) {
      window.logger?.error("[CommentFilter2] Legacy import failed:", error);
      window.toastr?.error("レガシーインポートに失敗しました");
    }
    input.value = "";
  }
  /**
   * ファイルをテキストとして読み込み
   */
  readFileAsText(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => {
        const err = reader.error;
        if (err instanceof Error) {
          reject(err);
        } else if (err && typeof err.message === "string") {
          reject(new Error(err.message));
        } else {
          reject(new Error("File read error"));
        }
      };
      reader.readAsText(file);
    });
  }
  /**
   * メッセージを表示（レガシー関数 - 現在はToastrに置き換え済み）
   */
  showMessage(message, type) {
    window.logger?.debug(`[CommentFilter2] ${type.toUpperCase()}: ${message}`);
  }
  /**
   * ページを再読み込みして設定を適用
   */
  async reloadPage() {
    try {
      if (!confirm("ページを再読み込みして設定を適用しますか？\n\n※未保存の入力内容は失われます")) {
        return;
      }
      window.logger?.info("[CommentFilter2] Reloading page to apply settings...");
      await this.storage.saveSettings(this.currentSettings);
      setTimeout(() => {
        try {
          window.location.reload();
        } catch (e) {
          throw new Error(String(e));
        }
      }, 100);
    } catch (error) {
      window.logger?.error("[CommentFilter2] Failed to reload page:", error);
      window.toastr?.error("再読み込みに失敗しました");
    }
  }
  /**
   * UIを表示
   */
  async show() {
    if (!this.isUICreated) {
      await this.createUI();
    }
    if (this.container && this.backgroundOverlay) {
      this.backgroundOverlay.style.display = "block";
      this.container.style.display = "block";
      this.isVisible = true;
      window.logger?.debug("[CommentFilter2] UI shown with background blur");
    }
  }
  /**
   * UIを非表示
   */
  hide() {
    if (this.container) {
      this.container.style.display = "none";
    }
    if (this.backgroundOverlay) {
      this.backgroundOverlay.style.display = "none";
    }
    this.isVisible = false;
    window.logger?.debug("[CommentFilter2] UI hidden");
  }
  /**
   * UIの表示状態を切り替え
   */
  async toggle() {
    if (this.isVisible) {
      this.hide();
    } else {
      await this.show();
    }
  }
  /**
   * UIを削除
   */
  removeUI() {
    if (this.backgroundOverlay) {
      this.backgroundOverlay.remove();
      this.backgroundOverlay = null;
    }
    const shadowHost = document.getElementById("cf2-shadow-host");
    if (shadowHost) {
      shadowHost.remove();
    }
    this.container = null;
    this.shadowRoot = null;
    this.isUICreated = false;
    this.isVisible = false;
  }
  /**
   * フィルターを適用（JSON形式のみ）
   */
  async applyFilter(currentSmid) {
    if (!this.currentSettings.isEnabled) {
      return;
    }
    try {
      this.jsonFilter.updateSettings(this.currentSettings);
      const jsonRules = await this.storage.getJsonRules();
      await this.jsonFilter.applyFilters(jsonRules, currentSmid);
    } catch (error) {
      window.logger?.error("[CommentFilter2] Filter application failed:", error);
    }
  }
  /**
   * ユニークなファイル名を生成（エクスポート用）
   */
  generateExportFilename(prefix) {
    const now = /* @__PURE__ */ new Date();
    const dateStr = now.toISOString().split("T")[0];
    const timeStr = now.toTimeString().split(" ")[0].replace(/:/g, "-");
    const randomStr = Math.random().toString(36).substr(2, 4);
    return `${prefix}-${dateStr}_${timeStr}_${randomStr}.json`;
  }
  /**
   * 動的要素のイベントハンドラーを設定
   */
  setupDynamicEventHandlers() {
    if (!this.container) return;
    const ruleTypeRadios = this.container.querySelectorAll('input[name="cf2-rule-type"]');
    ruleTypeRadios.forEach((radio) => {
      radio.addEventListener("change", () => this.handleRuleTypeChange());
    });
    const actionTypeRadios = this.container.querySelectorAll('input[name="cf2-action-type"]');
    actionTypeRadios.forEach((radio) => {
      radio.addEventListener("change", () => this.handleActionTypeChange());
    });
  }
  /**
   * ルールタイプ変更ハンドラー
   */
  handleRuleTypeChange() {
    if (!this.container) return;
    const selectedType = this.container.querySelector('input[name="cf2-rule-type"]:checked');
    if (!selectedType) return;
    const regexInputs = this.container.querySelector("#cf2-regex-inputs");
    const userIdInputs = this.container.querySelector("#cf2-userid-inputs");
    const replaceActionLabel = this.container.querySelector("#cf2-replace-action-label");
    const userIdActionNote = this.container.querySelector("#cf2-userid-action-note");
    if (selectedType.value === "regex") {
      regexInputs?.classList.remove(CSS_CLASSES.HIDDEN);
      userIdInputs?.classList.add(CSS_CLASSES.HIDDEN);
      replaceActionLabel?.classList.remove(CSS_CLASSES.HIDDEN);
      userIdActionNote?.classList.add(CSS_CLASSES.HIDDEN);
    } else {
      regexInputs?.classList.add(CSS_CLASSES.HIDDEN);
      userIdInputs?.classList.remove(CSS_CLASSES.HIDDEN);
      replaceActionLabel?.classList.add(CSS_CLASSES.HIDDEN);
      userIdActionNote?.classList.remove(CSS_CLASSES.HIDDEN);
      const replaceRadio = this.container.querySelector('input[name="cf2-action-type"][value="replace"]');
      if (replaceRadio?.checked) {
        const hideRadio = this.container.querySelector('input[name="cf2-action-type"][value="hide"]');
        if (hideRadio) {
          hideRadio.checked = true;
          this.handleActionTypeChange();
        }
      }
    }
  }
  /**
   * アクションタイプ変更ハンドラー
   */
  handleActionTypeChange() {
    if (!this.container) return;
    const selectedAction = this.container.querySelector('input[name="cf2-action-type"]:checked');
    if (!selectedAction) return;
    const replaceInputGroup = this.container.querySelector("#cf2-replace-input-group");
    if (selectedAction.value === "replace") {
      replaceInputGroup?.classList.remove(CSS_CLASSES.HIDDEN);
    } else {
      replaceInputGroup?.classList.add(CSS_CLASSES.HIDDEN);
    }
  }
  /**
   * 形式切替
   */
  switchFormat(format) {
    this.currentFormat = format;
    this.updateFormatDisplay();
  }
  /**
   * 形式表示を更新
   */
  updateFormatDisplay() {
    if (!this.container) return;
    const tabs = this.container.querySelectorAll(".cf2-format-tab");
    tabs.forEach((tab) => {
      tab.classList.remove(CSS_CLASSES.TOGGLE_ACTIVE);
    });
    const formSection = this.container.querySelector(`#${UI_ELEMENTS.FORM_SECTION}`);
    const jsonSection = this.container.querySelector(`#${UI_ELEMENTS.JSON_SECTION}`);
    formSection?.classList.add(CSS_CLASSES.HIDDEN);
    jsonSection?.classList.add(CSS_CLASSES.HIDDEN);
    switch (this.currentFormat) {
      case "form":
        this.container.querySelector(`#${UI_ELEMENTS.FORMAT_FORM}`)?.classList.add(CSS_CLASSES.TOGGLE_ACTIVE);
        formSection?.classList.remove(CSS_CLASSES.HIDDEN);
        break;
      case "json":
        this.container.querySelector(`#${UI_ELEMENTS.FORMAT_JSON}`)?.classList.add(CSS_CLASSES.TOGGLE_ACTIVE);
        jsonSection?.classList.remove(CSS_CLASSES.HIDDEN);
        void this.loadJsonRules();
        break;
    }
  }
  /**
   * フォームからルールを追加
   */
  async addRuleFromForm() {
    if (!this.container) return;
    try {
      const rule = this.collectRuleFromForm();
      if (!rule) {
        window.toastr?.error("ルールの入力内容に不備があります");
        return;
      }
      const existingRules = await this.storage.getJsonRules();
      existingRules.push(rule);
      await this.storage.saveJsonRules(existingRules);
      this.clearForm();
      await this.refreshRulesList();
      window.toastr?.success("ルールを追加しました");
    } catch (error) {
      window.logger?.error("[CommentFilter2] Failed to add rule from form:", error);
      window.toastr?.error("ルールの追加に失敗しました");
    }
  }
  /**
   * フォームからルール情報を収集
   */
  collectRuleFromForm() {
    if (!this.container) return null;
    const ruleType = this.container.querySelector('input[name="cf2-rule-type"]:checked')?.value;
    const actionType = this.container.querySelector('input[name="cf2-action-type"]:checked')?.value;
    if (!ruleType || !actionType) return null;
    const rule = {
      enabled: true
    };
    if (ruleType === "regex") {
      const pattern = this.container.querySelector(`#${UI_ELEMENTS.PATTERN_INPUT}`)?.value?.trim();
      const flags = this.container.querySelector(`#${UI_ELEMENTS.FLAGS_INPUT}`)?.value?.trim() || "gi";
      if (!pattern) return null;
      rule.pattern = pattern;
      rule.flags = flags;
    } else {
      const userId = this.container.querySelector(`#${UI_ELEMENTS.USERID_INPUT}`)?.value?.trim();
      if (!userId) return null;
      rule.userId = userId;
    }
    if (actionType === "hide") {
      rule.action = { type: "hide" };
    } else if (actionType === "replace") {
      const replacement = this.container.querySelector(`#${UI_ELEMENTS.REPLACE_INPUT}`)?.value?.trim();
      rule.action = { type: "replace", replacement: replacement || "" };
    } else {
      rule.action = { type: "unspecified" };
    }
    const smidInput = this.container.querySelector(`#${UI_ELEMENTS.SMID_INPUT}`)?.value?.trim() || "ALL";
    rule.smid = smidInput === "ALL" ? ["ALL"] : [smidInput];
    const nicoruToggle = this.container.querySelector(`#${UI_ELEMENTS.NICORU_TOGGLE}`);
    if (nicoruToggle?.classList.contains(CSS_CLASSES.TOGGLE_ACTIVE)) {
      const op = this.container.querySelector(`#${UI_ELEMENTS.NICORU_OP}`)?.value;
      const value = parseInt(this.container.querySelector(`#${UI_ELEMENTS.NICORU_VALUE}`)?.value || "0", 10);
      const mode = this.container.querySelector(`#${UI_ELEMENTS.NICORU_MODE}`)?.value;
      if (op) {
        rule.nicoru_cond = {
          op,
          value,
          mode
        };
      }
    }
    return rule;
  }
  /**
   * フォームをクリア
   */
  clearForm() {
    if (!this.container) return;
    this.container.querySelector(`#${UI_ELEMENTS.PATTERN_INPUT}`).value = "";
    this.container.querySelector(`#${UI_ELEMENTS.FLAGS_INPUT}`).value = "gi";
    this.container.querySelector(`#${UI_ELEMENTS.USERID_INPUT}`).value = "";
    this.container.querySelector(`#${UI_ELEMENTS.REPLACE_INPUT}`).value = "";
    this.container.querySelector(`#${UI_ELEMENTS.SMID_INPUT}`).value = "ALL";
    this.container.querySelector(`#${UI_ELEMENTS.NICORU_VALUE}`).value = "10";
    this.container.querySelector('input[name="cf2-rule-type"][value="regex"]').checked = true;
    this.container.querySelector('input[name="cf2-action-type"][value="hide"]').checked = true;
    const nicoruToggle = this.container.querySelector(`#${UI_ELEMENTS.NICORU_TOGGLE}`);
    nicoruToggle?.classList.remove(CSS_CLASSES.TOGGLE_ACTIVE);
    this.container.querySelector("#cf2-nicoru-details")?.classList.add(CSS_CLASSES.HIDDEN);
    this.handleRuleTypeChange();
    this.handleActionTypeChange();
  }
  /**
   * ニコる数設定の表示切替
   */
  toggleNicoruSettings() {
    if (!this.container) return;
    const toggle = this.container.querySelector(`#${UI_ELEMENTS.NICORU_TOGGLE}`);
    const details = this.container.querySelector("#cf2-nicoru-details");
    if (toggle?.classList.contains(CSS_CLASSES.TOGGLE_ACTIVE)) {
      toggle.classList.remove(CSS_CLASSES.TOGGLE_ACTIVE);
      details?.classList.add(CSS_CLASSES.HIDDEN);
    } else {
      toggle?.classList.add(CSS_CLASSES.TOGGLE_ACTIVE);
      details?.classList.remove(CSS_CLASSES.HIDDEN);
    }
  }
  /**
   * JSONルールを保存
   */
  async saveJsonRules() {
    if (!this.container) return;
    try {
      const textarea = this.container.querySelector(`#${UI_ELEMENTS.JSON_TEXTAREA}`);
      const jsonText = textarea instanceof HTMLTextAreaElement ? textarea.value.trim() : "";
      if (!jsonText) {
        await this.storage.saveJsonRules([]);
        window.toastr?.success("ルールをクリアしました");
        await this.refreshRulesList();
        return;
      }
      const rules = parseJsonl(jsonText);
      await this.storage.saveJsonRules(rules);
      window.toastr?.success(`${String(rules.length)}個のJSONルールを保存しました`);
      await this.refreshRulesList();
    } catch (error) {
      window.logger?.error("[CommentFilter2] Failed to save JSON rules:", error);
      window.toastr?.error("JSONルールの保存に失敗しました");
    }
  }
  /**
   * JSONルールを検証
   */
  validateJsonRules() {
    if (!this.container) return;
    try {
      const textarea2 = this.container.querySelector(`#${UI_ELEMENTS.JSON_TEXTAREA}`);
      const jsonText = textarea2 instanceof HTMLTextAreaElement ? textarea2.value.trim() : "";
      if (!jsonText) {
        window.toastr?.info("検証するJSONがありません");
        return;
      }
      const rules = parseJsonl(jsonText);
      window.toastr?.success(`✅ JSON形式が正しく、${rules.length}個のルールが有効です`);
    } catch (error) {
      window.toastr?.error(`❌ JSON形式エラー: ${String(error)}`);
    }
  }
  /**
   * JSONルールをロード
   */
  async loadJsonRules() {
    if (!this.container) return;
    try {
      const rules = await this.storage.getJsonRules();
      const jsonText = stringifyJsonl(rules);
      const textarea = this.container.querySelector(`#${UI_ELEMENTS.JSON_TEXTAREA}`);
      textarea.value = jsonText;
    } catch (error) {
      window.logger?.error("[CommentFilter2] Failed to load JSON rules:", error);
    }
  }
  /**
   * ルール一覧を更新
   */
  async refreshRulesList() {
    if (!this.container) return;
    try {
      const rules = await this.storage.getJsonRules();
      const rulesList = this.container.querySelector(`#${UI_ELEMENTS.RULES_LIST}`);
      const countText = this.container.querySelector(`#${UI_ELEMENTS.RULE_COUNT_TEXT}`);
      if (countText) {
        countText.textContent = `${String(rules.length)}件`;
      }
      if (!rulesList) return;
      if (rules.length === 0) {
        rulesList.innerHTML = '<div class="cf2-help-text">ルールがありません</div>';
        return;
      }
      const rulesHtml = rules.map((rule, index) => this.generateRuleItemHtml(rule, index)).join("");
      rulesList.innerHTML = rulesHtml;
      rulesList.querySelectorAll(".cf2-rule-delete").forEach((btn, index) => {
        btn.addEventListener("click", () => {
          void this.deleteRule(index);
        });
      });
    } catch (error) {
      window.logger?.error("[CommentFilter2] Failed to refresh rules list:", error);
    }
  }
  /**
   * HTMLエスケープ関数
   */
  escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }
  /**
   * ルールアイテムのHTMLを生成
   */
  generateRuleItemHtml(rule, index) {
    const ruleType = rule.pattern ? "regex" : "userId";
    const content = rule.pattern || rule.userId || "";
    let actionText;
    if (rule.action.type === "hide") {
      actionText = "非表示";
    } else if (rule.action.type === "replace") {
      const repl = rule.action.replacement;
      actionText = `置換: ${this.escapeHtml(repl)}`;
    } else {
      actionText = "除外のみ";
    }
    const smidText = rule.smid.join(", ");
    const nicoruText = rule.nicoru_cond ? `${rule.nicoru_cond.op} ${String(rule.nicoru_cond.value)} (${rule.nicoru_cond.mode})` : "条件なし";
    return `
      <div class="cf2-rule-item">
        <div class="cf2-rule-header">
          <span class="cf2-rule-type">${ruleType === "regex" ? "正規表現" : "ユーザーID"}</span>
          <div class="cf2-rule-actions">
            <button class="cf2-button cf2-button-small cf2-button-danger cf2-rule-delete" data-index="${index}">
              削除
            </button>
          </div>
        </div>
        <div class="cf2-rule-content">${this.escapeHtml(content)}</div>
        <div class="cf2-rule-details">
          アクション: ${actionText} | SMID: ${smidText} | ニコる: ${nicoruText}
        </div>
      </div>
    `;
  }
  /**
   * ルールを削除
   */
  async deleteRule(index) {
    try {
      const rules = await this.storage.getJsonRules();
      rules.splice(index, 1);
      await this.storage.saveJsonRules(rules);
      await this.refreshRulesList();
      window.toastr?.success("ルールを削除しました");
    } catch (error) {
      window.logger?.error("[CommentFilter2] Failed to delete rule:", error);
      window.toastr?.error("ルールの削除に失敗しました");
    }
  }
  /**
   * 全ルールを削除
   */
  async clearAllRules() {
    if (!confirm("すべてのルールを削除しますか？")) {
      return;
    }
    try {
      await this.storage.saveJsonRules([]);
      await this.refreshRulesList();
      window.toastr?.success("すべてのルールを削除しました");
    } catch (error) {
      window.logger?.error("[CommentFilter2] Failed to clear all rules:", error);
      window.toastr?.error("ルールの削除に失敗しました");
    }
  }
  /**
   * データをエクスポート
   */
  async exportJsonData() {
    try {
      const jsonData = await this.storage.exportJsonData();
      const blob = new Blob([jsonData], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = this.generateExportFilename("comment-filter2-rules");
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      window.toastr?.success("データをエクスポートしました");
    } catch (error) {
      window.logger?.error("[CommentFilter2] Export failed:", error);
      window.toastr?.error("エクスポートに失敗しました");
    }
  }
  /**
   * リソースを解放
   */
  destroy() {
    this.removeUI();
    this.storage.close();
  }
}

class VideoPlayerBridge {
  // forceSync用デバウンスタイマー
  constructor() {
    this.isVideoPlayerDetected = false;
    this.hasSuccessfullyNotified = false;
    this.lastNotifiedSmid = null;
    this.mutationObserver = null;
    this.lastDataHash = "";
    // データの差分検知用
    this.lastNotificationTime = 0;
    // 最後の通知時刻
    this.backoffDelay = 1e3;
    // バックオフ遅延（初期値1秒）
    this.maxBackoffDelay = 32e3;
    // 最大バックオフ遅延（32秒）
    this.retryTimeoutId = null;
    this.forceSyncDebounceId = null;
    this.initialize();
  }
  /**
   * Singleton インスタンスを取得
   */
  static getInstance() {
    if (window.__CF2_BRIDGE__) {
      window.logger?.info("[CommentFilter2] VideoPlayerBridge already exists, returning existing instance");
      return window.__CF2_BRIDGE__;
    }
    const instance = new VideoPlayerBridge();
    window.__CF2_BRIDGE__ = instance;
    return instance;
  }
  /**
   * 連携の初期化
   */
  initialize() {
    this.startVideoPlayerDetection();
  }
  resolveCurrentSmid(globalData) {
    const smid = globalData?.currentSmid;
    if (typeof smid === "string" && smid.trim().length > 0) {
      return smid;
    }
    const href = window.location.href;
    const watchMatch = href.match(/\/watch\/([a-z]{2}\d+)/i);
    if (watchMatch) {
      return watchMatch[1].toLowerCase();
    }
    const genericMatch = href.match(/([a-z]{2}\d+)/i);
    return genericMatch ? genericMatch[1].toLowerCase() : "";
  }
  /**
   * video_playerの検知を開始（MutationObserver使用でパフォーマンス向上）
   */
  startVideoPlayerDetection() {
    this.checkVideoPlayerStatus();
    if (typeof MutationObserver !== "undefined") {
      this.mutationObserver = new MutationObserver((mutations) => {
        let shouldCheck = false;
        mutations.forEach((mutation) => {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node;
              if (element.id === "video-element" || element.querySelector?.("#video-element")) {
                shouldCheck = true;
              }
            }
          });
          mutation.removedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node;
              if (element.id === "video-element" || element.querySelector?.("#video-element")) {
                shouldCheck = true;
              }
            }
          });
        });
        if (shouldCheck) {
          this.checkVideoPlayerStatus();
        }
      });
      this.mutationObserver.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: false,
        characterData: false
      });
      window.logger?.debug("[CommentFilter2] Using optimized MutationObserver for video_player detection");
    } else {
      setTimeout(() => this.checkVideoPlayerStatus(), 1e3);
      window.logger?.info("[CommentFilter2] Using timeout fallback for video_player detection");
    }
  }
  /**
   * video_playerの状態をチェック
   */
  checkVideoPlayerStatus() {
    const videoElement = document.getElementById("video-element");
    if (videoElement && !this.isVideoPlayerDetected) {
      this.isVideoPlayerDetected = true;
      this.setupVideoPlayerIntegration();
      window.logger?.info("[CommentFilter2] video_player detected and integrated");
    } else if (!videoElement && this.isVideoPlayerDetected) {
      this.isVideoPlayerDetected = false;
      this.resetNotificationState();
      window.logger?.info("[CommentFilter2] video_player connection lost");
    }
  }
  /**
   * 通知状態をリセット
   */
  resetNotificationState() {
    this.hasSuccessfullyNotified = false;
    this.lastNotifiedSmid = null;
    this.lastDataHash = "";
    this.backoffDelay = 1e3;
    this.lastNotificationTime = 0;
    if (this.retryTimeoutId !== null) {
      clearTimeout(this.retryTimeoutId);
      this.retryTimeoutId = null;
      window.logger?.debug("[CommentFilter2] Retry timer cleared");
    }
  }
  /**
   * video_playerとの統合を設定
   */
  setupVideoPlayerIntegration() {
    try {
      this.hookCommentRetrieval();
      this.startDataMonitoring();
    } catch (error) {
      window.logger?.error("[CommentFilter2] Failed to setup video_player integration:", error);
    }
  }
  /**
   * video_playerのコメント取得処理をフック
   */
  hookCommentRetrieval() {
    if (window.videoPlayer && typeof window.videoPlayer.getComments === "function") {
      const originalGetComments = window.videoPlayer.getComments.bind(window.videoPlayer);
      window.videoPlayer.getComments = (...args) => {
        const globalData = this.getGlobalData();
        if (globalData?.filteredData) {
          return this.adaptDataForVideoPlayer(globalData.filteredData);
        }
        return originalGetComments(...args);
      };
    }
  }
  /**
   * データ監視を完全停止
   */
  stopMonitoring() {
    if (this.retryTimeoutId !== null) {
      clearTimeout(this.retryTimeoutId);
      this.retryTimeoutId = null;
      window.logger?.debug("[CommentFilter2] Monitoring stopped - retry timer cleared");
    }
  }
  /**
   * データ監視を開始（バックオフ付き）
   */
  startDataMonitoring() {
    if (this.hasSuccessfullyNotified || this.retryTimeoutId !== null) {
      window.logger?.debug("[CommentFilter2] Monitoring already active or completed, skipping start");
      return;
    }
    const checkGlobalData = () => {
      const globalData = this.getGlobalData();
      if (!globalData || !this.isVideoPlayerDetected) {
        return;
      }
      if (globalData.filteredData) {
        const currentSmid = this.resolveCurrentSmid(globalData);
        if (this.lastNotifiedSmid !== null && this.lastNotifiedSmid !== currentSmid) {
          this.hasSuccessfullyNotified = false;
          this.lastDataHash = "";
          window.logger?.debug("[CommentFilter2] New video detected, resetting notification state");
        }
        if (!this.hasSuccessfullyNotified) {
          const success = this.notifyVideoPlayerWithDiffCheck(globalData.filteredData);
          if (success) {
            this.hasSuccessfullyNotified = true;
            this.lastNotifiedSmid = currentSmid;
            this.backoffDelay = 1e3;
            this.stopMonitoring();
            window.logger?.info("[CommentFilter2] Data transfer successful, monitoring stopped");
            return;
          }
        }
      }
      if (!this.hasSuccessfullyNotified && this.isVideoPlayerDetected) {
        this.retryTimeoutId = window.setTimeout(() => {
          checkGlobalData();
          this.backoffDelay = Math.min(this.backoffDelay * 2, this.maxBackoffDelay);
        }, this.backoffDelay);
        window.logger?.debug(`[CommentFilter2] Retrying in ${this.backoffDelay}ms`);
      }
    };
    checkGlobalData();
  }
  /**
   * 差分検知付きでvideo_playerにフィルタリング済みデータを通知
   */
  notifyVideoPlayerWithDiffCheck(filteredData, skipRateLimit = false) {
    try {
      const globalData = this.getGlobalData();
      const smid = this.resolveCurrentSmid(globalData);
      const dataString = JSON.stringify({
        smid,
        threadCount: filteredData.data?.threads?.length || 0,
        commentCount: filteredData.data?.threads?.reduce((sum, thread) => sum + (thread.comments?.length || 0), 0) || 0,
        lastUpdated: globalData?.lastUpdated || 0
      });
      const currentHash = this.simpleHash(dataString);
      if (currentHash === this.lastDataHash) {
        window.logger?.debug("[CommentFilter2] Data unchanged, skipping notification");
        return true;
      }
      const now = Date.now();
      if (!skipRateLimit && now - this.lastNotificationTime < 1e3) {
        window.logger?.debug("[CommentFilter2] Rate limited, deferring notification");
        return false;
      }
      const eventDetail = {
        filteredData: this.adaptDataForVideoPlayer(filteredData),
        timestamp: now
      };
      const event = new CustomEvent("commentFilter2Update", {
        detail: eventDetail
      });
      const videoElement = document.getElementById("video-element");
      if (videoElement) {
        videoElement.dispatchEvent(event);
        this.lastDataHash = currentHash;
        this.lastNotificationTime = now;
        window.logger?.info("[CommentFilter2] Successfully notified video_player with filtered data");
        return true;
      }
      return false;
    } catch (error) {
      window.logger?.error("[CommentFilter2] Failed to notify video_player:", error);
      return false;
    }
  }
  /**
   * 簡易ハッシュ関数
   */
  simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return hash.toString();
  }
  /**
   * データをvideo_player形式に適合させる
   */
  adaptDataForVideoPlayer(apiResponse) {
    try {
      const adaptedData = {
        meta: apiResponse.meta,
        data: {
          ...apiResponse.data,
          threads: apiResponse.data.threads.map((thread) => ({
            ...thread,
            comments: thread.comments.map((comment) => ({
              vpos: Math.floor(comment.vposMs / 10),
              // ミリ秒から1/100秒単位に変換
              vposMs: comment.vposMs,
              body: comment.body,
              userId: comment.userId,
              premium: comment.isPremium,
              isPremium: comment.isPremium,
              // その他のプロパティも引き継ぐ
              ...comment.id !== void 0 && { id: comment.id },
              ...comment.no !== void 0 && { no: comment.no },
              ...comment.commands !== void 0 && { commands: comment.commands },
              ...comment.score !== void 0 && { score: comment.score },
              ...comment.postedAt !== void 0 && { postedAt: comment.postedAt },
              ...comment.nicoruCount !== void 0 && { nicoruCount: comment.nicoruCount },
              ...comment.nicoruId !== void 0 && { nicoruId: comment.nicoruId },
              ...comment.source !== void 0 && { source: comment.source },
              ...comment.isMyPost !== void 0 && { isMyPost: comment.isMyPost }
            }))
          }))
        }
      };
      return adaptedData;
    } catch (error) {
      window.logger?.error("[CommentFilter2] Data adaptation failed:", error);
      return {
        meta: apiResponse.meta,
        data: {
          threads: []
        }
      };
    }
  }
  /**
   * グローバルデータを取得
   */
  getGlobalData() {
    const data = window[CONSTANTS.GLOBAL_DATA_KEY];
    if (data && typeof data === "object" && "originalData" in data && "filteredData" in data && "currentSmid" in data && "lastUpdated" in data) {
      return data;
    }
    return null;
  }
  /**
   * video_playerとの連携を手動で再実行（デバウンス付き）
   */
  forceSync() {
    if (this.forceSyncDebounceId !== null) {
      clearTimeout(this.forceSyncDebounceId);
    }
    this.forceSyncDebounceId = window.setTimeout(() => {
      this.forceSyncDebounceId = null;
      this.executeForceSyncInternal();
    }, 100);
  }
  /**
   * 内部的なforceSync実行
   */
  executeForceSyncInternal() {
    if (this.hasSuccessfullyNotified) {
      window.logger?.debug("[CommentFilter2] Already successfully notified, skipping force sync");
      return;
    }
    if (!this.isVideoPlayerDetected) {
      window.logger?.warn("[CommentFilter2] video_player not detected, cannot sync");
      return;
    }
    this.resetNotificationState();
    const globalData = this.getGlobalData();
    if (globalData?.filteredData) {
      const success = this.notifyVideoPlayerWithDiffCheck(globalData.filteredData, true);
      if (success) {
        this.hasSuccessfullyNotified = true;
        this.lastNotifiedSmid = this.resolveCurrentSmid(globalData);
        this.stopMonitoring();
        window.logger?.info("[CommentFilter2] Force sync completed successfully");
      } else {
        this.startDataMonitoring();
        window.logger?.warn("[CommentFilter2] Force sync failed, restarting monitoring");
      }
    } else {
      window.logger?.warn("[CommentFilter2] No filtered data available for force sync");
    }
  }
  /**
   * 連携状態を取得
   */
  getStatus() {
    const globalData = this.getGlobalData();
    return {
      isVideoPlayerDetected: this.isVideoPlayerDetected,
      hasFilteredData: !!globalData?.filteredData,
      lastSync: globalData?.lastUpdated || null,
      hasSuccessfullyNotified: this.hasSuccessfullyNotified,
      lastNotifiedSmid: this.lastNotifiedSmid
    };
  }
  /**
   * リソースを解放
   */
  destroy() {
    if (this.retryTimeoutId !== null) {
      clearTimeout(this.retryTimeoutId);
      this.retryTimeoutId = null;
    }
    if (this.forceSyncDebounceId !== null) {
      clearTimeout(this.forceSyncDebounceId);
      this.forceSyncDebounceId = null;
    }
    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
      this.mutationObserver = null;
    }
    this.isVideoPlayerDetected = false;
    this.resetNotificationState();
    if (window.__CF2_BRIDGE__ === this) {
      delete window.__CF2_BRIDGE__;
    }
    window.logger?.info("[CommentFilter2] VideoPlayerBridge destroyed and resources cleaned up");
  }
}

class CommentFilter2 {
  constructor() {
    this.isInitialized = false;
    this.keyboardShortcutEnabled = true;
    this.dataInterceptor = new DataInterceptor();
    this.uiManager = new UIManager();
    this.videoPlayerBridge = new VideoPlayerBridge();
    void this.initialize();
  }
  /**
   * CommentFilter2の初期化
   */
  async initialize() {
    await Promise.resolve();
    try {
      this.setupKeyboardShortcuts();
      this.startDataMonitoring();
      this.isInitialized = true;
      window.logger?.info("[CommentFilter2] Initialization completed successfully");
    } catch (error) {
      window.logger?.error("[CommentFilter2] Initialization failed:", error);
    }
  }
  /**
   * キーボードショートカットを設定
   */
  setupKeyboardShortcuts() {
    if (!this.keyboardShortcutEnabled) return;
    document.addEventListener("keydown", (event) => {
      if (event.ctrlKey && event.shiftKey && event.key === "F") {
        event.preventDefault();
        void this.toggleUI();
        window.logger?.debug("[CommentFilter2] UI toggled via keyboard shortcut");
      }
    });
  }
  /**
   * データの変更を監視してフィルターを適用
   */
  startDataMonitoring() {
    void this.processCommentData();
    window.addEventListener(CONSTANTS.EVENTS.DATA_UPDATED, () => {
      window.logger?.debug("[CommentFilter2] Processing comment data due to DATA_UPDATED event");
      void this.processCommentData();
    });
    window.addEventListener(CONSTANTS.EVENTS.SMID_CHANGED, (event) => {
      const customEvent = event;
      const detail = customEvent.detail ?? {};
      const smid = typeof detail.smid === "string" ? detail.smid : "";
      window.logger?.debug(`[CommentFilter2] Processing comment data due to SMID change: ${smid}`);
      void this.processCommentData();
    });
    window.logger?.info("[CommentFilter2] Event-driven data monitoring initialized");
  }
  /**
   * コメントデータの処理
   */
  /**
   * 共通ヘルパー経由でSMID（動画ID）を抽出
   */
  extractSmidFromLocation() {
    try {
      if (typeof window.commonHelper?.getVideoIdWithFallback === "function") {
        return window.commonHelper.getVideoIdWithFallback(window.location.href);
      }
      window.logger?.warn("[CommentFilter2] commonHelper.getVideoIdWithFallbackが未定義です");
      return null;
    } catch (error) {
      window.logger?.warn("[CommentFilter2] Failed to extract SMID via commonHelper:", error);
      return null;
    }
  }
  async processCommentData() {
    await Promise.resolve();
    try {
      const globalData = DataInterceptor.getGlobalData();
      const fallbackSmid = this.extractSmidFromLocation();
      const smid = globalData?.currentSmid ?? fallbackSmid;
      if (globalData?.originalData && smid) {
        await this.uiManager.applyFilter(smid);
        this.videoPlayerBridge.forceSync();
      }
    } catch (error) {
      window.logger?.error("[CommentFilter2] Comment data processing failed:", error);
    }
  }
  /**
   * UIを表示
   */
  async showUI() {
    await this.uiManager.show();
  }
  /**
   * UIを非表示
   */
  hideUI() {
    this.uiManager.hide();
  }
  /**
   * UIの表示状態を切り替え
   */
  async toggleUI() {
    await this.uiManager.toggle();
  }
  /**
   * video_playerとの連携状態を取得
   */
  getVideoPlayerStatus() {
    return this.videoPlayerBridge.getStatus();
  }
  /**
   * キーボードショートカットの有効/無効を切り替え
   */
  setKeyboardShortcutEnabled(enabled) {
    this.keyboardShortcutEnabled = enabled;
  }
  /**
   * 初期化状態を取得
   */
  isReady() {
    return this.isInitialized;
  }
  /**
   * CommentFilter2を完全に無効化
   */
  destroy() {
    try {
      this.dataInterceptor.disable();
      this.uiManager.destroy();
      this.videoPlayerBridge.destroy();
      this.isInitialized = false;
      window.logger?.info("[CommentFilter2] Destroyed successfully");
    } catch (error) {
      window.logger?.error("[CommentFilter2] Destruction failed:", error);
    }
  }
  /**
   * デバッグ情報を取得
   */
  getDebugInfo() {
    const globalData = DataInterceptor.getGlobalData();
    const videoPlayerStatus = this.videoPlayerBridge.getStatus();
    return {
      isInitialized: this.isInitialized,
      keyboardShortcutEnabled: this.keyboardShortcutEnabled,
      globalData: {
        hasOriginalData: !!globalData?.originalData,
        hasFilteredData: !!globalData?.filteredData,
        currentSmid: globalData?.currentSmid ?? null,
        lastUpdated: globalData?.lastUpdated ?? null
      },
      videoPlayer: videoPlayerStatus,
      constants: CONSTANTS
    };
  }
}
let commentFilter2Instance = null;
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    initializeCommentFilter2();
  });
} else {
  initializeCommentFilter2();
}
function initializeCommentFilter2() {
  try {
    commentFilter2Instance = new CommentFilter2();
    window.CommentFilter2Instance = commentFilter2Instance;
    window.dispatchEvent(new CustomEvent("CommentFilter2Ready"));
    window.logger?.info("[CommentFilter2] Auto-initialization completed");
    window.logger?.info("[CommentFilter2] Use Ctrl+Shift+F to toggle UI or call via mlink-video-controller");
    window.logger?.info("[CommentFilter2] Access via window.CommentFilter2Instance for debugging");
  } catch (error) {
    window.logger?.error("[CommentFilter2] Auto-initialization failed:", error);
  }
}

async function applyFiltersToData(data, smid) {
  try {
    const storage = new (await Promise.resolve().then(() => indexedDb)).FilterStorage();
    await storage.initialize();
    const [settings, jsonRules] = await Promise.all([
      storage.getSettings(),
      storage.getJsonRules()
    ]);
    if (!settings.isEnabled) {
      return data;
    }
    const { JsonCommentFilter } = await Promise.resolve().then(() => jsonCommentFilter);
    const jsonFilter = new JsonCommentFilter(settings.debugMode);
    jsonFilter.updateSettings(settings);
    return await jsonFilter.applyFilters(jsonRules, smid) || data;
  } catch (error) {
    window.logger?.error("[CommentFilter2] Filter application failed:", error);
    return data;
  }
}

const filterHelper = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  applyFiltersToData
}, Symbol.toStringTag, { value: 'Module' }));

export { CommentFilter2, CommentFilter2 as default };
//# sourceMappingURL=comment-filter2.es.js.map
