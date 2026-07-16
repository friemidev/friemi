import type { MomentVisibility, Prisma } from "@prisma/client";
import { cache } from "react";
import { getViewerFriendIds } from "@/features/friends/queries/getViewerFriendIds";
import { prisma } from "@/lib/prisma";

const momentAuthorSelect = {
  id: true,
  nickname: true,
  avatarUrl: true,
  friendCode: true,
} satisfies Prisma.UserProfileSelect;

const momentImageSelect = {
  id: true,
  url: true,
  width: true,
  height: true,
  sortOrder: true,
} satisfies Prisma.MomentImageSelect;

const sharedMomentSelect = {
  id: true,
  content: true,
  createdAt: true,
  deletedAt: true,
  author: {
    select: momentAuthorSelect,
  },
  images: {
    orderBy: {
      sortOrder: "asc" as const,
    },
    take: 1,
    select: momentImageSelect,
  },
} satisfies Prisma.MomentSelect;

const momentCommentSelect = {
  id: true,
  content: true,
  createdAt: true,
  author: {
    select: momentAuthorSelect,
  },
} satisfies Prisma.MomentCommentSelect;

function getMomentFeedSelect(
  viewerProfileId: string | null,
  options: { commentTake?: number } = {},
) {
  return {
    id: true,
    content: true,
    visibility: true,
    likeCount: true,
    commentCount: true,
    repostCount: true,
    createdAt: true,
    author: {
      select: momentAuthorSelect,
    },
    resharedMoment: {
      select: sharedMomentSelect,
    },
    images: {
      orderBy: {
        sortOrder: "asc" as const,
      },
      select: momentImageSelect,
    },
    likes: {
      where: {
        userId: viewerProfileId ?? "__anonymous_viewer__",
      },
      take: 1,
      select: {
        id: true,
      },
    },
    comments: {
      where: {
        parentId: null,
        deletedAt: null,
      },
      orderBy: {
        createdAt: "desc" as const,
      },
      take: options.commentTake ?? 8,
      select: momentCommentSelect,
    },
  } satisfies Prisma.MomentSelect;
}

type MomentFeedQueryResult = Prisma.MomentGetPayload<{
  select: ReturnType<typeof getMomentFeedSelect>;
}>;

export type MomentFeedAuthorViewModel = {
  id: string;
  nickname: string;
  avatarUrl: string | null;
  friendCode: string | null;
};

export type MomentFeedImageViewModel = {
  id: string;
  url: string;
  width: number | null;
  height: number | null;
  sortOrder: number;
};

export type MomentFeedCommentViewModel = {
  id: string;
  content: string;
  createdAt: string;
  author: MomentFeedAuthorViewModel;
};

export type MomentSharedPreviewViewModel = {
  id: string;
  author: MomentFeedAuthorViewModel;
  content: string | null;
  createdAt: string;
  image: MomentFeedImageViewModel | null;
};

export type MomentFeedItemViewModel = {
  id: string;
  author: MomentFeedAuthorViewModel;
  content: string | null;
  visibility: MomentVisibility;
  images: MomentFeedImageViewModel[];
  likeCount: number;
  commentCount: number;
  repostCount: number;
  createdAt: string;
  isLikedByViewer: boolean;
  recentComments: MomentFeedCommentViewModel[];
  resharedMoment: MomentSharedPreviewViewModel | null;
};

function mapAuthor(author: MomentFeedQueryResult["author"]) {
  const nickname = author.nickname.trim();

  return {
    id: author.id,
    nickname:
      nickname || (author.friendCode ? `NF ${author.friendCode}` : "NF"),
    avatarUrl: nickname ? author.avatarUrl : null,
    friendCode: author.friendCode,
  };
}

function mapMoment(moment: MomentFeedQueryResult): MomentFeedItemViewModel {
  return {
    id: moment.id,
    author: mapAuthor(moment.author),
    content: moment.content,
    visibility: moment.visibility,
    images: moment.images.map((image) => ({
      id: image.id,
      url: image.url,
      width: image.width,
      height: image.height,
      sortOrder: image.sortOrder,
    })),
    likeCount: moment.likeCount,
    commentCount: moment.commentCount,
    repostCount: moment.repostCount,
    createdAt: moment.createdAt.toISOString(),
    isLikedByViewer: moment.likes.length > 0,
    recentComments: moment.comments
      .slice()
      .reverse()
      .map((comment) => ({
        id: comment.id,
        content: comment.content,
        createdAt: comment.createdAt.toISOString(),
        author: mapAuthor(comment.author),
      })),
    resharedMoment:
      moment.resharedMoment && !moment.resharedMoment.deletedAt
        ? {
            id: moment.resharedMoment.id,
            author: mapAuthor(moment.resharedMoment.author),
            content: moment.resharedMoment.content,
            createdAt: moment.resharedMoment.createdAt.toISOString(),
            image: moment.resharedMoment.images[0]
              ? {
                  id: moment.resharedMoment.images[0].id,
                  url: moment.resharedMoment.images[0].url,
                  width: moment.resharedMoment.images[0].width,
                  height: moment.resharedMoment.images[0].height,
                  sortOrder: moment.resharedMoment.images[0].sortOrder,
                }
              : null,
          }
        : null,
  };
}

export async function getVisibleMomentWhere(
  momentId: string,
  viewerProfileId: string | null,
): Promise<Prisma.MomentWhereInput> {
  const visibilityRules: Prisma.MomentWhereInput[] = [{ visibility: "PUBLIC" }];

  if (viewerProfileId) {
    const friendIds = await getViewerFriendIds(viewerProfileId);

    visibilityRules.unshift({ authorId: viewerProfileId });
    visibilityRules.push({
      authorId: {
        in: friendIds,
      },
      visibility: "FRIENDS",
    });
  }

  return {
    id: momentId,
    deletedAt: null,
    author: {
      status: "ACTIVE",
    },
    OR: visibilityRules,
  };
}

export const getMomentFeed = cache(async (viewerProfileId: string | null) => {
  const visibilityRules: Prisma.MomentWhereInput[] = [{ visibility: "PUBLIC" }];

  if (viewerProfileId) {
    const friendIds = await getViewerFriendIds(viewerProfileId);

    visibilityRules.unshift({ authorId: viewerProfileId });
    visibilityRules.push({
      authorId: {
        in: friendIds,
      },
      visibility: "FRIENDS",
    });
  }

  const moments = await prisma.moment.findMany({
    where: {
      deletedAt: null,
      author: {
        status: "ACTIVE",
      },
      OR: visibilityRules,
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 50,
    select: getMomentFeedSelect(viewerProfileId),
  });

  return moments.map(mapMoment);
});

export const getMomentDetail = cache(
  async (momentId: string, viewerProfileId: string | null) => {
    const moment = await prisma.moment.findFirst({
      where: await getVisibleMomentWhere(momentId, viewerProfileId),
      select: getMomentFeedSelect(viewerProfileId, { commentTake: 100 }),
    });

    return moment ? mapMoment(moment) : null;
  },
);
