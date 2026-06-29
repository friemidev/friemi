"use client";

import { ChevronUp, X } from "lucide-react";
import type { ReactNode } from "react";
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

const RAISED_HAND_SIGNUP_ICON_SRC =
  "/brand/v2_1/team-detail-join-raised-hand.svg";

function getTeamDetailMobileCtaCopy(locale: string) {
  if (locale === "fr") {
    return {
      close: "Fermer",
      eyebrow: "Action",
      open: "Rejoindre",
      title: "Rejoindre ce plan",
    };
  }

  if (locale === "en") {
    return {
      close: "Close",
      eyebrow: "Action",
      open: "Join",
      title: "Join this plan",
    };
  }

  return {
    close: "关闭",
    eyebrow: "操作",
    open: "报名",
    title: "报名这个组局",
  };
}

type TeamDetailMobileCtaSheetProps = {
  activityTitle: string;
  children: ReactNode;
  locale: string;
  participantLabel: string;
  statusLabel: string;
};

export function TeamDetailMobileCtaSheet({
  activityTitle,
  children,
  locale,
  participantLabel,
  statusLabel,
}: TeamDetailMobileCtaSheetProps) {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [rendered, setRendered] = useState(false);
  const [visible, setVisible] = useState(false);
  const copy = getTeamDetailMobileCtaCopy(locale);
  const closeSheet = useCallback(() => {
    setOpen(false);
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    let frameId: number | undefined;
    let timeoutId: number | undefined;

    if (open) {
      setRendered(true);
      frameId = window.requestAnimationFrame(() => {
        setVisible(true);
      });
      document.body.style.overflow = "hidden";
    } else {
      setVisible(false);
      document.body.style.overflow = "";
      timeoutId = window.setTimeout(() => {
        setRendered(false);
      }, 190);
    }

    return () => {
      document.body.style.overflow = "";

      if (frameId !== undefined) {
        window.cancelAnimationFrame(frameId);
      }

      if (timeoutId !== undefined) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeSheet();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeSheet, open]);

  const sheet = (
    <div
      aria-modal="true"
      className="fixed inset-x-0 top-0 bottom-[calc(5.05rem+env(safe-area-inset-bottom))] z-[90] md:hidden"
      role="dialog"
    >
      <button
        aria-label={copy.close}
        className={cn(
          "absolute inset-0 h-full w-full cursor-default bg-ink/34 backdrop-blur-[2px] transition-opacity duration-200 ease-out motion-reduce:transition-none",
          visible ? "opacity-100" : "opacity-0",
        )}
        type="button"
        onClick={closeSheet}
      />
      <div
        className={cn(
          "absolute inset-x-3 bottom-3 max-h-[min(78svh,40rem)] overflow-hidden rounded-[1.55rem] border border-coral/45 bg-paper text-left shadow-[0_-18px_55px_rgba(29,29,27,0.22)] ring-1 ring-white transition-[opacity,transform] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
          visible ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0",
        )}
      >
        <div className="bg-[linear-gradient(135deg,#FFF5E6_0%,#FEFFF9_58%,#F1F2E3_100%)] px-4 pb-3 pt-3.5">
          <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-coral/40" />
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase leading-none tracking-[0.14em] text-forest">
                {copy.eyebrow}
              </p>
              <h2 className="mt-2 text-base font-extrabold leading-tight text-ink">
                {copy.title}
              </h2>
              <p className="mt-1 line-clamp-2 text-sm font-semibold leading-5 text-forest">
                {activityTitle}
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] font-semibold text-forest">
                <span className="rounded-full bg-white/88 px-2.5 py-1 ring-1 ring-sage/70">
                  {statusLabel}
                </span>
                <span className="rounded-full bg-white/88 px-2.5 py-1 ring-1 ring-sage/70">
                  {participantLabel}
                </span>
              </div>
            </div>
            <button
              aria-label={copy.close}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-sand bg-paper text-forest shadow-[0_8px_18px_rgba(21,98,64,0.08)] transition active:translate-y-px"
              type="button"
              onClick={closeSheet}
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
        <div className="max-h-[calc(min(78svh,40rem)-9rem)] overflow-y-auto px-4 pb-4 pt-3">
          {children}
        </div>
      </div>
    </div>
  );

  return (
    <div className="md:hidden">
      <button
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={copy.title}
        className="group fixed right-3 z-50 flex min-h-14 max-w-[calc(100vw-1.5rem)] items-center gap-2 rounded-[1.15rem] border border-[#8AB68E]/70 bg-[#FEFFF9]/96 px-2.5 py-2 text-[#156240] shadow-[0_16px_34px_rgba(21,98,64,0.2)] ring-1 ring-white/80 backdrop-blur-md transition hover:-translate-y-0.5 active:scale-[0.96]"
        style={{
          bottom: "calc(6rem + env(safe-area-inset-bottom))",
        }}
        title={copy.title}
        type="button"
        onClick={() => {
          setOpen(true);
        }}
      >
        <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-[1rem] bg-white shadow-[inset_0_1px_0_rgba(255,255,255,0.7),0_10px_20px_rgba(21,98,64,0.14)] ring-1 ring-[#8AB68E]/70">
          <span
            aria-hidden="true"
            className="absolute -right-1 -top-1 h-3.5 w-3.5 rounded-full bg-coral ring-2 ring-[#FEFFF9]"
          />
          <img
            alt=""
            aria-hidden="true"
            className="relative h-8 w-8 select-none"
            draggable={false}
            src={RAISED_HAND_SIGNUP_ICON_SRC}
          />
        </span>
        <span className="grid min-w-0 text-left">
          <span className="text-sm font-extrabold leading-tight text-[#156240]">
            {copy.open}
          </span>
        </span>
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-[#156240] ring-1 ring-[#8AB68E]/65 transition group-hover:-translate-y-0.5">
          <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
        </span>
      </button>
      {rendered && mounted ? createPortal(sheet, document.body) : null}
    </div>
  );
}
