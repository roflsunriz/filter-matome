// 画像を非表示にする関数
function hideImage() {
    let hiddenCount = 0;
    const images = document.querySelectorAll('img');
    images.forEach(img => {
        const regexSrc = /^https:\/\/secure-dcdn\.cdn\.nimg\.jp\/nicoaccount\/usericon\/.*/;
        const regexClass = /^common-header/;

        if (regexSrc.test(img.src) && regexClass.test(img.className)) {
            img.style.display = 'none';
            hiddenCount++;
        }
    });
    return hiddenCount > 0; // 画像を非表示にした場合はtrueを返す
}

// 動画要素が再生可能かどうかをチェックする関数
function checkVideoReady() {
    const videoElements = document.querySelectorAll('video');
    return Array.from(videoElements).some(video => video.readyState >= 4);
}

// テキストノードを非表示にする関数
function hideTextNode() {
    const textNode = document.querySelector('.common-header-w2sn95');
    textNode.style.display = "none";
}

// ページが読み込まれた後に実行
window.onload = () => {
    const intervalId = setInterval(() => {
        if (hideImage()) {
            hideTextNode();
            clearInterval(intervalId); // 画像が非表示になったらインターバルを解除
            console.log('ユーザーアイコンとユーザー名の非表示化が完了しました');
        }
    }, 5000);
};