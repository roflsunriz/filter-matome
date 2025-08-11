/**
 * ビデオカードテンプレートを生成する関数
 */
export function createCardTemplate(): string {
  return `
    <div class="card-header">
      <span class="video-id"></span>
    </div>
    <div class="thumbnail-container">
      <img loading="lazy" class="thumbnail-image">
      </div>
      <div class="video-info">
      <h3 class="video-title"></h3>
      <div class="metadata">
      <span class="quality-badge"></span>
      <span class="temp-file"></span>
      </div>
    </div>
    <div class="card-actions">
      <button class="play-btn" title="再生">
        <svg width="24" height="24" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
      </button>
      <button class="save-video-btn" title="動画保存">
        <svg width="24" height="24" viewBox="0 0 24 24"><path d="M17 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm-5 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3-10H5V5h10v4z"/></svg>
      </button>
      <button class="save-audio-btn" title="音声保存">
          <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" width="24" height="24" viewBox="0 0 1080 1080" xml:space="preserve">
          <desc>Created with Fabric.js 5.2.4</desc>
          <defs>
          </defs>
          <g transform="matrix(1 0 0 1 540 540)" id="01a56859-4f49-4a04-b879-ef3552d8e9b9"  >
          </g>
          <g transform="matrix(1 0 0 1 540 540)" id="e78c9921-ea26-40ca-8b84-cf7b46dabb7d"  >
          <rect style="stroke: none; stroke-width: 1; stroke-dasharray: none; stroke-linecap: butt; stroke-dashoffset: 0; stroke-linejoin: miter; stroke-miterlimit: 4; fill: rgb(0, 0, 0); fill-rule: nonzero; opacity: 1; visibility: hidden;" vector-effect="non-scaling-stroke"  x="-540" y="-540" rx="0" ry="0" width="1080" height="1080" />
          </g>
          <g transform="matrix(0.84 0 0 9.13 327.64 502.22)" id="f6e13258-c26e-4c5d-b882-8d7f7a421188"  >
          <rect style="stroke: rgb(0,0,0); stroke-width: 0; stroke-dasharray: none; stroke-linecap: butt; stroke-dashoffset: 0; stroke-linejoin: miter; stroke-miterlimit: 4; fill: rgb(0, 0, 0); fill-rule: nonzero; opacity: 1;" vector-effect="non-scaling-stroke"  x="-33.0835" y="-33.0835" rx="0" ry="0" width="66.167" height="66.167" />
          </g>
          <g transform="matrix(3.91 0 0 2.45 231.41 826.58)" id="bf9d8f3e-b657-4179-98e0-07dc2efefaaf"  >
          <circle style="stroke: rgb(0,0,0); stroke-width: 0; stroke-dasharray: none; stroke-linecap: butt; stroke-dashoffset: 0; stroke-linejoin: miter; stroke-miterlimit: 4; fill: rgb(0, 0, 0); fill-rule: nonzero; opacity: 1;" vector-effect="non-scaling-stroke"  cx="0" cy="0" r="35" />
          </g>
          <g transform="matrix(2.2 -0.79 0.34 0.94 381.11 193.53)" id="735e5aa0-7992-4907-8813-d0dc2b2949f2"  >
          <rect style="stroke: rgb(0,0,0); stroke-width: 0; stroke-dasharray: none; stroke-linecap: butt; stroke-dashoffset: 0; stroke-linejoin: miter; stroke-miterlimit: 4; fill: rgb(0, 0, 0); fill-rule: nonzero; opacity: 1;" vector-effect="non-scaling-stroke"  x="-33.0835" y="-33.0835" rx="0" ry="0" width="66.167" height="66.167" />
          </g>
          <g transform="matrix(2.83 2.02 -0.58 0.81 511.19 233.62)" id="cd75f7e9-d59b-49bd-a451-5834ff279872"  >
          <rect style="stroke: rgb(0,0,0); stroke-width: 0; stroke-dasharray: none; stroke-linecap: butt; stroke-dashoffset: 0; stroke-linejoin: miter; stroke-miterlimit: 4; fill: rgb(0, 0, 0); fill-rule: nonzero; opacity: 1;" vector-effect="non-scaling-stroke"  x="-33.0835" y="-33.0835" rx="0" ry="0" width="66.167" height="66.167" />
          </g>
          <g transform="matrix(6.26 0 0 10.68 765.76 540)" id="4a9145a6-a2c0-4879-8424-e719af8a935a"  >
          <path style="stroke: rgb(0,0,0); stroke-width: 0; stroke-dasharray: none; stroke-linecap: butt; stroke-dashoffset: 0; stroke-linejoin: miter; stroke-miterlimit: 4; fill: rgb(0, 0, 0); fill-rule: nonzero; opacity: 1;" vector-effect="non-scaling-stroke"  transform=" translate(-50, -50)" d="M 81.123 47.531 C 83.818 50.271 83.818 54.711999999999996 81.123 57.405 L 54.954 83.574 C 52.214 86.315 47.82 86.315 45.081 83.574 L 18.91 57.405 C 16.169 54.712 16.169 50.271 18.91 47.531 C 22.689 43.988 33.082 51.784 42.436 55.42 L 42.436 18.999 C 42.436 16.448 44.513 14.37 47.064 14.37 L 54.055 14.37 C 56.607 14.37 58.684 16.448 58.684 18.999 L 58.684 54.947 C 67.518 51.216 76.967 44.319 81.123 47.531 z" stroke-linecap="round" />
          </g>
          <g transform="matrix(1.42 -0.54 0.2 0.52 359.81 157.34)" id="a6256484-f5e9-4642-8512-bf04974a66ae"  >
          <rect style="stroke: rgb(0,0,0); stroke-width: 0; stroke-dasharray: none; stroke-linecap: butt; stroke-dashoffset: 0; stroke-linejoin: miter; stroke-miterlimit: 4; fill: rgb(0, 0, 0); fill-rule: nonzero; opacity: 1;" vector-effect="non-scaling-stroke"  x="-33.0835" y="-33.0835" rx="0" ry="0" width="66.167" height="66.167" />
          </g>
          <g transform="matrix(1.12 1.12 -0.39 0.39 627.65 327.45)" id="19de93f7-e505-44f9-ae4e-5994201acc68"  >
          <rect style="stroke: rgb(0,0,0); stroke-width: 0; stroke-dasharray: none; stroke-linecap: butt; stroke-dashoffset: 0; stroke-linejoin: miter; stroke-miterlimit: 4; fill: rgb(0, 0, 0); fill-rule: nonzero; opacity: 1;" vector-effect="non-scaling-stroke"  x="-33.0835" y="-33.0835" rx="0" ry="0" width="66.167" height="66.167" />
          </g>
          </svg>
      </button>
      <button class="delete-btn" title="削除">
        <svg width="24" height="24" viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
      </button>
    </div>
  `;
} 