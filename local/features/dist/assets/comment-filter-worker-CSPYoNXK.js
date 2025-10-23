(function () {
  'use strict';

  const CONSTANTS = {
    // フォーク種別
    FORK_TYPES: {
      MAIN: "main",
      EASY: "easy",
      OWNER: "owner"
    },
    // NGワードルール形式
    RULE_DEFAULTS: {
      EMPTY_REPLACE: "EMPTY",
      ALL_SMID: "ALL"}};
  const DEFAULT_COMMANDS = [
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
  const DEFAULT_FORK_COMMANDS = {
    [CONSTANTS.FORK_TYPES.MAIN]: DEFAULT_COMMANDS,
    [CONSTANTS.FORK_TYPES.EASY]: DEFAULT_COMMANDS,
    [CONSTANTS.FORK_TYPES.OWNER]: DEFAULT_COMMANDS
  };

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
    const sanitizedCommands = sanitizeCommentCommands(commands);
    const allowedCommands = getAllowedCommandsForFork(threadFork, settings);
    if (!allowedCommands) {
      return sanitizedCommands;
    }
    return sanitizedCommands.filter((command) => {
      if (/^#[0-9A-Fa-f]{6}$/.test(command)) {
        return true;
      }
      return allowedCommands.has(command.toLowerCase());
    });
  }
  function getAllowedCommandsForFork(threadFork, settings) {
    const commandSettings = settings?.commandSettings;
    const defaultCommands = DEFAULT_FORK_COMMANDS[threadFork]?.map((command) => command.toLowerCase());
    const toLowercaseSet = (commands) => new Set((commands ?? defaultCommands ?? []).map((command) => command.toLowerCase()));
    if (!commandSettings) {
      return defaultCommands ? new Set(defaultCommands) : null;
    }
    switch (threadFork) {
      case CONSTANTS.FORK_TYPES.OWNER:
        return toLowercaseSet(commandSettings.owner);
      case CONSTANTS.FORK_TYPES.MAIN:
        return toLowercaseSet(commandSettings.main);
      case CONSTANTS.FORK_TYPES.EASY:
        return toLowercaseSet(commandSettings.easy);
      default:
        return defaultCommands ? new Set(defaultCommands) : null;
    }
  }

  const ctx = self;
  ctx.onmessage = (event) => {
    const { data } = event;
    if (data.type === "process") {
      const { threads, rules, currentSmid, settings, debugMode } = data.payload;
      const effectiveSettings = settings ?? null;
      const regexCache = /* @__PURE__ */ new Map();
      const preparedRules = prepareRules(rules, currentSmid, regexCache);
      const processedThreads = [];
      const allLogs = [];
      for (const thread of threads) {
        const { comments, logs } = filterThread({
          thread,
          preparedRules,
          settings: effectiveSettings,
          regexCache,
          debugMode
        });
        processedThreads.push({ ...thread, comments });
        allLogs.push(...logs);
      }
      const response = {
        type: "result",
        payload: {
          threads: processedThreads,
          logs: allLogs
        }
      };
      ctx.postMessage(response);
    }
  };

})();
//# sourceMappingURL=comment-filter-worker-CSPYoNXK.js.map
