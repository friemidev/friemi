"use client";

import { Clock3, Sparkles } from "lucide-react";
import { DrawGuessCatSprite } from "@/features/game-tools/components/DrawGuessCatSprite";
import type { DrawGuessRoomView } from "@/features/game-tools/components/DrawGuessRoomClient";
import { getDrawGuessRankings } from "@/features/game-tools/drawGuessEngine";

export function DrawGuessRoundBreak({ locale, now, room }: { locale: string; now: number; room: DrawGuessRoomView }) {
  const roundIndex = room.view.roundIndex ?? 1;
  const roundCount = room.view.roundCount ?? 1;
  const seconds = room.view.deadlineAt ? Math.max(0, Math.ceil((Date.parse(room.view.deadlineAt) - now) / 1_000)) : 0;
  const humanSeats = room.view.scores.map((_, seat) => seat).filter((seat) => seat !== room.practiceBotSeat);
  const rankings = getDrawGuessRankings(humanSeats.map((seat) => room.view.scores[seat])).map((entry) => ({ ...entry, seat: humanSeats[entry.seat] })).slice(0, 3);
  const title = locale === "zh-CN" ? `第 ${roundIndex} 轮完成` : locale === "fr" ? `Manche ${roundIndex} terminée` : `Round ${roundIndex} complete`;
  const next = locale === "zh-CN" ? `第 ${roundIndex + 1} / ${roundCount} 轮即将开始` : locale === "fr" ? `Manche ${roundIndex + 1} / ${roundCount} dans un instant` : `Round ${roundIndex + 1} / ${roundCount} starts soon`;
  return <section aria-label={title} className="draw-guess-stage-card relative overflow-hidden rounded-[1.8rem] bg-[#F7FAFE] p-5 text-center shadow-[0_12px_36px_rgba(48,66,92,.12)] sm:p-7">
    <span aria-hidden="true" className="pointer-events-none absolute -right-8 -top-12 h-36 w-36 rounded-full bg-[#DCECF9] blur-2xl" />
    <Sparkles aria-hidden="true" className="relative mx-auto h-7 w-7 text-[#D9A447]" />
    <h2 className="relative mt-2 text-2xl font-black text-[#30425C]">{title}</h2>
    <p className="relative mt-1 text-sm font-bold text-[#63758D]">{next}</p>
    <div className="relative mx-auto mt-5 flex max-w-md items-center justify-center gap-2">
      {rankings.map(({ seat, rank, score }) => { const player = room.seats.find((item) => item.number === seat + 1); return <div key={seat} className="draw-guess-rank-in flex min-w-0 flex-1 flex-col items-center rounded-2xl bg-white px-2 py-3 shadow-[0_3px_0_#E2EAF1]"><span className="text-xs font-black text-[#3E6FA8]">#{rank}</span><DrawGuessCatSprite animated catId={player?.catId} mood="happy" size={52} /><strong className="max-w-full truncate text-xs text-[#30425C]">{player?.name ?? `#${seat + 1}`}</strong><span className="text-sm font-black tabular-nums text-[#3E6FA8]">{score}</span></div>; })}
    </div>
    <span role="timer" className="relative mt-5 inline-flex items-center gap-1.5 rounded-full bg-[#E8F2FB] px-4 py-2 font-mono text-base font-black tabular-nums text-[#3E6FA8]"><Clock3 className="h-4 w-4" />{seconds}s</span>
  </section>;
}
