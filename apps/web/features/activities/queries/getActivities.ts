import { prisma } from "@/lib/prisma";
import type { ActivityStatus, ActivityVisibility, ParticipantStatus, Prisma } from "@prisma/client";
import type { ActivityCardViewModel } from "../types";

export const visibleActivityStatuses: ActivityStatus[] = ["RECRUITING", "CONFIRMED"];
const participantStatuses: ParticipantStatus[] = ["JOINED", "APPROVED"];
export const publicActivityVisibility: ActivityVisibility[] = ["PUBLIC"];
const coverTones: ActivityCardViewModel["coverTone"][] = ["moss", "clay", "sky"];

export const activityCardSelect = {
  id: true,
  title: true,
  description: true,
  category: true,
  city: true,
  address: true,
  startAt: true,
  endAt: true,
  capacity: true,
  priceText: true,
  status: true,
  _count: {
    select: {
      participants: {
        where: {
          status: {
            in: participantStatuses
          }
        }
      }
    }
  }
} satisfies Prisma.ActivitySelect;

type GetActivitiesOptions = {
  includePast?: boolean;
  limit?: number;
};

type VisibleActivityWhereOptions = {
  includePast?: boolean;
  now?: Date;
};

function normalizeLimit(limit: number | undefined) {
  if (limit === undefined) {
    return undefined;
  }

  return Math.min(Math.max(Math.floor(limit), 1), 50);
}

export function getActivityCoverTone(activityId: string) {
  const charTotal = [...activityId].reduce((total, char) => total + char.charCodeAt(0), 0);
  return coverTones[charTotal % coverTones.length];
}

type ActivityQueryResult = Prisma.ActivityGetPayload<{ select: typeof activityCardSelect }>;

export function getVisibleActivityWhere(options: VisibleActivityWhereOptions = {}): Prisma.ActivityWhereInput {
  const now = options.now ?? new Date();

  return {
    ...(options.includePast
      ? {}
      : {
          OR: [
            {
              startAt: {
                gte: now
              }
            },
            {
              endAt: {
                gte: now
              }
            }
          ]
        }),
    status: {
      in: visibleActivityStatuses
    },
    visibility: {
      in: publicActivityVisibility
    },
    organizer: {
      status: "ACTIVE"
    }
  };
}

export function getActivityCardViewModel(activity: ActivityQueryResult): ActivityCardViewModel {
  return {
    id: activity.id,
    title: activity.title,
    description: activity.description,
    category: activity.category,
    city: activity.city,
    address: activity.address,
    startAt: activity.startAt.toISOString(),
    endAt: activity.endAt?.toISOString() ?? null,
    capacity: activity.capacity,
    participantCount: activity._count.participants,
    priceText: activity.priceText,
    status: activity.status,
    coverTone: getActivityCoverTone(activity.id)
  };
}

export async function getActivities(options: GetActivitiesOptions = {}): Promise<ActivityCardViewModel[]> {
  const now = new Date();
  const activities = await prisma.activity.findMany({
    where: getVisibleActivityWhere({ includePast: options.includePast, now }),
    orderBy: [{ startAt: "asc" }, { id: "asc" }],
    take: normalizeLimit(options.limit),
    select: activityCardSelect
  });

  return activities.map(getActivityCardViewModel);
}
