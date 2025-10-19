import { createMaterialIcon } from '@/common/material-icons';

export function panelTemplate(): string {
  return `
<button id="fab"></button>
<div class="panel">
  <nav>
    <button data-tab="playback" data-active>${createMaterialIcon('play_arrow', { style: 'outlined', classes: 'tab-icon', color: 'white' })}</button>
    <button data-tab="volume">${createMaterialIcon('volume_up', { style: 'outlined', classes: 'tab-icon', color: 'white' })}</button>
    <button data-tab="speed">${createMaterialIcon('speed', { style: 'outlined', classes: 'tab-icon', color: 'white' })}</button>
    <button data-tab="comments">${createMaterialIcon('comment', { style: 'outlined', classes: 'tab-icon', color: 'white' })}</button>
    <button data-tab="links">${createMaterialIcon('link', { style: 'outlined', classes: 'tab-icon', color: 'white' })}</button>
    <button data-tab="settings">${createMaterialIcon('settings', { style: 'outlined', classes: 'tab-icon', color: 'white' })}</button>
  </nav>

  <div id="playback" class="tab active">
    <!-- playback.htmlの内容がここに挿入されます -->
  </div>

  <div id="volume" class="tab">
    <!-- volume.htmlの内容がここに挿入されます -->
  </div>

  <div id="speed" class="tab">
    <!-- speed.htmlの内容がここに挿入されます -->
  </div>

  <div id="comments" class="tab">
    <!-- comments.htmlの内容がここに挿入されます -->
  </div>

  <div id="links" class="tab">
    <!-- links.htmlの内容がここに挿入されます -->
  </div>

  <div id="settings" class="tab">
    <!-- settings.htmlの内容がここに挿入されます -->
  </div>
</div>
`;
} 