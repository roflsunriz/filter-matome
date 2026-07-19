export function injectHeatmapStyles(): void {
  const styleId = "heatmap-overlay-styles";

  // すでに存在する場合はスキップ
  if (document.getElementById(styleId)) {
    return;
  }

  const style = document.createElement("style");
  style.id = styleId;
  style.textContent = `
      /* ヒートマップオーバーレイのベーススタイル */
      .heatmap-overlay-container {
        height: 40px;
        pointer-events: none !important;
        z-index: 1000;
        background: rgba(0, 0, 0, 0.1);
        box-sizing: border-box;
        margin: 0;
        padding: 0;
      }
      
      /* 通常時のスタイル */
      .heatmap-overlay-container.heatmap-windowed {
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        width: 100%;
        z-index: 998 !important;
        pointer-events: none !important;
      }
      
      /* フルスクリーン時のスタイル - プレーヤーコントロールより下のレイヤー */
      .heatmap-overlay-container.heatmap-fullscreen,
      body .heatmap-overlay-container.heatmap-fullscreen,
      html .heatmap-overlay-container.heatmap-fullscreen {
        position: fixed !important;
        bottom: 0 !important;
        left: 0 !important;
        right: 0 !important;
        top: auto !important;
        width: 100vw !important;
        height: 40px !important;
        z-index: 1999 !important;
        background: rgba(0, 0, 0, 0.4) !important;
        margin: 0 !important;
        padding: 0 !important;
        transform: none !important;
        visibility: visible !important;
        display: block !important;
        pointer-events: none !important;
      }
      
      /* キャンバスのスタイル - ポインターイベントを限定的に有効化 */
      .heatmap-overlay-canvas {
        width: 100% !important;
        height: 100% !important;
        pointer-events: auto !important;
        cursor: pointer !important;
        display: block !important;
        position: relative !important;
        z-index: 1 !important;
      }
      
      /* フルスクリーン時のキャンバス */
      .heatmap-fullscreen .heatmap-overlay-canvas {
        visibility: visible !important;
        opacity: 1 !important;
        pointer-events: auto !important;
      }
      
      /* 通常時のキャンバス */
      .heatmap-windowed .heatmap-overlay-canvas {
        pointer-events: auto !important;
      }
      
      /* ツールチップのスタイル */
      .heatmap-overlay-tooltip {
        position: absolute;
        display: none;
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 12px;
        pointer-events: none;
        z-index: 2147483648;
        transform: translateX(-50%);
        bottom: 45px;
        white-space: nowrap;
      }
    `;

  document.head.appendChild(style);
  window.logger.info(
    "[HeatmapManager] ヒートマップ用CSSスタイルを挿入しました",
  );
}
