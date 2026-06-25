import type { NotificationType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

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
      title: true,
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
  actor: {
    id: string;
    nickname: string;
  } | null;
  activity: {
    id: string;
    title: string;
  } | null;
};

function mapNotification(
  notification: NotificationQueryResult,
  friendRequestId: string | null,
): NotificationViewModel {
  return {
    id: notification.id,
    type: notification.type,
    readAt: notification.readAt?.toISOString() ?? null,
    createdAt: notification.createdAt.toISOString(),
    friendRequestId,
    actor: notification.actor,
    activity: notification.activity,
  };
}

export async function getUnreadNotificationCount(profileId: string) {
  return prisma.notification.count({
    where: {
      recipientId: profileId,
      readAt: null,
    },
  });
}

export async function getNotificationCenter(profileId: string) {
  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: {
        recipientId: profileId,
      },
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

  return {
    notifications: notifications.map((notification) =>
      mapNotification(
        notification,
        notification.type === "FRIEND_REQUEST" && notification.actor?.id
          ? pendingFriendRequestIdByRequesterId.get(notification.actor.id) ?? null
          : null,
      ),
    ),
    unreadCount,
  };
}
