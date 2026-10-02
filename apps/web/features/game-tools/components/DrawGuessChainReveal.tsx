"use client";

import { ArrowRight, Pause, Play, SkipForward, Sparkles } from "lucide-react";
import { DrawGuessArtwork } from "@/features/game-tools/components/DrawGuessCanvas";
import { DrawGuessCatSprite } from "@/features/game-tools/components/DrawGuessCatSprite";
import type { DrawGuessRoomView } from "@/features/game-tools/components/DrawGuessRoomClient";
import { DRAW_GUESS_CHAIN_REACTIONS, getChainRevealPosition, type DrawGuessChainReactionKind } from "@/features/game-tools/drawGuessEngine";

const COPY = {
  "zh-CN": { title: "接龙回顾", pause: "暂停", resume: "继续", next: "下一棒", nextStory: "下一条", shared: "大家一起看", paused: "暂停中", start: "上一棒", end: "这一棒", word: "猜词", drawing: "画作", react: "给这一棒回应", auto: "系统补位", story: "第 {n} 条接龙", vote: "接下来大家选最喜欢的画" },
  en: { title: "Story reveal", pause: "Pause", resume: "Continue", next: "Next step", nextStory: "Next story", shared: "Watching together", paused: "Paused", start: "Previous", end: "Now", word: "Guess", drawing: "Drawing", react: "React to this step", auto: "Auto-filled", story: "Story {n}", vote: "Next, everyone picks their favorite drawing" },
  fr: { title: "Découverte", pause: "Pause", resume: "Continuer", next: "Étape suivante", nextStory: "Chaîne suivante", shared: "Tous ensemble", paused: "En pause", start: "Avant", end: "Maintenant", word: "Mot", drawing: "Dessin", react: "Réagir à cette étape", auto: "Automatique", story: "Chaîne {n}", vote: "Ensuite, chacun choisit son dessin préféré" },
};

export function DrawGuessChainReveal({ busy, locale, now, onControl, onReact, room }: {
  busy: boolean;
  locale: string;
  now: number;
  onControl: (command: "PAUSE" | "RESUME" | "NEXT") => Promise<unknown>;
  onReact: (owner: number, step: number, kind: DrawGuessChainReactionKind) => Promise<boolean>;
  room: DrawGuessRoomView;
}) {
  const copy = COPY[locale as keyof typeof COPY] ?? COPY.en;
  const chains = room.view.chains ?? [];
  const clock = room.view.chainReveal;
  const position = getChainRevealPosition({ chains, chainReveal: clock }, now);
  const { owner, step: stepIndex, elapsedMs, nextBoundaryMs, totalMs } = position;
  const chain = chains[owner] ?? [];
  const step = chain[stepIndex];
  const previous = chain[stepIndex - 1];
  const paused = Boolean(clock?.pausedUntil);
  const ownerSeat = room.seats.find((seat) => seat.number === owner + 1);
  const actorSeat = room.seats.find((seat) => seat.number === (step?.seat ?? -1) + 1);
  const currentReactions = (room.view.chainReactions ?? []).filter((reaction) => reaction.owner === owner && reaction.step === stepIndex);
  const reacted = room.view.myChainReactionTargets?.includes(`${owner}:${stepIndex}`);
  const elapsedBeforeStep = nextBoundaryMs - (stepIndex === chain.length - 1 ? 10_000 : 4_000);
  const stepProgress = Math.max(0, Math.min(1, (elapsedMs - elapsedBeforeStep) / Math.max(1, nextBoundaryMs - elapsedBeforeStep)));
  const atEnding = stepIndex === chain.length - 1;

  if (!step) return null;
  return <section aria-label={copy.title} className="draw-guess-stage-card min-w-0 rounded-[1.8rem] bg-[#EDF5FC] p-3 text-[#30425C] shadow-[0_12px_36px_rgba(48,66,92,.1)] sm:p-5">
    <div className="flex items-center gap-2.5 px-1 pb-3">
      <DrawGuessCatSprite animated catId={ownerSeat?.catId} mood="happy" size={48} />
      <div className="min-w-0 flex-1"><p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#3E70AA]">{copy.title} · {owner + 1}/{chains.length}</p><h2 className="truncate text-lg font-black sm:text-xl">{copy.story.replace("{n}", String(owner + 1))} · {ownerSeat?.name ?? `#${owner + 1}`}</h2></div>
      <span className="shrink-0 rounded-full bg-white px-2.5 py-1.5 text-[11px] font-black text-[#3E70AA]">{paused ? copy.paused : copy.shared}</span>
    </div>
    <div className="mb-3 h-2 overflow-hidden rounded-full bg-[#D5E4F2]" role="progressbar" aria-valuenow={Math.round(elapsedMs / Math.max(1, totalMs) * 100)} aria-valuemin={0} aria-valuemax={100}>
      <div className="h-full rounded-full bg-[#3C73B0] transition-[width] duration-300" style={{ width: `${elapsedMs / Math.max(1, totalMs) * 100}%` }} />
    </div>
    <div className="mt-3 rounded-[1.35rem] bg-white p-2 shadow-[0_4px_0_#D5E4F2] sm:p-3">
      <div className="flex items-center gap-2 px-1 pb-2"><span className="min-w-0 flex-1 truncate text-xs font-bold text-[#63758D]">{stepIndex}/{chain.length - 1} · {actorSeat?.name ?? `#${step.seat + 1}`}{step.system ? ` · ${copy.auto}` : ""}</span><span className="text-xs font-black text-[#3E70AA]">{step.kind === "DRAWING" ? copy.drawing : copy.word}</span></div>
      <div aria-live="polite" className="draw-guess-chain-step min-w-0 overflow-hidden rounded-2xl bg-[#F7FAFE]" key={`${owner}-${stepIndex}`}>
        {step.kind === "DRAWING" ? <><div className="flex min-h-16 items-center justify-center gap-2 bg-[#E8F2FB] px-3 py-2 text-center"><span className="shrink-0 text-xs font-bold text-[#63758D]">{copy.start}</span><ArrowRight className="h-4 w-4 shrink-0 text-[#3E70AA]" /><strong className="break-words text-lg font-black sm:text-2xl">{previous?.kind === "WORD" ? previous.value : "—"}</strong></div><div className="aspect-[10/7] max-h-[36dvh] w-full overflow-hidden bg-white"><DrawGuessArtwork strokes={step.value} /></div></> : <><div className="aspect-[10/7] max-h-[36dvh] w-full overflow-hidden bg-white">{previous?.kind === "DRAWING" ? <DrawGuessArtwork strokes={previous.value} /> : null}</div><div className="flex min-h-16 items-center justify-center gap-2 bg-[#E8F2FB] px-3 py-2 text-center"><Sparkles className="h-4 w-4 shrink-0 text-[#3E70AA]" /><span className="text-xs font-bold text-[#63758D]">{copy.end}</span><strong className="break-words text-lg font-black sm:text-2xl">{step.value}</strong></div></>}
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#E8F2FB]"><div className="h-full rounded-full bg-[#E9AA41] transition-[width] duration-300" style={{ width: `${stepProgress * 100}%` }} /></div>
      <div className="mt-2 flex min-h-9 items-center justify-between gap-2 px-1"><span className="text-xs font-bold text-[#63758D]">{owner + 1}/{chains.length}</span><div role="group" aria-label={copy.react} className="flex items-center gap-1">{DRAW_GUESS_CHAIN_REACTIONS.map((kind) => {
        const count = currentReactions.filter((reaction) => reaction.kind === kind).length;
        return <button key={kind} type="button" aria-label={`${copy.react} ${kind}${count ? ` · ${count}` : ""}`} disabled={room.viewerSeat < 0 || reacted} onClick={() => void onReact(owner, stepIndex, kind)} className={`flex h-8 min-w-8 items-center justify-center gap-0.5 rounded-full px-1 text-base transition-transform hover:scale-110 disabled:cursor-default disabled:opacity-65 ${count ? "bg-[#E5F1FC]" : "bg-[#F3F7FB]"}`}>{kind}{count ? <span className="text-[10px] font-black text-[#3E70AA]">{count}</span> : null}</button>;
      })}</div></div>
      {currentReactions.length ? <div aria-live="polite" className="flex h-6 items-center gap-1.5 overflow-hidden px-1">{currentReactions.slice(-2).reverse().map((reaction) => <span key={`${reaction.seat}:${reaction.at}`} className="draw-guess-chain-reaction-in shrink-0 rounded-full bg-[#EFF6FC] px-2 py-0.5 text-[11px] font-bold text-[#405875]">{room.seats.find((seat) => seat.number === reaction.seat + 1)?.name ?? `#${reaction.seat + 1}`} {reaction.kind}</span>)}</div> : null}
    </div>
    {atEnding ? <p className="mt-3 text-center text-xs font-bold text-[#3E70AA]">{copy.vote}</p> : null}
    {room.isHost ? <div className="mt-3 flex gap-2"><button type="button" disabled={busy} onClick={() => void onControl(paused ? "RESUME" : "PAUSE")} className="draw-guess-btn draw-guess-btn--milk min-h-11 flex-1 px-3 text-sm">{paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}{paused ? copy.resume : copy.pause}</button><button type="button" disabled={busy} onClick={() => void onControl("NEXT")} className="draw-guess-btn draw-guess-btn--candy min-h-11 flex-1 px-3 text-sm"><SkipForward className="h-4 w-4" />{atEnding ? copy.nextStory : copy.next}</button></div> : null}
  </section>;
}
