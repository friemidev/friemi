import { prisma } from "@/lib/prisma";
import type { ActivityStatus, Prisma } from "@prisma/client";
import type { ActivityDetailViewModel } from "../types";
import {
  activityCardSelect,
  getActivityCoverTone,
  publicActivityVisibility,
} from "./getActivities";

const detailActivityStatuses: ActivityStatus[] = [
  "OPEN",
  "FULL",
  "RECRUITING",
  "CONFIRMED",
  "ENDED",
  "CANCELLED",
];

const activityDetailSelect = {
  ...activityCardSelect,
  itinerary: true,
  type: true,
  destination: true,
  minParticipants: true,
  requiresApproval: true,
  priceType: true,
  organizer: {
    select: {
      id: true,
      nickname: true,
      bio: true,
      _count: {
        select: {
          followers: true,
          following: true,
        },
      },
    },
  },
} satisfies Prisma.ActivitySelect;

type ActivityDetailQueryResult = Prisma.ActivityGetPayload<{
  select: typeof activityDetailSelect;
}>;

function getActivityDetailViewModel(
  activity: ActivityDetailQueryResult,
): ActivityDetailViewModel {
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
    participantCount: activity._count.participants,
    priceText: activity.priceText,
    status: activity.status,
    coverTone: getActivityCoverTone(activity.id),
    merchant: activity.merchant
      ? {
          id: activity.merchant.id,
          slug: activity.merchant.slug,
          name: activity.merchant.name,
          logoUrl: activity.merchant.logoUrl,
          city: activity.merchant.city,
        }
      : null,
    organizer: {
      id: activity.organizer.id,
      nickname: activity.organizer.nickname,
      bio: activity.organizer.bio,
      followerCount: activity.organizer._count.followers,
      followingCount: activity.organizer._count.following,
    },
  };
}

export async function getActivityById(
  activityId: string,
): Promise<ActivityDetailViewModel | null> {
  const activity = await prisma.activity.findFirst({
    where: {
      id: activityId,
      status: {
        in: detailActivityStatuses,
      },
      visibility: {
        in: publicActivityVisibility,
      },
      organizer: {
        status: "ACTIVE",
      },
    },
    select: activityDetailSelect,
  });

  return activity ? getActivityDetailViewModel(activity) : null;
}
