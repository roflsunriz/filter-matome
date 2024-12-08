class CustomMylist2DB {
    constructor() {
        this.dbName = 'CustomMylist2DB';
        this.version = 3;
    }

    async initDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // マイリストストア
                if (!db.objectStoreNames.contains('mylists')) {
                    const mylistStore = db.createObjectStore('mylists', { 
                        keyPath: 'id', 
                        autoIncrement: true 
                    });
                    mylistStore.createIndex('name', 'name', { unique: false });
                    mylistStore.createIndex('sortOrder', 'sortOrder', { unique: false });
                    mylistStore.createIndex('createdAt', 'createdAt', { unique: false });
                }

                // 動画ストア
                if (!db.objectStoreNames.contains('videos')) {
                    const videoStore = db.createObjectStore('videos', { 
                        keyPath: 'id' 
                    });
                    videoStore.createIndex('mylistId', 'mylistId', { unique: false });
                    videoStore.createIndex('originalId', 'originalId', { unique: false });
                    videoStore.createIndex('title', 'title', { unique: false });
                    videoStore.createIndex('viewCount', 'viewCount', { unique: false });
                    videoStore.createIndex('commentCount', 'commentCount', { unique: false });
                    videoStore.createIndex('mylistCount', 'mylistCount', { unique: false });
                    videoStore.createIndex('addedAt', 'addedAt', { unique: false });
                    videoStore.createIndex('thumbnailUrl', 'thumbnailUrl', { unique: false });
                    videoStore.createIndex('uploadedAt', 'uploadedAt', { unique: false });
                    videoStore.createIndex('authorName', 'authorName', { unique: false });
                }
            };

            request.onsuccess = (event) => {
                resolve(event.target.result);
            };

            request.onerror = (event) => {
                reject(event.target.error);
            };
        });
    }
} 