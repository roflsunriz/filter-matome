class CustomMylist2ManagerUI {
    constructor() {
        this.manager = new CustomMylist2Manager();
        this.currentMylistId = null;
        this.initializeEventListeners();
        this.loadMylists();
        this.progressModal = document.getElementById('progressModal');
        this.progressPath = this.progressModal.querySelector('.progress');
        this.progressText = this.progressModal.querySelector('.progress-text');
        this.progressStatus = this.progressModal.querySelector('.progress-status');
        this.initializeHeaderControls();
        this.initializeSearchEventListeners();
    }

    // 入力値のサニタイズとバリデーション用の関数を追加
    sanitizeInput(input) {
        // HTMLタグの除去
        let sanitized = input.replace(/<[^>]*>/g, '');
        // 制御文字の除去（改行とタブは許可）
        sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
        // 前後の空白を削除
        return sanitized.trim();
    }

    validateInput(input, type = 'text') {
        const sanitized = this.sanitizeInput(input);

        // 空文字チェック
        if (!sanitized) {
            throw new Error('入力値が空です');
        }

        switch (type) {
            case 'mylistName':
                // マイリスト名の制限
                if (sanitized.length > 50) {
                    throw new Error('マイリスト名は50文字以内にしてください');
                }
                // IndexedDBで問題になる可能性のある文字を制限
                if (/[\/\\\?\*\"\<\>\|\#\:]/.test(sanitized)) {
                    throw new Error('マイリスト名に使用できない文字が含まれています');
                }
                break;

            case 'videoId':
                // 動画IDまたはURL
                if (sanitized.includes('nicovideo.jp') || sanitized.includes('nico.ms')) {
                    // URLの場合はURLとして有効かチェック
                    try {
                        new URL(sanitized);
                    } catch {
                        throw new Error('無効なURLです');
                    }
                } else {
                    // 動画ID形式のチェック
                    if (!sanitized.match(/^(?:sm|so|nm|nx)\d+$/)) {
                        throw new Error('無効な動画IDです');
                    }
                }
                break;
        }

        return sanitized;
    }

    async loadMylists() {
        try {
            const sortType = document.getElementById('mylistSortType').value;
            const mylists = await this.manager.sortMylists(sortType);
            await this.renderMylistList(mylists);
        } catch (error) {
            console.error('マイリストの読み込みに失敗しました:', error);
        }
    }

    async renderMylistList(mylists) {
        const mylistList = document.getElementById('mylistList');
        const mylistsWithCount = await Promise.all(mylists.map(async mylist => {
            const videos = await this.manager.getVideos(mylist.id);
            return {
                ...mylist,
                videoCount: videos.length
            };
        }));

        mylistList.innerHTML = mylistsWithCount.map(mylist => `
            <div class="mylist-item ${this.currentMylistId === mylist.id ? 'active' : ''}" data-id="${mylist.id}">
                <div class="mylist-info">
                    <div class="mylist-details">
                        <span class="mylist-name">${mylist.name}</span>
                        <span class="mylist-date">${new Date(mylist.createdAt).toLocaleDateString()}</span>
                    </div>
                    <span class="mylist-count-mylist-tab">${mylist.videoCount}件</span>
                </div>
            </div>
        `).join('');

        // マイリストクリックイベントの追加
        mylistList.querySelectorAll('.mylist-item').forEach(item => {
            item.addEventListener('click', () => this.selectMylist(parseInt(item.dataset.id)));
        });
    }

    async selectMylist(mylistId) {
        this.currentMylistId = mylistId;
        
        // マイリスト情報の表示
        const mylists = await this.manager.getAllMylists();
        const currentMylist = mylists.find(m => m.id === mylistId);
        document.getElementById('currentMylistName').value = currentMylist.name;

        // 動画一覧の表示
        await this.loadVideos();
        
        // 選択状態の視覚的な更新
        document.querySelectorAll('.mylist-item').forEach(item => {
            item.classList.toggle('active', parseInt(item.dataset.id) === mylistId);
        });
    }

    async loadVideos() {
        if (!this.currentMylistId) return;

        try {
            const sortType = document.getElementById('videoSortType').value;
            const videos = await this.manager.getVideos(this.currentMylistId);
            const sortedVideos = this.sortVideos(videos, sortType);
            this.renderVideoList(sortedVideos);
            
            // 検索欄をクリア
            const videoSearchInput = document.getElementById('videoSearchInput');
            if (videoSearchInput) {
                videoSearchInput.value = '';
            }
        } catch (error) {
            console.error('動画一覧の読み込みに失敗しました:', error);
            alert('動画一覧の読み込みに失敗しました');
        }
    }

    renderVideoList(videos) {
        const videoList = document.getElementById('videoList');
        videoList.innerHTML = videos.map(video => `
            <div class="video-item" data-id="${video.originalId}" data-composite-id="${video.id}">
                <input type="checkbox" class="video-select">
                <img class="video-thumbnail" src="${video.thumbnailUrl}" alt="サムネイル">
                <div class="video-info">
                    <div class="video-title">
                        <a href="https://nico.ms/${video.originalId}" target="_blank" class="cml2-video-link">${video.title}</a>
                    </div>
                    <div class="video-author">投稿者: ${video.authorName || '不明'}</div>
                    <div class="video-upload-date">投稿日: ${new Date(video.uploadedAt || 0).toLocaleDateString()}</div>
                    <div class="video-stats">
                        <span class="view-count">再生: ${(video.viewCount || 0).toLocaleString()}</span>
                        <span class="comment-count">コメント: ${(video.commentCount || 0).toLocaleString()}</span>
                        <span class="mylist-count">マイリスト: ${(video.mylistCount || 0).toLocaleString()}</span>
                    </div>
                </div>
                <div class="video-actions">
                    <button class="cml2-btn move-video">移動</button>
                    <button class="cml2-btn copy-video">コピー</button>
                    <button class="cml2-btn cml2-btn-danger delete-video">削除</button>
                    <button class="cml2-btn refresh-video">情報更新</button>
                </div>
            </div>
        `).join('');

        // 移動ボタンのイベントリスナー
        videoList.querySelectorAll('.move-video').forEach(button => {
            button.addEventListener('click', async (event) => {
                const videoItem = event.target.closest('.video-item');
                const videoTitle = videoItem.querySelector('.video-title').textContent;
                await this.moveVideo(videoItem, videoTitle);
            });
        });

        // コピーボタンのイベントリスナー
        videoList.querySelectorAll('.copy-video').forEach(button => {
            button.addEventListener('click', async (event) => {
                const videoItem = event.target.closest('.video-item');
                const videoTitle = videoItem.querySelector('.video-title').textContent;
                await this.copyVideo(videoItem, videoTitle);
            });
        });

        // 削除ボタンのイベントリスナーを追加
        videoList.querySelectorAll('.delete-video').forEach(button => {
            button.addEventListener('click', async (event) => {
                const videoItem = event.target.closest('.video-item');
                const compositeId = videoItem.dataset.compositeId;
                const videoTitle = videoItem.querySelector('.video-title').textContent;
                
                if (confirm(`「${videoTitle}」をマイリストから削除しますか？`)) {
                    try {
                        await this.manager.deleteVideo(compositeId);
                        await this.loadVideos(); // 動画一覧を再読み込み
                    } catch (error) {
                        console.error('動画の削除に失敗しました:', error);
                    }
                }
            });
        });

        // 情報更新ボタンのイベントリスナーを追加
        videoList.querySelectorAll('.refresh-video').forEach(button => {
            button.addEventListener('click', async (event) => {
                const videoItem = event.target.closest('.video-item');
                const videoId = videoItem.dataset.id;
                const compositeId = videoItem.dataset.compositeId;

                try {
                    // ボタンを一時的に無効化
                    event.target.disabled = true;
                    event.target.textContent = '更新中...';

                    // APIから最新の情報を取得
                    const videoInfo = await this.manager.fetchVideoInfo(videoId);
                    
                    // データベースの情報を更新
                    await this.manager.updateVideoInfo(compositeId, videoInfo);

                    // 動画一覧を再読み込み
                    await this.loadVideos();

                } catch (error) {
                    console.error('動画情報の更新に失敗しました:', error);
                    alert('動画情報の更新に失敗しました: ' + (error.message || '不明なエラー'));
                    
                    // エラー時はボタンを元に戻す
                    event.target.disabled = false;
                    event.target.textContent = '情報更新';
                }
            });
        });
    }

    initializeEventListeners() {
        // 既存のイベントリスナー
        document.getElementById('mylistSortType').addEventListener('change', () => {
            this.loadMylists();
        });

        document.getElementById('createNewMylist').addEventListener('click', async () => {
            const nameInput = document.getElementById('newMylistName');
            try {
                const name = this.validateInput(nameInput.value, 'mylistName');
                await this.manager.createMylist(name);
                nameInput.value = '';
                this.loadMylists();
            } catch (error) {
                console.error('マイリストの作成に失敗しました:', error);
                alert(error.message);
            }
        });

        // 動画並び替えのイベントリスナー
        document.getElementById('videoSortType').addEventListener('change', () => {
            this.loadVideos();
        });

        // 動画追加ボタンのイベントリスナー
        document.getElementById('addVideo').addEventListener('click', async () => {
            if (!this.currentMylistId) {
                alert('マイリストを選択してください');
                return;
            }

            const input = document.getElementById('videoIdInput');
            try {
                const videoUrl = this.validateInput(input.value, 'videoId');
                
                // URLから動画IDを抽出
                let videoId;
                if (videoUrl.includes('nicovideo.jp') || videoUrl.includes('nico.ms')) {
                    const match = videoUrl.match(/(?:sm|so|nm|nx)\d+/);
                    if (!match) {
                        throw new Error('動画IDを抽出できませんでした');
                    }
                    videoId = match[0];
                } else {
                    videoId = videoUrl;
                }

                // 動画情報を取得してマイリストに追加
                const videoInfo = await this.manager.fetchVideoInfo(videoId);
                await this.manager.addVideo(this.currentMylistId, videoInfo);
                
                // 入力フォームをクリアして動画一覧を更新
                input.value = '';
                await this.loadVideos();
                
                alert('動画を追加しました');
            } catch (error) {
                console.error('動画の追加に失敗しました:', error);
                alert(error.message || '動の追加に失敗しました');
            }
        });

        // Enterキーでも追加できるように
        document.getElementById('videoIdInput').addEventListener('keypress',
            async (event) => {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    document.getElementById('addVideo').click();
                }
            });

        // 一括操作の実行ボタン
        document.getElementById('executeSelectedAction').addEventListener('click', async () => {
            const action = document.getElementById('selectedVideosAction').value;
            if (!action) {
                alert('操作を選択してください');
                return;
            }

            const selectedVideos = Array.from(document.querySelectorAll('.video-select:checked'))
                .map(checkbox => checkbox.closest('.video-item'));

            if (selectedVideos.length === 0) {
                alert('動画を選択してください');
                return;
            }

            try {
                switch (action) {
                    case 'move':
                        await this.moveSelectedVideos(selectedVideos);
                        break;
                    case 'copy':
                        await this.copySelectedVideos(selectedVideos);
                        break;
                    case 'delete':
                        const titles = selectedVideos.map(video => 
                            video.querySelector('.video-title').textContent
                        );
                        const confirmMessage = 
                            `以下の${selectedVideos.length}件の動画を削除しますか？\n\n` +
                            titles.map(title => `・${title}`).join('\n');
                        
                        if (confirm(confirmMessage)) {
                            await Promise.all(selectedVideos.map(video => 
                                this.manager.deleteVideo(video.dataset.compositeId)
                            ));
                            await this.loadVideos();
                            alert('選択した動画を削除しました');
                        }
                        break;
                    case 'refresh':
                        const confirmMessage2 = 
                            '低速で動画情報を更新します。\n\n' +
                            '・200ミリ秒ごとに1件ずつ更新\n' +
                            '・50件ごとに2秒間の待機\n' +
                            `・合計${selectedVideos.length}件の更新\n` +
                            `・予想所要時間: 約${Math.ceil(this.calculateUpdateDuration(selectedVideos.length))}分\n\n` +
                            '実行しますか？';

                        if (confirm(confirmMessage2)) {
                            await this.refreshSelectedVideos(selectedVideos);
                        }
                        break;
                }
            } catch (error) {
                console.error('一括操作に失敗しました:', error);
                alert(error.message || '操作に失敗しました');
            }
        });

        // マイリスト名の保存
        document.getElementById('saveMylistName').addEventListener('click', async () => {
            if (!this.currentMylistId) {
                alert('マイリストを選択してください');
                return;
            }

            try {
                const newName = this.validateInput(
                    document.getElementById('currentMylistName').value,
                    'mylistName'
                );
                await this.manager.updateMylistName(this.currentMylistId, newName);
                await this.loadMylists();
                alert('マイリスト名を更新しました');
            } catch (error) {
                console.error('マイリスト名の更新に失敗しました:', error);
                alert(error.message || 'マイリスト名の更新に失敗しました');
            }
        });

        // マイリストの削除
        document.getElementById('deleteMylist').addEventListener('click', async () => {
            if (!this.currentMylistId) {
                alert('マイリストを選択してください');
                return;
            }

            const mylistName = document.getElementById('currentMylistName').value;
            if (!confirm(`マイリスト「${mylistName}」を削除しますか？\n※この操作は取り消せません`)) {
                return;
            }

            try {
                await this.manager.deleteMylist(this.currentMylistId);
                this.currentMylistId = null;
                document.getElementById('currentMylistName').value = '';
                document.getElementById('videoList').innerHTML = '';
                await this.loadMylists();
                alert('マイリストを削除しました');
            } catch (error) {
                console.error('マイリストの削除に失敗しました:', error);
                alert(error.message || 'マイリストの削除に失敗しました');
            }
        });

        // エクスポート機能
        document.getElementById('exportMylist').addEventListener('click', async () => {
            try {
                const data = await this.manager.exportData();
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'custom-mylist2-backup.json';
                a.click();
                URL.revokeObjectURL(url);
            } catch (error) {
                console.error('エクスポートに失敗しました:', error);
                alert('エクスポートに失敗しました');
            }
        });

        // インポート機能
        document.getElementById('importMylist').addEventListener('click', async () => {
            const input = document.getElementById('importFile');
            input.accept = '.json,.txt'; // .txtも受け付けるように
            input.click();
        });

        document.getElementById('importFile').addEventListener('change', async (event) => {
            const file = event.target.files[0];
            if (!file) return;

            try {
                const text = await file.text();
                let mylistId;

                // ファイル形式を判定
                try {
                    const data = JSON.parse(text);
                    if (Array.isArray(data) && data[0]?.vid) {
                        // カスタムマイリスト1の形式
                        mylistId = await this.manager.importLegacyData(text);
                        alert('カスタムマイリスト1のデータを正常にインポートしました');
                    } else {
                        // カスタムマイリスト2の形式
                        await this.manager.importData(data);
                        alert('データを正常にインポートしました');
                    }
                } catch (error) {
                    throw new Error('無効なJSONファイルです: ' + error.message);
                }

                // マイリスト一覧を更新
                await this.loadMylists();
                
                // インポートしたマイリストを選択
                if (mylistId) {
                    await this.selectMylist(mylistId);
                }
            } catch (error) {
                console.error('インポートに失敗しました:', error);
                alert(error.message || 'インポートに失敗しました');
            }
            
            // ファイル選択をリセット
            event.target.value = '';
        });

        // 全選択ボタンのイベントリスナー
        document.getElementById('selectAllVideos').addEventListener('click', () => {
            const checkboxes = document.querySelectorAll('.video-select');
            checkboxes.forEach(checkbox => checkbox.checked = true);
        });

        // 選択解除ボタンのイベントリスナー
        document.getElementById('deselectAllVideos').addEventListener('click', () => {
            const checkboxes = document.querySelectorAll('.video-select');
            checkboxes.forEach(checkbox => checkbox.checked = false);
        });
    }

    // 一括移動・コピー用のヘルパーメソッド
    async moveSelectedVideos(selectedVideos) {
        const targetMylistId = await this.showMylistSelectModal('移動', `選択した${selectedVideos.length}件の動画`);
        if (!targetMylistId) return;

        try {
            for (const video of selectedVideos) {
                const videoData = await this.getVideoData(video);
                await this.manager.addVideo(targetMylistId, videoData);
                await this.manager.deleteVideo(video.dataset.compositeId);
            }

            await this.loadVideos();
            alert(`${selectedVideos.length}件の動画を移動しました`);
        } catch (error) {
            console.error('動画の移動に失敗しました:', error);
            alert(error.message || '動画の移動に失敗しました');
        }
    }

    async copySelectedVideos(selectedVideos) {
        const targetMylistId = await this.showMylistSelectModal('コピー', `選択した${selectedVideos.length}件の動画`);
        if (!targetMylistId) return;

        try {
            for (const video of selectedVideos) {
                const videoData = await this.getVideoData(video);
                await this.manager.addVideo(targetMylistId, videoData);
            }

            alert(`${selectedVideos.length}件の動画をコピーしました`);
        } catch (error) {
            console.error('動画のコピーに失敗しました:', error);
            alert(error.message || '動画のコピーに失敗しました');
        }
    }

    // 一括操作の実行メソッドも更新
    async executeSelectedAction() {
        const action = document.getElementById('selectedVideosAction').value;
        if (!action) {
            alert('操作を選択してください');
            return;
        }

        const selectedVideos = Array.from(document.querySelectorAll('.video-select:checked'))
            .map(checkbox => checkbox.closest('.video-item'));

        if (selectedVideos.length === 0) {
            alert('動画を選択してください');
            return;
        }

        try {
            switch (action) {
                case 'move':
                    await this.moveSelectedVideos(selectedVideos);
                    break;
                case 'copy':
                    await this.copySelectedVideos(selectedVideos);
                    break;
                case 'delete':
                    if (confirm(`選択した${selectedVideos.length}件の動画を削除しますか？`)) {
                        try {
                            for (const video of selectedVideos) {
                                await this.manager.deleteVideo(video.dataset.compositeId);
                            }
                            await this.loadVideos();
                            alert(`${selectedVideos.length}件の動画を削除しました`);
                        } catch (error) {
                            console.error('動画の削除に失敗しました:', error);
                            alert(error.message || '動画の削除に失敗しました');
                        }
                    }
                    break;
                case 'refresh':
                    const confirmMessage = 
                        '低速で動画情報を更新します。\n\n' +
                        '・200ミリ秒ごとに1件ずつ更新\n' +
                        '・50件ごとに2秒間の待機\n' +
                        `・合計${selectedVideos.length}件の更新\n` +
                        `・予想所要時間: 約${Math.ceil(this.calculateUpdateDuration(selectedVideos.length))}分\n\n` +
                        '実行しますか？';

                    if (confirm(confirmMessage)) {
                        await this.refreshSelectedVideos(selectedVideos);
                    }
                    break;
            }
        } catch (error) {
            console.error('一括操作に失敗しました:', error);
            alert(error.message || '操作に失敗しました');
        }

        // 操作完了後、セレクトボックスをリセット
        document.getElementById('selectedVideosAction').value = '';
    }

    async sortMylists(sortType) {
        const mylists = await this.manager.getAllMylists();
        const mylistsWithCount = await Promise.all(mylists.map(async mylist => {
            const videos = await this.manager.getVideos(mylist.id);
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

    async addVideo(input) {
        try {
            const sanitizedInput = this.validateInput(input, 'videoId');
            const videoId = this.manager.extractVideoId(sanitizedInput);
            const videoInfo = await this.manager.fetchVideoInfo(videoId);
            await this.manager.addVideo(this.currentMylistId, videoInfo);
            await this.loadVideos();
            return true;
        } catch (error) {
            console.error('動画の追加に失敗しました:', error);
            alert(error.message || '動画の追加に失敗しました');
            return false;
        }
    }

    updateProgress(current, total) {
        const percentage = Math.round((current / total) * 100);
        this.progressPath.style.strokeDashoffset = 100 - percentage;
        this.progressText.textContent = `${percentage}%`;
        this.progressStatus.textContent = `${current} / ${total} 件の動画を処理中...`;
    }

    showProgress() {
        this.progressModal.style.display = 'flex';
    }

    hideProgress() {
        this.progressModal.style.display = 'none';
        // 進捗表示をリセット
        this.updateProgress(0, 0);
    }

    async importFile(file) {
        try {
            const text = await file.text();
            let mylistId;

            try {
                const data = JSON.parse(text);
                if (Array.isArray(data) && data[0]?.vid) {
                    this.showProgress();
                    mylistId = await this.manager.importLegacyData(text, 
                        (current, total) => this.updateProgress(current, total)
                    );
                    alert('カスタムマイリスト1のデータを正常にインポートしました');
                } else {
                    await this.manager.importData(data);
                    alert('データを正常にインポートしました');
                }
            } catch (error) {
                throw new Error('無効なJSONファイルです: ' + error.message);
            }

            await this.loadMylists();
            if (mylistId) {
                await this.selectMylist(mylistId);
            }
        } catch (error) {
            console.error('インポートに失敗しました:', error);
            alert(error.message || 'インポートに失敗しました');
        } finally {
            this.hideProgress();
        }
    }

    initializeHeaderControls() {
        // ヘッダー固定のトグル
        const headerFixed = document.getElementById('headerFixed');
        const header = document.getElementById('customHeader');
        const content = document.getElementById('CustomMylist2Manager');

        headerFixed.addEventListener('change', (e) => {
            if (e.target.checked) {
                header.classList.add('fixed');
                content.style.marginTop = header.offsetHeight + 'px';
            } else {
                header.classList.remove('fixed');
                content.style.marginTop = '0';
            }
        });

        // 検索機能
        document.getElementById('searchExec').addEventListener('click', () => {
            this.executeSearch();
        });

        document.getElementById('searchClear').addEventListener('click', () => {
            document.getElementById('searchWords').value = '';
        });

        // Enterキーでの検索
        document.getElementById('searchWords').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.executeSearch();
            }
        });
    }

    executeSearch() {
        const option = document.getElementById('searchOption').value;
        const word = document.getElementById('searchWords').value.trim();
        
        if (!word) {
            alert('検索キーワードが空です。');
            return;
        }

        const [host, type] = option.split('+');
        window.open(`https://${host}.nicovideo.jp/${type}/${encodeURIComponent(word)}`, '_blank');
    }

    // 移動先マイリスト選択用のモーダルを表示
    async showMylistSelectModal(action, videoTitle = '') {
        return new Promise((resolve) => {
            const modalHTML = `
                <div class="cml2-modal">
                    <div class="cml2-modal-content">
                        <h3 class="cml2-modal-title">${action}先のマイリストを選択</h3>
                        <div class="cml2-modal-body">
                            ${videoTitle ? `<p>「${videoTitle}」を${action}します</p>` : ''}
                            <select class="cml2-select" id="targetMylistSelect">
                                <option value="">選択してください</option>
                                ${this.getOtherMylistsOptions()}
                            </select>
                        </div>
                        <div class="cml2-modal-footer">
                            <button class="cml2-btn" id="cancelMylistSelect">キャンセル</button>
                            <button class="cml2-btn" id="confirmMylistSelect">${action}</button>
                        </div>
                    </div>
                </div>
            `;

            document.body.insertAdjacentHTML('beforeend', modalHTML);

            const modal = document.querySelector('.cml2-modal');
            const cancelBtn = document.getElementById('cancelMylistSelect');
            const confirmBtn = document.getElementById('confirmMylistSelect');
            const select = document.getElementById('targetMylistSelect');

            cancelBtn.addEventListener('click', () => {
                modal.remove();
                resolve(null);
            });

            confirmBtn.addEventListener('click', () => {
                const selectedId = parseInt(select.value);
                if (selectedId) {
                    modal.remove();
                    resolve(selectedId);
                } else {
                    alert('マイリストを選択してください');
                }
            });
        });
    }

    // 現在のマイリスト以外のオプションを生成
    getOtherMylistsOptions() {
        const mylists = this.manager.getAllMylists();
        return mylists
            .filter(mylist => mylist.id !== this.currentMylistId)
            .map(mylist => `<option value="${mylist.id}">${mylist.name}</option>`)
            .join('');
    }

    // 動画移動メソッドを更新
    async moveVideo(videoItem, videoTitle) {
        try {
            const targetMylistId = await this.showMylistSelectModal('移動', videoTitle);
            if (!targetMylistId) return;

            const compositeId = videoItem.dataset.compositeId;
            const videoData = await this.getVideoData(videoItem);

            await this.manager.addVideo(targetMylistId, videoData);
            await this.manager.deleteVideo(compositeId);
            await this.loadVideos();

            alert('動画を移動しました');
        } catch (error) {
            console.error('動画の移動に失敗しました:', error);
            alert(error.message || '動画の移動に失敗しました');
        }
    }

    // 動画コピーメソッドを更新
    async copyVideo(videoItem, videoTitle) {
        try {
            const targetMylistId = await this.showMylistSelectModal('コピー', videoTitle);
            if (!targetMylistId) return;

            const videoData = await this.getVideoData(videoItem);
            await this.manager.addVideo(targetMylistId, videoData);
            alert('動画をコピーしました');
        } catch (error) {
            console.error('動画のコピーに失敗しました:', error);
            alert(error.message || '動画のコピーに失敗しました');
        }
    }

    // マイリスト選択モーダルを表示する共通関数
    async showMylistSelectModal(action, title) {
        try {
            // 全マイリストを取得
            const mylists = await this.manager.getAllMylists();
            if (!Array.isArray(mylists)) {
                throw new Error('マイリスト情報の取得に失敗しました');
            }

            // 現在のマイリストを除外
            const currentMylistId = this.currentMylistId;
            const availableMylists = mylists.filter(mylist => mylist.id !== currentMylistId);

            if (availableMylists.length === 0) {
                throw new Error('移動先のマイリストがありません');
            }

            // モーダルの作成
            const modalHTML = `
                <div class="cml2-modal">
                    <div class="cml2-modal-content">
                        <h3 class="cml2-modal-title">「${title}」を${action}</h3>
                        <div class="cml2-modal-body">
                            <select class="cml2-select" id="targetMylist">
                                ${availableMylists.map(mylist => 
                                    `<option value="${mylist.id}">${mylist.name}</option>`
                                ).join('')}
                            </select>
                        </div>
                        <div class="cml2-modal-footer">
                            <button class="cml2-btn" id="cancelAction">キャンセル</button>
                            <button class="cml2-btn" id="confirmAction">OK</button>
                        </div>
                    </div>
                </div>
            `;

            document.body.insertAdjacentHTML('beforeend', modalHTML);

            return new Promise((resolve) => {
                const modal = document.querySelector('.cml2-modal');
                const confirmBtn = document.getElementById('confirmAction');
                const cancelBtn = document.getElementById('cancelAction');
                const select = document.getElementById('targetMylist');

                confirmBtn.addEventListener('click', () => {
                    const selectedId = parseInt(select.value);
                    modal.remove();
                    resolve(selectedId);
                });

                cancelBtn.addEventListener('click', () => {
                    modal.remove();
                    resolve(null);
                });
            });
        } catch (error) {
            alert(error.message);
            return null;
        }
    }

    // getVideoDataメソッドを追加
    async getVideoData(videoItem) {
        return {
            id: videoItem.dataset.id,
            title: videoItem.querySelector('.video-title').textContent.trim(),
            viewCount: parseInt(videoItem.querySelector('.view-count').textContent.replace(/[^0-9]/g, '')),
            commentCount: parseInt(videoItem.querySelector('.comment-count').textContent.replace(/[^0-9]/g, '')),
            mylistCount: parseInt(videoItem.querySelector('.mylist-count').textContent.replace(/[^0-9]/g, '')),
            thumbnailUrl: videoItem.querySelector('.video-thumbnail').src,
            uploadedAt: new Date(videoItem.querySelector('.video-upload-date').textContent.replace('投稿日: ', '')).getTime(),
            authorName: videoItem.querySelector('.video-author').textContent.replace('投稿者: ', '')
        };
    }

    sortVideos(videos, sortType) {
        const [type, order] = sortType.split('_');
        const isAsc = order === 'asc';

        return videos.sort((a, b) => {
            let comparison = 0;
            
            switch (type) {
                case 'uploadedAt':
                    comparison = (a.uploadedAt || 0) - (b.uploadedAt || 0);
                    break;
                
                case 'title':
                    comparison = (a.title || '').localeCompare(b.title || '', 'ja');
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
                
                case 'addedAt':
                    comparison = (a.addedAt || 0) - (b.addedAt || 0);
                    break;
                
                default:
                    comparison = (a.uploadedAt || 0) - (b.uploadedAt || 0);
            }

            return isAsc ? comparison : -comparison;
        });
    }

    initializeSearchEventListeners() {
        // マイリスト検索
        const mylistSearchInput = document.getElementById('mylistSearchInput');
        mylistSearchInput.addEventListener('input', () => {
            this.filterMylists(mylistSearchInput.value.toLowerCase());
        });

        // 動画検索
        const videoSearchInput = document.getElementById('videoSearchInput');
        videoSearchInput.addEventListener('input', () => {
            this.filterVideos(videoSearchInput.value.toLowerCase());
        });
    }

    // マイリストの検索フィルター
    filterMylists(searchText) {
        const mylistItems = document.querySelectorAll('.mylist-item');
        mylistItems.forEach(item => {
            const mylistName = item.querySelector('span').textContent.toLowerCase();
            if (mylistName.includes(searchText)) {
                item.classList.remove('hidden');
            } else {
                item.classList.add('hidden');
            }
        });
    }

    // 動画の検索フィルター
    filterVideos(searchText) {
        const videoItems = document.querySelectorAll('.video-item');
        videoItems.forEach(item => {
            const title = item.querySelector('.video-title').textContent.toLowerCase();
            const author = item.querySelector('.video-author').textContent.toLowerCase();
            
            if (title.includes(searchText) || author.includes(searchText)) {
                item.classList.remove('hidden');
            } else {
                item.classList.add('hidden');
            }
        });
    }

    // 更新所要時間の計算（分単位）
    calculateUpdateDuration(videoCount) {
        const baseDelay = 200; // 1件あたりの待機時間（ミリ秒）
        const batchSize = 50; // バッチサイズ
        const batchDelay = 2000; // バッチ間の待機時間（ミリ秒）
        
        const batchCount = Math.ceil(videoCount / batchSize);
        const totalTime = (videoCount * baseDelay) + (batchCount * batchDelay);
        
        return totalTime / (1000 * 60); // ミリ秒から分に変換
    }

    // 動画情報の一括更新
    async refreshSelectedVideos(selectedVideos) {
        const total = selectedVideos.length;
        let processed = 0;
        const batchSize = 50;

        try {
            for (let i = 0; i < selectedVideos.length; i++) {
                const video = selectedVideos[i];
                const videoId = video.dataset.id;
                const compositeId = video.dataset.compositeId;

                try {
                    // APIから最新の情報を取得
                    const videoInfo = await this.manager.fetchVideoInfo(videoId);
                    
                    // データベースの情報を更新
                    await this.manager.updateVideoInfo(compositeId, videoInfo);

                    processed++;
                    
                    // 進捗表示を更新
                    const progressText = `${processed}/${total} 件の動画を更新中...`;
                    video.style.opacity = '0.5';
                    
                } catch (error) {
                    console.error(`動画ID ${videoId} の更新に失敗:`, error);
                }

                // 200ミリ秒待機
                await new Promise(resolve => setTimeout(resolve, 200));

                // 50件ごとに2秒待機
                if (processed % batchSize === 0 && i < selectedVideos.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
            }

            // 完了後に一覧を再読み込み
            await this.loadVideos();
            alert(`${processed}件の動画情報を更新しました`);

        } catch (error) {
            throw new Error('動画情報の更新に失敗しました: ' + error.message);
        }
    }
} 