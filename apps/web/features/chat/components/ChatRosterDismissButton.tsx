"use client";

import { LoaderCircle, Trash2 } from "lucide-react";
import { useFormStatus } from "react-dom";
import { hideActivityRoomConversationAction } from "@/features/activity-room-chat/actions/activityRoomChatActions";
import { hideDirectConversationAction } from "@/features/direct-messages/actions/directMessageActions";
import { hidePlanetChatConversationAction } from "@/features/planets/actions/planetActions";
import { cn } from "@/lib/utils";

type ChatRosterDismissButtonProps = {
  activityId?: string;
  className?: string;
  conversationId?: string;
  kind: "activity" | "direct" | "planet";
  locale: string;
  onDismiss?: () => void;
  planetId?: string;
  planetSlug?: string;
};

function getLabel(locale: string) {
  if (locale === "fr") return "Retirer la discussion de la liste";
  if (locale === "en") return "Remove chat from list";
  return "从列表删除聊天";
}

function SubmitButton({
  className,
  label,
}: {
  className?: string;
  label: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      aria-label={label}
      className={cn(
        "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[#8F9189] transition hover:bg-[#F3F3EF] hover:text-[#B5301F] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#156240]/25 disabled:opacity-45",
        className,
      )}
      disabled={pending}
      title={label}
      type="submit"
    >
      {pending ? (
        <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
      ) : (
        <Trash2 className="h-4 w-4" aria-hidden="true" />
      )}
    </button>
  );
}

export function ChatRosterDismissButton({
  activityId,
  className,
  conversationId,
  kind,
  locale,
  onDismiss,
  planetId,
  planetSlug,
}: ChatRosterDismissButtonProps) {
  const action =
    kind === "direct"
      ? hideDirectConversationAction
      : kind === "activity"
        ? hideActivityRoomConversationAction
        : hidePlanetChatConversationAction;
  const isComplete =
    (kind === "direct" && Boolean(conversationId)) ||
    (kind === "activity" && Boolean(activityId)) ||
    (kind === "planet" && Boolean(planetId && planetSlug));

  if (!isComplete) {
    return null;
  }

  const label = getLabel(locale);

  return (
    <form action={action} className="shrink-0" onSubmit={onDismiss}>
      <input name="locale" type="hidden" value={locale} />
      {conversationId ? (
        <input name="conversationId" type="hidden" value={conversationId} />
      ) : null}
      {activityId ? (
        <input name="activityId" type="hidden" value={activityId} />
      ) : null}
      {planetId ? (
        <input name="planetId" type="hidden" value={planetId} />
      ) : null}
      {planetSlug ? (
        <input name="planetSlug" type="hidden" value={planetSlug} />
      ) : null}
      <SubmitButton className={className} label={label} />
    </form>
  );
}
