import { Prisma } from "@prisma/client";
import { createNotifications } from "@/features/notifications/utils/createNotification";
import { prisma } from "@/lib/prisma";
import {
  getCouponClaimAvailability,
  isCouponRedemptionQrAvailable,
  isCouponWalletItemUsable,
} from "../couponRules";
import {
  couponRedemptionQrLifetimeMinutes,
  createCouponToken,
  createMerchantSlug,
} from "../couponDefaults";
import {
  getPlatformCouponTemplate,
  platformCouponTemplates,
} from "../platformCouponTemplates";

export type ClaimCouponResult =
  | { itemId: string; status: "CLAIMED" }
  | {
      status:
        | "ALREADY_CLAIMED"
        | "EXPIRED"
        | "INVALID"
        | "NOT_STARTED"
        | "OWN_STORE"
        | "SOLD_OUT"
        | "UNAVAILABLE"
        | "UNLISTED";
    };

export type GenerateCouponClaimCodeResult =
  | { couponId: string; status: "GENERATED"; token: string }
  | { status: "FORBIDDEN" | "INVALID" | "UNAVAILABLE" };

export type GenerateCouponRedemptionTokenResult =
  | { expiresAt: Date; status: "GENERATED"; token: string }
  | { status: "FORBIDDEN" | "INVALID" | "UNAVAILABLE" };

export type RedeemCouponResult =
  | { itemId: string; status: "REDEEMED" }
  | {
      itemId?: string;
      status: "ALREADY_REDEEMED" | "FORBIDDEN" | "INVALID" | "UNAVAILABLE";
    };

export type CreateCouponCampaignInput = {
  description: string;
  expiresAt: Date;
  quantityLimit: number;
  templateId: string;
  terms: string | null;
  title: string;
  validFrom: Date | null;
};

export type CreateCouponCampaignResult =
  | { couponId: string; status: "CREATED"; token: string }
  | { status: "FORBIDDEN" | "INVALID" };

export type UnlistCouponCampaignResult =
  | { couponId: string; status: "UNLISTED" }
  | { status: "FORBIDDEN" | "INVALID" };

export type GrantFollowUpCouponResult =
  | { itemId: string; status: "GRANTED" }
  | {
      itemId?: string;
      status: "ALREADY_GRANTED" | "FORBIDDEN" | "INVALID" | "UNAVAILABLE";
    };

function isUniqueConstraintError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

async function upsertPlatformCouponTemplate(
  templateKey: string,
  tx: Prisma.TransactionClient | typeof prisma,
) {
  const template = getPlatformCouponTemplate(templateKey);
  if (!template) throw new Error("COUPON_TEMPLATE_NOT_FOUND");

  return tx.couponTemplate.upsert({
    where: { key: template.key },
    create: {
      accentColor: template.accentColor,
      backgroundColor: template.backgroundColor,
      defaultTerms: template.terms,
      description: template.description,
      foregroundColor: template.foregroundColor,
      imageUrl: template.imageUrl,
      key: template.key,
      slug: template.slug,
      title: template.title,
    },
    update: {
      accentColor: template.accentColor,
      backgroundColor: template.backgroundColor,
      defaultTerms: template.terms,
      description: template.description,
      foregroundColor: template.foregroundColor,
      imageUrl: template.imageUrl,
      isActive: true,
      slug: template.slug,
      title: template.title,
    },
    select: { id: true },
  });
}

export async function ensureDefaultMerchantCoupon(
  merchantId: string,
  tx: Prisma.TransactionClient | typeof prisma = prisma,
) {
  const template = await upsertPlatformCouponTemplate(
    platformCouponTemplates[0].key,
    tx,
  );

  return tx.merchantCouponTemplate.upsert({
    where: {
      merchantId_templateId: {
        merchantId,
        templateId: template.id,
      },
    },
    create: {
      merchantId,
      templateId: template.id,
    },
    update: { isActive: true },
    select: { id: true },
  });
}

export async function promoteProfileToMerchant(profileId: string) {
  return prisma.$transaction(async (tx) => {
    const profile = await tx.userProfile.findFirst({
      where: { id: profileId, status: "ACTIVE" },
      select: {
        friendCode: true,
        homeCity: true,
        id: true,
        nickname: true,
        ownedMerchant: { select: { id: true } },
      },
    });

    if (!profile) throw new Error("PROFILE_NOT_FOUND");

    if (profile.ownedMerchant) {
      await ensureDefaultMerchantCoupon(profile.ownedMerchant.id, tx);
      return tx.merchant.findUniqueOrThrow({
        where: { id: profile.ownedMerchant.id },
        include: {
          owner: {
            select: { email: true, friendCode: true, id: true, nickname: true },
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
          select: { email: true, friendCode: true, id: true, nickname: true },
        },
        _count: { select: { activities: true } },
      },
    });

    await ensureDefaultMerchantCoupon(merchant.id, tx);
    return merchant;
  });
}

export async function createCouponCampaign({
  input,
  profileId,
}: {
  input: CreateCouponCampaignInput;
  profileId: string;
}): Promise<CreateCouponCampaignResult> {
  if (
    !input.title.trim() ||
    !input.description.trim() ||
    input.quantityLimit <= 0 ||
    input.expiresAt.getTime() <= Date.now() ||
    (input.validFrom && input.validFrom.getTime() >= input.expiresAt.getTime())
  ) {
    return { status: "INVALID" };
  }

  return prisma.$transaction(async (tx) => {
    const binding = await tx.merchantCouponTemplate.findFirst({
      where: {
        isActive: true,
        templateId: input.templateId,
        merchant: { isActive: true, ownerProfileId: profileId },
        template: { isActive: true },
      },
      select: {
        merchantId: true,
        template: {
          select: {
            accentColor: true,
            backgroundColor: true,
            foregroundColor: true,
            slug: true,
          },
        },
      },
    });

    if (!binding) return { status: "FORBIDDEN" } as const;

    const token = createCouponToken();
    const slugSuffix = createCouponToken().slice(0, 10).toLowerCase();
    const coupon = await tx.coupon.create({
      data: {
        accentColor: binding.template.accentColor,
        backgroundColor: binding.template.backgroundColor,
        campaignStatus: "PUBLISHED",
        claimToken: token,
        description: input.description.trim(),
        distributionMode: "PUBLIC_QR",
        expiresAt: input.expiresAt,
        foregroundColor: binding.template.foregroundColor,
        isActive: true,
        merchantId: binding.merchantId,
        publishedAt: new Date(),
        quantityLimit: input.quantityLimit,
        slug: `${binding.template.slug}-${slugSuffix}`.slice(0, 64),
        templateId: input.templateId,
        terms: input.terms?.trim() || null,
        title: input.title.trim(),
        validFrom: input.validFrom,
      },
      select: { id: true },
    });

    return { couponId: coupon.id, status: "CREATED", token } as const;
  });
}

// Kept for existing callers. A published campaign now has one stable QR code.
export async function generateCouponClaimCode({
  couponId,
  profileId,
}: {
  couponId: string;
  profileId: string;
}): Promise<GenerateCouponClaimCodeResult> {
  if (!couponId.trim()) return { status: "INVALID" };

  return prisma.$transaction(async (tx) => {
    const coupon = await tx.coupon.findUnique({
      where: { id: couponId },
      include: {
        merchant: { select: { isActive: true, ownerProfileId: true } },
      },
    });

    if (!coupon) return { status: "INVALID" } as const;
    if (coupon.merchant.ownerProfileId !== profileId) {
      return { status: "FORBIDDEN" } as const;
    }
    if (
      !coupon.merchant.isActive ||
      getCouponClaimAvailability(coupon) !== "AVAILABLE"
    ) {
      return { status: "UNAVAILABLE" } as const;
    }

    const token = coupon.claimToken ?? createCouponToken();
    if (!coupon.claimToken) {
      await tx.coupon.update({
        where: { id: coupon.id },
        data: { claimToken: token },
      });
    }

    return { couponId: coupon.id, status: "GENERATED", token } as const;
  });
}

export async function unlistCouponCampaign({
  couponId,
  profileId,
}: {
  couponId: string;
  profileId: string;
}): Promise<UnlistCouponCampaignResult> {
  const updated = await prisma.coupon.updateMany({
    where: {
      id: couponId,
      merchant: { ownerProfileId: profileId },
      campaignStatus: "PUBLISHED",
      distributionMode: "PUBLIC_QR",
    },
    data: {
      campaignStatus: "UNLISTED",
      isActive: false,
      unlistedAt: new Date(),
    },
  });

  if (updated.count > 0) return { couponId, status: "UNLISTED" };

  const coupon = await prisma.coupon.findUnique({
    where: { id: couponId },
    select: { merchant: { select: { ownerProfileId: true } } },
  });
  if (!coupon) return { status: "INVALID" };
  return coupon.merchant.ownerProfileId === profileId
    ? { status: "INVALID" }
    : { status: "FORBIDDEN" };
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

  try {
    return await prisma.$transaction(async (tx) => {
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
      if (coupon.merchant.ownerProfileId === profileId) {
        return { status: "OWN_STORE" } as const;
      }
      if (!coupon.merchant.isActive) return { status: "UNAVAILABLE" } as const;

      const availability = getCouponClaimAvailability(coupon);
      if (availability !== "AVAILABLE")
        return { status: availability } as const;

      const existingClaim = await tx.couponCampaignClaim.findUnique({
        where: {
          couponId_userProfileId: {
            couponId: coupon.id,
            userProfileId: profileId,
          },
        },
        select: { walletItemId: true },
      });
      if (existingClaim) return { status: "ALREADY_CLAIMED" } as const;

      const inventory = await tx.coupon.updateMany({
        where: {
          id: coupon.id,
          campaignStatus: "PUBLISHED",
          distributionMode: "PUBLIC_QR",
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
          ...(coupon.quantityLimit === null
            ? {}
            : { claimedCount: { lt: coupon.quantityLimit } }),
        },
        data: { claimedCount: { increment: 1 } },
      });
      if (inventory.count === 0) return { status: "SOLD_OUT" } as const;

      const item = await tx.couponWalletItem.create({
        data: { couponId: coupon.id, ownerProfileId: profileId },
        select: { id: true },
      });
      await tx.couponCampaignClaim.create({
        data: {
          couponId: coupon.id,
          source: "PUBLIC_QR",
          userProfileId: profileId,
          walletItemId: item.id,
        },
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
  } catch (error) {
    if (isUniqueConstraintError(error)) return { status: "ALREADY_CLAIMED" };
    throw error;
  }
}

export async function generateCouponRedemptionToken({
  itemId,
  profileId,
}: {
  itemId: string;
  profileId: string;
}): Promise<GenerateCouponRedemptionTokenResult> {
  if (!itemId.trim()) return { status: "INVALID" };

  return prisma.$transaction(async (tx) => {
    const item = await tx.couponWalletItem.findUnique({
      where: { id: itemId },
      include: {
        coupon: { include: { merchant: { select: { isActive: true } } } },
      },
    });

    if (!item) return { status: "INVALID" } as const;
    if (item.ownerProfileId !== profileId)
      return { status: "FORBIDDEN" } as const;
    if (
      !isCouponWalletItemUsable({
        campaignExpiresAt: item.coupon.expiresAt,
        campaignValidFrom: item.coupon.validFrom,
        merchantIsActive: item.coupon.merchant.isActive,
        walletStatus: item.status,
      })
    ) {
      return { status: "UNAVAILABLE" } as const;
    }

    const token = createCouponToken();
    const expiresAt = new Date(
      Date.now() + couponRedemptionQrLifetimeMinutes * 60 * 1000,
    );
    await tx.couponWalletItem.update({
      where: { id: item.id },
      data: { redemptionToken: token, redemptionTokenExpiresAt: expiresAt },
    });

    return { expiresAt, status: "GENERATED", token } as const;
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
      redemptionTokenExpiresAt: true,
      followUpCampaign: {
        select: { walletItems: { select: { id: true }, take: 1 } },
      },
      owner: { select: { avatarUrl: true, nickname: true } },
      coupon: {
        select: {
          description: true,
          expiresAt: true,
          title: true,
          validFrom: true,
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
    followUpItemId: item.followUpCampaign?.walletItems[0]?.id ?? null,
    isAvailable:
      isCouponRedemptionQrAvailable({
        expiresAt: item.redemptionTokenExpiresAt,
        walletStatus: item.status,
      }) &&
      isCouponWalletItemUsable({
        campaignExpiresAt: item.coupon.expiresAt,
        campaignValidFrom: item.coupon.validFrom,
        merchantIsActive: item.coupon.merchant.isActive,
        walletStatus: item.status,
      }),
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
              select: { isActive: true, name: true, ownerProfileId: true },
            },
          },
        },
        owner: { select: { id: true, nickname: true } },
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
      !isCouponRedemptionQrAvailable({
        expiresAt: item.redemptionTokenExpiresAt,
        walletStatus: item.status,
      }) ||
      !isCouponWalletItemUsable({
        campaignExpiresAt: item.coupon.expiresAt,
        campaignValidFrom: item.coupon.validFrom,
        merchantIsActive: item.coupon.merchant.isActive,
        walletStatus: item.status,
      })
    ) {
      return { itemId: item.id, status: "UNAVAILABLE" } as const;
    }

    const redeemedAt = new Date();
    const updated = await tx.couponWalletItem.updateMany({
      where: {
        id: item.id,
        redemptionToken: token,
        redemptionTokenExpiresAt: { gt: redeemedAt },
        status: "AVAILABLE",
      },
      data: { redeemedAt, redeemedByProfileId: profileId, status: "REDEEMED" },
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

export async function grantFollowUpCoupon({
  profileId,
  redemptionItemId,
}: {
  profileId: string;
  redemptionItemId: string;
}): Promise<GrantFollowUpCouponResult> {
  if (!redemptionItemId.trim()) return { status: "INVALID" };

  try {
    return await prisma.$transaction(async (tx) => {
      const sourceItem = await tx.couponWalletItem.findUnique({
        where: { id: redemptionItemId },
        include: {
          followUpCampaign: {
            select: { walletItems: { select: { id: true }, take: 1 } },
          },
          coupon: {
            include: {
              merchant: {
                select: {
                  id: true,
                  isActive: true,
                  name: true,
                  ownerProfileId: true,
                },
              },
              template: { select: { id: true, isActive: true, slug: true } },
            },
          },
          owner: { select: { id: true } },
        },
      });

      if (!sourceItem) return { status: "INVALID" } as const;
      if (
        sourceItem.coupon.merchant.ownerProfileId !== profileId ||
        sourceItem.redeemedByProfileId !== profileId
      ) {
        return { status: "FORBIDDEN" } as const;
      }
      const existingItemId = sourceItem.followUpCampaign?.walletItems[0]?.id;
      if (existingItemId) {
        return { itemId: existingItemId, status: "ALREADY_GRANTED" } as const;
      }
      if (
        sourceItem.status !== "REDEEMED" ||
        !sourceItem.coupon.merchant.isActive ||
        (sourceItem.coupon.template && !sourceItem.coupon.template.isActive)
      ) {
        return { status: "UNAVAILABLE" } as const;
      }

      const now = new Date();
      const expiresAt =
        sourceItem.coupon.expiresAt && sourceItem.coupon.expiresAt > now
          ? sourceItem.coupon.expiresAt
          : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      const campaign = await tx.coupon.create({
        data: {
          accentColor: sourceItem.coupon.accentColor,
          backgroundColor: sourceItem.coupon.backgroundColor,
          campaignStatus: "PUBLISHED",
          claimedCount: 1,
          description: sourceItem.coupon.description,
          distributionMode: "DIRECT_GRANT",
          expiresAt,
          foregroundColor: sourceItem.coupon.foregroundColor,
          isActive: true,
          merchantId: sourceItem.coupon.merchant.id,
          publishedAt: now,
          quantityLimit: 1,
          slug: `${sourceItem.coupon.template?.slug ?? "coupon"}-gift-${createCouponToken()
            .slice(0, 8)
            .toLowerCase()}`.slice(0, 64),
          sourceRedemptionItemId: sourceItem.id,
          templateId: sourceItem.coupon.template?.id ?? null,
          terms: sourceItem.coupon.terms,
          title: sourceItem.coupon.title,
          validFrom: now,
        },
        select: { id: true },
      });
      const item = await tx.couponWalletItem.create({
        data: { couponId: campaign.id, ownerProfileId: sourceItem.owner.id },
        select: { id: true },
      });
      await tx.couponCampaignClaim.create({
        data: {
          couponId: campaign.id,
          source: "POST_REDEMPTION_GIFT",
          userProfileId: sourceItem.owner.id,
          walletItemId: item.id,
        },
      });
      await createNotifications(tx, [
        {
          actorDisplayName: sourceItem.coupon.merchant.name,
          actorId: profileId,
          couponWalletItemId: item.id,
          occurrenceId: campaign.id,
          recipientId: sourceItem.owner.id,
          type: "COUPON_RECEIVED",
        },
      ]);

      return { itemId: item.id, status: "GRANTED" } as const;
    });
  } catch (error) {
    if (!isUniqueConstraintError(error)) throw error;
    const existing = await prisma.coupon.findUnique({
      where: { sourceRedemptionItemId: redemptionItemId },
      select: { walletItems: { select: { id: true }, take: 1 } },
    });
    return {
      itemId: existing?.walletItems[0]?.id,
      status: "ALREADY_GRANTED",
    };
  }
}
