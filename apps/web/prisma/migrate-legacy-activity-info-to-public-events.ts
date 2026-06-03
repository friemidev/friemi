import { Prisma, PrismaClient } from "@prisma/client";
import type { ActivityStatus, ActivityType } from "@prisma/client";

const prisma = new PrismaClient();
const shouldWrite = process.argv.includes("--write");
const includeSourceUrlOnly = process.argv.includes("--include-source-url-only");
const hideLegacyActivities =
  shouldWrite && process.argv.includes("--hide-legacy-activities");
const maxSamples = 12;
const legacyPublicActivityIdPattern =
  /^(playinparis|sortiraparis|paris-opendata|paris_open_data|feverup)_/i;
const legacyPublicActivitySources = [
  "playinparis",
  "playinparis.com",
  "sortiraparis",
  "sortiraparis.com",
  "paris-opendata",
  "paris-opendata:que-faire-a-paris",
  "opendata.paris.fr",
  "feverup",
  "feverup.com",
];

const candidateActivityStatuses: ActivityStatus[] = [
  "OPEN",
  "FULL",
  "RECRUITING",
  "CONFIRMED",
  "ENDED",
  "CANCELLED",
];

type LegacyActivity = Prisma.ActivityGetPayload<{
  include: {
    _count: {
      select: {
        participants: true;
        comments: true;
      };
    };
  };
}>;

type SkipReason =
  | "hasParticipants"
  | "hasComments"
  | "notLegacyActivityInfo"
  | "sourceUrlOnlyRequiresFlag";

type MigrationSummary = {
  dryRun: boolean;
  includeSourceUrlOnly: boolean;
  hideLegacyActivitiesOnWrite: boolean;
  scanned: number;
  eligible: number;
  created: number;
  updated: number;
  hiddenLegacyActivities: number;
  skipped: Record<SkipReason, number>;
  samples: {
    created: string[];
    updated: string[];
    hidden: string[];
    skipped: string[];
  };
};

function addSample(samples: string[], value: string) {
  if (samples.length < maxSamples) {
    samples.push(value);
  }
}

function hasJsonValue(value: Prisma.JsonValue | null) {
  return value !== null;
}

function includesKnownPublicActivitySource(value: string | null | undefined) {
  const normalizedValue = value?.trim().toLowerCase();

  if (!normalizedValue) {
    return false;
  }

  return legacyPublicActivitySources.some((knownSource) =>
    normalizedValue.includes(knownSource),
  );
}

function hasKnownLegacyPublicActivityMarker(activity: LegacyActivity) {
  return Boolean(
    legacyPublicActivityIdPattern.test(activity.id) ||
    includesKnownPublicActivitySource(activity.source) ||
    includesKnownPublicActivitySource(activity.sourceUrl) ||
    includesKnownPublicActivitySource(activity.externalUrl),
  );
}

function hasStrongPublicEventSignal(activity: LegacyActivity) {
  return Boolean(
    activity.type === "PUBLIC_EVENT" ||
    hasKnownLegacyPublicActivityMarker(activity) ||
    activity.importedAt ||
    activity.externalSource ||
    activity.externalId ||
    activity.externalUrl ||
    hasJsonValue(activity.sourcePayload),
  );
}

function hasSourceOnlySignal(activity: LegacyActivity) {
  return Boolean(activity.source || activity.sourceUrl);
}

function getSkipReason(activity: LegacyActivity): SkipReason | null {
  const hasStrongSignal = hasStrongPublicEventSignal(activity);
  const hasSourceOnly = hasSourceOnlySignal(activity);

  if (!hasStrongSignal && !hasSourceOnly) {
    return "notLegacyActivityInfo";
  }

  if (!hasStrongSignal && hasSourceOnly && !includeSourceUrlOnly) {
    return "sourceUrlOnlyRequiresFlag";
  }

  if (activity._count.participants > 0) {
    return "hasParticipants";
  }

  if (activity._count.comments > 0) {
    return "hasComments";
  }

  return null;
}

function toInputJson(
  value: Prisma.JsonValue | null,
): Prisma.InputJsonValue | undefined {
  return value === null
    ? undefined
    : (JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue);
}

function getPublicEventDedupeWhere(
  activity: LegacyActivity,
): Prisma.PublicEventWhereInput[] {
  const where: Prisma.PublicEventWhereInput[] = [];

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

function getPublicEventStatus(activity: LegacyActivity) {
  return activity.status === "CANCELLED" ? "CANCELLED" : "SCHEDULED";
}

function toPublicEventData(
  activity: LegacyActivity,
): Prisma.PublicEventCreateInput {
  return {
    title: activity.title,
    description: activity.description,
    category: activity.category,
    city: activity.city,
    address: activity.address,
    latitude: activity.latitude,
    longitude: activity.longitude,
    startAt: activity.startAt,
    endAt: activity.endAt,
    priceType: activity.priceType,
    priceText: activity.priceText,
    coverImageUrl: activity.coverImageUrl,
    officialUrl: activity.externalUrl ?? activity.sourceUrl,
    status: getPublicEventStatus(activity),
    visibility: activity.visibility,
    source: activity.source,
    sourceUrl: activity.sourceUrl,
    externalSource: activity.externalSource,
    externalId: activity.externalId,
    externalUrl: activity.externalUrl,
    sourcePayload: toInputJson(activity.sourcePayload),
    importedAt: activity.importedAt,
    lastSyncedAt: new Date(),
    createdAt: activity.createdAt,
    updatedAt: activity.updatedAt,
  };
}

async function getLegacyActivityCandidates() {
  return prisma.activity.findMany({
    where: {
      publicEventId: null,
      status: {
        in: candidateActivityStatuses,
      },
      visibility: "PUBLIC",
      OR: [
        {
          type: "PUBLIC_EVENT" as ActivityType,
        },
        {
          source: {
            not: null,
          },
        },
        {
          sourceUrl: {
            not: null,
          },
        },
        {
          externalSource: {
            not: null,
          },
        },
        {
          externalId: {
            not: null,
          },
        },
        {
          externalUrl: {
            not: null,
          },
        },
        {
          importedAt: {
            not: null,
          },
        },
      ],
    },
    include: {
      _count: {
        select: {
          participants: true,
          comments: true,
        },
      },
    },
    orderBy: [{ startAt: "asc" }, { id: "asc" }],
  });
}

function createSummary(scanned: number): MigrationSummary {
  return {
    dryRun: !shouldWrite,
    includeSourceUrlOnly,
    hideLegacyActivitiesOnWrite: hideLegacyActivities,
    scanned,
    eligible: 0,
    created: 0,
    updated: 0,
    hiddenLegacyActivities: 0,
    skipped: {
      hasParticipants: 0,
      hasComments: 0,
      notLegacyActivityInfo: 0,
      sourceUrlOnlyRequiresFlag: 0,
    },
    samples: {
      created: [],
      updated: [],
      hidden: [],
      skipped: [],
    },
  };
}

async function migrateActivity(
  activity: LegacyActivity,
  summary: MigrationSummary,
) {
  const existingPublicEvent = await prisma.publicEvent.findFirst({
    where: {
      OR: getPublicEventDedupeWhere(activity),
    },
    select: {
      id: true,
    },
  });
  const publicEventData = toPublicEventData(activity);

  if (!shouldWrite) {
    summary[existingPublicEvent ? "updated" : "created"] += 1;
    addSample(
      existingPublicEvent ? summary.samples.updated : summary.samples.created,
      `${activity.title} (${activity.id})`,
    );
  } else if (existingPublicEvent) {
    await prisma.publicEvent.update({
      where: {
        id: existingPublicEvent.id,
      },
      data: publicEventData,
    });
    summary.updated += 1;
    addSample(summary.samples.updated, `${activity.title} (${activity.id})`);
  } else {
    await prisma.publicEvent.create({
      data: publicEventData,
    });
    summary.created += 1;
    addSample(summary.samples.created, `${activity.title} (${activity.id})`);
  }

  if (hideLegacyActivities) {
    await prisma.activity.update({
      where: {
        id: activity.id,
      },
      data: {
        visibility: "PRIVATE",
      },
    });
    summary.hiddenLegacyActivities += 1;
    addSample(summary.samples.hidden, `${activity.title} (${activity.id})`);
  }
}

async function main() {
  const activities = await getLegacyActivityCandidates();
  const summary = createSummary(activities.length);

  for (const activity of activities) {
    const skipReason = getSkipReason(activity);

    if (skipReason) {
      summary.skipped[skipReason] += 1;
      addSample(
        summary.samples.skipped,
        `${activity.title} (${activity.id}) - ${skipReason}`,
      );
      continue;
    }

    summary.eligible += 1;
    await migrateActivity(activity, summary);
  }

  console.log(JSON.stringify(summary, null, 2));

  if (!shouldWrite) {
    console.log(
      [
        "Dry run only. Add --write to create/update PublicEvent records.",
        "Source/sourceUrl-only rows are skipped by default; add --include-source-url-only after confirming they are legacy imported info rows.",
        "On --write, legacy Activity rows stay visible in the database and are rendered as activity info by compatibility rules.",
        "Add --hide-legacy-activities only if you explicitly want to hide migrated legacy Activity rows with visibility=PRIVATE.",
      ].join("\n"),
    );
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
