import { debugLog, debugError, debugWarn } from '../config.js';

/**
 * DOM操作のユーティリティ関数群
 */

/**
 * 要素の作成と属性の設定を行う
 * @param {string} tag - 作成する要素のタグ名
 * @param {Object} attributes - 設定する属性のオブジェクト
 * @param {string|Node} [content] - 要素の中身（テキストまたはNode）
 * @returns {HTMLElement} 作成された要素
 */
export function createElement(tag, attributes = {}, content = '') {
    const element = document.createElement(tag);
    
    // 属性の設定
    Object.entries(attributes).forEach(([key, value]) => {
      if (key === 'className') {
        element.className = value;
      } else if (key === 'style' && typeof value === 'object') {
        Object.assign(element.style, value);
      } else {
        element.setAttribute(key, value);
      }
    });
    
    // コンテンツの設定
    if (content instanceof Node) {
      element.appendChild(content);
    } else if (content) {
      element.textContent = content;
    }
    
    return element;
  }
  
  /**
   * 要素の表示/非表示を切り替える
   * @param {HTMLElement} element - 対象の要素
   * @param {boolean} show - 表示するかどうか
   */
  export function toggleVisibility(element, show) {
    if (!element) return;
    element.style.display = show ? '' : 'none';
  }
  
  /**
   * 要素のクラスを切り替える
   * @param {HTMLElement} element - 対象の要素
   * @param {string} className - クラス名
   * @param {boolean} add - 追加するかどうか
   */
  export function toggleClass(element, className, add) {
    if (!element) return;
    element.classList[add ? 'add' : 'remove'](className);
  }
  
  /**
   * 要素の中身を安全に設定する（XSS対策）
   * @param {HTMLElement} element - 対象の要素
   * @param {string} html - 設定するHTML文字列
   */
  export function setInnerHTML(element, html) {
    if (!element) return;
    element.innerHTML = sanitizeHTML(html);
  }
  
  /**
   * HTML文字列をサニタイズする
   * @param {string} html - サニタイズするHTML文字列
   * @returns {string} サニタイズされたHTML文字列
   */
  export function sanitizeHTML(html) {
    return html
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
  
  /**
   * 要素が表示範囲内にあるかチェックする
   * @param {HTMLElement} element - チェックする要素
   * @returns {boolean} 表示範囲内にあるかどうか
   */
  export function isElementInViewport(element) {
    if (!element) return false;
    
    const rect = element.getBoundingClientRect();
    return (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
      rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
  }
  
  /**
   * 要素のスタイルを一括設定する
   * @param {HTMLElement} element - 対象の要素
   * @param {Object} styles - スタイルのオブジェクト
   */
  export function setStyles(element, styles) {
    if (!element || !styles) return;
    Object.assign(element.style, styles);
  }
  
  /**
   * 要素の位置を取得する
   * @param {HTMLElement} element - 対象の要素
   * @returns {Object} 要素の位置情報
   */
  export function getElementPosition(element) {
    if (!element) return { top: 0, left: 0 };
    
    const rect = element.getBoundingClientRect();
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    
    return {
      top: rect.top + scrollTop,
      left: rect.left + scrollLeft
    };
  }
  
  /**
   * 要素のサイズを取得する
   * @param {HTMLElement} element - 対象の要素
   * @returns {Object} 要素のサイズ情報
   */
  export function getElementSize(element) {
    if (!element) return { width: 0, height: 0 };
    
    const computedStyle = window.getComputedStyle(element);
    return {
      width: element.offsetWidth,
      height: element.offsetHeight,
      innerWidth: element.clientWidth,
      innerHeight: element.clientHeight,
      paddingTop: parseInt(computedStyle.paddingTop, 10),
      paddingRight: parseInt(computedStyle.paddingRight, 10),
      paddingBottom: parseInt(computedStyle.paddingBottom, 10),
      paddingLeft: parseInt(computedStyle.paddingLeft, 10)
    };
  }
  
  /**
   * イベントリスナーを安全に追加する
   * @param {HTMLElement} element - 対象の要素
   * @param {string} eventType - イベントタイプ
   * @param {Function} handler - イベントハンドラ
   * @param {Object} [options] - イベントリスナーのオプション
   */
  export function addSafeEventListener(element, eventType, handler, options = {}) {
    if (!element || !eventType || typeof handler !== 'function') return;
    element.addEventListener(eventType, handler, options);
  }

  /**
 * 要素のドラッグ操作を設定
 * @param {HTMLElement} element - ドラッグ対象の要素
 * @param {Function} onDrag - ドラッグ中のコールバック
 */
export function setupDraggable(element, onDrag) {
    if (!element) return;
  
    let isDragging = false;
    let startX, startY;
  
    element.addEventListener('mousedown', (e) => {
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      document.addEventListener('mousemove', handleDrag);
      document.addEventListener('mouseup', stopDrag);
    });
  
    function handleDrag(e) {
      if (!isDragging) return;
      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;
      onDrag(deltaX, deltaY);
      startX = e.clientX;
      startY = e.clientY;
    }
  
    function stopDrag() {
      isDragging = false;
      document.removeEventListener('mousemove', handleDrag);
      document.removeEventListener('mouseup', stopDrag);
    }
  }