# comment-filter2 正規表現ホットパス比較

## 目的

現行の2,000コメント・1,000ルールベンチをBunのCPU profilerで測ると、`doesPreparedRuleTargetComment()`配下が総CPU時間の約80%を占める。Aho–Corasick検索は約0.2%だったため、この試作は候補抽出単体ではなく、最も重い「コメントごとに正規表現ルールを順番に最終判定するループ」を比較する。

比較対象は次の3つ。

- TypeScript: JavaScript `RegExp.test()`を直接実行する。
- TypeScript必須トークン索引: 各正規表現から安全に必須となる`未出現語<number>`を抽出できたものとしてAho–Corasickで候補を絞り、候補だけをJavaScript `RegExp.test()`で最終確認する。
- Java extension試作: JDK 17の`Pattern`を常駐HTTP endpoint内で実行する。NicoCache_nlの`Processor`と同じブラウザー→ローカルJava境界を模擬する。
- Rust/WASM試作: `regex` crateをWASMへ静的リンクし、バッチ単位で呼び出す。配布物は`.wasm`だけで、利用者側にRustや追加ランタイムは不要。

## 固定条件

- 2,000コメント。
- 複雑な正規表現700ルール。
- 現行ベンチと同じ`未出現語<number>.*末尾`を使い、全ルール不一致とする。
- 1ラウンドあたり1,400,000回の最終判定。
- hideルールと同じく、最初に一致したルール番号を返す。全不一致では`-1`を返す。
- 8回ウォームアップ後、15回の平均・中央値・最小・最大を記録する。

## 実行

前提はBun、JDK 17、Rust stable、`wasm32-unknown-unknown` target。リポジトリルートから次を実行する。

```powershell
cd local/features
bun run benchmark:comment-filter-prototypes
```

JavaとRustのビルド成果物はGit管理外の`.sandbox-tmp/comment-filter-core/`へ出力する。

## 解釈上の制約

ベンチの正規表現は3エンジンで同じ結果になる互換サブセットに限定する。Java `Pattern`とRust `regex`はJavaScript `RegExp`の完全互換ではない。特にRust `regex`はlookaroundと後方参照をサポートしないため、採用時は互換サブセットだけを移植し、その他をJavaScriptへ戻す必要がある。

Rust試作は`regex` 1.13.1を使用する。MIT OR Apache-2.0で、WASMへ静的リンクされるため利用者側の追加依存はない。ビルド時のみCargoが依存crateを取得する。

## 2026-07-19 実測結果

環境はAMD Ryzen 7 9800X3D、Bun 1.3.14、JDK 17、Rust stable。値は中央値。

| 実装                                             | 正規表現ループ | 境界込みバッチ | ルール構築 | 備考                                                |
| ------------------------------------------------ | -------------: | -------------: | ---------: | --------------------------------------------------- |
| TypeScript / JavaScript `RegExp`                 |      39.524 ms |           なし |   0.382 ms | 現行ホットパスを直接再現                            |
| TypeScript / 必須トークン索引 + `RegExp`最終確認 |       3.057 ms |           なし |   2.864 ms | 現行比約12.9倍                                      |
| Java `Pattern`                                   |      82.192 ms |      85.746 ms |   3.864 ms | TypeScript直接実行より約2.1倍遅い                   |
| Rust `regex` / WASM                              |      41.091 ms |      39.863 ms |  49.393 ms | TypeScript直接実行とほぼ同等、WASMは1,149,063 bytes |

この条件では、言語移植だけでは現行TypeScriptを上回らない。最も大きい改善はJavaScript互換の最終判定を残し、正規表現から安全な必須トークンを抽出して候補を減らす方式だった。Java extension化やRust/WASM化は、この索引適用後も実ページの総時間でマッチングが支配的な場合に再検討する。
