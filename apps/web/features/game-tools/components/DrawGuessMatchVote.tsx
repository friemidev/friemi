"use client";

import { useState } from "react";
import { Check, X } from "lucide-react";
import { DrawGuessCatSprite } from "@/features/game-tools/components/DrawGuessCatSprite";
import type { DrawGuessRoomView } from "@/features/game-tools/components/DrawGuessRoomClient";

const COPY = {
  "zh-CN": { title: "首尾词，像不像？", resultTitle: "大家的举牌结果", first: "起始词", final: "最后一猜", yes: "像，举勾", no: "不像，举叉", matched: "过半数，接龙加分", missed: "未过半数", waiting: "等大家举牌", spectator: "观战中", yesCount: "赞成", story: "第 {n} 条接龙" },
  en: { title: "Do the first and final words match?", resultTitle: "Everyone's votes", first: "First word", final: "Final guess", yes: "Yes, raise a tick", no: "No, raise a cross", matched: "Majority: points awarded", missed: "No majority", waiting: "Waiting for signs", spectator: "Spectating", yesCount: "Yes", story: "Story {n}" },
  fr: { title: "Les mots du début et de la fin se ressemblent ?", resultTitle: "Votes de tous", first: "Premier mot", final: "Dernier mot", yes: "Oui, lever la coche", no: "Non, lever la croix", matched: "Majorité : points gagnés", missed: "Sans majorité", waiting: "On attend les votes", spectator: "Spectateur", yesCount: "Oui", story: "Chaîne {n}" },
};

export function DrawGuessMatchVote({ busy, locale, onVote, room }: {
  busy: boolean;
  locale: string;
  onVote: (owner: number, value: boolean) => Promise<unknown>;
  room: DrawGuessRoomView;
}) {
  const copy = COPY[locale as keyof typeof COPY] ?? COPY.en;
  const [activeOwner, setActiveOwner] = useState(0);
  const chains = room.view.chains ?? [];
  const owner = Math.min(activeOwner, Math.max(0, chains.length - 1));
  const chain = chains[owner] ?? [];
  const first = chain[0];
  const last = chain.at(-1);
  const votes = room.view.matchVotes ?? {};
  const mine = room.viewerSeat >= 0 ? votes[String(owner)]?.[String(room.viewerSeat)] : undefined;
  const counts = room.view.voteCounts?.[owner];
  const resultPhase = room.view.phase === "MATCH_RESULT";
  const eligibleSeats = room.seats.filter((seat) => !seat.isSystem && (resultPhase && room.view.matchVoterSeats ? room.view.matchVoterSeats.includes(seat.number - 1) : !seat.managed));
  const total = eligibleSeats.length;
  const votedStories = chains.filter((_, index) => votes[String(index)]?.[String(room.viewerSeat)] !== undefined).length;

  async function vote(value: boolean) {
    if (busy || resultPhase || room.viewerSeat < 0) return;
    const response = await onVote(owner, value);
    if (!response) return;
    const next = chains.findIndex((_, index) => index > owner && votes[String(index)]?.[String(room.viewerSeat)] === undefined);
    const wrapped = chains.findIndex((_, index) => index !== owner && votes[String(index)]?.[String(room.viewerSeat)] === undefined);
    if (next >= 0) setActiveOwner(next);
    else if (wrapped >= 0) setActiveOwner(wrapped);
  }

  if (!chains.length) return null;
  if (resultPhase) return <section aria-label={copy.resultTitle} className="draw-guess-stage-card min-w-0 rounded-[1.8rem] bg-[#EDF5FC] p-3 text-[#30425C] shadow-[0_12px_36px_rgba(48,66,92,.1)] sm:p-5">
    <h2 className="px-1 pb-3 text-lg font-black sm:text-xl">{copy.resultTitle}</h2>
    <div className="space-y-2">{chains.map((story, index) => {
      const yes = room.view.voteCounts?.[index]?.yes ?? 0;
      const passed = room.view.matchResults?.[String(index)] === true;
      const finalGuess = story.at(-1);
      return <article key={index} className="min-w-0 rounded-[1.3rem] bg-white px-3 py-2.5 shadow-[0_3px_0_#D5E4F2]">
        <div className="flex items-center justify-between gap-2"><strong className="min-w-0 truncate text-xs font-black text-[#405875]">{copy.story.replace("{n}", String(index + 1))} · {room.seats[index]?.name}</strong><span className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-black ${passed ? "bg-[#D9F2E0] text-[#267749]" : "bg-[#FBE4E1] text-[#A94747]"}`}>{passed ? copy.matched : copy.missed} · {yes}/{total}</span></div>
        <p className="my-1.5 break-words text-sm font-black">{story[0]?.kind === "WORD" ? story[0].value : "—"} <span className="px-1 text-[#3E70AA]">→</span> {finalGuess?.kind === "WORD" ? finalGuess.value : "—"}</p>
        <div aria-label={`${copy.story.replace("{n}", String(index + 1))} ${copy.resultTitle}`} className="flex flex-wrap gap-1.5">{eligibleSeats.map((seat) => { const value = votes[String(index)]?.[String(seat.number - 1)]; return <span key={seat.number} className={`draw-guess-chain-reaction-in inline-flex min-w-0 items-center gap-0.5 rounded-full py-0.5 pl-0.5 pr-1.5 text-[10px] font-black ${value === true ? "bg-[#E5F5E9] text-[#267749]" : value === false ? "bg-[#FBE9E6] text-[#A94747]" : "bg-[#F0F3F7] text-[#63758D]"}`}><DrawGuessCatSprite catId={seat.catId} size={22} /><span aria-label={value === true ? copy.yes : value === false ? copy.no : copy.waiting} className="grid h-4 w-4 shrink-0 place-items-center rounded bg-white">{value === true ? <Check className="h-3 w-3 stroke-[3]" /> : value === false ? <X className="h-3 w-3 stroke-[3]" /> : "·"}</span><span className="max-w-14 truncate">{seat.name}</span></span>; })}</div>
      </article>;
    })}</div>
  </section>;
  return <section aria-label={copy.title} className="draw-guess-stage-card min-w-0 rounded-[1.8rem] bg-[#EDF5FC] p-3 text-[#30425C] shadow-[0_12px_36px_rgba(48,66,92,.1)] sm:p-5">
    <div className="mb-3 flex items-center justify-between gap-2 px-1"><div><p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#3E70AA]">{copy.story.replace("{n}", String(owner + 1))} · {owner + 1}/{chains.length}</p><h2 className="text-lg font-black sm:text-xl">{copy.title}</h2></div><span className="shrink-0 rounded-full bg-white px-3 py-1.5 text-xs font-black text-[#3E70AA]">{votedStories}/{chains.length}</span></div>
    {chains.length > 1 ? <div role="group" aria-label={copy.title} className="mb-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">{chains.map((_, index) => <button key={index} type="button" aria-pressed={index === owner} onClick={() => setActiveOwner(index)} className={`draw-guess-btn min-h-10 shrink-0 px-3 text-xs ${index === owner ? "draw-guess-btn--candy" : "draw-guess-btn--milk"}`}>{room.seats[index]?.name ?? `#${index + 1}`}{votes[String(index)]?.[String(room.viewerSeat)] !== undefined ? <Check className="h-3.5 w-3.5" /> : null}</button>)}</div> : null}
    <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 rounded-[1.3rem] bg-[#DCECF9] p-2 sm:gap-3 sm:p-3"><div className="min-w-0 rounded-2xl bg-white px-3 py-3 text-center"><span className="text-[11px] font-bold text-[#63758D]">{copy.first}</span><strong className="mt-1 block break-words text-lg font-black sm:text-2xl">{first?.kind === "WORD" ? first.value : "—"}</strong></div><span className="text-lg font-black text-[#3E70AA]">→</span><div className="min-w-0 rounded-2xl bg-white px-3 py-3 text-center"><span className="text-[11px] font-bold text-[#63758D]">{copy.final}</span><strong className="mt-1 block break-words text-lg font-black sm:text-2xl">{last?.kind === "WORD" ? last.value : "—"}</strong></div></div>
    <div aria-live="polite" className={`mt-3 grid grid-cols-3 gap-2 ${eligibleSeats.length <= 5 ? "sm:grid-cols-5" : "sm:grid-cols-4"}`}>{eligibleSeats.map((seat) => { const value = votes[String(owner)]?.[String(seat.number - 1)]; return <div key={seat.number} className="flex min-w-0 flex-col items-center rounded-2xl bg-white/80 px-1 py-2"><div className="relative"><DrawGuessCatSprite animated catId={seat.catId} mood={value === undefined ? "idle" : value ? "happy" : "sad"} size={54} />{value !== undefined ? <span aria-label={value ? copy.yes : copy.no} className={`draw-guess-chain-reaction-in absolute -right-2 top-0 grid h-7 w-7 -rotate-6 place-items-center rounded-lg border-2 border-white shadow-sm after:absolute after:left-1/2 after:top-full after:h-3 after:w-1 after:-translate-x-1/2 after:rounded-full after:bg-[#A89079] ${value ? "bg-[#C5EFD2] text-[#267749]" : "bg-[#FBD8D5] text-[#A94747]"}`}>{value ? <Check className="h-4 w-4 stroke-[3]" /> : <X className="h-4 w-4 stroke-[3]" />}</span> : null}</div><strong className="mt-1 max-w-full truncate text-[11px] font-black">{seat.name}</strong></div>; })}</div>
    <div className="mt-3"><p className="mb-2 text-center text-xs font-bold text-[#63758D]">{copy.yesCount} {counts?.yes ?? 0}/{total} · {copy.waiting}</p>{room.viewerSeat < 0 ? <p className="text-center text-xs font-bold text-[#63758D]">{copy.spectator}</p> : <div className="grid grid-cols-2 gap-2"><button type="button" disabled={busy} aria-pressed={mine === true} onClick={() => void vote(true)} className={`draw-guess-btn min-h-12 px-3 text-sm ${mine === true ? "draw-guess-btn--candy" : "draw-guess-btn--milk"}`}><Check className="h-5 w-5" />{copy.yes}</button><button type="button" disabled={busy} aria-pressed={mine === false} onClick={() => void vote(false)} className={`draw-guess-btn min-h-12 px-3 text-sm ${mine === false ? "draw-guess-btn--candy" : "draw-guess-btn--milk"}`}><X className="h-5 w-5" />{copy.no}</button></div>}</div>
  </section>;
}
