export type RedisRateLimitMode = "enforce" | "off" | "shadow";
export type RedisUnreadCacheMode = "off" | "serve" | "shadow";

type RedisEnvironment = Record<string, string | undefined>;

const DEFAULT_KEY_PREFIX = "friemi:v2";
const DEFAULT_RATE_LIMIT_TIMEOUT_MS = 400;
const DEFAULT_UNREAD_CACHE_TTL_SECONDS = 30;

function normalizeRateLimitMode(value?: string): RedisRateLimitMode {
  const normalized = value?.trim().toLowerCase();

  return normalized === "shadow" || normalized === "enforce"
    ? normalized
    : "off";
}

function normalizeUnreadCacheMode(value?: string): RedisUnreadCacheMode {
  const normalized = value?.trim().toLowerCase();

  return normalized === "shadow" || normalized === "serve" ? normalized : "off";
}

function getBoundedInteger(
  value: string | undefined,
  fallback: number,
  minimum: number,
  maximum: number,
) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.max(minimum, Math.min(maximum, Math.floor(parsed)));
}

function normalizeKeyPrefix(value?: string) {
  const normalized = value?.trim();

  if (!normalized || !/^[A-Za-z0-9:_-]{1,48}$/.test(normalized)) {
    return DEFAULT_KEY_PREFIX;
  }

  return normalized.replace(/:+$/, "");
}

function getFirstNonEmpty(...values: Array<string | undefined>) {
  for (const value of values) {
    const normalized = value?.trim();

    if (normalized) {
      return normalized;
    }
  }

  return "";
}

export function getRedisRuntimeConfig(
  environment: RedisEnvironment = process.env,
) {
  const url = getFirstNonEmpty(
    environment.UPSTASH_REDIS_REST_URL,
    environment.KV_REST_API_URL,
  );
  const token = getFirstNonEmpty(
    environment.UPSTASH_REDIS_REST_TOKEN,
    environment.KV_REST_API_TOKEN,
  );
  const configured = Boolean(url && token);

  return {
    configured,
    keyPrefix: normalizeKeyPrefix(environment.REDIS_KEY_PREFIX),
    rateLimitMode: configured
      ? normalizeRateLimitMode(environment.REDIS_RATE_LIMIT_MODE)
      : ("off" as const),
    rateLimitTimeoutMs: getBoundedInteger(
      environment.REDIS_RATE_LIMIT_TIMEOUT_MS,
      DEFAULT_RATE_LIMIT_TIMEOUT_MS,
      100,
      2_000,
    ),
    token,
    unreadCacheMode: configured
      ? normalizeUnreadCacheMode(environment.REDIS_UNREAD_CACHE_MODE)
      : ("off" as const),
    unreadCacheTtlSeconds: getBoundedInteger(
      environment.REDIS_UNREAD_CACHE_TTL_SECONDS,
      DEFAULT_UNREAD_CACHE_TTL_SECONDS,
      5,
      120,
    ),
    url,
  };
}
