"use client";

import {
  AlertTriangle,
  Bell,
  CalendarX2,
  CheckCheck,
  Clock3,
  ExternalLink,
  Flag,
  Heart,
  MessageCircle,
  MoreHorizontal,
  Repeat2,
  Trash2,
  UserMinus,
  UserPlus,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import type { NotificationType } from "@prisma/client";
import { formatActivityDate } from "@chill-club/shared";
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

type NotificationCategory = "activity" | "friends" | "gift" | "system";

type NotificationStateFilter = "all" | "unread" | "read";
type NotificationFilter = NotificationStateFilter | NotificationCategory;
type NotificationBulkAction = "delete-read" | "mark-all-read";

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
    return "activity";
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
  const actorName =
    notification.actor?.nickname ?? notification.actorDisplayName;

  if (!actorName || !notification.actor || !notification.actorActivityRole) {
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
  const actorName = getNotificationActorName(notification, locale) ?? undefined;

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

function getNotificationFilterCopy(locale: string): {
  tabs: Record<NotificationFilter, string>;
} {
  if (locale === "fr") {
    return {
      tabs: {
        all: "Tout",
        unread: "Non lues",
        read: "Lues",
        activity: "Activité",
        friends: "Amis",
        gift: "Cadeaux",
        system: "Friemi",
      },
    };
  }

  if (locale === "en") {
    return {
      tabs: {
        all: "All",
        unread: "Unread",
        read: "Read",
        activity: "Activity",
        friends: "Friends",
        gift: "Gifts",
        system: "Friemi",
      },
    };
  }

  return {
    tabs: {
      all: "全部",
      unread: "未读",
      read: "已读",
      activity: "活动",
      friends: "好友",
      gift: "礼物",
      system: "Friemi",
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

function getNotificationBulkConfirmCopy(
  locale: string,
  action: NotificationBulkAction,
  count: number,
) {
  if (locale === "fr") {
    return action === "mark-all-read"
      ? {
          body: `${count} notifications seront marquees comme lues.`,
          cancel: "Annuler",
          confirm: "Tout marquer",
          title: "Tout marquer comme lu ?",
        }
      : {
          body: `${count} notifications lues seront supprimees. Cette action est definitive.`,
          cancel: "Annuler",
          confirm: "Supprimer",
          title: "Supprimer les lues ?",
        };
  }

  if (locale === "en") {
    return action === "mark-all-read"
      ? {
          body: `${count} unread notifications will be marked as read.`,
          cancel: "Cancel",
          confirm: "Mark read",
          title: "Mark all as read?",
        }
      : {
          body: `${count} read notifications will be deleted. This cannot be undone.`,
          cancel: "Cancel",
          confirm: "Delete",
          title: "Delete read notifications?",
        };
  }

  return action === "mark-all-read"
    ? {
        body: `将 ${count} 条未读通知标为已读。`,
        cancel: "取消",
        confirm: "全部已读",
        title: "全部标为已读？",
      }
    : {
        body: `将删除 ${count} 条已读通知，删除后无法恢复。`,
        cancel: "取消",
        confirm: "确认删除",
        title: "删除已读通知？",
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
  const text = getNotificationText(notification, locale);
  const isUnread = notification.readAt === null;
  const visual = getNotificationVisual(notification.type, isUnread);
  const NotificationIcon = visual.icon;
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
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-[15px] font-black leading-5 text-ink sm:text-base">
                  {text.title}
                </h2>
                <p className="mt-1 line-clamp-2 text-sm leading-5 text-[#6C746A]">
                  {text.body}
                </p>
              </div>

              <span className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap pt-0.5 text-[11px] font-medium text-outline sm:text-xs">
                {formatActivityDate(notification.createdAt, locale)}
                {isUnread ? (
                  <span
                    aria-label={t.unread}
                    className="h-2 w-2 rounded-full bg-coral shadow-[0_0_0_3px_rgba(222,170,179,0.28)]"
                  />
                ) : null}
              </span>
            </div>

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

function NotificationBulkConfirmDialog({
  action,
  count,
  locale,
  onCancel,
  onConfirm,
  pending,
}: {
  action: NotificationBulkAction;
  count: number;
  locale: string;
  onCancel: () => void;
  onConfirm: () => void;
  pending: boolean;
}) {
  const copy = getNotificationBulkConfirmCopy(locale, action, count);

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-[90] flex items-end justify-center bg-black/36 px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-[calc(env(safe-area-inset-top)+1rem)] sm:items-center sm:p-6"
      role="dialog"
    >
      <button
        aria-label={copy.cancel}
        className="absolute inset-0 cursor-default"
        onClick={onCancel}
        type="button"
      />
      <div className="relative w-full max-w-sm rounded-[1.25rem] border border-[#F4B3B3] bg-white p-5 shadow-[0_22px_60px_rgba(17,18,16,0.2)]">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#FFF0F0] text-[#D52E3F] ring-1 ring-[#F4B3B3]">
            <AlertTriangle className="h-5 w-5" strokeWidth={2.6} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-black leading-6 text-[#111210]">
              {copy.title}
            </h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-[#6C746A]">
              {copy.body}
            </p>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-2">
          <button
            className="inline-flex h-11 items-center justify-center rounded-full bg-white px-4 text-sm font-black text-[#111210] ring-1 ring-[#D6D5B2] transition hover:bg-[#F7F7F0] active:scale-[0.98]"
            disabled={pending}
            onClick={onCancel}
            type="button"
          >
            {copy.cancel}
          </button>
          <button
            className="inline-flex h-11 items-center justify-center rounded-full bg-[#D52E3F] px-4 text-sm font-black text-white transition hover:bg-[#B82434] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
            disabled={pending}
            onClick={onConfirm}
            type="button"
          >
            {copy.confirm}
          </button>
        </div>
      </div>
    </div>
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
  const filterCopy = getNotificationFilterCopy(locale);
  const { setUnreadNotificationCount } =
    useNotificationBadge(initialUnreadCount);
  const [notifications, setNotifications] = useState(initialNotifications);
  const [activeFilter, setActiveFilter] = useState<NotificationFilter>("all");
  const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);
  const [pendingBulkAction, setPendingBulkAction] =
    useState<NotificationBulkAction | null>(null);
  const [isPending, startTransition] = useTransition();

  const filters: NotificationFilter[] = [
    "all",
    "unread",
    "read",
    "activity",
    "friends",
    "gift",
    "system",
  ];
  const unreadNotifications = notifications.filter(
    (notification) => notification.readAt === null,
  );
  const readNotifications = notifications.filter(
    (notification) => notification.readAt !== null,
  );
  const unreadCount = unreadNotifications.length;
  const pendingBulkActionCount =
    pendingBulkAction === "mark-all-read"
      ? unreadNotifications.length
      : pendingBulkAction === "delete-read"
        ? readNotifications.length
        : 0;
  const filteredNotifications = notifications.filter((notification) => {
    if (activeFilter === "all") return true;
    if (activeFilter === "unread") return notification.readAt === null;
    if (activeFilter === "read") return notification.readAt !== null;

    return getNotificationCategory(notification.type) === activeFilter;
  });
  const visibleNotifications = [...filteredNotifications].sort((a, b) => {
    const unreadDelta = Number(a.readAt !== null) - Number(b.readAt !== null);

    if (unreadDelta !== 0) {
      return unreadDelta;
    }

    return Date.parse(b.createdAt) - Date.parse(a.createdAt);
  });
  const filterCounts = filters.reduce<Record<NotificationFilter, number>>(
    (counts, filter) => {
      counts[filter] = notifications.filter((notification) => {
        if (filter === "all") return true;
        if (filter === "unread") return notification.readAt === null;
        if (filter === "read") return notification.readAt !== null;

        return getNotificationCategory(notification.type) === filter;
      }).length;

      return counts;
    },
    {
      activity: 0,
      all: 0,
      friends: 0,
      gift: 0,
      read: 0,
      system: 0,
      unread: 0,
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

  function handleConfirmBulkAction() {
    const action = pendingBulkAction;

    if (!action) {
      return;
    }

    setPendingBulkAction(null);

    if (action === "mark-all-read") {
      handleMarkAllRead();
      return;
    }

    handleDeleteRead();
  }

  return (
    <>
      <section className="space-y-4 border-b border-[#EEEDE4] pb-4">
        <div className="relative flex items-center justify-between gap-3">
          <h1 className="min-w-0 text-3xl font-black tracking-normal text-[#111210] sm:text-4xl">
            {t.title}
          </h1>
          <button
            aria-expanded={isActionMenuOpen}
            aria-label={
              locale === "en"
                ? "Notification actions"
                : locale === "fr"
                  ? "Actions notification"
                  : "通知操作"
            }
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-[#156240] ring-1 ring-[#D6D5B2] transition hover:bg-[#F7F7F0] active:scale-95"
            onClick={() => setIsActionMenuOpen((current) => !current)}
            type="button"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>

          {isActionMenuOpen ? (
            <div className="absolute right-0 top-11 z-30 grid w-[min(15rem,calc(100vw-2rem))] gap-2 rounded-[1rem] border border-[#D6D5B2] bg-white p-2 shadow-[0_18px_42px_rgba(17,18,16,0.14)]">
              <button
                className="inline-flex h-10 w-full items-center justify-start gap-2 rounded-full px-3 text-sm font-black text-[#156240] transition hover:bg-[#F7F7F0] disabled:cursor-not-allowed disabled:opacity-45"
                disabled={isPending || unreadCount === 0}
                onClick={() => {
                  setPendingBulkAction("mark-all-read");
                  setIsActionMenuOpen(false);
                }}
                type="button"
              >
                <CheckCheck className="h-4 w-4" />
                {t.markAllRead}
              </button>
              <button
                className="inline-flex h-10 w-full items-center justify-start gap-2 rounded-full px-3 text-sm font-black text-[#9A2135] transition hover:bg-[#FFF0F0] disabled:cursor-not-allowed disabled:opacity-45"
                disabled={isPending || readNotifications.length === 0}
                onClick={() => {
                  setPendingBulkAction("delete-read");
                  setIsActionMenuOpen(false);
                }}
                type="button"
              >
                <Trash2 className="h-4 w-4" />
                {deleteCopy.clearRead}
              </button>
            </div>
          ) : null}
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

      {notifications.length === 0 ? (
        <EmptyState
          actionHref={withLocale(locale, "/activities")}
          actionLabel={t.emptyAction}
          className="shadow-none"
          description=""
          title={t.emptyTitle}
        />
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

      {pendingBulkAction && pendingBulkActionCount > 0 ? (
        <NotificationBulkConfirmDialog
          action={pendingBulkAction}
          count={pendingBulkActionCount}
          locale={locale}
          onCancel={() => setPendingBulkAction(null)}
          onConfirm={handleConfirmBulkAction}
          pending={isPending}
        />
      ) : null}
    </>
  );
}
