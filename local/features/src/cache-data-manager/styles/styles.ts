export const cacheListStyles = `
body {
    margin: 0;
    font-family: Arial, sans-serif;
  }
  
  .header-content {
    background: linear-gradient(135deg, var(--pink) 0%, var(--purple) 100%);
    padding: 1.5rem 2rem;
    border-radius: 0 0 30px 30px;
    box-shadow: 0 8px 32px rgba(255, 159, 243, 0.2);
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: nowrap;
    height: 80px;
    font-family: "Mochiy Pop P One", "Comic Sans MS", cursive;
  }
  
  .header-content > span:first-child {
    font-size: 2rem;
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
  
  .header-content > span:nth-child(2) {
    background: rgba(255, 255, 255, 0.15);
    padding: 0.4rem 1rem;
    border-radius: 20px;
    border: 2px solid var(--mint);
    backdrop-filter: blur(5px);
    font-size: 0.9em;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    transition: all 0.3s ease;
  }
  
  .header-content > span:nth-child(2):hover {
    transform: scale(1.05) rotate(2deg);
    background: rgba(255, 255, 255, 0.25);
  }
  
  .video-card {
    border: 1px solid #ccc;
    margin: 1rem;
    padding: 1rem;
    max-width: 400px;
    display: flex;
    flex-direction: column;
    min-height: 400px;
  }
  
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
  
  /* 基本グリッドレイアウト */
  .cache-container {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 2rem;
    padding: 2rem;
    position: relative;
    margin-top: 4px;
    background: linear-gradient(180deg, #fff6e3, #bfecff);
  }
  
  /* 動画カードスタイル */
  .video-card {
    background: var(--dark-surface);
    border-radius: 15px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
    transition: transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
    overflow: hidden;
  }
  
  .video-card:hover {
    transform: translateY(-5px);
  }
  
  /* メタデータスタイル */
  .metadata {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
    align-items: center;
  }
  
  .metadata > span {
    background: rgba(255, 159, 243, 0.1);
    padding: 0.4rem 0.8rem;
    border-radius: 20px;
    border: 1px solid var(--pink);
    color: var(--text-primary);
    font-size: 0.8em;
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
  }
  
  .nav-link:hover {
    background: rgba(255, 255, 255, 0.1);
    transform: scale(1.05);
    box-shadow: 0 4px 15px rgba(255, 159, 243, 0.3);
  }
  
  .nav-link::after {
    content: "✨";
    position: absolute;
    right: -10px;
    top: -5px;
    opacity: 0;
    transition: opacity 0.3s ease;
  }
  
  .nav-link:hover::after {
    opacity: 1;
  }
  
  /* 動画タイトル */
  .video-title {
    font-family: "Comic Sans MS", cursive;
    color: var(--mint);
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
    font-size: 1.4rem;
    margin: 0;
    background: linear-gradient(45deg, var(--pink), var(--mint));
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
    transition: all 0.3s ease;
    color: var(--text-primary);
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
  
  .button::before {
    content: "✨";
    font-size: 1.2em;
    position: static;
    transition: transform 0.3s ease;
  }
  
  .button:hover::before {
    transform: rotate(360deg);
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
  
  #save-button::before,
  .save-btn::before {
    content: "💾";
  }
  
  /* 検索ボタン */
  #searchBtn,
  #clearSearch {
    border-radius: 15px;
    background: linear-gradient(145deg, #b19cd9, #8f7bb3);
    padding: 8px 15px;
  }
  
  #searchBtn::before {
    content: "🔍";
  }
  
  /* 動画カード内アクションボタン */
  .video-card .card-actions {
    display: flex;
    gap: 8px;
    padding: 12px;
  }
  
  .video-card button[onclick] {
    flex: 1;
    min-width: 80px;
    font-size: 0.9em;
    padding: 8px 12px;
    border: 1px solid rgba(255, 255, 255, 0.2);
  }
  
  /* 検索関連 */
  #searchInput {
    border: 2px solid var(--mint);
    border-radius: 25px;
    padding: 8px 20px;
    color: var(--dark);
  }
  
  #searchBtn,
  #clearSearch {
    background: linear-gradient(145deg, var(--purple), #8f7bb3);
    margin-left: 8px;
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
  button svg {
    fill: currentColor;
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
  @media (max-width: 768px) {
    .header-content {
      flex-direction: column;
      align-items: flex-start;
    }
  
    .card-actions {
      width: 100%;
      justify-content: center;
    }
  
    .video-card {
      min-height: 350px;
    }
  
    .thumbnail-container {
      flex-basis: 150px;
    }
  }
  
  .thumbnail-container {
    flex: 0 0 200px;
    position: relative;
    overflow: hidden;
  }
  
  .thumbnail-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
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
  `;
