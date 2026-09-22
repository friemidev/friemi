import { prisma } from "@/lib/prisma";

export type ActivityCheckInParticipantViewModel = {
  id: string;
  checkInCancelledAt: string | null;
  user: {
    avatarUrl: string | null;
    friendCode: string | null;
    nickname: string;
  };
};

export async function getActivityCheckInRoster(
  activityId: string,
  managerProfileId: string | null | undefined,
): Promise<ActivityCheckInParticipantViewModel[]> {
  if (!managerProfileId) {
    return [];
  }

  try {
    const activity = await prisma.activity.findUnique({
      where: {
        id: activityId,
      },
      select: {
        organizerId: true,
        coManagers: {
          select: {
            managerProfileId: true,
          },
        },
      },
    });

    if (
      !activity ||
      (activity.organizerId !== managerProfileId &&
        !activity.coManagers.some(
          (coManager) => coManager.managerProfileId === managerProfileId,
        ))
    ) {
      return [];
    }

    const exemptProfileIds = [
      activity.organizerId,
      ...activity.coManagers.map((coManager) => coManager.managerProfileId),
    ];

    const participants = await prisma.activityParticipant.findMany({
      where: {
        activityId,
        userProfileId: {
          notIn: exemptProfileIds,
        },
        status: {
          in: ["JOINED", "APPROVED"],
        },
      },
      orderBy: [
        {
          checkInCancelledAt: "desc",
        },
        {
          joinedAt: "asc",
        },
        {
          id: "asc",
        },
      ],
      select: {
        id: true,
        checkInCancelledAt: true,
        userProfile: {
          select: {
            avatarUrl: true,
            friendCode: true,
            nickname: true,
          },
        },
      },
    });

    return participants.map((participant) => ({
      id: participant.id,
      checkInCancelledAt: participant.checkInCancelledAt?.toISOString() ?? null,
      user: participant.userProfile,
    }));
  } catch (error) {
    console.warn("Activity check-in roster is unavailable", error);
    return [];
  }
}
