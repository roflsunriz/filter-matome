import createConfigTemplate from './vite.ts-css.template.js';

export default createConfigTemplate({
  entry: 'src/cache-data-manager/main.ts',
  name: 'cacheDataManager',  // IIFE形式のため有効なJS識別子名
  formats: ['iife'],  // HTMLから通常スクリプトとして読み込むためIIFE形式
  exclude: [],
});


