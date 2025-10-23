import { createMaterialIcon } from "@/common/material-icons";

export const volumeTemplate = `
<div class="range-control">
  <label>音量: <span class="volume-label">0.50</span></label>
  <input type="range" min="0" max="1" step="0.01" value="0.5" class="volume-range">
</div>

<div class="control-grid">
  <button class="control-btn">${createMaterialIcon("volume_off", { style: "outlined", color: "white" })}</button>
  <button class="control-btn">${createMaterialIcon("volume_down", { style: "outlined", color: "white" })}</button>
  <button class="control-btn">${createMaterialIcon("volume_up", { style: "outlined", color: "white" })}</button>
</div>

<div class="control-grid volume-presets">
  <button class="volume-preset" data-volume="0.1">10%</button>
  <button class="volume-preset" data-volume="0.25">25%</button>
  <button class="volume-preset" data-volume="0.5">50%</button>
  <button class="volume-preset" data-volume="0.75">75%</button>
  <button class="volume-preset" data-volume="1">100%</button>
</div>
`;
