import type { Prisma } from "@prisma/client";
import { getFollowRelationshipBuckets } from "@/features/follow/queries/followRelations";
import { prisma } from "@/lib/prisma";
import type { ProfileMomentViewModel } from "./getProfileDashboard";

const profileMomentListSelect = {
  id: true,
  content: true,
  visibility: true,
  resharedMomentId: true,
  likeCount: true,
  commentCount: true,
  repostCount: true,
  createdAt: true,
  images: {
    orderBy: {
      sortOrder: "asc",
    },
    take: 1,
    select: {
      id: true,
      url: true,
      width: true,
      height: true,
    },
  },
} satisfies Prisma.MomentSelect;

type ProfileMomentListQueryResult = Prisma.MomentGetPayload<{
  select: typeof profileMomentListSelect;
}>;

function mapProfileMoment(
  moment: ProfileMomentListQueryResult,
  giftCount = 0,
): ProfileMomentViewModel {
  const image = moment.images[0] ?? null;

  return {
    id: moment.id,
    content: moment.content,
    visibility: moment.visibility,
    resharedMomentId: moment.resharedMomentId,
    giftCount,
    likeCount: moment.likeCount,
    commentCount: moment.commentCount,
    repostCount: moment.repostCount,
    createdAt: moment.createdAt.toISOString(),
    image: image
      ? {
          id: image.id,
          url: image.url,
          width: image.width,
          height: image.height,
        }
      : null,
  };
}

async function getProfileMomentGiftCountMap(momentIds: string[]) {
  if (momentIds.length === 0) {
    return new Map<string, number>();
  }

  const groups = await prisma.charmGiftEvent.groupBy({
    by: ["sourceContextId"],
    where: {
      sourceContextId: {
        in: momentIds,
      },
      sourceSurface: "MOMENT",
    },
    _sum: {
      quantity: true,
    },
  });

  return new Map(
    groups.flatMap((group) =>
      group.sourceContextId
        ? [[group.sourceContextId, group._sum.quantity ?? 0]]
        : [],
    ),
  );
}

export async function getProfileMoments(profileId: string) {
  const moments = await prisma.moment.findMany({
    where: {
      authorId: profileId,
      deletedAt: null,
    },
    orderBy: [{ createdAt: "desc" }, { id: "asc" }],
    select: profileMomentListSelect,
  });
  const giftCountByMomentId = await getProfileMomentGiftCountMap(
    moments.map((moment) => moment.id),
  );

  return moments.map((moment) =>
    mapProfileMoment(moment, giftCountByMomentId.get(moment.id) ?? 0),
  );
}

export async function getProfileLikedMoments(profileId: string) {
  const buckets = await getFollowRelationshipBuckets(profileId);
  const visibilityRules: Prisma.MomentWhereInput[] = [
    { visibility: "PUBLIC" },
    { authorId: profileId },
    {
      authorId: {
        in: buckets.mutualFollowIds,
      },
      visibility: "FRIENDS",
    },
  ];

  const likes = await prisma.momentLike.findMany({
    where: {
      userId: profileId,
      moment: {
        deletedAt: null,
        author: {
          status: "ACTIVE",
        },
        OR: visibilityRules,
      },
    },
    orderBy: [{ createdAt: "desc" }, { id: "asc" }],
    select: {
      moment: {
        select: profileMomentListSelect,
      },
    },
  });
  const giftCountByMomentId = await getProfileMomentGiftCountMap(
    likes.map((like) => like.moment.id),
  );

  return likes.map((like) =>
    mapProfileMoment(like.moment, giftCountByMomentId.get(like.moment.id) ?? 0),
  );
}
