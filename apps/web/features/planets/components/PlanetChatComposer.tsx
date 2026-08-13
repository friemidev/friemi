"use client";

import { LoaderCircle, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef } from "react";
import {
  sendPlanetMessageAction,
  type PlanetChatActionState,
} from "@/features/planets/actions/planetActions";
import { keepMobileChatPageAnchored } from "@/lib/mobile-chat-viewport";

type PlanetChatComposerProps = {
  locale: string;
  planetId: string;
  planetSlug: string;
};

function getCopy(locale: string) {
  if (locale === "fr") {
    return {
      placeholder: "Écrivez un message...",
      send: "Envoyer le message",
    };
  }

  if (locale === "en") {
    return {
      placeholder: "Write a message...",
      send: "Send message",
    };
  }

  return {
    placeholder: "输入消息...",
    send: "发送消息",
  };
}

export function PlanetChatComposer({
  locale,
  planetId,
  planetSlug,
}: PlanetChatComposerProps) {
  const copy = getCopy(locale);
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const initialState: PlanetChatActionState = {};
  const [state, formAction, isPending] = useActionState(
    sendPlanetMessageAction,
    initialState,
  );

  useEffect(() => {
    if (!state.ok || !state.messageId) return;

    formRef.current?.reset();
    router.refresh();
    keepMobileChatPageAnchored();
  }, [router, state.messageId, state.ok]);

  return (
    <div>
      <form
        action={formAction}
        className="flex items-center gap-2"
        data-planet-chat-composer
        ref={formRef}
      >
        <input name="locale" type="hidden" value={locale} />
        <input name="planetId" type="hidden" value={planetId} />
        <input name="planetSlug" type="hidden" value={planetSlug} />
        <input
          className="min-w-0 flex-1 rounded-full border border-[#E7E2D6] bg-white px-4 py-2.5 text-sm outline-none placeholder:text-[#A5A29A] focus:border-[#8AB68E] disabled:bg-[#F4F4F0]"
          disabled={isPending}
          maxLength={1000}
          name="content"
          onFocus={keepMobileChatPageAnchored}
          placeholder={copy.placeholder}
          required
        />
        <button
          aria-busy={isPending}
          aria-label={copy.send}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#156240] text-white transition active:scale-95 disabled:cursor-wait disabled:opacity-60"
          disabled={isPending}
          type="submit"
        >
          {isPending ? (
            <LoaderCircle className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </button>
      </form>
      {state.formError ? (
        <p aria-live="polite" className="mt-2 px-2 text-xs font-bold text-[#A52B3B]">
          {state.formError}
        </p>
      ) : null}
    </div>
  );
}
