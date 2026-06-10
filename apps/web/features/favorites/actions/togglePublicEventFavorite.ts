"use server";
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
import { createActionPerformanceTracker } from "@/lib/performance";
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
  const result = togglePublicEventFavoriteSchema.safeParse({
    locale: fallbackLocale,
    publicEventId: rawPublicEventId,
    redirectPath: rawRedirectPath,
    sourceSurface,
  });
  const perf = createActionPerformanceTracker({
    action: "toggle_public_event_favorite",
    metadata: {
      locale: fallbackLocale,
      sourceSurface,
      targetId: rawPublicEventId || undefined,
    },
  });

  if (!result.success) {
    const fallbackCommonT = await getTranslations({
      locale: fallbackLocale,
      namespace: "favorites.common",
    });

    recordLatency({
      status: "failed",
      statusReason: "invalid_request",
    });

    return {
      formError: fallbackCommonT("invalidRequest"),
    };
  }

  const { locale, publicEventId, redirectPath } = result.data;
  const publicEventFavorite = getPublicEventFavoriteDelegate();
  const [viewerProfileId, publicEvent] = await Promise.all([
    perf.measure("viewer_profile", () => getViewerProfileId(locale)),
    perf.measure("public_event_lookup", () =>
      prisma.publicEvent.findFirst({
      where: {
        id: publicEventId,
        visibility: "PUBLIC",
      },
      select: {
        id: true,
        status: true,
      },
      }),
    ),
  ]);

  if (!publicEventFavorite) {
    const publicEventT = await getTranslations({
      locale,
      namespace: "favorites.publicEvent",
    });

    recordLatency({
      status: "failed",
      statusReason: "favorite_store_unavailable",
      userProfileId: viewerProfileId,
    });

    return {
      formError: publicEventT("unavailable"),
    };
  }

  if (!publicEvent) {
    const publicEventT = await getTranslations({
      locale,
      namespace: "favorites.publicEvent",
    });

    recordLatency({
      status: "failed",
      statusReason: "public_event_unavailable",
      userProfileId: viewerProfileId,
    });

    return {
      formError: publicEventT("unavailable"),
    };
  }

  if (publicEvent.status !== "SCHEDULED") {
    const existingFavorite = (await perf.measure(
      "existing_favorite_lookup",
      () =>
        publicEventFavorite.findUnique({
          where: {
            publicEventId_userProfileId: {
              publicEventId,
              userProfileId: viewerProfileId,
            },
          },
          select: {
            id: true,
          },
        }),
    )) as { id: string } | null;

    if (!existingFavorite) {
      const publicEventT = await getTranslations({
        locale,
        namespace: "favorites.publicEvent",
      });

      recordLatency({
        status: "failed",
        statusReason: "public_event_unavailable",
        userProfileId: viewerProfileId,
      });

      return {
        formError: publicEventT("unavailable"),
      };
    }

    await perf.measure("favorite_write", () =>
      publicEventFavorite.delete({
        where: {
          id: existingFavorite.id,
        },
      }),
    );

    recordLatency({
      status: "success",
      userProfileId: viewerProfileId,
    });
    perf.finish({
      isFavorited: false,
      result: "success",
      userProfileId: viewerProfileId,
    });

    return {
      formError: undefined,
      isFavorited: false,
      ok: true,
      updatedAt: Date.now(),
    };
  }

  let isFavorited = false;

  try {
    await perf.measure("favorite_write", async () => {
      try {
        await publicEventFavorite.create({
          data: {
            publicEventId,
            userProfileId: viewerProfileId,
          },
        });
        isFavorited = true;
      } catch (error) {
        if (!isPrismaUniqueError(error)) {
          throw error;
        }

        await publicEventFavorite.delete({
          where: {
            publicEventId_userProfileId: {
              publicEventId,
              userProfileId: viewerProfileId,
            },
          },
        });
        isFavorited = false;
      }
    });
  } catch (error) {
    recordLatency({
      status: "failed",
      statusReason: "toggle_failed",
      userProfileId: viewerProfileId,
    });
    perf.finish({
      result: "failed",
      statusReason: "toggle_failed",
      userProfileId: viewerProfileId,
    });

    throw error;
  }

  recordLatency({
    status: "success",
    userProfileId: viewerProfileId,
  });
  perf.finish({
    isFavorited,
    result: "success",
    userProfileId: viewerProfileId,
  });

  return {
    formError: undefined,
    isFavorited,
    ok: true,
    updatedAt: Date.now(),
  };
}
