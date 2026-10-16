import assert from "node:assert/strict";
import test from "node:test";
import { isDoudizhuEnabled } from "./doudizhuFlags";

test("new rooms remain gated until the deployment explicitly enables them", () => {
  assert.equal(isDoudizhuEnabled({ NODE_ENV: "production" }), false);
  assert.equal(isDoudizhuEnabled({ NODE_ENV: "production", VERCEL_ENV: "preview" }), false);
  assert.equal(isDoudizhuEnabled({ NODE_ENV: "development" }), true);
  assert.equal(isDoudizhuEnabled({ NODE_ENV: "production", DOUDIZHU_ENABLED: "true" }), true);
  assert.equal(isDoudizhuEnabled({ NODE_ENV: "development", DOUDIZHU_ENABLED: "false" }), false);
});
