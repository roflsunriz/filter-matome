import { fetchCacheInfoEntry } from "@/common/cache-info-api";
import type {
  OfficialPreloadPlan,
  PreloadResource,
} from "./official-buffering-bridge";

export type PreloadStatus =
  "idle" | "loading" | "completed" | "canceled" | "failed";
export type PreloadError = "load-error" | "cache-unconfirmed" | null;
type Dependencies = {
  fetcher: typeof fetch;
  completedCache(
    plan: OfficialPreloadPlan,
    signal: AbortSignal,
  ): Promise<boolean>;
};

export function validatePreloadResource(resource: PreloadResource): URL {
  const url = new URL(resource.url);
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.port ||
    !(
      url.hostname === "delivery.domand.nicovideo.jp" ||
      url.hostname === "asset.domand.nicovideo.jp" ||
      (url.hostname === "nicocachenl.test" &&
        url.pathname.startsWith("/media/v1/playback-sessions/"))
    )
  )
    throw new Error("Untrusted preload resource");
  return url;
}
const dependencies: Dependencies = {
  fetcher: (input, init) => fetch(input, init),
  completedCache: async (plan, signal) => {
    const entry = await fetchCacheInfoEntry(plan.videoId, (url) =>
      fetch(url, { signal }),
    );
    return Object.values(entry.caches).some(
      (cache) =>
        cache.complete &&
        cache.videoMode === plan.videoMode &&
        cache.audioBitrate === plan.audioBitrate,
    );
  },
};

// データはNicoCache_nlを通過させ、再生用SourceBufferや配列へ蓄積しない。
export class FullPreloadController {
  status: PreloadStatus = "idle";
  error: PreloadError = null;
  percent = 0;
  private controller: AbortController | null = null;
  private generation = 0;
  constructor(
    private readonly changed: () => void,
    private readonly io: Dependencies = dependencies,
  ) {}

  async start(plan: OfficialPreloadPlan): Promise<void> {
    this.cancel();
    const generation = ++this.generation;
    const controller = new AbortController();
    this.controller = controller;
    this.status = "loading";
    this.error = null;
    this.percent = 0;
    this.changed();
    try {
      const playlists: PreloadResource[] = [];
      const segments: PreloadResource[] = [];
      for (const resource of plan.resources) {
        const url = validatePreloadResource(resource);
        (url.pathname.endsWith(".m3u8") ? playlists : segments).push(resource);
      }
      if (!(await this.io.completedCache(plan, controller.signal))) {
        let next = 0;
        let completed = 0;
        const completedResource = (): void => {
          completed++;
          this.percent = Math.min(
            99,
            (completed / plan.resources.length) * 100,
          );
          this.changed();
        };
        // NicoCache_nlへ先に両trackのplaylistを渡してキャッシュの対応付けを作る。
        for (const resource of playlists) {
          controller.signal.throwIfAborted();
          await this.consume(resource, controller.signal);
          if (generation !== this.generation) return;
          completedResource();
        }
        const worker = async (): Promise<void> => {
          while (next < segments.length) {
            controller.signal.throwIfAborted();
            const resource = segments[next++];
            await this.consume(resource, controller.signal);
            if (generation !== this.generation) return;
            completedResource();
          }
        };
        await Promise.all([worker(), worker()]);
        let confirmed = false;
        for (let attempt = 0; attempt < 20; attempt++) {
          controller.signal.throwIfAborted();
          if (await this.io.completedCache(plan, controller.signal)) {
            confirmed = true;
            break;
          }
          await new Promise((done) => setTimeout(done, 250));
        }
        if (!confirmed) {
          this.error = "cache-unconfirmed";
          throw new Error("Preloaded cache could not be confirmed");
        }
      }
      if (generation !== this.generation) return;
      this.status = "completed";
      this.percent = 100;
    } catch {
      if (generation !== this.generation) return;
      if (controller.signal.aborted) this.status = "canceled";
      else {
        this.status = "failed";
        this.error ??= "load-error";
        controller.abort();
      }
    } finally {
      if (generation === this.generation) {
        this.controller = null;
        this.changed();
      }
    }
  }
  cancel(): void {
    ++this.generation;
    this.controller?.abort();
    this.controller = null;
    if (this.status === "loading") this.status = "canceled";
    this.changed();
  }
  reset(): void {
    this.cancel();
    this.status = "idle";
    this.error = null;
    this.percent = 0;
    this.changed();
  }
  private async consume(
    resource: PreloadResource,
    signal: AbortSignal,
  ): Promise<void> {
    const response = await this.io.fetcher(resource.url, {
      credentials: "include",
      cache: "reload",
      signal,
      ...(resource.rangeStart !== undefined && resource.rangeEnd !== undefined
        ? {
            headers: {
              Range: `bytes=${resource.rangeStart}-${resource.rangeEnd - 1}`,
            },
          }
        : {}),
    });
    if (!response.ok || !response.body)
      throw new Error("Preload response failed");
    const reader = response.body.getReader();
    try {
      while (!(await reader.read()).done) signal.throwIfAborted();
    } finally {
      reader.releaseLock();
    }
  }
}
