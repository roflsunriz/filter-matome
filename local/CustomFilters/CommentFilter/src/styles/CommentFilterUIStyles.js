export const COMMENT_FILTER_STYLES = `
      .comment-filter-dialog {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.75);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 100000;
        backdrop-filter: blur(3px);
      }

      .comment-filter-content {
        background: var(--bg-color, #ffffff);
        color: var(--text-color, #333333);
        padding: 32px;
        border-radius: 12px;
        width: 95%;
        max-width: 1450px;
        max-height: 90vh;
        overflow-y: auto;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
        position: relative;
        animation: modalFadeIn 0.3s ease-out;
        display: flex;
        flex-direction: column;
      }

      @media (prefers-color-scheme: dark) {
        .comment-filter-content {
          --bg-color: #1a1b1e;
          --text-color: #e0e0e0;
          --input-bg: #32343a;
          --input-border: #3a3b3e;
          --input-focus: #4a4b4e;
          --button-primary: #4a90e2;
          --button-hover: #357abd;
          --button-secondary: #3a3b3e;
          --button-secondary-hover: #4a4b4e;
          --tooltip-bg: #2a2b2e;
          --tooltip-border: #4a90e2;
        }
      }

      @keyframes modalFadeIn {
        from {
          opacity: 0;
          transform: translateY(-20px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      .comment-filter-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 24px;
        padding-bottom: 16px;
        border-bottom: 1px solid var(--input-border, #ddd);
      }

      .comment-filter-header h2 {
        font-size: 1.5rem;
        font-weight: 600;
        color: var(--text-color, #333);
        margin: 0;
      }

      .header-buttons {
        display: flex;
        gap: 12px;
      }

      .header-buttons button {
        padding: 8px 16px;
        border-radius: 6px;
        border: none;
        background: var(--input-bg, #f0f0f0);
        color: var(--text-color, #333);
        cursor: pointer;
        transition: all 0.2s ease;
      }

      .header-buttons button:hover {
        background: var(--input-focus, #e0e0e0);
      }

        .comment-filter-fields {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 24px;
        padding: 20px 0;
        width: 100%;
        }

        #field-DEBUG { grid-area: 1 / 1 / 3 / 2; }
        #field-excludeNicoree { grid-area: 3 / 1 / 5 / 2; }
        #field-filterMode { grid-area: 5 / 1 / 7 / 2; }
        #field-ownerCommands { grid-area: 7 / 1 / 9 / 2; }
        #field-normalCommands { grid-area: 9 / 1 / 11 / 2; }
        #field-easyCommands { grid-area: 11 / 1 / 13 / 2; }
        #field-NGWord { grid-area: 1 / 2 / 4 / 3; }
        #field-NGRegex { grid-area: 4 / 2 / 7 / 3; }
        #field-OKWord { grid-area: 7 / 2 / 10 / 3; }
        #field-OKRegex { grid-area: 10 / 2 / 13 / 3; }
        #field-userIdFilters { grid-area: 1 / 3 / 4 / 4; }
        #field-replaceRules { grid-area: 4 / 3 / 7 / 4; }
        #field-excludeUserIds { grid-area: 7 / 3 / 10 / 4; }
        #field-excludeMovieIds { grid-area: 10 / 3 / 13 / 4; }
        #field-superNgWords { grid-area: 13 / 2 / 15 / 3; }
        #field-superNgRegex { grid-area: 13 / 1 / 14 / 2; }
        #field-superUserIdFilters { grid-area: 13 / 3 / 15 / 4; }
        #field-specificNgUsers { grid-area: 15 / 3 / 17 / 4; }
        #field-specificNgWords { grid-area: 15 / 2 / 17 / 3; }


      /* コマンド入力フィールドのスタイル調整 */
      #field-ownerCommands .comment-filter-input,
      #field-normalCommands .comment-filter-input,
      #field-easyCommands .comment-filter-input {
        height: 40px;
        min-height: unset;
      }

      /* チェックボックスとラジオボタンのコンテナ調整 */
      #field-DEBUG,
      #field-excludeNicoree,
      #field-filterMode {
        margin-bottom: 16px;
      }

      /* テキストエリアの高さ調整 */
      .comment-filter-field textarea.comment-filter-input {
        min-height: 200px;
        max-height: 400px;
        line-height: 1.5;
        background: var(--input-bg, #f0f0f0);
        padding: 12px;
        width: 100%;
      }

      /* レスポンシブ対応 */
      @media (max-width: 1200px) {
        .comment-filter-fields {
          grid-template-columns: repeat(2, 1fr);
        }
        
        /* コマンド系フィールドを最上部に配置し、横並びに */
        #field-DEBUG,
        #field-lotOfNicorare,
        #field-filterMode {
          grid-column: 1 / -1;
          height: auto;
        }

        /* コマンド系フィールドを横並びに */
        #field-ownerCommands {
          grid-column: 1;
          height: auto;
        }
        #field-normalCommands {
          grid-column: 2;
          height: auto;
        }
        #field-easyCommands {
          grid-column: 1 / -1;
          height: auto;
        }

        /* その他のフィールドを2カラムに分割 */
        #field-NGWord,
        #field-NGRegex,
        #field-OKWord,
        #field-OKRegex {
          grid-column: 1;
          height: 300px;
        }

        #field-userIdFilters,
        #field-replaceRules,
        #field-excludeUserIds,
        #field-excludeMovieIds {
          grid-column: 2;
          height: 300px;
        }
        #field-superNgRegex { grid-area: 10 / 1 / 11 / 2; height: 300px; }
      }

      @media (max-width: 768px) {
        .comment-filter-fields {
          grid-template-columns: 1fr;
        }

        /* コマンド系フィールドを縦に並べる */
        #field-DEBUG,
        #field-lotOfNicorare,
        #field-filterMode,
        #field-ownerCommands,
        #field-normalCommands,
        #field-easyCommands {
          grid-column: 1;
          height: auto;
          margin-bottom: 16px;
        }

        /* すべてのフィールドを1カラに */
        #field-NGWord,
        #field-NGRegex,
        #field-OKWord,
        #field-OKRegex,
        #field-userIdFilters,
        #field-replaceRules,
        #field-excludeUserIds,
        #field-excludeMovieIds {
          grid-column: 1;
          height: 250px;
        }
        #field-superNgRegex { grid-area: 19 / 1 / 20 / 2; height: 250px; }
      }

      /* 各要素間のスペーシング */
      .comment-filter-field {
        margin-bottom: 20px;
      }

      /* コマンド入力フィールドのグループ化 */
      #field-ownerCommands,
      #field-normalCommands,
      #field-easyCommands {
        margin-bottom: 12px;
      }

      .comment-filter-field {
        display: flex;
        flex-direction: column;
        gap: 8px;
        width: 100%;
        margin-bottom: 20px;
      }

      .comment-filter-field label {
        display: block;
        font-weight: 500;
        color: var(--text-color, #333);
        margin-bottom: 4px;
      }

      .comment-filter-input {
        width: 100%;
        padding: 12px;
        border: 1px solid var(--input-border, #ddd);
        border-radius: 8px;
        font-size: 14px;
        color: var(--text-color, #333);
        background: var(--input-bg, #f0f0f0);
        transition: all 0.2s ease;
        box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.1);
        box-sizing: border-box;
      }

      .comment-filter-input:focus {
        outline: none;
        border-color: var(--button-primary, #4a90e2);
        box-shadow: 0 0 0 2px rgba(74, 144, 226, 0.2);
        background: var(--input-bg, #f0f0f0);
      }

      .comment-filter-field textarea.comment-filter-input {
        font-family: monospace;
        resize: vertical;
        min-height: 120px;
        max-height: 400px;
        line-height: 1.5;
        background: var(--input-bg, #f0f0f0);
        padding: 12px;
        width: 100%;
      }

      .comment-filter-radio-group {
        display: flex;
        flex-direction: column;
        gap: 12px;
        width: 100%;
      }

      .comment-filter-radio-label {
        display: flex;
        align-items: center;
        gap: 8px;
        width: 100%;
        padding: 4px 0;
      }

      .comment-filter-radio-label input[type="radio"] {
        margin: 0;
      }

      /* スクロールバーのスタイル */
      .comment-filter-content::-webkit-scrollbar {
        width: 8px;
      }

      .comment-filter-content::-webkit-scrollbar-track {
        background: var(--input-bg, #f1f1f1);
        border-radius: 4px;
      }

      .comment-filter-content::-webkit-scrollbar-thumb {
        background: var(--input-border, #888);
        border-radius: 4px;
      }

      .comment-filter-content::-webkit-scrollbar-thumb:hover {
        background: var(--input-focus, #555);
      }

      /* バルーンツールチップのスタイル */
      [class^="balloon"] {
        position: relative;
        display: inline-block;
      }

      [class^="balloon"] span {
        display: none;
        position: absolute;
        padding: 12px 16px;
        border-radius: 8px;
        background: var(--tooltip-bg, #fff);
        color: var(--text-color, #333);
        border: 2px solid var(--tooltip-border, #4a90e2);
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
        font-size: 14px;
        line-height: 1.5;
        z-index: 1;
        min-width: 200px;
        max-width: 300px;
        margin-top: 8px;
      }

      [class^="balloon"]:hover span {
        display: block;
        animation: tooltipFadeIn 0.2s ease-out;
      }

      @keyframes tooltipFadeIn {
        from {
          opacity: 0;
          transform: translateY(-5px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      [class^="balloon"] h3 {
        margin: 0 0 8px;
        font-size: 16px;
        color: var(--button-primary, #4a90e2);
        font-weight: 600;
      }

      /* ボタンのスタイル改善 */
      .comment-filter-footer {
        display: flex;
        justify-content: flex-end;
        gap: 12px;
        margin-top: 24px;
        padding-top: 16px;
        border-top: 1px solid var(--input-border, #ddd);
      }

      .comment-filter-footer button {
        padding: 10px 20px;
        border: none;
        border-radius: 6px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
        font-size: 14px;
      }

      /* 保存して更新ボタン */
      .comment-filter-footer button:first-child {
        background: var(--button-primary, #4a90e2);
        color: white;
      }

      .comment-filter-footer button:first-child:hover {
        background: var(--button-hover, #357abd);
      }

      /* インポート・エクスポートボタン */
      .comment-filter-footer button:not(:first-child) {
        background: var(--button-secondary, #f0f0f0);
        color: var(--text-color, #333);
      }

      .comment-filter-footer button:not(:first-child):hover {
        background: var(--button-secondary-hover, #e0e0e0);
      }

      /* レスポンシブ対応の強化 */
      @media (max-width: 768px) {
        .comment-filter-content {
          padding: 20px;
          width: 98%;
        }

        .comment-filter-fields {
          grid-template-columns: 1fr;
          gap: 16px;
        }

        .comment-filter-field {
          margin-bottom: 16px;
        }

        .comment-filter-input {
          padding: 10px;
        }
      }

      /* 特定のフィールドタイプに対する調整 */
      .comment-filter-field[data-field-key="NGWord"] textarea.comment-filter-input,
      .comment-filter-field[data-field-key="NGRegex"] textarea.comment-filter-input,
      .comment-filter-field[data-field-key="OKWord"] textarea.comment-filter-input,
      .comment-filter-field[data-field-key="OKRegex"] textarea.comment-filter-input,
      .comment-filter-field[data-field-key="replaceRules"] textarea.comment-filter-input {
        min-height: 150px;
      }

      /* チェックボックスフィールドのスタイル調整 */
      .comment-filter-field input[type="checkbox"] {
        margin: 0;
        margin-right: 8px;
      }

      .comment-filter-field label {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      /* コマンド入力フィールドのスタイル */
      #field-ownerCommands,
      #field-normalCommands,
      #field-easyCommands {
        .comment-filter-input {
          height: 40px;
          min-height: unset;
        }
      }

      /* テキストフィールドの共通スタイル */
      .comment-filter-field {
        display: flex;
        flex-direction: column;
        gap: 8px;
        height: 100%; /* 親要素いっぱいに広がる */
      }

      /* テキストエリアを親要素いっぱいに広げる */
      .comment-filter-field textarea.comment-filter-input {
        flex: 1;
        min-height: 120px;
        height: calc(100% - 30px); /* ラベルの高さを考慮 */
      }

      /* レスポンシブ対応 */
      @media (max-width: 1200px) {

      .comment-filter-fields {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        grid-template-rows: repeat(7, 1fr);
        grid-column-gap: 0px;
        grid-row-gap: 0px;
        }

        #field-DEBUG { grid-area: 1 / 1 / 2 / 2;height: auto; }
        #field-lotOfNicorare { grid-area: 1 / 2 / 2 / 3;height: auto; }
        #field-filterMode { grid-area: 2 / 1 / 3 / 2;height: auto;}
        #field-ownerCommands { grid-area: 2 / 2 / 3 / 3;height: auto; }
        #field-normalCommands { grid-area: 3 / 1 / 4 / 2;height: auto; }
        #field-easyCommands { grid-area: 3 / 2 / 4 / 3;height: auto; }
        #field-NGWord { grid-area: 4 / 1 / 5 / 2; height: 300px;}
        #field-NGRegex { grid-area: 4 / 2 / 5 / 3; height: 300px;}
        #field-OKWord { grid-area: 5 / 1 / 6 / 2; height: 300px; }
        #field-OKRegex { grid-area: 5 / 2 / 6 / 3; height: 300px;}
        #field-userIdFilters { grid-area: 6 / 1 / 7 / 2; height: 300px;}
        #field-replaceRules { grid-area: 6 / 2 / 7 / 3; height: 300px;}
        #field-excludeUserIds { grid-area: 7 / 1 / 8 / 2; height: 300px;}
        #field-excludeMovieIds { grid-area: 7 / 2 / 8 / 3; height: 300px;}
        #field-superNgWords { grid-area: 8 / 1 / 9 / 2; height: 300px;}
        #field-superUserIdFilters { grid-area: 8 / 2 / 9 / 3; height: 300px;}
        #field-specificNgUsers { grid-area: 9 / 1 / 10 / 2; height: 300px;}
        #field-specificNgWords { grid-area: 9 / 2 / 10 / 3; height: 300px;}
        #field-superNgRegex { grid-area: 10 / 1 / 11 / 2; height: 300px; }
      }
        
      @media (max-width: 768px) {
          .comment-filter-fields {
            display: grid;
            grid-template-columns: 1fr;
            grid-template-rows: repeat(14, 1fr);
            grid-column-gap: 0px;
            grid-row-gap: 0px;
          }

          #field-DEBUG { grid-area: 1 / 1 / 2 / 2; height: auto;margin-bottom: 16px;}
          #field-lotOfNicorare { grid-area: 2 / 1 / 3 / 2; height: auto;margin-bottom: 16px;}
          #field-filterMode { grid-area: 3 / 1 / 4 / 2; height: auto;margin-bottom: 16px;}
          #field-ownerCommands { grid-area: 4 / 1 / 5 / 2; height: auto;margin-bottom: 16px;}
          #field-normalCommands { grid-area: 5 / 1 / 6 / 2; height: auto;margin-bottom: 16px;}
          #field-easyCommands { grid-area: 6 / 1 / 7 / 2; height: auto;margin-bottom: 16px;}
          #field-NGWord { grid-area: 7 / 1 / 8 / 2; height: 250px;}
          #field-NGRegex { grid-area: 8 / 1 / 9 / 2; height: 250px;}
          #field-OKWord { grid-area: 9 / 1 / 10 / 2; height: 250px;}
          #field-OKRegex { grid-area: 10 / 1 / 11 / 2; height: 250px;}
          #field-userIdFilters { grid-area: 11 / 1 / 12 / 2; height: 250px;}
          #field-replaceRules { grid-area: 12 / 1 / 13 / 2; height: 250px;}
          #field-excludeUserIds { grid-area: 13 / 1 / 14 / 2; height: 250px;}
          #field-excludeMovieIds { grid-area: 14 / 1 / 15 / 2; height: 250px;}
          #field-superNgWords { grid-area: 15 / 1 / 16 / 2; height: 250px;}
          #field-superUserIdFilters { grid-area: 16 / 1 / 17 / 2; height: 250px;}
          #field-specificNgUsers { grid-area: 17 / 1 / 18 / 2; height: 250px;}
          #field-specificNgWords { grid-area: 18 / 1 / 19 / 2; height: 250px;}
          #field-superNgRegex { grid-area: 19 / 1 / 20 / 2; height: 250px; }
      }
    `;