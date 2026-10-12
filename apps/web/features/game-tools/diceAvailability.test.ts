import assert from "node:assert/strict";
import test from "node:test";
import { isDicePreviewEnabled } from "./diceAvailability";

test("allows local development and Vercel preview production builds", () => {
  assert.equal(isDicePreviewEnabled({ NODE_ENV: "development" }), true);
  assert.equal(isDicePreviewEnabled({ NODE_ENV: "production", VERCEL_ENV: "preview" }), true);
  assert.equal(isDicePreviewEnabled({ NODE_ENV: "production", VERCEL_ENV: "development" }), true);
});

test("production deployments always keep dice closed", () => {
  for (const NODE_ENV of ["development", "production", "test", undefined]) {
    assert.equal(isDicePreviewEnabled({ NODE_ENV, VERCEL_ENV: "production" }), false);
  }
});

test("unknown deployments and standalone production builds stay closed", () => {
  assert.equal(isDicePreviewEnabled({ NODE_ENV: "production" }), false);
  assert.equal(isDicePreviewEnabled({ NODE_ENV: "development", VERCEL_ENV: "staging" }), false);
  assert.equal(isDicePreviewEnabled({}), false);
});
