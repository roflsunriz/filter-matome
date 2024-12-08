"use strict";

import { handleCacheRemove } from './cacheUtil.js';
import { handleFetch } from './fetchUtil.js';

export const fetchAllElement = () => {
  const videoId = NicoCache_nl.watch ? NicoCache_nl.watch.getVideoID() : "";
  const threadId = NicoCache_nl.watch ? NicoCache_nl.watch.apiData.comment.threads.find((v) => v.isDefaultPostTarget === true).id : "";
  document.documentElement.insertAdjacentHTML(
    "afterbegin",
    `
    <div id="userPageBox" onContextMenu="return false;">
      <div id="userPageMiniModeContainer">
        <span class="upTitle">LinkAndStatus</span>
        <input title="コントローラを縮小" id="up_mini" type="image" class="upActive" src="https://www.nicovideo.jp/local/CustomFilters/LinkAndStatus/img/minimize.png" />
        <div id="links">
          <select>
            <optgroup label="Original">
              <option value="https://www.nicovideo.jp/local/CustomMylist2/html/manager.html">カスタムマイリスト2</option>
              <option value="commentFilter" selected="">CommentFilter</option>
            </optgroup>
            <optgroup label="nlMovieFetcher">
              <option value="https://www.nicovideo.jp/local/fetched.html">フェッチリスト</option>
            </optgroup>
            <optgroup label="リンク">
              <option value="https://www.nicovideo.jp/newarrival">新着動画</option>
              <option value="https://www.nicovideo.jp/recent">新着コメント</option>
              <option value="https://blog.nicovideo.jp/niconews/category/nicoad/">広告チケット</option>
            </optgroup>
            <optgroup label="キャッシュ">
              <option value="https://www.nicovideo.jp/cache/">キャッシュリスト</option>
              <option value="https://www.nicovideo.jp/cache/info/v2?${videoId}">キャッシュ情報</option>
              <option value="https://www.nicovideo.jp/local/nlMediaInfo/nlMediaInfo.html">nlMediaInfo</option>
              <option value="https://www.nicovideo.jp/local/CustomFilters/LinkAndStatus/videoInfoAndComments.html">概要、コメ情報</option>
              <option value="https://www.nicovideo.jp/cache/${videoId}/auto/movie">保存:動画</option>
              <option value="https://www.nicovideo.jp/cache/${videoId}/auto/audio">保存:音声</option>
              <option value="https://www.nicovideo.jp/cache/${threadId}.xml">保存:コメント</option>
              <option value="cache_remove">削除:キャッシュ</option>
            </optgroup>
            <optgroup label="関連サービス">
              <option value="http://www.nicochart.jp/watch/${videoId}">ニコチャート</option>
              <option value="https://www.nicolog.jp/watch/${videoId}">ニコログ</option>
              <option value="http://nicoranweb.com/watch/${videoId}">ニコラン</option>
              <option value="https://www.nicozon.net/watch/${videoId}">nicozon</option>
              <option value="https://gokulin.info/search/">超検索</option>
              <option value="https://yyya-nico.co/nv_comment_viewer/${videoId}">コメントビューア</option>
              <option value="https://gokulin.info/ranking/">ランキングアーカイブス</option>
              <option value="https://nicodb.net/">ニコ生クリ奨ランキング</option>
              <option value="https://ikioi-ranking.com/v/nico">ニコ生勢いランキング</option>
              <option value="https://cytube.mm428.net/r/cookie_tv">CTV☆</option>
            </optgroup>
          </select>
          <input type="button" value="GO!" id="selectGo" />
        </div>
        <div id="watchblock" class="upActive">
          <hr />
          <div title="キャッシュ中ファイルの詳細情報" id="cacheinfo">
            <div id="parentVideoCompletes">
              <span class="videoCompletes">Cached!</span><span class="videoCompletes">Loading...</span><span class="videoCompletes">N/A</span>
            </div>
            <div id="parentVideoEconomy"><span class="videoEconomy">Economy</span><span class="videoEconomy">Normal</span><span class="videoEconomy">N/A</span></div>
            <div id="parentVideoEncoding">
              <span class="videoEncoding">H.264(AVC)</span><span class="videoEncoding">H.265(HEVC)</span><span class="videoEncoding">AV1</span>
              <span class="videoEncoding">N/A</span>
            </div>
            <div id="parentVideoModes">
              <span class="videoModes">144p</span><span class="videoModes">360p</span><span class="videoModes">480p</span><span class="videoModes">720p</span>
              <span class="videoModes">1080p</span>
              <div id="parentVideoModes2">
                <span class="videoModes">1440p</span><span class="videoModes">2160p</span><span class="videoModes">4320p</span><span class="videoModes">Smile</span>
                <span class="videoModes">N/A</span>
              </div>
            </div>
            <div id="progressContainer">
              <span id="cachingPercentage">- %</span>
              <span id="cachingPartialDuration">- : - </span>
              <span id="cachingPartialSize">- MB</span>
              <div id="progressBar"></div>
            </div>
          </div>
        </div>
      </div>
      <div id="userPageMiniModeAlternativeContainer">
        <input title="元に戻す" id="up_mini2" type="image" src="https://www.nicovideo.jp/local/CustomFilters/LinkAndStatus/img/maximize.png" />
      </div>
    </div>
    `
  );

  // 視聴ページでない場合はwatchblockを非表示に
  if (!NicoCache_nl.watch) {
    const watchblock = document.getElementById('watchblock');
    if (watchblock) {
      watchblock.classList.remove('upActive');
    }
  }
};

export const selectLink = () => {
  const select = cc.t("select")[0];
  selectGo.addEventListener("click", () => {
    const videoId = NicoCache_nl?.watch?.getVideoID();
    switch (select.value) {
      case "fetch":
        handleFetch(videoId);
        break;
      case "cache_remove":
        handleCacheRemove(videoId);
        break;
      case "ngCommentProxy":
        GM_config.open();
        break;
      case "commentFilter":
        CommentFilter.ui.open();
        break;
      default:
        window.open(select.value);
    }
  });
};

export const updateUserPageBoxPosition = () => {
  const userPageBox = cc.i("userPageBox");
  userPageBox.style.top = window.cc.MainVideoPlayerWidthHeightReturner("MainContainerY") + 100 + "px";
  userPageBox.style.left = window.cc.MainVideoPlayerWidthHeightReturner("MainContainerRight") + 500 + "px";
};