"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import {
  useActionState,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { useFormStatus } from "react-dom";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Gift,
  Minus,
  Plus,
  Sparkles,
  X,
} from "lucide-react";
import { getActiveCharmGifts, getCharmGiftLabel } from "@/features/charm/charm";
import { CharmGiftArtwork } from "@/features/charm/components/CharmGiftArtwork";
import { FriemiCoinIcon } from "@/features/charm/components/FriemiCoinIcon";
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
  onOpenChange?: (open: boolean) => void;
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
      activityCatalog: "Cadeaux d'activite",
      charmUnit: "charme",
      classicCatalog: "Cadeaux classiques",
      close: "Fermer",
      currency: "Friemi Coins",
      failureTitle: "Cadeau non envoyé",
      requiredLabel: "Requis",
      negativeCatalog: "Cadeaux negatifs",
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
      activityCatalog: "Activity gifts",
      charmUnit: "charm",
      classicCatalog: "Classic gifts",
      close: "Close",
      currency: "Friemi Coins",
      failureTitle: "Gift not sent",
      requiredLabel: "Required",
      negativeCatalog: "Negative gifts",
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
    activityCatalog: "活动礼物",
    charmUnit: "魅力值",
    classicCatalog: "经典礼物",
    close: "关闭",
    currency: "Friemi 币",
    failureTitle: "礼物没有送出",
    requiredLabel: "需要",
    negativeCatalog: "负向礼物",
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
      className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-[#156240] px-5 text-xs font-bold text-white shadow-[0_12px_22px_rgba(21,98,64,0.18)] transition active:scale-[0.98] disabled:opacity-60"
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
  onOpenChange,
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
  const giftGroups = [
    {
      id: "classic",
      label: copy.classicCatalog,
      items: gifts.filter((gift) => gift.category === "classic"),
    },
    {
      id: "activity",
      label: copy.activityCatalog,
      items: gifts.filter((gift) => gift.category === "activity"),
    },
    {
      id: "negative",
      label: copy.negativeCatalog,
      items: gifts.filter((gift) => gift.category === "negative"),
    },
  ].filter((group) => group.items.length > 0);
  const totalCoinCost = Math.max(0, selectedGift?.coinCost ?? 0) * quantity;
  const triggerLabel = triggerAriaLabel ?? copy.sendGift;
  const triggerInner = triggerContent ?? (
    <>
      <Gift className="h-4 w-4 shrink-0" />
      {copy.sendGift}
    </>
  );
  const setDialogOpen = useCallback(
    (nextOpen: boolean) => {
      setOpen(nextOpen);
      onOpenChange?.(nextOpen);
    },
    [onOpenChange],
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
        setDialogOpen(false);
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [open, setDialogOpen]);

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
          setDialogOpen(true);
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
                onClick={() => setDialogOpen(false)}
                type="button"
              />
              <div
                aria-modal="true"
                className="relative flex max-h-full min-h-0 w-full max-w-[430px] flex-col overflow-hidden rounded-[1.35rem] bg-[#FEFFF9] shadow-[0_26px_70px_rgba(17,18,16,0.22)] ring-1 ring-[#E4DDBE]"
                role="dialog"
              >
                <div className="flex shrink-0 items-start justify-between gap-3 border-b border-[#ECE5CD] px-4 pb-3.5 pt-4">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 text-[17px] font-bold leading-tight text-[#111210]">
                      <Sparkles className="h-4 w-4 text-[#A57AEB]" />
                      {copy.title}
                    </p>
                    <p className="mt-1 truncate text-xs font-bold text-[#7A8276]">
                      {copy.to} {recipientName}
                    </p>
                    <p className="mt-2 inline-flex max-w-full items-center gap-1.5 text-[11px] font-bold text-[#156240]">
                      <FriemiCoinIcon className="h-4 w-4" />
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
                    onClick={() => setDialogOpen(false)}
                    type="button"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <form
                  action={formAction}
                  className="flex min-h-0 flex-1 flex-col"
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

                  <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    <div className="space-y-5">
                      {giftGroups.map((group) => (
                        <section key={group.id}>
                          <h3 className="px-0.5 text-xs font-bold text-[#5F685F]">
                            {group.label}
                          </h3>
                          <div className="mt-2.5 grid grid-cols-2 gap-2.5">
                            {group.items.map((gift) => {
                              const selected = selectedGiftId === gift.id;
                              const charmPrefix = gift.charmValue > 0 ? "+" : "";
                              const label = getCharmGiftLabel(gift, locale);

                              return (
                                <button
                                  aria-pressed={selected}
                                  className={cn(
                                    "relative min-w-0 overflow-hidden rounded-lg bg-white text-left ring-1 transition active:scale-[0.985]",
                                    selected
                                      ? "ring-2 ring-[#156240] shadow-[0_10px_24px_rgba(21,98,64,0.12)]"
                                      : "ring-[#E3DCC5] shadow-[0_7px_18px_rgba(42,55,40,0.05)]",
                                  )}
                                  key={gift.id}
                                  onClick={() => {
                                    setSelectedGiftId(gift.id);
                                    setSuccessMessage(null);
                                  }}
                                  type="button"
                                >
                                  <div className="relative h-24 overflow-hidden bg-[#F8F7F2]">
                                    <CharmGiftArtwork
                                      className="h-full w-full rounded-none bg-transparent"
                                      emoji={gift.emoji}
                                      giftId={gift.id}
                                      label={label}
                                      sizes="(max-width: 430px) 46vw, 190px"
                                    />
                                    {selected ? (
                                      <span className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-[#156240] text-white shadow-[0_5px_12px_rgba(21,98,64,0.3)]">
                                        <Check className="h-4 w-4" strokeWidth={2.6} />
                                      </span>
                                    ) : null}
                                  </div>

                                  <div className="p-2.5">
                                    <p className="truncate text-sm font-bold text-[#111210]">
                                      {label}
                                    </p>
                                    <div className="mt-2 grid grid-cols-2 divide-x divide-[#E6E1D2] border-t border-[#E6E1D2] pt-2 text-[10px] font-bold">
                                      <span className="flex min-w-0 items-center gap-1 pr-2 text-[#6C5515]">
                                        <FriemiCoinIcon className="h-4 w-4 shrink-0" />
                                        <span className="truncate">
                                          {gift.coinCost ?? "-"}
                                        </span>
                                      </span>
                                      <span
                                        className={cn(
                                          "flex min-w-0 items-center justify-end gap-1 pl-2",
                                          gift.charmValue < 0
                                            ? "text-[#9A2135]"
                                            : "text-[#7D58C6]",
                                        )}
                                        title={`${charmPrefix}${gift.charmValue} ${copy.charmUnit}`}
                                      >
                                        <Sparkles className="h-3.5 w-3.5 shrink-0" />
                                        <span className="truncate">
                                          {charmPrefix}
                                          {gift.charmValue}
                                        </span>
                                      </span>
                                    </div>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </section>
                      ))}
                    </div>
                  </div>

                  <div className="shrink-0 border-t border-[#ECE5CD] bg-[#FEFFF9] px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-10px_28px_rgba(17,18,16,0.04)]">
                    {successMessage ? (
                      <div
                        className="mb-2.5 flex items-center gap-2 rounded-lg bg-[#ECF5EF] px-3 py-2 text-xs font-bold text-[#156240] ring-1 ring-[#C8DFC7]"
                        role="status"
                      >
                        <CheckCircle2 className="h-4 w-4 shrink-0" />
                        {successMessage}
                      </div>
                    ) : null}

                    {formError ? (
                      <div
                        className="mb-2.5 flex items-start gap-2 rounded-lg bg-[#FFF0F3] px-3 py-2 text-[#9A2135] ring-1 ring-[#F5C5D7]"
                        role="alert"
                      >
                        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                        <div className="min-w-0 text-xs font-bold leading-5">
                          <p>{copy.failureTitle}</p>
                          <p>{formError}</p>
                          {typeof state.required === "number" ? (
                            <p className="text-[#9A2135]/78">
                              {copy.requiredLabel}: {state.required}{" "}
                              {copy.currency}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    ) : null}

                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-xs font-bold text-[#111210]">
                          {selectedGift
                            ? getCharmGiftLabel(selectedGift, locale)
                            : copy.sendGift}
                        </p>
                        <p className="mt-0.5 truncate text-[11px] font-semibold text-[#7A8276]">
                          {copy.total}: {totalCoinCost} {copy.currency}
                        </p>
                      </div>
                      <div className="grid shrink-0 grid-cols-[2.25rem_2.75rem_2.25rem] items-center overflow-hidden rounded-full bg-white ring-1 ring-[#D8E4C9]">
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

                    <div className="mt-3">
                      <SendGiftSubmitButton
                        label={copy.send}
                        pendingLabel={copy.sending}
                      />
                    </div>
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
