/**
 * 正規表現の複雑度を静的解析するモジュール
 *
 * パフォーマンス計測を行わず、ルールベースでパターンの危険度を判定する。
 * バックトラッキング地獄（ReDoS）を引き起こす可能性のあるパターンを検出し、
 * ユーザーに警告と最適化提案を提供する。
 */

import type {
  RegexAnalysisResult,
  RegexAnalysisOptions,
  RegexWarning,
  RegexSuggestion,
  RegexComplexity,
  RegexWarningType,
  RegexWarningSeverity,
} from "@/types/regex-analyzer-types";

/** デフォルトの分析オプション */
const DEFAULT_OPTIONS: Required<RegexAnalysisOptions> = {
  maxPatternLength: 500,
  wildcardThreshold: 3,
};

/**
 * 正規表現パターンを分析して複雑度と警告を返す
 */
export function analyzeRegexPattern(
  pattern: string,
  flags: string = "",
  options: RegexAnalysisOptions = {},
): RegexAnalysisResult {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const warnings: RegexWarning[] = [];
  const suggestions: RegexSuggestion[] = [];
  let score = 0;

  // 空のパターンチェック
  if (!pattern || pattern.trim() === "") {
    return {
      complexity: "low",
      warnings: [
        {
          type: "empty_pattern",
          severity: "info",
          message: "パターンが空です",
        },
      ],
      suggestions: [],
      isValid: false,
      isLiteral: false,
      score: 0,
    };
  }

  // 正規表現として有効かチェック
  const validationResult = validateRegex(pattern, flags);
  if (!validationResult.isValid) {
    return {
      complexity: "low",
      warnings: [
        {
          type: "invalid_regex",
          severity: "error",
          message: `無効な正規表現: ${validationResult.error}`,
        },
      ],
      suggestions: [
        {
          message: "正規表現の構文を確認してください",
        },
      ],
      isValid: false,
      isLiteral: false,
      score: 0,
    };
  }

  // リテラルパターンかチェック
  const isLiteral = isPlainLiteralPattern(pattern);
  if (isLiteral) {
    return {
      complexity: "low",
      warnings: [],
      suggestions: [],
      isValid: true,
      isLiteral: true,
      score: 0,
    };
  }

  // パターン長チェック
  if (pattern.length > opts.maxPatternLength) {
    warnings.push({
      type: "too_long",
      severity: "warning",
      message: `パターンが長すぎます（${String(pattern.length)}文字）。${String(opts.maxPatternLength)}文字以下を推奨します`,
    });
    suggestions.push({
      message: "パターンを短くするか、複数のルールに分割することを検討してください",
    });
    score += 20;
  }

  // ネストされた量指定子の検出（最も危険）
  const nestedQuantifierResult = detectNestedQuantifiers(pattern);
  if (nestedQuantifierResult.detected) {
    warnings.push({
      type: "nested_quantifier",
      severity: "error",
      message:
        "ネストされた量指定子が検出されました。これはバックトラッキング地獄を引き起こす可能性があります",
      problematicPart: nestedQuantifierResult.match,
    });
    suggestions.push({
      message:
        "ネストされた量指定子 (例: (a+)+, (a*)* ) を避けてください。アトミックグループまたは所有量指定子を検討してください",
    });
    score += 50;
  }

  // オーバーラップするアルタネーションの検出
  const overlappingResult = detectOverlappingAlternation(pattern);
  if (overlappingResult.detected) {
    warnings.push({
      type: "overlapping_alternation",
      severity: "error",
      message:
        "オーバーラップするアルタネーションが検出されました。バックトラッキングが発生しやすくなります",
      problematicPart: overlappingResult.match,
    });
    suggestions.push({
      message:
        "アルタネーションの選択肢が重複しないようにしてください（例: a|ab → ab? または ab|a の順序変更）",
    });
    score += 40;
  }

  // 過剰なワイルドカードの検出
  const wildcardResult = detectExcessiveWildcards(pattern, opts.wildcardThreshold);
  if (wildcardResult.detected) {
    warnings.push({
      type: "excessive_wildcards",
      severity: wildcardResult.count >= 4 ? "error" : "warning",
      message: `複数のワイルドカード（.* または .+）が${String(wildcardResult.count)}個検出されました。マッチングが遅くなる可能性があります`,
    });
    suggestions.push({
      message:
        "可能であれば .* を具体的な文字クラス [^x]* に置き換えるか、パターンを分割してください",
    });
    score += wildcardResult.count * 10;
  }

  // 破滅的なバックトラッキングパターンの検出
  const catastrophicResult = detectCatastrophicBacktracking(pattern);
  if (catastrophicResult.detected) {
    warnings.push({
      type: "catastrophic_backtrack",
      severity: "error",
      message: "破滅的なバックトラッキングを引き起こす可能性のあるパターンです",
      problematicPart: catastrophicResult.match,
    });
    suggestions.push({
      message: "パターンを見直し、より具体的な文字クラスを使用することを検討してください",
    });
    score += 60;
  }

  // 貪欲な量指定子の連鎖検出
  const greedyChainResult = detectGreedyQuantifierChain(pattern);
  if (greedyChainResult.detected) {
    warnings.push({
      type: "greedy_quantifier_chain",
      severity: "warning",
      message: "貪欲な量指定子が連続しています。非貪欲（?）修飾子の使用を検討してください",
      problematicPart: greedyChainResult.match,
    });
    suggestions.push({
      message: ".*? や .+? などの非貪欲量指定子を使用すると効率が改善される場合があります",
    });
    score += 15;
  }

  // 複雑な先読み/後読みの検出
  const lookaheadResult = detectComplexLookahead(pattern);
  if (lookaheadResult.detected) {
    warnings.push({
      type: "complex_lookahead",
      severity: "warning",
      message: "複雑な先読み/後読みアサーションが検出されました",
      problematicPart: lookaheadResult.match,
    });
    score += 20;
  }

  // 複雑度レベルを決定
  const complexity = determineComplexity(score, warnings);

  return {
    complexity,
    warnings,
    suggestions,
    isValid: true,
    isLiteral: false,
    score,
  };
}

/**
 * 正規表現が有効かどうかを検証
 */
function validateRegex(
  pattern: string,
  flags: string,
): { isValid: boolean; error?: string } {
  try {
    new RegExp(pattern, flags);
    return { isValid: true };
  } catch (e) {
    const error = e instanceof Error ? e.message : "Unknown error";
    return { isValid: false, error };
  }
}

/**
 * パターンがリテラル（メタ文字を含まない）かどうかを判定
 */
function isPlainLiteralPattern(pattern: string): boolean {
  // 正規表現メタ文字をチェック
  const REGEX_META_CHARS = /[.*+?^${}()|[\]\\]/;
  return !REGEX_META_CHARS.test(pattern);
}

/**
 * ネストされた量指定子を検出
 * 例: (a+)+, (a*)+, (a+)*, (a+){2,} など
 */
function detectNestedQuantifiers(
  pattern: string,
): { detected: boolean; match?: string } {
  // グループの後に量指定子があり、グループ内にも量指定子がある場合を検出
  // (...)+ や (...)* などのパターンで、グループ内に +, *, {n,m} がある
  const nestedPattern =
    /\([^)]*[+*][^)]*\)[+*?]|\([^)]*[+*][^)]*\)\{[0-9,]+\}|\([^)]*\{[0-9,]+\}[^)]*\)[+*?]/;
  const match = pattern.match(nestedPattern);

  if (match) {
    return { detected: true, match: match[0] };
  }

  // より深いネストも検出: ((a+)+)
  const deepNestedPattern = /\(\s*\([^)]*[+*][^)]*\)\s*\)[+*?]/;
  const deepMatch = pattern.match(deepNestedPattern);
  if (deepMatch) {
    return { detected: true, match: deepMatch[0] };
  }

  return { detected: false };
}

/**
 * オーバーラップするアルタネーションを検出
 * 例: (a|ab)+, (x|xy|xyz)+ など
 */
function detectOverlappingAlternation(
  pattern: string,
): { detected: boolean; match?: string } {
  // アルタネーションを含むグループの後に量指定子がある場合
  const alternationWithQuantifier = /\([^)]*\|[^)]*\)[+*]/;
  const match = pattern.match(alternationWithQuantifier);

  if (match) {
    // グループ内のアルタネーションを抽出
    const groupContent = match[0].slice(1, -2); // ( と )+/* を除去
    const alternatives = groupContent.split("|");

    // 選択肢がプレフィックスの関係にあるかチェック
    for (let i = 0; i < alternatives.length; i++) {
      for (let j = 0; j < alternatives.length; j++) {
        if (i !== j) {
          const a = alternatives[i];
          const b = alternatives[j];
          if (a.startsWith(b) || b.startsWith(a)) {
            return { detected: true, match: match[0] };
          }
        }
      }
    }
  }

  return { detected: false };
}

/**
 * 過剰なワイルドカードを検出
 * 例: .*x.*y.*z
 */
function detectExcessiveWildcards(
  pattern: string,
  threshold: number,
): { detected: boolean; count: number } {
  // .* または .+ の出現回数をカウント
  const wildcardPattern = /\.\*|\.\+/g;
  const matches = pattern.match(wildcardPattern);
  const count = matches?.length ?? 0;

  return {
    detected: count >= threshold,
    count,
  };
}

/**
 * 破滅的なバックトラッキングパターンを検出
 */
function detectCatastrophicBacktracking(
  pattern: string,
): { detected: boolean; match?: string } {
  // 典型的な危険パターン
  const dangerousPatterns = [
    // (a+)+ スタイル
    /\([^)]*\+[^)]*\)\+/,
    // (.*a)+ スタイル
    /\(\.\*[^)]+\)\+/,
    // (a|a?)+ スタイル（空マッチ可能なアルタネーション）
    /\([^)]*\|[^)]*\?\)[+*]/,
    // .*.* の連続（間に何もない）
    /\.\*\.\*/,
  ];

  for (const dangerPattern of dangerousPatterns) {
    const match = pattern.match(dangerPattern);
    if (match) {
      return { detected: true, match: match[0] };
    }
  }

  return { detected: false };
}

/**
 * 貪欲な量指定子の連鎖を検出
 * 例: .*.+, a+b*, etc.
 */
function detectGreedyQuantifierChain(
  pattern: string,
): { detected: boolean; match?: string } {
  // 量指定子の後にすぐ別の量指定子付きパターンが続く場合
  const chainPattern = /[+*]\s*[^+*?\s]+[+*]/;
  const match = pattern.match(chainPattern);

  if (match) {
    return { detected: true, match: match[0] };
  }

  return { detected: false };
}

/**
 * 複雑な先読み/後読みを検出
 */
function detectComplexLookahead(
  pattern: string,
): { detected: boolean; match?: string } {
  // 先読み/後読み内に量指定子がある場合
  const lookaheadPattern = /\(\?[=!<][^)]*[+*][^)]*\)/;
  const match = pattern.match(lookaheadPattern);

  if (match) {
    return { detected: true, match: match[0] };
  }

  return { detected: false };
}

/**
 * スコアと警告から複雑度レベルを決定
 */
function determineComplexity(
  score: number,
  warnings: RegexWarning[],
): RegexComplexity {
  // エラーレベルの警告があれば即座にdangerous
  const hasError = warnings.some((w) => w.severity === "error");
  if (hasError) {
    return "dangerous";
  }

  // スコアベースで判定
  if (score >= 40) {
    return "high";
  }
  if (score >= 20) {
    return "medium";
  }
  return "low";
}

/**
 * 複雑度レベルに対応する表示用テキストを取得
 */
export function getComplexityLabel(complexity: RegexComplexity): string {
  switch (complexity) {
    case "low":
      return "低";
    case "medium":
      return "中";
    case "high":
      return "高";
    case "dangerous":
      return "危険";
  }
}

/**
 * 複雑度レベルに対応するCSSクラス名を取得
 */
export function getComplexityCssClass(complexity: RegexComplexity): string {
  switch (complexity) {
    case "low":
      return "cf2-complexity-low";
    case "medium":
      return "cf2-complexity-medium";
    case "high":
      return "cf2-complexity-high";
    case "dangerous":
      return "cf2-complexity-dangerous";
  }
}

/**
 * 警告の重要度に対応するCSSクラス名を取得
 */
export function getSeverityCssClass(severity: RegexWarningSeverity): string {
  switch (severity) {
    case "info":
      return "cf2-severity-info";
    case "warning":
      return "cf2-severity-warning";
    case "error":
      return "cf2-severity-error";
  }
}

// エクスポート用の型再エクスポート
export type {
  RegexAnalysisResult,
  RegexAnalysisOptions,
  RegexWarning,
  RegexSuggestion,
  RegexComplexity,
  RegexWarningType,
  RegexWarningSeverity,
};

