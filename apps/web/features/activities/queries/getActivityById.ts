import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import type { ActivityDetailViewModel } from "../types";
import {
  activityCardSelect,
  getActivityCoverTone,
  getVisibleActivityWhere
} from "./getActivities";

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
      bio: true
    }
  }
} satisfies Prisma.ActivitySelect;

type ActivityDetailQueryResult = Prisma.ActivityGetPayload<{ select: typeof activityDetailSelect }>;

function getActivityDetailViewModel(activity: ActivityDetailQueryResult): ActivityDetailViewModel {
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
    organizer: activity.organizer
  };
}

export async function getActivityById(activityId: string): Promise<ActivityDetailViewModel | null> {
  const activity = await prisma.activity.findFirst({
    where: {
      id: activityId,
      ...getVisibleActivityWhere()
    },
    select: activityDetailSelect
  });

  return activity ? getActivityDetailViewModel(activity) : null;
}
