import {
  Bell,
  CalendarX2,
  CheckCheck,
  Clock3,
  ExternalLink,
  Flag,
  MessageCircle,
  UserMinus,
  UserPlus,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import type { NotificationType } from "@prisma/client";
import { Button } from "@chill-club/ui";
import { formatActivityDate } from "@chill-club/shared";
import Link from "next/link";
import { PageContainer } from "@/components/layout/PageContainer";
import { EmptyState } from "@/components/ui/EmptyState";
import { FriendRequestActionButtons } from "@/features/friends/components/FriendsDashboard";
import {
  markAllNotificationsReadAction,
  markNotificationReadAction,
  openNotificationActivityAction,
} from "@/features/notifications/actions/markNotificationsRead";
import {
  getNotificationCenter,
  type NotificationViewModel,
} from "@/features/notifications/queries/getNotifications";
import { NotificationCountHydrator } from "@/features/notifications/components/NotificationCountHydrator";
import { ensureCurrentUserProfile } from "@/lib/auth";
import { getCopy } from "@/lib/copy";
import { createPerformanceTracker } from "@/lib/performance";
import { withLocale } from "@/lib/routes";
import { cn } from "@/lib/utils";

type NotificationsPageProps = {
  params: Promise<{
    locale: string;
  }>;
};

export const dynamic = "force-dynamic";

type NotificationCategory =
  | "participation"
  | "social"
  | "comment"
  | "activity"
  | "report";

const notificationCategoryStyles: Record<NotificationCategory, string> = {
  participation: "bg-sky/45 text-ink ring-sky/80",
  social: "bg-ink text-white ring-ink",
  comment: "bg-moss/10 text-moss ring-moss/20",
  activity: "bg-coral-soft text-[#8a5c3d] ring-sand",
  report: "bg-clay/10 text-clay ring-clay/20",
};

function getNotificationCategory(
  type: NotificationType,
): NotificationCategory {
  if (
    type === "PARTICIPATION_PENDING" ||
    type === "PARTICIPATION_CONFIRMED" ||
    type === "PARTICIPATION_CANCELLED" ||
    type === "PARTICIPATION_APPROVED" ||
    type === "PARTICIPATION_REJECTED"
  ) {
    return "participation";
  }

  if (type === "FRIEND_REQUEST") {
    return "social";
  }

  if (type === "ACTIVITY_COMMENTED" || type === "COMMENT_REPLY") {
    return "comment";
  }

  if (type === "REPORT_CREATED") {
    return "report";
  }

  return "activity";
}

function needsUserAction(notification: NotificationViewModel) {
  if (notification.readAt !== null) {
    return false;
  }

  return (
    notification.type === "FRIEND_REQUEST" ||
    notification.type === "REPORT_CREATED" ||
    (notification.type === "PARTICIPATION_PENDING" && Boolean(notification.actor))
  );
}

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
    notification.type === "PARTICIPATION_CANCELLED" ||
    notification.type === "PARTICIPATION_APPROVED" ||
    notification.type === "ACTIVITY_COMMENTED" ||
    notification.type === "COMMENT_REPLY"
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

  if (notification.type === "REPORT_CREATED") {
    const copy = t.types.REPORT_CREATED;

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
    return t.openProfile;
  }

  if (notification.type === "REPORT_CREATED") {
    return t.openReports;
  }

  if (
    notification.type === "ACTIVITY_COMMENTED" ||
    notification.type === "COMMENT_REPLY"
  ) {
    return t.openComments;
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
} {
  if (type === "PARTICIPATION_PENDING") {
    return {
      icon: Clock3,
      iconClassName: isUnread ? "bg-sky text-ink" : "bg-sky/40 text-zinc-600",
      cardClassName: isUnread
        ? "border-sky/80 bg-white"
        : "border-black/10 bg-white/65",
    };
  }

  if (type === "PARTICIPATION_CANCELLED") {
    return {
      icon: UserMinus,
      iconClassName: isUnread
        ? "bg-[#f0e5d6] text-[#8a5c3d]"
        : "bg-[#f5efe6] text-[#8a6a40]",
      cardClassName: isUnread
        ? "border-[#e1cdb8] bg-white"
        : "border-black/10 bg-white/65",
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
    };
  }

  if (type === "ACTIVITY_UPDATED") {
    return {
      icon: Bell,
      iconClassName: isUnread ? "bg-sky text-ink" : "bg-sky/40 text-zinc-600",
      cardClassName: isUnread
        ? "border-sky/80 bg-white"
        : "border-black/10 bg-white/65",
    };
  }

  if (type === "ACTIVITY_COMMENTED" || type === "COMMENT_REPLY") {
    return {
      icon: MessageCircle,
      iconClassName: isUnread
        ? "bg-sky text-ink"
        : "bg-sky/40 text-zinc-600",
      cardClassName: isUnread
        ? "border-sky/80 bg-white"
        : "border-black/10 bg-white/65",
    };
  }

  if (type === "REPORT_CREATED") {
    return {
      icon: Flag,
      iconClassName: isUnread ? "bg-clay text-white" : "bg-clay/10 text-clay",
      cardClassName: isUnread
        ? "border-clay/25 bg-white"
        : "border-black/10 bg-white/65",
    };
  }

  if (type === "PARTICIPATION_REJECTED" || type === "ACTIVITY_CANCELLED") {
    return {
      icon: type === "ACTIVITY_CANCELLED" ? CalendarX2 : XCircle,
      iconClassName: isUnread ? "bg-clay text-white" : "bg-clay/10 text-clay",
      cardClassName: isUnread
        ? "border-clay/25 bg-white"
        : "border-black/10 bg-white/65",
    };
  }

  return {
    icon: CheckCheck,
    iconClassName: isUnread ? "bg-moss text-white" : "bg-moss/10 text-moss",
    cardClassName: isUnread
      ? "border-moss/25 bg-white"
      : "border-black/10 bg-white/65",
  };
}

function NotificationCard({
  locale,
  notification,
}: {
  locale: string;
  notification: NotificationViewModel;
}) {
  const t = getCopy(locale).notifications;
  const text = getNotificationText(notification, locale);
  const isUnread = notification.readAt === null;
  const visual = getNotificationVisual(notification.type, isUnread);
  const NotificationIcon = visual.icon;
  const category = getNotificationCategory(notification.type);
  const hasAction =
    (notification.type === "FRIEND_REQUEST"
      ? false
      : Boolean(notification.activity) || notification.type === "REPORT_CREATED");
  const canInlineResolveFriendRequest =
    notification.type === "FRIEND_REQUEST" &&
    Boolean(notification.friendRequestId);

  return (
    <article
      className={cn(
        "relative overflow-hidden rounded-lg border p-3 shadow-sm transition hover:shadow-md",
        visual.cardClassName,
      )}
    >
      {isUnread ? (
        <span
          aria-label={t.unread}
          className="absolute right-4 top-4 h-2.5 w-2.5 rounded-full bg-clay shadow-sm"
        />
      ) : null}

      <div className="flex gap-3">
        <span
          className={cn(
            "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full sm:h-8 sm:w-8",
            visual.iconClassName,
          )}
        >
          <NotificationIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-1 pr-5 sm:flex-row sm:items-start sm:justify-between sm:pr-0">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <span
                  className={cn(
                    "inline-flex h-5 items-center rounded-full px-2 text-[10px] font-semibold leading-none ring-1 sm:text-[11px]",
                    notificationCategoryStyles[category],
                  )}
                >
                  {t.categoryLabels[category]}
                </span>
                {isUnread ? (
                  <span className="inline-flex h-5 items-center rounded-full bg-clay/10 px-2 text-[10px] font-semibold leading-none text-clay ring-1 ring-clay/20 sm:text-[11px]">
                    {t.unread}
                  </span>
                ) : null}
              </div>

              <h2 className="mt-1.5 text-[15px] font-semibold leading-5 text-ink sm:text-base">
                {text.title}
              </h2>
              <p className="mt-0.5 text-sm leading-5 text-zinc-600">
                {text.body}
              </p>
            </div>

            <span className="shrink-0 whitespace-nowrap text-[11px] text-zinc-500 sm:text-xs">
              {formatActivityDate(notification.createdAt, locale)}
            </span>
          </div>

          {notification.actor || notification.activity ? (
            <dl className="mt-1.5 flex flex-wrap gap-1 text-[11px] text-zinc-600 sm:text-xs">
              {notification.actor ? (
                <Link
                  className="inline-flex max-w-full items-center gap-1 rounded-full bg-white/70 px-2 py-0.5 ring-1 ring-black/10 transition hover:bg-white hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300"
                  href={withLocale(locale, `/profile/${notification.actor.id}`)}
                >
                  <dt className="shrink-0 text-zinc-400">{t.actorLabel}</dt>
                  <dd className="truncate font-medium text-ink">
                    {notification.actor.nickname}
                  </dd>
                </Link>
              ) : null}
              {notification.activity ? (
                <div className="inline-flex max-w-full items-center gap-1 rounded-full bg-white/70 px-2 py-0.5 ring-1 ring-black/10">
                  <dt className="shrink-0 text-zinc-400">{t.activityLabel}</dt>
                  <dd className="truncate font-medium text-ink">
                    {notification.activity.title}
                  </dd>
                </div>
              ) : null}
            </dl>
          ) : null}

          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            {canInlineResolveFriendRequest && notification.friendRequestId ? (
              <div className="w-full sm:max-w-xs">
                <FriendRequestActionButtons
                  locale={locale}
                  redirectPath="/notifications"
                  requestId={notification.friendRequestId}
                />
              </div>
            ) : null}
            {hasAction ? (
              <form action={openNotificationActivityAction}>
                <input name="locale" type="hidden" value={locale} />
                <input
                  name="notificationId"
                  type="hidden"
                  value={notification.id}
                />
                <button
                  className={cn(
                    "inline-flex min-h-8 items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-3 text-xs font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300",
                    isUnread
                      ? "bg-ink text-white hover:bg-zinc-800"
                      : "bg-white text-ink ring-1 ring-black/10 hover:bg-zinc-50",
                  )}
                  type="submit"
                >
                  {getNotificationActionLabel(notification, locale)}
                  <ExternalLink className="h-3.5 w-3.5" />
                </button>
              </form>
            ) : null}
            {isUnread ? (
              <form action={markNotificationReadAction}>
                <input name="locale" type="hidden" value={locale} />
                <input
                  name="notificationId"
                  type="hidden"
                  value={notification.id}
                />
                <button
                  className="inline-flex min-h-8 items-center justify-center gap-1 whitespace-nowrap rounded-full bg-white px-3 text-xs font-medium text-zinc-600 ring-1 ring-black/10 transition hover:bg-zinc-50 hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300"
                  type="submit"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  {t.markOneRead}
                </button>
              </form>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}

export default async function NotificationsPage({
  params,
}: NotificationsPageProps) {
  const { locale } = await params;
  const perf = createPerformanceTracker({
    locale,
    route: "/notifications",
  });
  const profile = await perf.measure("viewer.profile", () =>
    ensureCurrentUserProfile(locale, "/notifications"),
  );
  const { notifications, unreadCount } = await perf.measure(
    "notifications.center",
    () => getNotificationCenter(profile.id),
  );
  const t = getCopy(locale).notifications;
  const unreadNotifications = notifications.filter(
    (notification) => notification.readAt === null,
  );
  const readNotifications = notifications.filter(
    (notification) => notification.readAt !== null,
  );
  const actionRequiredCount = notifications.filter(needsUserAction).length;
  perf.finish({
    notificationCount: notifications.length,
    unreadCount,
  }, {
    route: `/${locale}/notifications`,
    routeKey: "notifications",
    sourceSurface: "notification",
    userProfileId: profile.id,
  });

  return (
    <PageContainer className="space-y-4">
      <NotificationCountHydrator unreadCount={unreadCount} />
      <section className="rounded-lg border border-black/10 bg-white/78 p-3 shadow-sm sm:p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-xs font-semibold text-moss sm:text-sm">
              <Bell className="h-4 w-4" />
              {actionRequiredCount > 0
                ? t.actionRequiredCount(actionRequiredCount)
                : unreadCount > 0
                  ? t.unreadCount(unreadCount)
                  : t.allRead}
            </p>
            <h1 className="mt-1.5 text-xl font-semibold tracking-normal text-ink sm:text-2xl">
              {t.title}
            </h1>
            <p className="mt-1 text-sm leading-6 text-zinc-600 sm:hidden">
              {t.mobileDescription}
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
        </div>
      </section>

      {notifications.length === 0 ? (
        <EmptyState
          actionHref={withLocale(locale, "/activities")}
          actionLabel={t.emptyAction}
          title={t.emptyTitle}
          description={t.emptyDescription}
        />
      ) : (
        <div className="space-y-3">
          {unreadNotifications.length > 0 ? (
            <section className="space-y-2">
              <h2 className="text-sm font-semibold text-ink">
                {t.sections.unread}
              </h2>
              <div className="grid gap-3">
                {unreadNotifications.map((notification) => (
                  <NotificationCard
                    key={notification.id}
                    locale={locale}
                    notification={notification}
                  />
                ))}
              </div>
            </section>
          ) : (
            <section className="rounded-lg border border-dashed border-sand-strong bg-white/60 p-3 sm:p-4">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
                <CheckCheck className="h-4 w-4 text-moss" />
                {t.sections.clearTitle}
              </h2>
              <p className="mt-1 text-sm leading-6 text-zinc-500">
                {t.sections.clearDescription}
              </p>
            </section>
          )}

          {readNotifications.length > 0 ? (
            <section className="space-y-2">
              <h2 className="text-sm font-semibold text-zinc-600">
                {t.sections.read}
              </h2>
              <div className="grid gap-3">
                {readNotifications.map((notification) => (
                  <NotificationCard
                    key={notification.id}
                    locale={locale}
                    notification={notification}
                  />
                ))}
              </div>
            </section>
          ) : null}
        </div>
      )}
    </PageContainer>
  );
}
