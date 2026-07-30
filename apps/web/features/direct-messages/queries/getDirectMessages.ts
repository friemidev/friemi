import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  compareOptionalFriendNearestActivities,
  getFriendNearestActivitySignals,
  type FriendNearestActivitySignalViewModel,
} from "@/features/friends/queries/getFriendNearestActivitySignals";
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
  type UserPresenceStatusValue,
} from "@/features/profile/presence";

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

const friendshipRosterSelect = {
  id: true,
  createdAt: true,
  userAId: true,
  userBId: true,
  userA: {
    select: userSummarySelect,
  },
  userB: {
    select: userSummarySelect,
  },
} satisfies Prisma.FriendshipSelect;

type ConversationListResult = Prisma.ConversationGetPayload<{
  select: typeof conversationListSelect;
}>;

type ConversationThreadResult = Prisma.ConversationGetPayload<{
  select: typeof conversationThreadSelect;
}>;

type FriendshipRosterResult = Prisma.FriendshipGetPayload<{
  select: typeof friendshipRosterSelect;
}>;

export type DirectMessageUserViewModel = {
  id: string;
  nickname: string;
  friendCode: string | null;
  avatarUrl: string | null;
  bio: string | null;
  isOnline: boolean;
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
  rosterId: string;
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

function mapUserProfile(user: {
  id: string;
  nickname: string;
  friendCode: string | null;
  avatarUrl: string | null;
  bio: string | null;
  lastActiveAt: Date | null;
  presenceStatus: string | null;
}): DirectMessageUserViewModel {
  const hasPublicNickname = user.nickname.trim().length > 0;
  const presence = getUserPresenceState({
    lastActiveAt: user.lastActiveAt,
    status: user.presenceStatus,
  });

  return {
    id: user.id,
    nickname: hasPublicNickname
      ? user.nickname
      : user.friendCode
        ? `NF ${user.friendCode}`
        : "NF",
    friendCode: user.friendCode,
    avatarUrl: hasPublicNickname ? user.avatarUrl : null,
    bio: user.bio,
    isOnline: presence.isOnline,
    presenceStatus: presence.status,
  };
}

function mapPeer(
  conversation: Pick<
    ConversationListResult,
    "userA" | "userAId" | "userB" | "userBId"
  >,
  currentUserProfileId: string,
): DirectMessageUserViewModel {
  const peerId = getConversationPeerId(conversation, currentUserProfileId);
  const peer =
    peerId === conversation.userAId ? conversation.userA : conversation.userB;

  return mapUserProfile(peer);
}

function mapFriendshipPeer(
  friendship: FriendshipRosterResult,
  currentUserProfileId: string,
): DirectMessageUserViewModel {
  const peer =
    friendship.userAId === currentUserProfileId
      ? friendship.userB
      : friendship.userA;

  return mapUserProfile(peer);
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
): DirectConversationListItemViewModel {
  return {
    id: conversation.id,
    peer: mapPeer(conversation, currentUserProfileId),
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
): DirectConversationThreadViewModel {
  const currentUser =
    currentUserProfileId === conversation.userAId
      ? conversation.userA
      : conversation.userB;

  return {
    ...mapConversationListItem(conversation, currentUserProfileId),
    canSend: sendPolicy.canSend,
    currentUser: mapUserProfile(currentUser),
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

  const friendships = await prisma.friendship.findMany({
    where: {
      OR: uniquePeerIds.map((peerId) =>
        getConversationPair(currentUserProfileId, peerId),
      ),
    },
    select: {
      userAId: true,
      userBId: true,
    },
  });

  return new Set(
    friendships.map((friendship) =>
      getConversationPeerId(friendship, currentUserProfileId),
    ),
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
      return (
        activityOrder || itemA.rosterId.localeCompare(itemB.rosterId)
      );
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

  try {
    const friendPeerIds = await getFriendPeerIds(currentUserProfileId, peerIds);
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
    ),
  );
}

export async function getDirectMessageFriendRoster(
  currentUserProfileId: string,
) {
  const friendships = await prisma.friendship.findMany({
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
    orderBy: [{ createdAt: "desc" }, { id: "asc" }],
    take: 80,
    select: friendshipRosterSelect,
  });
  const friendIds = friendships.map(
    (friendship) => mapFriendshipPeer(friendship, currentUserProfileId).id,
  );
  const [conversations, activitiesByFriendId] = await Promise.all([
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
    getFriendNearestActivitySignals({
      friendIds,
      limitPerFriend: friendActivitySignalLimitPerFriend,
      viewerProfileId: currentUserProfileId,
    }).catch((error: unknown) => {
      console.error("Failed to load mobile friend activity signals", error);

      return new Map<string, DirectConversationActivitySignalViewModel[]>();
    }),
  ]);
  const unreadCountByConversationId = await getUnreadDirectMessageCountMap(
    currentUserProfileId,
    conversations.map((conversation) => conversation.id),
  );
  const conversationsByFriendId = new Map<string, ConversationListResult>();
  const friendshipsByFriendId = new Map<string, FriendshipRosterResult>();

  for (const friendship of friendships) {
    friendshipsByFriendId.set(
      mapFriendshipPeer(friendship, currentUserProfileId).id,
      friendship,
    );
  }

  for (const conversation of conversations) {
    conversationsByFriendId.set(
      getConversationPeerId(conversation, currentUserProfileId),
      conversation,
    );
  }

  const friendItems = friendships.map((friendship) => {
    const friend = mapFriendshipPeer(friendship, currentUserProfileId);
    const conversation = conversationsByFriendId.get(friend.id);

    return {
      friendshipId: friendship.id,
      isFriend: true,
      rosterId: `friendship:${friendship.id}`,
      friend,
      conversationId: conversation?.id ?? null,
      lastMessage: conversation ? mapLastMessage(conversation) : null,
      lastMessageAt:
        conversation?.lastMessageAt?.toISOString() ??
        conversation?.messages[0]?.createdAt.toISOString() ??
        null,
      createdAt: friendship.createdAt.toISOString(),
      recentActivities: activitiesByFriendId.get(friend.id) ?? [],
      unreadCount: conversation
        ? (unreadCountByConversationId.get(conversation.id) ?? 0)
        : 0,
    };
  });
  const strangerConversationItems = conversations
    .filter((conversation) => {
      const peerId = getConversationPeerId(conversation, currentUserProfileId);

      return !friendshipsByFriendId.has(peerId) && conversation.messages.length > 0;
    })
    .map((conversation) => ({
      friendshipId: null,
      isFriend: false,
      rosterId: `conversation:${conversation.id}`,
      friend: mapPeer(conversation, currentUserProfileId),
      conversationId: conversation.id,
      lastMessage: mapLastMessage(conversation),
      lastMessageAt:
        conversation.lastMessageAt?.toISOString() ??
        conversation.messages[0]?.createdAt.toISOString() ??
        null,
      createdAt: conversation.createdAt.toISOString(),
      recentActivities: [],
      unreadCount: unreadCountByConversationId.get(conversation.id) ?? 0,
    }));

  return sortFriendRosterItems([...friendItems, ...strangerConversationItems]);
}

export async function getUnreadDirectMessageConversationCount(
  currentUserProfileId: string,
) {
  const unreadConversations = await prisma.directMessage.findMany({
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
    distinct: ["conversationId"],
    select: {
      conversationId: true,
    },
    take: 100,
  });

  return unreadConversations.length;
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
  const sendPolicy = await getDirectMessageSendPolicy(
    currentUserProfileId,
    peerId,
  );

  return mapConversationThread(conversation, currentUserProfileId, sendPolicy);
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
