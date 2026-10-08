import assert from "node:assert/strict";
import test from "node:test";
import type { ActivityCardViewModel } from "../types";
import {
  getMobileActivityLobbyPage,
  sortMobileHomeTrendingTeamActivities,
} from "./getActivityLobby";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

function activity(
  overrides: Partial<ActivityCardViewModel>,
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
    id: "activity-1",
    latitude: null,
    longitude: null,
    merchant: null,
    participantCount: 0,
    priceText: "",
    startAt: "2026-08-10T18:00:00.000Z",
    status: "OPEN",
    title: "Hangout",
    type: "USER_HOSTED",
    ...overrides,
  } as ActivityCardViewModel;
}

test("mobile history filtering happens in the database before pagination", async (t) => {
  const calls: Prisma.ActivityFindManyArgs[] = [];
  const original = prisma.activity.findMany;
  prisma.activity.findMany = (async (args: Prisma.ActivityFindManyArgs) => {
    calls.push(args);
    return [];
  }) as typeof original;
  t.after(() => {
    prisma.activity.findMany = original;
  });
  await getMobileActivityLobbyPage({
    tab: "nearby",
    status: "ongoing",
    viewerProfileId: null,
  });
  await getMobileActivityLobbyPage({
    tab: "nearby",
    status: "ended",
    page: 3,
    viewerProfileId: null,
  });
  assert.equal(calls.length, 2);
  assert.equal(calls[0].skip, 0);
  assert.equal(calls[1].skip, 16);
  assert.equal(calls[1].take, 9);
  const activeFilters = calls[0].where?.AND as Prisma.ActivityWhereInput[];
  const archivedFilters = calls[1].where?.AND as Prisma.ActivityWhereInput[];
  assert.deepEqual(activeFilters[1].status, { not: "CANCELLED" });
  assert.deepEqual(archivedFilters[1].OR?.[0], { status: "CANCELLED" });
  assert.ok(JSON.stringify(activeFilters[0]).includes("ENDED"));
});

test("anonymous users cannot load another user's mine or following tabs", async (t) => {
  const calls: Prisma.ActivityFindManyArgs[] = [];
  const original = prisma.activity.findMany;
  prisma.activity.findMany = (async (args: Prisma.ActivityFindManyArgs) => {
    calls.push(args);
    return [];
  }) as typeof original;
  t.after(() => {
    prisma.activity.findMany = original;
  });
  for (const tab of ["mine", "friends"] as const) {
    await getMobileActivityLobbyPage({ tab, viewerProfileId: null });
  }
  for (const args of calls) {
    const filters = args.where?.AND as Prisma.ActivityWhereInput[];
    assert.deepEqual(filters.at(-1)?.OR?.[0], { organizerId: { in: [] } });
    assert.deepEqual(
      filters.at(-1)?.OR?.[1]?.participants?.some?.userProfileId,
      { in: [] },
    );
  }
});

test("mobile home trending teams exclude public event and imported info cards", () => {
  const sorted = sortMobileHomeTrendingTeamActivities(
    [
      activity({
        id: "public-event",
        isActivityInfo: true,
        participantCount: 99,
        publicEventId: "public-event",
        type: "PUBLIC_EVENT",
      }),
      activity({
        id: "legacy-info",
        isActivityInfo: true,
        participantCount: 50,
      }),
      activity({
        id: "real-team",
        participantCount: 1,
      }),
    ],
    new Date("2026-08-09T12:00:00.000Z"),
  );

  assert.deepEqual(
    sorted.map((item) => item.id),
    ["real-team"],
  );
});

test("mobile home trending teams rank popularity above zero-count recency", () => {
  const sorted = sortMobileHomeTrendingTeamActivities(
    [
      activity({
        id: "soon-zero",
        startAt: "2026-08-09T13:00:00.000Z",
      }),
      activity({
        favoriteCount: 3,
        id: "popular-favorites",
        startAt: "2026-08-12T18:00:00.000Z",
      }),
      activity({
        id: "popular-participants",
        participantCount: 2,
        startAt: "2026-08-13T18:00:00.000Z",
      }),
      activity({
        friendSignal: {
          allFriends: [],
          count: 2,
          extraCount: 0,
          previewFriends: [],
        },
        id: "friend-signal",
        startAt: "2026-08-14T18:00:00.000Z",
      }),
    ],
    new Date("2026-08-09T12:00:00.000Z"),
  );

  assert.deepEqual(
    sorted.map((item) => item.id),
    ["popular-participants", "friend-signal", "popular-favorites", "soon-zero"],
  );
});
