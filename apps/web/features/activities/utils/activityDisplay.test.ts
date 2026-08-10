import assert from "node:assert/strict";
import test from "node:test";
import type { ActivityCardViewModel } from "../types";
import {
  getActivityDisplayStatus,
  getActivityEndBoundary,
  getActivityTimeState,
} from "./activityDisplay";

function activity(
  overrides: Partial<ActivityCardViewModel>,
): ActivityCardViewModel {
  return {
    address: "1 rue Friemi",
    autoCreatedTeam: null,
    capacity: 8,
    category: "BOARD_GAME",
    city: "Paris",
    coverImageUrl: null,
    coverTone: "moss",
    description: "",
    endAt: null,
    favoriteCount: 0,
    id: "activity-1",
    latitude: null,
    longitude: null,
    merchant: null,
    participantCount: 1,
    priceText: "",
    startAt: "2026-08-09T09:00:00.000Z",
    status: "OPEN",
    title: "Morning hangout",
    type: "USER_HOSTED",
    ...overrides,
  } as ActivityCardViewModel;
}

test("activity without end time stays ongoing until the floating day ends", () => {
  const card = activity({});

  assert.equal(
    getActivityTimeState(card, new Date("2026-08-09T14:00:00.000Z")),
    "ONGOING",
  );
  assert.equal(
    getActivityTimeState(card, new Date("2026-08-09T21:59:00.000Z")),
    "ONGOING",
  );
  assert.equal(
    getActivityTimeState(card, new Date("2026-08-09T22:00:00.000Z")),
    "ENDED",
  );
});

test("activity display status uses the same no-end daily boundary", () => {
  const card = activity({});

  assert.equal(
    getActivityDisplayStatus(card, new Date("2026-08-09T21:59:00.000Z")),
    "OPEN",
  );
  assert.equal(
    getActivityDisplayStatus(card, new Date("2026-08-09T22:00:00.000Z")),
    "ENDED",
  );
});

test("public event without end time uses the Paris day boundary", () => {
  const card = activity({
    startAt: "2026-08-09T07:00:00.000Z",
    type: "PUBLIC_EVENT",
  });

  assert.equal(
    getActivityEndBoundary(card).toISOString(),
    "2026-08-09T21:59:59.999Z",
  );
  assert.equal(
    getActivityTimeState(card, new Date("2026-08-09T20:00:00.000Z")),
    "ONGOING",
  );
  assert.equal(
    getActivityTimeState(card, new Date("2026-08-09T22:00:00.000Z")),
    "ENDED",
  );
});
