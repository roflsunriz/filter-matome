import type { WatchHistoryEntry } from "@/types/watch-history-types";
import {
  normalizeThumbnailUrl,
  THUMBNAIL_ERROR_HANDLER,
} from "@/common/thumbnail-fallback";

interface VideoDetailRendererOptions {
  formatDuration: (seconds: number) => string;
}

export function createVideoDetailHTML(
  entry: WatchHistoryEntry,
  options: VideoDetailRendererOptions,
): string {
  const watchedAtDate = new Date(entry.watchedAt);
  const firstWatchedAtDate = new Date(entry.firstWatchedAt);
  const thumbnailUrl = escapeAttribute(
    normalizeThumbnailUrl(entry.thumbnailUrl),
  );
  const title = escapeAttribute(entry.title);
  const videoId = escapeHtml(entry.videoId);
  let progressPercent = 0;
  if (entry.lengthSec > 0) {
    const rawPercent = (entry.lastPosition / entry.lengthSec) * 100;
    progressPercent =
      rawPercent >= 95 ? 100 : Math.min(Math.round(rawPercent), 100);
  }

  return `
      <div class="video-detail-grid">
        <div class="video-detail-thumbnail">
          <img src="${thumbnailUrl}" alt="${title}" onerror="${THUMBNAIL_ERROR_HANDLER}">
        </div>
        <div class="video-detail-info">
          <div class="info-row">
            <span class="info-label">動画ID:</span>
            <span class="info-value">${videoId}</span>
          </div>
          <div class="info-row">
            <span class="info-label">投稿者:</span>
            <span class="info-value">${escapeHtml(entry.ownerName)}</span>
          </div>
          <div class="info-row">
            <span class="info-label">再生時間:</span>
            <span class="info-value">${options.formatDuration(entry.lengthSec)}</span>
          </div>
          <div class="info-row">
            <span class="info-label">視聴進捗:</span>
            <span class="info-value">${progressPercent}% (${options.formatDuration(entry.lastPosition)})</span>
          </div>
          <div class="info-row">
            <span class="info-label">視聴回数:</span>
            <span class="info-value">${entry.watchCount}回</span>
          </div>
          <div class="info-row">
            <span class="info-label">初回視聴:</span>
            <span class="info-value">${firstWatchedAtDate.toLocaleString("ja-JP")}</span>
          </div>
          <div class="info-row">
            <span class="info-label">最終視聴:</span>
            <span class="info-value">${watchedAtDate.toLocaleString("ja-JP")}</span>
          </div>
          ${
            (entry.tags ?? []).length > 0
              ? `
            <div class="info-row">
              <span class="info-label">タグ:</span>
              <span class="info-value">${(entry.tags ?? []).map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join(" ")}</span>
            </div>
          `
              : ""
          }
          ${
            entry.memo
              ? `
            <div class="info-row">
              <span class="info-label">メモ:</span>
              <span class="info-value">${escapeHtml(entry.memo)}</span>
            </div>
          `
              : ""
          }
        </div>
      </div>
    `;
}

function escapeHtml(text: string): string {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function escapeAttribute(text: string): string {
  return escapeHtml(text).replace(/"/g, "&quot;");
}
