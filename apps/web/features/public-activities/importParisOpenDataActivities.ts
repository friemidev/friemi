import type { ActivityCategory, PriceType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const parisOpenDataDataset = "que-faire-a-paris-";
const parisOpenDataSource = "paris-opendata:que-faire-a-paris";
const publicActivityOrganizerClerkId = "system_public_api_paris_opendata";
const defaultImportLimit = 20;
const maxImportLimit = 50;
const requestTimeoutMs = 10_000;

type ParisOpenDataResponse = {
  results?: ParisOpenDataRecord[];
};

type ParisOpenDataRecord = {
  id?: string | number | null;
  event_id?: string | number | null;
  url?: string | null;
  title?: string | null;
  lead_text?: string | null;
  description?: string | null;
  date_start?: string | null;
  date_end?: string | null;
  date_description?: string | null;
  cover_url?: string | null;
  address_name?: string | null;
  address_street?: string | null;
  address_city?: string | null;
  tags?: string[] | string | null;
  price_type?: string | null;
  price_detail?: string | null;
  access_type?: string | null;
  audience?: string | null;
};

export type PublicActivityImportSummary = {
  source: typeof parisOpenDataSource;
  fetched: number;
  created: number;
  updated: number;
  skipped: number;
  dryRun: boolean;
};

function normalizeImportLimit(limit: number | undefined) {
  if (!limit || Number.isNaN(limit)) {
    return defaultImportLimit;
  }

  return Math.min(Math.max(Math.floor(limit), 1), maxImportLimit);
}

function stripHtml(value: string | null | undefined) {
  return (value ?? "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function truncateText(value: string, maxLength: number) {
  return value.length > maxLength ? `${value.slice(0, maxLength - 1)}…` : value;
}

function normalizeText(value: string | number | null | undefined) {
  return String(value ?? "").trim();
}

function toJsonValue(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function getTags(record: ParisOpenDataRecord) {
  if (Array.isArray(record.tags)) {
    return record.tags.map(String);
  }

  if (typeof record.tags === "string") {
    return record.tags.split(/[;,]/).map((tag) => tag.trim());
  }

  return [];
}

function mapCategory(record: ParisOpenDataRecord): ActivityCategory {
  const searchable = [record.title, record.lead_text, ...getTags(record)]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (/expo|exposition|musée|museum|art|visite/.test(searchable)) {
    return "EXHIBITION";
  }

  if (
    /concert|musique|music|festival|chanson|danse|spectacle/.test(searchable)
  ) {
    return "MUSIC";
  }

  if (/cin[eé]ma|film|movie|projection/.test(searchable)) {
    return "MOVIE";
  }

  if (/sport|course|running|yoga|fitness|vélo|velo/.test(searchable)) {
    return "SPORTS";
  }

  if (
    /food|cuisine|repas|restaurant|marché|degustation|dégustation/.test(
      searchable,
    )
  ) {
    return "FOOD";
  }

  return "OTHER";
}

function mapPrice(record: ParisOpenDataRecord): {
  priceType: PriceType;
  priceText: string;
} {
  const priceType = normalizeText(record.price_type).toLowerCase();
  const priceDetail = stripHtml(record.price_detail);

  if (
    /gratuit|free/.test(priceType) ||
    /gratuit|free/.test(priceDetail.toLowerCase())
  ) {
    return {
      priceType: "FREE",
      priceText: "免费",
    };
  }

  return {
    priceType: priceDetail ? "FIXED" : "RANGE",
    priceText:
      priceDetail || normalizeText(record.price_type) || "以官方页面为准",
  };
}

function getAddress(record: ParisOpenDataRecord) {
  const addressParts = [
    normalizeText(record.address_name),
    normalizeText(record.address_street),
  ].filter(Boolean);

  return addressParts.length > 0 ? addressParts.join(" · ") : "Paris";
}

function getDescription(record: ParisOpenDataRecord) {
  const leadText = stripHtml(record.lead_text);
  const description = stripHtml(record.description);
  const officialUrl = normalizeText(record.url);
  const body = leadText || description || "公共活动信息来自 Paris OpenData。";
  const text = officialUrl ? `${body}\n\n官方链接：${officialUrl}` : body;

  return truncateText(text, 2000);
}

function getItinerary(record: ParisOpenDataRecord) {
  const dateDescription = stripHtml(record.date_description);
  const accessType = stripHtml(record.access_type);
  const audience = stripHtml(record.audience);

  return [dateDescription, accessType, audience].filter(Boolean).join("\n");
}

function getExternalId(record: ParisOpenDataRecord) {
  return (
    normalizeText(record.id) ||
    normalizeText(record.event_id) ||
    normalizeText(record.url)
  );
}

function buildParisOpenDataUrl(limit: number) {
  const url = new URL(
    `https://opendata.paris.fr/api/explore/v2.1/catalog/datasets/${parisOpenDataDataset}/records`,
  );
  url.searchParams.set("where", "date_start > NOW()");
  url.searchParams.set("order_by", "date_start asc");
  url.searchParams.set("limit", String(limit));

  return url;
}

function toActivityData(
  record: ParisOpenDataRecord,
  organizerId: string,
): Prisma.ActivityCreateInput | null {
  const externalId = getExternalId(record);
  const title = normalizeText(record.title);
  const startAt = record.date_start ? new Date(record.date_start) : null;
  const endAt = record.date_end ? new Date(record.date_end) : null;

  if (!externalId || !title || !startAt || Number.isNaN(startAt.getTime())) {
    return null;
  }

  const price = mapPrice(record);

  return {
    title,
    description: getDescription(record),
    itinerary: getItinerary(record) || null,
    type: "PUBLIC_EVENT",
    category: mapCategory(record),
    city: normalizeText(record.address_city) || "Paris",
    address: getAddress(record),
    startAt,
    endAt:
      endAt && !Number.isNaN(endAt.getTime()) && endAt > startAt ? endAt : null,
    capacity: 100,
    minParticipants: null,
    requiresApproval: false,
    priceType: price.priceType,
    priceText: price.priceText,
    coverImageUrl: normalizeText(record.cover_url) || null,
    externalSource: parisOpenDataSource,
    externalId,
    externalUrl: normalizeText(record.url) || null,
    sourcePayload: toJsonValue(record),
    importedAt: new Date(),
    status: "RECRUITING",
    visibility: "PUBLIC",
    organizer: {
      connect: {
        id: organizerId,
      },
    },
  };
}

async function ensurePublicActivityOrganizer() {
  return prisma.userProfile.upsert({
    where: {
      clerkUserId: publicActivityOrganizerClerkId,
    },
    update: {
      nickname: "Paris OpenData",
      bio: "自动同步的巴黎公共活动信息源。",
      status: "ACTIVE",
      syncedAt: new Date(),
    },
    create: {
      clerkUserId: publicActivityOrganizerClerkId,
      nickname: "Paris OpenData",
      bio: "自动同步的巴黎公共活动信息源。",
      status: "ACTIVE",
      syncedAt: new Date(),
    },
  });
}

async function fetchParisOpenDataEvents(limit: number) {
  const signal = AbortSignal.timeout(requestTimeoutMs);
  const response = await fetch(buildParisOpenDataUrl(limit), {
    headers: {
      Accept: "application/json",
      "User-Agent": "NextFunClub/1.0 public-activity-import",
    },
    cache: "no-store",
    signal,
  });

  if (!response.ok) {
    throw new Error(`Paris OpenData request failed: ${response.status}`);
  }

  const payload = (await response.json()) as ParisOpenDataResponse;

  return Array.isArray(payload.results) ? payload.results : [];
}

export async function importParisOpenDataActivities(
  options: {
    dryRun?: boolean;
    limit?: number;
  } = {},
): Promise<PublicActivityImportSummary> {
  const limit = normalizeImportLimit(options.limit);
  const dryRun = Boolean(options.dryRun);
  const [records, organizer] = await Promise.all([
    fetchParisOpenDataEvents(limit),
    ensurePublicActivityOrganizer(),
  ]);
  const summary: PublicActivityImportSummary = {
    source: parisOpenDataSource,
    fetched: records.length,
    created: 0,
    updated: 0,
    skipped: 0,
    dryRun,
  };

  for (const record of records) {
    const activityData = toActivityData(record, organizer.id);

    if (!activityData?.externalId || !activityData.externalSource) {
      summary.skipped += 1;
      continue;
    }

    const dedupeConditions: Prisma.ActivityWhereInput[] = [
      {
        externalSource: activityData.externalSource,
        externalId: activityData.externalId,
      },
    ];

    if (activityData.externalUrl) {
      dedupeConditions.push({
        externalUrl: activityData.externalUrl,
      });
    }

    const existingActivity = await prisma.activity.findFirst({
      where: {
        OR: dedupeConditions,
      },
      select: {
        id: true,
      },
    });

    if (existingActivity) {
      if (dryRun) {
        summary.updated += 1;
        continue;
      }

      await prisma.activity.update({
        where: {
          id: existingActivity.id,
        },
        data: {
          title: activityData.title,
          description: activityData.description,
          itinerary: activityData.itinerary,
          category: activityData.category,
          city: activityData.city,
          address: activityData.address,
          startAt: activityData.startAt,
          endAt: activityData.endAt,
          priceType: activityData.priceType,
          priceText: activityData.priceText,
          coverImageUrl: activityData.coverImageUrl,
          type: "PUBLIC_EVENT",
          externalSource: activityData.externalSource,
          externalId: activityData.externalId,
          externalUrl: activityData.externalUrl,
          sourcePayload: activityData.sourcePayload,
          importedAt: activityData.importedAt,
          visibility: "PUBLIC",
        },
      });
      summary.updated += 1;
      continue;
    }

    if (dryRun) {
      summary.created += 1;
      continue;
    }

    await prisma.activity.create({
      data: activityData,
    });
    summary.created += 1;
  }

  return summary;
}
