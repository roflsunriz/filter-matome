import { initWatchPageRouter } from './router/watch-page-router.js';

const isStandalonePage = (): boolean => {
  return window.location.pathname.startsWith('/local/features/dist/src/video-player/');
};

const bootstrap = (): void => {
  if (isStandalonePage()) {
    window.logger.info('スタンドアロンプレイヤーページではrouterは実行しません');
    return;
  }

  void initWatchPageRouter();
};

bootstrap();
