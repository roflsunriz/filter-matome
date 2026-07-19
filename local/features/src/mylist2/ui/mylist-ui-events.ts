import "@/types/global.d.ts";

import type { ExportData, KeywordInfo, MylistInfo } from "@/types/mylist-types";
import { DBVideo as VideoInfo } from "@/types/video-types";

import { Mylist2UIRendering } from "./mylist-ui-rendering";

/** 画面操作イベントの配線。 */
export abstract class Mylist2UIEvents extends Mylist2UIRendering {
  // 残りのメソッド実装
  initializeEventListeners(): void {
    // ソートイベントはinitializeSettingsで設定されるため、ここでは設定しない

    const createNewMylistElement = document.getElementById("createNewMylist");
    if (createNewMylistElement) {
      createNewMylistElement.addEventListener(
        "click",
        this.guardEvent(async () => {
          const nameInput = document.getElementById(
            "newMylistName",
          ) as HTMLInputElement;
          if (!nameInput) {
            await this.showCustomAlert("マイリスト名入力欄が見つかりません");
            return;
          }

          try {
            const name = this.validateInput(nameInput.value, "mylistName");
            await this.manager.createMylist(name);
            nameInput.value = "";
            void this.loadMylists();
          } catch (error) {
            window.logger.error("マイリストの作成に失敗しました:", error);
            const errorMessage =
              error instanceof Error
                ? error.message
                : "マイリストの作成に失敗しました";
            await this.showCustomAlert(errorMessage);
          }
        }),
      );
    }

    // 動画ソートイベントもinitializeSettingsで設定されるため、ここでは設定しない

    // 動画追加ボタンのイベントリスナー
    const addVideoElement = document.getElementById("addVideo");
    if (addVideoElement) {
      addVideoElement.addEventListener(
        "click",
        this.guardEvent(async () => {
          if (!this.currentMylistId) {
            await this.showCustomAlert("マイリストを選択してください");
            return;
          }

          const input = document.getElementById(
            "videoIdInput",
          ) as HTMLInputElement;
          if (!input) {
            await this.showCustomAlert("動画ID入力欄が見つかりません");
            return;
          }

          try {
            const videoUrl = this.validateInput(input.value, "videoId");

            // URLから動画IDを抽出
            let videoId: string;
            if (
              videoUrl.includes("nicovideo.jp") ||
              videoUrl.includes("nico.ms")
            ) {
              const match = videoUrl.match(/(?:sm|so|nm|nx)\d+/);
              if (!match) {
                throw new Error("動画IDを抽出できませんでした");
              }
              videoId = match[0];
            } else {
              videoId = videoUrl;
            }

            // 動画情報を取得してマイリストに追加
            const videoInfo = await this.manager.fetchVideoInfo(videoId);
            await this.manager.addVideo(this.currentMylistId, videoInfo);

            // 入力フォームをクリアして動画一覧を更新
            input.value = "";
            await this.loadVideos();

            await this.showCustomAlert("動画を追加しました");
          } catch (error) {
            window.logger.error("動画の追加に失敗しました:", error);
            const errorMessage =
              error instanceof Error
                ? error.message
                : "動画の追加に失敗しました";
            await this.showCustomAlert(errorMessage);
          }
        }),
      );
    }

    // Enterキーでも追加できるように
    const videoIdInputElement = document.getElementById("videoIdInput");
    if (videoIdInputElement) {
      videoIdInputElement.addEventListener("keypress", (event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          const addVideoButton = document.getElementById("addVideo");
          if (addVideoButton) {
            (addVideoButton as HTMLButtonElement).click();
          }
        }
      });
    }

    // キーワード追加ボタンのイベントリスナー
    const addKeywordElement = document.getElementById("addKeyword");
    if (addKeywordElement) {
      addKeywordElement.addEventListener(
        "click",
        this.guardEvent(async () => {
          if (!this.currentMylistId) {
            await this.showCustomAlert("マイリストを選択してください");
            return;
          }

          const input = document.getElementById(
            "keywordInput",
          ) as HTMLInputElement;
          if (!input) {
            await this.showCustomAlert("キーワード入力欄が見つかりません");
            return;
          }

          try {
            const keyword = this.validateInput(input.value, "text");
            await this.manager.addKeyword(this.currentMylistId, keyword);
            input.value = "";
            await this.loadVideos();
            await this.showCustomAlert("キーワードを追加しました");
          } catch (error) {
            window.logger.error("キーワードの追加に失敗しました:", error);
            const errorMessage =
              error instanceof Error
                ? error.message
                : "キーワードの追加に失敗しました";
            await this.showCustomAlert(errorMessage);
          }
        }),
      );
    }

    // キーワード入力でもEnterキーで追加
    const keywordInputElement = document.getElementById("keywordInput");
    if (keywordInputElement) {
      keywordInputElement.addEventListener("keypress", (event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          const addKeywordElement = document.getElementById("addKeyword");
          if (addKeywordElement) {
            addKeywordElement.click();
          }
        }
      });
    }

    // 一括操作の実行ボタン
    const executeSelectedActionElement = document.getElementById(
      "executeSelectedAction",
    );
    if (executeSelectedActionElement) {
      executeSelectedActionElement.addEventListener(
        "click",
        this.guardEvent(async () => {
          const actionSelectElement = document.getElementById(
            "selectedVideosAction",
          ) as HTMLSelectElement;
          if (!actionSelectElement) {
            await this.showCustomAlert("操作選択要素が見つかりません");
            return;
          }

          const action = actionSelectElement.value;
          if (!action) {
            await this.showCustomAlert("操作を選択してください");
            return;
          }

          // 仮想スクロールマネージャーから選択されたアイテムを取得
          const selectedVideos = this.virtualScrollManager.getSelectedVideos();
          const selectedKeywords =
            this.virtualScrollManager.getSelectedKeywords();

          if (selectedVideos.length === 0 && selectedKeywords.length === 0) {
            await this.showCustomAlert("項目を選択してください");
            return;
          }

          try {
            switch (action) {
              case "move":
                await this.batchOperations.moveSelectedItemsFromData(
                  selectedVideos,
                  selectedKeywords,
                );
                break;
              case "copy":
                await this.batchOperations.copySelectedItemsFromData(
                  selectedVideos,
                  selectedKeywords,
                );
                break;
              case "delete":
                await this.batchOperations.deleteSelectedItemsFromData(
                  selectedVideos,
                  selectedKeywords,
                );
                break;
              case "refresh":
                if (selectedKeywords.length > 0) {
                  await this.showCustomAlert(
                    "キーワードは情報更新できません。動画のみ選択してください。",
                  );
                  return;
                }
                if (selectedVideos.length > 0) {
                  await this.batchOperations.refreshSelectedVideosFromData(
                    selectedVideos,
                  );
                }
                break;
              case "availability-check":
                if (selectedKeywords.length > 0) {
                  await this.showCustomAlert(
                    "キーワードは公開状態チェックできません。動画のみ選択してください。",
                  );
                  return;
                }
                if (selectedVideos.length > 0) {
                  await this.batchOperations.checkSelectedVideoAvailabilityFromData(
                    selectedVideos,
                  );
                }
                break;
            }

            // 操作後に選択をクリア
            this.virtualScrollManager.deselectAll();
          } catch (error) {
            window.logger.error("一括操作に失敗しました:", error);
            const errorMessage =
              error instanceof Error ? error.message : "操作に失敗しました";
            await this.showCustomAlert(errorMessage);
          }

          // 操作完了後、セレクトボックスをリセット
          actionSelectElement.value = "";
        }),
      );
    }

    document
      .querySelectorAll<HTMLElement>("[data-batch-action]")
      .forEach((button) => {
        button.addEventListener("click", () => {
          const action = button.dataset.batchAction;
          const actionSelect = document.getElementById(
            "selectedVideosAction",
          ) as HTMLSelectElement | null;
          if (!action || !actionSelect) return;
          actionSelect.value = action;
          executeSelectedActionElement?.click();
        });
      });

    // マイリスト名の保存
    const saveMylistNameElement = document.getElementById("saveMylistName");
    if (saveMylistNameElement) {
      saveMylistNameElement.addEventListener(
        "click",
        this.guardEvent(async () => {
          if (!this.currentMylistId) {
            await this.showCustomAlert("マイリストを選択してください");
            return;
          }

          try {
            const mylistNameElement = document.getElementById(
              "currentMylistName",
            ) as HTMLInputElement;
            if (!mylistNameElement) {
              await this.showCustomAlert("マイリスト名入力欄が見つかりません");
              return;
            }

            const newName = this.validateInput(
              mylistNameElement.value,
              "mylistName",
            );
            await this.manager.updateMylistName(this.currentMylistId, newName);
            await this.loadMylists();
            await this.showCustomAlert("マイリスト名を更新しました");
          } catch (error) {
            window.logger.error("マイリスト名の更新に失敗しました:", error);
            const errorMessage =
              error instanceof Error
                ? error.message
                : "マイリスト名の更新に失敗しました";
            await this.showCustomAlert(errorMessage);
          }
        }),
      );
    }

    // マイリストの削除
    const deleteMylistElement = document.getElementById("deleteMylist");
    if (deleteMylistElement) {
      deleteMylistElement.addEventListener(
        "click",
        this.guardEvent(async () => {
          if (!this.currentMylistId) {
            await this.showCustomAlert("マイリストを選択してください");
            return;
          }

          const mylistNameElement = document.getElementById(
            "currentMylistName",
          ) as HTMLInputElement;
          if (!mylistNameElement) {
            await this.showCustomAlert("マイリスト名入力欄が見つかりません");
            return;
          }

          const mylistName = mylistNameElement.value;
          if (
            !(await this.showCustomConfirm(
              `マイリスト「${mylistName}」を削除しますか？\n※この操作は取り消せません`,
            ))
          ) {
            return;
          }

          try {
            await this.manager.deleteMylist(this.currentMylistId);
            this.currentMylistId = null;
            mylistNameElement.value = "";

            const videoListElement = document.getElementById("videoList");
            if (videoListElement) {
              videoListElement.innerHTML = "";
            }

            await this.loadMylists();
            await this.showCustomAlert("マイリストを削除しました");
          } catch (error) {
            window.logger.error("マイリストの削除に失敗しました:", error);
            const errorMessage =
              error instanceof Error
                ? error.message
                : "マイリストの削除に失敗しました";
            await this.showCustomAlert(errorMessage);
          }
        }),
      );
    }

    // エクスポート機能（モーダル経由）
    const exportMylistElement = document.getElementById("exportMylist");
    if (exportMylistElement) {
      exportMylistElement.addEventListener(
        "click",
        this.guardEvent(async () => {
          const choice = await this.modalService.showExportOptionsModal();
          if (choice.action === "cancel") return;
          try {
            if (choice.action === "local") {
              const data = await this.manager.exportData();
              const dateTime = this.formatDateTime();
              const fileName = `Mylist2_${dateTime}.json`;
              const blob = new Blob([JSON.stringify(data, null, 2)], {
                type: "application/json",
              });
              const url = URL.createObjectURL(blob);
              await new Promise<void>((resolve, reject) => {
                const a = document.createElement("a");
                a.href = url;
                a.download = fileName;
                a.onclick = () => {
                  setTimeout(() => {
                    URL.revokeObjectURL(url);
                    resolve();
                  }, 500);
                };
                a.onerror = () => {
                  URL.revokeObjectURL(url);
                  reject(new Error("ダウンロードに失敗しました"));
                };
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
              });
              await this.showCustomAlert("エクスポートが完了しました");
            } else if (choice.action === "cloud") {
              const provider = "gdrive" as const;
              const dateTime = this.formatDateTime();
              const baseName = `Mylist2_${dateTime}`;
              const result = await this.manager.uploadBackupToCloud(
                provider,
                baseName,
              );
              if (result.success) {
                const providerName = "Google Drive";
                await this.showCustomAlert(
                  `${providerName} にバックアップを保存しました`,
                );
              } else {
                const providerName = "Google Drive";
                await this.showCustomAlert(
                  `${providerName} へのバックアップに失敗しました: ` +
                    (result.error || "不明なエラー"),
                );
              }
            }
          } catch (error) {
            window.logger.error("エクスポート処理でエラー:", error);
            const errorMessage =
              error instanceof Error
                ? error.message
                : "エクスポートに失敗しました";
            await this.showCustomAlert(
              "エクスポートに失敗しました: " + errorMessage,
            );
          }
        }),
      );
    }

    // インポート機能（モーダル経由）
    const importMylistElement = document.getElementById("importMylist");
    if (importMylistElement) {
      importMylistElement.addEventListener(
        "click",
        this.guardEvent(async () => {
          const choice = await this.modalService.showImportOptionsModal();
          if (choice.action === "cancel") return;
          if (choice.action === "local") {
            const input = document.getElementById(
              "importFile",
            ) as HTMLInputElement;
            if (!input) {
              await this.showCustomAlert(
                "インポートファイル選択要素が見つかりません",
              );
              return;
            }
            input.accept = ".json,.txt";
            input.click();
          } else if (choice.action === "clear") {
            const confirmed = await this.showCustomConfirm(
              "本当に全データをクリアしますか？この操作は取り消せません。",
              "warning",
              "データベースのクリア",
            );
            if (!confirmed) return;
            const result = await this.manager.clearAllData(false);
            if (result.success) {
              await this.loadMylists();
              const videoListElement = document.getElementById("videoList");
              if (videoListElement) videoListElement.innerHTML = "";
              await this.showCustomAlert("データベースをクリアしました");
            } else {
              await this.showCustomAlert(
                "データベースのクリアに失敗しました: " +
                  (result.error || "不明なエラー"),
              );
            }
          } else if (choice.action === "cloud") {
            const provider = "gdrive" as const;
            try {
              const backups = await this.manager.listCloudBackups(provider);
              const providerName = "Google Drive";
              if (!backups || backups.length === 0) {
                await this.showCustomAlert(
                  `${providerName} にバックアップが見つかりません`,
                );
                return;
              }
              const selectedId = await this.modalService.showSelectionModal(
                "復元するバックアップを選択",
                backups.map((f) => ({
                  id: f.id,
                  label: f.name,
                  subLabel: f.modifiedTime
                    ? new Date(f.modifiedTime).toLocaleString()
                    : "",
                })),
                "復元",
              );
              if (!selectedId) return;
              const confirmed = await this.showCustomConfirm(
                "選択したバックアップで復元します。現在のデータは上書きされます。よろしいですか？",
                "warning",
                "復元確認",
              );
              if (!confirmed) return;
              this.showProgress();
              const res = await this.manager.restoreFromCloudBackup(
                provider,
                selectedId,
              );
              if (res.success) {
                await this.loadMylists();
                await this.showCustomAlert("バックアップから復元しました");
              } else {
                await this.showCustomAlert(
                  "復元に失敗しました: " + (res.error || "不明なエラー"),
                );
              }
            } finally {
              this.hideProgress();
            }
          }
        }),
      );
    }

    const importFileElement = document.getElementById("importFile");
    if (importFileElement) {
      importFileElement.addEventListener(
        "change",
        this.guardEvent(async (event) => {
          const input = event.target as HTMLInputElement;
          const file = input.files?.[0];
          if (!file) return;

          try {
            const text = await file.text();
            let mylistId: number | undefined;

            // ファイル形式を判定
            let data: unknown;
            try {
              data = JSON.parse(text) as unknown;
            } catch {
              throw new Error(
                "無効なJSONファイルです: JSONの解析に失敗しました",
              );
            }

            // 既存データの存在チェック
            const existingData = await this.manager.exportData();
            const hasExistingData =
              existingData.mylists.length > 0 ||
              existingData.videos.length > 0 ||
              existingData.keywords.length > 0;

            if (hasExistingData) {
              const existingInfo = [
                existingData.mylists.length > 0
                  ? `マイリスト: ${existingData.mylists.length}件`
                  : null,
                existingData.videos.length > 0
                  ? `動画: ${existingData.videos.length}件`
                  : null,
                existingData.keywords.length > 0
                  ? `キーワード: ${existingData.keywords.length}件`
                  : null,
              ]
                .filter(Boolean)
                .join("、");

              const confirmed = await this.showCustomConfirm(
                `現在のストレージにデータが存在します（${existingInfo}）。\n\nインポートを実行すると、同じIDを持つデータは上書きされます。\n続行しますか？`,
                "warning",
                "データ上書き確認",
              );
              if (!confirmed) {
                input.value = "";
                return;
              }
            }

            if (
              Array.isArray(data) &&
              typeof data[0] === "object" &&
              data[0] !== null &&
              "vid" in data[0]
            ) {
              // カスタムマイリスト1の形式
              this.showProgress();
              mylistId = await this.manager.importLegacyData(
                text,
                (current: number, total: number) =>
                  this.updateProgress(current, total),
              );
              await this.showCustomAlert(
                "カスタムマイリスト1のデータを正常にインポートしました",
              );
            } else {
              // Mylist2の形式
              this.showProgress();
              // data は unknown なので ExportData の形状を厳密に確認し、明示的に構築
              const rec = data as Record<string, unknown>;
              if (!rec || typeof rec !== "object") {
                throw new Error("無効なデータ形式です");
              }
              const mylistsUnknown = rec.mylists;
              const videosUnknown = rec.videos;
              const keywordsUnknown = rec.keywords;
              if (
                !Array.isArray(mylistsUnknown) ||
                !Array.isArray(videosUnknown)
              ) {
                throw new Error("Mylist2のエクスポート形式ではありません");
              }
              const isMylistInfo = (v: unknown): v is MylistInfo => {
                if (typeof v !== "object" || v === null) return false;
                const r = v as Record<string, unknown>;
                return (
                  typeof r.name === "string" && typeof r.createdAt === "number"
                );
              };
              const isDBVideo = (v: unknown): v is VideoInfo => {
                if (typeof v !== "object" || v === null) return false;
                const r = v as Record<string, unknown>;
                return (
                  typeof r.id === "string" &&
                  typeof r.originalId === "string" &&
                  typeof r.mylistId === "number"
                );
              };
              const isKeywordInfo = (v: unknown): v is KeywordInfo => {
                if (typeof v !== "object" || v === null) return false;
                const r = v as Record<string, unknown>;
                return (
                  typeof r.keyword === "string" && typeof r.addedAt === "number"
                );
              };
              const exportData: ExportData = {
                mylists: (mylistsUnknown as unknown[]).filter(isMylistInfo),
                videos: (videosUnknown as unknown[]).filter(isDBVideo),
                keywords: Array.isArray(keywordsUnknown)
                  ? (keywordsUnknown as unknown[]).filter(isKeywordInfo)
                  : [],
              };
              await this.manager.importData(exportData);
              await this.showCustomAlert("データを正常にインポートしました");
            }

            // マイリスト一覧を更新
            await this.loadMylists();

            // インポートしたマイリストを選択
            if (mylistId) {
              await this.selectMylist(mylistId);
            }
          } catch (error) {
            window.logger.error("インポートに失敗しました:", error);
            const errorMessage =
              error instanceof Error
                ? error.message
                : "インポートに失敗しました";
            await this.showCustomAlert(errorMessage);
          } finally {
            this.hideProgress();
          }

          // ファイル選択をリセット
          input.value = "";
        }),
      );
    }

    // 全選択ボタンのイベントリスナー（動画のみ）
    const selectAllVideosElement = document.getElementById(
      "selectAllVideos",
    ) as HTMLInputElement | null;
    if (selectAllVideosElement) {
      selectAllVideosElement.addEventListener("change", () => {
        if (selectAllVideosElement.checked) {
          this.virtualScrollManager.selectAllVideos();
        } else {
          this.virtualScrollManager.deselectAll();
        }
      });
    }

    // 選択解除ボタンのイベントリスナー
    const deselectAllVideosElement =
      document.getElementById("deselectAllVideos");
    if (deselectAllVideosElement) {
      deselectAllVideosElement.addEventListener("click", () => {
        // 仮想スクロールマネージャーを使用
        this.virtualScrollManager.deselectAll();
      });
    }
  }
}
