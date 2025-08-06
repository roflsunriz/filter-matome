import { applyMylistManagerStyles } from './ui/styles.js';
import { headerAdjustments } from './header-adjustments.js';
import { Mylist2DB as db } from"./components/database.js";
import { Mylist2Manager as managerRefactored } from"./components/manager-refactored.js";
import { Mylist2ManagerUI as uiRefactored } from"./ui/ui-refactored.js";
// 型定義のみをインポート（ランタイムに影響なし）
import type { HeaderConfig } from "../types/common-types.js";

// スタイルを適用
headerAdjustments();
applyMylistManagerStyles();

window.Mylist2DB = db;
window.Mylist2Manager = managerRefactored;
window.Mylist2ManagerUI = uiRefactored;

window.addEventListener("load", () => {
    // 共通モジュールが読み込まれているかチェック
    if (typeof window.NicoCommon === 'undefined') {
      window.logger.error('NicoCommon is not loaded. Please ensure common module is loaded before mylist2.');
      return;
    }
    
    // 共通ヘッダーを初期化（グローバル関数を使用）
    window.NicoCommon.createHeader("headerContainer", {
      title: "Mylist2",
      showSearch: true,
      showMoreLinks: true,
      enableFixedMode: false
    } as HeaderConfig);
    
    // メインUI初期化（リファクタ版を使用）
    new uiRefactored();
  });