/**
 * ヘッダーテンプレートを生成する関数
 */
export function createHeaderTemplate(): string {
  return `
    <div class="header-content">
      <span>CacheDataManager</span>
      <span>${window.ncversion}</span>
      <nav class="main-nav">
        <a href="/" target="_blank" class="nav-link">トップ</a>
        <a href="/video_top" target="_blank" class="nav-link">動画</a>
        <a href="/my/history/" target="_blank" class="nav-link">マイページ</a>
        <a href="/ranking" target="_blank" class="nav-link">ランキング</a>
        <a href="/newarrival" target="_blank" class="nav-link">新着動画</a>
        <a href="/recent" target="_blank" class="nav-link">新着コメント動画</a>
        <a href="/local/features/dist/src/mylist2/index.html" target="_blank" class="nav-link">Mylist2</a>
      </nav>
      <div class="search-box">
        <input type="text" id="searchInput" placeholder="動画を検索...">
        <button id="searchBtn">検索</button>
        <button id="clearSearch">クリア</button>
      </div>
    </div>
  `;
} 