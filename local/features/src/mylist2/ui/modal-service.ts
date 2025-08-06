import "../../types/global.d.ts";

import { createMaterialIcon, ICONS } from "../../common/material-icons.js";
import { MylistInfo } from "../../types/mylist-types.js";

export class ModalService {
  
  // カスタムアラートの実装
  showCustomAlert(message: string, type = "info", title = ""): Promise<boolean> {
    return new Promise((resolve) => {
      const modalHTML = `
        <div class="cml2-alert-modal">
          <div class="cml2-alert-content ${type}">
            ${title ? `<h3 class="cml2-alert-title">${title}</h3>` : ""}
            <div class="cml2-alert-message">${message}</div>
            <div class="cml2-alert-buttons">
              <button class="cml2-btn" id="alertOkButton">${createMaterialIcon(ICONS.check, { color: 'white' })}OK</button>
            </div>
          </div>
        </div>
      `;

      document.body.insertAdjacentHTML("beforeend", modalHTML);
      const modal = document.querySelector(".cml2-alert-modal") as HTMLElement;
      const okButton = document.getElementById("alertOkButton") as HTMLButtonElement;

      if (!modal || !okButton) {
        window.logger.error("アラートモーダルの要素が作成できませんでした");
        resolve(false);
        return;
      }

      modal.style.display = "flex";

      okButton.addEventListener("click", () => {
        modal.remove();
        resolve(true);
      });
    });
  }

  // カスタム確認ダイアログの実装
  showCustomConfirm(message: string, type = "warning", title = ""): Promise<boolean> {
    return new Promise((resolve) => {
      const modalHTML = `
        <div class="cml2-alert-modal">
          <div class="cml2-alert-content ${type}">
            ${title ? `<h3 class="cml2-alert-title">${title}</h3>` : ""}
            <div class="cml2-alert-message">${message}</div>
            <div class="cml2-alert-buttons">
              <button class="cml2-btn" id="confirmCancelButton">${createMaterialIcon(ICONS.close, { color: 'white' })}キャンセル</button>
              <button class="cml2-btn" id="confirmOkButton">${createMaterialIcon(ICONS.check, { color: 'white' })}OK</button>
            </div>
          </div>
        </div>
      `;

      document.body.insertAdjacentHTML("beforeend", modalHTML);
      const modal = document.querySelector(".cml2-alert-modal") as HTMLElement;
      const okButton = document.getElementById("confirmOkButton") as HTMLButtonElement;
      const cancelButton = document.getElementById("confirmCancelButton") as HTMLButtonElement;
      
      if (!modal || !okButton || !cancelButton) {
        window.logger.error("確認モーダルの要素が作成できませんでした");
        resolve(false);
        return;
      }

      modal.style.display = "flex";

      okButton.addEventListener("click", () => {
        modal.remove();
        resolve(true);
      });

      cancelButton.addEventListener("click", () => {
        modal.remove();
        resolve(false);
      });
    });
  }

  // マイリスト選択モーダルを表示する共通関数
  async showMylistSelectModal(
    action: string, 
    mylists: MylistInfo[], 
    currentMylistId: number | null,
    title = ""
  ): Promise<number | null> {
    try {
      // 現在のマイリストを除外
      const availableMylists = mylists.filter((mylist) => mylist.id !== currentMylistId);

      if (availableMylists.length === 0) {
        throw new Error("移動先のマイリストがありません");
      }

      // モーダルの作成（タイトル表示を条件分岐）
      const modalHTML = `
        <div class="cml2-modal">
          <div class="cml2-modal-content">
            <h3 class="cml2-modal-title">
              ${title ? `「${title}」を${action}` : `選択した項目を${action}`}
            </h3>
            <div class="cml2-modal-body">
              <select class="cml2-select" id="targetMylist">
                ${availableMylists
                  .map(
                    (mylist) => `<option value="${mylist.id}">${mylist.name}</option>`
                  )
                  .join("")}
              </select>
            </div>
            <div class="cml2-modal-footer">
              <button class="cml2-btn" id="cancelAction">${createMaterialIcon(ICONS.close, { color: 'white' })}キャンセル</button>
              <button class="cml2-btn" id="confirmAction">${createMaterialIcon(ICONS.check, { color: 'white' })}OK</button>
            </div>
          </div>
        </div>
      `;

      document.body.insertAdjacentHTML("beforeend", modalHTML);

      return new Promise<number | null>((resolve) => {
        const modal = document.querySelector(".cml2-modal") as HTMLElement;
        const confirmBtn = document.getElementById("confirmAction") as HTMLButtonElement;
        const cancelBtn = document.getElementById("cancelAction") as HTMLButtonElement;
        const select = document.getElementById("targetMylist") as HTMLSelectElement;
        
        if (!modal || !confirmBtn || !cancelBtn || !select) {
          window.logger.error("マイリスト選択モーダルの要素が作成できませんでした");
          resolve(null);
          return;
        }

        confirmBtn.addEventListener("click", () => {
          const selectedId = parseInt(select.value);
          modal.remove();
          resolve(selectedId);
        });

        cancelBtn.addEventListener("click", () => {
          modal.remove();
          resolve(null);
        });
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "マイリスト選択に失敗しました";
      await this.showCustomAlert(errorMessage);
      return null;
    }
  }

  // キーワード編集モーダルを表示する関数
  async showKeywordEditModal(keywordId: number, currentKeyword: string): Promise<string | null> {
    return new Promise((resolve) => {
      const modal = document.getElementById("keywordEditModal");
      if (!modal) {
        window.logger.error("キーワード編集モーダルが見つかりません");
        resolve(null);
        return;
      }
      
      const input = modal.querySelector("#editKeywordInput") as HTMLInputElement;
      const closeButton = modal.querySelector(".close-button");
      const saveButton = modal.querySelector("#saveKeywordEdit");
      
      if (!input || !closeButton || !saveButton) {
        window.logger.error("キーワード編集モーダルの要素が見つかりません");
        resolve(null);
        return;
      }

      // 現在のキーワードを入力欄にセット
      input.value = currentKeyword;

      // モーダルを表示
      (modal as HTMLElement).style.display = "flex";

      // クローズボタンのイベントリスナー
      const closeHandler = () => {
        (modal as HTMLElement).style.display = "none";
        closeButton.removeEventListener("click", closeHandler);
        saveButton.removeEventListener("click", saveHandler);
        resolve(null);
      };

      // 保存ボタンのイベントリスナー
      const saveHandler = () => {
        const newKeyword = input.value;
        (modal as HTMLElement).style.display = "none";
        closeButton.removeEventListener("click", closeHandler);
        saveButton.removeEventListener("click", saveHandler);
        resolve(newKeyword);
      };

      closeButton.addEventListener("click", closeHandler);
      saveButton.addEventListener("click", saveHandler);
    });
  }
} 