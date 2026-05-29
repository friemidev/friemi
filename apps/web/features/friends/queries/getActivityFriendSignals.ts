import { prisma } from "@/lib/prisma";
import type { ParticipantStatus } from "@prisma/client";
import type {
  ActivityCardViewModel,
  ActivityFriendSignalUserViewModel,
  ActivityFriendSignalViewModel,
} from "@/features/activities/types";

const friendSignalPreviewLimit = 3;
const friendSignalParticipantStatuses: ParticipantStatus[] = [
  "JOINED",
  "APPROVED",
];

function getOtherFriendId(
  friendship: { userAId: string; userBId: string },
  viewerProfileId: string,
) {
  return friendship.userAId === viewerProfileId
    ? friendship.userBId
    : friendship.userAId;
}

function getSignalFromFriends(
  friends: ActivityFriendSignalUserViewModel[],
): ActivityFriendSignalViewModel | null {
  if (friends.length === 0) {
    return null;
  }

  return {
    count: friends.length,
    previewFriends: friends.slice(0, friendSignalPreviewLimit),
    allFriends: friends,
    extraCount: Math.max(friends.length - friendSignalPreviewLimit, 0),
  };
}

export async function getActivityFriendSignalMap(
  activityIds: string[],
  viewerProfileId: string | null | undefined,
) {
  const uniqueActivityIds = Array.from(new Set(activityIds.filter(Boolean)));

  if (!viewerProfileId || uniqueActivityIds.length === 0) {
    return new Map<string, ActivityFriendSignalViewModel>();
  }

  const friendships = await prisma.friendship.findMany({
    where: {
      OR: [{ userAId: viewerProfileId }, { userBId: viewerProfileId }],
    },
    select: {
      userAId: true,
      userBId: true,
    },
  });
  const friendIds = Array.from(
    new Set(
      friendships.map((friendship) =>
        getOtherFriendId(friendship, viewerProfileId),
      ),
    ),
  );

  if (friendIds.length === 0) {
    return new Map<string, ActivityFriendSignalViewModel>();
  }

  const participants = await prisma.activityParticipant.findMany({
    where: {
      activityId: {
        in: uniqueActivityIds,
      },
      userProfileId: {
        in: friendIds,
      },
      status: {
        in: friendSignalParticipantStatuses,
      },
      userProfile: {
        status: "ACTIVE",
      },
    },
    orderBy: [{ joinedAt: "asc" }, { id: "asc" }],
    select: {
      activityId: true,
      userProfile: {
        select: {
          id: true,
          nickname: true,
          avatarUrl: true,
        },
      },
    },
  });
  const friendsByActivityId = new Map<
    string,
    ActivityFriendSignalUserViewModel[]
  >();

  for (const participant of participants) {
    const currentFriends =
      friendsByActivityId.get(participant.activityId) ?? [];

    if (
      currentFriends.some((friend) => friend.id === participant.userProfile.id)
    ) {
      continue;
    }

    currentFriends.push(participant.userProfile);
    friendsByActivityId.set(participant.activityId, currentFriends);
  }

  return new Map(
    Array.from(friendsByActivityId.entries())
      .map(([activityId, friends]) => [
        activityId,
        getSignalFromFriends(friends),
      ])
      .filter(
        (entry): entry is [string, ActivityFriendSignalViewModel] =>
          entry[1] !== null,
      ),
  );
}

export async function getActivityFriendSignal(
  activityId: string,
  viewerProfileId: string | null | undefined,
) {
  const signalMap = await getActivityFriendSignalMap(
    [activityId],
    viewerProfileId,
  );

  return signalMap.get(activityId) ?? null;
}

export async function attachActivityFriendSignals<
  TActivity extends ActivityCardViewModel,
>(
  activities: TActivity[],
  viewerProfileId: string | null | undefined,
): Promise<TActivity[]> {
  if (!viewerProfileId || activities.length === 0) {
    return activities;
  }

  const signalMap = await getActivityFriendSignalMap(
    activities.map((activity) => activity.id),
    viewerProfileId,
  );

  return activities.map((activity) => ({
    ...activity,
    friendSignal: signalMap.get(activity.id) ?? null,
  }));
}
