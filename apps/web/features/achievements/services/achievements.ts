import {
  Prisma,
  type ActivityStatus,
  type ActivityType,
  type ParticipantStatus,
} from "@prisma/client";
import { getActivityFloatingNow } from "@/features/activities/utils/activityDisplay";
import { getTrustScore } from "@/features/trust/trustScoreEvents";
import { prisma } from "@/lib/prisma";
import {
  achievementCatalog,
  isAchievementKey,
  maxEquippedAchievementCount,
  type AchievementDefinition,
  type AchievementKey,
} from "../achievementCatalog";

type DbClient = typeof prisma | Prisma.TransactionClient;

export type AchievementSource = {
  sourceId?: string | null;
  sourceType?: string | null;
};

export type AchievementProgressSnapshot = {
  authoredMomentCount: number;
  charmScore: number;
  completedHostedActivityCount: number;
  distinctGiftRecipientCount: number;
  hostedActivityCount: number;
  isCoCreator: boolean;
  participationCount: number;
  punctualAttendanceStreak: number;
  receivedGiftCount: number;
  successfulReferralCount: number;
  trustScore: number;
};

export type PunctualityParticipationRecord = {
  activity: {
    checkInSignalCount: number;
    startAt: Date;
    status: ActivityStatus;
    type: ActivityType;
  };
  cancelledAt: Date | null;
  checkedInAt: Date | null;
  checkInCancelledAt: Date | null;
  status: ParticipantStatus;
};

export type UserAchievementProgressItem = {
  definition: AchievementDefinition;
  isEquipped: boolean;
  isUnlocked: boolean;
  progress: number;
  target: number;
  unlockedAt: string | null;
};

export type PublicAchievementWallItem = {
  definition: AchievementDefinition;
  sourceId: string | null;
  sourceType: string | null;
  unlockedAt: string;
};

type PublicAchievementRecord = {
  achievementKey: string;
  sourceId: string | null;
  sourceType: string | null;
  unlockedAt: Date;
};

export class AchievementDomainError extends Error {
  code: "UNKNOWN_ACHIEVEMENT";

  constructor(code: "UNKNOWN_ACHIEVEMENT") {
    super(code);
    this.name = "AchievementDomainError";
    this.code = code;
  }
}

const participationAchievementStatuses: ParticipantStatus[] = [
  "APPROVED",
  "JOINED",
];
const punctualityLateCancellationWindowMs = 24 * 60 * 60 * 1000;
const punctualityTarget = 20;

function getEndedActivityWhere(now: Date): Prisma.ActivityWhereInput {
  const floatingNow = getActivityFloatingNow(now);
  const floatingDayStart = new Date(floatingNow);
  floatingDayStart.setUTCHours(0, 0, 0, 0);

  return {
    OR: [
      {
        status: "ENDED",
      },
      {
        endAt: {
          lte: floatingNow,
        },
      },
      {
        endAt: null,
        startAt: {
          lt: floatingDayStart,
        },
      },
    ],
  };
}

function getNoActivityCheckInSignalWhere(): Prisma.ActivityWhereInput {
  return {
    participants: {
      none: {
        OR: [
          {
            checkInCancelledAt: {
              not: null,
            },
          },
          {
            checkInRequestedAt: {
              not: null,
            },
          },
          {
            checkedInAt: {
              not: null,
            },
          },
        ],
      },
    },
  };
}

function clampProgress(progress: number, target: number) {
  return Math.max(0, Math.min(target, progress));
}

export function getPunctualAttendanceStreak(
  records: PunctualityParticipationRecord[],
) {
  let streak = 0;

  for (const record of records) {
    if (
      record.activity.status === "CANCELLED" ||
      record.activity.type === "PUBLIC_EVENT"
    ) {
      continue;
    }

    const cancelledTooLate =
      record.status === "CANCELLED" &&
      (!record.cancelledAt ||
        record.cancelledAt.getTime() >=
          record.activity.startAt.getTime() -
            punctualityLateCancellationWindowMs);

    if (record.checkInCancelledAt || cancelledTooLate) {
      break;
    }

    const attended =
      Boolean(record.checkedInAt) ||
      (participationAchievementStatuses.includes(record.status) &&
        record.activity.checkInSignalCount === 0);

    if (!attended) {
      if (
        record.status !== "CANCELLED" &&
        record.activity.checkInSignalCount > 0
      ) {
        break;
      }

      continue;
    }

    streak += 1;

    if (streak >= punctualityTarget) {
      return punctualityTarget;
    }
  }

  return streak;
}

export function getAchievementProgressValue(
  definition: AchievementDefinition,
  snapshot: AchievementProgressSnapshot,
) {
  if (definition.metric === "isCoCreator") {
    return snapshot.isCoCreator ? 1 : 0;
  }

  return snapshot[definition.metric];
}

export function resolveAchievementProgress({
  equippedKeys = new Set<AchievementKey>(),
  snapshot,
  unlockedAtByKey = new Map<AchievementKey, string>(),
}: {
  equippedKeys?: Set<AchievementKey>;
  snapshot: AchievementProgressSnapshot;
  unlockedAtByKey?: Map<AchievementKey, string>;
}) {
  return achievementCatalog.map((definition) => {
    const rawProgress = getAchievementProgressValue(definition, snapshot);
    const progress = clampProgress(rawProgress, definition.target);
    const unlockedAt = unlockedAtByKey.get(definition.key) ?? null;

    return {
      definition,
      isEquipped: equippedKeys.has(definition.key),
      isUnlocked: Boolean(unlockedAt) || rawProgress >= definition.target,
      progress,
      target: definition.target,
      unlockedAt,
    } satisfies UserAchievementProgressItem;
  });
}

async function getEquippedAchievementKeySet(db: DbClient, profileId: string) {
  const equippedAchievements = await db.userEquippedAchievement.findMany({
    where: {
      achievementKey: {
        in: achievementCatalog.map((achievement) => achievement.key),
      },
      profileId,
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: {
      achievementKey: true,
    },
    take: maxEquippedAchievementCount,
  });

  return new Set(
    equippedAchievements.flatMap((achievement) =>
      isAchievementKey(achievement.achievementKey)
        ? [achievement.achievementKey]
        : [],
    ),
  );
}

function getCompletedActivityWhere(
  now = new Date(),
): Prisma.ActivityWhereInput {
  const floatingNow = getActivityFloatingNow(now);
  const floatingDayStart = new Date(floatingNow);
  floatingDayStart.setUTCHours(0, 0, 0, 0);

  return {
    OR: [
      { status: "ENDED" },
      { endAt: { lte: floatingNow } },
      {
        endAt: null,
        startAt: { lt: floatingDayStart },
      },
    ],
  };
}

async function getActivityAchievementMetrics(db: DbClient, profileId: string) {
  const now = new Date();
  const completedActivityWhere = getCompletedActivityWhere(now);
  const [participationCount, completedHostedActivityCount, punctualityRecords] =
    await Promise.all([
      db.activityParticipant.count({
        where: {
          OR: [
            {
              checkedInAt: {
                not: null,
              },
            },
            {
              activity: {
                AND: [
                  getEndedActivityWhere(now),
                  getNoActivityCheckInSignalWhere(),
                ],
              },
            },
          ],
          status: {
            in: participationAchievementStatuses,
          },
          activity: {
            status: {
              not: "CANCELLED",
            },
            type: {
              not: "PUBLIC_EVENT",
            },
          },
          userProfileId: profileId,
        },
      }),
      db.activity.count({
        where: {
          AND: [completedActivityWhere],
          organizerId: profileId,
          status: {
            notIn: ["CANCELLED", "DRAFT"],
          },
          type: {
            not: "PUBLIC_EVENT",
          },
        },
      }),
      db.activityParticipant.findMany({
        where: {
          activity: {
            AND: [completedActivityWhere],
            status: {
              not: "CANCELLED",
            },
            type: {
              not: "PUBLIC_EVENT",
            },
          },
          status: {
            in: [...participationAchievementStatuses, "CANCELLED"],
          },
          userProfileId: profileId,
        },
        orderBy: [
          {
            activity: {
              startAt: "desc",
            },
          },
          { id: "desc" },
        ],
        take: 100,
        select: {
          cancelledAt: true,
          checkedInAt: true,
          checkInCancelledAt: true,
          status: true,
          activity: {
            select: {
              startAt: true,
              status: true,
              type: true,
              _count: {
                select: {
                  participants: {
                    where: {
                      OR: [
                        { checkInCancelledAt: { not: null } },
                        { checkInRequestedAt: { not: null } },
                        { checkedInAt: { not: null } },
                      ],
                    },
                  },
                },
              },
            },
          },
        },
      }),
    ]);

  return {
    completedHostedActivityCount,
    participationCount,
    punctualAttendanceStreak: getPunctualAttendanceStreak(
      punctualityRecords.map((record) => ({
        activity: {
          checkInSignalCount: record.activity._count.participants,
          startAt: record.activity.startAt,
          status: record.activity.status,
          type: record.activity.type,
        },
        cancelledAt: record.cancelledAt,
        checkedInAt: record.checkedInAt,
        checkInCancelledAt: record.checkInCancelledAt,
        status: record.status,
      })),
    ),
  };
}

async function getAchievementSnapshot(
  db: DbClient,
  profileId: string,
): Promise<AchievementProgressSnapshot> {
  const [
    profile,
    activityMetrics,
    hostedActivityCount,
    successfulReferralCount,
    authoredMomentCount,
    charmBalance,
    distinctGiftRecipients,
    trustScore,
  ] = await Promise.all([
    db.userProfile.findUnique({
      where: {
        id: profileId,
      },
      select: {
        isCoCreator: true,
      },
    }),
    getActivityAchievementMetrics(db, profileId),
    db.activity.count({
      where: {
        organizerId: profileId,
        status: {
          not: "DRAFT",
        },
        type: {
          not: "PUBLIC_EVENT",
        },
      },
    }),
    db.userReferral.count({
      where: {
        firstParticipationAt: {
          not: null,
        },
        inviterId: profileId,
      },
    }),
    db.moment.count({
      where: {
        authorId: profileId,
        deletedAt: null,
        resharedMomentId: null,
      },
    }),
    db.userCharmBalance.findUnique({
      where: {
        profileId,
      },
      select: {
        giftCount: true,
        score: true,
      },
    }),
    db.charmGiftEvent.groupBy({
      by: ["recipientProfileId"],
      where: {
        senderProfileId: profileId,
      },
      orderBy: {
        recipientProfileId: "asc",
      },
      take: 20,
      _count: {
        _all: true,
      },
    }),
    getTrustScore(db, profileId),
  ]);

  return {
    authoredMomentCount,
    charmScore: charmBalance?.score ?? 0,
    completedHostedActivityCount: activityMetrics.completedHostedActivityCount,
    distinctGiftRecipientCount: distinctGiftRecipients.length,
    hostedActivityCount,
    isCoCreator: Boolean(profile?.isCoCreator),
    participationCount: activityMetrics.participationCount,
    punctualAttendanceStreak: activityMetrics.punctualAttendanceStreak,
    receivedGiftCount: charmBalance?.giftCount ?? 0,
    successfulReferralCount,
    trustScore,
  };
}

async function getUnlockedAchievementMap(db: DbClient, profileId: string) {
  const achievements = await db.userAchievement.findMany({
    where: {
      profileId,
    },
    select: {
      achievementKey: true,
      unlockedAt: true,
    },
  });

  return new Map(
    achievements.flatMap((achievement) =>
      isAchievementKey(achievement.achievementKey)
        ? [
            [
              achievement.achievementKey,
              achievement.unlockedAt.toISOString(),
            ] as const,
          ]
        : [],
    ),
  );
}

export async function grantAchievement(
  profileId: string,
  achievementKey: AchievementKey,
  source: AchievementSource = {},
) {
  if (!isAchievementKey(achievementKey)) {
    throw new AchievementDomainError("UNKNOWN_ACHIEVEMENT");
  }

  const existingAchievement = await prisma.userAchievement.findUnique({
    where: {
      profileId_achievementKey: {
        achievementKey,
        profileId,
      },
    },
  });

  if (existingAchievement) {
    return {
      achievement: existingAchievement,
      created: false,
    };
  }

  try {
    const achievement = await prisma.userAchievement.create({
      data: {
        achievementKey,
        profileId,
        sourceId: source.sourceId ?? null,
        sourceType: source.sourceType ?? null,
      },
    });

    return {
      achievement,
      created: true,
    };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const achievement = await prisma.userAchievement.findUniqueOrThrow({
        where: {
          profileId_achievementKey: {
            achievementKey,
            profileId,
          },
        },
      });

      return {
        achievement,
        created: false,
      };
    }

    throw error;
  }
}

export async function syncContentContributorAchievement(profileId: string) {
  const authoredMomentCount = await prisma.moment.count({
    where: {
      authorId: profileId,
      deletedAt: null,
      resharedMomentId: null,
    },
  });

  if (authoredMomentCount < 50) return null;

  return grantAchievement(profileId, "content_contributor", {
    sourceType: "moment_count",
  });
}

export async function syncActivityAchievements(profileId: string) {
  const metrics = await getActivityAchievementMetrics(prisma, profileId);
  const grants: Array<Promise<unknown>> = [];

  if (metrics.participationCount >= 1) {
    grants.push(
      grantAchievement(profileId, "hello_world", {
        sourceType: "activity_participation",
      }),
    );
  }

  if (metrics.participationCount >= 20) {
    grants.push(
      grantAchievement(profileId, "active_guest_20", {
        sourceType: "activity_participation_count",
      }),
    );
  }

  if (metrics.completedHostedActivityCount >= 1) {
    grants.push(
      grantAchievement(profileId, "open_minded", {
        sourceType: "completed_hosted_activity",
      }),
    );
  }

  if (metrics.punctualAttendanceStreak >= punctualityTarget) {
    grants.push(
      grantAchievement(profileId, "punctuality_star", {
        sourceType: "attendance_streak",
      }),
    );
  }

  return Promise.all(grants);
}

export async function syncInvitationExpertAchievement(profileId: string) {
  const successfulReferralCount = await prisma.userReferral.count({
    where: {
      firstParticipationAt: {
        not: null,
      },
      inviterId: profileId,
    },
  });

  if (successfulReferralCount < 15) return null;

  return grantAchievement(profileId, "invitation_expert", {
    sourceType: "referral_count",
  });
}

export async function syncCharmGiftAchievements({
  recipientCharmScore,
  recipientGiftCount,
  recipientProfileId,
  senderProfileId,
}: {
  recipientCharmScore: number;
  recipientGiftCount: number;
  recipientProfileId: string;
  senderProfileId?: string | null;
}) {
  const grants: Array<Promise<unknown>> = [];

  if (recipientGiftCount >= 1) {
    grants.push(
      grantAchievement(recipientProfileId, "first_gift", {
        sourceType: "charm_gift",
      }),
    );
  }

  if (recipientCharmScore >= 1000) {
    grants.push(
      grantAchievement(recipientProfileId, "popularity_star", {
        sourceType: "charm_score",
      }),
    );
  }

  if (senderProfileId && senderProfileId !== recipientProfileId) {
    const distinctRecipients = await prisma.charmGiftEvent.groupBy({
      by: ["recipientProfileId"],
      where: {
        senderProfileId,
      },
      orderBy: {
        recipientProfileId: "asc",
      },
      take: 20,
      _count: {
        _all: true,
      },
    });

    if (distinctRecipients.length >= 20) {
      grants.push(
        grantAchievement(senderProfileId, "gift_ambassador", {
          sourceType: "gift_recipient_count",
        }),
      );
    }
  }

  return Promise.all(grants);
}

export async function syncProfileAchievements(profileId: string) {
  const [snapshot, unlockedAtByKey, equippedKeys] = await Promise.all([
    getAchievementSnapshot(prisma, profileId),
    getUnlockedAchievementMap(prisma, profileId),
    getEquippedAchievementKeySet(prisma, profileId),
  ]);
  const progressItems = resolveAchievementProgress({
    equippedKeys,
    snapshot,
    unlockedAtByKey,
  });
  const newlyUnlocked = [];
  const nextUnlockedAtByKey = new Map(unlockedAtByKey);

  for (const item of progressItems) {
    if (!item.unlockedAt && item.isUnlocked) {
      const result = await grantAchievement(profileId, item.definition.key, {
        sourceType: "sync",
      });

      newlyUnlocked.push(result);
      nextUnlockedAtByKey.set(
        item.definition.key,
        result.achievement.unlockedAt.toISOString(),
      );
    }
  }

  return {
    newlyUnlockedCount: newlyUnlocked.filter((result) => result.created).length,
    progress: resolveAchievementProgress({
      equippedKeys,
      snapshot,
      unlockedAtByKey: nextUnlockedAtByKey,
    }),
  };
}

export async function getAchievementProgress(profileId: string) {
  const [snapshot, unlockedAtByKey, equippedKeys] = await Promise.all([
    getAchievementSnapshot(prisma, profileId),
    getUnlockedAchievementMap(prisma, profileId),
    getEquippedAchievementKeySet(prisma, profileId),
  ]);

  return resolveAchievementProgress({
    equippedKeys,
    snapshot,
    unlockedAtByKey,
  });
}

export async function getPublicAchievementWall(profileId: string) {
  const equippedAchievements = await prisma.userEquippedAchievement.findMany({
    where: {
      achievementKey: {
        in: achievementCatalog.map((achievement) => achievement.key),
      },
      profileId,
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: {
      achievementKey: true,
    },
    take: maxEquippedAchievementCount,
  });
  const equippedKeys = equippedAchievements.flatMap((achievement) =>
    isAchievementKey(achievement.achievementKey)
      ? [achievement.achievementKey]
      : [],
  );

  if (equippedKeys.length === 0) {
    return [];
  }

  const achievements = await prisma.userAchievement.findMany({
    where: {
      achievementKey: {
        in: equippedKeys,
      },
      profileId,
    },
    select: {
      achievementKey: true,
      sourceId: true,
      sourceType: true,
      unlockedAt: true,
    },
    take: maxEquippedAchievementCount,
  });

  return resolvePublicAchievementWallItems({
    achievements,
    equippedKeys,
  });
}

export async function getUnlockedAchievementWall(profileId: string) {
  const achievements = await prisma.userAchievement.findMany({
    where: {
      achievementKey: {
        in: achievementCatalog.map((achievement) => achievement.key),
      },
      profileId,
    },
    select: {
      achievementKey: true,
      sourceId: true,
      sourceType: true,
      unlockedAt: true,
    },
  });
  const achievementsByKey = new Map(
    achievements.map((achievement) => [
      achievement.achievementKey,
      achievement,
    ]),
  );

  return achievementCatalog.flatMap((definition) => {
    const achievement = achievementsByKey.get(definition.key);

    if (!achievement) {
      return [];
    }

    return {
      definition,
      sourceId: achievement.sourceId,
      sourceType: achievement.sourceType,
      unlockedAt: achievement.unlockedAt.toISOString(),
    } satisfies PublicAchievementWallItem;
  });
}

export function resolvePublicAchievementWallItems({
  achievements,
  equippedKeys,
}: {
  achievements: PublicAchievementRecord[];
  equippedKeys: AchievementKey[];
}) {
  const achievementsByKey = new Map(
    achievements.map((achievement) => [
      achievement.achievementKey,
      achievement,
    ]),
  );
  const orderedAchievements = equippedKeys
    .slice(0, maxEquippedAchievementCount)
    .flatMap((key) => {
      const achievement = achievementsByKey.get(key);

      return achievement ? [achievement] : [];
    });

  return orderedAchievements.flatMap((achievement) => {
    if (!isAchievementKey(achievement.achievementKey)) {
      return [];
    }

    const definition = achievementCatalog.find(
      (item) => item.key === achievement.achievementKey,
    );

    if (!definition) {
      return [];
    }

    return {
      definition,
      sourceId: achievement.sourceId,
      sourceType: achievement.sourceType,
      unlockedAt: achievement.unlockedAt.toISOString(),
    } satisfies PublicAchievementWallItem;
  });
}
