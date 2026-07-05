import type { DBVideo, VideoAvailabilityStatus } from "@/types/video-types";

export function createAvailabilityBadge(video: DBVideo): HTMLElement | null {
  const label = getAvailabilityLabel(video.availabilityStatus);
  if (!label) return null;

  const badge = document.createElement("span");
  badge.className = `cml2-availability-badge status-${video.availabilityStatus}`;
  badge.textContent = label;
  const checkedAt = video.availabilityCheckedAt
    ? new Date(video.availabilityCheckedAt).toLocaleString()
    : "未確認";
  const helpText = getAvailabilityBadgeHelpText(
    label,
    checkedAt,
    video.availabilityReason,
  );
  badge.title = helpText;
  badge.setAttribute("aria-label", helpText);
  return badge;
}

function getAvailabilityBadgeHelpText(
  label: string,
  checkedAt: string,
  reason?: string,
): string {
  return [
    `公開状態: ${label}`,
    `確認日時: ${checkedAt}`,
    reason ? `理由: ${reason}` : "",
    "キャッシュ済み動画がローカルにあり、かつ「動画リンク先」が「ローカルプレーヤー(video-player)」に設定されている場合のみ、video-playerにリダイレクトされてローカルで再生できます。",
  ]
    .filter(Boolean)
    .join("\n");
}

function getAvailabilityLabel(status?: VideoAvailabilityStatus): string | null {
  switch (status) {
    case "deleted":
      return "削除";
    case "private":
      return "非公開";
    case "unavailable":
      return "取得不可";
    case "unknown":
      return "状態不明";
    default:
      return null;
  }
}
