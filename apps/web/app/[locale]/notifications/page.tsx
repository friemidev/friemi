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
  | "message"
  | "activity"
  | "report";

const notificationCategoryStyles: Record<NotificationCategory, string> = {
  participation: "bg-ice text-forest ring-sage/70",
  social: "bg-ink text-paper ring-ink",
  comment: "bg-fog text-forest ring-sage/60",
  message: "bg-ice text-forest ring-sage/70",
  activity: "bg-cream text-danger ring-rose",
  report: "bg-rose text-danger ring-coral/35",
};

function getNotificationCategory(
  type: NotificationType | string,
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

  if (type === "DIRECT_MESSAGE") {
    return "message";
  }

  if (type === "ACTIVITY_ANNOUNCEMENT") {
    return "activity";
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
  const actorName = getNotificationActorName(notification, locale);

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
    notification.type === "COMMENT_REPLY" ||
    notification.type === "DIRECT_MESSAGE"
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

  if ((notification.type as string) === "ACTIVITY_ANNOUNCEMENT") {
    const copy = (t.types as Record<string, { title: string; body: (...args: string[]) => string }>).ACTIVITY_ANNOUNCEMENT;
    const announcementPreview = notification.activityAnnouncement?.content.trim();

    return {
      title: copy.title,
        body: copy.body(
          activityTitle,
          actorName ?? "",
          announcementPreview && announcementPreview.length > 120
            ? `${announcementPreview.slice(0, 117)}...`
            : announcementPreview ?? "",
      ),
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

function getNotificationActorName(
  notification: NotificationViewModel,
  locale: string,
) {
  const actorName = notification.actor?.nickname;

  if (!actorName || !notification.actorActivityRole) {
    return actorName;
  }

  const roleLabel =
    locale === "fr"
      ? notification.actorActivityRole === "ORGANIZER"
        ? "organisateur"
        : "gestionnaire"
      : locale === "en"
        ? notification.actorActivityRole === "ORGANIZER"
          ? "organizer"
          : "manager"
        : notification.actorActivityRole === "ORGANIZER"
          ? "发起人"
          : "管理人";

  return locale === "zh-CN"
    ? `${actorName}（${roleLabel}）`
    : `${actorName} (${roleLabel})`;
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

  if (notification.type === "DIRECT_MESSAGE") {
    return t.openMessages;
  }

  if (notification.type === "PARTICIPATION_PENDING" && notification.actor) {
    return t.openReview;
  }

  return t.openActivity;
}

function getNotificationSummaryLabels(locale: string) {
  if (locale === "fr") {
    return {
      actionRequired: "À traiter",
      total: "Total",
      unread: "Non lues",
    };
  }

  if (locale === "en") {
    return {
      actionRequired: "Needs action",
      total: "Total",
      unread: "Unread",
    };
  }

  return {
    actionRequired: "待处理",
    total: "全部",
    unread: "未读",
  };
}

function getNotificationVisual(
  type: NotificationType | string,
  isUnread: boolean,
): {
  icon: LucideIcon;
  iconClassName: string;
  cardClassName: string;
} {
  if (type === "PARTICIPATION_PENDING") {
    return {
      icon: Clock3,
      iconClassName: isUnread
        ? "bg-ice text-forest"
        : "bg-fog text-outline",
      cardClassName: isUnread
        ? "border-sage bg-paper"
        : "border-sand bg-paper/62",
    };
  }

  if (type === "PARTICIPATION_CANCELLED") {
    return {
      icon: UserMinus,
      iconClassName: isUnread
        ? "bg-fog text-forest"
        : "bg-paper text-outline",
      cardClassName: isUnread
        ? "border-sand bg-paper"
        : "border-sand bg-paper/62",
    };
  }

  if (type === "FRIEND_REQUEST") {
    return {
      icon: UserPlus,
      iconClassName: isUnread
        ? "bg-ink text-paper"
        : "bg-fog text-ink/55",
      cardClassName: isUnread
        ? "border-ink/20 bg-paper"
        : "border-sand bg-paper/62",
    };
  }

  if (type === "ACTIVITY_UPDATED") {
    return {
      icon: Bell,
      iconClassName: isUnread
        ? "bg-ice text-forest"
        : "bg-fog text-outline",
      cardClassName: isUnread
        ? "border-sage bg-paper"
        : "border-sand bg-paper/62",
    };
  }

  if (type === "ACTIVITY_ANNOUNCEMENT") {
    return {
      icon: Bell,
      iconClassName: isUnread
        ? "bg-cream text-danger"
        : "bg-fog text-outline",
      cardClassName: isUnread
        ? "border-rose bg-paper"
        : "border-sand bg-paper/62",
    };
  }

  if (type === "ACTIVITY_COMMENTED" || type === "COMMENT_REPLY") {
    return {
      icon: MessageCircle,
      iconClassName: isUnread
        ? "bg-fog text-forest"
        : "bg-fog text-outline",
      cardClassName: isUnread
        ? "border-sage bg-paper"
        : "border-sand bg-paper/62",
    };
  }

  if (type === "DIRECT_MESSAGE") {
    return {
      icon: MessageCircle,
      iconClassName: isUnread
        ? "bg-ice text-forest"
        : "bg-fog text-outline",
      cardClassName: isUnread
        ? "border-sage bg-paper"
        : "border-sand bg-paper/62",
    };
  }

  if (type === "REPORT_CREATED") {
    return {
      icon: Flag,
      iconClassName: isUnread
        ? "bg-danger text-paper"
        : "bg-rose text-danger",
      cardClassName: isUnread
        ? "border-rose bg-paper"
        : "border-sand bg-paper/62",
    };
  }

  if (type === "PARTICIPATION_REJECTED" || type === "ACTIVITY_CANCELLED") {
    return {
      icon: type === "ACTIVITY_CANCELLED" ? CalendarX2 : XCircle,
      iconClassName: isUnread
        ? "bg-danger text-paper"
        : "bg-rose text-danger",
      cardClassName: isUnread
        ? "border-rose bg-paper"
        : "border-sand bg-paper/62",
    };
  }

  return {
    icon: CheckCheck,
    iconClassName: isUnread
      ? "bg-meadow text-paper"
      : "bg-fog text-forest",
    cardClassName: isUnread
      ? "border-sage bg-paper"
      : "border-sand bg-paper/62",
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
      : Boolean(notification.activity) ||
        notification.type === "REPORT_CREATED" ||
        notification.type === "DIRECT_MESSAGE");
  const canInlineResolveFriendRequest =
    notification.type === "FRIEND_REQUEST" &&
    Boolean(notification.friendRequestId);

  return (
    <article
      className={cn(
        "group relative overflow-hidden rounded-[1.2rem] border p-3.5 shadow-[0_12px_30px_rgba(21,98,64,0.055)] transition duration-200 ease-out hover:-translate-y-0.5 hover:shadow-[0_18px_42px_rgba(21,98,64,0.09)] sm:p-4",
        visual.cardClassName,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "absolute inset-y-4 left-0 w-1 rounded-r-full transition",
          isUnread ? "bg-coral" : "bg-sand/70",
        )}
      />
      {isUnread ? (
        <span
          aria-label={t.unread}
          className="absolute right-4 top-4 h-2.5 w-2.5 rounded-full bg-coral shadow-[0_0_0_4px_rgba(222,170,179,0.45)]"
        />
      ) : null}

      <div className="flex gap-3 pl-1">
        <span
          className={cn(
            "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full shadow-[0_8px_20px_rgba(29,29,27,0.08)] ring-1 ring-paper/75 sm:h-9 sm:w-9",
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
                  <span className="inline-flex h-5 items-center rounded-full bg-rose px-2 text-[10px] font-semibold leading-none text-danger ring-1 ring-coral/35 sm:text-[11px]">
                    {t.unread}
                  </span>
                ) : null}
              </div>

              <h2 className="mt-2 text-[15px] font-semibold leading-5 text-ink sm:text-base">
                {text.title}
              </h2>
              <p className="mt-1 text-sm leading-5 text-forest/70">
                {text.body}
              </p>
            </div>

            <span className="shrink-0 whitespace-nowrap text-[11px] font-medium text-outline sm:text-xs">
              {formatActivityDate(notification.createdAt, locale)}
            </span>
          </div>

          {notification.actor || notification.activity ? (
            <dl className="mt-2 flex flex-wrap gap-1.5 text-[11px] text-outline sm:text-xs">
              {notification.actor ? (
                <Link
                  className="inline-flex max-w-full items-center gap-1 rounded-full bg-cream/72 px-2 py-0.5 ring-1 ring-sand transition hover:bg-paper hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-meadow/30"
                  href={withLocale(locale, `/profile/${notification.actor.id}`)}
                >
                  <dt className="shrink-0 text-outline">{t.actorLabel}</dt>
                  <dd className="truncate font-medium text-ink">
                    {notification.actor.nickname}
                  </dd>
                </Link>
              ) : null}
              {notification.activity ? (
                <div className="inline-flex max-w-full items-center gap-1 rounded-full bg-fog/82 px-2 py-0.5 ring-1 ring-sand">
                  <dt className="shrink-0 text-outline">{t.activityLabel}</dt>
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
                    "inline-flex min-h-8 items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-3 text-xs font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-meadow/30",
                    isUnread
                      ? "bg-ink text-paper shadow-[0_10px_22px_rgba(29,29,27,0.12)] hover:bg-forest"
                      : "bg-paper text-ink ring-1 ring-sand hover:bg-fog",
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
                  className="inline-flex min-h-8 items-center justify-center gap-1 whitespace-nowrap rounded-full bg-paper px-3 text-xs font-semibold text-forest/70 ring-1 ring-sand transition hover:bg-fog hover:text-forest focus:outline-none focus-visible:ring-2 focus-visible:ring-meadow/30"
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
  const summaryLabels = getNotificationSummaryLabels(locale);
  const summaryItems = [
    {
      icon: Bell,
      label: summaryLabels.unread,
      tone: "bg-ice text-forest ring-sage/60",
      value: unreadCount,
    },
    {
      icon: Clock3,
      label: summaryLabels.actionRequired,
      tone:
        actionRequiredCount > 0
          ? "bg-rose text-danger ring-coral/35"
          : "bg-fog text-forest ring-sage/45",
      value: actionRequiredCount,
    },
    {
      icon: CheckCheck,
      label: summaryLabels.total,
      tone: "bg-cream text-ink ring-sand",
      value: notifications.length,
    },
  ];

  return (
    <PageContainer className="space-y-5 pb-24">
      <NotificationCountHydrator unreadCount={unreadCount} />
      <section className="relative overflow-hidden rounded-[1.65rem] border border-sand bg-paper/82 p-4 shadow-[0_20px_56px_rgba(21,98,64,0.075)] ring-1 ring-paper/70 sm:p-5">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -right-8 -top-16 h-36 w-36 rounded-full bg-rose/34 blur-3xl"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -left-10 bottom-0 h-28 w-40 rounded-full bg-fog/90 blur-3xl"
        />
        <div className="relative grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div className="min-w-0">
            <p className="inline-flex items-center gap-2 rounded-full bg-fog px-3 py-1 text-xs font-semibold text-forest ring-1 ring-sage/50 sm:text-sm">
              <Bell className="h-4 w-4" />
              {actionRequiredCount > 0
                ? t.actionRequiredCount(actionRequiredCount)
                : unreadCount > 0
                  ? t.unreadCount(unreadCount)
                  : t.allRead}
            </p>
            <h1 className="mt-3 text-2xl font-semibold tracking-normal text-ink sm:text-3xl">
              {t.title}
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-forest/72">
              {t.description}
              <span className="sm:hidden"> {t.mobileDescription}</span>
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end lg:min-w-[26rem]">
            <div className="grid grid-cols-3 gap-2">
              {summaryItems.map((item) => {
                const SummaryIcon = item.icon;

                return (
                  <div
                    className={cn(
                      "min-w-0 rounded-[1rem] px-3 py-2 ring-1",
                      item.tone,
                    )}
                    key={item.label}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <SummaryIcon className="h-3.5 w-3.5 shrink-0" />
                      <span className="text-base font-semibold leading-none">
                        {item.value}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-[11px] font-semibold leading-4 opacity-80">
                      {item.label}
                    </p>
                  </div>
                );
              })}
            </div>
            <form action={markAllNotificationsReadAction}>
              <input name="locale" type="hidden" value={locale} />
              <Button
                className="w-full gap-2 whitespace-nowrap border border-sand bg-paper/90 text-forest ring-0 hover:bg-fog sm:w-auto"
                disabled={unreadCount === 0}
                type="submit"
                variant="secondary"
              >
                <CheckCheck className="h-4 w-4" />
                {t.markAllRead}
              </Button>
            </form>
          </div>
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
        <div className="space-y-4">
          {unreadNotifications.length > 0 ? (
            <section className="space-y-2.5">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
                <span className="h-2 w-2 rounded-full bg-coral" />
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
            <section className="rounded-[1.2rem] border border-dashed border-sage bg-paper/62 p-4 shadow-[0_12px_30px_rgba(21,98,64,0.045)]">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
                <CheckCheck className="h-4 w-4 text-forest" />
                {t.sections.clearTitle}
              </h2>
              <p className="mt-1 text-sm leading-6 text-forest/68">
                {t.sections.clearDescription}
              </p>
            </section>
          )}

          {readNotifications.length > 0 ? (
            <section className="space-y-2.5">
              <h2 className="text-sm font-semibold text-forest/68">
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
