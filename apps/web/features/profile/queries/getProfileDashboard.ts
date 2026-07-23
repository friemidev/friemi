import { getPublicEventFavoriteDelegate, prisma } from "@/lib/prisma";
import type {
  ActivityVisibility,
  MomentVisibility,
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
import { calculateTrustScore } from "@/features/trust/trustScore";

export const profileActivityListLimit = 12;
export const profileCharmGiftListLimit = 6;
export const profileFollowListLimit = 12;
type TrustScoreAggregateResult = {
  _sum: {
    delta: number | null;
  };
};

async function getTrustScoreAggregate(
  profileId: string,
): Promise<TrustScoreAggregateResult> {
  const trustScoreDelegate = (
    prisma as typeof prisma & {
      trustScoreEvent?: {
        aggregate: (args: {
          where: { profileId: string };
          _sum: { delta: true };
        }) => Promise<TrustScoreAggregateResult>;
      };
    }
  ).trustScoreEvent;

  if (!trustScoreDelegate) {
    return { _sum: { delta: null } };
  }

  return trustScoreDelegate.aggregate({
    where: {
      profileId,
    },
    _sum: {
      delta: true,
    },
  });
}

const publicPastParticipationStatuses: ParticipantStatus[] = [
  "JOINED",
  "APPROVED",
];

const publicProfileSelect = {
  id: true,
  nickname: true,
  friendCode: true,
  avatarUrl: true,
  bio: true,
  isCoCreator: true,
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

const profileMomentSelect = {
  id: true,
  content: true,
  visibility: true,
  resharedMomentId: true,
  likeCount: true,
  commentCount: true,
  repostCount: true,
  createdAt: true,
  images: {
    orderBy: {
      sortOrder: "asc",
    },
    take: 1,
    select: {
      id: true,
      url: true,
      width: true,
      height: true,
    },
  },
} satisfies Prisma.MomentSelect;

const profileCharmGiftSelect = {
  id: true,
  giftId: true,
  giftEmoji: true,
  giftLabel: true,
  charmDelta: true,
  quantity: true,
  totalCharmDelta: true,
  createdAt: true,
  sender: {
    select: {
      id: true,
      nickname: true,
      avatarUrl: true,
    },
  },
} satisfies Prisma.CharmGiftEventSelect;

type ProfilePublicEventFavoriteQueryResult =
  Prisma.PublicEventFavoriteGetPayload<{
    select: typeof profilePublicEventFavoriteSelect;
  }>;

type ProfileCharmGiftQueryResult = Prisma.CharmGiftEventGetPayload<{
  select: typeof profileCharmGiftSelect;
}>;

export type ProfileParticipationViewModel = {
  id: string;
  status: ParticipantStatus;
  joinedAt: string;
  cancelledAt: string | null;
  activity: ActivityCardViewModel;
};

export type ProfileWerewolfStatsViewModel = {
  judgeCount: number;
  lossCount: number;
  playerGameCount: number;
  winCount: number;
  winRate: number;
};

export type ProfileDashboardViewModel = {
  charmScore: number;
  createdActivityCount: number;
  participationCount: number;
  favoriteActivityCount: number;
  friendCount: number;
  followersCount: number;
  followingCount: number;
  momentCount: number;
  trustScore: number;
  createdActivities: ActivityCardViewModel[];
  participations: ProfileParticipationViewModel[];
  favoriteActivities: ProfileFavoriteActivityViewModel[];
  friends: ProfileFriendUserViewModel[];
  followers: ProfileFollowUserViewModel[];
  following: ProfileFollowUserViewModel[];
  moments: ProfileMomentViewModel[];
  recentCharmGifts: ProfileCharmGiftViewModel[];
  viewerRelationship: ProfileViewerRelationshipViewModel;
  werewolfStats: ProfileWerewolfStatsViewModel;
};

export type ProfileFavoriteActivityViewModel = {
  id: string;
  createdAt: string;
  activity: ActivityCardViewModel;
};

export type ProfileMomentViewModel = {
  id: string;
  content: string | null;
  visibility: MomentVisibility;
  resharedMomentId: string | null;
  likeCount: number;
  commentCount: number;
  repostCount: number;
  createdAt: string;
  image: {
    id: string;
    url: string;
    width: number | null;
    height: number | null;
  } | null;
};

export type ProfileCharmGiftViewModel = {
  id: string;
  giftId: string;
  giftEmoji: string;
  giftLabel: string;
  charmDelta: number;
  quantity: number;
  totalCharmDelta: number;
  createdAt: string;
  sender: {
    id: string;
    nickname: string;
    avatarUrl: string | null;
  } | null;
};

export type PublicProfileViewModel = {
  id: string;
  nickname: string;
  friendCode: string | null;
  avatarUrl: string | null;
  bio: string | null;
  isCoCreator: boolean;
};

export type ProfileFollowUserViewModel = {
  id: string;
  nickname: string;
  bio: string | null;
  avatarUrl: string | null;
  isCoCreator: boolean;
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
  isCoCreator: boolean;
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
    isCoCreator: profile.isCoCreator,
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
    autoCreatedTeam: null,
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

function mapProfileMoment(
  moment: Prisma.MomentGetPayload<{ select: typeof profileMomentSelect }>,
): ProfileMomentViewModel {
  const image = moment.images[0] ?? null;

  return {
    id: moment.id,
    content: moment.content,
    visibility: moment.visibility,
    resharedMomentId: moment.resharedMomentId,
    likeCount: moment.likeCount,
    commentCount: moment.commentCount,
    repostCount: moment.repostCount,
    createdAt: moment.createdAt.toISOString(),
    image: image
      ? {
          id: image.id,
          url: image.url,
          width: image.width,
          height: image.height,
        }
      : null,
  };
}

function mapProfileCharmGift(
  gift: ProfileCharmGiftQueryResult,
): ProfileCharmGiftViewModel {
  return {
    id: gift.id,
    giftId: gift.giftId,
    giftEmoji: gift.giftEmoji,
    giftLabel: gift.giftLabel,
    charmDelta: gift.charmDelta,
    quantity: gift.quantity,
    totalCharmDelta: gift.totalCharmDelta,
    createdAt: gift.createdAt.toISOString(),
    sender: gift.sender,
  };
}

function mapFollowUser(user: {
  id: string;
  nickname: string;
  bio: string | null;
  avatarUrl: string | null;
  isCoCreator: boolean;
}): ProfileFollowUserViewModel {
  return {
    id: user.id,
    nickname: user.nickname,
    bio: user.bio,
    avatarUrl: user.avatarUrl,
    isCoCreator: user.isCoCreator,
  };
}

function buildWerewolfStats(
  records: Array<{
    isJudge: boolean;
    result: string | null;
  }>,
): ProfileWerewolfStatsViewModel {
  const judgeCount = records.filter((record) => record.isJudge).length;
  const playerRecords = records.filter((record) => !record.isJudge);
  const winCount = playerRecords.filter(
    (record) => record.result === "WIN",
  ).length;
  const lossCount = playerRecords.filter(
    (record) => record.result === "LOSE",
  ).length;
  const playerGameCount = playerRecords.length;

  return {
    judgeCount,
    lossCount,
    playerGameCount,
    winCount,
    winRate:
      playerGameCount > 0 ? Math.round((winCount / playerGameCount) * 100) : 0,
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

function getProfileMomentsWhere({
  isFriend,
  isSelf,
  profileId,
}: {
  isFriend: boolean;
  isSelf: boolean;
  profileId: string;
}): Prisma.MomentWhereInput {
  const visibilityValues: MomentVisibility[] | null = isSelf
    ? null
    : isFriend
      ? ["PUBLIC", "FRIENDS"]
      : ["PUBLIC"];

  return {
    authorId: profileId,
    deletedAt: null,
    ...(visibilityValues
      ? {
          visibility: {
            in: visibilityValues,
          },
        }
      : {}),
  };
}

function getPublicPastParticipationsWhere({
  isFriend,
  now,
  profileId,
}: {
  isFriend: boolean;
  now: Date;
  profileId: string;
}): Prisma.ActivityParticipantWhereInput {
  const visibilityValues: ActivityVisibility[] = isFriend
    ? ["PUBLIC", "PRIVATE"]
    : ["PUBLIC"];

  return {
    userProfileId: profileId,
    status: {
      in: publicPastParticipationStatuses,
    },
    activity: {
      AND: [
        getTeamActivityWhere(),
        {
          visibility: {
            in: visibilityValues,
          },
        },
        {
          status: {
            not: "CANCELLED",
          },
        },
        {
          OR: [
            {
              status: "ENDED",
            },
            {
              endAt: {
                lt: now,
              },
            },
            {
              AND: [
                {
                  endAt: null,
                },
                {
                  startAt: {
                    lt: now,
                  },
                },
              ],
            },
          ],
        },
      ],
    },
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
  const momentsWhere = getProfileMomentsWhere({
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
    momentCount,
    createdActivities,
    participations,
    favoriteActivities,
    favoritePublicEvents,
    friendships,
    followers,
    following,
    moments,
    werewolfRecords,
    trustScoreAggregate,
    charmBalance,
    recentCharmGifts,
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
    prisma.moment.count({
      where: momentsWhere,
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
            isCoCreator: true,
          },
        },
        userB: {
          select: {
            id: true,
            nickname: true,
            bio: true,
            avatarUrl: true,
            isCoCreator: true,
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
            isCoCreator: true,
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
            isCoCreator: true,
          },
        },
      },
    }),
    prisma.moment.findMany({
      where: momentsWhere,
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      take: profileActivityListLimit,
      select: profileMomentSelect,
    }),
    prisma.gameToolPlayerRecord.findMany({
      where: {
        kind: "WEREWOLF",
        profileId,
      },
      select: {
        isJudge: true,
        result: true,
      },
    }),
    getTrustScoreAggregate(profileId),
    prisma.userCharmBalance.findUnique({
      where: {
        profileId,
      },
      select: {
        score: true,
      },
    }),
    prisma.charmGiftEvent.findMany({
      where: {
        recipientProfileId: profileId,
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: profileCharmGiftListLimit,
      select: profileCharmGiftSelect,
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
    charmScore: charmBalance?.score ?? 0,
    createdActivityCount,
    participationCount,
    favoriteActivityCount: favoriteActivityCount + publicEventFavoriteCount,
    friendCount,
    followersCount,
    followingCount,
    momentCount,
    trustScore: calculateTrustScore(trustScoreAggregate._sum.delta),
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
    moments: moments.map(mapProfileMoment),
    recentCharmGifts: recentCharmGifts.map(mapProfileCharmGift),
    viewerRelationship: relationship,
    werewolfStats: buildWerewolfStats(werewolfRecords),
  };
}

export async function getPublicProfileDashboard(
  profileId: string,
  viewerProfileId?: string | null,
): Promise<ProfileDashboardViewModel> {
  const now = new Date();
  const relationship = await getProfileViewerRelationship(
    profileId,
    viewerProfileId,
  );
  const createdWhere = getCreatedActivitiesWhere({
    isFriend: relationship.isFriend,
    isSelf: viewerProfileId === profileId,
    profileId,
  });
  const momentsWhere = getProfileMomentsWhere({
    isFriend: relationship.isFriend,
    isSelf: viewerProfileId === profileId,
    profileId,
  });
  const pastParticipationWhere = getPublicPastParticipationsWhere({
    isFriend: relationship.isFriend,
    now,
    profileId,
  });
  const [
    createdActivityCount,
    participationCount,
    friendCount,
    followersCount,
    followingCount,
    momentCount,
    createdActivities,
    participations,
    friendships,
    followers,
    following,
    moments,
    werewolfRecords,
    trustScoreAggregate,
    charmBalance,
    recentCharmGifts,
  ] = await Promise.all([
    prisma.activity.count({
      where: createdWhere,
    }),
    prisma.activityParticipant.count({
      where: pastParticipationWhere,
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
    prisma.moment.count({
      where: momentsWhere,
    }),
    prisma.activity.findMany({
      where: createdWhere,
      orderBy: [{ startAt: "desc" }, { id: "asc" }],
      take: profileActivityListLimit,
      select: activityCardSelect,
    }),
    prisma.activityParticipant.findMany({
      where: pastParticipationWhere,
      orderBy: [{ joinedAt: "desc" }, { id: "asc" }],
      take: profileActivityListLimit,
      select: profileParticipationSelect,
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
            isCoCreator: true,
          },
        },
        userB: {
          select: {
            id: true,
            nickname: true,
            bio: true,
            avatarUrl: true,
            isCoCreator: true,
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
            isCoCreator: true,
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
            isCoCreator: true,
          },
        },
      },
    }),
    prisma.moment.findMany({
      where: momentsWhere,
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      take: profileActivityListLimit,
      select: profileMomentSelect,
    }),
    prisma.gameToolPlayerRecord.findMany({
      where: {
        kind: "WEREWOLF",
        profileId,
      },
      select: {
        isJudge: true,
        result: true,
      },
    }),
    getTrustScoreAggregate(profileId),
    prisma.userCharmBalance.findUnique({
      where: {
        profileId,
      },
      select: {
        score: true,
      },
    }),
    prisma.charmGiftEvent.findMany({
      where: {
        recipientProfileId: profileId,
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: profileCharmGiftListLimit,
      select: profileCharmGiftSelect,
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

  return {
    charmScore: charmBalance?.score ?? 0,
    createdActivityCount,
    participationCount,
    favoriteActivityCount: 0,
    friendCount,
    followersCount,
    followingCount,
    momentCount,
    trustScore: calculateTrustScore(trustScoreAggregate._sum.delta),
    createdActivities: createdActivityCards,
    participations: participations.map((participation, index) => ({
      id: participation.id,
      status: participation.status,
      joinedAt: participation.joinedAt.toISOString(),
      cancelledAt: participation.cancelledAt?.toISOString() ?? null,
      activity: participationActivityCards[index],
    })),
    favoriteActivities: [],
    friends: friendships.map((friendship) =>
      mapFriendUser(friendship, profileId),
    ),
    followers: followers.map((item) => mapFollowUser(item.follower)),
    following: following.map((item) => mapFollowUser(item.following)),
    moments: moments.map(mapProfileMoment),
    recentCharmGifts: recentCharmGifts.map(mapProfileCharmGift),
    viewerRelationship: relationship,
    werewolfStats: buildWerewolfStats(werewolfRecords),
  };
}

export async function getPublicProfileById(
  profileId: string,
  options: {
    includePrivateFields?: boolean;
  } = {},
): Promise<PublicProfileViewModel | null> {
  void options;

  const profile = await prisma.userProfile.findFirst({
    where: {
      id: profileId,
      status: "ACTIVE",
    },
    select: publicProfileSelect,
  });

  return profile ? mapPublicProfile(profile) : null;
}
