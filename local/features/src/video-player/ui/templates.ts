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
    width: auto;
    height: auto;
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
    object-position: center center; /* 通常表示時も中央配置を保証します */
    display: block;
    margin: auto; /* flexboxコンテナ内での中央配置 */
    flex-shrink: 0; /* 縮小を防ぐ */
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
  .custom-player:-webkit-full-screen,
  .custom-player:-moz-full-screen,
  .custom-player:-ms-fullscreen,
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
  .custom-player:-webkit-full-screen .video-container,
  .custom-player:-moz-full-screen .video-container,
  .custom-player:-ms-fullscreen .video-container,
  html.fullscreen-active .custom-player.nc-fullscreen-player .video-container,
  body.nc-fullscreen-active .custom-player.nc-fullscreen-player .video-container {
    position: absolute !important;
    top: 0 !important;
    left: 0 !important;
    width: 100% !important;
    height: 100% !important;
    display: flex !important;
    justify-content: center !important;
    align-items: center !important;
    overflow: hidden !important;
    background: #000 !important; /* 黒背景を確実に表示 */
  }

  /* 全画面時のビデオ要素スタイル - ネイティブAPI + フォールバック */
  .custom-player:fullscreen #video-element,
  .custom-player:-webkit-full-screen #video-element,
  .custom-player:-moz-full-screen #video-element,
  .custom-player:-ms-fullscreen #video-element,
  html.fullscreen-active .custom-player.nc-fullscreen-player #video-element,
  body.nc-fullscreen-active .custom-player.nc-fullscreen-player #video-element {
    /* position + transform による確実な中央配置 */
    position: absolute !important;
    top: 50% !important;
    left: 50% !important;
    transform: translate(-50%, -50%) !important;
    width: 100vw !important;
    height: 100vh !important;
    max-width: 100vw !important;
    max-height: 100vh !important;
    object-fit: contain !important;
    object-position: center center !important;
    display: block !important;
    /* レターボックス/ピラーボックス用の背景色 */
    background-color: #000 !important;
    z-index: 1 !important;
  }

  /* 全画面時のコメントキャンバス - ネイティブAPI + フォールバック */
  .custom-player:fullscreen #comment-canvas,
  .custom-player:-webkit-full-screen #comment-canvas,
  .custom-player:-moz-full-screen #comment-canvas,
  .custom-player:-ms-fullscreen #comment-canvas,
  html.fullscreen-active .custom-player.nc-fullscreen-player #comment-canvas,
  body.nc-fullscreen-active .custom-player.nc-fullscreen-player #comment-canvas {
    position: absolute !important;
    top: 0 !important;
    left: 0 !important;
    width: 100% !important;
    height: 100% !important;
    pointer-events: none !important;
    display: block !important;
    z-index: 10 !important;
  }

  /* 全画面時のプレーヤーコントロール配置 */
  .custom-player:fullscreen player-controls-shadow,
  .custom-player:-webkit-full-screen player-controls-shadow,
  .custom-player:-moz-full-screen player-controls-shadow,
  .custom-player:-ms-fullscreen player-controls-shadow,
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

  /* マウスホバー用のスタイル（ビデオコンテナ） */
  .video-container:hover {
    cursor: default;
  }

  /* 全画面表示中のカーソル制御 - ネイティブAPI + フォールバック */
  .custom-player:fullscreen .video-container,
  .custom-player:-webkit-full-screen .video-container,
  .custom-player:-moz-full-screen .video-container,
  .custom-player:-ms-fullscreen .video-container,
  html.fullscreen-active .custom-player.nc-fullscreen-player .video-container,
  body.nc-fullscreen-active .custom-player.nc-fullscreen-player .video-container {
    cursor: none;
  }

  .custom-player:fullscreen .video-container:hover,
  .custom-player:-webkit-full-screen .video-container:hover,
  .custom-player:-moz-full-screen .video-container:hover,
  .custom-player:-ms-fullscreen .video-container:hover,
  html.fullscreen-active .custom-player.nc-fullscreen-player .video-container:hover,
  body.nc-fullscreen-active .custom-player.nc-fullscreen-player .video-container:hover {
    cursor: default;
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

  .comment-list-header {
    padding: 10px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.2);
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

/**
 * フローティング削除済み動画プレーヤーのHTMLテンプレート
 * ドラッガブル半透明ガラス効果のおしゃれプレーヤーです
 */
export const FLOATING_DELETED_PLAYER_HTML = `
  <div id="floating-deleted-player" class="floating-deleted-player">
    <div class="floating-player-header">
      <div class="floating-player-title">
        <span class="video-icon" data-material-icon="video_library"></span>
        <span class="title-text">削除済み動画プレーヤー</span>
      </div>
      <div class="floating-player-controls">
        <button class="minimize-btn" title="最小化">−</button>
        <button class="close-btn" title="閉じる">×</button>
      </div>
    </div>
    <div class="floating-player-content">
      <div class="video-info">
        <div class="video-id-display"></div>
      </div>
      <div class="video-container">
        <video id="floating-video-element" playsinline preload="auto" crossorigin="anonymous" controls>
          <source src="" type="video/mp4">
          <p>お使いのブラウザはHTML5ビデオをサポートしていません。</p>
        </video>
      </div>
      <div class="player-status">
        <span class="status-text">待機中...</span>
      </div>
    </div>
  </div>
`;

import { materialIconsStyles } from '../../common/material-icons.js';

/**
 * フローティング削除済み動画プレーヤーのスタイル
 * 半透明ガラス効果とドラッガブル機能を持つおしゃれなデザインです
 */
export const FLOATING_DELETED_PLAYER_STYLES = `
  ${materialIconsStyles}
  .floating-deleted-player {
    position: fixed;
    top: 100px;
    right: 20px;
    width: 400px;
    min-height: 300px;
    max-width: 80vw;
    max-height: 80vh;
    background: rgba(0, 0, 0, 0.85);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 16px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
    color: white;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    z-index: 10000;
    overflow: hidden;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    user-select: none;
    resize: none;
  }

  .floating-deleted-player:hover {
    box-shadow: 0 12px 48px rgba(0, 0, 0, 0.6);
    transform: translateY(-2px);
  }

  .floating-deleted-player.minimized {
    height: 60px;
    min-height: 60px;
  }

  .floating-deleted-player.minimized .floating-player-content {
    display: none;
  }

  .floating-player-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    background: rgba(255, 255, 255, 0.1);
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    cursor: move;
    user-select: none;
  }

  .floating-player-title {
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 600;
    font-size: 14px;
  }

  .video-icon {
    font-size: 16px;
    filter: drop-shadow(0 0 4px rgba(255, 255, 255, 0.3));
  }

  .floating-player-controls {
    display: flex;
    gap: 8px;
  }

  .minimize-btn,
  .close-btn {
    width: 24px;
    height: 24px;
    border: none;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.2);
    color: white;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    font-weight: bold;
    transition: all 0.2s ease;
  }

  .minimize-btn:hover {
    background: rgba(255, 193, 7, 0.8);
    transform: scale(1.1);
  }

  .close-btn:hover {
    background: rgba(220, 53, 69, 0.8);
    transform: scale(1.1);
  }

  .floating-player-content {
    padding: 16px;
  }

  .video-info {
    margin-bottom: 12px;
  }

  .video-id-display {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.8);
    background: rgba(255, 255, 255, 0.1);
    padding: 6px 10px;
    border-radius: 8px;
    text-align: center;
    word-break: break-all;
  }

  .video-container {
    position: relative;
    width: 100%;
    height: 200px; /* デフォルト高さ、JSで動的に調整 */
    background: rgba(0, 0, 0, 0.5);
    border-radius: 12px;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  #floating-video-element {
    width: auto;
    height: auto;
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
    object-position: center center; /* 中央配置を保証 */
    display: block;
    background: #000;
    margin: auto; /* flexboxコンテナ内での中央配置 */
    flex-shrink: 0; /* 縮小を防ぐ */
  }

  .player-status {
    text-align: center;
    padding: 8px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 8px;
  }

  .status-text {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.7);
  }

  /* ドラッグ中のスタイル */
  .floating-deleted-player.dragging {
    transform: rotate(2deg) scale(1.02);
    box-shadow: 0 16px 64px rgba(0, 0, 0, 0.8);
    z-index: 10001;
  }

  /* レスポンシブ対応 */
  @media (max-width: 768px) {
    .floating-deleted-player {
      width: calc(100vw - 40px);
      max-width: 400px;
      right: 20px;
      left: 20px;
    }
  }

  /* アニメーション */
  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .floating-deleted-player {
    animation: fadeInUp 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  }

  /* HLS.js エラー表示用 */
  .hls-error {
    background: rgba(220, 53, 69, 0.2);
    border: 1px solid rgba(220, 53, 69, 0.5);
    color: #ff6b6b;
    padding: 8px;
    border-radius: 8px;
    margin-top: 8px;
    font-size: 12px;
  }

  /* 成功表示用 */
  .hls-success {
    background: rgba(40, 167, 69, 0.2);
    border: 1px solid rgba(40, 167, 69, 0.5);
    color: #51cf66;
    padding: 8px;
    border-radius: 8px;
    margin-top: 8px;
    font-size: 12px;
  }
`; 
