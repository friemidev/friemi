"use client";

import { ImageIcon, X } from "lucide-react";
import type { ChatReplyTarget } from "@/features/chat/types";

export function getChatReplyCopy(locale: string) {
  if (locale === "fr") {
    return {
      cancel: "Annuler la réponse",
      image: "[Image]",
      reply: "Répondre",
    };
  }

  if (locale === "en") {
    return {
      cancel: "Cancel reply",
      image: "[Image]",
      reply: "Reply",
    };
  }

  return {
    cancel: "取消回复",
    image: "[图片]",
    reply: "回复",
  };
}

function getReplyText(replyTo: ChatReplyTarget, locale: string) {
  const body = replyTo.body.trim().replace(/\s+/g, " ");

  if (body) {
    return body;
  }

  return getChatReplyCopy(locale).image;
}

export function ChatReplyComposerPreview({
  locale,
  onCancel,
  replyTo,
}: {
  locale: string;
  onCancel: () => void;
  replyTo: ChatReplyTarget;
}) {
  const copy = getChatReplyCopy(locale);

  return (
    <div
      className="mb-1.5 flex min-w-0 items-center gap-2 rounded-md bg-[#F2F3F3] pl-3 pr-1 text-left"
      data-chat-reply-composer
    >
      <p className="min-w-0 flex-1 truncate py-2 text-xs leading-5 text-[#686E6B]">
        <span className="font-medium text-[#555B59]">
          {replyTo.senderName}:{" "}
        </span>
        {replyTo.hasImage ? (
          <ImageIcon
            aria-hidden="true"
            className="mr-1 inline h-3 w-3 align-[-2px]"
          />
        ) : null}
        {getReplyText(replyTo, locale)}
      </p>
      <button
        aria-label={copy.cancel}
        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[#626A62] transition hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2F9560]/35"
        onClick={onCancel}
        title={copy.cancel}
        type="button"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export function ChatReplyBubblePreview({
  locale,
  replyTo,
}: {
  locale: string;
  replyTo: ChatReplyTarget;
}) {
  const text = getReplyText(replyTo, locale);

  return (
    <blockquote
      className="mt-1.5 min-w-0 max-w-full rounded-md bg-[#F2F3F3] px-2.5 py-1.5 text-left text-xs font-normal leading-[1.125rem] text-[#686E6B]"
      data-chat-reply
      title={`${replyTo.senderName}: ${text}`}
    >
      <p className="line-clamp-2 [overflow-wrap:anywhere]">
        <span className="font-medium text-[#555B59]">
          {replyTo.senderName}:{" "}
        </span>
        {replyTo.hasImage ? (
          <ImageIcon
            aria-hidden="true"
            className="mr-1 inline h-3 w-3 align-[-2px]"
          />
        ) : null}
        {text}
      </p>
    </blockquote>
  );
}
