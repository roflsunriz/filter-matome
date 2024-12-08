import { ELEMENT_IDS, STORAGE_KEYS } from '../../constants.js';
import { debugLog, debugError, debugWarn } from '../config.js';

export class TabController {
  constructor() {
    try {
      this.validateElements();
      this.initialize();
    } catch (error) {
      debugError('TabControllerコンストラクタエラー:', error);
      throw error;
    }
  }

  validateElements() {
    this.tabs = document.querySelectorAll('.PlaybackrateChangerTab .Tab');
    if (!this.tabs.length) {
      throw new Error('タブ要素が見つかりません');
    }

    this.containers = document.querySelectorAll('.MainContainers');
    if (!this.containers.length) {
      throw new Error('コンテナ要素が見つかりません');
    }

    this.minimizeButton = document.getElementById('Minimize');
    if (!this.minimizeButton) {
      throw new Error('最小化ボタンが見つかりません');
    }

    this.expandButton = document.getElementById('Expand');
    if (!this.expandButton) {
      throw new Error('展開ボタンが見つかりません');
    }

    this.miniModeContainer = document.getElementById(ELEMENT_IDS.MINI_MODE);
    if (!this.miniModeContainer) {
      throw new Error('ミニモードコンテナが見つかりません');
    }

    this.alternativeContainer = document.getElementById('MiniModeAlternativeContainer');
    if (!this.alternativeContainer) {
      throw new Error('代替コンテナが見つかりません');
    }
  }

  initialize() {
    try {
      this.loadSavedState();
      this.setupEventListeners();
      debugLog('TabController: 初期化完了');
    } catch (error) {
      debugError('TabController: 初期化エラー:', error);
    }
  }

  setupEventListeners() {
    // タブクリックイベント
    this.tabs.forEach(tab => {
      tab.addEventListener('click', (e) => this.handleTabClick(e));
    });

    // 最小化/最大化ボタンのイベント
    this.minimizeButton.addEventListener('click', () => this.toggleMiniMode(true));
    this.expandButton.addEventListener('click', () => this.toggleMiniMode(false));
  }

  handleTabClick(event) {
    try {
      const targetTab = event.target;
      const targetContainerId = targetTab.dataset.tab;
      
      if (!targetContainerId) {
        throw new Error('タブのdata-tab属性が見つかりません');
      }

      this.updateActiveTab(targetTab);
      this.updateActiveContainer(targetContainerId);
    } catch (error) {
      debugError('タブクリック処理エラー:', error);
    }
  }

  updateActiveTab(newActiveTab) {
    // 現在のアクティブタブから'Active'クラスを削除
    this.tabs.forEach(tab => {
      tab.classList.remove('Active');
    });

    // 新しいタブに'Active'クラスを追加
    newActiveTab.classList.add('Active');
  }

  updateActiveContainer(containerId) {
    // 全てのコンテナから'Active'クラスを削除
    this.containers.forEach(container => {
      container.classList.remove('Active');
    });

    // 対象のコンテナに'Active'クラスを追加
    const targetContainer = document.getElementById(containerId);
    if (targetContainer) {
      targetContainer.classList.add('Active');
    }
  }

  toggleMiniMode(minimize) {
    if (minimize) {
      // 最小化モード
      this.miniModeContainer.style.display = 'none';
      this.alternativeContainer.style.display = 'block';
    } else {
      // 通常モード
      this.miniModeContainer.style.display = 'block';
      this.alternativeContainer.style.display = 'none';
    }

    // 状態を保存
    localStorage.setItem(STORAGE_KEYS.MINI_MODE, minimize ? '1' : '0');
  }

  loadSavedState() {
    // 最小化状態の復元
    const miniMode = localStorage.getItem(STORAGE_KEYS.MINI_MODE) === '1';
    if (miniMode) {
      this.toggleMiniMode(true);
    }
  }

  // クリーンアップメソッド
  destroy() {
    try {
      this.tabs.forEach(tab => {
        tab.removeEventListener('click', this.handleTabClick);
      });
      
      if (this.minimizeButton) {
        this.minimizeButton.removeEventListener('click', this.toggleMiniMode);
      }
      
      if (this.expandButton) {
        this.expandButton.removeEventListener('click', this.toggleMiniMode);
      }
      
      debugLog('TabController: クリーンアップ完了');
    } catch (error) {
      debugError('TabControllerクリーンアップエラー:', error);
    }
  }
}