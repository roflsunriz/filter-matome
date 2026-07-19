export function updateWatchOnlyAvailability(
  shadowRoot: ShadowRoot,
  isWatchPage: boolean,
  activateTab: (tabId: string) => void,
): void {
  const watchOnlyTabs = ["playback", "volume", "speed", "comments"];

  watchOnlyTabs.forEach((tabId) => {
    const tab = shadowRoot.getElementById(tabId);
    const navButton = shadowRoot.querySelector<HTMLButtonElement>(
      `[data-tab="${tabId}"]`,
    );

    tab?.classList.toggle("watch-only-disabled", !isWatchPage);
    if (navButton) {
      navButton.disabled = !isWatchPage;
      navButton.classList.toggle("watch-only-disabled", !isWatchPage);
      navButton.title = isWatchPage ? "" : "視聴ページでのみ利用できます";
    }

    tab
      ?.querySelectorAll("button, input, select, textarea")
      .forEach((element) => {
        (element as HTMLButtonElement | HTMLInputElement).disabled =
          !isWatchPage;
      });
  });

  if (!isWatchPage) {
    activateTab("links");
  }
}

export function setupKeyPropagationPrevention(
  shadowRoot: ShadowRoot | null,
): void {
  // ニコニコ動画のショートカットキーを定義
  const nicoShortcutKeys: Record<string, string> = {
    // 特殊キー（常に無効化）
    " ": "スペースキー（再生/一時停止）",
    ArrowLeft: "左矢印（10秒戻る）",
    ArrowRight: "右矢印（10秒進める）",
    ArrowUp: "上矢印（音量5%アップ）",
    ArrowDown: "下矢印（音量5%ダウン）",
    Home: "動画の先頭に移動",
    End: "動画の最後に移動",

    // 文字キー（入力フィールド以外で無効化）
    f: "フルスクリーンモード切替",
    F: "フルスクリーンモード切替",
    p: "プレーヤー位置に移動",
    P: "プレーヤー位置に移動",
    c: "コメント入力欄にフォーカス",
    C: "コメント入力欄にフォーカス",
    s: "画面サイズの変更",
    S: "画面サイズの変更",
    k: "動画の再生/停止",
    K: "動画の再生/停止",
    j: "動画を10秒戻す",
    J: "動画を10秒戻す",
    r: "リピート再生の有効/無効",
    R: "リピート再生の有効/無効",
    n: "次の動画へ移動",
    N: "次の動画へ移動",
    m: "ミュート/ミュート解除",
    M: "ミュート/ミュート解除",
    o: "コメント透過度の変更",
    O: "コメント透過度の変更",
    ",": "再生速度を下げる",
    ".": "再生速度を上げる",
    "<": "再生速度を下げる",
    ">": "再生速度を上げる",
  };

  // 特殊キー（常に無効化すべきキー）
  const specialKeys = [
    "ArrowLeft",
    "ArrowRight",
    "ArrowUp",
    "ArrowDown",
    "Home",
    "End",
    "Escape",
  ];

  // 入力フィールドかどうかを判定
  const isInputElement = (element: Element | null): boolean => {
    if (!element) return false;
    const tagName = element.tagName.toLowerCase();
    const inputType = (element as HTMLInputElement).type?.toLowerCase();

    return (
      (tagName === "input" &&
        (inputType === "text" ||
          inputType === "search" ||
          inputType === "password" ||
          inputType === "email" ||
          inputType === "url")) ||
      tagName === "textarea" ||
      (element as HTMLElement).contentEditable === "true"
    );
  };

  // 入力フィールドに直接イベントリスナーを設定
  const setupInputFieldProtection = (input: HTMLElement) => {
    ["keydown", "keypress", "keyup"].forEach((eventType) => {
      input.addEventListener(
        eventType,
        (e) => {
          const keyEvent = e as KeyboardEvent;

          // デバッグログ
          window.logger?.debug(
            `[MlinkVideoController] Input field key event: ${keyEvent.key} in ${input.tagName}`,
          );

          // 入力欄自身のハンドラを動かした後、外側への伝搬だけを止める
          keyEvent.stopPropagation();

          // 特殊キーのみ無効化、文字キーは完全に自由
          if (specialKeys.includes(keyEvent.key)) {
            keyEvent.preventDefault();
            window.logger?.debug(
              `[MlinkVideoController] Special key prevented in input: ${keyEvent.key}`,
            );
          }
          // 文字キー（f, j, k, l, m など）は完全にそのまま通す
        },
        false,
      );
    });
  };

  // グローバルキーイベントハンドラー（入力フィールド以外用）
  const globalKeyHandler = (e: Event) => {
    const keyEvent = e as KeyboardEvent;
    const target = keyEvent.target as Element;

    // 入力フィールドかどうかチェック
    if (isInputElement(target)) {
      // 入力フィールドの場合は何もしない（入力フィールド自体のリスナーが処理）
      return;
    }

    // Shadow DOM内の要素かどうかチェック
    const isInOurShadowDOM = shadowRoot?.contains(target);
    if (!isInOurShadowDOM) return;

    // 入力フィールド以外 - ニコニコショートカットを無効化
    if (nicoShortcutKeys[keyEvent.key]) {
      // Ctrl+キーは除外（ブラウザのショートカットを保護）
      if (!keyEvent.ctrlKey) {
        keyEvent.preventDefault();
        keyEvent.stopPropagation();
        window.logger?.debug(
          `[MlinkVideoController] Nico shortcut prevented: ${keyEvent.key} (${nicoShortcutKeys[keyEvent.key]})`,
        );
      }
    }
  };

  // 全ての入力フィールドに保護を設定
  const inputSelectors = [
    'input[type="text"]',
    'input[type="search"]',
    'input[type="password"]',
    'input[type="email"]',
    'input[type="url"]',
    'input[type="number"]',
    "textarea",
    ".comment-search-input",
    ".seek-value",
  ];

  inputSelectors.forEach((selector) => {
    const elements = shadowRoot?.querySelectorAll(selector) || [];
    elements.forEach((element) => {
      if (element instanceof HTMLElement) {
        setupInputFieldProtection(element);
        window.logger?.debug(
          `[MlinkVideoController] Protected input field: ${selector}`,
        );
      }
    });
  });

  // Shadow DOM内でのグローバルキーイベントを監視（入力フィールド以外用）
  if (shadowRoot) {
    shadowRoot.addEventListener("keydown", globalKeyHandler, true);
    shadowRoot.addEventListener("keypress", globalKeyHandler, true);
    window.logger?.debug(
      "[MlinkVideoController] Global key prevention set up in Shadow DOM",
    );
  }

  window.logger?.debug(
    "[MlinkVideoController] Universal key propagation prevention setup completed",
  );
}
