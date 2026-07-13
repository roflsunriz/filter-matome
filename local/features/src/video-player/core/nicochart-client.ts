import type { ApiData } from "@/types/index";
import { parseNicochartDocument } from "@/video-player/core/nicochart-parser";
import { toApiDataFromNicochart } from "@/video-player/core/nicochart-types";

const VIDEO_ID_PATTERN = /^[a-z]{2}\d+$/i;

export const fetchNicochartVideoInfo = async (
  videoId: string,
): Promise<ApiData | null> => {
  if (!VIDEO_ID_PATTERN.test(videoId)) {
    return null;
  }

  const response = await fetch(
    `/cache/nicochart-info/${encodeURIComponent(videoId)}`,
    {
      method: "GET",
      credentials: "same-origin",
      headers: {
        Accept: "text/plain",
        "X-Filter-Matome-Nicochart": "1",
      },
    },
  );
  if (!response.ok) {
    return null;
  }

  const html = await response.text();
  const document = new DOMParser().parseFromString(html, "text/html");
  const info = parseNicochartDocument(document, videoId);
  return info ? toApiDataFromNicochart(info) : null;
};
