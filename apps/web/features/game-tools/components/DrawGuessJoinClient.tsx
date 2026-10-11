"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LoaderCircle, X } from "lucide-react";
import { DrawGuessCatSprite } from "@/features/game-tools/components/DrawGuessCatSprite";
import { withLocale } from "@/lib/routes";
import { forgetDrawGuessRecentRoom } from "@/features/game-tools/drawGuessRecentRoom";
import { joinDrawGuessRoomPending } from "@/features/game-tools/drawGuessJoinRequest";

export function DrawGuessJoinClient({ code, expectedRoomId, locale, profileId }: { code: string; expectedRoomId?: string; locale: string; profileId?: string | null }) {
  const router = useRouter();
  const [error, setError] = useState("");
  useEffect(() => {
    let mounted = true;
    setError("");
    joinDrawGuessRoomPending({ profileId, code, expectedRoomId })
      .then((roomId) => { if (mounted) router.replace(withLocale(locale, `/game-tools/draw-guess/rooms/${roomId}`)); })
      .catch((cause) => {
        if (!mounted) return;
        const issue = cause instanceof Error ? cause.message : "UNKNOWN";
        if (issue === "ROOM_NOT_FOUND" || issue === "KICKED") forgetDrawGuessRecentRoom(profileId, expectedRoomId !== undefined ? { id: expectedRoomId } : { code: code.trim().toUpperCase() });
        setError(issue);
      });
    return () => { mounted = false; };
  }, [code, expectedRoomId, locale, profileId, router]);
  const missing = error === "ROOM_NOT_FOUND" || error === "INVALID_REQUEST";
  const message = missing ? locale === "zh-CN" ? "房间不存在" : locale === "fr" ? "Salle introuvable" : "Room not found"
    : error === "CHAIN_NOT_ENABLED" ? locale === "zh-CN" ? "画画接龙敬请期待" : locale === "fr" ? "Chaîne de dessins bientôt disponible" : "Picture chain is coming soon"
    : error === "KICKED" ? locale === "zh-CN" ? "你已被房主移出这个房间。" : locale === "fr" ? "L'hôte vous a retiré de cette salle." : "The host removed you from this room."
    : error === "SIGN_IN_REQUIRED" ? locale === "zh-CN" ? "请先登录，再打开邀请链接。" : "Please sign in first."
      : locale === "zh-CN" ? "暂时无法加入，请重试。" : "Could not join this room.";
  return <div className="draw-guess-theme draw-guess-lobby-card rounded-[2rem] p-8 text-center"><DrawGuessCatSprite animated catId="cloud" mood="happy" size={80} /><h1 className="mt-3 text-2xl font-black">{locale === "zh-CN" ? "加入你画我猜" : locale === "fr" ? "Rejoindre la salle" : "Join Draw & Guess"}</h1><p className="mt-3 font-mono text-xl font-black tracking-widest">{code.toUpperCase()}</p><LoaderCircle className="mx-auto mt-6 h-6 w-6 animate-spin text-[#3F74AE]" />{error ? <div className="fixed inset-0 z-[120] grid place-items-center bg-[#273A53]/55 p-4"><div role="alertdialog" aria-modal="true" aria-label={message} className="draw-guess-dialog relative w-full max-w-sm rounded-[2rem] bg-[#FFFCF5] p-7 text-center shadow-[0_24px_70px_rgba(48,66,92,0.3)]"><Link aria-label={locale === "zh-CN" ? "返回" : "Back"} href={withLocale(locale, "/game-tools/draw-guess")} className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full bg-[#E8F2FB]"><X className="h-4 w-4" /></Link><DrawGuessCatSprite animated catId="cloud" mood="sad" size={90} /><h2 className="mt-2 text-2xl font-black">{message}</h2><Link className="draw-guess-btn draw-guess-btn--candy mt-6 inline-flex min-h-12 w-full px-5 text-sm" href={withLocale(locale, "/game-tools/draw-guess")}>{locale === "zh-CN" ? "重新输入房间号" : "Try another code"}</Link></div></div> : null}</div>;
}
