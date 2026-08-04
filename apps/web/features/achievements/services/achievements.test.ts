import assert from "node:assert/strict";
import test from "node:test";
import {
  getAchievementProgressValue,
  resolveAchievementProgress,
  resolvePublicAchievementWallItems,
} from "./achievements";
import { achievementCatalog } from "../achievementCatalog";

test("achievement progress resolves the v2.5 launch achievements", () => {
  const progress = resolveAchievementProgress({
    snapshot: {
      hostedActivityCount: 20,
      isCoCreator: true,
      participationCount: 20,
      trustScore: 90,
    },
  });

  assert.equal(progress.length, 6);
  assert.ok(progress.every((item) => item.isUnlocked));
});

test("achievement progress keeps locked items partial", () => {
  const activeGuest = achievementCatalog.find(
    (achievement) => achievement.key === "active_guest_20",
  );

  assert.ok(activeGuest);
  assert.equal(
    getAchievementProgressValue(activeGuest, {
      hostedActivityCount: 0,
      isCoCreator: false,
      participationCount: 8,
      trustScore: 80,
    }),
    8,
  );

  const progress = resolveAchievementProgress({
    snapshot: {
      hostedActivityCount: 0,
      isCoCreator: false,
      participationCount: 8,
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
