"use strict";

import { durationCalc } from './durationUtil.js';
import { fetchCacheInfo } from './fetchUtil.js';

export const fetchAllVideo = () => {
  const loc = window.location.pathname;
  const arr = /\/user\/(\d+)\/(video)/.exec(loc);
  const userId = arr ? arr[1] : null;

  if (userId) {
    const url = `https://nvapi.nicovideo.jp/v1/users/${userId}/videos?sortKey=registeredAt&sortOrder=desc&pageSize=100&page=1`;
    fetch(url, {
      mode: "cors",
      credentials: "include",
      headers: {
        "X-Frontend-Id": 6,
        "X-Frontend-Version": 0,
      },
    })
      .then((response) => {
        if (response.ok) {
          return response.json();
        } else {
          throw new Error(`HTTP status code: ${response.status} ${response.statusText}`);
        }
      })
      .then((json) => {
        const videoIds = json.data.items.map(item => item.id);
        videoIds.forEach(videoId => {
          handleFetch(videoId);
        });
        window.open("https://www.nicovideo.jp/local/fetched.html");
      })
      .catch((error) => {
        console.error(error);
      });
  } else {
    console.error("User ID not found in the URL.");
  }
};

export const fetchAllMylist = () => {
  const loc = window.location.pathname;
  const arr = /\/user\/(\d+)\/(mylist)/.exec(loc);
  const userId = arr ? arr[1] : null;

  if (userId) {
    const url = `https://nvapi.nicovideo.jp/v1/users/${userId}/mylists?sampleItemCount=3`;
    fetch(url, {
      mode: "cors",
      credentials: "include",
      headers: {
        "X-Frontend-Id": 6,
        "X-Frontend-Version": 0,
      },
    })
      .then((response) => {
        if (response.ok) {
          return response.json();
        } else {
          throw new Error(`HTTP status code: ${response.status} ${response.statusText}`);
        }
      })
      .then((json) => {
        // マイリストの内容を表示するための処理
        const mylists = json.data.mylists;
        let buf = "<form id='mylistForm'><p>Select mylist to fetch:</p>";
        mylists.forEach(mylist => {
          buf += `<div>
                    <input type="radio" name="mylist" value="${mylist.id}">
                    <label for="${mylist.id}">${mylist.id} ${mylist.name}</label>
                  </div>`;
        });
        buf += `<div>
                  <input type="button" id="submitMylist" value="送信">
                  <input type="button" id="cancelMylist" value="キャンセル">
                </div></form>`;
        document.documentElement.insertAdjacentHTML("beforeend", buf);

        document.getElementById("submitMylist").addEventListener("click", () => {
          const selectedMylistId = document.querySelector('input[name="mylist"]:checked').value;
          const mylistUrl = `https://nvapi.nicovideo.jp/v2/mylists/${selectedMylistId}?sortKey=viewCount&sortOrder=desc&pageSize=100&page=1`;
          fetch(mylistUrl, {
            mode: "cors",
            credentials: "include",
            headers: {
              "X-Frontend-Id": 6,
              "X-Frontend-Version": 0,
            },
          })
            .then((response) => {
              if (response.ok) {
                return response.json();
              } else {
                throw new Error(`HTTP status code: ${response.status} ${response.statusText}`);
              }
            })
            .then((json) => {
              const videoIds = json.data.mylist.items.map(item => item.video.id);
              videoIds.forEach(videoId => {
                handleFetch(videoId);
              });
              window.open("https://www.nicovideo.jp/local/fetched.html");
              document.getElementById("mylistForm").remove();
            })
            .catch((error) => {
              console.error(error);
            });
        });

        document.getElementById("cancelMylist").addEventListener("click", () => {
          document.getElementById("mylistForm").remove();
        });
      })
      .catch((error) => {
        console.error(error);
      });
  } else {
    console.error("User ID not found in the URL.");
  }
};

export const fetchAllElement = () => {
  const videoId = NicoCache_nl.watch ? NicoCache_nl.watch.getVideoID() : "";
  const threadId = NicoCache_nl.watch ? NicoCache_nl.watch.apiData.comment.threads.find((v) => v.isDefaultPostTarget === true).id : "";
  document.documentElement.insertAdjacentHTML(
    "afterbegin",
    `
    <div id="userPageBox" onContextMenu="return false;">
      <div id="userPageMiniModeContainer">
        <span class="upTitle">UserPage</span>
        <input title="コントローラを縮小" id="up_mini" type="image" class="upActive" src="https://www.nicovideo.jp/local/CustomFilters/UserPage/img/minimize.png" />
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
              <option value="https://www.nicovideo.jp/local/CustomFilters/UserPage/up_Info.html">概要、コメ情報</option>
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
        <div id="watchblock">
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
              <span id="cachingDuration">- : -</span>
              <span id="cachingPartialSize">- MB</span>
              <div id="progressBar"></div>
            </div>
          </div>
        </div>
      </div>
      <div id="userPageMiniModeAlternativeContainer">
        <input title="元に戻す" id="up_mini2" type="image" src="https://www.nicovideo.jp/local/CustomFilters/UserPage/img/maximize.png" />
      </div>
    </div>
    `
  );

  // Mini mode toggle logic
  const userPageMiniModeContainer = cc.i("userPageMiniModeContainer");
  const myWidth = "190px";
  const littleWidth = "12px";
  userPageMiniModeContainer.style.width = myWidth;
  cc.i("up_mini").addEventListener("click", () => {
    localStorage.setItem("up_minimode", "true");
    const userPageMiniModeAlternativeContainer = cc.i("userPageMiniModeAlternativeContainer");
    userPageMiniModeContainer.style.display = "none";
    userPageMiniModeAlternativeContainer.style.display = "block";
    userPageMiniModeAlternativeContainer.style.width = littleWidth;

    cc.i("up_mini2").addEventListener("click", () => {
      localStorage.setItem("up_minimode", "false");
      userPageMiniModeContainer.style.display = "block";
      userPageMiniModeContainer.style.width = myWidth;
      userPageMiniModeAlternativeContainer.style.display = "none";
    });
  });

  if (/\/watch\/.*/.test(window.location.pathname)) {
    cc.i("watchblock").classList.add("upActive");
  }
  if (/\/watch\/(?:s(?:m|o)\d+.*|\d+.*)/.test(window.location.pathname)) {
    const cacheInfoElement = cc.i("cacheinfo");
    if (cacheInfoElement) {
      setInterval(formatCacheInfo, 3000);
    }
  }

  mini_toggle();
  cc.i("userPageBox").onpointermove = function (event) {
    if (event.buttons) {
      this.style.left = this.offsetLeft + event.movementX + "px";
      this.style.top = this.offsetTop + event.movementY + "px";
      this.style.position = "absolute";
      this.draggable = false;
      this.setPointerCapture(event.pointerId);
    }
  };
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

const handleFetch = (videoId) => {
  if (!videoId) return;
  if (/\/(series\/|search\/|tag\/).*/.test(window.location.pathname)) {
    fetchAll_origin();
  } else if (/\/user\/.*?/.test(window.location.pathname)) {
    fetchAll_wrapper();
  } else {
    fetch(`https://www.nicovideo.jp/cache/fetch?${videoId}`)
      .then(handleFetchResponse)
      .catch(handleFetchError);
  }
};

const handleFetchResponse = (response) => {
  if (response.ok) {
    return response.text().then(text => {
      window.alert(`${text + ":" + videoId + NicoCache_nl.watch.apiData.video.title}`);
    });
  } else {
    handleFetchError(response);
  }
};

const handleFetchError = (response) => {
  const errorcode = "Error: nlMovieFetcher doesn't exist or videoId was null.";
  console.error("HTTP status code : " + response.status);
  console.error("HTTP status Text : " + response.statusText);
  throw new Error(errorcode);
};

const handleCacheRemove = (videoId) => {
  if (!videoId) return;
  if (confirm("本当に削除しますか？: " + videoId + " " + NicoCache_nl?.watch?.apiData.video.title)) {
    NicoCache_nl.get("/cache/ajax_rmall?" + videoId);
  }
};