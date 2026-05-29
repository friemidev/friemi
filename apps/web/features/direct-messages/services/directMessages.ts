import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  getConversationPair,
  getConversationPeerId,
} from "../utils/conversation";

export const directMessageBodyMaxLength = 1000;

export type DirectMessageErrorCode =
  | "SELF_CONVERSATION"
  | "NOT_FRIENDS"
  | "CONVERSATION_UNAVAILABLE"
  | "EMPTY_BODY"
  | "BODY_TOO_LONG";

type DbClient = typeof prisma | Prisma.TransactionClient;

const directConversationSelect = {
  id: true,
  userAId: true,
  userBId: true,
  lastMessageAt: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.ConversationSelect;

const directMessageSelect = {
  id: true,
  conversationId: true,
  senderId: true,
  body: true,
  readAt: true,
  createdAt: true,
} satisfies Prisma.DirectMessageSelect;

export type DirectConversationViewModel = Prisma.ConversationGetPayload<{
  select: typeof directConversationSelect;
}>;

export type DirectMessageViewModel = Prisma.DirectMessageGetPayload<{
  select: typeof directMessageSelect;
}>;

export class DirectMessageDomainError extends Error {
  code: DirectMessageErrorCode;

  constructor(code: DirectMessageErrorCode) {
    super(code);
    this.name = "DirectMessageDomainError";
    this.code = code;
  }
}

function assertDifferentUsers(userId: string, otherUserId: string) {
  if (userId === otherUserId) {
    throw new DirectMessageDomainError("SELF_CONVERSATION");
  }
}

function normalizeDirectMessageBody(body: string) {
  const normalizedBody = body.trim();

  if (!normalizedBody) {
    throw new DirectMessageDomainError("EMPTY_BODY");
  }

  if (normalizedBody.length > directMessageBodyMaxLength) {
    throw new DirectMessageDomainError("BODY_TOO_LONG");
  }

  return normalizedBody;
}

async function assertFriendshipExists(
  db: DbClient,
  userId: string,
  otherUserId: string,
) {
  assertDifferentUsers(userId, otherUserId);

  const pair = getConversationPair(userId, otherUserId);
  const friendship = await db.friendship.findUnique({
    where: {
      userAId_userBId: pair,
    },
    select: {
      id: true,
    },
  });

  if (!friendship) {
    throw new DirectMessageDomainError("NOT_FRIENDS");
  }
}

export async function getOrCreateDirectConversation({
  currentUserProfileId,
  friendProfileId,
}: {
  currentUserProfileId: string;
  friendProfileId: string;
}): Promise<DirectConversationViewModel> {
  return prisma.$transaction(async (tx) => {
    await assertFriendshipExists(tx, currentUserProfileId, friendProfileId);

    const pair = getConversationPair(currentUserProfileId, friendProfileId);

    return tx.conversation.upsert({
      where: {
        userAId_userBId: pair,
      },
      create: pair,
      update: {},
      select: directConversationSelect,
    });
  });
}

export async function sendDirectMessage({
  currentUserProfileId,
  conversationId,
  body,
}: {
  currentUserProfileId: string;
  conversationId: string;
  body: string;
}): Promise<{
  conversation: DirectConversationViewModel;
  message: DirectMessageViewModel;
}> {
  const normalizedBody = normalizeDirectMessageBody(body);

  return prisma.$transaction(async (tx) => {
    const conversation = await tx.conversation.findFirst({
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
      select: directConversationSelect,
    });

    if (!conversation) {
      throw new DirectMessageDomainError("CONVERSATION_UNAVAILABLE");
    }

    await assertFriendshipExists(
      tx,
      currentUserProfileId,
      getConversationPeerId(conversation, currentUserProfileId),
    );

    const message = await tx.directMessage.create({
      data: {
        conversationId: conversation.id,
        senderId: currentUserProfileId,
        body: normalizedBody,
      },
      select: directMessageSelect,
    });

    const updatedConversation = await tx.conversation.update({
      where: {
        id: conversation.id,
      },
      data: {
        lastMessageAt: message.createdAt,
      },
      select: directConversationSelect,
    });

    return {
      conversation: updatedConversation,
      message,
    };
  });
}

export async function sendDirectMessageToFriend({
  currentUserProfileId,
  friendProfileId,
  body,
}: {
  currentUserProfileId: string;
  friendProfileId: string;
  body: string;
}): Promise<{
  conversation: DirectConversationViewModel;
  message: DirectMessageViewModel;
}> {
  const normalizedBody = normalizeDirectMessageBody(body);

  return prisma.$transaction(async (tx) => {
    await assertFriendshipExists(tx, currentUserProfileId, friendProfileId);

    const pair = getConversationPair(currentUserProfileId, friendProfileId);
    const conversation = await tx.conversation.upsert({
      where: {
        userAId_userBId: pair,
      },
      create: pair,
      update: {},
      select: directConversationSelect,
    });
    const message = await tx.directMessage.create({
      data: {
        conversationId: conversation.id,
        senderId: currentUserProfileId,
        body: normalizedBody,
      },
      select: directMessageSelect,
    });
    const updatedConversation = await tx.conversation.update({
      where: {
        id: conversation.id,
      },
      data: {
        lastMessageAt: message.createdAt,
      },
      select: directConversationSelect,
    });

    return {
      conversation: updatedConversation,
      message,
    };
  });
}
