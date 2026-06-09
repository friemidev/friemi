import type {
  ActivityStatus,
  ActivityVisibility,
  ParticipantStatus,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";

const friendActivityFutureWindowDays = 30;
const friendActivityPastWindowDays = 14;
const defaultLimitPerFriend = 4;
const dayInMs = 24 * 60 * 60 * 1000;

const effectiveParticipantStatuses: ParticipantStatus[] = [
  "JOINED",
  "APPROVED",
];

const visibleFriendActivityStatuses: ActivityStatus[] = [
  "OPEN",
  "FULL",
  "RECRUITING",
  "CONFIRMED",
  "ENDED",
];

export type FriendNearestActivityTimeState =
  | "ONGOING"
  | "UPCOMING"
  | "ENDED";

export type FriendNearestActivitySignalViewModel = {
  id: string;
  title: string;
  startAt: string;
  endAt: string | null;
  timeState: FriendNearestActivityTimeState;
  visibility: ActivityVisibility;
};

type ActivityTiming = {
  startAt: Date;
  endAt: Date | null;
  status: ActivityStatus;
};

function getActivityEndBoundary(activity: ActivityTiming) {
  return activity.endAt ?? activity.startAt;
}

function getFriendActivityTimeState(
  activity: ActivityTiming,
  now: Date,
): FriendNearestActivityTimeState {
  if (activity.status === "ENDED" || activity.status === "CANCELLED") {
    return "ENDED";
  }

  if (activity.startAt > now) {
    return "UPCOMING";
  }

  if (getActivityEndBoundary(activity) >= now) {
    return "ONGOING";
  }

  return "ENDED";
}

function getTimeStateRank(state: FriendNearestActivityTimeState) {
  switch (state) {
    case "ONGOING":
      return 0;
    case "UPCOMING":
      return 1;
    case "ENDED":
      return 2;
  }
}

function compareNearestActivities(
  left: FriendNearestActivitySignalViewModel,
  right: FriendNearestActivitySignalViewModel,
) {
  const stateRankDiff =
    getTimeStateRank(left.timeState) - getTimeStateRank(right.timeState);

  if (stateRankDiff !== 0) {
    return stateRankDiff;
  }

  const leftStart = new Date(left.startAt).getTime();
  const rightStart = new Date(right.startAt).getTime();
  const leftEnd = left.endAt ? new Date(left.endAt).getTime() : leftStart;
  const rightEnd = right.endAt ? new Date(right.endAt).getTime() : rightStart;

  if (left.timeState === "ONGOING") {
    return (
      rightStart - leftStart ||
      leftEnd - rightEnd ||
      left.id.localeCompare(right.id)
    );
  }

  if (left.timeState === "UPCOMING") {
    return leftStart - rightStart || left.id.localeCompare(right.id);
  }

  return rightEnd - leftEnd || left.id.localeCompare(right.id);
}

export function compareOptionalFriendNearestActivities(
  left?: FriendNearestActivitySignalViewModel,
  right?: FriendNearestActivitySignalViewModel,
) {
  if (left && right) {
    return compareNearestActivities(left, right);
  }

  if (left) {
    return -1;
  }

  if (right) {
    return 1;
  }

  return 0;
}

export async function getFriendNearestActivitySignals({
  friendIds,
  limitPerFriend = defaultLimitPerFriend,
  viewerProfileId,
}: {
  friendIds: string[];
  limitPerFriend?: number;
  viewerProfileId: string;
}) {
  const uniqueFriendIds = Array.from(
    new Set(friendIds.filter((friendId) => friendId !== viewerProfileId)),
  );

  if (uniqueFriendIds.length === 0) {
    return new Map<string, FriendNearestActivitySignalViewModel[]>();
  }

  const now = new Date();
  const windowStart = new Date(
    now.getTime() - friendActivityPastWindowDays * dayInMs,
  );
  const windowEnd = new Date(
    now.getTime() + friendActivityFutureWindowDays * dayInMs,
  );
  const safeLimitPerFriend = Math.max(1, Math.min(limitPerFriend, 8));
  const participations = await prisma.activityParticipant.findMany({
    where: {
      userProfileId: {
        in: uniqueFriendIds,
      },
      status: {
        in: effectiveParticipantStatuses,
      },
      activity: {
        type: {
          not: "PUBLIC_EVENT",
        },
        status: {
          in: visibleFriendActivityStatuses,
        },
        organizer: {
          status: "ACTIVE",
        },
        AND: [
          {
            OR: [
              {
                startAt: {
                  gte: windowStart,
                  lte: windowEnd,
                },
              },
              {
                endAt: {
                  gte: windowStart,
                  lte: windowEnd,
                },
              },
              {
                startAt: {
                  lte: now,
                },
                endAt: {
                  gte: now,
                },
              },
            ],
          },
          {
            OR: [
              {
                visibility: "PUBLIC",
              },
              {
                organizerId: viewerProfileId,
              },
              {
                AND: [
                  {
                    visibility: "PRIVATE",
                  },
                  {
                    organizerId: {
                      in: uniqueFriendIds,
                    },
                  },
                ],
              },
            ],
          },
        ],
      },
    },
    orderBy: [{ activity: { startAt: "asc" } }, { id: "asc" }],
    take: Math.min(uniqueFriendIds.length * safeLimitPerFriend * 8, 500),
    select: {
      userProfileId: true,
      activity: {
        select: {
          id: true,
          title: true,
          startAt: true,
          endAt: true,
          status: true,
          visibility: true,
        },
      },
    },
  });
  const activitiesByFriendId = new Map<
    string,
    FriendNearestActivitySignalViewModel[]
  >();
  const seenActivityIdsByFriendId = new Map<string, Set<string>>();

  for (const participation of participations) {
    const seenActivityIds =
      seenActivityIdsByFriendId.get(participation.userProfileId) ?? new Set();

    if (seenActivityIds.has(participation.activity.id)) {
      continue;
    }

    seenActivityIds.add(participation.activity.id);
    seenActivityIdsByFriendId.set(
      participation.userProfileId,
      seenActivityIds,
    );

    const activities =
      activitiesByFriendId.get(participation.userProfileId) ?? [];
    const timeState = getFriendActivityTimeState(participation.activity, now);

    activities.push({
      id: participation.activity.id,
      title: participation.activity.title,
      startAt: participation.activity.startAt.toISOString(),
      endAt: participation.activity.endAt?.toISOString() ?? null,
      timeState,
      visibility: participation.activity.visibility,
    });
    activitiesByFriendId.set(participation.userProfileId, activities);
  }

  for (const [friendId, activities] of activitiesByFriendId.entries()) {
    activitiesByFriendId.set(
      friendId,
      [...activities]
        .sort(compareNearestActivities)
        .slice(0, safeLimitPerFriend),
    );
  }

  return activitiesByFriendId;
}
