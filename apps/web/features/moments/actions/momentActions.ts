"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { normalizeAnalyticsLocale } from "@/features/analytics/events";
import { queueAnalyticsEvent } from "@/features/analytics/server";
import { createNotifications } from "@/features/notifications/utils/createNotification";
import { ensureCurrentUserProfile } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withLocale } from "@/lib/routes";
import { getVisibleMomentWhere } from "../queries/getMomentFeed";

const momentContentMaxLength = 500;
const momentCommentMaxLength = 500;

const createMomentSchema = z
  .object({
    content: z.string().trim().max(momentContentMaxLength).optional(),
    imageUrls: z.array(z.string().trim().url()).max(6).default([]),
    locale: z.string().min(1).default("zh-CN"),
    visibility: z.enum(["FRIENDS", "PUBLIC"]).default("FRIENDS"),
  })
  .refine(
    (value) => Boolean(value.content?.trim()) || value.imageUrls.length > 0,
    {
      path: ["content"],
    },
  );

const toggleMomentLikeSchema = z.object({
  locale: z.string().min(1).default("zh-CN"),
  momentId: z.string().min(1),
});

const repostMomentSchema = toggleMomentLikeSchema;

const createMomentCommentSchema = z.object({
  content: z.string().trim().min(1).max(momentCommentMaxLength),
  locale: z.string().min(1).default("zh-CN"),
  momentId: z.string().min(1),
  parentId: z.string().trim().optional(),
});

const momentMutationSchema = z.object({
  locale: z.string().min(1).default("zh-CN"),
  momentId: z.string().min(1),
  redirectPath: z.string().trim().optional(),
});

const momentCommentMutationSchema = z.object({
  commentId: z.string().min(1),
  locale: z.string().min(1).default("zh-CN"),
  momentId: z.string().min(1),
});

export type CreateMomentState = {
  fieldErrors?: Record<string, string[]>;
  formError?: string;
  ok?: boolean;
  values?: {
    content?: string;
    imageUrls?: string[];
    visibility?: "FRIENDS" | "PUBLIC";
  };
};

export type CreateMomentCommentState = {
  fieldErrors?: Record<string, string[]>;
  formError?: string;
  ok?: boolean;
  values?: {
    content?: string;
  };
};

function getString(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" ? value : "";
}

function getStringList(formData: FormData, key: string) {
  return formData
    .getAll(key)
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim())
    .filter(Boolean);
}

function getMomentActionCopy(locale: string) {
  if (locale === "en") {
    return {
      commentFailed: "Comment failed. Please try again later.",
      createFailed: "Post failed. Please try again later.",
      invalidComment: "Write a comment first.",
      invalidMoment: "Write something or add a photo first.",
      momentUnavailable: "This moment is unavailable.",
      repostFailed: "Repost failed. Please try again later.",
    };
  }

  if (locale === "fr") {
    return {
      commentFailed: "Le commentaire n'a pas été publié. Réessayez plus tard.",
      createFailed: "La publication a échoué. Réessayez plus tard.",
      invalidComment: "Écrivez d'abord un commentaire.",
      invalidMoment: "Ajoutez un texte ou une photo.",
      momentUnavailable: "Ce moment n'est pas disponible.",
      repostFailed: "Le partage a échoué. Réessayez plus tard.",
    };
  }

  return {
    commentFailed: "评论发布失败，请稍后重试。",
    createFailed: "发布失败，请稍后重试。",
    invalidComment: "先写点评论内容。",
    invalidMoment: "写点内容或添加一张图片。",
    momentUnavailable: "这条足迹暂不可操作。",
    repostFailed: "转发失败，请稍后再试。",
  };
}

function revalidateMomentSurfaces(locale: string) {
  revalidatePath(withLocale(locale, "/footprints"));
  revalidatePath(withLocale(locale, "/notifications"));
  revalidatePath(withLocale(locale, "/"), "layout");
}

function isUniqueConstraintError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "P2002"
  );
}

export async function createMomentAction(
  _previousState: CreateMomentState,
  formData: FormData,
): Promise<CreateMomentState> {
  const rawInput = {
    content: getString(formData, "content"),
    imageUrls: [
      ...getStringList(formData, "imageUrls"),
      ...getStringList(formData, "imageUrl"),
    ].filter((url, index, urls) => urls.indexOf(url) === index),
    locale: getString(formData, "locale") || "zh-CN",
    visibility: getString(formData, "visibility") || "FRIENDS",
  };
  const result = createMomentSchema.safeParse(rawInput);
  const copy = getMomentActionCopy(rawInput.locale);

  if (!result.success) {
    return {
      formError: copy.invalidMoment,
      fieldErrors: result.error.flatten().fieldErrors,
      values: {
        content: rawInput.content,
        imageUrls: rawInput.imageUrls,
        visibility:
          rawInput.visibility === "PUBLIC" || rawInput.visibility === "FRIENDS"
            ? rawInput.visibility
            : "FRIENDS",
      },
    };
  }

  try {
    const profile = await ensureCurrentUserProfile(
      result.data.locale,
      "/footprints",
    );
    const moment = await prisma.moment.create({
      data: {
        authorId: profile.id,
        content: result.data.content?.trim() || null,
        visibility: result.data.visibility,
        images: result.data.imageUrls.length
          ? {
              create: result.data.imageUrls.map((url, index) => ({
                sortOrder: index,
                url,
              })),
            }
          : undefined,
      },
      select: {
        id: true,
      },
    });

    queueAnalyticsEvent(
      {
        locale: normalizeAnalyticsLocale(result.data.locale),
        name: "moment_created",
        route: `/${result.data.locale}/footprints`,
        entityId: moment.id,
        entityType: "moment",
        sourceSurface: "footprints",
        properties: {
          image_count: result.data.imageUrls.length,
          visibility: result.data.visibility,
        },
      },
      {
        userProfileId: profile.id,
      },
    );
  } catch (error) {
    console.error("Failed to create moment", error);

    return {
      formError: copy.createFailed,
      values: {
        content: result.success ? result.data.content : rawInput.content,
        imageUrls: result.success ? result.data.imageUrls : rawInput.imageUrls,
        visibility: result.success
          ? result.data.visibility
          : rawInput.visibility === "PUBLIC"
            ? "PUBLIC"
            : "FRIENDS",
      },
    };
  }

  revalidateMomentSurfaces(result.data.locale);

  return {
    ok: true,
    values: {
      content: "",
      imageUrls: [],
      visibility: "FRIENDS",
    },
  };
}

export async function deleteMomentAction(formData: FormData) {
  const rawInput = {
    locale: getString(formData, "locale") || "zh-CN",
    momentId: getString(formData, "momentId"),
    redirectPath: getString(formData, "redirectPath") || undefined,
  };
  const result = momentMutationSchema.safeParse(rawInput);

  if (!result.success) {
    return;
  }

  const profile = await ensureCurrentUserProfile(
    result.data.locale,
    "/footprints",
  );
  const deletedAt = new Date();
  const moment = await prisma.moment.findFirst({
    where: {
      authorId: profile.id,
      deletedAt: null,
      id: result.data.momentId,
    },
    select: {
      id: true,
      resharedMomentId: true,
    },
  });

  if (!moment) {
    return;
  }

  await prisma.$transaction(async (tx) => {
    await tx.moment.update({
      where: {
        id: moment.id,
      },
      data: {
        deletedAt,
      },
    });

    if (moment.resharedMomentId) {
      await tx.moment.updateMany({
        where: {
          id: moment.resharedMomentId,
          repostCount: {
            gt: 0,
          },
        },
        data: {
          repostCount: {
            decrement: 1,
          },
        },
      });
    }
  });

  queueAnalyticsEvent(
    {
      locale: normalizeAnalyticsLocale(result.data.locale),
      name: "moment_deleted",
      route: `/${result.data.locale}/footprints`,
      entityId: result.data.momentId,
      entityType: "moment",
      sourceSurface: "footprints",
      properties: {
        was_repost: Boolean(moment.resharedMomentId),
      },
    },
    {
      userProfileId: profile.id,
    },
  );

  revalidateMomentSurfaces(result.data.locale);
  revalidatePath(
    withLocale(result.data.locale, `/footprints/${result.data.momentId}`),
  );
  if (moment.resharedMomentId) {
    revalidatePath(
      withLocale(result.data.locale, `/footprints/${moment.resharedMomentId}`),
    );
  }

  if (result.data.redirectPath?.startsWith("/")) {
    redirect(withLocale(result.data.locale, result.data.redirectPath));
  }
}

export async function toggleMomentLikeAction(formData: FormData) {
  const rawInput = {
    locale: getString(formData, "locale") || "zh-CN",
    momentId: getString(formData, "momentId"),
  };
  const result = toggleMomentLikeSchema.safeParse(rawInput);

  if (!result.success) {
    return;
  }

  const profile = await ensureCurrentUserProfile(
    result.data.locale,
    "/footprints",
  );
  const moment = await prisma.moment.findFirst({
    where: await getVisibleMomentWhere(result.data.momentId, profile.id),
    select: {
      authorId: true,
      id: true,
    },
  });

  if (!moment) {
    return;
  }

  let didLike = false;

  try {
    await prisma.$transaction(async (tx) => {
      const existingLike = await tx.momentLike.findUnique({
        where: {
          momentId_userId: {
            momentId: moment.id,
            userId: profile.id,
          },
        },
        select: {
          id: true,
        },
      });

      if (existingLike) {
        await tx.momentLike.delete({
          where: {
            id: existingLike.id,
          },
        });
        await tx.moment.updateMany({
          where: {
            id: moment.id,
            likeCount: {
              gt: 0,
            },
          },
          data: {
            likeCount: {
              decrement: 1,
            },
          },
        });
        didLike = false;
        return;
      }

      await tx.momentLike.create({
        data: {
          momentId: moment.id,
          userId: profile.id,
        },
      });
      await tx.moment.update({
        where: {
          id: moment.id,
        },
        data: {
          likeCount: {
            increment: 1,
          },
        },
      });
      didLike = true;

      if (moment.authorId !== profile.id) {
        await createNotifications(tx, [
          {
            actorId: profile.id,
            momentId: moment.id,
            recipientId: moment.authorId,
            type: "MOMENT_LIKED",
          },
        ]);
      }
    });
  } catch (error) {
    if (!isUniqueConstraintError(error)) {
      console.error("Failed to toggle moment like", error);
    }

    return;
  }

  queueAnalyticsEvent(
    {
      locale: normalizeAnalyticsLocale(result.data.locale),
      name: didLike ? "moment_liked" : "moment_unliked",
      route: `/${result.data.locale}/footprints`,
      entityId: moment.id,
      entityType: "moment",
      sourceSurface: "footprints",
    },
    {
      userProfileId: profile.id,
    },
  );

  revalidateMomentSurfaces(result.data.locale);
}

export async function repostMomentAction(formData: FormData) {
  const rawInput = {
    locale: getString(formData, "locale") || "zh-CN",
    momentId: getString(formData, "momentId"),
  };
  const result = repostMomentSchema.safeParse(rawInput);

  if (!result.success) {
    return;
  }

  const profile = await ensureCurrentUserProfile(
    result.data.locale,
    "/footprints",
  );
  const moment = await prisma.moment.findFirst({
    where: await getVisibleMomentWhere(result.data.momentId, profile.id),
    select: {
      authorId: true,
      deletedAt: true,
      id: true,
      resharedMoment: {
        select: {
          authorId: true,
          deletedAt: true,
          id: true,
          visibility: true,
        },
      },
      visibility: true,
    },
  });

  if (!moment) {
    return;
  }

  const sourceMoment = moment.resharedMoment ?? moment;

  if (
    sourceMoment.deletedAt ||
    (sourceMoment.visibility !== "PUBLIC" &&
      sourceMoment.authorId !== profile.id)
  ) {
    return;
  }

  let repostedMomentId: string | null = null;

  try {
    await prisma.$transaction(async (tx) => {
      const repost = await tx.moment.create({
        data: {
          authorId: profile.id,
          resharedMomentId: sourceMoment.id,
          visibility: "FRIENDS",
        },
        select: {
          id: true,
        },
      });

      repostedMomentId = repost.id;

      await tx.moment.update({
        where: {
          id: sourceMoment.id,
        },
        data: {
          repostCount: {
            increment: 1,
          },
        },
      });

      if (sourceMoment.authorId !== profile.id) {
        await createNotifications(tx, [
          {
            actorId: profile.id,
            momentId: sourceMoment.id,
            recipientId: sourceMoment.authorId,
            type: "MOMENT_REPOSTED",
          },
        ]);
      }
    });
  } catch (error) {
    console.error("Failed to repost moment", error);
    return;
  }

  queueAnalyticsEvent(
    {
      locale: normalizeAnalyticsLocale(result.data.locale),
      name: "moment_reposted",
      route: `/${result.data.locale}/footprints`,
      entityId: sourceMoment.id,
      entityType: "moment",
      sourceSurface: "footprints",
      properties: {
        repost_id: repostedMomentId,
      },
    },
    {
      userProfileId: profile.id,
    },
  );

  revalidateMomentSurfaces(result.data.locale);
  revalidatePath(
    withLocale(result.data.locale, `/footprints/${sourceMoment.id}`),
  );
}

export async function createMomentCommentAction(
  _previousState: CreateMomentCommentState,
  formData: FormData,
): Promise<CreateMomentCommentState> {
  const rawInput = {
    content: getString(formData, "content"),
    locale: getString(formData, "locale") || "zh-CN",
    momentId: getString(formData, "momentId"),
    parentId: getString(formData, "parentId") || undefined,
  };
  const result = createMomentCommentSchema.safeParse(rawInput);
  const copy = getMomentActionCopy(rawInput.locale);

  if (!result.success) {
    return {
      formError: copy.invalidComment,
      fieldErrors: result.error.flatten().fieldErrors,
      values: {
        content: rawInput.content,
      },
    };
  }

  let commentId: string | null = null;

  try {
    const profile = await ensureCurrentUserProfile(
      result.data.locale,
      "/footprints",
    );
    const moment = await prisma.moment.findFirst({
      where: await getVisibleMomentWhere(result.data.momentId, profile.id),
      select: {
        authorId: true,
        id: true,
      },
    });

    if (!moment) {
      return {
        formError: copy.momentUnavailable,
        values: {
          content: result.data.content,
        },
      };
    }

    let parentAuthorId: string | null = null;

    if (result.data.parentId) {
      const parentComment = await prisma.momentComment.findFirst({
        where: {
          id: result.data.parentId,
          momentId: moment.id,
          deletedAt: null,
        },
        select: {
          authorId: true,
          id: true,
        },
      });

      if (!parentComment) {
        return {
          formError: copy.momentUnavailable,
          values: {
            content: result.data.content,
          },
        };
      }

      parentAuthorId = parentComment.authorId;
    }

    await prisma.$transaction(async (tx) => {
      const comment = await tx.momentComment.create({
        data: {
          authorId: profile.id,
          content: result.data.content,
          momentId: moment.id,
          parentId: result.data.parentId ?? null,
        },
        select: {
          id: true,
        },
      });

      commentId = comment.id;
      await tx.moment.update({
        where: {
          id: moment.id,
        },
        data: {
          commentCount: {
            increment: 1,
          },
        },
      });

      const notificationInputs: Array<{
        actorId: string;
        momentCommentId?: string;
        momentId: string;
        recipientId: string;
        type: "MOMENT_COMMENTED" | "MOMENT_COMMENT_REPLY";
      }> = [];

      if (parentAuthorId && parentAuthorId !== profile.id) {
        notificationInputs.push({
          actorId: profile.id,
          momentCommentId: comment.id,
          momentId: moment.id,
          recipientId: parentAuthorId,
          type: "MOMENT_COMMENT_REPLY",
        });
      }

      if (
        moment.authorId !== profile.id &&
        moment.authorId !== parentAuthorId
      ) {
        notificationInputs.push({
          actorId: profile.id,
          momentCommentId: comment.id,
          momentId: moment.id,
          recipientId: moment.authorId,
          type: "MOMENT_COMMENTED",
        });
      }

      await createNotifications(tx, notificationInputs);
    });

    queueAnalyticsEvent(
      {
        locale: normalizeAnalyticsLocale(result.data.locale),
        name: result.data.parentId
          ? "moment_comment_reply_created"
          : "moment_comment_created",
        route: `/${result.data.locale}/footprints`,
        entityId: moment.id,
        entityType: "moment",
        sourceSurface: "footprints",
        properties: {
          comment_id: commentId,
          is_reply: Boolean(result.data.parentId),
        },
      },
      {
        userProfileId: profile.id,
      },
    );
  } catch (error) {
    console.error("Failed to create moment comment", error);

    return {
      formError: copy.commentFailed,
      values: {
        content: result.success ? result.data.content : rawInput.content,
      },
    };
  }

  revalidateMomentSurfaces(result.data.locale);

  return {
    ok: true,
    values: {
      content: "",
    },
  };
}

export async function deleteMomentCommentAction(formData: FormData) {
  const rawInput = {
    commentId: getString(formData, "commentId"),
    locale: getString(formData, "locale") || "zh-CN",
    momentId: getString(formData, "momentId"),
  };
  const result = momentCommentMutationSchema.safeParse(rawInput);

  if (!result.success) {
    return;
  }

  const profile = await ensureCurrentUserProfile(
    result.data.locale,
    "/footprints",
  );
  const comment = await prisma.momentComment.findFirst({
    where: {
      deletedAt: null,
      id: result.data.commentId,
      momentId: result.data.momentId,
    },
    select: {
      authorId: true,
      id: true,
      moment: {
        select: {
          authorId: true,
          id: true,
        },
      },
    },
  });

  if (
    !comment ||
    (comment.authorId !== profile.id && comment.moment.authorId !== profile.id)
  ) {
    return;
  }

  await prisma.$transaction(async (tx) => {
    await tx.momentComment.update({
      where: {
        id: comment.id,
      },
      data: {
        deletedAt: new Date(),
      },
    });
    await tx.moment.updateMany({
      where: {
        commentCount: {
          gt: 0,
        },
        id: comment.moment.id,
      },
      data: {
        commentCount: {
          decrement: 1,
        },
      },
    });
  });

  queueAnalyticsEvent(
    {
      locale: normalizeAnalyticsLocale(result.data.locale),
      name: "moment_comment_deleted",
      route: `/${result.data.locale}/footprints/${result.data.momentId}`,
      entityId: result.data.momentId,
      entityType: "moment",
      sourceSurface: "footprints",
      properties: {
        comment_id: comment.id,
      },
    },
    {
      userProfileId: profile.id,
    },
  );

  revalidateMomentSurfaces(result.data.locale);
  revalidatePath(
    withLocale(result.data.locale, `/footprints/${result.data.momentId}`),
  );
}
