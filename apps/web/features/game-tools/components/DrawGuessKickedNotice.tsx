"use client";

import { useEffect } from "react";
import Link from "next/link";
import { DrawGuessCatSprite } from "@/features/game-tools/components/DrawGuessCatSprite";
import { ACTIVE_GAME_TOOL_ROOM_STORAGE_EVENT, ACTIVE_GAME_TOOL_ROOM_STORAGE_KEY } from "@/features/game-tools/activeGameToolRoomStorage";
import { withLocale } from "@/lib/routes";

export function DrawGuessKickedNotice({ catId, locale, roomId }: { catId?: string | null; locale: string; roomId: string }) {
  useEffect(() => {
    try {
      const active = JSON.parse(window.localStorage.getItem(ACTIVE_GAME_TOOL_ROOM_STORAGE_KEY) ?? "null") as { id?: string } | null;
      if (active?.id !== roomId) return;
      window.localStorage.removeItem(ACTIVE_GAME_TOOL_ROOM_STORAGE_KEY);
      window.dispatchEvent(new Event(ACTIVE_GAME_TOOL_ROOM_STORAGE_EVENT));
    } catch { /* Private browsing may block local storage. */ }
  }, [roomId]);

  return <div className="draw-guess-theme draw-guess-lobby-card mx-auto max-w-md rounded-[2rem] p-8 text-center"><DrawGuessCatSprite animated catId={catId} mood="sad" size={88} /><h1 className="mt-3 text-xl font-black">{locale === "zh-CN" ? "你已被房主移出房间" : locale === "fr" ? "Vous avez été retiré de la salle" : "The host removed you from this room"}</h1><Link href={withLocale(locale, "/game-tools/draw-guess")} className="draw-guess-btn draw-guess-btn--candy mt-6 min-h-11 px-6 text-sm">{locale === "zh-CN" ? "返回游戏" : locale === "fr" ? "Retour au jeu" : "Back to game"}</Link></div>;
}
