import { randomUUID } from "node:crypto";
import nextEnv from "@next/env";
import { Redis } from "@upstash/redis";

const { loadEnvConfig } = nextEnv;

loadEnvConfig(process.cwd());

const url =
  process.env.UPSTASH_REDIS_REST_URL?.trim() ||
  process.env.KV_REST_API_URL?.trim();
const token =
  process.env.UPSTASH_REDIS_REST_TOKEN?.trim() ||
  process.env.KV_REST_API_TOKEN?.trim();
const keyPrefix =
  process.env.REDIS_KEY_PREFIX?.trim().replace(/:+$/, "") || "friemi:v2";

if (!url || !token) {
  console.error(
    "Redis is not configured. Set UPSTASH_REDIS_REST_URL/TOKEN or KV_REST_API_URL/TOKEN.",
  );
  process.exitCode = 1;
} else {
  const redis = new Redis({ readYourWrites: true, token, url });
  const key = `${keyPrefix}:health:${randomUUID()}`;
  const payload = { checkedAt: new Date().toISOString(), ok: true };

  try {
    const ping = await redis.ping();
    await redis.set(key, payload, { ex: 30 });
    const roundTrip = await redis.get(key);
    await redis.del(key);

    if (
      ping !== "PONG" ||
      JSON.stringify(roundTrip) !== JSON.stringify(payload)
    ) {
      throw new Error("Redis round-trip verification failed");
    }

    console.info(
      JSON.stringify({
        configured: true,
        keyPrefix,
        ping,
        readWriteDelete: "ok",
      }),
    );
  } catch (error) {
    console.error(
      JSON.stringify({
        configured: true,
        errorName: error instanceof Error ? error.name : "UnknownError",
        message: error instanceof Error ? error.message : "Redis check failed",
      }),
    );
    process.exitCode = 1;
  }
}
