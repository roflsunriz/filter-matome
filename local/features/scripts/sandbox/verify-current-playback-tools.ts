import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  getBrowserVersionEndpoint,
  RawCdpClient,
  waitForTargetWebSocket,
} from "./raw-cdp-client";

const arg = (name: string) =>
  process.argv
    .find((value) => value.startsWith(`--${name}=`))
    ?.slice(name.length + 3);
const endpoint = arg("cdp") ?? "http://127.0.0.1:9222";
const sampleCount = Number(arg("samples") ?? 12);
const sampleInterval = Number(arg("interval") ?? 250);
if (
  !Number.isInteger(sampleCount) ||
  sampleCount < 1 ||
  sampleCount > 1000 ||
  !Number.isInteger(sampleInterval) ||
  sampleInterval < 20 ||
  sampleInterval > 1000
)
  throw new Error("Invalid sampling options");
const url = new URL(
  arg("url") ?? "https://www.nicovideo.jp/watch/sm9?from=230",
);
if (
  url.protocol !== "https:" ||
  url.hostname !== "www.nicovideo.jp" ||
  !/^\/watch\/[a-zA-Z0-9]+$/u.test(url.pathname)
)
  throw new Error("Unsupported Watch URL");
const root = resolve(
  import.meta.dirname,
  "../../src/sandbox/official-watch-bundle",
);
const snapshot = `(() => {
  const video=document.querySelector('video[data-name="video-content"]');
  const panel=document.querySelector('mlink-video-controller')?.shadowRoot;
  const clock=globalThis.FilterMatomePlaybackControlApi?.getState();
  return {video:!!video,duration:video?.duration,mediaTime:video?.currentTime,officialTime:clock?.currentTime,paused:video?.paused,seeking:clock?.seeking,mediaSeeking:video?.seeking,readyState:video?.readyState,
    bufferVersion:globalThis.FilterMatomeBufferingApi?.version,planReady:globalThis.FilterMatomeBufferingApi?.getState()?.ready,
    clockVersion:globalThis.FilterMatomePlaybackControlApi?.version,
    preload:panel?.querySelector('[data-buffer-status]')?.textContent,percent:panel?.querySelector('[data-buffer-progress]')?.value,
    failed:panel?.querySelector('[data-buffer-status]')?.dataset.error==='true',
    repeat:panel?.querySelector('[data-action="ab-toggle"]')?.getAttribute('aria-pressed'),
    clockProbe:document.querySelector('[data-api-id="playback-control"]')?.dataset.status,
    bufferProbe:document.querySelector('[data-api-id="full-buffer"]')?.dataset.status};
})()`;

async function main(): Promise<void> {
  const version = await getBrowserVersionEndpoint(endpoint);
  const browser = await RawCdpClient.connect(version.webSocketDebuggerUrl);
  const { browserContextId } = await browser.send<{ browserContextId: string }>(
    "Target.createBrowserContext",
    { disposeOnDetach: true },
  );
  let page: RawCdpClient | null = null;
  try {
    const { targetId } = await browser.send<{ targetId: string }>(
      "Target.createTarget",
      { url: "about:blank", browserContextId },
    );
    page = await RawCdpClient.connect(
      await waitForTargetWebSocket(endpoint, targetId),
    );
    await page.send("Page.enable");
    await page.send("Runtime.enable");
    await page.send("Emulation.setDeviceMetricsOverride", {
      width: 1280,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
    });
    const evaluate = async (
      expression: string,
    ): Promise<Record<string, unknown>> => {
      const result = await page!.send<{
        result: { value: Record<string, unknown> };
        exceptionDetails?: unknown;
      }>("Runtime.evaluate", {
        expression,
        returnByValue: true,
        awaitPromise: true,
        userGesture: true,
      });
      if (result.exceptionDetails) throw new Error("Page evaluation failed");
      return result.result.value;
    };
    await page.send("Page.navigate", { url: url.href });
    let ready = false;
    for (let attempt = 0; attempt < 45; attempt++) {
      await new Promise((done) => setTimeout(done, 1000));
      const state = await evaluate(snapshot);
      if (
        Number.isFinite(state.officialTime) &&
        Number.isFinite(state.mediaTime) &&
        state.clockVersion === 1 &&
        state.bufferVersion === 2 &&
        state.planReady &&
        Number(state.duration) > 2
      ) {
        ready = true;
        break;
      }
    }
    if (!ready) {
      console.log(JSON.stringify(await evaluate(snapshot)));
      throw new Error(
        "Official player / v2 preload / playback control not ready",
      );
    }
    await evaluate(`(async()=>{
      const control=globalThis.FilterMatomePlaybackControlApi;
      const root=document.querySelector('mlink-video-controller').shadowRoot;
      if(!root.querySelector('.panel').classList.contains('visible'))root.querySelector('#fab').click();
      root.querySelector('[data-tab="playback"]').click();control.play();return {};
    })()`);
    // 初回操作で解除される公式の自動再生を終えてから、明示的に一時停止する。
    await new Promise((done) => setTimeout(done, 500));
    const before = await evaluate(`(async()=>{
      const control=globalThis.FilterMatomePlaybackControlApi;control.pause();
      await control.seek(Math.min(100,control.getState().duration/3));
      const root=document.querySelector('mlink-video-controller').shadowRoot;
      root.querySelector('[data-action="full-buffer"]').click();
      return {time:control.getState().currentTime};
    })()`);
    let completed = false;
    for (let attempt = 0; attempt < 180; attempt++) {
      await new Promise((done) => setTimeout(done, 1000));
      const state = await evaluate(snapshot);
      if (attempt % 10 === 0) console.log(JSON.stringify(state));
      if (state.failed) throw new Error("Preload failed");
      if (
        !state.paused ||
        Math.abs(Number(state.mediaTime) - Number(before.time)) > 0.2 ||
        Math.abs(Number(state.officialTime) - Number(before.time)) > 0.2
      )
        throw new Error("Preloading changed playback clocks");
      if (state.percent === 100) {
        completed = true;
        break;
      }
    }
    if (!completed) throw new Error("Complete cache was not confirmed");
    const bounds = await evaluate(`(async()=>{
      const api=globalThis.FilterMatomePlaybackControlApi,root=document.querySelector('mlink-video-controller').shadowRoot;
      const a=Math.min(100,api.getState().duration/3),b=a+1;
      for(const [point,value] of [['a',a],['b',b]]){const input=root.querySelector('[data-point="'+point+'"]');input.value=String(value);input.dispatchEvent(new Event('change',{bubbles:true}));}
      root.querySelector('[data-action="ab-toggle"]').click();await api.seek(b-.1);await api.play();return {a,b};
    })()`);
    const samples: Record<string, unknown>[] = [];
    let pendingSince: number | null = null;
    let stableSamples = 0;
    for (let attempt = 0; attempt < sampleCount; attempt++) {
      await new Promise((done) => setTimeout(done, sampleInterval));
      const state = await evaluate(snapshot);
      samples.push(state);
      if (
        !Number.isFinite(state.officialTime) ||
        !Number.isFinite(state.mediaTime) ||
        Number(state.mediaTime) > Number(bounds.b) + 0.2
      )
        throw new Error("A-B media position is invalid");
      if (state.seeking === true) {
        pendingSince ??= Date.now();
        // 公式UIはシーク確定前に保留位置を表示する。その間は旧フレームが残るが、
        // 1秒以内に確定し、保留位置がAであることを検証する。
        if (
          Date.now() - pendingSince > 1000 ||
          Math.abs(Number(state.officialTime) - Number(bounds.a)) > 0.1
        )
          throw new Error("A-B seek did not settle at A");
        continue;
      }
      pendingSince = null;
      stableSamples++;
      if (
        Number(state.officialTime) > Number(bounds.b) + 0.2 ||
        Number(state.mediaTime) > Number(bounds.b) + 0.2 ||
        Math.abs(Number(state.officialTime) - Number(state.mediaTime)) > 0.3
      ) {
        console.log(
          JSON.stringify({
            failedSample: state,
            bounds,
            recentSamples: samples.slice(-4),
          }),
        );
        throw new Error("A-B repeat clocks diverged");
      }
    }
    await evaluate(
      `(() => {globalThis.FilterMatomePlaybackControlApi.pause();document.querySelector('mlink-video-controller').shadowRoot.querySelector('[data-playback-tools]').scrollIntoView({block:'center'});return {};})()`,
    );
    let settled = false;
    for (let attempt = 0; attempt < 20; attempt++) {
      const state = await evaluate(snapshot);
      if (
        !state.seeking &&
        Number.isFinite(state.officialTime) &&
        Number.isFinite(state.mediaTime) &&
        Math.abs(Number(state.officialTime) - Number(state.mediaTime)) <= 0.3
      ) {
        settled = true;
        break;
      }
      await new Promise((done) => setTimeout(done, 50));
    }
    if (!settled || stableSamples === 0)
      throw new Error("A-B clocks did not settle after pause");
    await evaluate(
      `new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve({}))))`,
    );
    const clip = await evaluate(
      `(()=>{const r=document.querySelector('mlink-video-controller').shadowRoot.querySelector('[data-playback-tools]').getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,scale:1};})()`,
    );
    const shot = await page.send<{ data: string }>("Page.captureScreenshot", {
      format: "png",
      clip,
      captureBeyondViewport: false,
    });
    await writeFile(
      resolve(root, "playback-tools-live.png"),
      Buffer.from(shot.data, "base64"),
    );
    await writeFile(
      resolve(root, "playback-tools-live-result.json"),
      JSON.stringify(
        {
          verifiedAt: new Date().toISOString(),
          browser: version.Browser,
          url: url.pathname,
          before,
          samples,
        },
        null,
        2,
      ),
    );
    console.log(
      JSON.stringify({
        result: "passed",
        browser: version.Browser,
        cache: "100%",
        clockSamples: samples.length,
        stableSamples,
        final: await evaluate(snapshot),
      }),
    );
  } finally {
    page?.close();
    await browser.send("Target.disposeBrowserContext", { browserContextId });
    browser.close();
  }
}

await main();
