import { getPublicEventFavoriteDelegate, prisma } from "@/lib/prisma";
import {
  Prisma,
  type ActivityVisibility,
  type MomentVisibility,
  type ParticipantStatus,
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
  getFollowRelationshipBuckets,
  getFollowRelationState,
} from "@/features/follow/queries/followRelations";
import {
  getPublicEventCardViewModel,
  publicEventSelect,
} from "@/features/public-events/queries/getPublicEvents";
import { calculateTrustScore } from "@/features/trust/trustScore";
import {
  getUserPresenceState,
  type UserPresenceDisplayStatus,
  type UserPresenceStatusValue,
} from "../presence";
import {
  getProfileRemarkMap,
  getProfileRemarkName,
  resolveRemarkedProfileName,
} from "../services/profileRemarks";
import {
  buildWerewolfStatsFromGroups,
  buildWerewolfStatsFromRecords,
} from "./profileAggregates";

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

function hasGeneratedPrismaField(modelName: string, fieldName: string) {
  return Prisma.dmmf.datamodel.models.some(
    (model) =>
      model.name === modelName &&
      model.fields.some((field) => field.name === fieldName),
  );
}

const canSelectUserProfileHomeCity = hasGeneratedPrismaField(
  "UserProfile",
  "homeCity",
);
const canSelectUserProfileNicknameChangedAt = hasGeneratedPrismaField(
  "UserProfile",
  "nicknameChangedAt",
);

const publicProfileBaseSelect = {
  id: true,
  nickname: true,
  friendCode: true,
  avatarUrl: true,
  bio: true,
  isCoCreator: true,
  presenceStatus: true,
  lastActiveAt: true,
  status: true,
} satisfies Prisma.UserProfileSelect;

const publicProfileSelect = {
  ...publicProfileBaseSelect,
  ...(canSelectUserProfileNicknameChangedAt ? { nicknameChangedAt: true } : {}),
  ...(canSelectUserProfileHomeCity ? { homeCity: true } : {}),
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

const profileFollowUserSelect = {
  id: true,
  nickname: true,
  bio: true,
  avatarUrl: true,
  isCoCreator: true,
} satisfies Prisma.UserProfileSelect;

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
  giftCount: number;
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
  nicknameChangedAt: string | null;
  publicNickname: string;
  remarkName: string | null;
  friendCode: string | null;
  avatarUrl: string | null;
  bio: string | null;
  homeCity: string | null;
  isCoCreator: boolean;
  isOnline: boolean;
  presenceDisplayStatus: UserPresenceDisplayStatus;
  presenceStatus: UserPresenceStatusValue;
};

export type ProfileFollowUserViewModel = {
  id: string;
  nickname: string;
  publicNickname: string;
  remarkName: string | null;
  bio: string | null;
  avatarUrl: string | null;
  isCoCreator: boolean;
};

export type ProfileFriendUserViewModel = ProfileFollowUserViewModel;

export type ProfileViewerRelationshipViewModel = {
  friendshipId: string | null;
  isFriend: boolean;
  isFollowing: boolean;
  isMutualFollow: boolean;
  pendingFriendRequest: "sent" | "received" | null;
  targetFollowsViewer: boolean;
};

type ProfileFollowNetworkViewModel = {
  mutualCount: number;
  followersCount: number;
  followingCount: number;
  mutual: ProfileFollowUserViewModel[];
  followers: ProfileFollowUserViewModel[];
  following: ProfileFollowUserViewModel[];
};

function mapPublicProfile(
  profile: {
    id: string;
    nickname: string;
    nicknameChangedAt?: Date | null;
    friendCode: string | null;
    avatarUrl: string | null;
    bio: string | null;
    homeCity?: string | null;
    isCoCreator: boolean;
    lastActiveAt: Date | null;
    presenceStatus: string | null;
  },
  options: {
    canViewPresence?: boolean;
    includePrivateFields?: boolean;
    remarkName?: string | null;
  } = {},
): PublicProfileViewModel {
  const hasPublicNickname = profile.nickname.trim().length > 0;
  const publicNickname = hasPublicNickname
    ? profile.nickname
    : profile.friendCode
      ? `NF ${profile.friendCode}`
      : "NF";
  const remarkName = options.remarkName?.trim() || null;
  const presence = getUserPresenceState({
    lastActiveAt: profile.lastActiveAt,
    status: profile.presenceStatus,
  });
  const canViewPresence = options.canViewPresence ?? false;

  return {
    id: profile.id,
    nickname: resolveRemarkedProfileName({
      publicNickname,
      remarkName,
    }),
    nicknameChangedAt: options.includePrivateFields
      ? (profile.nicknameChangedAt?.toISOString() ?? null)
      : null,
    publicNickname,
    remarkName,
    friendCode: profile.friendCode,
    avatarUrl: hasPublicNickname ? profile.avatarUrl : null,
    bio: profile.bio,
    homeCity: profile.homeCity ?? "Paris",
    isCoCreator: profile.isCoCreator,
    isOnline: canViewPresence && presence.isOnline,
    presenceDisplayStatus: canViewPresence ? presence.displayStatus : null,
    presenceStatus: canViewPresence ? presence.status : "INVISIBLE",
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
  giftCount = 0,
): ProfileMomentViewModel {
  const image = moment.images[0] ?? null;

  return {
    id: moment.id,
    content: moment.content,
    visibility: moment.visibility,
    resharedMomentId: moment.resharedMomentId,
    giftCount,
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

async function getProfileMomentGiftCountMap(momentIds: string[]) {
  if (momentIds.length === 0) {
    return new Map<string, number>();
  }

  const groups = await prisma.charmGiftEvent.groupBy({
    by: ["sourceContextId"],
    where: {
      sourceContextId: {
        in: momentIds,
      },
      sourceSurface: "MOMENT",
    },
    _sum: {
      quantity: true,
    },
  });

  return new Map(
    groups.flatMap((group) =>
      group.sourceContextId
        ? [[group.sourceContextId, group._sum.quantity ?? 0]]
        : [],
    ),
  );
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

function mapFollowUser(
  user: {
    id: string;
    nickname: string;
    bio: string | null;
    avatarUrl: string | null;
    isCoCreator: boolean;
  },
  remarkName?: string | null,
): ProfileFollowUserViewModel {
  const publicNickname = user.nickname.trim() || "NF";
  const normalizedRemarkName = remarkName?.trim() || null;

  return {
    id: user.id,
    nickname: resolveRemarkedProfileName({
      publicNickname,
      remarkName: normalizedRemarkName,
    }),
    publicNickname,
    remarkName: normalizedRemarkName,
    bio: user.bio,
    avatarUrl: user.avatarUrl,
    isCoCreator: user.isCoCreator,
  };
}

async function getProfileWerewolfStats(profileId: string) {
  const groups = await prisma.gameToolPlayerRecord.groupBy({
    by: ["isJudge", "result"],
    where: {
      kind: "WEREWOLF",
      profileId,
    },
    _count: {
      _all: true,
    },
  });
  const stats = buildWerewolfStatsFromGroups(groups);

  if (process.env.PROFILE_AGGREGATE_SHADOW_COMPARE === "1") {
    const records = await prisma.gameToolPlayerRecord.findMany({
      where: {
        kind: "WEREWOLF",
        profileId,
      },
      select: {
        isJudge: true,
        result: true,
      },
    });
    const legacyStats = buildWerewolfStatsFromRecords(records);

    if (JSON.stringify(stats) !== JSON.stringify(legacyStats)) {
      console.error("Profile werewolf aggregate shadow mismatch", {
        profileId,
      });
    }
  }

  return stats;
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

async function getProfileViewerRelationship(
  profileId: string,
  viewerProfileId?: string | null,
): Promise<ProfileViewerRelationshipViewModel> {
  if (!viewerProfileId || viewerProfileId === profileId) {
    return {
      friendshipId: null,
      isFriend: false,
      isFollowing: false,
      isMutualFollow: false,
      pendingFriendRequest: null,
      targetFollowsViewer: false,
    };
  }

  const relation = await getFollowRelationState({
    targetProfileId: profileId,
    viewerProfileId,
  });

  return {
    friendshipId: null,
    isFriend: relation.isMutualFollow,
    isFollowing: relation.viewerFollowsTarget,
    isMutualFollow: relation.isMutualFollow,
    pendingFriendRequest: null,
    targetFollowsViewer: relation.targetFollowsViewer,
  };
}

type ProfileFollowNetworkCountRow = {
  followersCount: bigint | number;
  followingCount: bigint | number;
  mutualCount: bigint | number;
};

async function getProfileFollowNetworkCounts(profileId: string) {
  const rows = await prisma.$queryRaw<ProfileFollowNetworkCountRow[]>(
    Prisma.sql`
      SELECT
        (
          SELECT COUNT(*)::bigint
          FROM "UserFollow" outgoing
          WHERE outgoing."followerId" = ${profileId}
            AND outgoing."followingId" <> ${profileId}
            AND EXISTS (
              SELECT 1
              FROM "UserFollow" reciprocal
              WHERE reciprocal."followerId" = outgoing."followingId"
                AND reciprocal."followingId" = ${profileId}
            )
        ) AS "mutualCount",
        (
          SELECT COUNT(*)::bigint
          FROM "UserFollow" incoming
          WHERE incoming."followingId" = ${profileId}
            AND incoming."followerId" <> ${profileId}
            AND NOT EXISTS (
              SELECT 1
              FROM "UserFollow" reciprocal
              WHERE reciprocal."followerId" = ${profileId}
                AND reciprocal."followingId" = incoming."followerId"
            )
        ) AS "followersCount",
        (
          SELECT COUNT(*)::bigint
          FROM "UserFollow" outgoing
          WHERE outgoing."followerId" = ${profileId}
            AND outgoing."followingId" <> ${profileId}
            AND NOT EXISTS (
              SELECT 1
              FROM "UserFollow" reciprocal
              WHERE reciprocal."followerId" = outgoing."followingId"
                AND reciprocal."followingId" = ${profileId}
            )
        ) AS "followingCount"
    `,
  );
  const row = rows[0];

  return {
    followersCount: Number(row?.followersCount ?? 0),
    followingCount: Number(row?.followingCount ?? 0),
    mutualCount: Number(row?.mutualCount ?? 0),
  };
}

async function getProfileFollowNetwork(
  profileId: string,
  remarkOwnerProfileId?: string | null,
): Promise<ProfileFollowNetworkViewModel> {
  const mutualWhere = {
    followerId: profileId,
    followingId: {
      not: profileId,
    },
    following: {
      following: {
        some: {
          followingId: profileId,
        },
      },
    },
  } satisfies Prisma.UserFollowWhereInput;
  const followerOnlyWhere = {
    followerId: {
      not: profileId,
    },
    followingId: profileId,
    follower: {
      followers: {
        none: {
          followerId: profileId,
        },
      },
    },
  } satisfies Prisma.UserFollowWhereInput;
  const followingOnlyWhere = {
    followerId: profileId,
    followingId: {
      not: profileId,
    },
    following: {
      following: {
        none: {
          followingId: profileId,
        },
      },
    },
  } satisfies Prisma.UserFollowWhereInput;
  const [counts, mutual, followers, following] = await Promise.all([
    getProfileFollowNetworkCounts(profileId),
    prisma.userFollow.findMany({
      where: mutualWhere,
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      take: profileFollowListLimit,
      select: {
        following: {
          select: profileFollowUserSelect,
        },
      },
    }),
    prisma.userFollow.findMany({
      where: followerOnlyWhere,
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      take: profileFollowListLimit,
      select: {
        follower: {
          select: profileFollowUserSelect,
        },
      },
    }),
    prisma.userFollow.findMany({
      where: followingOnlyWhere,
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      take: profileFollowListLimit,
      select: {
        following: {
          select: profileFollowUserSelect,
        },
      },
    }),
  ]);
  const mutualUsers = mutual.map((item) => item.following);
  const followerUsers = followers.map((item) => item.follower);
  const followingUsers = following.map((item) => item.following);
  const remarkMap = await getProfileRemarkMap({
    ownerProfileId: remarkOwnerProfileId,
    targetProfileIds: [...mutualUsers, ...followerUsers, ...followingUsers].map(
      (user) => user.id,
    ),
  });

  if (process.env.PROFILE_FOLLOW_NETWORK_SHADOW_COMPARE === "1") {
    const buckets = await getFollowRelationshipBuckets(profileId);
    const legacyCounts = {
      mutualCount: buckets.mutualFollowIds.length,
      followersCount: buckets.followerOnlyIds.length,
      followingCount: buckets.followingOnlyIds.length,
    };

    if (JSON.stringify(counts) !== JSON.stringify(legacyCounts)) {
      console.error("Profile follow network shadow mismatch", {
        profileId,
      });
    }
  }

  return {
    mutualCount: counts.mutualCount,
    followersCount: counts.followersCount,
    followingCount: counts.followingCount,
    mutual: mutualUsers.map((user) =>
      mapFollowUser(user, remarkMap.get(user.id)),
    ),
    followers: followerUsers.map((user) =>
      mapFollowUser(user, remarkMap.get(user.id)),
    ),
    following: followingUsers.map((user) =>
      mapFollowUser(user, remarkMap.get(user.id)),
    ),
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
    momentCount,
    createdActivities,
    participations,
    favoriteActivities,
    favoritePublicEvents,
    moments,
    werewolfStats,
    trustScoreAggregate,
    charmBalance,
    recentCharmGifts,
    followNetwork,
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
    prisma.moment.findMany({
      where: momentsWhere,
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      take: profileActivityListLimit,
      select: profileMomentSelect,
    }),
    getProfileWerewolfStats(profileId),
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
    getProfileFollowNetwork(profileId, profileId),
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
  const momentGiftCountByMomentId = await getProfileMomentGiftCountMap(
    moments.map((moment) => moment.id),
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
    friendCount: followNetwork.mutualCount,
    followersCount: followNetwork.followersCount,
    followingCount: followNetwork.followingCount,
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
    friends: followNetwork.mutual,
    followers: followNetwork.followers,
    following: followNetwork.following,
    moments: moments.map((moment) =>
      mapProfileMoment(moment, momentGiftCountByMomentId.get(moment.id) ?? 0),
    ),
    recentCharmGifts: recentCharmGifts.map(mapProfileCharmGift),
    viewerRelationship: relationship,
    werewolfStats,
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
    momentCount,
    createdActivities,
    participations,
    moments,
    werewolfStats,
    trustScoreAggregate,
    charmBalance,
    recentCharmGifts,
    followNetwork,
  ] = await Promise.all([
    prisma.activity.count({
      where: createdWhere,
    }),
    prisma.activityParticipant.count({
      where: pastParticipationWhere,
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
    prisma.moment.findMany({
      where: momentsWhere,
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      take: profileActivityListLimit,
      select: profileMomentSelect,
    }),
    getProfileWerewolfStats(profileId),
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
    getProfileFollowNetwork(profileId, viewerProfileId),
  ]);

  const createdActivityCards = await applyOrganizerParticipationDefaults(
    createdActivities.map(getActivityCardViewModel),
  );
  const participationActivityCards = await applyOrganizerParticipationDefaults(
    participations.map((participation) =>
      getActivityCardViewModel(participation.activity),
    ),
  );
  const momentGiftCountByMomentId = await getProfileMomentGiftCountMap(
    moments.map((moment) => moment.id),
  );

  return {
    charmScore: charmBalance?.score ?? 0,
    createdActivityCount,
    participationCount,
    favoriteActivityCount: 0,
    friendCount: followNetwork.mutualCount,
    followersCount: followNetwork.followersCount,
    followingCount: followNetwork.followingCount,
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
    friends: followNetwork.mutual,
    followers: followNetwork.followers,
    following: followNetwork.following,
    moments: moments.map((moment) =>
      mapProfileMoment(moment, momentGiftCountByMomentId.get(moment.id) ?? 0),
    ),
    recentCharmGifts: recentCharmGifts.map(mapProfileCharmGift),
    viewerRelationship: relationship,
    werewolfStats,
  };
}

export async function getPublicProfileById(
  profileId: string,
  options: {
    includePrivateFields?: boolean;
    viewerProfileId?: string | null;
  } = {},
): Promise<PublicProfileViewModel | null> {
  const profile = await prisma.userProfile.findFirst({
    where: {
      id: profileId,
      status: "ACTIVE",
    },
    select: publicProfileSelect,
  });

  if (!profile) {
    return null;
  }

  const [relation, remarkName] = await Promise.all([
    options.viewerProfileId && options.viewerProfileId !== profileId
      ? getFollowRelationState({
          targetProfileId: profileId,
          viewerProfileId: options.viewerProfileId,
        })
      : Promise.resolve(null),
    getProfileRemarkName({
      ownerProfileId: options.viewerProfileId,
      targetProfileId: profileId,
    }),
  ]);
  const canViewPresence =
    options.viewerProfileId === profileId || Boolean(relation?.isMutualFollow);

  return mapPublicProfile(profile, {
    canViewPresence,
    includePrivateFields: options.includePrivateFields,
    remarkName,
  });
}
