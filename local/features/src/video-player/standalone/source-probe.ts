import type { HlsInstance } from "@/types/video-types";

const SOURCE_PROBE_TIMEOUT_MS = 5000;

export interface VideoSourceProbe {
  url: string;
  ready: Promise<string>;
  cleanup: () => void;
}

export function createVideoSourceProbe(
  url: string,
  attachProbeSource: (
    video: HTMLVideoElement,
    url: string,
    onError: (error: Error) => void,
  ) => Promise<HlsInstance | null>,
): VideoSourceProbe {
  const probeVideo = document.createElement("video");
  probeVideo.preload = "metadata";
  probeVideo.muted = true;
  probeVideo.playsInline = true;
  probeVideo.crossOrigin = "anonymous";
  probeVideo.style.position = "fixed";
  probeVideo.style.width = "1px";
  probeVideo.style.height = "1px";
  probeVideo.style.opacity = "0";
  probeVideo.style.pointerEvents = "none";
  probeVideo.style.left = "-10px";
  probeVideo.style.top = "-10px";

  let active = true;
  let hls: HlsInstance | null = null;
  let timeoutId: number | null = null;
  let settled = false;
  let resolveReady: (readyUrl: string) => void = () => {};
  let rejectReady: (error: Error) => void = () => {};

  const cleanup = (): void => {
    active = false;
    if (timeoutId !== null) {
      window.clearTimeout(timeoutId);
      timeoutId = null;
    }
    probeVideo.removeEventListener("loadedmetadata", handleReady);
    probeVideo.removeEventListener("canplay", handleReady);
    probeVideo.removeEventListener("error", handleError);
    hls?.destroy();
    hls = null;
    probeVideo.pause();
    probeVideo.removeAttribute("src");
    probeVideo.load();
    probeVideo.remove();
  };

  const settleReady = (): void => {
    if (settled) {
      return;
    }
    settled = true;
    resolveReady(url);
  };

  const settleError = (error: Error): void => {
    if (settled) {
      return;
    }
    settled = true;
    cleanup();
    rejectReady(error);
  };

  function handleReady(): void {
    settleReady();
  }

  function handleError(): void {
    const mediaError = probeVideo.error;
    settleError(
      new Error(
        mediaError?.message ||
          `動画ソースの実再生プローブに失敗しました: code=${mediaError?.code ?? "unknown"}`,
      ),
    );
  }

  const ready = new Promise<string>((resolve, reject) => {
    resolveReady = resolve;
    rejectReady = reject;
  });

  timeoutId = window.setTimeout(() => {
    settleError(
      new Error(`動画ソースの実再生プローブがタイムアウトしました: ${url}`),
    );
  }, SOURCE_PROBE_TIMEOUT_MS);

  probeVideo.addEventListener("loadedmetadata", handleReady, { once: true });
  probeVideo.addEventListener("canplay", handleReady, { once: true });
  probeVideo.addEventListener("error", handleError, { once: true });
  document.body.appendChild(probeVideo);

  void attachProbeSource(probeVideo, url, settleError)
    .then((probeHls) => {
      if (!active) {
        probeHls?.destroy();
        return;
      }
      hls = probeHls;
    })
    .catch((error) => {
      if (!active) {
        return;
      }
      settleError(
        error instanceof Error
          ? error
          : new Error(
              `動画ソースの実再生プローブに失敗しました: ${String(error)}`,
            ),
      );
    });

  return { url, ready, cleanup };
}

export async function waitForFirstReadyProbe(
  probes: VideoSourceProbe[],
): Promise<string | null> {
  if (probes.length === 0) {
    return null;
  }

  return new Promise((resolve) => {
    let pendingCount = probes.length;
    let resolved = false;

    probes.forEach((probe) => {
      void probe.ready
        .then((url) => {
          if (resolved) {
            return;
          }
          resolved = true;
          resolve(url);
        })
        .catch((error) => {
          window.logger.warn(
            `動画ソースの実再生プローブに失敗しました: ${probe.url}`,
            error,
          );
        })
        .finally(() => {
          pendingCount--;
          if (!resolved && pendingCount === 0) {
            resolve(null);
          }
        });
    });
  });
}
