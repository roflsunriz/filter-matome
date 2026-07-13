import { fetchNicochartVideoInfo } from "@/video-player/core/nicochart-client";
import { parseNicochartDocument } from "@/video-player/core/nicochart-parser";

declare global {
  interface Window {
    fetchNicochartVideoInfoForTest: typeof fetchNicochartVideoInfo;
    parseNicochartDocumentForTest: typeof parseNicochartDocument;
  }
}

window.fetchNicochartVideoInfoForTest = fetchNicochartVideoInfo;
window.parseNicochartDocumentForTest = parseNicochartDocument;
