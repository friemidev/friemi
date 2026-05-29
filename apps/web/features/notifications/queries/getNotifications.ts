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
): NotificationViewModel {
  return {
    id: notification.id,
    type: notification.type,
    readAt: notification.readAt?.toISOString() ?? null,
    createdAt: notification.createdAt.toISOString(),
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

  return {
    notifications: notifications.map(mapNotification),
    unreadCount,
  };
}
