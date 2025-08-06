import { defineConfig } from '@playwright/test';

export default defineConfig({
  use: {
    // ブラウザをヘッドレスモードで実行しない
    headless: false,
    // Chromium ブラウザを使用
    browserName: 'chromium',
    // 起動オプション
    launchOptions: {
      // プロキシ設定と証明書エラーの無視
      args: ['--proxy-server=localhost:8080'],
    },
  },
  projects: [
    {
      name: 'Chromium',
    },
  ],
});