import { createStandaloneLayout, type StandaloneLayout } from './layout.js';
import { StandalonePlayer } from './player.js';
import { formatNumber, formatDateTime, formatDuration, createStatItem } from './utils.js';
import type { ApiData, NicoApiData } from '@/types/index.js';

type RecordLike = Record<string, unknown>;

type OwnerDisplayData = {
  name: string;
  iconUrl?: string;
  linkUrl?: string;
};

type TagItemShape = {
  name?: string;
  isCategory?: boolean;
  isCategoryCandidate?: boolean;
  isLocked?: boolean;
};

const isRecord = (value: unknown): value is RecordLike => {
  return typeof value === 'object' && value !== null;
};

const toOptionalString = (value: unknown): string | undefined => {
  return typeof value === 'string' && value.trim().length > 0 ? value : undefined;
};

const toOptionalNumber = (value: unknown): number | undefined => {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
};

const toOptionalBoolean = (value: unknown): boolean | undefined => {
  return typeof value === 'boolean' ? value : undefined;
};

const ensureRecord = (value: unknown): RecordLike | undefined => {
  return isRecord(value) ? value : undefined;
};

const pickFirstString = (record: RecordLike | undefined, keys: string[]): string | undefined => {
  if (!record) {
    return undefined;
  }
  for (const key of keys) {
    const candidate = toOptionalString(record[key]);
    if (candidate) {
      return candidate;
    }
  }
  return undefined;
};

const toSeriesReferenceForApi = (value: unknown): { id?: string; title?: string } | undefined => {
  const record = ensureRecord(value);
  if (!record) {
    return undefined;
  }
  const id = toOptionalString(record['id']);
  const title = toOptionalString(record['title']);
  if (!id && !title) {
    return undefined;
  }
  const result: { id?: string; title?: string } = {};
  if (id) {
    result.id = id;
  }
  if (title) {
    result.title = title;
  }
  return result;
};

const readString = (record: RecordLike | undefined, key: string): string | undefined => {
  if (!record) {
    return undefined;
  }
  return toOptionalString(record[key]);
};

const readBoolean = (record: RecordLike | undefined, key: string): boolean | undefined => {
  if (!record) {
    return undefined;
  }
  return toOptionalBoolean(record[key]);
};

const readNumber = (record: RecordLike | undefined, key: string): number | undefined => {
  if (!record) {
    return undefined;
  }
  return toOptionalNumber(record[key]);
};

const toOptionalId = (value: unknown): string | number | undefined => {
  if (typeof value === 'string' && value.trim().length > 0) {
    return value;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  return undefined;
};

const toApiData = (source: NicoApiData, fallbackVideoId: string): ApiData => {
  const root = source as unknown as RecordLike;

  const videoRecord = ensureRecord(root['video']) ?? {};
  const countRecord = ensureRecord(videoRecord['count']);
  const thumbnailRecord = ensureRecord(videoRecord['thumbnail']);

  const video: ApiData['video'] = {
    id: toOptionalString(videoRecord['id']) ?? fallbackVideoId,
    title: toOptionalString(videoRecord['title']) ?? 'タイトル未取得',
    count: {
      view: readNumber(countRecord, 'view') ?? 0,
      comment: readNumber(countRecord, 'comment') ?? 0,
      mylist: readNumber(countRecord, 'mylist') ?? 0,
      like: readNumber(countRecord, 'like')
    },
    thumbnail: {
      url: pickFirstString(thumbnailRecord, ['player', 'ogp', 'largeUrl', 'middleUrl', 'listingUrl', 'url']) ?? ''
    },
    registeredAt: toOptionalString(videoRecord['registeredAt']) ?? '',
    duration: toOptionalNumber(videoRecord['duration']) ?? 0,
    description: toOptionalString(videoRecord['description']),
    shortDescription: toOptionalString(videoRecord['shortDescription']),
    likeCount: toOptionalNumber(videoRecord['likeCount']),
    advertisePoint: toOptionalNumber(videoRecord['advertisePoint']),
    giftPoint: toOptionalNumber(videoRecord['giftPoint']),
    watchableUserTypeForPayment: toOptionalString(videoRecord['watchableUserTypeForPayment'])
  };

  const genreValue = videoRecord['genre'];
  if (typeof genreValue === 'string' && genreValue.trim()) {
    video.genre = genreValue;
  } else if (isRecord(genreValue)) {
    const genre: { id?: string; label?: string } = {};
    const genreId = toOptionalString(genreValue['id']);
    const genreLabel = toOptionalString(genreValue['label']);
    if (genreId) {
      genre.id = genreId;
    }
    if (genreLabel) {
      genre.label = genreLabel;
    }
    if (Object.keys(genre).length > 0) {
      video.genre = genre;
    }
  } else {
    const topGenre = ensureRecord(root['genre']);
    if (topGenre) {
      const topId = toOptionalString(topGenre['key']) ?? toOptionalString(topGenre['id']);
      const topLabel = toOptionalString(topGenre['label']);
      if (topLabel || topId) {
        if (topLabel) {
          video.genre = { id: topId, label: topLabel };
        } else if (topId) {
          video.genre = topId;
        }
      }
    }
  }

  const ownerRecord = ensureRecord(root['owner']);
  let owner: ApiData['owner'] | undefined;
  if (ownerRecord) {
    const nickname = readString(ownerRecord, 'nickname') ?? readString(ownerRecord, 'name') ?? '投稿者';
    const ownerId = toOptionalId(ownerRecord['id']);
    const iconUrl = readString(ownerRecord, 'iconUrl') ?? readString(ownerRecord, 'thumbnailUrl');
    const userPageUrl = readString(ownerRecord, 'userPageUrl') ?? readString(ownerRecord, 'url');
    const description = readString(ownerRecord, 'description');
    owner = { nickname, iconUrl, userPageUrl, description };
    if (ownerId !== undefined) {
      owner.id = ownerId;
    }
  }

  const channelRecord = ensureRecord(root['channel']);
  let channel: ApiData['channel'] | undefined;
  if (channelRecord) {
    const name = readString(channelRecord, 'name');
    if (name) {
      const channelId = toOptionalId(channelRecord['id']);
      const thumbnailFromChannel = ensureRecord(channelRecord['thumbnail']);
      const iconUrl = readString(channelRecord, 'iconUrl') ?? pickFirstString(thumbnailFromChannel, ['url', 'smallUrl']);
      const url = readString(channelRecord, 'url');
      channel = { name, iconUrl, url };
      if (channelId !== undefined) {
        channel.id = channelId;
      }
    }
  }

  const tagRecord = ensureRecord(root['tag']);
  let tag: ApiData['tag'] | undefined;
  if (tagRecord) {
    const tagData: ApiData['tag'] = {};
    const rawItemsSource = tagRecord['items'];
    const itemsRaw: unknown[] = Array.isArray(rawItemsSource) ? rawItemsSource : [];
    const items: TagItemShape[] = [];
    for (const rawItem of itemsRaw) {
      if (!isRecord(rawItem)) {
        continue;
      }
      const name = readString(rawItem, 'name');
      const isCategory = readBoolean(rawItem, 'isCategory');
      const isCategoryCandidate = readBoolean(rawItem, 'isCategoryCandidate');
      const isLocked = readBoolean(rawItem, 'isLocked');
      const hasAnyTagValue =
        name !== undefined ||
        isCategory !== undefined ||
        isCategoryCandidate !== undefined ||
        isLocked !== undefined;
      if (!hasAnyTagValue) {
        continue;
      }
      const tagItem: TagItemShape = {};
      if (name) {
        tagItem.name = name;
      }
      if (isCategory !== undefined) {
        tagItem.isCategory = isCategory;
      }
      if (isCategoryCandidate !== undefined) {
        tagItem.isCategoryCandidate = isCategoryCandidate;
      }
      if (isLocked !== undefined) {
        tagItem.isLocked = isLocked;
      }
      items.push(tagItem);
    }
    if (items.length) {
      tagData.items = items;
    }
    const hasR18Tag = readBoolean(tagRecord, 'hasR18Tag');
    if (hasR18Tag !== undefined) {
      tagData.hasR18Tag = hasR18Tag;
    }
    if (tagData.items || tagData.hasR18Tag !== undefined) {
      tag = tagData;
    }
  }

  const seriesRecord = ensureRecord(root['series']);
  let series: ApiData['series'] | undefined;
  if (seriesRecord) {
    const resultSeries: ApiData['series'] = {};
    const seriesId = toOptionalId(seriesRecord['id']);
    if (seriesId !== undefined) {
      resultSeries.id = seriesId;
    }
    const seriesTitle = readString(seriesRecord, 'title');
    if (seriesTitle) {
      resultSeries.title = seriesTitle;
    }
    const seriesDescription = readString(seriesRecord, 'description');
    if (seriesDescription) {
      resultSeries.description = seriesDescription;
    }
    const seriesThumbnail = readString(seriesRecord, 'thumbnailUrl');
    if (seriesThumbnail) {
      resultSeries.thumbnailUrl = seriesThumbnail;
    }
    const seriesVideoBlock = ensureRecord(seriesRecord['video']);
    const current = toSeriesReferenceForApi(seriesRecord['current']) ?? toSeriesReferenceForApi(seriesVideoBlock?.['first']);
    const prev = toSeriesReferenceForApi(seriesRecord['prev']) ?? toSeriesReferenceForApi(seriesVideoBlock?.['prev']);
    const next = toSeriesReferenceForApi(seriesRecord['next']) ?? toSeriesReferenceForApi(seriesVideoBlock?.['next']);
    if (current) {
      resultSeries.current = current;
    }
    if (prev) {
      resultSeries.prev = prev;
    }
    if (next) {
      resultSeries.next = next;
    }
    if (Object.keys(resultSeries).length > 0) {
      series = resultSeries;
    }
  }

  const paymentRecord = ensureRecord(root['payment']);
  let payment: ApiData['payment'] | undefined;
  if (paymentRecord) {
    const paymentVideo = ensureRecord(paymentRecord['video']);
    if (paymentVideo) {
      const watchable = readString(paymentVideo, 'watchableUserType');
      if (watchable) {
        payment = { video: { watchableUserType: watchable } };
        if (!video.watchableUserTypeForPayment) {
          video.watchableUserTypeForPayment = watchable;
        }
      }
    }
  }

  const commentRecord = ensureRecord(root['comment']);
  let comment: ApiData['comment'] | undefined;
  if (commentRecord) {
    const commentData: ApiData['comment'] = {};
    const threadsSource = commentRecord['threads'];
    const threadsRaw: unknown[] = Array.isArray(threadsSource) ? threadsSource : [];
    const threads: NonNullable<ApiData['comment']>['threads'] = [];
    for (const thread of threadsRaw) {
      if (!isRecord(thread)) {
        continue;
      }
      const id = readString(thread, 'id');
      const fork = readString(thread, 'fork');
      if (id && fork) {
        threads.push({ id, fork });
      }
    }
    if (threads.length) {
      commentData.threads = threads;
    }

    const nvCommentRaw = ensureRecord(commentRecord['nvComment']);
    if (nvCommentRaw) {
      const server = readString(nvCommentRaw, 'server');
      const params = ensureRecord(nvCommentRaw['params']);
      const threadKeyRaw = nvCommentRaw['threadKey'];
      let threadKey: string | undefined;
      if (typeof threadKeyRaw === 'string') {
        threadKey = threadKeyRaw;
      } else if (isRecord(threadKeyRaw)) {
        threadKey = readString(threadKeyRaw, 'threadkey') ?? readString(threadKeyRaw, 'value');
      }
      if (server && params && threadKey) {
        commentData.nvComment = {
          server,
          params,
          threadKey
        };
      }
    }

    if (commentData.threads || commentData.nvComment) {
      comment = commentData;
    }
  }

  const giftRecord = ensureRecord(root['gift']);
  const totalPoint = readNumber(giftRecord, 'totalPoint');
  const gift = totalPoint !== undefined ? { totalPoint } : undefined;

  if (!video.watchableUserTypeForPayment && payment?.video.watchableUserType) {
    video.watchableUserTypeForPayment = payment.video.watchableUserType;
  }
  if (!video.giftPoint && totalPoint !== undefined) {
    video.giftPoint = totalPoint;
  }

  const result: ApiData = { video };
  if (owner) {
    result.owner = owner;
  }
  if (channel) {
    result.channel = channel;
  }
  if (tag) {
    result.tag = tag;
  }
  if (series) {
    result.series = series;
  }
  if (payment) {
    result.payment = payment;
  }
  if (comment) {
    result.comment = comment;
  }
  if (gift) {
    result.gift = gift;
  }

  return result;
};

const htmlToPlainText = (value: string): string => {
  const withNewLine = value.replace(/<br\s*\/?>(?![\n])/gi, '\n');
  const container = document.createElement('div');
  container.innerHTML = withNewLine;
  return (container.textContent ?? value).trim();
};

const getVideoIdFromQuery = (): string | null => {
  const params = new URLSearchParams(window.location.search);
  return params.get('videoId');
};

const getStandaloneModeFromQuery = (): 'normal' | 'deleted' => {
  const params = new URLSearchParams(window.location.search);
  const mode = params.get('mode');
  return mode === 'deleted' ? 'deleted' : 'normal';
};

const getDisplayTitleFromQuery = (): string | undefined => {
  const params = new URLSearchParams(window.location.search);
  const raw = params.get('title');
  if (raw && raw.trim().length > 0) {
    return raw.trim();
  }
  return undefined;
};

const setBreadcrumbVideoId = (videoId: string): void => {
  const current = document.getElementById('nc-current-video-id');
  if (current) {
    current.textContent = videoId;
  }
};

const appendMetaItem = (container: HTMLElement, label: string, value: string | null | undefined): void => {
  if (!value || value === '-') {
    return;
  }
  const item = document.createElement('span');
  item.textContent = label + ': ' + value;
  container.append(item);
};

const resolveGenreLabel = (apiData: ApiData): string | null => {
  const genre = apiData.video.genre;
  if (typeof genre === 'string' && genre.trim()) {
    return genre;
  }
  if (isRecord(genre)) {
    const label = genre['label'];
    if (typeof label === 'string' && label.trim()) {
      return label;
    }
    const id = genre['id'];
    if (typeof id === 'string' && id.trim()) {
      return id;
    }
  }
  return null;
};

const renderMeta = (container: HTMLElement, apiData: ApiData): void => {
  container.innerHTML = '';
  appendMetaItem(container, '動画ID', apiData.video.id);
  appendMetaItem(container, '投稿日', formatDateTime(apiData.video.registeredAt));
  appendMetaItem(container, '再生時間', formatDuration(apiData.video.duration));
  appendMetaItem(container, 'ジャンル', resolveGenreLabel(apiData));
};

const renderStats = (container: HTMLElement, apiData: ApiData): void => {
  container.innerHTML = '';
  container.append(
    createStatItem('再生数', formatNumber(apiData.video.count.view)),
    createStatItem('コメント数', formatNumber(apiData.video.count.comment)),
    createStatItem('マイリスト数', formatNumber(apiData.video.count.mylist)),
    createStatItem('いいね数', formatNumber(apiData.video.likeCount ?? apiData.video.count.like ?? null)),
    createStatItem('広告ポイント', formatNumber(apiData.video.advertisePoint ?? apiData.gift?.totalPoint ?? null)),
    createStatItem('ギフトポイント', formatNumber(apiData.gift?.totalPoint ?? null))
  );
};

const renderTags = (container: HTMLElement, apiData: ApiData): void => {
  container.innerHTML = '';
  const tags = apiData.tag?.items ?? [];
  if (!tags.length) {
    const empty = document.createElement('span');
    empty.className = 'nc-empty';
    empty.textContent = 'タグは登録されていません。';
    container.append(empty);
    return;
  }
  for (const tag of tags) {
    if (!tag || typeof tag !== 'object') {
      continue;
    }
    const name = 'name' in tag && typeof tag.name === 'string' ? tag.name : '';
    if (!name) {
      continue;
    }
    const chip = document.createElement('span');
    chip.className = 'nc-tag';
    chip.textContent = name;
    container.append(chip);
  }
};

const renderDescription = (element: HTMLElement, apiData: ApiData): void => {
  const candidates = [
    typeof apiData.owner?.description === 'string' ? apiData.owner.description : null,
    typeof apiData.video.description === 'string' ? apiData.video.description : null,
    typeof apiData.video.shortDescription === 'string' ? apiData.video.shortDescription : null
  ];
  const source = candidates.find(text => typeof text === 'string' && text.trim().length > 0);
  if (!source) {
    element.textContent = '説明文はありません。';
    return;
  }
  element.textContent = htmlToPlainText(source);
};

const collectOwnerDisplayData = (apiData: ApiData): OwnerDisplayData | null => {
  if (apiData.channel) {
    const channel = apiData.channel;
    const displayName = channel.name && channel.name.trim() ? channel.name : 'チャンネル';
    const idValue = channel.id;
    const channelId = typeof idValue === 'string' ? idValue : typeof idValue === 'number' ? String(idValue) : undefined;
    let iconUrl = channel.iconUrl && channel.iconUrl.trim() ? channel.iconUrl : undefined;
    if (!iconUrl) {
      const thumbnailUrl = (channel as { thumbnail?: { url?: string | null } | null }).thumbnail?.url;
      if (typeof thumbnailUrl === 'string' && thumbnailUrl.trim()) {
        iconUrl = thumbnailUrl;
      }
    }
    const explicitUrl = channel.url && channel.url.trim() ? channel.url : undefined;
    const linkUrl = explicitUrl ?? (channelId ? 'https://ch.nicovideo.jp/' + channelId : undefined);
    return { name: displayName, iconUrl, linkUrl };
  }

  if (apiData.owner) {
    const owner = apiData.owner;
    const nickname = owner.nickname && owner.nickname.trim() ? owner.nickname : '投稿者';
    const idValue = owner.id;
    const ownerId = typeof idValue === 'string' ? idValue : typeof idValue === 'number' ? String(idValue) : undefined;
    const explicitUrl = owner.userPageUrl && owner.userPageUrl.trim() ? owner.userPageUrl : undefined;
    const linkUrl = explicitUrl ?? (ownerId ? 'https://www.nicovideo.jp/user/' + ownerId : undefined);
    const iconUrl = owner.iconUrl && owner.iconUrl.trim() ? owner.iconUrl : undefined;
    return { name: nickname, iconUrl, linkUrl };
  }

  return null;
};

const renderOwner = (layout: StandaloneLayout, apiData: ApiData): void => {
  const ownerInfo = collectOwnerDisplayData(apiData);
  const { ownerContainer, ownerAvatar, ownerName, ownerLink } = layout;

  if (!ownerInfo) {
    ownerContainer.style.display = 'none';
    return;
  }

  ownerContainer.style.display = 'flex';
  ownerName.textContent = ownerInfo.name;

  if (ownerInfo.iconUrl) {
    ownerAvatar.src = ownerInfo.iconUrl;
    ownerAvatar.alt = ownerInfo.name + 'のアイコン';
    ownerAvatar.style.display = '';
  } else {
    ownerAvatar.style.display = 'none';
  }

  if (ownerInfo.linkUrl) {
    ownerLink.href = ownerInfo.linkUrl;
    ownerLink.style.pointerEvents = '';
    ownerLink.removeAttribute('aria-disabled');
  } else {
    ownerLink.href = '#';
    ownerLink.style.pointerEvents = 'none';
    ownerLink.setAttribute('aria-disabled', 'true');
  }
};

const normalizeSeriesEntry = (value: unknown): { id?: string; title: string } | null => {
  const reference = toSeriesReferenceForApi(value);
  if (!reference || !reference.title) {
    return null;
  }
  return { id: reference.id, title: reference.title };
};

const renderSeries = (container: HTMLElement, apiData: ApiData): void => {
  container.innerHTML = '';
  const series = apiData.series;

  if (!series) {
    const empty = document.createElement('p');
    empty.className = 'nc-empty';
    empty.textContent = 'シリーズ情報はありません。';
    container.append(empty);
    return;
  }

  const seriesRecord = series as RecordLike;
  const videoRaw = seriesRecord['video'];
  const videoBlock = isRecord(videoRaw) ? videoRaw : undefined;

  const seriesIdValue = seriesRecord['id'];
  const seriesId = typeof seriesIdValue === 'number' || typeof seriesIdValue === 'string' ? String(seriesIdValue) : undefined;
  const seriesTitle = seriesRecord['title'];

  if (typeof seriesTitle === 'string' && seriesTitle.trim()) {
    const wrapper = document.createElement('div');
    wrapper.className = 'nc-series__item';

    const labelEl = document.createElement('span');
    labelEl.textContent = 'シリーズ';

    const link = document.createElement('a');
    link.textContent = seriesTitle;
    if (seriesId) {
      link.href = 'https://www.nicovideo.jp/series/' + seriesId;
    } else {
      link.href = '#';
      link.style.pointerEvents = 'none';
      link.setAttribute('aria-disabled', 'true');
    }
    link.target = '_blank';
    link.rel = 'noopener noreferrer';

    wrapper.append(labelEl, link);
    container.append(wrapper);
  }

  const entries: Array<[string, unknown]> = [
    ['シリーズ最初', videoBlock?.['first'] ?? seriesRecord['first']],
    ['前の動画', videoBlock?.['prev'] ?? seriesRecord['prev']],
    ['次の動画', videoBlock?.['next'] ?? seriesRecord['next']]
  ];

  for (const [label, raw] of entries) {
    const item = normalizeSeriesEntry(raw);
    if (!item) {
      continue;
    }
    const wrapper = document.createElement('div');
    wrapper.className = 'nc-series__item';

    const labelEl = document.createElement('span');
    labelEl.textContent = label;

    const link = document.createElement('a');
    link.textContent = item.title;
    if (item.id) {
      link.href = 'https://www.nicovideo.jp/watch/' + item.id;
    } else {
      link.href = '#';
      link.style.pointerEvents = 'none';
      link.setAttribute('aria-disabled', 'true');
    }
    link.target = '_blank';
    link.rel = 'noopener noreferrer';

    wrapper.append(labelEl, link);
    container.append(wrapper);
  }

  if (!container.children.length) {
    const empty = document.createElement('p');
    empty.className = 'nc-empty';
    empty.textContent = 'シリーズ情報はありません。';
    container.append(empty);
  }
};

const assignWatchContext = (videoId: string, apiData: ApiData): void => {
  if (!window.NicoCache_nl) {
    return;
  }
  if (!window.NicoCache_nl.watch) {
    window.NicoCache_nl.watch = {
      getVideoID: () => videoId,
      apiData,
      addEventListener: () => {}
    };
    return;
  }
  window.NicoCache_nl.watch.getVideoID = () => videoId;
  window.NicoCache_nl.watch.apiData = apiData;
};

const main = async (): Promise<void> => {
  const videoId = getVideoIdFromQuery();
  const mode = getStandaloneModeFromQuery();
  const layout = createStandaloneLayout({ mode });

  if (!videoId) {
    layout.title.textContent = '動画IDが指定されていません';
    layout.description.textContent = 'URLに videoId パラメーターを指定してください。';
    return;
  }

  setBreadcrumbVideoId(videoId);

  const player = new StandalonePlayer({ mount: layout.playerMount });

  if (mode === 'deleted') {
    const displayTitle = getDisplayTitleFromQuery() ?? `Deleted Video (${videoId})`;
    layout.title.textContent = displayTitle;
    document.title = 'video-player - ' + displayTitle;

    layout.metaList.style.display = 'none';
    layout.infoCard.style.display = 'none';
    layout.description.style.display = 'none';

    try {
      await player.initialize(videoId, {
        displayTitle,
        enableComments: false
      });
    } catch (error) {
      window.logger.error('Standalone deleted video player failed', error);
      layout.description.style.display = '';
      layout.description.textContent = 'キャッシュ再生に失敗しました: ' + (error instanceof Error ? error.message : String(error));
    }

    return;
  }

  try {
    const result = await window.commonHelper.fetchWatchPage(videoId);
    if (!result) {
      throw new Error('ウォッチページの取得に失敗しました');
    }

    const apiData = toApiData(result.apiData, videoId);
    layout.title.textContent = apiData.video.title;
    document.title = 'video-player - ' + apiData.video.title;

    renderMeta(layout.metaList, apiData);
    renderStats(layout.statsList, apiData);
    renderTags(layout.tags, apiData);
    renderDescription(layout.description, apiData);
    renderOwner(layout, apiData);
    renderSeries(layout.seriesList, apiData);

    assignWatchContext(videoId, apiData);

    await player.initialize(videoId, { apiData });
  } catch (error) {
    window.logger.error('Standalone player failed', error);
    layout.title.textContent = '動画情報の取得に失敗しました';
    layout.description.textContent = 'エラー: ' + (error instanceof Error ? error.message : String(error));
  }
};

void main();
