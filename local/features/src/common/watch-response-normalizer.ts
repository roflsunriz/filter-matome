type UnknownRecord = Record<string, unknown>;

const asRecord = (value: unknown): UnknownRecord | undefined =>
  typeof value === "object" && value !== null
    ? (value as UnknownRecord)
    : undefined;

const isWatchData = (
  value: UnknownRecord | undefined,
): value is UnknownRecord =>
  Boolean(
    value &&
    (asRecord(value.video) ||
      asRecord(value.media) ||
      asRecord(value.comment) ||
      asRecord(value.client)),
  );

const normalizeOwner = (
  value: unknown,
): { owner?: UnknownRecord; channel?: UnknownRecord } => {
  const rawOwner = asRecord(value);
  if (!rawOwner) {
    return {};
  }

  const type = typeof rawOwner.type === "string" ? rawOwner.type : "";
  const id = rawOwner.id;
  const idText =
    typeof id === "string" ? id : typeof id === "number" ? String(id) : "";
  const isChannel = type === "channel" || idText.startsWith("ch");
  const account = {
    id,
    name: rawOwner.name,
    ...(!isChannel ? { nickname: rawOwner.name } : {}),
    iconUrl: rawOwner.iconUrl,
  };
  return isChannel ? { channel: account } : { owner: account };
};

/** 現行Watch V4と旧Watch応答を既存の内部形式へ正規化する。 */
export const normalizeWatchResponseData = (
  value: unknown,
): UnknownRecord | undefined => {
  const root = asRecord(value);
  const data = asRecord(root?.data);
  const response =
    asRecord(data?.response) ??
    (asRecord(data?.$watchV4)
      ? data
      : asRecord(root?.$watchV4)
        ? root
        : isWatchData(data)
          ? data
          : isWatchData(root)
            ? root
            : undefined);
  if (!response) {
    return undefined;
  }

  const watchV4 = asRecord(response.$watchV4);
  const watchV4Data = asRecord(watchV4?.data);
  if (!watchV4Data) {
    return isWatchData(response) ? response : undefined;
  }

  const metadata = asRecord(watchV4Data.metadata);
  const jsonLd = asRecord(metadata?.jsonLd);
  const ownerFields = normalizeOwner(jsonLd?.owner);
  const rawVideo = asRecord(watchV4Data.video);
  const rawThumbnail = asRecord(rawVideo?.thumbnail);
  const thumbnailUrl =
    rawThumbnail?.url ??
    rawThumbnail?.normal ??
    rawThumbnail?.middle ??
    rawThumbnail?.large ??
    rawThumbnail?.player ??
    rawThumbnail?.ogp;
  const rawPayment = asRecord(watchV4Data.payment);
  const rawPaymentVideo = asRecord(rawPayment?.video);
  const paymentVideo =
    rawPaymentVideo ??
    (rawPayment
      ? {
          isPpv: asRecord(rawPayment.ppv)?.isEnabled,
          isAdmission: asRecord(rawPayment.admission)?.isEnabled,
          isContinuationBenefit: asRecord(rawPayment.continuationBenefit)
            ?.isEnabled,
          isPremium: asRecord(rawPayment.premium)?.isEnabled,
          watchableUserType: rawPayment.watchableUserType,
          commentableUserType: rawPayment.commentableUserType,
          billingType: rawPayment.billingType,
        }
      : undefined);
  const payment = rawPayment
    ? {
        ...rawPayment,
        ...(paymentVideo ? { video: paymentVideo } : {}),
      }
    : undefined;
  const video = rawVideo
    ? {
        ...rawVideo,
        ...(typeof paymentVideo?.watchableUserType === "string"
          ? {
              watchableUserTypeForPayment: paymentVideo.watchableUserType,
            }
          : {}),
        ...(rawThumbnail
          ? {
              thumbnail: {
                ...rawThumbnail,
                ...(typeof thumbnailUrl === "string"
                  ? { url: thumbnailUrl }
                  : {}),
              },
            }
          : {}),
      }
    : undefined;
  const rawMedia = asRecord(watchV4Data.media);
  const contents = asRecord(rawMedia?.contents);
  const media = rawMedia
    ? {
        ...rawMedia,
        ...(contents && !rawMedia.domand
          ? {
              domand: {
                ...contents,
                accessRightKey: rawMedia.accessRightKey,
              },
            }
          : {}),
      }
    : undefined;
  return {
    ...watchV4Data,
    ...(video ? { video } : {}),
    ...(media ? { media } : {}),
    ...(payment ? { payment } : {}),
    ...ownerFields,
    ...(watchV4Data.tags && !watchV4Data.tag ? { tag: watchV4Data.tags } : {}),
  };
};
