"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ensureCurrentUserProfile } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withLocale } from "@/lib/routes";

function getString(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" ? value : "";
}

export async function markAllNotificationsReadAction(formData: FormData) {
  const locale = getString(formData, "locale") || "zh-CN";
  const profile = await ensureCurrentUserProfile(locale);

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
  revalidatePath(withLocale(locale, "/"), "layout");
  redirect(withLocale(locale, "/notifications"));
}

export async function markNotificationReadAction(formData: FormData) {
  const locale = getString(formData, "locale") || "zh-CN";
  const notificationId = getString(formData, "notificationId");
  const profile = await ensureCurrentUserProfile(locale);

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
  revalidatePath(withLocale(locale, "/"), "layout");
  redirect(withLocale(locale, "/notifications"));
}

export async function openNotificationActivityAction(formData: FormData) {
  const locale = getString(formData, "locale") || "zh-CN";
  const notificationId = getString(formData, "notificationId");
  const profile = await ensureCurrentUserProfile(locale);
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
    revalidatePath(withLocale(locale, "/messages"));
    revalidatePath(withLocale(locale, "/"), "layout");
    redirect(withLocale(locale, "/messages?friendRequests=1"));
  }

  if (!notification?.activityId) {
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
  revalidatePath(withLocale(locale, "/"), "layout");

  const target =
    notification.type === "PARTICIPATION_PENDING" && notification.actorId
      ? `/activities/${notification.activityId}#participation-approval`
      : `/activities/${notification.activityId}`;

  redirect(withLocale(locale, target));
}
