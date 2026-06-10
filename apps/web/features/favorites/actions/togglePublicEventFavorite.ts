"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import {
  createLatencyTimer,
  recordOperationLatency,
} from "@/features/analytics/latency";
import {
  analyticsSourceSurfaces,
  type AnalyticsSourceSurface,
} from "@/features/analytics/events";
import { ensureCurrentUserProfile, requireUser } from "@/lib/auth";
import { hasClerkKeys } from "@/lib/clerk";
import { getPublicEventFavoriteDelegate, prisma } from "@/lib/prisma";
import { withLocale } from "@/lib/routes";

const togglePublicEventFavoriteSchema = z.object({
  locale: z.string().min(1).default("zh-CN"),
  publicEventId: z.string().min(1),
  redirectPath: z.string().min(1),
  sourceSurface: z.enum(analyticsSourceSurfaces).default("public_event_detail"),
});

export type TogglePublicEventFavoriteState = {
  favoriteCount?: number;
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

function getFavoriteSourceSurface(
  value: string,
  fallback: AnalyticsSourceSurface,
) {
  const result = z.enum(analyticsSourceSurfaces).safeParse(value);

  return result.success ? result.data : fallback;
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
  const getDurationMs = createLatencyTimer();
  const fallbackLocale = getString(formData, "locale") || "zh-CN";
  const rawPublicEventId = getString(formData, "publicEventId");
  const rawRedirectPath = getString(formData, "redirectPath") || "/activities";
  const sourceSurface = getFavoriteSourceSurface(
    getString(formData, "sourceSurface"),
    "public_event_detail",
  );
  const recordLatency = ({
    status,
    statusReason,
    userProfileId,
  }: {
    status: "failed" | "success";
    statusReason?: string | null;
    userProfileId?: string | null;
  }) => {
    recordOperationLatency({
      durationMs: getDurationMs(),
      entityId: rawPublicEventId || undefined,
      entityType: rawPublicEventId ? "public_event" : undefined,
      locale: fallbackLocale,
      operationKey: "favorite_toggle",
      route: withLocale(fallbackLocale, rawRedirectPath),
      sourceSurface,
      status,
      statusReason,
      userProfileId,
      properties: {
        target_type: "public_event",
      },
    });
  };
  const fallbackCommonT = await getTranslations({
    locale: fallbackLocale,
    namespace: "favorites.common",
  });
  const result = togglePublicEventFavoriteSchema.safeParse({
    locale: fallbackLocale,
    publicEventId: rawPublicEventId,
    redirectPath: rawRedirectPath,
    sourceSurface,
  });

  if (!result.success) {
    recordLatency({
      status: "failed",
      statusReason: "invalid_request",
    });

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
    recordLatency({
      status: "failed",
      statusReason: "favorite_store_unavailable",
      userProfileId: viewerProfileId,
    });

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
    recordLatency({
      status: "failed",
      statusReason: "public_event_unavailable",
      userProfileId: viewerProfileId,
    });

    return {
      formError: publicEventT("unavailable"),
    };
  }

  if (!existingFavorite && publicEvent.status !== "SCHEDULED") {
    recordLatency({
      status: "failed",
      statusReason: "public_event_unavailable",
      userProfileId: viewerProfileId,
    });

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
      recordLatency({
        status: "failed",
        statusReason: "toggle_failed",
        userProfileId: viewerProfileId,
      });

      throw error;
    }
  }

  const favoriteCount = await publicEventFavorite.count({
    where: {
      publicEventId,
    },
  });

  const localizedPath = withLocale(locale, redirectPath);
  revalidatePath(localizedPath);
  revalidatePath(withLocale(locale, "/profile"));
  revalidatePath(withLocale(locale, "/lobby"));
  recordLatency({
    status: "success",
    userProfileId: viewerProfileId,
  });

  return {
    favoriteCount,
    formError: undefined,
    isFavorited: !existingFavorite,
    ok: true,
    updatedAt: Date.now(),
  };
}
