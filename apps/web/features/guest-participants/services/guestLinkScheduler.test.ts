import assert from "node:assert/strict";
import test from "node:test";
import {
  buildGuestLinkFingerprint,
  shouldCheckGuestLinks,
} from "./guestLinkScheduler";

test("guest-link fingerprints are stable across equivalent identity order", () => {
  const first = buildGuestLinkFingerprint({
    id: "profile-1",
    normalizedContactEmail: "person@example.com",
    normalizedPhone: "+33123456789",
  });
  const second = buildGuestLinkFingerprint({
    id: "profile-1",
    contactEmail: " PERSON@example.com ",
    phone: "+33 1 23 45 67 89",
  });

  assert.equal(first, second);
});

test("guest-link checks run for identity changes and after the cooldown", () => {
  const now = new Date("2026-08-14T12:00:00.000Z");

  assert.equal(
    shouldCheckGuestLinks({
      fingerprint: "new",
      lastCheckedAt: now,
      now,
      previousFingerprint: "old",
    }),
    true,
  );
  assert.equal(
    shouldCheckGuestLinks({
      fingerprint: "same",
      lastCheckedAt: new Date("2026-08-14T00:00:00.000Z"),
      now,
      previousFingerprint: "same",
    }),
    false,
  );
  assert.equal(
    shouldCheckGuestLinks({
      fingerprint: "same",
      lastCheckedAt: new Date("2026-08-13T11:59:59.000Z"),
      now,
      previousFingerprint: "same",
    }),
    true,
  );
});
