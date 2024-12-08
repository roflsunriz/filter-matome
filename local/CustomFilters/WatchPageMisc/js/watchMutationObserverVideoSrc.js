"use strict";
const mutationObserverDEBUG = true;

window.addEventListener("load", () => {
  const observer = new MutationObserver((mutationsList) => {
    for (const mutations of mutationsList) {
      if (mutations.target.tagName === "video") {
        if (mutationObserverDEBUG) console.log(mutations);
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

//Expected Output (through video changes), For example,
//
//↓First video load
//Same with Nicocache_nl.watch.addEventListener("initialized", () = >{});
//Array[MutationRecord]
//The src attribute was modified from "null" to "blob:https://www.nicovideo.jp/dd02910f-7a53-4d35-a141-2b4ec96bae84".
//
//↓When you click video link, then video tag loads second video
//Same with Nicocache_nl.watch.addEventListener("videoChanged", () = >{});
//Array[MutationRecord]
//The src attribute was modified from "null" to "blob:https://www.nicovideo.jp/ef6575f4-7ac7-4dcf-b1fe-09f2926437fd".
