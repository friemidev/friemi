import { randomBytes } from "node:crypto";

export const defaultCouponSlug = "default";
export const defaultCouponTitle = "Friemi 门店专享券";
export const defaultCouponDescription =
  "到店出示此券，可享受门店提供的专属优惠。具体权益以门店现场说明为准。";
export const defaultCouponTerms =
  "仅限绑定门店核销，不可转让或兑换现金。同一账号每期优惠券限领一次。";
export const couponRedemptionQrLifetimeMinutes = 10;
export const defaultCouponColors = {
  accent: "#F1F2E3",
  background: "#0F6D46",
  foreground: "#FFFFFF",
} as const;

export function createCouponToken() {
  return randomBytes(24).toString("base64url");
}

export function createMerchantSlug(profileId: string, nickname: string) {
  const normalizedName = nickname
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  const suffix = profileId.replace(/[^a-zA-Z0-9]/g, "").slice(-10);

  return `${normalizedName || "friemi-store"}-${suffix}`.slice(0, 64);
}
