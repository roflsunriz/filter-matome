import { CommentFilter_DEBUG_MODE } from './config.js';
import { db } from './database.js';
import { ui } from './CommentFilterUI.js';
import {
  VIDEO_ID_PATTERN,
  COMMENT_API_ENDPOINT,
  createDebugMessage,
  asyncErrorHandler,
  validateSetting
} from '../lib/util.js';

// クラス定義の前に追加
if (CommentFilter_DEBUG_MODE) console.log('CommentFilter.js loaded');

class CommentFilter {
  constructor() {
    if (CommentFilter_DEBUG_MODE) console.log('CommentFilter instance created');
    this.settings = {
      DEBUG: false,
      lotOfNicorare: true,
      filterMode: 'BlackList'
    };
    
    this.commands = {
      owner: [],
      easy: [],
      normal: []
    };
    
    this.excludeMovieIds = new Set();
    this.ngWords = new Set();
    this.ngRegex = new Set();
    this.okWords = new Set();
    this.okRegex = new Set();
    this.replaceRules = new Map();
    this.userIdFilters = new Set();
    this.excludeUserIds = new Set();
    this.superNgWords = new Set();
    this.superUserIdFilters = new Set();
    this.superNgRegex = new Set();
    
    // URL変更の監視用
    this.currentMovieId = location.pathname.match(VIDEO_ID_PATTERN)?.[0] || null;
    if (CommentFilter_DEBUG_MODE) {
        console.log('Initial movieId:', this.currentMovieId);
    }
    this.setupUrlChangeListener();

    // 特定の動画IDに対するNGユーザーとNGワードを保持するマップ
    this.specificNgUsers = new Map();
    this.specificNgWords = new Map();
  }

  setupUrlChangeListener() {
    // 初期状態のチェック
    this.handleUrlChange();

    // pushState と replaceState の監視
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;
    
    history.pushState = (...args) => {
        originalPushState.apply(history, args);
        this.handleUrlChange();
    };
    
    history.replaceState = (...args) => {
        originalReplaceState.apply(history, args);
        this.handleUrlChange();
    };
    
    // popstate イベントの監視（ブラウザの戻る/進むボタン用）
    window.addEventListener('popstate', () => {
        this.handleUrlChange();
    });

    // URLの変更を検知するための追加のイベントリスナー
    const observer = new MutationObserver(() => {
        this.handleUrlChange();
    });
    
    observer.observe(document.documentElement, {
        childList: true,
        subtree: true
    });
  }

  handleUrlChange() {
    const newMovieId = location.pathname.match(VIDEO_ID_PATTERN)?.[0];
    if (newMovieId !== this.currentMovieId) {
        this.currentMovieId = newMovieId;
        if (CommentFilter_DEBUG_MODE) {
            console.log('動画ID変更を検知:', this.currentMovieId);
            console.log('除外対象:', this.excludeMovieIds.has(this.currentMovieId));
        }
    }
  }

  async init() {
    return asyncErrorHandler(async () => {
      await db.init();
      await this.loadSettings();
      this.setupFetchProxy();
    }, 'フィルターの初期化中にエラーが発生しました');
  }

  async loadSettings() {
    return asyncErrorHandler(async () => {
      // モード設定の読み込み
      for (const key in this.settings) {
        const value = await db.getMode(key);
        this.settings[key] = validateSetting(value, this.settings[key], typeof this.settings[key]);
      }

      // コマンド設定の読み込みを修正
      for (const type in this.commands) {
        const commands = await db.getCommands(type.toLowerCase());
        if (CommentFilter_DEBUG_MODE) {
          console.log(`Loading commands for type ${type}:`, commands);
        }
        this.commands[type] = commands || '';
      }

      // 除外動画IDの読み込み
      const excludeIds = await db.getSetting('excludeMovieIds');
      const validatedIds = validateSetting(excludeIds, [], 'array');
      this.excludeMovieIds = new Set(
        Array.isArray(validatedIds) 
          ? validatedIds.filter(id => VIDEO_ID_PATTERN.test(id))
          : []
      );

      // NGユーザーIDの読み込みを修正
      const userIdFilters = await db.getSetting('userIdFilters');
      if (CommentFilter_DEBUG_MODE) console.log('読み込まれたuserIdFilters:', userIdFilters);
      
      this.userIdFilters = new Set(
        Array.isArray(userIdFilters) ? userIdFilters : []
      );
      
      if (CommentFilter_DEBUG_MODE) console.log('設定されたuserIdFilters:', [...this.userIdFilters]);

      // excludeUserIdsの初期化を追加
      const excludeUserIds = await db.getSetting('excludeUserIds');
      this.excludeUserIds = new Set(
        Array.isArray(excludeUserIds) ? excludeUserIds : []
      );
      if (CommentFilter_DEBUG_MODE)console.log('設定されたexcludeUserIds:', [...this.excludeUserIds]);

      // フィルターワードの読み込み
      const ngWords = await db.getSetting('NGWord');
      this.ngWords = new Set(Array.isArray(ngWords) ? ngWords : []);

      const ngRegex = await db.getSetting('NGRegex');
      this.ngRegex = new Set(Array.isArray(ngRegex) ? ngRegex : []);

      const okWords = await db.getSetting('OKWord');
      this.okWords = new Set(Array.isArray(okWords) ? okWords : []);

      const okRegex = await db.getSetting('OKRegex');
      this.okRegex = new Set(Array.isArray(okRegex) ? okRegex : []);

      // replaceRulesの読み込みを修正
      const replaceRules = await db.getSetting('replaceRules');
      if (CommentFilter_DEBUG_MODE) {
        console.log('DBから読み込まれたreplaceRules:', replaceRules);
      }

      // 配列形式のデータを適切に変換
      this.replaceRules = new Map(
        Array.isArray(replaceRules) 
          ? replaceRules.map(rule => {
              // 配列形式の場合
              if (Array.isArray(rule)) {
                const [pattern, replacement] = rule;
                try {
                  return [new RegExp(pattern), replacement];
                } catch (error) {
                  console.error(`Invalid regex pattern: ${pattern}`, error);
                  return null;
                }
              }
              // 文字列形式の場合
              else if (typeof rule === 'string') {
                const [pattern, replacement] = rule.split(' => ');
                if (pattern && replacement) {
                  try {
                    return [new RegExp(pattern), replacement];
                  } catch (error) {
                    console.error(`Invalid regex pattern: ${pattern}`, error);
                    return null;
                  }
                }
              }
              return null;
            }).filter(Boolean)
          : []
      );

      if (CommentFilter_DEBUG_MODE) {
        console.log('Mapに変換されたreplaceRules:', [...this.replaceRules]);
      }

      // デバッグログを条件付きで出力
      if (CommentFilter_DEBUG_MODE) {
        console.log('フィルター設定を読み込みました', {
          settings: this.settings,
          userIdFilters: [...this.userIdFilters],
          ngWords: [...this.ngWords],
          ngRegex: [...this.ngRegex],
          okWords: [...this.okWords],
          okRegex: [...this.okRegex]
        });
      }

      const superNgWords = await db.getSetting('superNgWords');
      this.superNgWords = new Set(Array.isArray(superNgWords) ? superNgWords : []);

      const superUserIdFilters = await db.getSetting('superUserIdFilters');
      this.superUserIdFilters = new Set(Array.isArray(superUserIdFilters) ? superUserIdFilters : []);

      // 特定の動画IDに対するNGユーザーとNGワードの読み込み
      const specificNgUsers = await db.getSetting('specificNgUsers');
      const specificNgWords = await db.getSetting('specificNgWords');

      this.specificNgUsers = this.parseSpecificSettings(specificNgUsers);
      this.specificNgWords = this.parseSpecificSettings(specificNgWords);

      if (CommentFilter_DEBUG_MODE) {
        console.log('特定の動画IDに対するNGユーザー:', this.specificNgUsers);
        console.log('特定の動画IDに対するNGワード:', this.specificNgWords);
      }

      // SuperNG正規表現の読み込みを追加
      const superNgRegex = await db.getSetting('superNgRegex');
      if (Array.isArray(superNgRegex)) {
        this.superNgRegex = new Set(
          superNgRegex.map(pattern => {
            try {
              return new RegExp(pattern);
            } catch (error) {
              console.error(`Invalid regex pattern: ${pattern}`, error);
              return null;
            }
          }).filter(Boolean)
        );
      }
    }, 'フィルターの初期化中にエラーが発生しました');
  }

  parseSpecificSettings(settings) {
    const map = new Map();
    if (Array.isArray(settings)) {
      settings.forEach(setting => {
        const [videoId, value] = setting.split(',');
        if (videoId && value) {
          if (!map.has(videoId)) {
            map.set(videoId, new Set());
          }
          map.get(videoId).add(value);
        }
      });
    }
    return map;
  }

  setupFetchProxy() {
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const response = await originalFetch(...args);
      
      if (args[0] === COMMENT_API_ENDPOINT) {
        return asyncErrorHandler(async () => {
          const json = await response.clone().json();
          const processedJson = await this.processComments(json);
          
          return new Response(JSON.stringify(processedJson), {
            status: response.status,
            statusText: response.statusText,
            headers: response.headers
          });
        }, 'コメント処理中にエラーが発生しました');
      }
      
      return response;
    };
  }

  async processComments(json) {
    // 現在の動画IDを取得
    const currentMovieId = this.currentMovieId || location.pathname.match(VIDEO_ID_PATTERN)?.[0];
    if (!currentMovieId || this.excludeMovieIds.has(currentMovieId)) {
        return json;
    }

    json.data.threads.forEach(thread => {
        if (thread.commentCount === 0) return;
        
        thread.comments = thread.comments.map(comment => {
            // 除外ユーザーチェックを最初に行う
            if (CommentFilter_DEBUG_MODE) {
                console.log('excludeUserIds:', this.excludeUserIds);
                console.log('comment.userId:', comment.userId);
                console.log('has:', this.excludeUserIds.has(comment.userId));
            }
            
            if (this.excludeUserIds.has(comment.userId)) {
                if (this.settings.DEBUG) {
                    comment.body = createDebugMessage('Excluded', {
                        UserId: comment.userId,
                        body: comment.body
                    });
                }
                return comment;
            }
            
            // 除外ユーザー以外の場合のみ、通常の処理を行う
            return this.processComment(comment, thread.fork);
        });
    });

    return json;
  }

  processComment(comment, threadType) {
    const commandStr = this.commands[threadType] || this.commands.normal || '';
    
    // コマンド設定(プレミアム会員専用コマンドも適用するため)を適用
    comment.isPremium = 'true';

    // ニコられ除外の条件に該当する場合は元のコマンドを保持
    comment.commands = (this.settings.lotOfNicorare && comment.nicoruCount >= 3)
      ? comment.commands  // 元のコマンドをそのまま使用
      : (typeof commandStr === 'string' 
          ? commandStr.split(',').filter(cmd => cmd.length > 0)
          : Array.isArray(commandStr)
            ? commandStr.filter(cmd => cmd.length > 0)
            : comment.commands);

    if (CommentFilter_DEBUG_MODE) {
      console.log('Applied commands:', {
        threadType,
        commandStr,
        result: comment.commands
      });
    }

    // フィルタリング処理を適用
    return this.applyFilters(comment);
  }

  applyFilters(comment) {
    const originalBody = comment.body;
    let filtered = false;
    let filterReason = null;

    // SuperNGの条件チェック
    const isSuperNgEnabled = this.settings.lotOfNicorare && 
        (this.settings.filterMode === 'BlackList' || this.settings.filterMode === 'Invisible');

    // SuperNGワードとSuperNGユーザーIDのチェック
    if (isSuperNgEnabled) {
        // SuperNGユーザーチェック
        if (this.superUserIdFilters.has(comment.userId)) {
            comment.body = '';
            filtered = true;
            filterReason = 'SuperNGユーザー';
            if (this.settings.DEBUG) {
                comment.body = createDebugMessage('Filtered', {
                    reason: filterReason,
                    original: originalBody
                });
            }
            return comment;
        }
        
        // SuperNG正規表現チェック（新規追加）
        if (Array.from(this.superNgRegex).some(regex => regex.test(comment.body))) {
            comment.body = '';
            filtered = true;
            filterReason = 'SuperNG正規表現';
            if (this.settings.DEBUG) {
                comment.body = createDebugMessage('Filtered', {
                    reason: filterReason,
                    original: originalBody
                });
            }
            return comment;
        }
        
        // 通常のSuperNGワードチェック
        if (Array.from(this.superNgWords).some(word => comment.body.includes(word))) {
            comment.body = '';
            filtered = true;
            filterReason = 'SuperNGワード';
            if (this.settings.DEBUG) {
                comment.body = createDebugMessage('Filtered', {
                    reason: filterReason,
                    original: originalBody
                });
            }
            return comment;
        }
    }

    // ニコられ数による除外チェック
    if (this.settings.lotOfNicorare && comment.nicoruCount >= 3) {
        if (this.settings.DEBUG) {
            comment.body = createDebugMessage('Nico-ed', {
                count: comment.nicoruCount,
                body: originalBody
            });
        }
        return comment;
    }


    // 特定の動画IDに対するNGユーザーとNGワードのチェック
    const currentMovieId = this.currentMovieId || location.pathname.match(VIDEO_ID_PATTERN)?.[0];
    if (currentMovieId) {
        const ngUsers = this.specificNgUsers.get(currentMovieId) || new Set();
        const ngWords = this.specificNgWords.get(currentMovieId) || new Set();

        if (ngUsers.has(comment.userId)) {
            comment.body = '';
            filtered = true;
            filterReason = '動画別NGユーザー';
            if (this.settings.DEBUG) {
                comment.body = createDebugMessage('Filtered', {
                    reason: filterReason,
                    original: originalBody
                });
            }
            return comment;
        }

        if (Array.from(ngWords).some(word => comment.body.includes(word))) {
            comment.body = '';
            filtered = true;
            filterReason = '動画別NGワード';
            if (this.settings.DEBUG) {
                comment.body = createDebugMessage('Filtered', {
                    reason: filterReason,
                    original: originalBody
                });
            }
            return comment;
        }
    }

    // ユーザーIDフィルター
    if (this.userIdFilters.has(comment.userId)) {
        comment.body = '';
        filtered = true;
        filterReason = 'NGユーザー';
    }

    // 置換ルール適用
    this.replaceRules.forEach((replacement, pattern) => {
        const regex = new RegExp(pattern, 'g');
        if (regex.test(comment.body)) {
            comment.body = comment.body.replace(regex, replacement);
            filtered = true;
            filterReason = filterReason || '置換ルール';
        }
    });

    // フィルターモードに応じた処理
    const modeResult = this.applyFilterMode(comment, filtered);
    filtered = modeResult.filtered;
    filterReason = modeResult.reason || filterReason;

    // DEBUGモード時のログ出力
    if (this.settings.DEBUG && filtered) {
        comment.body = createDebugMessage('Filtered', {
            reason: filterReason,
            original: originalBody,
            result: comment.body
        });
    }

    // フィルタリングされた場合にログを送信
    if (filtered) {
        const videoTitle = window.NicoCache_nl?.watch?.apiData?.video?.title || 'タイトル不明';
        this.sendFilterLog({
            title: videoTitle,
            userId: comment.userId,
            comment: originalBody,
            reason: filterReason
        });
    }

    return comment;
  }

  applyFilterMode(comment, filtered) {
    // 除外ユーザーチェックを最初に行う
    if (this.excludeUserIds.has(comment.userId)) {
        return { filtered: false };  // フィルタリングを行わない
    }

    const checkNGPatterns = () => {
        for (const word of this.ngWords) {
            if (comment.body.includes(word)) {
                return { matched: true, reason: 'NGワード' };
            }
        }
        for (const pattern of this.ngRegex) {
            if (pattern.test(comment.body)) {
                return { matched: true, reason: 'NGパターン' };
            }
        }
        return { matched: false };
    };

    switch (this.settings.filterMode) {
        case 'BlackList': {
            const result = checkNGPatterns();
            if (result.matched) {
                comment.body = '';
                return { filtered: true, reason: result.reason };
            }
            break;
        }

        case 'WhiteList': {
            const hasOkWord = Array.from(this.okWords).some(word => 
                comment.body.includes(word)
            );
            const hasOkRegex = Array.from(this.okRegex).some(pattern => 
                pattern.test(comment.body)
            );
            
            if (!hasOkWord && !hasOkRegex) {
                comment.body = '';
                return { filtered: true, reason: 'ホワイトリスト非該当' };
            }
            break;
        }

        case 'Invisible': {
            const result = checkNGPatterns();
            if (filtered || result.matched) {
                comment.vposMs = 5999000;
                comment.body = '';
                return { filtered: true, reason: result.reason || '非表示' };
            }
            break;
        }
    }

    return { filtered };
  }

  // フィルターログを送信する関数を追加
async sendFilterLog(filterInfo) {
  try {
    // 動画IDを追加
    const videoId = this.currentMovieId || location.pathname.match(VIDEO_ID_PATTERN)?.[0] || '不明';
    
    // フィルター詳細情報を取得
    const filterDetails = this.getFilterDetails(filterInfo.reason, filterInfo.comment);
    
    // ログデータを構築
    const logData = {
      ...filterInfo,
      videoId,
      filterDetails: this.truncateFilterDetails(filterDetails)
    };

    await fetch('/cache/filter_log', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(logData)
    });
  } catch (error) {
    if (this.settings.DEBUG) {
      console.error('フィルターログの送信に失敗:', error);
    }
  }
}

// フィルターの詳細情報を取得するメソッド
getFilterDetails(reason, comment) {
  switch (reason) {
    case 'NGワード':
      const matchedWord = Array.from(this.ngWords)
        .find(word => comment.includes(word));
      return { type: 'word', value: matchedWord };
      
    case 'NGパターン':
      const matchedPattern = Array.from(this.ngRegex)
        .find(pattern => pattern.test(comment));
      return { type: 'regex', value: matchedPattern?.source };
      
    case 'SuperNGワード':
      const matchedSuperWord = Array.from(this.superNgWords)
        .find(word => comment.includes(word));
      return { type: 'superword', value: matchedSuperWord };
      
    case 'SuperNG正規表現':
      const matchedSuperPattern = Array.from(this.superNgRegex)
        .find(pattern => pattern.test(comment));
      return { type: 'superregex', value: matchedSuperPattern?.source };
      
    case '動画別NGワード':
      const videoNgWords = this.specificNgWords.get(this.currentMovieId) || new Set();
      const matchedVideoWord = Array.from(videoNgWords)
        .find(word => comment.includes(word));
      return { type: 'videoword', value: matchedVideoWord };
      
    default:
      return { type: reason, value: null };
  }
}

// フィルター詳細を適切な長さに切り詰めるメソッド
truncateFilterDetails(details) {
  if (!details.value) return details;
  
  const MAX_LENGTH = 50; // 最大長さを設定
  let truncated = details.value;
  
  if (truncated.length > MAX_LENGTH) {
    truncated = truncated.substring(0, MAX_LENGTH) + '...';
  }
  
  return {
    type: details.type,
    value: truncated
  };
}

// フィルター理由を取得する関数を追加
getFilterReason(comment) {
  if (this.userIdFilters.has(comment.userId)) {
      return 'NGユーザー';
  }
  if (Array.from(this.ngWords).some(word => comment.body.includes(word))) {
      return 'NGワード';
  }
  if (Array.from(this.ngRegex).some(pattern => pattern.test(comment.body))) {
      return 'NGパターン';
  }
  return 'その他';
}
}

// フィルターとUIのエクスポート
export const filter = new CommentFilter();
export { ui };