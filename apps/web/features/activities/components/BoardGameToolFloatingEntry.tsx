"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useId, useState } from "react";
import { ArrowRight, ChevronUp, X } from "lucide-react";

import { cn } from "@/lib/utils";

type BoardGameToolFloatingEntryProps = {
  avalonHref: string;
  locale: string;
};

type BoardGameToolCopy = {
  action: string;
  avalonDescription: string;
  avalonTitle: string;
  close: string;
  description: string;
  eyebrow: string;
  open: string;
  title: string;
};

function getBoardGameToolCopy(locale: string): BoardGameToolCopy {
  if (locale === "fr") {
    return {
      action: "Ouvrir",
      avalonDescription: "Places, rôles, quêtes et récap.",
      avalonTitle: "Avalon",
      close: "Fermer",
      description: "Des aides légères pour jouer autour de la table.",
      eyebrow: "Débloqué",
      open: "Outils jeu",
      title: "Outils de table",
    };
  }

  if (locale === "en") {
    return {
      action: "Open",
      avalonDescription: "Seats, roles, quests, and recap.",
      avalonTitle: "Avalon",
      close: "Close",
      description: "Light tools for running the game at the table.",
      eyebrow: "Unlocked",
      open: "Game tools",
      title: "Table tools",
    };
  }

  return {
    action: "打开",
    avalonDescription: "扫码入座、发身份、记录任务和复盘。",
    avalonTitle: "Avalon 阿瓦隆",
    close: "关闭",
    description: "报名后可用的现场辅助工具，开局和记录更轻松。",
    eyebrow: "已解锁",
    open: "桌游工具",
    title: "桌游工具",
  };
}

export function BoardGameToolFloatingEntry({
  avalonHref,
  locale,
}: BoardGameToolFloatingEntryProps) {
  const [isOpen, setIsOpen] = useState(false);
  const panelId = useId();
  const copy = getBoardGameToolCopy(locale);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  return (
    <div className="pointer-events-none fixed inset-0 z-[55]">
      {isOpen ? (
        <button
          aria-label={copy.close}
          className="pointer-events-auto absolute inset-0 cursor-default bg-transparent"
          type="button"
          onClick={() => setIsOpen(false)}
        />
      ) : null}

      <div className="pointer-events-auto absolute bottom-[calc(10.65rem+env(safe-area-inset-bottom))] right-3 flex flex-col items-end gap-2 sm:right-5 md:bottom-8 md:right-8">
        <div
          id={panelId}
          role="dialog"
          aria-label={copy.title}
          aria-hidden={!isOpen}
          className={cn(
            "w-[min(calc(100vw-1.5rem),22rem)] origin-bottom-right overflow-hidden rounded-[1.6rem] border border-[#8AB68E]/70 bg-[#FEFFF9]/96 shadow-[0_26px_68px_rgba(21,98,64,0.24)] backdrop-blur-xl transition duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
            isOpen
              ? "translate-y-0 scale-100 opacity-100"
              : "pointer-events-none translate-y-3 scale-95 opacity-0",
          )}
        >
          <div className="relative overflow-hidden p-4">
            <div className="absolute -right-16 -top-20 h-40 w-40 rounded-full bg-[#F09182]/26 blur-2xl" />
            <div className="absolute -bottom-20 -left-14 h-36 w-36 rounded-full bg-[#8AB68E]/28 blur-2xl" />
            <div className="relative flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#156240]/72">
                  {copy.eyebrow}
                </p>
                <h2 className="mt-1 text-base font-extrabold text-[#0E2A5C]">
                  {copy.title}
                </h2>
                <p className="mt-1 max-w-[15rem] text-xs font-semibold leading-5 text-[#156240]/70">
                  {copy.description}
                </p>
              </div>
              <button
                aria-label={copy.close}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-[#156240] shadow-sm ring-1 ring-[#8AB68E]/50 transition hover:bg-[#F1F2EC]"
                tabIndex={isOpen ? undefined : -1}
                type="button"
                onClick={() => setIsOpen(false)}
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>

            <Link
              className="group relative mt-4 flex items-center gap-3 overflow-hidden rounded-[1.25rem] border border-[#D6D5B2] bg-white/88 p-3 shadow-[0_14px_34px_rgba(21,98,64,0.1)] transition hover:-translate-y-0.5 hover:border-[#8AB68E] hover:bg-[#FEFFF9]"
              href={avalonHref}
              tabIndex={isOpen ? undefined : -1}
            >
              <span className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-[1.1rem] bg-[radial-gradient(circle_at_32%_24%,#FEFFF9_0%,#F1F2EC_38%,#8AB68E_100%)] ring-1 ring-[#8AB68E]/65">
                <Image
                  alt=""
                  src="/game-tools/avalon/avalon-tool-icon.svg"
                  width={54}
                  height={54}
                  className="h-12 w-12 drop-shadow-[0_6px_12px_rgba(21,98,64,0.18)]"
                />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-extrabold text-[#0E2A5C]">
                  {copy.avalonTitle}
                </span>
                <span className="mt-1 line-clamp-2 block text-xs font-semibold leading-5 text-[#156240]/68">
                  {copy.avalonDescription}
                </span>
              </span>
              <span className="flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-[#156240] px-3 text-xs font-extrabold text-white shadow-[0_10px_22px_rgba(21,98,64,0.2)] transition group-hover:bg-[#369758]">
                {copy.action}
                <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </span>
            </Link>
          </div>
        </div>

        <button
          aria-controls={panelId}
          aria-expanded={isOpen}
          aria-haspopup="dialog"
          className={cn(
            "group relative flex min-h-14 items-center gap-2 rounded-full border border-[#8AB68E]/80 bg-[#FEFFF9] py-2 pl-2 pr-4 text-[#156240] shadow-[0_18px_42px_rgba(21,98,64,0.2)] transition duration-300 hover:-translate-y-0.5 hover:border-[#156240] hover:bg-white active:scale-[0.98]",
            isOpen && "border-[#156240] bg-white",
          )}
          type="button"
          onClick={() => setIsOpen((value) => !value)}
        >
          <span className="absolute -inset-1 -z-10 rounded-full bg-[#F09182]/28 opacity-0 blur-md transition group-hover:opacity-100" />
          <span className="relative flex h-10 w-10 items-center justify-center rounded-full bg-[#156240] shadow-inner shadow-white/20 ring-4 ring-[#D6D5B2]/55">
            <Image
              alt=""
              src="/game-tools/avalon/states/mission-board-bg.svg"
              width={34}
              height={34}
              className="h-8 w-8 rounded-full"
            />
          </span>
          <span className="max-w-[5.5rem] truncate text-sm font-extrabold">
            {copy.open}
          </span>
          <ChevronUp
            className={cn(
              "h-4 w-4 transition-transform",
              isOpen && "rotate-180",
            )}
            aria-hidden
          />
        </button>
      </div>
    </div>
  );
}
