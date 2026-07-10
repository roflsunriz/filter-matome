import { applyMylistManagerStyles } from "@/mylist2/ui/styles";
import { headerAdjustments } from "@/mylist2/header-adjustments";
import { Mylist2DB as db } from "@/mylist2/components/database";
import { Mylist2Manager as managerRefactored } from "@/mylist2/components/manager-refactored";
import { Mylist2ManagerUI as uiRefactored } from "@/mylist2/ui/ui-refactored";
import { hydrateMaterialIconImages } from "@/common/material-icons";

let started = false;

export function startMylist2(): void {
  if (started) {
    return;
  }
  started = true;

  headerAdjustments();
  applyMylistManagerStyles();

  window.Mylist2DB = db;
  window.Mylist2Manager = managerRefactored;
  window.Mylist2ManagerUI = uiRefactored;

  hydrateMaterialIconImages();
  // 共通モジュールが読み込まれているかチェック
  if (typeof window.NicoCommon === "undefined") {
    window.logger.error(
      "NicoCommon is not loaded. Please ensure common module is loaded before mylist2.",
    );
    return;
  }

  // 共通ヘッダーを初期化（グローバル関数を使用）
  window.NicoCommon.createHeader("headerContainer", {
    title: "mylist2",
    showSearch: true,
    showMoreLinks: true,
    enableFixedMode: false,
  });

  // メインUIを初期化（リンク化・タグ処理は ui-refactored 側で実施）
  new uiRefactored();
}
