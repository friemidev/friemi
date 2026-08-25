import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getUnreadActivityRoomTotalMessageCount } from "@/features/activity-room-chat/services/activityRoomChat";
import { getUnreadDirectMessageCount } from "@/features/direct-messages/queries/getDirectMessages";
import { getUnreadNotificationCount } from "@/features/notifications/queries/getNotifications";
import { getUnreadOfficialMessageCount } from "@/features/official-messages/services/officialMessages";
import { createUnreadBadgeCounts } from "@/features/notifications/unreadBadgeCounts";
import {
  getCachedUnreadBadgeCounts,
  setCachedUnreadBadgeCounts,
  unreadBadgeCountsMatch,
} from "@/features/notifications/unreadBadgeRedisCache";
import { getUnreadPlanetChatTotalMessageCount } from "@/features/planets/services/planetChat";
import { withApiRequestMetrics } from "@/lib/apiRequestMetrics";
import { getOptionalCurrentUserProfileSnapshot } from "@/lib/auth";
import { hasClerkKeys } from "@/lib/clerk";
import { prisma } from "@/lib/prisma";
import { getRedisRuntimeConfig } from "@/lib/redisConfig";

export const dynamic = "force-dynamic";

const noStoreHeaders = {
  "Cache-Control": "private, no-cache, no-store, max-age=0, must-revalidate",
};

async function getViewerProfileId() {
  if (!hasClerkKeys()) {
    const localProfile = await getOptionalCurrentUserProfileSnapshot();

    return localProfile?.id ?? null;
  }

  const { userId } = await auth();

  if (!userId) {
    return null;
  }

  const profile = await prisma.userProfile.findUnique({
    where: {
      clerkUserId: userId,
    },
    select: {
      id: true,
      status: true,
    },
  });

  return profile?.status === "ACTIVE" ? profile.id : null;
}

async function loadUnreadBadgeCounts(profileId: string) {
  const [
    unreadNotificationCount,
    unreadDirectMessageCount,
    unreadOfficialMessageCount,
    unreadActivityRoomCount,
    unreadPlanetChatCount,
  ] = await Promise.all([
    getUnreadNotificationCount(profileId),
    getUnreadDirectMessageCount(profileId),
    getUnreadOfficialMessageCount(profileId),
    getUnreadActivityRoomTotalMessageCount(profileId),
    getUnreadPlanetChatTotalMessageCount(profileId),
  ]);

  return createUnreadBadgeCounts({
    unreadActivityRoomCount,
    unreadDirectMessageCount:
      unreadDirectMessageCount + unreadOfficialMessageCount,
    unreadNotificationCount,
    unreadPlanetChatCount,
  });
}

async function loadUnreadBadgeCountsWithRedis(profileId: string) {
  const config = getRedisRuntimeConfig();
  const cached = await getCachedUnreadBadgeCounts(profileId);

  if (config.unreadCacheMode === "serve" && cached.counts) {
    return {
      cacheStatus: "hit",
      counts: cached.counts,
    };
  }

  const counts = await loadUnreadBadgeCounts(profileId);

  if (config.unreadCacheMode === "shadow") {
    console.info("[redis-shadow] unread cache", {
      cacheStatus: cached.status,
      matchesDatabase: cached.counts
        ? unreadBadgeCountsMatch(cached.counts, counts)
        : null,
    });
  }

  await setCachedUnreadBadgeCounts(profileId, counts);

  return {
    cacheStatus:
      config.unreadCacheMode === "off"
        ? "off"
        : config.unreadCacheMode === "shadow"
          ? `shadow-${cached.status}`
          : cached.status,
    counts,
  };
}

export async function GET(request: Request) {
  return withApiRequestMetrics(
    request,
    "/api/navigation/unread-counts",
    async ({ requestId }) => {
      try {
        const profileId = await getViewerProfileId();

        if (!profileId) {
          return NextResponse.json(
            {
              ...createUnreadBadgeCounts({
                unreadActivityRoomCount: 0,
                unreadDirectMessageCount: 0,
                unreadNotificationCount: 0,
                unreadPlanetChatCount: 0,
              }),
              requestId,
              updatedAt: new Date().toISOString(),
            },
            { headers: noStoreHeaders, status: 401 },
          );
        }

        const { cacheStatus, counts } =
          await loadUnreadBadgeCountsWithRedis(profileId);

        return NextResponse.json(
          {
            ...counts,
            requestId,
            updatedAt: new Date().toISOString(),
          },
          {
            headers: {
              ...noStoreHeaders,
              "X-Friemi-Unread-Cache": cacheStatus,
            },
          },
        );
      } catch (error) {
        console.error("Failed to load navigation unread counts", error);

        return NextResponse.json(
          {
            error: "UNREAD_COUNTS_UNAVAILABLE",
            requestId,
            updatedAt: new Date().toISOString(),
          },
          { headers: noStoreHeaders, status: 503 },
        );
      }
    },
  );
}
