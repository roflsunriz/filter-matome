import { CONSTANTS } from "@/comment-filter2/utils/constants";
import {
  sanitizeCommentBody,
  sanitizeCommentCommands,
} from "@/comment-filter2/utils/sanitizer";
import {
  CF2Comment,
  CF2Thread,
  NGWordRule,
  Settings,
} from "@/types/filter-types";
import {
  SubstringMatcher,
  isPlainLiteralPattern,
} from "@/comment-filter2/filter/rule-indexer";
import {
  canUsePlainLiteralPrefilter,
  extractRequiredLiteralTokens,
  selectRequiredTokens,
  type RequiredTokenRuleCandidate,
} from "@/comment-filter2/filter/required-token-extractor";
import {
  computeThreadNicoruStats,
  ThreadNicoruStats,
} from "@/comment-filter2/filter/thread-nicoru-stats";

export type ForkType = "main" | "easy" | "owner";

export interface PreparedRule {
  rule: NGWordRule;
  index: number;
  compiledRegex?: RegExp;
  isUserIdRule: boolean;
  hasCandidatePrefilter: boolean;
  requiredToken?: string;
  minRequiredNicoru?: number;
}

export interface PreparedRuleSet {
  rules: PreparedRule[];
  userIdRuleIndexes: Map<string, number[]>;
  substringMatcher: SubstringMatcher | null;
  needsLowercase: boolean;
}

export interface ThreadProcessingContext {
  nicoruStats: ThreadNicoruStats;
  nicoruIneligibleRuleIndexes: Set<number>;
}

export interface RuleMatchLogEvent {
  comment: CF2Comment;
  rule: NGWordRule;
  ruleType: "regex" | "userId";
  hidden: boolean;
}

export interface FilterThreadArgs {
  thread: CF2Thread;
  preparedRules: PreparedRuleSet;
  settings: Settings | null | undefined;
  regexCache: Map<string, RegExp>;
  debugMode?: boolean;
}

export interface FilterThreadResult {
  comments: CF2Comment[];
  logs: RuleMatchLogEvent[];
}

export const COMMAND_TYPES = {
  COLOR: "color",
  POSITION: "position",
  FONT: "font",
  SIZE: "size",
  SPECIAL: "special",
} as const;

export const COMMAND_CATEGORIES = {
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
    "black2",
  ],
  [COMMAND_TYPES.POSITION]: ["ue", "naka", "shita"],
  [COMMAND_TYPES.FONT]: ["gothic", "mincho", "defont"],
  [COMMAND_TYPES.SIZE]: ["big", "medium", "small"],
  [COMMAND_TYPES.SPECIAL]: [
    "invisible",
    "full",
    "patissier",
    "_live",
    "ender",
    "ca",
    "184",
  ],
} as const;

export function prepareRules(
  rules: NGWordRule[],
  currentSmid: string | null,
  regexCache: Map<string, RegExp>,
): PreparedRuleSet {
  const preparedRules: PreparedRule[] = [];
  const userIdRuleIndexes = new Map<string, number[]>();
  const substringMatcher = new SubstringMatcher();
  const requiredTokenCandidates: RequiredTokenRuleCandidate[] = [];
  let hasCandidatePatterns = false;

  for (const rule of rules) {
    if (!shouldApplyRule(rule, currentSmid)) {
      continue;
    }

    const index = preparedRules.length;
    const isValidUserRule = Boolean(rule.isUserIdRule && rule.userId);
    const preparedRule: PreparedRule = {
      rule,
      index,
      compiledRegex: undefined,
      isUserIdRule: isValidUserRule,
      hasCandidatePrefilter: false,
      minRequiredNicoru:
        typeof rule.nicoru === "number" ? rule.nicoru : undefined,
    };

    if (isValidUserRule && rule.userId) {
      const bucket = userIdRuleIndexes.get(rule.userId) ?? [];
      bucket.push(index);
      userIdRuleIndexes.set(rule.userId, bucket);
    }

    if (rule.regex) {
      const flags = rule.regexFlags || "gi";
      preparedRule.compiledRegex = getRegex(regexCache, rule.regex, flags);

      if (
        isPlainLiteralPattern(rule.regex) &&
        canUsePlainLiteralPrefilter(rule.regex, flags)
      ) {
        const isCaseSensitive = !flags.includes("i");
        substringMatcher.add(rule.regex, index, isCaseSensitive);
        preparedRule.hasCandidatePrefilter = true;
        hasCandidatePatterns = true;
      } else if (!isPlainLiteralPattern(rule.regex)) {
        const tokens = extractRequiredLiteralTokens(rule.regex, flags);
        if (tokens.length > 0) {
          requiredTokenCandidates.push({
            ruleIndex: index,
            tokens,
            caseSensitive: !flags.includes("i"),
          });
        }
      }
    }

    preparedRules.push(preparedRule);
  }

  const selectedRequiredTokens = selectRequiredTokens(requiredTokenCandidates);
  for (const candidate of requiredTokenCandidates) {
    const requiredToken = selectedRequiredTokens.get(candidate.ruleIndex);
    if (requiredToken === undefined) {
      continue;
    }
    const preparedRule = preparedRules[candidate.ruleIndex];
    preparedRule.hasCandidatePrefilter = true;
    preparedRule.requiredToken = requiredToken;
    substringMatcher.add(
      requiredToken,
      candidate.ruleIndex,
      candidate.caseSensitive,
    );
    hasCandidatePatterns = true;
  }

  if (hasCandidatePatterns) {
    substringMatcher.build();
  }

  return {
    rules: preparedRules,
    userIdRuleIndexes,
    substringMatcher: hasCandidatePatterns ? substringMatcher : null,
    needsLowercase: hasCandidatePatterns
      ? substringMatcher.needsLowercaseText()
      : false,
  };
}

export function filterThread({
  thread,
  preparedRules,
  settings,
  regexCache,
  debugMode,
}: FilterThreadArgs): FilterThreadResult {
  const logs: RuleMatchLogEvent[] = [];
  const threadContext = buildThreadProcessingContext(
    thread.comments,
    preparedRules,
  );

  const comments = thread.comments
    .map((comment) =>
      applyRulesToComment({
        originalComment: comment,
        preparedRules,
        threadContext,
        threadFork: thread.fork,
        settings,
        regexCache,
        debugMode: Boolean(debugMode),
        logCollector: logs,
      }),
    )
    .filter((comment): comment is CF2Comment => comment !== null);

  return {
    comments,
    logs,
  };
}

export function addOrReplaceCommand(
  commands: string[],
  newCommand: string,
): string[] {
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

  const filteredCommands = commands.filter(
    (cmd) => !isCommandOfType(cmd, commandType),
  );
  return [...filteredCommands, newCommand];
}

export function addOrReplaceCommands(
  commands: string[],
  newCommands: string[],
): string[] {
  let result = commands;

  for (const newCommand of newCommands) {
    result = addOrReplaceCommand(result, newCommand);
  }

  return result;
}

export function enforceCommandSettings(
  existingCommands: string[],
  forcedCommands: readonly string[],
): string[] {
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

export function getCommandsOfType(
  commands: string[],
  commandType: string,
): string[] {
  return commands.filter((cmd) => isCommandOfType(cmd, commandType));
}

export function removeCommandsOfType(
  commands: string[],
  commandType: string,
): string[] {
  return commands.filter((cmd) => !isCommandOfType(cmd, commandType));
}

export function isCommandOfType(command: string, commandType: string): boolean {
  if (
    commandType === COMMAND_TYPES.COLOR &&
    /^#[0-9A-Fa-f]{6}$/.test(command)
  ) {
    return true;
  }

  const categoryCommands =
    COMMAND_CATEGORIES[commandType as keyof typeof COMMAND_CATEGORIES];
  if (!categoryCommands) {
    return false;
  }

  const lowerCommand = command.toLowerCase();
  return (categoryCommands as readonly string[]).includes(lowerCommand);
}

export function normalizeCommands(
  commands: string | string[] | null | undefined,
): string[] {
  if (!commands) {
    return [];
  }

  if (Array.isArray(commands)) {
    return commands
      .filter((cmd) => cmd !== null && cmd !== undefined && cmd !== "")
      .map((cmd) => String(cmd).trim())
      .filter((cmd) => cmd.length > 0);
  }

  if (typeof commands === "string") {
    return commands
      .trim()
      .split(/\s+/)
      .filter((cmd) => cmd.length > 0);
  }

  return [];
}

function buildThreadProcessingContext(
  comments: CF2Comment[],
  preparedRules: PreparedRuleSet,
): ThreadProcessingContext {
  const nicoruStats = computeThreadNicoruStats(comments);
  const nicoruIneligibleRuleIndexes = new Set<number>();

  for (const preparedRule of preparedRules.rules) {
    if (
      typeof preparedRule.minRequiredNicoru === "number" &&
      nicoruStats.maxNicoru < preparedRule.minRequiredNicoru
    ) {
      nicoruIneligibleRuleIndexes.add(preparedRule.index);
    }
  }

  return {
    nicoruStats,
    nicoruIneligibleRuleIndexes,
  };
}

interface ApplyRulesOptions {
  originalComment: CF2Comment;
  preparedRules: PreparedRuleSet;
  threadContext: ThreadProcessingContext;
  threadFork: ForkType;
  settings: Settings | null | undefined;
  regexCache: Map<string, RegExp>;
  debugMode: boolean;
  logCollector: RuleMatchLogEvent[];
}

function applyRulesToComment({
  originalComment,
  preparedRules,
  threadContext,
  threadFork,
  settings,
  regexCache,
  debugMode,
  logCollector,
}: ApplyRulesOptions): CF2Comment | null {
  const processedComment: CF2Comment = { ...originalComment };

  processedComment.isPremium = true;
  processedComment.commands = normalizeCommands(processedComment.commands);

  const commandsToAdd: string[] = [];
  let shouldHideComment = false;
  let ruleApplied = false;
  let hasEmptyNicoruRule = false;

  const userRuleIndexes =
    preparedRules.userIdRuleIndexes.get(originalComment.userId) ?? [];
  const activeUserRuleIndexes = new Set<number>(userRuleIndexes);

  const matcher = preparedRules.substringMatcher;
  const getBodyText = (): string => processedComment.body ?? "";
  let lowercaseBody = preparedRules.needsLowercase
    ? getBodyText().toLowerCase()
    : undefined;
  let candidateIndexes = matcher
    ? new Set<number>(matcher.match(getBodyText(), lowercaseBody))
    : new Set<number>();

  const refreshCandidates = (): void => {
    lowercaseBody = preparedRules.needsLowercase
      ? getBodyText().toLowerCase()
      : undefined;
    candidateIndexes = matcher
      ? new Set<number>(matcher.match(getBodyText(), lowercaseBody))
      : new Set<number>();
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
        hidden: isHidden,
      });

      if (rule.nicoru === "EMPTY") {
        hasEmptyNicoruRule = true;
        shouldHideComment = true;
        commandsToAdd.push("invisible");
      }

      continue;
    }

    if (
      preparedRule.hasCandidatePrefilter &&
      !candidateIndexes.has(preparedRule.index)
    ) {
      continue;
    }

    if (!checkNicoruRule(rule, originalComment.nicoruCount)) {
      continue;
    }

    if (!rule.regex) {
      continue;
    }

    const result = applyRegexRule(
      getBodyText(),
      rule,
      regexCache,
      preparedRule.compiledRegex,
    );

    if (!result.matched) {
      continue;
    }

    ruleApplied = true;
    logCollector.push({
      comment: originalComment,
      rule,
      ruleType: "regex",
      hidden: result.shouldHide,
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
        refreshCandidates();
      } else if (preparedRules.needsLowercase) {
        lowercaseBody = getBodyText().toLowerCase();
      }
    }
  }

  if (shouldHideComment) {
    processedComment.body = "";
    if (!processedComment.commands.includes("invisible")) {
      processedComment.commands.push("invisible");
    }

    if (debugMode && Math.random() < 0.1) {
      // sampling log removed in engine context
    }
  }

  if (
    [
      CONSTANTS.FORK_TYPES.EASY,
      CONSTANTS.FORK_TYPES.MAIN,
      CONSTANTS.FORK_TYPES.OWNER,
    ].includes(threadFork)
  ) {
    if (!ruleApplied || hasEmptyNicoruRule) {
      processedComment.commands = applyForkCommandSettings(
        processedComment.commands,
        threadFork,
        settings,
      );
    }
  }

  if (commandsToAdd.length > 0) {
    processedComment.commands = addOrReplaceCommands(
      processedComment.commands,
      commandsToAdd,
    );
  }

  if (ruleApplied) {
    processedComment.body = sanitizeCommentBody(processedComment.body);
  }

  return processedComment;
}

function shouldApplyRule(
  rule: NGWordRule,
  currentSmid: string | null,
): boolean {
  if (rule.smid === CONSTANTS.RULE_DEFAULTS.ALL_SMID) {
    return true;
  }

  return rule.smid === currentSmid;
}

function checkNicoruRule(
  rule: NGWordRule,
  commentNicoruCount: number,
): boolean {
  if (rule.nicoru === "EMPTY") {
    return true;
  }

  if (typeof rule.nicoru === "number") {
    return commentNicoruCount >= rule.nicoru;
  }

  return false;
}

function checkUserIdRule(rule: NGWordRule, commentUserId: string): boolean {
  if (!rule.userId) {
    return false;
  }

  return rule.userId === commentUserId;
}

function applyRegexRule(
  text: string,
  rule: NGWordRule,
  cache: Map<string, RegExp>,
  compiledRegex?: RegExp,
): {
  matched: boolean;
  shouldHide: boolean;
  replacedText: string;
} {
  if (!rule.regex) {
    return {
      matched: false,
      shouldHide: false,
      replacedText: text,
    };
  }

  const regex =
    compiledRegex ?? getRegex(cache, rule.regex, rule.regexFlags || "gi");
  const matched = regex.test(text);

  if (!matched) {
    if (regex.global) {
      regex.lastIndex = 0;
    }

    return {
      matched: false,
      shouldHide: false,
      replacedText: text,
    };
  }

  if (regex.global) {
    regex.lastIndex = 0;
  }

  const shouldHide = rule.replace === CONSTANTS.RULE_DEFAULTS.EMPTY_REPLACE;
  const replacedText = shouldHide
    ? text
    : text.replace(regex, rule.replace || "");

  if (regex.global) {
    regex.lastIndex = 0;
  }

  return {
    matched: true,
    shouldHide,
    replacedText,
  };
}

function getRegex(
  cache: Map<string, RegExp>,
  pattern: string,
  flags: string = "gi",
): RegExp {
  const cacheKey = `${pattern}:::${flags}`;

  if (cache.has(cacheKey)) {
    return cache.get(cacheKey)!;
  }

  const regex = new RegExp(pattern, flags);
  cache.set(cacheKey, regex);
  return regex;
}

function getCommandType(command: string): string | null {
  if (/^#[0-9A-Fa-f]{6}$/.test(command)) {
    return COMMAND_TYPES.COLOR;
  }

  const lowerCommand = command.toLowerCase();

  for (const [type, commands] of Object.entries(COMMAND_CATEGORIES)) {
    if ((commands as readonly string[]).includes(lowerCommand)) {
      return type;
    }
  }

  return null;
}
function applyForkCommandSettings(
  commands: string[],
  threadFork: ForkType,
  settings: Settings | null | undefined,
): string[] {
  const sanitizedCommands = sanitizeCommentCommands(commands);
  const existingCommands = settings?.clearExistingCommands
    ? []
    : sanitizedCommands;
  return enforceCommandSettings(
    existingCommands,
    getForcedCommandsForFork(threadFork, settings),
  );
}

function getForcedCommandsForFork(
  threadFork: ForkType,
  settings: Settings | null | undefined,
): string[] {
  const commandSettings = settings?.commandSettings;
  if (!commandSettings) {
    return [];
  }

  let configuredCommands: readonly string[] = [];

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

export function chunkThreads(
  threads: CF2Thread[],
  chunkSize: number,
): CF2Thread[][] {
  if (chunkSize <= 0) {
    return [threads];
  }

  const result: CF2Thread[][] = [];
  for (let i = 0; i < threads.length; i += chunkSize) {
    result.push(threads.slice(i, i + chunkSize));
  }
  return result;
}
