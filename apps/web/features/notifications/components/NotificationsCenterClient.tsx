"use client";

import {
  Bell,
  CalendarX2,
  CheckCheck,
  Clock3,
  ExternalLink,
  Flag,
  Heart,
  Inbox,
  MessageCircle,
  Repeat2,
  Trash2,
  UserMinus,
  UserPlus,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import type { NotificationType } from "@prisma/client";
import { formatActivityDate } from "@chill-club/shared";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { EmptyState } from "@/components/ui/EmptyState";
import { FriendRequestActionButtons } from "@/features/friends/components/FriendsDashboard";
import {
  deleteNotificationClientAction,
  deleteReadNotificationsClientAction,
  markAllNotificationsReadClientAction,
  markNotificationReadClientAction,
  openNotificationActivityAction,
} from "@/features/notifications/actions/markNotificationsRead";
import { NotificationSwipeCard } from "@/features/notifications/components/NotificationSwipeCard";
import { type NotificationViewModel } from "@/features/notifications/queries/getNotifications";
import { getCopy } from "@/lib/copy";
import { withLocale } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { useNotificationBadge } from "./NotificationBadgeProvider";

type NotificationCategory =
  | "activity"
  | "friends"
  | "participation"
  | "system";

type NotificationFilter = "all" | NotificationCategory;

const notificationCategoryStyles: Record<NotificationCategory, string> = {
  activity: "bg-[#FFF4E3] text-[#8A4B1A] ring-[#E7C98C]",
  friends: "bg-[#F1F2EC] text-[#111210] ring-[#D6D5B2]",
  participation: "bg-[#EAF5E8] text-[#156240] ring-[#BFD8B9]",
  system: "bg-[#FFF0F0] text-[#9A2135] ring-[#F1B5AE]",
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

  if (type === "FRIEND_REQUEST") return "friends";
  if (type === "REPORT_CREATED") return "system";
  if (type === "ACTIVITY_ANNOUNCEMENT") return "activity";
  if (
    type === "ACTIVITY_COMMENTED" ||
    type === "COMMENT_REPLY" ||
    type === "ACTIVITY_UPDATED" ||
    type === "ACTIVITY_CANCELLED"
  ) {
    return "activity";
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
    (notification.type === "PARTICIPATION_PENDING" &&
      Boolean(notification.actor))
  );
}

function isNotificationInteractiveTarget(target: EventTarget | null) {
  return (
    target instanceof Element &&
    Boolean(
      target.closest(
        "a,button,input,textarea,select,label,form,[data-no-swipe]",
      ),
    )
  );
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
          : "管理员";

  return locale === "zh-CN"
    ? `${actorName}（${roleLabel}）`
    : `${actorName} (${roleLabel})`;
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
    return { title: copy.title, body: copy.body(activityTitle, actorName) };
  }

  if (
    notification.type === "PARTICIPATION_PENDING" ||
    notification.type === "PARTICIPATION_CONFIRMED" ||
    notification.type === "PARTICIPATION_CANCELLED" ||
    notification.type === "PARTICIPATION_APPROVED" ||
    notification.type === "ACTIVITY_COMMENTED" ||
    notification.type === "COMMENT_REPLY" ||
    notification.type === "DIRECT_MESSAGE" ||
    notification.type === "MOMENT_LIKED" ||
    notification.type === "MOMENT_COMMENTED" ||
    notification.type === "MOMENT_COMMENT_REPLY" ||
    notification.type === "MOMENT_REPOSTED"
  ) {
    const copy = t.types[notification.type];
    return { title: copy.title, body: copy.body(activityTitle, actorName) };
  }

  if (notification.type === "PARTICIPATION_REJECTED") {
    const copy = t.types.PARTICIPATION_REJECTED;
    return { title: copy.title, body: copy.body(activityTitle, actorName) };
  }

  if (notification.type === "ACTIVITY_CANCELLED") {
    const copy = t.types.ACTIVITY_CANCELLED;
    return { title: copy.title, body: copy.body(activityTitle, actorName) };
  }

  if (notification.type === "ACTIVITY_UPDATED") {
    const copy = t.types.ACTIVITY_UPDATED;
    return { title: copy.title, body: copy.body(activityTitle, actorName) };
  }

  if ((notification.type as string) === "ACTIVITY_ANNOUNCEMENT") {
    const copy = (
      t.types as Record<
        string,
        { title: string; body: (...args: string[]) => string }
      >
    ).ACTIVITY_ANNOUNCEMENT;
    const announcementPreview =
      notification.activityAnnouncement?.content.trim();

    return {
      title: copy.title,
      body: copy.body(
        activityTitle,
        actorName ?? "",
        announcementPreview && announcementPreview.length > 120
          ? `${announcementPreview.slice(0, 117)}...`
          : (announcementPreview ?? ""),
      ),
    };
  }

  if (notification.type === "REPORT_CREATED") {
    const copy = t.types.REPORT_CREATED;
    return { title: copy.title, body: copy.body(activityTitle, actorName) };
  }

  const copy = t.types[notification.type];
  return { title: copy.title, body: copy.body(activityTitle) };
}

function getNotificationActionLabel(
  notification: NotificationViewModel,
  locale: string,
) {
  const t = getCopy(locale).notifications;

  if (
    notification.type === "MOMENT_LIKED" ||
    notification.type === "MOMENT_COMMENTED" ||
    notification.type === "MOMENT_COMMENT_REPLY" ||
    notification.type === "MOMENT_REPOSTED"
  ) {
    return locale === "en"
      ? "Open Trace"
      : locale === "fr"
        ? "Voir Trace"
        : "查看足迹";
  }

  if (notification.type === "FRIEND_REQUEST") return t.openProfile;
  if (notification.type === "REPORT_CREATED") return t.openReports;
  if (
    notification.type === "ACTIVITY_COMMENTED" ||
    notification.type === "COMMENT_REPLY"
  ) {
    return t.openComments;
  }
  if (notification.type === "DIRECT_MESSAGE") return t.openMessages;
  if (notification.type === "PARTICIPATION_PENDING" && notification.actor) {
    return t.openReview;
  }

  return t.openActivity;
}

function getNotificationSummaryLabels(locale: string) {
  if (locale === "fr") {
    return { actionRequired: "À traiter", total: "Total", unread: "Non lues" };
  }

  if (locale === "en") {
    return { actionRequired: "Needs action", total: "Total", unread: "Unread" };
  }

  return { actionRequired: "待处理", total: "全部", unread: "未读" };
}

function getNotificationFilterCopy(locale: string): {
  emptyDescription: Record<NotificationFilter, string>;
  emptyTitle: Record<NotificationFilter, string>;
  tabs: Record<NotificationFilter, string>;
} {
  if (locale === "fr") {
    return {
      tabs: {
        all: "Tout",
        participation: "Inscriptions",
        activity: "Activité",
        friends: "Amis",
        system: "Système",
      },
      emptyTitle: {
        all: "Aucune notification",
        participation: "Aucune inscription",
        activity: "Aucune nouveauté",
        friends: "Aucune demande",
        system: "Aucun message système",
      },
      emptyDescription: {
        all: "Les nouvelles informations apparaîtront ici.",
        participation: "Les demandes et confirmations apparaîtront ici.",
        activity: "Les changements d'activité et commentaires apparaîtront ici.",
        friends: "Les demandes d'amis apparaîtront ici.",
        system: "Les alertes importantes apparaîtront ici.",
      },
    };
  }

  if (locale === "en") {
    return {
      tabs: {
        all: "All",
        participation: "Joins",
        activity: "Activity",
        friends: "Friends",
        system: "System",
      },
      emptyTitle: {
        all: "No notifications",
        participation: "No join updates",
        activity: "No activity updates",
        friends: "No friend requests",
        system: "No system updates",
      },
      emptyDescription: {
        all: "New updates will appear here.",
        participation: "Join requests and confirmations will appear here.",
        activity: "Activity changes and comments will appear here.",
        friends: "Friend requests will appear here.",
        system: "Important updates will appear here.",
      },
    };
  }

  return {
    tabs: {
      all: "全部",
      participation: "报名",
      activity: "活动",
      friends: "好友",
      system: "系统",
    },
    emptyTitle: {
      all: "暂无通知",
      participation: "暂无报名通知",
      activity: "暂无活动通知",
      friends: "暂无好友通知",
      system: "暂无系统通知",
    },
    emptyDescription: {
      all: "新的提醒会出现在这里。",
      participation: "报名申请和报名结果会出现在这里。",
      activity: "活动变更和评论会出现在这里。",
      friends: "好友申请会出现在这里。",
      system: "重要提醒会出现在这里。",
    },
  };
}

function getNotificationDeleteCopy(locale: string) {
  if (locale === "fr") {
    return { clearRead: "Supprimer les lues", delete: "Supprimer" };
  }

  if (locale === "en") {
    return { clearRead: "Delete read", delete: "Delete" };
  }

  return { clearRead: "批量删除已读", delete: "删除" };
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
      iconClassName: isUnread ? "bg-ice text-forest" : "bg-fog text-outline",
      cardClassName: isUnread
        ? "border-sage bg-paper"
        : "border-sand bg-paper/62",
    };
  }

  if (type === "PARTICIPATION_CANCELLED") {
    return {
      icon: UserMinus,
      iconClassName: isUnread ? "bg-fog text-forest" : "bg-paper text-outline",
      cardClassName: isUnread
        ? "border-sand bg-paper"
        : "border-sand bg-paper/62",
    };
  }

  if (type === "FRIEND_REQUEST") {
    return {
      icon: UserPlus,
      iconClassName: isUnread ? "bg-ink text-paper" : "bg-fog text-ink/55",
      cardClassName: isUnread
        ? "border-ink/20 bg-paper"
        : "border-sand bg-paper/62",
    };
  }

  if (type === "ACTIVITY_UPDATED") {
    return {
      icon: Bell,
      iconClassName: isUnread ? "bg-ice text-forest" : "bg-fog text-outline",
      cardClassName: isUnread
        ? "border-sage bg-paper"
        : "border-sand bg-paper/62",
    };
  }

  if (type === "ACTIVITY_ANNOUNCEMENT") {
    return {
      icon: Bell,
      iconClassName: isUnread ? "bg-cream text-danger" : "bg-fog text-outline",
      cardClassName: isUnread
        ? "border-rose bg-paper"
        : "border-sand bg-paper/62",
    };
  }

  if (
    type === "ACTIVITY_COMMENTED" ||
    type === "COMMENT_REPLY" ||
    type === "MOMENT_COMMENTED" ||
    type === "MOMENT_COMMENT_REPLY" ||
    type === "MOMENT_LIKED" ||
    type === "MOMENT_REPOSTED"
  ) {
    return {
      icon:
        type === "MOMENT_LIKED"
          ? Heart
          : type === "MOMENT_REPOSTED"
            ? Repeat2
            : MessageCircle,
      iconClassName: isUnread ? "bg-fog text-forest" : "bg-fog text-outline",
      cardClassName: isUnread
        ? "border-sage bg-paper"
        : "border-sand bg-paper/62",
    };
  }

  if (type === "DIRECT_MESSAGE") {
    return {
      icon: MessageCircle,
      iconClassName: isUnread ? "bg-ice text-forest" : "bg-fog text-outline",
      cardClassName: isUnread
        ? "border-sage bg-paper"
        : "border-sand bg-paper/62",
    };
  }

  if (type === "REPORT_CREATED") {
    return {
      icon: Flag,
      iconClassName: isUnread ? "bg-danger text-paper" : "bg-rose text-danger",
      cardClassName: isUnread
        ? "border-rose bg-paper"
        : "border-sand bg-paper/62",
    };
  }

  if (type === "PARTICIPATION_REJECTED" || type === "ACTIVITY_CANCELLED") {
    return {
      icon: type === "ACTIVITY_CANCELLED" ? CalendarX2 : XCircle,
      iconClassName: isUnread ? "bg-danger text-paper" : "bg-rose text-danger",
      cardClassName: isUnread
        ? "border-rose bg-paper"
        : "border-sand bg-paper/62",
    };
  }

  return {
    icon: CheckCheck,
    iconClassName: isUnread ? "bg-meadow text-paper" : "bg-fog text-forest",
    cardClassName: isUnread
      ? "border-sage bg-paper"
      : "border-sand bg-paper/62",
  };
}

function NotificationCard({
  locale,
  notification,
  pending,
  onDelete,
  onMarkRead,
}: {
  locale: string;
  notification: NotificationViewModel;
  pending: boolean;
  onDelete: (notificationId: string) => void;
  onMarkRead: (notificationId: string) => void;
}) {
  const t = getCopy(locale).notifications;
  const deleteCopy = getNotificationDeleteCopy(locale);
  const filterCopy = getNotificationFilterCopy(locale);
  const text = getNotificationText(notification, locale);
  const isUnread = notification.readAt === null;
  const visual = getNotificationVisual(notification.type, isUnread);
  const NotificationIcon = visual.icon;
  const category = getNotificationCategory(notification.type);
  const hasAction =
    notification.type === "FRIEND_REQUEST"
      ? false
      : Boolean(notification.activity) ||
        notification.type === "REPORT_CREATED" ||
        notification.type === "DIRECT_MESSAGE" ||
        notification.type === "MOMENT_LIKED" ||
        notification.type === "MOMENT_COMMENTED" ||
        notification.type === "MOMENT_COMMENT_REPLY" ||
        notification.type === "MOMENT_REPOSTED";
  const canInlineResolveFriendRequest =
    notification.type === "FRIEND_REQUEST" &&
    Boolean(notification.friendRequestId);

  const mobileDeleteAction = (
    <button
      className="flex min-h-[calc(100%-0.5rem)] w-full flex-col items-center justify-center gap-1 rounded-[1rem] bg-paper/88 px-3 py-4 text-center text-xs font-semibold text-danger ring-1 ring-coral/30 transition hover:bg-rose/45 focus:outline-none focus-visible:ring-2 focus-visible:ring-coral/55"
      data-no-swipe
      disabled={pending}
      onClick={() => onDelete(notification.id)}
      type="button"
    >
      <Trash2 className="h-4 w-4" />
      {deleteCopy.delete}
    </button>
  );

  return (
    <NotificationSwipeCard mobileDeleteAction={mobileDeleteAction}>
      <article
        className={cn(
          "group relative overflow-hidden rounded-[1rem] border px-3 py-3 transition duration-150 ease-out hover:bg-white sm:px-4 sm:py-3.5",
          visual.cardClassName,
          pending ? "pointer-events-none opacity-70" : null,
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            "absolute inset-y-3 left-0 w-1 rounded-r-full transition",
            isUnread ? "bg-coral" : "bg-sand/70",
          )}
        />
        {isUnread ? (
          <span
            aria-label={t.unread}
            className="absolute right-3 top-3 h-2.5 w-2.5 rounded-full bg-coral shadow-[0_0_0_4px_rgba(222,170,179,0.38)] sm:hidden"
          />
        ) : null}
        <div
          className="flex gap-3 pl-1"
          onClick={(event) => {
            if (isUnread && !isNotificationInteractiveTarget(event.target)) {
              onMarkRead(notification.id);
            }
          }}
        >
          <span
            className={cn(
              "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ring-1 ring-paper/75",
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
                      "inline-flex h-5 max-w-full items-center rounded-full px-2 text-[10px] font-semibold leading-none ring-1 sm:text-[11px]",
                      notificationCategoryStyles[category],
                    )}
                  >
                    {filterCopy.tabs[category]}
                  </span>
                  {isUnread ? (
                    <span className="inline-flex h-5 items-center rounded-full bg-rose px-2 text-[10px] font-semibold leading-none text-danger ring-1 ring-coral/35 sm:text-[11px]">
                      {t.unread}
                    </span>
                  ) : null}
                </div>

                <h2 className="mt-2 text-[15px] font-black leading-5 text-ink sm:text-base">
                  {text.title}
                </h2>
                <p className="mt-1 line-clamp-2 text-sm leading-5 text-[#6C746A]">
                  {text.body}
                </p>
              </div>

              <span className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap text-[11px] font-medium text-outline sm:text-xs">
                {isUnread ? (
                  <span
                    aria-label={t.unread}
                    className="hidden h-2 w-2 rounded-full bg-coral shadow-[0_0_0_3px_rgba(222,170,179,0.32)] sm:inline-block"
                  />
                ) : null}
                {formatActivityDate(notification.createdAt, locale)}
              </span>
            </div>

            {notification.actor || notification.activity ? (
              <dl className="mt-2 flex flex-wrap gap-1.5 text-[11px] text-outline sm:text-xs">
                {notification.actor ? (
                  <Link
                    className="inline-flex max-w-full items-center gap-1 rounded-full bg-[#F7F7F0] px-2 py-0.5 ring-1 ring-[#EEEDE4] transition hover:bg-paper hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-meadow/30"
                    href={withLocale(
                      locale,
                      `/profile/${notification.actor.id}`,
                    )}
                  >
                    <dt className="shrink-0 text-outline">{t.actorLabel}</dt>
                    <dd className="truncate font-medium text-ink">
                      {notification.actor.nickname}
                    </dd>
                  </Link>
                ) : null}
                {notification.activity ? (
                  <div className="inline-flex max-w-full items-center gap-1 rounded-full bg-[#F7F7F0] px-2 py-0.5 ring-1 ring-[#EEEDE4]">
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
                <button
                  className="inline-flex min-h-8 items-center justify-center gap-1 whitespace-nowrap rounded-full bg-paper px-3 text-xs font-semibold text-forest/70 ring-1 ring-sand transition hover:bg-fog hover:text-forest focus:outline-none focus-visible:ring-2 focus-visible:ring-meadow/30"
                  disabled={pending}
                  onClick={() => onMarkRead(notification.id)}
                  type="button"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  {t.markOneRead}
                </button>
              ) : null}
              <button
                className="hidden min-h-8 items-center justify-center gap-1 whitespace-nowrap rounded-full bg-rose/58 px-3 text-xs font-semibold text-danger ring-1 ring-coral/30 transition hover:bg-rose/78 focus:outline-none focus-visible:ring-2 focus-visible:ring-coral/35 sm:inline-flex"
                disabled={pending}
                onClick={() => onDelete(notification.id)}
                type="button"
              >
                <Trash2 className="h-3.5 w-3.5" />
                {deleteCopy.delete}
              </button>
            </div>
          </div>
        </div>
      </article>
    </NotificationSwipeCard>
  );
}

export function NotificationsCenterClient({
  initialNotifications,
  initialUnreadCount,
  locale,
}: {
  initialNotifications: NotificationViewModel[];
  initialUnreadCount: number;
  locale: string;
}) {
  const router = useRouter();
  const t = getCopy(locale).notifications;
  const deleteCopy = getNotificationDeleteCopy(locale);
  const summaryLabels = getNotificationSummaryLabels(locale);
  const filterCopy = getNotificationFilterCopy(locale);
  const { setUnreadNotificationCount } =
    useNotificationBadge(initialUnreadCount);
  const [notifications, setNotifications] = useState(initialNotifications);
  const [activeFilter, setActiveFilter] = useState<NotificationFilter>("all");
  const [isPending, startTransition] = useTransition();

  const filters: NotificationFilter[] = [
    "all",
    "participation",
    "activity",
    "friends",
    "system",
  ];
  const unreadNotifications = notifications.filter(
    (notification) => notification.readAt === null,
  );
  const readNotifications = notifications.filter(
    (notification) => notification.readAt !== null,
  );
  const unreadCount = unreadNotifications.length;
  const actionRequiredCount = notifications.filter(needsUserAction).length;
  const filteredNotifications =
    activeFilter === "all"
      ? notifications
      : notifications.filter(
          (notification) =>
            getNotificationCategory(notification.type) === activeFilter,
        );
  const visibleNotifications = [...filteredNotifications].sort((a, b) => {
    const unreadDelta = Number(a.readAt !== null) - Number(b.readAt !== null);

    if (unreadDelta !== 0) {
      return unreadDelta;
    }

    return Date.parse(b.createdAt) - Date.parse(a.createdAt);
  });
  const filterCounts = filters.reduce<Record<NotificationFilter, number>>(
    (counts, filter) => {
      counts[filter] =
        filter === "all"
          ? notifications.length
          : notifications.filter(
              (notification) =>
                getNotificationCategory(notification.type) === filter,
            ).length;

      return counts;
    },
    {
      activity: 0,
      all: 0,
      friends: 0,
      participation: 0,
      system: 0,
    },
  );

  useEffect(() => {
    setUnreadNotificationCount(unreadCount);
  }, [setUnreadNotificationCount, unreadCount]);

  function runOptimisticMutation(
    nextNotifications: NotificationViewModel[],
    mutation: () => Promise<unknown>,
  ) {
    const previousNotifications = notifications;
    setNotifications(nextNotifications);

    startTransition(async () => {
      try {
        await mutation();
      } catch (error) {
        setNotifications(previousNotifications);
        router.refresh();
      }
    });
  }

  function handleMarkRead(notificationId: string) {
    const target = notifications.find(
      (notification) => notification.id === notificationId,
    );

    if (!target || target.readAt !== null) {
      return;
    }

    runOptimisticMutation(
      notifications.map((notification) =>
        notification.id === notificationId
          ? {
              ...notification,
              readAt: new Date().toISOString(),
            }
          : notification,
      ),
      () => markNotificationReadClientAction(locale, notificationId),
    );
  }

  function handleDelete(notificationId: string) {
    if (
      !notifications.some((notification) => notification.id === notificationId)
    ) {
      return;
    }

    runOptimisticMutation(
      notifications.filter(
        (notification) => notification.id !== notificationId,
      ),
      () => deleteNotificationClientAction(locale, notificationId),
    );
  }

  function handleMarkAllRead() {
    if (unreadNotifications.length === 0) {
      return;
    }

    runOptimisticMutation(
      notifications.map((notification) =>
        notification.readAt === null
          ? { ...notification, readAt: new Date().toISOString() }
          : notification,
      ),
      () => markAllNotificationsReadClientAction(locale),
    );
  }

  function handleDeleteRead() {
    if (readNotifications.length === 0) {
      return;
    }

    runOptimisticMutation(
      notifications.filter((notification) => notification.readAt === null),
      () => deleteReadNotificationsClientAction(locale),
    );
  }

  const markAllReadButton = (
    <button
      className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-full border border-[#D6D5B2] bg-white px-3 text-xs font-black text-[#156240] transition hover:bg-[#F7F7F0] disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none"
      disabled={isPending || unreadCount === 0}
      onClick={handleMarkAllRead}
      type="button"
    >
      <CheckCheck className="h-3.5 w-3.5" />
      {t.markAllRead}
    </button>
  );

  return (
    <>
      <section className="space-y-4 border-b border-[#EEEDE4] pb-4">
        <div className="flex min-w-0 items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-[#156240]">
              <Bell className="h-4 w-4" />
              {actionRequiredCount > 0
                ? t.actionRequiredCount(actionRequiredCount)
                : unreadCount > 0
                  ? t.unreadCount(unreadCount)
                  : t.allRead}
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-normal text-[#111210] sm:text-4xl">
              {t.title}
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-[#6C746A]">
              {t.description}
            </p>
          </div>
          <span className="inline-flex h-9 min-w-9 shrink-0 items-center justify-center rounded-full bg-[#EAF5E8] px-2 text-xs font-black text-[#156240] ring-1 ring-[#BFD8B9]">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs font-black text-[#6C746A]">
          <span className="inline-flex h-7 items-center gap-1.5 rounded-full bg-[#F7F7F0] px-2.5 ring-1 ring-[#EEEDE4]">
            <Bell className="h-3.5 w-3.5 text-[#156240]" />
            {summaryLabels.unread} {unreadCount}
          </span>
          <span className="inline-flex h-7 items-center gap-1.5 rounded-full bg-[#F7F7F0] px-2.5 ring-1 ring-[#EEEDE4]">
            <Clock3 className="h-3.5 w-3.5 text-[#9A2135]" />
            {summaryLabels.actionRequired} {actionRequiredCount}
          </span>
          <span className="inline-flex h-7 items-center gap-1.5 rounded-full bg-[#F7F7F0] px-2.5 ring-1 ring-[#EEEDE4]">
            <CheckCheck className="h-3.5 w-3.5 text-[#156240]" />
            {summaryLabels.total} {notifications.length}
          </span>
        </div>

        <div className="flex gap-2 sm:justify-start">
          {markAllReadButton}
          <button
            className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-full border border-[#F1B5AE] bg-white px-3 text-xs font-black text-[#9A2135] transition hover:bg-[#FFF0F0] disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none"
            disabled={isPending || readNotifications.length === 0}
            onClick={handleDeleteRead}
            type="button"
          >
            <Trash2 className="h-3.5 w-3.5" />
            {deleteCopy.clearRead}
          </button>
        </div>

        <nav
          aria-label={t.title}
          className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden"
        >
          {filters.map((filter) => {
            const active = activeFilter === filter;
            const count = filterCounts[filter];

            return (
              <button
                key={filter}
                className={cn(
                  "inline-flex h-10 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-3 text-sm font-black transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#369758]/30",
                  active
                    ? "bg-[#156240] text-white shadow-[0_10px_24px_rgba(21,98,64,0.16)]"
                    : "bg-white text-[#111210] ring-1 ring-[#EEEDE4] hover:bg-[#F7F7F0]",
                )}
                type="button"
                onClick={() => setActiveFilter(filter)}
              >
                {filterCopy.tabs[filter]}
                {count > 0 ? (
                  <span
                    className={cn(
                      "inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] leading-none",
                      active
                        ? "bg-white/20 text-white"
                        : "bg-[#EAF5E8] text-[#156240]",
                    )}
                  >
                    {count > 99 ? "99+" : count}
                  </span>
                ) : null}
              </button>
            );
          })}
        </nav>
      </section>

      {unreadCount === 0 && notifications.length > 0 ? (
        <section className="flex items-center gap-2 rounded-[1rem] bg-[#F7F7F0] px-3 py-2.5 text-sm font-bold text-[#6C746A] ring-1 ring-[#EEEDE4]">
          <CheckCheck className="h-4 w-4 shrink-0 text-[#156240]" />
          <span className="min-w-0 truncate">{t.sections.clearTitle}</span>
        </section>
      ) : null}

      {notifications.length === 0 ? (
        <EmptyState
          actionHref={withLocale(locale, "/activities")}
          actionLabel={t.emptyAction}
          className="shadow-none"
          description={t.emptyDescription}
          title={t.emptyTitle}
        />
      ) : visibleNotifications.length === 0 ? (
        <section className="rounded-[1rem] border border-dashed border-[#D6D5B2] bg-white/62 px-4 py-6 text-center">
          <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-[#F1F2EC] text-[#156240] ring-1 ring-[#D6D5B2]">
            <Inbox className="h-5 w-5" />
          </span>
          <h2 className="mt-3 text-base font-black text-[#111210]">
            {filterCopy.emptyTitle[activeFilter]}
          </h2>
          <p className="mx-auto mt-1 max-w-sm text-sm leading-6 text-[#6C746A]">
            {filterCopy.emptyDescription[activeFilter]}
          </p>
          <button
            className="mt-4 inline-flex h-9 items-center justify-center rounded-full bg-white px-4 text-sm font-black text-[#156240] ring-1 ring-[#8AB68E] transition hover:bg-[#F7F7F0]"
            type="button"
            onClick={() => setActiveFilter("all")}
          >
            {filterCopy.tabs.all}
          </button>
        </section>
      ) : (
        <section className="grid gap-2.5 pb-4">
          {visibleNotifications.map((notification) => (
            <NotificationCard
              key={notification.id}
              locale={locale}
              notification={notification}
              onDelete={handleDelete}
              onMarkRead={handleMarkRead}
              pending={isPending}
            />
          ))}
        </section>
      )}
    </>
  );
}
