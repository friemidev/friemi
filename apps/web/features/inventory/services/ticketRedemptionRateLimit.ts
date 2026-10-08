import { Ratelimit } from "@upstash/ratelimit";
import { getOptionalRedis } from "@/lib/redis";
import { getRedisRuntimeConfig } from "@/lib/redisConfig";

// A valid six-character code has roughly a billion possibilities. Count both
// preview and confirmation requests while allowing busy staff to check in
// well over 100 guests per minute.
const actorAttemptsPerMinute = 300;
const localAttempts = new Map<string, { count: number; resetAt: number }>();
let actorLimiter: Ratelimit | null = null;

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

/** Bound manual guesses by the authorized staff account. */
export async function allowTicketManualCodeLookup(actorProfileId: string) {
  const redis = getOptionalRedis();
  if (redis) {
    try {
      actorLimiter ??= new Ratelimit({
        analytics: false,
        limiter: Ratelimit.fixedWindow(actorAttemptsPerMinute, "1 m"),
        prefix: `${getRedisRuntimeConfig().keyPrefix}:ratelimit:ticket-manual-actor`,
        redis,
      });
      return (await actorLimiter.limit(actorProfileId)).success;
    } catch (error) {
      console.error("Ticket manual-code rate limiter unavailable", error);
      return false;
    }
  }

  // A per-process fallback can be bypassed across production instances.
  // Keep it only for local development; QR token lookup remains available.
  if (process.env.NODE_ENV === "production") return false;
  return allowLocalAttempt(
    `actor:${actorProfileId}`,
    actorAttemptsPerMinute,
    60_000,
  );
}
