// CommentFilter2 メインUIテンプレート
import { getIconSVG, ICONS } from "@/common/material-icons";

/**
 * CommentFilter2のメインUIテンプレート
 */
export const mainUITemplate = `
<div id="cf2-container" class="cf2-container">
  <!-- ヘッダー -->
  <div class="cf2-header">
    <div class="cf2-title">
      ${getIconSVG(ICONS.filter)}
      <span class="cf2-title-text">comment-filter2</span>
              <a href="https://www.nicovideo.jp/local/features/dist/src/docs/comment-filter2/index.html" target="_blank">${getIconSVG(ICONS.info)}</a>
    </div>
    <button id="cf2-close-btn" class="cf2-close-btn" title="閉じる">
      ${getIconSVG(ICONS.close)}
    </button>
  </div>

  <!-- メインコンテンツ -->
  <div id="cf2-content" class="cf2-content">
    <!-- 全体コントロール（全幅） -->
    <div class="cf2-top-controls">
      <!-- 全体ON/OFFトグル -->
      <div class="cf2-card cf2-control-card">
        <div class="cf2-toggle-container">
          <div class="cf2-toggle-label">
            ${getIconSVG(ICONS.visibility)}
            <span>フィルター有効</span>
          </div>
          <div id="cf2-main-toggle" class="cf2-toggle active">
            <div class="cf2-toggle-slider"></div>
          </div>
        </div>
      </div>

      <!-- ステータス表示 -->
      <div class="cf2-status-card cf2-control-card">
        <div class="cf2-status">
          <div id="cf2-status-indicator" class="cf2-status-indicator active"></div>
          <span id="cf2-status-text" class="cf2-status-text">準備完了</span>
        </div>
      </div>
    </div>

    <!-- コマンド設定セクション（全幅） -->
    <div class="cf2-card cf2-command-settings-card">
      <div class="cf2-section-header">
        ${getIconSVG(ICONS.comment)}
        <div class="cf2-section-title">コメントコマンド設定</div>
      </div>
      <p class="cf2-help-text">カンマ区切りでコマンドを入力</p>
      
      <div class="cf2-command-grid">
        <!-- 投稿者コメント -->
        <div class="cf2-input-group">
          <label for="cf2-owner-commands" class="cf2-input-label" title="利用可能コマンド: big,medium,small,defont,gothic,mincho,ue,naka,shita,white,red,pink,orange,yellow,green,cyan,blue,purple,black,white2,red2,pink2,orange2,yellow2,green2,cyan2,blue2,purple2,black2,_live,invisible,full,ender,patissier,ca,#RRGGBB(16進数カラー)">
            ${getIconSVG(ICONS.info)}
            投稿者コメント (owner)
          </label>
          <input 
            type="text" 
            id="cf2-owner-commands" 
            class="cf2-command-input"
            placeholder="例: small,_live,red"
          />
        </div>

        <!-- メインコメント -->
        <div class="cf2-input-group">
          <label for="cf2-main-commands" class="cf2-input-label" title="利用可能コマンド: big,medium,small,defont,gothic,mincho,ue,naka,shita,white,red,pink,orange,yellow,green,cyan,blue,purple,black,white2,red2,pink2,orange2,yellow2,green2,cyan2,blue2,purple2,black2,_live,invisible,full,ender,patissier,ca,#RRGGBB(16進数カラー)">
            ${getIconSVG(ICONS.info)}
            メインコメント (main)
          </label>
          <input 
            type="text" 
            id="cf2-main-commands" 
            class="cf2-command-input"
            placeholder="例: big,blue2"
          />
        </div>

        <!-- 簡単コメント -->
        <div class="cf2-input-group">
          <label for="cf2-easy-commands" class="cf2-input-label" title="利用可能コマンド: big,medium,small,defont,gothic,mincho,ue,naka,shita,white,red,pink,orange,yellow,green,cyan,blue,purple,black,white2,red2,pink2,orange2,yellow2,green2,cyan2,blue2,purple2,black2,_live,invisible,full,ender,patissier,ca,#RRGGBB(16進数カラー)">
            ${getIconSVG(ICONS.info)}
            簡単コメント (easy)
          </label>
          <input 
            type="text" 
            id="cf2-easy-commands" 
            class="cf2-command-input"
            placeholder="例: mincho,pink,big"
          />
        </div>
      </div>

      <div class="cf2-button-group">
        <button id="cf2-save-commands" class="cf2-button cf2-button-primary">
          ${getIconSVG(ICONS.save)}
          <span>コマンド設定保存</span>
        </button>
        <button id="cf2-reset-commands" class="cf2-button cf2-button-secondary">
          ${getIconSVG(ICONS.warning)}
          <span>デフォルトに戻す</span>
        </button>
      </div>
    </div>

    <!-- ルール形式切替 -->
    <div class="cf2-format-selector">
      <div class="cf2-card">
        <div class="cf2-section-header">
          ${getIconSVG(ICONS.settings)}
          <div class="cf2-section-title">ルール入力方式</div>
        </div>
        <div class="cf2-format-tabs">
          <button id="cf2-format-form" class="cf2-format-tab active">
            ${getIconSVG(ICONS.edit)}
            <span>フォーム入力</span>
          </button>
          <button id="cf2-format-json" class="cf2-format-tab">
            ${getIconSVG(ICONS.comment)}
            <span>JSON直接編集</span>
          </button>
        </div>
      </div>
    </div>

    <!-- 2カラムレイアウト -->
    <div class="cf2-layout-grid">
      <!-- 左カラム：ルール追加 -->
      <div class="cf2-left-column">
        <!-- ルール追加フォーム -->
        <div id="cf2-form-section" class="cf2-card cf2-main-card">
          <div class="cf2-section-header">
            ${getIconSVG(ICONS.edit)}
            <div class="cf2-section-title">ルール追加</div>
          </div>
          
          <!-- ルールタイプ選択 -->
          <div class="cf2-rule-type-selector">
            <div class="cf2-input-group">
              <label class="cf2-input-label">ルールタイプ</label>
              <div class="cf2-radio-group">
                <label class="cf2-radio-label">
                  <input type="radio" name="cf2-rule-type" value="regex" checked>
                  <span>正規表現</span>
                </label>
                <label class="cf2-radio-label">
                  <input type="radio" name="cf2-rule-type" value="userId">
                  <span>ユーザーID</span>
                </label>
              </div>
            </div>
          </div>

          <!-- 正規表現ルール入力 -->
          <div id="cf2-regex-inputs" class="cf2-rule-inputs">
            <div class="cf2-input-group">
              <label for="cf2-pattern-input" class="cf2-input-label">パターン（正規表現）</label>
              <input type="text" id="cf2-pattern-input" class="cf2-text-input" placeholder="例: 荒らし|スパム">
            </div>
            <div class="cf2-input-group">
              <label for="cf2-flags-input" class="cf2-input-label">フラグ</label>
              <input type="text" id="cf2-flags-input" class="cf2-text-input" value="gi" placeholder="gi">
            </div>
          </div>

          <!-- ユーザーIDルール入力 -->
          <div id="cf2-userid-inputs" class="cf2-rule-inputs cf2-hidden">
            <div class="cf2-input-group">
              <label for="cf2-userid-input" class="cf2-input-label">ユーザーID</label>
              <input type="text" id="cf2-userid-input" class="cf2-text-input" placeholder="例: nvc:AbCdEfgHiJkLMn">
            </div>
          </div>

          <!-- アクション設定 -->
          <div class="cf2-input-group">
            <label class="cf2-input-label">アクション</label>
            <div class="cf2-radio-group">
              <label class="cf2-radio-label">
                <input type="radio" name="cf2-action-type" value="hide" checked>
                <span>非表示</span>
              </label>
              <label class="cf2-radio-label" id="cf2-replace-action-label">
                <input type="radio" name="cf2-action-type" value="replace">
                <span>置換</span>
              </label>
              <label class="cf2-radio-label">
                <input type="radio" name="cf2-action-type" value="unspecified">
                <span>除外のみ</span>
              </label>
            </div>
            <div class="cf2-help-text" id="cf2-userid-action-note" style="display: none;">
              <strong>注意:</strong> ユーザーIDルールでは「非表示」と「除外のみ」のみ利用可能です。「除外のみ」はニコる数条件と組み合わせて使用します。
            </div>
          </div>

          <!-- 置換テキスト -->
          <div id="cf2-replace-input-group" class="cf2-input-group cf2-hidden">
            <label for="cf2-replace-input" class="cf2-input-label">置換テキスト</label>
            <input type="text" id="cf2-replace-input" class="cf2-text-input" placeholder="例: ****">
          </div>

          <!-- SMID設定 -->
          <div class="cf2-input-group">
            <label for="cf2-smid-input" class="cf2-input-label">対象動画（SMID）</label>
            <input type="text" id="cf2-smid-input" class="cf2-text-input" value="ALL" placeholder="ALL または sm12345678">
            <div class="cf2-help-text">ALLで全動画、特定のSMIDで個別動画を指定</div>
          </div>

          <!-- ニコる数条件 -->
          <div class="cf2-input-group">
            <label class="cf2-input-label">ニコる数条件</label>
            <div class="cf2-toggle-container">
              <div class="cf2-toggle-label">
                <span>条件を設定する</span>
              </div>
              <div id="cf2-nicoru-toggle" class="cf2-toggle">
                <div class="cf2-toggle-slider"></div>
              </div>
            </div>
          </div>

          <!-- ニコる数詳細設定 -->
          <div id="cf2-nicoru-details" class="cf2-nicoru-settings cf2-hidden">
            <div class="cf2-input-row">
              <select id="cf2-nicoru-op" class="cf2-select">
                <option value=">=">&gt;= 以上</option>
                <option value="<=">&lt;= 以下</option>
                <option value=">">&gt; より大きい</option>
                <option value="<">&lt; より小さい</option>
                <option value="=">=  等しい</option>
              </select>
              <input type="number" id="cf2-nicoru-value" class="cf2-number-input" value="10" min="0">
              <select id="cf2-nicoru-mode" class="cf2-select">
                <option value="exclude">条件に合致したら除外</option>
                <option value="include">条件に合致したら対象</option>
              </select>
            </div>
          </div>

          <!-- 追加ボタン -->
          <div class="cf2-button-group">
            <button id="cf2-add-rule" class="cf2-button cf2-button-primary">
              ${getIconSVG(ICONS.check)}
              <span>ルール追加</span>
            </button>
            <button id="cf2-clear-form" class="cf2-button cf2-button-secondary">
              ${getIconSVG(ICONS.clear)}
              <span>フォームクリア</span>
            </button>
          </div>
        </div>

        <!-- JSON直接編集セクション -->
        <div id="cf2-json-section" class="cf2-card cf2-main-card cf2-hidden">
          <div class="cf2-section-header">
            ${getIconSVG(ICONS.comment)}
            <div class="cf2-section-title">JSON Lines編集</div>
          </div>
          <div class="cf2-help-text">
            ${getIconSVG(ICONS.push_pin)} JSON Lines形式: 1行に1つのルールをJSONで記述
          </div>
          <div class="cf2-textarea-container">
            <textarea 
              id="cf2-json-textarea" 
              class="cf2-textarea"
              placeholder='{"pattern": "荒らし", "action": {"type": "hide"}, "smid": ["ALL"]}&#10;{"userId": "nvc:AbCdEfgHiJkLMn", "action": {"type": "hide"}, "smid": ["ALL"]}'
            ></textarea>
          </div>
          
          <div class="cf2-button-group">
            <button id="cf2-save-json-rules" class="cf2-button cf2-button-primary">
              ${getIconSVG(ICONS.save)}
              <span>JSON保存</span>
            </button>
            <button id="cf2-validate-json" class="cf2-button cf2-button-secondary">
              ${getIconSVG(ICONS.check)}
              <span>JSON検証</span>
            </button>
          </div>
        </div>

      </div>

      <!-- 右カラム：ルール一覧 -->
      <div class="cf2-right-column">
        <!-- ルール一覧表示 -->
        <div class="cf2-card cf2-rules-list-card">
          <div class="cf2-section-header">
            ${getIconSVG(ICONS.visibility)}
            <div class="cf2-section-title">現在のルール一覧</div>
            <div class="cf2-rule-count">
              <span id="cf2-rule-count-text">0件</span>
            </div>
          </div>
          
          <div class="cf2-rules-controls">
            <button id="cf2-refresh-rules" class="cf2-button cf2-button-secondary">
              ${getIconSVG(ICONS.refresh)}
              <span>更新</span>
            </button>
            <button id="cf2-clear-all-rules" class="cf2-button cf2-button-danger">
              ${getIconSVG(ICONS.delete)}
              <span>全削除</span>
            </button>
          </div>

          <div id="cf2-rules-list" class="cf2-rules-list">
            <!-- ルール一覧がここに動的に挿入される -->
          </div>
        </div>
        <!-- データ管理 -->
        <div class="cf2-card cf2-data-card">
          <div class="cf2-section-header">
            ${getIconSVG(ICONS.folder)}
            <div class="cf2-section-title">データ管理</div>
          </div>
          <div class="cf2-button-group">
            <button id="cf2-export-json-btn" class="cf2-button cf2-button-secondary">
              ${getIconSVG(ICONS.export)}
              <span>エクスポート</span>
            </button>
            <button id="cf2-import-btn" class="cf2-button cf2-button-secondary">
              ${getIconSVG(ICONS.import)}
              <span>インポート</span>
            </button>
            <button id="cf2-legacy-import-btn" class="cf2-button cf2-button-warning" title="CommentFilter（旧バージョン）の設定ファイルをインポートします">
              ${getIconSVG(ICONS.warning)}
              <span>レガシーインポート</span>
            </button>
          </div>
          <input type="file" id="cf2-file-input" class="cf2-file-input" accept=".json,.jsonl,.csv">
          <input type="file" id="cf2-legacy-file-input" class="cf2-file-input" accept=".json">
        </div>
      </div>
    </div>

    <!-- 設定セクション（全幅） -->
    <div class="cf2-settings-section">
      <!-- デバッグモード -->
      <div class="cf2-card cf2-debug-card">
        <div class="cf2-toggle-container">
          <div class="cf2-toggle-label">
            ${getIconSVG(ICONS.debug)}
            <span>デバッグモード</span>
          </div>
          <div id="cf2-debug-toggle" class="cf2-toggle">
            <div class="cf2-toggle-slider"></div>
          </div>
        </div>
      </div>

      <!-- ログ送信設定 -->
      <div class="cf2-card cf2-log-card">
        <div class="cf2-toggle-container">
          <div class="cf2-toggle-label" title="CommentFilterLogger.javaにフィルターログを送信する機能を有効/無効にします">
            ${getIconSVG(ICONS.info)}
            <span>ログ送信</span>
          </div>
          <div id="cf2-log-toggle" class="cf2-toggle active">
            <div class="cf2-toggle-slider"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- デバッグ情報（全幅） -->
    <div id="cf2-debug-section" class="cf2-debug-section cf2-collapsed">
      <div class="cf2-card">
        <div class="cf2-section-header">
          ${getIconSVG(ICONS.info)}
          <div class="cf2-section-title">デバッグ情報</div>
        </div>
        <div id="cf2-debug-info" class="cf2-debug-info">
          デバッグモードが無効です
        </div>
      </div>
    </div>

    <!-- 再読み込みボタン（全幅） -->
    <div class="cf2-reload-section">
      <button id="cf2-reload-btn" class="cf2-button cf2-button-primary cf2-reload-button">
        ${getIconSVG(ICONS.refresh)}
        <span>再読み込みして適用</span>
      </button>
    </div>
  </div>
</div>
`.trim();

/**
 * UIエレメントのIDマップ
 */
export const UI_ELEMENTS = {
  CONTAINER: "cf2-container",
  CLOSE_BTN: "cf2-close-btn",
  CONTENT: "cf2-content",
  MAIN_TOGGLE: "cf2-main-toggle",
  STATUS_INDICATOR: "cf2-status-indicator",
  STATUS_TEXT: "cf2-status-text",

  // 形式切替
  FORMAT_FORM: "cf2-format-form",
  FORMAT_JSON: "cf2-format-json",

  // フォーム入力
  FORM_SECTION: "cf2-form-section",
  PATTERN_INPUT: "cf2-pattern-input",
  FLAGS_INPUT: "cf2-flags-input",
  USERID_INPUT: "cf2-userid-input",
  REPLACE_INPUT: "cf2-replace-input",
  SMID_INPUT: "cf2-smid-input",
  NICORU_TOGGLE: "cf2-nicoru-toggle",
  NICORU_OP: "cf2-nicoru-op",
  NICORU_VALUE: "cf2-nicoru-value",
  NICORU_MODE: "cf2-nicoru-mode",
  ADD_RULE: "cf2-add-rule",
  CLEAR_FORM: "cf2-clear-form",

  // JSON編集
  JSON_SECTION: "cf2-json-section",
  JSON_TEXTAREA: "cf2-json-textarea",
  SAVE_JSON_RULES: "cf2-save-json-rules",
  VALIDATE_JSON: "cf2-validate-json",

  // ルール一覧
  RULES_LIST: "cf2-rules-list",
  RULE_COUNT_TEXT: "cf2-rule-count-text",
  REFRESH_RULES: "cf2-refresh-rules",
  CLEAR_ALL_RULES: "cf2-clear-all-rules",

  // データ管理
  EXPORT_JSON_BTN: "cf2-export-json-btn",
  IMPORT_BTN: "cf2-import-btn",
  LEGACY_IMPORT_BTN: "cf2-legacy-import-btn",
  FILE_INPUT: "cf2-file-input",
  LEGACY_FILE_INPUT: "cf2-legacy-file-input",

  // その他
  DEBUG_TOGGLE: "cf2-debug-toggle",
  LOG_TOGGLE: "cf2-log-toggle",
  DEBUG_SECTION: "cf2-debug-section",
  DEBUG_INFO: "cf2-debug-info",
  COMMAND_SETTINGS_SECTION: "cf2-command-settings-section",
  OWNER_COMMANDS: "cf2-owner-commands",
  MAIN_COMMANDS: "cf2-main-commands",
  EASY_COMMANDS: "cf2-easy-commands",
  SAVE_COMMANDS_BTN: "cf2-save-commands",
  RESET_COMMANDS_BTN: "cf2-reset-commands",
  RELOAD_BTN: "cf2-reload-btn",
} as const;

/**
 * CSSクラス名のマップ
 */
export const CSS_CLASSES = {
  CONTAINER: "cf2-container",
  TOGGLE_ACTIVE: "active",
  COLLAPSED: "cf2-collapsed",
  HIDDEN: "cf2-hidden",
  STATUS_ACTIVE: "cf2-status-indicator active",
  STATUS_ERROR: "cf2-status-indicator error",
  MINIMIZED: "cf2-minimized",
  COMMAND_INPUT: "cf2-command-input",
} as const;
