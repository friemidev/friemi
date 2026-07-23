"use client";

import { formatActivityDate } from "@chill-club/shared";
import { ContextualDetailLink } from "@/features/navigation/components/ContextualDetailLink";
import { cn } from "@/lib/utils";
import { withLocale } from "@/lib/routes";
import { getDirectMessagesCopy } from "../copy";
import type { DirectMessageUserViewModel } from "../queries/getDirectMessages";
import { MessageAvatar } from "./MessageAvatar";
import { MessageImagePreviewGrid } from "./MessageImagePreviewGrid";

export type MessageBubbleDeliveryStatus = "sending" | "failed";

export type MessageBubbleViewModel = {
  id: string;
  senderId: string;
  body: string;
  imageUrls: string[];
  readAt: string | null;
  createdAt: string;
  isMine: boolean;
  deliveryStatus?: MessageBubbleDeliveryStatus;
};

export function MessageBubble({
  body,
  createdAt,
  deliveryStatus,
  id,
  imageUrls,
  isMine,
  locale,
  onRetry,
  readAt,
  sender,
  senderId,
}: MessageBubbleViewModel & {
  locale: string;
  onRetry?: (message: MessageBubbleViewModel) => void;
  sender: DirectMessageUserViewModel;
}) {
  const hasBody = body.trim().length > 0;
  const hasImages = imageUrls.length > 0;
  const t = getDirectMessagesCopy(locale);
  const statusLabel =
    deliveryStatus === "sending"
      ? t.sendingStatus
      : deliveryStatus === "failed"
        ? t.sendFailedStatus
        : null;

  return (
    <div
      className={cn(
        "flex items-start gap-2",
        isMine ? "justify-end" : "justify-start",
      )}
    >
      {!isMine ? <MessageBubbleAvatar locale={locale} user={sender} /> : null}
      <div
        className={cn(
          "max-w-[76%] rounded-2xl text-sm leading-6 shadow-[0_10px_24px_rgba(21,98,64,0.08)] sm:max-w-[64%]",
          hasImages ? "p-1.5" : "px-3 py-2",
          isMine
            ? "rounded-tr-md bg-moss text-white"
            : "rounded-tl-md bg-white text-ink ring-1 ring-sand",
          deliveryStatus === "failed" && "ring-2 ring-[#E98A8A]",
          deliveryStatus === "sending" && "opacity-80",
        )}
      >
        {hasImages ? (
          <MessageImagePreviewGrid
            imageLabel={t.imageMessage}
            imageUrls={imageUrls}
            resetLabel={t.resetImagePreview}
          />
        ) : null}
        {hasBody ? (
          <p
            className={cn(
              "whitespace-pre-wrap break-words",
              hasImages && "px-1 pt-2",
            )}
          >
            {body}
          </p>
        ) : null}
        {deliveryStatus === "failed" && onRetry ? (
          <button
            type="button"
            className={cn(
              "mt-1 block px-1 text-left text-[11px] font-semibold underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50",
              isMine ? "text-[#FFE4E4]" : "text-[#9A2135]",
            )}
            onClick={() =>
              onRetry({
                id,
                senderId,
                body,
                imageUrls,
                readAt,
                createdAt,
                isMine,
                deliveryStatus,
              })
            }
          >
            {statusLabel} · {t.retrySend}
          </button>
        ) : (
          <p
            className={cn(
              "mt-1 px-1 text-[11px]",
              isMine ? "text-white/65" : "text-[#8E8383]",
            )}
          >
            {statusLabel ?? formatActivityDate(createdAt, locale)}
          </p>
        )}
      </div>
      {isMine ? <MessageBubbleAvatar locale={locale} user={sender} /> : null}
    </div>
  );
}

function MessageBubbleAvatar({
  locale,
  user,
}: {
  locale: string;
  user: DirectMessageUserViewModel;
}) {
  return (
    <ContextualDetailLink
      aria-label={user.nickname}
      className="shrink-0 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-moss/30"
      href={withLocale(locale, `/profile/${user.id}`)}
      detailSource={{
        sourceKey: "messages",
        targetKey: `profile:${user.id}`,
        targetKind: "profile",
      }}
      title={user.nickname}
    >
      <MessageAvatar avatarUrl={user.avatarUrl} name={user.nickname} size="sm" />
    </ContextualDetailLink>
  );
}
