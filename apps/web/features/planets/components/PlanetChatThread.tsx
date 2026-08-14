"use client";

import Link from "next/link";
import { Fragment, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { ChatImagePreviewGrid } from "@/features/chat/components/ChatImagePreviewGrid";
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
};

function Avatar({
  avatarUrl,
  name,
}: {
  avatarUrl: string | null;
  name: string;
}) {
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#DDEBE2] text-xs font-bold text-[#155F40]">
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
    setMessages(initialMessages);
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
      <div className="flex min-h-64 flex-1 flex-col items-center justify-center text-[#7E857E]">
        <MessageCircle className="h-8 w-8" />
        <p className="mt-3 text-sm font-semibold">{emptyLabel}</p>
      </div>
    );
  }

  return (
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
                <div
                  className={`relative inline-block rounded-2xl px-3 py-2 text-left text-sm leading-5 ${
                    isViewer
                      ? "rounded-tr-sm bg-[#155F40] text-white after:absolute after:-right-1 after:top-1.5 after:border-b-[5px] after:border-l-[6px] after:border-t-[5px] after:border-b-transparent after:border-l-[#155F40] after:border-t-transparent"
                      : "rounded-tl-sm bg-[#F0F1ED] text-[#171917] after:absolute after:-left-1 after:top-1.5 after:border-b-[5px] after:border-r-[6px] after:border-t-[5px] after:border-b-transparent after:border-r-[#F0F1ED] after:border-t-transparent"
                  }`}
                >
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
                        mentionClassName={
                          isViewer ? "text-[#BDF3D2]" : "text-[#7A2FBE]"
                        }
                        mentionLabels={message.mentionLabels}
                        mentionsEveryone={message.mentionsEveryone}
                      />
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          </Fragment>
        );
      })}
      <div aria-hidden="true" ref={anchorRef} />
    </div>
  );
}
