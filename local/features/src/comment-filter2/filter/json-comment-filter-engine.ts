import { CONSTANTS } from '@/comment-filter2/utils/constants';
import { sanitizeCommentBody, sanitizeCommentCommands } from '@/comment-filter2/utils/sanitizer';
import { CF2Comment, CF2Thread, Settings } from '@/types/filter-types';
import { NgRuleJson, NicoruCond, Action } from '@/types/filter-types';
import { SubstringMatcher, isPlainLiteralPattern } from './rule-indexer';
import { computeThreadNicoruStats, ThreadNicoruStats } from './thread-nicoru-stats';
import { chunkThreads } from './comment-filter-engine';

export interface PreparedJsonRule {
  rule: NgRuleJson;
  index: number;
  compiledRegex?: RegExp;
  isUserRule: boolean;
  hasLiteralPrefilter: boolean;
  normalizedNicoruCond?: NormalizedNicoruCond;
}

export interface PreparedJsonRuleSet {
  rules: PreparedJsonRule[];
  userIdRuleIndexes: Map<string, number[]>;
  substringMatcher: SubstringMatcher | null;
  needsLowercase: boolean;
}

export interface JsonThreadProcessingContext {
  nicoruStats: ThreadNicoruStats;
  nicoruIneligibleRuleIndexes: Set<number>;
}

export interface JsonRuleMatchEvent {
  comment: CF2Comment;
  rule: NgRuleJson;
  hidden: boolean;
}

export interface FilterJsonThreadArgs {
  thread: CF2Thread;
  preparedRules: PreparedJsonRuleSet;
  settings: Settings | null | undefined;
  regexCache: Map<string, RegExp>;
}

export interface FilterJsonThreadResult {
  comments: CF2Comment[];
  logs: JsonRuleMatchEvent[];
}

type ForkType = 'main' | 'easy' | 'owner';

type NormalizedNicoruMode = 'include' | 'exclude';

export interface NormalizedNicoruCond {
  op: NicoruCond['op'];
  mode: NormalizedNicoruMode;
  value: number;
  rangeEnd?: number;
  isValid: boolean;
}

export function prepareJsonRules(
  rules: NgRuleJson[],
  currentSmid: string | null,
  regexCache: Map<string, RegExp>
): PreparedJsonRuleSet {
  const preparedRules: PreparedJsonRule[] = [];
  const userIdRuleIndexes = new Map<string, number[]>();
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

    const preparedRule: PreparedJsonRule = {
      rule,
      index,
      compiledRegex: undefined,
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
      const flags = rule.flags || 'gi';
      preparedRule.compiledRegex = getRegex(regexCache, rule.pattern, flags);

      if (isPlainLiteralPattern(rule.pattern)) {
        const isCaseSensitive = !flags.includes('i');
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

export function filterJsonThread({
  thread,
  preparedRules,
  settings,
  regexCache
}: FilterJsonThreadArgs): FilterJsonThreadResult {
  const logs: JsonRuleMatchEvent[] = [];
  const threadContext = buildJsonThreadContext(thread.comments, preparedRules);

  const comments = thread.comments
    .map(comment =>
      applyRulesToComment({
        originalComment: comment,
        preparedRules,
        threadContext,
        threadFork: thread.fork as ForkType,
        commandSettings: settings?.commandSettings ?? null,
        regexCache,
        logCollector: logs
      })
    )
    .filter((comment): comment is CF2Comment => comment !== null);

  return {
    comments,
    logs
  };
}

interface ApplyJsonRuleOptions {
  originalComment: CF2Comment;
  preparedRules: PreparedJsonRuleSet;
  threadContext: JsonThreadProcessingContext;
  threadFork: ForkType;
  commandSettings: SettingsCommandOptions | null;
  regexCache: Map<string, RegExp>;
  logCollector: JsonRuleMatchEvent[];
}

interface SettingsCommandOptions {
  owner: string[];
  main: string[];
  easy: string[];
}

function applyRulesToComment({
  originalComment,
  preparedRules,
  threadContext,
  threadFork,
  commandSettings,
  regexCache,
  logCollector
}: ApplyJsonRuleOptions): CF2Comment | null {
  const processedComment: CF2Comment = { ...originalComment };
  processedComment.commands = normalizeCommands(processedComment.commands);

  if ([CONSTANTS.FORK_TYPES.EASY, CONSTANTS.FORK_TYPES.MAIN, CONSTANTS.FORK_TYPES.OWNER].includes(threadFork)) {
    processedComment.isPremium = true;
  }

  let ruleApplied = false;
  let shouldHideComment = false;
  let shouldApplyCommands = true;
  let appliedRule: NgRuleJson | null = null;

  const userRuleIndexes = preparedRules.userIdRuleIndexes.get(originalComment.userId) ?? [];
  const activeUserRuleIndexes = new Set<number>(userRuleIndexes);

  const matcher = preparedRules.substringMatcher;
  const originalBody = originalComment.body ?? '';
  const lowercaseBody = preparedRules.needsLowercase ? originalBody.toLocaleLowerCase() : undefined;
  const literalCandidateIndexes = matcher
    ? new Set<number>(matcher.match(originalBody, lowercaseBody))
    : new Set<number>();

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

      const reusableRegex = preparedRule.compiledRegex ?? getRegex(regexCache, rule.pattern, rule.flags || 'gi');
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

    const nicoruOk = evaluateNicoruCondition(preparedRule.normalizedNicoruCond, originalComment.nicoruCount);
    if (!nicoruOk) {
      continue;
    }

    appliedRule = rule;
    ruleApplied = true;

    const actionResult = executeAction(rule.action, processedComment.body, rule, preparedRule.compiledRegex ?? getRegex(regexCache, rule.pattern ?? '', rule.flags || 'gi'));

    logCollector.push({
      comment: originalComment,
      rule,
      hidden: actionResult.type === 'hide'
    });

    if (actionResult.type === 'hide') {
      shouldHideComment = true;
      processedComment.body = '';
      processedComment.commands.push('invisible');
      break;
    }

    if (actionResult.type === 'replace' && actionResult.newText !== undefined) {
      processedComment.body = actionResult.newText;
    }
  }

  if (shouldHideComment) {
    processedComment.body = '';
    if (!processedComment.commands.includes('invisible')) {
      processedComment.commands.push('invisible');
    }
  }

  if (ruleApplied && appliedRule?.nicoru_cond?.mode === 'exclude') {
    shouldApplyCommands = false;
  }

  if ([CONSTANTS.FORK_TYPES.EASY, CONSTANTS.FORK_TYPES.MAIN, CONSTANTS.FORK_TYPES.OWNER].includes(threadFork)) {
    processedComment.commands = applyForkCommandSettings(processedComment.commands, threadFork, shouldApplyCommands, commandSettings);
  } else if (shouldApplyCommands) {
    processedComment.commands = sanitizeCommentCommands(processedComment.commands);
  }

  if (ruleApplied) {
    processedComment.body = sanitizeCommentBody(processedComment.body);
  }

  return processedComment;
}

function normalizeNicoruCondition(cond?: NicoruCond): NormalizedNicoruCond | undefined {
  if (!cond) {
    return undefined;
  }

  const modeValue = (cond.mode ?? 'exclude').toString().trim().toLowerCase();
  const mode: NormalizedNicoruMode = modeValue === 'include' ? 'include' : 'exclude';

  if (cond.op === 'range') {
    if (!Array.isArray(cond.value) || cond.value.length !== 2) {
      return undefined;
    }

    const start = toNumber(cond.value[0]);
    const end = toNumber(cond.value[1]);
    if (start === null || end === null) {
      return undefined;
    }

    const normalizedStart = Math.min(start, end);
    const normalizedEnd = Math.max(start, end);

    return {
      op: 'range',
      mode,
      value: normalizedStart,
      rangeEnd: normalizedEnd,
      isValid: true
    };
  }

  const numericValue = toNumber(cond.value);
  if (numericValue === null) {
    return undefined;
  }

  return {
    op: cond.op,
    mode,
    value: numericValue,
    isValid: true
  };
}

function buildJsonThreadContext(
  comments: CF2Comment[],
  preparedRules: PreparedJsonRuleSet
): JsonThreadProcessingContext {
  const nicoruStats = computeThreadNicoruStats(comments);
  const nicoruIneligibleRuleIndexes = new Set<number>();

  for (const preparedRule of preparedRules.rules) {
    const normalized = preparedRule.normalizedNicoruCond;
    if (!normalized) {
      continue;
    }

    const { canBeMet, canBeUnmet } = evaluateNicoruPossibility(normalized, nicoruStats);
    const shouldInclude = normalized.mode === 'include' ? canBeMet : canBeUnmet;
    if (!shouldInclude) {
      nicoruIneligibleRuleIndexes.add(preparedRule.index);
    }
  }

  return {
    nicoruStats,
    nicoruIneligibleRuleIndexes
  };
}

function checkSmidCondition(smids: string[], currentSmid: string | null): boolean {
  if (smids.includes('ALL')) {
    return true;
  }

  return currentSmid ? smids.includes(currentSmid) : false;
}

function evaluateNicoruPossibility(
  cond: NormalizedNicoruCond,
  stats: ThreadNicoruStats
): { canBeMet: boolean; canBeUnmet: boolean } {
  const total = stats.totalComments;

  if (total === 0) {
    return { canBeMet: false, canBeUnmet: false };
  }

  switch (cond.op) {
    case '=': {
      const metCount = stats.countsByValue.get(cond.value) ?? 0;
      return {
        canBeMet: metCount > 0,
        canBeUnmet: metCount < total
      };
    }
    case '>': {
      const canBeMet = stats.maxNicoru > cond.value;
      const canBeUnmet = stats.minNicoru <= cond.value;
      return { canBeMet, canBeUnmet };
    }
    case '<': {
      const canBeMet = stats.minNicoru < cond.value;
      const canBeUnmet = stats.maxNicoru >= cond.value;
      return { canBeMet, canBeUnmet };
    }
    case '>=': {
      const canBeMet = stats.maxNicoru >= cond.value;
      const canBeUnmet = stats.minNicoru < cond.value;
      return { canBeMet, canBeUnmet };
    }
    case '<=': {
      const canBeMet = stats.minNicoru <= cond.value;
      const canBeUnmet = stats.maxNicoru > cond.value;
      return { canBeMet, canBeUnmet };
    }
    case 'range': {
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

function evaluateNicoruCondition(
  cond: NormalizedNicoruCond | undefined,
  commentNicoruCount: number | string
): boolean {
  if (!cond || !cond.isValid) {
    return true;
  }

  const numericValue = toNumber(commentNicoruCount) ?? 0;

  switch (cond.op) {
    case '=':
      return numericValue === cond.value;
    case '>':
      return numericValue > cond.value;
    case '<':
      return numericValue < cond.value;
    case '>=':
      return numericValue >= cond.value;
    case '<=':
      return numericValue <= cond.value;
    case 'range':
      return cond.rangeEnd !== undefined && numericValue >= cond.value && numericValue <= cond.rangeEnd;
    default:
      return true;
  }
}

function executeAction(
  action: Action,
  text: string,
  rule: NgRuleJson,
  compiledRegex: RegExp
): { type: 'hide' | 'replace' | 'none'; newText?: string } {
  if (action.type === 'hide') {
    return { type: 'hide' };
  }

  if (action.type === 'replace' && rule.pattern) {
    const regex = compiledRegex;
    if (regex.global) {
      regex.lastIndex = 0;
    }
    const newText = text.replace(regex, action.replacement);
    if (regex.global) {
      regex.lastIndex = 0;
    }
    return { type: 'replace', newText };
  }

  return { type: 'none' };
}

function applyForkCommandSettings(
  commands: string[],
  threadFork: ForkType,
  shouldApplyCommands: boolean,
  commandSettings: SettingsCommandOptions | null
): string[] {
  if (!shouldApplyCommands) {
    return sanitizeCommentCommands(commands);
  }

  if (!commandSettings) {
    return sanitizeCommentCommands(commands);
  }

  const allowedCommands = getAllowedCommandsForFork(threadFork, commandSettings);
  const sanitizedCommands = sanitizeCommentCommands(commands);

  return sanitizedCommands.filter(command => {
    if (/^#[0-9A-Fa-f]{6}$/.test(command)) {
      return true;
    }
    return allowedCommands.includes(command.toLowerCase());
  });
}

function getAllowedCommandsForFork(
  threadFork: ForkType,
  commandSettings: SettingsCommandOptions
): string[] {
  switch (threadFork) {
    case CONSTANTS.FORK_TYPES.OWNER:
      return commandSettings.owner;
    case CONSTANTS.FORK_TYPES.MAIN:
      return commandSettings.main;
    case CONSTANTS.FORK_TYPES.EASY:
      return commandSettings.easy;
    default:
      return [];
  }
}

function normalizeCommands(commands: string | string[] | null | undefined): string[] {
  if (!commands) {
    return [];
  }

  if (Array.isArray(commands)) {
    return commands
      .filter(cmd => cmd !== null && cmd !== undefined && cmd !== '')
      .map(cmd => String(cmd).trim())
      .filter(cmd => cmd.length > 0);
  }

  if (typeof commands === 'string') {
    return commands
      .trim()
      .split(/\s+/)
      .filter(cmd => cmd.length > 0);
  }

  return [];
}

function getRegex(cache: Map<string, RegExp>, pattern: string, flags: string): RegExp {
  const cacheKey = `${pattern}:::${flags}`;

  if (cache.has(cacheKey)) {
    return cache.get(cacheKey)!;
  }

  const regex = new RegExp(pattern, flags);
  cache.set(cacheKey, regex);
  return regex;
}

function toNumber(value: unknown): number | null {
  if (typeof value === 'number') {
    return value;
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? null : parsed;
  }
  return null;
}

export { chunkThreads };
