"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { normalizeAnalyticsLocale } from "@/features/analytics/events";
import { queueAnalyticsEvent } from "@/features/analytics/server";
import { ensureCurrentUserProfile } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withLocale } from "@/lib/routes";
import { getConversationPair } from "@/features/direct-messages/utils/conversation";

function getString(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" ? value : "";
}

function trackNotificationOpened({
  locale,
  notificationId,
  targetType,
  type,
  userProfileId,
}: {
  locale: string;
  notificationId: string;
  targetType:
    | "activity"
    | "admin_reports"
    | "messages"
    | "notifications"
    | "profile";
  type: string;
  userProfileId: string;
}) {
  queueAnalyticsEvent(
    {
      locale: normalizeAnalyticsLocale(locale),
      name: "notification_opened",
      route: `/${locale}/notifications`,
      entityId: notificationId,
      entityType: "notification",
      sourceSurface: "notification",
      properties: {
        notification_type: type,
        target_type: targetType,
      },
    },
    {
      userProfileId,
    },
  );
}

export async function markAllNotificationsReadAction(formData: FormData) {
  const locale = getString(formData, "locale") || "zh-CN";
  const profile = await ensureCurrentUserProfile(locale, "/notifications");

  await prisma.notification.updateMany({
    where: {
      recipientId: profile.id,
      readAt: null,
    },
    data: {
      readAt: new Date(),
    },
  });

  revalidatePath(withLocale(locale, "/notifications"));
  redirect(withLocale(locale, "/notifications"));
}

export async function markNotificationReadAction(formData: FormData) {
  const locale = getString(formData, "locale") || "zh-CN";
  const notificationId = getString(formData, "notificationId");
  const profile = await ensureCurrentUserProfile(locale, "/notifications");

  if (notificationId) {
    await prisma.notification.updateMany({
      where: {
        id: notificationId,
        recipientId: profile.id,
        readAt: null,
      },
      data: {
        readAt: new Date(),
      },
    });
  }

  revalidatePath(withLocale(locale, "/notifications"));
  redirect(withLocale(locale, "/notifications"));
}

export async function deleteNotificationAction(formData: FormData) {
  const locale = getString(formData, "locale") || "zh-CN";
  const notificationId = getString(formData, "notificationId");
  const profile = await ensureCurrentUserProfile(locale, "/notifications");

  if (notificationId) {
    await prisma.notification.deleteMany({
      where: {
        id: notificationId,
        recipientId: profile.id,
      },
    });
  }

  revalidatePath(withLocale(locale, "/notifications"));
  redirect(withLocale(locale, "/notifications"));
}

export async function deleteNotificationClientAction(
  locale: string,
  notificationId: string,
) {
  const normalizedLocale = locale || "zh-CN";
  const profile = await ensureCurrentUserProfile(
    normalizedLocale,
    "/notifications",
  );

  if (notificationId) {
    await prisma.notification.deleteMany({
      where: {
        id: notificationId,
        recipientId: profile.id,
      },
    });
  }

  revalidatePath(withLocale(normalizedLocale, "/notifications"));

  return { ok: true as const };
}

export async function markNotificationReadClientAction(
  locale: string,
  notificationId: string,
) {
  const normalizedLocale = locale || "zh-CN";
  const profile = await ensureCurrentUserProfile(
    normalizedLocale,
    "/notifications",
  );

  if (notificationId) {
    await prisma.notification.updateMany({
      where: {
        id: notificationId,
        recipientId: profile.id,
        readAt: null,
      },
      data: {
        readAt: new Date(),
      },
    });
  }

  revalidatePath(withLocale(normalizedLocale, "/notifications"));

  return { ok: true as const };
}

export async function markAllNotificationsReadClientAction(locale: string) {
  const normalizedLocale = locale || "zh-CN";
  const profile = await ensureCurrentUserProfile(
    normalizedLocale,
    "/notifications",
  );

  await prisma.notification.updateMany({
    where: {
      recipientId: profile.id,
      readAt: null,
    },
    data: {
      readAt: new Date(),
    },
  });

  revalidatePath(withLocale(normalizedLocale, "/notifications"));

  return { ok: true as const };
}

export async function deleteReadNotificationsAction(formData: FormData) {
  const locale = getString(formData, "locale") || "zh-CN";
  const profile = await ensureCurrentUserProfile(locale, "/notifications");

  await prisma.notification.deleteMany({
    where: {
      recipientId: profile.id,
      readAt: {
        not: null,
      },
    },
  });

  revalidatePath(withLocale(locale, "/notifications"));
  redirect(withLocale(locale, "/notifications"));
}

export async function deleteReadNotificationsClientAction(locale: string) {
  const normalizedLocale = locale || "zh-CN";
  const profile = await ensureCurrentUserProfile(
    normalizedLocale,
    "/notifications",
  );

  await prisma.notification.deleteMany({
    where: {
      recipientId: profile.id,
      readAt: {
        not: null,
      },
    },
  });

  revalidatePath(withLocale(normalizedLocale, "/notifications"));

  return { ok: true as const };
}

export async function openNotificationActivityAction(formData: FormData) {
  const locale = getString(formData, "locale") || "zh-CN";
  const notificationId = getString(formData, "notificationId");
  const profile = await ensureCurrentUserProfile(locale, "/notifications");
  const notification = await prisma.notification.findFirst({
    where: {
      id: notificationId,
      recipientId: profile.id,
    },
    select: {
      actorId: true,
      activityId: true,
      type: true,
    },
  });

  if (notification?.type === "FRIEND_REQUEST") {
    await prisma.notification.updateMany({
      where: {
        id: notificationId,
        recipientId: profile.id,
        readAt: null,
      },
      data: {
        readAt: new Date(),
      },
    });

    revalidatePath(withLocale(locale, "/notifications"));
    if (notification.actorId) {
      revalidatePath(withLocale(locale, `/profile/${notification.actorId}`));
    }
    trackNotificationOpened({
      locale,
      notificationId,
      targetType: "profile",
      type: notification.type,
      userProfileId: profile.id,
    });
    redirect(
      withLocale(
        locale,
        notification.actorId ? `/profile/${notification.actorId}` : "/notifications",
      ),
    );
  }

  if (notification?.type === "REPORT_CREATED") {
    await prisma.notification.updateMany({
      where: {
        id: notificationId,
        recipientId: profile.id,
        readAt: null,
      },
      data: {
        readAt: new Date(),
      },
    });

    revalidatePath(withLocale(locale, "/notifications"));
    revalidatePath(withLocale(locale, "/admin/reports"));
    trackNotificationOpened({
      locale,
      notificationId,
      targetType: "admin_reports",
      type: notification.type,
      userProfileId: profile.id,
    });
    redirect(withLocale(locale, "/admin/reports"));
  }

  if (notification?.type === "DIRECT_MESSAGE" && notification.actorId) {
    const conversation = await prisma.conversation.findUnique({
      where: {
        userAId_userBId: getConversationPair(profile.id, notification.actorId),
      },
      select: {
        id: true,
      },
    });

    await prisma.notification.updateMany({
      where: {
        id: notificationId,
        recipientId: profile.id,
        readAt: null,
      },
      data: {
        readAt: new Date(),
      },
    });

    revalidatePath(withLocale(locale, "/notifications"));
    if (conversation?.id) {
      revalidatePath(withLocale(locale, `/messages/${conversation.id}`));
    }
    revalidatePath(withLocale(locale, "/messages"));
    trackNotificationOpened({
      locale,
      notificationId,
      targetType: "messages",
      type: notification.type,
      userProfileId: profile.id,
    });

    const target = conversation?.id
      ? notification.activityId
        ? `/messages/${conversation.id}?activityId=${encodeURIComponent(notification.activityId)}`
        : `/messages/${conversation.id}`
      : "/messages";

    redirect(withLocale(locale, target));
  }

  if (!notification?.activityId) {
    if (notification) {
      trackNotificationOpened({
        locale,
        notificationId,
        targetType: "notifications",
        type: notification.type,
        userProfileId: profile.id,
      });
    }
    redirect(withLocale(locale, "/notifications"));
  }

  await prisma.notification.updateMany({
    where: {
      id: notificationId,
      recipientId: profile.id,
      readAt: null,
    },
    data: {
      readAt: new Date(),
    },
  });

  revalidatePath(withLocale(locale, "/notifications"));

  const target =
    notification.type === "PARTICIPATION_PENDING" && notification.actorId
      ? `/activities/${notification.activityId}#participation-approval`
      : notification.type === "ACTIVITY_COMMENTED" ||
          notification.type === "COMMENT_REPLY"
        ? `/activities/${notification.activityId}#comments`
      : `/activities/${notification.activityId}`;

  trackNotificationOpened({
    locale,
    notificationId,
    targetType: "activity",
    type: notification.type,
    userProfileId: profile.id,
  });
  redirect(withLocale(locale, target));
}
