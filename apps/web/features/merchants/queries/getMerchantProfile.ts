import { prisma } from "@/lib/prisma";
import {
  activityCardSelect,
  getActivityCardViewModel,
  getVisibleActivityWhere,
} from "@/features/activities/queries/getActivities";
import type { MerchantProfileViewModel } from "../types";

const merchantActivityLimit = 12;

export async function getMerchantProfile(
  merchantIdOrSlug: string,
): Promise<MerchantProfileViewModel | null> {
  const now = new Date();
  const visibleActivityWhere = getVisibleActivityWhere({ now });

  const merchant = await prisma.merchant.findFirst({
    where: {
      isActive: true,
      OR: [{ id: merchantIdOrSlug }, { slug: merchantIdOrSlug }],
    },
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      logoUrl: true,
      city: true,
      address: true,
      latitude: true,
      longitude: true,
      websiteUrl: true,
      contactEmail: true,
      _count: {
        select: {
          activities: true,
        },
      },
      activities: {
        where: visibleActivityWhere,
        orderBy: [{ startAt: "asc" }, { id: "asc" }],
        take: merchantActivityLimit,
        select: activityCardSelect,
      },
    },
  });

  if (!merchant) {
    return null;
  }

  const activities = merchant.activities.map(getActivityCardViewModel);

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
    totalActivityCount: merchant._count.activities,
    upcomingActivityCount: activities.length,
    activities,
  };
}
