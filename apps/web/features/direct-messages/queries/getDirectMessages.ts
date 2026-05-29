import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  getConversationPair,
  getConversationPeerId,
} from "../utils/conversation";

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

type ConversationListResult = Prisma.ConversationGetPayload<{
  select: typeof conversationListSelect;
}>;

type ConversationThreadResult = Prisma.ConversationGetPayload<{
  select: typeof conversationThreadSelect;
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

export type DirectConversationListItemViewModel = {
  id: string;
  peer: DirectMessageUserViewModel;
  lastMessage: DirectMessagePreviewViewModel | null;
  lastMessageAt: string | null;
  createdAt: string;
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
): DirectConversationListItemViewModel {
  return {
    id: conversation.id,
    peer: mapPeer(conversation, currentUserProfileId),
    lastMessage: mapLastMessage(conversation),
    lastMessageAt: conversation.lastMessageAt?.toISOString() ?? null,
    createdAt: conversation.createdAt.toISOString(),
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

  return conversations.map((conversation) =>
    mapConversationListItem(conversation, currentUserProfileId),
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
