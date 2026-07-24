import assert from "node:assert/strict";
import test from "node:test";
import { resolveFriemiCheckDisplayStatus } from "./getProfileBag";

test("Friemi check display status treats expired available checks as expired", () => {
  assert.equal(
    resolveFriemiCheckDisplayStatus({
      expiresAt: new Date("2026-07-01T00:00:00Z"),
      now: new Date("2026-07-24T00:00:00Z"),
      status: "AVAILABLE",
    }),
    "EXPIRED",
  );
});

test("Friemi check display status keeps redeemed checks redeemed", () => {
  assert.equal(
    resolveFriemiCheckDisplayStatus({
      expiresAt: new Date("2026-07-01T00:00:00Z"),
      now: new Date("2026-07-24T00:00:00Z"),
      status: "REDEEMED",
    }),
    "REDEEMED",
  );
});
