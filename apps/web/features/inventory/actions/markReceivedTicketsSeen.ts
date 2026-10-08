"use server";

import { revalidatePath } from "next/cache";
import {
  getUnreadInventoryTicketGiftCount,
  getUnreadNotificationCount,
} from "@/features/notifications/queries/getNotifications";
import { invalidateUnreadBadgeCache } from "@/features/notifications/unreadBadgeRedisCache";
import { ensureCurrentUserProfile } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withLocale } from "@/lib/routes";

export async function markReceivedTicketsSeenAction(
  locale: string,
  pageOpenedAt: string,
) {
  const profile = await ensureCurrentUserProfile(locale, "/profile/bag");
  const viewedAt = new Date();
  const pageOpenedAtMs = Date.parse(pageOpenedAt);
  const receivedBefore = new Date(
    Number.isFinite(pageOpenedAtMs)
      ? Math.min(pageOpenedAtMs, viewedAt.getTime())
      : viewedAt.getTime(),
  );
  const [updatedItemCount, notifications] = await prisma.$transaction([
    prisma.$executeRaw`
      UPDATE "InventoryItem" AS item
      SET "bagSeenAt" = ${viewedAt}
      FROM "InventoryItemDefinition" AS definition
      WHERE item."definitionId" = definition."id"
        AND definition."kind" = 'EVENT_TICKET'
        AND item."ownerProfileId" = ${profile.id}
        AND item."bagSeenAt" IS NULL
        AND item."createdAt" <= ${receivedBefore}
        AND (item."giftedAt" IS NULL OR item."giftedAt" <= ${receivedBefore})
    `,
    prisma.notification.updateMany({
      where: {
        createdAt: { lte: receivedBefore },
        recipientId: profile.id,
        readAt: null,
        type: "INVENTORY_TICKET_RECEIVED",
      },
      data: { readAt: viewedAt },
    }),
  ]);

  if (updatedItemCount > 0 || notifications.count > 0) {
    await invalidateUnreadBadgeCache([profile.id]);
    revalidatePath(withLocale(locale, "/notifications"));
  }

  const [unreadInventoryTicketGiftCount, unreadNotificationCount] =
    await Promise.all([
      getUnreadInventoryTicketGiftCount(profile.id),
      getUnreadNotificationCount(profile.id),
    ]);

  return {
    unreadInventoryTicketGiftCount,
    unreadNotificationCount,
  };
}
