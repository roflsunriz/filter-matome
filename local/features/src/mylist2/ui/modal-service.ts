import "@/types/global.d.ts";

import { createMaterialIcon, ICONS } from "@/common/material-icons";
import { BatchApiOptions, MylistInfo } from "@/types/mylist-types";

export class ModalService {
  // カスタムアラートの実装
  showCustomAlert(
    message: string,
    type = "info",
    title = "",
  ): Promise<boolean> {
    return new Promise((resolve) => {
      // お知らせ表示時は進捗モーダルを一時的に隠す
      const progressModal = document.getElementById("progressModal");
      const wasProgressVisible = progressModal
        ? getComputedStyle(progressModal).display !== "none"
        : false;
      if (progressModal && wasProgressVisible) {
        progressModal.style.display = "none";
      }
      const modalHTML = `
        <div class="cml2-alert-modal">
          <div class="cml2-alert-content ${type}">
            ${title ? `<h3 class="cml2-alert-title">${title}</h3>` : ""}
            <div class="cml2-alert-message">${message}</div>
            <div class="cml2-alert-buttons">
              <button class="cml2-btn" id="alertOkButton">${createMaterialIcon(ICONS.check, { color: "white" })}OK</button>
            </div>
          </div>
        </div>
      `;

      // document.body に直接マウントすることで、#Mylist2Manager のスタッキングコンテキストから独立
      document.body.insertAdjacentHTML("beforeend", modalHTML);
      const modal = document.querySelector(".cml2-alert-modal") as HTMLElement;
      const okButton = document.getElementById(
        "alertOkButton",
      ) as HTMLButtonElement;

      if (!modal || !okButton) {
        window.logger.error("アラートモーダルの要素が作成できませんでした");
        resolve(false);
        return;
      }

      modal.style.display = "flex";
      const onKey = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          modal.remove();
          document.removeEventListener("keydown", onKey);
          modal.removeEventListener("click", onBackdrop);
          if (progressModal && wasProgressVisible)
            progressModal.style.display = "flex";
          resolve(false);
        }
      };
      const onBackdrop = (e: MouseEvent) => {
        if (e.target === modal) {
          modal.remove();
          document.removeEventListener("keydown", onKey);
          modal.removeEventListener("click", onBackdrop);
          if (progressModal && wasProgressVisible)
            progressModal.style.display = "flex";
          resolve(false);
        }
      };
      document.addEventListener("keydown", onKey);
      modal.addEventListener("click", onBackdrop);

      okButton.addEventListener("click", () => {
        document.removeEventListener("keydown", onKey);
        modal.removeEventListener("click", onBackdrop);
        modal.remove();
        if (progressModal && wasProgressVisible)
          progressModal.style.display = "flex";
        resolve(true);
      });
    });
  }

  // カスタム確認ダイアログの実装
  showCustomConfirm(
    message: string,
    type = "warning",
    title = "",
  ): Promise<boolean> {
    return new Promise((resolve) => {
      // お知らせ表示時は進捗モーダルを一時的に隠す
      const progressModal = document.getElementById("progressModal");
      const wasProgressVisible = progressModal
        ? getComputedStyle(progressModal).display !== "none"
        : false;
      if (progressModal && wasProgressVisible) {
        progressModal.style.display = "none";
      }
      const modalHTML = `
        <div class="cml2-alert-modal">
          <div class="cml2-alert-content ${type}">
            ${title ? `<h3 class="cml2-alert-title">${title}</h3>` : ""}
            <div class="cml2-alert-message">${message}</div>
            <div class="cml2-alert-buttons">
              <button class="cml2-btn" id="confirmCancelButton">${createMaterialIcon(ICONS.close, { color: "white" })}キャンセル</button>
              <button class="cml2-btn" id="confirmOkButton">${createMaterialIcon(ICONS.check, { color: "white" })}OK</button>
            </div>
          </div>
        </div>
      `;

      // document.body に直接マウントすることで、#Mylist2Manager のスタッキングコンテキストから独立
      document.body.insertAdjacentHTML("beforeend", modalHTML);
      const modal = document.querySelector(".cml2-alert-modal") as HTMLElement;
      const okButton = document.getElementById(
        "confirmOkButton",
      ) as HTMLButtonElement;
      const cancelButton = document.getElementById(
        "confirmCancelButton",
      ) as HTMLButtonElement;

      if (!modal || !okButton || !cancelButton) {
        window.logger.error("確認モーダルの要素が作成できませんでした");
        resolve(false);
        return;
      }

      modal.style.display = "flex";
      const cleanup = (result: boolean) => {
        document.removeEventListener("keydown", onKey);
        modal.removeEventListener("click", onBackdrop);
        modal.remove();
        if (progressModal && wasProgressVisible)
          progressModal.style.display = "flex";
        resolve(result);
      };
      const onKey = (e: KeyboardEvent) => {
        if (e.key === "Escape") cleanup(false);
      };
      const onBackdrop = (e: MouseEvent) => {
        if (e.target === modal) cleanup(false);
      };
      document.addEventListener("keydown", onKey);
      modal.addEventListener("click", onBackdrop);

      okButton.addEventListener("click", () => {
        cleanup(true);
      });
      cancelButton.addEventListener("click", () => {
        cleanup(false);
      });
    });
  }

  // マイリスト選択モーダルを表示する共通関数
  async showMylistSelectModal(
    action: string,
    mylists: MylistInfo[],
    currentMylistId: number | null,
    title = "",
  ): Promise<number | null> {
    try {
      // 現在のマイリストを除外
      const availableMylists = mylists.filter(
        (mylist) => mylist.id !== currentMylistId,
      );

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
                    (mylist) =>
                      `<option value="${mylist.id}">${mylist.name}</option>`,
                  )
                  .join("")}
              </select>
            </div>
            <div class="cml2-modal-footer">
              <button class="cml2-btn" id="cancelAction">${createMaterialIcon(ICONS.close, { color: "white" })}キャンセル</button>
              <button class="cml2-btn" id="confirmAction">${createMaterialIcon(ICONS.check, { color: "white" })}OK</button>
            </div>
          </div>
        </div>
      `;

      // document.body に直接マウントすることで、#Mylist2Manager のスタッキングコンテキストから独立
      document.body.insertAdjacentHTML("beforeend", modalHTML);

      return new Promise<number | null>((resolve) => {
        const modal = document.querySelector(".cml2-modal") as HTMLElement;
        const confirmBtn = document.getElementById(
          "confirmAction",
        ) as HTMLButtonElement;
        const cancelBtn = document.getElementById(
          "cancelAction",
        ) as HTMLButtonElement;
        const select = document.getElementById(
          "targetMylist",
        ) as HTMLSelectElement;

        if (!modal || !confirmBtn || !cancelBtn || !select) {
          window.logger.error(
            "マイリスト選択モーダルの要素が作成できませんでした",
          );
          resolve(null);
          return;
        }

        const cleanup = (res: number | null) => {
          document.removeEventListener("keydown", onKey);
          modal.removeEventListener("click", onBackdrop);
          modal.remove();
          resolve(res);
        };
        const onKey = (e: KeyboardEvent) => {
          if (e.key === "Escape") cleanup(null);
        };
        const onBackdrop = (e: MouseEvent) => {
          if (e.target === modal) cleanup(null);
        };
        confirmBtn.addEventListener("click", () => {
          const selectedId = parseInt(select.value);
          cleanup(Number.isNaN(selectedId) ? null : selectedId);
        });

        cancelBtn.addEventListener("click", () => {
          cleanup(null);
        });
        document.addEventListener("keydown", onKey);
        modal.addEventListener("click", onBackdrop);
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "マイリスト選択に失敗しました";
      await this.showCustomAlert(errorMessage);
      return null;
    }
  }

  // キーワード編集モーダルを表示する関数
  async showKeywordEditModal(
    keywordId: number,
    currentKeyword: string,
  ): Promise<string | null> {
    return new Promise((resolve) => {
      const modal = document.getElementById("keywordEditModal");
      if (!modal) {
        window.logger.error("キーワード編集モーダルが見つかりません");
        resolve(null);
        return;
      }

      const input = modal.querySelector(
        "#editKeywordInput",
      ) as HTMLInputElement;
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
      modal.style.display = "flex";

      // クローズボタンのイベントリスナー
      const closeHandler = () => {
        modal.style.display = "none";
        closeButton.removeEventListener("click", closeHandler);
        saveButton.removeEventListener("click", saveHandler);
        resolve(null);
      };

      // 保存ボタンのイベントリスナー
      const saveHandler = () => {
        const newKeyword = input.value;
        modal.style.display = "none";
        closeButton.removeEventListener("click", closeHandler);
        saveButton.removeEventListener("click", saveHandler);
        resolve(newKeyword);
      };

      closeButton.addEventListener("click", closeHandler);
      saveButton.addEventListener("click", saveHandler);
    });
  }

  // エクスポートオプションモーダル
  async showExportOptionsModal(): Promise<{
    action: "local" | "cloud" | "cancel";
  }> {
    return new Promise((resolve) => {
      const html = `
        <div class="cml2-modal" style="display:flex">
          <div class="cml2-modal-content">
            <h3 class="cml2-modal-title">エクスポート方法を選択</h3>
            <div class="cml2-modal-body">
              <div style="display:flex; flex-direction:column; gap:8px">
                <button class="cml2-btn" id="exportLocal">${createMaterialIcon(ICONS.download, { color: "white" })}ローカルに保存</button>
                <button class="cml2-btn" id="exportCloud">${createMaterialIcon(ICONS.cloud_upload, { color: "white" })}クラウドにバックアップ</button>
              </div>
            </div>
            <div class="cml2-modal-footer">
              <button class="cml2-btn" id="exportCancel">${createMaterialIcon(ICONS.close, { color: "white" })}キャンセル</button>
            </div>
          </div>
        </div>`;
      // document.body に直接マウントすることで、#Mylist2Manager のスタッキングコンテキストから独立
      document.body.insertAdjacentHTML("beforeend", html);
      const modal = document.querySelector(".cml2-modal") as HTMLElement;
      const cleanup = () => {
        document.removeEventListener("keydown", onKey);
        modal?.removeEventListener("click", onBackdrop);
        modal?.remove();
      };
      const onKey = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          cleanup();
          resolve({ action: "cancel" });
        }
      };
      const onBackdrop = (e: MouseEvent) => {
        if (e.target === modal) {
          cleanup();
          resolve({ action: "cancel" });
        }
      };
      const bind = (id: string, result: "local" | "cloud" | "cancel") => {
        const el = document.getElementById(id);
        if (el)
          el.addEventListener("click", () => {
            cleanup();
            resolve({ action: result });
          });
      };
      bind("exportLocal", "local");
      bind("exportCloud", "cloud");
      bind("exportCancel", "cancel");
      document.addEventListener("keydown", onKey);
      modal.addEventListener("click", onBackdrop);
    });
  }

  // インポートオプションモーダル
  async showImportOptionsModal(): Promise<{
    action: "local" | "clear" | "cloud" | "cancel";
  }> {
    return new Promise((resolve) => {
      const html = `
        <div class="cml2-modal" style="display:flex">
          <div class="cml2-modal-content">
            <h3 class="cml2-modal-title">インポート方法を選択</h3>
            <div class="cml2-modal-body">
              <div style="display:flex; flex-direction:column; gap:8px">
                <button class="cml2-btn" id="importLocal">${createMaterialIcon(ICONS.upload, { color: "white" })}ローカルからインポート</button>
                <button class="cml2-btn" id="importClear">${createMaterialIcon(ICONS.delete, { color: "white" })}データベースのクリア</button>
                <button class="cml2-btn" id="importCloud">${createMaterialIcon(ICONS.cloud_download, { color: "white" })}クラウドからインポート</button>
              </div>
            </div>
            <div class="cml2-modal-footer">
              <button class="cml2-btn" id="importCancel">${createMaterialIcon(ICONS.close, { color: "white" })}キャンセル</button>
            </div>
          </div>
        </div>`;
      // document.body に直接マウントすることで、#Mylist2Manager のスタッキングコンテキストから独立
      document.body.insertAdjacentHTML("beforeend", html);
      const modal = document.querySelector(".cml2-modal") as HTMLElement;
      const cleanup = () => {
        document.removeEventListener("keydown", onKey);
        modal?.removeEventListener("click", onBackdrop);
        modal?.remove();
      };
      const bind = (
        id: string,
        result: "local" | "clear" | "cloud" | "cancel",
      ) => {
        const el = document.getElementById(id);
        if (el)
          el.addEventListener("click", () => {
            cleanup();
            resolve({ action: result });
          });
      };
      bind("importLocal", "local");
      bind("importClear", "clear");
      bind("importCloud", "cloud");
      bind("importCancel", "cancel");
      const onKey = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          cleanup();
          resolve({ action: "cancel" });
        }
      };
      const onBackdrop = (e: MouseEvent) => {
        if (e.target === modal) {
          cleanup();
          resolve({ action: "cancel" });
        }
      };
      document.addEventListener("keydown", onKey);
      modal.addEventListener("click", onBackdrop);
    });
  }

  // 汎用選択モーダル（セレクトで一つ選ぶ）
  async showSelectionModal(
    title: string,
    items: Array<{ id: string; label: string; subLabel?: string }>,
    confirmText = "OK",
  ): Promise<string | null> {
    return new Promise((resolve) => {
      const html = `
        <div class="cml2-modal" style="display:flex">
          <div class="cml2-modal-content">
            <h3 class="cml2-modal-title">${title}</h3>
            <div class="cml2-modal-body">
              <select class="cml2-select" id="cml2Selection">
                ${items.map((it) => `<option value="${it.id}">${it.label}${it.subLabel ? ` - ${it.subLabel}` : ""}</option>`).join("")}
              </select>
            </div>
            <div class="cml2-modal-footer">
              <button class="cml2-btn" id="cml2SelectionCancel">${createMaterialIcon(ICONS.close, { color: "white" })}キャンセル</button>
              <button class="cml2-btn" id="cml2SelectionOk">${createMaterialIcon(ICONS.check, { color: "white" })}${confirmText}</button>
            </div>
          </div>
        </div>`;
      // document.body に直接マウントすることで、#Mylist2Manager のスタッキングコンテキストから独立
      document.body.insertAdjacentHTML("beforeend", html);
      const modal = document.querySelector(".cml2-modal") as HTMLElement;
      const select = document.getElementById(
        "cml2Selection",
      ) as HTMLSelectElement | null;
      const ok = document.getElementById("cml2SelectionOk");
      const cancel = document.getElementById("cml2SelectionCancel");
      if (!modal || !select || !ok || !cancel) {
        resolve(null);
        return;
      }
      const cleanup = (res: string | null) => {
        document.removeEventListener("keydown", onKey);
        modal.removeEventListener("click", onBackdrop);
        modal.remove();
        resolve(res);
      };
      const onKey = (e: KeyboardEvent) => {
        if (e.key === "Escape") cleanup(null);
      };
      const onBackdrop = (e: MouseEvent) => {
        if (e.target === modal) cleanup(null);
      };
      ok.addEventListener("click", () => {
        const v = select.value;
        cleanup(v || null);
      });
      cancel.addEventListener("click", () => {
        cleanup(null);
      });
      document.addEventListener("keydown", onKey);
      modal.addEventListener("click", onBackdrop);
    });
  }

  async showBatchApiOptionsModal(
    title: string,
    totalCount: number,
    defaults: BatchApiOptions = { concurrency: 3, delayMs: 200 },
  ): Promise<BatchApiOptions | null> {
    return new Promise((resolve) => {
      const html = `
        <div class="cml2-modal" style="display:flex">
          <div class="cml2-modal-content">
            <h3 class="cml2-modal-title">${title}</h3>
            <div class="cml2-modal-body">
              <p class="cml2-batch-api-summary">対象: ${totalCount.toLocaleString()}件</p>
              <label class="cml2-batch-api-field">
                <span>並列数</span>
                <input id="cml2BatchConcurrency" type="number" min="1" max="20" step="1" value="${defaults.concurrency}">
              </label>
              <label class="cml2-batch-api-field">
                <span>開始ディレイ(ms)</span>
                <input id="cml2BatchDelay" type="number" min="0" max="10000" step="50" value="${defaults.delayMs}">
              </label>
            </div>
            <div class="cml2-modal-footer">
              <button class="cml2-btn" id="cml2BatchCancel">${createMaterialIcon(ICONS.close, { color: "white" })}キャンセル</button>
              <button class="cml2-btn" id="cml2BatchStart">${createMaterialIcon(ICONS.check, { color: "white" })}開始</button>
            </div>
          </div>
        </div>`;

      document.body.insertAdjacentHTML("beforeend", html);
      const modal = document.querySelector<HTMLElement>(".cml2-modal");
      const concurrencyInput = document.getElementById(
        "cml2BatchConcurrency",
      ) as HTMLInputElement | null;
      const delayInput = document.getElementById(
        "cml2BatchDelay",
      ) as HTMLInputElement | null;
      const startButton = document.getElementById("cml2BatchStart");
      const cancelButton = document.getElementById("cml2BatchCancel");

      if (
        !modal ||
        !concurrencyInput ||
        !delayInput ||
        !startButton ||
        !cancelButton
      ) {
        resolve(null);
        return;
      }

      const cleanup = (result: BatchApiOptions | null) => {
        document.removeEventListener("keydown", onKey);
        modal.removeEventListener("click", onBackdrop);
        modal.remove();
        resolve(result);
      };
      const parseOptions = (): BatchApiOptions => ({
        concurrency: Math.max(
          1,
          Math.min(20, parseInt(concurrencyInput.value, 10) || 1),
        ),
        delayMs: Math.max(0, parseInt(delayInput.value, 10) || 0),
      });
      const onKey = (e: KeyboardEvent) => {
        if (e.key === "Escape") cleanup(null);
      };
      const onBackdrop = (e: MouseEvent) => {
        if (e.target === modal) cleanup(null);
      };

      startButton.addEventListener("click", () => cleanup(parseOptions()));
      cancelButton.addEventListener("click", () => cleanup(null));
      document.addEventListener("keydown", onKey);
      modal.addEventListener("click", onBackdrop);
    });
  }
}
