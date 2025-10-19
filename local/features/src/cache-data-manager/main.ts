import { ProgressManager } from '@/cache-data-manager/managers/progress-manager.js';
import { EventManager } from '@/cache-data-manager/managers/event-manager.js';
import { LoadDataFromMemory } from '@/cache-data-manager/loaders/load-data-from-memory.js';
import { UIBuilder } from '@/cache-data-manager/builders/ui-builder.js';
import { EventCoordinator } from '@/cache-data-manager/coordinators/event-coordinator.js';
import { cacheListStyles } from '@/cache-data-manager/styles/styles.js';

// 初期化関数の簡素化
async function initializeList(): Promise<void> {
  const progressManager = new ProgressManager();
  const eventManager = new EventManager();
  const dataLoader = new LoadDataFromMemory(progressManager);
  const uiBuilder = new UIBuilder(dataLoader, eventManager, progressManager);
  // 初期化の副作用を目的として生成（未使用警告抑止）
  const _eventCoordinator = new EventCoordinator(uiBuilder, eventManager, progressManager);
  void _eventCoordinator;

  // 直接メモリから読み込み
  await uiBuilder.renderAllEntries();
}

window.addEventListener("load", () => {
  const style = document.createElement('style');
  style.textContent = cacheListStyles;
  document.head.appendChild(style);
  void initializeList();
});