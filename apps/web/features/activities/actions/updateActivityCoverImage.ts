"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";
import { OPEN_LOBBY_ACTIVITIES_TAG } from "@/features/activities/queries/getActivityLobby";
import { isLegacyActivityInfoSource } from "@/features/activities/queries/getActivities";
import { ensureCurrentUserProfileSnapshot } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withLocale } from "@/lib/routes";

const maxCoverImageUrlLength = 2048;

const updateActivityCoverImageSchema = z.object({
  activityId: z.string().min(1),
  coverImageUrl: z
    .string()
    .trim()
    .max(maxCoverImageUrlLength)
    .refine(
      (value) => {
        if (!value) {
          return true;
        }

        try {
          const url = new URL(value);

          return url.protocol === "https:" || url.protocol === "http:";
        } catch {
          return false;
        }
      },
      {
        message: "INVALID_COVER_URL",
      },
    ),
  locale: z.string().min(1).default("zh-CN"),
});

export type UpdateActivityCoverImageState = {
  coverImageUrl?: string | null;
  formError?: string;
  success?: boolean;
};

function getString(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" ? value : "";
}

function getCoverImageCopy(locale: string) {
  if (locale === "fr") {
    return {
      failed: "Impossible de mettre à jour l'image pour le moment.",
      forbidden: "Seul l'organisateur peut modifier cette image.",
      invalid: "Choisissez une image importée valide.",
      unavailable: "Ce plan n'est plus disponible.",
    };
  }

  if (locale === "en") {
    return {
      failed: "Could not update the cover image right now.",
      forbidden: "Only the organizer can update this image.",
      invalid: "Choose a valid uploaded image.",
      unavailable: "This plan is no longer available.",
    };
  }

  return {
    failed: "暂时无法更新预览图，请稍后重试。",
    forbidden: "只有组局发起人可以修改这张预览图。",
    invalid: "请选择有效的已上传图片。",
    unavailable: "这个组局当前不可用。",
  };
}

export async function updateActivityCoverImageAction(
  _previousState: UpdateActivityCoverImageState,
  formData: FormData,
): Promise<UpdateActivityCoverImageState> {
  const rawInput = {
    activityId: getString(formData, "activityId"),
    coverImageUrl: getString(formData, "coverImageUrl"),
    locale: getString(formData, "locale") || "zh-CN",
  };
  const copy = getCoverImageCopy(rawInput.locale);
  const result = updateActivityCoverImageSchema.safeParse(rawInput);

  if (!result.success) {
    return {
      formError: copy.invalid,
    };
  }

  const profile = await ensureCurrentUserProfileSnapshot(
    result.data.locale,
    `/activities/${result.data.activityId}`,
  );
  const activity = await prisma.activity.findUnique({
    where: {
      id: result.data.activityId,
    },
    select: {
      id: true,
      externalId: true,
      externalSource: true,
      externalUrl: true,
      importedAt: true,
      organizerId: true,
      publicEventId: true,
      source: true,
      sourcePayload: true,
      sourceUrl: true,
      type: true,
    },
  });

  if (
    !activity ||
    activity.type === "PUBLIC_EVENT" ||
    isLegacyActivityInfoSource(activity)
  ) {
    return {
      formError: copy.unavailable,
    };
  }

  if (activity.organizerId !== profile.id && profile.role !== "ADMIN") {
    return {
      formError: copy.forbidden,
    };
  }

  const coverImageUrl = result.data.coverImageUrl || null;

  try {
    await prisma.activity.update({
      where: {
        id: activity.id,
      },
      data: {
        coverImageUrl,
      },
    });
  } catch (error) {
    console.error("Failed to update activity cover image", error);

    return {
      formError: copy.failed,
    };
  }

  revalidatePath(withLocale(result.data.locale, `/activities/${activity.id}`));
  revalidatePath(withLocale(result.data.locale, "/activities"));
  revalidatePath(withLocale(result.data.locale, "/lobby"));
  revalidatePath(withLocale(result.data.locale, "/profile"));
  revalidatePath(withLocale(result.data.locale, "/search"));
  revalidatePath(withLocale(result.data.locale, "/"), "layout");
  revalidateTag(OPEN_LOBBY_ACTIVITIES_TAG);

  return {
    coverImageUrl,
    success: true,
  };
}
