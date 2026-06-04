"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { ensureCurrentUserProfile, requireUser } from "@/lib/auth";
import { hasClerkKeys } from "@/lib/clerk";
import { getPublicEventFavoriteDelegate, prisma } from "@/lib/prisma";
import { withLocale } from "@/lib/routes";

const togglePublicEventFavoriteSchema = z.object({
  locale: z.string().min(1).default("zh-CN"),
  publicEventId: z.string().min(1),
  redirectPath: z.string().min(1),
});

export type TogglePublicEventFavoriteState = {
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

export async function togglePublicEventFavoriteAction(
  _previousState: TogglePublicEventFavoriteState,
  formData: FormData,
): Promise<TogglePublicEventFavoriteState> {
  const fallbackLocale = getString(formData, "locale") || "zh-CN";
  const fallbackCommonT = await getTranslations({
    locale: fallbackLocale,
    namespace: "favorites.common",
  });
  const result = togglePublicEventFavoriteSchema.safeParse({
    locale: fallbackLocale,
    publicEventId: getString(formData, "publicEventId"),
    redirectPath: getString(formData, "redirectPath"),
  });

  if (!result.success) {
    return {
      formError: fallbackCommonT("invalidRequest"),
    };
  }

  const { locale, publicEventId, redirectPath } = result.data;
  const publicEventT = await getTranslations({
    locale,
    namespace: "favorites.publicEvent",
  });
  const publicEventFavorite = getPublicEventFavoriteDelegate();
  const viewerProfileId = await getViewerProfileId(locale);
  if (!publicEventFavorite) {
    return {
      formError: publicEventT("unavailable"),
    };
  }

  const existingFavorite = (await publicEventFavorite.findUnique({
    where: {
      publicEventId_userProfileId: {
        publicEventId,
        userProfileId: viewerProfileId,
      },
    },
    select: {
      id: true,
    },
  })) as { id: string } | null;
  const publicEvent = await prisma.publicEvent.findFirst({
    where: {
      id: publicEventId,
      visibility: "PUBLIC",
    },
    select: {
      id: true,
      status: true,
    },
  });

  if (!publicEvent) {
    return {
      formError: publicEventT("unavailable"),
    };
  }

  if (!existingFavorite && publicEvent.status !== "SCHEDULED") {
    return {
      formError: publicEventT("unavailable"),
    };
  }

  try {
    if (existingFavorite) {
      await publicEventFavorite.delete({
        where: {
          id: existingFavorite.id,
        },
      });
    } else {
      await publicEventFavorite.create({
        data: {
          publicEventId,
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
  revalidatePath(withLocale(locale, "/lobby"));

  return {
    formError: undefined,
    isFavorited: !existingFavorite,
    ok: true,
    updatedAt: Date.now(),
  };
}
