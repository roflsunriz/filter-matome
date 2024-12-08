import { ASSETS } from '../../constants.js';
import { debugLog, debugError, debugWarn } from '../config.js';

export const template = `
<div id="PlaybackrateChangerContainer">
  <div id="MiniModeContainer">
    <div class="PlaybackrateChangerTab">
      <input title="tab 1" type="button" class="Tab Active" value="1" data-tab="PlayerControllContainer" />
      <input title="tab 2" type="button" class="Tab" value="2" data-tab="CommentSearchContainer" />
      <input title="tab 3" type="button" class="Tab" value="3" data-tab="MiscContainer" />
      <input id="Minimize" type="image" title="コントローラ縮小" class="MinExpand" src="${ASSETS.IMAGES.MINIMIZE}" />
    </div>

    <div class="ParentContainer">
      <!-- プレイヤーコントロール -->
      <div id="PlayerControllContainer" class="MainContainers Active">
        ${createPlayerControls()}
      </div>

      <!-- コメント検索 -->
      <div id="CommentSearchContainer" class="MainContainers">
        ${createCommentSearch()}
      </div>

      <!-- マイリスト -->
      <div id="MiscContainer" class="MainContainers">
        ${createMylistControls()}
      </div>

    </div>
  </div>

  <div id="MiniModeAlternativeContainer">
    <input title="元に戻す" id="Expand" type="image" class="MinExpand" src="${ASSETS.IMAGES.MAXIMIZE}" />
  </div>
</div>
`;

// プレイヤーコントロール部分のテンプレート
function createPlayerControls() {
  return `
    <div id="SeekArea">
      <span id="customSeek"></span>
      <select title="(秒)" id="SeekSelect">
        <optgroup label="自動で一時停止">
          ${createSeekOptions('auto')}
        </optgroup>
        <optgroup label="そのまま">
          ${createSeekOptions('normal')}
        </optgroup>
      </select>
      <input title="(秒)" type="button" class="SeekButton" value="-5" />
      <input title="再生・一時停止切替" type="image" id="PlayPauseToggleButton" src="${ASSETS.IMAGES.PAUSE}" />
      <input title="(秒)" type="button" class="SeekButton" value="+5" />
      <input title="コメントを同期させる" type="button" id="Sync" value="Sync" />
    </div>

    <div id="Tracker">
      <span style="pointer-events: none">Tracker</span>
      <label id="TrackerLabel">00:00/00:00</label><br />
      <input type="range" id="TrackerRange" />
      <div class="SeekBarTimeTip2">
        <span class="PlayTimeFormatter">00:00</span>
      </div>
    </div>

    ${createVolumeControls()}
    ${createPlaybackRateControls()}
  `;
}

// コメント検索部分のテンプレート
function createCommentSearch() {
  return `
    <div title="コメント検索" id="CommentSearchChildContainer">
      <p>Comment Search</p>
      <input title="クリア" type="button" id="InputClear" value="×" />
      <div id="CommentSearchBox">
        <input type="search" id="SearchInput" rows="1" cols="13" placeholder="入力して検索..." wrap="soft" />
      </div>
      <div id="CommentSearchOperation">
        <input title="検索開始" id="StartCommentSearch" type="image" class="flash" src="${ASSETS.IMAGES.FLASH}" />
        <input title="正規表現ヘルプ(Wikiを開く)" id="OpenRegExHelpPage" type="button" value="ヘルプ" />
        <input title="正規表現切替" id="RegExToggle" type="checkbox" />
        <p>正規表現</p>
        <input title="拡張" id="Extended" type="checkbox" />
        <p>拡張</p>
      </div>
      <div id="CommentSearchResultBox"></div>
    </div>
  `;
}

// 音量コントロール部分のテンプレート
function createVolumeControls() {
  return `
    <div title="音量" id="Volume">
      <span style="pointer-events: none">Volume</span>
      <label id="VolumeLabel">0</label><br />
      <input type="range" id="VolumeRange" min="0" max="1" step="0.01" />
      <span id="VolumePreset">
        <select id="VolumeSelect">
          ${createVolumeOptions()}
        </select>
        <span id="customVolume"></span>
      </span>
    </div>
  `;
}

// 再生速度コントロール部分のテンプレート
function createPlaybackRateControls() {
  return `
    <div title="再生速度" id="PlaybackrateRangeArea">
      <span style="pointer-events: none">Playbackrate</span>
      <label id="PlaybackrateLabel">1.00</label><br />
      <input type="range" id="PlaybackrateRange" min="0.01" max="2.00" value="1.00" step="0.01" />
      <span id="PlaybackratePreset">
        <select id="PlaybackrateSelect">
          ${createPlaybackRateOptions()}
        </select>
        <span id="customPlaybackrate"></span>
      </span>
      ${createPlaybackRatePresetButtons()}
    </div>
  `;
}

// その他のヘルパー関数
function createSeekOptions(type) {
  const values = type === 'auto' 
    ? [0.01, 0.05, 0.07, 0.10, 0.20, 0.30, 0.50, 0.70, 1.00]
    : [3, 5, 10, 15, 30, 45, 60, 75, 90];
  
  return values.map(value => 
    `<option value="${value}"${value === 5 ? ' selected="selected"' : ''}>${value}</option>`
  ).join('');
}

function createVolumeOptions() {
  const values = [0.01, 0.02, 0.05, 0.07, 0.10, 0.20, 0.30, 0.40, 0.50, 0.60, 0.70, 0.80, 0.90, 1.00];
  return values.map(value => 
    `<option value="${value}"${value === 0.01 ? ' selected="selected"' : ''}>${value}</option>`
  ).join('');
}

function createPlaybackRateOptions() {
  return `
    <optgroup label="0.01~2.00">
      ${createPlaybackRateOptionGroup(0.01, 2.00)}
    </optgroup>
    <optgroup label="2.25~5.00">
      ${createPlaybackRateOptionGroup(2.25, 5.00)}
    </optgroup>
    <optgroup label="5.25~10">
      ${createPlaybackRateOptionGroup(5.25, 10.00)}
    </optgroup>
    <optgroup label="20~200">
      ${[20, 30, 40, 50, 100, 200].map(value => 
        `<option value="${value}.00">x${value}</option>`
      ).join('')}
    </optgroup>
  `;
}

function createPlaybackRateOptionGroup(start, end) {
  const values = [];
  let current = start;
  
  while (current <= end) {
    values.push({
      value: current.toFixed(2),
      label: `x${current.toFixed(2)}`
    });
    
    // 増分の調整
    if (current < 1) {
      current += 0.25;
    } else if (current < 5) {
      current += 0.25;
    } else {
      current += 0.25;
    }
  }
  
  return values.map(({value, label}) => 
    `<option value="${value}"${value === "1.00" ? ' selected="selected"' : ''}>${label}</option>`
  ).join('');
}

function createPlaybackRatePresetButtons() {
  const presets = [
    // 低速プリセット
    [
      { value: '0.01', index: '0' },
      { value: '0.25', index: '5' },
      { value: '0.50', index: '6' },
      { value: '1.00', index: '8' }
    ],
    // 中速プリセット
    [
      { value: '1.11', index: '9' },
      { value: '1.25', index: '11' },
      { value: '1.50', index: '12' },
      { value: '1.75', index: '13' }
    ],
    // 高速プリセット
    [
      { value: '2.00', index: '14' },
      { value: '2.25', index: '15' },
      { value: '2.50', index: '16' },
      { value: '50.0', index: '50' }
    ]
  ];

  return presets.map(group => `
    <div>
      ${group.map(({value, index}) => `
        <input 
          type="button" 
          class="PlaybackratePresetButton" 
          value="${value}" 
          data-preset-index="${index}"
        />`
      ).join('')}
    </div>
  `).join('');
}

function createMylistControls() {
  return `
    <button id="CustomMylist2Button" class="VideoMenuButton" title="カスタムマイリスト2に追加">
      <svg version="1.0" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 512 512">
        <path d="M89.3 1.5C79.1 4.6 71.7 11.1 67.1 21l-2.6 5.5v459l2.6 5.6c3.7 7.9 9 13.3 16.7 17.1l6.7 3.3h331l6.7-3.3c7.7-3.8 13-9.2 16.7-17.1l2.6-5.6.3-148.8c.1-81.8 0-148.7-.3-148.7s-2 .8-3.8 1.7c-2.9 1.7-8.7 1.8-71.7 2.1-48.1.2-70.3 0-74.5-.8-14.4-2.7-28.6-13.1-35.2-25.6-6.4-12-6.4-12.1-6.1-88.7.3-63.7.4-69.5 2.1-72.4.9-1.8 1.7-3.4 1.7-3.8 0-.3-37.5-.5-83.2-.4-66 0-84.2.3-87.5 1.4z"/>
        <path d="M264.8 281.5c1.4 1 3.5 3.2 4.6 4.7 2 2.7 2.1 4 2.4 54.3l.3 51.6 12.2-12c13.1-13 15.5-14.3 23.4-12.8 4.9.9 10.9 6.9 11.8 11.8 1.7 8.8 1.6 9-28.3 38.9-23.9 23.9-28.2 27.8-31.5 28.3-8.8 1.7-9 1.6-38.9-28.3-29.9-29.9-30-30-28.3-38.9.9-4.9 6.9-10.9 11.8-11.8 7.9-1.5 10.3-.2 23.5 12.8l12.2 12.1v-50.1c0-33.1.4-51.1 1.1-53 1.4-3.7 4.7-7.2 8.4-8.9 4-1.9 11.9-1.2 15.3 1.3z"/>
      </svg>
      <span class="cml2-btn-text">マイリスト2</span>
    </button>
  `;
}