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
    void this.updateCurrentSmid();
  }
  /**
   * SPA ナビゲーション対応セットアップ
   */
  setupSPANavigation() {
    history.pushState = (...args) => {
      this.originalPushState(...args);
      setTimeout(() => void this.updateCurrentSmid(), 0);
    };
    history.replaceState = (...args) => {
      this.originalReplaceState(...args);
      setTimeout(() => void this.updateCurrentSmid(), 0);
    };
    window.addEventListener("popstate", () => {
      setTimeout(() => void this.updateCurrentSmid(), 0);
    });
    window.logger?.debug("[CommentFilter2] SPA navigation hooks initialized");
  }
  /**
   * 現在のSMIDを更新
   */
  async updateCurrentSmid() {
    const newSmid = await this.extractSmidFromCurrentUrl();
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
  async extractSmidFromCurrentUrl() {
    try {
      const smid = await window.commonHelper?.getVideoIdWithFallback?.(window.location);
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
      const smid = await this.extractSmidFromUrl(url);
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
  async extractSmidFromUrl(url) {
    try {
      if (this.currentSmid) {
        window.logger?.debug(`[CommentFilter2] Using cached SMID: ${this.currentSmid}`);
        return this.currentSmid;
      }
      if (typeof window.commonHelper?.getVideoIdWithFallback === "function") {
        const smid = await window.commonHelper.getVideoIdWithFallback(url);
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

class AhoCorasickMachine {
  constructor() {
    this.nodes = [];
    this.built = false;
    this.nodes.push(this.createNode());
  }
  createNode() {
    return {
      transitions: /* @__PURE__ */ new Map(),
      failure: 0,
      outputs: []
    };
  }
  add(pattern, outputId) {
    if (this.built) {
      throw new Error("AhoCorasickMachine cannot add pattern after build().");
    }
    let nodeIndex = 0;
    for (const char of pattern) {
      const node = this.nodes[nodeIndex];
      const nextIndex = node.transitions.get(char);
      if (nextIndex !== void 0) {
        nodeIndex = nextIndex;
      } else {
        const newIndex = this.nodes.length;
        node.transitions.set(char, newIndex);
        this.nodes.push(this.createNode());
        nodeIndex = newIndex;
      }
    }
    this.nodes[nodeIndex].outputs.push(outputId);
  }
  build() {
    if (this.built) {
      return;
    }
    const queue = [];
    for (const [, nextIndex] of this.nodes[0].transitions.entries()) {
      this.nodes[nextIndex].failure = 0;
      queue.push(nextIndex);
    }
    while (queue.length > 0) {
      const current = queue.shift();
      const currentNode = this.nodes[current];
      for (const [char, nextIndex] of currentNode.transitions.entries()) {
        queue.push(nextIndex);
        let failure = currentNode.failure;
        while (failure !== 0 && !this.nodes[failure].transitions.has(char)) {
          failure = this.nodes[failure].failure;
        }
        const fallback = this.nodes[failure].transitions.get(char);
        this.nodes[nextIndex].failure = fallback !== void 0 ? fallback : 0;
        const failureOutputs = this.nodes[this.nodes[nextIndex].failure].outputs;
        if (failureOutputs.length > 0) {
          this.nodes[nextIndex].outputs.push(...failureOutputs);
        }
      }
    }
    this.built = true;
  }
  search(text) {
    if (!this.built) {
      throw new Error("AhoCorasickMachine must call build() before search().");
    }
    const results = [];
    let nodeIndex = 0;
    for (const char of text) {
      while (nodeIndex !== 0 && !this.nodes[nodeIndex].transitions.has(char)) {
        nodeIndex = this.nodes[nodeIndex].failure;
      }
      const nextIndex = this.nodes[nodeIndex].transitions.get(char);
      if (nextIndex !== void 0) {
        nodeIndex = nextIndex;
      }
      if (this.nodes[nodeIndex].outputs.length > 0) {
        results.push(...this.nodes[nodeIndex].outputs);
      }
    }
    return results;
  }
  hasPatterns() {
    return this.nodes.length > 1;
  }
}
class SubstringMatcher {
  constructor() {
    this.caseSensitivePatterns = [];
    this.caseSensitiveOutputs = [];
    this.caseSensitiveIds = /* @__PURE__ */ new Map();
    this.caseSensitiveMachine = null;
    this.caseInsensitivePatterns = [];
    this.caseInsensitiveOutputs = [];
    this.caseInsensitiveIds = /* @__PURE__ */ new Map();
    this.caseInsensitiveMachine = null;
  }
  add(pattern, ruleIndex, caseSensitive) {
    if (caseSensitive) {
      const existing = this.caseSensitiveIds.get(pattern);
      if (existing !== void 0) {
        this.caseSensitiveOutputs[existing].push(ruleIndex);
        return;
      }
      const outputId = this.caseSensitiveOutputs.length;
      this.caseSensitiveIds.set(pattern, outputId);
      this.caseSensitivePatterns.push({ pattern, outputId });
      this.caseSensitiveOutputs.push([ruleIndex]);
    } else {
      const normalized = pattern.toLocaleLowerCase();
      const existing = this.caseInsensitiveIds.get(normalized);
      if (existing !== void 0) {
        this.caseInsensitiveOutputs[existing].push(ruleIndex);
        return;
      }
      const outputId = this.caseInsensitiveOutputs.length;
      this.caseInsensitiveIds.set(normalized, outputId);
      this.caseInsensitivePatterns.push({ pattern: normalized, outputId });
      this.caseInsensitiveOutputs.push([ruleIndex]);
    }
  }
  build() {
    if (this.caseSensitivePatterns.length > 0) {
      this.caseSensitiveMachine = new AhoCorasickMachine();
      for (const { pattern, outputId } of this.caseSensitivePatterns) {
        this.caseSensitiveMachine.add(pattern, outputId);
      }
      this.caseSensitiveMachine.build();
    }
    if (this.caseInsensitivePatterns.length > 0) {
      this.caseInsensitiveMachine = new AhoCorasickMachine();
      for (const { pattern, outputId } of this.caseInsensitivePatterns) {
        this.caseInsensitiveMachine.add(pattern, outputId);
      }
      this.caseInsensitiveMachine.build();
    }
  }
  match(text, lowercaseText) {
    const resultSet = /* @__PURE__ */ new Set();
    if (this.caseSensitiveMachine) {
      const matches = this.caseSensitiveMachine.search(text);
      for (const outputId of matches) {
        for (const ruleIndex of this.caseSensitiveOutputs[outputId]) {
          resultSet.add(ruleIndex);
        }
      }
    }
    if (this.caseInsensitiveMachine) {
      const haystack = lowercaseText ?? text.toLocaleLowerCase();
      const matches = this.caseInsensitiveMachine.search(haystack);
      for (const outputId of matches) {
        for (const ruleIndex of this.caseInsensitiveOutputs[outputId]) {
          resultSet.add(ruleIndex);
        }
      }
    }
    return Array.from(resultSet);
  }
  hasPatterns() {
    return Boolean(
      this.caseSensitiveMachine && this.caseSensitiveMachine.hasPatterns() || this.caseInsensitiveMachine && this.caseInsensitiveMachine.hasPatterns()
    );
  }
  needsLowercaseText() {
    return this.caseInsensitiveMachine !== null;
  }
}
const REGEX_META_CHARS = /[.*+?^${}()|[\]\\]/;
function isPlainLiteralPattern(pattern) {
  return !REGEX_META_CHARS.test(pattern);
}

function computeThreadNicoruStats(comments) {
  const countsByValue = /* @__PURE__ */ new Map();
  let minNicoru = Number.POSITIVE_INFINITY;
  let maxNicoru = Number.NEGATIVE_INFINITY;
  for (const comment of comments) {
    const rawValue = comment.nicoruCount;
    const numericValue = typeof rawValue === "number" ? rawValue : Number.isFinite(Number(rawValue)) ? Number(rawValue) : 0;
    countsByValue.set(numericValue, (countsByValue.get(numericValue) ?? 0) + 1);
    if (numericValue < minNicoru) {
      minNicoru = numericValue;
    }
    if (numericValue > maxNicoru) {
      maxNicoru = numericValue;
    }
  }
  if (countsByValue.size === 0) {
    minNicoru = 0;
    maxNicoru = 0;
  }
  const sortedValues = Array.from(countsByValue.keys()).sort((a, b) => a - b);
  return {
    totalComments: comments.length,
    minNicoru,
    maxNicoru,
    countsByValue,
    sortedValues
  };
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
function prepareRules(rules, currentSmid, regexCache) {
  const preparedRules = [];
  const userIdRuleIndexes = /* @__PURE__ */ new Map();
  const substringMatcher = new SubstringMatcher();
  let hasLiteralPatterns = false;
  for (const rule of rules) {
    if (!shouldApplyRule(rule, currentSmid)) {
      continue;
    }
    const index = preparedRules.length;
    const isValidUserRule = Boolean(rule.isUserIdRule && rule.userId);
    const preparedRule = {
      rule,
      index,
      compiledRegex: void 0,
      isUserIdRule: isValidUserRule,
      hasLiteralPrefilter: false,
      minRequiredNicoru: typeof rule.nicoru === "number" ? rule.nicoru : void 0
    };
    if (isValidUserRule && rule.userId) {
      const bucket = userIdRuleIndexes.get(rule.userId) ?? [];
      bucket.push(index);
      userIdRuleIndexes.set(rule.userId, bucket);
    }
    if (rule.regex) {
      const flags = rule.regexFlags || "gi";
      preparedRule.compiledRegex = getRegex(regexCache, rule.regex, flags);
      if (isPlainLiteralPattern(rule.regex)) {
        const isCaseSensitive = !flags.includes("i");
        substringMatcher.add(rule.regex, index, isCaseSensitive);
        preparedRule.hasLiteralPrefilter = true;
        hasLiteralPatterns = true;
      }
    }
    preparedRules.push(preparedRule);
  }
  if (hasLiteralPatterns) {
    substringMatcher.build();
  }
  return {
    rules: preparedRules,
    userIdRuleIndexes,
    substringMatcher: hasLiteralPatterns ? substringMatcher : null,
    needsLowercase: hasLiteralPatterns ? substringMatcher.needsLowercaseText() : false
  };
}
function filterThread({
  thread,
  preparedRules,
  settings,
  regexCache,
  debugMode
}) {
  const logs = [];
  const threadContext = buildThreadProcessingContext(thread.comments, preparedRules);
  const comments = thread.comments.map(
    (comment) => applyRulesToComment({
      originalComment: comment,
      preparedRules,
      threadContext,
      threadFork: thread.fork,
      settings,
      regexCache,
      debugMode: Boolean(debugMode),
      logCollector: logs
    })
  ).filter((comment) => comment !== null);
  return {
    comments,
    logs
  };
}
function addOrReplaceCommand(commands, newCommand) {
  if (!Array.isArray(commands)) {
    commands = [];
  }
  const commandType = getCommandType(newCommand);
  if (!commandType) {
    if (!commands.includes(newCommand)) {
      return [...commands, newCommand];
    }
    return commands;
  }
  const filteredCommands = commands.filter((cmd) => !isCommandOfType(cmd, commandType));
  return [...filteredCommands, newCommand];
}
function addOrReplaceCommands(commands, newCommands) {
  let result = commands;
  for (const newCommand of newCommands) {
    result = addOrReplaceCommand(result, newCommand);
  }
  return result;
}
function getCommandsOfType(commands, commandType) {
  return commands.filter((cmd) => isCommandOfType(cmd, commandType));
}
function removeCommandsOfType(commands, commandType) {
  return commands.filter((cmd) => !isCommandOfType(cmd, commandType));
}
function isCommandOfType(command, commandType) {
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
function normalizeCommands(commands) {
  if (!commands) {
    return [];
  }
  if (Array.isArray(commands)) {
    return commands.filter((cmd) => cmd !== null && cmd !== void 0 && cmd !== "").map((cmd) => String(cmd).trim()).filter((cmd) => cmd.length > 0);
  }
  if (typeof commands === "string") {
    return commands.trim().split(/\s+/).filter((cmd) => cmd.length > 0);
  }
  return [];
}
function buildThreadProcessingContext(comments, preparedRules) {
  const nicoruStats = computeThreadNicoruStats(comments);
  const nicoruIneligibleRuleIndexes = /* @__PURE__ */ new Set();
  for (const preparedRule of preparedRules.rules) {
    if (typeof preparedRule.minRequiredNicoru === "number" && nicoruStats.maxNicoru < preparedRule.minRequiredNicoru) {
      nicoruIneligibleRuleIndexes.add(preparedRule.index);
    }
  }
  return {
    nicoruStats,
    nicoruIneligibleRuleIndexes
  };
}
function applyRulesToComment({
  originalComment,
  preparedRules,
  threadContext,
  threadFork,
  settings,
  regexCache,
  debugMode,
  logCollector
}) {
  const processedComment = { ...originalComment };
  processedComment.commands = normalizeCommands(processedComment.commands);
  if ([CONSTANTS.FORK_TYPES.EASY, CONSTANTS.FORK_TYPES.MAIN, CONSTANTS.FORK_TYPES.OWNER].includes(threadFork)) {
    processedComment.isPremium = true;
  }
  const commandsToAdd = [];
  let shouldHideComment = false;
  let ruleApplied = false;
  let hasEmptyNicoruRule = false;
  const userRuleIndexes = preparedRules.userIdRuleIndexes.get(originalComment.userId) ?? [];
  const activeUserRuleIndexes = new Set(userRuleIndexes);
  const matcher = preparedRules.substringMatcher;
  const getBodyText = () => processedComment.body ?? "";
  let lowercaseBody = preparedRules.needsLowercase ? getBodyText().toLocaleLowerCase() : void 0;
  let literalCandidateIndexes = matcher ? new Set(matcher.match(getBodyText(), lowercaseBody)) : /* @__PURE__ */ new Set();
  const refreshLiteralCandidates = () => {
    lowercaseBody = preparedRules.needsLowercase ? getBodyText().toLocaleLowerCase() : void 0;
    literalCandidateIndexes = matcher ? new Set(matcher.match(getBodyText(), lowercaseBody)) : /* @__PURE__ */ new Set();
  };
  for (const preparedRule of preparedRules.rules) {
    const rule = preparedRule.rule;
    if (threadContext.nicoruIneligibleRuleIndexes.has(preparedRule.index)) {
      continue;
    }
    if (preparedRule.isUserIdRule) {
      if (!activeUserRuleIndexes.has(preparedRule.index)) {
        continue;
      }
      if (!checkNicoruRule(rule, originalComment.nicoruCount)) {
        continue;
      }
      if (!rule.userId || !checkUserIdRule(rule, originalComment.userId)) {
        continue;
      }
      ruleApplied = true;
      const isHidden = rule.nicoru === "EMPTY";
      logCollector.push({
        comment: originalComment,
        rule,
        ruleType: "userId",
        hidden: isHidden
      });
      if (rule.nicoru === "EMPTY") {
        hasEmptyNicoruRule = true;
        shouldHideComment = true;
        commandsToAdd.push("invisible");
      }
      continue;
    }
    if (preparedRule.hasLiteralPrefilter && !literalCandidateIndexes.has(preparedRule.index)) {
      continue;
    }
    if (!checkNicoruRule(rule, originalComment.nicoruCount)) {
      continue;
    }
    if (!rule.regex) {
      continue;
    }
    const result = applyRegexRule(getBodyText(), rule, regexCache, preparedRule.compiledRegex);
    if (!result.matched) {
      continue;
    }
    ruleApplied = true;
    logCollector.push({
      comment: originalComment,
      rule,
      ruleType: "regex",
      hidden: result.shouldHide
    });
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
      if (matcher) {
        refreshLiteralCandidates();
      } else if (preparedRules.needsLowercase) {
        lowercaseBody = getBodyText().toLocaleLowerCase();
      }
    }
  }
  if (shouldHideComment) {
    processedComment.body = "";
    if (!processedComment.commands.includes("invisible")) {
      processedComment.commands.push("invisible");
    }
  }
  if ([CONSTANTS.FORK_TYPES.EASY, CONSTANTS.FORK_TYPES.MAIN, CONSTANTS.FORK_TYPES.OWNER].includes(threadFork)) {
    if (!ruleApplied || hasEmptyNicoruRule) {
      processedComment.commands = applyForkCommandSettings(processedComment.commands, threadFork, settings);
    }
  }
  if (commandsToAdd.length > 0) {
    processedComment.commands = addOrReplaceCommands(processedComment.commands, commandsToAdd);
  }
  if (ruleApplied) {
    processedComment.body = sanitizeCommentBody(processedComment.body);
  }
  return processedComment;
}
function shouldApplyRule(rule, currentSmid) {
  if (rule.smid === CONSTANTS.RULE_DEFAULTS.ALL_SMID) {
    return true;
  }
  return rule.smid === currentSmid;
}
function checkNicoruRule(rule, commentNicoruCount) {
  if (rule.nicoru === "EMPTY") {
    return true;
  }
  if (typeof rule.nicoru === "number") {
    return commentNicoruCount >= rule.nicoru;
  }
  return false;
}
function checkUserIdRule(rule, commentUserId) {
  if (!rule.userId) {
    return false;
  }
  return rule.userId === commentUserId;
}
function applyRegexRule(text, rule, cache, compiledRegex) {
  if (!rule.regex) {
    return {
      matched: false,
      shouldHide: false,
      replacedText: text
    };
  }
  const regex = compiledRegex ?? getRegex(cache, rule.regex, rule.regexFlags || "gi");
  const matched = regex.test(text);
  if (!matched) {
    if (regex.global) {
      regex.lastIndex = 0;
    }
    return {
      matched: false,
      shouldHide: false,
      replacedText: text
    };
  }
  if (regex.global) {
    regex.lastIndex = 0;
  }
  const shouldHide = rule.replace === CONSTANTS.RULE_DEFAULTS.EMPTY_REPLACE;
  const replacedText = shouldHide ? text : text.replace(regex, rule.replace || "");
  if (regex.global) {
    regex.lastIndex = 0;
  }
  return {
    matched: true,
    shouldHide,
    replacedText
  };
}
function getRegex(cache, pattern, flags = "gi") {
  const cacheKey = `${pattern}:::${flags}`;
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }
  const regex = new RegExp(pattern, flags);
  cache.set(cacheKey, regex);
  return regex;
}
function getCommandType(command) {
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
function applyForkCommandSettings(commands, threadFork, settings) {
  if (!settings?.commandSettings) {
    return sanitizeCommentCommands(commands);
  }
  const allowedCommands = getAllowedCommandsForFork(threadFork, settings);
  const sanitizedCommands = sanitizeCommentCommands(commands);
  const filteredCommands = sanitizedCommands.filter((command) => {
    if (/^#[0-9A-Fa-f]{6}$/.test(command)) {
      return true;
    }
    return allowedCommands.includes(command.toLowerCase());
  });
  return filteredCommands;
}
function getAllowedCommandsForFork(threadFork, settings) {
  switch (threadFork) {
    case CONSTANTS.FORK_TYPES.OWNER:
      return settings.commandSettings.owner;
    case CONSTANTS.FORK_TYPES.MAIN:
      return settings.commandSettings.main;
    case CONSTANTS.FORK_TYPES.EASY:
      return settings.commandSettings.easy;
    default:
      return [];
  }
}
function chunkThreads(threads, chunkSize) {
  if (chunkSize <= 0) {
    return [threads];
  }
  const result = [];
  for (let i = 0; i < threads.length; i += chunkSize) {
    result.push(threads.slice(i, i + chunkSize));
  }
  return result;
}

class CommentFilter {
  constructor(debugMode = false) {
    this.regexCache = /* @__PURE__ */ new Map();
    this.debugMode = false;
    this.settings = null;
    this.filterLogs = [];
    this.debugMode = debugMode;
  }
  updateSettings(settings) {
    this.settings = settings;
    this.debugMode = settings.debugMode;
    FilterLogger.setLogSendingEnabled(settings?.logToCommentFilterLogger || false);
  }
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
          userIdRules: rules.filter((rule) => rule.isUserIdRule),
          regexRules: rules.filter((rule) => !rule.isUserIdRule),
          currentSmid
        });
      }
      let filteredData;
      if (this.shouldUseWorker(globalData.originalData.data.threads)) {
        try {
          filteredData = await this.processCommentDataWithWorkers(globalData.originalData, rules, currentSmid);
        } catch (workerError) {
          const reason = workerError instanceof Error ? workerError : new Error(String(workerError));
          window.logger?.warn("[CommentFilter2] Worker processing failed, falling back to main thread:", reason);
          const preparedRules = this.prepareRules(rules, currentSmid);
          filteredData = this.processCommentData(globalData.originalData, preparedRules, currentSmid);
        }
      } else {
        const preparedRules = this.prepareRules(rules, currentSmid);
        filteredData = this.processCommentData(globalData.originalData, preparedRules, currentSmid);
      }
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
  processCommentData(data, preparedRules, currentSmid) {
    const processedThreads = data.data.threads.map((thread) => {
      const { comments, logs } = filterThread({
        thread,
        preparedRules,
        settings: this.settings,
        regexCache: this.regexCache,
        debugMode: this.debugMode
      });
      this.captureLogEvents(logs, currentSmid);
      return {
        ...thread,
        comments
      };
    });
    return {
      ...data,
      data: {
        ...data.data,
        threads: processedThreads
      }
    };
  }
  async processCommentDataWithWorkers(data, rules, currentSmid) {
    const threads = data.data.threads;
    if (threads.length === 0) {
      return data;
    }
    const workerCount = this.resolveWorkerCount(threads.length);
    const chunkSize = Math.ceil(threads.length / workerCount);
    const threadChunks = chunkThreads(threads, chunkSize);
    const results = await Promise.all(
      threadChunks.map(
        (chunk) => this.runWorker({
          threads: chunk,
          rules,
          currentSmid,
          settings: this.settings,
          debugMode: this.debugMode
        })
      )
    );
    const updatedThreads = [];
    for (const result of results) {
      this.captureLogEvents(result.logs, currentSmid);
      updatedThreads.push(...result.threads);
    }
    return {
      ...data,
      data: {
        ...data.data,
        threads: updatedThreads
      }
    };
  }
  runWorker(payload) {
    return new Promise((resolve, reject) => {
      const worker = new Worker(new URL(/* @vite-ignore */ "/assets/comment-filter-worker-DCXOyoFW.js", import.meta.url), { type: "module" });
      worker.onmessage = (event) => {
        resolve(event.data.payload);
        worker.terminate();
      };
      worker.onerror = (event) => {
        worker.terminate();
        const reason = event instanceof ErrorEvent ? event.error instanceof Error ? event.error : new Error(event.message) : new Error(String(event));
        reject(reason);
      };
      const message = {
        type: "process",
        payload
      };
      worker.postMessage(message);
    });
  }
  shouldUseWorker(threads) {
    if (typeof Worker === "undefined") {
      return false;
    }
    if (!threads || threads.length <= 1) {
      return false;
    }
    const hardware = typeof navigator !== "undefined" ? navigator.hardwareConcurrency || 0 : 0;
    return hardware > 1;
  }
  resolveWorkerCount(threadCount) {
    const hardware = typeof navigator !== "undefined" ? navigator.hardwareConcurrency || 1 : 1;
    const maxWorkers = Math.max(1, hardware - 1);
    return Math.min(maxWorkers, Math.max(1, threadCount));
  }
  captureLogEvents(events, currentSmid) {
    for (const event of events) {
      this.addFilterLog(event.comment, event.rule, event.ruleType, true, event.hidden, currentSmid);
    }
  }
  prepareRules(rules, currentSmid) {
    return prepareRules(rules, currentSmid, this.regexCache);
  }
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
  logFilteringResults(original, filtered, rules) {
    const originalCount = this.countComments(original);
    const filteredCount = this.countComments(filtered);
    const hiddenCount = originalCount - filteredCount;
    window.logger?.debug("[CommentFilter2] Filtering Results:", {
      originalComments: originalCount,
      filteredComments: filteredCount,
      hiddenComments: hiddenCount,
      appliedRules: rules.length
    });
  }
  countComments(data) {
    return data.data.threads.reduce((sum, thread) => sum + thread.comments.length, 0);
  }
  getGlobalData() {
    const data = window[CONSTANTS.GLOBAL_DATA_KEY];
    if (data && typeof data === "object" && "originalData" in data && "filteredData" in data && "currentSmid" in data && "lastUpdated" in data) {
      return data;
    }
    return null;
  }
  clearRegexCache() {
    this.regexCache.clear();
  }
  setDebugMode(enabled) {
    this.debugMode = enabled;
  }
  addCommandsToComment(comment, commandsToAdd) {
    const processedComment = { ...comment };
    processedComment.commands = Array.isArray(processedComment.commands) ? [...processedComment.commands] : [];
    processedComment.commands = addOrReplaceCommands(processedComment.commands, commandsToAdd);
    return processedComment;
  }
  addCommandToComment(comment, commandToAdd) {
    const processedComment = { ...comment };
    processedComment.commands = Array.isArray(processedComment.commands) ? [...processedComment.commands] : [];
    processedComment.commands = addOrReplaceCommand(processedComment.commands, commandToAdd);
    return processedComment;
  }
  addOrReplaceCommand(commands, newCommand) {
    return addOrReplaceCommand(commands, newCommand);
  }
  addOrReplaceCommands(commands, newCommands) {
    return addOrReplaceCommands(commands, newCommands);
  }
  isCommandOfType(command, commandType) {
    return isCommandOfType(command, commandType);
  }
  getCommandsOfType(commands, commandType) {
    return getCommandsOfType(commands, commandType);
  }
  removeCommandsOfType(commands, commandType) {
    return removeCommandsOfType(commands, commandType);
  }
  normalizeCommands(commands) {
    return normalizeCommands(commands);
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
      const preparedRules = this.prepareRules(rules, currentSmid);
      const filteredData = this.processCommentData(globalData.originalData, preparedRules, currentSmid);
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
  processCommentData(data, preparedRules, currentSmid) {
    const processedThreads = data.data.threads.map((thread) => ({
      ...thread,
      comments: this.filterCommentsInThread(thread.comments, preparedRules, currentSmid, thread.fork)
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
   * JSONルールの事前準備
   */
  prepareRules(rules, currentSmid) {
    const preparedRules = [];
    const userIdRuleIndexes = /* @__PURE__ */ new Map();
    const substringMatcher = new SubstringMatcher();
    let hasLiteralPatterns = false;
    for (const rule of rules) {
      if (rule.enabled === false) {
        continue;
      }
      if (!this.checkSmidCondition(rule.smid, currentSmid)) {
        continue;
      }
      const index = preparedRules.length;
      const isUserRule = !rule.pattern && Boolean(rule.userId);
      const preparedRule = {
        rule,
        index,
        compiledRegex: void 0,
        isUserRule,
        hasLiteralPrefilter: false,
        normalizedNicoruCond: void 0
      };
      if (isUserRule && rule.userId) {
        const bucket = userIdRuleIndexes.get(rule.userId) ?? [];
        bucket.push(index);
        userIdRuleIndexes.set(rule.userId, bucket);
      }
      if (rule.pattern) {
        const flags = rule.flags || "gi";
        preparedRule.compiledRegex = this.getRegex(rule.pattern, flags);
        if (isPlainLiteralPattern(rule.pattern)) {
          const isCaseSensitive = !flags.includes("i");
          substringMatcher.add(rule.pattern, index, isCaseSensitive);
          preparedRule.hasLiteralPrefilter = true;
          hasLiteralPatterns = true;
        }
      }
      const normalizedNicoruCond = this.normalizeNicoruCondition(rule.nicoru_cond);
      if (normalizedNicoruCond) {
        preparedRule.normalizedNicoruCond = normalizedNicoruCond;
      }
      preparedRules.push(preparedRule);
    }
    if (hasLiteralPatterns) {
      substringMatcher.build();
    }
    return {
      rules: preparedRules,
      userIdRuleIndexes,
      substringMatcher: hasLiteralPatterns ? substringMatcher : null,
      needsLowercase: hasLiteralPatterns ? substringMatcher.needsLowercaseText() : false
    };
  }
  normalizeNicoruCondition(cond) {
    if (!cond) {
      return null;
    }
    const modeValue = (cond.mode ?? "exclude").toString().trim().toLowerCase();
    const mode = modeValue === "include" ? "include" : "exclude";
    if (cond.op === "range") {
      if (!Array.isArray(cond.value) || cond.value.length !== 2) {
        return null;
      }
      const start = this.toNumber(cond.value[0]);
      const end = this.toNumber(cond.value[1]);
      if (start === null || end === null) {
        return null;
      }
      const normalizedStart = Math.min(start, end);
      const normalizedEnd = Math.max(start, end);
      return {
        op: "range",
        mode,
        value: normalizedStart,
        rangeEnd: normalizedEnd,
        isValid: true
      };
    }
    const numericValue = this.toNumber(cond.value);
    if (numericValue === null) {
      return null;
    }
    return {
      op: cond.op,
      mode,
      value: numericValue,
      isValid: true
    };
  }
  buildThreadProcessingContext(comments, preparedRules) {
    const nicoruStats = computeThreadNicoruStats(comments);
    const nicoruIneligibleRuleIndexes = /* @__PURE__ */ new Set();
    for (const preparedRule of preparedRules.rules) {
      if (!this.isRuleEligibleForThread(preparedRule, nicoruStats)) {
        nicoruIneligibleRuleIndexes.add(preparedRule.index);
      }
    }
    return {
      nicoruStats,
      nicoruIneligibleRuleIndexes
    };
  }
  isRuleEligibleForThread(preparedRule, stats) {
    const normalized = preparedRule.normalizedNicoruCond;
    if (!normalized || !normalized.isValid) {
      return true;
    }
    const { canBeMet, canBeUnmet } = this.evaluateNicoruConditionPossibility(normalized, stats);
    return normalized.mode === "include" ? canBeMet : canBeUnmet;
  }
  evaluateNicoruConditionPossibility(cond, stats) {
    const total = stats.totalComments;
    if (total === 0) {
      return { canBeMet: false, canBeUnmet: false };
    }
    switch (cond.op) {
      case "=": {
        const metCount = stats.countsByValue.get(cond.value) ?? 0;
        return {
          canBeMet: metCount > 0,
          canBeUnmet: metCount < total
        };
      }
      case ">": {
        const canBeMet = stats.maxNicoru > cond.value;
        const canBeUnmet = stats.minNicoru <= cond.value;
        return { canBeMet, canBeUnmet };
      }
      case "<": {
        const canBeMet = stats.minNicoru < cond.value;
        const canBeUnmet = stats.maxNicoru >= cond.value;
        return { canBeMet, canBeUnmet };
      }
      case ">=": {
        const canBeMet = stats.maxNicoru >= cond.value;
        const canBeUnmet = stats.minNicoru < cond.value;
        return { canBeMet, canBeUnmet };
      }
      case "<=": {
        const canBeMet = stats.minNicoru <= cond.value;
        const canBeUnmet = stats.maxNicoru > cond.value;
        return { canBeMet, canBeUnmet };
      }
      case "range": {
        const start = cond.value;
        const end = cond.rangeEnd ?? cond.value;
        let metCount = 0;
        for (const value of stats.sortedValues) {
          if (value < start) {
            continue;
          }
          if (value > end) {
            break;
          }
          metCount += stats.countsByValue.get(value) ?? 0;
        }
        return {
          canBeMet: metCount > 0,
          canBeUnmet: metCount < total
        };
      }
      default:
        return { canBeMet: true, canBeUnmet: true };
    }
  }
  /**
   * スレッド内のコメントをフィルタリング（JSON形式ルール対応）
   */
  filterCommentsInThread(comments, preparedRules, currentSmid, threadFork) {
    if (this.debugMode) {
      window.logger?.debug(`[CommentFilter2] Processing ${threadFork} thread with ${comments.length} comments using ${preparedRules.rules.length} JSON rules`);
    }
    const threadContext = this.buildThreadProcessingContext(comments, preparedRules);
    return comments.map((comment) => this.applyRulesToComment(comment, preparedRules, threadContext, currentSmid, threadFork)).filter((comment) => comment !== null);
  }
  /**
   * 単一コメントにJSON形式ルールを適用
   */
  applyRulesToComment(comment, preparedRules, threadContext, currentSmid, threadFork) {
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
    if (preparedRules.rules.length === 0) {
      if ([CONSTANTS.FORK_TYPES.EASY, CONSTANTS.FORK_TYPES.MAIN, CONSTANTS.FORK_TYPES.OWNER].includes(threadFork)) {
        processedComment.commands = this.applyForkCommandSettings(processedComment.commands, threadFork);
      }
      return processedComment;
    }
    const userRuleIndexes = preparedRules.userIdRuleIndexes.get(comment.userId) ?? [];
    const activeUserRuleIndexes = new Set(userRuleIndexes);
    const matcher = preparedRules.substringMatcher;
    const originalBody = comment.body ?? "";
    const lowercaseBody = preparedRules.needsLowercase ? originalBody.toLocaleLowerCase() : void 0;
    const literalCandidateIndexes = matcher ? new Set(matcher.match(originalBody, lowercaseBody)) : /* @__PURE__ */ new Set();
    for (const preparedRule of preparedRules.rules) {
      const rule = preparedRule.rule;
      if (threadContext.nicoruIneligibleRuleIndexes.has(preparedRule.index)) {
        continue;
      }
      let patternMatched = false;
      let reusableRegex;
      if (preparedRule.isUserRule) {
        if (!activeUserRuleIndexes.has(preparedRule.index)) {
          continue;
        }
        patternMatched = true;
      } else if (rule.pattern) {
        if (preparedRule.hasLiteralPrefilter && !literalCandidateIndexes.has(preparedRule.index)) {
          continue;
        }
        reusableRegex = preparedRule.compiledRegex ?? this.getRegex(rule.pattern, rule.flags || "gi");
        if (reusableRegex.global) {
          reusableRegex.lastIndex = 0;
        }
        patternMatched = reusableRegex.test(originalBody);
        if (!patternMatched) {
          continue;
        }
        if (reusableRegex.global) {
          reusableRegex.lastIndex = 0;
        }
      } else {
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
      const actionResult = this.executeAction(rule.action, processedComment.body, rule, reusableRegex);
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
      shouldApplyCommands = !excludedByNicoru;
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
   * アクション実行
   */
  executeAction(action, text, rule, compiledRegex) {
    if (action.type === "hide") {
      return { type: "hide" };
    }
    if (action.type === "replace" && rule.pattern) {
      const regex = compiledRegex ?? this.getRegex(rule.pattern, rule.flags || "gi");
      if (regex.global) {
        regex.lastIndex = 0;
      }
      const newText = text.replace(regex, action.replacement);
      if (regex.global) {
        regex.lastIndex = 0;
      }
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
  async extractSmidFromLocation() {
    try {
      if (typeof window.commonHelper?.getVideoIdWithFallback === "function") {
        return await window.commonHelper.getVideoIdWithFallback(window.location.href);
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
      const fallbackSmid = await this.extractSmidFromLocation();
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
