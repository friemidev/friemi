import { Prisma } from "@prisma/client";
import type { ActivityCardViewModel } from "@/features/activities/types";
import { prisma } from "@/lib/prisma";

export type ActivityPriorityTargetTypeValue = "ACTIVITY" | "PUBLIC_EVENT";

export type ActivityPriorityTargetKey = {
  targetId: string;
  targetType: ActivityPriorityTargetTypeValue;
};

export type ActivityPriorityOverrideSnapshot = ActivityPriorityTargetKey & {
  boostExpiresAt: string | null;
  boostStartedAt: string;
  initialBoost: number;
};

export type ActivityPriorityScore = {
  activeBoost: number;
  bucket: "live" | "upcoming" | "ended";
  finalScore: number;
  timeScore: number;
};

const dayInMs = 24 * 60 * 60 * 1000;
const timeScoreWindowDays = 30;
const maxActivePriorityOverrides = 50;

function toTime(value: Date | string | null | undefined) {
  if (!value) {
    return Number.NaN;
  }

  return value instanceof Date ? value.getTime() : new Date(value).getTime();
}

function isMissingPriorityTableError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    (error.code === "P2021" || error.code === "P2022")
  );
}

export function getActivityPriorityTargetKey(
  card: Pick<ActivityCardViewModel, "id" | "publicEventId" | "type">,
): ActivityPriorityTargetKey {
  if (card.type === "PUBLIC_EVENT" && card.publicEventId) {
    return {
      targetId: card.publicEventId,
      targetType: "PUBLIC_EVENT",
    };
  }

  return {
    targetId: card.id,
    targetType: "ACTIVITY",
  };
}

export function getActivityPriorityKeyString(key: ActivityPriorityTargetKey) {
  return `${key.targetType}:${key.targetId}`;
}

export function serializeActivityPriorityOverride(row: {
  boostExpiresAt: Date | null;
  boostStartedAt: Date;
  initialBoost: number;
  targetId: string;
  targetType: ActivityPriorityTargetTypeValue;
}): ActivityPriorityOverrideSnapshot {
  return {
    boostExpiresAt: row.boostExpiresAt?.toISOString() ?? null,
    boostStartedAt: row.boostStartedAt.toISOString(),
    initialBoost: row.initialBoost,
    targetId: row.targetId,
    targetType: row.targetType,
  };
}

export function getActiveActivityPriorityBoost(
  override:
    | Pick<
        ActivityPriorityOverrideSnapshot,
        "boostExpiresAt" | "boostStartedAt" | "initialBoost"
      >
    | null
    | undefined,
  now = new Date(),
) {
  if (!override || override.initialBoost <= 0) {
    return 0;
  }

  const expiresAt = toTime(override.boostExpiresAt);

  if (Number.isFinite(expiresAt) && expiresAt <= now.getTime()) {
    return 0;
  }

  const startedAt = toTime(override.boostStartedAt);
  const elapsedDays = Number.isFinite(startedAt)
    ? Math.max(0, Math.floor((now.getTime() - startedAt) / dayInMs))
    : 0;

  return Math.max(0, override.initialBoost - elapsedDays);
}

export function getActivityPriorityScore(
  card: {
    endAt?: Date | string | null;
    startAt: Date | string;
    status: string;
  },
  override: ActivityPriorityOverrideSnapshot | null | undefined,
  now = new Date(),
): ActivityPriorityScore {
  const nowTime = now.getTime();
  const startTime = toTime(card.startAt);
  const endTime = toTime(card.endAt) || startTime;
  const isEnded =
    card.status === "ENDED" ||
    card.status === "CANCELLED" ||
    (Number.isFinite(endTime) && endTime <= nowTime);
  const isLive =
    !isEnded &&
    Number.isFinite(startTime) &&
    startTime <= nowTime &&
    Number.isFinite(endTime) &&
    endTime > nowTime;
  const bucket = isEnded ? "ended" : isLive ? "live" : "upcoming";
  let timeScore = 0;

  if (bucket === "live") {
    timeScore = 1;
  } else if (bucket === "upcoming" && Number.isFinite(startTime)) {
    const daysAway = Math.max(0, (startTime - nowTime) / dayInMs);
    timeScore = Math.max(0, 1 - daysAway / timeScoreWindowDays);
  }

  const activeBoost = isEnded
    ? 0
    : getActiveActivityPriorityBoost(override, now);

  return {
    activeBoost,
    bucket,
    finalScore: activeBoost > 0 ? activeBoost + 1 + timeScore : timeScore,
    timeScore,
  };
}

export function compareActivityPriorityCards(
  overridesByKey: Map<string, ActivityPriorityOverrideSnapshot>,
  now: Date,
  left: RankedActivityPriorityCard,
  right: RankedActivityPriorityCard,
) {
  const leftKey = getActivityPriorityTargetKey(left.card);
  const rightKey = getActivityPriorityTargetKey(right.card);
  const leftScore = getActivityPriorityScore(
    left.card,
    overridesByKey.get(getActivityPriorityKeyString(leftKey)),
    now,
  );
  const rightScore = getActivityPriorityScore(
    right.card,
    overridesByKey.get(getActivityPriorityKeyString(rightKey)),
    now,
  );
  const leftEnded = leftScore.bucket === "ended";
  const rightEnded = rightScore.bucket === "ended";

  if (leftEnded !== rightEnded) {
    return leftEnded ? 1 : -1;
  }

  if (leftScore.finalScore !== rightScore.finalScore) {
    return rightScore.finalScore - leftScore.finalScore;
  }

  return 0;
}

export async function getActiveActivityPriorityOverrideTargets(
  now = new Date(),
) {
  try {
    return prisma.activityPriorityOverride.findMany({
      orderBy: [
        {
          initialBoost: "desc",
        },
        {
          boostExpiresAt: "desc",
        },
      ],
      select: {
        boostExpiresAt: true,
        boostStartedAt: true,
        initialBoost: true,
        targetId: true,
        targetType: true,
      },
      take: maxActivePriorityOverrides,
      where: {
        boostExpiresAt: {
          gt: now,
        },
        initialBoost: {
          gt: 0,
        },
      },
    });
  } catch (error) {
    if (isMissingPriorityTableError(error)) {
      return [];
    }

    throw error;
  }
}

export async function getActivityPriorityOverrideMap(
  targets: ActivityPriorityTargetKey[],
) {
  const uniqueTargets = Array.from(
    new Map(
      targets.map((target) => [getActivityPriorityKeyString(target), target]),
    ).values(),
  );

  if (uniqueTargets.length === 0) {
    return new Map<string, ActivityPriorityOverrideSnapshot>();
  }

  try {
    const rows = await prisma.activityPriorityOverride.findMany({
      select: {
        boostExpiresAt: true,
        boostStartedAt: true,
        initialBoost: true,
        targetId: true,
        targetType: true,
      },
      where: {
        OR: uniqueTargets.map((target) => ({
          targetId: target.targetId,
          targetType: target.targetType,
        })),
      },
    });

    return new Map(
      rows.map((row) => {
        const snapshot = serializeActivityPriorityOverride(row);

        return [getActivityPriorityKeyString(snapshot), snapshot];
      }),
    );
  } catch (error) {
    if (isMissingPriorityTableError(error)) {
      return new Map<string, ActivityPriorityOverrideSnapshot>();
    }

    throw error;
  }
}

type RankedActivityPriorityCard = {
  card: Pick<
    ActivityCardViewModel,
    "endAt" | "id" | "publicEventId" | "startAt" | "status" | "type"
  >;
};
