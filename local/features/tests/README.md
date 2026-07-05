# features テスト実装方針

## 実環境再現の粒度

- 実ページ由来の DOM・データ・イベントを raw Chrome DevTools Protocol で採取して fixture 化する。ただし、対象機能に関係しないページ全体の再現は避ける。
- 対象機能が依存する境界だけを必要十分に再現する。例: コモンヘッダーのテストでは `#CommonHeader` とユーザーアイコン・ユーザー名だけを再現し、動画プレイヤーやサイドバーなどは持ち込まない。
- 外部 API、localStorage、クリップボード、NicoCache_nl グローバルなどは、テスト対象の入出力契約が確認できる最小スタブにする。
- 実環境と乖離しやすい CSS セレクター、DOM 属性、レスポンス形状は、実ページや実 API で観測した名前を優先する。

## 採取 fixture

- `tests/fixtures/` 配下に、raw CDP で採取した DOM を置く。
- fixture 冒頭に採取元 URL と採取日をコメントで残す。
- ログイン中のユーザー名、アイコン URL、ID など個人情報は匿名化する。匿名化しても、class 名、data 属性、階層、対象機能が依存するタグ種別は維持する。

## HTML fixture

- Playwright で HTML を直接投入する場合は、断片ではなく `<!doctype html>`、`<html lang="ja">`、`<meta charset="utf-8">` を含むテスト文書に包む。
- `page.route().fulfill()` で HTML を返す場合は `contentType: "text/html; charset=utf-8"` を明示する。
- fixture は日本語表示を含めて UTF-8 前提で保存し、文字化けして見える文字列を期待値や DOM に混ぜない。

## 複雑化を避ける基準

- E2E で全ページを再現するより、機能単位の実DOM + 最小スタブを優先する。
- 周辺機能の再現がテストの主張を曖昧にする場合は、省略する。
- ただし、リグレッション原因が周辺 DOM やイベント伝播にある場合は、その境界だけを fixture に追加する。
