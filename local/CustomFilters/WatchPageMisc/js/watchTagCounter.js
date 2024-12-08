"use strict";

window.addEventListener("load", () => {
  const tagItemsCounter = cc.i("TagItemsCounter");
  if (tagItemsCounter) tagItemsCounter.remove();

  try {
    window.setTimeout(() => {
      const videoIDMatch = /s[mo]\d+/.exec(window.location.pathname);
      if (videoIDMatch) {
        tagCounter({
          element: cc.c("pos_relative d_flex flex-wrap_wrap gap_base")[0],
          videoID: videoIDMatch[0],
          tagLength: document.querySelectorAll("div.d_inline-flex").length,
        });
      }
    }, 1500);
  } catch (error) {
    console.error("エラーが発生しました:", error);
    window.cc.Toast({
      mode: "warning",
      middle: "",
      low: error.message,
      title: "タグカウンタ設置が失敗しました",
      timeout: 5000,
    });
  }
});

/**
 * エレメント配列とビデオID,タグの個数を受け取って挿入する関数
 * @param {object} option - オプションオブジェクト
 * @param {Element} option.element - Target Element
 * @param {string} option.videoID - Id of video
 * @param {number} option.tagLength - Length of Tag Element
 */
function tagCounter(option) {
  if (!cc.i("TagItemsCounter")) {
    if (!option.element) {
      console.error("エラー: option.elementが存在しません。");
      return;
    }
    const href = `href="https://commons.nicovideo.jp/works/${option.videoID}" target="_blank"`;
    const tagCounterHTML = `
      <div title="タグ個数" id="TagItemsCounter" class="TagItem d_inline-flex pr_x0_5 h_x4 ai_center bdr_full bg-c_action.base flex-wrap_wrap fw_bold ov_hidden [&amp;:has(>_a:nth-child(1):hover)]:bg-c_action.baseHover">
        <a title="コンテンツツリー" data-anchor-page="watch" data-anchor-area="tags" class="pl_x2 pr_base h_100% d_flex ai_center" ${href}>
          タグ個数${option.tagLength}個/最大11個
        </a>
        <a data-anchor-page="watch" data-anchor-area="tags" target="_blank" class="fill_monotone.L100 fs_2xl bdr_full ov_hidden" ${href}>
          <svg id="TagItemsCounter_icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" class="w_font h_font bg-c_serviceColor.nicodic hover:bg-c_action.tagNicoDicHover">
            <path fill-rule="evenodd" d="M6.94 7.82a.44.44 0 0 1-.44-.44v-.44a.44.44 0 0 1 .44-.44h10.12a.44.44 0 0 1 .44.44v.44a.44.44 0 0 1-.44.44h-3.74L12 9.14h4.18a.44.44 0 0 1 .44.44v7.48c0 .24-.2.44-.44.44H7.82a.44.44 0 0 1-.44-.44V9.58a.44.44 0 0 1 .44-.44H9.8l1.32-1.32zm2.86 5.72a.2.2 0 0 0-.22.22v2.2a.2.2 0 0 0 .22.22h4.4a.2.2 0 0 0 .22-.22v-2.2a.2.2 0 0 0-.22-.22zm0-3.08c-.12 0-.22.1-.22.22V12c0 .12.1.22.22.22h4.4c.12 0 .22-.1.22-.22v-1.32c0-.12-.1-.22-.22-.22z" clip-rule="evenodd"></path>
          </svg>
        </a>
      </div>
    `;
    option.element.insertAdjacentHTML(`beforeend`, tagCounterHTML);
  }
}
