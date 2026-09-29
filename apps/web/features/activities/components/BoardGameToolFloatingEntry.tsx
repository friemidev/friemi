"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronRight, Gamepad2, Moon, X } from "lucide-react";
import { withLocale } from "@/lib/routes";

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

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
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
        title={label}
        type="button"
      >
        <span className="flex h-6 w-6 items-center justify-center text-[#5C8A6C] transition group-hover:text-[#156240]">
          <Gamepad2 className="h-[18px] w-[18px]" aria-hidden="true" />
        </span>
        <span className="max-w-full truncate">{getShortLabel(locale)}</span>
      </button>
      {open ? <div className="fixed inset-0 z-[100] flex items-end justify-center bg-[#102B22]/45 p-3 sm:items-center" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
        <div aria-label={label} aria-modal="true" role="dialog" className="w-full max-w-md rounded-[1.7rem] bg-[#FFFDF7] p-5 text-[#173D32] shadow-[0_25px_75px_rgba(12,43,30,0.28)] sm:p-6">
          <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-widest text-[#B46D51]">Friemi Table Games</p><h2 className="mt-1 text-2xl font-bold">{locale === "zh-CN" ? "桌游" : locale === "fr" ? "Jeux de table" : "Table games"}</h2></div><button aria-label={locale === "zh-CN" ? "关闭" : "Close"} className="grid h-9 w-9 place-items-center rounded-full bg-[#EEF2E9]" onClick={() => setOpen(false)} type="button"><X className="h-5 w-5" /></button></div>
          <div className="mt-5 space-y-2">
            <Link className="flex items-center gap-3 rounded-2xl border border-[#DCE6D7] bg-white p-4 transition hover:border-[#8AB68E]" href={withLocale(locale, "/game-tools/werewolf")} target="_top"><span className="grid h-11 w-11 place-items-center rounded-xl bg-[#E7E0E3] text-[#7A1F2B]"><Moon className="h-5 w-5" /></span><span className="flex-1"><strong className="block">{locale === "zh-CN" ? "狼人杀" : locale === "fr" ? "Loups-garous" : "Werewolf"}</strong><small className="text-[#687C6D]">{locale === "zh-CN" ? "身份 · 轮次 · 结算" : locale === "fr" ? "Rôles · Tours · Résultats" : "Roles · Rounds · Results"}</small></span><ChevronRight className="h-4 w-4" /></Link>
            <Link className="flex items-center gap-3 rounded-2xl border border-[#DCE6D7] bg-white p-4 transition hover:border-[#8AB68E]" href={withLocale(locale, "/game-tools/draw-guess")} target="_top"><Image alt="" className="h-11 w-11 shrink-0 rounded-xl" height={44} src="/game-tools/draw-guess/logo.svg" width={44} /><span className="flex-1"><strong className="block">{locale === "zh-CN" ? "你画我猜" : locale === "fr" ? "Dessine et devine" : "Draw & Guess"}</strong><small className="text-[#687C6D]">{locale === "zh-CN" ? "抢猜 · 画画接龙" : locale === "fr" ? "Deviner · Chaîne" : "Speed guessing · Picture chain"}</small></span><ChevronRight className="h-4 w-4" /></Link>
          </div>
          <Link className="mt-4 block rounded-xl bg-[#156240] px-5 py-3 text-center text-sm font-bold text-white" href={gameToolsHref} target="_top">{locale === "zh-CN" ? "查看全部游戏" : locale === "fr" ? "Voir tous les jeux" : "See all games"}</Link>
        </div>
      </div> : null}
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
