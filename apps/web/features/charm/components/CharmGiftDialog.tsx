"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useActionState, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useFormStatus } from "react-dom";
import {
  AlertCircle,
  CheckCircle2,
  Coins,
  Gift,
  Minus,
  Plus,
  Sparkles,
  X,
} from "lucide-react";
import { getActiveCharmGifts, getCharmGiftLabel } from "@/features/charm/charm";
import {
  getViewerFriemiCoinBalanceClientAction,
  sendCharmGiftAction,
  type SendCharmGiftState,
} from "@/features/charm/actions/sendCharmGift";
import { getSignInHref } from "@/lib/auth-redirect";
import { cn } from "@/lib/utils";

type CharmGiftDialogProps = {
  isAuthenticated: boolean;
  locale: string;
  redirectPath?: string;
  recipientName: string;
  recipientProfileId: string;
  sourceContextId?: string;
  sourceSurface?:
    | "PROFILE"
    | "ACTIVITY"
    | "MOMENT"
    | "PLANET"
    | "DIRECT_MESSAGE"
    | "OTHER";
  triggerAriaLabel?: string;
  triggerClassName?: string;
  triggerContent?: ReactNode;
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
      balanceLabel: "Solde",
      balanceLoading: "Chargement...",
      cancel: "Annuler",
      charmUnit: "charme",
      close: "Fermer",
      currency: "Friemi Coins",
      failureTitle: "Cadeau non envoyé",
      requiredLabel: "Requis",
      quantity: "Quantite",
      send: "Envoyer",
      sendGift: "Cadeau",
      sending: "Envoi...",
      sent: "Cadeau envoye. Vous pouvez continuer.",
      total: "Total",
      testMode: "Ce cadeau debite votre solde Friemi Coins.",
      title: "Offrir",
      to: "Pour",
    };
  }

  if (locale === "en") {
    return {
      balanceLabel: "Balance",
      balanceLoading: "Loading...",
      cancel: "Cancel",
      charmUnit: "charm",
      close: "Close",
      currency: "Friemi Coins",
      failureTitle: "Gift not sent",
      requiredLabel: "Required",
      quantity: "Quantity",
      send: "Send",
      sendGift: "Gift",
      sending: "Sending...",
      sent: "Gift sent. You can send another.",
      total: "Total",
      testMode: "This gift deducts Friemi coins from your balance.",
      title: "Send gift",
      to: "To",
    };
  }

  return {
    balanceLabel: "余额",
    balanceLoading: "加载中...",
    cancel: "取消",
    charmUnit: "魅力值",
    close: "关闭",
    currency: "Friemi 币",
    failureTitle: "礼物没有送出",
    requiredLabel: "需要",
    quantity: "数量",
    send: "送出",
    sendGift: "送礼",
    sending: "送出中...",
    sent: "礼物已送出，可以继续赠送。",
    total: "合计",
    testMode: "送礼会扣除 Friemi 币。",
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
      className="inline-flex h-10 min-w-24 items-center justify-center rounded-full bg-[#156240] px-5 text-xs font-bold text-white shadow-[0_12px_22px_rgba(21,98,64,0.18)] transition active:scale-95 disabled:opacity-60"
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
  redirectPath,
  recipientName,
  recipientProfileId,
  sourceContextId,
  sourceSurface = "PROFILE",
  triggerAriaLabel,
  triggerClassName,
  triggerContent,
}: CharmGiftDialogProps) {
  const copy = getGiftDialogCopy(locale);
  const gifts = useMemo(() => getActiveCharmGifts(), []);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [attemptId, setAttemptId] = useState("");
  const [coinBalance, setCoinBalance] = useState<number | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [selectedGiftId, setSelectedGiftId] = useState(gifts[0]?.id ?? "");
  const [quantity, setQuantity] = useState(1);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [state, formAction] = useActionState(
    sendCharmGiftAction,
    initialGiftState,
  );
  const giftRedirectPath = redirectPath ?? `/profile/${recipientProfileId}`;
  const formError = state.attemptId === attemptId ? state.formError : undefined;
  const stateBalance =
    state.attemptId === attemptId && typeof state.balance === "number"
      ? state.balance
      : null;
  const visibleCoinBalance = stateBalance ?? coinBalance;
  const selectedGift = gifts.find((gift) => gift.id === selectedGiftId) ?? null;
  const totalCoinCost = Math.max(0, selectedGift?.coinCost ?? 0) * quantity;
  const triggerLabel = triggerAriaLabel ?? copy.sendGift;
  const triggerInner = triggerContent ?? (
    <>
      <Gift className="h-4 w-4 shrink-0" />
      {copy.sendGift}
    </>
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open || !isAuthenticated) {
      return;
    }

    let cancelled = false;
    setBalanceLoading(true);

    getViewerFriemiCoinBalanceClientAction(locale, giftRedirectPath)
      .then((result) => {
        if (!cancelled && result.ok) {
          setCoinBalance(result.balance);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCoinBalance(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setBalanceLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [giftRedirectPath, isAuthenticated, locale, open]);

  useEffect(() => {
    if (!state.ok || !state.eventId || state.attemptId !== attemptId) {
      return;
    }

    if (typeof state.balance === "number") {
      setCoinBalance(state.balance);
    }
    setSuccessMessage(copy.sent);
    setAttemptId(createGiftAttemptId());
  }, [
    attemptId,
    copy.sent,
    state.attemptId,
    state.balance,
    state.eventId,
    state.ok,
  ]);

  useEffect(() => {
    if (
      state.attemptId === attemptId &&
      state.formError &&
      typeof state.balance === "number"
    ) {
      setCoinBalance(state.balance);
    }
  }, [attemptId, state.attemptId, state.balance, state.formError]);

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
        href={getSignInHref(locale, giftRedirectPath)}
        aria-label={triggerLabel}
        className={cn(
          "inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-bold text-[#9A2135] transition active:scale-95",
          triggerClassName,
        )}
      >
        {triggerInner}
      </Link>
    );
  }

  if (gifts.length === 0) {
    return null;
  }

  return (
    <>
      <button
        aria-label={triggerLabel}
        className={cn(
          "inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-bold text-[#9A2135] transition active:scale-95",
          triggerClassName,
        )}
        onClick={() => {
          setAttemptId(createGiftAttemptId());
          setSuccessMessage(null);
          setOpen(true);
        }}
        type="button"
      >
        {triggerInner}
      </button>

      {open && mounted
        ? createPortal(
            <div
              className="fixed inset-0 z-[180] flex items-end justify-center overflow-hidden bg-[#111210]/28 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur-[2px] md:items-center md:px-4 md:pb-6 md:pt-6"
              data-user-preview-persistent-overlay
            >
              <button
                aria-label={copy.close}
                className="absolute inset-0 cursor-default"
                onClick={() => setOpen(false)}
                type="button"
              />
              <div
                aria-modal="true"
                className="relative flex max-h-full min-h-0 w-full max-w-[390px] flex-col overflow-hidden rounded-[1.5rem] bg-[#FEFFF9] shadow-[0_26px_70px_rgba(17,18,16,0.22)] ring-1 ring-[#E4DDBE]"
                role="dialog"
              >
                <div className="flex shrink-0 items-start justify-between gap-3 border-b border-[#ECE5CD] px-5 pb-4 pt-5">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 text-[17px] font-bold leading-tight text-[#111210]">
                      <Sparkles className="h-4 w-4 text-[#A57AEB]" />
                      {copy.title}
                    </p>
                    <p className="mt-1 truncate text-xs font-bold text-[#7A8276]">
                      {copy.to} {recipientName}
                    </p>
                    <p className="mt-2 text-[11px] font-semibold leading-4 text-[#7A8276]">
                      {copy.testMode}
                    </p>
                    <p className="mt-2 inline-flex max-w-full items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-[#156240] ring-1 ring-[#D8E4C9]">
                      <Coins className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">
                        {copy.balanceLabel}:{" "}
                        {balanceLoading && visibleCoinBalance === null
                          ? copy.balanceLoading
                          : `${visibleCoinBalance ?? "-"} ${copy.currency}`}
                      </span>
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
                  className="grid min-h-0 flex-1 gap-4 overflow-y-auto overscroll-contain px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                  onSubmit={() => setSuccessMessage(null)}
                >
                  <input name="attemptId" type="hidden" value={attemptId} />
                  <input name="giftId" type="hidden" value={selectedGiftId} />
                  <input name="quantity" type="hidden" value={quantity} />
                  <input name="locale" type="hidden" value={locale} />
                  <input
                    name="sourceSurface"
                    type="hidden"
                    value={sourceSurface}
                  />
                  {sourceContextId ? (
                    <input
                      name="sourceContextId"
                      type="hidden"
                      value={sourceContextId}
                    />
                  ) : null}
                  <input
                    name="recipientProfileId"
                    type="hidden"
                    value={recipientProfileId}
                  />
                  <input
                    name="redirectPath"
                    type="hidden"
                    value={giftRedirectPath}
                  />

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
                          onClick={() => {
                            setSelectedGiftId(gift.id);
                            setSuccessMessage(null);
                          }}
                          type="button"
                        >
                          <span className="text-[22px] leading-none">
                            {gift.emoji}
                          </span>
                          <span className="max-w-full truncate text-[11px] font-bold text-[#1D1D1B]">
                            {getCharmGiftLabel(gift, locale)}
                          </span>
                          <span className="grid gap-0.5 text-[10px] font-bold text-[#7A8276]">
                            <span className="max-w-full truncate">
                              {gift.coinCost ?? "-"} {copy.currency}
                            </span>
                            <span>
                              +{gift.charmValue} {copy.charmUnit}
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex items-center justify-between gap-3 border-y border-[#ECE5CD] py-3">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-[#4F574F]">
                        {copy.quantity}
                      </p>
                      <p className="mt-0.5 truncate text-[11px] font-semibold text-[#7A8276]">
                        {copy.total}: {totalCoinCost} {copy.currency}
                      </p>
                    </div>
                    <div className="grid grid-cols-[2.25rem_3rem_2.25rem] items-center overflow-hidden rounded-full bg-white ring-1 ring-[#D8E4C9]">
                      <button
                        aria-label={`${copy.quantity} -`}
                        className="grid h-9 place-items-center text-[#156240] transition active:bg-[#ECF5EF] disabled:text-[#A7A99D]"
                        disabled={quantity <= 1}
                        onClick={() => {
                          setQuantity((current) => Math.max(1, current - 1));
                          setSuccessMessage(null);
                        }}
                        type="button"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <input
                        aria-label={copy.quantity}
                        className="h-9 w-full border-x border-[#E6E8DB] bg-transparent text-center text-sm font-bold text-[#111210] outline-none"
                        inputMode="numeric"
                        max={99}
                        min={1}
                        onChange={(event) => {
                          const nextValue = Number.parseInt(
                            event.currentTarget.value,
                            10,
                          );
                          setQuantity(
                            Number.isFinite(nextValue)
                              ? Math.max(1, Math.min(99, nextValue))
                              : 1,
                          );
                          setSuccessMessage(null);
                        }}
                        type="number"
                        value={quantity}
                      />
                      <button
                        aria-label={`${copy.quantity} +`}
                        className="grid h-9 place-items-center text-[#156240] transition active:bg-[#ECF5EF] disabled:text-[#A7A99D]"
                        disabled={quantity >= 99}
                        onClick={() => {
                          setQuantity((current) => Math.min(99, current + 1));
                          setSuccessMessage(null);
                        }}
                        type="button"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {successMessage ? (
                    <div
                      className="flex items-center gap-2 rounded-[1rem] bg-[#ECF5EF] px-3 py-2.5 text-xs font-bold text-[#156240] ring-1 ring-[#C8DFC7]"
                      role="status"
                    >
                      <CheckCircle2 className="h-4 w-4 shrink-0" />
                      {successMessage}
                    </div>
                  ) : null}

                  {formError ? (
                    <div
                      className="flex items-start gap-2 rounded-[1rem] bg-[#FFF0F3] px-3 py-2.5 text-[#9A2135] ring-1 ring-[#F5C5D7]"
                      role="alert"
                    >
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                      <div className="min-w-0 text-xs font-bold leading-5">
                        <p className="font-bold">{copy.failureTitle}</p>
                        <p>{formError}</p>
                        {typeof state.required === "number" ? (
                          <p className="mt-0.5 text-[#9A2135]/78">
                            {copy.requiredLabel}: {state.required}{" "}
                            {copy.currency}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  ) : null}

                  <div className="flex items-center justify-end gap-2">
                    <button
                      className="inline-flex h-10 items-center justify-center rounded-full px-4 text-xs font-bold text-[#4F574F] transition active:scale-95"
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
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
