import { prisma } from "@/lib/prisma";
import type { ParticipantStatus, Prisma } from "@prisma/client";
import {
  activityCardSelect,
  getActivityCardViewModel,
} from "@/features/activities/queries/getActivities";
import type { ActivityCardViewModel } from "@/features/activities/types";

export const profileActivityListLimit = 12;
export const profileFollowListLimit = 12;

const publicProfileSelect = {
  id: true,
  nickname: true,
  friendCode: true,
  avatarUrl: true,
  bio: true,
  status: true,
} satisfies Prisma.UserProfileSelect;

const profileParticipationSelect = {
  id: true,
  status: true,
  joinedAt: true,
  cancelledAt: true,
  activity: {
    select: activityCardSelect,
  },
} satisfies Prisma.ActivityParticipantSelect;

type ProfileParticipationQueryResult = Prisma.ActivityParticipantGetPayload<{
  select: typeof profileParticipationSelect;
}>;

export type ProfileParticipationViewModel = {
  id: string;
  status: ParticipantStatus;
  joinedAt: string;
  cancelledAt: string | null;
  activity: ActivityCardViewModel;
};

export type ProfileDashboardViewModel = {
  createdActivityCount: number;
  participationCount: number;
  followersCount: number;
  followingCount: number;
  createdActivities: ActivityCardViewModel[];
  participations: ProfileParticipationViewModel[];
  followers: ProfileFollowUserViewModel[];
  following: ProfileFollowUserViewModel[];
};

export type PublicProfileViewModel = {
  id: string;
  nickname: string;
  friendCode: string | null;
  avatarUrl: string | null;
  bio: string | null;
};

export type ProfileFollowUserViewModel = {
  id: string;
  nickname: string;
  bio: string | null;
  avatarUrl: string | null;
};

function mapPublicProfile(profile: {
  id: string;
  nickname: string;
  friendCode: string | null;
  avatarUrl: string | null;
  bio: string | null;
}): PublicProfileViewModel {
  const hasPublicNickname = profile.nickname.trim().length > 0;

  return {
    id: profile.id,
    nickname: hasPublicNickname
      ? profile.nickname
      : profile.friendCode
        ? `NF ${profile.friendCode}`
        : "NF",
    friendCode: profile.friendCode,
    avatarUrl: hasPublicNickname ? profile.avatarUrl : null,
    bio: profile.bio,
  };
}

function mapParticipation(
  participation: ProfileParticipationQueryResult,
): ProfileParticipationViewModel {
  return {
    id: participation.id,
    status: participation.status,
    joinedAt: participation.joinedAt.toISOString(),
    cancelledAt: participation.cancelledAt?.toISOString() ?? null,
    activity: getActivityCardViewModel(participation.activity),
  };
}

function mapFollowUser(user: {
  id: string;
  nickname: string;
  bio: string | null;
  avatarUrl: string | null;
}): ProfileFollowUserViewModel {
  return {
    id: user.id,
    nickname: user.nickname,
    bio: user.bio,
    avatarUrl: user.avatarUrl,
  };
}

export async function getProfileDashboard(
  profileId: string,
): Promise<ProfileDashboardViewModel> {
  const [
    createdActivityCount,
    participationCount,
    followersCount,
    followingCount,
    createdActivities,
    participations,
    followers,
    following,
  ] = await Promise.all([
    prisma.activity.count({
      where: {
        organizerId: profileId,
      },
    }),
    prisma.activityParticipant.count({
      where: {
        userProfileId: profileId,
      },
    }),
    prisma.userFollow.count({
      where: {
        followingId: profileId,
      },
    }),
    prisma.userFollow.count({
      where: {
        followerId: profileId,
      },
    }),
    prisma.activity.findMany({
      where: {
        organizerId: profileId,
      },
      orderBy: [{ startAt: "desc" }, { id: "asc" }],
      take: profileActivityListLimit,
      select: activityCardSelect,
    }),
    prisma.activityParticipant.findMany({
      where: {
        userProfileId: profileId,
      },
      orderBy: [{ joinedAt: "desc" }, { id: "asc" }],
      take: profileActivityListLimit,
      select: profileParticipationSelect,
    }),
    prisma.userFollow.findMany({
      where: {
        followingId: profileId,
      },
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      take: profileFollowListLimit,
      select: {
        follower: {
          select: {
            id: true,
            nickname: true,
            bio: true,
            avatarUrl: true,
          },
        },
      },
    }),
    prisma.userFollow.findMany({
      where: {
        followerId: profileId,
      },
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      take: profileFollowListLimit,
      select: {
        following: {
          select: {
            id: true,
            nickname: true,
            bio: true,
            avatarUrl: true,
          },
        },
      },
    }),
  ]);

  return {
    createdActivityCount,
    participationCount,
    followersCount,
    followingCount,
    createdActivities: createdActivities.map(getActivityCardViewModel),
    participations: participations.map(mapParticipation),
    followers: followers.map((item) => mapFollowUser(item.follower)),
    following: following.map((item) => mapFollowUser(item.following)),
  };
}

export async function getPublicProfileDashboard(
  profileId: string,
): Promise<ProfileDashboardViewModel> {
  const [
    createdActivityCount,
    followersCount,
    followingCount,
    createdActivities,
    followers,
    following,
  ] = await Promise.all([
    prisma.activity.count({
      where: {
        organizerId: profileId,
      },
    }),
    prisma.userFollow.count({
      where: {
        followingId: profileId,
      },
    }),
    prisma.userFollow.count({
      where: {
        followerId: profileId,
      },
    }),
    prisma.activity.findMany({
      where: {
        organizerId: profileId,
      },
      orderBy: [{ startAt: "desc" }, { id: "asc" }],
      take: profileActivityListLimit,
      select: activityCardSelect,
    }),
    prisma.userFollow.findMany({
      where: {
        followingId: profileId,
      },
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      take: profileFollowListLimit,
      select: {
        follower: {
          select: {
            id: true,
            nickname: true,
            bio: true,
            avatarUrl: true,
          },
        },
      },
    }),
    prisma.userFollow.findMany({
      where: {
        followerId: profileId,
      },
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      take: profileFollowListLimit,
      select: {
        following: {
          select: {
            id: true,
            nickname: true,
            bio: true,
            avatarUrl: true,
          },
        },
      },
    }),
  ]);

  return {
    createdActivityCount,
    participationCount: 0,
    followersCount,
    followingCount,
    createdActivities: createdActivities.map(getActivityCardViewModel),
    participations: [],
    followers: followers.map((item) => mapFollowUser(item.follower)),
    following: following.map((item) => mapFollowUser(item.following)),
  };
}

export async function getPublicProfileById(
  profileId: string,
): Promise<PublicProfileViewModel | null> {
  const profile = await prisma.userProfile.findFirst({
    where: {
      id: profileId,
      status: "ACTIVE",
    },
    select: publicProfileSelect,
  });

  return profile ? mapPublicProfile(profile) : null;
}
