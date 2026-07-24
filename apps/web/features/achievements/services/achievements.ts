import { Prisma, type ParticipantStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getTrustScore } from "@/features/trust/trustScoreEvents";
import {
  achievementCatalog,
  isAchievementKey,
  type AchievementDefinition,
  type AchievementKey,
} from "../achievementCatalog";

type DbClient = typeof prisma | Prisma.TransactionClient;

export type AchievementSource = {
  sourceId?: string | null;
  sourceType?: string | null;
};

export type AchievementProgressSnapshot = {
  hostedActivityCount: number;
  isCoCreator: boolean;
  participationCount: number;
  trustScore: number;
};

export type UserAchievementProgressItem = {
  definition: AchievementDefinition;
  isUnlocked: boolean;
  progress: number;
  target: number;
  unlockedAt: string | null;
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

function clampProgress(progress: number, target: number) {
  return Math.max(0, Math.min(target, progress));
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
  snapshot,
  unlockedAtByKey = new Map<AchievementKey, string>(),
}: {
  snapshot: AchievementProgressSnapshot;
  unlockedAtByKey?: Map<AchievementKey, string>;
}) {
  return achievementCatalog.map((definition) => {
    const rawProgress = getAchievementProgressValue(definition, snapshot);
    const progress = clampProgress(rawProgress, definition.target);
    const unlockedAt = unlockedAtByKey.get(definition.key) ?? null;

    return {
      definition,
      isUnlocked: Boolean(unlockedAt) || rawProgress >= definition.target,
      progress,
      target: definition.target,
      unlockedAt,
    } satisfies UserAchievementProgressItem;
  });
}

async function getAchievementSnapshot(
  db: DbClient,
  profileId: string,
): Promise<AchievementProgressSnapshot> {
  const [profile, participationCount, hostedActivityCount, trustScore] =
    await Promise.all([
      db.userProfile.findUnique({
        where: {
          id: profileId,
        },
        select: {
          isCoCreator: true,
        },
      }),
      db.activityParticipant.count({
        where: {
          userProfileId: profileId,
          status: {
            in: participationAchievementStatuses,
          },
          activity: {
            type: {
              not: "PUBLIC_EVENT",
            },
          },
        },
      }),
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
      getTrustScore(db, profileId),
    ]);

  return {
    hostedActivityCount,
    isCoCreator: Boolean(profile?.isCoCreator),
    participationCount,
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

export async function syncProfileAchievements(profileId: string) {
  const [snapshot, unlockedAtByKey] = await Promise.all([
    getAchievementSnapshot(prisma, profileId),
    getUnlockedAchievementMap(prisma, profileId),
  ]);
  const progressItems = resolveAchievementProgress({
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
      snapshot,
      unlockedAtByKey: nextUnlockedAtByKey,
    }),
  };
}

export async function getAchievementProgress(profileId: string) {
  const [snapshot, unlockedAtByKey] = await Promise.all([
    getAchievementSnapshot(prisma, profileId),
    getUnlockedAchievementMap(prisma, profileId),
  ]);

  return resolveAchievementProgress({
    snapshot,
    unlockedAtByKey,
  });
}

export async function getPublicAchievementWall(profileId: string) {
  const achievements = await prisma.userAchievement.findMany({
    where: {
      achievementKey: {
        in: achievementCatalog.map((achievement) => achievement.key),
      },
      profileId,
    },
    orderBy: {
      unlockedAt: "desc",
    },
    select: {
      achievementKey: true,
      sourceId: true,
      sourceType: true,
      unlockedAt: true,
    },
    take: 12,
  });

  return achievements.flatMap((achievement) => {
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
    };
  });
}
