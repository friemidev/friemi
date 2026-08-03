import type { Prisma } from "@prisma/client";
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
): ProfileMomentViewModel {
  const image = moment.images[0] ?? null;

  return {
    id: moment.id,
    content: moment.content,
    visibility: moment.visibility,
    resharedMomentId: moment.resharedMomentId,
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

export async function getProfileMoments(profileId: string) {
  const moments = await prisma.moment.findMany({
    where: {
      authorId: profileId,
      deletedAt: null,
    },
    orderBy: [{ createdAt: "desc" }, { id: "asc" }],
    select: profileMomentListSelect,
  });

  return moments.map(mapProfileMoment);
}
