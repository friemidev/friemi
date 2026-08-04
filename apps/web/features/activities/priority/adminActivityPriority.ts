import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import {
  getActiveActivityPriorityBoost,
  getActivityPriorityScore,
  getActivityPriorityOverrideMap,
  getActivityPriorityKeyString,
  serializeActivityPriorityOverride,
  type ActivityPriorityOverrideSnapshot,
  type ActivityPriorityTargetKey,
  type ActivityPriorityTargetTypeValue,
} from "@/features/activities/priority/activityPriority";
import { prisma } from "@/lib/prisma";
import { withLocale } from "@/lib/routes";

export type AdminActivityPriorityItem = ActivityPriorityTargetKey & {
  activeBoost: number;
  boostExpiresAt: string | null;
  boostStartedAt: string;
  city: string;
  coverImageUrl: string | null;
  finalScore: number;
  initialBoost: number;
  note: string | null;
  startAt: string;
  status: string;
  timeScore: number;
  title: string;
  updatedAt: string;
  updatedByName: string | null;
};

export type ActivityPriorityAdminSnapshot = ActivityPriorityTargetKey & {
  activeBoost: number;
  boostExpiresAt: string | null;
  boostStartedAt: string | null;
  finalScore: number;
  initialBoost: number;
  note: string | null;
  timeScore: number;
};

const supportedLocales = ["zh-CN", "en", "fr"] as const;
const maxManualBoost = 30;

const updateActivityPrioritySchema = z.object({
  initialBoost: z.coerce.number().int().min(0).max(maxManualBoost),
  locale: z.string().trim().optional(),
  note: z.string().trim().max(240).optional(),
  targetId: z.string().trim().min(1),
  targetType: z.enum(["ACTIVITY", "PUBLIC_EVENT"]),
});

function isMissingPriorityTableError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    (error.code === "P2021" || error.code === "P2022")
  );
}

function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);

  return nextDate;
}

function getTargetDetailPath(target: ActivityPriorityTargetKey) {
  return target.targetType === "PUBLIC_EVENT"
    ? `/public-events/${target.targetId}`
    : `/lobby/${target.targetId}`;
}

function getLocalizedPaths(path: string, preferredLocale?: string | null) {
  const normalizedLocale = supportedLocales.find(
    (locale) => locale === preferredLocale,
  );
  const locales = normalizedLocale
    ? [
        normalizedLocale,
        ...supportedLocales.filter((item) => item !== normalizedLocale),
      ]
    : supportedLocales;

  return locales.map((locale) => withLocale(locale, path));
}

function revalidateActivityPriorityPaths(
  target: ActivityPriorityTargetKey,
  locale?: string | null,
) {
  const paths = [
    "/activities",
    "/home",
    "/mobile-home",
    "/admin/activity-priority",
    getTargetDetailPath(target),
  ];

  for (const path of paths) {
    for (const localizedPath of getLocalizedPaths(path, locale)) {
      revalidatePath(localizedPath);
    }
  }
}

function serializeTargetSummary(row: {
  city: string;
  coverImageUrl: string | null;
  endAt: Date | null;
  id: string;
  startAt: Date;
  status: string;
  title: string;
}) {
  return {
    city: row.city,
    coverImageUrl: row.coverImageUrl,
    endAt: row.endAt?.toISOString() ?? null,
    id: row.id,
    startAt: row.startAt.toISOString(),
    status: row.status === "SCHEDULED" ? "RECRUITING" : row.status,
    title: row.title,
  };
}

async function getTargetSummary(target: ActivityPriorityTargetKey) {
  if (target.targetType === "PUBLIC_EVENT") {
    const row = await prisma.publicEvent.findUnique({
      select: {
        city: true,
        coverImageUrl: true,
        endAt: true,
        id: true,
        startAt: true,
        status: true,
        title: true,
      },
      where: {
        id: target.targetId,
      },
    });

    return row ? serializeTargetSummary(row) : null;
  }

  const row = await prisma.activity.findUnique({
    select: {
      city: true,
      coverImageUrl: true,
      endAt: true,
      id: true,
      startAt: true,
      status: true,
      title: true,
    },
    where: {
      id: target.targetId,
    },
  });

  return row ? serializeTargetSummary(row) : null;
}

function getDefaultPrioritySnapshot(
  target: ActivityPriorityTargetKey,
): ActivityPriorityOverrideSnapshot {
  const now = new Date().toISOString();

  return {
    boostExpiresAt: null,
    boostStartedAt: now,
    initialBoost: 0,
    targetId: target.targetId,
    targetType: target.targetType,
  };
}

function buildAdminItem({
  now,
  override,
  target,
  updatedAt,
  updatedByName,
}: {
  now: Date;
  override: ActivityPriorityOverrideSnapshot & {
    note?: string | null;
  };
  target: NonNullable<Awaited<ReturnType<typeof getTargetSummary>>>;
  updatedAt: Date;
  updatedByName: string | null;
}): AdminActivityPriorityItem {
  const score = getActivityPriorityScore(target, override, now);

  return {
    activeBoost: score.activeBoost,
    boostExpiresAt: override.boostExpiresAt,
    boostStartedAt: override.boostStartedAt,
    city: target.city,
    coverImageUrl: target.coverImageUrl,
    finalScore: score.finalScore,
    initialBoost: override.initialBoost,
    note: override.note ?? null,
    startAt: target.startAt,
    status: target.status,
    targetId: override.targetId,
    targetType: override.targetType,
    timeScore: score.timeScore,
    title: target.title,
    updatedAt: updatedAt.toISOString(),
    updatedByName,
  };
}

export async function getActivityPriorityAdminSnapshot(
  target: ActivityPriorityTargetKey,
): Promise<ActivityPriorityAdminSnapshot> {
  const now = new Date();
  const summary = await getTargetSummary(target);
  let override = getDefaultPrioritySnapshot(
    target,
  ) as ActivityPriorityOverrideSnapshot & {
    note?: string | null;
  };

  try {
    const row = await prisma.activityPriorityOverride.findUnique({
      select: {
        boostExpiresAt: true,
        boostStartedAt: true,
        initialBoost: true,
        note: true,
        targetId: true,
        targetType: true,
      },
      where: {
        targetType_targetId: target,
      },
    });

    if (row) {
      override = {
        ...serializeActivityPriorityOverride(row),
        note: row.note,
      };
    }
  } catch (error) {
    if (!isMissingPriorityTableError(error)) {
      throw error;
    }
  }
  const score = getActivityPriorityScore(
    summary ?? {
      endAt: null,
      startAt: now.toISOString(),
      status: "RECRUITING",
    },
    override,
    now,
  );

  return {
    activeBoost: score.activeBoost,
    boostExpiresAt: override.initialBoost > 0 ? override.boostExpiresAt : null,
    boostStartedAt: override.initialBoost > 0 ? override.boostStartedAt : null,
    finalScore: score.finalScore,
    initialBoost: override.initialBoost,
    note: override.note ?? null,
    targetId: target.targetId,
    targetType: target.targetType,
    timeScore: score.timeScore,
  };
}

export async function getAdminActivityPriorityItems() {
  const now = new Date();

  try {
    const rows = await prisma.activityPriorityOverride.findMany({
      orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
      select: {
        boostExpiresAt: true,
        boostStartedAt: true,
        initialBoost: true,
        note: true,
        targetId: true,
        targetType: true,
        updatedAt: true,
        updatedBy: {
          select: {
            nickname: true,
          },
        },
      },
      take: 120,
    });
    const targetSummaries = await Promise.all(
      rows.map((row) =>
        getTargetSummary({
          targetId: row.targetId,
          targetType: row.targetType,
        }),
      ),
    );

    return rows.flatMap((row, index) => {
      const target = targetSummaries[index];

      if (!target) {
        return [];
      }

      return [
        buildAdminItem({
          now,
          override: {
            ...serializeActivityPriorityOverride(row),
            note: row.note,
          },
          target,
          updatedAt: row.updatedAt,
          updatedByName: row.updatedBy?.nickname ?? null,
        }),
      ];
    });
  } catch (error) {
    if (isMissingPriorityTableError(error)) {
      console.error(
        "ActivityPriorityOverride table is missing; admin priority list is empty",
      );

      return [];
    }

    throw error;
  }
}

export async function updateActivityPriorityOverride(
  rawInput: unknown,
  actorProfileId: string | null | undefined,
) {
  const result = updateActivityPrioritySchema.safeParse(rawInput);

  if (!result.success) {
    return {
      error: result.error.issues[0]?.message ?? "权重设置无效",
      item: null,
    };
  }

  const { initialBoost, locale, note, targetId, targetType } = result.data;
  const target = {
    targetId,
    targetType: targetType as ActivityPriorityTargetTypeValue,
  };
  const targetSummary = await getTargetSummary(target);

  if (!targetSummary) {
    return {
      error: "活动不存在或已删除",
      item: null,
    };
  }

  const now = new Date();
  const boostExpiresAt = initialBoost > 0 ? addDays(now, initialBoost) : null;

  try {
    const saved = await prisma.$transaction(async (tx) => {
      const oldRow = await tx.activityPriorityOverride.findUnique({
        where: {
          targetType_targetId: target,
        },
      });
      const row = await tx.activityPriorityOverride.upsert({
        create: {
          boostExpiresAt,
          boostStartedAt: now,
          initialBoost,
          note: note || null,
          targetId,
          targetType,
          updatedById: actorProfileId ?? null,
        },
        update: {
          boostExpiresAt,
          boostStartedAt: now,
          initialBoost,
          note: note || null,
          updatedById: actorProfileId ?? null,
        },
        where: {
          targetType_targetId: target,
        },
      });

      await tx.activityPriorityOverrideLog.create({
        data: {
          actorId: actorProfileId ?? null,
          newBoost: initialBoost,
          note: note || null,
          oldBoost: oldRow?.initialBoost ?? 0,
          targetId,
          targetType,
        },
      });

      return row;
    });

    revalidateActivityPriorityPaths(target, locale);

    return {
      error: null,
      item: buildAdminItem({
        now,
        override: {
          ...serializeActivityPriorityOverride(saved),
          note: saved.note,
        },
        target: targetSummary,
        updatedAt: saved.updatedAt,
        updatedByName: null,
      }),
    };
  } catch (error) {
    console.error("Failed to update activity priority override", error);

    return {
      error: isMissingPriorityTableError(error)
        ? "权重数据表不存在，请先执行 Prisma 迁移"
        : "保存失败，请稍后重试",
      item: null,
    };
  }
}
