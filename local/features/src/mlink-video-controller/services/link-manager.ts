import { ExtendedNicoCache_nl } from '@/types/global-types';
import { LinkData, ActionMap } from '@/types/mlink-video-controller-types';
import { ThumbnailsFilterGlobal } from '@/types/thumbnails-filter-types';
import { Mylist2Handler } from '../handlers/mylist2';
import { handleVideoOperation } from '../utils/video-util';
import { getIconPath } from '../../common/material-icons';

export class LinkManager {
  private static instance: LinkManager;
  private nicoCache: ExtendedNicoCache_nl;
  private commentFilterReady: boolean = false;

  private readonly LINK_GROUPS = {
    favorites: [] as LinkData[],
    custom: [
      {
        id: 'customMylist',
        title: 'Mylist2',
        icon: getIconPath('playlist_add', 'outlined'),
        action: 'customMylist'
      },
      {
        id: 'AddVideoToCustomMylist',
        title: 'Mylist2に追加',
        icon: getIconPath('playlist_add_circle', 'outlined'),
        action: 'AddVideoToCustomMylist'
      },
      {
        id: 'commentFilter2',
        title: 'CommentFilter2',
        icon: getIconPath('filter_list', 'outlined'),
        action: 'commentFilter2'
      },
      {
        id: 'watchVideoFilter',
        title: '動画非表示設定',
        icon: getIconPath('filter_list', 'outlined'),
        action: 'watchVideoFilter'
      }
    ] as LinkData[],
    services: [
      {
        id: 'nicochart',
        title: 'ニコチャート',
        icon: getIconPath('trending_up', 'outlined'),
        action: 'nicochart'
      },
      {
        id: 'nicolog',
        title: 'ニコログ',
        icon: getIconPath('search', 'outlined'),
        action: 'nicolog'
      },
      {
        id: 'nicoran',
        title: 'ニコラン',
        icon: getIconPath('trending_up', 'outlined'),
        action: 'nicoran'
      },
      {
        id: 'nicozon',
        title: 'nicozon',
        icon: getIconPath('storage', 'outlined'),
        action: 'nicozon'
      },
      {
        id: 'search',
        title: '超検索',
        icon: getIconPath('search', 'outlined'),
        action: 'search'
      },
      {
        id: 'commentviewer',
        title: 'コメントビューア',
        icon: getIconPath('comment', 'outlined'),
        action: 'commentviewer'
      },
      {
        id: 'nicodb',
        title: 'ニコ生クリ奨ランキング',
        icon: getIconPath('live_tv', 'outlined'),
        action: 'nicodb'
      },
      {
        id: 'ikioi',
        title: 'ニコ生勢いランキング',
        icon: getIconPath('live_tv', 'outlined'),
        action: 'ikioi'
      },
      {
        id: 'cytube',
        title: 'CTV☆',
        icon: getIconPath('star', 'outlined'),
        action: 'cytube'
      },
      {
        id: 'yajuyaju',
        title: 'ヤジュヤジュ動画',
        icon: getIconPath('movie', 'outlined'),
        action: 'yajuyaju'
      }
    ] as LinkData[],
    dataManagement: [
      {
        id: 'cachelist',
        title: 'キャッシュリスト',
        icon: getIconPath('storage', 'outlined'),
        action: 'cachelist'
      },
      {
        id: 'cacheinfo',
        title: 'キャッシュ情報',
        icon: getIconPath('info', 'outlined'),
        action: 'cacheinfo'
      },
      {
        id: 'mediainfo',
        title: 'nlMediaInfo',
        icon: getIconPath('info', 'outlined'),
        action: 'mediainfo'
      },
      {
        id: 'videoinfo',
        title: '概要、コメ情報',
        icon: getIconPath('description', 'outlined'),
        action: 'videoinfo'
      },
      {
        id: 'savemovie',
        title: '保存:動画',
        icon: getIconPath('download', 'outlined'),
        action: 'savemovie'
      },
      {
        id: 'saveaudio',
        title: '保存:音声',
        icon: getIconPath('audiotrack', 'outlined'),
        action: 'saveaudio'
      },
      {
        id: 'savecomment',
        title: '保存:コメント',
        icon: getIconPath('comment', 'outlined'),
        action: 'savecomment'
      },
      {
        id: 'cache_remove',
        title: '削除:キャッシュ',
        icon: getIconPath('clear', 'outlined'),
        action: 'cache_remove'
      }
    ] as LinkData[]
  };

  private constructor() {
    this.nicoCache = (window as Window & { NicoCache_nl: ExtendedNicoCache_nl }).NicoCache_nl;
    
    // CommentFilter2の初期化完了を監視
    window.addEventListener('CommentFilter2Ready', () => {
      this.commentFilterReady = true;
      
    });
    
    // 既に初期化済みかチェック
    if (window.CommentFilter2Instance) {
      this.commentFilterReady = true;
      
    }
  }

  public static getInstance(): LinkManager {
    if (!LinkManager.instance) {
      LinkManager.instance = new LinkManager();
    }
    return LinkManager.instance;
  }

  public getLinks(group: keyof typeof this.LINK_GROUPS): LinkData[] {
    return this.LINK_GROUPS[group];
  }

  private getThreadId(): string {
    if (this.nicoCache.watch && this.nicoCache.watch.apiData) {
      const defaultThread = this.nicoCache.watch.apiData.comment?.threads?.find(
        (v: { isDefaultPostTarget?: boolean | undefined; }) => v.isDefaultPostTarget === true
      );
      return defaultThread?.id || '';
    }
    return '';
  }

  public async handleAction(action: string): Promise<void> {
    const videoId = this.nicoCache.watch?.getVideoID() || '';
    const threadId = this.getThreadId();
    // const commentFilterUI = new CommentFilterUI();


    const actionMap: ActionMap = {
              customMylist: "https://www.nicovideo.jp/local/features/dist/src/mylist2/index.html",
      AddVideoToCustomMylist: async () => {
        const mylist2Handler = new Mylist2Handler();
        if (this.nicoCache.watch) {
          await mylist2Handler.handleAddVideo();
        } else {
          await mylist2Handler.handleAddKeyword();
        }
      },
      commentFilter2: async () => {
        try {
          // CommentFilter2のインスタンスを取得
          const commentFilter2Instance = window.CommentFilter2Instance;
          
          if (commentFilter2Instance && typeof commentFilter2Instance.showUI === 'function') {
            await commentFilter2Instance.showUI();
          } else {
            if (!this.commentFilterReady) {
              window.logger.warn('CommentFilter2はまだ初期化中です。しばらく待ってから再試行してください。');
            } else {
              window.logger.warn('CommentFilter2が利用できません。先にCommentFilter2を読み込んでください。');
            }
          }
        } catch (error) {
          window.logger.error('CommentFilter2の呼び出しに失敗しました:', error);
        }
      },
      cachelist: "https://www.nicovideo.jp/cache/",
      cacheinfo: `https://www.nicovideo.jp/cache/info/v2?${videoId}`,
      mediainfo: `https://www.nicovideo.jp/local/features/dist/src/nl-media-info/index.html?videoId=${videoId}`,
              videoinfo: "https://www.nicovideo.jp/local/features/dist/src/thumb-info/index.html",
      savemovie: `https://www.nicovideo.jp/cache/ffmpeg?video=${videoId}`,
      saveaudio: `https://www.nicovideo.jp/cache/ffmpeg?audio=${videoId}`,
      savecomment: `https://www.nicovideo.jp/cache/${threadId}.xml`,
      cache_remove: () => handleVideoOperation("cache_remove", videoId),
      nicochart: `http://www.nicochart.jp/watch/${videoId}`,
      nicolog: `https://www.nicolog.jp/watch/${videoId}`,
      nicoran: `http://nicoranweb.com/watch/${videoId}`,
      nicozon: `https://www.nicozon.net/watch/${videoId}`,
      search: "https://gokulin.info/search/",
      commentviewer: "https://yyya-nico.co/nv_comment_viewer/",
      nicodb: "https://nicodb.net/",
      ikioi: "https://ikioi-ranking.com/v/nico",
      cytube: "https://cytube.mm428.net/r/cookie_tv",
      yajuyaju: "https://yajuvideo.in/",
      watchVideoFilter: () => {
        try {
          const globalThumbnailsFilter = (window as Window & { ThumbnailsFilter?: ThumbnailsFilterGlobal }).ThumbnailsFilter;
          if (globalThumbnailsFilter && globalThumbnailsFilter.openSettingsPanel) {
            globalThumbnailsFilter.openSettingsPanel();
          } else {
            window.logger.warn('ThumbnailsFilterが利用できません。先にThumbnailsFilterを読み込んでください。');
          }
        } catch (error) {
          window.logger.error('ThumbnailsFilterの呼び出しに失敗しました:', error);
        }
      }
    };

    const actionValue = actionMap[action];
    if (typeof actionValue === 'function') {
      await actionValue();
    } else if (actionValue) {
      window.open(actionValue);
    }
  }
} 