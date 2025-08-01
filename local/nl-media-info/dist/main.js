var T=r=>{throw TypeError(r)};var Q=(r,e,t)=>e.has(r)||T("Cannot "+t);var v=(r,e,t)=>e.has(r)?T("Cannot add the same private member more than once"):e instanceof WeakSet?e.add(r):e.set(r,t);var f=(r,e,t)=>(Q(r,e,"access private method"),t);(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const o of document.querySelectorAll('link[rel="modulepreload"]'))i(o);new MutationObserver(o=>{for(const n of o)if(n.type==="childList")for(const l of n.addedNodes)l.tagName==="LINK"&&l.rel==="modulepreload"&&i(l)}).observe(document,{childList:!0,subtree:!0});function t(o){const n={};return o.integrity&&(n.integrity=o.integrity),o.referrerPolicy&&(n.referrerPolicy=o.referrerPolicy),o.crossOrigin==="use-credentials"?n.credentials="include":o.crossOrigin==="anonymous"?n.credentials="omit":n.credentials="same-origin",n}function i(o){if(o.ep)return;o.ep=!0;const n=t(o);fetch(o.href,n)}})();const p={parseFileSize(r){if(!r)return 0;const e=parseInt(r,10);return isNaN(e)?0:e/1024},formatFileSize(r){return r>=1024*1024?`${(r/1024/1024).toFixed(2)} MiB`:r>=1024?`${(r/1024).toFixed(2)} KiB`:`${r.toFixed(2)} Bytes`}},I={AUDIO:"audio",VIDEO:"video",OTHER:"other"};var c,L,k,j,P;class _{static generateFormatStats(e){return Object.values(I).reduce((t,i)=>(t[i]=f(this,c,k).call(this,f(this,c,L).call(this,e,i)),t),{})}static generateStatsHTML(e){let t="";return Object.entries(e).forEach(([i,o])=>{t+=`<div class="category">
        <h4>${i.toUpperCase()}</h4>`,Object.entries(o).forEach(([n,l])=>{t+=`
          <div class="format">
            <h5>${n}</h5>
            <p>ファイル数: ${l.count}</p>
            <p>総サイズ: ${p.formatFileSize(l.totalSize)}</p>
            <p>平均サイズ: ${p.formatFileSize(l.averageSize)}</p>
            <p>最小サイズ: ${p.formatFileSize(l.minSize)}</p>
            <p>最大サイズ: ${p.formatFileSize(l.maxSize)}</p>
          </div>`}),t+="</div>"}),t}static calculateTotalStats(e){const t={totalFiles:0,totalSize:0,audioFiles:0,audioSize:0,videoFiles:0,videoSize:0};return e.audio&&Object.values(e.audio).forEach(i=>{t.audioFiles+=i.count,t.audioSize+=i.totalSize}),e.video&&Object.values(e.video).forEach(i=>{t.videoFiles+=i.count,t.videoSize+=i.totalSize}),t.totalFiles=t.audioFiles+t.videoFiles,t.totalSize=t.audioSize+t.videoSize,t}}c=new WeakSet,L=function(e,t){return e.filter(i=>{const o=i.media["@ref"];switch(t){case I.AUDIO:return o.includes("audio")&&!o.includes("init");case I.VIDEO:return o.includes("video")&&!o.includes("init");case I.OTHER:return!o.includes("audio")&&!o.includes("video");default:return!1}})},k=function(e){const t={};return e.forEach(i=>{const o=f(this,c,j).call(this,i),n=f(this,c,P).call(this,i);t[o]||(t[o]={count:0,totalSize:0,averageSize:0,minSize:1/0,maxSize:0}),t[o].count++,t[o].totalSize+=n,t[o].minSize=Math.min(t[o].minSize,n),t[o].maxSize=Math.max(t[o].maxSize,n)}),Object.values(t).forEach(i=>{i.averageSize=i.totalSize/i.count}),t},j=function(e){return e.media.track[0].Format||"Unknown"},P=function(e){return parseInt(e.media.track[0].FileSize||"0",10)},v(_,c);const d={nlMediaInfobaseurl:"https://www.nicovideo.jp/cache/mediainfo?",nlMediaInfoVideoId:window.opener.NicoCache_nl.watch.apiData.video.id,nlMediaInfoVideoTitle:window.opener.NicoCache_nl.watch.apiData.video.title,MasterFile:"master.m3u8",VideoInitFile:"init01.cmfv",AudioInitFile:"init01.cmfa",VideoInitFile2:"init1.cmfv",AudioInitFile2:"init1.cmfa",VideoInitFile3:"001.cmfv",AudioInitFile3:"001.cmfa"};var g,U,G,K;class H{constructor(e){v(this,g);this.mediaInfo=e}getAudioFiles(){const e=this.mediaInfo.filter(t=>t.media["@ref"].includes(d.AudioInitFile)||t.media["@ref"].includes(d.AudioInitFile2)||t.media["@ref"].includes(d.AudioInitFile3));return console.log("音声ファイルの情報を取得するのじゃ:",e),e}getVideoFiles(){const e=this.mediaInfo.filter(t=>t.media["@ref"].includes(d.VideoInitFile)||t.media["@ref"].includes(d.VideoInitFile2)||t.media["@ref"].includes(d.VideoInitFile3));return console.log("映像ファイルの情報を取得するのじゃ:",e),e}getTotalFileSize(){const e=this.mediaInfo.reduce((t,i)=>{const o=parseInt(i.media.track[0].FileSize||"0",10);return t+o},0);return console.log("全体のファイルサイズを取得するのじゃ:",e),e}getCreationDates(){const e=this.mediaInfo.map(t=>({file:t.media["@ref"],created:t.media.track[0].File_Created_Date}));return console.log("ファイルの作成日時情報を取得するのじゃ:",e),e}getMediaDetails(){const e=f(this,g,U).call(this),t=f(this,g,G).call(this),i=f(this,g,K).call(this);return console.log("メディア情報の詳細を取得するのじゃ:",{general:e,video:t,audio:i}),{general:e,video:t,audio:i}}getFormatStats(){const e=_.generateFormatStats(this.mediaInfo);return console.log("統計情報を取得するのじゃ:",e),e}}g=new WeakSet,U=function(){var t;const e=((t=this.mediaInfo.find(i=>i.media["@ref"].includes(d.MasterFile)))==null?void 0:t.media.track.find(i=>i["@type"]==="General"))||this.mediaInfo.find(i=>i.media["@ref"].includes(d.MasterFile));return console.log("一般情報を抽出するのじゃ:",e),e},G=function(){var t;const e=((t=this.mediaInfo.find(i=>i.media["@ref"].includes(d.MasterFile)))==null?void 0:t.media.track.find(i=>i["@type"]==="Video"))||this.mediaInfo.find(i=>i.media["@ref"].includes(d.VideoInitFile))||this.mediaInfo.find(i=>i.media["@ref"].includes(d.VideoInitFile2))||this.mediaInfo.find(i=>i.media["@ref"].includes(d.VideoInitFile3));return console.log("映像情報を抽出するのじゃ:",e),e},K=function(){var t;const e=((t=this.mediaInfo.find(i=>i.media["@ref"].includes(d.MasterFile)))==null?void 0:t.media.track.find(i=>i["@type"]==="Audio"))||this.mediaInfo.find(i=>i.media["@ref"].includes(d.AudioInitFile))||this.mediaInfo.find(i=>i.media["@ref"].includes(d.AudioInitFile2))||this.mediaInfo.find(i=>i.media["@ref"].includes(d.AudioInitFile3));return console.log("音声情報を抽出するのじゃ:",e),e};var x,Y;class W{static parse(e){const t=new H(e),i=f(this,x,Y).call(this,e);return{result:{video:i.video,audio:i.audio,general:i.general,averageBitrates:i.averageBitrates},formatStats:t.getFormatStats()}}}x=new WeakSet,Y=function(e){var F;const t=new H(e),i={general:{},video:[],audio:[],averageBitrates:{overall:0,video:0,audio:0}},o=e.find(a=>a.media["@ref"].includes(d.VideoInitFile)||a.media["@ref"].includes(d.VideoInitFile2)||a.media["@ref"].includes(d.VideoInitFile3)),n=e.find(a=>a.media["@ref"].includes(d.AudioInitFile)||a.media["@ref"].includes(d.AudioInitFile2)||a.media["@ref"].includes(d.AudioInitFile3));o&&o.media.track&&o.media.track.forEach(a=>{if(a["@type"]==="Video"){const s={Width:a.Width,Height:a.Height,Format:a.Format,"Format profile":a.Format_Profile,"Format settings":a.Format_Settings_CABAC,"Frame rate mode":a.FrameRate_Mode,"Frame rate":a.FrameRate,"Color space":a.ColorSpace,"Color range":a.colour_range,"Color primaries":a.colour_primaries,"Display aspect ratio":a.DisplayAspectRatio};i.video.push(s),console.log("Video track raw data:",a),console.log("Processed video data:",s)}}),n&&n.media.track&&n.media.track.forEach(a=>{if(a["@type"]==="Audio"){const s={Format:a.Format,"Format profile":a.Format_AdditionalFeatures,"Channel(s)":a.Channels,"Channel positions":a.ChannelPositions,"Channel layout":a.ChannelLayout,"Sampling rate":a.SamplingRate,"Frame rate":a.FrameRate,"Compression mode":a.Compression_Mode,"Stream size":a.StreamSize,Default:a.Default,"Alternate group":a.AlternateGroup};i.audio.push(s)}});const l=t.getAudioFiles(),h=t.getVideoFiles();l.forEach(a=>{p.parseFileSize(a.media.track[0].FileSize)}),h.forEach(a=>{p.parseFileSize(a.media.track[0].FileSize)});const u=e.find(a=>a.media["@ref"].includes("master.m3u8")),m=u==null?void 0:u.media.track.find(a=>a["@type"]==="General");if(i.general={Format:(m==null?void 0:m.Format)||"N/A","File size":(m==null?void 0:m.FileSize)||"N/A",Duration:((F=o==null?void 0:o.media.track.find(a=>a["@type"]==="Video"))==null?void 0:F.Duration)||"N/A","Complete name":(u==null?void 0:u.media["@ref"])||"N/A",ID:d.nlMediaInfoVideoId},n&&n.media.track){const a=n.media.track.find(s=>s["@type"]==="Audio");i.averageBitrates.audio=a?parseInt(a.BitRate_Maximum||"192000"):192e3}if(o&&o.media.track){const a=o.media.track.find(s=>s["@type"]==="Video");i.averageBitrates.video=a?parseInt(a.BitRate_Maximum||"1500000"):15e5}return i.averageBitrates.overall=i.averageBitrates.audio+i.averageBitrates.video,console.log("init01.cmfv:",o),console.log("init01.cmfa:",n),console.log("パース結果:",i),i},v(W,x);class R{static updateAll(e){this.updateBasicInfo(e),this.updateDetailedInfo(e),this.updateStatistics(e.formatStats)}static updateBasicInfo(e){const t=document.getElementById("results");t&&(t.style.display="block");const i=document.getElementById("loading");i&&(i.style.display="none");const o=e.result.video[0]||{},n=e.result.audio[0]||{},l=e.result.general||{},h=e.result.averageBitrates||{},u=document.querySelector("#resolution .resolution-value");u&&(u.textContent=`${o.Width||"N/A"} x ${o.Height||"N/A"} pixels`);const m=document.querySelector("#bitrate .overall-bitrate");m&&(m.textContent=`全体平均: ${(h.overall/1024/1024).toFixed(2)} Mbps`);const F=document.querySelector("#bitrate .video-bitrate");F&&(F.textContent=`映像平均: ${(h.video/1024/1024).toFixed(2)} Mbps`);const a=document.querySelector("#bitrate .audio-bitrate");a&&(a.textContent=`音声平均: ${(h.audio/1024).toFixed(2)} Kbps`);const s=document.querySelector("#video-codec .format");s&&(s.textContent=`${o.Format||"N/A"} (${o["Format profile"]||"N/A"})`);const b=document.querySelector("#video-codec .cabac");b&&(b.textContent=`CABAC設定: ${o["Format settings"]||"N/A"}`);const y=document.querySelector("#audio-codec .format");y&&(y.textContent=`形式: ${n.Format||"N/A"}`);const A=document.querySelector("#audio-codec .channels");A&&(A.textContent=`チャンネル: ${n["Channel(s)"]||"N/A"}`);const z=document.querySelector("#audio-codec .sampling-rate");z&&(z.textContent=`サンプリングレート: ${n["Sampling rate"]||"N/A"}`);const E=document.querySelector("#framerate .mode");E&&(E.textContent=`モード: ${o["Frame rate mode"]||"N/A"}`);const C=document.querySelector("#framerate .rate");C&&(C.textContent=`レート: ${o["Frame rate"]||"N/A"}`);const $=document.querySelector("#container .format");$&&($.textContent=`${l.Format||"N/A"}`);const w=document.querySelector("#color .space");w&&(w.textContent=`色空間: ${o["Color space"]||"N/A"}`);const M=document.querySelector("#color .range");M&&(M.textContent=`色域: ${o["Color range"]||"N/A"}`);const B=document.querySelector("#color .primaries");B&&(B.textContent=`色基準: ${o["Color primaries"]||"N/A"}`);const N=document.querySelector("#aspect .ratio");N&&(N.textContent=`${o["Display aspect ratio"]||"N/A"}`);const V=document.querySelector("#filesize .size");V&&(V.textContent=`${p.formatFileSize(parseInt(l["File size"]||"0"))}`);const D=document.querySelector("#filesize .duration");D&&(D.textContent=`再生時間: ${l.Duration||"N/A"}`);const O=document.querySelector("#metadata .path");O&&(O.textContent=`完全パス: ${l["Complete name"]||"N/A"}`);const q=document.querySelector("#metadata .id");q&&(q.textContent=`ID: ${l.ID||"N/A"}`),this.updateDetailedInfo(e),this.updateStatistics(e.formatStats)}static updateDetailedInfo(e){const t=document.getElementById("video-stream-details"),i=document.getElementById("audio-stream-details");t&&e.result.video.length>0&&(t.innerHTML=Object.entries(e.result.video[0]).map(([o,n])=>`<div class="info-row"><span class="label">${o}:</span><span class="value">${n||"N/A"}</span></div>`).join("")),i&&e.result.audio.length>0&&(i.innerHTML=Object.entries(e.result.audio[0]).map(([o,n])=>`<div class="info-row"><span class="label">${o}:</span><span class="value">${n||"N/A"}</span></div>`).join(""))}static updateStatistics(e){const t=document.getElementById("format-statistics");if(!t)return;let i="";Object.keys(e).forEach(o=>{i+=`<div class="category"><h4>${o.toUpperCase()}</h4>`,Object.keys(e[o]).forEach(n=>{const l=e[o][n];i+=`<div class="format">
          <h5>${n}</h5>
          <p>ファイル数: ${l.count}</p>
          <p>総サイズ: ${p.formatFileSize(l.totalSize)}</p>
          <p>平均サイズ: ${p.formatFileSize(l.totalSize/l.count)}</p>
        </div>`}),i+="</div>"}),t.innerHTML=i}static updateTitle(e,t){const i=document.getElementsByTagName("title")[0];i?i.innerHTML=`nlMediaInfo: ${e} (${t})`:console.warn("titleタグが見つからないのじゃ")}}const X=`
    #nlMediaInfo {
        display: block;
        padding: 20px;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      }
      
      .media-info-results {
        max-width: 1200px;
        margin: 0 auto;
      }
      
      .category {
        margin-bottom: 30px;
        border: 1px solid #ddd;
        border-radius: 5px;
        padding: 15px;
      }
      
      .category h4 {
        margin-top: 0;
        color: #333;
        border-bottom: 2px solid #007bff;
        padding-bottom: 5px;
      }
      
      .format, .codec, .bitrate {
        background: #f8f9fa;
        padding: 10px;
        margin: 10px 0;
        border-radius: 4px;
      }
      
      .format h5, .codec h5, .bitrate h5 {
        margin: 0 0 10px 0;
        color: #495057;
      }
      
      .format p, .codec p, .bitrate p {
        margin: 5px 0;
        color: #666;
      }
      
      #loading {
        text-align: center;
        padding: 20px;
        color: #666;
      }
      
      #error {
        color: crimson;
        padding: 10px;
        margin: 10px 0;
        border: 1px solid crimson;
        border-radius: 4px;
        background-color: #fff5f5;
      }
      
      .media-summary {
        background: #f8f9fa;
        padding: 20px;
        border-radius: 8px;
        margin-bottom: 30px;
      }
      
      .summary-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        gap: 20px;
        margin-top: 20px;
      }
      
      .summary-item {
        background: white;
        padding: 20px;
        border-radius: 8px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        min-height: 120px;
      }
      
      .summary-item h3 {
        margin: 0 0 15px 0;
        color: #333;
        font-size: 1.1em;
        border-bottom: 2px solid #007bff;
        padding-bottom: 5px;
      }
      
      .summary-item p {
        margin: 8px 0;
        color: #666;
        line-height: 1.4;
      }
      
      .detailed-info {
        margin-top: 30px;
      }
      
      .video-details, .audio-details {
        background: #fff;
        padding: 20px;
        border-radius: 8px;
        margin-bottom: 20px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.05);
      }
      
      .info-row {
        display: grid;
        grid-template-columns: 200px 1fr;
        padding: 8px 0;
        border-bottom: 1px solid #eee;
      }
      
      .info-row .label {
        font-weight: bold;
        color: #555;
      }
      
      .info-row .value {
        color: #666;
      }
      
      /* ダークモード対応 */
      @media (prefers-color-scheme: dark) {
        body {
          background-color: #1a1a1a;
          color: #fff;
        }
      
        .category {
          border-color: #333;
        }
      
        .format, .codec, .bitrate {
          background: inherit;
        }
      
        .format h5, .codec h5, .bitrate h5 {
          color: #e1e1e1;
        }
      
        .format p, .codec p, .bitrate p {
          color: #bbb;
        }
      
        .media-summary {
          background: #2d2d2d;
        }
        
        .summary-item {
          background: #333;
        }
        
        .summary-item h3 {
          color: #e1e1e1;
        }
        
        .summary-item p {
          color: #bbb;
        }
        
        .video-details, .audio-details {
          background: #2d2d2d;
        }
        
        .info-row {
          border-bottom-color: #444;
        }
        
        .info-row .label {
          color: #e1e1e1;
        }
        
        .info-row .value {
          color: #bbb;
        }
      }  
`,Z='<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M4 6.47 5.76 10H20v8H4V6.47M22 4h-4l2 4h-3l-2-4h-2l2 4h-3l-2-4H8l2 4H7L5 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4z"/></svg>',J=document.createElement("style");J.textContent=X;document.head.appendChild(J);const S=document.createElement("link");S.rel="Shortcut Icon";S.href="data:image/svg+xml,"+encodeURIComponent(Z);document.head.appendChild(S);window.addEventListener("load",()=>{ee()});function ee(){R.updateTitle(d.nlMediaInfoVideoTitle,d.nlMediaInfoVideoId),te(`${d.nlMediaInfobaseurl}${d.nlMediaInfoVideoId}`).then(r=>{const e=W.parse(r);return console.log("パース後のデータ:",e),e}).then(r=>{if(!r||!r.result)throw new Error("パースされたデータが不正なのじゃ");R.updateAll(r)}).catch(r=>{console.error("メディア情報の取得に失敗したのじゃ:",r);const e=document.getElementById("loading"),t=document.getElementById("error");e&&(e.style.display="none"),t&&(t.style.display="block",t.textContent=`エラー: ${r.message}`)})}async function te(r){try{const e=await fetch(r);if(!e.ok)throw new Error(`HTTPエラー: ${e.status} ${e.statusText}`);return await e.json()}catch(e){throw console.error("メディア情報の取得中にエラーが発生したのじゃ:",e),e}}
