class CustomMylist2Manager {
    constructor() {
        this.db = new CustomMylist2DB();
        this.apiCache = new Map();
        this.apiRequestQueue = [];
        this.isProcessingQueue = false;
        this.API_RATE_LIMIT = 200; // 1リクエスト/200ミリ秒
        this.API_REQUEST_LIMIT = 50; // API制限の追加
        this.apiRequestCount = 0;    // APIリクエスト回数のカウンター
    }

    async createMylist(name) {
        const db = await this.db.initDB();
        const transaction = db.transaction(['mylists'], 'readwrite');
        const store = transaction.objectStore('mylists');

        return new Promise((resolve, reject) => {
            const request = store.add({
                name: name,
                createdAt: Date.now(),
                sortOrder: 0
            });

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async addVideo(mylistId, videoInfo) {
        const db = await this.db.initDB();
        const transaction = db.transaction(['videos'], 'readwrite');
        const store = transaction.objectStore('videos');
        const index = store.index('mylistId');

        return new Promise((resolve, reject) => {
            const request = index.get(IDBKeyRange.only(mylistId));
            
            request.onsuccess = () => {
                const existingVideos = request.result;
                if (existingVideos && existingVideos.id === videoInfo.id) {
                    reject('このマイリストには既に登録されています');
                    return;
                }

                const video = {
                    id: `${mylistId}_${videoInfo.id}`,
                    originalId: videoInfo.id,
                    mylistId: mylistId,
                    title: videoInfo.title,
                    viewCount: parseInt(videoInfo.viewCount) || 0,
                    commentCount: parseInt(videoInfo.commentCount) || 0,
                    mylistCount: parseInt(videoInfo.mylistCount) || 0,
                    thumbnailUrl: videoInfo.thumbnailUrl,
                    uploadedAt: videoInfo.uploadedAt || Date.now(),
                    authorName: videoInfo.authorName || '不明',
                    addedAt: Date.now()
                };

                const addRequest = store.add(video);
                addRequest.onsuccess = () => resolve('追加しました');
                addRequest.onerror = () => reject('追加に失敗しました');
            };

            request.onerror = () => reject(request.error);
        });
    }

    async getVideos(mylistId) {
        const db = await this.db.initDB();
        const transaction = db.transaction(['videos'], 'readonly');
        const store = transaction.objectStore('videos');
        const index = store.index('mylistId');

        return new Promise((resolve, reject) => {
            const request = index.getAll(mylistId);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async sortVideos(videos, sortType) {
        const [field, order] = sortType.split('_');
        return videos.sort((a, b) => {
            let comparison = 0;
            switch (field) {
                case 'addedAt':
                    comparison = a.addedAt - b.addedAt;
                    break;
                case 'title':
                    comparison = a.title.localeCompare(b.title);
                    break;
                case 'viewCount':
                    comparison = (a.viewCount || 0) - (b.viewCount || 0);
                    break;
                case 'commentCount':
                    comparison = (a.commentCount || 0) - (b.commentCount || 0);
                    break;
                case 'mylistCount':
                    comparison = (a.mylistCount || 0) - (b.mylistCount || 0);
                    break;
            }
            return order === 'desc' ? -comparison : comparison;
        });
    }

    async getAllMylists() {
        const db = await this.db.initDB();
        const transaction = db.transaction(['mylists'], 'readonly');
        const store = transaction.objectStore('mylists');

        return new Promise((resolve, reject) => {
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async sortMylists(sortType) {
        const mylists = await this.getAllMylists();
        const mylistsWithCount = await Promise.all(mylists.map(async mylist => {
            const videos = await this.getVideos(mylist.id);
            return {
                ...mylist,
                videoCount: videos.length
            };
        }));
        
        const [type, order] = sortType.split('_');
        const isAsc = order === 'asc';

        return mylistsWithCount.sort((a, b) => {
            let comparison = 0;
            
            switch (type) {
                case 'name':
                    comparison = a.name.localeCompare(b.name, 'ja');
                    break;
                
                case 'createdAt':
                    comparison = a.createdAt - b.createdAt;
                    break;
                
                case 'videoCount':
                    comparison = a.videoCount - b.videoCount;
                    break;
                
                default:
                    comparison = a.name.localeCompare(b.name, 'ja');
            }

            return isAsc ? comparison : -comparison;
        });
    }

    async deleteVideo(compositeId) {
        const db = await this.db.initDB();
        const transaction = db.transaction(['videos'], 'readwrite');
        const store = transaction.objectStore('videos');

        return new Promise((resolve, reject) => {
            const request = store.delete(compositeId);
            
            request.onsuccess = () => {
                resolve('削除しました');
            };
            
            request.onerror = () => {
                reject('削除に失敗しました');
            };
        });
    }

    async updateMylistName(mylistId, newName) {
        const db = await this.db.initDB();
        const transaction = db.transaction(['mylists'], 'readwrite');
        const store = transaction.objectStore('mylists');

        return new Promise((resolve, reject) => {
            const request = store.get(mylistId);
            request.onsuccess = () => {
                const mylist = request.result;
                if (!mylist) {
                    reject(new Error('マイリストが見つかりません'));
                    return;
                }
                mylist.name = newName;
                store.put(mylist).onsuccess = () => resolve();
            };
            request.onerror = () => reject(request.error);
        });
    }

    async deleteMylist(mylistId) {
        const db = await this.db.initDB();
        const transaction = db.transaction(['mylists', 'videos'], 'readwrite');
        const mylistStore = transaction.objectStore('mylists');
        const videoStore = transaction.objectStore('videos');
        const videoIndex = videoStore.index('mylistId');

        return new Promise((resolve, reject) => {
            const deleteVideos = videoIndex.getAllKeys(mylistId);
            deleteVideos.onsuccess = () => {
                const keys = deleteVideos.result;
                Promise.all([
                    ...keys.map(key => new Promise((res) => videoStore.delete(key).onsuccess = res)),
                    new Promise((res) => mylistStore.delete(mylistId).onsuccess = res)
                ]).then(resolve).catch(reject);
            };
            deleteVideos.onerror = () => reject(deleteVideos.error);
        });
    }

    async exportData() {
        const db = await this.db.initDB();
        const mylists = await this.getAllMylists();
        const videos = await Promise.all(
            mylists.map(mylist => this.getVideos(mylist.id))
        );

        return {
            mylists,
            videos: videos.flat()
        };
    }

    async importData(data) {
        const db = await this.db.initDB();
        const transaction = db.transaction(['mylists', 'videos'], 'readwrite');
        const mylistStore = transaction.objectStore('mylists');
        const videoStore = transaction.objectStore('videos');

        return new Promise((resolve, reject) => {
            try {
                // マイリストの追加
                data.mylists.forEach(mylist => {
                    mylistStore.add(mylist);
                });

                // 動画情報の追加（既存のデータを使用）
                data.videos.forEach(video => {
                    videoStore.add(video);
                    // キャッシュにも追加
                    this.apiCache.set(video.originalId, {
                        id: video.originalId,
                        title: video.title,
                        viewCount: video.viewCount,
                        commentCount: video.commentCount,
                        mylistCount: video.mylistCount,
                        thumbnailUrl: video.thumbnailUrl,
                        uploadedAt: video.uploadedAt,
                        authorName: video.authorName
                    });
                });

                transaction.oncomplete = () => resolve();
                transaction.onerror = () => reject(transaction.error);
            } catch (error) {
                reject(error);
            }
        });
    }

    // APIリクエストのキューイング処理
    async queueApiRequest(videoId) {
        return new Promise((resolve, reject) => {
            this.apiRequestQueue.push({
                videoId,
                resolve,
                reject
            });
            
            if (!this.isProcessingQueue) {
                this.processQueue();
            }
        });
    }

    // キューの処理
    async processQueue() {
        if (this.apiRequestQueue.length === 0) {
            this.isProcessingQueue = false;
            return;
        }

        this.isProcessingQueue = true;
        const request = this.apiRequestQueue.shift();

        try {
            const result = await this._fetchVideoInfo(request.videoId);
            request.resolve(result);
        } catch (error) {
            request.reject(error);
        }

        // 次のリクエストまで待機
        await new Promise(resolve => setTimeout(resolve, this.API_RATE_LIMIT));
        this.processQueue();
    }

    // 実際のAPI呼び出し（内部用）
    async _fetchVideoInfo(videoId) {
        try {
            // キャッシュチェック
            const cachedData = this.apiCache.get(videoId);
            if (cachedData) {
                return cachedData;
            }

            const response = await fetch(`https://ext.nicovideo.jp/api/getthumbinfo/${videoId}`);
            const text = await response.text();
            
            const parser = new DOMParser();
            const xml = parser.parseFromString(text, 'text/xml');
            
            if (xml.querySelector('error')) {
                throw new Error(xml.querySelector('description').textContent);
            }
            
            const thumb = xml.querySelector('thumb');
            const channelInfo = thumb.querySelector('ch_name');
            
            const videoInfo = {
                id: videoId,
                title: thumb.querySelector('title').textContent,
                viewCount: parseInt(thumb.querySelector('view_counter').textContent),
                commentCount: parseInt(thumb.querySelector('comment_num').textContent),
                mylistCount: parseInt(thumb.querySelector('mylist_counter').textContent),
                thumbnailUrl: thumb.querySelector('thumbnail_url').textContent,
                uploadedAt: new Date(thumb.querySelector('first_retrieve').textContent).getTime(),
                authorName: channelInfo ? channelInfo.textContent : thumb.querySelector('user_nickname').textContent
            };

            // キャッシュに保存
            this.apiCache.set(videoId, videoInfo);
            
            return videoInfo;
        } catch (error) {
            console.error('動画情報の取得に失敗しました:', error);
            throw new Error('動画情報の取得に失敗しました: ' + error.message);
        }
    }

    // 公開用のfetchVideoInfo（キューイング処理を使用）
    async fetchVideoInfo(videoId) {
        if (!videoId.match(/^(?:so|sm|nm|nx)\d+$/)) {
            throw new Error('無効な動画IDです');
        }
        return this.queueApiRequest(videoId);
    }

    // 動画情報を取得する関数を修正
    async getVideoInfoFromSources(videoId, existingData = null, forceApi = false) {
        // APIリクエスト制限のチェック
        const shouldUseApi = this.apiRequestCount < this.API_REQUEST_LIMIT;

        // 1. 既存のデータをチェック
        if (existingData) {
            // データの完全性チェック
            const isComplete = existingData.title && 
                             existingData.viewCount && 
                             existingData.commentCount && 
                             existingData.mylistCount && 
                             existingData.thumbnailUrl && 
                             existingData.uploadedAt && 
                             existingData.authorName;

            if (isComplete || !shouldUseApi) {
                return {
                    id: videoId,
                    title: existingData.title || '不明な動画',
                    viewCount: parseInt(existingData.viewCount) || 0,
                    commentCount: parseInt(existingData.commentCount) || 0,
                    mylistCount: parseInt(existingData.mylistCount) || 0,
                    thumbnailUrl: existingData.thumbnailUrl || '',
                    uploadedAt: existingData.uploadedAt || Date.now(),
                    authorName: existingData.authorName || '不明'
                };
            }
        }

        // 2. キャッシュをチェック
        const cachedData = this.apiCache.get(videoId);
        if (cachedData) {
            return cachedData;
        }

        // 3. API制限に達している場合は既存データを使用
        if (!shouldUseApi) {
            return {
                id: videoId,
                title: existingData?.title || '不明な動画',
                viewCount: parseInt(existingData?.viewCount) || 0,
                commentCount: parseInt(existingData?.commentCount) || 0,
                mylistCount: parseInt(existingData?.mylistCount) || 0,
                thumbnailUrl: existingData?.thumbnailUrl || '',
                uploadedAt: existingData?.uploadedAt || Date.now(),
                authorName: existingData?.authorName || '不明'
            };
        }

        // 4. APIを使用
        this.apiRequestCount++;
        return this.fetchVideoInfo(videoId);
    }

    // レガシーデータのインポート処理を修正
    async importLegacyData(jsonText, progressCallback) {
        try {
            const legacyData = JSON.parse(jsonText);
            const videos = legacyData.filter(item => item.vid !== "meta");
            
            // APIリクエストカウンターをリセット
            this.apiRequestCount = 0;
            
            const mylistId = await this.createMylist("インポートされたマイリスト");
            let processed = 0;
            const total = videos.length;

            // 並列処理を制限して実行
            const batchSize = 5;
            for (let i = 0; i < videos.length; i += batchSize) {
                const batch = videos.slice(i, i + batchSize);
                await Promise.all(batch.map(async video => {
                    try {
                        const existingData = {
                            title: video.title,
                            viewCount: video.view_counter,
                            commentCount: video.comment_num,
                            mylistCount: video.mylist_counter,
                            thumbnailUrl: video.thumbUrl,
                            uploadedAt: video.first_retrieve,
                            authorName: video.author
                        };

                        const videoInfo = await this.getVideoInfoFromSources(video.vid, existingData);
                        await this.addVideo(mylistId, videoInfo);
                    } catch (error) {
                        console.warn(`動画「${video.title}」の処理に失敗しました:`, error);
                        // 最低限のデータで登録
                        await this.addVideo(mylistId, {
                            id: video.vid,
                            title: video.title || '取得失敗',
                            viewCount: video.view_counter || 0,
                            commentCount: video.comment_num || 0,
                            mylistCount: video.mylist_counter || 0,
                            thumbnailUrl: video.thumbUrl || '',
                            uploadedAt: video.first_retrieve || Date.now(),
                            authorName: video.author || '不明'
                        });
                    }
                    processed++;
                    if (progressCallback) {
                        progressCallback(processed, total);
                    }
                }));
            }

            return mylistId;
        } catch (error) {
            console.error('レガシーデータのインポートに失敗しました:', error);
            throw new Error('レガシーデータのインポートに失敗しました: ' + error.message);
        }
    }

    // 動画IDまたはURLから動画IDを抽出する関数を追加
    extractVideoId(input) {
        // URLからの抽出パターン
        const urlPatterns = [
            /nicovideo\.jp\/watch\/((?:so|sm|nm|nx)\d+)/,
            /nico\.ms\/((?:so|sm|nm|nx)\d+)/
        ];

        // URLからの抽出を試行
        for (const pattern of urlPatterns) {
            const match = input.match(pattern);
            if (match) {
                return match[1];
            }
        }

        // 直接的な動画ID（so/sm/nm/nx + 数字）の場合
        if (input.match(/^(?:so|sm|nm|nx)\d+$/)) {
            return input;
        }

        throw new Error('無効な動画IDまたはURLです');
    }

    async updateVideoInfo(compositeId, newInfo) {
        const [mylistId, videoId] = compositeId.split('_');
        
        // データベースから既存のエントリを取得
        const db = await this.db.initDB();
        const transaction = db.transaction(['videos'], 'readwrite');
        const store = transaction.objectStore('videos');

        return new Promise((resolve, reject) => {
            const request = store.get(compositeId);
            
            request.onsuccess = () => {
                const existingVideo = request.result;
                if (!existingVideo) {
                    reject(new Error('動画が見つかりません'));
                    return;
                }

                // 新しい情報で更新
                const updatedVideo = {
                    ...existingVideo,
                    title: newInfo.title,
                    viewCount: newInfo.viewCount,
                    commentCount: newInfo.commentCount,
                    mylistCount: newInfo.mylistCount,
                    thumbnailUrl: newInfo.thumbnailUrl,
                    uploadedAt: newInfo.uploadedAt,
                    authorName: newInfo.authorName
                };

                // データベースを更新
                const updateRequest = store.put(updatedVideo);
                updateRequest.onsuccess = () => resolve();
                updateRequest.onerror = () => reject(new Error('データベースの更新に失敗しました'));
            };

            request.onerror = () => reject(new Error('動画情報の取得に失敗しました'));
        });
    }
} 