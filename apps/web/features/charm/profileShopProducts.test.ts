import assert from "node:assert/strict";
import test from "node:test";
import {
  getProfileShopProductId,
  getWerewolfAllRolesShopPath,
  werewolfAllRolesProductId,
} from "./profileShopProducts";

test("normalizes the supported profile shop product", () => {
  assert.equal(
    getProfileShopProductId(werewolfAllRolesProductId),
    werewolfAllRolesProductId,
  );
  assert.equal(
    getProfileShopProductId([werewolfAllRolesProductId, "ignored"]),
    werewolfAllRolesProductId,
  );
});

test("rejects unsupported profile shop products", () => {
  assert.equal(getProfileShopProductId("unknown"), null);
  assert.equal(getProfileShopProductId(undefined), null);
});

test("builds the direct role unlock recharge path", () => {
  assert.equal(
    getWerewolfAllRolesShopPath(),
    "/profile/shop?product=werewolf-all-roles&recharge=1",
  );
});
