/**
 * シャドウDOM版カスタムプレイヤーのHTMLテンプレート
 * スタイル分離を実現するために最小限の構造にします
 */
export const CUSTOM_PLAYER_SHADOW_HTML = `
  <div id="custom-player" class="custom-player">
    <div class="video-container">
      <video id="video-element" playsinline preload="auto" crossorigin="anonymous">
        <source src="" type="video/mp4">
        <p>お使いのブラウザはHTML5ビデオをサポートしていません。</p>
      </video>
      <canvas id="comment-canvas"></canvas>
      <!-- シャドウDOM版のプレイヤーコントロール -->
      <player-controls-shadow></player-controls-shadow>
    </div>
  </div>
`;

/**
 * シャドウDOM版プレイヤーの基本スタイル
 * プレイヤーコントロールはシャドウDOM内で管理されるため、
 * ここでは最小限のスタイルのみ定義します
 */
export const CUSTOM_PLAYER_SHADOW_STYLES = `
  .custom-player {
    position: relative;
    width: 100%;
    height: initial !important;
    --video-aspect-ratio: 16 / 9;
    --fullscreen-video-left: 0px;
    --fullscreen-video-top: 0px;
    --fullscreen-video-width: 100vw;
    --fullscreen-video-height: 100vh;
    background: #000;
    color: white;
    font-family: Arial, sans-serif;
    border-radius: 10px;
    display: flex;
    flex-direction: column;
    min-height: 180px;
  }

  .video-container {
    position: relative;
    width: 100%;
    height: initial !important;
    overflow: hidden;
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 180px;
  }
    
  #video-element {
    width: 100%;
    height: 100%;
    object-fit: contain;
    object-position: center center; /* 通常表示時も中央配置を保証します */
    display: block;
  }

  #comment-canvas {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 1;
  }

  /* プレイヤーコントロール（シャドウDOM版）の表示制御 */
  .custom-player:hover player-controls-shadow:not(.always-visible) {
    /* シャドウDOM内でvisibleクラスを制御 */
  }

  /* 常時表示モードの場合 */
  player-controls-shadow.always-visible {
    /* シャドウDOM内でスタイル管理 */
  }

  /* 全画面表示時の基本スタイル - ネイティブAPI + フォールバック */
  .custom-player:fullscreen,
  html.fullscreen-active .custom-player.nc-fullscreen-player,
  body.nc-fullscreen-active .custom-player.nc-fullscreen-player {
    position: fixed !important;
    top: 0 !important;
    left: 0 !important;
    width: 100vw !important;
    height: 100vh !important;
    max-width: none !important;
    max-height: none !important;
    background: black !important;
    padding: 0 !important;
    margin: 0 !important;
    border-radius: 0 !important;
    display: block !important;
    z-index: 2147483647 !important;
    overflow: visible !important;
  }

  /* 全画面時のビデオコンテナスタイル - ネイティブAPI + フォールバック */
  .custom-player:fullscreen .video-container,
  html.fullscreen-active .custom-player.nc-fullscreen-player .video-container,
  body.nc-fullscreen-active .custom-player.nc-fullscreen-player .video-container {
    position: absolute !important;
    top: var(--fullscreen-video-top) !important;
    left: var(--fullscreen-video-left) !important;
    width: var(--fullscreen-video-width) !important;
    height: var(--fullscreen-video-height) !important;
    max-width: none !important;
    max-height: none !important;
    aspect-ratio: var(--video-aspect-ratio) !important;
    display: flex !important;
    justify-content: center !important;
    align-items: center !important;
    overflow: hidden !important;
    background: #000 !important; /* 黒背景を確実に表示 */
  }

  /* 全画面時のビデオ要素スタイル - ネイティブAPI + フォールバック */
  .custom-player:fullscreen #video-element,
  html.fullscreen-active .custom-player.nc-fullscreen-player #video-element,
  body.nc-fullscreen-active .custom-player.nc-fullscreen-player #video-element {
    position: relative !important;
    width: 100% !important;
    height: 100% !important;
    max-width: 100% !important;
    max-height: 100% !important;
    transform: none !important;
    object-fit: contain !important;
    object-position: center center !important;
    display: block !important;
    background-color: #000 !important;
    z-index: 1 !important;
  }

  /* 全画面時のコメントキャンバス - ネイティブAPI + フォールバック */
  .custom-player:fullscreen #comment-canvas,
  html.fullscreen-active .custom-player.nc-fullscreen-player #comment-canvas,
  body.nc-fullscreen-active .custom-player.nc-fullscreen-player #comment-canvas {
    position: absolute !important;
    top: 0 !important;
    left: 0 !important;
    width: 100% !important;
    height: 100% !important;
    pointer-events: none !important;
    display: block !important;
    z-index: 1001 !important; /* player-controlsより手前、ビデオより奥 */
  }

  /* 全画面時のコメントオーバーレイレイヤー（実際の描画先はこちら） */
  .custom-player:fullscreen .comment-overlay-layer,
  html.fullscreen-active .custom-player.nc-fullscreen-player .comment-overlay-layer,
  body.nc-fullscreen-active .custom-player.nc-fullscreen-player .comment-overlay-layer {
    position: absolute !important;
    top: var(--fullscreen-video-top) !important;
    left: var(--fullscreen-video-left) !important;
    width: var(--fullscreen-video-width) !important;
    height: var(--fullscreen-video-height) !important;
    max-width: none !important;
    max-height: none !important;
    aspect-ratio: var(--video-aspect-ratio) !important;
    pointer-events: none !important;
    display: block !important;
    z-index: 1001 !important; /* video(z-index:1) の上 / controls(2000) の下 */
  }

  /* 全画面時のプレーヤーコントロール配置 */
  .custom-player:fullscreen player-controls-shadow,
  html.fullscreen-active .custom-player.nc-fullscreen-player player-controls-shadow,
  body.nc-fullscreen-active .custom-player.nc-fullscreen-player player-controls-shadow {
    position: fixed !important;
    bottom: 0 !important;
    left: 0 !important;
    right: 0 !important;
    width: 100vw !important;
    z-index: 2000 !important;
    background: linear-gradient(transparent, rgba(0, 0, 0, 0.8)) !important;
  }

  /* カーソル制御は PlayerControlsShadow.setupHoverEvents() の JS で管理 */
  .custom-player.cursor-hidden,
  .custom-player.cursor-hidden * {
    cursor: none !important;
  }

  /* モバイル対応 */
  @media (max-width: 768px) {
    .custom-player {
      border-radius: 5px;
    }
  }

  /* ───────── コメントリスト関連スタイル追加 (2024-05-26) ───────── */
  .video-with-comments {
    display: flex !important;
    align-items: flex-start;
    gap: 10px;
    padding: 10px;
    max-width: 1920px;
    margin: 0 auto;
  }

  .comment-list-container {
    width: 320px;
    background: rgba(0, 0, 0, 0.9);
    color: white;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    border-radius: 4px;
    transition: all 0.3s ease;
  }

  .comment-list {
    flex: 1;
    overflow-y: auto;
    padding: 10px;
  }

  .comment-item {
    padding: 8px;
    margin-bottom: 4px;
    border-radius: 4px;
    background: rgba(255, 255, 255, 0.1);
    font-size: 14px;
    transition: background-color 0.2s;
    cursor: pointer;
  }
  .comment-item:hover {
    background: rgba(255, 255, 255, 0.2);
  }
  .comment-item.active {
    background: rgba(0, 123, 255, 0.3);
  }
  .comment-time {
    color: #007bff;
    margin-right: 8px;
  }

  /* スクロールバー */
  .comment-list::-webkit-scrollbar {
    width: 6px;
  }
  .comment-list::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.1);
  }
  .comment-list::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.3);
    border-radius: 3px;
  }

  /* レスポンシブ調整 */
  @media (max-width: 1023px) {
    .video-with-comments {
      flex-direction: column;
      padding: 8px;
    }
    .comment-list-container {
      width: 100%;
      height: 300px !important;
      margin-top: 10px;
    }
  }
  @media (max-width: 767px) {
    .comment-item {
      font-size: 12px;
      padding: 6px;
    }
  }
`;
