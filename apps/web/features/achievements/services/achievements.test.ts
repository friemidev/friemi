import assert from "node:assert/strict";
import test from "node:test";
import {
  getAchievementProgressValue,
  getPunctualAttendanceStreak,
  resolveAchievementProgress,
  resolvePublicAchievementWallItems,
} from "./achievements";
import { achievementCatalog } from "../achievementCatalog";

test("achievement progress resolves confirmed and legacy achievements", () => {
  const progress = resolveAchievementProgress({
    snapshot: {
      authoredMomentCount: 50,
      charmScore: 1000,
      completedHostedActivityCount: 1,
      distinctGiftRecipientCount: 20,
      hostedActivityCount: 20,
      isCoCreator: true,
      participationCount: 20,
      punctualAttendanceStreak: 20,
      receivedGiftCount: 1,
      successfulReferralCount: 15,
      trustScore: 90,
    },
  });

  assert.equal(progress.length, 12);
  assert.ok(progress.every((item) => item.isUnlocked));
});

test("achievement progress keeps locked items partial", () => {
  const activeGuest = achievementCatalog.find(
    (achievement) => achievement.key === "active_guest_20",
  );

  assert.ok(activeGuest);
  assert.equal(
    getAchievementProgressValue(activeGuest, {
      authoredMomentCount: 4,
      charmScore: 200,
      completedHostedActivityCount: 0,
      distinctGiftRecipientCount: 3,
      hostedActivityCount: 0,
      isCoCreator: false,
      participationCount: 8,
      punctualAttendanceStreak: 2,
      receivedGiftCount: 1,
      successfulReferralCount: 2,
      trustScore: 80,
    }),
    8,
  );

  const progress = resolveAchievementProgress({
    snapshot: {
      authoredMomentCount: 4,
      charmScore: 200,
      completedHostedActivityCount: 0,
      distinctGiftRecipientCount: 3,
      hostedActivityCount: 0,
      isCoCreator: false,
      participationCount: 8,
      punctualAttendanceStreak: 2,
      receivedGiftCount: 1,
      successfulReferralCount: 2,
      trustScore: 80,
    },
  });
  const activeGuestProgress = progress.find(
    (item) => item.definition.key === "active_guest_20",
  );

  assert.equal(activeGuestProgress?.isUnlocked, false);
  assert.equal(activeGuestProgress?.progress, 8);
  assert.equal(activeGuestProgress?.target, 20);
});

test("punctuality streak counts attendance and stops at a late cancellation", () => {
  const startAt = new Date("2026-08-10T18:00:00.000Z");
  const attendedRecord = {
    activity: {
      checkInSignalCount: 1,
      startAt,
      status: "ENDED" as const,
      type: "USER_HOSTED" as const,
    },
    cancelledAt: null,
    checkedInAt: new Date("2026-08-10T18:05:00.000Z"),
    checkInCancelledAt: null,
    status: "APPROVED" as const,
  };
  const lateCancellation = {
    activity: {
      checkInSignalCount: 1,
      startAt: new Date("2026-08-01T18:00:00.000Z"),
      status: "ENDED" as const,
      type: "USER_HOSTED" as const,
    },
    cancelledAt: new Date("2026-08-01T10:00:00.000Z"),
    checkedInAt: null,
    checkInCancelledAt: null,
    status: "CANCELLED" as const,
  };

  assert.equal(
    getPunctualAttendanceStreak([
      attendedRecord,
      {
        ...attendedRecord,
        checkedInAt: null,
        activity: {
          ...attendedRecord.activity,
          checkInSignalCount: 0,
        },
      },
      lateCancellation,
      attendedRecord,
    ]),
    2,
  );
});

test("punctuality streak ignores organizer-cancelled plans and early cancellations", () => {
  const startAt = new Date("2026-08-10T18:00:00.000Z");

  assert.equal(
    getPunctualAttendanceStreak([
      {
        activity: {
          checkInSignalCount: 1,
          startAt,
          status: "CANCELLED",
          type: "USER_HOSTED",
        },
        cancelledAt: null,
        checkedInAt: null,
        checkInCancelledAt: null,
        status: "APPROVED",
      },
      {
        activity: {
          checkInSignalCount: 1,
          startAt,
          status: "ENDED",
          type: "USER_HOSTED",
        },
        cancelledAt: new Date("2026-08-08T12:00:00.000Z"),
        checkedInAt: null,
        checkInCancelledAt: null,
        status: "CANCELLED",
      },
      {
        activity: {
          checkInSignalCount: 1,
          startAt,
          status: "ENDED",
          type: "USER_HOSTED",
        },
        cancelledAt: null,
        checkedInAt: startAt,
        checkInCancelledAt: null,
        status: "JOINED",
      },
    ]),
    1,
  );
});

test("punctuality streak stops when a registered player misses required check-in", () => {
  const startAt = new Date("2026-08-10T18:00:00.000Z");

  assert.equal(
    getPunctualAttendanceStreak([
      {
        activity: {
          checkInSignalCount: 2,
          startAt,
          status: "ENDED",
          type: "USER_HOSTED",
        },
        cancelledAt: null,
        checkedInAt: startAt,
        checkInCancelledAt: null,
        status: "JOINED",
      },
      {
        activity: {
          checkInSignalCount: 2,
          startAt: new Date("2026-08-01T18:00:00.000Z"),
          status: "ENDED",
          type: "USER_HOSTED",
        },
        cancelledAt: null,
        checkedInAt: null,
        checkInCancelledAt: null,
        status: "APPROVED",
      },
      {
        activity: {
          checkInSignalCount: 0,
          startAt: new Date("2026-07-20T18:00:00.000Z"),
          status: "ENDED",
          type: "USER_HOSTED",
        },
        cancelledAt: null,
        checkedInAt: null,
        checkInCancelledAt: null,
        status: "APPROVED",
      },
    ]),
    1,
  );
});

test("public achievement wall only shows equipped achievements", () => {
  const wall = resolvePublicAchievementWallItems({
    achievements: [
      {
        achievementKey: "hello_world",
        sourceId: null,
        sourceType: null,
        unlockedAt: new Date("2026-07-01T00:00:00.000Z"),
      },
    ],
    equippedKeys: [],
  });

  assert.deepEqual(wall, []);
});

test("public achievement wall keeps equipped order and caps at three", () => {
  const wall = resolvePublicAchievementWallItems({
    achievements: [
      {
        achievementKey: "hello_world",
        sourceId: null,
        sourceType: null,
        unlockedAt: new Date("2026-07-01T00:00:00.000Z"),
      },
      {
        achievementKey: "open_minded",
        sourceId: "activity-1",
        sourceType: "activity",
        unlockedAt: new Date("2026-07-02T00:00:00.000Z"),
      },
      {
        achievementKey: "active_guest_20",
        sourceId: null,
        sourceType: null,
        unlockedAt: new Date("2026-07-03T00:00:00.000Z"),
      },
      {
        achievementKey: "host_20",
        sourceId: null,
        sourceType: null,
        unlockedAt: new Date("2026-07-04T00:00:00.000Z"),
      },
    ],
    equippedKeys: [
      "open_minded",
      "hello_world",
      "active_guest_20",
      "host_20",
    ],
  });

  assert.deepEqual(
    wall.map((item) => item.definition.key),
    ["open_minded", "hello_world", "active_guest_20"],
  );
});
