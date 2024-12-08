"use strict";

import { fetchAllElement, selectLink } from '../util/uiUtil.js';

export const handleOtherPage = () => {
  fetchAllElement();
  selectLink();
  const userPageBox = cc.i("userPageBox");
  userPageBox.style.top = "5vh";
  userPageBox.style.left = "77vw";
};