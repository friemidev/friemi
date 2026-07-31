"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  ClipboardList,
  ExternalLink,
  LoaderCircle,
  Lock,
  LogOut,
  MessageCircle,
  MoreHorizontal,
  Pencil,
  SendHorizontal,
  Trash2,
} from "lucide-react";
import {
  Fragment,
  useActionState,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { Button } from "@chill-club/ui";
import { ActivityAnnouncementComposer } from "@/features/activities/components/ActivityAnnouncementComposer";
import { ActivityCheckInReviewPanel } from "@/features/activities/components/ActivityCheckInReviewPanel";
import { ActivityCoManagerPanel } from "@/features/activities/components/ActivityCoManagerPanel";
import { CancelActivityForm } from "@/features/activities/components/CancelActivityForm";
import {
  cancelParticipationAction,
  type CancelParticipationState,
} from "@/features/activities/actions/cancelParticipation";
import { ActivityParticipantContactDialog } from "@/features/direct-messages/components/ActivityParticipantContactDialog";
import { cn } from "@/lib/utils";
import { withLocale } from "@/lib/routes";
import {
  formatChatDateSeparator,
  formatChatMessageTime,
  getChatDateKey,
} from "@/lib/chatDateSeparators";
import {
  deleteActivityRoomMessageAction,
  sendActivityRoomMessageAction,
  type ActivityRoomChatActionState,
} from "../actions/activityRoomChatActions";
import { getActivityRoomChatCopy } from "../copy";
import type {
  ActivityRoomChatActivityViewModel,
  ActivityRoomManagementViewModel,
  ActivityRoomChatPolicy,
  ActivityRoomMessageViewModel,
} from "../services/activityRoomChat";

type ActivityRoomViewer = {
  avatarUrl: string | null;
  id: string;
  nickname: string;
};

type ActivityRoomChatPageProps = {
  activity: ActivityRoomChatActivityViewModel | null;
  activityId: string;
  locale: string;
  messages: ActivityRoomMessageViewModel[];
  management?: ActivityRoomManagementViewModel | null;
  policy: ActivityRoomChatPolicy;
  signInHref: string;
  viewer: ActivityRoomViewer | null;
};

const initialActionState: ActivityRoomChatActionState = {};
const initialLeaveState: CancelParticipationState = {};

function getAvatarInitial(name: string) {
  return name.trim().charAt(0).toUpperCase() || "F";
}

function getRoomManagementCopy(locale: string) {
  if (locale === "fr") {
    return {
      close: "Fermer",
      contactParticipants: "Contacter",
      edit: "Modifier",
      label: "Options",
      leave: "Quitter le groupe",
      leaveCancel: "Rester",
      leaveConfirm: "Quitter",
      leaveDescription:
        "Vous n'aurez plus acces a cette discussion. Vous devrez rejoindre le groupe a nouveau.",
      leaveFailed: "Impossible de quitter pour le moment.",
      leavePending: "Sortie...",
      leaveTitle: "Quitter ce groupe ?",
      manageTitle: "Gérer le groupe",
      members: "Membres",
      signups: "Inscriptions",
      viewGroup: "Voir le groupe",
    };
  }

  if (locale === "en") {
    return {
      close: "Close",
      contactParticipants: "Contact",
      edit: "Edit",
      label: "Options",
      leave: "Leave group",
      leaveCancel: "Stay",
      leaveConfirm: "Leave",
      leaveDescription:
        "You will lose access to this chat. Join the group again to come back.",
      leaveFailed: "Could not leave right now.",
      leavePending: "Leaving...",
      leaveTitle: "Leave this group?",
      manageTitle: "Manage group",
      members: "Members",
      signups: "Signups",
      viewGroup: "View group",
    };
  }

  return {
    close: "关闭",
    contactParticipants: "联系成员",
    edit: "编辑聚吧",
    label: "群聊设置",
    leave: "退出本聚吧",
    leaveCancel: "暂不退出",
    leaveConfirm: "确认退出",
    leaveDescription: "退出后将无法继续查看这个群聊，需要重新加入聚吧才能回来。",
    leaveFailed: "暂时无法退出。",
    leavePending: "退出中...",
    leaveTitle: "确认退出本聚吧？",
    manageTitle: "管理聚吧",
    members: "成员",
    signups: "报名名单",
    viewGroup: "查看聚吧",
  };
}

function RoomAvatar({
  avatarUrl,
  name,
}: {
  avatarUrl: string | null;
  name: string;
}) {
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white text-xs font-black text-[#156240] shadow-[0_8px_18px_rgba(21,98,64,0.1)] ring-1 ring-[#D6D5B2]">
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          alt=""
          className="h-full w-full object-cover"
          referrerPolicy="no-referrer"
          src={avatarUrl}
        />
      ) : (
        getAvatarInitial(name)
      )}
    </span>
  );
}

function ActivityRoomChatAutoRefresh({
  activityId,
  intervalMs = 8000,
}: {
  activityId: string;
  intervalMs?: number;
}) {
  const router = useRouter();

  useEffect(() => {
    const timer = window.setInterval(() => {
      const activeElement = document.activeElement;
      const composer = document.querySelector("[data-activity-room-composer]");
      const textarea = composer?.querySelector("textarea");
      const isComposing =
        activeElement instanceof HTMLElement &&
        Boolean(activeElement.closest("[data-activity-room-composer]"));
      const hasDraft = Boolean(textarea?.value.trim());

      if (document.visibilityState === "visible" && !isComposing && !hasDraft) {
        router.refresh();
      }
    }, intervalMs);

    return () => window.clearInterval(timer);
  }, [activityId, intervalMs, router]);

  return null;
}

function ActivityRoomManagementMenu({
  activityHref,
  activityId,
  activityTitle,
  locale,
  management,
  policy,
}: {
  activityHref: string;
  activityId: string;
  activityTitle: string;
  locale: string;
  management: ActivityRoomManagementViewModel | null | undefined;
  policy: ActivityRoomChatPolicy;
}) {
  const [open, setOpen] = useState(false);
  const copy = getRoomManagementCopy(locale);

  const reviewHref = `${activityHref}${
    management?.requiresApproval
      ? "#participation-approval"
      : "#activity-participants"
  }`;
  const editHref = withLocale(locale, `/activities/${activityId}/edit`);
  const canLeaveRoom = policy.role === "PARTICIPANT";

  return (
    <div className="relative">
      <button
        aria-expanded={open}
        aria-label={copy.label}
        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-[#156240] ring-1 ring-[#D6D5B2] transition active:scale-95"
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>

      {open ? (
        <div className="absolute right-0 top-10 z-40 max-h-[min(31rem,calc(100dvh-8rem))] w-[min(21rem,calc(100vw-1.5rem))] overflow-y-auto rounded-[1.35rem] border border-[#D6D5B2] bg-white p-3 shadow-[0_18px_48px_rgba(17,18,16,0.16)]">
          <div className="mb-2 flex items-center justify-between gap-3 px-1">
            <p className="text-sm font-black text-[#111210]">
              {management ? copy.manageTitle : copy.label}
            </p>
            <button
              className="text-xs font-bold text-[#6C746A]"
              onClick={() => setOpen(false)}
              type="button"
            >
              {copy.close}
            </button>
          </div>
          <div className="grid gap-2">
            <Link
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-[#D6D5B2] bg-white px-4 text-sm font-black text-[#156240] transition active:scale-[0.98]"
              href={activityHref}
              onClick={() => setOpen(false)}
            >
              <ExternalLink className="h-4 w-4" />
              {copy.viewGroup}
            </Link>
            {management?.canEditActivity ? (
              <Link
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full bg-[#156240] px-4 text-sm font-black text-white transition active:scale-[0.98]"
                href={editHref}
                onClick={() => setOpen(false)}
              >
                <Pencil className="h-4 w-4" />
                {copy.edit}
              </Link>
            ) : null}
            {management ? (
              <>
                <Link
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-[#D6D5B2] bg-white px-4 text-sm font-black text-[#156240] transition active:scale-[0.98]"
                  href={reviewHref}
                  onClick={() => setOpen(false)}
                >
                  <ClipboardList className="h-4 w-4" />
                  {copy.signups}
                </Link>
                <ActivityAnnouncementComposer
                  activityId={activityId}
                  locale={locale}
                  compact
                />
                <ActivityParticipantContactDialog
                  activityId={activityId}
                  buttonClassName="min-h-10 bg-white px-4 text-sm font-black"
                  buttonLabel={copy.contactParticipants}
                  locale={locale}
                  participants={management.contactableParticipants}
                />
                {management.coManagerDashboard ? (
                  <ActivityCoManagerPanel
                    dashboard={management.coManagerDashboard}
                    locale={locale}
                  />
                ) : null}
                <ActivityCheckInReviewPanel
                  activityId={activityId}
                  locale={locale}
                  participants={management.checkInRoster}
                />
                <div className="rounded-[1rem] border border-[#F0D6D1] bg-white p-2">
                  <CancelActivityForm
                    activityId={activityId}
                    activityTitle={management.activityTitle}
                    disabled={!management.canCancelActivity}
                    locale={locale}
                  />
                </div>
              </>
            ) : null}
            {canLeaveRoom ? (
              <ActivityRoomLeaveAction
                activityHref={activityHref}
                activityId={activityId}
                activityTitle={management?.activityTitle ?? activityTitle}
                locale={locale}
              />
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ActivityRoomLeaveAction({
  activityHref,
  activityId,
  activityTitle,
  locale,
}: {
  activityHref: string;
  activityId: string;
  activityTitle: string;
  locale: string;
}) {
  const router = useRouter();
  const copy = getRoomManagementCopy(locale);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(
    cancelParticipationAction,
    initialLeaveState,
  );

  useEffect(() => {
    if (!state.success) {
      return;
    }

    setConfirmOpen(false);
    router.push(activityHref);
    router.refresh();
  }, [activityHref, router, state.success]);

  return (
    <form action={formAction} className="grid gap-2" noValidate>
      <input name="activityId" type="hidden" value={activityId} />
      <input name="locale" type="hidden" value={locale} />
      {state.formError ? (
        <p className="rounded-xl bg-[#FFF1EF] px-3 py-2 text-xs font-bold leading-5 text-[#B5301F]">
          {state.formError || copy.leaveFailed}
        </p>
      ) : null}
      <button
        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-[#F0B7AE] bg-white px-4 text-sm font-black text-[#B5301F] transition active:scale-[0.98] disabled:cursor-wait disabled:opacity-70"
        disabled={isPending}
        onClick={() => setConfirmOpen(true)}
        type="button"
      >
        {isPending ? (
          <LoaderCircle className="h-4 w-4 animate-spin" />
        ) : (
          <LogOut className="h-4 w-4" />
        )}
        {isPending ? copy.leavePending : copy.leave}
      </button>
      {confirmOpen ? (
        <div
          className="fixed inset-0 z-[80] grid place-items-center bg-[#111210]/42 px-5 py-[max(1rem,env(safe-area-inset-top))]"
          role="presentation"
        >
          <div
            aria-describedby="activity-room-leave-description"
            aria-labelledby="activity-room-leave-title"
            aria-modal="true"
            className="w-full max-w-sm rounded-[1.25rem] border border-[#F0B7AE] bg-white p-5 shadow-[0_24px_70px_rgba(17,18,16,0.24)]"
            role="alertdialog"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#FFF1EF] text-[#B5301F]">
              <AlertTriangle className="h-5 w-5" />
            </span>
            <h2
              className="mt-4 text-lg font-black text-[#111210]"
              id="activity-room-leave-title"
            >
              {copy.leaveTitle}
            </h2>
            <p
              className="mt-2 text-sm font-semibold leading-6 text-[#6C746A]"
              id="activity-room-leave-description"
            >
              {copy.leaveDescription}
            </p>
            {activityTitle ? (
              <p className="mt-3 truncate rounded-xl bg-[#F7F7F0] px-3 py-2 text-xs font-black text-[#4F574F]">
                {activityTitle}
              </p>
            ) : null}
            <div className="mt-5 grid grid-cols-2 gap-2">
              <button
                className="h-11 rounded-full border border-[#D6D5B2] bg-white text-sm font-black text-[#4F574F] transition active:scale-[0.98]"
                disabled={isPending}
                onClick={() => setConfirmOpen(false)}
                type="button"
              >
                {copy.leaveCancel}
              </button>
              <button
                className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#B5301F] text-sm font-black text-white transition active:scale-[0.98] disabled:cursor-wait disabled:opacity-70"
                disabled={isPending}
                type="submit"
              >
                {isPending ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : null}
                {isPending ? copy.leavePending : copy.leaveConfirm}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </form>
  );
}

function ScrollAnchor({ lastMessageId }: { lastMessageId?: string }) {
  const anchorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    anchorRef.current?.scrollIntoView({ block: "end" });
  }, [lastMessageId]);

  return <div ref={anchorRef} aria-hidden="true" />;
}

function ChatDateSeparator({
  createdAt,
  locale,
}: {
  createdAt: string;
  locale: string;
}) {
  const label = formatChatDateSeparator(createdAt, locale);

  if (!label) {
    return null;
  }

  return (
    <div className="my-1 flex items-center gap-3 px-8" aria-label={label}>
      <span className="h-px flex-1 bg-[#E7E2D6]" />
      <span className="rounded-full bg-white px-3 py-1 text-[11px] font-black text-[#8B907F] ring-1 ring-[#E7E2D6]">
        {label}
      </span>
      <span className="h-px flex-1 bg-[#E7E2D6]" />
    </div>
  );
}

function StatusPanel({
  actionHref,
  actionLabel,
  description,
  icon = "lock",
  title,
}: {
  actionHref?: string;
  actionLabel?: string;
  description: string;
  icon?: "lock" | "message";
  title: string;
}) {
  const Icon = icon === "message" ? MessageCircle : Lock;

  return (
    <div className="flex min-h-[18rem] items-center justify-center px-5 py-8 text-center">
      <div className="max-w-sm">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white text-[#156240] shadow-[0_10px_24px_rgba(21,98,64,0.08)] ring-1 ring-[#D6D5B2]">
          <Icon className="h-5 w-5" />
        </span>
        <h2 className="mt-4 text-lg font-black text-[#111210]">{title}</h2>
        <p className="mt-2 text-sm font-semibold leading-6 text-[#6C746A]">
          {description}
        </p>
        {actionHref && actionLabel ? (
          <Link
            className="mt-5 inline-flex h-11 items-center justify-center rounded-full bg-[#156240] px-5 text-sm font-black text-white shadow-[0_12px_26px_rgba(21,98,64,0.18)] transition active:scale-95"
            href={actionHref}
          >
            {actionLabel}
          </Link>
        ) : null}
      </div>
    </div>
  );
}

function getDeniedState({
  activity,
  activityHref,
  locale,
  policy,
  signInHref,
  viewer,
}: {
  activity: ActivityRoomChatActivityViewModel | null;
  activityHref: string;
  locale: string;
  policy: ActivityRoomChatPolicy;
  signInHref: string;
  viewer: ActivityRoomViewer | null;
}) {
  const copy = getActivityRoomChatCopy(locale);

  if (!viewer) {
    return {
      actionHref: signInHref,
      actionLabel: copy.loginAction,
      description: copy.loginDescription,
      title: copy.loginTitle,
    };
  }

  if (policy.reason === "PUBLIC_EVENT_UNAVAILABLE") {
    return {
      actionHref: activity?.publicEventId
        ? withLocale(
            locale,
            `/public-events/${activity.publicEventId}/teams/new`,
          )
        : activityHref,
      actionLabel: activity?.publicEventId
        ? copy.createGroup
        : copy.openActivity,
      description: copy.errors.PUBLIC_EVENT_UNAVAILABLE,
      title: copy.title,
    };
  }

  return {
    actionHref: activityHref,
    actionLabel: copy.viewActivity,
    description:
      policy.reason === "ALLOWED"
        ? copy.emptyDescription
        : copy.errors[policy.reason],
    title:
      policy.reason === "ACTIVITY_NOT_FOUND" ? copy.title : copy.lockedTitle,
  };
}

function getPolicyNotice(
  policy: ActivityRoomChatPolicy,
  locale: string,
  fallback: string,
) {
  const copy = getActivityRoomChatCopy(locale);

  return policy.reason === "ALLOWED" ? fallback : copy.errors[policy.reason];
}

function MessageRow({
  canManage,
  isDeleting,
  locale,
  message,
  onDelete,
  viewer,
}: {
  canManage: boolean;
  isDeleting: boolean;
  locale: string;
  message: ActivityRoomMessageViewModel;
  onDelete: (messageId: string) => void;
  viewer: ActivityRoomViewer | null;
}) {
  const copy = getActivityRoomChatCopy(locale);
  const canDelete = !message.isDeleted && (message.isMine || canManage);
  const sender = message.isMine && viewer ? viewer : message.sender;

  return (
    <div
      className={cn(
        "group flex items-start gap-2.5",
        message.isMine ? "justify-end" : "justify-start",
      )}
    >
      {!message.isMine ? (
        <span className="pt-[1.25rem]">
          <RoomAvatar avatarUrl={sender.avatarUrl} name={sender.nickname} />
        </span>
      ) : null}
      <div
        className={cn(
          "grid max-w-[76%] gap-0.5 sm:max-w-[64%]",
          message.isMine ? "justify-items-end" : "justify-items-start",
        )}
      >
        {!message.isMine ? (
          <p className="max-w-full truncate pl-1 text-[11px] font-black leading-4 text-[#6C746A]">
            {sender.nickname}
          </p>
        ) : null}
        <div
          className={cn(
            "rounded-[1.05rem] px-3.5 py-2 text-sm leading-6 shadow-[0_8px_18px_rgba(21,98,64,0.06)]",
            message.isDeleted
              ? "bg-[#F1F2EC] text-[#8B907F] ring-1 ring-[#DFDAC5]"
              : message.isMine
                ? "rounded-br-[0.35rem] bg-[#156240] text-white"
                : "rounded-tl-[0.35rem] bg-white text-[#111210] ring-1 ring-[#D6D5B2]",
          )}
        >
          <p
            className={cn(
              "whitespace-pre-wrap break-words",
              message.isDeleted && "font-semibold italic",
            )}
          >
            {message.isDeleted ? copy.deletedMessage : message.body}
          </p>
          <div
            className={cn(
              "mt-1 flex items-center gap-2 text-[11px]",
              message.isMine && !message.isDeleted
                ? "text-white/68"
                : "text-[#8B907F]",
            )}
          >
            <span>{formatChatMessageTime(message.createdAt, locale)}</span>
            {canDelete ? (
              <button
                aria-busy={isDeleting}
                aria-label={copy.deleteMessage}
                className={cn(
                  "inline-flex h-6 w-6 items-center justify-center rounded-full opacity-100 transition active:scale-95 disabled:cursor-wait disabled:opacity-70 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100",
                  message.isMine
                    ? "bg-white/14 text-white hover:bg-white/22"
                    : "bg-[#F1F2EC] text-[#6C746A] hover:bg-[#E8E1CF]",
                )}
                disabled={isDeleting}
                onClick={() => onDelete(message.id)}
                title={copy.deleteMessage}
                type="button"
              >
                {isDeleting ? (
                  <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5" />
                )}
              </button>
            ) : null}
          </div>
        </div>
      </div>
      {message.isMine ? (
        <RoomAvatar avatarUrl={sender.avatarUrl} name={sender.nickname} />
      ) : null}
    </div>
  );
}

function RoomComposer({
  activityId,
  disabled,
  locale,
  onSent,
  viewer,
}: {
  activityId: string;
  disabled: boolean;
  locale: string;
  onSent: (message: ActivityRoomMessageViewModel) => void;
  viewer: ActivityRoomViewer | null;
}) {
  const copy = getActivityRoomChatCopy(locale);
  const [body, setBody] = useState("");
  const [formError, setFormError] = useState("");
  const [isSending, setIsSending] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (disabled || isSending) {
      return;
    }

    const trimmedBody = body.trim();

    if (!trimmedBody) {
      setBody("");
      setFormError("");
      return;
    }

    const formData = new FormData();
    formData.set("activityId", activityId);
    formData.set("body", trimmedBody);
    formData.set("locale", locale);

    setFormError("");
    setIsSending(true);

    void sendActivityRoomMessageAction(initialActionState, formData)
      .then((state) => {
        if (state.ok && state.messageId) {
          setBody("");
          onSent({
            body: trimmedBody,
            createdAt: new Date().toISOString(),
            id: state.messageId,
            isDeleted: false,
            isMine: true,
            sender: {
              avatarUrl: viewer?.avatarUrl ?? null,
              friendCode: null,
              id: viewer?.id ?? "",
              nickname: viewer?.nickname ?? "Friemi",
            },
          });

          return;
        }

        setFormError(state.formError ?? copy.sendFailed);
        setBody(state.values?.body ?? trimmedBody);
      })
      .catch(() => {
        setFormError(copy.sendFailed);
        setBody(trimmedBody);
      })
      .finally(() => setIsSending(false));
  }

  return (
    <form
      className="relative z-20 shrink-0 border-t border-[#D6D5B2] bg-white/94 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur md:rounded-b-[1.45rem] md:pb-3"
      data-activity-room-composer
      noValidate
      onSubmit={handleSubmit}
    >
      <div className="flex items-end gap-2">
        <textarea
          className="max-h-28 min-h-11 min-w-0 flex-1 resize-none rounded-[1.25rem] border border-[#D6D5B2] bg-[#FEFFF9] px-4 py-3 text-sm font-semibold leading-5 text-[#111210] outline-none placeholder:text-[#9BA08E] focus:border-[#8AB68E] focus:ring-2 focus:ring-[#8AB68E]/20 disabled:bg-[#F1F2EC]"
          disabled={disabled || isSending}
          maxLength={500}
          name="body"
          onChange={(event) => setBody(event.target.value)}
          placeholder={copy.placeholder}
          rows={1}
          value={body}
        />
        <Button
          aria-busy={isSending}
          className="h-11 min-w-11 shrink-0 rounded-full bg-[#156240] px-0 text-white shadow-[0_12px_24px_rgba(21,98,64,0.18)] hover:bg-[#156240] sm:min-w-[5rem] sm:px-4"
          disabled={disabled || isSending}
          type="submit"
        >
          {isSending ? (
            <LoaderCircle className="h-4 w-4 animate-spin" />
          ) : (
            <SendHorizontal className="h-4 w-4" />
          )}
          <span className="hidden whitespace-nowrap sm:inline">
            {isSending ? copy.sending : copy.send}
          </span>
          <span className="sr-only sm:hidden">
            {isSending ? copy.sending : copy.send}
          </span>
        </Button>
      </div>
      {formError ? (
        <p className="mt-2 px-2 text-xs font-bold text-[#9A2135]">
          {formError}
        </p>
      ) : null}
    </form>
  );
}

export function ActivityRoomChatPage({
  activity,
  activityId,
  locale,
  management,
  messages: initialMessages,
  policy,
  signInHref,
  viewer,
}: ActivityRoomChatPageProps) {
  const router = useRouter();
  const copy = getActivityRoomChatCopy(locale);
  const [messages, setMessages] =
    useState<ActivityRoomMessageViewModel[]>(initialMessages);
  const [deleteError, setDeleteError] = useState("");
  const [deletingId, setDeletingId] = useState("");
  const canManage = policy.role === "ORGANIZER" || policy.role === "CO_MANAGER";
  const lastMessageId = messages[messages.length - 1]?.id;
  const activityHref = withLocale(
    locale,
    `/lobby/${activity?.id ?? activityId}`,
  );
  const state = getDeniedState({
    activity,
    activityHref,
    locale,
    policy,
    signInHref,
    viewer,
  });

  useEffect(() => {
    setMessages(initialMessages);
  }, [initialMessages]);

  function handleSent(message: ActivityRoomMessageViewModel) {
    setMessages((current) => [...current, message]);
    router.refresh();
  }

  function handleDelete(messageId: string) {
    if (deletingId) {
      return;
    }

    const formData = new FormData();
    formData.set("activityId", activity?.id ?? "");
    formData.set("locale", locale);
    formData.set("messageId", messageId);

    setDeleteError("");
    setDeletingId(messageId);

    void deleteActivityRoomMessageAction(initialActionState, formData)
      .then((result) => {
        if (result.ok) {
          setMessages((current) =>
            current.map((message) =>
              message.id === messageId
                ? { ...message, body: "", isDeleted: true }
                : message,
            ),
          );
          router.refresh();
          return;
        }

        setDeleteError(result.formError ?? copy.deleteFailed);
      })
      .catch(() => setDeleteError(copy.deleteFailed))
      .finally(() => setDeletingId(""));
  }

  return (
    <section className="mx-auto flex h-full min-h-0 w-full max-w-2xl flex-col overflow-hidden bg-[#FEFFF9] text-[#111210] shadow-[0_18px_48px_rgba(21,98,64,0.08)] md:h-[calc(100dvh-8rem)] md:rounded-[1.45rem] md:border md:border-[#D6D5B2] md:ring-1 md:ring-white/70">
      {activity && policy.canView ? (
        <ActivityRoomChatAutoRefresh activityId={activity.id} />
      ) : null}
      <header className="grid min-w-0 grid-cols-[2.25rem_minmax(0,1fr)_auto] items-center gap-2 border-b border-[#D6D5B2] bg-white p-4 max-md:pt-[calc(env(safe-area-inset-top)+1rem)]">
        <button
          aria-label={copy.backToActivity}
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-[#156240] shadow-[0_8px_18px_rgba(21,98,64,0.08)] ring-1 ring-[#D6D5B2] transition active:scale-95"
          onClick={() => router.back()}
          title={copy.backToActivity}
          type="button"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="min-w-0 text-center">
          <p className="mx-auto flex max-w-full items-center justify-center gap-1.5 text-[11px] font-black uppercase tracking-[0.14em] text-[#156240]">
            <MessageCircle className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{copy.title}</span>
          </p>
          <h1 className="mt-1 truncate text-lg font-black text-[#111210]">
            {activity?.title ?? copy.title}
          </h1>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {activity && policy.canView ? (
            <ActivityRoomManagementMenu
              activityHref={activityHref}
              activityId={activity.id}
              activityTitle={activity.title ?? copy.title}
              locale={locale}
              management={management}
              policy={policy}
            />
          ) : null}
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto bg-[linear-gradient(180deg,#FEFFF9_0%,#FFF8EA_100%)] px-3 py-4 sm:px-5">
        {policy.canView ? (
          messages.length > 0 ? (
            <div className="grid gap-3">
              {messages.map((message, index) => {
                const previousMessage = messages[index - 1];
                const showDateSeparator =
                  !previousMessage ||
                  getChatDateKey(previousMessage.createdAt) !==
                    getChatDateKey(message.createdAt);

                return (
                  <Fragment key={message.id}>
                    {showDateSeparator ? (
                      <ChatDateSeparator
                        createdAt={message.createdAt}
                        locale={locale}
                      />
                    ) : null}
                    <MessageRow
                      canManage={canManage}
                      isDeleting={deletingId === message.id}
                      locale={locale}
                      message={message}
                      onDelete={handleDelete}
                      viewer={viewer}
                    />
                  </Fragment>
                );
              })}
              <ScrollAnchor lastMessageId={lastMessageId} />
            </div>
          ) : (
            <StatusPanel
              description={
                policy.canSend
                  ? copy.emptyDescription
                  : getPolicyNotice(policy, locale, copy.readOnly)
              }
              icon="message"
              title={copy.emptyTitle}
            />
          )
        ) : (
          <StatusPanel {...state} />
        )}
      </div>

      {deleteError ? (
        <p className="border-t border-[#D6D5B2] bg-white px-5 py-2 text-xs font-bold text-[#9A2135]">
          {deleteError}
        </p>
      ) : null}

      {activity && policy.canSend ? (
        <RoomComposer
          activityId={activity.id}
          disabled={Boolean(deletingId)}
          locale={locale}
          onSent={handleSent}
          viewer={viewer}
        />
      ) : policy.canView ? (
        <div className="shrink-0 border-t border-[#D6D5B2] bg-white/94 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] text-center text-xs font-black text-[#6C746A] backdrop-blur md:rounded-b-[1.45rem] md:pb-3">
          {getPolicyNotice(policy, locale, copy.readOnly)}
        </div>
      ) : null}
    </section>
  );
}
