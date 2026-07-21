"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Moon, Sparkles, UsersRound } from "lucide-react";
import { cn } from "@/lib/utils";

type ActiveGameToolFloatingWindowProps = {
  activeRoom: {
    code: string;
    href: string;
    kind: "AVALON" | "STORYTELLER" | "WEREWOLF";
    privateSeatHref: string | null;
    seatNumber: number | null;
    title: string;
  } | null;
  locale: string;
};

function getCopy(locale: string) {
  if (locale === "fr") {
    return {
      action: "Revenir",
      avalon: "Avalon en cours",
      seat: "Place",
      storyteller: "Table en cours",
      werewolf: "Loups-garous en cours",
    };
  }

  if (locale === "en") {
    return {
      action: "Return",
      avalon: "Avalon running",
      seat: "Seat",
      storyteller: "Game running",
      werewolf: "Werewolf running",
    };
  }

  return {
    action: "回到本局",
    avalon: "阿瓦隆进行中",
    seat: "座位",
    storyteller: "桌游进行中",
    werewolf: "狼人杀进行中",
  };
}

function getKindLabel(
  kind: NonNullable<ActiveGameToolFloatingWindowProps["activeRoom"]>["kind"],
  copy: ReturnType<typeof getCopy>,
) {
  if (kind === "AVALON") {
    return copy.avalon;
  }

  if (kind === "WEREWOLF") {
    return copy.werewolf;
  }

  return copy.storyteller;
}

export function ActiveGameToolFloatingWindow({
  activeRoom,
  locale,
}: ActiveGameToolFloatingWindowProps) {
  const pathname = usePathname();

  if (!activeRoom) {
    return null;
  }

  const isInsideActiveRoom =
    pathname.startsWith(activeRoom.href) ||
    (activeRoom.privateSeatHref
      ? pathname.startsWith(activeRoom.privateSeatHref)
      : false);

  if (isInsideActiveRoom) {
    return null;
  }

  const copy = getCopy(locale);
  const kindLabel = getKindLabel(activeRoom.kind, copy);
  const Icon = activeRoom.kind === "WEREWOLF" ? Moon : UsersRound;
  const targetHref = activeRoom.privateSeatHref ?? activeRoom.href;

  return (
    <Link
      href={targetHref}
      className={cn(
        "fixed inset-x-4 bottom-[calc(5.9rem+env(safe-area-inset-bottom))] z-[55] mx-auto flex max-w-md items-center gap-3 rounded-[1.35rem] border border-[#D8B56A]/54 bg-[#052F28]/96 px-3.5 py-3 text-[#FFF6D6] shadow-[0_18px_46px_rgba(5,47,40,0.26)] backdrop-blur md:bottom-5 md:left-auto md:right-5 md:w-80 md:max-w-none",
        "transition duration-200 ease-out hover:-translate-y-0.5 hover:bg-[#063A30] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F2CF7C]/70",
      )}
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#F2CF7C]/16 text-[#F2CF7C] ring-1 ring-[#F2CF7C]/34">
        <Icon className="h-5 w-5" strokeWidth={2.3} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.12em] text-[#F2CF7C]">
          <Sparkles className="h-3.5 w-3.5" />
          {kindLabel}
        </span>
        <span className="mt-1 block truncate text-sm font-black leading-tight text-[#FFFDF7]">
          {activeRoom.title}
        </span>
        <span className="mt-0.5 block text-[11px] font-bold text-[#FFF6D6]/76">
          {activeRoom.seatNumber
            ? `${copy.seat} ${activeRoom.seatNumber} · ${activeRoom.code}`
            : activeRoom.code}
        </span>
      </span>
      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#FFF6D6] px-3 py-2 text-xs font-black text-[#052F28]">
        {copy.action}
        <ChevronRight className="h-3.5 w-3.5" strokeWidth={2.4} />
      </span>
    </Link>
  );
}
