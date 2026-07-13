import type { NicochartVideoInfo } from "@/video-player/core/nicochart-types";

const readText = (root: ParentNode, selector: string): string | undefined => {
  const value = root.querySelector(selector)?.textContent?.trim();
  return value || undefined;
};

const parseCount = (value: string | undefined): number => {
  if (!value) {
    return 0;
  }
  const parsed = Number(value.replace(/,/g, "").trim());
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
};

const parseOptionalCount = (value: string | undefined): number | undefined =>
  value === undefined ? undefined : parseCount(value);

export const parseNicochartDuration = (value: string | undefined): number => {
  if (!value) {
    return 0;
  }
  const match = /^(?:(\d+)時間)?(?:(\d+)分)?(?:(\d+)秒)?$/.exec(value.trim());
  if (!match || (!match[1] && !match[2] && !match[3])) {
    return 0;
  }
  return (
    Number(match[1] ?? 0) * 3600 +
    Number(match[2] ?? 0) * 60 +
    Number(match[3] ?? 0)
  );
};

export const parseNicochartRegisteredAt = (
  value: string | undefined,
): string => {
  if (!value) {
    return "";
  }
  const match =
    /^(\d{4})年(\d{1,2})月(\d{1,2})日\s+(\d{1,2}):(\d{2}):(\d{2})$/.exec(
      value.trim(),
    );
  if (!match) {
    return "";
  }
  const [, year, month, day, hour, minute, second] = match;
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}T${hour.padStart(2, "0")}:${minute}:${second}+09:00`;
};

const readDescriptionHtml = (document: Document): string | undefined => {
  const source = document.querySelector<HTMLElement>(
    "#video-info dd.description blockquote",
  );
  if (!source) {
    return undefined;
  }
  const clone = source.cloneNode(true) as HTMLElement;
  clone.querySelectorAll("span").forEach((span) => {
    if (span.textContent?.trim().toLowerCase() === "<br>") {
      span.replaceWith(document.createElement("br"));
    }
  });
  return clone.innerHTML.trim() || undefined;
};

export const parseNicochartDocument = (
  document: Document,
  expectedVideoId: string,
): NicochartVideoInfo | null => {
  const videoId = readText(document, "#video-id");
  const title = readText(document, "#video-info dd.title a");
  if (videoId !== expectedVideoId || !title) {
    return null;
  }

  const latestPoint = document.querySelector(
    "#daily-point-data tbody tr, #point-data tbody tr",
  );
  const thumbnailUrl =
    document
      .querySelector<HTMLImageElement>("#video-info .thumbnail-image img")
      ?.src.trim() ?? "";
  const ownerName = readText(
    document,
    "#video-info dd.contributor .name a, #video-info dd.contributor .name",
  );
  const ownerHref = document
    .querySelector<HTMLAnchorElement>(
      '#video-info dd.contributor a[href*="nicovideo.jp/user/"], #video-info dd.contributor a[href^="user/"]',
    )
    ?.getAttribute("href");
  const ownerId = ownerHref?.match(/(?:^|\/)user\/(\d+)/)?.[1];

  const tags = Array.from(
    document.querySelectorAll("#video-info dd.tags li"),
  ).flatMap((item) => {
    const name = readText(item, "a.word");
    return name
      ? [{ name, isLocked: item.querySelector(".lock") !== null }]
      : [];
  });

  const info: NicochartVideoInfo = {
    videoId,
    title,
    thumbnailUrl,
    registeredAt: parseNicochartRegisteredAt(
      readText(document, "#video-info dd.first-retrieve .first-retrieve"),
    ),
    duration: parseNicochartDuration(
      readText(document, "#video-info dd.length .length"),
    ),
    counts: {
      view: parseCount(readText(latestPoint ?? document, ".total-view")),
      comment: parseCount(readText(latestPoint ?? document, ".total-res")),
      mylist: parseCount(readText(latestPoint ?? document, ".total-mylist")),
      like: parseOptionalCount(
        readText(latestPoint ?? document, ".total-like"),
      ),
    },
    description: readDescriptionHtml(document),
    genre: readText(document, "#video-info dd.genre"),
    tags,
  };

  if (ownerName) {
    info.owner = { name: ownerName, id: ownerId };
  }
  return info;
};
