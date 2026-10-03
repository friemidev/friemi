"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, ChevronLeft, ChevronRight, Pause, Play, Sparkles } from "lucide-react";
import { DrawGuessCatSprite, DRAW_GUESS_CAT_FRAME_COUNT } from "@/features/game-tools/components/DrawGuessCatSprite";
import { DRAW_GUESS_CATS, getDrawGuessCatName, type DrawGuessCatDirection, type DrawGuessCatId, type DrawGuessCatMood } from "@/features/game-tools/drawGuessCats";
import { withLocale } from "@/lib/routes";

const DIRECTIONS: DrawGuessCatDirection[] = ["S", "SW", "W", "NW", "N", "NE", "E", "SE"];

const COPY = {
  "zh-CN": {
    back: "你画我猜", title: "猫咪角色预览", cats: "选择猫咪", mood: "表情", directions: "八个方向", profiles: "侧面轮廓对比", frames: "十二帧动作", sizes: "小尺寸", podium: "领奖台动作", idle: "平时", happy: "答对", sad: "答错", play: "播放", pause: "暂停", turnLeft: "向左转", turnRight: "向右转", frame: "第 {number} 帧", direction: "朝向", catCount: "15 只猫", directionCount: "8 个方向", frameCount: "12 帧", names: ["正面", "左前", "左侧", "左后", "背面", "右后", "右侧", "右前"],
  },
  en: {
    back: "Draw & Guess", title: "Cat character preview", cats: "Choose a cat", mood: "Expression", directions: "Eight directions", profiles: "Side silhouettes", frames: "Twelve frames", sizes: "Small sizes", podium: "Podium performances", idle: "Idle", happy: "Correct", sad: "Wrong", play: "Play", pause: "Pause", turnLeft: "Turn left", turnRight: "Turn right", frame: "Frame {number}", direction: "Facing", catCount: "15 cats", directionCount: "8 directions", frameCount: "12 frames", names: ["Front", "Front left", "Left", "Back left", "Back", "Back right", "Right", "Front right"],
  },
  fr: {
    back: "Dessine et devine", title: "Aperçu des chats", cats: "Choisir un chat", mood: "Expression", directions: "Huit directions", profiles: "Silhouettes de profil", frames: "Douze images", sizes: "Petites tailles", podium: "Animations du podium", idle: "Repos", happy: "Réussi", sad: "Raté", play: "Lire", pause: "Pause", turnLeft: "Tourner à gauche", turnRight: "Tourner à droite", frame: "Image {number}", direction: "Direction", catCount: "15 chats", directionCount: "8 directions", frameCount: "12 images", names: ["Face", "Avant gauche", "Gauche", "Arrière gauche", "Dos", "Arrière droit", "Droite", "Avant droit"],
  },
} as const;

export function DrawGuessPreviewClient({ locale }: { locale: string }) {
  const t = COPY[locale as keyof typeof COPY] ?? COPY.en;
  const [catId, setCatId] = useState<DrawGuessCatId>("captain");
  const [mood, setMood] = useState<DrawGuessCatMood>("idle");
  const [directionIndex, setDirectionIndex] = useState(0);
  const [frame, setFrame] = useState(0);
  const [playing, setPlaying] = useState(true);
  const direction = DIRECTIONS[directionIndex];

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reducedMotion.matches) setPlaying(false);
    const onChange = (event: MediaQueryListEvent) => { if (event.matches) setPlaying(false); };
    reducedMotion.addEventListener("change", onChange);
    return () => reducedMotion.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (!playing) return;
    const frameDuration = mood === "happy" ? 75 : mood === "sad" ? 120 : 165;
    let animationFrame: number;
    let lastPaint = window.performance.now();
    const tick = (now: number) => {
      if (now - lastPaint >= 32) {
        const elapsed = Math.min(now - lastPaint, 96);
        setFrame((current) => (current + elapsed / frameDuration) % DRAW_GUESS_CAT_FRAME_COUNT);
        lastPaint = now;
      }
      animationFrame = window.requestAnimationFrame(tick);
    };
    animationFrame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(animationFrame);
  }, [mood, playing]);

  return <div className="draw-guess-theme mx-auto max-w-6xl pb-8">
    <Link href={withLocale(locale, "/game-tools/draw-guess")} className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#63758D] transition-colors hover:text-[#3E6FA8]"><ArrowLeft className="h-4 w-4" />{t.back}</Link>
    <header className="mb-5 mt-5 flex flex-wrap items-end justify-between gap-3 px-1">
      <div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E4F0FB] px-3 py-1 text-[11px] font-black tracking-wide text-[#3E70AA]"><Sparkles className="h-3.5 w-3.5" />{t.catCount}</span>
        <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">{t.title}</h1>
      </div>
      <div className="flex gap-1.5 text-[11px] font-extrabold text-[#5A7190]"><span className="rounded-full bg-white px-3 py-1.5 shadow-[0_2px_0_#DFE8F0]">{t.directionCount}</span><span className="rounded-full bg-white px-3 py-1.5 shadow-[0_2px_0_#DFE8F0]">{t.frameCount}</span></div>
    </header>

    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.04fr)_minmax(0,.96fr)]">
      <section aria-label={getDrawGuessCatName(catId, locale)} className="relative flex min-w-0 flex-col overflow-hidden rounded-[2rem] border border-[#D8E6F2] bg-[#F4F9FE] shadow-[0_7px_0_#DDE9F2]">
        <div className="draw-guess-paper-stage absolute inset-0 opacity-60" aria-hidden="true" />
        <div className="relative flex items-center justify-between gap-2 px-5 pt-5 sm:px-7">
          <div className="min-w-0"><p className="text-[11px] font-extrabold uppercase tracking-[.16em] text-[#6B86A4]">{t.mood} · {t.names[directionIndex]}</p><h2 aria-live="polite" className="mt-1 truncate text-2xl font-black">{getDrawGuessCatName(catId, locale)}</h2></div>
          <span className="rounded-full bg-white px-3 py-1 font-mono text-sm font-black tabular-nums text-[#3E70AA] shadow-[0_3px_0_#D7E6F3]">{String(Math.floor(frame) + 1).padStart(2, "0")} / {DRAW_GUESS_CAT_FRAME_COUNT}</span>
        </div>
        <div className="relative flex min-h-[260px] flex-1 items-center justify-center py-2 sm:min-h-[320px]">
          <span aria-hidden="true" className="absolute h-52 w-52 rounded-full bg-white/75 blur-[2px] sm:h-64 sm:w-64" />
          <span aria-hidden="true" className="absolute left-[12%] top-[23%] text-2xl text-[#F1C974]">✦</span>
          <span aria-hidden="true" className="absolute right-[13%] top-[28%] text-xl text-[#A8C9E8]">✳</span>
          <DrawGuessCatSprite catId={catId} className="relative z-10" direction={direction} frame={frame} mood={mood} size={238} title={getDrawGuessCatName(catId, locale)} />
        </div>
        <div className="relative mx-4 mb-4 flex items-center justify-between gap-2 rounded-[1.3rem] bg-white/90 px-3 py-2.5 shadow-[0_3px_0_#DFE9F1] sm:mx-6 sm:mb-6">
          <div className="flex items-center gap-1.5"><button aria-label={t.turnLeft} type="button" onClick={() => setDirectionIndex((index) => (index + DIRECTIONS.length - 1) % DIRECTIONS.length)} className="draw-guess-btn draw-guess-btn--milk grid h-10 min-h-10 w-10 place-items-center"><ChevronLeft className="h-5 w-5" /></button><span className="min-w-12 text-center text-xs font-black text-[#405875]">{t.names[directionIndex]}</span><button aria-label={t.turnRight} type="button" onClick={() => setDirectionIndex((index) => (index + 1) % DIRECTIONS.length)} className="draw-guess-btn draw-guess-btn--milk grid h-10 min-h-10 w-10 place-items-center"><ChevronRight className="h-5 w-5" /></button></div>
          <button aria-label={playing ? t.pause : t.play} type="button" onClick={() => setPlaying((current) => !current)} className="draw-guess-btn draw-guess-btn--candy min-h-10 px-4 text-xs">{playing ? <Pause className="h-4 w-4 fill-current" /> : <Play className="h-4 w-4 fill-current" />}{playing ? t.pause : t.play}</button>
        </div>
      </section>

      <section aria-label={t.cats} className="min-w-0 rounded-[2rem] border border-[#E5EAF2] bg-[#FFFCF6] p-4 shadow-[0_7px_0_#ECEEF2] sm:p-5">
        <h2 className="text-lg font-black">{t.cats}</h2>
        <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-3 xl:grid-cols-5">{DRAW_GUESS_CATS.map((cat) => <button key={cat.id} type="button" onClick={() => { setCatId(cat.id); setFrame(0); }} aria-pressed={catId === cat.id} className={`group flex min-w-0 flex-col items-center rounded-[1.1rem] px-1 py-2 text-center outline-none transition-transform focus-visible:ring-2 focus-visible:ring-[#3E70AA] motion-safe:hover:-translate-y-0.5 ${catId === cat.id ? "bg-[#DFEEFA] shadow-[0_3px_0_#BCD7EB]" : "bg-[#F4F6F8] hover:bg-[#ECF4FB]"}`}><DrawGuessCatSprite catId={cat.id} size={62} /><span className="mt-0.5 max-w-full truncate text-[11px] font-bold text-[#405875]">{getDrawGuessCatName(cat.id, locale)}</span></button>)}</div>
        <h3 className="mt-5 text-sm font-black">{t.mood}</h3>
        <div className="mt-2 grid grid-cols-3 gap-2">{(["idle", "happy", "sad"] as const).map((value) => <button key={value} type="button" aria-pressed={mood === value} onClick={() => { setMood(value); setFrame(0); }} className={`draw-guess-btn min-h-10 px-2 text-xs ${mood === value ? value === "happy" ? "draw-guess-btn--butter" : "draw-guess-btn--candy" : "draw-guess-btn--milk"}`}>{t[value]}</button>)}</div>
      </section>
    </div>

    <section aria-labelledby="draw-guess-directions-title" className="mt-5 rounded-[1.8rem] bg-[#F4F8FC] p-4 sm:p-6">
      <div className="flex items-center justify-between"><h2 id="draw-guess-directions-title" className="text-lg font-black">{t.directions}</h2><span className="text-xs font-bold text-[#7B8EA4]">{t.direction}</span></div>
      <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-8">{DIRECTIONS.map((value, index) => <button key={value} type="button" aria-label={t.names[index]} aria-pressed={directionIndex === index} onClick={() => setDirectionIndex(index)} className={`flex min-w-0 flex-col items-center rounded-2xl px-1 py-2 outline-none focus-visible:ring-2 focus-visible:ring-[#3E70AA] ${directionIndex === index ? "bg-[#DCECF9] shadow-[0_3px_0_#BDD6EB]" : "bg-white"}`}><DrawGuessCatSprite catId={catId} direction={value} frame={3} mood={mood} size={65} /><span className="mt-0.5 text-[11px] font-bold text-[#405875]">{t.names[index]}</span></button>)}</div>
    </section>

    <section aria-labelledby="draw-guess-profiles-title" className="mt-4 rounded-[1.8rem] bg-[#FFFCF6] p-4 sm:p-6">
      <h2 id="draw-guess-profiles-title" className="text-lg font-black">{t.profiles}</h2>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">{DRAW_GUESS_CATS.map((cat) => <div key={cat.id} className="min-w-0 rounded-2xl bg-[#F3F7FB] px-2 py-2 text-center"><strong className="block truncate text-[11px] font-bold text-[#405875]">{getDrawGuessCatName(cat.id, locale)}</strong><div className="mt-1 flex items-end justify-center gap-0.5">{(["SE", "E", "NE"] as const).map((view) => <DrawGuessCatSprite key={view} catId={cat.id} direction={view} frame={4} mood={mood} size={53} />)}</div></div>)}</div>
    </section>

    <section aria-labelledby="draw-guess-frames-title" className="mt-4 rounded-[1.8rem] bg-[#FFFCF6] p-4 sm:p-6">
      <div className="flex items-center justify-between gap-2"><h2 id="draw-guess-frames-title" className="text-lg font-black">{t.frames}</h2><span className="rounded-full bg-[#E6F1FB] px-2.5 py-1 font-mono text-xs font-bold tabular-nums text-[#3E70AA]">01 — 12</span></div>
      <div className="mt-3 grid grid-cols-6 gap-1.5 md:grid-cols-12">{Array.from({ length: DRAW_GUESS_CAT_FRAME_COUNT }, (_, index) => <button key={index} type="button" aria-label={t.frame.replace("{number}", String(index + 1))} aria-pressed={frame === index && !playing} onClick={() => { setPlaying(false); setFrame(index); }} className={`flex min-w-0 flex-col items-center rounded-xl px-0.5 pb-1.5 pt-1 outline-none focus-visible:ring-2 focus-visible:ring-[#3E70AA] ${frame === index && !playing ? "bg-[#DCECF9] shadow-[0_3px_0_#BDD6EB]" : "bg-[#F3F6F9]"}`}><DrawGuessCatSprite catId={catId} direction={direction} frame={index} mood={mood} size={46} /><span className="font-mono text-[10px] font-bold tabular-nums text-[#63758D]">{String(index + 1).padStart(2, "0")}</span></button>)}</div>
    </section>

    <div className="mt-4 grid gap-4 md:grid-cols-2">
      <section aria-labelledby="draw-guess-sizes-title" className="rounded-[1.8rem] bg-[#F4F8FC] p-4 sm:p-6">
        <h2 id="draw-guess-sizes-title" className="text-lg font-black">{t.sizes}</h2>
        <div className="mt-4 flex items-end justify-around gap-3">{([22, 46, 66] as const).map((value) => <div key={value} className="flex min-w-0 flex-1 flex-col items-center gap-2 rounded-2xl bg-white px-2 py-3"><DrawGuessCatSprite catId={catId} mood={mood} size={value} /><span className="font-mono text-xs font-bold text-[#63758D]">{value}px</span></div>)}</div>
      </section>
      <section aria-labelledby="draw-guess-podium-title" className="rounded-[1.8rem] bg-[#FFFCF6] p-4 sm:p-6">
        <h2 id="draw-guess-podium-title" className="text-lg font-black">{t.podium}</h2>
        <div className="mt-3 flex items-end justify-center gap-2">{([{ id: "baker", place: 2, performance: "clap" }, { id: "captain", place: 1, performance: "champion" }, { id: "inventor", place: 3, performance: "wave" }] as const).map((entry) => <div key={entry.id} className="flex min-w-0 flex-1 flex-col items-center"><DrawGuessCatSprite catId={entry.id} frame={frame} mood="happy" performance={entry.performance} size={entry.place === 1 ? 96 : 80} /><span className="mt-1 max-w-full truncate text-xs font-bold">{getDrawGuessCatName(entry.id, locale)}</span><span className={"mt-2 flex w-full items-center justify-center rounded-t-xl font-black " + (entry.place === 1 ? "h-16 bg-[#FFE5A5]" : entry.place === 2 ? "h-12 bg-[#DCE6F2]" : "h-10 bg-[#F0DED4]")}>{entry.place}</span></div>)}</div>
      </section>
    </div>
  </div>;
}
