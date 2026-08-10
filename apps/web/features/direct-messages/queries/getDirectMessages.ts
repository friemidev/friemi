import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  compareOptionalFriendNearestActivities,
  getFriendNearestActivitySignals,
  type FriendNearestActivitySignalViewModel,
} from "@/features/friends/queries/getFriendNearestActivitySignals";
import {
  getFollowRelationshipBuckets,
  getFollowRelationState,
  getMutualFollowProfileIds,
} from "@/features/follow/queries/followRelations";
import { buildPrivateActivityShareAccessWhere } from "@/features/activities/utils/activityShareAccess";
import {
  getDirectMessageSendPolicy,
  type DirectMessageSendPolicy,
} from "../services/directMessages";
import {
  getConversationPair,
  getConversationPeerId,
} from "../utils/conversation";
import {
  getUserPresenceState,
  type UserPresenceDisplayStatus,
  type UserPresenceStatusValue,
} from "@/features/profile/presence";
import {
  getProfileRemarkMap,
  getProfileRemarkName,
  resolveRemarkedProfileName,
} from "@/features/profile/services/profileRemarks";

const friendActivitySignalLimitPerFriend = 4;

const userSummarySelect = {
  id: true,
  nickname: true,
  friendCode: true,
  avatarUrl: true,
  bio: true,
  presenceStatus: true,
  lastActiveAt: true,
} satisfies Prisma.UserProfileSelect;

const messageSelect = {
  id: true,
  conversationId: true,
  senderId: true,
  body: true,
  imageUrls: true,
  readAt: true,
  createdAt: true,
} satisfies Prisma.DirectMessageSelect;

const conversationListSelect = {
  id: true,
  userAId: true,
  userBId: true,
  lastMessageAt: true,
  createdAt: true,
  userA: {
    select: userSummarySelect,
  },
  userB: {
    select: userSummarySelect,
  },
  messages: {
    orderBy: {
      createdAt: "desc",
    },
    take: 1,
    select: messageSelect,
  },
} satisfies Prisma.ConversationSelect;

const conversationThreadSelect = {
  ...conversationListSelect,
  messages: {
    orderBy: {
      createdAt: "desc",
    },
    take: 50,
    select: messageSelect,
  },
} satisfies Prisma.ConversationSelect;

const rosterProfileSelect = {
  ...userSummarySelect,
  createdAt: true,
} satisfies Prisma.UserProfileSelect;

type ConversationListResult = Prisma.ConversationGetPayload<{
  select: typeof conversationListSelect;
}>;

type ConversationThreadResult = Prisma.ConversationGetPayload<{
  select: typeof conversationThreadSelect;
}>;

type RosterProfileResult = Prisma.UserProfileGetPayload<{
  select: typeof rosterProfileSelect;
}>;

export type DirectMessageRelationshipKind =
  | "none"
  | "following"
  | "followed_by"
  | "mutual";

export type DirectMessageUserViewModel = {
  id: string;
  nickname: string;
  publicNickname: string;
  remarkName: string | null;
  friendCode: string | null;
  avatarUrl: string | null;
  bio: string | null;
  isOnline: boolean;
  presenceDisplayStatus: UserPresenceDisplayStatus;
  presenceStatus: UserPresenceStatusValue;
};

export type DirectMessagePreviewViewModel = {
  id: string;
  senderId: string;
  body: string;
  imageUrls: string[];
  createdAt: string;
  sourceActivity: {
    id: string;
    title: string;
  } | null;
};

export type DirectConversationActivitySignalViewModel =
  FriendNearestActivitySignalViewModel;

export type DirectConversationListItemViewModel = {
  id: string;
  peer: DirectMessageUserViewModel;
  lastMessage: DirectMessagePreviewViewModel | null;
  lastMessageAt: string | null;
  createdAt: string;
  recentActivities: DirectConversationActivitySignalViewModel[];
  unreadCount: number;
};

export type DirectMessageFriendRosterItemViewModel = {
  friendshipId: string | null;
  isFriend: boolean;
  isFollowing: boolean;
  isMutualFollow: boolean;
  relationshipKind: DirectMessageRelationshipKind;
  rosterId: string;
  targetFollowsViewer: boolean;
  friend: DirectMessageUserViewModel;
  conversationId: string | null;
  lastMessage: DirectMessagePreviewViewModel | null;
  lastMessageAt: string | null;
  createdAt: string;
  recentActivities: DirectConversationActivitySignalViewModel[];
  unreadCount: number;
};

export type DirectMessageThreadItemViewModel = {
  id: string;
  senderId: string;
  body: string;
  imageUrls: string[];
  readAt: string | null;
  createdAt: string;
  isMine: boolean;
};

export type DirectConversationThreadViewModel =
  DirectConversationListItemViewModel & {
    canSend: boolean;
    currentUser: DirectMessageUserViewModel;
    messages: DirectMessageThreadItemViewModel[];
    sendPolicy: DirectMessageSendPolicy;
  };

export type DirectConversationActivityContextViewModel = {
  id: string;
  title: string;
  startAt: string;
  locationLabel: string;
};

function mapUserProfile(
  user: {
    id: string;
    nickname: string;
    friendCode: string | null;
    avatarUrl: string | null;
    bio: string | null;
    lastActiveAt: Date | null;
    presenceStatus: string | null;
  },
  options: {
    canViewPresence?: boolean;
    remarkName?: string | null;
  } = {},
): DirectMessageUserViewModel {
  const hasPublicNickname = user.nickname.trim().length > 0;
  const publicNickname = hasPublicNickname
    ? user.nickname
    : user.friendCode
      ? `NF ${user.friendCode}`
      : "NF";
  const remarkName = options.remarkName?.trim() || null;
  const presence = getUserPresenceState({
    lastActiveAt: user.lastActiveAt,
    status: user.presenceStatus,
  });
  const canViewPresence = options.canViewPresence ?? false;

  return {
    id: user.id,
    nickname: resolveRemarkedProfileName({
      publicNickname,
      remarkName,
    }),
    publicNickname,
    remarkName,
    friendCode: user.friendCode,
    avatarUrl: hasPublicNickname ? user.avatarUrl : null,
    bio: user.bio,
    isOnline: canViewPresence && presence.isOnline,
    presenceDisplayStatus: canViewPresence ? presence.displayStatus : null,
    presenceStatus: canViewPresence ? presence.status : "INVISIBLE",
  };
}

function mapPeer(
  conversation: Pick<
    ConversationListResult,
    "userA" | "userAId" | "userB" | "userBId"
  >,
  currentUserProfileId: string,
  canViewPresence: boolean,
  remarkName?: string | null,
): DirectMessageUserViewModel {
  const peerId = getConversationPeerId(conversation, currentUserProfileId);
  const peer =
    peerId === conversation.userAId ? conversation.userA : conversation.userB;

  return mapUserProfile(peer, { canViewPresence, remarkName });
}

function mapLastMessage(
  conversation: Pick<ConversationListResult, "messages">,
): DirectMessagePreviewViewModel | null {
  const [lastMessage] = conversation.messages;

  if (!lastMessage) {
    return null;
  }

  return {
    id: lastMessage.id,
    senderId: lastMessage.senderId,
    body: lastMessage.body,
    imageUrls: lastMessage.imageUrls,
    createdAt: lastMessage.createdAt.toISOString(),
    sourceActivity: null,
  };
}

function mapConversationListItem(
  conversation: ConversationListResult,
  currentUserProfileId: string,
  recentActivities: DirectConversationActivitySignalViewModel[] = [],
  unreadCount = 0,
  canViewPeerPresence = false,
  peerRemarkName?: string | null,
): DirectConversationListItemViewModel {
  return {
    id: conversation.id,
    peer: mapPeer(
      conversation,
      currentUserProfileId,
      canViewPeerPresence,
      peerRemarkName,
    ),
    lastMessage: mapLastMessage(conversation),
    lastMessageAt: conversation.lastMessageAt?.toISOString() ?? null,
    createdAt: conversation.createdAt.toISOString(),
    recentActivities,
    unreadCount,
  };
}

function mapConversationThread(
  conversation: ConversationThreadResult,
  currentUserProfileId: string,
  sendPolicy: DirectMessageSendPolicy,
  canViewPeerPresence: boolean,
  peerRemarkName?: string | null,
): DirectConversationThreadViewModel {
  const currentUser =
    currentUserProfileId === conversation.userAId
      ? conversation.userA
      : conversation.userB;

  return {
    ...mapConversationListItem(
      conversation,
      currentUserProfileId,
      [],
      0,
      canViewPeerPresence,
      peerRemarkName,
    ),
    canSend: sendPolicy.canSend,
    currentUser: mapUserProfile(currentUser, { canViewPresence: true }),
    messages: [...conversation.messages].reverse().map((message) => ({
      id: message.id,
      senderId: message.senderId,
      body: message.body,
      imageUrls: message.imageUrls,
      readAt: message.readAt?.toISOString() ?? null,
      createdAt: message.createdAt.toISOString(),
      isMine: message.senderId === currentUserProfileId,
    })),
    sendPolicy,
  };
}

async function getUnreadDirectMessageCountMap(
  currentUserProfileId: string,
  conversationIds: string[],
) {
  if (conversationIds.length === 0) {
    return new Map<string, number>();
  }

  const groups = await prisma.directMessage.groupBy({
    by: ["conversationId"],
    where: {
      conversationId: {
        in: conversationIds,
      },
      readAt: null,
      senderId: {
        not: currentUserProfileId,
      },
    },
    _count: {
      _all: true,
    },
  });

  return new Map(
    groups.map((group) => [group.conversationId, group._count._all]),
  );
}

async function getFriendPeerIds(
  currentUserProfileId: string,
  peerIds: string[],
) {
  const uniquePeerIds = [...new Set(peerIds)].filter(
    (peerId) => peerId !== currentUserProfileId,
  );

  if (uniquePeerIds.length === 0) {
    return new Set<string>();
  }

  const mutualFollowIds = await getMutualFollowProfileIds(currentUserProfileId);
  const peerIdSet = new Set(uniquePeerIds);

  return new Set(
    mutualFollowIds.filter((profileId) => peerIdSet.has(profileId)),
  );
}

function sortFriendRosterItems(
  items: DirectMessageFriendRosterItemViewModel[],
) {
  const getLastContactTime = (item: DirectMessageFriendRosterItemViewModel) =>
    new Date(
      item.lastMessage?.createdAt ?? item.lastMessageAt ?? item.createdAt,
    ).getTime();

  return [...items].sort((itemA, itemB) => {
    if (itemA.lastMessage || itemB.lastMessage) {
      return (
        getLastContactTime(itemB) - getLastContactTime(itemA) ||
        itemA.rosterId.localeCompare(itemB.rosterId)
      );
    }

    if (itemA.lastMessageAt) {
      return -1;
    }

    if (itemB.lastMessageAt) {
      return 1;
    }

    const firstActivityA = itemA.recentActivities[0];
    const firstActivityB = itemB.recentActivities[0];
    const activityOrder = compareOptionalFriendNearestActivities(
      firstActivityA,
      firstActivityB,
    );

    if (activityOrder !== 0 || firstActivityA || firstActivityB) {
      return activityOrder || itemA.rosterId.localeCompare(itemB.rosterId);
    }

    return (
      new Date(itemB.createdAt).getTime() -
        new Date(itemA.createdAt).getTime() ||
      itemA.rosterId.localeCompare(itemB.rosterId)
    );
  });
}

export async function getDirectConversations(currentUserProfileId: string) {
  const conversations = await prisma.conversation.findMany({
    where: {
      OR: [
        {
          userAId: currentUserProfileId,
        },
        {
          userBId: currentUserProfileId,
        },
      ],
    },
    orderBy: [
      {
        lastMessageAt: {
          sort: "desc",
          nulls: "last",
        },
      },
      {
        createdAt: "desc",
      },
    ],
    take: 50,
    select: conversationListSelect,
  });
  const unreadCountByConversationId = await getUnreadDirectMessageCountMap(
    currentUserProfileId,
    conversations.map((conversation) => conversation.id),
  );
  const peerIds = conversations.map((conversation) =>
    getConversationPeerId(conversation, currentUserProfileId),
  );
  let activitiesByFriendId = new Map<
    string,
    DirectConversationActivitySignalViewModel[]
  >();
  let visiblePresencePeerIds = new Set<string>();
  let remarkByPeerId = new Map<string, string>();

  try {
    const [friendPeerIds, profileRemarkMap] = await Promise.all([
      getFriendPeerIds(currentUserProfileId, peerIds),
      getProfileRemarkMap({
        ownerProfileId: currentUserProfileId,
        targetProfileIds: peerIds,
      }),
    ]);
    visiblePresencePeerIds = friendPeerIds;
    remarkByPeerId = profileRemarkMap;
    activitiesByFriendId = await getFriendNearestActivitySignals({
      friendIds: [...friendPeerIds],
      limitPerFriend: friendActivitySignalLimitPerFriend,
      viewerProfileId: currentUserProfileId,
    });
  } catch (error) {
    console.error("Failed to load direct conversation activity signals", error);
  }

  return conversations.map((conversation) =>
    mapConversationListItem(
      conversation,
      currentUserProfileId,
      activitiesByFriendId.get(
        getConversationPeerId(conversation, currentUserProfileId),
      ) ?? [],
      unreadCountByConversationId.get(conversation.id) ?? 0,
      visiblePresencePeerIds.has(
        getConversationPeerId(conversation, currentUserProfileId),
      ),
      remarkByPeerId.get(
        getConversationPeerId(conversation, currentUserProfileId),
      ),
    ),
  );
}

export async function getDirectMessageFriendRoster(
  currentUserProfileId: string,
) {
  const [followBuckets, conversations] = await Promise.all([
    getFollowRelationshipBuckets(currentUserProfileId),
    prisma.conversation.findMany({
      where: {
        OR: [
          {
            userAId: currentUserProfileId,
          },
          {
            userBId: currentUserProfileId,
          },
        ],
      },
      orderBy: [
        {
          lastMessageAt: {
            sort: "desc",
            nulls: "last",
          },
        },
        {
          createdAt: "desc",
        },
      ],
      take: 80,
      select: conversationListSelect,
    }),
  ]);
  const followingOnlyIdSet = new Set(followBuckets.followingOnlyIds);
  const followerOnlyIdSet = new Set(followBuckets.followerOnlyIds);
  const mutualFollowIdSet = new Set(followBuckets.mutualFollowIds);
  const conversationPeerIds = conversations
    .filter((conversation) => conversation.messages.length > 0)
    .map((conversation) =>
      getConversationPeerId(conversation, currentUserProfileId),
    );
  const relationshipProfileIds = [
    ...followBuckets.mutualFollowIds,
    ...followBuckets.followingOnlyIds,
    ...followBuckets.followerOnlyIds,
  ];
  const rosterProfileIds = [
    ...new Set([...conversationPeerIds, ...relationshipProfileIds]),
  ].filter((profileId) => profileId !== currentUserProfileId);
  const [profiles, activitiesByFriendId, remarkByProfileId] = await Promise.all([
    rosterProfileIds.length > 0
      ? prisma.userProfile.findMany({
          where: {
            id: {
              in: rosterProfileIds,
            },
            status: "ACTIVE",
          },
          orderBy: [{ createdAt: "desc" }, { id: "asc" }],
          select: rosterProfileSelect,
        })
      : Promise.resolve([] as RosterProfileResult[]),
    getFriendNearestActivitySignals({
      friendIds: [
        ...new Set([
          ...followBuckets.mutualFollowIds,
          ...followBuckets.followingOnlyIds,
        ]),
      ],
      limitPerFriend: friendActivitySignalLimitPerFriend,
      viewerProfileId: currentUserProfileId,
    }).catch((error: unknown) => {
      console.error("Failed to load mobile follow activity signals", error);

      return new Map<string, DirectConversationActivitySignalViewModel[]>();
    }),
    getProfileRemarkMap({
      ownerProfileId: currentUserProfileId,
      targetProfileIds: rosterProfileIds,
    }),
  ]);
  const unreadCountByConversationId = await getUnreadDirectMessageCountMap(
    currentUserProfileId,
    conversations.map((conversation) => conversation.id),
  );
  const conversationsByFriendId = new Map<string, ConversationListResult>();

  for (const conversation of conversations) {
    conversationsByFriendId.set(
      getConversationPeerId(conversation, currentUserProfileId),
      conversation,
    );
  }

  const profileItems = profiles.map((profile) => {
    const relationshipKind: DirectMessageRelationshipKind =
      mutualFollowIdSet.has(profile.id)
        ? "mutual"
        : followingOnlyIdSet.has(profile.id)
          ? "following"
          : followerOnlyIdSet.has(profile.id)
            ? "followed_by"
            : "none";
    const isMutualFollow = relationshipKind === "mutual";
    const conversation = conversationsByFriendId.get(profile.id);
    const friend = mapUserProfile(profile, {
      canViewPresence: isMutualFollow,
      remarkName: remarkByProfileId.get(profile.id),
    });

    return {
      friendshipId: null,
      isFriend: isMutualFollow,
      isFollowing:
        relationshipKind === "following" || relationshipKind === "mutual",
      isMutualFollow,
      relationshipKind,
      rosterId:
        relationshipKind === "none"
          ? `conversation:${conversation?.id ?? profile.id}`
          : `follow:${relationshipKind}:${profile.id}`,
      targetFollowsViewer:
        relationshipKind === "followed_by" || relationshipKind === "mutual",
      friend,
      conversationId: conversation?.id ?? null,
      lastMessage: conversation ? mapLastMessage(conversation) : null,
      lastMessageAt:
        conversation?.lastMessageAt?.toISOString() ??
        conversation?.messages[0]?.createdAt.toISOString() ??
        null,
      createdAt:
        conversation?.createdAt.toISOString() ??
        profile.createdAt.toISOString(),
      recentActivities: activitiesByFriendId.get(friend.id) ?? [],
      unreadCount: conversation
        ? (unreadCountByConversationId.get(conversation.id) ?? 0)
        : 0,
    };
  });

  return sortFriendRosterItems(profileItems);
}

export async function getUnreadDirectMessageCount(
  currentUserProfileId: string,
) {
  return prisma.directMessage.count({
    where: {
      readAt: null,
      senderId: {
        not: currentUserProfileId,
      },
      conversation: {
        OR: [
          {
            userAId: currentUserProfileId,
          },
          {
            userBId: currentUserProfileId,
          },
        ],
      },
    },
  });
}

export async function markDirectConversationRead({
  conversationId,
  peerProfileId,
}: {
  conversationId: string;
  peerProfileId: string;
}) {
  return prisma.directMessage.updateMany({
    where: {
      conversationId,
      readAt: null,
      senderId: peerProfileId,
    },
    data: {
      readAt: new Date(),
    },
  });
}

export async function getDirectConversationThread(
  currentUserProfileId: string,
  conversationId: string,
) {
  const conversation = await prisma.conversation.findFirst({
    where: {
      id: conversationId,
      OR: [
        {
          userAId: currentUserProfileId,
        },
        {
          userBId: currentUserProfileId,
        },
      ],
    },
    select: conversationThreadSelect,
  });

  if (!conversation) {
    return null;
  }

  const peerId = getConversationPeerId(conversation, currentUserProfileId);
  const [sendPolicy, relation, remarkName] = await Promise.all([
    getDirectMessageSendPolicy(currentUserProfileId, peerId),
    getFollowRelationState({
      targetProfileId: peerId,
      viewerProfileId: currentUserProfileId,
    }),
    getProfileRemarkName({
      ownerProfileId: currentUserProfileId,
      targetProfileId: peerId,
    }),
  ]);

  return mapConversationThread(
    conversation,
    currentUserProfileId,
    sendPolicy,
    relation.isMutualFollow,
    remarkName,
  );
}

export async function getDirectConversationActivityContext({
  accessToken,
  activityId,
  currentUserProfileId,
  peerProfileId,
}: {
  accessToken?: string | null;
  activityId: string;
  currentUserProfileId: string;
  peerProfileId: string;
}): Promise<DirectConversationActivityContextViewModel | null> {
  const activity = await prisma.activity.findFirst({
    where: {
      id: activityId,
      organizerId: {
        in: [currentUserProfileId, peerProfileId],
      },
      type: {
        not: "PUBLIC_EVENT",
      },
      OR: [
        {
          visibility: "PUBLIC",
        },
        {
          organizerId: currentUserProfileId,
        },
        {
          participants: {
            some: {
              userProfileId: currentUserProfileId,
              status: {
                in: ["JOINED", "APPROVED", "PENDING"],
              },
            },
          },
        },
        ...buildPrivateActivityShareAccessWhere(accessToken),
      ],
    },
    select: {
      id: true,
      title: true,
      startAt: true,
      city: true,
      address: true,
    },
  });

  if (!activity) {
    return null;
  }

  return {
    id: activity.id,
    title: activity.title,
    startAt: activity.startAt.toISOString(),
    locationLabel: [activity.city, activity.address]
      .filter(Boolean)
      .join(" · "),
  };
}
