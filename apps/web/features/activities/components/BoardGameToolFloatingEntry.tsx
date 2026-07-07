"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useId, useState } from "react";
import { ChevronUp, X } from "lucide-react";

import { cn } from "@/lib/utils";

type BoardGameToolFloatingEntryProps = {
  avalonHref: string;
  locale: string;
  werewolfHref: string;
};

type BoardGameToolCopy = {
  action: string;
  avalonTitle: string;
  avalonSubtitle: string;
  botcTitle: string;
  close: string;
  comingSoon: string;
  description: string;
  eyebrow: string;
  werewolfTitle: string;
  open: string;
  title: string;
  werewolfSubtitle: string;
};

function getBoardGameToolCopy(locale: string): BoardGameToolCopy {
  if (locale === "fr") {
    return {
      action: "Ouvrir",
      avalonTitle: "The Resistance: Avalon",
      avalonSubtitle: "Disponible",
      botcTitle: "Blood on the Clocktower",
      close: "Fermer",
      comingSoon: "Bientôt",
      description: "Choisis l'outil qui accompagne la partie autour de la table.",
      eyebrow: "Débloqué",
      werewolfTitle: "Loup-garou",
      open: "Outils jeu",
      title: "Outils de table",
      werewolfSubtitle: "Disponible",
    };
  }

  if (locale === "en") {
    return {
      action: "Open",
      avalonTitle: "The Resistance: Avalon",
      avalonSubtitle: "Ready",
      botcTitle: "Blood on the Clocktower",
      close: "Close",
      comingSoon: "Coming soon",
      description: "Pick a table tool for the game you are running.",
      eyebrow: "Unlocked",
      werewolfTitle: "Werewolf",
      open: "Game tools",
      title: "Table tools",
      werewolfSubtitle: "Ready",
    };
  }

  return {
    action: "打开",
    avalonTitle: "阿瓦隆",
    avalonSubtitle: "已开放",
    botcTitle: "血染钟楼",
    close: "关闭",
    comingSoon: "敬请期待",
    description: "选择Friemi 桌游应用，开启你的桌游世界。",
    eyebrow: "已解锁",
    werewolfTitle: "狼人杀",
    open: "桌游工具",
    title: "桌游",
    werewolfSubtitle: "已开放",
  };
}

export function BoardGameToolFloatingEntry({
  avalonHref,
  locale,
  werewolfHref,
}: BoardGameToolFloatingEntryProps) {
  const [isOpen, setIsOpen] = useState(false);
  const panelId = useId();
  const copy = getBoardGameToolCopy(locale);
  const tools = [
    {
      href: avalonHref,
      icon: "/game-tools/avalon/avalon.jpeg",
      key: "avalon",
      status: copy.avalonSubtitle,
      title: copy.avalonTitle,
    },
    {
      href: werewolfHref,
      icon: "/game-tools/werewolf/werewolf.jpeg",
      key: "werewolf",
      status: copy.werewolfSubtitle,
      title: copy.werewolfTitle,
    },
    {
      icon: "/game-tools/blood_on_the_clockTower/blood_on_the_clockTower.jpeg",
      key: "botc",
      status: copy.comingSoon,
      title: copy.botcTitle,
    },
  ];

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
          className="pointer-events-auto absolute inset-0 cursor-default bg-[#1D1D1B]/12 backdrop-blur-[1.5px] md:bg-transparent md:backdrop-blur-none"
          type="button"
          onClick={() => setIsOpen(false)}
        />
      ) : null}

      <div className="pointer-events-auto absolute bottom-[calc(6rem+env(safe-area-inset-bottom))] left-3 flex flex-col items-start gap-2 sm:left-5 md:bottom-8 md:left-auto md:right-8 md:items-end">
        <div
          id={panelId}
          role="dialog"
          aria-label={copy.title}
          aria-hidden={!isOpen}
          className={cn(
            "fixed inset-x-3 bottom-[calc(5.85rem+env(safe-area-inset-bottom))] top-[calc(4.8rem+env(safe-area-inset-top))] origin-bottom-left overflow-hidden rounded-[2rem] border border-[#8AB68E]/70 bg-[#FEFFF9]/98 shadow-[0_26px_68px_rgba(21,98,64,0.24)] backdrop-blur-xl transition duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none md:absolute md:inset-auto md:bottom-[4.25rem] md:right-0 md:top-auto md:w-[28rem] md:origin-bottom-right md:rounded-[1.8rem]",
            isOpen
              ? "translate-y-0 scale-100 opacity-100"
              : "pointer-events-none translate-y-3 scale-95 opacity-0",
          )}
        >
          <div className="relative flex h-full min-h-0 flex-col overflow-hidden">
            <div className="absolute -right-16 -top-20 h-40 w-40 rounded-full bg-[#F09182]/18 blur-2xl" />
            <div className="absolute -bottom-20 -left-14 h-36 w-36 rounded-full bg-[#8AB68E]/22 blur-2xl" />
            <div className="relative flex items-start justify-between gap-3 border-b border-[#D6D5B2]/70 px-5 pb-4 pt-5">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#156240]/72">
                  {copy.eyebrow}
                </p>
                <h2 className="mt-1 text-2xl font-black leading-tight text-[#0E2A5C] md:text-xl">
                  {copy.title}
                </h2>
                <p className="mt-2 max-w-[20rem] text-sm font-semibold leading-6 text-[#156240]/70 md:text-xs md:leading-5">
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

            <div className="relative grid min-h-0 flex-1 content-start gap-7 overflow-y-auto px-5 pb-6 pt-7 md:gap-5 md:py-5">
              <div className="grid grid-cols-3 items-start gap-3 md:gap-3">
                {tools.map((tool) =>
                  tool.href ? (
                    <Link
                      className="group grid min-w-0 justify-items-center gap-2.5 rounded-[1.35rem] px-1 py-2 text-center transition hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-[#8AB68E]/55"
                      href={tool.href}
                      key={tool.key}
                      tabIndex={isOpen ? undefined : -1}
                    >
                      <span className="relative grid h-[clamp(5.6rem,25vw,7rem)] w-[clamp(4.2rem,18vw,5.25rem)] place-items-center overflow-hidden rounded-[1.1rem] bg-white shadow-[0_18px_38px_rgba(21,98,64,0.16)] ring-1 ring-[#D6D5B2] transition group-hover:shadow-[0_22px_46px_rgba(21,98,64,0.22)] md:h-24 md:w-[4.6rem]">
                        <Image
                          alt=""
                          className="h-full w-full rounded-[1.1rem] object-contain"
                          height={112}
                          src={tool.icon}
                          width={112}
                        />
                      </span>
                      <span className="grid min-w-0 max-w-[6.25rem] gap-1">
                        <span className="text-[0.76rem] font-black leading-tight text-[#0E2A5C]">
                          {tool.title}
                        </span>
                        <span className="text-[0.62rem] font-black uppercase leading-none tracking-[0.08em] text-[#156240]/64">
                          {tool.status}
                        </span>
                      </span>
                    </Link>
                  ) : (
                    <button
                      aria-disabled="true"
                      className="grid min-w-0 cursor-not-allowed justify-items-center gap-2.5 rounded-[1.35rem] px-1 py-2 text-center opacity-65"
                      disabled
                      key={tool.key}
                      tabIndex={isOpen ? undefined : -1}
                      type="button"
                    >
                      <span className="grid h-[clamp(5.6rem,25vw,7rem)] w-[clamp(4.2rem,18vw,5.25rem)] place-items-center overflow-hidden rounded-[1.1rem] bg-white shadow-[0_14px_32px_rgba(29,29,27,0.12)] ring-1 ring-[#D6D5B2] md:h-24 md:w-[4.6rem]">
                        <Image
                          alt=""
                          className="h-full w-full rounded-[1.1rem] object-contain grayscale-[0.18]"
                          height={112}
                          src={tool.icon}
                          width={112}
                        />
                      </span>
                      <span className="grid min-w-0 max-w-[6.25rem] gap-1">
                        <span className="text-[0.76rem] font-black leading-tight text-[#0E2A5C]">
                          {tool.title}
                        </span>
                        <span className="text-[0.62rem] font-black uppercase leading-none tracking-[0.08em] text-[#B5301F]/72">
                          {tool.status}
                        </span>
                      </span>
                    </button>
                  ),
                )}
              </div>
            </div>
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
          <span className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-white shadow-inner shadow-white/20 ring-4 ring-[#D6D5B2]/55">
            <Image
              alt=""
              src="/illustrations/png/board-games.png"
              width={34}
              height={34}
              className="h-9 w-9 object-cover"
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
