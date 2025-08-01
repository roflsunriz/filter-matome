import { ProgressManager } from './managers/progress-manager.js';
import { EventManager } from './managers/event-manager.js';
import { LoadDataFromMemory } from './loaders/load-data-from-memory.js';
import { UIBuilder } from './builders/ui-builder.js';
import { EventCoordinator } from './coordinators/event-coordinator.js';
import { cacheListStyles } from './styles/styles.js';

// 初期化関数の簡素化
async function initializeList(): Promise<void> {
  const progressManager = new ProgressManager();
  const eventManager = new EventManager();
  const dataLoader = new LoadDataFromMemory(progressManager);
  const uiBuilder = new UIBuilder(dataLoader, eventManager, progressManager);
  //@ts-ignore
  const _eventCoordinator = new EventCoordinator(uiBuilder, eventManager, progressManager);

  // 直接メモリから読み込み
  await uiBuilder.renderAllEntries();
}

window.addEventListener("load", ()=>{
  const style = document.createElement('style');
  style.textContent = cacheListStyles;
  document.head.appendChild(style);
  initializeList();
});