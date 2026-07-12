import { createMaterialIcon, ICONS } from "@/common/material-icons.js";

type NavLink = {
  href: string;
  label: string;
  icon: string;
};

const NAV_LINKS: NavLink[] = [
  { href: "/", label: "トップ", icon: ICONS.home },
  { href: "/video_top", label: "動画", icon: ICONS.play },
  { href: "/my/history/", label: "マイページ", icon: "person" },
  { href: "/ranking", label: "ランキング", icon: "trending_up" },
  { href: "/newarrival", label: "新着動画", icon: "new_releases" },
  { href: "/recent", label: "新着コメント動画", icon: ICONS.comment },
  {
    href: "/local/features/dist/pages/mylist2/index.html",
    label: "Mylist2",
    icon: "playlist_add",
  },
  {
    href: "https://www.nicovideo.jp/local/features/dist/pages/watch-history/index.html",
    label: "watch-history",
    icon: "history",
  },
];

/**
 * ヘッダーテンプレートを生成する関数
 */
export function createHeaderTemplate(): string {
  const navItems = NAV_LINKS.map(({ href, label, icon }) => {
    const hoverIcon = createMaterialIcon(icon, {
      color: "white",
      size: "small",
      classes: "nav-link-icon-img",
    });
    return `<a href="${href}" target="_blank" class="nav-link">${label}<span class="nav-link-icon">${hoverIcon}</span></a>`;
  }).join("");

  const searchIcon = createMaterialIcon(ICONS.search, {
    color: "white",
    size: "small",
    classes: "search-btn-icon",
  });
  const clearIcon = createMaterialIcon("clear", {
    color: "white",
    size: "small",
    classes: "search-btn-icon",
  });

  return `
    <div class="header-content">
      <div class="header-top-row">
        <div class="header-brand">
          <span class="header-title">Cache Data Manager</span>
          <span class="header-version">${window.ncversion}</span>
        </div>
        <nav class="main-nav">
          ${navItems}
        </nav>
      </div>
      <div class="header-controls-row">
        <div class="search-box" role="search">
          <label class="search-label" for="searchInput">キャッシュを検索</label>
          <input type="search" id="searchInput" placeholder="動画ID・タイトルで検索" autocomplete="off">
          <span class="search-section">
            <button id="searchBtn">${searchIcon}<span class="search-label">検索</span></button>
            <button id="clearSearch">${clearIcon}<span class="search-label">クリア</span></button>
          </span>
        </div>
        <div class="filter-sort-placeholder"></div>
      </div>
    </div>
  `;
}
