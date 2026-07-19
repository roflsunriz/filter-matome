export function injectGlobalBackgroundStyles(): void {
  // 既存のスタイルがあるかチェック
  const existingStyle = document.getElementById(
    "watch-background-global-styles",
  );
  if (existingStyle) {
    return;
  }

  const style = document.createElement("style");
  style.id = "watch-background-global-styles";
  style.textContent = `
      @charset "utf-8";

      /*-------------------------
       * グローバル背景スタイル（CSS変数定義）
       *-------------------------*/
      :root {
        /*scroll, fixed, local*/
        /*background-attachment*/
        --bg-att: fixed;
        /*normal, multiply, screen, overlay, darken, lighten, color-dodge, color-burn, hard-light,*/
        /*soft-light, difference, exclusion, hue, saturation, color, luminosity*/
        /*background-blend-mode*/
        --bg-bl-m: normal;
        /*border-box, padding-box, content-box, text*/
        /*background-clip*/
        --bg-cl: initial;
        /*color keywords, rgb, hex, hsl, currentcolor, transparent*/
        /*background-color*/
        --bg-col: black;
        /*url, gradient, element, image, cross-fade, image-set*/
        /*background-image*/
        --bg-img: initial;
        /*border-box, padding-box, content-box*/
        /*background-origin*/
        --bg-org: initial;
        /*top, bottom, left, right, center, percentage, length, multiple images, offsets*/
        /*background-position*/
        --bg-pos: center;
        /*repeat-x, repeat-y, repeat, space, round, no-repeat*/
        --bg-rep: no-repeat;
        /*cover, contain, width, width height, multiple images*/
        --bg-siz: cover;
      }
    `;

  document.head.appendChild(style);
}
