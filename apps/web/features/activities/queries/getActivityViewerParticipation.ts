import type { ParticipantStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type ActivityViewerParticipation = {
  checkInCancelledAt: Date | null;
  checkInRequestedAt: Date | null;
  checkedInAt: Date | null;
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
    checkInCancelledAt: null,
    checkInRequestedAt: null,
    checkedInAt: null,
    status: participation.status,
  };
}
