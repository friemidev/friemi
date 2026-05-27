import { prisma } from "@/lib/prisma";

export type PendingParticipantViewModel = {
  id: string;
  message: string | null;
  joinedAt: string;
  user: {
    id: string;
    nickname: string;
    email: string | null;
  };
};

export async function getPendingParticipants(
  activityId: string,
  organizerId: string,
): Promise<PendingParticipantViewModel[]> {
  const activity = await prisma.activity.findFirst({
    where: {
      id: activityId,
      organizerId,
    },
    select: {
      id: true,
    },
  });

  if (!activity) {
    return [];
  }

  const participants = await prisma.activityParticipant.findMany({
    where: {
      activityId,
      status: "PENDING",
    },
    orderBy: [{ joinedAt: "asc" }, { id: "asc" }],
    select: {
      id: true,
      message: true,
      joinedAt: true,
      userProfile: {
        select: {
          id: true,
          nickname: true,
          email: true,
        },
      },
    },
  });

  return participants.map((participant) => ({
    id: participant.id,
    message: participant.message,
    joinedAt: participant.joinedAt.toISOString(),
    user: participant.userProfile,
  }));
}
