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
  type: z.enum(["QUESTION", "SUGGESTION", "REVIEW"]),
  content: z.string().trim().min(1).max(500),
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

    await prisma.comment.create({
      data: {
        activityId: activity.id,
        authorId: profile.id,
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
