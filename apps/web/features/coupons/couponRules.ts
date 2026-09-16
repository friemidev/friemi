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
