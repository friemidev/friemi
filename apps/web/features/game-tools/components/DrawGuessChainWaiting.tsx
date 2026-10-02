"use client";

import { useState } from "react";
import { Check, Send, Sparkles } from "lucide-react";
import { DrawGuessCatSprite } from "@/features/game-tools/components/DrawGuessCatSprite";
import { DrawGuessPet } from "@/features/game-tools/components/DrawGuessPet";
import { DRAW_GUESS_CHAIN_REACTIONS, type DrawGuessChainReactionKind } from "@/features/game-tools/drawGuessEngine";
import type { DrawGuessRoomView } from "@/features/game-tools/components/DrawGuessRoomClient";

export function DrawGuessChainWaiting({ locale, onReact, room }: { locale: string; onReact?: (kind: DrawGuessChainReactionKind) => Promise<boolean>; room: DrawGuessRoomView }) {
  const [sending, setSending] = useState<DrawGuessChainReactionKind | null>(null);
  const [sent, setSent] = useState<DrawGuessChainReactionKind | null>(null);
  const done = Math.min(room.view.chainSubmittedCount ?? 0, room.playerCount);
  const finished = new Set(room.view.chainFinishedSeats ?? Array.from({ length: done }, (_, index) => index));
  const compactRoster = room.playerCount >= 7;
  const spectator = room.viewerSeat < 0;
  const stage = room.view.phase === "CHAIN_WORD" ? "choosing" : room.view.chainStage % 2 ? "drawing" : "guessing";
  const reacted = room.view.myChainReactionTargets?.includes(`wait:${room.view.chainStage}`) || Boolean(sent);
  const recent = (room.view.chainReactions ?? []).filter((item) => item.owner === -1 && item.stage === room.view.chainStage).slice(-3).reverse();
  const copy = locale === "zh-CN"
    ? { sent: stage === "choosing" ? "起始词已交出" : "这一棒交出去啦", wait: stage === "drawing" ? "等大家画完" : stage === "guessing" ? "等大家猜完" : "等大家选词", done: stage === "drawing" ? "已画完" : stage === "guessing" ? "已猜完" : "已选词", pending: stage === "drawing" ? "作画中" : stage === "guessing" ? "猜词中" : "选词中", cheer: "给大家打气" }
    : locale === "fr"
      ? { sent: stage === "choosing" ? "Mot de départ envoyé" : "Étape transmise !", wait: stage === "drawing" ? "Les chats dessinent" : stage === "guessing" ? "Les chats devinent" : "Les chats choisissent", done: stage === "drawing" ? "dessins finis" : stage === "guessing" ? "réponses données" : "mots choisis", pending: stage === "drawing" ? "Dessine" : stage === "guessing" ? "Devine" : "Choisit", cheer: "Encourager le groupe" }
      : { sent: stage === "choosing" ? "Starting word sent" : "Passed it on!", wait: stage === "drawing" ? "Waiting for everyone's drawings" : stage === "guessing" ? "Waiting for everyone's guesses" : "Waiting for everyone's words", done: stage === "drawing" ? "drawn" : stage === "guessing" ? "guessed" : "chosen", pending: stage === "drawing" ? "Drawing" : stage === "guessing" ? "Guessing" : "Choosing", cheer: "Cheer for everyone" };
  const spectatorCopy = locale === "zh-CN" ? { sent: "接龙进行中", wait: "揭晓时一起看" } : locale === "fr" ? { sent: "La chaîne avance", wait: "À voir ensemble bientôt" } : { sent: "The chain is underway", wait: "Watch the reveal together soon" };
  const myCat = room.seats.find((seat) => seat.number === room.viewerSeat + 1)?.catId;

  async function react(kind: DrawGuessChainReactionKind) {
    if (!onReact || sending || reacted) return;
    setSending(kind);
    const ok = await onReact(kind);
    setSending(null);
    if (ok) setSent(kind);
  }

  return <div className="relative flex min-h-0 flex-1 flex-col items-center justify-center overflow-hidden px-3 py-3 text-center text-[#30425C]">
    <span aria-hidden="true" className="draw-guess-chain-orbit absolute top-[7%] h-40 w-40 rounded-full border border-dashed border-[#B8D2E9]" />
    <span aria-hidden="true" className="draw-guess-chain-orbit draw-guess-chain-orbit--inner absolute top-[10%] h-32 w-32 rounded-full border border-dashed border-[#D9E8F5]" />
    <div className="draw-guess-chain-pass relative z-10 mt-2 scale-100 sm:scale-110"><DrawGuessPet catId={myCat} locale={locale} size={64} /></div>
    <div className="relative z-10 mt-1 flex items-center gap-2 rounded-full bg-[#E8F2FB] px-4 py-1.5 text-sm font-black text-[#3E70AA] shadow-[0_3px_0_#C9DDEA]"><Check className="h-4 w-4" />{spectator ? spectatorCopy.sent : copy.sent}{!spectator ? <Send className="draw-guess-chain-send h-4 w-4" /> : null}</div>
    <p className="relative z-10 mt-2 text-xs font-semibold text-[#63758D]">{spectator ? spectatorCopy.wait : copy.wait}</p>
    <div aria-live="polite" className="relative z-10 mt-1 flex items-center gap-1 text-sm font-black tabular-nums text-[#3E70AA]"><Sparkles className="h-3.5 w-3.5 text-[#D9A447]" />{done}/{room.playerCount} {copy.done}</div>
    <div className={`relative z-10 mt-3 flex w-full flex-wrap justify-center ${compactRoster ? "max-w-[16rem] gap-1 sm:max-w-[23rem] sm:gap-2" : room.playerCount === 5 || room.playerCount === 6 ? "max-w-[15rem] gap-1.5 sm:max-w-[31rem] sm:gap-2" : "max-w-[20rem] gap-1.5 sm:max-w-[31rem] sm:gap-2"}`} aria-label={copy.wait}>
      {Array.from({ length: room.playerCount }, (_, index) => {
        const seat = room.seats.find((item) => item.number === index + 1);
        const isDone = finished.has(index);
        const name = seat?.name ?? `#${index + 1}`;
        return <div key={index} aria-label={`${name} · ${isDone ? copy.done : copy.pending}`} className={`flex ${compactRoster ? "w-[3.8rem] sm:w-[5.2rem]" : "w-[4.6rem] sm:w-[5.4rem]"} min-w-0 flex-col items-center rounded-2xl px-0.5 py-1.5 transition-colors duration-300 ${isDone ? "bg-[#E5F1FC]" : "bg-[#FFF9EB]"}`}>
          <span className={`relative ${isDone ? "draw-guess-chain-ready" : ""}`}><DrawGuessCatSprite activity={isDone ? "none" : stage === "drawing" ? "drawing" : "thinking"} animated catId={seat?.catId} size={compactRoster ? 48 : 58} />{isDone ? <Check aria-hidden="true" className="absolute -right-0.5 -top-0.5 h-4 w-4 rounded-full bg-[#3C73B0] p-0.5 text-white" /> : null}</span>
          <span className="max-w-full truncate text-[10px] font-black leading-tight">{name}</span>
          <span className={`mt-0.5 text-[9px] font-bold leading-tight ${isDone ? "text-[#3E70AA]" : "text-[#A77737]"}`}>{isDone ? copy.done : copy.pending}</span>
        </div>;
      })}
    </div>
    {recent.length ? <div aria-live="polite" className="relative z-10 mt-2 flex max-w-full gap-1.5 overflow-hidden">{recent.map((item) => <span key={`${item.seat}:${item.at}`} className="draw-guess-chain-reaction-in shrink-0 rounded-full bg-white px-2 py-1 text-[11px] font-bold shadow-sm">{room.seats.find((seat) => seat.number === item.seat + 1)?.name ?? `#${item.seat + 1}`} {item.kind}</span>)}</div> : null}
    {onReact && room.viewerSeat >= 0 ? <div className="relative z-10 mt-3 flex items-center gap-2"><span className="text-[11px] font-bold text-[#63758D]">{copy.cheer}</span>{DRAW_GUESS_CHAIN_REACTIONS.map((kind) => <button key={kind} type="button" aria-label={`${copy.cheer} ${kind}`} disabled={reacted || Boolean(sending)} onClick={() => void react(kind)} className={`draw-guess-btn draw-guess-btn--milk grid h-9 min-h-9 w-9 place-items-center p-0 text-lg ${sent === kind ? "draw-guess-chain-ready" : ""}`}>{kind}</button>)}</div> : null}
  </div>;
}
