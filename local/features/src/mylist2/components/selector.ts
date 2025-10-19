import { Mylist2Manager } from "@/mylist2/components/manager-refactored";
import { MylistInfo } from "@/types/mylist-types";

/**
 * マイリスト選択モーダルを表示する関数
 * @returns 選択されたマイリストIDのPromise
 */
export async function showMylistSelector(): Promise<number> {
  const manager = new Mylist2Manager();

  // 既存のモーダルがあれば削除
  const existingModal = document.getElementById("mylistSelectorModal");
  if (existingModal) {
    existingModal.remove();
  }

  // マイリスト選択用のモーダルHTML
  const selectorHTML = `
    <div id="mylistSelectorModal" class="mylist-selector-modal">
        <div class="mylist-selector-content">
            <h3 style="margin-top: 0;">マイリストを選択</h3>
            <input type="text" id="selectorSearchInput" class="mylist-search-input" placeholder="マイリストを検索...">
            <div id="mylistList"></div>
            <div class="mylist-controls">
                <input type="text" id="newMylistName" placeholder="新規マイリスト名">
                <button id="createNewMylist">新規作成</button>
            </div>
            <button id="closeMylistSelector">閉じる</button>
        </div>
    </div>
  `;

  // スタイルを動的に挿入（元のCSS依存を解消）
  const selectorStyles = `
    .mylist-selector-modal {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      backdrop-filter: blur(5px);
    }

    .mylist-selector-content {
      background: linear-gradient(135deg, rgba(20, 20, 30, 0.98), rgba(30, 30, 45, 0.98));
      border-radius: 16px;
      padding: 24px;
      min-width: 400px;
      max-width: 500px;
      max-height: 80vh;
      overflow-y: auto;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: #ffffff;
    }

    .mylist-search-input {
      width: 100%;
      padding: 12px;
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 8px;
      background: rgba(255, 255, 255, 0.1);
      color: #ffffff;
      margin-bottom: 16px;
      box-sizing: border-box;
    }

    .mylist-search-input::placeholder {
      color: rgba(255, 255, 255, 0.6);
    }

    #mylistList {
      max-height: 300px;
      overflow-y: auto;
      margin-bottom: 16px;
    }

    .mylist-item {
      padding: 12px;
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      margin-bottom: 8px;
      cursor: pointer;
      transition: all 0.2s ease;
      background: rgba(255, 255, 255, 0.05);
    }

    .mylist-item:hover {
      background: rgba(255, 255, 255, 0.15);
      border-color: rgba(100, 150, 255, 0.5);
      transform: translateY(-1px);
    }

    .mylist-item.suggested {
      border-color: rgba(255, 193, 7, 0.6);
      background: rgba(255, 193, 7, 0.1);
    }

    .mylist-item.hidden {
      display: none;
    }

    .suggested-mylists h4 {
      color: #ffc107;
      margin: 0 0 12px 0;
      font-size: 14px;
    }

    .match-info {
      font-size: 12px;
      color: rgba(255, 255, 255, 0.7);
      margin-top: 4px;
    }

    .mylist-controls {
      display: flex;
      gap: 8px;
      margin-bottom: 16px;
    }

    .mylist-controls input {
      flex: 1;
      padding: 10px;
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 8px;
      background: rgba(255, 255, 255, 0.1);
      color: #ffffff;
    }

    .mylist-controls button, #closeMylistSelector {
      padding: 10px 16px;
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 8px;
      background: rgba(100, 150, 255, 0.2);
      color: #ffffff;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .mylist-controls button:hover, #closeMylistSelector:hover {
      background: rgba(100, 150, 255, 0.4);
      border-color: rgba(100, 150, 255, 0.6);
    }
  `;

  // スタイルシートを追加
  const styleElement = document.createElement('style');
  styleElement.textContent = selectorStyles;
  document.head.appendChild(styleElement);

  // HTMLの挿入
  document.body.insertAdjacentHTML("beforeend", selectorHTML);

  // 要素の取得
  const modal = document.getElementById("mylistSelectorModal");
  const mylistList = document.getElementById("mylistList");
  const newMylistName = document.getElementById("newMylistName") as HTMLInputElement;
  const createNewMylist = document.getElementById("createNewMylist");
  const closeButton = document.getElementById("closeMylistSelector");
  const searchInput = document.getElementById("selectorSearchInput") as HTMLInputElement;

  return new Promise<number>((resolve, reject) => {
    // マイリスト一覧の表示
    async function displayMylists(): Promise<void> {
      const db = await manager.getDB();
      const transaction = db.transaction(["mylists"], "readonly");
      const store = transaction.objectStore("mylists");
      const request = store.getAll();

      request.onsuccess = () => {
        const mylists = request.result as MylistInfo[];

        // 視聴ページの場合のみSuggested Mylistsを表示
        const isWatchPage = location.pathname.startsWith("/watch/");
        let suggestedMylists: MylistInfo[] = [];
        const matchDetails = new Map<number, string[]>(); // マッチ情報を保存するMap

        if (isWatchPage) {
          const tags = Array.from(document.querySelectorAll('a[data-anchor-page="watch"][data-anchor-area="tags"][href*="/tag/"]'))
            .map(tag => normalizeText(tag.textContent?.trim() || ""));
          
          suggestedMylists = mylists.filter(mylist => {
            const mylistNameNormalized = normalizeText(mylist.name);
            // 各タグとマイリスト名の共通部分を探す
            const matchedTags = tags.filter(tag => {
              const shorter = tag.length < mylistNameNormalized.length ? tag : mylistNameNormalized;
              const longer = tag.length < mylistNameNormalized.length ? mylistNameNormalized : tag;
              
              const words = shorter.split(/[\s ]/);
              return words.some(word => 
                word.length >= 2 && longer.includes(word)
              );
            });
            
            if (matchedTags.length > 0) {
              matchDetails.set(mylist.id!, matchedTags);
              return true;
            }
            return false;
          });
        }

        // Suggested Mylistsの表示
        const suggestedHTML =
          suggestedMylists.length > 0
            ? `
                <div class="suggested-mylists">
                    <h4>おすすめマイリスト</h4>
                    ${suggestedMylists
                      .map(
                        (mylist: MylistInfo) => `
                        <div class="mylist-item suggested" data-id="${mylist.id}">
                            <span class="mylist-name">${mylist.name}</span>
                            <div class="match-info">
                                マッチしたタグ: ${matchDetails.get(mylist.id!)?.join(", ") || ""}
                            </div>
                        </div>
                    `
                      )
                      .join("")}
                </div>
            `
            : "";

        // 通常のマイリスト一覧
        const regularHTML = mylists
          .map(
            (mylist: MylistInfo) => `
                <div class="mylist-item" data-id="${mylist.id}">
                    <span>${mylist.name}</span>
                </div>
            `
          )
          .join("");

        if (mylistList) {
          mylistList.innerHTML = suggestedHTML + regularHTML;
        }

        // イベントリスナーの設定
        document.querySelectorAll(".mylist-item").forEach((item) => {
          item.addEventListener("click", () => {
            const mylistId = parseInt((item as HTMLElement).dataset.id || "0");
            if (modal) {
              modal.remove();
            }
            // スタイルシートも削除
            styleElement.remove();
            resolve(mylistId);
          });
        });
      };
    }

    // 新規マイリスト作成
    if (createNewMylist) {
      createNewMylist.addEventListener("click", () => {
        const name = newMylistName?.value.trim() || "";
        if (name) {
          void manager.createMylist(name).then(() => displayMylists());
          if (newMylistName) {
            newMylistName.value = "";
          }
        }
      });
    }

    // モーダルを閉じる
    if (closeButton) {
      closeButton.addEventListener("click", () => {
        if (modal) {
          modal.remove();
        }
        // スタイルシートも削除
        styleElement.remove();
        reject(new Error("キャンセルされました"));
      });
    }

    // 初期表示
    void displayMylists();

    // 検索機能を追加
    if (searchInput) {
      searchInput.addEventListener("input", () => {
        const searchText = searchInput.value.toLowerCase();
        document.querySelectorAll(".mylist-item").forEach((item) => {
          const spanElement = item.querySelector("span");
          const mylistName = spanElement?.textContent?.toLowerCase() || "";
          if (mylistName.includes(searchText)) {
            item.classList.remove("hidden");
          } else {
            item.classList.add("hidden");
          }
        });
      });
    }
  });
}

/**
 * テキスト正規化関数
 * @param text 正規化する文字列
 * @returns 正規化された文字列
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[！-～]/g, function(s: string) {
      return String.fromCharCode(s.charCodeAt(0) - 0xFEE0);
    })
    .replace(/[""]/g, '"')
    .replace(/['']/g, "'")
    .replace(/[（）]/g, function(s: string) {
      return s === "（" ? "(" : ")";
    });
} 