import assert from "node:assert/strict";
import test from "node:test";
import {
  blindBoxFragmentExchangeCount,
  calculateCharmFromReceivedGifts,
  canRedeemBlindBoxFragments,
  charmGiftCatalog,
  getActiveCharmGifts,
  getCharmGiftDefinition,
  getCharmGiftLabel,
  getFriemiCheckCoinValue,
  getCharmLevel,
  getCharmLevelDescription,
  getCharmLevelLabel,
  getCharmProgress,
  initialFriemiCoinBalanceAmount,
  normalizeGiftQuantity,
  successfulActivityFragmentReward,
} from "./charm";

test("active charm gifts match the launch gift catalog values", () => {
  assert.equal(getCharmGiftDefinition("rose")?.charmValue, 5);
  assert.equal(getCharmGiftDefinition("rose")?.coinCost, 5);
  assert.equal(getCharmGiftDefinition("bouquet")?.charmValue, 12);
  assert.equal(getCharmGiftDefinition("bouquet")?.coinCost, 10);
  assert.equal(getCharmGiftDefinition("heart")?.charmValue, 40);
  assert.equal(getCharmGiftDefinition("heart")?.coinCost, 30);
  assert.equal(getCharmGiftDefinition("diamond")?.charmValue, 180);
  assert.equal(getCharmGiftDefinition("diamond")?.coinCost, 100);
  assert.equal(getCharmGiftDefinition("meal")?.charmValue, 25);
  assert.equal(getCharmGiftDefinition("board_game")?.charmValue, 25);
  assert.equal(getCharmGiftDefinition("werewolf_crystal")?.charmValue, 40);
  assert.equal(getCharmGiftDefinition("werewolf")?.charmValue, 40);
  assert.equal(getCharmGiftDefinition("movie")?.charmValue, 25);
  assert.equal(getCharmGiftDefinition("music")?.charmValue, 25);
  assert.equal(getCharmGiftDefinition("growth")?.charmValue, 25);
  assert.equal(getCharmGiftDefinition("art")?.charmValue, 25);
  assert.equal(getCharmGiftDefinition("travel")?.charmValue, 25);
  assert.equal(getCharmGiftDefinition("sports")?.charmValue, 25);
  assert.equal(getCharmGiftDefinition("birthday_cake")?.charmValue, 70);
  assert.equal(getCharmGiftDefinition("birthday_cake")?.coinCost, 50);
  assert.equal(getCharmGiftDefinition("halloween")?.charmValue, 40);
  assert.equal(getCharmGiftDefinition("christmas")?.charmValue, 40);
  assert.equal(getCharmGiftDefinition("spring_festival")?.charmValue, 40);
  assert.equal(getCharmGiftDefinition("fireworks")?.charmValue, 70);
});

test("werewolf gifts expose the current Chinese product names", () => {
  const seerGift = getCharmGiftDefinition("werewolf_crystal");
  const wolfGift = getCharmGiftDefinition("werewolf");

  assert.ok(seerGift);
  assert.ok(wolfGift);
  assert.equal(getCharmGiftLabel(seerGift, "zh-CN"), "真预言家");
  assert.equal(getCharmGiftLabel(wolfGift, "zh-CN"), "狼王之王");
});

test("negative gifts stay in the catalog but are disabled for launch", () => {
  assert.equal(getCharmGiftDefinition("egg")?.launchEnabled, false);
  assert.equal(getCharmGiftDefinition("egg")?.coinCost, 5);
  assert.equal(getCharmGiftDefinition("bomb")?.launchEnabled, false);
  assert.equal(getCharmGiftDefinition("bomb")?.coinCost, 20);
  assert.equal(getCharmGiftDefinition("police_car")?.launchEnabled, false);
  assert.equal(getCharmGiftDefinition("police_car")?.coinCost, 100);
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
    260,
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

test("charm levels expose localized user labels", () => {
  assert.equal(getCharmLevelLabel("SOLITUDE", "zh-CN"), "独行者");
  assert.equal(getCharmLevelLabel("CHARM", "zh-CN"), "心动者");
  assert.equal(getCharmLevelLabel("SUPERSTAR", "zh-CN"), "闪耀之星");
  assert.equal(getCharmLevelLabel("LEGEND", "zh-CN"), "人气传说");
  assert.equal(getCharmLevelLabel("FRIEMI_IDOL", "zh-CN"), "Friemi 顶流");
  assert.equal(getCharmLevelLabel("SOLITUDE", "en"), "Solitude");
  assert.equal(getCharmLevelLabel("SOLITUDE", "fr"), "Solitaire");
  assert.equal(getCharmLevelDescription("CHARM", "zh-CN"), "开始被更多人看见。");
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

test("welcome Friemi check redeems to Friemi coins", () => {
  assert.equal(initialFriemiCoinBalanceAmount, 100);
  assert.equal(getFriemiCheckCoinValue("WELCOME"), 500);
  assert.equal(getFriemiCheckCoinValue("WELCOME", 300), 300);
  assert.equal(getFriemiCheckCoinValue("BLIND_BOX"), 0);
});

test("blind box fragment redemption requires ten fragments", () => {
  assert.equal(canRedeemBlindBoxFragments(null), false);
  assert.equal(canRedeemBlindBoxFragments(9), false);
  assert.equal(canRedeemBlindBoxFragments(10), true);
  assert.equal(canRedeemBlindBoxFragments(10.9), true);
});
