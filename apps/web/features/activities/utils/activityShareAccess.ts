import { randomBytes } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export function generateActivityShareToken() {
  return randomBytes(24).toString("base64url");
}

export function getPrivateActivitySharePath({
  activityId,
  locale,
  shareToken,
}: {
  activityId: string;
  locale: string;
  shareToken: string;
}) {
  return `/${locale}/activities/${activityId}?access=${encodeURIComponent(shareToken)}`;
}

export async function ensurePrivateActivityShareToken(
  activityId: string,
  tx?: Prisma.TransactionClient,
) {
  const delegate = tx ?? prisma;
  const activity = await delegate.activity.findUnique({
    where: {
      id: activityId,
    },
    select: {
      id: true,
      shareEnabled: true,
      shareToken: true,
      visibility: true,
    },
  });

  if (!activity || activity.visibility !== "PRIVATE") {
    return null;
  }

  if (activity.shareEnabled && activity.shareToken) {
    return activity.shareToken;
  }

  const updated = await delegate.activity.update({
    where: {
      id: activity.id,
    },
    data: {
      shareEnabled: true,
      shareToken: activity.shareToken ?? generateActivityShareToken(),
    },
    select: {
      shareToken: true,
    },
  });

  return updated.shareToken;
}

export function buildPrivateActivityShareAccessWhere(
  accessToken: string | null | undefined,
): Prisma.ActivityWhereInput[] {
  if (!accessToken) {
    return [];
  }

  return [
    {
      AND: [
        { visibility: "PRIVATE" as const },
        { shareEnabled: true },
        { shareToken: accessToken },
      ],
    },
  ];
}

export function buildPrivateActivityFriendAccessWhere(
  friendIds: string[],
): Prisma.ActivityWhereInput[] {
  if (friendIds.length === 0) {
    return [];
  }

  return [
    {
      AND: [{ visibility: "PRIVATE" as const }, { organizerId: { in: friendIds } }],
    },
  ];
}
