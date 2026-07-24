"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  LoaderCircle,
  Lock,
  MessageCircle,
  SendHorizontal,
  Trash2,
  UsersRound,
} from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Button } from "@chill-club/ui";
import { cn } from "@/lib/utils";
import { withLocale } from "@/lib/routes";
import {
  deleteActivityRoomMessageAction,
  sendActivityRoomMessageAction,
  type ActivityRoomChatActionState,
} from "../actions/activityRoomChatActions";
import { getActivityRoomChatCopy } from "../copy";
import type {
  ActivityRoomChatActivityViewModel,
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
  policy: ActivityRoomChatPolicy;
  signInHref: string;
  viewer: ActivityRoomViewer | null;
};

const initialActionState: ActivityRoomChatActionState = {};

function formatMessageTime(value: string, locale: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getAvatarInitial(name: string) {
  return name.trim().charAt(0).toUpperCase() || "F";
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

function ScrollAnchor({ lastMessageId }: { lastMessageId?: string }) {
  const anchorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    anchorRef.current?.scrollIntoView({ block: "end" });
  }, [lastMessageId]);

  return <div ref={anchorRef} aria-hidden="true" />;
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
        "group flex items-end gap-2",
        message.isMine ? "justify-end" : "justify-start",
      )}
    >
      {!message.isMine ? (
        <RoomAvatar avatarUrl={sender.avatarUrl} name={sender.nickname} />
      ) : null}
      <div
        className={cn(
          "max-w-[78%] rounded-2xl px-3 py-2 text-sm leading-6 shadow-[0_10px_24px_rgba(21,98,64,0.08)] sm:max-w-[66%]",
          message.isDeleted
            ? "bg-[#F1F2EC] text-[#8B907F] ring-1 ring-[#DFDAC5]"
            : message.isMine
              ? "rounded-br-md bg-[#156240] text-white"
              : "rounded-bl-md bg-white text-[#111210] ring-1 ring-[#D6D5B2]",
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
          <span>{formatMessageTime(message.createdAt, locale)}</span>
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
}: {
  activityId: string;
  disabled: boolean;
  locale: string;
  onSent: (message: ActivityRoomMessageViewModel) => void;
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
              avatarUrl: null,
              friendCode: null,
              id: "",
              nickname: "Friemi",
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
  const activityHref = withLocale(locale, `/lobby/${activity?.id ?? activityId}`);
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
      <header className="grid min-w-0 grid-cols-[2.25rem_minmax(0,1fr)_auto] items-center gap-2 border-b border-[#D6D5B2] bg-[linear-gradient(135deg,#FEFFF9_0%,#FFF5E6_62%,#EAF5E8_100%)] p-4 max-md:pt-[calc(env(safe-area-inset-top)+1rem)]">
        <Link
          aria-label={copy.backToActivity}
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-[#156240] shadow-[0_8px_18px_rgba(21,98,64,0.08)] ring-1 ring-[#D6D5B2] transition active:scale-95"
          href={activityHref}
          title={copy.backToActivity}
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="min-w-0 text-center">
          <p className="mx-auto flex max-w-full items-center justify-center gap-1.5 text-[11px] font-black uppercase tracking-[0.14em] text-[#156240]">
            <MessageCircle className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{copy.title}</span>
          </p>
          <h1 className="mt-1 truncate text-lg font-black text-[#111210]">
            {activity?.title ?? copy.title}
          </h1>
        </div>
        <span className="inline-flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-white px-3 text-[11px] font-black text-[#156240] ring-1 ring-[#D6D5B2]">
          <UsersRound className="h-3.5 w-3.5" />
          {copy.roleLabels[policy.role]}
        </span>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto bg-[linear-gradient(180deg,#FEFFF9_0%,#FFF8EA_100%)] px-3 py-4 sm:px-5">
        {policy.canView ? (
          messages.length > 0 ? (
            <div className="grid gap-3">
              {messages.map((message) => (
                <MessageRow
                  canManage={canManage}
                  isDeleting={deletingId === message.id}
                  key={message.id}
                  locale={locale}
                  message={message}
                  onDelete={handleDelete}
                  viewer={viewer}
                />
              ))}
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
        />
      ) : policy.canView ? (
        <div className="shrink-0 border-t border-[#D6D5B2] bg-white/94 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] text-center text-xs font-black text-[#6C746A] backdrop-blur md:rounded-b-[1.45rem] md:pb-3">
          {getPolicyNotice(policy, locale, copy.readOnly)}
        </div>
      ) : null}
    </section>
  );
}
