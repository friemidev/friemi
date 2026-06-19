import type { ParticipantStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { ActivityCardViewModel } from "../types";

const organizerCountedParticipationStatuses: ParticipantStatus[] = [
  "JOINED",
  "APPROVED",
];

export async function applyOrganizerParticipationDefaults(
  activities: ActivityCardViewModel[],
) {
  const teamActivities = activities.filter(
    (activity) =>
      activity.type !== "PUBLIC_EVENT" &&
      Boolean(activity.organizerId) &&
      !activity.isActivityInfo,
  );

  if (teamActivities.length === 0) {
    return activities;
  }

  const organizerIds = Array.from(
    new Set(
      teamActivities
        .map((activity) => activity.organizerId)
        .filter((organizerId): organizerId is string => Boolean(organizerId)),
    ),
  );
  const organizerIdByActivityId = new Map(
    teamActivities.map((activity) => [activity.id, activity.organizerId ?? ""]),
  );
  const organizerParticipationByActivityId = new Map<
    string,
    ParticipantStatus
  >();

  const organizerParticipations = await prisma.activityParticipant.findMany({
    where: {
      activityId: {
        in: teamActivities.map((activity) => activity.id),
      },
      userProfileId: {
        in: organizerIds,
      },
    },
    select: {
      activityId: true,
      status: true,
      userProfileId: true,
    },
  });

  for (const participation of organizerParticipations) {
    if (
      organizerIdByActivityId.get(participation.activityId) ===
      participation.userProfileId
    ) {
      organizerParticipationByActivityId.set(
        participation.activityId,
        participation.status,
      );
    }
  }

  return activities.map((activity) => {
    if (
      activity.type === "PUBLIC_EVENT" ||
      !activity.organizerId ||
      activity.isActivityInfo
    ) {
      return activity;
    }

    const organizerParticipationStatus = organizerParticipationByActivityId.get(
      activity.id,
    );

    if (
      organizerParticipationStatus &&
      organizerCountedParticipationStatuses.includes(
        organizerParticipationStatus,
      )
    ) {
      return activity;
    }

    if (organizerParticipationStatus) {
      return activity;
    }

    return {
      ...activity,
      participantCount: activity.participantCount + 1,
    };
  });
}
