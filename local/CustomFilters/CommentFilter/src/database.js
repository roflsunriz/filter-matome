import {
    validateSetting,
    asyncErrorHandler,
    settingsFormatter,
    createDebugMessage
  } from '../lib/util.js';
  import { CommentFilter_DEBUG_MODE } from './config.js';

  console.log('database.js loaded');
  
  class CommentFilterDatabase {
    constructor() {
        console.log('CommentFilterDatabase instance created');
      this.dbName = 'CommentFilterDB';
      this.dbVersion = 4;
      this.db = null;
      this.stores = {
        settings: {
          name: 'settings',
          keyPath: 'key',
          indexes: [
            { name: 'value', unique: false }
          ]
        },
        modes: {
          name: 'modes',
          keyPath: 'key',
          indexes: [
            { name: 'value', unique: false }
          ]
        },
        commands: {
          name: 'commands',
          keyPath: 'type',
          indexes: [
            { name: 'normalizedCommands', unique: false }
          ]
        }
      };
    }
  
    async init() {
      return asyncErrorHandler(async () => {
        if (this.db) return;
        
        const db = await this.openDatabase();
        this.db = db;
        
        console.log(createDebugMessage('Database', {
          status: 'Initialized',
          version: this.dbVersion
        }));
      }, 'データベースの初期化中にエラーが発生しました');
    }
  
    openDatabase() {
      return new Promise((resolve, reject) => {
        const request = indexedDB.open(this.dbName, this.dbVersion);
  
        request.onerror = () => {
          console.error(createDebugMessage('Database Error', {
            error: request.error
          }));
          reject(request.error);
        };
        
        request.onsuccess = () => resolve(request.result);
        request.onupgradeneeded = (event) => this.handleUpgrade(event);
      });
    }
  
    handleUpgrade(event) {
      const db = event.target.result;
      const oldVersion = event.oldVersion;
      const transaction = event.target.transaction;
  
      // filtersストアの削除（version 1から2への移行時）
      if (oldVersion < 2 && db.objectStoreNames.contains('filters')) {
          db.deleteObjectStore('filters');
      }
  
      // 各ストアの作成
      for (const [_, store] of Object.entries(this.stores)) {
        if (!db.objectStoreNames.contains(store.name)) {
          const objectStore = db.createObjectStore(store.name, {
            keyPath: store.keyPath,
            autoIncrement: store.autoIncrement || false
          });
  
          // インデックスの作成
          store.indexes?.forEach(index => {
            objectStore.createIndex(index.name, index.name, {
              unique: index.unique || false
            });
          });
        }
      }
  
      // version 1から2への移行時のデータ移行
      if (oldVersion < 2) {
          // 既存のsettingsストアからデータを取得
          const settingsStore = transaction.objectStore('settings');
          const modesStore = transaction.objectStore('modes');
          const commandsStore = transaction.objectStore('commands');
  
          settingsStore.openCursor().onsuccess = (e) => {
              const cursor = e.target.result;
              if (cursor) {
                  const key = cursor.value.key;
                  const value = cursor.value.value;
  
                  // モード設定の移行
                  if (['DEBUG', 'filterMode', 'lotOfNicorare'].includes(key)) {
                      modesStore.put({ key, value });
                      cursor.delete(); // 古いデータを削除
                  }
                  // コマンド設定の移行
                  else if (key.endsWith('Commands')) {
                      const type = key.replace('Commands', '');
                      commandsStore.put({ type, commands: value });
                      cursor.delete(); // 古いデータを削除
                  }
                  cursor.continue();
              }
          };
      }
  
      // version 3から4への移行時のデータ移行
      if (oldVersion < 4) {
          if (db.objectStoreNames.contains('commands')) {
              db.deleteObjectStore('commands');
          }
          
          const commandsStore = db.createObjectStore('commands', {
              keyPath: 'type'
          });
          commandsStore.createIndex('normalizedCommands', 'normalizedCommands', {
              unique: false
          });
      }
    }
  
    async transaction(storeName, mode, callback) {
      return asyncErrorHandler(async () => {
        const tx = this.db.transaction(storeName, mode);
        const store = tx.objectStore(storeName);
        
        return new Promise((resolve, reject) => {
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
          
          callback(store);
        });
      }, `トランザクション実行中にエラーが発生しました (${storeName})`);
    }
  
    async getSetting(key) {
      return asyncErrorHandler(async () => {
        let result = null;
        
        await this.transaction('settings', 'readonly', store => {
          const request = store.get(key);
          request.onsuccess = () => {
            if (request.result) {
              // JSONとして保存されている場合の処理
              if (typeof request.result === 'string' && request.result.startsWith('{')) {
                try {
                  const parsed = JSON.parse(request.result);
                  result = parsed.value;
                  if(CommentFilter_DEBUG_MODE) console.log('getSetting(JSON):', result);
                } catch (e) {
                  if(CommentFilter_DEBUG_MODE) console.error('JSON parse error:', e);
                  result = request.result;
                  if(CommentFilter_DEBUG_MODE) console.log('getSetting(error):', result);
                }
              } else {
                result = request.result.value;
                if(CommentFilter_DEBUG_MODE) console.log('getSetting(else):', result);
              }
            }
          };
        });
  
        if (CommentFilter_DEBUG_MODE) {
          console.log(`Retrieved setting for ${key}:`, result);
        }
  
        // 配列として処理すべきキーのリスト
        const arrayKeys = ['replaceRules', 'userIdFilters', 'superNgWords', 'superUserIdFilters'];
        if (arrayKeys.includes(key)) {
          return validateSetting(result, [], 'array');
        }
  
        // 特定の動画IDに対する設定を配列として処理
        const specificKeys = ['specificNgUsers', 'specificNgWords'];
        if (specificKeys.includes(key)) {
          return validateSetting(result, [], 'array');
        }
  
        return validateSetting(result, null, 'string');
      }, '設定の取得中にエラーが発生しました');
    }
  
    async setSetting(key, value) {
      return asyncErrorHandler(async () => {
        await this.transaction('settings', 'readwrite', store => {
          store.put({ key, value });
        });
  
        console.log(createDebugMessage('Setting Saved', {
          key,
          value: typeof value === 'object' ? 'object' : value
        }));
      }, '設定の保存中にエラーが発生しました');
    }
  
    async getMultipleSettings(keys) {
      return asyncErrorHandler(async () => {
        const results = {};
        
        await Promise.all(keys.map(async key => {
          results[key] = await this.getSetting(key);
        }));
  
        return results;
      }, '複数設定の取得中にエラーが発生しました');
    }
  
    async setMultipleSettings(settings) {
      return asyncErrorHandler(async () => {
        await Promise.all(
          Object.entries(settings).map(([key, value]) => 
            this.setSetting(key, value)
          )
        );
      }, '複数設定の保存中にエラーが発生しました');
    }
  
    async getAllSettings() {
      return asyncErrorHandler(async () => {
        const settings = {};
        
        await this.transaction('settings', 'readonly', store => {
          store.openCursor().onsuccess = (event) => {
            const cursor = event.target.result;
            if (cursor) {
              settings[cursor.value.key] = cursor.value.value;
              cursor.continue();
            }
          };
        });
  
        return settings;
      }, '全設定の取得中にエラーが発生しました');
    }
  
    async clearStore(storeName) {
      return asyncErrorHandler(async () => {
        await this.transaction(storeName, 'readwrite', store => {
          store.clear();
        });
  
        console.log(createDebugMessage('Store Cleared', {
          store: storeName
        }));
      }, 'ストアのクリア中にエラーが発生しました');
    }
  
    async exportData() {
      return asyncErrorHandler(async () => {
        const data = {
          settings: await this.getAllSettings(),
          version: this.dbVersion
        };
        
        return settingsFormatter.stringify(data);
      }, 'データのエクスポート中にエラーが発生しました');
    }
  
    async importData(jsonData) {
      return asyncErrorHandler(async () => {
        const data = settingsFormatter.parse(jsonData);
        
        if (data.version !== this.dbVersion) {
          throw new Error('互換性のないバージョンです');
        }
  
        await this.clearStore('settings');
        await this.setMultipleSettings(data.settings);
  
        console.log(createDebugMessage('Data Imported', {
          settingsCount: Object.keys(data.settings).length
        }));
      }, 'データのインポート中にエラーが発生しました');
    }
  
    async deleteDatabase() {
      return asyncErrorHandler(async () => {
        if (this.db) {
          this.db.close();
          this.db = null;
        }
  
        await new Promise((resolve, reject) => {
          const request = indexedDB.deleteDatabase(this.dbName);
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        });
  
        console.log(createDebugMessage('Database', {
          status: 'Deleted',
          name: this.dbName
        }));
      }, 'データベースの削除中にエラーが発生しました');
    }
  
    async getMode(key) {
      return asyncErrorHandler(async () => {
        let result = null;
        await this.transaction('modes', 'readonly', store => {
          const request = store.get(key);
          request.onsuccess = () => {
            if (request.result) {
              // 文字列化されたJSONオブジェクトの場合はパースを試みる
              if (typeof request.result === 'string' && request.result.startsWith('{')) {
                try {
                  const parsed = JSON.parse(request.result);
                  result = parsed.value;
                } catch (e) {
                  result = request.result;
                }
              } else {
                result = request.result.value;
              }
            }
          };
        });
        
        if (CommentFilter_DEBUG_MODE) {
          console.log(`Retrieved mode for ${key}:`, result);
        }
        
        return validateSetting(result, null, 'string');
      }, 'モード設定の取得中にエラーが発生しました');
    }
  
    async setMode(key, value) {
      return asyncErrorHandler(async () => {
        // 値が既にオブジェクトの場合は、valueプロパティを取り出す
        if (typeof value === 'object' && value !== null && 'value' in value) {
          value = value.value;
        }
        
        await this.transaction('modes', 'readwrite', store => {
          store.put({ key, value });
        });

        if (CommentFilter_DEBUG_MODE) {
          console.log(`Mode setting saved - ${key}:`, value);
        }
      }, 'モード設定の保存中にエラーが発生しました');
    }
  
    async getCommands(type) {
      return asyncErrorHandler(async () => {
        let result = '';
        
        await this.transaction('commands', 'readonly', store => {
          const request = store.get(type);
          request.onsuccess = () => {
            if (request.result) {
              // 文字列として保存されているコマンドを取得
              result = request.result.normalizedCommands || '';
            }
            if (CommentFilter_DEBUG_MODE) {
              console.log('getCommands raw result:', request.result);
              console.log('getCommands parsed result:', result);
            }
          };
        });

        if (CommentFilter_DEBUG_MODE) {
          console.log(`Retrieved commands for type ${type}:`, result);
        }
        // 文字列をそのまま返す
        return result;
      }, 'コマンド設定の取得中にエラーが発生しました');
    }
  
    async setCommands(type, commands) {
      return asyncErrorHandler(async () => {
        // コマンドを文字列として保存
        const normalizedCommands = typeof commands === 'string' 
          ? commands 
          : Array.isArray(commands)
            ? commands.join(',')
            : '';
        
        await this.transaction('commands', 'readwrite', store => {
          store.put({type, normalizedCommands});
        });

        if (CommentFilter_DEBUG_MODE) {
          console.log(`Saved commands for type ${type}:`, normalizedCommands);
        }
      }, 'コマンド設定の保存中にエラーが発生しました');
    }
  }
  
  export const db = new CommentFilterDatabase();