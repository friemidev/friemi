import { prisma } from "@/lib/prisma";
import {
  activityCardSelect,
  getActivityCardViewModel,
  getActivityTimeStateWhere,
  getVisibleActivityWhere,
} from "@/features/activities/queries/getActivities";
import type { ActivityCardViewModel } from "@/features/activities/types";
import {
  getGlobalSearchTerms,
  normalizeGlobalSearchQuery,
} from "../utils/searchQuery";
import type { Prisma } from "@prisma/client";

const activityResultLimit = 6;
const merchantResultLimit = 5;

export type GlobalSearchMerchantViewModel = {
  id: string;
  slug: string;
  name: string;
  description: string;
  logoUrl: string | null;
  city: string;
  address: string | null;
  activityCount: number;
};

export type GlobalSearchResults = {
  query: string;
  activities: ActivityCardViewModel[];
  activityCount: number;
  merchants: GlobalSearchMerchantViewModel[];
  merchantCount: number;
};

export async function getGlobalSearchResults(
  rawQuery: string,
): Promise<GlobalSearchResults> {
  const query = normalizeGlobalSearchQuery(rawQuery);
  const terms = getGlobalSearchTerms(query);

  if (terms.length === 0) {
    return {
      query,
      activities: [],
      activityCount: 0,
      merchants: [],
      merchantCount: 0,
    };
  }

  const now = new Date();
  const searchableActivityWhere = getVisibleActivityWhere({
    includeEnded: true,
    includePast: true,
    now,
  });
  const activeActivityWhere = getVisibleActivityWhere({ now });
  const endedActivityWhere = getActivityTimeStateWhere("ENDED", now);
  const activitySearchWhere = {
    AND: terms.map((term) => ({
      OR: [
        { title: { contains: term, mode: "insensitive" as const } },
        { description: { contains: term, mode: "insensitive" as const } },
        { city: { contains: term, mode: "insensitive" as const } },
        { address: { contains: term, mode: "insensitive" as const } },
      ],
    })),
  };
  const activityWhere = {
    AND: [searchableActivityWhere, activitySearchWhere],
  };
  const activeActivityResultWhere = {
    AND: [activeActivityWhere, activitySearchWhere],
  };
  const endedActivityResultWhere = {
    AND: [searchableActivityWhere, activitySearchWhere, endedActivityWhere],
  };
  const merchantSearchWhere = {
    isActive: true,
    AND: terms.map((term) => ({
      OR: [
        { name: { contains: term, mode: "insensitive" as const } },
        { description: { contains: term, mode: "insensitive" as const } },
        { city: { contains: term, mode: "insensitive" as const } },
        { address: { contains: term, mode: "insensitive" as const } },
      ],
    })),
  };
  const [activityCount, activities, merchantCount, merchants] =
    await Promise.all([
      prisma.activity.count({
        where: activityWhere,
      }),
      getSearchActivityResults(
        activeActivityResultWhere,
        endedActivityResultWhere,
      ),
      prisma.merchant.count({
        where: merchantSearchWhere,
      }),
      prisma.merchant.findMany({
        where: merchantSearchWhere,
        orderBy: [{ name: "asc" }, { id: "asc" }],
        take: merchantResultLimit,
        select: {
          id: true,
          slug: true,
          name: true,
          description: true,
          logoUrl: true,
          city: true,
          address: true,
          _count: {
            select: {
              activities: {
                where: activeActivityWhere,
              },
            },
          },
        },
      }),
    ]);

  return {
    query,
    activities: activities.map(getActivityCardViewModel),
    activityCount,
    merchants: merchants.map((merchant) => ({
      id: merchant.id,
      slug: merchant.slug,
      name: merchant.name,
      description: merchant.description,
      logoUrl: merchant.logoUrl,
      city: merchant.city,
      address: merchant.address,
      activityCount: merchant._count.activities,
    })),
    merchantCount,
  };
}

async function getSearchActivityResults(
  activeActivityWhere: Prisma.ActivityWhereInput,
  endedActivityWhere: Prisma.ActivityWhereInput,
) {
  const activeActivities = await prisma.activity.findMany({
    where: activeActivityWhere,
    orderBy: [{ startAt: "asc" }, { id: "asc" }],
    take: activityResultLimit,
    select: activityCardSelect,
  });

  if (activeActivities.length >= activityResultLimit) {
    return activeActivities;
  }

  const endedActivities = await prisma.activity.findMany({
    where: endedActivityWhere,
    orderBy: [{ startAt: "desc" }, { id: "asc" }],
    take: activityResultLimit - activeActivities.length,
    select: activityCardSelect,
  });

  return [...activeActivities, ...endedActivities];
}
