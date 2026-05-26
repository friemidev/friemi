import { prisma } from "@/lib/prisma";
import type { ParticipantStatus, Prisma } from "@prisma/client";
import {
  activityCardSelect,
  getActivityCardViewModel,
} from "@/features/activities/queries/getActivities";
import type { ActivityCardViewModel } from "@/features/activities/types";

export const profileActivityListLimit = 12;

const profileParticipationSelect = {
  id: true,
  status: true,
  joinedAt: true,
  cancelledAt: true,
  activity: {
    select: activityCardSelect,
  },
} satisfies Prisma.ActivityParticipantSelect;

type ProfileParticipationQueryResult = Prisma.ActivityParticipantGetPayload<{
  select: typeof profileParticipationSelect;
}>;

export type ProfileParticipationViewModel = {
  id: string;
  status: ParticipantStatus;
  joinedAt: string;
  cancelledAt: string | null;
  activity: ActivityCardViewModel;
};

export type ProfileDashboardViewModel = {
  createdActivityCount: number;
  participationCount: number;
  createdActivities: ActivityCardViewModel[];
  participations: ProfileParticipationViewModel[];
};

function mapParticipation(
  participation: ProfileParticipationQueryResult,
): ProfileParticipationViewModel {
  return {
    id: participation.id,
    status: participation.status,
    joinedAt: participation.joinedAt.toISOString(),
    cancelledAt: participation.cancelledAt?.toISOString() ?? null,
    activity: getActivityCardViewModel(participation.activity),
  };
}

export async function getProfileDashboard(
  profileId: string,
): Promise<ProfileDashboardViewModel> {
  const [
    createdActivityCount,
    participationCount,
    createdActivities,
    participations,
  ] = await Promise.all([
    prisma.activity.count({
      where: {
        organizerId: profileId,
      },
    }),
    prisma.activityParticipant.count({
      where: {
        userProfileId: profileId,
      },
    }),
    prisma.activity.findMany({
      where: {
        organizerId: profileId,
      },
      orderBy: [{ startAt: "desc" }, { id: "asc" }],
      take: profileActivityListLimit,
      select: activityCardSelect,
    }),
    prisma.activityParticipant.findMany({
      where: {
        userProfileId: profileId,
      },
      orderBy: [{ joinedAt: "desc" }, { id: "asc" }],
      take: profileActivityListLimit,
      select: profileParticipationSelect,
    }),
  ]);

  return {
    createdActivityCount,
    participationCount,
    createdActivities: createdActivities.map(getActivityCardViewModel),
    participations: participations.map(mapParticipation),
  };
}
