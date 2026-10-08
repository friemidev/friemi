import assert from "node:assert/strict";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import test from "node:test";
import { Redis } from "@upstash/redis";
import {
  consumeAndroidHandoff,
  issueAndroidHandoff,
  type AndroidHandoffStore,
} from "./androidAuthHandoff";

// Opt in with dedicated test credentials. Only short-lived, randomly prefixed
// fixture keys are written; no Clerk users, sessions or database rows are used.
test(
  "Redis atomically redeems one device-bound code and enforces expiry",
  {
    skip:
      !process.env.ANDROID_AUTH_TEST_REDIS_URL ||
      !process.env.ANDROID_AUTH_TEST_REDIS_TOKEN,
  },
  async () => {
    const redis = new Redis({
      url: process.env.ANDROID_AUTH_TEST_REDIS_URL!,
      token: process.env.ANDROID_AUTH_TEST_REDIS_TOKEN!,
      readYourWrites: true,
    });
    const namespace = `friemi:test:android-auth:${randomUUID()}`;
    const keys: string[] = [];
    const store: AndroidHandoffStore = {
      set: async (key, value, options) => {
        keys.push(key);
        return redis.set(key, value, options);
      },
      eval: (script, keyList, args) => redis.eval(script, keyList, args),
    };
    const flow = randomBytes(16).toString("hex");
    const verifier = randomBytes(32).toString("base64url");
    const challenge = createHash("sha256").update(verifier).digest("base64url");
    try {
      const code = await issueAndroidHandoff({
        store,
        namespace,
        flow,
        challenge,
        userId: "test-not-a-clerk-user",
        target: "/en/home",
      });
      const input = { store, namespace, flow, verifier, code };
      assert.equal(
        await consumeAndroidHandoff({ ...input, verifier: "x".repeat(43) }),
        null,
      );
      const results = await Promise.all(
        Array.from({ length: 4 }, () => consumeAndroidHandoff(input)),
      );
      assert.equal(results.filter(Boolean).length, 1);
      assert.deepEqual(results.find(Boolean), {
        userId: "test-not-a-clerk-user",
        target: "/en/home",
      });
      const expired = await issueAndroidHandoff({
        store,
        namespace,
        flow,
        challenge,
        userId: "test-not-a-clerk-user",
        target: "/en/home",
      });
      assert.ok((await redis.ttl(keys[1])) <= 120);
      await redis.expire(keys[1], 1);
      await new Promise((resolve) => setTimeout(resolve, 1500));
      assert.equal(
        await consumeAndroidHandoff({ ...input, code: expired }),
        null,
      );
    } finally {
      if (keys.length) await redis.del(...keys);
    }
  },
);
