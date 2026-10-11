"use client";

import Link from "next/link";
import { useEffect } from "react";
import { DrawGuessCatSprite } from "./DrawGuessCatSprite";
import { forgetDrawGuessRecentRoom } from "../drawGuessRecentRoom";
import { withLocale } from "@/lib/routes";

export function DrawGuessRoomClosedNotice({ locale, roomId, profileId }: { locale: string; roomId: string; profileId?: string }) {
  useEffect(() => { forgetDrawGuessRecentRoom(profileId, { id: roomId }); }, [profileId, roomId]);
  return <div className="draw-guess-theme draw-guess-lobby-card mx-auto max-w-md rounded-[2rem] p-8 text-center">
    <DrawGuessCatSprite catId="cloud" mood="sad" size={88} />
    <h1 className="mt-3 text-xl font-black">{locale === "zh-CN" ? "房间已关闭" : locale === "fr" ? "Salle fermée" : "Room closed"}</h1>
    <Link href={withLocale(locale, "/game-tools/draw-guess")} className="draw-guess-btn draw-guess-btn--candy mt-6 min-h-11 px-6 text-sm">{locale === "zh-CN" ? "返回游戏" : locale === "fr" ? "Retour au jeu" : "Back to game"}</Link>
  </div>;
}
