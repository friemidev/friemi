import assert from "node:assert/strict";
import test from "node:test";
import { getRedisRuntimeConfig } from "./redisConfig";

test("Redis features remain off without complete credentials", () => {
  const config = getRedisRuntimeConfig({
    REDIS_RATE_LIMIT_MODE: "enforce",
    REDIS_UNREAD_CACHE_MODE: "serve",
    UPSTASH_REDIS_REST_URL: "https://example.upstash.io",
  });

  assert.equal(config.configured, false);
  assert.equal(config.rateLimitMode, "off");
  assert.equal(config.unreadCacheMode, "off");
});

test("Vercel KV Marketplace credentials configure Redis", () => {
  const config = getRedisRuntimeConfig({
    KV_REST_API_TOKEN: "marketplace-token",
    KV_REST_API_URL: "https://example.upstash.io",
    REDIS_RATE_LIMIT_MODE: "shadow",
    REDIS_UNREAD_CACHE_MODE: "shadow",
    UPSTASH_REDIS_REST_TOKEN: " ",
    UPSTASH_REDIS_REST_URL: "",
  });

  assert.equal(config.configured, true);
  assert.equal(config.rateLimitMode, "shadow");
  assert.equal(config.token, "marketplace-token");
  assert.equal(config.unreadCacheMode, "shadow");
  assert.equal(config.url, "https://example.upstash.io");
});

test("Redis feature modes and numeric bounds are normalized", () => {
  const config = getRedisRuntimeConfig({
    REDIS_KEY_PREFIX: "friemi:preview:",
    REDIS_RATE_LIMIT_MODE: "ENFORCE",
    REDIS_RATE_LIMIT_TIMEOUT_MS: "50",
    REDIS_UNREAD_CACHE_MODE: "shadow",
    REDIS_UNREAD_CACHE_TTL_SECONDS: "999",
    UPSTASH_REDIS_REST_TOKEN: "token",
    UPSTASH_REDIS_REST_URL: "https://example.upstash.io",
  });

  assert.equal(config.configured, true);
  assert.equal(config.keyPrefix, "friemi:preview");
  assert.equal(config.rateLimitMode, "enforce");
  assert.equal(config.rateLimitTimeoutMs, 100);
  assert.equal(config.unreadCacheMode, "shadow");
  assert.equal(config.unreadCacheTtlSeconds, 120);
});

test("invalid Redis settings use conservative defaults", () => {
  const config = getRedisRuntimeConfig({
    REDIS_KEY_PREFIX: "bad prefix!",
    REDIS_RATE_LIMIT_MODE: "on",
    REDIS_RATE_LIMIT_TIMEOUT_MS: "not-a-number",
    REDIS_UNREAD_CACHE_MODE: "enabled",
    REDIS_UNREAD_CACHE_TTL_SECONDS: "nope",
    UPSTASH_REDIS_REST_TOKEN: "token",
    UPSTASH_REDIS_REST_URL: "https://example.upstash.io",
  });

  assert.equal(config.keyPrefix, "friemi:v2");
  assert.equal(config.rateLimitMode, "off");
  assert.equal(config.rateLimitTimeoutMs, 400);
  assert.equal(config.unreadCacheMode, "off");
  assert.equal(config.unreadCacheTtlSeconds, 30);
});
