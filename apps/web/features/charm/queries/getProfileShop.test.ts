import assert from "node:assert/strict";
import test from "node:test";
import {
  getProfileShopGiftCatalog,
  getProfileShopNegativeGiftCatalog,
} from "./getProfileShop";

test("profile shop hides negative gifts and keeps seasonal gifts locked", () => {
  const gifts = getProfileShopGiftCatalog("zh-CN");

  assert.ok(gifts.length > 0);
  assert.ok(gifts.every((gift) => gift.charmValue > 0));
  assert.ok(!gifts.map((gift) => String(gift.category)).includes("negative"));
  assert.ok(
    gifts
      .filter((gift) => gift.category === "seasonal")
      .every((gift) => gift.availability === "seasonal_locked"),
  );
});

test("profile shop localizes gift labels", () => {
  assert.equal(
    getProfileShopGiftCatalog("en").find((gift) => gift.id === "rose")?.label,
    "Rose",
  );
  assert.equal(
    getProfileShopGiftCatalog("fr").find((gift) => gift.id === "board_game")
      ?.label,
    "Jeu de societe",
  );
  assert.equal(
    getProfileShopGiftCatalog("zh-CN").find((gift) => gift.id === "diamond")
      ?.label,
    "钻石",
  );
});

test("profile shop exposes negative gifts as disabled display items", () => {
  const gifts = getProfileShopNegativeGiftCatalog("zh-CN");

  assert.deepEqual(
    gifts.map((gift) => gift.id),
    ["egg", "bomb", "police_car"],
  );
  assert.ok(gifts.every((gift) => gift.availability === "disabled"));
  assert.equal(gifts.find((gift) => gift.id === "bomb")?.coinCost, 20);
});
