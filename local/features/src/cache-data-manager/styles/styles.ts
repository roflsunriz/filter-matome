import { materialIconsStyles } from "@/common/material-icons.js";

export const cacheListStyles =
  materialIconsStyles +
  `
body {
    margin: 0;
    font-family: Arial, sans-serif;
  }
  
  .header-content {
    background: linear-gradient(135deg, var(--pink) 0%, var(--purple) 100%);
    padding: 1rem 2rem;
    border-radius: 0 0 30px 30px;
    box-shadow: 0 8px 32px rgba(255, 159, 243, 0.2);
    display: flex;
    flex-direction: column;
    gap: 0.8rem;
    font-family: "Mochiy Pop P One", "Comic Sans MS", cursive;
  }

  .header-top-row {
    display: flex;
    align-items: center;
    justify-content: flex-start;
    gap: 1rem;
    flex-wrap: wrap;
  }

  .header-controls-row {
    display: flex;
    align-items: center;
    gap: 1rem;
    flex-wrap: wrap;
    width: 100%;
  }
  
  .header-title {
    font-size: 1.8rem;
    letter-spacing: 0.1em;
    text-shadow: 3px 3px 0 var(--purple), -1px -1px 0 var(--mint), 0 0 10px rgba(255, 255, 255, 0.4);
    background: linear-gradient(45deg, var(--mint) 20%, var(--pink) 80%);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
    position: relative;
    transform-style: preserve-3d;
    perspective: 1000px;
    animation: title-spin 5.5s cubic-bezier(0.4, 0, 0.2, 1) infinite;
    white-space: nowrap;
  }

  .header-version {
    background: rgba(255, 255, 255, 0.15);
    padding: 0.3rem 0.8rem;
    border-radius: 15px;
    border: 2px solid var(--mint);
    backdrop-filter: blur(5px);
    font-size: 0.8em;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    transition: all 0.3s ease;
    color: var(--text-primary);
  }

  .header-version:hover {
    transform: scale(1.05) rotate(2deg);
    background: rgba(255, 255, 255, 0.25);
  }
  
  @keyframes title-spin {
    0% {
      transform: rotateY(0deg);
    }
    2.5% {
      transform: rotateY(9deg);
    }
    5% {
      transform: rotateY(18deg);
    }
    7.5% {
      transform: rotateY(27deg);
    }
    10% {
      transform: rotateY(36deg);
    }
    12.5% {
      transform: rotateY(45deg);
    }
    15% {
      transform: rotateY(54deg);
    }
    17.5% {
      transform: rotateY(63deg);
    }
    20% {
      transform: rotateY(72deg);
    }
    22.5% {
      transform: rotateY(81deg);
    }
    25% {
      transform: rotateY(90deg);
    }
    27.5% {
      transform: rotateY(99deg);
    }
    30% {
      transform: rotateY(108deg);
    }
    32.5% {
      transform: rotateY(117deg);
    }
    35% {
      transform: rotateY(126deg);
    }
    37.5% {
      transform: rotateY(135deg);
    }
    40% {
      transform: rotateY(144deg);
    }
    42.5% {
      transform: rotateY(153deg);
    }
    45% {
      transform: rotateY(162deg);
    }
    47.5% {
      transform: rotateY(171deg);
    }
    50% {
      transform: rotateY(180deg);
    }
    52.5% {
      transform: rotateY(189deg);
    }
    55% {
      transform: rotateY(198deg);
    }
    57.5% {
      transform: rotateY(207deg);
    }
    60% {
      transform: rotateY(216deg);
    }
    62.5% {
      transform: rotateY(225deg);
    }
    65% {
      transform: rotateY(234deg);
    }
    67.5% {
      transform: rotateY(243deg);
    }
    70% {
      transform: rotateY(252deg);
    }
    72.5% {
      transform: rotateY(261deg);
    }
    75% {
      transform: rotateY(270deg);
    }
    77.5% {
      transform: rotateY(279deg);
    }
    80% {
      transform: rotateY(288deg);
    }
    82.5% {
      transform: rotateY(297deg);
    }
    85% {
      transform: rotateY(306deg);
    }
    87.5% {
      transform: rotateY(315deg);
    }
    90% {
      transform: rotateY(324deg);
    }
    92.5% {
      transform: rotateY(333deg);
    }
    95% {
      transform: rotateY(342deg);
    }
    97.5% {
      transform: rotateY(351deg);
    }
    100% {
      transform: rotateY(360deg);
    }
  }
  
  /* (レガシースタイル - 下で上書き) */
  
  .video-id {
    color: #f5f6fa;
    font-family: "Mochiy Pop P One", "Comic Sans MS", cursive;
  }
  
  /* カラーパレット */
  :root {
    --pink: #ff9ff3;
    --mint: #7afcff;
    --purple: #b19cd9;
    --dark: #2d3436;
    --dark-surface: #3b4345;
    --text-primary: #f5f6fa;
  }

  /* ===================================
   * 仮想スクロールコンテナ
   * =================================== */
  .virtual-scroll-container {
    width: 100%;
    min-height: 100vh;
    background: linear-gradient(180deg, #fff6e3, #bfecff);
    /* ブラウザのスクロールアンカリングを無効化 */
    overflow-anchor: none;
  }

  .virtual-scroll-content {
    width: 100%;
    overflow-anchor: none;
  }

  .virtual-scroll-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 2rem;
    padding: 2rem;
    position: relative;
    overflow-anchor: none;
  }

  .virtual-scroll-spacer {
    width: 100%;
    pointer-events: none;
    overflow-anchor: none;
  }

  .virtual-scroll-sentinel {
    width: 100%;
    height: 1px;
    pointer-events: none;
  }
  
  /* 基本グリッドレイアウト（フォールバック） */
  .cache-container {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 2rem;
    padding: 2rem;
    position: relative;
    margin-top: 4px;
    background: linear-gradient(180deg, #fff6e3, #bfecff);
  }
  
  /* 動画カードスタイル - 固定高さレイアウト */
  .video-card {
    background: var(--dark-surface);
    border-radius: 15px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
    transition: transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
    overflow: hidden;
    display: flex;
    flex-direction: column;
    height: 420px !important; /* 固定高さ */
    max-height: 420px !important;
    min-height: 420px !important;
  }
  
  .video-card:hover {
    transform: translateY(-5px);
  }

  /* カードヘッダー（動画ID） */
  .card-header {
    padding: 0.5rem 1rem;
    background: rgba(0, 0, 0, 0.2);
    flex-shrink: 0;
    height: 32px;
    display: flex;
    align-items: center;
  }
  
  /* メタデータスタイル - 固定高さ */
  .metadata {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
    align-items: center;
    height: 36px; /* 固定高さ */
    flex-shrink: 0;
    margin-top: auto; /* タイトルの下に押し下げ */
  }
  
  .metadata > span {
    background: rgba(255, 159, 243, 0.1);
    padding: 0.3rem 0.6rem;
    border-radius: 20px;
    border: 1px solid var(--pink);
    color: var(--text-primary);
    font-size: 0.75em;
    white-space: nowrap;
  }
  
  .hd-quality {
    background: #4caf50 !important;
    color: white !important;
  }
  .sd-quality {
    background: #ffc107 !important;
    color: black !important;
  }
  .low-quality {
    background: #f44336 !important;
    color: white !important;
  }
  .unknown-quality {
    background: #9e9e9e !important;
    color: white !important;
  }
  
  /* アニメーション */
  @keyframes float {
    0%,
    100% {
      transform: translateY(0);
    }
    50% {
      transform: translateY(-10px);
    }
  }
  
  .video-card:hover .thumbnail-image {
    animation: float 3s ease-in-out infinite;
  }
  
  .nav-link {
    color: var(--text-primary);
    padding: 0.8rem 1.2rem;
    border-radius: 15px;
    transition: all 0.3s ease;
    position: relative;
    font-weight: 500;
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
  }
  
  .nav-link:hover {
    background: rgba(255, 255, 255, 0.1);
    transform: scale(1.05);
    box-shadow: 0 4px 15px rgba(255, 159, 243, 0.3);
  }
  
  .nav-link-icon {
    display: inline-flex;
    opacity: 0;
    transition: opacity 0.3s ease;
    pointer-events: none;
  }
  
  .search-btn-icon {
    width: 18px;
    height: 18px;
  }
  
  .nav-link:hover .nav-link-icon {
    opacity: 1;
  }
  
  .nav-link-icon-img {
    width: 18px;
    height: 18px;
  }
  
  /* 動画情報エリア - 固定高さ */
  .video-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    padding: 0.8rem 1rem;
    min-height: 0; /* flexboxでオーバーフローを有効にするため */
  }

  /* 動画タイトル - 2行で省略 */
  .video-title {
    font-family: "Comic Sans MS", cursive;
    color: var(--mint);
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
    font-size: 1.1rem;
    margin: 0 0 0.5rem 0;
    background: linear-gradient(45deg, var(--pink), var(--mint));
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
    transition: all 0.3s ease;
    /* 2行で省略（...表示） */
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    text-overflow: ellipsis;
    line-height: 1.4;
    height: 3.08em; /* line-height * 2行 + margin */
    flex-shrink: 0;
  }
  
  .video-title:hover {
    transform: rotate(-2deg);
    text-shadow: 0 4px 8px rgba(255, 159, 243, 0.4);
  }
  
  /* 汎用操作ボタン */
  .button {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 12px 24px;
    font-size: 1.1rem;
  }
  
  /* 再生ボタン */
  #play-button,
  .play-btn {
    background: linear-gradient(145deg, #7afcff, #4cd8da);
    padding: 10px 20px;
  }
  
  /* 保存ボタン */
  #save-button,
  .save-btn {
    background: linear-gradient(145deg, #ff9ff3, #d67cd1);
    padding: 10px 25px;
  }
  
  /* 検索ボタン */
  #searchBtn,
  #clearSearch {
    border-radius: 15px;
    background: linear-gradient(145deg, #b19cd9, #8f7bb3);
    padding: 8px 15px;
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
  }
  
  /* 動画カード内アクションボタン - 固定位置 */
  .video-card .card-actions {
    display: flex;
    gap: 8px;
    padding: 0.8rem 1rem;
    background: rgba(0, 0, 0, 0.15);
    flex-shrink: 0;
    height: 56px; /* 固定高さ */
    align-items: center;
    justify-content: space-between;
  }
  
  .video-card button[onclick] {
    flex: 1;
    min-width: 80px;
    font-size: 0.9em;
    padding: 8px 12px;
    border: 1px solid rgba(255, 255, 255, 0.2);
  }
  
  /* 検索関連 */
  .search-box {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-shrink: 0;
  }

  #searchInput {
    border: 2px solid var(--mint);
    border-radius: 25px;
    padding: 6px 16px;
    color: var(--dark);
    width: 200px;
    box-sizing: border-box;
    font-size: 0.9em;
  }

  .search-section {
    display: flex;
    gap: 6px;
  }

  #searchBtn,
  #clearSearch {
    background: linear-gradient(145deg, var(--purple), #8f7bb3);
    padding: 6px 12px;
    font-size: 0.85em;
  }
  
  /* 動画カード内ボタン */
  .play-btn {
    background: linear-gradient(145deg, #7afcff, #4cd8da);
  }
  
  .save-video-btn {
    background: linear-gradient(145deg, #ff9ff3, #d67cd1);
  }
  
  .save-audio-btn {
    background: linear-gradient(145deg, #b19cd9, #8f7bb3);
  }
  
  .delete-btn {
    background: linear-gradient(145deg, #ff6b6b, #ff3838);
  }
  
  /* ボタンアイコン */
  .card-action-icon {
    width: 20px;
    height: 20px;
  }
  
  /* ホバーエフェクト統一 */
  button:not([disabled]):hover {
    filter: brightness(1.2);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  }
  
  /* ボタン状態表示 */
  button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  
  /* アイコンボタンのサイズ調整 */
  .card-actions button {
    min-width: 40px;
    padding: 8px;
    display: flex;
    justify-content: center;
    align-items: center;
    border-radius: 10px;
    box-shadow: 0 8px 32px rgba(255, 159, 243, 0.2);
  }
  
  /* アクションボタンコンテナ */
  .card-actions {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }
  
  /* レスポンシブ対応 */
  @media (max-width: 1200px) {
    .header-controls-row {
      flex-direction: column;
      align-items: flex-start;
    }

    .search-box {
      width: 100%;
    }

    #searchInput {
      flex: 1;
      width: auto;
      min-width: 150px;
    }

    .filter-sort-container {
      width: 100%;
    }
  }

  @media (max-width: 768px) {
    .header-top-row {
      flex-direction: column;
      align-items: flex-start;
    }
  
    .card-actions {
      width: 100%;
      justify-content: center;
    }
  
    .video-card {
      height: 380px; /* モバイル向け固定高さ */
    }
  
    .thumbnail-container {
      height: 140px; /* モバイル向けサムネイル高さ */
    }

    .filter-sort-container {
      flex-direction: column;
      width: 100%;
    }

    .filter-group,
    .sort-group {
      flex-wrap: wrap;
    }

    .main-nav {
      display: none;
    }
  }
  
  .thumbnail-container {
    flex-shrink: 0;
    height: 180px; /* 固定高さ */
    position: relative;
    overflow: hidden;
    background: rgba(0, 0, 0, 0.3);
  }
  
  .thumbnail-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: opacity 0.3s ease;
  }

  /* 遅延読み込み用スタイル */
  .thumbnail-image.lazy-placeholder {
    opacity: 0.5;
    background: linear-gradient(90deg, #ddd 25%, #eee 50%, #ddd 75%);
    background-size: 200% 100%;
    animation: shimmer 1.5s infinite;
  }

  .thumbnail-image.lazy-loaded {
    opacity: 1;
  }

  .thumbnail-image.lazy-error {
    opacity: 0.7;
    filter: grayscale(100%);
  }

  @keyframes shimmer {
    0% {
      background-position: 200% 0;
    }
    100% {
      background-position: -200% 0;
    }
  }
  
  .card-content {
    padding: 1rem;
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }
  
  /* プログレスバー */
  .global-progress {
    position: relative;
    top: 0; /* ヘッダーがない場合のフォールバック */
    left: 0;
    right: 0;
    height: 4px;
    z-index: 999;
    background: rgba(0, 0, 0, 0.1);
    display: none;
    align-items: center;
    padding: 0 1rem;
    height: 32px;
  }
  
  .progress-bar {
    flex: 1;
    height: 32px;
    background: rgba(255, 255, 255, 0.2);
    border-radius: 2px;
    overflow: hidden;
  }
  
  .progress-fill {
    width: 0%;
    height: 100%;
    background: linear-gradient(90deg, #86e4a2, #04e604); /* 緑系グラデーション */
    transition: width 0.3s ease, opacity 0.2s;
    border-radius: 2px;
  }
  
  /* エラー時の赤色表示 */
  .progress-fill.error {
    background: linear-gradient(90deg, #ff6b6b, #ff3838);
  }
  
  .progress-text {
    color: var(--text-dark);
    font-size: 0.85em;
    margin-left: 1rem;
    white-space: nowrap;
  }
  
  /* クオリティバッジスタイル */
  .quality-badge {
    font-size: 0.8em;
    font-weight: bold;
  }
  
  .detail-modal {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }
  
  .modal-content {
    background: var(--dark-surface);
    padding: 2rem;
    border-radius: 15px;
    max-width: 600px;
    width: 90%;
    position: relative;
  }
  
  .close-btn {
    position: absolute;
    right: 1rem;
    top: 1rem;
    font-size: 2rem;
    cursor: pointer;
    color: var(--text-primary);
  }
  
  .modal-body {
    display: grid;
    grid-template-columns: 1fr 2fr;
    gap: 1.5rem;
    margin-top: 1rem;
  }
  
  .modal-thumbnail {
    width: 100%;
    border-radius: 10px;
  }
  
  .modal-info p {
    margin: 0.5rem 0;
    color: var(--text-primary);
    font-size: 0.95em;
  }
  
  /* 日付表示専用スタイル */
  .modal-info p:nth-last-child(1) {
    color: var(--mint);
    font-weight: bold;
    margin-top: 1rem;
  }
  
  .modal-tags span {
    display: inline-block;
    background: rgba(255,159,243,0.2);
    padding: 0.3rem 0.8rem;
    border-radius: 15px;
    margin: 0.3rem;
    font-size: 0.9em;
  }
  
  .error-message {
    background: #ffe6e6;
    border-left: 4px solid #ff4444;
    padding: 15px;
    margin: 10px 0;
    border-radius: 4px;
  }
  
  .error-message p {
    color: #cc0000;
    margin: 5px 0;
  }
  
  .error-note {
    font-size: 0.9em;
    margin-top: 10px;
    font-weight: bold;
  }
  
  .error-thumbnail {
    filter: grayscale(100%);
    opacity: 0.7;
    border: 2px dashed #ff4444;
  }

  /* ===================================
   * フィルター・ソートUI
   * =================================== */
  .filter-sort-container {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 0.5rem 1rem;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 15px;
    backdrop-filter: blur(5px);
    flex-wrap: wrap;
  }

  .filter-group,
  .sort-group {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .filter-label,
  .sort-label {
    display: flex;
    align-items: center;
    gap: 0.3rem;
    color: var(--text-primary);
    font-size: 0.85em;
    font-weight: 500;
  }

  .filter-sort-icon {
    width: 16px;
    height: 16px;
  }

  .filter-select,
  .sort-select {
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid var(--mint);
    border-radius: 10px;
    padding: 0.4rem 0.8rem;
    color: var(--text-primary);
    font-size: 0.85em;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .filter-select:hover,
  .sort-select:hover {
    background: rgba(0, 0, 0, 0.5);
    border-color: var(--pink);
  }

  .filter-select:focus,
  .sort-select:focus {
    outline: none;
    box-shadow: 0 0 0 2px var(--mint);
  }

  .filter-select option,
  .sort-select option {
    background: var(--dark-surface);
    color: var(--text-primary);
  }

  .sort-direction-btn {
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid var(--mint);
    border-radius: 10px;
    padding: 0.4rem;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .sort-direction-btn:hover {
    background: rgba(0, 0, 0, 0.5);
    border-color: var(--pink);
  }

  .sort-direction-icon {
    width: 16px;
    height: 16px;
  }

  .filter-actions {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .reset-filters-btn {
    display: flex;
    align-items: center;
    gap: 0.3rem;
    background: rgba(255, 107, 107, 0.3);
    border: 1px solid #ff6b6b;
    border-radius: 10px;
    padding: 0.4rem 0.8rem;
    color: var(--text-primary);
    font-size: 0.8em;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .reset-filters-btn:hover {
    background: rgba(255, 107, 107, 0.5);
  }

  .delete-temporary-btn {
    display: flex;
    align-items: center;
    gap: 0.3rem;
    background: rgba(255, 87, 34, 0.35);
    border: 1px solid #ff5722;
    border-radius: 10px;
    padding: 0.4rem 0.8rem;
    color: var(--text-primary);
    font-size: 0.8em;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .delete-temporary-btn:hover {
    background: rgba(255, 87, 34, 0.55);
  }

  .result-count {
    color: var(--mint);
    font-size: 0.9em;
    font-weight: bold;
    padding: 0.3rem 0.8rem;
    background: rgba(0, 0, 0, 0.2);
    border-radius: 10px;
  }

  /* ===================================
   * 検索結果モーダル
   * =================================== */
  .search-results-modal {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 2000;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    transition: opacity 0.2s ease;
  }

  .search-results-modal.open {
    opacity: 1;
  }

  .search-results-modal.closing {
    opacity: 0;
  }

  .search-results-modal-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.85);
    backdrop-filter: blur(5px);
  }

  .search-results-modal-content {
    position: relative;
    width: 95%;
    max-width: 1400px;
    height: 90vh;
    max-height: 900px;
    background: linear-gradient(135deg, var(--dark) 0%, var(--dark-surface) 100%);
    border-radius: 20px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    transform: scale(0.95);
    transition: transform 0.2s ease;
  }

  .search-results-modal.open .search-results-modal-content {
    transform: scale(1);
  }

  .search-results-modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1.5rem 2rem;
    background: linear-gradient(135deg, var(--pink) 0%, var(--purple) 100%);
    border-bottom: 2px solid var(--mint);
  }

  .search-results-modal-title {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
  }

  .search-query {
    font-size: 1.5rem;
    font-weight: bold;
    color: var(--text-primary);
    font-family: "Mochiy Pop P One", "Comic Sans MS", cursive;
  }

  .search-count {
    font-size: 0.9rem;
    color: rgba(255, 255, 255, 0.8);
  }

  .search-results-modal-close {
    background: rgba(255, 255, 255, 0.2);
    border: none;
    border-radius: 50%;
    width: 40px;
    height: 40px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
  }

  .search-results-modal-close:hover {
    background: rgba(255, 255, 255, 0.3);
    transform: rotate(90deg);
  }

  .search-results-modal-body {
    flex: 1;
    overflow-y: auto;
    padding: 1.5rem;
    background: linear-gradient(180deg, rgba(255, 246, 227, 0.1), rgba(191, 236, 255, 0.1));
  }

  .search-results-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 2rem;
    overflow-anchor: none;
  }

  /* 検索結果カード - メインリストと同じ固定サイズ */
  .search-result-card {
    margin: 0;
    max-width: none;
    height: 420px !important;
    max-height: 420px !important;
    min-height: 420px !important;
  }

  .search-no-results {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 4rem;
    color: var(--text-primary);
    opacity: 0.7;
  }

  .search-no-results p {
    margin-top: 1rem;
    font-size: 1.2rem;
  }

  .search-results-modal-footer {
    padding: 1rem 2rem;
    background: var(--dark-surface);
    border-top: 1px solid rgba(255, 255, 255, 0.1);
  }

  .search-results-pagination {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 1rem;
  }

  .pagination-btn {
    display: flex;
    align-items: center;
    gap: 0.3rem;
    background: linear-gradient(145deg, var(--purple), #8f7bb3);
    border: none;
    border-radius: 10px;
    padding: 0.6rem 1.2rem;
    color: var(--text-primary);
    font-size: 0.9rem;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .pagination-btn:hover:not(:disabled) {
    filter: brightness(1.2);
    transform: translateY(-2px);
  }

  .pagination-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .pagination-info {
    color: var(--text-primary);
    font-size: 0.95rem;
    padding: 0.5rem 1rem;
    background: rgba(0, 0, 0, 0.2);
    border-radius: 10px;
  }

  /* ===================================
   * スクロールトップボタン
   * =================================== */
  .scroll-to-top-btn {
    position: fixed;
    bottom: 2rem;
    right: 2rem;
    width: 50px;
    height: 50px;
    background: linear-gradient(145deg, var(--mint), #4cd8da);
    border: none;
    border-radius: 50%;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4px 15px rgba(122, 252, 255, 0.4);
    transition: all 0.3s ease;
    z-index: 900;
  }

  .scroll-to-top-btn:hover {
    transform: translateY(-5px);
    box-shadow: 0 8px 25px rgba(122, 252, 255, 0.5);
  }

  .scroll-to-top-btn svg {
    color: var(--dark);
  }

  /* ===================================
   * 結果なしメッセージ
   * =================================== */
  .no-results {
    grid-column: 1 / -1;
    text-align: center;
    padding: 4rem 2rem;
    color: var(--dark);
    font-size: 1.2rem;
    background: rgba(255, 255, 255, 0.5);
    border-radius: 15px;
    margin: 2rem;
  }
  `;
