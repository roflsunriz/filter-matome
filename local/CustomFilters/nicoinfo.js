"use strict";
const debugOutput = false;
const MAX_ITEMS = 300;

let lastHash = '';

window.addEventListener("load", () => {
  if (debugOutput) {
    console.log("load event: restyler()が実行されました");
  }
  restyler();
  showStartupToast();
});

window.addEventListener("hashchange", () => {
  handleHashChange();
  restyler();
});

function showStartupToast() {
  window.cc.Toast({
    mode: "info",
    middle: "",
    low: "",
    title: "nicoinfo.jsの動作を開始しました",
    timeout: 5000,
  });
}

function handleHashChange() {
  const currentHashValue = currentHash();
  if (debugOutput) {
    console.log(`hash changed from ${lastHash} to ${currentHashValue}`);
    console.log(`currenthash: ${currentHashValue}`);
    console.log(`hashchange event: restyler()が実行されました`);
  }
  lastHash = currentHashValue;
}

function restyler() {
  for (let i = 0; i < MAX_ITEMS; i++) {
    const dateElement = cc.c("l-main l-main-list2-date")[i];
    const titleElement = cc.c("l-main l-main-list2-title")[i];
    const itemElement = cc.c("l-main l-main-list2-item")[i];

    if (!dateElement) return;

    if (!titleElement.innerText.match(/.*?デイリー福引.*?/)) {
      dateElement.style.color = "LightSteelBlue";
      titleElement.style.color = "LightSteelBlue";
    } else {
      itemElement.style.outline = "solid 3px red";
    }
  }
}

const currentHash = () => {
  return location.hash.replace(/^#/, "");
};
