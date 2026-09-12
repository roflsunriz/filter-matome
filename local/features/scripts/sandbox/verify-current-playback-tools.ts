import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  getBrowserVersionEndpoint,
  RawCdpClient,
  waitForTargetWebSocket,
} from "./raw-cdp-client";

const endpoint = "http://127.0.0.1:9222";
const root = resolve(
  import.meta.dirname,
  "../../src/sandbox/official-watch-bundle",
);
const snapshot = `(() => {
  const video=document.querySelector('video[data-name="video-content"]');
  const panel=document.querySelector('mlink-video-controller')?.shadowRoot;
  const api=globalThis.FilterMatomeBufferingApi;
  return { title:document.title, video:!!video, duration:video?.duration, time:video?.currentTime, paused:video?.paused,
    buffered:video?Array.from({length:video.buffered.length},(_,i)=>[video.buffered.start(i),video.buffered.end(i)]):[],
    api:api?.getState(), probe:document.querySelector('[data-api-id="full-buffer"]')?.dataset.status,
    tools:!!panel?.querySelector('[data-playback-tools]'), status:panel?.querySelector('[data-buffer-status]')?.textContent,
    percent:panel?.querySelector('[data-buffer-progress]')?.value, repeat:panel?.querySelector('[data-action="ab-toggle"]')?.getAttribute('aria-pressed') };
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
    await page.send("Network.enable");
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
    await page.send("Page.navigate", {
      url: "https://www.nicovideo.jp/watch/sm9?from=230",
    });
    let ready = false;
    for (let attempt = 0; attempt < 45; attempt++) {
      await new Promise((done) => setTimeout(done, 1000));
      const state = await evaluate(snapshot);
      if (attempt % 10 === 0) console.log(JSON.stringify(state));
      if (
        state.api &&
        state.tools &&
        typeof state.duration === "number" &&
        state.duration > 0
      ) {
        ready = true;
        break;
      }
    }
    if (!ready) {
      console.log(JSON.stringify(await evaluate(snapshot)));
      throw new Error("Official video / buffering API / mlink not ready");
    }
    console.log(JSON.stringify({ before: await evaluate(snapshot) }));
    await evaluate(`(() => {
      const video=document.querySelector('video[data-name="video-content"]'); video.pause(); video.currentTime=100;
      const root=document.querySelector('mlink-video-controller').shadowRoot;
      root.querySelector('#fab').click();root.querySelector('[data-tab="playback"]').click();
      root.querySelector('[data-action="full-buffer"]').click(); return {};
    })()`);
    let completed = false;
    for (let attempt = 0; attempt < 120; attempt++) {
      await new Promise((done) => setTimeout(done, 1000));
      const state = await evaluate(snapshot);
      if (attempt % 10 === 0) console.log(JSON.stringify(state));
      if (state.paused !== true || Math.abs(Number(state.time) - 100) > 0.2)
        throw new Error("Preloading moved playback");
      if (state.percent === 100) {
        completed = true;
        break;
      }
    }
    if (!completed) throw new Error("Full buffering did not complete");
    await evaluate(`(() => {
      const root=document.querySelector('mlink-video-controller').shadowRoot;
      root.querySelector('[data-action="full-buffer"]').click();
      for(const [point,value] of [['a','1:40'],['b','1:41']]){const input=root.querySelector('[data-point="'+point+'"]');input.value=value;input.dispatchEvent(new Event('change',{bubbles:true}));}
      root.querySelector('[data-action="ab-toggle"]').click();
      const video=document.querySelector('video[data-name="video-content"]');video.currentTime=100.9;return video.play().then(()=>({}));
    })()`);
    await new Promise((done) => setTimeout(done, 1600));
    const repeated = await evaluate(snapshot);
    if (
      Number(repeated.time) < 100 ||
      Number(repeated.time) >= 101.2 ||
      repeated.repeat !== "true"
    )
      throw new Error("A-B repeat failed");
    await evaluate(
      `(() => { document.querySelector('video[data-name="video-content"]').pause();const root=document.querySelector('mlink-video-controller').shadowRoot;root.querySelector('[data-playback-tools]').scrollIntoView({block:'center'});return {};})()`,
    );
    for (const [width, height] of [
      [360, 800],
      [800, 600],
      [600, 360],
      [1920, 1080],
    ]) {
      await page.send("Emulation.setDeviceMetricsOverride", {
        width,
        height,
        deviceScaleFactor: 1,
        mobile: false,
      });
      const layout = await evaluate(`(() => {
        const root=document.querySelector('mlink-video-controller').shadowRoot;
        const panel=root.querySelector('.panel').getBoundingClientRect();
        const button=root.querySelector('[data-action="ab-clear"]');button.scrollIntoView({block:'center'});
        const control=button.getBoundingClientRect();
        return {fits:panel.left>=0&&panel.right<=innerWidth&&panel.top>=0&&panel.bottom<=innerHeight&&control.left>=0&&control.right<=innerWidth&&control.top>=0&&control.bottom<=innerHeight,
          viewport:[innerWidth,innerHeight],panel:panel.toJSON(),control:control.toJSON(),responsive:root.querySelector('style').textContent.includes('min(450px')};
      })()`);
      if (!layout.fits)
        throw new Error(
          `Playback controls overflow: ${width}x${height}: ${JSON.stringify(layout)}`,
        );
    }
    await page.send("Emulation.setDeviceMetricsOverride", {
      width: 1280,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await evaluate(
      `(() => {document.querySelector('mlink-video-controller').shadowRoot.querySelector('[data-playback-tools]').scrollIntoView({block:'center'});return {};})()`,
    );
    await evaluate(
      `new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve({}))))`,
    );
    const bounds = await evaluate(
      `(() => {const r=document.querySelector('mlink-video-controller').shadowRoot.querySelector('[data-playback-tools]').getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,scale:1};})()`,
    );
    const shot = await page.send<{ data: string }>("Page.captureScreenshot", {
      format: "png",
      clip: bounds,
      captureBeyondViewport: false,
    });
    await writeFile(
      resolve(root, "playback-tools-live.png"),
      Buffer.from(shot.data, "base64"),
    );
    await page.send("Page.reload", { ignoreCache: false });
    let reloadReady = false;
    for (let attempt = 0; attempt < 40; attempt++) {
      await new Promise((done) => setTimeout(done, 250));
      const state = await evaluate(`(() => ({ready:
        globalThis.FilterMatomeBufferingApi?.version===1 && globalThis.FilterMatomeBufferingApi.getState().enabled===false &&
        document.querySelector('[data-api-id="full-buffer"]')?.dataset.status==='active' &&
        document.querySelector('mlink-video-controller')?.shadowRoot?.querySelector('[data-action="ab-toggle"]')?.getAttribute('aria-pressed')==='false'
      }))()`);
      if (state.ready) {
        reloadReady = true;
        break;
      }
    }
    if (!reloadReady)
      throw new Error(
        "Normal reload did not reset playback tools and restore API status",
      );
    console.log(
      JSON.stringify({
        result: "passed",
        browser: version.Browser,
        fullBuffer: "100%",
        repeat: repeated,
      }),
    );
  } finally {
    page?.close();
    await browser.send("Target.disposeBrowserContext", { browserContextId });
    browser.close();
  }
}

await main();
