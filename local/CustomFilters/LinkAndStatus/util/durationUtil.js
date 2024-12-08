"use strict";

/**
 * 再生時間を計算する関数
 * @param {string} Elm the string you want to calculate duration
 * @returns {string}
 */
export const durationCalc = (Elm) => {
  const minutes = Math.floor(Elm / 60);
  const seconds = Math.floor(Elm % 60);
  return minutes.toString().padStart(2, "0") + ":" + seconds.toString().padStart(2, "0");
};

/**
 * SI接頭辞計算
 * @param {number} num
 * @returns {object}
 */
export const SIprefixCalc = (num) => {
  num = num / 1024 / 1024;
  if (num >= 0 && num < 1024)
    return {
      val: Math.floor(num),
      unit: "MB",
    };
  if (num >= 1024 && num < 1048576)
    return {
      val: Number((num / 1024).toString().slice(0, 4)),
      unit: "GB",
    };
  if (num >= 1048576 && num < 1073741824)
    return {
      val: Number((num / 1024 / 1024).toString().slice(0, 4)),
      unit: "TB",
    };
  else return "OutOfRange";
};