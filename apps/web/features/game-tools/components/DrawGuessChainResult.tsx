"use client";

import { useState } from "react";
import { ArrowRight, Images, Trophy } from "lucide-react";
import { DrawGuessChainRecap } from "@/features/game-tools/components/DrawGuessChainReview";
import { DrawGuessPodium } from "@/features/game-tools/components/DrawGuessPodium";
import type { DrawGuessRoomView } from "@/features/game-tools/components/DrawGuessRoomClient";

export function DrawGuessChainResult({ busy, locale, onReturn, preview = false, room }: {
  busy: boolean;
  locale: string;
  onReturn: () => void;
  preview?: boolean;
  room: DrawGuessRoomView;
}) {
  const [tab, setTab] = useState<"scores" | "story">("scores");
  const copy = locale === "zh-CN"
    ? { scores: "排行榜", story: "接龙回放", return: "返回房间", points: "分" }
    : locale === "fr"
      ? { scores: "Classement", story: "Revoir la chaîne", return: "Retour à la salle", points: "pts" }
      : { scores: "Leaderboard", story: "Story replay", return: "Back to room", points: "pts" };

  return <div className="min-w-0">
    <div role="group" aria-label={locale === "zh-CN" ? "结算内容" : locale === "fr" ? "Résultats" : "Results"} className="mb-3 grid grid-cols-2 gap-2 rounded-[1.1rem] bg-[#E7F1FA] p-1.5">
      <button type="button" aria-pressed={tab === "scores"} onClick={() => setTab("scores")} className={`draw-guess-btn min-h-11 gap-2 px-3 text-sm ${tab === "scores" ? "draw-guess-btn--candy" : "draw-guess-btn--milk"}`}><Trophy className="h-4 w-4" />{copy.scores}</button>
      <button type="button" aria-pressed={tab === "story"} onClick={() => setTab("story")} className={`draw-guess-btn min-h-11 gap-2 px-3 text-sm ${tab === "story" ? "draw-guess-btn--candy" : "draw-guess-btn--milk"}`}><Images className="h-4 w-4" />{copy.story}</button>
    </div>
    {tab === "scores" ? <DrawGuessPodium busy={busy} finishLabel={copy.scores} locale={locale} onReturn={onReturn} returnLabel={copy.return} room={room} scoreLabel={copy.points} /> : <div aria-label={copy.story}>
      <DrawGuessChainRecap chains={room.view.chains ?? []} locale={locale} matchResults={room.view.matchResults} matchVoterSeats={room.view.matchVoterSeats} matchVotes={room.view.matchVotes} picks={room.view.picks} preview={preview} roomId={room.id} roundNumber={room.view.gameNumber} seats={room.seats} voteCounts={room.view.voteCounts} />
      <button type="button" disabled={busy} onClick={onReturn} className="draw-guess-btn draw-guess-btn--milk mx-auto mt-4 min-h-11 px-5 text-sm"><ArrowRight className="h-4 w-4" />{copy.return}</button>
    </div>}
  </div>;
}
