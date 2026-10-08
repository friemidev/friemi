import { getCouponClaimAvailability } from "@/features/coupons/couponRules";
import { prisma } from "@/lib/prisma";

export async function getMerchantCouponDetail(profileId: string, couponId: string) {
  const merchant = await prisma.merchant.findFirst({
    where: { isActive: true, ownerProfileId: profileId },
    select: { id: true, name: true },
  });
  if (!merchant) return null;

  const coupon = await prisma.coupon.findFirst({
    where: {
      id: couponId,
      merchantId: merchant.id,
      distributionMode: "PUBLIC_QR",
    },
    select: {
      accentColor: true,
      backgroundColor: true,
      campaignStatus: true,
      claimToken: true,
      claimedCount: true,
      description: true,
      distributionMode: true,
      expiresAt: true,
      foregroundColor: true,
      id: true,
      quantityLimit: true,
      terms: true,
      title: true,
      validFrom: true,
      template: { select: { imageUrl: true } },
    },
  });
  if (!coupon) return null;
  const { template, ...campaign } = coupon;

  return {
    merchant,
    campaign: {
      ...campaign,
      claimAvailability: getCouponClaimAvailability(campaign),
      expiresAt: campaign.expiresAt?.toISOString() ?? null,
      imageUrl: template?.imageUrl ?? null,
      validFrom: campaign.validFrom?.toISOString() ?? null,
    },
  };
}
