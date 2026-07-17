"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, MapPin } from "lucide-react";
import { formatActivityDate } from "@chill-club/shared";
import { ContextualDetailLink } from "@/features/navigation/components/ContextualDetailLink";
import { getActivityDetailPath } from "@/features/activities/utils/activityRoutes";
import { cn } from "@/lib/utils";
import { withLocale } from "@/lib/routes";
import {
  sendDirectMessageAction,
  type DirectMessageActionState,
} from "../actions/directMessageActions";
import { getDirectMessagesCopy } from "../copy";
import type {
  DirectConversationActivityContextViewModel,
  DirectMessageThreadItemViewModel,
  DirectMessageUserViewModel,
} from "../queries/getDirectMessages";
import { MessageBubble, type MessageBubbleViewModel } from "./MessageBubble";
import { MessageComposer, type OptimisticMessagePayload } from "./MessageComposer";
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

export function MessageThreadClient({
  activityContext,
  canSend,
  conversationId,
  currentUser,
  initialBody,
  initialMessages,
  locale,
  peer,
}: MessageThreadClientProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [messages, setMessages] =
    useState<MessageBubbleViewModel[]>(initialMessages);
  const t = getDirectMessagesCopy(locale);
  const hasMessages = messages.length > 0;
  const lastMessageId = messages[messages.length - 1]?.id;

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

      return clientMessageId;
    },
    [currentUser.id],
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
      startTransition(() => {
        router.refresh();
      });
    },
    [router],
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
    },
    [],
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
      locale,
    ],
  );

  return (
    <>
      <div className="min-h-0 flex-1 overflow-y-auto bg-[linear-gradient(180deg,#FEFFF9_0%,#FFF5E6_100%)] px-3 py-4 sm:px-5">
        {activityContext ? (
          <ActivityContextCard activityContext={activityContext} locale={locale} />
        ) : null}
        {hasMessages ? (
          <div className={cn("grid gap-3", activityContext ? "mt-4" : "")}>
            {messages.map((message) => (
              <MessageBubble
                key={message.id}
                {...message}
                locale={locale}
                onRetry={
                  message.deliveryStatus === "failed"
                    ? handleRetryMessage
                    : undefined
                }
                sender={message.isMine ? currentUser : peer}
              />
            ))}
            <MessageThreadScrollAnchor lastMessageId={lastMessageId} />
          </div>
        ) : (
          <div className="flex min-h-[18rem] items-center justify-center">
            <div className="max-w-sm p-5 text-center">
              <h2 className="text-base font-semibold text-ink">
                {t.emptyThreadTitle}
              </h2>
              <p className="mt-2 text-sm leading-6 text-[#156240]">
                {canSend ? t.emptyThreadDescription : t.readOnlyDescription}
              </p>
            </div>
          </div>
        )}
      </div>

      {canSend ? (
        <MessageComposer
          activityId={activityContext?.id}
          conversationId={conversationId}
          initialBody={initialBody}
          locale={locale}
          onOptimisticCommit={handleOptimisticCommit}
          onOptimisticFailure={handleOptimisticFailure}
          onOptimisticSend={handleOptimisticSend}
        />
      ) : (
        <ReadOnlyMessageComposer locale={locale} />
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
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#156240]">
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

function ReadOnlyMessageComposer({ locale }: { locale: string }) {
  const t = getDirectMessagesCopy(locale);

  return (
    <div className="shrink-0 border-t border-sand bg-white/92 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur md:rounded-b-[1.45rem] md:pb-3">
      <div className="rounded-[1rem] border border-dashed border-sand bg-team-bg px-3 py-3">
        <p className="text-sm font-semibold text-ink">{t.readOnlyTitle}</p>
        <p className="mt-1 text-xs leading-5 text-[#156240]">
          {t.readOnlyDescription}
        </p>
      </div>
    </div>
  );
}
