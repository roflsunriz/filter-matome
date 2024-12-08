"use strict";

// 定数定義
const RANKING_URL_PATTERN = /^https:\/\/www\.nicovideo\.jp\/ranking/;
const VIDEO_ID_PATTERN = /[a-z]{2}\d+/;
const TOAST_CONFIG = {
  mode: "info",
  middle: "",
  low: "",
  title: "rankingMovieFetcherFilter.jsの動作を開始しました",
  timeout: 5000
};

function rankingInsert() {
  if (!RANKING_URL_PATTERN.test(window.location.href)) return;
  
  const targets = cc.c("NC-VideoCard-metaAdditional");
  const idSources = cc.c("NC-Card-media");

  targets.forEach((target, index) => {
    if (cc.c("rankfetch", target)[0]) return;
    
    const href = idSources[index].getAttribute("href");
    const id = VIDEO_ID_PATTERN.exec(href)?.[0];
    if (!id) return;

    const fetchLink = createFetchLink(id);
    target.insertAdjacentHTML("beforeend", fetchLink);
  });
}

function createFetchLink(id) {
  return `
    <a class="rankfetch" 
       style="position:relative;left:10px;color:black;text-shadow:#FFFF33 1px 1px 1px;" 
       href="javascript:void(0);" 
       onclick="nicofetch(this,'${id}',0)" 
       data-nl_fetch_link="filter">fetch</a>
  `.trim();
}

let isInitialized = false;
window.addEventListener("scroll", () => {
  rankingInsert();
  
  if (!isInitialized) {
    window.cc.Toast(TOAST_CONFIG);
    isInitialized = true;
  }
});
