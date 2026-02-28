# Comment Filter2

CommentFilter2 は、ニコニコ動画のコメントを **強力にフィルタリング** するための機能です。  
ルールは主に **JSON Lines（.jsonl）形式** で管理・実行されます（CSV は移行専用）。

## 設定画面

![CommentFilter2 設定画面](https://www.nicovideo.jp/local/images/comment-filter2.avif)

## ルール形式について

- **JSON Lines形式（メイン）**: 実際のフィルタリングに使用される形式（1行に1つの JSON オブジェクト）
- **CSV形式（移行専用）**: 従来形式からの移行（マイグレーション）用途のみ

**重要**: CSV 形式のルールは自動的に JSON Lines 形式に変換されてから実行されます。

## JSON Lines形式（メイン形式）

### 基本構造

```json
{
  "pattern": "正規表現パターン",
  "flags": "gi",
  "action": { "type": "replace", "replacement": "置換後文字列" },
  "smid": ["ALL"],
  "enabled": true
}
```

### パターンマッチングルール

```json
{"pattern":"バカ|アホ","flags":"gi","action":{"type":"replace","replacement":"***"},"smid":["ALL"]}
```

### ユーザーIDルール

```json
{"userId":"TKAF1N8IB3c8D0WJ3l8xixNrwyQ","action":{"type":"hide"},"smid":["ALL"]}
```

### アクションタイプ

- **hide**: コメントを非表示にする

```json
{"action":{"type":"hide"}}
```

- **replace**: コメントを置換する（正規表現ルールのみ対応）

```json
{"action":{"type":"replace","replacement":"置換後文字列"}}
```

- **unspecified**: 未指定（デフォルト動作、ニコる数条件との組み合わせ専用）

```json
{"action":{"type":"unspecified"}}
```

### 重要な制限事項

- **ユーザーIDルール**は `hide`（非表示）と `unspecified`（除外のみ）にのみ対応
- **replace**（置換）は正規表現ルールでのみ利用可能
- **unspecified**（除外のみ）は **ニコる数条件と同時設定を前提** としており、単独では意味がありません

### SMID指定

- **全動画対象**: `"smid": ["ALL"]`
- **特定動画のみ**: `"smid": ["sm1234567890"]`
- **複数動画**: `"smid": ["sm1234567890", "sm0987654321"]`

### ニコる条件（オプション）

```json
"nicoru_cond": {"op": ">=", "value": 5, "mode": "exclude"}
```

```json
"nicoru_cond": {"op": "range", "value": [3, 10], "mode": "include"}
```

- **演算子**: `=` / `>` / `<` / `>=` / `<=` / `range`
- **モード**: `include`（条件に合致するもののみ） / `exclude`（条件に合致するものを除外）

### その他のオプション

- **enabled**: ルールの有効/無効（デフォルト: `true`）
- **description**: ルールの説明文
- **id**: ルールの一意識別子
- **flags**: 正規表現フラグ（デフォルト: `"gi"`）

### 完全な例

```jsonc
// コメント行（// または # で開始）
{"pattern":"荒らし|スパム","flags":"gi","action":{"type":"hide"},"smid":["ALL"],"description":"荒らしコメント除去"}
{"userId":"TKAF1N8IB3c8D0WJ3l8xixNrwyQ","action":{"type":"hide"},"smid":["sm1234567890"],"nicoru_cond":{"op":"<","value":3,"mode":"include"}}
{"pattern":"草+","flags":"g","action":{"type":"replace","replacement":"w"},"smid":["ALL"],"enabled":false}
```

## CSV形式（マイグレーション専用）

**注意**: CSV 形式は従来形式からの移行専用です。実際のフィルタリングは JSON Lines 形式で実行されます。

### 基本（正規表現ルール）

`/正規表現/,/置換後表現/,SMID,ニコる数` の順番で入力します。

例:

`/置換したいコメント/,/置換された後のコメント/,sm1234567890,3`

- **置換後表現**: 置換したいものがないときは `/EMPTY/`
- **SMID**: 特定の動画でのみ動作させる場合に指定。全動画対象の場合は `ALL`
- **ニコる数**: 指定した数以上のニコる数を持つコメントをフィルターから除外。指定なしの場合は `EMPTY`

全動画対象の例:

`/正規表現/,/EMPTY/,ALL,EMPTY`

### 複雑な正規表現（量指定子）の入力方法

`{1,10}` などの量指定子を含む正規表現は、**ダブルクォートで囲んで入力**してください。

- `"/(([^\\]{1,10}?))(?:\\2){3,}(?=[^\\]*)/",/草/,ALL,EMPTY`
- `"/test{1,5}pattern/",/置換/,sm1234567890,EMPTY`

ダブルクォート自体を含む場合は二重化します:

- `"正規表現内で""クォート""を使用",置換後,ALL,EMPTY`

### 正規表現フラグ（オプション）

（ES6+ 対応）

- `g`: グローバル検索（複数回マッチ）
- `i`: 大文字小文字を区別しない
- `m`: 複数行モード（`^` と `$` が行の始まり・終わりにマッチ）
- `u`: Unicode モード
- `y`: sticky モード
- `s`: dotAll モード
- `d`: hasIndices モード

例:

- `/test/gi,/置換/,ALL,EMPTY`
- `"/pattern{1,3}/imu",/結果/,sm123,EMPTY`
- `/\\\\s+/gms,/EMPTY/,ALL,EMPTY`
- `/😀+/gu,/笑/,ALL,EMPTY`

## CSV形式 - NGユーザールール

`@ユーザーID,SMID,ニコる数` の順番で入力します。

例:

`@ユーザーID,sm1234567890,3`

全動画対象の例:

`@ユーザーID,ALL,EMPTY`

**ユーザーIDルールは非表示（hide）のみ対応**で、置換（replace）は利用できません。

## CSV形式からの移行

既存の CSV 形式ルールは自動的に JSON Lines 形式に変換されます（インポート時に自動判定・変換）。

例:

- CSV: `/バカ/,/アホ/,ALL,5`
- JSON Lines:

```json
{"pattern":"バカ","flags":"gi","action":{"type":"replace","replacement":"アホ"},"smid":["ALL"],"nicoru_cond":{"op":">=","value":5,"mode":"exclude"}}
```

## コメントコマンド一覧（参考）

【大きさ】`big` / `medium` / `small`  
【フォント】`defont` / `gothic` / `mincho`  
【位置】`ue` / `naka` / `shita`  
【半透明】`_live`  
【非表示】`invisible`  
【横幅の長い固定コメント縮小】`full`  
【改行リサイズ無効】`ender`  
【従来保持方式へ変更】`patissier`  
【ニコられても消えにくくしない】`ca`

入力例: `small,gothic,_live,#004e72`

## 正規表現とファイル形式

- 正規表現は利用可能（**ユーザーIDルールは正規表現不可**）
- 特殊文字を文字として扱う場合はエスケープしてください（例: `.` をエスケープするなら `\.`）
- JSON Lines では正規表現を文字列として記述するため、必要に応じてエスケープします（例: `"pattern": "\\d{1,3}"`）

### ファイル形式の自動判定

拡張子に関係なく内容から自動判定されます。

- `.jsonl`: JSON Lines 形式
- `.json`: JSON 形式（コレクション）
- `.csv`: CSV 形式（従来形式）

### エクスポート・インポート

- **エクスポート**: 現在のルールを JSON Lines 形式でダウンロード
- **インポート**: CSV / JSON Lines / JSON 形式のファイルを読み込み（CSV は自動変換）

## 参考リンク

- [MDN 正規表現チートシート](https://developer.mozilla.org/ja/docs/Web/JavaScript/Guide/Regular_expressions/Cheatsheet)
- [Rubular（正規表現テスト）](https://rubular.com/)
- [Regulex（正規表現の視覚化）](https://jex.im/regulex/)
- [NicoCache_nl Wiki（regex）](https://w.atwiki.jp/nicocachenlwiki/pages/19.html)

