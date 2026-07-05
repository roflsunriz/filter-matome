import { createMaterialIcon } from "@/common/material-icons";
import type { WatchHistoryEntry } from "@/types/watch-history-types";

export interface TagStat {
  tag: string;
  count: number;
  size: string;
}

export function calculateTagStats(entries: WatchHistoryEntry[]): TagStat[] {
  const tagCounts = new Map<string, number>();

  for (const entry of entries) {
    if (!entry.tags || !Array.isArray(entry.tags)) continue;
    for (const tag of entry.tags) {
      if (!tag || !tag.trim()) continue;
      const normalizedTag = tag.trim();
      tagCounts.set(normalizedTag, (tagCounts.get(normalizedTag) || 0) + 1);
    }
  }

  const sortedTags = Array.from(tagCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 50);

  if (sortedTags.length === 0) {
    return [];
  }

  const maxCount = Math.max(...sortedTags.map(([, count]) => count));
  const minCount = Math.min(...sortedTags.map(([, count]) => count));

  return sortedTags.map(([tag, count]) => {
    let size = "md";
    if (maxCount > minCount) {
      const ratio = (count - minCount) / (maxCount - minCount);
      if (ratio >= 0.8) size = "xl";
      else if (ratio >= 0.6) size = "lg";
      else if (ratio >= 0.4) size = "md";
      else if (ratio >= 0.2) size = "sm";
      else size = "xs";
    }
    return { tag, count, size };
  });
}

export function renderTagCloud(
  container: HTMLElement,
  tagStats: TagStat[],
  onSelectTag: (tag: string) => void,
): void {
  if (tagStats.length === 0) {
    const empty = document.createElement("div");
    empty.className = "tag-cloud-empty";
    const icon = document.createElement("span");
    icon.innerHTML = createMaterialIcon("label", {
      color: "dark",
      size: "large",
    });
    const label = document.createElement("span");
    label.textContent = "タグがありません";
    empty.append(icon, label);
    container.replaceChildren(empty);
    return;
  }

  const fragment = document.createDocumentFragment();
  for (const { tag, count, size } of tagStats) {
    const item = document.createElement("span");
    item.className = `tag-cloud-item size-${size}`;
    item.dataset.tag = tag;
    item.dataset.count = count.toString();
    item.title = `${tag}: ${count}回`;
    item.textContent = tag;
    item.addEventListener("click", () => {
      onSelectTag(tag);
    });
    fragment.appendChild(item);
  }
  container.replaceChildren(fragment);
}
