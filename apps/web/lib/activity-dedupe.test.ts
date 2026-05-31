import assert from "node:assert/strict";
import test from "node:test";
import {
  hashActivityFingerprint,
  normalizeActivitySourceUrl,
} from "./activity-dedupe";

test("normalizeActivitySourceUrl strips tracking params", () => {
  assert.equal(
    normalizeActivitySourceUrl(
      "https://www.eventbrite.fr/e/sample-tickets-123?aff=ehometext&utm_source=x",
    ),
    "https://www.eventbrite.fr/e/sample-tickets-123",
  );
});

test("hashActivityFingerprint is stable for same activity fields", () => {
  const first = hashActivityFingerprint(
    "Nuit blanche",
    "2026-09-20T18:00:00.000Z",
    "Paris · Maison des Sciences",
  );
  const second = hashActivityFingerprint(
    "nuit blanche",
    "2026-09-20T18:00:00.000Z",
    "paris · maison des sciences",
  );

  assert.equal(first, second);
});
