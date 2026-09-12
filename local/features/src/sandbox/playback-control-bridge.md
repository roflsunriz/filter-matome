# 公式プレイヤーの再生位置同期API

## 症状と原因

2026-09-13、ユーザーから`sm45650421`・360p/192k・Firefoxで、A-Bリピート後に公式の時間管理と動画要素の時刻が分離するとの報告があった。

取得済みの公式`PlayerSeekBar`資産を再解析すると、media controllerはHTMLMediaElementとは別に`_setCurrentTime`（最後のシーク位置）とWeb Animations APIによる`smoothTime`を持つ。`getCurrentTimeRaw()`は要素の時刻だけでなく前者による下限も適用する。要素だけを後方へ移動すると、映像は戻っても公式時計が戻らない。

公式シークは`seek(time)`で保留位置と再生状態を確保し、`setCurrentTime(time)`で要素・内部状態・時計を確定する。確定だけの呼び出しでも、待機途中のtickが旧時刻へ補正する場合がある。シーク中は公式getterの既定の保留位置を使い、`getCurrentTime(false)`で保留を無視しない。

## 公開契約

101番フィルターで、同一media controllerへ委譲する時刻getter境界に一度だけAPIを接続する。

```text
this\.getCurrentTime=\(([A-Za-z_$][\w$]*)=!0\)=>this\.media\.getCurrentTime\(\1\)
```

- `FilterMatomePlaybackControlApi.version`: `1`
- `getState()` → `{videoId, currentTime, duration, paused, seeking}`。未準備・破棄後は`null`。
- `seek(time)` → 範囲を検証して公式mediaの`seek(time)`→`setCurrentTime(time)`を順番に実行し、確定を待つ。
- `play()`、`pause()` → 同じ公式mediaへ委譲し、公式の再生キューと要素の状態を揃える。
- プレビューでは公開しない。controller破棄時は、自分が公開したAPIだけを除去する。
- API公開・破棄は`filter-matome:api-status-change`で通知する。CommonHeaderの`playback-control`項目は版と4メソッドだけを確認し、時刻読取や操作を実行しない。

`ABRepeatController`は公式の時刻・時間長で区間を扱い、シーク確定中に次のシークを重ねない。`NicoVideoPlayer`経由の秒数移動、ヒートマップ、コメント位置移動、再生/停止も同じ境界へ接続する。ローカル再生の`#video-element`ではHTMLMediaElement操作を維持する。

## 世代比較

URL・取得時刻・全体SHA-256・サイズは[全編先読みの世代比較](full-buffer-bridge.md#世代比較)の6ビルド・8資産を共用する。同じURLの無改変版とnlFilter適用済み版は別世代に数えない。

全6ビルドでこのgetter境界が1回、その他の異なる526 JavaScript資産で0回だった。周辺のclass名・内部ヘルパー名が変化したビルドでも、同じmediaへの参照、`_setCurrentTime`、`getCurrentTimeRaw`、`smoothTime`、シーク開始/確定、再生/停止の関係が維持されていた。全体の置換後ES Moduleの構文も合格した。getter引数自体はこれらの資産では`e`であり、汎化は単なる引数名の変更例に依存していない。

```powershell
cd local/features
bun run sandbox:analyze-playback-control
bun test tests/official-playback-control.test.ts
bun scripts/sandbox/verify-current-playback-tools.ts --cdp=http://127.0.0.1:9237
```

生成される`playback-control-analysis.json`には資産ごとのURL・ハッシュ・サイズ・一致数と実行日時を記録する。取得済み資産と生成記録はGit管理外であり、公式コードを製品bundleへ複製しない。

## 動作確認と限界

公開動画sm9で、要素だけを100秒へ書き換える旧操作では公式時計が約231秒に残ることを確認した。2段階の公式シーク後は100秒へ揃い、100～101秒のリピートを50ms間隔100点で観測した。95点の確定済み状態は差0.3秒以内、5点は公式シークの保留中で、保留位置Aから1秒以内に確定した。通常のsmoothTime補間による小さな差と、確定前に保留位置を先に表示する状態を区別する。保留後も旧時刻に残る、確定しない、または確定後の差が増大する場合は失敗にする。前回の「要素の時刻だけを検証した成功」は公式時計の同期の根拠にしない。

単体では独立した公式時計と非同期の確定処理を再現し、要素だけの後方シーク、確定だけのシーク、保留位置を無視するgetterが誤った状態を残すことを検出する。ブラウザーテストでも公式時計と要素時刻を比較し、終了点、再接続、ローカル要素の分岐を確認する。

指定動画は匿名ではログイン必須画面になる。既存Chromeの認証状態を使う試行は自動承認審査に拒否されており、実利用Firefoxのログイン済みプロフィールを使う最終確認は承認待ちである。これらを実利用環境で確認済みとは扱わない。
