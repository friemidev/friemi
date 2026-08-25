import { Ratelimit, type Duration } from "@upstash/ratelimit";
import { getOptionalRedis } from "./redis";
import { getRedisRuntimeConfig } from "./redisConfig";

type DistributedRateLimitOptions = {
  identifier: string;
  limit: number;
  scope: string;
  window: Duration;
};

export type DistributedRateLimitResult = {
  allowed: boolean;
  available: boolean;
  limit: number;
  mode: "enforce" | "off" | "shadow";
  remaining: number;
  resetAt: number | null;
};

const limiterCache = new Map<string, Ratelimit>();

function getLimiter({
  limit,
  scope,
  window,
}: Omit<DistributedRateLimitOptions, "identifier">) {
  const config = getRedisRuntimeConfig();
  const redis = getOptionalRedis();

  if (!redis) {
    return null;
  }

  const cacheKey = `${scope}:${limit}:${window}`;
  const existing = limiterCache.get(cacheKey);

  if (existing) {
    return existing;
  }

  const limiter = new Ratelimit({
    analytics: false,
    limiter: Ratelimit.fixedWindow(limit, window),
    prefix: `${config.keyPrefix}:ratelimit:${scope}`,
    redis,
    timeout: config.rateLimitTimeoutMs,
  });
  limiterCache.set(cacheKey, limiter);

  return limiter;
}

export async function checkDistributedRateLimit({
  identifier,
  limit,
  scope,
  window,
}: DistributedRateLimitOptions): Promise<DistributedRateLimitResult> {
  const config = getRedisRuntimeConfig();

  if (config.rateLimitMode === "off") {
    return {
      allowed: true,
      available: false,
      limit,
      mode: "off",
      remaining: limit,
      resetAt: null,
    };
  }

  const limiter = getLimiter({ limit, scope, window });

  if (!limiter) {
    return {
      allowed: true,
      available: false,
      limit,
      mode: "off",
      remaining: limit,
      resetAt: null,
    };
  }

  try {
    const result = await limiter.limit(identifier);
    const blocked = !result.success;

    if (config.rateLimitMode === "shadow" && blocked) {
      console.warn("[redis-shadow] rate limit would block", { scope });
    }

    return {
      allowed: config.rateLimitMode !== "enforce" || result.success,
      available: true,
      limit: result.limit,
      mode: config.rateLimitMode,
      remaining: result.remaining,
      resetAt: result.reset,
    };
  } catch (error) {
    console.error("[redis] rate limit unavailable", {
      errorName: error instanceof Error ? error.name : "UnknownError",
      scope,
    });

    return {
      allowed: true,
      available: false,
      limit,
      mode: config.rateLimitMode,
      remaining: limit,
      resetAt: null,
    };
  }
}

export function getRateLimitResponseHeaders(
  result: DistributedRateLimitResult,
) {
  const retryAfterSeconds = result.resetAt
    ? Math.max(1, Math.ceil((result.resetAt - Date.now()) / 1_000))
    : 1;

  return {
    "Cache-Control": "private, no-store",
    "Retry-After": String(retryAfterSeconds),
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(Math.max(0, result.remaining)),
  };
}
