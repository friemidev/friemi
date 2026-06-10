"use server";

import { revalidatePath } from "next/cache";
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
  const fallbackCommonT = await getTranslations({
    locale: fallbackLocale,
    namespace: "favorites.common",
  });
  const result = toggleActivityFavoriteSchema.safeParse({
    activityId: rawActivityId,
    locale: fallbackLocale,
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

  const { activityId, locale, redirectPath } = result.data;
  const activityT = await getTranslations({
    locale,
    namespace: "favorites.activity",
  });
  const viewerProfileId = await getViewerProfileId(locale);
  const friendIds = await getViewerFriendIds(viewerProfileId);
  const activity = await prisma.activity.findFirst({
    where: {
      id: activityId,
      organizer: {
        status: "ACTIVE",
      },
      OR: [
        {
          visibility: {
            in: publicActivityVisibility,
          },
        },
        {
          organizerId: viewerProfileId,
        },
        {
          participants: {
            some: {
              userProfileId: viewerProfileId,
              status: {
                in: favoriteVisibleParticipationStatuses,
              },
            },
          },
        },
        ...(friendIds.length > 0
          ? [
              {
                AND: [
                  { visibility: "PRIVATE" as const },
                  { organizerId: { in: friendIds } },
                ],
              },
            ]
          : []),
      ],
    },
    select: {
      id: true,
    },
  });

  if (!activity) {
    recordLatency({
      status: "failed",
      statusReason: "activity_unavailable",
      userProfileId: viewerProfileId,
    });

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
      recordLatency({
        status: "failed",
        statusReason: "toggle_failed",
        userProfileId: viewerProfileId,
      });

      throw error;
    }
  }

  const favoriteCount = await prisma.activityFavorite.count({
    where: {
      activityId,
    },
  });

  const localizedPath = withLocale(locale, redirectPath);
  revalidatePath(localizedPath);
  revalidatePath(withLocale(locale, "/profile"));
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
