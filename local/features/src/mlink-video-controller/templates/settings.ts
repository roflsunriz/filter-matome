import { createMaterialIcon } from "@/common/material-icons";

export const settingsTemplate = `
<div class="settings-container">
  <div class="settings-header">
    <h3>${createMaterialIcon("build", { style: "outlined", color: "white" })} モジュール設定</h3>
    <p>各機能のON/OFFを切り替えできます</p>
  </div>
  
  <div class="module-categories">
    <div class="category" data-category="privacy">
      <div class="category-header">
        <h4>${createMaterialIcon("lock", { style: "outlined", color: "white" })} プライバシー</h4>
        <span class="category-description">個人情報の表示制御</span>
      </div>
      <div class="module-list" id="privacy-modules">
        <!-- プライバシー関連モジュールがここに挿入されます -->
      </div>
    </div>
    
    <div class="category" data-category="ui_enhancement">
      <div class="category-header">
        <h4>${createMaterialIcon("palette", { style: "outlined", color: "white" })} UI強化</h4>
        <span class="category-description">ユーザーインターフェースの改善</span>
      </div>
      <div class="module-list" id="ui_enhancement-modules">
        <!-- UI強化モジュールがここに挿入されます -->
      </div>
    </div>
    
    <div class="category" data-category="functionality">
      <div class="category-header">
        <h4>${createMaterialIcon("settings", { style: "outlined", color: "white" })} 機能追加</h4>
        <span class="category-description">新しい機能の追加</span>
      </div>
      <div class="module-list" id="functionality-modules">
        <!-- 機能追加モジュールがここに挿入されます -->
      </div>
    </div>
    
    <div class="category" data-category="visual">
      <div class="category-header">
        <h4>${createMaterialIcon("color_lens", { style: "outlined", color: "white" })} ビジュアル</h4>
        <span class="category-description">見た目のカスタマイズ</span>
      </div>
      <div class="module-list" id="visual-modules">
        <!-- ビジュアルモジュールがここに挿入されます -->
      </div>
    </div>
  </div>
  
  <div class="settings-footer">
    <div class="settings-actions">
      <button class="action-btn primary" id="apply-immediately">${createMaterialIcon("flash_on", { style: "outlined", color: "green" })} 即時適用</button>
      <button class="action-btn" id="reload-and-apply">${createMaterialIcon("refresh", { style: "outlined", color: "white" })} 再読み込みして適用</button>
      <button class="action-btn" id="export-settings">${createMaterialIcon("upload", { style: "outlined", color: "white" })} 設定エクスポート</button>
      <button class="action-btn" id="import-settings">${createMaterialIcon("download", { style: "outlined", color: "white" })} 設定インポート</button>
      <button class="action-btn danger" id="reset-settings">${createMaterialIcon("refresh", { style: "filled", color: "red" })} 設定リセット</button>
    </div>
    <div class="settings-info">
      <small>設定は自動的に保存されます</small>
    </div>
  </div>
</div>

<!-- モジュール項目のテンプレート -->
<template id="module-item-template">
  <div class="module-item" data-module-id="">
    <span class="module-icon"></span>
    <h5 class="module-name"></h5>
    <p class="module-description"></p>
    <div class="module-meta">
      <span class="module-pages"></span>
      <span class="module-status"></span>
    </div>
    <div class="module-actions">
      <div class="module-settings-slot"></div>
      <div class="module-toggle-slot">
        <label class="toggle-switch">
          <input type="checkbox" class="module-toggle">
          <span class="slider"></span>
        </label>
      </div>
    </div>
  </div>
</template>
`;
