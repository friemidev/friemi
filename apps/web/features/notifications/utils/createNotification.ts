import type { NotificationType, Prisma } from "@prisma/client";

type CreateNotificationInput = {
  actorId?: string | null;
  activityId?: string | null;
  recipientId: string;
  type: NotificationType;
};

function getNotificationIdentity(input: CreateNotificationInput) {
  return {
    actorId: input.actorId ?? null,
    activityId: input.activityId ?? null,
    recipientId: input.recipientId,
    type: input.type,
  };
}

export async function createNotification(
  tx: Prisma.TransactionClient,
  input: CreateNotificationInput,
) {
  const identity = getNotificationIdentity(input);
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

  return tx.notification.create({
    data: identity,
  });
}

export async function createNotifications(
  tx: Prisma.TransactionClient,
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
