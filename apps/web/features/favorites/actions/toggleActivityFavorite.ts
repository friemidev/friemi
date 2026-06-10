"use server";
import { getTranslations } from "next-intl/server";
import { Prisma, type ParticipantStatus } from "@prisma/client";
import { z } from "zod";
import {
  createLatencyTimer,
  recordOperationLatency,
} from "@/features/analytics/latency";
import {
  analyticsSourceSurfaces,
  type AnalyticsSourceSurface,
} from "@/features/analytics/events";
import { getViewerFriendIds } from "@/features/friends/queries/getViewerFriendIds";
import { publicActivityVisibility } from "@/features/activities/queries/getActivities";
import { ensureCurrentUserProfile, requireUser } from "@/lib/auth";
import { hasClerkKeys } from "@/lib/clerk";
import { createActionPerformanceTracker } from "@/lib/performance";
import { prisma } from "@/lib/prisma";
import { withLocale } from "@/lib/routes";

const toggleActivityFavoriteSchema = z.object({
  activityId: z.string().min(1),
  locale: z.string().min(1).default("zh-CN"),
  redirectPath: z.string().min(1),
  sourceSurface: z.enum(analyticsSourceSurfaces).default("activity_detail"),
});
const favoriteVisibleParticipationStatuses: ParticipantStatus[] = [
  "JOINED",
  "APPROVED",
  "PENDING",
];

export type ToggleActivityFavoriteState = {
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

export async function toggleActivityFavoriteAction(
  _previousState: ToggleActivityFavoriteState,
  formData: FormData,
): Promise<ToggleActivityFavoriteState> {
  const getDurationMs = createLatencyTimer();
  const fallbackLocale = getString(formData, "locale") || "zh-CN";
  const rawActivityId = getString(formData, "activityId");
  const rawRedirectPath = getString(formData, "redirectPath") || "/activities";
  const sourceSurface = getFavoriteSourceSurface(
    getString(formData, "sourceSurface"),
    "activity_detail",
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
      entityId: rawActivityId || undefined,
      entityType: rawActivityId ? "activity" : undefined,
      locale: fallbackLocale,
      operationKey: "favorite_toggle",
      route: withLocale(fallbackLocale, rawRedirectPath),
      sourceSurface,
      status,
      statusReason,
      userProfileId,
      properties: {
        target_type: "activity",
      },
    });
  };
  const result = toggleActivityFavoriteSchema.safeParse({
    activityId: rawActivityId,
    locale: fallbackLocale,
    redirectPath: rawRedirectPath,
    sourceSurface,
  });
  const perf = createActionPerformanceTracker({
    action: "toggle_activity_favorite",
    metadata: {
      locale: fallbackLocale,
      sourceSurface,
      targetId: rawActivityId || undefined,
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

  const { activityId, locale, redirectPath } = result.data;
  const [viewerProfileId, activity] = await Promise.all([
    perf.measure("viewer_profile", () => getViewerProfileId(locale)),
    perf.measure("activity_lookup", () =>
      prisma.activity.findFirst({
      where: {
        id: activityId,
        organizer: {
          status: "ACTIVE",
        },
      },
      select: {
        id: true,
        organizerId: true,
        visibility: true,
      },
      }),
    ),
  ]);

  if (!activity) {
    const activityT = await getTranslations({
      locale,
      namespace: "favorites.activity",
    });

    recordLatency({
      status: "failed",
      statusReason: "activity_unavailable",
      userProfileId: viewerProfileId,
    });

    return {
      formError: activityT("unavailable"),
    };
  }

  const isAccessible = await perf.measure("access_check", async () => {
    if (
      activity.visibility === "PUBLIC" ||
      activity.organizerId === viewerProfileId
    ) {
      return true;
    }

    const participation = await prisma.activityParticipant.findUnique({
      where: {
        activityId_userProfileId: {
          activityId,
          userProfileId: viewerProfileId,
        },
      },
      select: {
        status: true,
      },
    });

    if (
      participation &&
      favoriteVisibleParticipationStatuses.includes(participation.status)
    ) {
      return true;
    }

    const friendIds = await getViewerFriendIds(viewerProfileId);
    return friendIds.includes(activity.organizerId);
  });

  if (!isAccessible) {
    const activityT = await getTranslations({
      locale,
      namespace: "favorites.activity",
    });

    recordLatency({
      status: "failed",
      statusReason: "activity_unavailable",
      userProfileId: viewerProfileId,
    });

    return {
      formError: activityT("unavailable"),
    };
  }

  let isFavorited = false;

  try {
    await perf.measure("favorite_write", async () => {
      try {
        await prisma.activityFavorite.create({
          data: {
            activityId,
            userProfileId: viewerProfileId,
          },
        });
        isFavorited = true;
      } catch (error) {
        if (!isPrismaUniqueError(error)) {
          throw error;
        }

        await prisma.activityFavorite.delete({
          where: {
            activityId_userProfileId: {
              activityId,
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
