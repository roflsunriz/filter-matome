import { addSafeEventListener } from '../utils/domUtil.js';
import { debugLog, debugError, debugWarn } from '../config.js';

export class DragController {
  constructor(container) {
    this.container = container;
    this.preventDragging = false;
    this.dragElements = new Map();
    this.initialX = 0;
    this.initialY = 0;
    this.isDragging = false;
    
    this.initialize();
    this.setInitialPosition();
  }

  initialize() {
    // ドラッグ対象となる要素タイプの定義
    const elementTypes = ['input', 'label', 'select', 'textarea'];
    
    // 各要素タイプに対してイベントリスナーを設定
    elementTypes.forEach(type => {
      const elements = Array.from(this.container.getElementsByTagName(type));
      this.dragElements.set(type, elements);
      
      elements.forEach(element => {
        this.setupPreventDragEvents(element);
      });
    });

    // コンテナのドラッグイベント設定
    this.setupContainerDrag();
    
    // ドラッグ可能であることを示すカーソルスタイルを設定
    this.container.style.cursor = 'move';
  }

  setupPreventDragEvents(element) {
    addSafeEventListener(element, 'mouseover', () => {
      this.preventDragging = true;
      // 入力要素上ではデフォルトのカーソルを表示
      this.container.style.cursor = 'default';
    });

    addSafeEventListener(element, 'mouseleave', () => {
      this.preventDragging = false;
      // 入力要素から離れたらドラッグ可能なカーソルを表示
      this.container.style.cursor = 'move';
    });
  }

  setupContainerDrag() {
    addSafeEventListener(this.container, 'pointerdown', (event) => {
      if (!this.preventDragging) {
        this.isDragging = true;
        this.initialX = event.clientX - this.container.offsetLeft;
        this.initialY = event.clientY - this.container.offsetTop;
        this.container.setPointerCapture(event.pointerId);
      }
    });

    addSafeEventListener(this.container, 'pointermove', (event) => {
      if (this.isDragging && !this.preventDragging) {
        this.handleDrag(event);
      }
    });

    addSafeEventListener(this.container, 'pointerup', (event) => {
      this.isDragging = false;
      if (this.container.hasPointerCapture(event.pointerId)) {
        this.container.releasePointerCapture(event.pointerId);
      }
    });
  }

  handleDrag(event) {
    try {
      const newX = event.clientX - this.initialX;
      const newY = event.clientY - this.initialY;
      
      this.container.style.position = 'absolute';
      this.container.style.left = `${newX}px`;
      this.container.style.top = `${newY}px`;
      this.container.draggable = false;
    } catch (error) {
      debugError('ドラッグ処理エラー:', error);
    }
  }

  // 新しい要素が動的に追加された場合の処理
  addElement(element) {
    const type = element.tagName.toLowerCase();
    if (this.dragElements.has(type)) {
      this.dragElements.get(type).push(element);
      this.setupPreventDragEvents(element);
    }
  }

  // クリーンアップ処理
  destroy() {
    this.dragElements.forEach(elements => {
      elements.forEach(element => {
        element.removeEventListener('mouseover', null);
        element.removeEventListener('mouseleave', null);
      });
    });
    
    this.container.removeEventListener('pointermove', null);
    this.container.removeEventListener('pointerup', null);
    this.dragElements.clear();
  }

  // 初期位置の設定を追加
  setInitialPosition() {
    try {
      if (!window.cc?.MainVideoPlayerWidthHeightReturner) {
        debugError('MainVideoPlayerWidthHeightReturnerが見つかりません');
        return;
      }

      const top = window.cc.MainVideoPlayerWidthHeightReturner("MainContainerY") + 100;
      const left = window.cc.MainVideoPlayerWidthHeightReturner("MainContainerX") - 303 + 70;

      this.container.style.position = 'absolute';
      this.container.style.top = `${top}px`;
      this.container.style.left = `${left}px`;

      debugLog('DragController: 初期位置設定完了');
    } catch (error) {
      debugError('初期位置設定エラー:', error);
    }
  }

  // 位置を更新するメソッドを追加
  updatePosition() {
    this.setInitialPosition();
  }
} 