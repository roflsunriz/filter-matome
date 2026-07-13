import { createMaterialIcon, ICONS } from "@/common/material-icons";
import { searchVideoCaches } from "@/common/cache-search-client";
import { createCacheSearchResults } from "@/common/cache-search-results";

const VIDEO_ID_PATTERN = /[a-z]{2}\d+/i;

export const extractVideoIdFromInput = (value: string): string | null => {
  const match = value.match(VIDEO_ID_PATTERN);
  return match?.[0]?.toLowerCase() ?? null;
};

export interface VideoNavigationElements {
  form: HTMLFormElement;
  input: HTMLInputElement;
  primaryButton: HTMLButtonElement;
  searchButton: HTMLButtonElement;
}

export interface VideoNavigationOptions {
  onVideoId: (videoId: string) => void | Promise<void>;
  inputId?: string;
  primaryButtonId?: string;
  primaryActionLabel?: string;
  primaryActionTitle?: string;
  primaryActionIcon?: string;
  resultActionLabel?: string;
  loggerScope?: string;
}

export const createVideoNavigation = (
  options: VideoNavigationOptions,
): VideoNavigationElements => {
  const primaryActionLabel = options.primaryActionLabel ?? "再生";
  const primaryActionTitle =
    options.primaryActionTitle ?? `動画を${primaryActionLabel}`;
  const resultActionLabel = options.resultActionLabel ?? primaryActionLabel;
  const inputId = options.inputId ?? "common-video-navigation-input";

  const form = document.createElement("form");
  form.className = "common-video-navigation";
  form.noValidate = true;
  form.setAttribute("aria-label", "動画の指定またはキャッシュ検索");

  const label = document.createElement("label");
  label.className = "common-video-navigation__label";
  label.htmlFor = inputId;
  label.textContent = "動画URL / videoId / キャッシュ検索";

  const controls = document.createElement("div");
  controls.className = "common-video-navigation__controls";

  const input = document.createElement("input");
  input.id = inputId;
  input.className = "common-video-navigation__input";
  input.type = "text";
  input.name = "videoId";
  input.autocomplete = "off";
  input.placeholder = "URL、videoId、検索キーワード（例: 豪血寺一族）";
  input.setAttribute(
    "aria-label",
    "動画URL、videoId、キャッシュ検索キーワード",
  );

  const primaryButton = document.createElement("button");
  primaryButton.className = "common-video-navigation__submit";
  primaryButton.type = "submit";
  if (options.primaryButtonId) {
    primaryButton.id = options.primaryButtonId;
  }
  primaryButton.title = primaryActionTitle;
  primaryButton.setAttribute("aria-label", primaryActionTitle);
  primaryButton.insertAdjacentHTML(
    "beforeend",
    createMaterialIcon(options.primaryActionIcon ?? ICONS.play, {
      style: "outlined",
      color: "dark",
      size: 20,
      alt: "",
    }),
  );

  const primaryButtonLabel = document.createElement("span");
  primaryButtonLabel.textContent = primaryActionLabel;
  primaryButton.append(primaryButtonLabel);

  const searchButton = document.createElement("button");
  searchButton.className =
    "common-video-navigation__submit common-video-navigation__search";
  searchButton.type = "button";
  searchButton.title = "キャッシュを検索";
  searchButton.setAttribute("aria-label", "キャッシュを検索");
  searchButton.insertAdjacentHTML(
    "beforeend",
    createMaterialIcon(ICONS.search, {
      style: "outlined",
      color: "white",
      size: 20,
      alt: "",
    }),
  );

  const searchButtonLabel = document.createElement("span");
  searchButtonLabel.textContent = "検索";
  searchButton.append(searchButtonLabel);

  const message = document.createElement("p");
  message.className = "common-video-navigation__message";
  message.setAttribute("role", "alert");
  message.setAttribute("aria-live", "polite");

  const reportSelectionError = (error: unknown): void => {
    const detail = error instanceof Error ? error.message : String(error);
    window.logger?.error?.(
      `[${options.loggerScope ?? "common"}] video selection failed`,
      detail,
    );
    message.textContent = `動画を処理できませんでした。${detail}`;
  };

  const selectVideo = (videoId: string): void => {
    input.value = videoId;
    input.removeAttribute("aria-invalid");
    searchResults.clear();
    try {
      void Promise.resolve(options.onVideoId(videoId)).catch(
        reportSelectionError,
      );
    } catch (error) {
      reportSelectionError(error);
    }
  };

  let searchController: AbortController | null = null;
  const searchResults = createCacheSearchResults(
    selectVideo,
    resultActionLabel,
  );

  const clearError = (): void => {
    message.textContent = "";
    input.removeAttribute("aria-invalid");
  };

  const runCacheSearch = async (): Promise<void> => {
    const query = input.value.trim();
    if (!query) {
      message.textContent = "キャッシュ検索キーワードを入力してください。";
      input.setAttribute("aria-invalid", "true");
      input.focus();
      return;
    }

    clearError();
    searchController?.abort();
    searchController = new AbortController();
    const controller = searchController;
    searchButton.disabled = true;
    input.setAttribute("aria-busy", "true");
    searchResults.showLoading(query);

    try {
      const results = await searchVideoCaches(query, {
        signal: controller.signal,
      });
      if (searchController === controller) {
        searchResults.showResults(query, results);
      }
    } catch (error) {
      if (controller.signal.aborted) {
        return;
      }
      const detail = error instanceof Error ? error.message : String(error);
      window.logger?.warn?.(
        `[${options.loggerScope ?? "common"}] cache search failed`,
        detail,
      );
      searchResults.showError(
        `${detail} NicoCache_nlが起動しているか確認してください。`,
      );
    } finally {
      if (searchController === controller) {
        searchController = null;
        searchButton.disabled = false;
        input.removeAttribute("aria-busy");
      }
    }
  };

  input.addEventListener("input", () => {
    clearError();
    searchController?.abort();
    searchController = null;
    searchButton.disabled = false;
    input.removeAttribute("aria-busy");
    searchResults.clear();
  });
  searchButton.addEventListener("click", () => {
    void runCacheSearch();
  });
  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const videoId = extractVideoIdFromInput(input.value);
    if (!videoId) {
      void runCacheSearch();
      return;
    }

    selectVideo(videoId);
  });

  controls.append(input, primaryButton, searchButton);
  form.append(label, controls, message, searchResults.root);
  return { form, input, primaryButton, searchButton };
};
