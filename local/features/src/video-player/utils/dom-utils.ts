import { WATCH_CONFIG } from '../config/constants.js';

/**
 * 指定したセレクタの要素が現れるまで待機
 * @param selector 待機する要素のCSSセレクタ
 * @param timeout タイムアウト（ミリ秒）
 * @returns 見つかった要素
 */
export const waitForElement = (selector: string, timeout = 10000): Promise<Element> => {
  return new Promise((resolve, reject) => {
    // 要素がすでに存在するか確認
    const element = document.querySelector(selector);
    if (element) {
      resolve(element);
      return;
    }

    // タイムアウト処理
    const timeoutId = setTimeout(() => {
      observer.disconnect();
      reject(new Error(`要素が見つかりませんでした: ${selector}`));
    }, timeout);

    // DOM変更を監視
     
    const observer = new MutationObserver((_) => {
      const element = document.querySelector(selector);
      if (element) {
        clearTimeout(timeoutId);
        observer.disconnect();
        resolve(element);
      }
    });

    // 監視を開始
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  });
};

/**
 * プレイヤー要素が初期化されるまで待機
 * @param timeout タイムアウト（ミリ秒）
 * @returns 初期化されたプレイヤー要素
 */
export const waitForPlayer = (timeout = 5000): Promise<HTMLElement> => {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const maxAttempts = timeout / 100; // 100msごとにチェック

    const checkPlayer = () => {
      attempts++;
      const player = document.querySelector(WATCH_CONFIG.SELECTORS.PARENT_PLAYER) as HTMLElement;

      if (player) {
        const isInitialized = player.querySelector(WATCH_CONFIG.SELECTORS.VIDEO);
        if (isInitialized) {
          resolve(player);
          return;
        }
      }

      if (attempts >= maxAttempts) {
        reject(new Error("プレイヤーの待機がタイムアウトしました"));
        return;
      }

      setTimeout(checkPlayer, 100);
    };
    
    checkPlayer();
  });
};

/**
 * ビデオ要素に対してMutationObserverを使用して準備状態を監視
 * @param callback ビデオ要素の準備ができたときに呼び出すコールバック
 * @returns MutationObserverオブジェクト（後で切断するため）
 */
export const observeVideoReady = (callback: (video: HTMLVideoElement) => void): MutationObserver => {
   
  const observer = new MutationObserver((_) => {
    const video = document.querySelector('video') as HTMLVideoElement;
    if (video && video.readyState >= 2) {
      callback(video);
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['readyState']
  });

  return observer;
};

/**
 * 要素を安全に取得（存在しない場合はエラーを投げる）
 * @param selector CSSセレクタ
 * @param parent 親要素（デフォルトはdocument）
 * @returns 見つかった要素
 */
export const getElement = <T extends Element>(
  selector: string, 
  parent: Document | Element = document
): T => {
  const element = parent.querySelector(selector) as T;
  if (!element) {
    throw new Error(`要素が見つかりません: ${selector}`);
  }
  return element;
};

/**
 * スタイルを適用する
 * @param styles CSSスタイル文字列
 * @returns 作成されたスタイル要素
 */
export const applyStyles = (styles: string): HTMLStyleElement => {
  const styleElement = document.createElement('style');
  styleElement.textContent = styles;
  document.head.appendChild(styleElement);
  return styleElement;
}; 