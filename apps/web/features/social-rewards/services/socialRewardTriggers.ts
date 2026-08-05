import type { ActivityStatus, ActivityType, ParticipantStatus } from "@prisma/client";
import { grantSuccessfulActivityBlindBoxFragment } from "@/features/charm/services/charmRewards";
import { syncProfileAchievements } from "@/features/achievements/services/achievements";
import { markReferralFirstParticipation } from "@/features/referrals/services/referrals";
import { prisma } from "@/lib/prisma";

const activeParticipationStatuses: ParticipantStatus[] = ["JOINED", "APPROVED"];
const defaultRecentEndedActivityWindowMs = 90 * 24 * 60 * 60 * 1000;

export type RewardActivityParticipant = {
  checkInCancelledAt?: Date | null;
  checkInRequestedAt?: Date | null;
  checkedInAt?: Date | null;
  status: ParticipantStatus;
  userProfileId: string;
};

export type RewardActivityGuestParticipant = {
  linkedParticipant?: RewardActivityParticipant | null;
  linkedUserProfileId?: string | null;
  status: ParticipantStatus;
};

export type RewardActivitySnapshot = {
  endAt: Date | null;
  guestParticipants?: RewardActivityGuestParticipant[];
  id: string;
  organizerId: string;
  participants?: RewardActivityParticipant[];
  startAt: Date;
  status: ActivityStatus;
  type: ActivityType;
};

export type SuccessfulActivityRewardEligibility =
  | {
      eligible: true;
      participantProfileIds: string[];
      reason: null;
    }
  | {
      eligible: false;
      participantProfileIds: string[];
      reason:
        | "CANCELLED"
        | "NOT_ENDED"
        | "PUBLIC_EVENT"
        | "TOO_FEW_PARTICIPANTS";
    };

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function isActiveParticipationStatus(status: ParticipantStatus) {
  return activeParticipationStatuses.includes(status);
}

function hasCheckInSignal(participant: RewardActivityParticipant) {
  return Boolean(
    participant.checkInCancelledAt ||
      participant.checkInRequestedAt ||
      participant.checkedInAt,
  );
}

function usesActivityCheckIn(
  activity: Pick<RewardActivitySnapshot, "guestParticipants" | "participants">,
) {
  return (
    (activity.participants ?? []).some(hasCheckInSignal) ||
    (activity.guestParticipants ?? []).some((guest) =>
      guest.linkedParticipant ? hasCheckInSignal(guest.linkedParticipant) : false,
    )
  );
}

function isRealParticipant({
  activityUsesCheckIn,
  hasEnded,
  participant,
}: {
  activityUsesCheckIn: boolean;
  hasEnded: boolean;
  participant: RewardActivityParticipant;
}) {
  return (
    isActiveParticipationStatus(participant.status) &&
    (Boolean(participant.checkedInAt) ||
      (hasEnded && !activityUsesCheckIn && !hasCheckInSignal(participant)))
  );
}

export function getActivityRewardEndBoundary(activity: {
  endAt: Date | null;
  startAt: Date;
}) {
  return activity.endAt ?? activity.startAt;
}

export function isActivityEndedForRewards(
  activity: {
    endAt: Date | null;
    startAt: Date;
    status: ActivityStatus;
  },
  now = new Date(),
) {
  return (
    activity.status === "ENDED" ||
    getActivityRewardEndBoundary(activity).getTime() <= now.getTime()
  );
}

export function getSuccessfulActivityParticipantProfileIds(
  activity: RewardActivitySnapshot,
  now = new Date(),
) {
  return unique([
    activity.organizerId,
    ...getRealParticipationProfileIds(activity, now),
  ]);
}

export function getRealParticipationProfileIds(
  activity: RewardActivitySnapshot,
  now = new Date(),
) {
  const hasEnded = isActivityEndedForRewards(activity, now);
  const activityUsesCheckIn = usesActivityCheckIn(activity);

  return unique([
    ...(activity.participants ?? [])
      .filter(
        (participant) =>
          isRealParticipant({
            activityUsesCheckIn,
            hasEnded,
            participant,
          }),
      )
      .map((participant) => participant.userProfileId),
    ...(hasEnded
      ? (activity.guestParticipants ?? [])
          .filter(
            (guest) =>
              isActiveParticipationStatus(guest.status) &&
              guest.linkedUserProfileId &&
              (!guest.linkedParticipant
                ? !activityUsesCheckIn
                : isRealParticipant({
                    activityUsesCheckIn,
                    hasEnded,
                    participant: guest.linkedParticipant,
                  })),
          )
          .map((guest) => guest.linkedUserProfileId ?? "")
      : []),
  ]);
}

export function resolveSuccessfulActivityRewardEligibility(
  activity: RewardActivitySnapshot,
  now = new Date(),
): SuccessfulActivityRewardEligibility {
  const participantProfileIds = getSuccessfulActivityParticipantProfileIds(
    activity,
    now,
  );

  if (activity.type === "PUBLIC_EVENT") {
    return {
      eligible: false,
      participantProfileIds,
      reason: "PUBLIC_EVENT",
    };
  }

  if (activity.status === "CANCELLED") {
    return {
      eligible: false,
      participantProfileIds,
      reason: "CANCELLED",
    };
  }

  if (!isActivityEndedForRewards(activity, now)) {
    return {
      eligible: false,
      participantProfileIds,
      reason: "NOT_ENDED",
    };
  }

  if (participantProfileIds.length < 2) {
    return {
      eligible: false,
      participantProfileIds,
      reason: "TOO_FEW_PARTICIPANTS",
    };
  }

  return {
    eligible: true,
    participantProfileIds,
    reason: null,
  };
}

export async function syncActivitySocialRewards({
  activityId,
  now = new Date(),
}: {
  activityId: string;
  now?: Date;
}) {
  const activity = await prisma.activity.findUnique({
    where: {
      id: activityId,
    },
    select: {
      endAt: true,
      guestParticipants: {
        where: {
          linkedUserProfileId: {
            not: null,
          },
          status: {
            in: activeParticipationStatuses,
          },
        },
        select: {
          linkedParticipant: {
            select: {
              checkInCancelledAt: true,
              checkInRequestedAt: true,
              checkedInAt: true,
              status: true,
              userProfileId: true,
            },
          },
          linkedUserProfileId: true,
          status: true,
        },
      },
      id: true,
      organizerId: true,
      coManagers: {
        select: {
          managerProfileId: true,
        },
      },
      participants: {
        where: {
          status: {
            in: activeParticipationStatuses,
          },
        },
        select: {
          checkInCancelledAt: true,
          checkInRequestedAt: true,
          checkedInAt: true,
          status: true,
          userProfileId: true,
        },
      },
      startAt: true,
      status: true,
      type: true,
    },
  });

  if (!activity) {
    return {
      activityId,
      blindBoxFragment: null,
      eligibility: null,
      profileSyncCount: 0,
      referralSyncCount: 0,
    };
  }

  const operatorProfileIds = new Set([
    activity.organizerId,
    ...activity.coManagers.map((coManager) => coManager.managerProfileId),
  ]);
  const rewardActivity: RewardActivitySnapshot = {
    endAt: activity.endAt,
    guestParticipants: activity.guestParticipants.filter(
      (guestParticipant) =>
        !guestParticipant.linkedUserProfileId ||
        !operatorProfileIds.has(guestParticipant.linkedUserProfileId),
    ),
    id: activity.id,
    organizerId: activity.organizerId,
    participants: activity.participants.filter(
      (participant) => !operatorProfileIds.has(participant.userProfileId),
    ),
    startAt: activity.startAt,
    status: activity.status,
    type: activity.type,
  };
  const realParticipantProfileIds = getRealParticipationProfileIds(
    rewardActivity,
    now,
  );
  const eligibility = resolveSuccessfulActivityRewardEligibility(
    rewardActivity,
    now,
  );
  const profileIdsToSync = unique([
    activity.organizerId,
    ...realParticipantProfileIds,
  ]);

  const [profileSyncResults, referralSyncResults] = await Promise.all([
    Promise.allSettled(
      profileIdsToSync.map((profileId) => syncProfileAchievements(profileId)),
    ),
    Promise.allSettled(
      realParticipantProfileIds.map((profileId) =>
        markReferralFirstParticipation(profileId),
      ),
    ),
  ]);

  const blindBoxFragment = eligibility.eligible
    ? await grantSuccessfulActivityBlindBoxFragment({
        activityId: activity.id,
        profileId: activity.organizerId,
      }).catch((error: unknown) => {
        console.error("Failed to grant successful activity fragment", error);

        return null;
      })
    : null;

  return {
    activityId: activity.id,
    blindBoxFragment,
    eligibility,
    profileSyncCount: profileSyncResults.filter(
      (result) => result.status === "fulfilled",
    ).length,
    referralSyncCount: referralSyncResults.filter(
      (result) => result.status === "fulfilled",
    ).length,
  };
}

export async function syncRecentEndedActivitySocialRewards({
  now = new Date(),
  take = 100,
}: {
  now?: Date;
  take?: number;
} = {}) {
  const recentEndedAfter = new Date(
    now.getTime() - defaultRecentEndedActivityWindowMs,
  );
  const activities = await prisma.activity.findMany({
    where: {
      status: {
        not: "CANCELLED",
      },
      type: {
        not: "PUBLIC_EVENT",
      },
      OR: [
        {
          status: "ENDED",
        },
        {
          endAt: {
            gte: recentEndedAfter,
            lte: now,
          },
        },
        {
          endAt: null,
          startAt: {
            gte: recentEndedAfter,
            lte: now,
          },
        },
      ],
    },
    orderBy: [{ endAt: "desc" }, { startAt: "desc" }, { id: "asc" }],
    select: {
      id: true,
    },
    take,
  });

  const results = await Promise.allSettled(
    activities.map((activity) =>
      syncActivitySocialRewards({
        activityId: activity.id,
        now,
      }),
    ),
  );

  return {
    activityCount: activities.length,
    syncedCount: results.filter((result) => result.status === "fulfilled").length,
  };
}
