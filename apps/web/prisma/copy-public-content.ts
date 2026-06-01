import { Prisma, PrismaClient } from "@prisma/client";

const sourceDatabaseUrl = process.env.CONTENT_SOURCE_DATABASE_URL;
const targetDatabaseUrl = process.env.CONTENT_TARGET_DATABASE_URL;
const targetOrganizerId = process.env.CONTENT_TARGET_ORGANIZER_ID;
const targetOrganizerClerkId =
  process.env.CONTENT_TARGET_ORGANIZER_CLERK_ID ??
  "system_content_migration_next_fun_club";
const targetOrganizerNickname =
  process.env.CONTENT_TARGET_ORGANIZER_NICKNAME ?? "Next Fun Club";
const shouldWrite = process.argv.includes("--write");
const copyAllActivities = process.argv.includes("--include-non-public");

if (!sourceDatabaseUrl || !targetDatabaseUrl) {
  console.error(
    [
      "Missing database URLs.",
      "Set CONTENT_SOURCE_DATABASE_URL to the Preview direct database URL.",
      "Set CONTENT_TARGET_DATABASE_URL to the Production direct database URL.",
    ].join("\n"),
  );
  process.exit(1);
}

const source = new PrismaClient({
  datasources: {
    db: {
      url: sourceDatabaseUrl,
    },
  },
});
const target = new PrismaClient({
  datasources: {
    db: {
      url: targetDatabaseUrl,
    },
  },
});

type MerchantRecord = Prisma.MerchantGetPayload<Record<string, never>>;
type ActivityRecord = Prisma.ActivityGetPayload<Record<string, never>>;
type SourceLinkRecord = Prisma.ActivitySourceLinkGetPayload<
  Record<string, never>
>;

type CopySummary = {
  dryRun: boolean;
  merchants: {
    read: number;
    created: number;
    updated: number;
  };
  activities: {
    read: number;
    created: number;
    updated: number;
    skipped: number;
  };
  sourceLinks: {
    read: number;
    created: number;
    updated: number;
    skipped: number;
  };
};

function toInputJson(
  value: Prisma.JsonValue | null,
): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  return value === null
    ? Prisma.JsonNull
    : (JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue);
}

async function getTargetOrganizer() {
  if (targetOrganizerId) {
    const organizer = await target.userProfile.findUnique({
      where: {
        id: targetOrganizerId,
      },
      select: {
        id: true,
      },
    });

    if (!organizer) {
      throw new Error(
        `CONTENT_TARGET_ORGANIZER_ID does not exist: ${targetOrganizerId}`,
      );
    }

    return organizer;
  }

  if (!shouldWrite) {
    return {
      id: "dry-run-target-organizer",
    };
  }

  return target.userProfile.upsert({
    where: {
      clerkUserId: targetOrganizerClerkId,
    },
    update: {
      nickname: targetOrganizerNickname,
      status: "ACTIVE",
      syncedAt: new Date(),
    },
    create: {
      clerkUserId: targetOrganizerClerkId,
      nickname: targetOrganizerNickname,
      bio: "生产环境公开内容运营账号。",
      status: "ACTIVE",
      syncedAt: new Date(),
    },
    select: {
      id: true,
    },
  });
}

function toMerchantData(merchant: MerchantRecord): Prisma.MerchantCreateInput {
  return {
    id: merchant.id,
    slug: merchant.slug,
    name: merchant.name,
    description: merchant.description,
    logoUrl: merchant.logoUrl,
    city: merchant.city,
    address: merchant.address,
    latitude: merchant.latitude,
    longitude: merchant.longitude,
    websiteUrl: merchant.websiteUrl,
    contactEmail: merchant.contactEmail,
    externalSource: merchant.externalSource,
    externalId: merchant.externalId,
    externalUrl: merchant.externalUrl,
    sourcePayload: toInputJson(merchant.sourcePayload),
    importedAt: merchant.importedAt,
    isActive: merchant.isActive,
    createdAt: merchant.createdAt,
    updatedAt: merchant.updatedAt,
  };
}

async function copyMerchants(summary: CopySummary) {
  const merchants = await source.merchant.findMany({
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });
  const merchantIdMap = new Map<string, string>();

  summary.merchants.read = merchants.length;

  for (const merchant of merchants) {
    const data = toMerchantData(merchant);

    if (!shouldWrite) {
      merchantIdMap.set(merchant.id, merchant.id);
      summary.merchants.created += 1;
      continue;
    }

    const existing = await target.merchant.findUnique({
      where: {
        slug: merchant.slug,
      },
      select: {
        id: true,
      },
    });

    if (existing) {
      await target.merchant.update({
        where: {
          id: existing.id,
        },
        data: {
          ...data,
          id: existing.id,
        },
      });
      merchantIdMap.set(merchant.id, existing.id);
      summary.merchants.updated += 1;
      continue;
    }

    const created = await target.merchant.create({
      data,
      select: {
        id: true,
      },
    });
    merchantIdMap.set(merchant.id, created.id);
    summary.merchants.created += 1;
  }

  return merchantIdMap;
}

function buildActivityDedupeWhere(
  activity: ActivityRecord,
): Prisma.ActivityWhereInput[] {
  const where: Prisma.ActivityWhereInput[] = [];

  if (activity.sourceUrl) {
    where.push({
      sourceUrl: activity.sourceUrl,
    });
  }

  if (activity.externalSource && activity.externalId) {
    where.push({
      externalSource: activity.externalSource,
      externalId: activity.externalId,
    });
  }

  if (activity.externalUrl) {
    where.push({
      externalUrl: activity.externalUrl,
    });
  }

  where.push({
    title: {
      equals: activity.title,
      mode: "insensitive",
    },
    city: {
      equals: activity.city,
      mode: "insensitive",
    },
    address: {
      equals: activity.address,
      mode: "insensitive",
    },
    startAt: activity.startAt,
  });

  return where;
}

function toActivityData(
  activity: ActivityRecord,
  organizerId: string,
  merchantId: string | null,
): Prisma.ActivityUncheckedCreateInput {
  return {
    id: activity.id,
    title: activity.title,
    description: activity.description,
    itinerary: activity.itinerary,
    type: activity.type,
    category: activity.category,
    city: activity.city,
    destination: activity.destination,
    address: activity.address,
    latitude: activity.latitude,
    longitude: activity.longitude,
    startAt: activity.startAt,
    endAt: activity.endAt,
    capacity: activity.capacity,
    minParticipants: activity.minParticipants,
    requiresApproval: activity.requiresApproval,
    priceType: activity.priceType,
    priceText: activity.priceText,
    coverImageUrl: activity.coverImageUrl,
    source: activity.source,
    sourceUrl: activity.sourceUrl,
    externalSource: activity.externalSource,
    externalId: activity.externalId,
    externalUrl: activity.externalUrl,
    sourcePayload: toInputJson(activity.sourcePayload),
    importedAt: activity.importedAt,
    status: activity.status,
    visibility: activity.visibility,
    organizerId,
    merchantId,
    createdAt: activity.createdAt,
    updatedAt: activity.updatedAt,
  };
}

async function copyActivities(
  summary: CopySummary,
  merchantIdMap: Map<string, string>,
  organizerId: string,
) {
  const activities = await source.activity.findMany({
    where: copyAllActivities
      ? undefined
      : {
          visibility: "PUBLIC",
        },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });
  const activityIdMap = new Map<string, string>();

  summary.activities.read = activities.length;

  for (const activity of activities) {
    const merchantId = activity.merchantId
      ? merchantIdMap.get(activity.merchantId)
      : null;

    if (activity.merchantId && !merchantId) {
      summary.activities.skipped += 1;
      continue;
    }

    const data = toActivityData(activity, organizerId, merchantId ?? null);

    if (!shouldWrite) {
      activityIdMap.set(activity.id, activity.id);
      summary.activities.created += 1;
      continue;
    }

    const existing = await target.activity.findFirst({
      where: {
        OR: buildActivityDedupeWhere(activity),
      },
      select: {
        id: true,
      },
    });

    if (existing) {
      await target.activity.update({
        where: {
          id: existing.id,
        },
        data: {
          ...data,
          id: existing.id,
        },
      });
      activityIdMap.set(activity.id, existing.id);
      summary.activities.updated += 1;
      continue;
    }

    const created = await target.activity.create({
      data,
      select: {
        id: true,
      },
    });
    activityIdMap.set(activity.id, created.id);
    summary.activities.created += 1;
  }

  return activityIdMap;
}

function toSourceLinkData(
  sourceLink: SourceLinkRecord,
  activityId: string,
): Prisma.ActivitySourceLinkUncheckedCreateInput {
  return {
    id: sourceLink.id,
    activityId,
    source: sourceLink.source,
    sourceUrl: sourceLink.sourceUrl,
    createdAt: sourceLink.createdAt,
  };
}

async function copySourceLinks(
  summary: CopySummary,
  activityIdMap: Map<string, string>,
) {
  const sourceLinks = await source.activitySourceLink.findMany({
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });

  summary.sourceLinks.read = sourceLinks.length;

  for (const sourceLink of sourceLinks) {
    const activityId = activityIdMap.get(sourceLink.activityId);

    if (!activityId) {
      summary.sourceLinks.skipped += 1;
      continue;
    }

    const data = toSourceLinkData(sourceLink, activityId);

    if (!shouldWrite) {
      summary.sourceLinks.created += 1;
      continue;
    }

    const existing = await target.activitySourceLink.findUnique({
      where: {
        sourceUrl: sourceLink.sourceUrl,
      },
      select: {
        id: true,
      },
    });

    if (existing) {
      await target.activitySourceLink.update({
        where: {
          id: existing.id,
        },
        data: {
          ...data,
          id: existing.id,
        },
      });
      summary.sourceLinks.updated += 1;
      continue;
    }

    await target.activitySourceLink.create({
      data,
    });
    summary.sourceLinks.created += 1;
  }
}

async function main() {
  const summary: CopySummary = {
    dryRun: !shouldWrite,
    merchants: {
      read: 0,
      created: 0,
      updated: 0,
    },
    activities: {
      read: 0,
      created: 0,
      updated: 0,
      skipped: 0,
    },
    sourceLinks: {
      read: 0,
      created: 0,
      updated: 0,
      skipped: 0,
    },
  };
  const organizer = await getTargetOrganizer();
  const merchantIdMap = await copyMerchants(summary);
  const activityIdMap = await copyActivities(
    summary,
    merchantIdMap,
    organizer.id,
  );

  await copySourceLinks(summary, activityIdMap);

  console.log(JSON.stringify(summary, null, 2));

  if (!shouldWrite) {
    console.log("Dry run only. Add --write to copy data.");
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await Promise.all([source.$disconnect(), target.$disconnect()]);
  });
