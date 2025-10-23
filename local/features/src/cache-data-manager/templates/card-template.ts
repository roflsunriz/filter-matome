import { createMaterialIcon, ICONS } from "@/common/material-icons.js";

/**
 * ビデオカードテンプレートを生成する関数
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
      <img loading="lazy" class="thumbnail-image">
      </div>
      <div class="video-info">
      <h3 class="video-title"></h3>
      <div class="metadata">
      <span class="quality-badge"></span>
      <span class="temp-file"></span>
      </div>
    </div>
    <div class="card-actions">
      <button class="play-btn" title="再生" aria-label="再生">
        ${playIcon}
      </button>
      <button class="save-video-btn" title="動画保存" aria-label="動画保存">
        ${saveVideoIcon}
      </button>
      <button class="save-audio-btn" title="音声保存" aria-label="音声保存">
        ${saveAudioIcon}
      </button>
      <button class="delete-btn" title="削除" aria-label="削除">
        ${deleteIcon}
      </button>
    </div>
  `;
}
