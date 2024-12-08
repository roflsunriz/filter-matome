import { CommentFilter_DEBUG_MODE } from './config.js';
import { db } from "./database.js";
import { validateSetting, asyncErrorHandler, settingsFormatter, createDebugMessage } from "../lib/util.js";
import { COMMENT_FILTER_STYLES } from './styles/CommentFilterUIStyles.js';

// クラス定義の前に追加
if (CommentFilter_DEBUG_MODE) console.log("CommentFilterUI.js loaded");

// サニタイズ関数を追加
function sanitizeUserId(userId) {
  // ユーザーID用の正規表現パターン（数字、アルファベット、:、_、-のみ許可）
  const userIdPattern = /^[0-9a-zA-Z:_-]+$/;
  return userIdPattern.test(userId) ? userId : '';
}

function sanitizeVideoId(videoId) {
  // 動画ID用の正規表現パターン（小文字アルファベット2文字 + 数字）
  const videoIdPattern = /^[a-z]{2}\d+$/;
  return videoIdPattern.test(videoId) ? videoId : '';
}

function sanitizeCommandString(commandStr) {
  // 許可されているコマンドのリスト
  const allowedCommands = [
    // サイズ
    'big', 'medium', 'small',
    // フォント
    'defont', 'gothic', 'mincho',
    // 位置
    'ue', 'naka', 'shita',
    // 色（通常）
    'white', 'red', 'pink', 'orange', 'yellow', 'green', 'cyan', 'blue', 'purple', 'black',
    // 色（プレミアム）
    'white2', 'red2', 'pink2', 'orange2', 'yellow2', 'green2', 'cyan2', 'blue2', 'purple2', 'black2',
    // 特殊
    '_live', 'invisible', 'full', 'ender', 'patissier', 'ca'
  ];

  // カラーコードの正規表現パターン
  const colorCodePattern = /^#[0-9A-Fa-f]{6}$/;

  // コマンド文字列を配列に分割
  const commands = commandStr.split(',')
    .map(cmd => cmd.trim())
    .filter(cmd => {
      // 空のコマンドを除外
      if (!cmd) return false;
      // 許可されているコマンドか、正しい形式のカラーコードならtrue
      return allowedCommands.includes(cmd) || colorCodePattern.test(cmd);
    });

  // 重複を除去して、カンマで結合
  return [...new Set(commands)].join(',');
}

export class CommentFilterUI {
  constructor() {
    if (CommentFilter_DEBUG_MODE) console.log('CommentFilterUI instance created');
    this.title = 'CommentFilter 設定';
    this.configFields = this.initConfigFields();
    this.dialog = null;
    this.settings = { DEBUG: false };
  }

  initConfigFields() {
    return {
      DEBUG: {
        label: this.createBalloon(1, "デバッグモード", "デバッグ表示", "フィルタリングされたコメントの詳細情報を表示します"),
        type: "checkbox",
        default: false,
      },
      lotOfNicorare: {
        label: this.createBalloon(2, "ニコられ除外", "ニコられコメントの除外", "ニコられ数が3以上のコメントを除外します"),
        type: "checkbox",
        default: true,
      },
      filterMode: {
        label: this.createBalloon(
          3,
          "フィルターモード",
          "フィルタリング方式",
          "ブラックリスト: NGワードに一致するコメントを非表示<br />ホワイトリスト: OKワードに一致するコメントのみ表示<br />非表示: フィルタされたコメントを動画終了時に表示"
        ),
        type: "radio",
        options: {
          BlackList: "ブラックリスト",
          WhiteList: "ホワイトリスト",
          Invisible: "非表示",
        },
        default: "BlackList",
      },
      NGWord: {
        label: this.createBalloon(4, 'NGワード', 'NGワード設定', 
          '非表示にするコメントのキーワードを指定します<br />1行に1つのワードを入力<br />部分一致で判定します'),
        type: 'textarea',
        default: ''
      },
      NGRegex: {
        label: this.createBalloon(5, 'NG正規表現', 'NG正規表現設定', 
          '非表示にするコメントの正規表現を指定します<br />1行に1つのパターンを入力<br />例: ^.+さん$'),
        type: 'textarea',
        default: ''
      },
      OKWord: {
        label: this.createBalloon(6, 'OKワード', 'OKワード設定', 
          'ホワイトリストモード時に許可するワードを指定します<br />1行に1つのワードを入力<br />部分一致で判定します'),
        type: 'textarea',
        default: ''
      },
      OKRegex: {
        label: this.createBalloon(7, 'OK正規表現', 'OK正規表現設定', 
          'ホワイトリストモード時に許可する正規表現を指定します<br />1行に1つのパターンを入力<br />例: ^[wWｗＷ]+$'),
        type: 'textarea',
        default: ''
      },
      excludeMovieIds: {
        label: this.createBalloon(8, "除外動画ID", "フィルター除外動画", "フィルターを適用しない動画IDを指定します<br />1行に1つの動画IDを入力"),
        type: "textarea",
        default: "",
      },
      replaceRules: {
        label: this.createBalloon(9, "置換ルール", "コメント置換設定", "正規表現と置換後の文字列を=>で指定<br />例: ^.+犬=>猫"),
        type: "textarea",
        default: "",
      },
      excludeUserIds: {
        label: this.createBalloon(10, "除外ユーザー", "フィルター除外ユーザー", "フィルターを適用しないユーザーIDを指定します<br />1行に1つのユーザーIDを入力" + 'これが2番目に優先度が高い処理になっています<br />'),
        type: "textarea",
        default: "",
      },
      userIdFilters: {
        label: this.createBalloon(11, "NGユーザー", "NGユーザー設定", "コメントを非表示にするユーザーIDを指定します<br />1行に1つのユーザーIDを入力"),
        type: "textarea",
        default: "",
      },
      ownerCommands: {
        label: this.createBalloon(12, "投稿者コマンド", "投稿者コマンド設定", 
          "投稿者コメントに適用するコマンドをカンマ区切りで指定<br />例: red,big<br /><br />" +
          "許可されているコマンド:<br />" +
          "サイズ: big, medium, small<br />" +
          "フォント: defont, gothic, mincho<br />" +
          "位置: ue, naka, shita<br />" +
          "色: white, red, pink, orange, yellow, green, cyan, blue, purple, black<br />" +
          "プレミアム会員のみ: white2, red2, pink2, orange2, yellow2, green2, cyan2, blue2, purple2, black2<br />" +
          "特殊: _live, invisible, full, ender, patissier, ca<br />" +
          "カラーコード: #RRGGBB形式"),
        type: "text",
        default: "",
      },
      normalCommands: {
        label: this.createBalloon(13, "通常コマンド", "通常コマンド設定", 
          "通常コメントに適用するコマンドをカンマ区切りで指定<br />例: orange,naka<br /><br />" +
          "許可されているコマンド:<br />" +
          "サイズ: big, medium, small<br />" +
          "フォント: defont, gothic, mincho<br />" +
          "位置: ue, naka, shita<br />" +
          "色: white, red, pink, orange, yellow, green, cyan, blue, purple, black<br />" +
          "プレミアム会員のみ: white2, red2, pink2, orange2, yellow2, green2, cyan2, blue2, purple2, black2<br />" +
          "特殊: _live, invisible, full, ender, patissier, ca<br />" +
          "カラーコード: #RRGGBB形式"),
        type: "text",
        default: "",
      },
      easyCommands: {
        label: this.createBalloon(14, "簡単コマンド", "簡単コマンド設定", 
          "簡単コメントに適用するコマンドをカンマ区切りで指定<br />例: pink,small,_live<br /><br />" +
          "許可されているコマンド:<br />" +
          "サイズ: big, medium, small<br />" +
          "フォント: defont, gothic, mincho<br />" +
          "位置: ue, naka, shita<br />" +
          "色: white, red, pink, orange, yellow, green, cyan, blue, purple, black<br />" +
          "プレミアム会員のみ: white2, red2, pink2, orange2, yellow2, green2, cyan2, blue2, purple2, black2<br />" +
          "特殊: _live, invisible, full, ender, patissier, ca<br />" +
          "カラーコード: #RRGGBB形式"),
        type: "text",
        default: "",
      },
      superNgWords: {
        label: this.createBalloon(15, 'SuperNGワード', 'SuperNGワード設定', 
          '「ニコられ除外」がオンで、「ブラックリスト」または「非表示」モードの時のみ有効な特殊NGワード<br />' +
          'ニコられ数に関係なく非表示にするコメントのキーワードを指定します<br />' +
          'これが最上位の処理になっています<br />' +
          '1行に1つのワードを入力<br />' +
          '部分一致で判定します'),
        type: 'textarea',
        default: '',
        condition: (settings) => {
          return settings.lotOfNicorare && 
            (settings.filterMode === 'BlackList' || settings.filterMode === 'Invisible');
        }
      },
      superUserIdFilters: {
        label: this.createBalloon(16, 'SuperNGユーザー', 'SuperNGユーザー設定', 
          '「ニコられ除外」がオンで、「ブラックリスト」または「非表示」モードの時のみ有効な特殊NGユーザー<br />' +
          'ニコられ数に関係なく非表示にするユーザーIDを指定します<br />' +
          'これが最上位の処理になっています<br />' +
          '1行に1つのユーザーIDを入力'),
        type: 'textarea',
        default: '',
        condition: (settings) => {
          return settings.lotOfNicorare && 
            (settings.filterMode === 'BlackList' || settings.filterMode === 'Invisible');
        }
      },
      specificNgUsers: {
        label: this.createBalloon(17, '特定動画NGユーザー', '特定動画NGユーザー設定', 
          '特定の動画IDに対してのみNGユーザーを設定します<br />' +
          '1行に1つの設定を入力<br />' +
          '形式: 動画ID,NGユーザーID<br />' +
          '例: sm12345678,AbCdEfGhIjKlMnOpQrStUvWxYz_-'),
        type: 'textarea',
        default: '',
      },
      specificNgWords: {
        label: this.createBalloon(18, '特定動画NGワード', '特定動画NGワード設定', 
          '特定の動画IDに対してのみNGワードを設定します<br />' +
          '1行に1つの設定を入力<br />' +
          '形式: 動画ID,NGワード<br />' +
          '例: sm12345678,NGワード'),
        type: 'textarea',
        default: '',
      },
      superNgRegex: {
        label: this.createBalloon(16, 'SuperNG正規表現', 'SuperNG正規表現設定', 
          '「ニコられ除外」がオンで、「ブラックリスト」または「非表示」モードの時のみ有効な特殊NG正規表現<br />' +
          '1行に1つのパターンを入力<br />' +
          '例: ^.+さん$'),
        type: 'textarea',
        default: ''
      },
    };
  }

  createBalloon(index, title, heading, description) {
    return `
      <div class="balloon${index}oya">
        ${title}
        <span class="balloon${index}">
          <h3>${heading}</h3>
          <p>${description}</p>
        </span>
      </div>
    `;
  }

  async init() {
    try {
      await db.init();
      await this.loadSettings();
      this.setupStyles();
      if (CommentFilter_DEBUG_MODE) console.log('CommentFilterUI initialized');
    } catch (error) {
      console.error('設定UIの初期化中にエラーが発生しました:', error);
      throw error;
    }
  }

  async loadSettings() {
    try {
      for (const key in this.configFields) {
        let value;
        
        // モード設定の読み込み
        if (['DEBUG', 'filterMode', 'lotOfNicorare'].includes(key)) {
          value = await db.getMode(key);
          // settingsオブジェクトに値を設定
          this.settings[key] = value ?? this.configFields[key].default;
        }
        
        // コマンド設定の読み込み
        else if (key.endsWith('Commands')) {
          const type = key.replace('Commands', '').toLowerCase();
          value = await db.getCommands(type);
          // 文字列として取得したコマンドをそのまま設定
          this.configFields[key].value = value || '';
        }
        // ユーザーID関連の設定の読み込み
        else if (['userIdFilters', 'excludeUserIds'].includes(key)) {
          value = await db.getSetting(key);
          // 文字列や空の値を適切な配列に変換
          if (typeof value === 'string') {
            value = value.split('\n').filter(Boolean);
          }
          value = Array.isArray(value) ? value : [];
        }
        // その他の設定の読み込み
        else {
          value = await db.getSetting(key);
        }
        
        // 正規表現と置換ルールの表示形式変換
        if (value !== null && value !== undefined) {
          if (key === 'NGRegex' || key === 'OKRegex') {
            value = Array.isArray(value) 
              ? value.map(pattern => pattern instanceof RegExp ? pattern.source : pattern).join('\n')
              : value;
          }
          else if (key === 'replaceRules') {
            // replaceRulesの表示形式を修正
            if (Array.isArray(value)) {
              value = value
                .map(rule => {
                  if (typeof rule === 'string' && rule.includes(' => ')) {
                    return rule; // すでに "pattern => replacement" 形式の場合
                  }
                  // 配列形式 [pattern, replacement] の場合
                  if (Array.isArray(rule) && rule.length === 2) {
                    const [pattern, replacement] = rule;
                    return `${pattern instanceof RegExp ? pattern.source : pattern} => ${replacement}`;
                  }
                  return null;
                })
                .filter(Boolean)
                .join('\n');
            }
          }
        }

        if (CommentFilter_DEBUG_MODE) {
          console.log(`Loading setting for ${key}:`, value);
        }

        this.configFields[key].value = value ?? this.configFields[key].default;
        
        // DEBUGフラグの更新
        if (key === 'DEBUG') {
          this.settings.DEBUG = value ?? false;
        }
      }
      console.log('Settings loaded successfully');
    } catch (error) {
      console.error('設定の読み込み中にエラーが発生しました:', error);
      throw error;
    }
  }

  async open() {
    try {
      await this.init();
      if (this.dialog) this.close();
      
      this.dialog = this.createDialog();
      document.body.appendChild(this.dialog);
      
      // イベントリスナーの設定
      this.setupEventListeners();
      
      // フィールドの表示/非表示を初期化
      this.updateFieldVisibility();
      
      console.log('設定UIを開きました');
    } catch (error) {
      console.error('設定UIの表示中にエラーが発生しました:', error);
      throw error;
    }
  }

  close() {
    if (this.dialog && this.dialog.parentNode) {
      this.dialog.parentNode.removeChild(this.dialog);
      this.dialog = null;
      console.log('設定UIを閉じました');
    }
  }

  setupEventListeners() {
    if (!this.dialog) return;

    // 閉じるボタンのイベントリスナー
    const closeButton = this.dialog.querySelector('.comment-filter-close');
    if (closeButton) {
      closeButton.onclick = () => this.close();
    }

    // イアログ外クリックで閉じる
    this.dialog.onclick = (e) => {
      if (e.target === this.dialog) {
        this.close();
      }
    };

    // ESCキーで閉じる
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.dialog) {
        this.close();
      }
    });
  }

  createDialog() {
    const dialog = document.createElement('div');
    dialog.className = 'comment-filter-dialog';

    const content = document.createElement('div');
    content.className = 'comment-filter-content';

    content.appendChild(this.createHeader());
    content.appendChild(this.createFields());
    content.appendChild(this.createFooter());

    dialog.appendChild(content);
    return dialog;
  }

  createHeader() {
    const header = document.createElement('div');
    header.className = 'comment-filter-header';
    header.innerHTML = `
      <h2>
        ${this.title}
        <a href="https://www.nicovideo.jp/local/CustomFilters/CommentFilter/html/CommentFilterExp.html" 
           target="_blank" 
           style="font-size: 0.8em; margin-left: 10px; text-decoration: none;">
          <span title="設定の説明を表示">❔</span>
        </a>
      </h2>
      <div class="header-buttons">
        <button class="btn-export">エクスポート</button>
        <button class="btn-import">インポート</button>
        <button class="comment-filter-close">×</button>
      </div>
    `;

    // ボタンのイベントリスナー設定
    header.querySelector('.btn-export').onclick = () => this.exportSettings();
    header.querySelector('.btn-import').onclick = () => this.importSettings();

    return header;
  }

  createFields() {
    const fields = document.createElement('div');
    fields.className = 'comment-filter-fields';

    // configFieldsの各フィールドを作成
    for (const [key, field] of Object.entries(this.configFields)) {
      const fieldElement = this.createField(key, field);
      if (fieldElement) {
        fields.appendChild(fieldElement);
      } else {
        console.error(`Failed to create field element for ${key}`);
      }
    }

    return fields;
  }

  createField(key, field) {
    if (CommentFilter_DEBUG_MODE) console.log(`Creating field for: ${key}`, field);

    const wrapper = document.createElement('div');
    wrapper.className = 'comment-filter-field';
    wrapper.id = `field-${key}`;

    const label = document.createElement('label');
    label.innerHTML = field.label;
    wrapper.appendChild(label);

    let input;
    const inputId = `comment-filter-${key}`;

    switch (field.type) {
      case 'checkbox':
        input = document.createElement('input');
        input.type = 'checkbox';
        input.checked = field.value ?? field.default ?? false;
        break;
      case 'radio':
        const radioGroup = document.createElement('div');
        radioGroup.className = 'comment-filter-radio-group';

        Object.entries(field.options).forEach(([value, label]) => {
          const radioWrapper = document.createElement('label');
          radioWrapper.className = 'comment-filter-radio-label';

          const radio = document.createElement('input');
          radio.type = 'radio';
          radio.name = key;
          radio.value = value;
          radio.checked = value === (field.value ?? field.default);

          // フィルターモードの場合は即時保存を実装
          if (key === 'filterMode') {
            radio.addEventListener('change', async () => {
              if (radio.checked) {
                try {
                  await db.setMode(key, value);
                  this.configFields[key].value = value;
                  this.settings[key] = value;
                  this.updateFieldVisibility();
                  if (CommentFilter_DEBUG_MODE) {
                    console.log(`フィルターモードを保存しました: ${value}`);
                  }
                } catch (error) {
                  console.error('フィルターモードの保存に失敗:', error);
                  alert('フィルターモードの保存に失敗しました');
                }
              }
            });
          } else {
            // その他のラジオボタンは通常通り値の変更のみを記録
            radio.addEventListener('change', () => {
              if (radio.checked) {
                this.configFields[key].value = value;
              }
            });
          }

          radioWrapper.appendChild(radio);
          radioWrapper.appendChild(document.createTextNode(label));
          radioGroup.appendChild(radioWrapper);
        });

        return radioGroup;
      case 'textarea':
        input = document.createElement('textarea');
        input.value = Array.isArray(field.value) 
          ? field.value.join('\n')
          : field.value ?? field.default ?? '';
        input.rows = 4;
        break;
      default:
        input = document.createElement('input');
        input.type = field.type;
        input.value = field.value ?? field.default ?? '';
    }

    input.id = inputId;
    input.className = 'comment-filter-input';
    label.htmlFor = inputId;

    // 入力要素が作成された後、イベントを接続
    if (input) {
      this.attachInputEvents(input, key, field);
    }

    wrapper.appendChild(input);
    return wrapper;
  }

  attachInputEvents(input, key, field) {
    // 入力値の変更時の自動保存
    input.addEventListener('input', async () => {
      const newValue = input.type === 'checkbox' ? input.checked : input.value;
      this.configFields[key].value = newValue;
      try {
        await db.setSetting(key, newValue);
        if (CommentFilter_DEBUG_MODE) {
          console.log(`${key} を保存しました:`, newValue);
        }
      } catch (error) {
        console.error(`${key} の保存に失敗:`, error);
        alert(`${key} の保存に失敗しました`);
      }
    });

    // デバッグモード、フィルターモード、ニコられ除外の変更時の特別な処理
    if (key === 'DEBUG' || key === 'filterMode' || key === 'lotOfNicorare') {
      input.addEventListener('change', () => {
        if (key === 'DEBUG') {
          this.settings.DEBUG = input.checked;
        } else if (key === 'filterMode') {
          this.settings.filterMode = input.value;
        } else if (key === 'lotOfNicorare') {
          this.settings.lotOfNicorare = input.checked;
        }
        this.updateFieldVisibility();
      });
    }

    // フォーカス時のスタイル変更
    input.addEventListener('focus', () => {
      input.classList.add('comment-filter-input-focus');
    });

    input.addEventListener('blur', () => {
      input.classList.remove('comment-filter-input-focus');
    });
  }

  async exportSettings() {
    try {
      const settings = {};
      for (const key in this.configFields) {
        settings[key] = this.configFields[key].value;
      }
      
      // JSONファイルとしてダウンロード
      const blob = new Blob([settingsFormatter.stringify(settings, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'comment-filter-settings.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      if (CommentFilter_DEBUG_MODE) console.log('設定をエクスポートしました');
    } catch (error) {
      console.error(createDebugMessage("Export Error", { error: error.message }));
      alert("設定のエクスポート中にエラーが発生しました");
    }
  }

  async importSettings() {
    try {
      // ファイル選択用の input 要素を作成
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      
      input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = async (e) => {
          try {
            const json = e.target.result;
            const settings = settingsFormatter.parse(json);
            
            // レガシーデータの変換処理
            if (this.isLegacyFormat(settings)) {
              await this.importLegacySettings(settings);
            } else {
              await this.importModernSettings(settings);
            }
            
            this.updateUI();
            this.showImportNotification();
          } catch (error) {
            console.error('設定のインポート中にエラーが発生しました:', error);
            alert('設定のインポートに失敗しました');
          }
        };
        reader.readAsText(file);
      };
      
      input.click();
    } catch (error) {
      console.error(createDebugMessage("Import Error", { error: error.message }));
      alert("設定のインポートに失敗しました");
    }
  }

  isLegacyFormat(settings) {
    // レガシー形式かどうかを判定
    return 'cmd' in settings || 'NGWord' in settings && typeof settings.NGWord === 'string';
  }

  async importLegacySettings(legacy) {
    if (CommentFilter_DEBUG_MODE) console.log('レガシー設定インポート開始:', legacy);

    const settings = {
      DEBUG: legacy.DEBUG === 'true',
      lotOfNicorare: legacy.lotOfNicorare === 'true',
      filterMode: legacy.blackAndWhite === 'BlackList' ? 'BlackList' : 'WhiteList',
      ownerCommands: legacy.ownerCommands || '',
      easyCommands: legacy.easyCommands || '',
      normalCommands: legacy.normalCommands || '',
      excludeMovieIds: legacy.excludeMovieId ? legacy.excludeMovieId.split('\n') : [],
      NGRegex: [],
      OKRegex: [],
      replaceRules: [],
      userIdFilters: [],
      excludeUserIds: []
    };

    // NGWordの変換
    if (legacy.NGWord) {
      settings.NGRegex = legacy.NGWord.split('\n')
        .filter(line => line && !line.startsWith('@'))
        .map(pattern => pattern.trim());
    }

    // OKWordの変換
    if (legacy.OKWord) {
      settings.OKRegex = legacy.OKWord.split('\n')
        .filter(line => line && !line.startsWith('@'))
        .map(pattern => pattern.trim());
    }

    if (legacy.cmd) {
      const cmdLines = legacy.cmd.split('\n');
      
      for (const line of cmdLines) {
        if (!line.trim()) continue;

        // @replace@ 形式の置換ルール
        if (line.includes('@replace@')) {
          const [pattern, replacement] = line.split('@replace@');
          if (pattern && replacement) {
            settings.replaceRules.push(`${pattern.trim()} => ${replacement.trim()}`);
          }
        }
        // @smid_ng@ 形式のNGワード
        else if (line.includes('@smid_ng@')) {
          const word = line.split('@smid_ng@')[1]?.trim();
          if (word) {
            settings.NGRegex.push(word);
          }
        }
        // @smid_rep@ 形式の置換ルール
        else if (line.includes('@smid_rep@') && line.includes('@smid_reprep@')) {
          const [pattern, replacement] = line.split('@smid_rep@')[1]?.split('@smid_reprep@');
          if (pattern && replacement) {
            settings.replaceRules.push(`${pattern.trim()} => ${replacement.trim()}`);
          }
        }
        // @super_ng@ 形式のNGワード
        else if (line.includes('@super_ng@')) {
          const word = line.split('@super_ng@')[1]?.trim();
          if (word) {
            settings.NGRegex.push(word);
          }
        }
        // @super_user@ 形式のNGユーザー
        else if (line.includes('@super_user@')) {
          const userId = line.split('@super_user@')[1]?.trim();
          if (userId) {
            settings.userIdFilters.push(userId);
          }
        }
        // @userId@ 形式のNGユーザー
        else if (line.includes('@userId@')) {
          const userId = line.split('@userId@')[1]?.trim();
          if (userId) {
            settings.userIdFilters.push(userId);
          }
        }
        // @exclude@ 形式の除外ユーザー
        else if (line.includes('@exclude@')) {
          const userId = line.split('@exclude@')[1]?.trim();
          if (userId) {
            settings.excludeUserIds.push(userId);
          }
        }
      }

      // <smid>タグ付きの行の処理
      const smidLines = legacy.cmd.split('\n')
        .filter(line => line.startsWith('<smid>'));
      
      for (const line of smidLines) {
        if (line.includes('@smid_ng@')) {
          const word = line.split('@smid_ng@')[1]?.trim();
          if (word) {
            settings.NGRegex.push(word);
          }
        }
        else if (line.includes('@smid_rep@') && line.includes('@smid_reprep@')) {
          const parts = line.split('@smid_rep@')[1]?.split('@smid_reprep@');
          if (parts?.length === 2) {
            settings.replaceRules.push(`${parts[0].trim()} => ${parts[1].trim()}`);
          }
        }
      }
    }

    // 重複を除去
    settings.NGRegex = [...new Set(settings.NGRegex)];
    settings.OKRegex = [...new Set(settings.OKRegex)];
    settings.userIdFilters = [...new Set(settings.userIdFilters)];
    settings.excludeUserIds = [...new Set(settings.excludeUserIds)];
    settings.replaceRules = [...new Set(settings.replaceRules)];

    if (CommentFilter_DEBUG_MODE) {
      console.log('レガシー設定の変換結果:', {
        ...settings,
        NGRegexCount: settings.NGRegex.length,
        OKRegexCount: settings.OKRegex.length,
        replaceRulesCount: settings.replaceRules.length,
        userIdFiltersCount: settings.userIdFilters.length,
        excludeUserIdsCount: settings.excludeUserIds.length
      });
    }

    await this.importModernSettings(settings);
  }

  async importModernSettings(settings) {
    await asyncErrorHandler(async () => {
      for (const key in settings) {
        if (this.configFields[key]) {
          await db.setSetting(key, settings[key]);
          this.configFields[key].value = settings[key];
        }
      }
      this.updateUI();
    }, "設定のインポート中にエラーが発生しました");
  }

  updateUI() {
    for (const key in this.configFields) {
      const input = document.getElementById(`comment-filter-${key}`);
      if (!input) continue;

      const value = this.configFields[key].value;
      
      if (input.type === 'checkbox') {
        input.checked = value;
      } else if (input.type === 'radio') {
        const radio = document.querySelector(`input[name="${key}"][value="${value}"]`);
        if (radio) radio.checked = true;
      } else if (input.tagName === 'TEXTAREA') {
        input.value = Array.isArray(value) ? value.join('\n') : value;
      } else {
        input.value = value;
      }
    }
  }

  showSaveNotification() {
    const notification = document.createElement('div');
    notification.className = 'comment-filter-notification';
    notification.textContent = '設定を保存しました';
    document.body.appendChild(notification);

    setTimeout(() => {
      notification.remove();
    }, 2000);
  }

  showImportNotification() {
    window.cc?.Toast({
      mode: "success",
      middle: "設定をインポートしました",
      low: "反映するには再読み込みしてください",
      title: "CommentFilter",
      timeout: 5000,
    });
  }

  setupStyles() {
    const styleId = 'comment-filter-styles';
    
    // 既存のスタイル要素があれば削除
    const existingStyle = document.getElementById(styleId);
    if (existingStyle) {
      existingStyle.remove();
    }

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = COMMENT_FILTER_STYLES;
    document.head.appendChild(style);
  }

  createLabel(field, key) {
    const label = document.createElement("label");
    label.className = "comment-filter-label";
    label.innerHTML = field.label || key;
    return label;
  }

  createFooter() {
    const footer = document.createElement("div");
    footer.className = "comment-filter-footer";

    const saveButton = document.createElement("button");
    saveButton.textContent = "保存して更新";
    saveButton.onclick = () => this.saveAndReload();
    footer.appendChild(saveButton);

    return footer;
  }

  async saveAndReload() {
    try {
      await this.saveSettings();
      if (confirm("設定保存しました。ページを更新して変更反映しますか？")) {
        location.reload();
      }
    } catch (error) {
      console.error("設定の保存中にエラーが発生しました:", error);
      alert("設定の保存中にエラーが発生しました");
    }
  }

  async saveSettings() {
    try {
      if (CommentFilter_DEBUG_MODE) console.log('=== 設定の保存を開始 ===');

      for (const key in this.configFields) {
        const input = document.getElementById(`comment-filter-${key}`);
        if (!input) continue;

        let value;
        const fieldConfig = this.configFields[key];

        switch (fieldConfig.type) {
          case 'checkbox':
            value = input.checked;
            if (CommentFilter_DEBUG_MODE) console.log(`チェックボックス値: ${value}`);
            break;

          case 'radio':
            const radioGroup = document.querySelectorAll(`input[name="${key}"]`);
            const selectedRadio = Array.from(radioGroup).find(radio => radio.checked);
            value = selectedRadio ? selectedRadio.value : fieldConfig.default;
            if (CommentFilter_DEBUG_MODE) console.log(`ラジオ値: ${value}`);
            break;

          case 'textarea':
            const lines = input.value.split('\n').map(line => line.trim()).filter(Boolean);
            
            if (key === 'NGRegex' || key === 'OKRegex') {
              try {
                value = lines.map(pattern => new RegExp(pattern));
                if (CommentFilter_DEBUG_MODE) console.log(`正規表現パターン数: ${value.length}`);
              } catch (error) {
                console.error(`Invalid regex pattern in ${key}:`, error);
                throw new Error(`${key}に無効な正規表現パターンが含まれています`);
              }
            } else if (key === 'replaceRules') {
              try {
                value = lines.map(line => {
                  const [pattern, replacement] = line.split('=>').map(s => s.trim());
                  if (!pattern || replacement === undefined) {
                    throw new Error('置換ルールの形式が不正です（例: pattern => replacement）');
                  }
                  return [new RegExp(pattern), replacement];
                });
                if (CommentFilter_DEBUG_MODE) console.log(`置換ルール数: ${value.length}`);
              } catch (error) {
                console.error(`Invalid replace rule:`, error);
                throw new Error('置換ルールの形式が不正です（例: pattern => replacement）');
              }
            } else if (key === 'userIdFilters' || key === 'excludeUserIds') {
              value = lines.map(line => {
                const sanitizedId = sanitizeUserId(line);
                if (!sanitizedId && CommentFilter_DEBUG_MODE) {
                  console.warn(`Invalid user ID format: ${line}`);
                }
                return sanitizedId;
              }).filter(Boolean);
            } else if (key === 'excludeMovieIds') {
              value = lines.map(line => {
                const sanitizedId = sanitizeVideoId(line);
                if (!sanitizedId && CommentFilter_DEBUG_MODE) {
                  console.warn(`Invalid video ID format: ${line}`);
                }
                return sanitizedId;
              }).filter(Boolean);
            } else {
              value = lines;
            }
            break;

          case 'text':
            if (key.endsWith('Commands')) {
              if (CommentFilter_DEBUG_MODE) {
                console.log(`コマンド文字列をサニタイズ: ${input.value}`);
              }
              value = sanitizeCommandString(input.value);
              if (CommentFilter_DEBUG_MODE) {
                console.log(`サニタイズされたコマンド (${key}):`, value);
              }
            } else {
              value = input.value;
            }
            break;

          default:
            value = input.value;
            if (CommentFilter_DEBUG_MODE) console.log(`デフォルト値: ${value}`);
        }

        // 値の検証
        if (value === undefined || value === null) {
          console.warn(`${key}の値が未定義です。デフォルト値を使用します:`, fieldConfig.default);
          value = fieldConfig.default;
        }

        if (CommentFilter_DEBUG_MODE) console.log(`保存する値 (${key}):`, value);
        
        // モード設定の保存
        if (['DEBUG', 'filterMode', 'lotOfNicorare'].includes(key)) {
          try {
            if (CommentFilter_DEBUG_MODE) console.log(`モード設定を保存: ${key} = ${value}`);
            await db.setMode(key, value);
            if (CommentFilter_DEBUG_MODE) console.log(`✓ ${key} をmodesストアに保存しました`);
          } catch (error) {
            console.error(`✗ ${key} の保存に失敗:`, error);
            throw error;
          }
        }
        // コマンド設定の保存
        else if (key.endsWith('Commands')) {
          try {
            const type = key.replace('Commands', '').toLowerCase();
            if (CommentFilter_DEBUG_MODE) console.log(`コマンド設定を保存: ${type} = ${value}`);
            await db.setCommands(type, value);
            if (CommentFilter_DEBUG_MODE) console.log(`✓ ${type}コマンドをcommandsストアに保存しました`);
          } catch (error) {
            console.error(`✗ ${key} の保存に失敗:`, error);
            throw error;
          }
        }
        // その他の設定の保存
        else {
          try {
            await db.setSetting(key, value);
            if (CommentFilter_DEBUG_MODE) console.log(`✓ ${key} をsettingsストアに保存しました`);
          } catch (error) {
            console.error(`✗ ${key} の保存に失敗:`, error);
            throw error;
          }
        }

        this.configFields[key].value = value;

        // DEBUGフラグの更新
        if (key === 'DEBUG') {
          this.settings.DEBUG = value;
        }
      }

      if (CommentFilter_DEBUG_MODE) console.log('=== すべての設定を保存完了 ===');
      this.showSaveNotification();
      this.updateFieldVisibility();
    } catch (error) {
      console.error('設定の保存中にエラーが発生しました:', error);
      alert(error.message || '設定の保存中にエラーが発生しました');
      throw error;
    }
  }

  updateFieldVisibility() {
    for (const [key, field] of Object.entries(this.configFields)) {
      if (field.condition) {
        const element = document.getElementById(`field-${key}`);
        if (element) {
          const isVisible = field.condition(this.settings);
          element.style.display = isVisible ? 'flex' : 'none';
          
          const input = element.querySelector('.comment-filter-input');
          if (input) {
            input.disabled = !isVisible;
          }
          
          if (CommentFilter_DEBUG_MODE) {
            console.log(`Field visibility updated - ${key}: ${isVisible}`);
          }
        }
      }
    }
  }

  // UIを開く時に初期状態を設定
  async open() {
    try {
        await this.init();
        if (this.dialog) this.close();
        
        this.dialog = this.createDialog();
        document.body.appendChild(this.dialog);
        
        // イベントリスナーの設定
        this.setupEventListeners();
        
        // フィールドの表示/非表示を初期化
        this.updateFieldVisibility();
        
        console.log('設定UIを開きました');
    } catch (error) {
        console.error('設定UIの表示中にエラーが発生しました:', error);
        throw error;
    }
  }
}

export const ui = new CommentFilterUI();
