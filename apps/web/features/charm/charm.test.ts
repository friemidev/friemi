import assert from "node:assert/strict";
import test from "node:test";
import {
  blindBoxFragmentExchangeCount,
  calculateCharmFromReceivedGifts,
  canRedeemBlindBoxFragments,
  charmGiftCatalog,
  getActiveCharmGifts,
  getCharmGiftDefinition,
  getCharmLevel,
  getCharmProgress,
  normalizeGiftQuantity,
  successfulActivityFragmentReward,
} from "./charm";

test("active charm gifts match the launch gift catalog values", () => {
  assert.equal(getCharmGiftDefinition("rose")?.charmValue, 5);
  assert.equal(getCharmGiftDefinition("bouquet")?.charmValue, 10);
  assert.equal(getCharmGiftDefinition("heart")?.charmValue, 30);
  assert.equal(getCharmGiftDefinition("diamond")?.charmValue, 100);
  assert.equal(getCharmGiftDefinition("meal")?.charmValue, 20);
  assert.equal(getCharmGiftDefinition("board_game")?.charmValue, 20);
  assert.equal(getCharmGiftDefinition("werewolf_crystal")?.charmValue, 30);
  assert.equal(getCharmGiftDefinition("werewolf")?.charmValue, 30);
  assert.equal(getCharmGiftDefinition("movie")?.charmValue, 20);
  assert.equal(getCharmGiftDefinition("music")?.charmValue, 20);
  assert.equal(getCharmGiftDefinition("growth")?.charmValue, 20);
  assert.equal(getCharmGiftDefinition("art")?.charmValue, 20);
  assert.equal(getCharmGiftDefinition("travel")?.charmValue, 20);
  assert.equal(getCharmGiftDefinition("sports")?.charmValue, 20);
  assert.equal(getCharmGiftDefinition("birthday_cake")?.charmValue, 50);
  assert.equal(getCharmGiftDefinition("halloween")?.charmValue, 30);
  assert.equal(getCharmGiftDefinition("christmas")?.charmValue, 30);
  assert.equal(getCharmGiftDefinition("spring_festival")?.charmValue, 30);
  assert.equal(getCharmGiftDefinition("fireworks")?.charmValue, 50);
});

test("negative gifts stay in the catalog but are disabled for launch", () => {
  assert.equal(getCharmGiftDefinition("egg")?.launchEnabled, false);
  assert.equal(getCharmGiftDefinition("bomb")?.launchEnabled, false);
  assert.equal(getCharmGiftDefinition("police_car")?.launchEnabled, false);
  assert.ok(
    !getActiveCharmGifts().some((gift) => gift.category === "negative"),
  );
});

test("seasonal gifts stay out of the default picker until triggered", () => {
  assert.ok(
    !getActiveCharmGifts().some((gift) => gift.category === "seasonal"),
  );
  assert.ok(
    getActiveCharmGifts({ includeSeasonal: true }).some(
      (gift) => gift.category === "seasonal",
    ),
  );
});

test("gift quantities are bounded before calculating charm", () => {
  assert.equal(normalizeGiftQuantity(undefined), 1);
  assert.equal(normalizeGiftQuantity(0), 1);
  assert.equal(normalizeGiftQuantity(1.8), 1);
  assert.equal(normalizeGiftQuantity(120), 99);
});

test("charm calculation only uses received gifts", () => {
  assert.equal(
    calculateCharmFromReceivedGifts([
      { giftId: "rose", quantity: 2 },
      { giftId: "diamond" },
      { giftId: "birthday_cake" },
    ]),
    160,
  );
});

test("charm levels resolve at product thresholds", () => {
  assert.equal(getCharmLevel(0).id, "SOLITUDE");
  assert.equal(getCharmLevel(499).id, "SOLITUDE");
  assert.equal(getCharmLevel(500).id, "CHARM");
  assert.equal(getCharmLevel(5000).id, "SUPERSTAR");
  assert.equal(getCharmLevel(10000).id, "LEGEND");
  assert.equal(getCharmLevel(100000).id, "FRIEMI_IDOL");
});

test("charm progress points to the next level", () => {
  const progress = getCharmProgress(250);

  assert.equal(progress.current.id, "SOLITUDE");
  assert.equal(progress.next?.id, "CHARM");
  assert.equal(progress.scoreToNextLevel, 250);
  assert.equal(progress.progressRatio, 0.5);
});

test("blind box fragment constants match the MVP rule", () => {
  assert.equal(successfulActivityFragmentReward, 1);
  assert.equal(blindBoxFragmentExchangeCount, 10);
  assert.ok(charmGiftCatalog.length >= 19);
});

test("blind box fragment redemption requires ten fragments", () => {
  assert.equal(canRedeemBlindBoxFragments(null), false);
  assert.equal(canRedeemBlindBoxFragments(9), false);
  assert.equal(canRedeemBlindBoxFragments(10), true);
  assert.equal(canRedeemBlindBoxFragments(10.9), true);
});
