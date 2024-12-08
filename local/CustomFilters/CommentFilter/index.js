import { filter } from './src/CommentFilter.js';
import { ui } from './src/CommentFilterUI.js';
import { db } from './src/database.js';

// グローバルスコープに公開（デバッグ用）
window.CommentFilter = {
  filter,
  ui,
  db,
  // デバッグ用のユーティリティメソッド
  debug: {
    // データベースの全設定を取得
    async getAllSettings() {
      return await db.getAllSettings();
    },
    // 特定の設定を取得
    async getSetting(key) {
      return await db.getSetting(key);
    },
    // 設定を保存
    async setSetting(key, value) {
      return await db.setSetting(key, value);
    },
    // データベースをエクスポート
    async exportDB() {
      return await db.exportData();
    },
    // データベースをインポート
    async importDB(jsonData) {
      return await db.importData(jsonData);
    },
    // データベースをクリア
    async clearDB() {
      await db.clearStore('settings');
      await db.clearStore('modes');
      await db.clearStore('commands');
    },
    // モード関連のメソッド
    async getMode(key) {
      return await db.getMode(key);
    },
    async setMode(key, value) {
      return await db.setMode(key, value);
    },
    // コマンド関連のメソッド
    async getCommands(type) {
      return await db.getCommands(type);
    },
    async setCommands(type, commands) {
      return await db.setCommands(type, commands);
    }
  }
};

// 初期化
(async () => {
  try {
    // フィルターの初期化
    await filter.init();
    
    // UI設定パネルの初期化
    await ui.init();

    console.log('CommentFilter initialized successfully');
  } catch (error) {
    console.error('CommentFilter initialization failed:', error);
  }
})();