/**
 * コメントフィルター高速化用の簡易インデックスユーティリティ。
 * 複数のリテラルパターンを一括検索できる Aho–Corasick 実装と
 * 正規表現が純粋なリテラルかどうかを判定するヘルパー関数を提供する。
 */

interface AhoCorasickNode {
  transitions: Map<string, number>;
  failure: number;
  outputs: number[];
}

class AhoCorasickMachine {
  private nodes: AhoCorasickNode[] = [];
  private built = false;

  constructor() {
    this.nodes.push(this.createNode());
  }

  private createNode(): AhoCorasickNode {
    return {
      transitions: new Map(),
      failure: 0,
      outputs: []
    };
  }

  public add(pattern: string, outputId: number): void {
    if (this.built) {
      throw new Error('AhoCorasickMachine cannot add pattern after build().');
    }

    let nodeIndex = 0;
    for (const char of pattern) {
      const node = this.nodes[nodeIndex];
      const nextIndex = node.transitions.get(char);
      if (nextIndex !== undefined) {
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

  public build(): void {
    if (this.built) {
      return;
    }

    const queue: number[] = [];

    // 1文字遷移を初期化
    for (const [, nextIndex] of this.nodes[0].transitions.entries()) {
      this.nodes[nextIndex].failure = 0;
      queue.push(nextIndex);
    }

    // BFS で failure link を張る
    while (queue.length > 0) {
      const current = queue.shift()!;
      const currentNode = this.nodes[current];

      for (const [char, nextIndex] of currentNode.transitions.entries()) {
        queue.push(nextIndex);

        let failure = currentNode.failure;
        while (failure !== 0 && !this.nodes[failure].transitions.has(char)) {
          failure = this.nodes[failure].failure;
        }

        const fallback = this.nodes[failure].transitions.get(char);
        this.nodes[nextIndex].failure = fallback !== undefined ? fallback : 0;
        const failureOutputs = this.nodes[this.nodes[nextIndex].failure].outputs;
        if (failureOutputs.length > 0) {
          this.nodes[nextIndex].outputs.push(...failureOutputs);
        }
      }
    }

    this.built = true;
  }

  public search(text: string): number[] {
    if (!this.built) {
      throw new Error('AhoCorasickMachine must call build() before search().');
    }

    const results: number[] = [];
    let nodeIndex = 0;

    for (const char of text) {
      while (nodeIndex !== 0 && !this.nodes[nodeIndex].transitions.has(char)) {
        nodeIndex = this.nodes[nodeIndex].failure;
      }

      const nextIndex = this.nodes[nodeIndex].transitions.get(char);
      if (nextIndex !== undefined) {
        nodeIndex = nextIndex;
      }

      if (this.nodes[nodeIndex].outputs.length > 0) {
        results.push(...this.nodes[nodeIndex].outputs);
      }
    }

    return results;
  }

  public hasPatterns(): boolean {
    return this.nodes.length > 1;
  }
}

interface PatternEntry {
  pattern: string;
  outputId: number;
}

/**
 * 大文字小文字を区別するパターンと区別しないパターンを別々のトライで管理する。
 * 返り値は重複排除済みのルールインデックスリスト。
 */
export class SubstringMatcher {
  private caseSensitivePatterns: PatternEntry[] = [];
  private caseSensitiveOutputs: number[][] = [];
  private caseSensitiveIds = new Map<string, number>();
  private caseSensitiveMachine: AhoCorasickMachine | null = null;

  private caseInsensitivePatterns: PatternEntry[] = [];
  private caseInsensitiveOutputs: number[][] = [];
  private caseInsensitiveIds = new Map<string, number>();
  private caseInsensitiveMachine: AhoCorasickMachine | null = null;

  add(pattern: string, ruleIndex: number, caseSensitive: boolean): void {
    if (caseSensitive) {
      const existing = this.caseSensitiveIds.get(pattern);
      if (existing !== undefined) {
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
      if (existing !== undefined) {
        this.caseInsensitiveOutputs[existing].push(ruleIndex);
        return;
      }

      const outputId = this.caseInsensitiveOutputs.length;
      this.caseInsensitiveIds.set(normalized, outputId);
      this.caseInsensitivePatterns.push({ pattern: normalized, outputId });
      this.caseInsensitiveOutputs.push([ruleIndex]);
    }
  }

  build(): void {
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

  match(text: string, lowercaseText?: string): number[] {
    const resultSet = new Set<number>();

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

  hasPatterns(): boolean {
    return Boolean(
      (this.caseSensitiveMachine && this.caseSensitiveMachine.hasPatterns()) ||
      (this.caseInsensitiveMachine && this.caseInsensitiveMachine.hasPatterns())
    );
  }

  needsLowercaseText(): boolean {
    return this.caseInsensitiveMachine !== null;
  }
}

// 正規表現でメタ文字を含むかどうかを簡易的にチェックするための正規表現。
const REGEX_META_CHARS = /[.*+?^${}()|[\]\\]/;

/**
 * 正規表現パターンが純粋なリテラル（メタ文字を含まない）かを判定する。
 */
export function isPlainLiteralPattern(pattern: string): boolean {
  return !REGEX_META_CHARS.test(pattern);
}
