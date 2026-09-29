import { getCouponClaimAvailability } from "@/features/coupons/couponRules";
import { prisma } from "@/lib/prisma";

export type MerchantStoreDashboardViewModel = NonNullable<
  Awaited<ReturnType<typeof getMerchantStoreDashboard>>
>;

export async function getMerchantStoreDashboard(profileId: string) {
  const merchant = await prisma.merchant.findFirst({
    where: { isActive: true, ownerProfileId: profileId },
    select: {
      address: true,
      city: true,
      description: true,
      id: true,
      logoUrl: true,
      name: true,
      slug: true,
    },
  });

  if (!merchant) return null;

  const [campaigns, availableCount, redeemedCount] = await Promise.all([
    prisma.coupon.findMany({
      where: {
        distributionMode: "PUBLIC_QR",
        merchantId: merchant.id,
      },
      orderBy: [{ createdAt: "desc" }],
      take: 100,
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
    }),
    prisma.couponWalletItem.count({
      where: { coupon: { merchantId: merchant.id }, status: "AVAILABLE" },
    }),
    prisma.couponWalletItem.count({
      where: { coupon: { merchantId: merchant.id }, status: "REDEEMED" },
    }),
  ]);

  return {
    campaigns: campaigns.map(({ template, ...campaign }) => ({
      ...campaign,
      claimAvailability: getCouponClaimAvailability(campaign),
      expiresAt: campaign.expiresAt?.toISOString() ?? null,
      imageUrl: template?.imageUrl ?? null,
      validFrom: campaign.validFrom?.toISOString() ?? null,
    })),
    merchant,
    stats: {
      availableCount,
      claimedCount: availableCount + redeemedCount,
      redeemedCount,
    },
  };
}
