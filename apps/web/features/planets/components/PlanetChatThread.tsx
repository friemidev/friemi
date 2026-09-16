"use client";

import Link from "next/link";
import { Fragment, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, MessageCircle, Reply } from "lucide-react";
import { RetainedImage } from "@/components/media/RetainedImage";
import { ChatImagePreviewGrid } from "@/features/chat/components/ChatImagePreviewGrid";
import {
  ChatReplyBubblePreview,
  getChatReplyCopy,
} from "@/features/chat/components/ChatReplyPreview";
import { dispatchChatReplyRequest } from "@/features/chat/chatReplyEvents";
import type { ChatReplyTarget } from "@/features/chat/types";
import { ChatMentionText } from "@/features/chat/components/ChatMentionText";
import {
  formatChatDateSeparator,
  formatChatMessageTime,
  getChatDateKey,
  shouldShowChatTimeSeparator,
} from "@/lib/chatDateSeparators";
import { getAvatarInitial } from "@/lib/display-text";
import { useMobileChatViewportGuard } from "@/lib/mobile-chat-viewport";
import { withLocale } from "@/lib/routes";
import { useChatCursorSync } from "@/features/chat/useChatCursorSync";
import { mergeChatCursorMessages } from "@/features/chat/chatCursorSync";
import { useChatHistoryPagination } from "@/features/chat/useChatHistoryPagination";
import { cn } from "@/lib/utils";

export type PlanetChatThreadMessage = {
  author: {
    avatarUrl: string | null;
    nickname: string;
  };
  authorId: string;
  content: string;
  createdAt: string;
  id: string;
  imageUrls: string[];
  mentionedProfileIds: string[];
  mentionLabels: string[];
  mentionsEveryone: boolean;
  replyTo: ChatReplyTarget | null;
};

type PlanetImageCopy = {
  image: string;
  reset: string;
  save: string;
  saving: string;
};

function PlanetMessageBubble({
  imageCopy,
  isViewer,
  locale,
  message,
  planetId,
}: {
  imageCopy: PlanetImageCopy;
  isViewer: boolean;
  locale: string;
  message: PlanetChatThreadMessage;
  planetId: string;
}) {
  const [actionOpen, setActionOpen] = useState(false);
  const longPressTimerRef = useRef<number | null>(null);
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null);
  const suppressNextClickRef = useRef(false);
  const replyCopy = getChatReplyCopy(locale);

  function clearLongPressTimer() {
    if (longPressTimerRef.current) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }

  useEffect(() => () => {
    clearLongPressTimer();
  });

  function requestReply() {
    dispatchChatReplyRequest({
      scopeId: planetId,
      replyTo: {
        body: message.content,
        hasImage: message.imageUrls.length > 0,
        messageId: message.id,
        senderName: message.author.nickname,
      },
    });
    setActionOpen(false);
  }

  return (
    <div className="relative inline-block max-w-full">
      {actionOpen ? (
        <div
          className={cn(
            "absolute bottom-[calc(100%+0.4rem)] z-20 overflow-hidden rounded-lg border border-[#D8D9CE] bg-white shadow-[0_8px_24px_rgba(17,18,16,0.16)]",
            isViewer ? "right-0" : "left-0",
          )}
          data-planet-message-action-menu
          role="toolbar"
        >
          <button
            aria-label={replyCopy.reply}
            className="inline-flex h-10 items-center gap-1.5 px-3 text-xs font-bold text-[#156240] transition hover:bg-[#F1F6F2] active:bg-[#E5EEE7]"
            onClick={requestReply}
            title={replyCopy.reply}
            type="button"
          >
            <Reply className="h-4 w-4" />
            {replyCopy.reply}
          </button>
        </div>
      ) : null}
      <div
        className={cn(
          "relative inline-block select-none rounded-2xl px-3 py-2 text-left text-sm leading-5 [-webkit-touch-callout:none]",
          isViewer
            ? "rounded-tr-sm bg-[#155F40] text-white after:absolute after:-right-1 after:top-1.5 after:border-b-[5px] after:border-l-[6px] after:border-t-[5px] after:border-b-transparent after:border-l-[#155F40] after:border-t-transparent"
            : "rounded-tl-sm bg-[#F0F1ED] text-[#171917] after:absolute after:-left-1 after:top-1.5 after:border-b-[5px] after:border-r-[6px] after:border-t-[5px] after:border-b-transparent after:border-r-[#F0F1ED] after:border-t-transparent",
        )}
        data-planet-message-id={message.id}
        onClick={() => {
          if (suppressNextClickRef.current) {
            suppressNextClickRef.current = false;
            return;
          }
          setActionOpen(false);
        }}
        onContextMenu={(event) => {
          event.preventDefault();
          setActionOpen(true);
        }}
        onPointerCancel={() => {
          clearLongPressTimer();
          pointerStartRef.current = null;
        }}
        onPointerDown={(event) => {
          if (
            event.button !== 0 ||
            (event.target instanceof Element &&
              event.target.closest("[data-chat-image-preview='true']"))
          ) {
            return;
          }

          pointerStartRef.current = { x: event.clientX, y: event.clientY };
          clearLongPressTimer();
          longPressTimerRef.current = window.setTimeout(() => {
            longPressTimerRef.current = null;
            suppressNextClickRef.current = true;
            setActionOpen(true);
          }, 450);
        }}
        onPointerMove={(event) => {
          const start = pointerStartRef.current;
          if (
            start &&
            (Math.abs(event.clientX - start.x) > 8 ||
              Math.abs(event.clientY - start.y) > 8)
          ) {
            clearLongPressTimer();
            pointerStartRef.current = null;
          }
        }}
        onPointerUp={() => {
          clearLongPressTimer();
          pointerStartRef.current = null;
        }}
      >
        {message.replyTo ? (
          <ChatReplyBubblePreview
            inverted={isViewer}
            locale={locale}
            replyTo={message.replyTo}
          />
        ) : null}
        {message.imageUrls.length ? (
          <ChatImagePreviewGrid
            imageLabel={imageCopy.image}
            imageUrls={message.imageUrls}
            resetLabel={imageCopy.reset}
            saveLabel={imageCopy.save}
            savedLabel={imageCopy.saving}
          />
        ) : null}
        {message.content.trim() ? (
          <p className={message.imageUrls.length ? "px-1 pt-2" : ""}>
            <ChatMentionText
              content={message.content}
              mentionClassName={isViewer ? "text-[#BDF3D2]" : "text-[#7A2FBE]"}
              mentionLabels={message.mentionLabels}
              mentionsEveryone={message.mentionsEveryone}
            />
          </p>
        ) : null}
      </div>
    </div>
  );
}

function Avatar({
  avatarUrl,
  name,
}: {
  avatarUrl: string | null;
  name: string;
}) {
  return (
    <span className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#DDEBE2] text-xs font-bold text-[#155F40]">
      <span aria-hidden="true">{getAvatarInitial(name)}</span>
      {avatarUrl ? (
        <RetainedImage
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          referrerPolicy="no-referrer"
          src={avatarUrl}
        />
      ) : null}
    </span>
  );
}

function TimeSeparator({
  createdAt,
  locale,
  showDate,
}: {
  createdAt: string;
  locale: string;
  showDate: boolean;
}) {
  const dateLabel = showDate ? formatChatDateSeparator(createdAt, locale) : "";
  const timeLabel = formatChatMessageTime(createdAt, locale);
  const label = [dateLabel, timeLabel].filter(Boolean).join(" ");

  return (
    <div aria-label={label} className="my-1 flex items-center gap-3 px-8">
      <span className="h-px flex-1 bg-[#E8E5DA]" />
      <span className="rounded-full bg-white px-3 py-1 text-[11px] font-bold text-[#8A9088] ring-1 ring-[#E8E5DA]">
        {label}
      </span>
      <span className="h-px flex-1 bg-[#E8E5DA]" />
    </div>
  );
}

export function PlanetChatThread({
  locale,
  messages: initialMessages,
  planetId,
  viewerProfileId,
}: {
  locale: string;
  messages: PlanetChatThreadMessage[];
  planetId: string;
  viewerProfileId: string;
}) {
  const router = useRouter();
  const [messages, setMessages] =
    useState<PlanetChatThreadMessage[]>(initialMessages);
  const chatCursorMode = useChatCursorSync({
    endpoint: `/api/planets/${encodeURIComponent(planetId)}/messages`,
    messages,
    setMessages,
    subjectKey: planetId,
  });
  const chatHistory = useChatHistoryPagination({
    endpoint: `/api/planets/${encodeURIComponent(planetId)}/messages`,
    initialPageSize: 40,
    messages,
    setMessages,
  });
  const anchorRef = useRef<HTMLDivElement>(null);
  const lastMessageId = messages.at(-1)?.id;
  const emptyLabel =
    locale === "fr"
      ? "Aucun message pour le moment."
      : locale === "en"
        ? "No messages yet."
        : "还没有消息";
  const imageCopy =
    locale === "fr"
      ? {
          image: "Image",
          reset: "Réinitialiser",
          save: "Enregistrer l'image",
          saving: "Enregistrement...",
        }
      : locale === "en"
        ? {
            image: "Image",
            reset: "Reset",
            save: "Save image",
            saving: "Saving image...",
          }
        : {
            image: "图片",
            reset: "重置",
            save: "保存到相册",
            saving: "正在保存...",
          };

  useMobileChatViewportGuard();

  useEffect(() => {
    setMessages((current) => mergeChatCursorMessages(current, initialMessages));
  }, [initialMessages]);

  useEffect(() => {
    anchorRef.current?.scrollIntoView({ block: "end" });
  }, [lastMessageId]);

  useEffect(() => {
    if (chatCursorMode === "canary") {
      return;
    }

    const timer = window.setInterval(() => {
      const composer = document.querySelector("[data-planet-chat-composer]");
      const input = composer?.querySelector("input[name='content']");
      const isComposing = Boolean(
        document.activeElement?.closest("[data-planet-chat-composer]"),
      );
      const hasDraft =
        input instanceof HTMLInputElement && Boolean(input.value.trim());

      if (document.visibilityState === "visible" && !isComposing && !hasDraft) {
        router.refresh();
      }
    }, 8000);

    return () => window.clearInterval(timer);
  }, [chatCursorMode, planetId, router]);

  if (!messages.length) {
    return (
      <div
        className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto px-7 text-[#7E857E]"
        onScroll={chatHistory.onScroll}
        ref={chatHistory.scrollContainerRef}
      >
        <MessageCircle className="h-8 w-8" />
        <p className="mt-3 text-sm font-semibold">{emptyLabel}</p>
      </div>
    );
  }

  return (
    <div
      className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-white px-3 py-4 sm:px-5"
      onScroll={chatHistory.onScroll}
      ref={chatHistory.scrollContainerRef}
    >
      {chatHistory.isLoadingOlder ? (
        <div
          aria-label={
            locale === "fr"
              ? "Chargement des messages"
              : locale === "en"
                ? "Loading messages"
                : "正在加载聊天记录"
          }
          className="flex h-9 items-center justify-center text-[#7D857D]"
          role="status"
        >
          <LoaderCircle className="h-4 w-4 animate-spin" />
        </div>
      ) : null}
      <div className="grid gap-3">
        {messages.map((message, index) => {
          const previousMessage = messages[index - 1];
          const showDate =
            !previousMessage ||
            getChatDateKey(previousMessage.createdAt) !==
              getChatDateKey(message.createdAt);
          const showTime = shouldShowChatTimeSeparator(
            message.createdAt,
            previousMessage?.createdAt,
          );
          const isViewer = message.authorId === viewerProfileId;

          return (
            <Fragment key={message.id}>
              {showTime ? (
                <TimeSeparator
                  createdAt={message.createdAt}
                  locale={locale}
                  showDate={showDate}
                />
              ) : null}
              <div
                className={`flex items-start gap-2 ${isViewer ? "flex-row-reverse" : ""}`}
              >
                <Link
                  aria-label={message.author.nickname}
                  className="shrink-0 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-[#369758]/45"
                  href={withLocale(locale, `/profile/${message.authorId}`)}
                  prefetch={false}
                  title={message.author.nickname}
                >
                  <Avatar
                    avatarUrl={message.author.avatarUrl}
                    name={message.author.nickname}
                  />
                </Link>
                <div className={`max-w-[76%] ${isViewer ? "text-right" : ""}`}>
                  {!isViewer ? (
                    <p className="mb-1 px-1 text-[11px] font-semibold text-[#838A83]">
                      {message.author.nickname}
                    </p>
                  ) : null}
                  <PlanetMessageBubble
                    imageCopy={imageCopy}
                    isViewer={isViewer}
                    locale={locale}
                    message={message}
                    planetId={planetId}
                  />
                </div>
              </div>
            </Fragment>
          );
        })}
        <div aria-hidden="true" ref={anchorRef} />
      </div>
    </div>
  );
}
