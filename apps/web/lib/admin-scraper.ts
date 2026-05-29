import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  buildFingerprint,
  scrapeActivities,
  type ScraperSource,
  type ScrapedActivity,
} from "@chill-club/scraper-core";

export type AdminActivityListItem = {
  id: string;
  title: string;
  description: string;
  itinerary: string | null;
  type: "PUBLIC_EVENT" | "USER_HOSTED" | "LOCAL" | "TRIP";
  category: string;
  city: string;
  destination: string | null;
  address: string;
  startAt: string;
  endAt: string | null;
  capacity: number;
  minParticipants: number | null;
  requiresApproval: boolean;
  priceType: "FREE" | "AA" | "FIXED" | "RANGE";
  priceText: string;
  status: string;
  visibility: string;
  source: string | null;
  sourceUrl: string | null;
  merchantId: string | null;
  merchantName: string | null;
  merchantSlug: string | null;
  participantCount: number;
  organizerId: string;
  organizerNickname: string;
  createdAt: string;
  updatedAt: string;
};

export type ScraperPreviewItem = ScrapedActivity & {
  fingerprint: string;
  duplicateStatus: "new" | "existing" | "duplicate";
  duplicateOfId: string | null;
  duplicateOfTitle: string | null;
};

export type AdminOrganizerOption = {
  id: string;
  nickname: string;
};

export type AdminMerchantOption = {
  id: string;
  name: string;
  slug: string;
  city: string;
};

export type AdminMerchantListItem = AdminMerchantOption & {
  description: string;
  address: string | null;
  websiteUrl: string | null;
  contactEmail: string | null;
  activityCount: number;
  updatedAt: string;
};

export type AdminMerchantCreateInput = {
  name: string;
  slug?: string | null;
  description: string;
  city: string;
  address?: string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
  websiteUrl?: string | null;
  contactEmail?: string | null;
};

export type ScraperPreviewRequest = {
  sources: ScraperSource[];
  limit: number;
  mode: "recent" | "range" | "database";
  from?: string | null;
  to?: string | null;
  maxPages?: number;
};

export type ScraperImportMode =
  | "create_only"
  | "update_only"
  | "upsert"
  | "skip_existing";

export type ScraperImportOptions = {
  mode: ScraperImportMode;
  mergeDuplicates: boolean;
};

export type ScraperImportResult = {
  imported: number;
  skipped: number;
  merged: number;
};

function hashFingerprint(title: string, startAt: string, address: string) {
  return createHash("sha1")
    .update(`${title.toLowerCase()}|${startAt}|${address.toLowerCase()}`)
    .digest("hex");
}

function slugify(value: string) {
  return value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

function normalizeOptionalUrl(value: string | null | undefined) {
  const trimmed = value?.trim();

  if (!trimmed) {
    return null;
  }

  const withProtocol = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  try {
    const url = new URL(withProtocol);
    return ["http:", "https:"].includes(url.protocol) ? url.toString() : null;
  } catch {
    return null;
  }
}

function normalizeOptionalEmail(value: string | null | undefined) {
  const trimmed = value?.trim().toLowerCase();

  if (!trimmed) {
    return null;
  }

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed) ? trimmed : null;
}

function normalizeOptionalCoordinate(
  value: number | string | null | undefined,
) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const numberValue =
    typeof value === "number" ? value : Number.parseFloat(value);

  return Number.isFinite(numberValue) ? numberValue : null;
}

function serializeAdminMerchant(merchant: AdminMerchantOption) {
  return {
    id: merchant.id,
    name: merchant.name,
    slug: merchant.slug,
    city: merchant.city,
  };
}

function serializeAdminMerchantListItem(merchant: {
  id: string;
  name: string;
  slug: string;
  city: string;
  description: string;
  address: string | null;
  websiteUrl: string | null;
  contactEmail: string | null;
  updatedAt: Date;
  _count: { activities: number };
}): AdminMerchantListItem {
  return {
    id: merchant.id,
    name: merchant.name,
    slug: merchant.slug,
    city: merchant.city,
    description: merchant.description,
    address: merchant.address,
    websiteUrl: merchant.websiteUrl,
    contactEmail: merchant.contactEmail,
    activityCount: merchant._count.activities,
    updatedAt: merchant.updatedAt.toISOString(),
  };
}

export function serializeAdminActivity(
  activity: Prisma.ActivityGetPayload<{
    include: {
      organizer: { select: { id: true; nickname: true } };
      merchant: { select: { id: true; name: true; slug: true } };
      _count: { select: { participants: true } };
    };
  }>,
): AdminActivityListItem {
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
    startAt: activity.startAt.toISOString(),
    endAt: activity.endAt?.toISOString() ?? null,
    capacity: activity.capacity,
    minParticipants: activity.minParticipants,
    requiresApproval: activity.requiresApproval,
    priceType: activity.priceType,
    priceText: activity.priceText,
    status: activity.status,
    visibility: activity.visibility,
    source: activity.source,
    sourceUrl: activity.sourceUrl,
    merchantId: activity.merchant?.id ?? null,
    merchantName: activity.merchant?.name ?? null,
    merchantSlug: activity.merchant?.slug ?? null,
    participantCount: activity._count.participants,
    organizerId: activity.organizer.id,
    organizerNickname: activity.organizer.nickname,
    createdAt: activity.createdAt.toISOString(),
    updatedAt: activity.updatedAt.toISOString(),
  };
}

export async function getAdminState() {
  const [activities, organizers, merchants] = await Promise.all([
    prisma.activity.findMany({
      orderBy: [{ startAt: "desc" }, { createdAt: "desc" }],
      take: 200,
      include: {
        organizer: { select: { id: true, nickname: true } },
        merchant: { select: { id: true, name: true, slug: true } },
        _count: { select: { participants: true } },
      },
    }),
    prisma.userProfile.findMany({
      where: { status: "ACTIVE" },
      orderBy: [{ nickname: "asc" }],
      select: { id: true, nickname: true },
    }),
    getAdminMerchantOptions(),
  ]);

  return {
    activities: activities.map(serializeAdminActivity),
    organizers: organizers as AdminOrganizerOption[],
    merchants,
  };
}

export async function getAdminMerchantOptions() {
  const merchants = await prisma.merchant.findMany({
    where: { isActive: true },
    orderBy: [{ name: "asc" }],
    select: { id: true, name: true, slug: true, city: true },
  });

  return merchants.map(serializeAdminMerchant);
}

export async function getAdminMerchants() {
  const merchants = await prisma.merchant.findMany({
    where: { isActive: true },
    orderBy: [{ name: "asc" }],
    select: {
      id: true,
      name: true,
      slug: true,
      city: true,
      description: true,
      address: true,
      websiteUrl: true,
      contactEmail: true,
      updatedAt: true,
      _count: { select: { activities: true } },
    },
  });

  return merchants.map(serializeAdminMerchantListItem);
}

async function resolveDatabaseRange(
  mode: ScraperPreviewRequest["mode"],
  from?: string | null,
  to?: string | null,
) {
  if (mode !== "database") {
    return {
      from: from ? new Date(from) : null,
      to: to ? new Date(to) : null,
    };
  }

  const latest = await prisma.activity.findFirst({
    orderBy: { startAt: "desc" },
    select: { startAt: true },
  });
  return {
    from: latest?.startAt ?? null,
    to: to ? new Date(to) : null,
  };
}

export async function previewScraperActivities(
  request: ScraperPreviewRequest,
): Promise<ScraperPreviewItem[]> {
  const { from, to } = await resolveDatabaseRange(
    request.mode,
    request.from,
    request.to,
  );
  const scraped = await scrapeActivities({
    sources: request.sources,
    limit: request.limit,
    maxPages: request.maxPages ?? 3,
    from,
    to,
  });

  const existing = await prisma.activity.findMany({
    select: {
      id: true,
      title: true,
      startAt: true,
      address: true,
      sourceUrl: true,
    },
  });
  const byId = new Map(existing.map((item) => [item.id, item]));
  const byFingerprint = new Map(
    existing.map((item) => [
      hashFingerprint(item.title, item.startAt.toISOString(), item.address),
      item,
    ]),
  );
  const bySourceUrl = new Map(
    existing
      .filter((item) => item.sourceUrl)
      .map((item) => [item.sourceUrl as string, item]),
  );

  return scraped.map((activity) => {
    const fingerprint = buildFingerprint({
      source: activity.source,
      title: activity.title,
      startAt: activity.startAt,
      address: activity.address,
    });
    const lookupFingerprint = hashFingerprint(
      activity.title,
      activity.startAt,
      activity.address,
    );
    const sameId = byId.get(activity.id);
    const sameSourceUrl = bySourceUrl.get(activity.sourceUrl);
    const duplicate =
      sameId ?? sameSourceUrl ?? byFingerprint.get(lookupFingerprint) ?? null;

    return {
      ...activity,
      duplicateStatus: sameId ? "existing" : duplicate ? "duplicate" : "new",
      duplicateOfId: duplicate?.id ?? null,
      duplicateOfTitle: duplicate?.title ?? null,
      fingerprint,
    };
  });
}

function scraperActivityFields(
  activity: ScraperPreviewItem,
  organizerId: string,
) {
  return {
    title: activity.title,
    description: activity.description,
    itinerary: activity.itinerary,
    type: activity.type,
    category: activity.category,
    city: activity.city,
    destination: activity.destination,
    address: activity.address,
    startAt: new Date(activity.startAt),
    endAt: activity.endAt ? new Date(activity.endAt) : null,
    capacity: activity.capacity,
    minParticipants: activity.minParticipants,
    requiresApproval: activity.requiresApproval,
    priceType: activity.priceType,
    priceText: activity.priceText,
    coverImageUrl: activity.coverImageUrl,
    status: activity.status,
    visibility: activity.visibility,
    source: activity.source,
    sourceUrl: activity.sourceUrl,
    organizerId,
  };
}

async function upsertActivitySourceLink(
  activityId: string,
  source: string,
  sourceUrl: string,
) {
  await prisma.activitySourceLink.upsert({
    where: { sourceUrl },
    update: { activityId, source },
    create: { activityId, source, sourceUrl },
  });
}

function resolveImportTarget(
  activity: ScraperPreviewItem,
  mergeDuplicates: boolean,
) {
  if (
    mergeDuplicates &&
    activity.duplicateStatus === "duplicate" &&
    activity.duplicateOfId
  ) {
    return activity.duplicateOfId;
  }

  if (activity.duplicateStatus === "existing") {
    return activity.id;
  }

  return activity.id;
}

function shouldImportItem(
  activity: ScraperPreviewItem,
  options: ScraperImportOptions,
) {
  const { mode, mergeDuplicates } = options;

  if (activity.duplicateStatus === "existing") {
    if (mode === "create_only") return false;
    if (mode === "skip_existing") return false;
    return true;
  }

  if (activity.duplicateStatus === "duplicate") {
    if (mode === "create_only" && !mergeDuplicates) return false;
    if (mode === "update_only" && !mergeDuplicates) return false;
    return true;
  }

  if (mode === "update_only") return false;
  return true;
}

export async function importScraperActivities(
  items: ScraperPreviewItem[],
  options: ScraperImportOptions = {
    mode: "create_only",
    mergeDuplicates: false,
  },
): Promise<ScraperImportResult> {
  const importer = await prisma.userProfile.upsert({
    where: { clerkUserId: "scraper-import-bot" },
    update: {
      nickname: "Imported Paris Events",
      status: "ACTIVE",
      syncedAt: new Date(),
    },
    create: {
      clerkUserId: "scraper-import-bot",
      nickname: "Imported Paris Events",
      bio: "Imported from the scraper dashboard",
      interests: ["巴黎活动", "展览", "本地活动"],
      status: "ACTIVE",
      syncedAt: new Date(),
    },
  });

  let imported = 0;
  let skipped = 0;
  let merged = 0;

  for (const activity of items) {
    if (!shouldImportItem(activity, options)) {
      skipped += 1;
      continue;
    }

    const targetId = resolveImportTarget(activity, options.mergeDuplicates);
    const fields = scraperActivityFields(activity, importer.id);
    const isMerge =
      options.mergeDuplicates &&
      activity.duplicateStatus === "duplicate" &&
      activity.duplicateOfId === targetId;

    if (activity.duplicateStatus === "new" || options.mode === "upsert") {
      await prisma.activity.upsert({
        where: { id: targetId },
        update: fields,
        create: { id: targetId, ...fields },
      });
    } else {
      await prisma.activity.update({
        where: { id: targetId },
        data: fields,
      });
    }

    if (isMerge) {
      await upsertActivitySourceLink(
        targetId,
        activity.source,
        activity.sourceUrl,
      );
      merged += 1;
    }

    imported += 1;
  }

  return { imported, skipped, merged };
}

export async function createAdminActivity(data: {
  title: string;
  description: string;
  itinerary?: string | null;
  type: "PUBLIC_EVENT" | "USER_HOSTED" | "LOCAL" | "TRIP";
  category:
    | "BOARD_GAME"
    | "MOVIE"
    | "MUSIC"
    | "SPORTS"
    | "TRAVEL"
    | "FOOD"
    | "EXHIBITION"
    | "OTHER";
  city: string;
  destination?: string | null;
  address: string;
  startAt: string;
  endAt?: string | null;
  capacity: number;
  minParticipants?: number | null;
  requiresApproval: boolean;
  priceType: "FREE" | "AA" | "FIXED" | "RANGE";
  priceText: string;
  status:
    | "OPEN"
    | "FULL"
    | "DRAFT"
    | "RECRUITING"
    | "CONFIRMED"
    | "ENDED"
    | "CANCELLED";
  visibility: "PUBLIC" | "LINK_ONLY" | "PRIVATE";
  organizerId: string;
  merchantId?: string | null;
}) {
  const activity = await prisma.activity.create({
    data: {
      ...data,
      startAt: new Date(data.startAt),
      endAt: data.endAt ? new Date(data.endAt) : null,
      merchantId: data.merchantId || null,
    },
    include: {
      organizer: { select: { id: true, nickname: true } },
      merchant: { select: { id: true, name: true, slug: true } },
      _count: { select: { participants: true } },
    },
  });
  return serializeAdminActivity(activity);
}

export async function updateAdminActivity(
  id: string,
  data: Partial<Parameters<typeof createAdminActivity>[0]>,
) {
  const activity = await prisma.activity.update({
    where: { id },
    data: {
      ...data,
      ...(data.startAt ? { startAt: new Date(data.startAt) } : {}),
      ...(data.endAt !== undefined
        ? { endAt: data.endAt ? new Date(data.endAt) : null }
        : {}),
      ...(data.merchantId !== undefined
        ? { merchantId: data.merchantId || null }
        : {}),
    },
    include: {
      organizer: { select: { id: true, nickname: true } },
      merchant: { select: { id: true, name: true, slug: true } },
      _count: { select: { participants: true } },
    },
  });
  return serializeAdminActivity(activity);
}

export async function deleteAdminActivity(id: string) {
  await prisma.activity.delete({ where: { id } });
  return { ok: true };
}

export async function createAdminMerchant(data: AdminMerchantCreateInput) {
  const name = data.name.trim();
  const description = data.description.trim();
  const city = data.city.trim() || "Paris";

  if (!name || !description) {
    throw new Error("Merchant name and description are required.");
  }

  const baseSlug = slugify(data.slug?.trim() || name);
  const fallbackSlug = `merchant-${hashFingerprint(name, new Date().toISOString(), city).slice(0, 8)}`;
  const merchant = await prisma.merchant.create({
    data: {
      name,
      slug: baseSlug || fallbackSlug,
      description,
      city,
      address: data.address?.trim() || null,
      latitude: normalizeOptionalCoordinate(data.latitude),
      longitude: normalizeOptionalCoordinate(data.longitude),
      websiteUrl: normalizeOptionalUrl(data.websiteUrl),
      contactEmail: normalizeOptionalEmail(data.contactEmail),
    },
    select: {
      id: true,
      name: true,
      slug: true,
      city: true,
      description: true,
      address: true,
      websiteUrl: true,
      contactEmail: true,
      updatedAt: true,
      _count: { select: { activities: true } },
    },
  });

  return serializeAdminMerchantListItem(merchant);
}
