import type { ApiData } from "@/types/index";

export type NicochartVideoInfo = {
  videoId: string;
  title: string;
  thumbnailUrl: string;
  registeredAt: string;
  duration: number;
  counts: {
    view: number;
    comment: number;
    mylist: number;
    like?: number;
  };
  description?: string;
  genre?: string;
  owner?: {
    id?: string;
    name: string;
  };
  tags: Array<{
    name: string;
    isLocked: boolean;
  }>;
};

export const toApiDataFromNicochart = (info: NicochartVideoInfo): ApiData => {
  const apiData: ApiData = {
    video: {
      id: info.videoId,
      title: info.title,
      count: {
        view: info.counts.view,
        comment: info.counts.comment,
        mylist: info.counts.mylist,
        like: info.counts.like,
      },
      thumbnail: { url: info.thumbnailUrl },
      registeredAt: info.registeredAt,
      duration: info.duration,
      description: info.description,
      genre: info.genre,
    },
  };

  if (info.owner) {
    apiData.owner = {
      id: info.owner.id,
      nickname: info.owner.name,
      userPageUrl: info.owner.id
        ? `https://www.nicovideo.jp/user/${info.owner.id}`
        : undefined,
    };
  }
  if (info.tags.length > 0) {
    apiData.tag = {
      items: info.tags.map((tag) => ({
        name: tag.name,
        isLocked: tag.isLocked,
      })),
    };
  }

  return apiData;
};
