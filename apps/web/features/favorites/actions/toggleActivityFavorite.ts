"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { ensureCurrentUserProfile } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withLocale } from "@/lib/routes";
import { getActivityFavoriteCopy } from "../copy";

const toggleActivityFavoriteSchema = z.object({
  activityId: z.string().min(1),
  locale: z.string().min(1).default("zh-CN"),
  redirectPath: z.string().min(1),
});

export type ToggleActivityFavoriteState = {
  formError?: string;
};

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function isPrismaUniqueError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

export async function toggleActivityFavoriteAction(
  _previousState: ToggleActivityFavoriteState,
  formData: FormData,
): Promise<ToggleActivityFavoriteState> {
  const fallbackLocale = getString(formData, "locale") || "zh-CN";
  const fallbackCopy = getActivityFavoriteCopy(fallbackLocale);
  const result = toggleActivityFavoriteSchema.safeParse({
    activityId: getString(formData, "activityId"),
    locale: fallbackLocale,
    redirectPath: getString(formData, "redirectPath"),
  });

  if (!result.success) {
    return {
      formError: fallbackCopy.invalidRequest,
    };
  }

  const { activityId, locale, redirectPath } = result.data;
  const t = getActivityFavoriteCopy(locale);
  const viewerProfile = await ensureCurrentUserProfile(locale);
  const activity = await prisma.activity.findFirst({
    where: {
      id: activityId,
      visibility: "PUBLIC",
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
      formError: t.activityUnavailable,
    };
  }

  const existingFavorite = await prisma.activityFavorite.findUnique({
    where: {
      activityId_userProfileId: {
        activityId,
        userProfileId: viewerProfile.id,
      },
    },
    select: {
      id: true,
    },
  });

  try {
    if (existingFavorite) {
      await prisma.activityFavorite.delete({
        where: {
          id: existingFavorite.id,
        },
      });
    } else {
      await prisma.activityFavorite.create({
        data: {
          activityId,
          userProfileId: viewerProfile.id,
        },
      });
    }
  } catch (error) {
    if (!isPrismaUniqueError(error)) {
      throw error;
    }
  }

  const localizedPath = withLocale(locale, redirectPath);
  revalidatePath(localizedPath);
  revalidatePath(withLocale(locale, "/profile"));
  redirect(localizedPath);
}
