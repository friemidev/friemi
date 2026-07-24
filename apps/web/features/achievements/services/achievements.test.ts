import assert from "node:assert/strict";
import test from "node:test";
import {
  getAchievementProgressValue,
  resolveAchievementProgress,
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
