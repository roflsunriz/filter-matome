import { createMaterialIcon, ICONS } from "@/common/material-icons.js";

/**
 * ビデオカードテンプレートを生成する関数
 * サムネイルは遅延読み込み対応（data-src を使用）
 */
export function createCardTemplate(): string {
  const playIcon = createMaterialIcon(ICONS.play, {
    color: "white",
    classes: "card-action-icon",
  });
  const saveVideoIcon = createMaterialIcon(ICONS.download, {
    color: "white",
    classes: "card-action-icon",
  });
  const saveAudioIcon = createMaterialIcon("audiotrack", {
    color: "white",
    classes: "card-action-icon",
  });
  const deleteIcon = createMaterialIcon(ICONS.delete, {
    color: "white",
    classes: "card-action-icon",
  });
  return `
    <div class="card-header">
      <span class="video-id"></span>
    </div>
    <div class="thumbnail-container">
      <img class="thumbnail-image lazy-placeholder" data-src="" alt="">
    </div>
    <div class="video-info">
      <h3 class="video-title"></h3>
      <div class="metadata">
        <span class="quality-badge"></span>
        <span class="temp-file"></span>
        <span class="availability-badge" hidden>利用不可</span>
      </div>
    </div>
    <div class="card-actions">
      <button class="play-btn" aria-label="再生">
        ${playIcon}<span>再生</span>
      </button>
      <details class="card-more">
        <summary aria-label="その他の操作">その他</summary>
        <div class="card-more-menu">
          <button class="save-video-btn">${saveVideoIcon}<span>動画を保存</span></button>
          <button class="save-audio-btn">${saveAudioIcon}<span>音声を保存</span></button>
          <button class="delete-btn">${deleteIcon}<span>削除</span></button>
        </div>
      </details>
    </div>
  `;
}
