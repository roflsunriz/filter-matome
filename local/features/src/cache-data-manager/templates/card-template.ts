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
    <div class="card-header" style="flex-shrink: 0; height: 32px; padding: 0.5rem 1rem; background: rgba(0,0,0,0.2); display: flex; align-items: center;">
      <span class="video-id"></span>
    </div>
    <div class="thumbnail-container" style="flex-shrink: 0; height: 180px; overflow: hidden; background: rgba(0,0,0,0.3);">
      <img class="thumbnail-image lazy-placeholder" data-src="" alt="サムネイル" style="width: 100%; height: 100%; object-fit: cover;">
    </div>
    <div class="video-info" style="flex: 1; display: flex; flex-direction: column; padding: 0.8rem 1rem; min-height: 0; overflow: hidden;">
      <h3 class="video-title" style="margin: 0 0 0.5rem 0; font-size: 1.1rem; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; text-overflow: ellipsis; height: 3.08em; flex-shrink: 0;"></h3>
      <div class="metadata" style="display: flex; flex-wrap: wrap; gap: 0.4rem; align-items: center; height: 36px; flex-shrink: 0; margin-top: auto;">
        <span class="quality-badge"></span>
        <span class="temp-file"></span>
      </div>
    </div>
    <div class="card-actions" style="flex-shrink: 0; height: 56px; display: flex; gap: 8px; padding: 0.8rem 1rem; background: rgba(0,0,0,0.15); align-items: center; justify-content: space-between;">
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
