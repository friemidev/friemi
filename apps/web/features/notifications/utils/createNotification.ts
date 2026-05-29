import type { NotificationType, Prisma } from "@prisma/client";

type CreateNotificationInput = {
  actorId?: string | null;
  activityId?: string | null;
  recipientId: string;
  type: NotificationType;
};

export function createNotification(
  tx: Prisma.TransactionClient,
  input: CreateNotificationInput,
) {
  return tx.notification.create({
    data: {
      actorId: input.actorId ?? null,
      activityId: input.activityId ?? null,
      recipientId: input.recipientId,
      type: input.type,
    },
  });
}

export function createNotifications(
  tx: Prisma.TransactionClient,
  inputs: CreateNotificationInput[],
) {
  if (inputs.length === 0) {
    return Promise.resolve({ count: 0 });
  }

  return tx.notification.createMany({
    data: inputs.map((input) => ({
      actorId: input.actorId ?? null,
      activityId: input.activityId ?? null,
      recipientId: input.recipientId,
      type: input.type,
    })),
  });
}
