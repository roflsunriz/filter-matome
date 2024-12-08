async function showMylistSelector() {
    const manager = new CustomMylist2Manager();
    
    // 既存のモーダルがあれば削除
    const existingModal = document.getElementById('mylistSelectorModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // マイリスト選択用のモーダルHTML
    const selectorHTML = `
        <div id="mylistSelectorModal" class="mylist-selector-modal">
            <div class="mylist-selector-content">
                <h3 style="margin-top: 0;">マイリストを選択</h3>
                <div id="mylistList"></div>
                <div class="mylist-controls">
                    <input type="text" id="newMylistName" placeholder="新規マイリスト名">
                    <button id="createNewMylist">新規作成</button>
                </div>
                <button id="closeMylistSelector">閉じる</button>
            </div>
        </div>
    `;

    // HTMLの挿入
    document.body.insertAdjacentHTML('beforeend', selectorHTML);

    // 要素の取得
    const modal = document.getElementById('mylistSelectorModal');
    const mylistList = document.getElementById('mylistList');
    const newMylistName = document.getElementById('newMylistName');
    const createNewMylist = document.getElementById('createNewMylist');
    const closeButton = document.getElementById('closeMylistSelector');

    return new Promise((resolve, reject) => {
        // マイリスト一覧の表示
        async function displayMylists() {
            const db = await manager.db.initDB();
            const transaction = db.transaction(['mylists'], 'readonly');
            const store = transaction.objectStore('mylists');
            const request = store.getAll();

            request.onsuccess = () => {
                const mylists = request.result;
                mylistList.innerHTML = mylists.map(mylist => `
                    <div class="mylist-item" data-id="${mylist.id}">
                        <span>${mylist.name}</span>
                    </div>
                `).join('');

                // マイリスト選択のイベントリスナー
                document.querySelectorAll('.mylist-item').forEach(item => {
                    item.addEventListener('click', () => {
                        const mylistId = parseInt(item.dataset.id);
                        modal.remove();
                        resolve(mylistId);
                    });
                });
            };
        }

        // 新規マイリスト作成
        createNewMylist.addEventListener('click', async () => {
            const name = newMylistName.value.trim();
            if (name) {
                await manager.createMylist(name);
                await displayMylists();
                newMylistName.value = '';
            }
        });

        // モーダルを閉じる
        closeButton.addEventListener('click', () => {
            modal.remove();
            reject(new Error('キャンセルされました'));
        });

        // 初期表示
        displayMylists();
    });
} 