import { prisma } from "@/lib/prisma";

export async function getMerchantStoreInfo(profileId: string) {
  return prisma.merchant.findFirst({
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
}
