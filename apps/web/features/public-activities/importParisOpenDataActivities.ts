import type { ActivityCategory, PriceType, Prisma } from "@prisma/client";
import { MAX_ACTIVITY_DESCRIPTION_LENGTH } from "@/features/activities/schemas/activitySchema";
import { prisma } from "@/lib/prisma";

const parisOpenDataDataset = "que-faire-a-paris-";
const parisOpenDataSource = "paris-opendata:que-faire-a-paris";
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
  lat_lon?:
    | {
        lat?: string | number | null;
        lon?: string | number | null;
        lng?: string | number | null;
      }
    | [string | number, string | number]
    | string
    | null;
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

function normalizeExternalImageUrl(value: string | null | undefined) {
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

function parseCoordinate(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const numberValue =
    typeof value === "number" ? value : Number.parseFloat(value);

  return Number.isFinite(numberValue) ? numberValue : null;
}

function isValidCoordinate(latitude: number | null, longitude: number | null) {
  return (
    latitude !== null &&
    longitude !== null &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
}

function getCoordinates(record: ParisOpenDataRecord) {
  const rawCoordinates = record.lat_lon;

  if (Array.isArray(rawCoordinates)) {
    const latitude = parseCoordinate(rawCoordinates[0]);
    const longitude = parseCoordinate(rawCoordinates[1]);

    return isValidCoordinate(latitude, longitude)
      ? { latitude, longitude }
      : { latitude: null, longitude: null };
  }

  if (typeof rawCoordinates === "string") {
    const [latPart, lonPart] = rawCoordinates.split(",");
    const latitude = parseCoordinate(latPart);
    const longitude = parseCoordinate(lonPart);

    return isValidCoordinate(latitude, longitude)
      ? { latitude, longitude }
      : { latitude: null, longitude: null };
  }

  if (rawCoordinates && typeof rawCoordinates === "object") {
    const latitude = parseCoordinate(rawCoordinates.lat);
    const longitude = parseCoordinate(rawCoordinates.lon ?? rawCoordinates.lng);

    return isValidCoordinate(latitude, longitude)
      ? { latitude, longitude }
      : { latitude: null, longitude: null };
  }

  return { latitude: null, longitude: null };
}

function getDescription(record: ParisOpenDataRecord) {
  const leadText = stripHtml(record.lead_text);
  const description = stripHtml(record.description);
  const officialUrl = normalizeText(record.url);
  const body = leadText || description || "公共活动信息来自 Paris OpenData。";
  const text = officialUrl ? `${body}\n\n官方链接：${officialUrl}` : body;

  return truncateText(text, MAX_ACTIVITY_DESCRIPTION_LENGTH);
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

function toPublicEventData(
  record: ParisOpenDataRecord,
): Prisma.PublicEventCreateInput | null {
  const externalId = getExternalId(record);
  const title = normalizeText(record.title);
  const startAt = record.date_start ? new Date(record.date_start) : null;
  const endAt = record.date_end ? new Date(record.date_end) : null;

  if (!externalId || !title || !startAt || Number.isNaN(startAt.getTime())) {
    return null;
  }

  const price = mapPrice(record);
  const coordinates = getCoordinates(record);

  return {
    title,
    description: getDescription(record),
    category: mapCategory(record),
    city: normalizeText(record.address_city) || "Paris",
    address: getAddress(record),
    latitude: coordinates.latitude,
    longitude: coordinates.longitude,
    startAt,
    endAt:
      endAt && !Number.isNaN(endAt.getTime()) && endAt > startAt ? endAt : null,
    priceType: price.priceType,
    priceText: price.priceText,
    coverImageUrl: normalizeExternalImageUrl(record.cover_url),
    officialUrl: normalizeText(record.url) || null,
    source: parisOpenDataSource,
    sourceUrl: normalizeText(record.url) || null,
    externalSource: parisOpenDataSource,
    externalId,
    externalUrl: normalizeText(record.url) || null,
    sourcePayload: toJsonValue(record),
    importedAt: new Date(),
    lastSyncedAt: new Date(),
    status: "SCHEDULED",
    visibility: "PUBLIC",
  };
}

function getSemanticDedupeCondition(
  publicEventData: Prisma.PublicEventCreateInput,
): Prisma.PublicEventWhereInput | null {
  const title =
    typeof publicEventData.title === "string"
      ? publicEventData.title.trim()
      : "";
  const city =
    typeof publicEventData.city === "string" ? publicEventData.city.trim() : "";
  const address =
    typeof publicEventData.address === "string"
      ? publicEventData.address.trim()
      : "";
  const startAt =
    publicEventData.startAt instanceof Date ? publicEventData.startAt : null;

  if (!title || !city || !address || !startAt) {
    return null;
  }

  return {
    title: {
      equals: title,
      mode: "insensitive",
    },
    city: {
      equals: city,
      mode: "insensitive",
    },
    address: {
      equals: address,
      mode: "insensitive",
    },
    startAt,
  };
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
  const records = await fetchParisOpenDataEvents(limit);
  const summary: PublicActivityImportSummary = {
    source: parisOpenDataSource,
    fetched: records.length,
    created: 0,
    updated: 0,
    skipped: 0,
    dryRun,
  };

  for (const record of records) {
    const publicEventData = toPublicEventData(record);

    if (!publicEventData?.externalId || !publicEventData.externalSource) {
      summary.skipped += 1;
      continue;
    }

    const dedupeConditions: Prisma.PublicEventWhereInput[] = [
      {
        externalSource: publicEventData.externalSource,
        externalId: publicEventData.externalId,
      },
    ];

    if (publicEventData.externalUrl) {
      dedupeConditions.push({
        externalUrl: publicEventData.externalUrl,
      });
    }

    const semanticDedupeCondition = getSemanticDedupeCondition(publicEventData);

    if (semanticDedupeCondition) {
      dedupeConditions.push(semanticDedupeCondition);
    }

    const existingPublicEvent = await prisma.publicEvent.findFirst({
      where: {
        OR: dedupeConditions,
      },
      select: {
        id: true,
      },
    });

    if (existingPublicEvent) {
      if (dryRun) {
        summary.updated += 1;
        continue;
      }

      await prisma.publicEvent.update({
        where: {
          id: existingPublicEvent.id,
        },
        data: {
          title: publicEventData.title,
          description: publicEventData.description,
          category: publicEventData.category,
          city: publicEventData.city,
          address: publicEventData.address,
          latitude: publicEventData.latitude,
          longitude: publicEventData.longitude,
          startAt: publicEventData.startAt,
          endAt: publicEventData.endAt,
          priceType: publicEventData.priceType,
          priceText: publicEventData.priceText,
          coverImageUrl: publicEventData.coverImageUrl,
          officialUrl: publicEventData.officialUrl,
          source: publicEventData.source,
          sourceUrl: publicEventData.sourceUrl,
          externalSource: publicEventData.externalSource,
          externalId: publicEventData.externalId,
          externalUrl: publicEventData.externalUrl,
          sourcePayload: publicEventData.sourcePayload,
          importedAt: publicEventData.importedAt,
          lastSyncedAt: publicEventData.lastSyncedAt,
          status: "SCHEDULED",
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

    await prisma.publicEvent.create({
      data: publicEventData,
    });
    summary.created += 1;
  }

  return summary;
}
