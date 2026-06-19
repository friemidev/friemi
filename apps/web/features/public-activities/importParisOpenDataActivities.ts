import type { ActivityCategory, PriceType, Prisma } from "@prisma/client";
import { MAX_ACTIVITY_DESCRIPTION_LENGTH } from "@/features/activities/schemas/activitySchema";
import { getStoredTicketLabel } from "@/features/public-events/utils/ticketCta";
import { prisma } from "@/lib/prisma";

const parisOpenDataDataset = "que-faire-a-paris-";
export const parisOpenDataSource = "paris-opendata:que-faire-a-paris";
const defaultImportLimit = 50;
const maxImportLimit = 200;
const requestTimeoutMs = 10_000;
const dayMs = 24 * 60 * 60 * 1000;

type ImportPoolConfig = {
  key: string;
  label: string;
  weight: number;
  where?: string;
};

type ImportPool = ImportPoolConfig & {
  limit: number;
};

type ImportTimeWindowConfig = {
  key: string;
  label: string;
  startOffsetDays: number;
  endOffsetDays: number;
  weight: number;
};

type ImportTimeWindow = ImportTimeWindowConfig & {
  endAt: Date;
  limit: number;
  poolKey: string;
  poolLabel: string;
  poolWhere?: string;
  startAt: Date;
};

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
  cover_alt?: string | null;
  cover_credit?: string | null;
  cover_url?: string | null;
  access_link?: string | null;
  access_link_text?: string | null;
  contact_organisation_name?: string | null;
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
  programs?: string | null;
  access_type?: string | null;
  audience?: string | null;
  group?: string | null;
  locale?: string | null;
  qfap_tags?: string[] | string | null;
  univers?: string[] | string | null;
  universe_tags?: string[] | string | null;
};

export type PublicActivityImportSummary = {
  source: typeof parisOpenDataSource;
  limit: number;
  fetched: number;
  timeWindows: Array<{
    endAt: string;
    fetched: number;
    key: string;
    label: string;
    limit: number;
    poolKey: string;
    poolLabel: string;
    startAt: string;
  }>;
  pools: Array<{
    fetched: number;
    key: string;
    label: string;
    limit: number;
  }>;
  created: number;
  updated: number;
  skipped: number;
  skippedInvalidRecords: number;
  emptyResult: boolean;
  dryRun: boolean;
  startedAt: string;
  completedAt: string;
  durationMs: number;
};

export type PublicActivityImportFailureStage =
  | "external_api"
  | "database"
  | "unexpected";

export class PublicActivityImportError extends Error {
  code: string;
  stage: PublicActivityImportFailureStage;
  status?: number;

  constructor({
    cause,
    code,
    message,
    stage,
    status,
  }: {
    cause?: unknown;
    code: string;
    message: string;
    stage: PublicActivityImportFailureStage;
    status?: number;
  }) {
    super(message, { cause });
    this.name = "PublicActivityImportError";
    this.code = code;
    this.stage = stage;
    this.status = status;
  }
}

function normalizeImportLimit(limit: number | undefined) {
  if (!limit || Number.isNaN(limit)) {
    return defaultImportLimit;
  }

  return Math.min(Math.max(Math.floor(limit), 1), maxImportLimit);
}

function escapeSearchValue(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

const chineseRelatedKeywords = [
  "chinois",
  "chinoise",
  "mandarin",
  "taïwan",
  "taiwan",
  "hong kong",
  "franco-chinois",
  "hanfu",
  "mahjong",
  "calligraphie chinoise",
  "nouvel an chinois",
  "quartier asiatique",
  "institut confucius",
];

const chineseRelatedSearchFields = [
  "qfap_tags",
  "title",
  "lead_text",
  "description",
  "audience",
  "contact_organisation_name",
];

function buildChineseRelatedWhereClause() {
  return chineseRelatedKeywords
    .flatMap((keyword) => {
      const escapedKeyword = escapeSearchValue(keyword);

      return chineseRelatedSearchFields.map(
        (field) => `search(${field}, "${escapedKeyword}")`,
      );
    })
    .join(" OR ");
}

function normalizeSearchText(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

function getSearchableRecordText(record: ParisOpenDataRecord) {
  return [
    record.qfap_tags,
    record.title,
    record.lead_text,
    stripHtml(record.description),
    record.audience,
    record.contact_organisation_name,
    record.cover_alt,
    record.cover_credit,
    record.programs,
    record.group,
    record.univers,
    record.universe_tags,
  ]
    .flatMap((value) => {
      if (Array.isArray(value)) {
        return value.map(String);
      }

      return typeof value === "string" ? [value] : [];
    })
    .join(" ");
}

function isChineseRelatedRecord(record: ParisOpenDataRecord) {
  const searchableText = normalizeSearchText(getSearchableRecordText(record));

  return chineseRelatedKeywords.some((keyword) =>
    searchableText.includes(normalizeSearchText(keyword)),
  );
}

const importPoolConfigs: ImportPoolConfig[] = [
  {
    key: "general",
    label: "普通活动",
    weight: 0.8,
  },
  {
    key: "chinese-related",
    label: "中文/华人相关",
    weight: 0.2,
    where: buildChineseRelatedWhereClause(),
  },
];

const importTimeWindowConfigs: ImportTimeWindowConfig[] = [
  {
    key: "0-2d",
    label: "0-2 天",
    startOffsetDays: 0,
    endOffsetDays: 3,
    weight: 0.2,
  },
  {
    key: "3-14d",
    label: "3-14 天",
    startOffsetDays: 3,
    endOffsetDays: 15,
    weight: 0.6,
  },
  {
    key: "15-45d",
    label: "15-45 天",
    startOffsetDays: 15,
    endOffsetDays: 46,
    weight: 0.2,
  },
];

function allocateWeightedLimits<T extends { key: string; weight: number }>(
  configs: T[],
  limit: number,
  preferredKey?: string,
) {
  const rawAllocations = configs.map((config, index) => {
    const rawLimit = limit * config.weight;

    return {
      floor: Math.floor(rawLimit),
      fraction: rawLimit - Math.floor(rawLimit),
      index,
      priority: config.key === preferredKey ? 0 : index + 1,
    };
  });
  const limits = rawAllocations.map((allocation) => allocation.floor);
  let remaining = limit - limits.reduce((sum, value) => sum + value, 0);

  for (const allocation of [...rawAllocations].sort(
    (a, b) => b.fraction - a.fraction || a.priority - b.priority,
  )) {
    if (remaining <= 0) {
      break;
    }

    limits[allocation.index] += 1;
    remaining -= 1;
  }

  return limits;
}

function buildImportPools(limit: number) {
  const poolLimits = allocateWeightedLimits(
    importPoolConfigs,
    limit,
    "general",
  );

  return importPoolConfigs
    .map((config, index): ImportPool => {
      return {
        ...config,
        limit: poolLimits[index] ?? 0,
      };
    })
    .filter((pool) => pool.limit > 0);
}

function buildImportTimeWindows(limit: number, now = new Date()) {
  const pools = buildImportPools(limit);
  const windows: ImportTimeWindow[] = [];

  for (const pool of pools) {
    const windowLimits = allocateWeightedLimits(
      importTimeWindowConfigs,
      pool.limit,
      "3-14d",
    );

    for (const [index, config] of importTimeWindowConfigs.entries()) {
      const windowLimit = windowLimits[index] ?? 0;

      if (windowLimit <= 0) {
        continue;
      }

      const startAt = new Date(now.getTime() + config.startOffsetDays * dayMs);
      const endAt = new Date(now.getTime() + config.endOffsetDays * dayMs);

      windows.push({
        ...config,
        endAt,
        limit: windowLimit,
        poolKey: pool.key,
        poolLabel: pool.label,
        poolWhere: pool.where,
        startAt,
      });
    }
  }

  return windows;
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
  return normalizeExternalUrl(value);
}

function normalizeExternalUrl(value: string | null | undefined) {
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

function getTicketLabel(record: ParisOpenDataRecord) {
  return getStoredTicketLabel(record.access_link_text);
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
  const body = leadText || description || "公共活动来自 Paris OpenData。";
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

function buildParisOpenDataUrl(window: ImportTimeWindow) {
  const url = new URL(
    `https://opendata.paris.fr/api/explore/v2.1/catalog/datasets/${parisOpenDataDataset}/records`,
  );
  const whereParts = [
    `date_start >= '${window.startAt.toISOString()}'`,
    `date_start < '${window.endAt.toISOString()}'`,
  ];

  if (window.poolWhere) {
    whereParts.push(`(${window.poolWhere})`);
  }

  url.searchParams.set("where", whereParts.join(" AND "));
  url.searchParams.set("order_by", "date_start asc");
  url.searchParams.set("limit", String(window.limit));

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
  const ticketUrl = normalizeExternalUrl(record.access_link);

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
    ticketUrl,
    ticketLabel: ticketUrl ? getTicketLabel(record) : null,
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

async function fetchParisOpenDataEvents(window: ImportTimeWindow) {
  const signal = AbortSignal.timeout(requestTimeoutMs);
  let response: Response;

  try {
    response = await fetch(buildParisOpenDataUrl(window), {
      headers: {
        Accept: "application/json",
        "User-Agent": "NextFunClub/1.0 public-activity-import",
      },
      cache: "no-store",
      signal,
    });
  } catch (error) {
    throw new PublicActivityImportError({
      cause: error,
      code: "EXTERNAL_API_REQUEST_FAILED",
      message: "Paris OpenData request failed before receiving a response.",
      stage: "external_api",
    });
  }

  if (!response.ok) {
    throw new PublicActivityImportError({
      code: "EXTERNAL_API_BAD_STATUS",
      message: `Paris OpenData request failed with status ${response.status}.`,
      stage: "external_api",
      status: response.status,
    });
  }

  let payload: ParisOpenDataResponse;

  try {
    payload = (await response.json()) as ParisOpenDataResponse;
  } catch (error) {
    throw new PublicActivityImportError({
      cause: error,
      code: "EXTERNAL_API_INVALID_JSON",
      message: "Paris OpenData returned invalid JSON.",
      stage: "external_api",
    });
  }

  return Array.isArray(payload.results) ? payload.results : [];
}

function getRecordDedupeKey(record: ParisOpenDataRecord) {
  return (
    normalizeText(record.id) ||
    normalizeText(record.event_id) ||
    normalizeText(record.url)
  );
}

async function fetchDistributedParisOpenDataEvents(limit: number) {
  const windows = buildImportTimeWindows(limit);
  const records: ParisOpenDataRecord[] = [];
  const seenRecordKeys = new Set<string>();
  const poolSummaries = buildImportPools(limit).map((pool) => ({
    fetched: 0,
    key: pool.key,
    label: pool.label,
    limit: pool.limit,
  }));
  const timeWindows: PublicActivityImportSummary["timeWindows"] = [];

  for (const window of windows) {
    const windowRecords = await fetchParisOpenDataEvents(window);
    const filteredWindowRecords = window.poolWhere
      ? windowRecords.filter(isChineseRelatedRecord)
      : windowRecords;
    const poolSummary = poolSummaries.find(
      (summary) => summary.key === window.poolKey,
    );

    if (poolSummary) {
      poolSummary.fetched += filteredWindowRecords.length;
    }

    timeWindows.push({
      endAt: window.endAt.toISOString(),
      fetched: filteredWindowRecords.length,
      key: window.key,
      label: window.label,
      limit: window.limit,
      poolKey: window.poolKey,
      poolLabel: window.poolLabel,
      startAt: window.startAt.toISOString(),
    });

    for (const record of filteredWindowRecords) {
      const dedupeKey = getRecordDedupeKey(record);

      if (dedupeKey && seenRecordKeys.has(dedupeKey)) {
        continue;
      }

      if (dedupeKey) {
        seenRecordKeys.add(dedupeKey);
      }

      records.push(record);
    }
  }

  return {
    pools: poolSummaries,
    records,
    timeWindows,
  };
}

export async function importParisOpenDataActivities(
  options: {
    dryRun?: boolean;
    limit?: number;
  } = {},
): Promise<PublicActivityImportSummary> {
  const limit = normalizeImportLimit(options.limit);
  const dryRun = Boolean(options.dryRun);
  const startedAt = new Date();
  const { pools, records, timeWindows } =
    await fetchDistributedParisOpenDataEvents(limit);
  const summary: PublicActivityImportSummary = {
    source: parisOpenDataSource,
    limit,
    fetched: records.length,
    timeWindows,
    pools,
    created: 0,
    updated: 0,
    skipped: 0,
    skippedInvalidRecords: 0,
    emptyResult: records.length === 0,
    dryRun,
    startedAt: startedAt.toISOString(),
    completedAt: startedAt.toISOString(),
    durationMs: 0,
  };

  for (const record of records) {
    const publicEventData = toPublicEventData(record);

    if (!publicEventData?.externalId || !publicEventData.externalSource) {
      summary.skipped += 1;
      summary.skippedInvalidRecords += 1;
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

    let existingPublicEvent: { id: string } | null;

    try {
      existingPublicEvent = await prisma.publicEvent.findFirst({
        where: {
          OR: dedupeConditions,
        },
        select: {
          id: true,
        },
      });
    } catch (error) {
      throw new PublicActivityImportError({
        cause: error,
        code: "DATABASE_DEDUPE_LOOKUP_FAILED",
        message: "Failed to look up existing public activity before import.",
        stage: "database",
      });
    }

    if (existingPublicEvent) {
      if (dryRun) {
        summary.updated += 1;
        continue;
      }

      try {
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
            ticketUrl: publicEventData.ticketUrl,
            ticketLabel: publicEventData.ticketLabel,
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
      } catch (error) {
        throw new PublicActivityImportError({
          cause: error,
          code: "DATABASE_UPDATE_FAILED",
          message: "Failed to update existing public activity.",
          stage: "database",
        });
      }
      summary.updated += 1;
      continue;
    }

    if (dryRun) {
      summary.created += 1;
      continue;
    }

    try {
      await prisma.publicEvent.create({
        data: publicEventData,
      });
    } catch (error) {
      throw new PublicActivityImportError({
        cause: error,
        code: "DATABASE_CREATE_FAILED",
        message: "Failed to create imported public activity.",
        stage: "database",
      });
    }
    summary.created += 1;
  }

  const completedAt = new Date();
  summary.completedAt = completedAt.toISOString();
  summary.durationMs = completedAt.getTime() - startedAt.getTime();

  return summary;
}
