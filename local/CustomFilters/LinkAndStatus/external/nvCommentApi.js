"use strict";
const threadKey = window.opener.NicoCache_nl.watch.apiData.comment.nvComment.threadKey;
const params = window.opener.NicoCache_nl.watch.apiData.comment.nvComment.params;
const threadId = window.opener.NicoCache_nl.watch.apiData.comment.threads.find((v) => v.forkLabel === "main" && v.isDefaultPostTarget === true).id;
const url = `${window.opener.NicoCache_nl.watch.apiData.comment.nvComment.server}/v1/threads`;

// トーストメッセージを表示する関数
const showToast = (mode, middle, low, title, timeout) => {
  window.cc.Toast({ mode, middle, low, title, timeout });
};

// コメント処理の開始
const startCommentProcessing = () => {
  showToast("info", "少々お待ちください。", `推定処理時間: ${EstimatedProcessingTime(document.getElementById("comment_num").dataset.value, document.getElementById("length").dataset.value)}ミリ秒`, "コメント処理開始。", 5000);
  const startTime = performance.now();

  getnv(url, params, threadKey).then((json) => {
    showToast("info", "通信完了。少々お待ちください。", "", "コメント処理中です。", 5000);
    output_userid(json);
    const performanceTime = performance.now() - startTime;
    showToast("success", "", `処理時間: ${performanceTime}ミリ秒`, "処理完了&レンダリング完了しました!", 8000);
    document.querySelector("#nv_decoded_results").scrollIntoView({ behavior: "smooth" });
  });
};

window.addEventListener("load", () => {
  cc.i("nvCommentExec").addEventListener("click", startCommentProcessing);
});

/**
 * @returns {object}
 */
function getnv(url, params, threadKey) {
  return fetch(url, {
    method: "POST",
    timeout: 5000,
    headers: {
      "x-client-os-type": "others",
      "X-Frontend-Id": 6,
      "X-Frontend-Version": 0,
    },
    body: JSON.stringify({ params, threadKey, additionals: {} }),
  })
    .then((response) => {
      if (!response.ok) {
        const errorcode = "Can Not Load Comments Due To Token Expired. Reload Watch Page And Try Again.";
        cc.c("node")[0].insertAdjacentHTML(`afterend`, `<p style="color:crimson;">${errorcode}</p>`);
        console.error("HTTP status code : " + response.status);
        console.error("HTTP status Text : " + response.statusText);
        showToast("error", response.url, "トークンが失効した可能性があります。視聴ページをリロードしてください。", "nvCommentからの応答が" + response.statusText + `(${response.status})でした。`, 5000);
        throw new Error(errorcode);
      }
      return response.json();
    })
    .catch((error) => {
      console.error(error);
    });
}

const formatDate = (data, format) => {
  // dataが数値の場合、ミリ秒から日付に変換
  if (typeof data === 'number') {
    const date = new Date(data);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hour = String(date.getHours()).padStart(2, '0');
    const minute = String(date.getMinutes()).padStart(2, '0');
    const second = String(date.getSeconds()).padStart(2, '0');

    return format === 'postedAt' 
      ? `${year}年${month}月${day}日${hour}時${minute}分${second}秒`
      : `${Math.floor((data / 3600000) % 24).toString().padStart(2, '0')}時間${Math.floor((data / 60000) % 60)}分${((data % 60000) / 1000).toFixed(0).padStart(2, '0')}秒`;
  }

  // dataが文字列の場合、通常の処理を行う
  const [date, time] = data.split("T");
  const [year, month, day] = date.split("-");
  const [hour, minute, second] = time.split(":");
  return format === 'postedAt' 
    ? `${year}年${month}月${day}日${hour}時${minute}分${second.split("+")[0]}秒`
    : `${Math.floor((data / 3600000) % 24) < 10 ? "0" + Math.floor((data / 3600000) % 24) : Math.floor((data / 3600000) % 24)}時間${Math.floor((data / 60000) % 60)}分${((data % 60000) / 1000).toFixed(0) < 10 ? "0" : ""}${(data % 60000) / 1000}秒`;
};

/**
 * @param {object} json
 */
function output_userid(json) {
  try {
    const comments = json.data.threads.find((v) => v.fork === "main" && v.commentCount > 2).comments;
    comments.sort((a, b) => a.vposMs - b.vposMs);

    cc.i("nv_decoded_results").innerHTML = `<p>コメントId ${url}より NGID用</p><p>Thread Id:${threadId}</p>`;
    cc.i("nv_decoded_results").classList.add("Active");

    // コメントフィールドの定義
    const commentFields = [
      { key: 'id', label: 'id', className: 'comment_id' },
      { key: 'no', label: 'no', className: 'comment_no' },
      { key: 'vposMs', label: 'vposMs', className: 'vposMs' },
      { key: 'vposMs', label: 'vposMs(整形済み)', className: 'formatted-vposMs', format: (val) => formatDate(val, 'vpos') },
      { key: 'body', label: 'body', className: 'comment_body' },
      { key: 'commands', label: 'commands', className: 'comment_commands' },
      { key: 'userId', label: 'userId', className: 'userId' },
      { key: 'isPremium', label: 'isPremium', className: 'isPremium' },
      { key: 'score', label: 'score', className: 'score' },
      { key: 'postedAt', label: 'postedAt', className: 'postedAt' },
      { key: 'postedAt', label: 'postedAt(整形済み)', className: 'formatted-postedAt', format: (val) => formatDate(val, 'postedAt') },
      { key: 'nicoruCount', label: 'nicoruCount', className: 'nicoruCount' },
      { key: 'nicoruId', label: 'nicoruId', className: 'nicoruId' },
      { key: 'source', label: 'source', className: 'source' },
      { key: 'isMyPost', label: 'isMyPost', className: 'isMyPost', isLast: true }
    ];

    const buf = comments.map(comment => {
      return commentFields.map(field => {
        const value = field.format ? field.format(comment[field.key]) : comment[field.key];
        return `
          <div>
            <input title="${value}" class="copy" type="button" onClick="copy(event)" value="コピー" />
            <div class="${field.className}" data-mydata="${value}"> ${field.label}: ${value}</div>
            ${field.isLast ? '<p>--------------</p>' : ''}
          </div>
        `;
      }).join('');
    }).join('');

    cc.i("nv_decoded_results").insertAdjacentHTML(`beforeend`, buf);
    cc.i("nv_decoded_results").insertAdjacentHTML(`beforeend`, `
      <div class="json_length">
        json raw data length : ${comments.length}
        <div>
          <div class="userId_length">
            userId length : ${cc.c("userId").length}
            <div></div>
          </div>
        </div>
      </div>
    `);
  } catch (error) {
    console.error(error);
  }
}

function copy(e) {
  const myContent = e.target.nextElementSibling.dataset.mydata;
  if (!navigator.clipboard) {
    myContent.select();
    document.execCommand("copy");
    myContent.blur();
  } else {
    navigator.clipboard.writeText(myContent);
  }
}
