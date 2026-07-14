import { createHash } from "node:crypto";
import { ActivityCategory, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

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
  latitude: number | null;
  longitude: number | null;
  startAt: string;
  endAt: string | null;
  capacity: number;
  coverImageUrl: string | null;
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

type AdminActivityInput = {
  title: string;
  description: string;
  itinerary?: string | null;
  type: "PUBLIC_EVENT" | "USER_HOSTED" | "LOCAL" | "TRIP";
  category: ActivityCategory;
  city: string;
  destination?: string | null;
  address: string;
  latitude?: number | string | null;
  longitude?: number | string | null;
  startAt: string;
  endAt?: string | null;
  capacity: number;
  coverImageUrl?: string | null;
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
  min = Number.NEGATIVE_INFINITY,
  max = Number.POSITIVE_INFINITY,
) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const numberValue =
    typeof value === "number" ? value : Number.parseFloat(value);

  return Number.isFinite(numberValue) &&
    numberValue >= min &&
    numberValue <= max
    ? numberValue
    : null;
}

function normalizeOptionalLatitude(value: number | string | null | undefined) {
  return normalizeOptionalCoordinate(value, -90, 90);
}

function normalizeOptionalLongitude(value: number | string | null | undefined) {
  return normalizeOptionalCoordinate(value, -180, 180);
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
    latitude: activity.latitude,
    longitude: activity.longitude,
    startAt: activity.startAt.toISOString(),
    endAt: activity.endAt?.toISOString() ?? null,
    capacity: activity.capacity,
    coverImageUrl: activity.coverImageUrl,
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

function buildAdminActivityUpdateData(
  data: Partial<AdminActivityInput>,
): Prisma.ActivityUncheckedUpdateInput {
  const updateData: Prisma.ActivityUncheckedUpdateInput = {};

  if (data.title !== undefined) updateData.title = data.title;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.itinerary !== undefined) updateData.itinerary = data.itinerary;
  if (data.type !== undefined) updateData.type = data.type;
  if (data.category !== undefined) updateData.category = data.category;
  if (data.city !== undefined) updateData.city = data.city;
  if (data.destination !== undefined) updateData.destination = data.destination;
  if (data.address !== undefined) updateData.address = data.address;
  if (data.latitude !== undefined) {
    updateData.latitude = normalizeOptionalLatitude(data.latitude);
  }
  if (data.longitude !== undefined) {
    updateData.longitude = normalizeOptionalLongitude(data.longitude);
  }
  if (data.startAt !== undefined) updateData.startAt = new Date(data.startAt);
  if (data.endAt !== undefined) {
    updateData.endAt = data.endAt ? new Date(data.endAt) : null;
  }
  if (data.capacity !== undefined) updateData.capacity = data.capacity;
  if (data.coverImageUrl !== undefined) {
    updateData.coverImageUrl = data.coverImageUrl;
  }
  if (data.minParticipants !== undefined) {
    updateData.minParticipants = data.minParticipants;
  }
  if (data.requiresApproval !== undefined) {
    updateData.requiresApproval = data.requiresApproval;
  }
  if (data.priceType !== undefined) updateData.priceType = data.priceType;
  if (data.priceText !== undefined) updateData.priceText = data.priceText;
  if (data.status !== undefined) updateData.status = data.status;
  if (data.visibility !== undefined) updateData.visibility = data.visibility;
  if (data.organizerId !== undefined) updateData.organizerId = data.organizerId;
  if (data.merchantId !== undefined) {
    updateData.merchantId = data.merchantId || null;
  }

  return updateData;
}

export async function createAdminActivity(data: AdminActivityInput) {
  const activity = await prisma.activity.create({
    data: {
      title: data.title,
      description: data.description,
      itinerary: data.itinerary ?? null,
      type: data.type,
      category: data.category,
      city: data.city,
      destination: data.destination ?? null,
      address: data.address,
      latitude: normalizeOptionalLatitude(data.latitude),
      longitude: normalizeOptionalLongitude(data.longitude),
      startAt: new Date(data.startAt),
      endAt: data.endAt ? new Date(data.endAt) : null,
      capacity: data.capacity,
      coverImageUrl: data.coverImageUrl ?? null,
      minParticipants: data.minParticipants ?? null,
      requiresApproval: data.requiresApproval,
      priceType: data.priceType,
      priceText: data.priceText,
      status: data.status,
      visibility: data.visibility,
      organizerId: data.organizerId,
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
  data: Partial<AdminActivityInput>,
) {
  const activity = await prisma.activity.update({
    where: { id },
    data: buildAdminActivityUpdateData(data),
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
      latitude: normalizeOptionalLatitude(data.latitude),
      longitude: normalizeOptionalLongitude(data.longitude),
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
