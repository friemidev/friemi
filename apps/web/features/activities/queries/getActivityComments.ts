import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type {
  ActivityCommentReplyViewModel,
  ActivityCommentViewModel,
} from "../types";

const activityCommentSelect = {
  id: true,
  type: true,
  content: true,
  pinnedByOrganizer: true,
  createdAt: true,
  editedAt: true,
  deletedAt: true,
  author: {
    select: {
      id: true,
      nickname: true,
      avatarUrl: true,
    },
  },
  replies: {
    where: {
      author: {
        status: "ACTIVE" as const,
      },
    },
    orderBy: {
      createdAt: "asc" as const,
    },
    select: {
      id: true,
      type: true,
      content: true,
      createdAt: true,
      editedAt: true,
      deletedAt: true,
      author: {
        select: {
          id: true,
          nickname: true,
          avatarUrl: true,
        },
      },
    },
    take: 20,
  },
} satisfies Prisma.CommentSelect;

type ActivityCommentQueryResult = Prisma.CommentGetPayload<{
  select: typeof activityCommentSelect;
}>;

type ActivityCommentReplyQueryResult =
  ActivityCommentQueryResult["replies"][number];

function getActivityCommentReplyViewModel(
  comment: ActivityCommentReplyQueryResult,
): ActivityCommentReplyViewModel {
  const isDeleted = Boolean(comment.deletedAt);

  return {
    id: comment.id,
    type: comment.type,
    content: isDeleted ? "" : comment.content,
    isDeleted,
    createdAt: comment.createdAt.toISOString(),
    editedAt: comment.editedAt?.toISOString() ?? null,
    author: comment.author,
  };
}

function getActivityCommentViewModel(
  comment: ActivityCommentQueryResult,
): ActivityCommentViewModel {
  const isDeleted = Boolean(comment.deletedAt);

  return {
    id: comment.id,
    type: comment.type,
    content: isDeleted ? "" : comment.content,
    isDeleted,
    pinnedByOrganizer: comment.pinnedByOrganizer,
    createdAt: comment.createdAt.toISOString(),
    editedAt: comment.editedAt?.toISOString() ?? null,
    author: comment.author,
    replies: comment.replies.map(getActivityCommentReplyViewModel),
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
      parentId: null,
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
