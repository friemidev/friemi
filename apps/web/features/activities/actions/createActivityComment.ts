"use server";

import { revalidatePath } from "next/cache";
import type { ActivityStatus, CommentType } from "@prisma/client";
import { z } from "zod";
import { ensureCurrentUserProfile } from "@/lib/auth";
import { getCopy } from "@/lib/copy";
import { prisma } from "@/lib/prisma";
import { withLocale } from "@/lib/routes";

const commentableActivityStatuses: ActivityStatus[] = [
  "OPEN",
  "FULL",
  "RECRUITING",
  "CONFIRMED",
  "ENDED",
];

const createActivityCommentSchema = z.object({
  activityId: z.string().min(1),
  locale: z.string().min(1).default("zh-CN"),
  parentId: z.string().trim().optional(),
  type: z.enum(["QUESTION", "SUGGESTION", "REVIEW"]),
  content: z.string().trim().min(1).max(500),
});

const updateActivityCommentSchema = z.object({
  activityId: z.string().min(1),
  commentId: z.string().min(1),
  locale: z.string().min(1).default("zh-CN"),
  content: z.string().trim().min(1).max(500),
});

const deleteActivityCommentSchema = z.object({
  activityId: z.string().min(1),
  commentId: z.string().min(1),
  locale: z.string().min(1).default("zh-CN"),
});

export type CreateActivityCommentState = {
  formError?: string;
  fieldErrors?: Record<string, string[]>;
  values?: {
    type: CommentType;
    content: string;
  };
  ok?: boolean;
};

export type UpdateActivityCommentState = {
  formError?: string;
  fieldErrors?: Record<string, string[]>;
  values?: {
    content: string;
  };
  ok?: boolean;
};

export type DeleteActivityCommentState = {
  formError?: string;
  ok?: boolean;
};

const defaultValues: NonNullable<CreateActivityCommentState["values"]> = {
  type: "QUESTION",
  content: "",
};

function getString(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" ? value : "";
}

export async function createActivityCommentAction(
  _previousState: CreateActivityCommentState,
  formData: FormData,
): Promise<CreateActivityCommentState> {
  const rawInput = {
    activityId: getString(formData, "activityId"),
    locale: getString(formData, "locale") || "zh-CN",
    parentId: getString(formData, "parentId") || undefined,
    type: getString(formData, "type") || "QUESTION",
    content: getString(formData, "content"),
  };
  const result = createActivityCommentSchema.safeParse(rawInput);
  const t = getCopy(rawInput.locale).activityComments;

  if (!result.success) {
    return {
      formError: t.formError,
      fieldErrors: result.error.flatten().fieldErrors,
      values: {
        type: (rawInput.type as CommentType) || defaultValues.type,
        content: rawInput.content,
      },
    };
  }

  try {
    const profile = await ensureCurrentUserProfile(result.data.locale);
    const activity = await prisma.activity.findFirst({
      where: {
        id: result.data.activityId,
        visibility: "PUBLIC",
        status: {
          in: commentableActivityStatuses,
        },
        organizer: {
          status: "ACTIVE",
        },
      },
      select: {
        id: true,
      },
    });

    if (!activity) {
      return {
        formError: t.activityError,
        values: {
          type: result.data.type,
          content: result.data.content,
        },
      };
    }

    if (result.data.parentId) {
      const parentComment = await prisma.comment.findFirst({
        where: {
          id: result.data.parentId,
          activityId: activity.id,
          parentId: null,
          deletedAt: null,
        },
        select: {
          id: true,
        },
      });

      if (!parentComment) {
        return {
          formError: t.commentUnavailable,
          values: {
            type: result.data.type,
            content: result.data.content,
          },
        };
      }
    }

    await prisma.comment.create({
      data: {
        activityId: activity.id,
        authorId: profile.id,
        parentId: result.data.parentId ?? null,
        type: result.data.type,
        content: result.data.content,
      },
    });
  } catch (error) {
    console.error("Failed to create activity comment", error);

    return {
      formError: t.failedError,
      values: {
        type: result.success ? result.data.type : defaultValues.type,
        content: result.success ? result.data.content : rawInput.content,
      },
    };
  }

  revalidatePath(
    withLocale(result.data.locale, `/activities/${result.data.activityId}`),
  );

  return {
    ok: true,
    values: defaultValues,
  };
}

export async function updateActivityCommentAction(
  _previousState: UpdateActivityCommentState,
  formData: FormData,
): Promise<UpdateActivityCommentState> {
  const rawInput = {
    activityId: getString(formData, "activityId"),
    commentId: getString(formData, "commentId"),
    locale: getString(formData, "locale") || "zh-CN",
    content: getString(formData, "content"),
  };
  const result = updateActivityCommentSchema.safeParse(rawInput);
  const t = getCopy(rawInput.locale).activityComments;

  if (!result.success) {
    return {
      formError: t.formError,
      fieldErrors: result.error.flatten().fieldErrors,
      values: {
        content: rawInput.content,
      },
    };
  }

  try {
    const profile = await ensureCurrentUserProfile(result.data.locale);
    const comment = await prisma.comment.findFirst({
      where: {
        id: result.data.commentId,
        activityId: result.data.activityId,
        authorId: profile.id,
        deletedAt: null,
        activity: {
          visibility: "PUBLIC",
          organizer: {
            status: "ACTIVE",
          },
        },
      },
      select: {
        id: true,
      },
    });

    if (!comment) {
      return {
        formError: t.commentUnavailable,
        values: {
          content: result.data.content,
        },
      };
    }

    await prisma.comment.update({
      where: {
        id: comment.id,
      },
      data: {
        content: result.data.content,
        editedAt: new Date(),
      },
    });
  } catch (error) {
    console.error("Failed to update activity comment", error);

    return {
      formError: t.failedError,
      values: {
        content: result.success ? result.data.content : rawInput.content,
      },
    };
  }

  revalidatePath(
    withLocale(result.data.locale, `/activities/${result.data.activityId}`),
  );

  return {
    ok: true,
    values: {
      content: result.data.content,
    },
  };
}

export async function deleteActivityCommentAction(
  _previousState: DeleteActivityCommentState,
  formData: FormData,
): Promise<DeleteActivityCommentState> {
  const rawInput = {
    activityId: getString(formData, "activityId"),
    commentId: getString(formData, "commentId"),
    locale: getString(formData, "locale") || "zh-CN",
  };
  const result = deleteActivityCommentSchema.safeParse(rawInput);
  const t = getCopy(rawInput.locale).activityComments;

  if (!result.success) {
    return {
      formError: t.formError,
    };
  }

  try {
    const profile = await ensureCurrentUserProfile(result.data.locale);
    const comment = await prisma.comment.findFirst({
      where: {
        id: result.data.commentId,
        activityId: result.data.activityId,
        authorId: profile.id,
        deletedAt: null,
        activity: {
          visibility: "PUBLIC",
          organizer: {
            status: "ACTIVE",
          },
        },
      },
      select: {
        id: true,
      },
    });

    if (!comment) {
      return {
        formError: t.commentUnavailable,
      };
    }

    await prisma.comment.update({
      where: {
        id: comment.id,
      },
      data: {
        deletedAt: new Date(),
        pinnedByOrganizer: false,
      },
    });
  } catch (error) {
    console.error("Failed to delete activity comment", error);

    return {
      formError: t.failedError,
    };
  }

  revalidatePath(
    withLocale(result.data.locale, `/activities/${result.data.activityId}`),
  );

  return {
    ok: true,
  };
}
