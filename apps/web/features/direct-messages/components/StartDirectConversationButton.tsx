"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { LoaderCircle, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { withLocale } from "@/lib/routes";
import {
  createDirectConversationAction,
  type DirectMessageActionState,
} from "../actions/directMessageActions";
import { getDirectMessagesCopy } from "../copy";
import { saveMessageThreadReturnHref } from "../utils/messageThreadReturn";

type StartDirectConversationButtonProps = {
  buttonClassName?: string;
  children?: ReactNode;
  className?: string;
  errorClassName?: string;
  hideIcon?: boolean;
  label?: string;
  locale: string;
  nowInviteId?: string;
  peerProfileId: string;
  redirectPath: string;
};

const initialState: DirectMessageActionState = {};

function SubmitButton({
  buttonClassName,
  children,
  hideIcon,
  label,
  locale,
}: {
  buttonClassName?: string;
  children?: ReactNode;
  hideIcon?: boolean;
  label: string;
  locale: string;
}) {
  const { pending } = useFormStatus();
  const t = getDirectMessagesCopy(locale);

  return (
    <button
      className={cn(
        "inline-flex h-10 min-w-0 items-center justify-center gap-2 rounded-full bg-[#156240] px-4 text-sm font-semibold text-white shadow-[0_10px_20px_rgba(21,98,64,0.16)] transition hover:bg-[#0F5134] active:scale-[0.98] disabled:cursor-wait disabled:opacity-75",
        buttonClassName,
      )}
      disabled={pending}
      type="submit"
    >
      {pending ? (
        <LoaderCircle className="h-4 w-4 shrink-0 animate-spin" />
      ) : hideIcon ? null : (
        <MessageCircle className="h-4 w-4 shrink-0" />
      )}
      <span className="truncate">
        {pending ? t.openingConversation : (children ?? label)}
      </span>
    </button>
  );
}

export function StartDirectConversationButton({
  buttonClassName,
  children,
  className,
  errorClassName,
  hideIcon = false,
  label,
  locale,
  nowInviteId,
  peerProfileId,
  redirectPath,
}: StartDirectConversationButtonProps) {
  const router = useRouter();
  const [state, action] = useActionState(
    createDirectConversationAction,
    initialState,
  );
  const t = getDirectMessagesCopy(locale);
  const buttonLabel = label ?? t.startConversation;

  useEffect(() => {
    if (state.ok && state.conversationId) {
      const query = nowInviteId
        ? `?nowId=${encodeURIComponent(nowInviteId)}`
        : "";
      router.push(
        withLocale(locale, `/messages/${state.conversationId}${query}`),
      );
    }
  }, [locale, nowInviteId, router, state.conversationId, state.ok]);

  return (
    <form
      action={action}
      className={cn("grid min-w-0 gap-1.5", className)}
      onSubmit={() => saveMessageThreadReturnHref()}
    >
      <input name="locale" type="hidden" value={locale} />
      <input name="friendProfileId" type="hidden" value={peerProfileId} />
      <input name="redirectPath" type="hidden" value={redirectPath} />
      <SubmitButton
        buttonClassName={buttonClassName}
        hideIcon={hideIcon}
        label={buttonLabel}
        locale={locale}
      >
        {children}
      </SubmitButton>
      {state.formError ? (
        <p
          className={cn(
            "text-xs font-bold leading-5 text-[#9A2135]",
            errorClassName,
          )}
        >
          {state.formError}
        </p>
      ) : null}
    </form>
  );
}
