"use strict";
const extbaseurl = "https://ext.nicovideo.jp/api/getthumbinfo/";
const extvideoid = window.opener.NicoCache_nl.watch.apiData.video.id;
const extvideotitle = window.opener.NicoCache_nl.watch.apiData.video.title;
const exturl = extbaseurl + extvideoid;

window.addEventListener("load", () => {
  cc.t("title")[0].innerHTML = `概要情報とコメント:${extvideotitle + "(" + extvideoid + ")"}`;
  getext(exturl).then(ext);
});

const calculateVideoLength = (VideoLengthString) => {
  const timeParts = VideoLengthString.split(":").map(Number);
  return timeParts.length === 3
    ? timeParts[0] * 3600 + timeParts[1] * 60 + timeParts[2]
    : timeParts[0] * 60 + timeParts[1];
};

const EstimatedProcessingTime = (CommentCountString, VideoLengthString) => {
  const RealCommentCount = Math.floor(CommentCountString);
  const VideoLength = calculateVideoLength(VideoLengthString);
  let CalcCommentCount_temp = 100; // デフォルト値
  let CalcCommentCount_1, CalcCommentCount_2;

  if (VideoLength >= 600) {
    CalcCommentCount_temp = 1000 + Math.floor((VideoLength - 600) / 60) * 100;
  } else if (VideoLength >= 300) {
    CalcCommentCount_temp = 500 + Math.floor((VideoLength - 300) / 60) * 100;
  } else if (VideoLength >= 60) {
    CalcCommentCount_temp = 250 + Math.floor((VideoLength - 60) / 60) * 100;
  }

  CalcCommentCount_1 = CalcCommentCount_temp + (VideoLength >= 600 ? 0 : 300);
  CalcCommentCount_2 = CalcCommentCount_temp + (VideoLength >= 600 ? 800 : 800);

  return RealCommentCount < CalcCommentCount_temp
    ? `${Math.floor(RealCommentCount * 1.97)}~${Math.floor(RealCommentCount * 2.2)}`
    : `${Math.floor(CalcCommentCount_1)}~${Math.floor(CalcCommentCount_2)}`;
};

const EPTWrapper = (somefunction) => {
  const myValue = somefunction;
  window.cc.Toast({
    mode: "info",
    middle: "",
    low: "推定処理時間です。",
    title: myValue + "ミリ秒",
    timeout: 8000,
  });
};
/**
 *
 * @param {string} videoid id of video
 * @returns {string}
 */
function getext(url) {
  return fetch(url)
    .then((response) => {
      if (response.ok === true) {
        return response.text();
      } else {
        const errorcode = "Error: Can Not Load Ext API.";
        document.documentElement.insertAdjacentHTML(`afterbegin`, `<p style="color:crimson;">${errorcode}</p>`);
        console.error("HTTP status code : " + response.status);
        console.error("HTTP status Text : " + response.statusText);
        window.cc.Toast({
          mode: "error",
          middle: response.url,
          low: response.status,
          title: "Ext(getThumbInfo)からの応答が" + response.statusText + "でした。",
          timeout: 5000,
        });
        throw new Error(errorcode);
      }
    })
    .then((text) => {
      return new DOMParser().parseFromString(text, "text/html");
    })
    .then((document) => {
      const thumbUrl = cc.t("thumbnail_url", document)[0];
      const watchUrl = cc.t("watch_url", document)[0];
      let buf = `
      <p>
        Status:
        ${cc.t("nicovideo_thumb_response", document)[0].getAttribute("status")}
      </p>
      <p>"title": ${JSON.stringify(document.title)}</p>
      <input
      class="copy"
      type="button"
      data-mydata="${JSON.stringify(document.title).slice(1, -1)}"
      onClick="copy_ext(event)"
      value="Copy Title"
      />
      <p>"video_id": "${extvideoid}"</p>
      <input
      class="copy"
      type="button"
      data-mydata="${extvideoid}"
      onClick="copy_ext(event)"
      value="Copy VideoId"
      />
      <p>
        "description": "${cc.t("description", document)[0].innerHTML}"
      </p>
      <p>"thumbnail_Url": "${thumbUrl.innerHTML}"</p>
      <p>"thumbnail_Url_Link": <a href="${thumbUrl.innerHTML}">Thumbnail Link</a></p>
      <p><img src="${thumbUrl.innerHTML}" /></p>
      <input
        class="copy"
        type="button"
        data-mydata="${thumbUrl.innerHTML}"
        onClick="copy_ext(event)"
        value="Copy Thumbnail Link"
      />
      <p>
        "first_retrieve":
        "${cc.t("first_retrieve", document)[0].innerHTML}"
      </p>
      <p id="length" data-value="${cc.t("length", document)[0].innerHTML}">"length": "${cc.t("length", document)[0].innerHTML}"</p>
      <p>
        "movie_type": "${cc.t("movie_type", document)[0].innerHTML}"
      </p>
      <p>"size_high": "${cc.t("size_high", document)[0].innerHTML}"</p>
      <p>"size_low": "${cc.t("size_low", document)[0].innerHTML}"</p>
      <p>
        "view_counter":
        "${cc.t("view_counter", document)[0].innerHTML}"
      </p>
      <p id="comment_num" data-value="${cc.t("comment_num", document)[0].innerHTML}">
        "comment_num": "${cc.t("comment_num", document)[0].innerHTML}"
      </p>
      <p>
        "mylist_counter":
        "${cc.t("mylist_counter", document)[0].innerHTML}"
      </p>
      <p>
        "last_res_body":
        "${cc.t("last_res_body", document)[0].innerHTML$}"
      </p>
      <p>"watch_url": "${watchUrl.innerHTML}"</p>
      <p>"watch_Url_Link": <a href="${watchUrl.innerHTML}">Watch Link</a></p>
      <p>
        <input
          class="copy"
          type="button"
          data-mydata="${watchUrl.innerHTML}"
          onClick="copy_ext(event)"
          value="Copy Watch Link"
        />
      </p>
      <p>
        "watch_Url_Link_Shorten":
        <a href="https://nico.ms/${extvideoid}">Watch Link Shorten</a>
      </p>
      <p>
        <input
          class="copy"
          type="button"
          data-mydata="https://nico.ms/${extvideoid}"
          onClick="copy_ext(event)"
          value="Copy Watch Link Shorten"
        />
      </p>
      <p>
        "thumb_type": "${cc.t("thumb_type", document)[0].innerHTML}"
      </p>
      <p>
        "embeddable": "${cc.t("embeddable", document)[0].innerHTML}"
      </p>
      <div class="thumb" width="352" height="202" loading="lazy">
        <iframe
          width="352"
          height="202"
          src="https://ext.nicovideo.jp/thumb/${extvideoid}"
          scrolling="no"
          style="border: solid 1px #ccc"
          frameborder="0"
        ></iframe>
      </div>
      <p>
        "no_live_play":
        "${cc.t("no_live_play", document)[0].innerHTML}"
      </p>
      <p>
        "tags domain":
        "${cc.t("tags", document)[0].getAttribute("domain")}"
      </p>
      `;
      for (let i = 0; i < cc.t("tag").length; i++) {
        buf += `<p>"tag": "${cc.t("tag", document)[i].innerHTML}"</p>`;
      }
      buf += `<p>"genre": "${cc.t("genre", document)[0].innerHTML}"</p>`;
      try {
        const ch_icon_url = cc.t("ch_icon_url", document)[0];
        buf += `
        <p>"ch_id": "${cc.t("ch_id", document)[0].innerHTML}"</p>
        <p>"ch_name": "${cc.t("ch_name", document)[0].innerHTML}"</p>
        <p>"ch_icon_url": "${ch_icon_url.innerHTML}"</p>
        <p>"ch_icon_Link": <a href="${ch_icon_url.innerHTML}">Ch Icon Link</a></p>
        <p><img src="${ch_icon_url.innerHTML}" /></p>
        <p>
          <input
            class="copy"
            type="button"
            data-mydata="${ch_icon_url.innerHTML}"
            onClick="copy_ext(event)"
            value="Copy Channel Icon Link"
          />
        </p>
        
        `;
      } catch {
        const user_icon_url = cc.t("user_icon_url", document)[0];
        buf += `
        <p>"user_id": "${cc.t("user_id", document)[0].innerHTML}"</p>
        <p>
          "user_nickname":
          "${cc.t("user_nickname", document)[0].innerHTML}"
        </p>
        <p>"user_icon_url": "${user_icon_url.innerHTML}"</p>
        <p>"user_icon_Link": <a href="${user_icon_url.innerHTML}">User Icon Link</a></p>
        <p><img src="${user_icon_url.innerHTML}" /></p>
        <p>
          <input
            class="copy"
            type="button"
            data-mydata="${user_icon_url.innerHTML}"
            onClick="copy_ext(event)"
            value="Copy User Icon Link"
          />
        </p>
        
        `;
      }
      return buf;
    })
    .catch((error) => {
      console.error(error);
    });
}

/**
 *
 * @param {string} t
 */
function ext(t) {
  cc.i("ext_decoded_results").textContent = `動画の概要情報 ${exturl}より`;
  cc.i("ext_decoded_results").insertAdjacentHTML(`beforeend`, `<div class="node">${t}</div><br />`);
}

/**
 *
 * @param {element} e
 */

function copy_ext(e) {
  const myContent = e.target.dataset.mydata;
  if (!navigator.clipboard) {
    // use old execCommand() way
    myContent.select();
    document.execCommand("copy");
    myContent.blur();
  } else {
    navigator.clipboard.writeText(myContent);
  }
}
