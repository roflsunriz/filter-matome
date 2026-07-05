import { createMaterialIcon } from "@/common/material-icons";

export const playbackTemplate = `
<div class="playback-content">
  <div class="tracker-control">
    <span class="time-label">00:00 / 00:00</span>
    <div class="tracker-container">
      <input type="range" min="0" max="100" value="0" class="tracker-range">
      <div class="time-tip">00:00</div>
    </div>
  </div>

  <!-- コメントヒートマップ -->
  <div class="heatmap-container" data-heatmap-mode="off">
    <canvas class="heatmap-canvas"></canvas>
    <div class="heatmap-placeholder heatmap-placeholder-off">
      <span class="heatmap-placeholder-title">コメントヒートマップ</span>
      <span class="heatmap-placeholder-text">OFF: モジュール設定から表示できます</span>
    </div>
    <div class="heatmap-placeholder heatmap-placeholder-overlay">
      <span class="heatmap-placeholder-title">コメントヒートマップ</span>
      <span class="heatmap-placeholder-text">動画上にオーバーレイ表示中です</span>
    </div>
    <div class="heatmap-tooltip">00:00 - 0 コメント</div>
  </div>

<div class="control-grid">
      <button class="control-btn">${createMaterialIcon("skip_previous", { style: "outlined", color: "white" })}</button>
    <button class="control-btn play-pause-btn" data-playing="false">${createMaterialIcon("play_arrow", { style: "outlined", color: "white" })}</button>
    <button class="control-btn">${createMaterialIcon("skip_next", { style: "outlined", color: "white" })}</button>
    <button class="control-btn">${createMaterialIcon("repeat", { style: "outlined", color: "white" })}</button>
</div>

<div class="seek-controls">
  <div class="seek-input">
    <input type="number" min="1" max="60" value="10" class="seek-value">
    <span>秒</span>
  </div>
      <button class="seek-btn" data-seek="-1">${createMaterialIcon("fast_rewind", { style: "outlined", color: "white" })}</button>
    <button class="seek-btn" data-seek="+1">${createMaterialIcon("fast_forward", { style: "outlined", color: "white" })}</button>
</div>

  <div class="x-sec-jump-wrapper">
    <div class="x-sec-jump-container minus-row">
      <button class="x-sec-jump-btn" data-jump-seconds="-60">-60秒</button>
      <button class="x-sec-jump-btn" data-jump-seconds="-30">-30秒</button>
      <button class="x-sec-jump-btn" data-jump-seconds="-10">-10秒</button>
      <button class="x-sec-jump-btn" data-jump-seconds="-5">-5秒</button>
    </div>
    <div class="x-sec-jump-container plus-row">
      <button class="x-sec-jump-btn" data-jump-seconds="5">+5秒</button>
      <button class="x-sec-jump-btn" data-jump-seconds="10">+10秒</button>
      <button class="x-sec-jump-btn" data-jump-seconds="30">+30秒</button>
      <button class="x-sec-jump-btn" data-jump-seconds="60">+60秒</button>
    </div>
  </div>
</div>
`;
