import assert from "node:assert/strict";
import test from "node:test";
import { getCanonicalSiteUrl } from "./site-url";

function restoreEnv(name: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[name];
    return;
  }

  process.env[name] = value;
}

test("getCanonicalSiteUrl prefers the dedicated canonical URL", () => {
  const previousCanonicalSiteUrl = process.env.CANONICAL_SITE_URL;
  const previousSiteUrl = process.env.SITE_URL;
  const previousNextPublicSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;

  process.env.CANONICAL_SITE_URL = "https://www.friemi.com/";
  process.env.SITE_URL = "https://fallback.example";
  process.env.NEXT_PUBLIC_SITE_URL = "https://preview.example";

  try {
    assert.equal(getCanonicalSiteUrl(), "https://www.friemi.com");
  } finally {
    restoreEnv("CANONICAL_SITE_URL", previousCanonicalSiteUrl);
    restoreEnv("SITE_URL", previousSiteUrl);
    restoreEnv("NEXT_PUBLIC_SITE_URL", previousNextPublicSiteUrl);
  }
});
