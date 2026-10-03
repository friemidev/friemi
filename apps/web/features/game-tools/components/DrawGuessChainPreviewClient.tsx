"use client";

import { useState } from "react";
import { DrawGuessArtworkVote } from "@/features/game-tools/components/DrawGuessArtworkVote";
import { DrawGuessMatchVote } from "@/features/game-tools/components/DrawGuessMatchVote";
import { DrawGuessChainResult } from "@/features/game-tools/components/DrawGuessChainResult";
import { DrawGuessChainWaiting } from "@/features/game-tools/components/DrawGuessChainWaiting";
import { DrawGuessPostgameWaiting } from "@/features/game-tools/components/DrawGuessPostgameWaiting";
import type { DrawGuessRoomView } from "@/features/game-tools/components/DrawGuessRoomClient";
import { type ChainStep, type DrawGuessChainReaction, type DrawGuessChainReactionKind, type DrawStroke } from "@/features/game-tools/drawGuessEngine";

type PreviewPhase = "WAITING" | "MATCH_VOTE" | "MATCH_RESULT" | "ARTWORK_VOTE" | "ARTWORK_RESULT" | "FINISHED" | "POSTGAME_WAIT";
const PLAYERS = [
  { id: "a", name: "你 · 小鱼", catId: "scholar" },
  { id: "b", name: "桃桃", catId: "dreamer" },
  { id: "c", name: "阿包", catId: "captain" },
  { id: "d", name: "星星", catId: "inventor" },
  { id: "e", name: "琪琪", catId: "mango" },
];
const EXTRA_PLAYERS = [
  { id: "f", name: "小满", catId: "baker" },
  { id: "g", name: "果果", catId: "cloud" },
  { id: "h", name: "橘子", catId: "explorer" },
];
const DOODLES: DrawStroke[][] = [
  [{ color: "#30425C", width: 5, points: [[.22,.68],[.36,.3],[.65,.28],[.79,.68],[.22,.68]] }, { color: "#E9AA41", width: 7, points: [[.47,.32],[.48,.16],[.52,.16],[.54,.32]] }],
  [{ color: "#30425C", width: 5, points: [[.23,.6],[.35,.32],[.65,.32],[.77,.6],[.6,.77],[.38,.77],[.23,.6]] }, { color: "#448EA4", width: 6, points: [[.33,.55],[.68,.55]] }],
  [{ color: "#30425C", width: 5, points: [[.29,.28],[.72,.28],[.65,.76],[.35,.76],[.29,.28]] }, { color: "#E46D79", width: 5, points: [[.43,.55],[.57,.55]] }],
];
const STARTS = ["会飞的猫", "太空奶茶", "跳舞的土豆", "下雨的书包", "睡觉的火车"];
const MIDDLES = ["长翅膀的猫", "宇宙饮料", "土豆开派对", "背包变雨伞", "火车打瞌睡"];
const ENDS = ["猫咪坐飞机", "奶茶去月球", "跳舞的土豆", "书包在淋雨", "列车睡着了"];
const CHAINS: ChainStep[][] = PLAYERS.map((_, owner) => [
  { kind: "WORD", seat: owner, system: false, value: STARTS[owner] },
  { kind: "DRAWING", seat: (owner + 1) % 5, system: false, value: DOODLES[owner % 3] },
  { kind: "WORD", seat: (owner + 2) % 5, system: false, value: MIDDLES[owner] },
  { kind: "DRAWING", seat: (owner + 3) % 5, system: false, value: DOODLES[(owner + 1) % 3] },
  { kind: "WORD", seat: (owner + 4) % 5, system: false, value: ENDS[owner] },
]);

export function DrawGuessChainPreviewClient({ locale }: { locale: string }) {
  const [phase, setPhase] = useState<PreviewPhase>("WAITING");
  const [waitingStage, setWaitingStage] = useState<"drawing" | "guessing">("drawing");
  const [waitingPlayers, setWaitingPlayers] = useState<5 | 8>(5);
  const [myArtworkVotes, setMyArtworkVotes] = useState<Record<string, number>>({});
  const [matchVotes, setMatchVotes] = useState<Record<string, Record<string, boolean>>>({ "0": { "1": true, "2": false, "3": true }, "1": { "2": true }, "2": { "1": true, "2": true, "3": true }, "3": { "1": false }, "4": { "2": true } });
  const [done, setDone] = useState(3);
  const [spectator, setSpectator] = useState(false);
  const [reactions, setReactions] = useState<DrawGuessChainReaction[]>([
    { seat: 2, kind: "👏", owner: -1, step: -1, stage: 1, at: "2026-10-02T10:00:00.000Z" },
    { seat: 1, kind: "😂", owner: 0, step: 1, stage: 2, at: "2026-10-02T10:00:01.000Z" },
  ]);
  const [reactionTargets, setReactionTargets] = useState<string[]>([]);
  const zh = locale === "zh-CN";
  const fr = locale === "fr";
  const labels = zh ? ["交棒等待", "首尾词投票", "举牌结果", "画作投票", "最佳画揭晓", "结算回顾", "单独回房"] : fr ? ["Attente", "Vote des mots", "Résultat", "Vote des dessins", "Dessin gagnant", "Résultats", "Retour"] : ["Waiting", "Word vote", "Signs up", "Artwork vote", "Winning drawing", "Recap", "Back to room"];
  const phases: PreviewPhase[] = ["WAITING", "MATCH_VOTE", "MATCH_RESULT", "ARTWORK_VOTE", "ARTWORK_RESULT", "FINISHED", "POSTGAME_WAIT"];
  const previewPlayers = phase === "WAITING" && waitingPlayers === 8 ? [...PLAYERS, ...EXTRA_PLAYERS] : PLAYERS;
  const displayMatchVotes = phase === "MATCH_RESULT" ? Object.fromEntries(CHAINS.map((_, owner) => [String(owner), { "0": owner === 2, "1": owner === 2, "2": owner === 2, "3": owner === 2, "4": owner === 2 }])) : matchVotes;
  const displayArtworkVotes: Record<string, Record<string, number>> = phase === "ARTWORK_RESULT" || phase === "FINISHED"
    ? { "0": { "0": 1, "1": 1, "4": 1 }, "2": { "2": 3, "3": 3 } }
    : { "0": { "1": 1, ...(myArtworkVotes["0"] !== undefined ? { "0": myArtworkVotes["0"] } : {}) }, "2": { "2": 3, ...(myArtworkVotes["2"] !== undefined ? { "0": myArtworkVotes["2"] } : {}) }, ...Object.fromEntries(Object.entries(myArtworkVotes).filter(([owner]) => owner !== "0" && owner !== "2").map(([owner, step]) => [owner, { "0": step }])) };
  const room: DrawGuessRoomView = {
    id: "draw-guess-chain-preview", code: "CAT888", isHost: !spectator, mode: "CHAIN", playerCount: previewPlayers.length,
    revision: 1, status: phase === "FINISHED" || phase === "POSTGAME_WAIT" ? "FINISHED" : "IN_PROGRESS", viewerSeat: spectator ? -1 : 0,
    returnedToLobby: phase === "POSTGAME_WAIT", postgameReturnProgress: { done: 2, total: previewPlayers.length },
    seats: previewPlayers.map((player, index) => ({ ...player, number: index + 1, isHost: index === 0, ready: true, returned: index < 2 })),
    view: {
      chainStage: phase === "WAITING" && waitingStage === "drawing" ? 1 : 2, chainSubmittedCount: done, chainFinishedSeats: Array.from({ length: done }, (_, index) => index), chainReactions: reactions, myChainReactionTargets: reactionTargets, chains: phase === "MATCH_VOTE" || phase === "MATCH_RESULT" ? CHAINS.map((chain) => [chain[0], chain.at(-1)!]) : CHAINS, deadlineAt: null, gameNumber: 1,
      roundCount: 1, roundIndex: 1, mode: "CHAIN", phase: phase === "WAITING" ? "CHAIN_STEP" : phase === "POSTGAME_WAIT" ? "FINISHED" : phase,
      scores: [285, 252, 210, 155, 120], turnIndex: 0, task: phase === "WAITING" && !spectator ? { kind: waitingStage === "drawing" ? "DRAWING" : "WORD", submitted: true } : null,
      myArtworkVotes, artworkVotes: displayArtworkVotes, artworkVoterSeats: phase === "ARTWORK_RESULT" || phase === "FINISHED" ? [0, 1, 2, 3, 4] : undefined, matchVotes: displayMatchVotes,
      picks: phase === "ARTWORK_RESULT" || phase === "FINISHED" ? { "0": 1 } : {}, matchResults: phase === "MATCH_VOTE" ? null : { "0": false, "1": false, "2": true, "3": false, "4": false },
      voteCounts: CHAINS.map((_, owner) => { const votes = Object.values(displayMatchVotes[String(owner)] ?? {}); return { yes: votes.filter(Boolean).length, no: votes.filter((value) => !value).length, abstain: 5 - votes.length }; }),
    },
  };
  const title = zh ? "接龙模式 · 界面预览" : fr ? "Aperçu du relais" : "Picture chain preview";
  async function react(owner: number, step: number, kind: DrawGuessChainReactionKind) {
    const stage = owner === -1 && waitingStage === "drawing" ? 1 : 2;
    const target = owner === -1 ? `wait:${stage}` : `${owner}:${step}`;
    if (reactionTargets.includes(target)) return false;
    setReactionTargets((current) => [...current, target]);
    setReactions((current) => [...current, { seat: 0, kind, owner, step, stage, at: new Date().toISOString() }]);
    return true;
  }
  return <div className="draw-guess-theme mx-auto max-w-[900px] pb-20 text-[#30425C]">
    <header className="mb-4 rounded-[1.5rem] bg-[#F1F6FC] px-4 py-4 sm:px-5">
      <p className="text-xs font-black text-[#3E70AA]">Friemi · CAT888</p>
      <h1 className="mt-1 text-xl font-black sm:text-2xl">{title}</h1>
      <div className="mt-3 flex gap-2 overflow-x-auto pb-1">{phases.map((item, index) => <button key={item} type="button" onClick={() => setPhase(item)} aria-pressed={phase === item} className={`draw-guess-btn min-h-10 shrink-0 px-3 text-xs ${phase === item ? "draw-guess-btn--candy" : "draw-guess-btn--milk"}`}>{labels[index]}</button>)}</div>
      <button type="button" aria-pressed={spectator} onClick={() => setSpectator((current) => !current)} className="mt-2 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-[#3E70AA]">{spectator ? zh ? "返回玩家视角" : fr ? "Vue joueur" : "Player view" : zh ? "观战视角" : fr ? "Vue spectateur" : "Spectator view"}</button>
      {phase === "WAITING" ? <div className="mt-2 flex flex-wrap gap-2">{(["drawing", "guessing"] as const).map((item) => <button key={item} type="button" onClick={() => setWaitingStage(item)} aria-pressed={waitingStage === item} className={`rounded-full px-3 py-1.5 text-xs font-bold ${waitingStage === item ? "bg-[#3E70AA] text-white" : "bg-white text-[#3E70AA]"}`}>{zh ? item === "drawing" ? "作画等待" : "猜词等待" : fr ? item === "drawing" ? "Dessin" : "Devinette" : item === "drawing" ? "Drawing" : "Guessing"}</button>)}<button type="button" onClick={() => setWaitingPlayers((count) => count === 5 ? 8 : 5)} className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-[#3E70AA]">{waitingPlayers}{zh ? "人" : fr ? " joueurs" : " players"}</button></div> : null}
    </header>
    {phase === "WAITING" ? <section className="draw-guess-stage-card relative flex h-[490px] flex-col overflow-hidden rounded-[1.8rem] bg-[#FFFCF5]"><DrawGuessChainWaiting locale={locale} onReact={spectator ? undefined : (kind) => react(-1, -1, kind)} room={room} /><button type="button" onClick={() => setDone((current) => current >= previewPlayers.length ? 1 : current + 1)} className="draw-guess-btn draw-guess-btn--blush mx-auto mb-4 min-h-10 px-4 text-xs">{zh ? "模拟下一人完成" : "Next player finishes"}</button></section> : null}
    {phase === "MATCH_VOTE" || phase === "MATCH_RESULT" ? <DrawGuessMatchVote busy={false} locale={locale} room={room} onVote={async (owner, value) => { setMatchVotes((current) => ({ ...current, [owner]: { ...current[String(owner)], "0": value } })); return { ok: true }; }} /> : null}
    {phase === "ARTWORK_VOTE" || phase === "ARTWORK_RESULT" ? <DrawGuessArtworkVote key={phase} busy={false} locale={locale} room={room} onVote={async (owner, step) => { setMyArtworkVotes({ [owner]: step }); return { ok: true }; }} /> : null}
    {phase === "FINISHED" ? <DrawGuessChainResult busy={false} locale={locale} onReturn={() => setPhase("POSTGAME_WAIT")} preview room={{ ...room, view: { ...room.view, picks: { "0": 1 } } }} /> : null}
    {phase === "POSTGAME_WAIT" ? <DrawGuessPostgameWaiting locale={locale} onLeave={async () => setPhase("WAITING")} room={room} /> : null}
  </div>;
}
