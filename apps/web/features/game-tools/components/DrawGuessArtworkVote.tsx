"use client";

import { Check, Images, Trophy } from "lucide-react";
import { DrawGuessArtwork } from "@/features/game-tools/components/DrawGuessCanvas";
import { DrawGuessCatSprite } from "@/features/game-tools/components/DrawGuessCatSprite";
import type { DrawGuessRoomView } from "@/features/game-tools/components/DrawGuessRoomClient";

const COPY = {
  "zh-CN": { title: "选出本轮最佳画", resultTitle: "最佳画揭晓！", allVotes: "全部票数", noWinner: "这轮没有选出最佳画", hint: "点一幅画投票", selected: "已选", artist: "画者", clue: "画的是", system: "系统画作", spectator: "观战中", votes: "人已投", ballot: "票" },
  en: { title: "Favorite drawing of the round", resultTitle: "Winning drawing!", allVotes: "All votes", noWinner: "No winning drawing this round", hint: "Tap one drawing to vote", selected: "Selected", artist: "Drawn by", clue: "Drawing", system: "System drawing", spectator: "Spectating", votes: "votes", ballot: "votes" },
  fr: { title: "Dessin préféré de la manche", resultTitle: "Dessin gagnant !", allVotes: "Tous les votes", noWinner: "Aucun dessin gagnant", hint: "Touchez un dessin pour voter", selected: "Choisi", artist: "Dessiné par", clue: "Dessin", system: "Dessin automatique", spectator: "Spectateur", votes: "votes", ballot: "votes" },
};

export function DrawGuessArtworkVote({ busy, locale, onVote, room }: {
  busy: boolean;
  locale: string;
  onVote: (owner: number, step: number) => Promise<unknown>;
  room: DrawGuessRoomView;
}) {
  const copy = COPY[locale as keyof typeof COPY] ?? COPY.en;
  const chains = room.view.chains ?? [];
  const votes = room.view.artworkVotes ?? {};
  const mine = room.view.myArtworkVotes ?? {};
  const resultPhase = room.view.phase === "ARTWORK_RESULT";
  const artworks = chains.flatMap((chain, owner) => chain.flatMap((step, index) => step.kind === "DRAWING" && (!step.system || step.value.length)
    ? [{ owner, index, step, clue: chain[index - 1] }] : []));
  const eligibleVoters = new Set(resultPhase && room.view.artworkVoterSeats
    ? room.view.artworkVoterSeats.map(String)
    : room.seats.filter((seat) => !seat.isSystem && !seat.managed).map((seat) => String(seat.number - 1)));
  const voters = new Set(Object.values(votes).flatMap((choices) => Object.keys(choices)).filter((seat) => eligibleVoters.has(seat)));
  const totalVoters = eligibleVoters.size;
  const ranked = artworks.map((artwork) => ({ ...artwork, supporters: Object.entries(votes[String(artwork.owner)] ?? {})
    .filter(([seat, chosen]) => eligibleVoters.has(seat) && chosen === artwork.index)
    .map(([seat]) => room.seats.find((player) => player.number === Number(seat) + 1))
    .filter((seat): seat is NonNullable<typeof seat> => Boolean(seat)) }))
    .sort((left, right) => right.supporters.length - left.supporters.length || left.owner - right.owner || left.index - right.index);
  const winner = ranked.find((artwork) => room.view.picks?.[String(artwork.owner)] === artwork.index);

  if (resultPhase) return <section aria-label={copy.resultTitle} className="draw-guess-stage-card min-w-0 rounded-[1.8rem] bg-[#EDF5FC] p-3 text-[#30425C] shadow-[0_12px_36px_rgba(48,66,92,.1)] sm:p-5">
    <h2 role="status" className="flex items-center gap-2 px-1 pb-3 text-lg font-black sm:text-xl"><span className="grid h-10 w-10 place-items-center rounded-2xl bg-[#FFF0C8] text-[#A36B20]"><Trophy className="h-5 w-5" /></span>{winner ? copy.resultTitle : copy.noWinner}</h2>
    {winner ? <div className="draw-guess-chain-reaction-in grid grid-cols-[minmax(0,43%)_minmax(0,1fr)] gap-3 rounded-[1.4rem] bg-white p-3 shadow-[0_4px_0_#D5E4F2] sm:grid-cols-[minmax(0,40%)_minmax(0,1fr)]">
      <div className="aspect-[10/7] overflow-hidden rounded-xl bg-[#F7FAFE]"><DrawGuessArtwork strokes={winner.step.value} /></div>
      <div className="flex min-w-0 flex-col justify-center"><strong className="break-words text-base font-black sm:text-xl">{winner.clue?.kind === "WORD" ? winner.clue.value : "—"}</strong><span className="mt-1 text-xs font-bold text-[#63758D]">{copy.artist} {room.seats.find((seat) => seat.number === winner.step.seat + 1)?.name ?? `#${winner.step.seat + 1}`}</span><span className="mt-2 w-fit rounded-full bg-[#FFF0C8] px-2.5 py-1 text-sm font-black text-[#8D611D]">{winner.supporters.length} {copy.ballot}</span><div className="mt-2 flex flex-wrap gap-1">{winner.supporters.map((voter) => <span key={voter.number} className="flex items-center gap-1 rounded-full bg-[#E8F2FB] py-0.5 pl-0.5 pr-1.5 text-[10px] font-black text-[#3E70AA]"><DrawGuessCatSprite catId={voter.catId} size={20} /><span className="max-w-16 truncate">{voter.name}</span></span>)}</div></div>
    </div> : null}
    <h3 className="mt-4 px-1 pb-2 text-sm font-black">{copy.allVotes} · {voters.size}/{totalVoters}</h3>
    <div className="grid max-h-[38dvh] grid-cols-1 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">{ranked.map((artwork) => <div key={`${artwork.owner}:${artwork.index}`} className={`flex min-w-0 items-center gap-2 rounded-2xl border-2 bg-white p-1.5 ${winner?.owner === artwork.owner && winner.index === artwork.index ? "border-[#E8BE6B]" : "border-transparent"}`}><div className="aspect-[10/7] w-16 shrink-0 overflow-hidden rounded-lg bg-[#F7FAFE]"><DrawGuessArtwork strokes={artwork.step.value} /></div><div className="min-w-0 flex-1"><p className="truncate text-xs font-black">{artwork.clue?.kind === "WORD" ? artwork.clue.value : "—"}</p><p className="truncate text-[10px] font-bold text-[#63758D]">{room.seats.find((seat) => seat.number === artwork.step.seat + 1)?.name ?? `#${artwork.step.seat + 1}`}</p><div className="mt-1 flex flex-wrap gap-0.5">{artwork.supporters.map((voter) => <span key={voter.number} className="flex max-w-full items-center gap-0.5 rounded-full bg-[#E8F2FB] pr-1 text-[10px] font-bold text-[#3E70AA]"><DrawGuessCatSprite catId={voter.catId} size={18} /><span className="max-w-14 truncate">{voter.name}</span></span>)}</div></div><strong className="shrink-0 rounded-full bg-[#E8F2FB] px-2 py-1 text-xs font-black text-[#3E70AA]">{artwork.supporters.length}</strong></div>)}</div>
  </section>;

  return <section aria-label={copy.title} className="draw-guess-stage-card min-w-0 rounded-[1.8rem] bg-[#EDF5FC] p-3 text-[#30425C] shadow-[0_12px_36px_rgba(48,66,92,.1)] sm:p-5">
    <div className="mb-3 flex items-center gap-2 px-1"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-white text-[#3E70AA]"><Images className="h-5 w-5" /></span><div className="min-w-0 flex-1"><h2 className="text-lg font-black sm:text-xl">{copy.title}</h2><p className="text-xs font-bold text-[#63758D]">{room.viewerSeat < 0 ? copy.spectator : copy.hint}</p></div><span className="shrink-0 rounded-full bg-white px-2.5 py-1.5 text-xs font-black text-[#3E70AA]">{voters.size}/{totalVoters} {copy.votes}</span></div>
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">{artworks.map(({ owner, index, step, clue }) => {
      const artist = room.seats.find((seat) => seat.number === step.seat + 1);
      const selected = mine[String(owner)] === index;
      const supporters = Object.entries(votes[String(owner)] ?? {}).filter(([seatNumber, chosen]) => eligibleVoters.has(seatNumber) && chosen === index).map(([seatNumber]) => room.seats.find((seat) => seat.number === Number(seatNumber) + 1)).filter((seat): seat is NonNullable<typeof seat> => Boolean(seat));
      return <button key={`${owner}:${index}`} type="button" aria-pressed={selected} disabled={busy || room.viewerSeat < 0 || step.system} onClick={() => void onVote(owner, index)} className={`min-w-0 overflow-hidden rounded-2xl border-2 bg-white text-left transition-transform hover:-translate-y-0.5 disabled:cursor-default ${selected ? "border-[#3C73B0] shadow-[0_4px_0_#B8D3EA]" : "border-transparent"}`}>
        <span className="flex min-h-11 items-center justify-center bg-[#E8F2FB] px-2 py-1 text-center text-xs font-black">{clue?.kind === "WORD" ? clue.value : "—"}</span>
        <span className="block aspect-[10/7] overflow-hidden bg-white"><DrawGuessArtwork strokes={step.value} /></span>
        <span className="flex items-center justify-between gap-1 px-2 py-2 text-xs font-black"><span className="min-w-0 truncate text-[#405875]">{step.system ? copy.system : `${copy.artist} ${artist?.name ?? `#${step.seat + 1}`}`}</span>{selected ? <Check className="h-4 w-4 shrink-0 text-[#3E70AA]" /> : null}</span>
        <span aria-live="polite" className="flex min-h-8 flex-wrap gap-1 border-t border-[#E8F2FB] px-1.5 py-1.5">{supporters.map((voter) => <span key={voter.number} className="draw-guess-chain-reaction-in flex max-w-full items-center gap-1 rounded-full bg-[#E8F2FB] px-1 py-0.5 text-[10px] font-black text-[#3E70AA]"><span className="grid h-5 w-5 shrink-0 place-items-center overflow-hidden rounded-full bg-white"><DrawGuessCatSprite catId={voter.catId} size={20} /></span><span className="max-w-16 truncate">{voter.name}</span></span>)}</span>
      </button>;
    })}</div>
  </section>;
}
