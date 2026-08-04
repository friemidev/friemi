import assert from "node:assert/strict";
import test from "node:test";
import { getProfileShopGiftCatalog } from "./getProfileShop";

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
