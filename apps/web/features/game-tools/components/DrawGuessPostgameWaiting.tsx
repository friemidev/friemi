"use client";

import { useState } from "react";
import { ArrowLeft, Check, Copy, Sparkles } from "lucide-react";
import { DrawGuessCatSprite } from "@/features/game-tools/components/DrawGuessCatSprite";
import { DrawGuessMusicToggle } from "@/features/game-tools/components/DrawGuessMusicToggle";
import { DrawGuessSoundToggle } from "@/features/game-tools/components/DrawGuessSoundToggle";
import type { DrawGuessRoomView } from "@/features/game-tools/components/DrawGuessRoomClient";

export function DrawGuessPostgameWaiting({ locale, onLeave, room }: { locale: string; onLeave: () => Promise<void>; room: DrawGuessRoomView }) {
  const [copied, setCopied] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [error, setError] = useState(false);
  const copy = locale === "zh-CN"
    ? { title: "回到房间啦", wait: "等大家看完回顾，就能准备下一局", returned: "已回房", watching: "还在看回顾", left: "已离开", back: "退出房间", copied: "已复制", code: "复制房间号", retry: "请再试一次" }
    : locale === "fr"
      ? { title: "De retour dans la salle", wait: "On attend que tout le monde termine la rétrospective", returned: "De retour", watching: "Regarde encore", left: "Parti", back: "Quitter", copied: "Copié", code: "Copier le code", retry: "Réessayez" }
      : { title: "Back in the room", wait: "Waiting for everyone to finish the replay", returned: "Back", watching: "Still watching", left: "Left", back: "Leave room", copied: "Copied", code: "Copy room code", retry: "Please try again" };

  async function copyCode() {
    try { await navigator.clipboard.writeText(room.code); setCopied(true); window.setTimeout(() => setCopied(false), 2_000); }
    catch { setError(true); }
  }

  return <div className="draw-guess-theme mx-auto w-full max-w-3xl pb-8 text-[#30425C]">
    <div className="flex items-center justify-between gap-2">
      <button type="button" disabled={leaving} onClick={() => { setLeaving(true); void onLeave().catch(() => { setLeaving(false); setError(true); }); }} className="inline-flex min-h-10 items-center gap-1 text-sm font-bold text-[#63758D]"><ArrowLeft className="h-4 w-4" />{copy.back}</button>
      <div className="flex items-center gap-2"><DrawGuessSoundToggle locale={locale} /><DrawGuessMusicToggle locale={locale} /></div>
    </div>
    <section className="draw-guess-stage-card mt-3 rounded-[1.8rem] bg-[#EDF5FC] p-4 shadow-[0_12px_36px_rgba(48,66,92,.1)] sm:p-6">
      <div className="flex items-center gap-3"><DrawGuessCatSprite animated catId={room.seats.find((seat) => seat.number === room.viewerSeat + 1)?.catId} mood="happy" size={66} /><div className="min-w-0 flex-1"><p className="flex items-center gap-1 text-xs font-black text-[#3E70AA]"><Sparkles className="h-3.5 w-3.5" />{room.postgameReturnProgress?.done ?? 1}/{room.postgameReturnProgress?.total ?? room.seats.length}</p><h1 className="text-xl font-black sm:text-2xl">{copy.title}</h1><p className="mt-1 text-xs font-semibold text-[#63758D]">{copy.wait}</p></div></div>
      <button type="button" aria-label={copy.code} onClick={() => void copyCode()} className="draw-guess-btn draw-guess-btn--milk mt-4 min-h-10 w-full gap-2 px-3 text-sm"><Copy className="h-4 w-4" />{room.code}{copied ? <Check className="h-4 w-4" /> : null}</button>
      <div className="mt-4 grid grid-cols-3 gap-2 sm:gap-3">{room.seats.filter((seat) => !seat.isSystem).map((seat) => <div key={seat.id} className={`flex min-w-0 flex-col items-center rounded-2xl p-2 text-center ${seat.returned ? "bg-[#DDEDFB]" : "bg-white/75"}`}><DrawGuessCatSprite animated catId={seat.catId} mood={seat.returned ? "happy" : "idle"} size={52} /><strong className="max-w-full truncate text-xs">{seat.name}</strong><span className={`mt-1 text-[10px] font-bold ${seat.returned ? "text-[#3E70AA]" : "text-[#63758D]"}`}>{seat.returned ? copy.returned : seat.present === false ? copy.left : copy.watching}</span></div>)}</div>
      {error ? <p role="alert" className="mt-3 text-center text-xs font-bold text-[#9A6736]">{copy.retry}</p> : null}
    </section>
  </div>;
}
