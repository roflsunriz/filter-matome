(function () {
  'use strict';

  const CONSTANTS = {
    // フォーク種別
    FORK_TYPES: {
      MAIN: "main",
      EASY: "easy",
      OWNER: "owner"
    }};
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
    // 匿名コマンド(ユーザーIDを暗号化するためのもの)
    "184",
    // デバイス系コマンド（正式な一覧が無いため既知の代表例を許可）
    "device:3ds",
    "device:wiiu",
    "device:psvita",
    "device:ps4",
    "device:ps5",
    "device:ps6",
    "device:xbox",
    "device:xbox360",
    "device:xboxone",
    "device:xboxseries",
    "device:nintendo",
    "device:nintendoswitch",
    "device:nintendoswitchlite",
    "device:nintendoswitcholed",
    "device:switch",
    "device:switch2"
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
  function enforceCommandSettings(existingCommands, forcedCommands) {
    if (forcedCommands.length === 0) {
      return existingCommands;
    }
    const mutableCommands = [...existingCommands];
    for (const forcedCommand of forcedCommands) {
      const commandType = getCommandType(forcedCommand);
      if (commandType) {
        for (let index = mutableCommands.length - 1; index >= 0; index -= 1) {
          if (getCommandType(mutableCommands[index]) === commandType) {
            mutableCommands.splice(index, 1);
          }
        }
      } else {
        const loweredForced = forcedCommand.toLowerCase();
        for (let index = mutableCommands.length - 1; index >= 0; index -= 1) {
          if (mutableCommands[index].toLowerCase() === loweredForced) {
            mutableCommands.splice(index, 1);
          }
        }
      }
      mutableCommands.push(forcedCommand);
    }
    return sanitizeCommentCommands(mutableCommands);
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

  function prepareJsonRules(rules, currentSmid, regexCache) {
    const preparedRules = [];
    const userIdRuleIndexes = /* @__PURE__ */ new Map();
    const substringMatcher = new SubstringMatcher();
    let hasLiteralPatterns = false;
    for (const rule of rules) {
      if (rule.enabled === false) {
        continue;
      }
      if (!checkSmidCondition(rule.smid, currentSmid)) {
        continue;
      }
      const index = preparedRules.length;
      const isUserRule = Boolean(rule.userId && rule.userId.length > 0);
      const preparedRule = {
        rule,
        index,
        compiledRegex: void 0,
        isUserRule,
        hasLiteralPrefilter: false,
        normalizedNicoruCond: normalizeNicoruCondition(rule.nicoru_cond)
      };
      if (isUserRule && rule.userId) {
        const bucket = userIdRuleIndexes.get(rule.userId) ?? [];
        bucket.push(index);
        userIdRuleIndexes.set(rule.userId, bucket);
      }
      if (rule.pattern) {
        const flags = rule.flags || "gi";
        preparedRule.compiledRegex = getRegex(regexCache, rule.pattern, flags);
        if (isPlainLiteralPattern(rule.pattern)) {
          const isCaseSensitive = !flags.includes("i");
          substringMatcher.add(rule.pattern, index, isCaseSensitive);
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
  function filterJsonThread({
    thread,
    preparedRules,
    settings,
    regexCache
  }) {
    const logs = [];
    const threadContext = buildJsonThreadContext(thread.comments, preparedRules);
    const comments = thread.comments.map(
      (comment) => applyRulesToComment({
        originalComment: comment,
        preparedRules,
        threadContext,
        threadFork: thread.fork,
        commandSettings: settings?.commandSettings ?? null,
        regexCache,
        logCollector: logs
      })
    ).filter((comment) => comment !== null);
    return {
      comments,
      logs
    };
  }
  function applyRulesToComment({
    originalComment,
    preparedRules,
    threadContext,
    threadFork,
    commandSettings,
    regexCache,
    logCollector
  }) {
    const processedComment = { ...originalComment };
    processedComment.commands = normalizeCommands(processedComment.commands);
    let ruleApplied = false;
    let shouldHideComment = false;
    const numericNicoruCount = toNumber(originalComment.nicoruCount) ?? 0;
    let hasIncludeNicoruRule = false;
    let includeNicoruRuleMatched = false;
    let excludeNicoruRuleMatched = false;
    const userRuleIndexes = preparedRules.userIdRuleIndexes.get(originalComment.userId) ?? [];
    const activeUserRuleIndexes = new Set(userRuleIndexes);
    const matcher = preparedRules.substringMatcher;
    const originalBody = originalComment.body ?? "";
    const lowercaseBody = preparedRules.needsLowercase ? originalBody.toLocaleLowerCase() : void 0;
    const literalCandidateIndexes = matcher ? new Set(matcher.match(originalBody, lowercaseBody)) : /* @__PURE__ */ new Set();
    for (const preparedRule of preparedRules.rules) {
      const rule = preparedRule.rule;
      if (threadContext.nicoruIneligibleRuleIndexes.has(preparedRule.index)) {
        continue;
      }
      if (preparedRule.isUserRule) {
        if (!activeUserRuleIndexes.has(preparedRule.index)) {
          continue;
        }
      } else if (rule.pattern) {
        if (preparedRule.hasLiteralPrefilter && !literalCandidateIndexes.has(preparedRule.index)) {
          continue;
        }
        const reusableRegex = preparedRule.compiledRegex ?? getRegex(regexCache, rule.pattern, rule.flags || "gi");
        if (reusableRegex.global) {
          reusableRegex.lastIndex = 0;
        }
        if (!reusableRegex.test(originalBody)) {
          continue;
        }
        if (reusableRegex.global) {
          reusableRegex.lastIndex = 0;
        }
      } else {
        continue;
      }
      const normalizedCond = preparedRule.normalizedNicoruCond;
      const nicoruMatches = normalizedCond ? doesNicoruConditionMatch(normalizedCond, numericNicoruCount) : true;
      if (rule.action.type === "unspecified") {
        if (normalizedCond) {
          if (normalizedCond.mode === "include") {
            hasIncludeNicoruRule = true;
            if (nicoruMatches) {
              includeNicoruRuleMatched = true;
              logCollector.push({
                comment: originalComment,
                rule,
                hidden: false
              });
            }
          } else if (nicoruMatches) {
            excludeNicoruRuleMatched = true;
            logCollector.push({
              comment: originalComment,
              rule,
              hidden: false
            });
          }
        }
        continue;
      }
      const nicoruOk = evaluateNicoruCondition(normalizedCond, originalComment.nicoruCount);
      if (!nicoruOk) {
        continue;
      }
      ruleApplied = true;
      const actionResult = executeAction(rule.action, processedComment.body, rule, preparedRule.compiledRegex ?? getRegex(regexCache, rule.pattern ?? "", rule.flags || "gi"));
      logCollector.push({
        comment: originalComment,
        rule,
        hidden: actionResult.type === "hide"
      });
      if (actionResult.type === "hide") {
        shouldHideComment = true;
        processedComment.body = "";
        processedComment.commands.push("invisible");
        break;
      }
      if (actionResult.type === "replace" && actionResult.newText !== void 0) {
        processedComment.body = actionResult.newText;
      }
    }
    if (shouldHideComment) {
      processedComment.body = "";
      if (!processedComment.commands.includes("invisible")) {
        processedComment.commands.push("invisible");
      }
    }
    const shouldApplyCommandSettings = excludeNicoruRuleMatched ? false : hasIncludeNicoruRule ? includeNicoruRuleMatched : true;
    if (shouldApplyCommandSettings) {
      processedComment.commands = applyForkCommandSettings(processedComment.commands, threadFork, commandSettings);
    }
    if (ruleApplied) {
      processedComment.body = sanitizeCommentBody(processedComment.body);
    }
    return processedComment;
  }
  function normalizeNicoruCondition(cond) {
    if (!cond) {
      return void 0;
    }
    const modeValue = (cond.mode ?? "exclude").toString().trim().toLowerCase();
    const mode = modeValue === "include" ? "include" : "exclude";
    if (cond.op === "range") {
      if (!Array.isArray(cond.value) || cond.value.length !== 2) {
        return void 0;
      }
      const start = toNumber(cond.value[0]);
      const end = toNumber(cond.value[1]);
      if (start === null || end === null) {
        return void 0;
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
    const numericValue = toNumber(cond.value);
    if (numericValue === null) {
      return void 0;
    }
    return {
      op: cond.op,
      mode,
      value: numericValue,
      isValid: true
    };
  }
  function buildJsonThreadContext(comments, preparedRules) {
    const nicoruStats = computeThreadNicoruStats(comments);
    const nicoruIneligibleRuleIndexes = /* @__PURE__ */ new Set();
    for (const preparedRule of preparedRules.rules) {
      const normalized = preparedRule.normalizedNicoruCond;
      if (!normalized) {
        continue;
      }
      const { canBeMet, canBeUnmet } = evaluateNicoruPossibility(normalized, nicoruStats);
      const shouldInclude = normalized.mode === "include" ? canBeMet : canBeUnmet;
      if (!shouldInclude) {
        nicoruIneligibleRuleIndexes.add(preparedRule.index);
      }
    }
    return {
      nicoruStats,
      nicoruIneligibleRuleIndexes
    };
  }
  function checkSmidCondition(smids, currentSmid) {
    if (smids.includes("ALL")) {
      return true;
    }
    return currentSmid ? smids.includes(currentSmid) : false;
  }
  function evaluateNicoruPossibility(cond, stats) {
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
  function evaluateNicoruCondition(cond, commentNicoruCount) {
    if (!cond || !cond.isValid) {
      return true;
    }
    const numericValue = toNumber(commentNicoruCount) ?? 0;
    const matches = doesNicoruConditionMatch(cond, numericValue);
    return cond.mode === "include" ? matches : !matches;
  }
  function doesNicoruConditionMatch(cond, numericValue) {
    switch (cond.op) {
      case "=":
        return numericValue === cond.value;
      case ">":
        return numericValue > cond.value;
      case "<":
        return numericValue < cond.value;
      case ">=":
        return numericValue >= cond.value;
      case "<=":
        return numericValue <= cond.value;
      case "range":
        return cond.rangeEnd !== void 0 && numericValue >= cond.value && numericValue <= cond.rangeEnd;
      default:
        return true;
    }
  }
  function executeAction(action, text, rule, compiledRegex) {
    if (action.type === "hide") {
      return { type: "hide" };
    }
    if (action.type === "replace" && rule.pattern) {
      const regex = compiledRegex;
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
  function applyForkCommandSettings(commands, threadFork, commandSettings) {
    const forcedCommands = getForcedCommandsForFork(threadFork, commandSettings);
    const sanitizedCommands = sanitizeCommentCommands(commands);
    const allowedCommands = getAllowedCommandsForFork(threadFork, commandSettings);
    const filteredCommands = allowedCommands ? sanitizedCommands.filter((command) => {
      if (/^#[0-9A-Fa-f]{6}$/.test(command)) {
        return true;
      }
      return allowedCommands.has(command.toLowerCase());
    }) : sanitizedCommands;
    const filteredForcedCommands = forcedCommands.filter((command) => {
      if (!allowedCommands) {
        return true;
      }
      if (/^#[0-9A-Fa-f]{6}$/.test(command)) {
        return true;
      }
      return allowedCommands.has(command.toLowerCase());
    });
    return enforceCommandSettings(filteredCommands, filteredForcedCommands);
  }
  function getAllowedCommandsForFork(threadFork, commandSettings) {
    const defaultCommands = DEFAULT_FORK_COMMANDS[threadFork]?.map((command) => command.toLowerCase()) ?? [];
    const normalizeCommands2 = (commands) => new Set((commands ?? defaultCommands).map((command) => command.toLowerCase()));
    if (!commandSettings) {
      return new Set(defaultCommands);
    }
    switch (threadFork) {
      case CONSTANTS.FORK_TYPES.OWNER:
        return normalizeCommands2(commandSettings.owner);
      case CONSTANTS.FORK_TYPES.MAIN:
        return normalizeCommands2(commandSettings.main);
      case CONSTANTS.FORK_TYPES.EASY:
        return normalizeCommands2(commandSettings.easy);
      default:
        return new Set(defaultCommands);
    }
  }
  function getForcedCommandsForFork(threadFork, commandSettings) {
    if (!commandSettings) {
      return [];
    }
    let configuredCommands = [];
    switch (threadFork) {
      case CONSTANTS.FORK_TYPES.OWNER:
        configuredCommands = commandSettings.owner;
        break;
      case CONSTANTS.FORK_TYPES.MAIN:
        configuredCommands = commandSettings.main;
        break;
      case CONSTANTS.FORK_TYPES.EASY:
        configuredCommands = commandSettings.easy;
        break;
      default:
        configuredCommands = [];
        break;
    }
    return sanitizeCommentCommands([...configuredCommands]);
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
  function getRegex(cache, pattern, flags) {
    const cacheKey = `${pattern}:::${flags}`;
    if (cache.has(cacheKey)) {
      return cache.get(cacheKey);
    }
    const regex = new RegExp(pattern, flags);
    cache.set(cacheKey, regex);
    return regex;
  }
  function toNumber(value) {
    if (typeof value === "number") {
      return value;
    }
    if (typeof value === "string" && value.trim() !== "") {
      const parsed = Number(value);
      return Number.isNaN(parsed) ? null : parsed;
    }
    return null;
  }

  const ctx = self;
  ctx.onmessage = (event) => {
    const { data } = event;
    if (data.type === "process") {
      const { threads, rules, currentSmid, settings } = data.payload;
      const effectiveSettings = settings ?? null;
      const regexCache = /* @__PURE__ */ new Map();
      const preparedRules = prepareJsonRules(rules, currentSmid, regexCache);
      const processedThreads = [];
      const allLogs = [];
      for (const thread of threads) {
        const { comments, logs } = filterJsonThread({
          thread,
          preparedRules,
          settings: effectiveSettings,
          regexCache
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
//# sourceMappingURL=json-comment-filter-worker-BBtbvj7R.js.map
