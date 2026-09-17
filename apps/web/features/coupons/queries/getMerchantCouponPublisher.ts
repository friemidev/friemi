import { ensureDefaultMerchantCoupon } from "@/features/coupons/services/couponService";
import { prisma } from "@/lib/prisma";

export type MerchantCouponPublisherViewModel = NonNullable<
  Awaited<ReturnType<typeof getMerchantCouponPublisher>>
>;

export async function getMerchantCouponPublisher(profileId: string) {
  const merchant = await prisma.merchant.findFirst({
    where: { isActive: true, ownerProfileId: profileId },
    select: { id: true, name: true },
  });

  if (!merchant) return null;

  await ensureDefaultMerchantCoupon(merchant.id);
  const bindings = await prisma.merchantCouponTemplate.findMany({
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
  });

  return {
    merchant,
    templates: bindings.map(({ template }) => template),
  };
}
