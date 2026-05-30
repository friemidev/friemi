import {
  Bell,
  CalendarX2,
  CheckCheck,
  Clock3,
  ExternalLink,
  UserPlus,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import type { NotificationType } from "@prisma/client";
import { Button } from "@chill-club/ui";
import { formatActivityDate } from "@chill-club/shared";
import { PageContainer } from "@/components/layout/PageContainer";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  markAllNotificationsReadAction,
  markNotificationReadAction,
  openNotificationActivityAction,
} from "@/features/notifications/actions/markNotificationsRead";
import {
  getNotificationCenter,
  type NotificationViewModel,
} from "@/features/notifications/queries/getNotifications";
import { ensureCurrentUserProfile } from "@/lib/auth";
import { getCopy } from "@/lib/copy";
import { cn } from "@/lib/utils";

type NotificationsPageProps = {
  params: Promise<{
    locale: string;
  }>;
};

export const dynamic = "force-dynamic";

function getNotificationText(
  notification: NotificationViewModel,
  locale: string,
) {
  const t = getCopy(locale).notifications;
  const activityTitle = notification.activity?.title ?? t.fallbackActivity;
  const actorName = notification.actor?.nickname;

  if (notification.type === "FRIEND_REQUEST") {
    const copy = t.types.FRIEND_REQUEST;

    return {
      title: copy.title,
      body: copy.body(activityTitle, actorName),
    };
  }

  if (
    notification.type === "PARTICIPATION_PENDING" ||
    notification.type === "PARTICIPATION_APPROVED"
  ) {
    const copy = t.types[notification.type];

    return {
      title: copy.title,
      body: copy.body(activityTitle, actorName),
    };
  }

  if (notification.type === "PARTICIPATION_REJECTED") {
    const copy = t.types.PARTICIPATION_REJECTED;

    return {
      title: copy.title,
      body: copy.body(activityTitle, actorName),
    };
  }

  if (notification.type === "ACTIVITY_CANCELLED") {
    const copy = t.types.ACTIVITY_CANCELLED;

    return {
      title: copy.title,
      body: copy.body(activityTitle, actorName),
    };
  }

  if (notification.type === "ACTIVITY_UPDATED") {
    const copy = t.types.ACTIVITY_UPDATED;

    return {
      title: copy.title,
      body: copy.body(activityTitle, actorName),
    };
  }

  const copy = t.types[notification.type];

  return {
    title: copy.title,
    body: copy.body(activityTitle),
  };
}

function getNotificationActionLabel(
  notification: NotificationViewModel,
  locale: string,
) {
  const t = getCopy(locale).notifications;

  if (notification.type === "FRIEND_REQUEST") {
    return t.openMessages;
  }

  if (notification.type === "PARTICIPATION_PENDING" && notification.actor) {
    return t.openReview;
  }

  return t.openActivity;
}

function getNotificationVisual(
  type: NotificationType,
  isUnread: boolean,
): {
  icon: LucideIcon;
  iconClassName: string;
  cardClassName: string;
  statusClassName: string;
} {
  if (type === "PARTICIPATION_PENDING") {
    return {
      icon: Clock3,
      iconClassName: isUnread ? "bg-sky text-ink" : "bg-sky/40 text-zinc-600",
      cardClassName: isUnread
        ? "border-sky/80 bg-white"
        : "border-black/10 bg-white/65",
      statusClassName: isUnread
        ? "bg-sky/60 text-ink"
        : "bg-zinc-100 text-zinc-500",
    };
  }

  if (type === "FRIEND_REQUEST") {
    return {
      icon: UserPlus,
      iconClassName: isUnread
        ? "bg-ink text-white"
        : "bg-zinc-100 text-zinc-600",
      cardClassName: isUnread
        ? "border-black/15 bg-white"
        : "border-black/10 bg-white/65",
      statusClassName: isUnread
        ? "bg-ink text-white"
        : "bg-zinc-100 text-zinc-500",
    };
  }

  if (type === "ACTIVITY_UPDATED") {
    return {
      icon: Bell,
      iconClassName: isUnread ? "bg-sky text-ink" : "bg-sky/40 text-zinc-600",
      cardClassName: isUnread
        ? "border-sky/80 bg-white"
        : "border-black/10 bg-white/65",
      statusClassName: isUnread
        ? "bg-sky/60 text-ink"
        : "bg-zinc-100 text-zinc-500",
    };
  }

  if (type === "PARTICIPATION_REJECTED" || type === "ACTIVITY_CANCELLED") {
    return {
      icon: type === "ACTIVITY_CANCELLED" ? CalendarX2 : XCircle,
      iconClassName: isUnread ? "bg-clay text-white" : "bg-clay/10 text-clay",
      cardClassName: isUnread
        ? "border-clay/25 bg-white"
        : "border-black/10 bg-white/65",
      statusClassName: isUnread
        ? "bg-clay/10 text-clay"
        : "bg-zinc-100 text-zinc-500",
    };
  }

  return {
    icon: CheckCheck,
    iconClassName: isUnread ? "bg-moss text-white" : "bg-moss/10 text-moss",
    cardClassName: isUnread
      ? "border-moss/25 bg-white"
      : "border-black/10 bg-white/65",
    statusClassName: isUnread
      ? "bg-moss/10 text-moss"
      : "bg-zinc-100 text-zinc-500",
  };
}

export default async function NotificationsPage({
  params,
}: NotificationsPageProps) {
  const { locale } = await params;
  const profile = await ensureCurrentUserProfile(locale);
  const { notifications, unreadCount } = await getNotificationCenter(
    profile.id,
  );
  const t = getCopy(locale).notifications;

  return (
    <PageContainer className="space-y-6">
      <section className="flex flex-col gap-4 rounded-lg border border-black/10 bg-white/75 p-4 shadow-sm sm:flex-row sm:items-start sm:justify-between sm:p-5">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-semibold text-moss">
            <Bell className="h-4 w-4" />
            {unreadCount > 0 ? t.unreadCount(unreadCount) : t.allRead}
          </p>
          <h1 className="mt-3 text-2xl font-semibold tracking-normal text-ink sm:text-3xl">
            {t.title}
          </h1>
          <p className="mt-2 text-sm leading-6 text-zinc-600">
            {t.description}
          </p>
        </div>
        <form action={markAllNotificationsReadAction}>
          <input name="locale" type="hidden" value={locale} />
          <Button
            className="w-full gap-2 whitespace-nowrap sm:w-auto"
            disabled={unreadCount === 0}
            type="submit"
            variant="secondary"
          >
            <CheckCheck className="h-4 w-4" />
            {t.markAllRead}
          </Button>
        </form>
      </section>

      {notifications.length === 0 ? (
        <EmptyState title={t.emptyTitle} description={t.emptyDescription} />
      ) : (
        <section className="grid gap-3">
          {notifications.map((notification) => {
            const text = getNotificationText(notification, locale);
            const isUnread = notification.readAt === null;
            const visual = getNotificationVisual(notification.type, isUnread);
            const NotificationIcon = visual.icon;

            return (
              <article
                key={notification.id}
                className={cn(
                  "rounded-lg border p-4 shadow-sm transition sm:p-5",
                  visual.cardClassName,
                )}
              >
                <div className="flex gap-3">
                  <span
                    className={cn(
                      "mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                      visual.iconClassName,
                    )}
                  >
                    <NotificationIcon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p className="text-base font-semibold text-ink">
                          {text.title}
                        </p>
                        <p className="mt-1 text-sm leading-6 text-zinc-600">
                          {text.body}
                        </p>
                      </div>
                      <span className="shrink-0 whitespace-nowrap text-xs text-zinc-500">
                        {formatActivityDate(notification.createdAt, locale)}
                      </span>
                    </div>
                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <span
                        className={cn(
                          "inline-flex min-h-9 items-center rounded-full px-2.5 py-1 text-xs font-medium sm:min-h-0",
                          visual.statusClassName,
                        )}
                      >
                        {isUnread ? t.unread : t.read}
                      </span>
                      {isUnread ? (
                        <form action={markNotificationReadAction}>
                          <input name="locale" type="hidden" value={locale} />
                          <input
                            name="notificationId"
                            type="hidden"
                            value={notification.id}
                          />
                          <button
                            className="inline-flex min-h-10 items-center gap-1 whitespace-nowrap rounded-md bg-white px-3 text-xs font-medium text-zinc-600 ring-1 ring-black/10 transition hover:bg-zinc-50 hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300 sm:min-h-8"
                            type="submit"
                          >
                            <CheckCheck className="h-3.5 w-3.5" />
                            {t.markOneRead}
                          </button>
                        </form>
                      ) : null}
                      {notification.activity ||
                      notification.type === "FRIEND_REQUEST" ? (
                        <form action={openNotificationActivityAction}>
                          <input name="locale" type="hidden" value={locale} />
                          <input
                            name="notificationId"
                            type="hidden"
                            value={notification.id}
                          />
                          <button
                            className="inline-flex min-h-10 items-center gap-1 whitespace-nowrap rounded-md bg-white px-3 text-xs font-medium text-ink ring-1 ring-black/10 transition hover:bg-zinc-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300 sm:min-h-8"
                            type="submit"
                          >
                            {getNotificationActionLabel(
                              notification,
                              locale,
                            )}
                            <ExternalLink className="h-3.5 w-3.5" />
                          </button>
                        </form>
                      ) : null}
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      )}
    </PageContainer>
  );
}
