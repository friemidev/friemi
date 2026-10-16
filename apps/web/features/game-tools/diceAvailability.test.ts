import assert from "node:assert/strict";
import test from "node:test";
import { isDiceEnabled, isDiceProduction } from "./diceAvailability";

test("dice is released in local and deployed production as well as preview", () => {
  for (const NODE_ENV of ["development", "production"]) {
    assert.equal(isDiceEnabled({ NODE_ENV }), true);
  }
  for (const VERCEL_ENV of ["production", "preview", "development"]) {
    for (const NODE_ENV of ["development", "production", "test", undefined]) {
      assert.equal(isDiceEnabled({ NODE_ENV, VERCEL_ENV }), true);
    }
  }
});

test("only production documents may be indexed; deployment tier takes precedence", () => {
  assert.equal(isDiceProduction({ NODE_ENV: "production" }), true);
  assert.equal(isDiceProduction({ VERCEL_ENV: "production" }), true);
  for (const VERCEL_ENV of ["preview", "development", "staging"]) {
    assert.equal(isDiceProduction({ NODE_ENV: "production", VERCEL_ENV }), false);
  }
  assert.equal(isDiceProduction({ NODE_ENV: "development" }), false);
});

test("unknown and unconfigured environments remain closed", () => {
  assert.equal(isDiceEnabled({ NODE_ENV: "development", VERCEL_ENV: "staging" }), false);
  assert.equal(isDiceEnabled({ NODE_ENV: "test" }), false);
  assert.equal(isDiceEnabled({}), false);
});
