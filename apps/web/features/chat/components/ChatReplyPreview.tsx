"use client";

import { ImageIcon, X } from "lucide-react";
import type { ChatReplyTarget } from "@/features/chat/types";
import { cn } from "@/lib/utils";

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
    <div className="mb-2 flex min-w-0 items-center gap-2 border-l-2 border-[#2F9560] bg-[#F3F6F2] px-3 py-2 text-left">
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-bold text-[#156240]">
          {copy.reply} {replyTo.senderName}
        </p>
        <p className="mt-0.5 flex min-w-0 items-center gap-1 truncate text-xs text-[#687168]">
          {replyTo.hasImage ? <ImageIcon className="h-3 w-3 shrink-0" /> : null}
          <span className="truncate">{getReplyText(replyTo, locale)}</span>
        </p>
      </div>
      <button
        aria-label={copy.cancel}
        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#626A62] transition hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2F9560]/35"
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
  inverted = false,
  locale,
  replyTo,
}: {
  inverted?: boolean;
  locale: string;
  replyTo: ChatReplyTarget;
}) {
  return (
    <div
      className={cn(
        "mb-1.5 min-w-0 border-l-2 px-2 py-1 text-left",
        inverted
          ? "border-white/65 bg-black/12 text-white/78"
          : "border-[#75A98A] bg-[#F2F4EF] text-[#5F685F]",
      )}
    >
      <p
        className={cn(
          "truncate text-[11px] font-bold",
          inverted && "text-white/88",
        )}
      >
        {replyTo.senderName}
      </p>
      <p className="mt-0.5 flex min-w-0 items-center gap-1 truncate text-[11px] leading-4">
        {replyTo.hasImage ? <ImageIcon className="h-3 w-3 shrink-0" /> : null}
        <span className="truncate">{getReplyText(replyTo, locale)}</span>
      </p>
    </div>
  );
}
