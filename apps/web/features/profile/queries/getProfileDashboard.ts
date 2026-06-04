import { getPublicEventFavoriteDelegate, prisma } from "@/lib/prisma";
import type { ParticipantStatus, Prisma } from "@prisma/client";
import {
  activityCardSelect,
  getActivityCoverTone,
  getActivityCardViewModel,
} from "@/features/activities/queries/getActivities";
import type { ActivityCardViewModel } from "@/features/activities/types";
import {
  getPublicEventCardViewModel,
  publicEventSelect,
} from "@/features/public-events/queries/getPublicEvents";

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

const profileFavoriteSelect = {
  id: true,
  createdAt: true,
  activity: {
    select: activityCardSelect,
  },
} satisfies Prisma.ActivityFavoriteSelect;

type ProfileFavoriteQueryResult = Prisma.ActivityFavoriteGetPayload<{
  select: typeof profileFavoriteSelect;
}>;

const profilePublicEventFavoriteSelect = {
  id: true,
  createdAt: true,
  publicEvent: {
    select: publicEventSelect,
  },
} satisfies Prisma.PublicEventFavoriteSelect;

type ProfilePublicEventFavoriteQueryResult =
  Prisma.PublicEventFavoriteGetPayload<{
    select: typeof profilePublicEventFavoriteSelect;
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
  favoriteActivityCount: number;
  followersCount: number;
  followingCount: number;
  createdActivities: ActivityCardViewModel[];
  participations: ProfileParticipationViewModel[];
  favoriteActivities: ProfileFavoriteActivityViewModel[];
  followers: ProfileFollowUserViewModel[];
  following: ProfileFollowUserViewModel[];
};

export type ProfileFavoriteActivityViewModel = {
  id: string;
  createdAt: string;
  activity: ActivityCardViewModel;
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

function mapFavorite(
  favorite: ProfileFavoriteQueryResult,
): ProfileFavoriteActivityViewModel {
  return {
    id: favorite.id,
    createdAt: favorite.createdAt.toISOString(),
    activity: getActivityCardViewModel(favorite.activity),
  };
}

function mapPublicEventToActivityCard(
  publicEvent: ReturnType<typeof getPublicEventCardViewModel>,
): ActivityCardViewModel {
  return {
    id: publicEvent.id,
    publicEventId: publicEvent.id,
    title: publicEvent.title,
    description: publicEvent.description,
    type: "PUBLIC_EVENT",
    category: publicEvent.category,
    city: publicEvent.city,
    address: publicEvent.address,
    latitude: publicEvent.latitude,
    longitude: publicEvent.longitude,
    startAt: publicEvent.startAt,
    endAt: publicEvent.endAt,
    capacity: 0,
    coverImageUrl: publicEvent.coverImageUrl,
    participantCount: publicEvent.teamCount,
    priceText: publicEvent.priceText ?? "",
    status: "RECRUITING",
    coverTone: getActivityCoverTone(publicEvent.id),
    isActivityInfo: true,
    officialUrl: publicEvent.officialUrl,
    merchant: null,
    isFavorited: publicEvent.isFavorited,
  };
}

function mapPublicEventFavorite(
  favorite: ProfilePublicEventFavoriteQueryResult,
): ProfileFavoriteActivityViewModel {
  return {
    id: favorite.id,
    createdAt: favorite.createdAt.toISOString(),
    activity: mapPublicEventToActivityCard(
      getPublicEventCardViewModel(favorite.publicEvent),
    ),
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
  const publicEventFavorite = getPublicEventFavoriteDelegate();
  const [
    createdActivityCount,
    participationCount,
    favoriteActivityCount,
    publicEventFavoriteCount,
    followersCount,
    followingCount,
    createdActivities,
    participations,
    favoriteActivities,
    favoritePublicEvents,
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
    prisma.activityFavorite.count({
      where: {
        userProfileId: profileId,
      },
    }),
    publicEventFavorite
      ? publicEventFavorite.count({
          where: {
            userProfileId: profileId,
          },
        })
      : Promise.resolve(0),
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
    prisma.activityFavorite.findMany({
      where: {
        userProfileId: profileId,
      },
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      take: profileActivityListLimit,
      select: profileFavoriteSelect,
    }),
    publicEventFavorite
      ? publicEventFavorite.findMany({
          where: {
            userProfileId: profileId,
          },
          orderBy: [{ createdAt: "desc" }, { id: "asc" }],
          take: profileActivityListLimit,
          select: profilePublicEventFavoriteSelect,
        })
      : Promise.resolve([]),
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

  const mergedFavorites = [
    ...favoriteActivities.map(mapFavorite),
    ...(favoritePublicEvents as ProfilePublicEventFavoriteQueryResult[]).map(
      mapPublicEventFavorite,
    ),
  ]
    .sort(
      (left, right) =>
        new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime() ||
        left.id.localeCompare(right.id),
    )
    .slice(0, profileActivityListLimit);

  return {
    createdActivityCount,
    participationCount,
    favoriteActivityCount: favoriteActivityCount + publicEventFavoriteCount,
    followersCount,
    followingCount,
    createdActivities: createdActivities.map(getActivityCardViewModel),
    participations: participations.map(mapParticipation),
    favoriteActivities: mergedFavorites,
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
    favoriteActivityCount: 0,
    followersCount,
    followingCount,
    createdActivities: createdActivities.map(getActivityCardViewModel),
    participations: [],
    favoriteActivities: [],
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
