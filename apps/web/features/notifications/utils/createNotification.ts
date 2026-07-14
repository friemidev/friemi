import type { NotificationType, Prisma } from "@prisma/client";
import { after } from "next/server";
import { sendMobilePushForNotification } from "@/features/mobile/push/sendMobilePush";

type NotificationWriter = Pick<Prisma.TransactionClient, "notification">;

type CreateNotificationInput = {
  actorId?: string | null;
  activityId?: string | null;
  activityAnnouncementId?: string | null;
  dedupe?: boolean;
  recipientId: string;
  type: NotificationType;
};

function getNotificationIdentity(input: CreateNotificationInput) {
  return {
    actorId: input.actorId ?? null,
    activityId: input.activityId ?? null,
    activityAnnouncementId: input.activityAnnouncementId ?? null,
    recipientId: input.recipientId,
    type: input.type,
  };
}

export async function createNotification(
  tx: NotificationWriter,
  input: CreateNotificationInput,
) {
  const identity = getNotificationIdentity(input);
  const shouldDedupe = input.dedupe ?? true;

  if (shouldDedupe) {
    const existingUnread = await tx.notification.findFirst({
      where: {
        ...identity,
        readAt: null,
      },
      select: {
        id: true,
      },
    });

    if (existingUnread) {
      return null;
    }
  }

  const notification = await tx.notification.create({
    data: identity,
  });

  after(() =>
    sendMobilePushForNotification(notification.id).catch((error) => {
      console.error("Failed to dispatch mobile push notification", error);
    }),
  );

  return notification;
}

export async function createNotifications(
  tx: NotificationWriter,
  inputs: CreateNotificationInput[],
) {
  if (inputs.length === 0) {
    return { count: 0 };
  }

  let count = 0;

  for (const input of inputs) {
    const notification = await createNotification(tx, input);

    if (notification) {
      count += 1;
    }
  }

  return { count };
}
