"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BadgeCheck,
  CopyPlus,
  Home,
  KeyRound,
  Loader2,
  X,
} from "lucide-react";
import { useActionState, useCallback, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { createPortal } from "react-dom";
import { getSignInHref } from "@/lib/auth-redirect";
import { cn } from "@/lib/utils";
import {
  claimAutoCreatedActivityAction,
  type ClaimAutoCreatedActivityState,
} from "../actions/claimAutoCreatedActivity";

type ClaimAutoCreatedActivityCardActionProps = {
  activityId: string;
  activityTitle: string;
  detailHref: string;
  isAuthenticated: boolean;
  locale: string;
  redirectPath: string;
  secondaryHref?: string;
  secondaryLabel?: string;
  variant: "single" | "split";
};

const initialState: ClaimAutoCreatedActivityState = {};

function getClaimCardCopy(locale: string) {
  if (locale === "fr") {
    return {
      cancel: "Pas encore",
      close: "Fermer",
      confirm: "Confirmer",
      confirming: "Réclamation...",
      eyebrow: "Équipe à réclamer",
      helper:
        "Vous pourrez modifier le titre, l'horaire, le lieu et les règles d'inscription.",
      mobileOpen: "Je gère",
      primary: "Je gère",
      signIn: "Connexion",
      signInHint: "Connectez-vous d'abord, puis revenez réclamer ce plan.",
      title: "Vous prenez la main sur ce plan ?",
    };
  }

  if (locale === "en") {
    return {
      cancel: "Not yet",
      close: "Close",
      confirm: "Confirm",
      confirming: "Claiming...",
      eyebrow: "Claimable plan",
      helper:
        "You will be able to edit the title, time, location, and signup rules.",
      mobileOpen: "Host it",
      primary: "I'll host",
      signIn: "Sign in",
      signInHint: "Sign in first, then come back to claim this plan.",
      title: "Make this plan yours?",
    };
  }

  return {
    cancel: "先等等",
    close: "关闭",
    confirm: "确认当房主",
    confirming: "认领中...",
    eyebrow: "可认领组局",
    helper: "成为房主后，你可以编辑标题、时间、地点和报名规则。",
    mobileOpen: "我来当房主",
    primary: "我来当房主",
    signIn: "登录后认领",
    signInHint: "先登录，再回来把这个组局变成你的。",
    title: "确认成为本次活动的发起人？",
  };
}

function withClaimedSuccessParam(href: string) {
  return `${href}${href.includes("?") ? "&" : "?"}claimed=1`;
}

function SubmitClaimButton({ locale }: { locale: string }) {
  const { pending } = useFormStatus();
  const copy = getClaimCardCopy(locale);

  return (
    <button
      className="inline-flex h-11 w-full min-w-0 items-center justify-center gap-2 rounded-full bg-forest px-5 text-sm font-extrabold leading-none text-paper shadow-[0_16px_30px_rgba(21,98,64,0.24)] transition hover:-translate-y-0.5 hover:bg-meadow disabled:cursor-not-allowed disabled:opacity-70 motion-reduce:transition-none"
      disabled={pending}
      type="submit"
    >
      {pending ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
      ) : (
        <KeyRound className="h-4 w-4" aria-hidden="true" />
      )}
      {pending ? copy.confirming : copy.confirm}
    </button>
  );
}

export function ClaimAutoCreatedActivityCardAction({
  activityId,
  activityTitle,
  detailHref,
  isAuthenticated,
  locale,
  redirectPath,
  secondaryHref,
  secondaryLabel,
  variant,
}: ClaimAutoCreatedActivityCardActionProps) {
  const router = useRouter();
  const [state, formAction] = useActionState(
    claimAutoCreatedActivityAction,
    initialState,
  );
  const [mounted, setMounted] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetRendered, setSheetRendered] = useState(false);
  const [sheetVisible, setSheetVisible] = useState(false);
  const didNavigateRef = useRef(false);
  const copy = getClaimCardCopy(locale);
  const signInHref = getSignInHref(locale, redirectPath);
  const claimedDetailHref = withClaimedSuccessParam(detailHref);
  const closeConfirm = useCallback(() => {
    setConfirmOpen(false);
  }, []);
  const openConfirm = useCallback(() => {
    setSheetOpen(false);
    setConfirmOpen(true);
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    let frameId: number | undefined;
    let timeoutId: number | undefined;

    if (sheetOpen) {
      setSheetRendered(true);
      frameId = window.requestAnimationFrame(() => {
        setSheetVisible(true);
      });
    } else {
      setSheetVisible(false);
      timeoutId = window.setTimeout(() => {
        setSheetRendered(false);
      }, 180);
    }

    return () => {
      if (frameId !== undefined) {
        window.cancelAnimationFrame(frameId);
      }

      if (timeoutId !== undefined) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [sheetOpen]);

  useEffect(() => {
    if (!confirmOpen && !sheetOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeConfirm();
        setSheetOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeConfirm, confirmOpen, sheetOpen]);

  useEffect(() => {
    if (!state.ok || didNavigateRef.current) {
      return;
    }

    didNavigateRef.current = true;
    setConfirmOpen(false);
    const timeoutId = window.setTimeout(() => {
      router.push(claimedDetailHref);
    }, 360);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [claimedDetailHref, router, state.ok]);

  const confirmDialog = confirmOpen ? (
    <div
      aria-modal="true"
      className="fixed inset-0 z-[2147483647] grid place-items-center px-4 py-6"
      role="dialog"
    >
      <button
        aria-label={copy.close}
        className="absolute inset-0 h-full w-full cursor-default bg-ink/38 backdrop-blur-[3px]"
        type="button"
        onClick={closeConfirm}
      />
      <div className="friemi-claim-pop relative grid w-full max-w-[25rem] overflow-hidden rounded-[1.8rem] border border-sage/55 bg-paper p-4 text-left shadow-[0_28px_70px_rgba(29,29,27,0.24)] ring-1 ring-white">
        <span
          aria-hidden="true"
          className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-ice/70 blur-2xl"
        />
        <span
          aria-hidden="true"
          className="absolute -bottom-16 left-8 h-36 w-36 rounded-full bg-coral/20 blur-2xl"
        />
        <div className="relative flex items-start gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[1.05rem] border border-sage/55 bg-fog text-forest shadow-[0_16px_30px_rgba(21,98,64,0.14)]">
            <Home className="h-6 w-6" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-meadow">
              {copy.eyebrow}
            </p>
            <h2 className="mt-1 text-xl font-extrabold leading-tight tracking-normal text-ink">
              {copy.title}
            </h2>
          </div>
          <button
            aria-label={copy.close}
            className="ml-auto flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-sage/45 bg-paper text-forest"
            type="button"
            onClick={closeConfirm}
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <p className="relative mt-3 line-clamp-2 rounded-2xl bg-fog/80 px-3 py-2 text-sm font-bold leading-6 text-forest">
          {activityTitle}
        </p>
        <p className="relative mt-3 text-sm leading-6 text-ink/68">
          {isAuthenticated ? copy.helper : copy.signInHint}
        </p>
        {state.formError ? (
          <p className="relative mt-3 rounded-2xl bg-rose/35 px-3 py-2 text-sm font-semibold leading-6 text-danger">
            {state.formError}
          </p>
        ) : null}
        <div className="relative mt-5 grid grid-cols-2 gap-2">
          <button
            className="inline-flex h-11 min-w-0 items-center justify-center rounded-full border border-sage/45 bg-paper px-4 text-sm font-bold leading-none text-forest transition hover:-translate-y-0.5 hover:bg-fog motion-reduce:transition-none"
            type="button"
            onClick={closeConfirm}
          >
            {copy.cancel}
          </button>
          {isAuthenticated ? (
            <form action={formAction} className="min-w-0">
              <input name="activityId" type="hidden" value={activityId} />
              <input name="locale" type="hidden" value={locale} />
              <input name="redirectPath" type="hidden" value={redirectPath} />
              <SubmitClaimButton locale={locale} />
            </form>
          ) : (
            <Link
              className="inline-flex h-11 min-w-0 items-center justify-center gap-2 rounded-full bg-forest px-4 text-sm font-extrabold leading-none text-paper shadow-[0_16px_30px_rgba(21,98,64,0.22)] transition hover:-translate-y-0.5 hover:bg-meadow motion-reduce:transition-none"
              href={signInHref}
            >
              <KeyRound className="h-4 w-4" aria-hidden="true" />
              {copy.signIn}
            </Link>
          )}
        </div>
      </div>
    </div>
  ) : null;

  const mobileSheet =
    sheetRendered ? (
      <div
        aria-modal="true"
        className="fixed inset-0 z-[2147483646] sm:hidden"
        role="dialog"
      >
        <button
          aria-label={copy.close}
          className={cn(
            "absolute inset-0 h-full w-full cursor-default bg-ink/32 backdrop-blur-[2px] transition-opacity duration-200 ease-out motion-reduce:transition-none",
            sheetVisible ? "opacity-100" : "opacity-0",
          )}
          type="button"
          onClick={() => {
            setSheetOpen(false);
          }}
        />
        <div
          className={cn(
            "absolute inset-x-3 bottom-0 rounded-t-[1.65rem] border border-sage/45 bg-paper px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-3.5 text-left shadow-[0_-20px_50px_rgba(29,29,27,0.22)] ring-1 ring-white transition-[opacity,transform] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
            sheetVisible
              ? "translate-y-0 opacity-100"
              : "translate-y-5 opacity-0",
          )}
        >
          <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-sand" />
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-extrabold uppercase leading-none tracking-[0.12em] text-meadow">
                {copy.eyebrow}
              </p>
              <p className="mt-2 line-clamp-2 text-sm font-extrabold leading-snug text-ink">
                {activityTitle}
              </p>
            </div>
            <button
              aria-label={copy.close}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-sage/45 bg-paper text-forest shadow-[0_8px_18px_rgba(21,98,64,0.08)]"
              type="button"
              onClick={() => {
                setSheetOpen(false);
              }}
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              className="group/action rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-meadow/35"
              type="button"
              onClick={openConfirm}
            >
              <span className="flex min-h-11 items-center justify-center gap-1.5 rounded-full border border-sage bg-fog px-3 text-[13px] font-extrabold leading-tight text-forest shadow-[0_14px_24px_rgba(21,98,64,0.14)] transition group-active/action:translate-y-px">
                <Home className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span className="min-w-0 text-center">{copy.primary}</span>
              </span>
            </button>
            {secondaryHref && secondaryLabel ? (
              <Link
                href={secondaryHref}
                aria-label={secondaryLabel}
                className="group/action rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-meadow/35"
              >
                <span className="flex min-h-11 items-center justify-center gap-1.5 rounded-full border border-coral/45 bg-cream px-3 text-[13px] font-bold leading-tight text-danger shadow-[0_8px_16px_rgba(240,145,130,0.12)] transition group-active/action:translate-y-px">
                  <CopyPlus className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span className="min-w-0 text-center">{secondaryLabel}</span>
                </span>
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    ) : null;

  const desktopSplit =
    variant === "split" && secondaryHref && secondaryLabel ? (
      <div className="hidden justify-center sm:flex">
        <div className="relative isolate h-12 w-[12.25rem] overflow-hidden rounded-[1.55rem] border border-sage/60 bg-[linear-gradient(135deg,#F1F2EC_0%,#FEFFF9_48%,#FFF5E6_100%)] shadow-[0_14px_30px_rgba(21,98,64,0.13),inset_0_1px_0_rgba(255,255,255,0.94)] transition-transform duration-250 hover:-translate-y-0.5">
          <span
            aria-hidden="true"
            className="absolute inset-y-1.5 left-1.5 z-0 w-[calc(50%-0.375rem)] rounded-[1.2rem] bg-fog"
          />
          <span
            aria-hidden="true"
            className="absolute inset-y-1.5 right-1.5 z-0 w-[calc(50%-0.375rem)] rounded-[1.2rem] bg-cream/80"
          />
          <span
            aria-hidden="true"
            className="absolute left-1/2 top-1/2 z-0 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-sage shadow-[0_0_0_5px_rgba(241,242,236,0.92)]"
          />
          <span
            aria-hidden="true"
            className="absolute inset-y-0 left-0 z-10 flex w-1/2 items-center justify-center text-forest"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-forest text-paper shadow-[0_9px_18px_rgba(21,98,64,0.24)]">
              <Home className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
          </span>
          <span
            aria-hidden="true"
            className="absolute inset-y-0 right-0 z-10 flex w-1/2 items-center justify-center text-danger"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full border border-coral/55 bg-cream text-danger shadow-[0_9px_18px_rgba(240,145,130,0.12)]">
              <CopyPlus className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
          </span>
          <button
            aria-label={copy.primary}
            className="group absolute inset-y-0 left-0 z-20 w-1/2 focus-visible:z-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-meadow/35 focus-visible:ring-offset-2 focus-visible:ring-offset-cream hover:z-40"
            type="button"
            onClick={openConfirm}
          >
            <span className="pointer-events-none absolute inset-y-0 left-0 z-30 flex w-[calc(200%+2px)] items-center justify-center gap-2 rounded-[1.45rem] border border-sage bg-forest px-4 text-[13px] font-extrabold leading-none text-paper opacity-0 shadow-none transition-[opacity,transform,box-shadow] duration-250 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:-translate-y-0.5 group-hover:opacity-100 group-hover:shadow-[0_16px_28px_rgba(21,98,64,0.25)] group-focus-visible:-translate-y-0.5 group-focus-visible:opacity-100 group-focus-visible:shadow-[0_16px_28px_rgba(21,98,64,0.25)] motion-reduce:transition-none">
              <Home
                className="h-4 w-4 shrink-0 transition-transform duration-200 group-hover:-rotate-6 group-focus-visible:-rotate-6 motion-reduce:transition-none"
                aria-hidden="true"
              />
              <span>{copy.primary}</span>
            </span>
          </button>
          <Link
            href={secondaryHref}
            title={secondaryLabel}
            aria-label={secondaryLabel}
            className="group absolute inset-y-0 right-0 z-20 w-1/2 focus-visible:z-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-meadow/35 focus-visible:ring-offset-2 focus-visible:ring-offset-cream hover:z-40"
          >
            <span className="pointer-events-none absolute inset-y-0 right-0 z-30 flex w-[calc(200%+2px)] items-center justify-center gap-2 rounded-[1.45rem] border border-coral/50 bg-cream px-4 text-[13px] font-bold leading-none text-danger opacity-0 shadow-none transition-[opacity,transform,box-shadow] duration-250 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:-translate-y-0.5 group-hover:opacity-100 group-hover:shadow-[0_16px_28px_rgba(240,145,130,0.16)] group-focus-visible:-translate-y-0.5 group-focus-visible:opacity-100 group-focus-visible:shadow-[0_16px_28px_rgba(240,145,130,0.16)] motion-reduce:transition-none">
              <CopyPlus
                className="h-4 w-4 shrink-0 transition-transform duration-200 group-hover:-rotate-12 group-focus-visible:-rotate-12 motion-reduce:transition-none"
                aria-hidden="true"
              />
              <span>{secondaryLabel}</span>
            </span>
          </Link>
        </div>
      </div>
    ) : null;

  const mobileSplit =
    variant === "split" ? (
      <div className="relative z-30 w-full sm:hidden">
        <button
          aria-expanded={sheetOpen}
          aria-haspopup="dialog"
          aria-label={copy.mobileOpen}
          className="relative mx-auto flex h-9 min-h-9 w-full cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-[1.15rem] border border-sage/55 bg-[linear-gradient(135deg,#F1F2EC_0%,#FEFFF9_54%,#FFF5E6_100%)] px-2.5 text-forest shadow-[0_10px_20px_rgba(21,98,64,0.12),inset_0_1px_0_rgba(255,255,255,0.94)] transition duration-150 active:translate-y-px focus:outline-none focus-visible:ring-2 focus-visible:ring-meadow/35 focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
          type="button"
          onClick={() => {
            setSheetOpen(true);
          }}
        >
          <span
            aria-hidden="true"
            className="absolute -left-4 top-0 h-9 w-9 rounded-full bg-meadow/16 blur-[0.5px]"
          />
          <span
            aria-hidden="true"
            className="absolute -right-5 bottom-0 h-10 w-10 rounded-full bg-coral/14 blur-[1px]"
          />
          <span className="relative flex h-6 w-[2.85rem] shrink-0 items-center justify-center">
            <span className="absolute left-0 flex h-6 w-6 items-center justify-center rounded-full bg-forest text-paper shadow-[0_8px_16px_rgba(21,98,64,0.22)]">
              <Home className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
            <span className="absolute right-0 flex h-6 w-6 items-center justify-center rounded-full border border-coral/50 bg-cream text-danger shadow-[0_8px_16px_rgba(240,145,130,0.1)]">
              <CopyPlus className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
          </span>
          <span className="relative min-w-0 translate-y-px truncate text-[12px] font-extrabold leading-[1.25]">
            {copy.mobileOpen}
          </span>
          <span className="relative h-1.5 w-1.5 shrink-0 rounded-full bg-meadow/70" />
        </button>
      </div>
    ) : null;

  const singleAction =
    variant === "single" ? (
      <button
        className="group w-full min-w-0 rounded-full focus-visible:outline-none"
        type="button"
        onClick={openConfirm}
      >
        <span className="flex h-10 min-h-10 w-full min-w-0 items-center justify-center gap-1.5 overflow-hidden rounded-full border border-sage bg-fog px-3 text-center text-[13px] font-extrabold leading-none text-forest shadow-[0_10px_22px_rgba(21,98,64,0.12)] transition duration-150 ease-out group-hover:-translate-y-0.5 group-active:translate-y-0 group-focus-visible:ring-2 group-focus-visible:ring-meadow/35 group-focus-visible:ring-offset-2 group-focus-visible:ring-offset-paper sm:h-11 sm:min-h-11 sm:px-4 sm:text-sm">
          <Home className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span className="min-w-0 truncate">{copy.primary}</span>
          <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-meadow" aria-hidden="true" />
        </span>
      </button>
    ) : null;

  return (
    <>
      {singleAction}
      {mobileSplit}
      {desktopSplit}
      {mounted && sheetRendered ? createPortal(mobileSheet, document.body) : null}
      {mounted && confirmDialog ? createPortal(confirmDialog, document.body) : null}
    </>
  );
}
