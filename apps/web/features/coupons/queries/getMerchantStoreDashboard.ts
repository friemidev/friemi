import { ensureDefaultMerchantCoupon } from "@/features/coupons/services/couponService";
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

  await ensureDefaultMerchantCoupon(merchant.id);
  const [templates, campaigns, availableCount, redeemedCount, recentItems] =
    await Promise.all([
      prisma.merchantCouponTemplate.findMany({
        where: {
          isActive: true,
          merchantId: merchant.id,
          template: { isActive: true },
        },
        orderBy: { createdAt: "asc" },
        select: {
          template: {
            select: {
              accentColor: true,
              backgroundColor: true,
              defaultTerms: true,
              description: true,
              foregroundColor: true,
              id: true,
              imageUrl: true,
              title: true,
            },
          },
        },
      }),
      prisma.coupon.findMany({
        where: {
          distributionMode: "PUBLIC_QR",
          merchantId: merchant.id,
        },
        orderBy: [{ createdAt: "desc" }],
        take: 30,
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
      prisma.couponWalletItem.findMany({
        where: { coupon: { merchantId: merchant.id } },
        orderBy: [{ claimedAt: "desc" }],
        take: 8,
        select: {
          claimedAt: true,
          coupon: { select: { title: true } },
          id: true,
          redeemedAt: true,
          status: true,
          owner: { select: { avatarUrl: true, nickname: true } },
        },
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
    recentItems: recentItems.map((item) => ({
      ...item,
      claimedAt: item.claimedAt.toISOString(),
      redeemedAt: item.redeemedAt?.toISOString() ?? null,
    })),
    stats: {
      availableCount,
      claimedCount: availableCount + redeemedCount,
      redeemedCount,
    },
    templates: templates.map(({ template }) => template),
  };
}
