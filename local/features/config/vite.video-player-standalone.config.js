// スタンドアロン動画プレイヤー用Viteコンフィグ
import createConfigTemplate from './vite.html.template.js';

export default createConfigTemplate({
  entry: 'src/video-player/standalone/index.html',
  name: 'video-player-standalone',
  formats: ['es'],
  exclude: [],
});
