/**
 * 2026-08-24 に Cookie なしの隔離 Chrome で取得した公式 Watch 資産と
 * Network ログから、destroy-ads の境界に必要な最小部分だけを抜粋した fixture。
 * Cookie、query string、認証ヘッダー、個人識別子は含まない。
 */
export const DESTROY_ADS_WATCH_FIXTURE = {
  capturedAt: "2026-08-24T17:02:56.152Z",
  watchUrl: "https://www.nicovideo.jp/watch/sm9",
  assets: {
    advertisement: {
      url: "https://resource.video.nimg.jp/web/scripts/nvpc_next/assets/Advertisement-oTFGzzB0.js",
      sha256:
        "bf5fa773d5c7269898e37f672bdbdfdd80f044cae2e8939448387ebc1a22cd87",
      source:
        'var g=c(({zone:e,css:t,onRender:a,onEmpty:c,children:p,...m})=>{let g=`ads-${e}-${(0,d.useId)()}`,_=i(),{getPageTransitionState:v}=l(),{adsjsPromise:y,isAvailable:b,segments:x}=h(),S=(0,d.use)(y),C=b&&S,[w,T]=(0,d.useState)(!1),E=(0,d.useRef)(null),D=o(E,m.ref),O=(0,d.useRef)(null),k=(0,d.useCallback)(()=>{a?.({zone:e})},[e,a]),A=(0,d.useCallback)(()=>{T(!0),c?.({zone:e})},[e,c]);if(r(()=>{C&&_.state===`idle`&&O.current?.transitionId!==v().transitionId&&(O.current=v(),n.write(()=>{let t=Array.from(E.current?.children??[]);T(!1),new S.Advertisement({zone:e,segments:x,eventListeners:{render:()=>{for(let e of t)e.remove();k()},empty:()=>{for(let e of t)e.remove();A()}}}).set(g)}))},[v().transitionId,_]),C)return(0,f.jsx)(`div`,{...m,id:g,"data-zone":e,className:s(m.className,u({backgroundColor:`layer.surfaceLowEm`},t)),hidden:w,ref:D,children:(0,f.jsx)(`div`,{className:u({minWidth:t?.minWidth,minHeight:t?.minHeight})})})},{Fallback:e=>(0,f.jsx)(`div`,{className:s(e.className,u({backgroundColor:`layer.surfaceLowEm`},e.css)),children:(0,f.jsx)(`div`,{className:u({minWidth:e.css?.minWidth,minHeight:e.css?.minHeight})})})});export{h as n,m as r,g as t};',
    },
    root: {
      url: "https://resource.video.nimg.jp/web/scripts/nvpc_next/assets/root-C7txG_rN.js",
      sha256:
        "8696b669ca3a02ec6bd80a965a407f347706a040cd0694512eee218f6e5deae2",
      source:
        "be.WKTKClient.init({baseURL:a.publicUrl.wktk,frontendId:6,frontendVersion:`0`,responseType:`pc`}),D(a.publicUrl.adsResource)),d.initialize({beaconUri:i(a.publicUrl.nvLogger,`/6/log.gif`)",
    },
    playerCurrentTime: {
      url: "https://resource.video.nimg.jp/web/scripts/nvpc_next/assets/PlayerCurrentTime-DyMaJv5-.js",
      sha256:
        "93b968dcd0b0596898c3d86ff3b23dad30729112c83fb3129fc270136071c5ce",
      source:
        "var q=g(y(e=>{let t=e(K)?.videoAds?.[0];if(t)return Ai.has(t)||Ai.set(t,ji(t,e)),Ai.get(t)}),[async e=>{let t=e.peek(U);if(await t.isAutoPlayable()){let n=t.getPrerollVideoAds().at(0);n&&Ai.set(n,ji(n,e))}},async e=>{e(w);let t=await e(q);return()=>{t?.destroy()}},async e=>{let t=await e(q);if(!t)return;e(J);let n=e.peek(U),r=()=>{n.isMuted()?t.adsManager.setVolume(0):t.adsManager.setVolume(n.fixVolume(n.getVolume(),e.peek(vi)?{loudnessCorrectionType:Vn(t.entry.data.type,t.ad),isHeadContent:t.entry.data.type===`preroll`}:void 0))};return r(),n.events.on(`stateChanged`,r)},async(e,t)=>{try{await Promise.resolve(e(q))}catch(n){console.error(n);let r=e.peek(K)?.videoAds[0];r&&t(Ei,r)}}]),Mi=g(y(!1),a",
    },
    playerVolumeBar: {
      url: "https://resource.video.nimg.jp/web/scripts/nvpc_next/assets/PlayerVolumeBar-CshODhlc.js",
      sha256:
        "783c97505f5d4fa546e4a35b90fc70b43009105cf6d097a0bac21dd043417524",
      source:
        "N=e(async()=>{if(typeof window>`u`)return{isAdBlocked:!1,data:{window}};if(await P())return{isAdBlocked:!0,data:{dom:!0}};let e=await Promise.allSettled([g(l.getSnapshot().publicUrl.adsResource).then(e=>e===null?Promise.reject(`adsjs is null`):e),F(`https://imasdk.googleapis.com/js/sdkloader/ima3.js`),F(`https://dwango-d.openx.net/w/1.0/jstag`)]);return e.every(e=>e.status===`rejected`)?{isAdBlocked:!0,data:{script:e}}:{isAdBlocked:!1,data:{script:e}}})",
    },
  },
  requests: [
    {
      role: "動画広告API",
      url: "https://ads.nicovideo.jp/api/video/getAd.json.php",
      expected: "block",
    },
    {
      role: "公式広告script",
      url: "https://res.ads.nicovideo.jp/assets/js/ads2.js",
      expected: "block",
    },
    {
      role: "GTM",
      url: "https://www.googletagmanager.com/gtm.js",
      expected: "block",
    },
    {
      role: "ニコニ広告API",
      url: "https://api.nicoad.nicovideo.jp/v2/contents/video/sm9/pickup_supporters",
      expected: "block",
    },
    {
      role: "IMA",
      url: "https://imasdk.googleapis.com/js/sdkloader/ima3.js",
      expected: "block",
    },
    {
      role: "OpenX",
      url: "https://dwango-d.openx.net/w/1.0/jstag",
      expected: "block",
    },
    {
      role: "インストリーム広告media",
      url: "https://dcdn.cdn.nimg.jp/nicoad/instream/video/ad.mp4",
      expected: "block",
    },
    {
      role: "Watch文書",
      url: "https://www.nicovideo.jp/watch/sm9",
      expected: "allow",
    },
    {
      role: "動画初期化API",
      url: "https://nvapi.nicovideo.jp/v1/watch/sm9/access-rights/hls",
      expected: "allow",
    },
    {
      role: "HLS variant playlist",
      url: "https://delivery.domand.nicovideo.jp/hlsbid/65361bc62dea22945ea6e527/playlists/variants/7c0fdedb8342ad73.m3u8",
      expected: "allow",
    },
    {
      role: "映像playlist",
      url: "https://delivery.domand.nicovideo.jp/hlsbid/65361bc62dea22945ea6e527/playlists/media/video-h264-360p-lowest.m3u8",
      expected: "allow",
    },
    {
      role: "音声playlist",
      url: "https://delivery.domand.nicovideo.jp/hlsbid/65361bc62dea22945ea6e527/playlists/media/audio-aac-128kbps.m3u8",
      expected: "allow",
    },
    {
      role: "映像初期化segment",
      url: "https://asset.domand.nicovideo.jp/65361bc62dea22945ea6e527/video/12/video-h264-360p-lowest/init01.cmfv",
      expected: "allow",
    },
    {
      role: "音声初期化segment",
      url: "https://asset.domand.nicovideo.jp/65361bc62dea22945ea6e527/audio/1/audio-aac-128kbps/init01.cmfa",
      expected: "allow",
    },
    {
      role: "映像復号key",
      url: "https://delivery.domand.nicovideo.jp/hlsbid/65361bc62dea22945ea6e527/keys/video-h264-360p-lowest.key",
      expected: "allow",
    },
    {
      role: "映像再生segment",
      url: "https://asset.domand.nicovideo.jp/65361bc62dea22945ea6e527/video/12/video-h264-360p-lowest/01.cmfv",
      expected: "allow",
    },
    {
      role: "コメント取得API",
      url: "https://public.nvcomment.nicovideo.jp/v1/threads",
      expected: "allow",
    },
    {
      role: "公式PlayerCurrentTime資産",
      url: "https://resource.video.nimg.jp/web/scripts/nvpc_next/assets/PlayerCurrentTime-DyMaJv5-.js",
      expected: "allow",
    },
  ],
} as const;
