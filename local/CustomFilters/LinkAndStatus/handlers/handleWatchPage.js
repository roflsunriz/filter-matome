"use strict";

import { fetchAllElement, selectLink, updateUserPageBoxPosition } from '../util/uiUtil.js';
import '../util/debugUtil.js';
import { formatCacheInfo } from '../util/cacheUtil.js';
import { DragController } from '../util/DragEvents.js';

export const handleWatchPage = () => {
  if (cc.i("userPageBox")) cc.i("userPageBox").remove();
  fetchAllElement();
  selectLink();
  
  const userPageBox = cc.i("userPageBox");
  if (userPageBox) {
    new DragController(userPageBox);
  }
  
  if (/\/watch\/(?:s(?:m|o)\d+.*|\d+.*)/.test(window.location.pathname)) {
    const cacheInfoElement = cc.i("cacheinfo");
    if (cacheInfoElement) {
      setInterval(formatCacheInfo, 3000);
    }
  }

  NicoCache_nl.watch.addEventListener("initialized", updateUserPageBoxPosition);
  NicoCache_nl.watch.addEventListener("videoChanged", () => {
    if (cc.i("userPageBox")) cc.i("userPageBox").remove();
    fetchAllElement();
    selectLink();
    updateUserPageBoxPosition();
    
    const userPageBox = cc.i("userPageBox");
    if (userPageBox) {
      new DragController(userPageBox);
    }
  });

  // 縮小切り替えボタンのイベントリスナーを追加
  const miniButton = document.getElementById('up_mini');
  const mini2Button = document.getElementById('up_mini2');
  
  if (miniButton) {
    miniButton.addEventListener('click', window.cacheUtil.toggleMiniMode);
  }
  
  if (mini2Button) {
    mini2Button.addEventListener('click', window.cacheUtil.toggleMiniMode);
  }
};