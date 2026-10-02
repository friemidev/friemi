"use client";

import { useEffect, useState } from "react";
import { DrawGuessMusicToggle } from "@/features/game-tools/components/DrawGuessMusicToggle";
import { DrawGuessSoundToggle } from "@/features/game-tools/components/DrawGuessSoundToggle";
import {
  DEFAULT_DRAW_GUESS_MUSIC_VOLUME,
  DEFAULT_DRAW_GUESS_SOUND_VOLUME,
  DRAW_GUESS_MUSIC_EVENT,
  DRAW_GUESS_SOUND_EVENT,
  getDrawGuessMusicVolume,
  getDrawGuessSoundVolume,
  playDrawGuessSound,
  setDrawGuessMusicVolume,
  setDrawGuessSoundVolume,
} from "@/features/game-tools/drawGuessSound";

export function DrawGuessVolumeControls({ locale }: { locale: string }) {
  const [music, setMusic] = useState(DEFAULT_DRAW_GUESS_MUSIC_VOLUME);
  const [sound, setSound] = useState(DEFAULT_DRAW_GUESS_SOUND_VOLUME);
  useEffect(() => {
    const sync = () => { setMusic(getDrawGuessMusicVolume()); setSound(getDrawGuessSoundVolume()); };
    sync();
    window.addEventListener(DRAW_GUESS_MUSIC_EVENT, sync);
    window.addEventListener(DRAW_GUESS_SOUND_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(DRAW_GUESS_MUSIC_EVENT, sync);
      window.removeEventListener(DRAW_GUESS_SOUND_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const musicLabel = locale === "zh-CN" ? "背景音乐" : locale === "fr" ? "Musique" : "Music";
  const soundLabel = locale === "zh-CN" ? "游戏音效" : locale === "fr" ? "Effets sonores" : "Sound effects";
  return <div className="space-y-4">
    <div className="rounded-2xl bg-[#F1F6FC] px-4 py-3">
      <div className="flex items-center gap-2"><label htmlFor="draw-guess-music-volume" className="min-w-0 flex-1 text-sm font-bold text-[#405875]">{musicLabel}</label><span className="w-10 text-right text-xs font-black tabular-nums text-[#3E6FA8]">{music}%</span><DrawGuessMusicToggle locale={locale} /></div>
      <input id="draw-guess-music-volume" type="range" min="0" max="100" step="1" value={music} onChange={(event) => setDrawGuessMusicVolume(Number(event.target.value))} aria-valuetext={`${music}%`} className="mt-2 h-7 w-full cursor-pointer accent-[#3F74AE]" />
    </div>
    <div className="rounded-2xl bg-[#F1F6FC] px-4 py-3">
      <div className="flex items-center gap-2"><label htmlFor="draw-guess-sound-volume" className="min-w-0 flex-1 text-sm font-bold text-[#405875]">{soundLabel}</label><span className="w-10 text-right text-xs font-black tabular-nums text-[#3E6FA8]">{sound}%</span><DrawGuessSoundToggle locale={locale} /></div>
      <input id="draw-guess-sound-volume" type="range" min="0" max="100" step="1" value={sound} onChange={(event) => setDrawGuessSoundVolume(Number(event.target.value))} onPointerUp={() => playDrawGuessSound("tap")} aria-valuetext={`${sound}%`} className="mt-2 h-7 w-full cursor-pointer accent-[#3F74AE]" />
    </div>
  </div>;
}
