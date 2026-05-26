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

  const participation = await prisma.activityParticipant.findUnique({
    where: {
      activityId_userProfileId: {
        activityId,
        userProfileId,
      },
    },
    select: {
      status: true,
    },
  });

  return participation;
}
