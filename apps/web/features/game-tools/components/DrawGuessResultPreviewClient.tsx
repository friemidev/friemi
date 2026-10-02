"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Copy, Crown, UsersRound } from "lucide-react";
import { DrawGuessArtworkCarousel, type DrawGuessCarouselTurn } from "@/features/game-tools/components/DrawGuessArtworkCarousel";
import { DrawGuessClassicRecap } from "@/features/game-tools/components/DrawGuessClassicRecap";
import { DrawGuessMusicToggle } from "@/features/game-tools/components/DrawGuessMusicToggle";
import { DrawGuessPodium } from "@/features/game-tools/components/DrawGuessPodium";
import type { DrawGuessRoomView } from "@/features/game-tools/components/DrawGuessRoomClient";
import { DrawGuessSoundToggle } from "@/features/game-tools/components/DrawGuessSoundToggle";
import type { DrawGuessClassicHighlight, DrawStroke } from "@/features/game-tools/drawGuessEngine";
import { withLocale } from "@/lib/routes";

const PLAYERS = [
  { id: "fish", name: "你 · 小鱼", catId: "scholar", score: 252, isHost: true },
  { id: "peach", name: "桃桃", catId: "dreamer", score: 285, isHost: false },
  { id: "bao", name: "阿包", catId: "captain", score: 210, isHost: false },
  { id: "star", name: "星星", catId: "inventor", score: 155, isHost: false },
  { id: "kiki", name: "琪琪", catId: "mango", score: 120, isHost: false },
  { id: "hao", name: "好好", catId: "disco", score: 96, isHost: false },
];

const CAT_DRAWING: DrawStroke[] = [
  { color: "#30425C", width: 5, points: [[0.22, 0.41], [0.26, 0.16], [0.39, 0.29], [0.60, 0.29], [0.74, 0.16], [0.78, 0.41], [0.72, 0.74], [0.51, 0.84], [0.28, 0.74], [0.22, 0.41]] },
  { color: "#30425C", width: 7, points: [[0.38, 0.48]] },
  { color: "#30425C", width: 7, points: [[0.62, 0.48]] },
  { color: "#E39E83", width: 5, points: [[0.48, 0.59], [0.52, 0.59]] },
  { color: "#30425C", width: 3, points: [[0.50, 0.60], [0.47, 0.67], [0.41, 0.68]] },
  { color: "#30425C", width: 3, points: [[0.50, 0.60], [0.54, 0.67], [0.60, 0.68]] },
  { color: "#30425C", width: 3, points: [[0.30, 0.60], [0.18, 0.57]] },
  { color: "#30425C", width: 3, points: [[0.70, 0.60], [0.82, 0.57]] },
];

const POTATO_DRAWING: DrawStroke[] = [
  { color: "#8D6B51", width: 6, points: [[0.36, 0.3], [0.28, 0.4], [0.3, 0.63], [0.42, 0.76], [0.62, 0.74], [0.72, 0.58], [0.68, 0.36], [0.53, 0.27], [0.36, 0.3]] },
  { color: "#3F536A", width: 5, points: [[0.42, 0.47], [0.44, 0.47]] },
  { color: "#3F536A", width: 5, points: [[0.58, 0.47], [0.60, 0.47]] },
  { color: "#3F536A", width: 3, points: [[0.46, 0.59], [0.51, 0.62], [0.57, 0.58]] },
  { color: "#7BA8CF", width: 4, points: [[0.31, 0.42], [0.16, 0.3], [0.20, 0.5], [0.31, 0.58]] },
  { color: "#7BA8CF", width: 4, points: [[0.69, 0.42], [0.84, 0.3], [0.80, 0.5], [0.69, 0.58]] },
];
const TEA_DRAWING: DrawStroke[] = [
  { color: "#405875", width: 5, points: [[0.31, 0.28], [0.69, 0.28], [0.63, 0.8], [0.37, 0.8], [0.31, 0.28]] },
  { color: "#D9A447", width: 5, points: [[0.37, 0.58], [0.63, 0.58]] },
  { color: "#405875", width: 4, points: [[0.50, 0.3], [0.56, 0.12], [0.67, 0.12]] },
  { color: "#405875", width: 6, points: [[0.42, 0.69], [0.43, 0.69]] },
  { color: "#405875", width: 6, points: [[0.53, 0.7], [0.54, 0.7]] },
  { color: "#E1AB58", width: 4, points: [[0.19, 0.36], [0.22, 0.27], [0.25, 0.36], [0.34, 0.39], [0.25, 0.42], [0.22, 0.51], [0.19, 0.42], [0.1, 0.39], [0.19, 0.36]] },
];
const BREAD_DRAWING: DrawStroke[] = [
  { color: "#98715C", width: 6, points: [[0.3, 0.31], [0.37, 0.23], [0.46, 0.3], [0.55, 0.23], [0.69, 0.34], [0.66, 0.72], [0.35, 0.72], [0.3, 0.31]] },
  { color: "#3F536A", width: 5, points: [[0.43, 0.48], [0.44, 0.48]] },
  { color: "#3F536A", width: 5, points: [[0.57, 0.48], [0.58, 0.48]] },
  { color: "#7BA8CF", width: 4, points: [[0.33, 0.56], [0.19, 0.48], [0.20, 0.68], [0.34, 0.63]] },
  { color: "#7BA8CF", width: 4, points: [[0.68, 0.56], [0.82, 0.48], [0.8, 0.68], [0.66, 0.63]] },
];

function previewTurns(count: number): DrawGuessCarouselTurn[] {
  const samples = [
    { answer: "猫咪开会", drawing: CAT_DRAWING, guesses: ["老板变成猫", "猫咪在面试", "严肃的猫猫"] },
    { answer: "会飞的土豆", drawing: POTATO_DRAWING, guesses: ["长翅膀的地瓜", "土豆要去上班", "飞行馒头"] },
    { answer: "太空奶茶", drawing: TEA_DRAWING, guesses: ["有吸管的火箭", "奶茶去月球", "宇宙饮料"] },
    { answer: "潜水的面包", drawing: BREAD_DRAWING, guesses: ["游泳的吐司", "海底三明治", "面包鱼"] },
    { answer: "猫咪喝奶茶", drawing: CAT_DRAWING, guesses: ["猫猫开饭", "猫咪想加班", "快乐小猫"] },
    { answer: "土豆飞船", drawing: POTATO_DRAWING, guesses: ["飞天薯条", "土豆升空", "宇宙土豆"] },
  ];
  return samples.slice(0, count).map((sample, artistSeat) => ({
    answer: sample.answer, artistSeat, drawing: sample.drawing,
    chat: [...sample.guesses.map((guess, index) => ({ id: `preview-${artistSeat}-${index}`, seat: (artistSeat + index + 1) % count, text: guess, correct: false, at: new Date(2026, 0, 1, 12, index).toISOString(), laughedBy: index === 0 ? [0, 1] : [] })), { id: `preview-${artistSeat}-correct`, seat: (artistSeat + 1) % count, text: null, correct: true, at: new Date(2026, 0, 1, 12, 4).toISOString() }],
  }));
}

function previewRoom(count: number): DrawGuessRoomView {
  const players = PLAYERS.slice(0, count);
  return {
    id: "draw-guess-result-preview", code: "CAT888", isHost: true, autoSize: true, mode: "CLASSIC", playerCount: count,
    revision: 1, seats: players.map((player, index) => ({ id: player.id, number: index + 1, name: player.name, catId: player.catId, avatarUrl: null, isHost: player.isHost })),
    status: "FINISHED", viewerSeat: 0,
    view: { chainStage: 0, deadlineAt: null, gameNumber: 1, roundCount: 1, roundIndex: 1, mode: "CLASSIC", phase: "FINISHED", scores: players.map((player) => player.score), turnIndex: count },
  };
}

function previewHighlight(count: number): DrawGuessClassicHighlight {
  return {
    answer: "猫咪开会", artistSeat: 0, drawing: CAT_DRAWING, laughCount: 4, reactionCount: 7,
    wrongGuesses: [
      { seat: count > 2 ? 2 : 1, text: "老板变成猫", artistSeat: 0, answer: "猫咪开会", laughs: 3 },
      { seat: count > 3 ? 3 : 1, text: "猫咪在面试", artistSeat: 0, answer: "猫咪开会", laughs: 2 },
    ],
  };
}

export function DrawGuessResultPreviewClient({ locale }: { locale: string }) {
  const router = useRouter();
  const [count, setCount] = useState(4);
  const room = previewRoom(count);
  const highlight = previewHighlight(count);
  const zh = locale === "zh-CN";
  const fr = locale === "fr";
  const historyLabel = zh ? "查看往期作品" : fr ? "Voir les dessins précédents" : "Past artwork";
  const returnLabel = zh ? "返回房间" : fr ? "Retour à la salle" : "Back to room";

  return <div className="draw-guess-theme min-h-[80vh] pb-24">
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-[#E8F2FB] px-3 py-2.5 text-xs font-bold text-[#405875]">
      <span>{zh ? "结算页预览 · 演示数据" : fr ? "Aperçu des résultats · Démo" : "Results preview · Demo data"}</span>
      <div className="flex items-center gap-1.5">{([2, 4, 6] as const).map((size) => <button key={size} type="button" aria-pressed={count === size} onClick={() => setCount(size)} className={`rounded-full px-3 py-1.5 transition-colors ${count === size ? "bg-[#3E70AA] text-white" : "bg-white hover:bg-[#D7E9F8]"}`}>{size}{zh ? "人" : ""}</button>)}</div>
    </div>
    <div className="flex items-center justify-between gap-3"><Link href={withLocale(locale, "/game-tools/draw-guess")} className="inline-flex items-center gap-2 text-sm font-semibold text-[#3E6FA8] hover:underline"><ArrowLeft className="h-4 w-4" />{zh ? "桌游工具" : fr ? "Jeux de table" : "Table games"}</Link><div className="flex items-center gap-2"><DrawGuessSoundToggle locale={locale} /><DrawGuessMusicToggle locale={locale} /></div></div>
    <header className="relative mt-3 overflow-hidden rounded-2xl bg-[#F1F6FC] p-4 shadow-[0_18px_55px_rgba(48,66,92,0.09)] sm:p-5">
      <div aria-hidden="true" className="absolute -right-12 -top-14 h-44 w-44 rounded-full bg-[#BED6EC]/50 blur-3xl" />
      <div className="relative flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#3E70AA]">Friemi · {zh ? "抢答模式 · 第 1 局" : fr ? "Devine vite · Manche 1" : "Speed round · Game 1"}</p><h1 className="mt-1 text-xl font-bold sm:text-2xl">{zh ? "你画我猜" : fr ? "Dessine et devine" : "Draw & Guess"}</h1></div><div className="flex shrink-0 flex-col items-end gap-2"><button type="button" onClick={() => void navigator.clipboard.writeText("CAT888")} className="inline-flex min-h-9 items-center gap-1.5 rounded-xl bg-white/80 px-2.5 text-sm font-bold tracking-widest shadow-sm"><Copy className="h-3.5 w-3.5 text-[#3E6FA8]" />CAT888</button></div></div>
      <a className="relative mt-2 inline-block text-xs font-bold text-[#3E6FA8] underline" href="#preview-artworks">{historyLabel}</a>
    </header>

    <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_250px]">
      <section className="min-w-0 space-y-5">
        <DrawGuessPodium busy={false} finishLabel={zh ? "本局排行榜" : fr ? "Classement" : "Leaderboard"} locale={locale} onReturn={() => router.push(withLocale(locale, "/game-tools/draw-guess/lobby-preview"))} returnLabel={returnLabel} room={room} scoreLabel={zh ? "分" : "pts"} showRecapLink />
        <DrawGuessClassicRecap code={room.code} highlight={highlight} historyHref="#preview-artworks" locale={locale} preview roomId={room.id} roundNumber={1} seats={room.seats} />
      </section>
      <aside className="h-fit rounded-[1.6rem] border border-[#DCE8F2] bg-white p-5"><h2 className="flex items-center gap-2 font-bold"><UsersRound className="h-5 w-5 text-[#3E6FA8]" />{zh ? "玩家" : fr ? "Joueurs" : "Players"} <span className="ml-auto text-xs text-[#65748A]">{count}/{count}</span></h2><ol className="mt-4 space-y-2">{room.seats.map((seat, index) => <li key={seat.id} className={`flex items-center gap-3 rounded-xl p-2.5 ${index === 0 ? "bg-[#ECF4FB]" : "bg-[#FAFCFE]"}`}><span className="grid h-8 w-8 place-items-center rounded-full bg-white text-xs font-bold text-[#3E6FA8]">{seat.number}</span><span className="min-w-0 flex-1 truncate text-sm font-semibold">{seat.name}</span>{seat.isHost ? <Crown className="h-4 w-4 text-[#E1A451]" /> : null}<span className="text-xs font-bold tabular-nums text-[#63758D]">{room.view.scores[index]}</span></li>)}</ol></aside>
    </div>

    <div id="preview-artworks" className="mt-6 scroll-mt-24"><DrawGuessArtworkCarousel locale={locale} seats={room.seats} turns={previewTurns(count)} /></div>
  </div>;
}
