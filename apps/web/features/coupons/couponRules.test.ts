import assert from "node:assert/strict";
import test from "node:test";
import {
  isCouponAvailable,
  isCouponClaimCodeAvailable,
  isCouponRedemptionQrAvailable,
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
