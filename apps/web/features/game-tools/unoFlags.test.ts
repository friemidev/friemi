import assert from "node:assert/strict";
import test from "node:test";
import { isUnoEnabled } from "./unoFlags";

test("UNO early access is playable in production, including self-hosted production", () => {
  for (const NODE_ENV of [undefined, "development", "test", "production"]) {
    assert.equal(isUnoEnabled({ VERCEL_ENV: "production", NODE_ENV }), true);
  }
  assert.equal(isUnoEnabled({ NODE_ENV: "production" }), true);
  assert.equal(isUnoEnabled({ NODE_ENV: "production", VERCEL_ENV: "" }), true);
});

test("an unrecognized deployment tier does not expose UNO", () => {
  assert.equal(isUnoEnabled({ NODE_ENV: "production", VERCEL_ENV: "unknown" }), false);
});

test("Vercel preview and development builds remain playable with production optimizations", () => {
  for (const VERCEL_ENV of ["preview", "development"]) {
    for (const NODE_ENV of [undefined, "development", "test", "production"]) {
      assert.equal(isUnoEnabled({ VERCEL_ENV, NODE_ENV }), true);
    }
  }
});

test("local development and tests remain playable", () => {
  for (const NODE_ENV of [undefined, "development", "test"]) {
    assert.equal(isUnoEnabled({ NODE_ENV }), true);
  }
});
