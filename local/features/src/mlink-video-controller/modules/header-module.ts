import { ModuleInstance, ModuleConfig, ModuleStatus } from '../../types/module-types';

/**
 * ヘッダープライバシーモジュール
 * ユーザーアイコンとユーザー名を非表示にする機能
 */
export class HeaderModule implements ModuleInstance {
  public config: ModuleConfig;
  private intervalId: number | null = null;
  private active: boolean = false;

  constructor(config: ModuleConfig) {
    this.config = config;
  }

  async initialize(): Promise<void> {
    try {
      await Promise.resolve();
      // 即座に実行
      this.hideUserElements();
      
      // 5秒間隔で定期実行（動的コンテンツ対応）
      this.intervalId = window.setInterval(() => { this.hideUserElements(); }, 5000);
      
      this.active = true;
      
    } catch (error) {
      window.logger.error('[HeaderModule] 初期化に失敗しました:', error);
      throw error;
    }
  }

  destroy(): void {
    try {
      
      
      // インターバルをクリア
      if (this.intervalId) {
        clearInterval(this.intervalId);
        this.intervalId = null;
      }
      
      // 非表示にした要素を復元
      this.restoreUserElements();
      
      this.active = false;
      
    } catch (error) {
      window.logger.error('[HeaderModule] 停止処理に失敗しました:', error);
    }
  }

  isActive(): boolean {
    return this.active;
  }

  getStatus(): ModuleStatus {
    if (!this.active) {
      return ModuleStatus.INACTIVE;
    }
    return ModuleStatus.ACTIVE;
  }

  /**
   * ユーザー関連要素を非表示にする
   */
  private hideUserElements(): void {
    try {

      // 元の実装に基づくユーザーアイコンの非表示
      const images: NodeListOf<HTMLImageElement> = document.querySelectorAll('img');
      images.forEach((img: HTMLImageElement) => {
        const regexSrc = /^https:\/\/secure-dcdn\.cdn\.nimg\.jp\/nicoaccount\/usericon\/.*/;
        const regexClass = /^common-header/;

        if (regexSrc.test(img.src) && regexClass.test(img.className)) {
          if (img.style.display !== 'none') {
            img.style.display = 'none';
            img.setAttribute('data-header-module-hidden', 'true');
          }
        }
      });

      // 元の実装に基づくユーザー名の非表示
      const textNode: HTMLElement | null = document.querySelector('.common-header-w2sn95');
      if (textNode && textNode.style.display !== 'none') {
        textNode.style.display = 'none';
        textNode.setAttribute('data-header-module-hidden', 'true');
      }

      // 追加の汎用的なユーザー関連要素の非表示
      const additionalUserElements = document.querySelectorAll(
        'img[alt*="ユーザーアイコン"], .UserIcon, .user-icon, [class*="userIcon"], [class*="UserIcon"], ' +
        '.UserName, .user-name, [class*="userName"], [class*="UserName"], ' +
        '[data-testid*="user"], .UserDetailsContainer, .UserDetailsContainer_name, ' +
        'header a[href*="/user/"], .SiteHeaderContainer a[href*="/user/"], ' +
        '.LoginUserContainer, .login-user, [class*="loginUser"]'
      );
      
      additionalUserElements.forEach(element => {
        if (element instanceof HTMLElement && 
            element.style.display !== 'none' && 
            !element.hasAttribute('data-header-module-hidden')) {
          
          // ユーザー関連要素かどうかを判定
          if (this.isUserRelatedElement(element)) {
            element.style.display = 'none';
            element.setAttribute('data-header-module-hidden', 'true');
          }
        }
      });
    } catch (error) {
      window.logger.error('[HeaderModule] ユーザー要素の非表示処理でエラー:', error);
    }
  }

  /**
   * 非表示にした要素を復元する
   */
  private restoreUserElements(): void {
    try {
      const hiddenElements = document.querySelectorAll('[data-header-module-hidden="true"]');
      hiddenElements.forEach(element => {
        if (element instanceof HTMLElement) {
          element.style.display = '';
          element.removeAttribute('data-header-module-hidden');
        }
      });
      
      
    } catch (error) {
      window.logger.error('[HeaderModule] 要素の復元処理でエラー:', error);
    }
  }

  /**
   * 要素がユーザー関連かどうかを判定
   */
  private isUserRelatedElement(element: HTMLElement): boolean {
    const text = element.textContent?.toLowerCase() || '';
    const className = element.className.toLowerCase();
    
    // ユーザー関連のキーワードをチェック
    const userKeywords = ['user', 'ユーザー', 'プロフィール', 'profile', 'アカウント', 'account'];
    
    return userKeywords.some(keyword => 
      text.includes(keyword) || className.includes(keyword)
    );
  }
} 