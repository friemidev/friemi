import { getPublicEventFavoriteDelegate, prisma } from "@/lib/prisma";
import type {
  ActivityVisibility,
  ParticipantStatus,
  Prisma,
} from "@prisma/client";
import {
  activityCardSelect,
  getActivityCoverTone,
  getActivityCardViewModel,
  getLegacyPublicActivityInfoWhere,
} from "@/features/activities/queries/getActivities";
import { applyOrganizerParticipationDefaults } from "@/features/activities/queries/applyOrganizerParticipationDefaults";
import type { ActivityCardViewModel } from "@/features/activities/types";
import {
  getFriendshipPair,
  getFriendshipPairKey,
} from "@/features/friends/utils/friendship";
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

const privateProfileSelect = {
  ...publicProfileSelect,
  wechatId: true,
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

const profileFavoriteSelect = {
  id: true,
  createdAt: true,
  activity: {
    select: activityCardSelect,
  },
} satisfies Prisma.ActivityFavoriteSelect;

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
  friendCount: number;
  followersCount: number;
  followingCount: number;
  createdActivities: ActivityCardViewModel[];
  participations: ProfileParticipationViewModel[];
  favoriteActivities: ProfileFavoriteActivityViewModel[];
  friends: ProfileFriendUserViewModel[];
  followers: ProfileFollowUserViewModel[];
  following: ProfileFollowUserViewModel[];
  viewerRelationship: ProfileViewerRelationshipViewModel;
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
  wechatId?: string | null;
};

export type ProfileFollowUserViewModel = {
  id: string;
  nickname: string;
  bio: string | null;
  avatarUrl: string | null;
};

export type ProfileFriendUserViewModel = ProfileFollowUserViewModel;

export type ProfileViewerRelationshipViewModel = {
  friendshipId: string | null;
  isFriend: boolean;
  isFollowing: boolean;
  pendingFriendRequest: "sent" | "received" | null;
};

function mapPublicProfile(profile: {
  id: string;
  nickname: string;
  friendCode: string | null;
  avatarUrl: string | null;
  bio: string | null;
  wechatId?: string | null;
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
    wechatId: profile.wechatId,
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
    favoriteCount: publicEvent.favoriteCount,
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

function getTeamActivityWhere(): Prisma.ActivityWhereInput {
  return {
    AND: [
      {
        type: {
          not: "PUBLIC_EVENT",
        },
      },
      {
        NOT: getLegacyPublicActivityInfoWhere(),
      },
    ],
  };
}

function getOwnTeamActivityWhere(): Prisma.ActivityWhereInput {
  return {
    type: {
      not: "PUBLIC_EVENT",
    },
  };
}

function getCreatedActivitiesWhere({
  isFriend,
  isSelf,
  profileId,
}: {
  isFriend: boolean;
  isSelf: boolean;
  profileId: string;
}): Prisma.ActivityWhereInput {
  const visibilityValues: ActivityVisibility[] | null = isSelf
    ? null
    : isFriend
      ? ["PUBLIC", "PRIVATE"]
      : ["PUBLIC"];

  return {
    AND: [
      {
        organizerId: profileId,
        ...(visibilityValues
          ? {
              visibility: {
                in: visibilityValues,
              },
            }
          : {}),
      },
      isSelf ? getOwnTeamActivityWhere() : getTeamActivityWhere(),
    ],
  };
}

function mapFriendUser(
  friendship: {
    userAId: string;
    userBId: string;
    userA: ProfileFollowUserViewModel;
    userB: ProfileFollowUserViewModel;
  },
  profileId: string,
): ProfileFriendUserViewModel {
  return friendship.userAId === profileId ? friendship.userB : friendship.userA;
}

async function getProfileViewerRelationship(
  profileId: string,
  viewerProfileId?: string | null,
): Promise<ProfileViewerRelationshipViewModel> {
  if (!viewerProfileId || viewerProfileId === profileId) {
    return {
      friendshipId: null,
      isFriend: false,
      isFollowing: false,
      pendingFriendRequest: null,
    };
  }

  const [friendship, follow, pendingRequest] = await Promise.all([
    prisma.friendship.findUnique({
      where: {
        userAId_userBId: getFriendshipPair(viewerProfileId, profileId),
      },
      select: {
        id: true,
      },
    }),
    prisma.userFollow.findUnique({
      where: {
        followerId_followingId: {
          followerId: viewerProfileId,
          followingId: profileId,
        },
      },
      select: {
        id: true,
      },
    }),
    prisma.friendRequest.findFirst({
      where: {
        status: "PENDING",
        OR: [
          {
            pendingPairKey: getFriendshipPairKey(viewerProfileId, profileId),
          },
          {
            requesterId: viewerProfileId,
            receiverId: profileId,
          },
          {
            requesterId: profileId,
            receiverId: viewerProfileId,
          },
        ],
      },
      select: {
        requesterId: true,
        receiverId: true,
      },
    }),
  ]);

  return {
    friendshipId: friendship?.id ?? null,
    isFriend: Boolean(friendship),
    isFollowing: Boolean(follow),
    pendingFriendRequest: pendingRequest
      ? pendingRequest.requesterId === viewerProfileId
        ? "sent"
        : "received"
      : null,
  };
}

export async function getProfileDashboard(
  profileId: string,
): Promise<ProfileDashboardViewModel> {
  const publicEventFavorite = getPublicEventFavoriteDelegate();
  const relationship = await getProfileViewerRelationship(profileId, profileId);
  const createdWhere = getCreatedActivitiesWhere({
    isFriend: false,
    isSelf: true,
    profileId,
  });
  const [
    createdActivityCount,
    participationCount,
    favoriteActivityCount,
    publicEventFavoriteCount,
    friendCount,
    followersCount,
    followingCount,
    createdActivities,
    participations,
    favoriteActivities,
    favoritePublicEvents,
    friendships,
    followers,
    following,
  ] = await Promise.all([
    prisma.activity.count({
      where: createdWhere,
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
    prisma.friendship.count({
      where: {
        OR: [{ userAId: profileId }, { userBId: profileId }],
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
      where: createdWhere,
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
    prisma.friendship.findMany({
      where: {
        OR: [{ userAId: profileId }, { userBId: profileId }],
      },
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      take: profileFollowListLimit,
      select: {
        userAId: true,
        userBId: true,
        userA: {
          select: {
            id: true,
            nickname: true,
            bio: true,
            avatarUrl: true,
          },
        },
        userB: {
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

  const createdActivityCards = await applyOrganizerParticipationDefaults(
    createdActivities.map(getActivityCardViewModel),
  );
  const participationActivityCards = await applyOrganizerParticipationDefaults(
    participations.map((participation) =>
      getActivityCardViewModel(participation.activity),
    ),
  );
  const favoriteActivityCards = await applyOrganizerParticipationDefaults(
    favoriteActivities.map((favorite) =>
      getActivityCardViewModel(favorite.activity),
    ),
  );

  const mergedFavorites = [
    ...favoriteActivityCards.map((activity, index) => ({
      id: favoriteActivities[index].id,
      createdAt: favoriteActivities[index].createdAt.toISOString(),
      activity,
    })),
    ...(favoritePublicEvents as ProfilePublicEventFavoriteQueryResult[]).map(
      mapPublicEventFavorite,
    ),
  ]
    .sort(
      (left, right) =>
        new Date(right.createdAt).getTime() -
          new Date(left.createdAt).getTime() || left.id.localeCompare(right.id),
    )
    .slice(0, profileActivityListLimit);

  return {
    createdActivityCount,
    participationCount,
    favoriteActivityCount: favoriteActivityCount + publicEventFavoriteCount,
    friendCount,
    followersCount,
    followingCount,
    createdActivities: createdActivityCards,
    participations: participations.map((participation, index) => ({
      id: participation.id,
      status: participation.status,
      joinedAt: participation.joinedAt.toISOString(),
      cancelledAt: participation.cancelledAt?.toISOString() ?? null,
      activity: participationActivityCards[index],
    })),
    favoriteActivities: mergedFavorites,
    friends: friendships.map((friendship) =>
      mapFriendUser(friendship, profileId),
    ),
    followers: followers.map((item) => mapFollowUser(item.follower)),
    following: following.map((item) => mapFollowUser(item.following)),
    viewerRelationship: relationship,
  };
}

export async function getPublicProfileDashboard(
  profileId: string,
  viewerProfileId?: string | null,
): Promise<ProfileDashboardViewModel> {
  const relationship = await getProfileViewerRelationship(
    profileId,
    viewerProfileId,
  );
  const createdWhere = getCreatedActivitiesWhere({
    isFriend: relationship.isFriend,
    isSelf: viewerProfileId === profileId,
    profileId,
  });
  const [
    createdActivityCount,
    friendCount,
    followersCount,
    followingCount,
    createdActivities,
    friendships,
    followers,
    following,
  ] = await Promise.all([
    prisma.activity.count({
      where: createdWhere,
    }),
    prisma.friendship.count({
      where: {
        OR: [{ userAId: profileId }, { userBId: profileId }],
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
      where: createdWhere,
      orderBy: [{ startAt: "desc" }, { id: "asc" }],
      take: profileActivityListLimit,
      select: activityCardSelect,
    }),
    prisma.friendship.findMany({
      where: {
        OR: [{ userAId: profileId }, { userBId: profileId }],
      },
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      take: profileFollowListLimit,
      select: {
        userAId: true,
        userBId: true,
        userA: {
          select: {
            id: true,
            nickname: true,
            bio: true,
            avatarUrl: true,
          },
        },
        userB: {
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

  const createdActivityCards = await applyOrganizerParticipationDefaults(
    createdActivities.map(getActivityCardViewModel),
  );

  return {
    createdActivityCount,
    participationCount: 0,
    favoriteActivityCount: 0,
    friendCount,
    followersCount,
    followingCount,
    createdActivities: createdActivityCards,
    participations: [],
    favoriteActivities: [],
    friends: friendships.map((friendship) =>
      mapFriendUser(friendship, profileId),
    ),
    followers: followers.map((item) => mapFollowUser(item.follower)),
    following: following.map((item) => mapFollowUser(item.following)),
    viewerRelationship: relationship,
  };
}

export async function getPublicProfileById(
  profileId: string,
  options: {
    includePrivateFields?: boolean;
  } = {},
): Promise<PublicProfileViewModel | null> {
  const profile = await prisma.userProfile.findFirst({
    where: {
      id: profileId,
      status: "ACTIVE",
    },
    select: options.includePrivateFields
      ? privateProfileSelect
      : publicProfileSelect,
  });

  return profile ? mapPublicProfile(profile) : null;
}
