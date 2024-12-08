"use strict";
let onlyOnceNG = 0;

// 定数をファイル先頭で定義
const RANKING_URL_PATTERN2 = /https:\/\/www\.nicovideo\.jp\/ranking.*/;
const NG_WORD_PATTERN2 = /(?:ホモと(?:見る|聞く|聴く|学ぶ)|女vs)/;

function rankingInsert() {
  if (!RANKING_URL_PATTERN2.test(window.location.href)) return;
  
  const rankingThumbnail = Array.from(cc.c("NC-Card"));
  const titles = cc.c("NC-CardTitle");
  
  rankingThumbnail.forEach((thumbnail, index) => {
    if (NG_WORD_PATTERN2.test(titles[index].textContent)) {
      thumbnail.style.visibility = "hidden";
    }
  });
}

// トースト通知の設定をオブジェクトとして分離
const TOAST_CONFIG2 = {
  mode: "info",
  middle: "",
  low: "",
  title: "rankingMovieNGHidden.jsの動作を開始しました",
  timeout: 5000
};

window.addEventListener("scroll", () => {
  rankingInsert();
  if (!onlyOnceNG) {
    window.cc.Toast(TOAST_CONFIG2);
    onlyOnceNG = 1;
  }
});
