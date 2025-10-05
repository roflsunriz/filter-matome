```js

(async () => {
  const SMID = 'so45175253';
  const WATCH_URL = `https://www.nicovideo.jp/watch/${SMID}`;

  const decodeHtml = (s) => {
    const ta = document.createElement('textarea');
    ta.innerHTML = s;
    return ta.value;
  };

  // 1) 視聴ページHTMLを取得し、server-responseメタからapiDataを復元
  const html = await fetch(WATCH_URL, { credentials: 'same-origin' }).then(r => {
    if (!r.ok) throw new Error(`watch fetch failed: ${r.status}`);
    return r.text();
  });
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const meta = doc.querySelector('meta[name="server-response"]');
  if (!meta) throw new Error('meta[name="server-response"] not found');

  const contentEncoded = meta.getAttribute('content') || '';
  const contentDecoded = decodeHtml(contentEncoded);

  // server-response は HTMLエンコード済みJSON。環境差で二重エスケープの可能性もあるので両対応
  let serverResponse;
  try {
    serverResponse = JSON.parse(contentDecoded);
  } catch {
    serverResponse = JSON.parse(JSON.parse(contentDecoded));
  }

  // メモ仕様：data.response が apiData （なければ他候補も探索）
  const apiData =
    serverResponse?.data?.response ??
    serverResponse?.response ??
    serverResponse?.apiData;
  if (!apiData) throw new Error('apiData not found in server-response');

  const nv = apiData?.comment?.nvComment;
  if (!nv?.server || !nv?.params || !nv?.threadKey) {
    console.warn('nvComment payload:', nv);
    throw new Error('nvComment.server / params / threadKey is missing');
  }

  // 2) nv-comment に POST（common.ts のヘッダ相当）
  const endpoint = `${nv.server.replace(/\/+$/, '')}/v1/threads`;
  const body = JSON.stringify({ params: nv.params, threadKey: nv.threadKey });

  const res = await fetch(endpoint, {
    method: 'POST',
    credentials: 'same-origin',
    headers: {
      'x-client-os-type': 'others',
      'X-Frontend-Id': '6',
      'X-Frontend-Version': '0',
      'Content-Type': 'application/json'
    },
    body
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`nv-comment fetch failed: ${res.status} ${text.slice(0, 200)}`);
  }

  const json = await res.json();
  const threads = json?.data?.threads ?? [];
  const uniqueForkPairs = Array.from(new Set(threads.map(t => `${t.id}|${t.fork}`)));

  // 3) 可視化・判定
  console.table(
    threads.map(t => ({
      id: t.id,
      fork: t.fork,                 // "main" | "easy" | "owner"
      commentCount: t.commentCount,
      commentsLen: Array.isArray(t.comments) ? t.comments.length : 0
    }))
  );

  const isSix = threads.length === 6;
  console.log(
    `Threads length = ${threads.length} (unique id|fork = ${uniqueForkPairs.length})`
  );
  console.log(`スレッドが6件か？ =>`, isSix ? 'YES' : 'NO', {
    total: threads.length,
    unique: uniqueForkPairs.length,
    uniquePairs: uniqueForkPairs
  });

  // 返り値（コンソールで展開できるように）
  return {
    nvComment: {
      server: nv.server,
      params: nv.params,
      threadKey: nv.threadKey ? '<REDACTED>' : null
    },
    threads,
    rawResponse: json
  };
})().catch(err => {
  console.error('[nv-comment check] Error:', err);
});
```