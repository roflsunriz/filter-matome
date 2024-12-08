import { debugLog, debugError, debugWarn } from '../config.js';

/**
 * 時間フォーマットに関するユーティリティ関数群
 */

/**
 * 秒数を "MM:SS" 形式の文字列に変換
 * @param {number} seconds - 変換する秒数
 * @returns {string} フォーマットされた時間文字列
 */
export function formatTime(seconds) {
    if (typeof seconds !== 'number' || isNaN(seconds)) {
      return '00:00';
    }
  
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    
    return `${padZero(minutes)}:${padZero(remainingSeconds)}`;
  }
  
  /**
   * 秒数を "HH:MM:SS" 形式の文字列に変換
   * @param {number} seconds - 変換する秒数
   * @returns {string} フォーマットされた時間文字列
   */
  export function formatTimeWithHours(seconds) {
    if (typeof seconds !== 'number' || isNaN(seconds)) {
      return '00:00:00';
    }
  
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    
    return `${padZero(hours)}:${padZero(minutes)}:${padZero(remainingSeconds)}`;
  }
  
  /**
   * ニコニコ動画のvpos（1/100秒）を秒数に変換
   * @param {number} vpos - 変換するvpos値
   * @returns {number} 秒数
   */
  export function vposToSeconds(vpos) {
    if (typeof vpos !== 'number' || isNaN(vpos)) {
      return 0;
    }
    
    return vpos / 100;
  }
  
  /**
   * 秒数をニコニコ動画のvpos（1/100秒）に変換
   * @param {number} seconds - 変換する秒数
   * @returns {number} vpos値
   */
  export function secondsToVpos(seconds) {
    if (typeof seconds !== 'number' || isNaN(seconds)) {
      return 0;
    }
    
    return Math.floor(seconds * 100);
  }
  
  /**
   * "MM:SS" 形式の文字列を秒数に変換
   * @param {string} timeStr - 変換する時間文字列
   * @returns {number} 秒数
   */
  export function parseTimeString(timeStr) {
    if (typeof timeStr !== 'string') {
      return 0;
    }
  
    const parts = timeStr.split(':').map(part => parseInt(part, 10));
    
    if (parts.length === 2) {
      const [minutes, seconds] = parts;
      if (!isNaN(minutes) && !isNaN(seconds)) {
        return minutes * 60 + seconds;
      }
    }
    
    return 0;
  }
  
  /**
   * 数値を2桁の文字列に変換（先頭にゼロを付加）
   * @param {number} num - 変換する数値
   * @returns {string} 2桁の文字列
   * @private
   */
  function padZero(num) {
    return num.toString().padStart(2, '0');
  }
  
  /**
   * 時間の差分を計算して文字列で返す
   * @param {number} time1 - 比較する時間1（秒）
   * @param {number} time2 - 比較する時間2（秒）
   * @returns {string} 時間差の文字列
   */
  export function getTimeDifference(time1, time2) {
    if (typeof time1 !== 'number' || typeof time2 !== 'number') {
      return '00:00';
    }
  
    const diffSeconds = Math.abs(time1 - time2);
    return formatTime(diffSeconds);
  }
  
  /**
   * 再生速度に基づいて実時間を計算
   * @param {number} videoTime - 動画時間（秒）
   * @param {number} playbackRate - 再生速度
   * @returns {string} 実時間の文字列
   */
  export function calculateRealTime(videoTime, playbackRate) {
    if (typeof videoTime !== 'number' || typeof playbackRate !== 'number' || 
        playbackRate === 0) {
      return '00:00';
    }
  
    const realSeconds = videoTime / playbackRate;
    return formatTime(realSeconds);
  }
  
  /**
   * ミリ秒を "MM:SS.MS" 形式の文字列に変換
   * @param {number} milliseconds - 変換するミリ秒
   * @returns {string} フォーマットされた時間文字列
   */
  export function formatTimeWithMilliseconds(milliseconds) {
    if (typeof milliseconds !== 'number' || isNaN(milliseconds)) {
      return '00:00.000';
    }
  
    const minutes = Math.floor(milliseconds / 60000);
    const seconds = Math.floor((milliseconds % 60000) / 1000);
    const ms = milliseconds % 1000;
    
    return `${padZero(minutes)}:${padZero(seconds)}.${ms.toString().padStart(3, '0')}`;
  }
  
  /**
   * 再生速度に基づいて残り時間を計算
   * @param {number} currentTime - 現在の再生時間（秒）
   * @param {number} duration - 動画の長さ（秒）
   * @param {number} playbackRate - 再生速度
   * @returns {string} 残り時間の文字列
   */
  export function calculateRemainingTime(currentTime, duration, playbackRate) {
    if (!currentTime || !duration || !playbackRate) return '00:00';
    
    const remainingSeconds = (duration - currentTime) / playbackRate;
    return formatTime(remainingSeconds);
  }