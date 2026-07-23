# 画質・音質の配信・切り替え調査

## 結論

公式watchプレイヤーは、watch APIの `media.domand.videos` と `media.domand.audios` を別々の候補として受け取り、その直積を再生候補にする。実際に利用できる組だけを `access-rights/hls` へ送信し、返されたHLS masterをHLS.jsで再生する。

会員種別を表す `sessionUser.type` は設定UIの案内にも使われるが、画質・音質の実際の可否は各候補の `isAvailable` とサーバーのaccess-rights認可で決まる。一般会員のコンテキストをプレミアム表示へ書き換えても、1080pや高音質を配信可能にはできない。実装ではサーバー応答を正として扱う必要がある。

## 調査条件

- 調査日時: 2026-07-24（JST）
- raw CDP実観測: `https://www.nicovideo.jp/watch/sm46577811`
- 会員状態: ログイン済み一般会員（`viewer.isPremium: false`）
- ブラウザー: Chrome 150.0.7871.130
- raw CDP capture: `2026-07-23T20-21-01-436Z`
- 主な公式アセット:
  - `PlayerSeekBar-DV9Bs-dx.js`: 品質候補生成、選択、HLS.js 1.6.16、再生状態
  - `PlayerOptionPresenter-BlPrwg0n.js`: 設定画面の画質・音質候補

配信観測ではCookie、Authorization、リクエストヘッダー、URL query string、ユーザーIDを保存していない。保存対象は匿名化した候補品質、access-rightsへ送った映像・音声IDの組、HLS manifestの数値属性、映像・音声セグメント数だけである。

また、取得済み公式ES Moduleへ調査専用exportだけを追加し、隔離BrowserContextで候補生成・選択関数を実行した。CDPのFetch interceptionでloopback以外を `BlockedByClient` にし、外部fetchが失敗することも同時に確認した。

## watch APIが返す候補

実観測した動画では次の候補が返った。

### 映像

| ID | 表示 | 解像度 | `qualityLevel` | `bitRate` | 一般会員で利用可能 |
| --- | --- | ---: | ---: | ---: | --- |
| `video-h264-1080p` | 1080p | 1920×1080 | 4 | 3,976,031 | いいえ |
| `video-h264-720p` | 720p | 1280×720 | 3 | 2,001,581 | はい |
| `video-h264-480p` | 480p | 854×480 | 2 | 1,603,672 | はい |
| `video-h264-360p` | 360p | 640×360 | 1 | 599,707 | はい |
| `video-h264-144p` | 144p | 256×144 | 0 | 151,988 | はい |

### 音声

| ID | 表示 | `qualityLevel` | `bitRate` | sampling rate | 一般会員で利用可能 |
| --- | --- | ---: | ---: | ---: | --- |
| `audio-aac-320kbps` | 高音質 320kbps | 2 | 324,759 | 48kHz | いいえ |
| `audio-aac-192kbps` | 標準音質 192kbps | 1 | 235,735 | 48kHz | はい |
| `audio-aac-64kbps` | 低音質 64kbps | 0 | 68,769 | 48kHz | はい |

この例ではAPI上の候補は5映像×3音声＝15組だが、利用可能なのは4映像×2音声＝8組だった。候補数、解像度、ビットレート、利用可否は動画ごとに異なるため、固定リストとして実装してはいけない。

## 配信開始までの流れ

1. watch APIから `media.domand.videos`、`audios`、`accessRightKey` を受け取る。
2. 映像と音声をそれぞれ `qualityLevel` の降順に並べ、映像優先・音声次点の直積を生成する。
3. `video.isAvailable && audio.isAvailable` の組だけを残す。
4. `/v1/watch/{watchId}/access-rights/hls` へ `outputs: [[videoId, audioId], ...]` をPOSTする。
5. 応答の `contentUrl` からHLS masterを読み込み、HLS.jsとMedia Source Extensionsで再生する。

実観測の最初のaccess-rights POSTには8組すべてが入り、その後のPOSTには現在選ばれた `video-h264-720p` と `audio-aac-192kbps` の1組が入った。利用不可だった1080pと320kbpsはどちらにも含まれなかった。

HLS masterには8組に対応するvariantがあり、映像プレイリストと音声renditionが分離されていた。再生中も映像セグメント `.cmfv` と音声セグメント `.cmfa` は別リクエストになった。したがって「720p動画ファイルに192kbps音声が内包されている」のではなく、選択した映像・音声トラックをMSE上で同期再生する構成である。

## 設定画面と切り替え

設定画面は、すべての直積を同時に見せるのではなく、現在ロード中の相手側品質で絞る。

- 映像メニュー: 現在ロード中の音声 `qualityLevel` と一致する組から映像候補を作る。
- 音声メニュー: 現在ロード中の映像 `qualityLevel` と一致する組から音声候補を作る。
- 映像には「自動」があり、選ぶと `changeVideoQuality(null)` を呼ぶ。
- 手動映像は選択したvideoを、音声は選択したaudioを渡す。
- メニューの `premiumOnly` 表示は、それぞれ `!video.isAvailable`、`!audio.isAvailable` から作られる。

映像を変えるときは現在ロード中の音声を維持し、音声を変えるときは現在の映像側の自動・手動状態を維持する。音声には映像と同じ「自動」選択はなく、映像の自動画質中でも選択した音声品質は固定される。

自動画質ではHLS.jsの `nextLevel = -1` を使う。手動では映像・音声の `qualityLevel` に対応するHLS level indexを求めて `nextLevel` を設定する。公式の選択関数は、指定した上限以下で利用可能な組のうち最も高い映像、次に高い音声を選ぶ。映像上限 `-1` は上限なしとして扱う。

外部通信遮断下の公式関数へ、利用不可の1080p・320kbpsと利用可能な720p・360p・192kbps・64kbpsを与えた結果は次のとおりだった。

| 指定 | 選択結果 |
| --- | --- |
| 映像自動、音声上限1 | 720p + 192kbps |
| 映像上限1、音声上限0 | 360p + 64kbps |

利用不可の候補は並び順には残るが、選択対象から除外された。

## 選択中・読込中・再生中は別状態

公式プレイヤーは次の3状態を区別する。

| 状態 | 意味 | 更新契機 |
| --- | --- | --- |
| selected | ユーザーが指定した自動・手動設定 | 設定操作 |
| loading | HLS.jsが次にロードしている実トラック | `LEVEL_SWITCHING` |
| playing | 現在時刻で実際に再生中のfragment | `FRAG_CHANGED` |

切り替え直後や自動画質の遷移中は3つが一時的に一致しない。UIへ「選択した品質」だけを表示すると、実際に再生されている品質と誤認させる可能性がある。自動画質のラベルにはplaying側の映像ラベルを使う経路がある。

最後に選択した映像・音声レベル、自動画質で最後にロードしたレベル、推定帯域はローカルストレージ経由で再利用される。HLS fragmentをbufferしたときの帯域推定値も保存される。

## 会員種別との関係

一般会員の実観測でも、プレミアム向け候補そのものはAPI応答に存在した。ただし `isAvailable: false` であり、access-rightsへ送る組から除外された。

このため、次を分離して扱う必要がある。

- `sessionUser.type`: 会員表示や一部UI分岐
- `viewer.isPremium`: watch APIが返す視聴者状態
- 候補ごとの `isAvailable`: 現在の動画・視聴者に対する品質の利用可否
- access-rights応答: 実際の配信認可とHLS URL

`sessionUser.type="premium"` だけに変更すると、設定UIがプレミアム向けに見えても配信権は変化しない。逆に、最初からプレミアムの利用者についても、動画ごとの `isAvailable` とaccess-rights応答を尊重する必要がある。画質・音質の解放を目的としたserverContext書き換えは行わない。

## filter-matomeへの示唆

1. 公式プレイヤー連携では映像IDだけでなく音声IDとの組を保持し、access-rightsへは `isAvailable` な組だけを渡す。
2. 品質UIはAPIが返した候補から動的に構築し、利用不可候補は理由付きで無効表示する。固定の「1080pまで」リストを持たない。
3. 自動画質では映像が変動しても音声選択は独立して維持される設計を明示する。
4. selected、loading、playingを別々に扱い、少なくとも自動選択時には実再生品質を表示する。
5. ローカルキャッシュでは映像・音声トラックの両方が揃っているか確認し、解像度だけで完全な品質と判定しない。
6. `video.videoWidth` は現在デコード中の実寸確認には使えるが、候補一覧や配信権の根拠にはせず、watch APIとHLS情報を正とする。

## 制約

現在のNicoCache_nlでは `101_disable_official_function.txt` の再生速度無効化フィルターが公式JavaScript中の `playbackRate` を `_x_` へ置換する。取得済みバンドルにもこの置換が反映されており、設定パネルを実ページで操作すると既存フィルター由来のエラーが発生する場合があった。

そのため今回の「切り替え」は、公式設定PresenterとHLS状態遷移の静的解析、および外部通信遮断下での公式候補生成・選択関数の実行で確認した。配信開始時の候補、access-rights、HLS manifest、映像・音声セグメント分離はraw CDPで実観測済みである。

## 再現手順

取得物はGit管理外である。起動済みraw CDP endpointとログイン済みニコニコ動画タブがある環境で、`local/features/` から実行する。

```powershell
bun run sandbox:capture-official
bun scripts/sandbox/observe-quality-delivery.ts `
  --url=https://www.nicovideo.jp/watch/sm46577811
bun run sandbox:run-quality
bun run sandbox:verify-offline
```

`sandbox:observe-quality` は最新capture内の `quality-delivery-observation.json`、`sandbox:run-quality` は `quality-switch-runtime.json` へ結果を保存する。どちらもcapture成果物なのでコミットしない。
