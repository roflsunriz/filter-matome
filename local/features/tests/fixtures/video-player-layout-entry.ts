import { createStandaloneLayout } from "@/video-player/standalone/layout";

declare global {
  interface Window {
    createStandaloneLayoutForTest: typeof createStandaloneLayout;
  }
}

window.createStandaloneLayoutForTest = createStandaloneLayout;
