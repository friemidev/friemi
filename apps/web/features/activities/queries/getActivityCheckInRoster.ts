import { prisma } from "@/lib/prisma";

export type ActivityCheckInParticipantViewModel = {
  id: string;
  checkInCancelledAt: string | null;
  checkInRequestedAt: string | null;
  checkedInAt: string | null;
  joinedAt: string;
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
          where: {
            managerProfileId,
          },
          select: {
            id: true,
          },
          take: 1,
        },
      },
    });

    if (
      !activity ||
      (activity.organizerId !== managerProfileId &&
        activity.coManagers.length === 0)
    ) {
      return [];
    }

    const participants = await prisma.activityParticipant.findMany({
      where: {
        activityId,
        status: {
          in: ["JOINED", "APPROVED"],
        },
      },
      orderBy: [
        {
          checkInRequestedAt: "desc",
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
        checkInRequestedAt: true,
        checkedInAt: true,
        joinedAt: true,
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
      checkInRequestedAt: participant.checkInRequestedAt?.toISOString() ?? null,
      checkedInAt: participant.checkedInAt?.toISOString() ?? null,
      joinedAt: participant.joinedAt.toISOString(),
      user: participant.userProfile,
    }));
  } catch (error) {
    console.warn("Activity check-in roster is unavailable", error);
    return [];
  }
}
