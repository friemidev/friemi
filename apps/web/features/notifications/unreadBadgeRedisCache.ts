import {
  parseUnreadBadgeCountsPayload,
  type UnreadBadgeCounts,
} from "./unreadBadgeCounts";
import { getOptionalRedis } from "@/lib/redis";
import { getRedisRuntimeConfig } from "@/lib/redisConfig";

export type UnreadBadgeRedisCacheStatus = "error" | "hit" | "miss" | "off";

function getUnreadBadgeCacheKey(profileId: string) {
  const config = getRedisRuntimeConfig();

  return `${config.keyPrefix}:unread:${profileId}`;
}

export function unreadBadgeCountsMatch(
  first: UnreadBadgeCounts,
  second: UnreadBadgeCounts,
) {
  return (
    first.unreadActivityRoomCount === second.unreadActivityRoomCount &&
    first.unreadDirectMessageCount === second.unreadDirectMessageCount &&
    first.unreadMessageCount === second.unreadMessageCount &&
    first.unreadNotificationCount === second.unreadNotificationCount &&
    first.unreadPlanetChatCount === second.unreadPlanetChatCount
  );
}

export async function getCachedUnreadBadgeCounts(profileId: string): Promise<{
  counts: UnreadBadgeCounts | null;
  status: UnreadBadgeRedisCacheStatus;
}> {
  const config = getRedisRuntimeConfig();

  if (config.unreadCacheMode === "off") {
    return { counts: null, status: "off" };
  }

  const redis = getOptionalRedis();

  if (!redis) {
    return { counts: null, status: "off" };
  }

  try {
    const cached = await redis.get<unknown>(getUnreadBadgeCacheKey(profileId));
    const counts = parseUnreadBadgeCountsPayload(cached);

    return {
      counts,
      status: counts ? "hit" : "miss",
    };
  } catch (error) {
    console.error("[redis] unread cache read failed", {
      errorName: error instanceof Error ? error.name : "UnknownError",
    });

    return { counts: null, status: "error" };
  }
}

export async function setCachedUnreadBadgeCounts(
  profileId: string,
  counts: UnreadBadgeCounts,
) {
  const config = getRedisRuntimeConfig();

  if (config.unreadCacheMode === "off") {
    return false;
  }

  const redis = getOptionalRedis();

  if (!redis) {
    return false;
  }

  try {
    await redis.set(getUnreadBadgeCacheKey(profileId), counts, {
      ex: config.unreadCacheTtlSeconds,
    });
    return true;
  } catch (error) {
    console.error("[redis] unread cache write failed", {
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
    return false;
  }
}

export async function invalidateUnreadBadgeCache(profileIds: string[]) {
  const uniqueProfileIds = Array.from(new Set(profileIds.filter(Boolean)));
  const redis = getOptionalRedis();

  if (!redis || uniqueProfileIds.length === 0) {
    return false;
  }

  try {
    await redis.del(...uniqueProfileIds.map(getUnreadBadgeCacheKey));
    return true;
  } catch (error) {
    console.error("[redis] unread cache invalidation failed", {
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
    return false;
  }
}
