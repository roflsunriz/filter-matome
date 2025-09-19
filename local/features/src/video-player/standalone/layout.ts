import { STANDALONE_PAGE_STYLES } from './styles.js';
import { applyStyles } from '../utils/dom-utils.js';

export interface StandaloneLayout {
  root: HTMLElement;
  playerMount: HTMLElement;
  title: HTMLElement;
  metaList: HTMLElement;
  statsList: HTMLElement;
  tags: HTMLElement;
  description: HTMLElement;
  ownerContainer: HTMLElement;
  ownerAvatar: HTMLImageElement;
  ownerName: HTMLElement;
  ownerLink: HTMLAnchorElement;
  seriesList: HTMLElement;
}

const createBreadcrumbs = (): HTMLElement => {
  const nav = document.createElement('nav');
  nav.className = 'nc-header__breadcrumbs';

  const rootLink = document.createElement('a');
  rootLink.href = '/';
  rootLink.textContent = 'NicoCache';

  const divider1 = document.createElement('span');
  divider1.textContent = '›';

  const featureLink = document.createElement('a');
  featureLink.href = '/local/features/dist/src/video-player/standalone/index.html';
  featureLink.textContent = 'Video Player';

  const divider2 = document.createElement('span');
  divider2.textContent = '›';

  const current = document.createElement('span');
  current.id = 'nc-current-video-id';
  current.textContent = '-';

  nav.append(rootLink, divider1, featureLink, divider2, current);
  return nav;
};

export const createStandaloneLayout = (): StandaloneLayout => {
  document.body.classList.add('nc-standalone-body');
  applyStyles(STANDALONE_PAGE_STYLES);

  const container = document.getElementById('nc-standalone-player-root') ?? document.body;

  const root = document.createElement('div');
  root.className = 'nc-standalone-page';

  const header = document.createElement('header');
  header.className = 'nc-header';

  const breadcrumbs = createBreadcrumbs();

  const title = document.createElement('h1');
  title.className = 'nc-header__title';
  title.textContent = '読み込み中...';

  const metaList = document.createElement('div');
  metaList.className = 'nc-header__meta';

  header.append(breadcrumbs, title, metaList);

  const main = document.createElement('main');
  main.className = 'nc-main';

  const playerSurface = document.createElement('section');
  playerSurface.className = 'nc-player-surface';

  const playerHost = document.createElement('div');
  playerHost.className = 'nc-player-host';

  const playerMount = document.createElement('div');
  playerMount.id = 'nc-player-mount';

  playerHost.append(playerMount);
  playerSurface.append(playerHost);

  const infoCard = document.createElement('aside');
  infoCard.className = 'nc-info-card';

  const statsList = document.createElement('div');
  statsList.className = 'nc-stat-list';

  const tags = document.createElement('div');
  tags.className = 'nc-tag-cloud';

  const ownerContainer = document.createElement('div');
  ownerContainer.className = 'nc-owner';

  const ownerAvatar = document.createElement('img');
  ownerAvatar.alt = '投稿者のアイコン';
  ownerAvatar.loading = 'lazy';

  const ownerInfo = document.createElement('div');
  ownerInfo.className = 'nc-owner__info';

  const ownerName = document.createElement('span');
  ownerName.className = 'nc-owner__name';

  const ownerLink = document.createElement('a');
  ownerLink.className = 'nc-owner__link';
  ownerLink.target = '_blank';
  ownerLink.rel = 'noopener noreferrer';
  ownerLink.textContent = 'プロフィールを見る';

  ownerInfo.append(ownerName, ownerLink);
  ownerContainer.append(ownerAvatar, ownerInfo);

  const seriesTitle = document.createElement('h2');
  seriesTitle.className = 'nc-section-title';
  seriesTitle.textContent = 'シリーズ情報';

  const seriesList = document.createElement('div');
  seriesList.className = 'nc-series';

  infoCard.append(statsList, tags, ownerContainer, seriesTitle, seriesList);

  main.append(playerSurface, infoCard);

  const description = document.createElement('section');
  description.className = 'nc-description';

  root.append(header, main, description);
  container.append(root);

  return {
    root,
    playerMount,
    title,
    metaList,
    statsList,
    tags,
    description,
    ownerContainer,
    ownerAvatar,
    ownerName,
    ownerLink,
    seriesList
  };
};
