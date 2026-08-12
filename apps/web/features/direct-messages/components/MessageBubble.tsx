"use client";

import { CheckCircle2, ListChecks, LoaderCircle, Trash2 } from "lucide-react";
import {
  useEffect,
  useRef,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
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
  actionMenuOpen = false,
  body,
  createdAt,
  deliveryStatus,
  id,
  imageUrls,
  isMine,
  isDeleting = false,
  isSelected = false,
  locale,
  onDelete,
  onOpenActionMenu,
  onRetry,
  onStartSelection,
  onToggleSelection,
  readAt,
  sender,
  senderId,
  selectionMode = false,
}: MessageBubbleViewModel & {
  actionMenuOpen?: boolean;
  isDeleting?: boolean;
  isSelected?: boolean;
  locale: string;
  onDelete?: (messageIds: string[]) => void;
  onOpenActionMenu?: (messageId: string) => void;
  onRetry?: (message: MessageBubbleViewModel) => void;
  onStartSelection?: (messageId: string) => void;
  onToggleSelection?: (messageId: string) => void;
  sender: DirectMessageUserViewModel;
  selectionMode?: boolean;
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
  const canDelete =
    !deliveryStatus &&
    Boolean(
      onDelete &&
        onOpenActionMenu &&
        onStartSelection &&
        onToggleSelection,
    );
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null);
  const suppressNextClickRef = useRef(false);

  function clearLongPressTimer() {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }

  useEffect(
    () => () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
      }
    },
    [],
  );

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (!canDelete || isDeleting || selectionMode || event.button !== 0) {
      return;
    }

    clearLongPressTimer();
    pointerStartRef.current = { x: event.clientX, y: event.clientY };
    longPressTimerRef.current = setTimeout(() => {
      suppressNextClickRef.current = true;
      longPressTimerRef.current = null;
      onOpenActionMenu?.(id);
    }, 450);
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const start = pointerStartRef.current;

    if (
      start &&
      (Math.abs(event.clientX - start.x) > 8 ||
        Math.abs(event.clientY - start.y) > 8)
    ) {
      clearLongPressTimer();
      pointerStartRef.current = null;
    }
  }

  function handlePointerEnd() {
    clearLongPressTimer();
    pointerStartRef.current = null;
  }

  function handleMessageClick() {
    if (suppressNextClickRef.current) {
      suppressNextClickRef.current = false;
      return;
    }

    if (selectionMode && canDelete && !isDeleting) {
      onToggleSelection?.(id);
    }
  }

  function handleMessageKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (
      !canDelete ||
      isDeleting ||
      (event.key !== "Enter" && event.key !== " ")
    ) {
      return;
    }

    event.preventDefault();

    if (selectionMode) {
      onToggleSelection?.(id);
      return;
    }

    onOpenActionMenu?.(id);
  }

  const selectionControl = selectionMode && canDelete ? (
    <button
      aria-label={t.selectMessage}
      aria-pressed={isSelected}
      className={cn(
        "mb-1 inline-flex h-8 w-8 shrink-0 self-end items-center justify-center rounded-full border transition active:scale-95",
        isSelected
          ? "border-[#156240] bg-[#156240] text-white"
          : "border-[#C9CBBE] bg-white text-transparent",
      )}
      disabled={isDeleting}
      onClick={() => onToggleSelection?.(id)}
      title={t.selectMessage}
      type="button"
    >
      <CheckCircle2 className="h-4 w-4" />
    </button>
  ) : null;

  const actionMenu = actionMenuOpen && canDelete && !selectionMode ? (
    <div
      aria-label={`${t.selectMessage} / ${t.deleteMessage}`}
      className="mb-1 flex shrink-0 self-end overflow-hidden rounded-lg border border-[#D8D9CE] bg-white shadow-[0_8px_24px_rgba(17,18,16,0.12)]"
      data-direct-message-action-menu
      role="toolbar"
    >
      <button
        aria-label={t.selectMessage}
        className="inline-flex h-9 w-9 items-center justify-center text-[#156240] transition hover:bg-[#F1F6F2] active:bg-[#E5EEE7]"
        onClick={() => onStartSelection?.(id)}
        title={t.selectMessage}
        type="button"
      >
        <ListChecks className="h-4 w-4" />
      </button>
      <button
        aria-busy={isDeleting}
        aria-label={t.deleteMessage}
        className="inline-flex h-9 w-9 items-center justify-center border-l border-[#E5E5DE] text-[#C6283D] transition hover:bg-[#FFF1F3] active:bg-[#FFE4E8] disabled:cursor-wait disabled:opacity-60"
        disabled={isDeleting}
        onClick={() => onDelete?.([id])}
        title={t.deleteMessage}
        type="button"
      >
        {isDeleting ? (
          <LoaderCircle className="h-4 w-4 animate-spin" />
        ) : (
          <Trash2 className="h-4 w-4" />
        )}
      </button>
    </div>
  ) : null;

  return (
    <div
      className={cn(
        "flex items-start gap-2",
        isMine ? "justify-end" : "justify-start",
      )}
    >
      {!isMine ? <MessageBubbleAvatar locale={locale} user={sender} /> : null}
      {isMine ? actionMenu ?? selectionControl : null}
      <div
        aria-pressed={selectionMode && canDelete ? isSelected : undefined}
        className={cn(
          "relative rounded-2xl text-sm leading-6 shadow-[0_10px_24px_rgba(21,98,64,0.08)] before:absolute before:top-2 before:h-2.5 before:w-2.5 before:rotate-45 before:content-['']",
          actionMenuOpen
            ? "max-w-[56%] sm:max-w-[58%]"
            : selectionMode && canDelete
              ? "max-w-[65%] sm:max-w-[60%]"
              : "max-w-[76%] sm:max-w-[64%]",
          hasImages ? "p-1.5" : "px-3 py-2",
          canDelete && "select-none [-webkit-touch-callout:none]",
          selectionMode && canDelete && "cursor-pointer",
          isSelected && "outline outline-2 outline-offset-2 outline-[#36A15F]",
          isMine
            ? "rounded-tr-md bg-moss text-white before:-right-1 before:bg-moss"
            : "rounded-tl-md bg-white text-ink ring-1 ring-sand before:-left-1 before:border-b before:border-l before:border-sand before:bg-white",
          deliveryStatus === "failed" && "ring-2 ring-[#E98A8A]",
          deliveryStatus === "sending" && "opacity-80",
        )}
        data-direct-message-id={id}
        onClick={handleMessageClick}
        onContextMenu={(event) => {
          if (!canDelete || isDeleting || selectionMode) {
            return;
          }

          event.preventDefault();
          onOpenActionMenu?.(id);
        }}
        onKeyDown={handleMessageKeyDown}
        onPointerCancel={handlePointerEnd}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        role={canDelete ? "button" : undefined}
        tabIndex={canDelete ? 0 : undefined}
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
        ) : statusLabel ? (
          <p
            className={cn(
              "mt-1 px-1 text-[11px]",
              isMine ? "text-white/65" : "text-[#8E8383]",
            )}
          >
            {statusLabel}
          </p>
        ) : null}
      </div>
      {!isMine ? actionMenu ?? selectionControl : null}
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
      <MessageAvatar
        avatarUrl={user.avatarUrl}
        isOnline={user.isOnline}
        name={user.nickname}
        presenceDisplayStatus={user.presenceDisplayStatus}
        size="sm"
      />
    </ContextualDetailLink>
  );
}
