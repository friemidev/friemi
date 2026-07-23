import type { NotificationType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const notificationCenterExcludedTypes = [
  "DIRECT_MESSAGE",
  "MOMENT_LIKED",
  "MOMENT_COMMENTED",
  "MOMENT_COMMENT_REPLY",
  "MOMENT_REPOSTED",
] satisfies NotificationType[];

export function getVisibleNotificationWhere(
  where: Prisma.NotificationWhereInput = {},
): Prisma.NotificationWhereInput {
  return {
    ...where,
    type: {
      notIn: notificationCenterExcludedTypes,
    },
  };
}

const notificationSelect = {
  id: true,
  type: true,
  readAt: true,
  createdAt: true,
  actor: {
    select: {
      id: true,
      nickname: true,
    },
  },
  activity: {
    select: {
      id: true,
      organizerId: true,
      title: true,
    },
  },
  activityAnnouncement: {
    select: {
      id: true,
      content: true,
      createdAt: true,
    },
  },
  moment: {
    select: {
      id: true,
      content: true,
    },
  },
  momentComment: {
    select: {
      id: true,
      content: true,
      createdAt: true,
    },
  },
} satisfies Prisma.NotificationSelect;

type NotificationQueryResult = Prisma.NotificationGetPayload<{
  select: typeof notificationSelect;
}>;

export type NotificationViewModel = {
  id: string;
  type: NotificationType;
  readAt: string | null;
  createdAt: string;
  friendRequestId: string | null;
  actorActivityRole: "ORGANIZER" | "CO_MANAGER" | null;
  actor: {
    id: string;
    nickname: string;
  } | null;
  activity: {
    id: string;
    title: string;
  } | null;
  activityAnnouncement: {
    id: string;
    content: string;
    createdAt: string;
  } | null;
  moment: {
    id: string;
    content: string | null;
  } | null;
  momentComment: {
    id: string;
    content: string;
    createdAt: string;
  } | null;
};

function mapNotification(
  notification: NotificationQueryResult,
  friendRequestId: string | null,
  actorActivityRole: NotificationViewModel["actorActivityRole"],
): NotificationViewModel {
  return {
    id: notification.id,
    type: notification.type,
    readAt: notification.readAt?.toISOString() ?? null,
    createdAt: notification.createdAt.toISOString(),
    friendRequestId,
    actorActivityRole,
    actor: notification.actor,
    activity: notification.activity
      ? {
          id: notification.activity.id,
          title: notification.activity.title,
        }
      : null,
    activityAnnouncement: notification.activityAnnouncement
      ? {
          id: notification.activityAnnouncement.id,
          content: notification.activityAnnouncement.content,
          createdAt: notification.activityAnnouncement.createdAt.toISOString(),
        }
      : null,
    moment: notification.moment
      ? {
          id: notification.moment.id,
          content: notification.moment.content,
        }
      : null,
    momentComment: notification.momentComment
      ? {
          id: notification.momentComment.id,
          content: notification.momentComment.content,
          createdAt: notification.momentComment.createdAt.toISOString(),
        }
      : null,
  };
}

export async function getUnreadNotificationCount(profileId: string) {
  return prisma.notification.count({
    where: getVisibleNotificationWhere({
      recipientId: profileId,
      readAt: null,
    }),
  });
}

export async function getNotificationCenter(profileId: string) {
  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: getVisibleNotificationWhere({
        recipientId: profileId,
      }),
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 50,
      select: notificationSelect,
    }),
    getUnreadNotificationCount(profileId),
  ]);

  const friendRequestActorIds = Array.from(
    new Set(
      notifications
        .filter(
          (notification) =>
            notification.type === "FRIEND_REQUEST" && notification.actor?.id,
        )
        .map((notification) => notification.actor!.id),
    ),
  );

  const pendingFriendRequests =
    friendRequestActorIds.length > 0
      ? await prisma.friendRequest.findMany({
          where: {
            receiverId: profileId,
            requesterId: {
              in: friendRequestActorIds,
            },
            status: "PENDING",
          },
          select: {
            id: true,
            requesterId: true,
          },
        })
      : [];

  const pendingFriendRequestIdByRequesterId = new Map(
    pendingFriendRequests.map((request) => [request.requesterId, request.id]),
  );
  const notificationActorActivityPairs = notifications
    .filter(
      (notification) => notification.actor?.id && notification.activity?.id,
    )
    .map((notification) => ({
      activityId: notification.activity!.id,
      actorId: notification.actor!.id,
    }));
  const coManagerRoles =
    notificationActorActivityPairs.length > 0
      ? await prisma.activityCoManager.findMany({
          where: {
            activityId: {
              in: Array.from(
                new Set(
                  notificationActorActivityPairs.map((pair) => pair.activityId),
                ),
              ),
            },
            managerProfileId: {
              in: Array.from(
                new Set(
                  notificationActorActivityPairs.map((pair) => pair.actorId),
                ),
              ),
            },
          },
          select: {
            activityId: true,
            managerProfileId: true,
          },
        })
      : [];
  const coManagerRoleKeys = new Set(
    coManagerRoles.map((role) => `${role.activityId}:${role.managerProfileId}`),
  );

  return {
    notifications: notifications.map((notification) => {
      const actorId = notification.actor?.id ?? null;
      const activityId = notification.activity?.id ?? null;
      const actorActivityRole =
        actorId && activityId && notification.activity?.organizerId === actorId
          ? "ORGANIZER"
          : actorId &&
              activityId &&
              coManagerRoleKeys.has(`${activityId}:${actorId}`)
            ? "CO_MANAGER"
            : null;

      return mapNotification(
        notification,
        notification.type === "FRIEND_REQUEST" && notification.actor?.id
          ? (pendingFriendRequestIdByRequesterId.get(notification.actor.id) ??
              null)
          : null,
        actorActivityRole,
      );
    }),
    unreadCount,
  };
}
