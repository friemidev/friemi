import type {
  ActivityStatus,
  ParticipantStatus,
  Prisma,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  getConversationPair,
  getConversationPeerId,
} from "../utils/conversation";

const friendActivityWindowDays = 30;
const friendActivitySignalLimitPerFriend = 4;
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
];

const userSummarySelect = {
  id: true,
  nickname: true,
  avatarUrl: true,
  bio: true,
} satisfies Prisma.UserProfileSelect;

const messageSelect = {
  id: true,
  conversationId: true,
  senderId: true,
  body: true,
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
  avatarUrl: string | null;
  bio: string | null;
};

export type DirectMessagePreviewViewModel = {
  id: string;
  senderId: string;
  body: string;
  createdAt: string;
};

export type DirectConversationActivitySignalViewModel = {
  id: string;
  title: string;
  startAt: string;
};

export type DirectConversationListItemViewModel = {
  id: string;
  peer: DirectMessageUserViewModel;
  lastMessage: DirectMessagePreviewViewModel | null;
  lastMessageAt: string | null;
  createdAt: string;
  recentActivities: DirectConversationActivitySignalViewModel[];
};

export type DirectMessageFriendRosterItemViewModel = {
  friendshipId: string;
  friend: DirectMessageUserViewModel;
  conversationId: string | null;
  lastMessage: DirectMessagePreviewViewModel | null;
  lastMessageAt: string | null;
  createdAt: string;
  recentActivities: DirectConversationActivitySignalViewModel[];
};

export type DirectMessageThreadItemViewModel = {
  id: string;
  senderId: string;
  body: string;
  readAt: string | null;
  createdAt: string;
  isMine: boolean;
};

export type DirectConversationThreadViewModel =
  DirectConversationListItemViewModel & {
    canSend: boolean;
    messages: DirectMessageThreadItemViewModel[];
  };

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

  return {
    id: peer.id,
    nickname: peer.nickname,
    avatarUrl: peer.avatarUrl,
    bio: peer.bio,
  };
}

function mapFriendshipPeer(
  friendship: FriendshipRosterResult,
  currentUserProfileId: string,
): DirectMessageUserViewModel {
  const peer =
    friendship.userAId === currentUserProfileId
      ? friendship.userB
      : friendship.userA;

  return {
    id: peer.id,
    nickname: peer.nickname,
    avatarUrl: peer.avatarUrl,
    bio: peer.bio,
  };
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
    createdAt: lastMessage.createdAt.toISOString(),
  };
}

function mapConversationListItem(
  conversation: ConversationListResult,
  currentUserProfileId: string,
  recentActivities: DirectConversationActivitySignalViewModel[] = [],
): DirectConversationListItemViewModel {
  return {
    id: conversation.id,
    peer: mapPeer(conversation, currentUserProfileId),
    lastMessage: mapLastMessage(conversation),
    lastMessageAt: conversation.lastMessageAt?.toISOString() ?? null,
    createdAt: conversation.createdAt.toISOString(),
    recentActivities,
  };
}

function mapConversationThread(
  conversation: ConversationThreadResult,
  currentUserProfileId: string,
  canSend: boolean,
): DirectConversationThreadViewModel {
  return {
    ...mapConversationListItem(conversation, currentUserProfileId),
    canSend,
    messages: [...conversation.messages].reverse().map((message) => ({
      id: message.id,
      senderId: message.senderId,
      body: message.body,
      readAt: message.readAt?.toISOString() ?? null,
      createdAt: message.createdAt.toISOString(),
      isMine: message.senderId === currentUserProfileId,
    })),
  };
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

async function getFriendActivitySignals(friendIds: string[]) {
  if (friendIds.length === 0) {
    return new Map<string, DirectConversationActivitySignalViewModel[]>();
  }

  const now = new Date();
  const windowEnd = new Date(
    now.getTime() + friendActivityWindowDays * dayInMs,
  );
  const participations = await prisma.activityParticipant.findMany({
    where: {
      userProfileId: {
        in: friendIds,
      },
      status: {
        in: effectiveParticipantStatuses,
      },
      activity: {
        startAt: {
          gte: now,
          lte: windowEnd,
        },
        status: {
          in: visibleFriendActivityStatuses,
        },
        visibility: "PUBLIC",
        organizer: {
          status: "ACTIVE",
        },
      },
    },
    orderBy: [{ activity: { startAt: "asc" } }, { id: "asc" }],
    take: 250,
    select: {
      userProfileId: true,
      activity: {
        select: {
          id: true,
          title: true,
          startAt: true,
        },
      },
    },
  });
  const activitiesByFriendId = new Map<
    string,
    DirectConversationActivitySignalViewModel[]
  >();

  for (const participation of participations) {
    const activities =
      activitiesByFriendId.get(participation.userProfileId) ?? [];

    if (activities.length >= friendActivitySignalLimitPerFriend) {
      continue;
    }

    activities.push({
      id: participation.activity.id,
      title: participation.activity.title,
      startAt: participation.activity.startAt.toISOString(),
    });
    activitiesByFriendId.set(participation.userProfileId, activities);
  }

  return activitiesByFriendId;
}

function sortFriendRosterItems(
  items: DirectMessageFriendRosterItemViewModel[],
) {
  return [...items].sort((itemA, itemB) => {
    if (itemA.lastMessageAt && itemB.lastMessageAt) {
      return (
        new Date(itemB.lastMessageAt).getTime() -
          new Date(itemA.lastMessageAt).getTime() ||
        itemA.friendshipId.localeCompare(itemB.friendshipId)
      );
    }

    if (itemA.lastMessageAt) {
      return -1;
    }

    if (itemB.lastMessageAt) {
      return 1;
    }

    const firstActivityA = itemA.recentActivities[0]?.startAt;
    const firstActivityB = itemB.recentActivities[0]?.startAt;

    if (firstActivityA && firstActivityB) {
      return (
        new Date(firstActivityA).getTime() -
          new Date(firstActivityB).getTime() ||
        itemA.friendshipId.localeCompare(itemB.friendshipId)
      );
    }

    if (firstActivityA) {
      return -1;
    }

    if (firstActivityB) {
      return 1;
    }

    return (
      new Date(itemB.createdAt).getTime() - new Date(itemA.createdAt).getTime() ||
      itemA.friendshipId.localeCompare(itemB.friendshipId)
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
  const peerIds = conversations.map((conversation) =>
    getConversationPeerId(conversation, currentUserProfileId),
  );
  let activitiesByFriendId = new Map<
    string,
    DirectConversationActivitySignalViewModel[]
  >();

  try {
    const friendPeerIds = await getFriendPeerIds(currentUserProfileId, peerIds);
    activitiesByFriendId = await getFriendActivitySignals([...friendPeerIds]);
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
    friendIds.length === 0
      ? Promise.resolve([])
      : prisma.conversation.findMany({
          where: {
            OR: friendIds.map((friendId) =>
              getConversationPair(currentUserProfileId, friendId),
            ),
          },
          select: conversationListSelect,
        }),
    getFriendActivitySignals(friendIds).catch((error: unknown) => {
      console.error("Failed to load mobile friend activity signals", error);

      return new Map<string, DirectConversationActivitySignalViewModel[]>();
    }),
  ]);
  const conversationsByFriendId = new Map<string, ConversationListResult>();

  for (const conversation of conversations) {
    conversationsByFriendId.set(
      getConversationPeerId(conversation, currentUserProfileId),
      conversation,
    );
  }

  return sortFriendRosterItems(
    friendships.map((friendship) => {
      const friend = mapFriendshipPeer(friendship, currentUserProfileId);
      const conversation = conversationsByFriendId.get(friend.id);

      return {
        friendshipId: friendship.id,
        friend,
        conversationId: conversation?.id ?? null,
        lastMessage: conversation ? mapLastMessage(conversation) : null,
        lastMessageAt: conversation?.lastMessageAt?.toISOString() ?? null,
        createdAt: friendship.createdAt.toISOString(),
        recentActivities: activitiesByFriendId.get(friend.id) ?? [],
      };
    }),
  );
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
  const friendship = await prisma.friendship.findUnique({
    where: {
      userAId_userBId: getConversationPair(currentUserProfileId, peerId),
    },
    select: {
      id: true,
    },
  });

  return mapConversationThread(
    conversation,
    currentUserProfileId,
    Boolean(friendship),
  );
}
