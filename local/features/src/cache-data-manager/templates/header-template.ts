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
    href: "/local/features/dist/pages/mylist/index.html",
    label: "Mylist2",
    icon: "playlist_add",
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
        <span class="header-title">CacheDataManager</span>
        <span class="header-version">${window.ncversion}</span>
        <nav class="main-nav">
          ${navItems}
        </nav>
      </div>
      <div class="header-controls-row">
        <div class="filter-sort-placeholder"></div>
          <div class="search-box">
          <input type="text" id="searchInput" placeholder="動画を検索...">
          <span class="search-section">
            <button id="searchBtn">${searchIcon}<span class="search-label">検索</span></button>
            <button id="clearSearch">${clearIcon}<span class="search-label">クリア</span></button>
          </span>
        </div>
      </div>
    </div>
  `;
}
