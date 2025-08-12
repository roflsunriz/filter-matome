import { MediaInfoParser } from './parsers/media-info-parser.js';
import { UIUpdater } from './ui/ui-updater.js';
import { constants } from './utils/constants.js';
import { uiStyles } from './styles/styles.js';
import { Favicon } from './images/favicon.js';

const { DEBUG_NLMEDIAINFO } = constants;

const style = document.createElement('style');
style.textContent = uiStyles;
document.head.appendChild(style);

const favicon = document.createElement('link');
favicon.rel = 'Shortcut Icon';
favicon.href = 'data:image/svg+xml,' + encodeURIComponent(Favicon);
document.head.appendChild(favicon);

window.addEventListener("load", () => {
  // メインの処理
  initializeApp();
});

function initializeApp(): void { 
  UIUpdater.updateTitle(constants.nlMediaInfoVideoTitle, constants.nlMediaInfoVideoId);
  
  getMediaInfo(`${constants.nlMediaInfobaseurl}${constants.nlMediaInfoVideoId}`)
    .then((data) => {
      const parsedData = MediaInfoParser.parse(data as import('@nlmi/types/media-info').MediaItem[]);
      if(DEBUG_NLMEDIAINFO) console.log("パース後のデータ:", parsedData);
      return parsedData;  // 明示的にパースしたデータを返すのじゃ
    })
    .then(parsedData => {
      if (!parsedData || !parsedData.result) {
        throw new Error('パースされたデータが不正なのじゃ');
      }
      UIUpdater.updateAll(parsedData);
    })
    .catch(error => {
      console.error('メディア情報の取得に失敗したのじゃ:', error);
      const loadingElement = document.getElementById("loading");
      const errorElement = document.getElementById("error");
      
      if (loadingElement) loadingElement.style.display = "none";
      if (errorElement) {
        errorElement.style.display = "block";
        errorElement.textContent = `エラー: ${error.message}`;
      }
    });
}

/**
 * メディア情報を取得する非同期関数なのじゃ
 * @param url - メディア情報のURL
 * @returns メディア情報のJSONオブジェクト
 */
async function getMediaInfo(url: string): Promise<unknown> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTPエラー: ${response.status} ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('メディア情報の取得中にエラーが発生したのじゃ:', error);
    throw error;
  }
} 