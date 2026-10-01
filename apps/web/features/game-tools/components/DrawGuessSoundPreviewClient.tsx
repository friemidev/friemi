"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Headphones, Music2, Pause, Play, Sparkles } from "lucide-react";
import { DrawGuessCatSprite } from "@/features/game-tools/components/DrawGuessCatSprite";
import { DrawGuessSoundToggle } from "@/features/game-tools/components/DrawGuessSoundToggle";
import { playDrawGuessSound, stopDrawGuessSounds, type DrawGuessMusicPhase, type DrawGuessSound } from "@/features/game-tools/drawGuessSound";
import { withLocale } from "@/lib/routes";

const CUES: { id: DrawGuessSound; symbol: string; zh: string; en: string; fr: string; duration: number }[] = [
  { id: "tap", symbol: "●", zh: "点击按钮", en: "Tap a button", fr: "Toucher un bouton", duration: 120 },
  { id: "cat", symbol: "🐾", zh: "摸摸猫咪", en: "Pet the cat", fr: "Caresser le chat", duration: 1000 },
  { id: "purr", symbol: "♡", zh: "猫咪呼噜", en: "Cat purr", fr: "Ronronnement", duration: 1400 },
  { id: "secret", symbol: "✦", zh: "隐藏彩蛋", en: "Secret trick", fr: "Surprise", duration: 500 },
  { id: "ready", symbol: "✓", zh: "准备就绪", en: "Ready", fr: "Prêt", duration: 450 },
  { id: "start", symbol: "➜", zh: "游戏开场", en: "Game start", fr: "Début", duration: 800 },
  { id: "correct", symbol: "★", zh: "答对了", en: "Correct guess", fr: "Bonne réponse", duration: 1500 },
  { id: "wrong", symbol: "?", zh: "再试一次", en: "Try again", fr: "Réessayer", duration: 650 },
  { id: "score", symbol: "+", zh: "获得加分", en: "Score points", fr: "Points gagnés", duration: 650 },
  { id: "next", symbol: "↝", zh: "进入下一轮", en: "Next round", fr: "Tour suivant", duration: 350 },
  { id: "finish", symbol: "♛", zh: "最终领奖", en: "Final podium", fr: "Podium final", duration: 3750 },
];

export function DrawGuessSoundPreviewClient({ locale }: { locale: string }) {
  const [active, setActive] = useState<DrawGuessSound | null>(null);
  const [demoPlaying, setDemoPlaying] = useState(false);
  const [musicPlaying, setMusicPlaying] = useState<DrawGuessMusicPhase | null>(null);
  const demo = useRef<HTMLAudioElement | null>(null);
  const music = useRef<HTMLAudioElement | null>(null);
  const timeout = useRef<number | null>(null);
  const zh = locale === "zh-CN";
  const fr = locale === "fr";

  useEffect(() => () => {
    demo.current?.pause();
    music.current?.pause();
    stopDrawGuessSounds();
    if (timeout.current !== null) window.clearTimeout(timeout.current);
  }, []);

  const clear = () => {
    demo.current?.pause();
    music.current?.pause();
    setDemoPlaying(false);
    setMusicPlaying(null);
    if (timeout.current !== null) window.clearTimeout(timeout.current);
  };

  const playOne = (cue: typeof CUES[number]) => {
    clear();
    stopDrawGuessSounds();
    setActive(cue.id);
    playDrawGuessSound(cue.id, true);
    timeout.current = window.setTimeout(() => setActive(null), cue.duration);
  };

  const playAll = () => {
    if (demoPlaying) { clear(); return; }
    clear();
    stopDrawGuessSounds();
    setActive(null);
    if (timeout.current !== null) window.clearTimeout(timeout.current);
    const audio = demo.current ?? new Audio("/sounds/draw-guess/demo.wav");
    demo.current = audio;
    audio.volume = 0.72;
    audio.currentTime = 0;
    audio.onended = () => setDemoPlaying(false);
    void audio.play().then(() => setDemoPlaying(true)).catch(() => setDemoPlaying(false));
  };

  const playMusic = (phase: DrawGuessMusicPhase) => {
    if (musicPlaying === phase) { clear(); return; }
    clear();
    stopDrawGuessSounds();
    setActive(null);
    const audio = new Audio(`/sounds/draw-guess/music-${phase}.mp3`);
    music.current = audio;
    audio.volume = 0.28;
    audio.onended = () => setMusicPlaying(null);
    void audio.play().then(() => setMusicPlaying(phase)).catch(() => setMusicPlaying(null));
  };

  return <div className="draw-guess-theme mx-auto max-w-4xl pb-12 text-[#30425C]">
    <div className="flex items-center justify-between gap-3">
      <Link href={withLocale(locale, "/game-tools/draw-guess")} className="inline-flex items-center gap-1.5 text-sm font-bold text-[#63758D] hover:text-[#3E70AA]"><ArrowLeft className="h-4 w-4" />{zh ? "返回游戏" : fr ? "Retour au jeu" : "Back to game"}</Link>
      <DrawGuessSoundToggle locale={locale} />
    </div>
    <header className="relative mt-5 overflow-hidden rounded-[2rem] bg-[#E8F2FB] px-5 py-6 shadow-[0_7px_0_#D7E6F3] sm:px-8 sm:py-8">
      <span aria-hidden="true" className="absolute -right-7 -top-9 h-44 w-44 rounded-full bg-white/60 blur-2xl" />
      <div className="relative flex items-center gap-4 sm:gap-6">
        <DrawGuessCatSprite animated catId="disco" mood={active || demoPlaying || musicPlaying ? "happy" : "idle"} size={96} />
        <div className="min-w-0 flex-1"><p className="flex items-center gap-1 text-[11px] font-black text-[#3E70AA]"><Sparkles className="h-3.5 w-3.5" />DRAW & GUESS</p><h1 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">{zh ? "猫咪音效小屋" : fr ? "Le studio sonore des chats" : "Cat sound studio"}</h1><p className="mt-1 text-xs font-semibold text-[#63758D] sm:text-sm">{zh ? "点一下，听听游戏里的小声音" : fr ? "Touchez pour écouter les sons du jeu" : "Tap to hear the little sounds in the game"}</p></div>
      </div>
      <button type="button" onClick={playAll} className="draw-guess-btn draw-guess-btn--candy relative mt-5 min-h-11 w-full px-5 text-sm sm:w-auto">{demoPlaying ? <Pause className="h-4 w-4" /> : <Headphones className="h-4 w-4" />}{demoPlaying ? zh ? "停止试听" : fr ? "Arrêter" : "Stop preview" : zh ? "全部试听" : fr ? "Tout écouter" : "Play all"}</button>
    </header>
    <section aria-label={zh ? "逐个试听" : fr ? "Écouter chaque son" : "Try each sound"} className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
      {CUES.map((cue, index) => <button type="button" key={cue.id} onClick={() => playOne(cue)} aria-label={`${zh ? cue.zh : fr ? cue.fr : cue.en} · ${zh ? "试听" : fr ? "Écouter" : "Play"}`} className={`draw-guess-sound-card group relative flex min-h-[114px] flex-col items-start justify-between overflow-hidden rounded-[1.4rem] px-4 py-3.5 text-left outline-none transition-transform focus-visible:ring-2 focus-visible:ring-[#3E70AA] motion-safe:hover:-translate-y-1 ${active === cue.id ? "bg-[#DCECF9] shadow-[0_5px_0_#B7D3E9]" : index % 3 === 1 ? "bg-[#FFF1D0] shadow-[0_5px_0_#E9D8A8]" : "bg-[#F6F9FC] shadow-[0_5px_0_#DFE8F0]"}`}>
        <span aria-hidden="true" className="text-2xl font-black leading-none text-[#3E70AA]">{cue.symbol}</span>
        <span className="flex w-full items-end justify-between gap-2"><strong className="text-sm font-black sm:text-base">{zh ? cue.zh : fr ? cue.fr : cue.en}</strong><span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${active === cue.id ? "bg-[#3E70AA] text-white" : "bg-white text-[#3E70AA]"}`}><Play className="ml-0.5 h-3.5 w-3.5 fill-current" /></span></span>
      </button>)}
    </section>
    <section aria-label={zh ? "背景音乐试听" : fr ? "Musique de fond" : "Background music"} className="mt-7 grid gap-3 sm:grid-cols-2">
      {(["lobby", "game"] as const).map((phase) => <div key={phase} className="flex flex-wrap items-center gap-3 rounded-[1.5rem] bg-[#FFF1D0] p-4 shadow-[0_5px_0_#E9D8A8]">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white text-[#3E70AA]"><Music2 className="h-5 w-5" /></span>
        <div className="min-w-0 flex-1"><h2 className="font-black">{phase === "lobby" ? zh ? "准备房间 · 2:08" : fr ? "Salle d'attente · 2:08" : "Lobby · 2:08" : zh ? "游戏进行 · 2:10" : fr ? "En jeu · 2:10" : "In game · 2:10"}</h2><p className="text-xs font-semibold text-[#765A35]">{phase === "lobby" ? "Cozy Puzzle In-Game 2" : "Cozy Puzzle In-Game 1"} · MintoDog · CC0</p></div>
        <button type="button" onClick={() => playMusic(phase)} className="draw-guess-btn draw-guess-btn--milk min-h-10 px-4 text-sm">{musicPlaying === phase ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}{musicPlaying === phase ? zh ? "停止" : fr ? "Arrêter" : "Stop" : zh ? "试听" : fr ? "Écouter" : "Play"}</button>
      </div>)}
    </section>
    <p className="mt-6 text-center text-xs font-semibold text-[#7C8AA0]">{zh ? "音效和音乐默认开启，可随时在房间里关闭" : fr ? "Les sons et la musique sont activés par défaut ; désactivez-les dans la salle" : "Sounds and music are on by default. You can turn them off in the room."}</p>
  </div>;
}
