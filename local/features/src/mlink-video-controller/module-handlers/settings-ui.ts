import { PageType } from "@/types/module-types";
// import { ToastrInstance } from '@/types/toastr-types';
import { createMaterialIcon } from "@/common/material-icons";
import { BackgroundImageItem } from "@/types/background-image-types";
import { SettingsUICore } from "./settings-ui-core";

const DEFAULT_BACKGROUND_IMAGE_URL_PREFIX =
  "https://www.nicovideo.jp/local/background-images/";

/** 設定の入出力と背景画像管理モーダル。 */
export class SettingsUI extends SettingsUICore {
  private static instance: SettingsUI;

  private constructor() {
    super();
  }

  public static getInstance(): SettingsUI {
    if (!SettingsUI.instance) {
      SettingsUI.instance = new SettingsUI();
    }
    return SettingsUI.instance;
  }

  /**
   * 設定をエクスポート
   */
  protected exportSettings(): void {
    try {
      const settings = this.settingsManager.exportSettings();
      const blob = new Blob([settings], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = this.generateExportFilename("module-settings");
      a.click();

      URL.revokeObjectURL(url);

      window.toastr?.success("設定をエクスポートしました", "成功", {
        timeOut: 3000,
      });
    } catch (error) {
      window.logger.error("[SettingsUI] 設定エクスポートに失敗:", error);
      window.toastr?.error("設定エクスポートに失敗しました", "エラー", {
        timeOut: 5000,
      });
    }
  }

  /**
   * 設定をインポート
   */
  protected importSettings(): void {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";

    input.onchange = (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const text = e.target?.result as string;
            const parsed: unknown = JSON.parse(text);
            if (typeof parsed === "string") {
              this.settingsManager.importSettings(parsed);
            } else {
              // 文字列以外は文字列化して取り込む（フォールバック）
              this.settingsManager.importSettings(JSON.stringify(parsed));
            }
            this.renderModuleList();

            window.toastr?.success("設定をインポートしました", "成功", {
              timeOut: 3000,
            });
          } catch (error) {
            window.logger.error("[SettingsUI] 設定インポートに失敗:", error);
            window.toastr?.error("設定インポートに失敗しました", "エラー", {
              timeOut: 5000,
            });
          }
        };
        reader.readAsText(file);
      }
    };

    input.click();
  }

  /**
   * 設定をリセット
   */
  protected resetSettings(): void {
    if (confirm("すべての設定をリセットしますか？この操作は元に戻せません。")) {
      try {
        this.settingsManager.resetSettings();
        this.renderModuleList();

        window.toastr?.success("設定をリセットしました", "成功", {
          timeOut: 3000,
        });
      } catch (error) {
        window.logger.error("[SettingsUI] 設定リセットに失敗:", error);
        window.toastr?.error("設定リセットに失敗しました", "エラー", {
          timeOut: 5000,
        });
      }
    }
  }

  /**
   * ユニークなファイル名を生成（エクスポート用）
   */
  protected generateExportFilename(prefix: string): string {
    const now = new Date();
    const dateStr = now.toISOString().split("T")[0]; // YYYY-MM-DD
    const timeStr = now.toTimeString().split(" ")[0].replace(/:/g, "-"); // HH-MM-SS
    const randomStr = Math.random().toString(36).substr(2, 4); // ランダム4文字

    return `${prefix}-${dateStr}_${timeStr}_${randomStr}.json`;
  }

  /**
   * 背景画像設定ボタンを追加
   */
  protected addBackgroundImageSettingsButton(container: HTMLElement): void {
    const settingsButton = document.createElement("div");
    settingsButton.className = "module-item module-item-config";
    settingsButton.innerHTML = `
      <div class="module-icon">${createMaterialIcon("image", { style: "outlined", color: "white" })}</div>
      <h3 class="module-name">背景画像設定</h3>
      <p class="module-description">動画の背景画像を設定します</p>
      <div class="module-meta">
        <span class="module-pages">${this.formatTargetPages([PageType.WATCH])}</span>
        <span class="module-status settings">設定</span>
      </div>
      <div class="module-actions">
        <div class="module-settings-slot">
          <button class="settings-btn module-settings-btn" id="open-background-settings">${createMaterialIcon("settings", { style: "outlined", color: "white" })} 設定</button>
        </div>
        <div class="module-toggle-slot"></div>
      </div>
    `;

    container.appendChild(settingsButton);

    // イベントリスナーを追加
    const openButton = settingsButton.querySelector(
      "#open-background-settings",
    );
    openButton?.addEventListener("click", () => {
      void this.openBackgroundImageSettings();
    });
  }

  /**
   * 背景画像設定画面を開く
   */
  protected async openBackgroundImageSettings(): Promise<void> {
    try {
      // 背景画像設定を初期化
      await this.backgroundSettings.initializeSettings();

      // 設定画面を作成
      this.createBackgroundSettingsModal();
    } catch (error) {
      window.logger.error("[SettingsUI] 背景画像設定の初期化に失敗:", error);
      window.toastr?.error("背景画像設定の初期化に失敗しました", "エラー", {
        timeOut: 5000,
      });
    }
  }

  /**
   * 背景画像設定モーダルを作成
   */
  protected createBackgroundSettingsModal(): void {
    if (!this.shadowRoot) return;

    // 既存のモーダルを削除
    const existingModal = this.shadowRoot.getElementById(
      "background-settings-modal",
    );
    if (existingModal) {
      existingModal.remove();
    }

    const modal = document.createElement("div");
    modal.id = "background-settings-modal";
    modal.className = "modal-overlay";
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h3>${createMaterialIcon("image", { style: "outlined", color: "white" })} 背景画像設定</h3>
          <button class="close-modal-btn">×</button>
        </div>
        
        <div class="modal-body">
          <div class="background-settings-grid">
            <div class="background-settings-main">
              <div class="settings-section">
                <h4>${createMaterialIcon("edit", { style: "outlined", color: "white" })} 方法1: URL入力</h4>
                <div class="url-input-section">
                  <input type="text" id="modal-image-url-input" value="${DEFAULT_BACKGROUND_IMAGE_URL_PREFIX}" placeholder="画像URLを入力してください" />
                  <input type="text" id="modal-image-name-input" placeholder="画像名を入力してください" />
                  <button id="modal-add-url-image" class="add-btn">URL画像を追加</button>
                </div>
              </div>

              <div class="settings-section">
                <h4>${createMaterialIcon("folder", { style: "outlined", color: "white" })} 方法2: ファイル選択</h4>
                <div class="file-input-section">
                  <input type="file" id="modal-image-file-input" accept="image/*" />
                  <input type="text" id="modal-file-name-input" placeholder="画像名を入力してください" />
                  <button id="modal-add-file-image" class="add-btn">ファイル画像を追加</button>
                </div>
              </div>

              <div class="settings-section">
                <h4>${createMaterialIcon("list", { style: "outlined", color: "white" })} 登録済み画像一覧</h4>
                <div id="modal-image-list" class="image-list"></div>
              </div>

              <div class="settings-section">
                <h4>${createMaterialIcon("build", { style: "outlined", color: "white" })} 設定管理</h4>
                <div class="settings-management">
                  <button id="modal-export-settings" class="management-btn export">${createMaterialIcon("upload", { style: "outlined", color: "white" })} 設定をエクスポート</button>
                  <button id="modal-import-settings" class="management-btn import">${createMaterialIcon("download", { style: "outlined", color: "white" })} 設定をインポート</button>
                  <button id="modal-reset-settings" class="management-btn reset">${createMaterialIcon("refresh", { style: "filled", color: "white" })} デフォルトに戻す</button>
                  <input type="file" id="modal-import-file-input" accept=".json" style="display: none;" />
                </div>
              </div>
            </div>

            <aside class="background-settings-help" aria-label="背景画像設定の使い方">
              <h4>${createMaterialIcon("help", { style: "outlined", color: "white" })} 使い方の目安</h4>
              <ol class="background-settings-help-steps">
                <li>画像を Squoosh などでブラウザが扱える形式に変換します。変換は必須ではありません。</li>
                <li>NicoCache_nl の <code>local/background-images/favorites</code> など、<code>local</code> 配下へ画像を置きます。</li>
                <li>URL入力では <code>https://www.nicovideo.jp/local/background-images/favorites/background1.avif</code> のように指定します。</li>
              </ol>
              <div class="background-settings-help-note">
                <strong>ファイル選択の場合</strong>
                <p>選択した画像は IndexedDB に base64 形式で保存されます。ブラウザのサイトデータ削除で消えるため、必要に応じて設定をエクスポートしてください。</p>
              </div>
              <div class="background-settings-help-note warning">
                <strong>外部 URL は非推奨</strong>
                <p><code>https://www.nicovideo.jp/local/</code> 以外の URL も指定できますが、外部サーバーへ負荷をかける可能性があります。</p>
              </div>
              <div class="background-settings-help-note">
                <strong>nico_wallpaperG 併用時</strong>
                <p>表示が衝突する場合は、背景セレクターとマトリックス背景のどちらを優先するかに合わせて無効化してください。</p>
              </div>
            </aside>
          </div>
        </div>
        
        <div class="modal-footer">
          <button class="modal-btn secondary" id="close-background-modal">閉じる</button>
        </div>
      </div>
    `;

    this.shadowRoot.appendChild(modal);

    // イベントリスナーを設定
    this.setupBackgroundModalEventListeners();
    this.focusModalUrlInput();

    // 画像リストを初期化
    void this.refreshModalImageList();
  }

  /**
   * URL欄へフォーカスし、プリ入力されたベースURLの末尾にカーソルを置く
   */
  protected focusModalUrlInput(): void {
    if (!this.shadowRoot) return;

    const urlInput = this.shadowRoot.querySelector<HTMLInputElement>(
      "#modal-image-url-input",
    );
    if (!urlInput) return;

    setTimeout(() => {
      urlInput.focus();
      const cursorPosition = urlInput.value.length;
      urlInput.setSelectionRange(cursorPosition, cursorPosition);
    }, 0);
  }

  /**
   * 背景画像設定モーダルのイベントリスナーを設定
   */
  protected setupBackgroundModalEventListeners(): void {
    if (!this.shadowRoot) return;

    const modal = this.shadowRoot.getElementById("background-settings-modal");
    if (!modal) return;

    // モーダルを閉じる
    const closeButtons = modal.querySelectorAll(
      ".close-modal-btn, #close-background-modal",
    );
    closeButtons.forEach((button) => {
      button.addEventListener("click", () => {
        modal.remove();
      });
    });

    // モーダル外クリックで閉じる
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });

    // キーボードイベントの伝搬を停止（誤爆防止）
    modal.addEventListener("keydown", (e) => {
      e.stopPropagation();
    });

    modal.addEventListener("keyup", (e) => {
      e.stopPropagation();
    });

    modal.addEventListener("keypress", (e) => {
      e.stopPropagation();
    });

    // URL画像追加
    const addUrlButton = modal.querySelector("#modal-add-url-image");
    addUrlButton?.addEventListener("click", () => {
      void this.addModalImageFromUrl();
    });

    // ファイル画像追加
    const addFileButton = modal.querySelector("#modal-add-file-image");
    addFileButton?.addEventListener("click", () => {
      void this.addModalImageFromFile();
    });

    // Enterキーでの追加
    const urlInput = modal.querySelector(
      "#modal-image-url-input",
    ) as HTMLInputElement;
    const nameInput = modal.querySelector(
      "#modal-image-name-input",
    ) as HTMLInputElement;

    [urlInput, nameInput].forEach((input) => {
      input?.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
          void this.addModalImageFromUrl();
        }
      });
    });

    const fileNameInput = modal.querySelector(
      "#modal-file-name-input",
    ) as HTMLInputElement;
    fileNameInput?.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        void this.addModalImageFromFile();
      }
    });

    // エクスポートボタン
    const exportButton = modal.querySelector("#modal-export-settings");
    exportButton?.addEventListener("click", () => {
      void this.exportModalSettings();
    });

    // インポートボタン
    const importButton = modal.querySelector("#modal-import-settings");
    importButton?.addEventListener("click", () => {
      const fileInput = modal.querySelector(
        "#modal-import-file-input",
      ) as HTMLInputElement;
      fileInput.click();
    });

    // インポートファイル選択
    const importFileInput = modal.querySelector(
      "#modal-import-file-input",
    ) as HTMLInputElement;
    importFileInput?.addEventListener("change", (e) => {
      const target = e.target as HTMLInputElement;
      const file = target.files?.[0];
      if (file) {
        void this.importModalSettings(file);
      }
    });

    // リセットボタン
    const resetButton = modal.querySelector("#modal-reset-settings");
    resetButton?.addEventListener("click", () => {
      void this.resetModalSettings();
    });
  }

  /**
   * モーダルでURL画像を追加
   */
  protected async addModalImageFromUrl(): Promise<void> {
    if (!this.shadowRoot) return;

    const modal = this.shadowRoot.getElementById("background-settings-modal");
    if (!modal) return;

    const urlInput = modal.querySelector(
      "#modal-image-url-input",
    ) as HTMLInputElement;
    const nameInput = modal.querySelector(
      "#modal-image-name-input",
    ) as HTMLInputElement;

    const url = urlInput.value.trim();
    const name = nameInput.value.trim();

    if (!url) {
      window.toastr?.warning("URLを入力してください", "入力エラー");
      return;
    }

    if (!name) {
      window.toastr?.warning("画像名を入力してください", "入力エラー");
      return;
    }

    try {
      // URL形式の検証
      let imageUrl = url;
      if (!url.startsWith("url(")) {
        imageUrl = `url("${url}")`;
      }

      // URLの有効性をチェック（オプション）
      const isValid = await this.backgroundSettings.validateImageUrl(url);
      if (!isValid) {
        const proceed = confirm(
          "画像URLの検証に失敗しました。それでも追加しますか？",
        );
        if (!proceed) return;
      }

      // 画像を追加
      await this.backgroundSettings.addImage(name, "url", imageUrl);

      // 入力フィールドをクリア
      urlInput.value = DEFAULT_BACKGROUND_IMAGE_URL_PREFIX;
      nameInput.value = "";
      this.focusModalUrlInput();

      // 画像リストを更新
      await this.refreshModalImageList();

      window.toastr?.success(`画像「${name}」を追加しました`, "成功");
    } catch (error) {
      window.logger.error("[SettingsUI] URL画像の追加に失敗:", error);
      window.toastr?.error("画像の追加に失敗しました", "エラー");
    }
  }

  /**
   * モーダルでファイル画像を追加
   */
  protected async addModalImageFromFile(): Promise<void> {
    if (!this.shadowRoot) return;

    const modal = this.shadowRoot.getElementById("background-settings-modal");
    if (!modal) return;

    const fileInput = modal.querySelector(
      "#modal-image-file-input",
    ) as HTMLInputElement;
    const nameInput = modal.querySelector(
      "#modal-file-name-input",
    ) as HTMLInputElement;

    const file = fileInput.files?.[0];
    const name = nameInput.value.trim();

    if (!file) {
      window.toastr?.warning("ファイルを選択してください", "入力エラー");
      return;
    }

    if (!name) {
      window.toastr?.warning("画像名を入力してください", "入力エラー");
      return;
    }

    try {
      // image-validatorでファイルの正当性を確認
      const isValidFile = await this.backgroundSettings.validateImageFile(file);
      if (!isValidFile) {
        window.toastr?.error("画像ファイルの検証に失敗しました", "検証エラー");
        return;
      }

      // ファイルをbase64に変換
      const base64Data = await this.backgroundSettings.fileToBase64(file);

      // 画像を追加
      await this.backgroundSettings.addImage(name, "file", base64Data);

      // 入力フィールドをクリア
      fileInput.value = "";
      nameInput.value = "";

      // 画像リストを更新
      await this.refreshModalImageList();

      window.toastr?.success(`画像「${name}」を追加しました`, "成功");
    } catch (error) {
      window.logger.error("[SettingsUI] ファイル画像の追加に失敗:", error);
      window.toastr?.error("画像の追加に失敗しました", "エラー");
    }
  }

  /**
   * モーダルの画像リストを更新
   */
  protected async refreshModalImageList(): Promise<void> {
    if (!this.shadowRoot) return;

    const imageListContainer =
      this.shadowRoot.getElementById("modal-image-list");
    if (!imageListContainer) return;

    try {
      const savedImages = await this.backgroundSettings.getAllImages();
      const currentImageId = this.backgroundSettings.getSelectedImageId();

      if (savedImages.length === 0) {
        imageListContainer.innerHTML =
          '<p class="no-images-message">登録されている画像がありません</p>';
        return;
      }

      imageListContainer.innerHTML = "";

      savedImages.forEach((image: BackgroundImageItem) => {
        const imageItem = document.createElement("div");
        imageItem.className = `image-item ${image.id === currentImageId ? "selected" : ""}`;

        // 画像のプレビュー用URL/データを決定
        let imageSrc: string;
        if (image.type === "url") {
          // URLタイプの場合、url()を除去して直接URLを取得
          imageSrc = image.data.replace(/^url\(["']?|["']?\)$/g, "");
        } else {
          // fileタイプの場合、base64データをそのまま使用
          imageSrc = image.data;
        }

        imageItem.innerHTML = `
          <div class="image-preview">
            <img src="${imageSrc}" alt="${image.name}" loading="lazy" />
          </div>
          <div class="image-info">
            <h5 class="image-name">${image.name}</h5>
            <p class="image-type">${image.type}</p>
            <p class="image-date">${new Date(image.createdAt).toLocaleDateString("ja-JP")}</p>
          </div>
          <div class="image-actions">
            <button class="image-select-btn" data-image-id="${image.id}" title="この画像を使用">
              ${image.id === currentImageId ? createMaterialIcon("check_circle", { style: "filled", color: "green" }) : createMaterialIcon("radio_button_unchecked", { style: "outlined", color: "white" })}
            </button>
            <button class="image-delete-btn" data-image-id="${image.id}" title="画像を削除">
              ${createMaterialIcon("delete_outline", { style: "outlined", color: "white" })}
            </button>
          </div>
        `;

        imageListContainer.appendChild(imageItem);
      });

      this.setupModalImageListEventListeners();
    } catch (error) {
      window.logger.error("[SettingsUI] 画像リストの更新に失敗:", error);
      imageListContainer.innerHTML =
        '<p class="error-message">画像リストの読み込みに失敗しました</p>';
    }
  }

  /**
   * モーダルの画像リストのイベントリスナーを設定
   */
  protected setupModalImageListEventListeners(): void {
    if (!this.shadowRoot) return;

    const modal = this.shadowRoot.getElementById("background-settings-modal");
    if (!modal) return;

    // 選択ボタン
    const selectButtons = modal.querySelectorAll(".image-select-btn");
    selectButtons.forEach((button) => {
      button.addEventListener("click", (e) => {
        void (async () => {
          const target = e.target as HTMLElement;
          // closestを使って.image-select-btnを確実に取得
          const selectButton = target.closest(
            ".image-select-btn",
          ) as HTMLElement;
          const imageId = selectButton?.getAttribute("data-image-id");
          if (imageId) {
            await this.selectModalImage(imageId);
          }
        })();
      });
    });

    // 削除ボタン
    const deleteButtons = modal.querySelectorAll(".image-delete-btn");
    deleteButtons.forEach((button) => {
      button.addEventListener("click", (e) => {
        void (async () => {
          const target = e.target as HTMLElement;
          // closestを使って.image-delete-btnを確実に取得
          const deleteButton = target.closest(
            ".image-delete-btn",
          ) as HTMLElement;
          const imageId = deleteButton?.getAttribute("data-image-id");
          if (imageId) {
            await this.deleteModalImage(imageId);
          }
        })();
      });
    });
  }

  /**
   * モーダルで画像を選択
   */
  protected async selectModalImage(imageId: string): Promise<void> {
    try {
      const image = await this.backgroundSettings.getImage(imageId);
      if (image) {
        await this.backgroundSettings.setSelectedImage(imageId);

        // 背景を即座に適用
        let backgroundValue: string;
        if (image.type === "url") {
          backgroundValue = image.data;
        } else if (image.type === "file") {
          backgroundValue = `url(${image.data})`;
        } else {
          return;
        }

        document.documentElement.style.setProperty("--bg-img", backgroundValue);

        await this.refreshModalImageList();
        window.toastr?.success(
          `背景画像を「${image.name}」に変更しました`,
          "成功",
        );
      }
    } catch (error) {
      window.logger.error("[SettingsUI] 画像の選択に失敗:", error);
      window.toastr?.error("画像の選択に失敗しました", "エラー");
    }
  }

  /**
   * モーダルで画像を削除
   */
  protected async deleteModalImage(imageId: string): Promise<void> {
    try {
      const image = await this.backgroundSettings.getImage(imageId);
      if (!image) return;

      const confirmed = confirm(`画像「${image.name}」を削除しますか？`);
      if (!confirmed) return;

      await this.backgroundSettings.deleteImage(imageId);
      await this.refreshModalImageList();

      window.toastr?.success(`画像「${image.name}」を削除しました`, "成功");
    } catch (error) {
      window.logger.error("[SettingsUI] 画像の削除に失敗:", error);
      window.toastr?.error("画像の削除に失敗しました", "エラー");
    }
  }

  /**
   * モーダルで設定をエクスポート
   */
  protected async exportModalSettings(): Promise<void> {
    try {
      const settingsData = await this.backgroundSettings.exportSettings();
      const blob = new Blob([settingsData], { type: "application/json" });
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = this.backgroundSettings.generateExportFilename();
      a.click();

      URL.revokeObjectURL(url);

      window.toastr?.success("背景画像設定をエクスポートしました", "成功", {
        timeOut: 3000,
      });
    } catch (error) {
      window.logger.error(
        "[SettingsUI] 背景画像設定エクスポートに失敗:",
        error,
      );
      window.toastr?.error("背景画像設定エクスポートに失敗しました", "エラー", {
        timeOut: 5000,
      });
    }
  }

  /**
   * モーダルで設定をインポート
   */
  protected async importModalSettings(file: File): Promise<void> {
    try {
      await Promise.resolve();
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const settingsData = e.target?.result as string;
          await this.backgroundSettings.importSettings(settingsData);
          await this.refreshModalImageList();

          window.toastr?.success("背景画像設定をインポートしました", "成功", {
            timeOut: 3000,
          });
        } catch (importError) {
          window.logger.error(
            "[SettingsUI] インポートデータの処理に失敗:",
            importError,
          );
          window.toastr?.error(
            "インポートデータの処理に失敗しました",
            "エラー",
            { timeOut: 5000 },
          );
        }
      };
      reader.readAsText(file);
    } catch (error) {
      window.logger.error("[SettingsUI] 背景画像設定インポートに失敗:", error);
      window.toastr?.error("背景画像設定インポートに失敗しました", "エラー", {
        timeOut: 5000,
      });
    }
  }

  /**
   * モーダルで設定をリセット
   */
  protected async resetModalSettings(): Promise<void> {
    if (
      confirm(
        "背景画像設定をデフォルトに戻しますか？現在の設定は全て削除されます。",
      )
    ) {
      try {
        await this.backgroundSettings.resetToDefaults();
        await this.refreshModalImageList();

        window.toastr?.success("背景画像設定をデフォルトに戻しました", "成功", {
          timeOut: 3000,
        });
      } catch (error) {
        window.logger.error("[SettingsUI] 背景画像設定リセットに失敗:", error);
        window.toastr?.error("背景画像設定リセットに失敗しました", "エラー", {
          timeOut: 5000,
        });
      }
    }
  }
}
