import assert from "node:assert/strict";
import test from "node:test";
import { isDoudizhuEnabled } from "./doudizhuFlags";

test("preview opens for testing while production remains closed by default", () => {
  assert.equal(isDoudizhuEnabled({ NODE_ENV: "production" }), false);
  assert.equal(
    isDoudizhuEnabled({ NODE_ENV: "production", VERCEL_ENV: "production" }),
    false,
  );
  assert.equal(
    isDoudizhuEnabled({ NODE_ENV: "development", VERCEL_ENV: "production" }),
    false,
  );
  assert.equal(
    isDoudizhuEnabled({ NODE_ENV: "production", VERCEL_ENV: "preview" }),
    true,
  );
  assert.equal(
    isDoudizhuEnabled({ NODE_ENV: "production", VERCEL_ENV: "development" }),
    true,
  );
  assert.equal(
    isDoudizhuEnabled({ NODE_ENV: "production", VERCEL_ENV: "unknown" }),
    false,
  );
  assert.equal(isDoudizhuEnabled({ NODE_ENV: "development" }), true);
  assert.equal(
    isDoudizhuEnabled({ NODE_ENV: "production", DOUDIZHU_ENABLED: "true" }),
    true,
  );
  assert.equal(
    isDoudizhuEnabled({ NODE_ENV: "development", DOUDIZHU_ENABLED: "false" }),
    false,
  );
  assert.equal(
    isDoudizhuEnabled({
      NODE_ENV: "production",
      VERCEL_ENV: "preview",
      DOUDIZHU_ENABLED: "false",
    }),
    false,
  );
});
