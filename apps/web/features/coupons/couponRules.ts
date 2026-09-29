export function isCouponAvailable(
  coupon: {
    expiresAt: Date | null;
    isActive: boolean;
    validFrom: Date | null;
  },
  now = new Date(),
) {
  const currentTime = now.getTime();

  return (
    coupon.isActive &&
    (!coupon.validFrom || coupon.validFrom.getTime() <= currentTime) &&
    (!coupon.expiresAt || coupon.expiresAt.getTime() > currentTime)
  );
}

export type CouponClaimAvailability =
  | "AVAILABLE"
  | "EXPIRED"
  | "NOT_STARTED"
  | "SOLD_OUT"
  | "UNAVAILABLE"
  | "UNLISTED";

export function getCouponClaimAvailability(
  coupon: {
    campaignStatus: string;
    claimedCount: number;
    distributionMode: string;
    expiresAt: Date | null;
    quantityLimit: number | null;
    validFrom: Date | null;
  },
  now = new Date(),
): CouponClaimAvailability {
  if (coupon.distributionMode !== "PUBLIC_QR") return "UNAVAILABLE";
  if (coupon.campaignStatus !== "PUBLISHED") return "UNLISTED";
  if (coupon.validFrom && coupon.validFrom.getTime() > now.getTime()) {
    return "NOT_STARTED";
  }
  if (coupon.expiresAt && coupon.expiresAt.getTime() <= now.getTime()) {
    return "EXPIRED";
  }
  if (
    coupon.quantityLimit !== null &&
    coupon.claimedCount >= coupon.quantityLimit
  ) {
    return "SOLD_OUT";
  }

  return "AVAILABLE";
}

export function isCouponWalletItemUsable(
  item: {
    campaignExpiresAt: Date | null;
    campaignValidFrom: Date | null;
    merchantIsActive: boolean;
    walletStatus: string;
  },
  now = new Date(),
) {
  return (
    item.walletStatus === "AVAILABLE" &&
    item.merchantIsActive &&
    (!item.campaignValidFrom ||
      item.campaignValidFrom.getTime() <= now.getTime()) &&
    (!item.campaignExpiresAt ||
      item.campaignExpiresAt.getTime() > now.getTime())
  );
}

export function isCouponClaimCodeAvailable(status: string) {
  return status === "ACTIVE";
}

export function isCouponRedemptionQrAvailable({
  expiresAt,
  now = new Date(),
  walletStatus,
}: {
  expiresAt: Date | null;
  now?: Date;
  walletStatus: string;
}) {
  return (
    walletStatus === "AVAILABLE" &&
    Boolean(expiresAt && expiresAt.getTime() > now.getTime())
  );
}
