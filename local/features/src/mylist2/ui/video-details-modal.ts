export interface VideoDetailsModalElements {
  modal: HTMLElement;
  description: HTMLElement;
  tags: HTMLElement;
  memo: HTMLTextAreaElement;
  closeButton: HTMLElement | null;
  saveButton: HTMLElement | null;
  content: HTMLElement | null;
}

const MODAL_ID = "videoDetailsModal";

export function getOrCreateVideoDetailsModal(): VideoDetailsModalElements | null {
  let modal = document.getElementById(MODAL_ID);
  if (!modal) {
    modal = document.createElement("div");
    modal.id = MODAL_ID;
    modal.className = "cml2-modal";
    modal.style.display = "none";
    modal.innerHTML = `
      <div class="cml2-modal-content" role="dialog" aria-modal="true">
        <h2 class="cml2-modal-title">動画詳細</h2>
        <div class="cml2-modal-body video-details-body">
          <div class="video-details-section">
            <strong>説明</strong>
            <div class="video-description" style="white-space:pre-wrap"></div>
          </div>
          <div class="video-details-section" style="margin-top:12px">
            <strong>タグ</strong>
            <div class="video-tags"></div>
          </div>
          <div class="video-details-section" style="margin-top:12px">
            <strong>メモ</strong>
            <textarea class="video-memo" rows="4" style="width:100%" placeholder="メモを入力..."></textarea>
          </div>
        </div>
        <div class="cml2-modal-footer">
          <button type="button" class="cml2-btn save-memo-button">メモを保存</button>
          <button type="button" class="cml2-btn close-button">閉じる</button>
        </div>
      </div>`;
    document.body.appendChild(modal);
  }

  if (!(modal instanceof HTMLElement)) return null;
  const description = modal.querySelector(".video-description");
  const tags = modal.querySelector(".video-tags");
  const memo = modal.querySelector(".video-memo");
  if (
    !(description instanceof HTMLElement) ||
    !(tags instanceof HTMLElement) ||
    !(memo instanceof HTMLTextAreaElement)
  ) {
    return null;
  }

  return {
    modal,
    description,
    tags,
    memo,
    closeButton: modal.querySelector<HTMLElement>(".close-button"),
    saveButton: modal.querySelector<HTMLElement>(".save-memo-button"),
    content: modal.querySelector<HTMLElement>(".cml2-modal-content"),
  };
}

export function renderVideoTags(container: HTMLElement, tags: string[]): void {
  if (tags.length === 0) {
    container.textContent = "(タグなし)";
    return;
  }

  container.replaceChildren(
    ...tags.map((tag) => {
      const anchor = document.createElement("a");
      anchor.className = "cml2-tag";
      anchor.href = `https://dic.nicovideo.jp/a/${encodeURIComponent(tag)}`;
      anchor.target = "_blank";
      anchor.rel = "noopener noreferrer";
      anchor.textContent = tag;
      return anchor;
    }),
  );
}

export function openVideoDetailsModal(
  elements: VideoDetailsModalElements,
  onSaveMemo: (memoText: string) => Promise<void>,
): void {
  const { modal, memo, closeButton, saveButton, content } = elements;
  const controller = new AbortController();
  const { signal } = controller;
  const handleClose = () => {
    modal.style.display = "none";
    controller.abort();
  };
  const onKeydown = (event: KeyboardEvent) => {
    if (event.key === "Escape") handleClose();
  };
  const onBackdrop = (event: MouseEvent) => {
    if (!content) return;
    if (!content.contains(event.target as Node)) handleClose();
  };

  closeButton?.addEventListener("click", handleClose, { signal });
  saveButton?.addEventListener(
    "click",
    () => {
      void (async () => {
        await onSaveMemo(memo.value || "");
        controller.abort();
      })();
    },
    { signal },
  );
  document.addEventListener("keydown", onKeydown, { signal });
  modal.addEventListener("click", onBackdrop, { signal });
  modal.style.display = "flex";
}
