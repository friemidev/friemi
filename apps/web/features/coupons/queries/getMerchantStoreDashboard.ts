import { ensureDefaultMerchantCoupon } from "@/features/coupons/services/couponService";
import { prisma } from "@/lib/prisma";

export type MerchantStoreDashboardViewModel = NonNullable<
  Awaited<ReturnType<typeof getMerchantStoreDashboard>>
>;

export async function getMerchantStoreDashboard(profileId: string) {
  const merchant = await prisma.merchant.findFirst({
    where: {
      isActive: true,
      ownerProfileId: profileId,
    },
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

  const coupon = await ensureDefaultMerchantCoupon(merchant.id);
  const [availableCount, redeemedCount, recentItems] = await Promise.all([
    prisma.couponWalletItem.count({
      where: { couponId: coupon.id, status: "AVAILABLE" },
    }),
    prisma.couponWalletItem.count({
      where: { couponId: coupon.id, status: "REDEEMED" },
    }),
    prisma.couponWalletItem.findMany({
      where: { couponId: coupon.id },
      orderBy: [{ claimedAt: "desc" }],
      take: 8,
      select: {
        claimedAt: true,
        id: true,
        redeemedAt: true,
        status: true,
        owner: {
          select: {
            avatarUrl: true,
            nickname: true,
          },
        },
      },
    }),
  ]);

  return {
    coupon: {
      claimToken: coupon.claimToken,
      description: coupon.description,
      expiresAt: coupon.expiresAt?.toISOString() ?? null,
      id: coupon.id,
      title: coupon.title,
    },
    merchant,
    stats: {
      availableCount,
      claimedCount: availableCount + redeemedCount,
      redeemedCount,
    },
    recentItems: recentItems.map((item) => ({
      ...item,
      claimedAt: item.claimedAt.toISOString(),
      redeemedAt: item.redeemedAt?.toISOString() ?? null,
    })),
  };
}
