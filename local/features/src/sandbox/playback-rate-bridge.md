# 公式プレイヤー再生速度ブリッジ

## 目的

公式プレイヤーの再生速度設定とmlink-video-controllerの0.1～5倍速設定を同時に利用できるよう、公式公開バンドルのmedia controllerへ版付きの最小APIだけを接続する。公式コードをfeaturesへ複製せず、公式UIの候補、会員判定、保存処理は変更しない。

## de-minifyで確認した状態経路

`PlayerSeekBar-*.js`をメモリー上でde-minifyすると、公式プレイヤーは次の状態を分離していた。

1. 設定Presenterは`changePlaybackRate(value)`を呼ぶ。
2. watch controllerは公式候補にあり、現在の会員状態で利用可能な値だけを公式storageとmedia controllerへ渡す。
3. media controllerの`setPlaybackRate(value)`は内部の`playbackRate`、全`HTMLMediaElement.playbackRate`、`stateChanged`を同時に更新する。
4. `timeupdate`と`play`では、動画要素の値がmedia controllerの内部値と異なる場合、内部値を動画要素へ再設定する。
5. 設定Presenterの現在値が公式候補にない場合、公式Selectは選択値を`undefined`、表示を`-`として扱い、候補一覧と`changePlaybackRate`操作を維持する。

このため、mlink-video-controllerが`HTMLMediaElement.playbackRate`だけを変更すると、次の`timeupdate`または`play`で公式内部値へ戻される。旧101番nlFilterはすべての`playbackRate`を`_x_`へ置換してこの再設定を止めていたが、公式の候補生成、設定Presenter、HLS制御、テレメトリーも同時に壊していた。

新しいブリッジは、media controllerの読み取り境界へ次のAPIを接続する。

- `globalThis.FilterMatomePlaybackRateApi.version`: `1`
- `get()`: media controllerが保持する現在値を返す。
- `set(rate)`: 有限な0.1～5だけをmedia controllerへ渡し、反映後の値を返す。

公式UIは既存のwatch controllerを通るため、表示候補と利用可否を変更しない。mlink-video-controllerだけがこのブリッジを使ってmedia controllerを更新し、APIがないスタンドアロンvideo-playerでは従来どおり動画要素へ直接設定する。

## Match

```text
this\.getPlaybackRate=\(\)=>this\.media\.getPlaybackRate\(\)
```

この境界はminifyされたローカル変数名を含まず、controller自身とmedia controllerの責務を表す公開メソッド名だけで構成される。各captureでは対象の`PlayerSeekBar-*.js`に1回、他のJavaScript資産に0回だけ一致した。

## 観測履歴

### 2026-07-23: `PlayerSeekBar-DV9Bs-dx.js`

- URL: `https://resource.video.nimg.jp/web/scripts/nvpc_next/assets/PlayerSeekBar-DV9Bs-dx.js`
- size: `1,385,964 bytes`
- SHA-256: `031e174456308e80863ad1f9fd8dd61d45706c1a2f6aa75562e0185c9651f646`
- capture 3件すべてで対象1件・他資産0件。
- media controllerの内部値、動画要素への反映、`timeupdate`・`play`時の補正をde-minify後に確認した。

### 2026-08-19: `PlayerSeekBar-DzqrqG09.js`

- URL: `https://resource.video.nimg.jp/web/scripts/nvpc_next/assets/PlayerSeekBar-DzqrqG09.js`
- size: `1,387,298 bytes`
- SHA-256: `f4b828e1c7379eee61f08bd98011d1be1ff512b6f3dbb6e3600521396a742b30`
- minify名とasset hashの更新後も対象1件・他資産0件。
- 同日の再captureでも同じ意味境界へ1回だけ一致した。

### 2026-08-24: `PlayerSeekBar-CRVaxiiz.js`

- URL: `https://resource.video.nimg.jp/web/scripts/nvpc_next/assets/PlayerSeekBar-CRVaxiiz.js`
- size: `1,397,325 bytes`
- SHA-256: `2c232bec978e5bdb9a0bbea6fde081317dbb3176319be43ed89a2b8acb4d6a62`
- さらにasset名、サイズ、minify名が変わった版でも対象1件・他資産0件。
- nlFilter適用後の全モジュールをde-minifyし、版付きAPI、media controller更新、公式の動画要素補正が同時に構文解析できることを確認した。

## 採用条件と追従

- 最新captureの全JavaScriptでMatchが1回だけ一致する。
- 対象資産が公式media controllerの内部値と動画要素を同時に更新する実装を維持している。
- 置換後のES Moduleをde-minify・構文解析できる。
- `FilterMatomePlaybackRateApi`以外の公式状態やcontrollerをグローバルへ公開しない。
- 公式設定Presenter、候補配列、会員判定、公式storageを書き換えない。
- Matchが0件または複数件なら置換せず、mlink-video-controllerは動画要素への直接設定へフォールバックする。

```powershell
cd local/features
bun run sandbox:analyze-playback-rate
bun run sandbox:verify-playback-rate
bun test tests/playback-rate-bridge-nlfilter.test.ts tests/official-playback-rate-bridge.test.ts
```

captureにはCookie、Authorization、リクエストヘッダー、HTML、個人識別子を保存しない。公式資産とde-minify結果はGit管理外に保ち、この文書にはURL、サイズ、SHA-256、意味上の境界だけを残す。

## ロールバック

問題が起きた場合は、101番nlFilterの再生速度同期セクションとmlink-video-controllerのブリッジ利用を同じ以前の版へ戻す。旧`playbackRate`全面置換は公式プレイヤー全体を壊すため復活させず、ブリッジAPIがない状態では動画要素への直接設定と明示的な警告で切り分ける。変更後はWatchページを`Ctrl+F5`でハード再読み込みする。
