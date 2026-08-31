import assert from "node:assert/strict";
import test from "node:test";
import type { ActivityCardViewModel } from "@/features/activities/types";
import {
  dedupeSearchActivities,
  filterUniqueSearchActivities,
} from "./searchActivityIdentity";

function activity(
  overrides: Partial<ActivityCardViewModel> & Pick<ActivityCardViewModel, "id">,
): ActivityCardViewModel {
  return {
    address: "Paris",
    autoCreatedTeam: null,
    capacity: 0,
    category: "OTHER",
    city: "Paris",
    coverImageUrl: null,
    coverTone: "moss",
    description: "",
    endAt: "2026-09-13T20:00:00.000Z",
    favoriteCount: 0,
    friendSignal: null,
    latitude: null,
    longitude: null,
    merchant: null,
    participantCount: 0,
    priceText: "",
    startAt: "2026-06-28T08:00:00.000Z",
    status: "RECRUITING",
    title: "Paris event",
    type: "LOCAL",
    ...overrides,
  };
}

test("keeps distinct lobbies created for the same public event", () => {
  const results = dedupeSearchActivities([
    activity({ id: "lobby-a", publicEventId: "event-a" }),
    activity({ id: "lobby-b", publicEventId: "event-a" }),
  ]);

  assert.deepEqual(
    results.map((item) => item.id),
    ["lobby-a", "lobby-b"],
  );
});

test("deduplicates canonical and legacy cards for one public event", () => {
  const results = dedupeSearchActivities([
    activity({
      id: "event-a",
      isActivityInfo: true,
      publicEventId: "event-a",
      type: "PUBLIC_EVENT",
    }),
    activity({
      id: "legacy-event-row",
      isActivityInfo: true,
      publicEventId: "event-a",
      type: "PUBLIC_EVENT",
    }),
  ]);

  assert.deepEqual(
    results.map((item) => item.id),
    ["event-a"],
  );
});

test("deduplicates imported public event rows with identical content", () => {
  const results = dedupeSearchActivities([
    activity({ id: "event-a", isActivityInfo: true, type: "PUBLIC_EVENT" }),
    activity({ id: "event-b", isActivityInfo: true, type: "PUBLIC_EVENT" }),
  ]);

  assert.deepEqual(
    results.map((item) => item.id),
    ["event-a"],
  );
});

test("groups venue variants from the same covered public event series", () => {
  const sharedCover = "https://cdn.example/summer-sports.jpg";
  const results = dedupeSearchActivities([
    activity({
      coverImageUrl: sharedCover,
      id: "event-a",
      isActivityInfo: true,
      title: "Paris Sport: Fitness Paris 14",
      type: "PUBLIC_EVENT",
    }),
    activity({
      coverImageUrl: sharedCover,
      id: "event-b",
      isActivityInfo: true,
      title: "Paris Sport: Fitness au Square",
      type: "PUBLIC_EVENT",
    }),
  ]);

  assert.deepEqual(
    results.map((item) => item.id),
    ["event-a"],
  );
});

test("does not group unrelated public events that use a default cover", () => {
  const results = dedupeSearchActivities([
    activity({
      coverImageUrl: "/illustrations/png/art.png",
      id: "event-a",
      isActivityInfo: true,
      title: "Art fair",
      type: "PUBLIC_EVENT",
    }),
    activity({
      coverImageUrl: "/illustrations/png/art.png",
      id: "event-b",
      isActivityInfo: true,
      title: "Museum night",
      type: "PUBLIC_EVENT",
    }),
  ]);

  assert.deepEqual(
    results.map((item) => item.id),
    ["event-a", "event-b"],
  );
});

test("filters repeated page results without hiding linked lobbies", () => {
  const event = activity({
    id: "event-a",
    isActivityInfo: true,
    publicEventId: "event-a",
    type: "PUBLIC_EVENT",
  });
  const lobby = activity({ id: "lobby-a", publicEventId: "event-a" });

  assert.deepEqual(
    filterUniqueSearchActivities([event], [event, lobby]).map(
      (item) => item.id,
    ),
    ["lobby-a"],
  );
});
