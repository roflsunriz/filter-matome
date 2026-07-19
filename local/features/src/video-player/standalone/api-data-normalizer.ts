import type { ApiData, NicoApiData } from "@/types/index";

export type RecordLike = Record<string, unknown>;

export type OwnerDisplayData = {
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

export const isRecord = (value: unknown): value is RecordLike => {
  return typeof value === "object" && value !== null;
};

const toOptionalString = (value: unknown): string | undefined => {
  return typeof value === "string" && value.trim().length > 0
    ? value
    : undefined;
};

const toOptionalNumber = (value: unknown): number | undefined => {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
};

const toOptionalBoolean = (value: unknown): boolean | undefined => {
  return typeof value === "boolean" ? value : undefined;
};

const ensureRecord = (value: unknown): RecordLike | undefined => {
  return isRecord(value) ? value : undefined;
};

const pickFirstString = (
  record: RecordLike | undefined,
  keys: string[],
): string | undefined => {
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

export const toSeriesReferenceForApi = (
  value: unknown,
): { id?: string; title?: string } | undefined => {
  const record = ensureRecord(value);
  if (!record) {
    return undefined;
  }
  const id = toOptionalString(record["id"]);
  const title = toOptionalString(record["title"]);
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

const readString = (
  record: RecordLike | undefined,
  key: string,
): string | undefined => {
  if (!record) {
    return undefined;
  }
  return toOptionalString(record[key]);
};

const readBoolean = (
  record: RecordLike | undefined,
  key: string,
): boolean | undefined => {
  if (!record) {
    return undefined;
  }
  return toOptionalBoolean(record[key]);
};

const readNumber = (
  record: RecordLike | undefined,
  key: string,
): number | undefined => {
  if (!record) {
    return undefined;
  }
  return toOptionalNumber(record[key]);
};

const toOptionalId = (value: unknown): string | number | undefined => {
  if (typeof value === "string" && value.trim().length > 0) {
    return value;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  return undefined;
};

export const toApiData = (
  source: NicoApiData,
  fallbackVideoId: string,
): ApiData => {
  const root = source as unknown as RecordLike;

  const videoRecord = ensureRecord(root["video"]) ?? {};
  const countRecord = ensureRecord(videoRecord["count"]);
  const thumbnailRecord = ensureRecord(videoRecord["thumbnail"]);

  const video: ApiData["video"] = {
    id: toOptionalString(videoRecord["id"]) ?? fallbackVideoId,
    title: toOptionalString(videoRecord["title"]) ?? "タイトル未取得",
    count: {
      view: readNumber(countRecord, "view") ?? 0,
      comment: readNumber(countRecord, "comment") ?? 0,
      mylist: readNumber(countRecord, "mylist") ?? 0,
      like: readNumber(countRecord, "like"),
    },
    thumbnail: {
      url:
        pickFirstString(thumbnailRecord, [
          "player",
          "ogp",
          "largeUrl",
          "middleUrl",
          "listingUrl",
          "url",
        ]) ?? "",
    },
    registeredAt: toOptionalString(videoRecord["registeredAt"]) ?? "",
    duration: toOptionalNumber(videoRecord["duration"]) ?? 0,
    description: toOptionalString(videoRecord["description"]),
    shortDescription: toOptionalString(videoRecord["shortDescription"]),
    likeCount: toOptionalNumber(videoRecord["likeCount"]),
    watchableUserTypeForPayment: toOptionalString(
      videoRecord["watchableUserTypeForPayment"],
    ),
  };

  const genreValue = videoRecord["genre"];
  if (typeof genreValue === "string" && genreValue.trim()) {
    video.genre = genreValue;
  } else if (isRecord(genreValue)) {
    const genre: { id?: string; label?: string } = {};
    const genreId = toOptionalString(genreValue["id"]);
    const genreLabel = toOptionalString(genreValue["label"]);
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
    const topGenre = ensureRecord(root["genre"]);
    if (topGenre) {
      const topId =
        toOptionalString(topGenre["key"]) ?? toOptionalString(topGenre["id"]);
      const topLabel = toOptionalString(topGenre["label"]);
      if (topLabel || topId) {
        if (topLabel) {
          video.genre = { id: topId, label: topLabel };
        } else if (topId) {
          video.genre = topId;
        }
      }
    }
  }

  const ownerRecord = ensureRecord(root["owner"]);
  let owner: ApiData["owner"] | undefined;
  if (ownerRecord) {
    const nickname =
      readString(ownerRecord, "nickname") ??
      readString(ownerRecord, "name") ??
      "投稿者";
    const ownerId = toOptionalId(ownerRecord["id"]);
    const iconUrl =
      readString(ownerRecord, "iconUrl") ??
      readString(ownerRecord, "thumbnailUrl");
    const userPageUrl =
      readString(ownerRecord, "userPageUrl") ?? readString(ownerRecord, "url");
    const description = readString(ownerRecord, "description");
    owner = { nickname, iconUrl, userPageUrl, description };
    if (ownerId !== undefined) {
      owner.id = ownerId;
    }
  }

  const channelRecord = ensureRecord(root["channel"]);
  let channel: ApiData["channel"] | undefined;
  if (channelRecord) {
    const name = readString(channelRecord, "name");
    if (name) {
      const channelId = toOptionalId(channelRecord["id"]);
      const thumbnailFromChannel = ensureRecord(channelRecord["thumbnail"]);
      const iconUrl =
        readString(channelRecord, "iconUrl") ??
        pickFirstString(thumbnailFromChannel, ["url", "smallUrl"]);
      const url = readString(channelRecord, "url");
      channel = { name, iconUrl, url };
      if (channelId !== undefined) {
        channel.id = channelId;
      }
    }
  }

  const tagRecord = ensureRecord(root["tag"]);
  let tag: ApiData["tag"] | undefined;
  if (tagRecord) {
    const tagData: ApiData["tag"] = {};
    const rawItemsSource = tagRecord["items"];
    const itemsRaw: unknown[] = Array.isArray(rawItemsSource)
      ? rawItemsSource
      : [];
    const items: TagItemShape[] = [];
    for (const rawItem of itemsRaw) {
      if (!isRecord(rawItem)) {
        continue;
      }
      const name = readString(rawItem, "name");
      const isCategory = readBoolean(rawItem, "isCategory");
      const isCategoryCandidate = readBoolean(rawItem, "isCategoryCandidate");
      const isLocked = readBoolean(rawItem, "isLocked");
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
    const hasR18Tag = readBoolean(tagRecord, "hasR18Tag");
    if (hasR18Tag !== undefined) {
      tagData.hasR18Tag = hasR18Tag;
    }
    if (tagData.items || tagData.hasR18Tag !== undefined) {
      tag = tagData;
    }
  }

  const seriesRecord = ensureRecord(root["series"]);
  let series: ApiData["series"] | undefined;
  if (seriesRecord) {
    const resultSeries: ApiData["series"] = {};
    const seriesId = toOptionalId(seriesRecord["id"]);
    if (seriesId !== undefined) {
      resultSeries.id = seriesId;
    }
    const seriesTitle = readString(seriesRecord, "title");
    if (seriesTitle) {
      resultSeries.title = seriesTitle;
    }
    const seriesDescription = readString(seriesRecord, "description");
    if (seriesDescription) {
      resultSeries.description = seriesDescription;
    }
    const seriesThumbnail = readString(seriesRecord, "thumbnailUrl");
    if (seriesThumbnail) {
      resultSeries.thumbnailUrl = seriesThumbnail;
    }
    const seriesVideoBlock = ensureRecord(seriesRecord["video"]);
    const current =
      toSeriesReferenceForApi(seriesRecord["current"]) ??
      toSeriesReferenceForApi(seriesVideoBlock?.["first"]);
    const prev =
      toSeriesReferenceForApi(seriesRecord["prev"]) ??
      toSeriesReferenceForApi(seriesVideoBlock?.["prev"]);
    const next =
      toSeriesReferenceForApi(seriesRecord["next"]) ??
      toSeriesReferenceForApi(seriesVideoBlock?.["next"]);
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

  const paymentRecord = ensureRecord(root["payment"]);
  let payment: ApiData["payment"] | undefined;
  if (paymentRecord) {
    const paymentVideo = ensureRecord(paymentRecord["video"]);
    if (paymentVideo) {
      const watchable = readString(paymentVideo, "watchableUserType");
      if (watchable) {
        payment = { video: { watchableUserType: watchable } };
        if (!video.watchableUserTypeForPayment) {
          video.watchableUserTypeForPayment = watchable;
        }
      }
    }
  }

  const commentRecord = ensureRecord(root["comment"]);
  let comment: ApiData["comment"] | undefined;
  if (commentRecord) {
    const commentData: ApiData["comment"] = {};
    const threadsSource = commentRecord["threads"];
    const threadsRaw: unknown[] = Array.isArray(threadsSource)
      ? threadsSource
      : [];
    const threads: NonNullable<ApiData["comment"]>["threads"] = [];
    for (const thread of threadsRaw) {
      if (!isRecord(thread)) {
        continue;
      }
      const id = readString(thread, "id");
      const fork = readString(thread, "fork");
      if (id && fork) {
        threads.push({ id, fork });
      }
    }
    if (threads.length) {
      commentData.threads = threads;
    }

    const nvCommentRaw = ensureRecord(commentRecord["nvComment"]);
    if (nvCommentRaw) {
      const server = readString(nvCommentRaw, "server");
      const params = ensureRecord(nvCommentRaw["params"]);
      const threadKeyRaw = nvCommentRaw["threadKey"];
      let threadKey: string | undefined;
      if (typeof threadKeyRaw === "string") {
        threadKey = threadKeyRaw;
      } else if (isRecord(threadKeyRaw)) {
        threadKey =
          readString(threadKeyRaw, "threadkey") ??
          readString(threadKeyRaw, "value");
      }
      if (server && params && threadKey) {
        commentData.nvComment = {
          server,
          params,
          threadKey,
        };
      }
    }

    if (commentData.threads || commentData.nvComment) {
      comment = commentData;
    }
  }

  if (!video.watchableUserTypeForPayment && payment?.video.watchableUserType) {
    video.watchableUserTypeForPayment = payment.video.watchableUserType;
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

  return result;
};
