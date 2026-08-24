# destroy-ads 公式資産Match履歴

取得物自体はGit管理せず、URL、サイズ、SHA-256と意味上のMatchだけを記録する。各版で`Advertisement`コンポーネントexport、`publicUrl.adsResource`ローダー、GTM起動呼び出しは対象資産に1回だけ一致し、置換後コードをBunで構文解析した。

| 取得日時 | 資産 | bytes | SHA-256 | Match |
| --- | --- | ---: | --- | --- |
| 2026-07-23 | `Advertisement-CFGlsXkT.js` | 1,777 | `c4ca2e695b285a75d89e2a65ed08adaf44cc76296a70d5c169853048c00ad832` | export 1件 |
| 2026-08-19 | `Advertisement-BtbsndOB.js` | 1,777 | `084acf46ddc64858804cb6e8fdc1ac50e5e6c118cb4b2077981b9666b369bfe6` | export 1件 |
| 2026-08-24 | `Advertisement-oTFGzzB0.js` | 1,777 | `bf5fa773d5c7269898e37f672bdbdfdd80f044cae2e8939448387ebc1a22cd87` | export 1件 |
| 2026-07-23 | `root-C3PfEawL.js` | 15,479 | `64404841df7ac7f70afefa1331338fc47b70659fb043cf04a88c520bd9259c2f` | `publicUrl.adsResource` 1件 |
| 2026-08-19 | `root-D3jvS_pa.js` | 15,479 | `eafb7086ce7e2fe46b7b0303827874aa1450498f5bd2f71d7f0646d6f8a259a7` | `publicUrl.adsResource` 1件 |
| 2026-08-24 | `root-C7txG_rN.js` | 15,479 | `8696b669ca3a02ec6bd80a965a407f347706a040cd0694512eee218f6e5deae2` | `publicUrl.adsResource` 1件 |
| 2026-07-23 | `bridge-CgAJs_pW.js` | 70,469 | `2c0a67ee4b1b92e0e54e9c6939f63d4512ab2e7ef03f01c2cf4f6aed1f8432a0` | GTM起動 1件 |
| 2026-08-19 | `bridge-OsqK3xBu.js` | 70,730 | `ec1970efa634b8c369d290221b2edf42eefe3bec5229cdb54817ffd0df3de8c3` | GTM起動 1件 |
| 2026-08-24 | `bridge-UHUlhr66.js` | 70,752 | `a9f32cb42fa49561e61c720e654fecf7943255f9afd4b7d2c0d4440bc30744ed` | GTM起動 1件 |
| 2026-08-24 | `PlayerCurrentTime-DyMaJv5-.js` | 70,044 | `93b968dcd0b0596898c3d86ff3b23dad30729112c83fb3129fc270136071c5ce` | 起動2点を観測したが書換え不採用 |
| 2026-08-24 | `PlayerVolumeBar-CshODhlc.js` | 23,981 | `783c97505f5d4fa546e4a35b90fc70b43009105cf6d097a0bac21dd043417524` | `adsResource`・IMA・OpenX検査ローダー 各1件 |

2026-08-24の旧ページbundleでは`Advertisement`利用可能判定が`TopPage`、`VideoTop`、`NewVideosPage`、`UserPage`、`MessagePage`の5資産に各1回一致した。これらはハッシュ付きURLではないため、次回走査でも同じ意味上の判定と置換後構文を検証する。

同日のWatch実行確認では、広告APIをRequestFilterで`DROP`した状態で`PlayerCurrentTime`から`GET /api/video/getAd.json.php`とPrebidの失敗が観測されたが、公式側が失敗を処理して通常動画を開始できた。動画広告選択と自動再生prewarmの両生成点を`void 0`化すると、MediaErrorなし・`readyState=4`でも0秒停止したため、この資産は書き換えない。`PlayerVolumeBar`の広告ブロック検査は失敗を`Promise.allSettled`で扱い、通常再生と独立しているため、3ローダーを即時rejectへ置換する。全Matchが一意の場合だけまとめて適用し、部分一致では資産を変更しない。

`root-*`の`D(serverContext.publicUrl.adsResource)`は戻り値未使用に見えるが、呼び出しを`Promise.resolve(null)`、即時reject、`void 0`のいずれへ置き換えても、access-rightsとHLS取得後に公式動画エラーへ遷移した。ローダー関数を保持したままbase URLだけを`/local/features/dist/ad-stub`へ変更すると、公式が追加する`/assets/js/ads2.js`を同一originの空scriptとして200で読み込み、5秒保持後もWatchが正常だった。この動的契約をroot書換えの受入条件とする。
