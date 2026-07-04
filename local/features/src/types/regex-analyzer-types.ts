/**
 * 正規表現の複雑度分析に関する型定義
 */

/**
 * 正規表現の複雑度レベル
 * - low: 問題なし（リテラル文字列、単純なパターン）
 * - medium: 注意が必要（複数のワイルドカード等）
 * - high: 警告（複雑なパターン）
 * - dangerous: 危険（バックトラッキング地獄を引き起こす可能性が高い）
 */
export type RegexComplexity = "low" | "medium" | "high" | "dangerous";

/**
 * 警告の種類
 */
export type RegexWarningType =
  | "nested_quantifier" // ネストされた量指定子: (a+)+
  | "overlapping_alternation" // オーバーラップするアルタネーション: (a|aa)+
  | "excessive_wildcards" // 過剰なワイルドカード: .*x.*y.*z
  | "catastrophic_backtrack" // 破滅的なバックトラッキングパターン
  | "too_long" // 長すぎるパターン
  | "empty_pattern" // 空のパターン
  | "invalid_regex" // 無効な正規表現
  | "greedy_quantifier_chain" // 貪欲な量指定子の連鎖
  | "complex_lookahead"; // 複雑な先読み/後読み

/**
 * 警告の重要度
 */
export type RegexWarningSeverity = "info" | "warning" | "error";

/**
 * 正規表現警告の詳細
 */
export interface RegexWarning {
  /** 警告の種類 */
  type: RegexWarningType;
  /** 重要度 */
  severity: RegexWarningSeverity;
  /** ユーザーに表示するメッセージ */
  message: string;
  /** パターン内の問題箇所（任意） */
  position?: {
    start: number;
    end: number;
  };
  /** 問題のあるパターンの一部（任意） */
  problematicPart?: string;
}

/**
 * 最適化提案
 */
export interface RegexSuggestion {
  /** 提案内容 */
  message: string;
  /** 修正案（あれば） */
  suggestedPattern?: string;
}

/**
 * 正規表現分析結果
 */
export interface RegexAnalysisResult {
  /** 複雑度レベル */
  complexity: RegexComplexity;
  /** 検出された警告リスト */
  warnings: RegexWarning[];
  /** 最適化提案リスト */
  suggestions: RegexSuggestion[];
  /** パターンが有効な正規表現かどうか */
  isValid: boolean;
  /** リテラルパターンかどうか（メタ文字なし） */
  isLiteral: boolean;
  /** 複雑度スコア（0-100: デバッグ用） */
  score: number;
}

/**
 * 分析オプション
 */
export interface RegexAnalysisOptions {
  /** 長すぎると判断するパターン長の閾値（デフォルト: 500） */
  maxPatternLength?: number;
  /** 警告を生成するワイルドカードの連続数（デフォルト: 3） */
  wildcardThreshold?: number;
}
