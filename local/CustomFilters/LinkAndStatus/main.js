"use strict";

import { handleWatchPage } from './handlers/handleWatchPage.js';
import { handleOtherPage } from './handlers/handleOtherPage.js';
import { DragController } from './util/DragEvents.js';

window.addEventListener("load", () => {
  if (/\/(?:watch)\/.*/.test(window.location.pathname)) {
    handleWatchPage();
  } else {
    handleOtherPage();
  }

  // userPageBoxのドラッグ機能を初期化
  const userPageBox = document.getElementById('userPageBox');
  if (userPageBox) {
    new DragController(userPageBox);
  }
});