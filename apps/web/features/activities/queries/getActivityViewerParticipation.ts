import type { ParticipantStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type ActivityViewerParticipation = {
  status: ParticipantStatus;
} | null;

export async function getActivityViewerParticipation(
  activityId: string,
  userProfileId: string | null | undefined,
): Promise<ActivityViewerParticipation> {
  if (!userProfileId) {
    return null;
  }

  const participation = await prisma.activityParticipant.findFirst({
    where: {
      activityId,
      userProfileId,
    },
    select: {
      status: true,
    },
  });

  if (!participation) {
    return null;
  }

  return {
    status: participation.status,
  };
}
