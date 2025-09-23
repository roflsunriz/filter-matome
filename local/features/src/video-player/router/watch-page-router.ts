
import type { CacheInfoResponse } from '@/types/video-types.js';
import { URLS } from '../config/constants.js';

type CacheInfoEntry = {
  preferred?: unknown;
  caches?: unknown;
  completes?: unknown;
  [key: string]: unknown;
};

type PlayerPreference = 'standalone' | 'official' | 'ask';

interface PlayerChoiceSettings {
  preference: PlayerPreference;
  rememberChoice: boolean;
}

const WATCH_HOST_PATTERN = /\.nicovideo\.jp$/;
const CACHE_INFO_ENDPOINT = 'https://www.nicovideo.jp/cache/info/v2?';
const PLAYER_CHOICE_KEY = 'nicocache-player-choice';

const hasCompletedCache = (entry: CacheInfoEntry, cacheId: string, completesSet: Set<string>): boolean => {
  if (!cacheId) {
    return false;
  }

  if (completesSet.has(cacheId)) {
    return true;
  }

  const cachesValue = entry.caches;
  if (cachesValue && typeof cachesValue === 'object' && !Array.isArray(cachesValue)) {
    const cacheRecord = cachesValue as Record<string, unknown>;
    const cache = cacheRecord[cacheId];
    if (cache && typeof cache === 'object') {
      const completeValue = (cache as { complete?: unknown }).complete;
      if (completeValue === true) {
        return true;
      }
    }
  }

  return false;
};

const existsCompletedCache = (entry: CacheInfoEntry): boolean => {
  const completesValue = entry.completes;
  const completes = Array.isArray(completesValue)
    ? completesValue.filter((value): value is string => typeof value === 'string')
    : [];
  const completesSet = new Set(completes);

  const preferredValue = entry.preferred;
  const preferred = typeof preferredValue === 'string' ? preferredValue : '';
  if (preferred && hasCompletedCache(entry, preferred, completesSet)) {
    return true;
  }

  if (completes.length > 0) {
    for (const cacheId of completes) {
      if (hasCompletedCache(entry, cacheId, completesSet)) {
        return true;
      }
    }
  }

  const cachesValue = entry.caches;
  if (cachesValue && typeof cachesValue === 'object' && !Array.isArray(cachesValue)) {
    const cacheRecord = cachesValue as Record<string, unknown>;
    return Object.keys(cacheRecord).some(cacheId => hasCompletedCache(entry, cacheId, completesSet));
  }

  return false;
};

/**
 * CustomCacheReturnerからキャッシュ情報を取得してキャッシュ存在を確認
 * @param cacheId キャッシュID (so30413239 形式)
 * @returns キャッシュが存在する場合はtrue
 */
const hasCustomCacheForId = async (cacheId: string): Promise<boolean> => {
  try {
    const response = await fetch(`${URLS.BASE}/cache/find_cache?${cacheId}`);

    if (!response.ok) {
      window.logger.warn(`Custom cache search failed for ${cacheId}: ${response.status}`);
      return false;
    }

    const data: unknown = await response.json();
    const availablePaths = (data && typeof data === 'object' && 'paths' in (data as Record<string, unknown>)
      ? (data as { paths?: unknown }).paths
      : []) as unknown[];

    // パスが存在すればキャッシュありとみなす
    return Array.isArray(availablePaths) && availablePaths.length > 0;
  } catch (error) {
    window.logger.warn(`Custom cache search error for ${cacheId}:`, error);
    return false;
  }
};

const hasCacheForVideo = async (videoId: string): Promise<boolean> => {
  try {
    const response = await fetch(`${CACHE_INFO_ENDPOINT}${encodeURIComponent(videoId)}`);
    if (!response || !response.ok) {
      window.logger.info('キャッシュ情報取得に失敗したためローカルプレイヤーへの遷移をスキップします', {
        videoId,
        status: response ? response.status : 'no-response'
      });
      return false;
    }

    const jsonUnknown: unknown = await response.json();
    const data = jsonUnknown as CacheInfoResponse | null;
    if (!data || !(videoId in data)) {
      return false;
    }

    const entryUnknown = data[videoId] as unknown;
    if (!entryUnknown || typeof entryUnknown !== 'object') {
      return false;
    }

    const entry = entryUnknown as CacheInfoEntry;

    // 既存のロジックでキャッシュ存在を確認
    if (existsCompletedCache(entry)) {
      return true;
    }

    // CustomCacheReturnerから情報を取得して確認
    // preferred キャッシュIDを使用
    const preferredValue = entry.preferred;
    const preferred = typeof preferredValue === 'string' ? preferredValue : '';
    if (preferred && await hasCustomCacheForId(preferred)) {
      return true;
    }

    // caches オブジェクトからキャッシュIDを取得
    const cachesValue = entry.caches;
    if (cachesValue && typeof cachesValue === 'object' && !Array.isArray(cachesValue)) {
      const cacheRecord = cachesValue as Record<string, unknown>;
      for (const cacheId of Object.keys(cacheRecord)) {
        if (await hasCustomCacheForId(cacheId)) {
          return true;
        }
      }
    }

    return false;
  } catch (error) {
    window.logger.warn('キャッシュ情報取得中にエラーが発生したためローカルプレイヤーへの遷移をスキップします', error);
    return false;
  }
};

const getPlayerChoiceSettings = (): PlayerChoiceSettings => {
  try {
    const stored = localStorage.getItem(PLAYER_CHOICE_KEY);
    if (stored) {
      const parsed: unknown = JSON.parse(stored);
      if (parsed && typeof parsed === 'object') {
        const settings = parsed as Partial<PlayerChoiceSettings>;
        return {
          preference: settings.preference === 'standalone' || settings.preference === 'official' || settings.preference === 'ask' 
            ? settings.preference 
            : 'ask',
          rememberChoice: typeof settings.rememberChoice === 'boolean' ? settings.rememberChoice : false
        };
      }
    }
  } catch (error) {
    window.logger.warn('プレイヤー選択設定の読み込みに失敗しました', error);
  }
  
  return {
    preference: 'ask',
    rememberChoice: false
  };
};

const savePlayerChoiceSettings = (settings: PlayerChoiceSettings): void => {
  try {
    localStorage.setItem(PLAYER_CHOICE_KEY, JSON.stringify(settings));
  } catch (error) {
    window.logger.warn('プレイヤー選択設定の保存に失敗しました', error);
  }
};

const isWatchPage = (): boolean => {
  return WATCH_HOST_PATTERN.test(window.location.hostname) && window.location.pathname.startsWith('/watch/');
};

export interface StandaloneUrlOptions {
  mode?: 'normal' | 'deleted';
  title?: string;
}

export const buildStandaloneUrl = (videoId: string, options: StandaloneUrlOptions = {}): string => {
  const params = new URLSearchParams();
  params.set('videoId', videoId);
  if (options.mode) {
    params.set('mode', options.mode);
  }
  if (options.title) {
    params.set('title', options.title);
  }
  return '/local/features/dist/src/video-player/standalone/index.html?' + params.toString();
};

const showPlayerChoice = (_videoId: string): Promise<'standalone' | 'official'> => {
  return new Promise((resolve) => {
    let isResolved = false;
    let rememberChoice = false;
    
    const resolveChoice = (choice: 'standalone' | 'official'): void => {
      if (isResolved) return;
      isResolved = true;
      
      if (rememberChoice) {
        savePlayerChoiceSettings({
          preference: choice,
          rememberChoice: true
        });
      }
      
      resolve(choice);
    };
    
    const messageHtml = `
      <div style="margin-bottom: 12px;">
        <strong>プレイヤーを選択してください</strong>
      </div>
      <div style="margin-bottom: 8px;">
        <button id="btn-standalone-player" style="
          background: #0066cc; 
          color: white; 
          border: none; 
          padding: 8px 16px; 
          margin-right: 8px; 
          border-radius: 4px; 
          cursor: pointer;
          font-size: 13px;
        ">ローカルプレイヤーで再生</button>
        <button id="btn-official-player" style="
          background: #666; 
          color: white; 
          border: none; 
          padding: 8px 16px; 
          border-radius: 4px; 
          cursor: pointer;
          font-size: 13px;
        ">公式プレイヤーで継続</button>
      </div>
      <div>
        <label style="font-size: 12px; color: #ccc; cursor: pointer;">
          <input type="checkbox" id="remember-choice" style="margin-right: 4px;"> 
          今後自動で選択する
        </label>
      </div>
    `;
    
    const toastElement = window.toastr.info(messageHtml, 'キャッシュが利用可能です', {
      timeOut: 0, // 自動で閉じない
      closeButton: false,
      tapToDismiss: false,
      escapeHtml: false,
      positionClass: 'toast-top-center'
    });
    
    if (!toastElement) {
      window.logger.warn('トースト通知の作成に失敗しました。デフォルトで公式プレイヤーを使用します。');
      resolve('official');
      return;
    }
    
    // ボタンのイベントリスナーを設定
    const standaloneBtn = toastElement.querySelector('#btn-standalone-player');
    const officialBtn = toastElement.querySelector('#btn-official-player');
    const rememberCheckbox = toastElement.querySelector('#remember-choice') as HTMLInputElement;
    
    if (standaloneBtn) {
      standaloneBtn.addEventListener('click', () => {
        rememberChoice = rememberCheckbox?.checked ?? false;
        window.toastr.removeToast(toastElement);
        resolveChoice('standalone');
      });
    }
    
    if (officialBtn) {
      officialBtn.addEventListener('click', () => {
        rememberChoice = rememberCheckbox?.checked ?? false;
        window.toastr.removeToast(toastElement);
        resolveChoice('official');
      });
    }
    
    // 10秒後にタイムアウトして公式プレイヤーを選択
    setTimeout(() => {
      if (!isResolved) {
        window.toastr.removeToast(toastElement);
        window.logger.info('プレイヤー選択がタイムアウトしました。公式プレイヤーを使用します。');
        resolveChoice('official');
      }
    }, 10000);
  });
};

export const initWatchPageRouter = async (): Promise<void> => {
  if (!isWatchPage()) {
    return;
  }

  try {
    const result = await window.commonHelper.fetchWatchPage();
    if (!result) {
      return;
    }

    const apiData = result.apiData as Record<string, unknown>;
    const video = apiData.video as Record<string, unknown> | undefined;
    if (!video) {
      return;
    }

    const videoId = typeof video.id === 'string' ? video.id : null;
    const watchable = typeof video.watchableUserTypeForPayment === 'string'
      ? video.watchableUserTypeForPayment
      : (video as { watchableUserType?: string }).watchableUserType;

    if (!videoId || !watchable || watchable === 'all') {
      return;
    }

    const cacheExists = await hasCacheForVideo(videoId);
    if (!cacheExists) {
      window.logger.info('有料動画ですがキャッシュが存在しないためローカルプレイヤーへの遷移をスキップします', videoId);
      return;
    }

    // 既にスタンドアロンプレイヤーにいる場合は何もしない
    if (window.location.pathname === '/local/features/dist/src/video-player/standalone/index.html') {
      return;
    }

    // ユーザー設定を確認
    const settings = getPlayerChoiceSettings();
    
    let playerChoice: 'standalone' | 'official';
    
    if (settings.rememberChoice && settings.preference !== 'ask') {
      // 記憶された設定を使用
      playerChoice = settings.preference;
      window.logger.info(`記憶された設定により${playerChoice === 'standalone' ? 'ローカル' : '公式'}プレイヤーを使用します`, videoId);
    } else {
      // ユーザー選択UIを表示
      window.logger.info('有料動画かつキャッシュが存在するためプレイヤー選択を表示します', videoId);
      playerChoice = await showPlayerChoice(videoId);
    }
    
    if (playerChoice === 'standalone') {
      const targetUrl = buildStandaloneUrl(videoId);
      window.logger.info('ローカルプレイヤーへ遷移します', videoId);
      window.location.href = targetUrl;
    } else {
      window.logger.info('公式プレイヤーで継続します', videoId);
      // 公式プレイヤーで継続（何もしない）
    }
  } catch (error) {
    window.logger.warn('プレイヤー選択処理に失敗したため公式プレイヤーで継続します', error);
  }
};
