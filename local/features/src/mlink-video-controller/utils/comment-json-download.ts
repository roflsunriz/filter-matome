import { IntegratedNicoData } from "@/types/common-types";

interface CommentJsonExport {
  version: 1;
  exportedAt: string;
  videoId: string;
  video: {
    id: string;
    title?: string;
  };
  mainThread: IntegratedNicoData["mainThread"];
  comments: IntegratedNicoData["comments"];
}

const getStringProperty = (
  value: Record<string, unknown>,
  key: string,
): string | undefined => {
  const property = value[key];
  return typeof property === "string" ? property : undefined;
};

const createTimestampForFilename = (date: Date): string =>
  date
    .toISOString()
    .replace(/:/g, "")
    .replace(/\./g, "")
    .replace("T", "_")
    .replace("Z", "");

const downloadTextFile = (
  filename: string,
  content: string,
  mimeType: string,
): void => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  try {
    anchor.href = url;
    anchor.download = filename;
    anchor.style.display = "none";
    document.body.appendChild(anchor);
    anchor.click();
  } finally {
    anchor.remove();
    URL.revokeObjectURL(url);
  }
};

export const buildCommentJsonExport = (
  videoId: string,
  data: IntegratedNicoData,
  exportedAt: Date = new Date(),
): CommentJsonExport => {
  const video = data.apiData.video;
  const apiVideoId = getStringProperty(video, "id") ?? videoId;
  const title = getStringProperty(video, "title");

  return {
    version: 1,
    exportedAt: exportedAt.toISOString(),
    videoId,
    video: {
      id: apiVideoId,
      ...(title ? { title } : {}),
    },
    mainThread: data.mainThread,
    comments: data.comments,
  };
};

export const generateCommentJsonFilename = (
  videoId: string,
  exportedAt: Date = new Date(),
): string =>
  `comments-${videoId}-${createTimestampForFilename(exportedAt)}.json`;

export const downloadCommentsJson = async (videoId: string): Promise<void> => {
  const data = await window.commonHelper.fetchNicoDataWithComments(videoId);
  if (!data) {
    throw new Error("コメントデータを取得できませんでした");
  }

  const exportedAt = new Date();
  const exportData = buildCommentJsonExport(videoId, data, exportedAt);
  const filename = generateCommentJsonFilename(videoId, exportedAt);
  downloadTextFile(
    filename,
    JSON.stringify(exportData, null, 2),
    "application/json",
  );
};
