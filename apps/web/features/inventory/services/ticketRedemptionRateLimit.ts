import { Ratelimit } from "@upstash/ratelimit";
import { getOptionalRedis } from "@/lib/redis";
import { getRedisRuntimeConfig } from "@/lib/redisConfig";

const actorAttemptsPerMinute = 20;
const holderAttemptsPerTenMinutes = 4;
const localAttempts = new Map<string, { count: number; resetAt: number }>();
let actorLimiter: Ratelimit | null = null;
let holderLimiter: Ratelimit | null = null;

function allowLocalAttempt(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const current = localAttempts.get(key);
  if (!current || current.resetAt <= now) {
    localAttempts.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (current.count >= limit) return false;
  current.count += 1;
  return true;
}

/** Manual codes require both an event and a holder and have separate budgets. */
export async function allowTicketManualCodeLookup(
  actorProfileId: string,
  definitionId: string,
  holderFriendCode: string,
) {
  const holderKey = `${actorProfileId}:${definitionId}:${holderFriendCode}`;
  const redis = getOptionalRedis();
  if (redis) {
    try {
      actorLimiter ??= new Ratelimit({
        analytics: false,
        limiter: Ratelimit.fixedWindow(actorAttemptsPerMinute, "1 m"),
        prefix: `${getRedisRuntimeConfig().keyPrefix}:ratelimit:ticket-manual-actor`,
        redis,
      });
      holderLimiter ??= new Ratelimit({
        analytics: false,
        limiter: Ratelimit.fixedWindow(holderAttemptsPerTenMinutes, "10 m"),
        prefix: `${getRedisRuntimeConfig().keyPrefix}:ratelimit:ticket-manual-holder`,
        redis,
      });
      if (!(await actorLimiter.limit(actorProfileId)).success) return false;
      return (await holderLimiter.limit(holderKey)).success;
    } catch (error) {
      console.error("Ticket manual-code rate limiter unavailable", error);
      return false;
    }
  }

  // A per-process fallback can be bypassed across production instances.
  // Keep it only for local development; QR token lookup remains available.
  if (process.env.NODE_ENV === "production") return false;
  return (
    allowLocalAttempt(
      `actor:${actorProfileId}`,
      actorAttemptsPerMinute,
      60_000,
    ) &&
    allowLocalAttempt(
      `holder:${holderKey}`,
      holderAttemptsPerTenMinutes,
      600_000,
    )
  );
}
