"use client";

import { useEffect } from "react";
import Link from "next/link";
import { DrawGuessCatSprite } from "@/features/game-tools/components/DrawGuessCatSprite";
import { withLocale } from "@/lib/routes";
import { forgetDrawGuessRecentRoom } from "@/features/game-tools/drawGuessRecentRoom";

export function DrawGuessKickedNotice({ catId, locale, roomId, profileId }: { catId?: string | null; locale: string; roomId: string; profileId?: string }) {
  useEffect(() => {
    forgetDrawGuessRecentRoom(profileId, { id: roomId });
  }, [profileId, roomId]);

  return <div className="draw-guess-theme draw-guess-lobby-card mx-auto max-w-md rounded-[2rem] p-8 text-center"><DrawGuessCatSprite animated catId={catId} mood="sad" size={88} /><h1 className="mt-3 text-xl font-black">{locale === "zh-CN" ? "你已被房主移出房间" : locale === "fr" ? "Vous avez été retiré de la salle" : "The host removed you from this room"}</h1><Link href={withLocale(locale, "/game-tools/draw-guess")} className="draw-guess-btn draw-guess-btn--candy mt-6 min-h-11 px-6 text-sm">{locale === "zh-CN" ? "返回游戏" : locale === "fr" ? "Retour au jeu" : "Back to game"}</Link></div>;
}
