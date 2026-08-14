"use client";

import {
  Fragment,
  useCallback,
  useEffect,
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, LoaderCircle, MapPin, Trash2, X } from "lucide-react";
import { formatActivityDate } from "@chill-club/shared";
import { ContextualDetailLink } from "@/features/navigation/components/ContextualDetailLink";
import { dispatchChatCursorWake } from "@/features/chat/chatCursorSync";
import { useChatCursorSync } from "@/features/chat/useChatCursorSync";
import { getActivityDetailPath } from "@/features/activities/utils/activityRoutes";
import { cn } from "@/lib/utils";
import { withLocale } from "@/lib/routes";
import {
  formatChatDateSeparator,
  formatChatMessageTime,
  getChatDateKey,
  shouldShowChatTimeSeparator,
} from "@/lib/chatDateSeparators";
import { useMobileChatViewportGuard } from "@/lib/mobile-chat-viewport";
import {
  deleteDirectMessagesAction,
  sendDirectMessageAction,
  type DirectMessageActionState,
} from "../actions/directMessageActions";
import { getDirectMessagesCopy } from "../copy";
import type {
  DirectConversationActivityContextViewModel,
  DirectConversationThreadViewModel,
  DirectMessageThreadItemViewModel,
  DirectMessageUserViewModel,
} from "../queries/getDirectMessages";
import { MessageBubble, type MessageBubbleViewModel } from "./MessageBubble";
import {
  MessageComposer,
  type OptimisticMessagePayload,
} from "./MessageComposer";
import { MessageThreadScrollAnchor } from "./MessageThreadScrollAnchor";

type MessageThreadClientProps = {
  activityContext?: DirectConversationActivityContextViewModel | null;
  canSend: boolean;
  conversationId: string;
  currentUser: DirectMessageUserViewModel;
  initialBody?: string;
  initialMessages: DirectMessageThreadItemViewModel[];
  locale: string;
  peer: DirectMessageUserViewModel;
  sendPolicy: DirectConversationThreadViewModel["sendPolicy"];
  showMutualFollowNotice?: boolean;
};

function createClientMessageId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `client-${crypto.randomUUID()}`;
  }

  return `client-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

const defaultActionState: DirectMessageActionState = {
  values: {
    body: "",
  },
};

function ChatTimeSeparator({
  createdAt,
  showDate,
  locale,
}: {
  createdAt: string;
  showDate: boolean;
  locale: string;
}) {
  const dateLabel = showDate ? formatChatDateSeparator(createdAt, locale) : "";
  const timeLabel = formatChatMessageTime(createdAt, locale);
  const label = [dateLabel, timeLabel].filter(Boolean).join(" ");

  if (!label) {
    return null;
  }

  return (
    <div className="my-1 flex items-center gap-3 px-8" aria-label={label}>
      <span className="h-px flex-1 bg-[#E7E2D6]" />
      <span className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-[#8B907F] ring-1 ring-[#E7E2D6]">
        {label}
      </span>
      <span className="h-px flex-1 bg-[#E7E2D6]" />
    </div>
  );
}

function SystemThreadNotice({ label }: { label: string }) {
  return (
    <div className="my-1 flex justify-center px-4">
      <p className="max-w-[82%] rounded-full bg-[#F2F2EF] px-3 py-1 text-center text-[11px] font-semibold leading-5 text-[#6C746A] ring-1 ring-[#E7E2D6]">
        {label}
      </p>
    </div>
  );
}

export function MessageThreadClient({
  activityContext,
  canSend,
  conversationId,
  currentUser,
  initialBody,
  initialMessages,
  locale,
  peer,
  sendPolicy,
  showMutualFollowNotice = false,
}: MessageThreadClientProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [messages, setMessages] =
    useState<MessageBubbleViewModel[]>(initialMessages);
  const [actionMenuMessageId, setActionMenuMessageId] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [deletingMessageIds, setDeletingMessageIds] = useState<string[]>([]);
  const [selectedMessageIds, setSelectedMessageIds] = useState<string[]>([]);
  const [selectionMode, setSelectionMode] = useState(false);
  const [localRemainingNonFriendMessages, setLocalRemainingNonFriendMessages] =
    useState(sendPolicy.remainingNonFriendMessages);
  const t = getDirectMessagesCopy(locale);
  const chatCursorMode = useChatCursorSync({
    endpoint: `/api/direct-messages/${encodeURIComponent(conversationId)}/messages`,
    messages,
    setMessages,
    subjectKey: conversationId,
  });
  const hasMessages = messages.length > 0;
  const lastMessageId = messages[messages.length - 1]?.id;
  const canSendNow =
    canSend &&
    (localRemainingNonFriendMessages === null ||
      localRemainingNonFriendMessages > 0);
  const policyNotice = getSendPolicyNotice(
    sendPolicy,
    locale,
    localRemainingNonFriendMessages,
  );

  useMobileChatViewportGuard();

  useEffect(() => {
    setMessages((currentMessages) => {
      const serverMessageIds = new Set(
        initialMessages.map((message) => message.id),
      );
      const optimisticMessages = currentMessages.filter(
        (message) =>
          message.deliveryStatus && !serverMessageIds.has(message.id),
      );

      return [...initialMessages, ...optimisticMessages];
    });
  }, [initialMessages]);

  useEffect(() => {
    if (!actionMenuMessageId) {
      return;
    }

    function dismissActionMenu(event: PointerEvent) {
      if (!(event.target instanceof Element)) {
        return;
      }

      if (event.target.closest("[data-direct-message-action-menu]")) {
        return;
      }

      const messageElement = event.target.closest<HTMLElement>(
        "[data-direct-message-id]",
      );

      if (messageElement?.dataset.directMessageId === actionMenuMessageId) {
        return;
      }

      setActionMenuMessageId("");
    }

    document.addEventListener("pointerdown", dismissActionMenu);
    return () => document.removeEventListener("pointerdown", dismissActionMenu);
  }, [actionMenuMessageId]);

  useEffect(() => {
    setLocalRemainingNonFriendMessages(sendPolicy.remainingNonFriendMessages);
  }, [sendPolicy.remainingNonFriendMessages]);

  const decrementLocalRemainingNonFriendMessages = useCallback(() => {
    if (sendPolicy.remainingNonFriendMessages !== null) {
      setLocalRemainingNonFriendMessages((current) =>
        current === null ? current : Math.max(0, current - 1),
      );
    }
  }, [sendPolicy.remainingNonFriendMessages]);

  const restoreLocalRemainingNonFriendMessages = useCallback(() => {
    const maxRemaining = sendPolicy.remainingNonFriendMessages;

    if (maxRemaining !== null) {
      setLocalRemainingNonFriendMessages((current) =>
        current === null ? current : Math.min(current + 1, maxRemaining),
      );
    }
  }, [sendPolicy.remainingNonFriendMessages]);

  const handleOptimisticSend = useCallback(
    (payload: OptimisticMessagePayload) => {
      const clientMessageId = createClientMessageId();

      setMessages((currentMessages) => [
        ...currentMessages,
        {
          id: clientMessageId,
          senderId: currentUser.id,
          body: payload.body,
          imageUrls: payload.imageUrls,
          readAt: null,
          createdAt: payload.createdAt,
          isMine: true,
          deliveryStatus: "sending",
        },
      ]);

      decrementLocalRemainingNonFriendMessages();

      return clientMessageId;
    },
    [currentUser.id, decrementLocalRemainingNonFriendMessages],
  );

  const handleOptimisticCommit = useCallback(
    ({
      clientMessageId,
      createdAt,
      messageId,
    }: {
      clientMessageId: string;
      createdAt?: string;
      messageId: string;
    }) => {
      setMessages((currentMessages) =>
        currentMessages.map((message) =>
          message.id === clientMessageId
            ? {
                ...message,
                id: messageId,
                createdAt: createdAt ?? message.createdAt,
                deliveryStatus: undefined,
              }
            : message,
        ),
      );
      if (chatCursorMode === "canary") {
        dispatchChatCursorWake(conversationId);
      } else {
        startTransition(() => {
          router.refresh();
        });
      }
    },
    [chatCursorMode, conversationId, router],
  );

  const handleOptimisticFailure = useCallback(
    (clientMessageId: string) => {
      setMessages((currentMessages) =>
        currentMessages.map((message) =>
          message.id === clientMessageId
            ? {
                ...message,
                deliveryStatus: "failed",
              }
            : message,
        ),
      );
      restoreLocalRemainingNonFriendMessages();
    },
    [restoreLocalRemainingNonFriendMessages],
  );

  const handleRetryMessage = useCallback(
    (message: MessageBubbleViewModel) => {
      setMessages((currentMessages) =>
        currentMessages.map((currentMessage) =>
          currentMessage.id === message.id
            ? {
                ...currentMessage,
                deliveryStatus: "sending",
              }
            : currentMessage,
        ),
      );
      decrementLocalRemainingNonFriendMessages();

      const submitFormData = new FormData();
      submitFormData.set("locale", locale);
      submitFormData.set("conversationId", conversationId);
      submitFormData.set("body", message.body);

      if (activityContext?.id) {
        submitFormData.set("activityId", activityContext.id);
      }

      for (const imageUrl of message.imageUrls) {
        submitFormData.append("imageUrls", imageUrl);
      }

      void sendDirectMessageAction(defaultActionState, submitFormData)
        .then((result) => {
          if (result.ok && result.messageId) {
            handleOptimisticCommit({
              clientMessageId: message.id,
              createdAt: result.createdAt,
              messageId: result.messageId,
            });

            return;
          }

          handleOptimisticFailure(message.id);
        })
        .catch(() => {
          handleOptimisticFailure(message.id);
        });
    },
    [
      activityContext?.id,
      conversationId,
      handleOptimisticCommit,
      handleOptimisticFailure,
      decrementLocalRemainingNonFriendMessages,
      locale,
    ],
  );

  function handleOpenActionMenu(messageId: string) {
    setDeleteError("");
    setActionMenuMessageId(messageId);
  }

  function handleStartSelection(messageId: string) {
    setActionMenuMessageId("");
    setDeleteError("");
    setSelectedMessageIds([messageId]);
    setSelectionMode(true);
  }

  function handleToggleSelection(messageId: string) {
    setSelectedMessageIds((current) => {
      if (current.includes(messageId)) {
        return current.filter((id) => id !== messageId);
      }

      return current.length < 50 ? [...current, messageId] : current;
    });
  }

  function handleCancelSelection() {
    setSelectedMessageIds([]);
    setSelectionMode(false);
  }

  function handleDelete(messageIds: string[]) {
    if (deletingMessageIds.length > 0) {
      return;
    }

    const uniqueMessageIds = [...new Set(messageIds)].slice(0, 50);

    if (uniqueMessageIds.length === 0) {
      return;
    }

    const formData = new FormData();
    formData.set("conversationId", conversationId);
    formData.set("locale", locale);
    uniqueMessageIds.forEach((messageId) =>
      formData.append("messageId", messageId),
    );

    setDeleteError("");
    setDeletingMessageIds(uniqueMessageIds);

    void deleteDirectMessagesAction(defaultActionState, formData)
      .then((result) => {
        if (result.ok) {
          const deletedMessageIds = new Set(
            result.messageIds ?? uniqueMessageIds,
          );

          setMessages((current) =>
            current.filter((message) => !deletedMessageIds.has(message.id)),
          );
          setActionMenuMessageId("");
          handleCancelSelection();
          if (chatCursorMode === "canary") {
            dispatchChatCursorWake(conversationId);
          } else {
            startTransition(() => router.refresh());
          }
          return;
        }

        setDeleteError(result.formError ?? t.deleteFailed);
      })
      .catch(() => setDeleteError(t.deleteFailed))
      .finally(() => setDeletingMessageIds([]));
  }

  return (
    <>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-white px-3 py-4 sm:px-5">
        {activityContext ? (
          <ActivityContextCard
            activityContext={activityContext}
            locale={locale}
          />
        ) : null}
        {policyNotice ? <SendPolicyNotice label={policyNotice} /> : null}
        {showMutualFollowNotice ? (
          <SystemThreadNotice label={t.mutualFollowSystemNotice} />
        ) : null}
        {hasMessages ? (
          <div
            className={cn(
              "grid gap-3",
              activityContext || policyNotice || showMutualFollowNotice
                ? "mt-4"
                : "",
            )}
          >
            {messages.map((message, index) => {
              const previousMessage = messages[index - 1];
              const showDateSeparator =
                !previousMessage ||
                getChatDateKey(previousMessage.createdAt) !==
                  getChatDateKey(message.createdAt);
              const showTimeSeparator = shouldShowChatTimeSeparator(
                message.createdAt,
                previousMessage?.createdAt,
              );

              return (
                <Fragment key={message.id}>
                  {showTimeSeparator ? (
                    <ChatTimeSeparator
                      createdAt={message.createdAt}
                      showDate={showDateSeparator}
                      locale={locale}
                    />
                  ) : null}
                  <MessageBubble
                    {...message}
                    actionMenuOpen={actionMenuMessageId === message.id}
                    isDeleting={deletingMessageIds.includes(message.id)}
                    isSelected={selectedMessageIds.includes(message.id)}
                    locale={locale}
                    onDelete={handleDelete}
                    onOpenActionMenu={handleOpenActionMenu}
                    onRetry={
                      message.deliveryStatus === "failed" && canSendNow
                        ? handleRetryMessage
                        : undefined
                    }
                    onStartSelection={handleStartSelection}
                    onToggleSelection={handleToggleSelection}
                    sender={message.isMine ? currentUser : peer}
                    selectionMode={selectionMode}
                  />
                </Fragment>
              );
            })}
            <MessageThreadScrollAnchor lastMessageId={lastMessageId} />
          </div>
        ) : (
          <div className="flex min-h-[18rem] items-center justify-center">
            <div className="max-w-sm p-5 text-center">
              <h2 className="text-base font-semibold text-ink">
                {t.emptyThreadTitle}
              </h2>
              <p className="mt-2 text-sm leading-6 text-[#156240]">
                {canSendNow
                  ? t.emptyThreadDescription
                  : (policyNotice ?? t.readOnlyDescription)}
              </p>
            </div>
          </div>
        )}
      </div>

      {deleteError ? (
        <p className="border-t border-[#D6D5B2] bg-white px-5 py-2 text-xs font-bold text-[#9A2135]">
          {deleteError}
        </p>
      ) : null}

      {selectionMode ? (
        <div className="relative z-20 grid shrink-0 grid-cols-[2.75rem_minmax(0,1fr)_2.75rem] items-center gap-3 border-t border-[#D6D5B2] bg-white p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] md:rounded-b-[1.45rem] md:pb-3">
          <button
            aria-label={t.cancelSelection}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full text-[#33372F] transition hover:bg-[#F1F2EC] active:scale-95"
            disabled={deletingMessageIds.length > 0}
            onClick={handleCancelSelection}
            title={t.cancelSelection}
            type="button"
          >
            <X className="h-5 w-5" />
          </button>
          <p className="truncate text-center text-sm font-bold text-[#33372F]">
            {t.selectedMessages(selectedMessageIds.length)}
          </p>
          <button
            aria-busy={deletingMessageIds.length > 0}
            aria-label={t.deleteMessage}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full text-[#C6283D] transition hover:bg-[#FFF1F3] active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
            disabled={
              selectedMessageIds.length === 0 || deletingMessageIds.length > 0
            }
            onClick={() => handleDelete(selectedMessageIds)}
            title={t.deleteMessage}
            type="button"
          >
            {deletingMessageIds.length > 0 ? (
              <LoaderCircle className="h-5 w-5 animate-spin" />
            ) : (
              <Trash2 className="h-5 w-5" />
            )}
          </button>
        </div>
      ) : canSend ? (
        <MessageComposer
          activityId={activityContext?.id}
          conversationId={conversationId}
          disabled={!canSendNow}
          initialBody={initialBody}
          locale={locale}
          onOptimisticCommit={handleOptimisticCommit}
          onOptimisticFailure={handleOptimisticFailure}
          onOptimisticSend={handleOptimisticSend}
        />
      ) : (
        <ReadOnlyMessageComposer
          description={policyNotice ?? t.readOnlyDescription}
          locale={locale}
        />
      )}
    </>
  );
}

function ActivityContextCard({
  activityContext,
  locale,
}: {
  activityContext: DirectConversationActivityContextViewModel;
  locale: string;
}) {
  const t = getDirectMessagesCopy(locale);

  return (
    <section className="rounded-[1rem] border border-[#8AB68E] bg-white/78 p-3 shadow-[0_10px_24px_rgba(21,98,64,0.08)]">
      <div className="flex min-w-0 items-start gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#FEFFF9] text-moss ring-1 ring-[#8AB68E]">
          <CalendarDays className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-normal text-[#156240]">
            {t.activityContextLabel}
          </p>
          <h2 className="mt-1 line-clamp-2 text-sm font-semibold leading-5 text-ink">
            {activityContext.title}
          </h2>
          <div className="mt-2 grid gap-1 text-xs leading-5 text-zinc-600">
            <p className="flex min-w-0 items-center gap-1.5">
              <CalendarDays className="h-3.5 w-3.5 shrink-0 text-moss" />
              <span className="min-w-0 truncate">
                {formatActivityDate(activityContext.startAt, locale)}
              </span>
            </p>
            {activityContext.locationLabel ? (
              <p className="flex min-w-0 items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 shrink-0 text-moss" />
                <span className="min-w-0 truncate">
                  {activityContext.locationLabel}
                </span>
              </p>
            ) : null}
          </div>
        </div>
        <ContextualDetailLink
          className="shrink-0 rounded-full bg-[#FEFFF9] px-3 py-1.5 text-xs font-semibold text-[#156240] ring-1 ring-[#8AB68E] transition hover:bg-white hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-moss/30"
          href={withLocale(locale, getActivityDetailPath(activityContext.id))}
          detailSource={{
            sourceKey: "messages",
            targetKey: `activity:${activityContext.id}`,
            targetKind: "activity",
          }}
        >
          {t.activityContextCta}
        </ContextualDetailLink>
      </div>
    </section>
  );
}

function getSendPolicyNotice(
  sendPolicy: DirectConversationThreadViewModel["sendPolicy"],
  locale: string,
  localRemainingNonFriendMessages: number | null,
) {
  const t = getDirectMessagesCopy(locale);

  if (sendPolicy.isMutualFollow || sendPolicy.hasPeerReplied) {
    return null;
  }

  if (sendPolicy.reason === "LOW_TRUST") {
    return t.errors.LOW_TRUST;
  }

  if (sendPolicy.reason !== "ALLOWED") {
    return sendPolicy.reason === "NON_FRIEND_LIMIT_REACHED"
      ? t.nonFriendWaitNotice
      : t.errors[sendPolicy.reason];
  }

  if (localRemainingNonFriendMessages === null) {
    return null;
  }

  return localRemainingNonFriendMessages > 0
    ? t.nonFriendLimitNotice(localRemainingNonFriendMessages)
    : t.nonFriendWaitNotice;
}

function SendPolicyNotice({ label }: { label: string }) {
  return (
    <div className="rounded-[1rem] border border-[#D6D5B2] bg-white/78 px-3 py-2.5 text-xs font-semibold leading-5 text-[#6C746A] shadow-[0_10px_24px_rgba(21,98,64,0.06)]">
      {label}
    </div>
  );
}

function ReadOnlyMessageComposer({
  description,
  locale,
}: {
  description: string;
  locale: string;
}) {
  const t = getDirectMessagesCopy(locale);

  return (
    <div className="shrink-0 border-t border-sand bg-white/92 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur md:rounded-b-[1.45rem] md:pb-3">
      <div className="rounded-[1rem] border border-dashed border-sand bg-team-bg px-3 py-3">
        <p className="text-sm font-semibold text-ink">{t.readOnlyTitle}</p>
        <p className="mt-1 text-xs leading-5 text-[#156240]">{description}</p>
      </div>
    </div>
  );
}
