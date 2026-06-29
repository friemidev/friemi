"use client";

import Link from "next/link";
import { PartyPopper, Pencil, Sparkles, X } from "lucide-react";
import type { CSSProperties } from "react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

type ClaimAutoCreatedActivityCelebrationProps = {
  active: boolean;
  editHref: string;
  locale: string;
};

const confettiPieces = [
  { color: "bg-coral", left: "12%", delay: "0ms", drift: "-5rem" },
  { color: "bg-meadow", left: "21%", delay: "80ms", drift: "-2.5rem" },
  { color: "bg-ice", left: "32%", delay: "30ms", drift: "1rem" },
  { color: "bg-forest", left: "43%", delay: "120ms", drift: "-1.5rem" },
  { color: "bg-rose", left: "55%", delay: "50ms", drift: "3rem" },
  { color: "bg-sand", left: "67%", delay: "150ms", drift: "1.5rem" },
  { color: "bg-coral", left: "78%", delay: "20ms", drift: "4rem" },
  { color: "bg-meadow", left: "88%", delay: "100ms", drift: "5rem" },
];

function getCelebrationCopy(locale: string) {
  if (locale === "fr") {
    return {
      close: "Voir le détail",
      cta: "Modifier",
      eyebrow: "C'est à vous",
      title: "Ce plan est à vous !",
      description:
        "Vous pouvez maintenant modifier les infos, l'horaire, le lieu et les règles d'inscription.",
    };
  }

  if (locale === "en") {
    return {
      close: "View details",
      cta: "Edit plan",
      eyebrow: "Yours now",
      title: "This plan is yours!",
      description:
        "You can now edit the details, time, location, and signup rules freely.",
    };
  }

  return {
    close: "先看详情",
    cta: "去编辑组局",
    eyebrow: "认领成功",
    title: "这个组局已经变成你的了！",
    description: "你现在可以自由编辑组局！",
  };
}

export function ClaimAutoCreatedActivityCelebration({
  active,
  editHref,
  locale,
}: ClaimAutoCreatedActivityCelebrationProps) {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(active);
  const copy = getCelebrationCopy(locale);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!active) {
      return;
    }

    setOpen(true);

    const url = new URL(window.location.href);
    if (url.searchParams.has("claimed")) {
      url.searchParams.delete("claimed");
      const nextSearch = url.searchParams.toString();
      window.history.replaceState(
        window.history.state,
        "",
        `${url.pathname}${nextSearch ? `?${nextSearch}` : ""}${url.hash}`,
      );
    }
  }, [active]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  if (!mounted || !open) {
    return null;
  }

  return createPortal(
    <div
      aria-modal="true"
      className="fixed inset-0 z-[2147483647] grid place-items-center px-4 py-6"
      role="dialog"
    >
      <button
        aria-label={copy.close}
        className="absolute inset-0 h-full w-full cursor-default bg-ink/36 backdrop-blur-[3px]"
        type="button"
        onClick={() => {
          setOpen(false);
        }}
      />
      <div className="friemi-claim-pop relative w-full max-w-[25.5rem] overflow-hidden rounded-[2rem] border border-sage/55 bg-paper p-5 text-center shadow-[0_30px_80px_rgba(29,29,27,0.25)] ring-1 ring-white">
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-48">
          {confettiPieces.map((piece, index) => (
            <span
              key={`${piece.left}-${index}`}
              className={cn(
                "friemi-claim-confetti absolute top-12 h-3 w-2 rounded-[0.2rem]",
                piece.color,
              )}
              style={
                {
                  "--claim-confetti-delay": piece.delay,
                  "--claim-confetti-drift": piece.drift,
                  left: piece.left,
                } as CSSProperties
              }
            />
          ))}
        </div>
        <span
          aria-hidden="true"
          className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-ice/70 blur-3xl"
        />
        <span
          aria-hidden="true"
          className="absolute -bottom-20 left-6 h-44 w-44 rounded-full bg-coral/18 blur-3xl"
        />
        <button
          aria-label={copy.close}
          className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-sage/45 bg-paper/80 text-forest shadow-sm"
          type="button"
          onClick={() => {
            setOpen(false);
          }}
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
        <div className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-[1.35rem] border border-sage bg-fog text-forest shadow-[0_18px_36px_rgba(21,98,64,0.18)]">
          <PartyPopper className="h-8 w-8" aria-hidden="true" />
          <Sparkles
            className="absolute -right-2 -top-2 h-5 w-5 text-coral"
            aria-hidden="true"
          />
        </div>
        <p className="relative mt-5 text-[10px] font-extrabold uppercase tracking-[0.18em] text-meadow">
          {copy.eyebrow}
        </p>
        <h2 className="relative mt-2 text-2xl font-extrabold leading-tight tracking-normal text-ink">
          {copy.title}
        </h2>
        <p className="relative mx-auto mt-3 max-w-[19rem] text-sm font-medium leading-6 text-ink/68">
          {copy.description}
        </p>
        <div className="relative mt-6 grid grid-cols-2 gap-2">
          <button
            className="inline-flex h-11 min-w-0 items-center justify-center rounded-full border border-sage/45 bg-paper px-4 text-sm font-bold leading-none text-forest transition hover:-translate-y-0.5 hover:bg-fog motion-reduce:transition-none"
            type="button"
            onClick={() => {
              setOpen(false);
            }}
          >
            {copy.close}
          </button>
          <Link
            className="inline-flex h-11 min-w-0 items-center justify-center gap-2 rounded-full bg-forest px-4 text-sm font-extrabold leading-none text-paper shadow-[0_16px_30px_rgba(21,98,64,0.22)] transition hover:-translate-y-0.5 hover:bg-meadow motion-reduce:transition-none"
            href={editHref}
          >
            <Pencil className="h-4 w-4" aria-hidden="true" />
            {copy.cta}
          </Link>
        </div>
      </div>
    </div>,
    document.body,
  );
}
