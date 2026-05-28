import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { ActivityCommentViewModel } from "../types";

const activityCommentSelect = {
  id: true,
  type: true,
  content: true,
  pinnedByOrganizer: true,
  createdAt: true,
  author: {
    select: {
      id: true,
      nickname: true,
      avatarUrl: true,
    },
  },
} satisfies Prisma.CommentSelect;

type ActivityCommentQueryResult = Prisma.CommentGetPayload<{
  select: typeof activityCommentSelect;
}>;

function getActivityCommentViewModel(
  comment: ActivityCommentQueryResult,
): ActivityCommentViewModel {
  return {
    id: comment.id,
    type: comment.type,
    content: comment.content,
    pinnedByOrganizer: comment.pinnedByOrganizer,
    createdAt: comment.createdAt.toISOString(),
    author: comment.author,
  };
}

export async function getActivityComments(
  activityId: string,
): Promise<ActivityCommentViewModel[]> {
  const comments = await prisma.comment.findMany({
    where: {
      activityId,
      activity: {
        visibility: "PUBLIC",
        organizer: {
          status: "ACTIVE",
        },
      },
      author: {
        status: "ACTIVE",
      },
    },
    orderBy: [
      {
        pinnedByOrganizer: "desc",
      },
      {
        createdAt: "desc",
      },
    ],
    select: activityCommentSelect,
    take: 50,
  });

  return comments.map(getActivityCommentViewModel);
}
