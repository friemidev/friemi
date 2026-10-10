import assert from "node:assert/strict";
import test from "node:test";
import { getPlanetInvitePath } from "./planetInvite";
import { resolveGlobalQrScanDestination } from "@/features/scan/globalQrScanner";

test("planet QR links use the existing invite route across locales", () => {
  for (const locale of ["zh-CN", "en", "fr"]) {
    const path = getPlanetInvitePath(locale, " ab1234 ");
    assert.equal(path, `/${locale}/planets/invite/AB1234`);
    assert.deepEqual(
      resolveGlobalQrScanDestination({
        locale,
        rawValue: `https://www.friemi.com${path}`,
      }),
      {
        href: path,
        kind: "internal",
        source: "internal-link",
      },
    );
  }
});

test("planet invite codes cannot escape their path segment", () => {
  assert.equal(
    getPlanetInvitePath("en", "abc/?test"),
    "/en/planets/invite/ABC%2F%3FTEST",
  );
  assert.deepEqual(
    resolveGlobalQrScanDestination({
      locale: "en",
      rawValue: "friemi://planets/invite/AB1234",
    }),
    {
      href: "/planets/invite/AB1234",
      kind: "internal",
      source: "internal-link",
    },
  );
});
