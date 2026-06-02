import { prisma } from "@/lib/prisma";
import {
  isLegacyActivityInfoSource,
  publicActivityVisibility,
} from "@/features/activities/queries/getActivities";
import type { Prisma } from "@prisma/client";

const legacyActivityInfoSelect = {
  id: true,
  title: true,
  description: true,
  type: true,
  category: true,
  city: true,
  address: true,
  latitude: true,
  longitude: true,
  startAt: true,
  endAt: true,
  priceType: true,
  priceText: true,
  coverImageUrl: true,
  source: true,
  sourceUrl: true,
  externalSource: true,
  externalId: true,
  externalUrl: true,
  sourcePayload: true,
  importedAt: true,
  status: true,
  visibility: true,
} satisfies Prisma.ActivitySelect;

type LegacyActivityInfo = Prisma.ActivityGetPayload<{
  select: typeof legacyActivityInfoSelect;
}>;

function getPublicEventDedupeConditions(
  activity: LegacyActivityInfo,
): Prisma.PublicEventWhereInput[] {
  const conditions: Prisma.PublicEventWhereInput[] = [];

  if (activity.externalSource && activity.externalId) {
    conditions.push({
      externalSource: activity.externalSource,
      externalId: activity.externalId,
    });
  }

  if (activity.externalUrl) {
    conditions.push({
      externalUrl: activity.externalUrl,
    });
  }

  if (activity.sourceUrl) {
    conditions.push({
      sourceUrl: activity.sourceUrl,
    });
  }

  conditions.push({
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

  return conditions;
}

export async function ensurePublicEventFromActivityInfo(activityId: string) {
  const activity = await prisma.activity.findFirst({
    where: {
      id: activityId,
      visibility: {
        in: publicActivityVisibility,
      },
      organizer: {
        status: "ACTIVE",
      },
    },
    select: legacyActivityInfoSelect,
  });

  if (!activity || !isLegacyActivityInfoSource(activity)) {
    return null;
  }

  const existingPublicEvent = await prisma.publicEvent.findFirst({
    where: {
      OR: getPublicEventDedupeConditions(activity),
    },
    select: {
      id: true,
    },
  });

  if (existingPublicEvent) {
    return existingPublicEvent.id;
  }

  const publicEvent = await prisma.publicEvent.create({
    data: {
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
      status: activity.status === "CANCELLED" ? "CANCELLED" : "SCHEDULED",
      visibility: activity.visibility,
      source: activity.source,
      sourceUrl: activity.sourceUrl,
      externalSource: activity.externalSource,
      externalId: activity.externalId,
      externalUrl: activity.externalUrl,
      sourcePayload: activity.sourcePayload ?? undefined,
      importedAt: activity.importedAt,
      lastSyncedAt: new Date(),
    },
    select: {
      id: true,
    },
  });

  return publicEvent.id;
}
