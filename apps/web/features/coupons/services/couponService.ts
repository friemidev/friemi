import { Prisma } from "@prisma/client";
import { createNotifications } from "@/features/notifications/utils/createNotification";
import { prisma } from "@/lib/prisma";
import {
  createCouponToken,
  createMerchantSlug,
  defaultCouponDescription,
  defaultCouponSlug,
  defaultCouponTerms,
  defaultCouponTitle,
} from "../couponDefaults";

export type ClaimCouponResult =
  | { itemId: string; status: "CLAIMED" | "ALREADY_CLAIMED" }
  | { status: "INVALID" | "OWN_STORE" | "UNAVAILABLE" };

export type RedeemCouponResult =
  | { itemId: string; status: "REDEEMED" }
  | {
      itemId?: string;
      status: "ALREADY_REDEEMED" | "FORBIDDEN" | "INVALID" | "UNAVAILABLE";
    };

export async function ensureDefaultMerchantCoupon(
  merchantId: string,
  tx: Prisma.TransactionClient | typeof prisma = prisma,
) {
  return tx.coupon.upsert({
    where: {
      merchantId_slug: {
        merchantId,
        slug: defaultCouponSlug,
      },
    },
    create: {
      claimToken: createCouponToken(),
      description: defaultCouponDescription,
      merchantId,
      slug: defaultCouponSlug,
      terms: defaultCouponTerms,
      title: defaultCouponTitle,
    },
    update: {},
  });
}

export async function promoteProfileToMerchant(profileId: string) {
  return prisma.$transaction(async (tx) => {
    const profile = await tx.userProfile.findFirst({
      where: {
        id: profileId,
        status: "ACTIVE",
      },
      select: {
        friendCode: true,
        homeCity: true,
        id: true,
        nickname: true,
        ownedMerchant: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!profile) {
      throw new Error("PROFILE_NOT_FOUND");
    }

    if (profile.ownedMerchant) {
      await ensureDefaultMerchantCoupon(profile.ownedMerchant.id, tx);
      return tx.merchant.findUniqueOrThrow({
        where: { id: profile.ownedMerchant.id },
        include: {
          owner: {
            select: {
              email: true,
              friendCode: true,
              id: true,
              nickname: true,
            },
          },
          _count: { select: { activities: true } },
        },
      });
    }

    const merchant = await tx.merchant.create({
      data: {
        city: profile.homeCity?.trim() || "Paris",
        description: "欢迎来到我的 Friemi 门店。",
        name: `${profile.nickname}的门店`,
        ownerProfileId: profile.id,
        slug: createMerchantSlug(profile.id, profile.nickname),
      },
      include: {
        owner: {
          select: {
            email: true,
            friendCode: true,
            id: true,
            nickname: true,
          },
        },
        _count: { select: { activities: true } },
      },
    });

    await ensureDefaultMerchantCoupon(merchant.id, tx);
    return merchant;
  });
}

function couponIsAvailable(coupon: {
  expiresAt: Date | null;
  isActive: boolean;
  validFrom: Date | null;
}) {
  const now = Date.now();

  return (
    coupon.isActive &&
    (!coupon.validFrom || coupon.validFrom.getTime() <= now) &&
    (!coupon.expiresAt || coupon.expiresAt.getTime() > now)
  );
}

export async function claimCouponByToken({
  claimToken,
  profileId,
}: {
  claimToken: string;
  profileId: string;
}): Promise<ClaimCouponResult> {
  const token = claimToken.trim();

  if (!token) return { status: "INVALID" };

  return prisma.$transaction(async (tx) => {
    const coupon = await tx.coupon.findUnique({
      where: { claimToken: token },
      include: {
        merchant: {
          select: {
            id: true,
            isActive: true,
            name: true,
            ownerProfileId: true,
          },
        },
      },
    });

    if (!coupon) return { status: "INVALID" } as const;
    if (!coupon.merchant.isActive || !couponIsAvailable(coupon)) {
      return { status: "UNAVAILABLE" } as const;
    }
    if (coupon.merchant.ownerProfileId === profileId) {
      return { status: "OWN_STORE" } as const;
    }

    const existing = await tx.couponWalletItem.findUnique({
      where: {
        couponId_ownerProfileId: {
          couponId: coupon.id,
          ownerProfileId: profileId,
        },
      },
      select: { id: true },
    });

    if (existing) {
      return { itemId: existing.id, status: "ALREADY_CLAIMED" } as const;
    }

    const item = await tx.couponWalletItem.create({
      data: {
        couponId: coupon.id,
        ownerProfileId: profileId,
        redemptionToken: createCouponToken(),
      },
      select: { id: true },
    });
    const notifications: Parameters<typeof createNotifications>[1] = [
      {
        actorDisplayName: coupon.merchant.name,
        actorId: coupon.merchant.ownerProfileId,
        couponWalletItemId: item.id,
        occurrenceId: item.id,
        recipientId: profileId,
        type: "COUPON_RECEIVED" as const,
      },
    ];

    if (coupon.merchant.ownerProfileId) {
      notifications.push({
        actorDisplayName: null,
        actorId: profileId,
        couponWalletItemId: item.id,
        occurrenceId: item.id,
        recipientId: coupon.merchant.ownerProfileId,
        type: "COUPON_CLAIMED",
      });
    }

    await createNotifications(tx, notifications);
    return { itemId: item.id, status: "CLAIMED" } as const;
  });
}

export async function getCouponRedemptionPreview({
  profileId,
  redemptionToken,
}: {
  profileId: string;
  redemptionToken: string;
}) {
  const item = await prisma.couponWalletItem.findUnique({
    where: { redemptionToken: redemptionToken.trim() },
    select: {
      id: true,
      status: true,
      claimedAt: true,
      redeemedAt: true,
      owner: {
        select: {
          avatarUrl: true,
          nickname: true,
        },
      },
      coupon: {
        select: {
          description: true,
          expiresAt: true,
          title: true,
          merchant: {
            select: {
              id: true,
              isActive: true,
              name: true,
              ownerProfileId: true,
            },
          },
        },
      },
    },
  });

  if (!item) return null;
  if (item.coupon.merchant.ownerProfileId !== profileId) return null;

  return {
    ...item,
    isAvailable:
      item.status === "AVAILABLE" &&
      item.coupon.merchant.isActive &&
      (!item.coupon.expiresAt || item.coupon.expiresAt.getTime() > Date.now()),
  };
}

export async function redeemCouponByToken({
  profileId,
  redemptionToken,
}: {
  profileId: string;
  redemptionToken: string;
}): Promise<RedeemCouponResult> {
  const token = redemptionToken.trim();

  if (!token) return { status: "INVALID" };

  return prisma.$transaction(async (tx) => {
    const item = await tx.couponWalletItem.findUnique({
      where: { redemptionToken: token },
      include: {
        coupon: {
          include: {
            merchant: {
              select: {
                isActive: true,
                name: true,
                ownerProfileId: true,
              },
            },
          },
        },
        owner: {
          select: {
            id: true,
            nickname: true,
          },
        },
      },
    });

    if (!item) return { status: "INVALID" } as const;
    if (item.coupon.merchant.ownerProfileId !== profileId) {
      return { itemId: item.id, status: "FORBIDDEN" } as const;
    }
    if (item.status === "REDEEMED") {
      return { itemId: item.id, status: "ALREADY_REDEEMED" } as const;
    }
    if (
      item.status !== "AVAILABLE" ||
      !item.coupon.merchant.isActive ||
      !couponIsAvailable(item.coupon)
    ) {
      return { itemId: item.id, status: "UNAVAILABLE" } as const;
    }

    const redeemedAt = new Date();
    const updated = await tx.couponWalletItem.updateMany({
      where: {
        id: item.id,
        status: "AVAILABLE",
      },
      data: {
        redeemedAt,
        redeemedByProfileId: profileId,
        status: "REDEEMED",
      },
    });

    if (updated.count === 0) {
      return { itemId: item.id, status: "ALREADY_REDEEMED" } as const;
    }

    await createNotifications(tx, [
      {
        actorDisplayName: item.coupon.merchant.name,
        actorId: profileId,
        couponWalletItemId: item.id,
        occurrenceId: item.id,
        recipientId: item.owner.id,
        type: "COUPON_REDEEMED",
      },
      {
        actorDisplayName: item.owner.nickname,
        actorId: item.owner.id,
        couponWalletItemId: item.id,
        occurrenceId: item.id,
        recipientId: profileId,
        type: "COUPON_REDEMPTION_COMPLETED",
      },
    ]);

    return { itemId: item.id, status: "REDEEMED" } as const;
  });
}
