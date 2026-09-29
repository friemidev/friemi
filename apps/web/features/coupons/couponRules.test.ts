import assert from "node:assert/strict";
import test from "node:test";
import {
  getCouponClaimAvailability,
  isCouponAvailable,
  isCouponClaimCodeAvailable,
  isCouponRedemptionQrAvailable,
  isCouponWalletItemUsable,
} from "./couponRules";

const now = new Date("2026-09-15T12:00:00.000Z");

test("coupon validity respects activation and time boundaries", () => {
  assert.equal(
    isCouponAvailable(
      {
        expiresAt: new Date("2026-09-15T12:10:00.000Z"),
        isActive: true,
        validFrom: new Date("2026-09-15T11:00:00.000Z"),
      },
      now,
    ),
    true,
  );
  assert.equal(
    isCouponAvailable(
      {
        expiresAt: now,
        isActive: true,
        validFrom: null,
      },
      now,
    ),
    false,
  );
});

test("only an active claim code can issue a wallet item", () => {
  assert.equal(isCouponClaimCodeAvailable("ACTIVE"), true);
  assert.equal(isCouponClaimCodeAvailable("CLAIMED"), false);
  assert.equal(isCouponClaimCodeAvailable("REVOKED"), false);
});

test("public campaign claiming enforces publication, dates, and inventory", () => {
  const campaign = {
    campaignStatus: "PUBLISHED",
    claimedCount: 9,
    distributionMode: "PUBLIC_QR",
    expiresAt: new Date("2026-09-16T12:00:00.000Z"),
    quantityLimit: 10,
    validFrom: new Date("2026-09-14T12:00:00.000Z"),
  };

  assert.equal(getCouponClaimAvailability(campaign, now), "AVAILABLE");
  assert.equal(
    getCouponClaimAvailability({ ...campaign, claimedCount: 10 }, now),
    "SOLD_OUT",
  );
  assert.equal(
    getCouponClaimAvailability(
      { ...campaign, campaignStatus: "UNLISTED" },
      now,
    ),
    "UNLISTED",
  );
});

test("unlisting a campaign does not invalidate an already claimed item", () => {
  assert.equal(
    isCouponWalletItemUsable(
      {
        campaignExpiresAt: new Date("2026-09-16T12:00:00.000Z"),
        campaignValidFrom: new Date("2026-09-14T12:00:00.000Z"),
        merchantIsActive: true,
        walletStatus: "AVAILABLE",
      },
      now,
    ),
    true,
  );
});

test("redemption QR requires an available wallet item and future expiry", () => {
  assert.equal(
    isCouponRedemptionQrAvailable({
      expiresAt: new Date("2026-09-15T12:10:00.000Z"),
      now,
      walletStatus: "AVAILABLE",
    }),
    true,
  );
  assert.equal(
    isCouponRedemptionQrAvailable({
      expiresAt: null,
      now,
      walletStatus: "AVAILABLE",
    }),
    false,
  );
  assert.equal(
    isCouponRedemptionQrAvailable({
      expiresAt: new Date("2026-09-15T12:10:00.000Z"),
      now,
      walletStatus: "REDEEMED",
    }),
    false,
  );
});
