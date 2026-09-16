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

  await ensureDefaultMerchantCoupon(merchant.id);
  const [coupons, availableCount, redeemedCount, recentItems] =
    await Promise.all([
      prisma.coupon.findMany({
        where: { merchantId: merchant.id, isActive: true },
        orderBy: [{ createdAt: "asc" }],
        select: {
          accentColor: true,
          backgroundColor: true,
          description: true,
          expiresAt: true,
          foregroundColor: true,
          id: true,
          terms: true,
          title: true,
          claimCodes: {
            where: { status: "ACTIVE" },
            orderBy: { createdAt: "desc" },
            take: 1,
            select: { token: true },
          },
        },
      }),
      prisma.couponWalletItem.count({
        where: {
          coupon: { merchantId: merchant.id },
          status: "AVAILABLE",
        },
      }),
      prisma.couponWalletItem.count({
        where: {
          coupon: { merchantId: merchant.id },
          status: "REDEEMED",
        },
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
    coupons: coupons.map(({ claimCodes, ...coupon }) => ({
      ...coupon,
      activeClaimToken: claimCodes[0]?.token ?? null,
      expiresAt: coupon.expiresAt?.toISOString() ?? null,
    })),
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
