import { initWatchPageRouter, buildStandaloneUrl } from '@/video-player/router/watch-page-router';
import type { ApiData } from '@/types/index';

const DELETED_PLAYER_WINDOW_FEATURES = 'noopener,noreferrer';

const extractVideoId = (value: string): string => {
  const match = value.match(/[ns][mo]\d+/i);
  return match ? match[0] : value;
};

const ensureNicoCacheBase = (): void => {
  if (!window.NicoCache_nl) {
    window.NicoCache_nl = {
      watch: {
        getVideoID: () => '',
        apiData: {} as ApiData,
        addEventListener: () => {}
      },
      cacheUtil: {
        formatCacheInfo: async () => {
          await Promise.resolve();
          return false;
        }
      },
      // ccはwindow.commonHelperに移行し、MainVideoPlayerWidthHeightReturnerも不要になったため削除
      handleError: () => {}
    };
  }
};

const setupDeletedVideoPlayerInterface = (): void => {
  ensureNicoCacheBase();

  let popupWindow: Window | null = null;
  let lastVideoId: string | null = null;

  window.NicoCache_nl.deletedVideoPlayer = {
    play: (videoIdOrUrl: string, title?: string): void => {
      const videoId = extractVideoId(videoIdOrUrl);
      const url = buildStandaloneUrl(videoId, {
        mode: 'deleted',
        title
      });

      if (popupWindow && !popupWindow.closed) {
        if (lastVideoId === videoId) {
          popupWindow.focus();
          return;
        }

        popupWindow.location.href = url;
        popupWindow.focus();
        lastVideoId = videoId;
        return;
      }

      popupWindow = window.open(url, '_blank', DELETED_PLAYER_WINDOW_FEATURES) ?? null;
      if (!popupWindow) {
        window.logger.warn('削除動画プレーヤーのウィンドウを開けませんでした。ポップアップブロックを解除してください。');
        return;
      }

      lastVideoId = videoId;
    },
    hide: (): void => {
      if (popupWindow && !popupWindow.closed) {
        popupWindow.close();
      }
      popupWindow = null;
      lastVideoId = null;
    },
    help: (): void => {
      window.logger.info('window.NicoCache_nl.deletedVideoPlayer.play("sm9"); でスタンドアロンプレイヤーを開けます');
    }
  };
};

const isStandalonePage = (): boolean => {
  return window.location.pathname.startsWith('/local/features/dist/src/video-player/');
};

const bootstrap = (): void => {
  setupDeletedVideoPlayerInterface();

  if (isStandalonePage()) {
    window.logger.info('スタンドアロンプレイヤーページではrouterは実行しません');
    return;
  }

  void initWatchPageRouter();
};

bootstrap();
