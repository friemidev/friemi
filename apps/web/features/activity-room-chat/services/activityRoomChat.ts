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
import { getMutualFollowProfileIds } from "@/features/follow/queries/followRelations";
import { prisma } from "@/lib/prisma";

export const activityRoomMessageMaxLength = 500;
export const activityRoomMessageImageMaxCount = 4;
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
  | "TOO_MANY_IMAGES"
  | "INVALID_IMAGE_URL"
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
  imageUrls: string[];
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
  hasUnreadAnnouncement: boolean;
  id: string;
  isMuted: boolean;
  isPinned: boolean;
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
  isMuted: boolean;
  isPinned: boolean;
  unreadCount: number;
};

export type ActivityRoomUnreadStateViewModel = {
  hasUnreadAnnouncement: boolean;
  isMuted: boolean;
  unreadCount: number;
};

export type ActivityRoomManagementViewModel = {
  activityTitle: string;
  canCancelActivity: boolean;
  canEditActivity: boolean;
  checkInRoster: ActivityCheckInParticipantViewModel[];
  coManagerDashboard: ActivityCoManagerDashboardViewModel | null;
  contactableParticipants: ActivityContactableParticipantViewModel[];
  inviteCandidates: ActivityRoomInviteCandidateViewModel[];
  memberPreview: ActivityRoomMemberPreviewViewModel[];
  roomParticipants: ActivityRoomManagedParticipantViewModel[];
  requiresApproval: boolean;
};

export type ActivityRoomInviteCandidateViewModel = {
  id: string;
  avatarUrl: string | null;
  friendCode: string | null;
  nickname: string;
};

export type ActivityRoomMemberPreviewViewModel = {
  id: string;
  avatarUrl: string | null;
  checkInRequestedAt: string | null;
  checkedInAt: string | null;
  nickname: string;
  role: "ORGANIZER" | "PARTICIPANT";
  status: ParticipantStatus | null;
};

export type ActivityRoomManagedParticipantViewModel = {
  id: string;
  status: ParticipantStatus;
  user: {
    id: string;
    avatarUrl: string | null;
    nickname: string;
  };
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
  imageUrls: true,
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
      mutedAt: true,
      pinnedAt: true,
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

export function normalizeActivityRoomMessagePayload(
  body: string,
  imageUrls: string[] = [],
) {
  const normalizedBody = body.trim();
  const normalizedImageUrls = [
    ...new Set(imageUrls.map((url) => url.trim())),
  ].filter(Boolean);

  if (normalizedImageUrls.length > activityRoomMessageImageMaxCount) {
    throw new ActivityRoomChatDomainError("TOO_MANY_IMAGES");
  }

  for (const imageUrl of normalizedImageUrls) {
    try {
      const parsedUrl = new URL(imageUrl);
      if (parsedUrl.protocol !== "https:" && parsedUrl.protocol !== "http:") {
        throw new Error("INVALID_PROTOCOL");
      }
    } catch {
      throw new ActivityRoomChatDomainError("INVALID_IMAGE_URL");
    }
  }

  if (!normalizedBody && normalizedImageUrls.length === 0) {
    throw new ActivityRoomChatDomainError("EMPTY_BODY");
  }

  if (normalizedBody.length > activityRoomMessageMaxLength) {
    throw new ActivityRoomChatDomainError("BODY_TOO_LONG");
  }

  return { body: normalizedBody, imageUrls: normalizedImageUrls };
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
    imageUrls: isDeleted ? [] : message.imageUrls,
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

export function hasUnreadActivityAnnouncement({
  announcementReadAt,
  latestAnnouncement,
  viewerProfileId,
}: {
  announcementReadAt?: Date | null;
  latestAnnouncement?: {
    authorId: string;
    createdAt: Date;
  } | null;
  viewerProfileId?: string | null;
}) {
  return Boolean(
    latestAnnouncement &&
    latestAnnouncement.authorId !== viewerProfileId &&
    (!announcementReadAt ||
      announcementReadAt.getTime() < latestAnnouncement.createdAt.getTime()),
  );
}

function mapActivityRoomActivity(
  activity: ActivityRoomActivityForView,
  policy: ActivityRoomChatPolicy,
  options: {
    announcementReadAt?: Date | null;
    isMuted?: boolean;
    isPinned?: boolean;
    viewerProfileId?: string | null;
  } = {},
): ActivityRoomChatActivityViewModel {
  const canShowTitle = policy.canView || activity.visibility === "PUBLIC";
  const latestAnnouncement = policy.canView ? activity.announcements[0] : null;
  const hasUnreadAnnouncement = hasUnreadActivityAnnouncement({
    announcementReadAt: options.announcementReadAt,
    latestAnnouncement,
    viewerProfileId: options.viewerProfileId,
  });

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
    hasUnreadAnnouncement,
    id: activity.id,
    isMuted: Boolean(options.isMuted),
    isPinned: Boolean(options.isPinned),
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
  rooms: Array<{
    id: string;
    roomReadStates: Array<{ lastReadAt: Date }>;
  }>,
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
    isMuted: Boolean(room.roomReadStates[0]?.mutedAt),
    isPinned: Boolean(room.roomReadStates[0]?.pinnedAt),
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
      roomReadStates: {
        where: {
          profileId: viewerProfileId,
        },
        select: {
          announcementReadAt: true,
          mutedAt: true,
          pinnedAt: true,
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
    activity: mapActivityRoomActivity(activity, policy, {
      announcementReadAt: activity.roomReadStates[0]?.announcementReadAt,
      isMuted: Boolean(activity.roomReadStates[0]?.mutedAt),
      isPinned: Boolean(activity.roomReadStates[0]?.pinnedAt),
      viewerProfileId,
    }),
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

  if (!policy.canView) {
    return null;
  }

  const canManage = policy.role === "ORGANIZER" || policy.role === "CO_MANAGER";

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
      coManagers: {
        select: {
          managerProfileId: true,
        },
      },
      organizer: {
        select: {
          id: true,
          avatarUrl: true,
          nickname: true,
        },
      },
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
          checkInRequestedAt: true,
          checkedInAt: true,
          id: true,
          status: true,
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
  const coManagerProfileIds = new Set(
    activity.coManagers.map((coManager) => coManager.managerProfileId),
  );
  const contactableParticipants = activity.participants
    .filter(
      (participant) => participant.userProfile.id !== activity.organizerId,
    )
    .map((participant) => ({
      id: participant.userProfile.id,
      avatarUrl: participant.userProfile.avatarUrl,
      nickname: participant.userProfile.nickname,
    }));
  const roomParticipants = activity.participants
    .filter(
      (participant) =>
        participant.userProfile.id !== activity.organizerId &&
        !coManagerProfileIds.has(participant.userProfile.id) &&
        ["JOINED", "APPROVED", "PENDING"].includes(participant.status),
    )
    .map((participant) => ({
      id: participant.id,
      status: participant.status,
      user: {
        id: participant.userProfile.id,
        avatarUrl: participant.userProfile.avatarUrl,
        nickname: participant.userProfile.nickname,
      },
    }));
  const memberPreview: ActivityRoomMemberPreviewViewModel[] = [
    {
      id: activity.organizer.id,
      avatarUrl: activity.organizer.avatarUrl,
      checkInRequestedAt: null,
      checkedInAt: null,
      nickname: activity.organizer.nickname,
      role: "ORGANIZER",
      status: null,
    },
    ...activity.participants
      .filter(
        (participant) => participant.userProfile.id !== activity.organizerId,
      )
      .map((participant) => ({
        id: participant.userProfile.id,
        avatarUrl: participant.userProfile.avatarUrl,
        checkInRequestedAt:
          participant.checkInRequestedAt?.toISOString() ?? null,
        checkedInAt: participant.checkedInAt?.toISOString() ?? null,
        nickname: participant.userProfile.nickname,
        role: "PARTICIPANT" as const,
        status: participant.status,
      })),
  ];
  const activeOrPendingMemberIds = new Set([
    activity.organizerId,
    ...activity.participants.map((participant) => participant.userProfile.id),
  ]);
  const [coManagerDashboardResult, checkInRosterResult] =
    await Promise.allSettled([
      getActivityCoManagerDashboard(activity.id, viewerProfileId),
      getActivityCheckInRoster(activity.id, viewerProfileId),
    ]);
  const coManagerDashboard =
    coManagerDashboardResult.status === "fulfilled"
      ? coManagerDashboardResult.value
      : null;
  const checkInRoster =
    checkInRosterResult.status === "fulfilled" ? checkInRosterResult.value : [];

  if (coManagerDashboardResult.status === "rejected") {
    console.error(
      "Failed to load activity room co-manager dashboard",
      coManagerDashboardResult.reason,
    );
  }

  if (checkInRosterResult.status === "rejected") {
    console.error(
      "Failed to load activity room check-in roster",
      checkInRosterResult.reason,
    );
  }

  if (!canManage) {
    return {
      activityTitle: activity.title,
      canCancelActivity: false,
      canEditActivity: false,
      checkInRoster: [],
      coManagerDashboard: null,
      contactableParticipants: [],
      inviteCandidates: [],
      memberPreview,
      roomParticipants: [],
      requiresApproval: activity.requiresApproval,
    };
  }

  let inviteCandidates: ActivityRoomInviteCandidateViewModel[] = [];
  const mutualFollowIds = await getMutualFollowProfileIds(viewerProfileId);
  const availableInviteIds = mutualFollowIds.filter(
    (profileId) => !activeOrPendingMemberIds.has(profileId),
  );

  if (availableInviteIds.length > 0) {
    inviteCandidates = (
      await prisma.userProfile.findMany({
        where: {
          id: {
            in: availableInviteIds,
          },
          status: "ACTIVE",
        },
        orderBy: [{ nickname: "asc" }, { id: "asc" }],
        take: 40,
        select: {
          id: true,
          avatarUrl: true,
          friendCode: true,
          nickname: true,
        },
      })
    ).map((profile) => ({
      id: profile.id,
      avatarUrl: profile.avatarUrl,
      friendCode: profile.friendCode,
      nickname:
        profile.nickname.trim() ||
        (profile.friendCode ? `Friemi ${profile.friendCode}` : "Friemi"),
    }));
  }

  return {
    activityTitle: activity.title,
    canCancelActivity: !isCancelled && !isEnded,
    canEditActivity: !isCancelled && !isEnded,
    checkInRoster,
    coManagerDashboard,
    contactableParticipants,
    inviteCandidates,
    memberPreview,
    roomParticipants,
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
          mutedAt: true,
          pinnedAt: true,
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
      if (roomA.isPinned !== roomB.isPinned) {
        return roomA.isPinned ? -1 : 1;
      }

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
          mutedAt: true,
        },
        take: 1,
      },
    },
  });
  const unmutedRooms = rooms.filter((room) => !room.roomReadStates[0]?.mutedAt);
  const unreadCountByActivityId = await getActivityRoomUnreadCountMap(
    unmutedRooms,
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
  const state = await getActivityRoomUnreadState(viewerProfileId, activityId);

  return state.unreadCount;
}

export async function getActivityRoomUnreadState(
  viewerProfileId: string,
  activityId: string,
): Promise<ActivityRoomUnreadStateViewModel> {
  const policy = await getActivityRoomPolicy(
    prisma,
    viewerProfileId,
    activityId,
  );

  if (!policy.canView) {
    return {
      hasUnreadAnnouncement: false,
      isMuted: false,
      unreadCount: 0,
    };
  }

  const [latestAnnouncement, readState] = await Promise.all([
    prisma.activityAnnouncement.findFirst({
      where: {
        activityId,
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        authorId: true,
        createdAt: true,
      },
    }),
    prisma.activityRoomReadState.findUnique({
      where: {
        activityId_profileId: {
          activityId,
          profileId: viewerProfileId,
        },
      },
      select: {
        announcementReadAt: true,
        lastReadAt: true,
        mutedAt: true,
      },
    }),
  ]);

  const unreadCount = await prisma.activityRoomMessage.count({
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

  return {
    hasUnreadAnnouncement: hasUnreadActivityAnnouncement({
      announcementReadAt: readState?.announcementReadAt,
      latestAnnouncement,
      viewerProfileId,
    }),
    isMuted: Boolean(readState?.mutedAt),
    unreadCount,
  };
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
  imageUrls = [],
  senderId,
}: {
  activityId: string;
  body: string;
  imageUrls?: string[];
  senderId: string;
}) {
  const payload = normalizeActivityRoomMessagePayload(body, imageUrls);

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
        body: payload.body,
        imageUrls: payload.imageUrls,
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

export async function deleteActivityRoomMessages({
  activityId,
  actorId,
  messageIds,
}: {
  activityId: string;
  actorId: string;
  messageIds: string[];
}) {
  const uniqueMessageIds = [...new Set(messageIds)];

  if (uniqueMessageIds.length === 0) {
    throw new ActivityRoomChatDomainError("MESSAGE_NOT_FOUND");
  }

  return prisma.$transaction(async (tx) => {
    const messages = await tx.activityRoomMessage.findMany({
      where: {
        activityId,
        deletedAt: null,
        id: {
          in: uniqueMessageIds,
        },
      },
      select: {
        id: true,
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

    if (messages.length !== uniqueMessageIds.length) {
      throw new ActivityRoomChatDomainError("MESSAGE_NOT_FOUND");
    }

    const hasForbiddenMessage = messages.some(
      (message) =>
        !canDeleteActivityRoomMessage({
          actorId,
          isCoManager: message.activity.coManagers.length > 0,
          isOrganizer: message.activity.organizerId === actorId,
          senderId: message.senderId,
        }),
    );

    if (hasForbiddenMessage) {
      throw new ActivityRoomChatDomainError("DELETE_FORBIDDEN");
    }

    const result = await tx.activityRoomMessage.updateMany({
      where: {
        activityId,
        deletedAt: null,
        id: {
          in: uniqueMessageIds,
        },
      },
      data: {
        deletedAt: new Date(),
        deletedById: actorId,
      },
    });

    if (result.count !== uniqueMessageIds.length) {
      throw new ActivityRoomChatDomainError("MESSAGE_NOT_FOUND");
    }

    return result;
  });
}
