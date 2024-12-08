"use strict";

const remover = () => {
  const NGWORD = new RegExp("(?:ホモと(?:見る|聞く|聴く|学ぶ)|女vs)");
  const PlayerPanelVideoTitle = Array.from(cc.t("h2"));
  const RecommendedVideoThumbnail = Array.from(cc.c("items_flex-start gap_base"));

  PlayerPanelVideoTitle.forEach(title => {
    try {
      if (NGWORD.test(title.textContent)) {
        RecommendedVideoThumbnail.forEach(thumbItem => {
          thumbItem.style.visibility = "hidden";
        });
      }
    } catch (error) {
      console.error("エラーが発生しました:", error);
    }
  });
};

window.addEventListener("load", () => {
  document.body.addEventListener("wheel", remover);
});
