import { RegExpParser, type AST } from "@eslint-community/regexpp";

const MIN_TOKEN_LENGTH = 2;
const parser = new RegExpParser({ ecmaVersion: 2025 });

export interface RequiredTokenRuleCandidate {
  ruleIndex: number;
  tokens: string[];
  caseSensitive: boolean;
}

/**
 * 正規表現が一致する本文に必ず含まれるリテラル候補を抽出する。
 *
 * ここで取りこぼし（偽陰性）が起きるとルール自体が評価されなくなるため、
 * 判定できない構文は最適化せず、空配列を返して通常の RegExp 評価へ戻す。
 */
export function extractRequiredLiteralTokens(
  pattern: string,
  flags: string,
): string[] {
  try {
    const ast = parser.parsePattern(pattern, 0, pattern.length, {
      unicode: flags.includes("u"),
      unicodeSets: flags.includes("v"),
    });

    // インライン修飾子は部分ごとに大文字小文字の意味が変わる。候補ごとの
    // フラグ管理を誤るより、該当ルールだけ通常評価へ戻す方が安全である。
    if (containsModifiers(ast.alternatives)) {
      return [];
    }

    const required = requiredTokensAcrossAlternatives(ast.alternatives);
    const normalized = flags.includes("i")
      ? normalizeCaseInsensitiveTokens(required, flags)
      : required;

    return pruneTokens(normalized);
  } catch {
    return [];
  }
}

/** 純粋リテラル全体を候補キーにしても JS RegExp と同値かを判定する。 */
export function canUsePlainLiteralPrefilter(
  pattern: string,
  flags: string,
): boolean {
  if (!flags.includes("i")) {
    return true;
  }

  const unicodeCaseFolding = flags.includes("u") || flags.includes("v");
  return Array.from(pattern).every((char) =>
    isSafeCaseInsensitiveCharacter(char, unicodeCaseFolding),
  );
}

/** ルール集合内で出現頻度が低く、長い必須トークンを各ルールへ割り当てる。 */
export function selectRequiredTokens(
  candidates: RequiredTokenRuleCandidate[],
): Map<number, string> {
  const frequencies = new Map<string, number>();
  const keyOf = (token: string, caseSensitive: boolean): string =>
    `${caseSensitive ? "s" : "i"}\0${caseSensitive ? token : token.toLowerCase()}`;

  for (const candidate of candidates) {
    for (const token of new Set(candidate.tokens)) {
      const key = keyOf(token, candidate.caseSensitive);
      frequencies.set(key, (frequencies.get(key) ?? 0) + 1);
    }
  }

  const selected = new Map<number, string>();
  for (const candidate of candidates) {
    const token = [...candidate.tokens].sort((left, right) => {
      const frequencyDifference =
        (frequencies.get(keyOf(left, candidate.caseSensitive)) ?? 0) -
        (frequencies.get(keyOf(right, candidate.caseSensitive)) ?? 0);
      return frequencyDifference !== 0
        ? frequencyDifference
        : compareTokens(left, right);
    })[0];
    if (token !== undefined) {
      selected.set(candidate.ruleIndex, token);
    }
  }

  return selected;
}

function requiredTokensAcrossAlternatives(
  alternatives: AST.Alternative[],
): Set<string> {
  if (alternatives.length === 0) {
    return new Set();
  }

  let common = requiredTokensFromAlternative(alternatives[0]);
  for (let index = 1; index < alternatives.length; index++) {
    const branchTokens = requiredTokensFromAlternative(alternatives[index]);
    common = new Set([...common].filter((token) => branchTokens.has(token)));
    if (common.size === 0) {
      break;
    }
  }

  return common;
}

function requiredTokensFromAlternative(
  alternative: AST.Alternative,
): Set<string> {
  const tokens = new Set<string>();
  let literalRun = "";

  const flushLiteralRun = (): void => {
    if (literalRun.length > 0) {
      tokens.add(literalRun);
      literalRun = "";
    }
  };

  for (const element of alternative.elements) {
    if (element.type === "Character") {
      literalRun += String.fromCodePoint(element.value);
      continue;
    }

    flushLiteralRun();
    for (const token of requiredTokensFromElement(element)) {
      tokens.add(token);
    }
  }

  flushLiteralRun();
  return tokens;
}

function requiredTokensFromElement(element: AST.Element): Set<string> {
  switch (element.type) {
    case "CapturingGroup":
    case "Group":
      return requiredTokensAcrossAlternatives(element.alternatives);
    case "Quantifier":
      return element.min > 0
        ? requiredTokensFromQuantifiedElement(element.element)
        : new Set();
    default:
      // 文字クラス、文字集合、後方参照、lookaround、境界は安全な
      // リテラルをこのノード単独では保証できない。
      return new Set();
  }
}

function requiredTokensFromQuantifiedElement(
  element: AST.QuantifiableElement,
): Set<string> {
  if (element.type === "Character") {
    return new Set([String.fromCodePoint(element.value)]);
  }
  if (element.type === "CapturingGroup" || element.type === "Group") {
    return requiredTokensAcrossAlternatives(element.alternatives);
  }
  return new Set();
}

function containsModifiers(alternatives: AST.Alternative[]): boolean {
  for (const alternative of alternatives) {
    for (const element of alternative.elements) {
      if (element.type === "Group" || element.type === "CapturingGroup") {
        if (element.type === "Group" && element.modifiers !== null) {
          return true;
        }
        if (containsModifiers(element.alternatives)) {
          return true;
        }
      } else if (
        element.type === "Quantifier" &&
        (element.element.type === "Group" ||
          element.element.type === "CapturingGroup")
      ) {
        const quantifiedGroup = element.element;
        if (
          quantifiedGroup.type === "Group" &&
          quantifiedGroup.modifiers !== null
        ) {
          return true;
        }
        if (containsModifiers(quantifiedGroup.alternatives)) {
          return true;
        }
      }
    }
  }
  return false;
}

function normalizeCaseInsensitiveTokens(
  tokens: Set<string>,
  flags: string,
): Set<string> {
  const normalized = new Set<string>();
  const unicodeCaseFolding = flags.includes("u") || flags.includes("v");

  for (const token of tokens) {
    let safeRun = "";
    const flushSafeRun = (): void => {
      if (safeRun.length > 0) {
        normalized.add(safeRun.toLowerCase());
        safeRun = "";
      }
    };

    for (const char of token) {
      if (isSafeCaseInsensitiveCharacter(char, unicodeCaseFolding)) {
        safeRun += char;
      } else {
        flushSafeRun();
      }
    }
    flushSafeRun();
  }

  return normalized;
}

function isSafeCaseInsensitiveCharacter(
  char: string,
  unicodeCaseFolding: boolean,
): boolean {
  // 大文字・小文字を持たない文字は、どの case-folding モードでも不変。
  if (char.toLowerCase() === char.toUpperCase()) {
    return true;
  }

  // 非 Unicode モードの ASCII は JS RegExp と toLowerCase() が一致する。
  // Unicode モードでは長い s や Kelvin 記号などが ASCII と一致するため、
  // cased character を候補に使わない。
  return !unicodeCaseFolding && (char.codePointAt(0) ?? 0) <= 0x7f;
}

function pruneTokens(tokens: Set<string>): string[] {
  const candidates = [...tokens].filter(
    (token) => Array.from(token).length >= MIN_TOKEN_LENGTH,
  );

  return candidates
    .filter(
      (token) =>
        !candidates.some(
          (other) =>
            other !== token &&
            other.length > token.length &&
            other.includes(token),
        ),
    )
    .sort(compareTokens);
}

function compareTokens(left: string, right: string): number {
  const lengthDifference = Array.from(right).length - Array.from(left).length;
  return lengthDifference !== 0 ? lengthDifference : left.localeCompare(right);
}
