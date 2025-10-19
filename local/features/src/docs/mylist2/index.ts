import { applyMylist2DocsStyles } from '@/docs/mylist2/styles.js';
import type { HeaderConfig } from '@/types/common-types';
import { hydrateMaterialIconImages } from '@/common/material-icons.js';

// スタイルを適用
applyMylist2DocsStyles();

window.addEventListener('load', () => {
  hydrateMaterialIconImages();
  // 共通モジュールが読み込まれているかチェック
  if (typeof window.NicoCommon === 'undefined') {
    window.logger.error('NicoCommon is not loaded. Please ensure common module is loaded before mylist2.');
    return;
  }
  
  // 共通ヘッダーを初期化（グローバル関数を使用）
  window.NicoCommon.createHeader('headerContainer', {
    title: 'Mylist2 README',
    showSearch: true,
    showMoreLinks: true,
    enableFixedMode: false
  } as HeaderConfig);
});
