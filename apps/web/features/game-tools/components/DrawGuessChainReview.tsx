"use client";

import { useEffect, useState } from "react";
import { ArrowRight, Check, Crown, Sparkles } from "lucide-react";
import { DrawGuessArtwork } from "@/features/game-tools/components/DrawGuessCanvas";
import { DrawGuessReportButton } from "@/features/game-tools/components/DrawGuessReportButton";
import type { DrawGuessRoomView } from "@/features/game-tools/components/DrawGuessRoomClient";

const COPY = {
  "zh-CN": { voteTitle: "看看这条接龙", votePrompt: "结尾猜词和起始词吻合吗？", pickTitle: "选出最棒的画", pickPrompt: "你是出题人，选一张最喜欢的传递作品。", done: "已投", progress: "投票进度", swipe: "左右滑动查看每一棒", start: "起始词", end: "最后猜词", yes: "吻合", no: "不吻合", selected: "已选择", noArtwork: "这条接龙没有可评选的真人作品，等待其他人完成。", waiting: "你的选择已保存，等待其他人。", result: "投票结果", votes: "票" },
  en: { voteTitle: "Follow the story", votePrompt: "Does the last guess match the first word?", pickTitle: "Choose the best drawing", pickPrompt: "As the starter, pick your favorite drawing in this chain.", done: "Voted", progress: "Votes cast", swipe: "Swipe to see every step", start: "First word", end: "Last guess", yes: "Matches", no: "Different", selected: "Selected", noArtwork: "No human artwork to choose here. Wait for the others.", waiting: "Your pick is saved. Waiting for the others.", result: "Vote result", votes: "votes" },
  fr: { voteTitle: "Suivez l'histoire", votePrompt: "Le dernier mot correspond-il au premier ?", pickTitle: "Choisissez le meilleur dessin", pickPrompt: "Choisissez votre dessin préféré dans cette chaîne.", done: "Voté", progress: "Votes exprimés", swipe: "Balayez pour voir chaque étape", start: "Premier mot", end: "Dernière réponse", yes: "Oui", no: "Non", selected: "Choisi", noArtwork: "Aucun dessin humain à choisir ici. Attendez les autres.", waiting: "Votre choix est enregistré. Attendez les autres.", result: "Résultat du vote", votes: "votes" },
};

export function DrawGuessChainReview({ busy, locale, onPick, onVote, room }: {
  busy: boolean;
  locale: string;
  onPick: (owner: number, step: number) => Promise<unknown>;
  onVote: (owner: number, value: boolean) => Promise<unknown>;
  room: DrawGuessRoomView;
}) {
  const copy = COPY[locale as keyof typeof COPY] ?? COPY.en;
  const voting = room.view.phase === "REVEAL_VOTE";
  const chains = room.view.chains ?? [];
  const votedOwners = room.view.votedOwners ?? [];
  const [activeOwner, setActiveOwner] = useState(0);

  useEffect(() => {
    setActiveOwner(voting ? chains.findIndex((_, index) => !votedOwners.includes(index)) : room.viewerSeat);
    // Reset only when a new review phase begins; manual chain selection stays put.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room.view.gameNumber, room.view.phase, room.viewerSeat]);

  const owner = voting ? Math.max(0, Math.min(activeOwner, chains.length - 1)) : room.viewerSeat;
  const chain = chains[owner] ?? [];
  const first = chain[0];
  const last = chain.at(-1);
  const eligible = chain.map((step, index) => ({ step, index })).filter(({ step }) => step.kind === "DRAWING" && !step.system);
  const ownPick = room.view.picks?.[String(room.viewerSeat)];
  const voteCount = room.view.voteCounts?.[owner];

  async function vote(value: boolean) {
    const result = await onVote(owner, value);
    if (!result) return;
    const next = chains.findIndex((_, index) => index > owner && !votedOwners.includes(index));
    const wrapped = chains.findIndex((_, index) => index !== owner && !votedOwners.includes(index));
    if (next >= 0 || wrapped >= 0) setActiveOwner(next >= 0 ? next : wrapped);
  }

  return <section className="draw-guess-stage-card rounded-[1.6rem] border border-[#D9E4D8] bg-[#FFFDF8] p-4 shadow-[0_12px_32px_rgba(39,80,55,0.08)] sm:p-6">
    <div className="flex items-start gap-3">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#FCE9DC] text-[#AB5B3F]"><Sparkles className="h-5 w-5" /></span>
      <div className="min-w-0 flex-1"><h2 className="text-xl font-bold sm:text-2xl">{voting ? copy.voteTitle : copy.pickTitle}</h2><p className="mt-1 text-sm leading-6 text-[#607268]">{voting ? copy.votePrompt : copy.pickPrompt}</p></div>
      {voting ? <span className="shrink-0 rounded-full bg-[#E8F3E8] px-3 py-1.5 text-xs font-bold text-[#156240]">{copy.progress} {votedOwners.length}/{chains.length}</span> : null}
    </div>

    {voting ? <div role="group" aria-label={copy.voteTitle} className="mt-5 flex gap-2 overflow-x-auto pb-1">
      {chains.map((_, index) => <button key={index} aria-pressed={owner === index} type="button" onClick={() => setActiveOwner(index)} className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl px-3 text-sm font-bold transition ${owner === index ? "bg-[#156240] text-white shadow-[0_6px_16px_rgba(21,98,64,0.18)]" : "bg-[#F1F4ED] text-[#45675B] hover:bg-[#E6F0E4]"}`}><span>{room.seats[index]?.name ?? `#${index + 1}`}</span>{votedOwners.includes(index) ? <Check className="h-4 w-4" /> : null}</button>)}
    </div> : null}

    <div className="mt-5 rounded-2xl bg-[#F6F3EA] p-4">
      <p className="text-xs font-bold text-[#8F634E]">{room.seats[owner]?.name ?? `#${owner + 1}`} · {owner + 1}/{chains.length}</p>
      <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
        <div className="min-w-0 rounded-xl bg-white px-3 py-3"><p className="text-[11px] font-bold text-[#7B8D80]">{copy.start}</p><p className="mt-1 break-words text-base font-bold">{first?.kind === "WORD" ? first.value : "—"}</p></div>
        <ArrowRight className="h-5 w-5 shrink-0 text-[#C67652]" />
        <div className="min-w-0 rounded-xl bg-white px-3 py-3"><p className="text-[11px] font-bold text-[#7B8D80]">{copy.end}</p><p className="mt-1 break-words text-base font-bold">{last?.kind === "WORD" ? last.value : "—"}</p></div>
      </div>
      {!voting && room.view.matchResults ? <p className={`mt-3 text-sm font-bold ${room.view.matchResults[String(owner)] ? "text-[#156240]" : "text-[#A95A43]"}`}>{copy.result} · {room.view.matchResults[String(owner)] ? copy.yes : copy.no}{voteCount ? ` (${voteCount.yes} / ${voteCount.no} / ${voteCount.abstain} ${copy.votes})` : ""}</p> : null}
    </div>

    {voting ? <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[#E5EAE1] pt-4">
      <button disabled={busy || votedOwners.includes(owner)} type="button" onClick={() => void vote(true)} className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-[#156240] px-4 text-sm font-bold text-white transition hover:bg-[#0E4E35] disabled:opacity-45"><Check className="h-4 w-4" />{copy.yes}</button>
      <button disabled={busy || votedOwners.includes(owner)} type="button" onClick={() => void vote(false)} className="inline-flex min-h-12 flex-1 items-center justify-center rounded-xl bg-[#E8A184] px-4 text-sm font-bold text-[#472A21] transition hover:bg-[#F2B197] disabled:opacity-45">{copy.no}</button>
      {votedOwners.includes(owner) ? <span className="w-full text-center text-xs font-bold text-[#156240] sm:w-auto">✓ {copy.done}</span> : null}
    </div> : null}

    <p className="mt-5 text-xs font-semibold text-[#738477]">{copy.swipe}</p>
    <ol tabIndex={0} className="mt-2 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#156240]">
      {chain.map((step, index) => <li key={index} className="w-40 shrink-0 snap-start rounded-2xl border border-[#E2E9DF] bg-white p-2.5 sm:w-44">
        <p className="mb-2 truncate text-xs font-bold text-[#61796A]">{index + 1} · {room.seats[step.seat]?.name ?? "—"}{step.system ? " · 🤖" : ""}</p>
        {step.kind === "WORD" ? <div className="flex aspect-[10/7] items-center justify-center rounded-xl bg-[#F7F6EF] px-2 text-center text-sm font-bold break-words">{step.value}</div> : <div className="aspect-[10/7] overflow-hidden rounded-xl border border-[#E5EAE2]"><DrawGuessArtwork strokes={step.value} /></div>}
        {!step.system ? <DrawGuessReportButton kind={step.kind} locale={locale} ownerSeat={owner} roomId={room.id} roundNumber={room.view.gameNumber} stage={index} /> : null}
      </li>)}
    </ol>

    {!voting && eligible.length ? <div className="mt-5 grid gap-3 border-t border-[#E5EAE1] pt-4 sm:grid-cols-2">
      {eligible.map(({ step, index }) => step.kind === "DRAWING" ? <button key={index} disabled={busy || ownPick !== undefined} type="button" onClick={() => void onPick(owner, index)} className={`rounded-2xl border-2 p-2 text-left transition hover:-translate-y-0.5 disabled:opacity-50 ${ownPick === index ? "border-[#156240] bg-[#EAF3E9]" : "border-[#E0E8DE] bg-white hover:border-[#8AB68E]"}`}><div className="aspect-[10/7] overflow-hidden rounded-xl"><DrawGuessArtwork strokes={step.value} /></div><div className="mt-2 flex items-center gap-2 px-1 text-sm font-bold"><Crown className="h-4 w-4 text-[#C98759]" />{room.seats[step.seat]?.name ?? "—"}<span className="ml-auto text-[#156240]">{ownPick === index ? copy.selected : copy.pickTitle}</span></div></button> : null)}
      {ownPick !== undefined ? <p role="status" className="text-sm font-semibold text-[#607268] sm:col-span-2">{copy.waiting}</p> : null}
    </div> : !voting ? <p role="status" className="mt-5 rounded-xl bg-[#F4F0E6] px-4 py-3 text-sm font-semibold text-[#607268]">{copy.noArtwork}</p> : null}
  </section>;
}
