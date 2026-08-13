"use client";

import Link from "next/link";
import { BellOff, Ellipsis, ExternalLink, Pin } from "lucide-react";
import { useState } from "react";
import {
  togglePlanetChatMuteAction,
  togglePlanetChatPinAction,
} from "@/features/planets/actions/planetActions";

function getCopy(locale: string) {
  if (locale === "fr") {
    return {
      close: "Fermer les réglages",
      menu: "Réglages de la discussion",
      mute: "Mettre en sourdine",
      pin: "Épingler la discussion",
      viewPlanet: "Voir la planète",
    };
  }

  if (locale === "en") {
    return {
      close: "Close chat settings",
      menu: "Chat settings",
      mute: "Mute notifications",
      pin: "Pin chat",
      viewPlanet: "View planet",
    };
  }

  return {
    close: "关闭聊天设置",
    menu: "聊天设置",
    mute: "消息免打扰",
    pin: "置顶聊天",
    viewPlanet: "查看星球",
  };
}

function PreferenceRow({
  action,
  checked,
  fieldName,
  icon,
  label,
  locale,
  planetId,
  planetSlug,
}: {
  action: (formData: FormData) => Promise<void>;
  checked: boolean;
  fieldName: "muted" | "pinned";
  icon: React.ReactNode;
  label: string;
  locale: string;
  planetId: string;
  planetSlug: string;
}) {
  return (
    <form action={action}>
      <input name="locale" type="hidden" value={locale} />
      <input name="planetId" type="hidden" value={planetId} />
      <input name="planetSlug" type="hidden" value={planetSlug} />
      <input name={fieldName} type="hidden" value={checked ? "0" : "1"} />
      <button
        aria-checked={checked}
        className="flex min-h-14 w-full items-center gap-3 border-b border-[#EFEFEA] px-4 text-left transition active:bg-[#F7F7F2]"
        role="switch"
        type="submit"
      >
        <span className="text-[#155F40]">{icon}</span>
        <span className="min-w-0 flex-1 text-sm font-bold text-[#111210]">{label}</span>
        <span className={`relative h-7 w-12 shrink-0 rounded-full p-0.5 transition-colors ${checked ? "bg-[#1DB96A]" : "bg-[#D8DAD5]"}`}>
          <span className={`block h-6 w-6 rounded-full bg-white shadow-[0_1px_4px_rgba(17,18,16,0.24)] transition-transform ${checked ? "translate-x-5" : ""}`} />
        </span>
      </button>
    </form>
  );
}

export function PlanetChatSettingsMenu({
  isMuted,
  isPinned,
  locale,
  planetHref,
  planetId,
  planetSlug,
}: {
  isMuted: boolean;
  isPinned: boolean;
  locale: string;
  planetHref: string;
  planetId: string;
  planetSlug: string;
}) {
  const [open, setOpen] = useState(false);
  const copy = getCopy(locale);

  return (
    <div className="relative">
      {open ? (
        <button
          aria-label={copy.close}
          className="fixed inset-0 z-40 bg-transparent"
          onClick={() => setOpen(false)}
          type="button"
        />
      ) : null}
      <button
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={copy.menu}
        className="relative z-50 flex h-10 w-10 items-center justify-center rounded-full border border-[#D9D6C8] bg-white text-[#155F40] transition active:scale-95"
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <Ellipsis className="h-5 w-5" />
      </button>
      {open ? (
        <div className="absolute right-0 top-12 z-50 w-64 overflow-hidden rounded-xl border border-[#E2DFD3] bg-white shadow-[0_18px_45px_rgba(17,18,16,0.16)]" role="menu">
          <PreferenceRow
            action={togglePlanetChatMuteAction}
            checked={isMuted}
            fieldName="muted"
            icon={<BellOff className="h-4 w-4" />}
            label={copy.mute}
            locale={locale}
            planetId={planetId}
            planetSlug={planetSlug}
          />
          <PreferenceRow
            action={togglePlanetChatPinAction}
            checked={isPinned}
            fieldName="pinned"
            icon={<Pin className="h-4 w-4" />}
            label={copy.pin}
            locale={locale}
            planetId={planetId}
            planetSlug={planetSlug}
          />
          <Link
            className="flex min-h-14 items-center gap-3 px-4 text-sm font-bold text-[#111210] transition active:bg-[#F7F7F2]"
            href={planetHref}
            role="menuitem"
          >
            <ExternalLink className="h-4 w-4 text-[#155F40]" />
            {copy.viewPlanet}
          </Link>
        </div>
      ) : null}
    </div>
  );
}
