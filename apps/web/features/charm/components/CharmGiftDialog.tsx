"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { Gift, Sparkles, X } from "lucide-react";
import {
  getActiveCharmGifts,
  getCharmGiftLabel,
} from "@/features/charm/charm";
import {
  sendCharmGiftAction,
  type SendCharmGiftState,
} from "@/features/charm/actions/sendCharmGift";
import { getSignInHref } from "@/lib/auth-redirect";
import { cn } from "@/lib/utils";

type CharmGiftDialogProps = {
  isAuthenticated: boolean;
  locale: string;
  recipientName: string;
  recipientProfileId: string;
  triggerClassName?: string;
};

const initialGiftState: SendCharmGiftState = {};

function createGiftAttemptId() {
  return (
    globalThis.crypto?.randomUUID?.() ??
    `${Date.now()}-${Math.random().toString(36).slice(2)}`
  );
}

function getGiftDialogCopy(locale: string) {
  if (locale === "fr") {
    return {
      cancel: "Annuler",
      close: "Fermer",
      send: "Envoyer",
      sendGift: "Cadeau",
      sending: "Envoi...",
      title: "Offrir",
      to: "Pour",
    };
  }

  if (locale === "en") {
    return {
      cancel: "Cancel",
      close: "Close",
      send: "Send",
      sendGift: "Gift",
      sending: "Sending...",
      title: "Send gift",
      to: "To",
    };
  }

  return {
    cancel: "取消",
    close: "关闭",
    send: "送出",
    sendGift: "送礼",
    sending: "送出中...",
    title: "送礼物",
    to: "送给",
  };
}

function SendGiftSubmitButton({
  label,
  pendingLabel,
}: {
  label: string;
  pendingLabel: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      className="inline-flex h-10 min-w-24 items-center justify-center rounded-full bg-[#156240] px-5 text-xs font-black text-white shadow-[0_12px_22px_rgba(21,98,64,0.18)] transition active:scale-95 disabled:opacity-60"
      disabled={pending}
      type="submit"
    >
      {pending ? pendingLabel : label}
    </button>
  );
}

export function CharmGiftDialog({
  isAuthenticated,
  locale,
  recipientName,
  recipientProfileId,
  triggerClassName,
}: CharmGiftDialogProps) {
  const copy = getGiftDialogCopy(locale);
  const gifts = useMemo(() => getActiveCharmGifts(), []);
  const [open, setOpen] = useState(false);
  const [attemptId, setAttemptId] = useState("");
  const [selectedGiftId, setSelectedGiftId] = useState(gifts[0]?.id ?? "");
  const [state, formAction] = useActionState(
    sendCharmGiftAction,
    initialGiftState,
  );
  const router = useRouter();
  const redirectPath = `/profile/${recipientProfileId}`;
  const formError = state.attemptId === attemptId ? state.formError : undefined;

  useEffect(() => {
    if (!state.ok || !state.eventId || state.attemptId !== attemptId) {
      return;
    }

    setOpen(false);
    setAttemptId("");
    router.refresh();
  }, [attemptId, router, state.attemptId, state.eventId, state.ok]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousBodyOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  if (!isAuthenticated) {
    return (
      <Link
        href={getSignInHref(locale, redirectPath)}
        className={cn(
          "inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-black text-[#9A2135] transition active:scale-95",
          triggerClassName,
        )}
      >
        <Gift className="h-4 w-4 shrink-0" />
        {copy.sendGift}
      </Link>
    );
  }

  if (gifts.length === 0) {
    return null;
  }

  return (
    <>
      <button
        className={cn(
          "inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-black text-[#9A2135] transition active:scale-95",
          triggerClassName,
        )}
        onClick={() => {
          setAttemptId(createGiftAttemptId());
          setOpen(true);
        }}
        type="button"
      >
        <Gift className="h-4 w-4 shrink-0" />
        {copy.sendGift}
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#111210]/28 px-4 pb-4 pt-12 backdrop-blur-[2px] md:items-center md:pb-12">
          <button
            aria-label={copy.close}
            className="absolute inset-0 cursor-default"
            onClick={() => setOpen(false)}
            type="button"
          />
          <div
            aria-modal="true"
            className="relative max-h-[calc(100dvh-2rem)] w-full max-w-[390px] overflow-hidden rounded-[1.5rem] bg-[#FEFFF9] shadow-[0_26px_70px_rgba(17,18,16,0.22)] ring-1 ring-[#E4DDBE]"
            role="dialog"
          >
            <div className="flex items-start justify-between gap-3 border-b border-[#ECE5CD] px-5 pb-4 pt-5">
              <div className="min-w-0">
                <p className="flex items-center gap-2 text-[17px] font-black leading-tight text-[#111210]">
                  <Sparkles className="h-4 w-4 text-[#A57AEB]" />
                  {copy.title}
                </p>
                <p className="mt-1 truncate text-xs font-bold text-[#7A8276]">
                  {copy.to} {recipientName}
                </p>
              </div>
              <button
                aria-label={copy.close}
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-[#1D1D1B] ring-1 ring-[#ECE6D5] transition active:scale-95"
                onClick={() => setOpen(false)}
                type="button"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form
              action={formAction}
              className="grid max-h-[calc(100dvh-8.5rem)] gap-4 overflow-y-auto px-5 py-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              <input name="attemptId" type="hidden" value={attemptId} />
              <input name="giftId" type="hidden" value={selectedGiftId} />
              <input name="locale" type="hidden" value={locale} />
              <input
                name="recipientProfileId"
                type="hidden"
                value={recipientProfileId}
              />
              <input name="redirectPath" type="hidden" value={redirectPath} />

              <div className="grid grid-cols-3 gap-2">
                {gifts.map((gift) => {
                  const selected = selectedGiftId === gift.id;

                  return (
                    <button
                      aria-pressed={selected}
                      className={cn(
                        "grid min-h-[78px] min-w-0 content-center justify-items-center gap-1 rounded-lg border px-2 py-2 text-center transition active:scale-[0.98]",
                        selected
                          ? "border-[#156240] bg-[#F4FAF0] shadow-[0_10px_18px_rgba(21,98,64,0.10)]"
                          : "border-[#E6DEC6] bg-white/72",
                      )}
                      key={gift.id}
                      onClick={() => setSelectedGiftId(gift.id)}
                      type="button"
                    >
                      <span className="text-[22px] leading-none">
                        {gift.emoji}
                      </span>
                      <span className="max-w-full truncate text-[11px] font-black text-[#1D1D1B]">
                        {getCharmGiftLabel(gift, locale)}
                      </span>
                      <span className="text-[10px] font-bold text-[#7A8276]">
                        +{gift.charmValue}
                      </span>
                    </button>
                  );
                })}
              </div>

              {formError ? (
                <p className="text-xs font-bold text-[#9A2135]">
                  {formError}
                </p>
              ) : null}

              <div className="flex items-center justify-end gap-2">
                <button
                  className="inline-flex h-10 items-center justify-center rounded-full px-4 text-xs font-black text-[#4F574F] transition active:scale-95"
                  onClick={() => setOpen(false)}
                  type="button"
                >
                  {copy.cancel}
                </button>
                <SendGiftSubmitButton
                  label={copy.send}
                  pendingLabel={copy.sending}
                />
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
