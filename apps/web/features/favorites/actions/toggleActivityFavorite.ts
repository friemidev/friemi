"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { ensureCurrentUserProfile, requireUser } from "@/lib/auth";
import { hasClerkKeys } from "@/lib/clerk";
import { prisma } from "@/lib/prisma";
import { withLocale } from "@/lib/routes";

const toggleActivityFavoriteSchema = z.object({
  activityId: z.string().min(1),
  locale: z.string().min(1).default("zh-CN"),
  redirectPath: z.string().min(1),
});

export type ToggleActivityFavoriteState = {
  formError?: string;
  isFavorited?: boolean;
  ok?: boolean;
  updatedAt?: number;
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

async function getViewerProfileId(locale: string) {
  const clerkUserId = await requireUser(locale);

  if (!hasClerkKeys()) {
    return ensureCurrentUserProfile(locale).then((profile) => profile.id);
  }

  const existingProfile = await prisma.userProfile.findUnique({
    where: {
      clerkUserId,
    },
    select: {
      id: true,
    },
  });

  if (existingProfile) {
    return existingProfile.id;
  }

  return ensureCurrentUserProfile(locale).then((profile) => profile.id);
}

export async function toggleActivityFavoriteAction(
  _previousState: ToggleActivityFavoriteState,
  formData: FormData,
): Promise<ToggleActivityFavoriteState> {
  const fallbackLocale = getString(formData, "locale") || "zh-CN";
  const fallbackCommonT = await getTranslations({
    locale: fallbackLocale,
    namespace: "favorites.common",
  });
  const result = toggleActivityFavoriteSchema.safeParse({
    activityId: getString(formData, "activityId"),
    locale: fallbackLocale,
    redirectPath: getString(formData, "redirectPath"),
  });

  if (!result.success) {
    return {
      formError: fallbackCommonT("invalidRequest"),
    };
  }

  const { activityId, locale, redirectPath } = result.data;
  const activityT = await getTranslations({
    locale,
    namespace: "favorites.activity",
  });
  const viewerProfileId = await getViewerProfileId(locale);
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
      formError: activityT("unavailable"),
    };
  }

  const existingFavorite = await prisma.activityFavorite.findUnique({
    where: {
      activityId_userProfileId: {
        activityId,
        userProfileId: viewerProfileId,
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
          userProfileId: viewerProfileId,
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

  return {
    formError: undefined,
    isFavorited: !existingFavorite,
    ok: true,
    updatedAt: Date.now(),
  };
}
