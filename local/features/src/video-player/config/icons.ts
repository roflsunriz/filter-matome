import { PlayerIconKey } from '@/types/video-types.js';
import { createMaterialIcon, ICONS } from '@/common/material-icons';

// マテリアルアイコンを使用したアイコン定義
export const PLAYER_ICONS: Record<PlayerIconKey, string> = {
  play: createMaterialIcon(ICONS.play, { style: 'outlined', color: 'white' }),
  pause: createMaterialIcon(ICONS.pause, { style: 'outlined', color: 'white' }),
  volume: createMaterialIcon(ICONS.volume_up, { style: 'outlined', color: 'white' }),
  muted: createMaterialIcon(ICONS.volume_off, { style: 'outlined', color: 'white' }),
  rewind10: createMaterialIcon('replay_10', { style: 'outlined', color: 'white' }),
  forward10: createMaterialIcon('forward_10', { style: 'outlined', color: 'white' }),
  comment: createMaterialIcon(ICONS.comment, { style: 'outlined', color: 'white' }),
  commentOff: createMaterialIcon(ICONS.comment, { style: 'outlined', color: 'white', classes: 'comment-off' }),
  fullscreen: createMaterialIcon(ICONS.fullscreen, { style: 'outlined', color: 'white' }),
  exitFullscreen: createMaterialIcon(ICONS.fullscreen_exit, { style: 'outlined', color: 'white' }),
  settings: createMaterialIcon(ICONS.settings, { style: 'outlined', color: 'white' })
}; 