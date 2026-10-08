"use server";

import { revalidatePath } from "next/cache";
import { getUnreadNotificationCount } from "@/features/notifications/queries/getNotifications";
import { invalidateUnreadBadgeCache } from "@/features/notifications/unreadBadgeRedisCache";
import { ensureCurrentUserProfile } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withLocale } from "@/lib/routes";

export async function markReceivedTicketsSeenAction(locale: string) {
  const profile = await ensureCurrentUserProfile(locale, "/profile/bag");
  const result = await prisma.notification.updateMany({
    where: {
      recipientId: profile.id,
      readAt: null,
      type: "INVENTORY_TICKET_RECEIVED",
    },
    data: { readAt: new Date() },
  });

  if (result.count > 0) {
    await invalidateUnreadBadgeCache([profile.id]);
    revalidatePath(withLocale(locale, "/notifications"));
  }

  return {
    unreadNotificationCount: await getUnreadNotificationCount(profile.id),
  };
}
