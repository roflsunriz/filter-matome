import { debugLog, debugError, debugWarn } from '../config.js';
export class CustomMylist2AddButton {
  constructor({ container }) {
    try {
      if (!container) {
        throw new Error('コンテナが指定されていません');
      }

      this.container = container;
      this.manager = new CustomMylist2Manager();
      this.initialize();
    } catch (error) {
      debugError('CustomMylist2AddButton初期化エラー:', error);
      throw error;
    }
  }

  initialize() {
    const button = this.container.querySelector('#CustomMylist2Button');
    if (!button) {
      debugError('CustomMylist2Buttonが見つかりません');
      return;
    }

    button.addEventListener("click", this.handleClick.bind(this));
    
    if (!button.hasAttribute('title')) {
      button.setAttribute('title', 'カスタムマイリスト2に追加');
    }
  }

  async handleClick() {
    try {
      const apiData = NicoCache_nl.watch.apiData;
      if (!apiData || !apiData.video) {
        throw new Error('動画情報の取得に失敗しました');
      }

      const videoInfo = {
        id: apiData.video.id,
        title: apiData.video.title,
        viewCount: apiData.video.count.view || 0,
        commentCount: apiData.video.count.comment || 0,
        mylistCount: apiData.video.count.mylist || 0,
        thumbnailUrl: apiData.video.thumbnail.url,
        uploadedAt: new Date(apiData.video.registeredAt).getTime(),
        authorName: apiData.owner?.nickname || apiData.channel?.name || '不明'
      };

      const mylistId = await showMylistSelector();
      if (!mylistId) {
        throw new Error('マイリストが選択されていません');
      }

      const result = await this.manager.addVideo(mylistId, videoInfo);
      
      window.cc.Toast({
        mode: "success",
        middle: videoInfo.title,
        low: "カスタムマイリスト2",
        title: result,
        timeout: 5000,
      });
    } catch (error) {
      debugError('エラーの詳細:', error);
      window.cc.Toast({
        mode: "error",
        middle: error.message || 'エラーが発生しました',
        low: "カスタムマイリスト2",
        title: "追加失敗",
        timeout: 5000,
      });
    }
  }
}