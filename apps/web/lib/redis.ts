import { Redis } from "@upstash/redis";
import { getRedisRuntimeConfig } from "./redisConfig";

const globalForRedis = globalThis as unknown as {
  friemiRedis?: Redis;
};

export function getOptionalRedis() {
  const config = getRedisRuntimeConfig();

  if (!config.configured) {
    return null;
  }

  if (!globalForRedis.friemiRedis) {
    globalForRedis.friemiRedis = new Redis({
      readYourWrites: true,
      token: config.token,
      url: config.url,
    });
  }

  return globalForRedis.friemiRedis;
}
