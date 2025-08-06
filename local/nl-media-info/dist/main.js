(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const i of document.querySelectorAll('link[rel="modulepreload"]'))o(i);new MutationObserver(i=>{for(const n of i)if(n.type==="childList")for(const l of n.addedNodes)l.tagName==="LINK"&&l.rel==="modulepreload"&&o(l)}).observe(document,{childList:!0,subtree:!0});function e(i){const n={};return i.integrity&&(n.integrity=i.integrity),i.referrerPolicy&&(n.referrerPolicy=i.referrerPolicy),i.crossOrigin==="use-credentials"?n.credentials="include":i.crossOrigin==="anonymous"?n.credentials="omit":n.credentials="same-origin",n}function o(i){if(i.ep)return;i.ep=!0;const n=e(i);fetch(i.href,n)}})();const c={parseFileSize(d){if(!d)return 0;const t=parseInt(d,10);return isNaN(t)?0:t/1024},formatFileSize(d){return d>=1024*1024?`${(d/1024/1024).toFixed(2)} MiB`:d>=1024?`${(d/1024).toFixed(2)} KiB`:`${d.toFixed(2)} Bytes`}},p={AUDIO:"audio",VIDEO:"video",OTHER:"other"};class O{static generateFormatStats(t){return Object.values(p).reduce((e,o)=>(e[o]=this.#t(this.#e(t,o)),e),{})}static#e(t,e){return t.filter(o=>{const i=o.media["@ref"];switch(e){case p.AUDIO:return i.includes("audio")&&!i.includes("init");case p.VIDEO:return i.includes("video")&&!i.includes("init");case p.OTHER:return!i.includes("audio")&&!i.includes("video");default:return!1}})}static#t(t){const e={};return t.forEach(o=>{const i=this.#i(o),n=this.#o(o);e[i]||(e[i]={count:0,totalSize:0,averageSize:0,minSize:1/0,maxSize:0}),e[i].count++,e[i].totalSize+=n,e[i].minSize=Math.min(e[i].minSize,n),e[i].maxSize=Math.max(e[i].maxSize,n)}),Object.values(e).forEach(o=>{o.averageSize=o.totalSize/o.count}),e}static#i(t){return t.media.track[0].Format||"Unknown"}static#o(t){return parseInt(t.media.track[0].FileSize||"0",10)}static generateStatsHTML(t){let e="";return Object.entries(t).forEach(([o,i])=>{e+=`<div class="category">
        <h4>${o.toUpperCase()}</h4>`,Object.entries(i).forEach(([n,l])=>{e+=`
          <div class="format">
            <h5>${n}</h5>
            <p>ファイル数: ${l.count}</p>
            <p>総サイズ: ${c.formatFileSize(l.totalSize)}</p>
            <p>平均サイズ: ${c.formatFileSize(l.averageSize)}</p>
            <p>最小サイズ: ${c.formatFileSize(l.minSize)}</p>
            <p>最大サイズ: ${c.formatFileSize(l.maxSize)}</p>
          </div>`}),e+="</div>"}),e}static calculateTotalStats(t){const e={totalFiles:0,totalSize:0,audioFiles:0,audioSize:0,videoFiles:0,videoSize:0};return t.audio&&Object.values(t.audio).forEach(o=>{e.audioFiles+=o.count,e.audioSize+=o.totalSize}),t.video&&Object.values(t.video).forEach(o=>{e.videoFiles+=o.count,e.videoSize+=o.totalSize}),e.totalFiles=e.audioFiles+e.videoFiles,e.totalSize=e.audioSize+e.videoSize,e}}const r={nlMediaInfobaseurl:"https://www.nicovideo.jp/cache/mediainfo?",nlMediaInfoVideoId:window.opener.NicoCache_nl.watch.apiData.video.id,nlMediaInfoVideoTitle:window.opener.NicoCache_nl.watch.apiData.video.title,MasterFile:"master.m3u8",VideoInitFile:"init01.cmfv",AudioInitFile:"init01.cmfa",VideoInitFile2:"init1.cmfv",AudioInitFile2:"init1.cmfa",VideoInitFile3:"001.cmfv",AudioInitFile3:"001.cmfa"};class N{constructor(t){this.mediaInfo=t}getAudioFiles(){const t=this.mediaInfo.filter(e=>e.media["@ref"].includes(r.AudioInitFile)||e.media["@ref"].includes(r.AudioInitFile2)||e.media["@ref"].includes(r.AudioInitFile3));return console.log("音声ファイルの情報を取得するのじゃ:",t),t}getVideoFiles(){const t=this.mediaInfo.filter(e=>e.media["@ref"].includes(r.VideoInitFile)||e.media["@ref"].includes(r.VideoInitFile2)||e.media["@ref"].includes(r.VideoInitFile3));return console.log("映像ファイルの情報を取得するのじゃ:",t),t}getTotalFileSize(){const t=this.mediaInfo.reduce((e,o)=>{const i=parseInt(o.media.track[0].FileSize||"0",10);return e+i},0);return console.log("全体のファイルサイズを取得するのじゃ:",t),t}getCreationDates(){const t=this.mediaInfo.map(e=>({file:e.media["@ref"],created:e.media.track[0].File_Created_Date}));return console.log("ファイルの作成日時情報を取得するのじゃ:",t),t}getMediaDetails(){const t=this.#e(),e=this.#t(),o=this.#i();return console.log("メディア情報の詳細を取得するのじゃ:",{general:t,video:e,audio:o}),{general:t,video:e,audio:o}}getFormatStats(){const t=O.generateFormatStats(this.mediaInfo);return console.log("統計情報を取得するのじゃ:",t),t}#e(){const t=this.mediaInfo.find(e=>e.media["@ref"].includes(r.MasterFile))?.media.track.find(e=>e["@type"]==="General")||this.mediaInfo.find(e=>e.media["@ref"].includes(r.MasterFile));return console.log("一般情報を抽出するのじゃ:",t),t}#t(){const t=this.mediaInfo.find(e=>e.media["@ref"].includes(r.MasterFile))?.media.track.find(e=>e["@type"]==="Video")||this.mediaInfo.find(e=>e.media["@ref"].includes(r.VideoInitFile))||this.mediaInfo.find(e=>e.media["@ref"].includes(r.VideoInitFile2))||this.mediaInfo.find(e=>e.media["@ref"].includes(r.VideoInitFile3));return console.log("映像情報を抽出するのじゃ:",t),t}#i(){const t=this.mediaInfo.find(e=>e.media["@ref"].includes(r.MasterFile))?.media.track.find(e=>e["@type"]==="Audio")||this.mediaInfo.find(e=>e.media["@ref"].includes(r.AudioInitFile))||this.mediaInfo.find(e=>e.media["@ref"].includes(r.AudioInitFile2))||this.mediaInfo.find(e=>e.media["@ref"].includes(r.AudioInitFile3));return console.log("音声情報を抽出するのじゃ:",t),t}}class T{static parse(t){const e=new N(t),o=this.#e(t);return{result:{video:o.video,audio:o.audio,general:o.general,averageBitrates:o.averageBitrates},formatStats:e.getFormatStats()}}static#e(t){const e=new N(t),o={general:{},video:[],audio:[],averageBitrates:{overall:0,video:0,audio:0}},i=t.find(a=>a.media["@ref"].includes(r.VideoInitFile)||a.media["@ref"].includes(r.VideoInitFile2)||a.media["@ref"].includes(r.VideoInitFile3)),n=t.find(a=>a.media["@ref"].includes(r.AudioInitFile)||a.media["@ref"].includes(r.AudioInitFile2)||a.media["@ref"].includes(r.AudioInitFile3));i&&i.media.track&&i.media.track.forEach(a=>{if(a["@type"]==="Video"){const s={Width:a.Width,Height:a.Height,Format:a.Format,"Format profile":a.Format_Profile,"Format settings":a.Format_Settings_CABAC,"Frame rate mode":a.FrameRate_Mode,"Frame rate":a.FrameRate,"Color space":a.ColorSpace,"Color range":a.colour_range,"Color primaries":a.colour_primaries,"Display aspect ratio":a.DisplayAspectRatio};o.video.push(s),console.log("Video track raw data:",a),console.log("Processed video data:",s)}}),n&&n.media.track&&n.media.track.forEach(a=>{if(a["@type"]==="Audio"){const s={Format:a.Format,"Format profile":a.Format_AdditionalFeatures,"Channel(s)":a.Channels,"Channel positions":a.ChannelPositions,"Channel layout":a.ChannelLayout,"Sampling rate":a.SamplingRate,"Frame rate":a.FrameRate,"Compression mode":a.Compression_Mode,"Stream size":a.StreamSize,Default:a.Default,"Alternate group":a.AlternateGroup};o.audio.push(s)}});const l=e.getAudioFiles(),m=e.getVideoFiles();l.forEach(a=>{c.parseFileSize(a.media.track[0].FileSize)}),m.forEach(a=>{c.parseFileSize(a.media.track[0].FileSize)});const u=t.find(a=>a.media["@ref"].includes("master.m3u8")),f=u?.media.track.find(a=>a["@type"]==="General");if(o.general={Format:f?.Format||"N/A","File size":f?.FileSize||"N/A",Duration:i?.media.track.find(a=>a["@type"]==="Video")?.Duration||"N/A","Complete name":u?.media["@ref"]||"N/A",ID:r.nlMediaInfoVideoId},n&&n.media.track){const a=n.media.track.find(s=>s["@type"]==="Audio");o.averageBitrates.audio=a?parseInt(a.BitRate_Maximum||"192000"):192e3}if(i&&i.media.track){const a=i.media.track.find(s=>s["@type"]==="Video");o.averageBitrates.video=a?parseInt(a.BitRate_Maximum||"1500000"):15e5}return o.averageBitrates.overall=o.averageBitrates.audio+o.averageBitrates.video,console.log("init01.cmfv:",i),console.log("init01.cmfa:",n),console.log("パース結果:",o),o}}class V{static updateAll(t){this.updateBasicInfo(t),this.updateDetailedInfo(t),this.updateStatistics(t.formatStats)}static updateBasicInfo(t){const e=document.getElementById("results");e&&(e.style.display="block");const o=document.getElementById("loading");o&&(o.style.display="none");const i=t.result.video[0]||{},n=t.result.audio[0]||{},l=t.result.general||{},m=t.result.averageBitrates||{},u=document.querySelector("#resolution .resolution-value");u&&(u.textContent=`${i.Width||"N/A"} x ${i.Height||"N/A"} pixels`);const f=document.querySelector("#bitrate .overall-bitrate");f&&(f.textContent=`全体平均: ${(m.overall/1024/1024).toFixed(2)} Mbps`);const a=document.querySelector("#bitrate .video-bitrate");a&&(a.textContent=`映像平均: ${(m.video/1024/1024).toFixed(2)} Mbps`);const s=document.querySelector("#bitrate .audio-bitrate");s&&(s.textContent=`音声平均: ${(m.audio/1024).toFixed(2)} Kbps`);const h=document.querySelector("#video-codec .format");h&&(h.textContent=`${i.Format||"N/A"} (${i["Format profile"]||"N/A"})`);const F=document.querySelector("#video-codec .cabac");F&&(F.textContent=`CABAC設定: ${i["Format settings"]||"N/A"}`);const v=document.querySelector("#audio-codec .format");v&&(v.textContent=`形式: ${n.Format||"N/A"}`);const I=document.querySelector("#audio-codec .channels");I&&(I.textContent=`チャンネル: ${n["Channel(s)"]||"N/A"}`);const S=document.querySelector("#audio-codec .sampling-rate");S&&(S.textContent=`サンプリングレート: ${n["Sampling rate"]||"N/A"}`);const x=document.querySelector("#framerate .mode");x&&(x.textContent=`モード: ${i["Frame rate mode"]||"N/A"}`);const b=document.querySelector("#framerate .rate");b&&(b.textContent=`レート: ${i["Frame rate"]||"N/A"}`);const y=document.querySelector("#container .format");y&&(y.textContent=`${l.Format||"N/A"}`);const A=document.querySelector("#color .space");A&&(A.textContent=`色空間: ${i["Color space"]||"N/A"}`);const z=document.querySelector("#color .range");z&&(z.textContent=`色域: ${i["Color range"]||"N/A"}`);const E=document.querySelector("#color .primaries");E&&(E.textContent=`色基準: ${i["Color primaries"]||"N/A"}`);const C=document.querySelector("#aspect .ratio");C&&(C.textContent=`${i["Display aspect ratio"]||"N/A"}`);const $=document.querySelector("#filesize .size");$&&($.textContent=`${c.formatFileSize(parseInt(l["File size"]||"0"))}`);const w=document.querySelector("#filesize .duration");w&&(w.textContent=`再生時間: ${l.Duration||"N/A"}`);const M=document.querySelector("#metadata .path");M&&(M.textContent=`完全パス: ${l["Complete name"]||"N/A"}`);const B=document.querySelector("#metadata .id");B&&(B.textContent=`ID: ${l.ID||"N/A"}`),this.updateDetailedInfo(t),this.updateStatistics(t.formatStats)}static updateDetailedInfo(t){const e=document.getElementById("video-stream-details"),o=document.getElementById("audio-stream-details");e&&t.result.video.length>0&&(e.innerHTML=Object.entries(t.result.video[0]).map(([i,n])=>`<div class="info-row"><span class="label">${i}:</span><span class="value">${n||"N/A"}</span></div>`).join("")),o&&t.result.audio.length>0&&(o.innerHTML=Object.entries(t.result.audio[0]).map(([i,n])=>`<div class="info-row"><span class="label">${i}:</span><span class="value">${n||"N/A"}</span></div>`).join(""))}static updateStatistics(t){const e=document.getElementById("format-statistics");if(!e)return;let o="";Object.keys(t).forEach(i=>{o+=`<div class="category"><h4>${i.toUpperCase()}</h4>`,Object.keys(t[i]).forEach(n=>{const l=t[i][n];o+=`<div class="format">
          <h5>${n}</h5>
          <p>ファイル数: ${l.count}</p>
          <p>総サイズ: ${c.formatFileSize(l.totalSize)}</p>
          <p>平均サイズ: ${c.formatFileSize(l.totalSize/l.count)}</p>
        </div>`}),o+="</div>"}),e.innerHTML=o}static updateTitle(t,e){const o=document.getElementsByTagName("title")[0];o?o.innerHTML=`nlMediaInfo: ${t} (${e})`:console.warn("titleタグが見つからないのじゃ")}}const q=`
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
`,H='<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M4 6.47 5.76 10H20v8H4V6.47M22 4h-4l2 4h-3l-2-4h-2l2 4h-3l-2-4H8l2 4H7L5 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4z"/></svg>',D=document.createElement("style");D.textContent=q;document.head.appendChild(D);const g=document.createElement("link");g.rel="Shortcut Icon";g.href="data:image/svg+xml,"+encodeURIComponent(H);document.head.appendChild(g);window.addEventListener("load",()=>{R()});function R(){V.updateTitle(r.nlMediaInfoVideoTitle,r.nlMediaInfoVideoId),k(`${r.nlMediaInfobaseurl}${r.nlMediaInfoVideoId}`).then(d=>{const t=T.parse(d);return console.log("パース後のデータ:",t),t}).then(d=>{if(!d||!d.result)throw new Error("パースされたデータが不正なのじゃ");V.updateAll(d)}).catch(d=>{console.error("メディア情報の取得に失敗したのじゃ:",d);const t=document.getElementById("loading"),e=document.getElementById("error");t&&(t.style.display="none"),e&&(e.style.display="block",e.textContent=`エラー: ${d.message}`)})}async function k(d){try{const t=await fetch(d);if(!t.ok)throw new Error(`HTTPエラー: ${t.status} ${t.statusText}`);return await t.json()}catch(t){throw console.error("メディア情報の取得中にエラーが発生したのじゃ:",t),t}}
