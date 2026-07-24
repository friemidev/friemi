import type { ActivityStatus, ParticipantStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const activityRoomMessageMaxLength = 500;
export const defaultActivityRoomMessageLimit = 50;
export const maxActivityRoomMessageLimit = 100;

type DbClient = typeof prisma | Prisma.TransactionClient;

export type ActivityRoomChatErrorCode =
  | "ACTIVITY_NOT_FOUND"
  | "PUBLIC_EVENT_UNAVAILABLE"
  | "NOT_ROOM_MEMBER"
  | "ACTIVITY_CANCELLED"
  | "ACTIVITY_ENDED"
  | "EMPTY_BODY"
  | "BODY_TOO_LONG"
  | "MESSAGE_NOT_FOUND"
  | "DELETE_FORBIDDEN";

export type ActivityRoomChatMemberRole =
  | "ORGANIZER"
  | "CO_MANAGER"
  | "PARTICIPANT"
  | "NONE";

export type ActivityRoomChatPolicy = {
  canSend: boolean;
  canView: boolean;
  reason: ActivityRoomChatErrorCode | "ALLOWED";
  role: ActivityRoomChatMemberRole;
};

export type ActivityRoomMessageViewModel = {
  id: string;
  body: string;
  createdAt: string;
  isMine: boolean;
  sender: {
    id: string;
    avatarUrl: string | null;
    friendCode: string | null;
    nickname: string;
  };
};

type ResolveActivityRoomChatPolicyInput = {
  activityType?: "PUBLIC_EVENT" | "USER_HOSTED" | "LOCAL" | "TRIP" | null;
  endAt?: Date | null;
  isCoManager?: boolean;
  isOrganizer?: boolean;
  now?: Date;
  participantStatus?: ParticipantStatus | null;
  status?: ActivityStatus | null;
};

const roomParticipantStatuses: ParticipantStatus[] = ["JOINED", "APPROVED"];

const messageSelect = {
  id: true,
  body: true,
  createdAt: true,
  senderId: true,
  sender: {
    select: {
      id: true,
      avatarUrl: true,
      friendCode: true,
      nickname: true,
    },
  },
} satisfies Prisma.ActivityRoomMessageSelect;

function normalizeActivityRoomMessageLimit(limit: number) {
  if (!Number.isFinite(limit)) {
    return defaultActivityRoomMessageLimit;
  }

  return Math.max(1, Math.min(maxActivityRoomMessageLimit, Math.floor(limit)));
}

export function normalizeActivityRoomMessageBody(body: string) {
  const normalizedBody = body.trim();

  if (!normalizedBody) {
    throw new ActivityRoomChatDomainError("EMPTY_BODY");
  }

  if (normalizedBody.length > activityRoomMessageMaxLength) {
    throw new ActivityRoomChatDomainError("BODY_TOO_LONG");
  }

  return normalizedBody;
}

export function resolveActivityRoomChatPolicy({
  activityType,
  endAt = null,
  isCoManager = false,
  isOrganizer = false,
  now = new Date(),
  participantStatus = null,
  status = null,
}: ResolveActivityRoomChatPolicyInput): ActivityRoomChatPolicy {
  if (!status || !activityType) {
    return {
      canSend: false,
      canView: false,
      reason: "ACTIVITY_NOT_FOUND",
      role: "NONE",
    };
  }

  if (activityType === "PUBLIC_EVENT") {
    return {
      canSend: false,
      canView: false,
      reason: "PUBLIC_EVENT_UNAVAILABLE",
      role: "NONE",
    };
  }

  const role: ActivityRoomChatMemberRole = isOrganizer
    ? "ORGANIZER"
    : isCoManager
      ? "CO_MANAGER"
      : participantStatus && roomParticipantStatuses.includes(participantStatus)
        ? "PARTICIPANT"
        : "NONE";

  if (role === "NONE") {
    return {
      canSend: false,
      canView: false,
      reason: "NOT_ROOM_MEMBER",
      role,
    };
  }

  if (status === "CANCELLED") {
    return {
      canSend: false,
      canView: true,
      reason: "ACTIVITY_CANCELLED",
      role,
    };
  }

  if (status === "ENDED" || (endAt && endAt.getTime() <= now.getTime())) {
    return {
      canSend: false,
      canView: true,
      reason: "ACTIVITY_ENDED",
      role,
    };
  }

  return {
    canSend: true,
    canView: true,
    reason: "ALLOWED",
    role,
  };
}

export class ActivityRoomChatDomainError extends Error {
  code: ActivityRoomChatErrorCode;

  constructor(code: ActivityRoomChatErrorCode) {
    super(code);
    this.name = "ActivityRoomChatDomainError";
    this.code = code;
  }
}

function getDeniedActivityRoomChatReason(
  policy: ActivityRoomChatPolicy,
): ActivityRoomChatErrorCode {
  return policy.reason === "ALLOWED" ? "NOT_ROOM_MEMBER" : policy.reason;
}

function mapActivityRoomMessage(
  message: Prisma.ActivityRoomMessageGetPayload<{
    select: typeof messageSelect;
  }>,
  viewerProfileId: string,
): ActivityRoomMessageViewModel {
  return {
    id: message.id,
    body: message.body,
    createdAt: message.createdAt.toISOString(),
    isMine: message.senderId === viewerProfileId,
    sender: {
      id: message.sender.id,
      avatarUrl: message.sender.avatarUrl,
      friendCode: message.sender.friendCode,
      nickname:
        message.sender.nickname.trim() || message.sender.friendCode || "NF",
    },
  };
}

async function getActivityRoomPolicy(
  db: DbClient,
  profileId: string,
  activityId: string,
  now = new Date(),
) {
  const activity = await db.activity.findUnique({
    where: {
      id: activityId,
    },
    select: {
      id: true,
      endAt: true,
      organizerId: true,
      status: true,
      type: true,
      coManagers: {
        where: {
          managerProfileId: profileId,
        },
        select: {
          id: true,
        },
        take: 1,
      },
      participants: {
        where: {
          userProfileId: profileId,
        },
        select: {
          status: true,
        },
        take: 1,
      },
    },
  });

  return resolveActivityRoomChatPolicy({
    activityType: activity?.type ?? null,
    endAt: activity?.endAt ?? null,
    isCoManager: Boolean(activity?.coManagers.length),
    isOrganizer: activity?.organizerId === profileId,
    now,
    participantStatus: activity?.participants[0]?.status ?? null,
    status: activity?.status ?? null,
  });
}

export async function getActivityRoomChatPolicy({
  activityId,
  now,
  profileId,
}: {
  activityId: string;
  now?: Date;
  profileId: string;
}) {
  return getActivityRoomPolicy(prisma, profileId, activityId, now);
}

export async function canViewActivityRoomChat(
  profileId: string,
  activityId: string,
) {
  const policy = await getActivityRoomPolicy(prisma, profileId, activityId);

  return policy.canView;
}

export async function canSendActivityRoomMessage(
  profileId: string,
  activityId: string,
) {
  const policy = await getActivityRoomPolicy(prisma, profileId, activityId);

  return policy.canSend;
}

export async function getActivityRoomMessages(
  activityId: string,
  viewerProfileId: string,
  limit = defaultActivityRoomMessageLimit,
) {
  const policy = await getActivityRoomPolicy(
    prisma,
    viewerProfileId,
    activityId,
  );

  if (!policy.canView) {
    throw new ActivityRoomChatDomainError(
      getDeniedActivityRoomChatReason(policy),
    );
  }

  const messages = await prisma.activityRoomMessage.findMany({
    where: {
      activityId,
      deletedAt: null,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: normalizeActivityRoomMessageLimit(limit),
    select: messageSelect,
  });

  return [...messages]
    .reverse()
    .map((message) => mapActivityRoomMessage(message, viewerProfileId));
}

export async function sendActivityRoomMessage({
  activityId,
  body,
  senderId,
}: {
  activityId: string;
  body: string;
  senderId: string;
}) {
  const normalizedBody = normalizeActivityRoomMessageBody(body);

  return prisma.$transaction(async (tx) => {
    const policy = await getActivityRoomPolicy(tx, senderId, activityId);

    if (!policy.canSend) {
      throw new ActivityRoomChatDomainError(
        getDeniedActivityRoomChatReason(policy),
      );
    }

    const message = await tx.activityRoomMessage.create({
      data: {
        activityId,
        body: normalizedBody,
        senderId,
      },
      select: messageSelect,
    });

    return mapActivityRoomMessage(message, senderId);
  });
}

export async function deleteActivityRoomMessage({
  actorId,
  messageId,
}: {
  actorId: string;
  messageId: string;
}) {
  return prisma.$transaction(async (tx) => {
    const message = await tx.activityRoomMessage.findFirst({
      where: {
        id: messageId,
        deletedAt: null,
      },
      select: {
        activityId: true,
        senderId: true,
        activity: {
          select: {
            organizerId: true,
            coManagers: {
              where: {
                managerProfileId: actorId,
              },
              select: {
                id: true,
              },
              take: 1,
            },
          },
        },
      },
    });

    if (!message) {
      throw new ActivityRoomChatDomainError("MESSAGE_NOT_FOUND");
    }

    const canDelete =
      message.senderId === actorId ||
      message.activity.organizerId === actorId ||
      message.activity.coManagers.length > 0;

    if (!canDelete) {
      throw new ActivityRoomChatDomainError("DELETE_FORBIDDEN");
    }

    return tx.activityRoomMessage.update({
      where: {
        id: messageId,
      },
      data: {
        deletedAt: new Date(),
        deletedById: actorId,
      },
      select: {
        id: true,
        deletedAt: true,
      },
    });
  });
}
