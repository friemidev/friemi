import assert from "node:assert/strict";
import test from "node:test";
import { isNowPreviewEnabled } from "./previewAccess";

test("NOW sample journey is confined to local development and its preview branch", () => {
  assert.equal(isNowPreviewEnabled({ NODE_ENV: "development" }), true);
  assert.equal(
    isNowPreviewEnabled({
      NODE_ENV: "production",
      VERCEL_ENV: "preview",
      VERCEL_GIT_COMMIT_REF: "codex/home-v2",
    }),
    true,
  );
  assert.equal(
    isNowPreviewEnabled({
      NODE_ENV: "production",
      VERCEL_ENV: "production",
      VERCEL_GIT_COMMIT_REF: "codex/home-v2",
    }),
    false,
  );
  assert.equal(
    isNowPreviewEnabled({
      NODE_ENV: "production",
      VERCEL_ENV: "preview",
      VERCEL_GIT_COMMIT_REF: "dev",
    }),
    false,
  );
  assert.equal(
    isNowPreviewEnabled({ NODE_ENV: "production", VERCEL_ENV: "preview" }),
    false,
  );
});
