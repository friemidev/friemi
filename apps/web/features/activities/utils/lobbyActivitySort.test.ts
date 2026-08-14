import assert from "node:assert/strict";
import test from "node:test";
import type { ActivityCardViewModel } from "../types";
import { sortLobbyActivitiesByStatusAndOwnership } from "./lobbyActivitySort";

function activity(
  id: string,
  overrides: Partial<ActivityCardViewModel> = {},
): ActivityCardViewModel {
  return {
    address: "1 rue Friemi",
    autoCreatedTeam: null,
    capacity: 10,
    category: "BOARD_GAME",
    city: "Paris",
    coverImageUrl: null,
    coverTone: "moss",
    description: "",
    endAt: null,
    favoriteCount: 0,
    id,
    latitude: null,
    longitude: null,
    merchant: null,
    participantCount: 0,
    priceText: "",
    startAt: "2026-08-20T18:00:00.000Z",
    status: "OPEN",
    title: id,
    type: "USER_HOSTED",
    ...overrides,
  } as ActivityCardViewModel;
}

test("lobby sorting prioritizes status before viewer ownership", () => {
  const sorted = sortLobbyActivitiesByStatusAndOwnership(
    [
      activity("ended-owned", {
        organizerId: "viewer",
        status: "ENDED",
      }),
      activity("active-other", { organizerId: "other" }),
      activity("active-owned", { organizerId: "viewer" }),
    ],
    {
      reference: new Date("2026-08-15T12:00:00.000Z"),
      viewerProfileId: "viewer",
    },
  );

  assert.deepEqual(
    sorted.map((item) => item.id),
    ["active-owned", "active-other", "ended-owned"],
  );
});

test("cancelled owned lobby stays behind every active lobby", () => {
  const sorted = sortLobbyActivitiesByStatusAndOwnership(
    [
      activity("cancelled-owned", {
        organizerId: "viewer",
        status: "CANCELLED",
      }),
      activity("active-other", { organizerId: "other" }),
    ],
    {
      reference: new Date("2026-08-15T12:00:00.000Z"),
      viewerProfileId: "viewer",
    },
  );

  assert.deepEqual(
    sorted.map((item) => item.id),
    ["active-other", "cancelled-owned"],
  );
});
