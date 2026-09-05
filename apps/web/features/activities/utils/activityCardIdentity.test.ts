import assert from "node:assert/strict";
import test from "node:test";
import type { ActivityCardViewModel } from "../types";
import { dedupeActivityCards } from "./activityCardIdentity";

function activity(
  overrides: Partial<ActivityCardViewModel> & Pick<ActivityCardViewModel, "id">,
): ActivityCardViewModel {
  return {
    address: "Paris",
    autoCreatedTeam: null,
    capacity: 0,
    category: "SPORTS",
    city: "Paris",
    coverImageUrl: null,
    coverTone: "moss",
    description: "",
    endAt: "2026-09-13T20:00:00.000Z",
    favoriteCount: 0,
    latitude: null,
    longitude: null,
    merchant: null,
    participantCount: 0,
    priceText: "",
    startAt: "2026-06-28T08:00:00.000Z",
    status: "RECRUITING",
    title: "Paris event",
    type: "PUBLIC_EVENT",
    ...overrides,
  };
}

test("keeps distinct real lobbies linked to the same public event", () => {
  const results = dedupeActivityCards([
    activity({ id: "lobby-a", publicEventId: "event-a", type: "USER_HOSTED" }),
    activity({ id: "lobby-b", publicEventId: "event-a", type: "USER_HOSTED" }),
  ]);

  assert.deepEqual(
    results.map((item) => item.id),
    ["lobby-a", "lobby-b"],
  );
});

test("deduplicates public event records with identical content", () => {
  const results = dedupeActivityCards([
    activity({ id: "event-a" }),
    activity({ id: "event-b" }),
  ]);

  assert.deepEqual(
    results.map((item) => item.id),
    ["event-a"],
  );
});

test("deduplicates title variants from one dated public event series", () => {
  const results = dedupeActivityCards([
    activity({
      address: "Paris 14e",
      coverImageUrl: "https://cdn.example/fitness.jpg",
      id: "fitness",
      title: "Paris Sport Dimanches Estivaux : Fitness et Stretching",
    }),
    activity({
      address: "Paris 12e",
      coverImageUrl: "https://cdn.example/boxing.jpg",
      id: "boxing",
      title: "Paris Sport Dimanches Estivaux : Boxe sur la place",
    }),
  ]);

  assert.deepEqual(
    results.map((item) => item.id),
    ["fitness"],
  );
});

test("keeps the same public event series on different dates", () => {
  const results = dedupeActivityCards([
    activity({
      id: "summer",
      title: "Paris Sport Dimanches Estivaux : Fitness",
    }),
    activity({
      endAt: "2026-10-13T20:00:00.000Z",
      id: "autumn",
      startAt: "2026-09-28T08:00:00.000Z",
      title: "Paris Sport Dimanches Estivaux : Fitness",
    }),
  ]);

  assert.deepEqual(
    results.map((item) => item.id),
    ["summer", "autumn"],
  );
});
