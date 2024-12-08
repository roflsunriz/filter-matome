"use strict";

import { fetchCacheInfo } from './fetchUtil.js';

// グローバルスコープに公開
window.cacheUtil = {
  handleCacheRemove: (videoId) => {
    window.debugLog('CacheUtil', 'handleCacheRemove', '開始', videoId);
    if (!videoId) return;
    if (confirm("本当に削除しますか？: " + videoId + " " + NicoCache_nl?.watch?.apiData.video.title)) {
      NicoCache_nl.get("/cache/ajax_rmall?" + videoId);
    }
  },

  formatCacheInfo: () => {
    window.debugLog('CacheUtil', 'formatCacheInfo', '開始');
    
    const videoId = NicoCache_nl?.watch?.apiData?.video?.id;
    window.debugLog('CacheUtil', 'formatCacheInfo', 'Video ID取得', videoId);

    if (!videoId) {
      window.handleError('CacheUtil', 'formatCacheInfo', 'Video ID が取得できません');
      return;
    }

    const cacheInfoElement = cc.i("cacheinfo");
    if (!cacheInfoElement) {
      window.handleError('CacheUtil', 'formatCacheInfo', 'キャッシュ情報の要素が見つかりません');
      return;
    }

    window.measurePerformance('CacheUtil', 'formatCacheInfo', () => {
      fetchCacheInfo(videoId)
        .then((result) => {
          window.debugLog('CacheUtil', 'formatCacheInfo', 'キャッシュ情報取得成功', result);
          window.cacheUtil.updateCacheStatus(result);
        })
        .catch((error) => {
          window.handleError('CacheUtil', 'formatCacheInfo', error);
        });
    });
  },

  setActiveClass: (elements, activeIndex) => {
    window.debugLog('CacheUtil', 'setActiveClass', '開始', { elements, activeIndex });
    elements.forEach((element, index) => {
      if (index === activeIndex) {
        element.classList.add('Active');
      } else {
        element.classList.remove('Active');
      }
    });
  },

  updateCacheStatus: (result) => {
    window.debugLog('CacheUtil', 'updateCacheStatus', '開始', result);

    if (!result) {
      window.handleError('CacheUtil', 'updateCacheStatus', '結果が空です');
      return;
    }

    const videoId = NicoCache_nl?.watch?.apiData?.video?.id;
    if (!videoId || !result[videoId]) {
      window.handleError('CacheUtil', 'updateCacheStatus', 'Video情報が取得できません');
      return;
    }

    const data = result[videoId];
    
    // 優先キャッシュまたは最高画質のキャッシュを取得
    let cache = null;
    if (data.preferred && data.caches[data.preferred]) {
      cache = data.caches[data.preferred];
    } else {
      // 解像度の優先順位マップ
      const resolutionPriority = {
        '4320p': 7, '2160p': 6, '1440p': 5, '1080p': 4,
        '720p': 3, '480p': 2, '360p': 1, '144p': 0, '0p': -1
      };
      
      // 最高画質のキャッシュを探す
      let highestResolution = -1;
      let highestCache = null;
      
      Object.values(data.caches).forEach(cacheData => {
        const resolutionRank = resolutionPriority[cacheData.dmcMovieType?.videoMode] ?? -2;
        if (resolutionRank > highestResolution) {
          highestResolution = resolutionRank;
          highestCache = cacheData;
        }
      });
      
      cache = highestCache;
    }

    // 動画の完了状態を更新
    const completesElements = document.querySelectorAll('.videoCompletes');
    window.cacheUtil.setActiveClass(completesElements, 
      data.completes.length > 0 ? 0 : 
      data.cachings.length > 0 ? 1 : 2
    );

    // エコノミー状態を更新
    const economyElements = document.querySelectorAll('.videoEconomy');
    window.cacheUtil.setActiveClass(economyElements, 
      cache?.economy ? 0 : 
      !cache?.economy ? 1 : 2
    );

    // エンコーディング状態を更新（HLSの場合はH.264固定）
    const encodingElements = document.querySelectorAll('.videoEncoding');
    const encodingIndex = cache?.movieType === 'hls' ? 0 : 3;
    window.cacheUtil.setActiveClass(encodingElements, encodingIndex);

    // 動画モードを更新
    const modesElements = document.querySelectorAll('.videoModes');
    if (cache?.dmcMovieType) {
      // 全てのモードをリセット
      modesElements.forEach(element => element.classList.remove('Active'));
      
      // 該当する解像度のモードを点灯
      const resolutionMap = {
        '144p': 0, '360p': 1, '480p': 2, '720p': 3, 
        '1080p': 4, '1440p': 5, '2160p': 6, '4320p': 7
      };
      const resolutionIndex = resolutionMap[cache.dmcMovieType.videoMode];
      if (resolutionIndex !== undefined && modesElements[resolutionIndex]) {
        modesElements[resolutionIndex].classList.add('Active');
      }
      // N/Aを非アクティブに
      modesElements[modesElements.length - 1].classList.remove('Active');
    } else {
      // モード情報が存在しない場合はN/Aのみを点灯
      window.debugLog('CacheUtil', 'updateCacheStatus', 'モード情報が存在しません');
      modesElements.forEach((element, index) => {
        if (index === modesElements.length - 1) {
          element.classList.add('Active');  // N/Aを点灯
        } else {
          element.classList.remove('Active');  // 他のモードを消灯
        }
      });
    }

    // プログレスバーの更新（キャッシュ中および完了時）
    if (data.cachings.length > 0 || data.completes.length > 0) {
      const percentage = document.getElementById('cachingPercentage');
      const partialDuration = document.getElementById('cachingPartialDuration');
      const partialSize = document.getElementById('cachingPartialSize');
      const progressBar = document.getElementById('progressBar');

      const totalSize = Math.floor(cache?.size / (1024 * 1024));
      const videoDuration = cache?.cachingSize 
      ? Math.floor((cache.cachingSize / cache.size) * NicoCache_nl.watch.apiData.video.duration)
      : NicoCache_nl.watch.apiData.video.duration;
      const minutes = Math.floor(videoDuration / 60);
      const seconds = videoDuration % 60;
      const progress = {
        percentage: cache?.cachingSize ? Math.floor((cache.cachingSize / cache.size) * 100) : 100,
        partialSize: cache?.cachingSize ? Math.floor(cache.cachingSize / (1024 * 1024)) : totalSize
      };

      if (percentage) percentage.textContent = `${progress.percentage}%`;
      if (partialSize) partialSize.textContent = `${progress.partialSize}MB`;
      if (partialDuration) partialDuration.textContent = `${minutes}分${seconds}秒`;
      if (progressBar) progressBar.style.width = `${progress.percentage}%`;
    }

    window.debugLog('CacheUtil', 'updateCacheStatus', '完了');
  },

  toggleMiniMode: () => {
    window.debugLog('CacheUtil', 'toggleMiniMode', '開始');
    
    const userPageMiniModeContainer = document.getElementById('userPageMiniModeContainer');
    const userPageMiniModeAlternativeContainer = document.getElementById('userPageMiniModeAlternativeContainer');
    const currentMode = localStorage.getItem('up_minimode') === 'true';
    
    if (userPageMiniModeContainer && userPageMiniModeAlternativeContainer) {
      if (!currentMode) {
        // 通常モードから縮小モードへ
        localStorage.setItem('up_minimode', 'true');
        userPageMiniModeContainer.style.display = 'none';
        userPageMiniModeAlternativeContainer.style.display = 'block';
      } else {
        // 縮小モードから通常モードへ
        localStorage.setItem('up_minimode', 'false');
        userPageMiniModeContainer.style.display = 'block';
        userPageMiniModeAlternativeContainer.style.display = 'none';
      }
    }
    
    window.debugLog('CacheUtil', 'toggleMiniMode', '完了', { newMode: !currentMode });
  }
};

// エクスポートも維持
export const { handleCacheRemove, formatCacheInfo, toggleMiniMode } = window.cacheUtil;