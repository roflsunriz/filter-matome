import { ELEMENT_IDS } from '../../constants.js';
import { debugLog, debugError, debugWarn } from '../config.js';

export class CommentSearchController {
  constructor({ container }) {
    try {
      if (!container) {
        throw new Error('コンテナが指定されていません');
      }
      this.container = container;
      this.comments = [];
      this.enableRegexp = false;
      this.enableExtended = false;
      
      this.validateElements();
      this.initialize();
      
      // NicoCacheから初期データを取得
      if (NicoCache_nl.watch.apiData) {
        this.updateComments(NicoCache_nl.watch.apiData);
        debugLog('CommentSearchController: 初期コメントデータ読み込み完了');
      } else {
        debugWarn('CommentSearchController: 初期コメントデータが利用できません');
      }
      
      debugLog('CommentSearchController: 初期化完了');
    } catch (error) {
      debugError('CommentSearchController初期化エラー:', error);
      throw error;
    }
  }

  validateElements() {
    try {
      this.elements = {
        searchInput: document.getElementById('SearchInput'),
        resultBox: document.getElementById('CommentSearchResultBox'),
        regexToggle: document.getElementById('RegExToggle'),
        extended: document.getElementById('Extended'),
        startButton: document.getElementById('StartCommentSearch'),
        clearButton: document.getElementById('InputClear'),
        helpButton: document.getElementById('OpenRegExHelpPage')
      };

      // 必須要素の存在チェック
      const missingElements = Object.entries(this.elements)
        .filter(([_, element]) => !element)
        .map(([name]) => name);

      if (missingElements.length > 0) {
        throw new Error(`必要な要素が見つかりません: ${missingElements.join(', ')}`);
      }
    } catch (error) {
      debugError('要素の検証エラー:', error);
      throw error;
    }
  }

  initialize() {
    try {
      this.setupEventListeners();
      debugLog('CommentSearchController: イベントリスナー設定完了');
    } catch (error) {
      debugError('初期化エラー:', error);
      throw error;
    }
  }

  setupEventListeners() {
    // 検索開始ボタン
    this.elements.startButton.addEventListener('click', () => this.commentSearch());

    // 正規表現トグル
    this.elements.regexToggle.addEventListener('change', (e) => {
      this.enableRegexp = e.target.checked;
    });

    // 拡張検索トグル
    this.elements.extended.addEventListener('change', (e) => {
      this.enableExtended = e.target.checked;
    });

    // 検索ヘルプページを開く
    this.elements.helpButton.addEventListener('click', () => {
      window.open('https://w.atwiki.jp/nicocachenlwiki/pages/19.html', '_blank');
    });

    // Enterキーで検索
    this.elements.searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.commentSearch();
    });

    // 入力クリア処理
    this.elements.searchInput.addEventListener('input', (e) => {
      if (e.target.value !== '') {
        this.elements.clearButton.style.display = 'block';
      }
    });

    this.elements.clearButton.addEventListener('click', () => {
      this.clearSearch();
    });
  }

  // コメント検索の実行
  commentSearch() {
    try {
      const searchText = this.elements.searchInput.value.trim();
      debugLog('検索開始:', { 
        searchText, 
        enableRegexp: this.enableRegexp, 
        enableExtended: this.enableExtended 
      });
      
      this.searchComments(searchText);
    } catch (error) {
      debugError('検索実行エラー:', error);
      this.showError('検索処理中にエラーが発生しました');
    }
  }

  searchComments(searchText) {
    if (!searchText) {
      debugLog('検索テキストが空のため結果をクリア');
      this.showResults([]);
      return;
    }

    try {
      let searchResults;
      if (this.enableRegexp) {
        const flags = this.enableExtended ? 'i' : '';
        const regex = new RegExp(searchText, flags);
        searchResults = this.comments.filter(comment => 
          regex.test(comment.body)
        );
        debugLog('正規表現検索実行:', { 
          pattern: searchText, 
          flags, 
          matchCount: searchResults.length 
        });
      } else {
        const searchLower = this.enableExtended ? 
          searchText.toLowerCase() : searchText;
        searchResults = this.comments.filter(comment => {
          const body = this.enableExtended ? 
            comment.body.toLowerCase() : comment.body;
          return body.includes(searchLower);
        });
        debugLog('通常検索実行:', { 
          searchText: searchLower, 
          matchCount: searchResults.length 
        });
      }

      this.showResults(searchResults);
    } catch (error) {
      debugError('検索処理エラー:', error);
      this.showError('無効な検索パターンです');
    }
  }

  showResults(searchResults) {
    try {
      const resultBox = this.elements.resultBox;
      resultBox.innerHTML = '';

      if (searchResults.length === 0) {
        debugLog('検索結果なし');
        resultBox.innerHTML = '<div class="NoResults">コメントが見つかりませんでした</div>';
        return;
      }

      debugLog(`検索結果表示: ${searchResults.length}件`);
      const resultFragment = document.createDocumentFragment();
      searchResults.forEach(comment => {
        const resultElement = this.createResultElement(comment);
        resultFragment.appendChild(resultElement);
      });

      resultBox.appendChild(resultFragment);
    } catch (error) {
      debugError('結果表示エラー:', error);
      this.showError('結果の表示中にエラーが発生しました');
    }
  }

  createResultElement(comment) {
    try {
      const element = document.createElement('div');
      element.className = 'CommentSearchResult';
      element.innerHTML = `
        <div class="mainContent">
          <span class="Time">${this.formatVpos(comment.vpos)}</span>
          <span class="Content">${this.escapeHTML(comment.body)}</span>
        </div>
        <div class="metaContent">
          <span class="userId">ID: ${this.escapeHTML(comment.userId)}</span>
          <div class="copyButtons">
            <button class="CopyButton" title="コメントをコピー">
              <img src="/local/CustomFilters/PlaybackrateChanger/img/copy.png"/>
              コメント
            </button>
            <button class="CopyButton" title="ユーザーIDをコピー">
              <img src="/local/CustomFilters/PlaybackrateChanger/img/copy.png" />
              UserId
            </button>
          </div>
        </div>
      `;

      // コメント時間へのジャンプ
      element.addEventListener('click', (e) => {
        // コピーボタンクリック時はジャンプしない
        if (e.target.closest('.CopyButton')) return;
        
        const video = document.querySelector('video');
        if (video) {
          video.currentTime = comment.vpos / 100;
          debugLog('コメント位置へジャンプ:', { 
            time: this.formatVpos(comment.vpos),
            vpos: comment.vpos 
          });
        }
      });

      // コメントのコピー機能
      const commentCopyBtn = element.querySelector('.copyButtons button:first-child');
      commentCopyBtn.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(comment.body);
          this.showCopySuccess(commentCopyBtn, 'コメントをコピーしました');
        } catch (error) {
          debugError('コメントのコピーに失敗:', error);
          this.showCopyError(commentCopyBtn);
        }
      });

      // ユーザーIDのコピー機能
      const userIdCopyBtn = element.querySelector('.copyButtons button:last-child');
      userIdCopyBtn.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(comment.userId);
          this.showCopySuccess(userIdCopyBtn, 'ユーザーIDをコピーしました');
        } catch (error) {
          debugError('ユーザーIDのコピーに失敗:', error);
          this.showCopyError(userIdCopyBtn);
        }
      });

      return element;
    } catch (error) {
      debugError('結果要素作成エラー:', error);
      throw error;
    }
  }

  // コピー成功時のフィードバック
  showCopySuccess(button, message) {
    const tooltip = document.createElement('div');
    tooltip.className = 'CopyTooltip Success';
    tooltip.textContent = message;
    button.appendChild(tooltip);
    setTimeout(() => tooltip.remove(), 2000);
  }

  // コピー失敗時のフィードバック
  showCopyError(button) {
    const tooltip = document.createElement('div');
    tooltip.className = 'CopyTooltip Error';
    tooltip.textContent = 'コピーに失敗しました';
    button.appendChild(tooltip);
    setTimeout(() => tooltip.remove(), 2000);
  }

  showError(message) {
    const resultBox = this.elements.resultBox;
    resultBox.innerHTML = `<div class="Error">${this.escapeHTML(message)}</div>`;
  }

  async updateComments(apiData) {
    try {
      debugLog('コメントデータ取得開始');
      
      if (!apiData?.comment?.nvComment?.threadKey) {
        debugError('threadKeyが見つかりません:', apiData);
        return;
      }

      const threadKey = apiData.comment.nvComment.threadKey;
      const params = apiData.comment.nvComment.params;
      
      const payload = {
        params: params,
        threadKey: threadKey,
        additionals: {}
      };

      const response = await fetch('https://public.nvcomment.nicovideo.jp/v1/threads', {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=UTF-8',
          'x-client-os-type': 'others',
          'x-frontend-id': '6',
          'x-frontend-version': '0',
          'Origin': 'https://www.nicovideo.jp',
          'Referer': 'https://www.nicovideo.jp/'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`コメント取得エラー: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      debugLog('コメントデータ取得成功:', data);

      // 以降は既存のコメント処理ロジック
      if (!data || !data.data || !data.data.threads) {
        debugWarn('無効なAPIレスポンス形式です:', data);
        this.comments = [];
        return;
      }

      const threads = data.data.threads;
      const mainThread = this.getMainThread(threads);
      
      if (!mainThread) {
        debugWarn('メインスレッドが見つかりません:', threads);
        this.comments = [];
        return;
      }

      debugLog('選択されたメインスレッド:', {
        fork: mainThread.fork,
        commentCount: mainThread.comments?.length || 0
      });

      const processedComments = mainThread.comments.map(comment => ({
        id: comment.id,
        no: comment.no,
        vpos: Math.floor(comment.vposMs / 10),
        body: comment.body,
        commands: comment.commands,
        userId: comment.userId,
        isPremium: comment.isPremium,
        score: comment.score,
        postedAt: comment.postedAt,
        nicoruCount: comment.nicoruCount,
          nicoruId: comment.nicoruId,
        source: comment.source,
        isMyPost: comment.isMyPost
      }));

      this.comments = processedComments;
      debugLog(`コメントデータ更新完了: ${processedComments.length}件のコメントを処理`);

    } catch (error) {
      debugError('コメントデータ更新エラー:', error);
      this.comments = [];
    }
  }

  // 検索結果のクリア
  clearSearch() {
    try {
      debugLog('検索結果クリア開始');
      this.elements.searchInput.value = '';
      this.elements.resultBox.innerHTML = '';
      this.elements.resultBox.style.marginTop = '0';
      this.elements.clearButton.style.display = 'none';
      debugLog('検索結果クリア完了');
    } catch (error) {
      debugError('クリア処理エラー:', error);
    }
  }

  // ユーティリティメソッド
  formatVpos(vpos) {
    try {
      const seconds = Math.floor(vpos / 100);
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      return `${minutes.toString().padStart(2, '0')}分${remainingSeconds.toString().padStart(2, '0')}秒`;
    } catch (error) {
      debugError('時間フォーマットエラー:', error);
      return '00:00';
    }
  }

  escapeHTML(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // クリーンアップメソッド
  destroy() {
    try {
      debugLog('CommentSearchController: クリーンアップ開始');
      this.comments = [];
      this.elements = null;
      debugLog('CommentSearchController: クリーンアップ完了');
    } catch (error) {
      debugError('クリーンアップエラー:', error);
    }
  }

  getMainThread(threads) {
    const mainThreads = threads.filter(thread => thread.fork === "main");
    if (mainThreads.length === 0) return null;
    if (mainThreads.length === 1) return mainThreads[0];
    
    // コメント数が多い方を選択
    return mainThreads.reduce((a, b) => 
        (a.comments?.length || 0) > (b.comments?.length || 0) ? a : b
    );
  }
}