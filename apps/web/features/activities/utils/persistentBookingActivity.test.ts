import assert from "node:assert/strict";
import test from "node:test";
import type { Prisma } from "@prisma/client";
import type { ActivityCardViewModel } from "../types";
import {
  getActivityDateLabel,
  getActivityDisplayStatus,
  getActivityTimeState,
} from "./activityDisplay";
import { isArchivedLobbyActivity } from "./lobbyActivityRetention";
import { getActivityManagementRole } from "./activityManagement";
import {
  getPersistentBookingActivityWhere,
  isPersistentBookingActivity,
  mergePersistentBookingActivities,
} from "./persistentBookingActivity";
import { isActivityEndedForRewards } from "@/features/social-rewards/services/socialRewardTriggers";

const day = (value: number) =>
  new Date(`2026-10-${String(value).padStart(2, "0")}T12:00:00Z`);

test("persistent spaces survive old start dates without claiming an event time or capacity", () => {
  const card = {
    id: "store",
    isPersistent: true,
    type: "LOCAL",
    status: "RECRUITING",
    startAt: "2020-01-01T10:00:00Z",
    endAt: null,
    capacity: 1,
    participantCount: 100,
  } as ActivityCardViewModel;
  assert.equal(getActivityTimeState(card, day(9)), "ONGOING");
  assert.equal(getActivityDisplayStatus(card, day(9)), "OPEN");
  assert.equal(isArchivedLobbyActivity(card, day(9)), false);
  assert.equal(getActivityDateLabel(card, "zh-CN"), "开放预约");
  assert.equal(
    isActivityEndedForRewards(
      {
        ...card,
        startAt: new Date(card.startAt),
        endAt: null,
        status: "RECRUITING",
      },
      day(9),
    ),
    false,
  );
});

test("recent bookings mingle with ordinary activities while preserving their existing order", () => {
  const items = [
    { id: "ordinary-soon", createdAt: day(8) },
    {
      id: "old-space",
      isPersistent: true,
      createdAt: day(1),
      lastBookingAt: null,
    },
    { id: "ordinary-later", createdAt: day(3) },
    {
      id: "recent-space",
      isPersistent: true,
      createdAt: day(1),
      lastBookingAt: day(7),
    },
    {
      id: "new-space",
      isPersistent: true,
      createdAt: day(6),
      lastBookingAt: null,
    },
  ];
  const merged = mergePersistentBookingActivities(items);
  assert.deepEqual(
    merged.map((item) => item.id),
    [
      "ordinary-soon",
      "recent-space",
      "new-space",
      "ordinary-later",
      "old-space",
    ],
  );
  assert.deepEqual(
    merged.filter((item) => !item.isPersistent).map((item) => item.id),
    ["ordinary-soon", "ordinary-later"],
  );
  assert.deepEqual(
    mergePersistentBookingActivities(items).map((item) => item.id),
    merged.map((item) => item.id),
  );
});

test("equal booking times use stable ids and pagination does not repeat or omit spaces", () => {
  const items = Array.from({ length: 30 }, (_, index) => ({
    id: `item-${String(index).padStart(2, "0")}`,
    isPersistent: index % 3 === 0,
    createdAt: day((index % 9) + 1),
    lastBookingAt: index % 3 === 0 ? day(7) : null,
  }));
  const sorted = mergePersistentBookingActivities(items);
  const pages = [0, 8, 16, 24].flatMap((offset) =>
    sorted.slice(offset, offset + 8),
  );
  assert.deepEqual(
    pages.map((item) => item.id),
    sorted.map((item) => item.id),
  );
  assert.equal(new Set(pages.map((item) => item.id)).size, 30);
  const persistent = sorted
    .filter((item) => item.isPersistent)
    .map((item) => item.id);
  assert.deepEqual(persistent, [...persistent].sort());
});

test("active store owners remain discoverable with a legacy false booking-access flag", () => {
  // Match the scalar and relation requirements of the actual discovery query
  // against records, including historical values that must no longer gate access.
  const matchesRequirements = (
    record: Record<string, unknown>,
    requirements: Record<string, unknown>,
  ): boolean =>
    Object.entries(requirements).every(([field, expected]) => {
      if (field === "is")
        return matchesRequirements(record, expected as Record<string, unknown>);
      const actual = record[field];
      return expected && typeof expected === "object"
        ? Boolean(
            actual &&
            typeof actual === "object" &&
            matchesRequirements(
              actual as Record<string, unknown>,
              expected as Record<string, unknown>,
            ),
          )
        : actual === expected;
    });
  const activity = {
    isPersistent: true,
    source: "MERCHANT_BOOKING",
    status: "RECRUITING",
    visibility: "PUBLIC",
    organizer: { status: "ACTIVE" },
    merchant: {
      isActive: true,
      bookingAccessEnabled: false,
      owner: { status: "ACTIVE" },
    },
    merchantBookingSettings: { enabled: true },
  };
  const where = getPersistentBookingActivityWhere();
  assert.equal(matchesRequirements(activity, where), true);
  assert.equal(
    matchesRequirements(
      { ...activity, merchant: { ...activity.merchant, isActive: false } },
      where,
    ),
    false,
  );
  assert.equal(
    matchesRequirements(
      {
        ...activity,
        merchant: { ...activity.merchant, owner: { status: "SUSPENDED" } },
      },
      where,
    ),
    false,
  );
  assert.equal(
    matchesRequirements(
      { ...activity, merchantBookingSettings: { enabled: false } },
      where,
    ),
    false,
  );
  assert.equal(
    matchesRequirements({ ...activity, visibility: "PRIVATE" }, where),
    false,
  );
});

test("ordinary activity management cannot mutate a persistent store space", async () => {
  let found = false;
  const db = {
    activity: {
      findUnique: async () => {
        found = true;
        return {
          organizerId: "owner",
          isPersistent: true,
          source: "MERCHANT_BOOKING",
          coManagers: [],
        };
      },
    },
  };
  assert.equal(
    await getActivityManagementRole(
      "space",
      "owner",
      db as unknown as Prisma.TransactionClient,
    ),
    "NONE",
  );
  assert.ok(found);
  assert.equal(
    isPersistentBookingActivity({ source: "MERCHANT_BOOKING" }),
    true,
  );
  assert.equal(isPersistentBookingActivity({ isPersistent: true }), true);
  assert.equal(
    isPersistentBookingActivity({ source: "MERCHANT_RESIDENCY" }),
    false,
  );
});
