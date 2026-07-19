import { CommentOverlayCommentSystem } from "@/video-player/core/comment-overlay-comment-system";
import { CommentList } from "@/video-player/ui/comment-list";
import { CommentPostForm } from "@/video-player/ui/comment-post-form";
import { CUSTOM_PLAYER_SHADOW_STYLES } from "@/video-player/ui/templates";

declare global {
  interface Window {
    createCommentPostFormForTest: () => void;
    ownCommentBorderDrawCount: number;
    simulateCommentReloadForTest: () => void;
    lastSubmittedCommentCommands: string[];
  }
}

window.createCommentPostFormForTest = (): void => {
  const host = document.createElement("div");
  host.style.width = "min(720px, calc(100vw - 24px))";
  host.style.margin = "24px auto";

  const style = document.createElement("style");
  style.textContent = CUSTOM_PLAYER_SHADOW_STYLES;

  const player = document.createElement("div");
  player.className = "custom-player";

  const videoContainer = document.createElement("div");
  videoContainer.className = "video-container";
  videoContainer.style.aspectRatio = "16 / 9";

  const video = document.createElement("video");
  video.id = "video-element";
  videoContainer.append(video);

  const controls = document.createElement("player-controls-shadow");
  controls.className = "controls-visible";
  controls.style.position = "absolute";
  controls.style.zIndex = "9999";
  controls.style.height = "64px";
  videoContainer.append(controls);

  const form = new CommentPostForm();
  form.className = "video-comment-post-form";
  const commentList = new CommentList();

  window.ownCommentBorderDrawCount = 0;
  window.lastSubmittedCommentCommands = [];
  const originalStrokeRect = CanvasRenderingContext2D.prototype.strokeRect;
  CanvasRenderingContext2D.prototype.strokeRect = function (...args): void {
    window.ownCommentBorderDrawCount++;
    originalStrokeRect.apply(this, args);
  };
  player.append(videoContainer, form);
  host.append(player, commentList);
  document.head.append(style);
  document.body.append(host);
  player.style.setProperty(
    "--fullscreen-comment-form-height",
    `${Math.ceil(form.getBoundingClientRect().height)}px`,
  );

  const overlay = new CommentOverlayCommentSystem();
  overlay.initialize(video, host);
  video.dispatchEvent(new Event("play"));
  const reloadedComment = {
    id: "fixture-comment",
    no: 1,
    body: "投稿テスト",
    commands: ["184"],
    vpos: 0,
    vposMs: 0,
    userId: "fixture-user",
    isMyPost: true,
  };
  window.simulateCommentReloadForTest = (): void => {
    window.ownCommentBorderDrawCount = 0;
    commentList.addComments([reloadedComment]);
    overlay.load([reloadedComment]);
  };

  form.setSubmitHandler(async ({ body, commands }) => {
    window.lastSubmittedCommentCommands = [...commands];
    const posted = {
      id: "fixture-comment",
      no: 1,
      body,
      commands,
      vposMs: 0,
    };
    const ownComment = {
      ...posted,
      vpos: 0,
      userId: "fixture-user",
      isMyPost: true,
      isLocalPost: true,
    };
    commentList.addComments([ownComment]);
    overlay.load([ownComment]);
    return posted;
  });
};

export {};
