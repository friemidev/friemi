"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { Gamepad2, X } from "lucide-react";
import { GameToolCard } from "@/features/game-tools/components/GameToolCard";
import { gameToolDefinitions } from "@/features/game-tools/gameToolCatalog";

type BoardGameToolFloatingEntryProps = {
  gameToolsHref: string;
  locale: string;
  variant?: "floating" | "tool";
};

function getLabel(locale: string) {
  if (locale === "fr") {
    return "Ouvrir les outils de jeux de société";
  }

  if (locale === "en") {
    return "Open board game tools";
  }

  return "进入桌游工具";
}

function getShortLabel(locale: string) {
  if (locale === "fr") return "Jeux";
  if (locale === "en") return "Games";

  return "桌游";
}

export function BoardGameToolFloatingEntry({
  gameToolsHref,
  locale,
  variant = "floating",
}: BoardGameToolFloatingEntryProps) {
  const label = getLabel(locale);
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const quickTools = gameToolDefinitions.filter((tool) => tool.kind === "WEREWOLF" || tool.kind === "DRAW_GUESS");
  const descriptions = locale === "fr"
    ? { WEREWOLF: "Rôles · Tours · Résultats", DRAW_GUESS: "Deviner · Chaîne" }
    : locale === "en"
      ? { WEREWOLF: "Roles · Rounds · Results", DRAW_GUESS: "Speed guessing · Picture chain" }
      : { WEREWOLF: "身份 · 轮次 · 结算", DRAW_GUESS: "抢猜 · 画画接龙" };

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!open || !dialog) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.showModal();
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
      triggerRef.current?.focus({ preventScroll: true });
    };
  }, [open]);

  if (variant === "tool") {
    return (
      <>
      <button
        aria-label={label}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="group relative flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[11px] font-semibold text-[#607268] transition hover:bg-[#F2F8F3] hover:text-[#156240] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#369758] active:scale-[0.97]"
        onClick={() => setOpen(true)}
        ref={triggerRef}
        title={label}
        type="button"
      >
        <span className="flex h-6 w-6 items-center justify-center text-[#5C8A6C] transition group-hover:text-[#156240]">
          <Gamepad2 className="h-[18px] w-[18px]" aria-hidden="true" />
        </span>
        <span className="max-w-full truncate">{getShortLabel(locale)}</span>
      </button>
      {open ? (
        <dialog
          aria-labelledby={titleId}
          className="fixed inset-x-0 bottom-[max(0.75rem,env(safe-area-inset-bottom))] top-auto mx-auto max-h-[calc(100dvh-1.5rem)] w-[calc(100%-1.5rem)] max-w-md overflow-y-auto rounded-[1.7rem] border-0 bg-paper p-5 text-forest shadow-2xl backdrop:bg-forest/45 sm:inset-0 sm:m-auto sm:p-6"
          onCancel={() => setOpen(false)}
          onKeyDown={(event) => {
            if (event.key !== "Tab") return;
            const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>("a[href], button:not([disabled])"));
            const first = controls[0];
            const last = controls.at(-1);
            if (event.shiftKey && document.activeElement === first) {
              event.preventDefault();
              last?.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
              event.preventDefault();
              first?.focus();
            }
          }}
          onClick={(event) => {
            if (event.target !== event.currentTarget) return;
            const bounds = event.currentTarget.getBoundingClientRect();
            if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) setOpen(false);
          }}
          ref={dialogRef}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-ink/70">Friemi Table Games</p>
              <h2 className="mt-1 text-2xl font-bold" id={titleId}>{locale === "zh-CN" ? "桌游" : locale === "fr" ? "Jeux de table" : "Table games"}</h2>
            </div>
            <button
              aria-label={locale === "zh-CN" ? "关闭" : locale === "fr" ? "Fermer" : "Close"}
              autoFocus
              className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-fog focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest active:scale-95"
              onClick={() => setOpen(false)}
              type="button"
            ><X aria-hidden="true" className="h-5 w-5" /></button>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {quickTools.map((tool) => (
              <GameToolCard
                available
                compact
                description={descriptions[tool.kind as keyof typeof descriptions]}
                key={tool.kind}
                locale={locale}
                target="_top"
                tool={tool}
              />
            ))}
          </div>
          <Link className="mt-4 flex min-h-11 items-center justify-center rounded-xl bg-forest px-5 py-3 text-center text-sm font-bold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest focus-visible:ring-offset-2 active:translate-y-0.5" href={gameToolsHref} target="_top">{locale === "zh-CN" ? "查看全部游戏" : locale === "fr" ? "Voir tous les jeux" : "See all games"}</Link>
        </dialog>
      ) : null}
      </>
    );
  }

  return (
    <Link
      aria-label={label}
      className="fixed bottom-[calc(6rem+env(safe-area-inset-bottom))] left-3 z-[55] grid h-14 w-14 place-items-center rounded-full border border-[#8AB68E] bg-white text-[#156240] shadow-[0_18px_42px_rgba(21,98,64,0.22)] transition hover:-translate-y-0.5 hover:border-[#156240] active:scale-[0.96] md:bottom-8 md:left-8"
      href={gameToolsHref}
      title={label}
    >
      <Gamepad2 className="h-6 w-6" aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </Link>
  );
}
