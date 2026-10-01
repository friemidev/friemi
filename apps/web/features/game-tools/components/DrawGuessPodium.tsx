"use client";

import Image from "next/image";
import { Crown, Trophy } from "lucide-react";
import { DrawGuessCatSprite } from "@/features/game-tools/components/DrawGuessCatSprite";
import type { DrawGuessRoomView } from "@/features/game-tools/components/DrawGuessRoomClient";
import { getDrawGuessCatName } from "@/features/game-tools/drawGuessCats";
import { getDrawGuessRankings } from "@/features/game-tools/drawGuessEngine";

function ProfileBadge({ avatarUrl, name, size = 28 }: { avatarUrl?: string | null; name: string; size?: number }) {
  return <span className="relative grid shrink-0 place-items-center overflow-hidden rounded-full border-2 border-white bg-[#FFE7B1] text-[10px] font-black text-[#765A35] shadow-sm" style={{ width: size, height: size }}>
    {avatarUrl ? <Image alt="" fill sizes={`${size}px`} src={avatarUrl} className="object-cover" unoptimized /> : Array.from(name)[0] ?? "?"}
  </span>;
}

export function DrawGuessPodium({ busy, finishLabel, isHost, locale, onRematch, rematchLabel, room, scoreLabel }: {
  busy: boolean;
  finishLabel: string;
  isHost: boolean;
  locale: string;
  onRematch: () => void;
  rematchLabel: string;
  room: DrawGuessRoomView;
  scoreLabel: string;
}) {
  const humanSeatIndexes = room.view.scores.map((_, seat) => seat).filter((seat) => seat !== room.practiceBotSeat);
  const rankings = getDrawGuessRankings(humanSeatIndexes.map((seat) => room.view.scores[seat])).map((entry) => ({ ...entry, seat: humanSeatIndexes[entry.seat] }));
  const top = rankings.slice(0, 3);
  const podiumOrder = [top[1], top[0], top[2]].filter((entry): entry is (typeof top)[number] => Boolean(entry));
  const podiumStyles = [
    "bg-[#FFE5A5] text-[#705329] shadow-[0_6px_0_#D9BB72]",
    "bg-[#DCE6F2] text-[#405875] shadow-[0_6px_0_#B7C7DB]",
    "bg-[#F0DED4] text-[#795A4E] shadow-[0_6px_0_#D8BDAF]",
  ];
  const podiumHeights = ["h-20", "h-14", "h-11"];

  return <section aria-label={finishLabel} className="relative overflow-hidden rounded-[1.8rem] bg-[#F7FAFE] px-3 pb-5 pt-5 text-[#30425C] shadow-[0_12px_36px_rgba(48,66,92,.12)] sm:px-6">
    <span aria-hidden="true" className="pointer-events-none absolute -left-12 -top-12 h-40 w-40 rounded-full bg-[#FFE7B1]/65 blur-3xl" />
    <span aria-hidden="true" className="pointer-events-none absolute -right-12 top-20 h-40 w-40 rounded-full bg-[#DCECF9] blur-3xl" />
    <h2 className="relative flex items-center justify-center gap-2 text-2xl font-black sm:text-3xl"><Trophy className="h-6 w-6 text-[#D9A447]" />{finishLabel}</h2>
    <div className="relative mx-auto mt-5 flex max-w-xl items-end justify-center gap-2 sm:gap-4">
      {podiumOrder.map((entry) => {
        const place = top.indexOf(entry);
        const seat = room.seats.find((item) => item.number === entry.seat + 1);
        const name = seat?.name ?? `#${entry.seat + 1}`;
        return <div key={entry.seat} className="draw-guess-podium-in flex min-w-0 w-[32%] max-w-44 flex-col items-center text-center" style={{ animationDelay: `${place * 130}ms` }}>
          <span className={`mb-1 inline-flex h-6 items-center gap-1 rounded-full px-2 text-xs font-black ${place === 0 ? "bg-[#FFE5A5] text-[#705329]" : "bg-white text-[#405875]"}`}>{place === 0 ? <Crown className="h-3.5 w-3.5" /> : null}#{entry.rank}</span>
          <DrawGuessCatSprite animated catId={seat?.catId} mood="happy" performance={place === 0 ? "champion" : place === 1 ? "clap" : "wave"} size={place === 0 ? 98 : 84} title={getDrawGuessCatName(seat?.catId, locale)} />
          <div className="mt-1 flex max-w-full items-center justify-center gap-1"><ProfileBadge avatarUrl={seat?.avatarUrl} name={name} size={20} /><strong className="min-w-0 truncate text-xs font-black sm:text-sm" title={name}>{name}</strong></div>
          <span className="mt-0.5 text-xs font-extrabold tabular-nums">{entry.score} {scoreLabel}</span>
          <div className={`mt-2 flex w-full items-center justify-center rounded-t-[1.25rem] text-2xl font-black ${podiumHeights[place]} ${podiumStyles[place]}`}>{place + 1}</div>
        </div>;
      })}
    </div>
    {rankings.length > 3 ? <ol className="relative mx-auto mt-5 max-w-xl space-y-2">{rankings.slice(3).map((entry) => {
      const seat = room.seats.find((item) => item.number === entry.seat + 1);
      const name = seat?.name ?? `#${entry.seat + 1}`;
      return <li key={entry.seat} className="draw-guess-rank-in flex items-center gap-2.5 rounded-2xl bg-white px-3 py-2 shadow-[0_3px_0_#E2EAF1]"><span className="w-7 shrink-0 text-center text-sm font-black text-[#63758D]">#{entry.rank}</span><DrawGuessCatSprite catId={seat?.catId} size={46} title={getDrawGuessCatName(seat?.catId, locale)} /><ProfileBadge avatarUrl={seat?.avatarUrl} name={name} size={18} /><strong className="min-w-0 flex-1 truncate text-sm" title={name}>{name}</strong><span className="shrink-0 text-sm font-black tabular-nums">{entry.score} {scoreLabel}</span></li>;
    })}</ol> : null}
    {isHost ? <div className="relative mt-6 flex justify-center"><button type="button" disabled={busy} onClick={onRematch} className="draw-guess-btn draw-guess-btn--candy min-h-11 px-6 text-sm">{rematchLabel}</button></div> : null}
  </section>;
}
