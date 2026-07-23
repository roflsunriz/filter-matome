# シークバーのサムネイルプレビュー調査

## 結論

公式視聴ページのシークバーホバーサムネイルは、動画のフレームを1枚ずつ要求する方式ではない。ページ初期化時にストーリーボードのメタデータと複数のJPEGスプライトシートを一括取得し、ホバー位置から算出した時刻をシート番号・行・列へ変換して、Blob URLとCSSの `background-position` で該当セルだけを表示する。

ストーリーボードデータの取得と、ホバーUIでの画像表示は別の制御である。今回の一般会員セッションでもメタデータと画像は取得されたが、ホバーUIは時刻だけを表示した。公式バンドルでは `isPremium && storyboard` のときだけ画像付きプレビューを描画する。

## 調査条件

- 調査日時: 2026-07-24（JST）
- 対象: `https://www.nicovideo.jp/watch/sm9`
- 会員区分: 一般会員（`sessionUser.type === "regular"`）
- ブラウザー: Chrome 150.0.7871.130
- raw CDP capture: `2026-07-23T20-21-01-436Z`
- capture manifest SHA-256: `BB82DDB2748AC51B556D6FD54E45006FB196ED503EBF0E5E941C43AEFEF86F82`
- 主な公式アセット: `PlayerSeekBar-DV9Bs-dx.js`

実ページ観測では既存タブを操作せず、同じBrowserContextに一時タブを作成した。保存したURLはquery stringを除去し、長い不透明なパス要素を置換している。Cookie、Authorization、アクセス権キー、署名付きURL、リクエスト本文、ヘッダー、ユーザーIDは保存していない。

## 取得経路

公式実装とraw CDP観測から、次の流れを確認した。

1. watchレスポンスのDomand情報に `isStoryboardAvailable` があることを確認する。
2. `POST https://nvapi.nicovideo.jp/v1/watch/:watchId/access-rights/storyboard` を呼び出す。公式コードは `watchId`、`actionTrackId`、`X-Request-With: nicovideo`、Domandのアクセス権キーを使用する。
3. 201応答の `data.contentUrl` からストーリーボードJSONを取得する。
4. JSONの `images[].url` を `contentUrl` と同じディレクトリに解決する。
5. 全スプライトシートを `Promise.all` で取得し、Blob化して `URL.createObjectURL` へ変換する。
6. ホバー時は取得済みBlobだけを切り替える。今回の観測ではホバー後の画像通信は0件だった。
7. 破棄時は `URL.revokeObjectURL` を呼び、生成したBlob URLを解放する。

`sm9` で観測した値は次のとおり。

| 項目 | 値 |
| --- | ---: |
| 1セルの幅 | 120px |
| 1セルの高さ | 90px |
| 1シートの列数 | 10 |
| 1シートの行数 | 10 |
| フレーム間隔 | 2,000ms |
| スプライトシート数 | 2 |
| 最大セル数 | 200 |
| メタデータ上の収録時間 | 400,000ms |
| 画像形式 | JPEG |

2枚のJPEGとJSONはすべてページ初期化中に取得された。プレビュー表示を開始するホバー操作は追加API要求や画像要求を発生させなかった。

## ホバー座標から時刻への変換

公式UIは `mouseenter` と `mousemove` のMouseEventを保持し、概ね次の計算で時刻を得る。

```text
pointerX = pageX - seekBar.left - window.scrollX
hoverTime = duration × pointerX / seekBar.clientWidth
```

負の値は0へ丸める。通常のホバーはシークバー内で発生するため、右端を超える値の明示的な上限処理は見当たらない。

ツールチップの中心位置は `seekBarWidth × hoverTime / duration` で求める。ただし、画像枠が左右へはみ出さないよう次の範囲へ制限する。

```text
previewHalfWidth ≤ centerX ≤ seekBarWidth - previewHalfWidth
```

画像付きプレビューの表示幅・高さは、メタデータのサムネイル幅・高さの1.2倍である。`sm9` では144×108pxになる。時刻表示と、対象時刻が最大ヒートマップ区間に入る場合の「盛り上がりシーン」表示が画像の下に付く。

一般会員の実ページではシークバーの10%、50%、75%へraw CDPでマウスを移動し、それぞれ `00:31`、`02:40`、`04:00` の時刻表示を確認した。画像背景は3地点すべて0件だった。

## 時刻からスプライトセルへの変換

公式Storyboardモデルの計算は次のとおり。

```text
cellsPerSheet = columns × rows
totalCells = imageCount × cellsPerSheet
frameIndex = floor(timeSeconds × 1000 / intervalMs)
sheetIndex = floor(frameIndex / cellsPerSheet)
column = frameIndex % columns
row = floor(frameIndex / columns) % rows
positionX = column × thumbnailWidth
positionY = row × thumbnailHeight
```

レンダラーは対象シートのBlob URLを `background-image` に設定し、`background-position: -positionX -positionY` でセルを切り出す。内部要素は1セルと同じ大きさで、外側コンテナの `overflow: hidden` によって他のセルを隠す。

外部通信遮断下で公式モデルへ120×90px、10×10、2秒間隔、2シートの合成メタデータを渡し、次を実コードで確認した。

| 時刻 | シート | X | Y |
| ---: | ---: | ---: | ---: |
| 0～1.999秒 | 1枚目 | 0 | 0 |
| 2秒 | 1枚目 | 120 | 0 |
| 198～199.999秒 | 1枚目 | 1,080 | 810 |
| 200秒 | 2枚目 | 0 | 0 |
| 398～399.999秒 | 2枚目 | 1,080 | 810 |
| 400秒 | 該当なし | — | — |

総セル数とちょうど同じインデックスになる400秒では該当シートがなく、モデルは結果を返さない。通常は動画時間より余裕のあるセル数が用意される。今回の `sm9` も動画の長さ約320秒に対して400秒分のセルがあった。

## 表示条件

ホバー中またはシーク操作中に、次の順で表示が選ばれる。

1. `isPremium` が真でStoryboardが存在する場合は画像、時刻、「盛り上がりシーン」を表示する。
2. それ以外で時刻ツールチップが有効なら、画像なしの時刻と「盛り上がりシーン」だけを表示する。
3. 動画広告中はStoryboardを表示せず、ヒートマップのピーク表示も渡さない。

一般会員でもStoryboardの初期化処理自体は実行され、今回の動画では画像まで取得された。会員制限は主にReactの表示分岐に置かれている。ただし、別動画、別配信方式、未ログイン、権利制限動画で同じ取得結果になるとは限らず、サーバー側の `isStoryboardAvailable` とAPI認可が常に優先される。

## ホバー画像と実シーク中の背景の違い

同じStoryboardモデルは、シークバーホバーの小型ツールチップだけでなく、実際にメディアがseeking状態になったときのプレイヤー表示にも使われる。

- ホバー: シークバー上に1.2倍の小型プレビューを表示する。公式UIではプレミアム条件がある。
- 実シーク: プレイヤーの `storyboard-content` レイヤーを表示し、現在のシーク時刻に対応するセルをステージへ拡大する。

両者は画像とセル計算を共有するが、表示先と発火条件が異なる。filter-matomeで実装するときも、ホバーによる「候補時刻」と、ドラッグ中の「実際のcurrentTime」を別状態として扱う必要がある。

## filter-matomeへの示唆

公式のプレミアム状態やアクセス権キーを偽装して公式Storyboard APIを使用するべきではない。署名付き `contentUrl` や取得画像を永続保存・再配布することも避ける。

一方、すでに認可されローカルへ保存された動画から、filter-matome独自のStoryboardを生成し、スタンドアロンのローカルプレイヤーで会員種別に依存せず表示することは、公式権利を変更しない差別化になる。

実装する場合は次を推奨する。

- ffmpegなどローカル変換系の既存経路で、動画のアスペクト比を維持したスプライトシートを生成する。
- JSONには幅、高さ、行、列、間隔、ローカル画像名だけを保存し、公式の署名付きURLやアクセス権情報を混ぜない。
- 最初のホバーまで画像を遅延読み込みし、公式実装より初期通信・メモリ使用量を抑える選択肢を用意する。
- 動画時間に応じて2～10秒程度の間隔を選び、最後のセル境界を `totalCells - 1` へクランプする。
- 左右端の位置制限、画像読込失敗時の時刻だけのフォールバック、Blob URLの解放を実装する。
- マウスだけでなく、キーボード操作・タッチ操作時の候補時刻表示も検討する。
- 公式視聴ページへ追加する場合は「ローカルキャッシュから生成したプレビュー」と明示し、公式プレミアム機能と誤認させない。

## 制約

- 実ページの画像付きホバー表示はプレミアムアカウントで観測していない。
- プレミアム表示条件は公式バンドルの静的解析で確認し、画像セル計算と描画は同じ公式モジュールを外部通信遮断下で実行して確認した。
- 実ページの数値観測は `sm9` 1動画・一般会員1セッションであり、全動画のStoryboard仕様を保証しない。
- 公式モジュールの非export Storyboardモデルには、調査専用のexport文だけを一時的に追加した。計算本体は変更していない。

## 再現手順

取得物はGit管理外である。起動済みraw CDP endpointとログイン済みニコニコ動画タブがある環境で、`local/features/` から実行する。

```powershell
bun run sandbox:capture-official
bun run sandbox:observe-seek-preview
bun run sandbox:run-seek-preview
bun run sandbox:verify-offline
```

`sandbox:observe-seek-preview` はquery stringと個人識別子を除いたAPI・メタデータ・ホバー結果を最新capture内の `seek-preview-observation.json` へ保存する。`sandbox:run-seek-preview` は取得済み公式モジュールを外部通信遮断下で実行し、`seek-preview-runtime.json` へ結果を保存する。どちらもcapture成果物はコミットしない。
