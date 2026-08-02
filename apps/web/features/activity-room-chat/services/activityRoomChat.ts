import type {
  ActivityCategory,
  ActivityStatus,
  ActivityType,
  ActivityVisibility,
  ParticipantStatus,
  Prisma,
} from "@prisma/client";
import type { ActivityContactableParticipantViewModel } from "@/features/activities/types";
import {
  getActivityCoManagerDashboard,
  type ActivityCoManagerDashboardViewModel,
} from "@/features/activities/queries/getActivityCoManagerDashboard";
import {
  getActivityCheckInRoster,
  type ActivityCheckInParticipantViewModel,
} from "@/features/activities/queries/getActivityCheckInRoster";
import { prisma } from "@/lib/prisma";

export const activityRoomMessageMaxLength = 500;
export const defaultActivityRoomMessageLimit = 50;
export const defaultActivityRoomRosterLimit = 80;
export const maxActivityRoomMessageLimit = 100;

type DbClient = typeof prisma | Prisma.TransactionClient;

export type ActivityRoomChatErrorCode =
  | "ACTIVITY_NOT_FOUND"
  | "PUBLIC_EVENT_UNAVAILABLE"
  | "NOT_ROOM_MEMBER"
  | "PENDING_APPROVAL"
  | "PARTICIPATION_UNAVAILABLE"
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
  isDeleted: boolean;
  isMine: boolean;
  sender: {
    id: string;
    avatarUrl: string | null;
    friendCode: string | null;
    nickname: string;
  };
};

export type ActivityRoomChatActivityViewModel = {
  announcements: ActivityRoomAnnouncementViewModel[];
  endAt: string | null;
  id: string;
  publicEventId: string | null;
  requiresApproval: boolean;
  startAt: string;
  status: ActivityStatus;
  title: string | null;
  type: ActivityType;
};

export type ActivityRoomAnnouncementViewModel = {
  id: string;
  authorName: string;
  content: string;
  createdAt: string;
  isByOrganizer: boolean;
};

export type ActivityRoomChatPageData = {
  activity: ActivityRoomChatActivityViewModel | null;
  messages: ActivityRoomMessageViewModel[];
  policy: ActivityRoomChatPolicy;
};

export type ActivityRoomChatRosterItemViewModel = {
  id: string;
  category: ActivityCategory;
  city: string;
  coverImageUrl: string | null;
  endAt: string | null;
  lastMessage: {
    id: string;
    body: string;
    createdAt: string;
    isMine: boolean;
    senderId: string;
    senderName: string;
  } | null;
  startAt: string;
  status: ActivityStatus;
  title: string;
  unreadCount: number;
};

export type ActivityRoomManagementViewModel = {
  activityTitle: string;
  canCancelActivity: boolean;
  canEditActivity: boolean;
  checkInRoster: ActivityCheckInParticipantViewModel[];
  coManagerDashboard: ActivityCoManagerDashboardViewModel | null;
  contactableParticipants: ActivityContactableParticipantViewModel[];
  requiresApproval: boolean;
};

type ResolveActivityRoomChatPolicyInput = {
  activityType?: ActivityType | null;
  endAt?: Date | null;
  isCoManager?: boolean;
  isOrganizer?: boolean;
  now?: Date;
  participantStatus?: ParticipantStatus | null;
  status?: ActivityStatus | null;
};

const roomParticipantStatuses: ParticipantStatus[] = ["JOINED", "APPROVED"];
const visibleActivityRoomStatuses: ActivityStatus[] = [
  "RECRUITING",
  "CONFIRMED",
];

const messageSelect = {
  id: true,
  body: true,
  createdAt: true,
  deletedAt: true,
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

const activityRoomPageSelect = {
  id: true,
  endAt: true,
  organizerId: true,
  publicEventId: true,
  requiresApproval: true,
  startAt: true,
  status: true,
  title: true,
  type: true,
  visibility: true,
  announcements: {
    orderBy: {
      createdAt: "desc",
    },
    take: 5,
    select: {
      id: true,
      authorId: true,
      content: true,
      createdAt: true,
      author: {
        select: {
          friendCode: true,
          nickname: true,
        },
      },
    },
  },
} satisfies Prisma.ActivitySelect;

const activityRoomRosterSelect = {
  id: true,
  category: true,
  city: true,
  coverImageUrl: true,
  endAt: true,
  publicEvent: {
    select: {
      coverImageUrl: true,
    },
  },
  startAt: true,
  status: true,
  title: true,
  roomMessages: {
    where: {
      deletedAt: null,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 1,
    select: {
      id: true,
      body: true,
      createdAt: true,
      senderId: true,
      sender: {
        select: {
          friendCode: true,
          nickname: true,
        },
      },
    },
  },
  roomReadStates: {
    select: {
      lastReadAt: true,
    },
    take: 1,
  },
} satisfies Prisma.ActivitySelect;

type ActivityRoomActivityForView = {
  announcements: {
    id: string;
    authorId: string;
    author: {
      friendCode: string | null;
      nickname: string;
    };
    content: string;
    createdAt: Date;
  }[];
  endAt: Date | null;
  id: string;
  organizerId: string;
  publicEventId: string | null;
  requiresApproval: boolean;
  startAt: Date;
  status: ActivityStatus;
  title: string;
  type: ActivityType;
  visibility: ActivityVisibility;
};

type ActivityRoomRosterResult = Prisma.ActivityGetPayload<{
  select: typeof activityRoomRosterSelect;
}>;

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
    if (participantStatus === "PENDING") {
      return {
        canSend: false,
        canView: false,
        reason: "PENDING_APPROVAL",
        role,
      };
    }

    if (participantStatus === "REJECTED" || participantStatus === "CANCELLED") {
      return {
        canSend: false,
        canView: false,
        reason: "PARTICIPATION_UNAVAILABLE",
        role,
      };
    }

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
  const isDeleted = Boolean(message.deletedAt);

  return {
    id: message.id,
    body: isDeleted ? "" : message.body,
    createdAt: message.createdAt.toISOString(),
    isDeleted,
    isMine: message.senderId === viewerProfileId,
    sender: {
      id: message.sender.id,
      avatarUrl: message.sender.avatarUrl,
      friendCode: message.sender.friendCode,
      nickname:
        message.sender.nickname.trim() || message.sender.friendCode || "Friemi",
    },
  };
}

function mapActivityRoomActivity(
  activity: ActivityRoomActivityForView,
  policy: ActivityRoomChatPolicy,
): ActivityRoomChatActivityViewModel {
  const canShowTitle = policy.canView || activity.visibility === "PUBLIC";

  return {
    announcements: policy.canView
      ? activity.announcements.map((announcement) => ({
          id: announcement.id,
          authorName:
            announcement.author.nickname.trim() ||
            announcement.author.friendCode ||
            "Friemi",
          content: announcement.content,
          createdAt: announcement.createdAt.toISOString(),
          isByOrganizer: announcement.authorId === activity.organizerId,
        }))
      : [],
    endAt: activity.endAt?.toISOString() ?? null,
    id: activity.id,
    publicEventId: activity.publicEventId,
    requiresApproval: activity.requiresApproval,
    startAt: activity.startAt.toISOString(),
    status: activity.status,
    title: canShowTitle ? activity.title : null,
    type: activity.type,
  };
}

function getActivityRoomAccessWhere(
  profileId: string,
): Prisma.ActivityWhereInput {
  return {
    status: {
      in: visibleActivityRoomStatuses,
    },
    type: {
      not: "PUBLIC_EVENT",
    },
    OR: [
      {
        organizerId: profileId,
      },
      {
        coManagers: {
          some: {
            managerProfileId: profileId,
          },
        },
      },
      {
        participants: {
          some: {
            status: {
              in: roomParticipantStatuses,
            },
            userProfileId: profileId,
          },
        },
      },
    ],
  };
}

async function getActivityRoomUnreadCountMap(
  rooms: Array<Pick<ActivityRoomRosterResult, "id" | "roomReadStates">>,
  viewerProfileId: string,
) {
  if (rooms.length === 0) {
    return new Map<string, number>();
  }

  const unreadWhere = rooms.map((room) => {
    const lastReadAt = room.roomReadStates[0]?.lastReadAt ?? null;

    return {
      activityId: room.id,
      deletedAt: null,
      senderId: {
        not: viewerProfileId,
      },
      ...(lastReadAt
        ? {
            createdAt: {
              gt: lastReadAt,
            },
          }
        : {}),
    } satisfies Prisma.ActivityRoomMessageWhereInput;
  });

  const groups = await prisma.activityRoomMessage.groupBy({
    by: ["activityId"],
    where: {
      OR: unreadWhere,
    },
    _count: {
      _all: true,
    },
  });

  return new Map(groups.map((group) => [group.activityId, group._count._all]));
}

function mapActivityRoomRosterItem(
  room: ActivityRoomRosterResult,
  viewerProfileId: string,
  unreadCount: number,
): ActivityRoomChatRosterItemViewModel {
  const lastMessage = room.roomMessages[0] ?? null;

  return {
    id: room.id,
    category: room.category,
    city: room.city,
    coverImageUrl:
      room.coverImageUrl ?? room.publicEvent?.coverImageUrl ?? null,
    endAt: room.endAt?.toISOString() ?? null,
    lastMessage: lastMessage
      ? {
          id: lastMessage.id,
          body: lastMessage.body,
          createdAt: lastMessage.createdAt.toISOString(),
          isMine: lastMessage.senderId === viewerProfileId,
          senderId: lastMessage.senderId,
          senderName:
            lastMessage.sender.nickname.trim() ||
            lastMessage.sender.friendCode ||
            "Friemi",
        }
      : null,
    startAt: room.startAt.toISOString(),
    status: room.status,
    title: room.title,
    unreadCount,
  };
}

export function canDeleteActivityRoomMessage({
  actorId,
  isCoManager = false,
  isOrganizer = false,
  senderId,
}: {
  actorId: string;
  isCoManager?: boolean;
  isOrganizer?: boolean;
  senderId: string;
}) {
  return actorId === senderId || isOrganizer || isCoManager;
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

export async function getActivityRoomChatPageData({
  activityId,
  limit = defaultActivityRoomMessageLimit,
  now = new Date(),
  viewerProfileId,
}: {
  activityId: string;
  limit?: number;
  now?: Date;
  viewerProfileId: string;
}): Promise<ActivityRoomChatPageData> {
  const activity = await prisma.activity.findUnique({
    where: {
      id: activityId,
    },
    select: {
      ...activityRoomPageSelect,
      coManagers: {
        where: {
          managerProfileId: viewerProfileId,
        },
        select: {
          id: true,
        },
        take: 1,
      },
      participants: {
        where: {
          userProfileId: viewerProfileId,
        },
        select: {
          status: true,
        },
        take: 1,
      },
    },
  });

  const policy = resolveActivityRoomChatPolicy({
    activityType: activity?.type ?? null,
    endAt: activity?.endAt ?? null,
    isCoManager: Boolean(activity?.coManagers.length),
    isOrganizer: activity?.organizerId === viewerProfileId,
    now,
    participantStatus: activity?.participants[0]?.status ?? null,
    status: activity?.status ?? null,
  });

  if (!activity) {
    return {
      activity: null,
      messages: [],
      policy,
    };
  }

  const messages = policy.canView
    ? await prisma.activityRoomMessage.findMany({
        where: {
          activityId,
        },
        orderBy: {
          createdAt: "desc",
        },
        take: normalizeActivityRoomMessageLimit(limit),
        select: messageSelect,
      })
    : [];

  return {
    activity: mapActivityRoomActivity(activity, policy),
    messages: [...messages]
      .reverse()
      .map((message) => mapActivityRoomMessage(message, viewerProfileId)),
    policy,
  };
}

export async function getActivityRoomManagementData({
  activityId,
  now = new Date(),
  viewerProfileId,
}: {
  activityId: string;
  now?: Date;
  viewerProfileId: string;
}): Promise<ActivityRoomManagementViewModel | null> {
  const policy = await getActivityRoomPolicy(
    prisma,
    viewerProfileId,
    activityId,
    now,
  );

  if (policy.role !== "ORGANIZER" && policy.role !== "CO_MANAGER") {
    return null;
  }

  const activity = await prisma.activity.findUnique({
    where: {
      id: activityId,
    },
    select: {
      id: true,
      endAt: true,
      organizerId: true,
      requiresApproval: true,
      status: true,
      title: true,
      participants: {
        where: {
          status: {
            in: ["JOINED", "APPROVED", "PENDING"],
          },
        },
        orderBy: {
          joinedAt: "asc",
        },
        select: {
          userProfile: {
            select: {
              id: true,
              avatarUrl: true,
              nickname: true,
            },
          },
        },
      },
    },
  });

  if (!activity) {
    return null;
  }

  const isEnded =
    activity.status === "ENDED" ||
    Boolean(activity.endAt && activity.endAt.getTime() <= now.getTime());
  const isCancelled = activity.status === "CANCELLED";
  const contactableParticipants = activity.participants
    .filter(
      (participant) => participant.userProfile.id !== activity.organizerId,
    )
    .map((participant) => ({
      id: participant.userProfile.id,
      avatarUrl: participant.userProfile.avatarUrl,
      nickname: participant.userProfile.nickname,
    }));
  const [coManagerDashboard, checkInRoster] = await Promise.all([
    getActivityCoManagerDashboard(activity.id, viewerProfileId),
    getActivityCheckInRoster(activity.id, viewerProfileId),
  ]);

  return {
    activityTitle: activity.title,
    canCancelActivity: !isCancelled && !isEnded,
    canEditActivity: !isCancelled && !isEnded,
    checkInRoster,
    coManagerDashboard,
    contactableParticipants,
    requiresApproval: activity.requiresApproval,
  };
}

export async function getActivityRoomChatRoster(
  viewerProfileId: string,
  limit = defaultActivityRoomRosterLimit,
) {
  const rooms = await prisma.activity.findMany({
    where: getActivityRoomAccessWhere(viewerProfileId),
    orderBy: [
      {
        startAt: "desc",
      },
      {
        id: "asc",
      },
    ],
    take: Math.max(1, Math.min(100, Math.floor(limit))),
    select: {
      ...activityRoomRosterSelect,
      roomReadStates: {
        where: {
          profileId: viewerProfileId,
        },
        select: {
          lastReadAt: true,
        },
        take: 1,
      },
    },
  });
  const unreadCountByActivityId = await getActivityRoomUnreadCountMap(
    rooms,
    viewerProfileId,
  );

  return rooms
    .map((room) =>
      mapActivityRoomRosterItem(
        room,
        viewerProfileId,
        unreadCountByActivityId.get(room.id) ?? 0,
      ),
    )
    .sort((roomA, roomB) => {
      const timeA = new Date(
        roomA.lastMessage?.createdAt ?? roomA.startAt,
      ).getTime();
      const timeB = new Date(
        roomB.lastMessage?.createdAt ?? roomB.startAt,
      ).getTime();

      return timeB - timeA || roomA.id.localeCompare(roomB.id);
    });
}

export async function getUnreadActivityRoomTotalMessageCount(
  viewerProfileId: string,
) {
  const rooms = await prisma.activity.findMany({
    where: getActivityRoomAccessWhere(viewerProfileId),
    orderBy: [
      {
        startAt: "desc",
      },
      {
        id: "asc",
      },
    ],
    take: 100,
    select: {
      id: true,
      roomReadStates: {
        where: {
          profileId: viewerProfileId,
        },
        select: {
          lastReadAt: true,
        },
        take: 1,
      },
    },
  });
  const unreadCountByActivityId = await getActivityRoomUnreadCountMap(
    rooms,
    viewerProfileId,
  );

  return [...unreadCountByActivityId.values()].reduce(
    (total, unreadCount) => total + unreadCount,
    0,
  );
}

export async function getUnreadActivityRoomMessageCount(
  viewerProfileId: string,
  activityId: string,
) {
  const policy = await getActivityRoomPolicy(
    prisma,
    viewerProfileId,
    activityId,
  );

  if (!policy.canView) {
    return 0;
  }

  const readState = await prisma.activityRoomReadState.findUnique({
    where: {
      activityId_profileId: {
        activityId,
        profileId: viewerProfileId,
      },
    },
    select: {
      lastReadAt: true,
    },
  });

  return prisma.activityRoomMessage.count({
    where: {
      activityId,
      deletedAt: null,
      senderId: {
        not: viewerProfileId,
      },
      ...(readState?.lastReadAt
        ? {
            createdAt: {
              gt: readState.lastReadAt,
            },
          }
        : {}),
    },
  });
}

export async function markActivityRoomChatRead({
  activityId,
  profileId,
  readAt = new Date(),
}: {
  activityId: string;
  profileId: string;
  readAt?: Date;
}) {
  return prisma.activityRoomReadState.upsert({
    where: {
      activityId_profileId: {
        activityId,
        profileId,
      },
    },
    create: {
      activityId,
      lastReadAt: readAt,
      profileId,
    },
    update: {
      lastReadAt: readAt,
    },
  });
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

    await tx.activityRoomReadState.upsert({
      where: {
        activityId_profileId: {
          activityId,
          profileId: senderId,
        },
      },
      create: {
        activityId,
        lastReadAt: message.createdAt,
        profileId: senderId,
      },
      update: {
        lastReadAt: message.createdAt,
      },
    });

    return mapActivityRoomMessage(message, senderId);
  });
}

export async function deleteActivityRoomMessage({
  activityId,
  actorId,
  messageId,
}: {
  activityId?: string;
  actorId: string;
  messageId: string;
}) {
  return prisma.$transaction(async (tx) => {
    const message = await tx.activityRoomMessage.findFirst({
      where: {
        ...(activityId ? { activityId } : {}),
        deletedAt: null,
        id: messageId,
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

    const canDelete = canDeleteActivityRoomMessage({
      actorId,
      isCoManager: message.activity.coManagers.length > 0,
      isOrganizer: message.activity.organizerId === actorId,
      senderId: message.senderId,
    });

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
