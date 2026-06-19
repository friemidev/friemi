import { Prisma, PrismaClient } from "@prisma/client";
import { getStoredTicketLabel } from "../features/public-events/utils/ticketCta";

const prisma = new PrismaClient();
const shouldWrite = process.argv.includes("--write");
const maxSamples = 12;
const parisOpenDataSources = [
  "paris-opendata",
  "paris-opendata:que-faire-a-paris",
];

const publicEventSelect = {
  id: true,
  title: true,
  source: true,
  sourcePayload: true,
  ticketUrl: true,
  ticketLabel: true,
} satisfies Prisma.PublicEventSelect;

const activitySelect = {
  id: true,
  title: true,
  source: true,
  sourcePayload: true,
  ticketUrl: true,
  ticketLabel: true,
} satisfies Prisma.ActivitySelect;

type PublicEventCandidate = Prisma.PublicEventGetPayload<{
  select: typeof publicEventSelect;
}>;
type ActivityCandidate = Prisma.ActivityGetPayload<{
  select: typeof activitySelect;
}>;
type BackfillTarget = "activities" | "publicEvents";

type TableStats = {
  created: number;
  invalidUrl: number;
  scanned: number;
  skipped: number;
  skippedExistingTicketUrl: number;
  skippedMissingAccessLink: number;
  skippedMissingPayload: number;
  updated: number;
};

type BackfillSummary = {
  dryRun: boolean;
  sources: string[];
  totals: TableStats;
  publicEvents: TableStats;
  activities: TableStats;
  samples: Record<
    BackfillTarget,
    {
      invalidUrl: string[];
      skippedExistingTicketUrl: string[];
      updated: string[];
    }
  >;
};

function createTableStats(): TableStats {
  return {
    created: 0,
    invalidUrl: 0,
    scanned: 0,
    skipped: 0,
    skippedExistingTicketUrl: 0,
    skippedMissingAccessLink: 0,
    skippedMissingPayload: 0,
    updated: 0,
  };
}

function addSample(samples: string[], value: string) {
  if (samples.length < maxSamples) {
    samples.push(value);
  }
}

function normalizeText(value: unknown) {
  return String(value ?? "").trim();
}

function normalizeExternalUrl(value: unknown) {
  const rawUrl = normalizeText(value);

  if (!rawUrl) {
    return null;
  }

  try {
    const url = new URL(rawUrl);
    return ["http:", "https:"].includes(url.protocol) ? url.toString() : null;
  } catch {
    return null;
  }
}

function getPayloadField(payload: Prisma.JsonValue | null, key: string) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return null;
  }

  const value = (payload as Record<string, unknown>)[key];

  if (typeof value !== "string" && typeof value !== "number") {
    return null;
  }

  return normalizeText(value) || null;
}

function getSampleLabel(record: { id: string; title: string }, ticketUrl?: string) {
  return ticketUrl
    ? `${record.id} | ${record.title} | ${ticketUrl}`
    : `${record.id} | ${record.title}`;
}

function addSkipped(stats: TableStats) {
  stats.skipped += 1;
}

function mergeTotals(summary: BackfillSummary) {
  const totals = createTableStats();

  for (const stats of [summary.publicEvents, summary.activities]) {
    totals.created += stats.created;
    totals.invalidUrl += stats.invalidUrl;
    totals.scanned += stats.scanned;
    totals.skipped += stats.skipped;
    totals.skippedExistingTicketUrl += stats.skippedExistingTicketUrl;
    totals.skippedMissingAccessLink += stats.skippedMissingAccessLink;
    totals.skippedMissingPayload += stats.skippedMissingPayload;
    totals.updated += stats.updated;
  }

  summary.totals = totals;
}

async function getPublicEventCandidates() {
  return prisma.publicEvent.findMany({
    where: {
      source: {
        in: parisOpenDataSources,
      },
    },
    orderBy: [{ importedAt: "desc" }, { createdAt: "desc" }, { id: "asc" }],
    select: publicEventSelect,
  });
}

async function getActivityCandidates() {
  return prisma.activity.findMany({
    where: {
      source: {
        in: parisOpenDataSources,
      },
    },
    orderBy: [{ importedAt: "desc" }, { createdAt: "desc" }, { id: "asc" }],
    select: activitySelect,
  });
}

async function backfillPublicEvents(
  records: PublicEventCandidate[],
  summary: BackfillSummary,
) {
  const stats = summary.publicEvents;

  for (const record of records) {
    stats.scanned += 1;

    if (record.ticketUrl?.trim()) {
      stats.skippedExistingTicketUrl += 1;
      addSkipped(stats);
      addSample(
        summary.samples.publicEvents.skippedExistingTicketUrl,
        getSampleLabel(record, record.ticketUrl),
      );
      continue;
    }

    if (!record.sourcePayload) {
      stats.skippedMissingPayload += 1;
      addSkipped(stats);
      continue;
    }

    const rawTicketUrl = getPayloadField(record.sourcePayload, "access_link");

    if (!rawTicketUrl) {
      stats.skippedMissingAccessLink += 1;
      addSkipped(stats);
      continue;
    }

    const ticketUrl = normalizeExternalUrl(rawTicketUrl);

    if (!ticketUrl) {
      stats.invalidUrl += 1;
      addSkipped(stats);
      addSample(
        summary.samples.publicEvents.invalidUrl,
        getSampleLabel(record, rawTicketUrl),
      );
      continue;
    }

    const ticketLabel = getStoredTicketLabel(
      getPayloadField(record.sourcePayload, "access_link_text"),
    );
    const data: Prisma.PublicEventUpdateInput = {
      ticketUrl,
      ...(record.ticketLabel?.trim() || !ticketLabel ? {} : { ticketLabel }),
    };

    stats.updated += 1;
    addSample(summary.samples.publicEvents.updated, getSampleLabel(record, ticketUrl));

    if (shouldWrite) {
      await prisma.publicEvent.update({
        data,
        where: {
          id: record.id,
        },
      });
    }
  }
}

async function backfillActivities(
  records: ActivityCandidate[],
  summary: BackfillSummary,
) {
  const stats = summary.activities;

  for (const record of records) {
    stats.scanned += 1;

    if (record.ticketUrl?.trim()) {
      stats.skippedExistingTicketUrl += 1;
      addSkipped(stats);
      addSample(
        summary.samples.activities.skippedExistingTicketUrl,
        getSampleLabel(record, record.ticketUrl),
      );
      continue;
    }

    if (!record.sourcePayload) {
      stats.skippedMissingPayload += 1;
      addSkipped(stats);
      continue;
    }

    const rawTicketUrl = getPayloadField(record.sourcePayload, "access_link");

    if (!rawTicketUrl) {
      stats.skippedMissingAccessLink += 1;
      addSkipped(stats);
      continue;
    }

    const ticketUrl = normalizeExternalUrl(rawTicketUrl);

    if (!ticketUrl) {
      stats.invalidUrl += 1;
      addSkipped(stats);
      addSample(
        summary.samples.activities.invalidUrl,
        getSampleLabel(record, rawTicketUrl),
      );
      continue;
    }

    const ticketLabel = getStoredTicketLabel(
      getPayloadField(record.sourcePayload, "access_link_text"),
    );
    const data: Prisma.ActivityUpdateInput = {
      ticketUrl,
      ...(record.ticketLabel?.trim() || !ticketLabel ? {} : { ticketLabel }),
    };

    stats.updated += 1;
    addSample(summary.samples.activities.updated, getSampleLabel(record, ticketUrl));

    if (shouldWrite) {
      await prisma.activity.update({
        data,
        where: {
          id: record.id,
        },
      });
    }
  }
}

async function main() {
  const summary: BackfillSummary = {
    dryRun: !shouldWrite,
    sources: parisOpenDataSources,
    totals: createTableStats(),
    publicEvents: createTableStats(),
    activities: createTableStats(),
    samples: {
      publicEvents: {
        invalidUrl: [],
        skippedExistingTicketUrl: [],
        updated: [],
      },
      activities: {
        invalidUrl: [],
        skippedExistingTicketUrl: [],
        updated: [],
      },
    },
  };
  const [publicEvents, activities] = await Promise.all([
    getPublicEventCandidates(),
    getActivityCandidates(),
  ]);

  await backfillPublicEvents(publicEvents, summary);
  await backfillActivities(activities, summary);
  mergeTotals(summary);

  console.log(JSON.stringify(summary, null, 2));

  if (!shouldWrite) {
    console.log("Dry run only. Re-run with --write to update ticket links.");
  }
}

main()
  .catch((error) => {
    console.error("Failed to backfill Open Data ticket links.", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
