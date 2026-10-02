"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, Check, ChevronLeft, ChevronRight, Crown, Play, Sparkles } from "lucide-react";
import { DrawGuessCatSprite } from "@/features/game-tools/components/DrawGuessCatSprite";
import { DrawGuessArtwork } from "@/features/game-tools/components/DrawGuessCanvas";
import { DrawGuessReportButton } from "@/features/game-tools/components/DrawGuessReportButton";
import type { DrawGuessRoomView } from "@/features/game-tools/components/DrawGuessRoomClient";
import { DRAW_GUESS_CHAIN_REACTIONS, type ChainStep, type DrawGuessChainReaction, type DrawGuessChainReactionKind } from "@/features/game-tools/drawGuessEngine";

type Seat = { name: string; number: number; catId?: string | null; avatarUrl?: string | null; isSystem?: boolean; managed?: boolean };
type VoteCount = { yes: number; no: number; abstain: number };
type StoryMode = "vote" | "recap";

const COPY = {
  "zh-CN": { vote: "选出最喜欢的画", pick: "选出最棒的画", recap: "接龙回放", progress: "已选", start: "起始词", end: "最后一猜", hiddenEnd: "等最后一棒揭晓", finishFirst: "看完接龙就能投画作", match: "投票通过", different: "未过半数", step: "第", word: "猜词", drawing: "画作", system: "系统补位", prev: "上一棒", next: "下一棒", play: "播放这条接龙", yes: "吻合", no: "不吻合", voted: "已选画作", select: "选这幅画", selected: "最佳画作", noArtwork: "这条接龙没有可评选的真人画作", waiting: "已选好，等大家一起揭晓", spectator: "观战中", votes: "投票", abstain: "未投", story: "选择接龙", stepSelect: "选择传递步骤", react: "给这一棒回应" },
  en: { vote: "Pick your favorite drawing", pick: "Pick the best drawing", recap: "The story replay", progress: "Picked", start: "First word", end: "Final guess", hiddenEnd: "Wait for the last step", finishFirst: "See the last step to vote", match: "Vote passed", different: "No majority", step: "Step", word: "Guess", drawing: "Drawing", system: "Auto-filled", prev: "Previous step", next: "Next step", play: "Play this story", yes: "Matches", no: "Different", voted: "Drawing selected", select: "Pick this drawing", selected: "Best drawing", noArtwork: "No player artwork to pick in this story", waiting: "Your pick is saved", spectator: "Watching", votes: "Votes", abstain: "No vote", story: "Choose a story", stepSelect: "Choose a step", react: "React to this step" },
  fr: { vote: "Choisir le dessin préféré", pick: "Choisir le meilleur dessin", recap: "Revoir la chaîne", progress: "Choisis", start: "Premier mot", end: "Dernier mot", hiddenEnd: "Dernière étape à venir", finishFirst: "Voir la dernière étape pour voter", match: "Vote validé", different: "Sans majorité", step: "Étape", word: "Mot", drawing: "Dessin", system: "Automatique", prev: "Étape précédente", next: "Étape suivante", play: "Revoir cette chaîne", yes: "Oui", no: "Non", voted: "Dessin choisi", select: "Choisir ce dessin", selected: "Meilleur dessin", noArtwork: "Aucun dessin de joueur à choisir", waiting: "Votre choix est enregistré", spectator: "Spectateur", votes: "Votes", abstain: "Sans vote", story: "Choisir une chaîne", stepSelect: "Choisir une étape", react: "Réagir à cette étape" },
};

function ChainStory({ artworkUrls, artworkVotes = {}, busy = false, chainReactions = [], chains, locale, matchResults, matchVoterSeats, matchVotes = {}, mode, myChainReactionTargets = [], myArtworkVotes = {}, onReact, onVote, picks, preview = false, roomId, roundNumber, seats, viewerSeat = 0 }: {
  artworkUrls?: Record<string, string>;
  artworkVotes?: Record<string, Record<string, number>>;
  busy?: boolean;
  chainReactions?: DrawGuessChainReaction[];
  chains: ChainStep[][];
  locale: string;
  matchResults?: Record<string, boolean> | null;
  matchVoterSeats?: number[];
  matchVotes?: Record<string, Record<string, boolean>>;
  mode: StoryMode;
  myChainReactionTargets?: string[];
  onReact?: (owner: number, step: number, kind: DrawGuessChainReactionKind) => Promise<boolean>;
  onVote?: (owner: number, step: number) => Promise<unknown>;
  picks?: Record<string, number>;
  preview?: boolean;
  roomId: string;
  roundNumber: number;
  seats: Seat[];
  viewerSeat?: number;
  myArtworkVotes?: Record<string, number>;
}) {
  const copy = COPY[locale as keyof typeof COPY] ?? COPY.en;
  const [activeOwner, setActiveOwner] = useState(0);
  const [activeStep, setActiveStep] = useState(1);
  const [playing, setPlaying] = useState(false);
  const [reacting, setReacting] = useState(false);
  const touchStart = useRef<number | null>(null);
  const owner = Math.min(activeOwner, Math.max(0, chains.length - 1));
  const chain = chains[owner] ?? [];
  const stepIndex = Math.min(activeStep, Math.max(0, chain.length - 1));
  const step = chain[stepIndex];
  const previous = chain[Math.max(0, stepIndex - 1)];
  const first = chain[0];
  const last = chain.at(-1);
  const selectedPick = picks?.[String(owner)];
  const candidateDrawings = chain.flatMap((item, index) => item.kind === "DRAWING" && !item.system ? [index] : []);
  const ownerSeat = seats.find((seat) => seat.number === owner + 1);
  const actorSeat = seats.find((seat) => seat.number === (step?.seat ?? -1) + 1);
  const result = matchResults?.[String(owner)];
  const storyReactions = chainReactions.filter((item) => item.owner >= 0 && item.owner < chains.length);
  const currentReactions = storyReactions.filter((item) => item.owner === owner && item.step === stepIndex);
  const reacted = myChainReactionTargets.includes(`${owner}:${stepIndex}`);

  useEffect(() => {
    setActiveOwner(mode === "vote" ? Math.max(0, chains.findIndex((chain, index) => chain.some((item) => item.kind === "DRAWING" && !item.system) && myArtworkVotes[String(index)] === undefined)) : 0);
    setActiveStep(1);
    setPlaying(false);
    // A phase change resets the story; a live vote does not rewind a manual choice.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, roundNumber, viewerSeat]);

  useEffect(() => {
    if (!playing) return;
    const timer = window.setTimeout(() => {
      if (stepIndex >= chain.length - 1) setPlaying(false);
      else setActiveStep(stepIndex + 1);
    }, 4_000);
    return () => window.clearTimeout(timer);
  }, [chain.length, playing, stepIndex]);

  if (!chains.length) return null;

  function chooseOwner(index: number) {
    setActiveOwner(index);
    setActiveStep(1);
    setPlaying(false);
  }
  function moveStep(delta: number) {
    setPlaying(false);
    setActiveStep((index) => Math.min(Math.max(index + delta, 1), Math.max(1, chain.length - 1)));
  }
  async function vote(index: number) {
    if (!onVote) return;
    const response = await onVote(owner, index);
    if (!response) return;
    const next = chains.findIndex((chain, index) => index > owner && chain.some((item) => item.kind === "DRAWING" && !item.system) && myArtworkVotes[String(index)] === undefined);
    const wrapped = chains.findIndex((chain, index) => index !== owner && chain.some((item) => item.kind === "DRAWING" && !item.system) && myArtworkVotes[String(index)] === undefined);
    if (next >= 0 || wrapped >= 0) chooseOwner(next >= 0 ? next : wrapped);
  }
  async function react(kind: DrawGuessChainReactionKind) {
    if (!onReact || reacting || reacted || viewerSeat < 0) return;
    setReacting(true);
    await onReact(owner, stepIndex, kind);
    setReacting(false);
  }

  return <section aria-label={copy[mode]} className="draw-guess-stage-card min-w-0 rounded-[1.8rem] bg-[#EDF5FC] p-3 text-[#30425C] shadow-[0_12px_36px_rgba(48,66,92,.1)] sm:p-5">
    <div className="flex items-center gap-2.5 px-1 pb-3">
      {mode === "recap" ? <DrawGuessCatSprite animated catId={ownerSeat?.catId} mood="happy" size={48} /> : null}
      <div className="min-w-0 flex-1"><p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#3E70AA]">{copy[mode]}</p><h2 className="truncate text-lg font-black sm:text-xl">{ownerSeat?.name ?? `#${owner + 1}`} · {owner + 1}/{chains.length}</h2></div>
      {mode === "vote" ? <span className="shrink-0 rounded-full bg-white px-2.5 py-1.5 text-xs font-black tabular-nums text-[#3E70AA]">{copy.progress} {Object.keys(myArtworkVotes).length}/{chains.length}</span> : null}
    </div>

    {chains.length > 1 ? <div role="group" aria-label={copy.story} className="mb-3 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">{chains.map((_, index) => {
      const seat = seats.find((item) => item.number === index + 1);
      return <button key={index} type="button" onClick={() => chooseOwner(index)} aria-pressed={owner === index} className={`draw-guess-btn min-h-10 shrink-0 gap-1.5 px-3 text-xs ${owner === index ? "draw-guess-btn--candy" : "draw-guess-btn--milk"}`}><span className="max-w-20 truncate">{seat?.name ?? `#${index + 1}`}</span>{mode === "vote" && myArtworkVotes[String(index)] !== undefined ? <Check className="h-3.5 w-3.5" /> : null}</button>;
    })}</div> : null}
    {mode !== "recap" && storyReactions.length ? <div aria-live="polite" className="mb-2 flex gap-1.5 overflow-x-auto px-1 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">{storyReactions.slice(-2).reverse().map((item) => {
      const name = seats.find((seat) => seat.number === item.seat + 1)?.name ?? `#${item.seat + 1}`;
      const storyName = seats.find((seat) => seat.number === item.owner + 1)?.name ?? `#${item.owner + 1}`;
      return <button key={`${item.seat}:${item.owner}:${item.step}:${item.at}`} type="button" onClick={() => { setActiveOwner(item.owner); setActiveStep(Math.max(1, item.step)); setPlaying(false); }} className="draw-guess-chain-reaction-in shrink-0 rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-[#405875]">{name} {item.kind} · {storyName}</button>;
    })}</div> : null}

    <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-stretch gap-2 rounded-[1.25rem] bg-[#DCECF9] p-2 sm:gap-3 sm:p-3">
      <div className="min-w-0 rounded-2xl bg-white px-3 py-2.5"><span className="text-[10px] font-bold text-[#63758D]">{copy.start}</span><strong className="mt-0.5 block break-words text-sm leading-snug sm:text-base">{first?.kind === "WORD" ? first.value : "—"}</strong></div>
      <ArrowRight aria-hidden="true" className="h-4 w-4 self-center text-[#3E70AA]" />
      <div className="min-w-0 rounded-2xl bg-white px-3 py-2.5"><span className="text-[10px] font-bold text-[#63758D]">{copy.end}</span><strong className="mt-0.5 block break-words text-sm leading-snug sm:text-base">{last?.kind === "WORD" ? last.value : "—"}</strong></div>
    </div>
    {Object.keys(matchVotes[String(owner)] ?? {}).length ? <div aria-live="polite" className="mt-2 flex flex-wrap items-center gap-1.5 px-1">{mode === "vote" ? <span className={`mr-1 rounded-full px-2.5 py-1 text-[11px] font-black ${matchResults?.[String(owner)] ? "bg-[#C5EFD2] text-[#267749]" : "bg-[#FBD8D5] text-[#A94747]"}`}>{matchResults?.[String(owner)] ? copy.match : copy.different}</span> : null}{Object.entries(matchVotes[String(owner)] ?? {}).map(([seatNumber, value]) => { const voter = seats.find((item) => item.number === Number(seatNumber) + 1); if (!voter || voter.isSystem || (matchVoterSeats ? !matchVoterSeats.includes(Number(seatNumber)) : voter.managed)) return null; return <span key={seatNumber} className={`flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold ${value ? "bg-[#D9F2E0] text-[#267749]" : "bg-[#FBE4E1] text-[#A94747]"}`}>{value ? "✓" : "✕"} {voter.name}</span>; })}</div> : null}
    {mode === "recap" && result !== undefined ? <div className="mt-2 flex flex-wrap items-center gap-2 px-1 text-xs font-bold"><span className={`rounded-full px-3 py-1.5 ${result ? "bg-[#D8EBFA] text-[#2B669E]" : "bg-[#FFF0CB] text-[#806134]"}`}>{result ? copy.match : copy.different}</span></div> : null}

    {mode === "recap" ? <><div className="mt-3 rounded-[1.35rem] bg-white p-2 shadow-[0_4px_0_#D5E4F2] sm:p-3">
      <div className="flex items-center gap-2 px-1 pb-2"><span aria-live="polite" className="min-w-0 flex-1 truncate text-xs font-bold text-[#63758D]">{copy.step} {stepIndex + 1}/{chain.length} · {actorSeat?.name ?? `#${(step?.seat ?? 0) + 1}`}{step?.system ? ` · ${copy.system}` : ""}</span>{selectedPick === stepIndex ? <span className="flex shrink-0 items-center gap-1 rounded-full bg-[#FFF0CB] px-2 py-1 text-[11px] font-black text-[#806134]"><Crown className="h-3.5 w-3.5" />{copy.selected}</span> : null}</div>
      <div className="flex items-center gap-1 sm:gap-2">
        <button aria-label={copy.prev} disabled={stepIndex <= 1} onClick={() => moveStep(-1)} type="button" className="draw-guess-btn draw-guess-btn--blush grid h-10 min-h-10 w-10 shrink-0 place-items-center p-0"><ChevronLeft className="h-5 w-5" /></button>
        <div className="draw-guess-chain-step min-w-0 flex-1 touch-pan-y overflow-hidden rounded-2xl bg-[#F7FAFE]" key={`${owner}-${stepIndex}`} onTouchStart={(event) => { touchStart.current = event.touches[0]?.clientX ?? null; }} onTouchEnd={(event) => { if (touchStart.current !== null) { const distance = event.changedTouches[0]?.clientX - touchStart.current; if (distance && Math.abs(distance) > 45) moveStep(distance < 0 ? 1 : -1); } touchStart.current = null; }} onTouchCancel={() => { touchStart.current = null; }}>
          {step?.kind === "DRAWING" ? <><div className="flex min-h-14 items-center justify-center gap-2 bg-[#E8F2FB] px-3 py-2 text-center"><Sparkles className="h-3.5 w-3.5 shrink-0 text-[#3E70AA]" /><span className="shrink-0 text-xs font-bold text-[#63758D]">{copy.word}</span><strong className="break-words text-lg font-black">{previous?.kind === "WORD" ? previous.value : "—"}</strong></div><div className="aspect-[10/7] max-h-[36dvh] w-full overflow-hidden bg-white">{artworkUrls?.[`${owner}:${stepIndex}`] ? <img alt={`${actorSeat?.name ?? "Player"} · ${copy.drawing}`} className="h-full w-full object-contain" src={artworkUrls[`${owner}:${stepIndex}`]} /> : <DrawGuessArtwork strokes={step.value} />}</div></> : <><div className="aspect-[10/7] max-h-[36dvh] w-full overflow-hidden bg-white">{previous?.kind === "DRAWING" ? artworkUrls?.[`${owner}:${stepIndex - 1}`] ? <img alt={copy.drawing} className="h-full w-full object-contain" src={artworkUrls[`${owner}:${stepIndex - 1}`]} /> : <DrawGuessArtwork strokes={previous.value} /> : null}</div><div className="flex min-h-14 items-center justify-center gap-2 bg-[#E8F2FB] px-3 py-2 text-center"><Sparkles className="h-3.5 w-3.5 shrink-0 text-[#3E70AA]" /><span className="shrink-0 text-xs font-bold text-[#63758D]">{copy.word}</span><strong className="break-words text-lg font-black">{step?.kind === "WORD" ? step.value : "—"}</strong></div></>}
        </div>
        <button aria-label={copy.next} disabled={stepIndex >= chain.length - 1} onClick={() => moveStep(1)} type="button" className="draw-guess-btn draw-guess-btn--blush grid h-10 min-h-10 w-10 shrink-0 place-items-center p-0"><ChevronRight className="h-5 w-5" /></button>
      </div>
      <div className="mt-2 flex min-h-9 items-center justify-between gap-1 px-1">
        <span className="shrink-0 text-xs font-bold text-[#63758D]">{step?.kind === "DRAWING" ? copy.drawing : copy.word}</span>
        {mode !== "recap" ? <div role="group" aria-label={copy.react} className="flex items-center gap-1">{DRAW_GUESS_CHAIN_REACTIONS.map((kind) => {
          const count = currentReactions.filter((item) => item.kind === kind).length;
          return <button key={kind} type="button" aria-label={`${copy.react} ${kind}${count ? ` · ${count}` : ""}`} disabled={!onReact || reacted || reacting || viewerSeat < 0} onClick={() => void react(kind)} className={`flex h-8 min-w-8 items-center justify-center gap-0.5 rounded-full px-1 text-base transition-transform hover:scale-110 disabled:cursor-default disabled:opacity-65 ${count ? "bg-[#E5F1FC]" : "bg-[#F3F7FB]"}`}>{kind}{count ? <span className="text-[10px] font-black text-[#3E70AA]">{count}</span> : null}</button>;
        })}</div> : null}
        {step && !step.system && !preview ? <DrawGuessReportButton kind={step.kind} locale={locale} ownerSeat={owner} roomId={roomId} roundNumber={roundNumber} stage={stepIndex} /> : null}
      </div>
      {mode !== "recap" && currentReactions.length ? <div aria-live="polite" className="flex h-6 items-center gap-1.5 overflow-hidden px-1">{currentReactions.slice(-2).reverse().map((item) => <span key={`${item.seat}:${item.at}`} className="draw-guess-chain-reaction-in shrink-0 rounded-full bg-[#EFF6FC] px-2 py-0.5 text-[11px] font-bold text-[#405875]">{seats.find((seat) => seat.number === item.seat + 1)?.name ?? `#${item.seat + 1}`} {item.kind}</span>)}</div> : null}
    </div>

    <div role="group" aria-label={copy.stepSelect} className="mt-3 flex items-center justify-center gap-1.5 overflow-x-auto px-1 pb-1"><button aria-label={copy.play} disabled={chain.length < 2 || playing} onClick={() => { setActiveStep(1); setPlaying(true); }} type="button" className="draw-guess-btn draw-guess-btn--milk mr-1 grid h-9 min-h-9 w-9 shrink-0 place-items-center p-0"><Play className="h-4 w-4" /></button>{chain.slice(1).map((item, offset) => { const index = offset + 1; return <button key={index} aria-label={`${copy.step} ${index} · ${item.kind === "DRAWING" ? copy.drawing : copy.word}`} aria-current={index === stepIndex ? "step" : undefined} onClick={() => { setActiveStep(index); setPlaying(false); }} type="button" className={`h-9 min-h-9 w-8 shrink-0 rounded-full text-xs font-black transition-[background-color,transform] ${index === stepIndex ? "scale-110 bg-[#3C73B0] text-white" : item.kind === "DRAWING" ? "bg-[#DCECF9] text-[#405875] hover:bg-[#BED6EC]" : "bg-white text-[#63758D] hover:bg-[#E8F2FB]"}`}>{index}</button>; })}</div></> : null}

    {mode === "vote" ? <div className="mt-3 border-t border-[#D5E4F2] pt-3"><p className="mb-2 text-center text-sm font-black">{copy.vote}</p>{candidateDrawings.length ? <div className="grid grid-cols-2 gap-2">{candidateDrawings.map((index) => { const candidate = chain[index]; if (candidate.kind !== "DRAWING") return null; const selected = myArtworkVotes[String(owner)] === index; const clue = chain[index - 1]; const supporters = Object.entries(artworkVotes[String(owner)] ?? {}).filter(([, chosen]) => chosen === index).map(([seatNumber]) => seats.find((item) => item.number === Number(seatNumber) + 1)).filter((seat): seat is Seat => Boolean(seat) && !seat!.isSystem && !seat!.managed); return <button key={index} type="button" disabled={busy || viewerSeat < 0} onClick={() => void vote(index)} aria-pressed={selected} className={`overflow-hidden rounded-2xl border-2 bg-white text-left transition-transform hover:-translate-y-0.5 disabled:cursor-default ${selected ? "border-[#3C73B0]" : "border-transparent"}`}><span className="flex min-h-10 items-center justify-center bg-[#E8F2FB] px-2 text-center text-xs font-black">{clue?.kind === "WORD" ? clue.value : "—"}</span><div className="aspect-[10/7]">{artworkUrls?.[`${owner}:${index}`] ? <img alt={copy.drawing} src={artworkUrls[`${owner}:${index}`]} className="h-full w-full object-contain" /> : <DrawGuessArtwork strokes={candidate.value} />}</div><span className="flex items-center justify-between gap-1 px-2 py-2 text-xs font-black"><span className="truncate">{seats.find((seat) => seat.number === candidate.seat + 1)?.name ?? `#${candidate.seat + 1}`}</span><span className="shrink-0 text-[#3E70AA]">{selected ? copy.voted : copy.select}</span></span>{supporters.length ? <span aria-live="polite" className="flex flex-wrap gap-1 border-t border-[#E8F2FB] px-1.5 py-1.5">{supporters.map((supporter) => <span key={supporter.number} className="draw-guess-chain-reaction-in flex max-w-full items-center gap-1 rounded-full bg-[#E8F2FB] px-1 py-0.5 text-[10px] font-black text-[#3E70AA]"><span className="grid h-5 w-5 shrink-0 place-items-center overflow-hidden rounded-full bg-white">{supporter.avatarUrl ? <img src={supporter.avatarUrl} alt="" className="h-full w-full object-cover" /> : <DrawGuessCatSprite catId={supporter.catId} size={20} />}</span><span className="max-w-16 truncate">{supporter.name}</span></span>)}</span> : null}</button>; })}</div> : <p className="rounded-2xl bg-white p-3 text-center text-sm font-bold">{copy.noArtwork}</p>}{viewerSeat < 0 ? <p role="status" className="mt-2 text-center text-sm font-bold text-[#63758D]">{copy.spectator}</p> : null}</div> : null}
  </section>;
}

export function DrawGuessChainReview({ busy, locale, onReact, onVoteArtwork, preview = false, room }: {
  busy: boolean;
  locale: string;
  onReact?: (owner: number, step: number, kind: DrawGuessChainReactionKind) => Promise<boolean>;
  onVoteArtwork: (owner: number, step: number) => Promise<unknown>;
  preview?: boolean;
  room: DrawGuessRoomView;
}) {
  return <ChainStory artworkVotes={room.view.artworkVotes} busy={busy} chainReactions={room.view.chainReactions} chains={room.view.chains ?? []} locale={locale} matchResults={room.view.matchResults} matchVoterSeats={room.view.matchVoterSeats} matchVotes={room.view.matchVotes} mode="vote" myArtworkVotes={room.view.myArtworkVotes} myChainReactionTargets={room.view.myChainReactionTargets} onReact={onReact} onVote={onVoteArtwork} preview={preview} roomId={room.id} roundNumber={room.view.gameNumber} seats={room.seats} viewerSeat={room.viewerSeat} />;
}

export function DrawGuessChainRecap({ artworkUrls, chains, locale, matchResults, matchVoterSeats, matchVotes, picks, preview, roomId, roundNumber, seats }: {
  artworkUrls?: Record<string, string>;
  chains: ChainStep[][];
  locale: string;
  matchResults?: Record<string, boolean> | null;
  matchVoterSeats?: number[] | null;
  matchVotes?: Record<string, Record<string, boolean>>;
  picks?: Record<string, number>;
  preview?: boolean;
  roomId: string;
  roundNumber: number;
  seats: Seat[];
  voteCounts?: VoteCount[] | null;
}) {
  return <ChainStory artworkUrls={artworkUrls} chains={chains} locale={locale} matchResults={matchResults} matchVoterSeats={matchVoterSeats ?? undefined} matchVotes={matchVotes} mode="recap" picks={picks} preview={preview} roomId={roomId} roundNumber={roundNumber} seats={seats} />;
}
