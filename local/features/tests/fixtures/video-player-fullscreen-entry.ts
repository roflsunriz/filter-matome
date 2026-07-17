import "@/video-player/ui/player-controls";

declare global {
  interface Window {
    createFullscreenPlayerForTest: () => void;
  }
}

window.createFullscreenPlayerForTest = (): void => {
  const player = document.createElement("div");
  player.className = "custom-player";

  const video = document.createElement("video");
  video.id = "video-element";

  const controls = document.createElement("player-controls-shadow");
  player.append(video, controls);
  document.body.appendChild(player);
};

export {};
