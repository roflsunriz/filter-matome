interface EmergencyBackupOptions {
  storageKeyPrefix: string;
  reason: string;
  logLabel: string;
}

export async function saveIndexedDBEmergencyBackup(
  db: IDBDatabase,
  options: EmergencyBackupOptions,
): Promise<void> {
  try {
    const storeNames = Array.from(db.objectStoreNames);
    const data: Record<string, unknown[]> = {};
    for (const storeName of storeNames) {
      try {
        const transaction = db.transaction([storeName], "readonly");
        const store = transaction.objectStore(storeName);
        data[storeName] = await new Promise<unknown[]>((resolve, reject) => {
          const request = store.getAll();
          request.onsuccess = () => resolve(request.result as unknown[]);
          request.onerror = () =>
            reject(
              request.error instanceof Error
                ? request.error
                : new Error(String(request.error)),
            );
        });
      } catch (storeError) {
        window.logger?.warn(
          `[${options.logLabel}] Emergency backup skipped store ${storeName}:`,
          storeError,
        );
      }
    }

    const backupKey = `${options.storageKeyPrefix}-${Date.now()}`;
    localStorage.setItem(
      backupKey,
      JSON.stringify({
        version: db.version,
        timestamp: new Date().toISOString(),
        reason: options.reason,
        data,
      }),
    );
    window.logger?.warn(
      `[${options.logLabel}] IndexedDB再作成前の緊急バックアップを保存しました: ${backupKey}`,
    );
  } catch (backupError) {
    window.logger?.error(
      `[${options.logLabel}] IndexedDB再作成前の緊急バックアップに失敗しました:`,
      backupError,
    );
  }
}
