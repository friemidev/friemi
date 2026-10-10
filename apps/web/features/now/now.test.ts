import assert from "node:assert/strict";
import test from "node:test";
import {
  getNowActivityCategory,
  getNowActivityDraftFields,
  getNowExpiry,
  getNowIntentWindowLabel,
  getNowPriority,
  getNowStage,
  getNowSuggestedStartAt,
  isNowIntentWindow,
  isNowKind,
  isNowVisible,
} from "./now";
import { createActivitySchema } from "../activities/schemas/activitySchema";

test("a default 12-hour invite leaves the feed at its exact expiry", () => {
  const published = new Date("2026-10-03T10:00:00.000Z");
  const expiry = getNowExpiry(published, 12);
  assert.equal(expiry.toISOString(), "2026-10-03T22:00:00.000Z");
  assert.equal(
    isNowVisible(expiry, new Date("2026-10-03T21:59:59.999Z")),
    true,
  );
  assert.equal(
    isNowVisible(expiry, new Date("2026-10-03T22:00:00.000Z")),
    false,
  );
  assert.throws(() => getNowExpiry(published, 72));
});

test("supported invite kinds include the home mockup actions", () => {
  for (const kind of ["COFFEE", "DRINK", "PARK", "MOVIE", "GAME", "TEA"]) {
    assert.equal(isNowKind(kind), true);
  }
  assert.equal(isNowKind("FAKE"), false);
});

test("intent time is independent of the home visibility countdown", () => {
  for (const window of ["NOW", "LATER", "TODAY", "TONIGHT"]) {
    assert.equal(isNowIntentWindow(window), true);
  }
  assert.equal(isNowIntentWindow("12"), false);
  assert.equal(getNowIntentWindowLabel("TONIGHT", "zh-CN"), "今晚");
});

test("NOW stages follow response and expiry", () => {
  const expiry = new Date("2026-10-03T22:00:00.000Z");
  const before = new Date("2026-10-03T21:59:00.000Z");
  const after = new Date("2026-10-03T22:00:00.000Z");
  assert.equal(getNowStage(expiry, 0, before), "ACTIVE");
  assert.equal(getNowStage(expiry, 2, before), "ALMOST_THERE");
  assert.equal(getNowStage(expiry, 2, after), "EXPIRED");
});

test("hangout draft suggests a Paris time without changing NOW visibility", () => {
  const now = new Date("2026-10-03T10:00:00.000Z");
  assert.equal(getNowSuggestedStartAt("NOW", now), "2026-10-03T12:30");
  assert.equal(getNowSuggestedStartAt("LATER", now), "2026-10-03T14:00");
  assert.equal(getNowSuggestedStartAt("TODAY", now), "2026-10-03T18:00");
  assert.equal(getNowSuggestedStartAt("TONIGHT", now), "2026-10-03T20:00");
  assert.equal(getNowActivityCategory("GAME"), "BOARD_GAME");
  assert.equal(getNowActivityCategory("SOCIAL"), "OTHER");
});

test("a free-form NOW can become a valid hangout draft after time and place are confirmed", () => {
  const fields = getNowActivityDraftFields({
    area: "Le Marais",
    category: "OTHER",
    city: "Paris",
    inviteId: "now-1",
    locale: "zh-CN",
    note: "想出去走走",
    title: "谁要一起？",
  });
  const parsed = createActivitySchema.safeParse({
    ...fields,
    address: "Place des Vosges",
    startAt: "2026-10-03T20:00",
    hideAddressFromNonParticipants: false,
    capacityLimitEnabled: false,
    requiresApproval: false,
    planetIds: [],
  });
  assert.equal(parsed.success, true);
  assert.equal(fields.otherCategoryText, "随便说说");
  assert.equal(fields.destination, "Le Marais");
});

test("interest raises prominence while a given hourly ordering stays stable", () => {
  const now = new Date("2026-10-03T12:00:00.000Z");
  const createdAt = new Date("2026-10-03T10:00:00.000Z");
  const base = getNowPriority({
    id: "invite-1",
    interestCount: 0,
    createdAt,
    now,
  });
  const active = getNowPriority({
    id: "invite-1",
    interestCount: 4,
    createdAt,
    now,
  });
  assert.deepEqual(
    base,
    getNowPriority({ id: "invite-1", interestCount: 0, createdAt, now }),
  );
  assert.ok(active.score > base.score);
  assert.equal(active.size, "large");
});
