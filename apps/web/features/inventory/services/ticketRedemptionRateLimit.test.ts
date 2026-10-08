import assert from "node:assert/strict";
import test from "node:test";
import { allowTicketManualCodeLookup } from "./ticketRedemptionRateLimit";

const redisEnvironmentNames = [
  "UPSTASH_REDIS_REST_URL",
  "UPSTASH_REDIS_REST_TOKEN",
  "KV_REST_API_URL",
  "KV_REST_API_TOKEN",
] as const;
const mutableEnvironment = process.env as Record<string, string | undefined>;

test("manual lookup limits an actor globally and per event holder", async () => {
  const original = Object.fromEntries(
    redisEnvironmentNames.map((name) => [name, process.env[name]]),
  );
  const originalNodeEnv = process.env.NODE_ENV;
  for (const name of redisEnvironmentNames) delete process.env[name];
  mutableEnvironment.NODE_ENV = "test";
  try {
    const actor = `manual-limit-test-${Date.now()}`;
    for (let attempt = 0; attempt < 4; attempt += 1) {
      assert.equal(
        await allowTicketManualCodeLookup(actor, "event-1", "123456"),
        true,
      );
    }
    assert.equal(
      await allowTicketManualCodeLookup(actor, "event-1", "123456"),
      false,
    );
    const globalActor = `${actor}-global`;
    for (let attempt = 0; attempt < 20; attempt += 1) {
      assert.equal(
        await allowTicketManualCodeLookup(
          globalActor,
          "event-1",
          String(attempt).padStart(6, "0"),
        ),
        true,
      );
    }
    assert.equal(
      await allowTicketManualCodeLookup(globalActor, "event-1", "999999"),
      false,
    );
  } finally {
    if (originalNodeEnv === undefined) delete mutableEnvironment.NODE_ENV;
    else mutableEnvironment.NODE_ENV = originalNodeEnv;
    for (const name of redisEnvironmentNames) {
      const value = original[name];
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  }
});

test("production without Redis blocks manual code lookup", async () => {
  const original = Object.fromEntries(
    redisEnvironmentNames.map((name) => [name, process.env[name]]),
  );
  const originalNodeEnv = process.env.NODE_ENV;
  for (const name of redisEnvironmentNames) delete process.env[name];
  mutableEnvironment.NODE_ENV = "production";
  try {
    assert.equal(
      await allowTicketManualCodeLookup("actor", "event", "123456"),
      false,
    );
  } finally {
    if (originalNodeEnv === undefined) delete mutableEnvironment.NODE_ENV;
    else mutableEnvironment.NODE_ENV = originalNodeEnv;
    for (const name of redisEnvironmentNames) {
      const value = original[name];
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  }
});
