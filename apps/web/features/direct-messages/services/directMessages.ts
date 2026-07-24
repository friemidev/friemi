import type { ActivityStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getViewerFriendIds } from "@/features/friends/queries/getViewerFriendIds";
import {
  buildPrivateActivityFriendAccessWhere,
  buildPrivateActivityShareAccessWhere,
} from "@/features/activities/utils/activityShareAccess";
import {
  initialTrustScore,
  isLowTrustScore,
} from "@/features/trust/trustScore";
import { getTrustScore } from "@/features/trust/trustScoreEvents";
import {
  getConversationPair,
  getConversationPeerId,
} from "../utils/conversation";

export const directMessageBodyMaxLength = 1000;
export const directMessageImageMaxCount = 4;
export const nonFriendDirectMessageLimit = 2;

export type DirectMessageErrorCode =
  | "AUTH_REQUIRED"
  | "SELF_CONVERSATION"
  | "LOW_TRUST"
  | "NOT_FRIENDS"
  | "NON_FRIEND_LIMIT_REACHED"
  | "CONVERSATION_UNAVAILABLE"
  | "EMPTY_BODY"
  | "BODY_TOO_LONG"
  | "TOO_MANY_IMAGES"
  | "INVALID_IMAGE_URL";

type DbClient = typeof prisma | Prisma.TransactionClient;

export type DirectMessageSendPolicyReason = "ALLOWED" | DirectMessageErrorCode;

export type DirectMessageSendPolicy = {
  canSend: boolean;
  conversationId: string | null;
  hasPeerReplied: boolean;
  isFriend: boolean;
  reason: DirectMessageSendPolicyReason;
  remainingNonFriendMessages: number | null;
  trustScore: number;
};

type ResolveDirectMessageSendPolicyInput = {
  conversationId?: string | null;
  currentUserMessageCount?: number;
  currentUserProfileId: string;
  hasOrganizerActivity?: boolean;
  hasPeerReplied?: boolean;
  isFriend?: boolean;
  peerProfileId: string;
  trustScore?: number;
};

const directMessageTimingEnabled =
  process.env.DEBUG_DIRECT_MESSAGE_TIMING === "1";

function logDirectMessageServiceTiming(
  label: string,
  timings: Record<string, number | string | undefined>,
) {
  if (!directMessageTimingEnabled) {
    return;
  }

  console.info(`[direct-message service timing] ${label}`, timings);
}

const organizerMessageActivityStatuses: ActivityStatus[] = [
  "OPEN",
  "FULL",
  "RECRUITING",
  "CONFIRMED",
  "ENDED",
  "CANCELLED",
];

const directConversationSelect = {
  id: true,
  userAId: true,
  userBId: true,
  lastMessageAt: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.ConversationSelect;

const directConversationMessageSendSelect = {
  id: true,
} satisfies Prisma.ConversationSelect;

const directConversationMessageAccessSelect = {
  id: true,
  userAId: true,
  userBId: true,
} satisfies Prisma.ConversationSelect;

const directMessageSelect = {
  id: true,
  conversationId: true,
  senderId: true,
  activityId: true,
  body: true,
  imageUrls: true,
  readAt: true,
  createdAt: true,
} satisfies Prisma.DirectMessageSelect;

export type DirectConversationViewModel = Prisma.ConversationGetPayload<{
  select: typeof directConversationSelect;
}>;

export type DirectMessageSendConversationViewModel =
  Prisma.ConversationGetPayload<{
    select: typeof directConversationMessageSendSelect;
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

function normalizeDirectMessageImageUrls(imageUrls?: string[]) {
  const normalizedImageUrls = [...new Set(imageUrls ?? [])]
    .map((url) => url.trim())
    .filter(Boolean);

  if (normalizedImageUrls.length > directMessageImageMaxCount) {
    throw new DirectMessageDomainError("TOO_MANY_IMAGES");
  }

  for (const imageUrl of normalizedImageUrls) {
    try {
      const parsedUrl = new URL(imageUrl);

      if (parsedUrl.protocol !== "https:" && parsedUrl.protocol !== "http:") {
        throw new DirectMessageDomainError("INVALID_IMAGE_URL");
      }
    } catch {
      throw new DirectMessageDomainError("INVALID_IMAGE_URL");
    }
  }

  return normalizedImageUrls;
}

function normalizeDirectMessagePayload(body: string, imageUrls?: string[]) {
  const normalizedBody = body.trim();
  const normalizedImageUrls = normalizeDirectMessageImageUrls(imageUrls);

  if (!normalizedBody && normalizedImageUrls.length === 0) {
    throw new DirectMessageDomainError("EMPTY_BODY");
  }

  if (normalizedBody.length > directMessageBodyMaxLength) {
    throw new DirectMessageDomainError("BODY_TOO_LONG");
  }

  return {
    body: normalizedBody,
    imageUrls: normalizedImageUrls,
  };
}

async function assertFriendshipExists(
  db: DbClient,
  userId: string,
  otherUserId: string,
) {
  assertDifferentUsers(userId, otherUserId);

  const friendship = await findFriendship(db, userId, otherUserId);

  if (!friendship) {
    throw new DirectMessageDomainError("NOT_FRIENDS");
  }
}

async function findFriendship(
  db: DbClient,
  userId: string,
  otherUserId: string,
) {
  const pair = getConversationPair(userId, otherUserId);

  return db.friendship.findUnique({
    where: {
      userAId_userBId: pair,
    },
    select: {
      id: true,
    },
  });
}

async function findOrganizerMessageActivity(
  db: DbClient,
  currentUserProfileId: string,
  organizerProfileId: string,
  friendIds: string[],
  accessToken?: string | null,
  activityId?: string,
) {
  return db.activity.findFirst({
    where: {
      id: activityId,
      organizerId: organizerProfileId,
      type: {
        not: "PUBLIC_EVENT",
      },
      status: {
        in: organizerMessageActivityStatuses,
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
        ...buildPrivateActivityFriendAccessWhere(friendIds),
        ...buildPrivateActivityShareAccessWhere(accessToken),
      ],
      organizer: {
        status: "ACTIVE",
      },
    },
    select: {
      id: true,
    },
  });
}

async function findOrganizerParticipantMessageActivity(
  db: DbClient,
  organizerProfileId: string,
  participantProfileId: string,
  activityId: string,
) {
  return db.activity.findFirst({
    where: {
      id: activityId,
      organizerId: organizerProfileId,
      type: {
        not: "PUBLIC_EVENT",
      },
      status: {
        in: organizerMessageActivityStatuses,
      },
      organizer: {
        status: "ACTIVE",
      },
      participants: {
        some: {
          userProfileId: participantProfileId,
          status: {
            in: ["JOINED", "APPROVED", "PENDING"],
          },
          userProfile: {
            status: "ACTIVE",
          },
        },
      },
    },
    select: {
      id: true,
    },
  });
}

async function findExistingConversation(
  db: DbClient,
  userId: string,
  otherUserId: string,
) {
  const pair = getConversationPair(userId, otherUserId);

  return db.conversation.findUnique({
    where: {
      userAId_userBId: pair,
    },
    select: {
      id: true,
    },
  });
}

async function hasPeerReplied(
  db: DbClient,
  conversationId: string,
  peerProfileId: string,
) {
  const reply = await db.directMessage.findFirst({
    where: {
      conversationId,
      senderId: peerProfileId,
    },
    select: {
      id: true,
    },
  });

  return Boolean(reply);
}

async function countCurrentUserNonFriendMessages(
  db: DbClient,
  conversationId: string,
  currentUserProfileId: string,
) {
  return db.directMessage.count({
    where: {
      conversationId,
      senderId: currentUserProfileId,
    },
  });
}

export function resolveDirectMessageSendPolicy({
  conversationId = null,
  currentUserMessageCount = 0,
  currentUserProfileId,
  hasOrganizerActivity = false,
  hasPeerReplied = false,
  isFriend = false,
  peerProfileId,
  trustScore = initialTrustScore,
}: ResolveDirectMessageSendPolicyInput): DirectMessageSendPolicy {
  if (currentUserProfileId === peerProfileId) {
    return {
      canSend: false,
      conversationId,
      hasPeerReplied: false,
      isFriend: false,
      reason: "SELF_CONVERSATION",
      remainingNonFriendMessages: 0,
      trustScore,
    };
  }

  if (isFriend) {
    return {
      canSend: true,
      conversationId,
      hasPeerReplied,
      isFriend: true,
      reason: "ALLOWED",
      remainingNonFriendMessages: null,
      trustScore,
    };
  }

  if (isLowTrustScore(trustScore)) {
    return {
      canSend: false,
      conversationId,
      hasPeerReplied,
      isFriend: false,
      reason: "LOW_TRUST",
      remainingNonFriendMessages: 0,
      trustScore,
    };
  }

  if (!hasOrganizerActivity && !conversationId) {
    return {
      canSend: false,
      conversationId,
      hasPeerReplied,
      isFriend: false,
      reason: "NOT_FRIENDS",
      remainingNonFriendMessages: 0,
      trustScore,
    };
  }

  if (hasPeerReplied) {
    return {
      canSend: true,
      conversationId,
      hasPeerReplied: true,
      isFriend: false,
      reason: "ALLOWED",
      remainingNonFriendMessages: null,
      trustScore,
    };
  }

  const remainingNonFriendMessages = Math.max(
    0,
    nonFriendDirectMessageLimit - currentUserMessageCount,
  );

  return {
    canSend: remainingNonFriendMessages > 0,
    conversationId,
    hasPeerReplied: false,
    isFriend: false,
    reason:
      remainingNonFriendMessages > 0 ? "ALLOWED" : "NON_FRIEND_LIMIT_REACHED",
    remainingNonFriendMessages,
    trustScore,
  };
}

export async function getDirectMessageSendPolicy(
  currentUserProfileId: string,
  peerProfileId: string,
): Promise<DirectMessageSendPolicy> {
  if (currentUserProfileId === peerProfileId) {
    const trustScore = await getTrustScore(prisma, currentUserProfileId).catch(
      () => initialTrustScore,
    );

    return resolveDirectMessageSendPolicy({
      currentUserProfileId,
      peerProfileId,
      trustScore,
    });
  }

  const [friendship, organizerActivity, existingConversation, trustScore] =
    await Promise.all([
      findFriendship(prisma, currentUserProfileId, peerProfileId),
      findOrganizerMessageActivity(
        prisma,
        currentUserProfileId,
        peerProfileId,
        [],
      ),
      findExistingConversation(prisma, currentUserProfileId, peerProfileId),
      getTrustScore(prisma, currentUserProfileId),
    ]);

  if (friendship || !existingConversation) {
    return resolveDirectMessageSendPolicy({
      conversationId: existingConversation?.id ?? null,
      currentUserProfileId,
      hasOrganizerActivity: Boolean(organizerActivity),
      isFriend: Boolean(friendship),
      peerProfileId,
      trustScore,
    });
  }

  const [peerReplied, currentUserMessageCount] = await Promise.all([
    hasPeerReplied(prisma, existingConversation.id, peerProfileId),
    countCurrentUserNonFriendMessages(
      prisma,
      existingConversation.id,
      currentUserProfileId,
    ),
  ]);

  return resolveDirectMessageSendPolicy({
    conversationId: existingConversation.id,
    currentUserMessageCount,
    currentUserProfileId,
    hasOrganizerActivity: Boolean(organizerActivity),
    hasPeerReplied: peerReplied,
    isFriend: false,
    peerProfileId,
    trustScore,
  });
}

async function assertDirectMessageSendAccess(
  db: DbClient,
  userId: string,
  otherUserId: string,
) {
  assertDifferentUsers(userId, otherUserId);

  const [friendship, organizerActivity, existingConversation] =
    await Promise.all([
      findFriendship(db, userId, otherUserId),
      findOrganizerMessageActivity(db, userId, otherUserId, []),
      findExistingConversation(db, userId, otherUserId),
    ]);

  if (friendship) {
    return;
  }

  const trustScore = await getTrustScore(db, userId);

  if (!existingConversation) {
    const policy = resolveDirectMessageSendPolicy({
      conversationId: null,
      currentUserProfileId: userId,
      hasOrganizerActivity: Boolean(organizerActivity),
      isFriend: false,
      peerProfileId: otherUserId,
      trustScore,
    });

    if (!policy.canSend) {
      throw new DirectMessageDomainError(
        policy.reason as DirectMessageErrorCode,
      );
    }

    return;
  }

  const [peerReplied, currentUserMessageCount] = await Promise.all([
    hasPeerReplied(db, existingConversation.id, otherUserId),
    countCurrentUserNonFriendMessages(db, existingConversation.id, userId),
  ]);
  const policy = resolveDirectMessageSendPolicy({
    conversationId: existingConversation.id,
    currentUserMessageCount,
    currentUserProfileId: userId,
    hasOrganizerActivity: Boolean(organizerActivity),
    hasPeerReplied: peerReplied,
    isFriend: false,
    peerProfileId: otherUserId,
    trustScore,
  });

  if (!policy.canSend) {
    throw new DirectMessageDomainError(policy.reason as DirectMessageErrorCode);
  }
}

export async function canSendDirectMessageToProfile({
  currentUserProfileId,
  peerProfileId,
}: {
  currentUserProfileId: string;
  peerProfileId: string;
}): Promise<boolean> {
  try {
    await assertDirectMessageSendAccess(
      prisma,
      currentUserProfileId,
      peerProfileId,
    );

    return true;
  } catch (error) {
    if (error instanceof DirectMessageDomainError) {
      return false;
    }

    throw error;
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

export async function getOrCreateActivityOrganizerConversation({
  accessToken,
  currentUserProfileId,
  organizerProfileId,
  activityId,
}: {
  accessToken?: string | null;
  currentUserProfileId: string;
  organizerProfileId: string;
  activityId: string;
}): Promise<DirectConversationViewModel> {
  assertDifferentUsers(currentUserProfileId, organizerProfileId);

  let activity = await findOrganizerMessageActivity(
    prisma,
    currentUserProfileId,
    organizerProfileId,
    [],
    accessToken,
    activityId,
  );

  if (!activity) {
    const friendIds = await getViewerFriendIds(currentUserProfileId);

    activity = await findOrganizerMessageActivity(
      prisma,
      currentUserProfileId,
      organizerProfileId,
      friendIds,
      accessToken,
      activityId,
    );
  }

  if (!activity) {
    throw new DirectMessageDomainError("CONVERSATION_UNAVAILABLE");
  }

  const pair = getConversationPair(currentUserProfileId, organizerProfileId);

  return prisma.conversation.upsert({
    where: {
      userAId_userBId: pair,
    },
    create: pair,
    update: {},
    select: directConversationSelect,
  });
}

export async function getOrCreateActivityParticipantConversation({
  activityId,
  currentUserProfileId,
  participantProfileId,
}: {
  activityId: string;
  currentUserProfileId: string;
  participantProfileId: string;
}): Promise<DirectConversationViewModel> {
  assertDifferentUsers(currentUserProfileId, participantProfileId);

  const activity = await findOrganizerParticipantMessageActivity(
    prisma,
    currentUserProfileId,
    participantProfileId,
    activityId,
  );

  if (!activity) {
    throw new DirectMessageDomainError("CONVERSATION_UNAVAILABLE");
  }

  const pair = getConversationPair(currentUserProfileId, participantProfileId);

  return prisma.conversation.upsert({
    where: {
      userAId_userBId: pair,
    },
    create: pair,
    update: {},
    select: directConversationSelect,
  });
}

export async function sendDirectMessage({
  activityId,
  currentUserProfileId,
  conversationId,
  body,
  imageUrls,
}: {
  activityId?: string | null;
  currentUserProfileId: string;
  conversationId: string;
  body: string;
  imageUrls?: string[];
}): Promise<{
  conversation: DirectMessageSendConversationViewModel;
  message: DirectMessageViewModel;
}> {
  const payload = normalizeDirectMessagePayload(body, imageUrls);

  return prisma.$transaction(async (tx) => {
    const transactionStartedAt = Date.now();
    const findConversationStartedAt = Date.now();
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
      select: directConversationMessageAccessSelect,
    });
    const findConversationMs = Date.now() - findConversationStartedAt;

    if (!conversation) {
      throw new DirectMessageDomainError("CONVERSATION_UNAVAILABLE");
    }

    const peerProfileId = getConversationPeerId(
      conversation,
      currentUserProfileId,
    );

    const accessStartedAt = Date.now();
    await assertDirectMessageSendAccess(
      tx,
      currentUserProfileId,
      peerProfileId,
    );
    const accessMs = Date.now() - accessStartedAt;

    const createMessageStartedAt = Date.now();
    const message = await tx.directMessage.create({
      data: {
        conversationId: conversation.id,
        senderId: currentUserProfileId,
        activityId: activityId ?? null,
        body: payload.body,
        imageUrls: payload.imageUrls,
      },
      select: directMessageSelect,
    });
    const createMessageMs = Date.now() - createMessageStartedAt;

    const updateConversationStartedAt = Date.now();
    const updatedConversation = await tx.conversation.update({
      where: {
        id: conversation.id,
      },
      data: {
        lastMessageAt: message.createdAt,
      },
      select: directConversationMessageSendSelect,
    });
    const updateConversationMs = Date.now() - updateConversationStartedAt;

    logDirectMessageServiceTiming("sendDirectMessage", {
      findConversationMs,
      accessMs,
      createMessageMs,
      updateConversationMs,
      totalMs: Date.now() - transactionStartedAt,
      conversationId: updatedConversation.id,
      imageCount: payload.imageUrls.length,
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
  imageUrls,
}: {
  currentUserProfileId: string;
  friendProfileId: string;
  body: string;
  imageUrls?: string[];
}): Promise<{
  conversation: DirectMessageSendConversationViewModel;
  message: DirectMessageViewModel;
}> {
  const payload = normalizeDirectMessagePayload(body, imageUrls);

  return prisma.$transaction(async (tx) => {
    const transactionStartedAt = Date.now();
    const accessStartedAt = Date.now();
    await assertFriendshipExists(tx, currentUserProfileId, friendProfileId);
    const accessMs = Date.now() - accessStartedAt;

    const pair = getConversationPair(currentUserProfileId, friendProfileId);
    const upsertConversationStartedAt = Date.now();
    const conversation = await tx.conversation.upsert({
      where: {
        userAId_userBId: pair,
      },
      create: pair,
      update: {},
      select: directConversationMessageSendSelect,
    });
    const upsertConversationMs = Date.now() - upsertConversationStartedAt;
    const createMessageStartedAt = Date.now();
    const message = await tx.directMessage.create({
      data: {
        conversationId: conversation.id,
        senderId: currentUserProfileId,
        body: payload.body,
        imageUrls: payload.imageUrls,
      },
      select: directMessageSelect,
    });
    const createMessageMs = Date.now() - createMessageStartedAt;
    const updateConversationStartedAt = Date.now();
    const updatedConversation = await tx.conversation.update({
      where: {
        id: conversation.id,
      },
      data: {
        lastMessageAt: message.createdAt,
      },
      select: directConversationMessageSendSelect,
    });
    const updateConversationMs = Date.now() - updateConversationStartedAt;

    logDirectMessageServiceTiming("sendDirectMessageToFriend", {
      accessMs,
      upsertConversationMs,
      createMessageMs,
      updateConversationMs,
      totalMs: Date.now() - transactionStartedAt,
      conversationId: updatedConversation.id,
      imageCount: payload.imageUrls.length,
    });

    return {
      conversation: updatedConversation,
      message,
    };
  });
}
