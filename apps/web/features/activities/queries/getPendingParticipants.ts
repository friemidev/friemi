import { prisma } from "@/lib/prisma";

export type PendingParticipantViewModel = {
  id: string;
  message: string | null;
  joinedAt: string;
  user: {
    id: string;
    nickname: string;
    friendCode: string | null;
  };
};

function getPublicParticipantName(user: {
  friendCode: string | null;
  nickname: string;
}) {
  const nickname = user.nickname.trim();

  if (nickname) {
    return nickname;
  }

  return user.friendCode ? `NF ${user.friendCode}` : "NF";
}

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
          friendCode: true,
        },
      },
    },
  });

  return participants.map((participant) => ({
    id: participant.id,
    message: participant.message,
    joinedAt: participant.joinedAt.toISOString(),
    user: {
      id: participant.userProfile.id,
      nickname: getPublicParticipantName(participant.userProfile),
      friendCode: participant.userProfile.friendCode,
    },
  }));
}
