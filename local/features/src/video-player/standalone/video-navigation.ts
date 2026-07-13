import { createMaterialIcon, ICONS } from "@/common/material-icons";

const VIDEO_ID_PATTERN = /[a-z]{2}\d+/i;

export const extractVideoIdFromInput = (value: string): string | null => {
  const match = value.match(VIDEO_ID_PATTERN);
  return match?.[0]?.toLowerCase() ?? null;
};

export interface VideoNavigationElements {
  form: HTMLFormElement;
  input: HTMLInputElement;
}

export const createVideoNavigation = (): VideoNavigationElements => {
  const form = document.createElement("form");
  form.className = "nc-video-navigation";
  form.noValidate = true;
  form.setAttribute("aria-label", "動画を指定して再生");

  const label = document.createElement("label");
  label.className = "nc-video-navigation__label";
  label.htmlFor = "nc-video-navigation-input";
  label.textContent = "動画URL / videoId";

  const controls = document.createElement("div");
  controls.className = "nc-video-navigation__controls";

  const input = document.createElement("input");
  input.id = "nc-video-navigation-input";
  input.className = "nc-video-navigation__input";
  input.type = "text";
  input.name = "videoId";
  input.autocomplete = "off";
  input.placeholder = "URLまたはvideoId（例: sm12345678）";
  input.setAttribute("aria-label", "動画URLまたはvideoId");

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

  const message = document.createElement("p");
  message.className = "nc-video-navigation__message";
  message.setAttribute("role", "alert");
  message.setAttribute("aria-live", "polite");

  const clearError = (): void => {
    message.textContent = "";
    input.removeAttribute("aria-invalid");
  };

  input.addEventListener("input", clearError);
  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const videoId = extractVideoIdFromInput(input.value);
    if (!videoId) {
      message.textContent = "動画URLまたはvideoIdから動画IDを取得できません。";
      input.setAttribute("aria-invalid", "true");
      input.focus();
      return;
    }

    input.removeAttribute("aria-invalid");
    const targetUrl = new URL("index.html", window.location.href);
    targetUrl.search = "";
    targetUrl.searchParams.set("videoId", videoId);
    window.location.assign(targetUrl.toString());
  });

  controls.append(input, submitButton);
  form.append(label, controls, message);
  return { form, input };
};
