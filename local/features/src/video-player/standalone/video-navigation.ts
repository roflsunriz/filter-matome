import { createMaterialIcon, ICONS } from "@/common/material-icons";
import { searchVideoCaches } from "@/video-player/standalone/cache-search-client";
import { createCacheSearchResults } from "@/video-player/standalone/cache-search-results";

const VIDEO_ID_PATTERN = /[a-z]{2}\d+/i;

export const extractVideoIdFromInput = (value: string): string | null => {
  const match = value.match(VIDEO_ID_PATTERN);
  return match?.[0]?.toLowerCase() ?? null;
};

export interface VideoNavigationElements {
  form: HTMLFormElement;
  input: HTMLInputElement;
}

const navigateToVideo = (videoId: string): void => {
  const targetUrl = new URL("index.html", window.location.href);
  targetUrl.search = "";
  targetUrl.searchParams.set("videoId", videoId);
  window.location.assign(targetUrl.toString());
};

export const createVideoNavigation = (): VideoNavigationElements => {
  const form = document.createElement("form");
  form.className = "nc-video-navigation";
  form.noValidate = true;
  form.setAttribute("aria-label", "動画の指定またはキャッシュ検索");

  const label = document.createElement("label");
  label.className = "nc-video-navigation__label";
  label.htmlFor = "nc-video-navigation-input";
  label.textContent = "動画URL / videoId / キャッシュ検索";

  const controls = document.createElement("div");
  controls.className = "nc-video-navigation__controls";

  const input = document.createElement("input");
  input.id = "nc-video-navigation-input";
  input.className = "nc-video-navigation__input";
  input.type = "text";
  input.name = "videoId";
  input.autocomplete = "off";
  input.placeholder = "URL、videoId、検索キーワード（例: 豪血寺一族）";
  input.setAttribute(
    "aria-label",
    "動画URL、videoId、キャッシュ検索キーワード",
  );

  const submitButton = document.createElement("button");
  submitButton.className = "nc-video-navigation__submit";
  submitButton.type = "submit";
  submitButton.title = "動画を再生";
  submitButton.setAttribute("aria-label", "動画を再生");
  submitButton.insertAdjacentHTML(
    "beforeend",
    createMaterialIcon(ICONS.play, {
      style: "outlined",
      color: "dark",
      size: 20,
      alt: "",
    }),
  );

  const buttonLabel = document.createElement("span");
  buttonLabel.textContent = "再生";
  submitButton.append(buttonLabel);

  const searchButton = document.createElement("button");
  searchButton.className =
    "nc-video-navigation__submit nc-video-navigation__search";
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
  message.className = "nc-video-navigation__message";
  message.setAttribute("role", "alert");
  message.setAttribute("aria-live", "polite");

  let searchController: AbortController | null = null;
  const searchResults = createCacheSearchResults(navigateToVideo);

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
      window.logger?.warn?.("[video-player] cache search failed", detail);
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

    input.removeAttribute("aria-invalid");
    navigateToVideo(videoId);
  });

  controls.append(input, submitButton, searchButton);
  form.append(label, controls, message, searchResults.root);
  return { form, input };
};
