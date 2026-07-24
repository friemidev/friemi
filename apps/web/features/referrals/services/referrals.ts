import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { withLocale } from "@/lib/routes";

export type ReferralConsumeResult =
  | {
      consumed: true;
      referralId: string;
    }
  | {
      consumed: false;
      reason:
        | "ALREADY_ATTRIBUTED"
        | "INVALID_CODE"
        | "INVITER_NOT_FOUND"
        | "SELF_REFERRAL";
    };

const referralCodePattern = /^\d{6}$/;

function getReferralBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.CANONICAL_SITE_URL?.trim() ||
    ""
  ).replace(/\/$/, "");
}

export function normalizeReferralCode(value: string | null | undefined) {
  const normalized = value?.trim().replace(/^@/, "") ?? "";

  return referralCodePattern.test(normalized) ? normalized : null;
}

export function buildReferralLink(locale: string, friendCode: string) {
  const normalizedCode = normalizeReferralCode(friendCode);

  if (!normalizedCode) {
    return null;
  }

  const path = `${withLocale(locale, "/sign-up")}?ref=${encodeURIComponent(
    normalizedCode,
  )}`;
  const baseUrl = getReferralBaseUrl();

  return baseUrl ? `${baseUrl}${path}` : path;
}

export function captureReferralCodeFromRequest(ref: string | null | undefined) {
  const rawRef = ref?.trim();

  if (!rawRef) {
    return null;
  }

  const directCode = normalizeReferralCode(rawRef);

  if (directCode) {
    return directCode;
  }

  try {
    const parsedUrl = new URL(rawRef, "https://friemi.local");

    return (
      normalizeReferralCode(parsedUrl.searchParams.get("ref")) ??
      normalizeReferralCode(parsedUrl.searchParams.get("friendCode"))
    );
  } catch {
    return normalizeReferralCode(rawRef);
  }
}

export async function consumeReferralCodeOnProfileCreate(
  profileId: string,
  ref: string | null | undefined,
): Promise<ReferralConsumeResult> {
  const inviteCode = captureReferralCodeFromRequest(ref);

  if (!inviteCode) {
    return {
      consumed: false,
      reason: "INVALID_CODE",
    };
  }

  const existingReferral = await prisma.userReferral.findUnique({
    where: {
      inviteeId: profileId,
    },
    select: {
      id: true,
    },
  });

  if (existingReferral) {
    return {
      consumed: false,
      reason: "ALREADY_ATTRIBUTED",
    };
  }

  const inviter = await prisma.userProfile.findFirst({
    where: {
      friendCode: inviteCode,
      status: "ACTIVE",
    },
    select: {
      id: true,
    },
  });

  if (!inviter) {
    return {
      consumed: false,
      reason: "INVITER_NOT_FOUND",
    };
  }

  if (inviter.id === profileId) {
    return {
      consumed: false,
      reason: "SELF_REFERRAL",
    };
  }

  try {
    const referral = await prisma.userReferral.create({
      data: {
        inviteCode,
        inviteeId: profileId,
        inviterId: inviter.id,
      },
      select: {
        id: true,
      },
    });

    return {
      consumed: true,
      referralId: referral.id,
    };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return {
        consumed: false,
        reason: "ALREADY_ATTRIBUTED",
      };
    }

    throw error;
  }
}

export async function getReferralStats(inviterId: string) {
  const [invitedCount, friendshipAcceptedCount, firstParticipationCount, rows] =
    await Promise.all([
      prisma.userReferral.count({
        where: {
          inviterId,
        },
      }),
      prisma.userReferral.count({
        where: {
          friendshipAcceptedAt: {
            not: null,
          },
          inviterId,
        },
      }),
      prisma.userReferral.count({
        where: {
          firstParticipationAt: {
            not: null,
          },
          inviterId,
        },
      }),
      prisma.userReferral.findMany({
        where: {
          inviterId,
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 20,
        select: {
          id: true,
          createdAt: true,
          firstParticipationAt: true,
          friendshipAcceptedAt: true,
          invitee: {
            select: {
              id: true,
              avatarUrl: true,
              friendCode: true,
              nickname: true,
            },
          },
        },
      }),
    ]);

  return {
    firstParticipationCount,
    friendshipAcceptedCount,
    invitedCount,
    recentReferrals: rows.map((row) => ({
      id: row.id,
      createdAt: row.createdAt.toISOString(),
      firstParticipationAt: row.firstParticipationAt?.toISOString() ?? null,
      friendshipAcceptedAt: row.friendshipAcceptedAt?.toISOString() ?? null,
      invitee: {
        id: row.invitee.id,
        avatarUrl: row.invitee.avatarUrl,
        friendCode: row.invitee.friendCode,
        nickname: row.invitee.nickname.trim() || row.invitee.friendCode || "NF",
      },
    })),
  };
}

export async function markReferralFirstParticipation(inviteeId: string) {
  return prisma.userReferral.updateMany({
    where: {
      firstParticipationAt: null,
      inviteeId,
    },
    data: {
      firstParticipationAt: new Date(),
    },
  });
}

export async function markReferralFriendshipAccepted(
  inviterId: string,
  inviteeId: string,
) {
  return prisma.userReferral.updateMany({
    where: {
      friendshipAcceptedAt: null,
      inviteeId,
      inviterId,
    },
    data: {
      friendshipAcceptedAt: new Date(),
    },
  });
}

export async function markReferralFriendshipAcceptedBetween(
  profileId: string,
  otherProfileId: string,
) {
  const [forward, reverse] = await Promise.all([
    markReferralFriendshipAccepted(profileId, otherProfileId),
    markReferralFriendshipAccepted(otherProfileId, profileId),
  ]);

  return {
    updatedCount: forward.count + reverse.count,
  };
}
