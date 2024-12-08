const DEBUG_OnCanPlay = true;

window.addEventListener("load", () => {
  const handleVideoEvents = (video) => {
    video.onplay = () => {
      if (DEBUG_OnCanPlay) console.log("onPlay");
    };
    video.oncanplay = () => {
      if (DEBUG_OnCanPlay) console.log("onCanPlay");
    };
    video.oncanplaythrough = () => {
      if (DEBUG_OnCanPlay) console.log("onCanPlayThrough");
    };
  };

  const observer = new MutationObserver((mutationsList) => {
    for (const mutation of mutationsList) {
      if (mutation.target.tagName === "video") {
        const video = cc.t("video")[0];
        handleVideoEvents(video);
      }
    }
  });

  const config = {
    subtree: true,
    attributes: true,
    attributeFilter: ["src"],
    attributeOldValue: true,
  };

  observer.observe(document.getElementsByTagName("body")[0], config);
});