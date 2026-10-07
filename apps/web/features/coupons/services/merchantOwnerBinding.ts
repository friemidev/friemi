import type { Prisma } from "@prisma/client";

/** Bind an existing, active store without creating a second store for the user. */
export async function bindProfileToExistingMerchantInTransaction(
  tx: Prisma.TransactionClient,
  profileId: string,
  merchantId: string,
) {
  const profile = await tx.userProfile.findFirst({
    where: { id: profileId, status: "ACTIVE" },
    select: { ownedMerchant: { select: { id: true } } },
  });

  if (!profile) throw new Error("PROFILE_NOT_FOUND");
  if (profile.ownedMerchant) throw new Error("PROFILE_ALREADY_OWNS_MERCHANT");

  const merchant = await tx.merchant.findFirst({
    where: { id: merchantId, isActive: true },
    select: { ownerProfileId: true },
  });

  if (!merchant) throw new Error("MERCHANT_NOT_FOUND");
  if (merchant.ownerProfileId) throw new Error("MERCHANT_ALREADY_OWNED");

  // The conditional update also protects against another admin binding this
  // store between the read and write. The unique ownerProfileId constraint
  // protects against binding the same profile to two stores concurrently.
  const result = await tx.merchant.updateMany({
    where: { id: merchantId, isActive: true, ownerProfileId: null },
    data: { ownerProfileId: profileId },
  });
  if (result.count !== 1) throw new Error("MERCHANT_ALREADY_OWNED");

  return tx.merchant.findUniqueOrThrow({
    where: { id: merchantId },
    include: {
      owner: {
        select: { email: true, friendCode: true, id: true, nickname: true },
      },
      _count: { select: { activities: true } },
    },
  });
}
