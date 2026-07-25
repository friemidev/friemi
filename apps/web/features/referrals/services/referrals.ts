import { Prisma } from "@prisma/client";
import { getTrustScoreEventDelta } from "@/features/trust/trustScoreEvents";
import { prisma } from "@/lib/prisma";
export {
  buildReferralLink,
  buildReferralSignUpLink,
  captureReferralCodeFromRequest,
  normalizeReferralCode,
} from "../referralCode";
import { captureReferralCodeFromRequest } from "../referralCode";

type DbClient = typeof prisma | Prisma.TransactionClient;

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

async function consumeReferralCodeForProfile(
  profileId: string,
  ref: string | null | undefined,
  source: string,
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
        source,
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

export async function consumeReferralCodeOnProfileCreate(
  profileId: string,
  ref: string | null | undefined,
): Promise<ReferralConsumeResult> {
  return consumeReferralCodeForProfile(profileId, ref, "profile_create");
}

export async function bindReferralCodeToProfile(
  profileId: string,
  ref: string | null | undefined,
): Promise<ReferralConsumeResult> {
  return consumeReferralCodeForProfile(profileId, ref, "profile_invite_code");
}

export async function getReferralStats(profileId: string) {
  const [
    invitedCount,
    friendshipAcceptedCount,
    firstParticipationCount,
    rows,
    receivedReferral,
  ] = await Promise.all([
    prisma.userReferral.count({
      where: {
        inviterId: profileId,
      },
    }),
    prisma.userReferral.count({
      where: {
        friendshipAcceptedAt: {
          not: null,
        },
        inviterId: profileId,
      },
    }),
    prisma.userReferral.count({
      where: {
        firstParticipationAt: {
          not: null,
        },
        inviterId: profileId,
      },
    }),
    prisma.userReferral.findMany({
      where: {
        inviterId: profileId,
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
    prisma.userReferral.findUnique({
      where: {
        inviteeId: profileId,
      },
      select: {
        id: true,
        createdAt: true,
        inviter: {
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
    boundReferral: receivedReferral
      ? {
          id: receivedReferral.id,
          createdAt: receivedReferral.createdAt.toISOString(),
          inviter: {
            id: receivedReferral.inviter.id,
            avatarUrl: receivedReferral.inviter.avatarUrl,
            friendCode: receivedReferral.inviter.friendCode,
            nickname:
              receivedReferral.inviter.nickname.trim() ||
              receivedReferral.inviter.friendCode ||
              "NF",
          },
        }
      : null,
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
  const acceptedAt = new Date();
  const referrals = await prisma.$transaction(
    async (tx) => {
      const pendingReferrals = await tx.userReferral.findMany({
        where: {
          friendshipAcceptedAt: null,
          OR: [
            {
              inviteeId: otherProfileId,
              inviterId: profileId,
            },
            {
              inviteeId: profileId,
              inviterId: otherProfileId,
            },
          ],
        },
        select: {
          id: true,
          inviterId: true,
        },
      });

      if (pendingReferrals.length === 0) {
        return [];
      }

      await tx.userReferral.updateMany({
        where: {
          id: {
            in: pendingReferrals.map((referral) => referral.id),
          },
        },
        data: {
          friendshipAcceptedAt: acceptedAt,
        },
      });

      await Promise.all(
        pendingReferrals.map((referral) =>
          applyInviteFriendTrustScoreForReferral(tx, referral),
        ),
      );

      return pendingReferrals;
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    },
  );

  return {
    updatedCount: referrals.length,
  };
}

export function getReferralFriendTrustScoreNote(referralId: string) {
  return `Friend invite accepted:${referralId}`;
}

async function applyInviteFriendTrustScoreForReferral(
  db: DbClient,
  referral: {
    id: string;
    inviterId: string;
  },
) {
  const note = getReferralFriendTrustScoreNote(referral.id);
  const existingEvent = await db.trustScoreEvent.findFirst({
    where: {
      note,
      profileId: referral.inviterId,
      type: "INVITE_FRIEND",
    },
    select: {
      id: true,
    },
  });

  if (existingEvent) {
    return db.trustScoreEvent.update({
      where: {
        id: existingEvent.id,
      },
      data: {
        delta: getTrustScoreEventDelta("INVITE_FRIEND"),
        note,
      },
    });
  }

  return db.trustScoreEvent.create({
    data: {
      delta: getTrustScoreEventDelta("INVITE_FRIEND"),
      note,
      profileId: referral.inviterId,
      type: "INVITE_FRIEND",
    },
  });
}
