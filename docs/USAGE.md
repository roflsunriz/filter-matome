# Usage Guide

---

## 1. Installation

GitHubページの[リリースページ](https://github.com/roflsunriz/filter-matome/releases)からダウンロードすること。

!!! warning "注意事項"

    - ディレクトリ構造を壊さずにそのまま`local`フォルダは`local`フォルダに、`nlFilters`は`nlFilters`フォルダに、`extensions`フォルダは`extensions`フォルダに上書きする。
    - **フィルタの抜き差しは上級者向けなのでnlFiltersの文法を完全に理解し、HTML/CSS/JavaScriptの知識が十分にあり、デベロッパーコンソールを十全に扱え、自己解決できる者だけが自己の責任で対応すること。**

!!! note

    問題を発見した場合は[GitHubのIssue](https://github.com/roflsunriz/filter-matome/issues)にて報告する。あるいはIssueで相談してからPull Requestを送る。

### 標準手順
`$env:USERPROFILE\Downloads`にダウンロードしたとする  
  
1. 7zファイル`filter-matome-.xxx.7z`を7-zipで展開する  
2. `$env:USERPROFILE\Downloads\filter-matome-.xxx\NicoCache_nl`にある`extensions`, `local`, `scripts`, `nlFilters`を `C:\NicoCache_nl`に上書きコピーする  

    !!! note

        `scripts` フォルダは便利なスクリプトがひとまとめになっているが使わないなら必ずしもコピー必須ではない

3. NicoCache_nlを再起動する

        Stop-Process -Name java -Force
        Stop-Process -Name javaw -Force
        Set-Location $env:NICOCACHE_HOME
        Start-Process pwsh -ArgumentList "-WindowStyle Hidden -File `"$env:NICOCACHE_HOME\RunNicoCache.ps1`""

### クリーンインストール手順

`C:\NicoCache_nl`にインストールしたとする  

1. `C:\NicoCache_nl`フォルダを開く  
2. `extensions`フォルダから`CommentFilterLogger.class`, `CustomCacheReturner.class`, `downloadThruFFmpeg.class`, `ExtUtil.class`, `nlMediaInfo.class`を削除する  
3. `local`フォルダにある`background-images`, `features`, `images`, フォルダ, `mime.types`, `list.js` のシンボリックリンクを削除する  
4. `scripts`フォルダを削除する  
5. `nlFilters`フォルダの `100_common.txt`, `101_disable_official_function.txt`, `102_mlink_video_controller.txt`, `103_comment_filter2.txt`, `104_video_player.txt`, `105_premium_hide.txt`, `106_watch_history.txt`, `nlFilters_編集ガイド.md`を削除する  
6. NicoCache_nlを再起動する  
7. 上記標準手順に従ってインストールする  

### 参考資料

- [拡張機能](https://roflsunriz.github.io/setup-nicocache-nl/extensions/)

---

### 1.1 Symlink Setup (Required)

NicoCache_nl はキャッシュデータ用スクリプトを `C:\NicoCache_nl\local\list.js` の固定パス・固定名で参照する。

ビルド成果物（ `local/features/dist/cache-data-manager.iife.js`）へこの固定パス名で**シンボリックリンクを作成**しないと機能しない。

**要約（Windows / PowerShell）※管理者権限が必要**

Windows + R -> 「wt」または「wt.exe」と入力 -> Ctrl + Shift + Enter -> UAC「はい」
```powershell
# 既存の list.js / list.js.map を削除
Remove-Item -Path "C:\NicoCache_nl\local\list.js"
Remove-Item -Path "C:\NicoCache_nl\local\list.js.map"

# ビルド成果物へリンクを作成
New-Item -ItemType SymbolicLink -Path "C:\NicoCache_nl\local\list.js" -Target "C:\NicoCache_nl\local\features\dist\cache-data-manager.iife.js"
New-Item -ItemType SymbolicLink -Path "C:\NicoCache_nl\local\list.js.map" -Target "C:\NicoCache_nl\local\features\dist\cache-data-manager.iife.js.map"
```

詳細な手順は [creating-symlink-for-listjs.md](creating-symlink-for-listjs.md) を参照。

---

## 2. Filter Descriptions

!!! warning "注意事項"

    - 毎回リリースノートを確認すること。
    - 各 nlFilter は`<link rel="...">`や`<script src="...">`で`./local/features/*`から呼び出す形になっているため、ファイルの更新日が変わっていないことがあることに注意する。更新による差分を見たいときは[WinMerge](https://winmerge.org/?lang=ja)が便利。
    - また、`nlFilters` フォルダから削除された nlFilter(txt)や、local/features から削除された css,js ファイル、または中身のないファイル群は deprecated(廃止予定)又は abolition(廃止)としているため削除すること。

**免責事項：**

- 全てのフィルタは同時使用を前提に設計しているため、自分で勝手に取捨選択した結果動作しなくても動作保証外・サポート（返信）対象外とする。
- 基本的にこのフィルタは私が使用しているものをお裾分けしているという形を取っている為、**あなたが自分で変更・改変・改造した結果不具合が起きても私は一切の責任を負わない。自身の力に於いて解決**すること。困ったらクリーンインストール！
- MITライセンス(MIT license)[(日本語訳リンク)](https://licenses.opensource.jp/MIT/MIT.html)を宣言する。改変・再配布・商用利用・非商用利用等自由、但し再配布する際に私の名前(roflsunriz)を明記すること。

---

### 100_common.txt

共通ライブラリ（common.css, common.es.js）をニコニコ動画全体に挿入するフィルタ。トースト通知、ロギング、マテリアルデザインアイコンなどの基盤機能を提供する。

### 101_disable_official_function.txt

公式プレイヤーの再生速度調整機能を無効化するフィルタ。これにより102_mlink_video_controller.txtの再生速度調整機能が正常に動作するようになる。非プレミアム会員で制限されている基本的な機能を提供する基盤となる。

### 102_mlink_video_controller.txt

![リンクとステータス](resources/mlink-video-controller1.avif)

![リンクとステータス2](resources/mlink-video-controller2.avif)

ニコニコ動画の視聴ページを開くと、右下に紫色のメニューが現れる。そのメニューを開くと、順に、コメントヒートマップと再生関連の微調整タブ、音量微調整タブ、再生速度変更タブ、コメント検索タブ、関連リンクタブ、モジュール設定タブに切り替えられる。  

再生関連タブでは、シークバーによる位置調整、ヒートマップ切り替え、0:00に戻るボタン、再生一時停止切り替え、最後までスキップ、繰り返し再生、秒数指定スキップ、ワンクリック秒数スキップボタンがある。  

音量タブでは、音量バーによる調整、音量ゼロ、微小、最大、各パーセンテージによる調整ができる。  

再生速度タブでは再生速度調整バーとワンクリックボタンによる変更ができる。  

コメント検索タブでは通常表現と正規表現による検索ができる。詳細表示チェックボックスをオンにすると、ID, No., 投稿日時, コメントコマンド, プレミアムステータス, スコアといった情報が表示される。  

関連リンクタブでは、filter-matome関連リンク、niconico関連リンク、NicoCache_nlリンクが表示される。  
`キャッシュリスト`の使用には上記キャッシュデータ用マネージャのシンボリックリンクセットアップが必要。その他、`保存:動画`, `保存:音声`のリンクの動作には `downloadThruFFmpeg.class` が必要。 動画または音声の保存時はJavaによるファイルダイアログが出るのでタスクバーにあるNicoCacheのアイコンをダブルクリックしてファイルダイアログをフォアグラウンドに移動したほうがよい。（自動でフォアグラウンドにならないため） `Processing Started`となるとダウンロード処理開始。 `保存:コメント` は現在NicoCache_nl本体自体が最新のコメントデータ形式に未対応のため動作していない。  

モジュールタブではmlink-video-controllerに統合された各種機能モジュールのオン・オフができる。  

`ヘッダープライバシー`モジュールはニコニコ動画のコモンヘッダー（画面上部の黒いヘッダ）に表示されるユーザー名とアイコンを非表示にできる。スクリーンショットでユーザー名を共有したくない場合に便利。  

`デイリー福引ハイライト`モジュールはニコニコインフォで配布されているニコニ広告用のポイント福引で、特定のキーワードを含むものをハイライトすることで簡単に福引にアクセスできるように支援する補助機能。  

`Watch Page統合`モジュールはタグカウンター（タグの個数を数える）など、視聴ページ向けの補助機能をまとめて有効化する。`Watch Page サブモジュール`は`Watch Page統合`モジュールの詳細設定。  

`原宿風Watch`モジュールはWatchページをニコニコ動画（原宿）風の表示に変更する。再生数・コメント数・マイリスト数・投稿日時の集約表示、ライト/ダークテーマ切り替え、カラースキームと背景画像の優先切り替えに対応する。  

`タブセッション拡張`モジュールは通常一般会員では同時に開ける視聴ページが3つまでに制限されているものを無制限に拡張する。  

`サムネイルフィルター`モジュールは検索ページやその他ページで非表示にしたい動画を指定してサムネイルを非表示にしてくれるモジュールだがニコニコ動画の構造変化が激しいため動作しないかもしれない。モジュール設定タブの`サムネイルフィルター`行にある`設定`から調整できる。キーワードの追加・削除・一時停止は保存直後に現在の一覧へ反映される。  

`削除動画検出器`モジュールは、投稿者が削除または非表示設定された動画を自動検知してキャッシュが存在する場合にローカルプレーヤーに自動ルーティングするモジュール。  

`背景セレクター`モジュールはラジアル背景画像セレクターと背景画像自動適用をオンにする。視聴ページの右横に半透明のハンドルにマウスホバーするとラジアル背景画像セレクターが現れ、回転とクリックで背景画像を変更可能。`背景画像設定`で変更可能。  

`マトリックス背景`は映画マトリックスシリーズに出てくる緑色の縦書きカタカナプログラムコードの動的表示背景を設定する。`背景セレクター`と排他的動作。

`即時適用`・・・すぐにモジュールの変更を適用（リロードなし）  
`再読み込みして適用`・・・ページをリロードして適用（より確実）  
`設定エクスポート`・・・モジュールの各種設定をローカルに保存  
`設定インポート`・・・モジュールの各種設定をローカルから読み込み  
`設定リセット`・・・デフォルト設定に戻す    


### 103_comment_filter2.txt

![コメントフィルタ1](resources/comment-filter-2-1.avif)

![コメントフィルタ2](resources/comment-filter-2-2.avif)

詳しい使い方は[comment-filter2.md](comment-filter2.md)を参照されたい。

### 104_video_player.txt

![カスタムキャッシュ](resources/cache.avif)

キャッシュ済みの有料期限切れ動画 / キャッシュ済み削除動画 / キャッシュ済み非公開動画 をローカルプレーヤーでコメント付きで再生するための機能。（ニコニコ動画の仕様上、いつの時点からか削除済み動画と非公開動画ではコメントも非公開になったのでコメントはうまく表示されないかもしれない）

#### 再生方法
- URLを直接指定する方法(https://www.nicovideo.jp/local/features/dist/src/video-player/standalone/index.html?videoId=<動画ID>)
- mylist2に該当動画を登録して自動ルーティングさせる方法(https://www.nicovideo.jp/watch/soXXXXXXXX などを登録するとキャッシュがあれば自動でリダイレクトする)

動画IDは`soXXXXXXXX`に限らず、`smXXXXXXXX`、`nmXXXXXXXX`、`ssXXXXXXXX`などのニコニコ動画IDに対応する。

#### 任意で用意した動画をコメントを被せて再生
- [Hohoema](https://github.com/tor4kichi/Hohoema)を使用する方法
- `C:\NicoCache_nl\cache`に動画IDで名前を付けて保存`soXXXXXXXX.mp4`、`smXXXXXXXX.mp4`、`nmXXXXXXXX.mp4`、`ssXXXXXXXX.mp4`などとし、該当動画IDのページを開く。 
- `C:\NicoCache_nl\local\cache`に動画IDで名前を付けて保存`soXXXXXXXX.mp4`、`smXXXXXXXX.mp4`、`nmXXXXXXXX.mp4`、`ssXXXXXXXX.mp4`などとし、該当動画IDのページを開く。 

!!! note
    mp4ファイルを`scripts/convert-to-faststart.ps1`でfaststart変換すると、読み込みから再生開始までの待ち時間が短縮される。

!!! note
    動画ファイルを追加した後はNicoCache_nlに認識させるためにNicoCache_nlの再起動が必要。


### 105_premium_hide.txt

![適用前](resources/premium-recruit-hide-1.png)

![適用後](resources/premium-recruit-hide-2.png)

コモンヘッダーのプレミアム会員勧誘要素を非表示にする。

### 106_watch_history.txt

![視聴履歴](resources/watch-history.avif)

視聴履歴タブでは、視聴ページで再生した動画の履歴が表示される。左のサイドバーから検索、ソート、フィルタ、削除、簡易統計が可能。右サイドバーでは各動画をクリックすると動画IDや投稿者などの詳細情報が表示される。更にそこから動画を開いたりメモを追加することも可能。  

統計タブでは詳細な再生アクティビティを確認可能。  

シリーズタブでは投稿者が設定した動画シリーズのナビゲーションが利用可能。  

シリーズアラートでは視聴履歴のページを開いている限り、新規投稿されたシリーズの新規動画を自動通知する設定が可能。（視聴履歴のページを閉じると動作しない）`新規アラート追加`で追加、`手動チェック`で新規動画がないかチェック、`通知権限確認`でブラウザの通知権限の動作確認。  

`データベース管理`では、より大容量の履歴を保存するためのデータベース永続化と、旧データからの自動マイグレーションなどの設定が可能。  
 

---

## 3. Enabling/Disabling Filters

[nlFilter の文法](https://roflsunriz.github.io/setup-nicocache-nl/nl-filters-syntax/)を参照

必要に応じフィルタを有効化する方法と無効化する方法を紹介する。フィルタのカギ括弧にシャープ記号を付けると無効状態になる。

**使用例：**

| 無効状態 | 有効状態 |
|---------|---------|
| `#[Replace]` | `[Replace]` |

!!! note
    VSCodeでのnlFiltersのシンタックスハイライト機能は[NLF Code](https://github.com/roflsunriz/NLF-Code)が利用可能。

![フィルタ切り替え画面](resources/toggle.png)

---

## 4. Watch Page Background Image Settings

![背景画像](resources/background-image-settings.avif)

[CSS: カスケーディングスタイルシート:MDN](https://developer.mozilla.org/ja/docs/Web/CSS)を参照

背景画像を変更するには、まず画像を[Squoosh](https://squoosh.app/)などでブラウザが扱える形式に変換する。変換は必須ではない。次に、NicoCache_nl の `local/background-images/favorites` など、`local` 配下の任意のフォルダに画像を配置する。NicoCache_nl から参照できるのは `local` 配下のファイルだけである。

そのうえで、mlink-video-controller の設定タブにある「背景画像設定」から背景画像を指定する。指定方法は URL 指定とファイル選択の 2 種類である。ファイル選択した画像は、IndexedDB に base64 形式で保存される。

URL は `https://www.nicovideo.jp/local/background.jpg` のように、`local` 配下のファイルをそのまま指定するのが最も単純な例である。たとえば `C:\NicoCache_nl\local\background-images\favorites\background1.avif` に画像を置いた場合、URL は `https://www.nicovideo.jp/local/background-images/favorites/background1.avif` になる。さらに、`local` フォルダ内の `hoge` フォルダに `image.jpg` がある場合は、`https://www.nicovideo.jp/local/hoge/image.jpg` になる。`https://www.nicovideo.jp/local/` 以外の外部 URL も指定できるが、読み込み時に外部サーバーへ無用な負荷をかけるおそれがあるため非推奨である。フォルダ構成や指定数に厳密な制限はないが、常識的な範囲で設定することを推奨する。

!!! warning "注意事項（nico_wallpaperG併用時）"
    nico_wallpaperGと併用している場合衝突が起きるので、そのときはどちらを優先するかによるが mlink-video-controller にて背景セレクターとマトリックス背景を無効化し、「wp1.css」に以下を追記する。（デフォルトの場合）

    ```css
    :root {
      --bg-img: url('https://www.nicovideo.jp/local/nico_wallpaperG/wp1.jpg') repeat center fixed !important;
    }
    ```

---

## 5. Important: Data Deletion Warning

### ブラウザデータ削除時の注意

以下の操作を行うと設定データが消去される：

- サイトデータの削除
- オフライン作業用データの削除
- Cookieと他のサイトデータの削除
- Cookieとサイトデータの削除
- …等の表記がある閲覧履歴データの削除

**削除されてしまう設定：**

- mlink-video-controller（IndexedDBに保存された背景画像の設定全般）
- mylist2（IndexedDBに保存されたマイリストのデータ全般）
- comment-filter2（IndexedDBに保存されたNGコメントの設定全般）
- その他「ローカルストレージ」に保存されている音量、再生速度設定等

**事前対策：**

1. 各機能の設定画面から「エクスポート」を実行
2. エクスポートファイルを安全な場所に保存
3. データ削除後に「インポート」で復元

保存されている各データはWebサイトにフォーカスがある状態でF12キーを押すと開発者ツールが開き、「ストレージ」タブや「アプリケーション」タブで確認できる。

### 各機能のエクスポート方法

**mylist2**

mylist2 > 「マイリスト設定」 > 「エクスポート」

**comment-filter2**

ニコニコ動画の視聴ページ > 画面右下のmlink-video-controller > 関連リンクタブの`comment-filter2` > 「データ管理」の`エクスポート`

---

## 6. License

!!! note "MIT LICENSE"

    The MIT License  
      
    Copyright 2017-2026 roflsunriz  
      
    Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:  
      
    The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.  
      
    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.  


法的に有効なのは英語版のライセンス条文。詳細は[日本語訳](https://licenses.opensource.jp/MIT/MIT.html)と[英語原文](https://opensource.org/license/mit)を参照。

---

## 7. Related Links

### 開発ツール

- [Apache Ant (Javaビルドツール)](https://ant.apache.org/bindownload.cgi)
- [Adoptium OpenJDK (Java Development Kit)](https://adoptium.net/temurin/releases/?version=17&os=windows&package=jdk&arch=x64)
- [BouncyCastle (暗号化ライブラリ)](https://www.bouncycastle.org/latest_releases.html)
- [MediaInfo (メディア情報表示)](https://mediaarea.net/en/MediaInfo/Download/Windows)
- [WinMerge (ファイル差分比較)](https://winmerge.org/?lang=ja)

### コミュニティ

- [5ちゃんねる 本スレッド](https://find.5ch.net/search?q=NicoCache)
- [おーぷん2ちゃんねる スレッド](https://ana.open2ch.net/test/read.cgi/software/1675001508/)
- [Talkスレッド](https://talk.jp/boards/software/1675038388)
- [開発スレッド](https://sportschan.org/librejp/thread/16592.html)
- [NicoCache_nl Usage Guide](https://roflsunriz.github.io/setup-nicocache-nl/regex/)
- [ファイル置き場 避難所3](https://nicocache.jpn.org/)

### 開発資料

- [MDN Web Docs](https://developer.mozilla.org/ja/)
- [HTML早見表](https://developer.mozilla.org/ja/docs/Learn/HTML/Cheatsheet)
- [正規表現早見表](https://developer.mozilla.org/ja/docs/Web/JavaScript/Guide/Regular_expressions/Cheatsheet)
- [正規表現テストツール](https://rubular.com/)
- [Markdown基本文法](https://www.markdownguide.org/basic-syntax/)

### 拡張機能

- [d-anime-nico-comment-renderer : dアニメでニコニコ動画のコメントをレンダリングするユーザースクリプト](https://github.com/roflsunriz/web-page-enhancement-scripts)
